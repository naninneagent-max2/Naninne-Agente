# Sprint 0 — Entregável: Frontend Naninne

> **Status:** ✅ Concluído
> **Data:** 2026-07-06
> **Sprint:** 0 (Fundação visual)
> **Próximo:** Sprint 1 (Biblioteca funcional + Memória)

## 🚀 Como rodar

```bash
cd /workspace/web

# 1. Instalar dependências (já instaladas no sandbox)
npm install

# 2. (Opcional) Configurar variáveis de ambiente
cp .env.example .env.local

# 3. Dev server
npm run dev
# → http://localhost:3000

# 4. Build de produção
npm run build
npm run start
```

### Scripts disponíveis

| Script | O que faz |
| --- | --- |
| `npm run dev` | Inicia o dev server com HMR |
| `npm run build` | Gera o bundle de produção (passou: 12 páginas estáticas) |
| `npm run start` | Serve o bundle de produção |
| `npm run lint` | Roda ESLint (Next.js + TypeScript) |
| `npm run format` | Roda Prettier com plugin Tailwind |

## ✅ Verificação de build

```
✓ Compiled successfully
✓ Generating static pages (12/12)
Route (app)                              Size     First Load JS
┌ ○ /                                    5.81 kB         160 kB
├ ○ /audiovisual                         5.63 kB         160 kB
├ ○ /biblioteca                          6.3 kB          160 kB
├ ○ /configuracoes                       138 B           157 kB
├ ○ /documentos                          137 B           157 kB
├ ○ /escrita                             5.36 kB         159 kB
├ ○ /gestao                              137 B           157 kB
├ ○ /memoria                             137 B           157 kB
└ ○ /mercado                             137 B           157 kB
```

**Dev server smoke test:** todas as 9 rotas retornaram HTTP 200 com conteúdo renderizado (verificado via `curl`).

## 📄 Páginas criadas

| Rota | Arquivo | Tipo | Notas |
| --- | --- | --- | --- |
| `/` (Início) | `src/app/page.tsx` + `_components/InicioContent.tsx` | Rica | Hero "O que você quer fazer hoje?", 6 quick actions, 3 cards "Continuar de onde parou" |
| `/biblioteca` | `src/app/biblioteca/page.tsx` + `_components/BibliotecaContent.tsx` | Rica | Search bar, 8 chips de tipo (PDF/Doc/Áudio/Imagem/Vídeo/Texto/Web), 20 cards de exemplo realistas |
| `/escrita` | `src/app/escrita/page.tsx` + `_components/EscritaContent.tsx` | Rica | Tabs (Projeto/Capítulos/Anotações/Estilo/Exportar), 8 capítulos, preview à direita |
| `/audiovisual` | `src/app/audiovisual/page.tsx` + `_components/AudiovisualContent.tsx` | Rica | Tabs (Roteiro/Cenas/Moodboard/Prompts/Exportar), 6 cards de cena cinematográficas |
| `/mercado` | `src/app/mercado/page.tsx` | Placeholder | "Em construção — Sprint 4" + 5 features previstas |
| `/documentos` | `src/app/documentos/page.tsx` | Placeholder | "Em construção — Sprint 1" + 5 features previstas |
| `/memoria` | `src/app/memoria/page.tsx` | Placeholder | "Em construção — Sprint 1" + 5 features previstas |
| `/gestao` | `src/app/gestao/page.tsx` | Placeholder | "Em construção — Sprint 2" + 5 features previstas |
| `/configuracoes` | `src/app/configuracoes/page.tsx` | Placeholder | "Em construção — Sprint 1" + 5 features previstas |

## 🧩 Componentes criados

### Layout (5)

| Componente | Caminho | Responsabilidade |
| --- | --- | --- |
| `AppShell` | `src/components/layout/AppShell.tsx` | Wrapper 3-painel, gerencia drawer mobile |
| `TopBar` | `src/components/layout/TopBar.tsx` | 64px, logo Naninne, busca (disabled), avatar dropdown, settings, theme toggle |
| `Sidebar` | `src/components/layout/Sidebar.tsx` | 240px, 9 itens de nav, UsageCard no rodapé, cores por projeto no active state |
| `RightPanel` | `src/components/layout/RightPanel.tsx` | 320px, "Painel da IA" com 4 cards de progresso + memória + custo |
| `MobileBottomNav` | `src/components/layout/MobileBottomNav.tsx` | 4 ícones (Chat/Biblioteca/Criar/Atividade) para <768px |

### UI primitives (13 — shadcn/ui style)

