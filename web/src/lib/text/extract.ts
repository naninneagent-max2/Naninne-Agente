import mammoth from "mammoth";
import { extractText as extractPdf } from "unpdf";

export type ExtractResult = {
  text: string;
  pages?: number;
  format: string;
};

const CHUNK_SIZE = 1800;
const CHUNK_OVERLAP = 200;

function toUint8(buffer: Buffer | Uint8Array): Uint8Array {
  if (buffer instanceof Uint8Array && !(buffer instanceof Buffer)) return buffer;
  return new Uint8Array(
    buffer.buffer,
    buffer.byteOffset,
    buffer.byteLength
  );
}

export async function extractText(
  buffer: Buffer,
  mimeType: string
): Promise<ExtractResult> {
  if (
    mimeType.startsWith("text/") ||
    mimeType === "application/json" ||
    mimeType === "text/markdown" ||
    mimeType === "text/csv"
  ) {
    return { text: buffer.toString("utf-8"), format: mimeType };
  }

  if (mimeType === "application/pdf") {
    const u8 = toUint8(buffer);
    const result = await extractPdf(u8, { mergePages: true });
    return {
      text: Array.isArray(result.text) ? result.text.join("\n\n") : result.text,
      pages: result.totalPages,
      format: mimeType,
    };
  }

  if (
    mimeType ===
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    const result = await mammoth.extractRawText({ buffer });
    return { text: result.value, format: mimeType };
  }

  throw new Error(`Unsupported mime type: ${mimeType}`);
}

export function chunkText(text: string): string[] {
  const cleaned = text.replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  if (cleaned.length <= CHUNK_SIZE) return [cleaned];

  const chunks: string[] = [];
  let pos = 0;
  while (pos < cleaned.length) {
    let end = Math.min(pos + CHUNK_SIZE, cleaned.length);
    if (end < cleaned.length) {
      const slice = cleaned.slice(pos, end);
      const lastPara = slice.lastIndexOf("\n\n");
      const lastSentence = Math.max(
        slice.lastIndexOf(". "),
        slice.lastIndexOf("! "),
        slice.lastIndexOf("? "),
        slice.lastIndexOf(".\n"),
        slice.lastIndexOf(".\n\n")
      );
      if (lastPara > CHUNK_SIZE * 0.5) end = pos + lastPara + 2;
      else if (lastSentence > CHUNK_SIZE * 0.5) end = pos + lastSentence + 2;
    }
    const chunk = cleaned.slice(pos, end).trim();
    if (chunk.length > 0) chunks.push(chunk);
    if (end >= cleaned.length) break;
    pos = end - CHUNK_OVERLAP;
  }
  return chunks;
}
