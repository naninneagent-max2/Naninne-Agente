/* eslint-disable @typescript-eslint/no-unused-vars */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* eslint-disable @typescript-eslint/no-explicit-any */

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ items: [] });
    }
    const { data: files, error } = await supabase
      .from("library_items")
      .select("id, title, format, mime_type, file_size_bytes, project_id, status, created_at, metadata")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) {
      return NextResponse.json({ items: [], error: error.message });
    }
    const items = (files ?? []).map((f: any) => {
      const fmt = (f.format ?? f.mime_type ?? "doc").toLowerCase();
      let type: "pdf" | "audio" | "image" | "doc" | "video" | "web" | "text" = "doc";
      if (fmt.includes("pdf")) type = "pdf";
      else if (fmt.startsWith("audio/")) type = "audio";
      else if (fmt.startsWith("image/")) type = "image";
      else if (fmt.startsWith("video/")) type = "video";
      else if (fmt.startsWith("text/")) type = "text";
      else if (fmt.startsWith("http")) type = "web";
      return {
        id: f.id,
        name: f.title,
        type,
        project: f.project_id,
        size_kb: Math.round((f.file_size_bytes ?? 0) / 1024),
        added_at: f.created_at,
        tags: ((f.metadata as any)?.tags as string[]) ?? [],
        status: f.status,
      };
    });
    return NextResponse.json({ items });
  } catch (_err) {
    return NextResponse.json({ items: [] });
  }
}
