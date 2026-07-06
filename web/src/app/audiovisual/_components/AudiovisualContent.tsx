/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, react/no-unescaped-entities */
"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Clapperboard,
  Plus,
  Loader2,
  AlertCircle,
  Sparkles,
  Copy,
  CheckCircle2,
  Trash2,
  Image as ImageIcon,
  Save,
  Edit3,
  X,
  Film,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ProjectPicker } from "@/components/ui/project-picker";
import { useProjects } from "@/lib/hooks/use-projects";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/empty-state";
import { ConfirmDialog } from "@/components/ui/confirm/ConfirmDialog";
import { useToast } from "@/lib/hooks/use-toast";
import { cn } from "@/lib/utils";

type Scene = {
  id: string;
  scene_number: number;
  title: string;
  cinematic_description: string;
  composition: string | null;
  midjourney_prompt: string;
  tags: string[];
  style_reference: string | null;
  status: string;
  created_at: string;
  updated_at: string;
};

const STYLE_PRESETS = [
  { id: "cinematic-dark", label: "Cinematográfico Escuro", emoji: "🌑" },
  { id: "noir", label: "Noir Psicológico", emoji: "🕵️" },
  { id: "vintage", label: "Vintage / Anos 70", emoji: "📻" },
  { id: "documentary", label: "Documental Natural", emoji: "🎥" },
  { id: "neon-cyberpunk", label: "Neon / Cyberpunk", emoji: "🌃" },
  { id: "epic-landscape", label: "Épico / Paisagem", emoji: "🏔️" },
];

