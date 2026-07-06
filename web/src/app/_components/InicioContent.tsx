/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Paperclip,
  Mic,
  ArrowUp,
  Sparkles,
  Loader2,
  LogOut,
  Brain,
  Library,
  History,
  Lightbulb,
  Rocket,
  FileSearch,
  Save,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/store/auth";
import { useAgents } from "@/lib/store/agents";
import { LoginForm } from "./LoginForm";

type Project = {
  id: string;
  slug: string;
  name: string;
  color: string;
  icon: string;
  description?: string;
  sort_order: number;
};

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  streaming?: boolean;
};

const QUICK_ACTIONS = [
  { id: "qa1", label: "Escrever capítulo", icon: FileSearch, prompt: "Estou escrevendo um capítulo. Me ajude a estruturar a argumentação." },
  { id: "qa2", label: "Buscar na biblioteca", icon: Library, prompt: "Vou fazer upload de um arquivo. Quero busca semântica depois." },
  { id: "qa3", label: "Pesquisar na web", icon: Sparkles, prompt: "Pesquise dados atualizados sobre pecuária de corte no Brasil." },
  { id: "qa4", label: "Analisar planilha", icon: History, prompt: "Vou subir uma planilha de controle. Me ajude a encontrar KPIs." },
  { id: "qa5", label: "Roteiro / cena", icon: Lightbulb, prompt: "Estou desenvolvendo um roteiro. Me ajude a estruturar uma cena noir." },
  { id: "qa6", label: "Configurar o app", icon: Rocket, prompt: "Me ajude a entender o que falta configurar no Naninne." },
];

