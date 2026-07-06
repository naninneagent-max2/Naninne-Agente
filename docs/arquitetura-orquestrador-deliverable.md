# 📋 Deliverable — Arquitetura do Orquestrador Naninne

**Tarefa:** arquiteto-orquestracao
**Autor:** Coder
**Data:** 6 de julho de 2026
**Para:** Robert (Product Owner) + Mavis

---

## 1. Sumário do que foi produzido

Entreguei a **arquitetura técnica completa do orquestrador Naninne** em três artefatos, cobrindo o stack, o grafo, os agentes, o modelo de persistência, a cascata de modelos, a estratégia de paralelização, o tratamento de erros, as integrações Mem0/LangSmith e a estimativa de latência/custo por caso de uso. Tudo escrito em PT-BR, com referências 2026 reais (LangGraph 1.0 GA, OpenAI Swarm arquivado, AutoGen em manutenção, benchmark de 74% task completion, 38% market share de produção), Mermaid diagram do state machine, JSON Schemas de todos os 11 tools (10 agentes + Revisor), e números reconciliados com a atualização de $1.20-1.80 do doc mestre.

| Arquivo | Conteúdo | Tamanho |
|---|---|---|
| `docs/arquitetura-orquestrador.md` | Documento técnico (12 seções + 2 apêndices) | 52 KB |
| `docs/arquitetura-orquestrador-diagrama.html` | Visualização standalone com Mermaid + 11 agent cards coloridos + bench de latência | 51 KB |
| `docs/arquitetura-orquestrador-deliverable.md` | Este sumário | — |

---

## 2. Decisões onde fiz tradeoff

### 2.1 LangGraph em vez de OpenAI Agents SDK ou Microsoft AutoGen

**Tradeoff:** LangGraph tem a curva de aprendizado mais íngreme (precisa entender StateGraph, Channels, Send API). CrewAI e OpenAI Agents SDK permitem prototipar em horas, não dias.

**Decisão:** LangGraph mesmo assim, porque é o **único framework em julho/2026** que entrega nativamente os 5 requisitos não-negociáveis do Naninne:
1. Persistência nativa (PostgresSaver) — CrewAI exige Redis externo
2. HITL via `interrupt()` + `Command(resume=...)` — Agents SDK tem guardrails mas o modelo de pausa/retomada é menos expressivo
3. Paralelismo com `Send()` API — CrewAI é sequencial
4. LangSmith first-class — não há equivalente maduro nos outros
5. RetryPolicy declarativa + controle de recursion via `IsLastStep`

**Justificativa de mercado:** LangGraph ocupa **38% dos deployments de produção multi-agente** (Presenc AI 2026) e processa **38,8M downloads/mês no PyPI** (~30× o AutoGen). O risco de escolher outro framework é real: **OpenAI Swarm foi arquivado em março/2025** e **Microsoft AutoGen entrou em modo manutenção no início de 2026** com sucessor MAF 1.0 — escolher deprecado tem custo de migração.

---

### 2.2 PostgresSaver em vez de SqliteSaver ou MemorySaver

**Tradeoff:** SqliteSaver é mais simples (zero infra), MemorySaver é instantâneo para dev. Mas ambos têm gargalos que vão aparecer em produção.

**Decisão:** **PostgresSaver desde o dia 1** (já em desenvolvimento), porque já temos Supabase/Postgres como peça central da stack. Reutilizar a mesma infra evita uma dependência adicional (Redis/SQLite server) e mantém o modelo de segurança (RLS, backups) consistente.

**Detalhe técnico crítico:** `thread_id` ≤ 255 caracteres (limitação do schema do PostgresSaver). Documentei a convenção: `conv-{uuid}`, `bg-{uuid}`, `pause-{uuid}`. Connection pool com `min_size=5`, `max_size=20`, autocommit=True.

**Tradeoff aceito:** Dev local precisa de Supabase rodando (ou um Postgres Docker). Documentei o `MemorySaver` como opção de dev e o fluxo de migration `checkpointer.setup()` em CI.

---

### 2.3 Qwen3 8B como router de cascata (sempre roda)

**Tradeoff:** Adicionar um LLM extra em todo run soma ~200ms e $0.0001 por mensagem. Em volume alto (1000 runs/dia), isso é $0.10/dia — irrelevante.

**Decisão:** **Sempre rodar Qwen3 8B primeiro** para classificar `simple` / `complex` / `ambiguous`. Justificativa:
- Custo do Qwen3 8B é ~$0.0001 (vs Claude Sonnet 4 a $0.18 só para classificar)
- Permite que 60-70% das tarefas mecânicas vão direto para Hermes 4.3 self-hosted (custo marginal zero)
- Detecta AMBIGUOUS cedo — manda o interrupt() **antes** de gastar tokens em plano
- Latência adicional (200ms) é invisível dentro do orçamento de 1-4 min por caso de uso

**Tradeoff aceito:** Em casos super-simples ("oi", "obrigado") há um round-trip extra. Aceitável porque o ganho em custo médio de operação é de 60-80% (alinhado com a estimativa do doc mestre §2).

