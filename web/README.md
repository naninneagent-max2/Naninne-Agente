# Naninne — Frontend (Sprint 0)

> **Sprint 0 — Fundação visual.** Apenas estrutura, tokens e layout. Lógica de negócio, chat funcional, upload e busca semântica virão nas próximas sprints.

Este é o frontend do **Naninne**, construído com Next.js 15 + shadcn/ui + Tailwind CSS, seguindo rigorosamente o [`Design System v1.0`](../docs/design-system.md) e a estrutura de UI definida na seção 4 do [`Documento Mestre`](../docs/naninne-master-doc.md).

## 🚀 Como rodar

```bash
# 1. Instalar dependências
npm install

# 2. Configurar variáveis de ambiente (opcional em Sprint 0)
cp .env.example .env.local
# edite .env.local se quiser apontar para Supabase/backend reais

# 3. Dev server
npm run dev
# → http://localhost:3000

# 4. Build de produção
npm run build
npm run start
```

### Comandos úteis

| Comando | O que faz |
| --- | --- |
| `npm run dev` | Inicia o dev server com HMR |
| `npm run build` | Gera o bundle de produção |
| `npm run start` | Serve o bundle de produção |
| `npm run lint` | Roda ESLint |
| `npm run format` | Roda Prettier em todo o código |

## 📁 Estrutura

```
web/
├── src/
│   ├── app/                    # Next.js App Router (rotas)
│   │   ├── layout.tsx          # Layout raiz (Providers + AppShell)
│   │   ├── page.tsx            # /
│   │   ├── biblioteca/         # /biblioteca
│   │   ├── escrita/            # /escrita
│   │   ├── audiovisual/        # /audiovisual
│   │   ├── mercado/            # /mercado
│   │   ├── documentos/         # /documentos
│   │   ├── memoria/            # /memoria
│   │   ├── gestao/             # /gestao
│   │   ├── configuracoes/      # /configuracoes
│   │   └── globals.css         # Tokens do Design System
│   ├── components/
│   │   ├── layout/             # AppShell, TopBar, Sidebar, RightPanel, MobileBottomNav
│   │   ├── ui/                 # shadcn/ui primitives (Button, Card, Input…)
│   │   └── providers.tsx       # Theme + Tooltip + Toaster
│   ├── data/                   # Mock data realista (biblioteca, quick actions)
│   ├── lib/
│   │   ├── nav.ts              # Configuração dos 9 itens da sidebar
│   │   ├── supabase/           # Clientes Supabase (browser, server, admin)
│   │   └── utils.ts            # cn(), hashToHsl(), formatShortDate()
│   └── types/                  # (reservado para tipos compartilhados)
├── public/                     # Assets estáticos
├── tailwind.config.ts          # Tokens do DS mapeados para Tailwind
├── next.config.ts
├── tsconfig.json
├── .env.example                # Variáveis de ambiente documentadas
└── package.json
```

## 🎨 Design System

Todos os tokens visuais estão em [`src/app/globals.css`](src/app/globals.css) (CSS variables) e [`tailwind.config.ts`](tailwind.config.ts) (mapeamento para utilitários Tailwind). A fonte canônica é [`docs/design-system.md`](../docs/design-system.md).

**Como usar cores:**

```tsx
// ❌ Errado — hardcoded
<div className="bg-[#5B5FE9]">...</div>

// ✅ Certo — via token
<div className="bg-primary-500">...</div>
<div className="text-writing-700">...</div>
<div className="border-neutral-200">...</div>
```

**Como usar espaçamento (escala 4px):**

```tsx
<div className="p-4">       {/* 16px */}
<div className="space-y-6">  {/* 24px entre filhos */}
<div className="mt-12">      {/* 48px */}
```

**Tipografia:**

```tsx
<h1 className="text-h1">Título de página</h1>
<h2 className="text-h2">Seção</h2>
<p className="text-body">Parágrafo padrão (15px / 1.55 line-height)</p>
<span className="text-caption">Caption / timestamp (12px)</span>
```

## 🧩 Componentes principais

### `AppShell` — o layout 3-painéis

```
┌──────────────────────────────────────────────────────────┐
│  TopBar (64px)                                            │
├──────────────┬─────────────────────────┬─────────────────┤
│              │                         │                 │
│  Sidebar     │  Main content           │  RightPanel     │
│  (240px)     │  (1fr)                  │  (320px)        │
│              │                         │                 │
└──────────────┴─────────────────────────┴─────────────────┘
```

Comportamento responsivo (definido em `AppShell.tsx`):

