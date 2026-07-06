"use client";
import * as React from "react";
import { Brain, Trash2, Loader2, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/store/auth";

type Memory = {
  id: string;
  fact: string;
  category: string;
  confidence: number;
  created_at: string;
  updated_at: string;
};

const CATEGORY_LABELS: Record<string, string> = {
  preference: "Preferência",
  project: "Projeto",
  personality: "Personalidade",
  context: "Contexto",
  other: "Outro",
};

const CATEGORY_COLORS: Record<string, string> = {
  preference: "bg-blue-100 text-blue-700",
  project: "bg-purple-100 text-purple-700",
  personality: "bg-orange-100 text-orange-700",
  context: "bg-green-100 text-green-700",
  other: "bg-neutral-100 text-neutral-700",
};

export default function MemoriaPage() {
  const user = useAuth((s) => s.user);
  const [memories, setMemories] = React.useState<Memory[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [deleting, setDeleting] = React.useState<string | null>(null);

  const reload = React.useCallback(() => {
    if (!user) return;
    setLoading(true);
    fetch("/api/memories", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => setMemories(data.memories ?? []))
      .catch(() => setMemories([]))
      .finally(() => setLoading(false));
  }, [user]);

  React.useEffect(() => { reload(); }, [reload]);

  async function handleDelete(id: string) {
    setDeleting(id);
    try {
      await fetch("/api/memories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", memory_id: id }),
      });
      reload();
    } finally {
      setDeleting(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-muted-foreground text-sm">
        Carregando memórias...
      </div>
    );
  }

  return (
    <div className="px-6 py-10 md:px-10 md:py-12">
      <div className="mx-auto max-w-[1100px]">
        <div className="mb-6 flex items-end justify-between">
          <div>
            <h1 className="text-h1 text-neutral-900 mb-1">Memória</h1>
            <p className="text-body text-neutral-600">
              {memories.length === 0
                ? "Nenhuma memória ainda"
                : `${memories.length} ${memories.length === 1 ? "fato lembrado" : "fatos lembrados"} que o Naninne usa pra personalizar respostas`}
            </p>
          </div>
          {memories.length > 0 && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Sparkles className="h-4 w-4" />
              <span>Auto-aprendizado</span>
            </div>
          )}
        </div>

        {memories.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-muted/50 text-muted-foreground mb-4">
                <Brain className="h-8 w-8" />
              </div>
              <h2 className="text-lg font-semibold tracking-tight mb-2">Nenhuma memória ainda</h2>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                Conforme você conversa com o Naninne, fatos importantes sobre você são lembrados automaticamente
                (seu estilo, preferências, projetos, pessoas). O Naninne usa essas memórias para personalizar
                cada resposta.
              </p>
              <p className="text-xs text-muted-foreground mt-4">
                Dica: conte ao Naninne sobre seus projetos e o que você quer da ferramenta.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {memories.map((m) => (
              <Card key={m.id} variant="hover-elevate">
                <CardContent className="flex items-center gap-4 p-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge className={CATEGORY_COLORS[m.category] ?? CATEGORY_COLORS.other} size="sm">
                        {CATEGORY_LABELS[m.category] ?? m.category}
                      </Badge>
                      <span className="text-caption text-muted-foreground">
                        confiança {(m.confidence * 100).toFixed(0)}%
                      </span>
                    </div>
                    <p className="text-sm text-neutral-900">{m.fact}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(m.id)}
                    disabled={deleting === m.id}
                    className="shrink-0 text-muted-foreground hover:text-red-600"
                  >
                    {deleting === m.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
