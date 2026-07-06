"use client";
import { FileText } from "lucide-react";
import { EmptyState } from "@/components/empty-state";

export default function DocumentosPage() {
  return (
    <div className="px-6 py-10 md:px-10 md:py-12">
      <div className="mx-auto max-w-[1100px]">
        <h1 className="text-h1 text-neutral-900 mb-1">Documentos</h1>
        <p className="text-body text-neutral-600 mb-6">Atas, relatórios, contratos e documentos gerados</p>
        <EmptyState
          icon={FileText}
          title="Nenhum documento gerado"
          description="Documentos gerados pelo Naninne aparecem aqui. Você pode exportá-los em PDF, Markdown ou Word."
        />
      </div>
    </div>
  );
}
