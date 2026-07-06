"use client";
import { Brain } from "lucide-react";
import { EmptyState } from "@/components/empty-state";

export default function MemoriaPage() {
  return (
    <div className="px-6 py-10 md:px-10 md:py-12">
      <div className="mx-auto max-w-[1100px]">
        <h1 className="text-h1 text-neutral-900 mb-1">Memória</h1>
        <p className="text-body text-neutral-600 mb-6">Fatos importantes que o Naninne lembra de você</p>
        <EmptyState
          icon={Brain}
          title="Nenhuma memória ainda"
          description="Conforme você conversa com o Naninne, fatos importantes são lembrados automaticamente (seu estilo, preferências, projetos, pessoas)."
        />
      </div>
    </div>
  );
}
