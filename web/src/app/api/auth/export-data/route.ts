/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }
    const admin = createAdminClient();

    const [
      conversations,
      messages,
      documents,
      library,
      notes,
      memories,
      projects,
    ] = await Promise.all([
      admin.from("conversations").select("*").eq("user_id", user.id),
      admin.from("messages").select("*").eq("user_id", user.id),
      admin.from("generated_documents").select("*").eq("user_id", user.id),
      admin.from("library_items").select("*").eq("user_id", user.id),
      admin.from("notes").select("*").eq("user_id", user.id),
      admin.from("memories").select("*").eq("user_id", user.id),
      admin.from("projects").select("*").eq("user_id", user.id),
    ]);

    const payload = {
      exported_at: new Date().toISOString(),
      user: { id: user.id, email: user.email, display_name: (user.user_metadata as any)?.display_name },
      conversations: conversations.data ?? [],
      messages: messages.data ?? [],
      documents: documents.data ?? [],
      library: (library.data ?? []).map((l) => {
        // Don't include raw file contents; just metadata
        const { ...meta } = l;
        return meta;
      }),
      notes: notes.data ?? [],
      memories: memories.data ?? [],
      projects: projects.data ?? [],
    };

    return new Response(JSON.stringify(payload, null, 2), {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="naninne-export-${user.id.slice(0, 8)}-${new Date().toISOString().slice(0, 10)}.json"`,
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
