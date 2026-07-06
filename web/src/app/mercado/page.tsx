"use client";
import { BarChart3 } from "lucide-react";
import { EmptyState } from "@/components/empty-state";

export default function MercadoPage() {
  return (
    <div className="px-6 py-10 md:px-10 md:py-12">
      <div className="mx-auto max-w-[1100px]">
        <h1 className="text-h1 text-neutral-900 mb-1">Mercado</h1>
        <p className="text-body text-neutral-600 mb-6">Análise de planilhas, dashboards e apresentações executivas</p>
        <EmptyState
          icon={BarChart3}
          title="Nenhuma análise ainda"
          description="Faça upload de uma planilha ou conecte uma fonte de dados. O Naninne vai analisar, gerar visualizações e um resumo executivo."
        />
      </div>
    </div>
  );
}
