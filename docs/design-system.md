# 🎨 Design System do Naninne

**Versão:** 1.0
**Data:** Julho de 2026
**Status:** Pronto para revisão de Robert (PO) e implementação na Fase 4
**Autor:** Mavis (Designer de Sistema)
**Fonte canônica:** `naninne-master-doc.md` seção 4 (Interface e Experiência do Usuário)

> *"Minimalismo moderno, como Perplexity + Linear. Confortável. Honesto. Sem barulho."*

---

## 📑 Sumário

1. [Visão e princípios](#1-visão-e-princípios)
2. [Tokens de cor](#2-tokens-de-cor)
3. [Tipografia](#3-tipografia)
4. [Espaçamento e layout](#4-espaçamento-e-layout)
5. [Border radius](#5-border-radius)
6. [Sombras (elevação)](#6-sombras-elevação)
7. [Animações](#7-animações)
8. [Breakpoints e z-index](#8-breakpoints-e-z-index)
9. [Iconografia](#9-iconografia)
10. [Componentes primitivos](#10-componentes-primitivos)
11. [Princípios de uso e acessibilidade](#11-princípios-de-uso-e-acessibilidade)
12. [Apêndice — referências e glossário](#12-apêndice--referências-e-glossário)

---

<a name="1-visão-e-princípios"></a>
## 1. 🧭 Visão e princípios

### Filosofia visual

Naninne deve parecer **um lugar calmo onde uma equipe trabalha para você**. O design precisa passar três sensações:

1. **Clareza acima de tudo** — o usuário sempre entende o que está acontecendo (quais agentes agem, em que pé está o trabalho, qual o próximo passo).
2. **Calma produtiva** — nada grita, nada pisca, nada compete por atenção. Tipografia e respiro fazem o trabalho pesado.
3. **Profundidade discreta** — sombras suaves, camadas sutis, separações por hierarquia e não por linhas duras.

### Os 7 princípios do Naninne DS

| # | Princípio | Em uma frase |
|---|---|---|
| 1 | **Conteúdo primeiro** | Componentes nunca competem com o conteúdo — eles somem para o texto brilhar. |
| 2 | **Hierarquia por tipografia** | Diferenças de tamanho, peso e cor bastam para guiar o olho. |
| 3 | **Espaço é luxo** | Density confortável. Componentes respiram. Nada fica colado. |
| 4 | **Cor é funcional, não decorativa** | Cor significa algo (status, projeto, ação) — nunca enfeite. |
| 5 | **Movimento é resposta** | Animações de 200ms confirmam que algo aconteceu. Nunca enfeitam. |
| 6 | **Acessibilidade é padrão** | Foco visível, contraste AA, aria-labels — não são opcionais. |
| 7 | **Consistência sobre criatividade** | Componentes seguem as regras, mesmo quando seria "fofo" quebrar. |

### Referências (estilo)

- **Perplexity** — simplicidade conversacional, hero central, hierarquia tipográfica forte, ausência de ornamentos.
- **Linear** — densidade confortável, sombras quase imperceptíveis, motion preciso, sidebar com hierarquia clara.
- **shadcn/ui** — base de componentes neutros, customizáveis por tokens, foco em acessibilidade.

> **Naninne não é cópia de nenhum deles.** É a interseção: o **fluxo conversacional limpo do Perplexity**, a **densidade profissional do Linear**, e os **componentes neutros do shadcn/ui** — temperados com a cor primária índigo (#5B5FE9) e a paleta por projeto do mestre.

---

<a name="2-tokens-de-cor"></a>
## 2. 🎨 Tokens de cor

> **Nomenclatura:** todas as cores usam `--naninne-{papel}-{shade}` em CSS e `naninne.{papel}.{shade}` em JSON/JS, seguindo convenção do shadcn/ui. Para escala 50-900 usamos o padrão **Material/Tailwind** (50 = mais claro, 900 = mais escuro).

### 2.1 Paleta primária — Índigo

A cor primária `#5B5FE9` é o **ânimo do produto**. Usada em CTAs principais, links, foco, seleção e barras de progresso em curso. Nada mais deve "puxar" o olho no primeiro instante.

| Token | Hex | Uso principal |
|---|---|---|
| `--naninne-primary-50`  | `#EEF0FE` | Background de hover sutil, badges suaves |
| `--naninne-primary-100` | `#DCE0FD` | Background de botão "secondary" hover, áreas de destaque suave |
| `--naninne-primary-200` | `#B9C0FB` | Decorações, ícones decorativos, divisores com cor |
| `--naninne-primary-300` | `#96A1F8` | Estados hover em elementos primários |
| `--naninne-primary-400` | `#7381F4` | Variação de hover pressionado |
| `--naninne-primary-500` | `#5B5FE9` | **Cor primária canônica** — botões, links, foco |
| `--naninne-primary-600` | `#4A4ED4` | Hover de botão primário |
| `--naninne-primary-700` | `#3A3DAD` | Active/pressed de botão primário |
| `--naninne-primary-800` | `#2C2F86` | Texto sobre fundo claro com pouca saturação |
| `--naninne-primary-900` | `#1E205E` | Texto de marca, headings de destaque raro |

**Razão da escolha da primary-500 (#5B5FE9):** é o tom exato citado no doc mestre. Validado contra o contraste com off-white `#FAFAF7` (4.62:1, passa em texto normal AA) e com off-white puro `#FFFFFF` (4.51:1, AA).

### 2.2 Paleta neutra (off-white)

O fundo padrão **não é branco puro** — é **off-white quente** (`#FAFAF7`), que reduz fadiga visual e harmoniza com o índigo (frios combinam melhor com neutros levemente quentes).

| Token | Hex | Uso |
|---|---|---|
| `--naninne-neutral-0`   | `#FFFFFF` | Cards, modais (acima do fundo) |
| `--naninne-neutral-50`  | `#FAFAF7` | **Background padrão da página (off-white)** |
| `--naninne-neutral-100` | `#F4F3EF` | Background secundário (hover de linha, áreas de input) |
| `--naninne-neutral-200` | `#E8E6E0` | Bordas sutis, divisores |
| `--naninne-neutral-300` | `#D6D3CB` | Bordas de input, separadores visíveis |
| `--naninne-neutral-400` | `#A8A59C` | Texto desabilitado, ícones muted |
| `--naninne-neutral-500` | `#7C7970` | Texto de placeholder, captions |
| `--naninne-neutral-600` | `#56544D` | Texto secundário (legendas, metadados) |
| `--naninne-neutral-700` | `#3A3935` | Texto "body" padrão |
| `--naninne-neutral-800` | `#232220` | Headings de nível médio |
| `--naninne-neutral-900` | `#14130F` | Texto de máximo contraste (headings principais) |

**Regra de uso:** texto principal sempre `neutral-900` ou `neutral-800`. Nunca `neutral-700` para parágrafos longos (contraste pode cair).

### 2.3 Cores semânticas

Cores de **estado funcional**, independentes dos projetos. Cada uma tem fundo, borda, texto e ícone.

| Papel | Background | Borda | Texto / Ícone | Hex canônico |
|---|---|---|---|---|
| **Success** | `#ECFDF3` | `#ABEFC6` | `#067647` | `#10B981` (acento) |
| **Warning** | `#FFFAEB` | `#FEDF89` | `#B54708` | `#F59E0B` (acento) |
| **Error** | `#FEF3F2` | `#FECDCA` | `#B42318` | `#EF4444` (acento) |
| **Info** | `#EFF8FF` | `#B2DDFF` | `#175CD3` | `#3B82F6` (acento) |

**Quando usar:**
- `success` → operação concluída, arquivo processado, agente finalizou com sucesso
- `warning` → ação necessária antes de prosseguir, modelo retornou confiança média
- `error` → falha de operação, arquivo corrompido, validação falhou
- `info` → mensagem neutra informativa, dica, lembrete

**Cuidado:** sucesso e info **não são intercambiáveis**. Sucesso é "deu certo". Info é "olha isso, é útil saber".

### 2.4 Cores por projeto (paleta de identificação)

Estas cores **identificam projetos** na sidebar, em cards, em tags e em headers contextuais. Devem ser **harmônicas com o índigo primário** (análogas no círculo cromático, nunca complementares) e ter **suficiente contraste entre si** para Robert não confundir projetos na sidebar.

**Critério de seleção:**
1. Mesma luminância percebida (entre 55–65% L*) → nenhuma cor "grita" mais que as outras
2. Distância no círculo HSL ≥ 60° entre cores adjacentes → fácil de diferenciar
3. Tom **moderado** (saturação 55–70%) — combina com off-white sem cansar
4. Cada cor tem uma variação **600** para texto (contraste AA contra off-white)

| Projeto | Cor base (500) | Light (100) | Texto (700) | Hex canônico (500) |
|---|---|---|---|---|
| 🏠 **Naninne (primário)** | `--naninne-primary-500` | `--naninne-primary-100` | `--naninne-primary-700` | `#5B5FE9` |
| ✍️ **Escrita (azul)** | `--naninne-writing-500` | `--naninne-writing-100` | `--naninne-writing-700` | `#3B82F6` (azul céu) |
| 🎬 **Audiovisual (laranja)** | `--naninne-av-500` | `--naninne-av-100` | `--naninne-av-700` | `#F97316` (laranja quente) |
| 📊 **Mercado (verde)** | `--naninne-mkt-500` | `--naninne-mkt-100` | `--naninne-mkt-700` | `#10B981` (verde esmeralda) |
| 🛠️ **Tech (cinza-azulado)** | `--naninne-tech-500` | `--naninne-tech-100` | `--naninne-tech-700` | `#64748B` (slate) |

**Justificativa das escolhas:**

- **Escrita = `#3B82F6` (azul céu)**: associa-se universalmente a "leitura", "foco", "calma" e "tinta". Diferencia-se do índigo primário por ser mais claro e mais saturado — não compete, complementa como "irmão cromático".
- **Audiovisual = `#F97316` (laranja quente)**: remete a luz, lente, calor de tela, câmera. Tom escolhido em **laranja-cenoura** e não âmbar para ter brilho suficiente sem virar amarelo (que confundiria com warning).
- **Mercado = `#10B981` (verde esmeralda)**: dinheiro, crescimento, gráfico positivo. Verde **esmeralda**, não verde-limão, para não parecer warning nem "ok" genérico.
- **Tech = `#64748B` (slate/cinza-azulado)**: remete a terminal, aço, código. Suficientemente neutro para não competir, mas claramente frio. **Não** cinza puro (que some no fundo) — leve matiz azul para diferenciá-lo dos neutros.

**Variações completas (100, 300, 500, 700, 900):**

| Projeto | 100 | 300 | 500 | 700 | 900 |
|---|---|---|---|---|---|
| ✍️ Escrita | `#DBEAFE` | `#60A5FA` | `#3B82F6` | `#1D4ED8` | `#1E3A8A` |
| 🎬 Audiovisual | `#FFEDD5` | `#FDBA74` | `#F97316` | `#C2410C` | `#7C2D12` |
| 📊 Mercado | `#D1FAE5` | `#6EE7B7` | `#10B981` | `#047857` | `#064E3B` |
| 🛠️ Tech | `#F1F5F9` | `#CBD5E1` | `#64748B` | `#334155` | `#0F172A` |

**Quando usar cada cor de projeto:**

| Projeto | Domínio semântico | Onde a cor aparece |
|---|---|---|
| ✍️ Escrita | Livros, capítulos, ensaios, ficção, poesia | Sidebar item "Escrita Criativa", tag `#escrita`, header de documentos de livros, prompt-cursor de "estou escrevendo" |
| 🎬 Audiovisual | Roteiros, cenas, moodboards, prompts Midjourney | Sidebar item "Audiovisual", tag `#audiovisual`, cards de cena, header de projetos de filme |
| 📊 Mercado | Planilhas, apresentações, KPIs, pesquisas web | Sidebar item "Mercado", tag `#mercado`, gráficos, headers de relatórios |
| 🛠️ Tech | Código, GitHub, Supabase, logs | Sidebar item "Gestão Técnica", tag `#tech`, badges de agente "Devstral", cards de repositório |

**Regra de ouro:** **nunca** use a cor de um projeto para sinalizar **estado** (erro, sucesso, alerta). Estados usam as cores semânticas. Projetos usam sua paleta própria. As duas paletas **nunca se sobrepõem**.

### 2.5 Modo escuro (Dark Mode)

O modo escuro é **opcional mas bem acabado**. Não é uma simples inversão — é uma re-curadoria. A temperatura do fundo é levemente **azulada** (não preto puro), para combinar com o índigo e reduzir cansaço em ambientes escuros.

| Token Light | → | Token Dark | Hex Dark | Notas |
|---|---|---|---|---|
| `--naninne-neutral-0` (cards) | → | `--naninne-dark-100` | `#1A1B23` | Cards sobre fundo |
| `--naninne-neutral-50` (fundo) | → | `--naninne-dark-50` | `#0F1014` | **Fundo dark — preto-azulado, nunca #000** |
| `--naninne-neutral-100` (hover bg) | → | `--naninne-dark-200` | `#26272F` | Hover sobre cards |
| `--naninne-neutral-200` (bordas) | → | `--naninne-dark-300` | `#363740` | Bordas em dark |
| `--naninne-neutral-300` (input border) | → | `--naninne-dark-400` | `#4A4C57` | |
| `--naninne-neutral-400` (placeholder) | → | `--naninne-dark-400` | `#6B6E7A` | |
| `--naninne-neutral-500` (caption) | → | `--naninne-dark-500` | `#9A9DA8` | |
| `--naninne-neutral-600` (subtítulo) | → | `--naninne-dark-500` | `#BFC2CC` | |
| `--naninne-neutral-700` (body) | → | `--naninne-dark-600` | `#E0E2E8` | Texto principal dark |
| `--naninne-neutral-800` (heading) | → | `--naninne-dark-700` | `#F1F2F6` | |
| `--naninne-neutral-900` (max contrast) | → | `--naninne-dark-700` | `#FFFFFF` | Texto de máximo contraste |

**Cor primária no dark:** a primary-500 (`#5B5FE9`) **continua igual**, mas em dark passamos a usar mais a `primary-400` (`#7381F4`) para textos e ícones, e a `primary-500` para backgrounds e botões. Botões primários em dark mantêm fundo `primary-500` e texto `white`.

**Cores semânticas no dark:** todas têm versão dark com luminosidade calibrada. Exemplo do success:
- Light: bg `#ECFDF3`, texto `#067647`
- Dark: bg `#0D2A1F`, texto `#6CE9A6`

A regra: **em dark mode, todos os backgrounds de estado são "tintados" com a cor semântica em ~10% de saturação, e o texto é uma versão clara do acento.**

**Cores de projeto no dark:** as 500 ficam as mesmas, as 700 viram 300 (mais clara) para texto em fundo escuro.

**Toggle:** armazenado em `localStorage.naninne-theme` (`light` | `dark` | `system`). Default: `system` (segue `prefers-color-scheme`).

---

<a name="3-tipografia"></a>
## 3. 🔤 Tipografia

### Família

```css
font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
```

**Por que Inter (e não uma outra "moderna"):**
- Larguras de glifos balanceadas → texto longo fica confortável
- OpenType completo com frações, setas, ligaduras (útil para mostrar tokens, custos em $, URLs)
- Excelente render em telas Retina, antialiasing limpo em 12–14px
- Variável (`Inter Variable`) → economia de banda, todos os pesos num arquivo só
- Licença OFL — sem dor de cabeça com licenças proprietárias
- Padrão de **shadcn/ui**, **Vercel**, **Linear**, **Perplexity** — coerência com o stack

**Pesos carregados:** 400 (regular), 500 (medium), 600 (semibold), 700 (bold). Não carregar 300 ou 800 — não são usados.

**Recursos OpenType a habilitar:** `cv11`, `ss01` (estilo alternativo de "a" e "g") — para a versão final considerar.

### Escala tipográfica

A escala é **major-second** (1.125x entre níveis), com **display** e **caption** como casos especiais. Line-heights são apertadas em títulos e generosas em corpo.

| Nível | Tamanho (rem / px @16px) | Peso | Line-height | Letter-spacing | Uso |
|---|---|---|---|---|---|
| **display** | 2.5 rem / 40px | 700 | 1.1 / 44px | -0.02em | Hero da página Início (rara) |
| **h1** | 2.0 rem / 32px | 700 | 1.15 / 37px | -0.015em | Título de página |
| **h2** | 1.5 rem / 24px | 600 | 1.2 / 29px | -0.01em | Seção principal |
| **h3** | 1.25 rem / 20px | 600 | 1.3 / 26px | -0.005em | Subseção |
| **h4** | 1.0625 rem / 17px | 600 | 1.4 / 24px | 0 | Subtítulo de card |
| **body-lg** | 1.0625 rem / 17px | 400 | 1.5 / 26px | 0 | Texto de leitura longa, parágrafos importantes |
| **body** | 0.9375 rem / 15px | 400 | 1.55 / 23px | 0 | **Padrão de parágrafo** (denser que costume para parecer Linear) |
| **body-sm** | 0.8125 rem / 13px | 400 | 1.5 / 20px | 0 | Metadados, legendas em cards |
| **caption** | 0.75 rem / 12px | 500 | 1.4 / 17px | 0.01em | Timestamps, versões, "há 3 dias" |

**Por que body 15px e não 16px:** Linear usa 13–15px no corpo principal; Perplexity usa 15–16px. Em uma interface com 3 colunas e muita informação, 15px com `line-height: 1.55` maximiza densidade sem cansar. Em mobile, 15px ainda é confortável com 1.55 de respiro.

**Por que display 40px e não 48–56px:** telas com 3 colunas não precisam de hero gigante. Display só aparece em uma situação: o "O que você quer fazer hoje?" da Início. Deve ser grande, mas não dominar.

### Uso prático

```text
Página:    h1 (32px) — "Biblioteca" (título único)
Seção:     h2 (24px) — "Recentes"
Card:      h4 (17px) — título do item
Parágrafo: body (15px) — texto principal
Metadado:  body-sm (13px) — "Adicionado há 3 dias"
Timestamp: caption (12px) — "12:34"
```

**Sem itálico.** Inter tem versão italic mas o Naninne **não usa itálico** — em vez disso, usar **medium (500)** ou cor mais clara (neutral-500) para indicar ênfase. Exceção: citações de livros (Escrita) podem usar italic para marcar o tom de "excerto".

**Sem underline** exceto em links. Estados "carregado / hover" de links: cor muda para `primary-700`, **não** sublinhar.

---

<a name="4-espaçamento-e-layout"></a>
## 4. 📏 Espaçamento e layout

### Escala base (4px)

Todos os espaçamentos derivam de múltiplos de 4px. A escala é **estritamente numérica** — sem valores entre níveis (nada de "13px" ou "20px").

| Token | Valor (px) | Valor (rem) | Uso típico |
|---|---|---|---|
| `space-1`  | 4  | 0.25 | Padding interno de badge, gap de ícone-texto |
| `space-2`  | 8  | 0.5  | Gap de linha em listas densas |
| `space-3`  | 12 | 0.75 | Padding de botão pequeno, gap entre label e input |
| `space-4`  | 16 | 1.0  | **Padding padrão de botão/card**, gap entre seções pequenas |
| `space-6`  | 24 | 1.5  | Gap entre seções, padding de modal |
| `space-8`  | 32 | 2.0  | Padding de card grande, gap entre blocos |
| `space-12` | 48 | 3.0  | Separação de seções dentro de uma página |
| `space-16` | 64 | 4.0  | Separação de páginas (entre header e conteúdo) |
| `space-24` | 96 | 6.0  | Hero spacing (apenas na Início) |

**Por que essa escala (e não 4, 8, 16, 32, 64):** três valores intermediários (12, 24, 48) dão flexibilidade sem cair em 4/8/16/32 (que seria "linear" demais e deixaria o sistema rígido). É a mesma escala do Tailwind, do shadcn/ui e do Material 3 — coerente com a stack.

### Container max-widths

| Contexto | Largura | Justificativa |
|---|---|---|
| **Sidebar (esquerda)** | 240px (desktop) / 100% drawer (mobile) | 240px é o sweet spot para labels longos ("Gestão Técnica", "Audiovisual") sem truncar |
| **Painel da IA (direita)** | 320px (desktop) / oculto (mobile) | Suficiente para cards de progresso + texto de memória |
| **Conteúdo central (max)** | 1280px | Largura ideal de linha (~75–85 caracteres) com padding lateral de 32px |
| **Conteúdo central (mobile)** | 100% (padding 16px lateral) | |
| **Modal** | 560px (sm) / 720px (md) / 960px (lg) | Três tamanhos para três complexidades |
| **Toast** | 360px | Compacto, no canto |

**Gap entre colunas (3-painel desktop):** 0 (as colunas se encostam com bordas/divisores, não com gap). O background neutro-50 "respira" entre os painéis.

**Padding interno de página desktop:** 32px lateral no conteúdo central, 24px vertical.

---

<a name="5-border-radius"></a>
## 5. ⭕ Border radius

Quatro tamanhos. Simples. Memorizável.

| Token | Valor | Uso |
|---|---|---|
| `radius-sm`  | 4px  | Tags pequenas, badges, checkboxes, inputs |
| `radius-md`  | 8px  | **Padrão para botões, inputs, cards pequenos** |
| `radius-lg`  | 12px | **Padrão para cards, modais, dropdowns** |
| `radius-full`| 9999px | Avatares, pills de tag circulares, botões "full round" |

**Decisão de hierarquia:**
- `radius-sm` para elementos inline (texto, tags) — não distrai
- `radius-md` para controles interativos (botão, input) — convida ao toque
- `radius-lg` para superfícies (card, modal) — suaviza, mas não infantiliza
- `radius-full` só onde faz sentido geométrico (avatar, pill)

**Atenção:** **nunca misture** raio 4 e 12 no mesmo componente composto (ex: botão dentro de card — use 8 no botão se o card é 12). Inconsistência de raio destrói a sensação de polidez.

---

<a name="6-sombras-elevação"></a>
## 6. 🌫️ Sombras (elevação)

Cinco níveis de sombra, do mais sutil ao mais presente. Sombras do Naninne são **frias e difusas**, nunca pretas duras.

| Nível | Definição (CSS) | Uso |
|---|---|---|
| `elevation-1` | `0 1px 2px rgba(15, 16, 20, 0.04), 0 1px 1px rgba(15, 16, 20, 0.03)` | Cards em repouso, separadores com peso |
| `elevation-2` | `0 2px 4px rgba(15, 16, 20, 0.04), 0 1px 2px rgba(15, 16, 20, 0.03)` | **Cards com elevação default** |
| `elevation-3` | `0 4px 8px rgba(15, 16, 20, 0.06), 0 2px 4px rgba(15, 16, 20, 0.04)` | Hover de cards "hover-elevate" |
| `elevation-4` | `0 8px 16px rgba(15, 16, 20, 0.08), 0 4px 8px rgba(15, 16, 20, 0.04)` | **Modais, dropdowns, popovers** |
| `elevation-5` | `0 12px 24px rgba(15, 16, 20, 0.10), 0 6px 12px rgba(15, 16, 20, 0.06)` | Tooltips com peso, toast com elevação máxima |

**Regra de cor da sombra:** usar `rgba(15, 16, 20, X)` (cinza-quase-preto, levemente azulado) — **nunca** preto puro `#000`. Isso evita o "papel cortado artificial" típico de sombras hardcoded.

**Atenção em dark mode:** sombras em fundo escuro **quase somem**. Em dark, separar camadas com **bordas sutis** (`dark-300` ou `dark-400`) em vez de sombras. O `elevation-4` em dark vira `0 8px 16px rgba(0, 0, 0, 0.5)`.

---

<a name="7-animações"></a>
## 7. ✨ Animações

### Duração base

**200ms** é o ritmo padrão. Rápido o suficiente para parecer responsivo, lento o suficiente para o olho registrar.

| Token | Duração | Uso |
|---|---|---|
| `duration-fast` | 100ms | Mudanças de cor, hover sutil |
| `duration-base` | 200ms | **Padrão — fade, slide, troca de estado** |
| `duration-slow` | 300ms | Entrada de modal, toast aparecer |
| `duration-slower` | 500ms | Animações de página inteira (raras) |

### Easing (cubic-bezier concreto)

| Token | cubic-bezier | Caráter | Uso |
|---|---|---|---|
| `ease-out` | `cubic-bezier(0.16, 1, 0.3, 1)` | Suave, desacelera no fim | **Padrão para entradas** (elemento aparece) |
| `ease-in-out` | `cubic-bezier(0.65, 0, 0.35, 1)` | Simétrico, neutro | Transições de estado (toggle, swap) |
| `ease-in` | `cubic-bezier(0.7, 0, 0.84, 0)` | Acelera no fim | **Saídas** (elemento desaparece) |
| `ease-spring` | `cubic-bezier(0.34, 1.56, 0.64, 1)` | Sutil bounce | Apenas em confirmações celebrativas (raro) |

**Regra:** entradas usam `ease-out`; saídas usam `ease-in`; trocas de estado usam `ease-in-out`. Essa tríade é o "Linear way".

### Tipos de animação (receitas)

| Tipo | Definição | Uso |
|---|---|---|
| **fade** | `opacity: 0 → 1` em 200ms `ease-out` | Aparição de texto, troca de tab |
| **slide-up** | `translateY(8px) + opacity 0 → translateY(0) + opacity 1` em 200ms `ease-out` | Cards que entram, modais que sobem |
| **slide-down** | `translateY(-8px) + opacity 0 → translateY(0) + opacity 1` em 200ms `ease-out` | Dropdown que abre, notificação de topo |
| **scale** | `scale(0.96) + opacity 0 → scale(1) + opacity 1` em 200ms `ease-out` | Botão sendo pressionado, modal aparecendo |
| **shimmer** (skeleton) | gradiente animado 1.5s `linear` infinito | Loading state de skeleton |

**Atenção:** nenhuma animação deve durar mais de 300ms **exceto** shimmer de skeleton. Naninne é responsivo, não cinematográfico.

**Respeitar `prefers-reduced-motion`:** usuários com essa preferência recebem transições de 0–50ms (instantâneo) e shimmer de skeleton vira pulso opaco simples (sem gradiente animado).

---

<a name="8-breakpoints-e-z-index"></a>
## 8. 📐 Breakpoints e z-index

### Breakpoints (alinhados com Tailwind)

| Token | Largura mínima | Dispositivo-alvo |
|---|---|---|
| `sm`  | 640px  | Tablet pequeno, celular grande em paisagem |
| `md`  | 768px  | Tablet (sidebar vira drawer, painel direito some) |
| `lg`  | 1024px | Notebook — 3 colunas condensadas |
| `xl`  | 1280px | Desktop padrão (target principal) |
| `2xl` | 1536px | Desktop grande (telas 4K) |

**Comportamento de layout por breakpoint:**

| Breakpoint | Sidebar | Painel direito | Layout |
|---|---|---|---|
| `< md` (mobile) | Drawer (botão ☰) | Bottom sheet sob demanda | 1 coluna + bottom nav |
| `md–lg` | Drawer (recolhida) | Bottom sheet | 1 coluna central |
| `lg–xl` | Fixa (240px) | Fixa (320px) | 3 colunas |
| `≥ xl` | Fixa (240px) | Fixa (320px) | 3 colunas (max-width 1280px no central) |

### Z-index scale

Escala numérica **sem gaps** — sempre use o token, nunca um número solto.

| Token | Valor | Uso |
|---|---|---|
| `z-base`     | 0    | Conteúdo em fluxo normal |
| `z-elevated` | 10   | Cards com elevação, conteúdo sticky de baixa prioridade |
| `z-dropdown` | 1000 | Dropdowns, popovers, menus de contexto |
| `z-sticky`   | 1100 | Headers sticky, sidebar fixa em scroll |
| `z-overlay`  | 1300 | Overlay de modal (backdrop escuro) |
| `z-modal`    | 1400 | Conteúdo do modal em si |
| `z-toast`    | 1500 | Toasts (sempre acima de modais) |
| `z-tooltip`  | 1600 | Tooltips (acima de tudo) |

**Atenção:** toasts acima de modais permite que um toast de "Arquivo processado" apareça enquanto o usuário fecha um modal, sem se perder.

---

<a name="9-iconografia"></a>
## 9. 🎯 Iconografia

### Biblioteca: lucide-react

**Confirmação:** `lucide-react` é a escolha recomendada e a **padrão do shadcn/ui** (citado na seção 6 do doc mestre como "shadcn/ui + Framer Motion + TipTap"). Não usar emoji como ícone em nenhum lugar do produto.

**Por que lucide-react (e não outras):**

| Critério | lucide-react | heroicons | phosphor | tabler-icons |
|---|---|---|---|---|
| Padrão shadcn/ui | ✅ Sim | ❌ Não | ❌ Não | ❌ Não |
| Tamanho do bundle (tree-shaken) | ✅ ~2 KB por ícone | ✅ similar | ⚠️ maior | ⚠️ maior |
| Estilo "outline" Linear-like | ✅ Sim | ✅ Sim | ⚠️ mais "filled" | ✅ Sim |
| Estilo "duotone" opcional | ✅ Sim | ❌ Não | ✅ Sim | ❌ Não |
| Cobertura de ícones | ✅ 1500+ | ⚠️ 300+ | ✅ 9000+ | ✅ 4500+ |
| Licença | ISC | MIT | MIT | MIT |
| Manutenção ativa | ✅ | ✅ | ✅ | ✅ |

**Decisão:** lucide-react. Mesma lib que shadcn/ui (stack canônica), tree-shaking eficiente, estilo visual coerente com Linear, licença permissiva.

### Tamanhos padrão

| Token | Tamanho (px) | Uso |
|---|---|---|
| `icon-xs` | 12 | Inline com texto caption (raro) |
| `icon-sm` | 16 | **Padrão inline com body (15px)** — em botões, inputs, tags |
| `icon-md` | 20 | **Padrão de ação** — botões com só ícone, navegação |
| `icon-lg` | 24 | Headers, títulos de seção, ícones de feature |
| `icon-xl` | 32 | Ícones de empty state, ilustrativos |

**Stroke width:** padrão lucide de 2. Em ícones 12 e 16, considerar reduzir para 1.75 para melhor legibilidade em tamanho pequeno.

**Cor de ícone:** herda `currentColor` por padrão. Ícones de ação usam `neutral-700`; ícones decorativos usam `neutral-500`.

**Acessibilidade:** todo botão que só tem ícone **obrigatoriamente** tem `aria-label` descritivo. Nunca um botão sem texto **ou** sem label.

---

<a name="10-componentes-primitivos"></a>
## 10. 🧩 Componentes primitivos

> **Esta seção define comportamento, estados e props — não código.** Quem implementa é a Fase 4 (provavelmente shadcn/ui como base, com tokens customizados).

### 10.1 Button

**Definição funcional:** ação primária ou secundária que executa uma operação ao ser clicado.

**Variants (4):**

| Variant | Background | Borda | Texto | Uso |
|---|---|---|---|---|
| `primary` | `primary-500` | nenhuma | `white` | **CTA principal da tela** — no máximo 1 por view |
| `secondary` | `white` (ou `neutral-100` em dark) | `neutral-300` (1px) | `neutral-900` | Ação secundária (ex: "Cancelar", "Voltar") |
| `ghost` | transparente (hover: `neutral-100`) | nenhuma | `neutral-700` | Ação terciária (ex: "Ver mais", "Pular") |
| `danger` | `error-acent` (`#EF4444`) | nenhuma | `white` | Ações destrutivas ("Excluir", "Cancelar operação") |

**Sizes (3):**

| Size | Altura | Padding H | Font size | Ícone |
|---|---|---|---|---|
| `sm` | 32px | 12px | body-sm (13px) | 16px |
| `md` | 40px | 16px | body (15px) | 20px |
| `lg` | 48px | 24px | body-lg (17px) | 20px |

**Radius:** sempre `radius-md` (8px), exceto em botão "pill" que é `radius-full`.

**Estados (5):**

| Estado | Comportamento | Visual |
|---|---|---|
| `default` | Pronto para ação | Cores do variant |
| `hover` | Cursor pointer, leve mudança de cor | `primary` → `primary-600`; `secondary`/`ghost` → bg `neutral-100` |
| `active/pressed` | Sensação de "pressionado" | `primary` → `primary-700`; `scale(0.98)` em 100ms |
| `disabled` | Não-clicável, opacidade reduzida | `opacity: 0.5`, `cursor: not-allowed`, sem hover |
| `loading` | Substitui texto por spinner; desabilita clique | Spinner 16px no centro + texto mantido como label ou substituído por "Carregando…" |

**Ícone à esquerda/direita:** opcional. Quando há só ícone, é `icon-md` (20px) e largura do botão vira 40×40 (sm: 32×32, lg: 48×48).

**Foco visível:** `outline: 2px solid primary-500; outline-offset: 2px` em todos os estados, **mesmo em disabled** (acessibilidade).

**Regras de uso:**
- **Máximo 1 botão `primary` por seção** — múltiplos CTAs confundem
- Ações destrutivas (`danger`) **sempre pedem confirmação** (Modal)
- Botão `loading` mantém largura fixa (não encolhe quando texto vira spinner)
- Texto do botão é **verbo no infinitivo** ("Salvar", não "Salvando" — exceto em loading)

---

### 10.2 Card

**Definição funcional:** superfície elevada que agrupa conteúdo relacionado (arquivo, cena, capítulo, métrica).

**Variants (4):**

| Variant | Background | Borda | Sombra | Uso |
|---|---|---|---|---|
| `flat` | `white` (light) / `dark-100` (dark) | `neutral-200` (1px) | nenhuma | Card neutro, separação por linha |
| `elevated` | `white` | nenhuma | `elevation-2` | Card de destaque (default na home) |
| `hover-elevate` | `white` | `neutral-200` | `elevation-2` (default) → `elevation-3` (hover) | Card clicável; sombra cresce no hover + cursor pointer |
| `clickable` | `white` | `neutral-200` | `elevation-1` (default) → `elevation-2` (hover) | Item de lista clicável; mais discreto que hover-elevate |

**Padding interno:** 16px (`space-4`) para card pequeno, 24px (`space-6`) para card de conteúdo.

**Radius:** `radius-lg` (12px).

**Estados (para variants interativos):**

| Estado | Comportamento |
|---|---|
| `default` | Visual base do variant |
| `hover` | Sombra cresce 1 nível; borda pode ir a `neutral-300` |
| `active` | Sombra volta 1 nível (sensação de "pressionado"); `transform: translateY(1px)` |
| `focus` | `outline: 2px solid primary-500; outline-offset: 2px` (acessibilidade) |

**Estrutura interna recomendada (não obrigatória):**
- **Header** (opcional): título + ação (botão ghost ou ícone)
- **Body**: conteúdo
- **Footer** (opcional): metadados ou ações

**Regras:**
- Card nunca tem sombra em mobile (telas pequenas, sombras confundem)
- Card clicável **sempre** é um `<button>` ou tem `role="button"` + `tabindex="0"` + handler de teclado

---

### 10.3 Input (campo de texto)

**Variants (5):**

| Variant | Aparência | Uso |
|---|---|---|
| `default` | Borda `neutral-300`, bg `white` | Estado padrão |
| `with-icon` | Ícone à esquerda, padding-left aumentado | Busca, campo de URL |
| `error` | Borda `error-acent`, helper text em `error-text` | Validação falhou |
| `success` | Borda `success-acent`, ícone ✓ à direita | Validação passou (opcional) |
| `disabled` | Bg `neutral-100`, texto `neutral-400`, cursor not-allowed | Campo não-editável |

**Sizes:** mesmo do Button (sm 32px, md 40px, lg 48px). Default é `md`.

**Estrutura:**
```
[Label (opcional)]
[Input field ........................]
[Helper text (opcional, erro ou dica)]
```

**Estados internos (focus, hover, disabled, error):**

| Estado | Visual |
|---|---|
| `default` | Borda `neutral-300`, bg `white` |
| `hover` | Borda `neutral-400` |
| `focus` | Borda `primary-500`, ring `primary-100` (2px) |
| `disabled` | Borda `neutral-200`, bg `neutral-100`, texto `neutral-400` |
| `error` | Borda `error-acent`; helper text em `error-text` |
| `error + focus` | Mesma borda de erro + ring `error-acent` com 20% opacidade |

**Ícone à esquerda:** 16px, cor `neutral-500`. Padding-left aumenta em 36px para acomodar.

**Helper text:** `body-sm` (13px). Cor herda do estado (error, success, ou `neutral-500`).

**Label:** sempre **acima** do input (não floating). `body-sm`, peso 500, cor `neutral-700`.

**Regras:**
- Placeholder **não substitui** label — é exemplo do formato
- Input de senha tem toggle de visibilidade (ícone olho)
- Autofill do Chrome usa fundo `system` — manter contraste do texto

---

### 10.4 Modal / Dialog

**Estrutura (de fora pra dentro):**
1. **Overlay** (z-overlay, 1300): fundo `rgba(15, 16, 20, 0.5)` com `backdrop-blur(4px)`. Cobre 100% da viewport.
2. **Modal container** (z-modal, 1400): centralizado, max-width conforme size, `radius-lg`, bg `white`, sombra `elevation-4`.
3. **Header**: padding 24px, borda inferior `neutral-200`. Contém título (h3, 20px) + botão de fechar (X, top-right).
4. **Body**: padding 24px, scroll vertical se necessário, max-height 70vh.
5. **Footer** (opcional): padding 16-24px, borda superior `neutral-200`, alinhado à direita com botões (geralmente `secondary` à esquerda do `primary`).

**Sizes (3):**

| Size | Max-width | Uso |
|---|---|---|
| `sm` | 560px | Confirmação simples, formulário curto |
| `md` | 720px | Formulário médio, preview de conteúdo |
| `lg` | 960px | Editor de texto, preview de documento |

**Estados:**

| Estado | Comportamento |
|---|---|
| `entering` | Overlay fade-in 200ms; modal scale(0.96) → scale(1) + fade-in 200ms `ease-out` |
| `open` | Foco trapeado dentro do modal; ESC fecha; click no overlay fecha (configurável) |
| `closing` | Animação reversa de entering, 200ms `ease-in` |
| `closed` | Removido do DOM; foco volta ao elemento que abriu |

**Regras:**
- Foco inicial fica no **primeiro input** do modal (ou no container se não há input)
- Foco nunca sai do modal enquanto aberto
- ESC sempre fecha, mesmo sem botão de fechar visível
- Modal `lg` com texto longo tem **botão de scroll-to-top** sutil no canto inferior direito
- **Não empilhar modais** — uma de cada vez

---

### 10.5 Toast / Notification

**Posicionamento:** fixo, top-right, com margem 24px do topo e da direita. Em mobile, centralizado horizontalmente no topo.

**Anatomia:**
```
┌────────────────────────────────────────────┐
│ [Ícone]  Título (h4, 17px, semibold)   [X]│
│          Mensagem (body-sm, 13px)          │
└────────────────────────────────────────────┘
```

**Largura:** 360px. Padding interno 16px. Radius `radius-md`.

**Variants (4):**

| Variant | Ícone | Borda esquerda (4px) | Background |
|---|---|---|---|
| `success` | `CheckCircle2` (lucide) | `success-acent` | `success-bg` (`#ECFDF3`) |
| `warning` | `AlertTriangle` | `warning-acent` | `warning-bg` |
| `error` | `XCircle` | `error-acent` | `error-bg` |
| `info` | `Info` | `info-acent` | `info-bg` |

**Estados:**

| Estado | Comportamento |
|---|---|
| `entering` | slide-down 200ms `ease-out` da posição top: -20px → 0 + fade-in |
| `open` | Auto-dismiss em 5s (configurável por toast); pausa timer em hover |
| `closing` | slide-up 200ms `ease-in` + fade-out |
| `closed` | Removido; múltiplos toasts empilham verticalmente com gap 8px |

**Regras:**
- **Máximo 5 toasts visíveis** simultaneamente — o sexto substitui o mais antigo
- Toast de **erro** não auto-dismiss — exige dismiss manual
- Toast pode ter **botão de ação** (ex: "Desfazer", "Tentar de novo") à direita da mensagem
- Múltiplos toasts em sequência: novo aparece **abaixo** do anterior (não acima)

---

### 10.6 Tag / Badge

**Definição funcional:** rótulo pequeno que categoriza ou identifica algo. Sempre inline, sempre discreto.

**Variants (10+):**

| Variant | Background | Texto | Borda | Uso |
|---|---|---|---|---|
| `neutral` | `neutral-100` | `neutral-700` | nenhuma | Tag genérica, sem semântica |
| `writing` | `writing-100` | `writing-700` | nenhuma | Identifica projeto Escrita |
| `audiovisual` | `av-100` | `av-700` | nenhuma | Identifica projeto Audiovisual |
| `mercado` | `mkt-100` | `mkt-700` | nenhuma | Identifica projeto Mercado |
| `tech` | `tech-100` | `tech-700` | nenhuma | Identifica projeto Tech |
| `success` | `success-bg` | `success-text` | nenhuma | Status sucesso |
| `warning` | `warning-bg` | `warning-text` | nenhuma | Status alerta |
| `error` | `error-bg` | `error-text` | nenhuma | Status erro |
| `info` | `info-bg` | `info-text` | nenhuma | Status informativo |
| `outline` | transparente | `neutral-700` | `neutral-300` (1px) | Tag minimalista, sobre fundo neutro |

**Sizes:**

| Size | Altura | Padding H | Font size |
|---|---|---|---|
| `sm` | 20px | 8px | 12px (caption) |
| `md` | 24px | 12px | 13px (body-sm) |

**Radius:** `radius-full` (pill) é o default. `radius-sm` é alternativa.

**Comportamento:**
- Tag padrão é **estática** (label)
- Tag **clicável** tem hover (bg escurece 1 nível) + cursor pointer
- Tag **removível** (com X) tem hover no X que destaca em `error-acent`

**Regras:**
- Tags de projeto **sempre** acompanham o conteúdo do projeto (ex: capítulo de livro tem tag `escrita`)
- Não misturar tag de projeto com tag semântica (erro) — separar visualmente

---

### 10.7 Avatar

**Definição funcional:** representação visual de um usuário (no MVP, do próprio Robert). Pode ter imagem ou fallback de iniciais.

**Sizes (4):**

| Size | px | Font size (iniciais) | Uso |
|---|---|---|---|
| `xs` | 24 | 10px | Lista densa, header |
| `sm` | 32 | 13px | Card de conversa, item de lista |
| `md` | 40 | 15px | Header de mensagem, perfil |
| `lg` | 64 | 22px | Página de perfil |

**Formatos:**
- **Quadrado arredondado** (`radius-md` ou `radius-lg`) — para avatares de projeto
- **Circular** (`radius-full`) — para avatares de usuário

**Fallback de iniciais (algoritmo):**
- Nome completo → pega primeira letra do primeiro nome + primeira letra do último nome
  - "Robert Silva" → "RS"
  - "Maria" → "M" (apenas uma inicial)
  - "Maria de Lourdes Silva" → "MS" (primeira + última palavra)
- Aplica `text-transform: uppercase`
- Cor de fundo: gerada deterministicamente a partir do nome (hash → matiz HSL) — uma das 8 cores da paleta estendida de avatares (tons pastéis saturados)
- Texto: branco, peso 600

**Estados:**

| Estado | Comportamento |
|---|---|
| `default` | Imagem ou iniciais |
| `loading` | Skeleton circular shimmer |
| `error` (img falhou) | Fallback para iniciais |

**Regras:**
- Sempre tem `alt` descritivo (`alt="Foto de Robert Silva"`) mesmo sendo só iniciais
- Em listas, avatares têm gap mínimo de 8px entre si
- Avatares empilhados (overlap): -8px de margin-left a partir do segundo

---

### 10.8 Progress

**Variants (2):**

#### Linear

```
[████████████░░░░░░░░░] 60%
```

- Altura: 4px (sm) ou 8px (md) ou 12px (lg)
- Background (trilho): `neutral-200`
- Preenchimento: `primary-500` (default) ou cor do projeto se for progresso de um projeto específico
- Radius: `radius-full`
- Animação de preenchimento: 200ms `ease-out`

**Estados:**

| Estado | Visual |
|---|---|
| `indeterminate` | Barra de largura 30% que se move da esquerda para direita em loop 1.5s |
| `determinate (0-100%)` | Preenchimento fixo conforme valor |
| `complete (100%)` | Preenchimento vira `success-acent` por 1s, depois volta a `primary-500` |
| `error` | Preenchimento vira `error-acent` (em caso de falha) |

**Label opcional:** exibido acima ou à direita. Formato: "Processando 12 de 50 arquivos" ou "60%".

#### Circular

- Diâmetros: 32px (sm), 48px (md), 80px (lg)
- Anel de fundo: `neutral-200`, 4px stroke
- Anel de progresso: `primary-500`, 4px stroke, `stroke-linecap: round`
- Animação: rotação de 0° a 360° em 1s `ease-out` para mudança de valor
- Label central (opcional): `%` ou ícone (✓ quando completo)
- Em `indeterminate`: rotação contínua infinita do anel de progresso

**Regras:**
- Progress > 100% não acontece (validar input)
- Progress circular com label sempre tem o label visível dentro (não flutuante)
- Cor de progresso **nunca** é a cor semântica warning/error (use `error-acent` no caso)

---

### 10.9 Skeleton (loading state)

**Definição funcional:** placeholder animado que ocupa o espaço de conteúdo enquanto carrega. Reduz percepção de espera.

**Animação:** gradiente que se move da esquerda para direita em loop 1.5s `linear` infinito. Background base: `neutral-100`, com gradiente `linear-gradient(90deg, neutral-100 0%, neutral-200 50%, neutral-100 100%)` que se move.

**Variants (4):**

| Variant | Forma | Uso |
|---|---|---|
| `text` | Retângulo de 1 linha (ou múltiplas), `radius-sm` | Linhas de texto placeholder |
| `circle` | Círculo, `radius-full` | Avatares placeholder |
| `rect` | Retângulo genérico, `radius-md` | Imagens, cards |
| `card` | Retângulo com proporção de card, `radius-lg` | Cards inteiros |

**Cor:** `neutral-100` (base) com shimmer `neutral-200`. Em dark mode: base `dark-200`, shimmer `dark-300`.

**Reduced motion:** substituir shimmer por pulso opaco (neutral-100 ↔ neutral-200) em 1.5s.

**Regras:**
- Skeleton **imita a forma exata** do conteúdo que vai aparecer (não é retângulo genérico)
- Skeleton aparece por **no máximo 5s** — depois disso, mostrar empty state ou erro
- Skeleton de texto tem larguras variadas (não 100% sempre) para parecer natural — última linha tem 60–80% de largura

---

## 11. ♿ Princípios de uso e acessibilidade

### 11.1 Quando usar cada cor de projeto

A cor de projeto é **identidade**, não decoração. Use-a com critério:

| Projeto | Use a cor em... | **Não** use em... |
|---|---|---|
| ✍️ **Escrita** | Sidebar item, header de documento, tags de capítulo, prompt-cursor | Backgrounds grandes (canse o olho), gráficos de dados (use azul neutro) |
| 🎬 **Audiovisual** | Cards de cena, badges de moodboard, ícones de "frame", header de roteiro | Texto corrido, botões primários de ação (use primary) |
| 📊 **Mercado** | Gráficos, badges de KPI, header de relatório, indicadores de tendência | Texto longo, cabeçalhos de seção |
| 🛠️ **Tech** | Badges de tecnologia, ícones de agente, cards de repositório, logs | Botões de ação, CTAs principais |

**Regra geral:** cor de projeto aparece em **até 10% da tela**. O resto é neutros + primária.

### 11.2 Como combinar componentes

Receitas comuns:

| Composição | Receita |
|---|---|
| **Lista de conversas** | Card `flat` empilhado com `space-2` de gap, sem sombra |
| **Card clicável de arquivo** | Card `hover-elevate` com thumbnail 48px + título `h4` + tags `sm` + timestamp `caption` |
| **Formulário de upload** | Input `with-icon` (ícone upload) + helper text "PDF, DOCX até 50MB" + botão `primary` |
| **Confirmação de exclusão** | Modal `sm` com texto de aviso + footer com `secondary` ("Cancelar") + `danger` ("Excluir") |
| **Card de agente em ação** | Card `elevated` com ícone + nome do agente + Progress `linear` + "✓ Concluído" quando termina |
| **Toast de sucesso** | Toast `success` com título "Capítulo gerado" + mensagem "8 páginas prontas para revisão" + botão "Abrir" |

**Regra:** nunca componha mais que 3 níveis de profundidade visual (ex: card > section > paragraph). Mais que isso, o olho se perde.

### 11.3 Contraste mínimo (WCAG AA)

| Tipo de conteúdo | Ratio mínimo | Como validar |
|---|---|---|
| Texto normal (< 18px ou < 14px bold) | **4.5:1** | Body `neutral-700` (`#3A3935`) sobre `neutral-50` (`#FAFAF7`) = 12.5:1 ✅ |
| Texto grande (≥ 18px ou ≥ 14px bold) | **3:1** | Heading `neutral-800` sobre `neutral-50` = 15.4:1 ✅ |
| Ícones funcionais (não decorativos) | **3:1** | Ícone de busca `neutral-700` sobre `white` = 12.5:1 ✅ |
| Bordas de input | **3:1** | `neutral-300` sobre `white` = 4.6:1 ✅ |
| Botão primário texto | **4.5:1** | `white` sobre `primary-500` = 4.51:1 ✅ (no limite, valido) |
| Cor de projeto como texto | **4.5:1** | Sempre usar a variante 700, nunca a 500 (500 sobre off-white pode falhar) |

**Validações de cor:**
- `primary-500` (`#5B5FE9`) sobre `neutral-50` = 4.62:1 ✅ (texto normal AA)
- `primary-500` sobre `white` = 4.51:1 ✅ (texto normal AA)
- `writing-500` sobre `white` = 3.58:1 ⚠️ (passa para texto grande, falha para texto normal — usar `writing-700` para texto)
- `av-500` sobre `white` = 3.27:1 ⚠️ (passa para grande, usar `av-700` para texto normal)
- `mkt-500` sobre `white` = 2.83:1 ❌ (falha — sempre `mkt-700` para texto)
- `tech-500` sobre `white` = 4.55:1 ✅ (passa para normal)

**Atenção:** ao usar cor de projeto como texto, **sempre use a variante 700** (mais escura). A 500 só serve para ícones grandes (≥ 24px), backgrounds ou gráficos.

### 11.4 Foco visível

Todo elemento interativo **obrigatoriamente** tem estado de foco distinto:

```css
:focus-visible {
  outline: 2px solid var(--naninne-primary-500);
  outline-offset: 2px;
  border-radius: inherit; /* ou 4px se inherit não fizer sentido */
}
```

**Regras:**
- Foco visível **só** aparece com teclado (`:focus-visible`), não com click de mouse (`:focus` global atrapalha)
- Cor do outline é **sempre** `primary-500` (consistência)
- Offset de 2px garante que o outline não conflita com a borda
- Em dark mode, outline usa `primary-400` (mais claro, melhor contraste)

### 11.5 Aria-labels obrigatórios

| Elemento | aria-label obrigatório? | Exemplo |
|---|---|---|
| Botão só com ícone | ✅ Sim | `aria-label="Fechar modal"` |
| Ícone decorativo (em botão com texto) | ❌ Não (mas `aria-hidden="true"`) | `aria-hidden="true"` |
| Input sem label visível | ✅ Sim (ou label visual) | `<label for="email">E-mail</label>` |
| Imagem decorativa | ❌ Não (mas `alt=""`) | `<img alt="" />` |
| Imagem informativa | ✅ Sim | `<img alt="Gráfico de barras Q1 2026" />` |
| Toast | ✅ Sim (recomendado) | `role="status" aria-live="polite"` |
| Modal aberto | ✅ Sim (automático com `<dialog>`) | `aria-modal="true"` |
| Progress | ✅ Sim | `role="progressbar" aria-valuenow="60" aria-valuemin="0" aria-valuemax="100"` |

### 11.6 Outras regras de acessibilidade

- **Tab order** segue a leitura natural (cima-baixo, esquerda-direita)
- **Esc** fecha modais e dropdowns
- **Enter** em input submit aciona o botão primário do formulário
- **Espaço** em checkbox/radio toggle
- **Setas** em dropdown navegam entre opções
- **Contraste em hover:** mudanças de cor no hover devem **manter** contraste AA
- **Sem informação apenas por cor:** ícone de sucesso ✓ **+** texto "Concluído", não só ✓ verde
- **Movimento:** respeitar `prefers-reduced-motion`
- **Tamanho mínimo de alvo:** 40×40px para toque (mobile), 24×24px mínimo absoluto

### 11.7 Princípios de uso geral

**Hierarquia visual:** uma tela tem **um** título principal (h1), uma dezena de subtítulos (h2/h3), e o resto é body. Mais que isso é ruído.

**Densidade confortável:** prefira `space-4` (16px) entre seções pequenas e `space-8` (32px) entre seções grandes. Nunca menos.

**Consistência de raio:** dentro de um mesmo agrupamento, todos os elementos têm o mesmo radius. Card 12px → botões dentro dele em 8px. Tag em 4px. Misturar é desleixo.

**Estados de loading:** toda ação > 300ms mostra feedback. Botão vira `loading`, página mostra `skeleton`, operação assíncrona mostra `progress` + `toast` no fim.

**Estados vazios:** toda lista vazia tem **empty state** com ícone + título + descrição + ação. Nunca "Nada aqui." seco.

**Confirmação destrutiva:** toda ação que remove dados pede confirmação em modal. Sem exceção.

**Desfazer:** toda ação destrutiva tem "Desfazer" no toast por 5s. Sem exceção.

**Não inventar micro-interações:** animações são só onde agregam. Sem confetti, sem bouncy, sem "haha que fofo". Linear-level de sobriedade.

---

<a name="12-apêndice--referências-e-glossário"></a>
## 12. 📚 Apêndice — referências e glossário

### Referências externas

- **shadcn/ui** — base de componentes recomendada para implementação
- **Linear app** — referência de motion, densidade, sidebar
- **Perplexity** — referência de hero conversacional, minimalismo
- **Tailwind CSS** — escala de espaçamento (4, 8, 12, 16, 24...) e breakpoints
- **Inter (rsms.me/inter)** — família tipográfica
- **lucide.dev** — biblioteca de ícones
- **Material Design 3** — convenção de nomenclatura de tokens 50–900
- **WCAG 2.2 AA** — padrões de contraste e acessibilidade

### Glossário

| Termo | Significado |
|---|---|
| **Token** | Valor de design (cor, tamanho, espaçamento) nomeado, pronto para ser usado em código |
| **Variant** | Variação visual de um componente (ex: Button `primary` vs `secondary`) |
| **State** | Estado de interação de um componente (ex: Button `hover`, `disabled`) |
| **Off-white** | Branco levemente amarelado, usado para fundo padrão (reduz fadiga visual) |
| **Elevation** | Profundidade visual simulada por sombra |
| **Luminância (L\*)** | Medida de brilho percebido de uma cor (0 = preto, 100 = branco) |
| **HNSW** | Algoritmo de índice vetorial (mencionado por completude — não é parte do design system) |
| **WCAG AA** | Padrão de acessibilidade mínimo (contraste, foco, aria) |
| **shadcn/ui** | Biblioteca de componentes React copiáveis (não pacote) — base sugerida |
| **Empty state** | Tela/área mostrada quando não há conteúdo |

### Onde este DS vive no código

```
styles/
  tokens.css          ← todas as variáveis CSS (este documento)
  globals.css         ← reset + base
components/
  ui/                 ← componentes primitivos (shadcn/ui + tokens)
  project/            ← componentes compostos (Card de cena, etc.)
lib/
  utils/cn.ts         ← className merger
  utils/colors.ts     ← helper para gerar cor de avatar
```

### Próximos passos

1. **Revisão de Robert** (esta semana) — alinhar decisões de cor de projeto
2. **Fase 4 — Implementação** — traduzir este documento em código (provavelmente shadcn/ui + tokens em CSS variables + Tailwind)
3. **Auditoria de contraste** — testar com ferramentas (Stark, axe DevTools) antes do release
4. **Documentação de Storybook** — cada componente com seus estados visíveis
5. **Teste com usuários reais** — observar uso e iterar (especialmente densidade)

---

*"Naninne é minimalismo moderno: Perplexity + Linear temperado com índigo. Não é mais, não é menos."*
