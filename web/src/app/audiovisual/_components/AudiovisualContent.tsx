"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Film, Camera, Image as ImageIcon, Plus, Sparkles, Download } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Audiovisual — "Estúdio" tab.
 * Per mockup 03-estudio.html: Tabs (Roteiro / Cenas / Moodboard / Prompts / Exportar) +
 * grid 3 columns of scene cards.
 */

const TABS = [
  { id: "roteiro", label: "Roteiro" },
  { id: "cenas", label: "Cenas" },
  { id: "moodboard", label: "Moodboard" },
  { id: "prompts", label: "Prompts Midjourney" },
  { id: "exportar", label: "Exportar" },
] as const;

const SCENES = [
  {
    id: "s01",
    num: "01",
    title: "A casa vazia",
    desc: "Interior noturno. Maria entra pela porta dos fundos e acende a luz da sala. Encontra a mesa posta para duas pessoas, mas está sozinha. Câmera fixa no rosto dela.",
    lens: "50mm · f/1.8",
    palette: "azul-noite, âmbar, branco-sujo",
    mood: "Melancolia contida",
  },
  {
    id: "s02",
    num: "02",
    title: "O corredor das memórias",
    desc: "Travelling lento por um corredor estreito, paredes cobertas de fotos em preto-e-branco. A voz da avó (off) começa a falar. Maria para diante de uma foto específica.",
    lens: "35mm · anamórfico",
    palette: "cinza-frio, sépia, preto profundo",
    mood: "Suspense nostálgico",
  },
  {
    id: "s03",
    num: "03",
    title: "O baú e a chave",
    desc: "Close nas mãos de Maria abrindo um baú antigo. A chave cai no chão. Som: rangido de madeira velha + silêncio súbito.",
    lens: "85mm · macro",
    palette: "madeira, dourado-tênue, sombra",
    mood: "Mistério revelador",
  },
  {
    id: "s04",
    num: "04",
    title: "A fotografia que não se apaga",
    desc: "Plano detalhe: fotografia amarelada mostra 4 pessoas, mas uma das figuras aparece borrada. A mão de Maria toca a foto. Corte para o reflexo dela no vidro: a figura borrada aparece nítida.",
    lens: "100mm · tilt-shift",
    palette: "sépia, branco-queimado, vermelho-oculto",
    mood: "Sobrenatural sutil",
  },
  {
    id: "s05",
    num: "05",
    title: "A primeira lembrança",
    desc: "Flashback diurno, luz dourada. Maria criança correndo pelo corredor da Casa de Memória. Câmera a acompanha em plano-sequência de 90 segundos.",
    lens: "24mm · steadicam",
    palette: "dourado, verde, bege-ensolarado",
    mood: "Calma antes da tempestade",
  },
  {
    id: "s06",
    num: "06",
    title: "O regresso",
    desc: "Maria de costas para a câmera, parada na porta da Casa. Vira-se lentamente. Seu rosto está mais velho do que na cena 01. Plano aberto mostra a casa inteira atrás dela.",
    lens: "40mm · f/2.8",
    palette: "azul-cinza, branco-pálido, sombra-azulada",
    mood: "Resolução silenciosa",
  },
] as const;

export function AudiovisualContent() {
  const [activeTab, setActiveTab] = React.useState<(typeof TABS)[number]["id"]>("cenas");

  return (
    <div className="px-6 py-10 pb-24 md:px-10 md:py-12">
      <div className="mx-auto max-w-[1100px]">
        {/* Header */}
        <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="mb-1 flex items-center gap-2">
              <Badge className="border-0 bg-av-100 text-av-700" size="sm">
                <Film className="mr-1 h-3 w-3" />
                Projeto audiovisual
              </Badge>
            </div>
            <h1 className="text-h1 text-neutral-900">O INVISÍVEL</h1>
            <p className="mt-1 text-body text-neutral-600">
              Curta-metragem · noir psicológico · 12 cenas · 18 min
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" disabled className="gap-1.5">
              <Sparkles className="h-4 w-4" />
              Gerar variações
            </Button>
            <Button disabled className="gap-1.5">
              <Download className="h-4 w-4" />
              Exportar
            </Button>
          </div>
        </header>

        {/* Tabs */}
        <div
          role="tablist"
          aria-label="Seções do projeto"
          className="mb-6 flex items-center gap-1 overflow-x-auto border-b border-neutral-200"
        >
          {TABS.map((t) => {
            const active = activeTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                role="tab"
                aria-selected={active}
                className={cn(
                  "relative shrink-0 px-3 py-2.5 text-body-sm font-medium transition-colors",
                  active ? "text-av-700" : "text-neutral-600 hover:text-neutral-900"
                )}
              >
                {t.label}
                {active && (
                  <motion.span
                    layoutId="av-tab-underline"
                    className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-av-500"
                    transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* Body */}
        {activeTab === "cenas" ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {SCENES.map((scene, i) => (
              <SceneCard key={scene.id} scene={scene} index={i} />
            ))}
            <AddSceneCard />
          </div>
        ) : (
          <PlaceholderTab name={TABS.find((t) => t.id === activeTab)?.label ?? ""} />
        )}
      </div>
    </div>
  );
}

function SceneCard({
  scene,
  index,
}: {
  scene: (typeof SCENES)[number];
  index: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: Math.min(index * 0.04, 0.3) }}
    >
      <Card variant="hover-elevate" className="flex h-full flex-col">
        {/* Thumbnail placeholder */}
        <div className="relative h-36 overflow-hidden rounded-t-lg bg-gradient-to-br from-av-100 to-neutral-200">
          <div className="absolute inset-0 flex items-center justify-center text-av-300">
            <ImageIcon className="h-10 w-10" aria-hidden="true" />
          </div>
          <div className="absolute left-3 top-3 flex items-center gap-1.5">
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-white/90 text-caption font-bold text-av-700 shadow-elevation-1">
              {scene.num}
            </span>
          </div>
          <div className="absolute right-3 top-3">
            <Badge className="border-0 bg-white/90 text-caption text-av-700">
              {scene.lens}
            </Badge>
          </div>
        </div>

        <CardContent className="flex flex-1 flex-col gap-3 p-4">
          <div>
            <h3 className="text-h4 font-semibold text-neutral-900">{scene.title}</h3>
            <p className="mt-1 text-body-sm text-neutral-600">{scene.desc}</p>
          </div>
          <div className="mt-auto flex flex-wrap items-center gap-1.5 border-t border-neutral-100 pt-3">
            <Badge className="border-0 bg-av-100 text-av-700" size="sm">
              {scene.mood}
            </Badge>
            <Badge variant="neutral" size="sm">
              {scene.palette}
            </Badge>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function AddSceneCard() {
  return (
    <button
      disabled
      className="flex h-full min-h-[280px] flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-neutral-200 bg-neutral-50 text-neutral-500 transition-colors hover:border-av-300 hover:bg-av-50 hover:text-av-700 disabled:cursor-not-allowed"
    >
      <Plus className="h-6 w-6" aria-hidden="true" />
      <span className="text-body-sm font-medium">Adicionar cena</span>
      <span className="text-caption">Em breve</span>
    </button>
  );
}

function PlaceholderTab({ name }: { name: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-neutral-200 bg-neutral-50 py-20 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-av-50 text-av-500">
        <Camera className="h-6 w-6" />
      </div>
      <h3 className="text-h4 font-semibold text-neutral-900">{name}</h3>
      <p className="mt-1 max-w-sm text-body-sm text-neutral-600">
        Em breve: edição visual integrada com prompts Midjourney prontos para copiar.
      </p>
    </div>
  );
}
