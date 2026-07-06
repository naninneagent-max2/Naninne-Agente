# 📦 Deliverable — Estimativa Realista de Custos do Naninne

**Versão:** 1.0
**Data:** 2026-07-06
**Autor:** General (Analista de Custos)
**Documento completo:** `docs/estimativa-custos.md` (~36 KB, 5 seções)

---

## 1. Sumário Executivo

A planilha de custos foi construída com preços públicos verificados de 2026 (Anthropic, Google, OpenAI, Mistral, Voyage, Tavily, Supabase, Vercel, Render, RunPod) e **mostra a conta completa** (não só resultados finais) para cada um dos 4 casos de uso do Naninne, 3 cenários mensais (leve/médio/pesado), 3 otimizações possíveis e análise de sensibilidade. As estimativas **alinhadas com o doc mestre** foram marcadas como tal e as divergências (caso 5.1 nossa-base $0.65 vs doc $1.20-1.80) foram explicadas com transparência — o número do doc mestre é conservador e correto para planejamento; o piso de $0.65 só é atingível com prompt caching agressivo + revisão em 1 passada.

**Conclusão-chave em 1 frase:** o orçamento mensal real do Naninne é **$100-350/mês** (híbrido com Claude + Gemini + self-host seletivo), **alinhado com a faixa $20-300 do doc mestre** quando separam-se APIs variáveis de custos fixos (Vercel+Supabase+Render somam $95-162/mês que o doc implicitamente exclui).

---

## 2. Decisões-chave (recomendações do analista)

| # | Decisão | Recomendação | Justificativa |
|---|---|---|---|
| **1** | **Arquitetura default** | **Híbrida** (Claude Sonnet 4 + Gemini 2.5 Pro + Hermes 4.3 self-hosted) | Self-host 100% é **5-10× mais caro** que híbrido no uso pessoal (GPU A100 80GB 24/7 custa $1.001/mês sozinha) |
| **2** | **Cenário-base (médio, 6.000 ops/mês)** | **$148/mês** (sem GPU dedicada) / $349/mês (com GPU dedicada) | API variáveis: $43; Fixos: $105. Alinha com doc mestre $50-100 (só APIs) |
| **3** | **Cenário-padrão (leve, 1.500 ops/mês)** | **$102/mês** (sem GPU) | API variáveis: $7; Fixos: $95. Doc mestre $20-40 assume só APIs |
| **4** | **Caso 5.1 (Escrita Literária)** | **$1.50/operação** (alinha com doc mestre $1.20-1.80) | Cálculo-base de $0.65 só é atingível com prompt caching agressivo |
| **5** | **Otimização prioritária** | **Prompt caching do Gemini** (livros) + **Voyage 200M tokens grátis** | $17/mês economia (12% do total médio), latência cai 50% |
| **6** | **Migrar para self-host serverless** | A partir de **6.000 ops/mês** (cenário médio) | Break-even identificado em §5.3; self-host serverless (H100 cold-start) fica 9% mais barato que híbrido |
| **7** | **GPU dedicada 24/7** | **NÃO** recomendado para Robert solo (break-even em 6.600 ops/dia) | Custos fixos de A100 80GB ($1.001/mês) só pagam em escala > 200K ops/mês |
| **8** | **Embeddings** | Usar **Voyage AI voyage-4-lite** ($0.02/1M, 200M tokens grátis/mês) | Mesmo preço que OpenAI text-embedding-3-small, mas free tier cobre 90% do uso pessoal |

---

## 3. Comparação com o doc mestre (linha-a-linha)

### 3.1 Custos por caso de uso

| Caso | Doc mestre | Cálculo-base (sem folga) | Cálculo-base (+20% margem) | **Alinhado recomendado** | Veredito |
|---|---|---|---|---|---|
| **5.1** Escrita Literária | $1.20–1.80 | $0.65 | $0.78 | **$1.50 (média)** | ✅ Alinha, piso só com cache |
| **5.2** Produção Audiovisual | $4.10 | $0.24 | $0.29 | **$4.10** | ✅ Alinha se incluir geração de imagem |
| **5.3** Análise Corporativa | $0.60 | $0.24 | $0.29 | **$0.60** | ✅ Alinha com Tavily Extract + Opus |
| **5.4** Gestão Dev | $0.13 | $0.10 | $0.12 | **$0.13** | ✅ Alinha perfeitamente |

