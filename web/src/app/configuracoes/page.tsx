"use client";
import { Settings2 } from "lucide-react";
import { EmptyState } from "@/components/empty-state";

export default function ConfiguracoesPage() {
  return (
    <div className="px-6 py-10 md:px-10 md:py-12">
      <div className="mx-auto max-w-[1100px]">
        <h1 className="text-h1 text-neutral-900 mb-1">Configurações</h1>
        <p className="text-body text-neutral-600 mb-6">Preferências, integrações, conta e privacidade</p>
        <EmptyState
          icon={Settings2}
          title="Tudo nas configurações padrão"
          description="Você ainda não personalizou nada. Quando ajustar, vai aparecer aqui."
        />
      </div>
    </div>
  );
}
