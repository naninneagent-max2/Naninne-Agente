/* eslint-disable @typescript-eslint/no-explicit-any */
import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GOOGLE_API_KEY;
const genai = apiKey ? new GoogleGenerativeAI(apiKey) : null;
const MODEL = "gemini-embedding-001";
const DIMENSIONS = 768;

export async function embed(text: string): Promise<number[]> {
  if (!genai) {
    throw new Error("GOOGLE_API_KEY not configured");
  }
  const model = genai.getGenerativeModel({ model: MODEL });
  const result = await model.embedContent({
    content: { role: "user", parts: [{ text }] },
    outputDimensionality: DIMENSIONS,
  } as any);
  if (!result.embedding?.values) {
    throw new Error("Empty embedding response from Gemini");
  }
  return result.embedding.values;
}

export async function embedBatch(texts: string[]): Promise<number[][]> {
  const CONCURRENCY = 4;
  const results: number[][] = [];
  for (let i = 0; i < texts.length; i += CONCURRENCY) {
    const slice = texts.slice(i, i + CONCURRENCY);
    const batch = await Promise.all(slice.map(embed));
    results.push(...batch);
  }
  return results;
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
