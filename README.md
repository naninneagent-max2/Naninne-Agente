# Naninne — Seu Segundo Cérebro Digital

> Assistente pessoal inteligente com biblioteca universal, agentes multi-modelo (Claude + Gemini + Hermes + Llama + Devstral) e interface minimalista.

## 📚 Documentação Canônica

Leia primeiro: **[DOCUMENTO-MESTRE.md](./DOCUMENTO-MESTRE.md)** — visão completa do produto, agentes, casos de uso e stack.

## 🗂️ Estrutura

```
├── web/              # Next.js 15 + TypeScript + Tailwind + shadcn/ui (frontend)
├── backend/          # Python 3.11 + FastAPI + LangGraph (orquestrador)
├── supabase/         # Schema SQL + migrations + storage + verify scripts
├── docs/             # Arquitetura, custos, design system, mockups HTML
└── mockups/          # 5 mockups de alta fidelidade (HTML standalone)
```

## 🚀 Quick start (desenvolvimento local)

```bash
# Frontend
cd web && npm install && npm run dev    # http://localhost:3000

# Backend
cd backend && python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000   # http://localhost:8000

# Supabase local (requer Docker)
cd supabase && npx supabase start
```

## ☁️ Deploy (produção)

Recomendado:
- **Vercel** para `web/` + API routes Python
- **Supabase Cloud** para banco + auth + storage
- Free tiers em ambos, sem cartão

## 📊 Status atual

| Fase | Status |
|---|---|
| Fase 1 — Descoberta | ✅ Concluída |
| Fase 2 — Arquitetura | ✅ Concluída |
| Fase 3 — Design | ✅ Concluída |
| **Sprint 0 (Fundação)** | ✅ Concluído |
| Sprint 1+ (features) | ⏸ Próximo |

## 🔗 Links úteis

- Documento Mestre: [DOCUMENTO-MESTRE.md](./DOCUMENTO-MESTRE.md)
- Arquitetura: [docs/arquitetura-orquestrador.md](./docs/arquitetura-orquestrador.md)
- Design System: [docs/design-system.md](./docs/design-system.md)
- Schema do banco: [supabase/migrations/](./supabase/migrations/)
- Mockups: [mockups/](./mockups/)
