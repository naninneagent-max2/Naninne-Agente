/* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any */
"use client";

import * as React from "react";
import { Clapperboard, Plus, Sparkles, Image as ImageIcon } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const TABS = [
  { id: "projeto", label: "Projeto" },
  { id: "roteiro", label: "Roteiro" },
  { id: "cenas", label: "Cenas" },
  { id: "prompts", label: "Prompts visuais" },
  { id: "producao", label: "Produção" },
] as const;

export function AudiovisualContent() {
  const [activeTab, setActiveTab] = React.useState<(typeof TABS)[number]["id"]>("cenas");

  return (
    <div className="px-6 py-10 pb-24 md:px-10 md:py-12">
      <div className="mx-auto max-w-[1100px]">
        <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="mb-1 flex items-center gap-2">
              <Badge className="border-0 bg-av-100 text-av-700" size="sm">
                <Clapperboard className="mr-1 h-3 w-3" />
                Projeto audiovisual
              </Badge>
            </div>
            <h1 className="text-h1 text-neutral-900">Audiovisual</h1>
            <p className="mt-1 text-body text-neutral-600">
              Roteiros, cenas e prompts visuais para Midjourney / Runway / Kling
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" className="gap-1.5">
              <Sparkles className="h-4 w-4" />
              Gerar cena
            </Button>
            <Button className="gap-1.5">
              <Plus className="h-4 w-4" />
              Novo roteiro
            </Button>
          </div>
        </header>

        <div className="mb-6 flex gap-1 border-b border-neutral-200">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === t.id ? "border-primary text-primary" : "border-transparent text-neutral-600 hover:text-neutral-900"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <EmptyState
          icon={Clapperboard}
          title="Nenhum roteiro ainda"
          description="Crie seu primeiro projeto audiovisual. Você poderá estruturar cenas, gerar prompts visuais para IA generativa e organizar a produção por etapa."
          cta={{ label: "Criar primeiro roteiro" }}
        />
      </div>
    </div>
  );
}
