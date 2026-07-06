/* eslint-disable @typescript-eslint/no-explicit-any */
import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GOOGLE_API_KEY;
const genai = apiKey ? new GoogleGenerativeAI(apiKey) : null;
const MODEL = "gemini-embedding-001";
const DIMENSIONS = 768;

// Free-tier limits (https://ai.google.dev/gemini-api/docs/rate-limits):
//   gemini-embedding-001: 100 RPM, 1000 RPD
// batchEmbedContents up to 100 chunks per call → counts toward quota as 1 request.
const BATCH_SIZE = 20;
const RETRY_MAX = 5;

// Shared state across all embedBatch() calls in this process — lets consecutive
// rate-limit hits trigger a full minute-window reset wait (free tier rolls per minute).
let consecutiveRateLimits = 0;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function isRateLimit(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const msg = (err as { message?: string }).message || "";
  return /429|Too Many|quota|exceeded.*current quota|ResourceExhausted/i.test(msg);
}

/**
 * Extract Gemini's own hint about how long to wait before retrying.
 *   Error message: "... Please retry in 3.93402368s."
 *   RetryInfo JSON: { "retryDelay": "3s" }
 */
function parseRetryDelayMs(err: unknown): number | null {
  if (!err || typeof err !== "object") return null;
  const msg = (err as { message?: string }).message || "";
  // Match "Please retry in X.XXXms" or "Please retry in X.XXXs"
  const m = msg.match(/retry in (\d+(?:\.\d+)?)\s*(ms|s)/i);
  if (m) {
    const n = parseFloat(m[1]);
    const unit = m[2].toLowerCase();
    return unit === "s" ? Math.round(n * 1000) : Math.round(n);
  }
  // Match JSON RetryInfo retryDelay "X.Xs"
  const j = msg.match(/"retryDelay":\s*"(\d+(?:\.\d+)?)\s*s"/i);
  if (j) return Math.round(parseFloat(j[1]) * 1000);
  return null;
}

async function withRetry<T>(fn: () => Promise<T>, label: string): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 0; attempt <= RETRY_MAX; attempt++) {
    try {
      const out = await fn();
      consecutiveRateLimits = 0;
      return out;
    } catch (e) {
      lastErr = e;
      if (!isRateLimit(e) || attempt === RETRY_MAX) throw e;

      const hinted = parseRetryDelayMs(e);
      // Base wait = max(hint × 1.5, current attempt backoff), in ms.
      const backoff = 2000 * Math.pow(2, attempt); // 2s, 4s, 8s, 16s, 32s, 64s
      let wait = Math.max((hinted ?? 0) * 1.5, backoff);
      // If we've been hitting the limit repeatedly (>=2 in a row across batches),
      // the per-minute window is exhausted — sleep for the full window reset.
      if (consecutiveRateLimits >= 2) wait = Math.max(wait, 60_000);
      wait = Math.min(wait, 120_000); // cap at 2 min per single wait
      consecutiveRateLimits++;
      console.warn(
        `[embed:${label}] rate-limited, attempt ${attempt + 1}/${RETRY_MAX}, ` +
        `geminiHint=${hinted ?? "?"}ms, sleeping ${Math.round(wait / 1000)}s ` +
        `(${consecutiveRateLimits} consecutive 429s)`
      );
      await sleep(wait);
    }
  }
  throw lastErr;
}

export async function embed(text: string): Promise<number[]> {
  if (!genai) {
    throw new Error("GOOGLE_API_KEY not configured");
  }
  return withRetry(async () => {
    const model = genai.getGenerativeModel({ model: MODEL });
    const result = await model.embedContent({
      content: { role: "user", parts: [{ text }] },
      outputDimensionality: DIMENSIONS,
    } as any);
    if (!result.embedding?.values) {
      throw new Error("Empty embedding response from Gemini");
    }
    return result.embedding.values;
  }, "single");
}

export async function embedBatch(texts: string[]): Promise<number[][]> {
  if (!genai) throw new Error("GOOGLE_API_KEY not configured");
  if (texts.length === 0) return [];

  const all: number[][] = [];
  const totalBatches = Math.ceil(texts.length / BATCH_SIZE);

  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;

    const embeddings = await withRetry(async () => {
      const model = genai.getGenerativeModel({ model: MODEL });
      const resp = await model.batchEmbedContents({
        requests: batch.map((text) => ({
          model: MODEL,
          content: { role: "user", parts: [{ text }] },
          outputDimensionality: DIMENSIONS,
        } as any)),
      } as any);
      if (!resp.embeddings || resp.embeddings.length === 0) {
        throw new Error("Empty batch embedding response from Gemini");
      }
      return resp.embeddings.map((e: any) => {
        if (!e?.values) throw new Error("Missing values in batch response");
        return e.values;
      });
    }, `batch${batchNum}/${totalBatches}`);

    all.push(...embeddings);

    // Breather between successful batches. Skipped on the last one.
    if (i + BATCH_SIZE < texts.length) {
      await sleep(700);
    }
  }
  return all;
}

export function parseEmbedding(emb: unknown): number[] | null {
  if (!emb) return null;
  if (Array.isArray(emb)) return emb;
  if (typeof emb === "string") {
    try {
      const parsed = JSON.parse(emb);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      return null;
    }
  }
  return null;
}

export function cosineSim(a: number[] | null, b: number[] | null): number {
  if (!a || !b || a.length !== b.length || a.length === 0) return 0;
  let dot = 0, na = 0, nb = 0;
  const n = a.length;
  for (let i = 0; i < n; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return dot / (Math.sqrt(na) * Math.sqrt(nb) + 1e-9);
}
