import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* eslint-disable @typescript-eslint/no-explicit-any */

const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_KEY ?? process.env.SUPABASE_SECRET_KEY!;

async function adminFetch(path: string, init: RequestInit = {}) {
  const res = await fetch(`${SUPABASE_URL}${path}`, {
    ...init,
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      ...(init.headers ?? {}),
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${res.status}: ${text.slice(0, 300)}`);
  }
  return res;
}

export async function GET() {
  // Returns the list of orphan files (read-only)
  const res = await adminFetch("/rest/v1/rpc/get_orphan_storage_files");
  const data = await res.json();
  const totalBytes = (data ?? []).reduce((s: number, f: any) => s + (f.file_size ?? 0), 0);
  return NextResponse.json({
    orphans: data ?? [],
    count: data?.length ?? 0,
    total_bytes: totalBytes,
    total_kb: Math.round(totalBytes / 1024),
  });
}

export async function DELETE() {
  // Cleanup: delete all orphan files
  const res = await adminFetch("/rest/v1/rpc/get_orphan_storage_files");
  const orphans: Array<{ file_name: string }> = await res.json();
  if (!orphans || orphans.length === 0) {
    return NextResponse.json({ ok: true, deleted: 0, message: "Nenhum orfão encontrado" });
  }
  let deleted = 0;
  const errors: string[] = [];
  for (const o of orphans) {
    try {
      // URL-encode the path
      const encoded = o.file_name.split("/").map((p, i) => (i === 0 ? p : encodeURIComponent(p))).join("/");
      const delRes = await adminFetch(`/storage/v1/object/library/${encoded}`, { method: "DELETE" });
      if (delRes.ok || delRes.status === 200) deleted++;
      else {
        const t = await delRes.text();
        if (t.includes("notFound") || t.includes("404")) deleted++;
        else errors.push(`${o.file_name}: ${t.slice(0, 100)}`);
      }
    } catch (e) {
      errors.push(`${o.file_name}: ${(e as Error).message}`);
    }
  }
  return NextResponse.json({
    ok: errors.length === 0,
    deleted,
    total: orphans.length,
    errors: errors.slice(0, 10),
  });
}
