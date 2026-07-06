/* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any */
"use client";

import * as React from "react";
import { BookOpen, FileText, Plus, Sparkles, Download } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const TABS = [
  { id: "projeto", label: "Projeto" },
  { id: "capitulos", label: "Capítulos" },
  { id: "anotacoes", label: "Anotações" },
  { id: "estilo", label: "Estilo" },
  { id: "exportar", label: "Exportar" },
] as const;

type Chapter = {
  id: string;
  num: number;
  title: string;
  status: "rascunho" | "em-rascunho" | "finalizado" | "pendente";
  words: number;
  updated: string | null;
};

export function EscritaContent() {
  const [activeTab, setActiveTab] = React.useState<(typeof TABS)[number]["id"]>("capitulos");
  const [chapters, setChapters] = React.useState<Chapter[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    fetch("/api/chapters", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => setChapters(data.chapters ?? []))
      .catch(() => setChapters([]))
      .finally(() => setLoading(false));
  }, []);

  const totalWords = chapters.reduce((sum, c) => sum + c.words, 0);

  return (
    <div className="px-6 py-10 pb-24 md:px-10 md:py-12">
      <div className="mx-auto max-w-[1100px]">
        <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="mb-1 flex items-center gap-2">
              <Badge className="border-0 bg-writing-100 text-writing-700" size="sm">
                <BookOpen className="mr-1 h-3 w-3" />
                Projeto de escrita
              </Badge>
            </div>
            <h1 className="text-h1 text-neutral-900">Escrita Criativa</h1>
            <p className="mt-1 text-body text-neutral-600">
              {chapters.length === 0 ? "Nenhum projeto criado ainda" : `${chapters.length} capítulos · ${totalWords.toLocaleString("pt-BR")} palavras no total`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" className="gap-1.5" disabled={chapters.length === 0}>
              <Sparkles className="h-4 w-4" />
              Pedir continuação
            </Button>
            <Button className="gap-1.5" disabled={chapters.length === 0}>
              <Plus className="h-4 w-4" />
              Novo capítulo
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

        {chapters.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            title="Nenhum capítulo ainda"
            description="Comece um novo projeto de escrita. Você poderá estruturar capítulos, escrever anotações, definir o estilo do texto e exportar para PDF ou Markdown."
            cta={{ label: "Criar primeiro projeto" }}
          />
        ) : (
          <div className="space-y-3">
            {chapters.map((ch) => (
              <Card key={ch.id} variant="hover-elevate">
                <CardContent className="flex items-center gap-4 p-4">
                  <span className="text-h4 font-semibold text-neutral-400 w-8">
                    {String(ch.num).padStart(2, "0")}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-neutral-900 truncate">{ch.title}</p>
                    <p className="text-caption text-neutral-500 mt-0.5">
                      {ch.words.toLocaleString("pt-BR")} palavras
                      {ch.updated && ` · atualizado em ${new Date(ch.updated).toLocaleDateString("pt-BR")}`}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