export function InicioContent() {
  const user = useAuth((s) => s.user);
  const refresh = useAuth((s) => s.refresh);
  const logout = useAuth((s) => s.logout);

  const [projects, setProjects] = React.useState<Project[]>([]);
  const [messages, setMessages] = React.useState<ChatMessage[]>([]);
  const [input, setInput] = React.useState("");
  const [chatError, setChatError] = React.useState<string | null>(null);
  const [stats, setStats] = React.useState({ library: 0, memories: 0, documents: 0, sessions: 1 });
  const [extractingMemories, setExtractingMemories] = React.useState(false);
  const [memoryToast, setMemoryToast] = React.useState<string | null>(null);
  const [conversationId, setConversationId] = React.useState<string | null>(null);
  const [recentConvs, setRecentConvs] = React.useState<Array<{ id: string; title: string; last_message_at: string | null; message_count: number }>>([]);

  // Agent store
  const resetAgents = useAgents((s) => s.reset);
  const updateStep = useAgents((s) => s.updateStep);
  const setActive = useAgents((s) => s.setActive);
  const setFullText = useAgents((s) => s.setFullText);
  const setSources = useAgents((s) => s.setSources);
  const setTokens = useAgents((s) => s.setTokens);
  const setDocumentId = useAgents((s) => s.setDocumentId);
  const chatLoading = useAgents((s) => s.isActive);

    const loadRecentConvs = React.useCallback(async () => {
    if (!user) return;
    try {
      const r = await fetch("/api/conversations", { cache: "no-store" });
      const d = await r.json();
      setRecentConvs(d.conversations ?? []);
    } catch {
      setRecentConvs([]);
    }
  }, [user]);

  React.useEffect(() => {
    if (user) loadRecentConvs();
  }, [user, loadRecentConvs]);

  async function loadConversation(convId: string) {
    try {
      const r = await fetch(`/api/conversations/${convId}/messages`, { cache: "no-store" });
      const d = await r.json();
      if (d.messages) {
        setMessages(d.messages.map((m: any) => ({
          id: `loaded-${m.id}`,
          role: m.role,
          content: m.content,
          tokens_input: m.tokens_input,
          tokens_output: m.tokens_output,
          cost_usd: m.cost_usd,
        })));
        setConversationId(convId);
      }
    } catch (err) {
      console.error("load conversation failed", err);
    }
  }

  function startNewConversation() {
    setMessages([]);
    setConversationId(null);
  }

  const reloadStats = React.useCallback(() => {
    if (!user) return;
    Promise.all([
      fetch("/api/library", { cache: "no-store" }).then((r) => r.json()).catch(() => ({ items: [] })),
      fetch("/api/memories", { cache: "no-store" }).then((r) => r.json()).catch(() => ({ memories: [] })),
      fetch("/api/documents", { cache: "no-store" }).then((r) => r.json()).catch(() => ({ documents: [] })),
    ]).then(([lib, mem, doc]) => {
      setStats((s) => ({
        ...s,
        library: lib.items?.length ?? 0,
        memories: mem.memories?.length ?? 0,
        documents: doc.documents?.length ?? 0,
      }));
    });
  }, [user]);

  React.useEffect(() => {
    if (user) {
      fetch("/api/projects", { cache: "no-store" })
        .then((r) => r.json())
        .then((data) => setProjects(data.projects ?? []))
        .catch(() => setProjects([]));
      reloadStats();
    }
  }, [user, reloadStats]);

  React.useEffect(() => { refresh(); }, [refresh]);

  async function handleSend(textOverride?: string) {
    const text = (textOverride ?? input).trim();
    if (!text || chatLoading) return;

    setChatError(null);
    const userMsg: ChatMessage = { id: `u-${Date.now()}`, role: "user", content: text };
    setMessages((m) => [...m, userMsg]);
    if (!textOverride) setInput("");

    // Reset agent state
    resetAgents();
    setFullText("");

    const assistantId = `a-${Date.now()}`;
    setMessages((m) => [...m, { id: assistantId, role: "assistant", content: "", streaming: true }]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [...messages, userMsg], conversation_id: conversationId, project_id: null }),
      });

      if (!res.ok || !res.body) {
        const txt = await res.text();
        throw new Error(txt || `HTTP ${res.status}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        // Parse SSE events
        const lines = buffer.split("\n\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const json = line.slice(6).trim();
          if (!json) continue;
          try {
            const event = JSON.parse(json);
            if (event.type === "init") {
              // Already initialized in reset()
            } else if (event.type === "agent_start") {
              // step will be updated via step event
            } else if (event.type === "agent_done") {
              // already updated
            } else if (event.type === "step") {
              updateStep(event.stepId, event.state, event.detail);
            } else if (event.type === "text") {
              accumulated += event.content;
              setMessages((m) =>
                m.map((msg) =>
                  msg.id === assistantId ? { ...msg, content: accumulated, streaming: true } : msg
                )
              );
            } else if (event.type === "error") {
              throw new Error(event.message);
            } else if (event.type === "done") {
              const finalConvId = event.conversation_id ?? conversationId;
              setSources(event.sources ?? []);
              setTokens(event.tokens_in ?? 0, event.tokens_out ?? 0, event.cost_usd ?? 0);
              setDocumentId(event.document_id);
              if (event.conversation_id && !conversationId) {
                setConversationId(event.conversation_id);
              }

              // Salva as duas mensagens (user + assistant) via endpoint dedicado
              // (evita race condition do insert dentro do SSE stream)
              if (finalConvId) {
                fetch(`/api/conversations/${finalConvId}/messages`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    messages: [
                      {
                        role: "user",
                        content: text,
                      },
                      {
                        role: "assistant",
                        content: accumulated,
                        agent_used: "orchestrator",
                        model_used: "claude-sonnet-4-5",
                        tokens_input: event.tokens_in,
                        tokens_output: event.tokens_out,
                        cost_usd: event.cost_usd,
                        sources: event.sources ?? [],
                      },
                    ],
                  }),
                }).catch((err) => console.error("[client] save messages error", err));
              }
              loadRecentConvs();
            }
          } catch (parseErr) {
            // Ignore parse errors for partial lines
            if (!(parseErr instanceof SyntaxError)) {
              throw parseErr;
            }
          }
        }
      }

      setMessages((m) =>
        m.map((msg) => (msg.id === assistantId ? { ...msg, streaming: false } : msg))
      );
      setActive(false);
      setStats((s) => ({ ...s, sessions: s.sessions + 1, documents: s.documents + 1 }));
      reloadStats();
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Erro de rede";
      setChatError(errorMsg);
      setMessages((m) =>
        m.map((msg) =>
          msg.id === assistantId ? { ...msg, content: `Erro: ${errorMsg}`, streaming: false } : msg
        )
      );
      setActive(false);
    }
  }

  async function handleRemember() {
    if (messages.length < 2 || extractingMemories) return;
    setExtractingMemories(true);
    try {
      const res = await fetch("/api/memories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "extract",
          messages: messages.map((m) => ({ role: m.role, content: m.content })),
        }),
      });
      const data = await res.json();
      const n = data.extracted ?? 0;
      if (n > 0) {
        setMemoryToast(`${n} ${n === 1 ? "memória salva" : "memórias salvas"}`);
        setTimeout(() => setMemoryToast(null), 3000);
        reloadStats();
      } else {
        setMemoryToast(data.deduplicated ? "Já lembrado" : "Nada memorável nesta conversa");
        setTimeout(() => setMemoryToast(null), 3000);
      }
    } catch {
      setMemoryToast("Erro ao salvar memórias");
      setTimeout(() => setMemoryToast(null), 3000);
    } finally {
      setExtractingMemories(false);
    }
  }

  if (!user) {
    return (
      <div className="flex-1 flex items-center justify-center px-6 py-12 bg-gradient-to-b from-background to-muted/30">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
          <div className="text-center mb-8">
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground mb-4"
            >
              <Brain className="h-7 w-7" />
            </motion.div>
            <h1 className="text-3xl font-semibold tracking-tight mb-2">Naninne</h1>
            <p className="text-sm text-muted-foreground">Seu segundo cérebro digital</p>
          </div>
          <Card>
            <CardContent className="pt-6">
              <LoginForm />
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-6 py-8 max-w-5xl mx-auto w-full">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between mb-6"
      >
        <div>
          <p className="text-sm text-muted-foreground">
            Olá, <span className="font-medium text-foreground">{user.display_name || user.email}</span>
          </p>
          <h1 className="text-2xl font-semibold tracking-tight mt-1">O que vamos fazer hoje?</h1>
        </div>
        <Button variant="ghost" size="sm" onClick={logout} className="gap-2">
          <LogOut className="h-4 w-4" />
          Sair
        </Button>
      </motion.div>

      {projects.length > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-6 flex flex-wrap gap-2 items-center">
          <span className="text-xs text-muted-foreground">Projetos:</span>
          {projects.map((p) => (
            <Badge key={p.id} variant="outline" className="gap-1.5" style={{ borderColor: p.color, color: p.color }}>
              <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: p.color }} />
              {p.name}
            </Badge>
          ))}
        </motion.div>
      )}

      {recentConvs.length > 0 && messages.length === 0 && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Conversas recentes</h2>
            <Button variant="ghost" size="sm" onClick={startNewConversation} className="text-xs">
              + Nova conversa
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {recentConvs.slice(0, 6).map((conv) => (
              <Card
                key={conv.id}
                variant="hover-elevate"
                className="cursor-pointer"
                onClick={() => loadConversation(conv.id)}
              >
                <CardContent className="p-3 flex items-start gap-3">
                  <History className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-neutral-900 truncate">{conv.title}</p>
                    <p className="text-caption text-muted-foreground mt-0.5">
                      {conv.message_count} mensagens · {conv.last_message_at ? new Date(conv.last_message_at).toLocaleDateString("pt-BR") : "hoje"}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </motion.div>
      )}

      {messages.length > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-3 flex justify-end">
          <Button variant="ghost" size="sm" onClick={startNewConversation} className="text-xs gap-1.5">
            <Sparkles className="h-3.5 w-3.5" />
            Nova conversa
          </Button>
        </motion.div>
      )}

      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <Card className="mb-6">
          <CardContent className="p-6 space-y-4">
            <AnimatePresence>
              {messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={
                    msg.role === "user"
                      ? "rounded-lg p-4 bg-primary text-primary-foreground ml-auto max-w-[85%]"
                      : "rounded-lg p-4 bg-muted/50 mr-auto max-w-[90%]"
                  }
                >
                  {msg.content ? (
                    <div className="text-sm whitespace-pre-wrap">{msg.content}</div>
                  ) : msg.streaming ? (
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span className="text-xs">compondo resposta...</span>
                    </div>
                  ) : null}
                </motion.div>
              ))}
            </AnimatePresence>

            {chatError && (
              <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-md p-2">
                {chatError}
              </div>
            )}

            {memoryToast && (
              <div className="text-xs text-blue-700 bg-blue-50 border border-blue-200 rounded-md p-2 flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5" />
                {memoryToast}
              </div>
            )}

            {messages.length === 0 && (
              <div className="text-center py-6">
                <p className="text-sm text-muted-foreground mb-4">Comece uma conversa ou escolha uma ação rápida:</p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {QUICK_ACTIONS.map((action) => (
                    <button
                      key={action.id}
                      onClick={() => handleSend(action.prompt)}
                      className="text-left p-3 rounded-lg border border-border hover:border-primary hover:bg-accent transition-colors"
                      disabled={chatLoading}
                    >
                      <action.icon className="h-5 w-5 mb-2 text-primary" />
                      <div className="text-sm font-medium">{action.label}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-end gap-2 pt-2 border-t border-border/40">
              <Button type="button" variant="ghost" size="icon" className="shrink-0" aria-label="Anexar arquivo" disabled>
                <Paperclip className="h-4 w-4" />
              </Button>
              <div className="flex-1 relative">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  placeholder="Pergunte algo ao Naninne ou descreva o que você quer fazer..."
                  rows={2}
                  className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary disabled:opacity-50"
                  disabled={chatLoading}
                />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="shrink-0"
                aria-label="Salvar na memória"
                onClick={handleRemember}
                disabled={messages.length < 2 || extractingMemories}
                title="Salvar na memória"
              >
                {extractingMemories ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              </Button>
              <Button type="button" variant="ghost" size="icon" className="shrink-0" aria-label="Voz" disabled>
                <Mic className="h-4 w-4" />
              </Button>
              <Button onClick={() => handleSend()} disabled={!input.trim() || chatLoading} size="icon" className="shrink-0">
                {chatLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUp className="h-4 w-4" />}
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="grid grid-cols-2 md:grid-cols-4 gap-4"
      >
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
              <Library className="h-3.5 w-3.5" />
              <span>Biblioteca</span>
            </div>
            <p className="text-2xl font-semibold">{stats.library}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.library === 0 ? "vazia" : "arquivos"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
              <Brain className="h-3.5 w-3.5" />
              <span>Memória</span>
            </div>
            <p className="text-2xl font-semibold">{stats.memories}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.memories === 0 ? "nenhuma" : "fatos"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
              <FileSearch className="h-3.5 w-3.5" />
              <span>Documentos</span>
            </div>
            <p className="text-2xl font-semibold">{stats.documents}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.documents === 0 ? "nenhum" : "gerados"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Sessões</span>
            </div>
            <p className="text-2xl font-semibold">{stats.sessions}</p>
            <p className="text-xs text-muted-foreground mt-1">nesta sessão</p>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
