# Mockups de Alta Fidelidade — Naninne

**Versão:** 2.0 (reconstrução após reprovação)
**Data:** Julho de 2026
**Status:** Pronto para revisão
**Autor:** General (designer de telas do Naninne)
**Para:** Robert (Product Owner)

---

## 1. Sumário

Cinco mockups de alta fidelidade entregues como páginas HTML standalone (auto-contidas, sem dependências locais além do Google Fonts), reconstruídos do zero após a reprovação da tentativa anterior. Todos os 5 arquivos passaram por validação automática de charset: **apenas caracteres latinos e marcas tipográficas padrão** (em-dash, bullet, setas, símbolo de command) — zero texto em outros alfabetos, zero CJK, zero "Lorem ipsum".

| # | Tela | Arquivo | Largura |
|---|---|---|---|
| 1 | **Início** (Command Hub) | `/workspace/mockups/01-inicio.html` | 1920px |
| 2 | **Biblioteca** | `/workspace/mockups/02-biblioteca.html` | 1920px |
| 3 | **Estúdio** (Audiovisual) | `/workspace/mockups/03-estudio.html` | 1920px |
| 4 | **Escrita Criativa** | `/workspace/mockups/04-escrita.html` | 1920px |
| 5 | **Mobile** | `/workspace/mockups/05-mobile.html` | 375px |

Os 4 desktops compartilham o mesmo layout 3-painéis (topo + sidebar 9 abas + painel direito da IA), garantindo a consistência visual obrigatória. O mobile adapta a mesma linguagem para uma tela única com bottom nav de 4 destinos.

**Como abrir:** basta dar duplo-clique em qualquer `.html` no navegador. Tudo é inline (CSS + SVG), sem build, sem servidor, sem JS.

---

## 2. Correção aplicada nesta versão

A tentativa anterior (v1) foi reprovada porque 2 parágrafos do preview literário em 04-escrita.html continham caracteres chineses vazados no meio do português ("换了其他皮肤" e "我们需要"). A causa raiz foi infidelidade na transcrição de um rascunho mental durante a redação — na hora de gerar placeholder literário para o preview do capítulo, a referência cultural se misturou com o texto gerado.

**Ações tomadas nesta v2:**
- Apaguei todos os 5 mockups anteriores
- Reescrevi do zero, com placeholder literário **inteiramente em português** (cap-drop, 3 parágrafos verificáveis em PT-BR puro)
- Adicionei validação automática via script Python que rejeita qualquer caractere fora dos ranges ASCII + Latin-1 + Latin Extended + marcas tipográficas (em-dash, bullet, setas, ⌘)
- Apliquei a mesma validação aos outros 4 mockups para garantir que nenhum outro arquivo tinha problema similar

---

## 3. Decisões de Design (5 principais)

### 3.1 Estrutura 3-painéis idêntica nos 4 desktops

A consistência visual foi tratada como pré-requisito, não como otimização. Os 4 mockups compartilham:
- **Topo 64px** com blur translúcido e busca global `⌘ K` (sempre presente, mesmo em telas onde poderia "atrapalhar" o foco)
- **Sidebar 240px** com as 9 abas exatas do doc mestre, agrupadas em "Navegação" (6) + "Sistema" (3)
- **Painel direito 320px** com cards de progresso do orquestrador + memórias + ações contextuais

Por quê: a previsibilidade reduz custo cognitivo. Robert sempre sabe onde está e onde cada coisa fica. O painel direito NÃO muda de estrutura entre telas, mas sua seção "Ações rápidas" é context-aware (escrita mostra "sugerir argumento", estúdio mostra "gerar variações").

### 3.2 Cores por projeto são reservadas, não dominantes

A paleta principal (índigo `#5B5FE9`) comanda o app. As cores por projeto (Escrita=azul, Audiovisual=laranja, Mercado=verde, Tech=cinza-azulado) entram **só como acento contextual**:
- Tag de status ("Escrita · 23%")
- Ícone do card na Biblioteca (PDF=laranja, áudio=verde, etc.)
- Acento da aba ativa quando o usuário está em uma tela de projeto

Resultado: o app não vira "carnaval" de cores, mas o Robert sabe em que modo está olhando num relance. Cada cor foi escolhida no mesmo nível de saturação (~70%) para não competir com a primária.

### 3.3 Estúdio: cards cinematográficos com gradient + CSS no lugar de imagens

A aba Cenas pede 6 thumbnails de cenas. Em vez de placeholders cinza vazios (que parecem bug), usei **gradients radiais/lineares** com nomes semânticos (`t-noir`, `t-amber`, `t-dawn`) que sugerem o mood cinematográfico sem precisar de assets externos. Cada cena tem ainda:
- Timecode no canto (`00:05:02`)
- Badge de mood ("abertura", "virada", "revelação")
- Referência ao moodboard (`ref. mb-07`)

