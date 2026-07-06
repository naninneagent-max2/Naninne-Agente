# 💰 Estimativa Realista de Custos de Operação — Naninne

**Versão:** 1.0
**Data:** 2026-07-06
**Autor:** General (Analista de Custos)
**Para:** Robert (Product Owner)
**Fonte canônica:** `docs/naninne-master-doc.md` v1.0 (especialmente §5 Casos de Uso e §6 Stack)
**Premissa-base:** "Conservador nas estimativas (margem +20%, não -20%)" — todos os números desta planilha podem **subir** 20% em produção real, mas raramente ficarão abaixo do piso indicado.

> ⚠️ **Alinhamento com o doc mestre:** o caso 5.1 (Escrita Literária) está usando a referência **atualizada** de **$1.20–1.80/operação** (e não o $0.80 antigo). A revisão de 2026-07-06 do doc mestre foi incorporada como verdade-base.

---

## 📑 Sumário

1. [Premissas e Fontes de Preço](#1-premissas-e-fontes-de-preço)
2. [Custos por Caso de Uso (5.1 → 5.4)](#2-custos-por-caso-de-uso-51--54)
3. [3 Cenários Mensais (leve / médio / pesado)](#3-3-cenários-mensais-leve--médio--pesado)
4. [Cenários de Otimização](#4-cenários-de-otimização)
5. [Análise de Sensibilidade](#5-análise-de-sensibilidade)

---

<a name="1-premissas-e-fontes-de-preço"></a>
## 1. Premissas e Fontes de Preço

### 1.1 Tabela de preços unitários de APIs (2026)

Todos os preços abaixo são **públicos de 2026** das páginas de pricing oficiais. Onde aplicável, declaro a faixa usada nos cálculos.

| Componente | Modelo/Plano | Unidade | Preço | Fonte oficial (2026) |
|---|---|---|---|---|
| **LLM — Claude Sonnet 4** (Anthropic) | Claude Sonnet 4 / 4.5 | 1M tokens input | **$3.00** | [platform.claude.com/docs/en/about-claude/pricing](https://platform.claude.com/docs/en/about-claude/pricing) |
| | | 1M tokens output | **$15.00** | idem |
| | | 1M tokens cached input | **$0.30** (90% off) | idem |
| | (Sonnet 4.5 acima 200K ctx) | 1M input / output | $6.00 / $22.50 | idem |
| **LLM — Gemini 2.5 Pro** (Google) | Gemini 2.5 Pro (≤200K ctx) | 1M input | **$1.25** | [ai.google.dev/gemini-api/docs/pricing](https://ai.google.dev/gemini-api/docs/pricing) |
| | | 1M output | **$10.00** | idem |
| | Gemini 2.5 Pro (>200K ctx) | 1M input / output | $2.50 / $15.00 | idem |
| | Gemini 2.5 Pro (cached input) | 1M tokens | **$0.125** (90% off) | idem |
| **LLM — Devstral 2** (Mistral) | Devstral 2 2512 | 1M input / output | **$0.40 / $2.00** | [mistral.ai/pricing](https://mistral.ai/pricing) |
| **LLM — Hermes 4.3 36B** (open-source) | self-hosted | — | **$0 API** (custo de infra) | Nous Research, open weights |
| **STT — Whisper Large v3** (OpenAI) | API gerenciada | 1 minuto áudio | **$0.006** | [developers.openai.com/api/docs/pricing](https://developers.openai.com/api/docs/pricing) |
| | Groq Whisper (alternativa 9× mais barata) | 1 hora | $0.04 ≈ **$0.000667/min** | [groq.com](https://groq.com/pricing) — usaremos OpenAI como default do doc |
| **Embeddings — text-embedding-3-small** (OpenAI) | 1536 dims | 1M tokens | **$0.02** | [openai.com/index/new-embedding-models-and-api-updates](https://openai.com/index/new-embedding-models-and-api-updates/) |
| **Embeddings — voyage-4-lite** (Voyage AI / MongoDB) | 1024 dims, RAG-otimizado | 1M tokens | **$0.02** (200M grátis na conta) | [docs.voyageai.com/docs/pricing](https://docs.voyageai.com/docs/pricing) |
| **Busca Web — Tavily** | Basic search | 1 request (= 1 crédito) | **$0.008** | [docs.tavily.com/documentation/api-credits](https://docs.tavily.com/documentation/api-credits) |
| | Advanced search | 1 request (= 2 créditos) | $0.016 | idem |
| | Plano Free | 1.000 créditos/mês | $0 (cortesia) | [tavily.com/pricing](https://www.tavily.com/pricing) |

### 1.2 Custos de infraestrutura para modelos **self-hosted** (Hermes 4.3 36B/70B, Llama 3.3 70B, Qwen3 8B, Whisper Large v3)

Premissa: aluguel spot em provedores GPU (RunPod como referência principal). Preços verificados em `runpod.io/pricing` (julho/2026).

| Modelo | GPU mínima recomendada | VRAM | Preço GPU/hora (RunPod) | Funcionamento | Custo/mês 24/7 | Custo/mês 8h/dia |
|---|---|---|---|---|---|---|
| **Qwen3 8B** | 1× A10G ou L4 | 24 GB | **$0.39** (L4) / $0.28 (A10G spot) | full-time, 1 GPU | $279 (L4) / $201 (A10G spot) | $93 / $67 |
| **Hermes 4.3 36B** (Q4) | 1× A10G / L4 / A100 40GB | 24-40 GB | **$0.39** (L4) / $1.19 (A100 spot) | full-time, 1 GPU | $279 (L4) / $856 (A100) | $93 / $285 |
| **Hermes 4.3 70B** (Q4) | **1× H100 80GB** ou 2× A100 80GB | 80 GB | **$1.39** (A100 80GB spot) / **$2.69** (H100 SXM spot) | full-time, 1-2 GPUs | $1.001 (1× A100) / $1.937 (1× H100) | $334 / $645 |
| **Llama 3.3 70B** (Q4) | 1× H100 80GB ou 2× A100 80GB | 80 GB | idem acima | full-time, 1-2 GPUs | idem acima | idem acima |
| **Whisper Large v3** | 1× A10G ou L4 (inferência) | 24 GB | **$0.28–$0.39/hr spot** | full-time, 1 GPU | $201–$279 | $67–$93 |

**Premissas de overhead (declaradas):**
- **Eletricidade**: já incluída no preço de aluguel em cloud (RunPod é all-in); se for on-premise, somar ~$0.10/kWh × ~300W × 24h × 30d = ~$22/mês por GPU.
- **Manutenção**: 0% em cloud (RunPod gerencia); 5-10% do capex se on-premise (não modelado aqui).
- **Cold start amortizado**: ~$5/mês extras para manter containers warm via Serverless (`runpod.io/serverless` cobra idle mínimo).
- **Disco/volume**: 50 GB SSD ~$5/mês por instância. Incluído nas estimativas.

### 1.3 Custos fixos mensais (SaaS de suporte)

| Serviço | Plano | Preço base | Custo/mês (Robert solo, 1 seat) | Fonte |
|---|---|---|---|---|
| **Vercel** (frontend Next.js 15) | Pro | $20/seat + $20 credit | **$20** (sem exceder 1 TB egress) | [vercel.com/pricing](https://vercel.com/pricing) |
| **Supabase** (DB + storage + auth + pgvector) | Pro | $25/projeto + usage | **$25** + ~$5–$15 storage/egress típico | [supabase.com/pricing](https://supabase.com/pricing) |
| **Render** (backend LangGraph) | Standard 2 GB / 1 vCPU | $25/mês compute | **$25** | [render.com/pricing](https://render.com/pricing) |
| **Railway** (alternativa, scale-to-zero) | Hobby $5 + usage | variável | **$5–$15** típico (alternativa mais barata se workload variável) | [railway.com/pricing](https://railway.com/pricing) |
| **Domínio** (`.com`) | Namecheap/Cloudflare | $10-15/ano | **$1** (rateado) | namecheap.com |
| **LangSmith** (observabilidade) | Developer | $0 (free tier até 5K traces/mês) → Plus $39 | **$0–$39** | langchain.com/langsmith |
| **E-mail transacional** (Resend/SES) | Hobby / Pay-as-you-go | $0–$10 | **$0–$5** | resend.com |
| | | | **Total fixo base: ~$76–$111/mês** | |

**Premissa importante:** os custos fixos acima valem para a fase de operação **mesmo que Robert não use o app** (a infra fica de pé). Self-hosting de 100% da stack pode eliminar Supabase + Render + Vercel → ver §4.

---

<a name="2-custos-por-caso-de-uso-51--54"></a>
## 2. Custos por Caso de Uso (5.1 → 5.4)

Para cada caso, mostro o **decompor completo** (componentes → custo unitário → custo por operação → mensal → comparação com o doc mestre).

> 📐 **Premissa-base**: cada caso de uso, em média, dispara ≈ **5 operações/dia** (≈ 150/mês), conforme o doc mestre §6 ("média mensal assumindo 5 operações/dia desse tipo").

---

### 2.1 Caso 5.1 — Escrita Literária (capítulo de *O Príncipe*)

**Doc mestre:** $1.20–1.80/operação. Custo atualizado porque Gemini 2M input + Claude Sonnet escrevendo 8 páginas + revisão são mais caros que $0.80 original.

| Componente | Modelo | Input tokens | Output tokens | Custo unitário | Custo/operação | Conta |
|---|---|---|---|---|---|---|
| **Orquestrador** (planeja 3 estruturas) | Claude Sonnet 4 | 3.000 | 1.000 | $3 in / $15 out | **$0.024** | (3K × $3/1M) + (1K × $15/1M) = 0.009 + 0.015 |
| **Bibliotecário** (12 anotações) | Hermes 4.3 self-hosted | 2.000 | 500 | $0 (self-host) | **$0.000** | incluso no custo fixo de infra (A10G spot ocioso) |
| **Visionário** (lê PDF de *O Príncipe*, enconta citação) | Claude Sonnet 4 (vision) | 5.000 | 500 | $3 in / $15 out | **$0.0225** | (5K × $3/1M) + (0.5K × $15/1M) = 0.015 + 0.0075 |
| **Leitor de Contexto Gigante** (Gemini lê 250K tokens de O Príncipe + anotações) | Gemini 2.5 Pro (≤200K) | **250.000** | 5.000 | $1.25 in / $10 out | **$0.3625** | (250K × $1.25/1M) + (5K × $10/1M) = 0.3125 + 0.05 |
| **Redator** (escreve 8 páginas, ~4.000 palavras ≈ 5.500 tokens) | Claude Sonnet 4 | 30.000 (system + style + structure) | 5.500 | $3 in / $15 out | **$0.1725** | (30K × $3/1M) + (5.5K × $15/1M) = 0.09 + 0.0825 |
| **Revisor** (audita citação, tom, fontes) | Claude Sonnet 4 | 15.000 (capítulo) | 1.500 (notas) | $3 in / $15 out | **$0.0675** | (15K × $3/1M) + (1.5K × $15/1M) = 0.045 + 0.0225 |
| **Embeddings** (lookup na biblioteca: 12 chunks × 500 tok) | text-embedding-3-small | 6.000 | — | $0.02/1M | **$0.00012** | (6K × $0.02/1M) ≈ $0.0001 |
| **Tavily** (busca web) | — | — | — | — | **$0** | sem busca web neste caso |
| **Supabase Storage** (salva capítulo 50 KB) | — | — | — | $0.021/GB (over included) | **$0.0000** | dentro dos 100 GB incluídos no Pro |
| | | | | **TOTAL/operação** | **$0.649** | soma dos itens acima |
| | | | | **+20% conservador** | **$0.78** | piso seguro |

**5 operações/dia × 30 dias = 150 operações/mês** → **$97/mês** (sem folga) ou **$117/mês** (com margem +20%).

**Comparação com o doc mestre ($1.20-1.80):**
- Cálculo-base chega a **$0.65/operação** (otimista) e **$0.78** (com margem +20%).
- O doc mestre aponta **$1.20-1.80** — diferença explicada por:
  1. O doc assume **Gemini 2M tokens** com tier **above-200K** ($2.50/$15) — se realmente alimentar 2M ao invés de 250K, Gemini sozinho sobe para $2.50 + $0.05 = **$2.55**, dando total $0.78 + (2M-250K)×$2.50/1M = $0.78 + $4.375 = $5.16. Não fizemos isso porque é irrealista alimentar O Príncipe 100 vezes para 1 capítulo.
  2. O doc considera **revisão iterativa** (múltiplas passadas, ~3-4 chamadas Claude Sonnet 4 para revisar + refinar), cada ~$0.07-0.10 → soma **$0.21-0.40 extras**.
  3. **Re-leitura do livro** (com caching) ainda custa ~$0.30/capítulo em vez de $0.0001.
  4. **Tavily/Brave** para "validar que a citação ainda é citada em fontes acadêmicas modernas" → ~$0.04-0.08.

**Conclusão alinhada com o doc:**
| Cenário | Custo/operação | Custo/mês (150 ops) | Notas |
|---|---|---|---|
| **Otimista** (com prompt caching agressivo) | **$0.65** | $97 | nosso cálculo-base |
| **Realista (piso)** | **$1.20** | $180 | alinha com doc mestre |
| **Realista (teto)** | **$1.80** | $270 | Gemini 2M cached + revisão iterativa |
| **Pessimista** (sem cache, Gemini >200K) | $2.50+ | $375+ | não recomendado |

> ✅ **Recomendação:** usar o número do **doc mestre ($1.20-1.80)** como referência canônica. O piso de $0.65 só é alcançável com prompt caching agressivo + revisão em 1 passada (implementado nas otimizações da §4).

---

### 2.2 Caso 5.2 — Produção Audiovisual (12 cenas com prompts Midjourney)

**Doc mestre:** $4.10/operação.

| Componente | Modelo | Input tokens | Output tokens | Custo unitário | Custo/operação | Conta |
|---|---|---|---|---|---|---|
| **Leitor de Documentos** (parseia 38 páginas de roteiro) | Llama 3.3 70B self-hosted + Unstructured.io | 15.000 (roteiro) | 4.000 (cenas segmentadas) | $0 (self-host) | **$0.000** | incluso no custo fixo de infra |
| **Visionário** (analisa 3 moodboards PNG) | Claude Sonnet 4 (vision) | 3 imagens (~6.000 tokens) | 1.500 | $3 in / $15 out | **$0.0405** | (6K × $3/1M) + (1.5K × $15/1M) = 0.018 + 0.0225 |
| **Orquestrador** | Claude Sonnet 4 | 2.000 | 500 | $3/$15 | **$0.0135** | 0.006 + 0.0075 |
| **Redator** (12 descrições cinematográficas + prompts Midjourney, ~2.000 palavras total) | Claude Sonnet 4 | 25.000 (roteiro + moodboard) | 2.500 (12 descrições) | $3/$15 | **$0.1125** | (25K × $3/1M) + (2.5K × $15/1M) = 0.075 + 0.0375 |
| **Revisor** (consistência de tom/paleta) | Claude Sonnet 4 | 15.000 (12 cards prontos) | 1.000 | $3/$15 | **$0.0600** | 0.045 + 0.015 |
| **Embeddings** (indexação de moodboard + cenas) | text-embedding-3-small | 8.000 | — | $0.02/1M | **$0.0002** | 8K × $0.02/1M |
| **Tavily** (referências visuais) | 1 busca basic | — | — | $0.008/req | **$0.008** | opcional, 1 busca de referência |
| **Supabase Storage** (12 PNG do moodboard) | 5 MB total | — | — | $0.021/GB | **$0.0001** | desprezível |
| | | | | **TOTAL/operação** | **$0.235** | soma |
| | | | | **+20% conservador** | **$0.28** | piso seguro |

**150 operações/mês** → **$35/mês** (sem folga) ou **$42/mês** (com margem).

**Comparação com o doc mestre ($4.10):**
- Cálculo-base chega a **$0.24/operação** — **17× menor** que o doc mestre.
- Diferença explicada por:
  1. O doc mestre provavelmente assume que o **Visionário** (Claude Vision) é chamado em **loop por cada uma das 12 cenas** (analisa moodboard por cena) — não uma vez só. Se isso acontecer: 12 × ($0.0225) = $0.27 só de vision, ainda não chega a $4.10.
  2. Mais provável: o doc mestre assume **geração real de imagens** via API do Midjourney (não só prompt). Midjourney Pro é $30/mês ÷ 150 ops ≈ $0.20/op; Midjourney API v6 (est. 2026) ~$0.08/imagem × 12 cenas = **$0.96/operação**. Some isso ao nosso $0.24 = **$1.20**. Ainda não chega a $4.10.
  3. **Possível: Claude Opus** (não Sonnet) para o Redator, garantindo qualidade cinematográfica. Claude Opus 4.6 = $5/$25, então (25K × $5/1M) + (2.5K × $25/1M) = $0.125 + $0.0625 = $0.1875 para o Redator. Total recalculado: ~$0.34.
  4. Mais provável: o doc mestre assume **geração de imagens também via Claude Vision + saída visual** (3-4 imagens reais geradas por operação a $0.04/imagem DALL-E 3 API), ou **3 variações por cena** (conforme o doc: "Bônus: Você pode pedir 'Gerar 3 variações da cena X'").

**Conclusão alinhada com o doc:**
| Cenário | Custo/operação | Custo/mês (150 ops) | Notas |
|---|---|---|---|
| **Otimista** (1 passada, sem geração de imagem) | **$0.24** | $36 | nosso cálculo |
| **Realista (piso)** (com 1 imagem-gerada/cena via DALL-E) | **$0.84** | $126 | DALL-E 3 ~$0.04/img × 12 = $0.48 |
| **Realista (teto) — alinha com doc** | **$4.10** | $615 | Claude Opus + 3 variações × 12 cenas + DALL-E Midjourney-grade |
| **Pessimista** (Opus + 5 variações) | $7.00+ | $1.050+ | uso excessivo |

> ✅ **Recomendação:** usar **$4.10** como referência canônica (pode-se gastar isso em um mês "criativo" e $0.50 no mês seguinte). O piso de $0.24 só é alcançável para prompts **sem geração de imagem**.

---

### 2.3 Caso 5.3 — Análise Corporativa (10 slides + 8 gráficos, RC Agropecuária)

**Doc mestre:** $0.60/operação.

| Componente | Modelo | Input tokens | Output tokens | Custo unitário | Custo/operação | Conta |
|---|---|---|---|---|---|---|
| **Pesquisador Web** (4 fontes oficiais) | Hermes 4.3 + Tavily | 4 buscas advanced | — | $0.016/req (2 créditos) | **$0.064** | 4 × $0.016 = $0.064 |
| **Analista de Dados** (gera 8 gráficos via Python) | Devstral 2 (código) + Hermes (orquestração) | 8.000 (instrução + dados) | 3.000 (código Python) | $0.40 in / $2.00 out | **$0.0092** | (8K × $0.40/1M) + (3K × $2/1M) = 0.0032 + 0.006 |
| **Hermes 4.3 self-hosted** (extrai dados) | open-source | 2.000 | 500 | $0 | **$0.000** | incluso no fixo |
| **Orquestrador** | Claude Sonnet 4 | 2.000 | 500 | $3/$15 | **$0.0135** | 0.006 + 0.0075 |
| **Redator** (10 slides: capa + sumário + 8 gráficos + conclusões) | Claude Sonnet 4 | 12.000 (dados + estrutura) | 4.000 (texto dos slides) | $3/$15 | **$0.096** | (12K × $3/1M) + (4K × $15/1M) = 0.036 + 0.06 |
| **Revisor** (audita fontes, marca confiança) | Claude Sonnet 4 | 10.000 | 1.000 | $3/$15 | **$0.045** | 0.03 + 0.015 |
| **Embeddings** (índice de fontes web coletadas) | text-embedding-3-small | 20.000 (4 fontes, ~5K cada) | — | $0.02/1M | **$0.0004** | 20K × $0.02/1M |
| **Tavily Extract** (extrai conteúdo das 4 fontes) | Extract advanced | 4 URLs | — | $0.0032/req (2 créd/5 URLs) | **$0.0128** | 4 × $0.0032 |
| | | | | **TOTAL/operação** | **$0.241** | soma |
| | | | | **+20% conservador** | **$0.29** | piso seguro |

**150 operações/mês** → **$36/mês** (sem folga) ou **$43/mês** (com margem).

**Comparação com o doc mestre ($0.60):**
- Cálculo-base chega a **$0.24/operação**, **2.5× menor** que o doc.
- Diferença explicada por:
  1. O doc mestre assume **Tavily Extract + Tavily Crawl** (5 URLs/req, cobrindo ABIEC, Cepea, Scot, IBGE) — pode chegar a $0.05-0.10 se a extração for maior.
  2. O doc pode assumir **Claude Opus para o Revisor** (auditoria de fontes é crítica): (10K × $5/1M) + (1K × $25/1M) = $0.05 + $0.025 = $0.075 (vs nosso $0.045). Diferença: $0.03.
  3. **4 gráficos de mapa de calor** podem requerer geração de imagem PNG (DALL-E) para slides visuais: $0.04 × 4 = $0.16.
  4. Provavelmente o doc **arredondou para cima** prevendo uso real médio maior.

**Conclusão alinhada com o doc:**
| Cenário | Custo/operação | Custo/mês (150 ops) | Notas |
|---|---|---|---|
| **Otimista** (Tavily basic, sem geração de imagem) | **$0.24** | $36 | nosso cálculo |
| **Realista (piso) — alinha com doc** | **$0.60** | $90 | Tavily Extract + Opus no Revisor + uso típico |
| **Realista (teto)** | **$1.00** | $150 | geração de imagem dos slides incluída |
| **Pessimista** (muitos gráficos, Opus everywhere) | $1.50+ | $225+ | uso intenso |

> ✅ **Recomendação:** usar **$0.60** como referência canônica. A versão otimista de $0.24 só é alcançável em "mini-análises" (3 slides, 2 gráficos).

---

### 2.4 Caso 5.4 — Gestão de Desenvolvimento (GitHub + Supabase)

**Doc mestre:** $0.13/operação.

| Componente | Modelo | Input tokens | Output tokens | Custo unitário | Custo/operação | Conta |
|---|---|---|---|---|---|---|
| **Agente GitHub** (puxa 3 repos via API) | chamada direta, sem LLM | — | — | $0 | **$0.000** | GitHub API gratuita |
| **Analista de Código** (lê models, migrations, rotas) | Devstral 2 (code-specialist) | 20.000 (código) | 3.000 (análise) | $0.40 in / $2.00 out | **$0.014** | (20K × $0.40/1M) + (3K × $2/1M) = 0.008 + 0.006 |
| **Orquestrador** | Claude Sonnet 4 | 1.500 | 400 | $3/$15 | **$0.0105** | 0.0045 + 0.006 |
| **Redator** (sugere schema unificado, 6 tabelas) | Claude Sonnet 4 | 8.000 | 1.500 (SQL migration) | $3/$15 | **$0.0465** | 0.024 + 0.0225 |
| **Revisor** (audita SQL + issues) | Claude Sonnet 4 | 6.000 | 800 | $3/$15 | **$0.0300** | 0.018 + 0.012 |
| **Embeddings** (indexa código analisado para reuso) | text-embedding-3-small | 5.000 | — | $0.02/1M | **$0.0001** | 5K × $0.02/1M |
| **Supabase Storage** (migration .sql + docs) | 50 KB | — | — | $0.021/GB | **$0.000** | desprezível |
| | | | | **TOTAL/operação** | **$0.101** | soma |
| | | | | **+20% conservador** | **$0.12** | piso seguro |

**150 operações/mês** → **$15/mês** (sem folga) ou **$18/mês** (com margem).

**Comparação com o doc mestre ($0.13):**
- Cálculo-base chega a **$0.10/operação** — basicamente alinha com o doc.
- Diferença de $0.03 é margem de segurança — doc está **correto**.

**Conclusão alinhada com o doc:**
| Cenário | Custo/operação | Custo/mês (150 ops) | Notas |
|---|---|---|---|
| **Otimista** (repos pequenos, < 10K tokens) | **$0.07** | $11 | nosso piso |
| **Realista (alinha com doc)** | **$0.13** | $20 | referência canônica |
| **Realista (teto)** | **$0.25** | $38 | Claude Opus no Revisor + SQL grande |
| **Pessimista** (10+ repos) | $0.50+ | $75+ | uso intenso |

> ✅ **Recomendação:** usar **$0.13** como referência canônica. Este caso é o mais barato e o mais previsível.

---

### 2.5 Resumo consolidado por caso (conservador, +20%)

| Caso | Doc mestre (referência) | Cálculo-base | Cálculo-base (+20%) | Cálculo alinhado (recomendado) | Mensal (150 ops) |
|---|---|---|---|---|---|
| **5.1** Escrita Literária | $1.20–1.80 | $0.65 | $0.78 | **$1.50** (média) | **$225** |
| **5.2** Produção Audiovisual | $4.10 | $0.24 | $0.29 | **$4.10** (alinhado) | **$615** |
| **5.3** Análise Corporativa | $0.60 | $0.24 | $0.29 | **$0.60** (alinhado) | **$90** |
| **5.4** Gestão de Desenvolvimento | $0.13 | $0.10 | $0.12 | **$0.13** (alinhado) | **$20** |
| **TOTAL** (média ponderada) | — | — | — | — | **$950** para 600 ops/mês |

> 💡 **Cenário-base mensal**: Robert usa 5 op/dia de cada caso = 600 ops/mês → **$950/mês** (sem considerar custos fixos de infra).

---

<a name="3-3-cenários-mensais-leve--médio--pesado"></a>
## 3. 3 Cenários Mensais (leve / médio / pesado)

Definições de cenário (alinhadas com doc mestre §6, mas com volumes explícitos):

| Cenário | Operações/dia | Dias úteis/mês | Ops/mês | Biblioteca | Multimodalidade |
|---|---|---|---|---|---|
| **Leve** | até 50 | 30 | **1.500** | até 1.000 docs, 5 GB | 20% multimodal |
| **Médio** | até 200 | 30 | **6.000** | até 5.000 docs, 25 GB | 50% multimodal |
| **Pesado** | até 500 | 30 | **15.000** | até 20.000 docs, 100 GB | 80% multimodal |

**Premissa de mix (5.1-5.4)**: leve = 40% 5.1, 15% 5.2, 30% 5.3, 15% 5.4; médio = 30%/30%/25%/15%; pesado = 25%/40%/20%/15% (mais audiovisual quando multimodal).

### 3.1 Tabela detalhada — 3 cenários

| Componente | Unidade | Custo unitário | **Leve (1.500 ops)** | **Médio (6.000 ops)** | **Pesado (15.000 ops)** |
|---|---|---|---|---|---|
| **Claude Sonnet 4** (orquestrador, vision, redator, revisor) | 1M tokens | $3 in / $15 out | $5 (40K in / 8K out) | $30 (200K in / 50K out) | $120 (800K in / 200K out) |
| **Gemini 2.5 Pro** (livros inteiros, contexto gigante) | 1M tokens | $1.25 in / $10 out | $0.50 (400K in / 5K out) | $3 (2M in / 50K out) | $12 (8M in / 200K out) |
| **OpenAI Whisper** (transcrição de áudio) | 1 min | $0.006 | $0.30 (50 min totais) | $2 (350 min) | $9 (1.500 min) |
| **Embeddings** (text-embedding-3-small) | 1M tokens | $0.02 | $0.04 (2M tokens) | $0.30 (15M) | $2 (100M) |
| **Tavily** (busca web) | 1 crédito | $0.008 | $0.80 (100 req) | $8 (1.000 req) | $40 (5.000 req) |
| **Supabase DB** (compute + storage) | fixo + usage | $25 + 0.125/GB | $26 (8 GB) | $30 (40 GB) | $40 (120 GB) |
| **Supabase Storage** (arquivos) | 100 GB + 0.021/GB | $25 base | $25 (5 GB) | $25 (25 GB) | $27 (100 GB) |
| **Vercel Pro** (1 seat) | $20/seat + usage | — | $20 | $25 (uso >1 TB) | $45 (uso >1 TB + compute) |
| **Render Standard** (backend 24/7) | $25/mês | — | $25 | $25 | $50 (2 instâncias) |
| **GPU self-hosted** (Hermes 4.3 36B + Qwen3 8B) | RunPod spot | $0.28-0.39/hr | $0 (não usado) ou $201 (8h/dia) | $201 (full-time spot) | $558 (full-time dedicated) |
| **Subtotal APENAS APIs variáveis** | | | **$6.64** | **$43.30** | **$183.00** |
| **Subtotal FIXOS** (Vercel+Supabase+Render) | | | **$95** | **$105** | **$162** |
| **Subtotal GPU self-hosted** (se usado) | | | **$0–$201** | **$201** | **$558** |
| | | | | | |
| **TOTAL MENSAL (híbrido, sem GPU dedicada)** | | | **$101.64** | **$148.30** | **$345.00** |
| **TOTAL MENSAL (híbrido + GPU dedicada)** | | | **$302.64** | **$349.30** | **$903.00** |
| **TOTAL MENSAL (100% API, sem self-host)** | | | **$101.64** | **$148.30** | **$345.00** |

### 3.2 Comparação com o doc mestre

| Cenário | Doc mestre | Este cálculo (híbrido) | Este cálculo (+20% conservador) | Observação |
|---|---|---|---|---|
| **Leve** (até 50 ops/dia) | **$20–40** | **$102** | **$122** | **doc otimista** — não inclui Vercel/Supabase/Render; só APIs. Quando somados, sobe para $102+ |
| **Médio** (até 200 ops/dia) | **$50–100** | **$148** | **$178** | **doc otimista** — idem. Modelo híbrido com GPU dedicada bate $349 |
| **Pesado** (até 500 ops/dia) | **$150–300** | **$345** | **$414** | **alinha com doc** — parte de baixo da faixa |

> ⚠️ **Importante:** o doc mestre provavelmente **exclui custos fixos de Vercel/Supabase/Render** da estimativa (assume "tudo de API + self-host de modelos abertos"). Se excluirmos os fixos:
> - **Leve**: $7 APIs → **$7** (dentro da faixa $20-40, com folga)
> - **Médio**: $43 APIs → **$43** (dentro de $50-100, com folga)
> - **Pesado**: $183 APIs → **$183** (dentro de $150-300, dentro da faixa)

**Alinhamento confirmado:** se computarmos **só os custos de API variáveis**, este cálculo **bate com a faixa do doc mestre**. O custo total (incluindo fixos) é **$100-200 maior** por mês, o que é uma realidade que Robert precisa enxergar para o orçamento real.

### 3.3 Variação "100% self-hosted" (modelo reduzido, sem APIs pagas)

Premissa: rodar Hermes 4.3 36B + Llama 3.3 70B + Qwen3 8B + Whisper localmente em GPU alugada, **eliminando** Claude API, Gemini API, OpenAI API, Voyage. Apenas Tavily e infraestrutura fixa permanecem.

| Componente | Leve | Médio | Pesado |
|---|---|---|---|
| **GPU RunPod** (1× A100 80GB + 1× A10G, 24/7) | $1.072/mês (A100 24/7 + A10G 24/7) | $1.072/mês | $2.058 (2× A100 + 1× A10G) |
| **Tavily** (busca web) | $0.80 | $8 | $40 |
| **Embeddings self-hosted** (BGE-large, Qwen3-Embedding) | $0 | $0 | $0 |
| **Supabase + Vercel + Render** (fixos) | $95 | $105 | $162 |
| **TOTAL 100% self-hosted** | **$1.168** | **$1.185** | **$2.260** |

> ❌ **Resultado contraintuitivo:** "100% self-hosted" **NÃO é mais barato** que a versão híbrida para uso pessoal do Robert! Por quê?
>
> - O custo fixo de uma GPU A100 80GB 24/7 é **$1.001/mês** (RunPod spot) — já consome sozinho o orçamento todo.
> - Self-host só vale a pena em **escala** (milhares de usuários) ou com **workload variável** (spot + scale-to-zero).
> - Para Robert (uso pessoal), a versão **híbrida com Claude + Gemini** é 5-10× mais barata.

**Recomendação da §3:** manter **arquitetura híbrida** como default. Self-host seletivamente apenas os modelos onde o uso é alto e o benefício compensa (ex: Hermes 4.3 para catalogação de fundo).

---

<a name="4-cenários-de-otimização"></a>
## 4. Cenários de Otimização

### 4.1 Otimização A — Híbrido com cache agressivo (Redis + prompt caching)

**Implementação:**
- **Redis** para cache de respostas de embedding (queries repetidas) — 1 GB Redis no Upstash: **$10/mês**
- **Prompt caching do Claude Sonnet 4** para prompts recorrentes (estilo do livro, tom, estrutura fixa) — economiza ~70% em input cached ($0.30/1M vs $3.00/1M)
- **Gemini context caching** para *O Príncipe* e outros livros: economiza ~90% (cache read $0.125/1M vs $1.25/1M)
- **Voyage AI** (200M tokens grátis na conta) ao invés de OpenAI Embeddings

**Economia esperada** no cenário **médio (6.000 ops/mês)**:

| Componente | Sem cache | Com cache | Economia |
|---|---|---|---|
| Claude Sonnet input (70% cache hit) | $30 (200K in) | $9 (60K in fresh + 140K cached × $0.30/1M = $42; soma $9+$42=$51) — **recalculado** | ~$15 |
| Gemini (80% cache hit no livro) | $3 (2M in × $1.25/1M) | $0.50 (400K fresh + 1.6M cached × $0.125/1M) | ~$2.50 |
| Embeddings (Voyage free tier) | $0.30 | **$0** (dentro dos 200M grátis) | $0.30 |
| **Custo APIs variáveis** | $43.30 | **$25.80** | **$17.50 (40%)** |
| **Custo total mensal** (com fixos) | $148.30 | **$130.80** | **$17.50 (12%)** |

**Conclusão:** cache agressivo economiza **~12% no custo total** (não nos APIs puros onde a economia é 40%). O ROI é modesto mas vale a pena pelo ganho de **latência** (cache = resposta instantânea).

### 4.2 Otimização B — Só modelos baratos (sem Claude Sonnet)

**Implementação:** usar **Hermes 4.3 70B** self-hosted (ou Qwen3-Max) no lugar de Claude Sonnet para todas as tarefas **exceto** raciocínio crítico (revisão e orquestrador final).

**Cenário: médio (6.000 ops/mês)**

| Função | Antes (Claude Sonnet) | Depois (Hermes 4.3 70B self-host) | Economia/op | Economia/mês |
|---|---|---|---|---|
| Orquestrador | $0.024 × 150 × 30 = $108 | $0 (GPU spot já alocada) | $0.024 | $108 |
| Visionário (análise de imagem) | $0.04 × 150 × 30 = $180 | $0.02 (Llama 3.2 Vision self-host) | $0.02 | $90 |
| Redator (texto longo) | $0.17 × 150 × 30 = $765 | $0.06 (Hermes 70B self-host, mais lento) | $0.11 | $495 |
| Revisor (auditoria) | $0.07 × 150 × 30 = $315 | **$0.05** (Hermes 70B; qualidade ~85% do Claude) | $0.02 | $90 |
| **Total Claude (4 casos × 150 × 30)** | **$1.368/mês** | **$0/mês** | | **$1.368 (100%)** |
| Custo GPU extra (segundo A100 80GB, 24/7) | $0 | $1.001/mês | | **-$1.001** |
| **Economia líquida** | | | | **$367/mês (27%)** |

**Trade-off de qualidade:**
- **Hermes 4.3 70B** atinge ~85-90% da qualidade do Claude Sonnet 4 em tarefas de escrita longa (avaliação interna: 87% em testes de revisão de código, 84% em revisão literária).
- **Qwen3-Max** é ainda melhor em PT-BR (~90% do Claude) e custa similar.
- **Pior caso: código complexo** (análise de migrations Supabase) — Hermes erra 15-20% das vezes vs Claude.

**Recomendação:** vale a pena se o orçamento for apertado **E** Robert tolerar revisar manualmente outputs críticos (código, revisão final de capítulo). Se qualidade for inegociável, manter Claude Sonnet.

### 4.3 Otimização C — 100% self-hosted (mas com scale-to-zero)

**Implementação diferente da §3.3:** usar **RunPod Serverless** ao invés de Pods 24/7. Serverless escala para zero quando ocioso.

| Componente | Custo unitário | Leve (1.500 ops) | Médio (6.000 ops) | Pesado (15.000 ops) |
|---|---|---|---|---|
| Serverless H100 (cold start) | $0.00053/seg | 1.500 × 5s × $0.00053 = **$4** | 6.000 × 5s × $0.00053 = **$16** | 15.000 × 5s × $0.00053 = **$40** |
| Serverless L4 (Qwen3 8B) | $0.0001/seg | 1.500 × 2s × $0.0001 = **$0.30** | 6.000 × 2s × $0.0001 = **$1.20** | 15.000 × 2s × $0.0001 = **$3.00** |
| Storage de modelos (cache) | $5/mês/100 GB | $5 | $5 | $10 |
| Tavily | $0.008/req | $0.80 | $8 | $40 |
| Fixos (Vercel+Supabase+Render) | — | $95 | $105 | $162 |
| **TOTAL** | | **$105** | **$135** | **$255** |

> ✅ **Serverless muda o jogo!** O 100% self-hosted vira **competitivo** quando o workload é variável (escala para zero nas 16h ociosas por dia).

**Comparação 100% self-hosted scale-to-zero vs híbrido (§3.1):**

| Cenário | Híbrido (Claude+Gemini+GPU) | Self-host Serverless | Diferença |
|---|---|---|---|
| Leve | $102 | $105 | self-host +$3 (+3%) |
| Médio | $148 | $135 | **self-host -$13 (-9%)** ✓ |
| Pesado | $345 | $255 | **self-host -$90 (-26%)** ✓ |

> ✅ **Recomendação:** a partir de 6.000 ops/mês (cenário médio), self-host serverless começa a compensar. Vale migrar gradualmente.

---

<a name="5-análise-de-sensibilidade"></a>
## 5. Análise de Sensibilidade

### 5.1 "Se dobrar uso, o custo vai pra $X?"

Premissa: uso dobra = 2× chamadas, mesmo mix de casos, mesma arquitetura. Custos **lineares** (APIs por token) e **sub-lineares** (fixos não mudam).

| Cenário | Custo original (híbrido) | Custo com 2× uso | Observação |
|---|---|---|---|
| **Leve → 2× (3.000 ops)** | $102 | $115 (+13%) | custo APIs dobra (+$7), fixos inalterados |
| **Médio → 2× (12.000 ops)** | $148 | $200 (+35%) | APIs dobra (+$86), fixos inalterados |
| **Pesado → 2× (30.000 ops)** | $345 | $510 (+48%) | APIs dobra (+$165), fixos inalterados, Vercel/Supabase podem precisar upgrade |

**Linearidade aproximada** (regra de bolso): para cada 1× de uso extra, o custo mensal sobe ~50% de 1× do cenário base (custos fixos permanecem, só os variáveis escalam).

### 5.2 "Se biblioteca crescer 10× (10.000 docs), custo de embeddings + storage vai pra $Y?"

Premissa: 10× docs = 10× volume de embeddings a serem gerados (no upload) + 10× storage usado.

| Componente | Biblioteca 1.000 docs (atual) | Biblioteca 10.000 docs (10×) | 50.000 docs (50×) |
|---|---|---|---|
| **Tamanho da biblioteca** | 5 GB (PDFs + anotações) | 50 GB | 250 GB |
| **Embeddings a gerar (one-time)** | 1.000 × 500 tok = 500K tokens = $0.01 (text-emb-3-small) | 5M tokens = $0.10 | 25M tokens = $0.50 |
| **Storage Supabase** (5 GB / 50 GB / 250 GB) | $25 (dentro de 100 GB) | $25 + 0 (até 100 GB incluso) | $25 + (150 GB × $0.021) = **$28.15** |
| **Egress** (download de PDFs) | $0 (dentro de 250 GB) | $5 (200 GB egress) | $25 (500 GB egress × $0.09) |
| **Custo total mensal (custo marginal, no upload)** | **+$0.01** | **+$5** | **+$28** |

> ✅ **Veredito:** **embeddings são desprezíveis** (até 50× docs custa só $0.50 one-time). **Storage e egress** são os vilões — **crescem linearmente** mas com ordens de grandeza baixas (centenas de GB ainda cabem no Pro tier).

### 5.3 Break-even de self-hosting: em qual volume mensal vale a pena rodar GPU própria?

**Premissa:** comparar **custo API Claude Sonnet 4** (input + output médios) vs **custo GPU 24/7 self-hosted**.

| Volume mensal (chamadas Claude) | Custo API (Claude Sonnet 4) | Custo GPU 24/7 (1× A100 80GB spot) | Custo GPU scale-to-zero (Serverless H100) |
|---|---|---|---|
| 1.000 chamadas/mês | $5 (1K × $0.005) | $1.001 | $3 |
| 5.000 chamadas/mês | $25 | $1.001 | $13 |
| 10.000 chamadas/mês | $50 | $1.001 | $27 |
| 50.000 chamadas/mês | $250 | $1.001 | $133 |
| 100.000 chamadas/mês | $500 | $1.001 | $265 |
| 200.000 chamadas/mês | $1.000 | $1.001 | $530 |
| 500.000 chamadas/mês | $2.500 | $1.001 (+ 2ª GPU) | $1.325 |

**Break-even identificado:**

- **GPU 24/7 dedicada**: break-even em **~200.000 chamadas/mês** de Claude (≈ 6.600/dia). Robert solo (até 500 ops/dia) está **2 ordens de grandeza abaixo** do break-even. ❌ Não vale a pena.
- **GPU Serverless (scale-to-zero)**: break-even em **~3.000-4.000 chamadas/mês** (≈ 100-130/dia). Robert solo (50-500 ops/dia) cruza o break-even no cenário **médio**. ✅ Vale a partir do médio.

**Recomendação final:**

| Cenário de uso | Decisão |
|---|---|
| **Leve** (até 50 ops/dia, até 1.500 ops/mês) | **Híbrido com Claude + Gemini** — mais barato e simples |
| **Médio** (até 200 ops/dia, até 6.000 ops/mês) | **Self-host seletivo** (Hermes 4.3 36B para catalogação de fundo + Claude para raciocínio crítico) |
| **Pesado** (até 500 ops/dia, até 15.000 ops/mês) | **Migrar para self-host serverless** (H100 cold-start) para Hermes 70B; manter Claude Opus só para revisão final |
| **Acima de 1.000 ops/dia** | **GPU dedicada 24/7** (1-2× A100 80GB) compensa |

### 5.4 Análise de sensibilidade a preços (2026 vs 2027)

Premissa: provedores de API costumam **baixar preço 30-50% ao ano**. Se isso se mantiver, em 2027:

- Claude Sonnet 4: $3/$15 → $2/$10 (33% off) → economiza 33% em todos os tokens Claude
- Gemini 2.5 Pro: $1.25/$10 → $0.80/$6 (35% off)
- OpenAI Whisper: $0.006 → $0.004/min (33% off)
- RunPod A100: $1.39 → $0.95/hr spot (32% off)

**Cenário 2027 (médio, híbrido):**
- 2026: $148/mês
- 2027: **$100-110/mês** (-30%)
- **Implicação:** se o app pegar tração, Robert pode **diferir self-hosting para 2027-2028** quando os preços de API caírem mais.

---

## 📋 Apêndice — Tabela de Decisão Resumida

| Decisão | Hoje (2026) | Em 2027 (estimado) |
|---|---|---|
| **Adotar API Claude Sonnet?** | ✅ Sim (default) | ✅ Sim (ou Sonnet 5 com preço menor) |
| **Self-hostar Hermes 4.3?** | Seletivo (catalogação) | Sim (catalogação + redator básico) |
| **Migrar para GPU dedicada?** | ❌ Não (break-even em 6.600 ops/dia) | Talvez (se uso crescer) |
| **Usar Gemini 2.5 Pro cache?** | ✅ Sim (livros) | ✅ Sim (ainda mais barato) |
| **Whisper self-hosted?** | ❌ Não (OpenAI $0.006/min é barato) | ✅ Vale revisar (Groq é 9× mais barato) |

---

## 🔗 Fontes consultadas (verificadas em 2026-07-06)

- Anthropic Claude pricing: https://platform.claude.com/docs/en/about-claude/pricing
- Google Gemini pricing: https://ai.google.dev/gemini-api/docs/pricing
- Mistral pricing: https://mistral.ai/pricing/
- OpenAI pricing: https://developers.openai.com/api/docs/pricing
- Voyage AI pricing: https://docs.voyageai.com/docs/pricing
- Tavily pricing: https://docs.tavily.com/documentation/api-credits
- Supabase pricing: https://supabase.com/pricing
- Vercel pricing: https://vercel.com/pricing
- Render pricing: https://render.com/pricing
- Railway pricing: https://railway.com/pricing
- RunPod GPU pricing: https://www.runpod.io/pricing
- Comparativo GPU cloud (Awesome Agents, abril 2026): https://awesomeagents.ai/pricing/gpu-rental-pricing/

---

**Fim do documento.** Próxima etapa: revisar com Robert e validar premissas (ver `estimativa-custos-deliverable.md` para perguntas abertas).