export function AudiovisualContent() {
  const [scenes, setScenes] = React.useState<Scene[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [script, setScript] = React.useState("");
  const [style, setStyle] = React.useState("cinematic-dark");
  const [count, setCount] = React.useState(8);
  const [projectId, setProjectId] = React.useState<string | null>(null);
  const { projects: availableProjects } = useProjects();
  const [parsing, setParsing] = React.useState(false);
  const [parseError, setParseError] = React.useState<string | null>(null);
  const [showForm, setShowForm] = React.useState(false);
  const [editingScene, setEditingScene] = React.useState<Scene | null>(null);
  const toast = useToast();
  const [confirmDeleteScene, setConfirmDeleteScene] = React.useState<Scene | null>(null);
  const [copiedId, setCopiedId] = React.useState<string | null>(null);

  const reload = React.useCallback(() => {
    setLoading(true);
    fetch("/api/audiovisual/scenes", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => setScenes(data.scenes ?? []))
      .catch(() => setScenes([]))
      .finally(() => setLoading(false));
  }, []);

  React.useEffect(() => { reload(); }, [reload]);

  async function handleParse() {
    if (!script || script.length < 100) {
      setParseError("Cole um roteiro com pelo menos 100 caracteres");
      return;
    }
    setParsing(true);
    setParseError(null);
    try {
      const res = await fetch("/api/audiovisual/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ script, style, count, project_id: projectId }),
      });
      const data = await res.json();
      if (data.ok) {
        setShowForm(false);
        setScript("");
        reload();
      } else {
        setParseError(data.error ?? "Erro ao processar");
      }
    } catch (err) {
      setParseError(err instanceof Error ? err.message : "Erro de rede");
    } finally {
      setParsing(false);
    }
  }

  async function handleDeleteScene(scene: Scene) {
    const res = await fetch(`/api/audiovisual/scenes/${scene.id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Cena deletada", `"${scene.title}" foi removida.`);
      reload();
    } else {
      toast.error("Erro ao deletar cena");
    }
    setConfirmDeleteScene(null);
  }

  async function copyPrompt(scene: Scene) {
    await navigator.clipboard.writeText(scene.midjourney_prompt);
    setCopiedId(scene.id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-muted-foreground text-sm">
        Carregando cenas...
      </div>
    );
  }

  if (editingScene) {
    return <SceneEditor scene={editingScene} onClose={() => { setEditingScene(null); reload(); }} />;
  }

  return (
    <div className="px-6 py-10 md:px-10 md:py-12">
      <div className="mx-auto max-w-[1100px]">
        <div className="mb-6 flex items-end justify-between">
          <div>
            <div className="mb-1 flex items-center gap-2">
              <Badge className="border-0 bg-av-100 text-av-700" size="sm">
                <Clapperboard className="mr-1 h-3 w-3" />
                Roteiros visuais
              </Badge>
            </div>
            <h1 className="text-h1 text-neutral-900">Audiovisual</h1>
            <p className="mt-1 text-body text-neutral-600">
              Cole um roteiro e o Naninne gera cards de cena com prompts Midjourney prontos.
            </p>
          </div>
          <Button onClick={() => setShowForm(!showForm)} className="gap-1.5">
            {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {showForm ? "Cancelar" : "Novo roteiro"}
          </Button>
        </div>

        {/* Form */}
        <AnimatePresence>
          {showForm && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden mb-6"
            >
              <Card>
                <CardContent className="p-6 space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Cole seu roteiro</label>
                    <Textarea
                      value={script}
                      onChange={(e) => setScript(e.target.value)}
                      placeholder="Cole aqui o texto do seu roteiro, cenas, ou até sinopse detalhada. Quanto mais visual e descritivo, melhor o resultado."
                      rows={8}
                      className="font-mono text-sm"
                    />
                    <p className="text-caption text-muted-foreground mt-1">
                      {script.length} caracteres (mínimo 100)
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium mb-2">Estilo visual</label>
                      <div className="grid grid-cols-2 gap-2">
                        {STYLE_PRESETS.map((s) => (
                          <button
                            key={s.id}
                            onClick={() => setStyle(s.id)}
                            className={cn(
                              "text-left p-2 rounded-md border text-sm transition-colors",
                              style === s.id
                                ? "border-primary bg-primary/5"
                                : "border-border hover:border-primary/40"
                            )}
                          >
                            <span className="mr-1">{s.emoji}</span>
                            <span className="text-xs">{s.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Nº de cenas (3-12)</label>
                      <Input
                        type="number"
                        min={3}
                        max={12}
                        value={count}
                        onChange={(e) => setCount(Math.min(12, Math.max(3, Number(e.target.value) || 8)))}
                      />
                      <p className="text-caption text-muted-foreground mt-1">
                        Mais cenas = mais granularidade visual
                      </p>
                    </div>
                  </div>
                  <ProjectPicker
                    projects={availableProjects}
                    value={projectId}
                    onChange={setProjectId}
                    label="Projeto (opcional)"
                  />
                  {parseError && (
                    <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md p-2">
                      {parseError}
                    </div>
                  )}
                  <Button
                    onClick={handleParse}
                    disabled={parsing || script.length < 100}
                    className="w-full gap-1.5"
                  >
                    {parsing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                    {parsing ? "Processando roteiro..." : "Gerar cenas com IA"}
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Scenes */}
        {scenes.length === 0 ? (
          <EmptyState
            icon={Clapperboard}
            title="Nenhum roteiro analisado"
            description="Cole um roteiro e o Naninne identifica as cenas-chave, escreve descrição cinematográfica, e gera prompts Midjourney prontos pra copiar e colar no gerador de imagem."
          />
        ) : (
          <div>
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              {scenes.length} {scenes.length === 1 ? "cena" : "cenas"} salvas
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {scenes.map((scene) => (
                <Card key={scene.id} className="overflow-hidden">
                  <CardContent className="p-0">
                    {/* Header */}
                    <div className="p-4 pb-3 border-b border-border">
                      <div className="flex items-start gap-2 mb-2">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-av-100 text-av-700 text-xs font-semibold">
                          {scene.scene_number}
                        </span>
                        <h3 className="text-sm font-semibold leading-tight flex-1">{scene.title}</h3>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-3">
                        {scene.cinematic_description}
                      </p>
                      {scene.composition && (
                        <p className="text-caption text-muted-foreground mt-2 italic">
                          🎥 {scene.composition}
                        </p>
                      )}
                      {scene.tags && scene.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {scene.tags.map((t) => (
                            <Badge key={t} variant="neutral" size="sm">
                              {t}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Midjourney prompt */}
                    <div className="bg-muted/30 p-3 border-b border-border">
                      <div className="flex items-center gap-1 mb-1.5">
                        <ImageIcon className="h-3 w-3 text-muted-foreground" />
                        <span className="text-caption font-medium text-muted-foreground">Prompt Midjourney</span>
                      </div>
                      <code className="text-caption text-foreground/80 font-mono break-all block max-h-20 overflow-y-auto">
                        {scene.midjourney_prompt}
                      </code>
                    </div>

                    {/* Actions */}
                    <div className="p-2 flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => copyPrompt(scene)}
                        className="flex-1 gap-1.5"
                      >
                        {copiedId === scene.id ? (
                          <>
                            <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                            Copiado!
                          </>
                        ) : (
                          <>
                            <Copy className="h-3.5 w-3.5" />
                            Copiar prompt
                          </>
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setEditingScene(scene)}
                        title="Editar"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setConfirmDeleteScene(scene)}
                        title="Deletar"
                        className="text-muted-foreground hover:text-red-600"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={!!confirmDeleteScene}
        onClose={() => setConfirmDeleteScene(null)}
        onConfirm={async () => { if (confirmDeleteScene) await handleDeleteScene(confirmDeleteScene); }}
        title="Deletar esta cena?"
        description={`A cena "${confirmDeleteScene?.title}" será removida permanentemente.`}
        confirmText="Sim, deletar"
        confirmPhrase={confirmDeleteScene?.title}
      />
    </div>
  );
}

function SceneEditor({ scene, onClose }: { scene: Scene; onClose: () => void }) {
  const toast = useToast();
  const [title, setTitle] = React.useState(scene.title);
  const [description, setDescription] = React.useState(scene.cinematic_description);
  const [composition, setComposition] = React.useState(scene.composition ?? "");
  const [midjourneyPrompt, setMidjourney] = React.useState(scene.midjourney_prompt);
  const [tagsStr, setTagsStr] = React.useState(scene.tags.join(", "));
  const [saving, setSaving] = React.useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      const tags = tagsStr.split(",").map((t) => t.trim()).filter(Boolean);
      const res = await fetch(`/api/audiovisual/scenes/${scene.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          cinematic_description: description,
          composition: composition || null,
          midjourney_prompt: midjourneyPrompt,
          tags,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Erro ao salvar");
      }
      onClose();
    } catch (err) {
      console.error(err);
{
        const errMsg = err instanceof Error ? err.message : "Erro";
        toast.error("Erro ao salvar cena", errMsg);
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="px-6 py-10 md:px-10 md:py-12">
      <div className="mx-auto max-w-3xl">
        <div className="flex items-center justify-between mb-6">
          <Button variant="ghost" size="sm" onClick={onClose}>
            ← Voltar
          </Button>
          <h1 className="text-h1 text-neutral-900">Editar cena {scene.scene_number}</h1>
        </div>
        <Card>
          <CardContent className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Título</label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Descrição cinematográfica</label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Composição</label>
              <Input value={composition} onChange={(e) => setComposition(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Prompt Midjourney</label>
              <Textarea value={midjourneyPrompt} onChange={(e) => setMidjourney(e.target.value)} rows={3} className="font-mono text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Tags (vírgula)</label>
              <Input value={tagsStr} onChange={(e) => setTagsStr(e.target.value)} />
            </div>
            <Button onClick={handleSave} disabled={saving} className="w-full gap-1.5">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Salvar alterações
            </Button>
            
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
