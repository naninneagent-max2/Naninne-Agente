/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Paperclip,
  Mic,
  ArrowUp,
  Sparkles,
  Clock,
  TrendingUp,
  ChevronRight,
  LogOut,
  Loader2,
  CheckCircle2,
  Library,
  Brain,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { QUICK_ACTIONS } from "@/data/quick-actions";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/store/auth";
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
  plan?: Array<{ agent: string; task: string; status: "pending" | "running" | "done" }>;
  sources?: Array<{ type: string; label: string; snippet: string }>;
  tokens?: { input: number; output: number };
  cost_usd?: number;
  latency_ms?: number;
};

export function InicioContent() {
  const user = useAuth((s) => s.user);
  const setUser = useAuth((s) => s.setUser);
  const refresh = useAuth((s) => s.refresh);
  const logout = useAuth((s) => s.logout);

  const [projects, setProjects] = React.useState<Project[]>([]);
  const [projectsLoading, setProjectsLoading] = React.useState(false);
  const [messages, setMessages] = React.useState<ChatMessage[]>([]);
  const [input, setInput] = React.useState("");
  const [chatLoading, setChatLoading] = React.useState(false);

  // Carrega projects ao logar
  React.useEffect(() => {
    if (user) {
      setProjectsLoading(true);
      fetch("/api/projects", { cache: "no-store" })
        .then((r) => r.json())
        .then((data) => setProjects(data.projects ?? []))
        .finally(() => setProjectsLoading(false));
    }
  }, [user]);

  // Refresh auth ao montar (caso cookie ainda válido)
  React.useEffect(() => {
    refresh();
  }, [refresh]);

  async function handleSend() {
    const text = input.trim();
    if (!text || chatLoading) return;

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: "user",
      content: text,
    };
    setMessages((m) => [...m, userMsg]);
    setInput("");
    setChatLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [...messages, userMsg] }),
      });
      const data = await res.json();
      const assistantMsg: ChatMessage = {
        id: `a-${Date.now()}`,
        role: "assistant",
        content: data.response,
        plan: data.plan,
        sources: data.sources,
        tokens: data.tokens,
        cost_usd: data.cost_usd,
        latency_ms: data.latency_ms,
      };
      setMessages((m) => [...m, assistantMsg]);
    } catch (err) {
      const errorMsg: ChatMessage = {
        id: `e-${Date.now()}`,
        role: "assistant",
        content: "Erro ao processar. Tente novamente.",
      };
      setMessages((m) => [...m, errorMsg]);
    } finally {
      setChatLoading(false);
    }
  }

  // Tela de login (quando não logado)
  if (!user) {
    return (
      <div className="flex-1 flex items-center justify-center px-6 py-12 bg-gradient-to-b from-background to-muted/30">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <div className="text-center mb-8">
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground mb-4"
            >
              <Brain className="h-7 w-7" />
            </motion.div>
            <h1 className="text-3xl font-semibold tracking-tight mb-2">Naninne</h1>
            <p className="text-sm text-muted-foreground">
              Entre para acessar sua biblioteca e seus agentes
            </p>
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

  // Logado — Command Hub completo
  return (
    <div className="flex-1 overflow-y-auto px-6 py-8 max-w-5xl mx-auto w-full">
      {/* Header com user info */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between mb-8"
      >
        <div>
          <p className="text-sm text-muted-foreground">
            Olá, <span className="font-medium text-foreground">{user.display_name || user.email}</span>
          </p>
          <h1 className="text-2xl font-semibold tracking-tight mt-1">
            O que você quer fazer hoje?
          </h1>
        </div>
        <Button variant="ghost" size="sm" onClick={logout} className="gap-2">
          <LogOut className="h-4 w-4" />
          Sair
        </Button>
      </motion.div>

      {/* Projects badges */}
      {projects.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.05 }}
          className="mb-6 flex flex-wrap gap-2"
        >
          <span className="text-xs text-muted-foreground mr-1 self-center">Projetos:</span>
          {projects.map((p) => (
            <Badge
              key={p.id}
              variant="outline"
              className="gap-1.5"
              style={{ borderColor: p.color, color: p.color }}
            >
              <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: p.color }} />
              {p.name}
            </Badge>
          ))}
        </motion.div>
      )}

      {/* Chat area */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card className="mb-6">
          <CardContent className="p-6 space-y-4">
            {/* Messages */}
            <AnimatePresence>
              {messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn(
                    "rounded-lg p-4",
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground ml-auto max-w-[85%]"
                      : "bg-muted/50 mr-auto max-w-[90%]"
                  )}
                >
                  <div className="text-sm whitespace-pre-wrap">{msg.content}</div>
                  {msg.role === "assistant" && msg.plan && (
                    <div className="mt-3 pt-3 border-t border-border/40 space-y-1">
                      <p className="text-xs font-medium opacity-80">Plano do orquestrador:</p>
                      <div className="space-y-1">
                        {msg.plan.map((p, i) => (
                          <div key={i} className="flex items-center gap-2 text-xs">
                            {p.status === "done" && <CheckCircle2 className="h-3 w-3 text-green-600" />}
                            {p.status === "running" && <Loader2 className="h-3 w-3 animate-spin text-blue-500" />}
                            {p.status === "pending" && <Clock className="h-3 w-3 opacity-40" />}
                            <span className="opacity-90">
                              <strong>{p.agent}</strong> — {p.task}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {msg.role === "assistant" && msg.tokens && (
                    <div className="mt-2 text-xs opacity-60 flex gap-3">
                      <span>{msg.tokens.input + msg.tokens.output} tokens</span>
                      <span>${msg.cost_usd?.toFixed(4)}</span>
                      <span>{msg.latency_ms}ms</span>
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>

            {/* Quick actions (só quando sem mensagens) */}
            {messages.length === 0 && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {QUICK_ACTIONS.slice(0, 6).map((action) => (
                  <button
                    key={action.id}
                    onClick={() => setInput(action.label)}
                    className="text-left p-3 rounded-lg border border-border hover:border-primary hover:bg-accent transition-colors"
                  >
                    <action.icon className="h-6 w-6 mb-2 text-primary" />
                    <div className="text-sm font-medium">{action.label}</div>
                  </button>
                ))}
              </div>
            )}

            {/* Input */}
            <div className="flex items-end gap-2 pt-2 border-t border-border/40">
              <Button type="button" variant="ghost" size="icon" className="shrink-0" aria-label="Anexar arquivo">
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
                  placeholder='Ex: "Cruze minhas anotações sobre poder invisível com O Príncipe e escreva 8 páginas no tom do Cap. III"'
                  rows={2}
                  className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  disabled={chatLoading}
                />
              </div>
              <Button type="button" variant="ghost" size="icon" className="shrink-0" aria-label="Voz">
                <Mic className="h-4 w-4" />
              </Button>
              <Button onClick={handleSend} disabled={!input.trim() || chatLoading} size="icon" className="shrink-0">
                {chatLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUp className="h-4 w-4" />}
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Quick stats / continue area */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="grid grid-cols-1 md:grid-cols-3 gap-4"
      >
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
              <Library className="h-3.5 w-3.5" />
              <span>Biblioteca</span>
            </div>
            <p className="text-2xl font-semibold">0</p>
            <p className="text-xs text-muted-foreground mt-1">arquivos indexados</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
              <Brain className="h-3.5 w-3.5" />
              <span>Memória</span>
            </div>
            <p className="text-2xl font-semibold">0</p>
            <p className="text-xs text-muted-foreground mt-1">fatos lembrados</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
              <TrendingUp className="h-3.5 w-3.5" />
              <span>Operações</span>
            </div>
            <p className="text-2xl font-semibold">{messages.filter((m) => m.role === "assistant").length}</p>
            <p className="text-xs text-muted-foreground mt-1">nesta sessão</p>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