| Componente | Caminho |
| --- | --- |
| `Button` | `src/components/ui/button.tsx` (5 variants × 4 sizes) |
| `Card` (+ Header/Title/Description/Content/Footer) | `src/components/ui/card.tsx` (4 variants) |
| `Input` | `src/components/ui/input.tsx` |
| `Textarea` | `src/components/ui/textarea.tsx` |
| `Badge` | `src/components/ui/badge.tsx` (10 variants × 2 sizes) |
| `Avatar` (+ Image/Fallback) | `src/components/ui/avatar.tsx` (com hash de cor determinístico) |
| `Separator` | `src/components/ui/separator.tsx` |
| `Skeleton` | `src/components/ui/skeleton.tsx` (shimmer animado) |
| `Tooltip` (+ Trigger/Content/Provider) | `src/components/ui/tooltip.tsx` |
| `ScrollArea` (+ Bar) | `src/components/ui/scroll-area.tsx` |
| `Sheet` (+ Trigger/Close/Content/Header/Title) | `src/components/ui/sheet.tsx` |
| `DropdownMenu` | `src/components/ui/dropdown-menu.tsx` |
| `Toast` (Toaster) | `src/components/ui/toast.tsx` (Sonner) |
| `PagePlaceholder` | `src/components/ui/page-placeholder.tsx` |

### Providers e utilitários

| Arquivo | Responsabilidade |
| --- | --- |
| `src/components/providers.tsx` | Theme + Tooltip + Toaster root providers |
| `src/lib/utils.ts` | `cn()` (Tailwind merge), `hashToHsl()`, `formatShortDate()` |
| `src/lib/nav.ts` | 9 itens de navegação + classes de active state por projeto |
| `src/lib/supabase/client.ts` | Browser Supabase client (anon key) |
| `src/lib/supabase/server.ts` | Server Supabase client (cookies, RLS) |
| `src/lib/supabase/admin.ts` | Admin client (service role, server-only) |

## 🎨 Tokens aplicados

**Fonte canônica:** `/workspace/docs/design-system.md` (v1.0).

Todos os tokens vivem em `src/app/globals.css` (CSS variables) e `tailwind.config.ts` (mapeamento para utilitários). Nenhum valor foi hardcoded.

### Cores (10 paletas)