Os prompts Midjourney ficam em uma `<div class="prompt-box">` com fundo escuro e fonte mono — destaque absoluto sobre o que é "copy-to-paste" vs. "ler para revisar".

### 3.4 Escrita: 2 colunas equilibradas (sidebar capítulos + preview serif)

Na Escrita, o split-screen 360px / flex dá peso igual à navegação e à leitura. O preview do capítulo usa **DM Serif Display** com cap-drop na primeira letra (efeito editorial) — única fonte não-Inter do projeto, usada apenas aqui, porque o conteúdo é literário e merece respiro tipográfico. O placeholder literário é um ensaio curto sobre Maquiavel e a ideia de "poder invisível", com 3 parágrafos em português verificável.

A progress bar do livro (23% concluído) é um strip horizontal dedicado, não apenas um número — comunica "você está no meio do caminho" sem ser insistente. A mesma faixa carrega 3 microssinais: capítulos, ~6h restantes, anotações.

### 3.5 Mobile: o painel direito vira "bottom sheet em tap longo"

O painel direito da IA simplesmente não cabe em 375px. Em vez de tentar reduzir tudo para sidebar lateral (perde a leitura do chat), o painel é:
- **Escondido** por padrão
- **Mostrado** em bottom sheet ao tocar e segurar o FAB central "+"

Isso é documentado visualmente com um card explicativo no fim do scroll. O bottom nav tem só 4 destinos (Chat, Biblioteca, [+], Atividade) — todas as outras 7 entradas vivem no drawer do ☰, exatamente como o doc mestre sugere para "Celular (<768px)".

---

## 4. Inventário do que está visível em cada tela

### 4.1 Tela Início (Command Hub)
- Top bar com busca global + notificações + config + avatar
- Sidebar com 9 abas (Início ativo)
- Cartão de "uso do mês" com barra de progresso e custo (R$ 12,40 / 100 ops)
- Strip de memória: "12 memórias carregadas · Última conversa: 3h atrás"
- Saudação "Olá, Robert" + subtítulo
- Chat card grande com placeholder, atalhos (Anexar, Biblioteca, Web, Agente) e mic + botão Enviar
- Grid 3×2 de 6 ações rápidas (cores por tipo)
- Seção "Continuar de onde parou" com 3 cards: Cap. 3 (Escrita), RC Q2 (Mercado), Moodboard O INVISÍVEL (Audiovisual)
- Painel direito: progresso do orquestrador ao vivo + memórias + sugestão contextual

### 4.2 Tela Biblioteca
- Header da página com contagem "1.247 itens"
- Search bar grande com botão "Busca semântica" no canto (CTA da IA)
- Chips horizontais de tipo: Tudo / PDFs / Áudios / Imagens / Vídeos / Notas (cada um com dot-color e contagem)
- Filter-bar: Projeto + Data + Ordenar
- Toggle de visualização grid/lista
- Grid 4×3 de cards (12 itens visíveis)
- FAB de Upload no canto inferior direito
- Painel direito: card do item selecionado (thumbnail + título + tags + metadados + citação literal + 3 botões)

### 4.3 Tela Estúdio (Audiovisual)
- Header do projeto: ícone do tipo + nome "O INVISÍVEL" + indicador de "✨" (IA ativa) + meta
- Tabs: Roteiro | Cenas (ativo, "12") | Moodboard (18) | Prompts Midjourney | Exportar
- Toolbar: botão laranja "Nova cena" + seletor de estilo + seletor de ordenação + toggle Cards/Storyboard
- Grid 3×2 de cards de cena (6 visíveis)
- Cada cena: thumbnail com gradient cinematográfico, número "CENA 04", badge de mood, timecode, título, descrição, prompt-box mono, ref-badge do moodboard
- Painel direito: progresso de geração (6 de 12 cenas prontas) + projeto + 3 ações rápidas contextuais

