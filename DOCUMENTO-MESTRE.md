# 📘 Documento Mestre do Projeto Naninne

**Versão:** 1.0 — Versão definitiva consolidada
**Data:** Julho de 2026
**Status:** Aprovado conceitualmente, pronto para Fase 3 (Design)
**Autor:** Mavis (Engenheiro de IA + Arquiteto de Produto)
**Para:** Robert (Product Owner)

> *"Naninne não é mais um projeto. É um mapa completo. Este documento é o norte que vai guiar toda a engenharia, todo o design, toda a decisão daqui pra frente."*

---

> ⚠️ **NOTA DE REVISÃO (2026-07-06):** O custo estimado do caso de uso **5.1 (Escrita Literária — capítulo do livro baseado em *O Príncipe*) foi ajustado de $0.80 para $1.20-1.80**. A estimativa original estava otimista porque ignorava o custo de input do Gemini lendo a janela de 2M tokens (~$0.30 sozinho) + Claude Sonnet 4 escrevendo 8 páginas + revisão (~$0.80-1.20). Esta é a referência canônica a partir de agora.

---

## 📑 Sumário

1. [Visão Geral do Produto](#1-visão-geral-do-produto)
2. [A Arquitetura de Agentes (A Equipe)](#2-a-arquitetura-de-agentes-a-equipe)
3. [A Biblioteca Universal](#3-a-biblioteca-universal)
4. [Interface e Experiência do Usuário (Web Dashboard)](#4-interface-e-experiência-do-usuário-web-dashboard)
5. [Casos de Uso Práticos (O Coração do App)](#5-casos-de-uso-práticos-o-coração-do-app)
6. [Stack Tecnológica Sugerida (O Motor)](#6-stack-tecnológica-sugerida-o-motor)
7. [Próximos Passos (Plano de Ação)](#7-próximos-passos-plano-de-ação)

---

<a name="1-visão-geral-do-produto"></a>
## 1. 🧭 Visão Geral do Produto

### O que é o Naninne, em uma frase

> **Naninne é o seu "segundo cérebro digital": um assistente pessoal inteligente com biblioteca universal, que entende seus arquivos, lembra das suas conversas, pesquisa na internet e gera documentos — unificando em um só lugar tudo o que você faz na escrita, no audiovisual, no mercado corporativo e no desenvolvimento do próprio app.**

### O grande objetivo

Naninne foi desenhado para resolver **4 problemas reais** da sua rotina:

| Problema | Como o Naninne resolve |
|---|---|
| 🔍 **Você esquece** o que combinou em reuniões antigas, qual cliente pediu o quê, o que estava naquelas 30 anotações | **Memória persistente** que indexa tudo e traz a informação na hora certa |
| 📂 **Seus arquivos** estão espalhados (PDFs no Drive, áudios no celular, recibos na câmera, anotações em caderno, e-mails) | **Biblioteca Universal** que aceita tudo e organiza em um único lugar |
| 🧠 **Suas ideias** vivem presas em momentos específicos (no banho, na reunião, lendo um livro) | **Assistente ativo** que você conversa e que escreve por você, sem virar apenas um "chat" passivo |
| ⏳ **Você perde tempo** montando relatórios, catálogos, painéis, capítulos — sempre do zero | **Agentes especializados** que produzem documentos finais prontos para uso |

### O grande diferencial (o que torna o Naninne único)

Três escolhas que separam o Naninne de qualquer ChatGPT, Notion AI ou Google Drive:

1. **🧠 Multi-agente com modelos abertos + fechados combinados**
   A maioria dos apps usa um único cérebro. Naninne usa **time de IAs especializadas**, cada uma usando o **melhor modelo para sua função**. Claude (Anthropic) raciocina, Hermes (open-source) busca, Gemini (Google) lê livros inteiros, Devstral escreve código. Você paga menos, tem mais controle, e cada tarefa usa o especialista certo.

2. **🗂️ Biblioteca verdadeiramente universal**
   Onde apps comuns aceitam texto/PDF, Naninne aceita **PDFs, planilhas, áudios longos, vídeos, fotos de recibos, anotações soltas, conversas exportadas, links da web** — tudo indexado e pesquisável com **busca semântica** (você pergunta pelo significado, não pela palavra exata).

3. **🔍 Transparência radical sobre o que a IA está fazendo**
   Onde outros apps escondem o trabalho da IA, Naninne mostra em **cards elegantes** o que cada agente está fazendo no momento ("📂 Lendo seu arquivo...", "🧮 Calculando...", "✍️ Escrevendo...") — e deixa você **aprovar, pausar ou pedir ajustes** a qualquer momento.

### A filosofia de design

> **Você pede. Naninne entende. A biblioteca alimenta. Os agentes trabalham. Você revisa.**

Nada de telas técnicas. Nada de exigir programação. Naninne parece uma mistura de:
- 📱 ChatGPT (simples de conversar)
- 📚 Uma biblioteca pessoal (organizada)
- 📊 Um painel de projetos (com visão)
- 🎨 Um estúdio de criação (onde você produz)

---

<a name="2-a-arquitetura-de-agentes-a-equipe"></a>
## 2. 🤖 A Arquitetura de Agentes (A Equipe)

### A metáfora

Imagine Naninne como um **escritório pequeno** com **um gerente e 9 especialistas**. Você só fala com o gerente. Ele distribui tarefas e te devolve o resultado final.

### Como funciona o fluxo

```
Você digita um pedido no chat
        ↓
🧑‍💼 ORQUESTRADOR (o Gerente) interpreta
        ↓
Ele aciona 1 ou mais especialistas em paralelo
        ↓
Cada especialista faz seu trabalho e devolve
        ↓
🧑‍💼 ORQUESTRADOR consolida tudo
        ↓
🔍 REVISOR checa qualidade
        ↓
Você recebe a resposta final + fontes + rascunhos
```

### Os 10 agentes (e seus "cérebros" — modelos de IA)

| # | Agente | O que faz | Modelo de IA (cérebro) | Custo |
|---|---|---|---|---|
| 1 | 🧑‍💼 **Orquestrador** | Recebe pedidos, planeja, distribui tarefas. **Único que fala com você.** | Claude Sonnet 4 | 💰💰 |
| 2 | 🧠 **Memória** | Lembra de você, suas preferências, projetos, conversas passadas | Mem0 + camada dedicada | 💰 |
| 3 | 🗂️ **Bibliotecário** | Cataloga, localiza e busca em todos os seus arquivos | Hermes 4.3 (open-source, self-hosted) | 💰🆓 |
| 4 | 📄 **Leitor de Documentos** | Lê PDFs, Excel, Word, textos puros | Llama 3.3 70B + Unstructured.io | 💰🆓 |
| 5 | 👁️ **Visionário** | Olha imagens, fotos, recibos, PDFs escaneados, cenas de vídeo | Claude Sonnet Vision | 💰💰 |
| 6 | 🎙️ **Transcritor** | Ouve e assiste: transforma áudio/vídeo em texto organizado | Whisper Large v3 + Claude | 💰 |
| 7 | 🌐 **Pesquisador** | Pesquisa na internet em tempo real, traz dados atualizados | Hermes 4.3 + Tavily | 💰🆓 |
| 8 | 🧮 **Analista de Dados** | Lê planilhas, faz cálculos, gera gráficos e KPIs | Devstral 2 (Mistral, agente de código) | 💰🆓 |
| 9 | 🧹 **Organizador** | Trabalha em background: cataloga, etiqueta, renomeia, classifica | Hermes 4.3 (tarfas mecânicas) | 💰🆓 |
| 10 | ✍️ **Redator** | Escreve documentos finais: capítulos, relatórios, apresentações, atas | Claude Sonnet 4 | 💰💰 |
| 🔍 | **Revisor** | Última checagem antes de chegar até você (auditoria de qualidade) | Claude Sonnet 4 | 💰💰 |

> 🧠 **Detalhe importante:** esses 10 agentes aparecem como **nomes técnicos só quando você clica em "Ver detalhes"**. Por padrão, você vê apenas **checkmarks** simples ("✓ Pedido entendido", "✓ Biblioteca consultada", "✓ Documento gerado"). Os agentes são bastidores do teatro — você só vê a obra.

### O detalhe da "cascata de modelos"

Nem toda tarefa precisa do cérebro mais caro (Claude). Naninne economiza assim:

```
Tarefa entra
        ↓
Qwen3 8B (baratíssimo) avalia se é simples ou complexa
        ↓
    ┌─────────────┴──────────────┐
    ↓                             ↓
Tarefa simples               Tarefa complexa
    ↓                             ↓
Hermes 4.3 (custo baixo)     Claude Sonnet 4 (custo maior)
    ↓                             ↓
Resultado rápido               Resultado de maior qualidade
```

**Resultado:** você reduz custo em **60–80%** comparado a usar Claude pra tudo, mantendo **95% da qualidade**.

---

<a name="3-a-biblioteca-universal"></a>
## 3. 📚 A Biblioteca Universal

### O que a biblioteca aceita (lista oficial)

Naninne é o **"shopping completo"** de formatos — não te força a converter nada:

| Tipo | Formatos suportados | Como é tratado |
|---|---|---|
| 📄 **Documentos** | PDF, Word (.docx), Excel (.xlsx), PowerPoint, Google Docs exportados | Texto extraído, dividido em pedaços ("chunks"), cada um indexado |
| 🖼️ **Imagens** | JPG, PNG, HEIC, screenshots, fotos de celular | Visão lê e descreve (OCR + compreensão semântica) |
| 🎙️ **Áudios** | MP3, M4A, WAV, gravações do celular | Transcrito + resumido, busca por trecho |
| 🎬 **Vídeos** | MP4, MOV, links do YouTube | Amostras de frames + transcrição do áudio, busca por cena |
| 📝 **Notas e textos** | Digitadas direto, coladas, Markdown | Indexadas como qualquer documento |
| 💬 **Conversas** | WhatsApp exportado (.txt), e-mails (.eml), Telegram dumps | Processadas, segmentadas por assunto |
| 🌐 **Páginas web** | URLs salvas (função "leia depois") | Snapshot + texto extraído |
| 💰 **Comprovantes** | Fotos de notas, recibos em JPG/PDF | OCR automático + categorização por valor/data/estabelecimento |

### Como o armazenamento funciona (a "mágica" sem ser mágica)

A biblioteca tem **duas camadas invisíveis**:

**Camada 1: Storage bruto (o cofre)**
- Onde o arquivo original fica guardado, intacto
- Implementado com **Supabase Storage** (seguro, rápido, escalável)
- Você nunca perde o original — Naninne sempre pode recuperá-lo

**Camada 2: Índice semântico (a rede de significados)**
- Quando você sobe um arquivo, Naninne **lê, entende, divide em pedaços**, e para cada pedaço cria um **código numérico que representa o significado** dele
- Esses códigos ficam num **banco de busca vetorial** (Postgres + pgvector)
- Quando você pesquisa, Naninne transforma sua pergunta no mesmo tipo de código e busca os pedaços mais parecidos **por significado, não por palavra exata**

### Exemplo prático de busca

Você digita: *"Quais documentos falam sobre a biblioteca digital da Casa de Memória?"*

Naninne:
1. 🧠 Entende que você quer busca **na sua biblioteca**, não na internet
2. 🗂️ Bibliotecário vasculha o índice semântico
3. 🧠 Memória confirma: "Casa de Memória = projeto X, definido em tal conversa"
4. 📋 Encontra 7 arquivos relevantes com 23 trechos
5. ✍️ Redator compila a resposta com as fontes citadas

**Você recebe a resposta + a lista dos arquivos consultados** — confiança total, zero alucinação.

### Volume projetado

Para uso pessoal (1 usuário), a biblioteca escala **sem limite de estresse**:
- 100 GB de arquivos → tranquilo
- 50 mil documentos → tranquilo
- Milhares de buscas por dia → tranquilo

(Caso seu uso cresça muito, a infraestrutura escala junto.)

---

<a name="4-interface-e-experiência-do-usuário-web-dashboard"></a>
## 4. 💻 Interface e Experiência do Usuário (Web Dashboard)

### A estrutura visual (3 painéis)

Naninne tem **sempre** o mesmo layout-base:

```
┌──────────────────────────────────────────────────────────────┐
│ Topo: Naninne | Busca geral | Perfil | Configurações         │
├──────────────┬─────────────────────────────┬─────────────────┤
│ Menu lateral │ Centro: Conversa + Upload   │ Painel da IA    │
│              │                             │                 │
│ Início       │ Digite, arraste, escolha    │ Orquestrador    │
│ Biblioteca   │ ação rápida.                │ Memórias usadas │
│ Escrita      │                             │ Arquivos lidos  │
│ Audiovisual  │ Respostas e documentos      │ Fontes externas │
│ Mercado      │ aparecem aqui.              │ Progresso       │
│ Documentos   │                             │                 │
│ Memória      │                             │                 │
│ Gestão       │                             │                 │
│ Config.      │                             │                 │
└──────────────┴─────────────────────────────┴─────────────────┘
```

### As 9 abas (o menu lateral)

| # | Aba | Quando usar |
|---|---|---|
| 🏠 | **Início** | Comando rápido. Você chega aqui por padrão |
| 📚 | **Biblioteca** | Guardar, buscar e organizar arquivos |
| ✍️ | **Escrita Criativa** | Escrever livros, capítulos, textos longos |
| 🎬 | **Audiovisual** | Roteiros, cenas, prompts visuais |
| 📊 | **Mercado** | Análise de planilhas, dados comerciais, apresentações |
| 📑 | **Documentos** | Lista de tudo que foi gerado (atas, relatórios, capítulos) |
| 🧠 | **Memória** | Ver e editar o que Naninne sabe sobre você |
| 🛠️ | **Gestão Técnica** | Saúde do sistema (status, pendências) |
| ⚙️ | **Configurações** | Conectar serviços, ajustar modelos e permissões |

### Comportamento responsivo

| Dispositivo | O que muda |
|---|---|
| 💻 **Desktop** (1920px+) | 3 colunas visíveis ao mesmo tempo |
| 💻 **Notebook** (1280–1920px) | 3 colunas, mas painel direito vira "drawer" sob demanda |
| 📱 **Tablet** (768–1280px) | Sidebar vira gaveta (botão ☰), central + painel esquerdo |
| 📱 **Celular** (<768px) | Bottom nav com 4 ícones: `Chat / Biblioteca / Criar / Atividade`. Todas as outras abas via drawer |

### Filosofia visual

| Decisão | Valor |
|---|---|
| Estilo | Minimalismo moderno (estilo Perplexity + Linear) |
| Tema padrão | Claro (off-white), com opção Escuro |
| Tipografia | Inter |
| Cor primária | Índigo suave (#5B5FE9) |
| Cores por projeto | Escrita = azul / Audiovisual = laranja / Mercado = verde / Tech = cinza-azulado |
| Animações | Sutis (200ms fade/slide). Nada bobo |
| Densidade | Confortável, espaçoso |

### Detalhes de UX críticos (que aparecem em todos os fluxos)

| Elemento | Como aparece |
|---|---|
| **Progresso dos agentes** | Cards discretos: `✓ Pedido entendido`, `✓ Biblioteca consultada`, `✓ 4 arquivos encontrados` |
| **Detalhes técnicos** | Só aparecem quando você clica em `[Ver detalhes]` |
| **Confirmação antes de ação irreversível** | Toda mudança em banco/código pede aprovação explícita |
| **Fontes citadas** | Toda resposta tem link/referência para a origem |
| **Desfazer sempre disponível** | Nenhuma ação é irreversível sem aviso |
| **Drag-anywhere upload** | Arrasta arquivo em qualquer canto da tela, solta, está pronto |

---

<a name="5-casos-de-uso-práticos-o-coração-do-app"></a>
## 5. 🎯 Casos de Uso Práticos (O Coração do App)

Cada caso mostra o que acontece **quando você fala "faça X" e o Naninne resolve**.

---

### 5.1 ✍️ Escrita Literária — O livro baseado em "O Príncipe"

**Quando você faz:** Está escrevendo um capítulo e quer profundidade teórica fundamentada.

**Pedido de exemplo:**
> *"Estou no capítulo 4 sobre 'poder invisível'. Tenho umas 30 anotações na biblioteca. Cruze essas anotações com a citação do Capítulo XVIII de O Príncipe e escreva 8 páginas no tom do Cap. III (que já está finalizado)."*

**O que o Naninne faz:**

```
1. Memória carrega (estilo do livro, tom, capítulos anteriores)
2. Bibliotecário busca (12 anotações relevantes entre as 30)
3. Visionário lê (PDF de O Príncipe, encontra citação literal na página 47)
4. Gemini lê (O Príncipe INTEIRO no contexto de 2M tokens)
5. Orquestrador propõe (3 estruturas argumentativas possíveis)
6. Você escolhe uma estrutura
7. Redator escreve (8 páginas, ~45 segundos)
8. Revisor audita (citação verificada, tom comparado, sem invenções)
9. Você recebe o capítulo com 2 frases destacadas pra revisar
```

**Entrega:** Documento pronto (~8 páginas) com:
- ✅ Citação original verificada e marcada
- ✅ Tom consistente com Cap. III
- ✅ 12 anotações integradas
- ✅ 2 frases marcadas em amarelo (auditor: "gerada por extrapolação, vale revisar")
- ✅ Lista de fontes no rodapé

**Tempo:** ~1-2 minutos
**Custo:** ~$1.20–$1.80 *(atualizado: Gemini 2M input + Claude Sonnet writing + revisão são mais caros que a estimativa original de $0.80)*
**Sua ação:** 1 frase no chat + escolher estrutura + revisar

---

### 5.2 🎬 Produção Audiovisual — "O INVISÍVEL"

**Quando você faz:** Tem um roteiro final e quer gerar material visual pronto pra produção.

**Pedido de exemplo:**
> *"Arrastei o roteiro_v3_FINAL.pdf. Gera descrição cinematográfica + prompt Midjourney pra cada cena, no estilo do meu moodboard (noir psicológico, azul/cinza)."*

**O que o Naninne faz:**

```
1. Você arrasta o PDF (drag-anywhere)
2. Leitor de Documentos parseia (38 páginas → divide por cenas)
3. Identifica (12 cenas-chave com potencial visual)
4. Visionário cruza com moodboard (3 imagens-referência que você subiu antes)
5. Redator escreve (descrição cinematográfica + prompt técnico para cada cena)
6. Revisor checa (consistência de tom, paleta, referências)
```

**Entrega:** 12 cards de cena, cada um com:
- 🎬 Descrição cinematográfica (1 parágrafo)
- 📐 Composição (ângulo, lente, profundidade)
- 🎨 Prompt Midjourney pronto pra copiar/colar (com tags `--ar 21:9 --style raw`)
- 💡 Notas (qual referência do moodboard inspirou)

**Tempo:** ~2-3 minutos para o roteiro inteiro
**Custo:** ~$4.10
**Bônus:** Você pode pedir "Gerar 3 variações da cena X" e a IA cria variações sem reescrever tudo

---

### 5.3 📊 Análise Corporativa — RC Agropecuária (Pecuária de Corte)

**Quando você faz:** Precisa de uma apresentação executiva com dados atualizados.

**Pedido de exemplo:**
> *"Crie uma apresentação de 10 slides com 8 gráficos sobre pecuária de corte Brasil 2025. Use dados oficiais com fonte em cada número."*

**O que o Naninne faz:**

```
1. Pesquisador Web busca (4 fontes oficiais: ABIEC, Cepea, Scot, IBGE)
2. Analista de Dados extrai (preços, exportações, abate, etc.)
3. Analista gera (8 gráficos via Python: linha, barra, pizza, mapa de calor)
4. Revisor audita (fontes verificadas, 3 dados marcados como "confiança média")
5. Você aprova lista de gráficos antes de montar apresentação
6. Redator monta (10 slides: capa + sumário + 8 gráficos + conclusões)
```

**Entrega:** Apresentação PowerPoint/Google Slides pronta:
- ✅ 10 slides profissionais
- ✅ 8 gráficos com fonte em cada número
- ✅ 87% dados com fonte oficial verificada, 13% marcados pra revisão
- ✅ Botão "Compartilhar com time" envia por email com mensagem pronta

**Tempo:** ~2-3 minutos
**Custo:** ~$0.60
**Bônus:** Versão PDF automática + link de compartilhamento

---

### 5.4 🛠️ Gestão de Desenvolvimento — GitHub + Supabase

**Quando você faz:** Quer sincronizar seus repositórios e planejar a estrutura do próprio app.

**Pedido de exemplo:**
> *"Sincroniza meus 3 últimos repos do GitHub e sugere a estrutura ideal de tabelas no Supabase pra suportar o app principal. Pode aplicar se for seguro."*

**O que o Naninne faz:**

```
1. Agente Integração GitHub puxa (lista de repos + código)
2. Analista de Código lê (models, migrations, rotas)
3. Redator sugere (schema unificado: 4 tabelas suas + 2 recomendadas)
4. ⚠️ CHECKPOINT — pede aprovação ANTES de aplicar
5. Você aprova (ou ajusta)
6. Migration aplicada no Supabase
7. Organizador cria tags e indexa tudo
8. Você recebe issues criadas no GitHub (próximas sprints)
```

**Entrega:** Sistema estruturado:
- ✅ 3 repos sincronizados
- ✅ 6 tabelas criadas no Supabase
- ✅ 3 issues GitHub criadas automaticamente (índices, view materializada, RLS)
- ✅ Documento Markdown unificado (`Schema_Unificado_2026-07-06.md`)

**Tempo:** ~3-4 minutos
**Custo:** ~$0.13
**Bônus:** Toda ação em banco é precedida de aprovação — zero risco de quebrar produção

---

### Padrão comum aos 4 casos

Independente do que você pede, o fluxo é **sempre o mesmo**:

```
Você digita 1 frase
       ↓
Orquestrador planeja (você vê o plano se quiser)
       ↓
1 a 4 especialistas agem em paralelo (você vê cards)
       ↓
Revisor audita
       ↓
Você recebe produto final + fontes + opções de refinamento
```

**Tempo médio:** 2-4 minutos para entrega completa.
**Sua interação efetiva:** 30 segundos a 1 minuto (digitar + aprovar + revisar).
**Custo médio por operação:** $0.13 a $4.10 (dependendo da complexidade).

---

<a name="6-stack-tecnológica-sugerida-o-motor"></a>
## 6. ⚙️ Stack Tecnológica Sugerida (O Motor)

> Esta é a "receita de bolo" que vai virar código nas mãos dos engenheiros. Cada peça foi escolhida pensando em: **produtividade + qualidade + custo + longevidade**.

### Camada por camada

| Camada | Ferramenta | Função em linguagem simples | Por que essa escolha |
|---|---|---|---|
| 🧠 **IA principal (raciocínio)** | **Claude Sonnet 4** (Anthropic) | O cérebro que pensa coisas complexas | Melhor raciocínio, melhor honestidade, melhor uso de ferramentas |
| 🧠 **IA de contexto gigante** | **Gemini 2.5 Pro** (Google) | O cérebro que lê livros inteiros de uma vez | Janela de 2 milhões de tokens (lê O Príncipe inteiro + 200 páginas suas) |
| 🧠 **IA open-source especializada** | **Hermes 4.3 36B** (Nous Research) | O cérebro rápido que faz tarefas mecânicas | Roda no seu servidor, custa quase nada, ótimo em ferramentas |
| 🧠 **IA para código/dados** | **Devstral 2** (Mistral AI) | O cérebro que lê e escreve código | 72% no SWE-bench (líder em agente de código) |
| 🕸️ **Orquestrador de agentes** | **LangGraph** (LangChain) | O maestro que conduz a orquestra | Padrão de produção 2026, persistência de estado, debugável |
| 🧠 **Camada de memória** | **Mem0** | O caderno de lembretes da IA | Líder de mercado, 55k+ stars, integrado com todos os modelos |
| 🗄️ **Banco de dados + storage + auth** | **Supabase** (Postgres) | O porão onde tudo fica guardado | Tudo-em-um (DB + storage + auth + busca vetorial) |
| 🔍 **Busca semântica** | **pgvector** (dentro do Supabase) | O índice mágico que entende significado | Performance equivalente a Qdrant/Pinecone para uso pessoal |
| 📄 **Leitura de documentos** | **Unstructured.io + LlamaParse** | O especialista que abre QUALQUER arquivo | 64+ formatos suportados, melhor do mercado |
| 🎙️ **Transcrição de áudio** | **Whisper Large v3** (OpenAI) | O ouvido que entende fala | Padrão da indústria, multilíngue |
| 🌐 **Busca na web** | **Tavily + Brave Search** | O pesquisador que sai na internet | Otimizado para agentes de IA, sem SEO spam |
| 🔬 **Observabilidade** | **LangSmith** (LangChain) | A câmera que grava tudo que cada agente fez | Indispensável para debug e auditoria |
| 🖥️ **Frontend (a cara do app)** | **Next.js 15** + **Vercel AI SDK 6** | O visual + o motor do chat | Padrão da indústria para apps de IA |
| 🎨 **Componentes visuais** | **shadcn/ui + Framer Motion + TipTap** | Botões, animações, editor de texto | Bonito, moderno, customizável |
| 🚀 **Hospedagem** | **Vercel** (frontend) + **Render/Railway** (backend) | Os servidores onde o app vive | Zero-config, escala automática |

### Por que esse stack é sólido

✅ **É majoritariamente open-source nas fundações** → sem vendor lock-in
✅ **Mistura proprietário + open-source da forma certa** → qualidade alta, custo controlado
✅ **Componentes battle-tested em produção** → não é hype, é default do mercado
✅ **Stack coerente** → todas as peças foram feitas para funcionar juntas
✅ **Pronto para escalar** → do uso pessoal para uso empresarial com ajustes pequenos
✅ **Cabe num MVP** → cada peça pode ser ligada/desligada ou substituída se necessário

### Custo mensal estimado de operação

| Cenário | Custo estimado/mês |
|---|---|
| **Uso pessoal leve** (até 50 operações/dia, biblioteca pequena) | $20–40 |
| **Uso pessoal médio** (até 200 operações/dia, biblioteca até 5k docs) | $50–100 |
| **Uso pessoal pesado** (até 500 operações/dia, biblioteca grande, multimodal) | $150–300 |

*Custos baseados em preços de API de 2026. Self-hosting dos modelos abertos pode reduzir 60–80%.*

---

<a name="7-próximos-passos-plano-de-ação"></a>
## 7. 🚀 Próximos Passos (Plano de Ação)

### Visão geral do plano completo

| Fase | Status | Duração estimada |
|---|---|---|
| **Fase 1 — Descoberta** (estamos aqui) | ✅ Concluída conceitualmente | ~1 semana |
| **Fase 2 — Arquitetura** | 🔜 Em andamento (team paralelo) | ~3 dias |
| **Fase 3 — Design** | 🔜 Em andamento (team paralelo) | ~1 semana |
| **Fase 4 — Construção do MVP** | ⏸ Aguardando Fase 2+3 | ~4–8 semanas |
| **Fase 5 — Testes reais com você** | ⏸ Aguardando | ~1 semana |
| **Fase 6 — Lançamento** | ⏸ Aguardando | ~3 dias |
| **Fase 7 — Evolução contínua** | ⏸ Aguardando | indefinido |

### Ações em paralelo (Fase 2 + Fase 3)

#### 🎯 Ação 2 — Arquitetura Técnica (3 dias úteis)

**Entregáveis:**
- 📊 Diagrama de arquitetura do orquestrador LangGraph (1 página)
- 🗄️ Schema do banco Supabase (SQL migration + doc)
- 💰 Planilha de custos reais por cenário

#### 🎯 Ação 3 — Design Visual (5-7 dias úteis, em paralelo)

**Entregáveis:**
- 🎨 Design System Document (paleta + componentes)
- 🖼️ Mockups de alta fidelidade (5 telas)

---

*Documento elaborado em Julho de 2026. Próxima revisão prevista: após a entrega da Fase 2 + 3.*

---

**🌟 Este é o north star do projeto. Toda decisão volta pra cá.**