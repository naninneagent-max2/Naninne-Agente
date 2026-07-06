import { create } from "zustand";

export type AgentName = "memoria" | "bibliotecario" | "leitor" | "orquestrador" | "revisor";

export type AgentStep = {
  id: string;
  agent: AgentName;
  label: string;
  state: "done" | "active" | "pending";
  detail?: string;
};

type AgentStore = {
  steps: AgentStep[];
  sources: Array<{ library_item_id: string; title: string; similarity: number }>;
  tokensIn: number;
  tokensOut: number;
  cost: number;
  isActive: boolean;
  lastDocumentId: string | null;
  reset: () => void;
  setSteps: (steps: AgentStep[]) => void;
  updateStep: (id: string, state: AgentStep["state"], detail?: string) => void;
  setActive: (active: boolean) => void;
  appendText: (text: string) => void;
  fullText: string;
  setFullText: (text: string) => void;
  setSources: (sources: AgentStore["sources"]) => void;
  setTokens: (inT: number, outT: number, cost: number) => void;
  setDocumentId: (id: string | null) => void;
};

const INITIAL: AgentStep[] = [
  { id: "s1", agent: "memoria", label: "Memória", state: "pending" },
  { id: "s2", agent: "bibliotecario", label: "Bibliotecário", state: "pending" },
  { id: "s3", agent: "leitor", label: "Leitor", state: "pending" },
  { id: "s4", agent: "orquestrador", label: "Compondo resposta", state: "pending" },
  { id: "s5", agent: "revisor", label: "Auditoria", state: "pending" },
];

export const useAgents = create<AgentStore>((set) => ({
  steps: INITIAL,
  sources: [],
  tokensIn: 0,
  tokensOut: 0,
  cost: 0,
  isActive: false,
  lastDocumentId: null,
  fullText: "",
  reset: () =>
    set({
      steps: INITIAL.map((s) => ({ ...s, state: "pending", detail: undefined })),
      sources: [],
      tokensIn: 0,
      tokensOut: 0,
      cost: 0,
      fullText: "",
      isActive: true,
    }),
  setSteps: (steps) => set({ steps }),
  updateStep: (id, state, detail) =>
    set((s) => ({
      steps: s.steps.map((st) => (st.id === id ? { ...st, state, detail } : st)),
    })),
  setActive: (active) => set({ isActive: active }),
  appendText: (text) => set((s) => ({ fullText: s.fullText + text })),
  setFullText: (text) => set({ fullText: text }),
  setSources: (sources) => set({ sources }),
  setTokens: (tokensIn, tokensOut, cost) => set({ tokensIn, tokensOut, cost }),
  setDocumentId: (id) => set({ lastDocumentId: id }),
}));