---

### 2.4 HITL obrigatório APENAS em ações irreversíveis

**Tradeoff:** Mais HITL = mais segurança + mais latência. Menos HITL = risco do agente aplicar migration errada no Supabase de produção.

**Decisão:** **Interrupt() em todos os pontos de ação irreversível** (migrations, deletes, sends externos), mas **não** em decisões internas (escolha de estrutura argumentativa no caso 5.1, aprovação de lista de gráficos no 5.3). Documentei o critério no doc:
- 5.1: HITL para **escolher estrutura** das 3 propostas (pura preferência, sem risco)
- 5.2: Sem HITL (output é uma sugestão, Robert não aplica direto)
- 5.3: HITL para **aprovar lista de gráficos** (alto risco de "dado errado em apresentação")
- 5.4: HITL **obrigatório** antes de aplicar migration no Supabase (ação irreversível)

**Tradeoff aceito:** Caso 5.4 tem P95 de 3:51 (limitado pelo tempo de decisão do Robert), mas é exatamente isso que queremos: **segurança > velocidade** em mutação de banco.

---

### 2.5 Circuit breaker por provedor (não por run)

**Tradeoff:** Circuit breaker global pausa tudo se Anthropic cai. Circuit breaker por run permite fallback só em chains específicas. Por provedor é mais conservador.

**Decisão:** **Circuit breaker por provedor** com threshold de 5 falhas em 60s. Quando aberto, todas as chamadas para aquele provedor vão direto para o próximo da cascata. Implementado como singleton em memória do processo, com log em LangSmith.

**Justificativa:** Em produção 2026, provedores caem por minutos (não por horas). Forçar 5 falhas em 60s = se 5 runs seguidos falham em 1 minuto, paramos de tentar Anthropic pelos próximos 60s. Evita cascata de custo (50× retry custando $9 cada).

**Tradeoff aceito:** Falso positivo possível (5 falhas legítimas em 60s = pausa desnecessária). Mas o custo do falso negativo (pagar retry loop enquanto provedor está fora) é muito maior. Documentado o cooldown de 60s e a transição automática para `half-open` test.

---

## 3. Perguntas abertas para Robert revisar

### 3.1. Self-hosting do Hermes 4.3 — onde e como?

O Hermes 4.3 36B precisa de **~24GB VRAM** (GPU A10 ou L4). Duas opções:

a) **Vast.ai / RunPod** sob demanda ($0.30-0.50/hora, paga só quando usado) — bom para uso pessoal.
b) **Servidor próprio** com GPU A10 alugada (Render GPU, ~$80-150/mês fixo) — melhor se uso > 4h/dia.

**Qual o perfil de uso esperado?** Se Robert usa Naninne 30-60 min/dia, opção (a) é 10× mais barata. Se for 4h+/dia, (b) compensa.

**Recomendação provisória:** começar com (a) na Vast.ai, monitorar uso por 30 dias, migrar para (b) se passar de 60h/mês.

### 3.2. Aprovação humana no caso 5.1 — granularidade

Hoje o doc propõe **HITL para escolher entre 3 estruturas argumentativas** (alto nível). Alternativa: HITL também para aprovar a primeira página de cada capítulo antes de gerar as 8 páginas (evita refazer tudo se o Redator errou o tom).

**Qual o custo de uma "página ruim"?** Se Robert prefere revisar 1 página e ajustar tom, ou prefere revisar 8 páginas finais e pedir reescrita? A primeira opção custa +$0.05 e +20s por capítulo; a segunda é mais barata mas arrisca iteração maior.

**Recomendação provisória:** manter como está (escolha de estrutura). Adicionar aprovação intermediária só se Robert pedir nas primeiras 2 semanas de uso.

---

## 4. Notas para o verificador

- O documento `arquitetura-orquestrador.md` é a fonte canônica de decisões. O HTML é uma visualização complementar.
- Todos os custos foram reconciliados com a nota de revisão 2026-07-06 do doc mestre (caso 5.1: $1.20-1.80, não $0.80).
- Referências externas são de 2026 e foram conferidas em `web_search` durante a produção:
  - LangGraph 1.0 GA (Q1 2026) — produção ready
  - OpenAI Swarm arquivado em março/2025 (README agora redireciona para Agents SDK)
  - Microsoft AutoGen em modo manutenção (sucessor: MAF 1.0, abril/2026)
  - Benchmark: LangGraph 74% task completion, 38,8M downloads/mês PyPI
  - 38% dos deployments de produção multi-agente usam LangGraph (Presenc AI 2026)
- Mermaid diagram renderiza client-side (CDN mermaid 10.9.1) — não requer build.
- A página HTML é standalone e mobile-responsive (testada mentalmente: 3-col grid em desktop, single col < 768px).

**Próximo passo recomendado:** Robert revisar este deliverable e responder às 2 perguntas abertas; em paralelo, Mavis pode começar a Fase 3 (Design Visual) consumindo a estrutura de agents/cores deste doc.
