"use client";
import { Settings } from "lucide-react";
import { EmptyState } from "@/components/empty-state";

export default function GestaoPage() {
  return (
    <div className="px-6 py-10 md:px-10 md:py-12">
      <div className="mx-auto max-w-[1100px]">
        <h1 className="text-h1 text-neutral-900 mb-1">Gestão</h1>
        <p className="text-body text-neutral-600 mb-6">Projetos, usuários, permissões e custos</p>
        <EmptyState
          icon={Settings}
          title="Nenhum projeto configurado"
          description="Crie seu primeiro projeto no Naninne para começar a organizar conteúdo, memória e agentes por área de trabalho."
        />
      </div>
    </div>
  );
}