| Token CSS | Hex | Uso |
| --- | --- | --- |
| `--primary-{50..900}` | `#EEF0FE` → `#1E205E` | Índigo canônico (#5B5FE9) |
| `--neutral-{0..900}` | `#FFFFFF` → `#14130F` | Escala off-white quente |
| `--dark-{50..700}` | `#0F1014` → `#FFFFFF` | Modo escuro (re-curado) |
| `--success/-bg/-border/-text` | `#10B981` + light/dark variants | Operações concluídas |
| `--warning/-bg/-border/-text` | `#F59E0B` + variants | Alertas |
| `--error/-bg/-border/-text` | `#EF4444` + variants | Erros |
| `--info/-bg/-border/-text` | `#3B82F6` + variants | Informativo |
| `--writing-{100..900}` | `#DBEAFE` → `#1E3A8A` | Projeto Escrita (azul) |
| `--av-{100..900}` | `#FFEDD5` → `#7C2D12` | Projeto Audiovisual (laranja) |
| `--mkt-{100..900}` | `#D1FAE5` → `#064E3B` | Projeto Mercado (verde) |
| `--tech-{100..900}` | `#F1F5F9` → `#0F172A` | Projeto Tech (cinza-azulado) |

### Tipografia (Inter)

Escala major-second (1.125x), 8 níveis via `fontSize` no Tailwind:

- `display` (40px / 700 / -0.02em) — hero da Início
- `h1` (32px / 700), `h2` (24px / 600), `h3` (20px / 600), `h4` (17px / 600)
- `body-lg` (17px / 400), `body` (15px / 400 / line-height 1.55), `body-sm` (13px / 400)
- `caption` (12px / 500 / +0.01em)

### Espaçamento (escala 4px)

`space-1` (4), `space-2` (8), `space-3` (12), `space-4` (16), `space-6` (24), `space-8` (32), `space-12` (48), `space-16` (64), `space-24` (96). Acessível como `p-4`, `mt-6`, `space-y-8`, etc.

### Border radius

`radius-sm` (4px) — tags; `radius-md` (8px) — botões/inputs; `radius-lg` (12px) — cards; `radius-full` (9999px) — avatares/pills.

### Sombras (5 elevações)

`elevation-1` a `elevation-5` com `rgba(15, 16, 20, X)` (cinza-quase-preto, levemente azulado — nunca preto puro).

### Durações e easings

`duration-fast` (100ms), `duration-base` (200ms), `duration-slow` (300ms), `duration-slower` (500ms). Easing `ease-out` (entradas), `ease-in` (saídas), `ease-in-out` (trocas de estado).

### Layout dimensions

`--topbar-h` 64px, `--sidebar-w` 240px, `--right-w` 320px.

### Z-index scale

`z-base` 0, `z-elevated` 10, `z-dropdown` 1000, `z-sticky` 1100, `z-overlay` 1300, `z-modal` 1400, `z-toast` 1500, `z-tooltip` 1600.

## 📐 Responsividade

| Breakpoint | Sidebar | RightPanel | Extras |
| --- | --- | --- | --- |
| `< 768px` (mobile) | Drawer (☰ no TopBar) | Oculto | `MobileBottomNav` 64px |
| `768-1024px` (tablet) | Drawer (☰ no TopBar) | Oculto | — |
| `1024-1280px` (notebook) | Fixa 240px | Oculto | — |
| `≥ 1280px` (desktop) | Fixa 240px | Fixa 320px | — |

Implementado em `src/components/layout/AppShell.tsx` com `Sheet` (drawer) e breakpoints Tailwind padrão (`md`, `lg`, `xl`).

## 🔌 Dependências instaladas

### Em uso nesta sprint

- `next@15.1.6`, `react@19`, `react-dom@19`
- `typescript@5.7`, `tailwindcss@3.4`, `postcss`, `autoprefixer`
- `lucide-react@0.475` (ícones)
- `framer-motion@12` (animações)
- `next-themes@0.4` (modo dark)
- `sonner@2` (toasts)
- `@radix-ui/react-{avatar, dialog, dropdown-menu, scroll-area, separator, slot, toast, tooltip}`
- `class-variance-authority`, `clsx`, `tailwind-merge`, `tailwindcss-animate`

### Instaladas, integração na Sprint 1+

- `@tiptap/react`, `@tiptap/starter-kit`, `@tiptap/extension-placeholder` — editor rich-text para `/escrita`
- `@supabase/supabase-js`, `@supabase/ssr` — clientes prontos em `src/lib/supabase/`, mas sem chamadas reais
- `zustand` — state management global (Sprint 1)
- `date-fns` — datas

## ⏭ Limitações conhecidas (o que NÃO está implementado)

Por design (escopo do Sprint 0 = fundação, sem lógica):

- ❌ **Chat funcional** — input aceita texto, botão "Enviar" desabilitado se vazio, mas sem chamada a backend
- ❌ **Upload de arquivos** — botão "Enviar arquivos" desabilitado em /biblioteca
- ❌ **Busca semântica** — busca da Biblioteca só filtra localmente por substring (nome/tag)
- ❌ **Editor TipTap** — instalado, mas ainda não montado (apenas placeholder "em construção" no preview de /escrita)
- ❌ **Integração Supabase real** — clientes prontos, zero queries
- ❌ **Autenticação** — não há login; avatar dropdown é apenas UI
- ❌ **Painel da IA em tempo real** — 4 cards estáticos; virará SSE/WebSocket na Sprint 1
- ❌ **Detalhes técnicos do RightPanel** — botão "Ver detalhes" desabilitado
- ❌ **Notificações** — ícone de sino desabilitado

## 🎯 Próximo passo — Sprint 1

Foco: **Biblioteca funcional + Memória**.

1. **Biblioteca** (`/biblioteca`)
   - Conectar à Supabase Storage + pgvector
   - Upload real de arquivos (drag-anywhere, multi-arquivo)
   - Ingestão: extração de texto (PDF/DOCX), OCR de imagens, transcrição de áudio
   - Embeddings (text-embedding-3-small da OpenAI) e indexação vetorial
   - Busca semântica real (similaridade coseno)

2. **Memória** (`/memoria`)
   - Integrar Mem0
   - Timeline de memórias (data, origem, projeto)
   - Editor inline (criar, editar, apagar)
   - Marcadores manuais de preferência

3. **Chat funcional** (`/`)
   - Input → LangGraph orchestrator (NEXT_PUBLIC_API_URL)
   - Streaming de progresso (SSE) atualizando o RightPanel em tempo real
   - Exibição de fontes citadas nas respostas

4. **Editor TipTap** (`/escrita`)
   - Montar o editor com placeholder extension
   - Auto-save (debounced) para Supabase
   - Modo foco

5. **Configurações** (`/configuracoes`)
   - Tela de chaves de API
   - Toggle de modelos preferidos por tipo de tarefa

---

*"Sprint 0: a casa está de pé, mobiliada e iluminada. Falta ligar a água e a energia."*
