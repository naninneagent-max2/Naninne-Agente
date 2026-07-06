/* eslint-disable @typescript-eslint/no-explicit-any */
import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GOOGLE_API_KEY;
const genai = apiKey ? new GoogleGenerativeAI(apiKey) : null;
const MODEL = "gemini-embedding-001";
const DIMENSIONS = 768;

// Free-tier limits (https://ai.google.dev/gemini-api/docs/rate-limits):
//   gemini-embedding-001: 100 RPM, 1000 RPD
// batchEmbedContents up to 100 chunks per call → counts toward quota as 1 request.
// We keep per-call batches small to stay well under RPD on big files.
const BATCH_SIZE = 20;
const RETRY_MAX = 4;
const RETRY_BASE_MS = 2000; // 2s base, exponential backoff (2s → 4s → 8s → 16s)

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function isRateLimit(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const msg = (err as { message?: string }).message || "";
  return /429|Too Many|quota|exceeded.*current quota|ResourceExhausted/i.test(msg);
}

async function withRetry<T>(fn: () => Promise<T>, label: string): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 0; attempt <= RETRY_MAX; attempt++) {
    try {
      return await fn();
    } catch (e) {
      lastErr = e;
      if (!isRateLimit(e) || attempt === RETRY_MAX) throw e;
      const wait = RETRY_BASE_MS * Math.pow(2, attempt);
      console.warn(`[embed:${label}] rate-limited, attempt ${attempt + 1}/${RETRY_MAX}, waiting ${wait}ms`);
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

    // Small breather between batches (respect the 100 RPM free tier without sweating it).
    // Skipped on the last batch.
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
