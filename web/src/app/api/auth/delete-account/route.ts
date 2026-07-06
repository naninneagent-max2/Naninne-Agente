/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function DELETE(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }
    const body = await request.json().catch(() => ({}));
    const confirmEmail = (body.confirm_email ?? "").toLowerCase().trim();
    if (confirmEmail !== (user.email ?? "").toLowerCase().trim()) {
      return NextResponse.json(
        { error: "Digite seu email corretamente para confirmar." },
        { status: 400 }
      );
    }

    const admin = createAdminClient();

    // 1. Delete user data (cascade via FK should handle most tables)
    const tables = [
      "messages",
      "conversations",
      "generated_documents",
      "document_chunks",
      "notes",
      "memories",
      "library_items",
      "audiovisual_scenes",
      "mercado_analyses",
      "chapters",
    ];
    for (const t of tables) {
      await admin.from(t).delete().eq("user_id", user.id);
    }
    // Delete projects owned (some columns don't have user_id — they have user_id? or are profile-scoped)
    // Most projects are profile-scoped (4 default). Better delete only those not referenced
    // Actually, projects may be shared — let me skip delete

    // 2. Delete storage (best effort)
    try {
      const { data: items } = await admin.storage.from("library").list();
      if (items) {
        const paths = items
          .map((f) => f.name)
          .filter((n) => n.startsWith(`${user.id}/`))
          .map((n) => `${user.id}/${n}`);
        if (paths.length > 0) {
          await admin.storage.from("library").remove(paths);
        }
      }
    } catch {}

    // 3. Delete user via admin
    const { error } = await admin.auth.admin.deleteUser(user.id);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