| Breakpoint | Sidebar | RightPanel | Extras |
| --- | --- | --- | --- |
| `< 1024px` (mobile/tablet) | Drawer via ☰ | Oculto | BottomNav (4 ícones) |
| `1024-1280px` (notebook) | Fixa 240px | Oculto | — |
| `≥ 1280px` (desktop) | Fixa 240px | Fixa 320px | — |

### Sidebar — 9 itens

Os 9 itens de navegação vivem em [`src/lib/nav.ts`](src/lib/nav.ts) com ícone, href, e paleta de projeto. O item ativo ganha a cor de projeto (Escrita = azul, Audiovisual = laranja, etc.).

### RightPanel — "Painel da IA"

4 cards de progresso padrão (per master-doc §4):

1. ✓ Pedido entendido
2. ✓ Biblioteca consultada
3. ✓ 4 arquivos encontrados
4. ⏳ Compor resposta final (com spinner animado)

+ Memória usada + custo estimado. Tudo estático por enquanto.

## 🛠 Stack técnica

| Camada | Tecnologia |
| --- | --- |
| Framework | Next.js 15.1 (App Router, React 19) |
| Linguagem | TypeScript 5.7 (strict mode) |
| Estilização | Tailwind CSS 3.4 + CSS variables |
| Componentes | shadcn/ui (Radix UI primitives) |
| Ícones | lucide-react |
| Animações | framer-motion 12 |
| Tema | next-themes (light/dark/system) |
| Toasts | sonner |
| Formulários | react-hook-form (instalado para Sprint 1) |
| Editor (Sprint 1) | @tiptap/react + extensions |
| Backend (Sprint 1) | @supabase/supabase-js + @supabase/ssr |
| State (Sprint 1) | zustand |
| Datas | date-fns |

## 📦 Dependências instaladas mas ainda não usadas

Estas dependências foram instaladas seguindo as instruções do Sprint 0, mas a integração real acontece nas próximas sprints:

- `@tiptap/react` + `starter-kit` + `extension-placeholder` — editor rich-text (Sprint 1, em `/escrita`)
- `@supabase/supabase-js` + `@supabase/ssr` — clientes Supabase configurados em `src/lib/supabase/`, mas nenhuma chamada real (Sprint 1)
- `zustand` — store global (Sprint 1)
- `framer-motion` — animações já em uso nos cards da Início e da Biblioteca; mais por vir

## ✅ O que está implementado (Sprint 0)

- [x] Next.js 15 + TypeScript strict + Tailwind 3
- [x] Design System completo: 50+ tokens (cores, espaçamento, tipografia, sombras, durações) em CSS variables
- [x] shadcn/ui com 12+ primitivos: Button, Card, Input, Textarea, Badge, Avatar, Separator, Skeleton, Tooltip, ScrollArea, Sheet, DropdownMenu, Toast
- [x] Layout 3-painéis responsivo (AppShell, TopBar, Sidebar, RightPanel, MobileBottomNav)
- [x] Modo escuro via `next-themes` (toggle no TopBar)
- [x] 9 páginas com layout correto
- [x] Páginas ricas em conteúdo mockup: Início, Biblioteca, Escrita, Audiovisual
- [x] 5 páginas stub (Mercado, Documentos, Memória, Gestão, Configurações) com placeholder elegante
- [x] Dados placeholder realistas (20 itens de biblioteca, 6 quick actions, 8 capítulos, 6 cenas) — sem Lorem ipsum
- [x] Animações sutis com framer-motion (entrada de cards, hover, transições de tab)
- [x] Acessibilidade: aria-labels, focus-visible, skip-link, role="navigation", prefers-reduced-motion

## ⏭ O que NÃO está implementado (Sprint 0)

Isto é o que vem nas próximas sprints:

- ❌ **Chat funcional** — o input aceita texto, mas não envia para nenhum backend
- ❌ **Upload de arquivos** — botão "Enviar arquivos" está desabilitado
- ❌ **Busca semântica** — input da Biblioteca só filtra localmente por substring
- ❌ **Editor TipTap** — instalado mas não montado
- ❌ **Integração Supabase** — clientes configurados, mas sem queries reais
- ❌ **Autenticação** — não há login ainda
- ❌ **Painel da IA em tempo real** — o progresso é estático; virará SSE/WebSocket na Sprint 1

## 📚 Referências canônicas

- [Documento Mestre v1.0](../docs/naninne-master-doc.md) — seção 4 é a principal
- [Design System v1.0](../docs/design-system.md) — tokens, componentes, acessibilidade
- [Mockups de alta fidelidade](../mockups/) — 5 HTMLs de referência visual

## 📄 Licença

Proprietary — © 2026 Naninne. Todos os direitos reservados.