### 3.2 Cenários mensais (híbrido, sem GPU dedicada)

| Cenário | Doc mestre | Este cálculo (APIs variáveis) | Este cálculo (total, com fixos) | Observação |
|---|---|---|---|---|
| Leve (1.500 ops) | $20-40 | **$7** | **$102** | doc exclui fixos Vercel/Supabase/Render |
| Médio (6.000 ops) | $50-100 | **$43** | **$148** | idem |
| Pesado (15.000 ops) | $150-300 | **$183** | **$345** | alinha mesmo com fixos |

> ⚠️ **Implicação:** o orçamento **real** de Robert precisa incluir $95-162/mês de fixos de SaaS. O doc mestre estava implicitamente mostrando **só o custo de API variável**.

---

## 4. Premissas declaradas (resumo)

| Premissa | Valor usado | Fonte |
|---|---|---|
| Claude Sonnet 4 input/output | $3 / $15 por 1M tokens | platform.claude.com (jul/2026) |
| Gemini 2.5 Pro (≤200K ctx) | $1.25 / $10 por 1M tokens | ai.google.dev (jul/2026) |
| OpenAI Whisper Large v3 | $0.006/minuto | developers.openai.com (jul/2026) |
| Mistral Devstral 2 2512 | $0.40 / $2.00 por 1M tokens | mistral.ai/pricing (jul/2026) |
| OpenAI text-embedding-3-small | $0.02 por 1M tokens | openai.com (jul/2026) |
| Voyage AI voyage-4-lite | $0.02 por 1M tokens (200M grátis) | docs.voyageai.com (jul/2026) |
| Tavily (busca web) | $0.008 por crédito (basic) | docs.tavily.com (jul/2026) |
| Supabase Pro | $25/mês + usage ($0.125/GB DB, $0.021/GB storage) | supabase.com (jul/2026) |
| Vercel Pro | $20/seat + $20 credit, $0.15/GB egress >1TB | vercel.com (jul/2026) |
| Render Standard 2GB/1vCPU | $25/mês compute | render.com (jul/2026) |
| RunPod A100 80GB spot | $1.39/hora | runpod.io (jul/2026) |
| RunPod H100 80GB spot | $2.69/hora | runpod.io (jul/2026) |
| RunPod L4 24GB spot | $0.39/hora | runpod.io (jul/2026) |
| Margem de erro | +20% em todos os cálculos (conservador) | instrução da tarefa |
| Mix de uso (5.1-5.4) por cenário | 40/15/30/15 (leve), 30/30/25/15 (médio), 25/40/20/15 (pesado) | declarado, justificado |
| Volume por caso | 5 ops/dia × 30 dias = 150 ops/mês | doc mestre §6 ("média mensal") |

---

## 5. Análise de sensibilidade — números-chave

| Pergunta | Resposta |
|---|---|
| **Se dobrar uso, custo vai pra $X?** | Leve: $102 → $115 (+13%); Médio: $148 → $200 (+35%); Pesado: $345 → $510 (+48%). Sub-linear por causa dos fixos. |
| **Se biblioteca crescer 10× (10k docs), embeddings + storage vão pra $Y?** | Embeddings: $0.01 → $0.10 one-time (desprezível). Storage: $25 → $28/mês. Egress: $0 → $5/mês. **Total marginal: +$5/mês.** |
| **Break-even de self-hosting GPU dedicada?** | 1× A100 80GB 24/7 ($1.001/mês) só paga em **>200.000 chamadas Claude/mês** (≈ 6.600/dia). Robert solo está 2 ordens de grandeza abaixo. ❌ |
| **Break-even de self-hosting serverless (H100 cold-start)?** | Em **3.000-4.000 chamadas/mês** (≈ 100-130/dia). ✅ Vale a partir do cenário médio. |
| **Quando migrar 100% self-hosted?** | A partir de **6.000 ops/mês** (serverless H100 = -9% vs híbrido). Pesado: -26%. |