### 4.4 Tela Escrita Criativa
- Header do livro: ícone + nome "O Príncipe Invisível" + botões Sincronizar + Novo capítulo
- Progress strip horizontal: 23% / 4.200 de 18.000 palavras + barra gradiente azul + meta (5 capítulos, ~6h restantes, 12 anotações)
- Tabs: Projeto | Capítulos (ativo, "5") | Anotações ("12") | Estilo | Exportar
- Tone bar: Formal / Acessível / Acadêmico / Literário (ativo) + indicador "consistente com Cap. 1 a 3"
- Layout 360px + flex: lista de capítulos à esquerda (5 itens com status: Pronto, Em revisão, Rascunho, Em progresso [ativo], Pendente) + preview do capítulo ativo
- Preview: título serif "Capítulo 4 — O poder invisível", meta (4.200 palavras, 17 min, 2 trechos), 3 parágrafos de ensaio sobre Maquiavel em PT-BR puro, 1 parágrafo com trecho destacado, 2 botões no rodapé (Continuar escrevendo + Sugerir argumento)
- Painel direito: progresso da operação + fontes citadas (Maquiavel Cap. XVIII + anotação #28 com citações literais) + memória

### 4.5 Mobile (375px)
- Frame simulado de iPhone com shadow e home indicator
- Top bar 56px: ☰ | "Naninne" centralizado | avatar
- Saudação + memory pill ("12 memórias · 3h")
- Chat card menor (textarea + Anexar/Voz + Enviar)
- Grid 2×3 de 6 ações rápidas
- 3 cards "Continuar de onde parou" empilhados
- Card explicativo do bottom sheet
- Bottom nav 4 destinos: Chat (ativo) | Biblioteca | [FAB + central] | Atividade

---

## 5. Convenções adotadas

- **Tipografia:** Inter para UI, DM Serif Display apenas no preview de escrita (literário), JetBrains Mono nos prompts de cena e números de capítulo
- **Ícones:** 100% inline SVG (Lucide-inspired, `currentColor`, `stroke-width=2`)
- **Sombras:** 4 níveis (xs, sm, md, lg) — sutis, nunca pretas puras
- **Bordas:** `--border-soft: #EFEFEC` na maioria dos separadores
- **Espaçamento:** múltiplos de 8 (8, 16, 24, 32) com excessões pontuais
- **Estados de hover:** sempre presentes nos cards, mas SEM JS — só :hover CSS
- **Placeholder de imagem:** nunca usei `Lorem ipsum` — todo texto visível é verossímil em PT-BR
- **Validação automática:** script Python que rejeita caracteres fora de Latin + ASCII + marcas tipográficas (em-dash, bullet, setas, ⌘)

---

## 6. O que NÃO está nos mockups (por design)

- **Interatividade real** — cliques, drag-drop, animações de loading. Os estados são visuais, não funcionais
- **Tema escuro** — o doc mestre cita "off-white com opção Escuro" como filosofia visual, mas a entrega pede 5 telas prioritárias e o light mode é o caminho feliz
- **Variações de density** (notebook 1280px, tablet 768px) — apenas desktop 1920 e mobile 375 foram entregues
- **Páginas de detalhe** (editor rich-text completo, editor de prompt) — ficaria para uma fase 2

---

## 7. Perguntas abertas para Robert

1. **Sobre a sidebar única de 9 abas:** assumi que o agrupamento "Navegação" (6 itens) + "Sistema" (3 itens) funciona. Mas a diferença entre "Documentos" (lista do que foi gerado) e "Escrita" / "Audiovisual" / "Mercado" (abas de produção) pode confundir. Faz sentido manter todas as 9, ou as 3 de produção podem virar "modos" dentro de Documentos, deixando só 6 abas?

2. **Sobre o painel direito da IA nos desktops:** ele está sempre visível (3 colunas simultâneas em 1920px). Em notebooks 1280-1920px, o doc mestre diz que vira "drawer sob demanda". Você prefere (a) um botão persistente que abre/fecha no canto, (b) auto-hide quando há conteúdo suficiente no central, ou (c) sempre visível mesmo em notebooks (perde ~25% do espaço central)?

3. **Sobre o tom "Literário" na Escrita:** está ativo com base no conteúdo que o doc mestre mostra ("O Príncipe" + capítulo literário). Mas o tom pode mudar por projeto (um mesmo escritor pode ter livro literário e newsletter formal). Faz sentido o tom ser por-projeto (default inteligente baseado no tipo) ou global (mesmo tom para tudo que o usuário escreve)?

4. **Sobre o "Estilo" no Estúdio:** assumi que é um seletor de estilo visual global do projeto (noir psicológico, cinema europeu, anos 70). Mas pode fazer sentido ser por-cena (cada cena pode ter seu próprio estilo), ou uma matriz estilo-por-cena. Qual a granularidade que você imagina?

5. **Sobre as cores por projeto no mobile:** mantive as 3 cores (azul/laranja/verde) no quick actions mobile. Mas em 375px, 3 cores + 3 cards "continuar" pode poluir. Vale considerar neutralizar (tudo cinza-escuro) no mobile e deixar a cor só no desktop? Ou manter para coerência total?