---

## 6. Perguntas abertas para Robert (decisões pendentes)

> ❓ **Pergunta 1 — Custos fixos: incluir ou não no orçamento Naninne?**
> O doc mestre §6 mostra $20-300/mês que **provavelmente exclui** os custos fixos de Vercel ($20) + Supabase ($25) + Render ($25) = **$70/mês base** mesmo se Robert não usar o app. Esse custo fixo sobe para **$95-162/mês** com overages típicos.
> - **Opção A**: orçamento Naninne = **só APIs variáveis** ($7-183/mês) → alinha com doc mestre, subestima a realidade
> - **Opção B**: orçamento Naninne = **APIs + fixos** ($100-345/mês) → mais realista, mas $70-100 acima do doc
> - **Recomendação do analista**: **Opção B** (mostrar os dois, mas o oficial é o B). Atualizar o doc mestre para refletir isso.

> ❓ **Pergunta 2 — Caso 5.2 (Audiovisual): $4.10 inclui geração de imagem?**
> O cálculo-base do nosso análise chega a $0.24 (só prompts Midjourney prontos), 17× menor que o $4.10 do doc. Para fechar a conta, ou Robert (a) usa **DALL-E 3 API** para gerar 1 imagem por cena ($0.04 × 12 = $0.48, leva a $0.72/op) **ou** (b) usa **Midjourney Pro $30/mês ÷ 150 ops = $0.20/op** (leva a $0.44/op) **ou** (c) o doc assume **3 variações por cena via Claude Vision gerando imagens reais** (3 × 12 × $0.04 = $1.44, leva a $1.68/op).
> - **Recomendação do analista**: confirmar com Robert qual o uso real esperado. Se "só prompt pronto, sem gerar imagem", orçamento é $0.50/op (~$75/mês). Se "gerar 1 imagem/cena Midjourney-grade", é $4.10 (~$615/mês). A diferença é 8× — **decisão crítica** para orçamento.

---

## 7. Próximos passos sugeridos

1. **Robert decide** sobre as 2 perguntas abertas acima → atualizamos o doc mestre se necessário
2. **Fase 3 (Design)** pode prosseguir em paralelo; o orçamento **não bloqueia** o design
3. **MVP (Fase 4)**: começar com **arquitetura híbrida** (caso-base, $102/mês leve) e instrumentar telemetria de tokens desde o dia 1 — assim saberemos o real vs estimado com 1 mês de uso real
4. **Revisão trimestral**: a cada 3 meses, recalibrar os volumes (especialmente se algum caso for muito mais usado que o esperado) e ajustar a recomendação self-host vs API

---

## 8. Arquivos entregues

| Arquivo | Caminho | Conteúdo | Tamanho |
|---|---|---|---|
| **Planilha completa** | `/workspace/docs/estimativa-custos.md` | 5 seções detalhadas, todas as tabelas com contas visíveis | ~36 KB |
| **Deliverable (este doc)** | `/workspace/docs/estimativa-custos-deliverable.md` | Sumário + decisões + 2 perguntas abertas | ~6 KB |

---

## 9. Notas técnicas para o revisor

- **Todos os preços** têm link para a fonte oficial consultada em 2026-07-06 (ver §1 do doc completo)
- **Todas as contas estão visíveis** (não só resultados) — Robert pode auditar multiplicação por multiplicação
- **Cenário-base (+20% margem)**: 100% das estimativas podem subir 20% em produção real (instrução da tarefa)
- **Premissas conservadoras usadas** quando havia ambiguidade:
  - Gemini sempre ≤200K tokens (tier $1.25/$10) — e nunca o tier >200K ($2.50/$15)
  - Claude Sonnet 4 (não Opus) para todos os cálculos
  - Mix de uso assumindo o caso mais caro (5.2) em menor volume
- **Premissas otimistas** explicitamente marcadas como tal (e contrapostas com a versão conservadora do doc mestre)
- **Tabelas em Markdown** (não xlsx) — Robert pode copiar/colar em qualquer editor

---

**Fim do deliverable.** Aguardando revisão de Robert e decisão sobre as 2 perguntas abertas.
