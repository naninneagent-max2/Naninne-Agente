/**
 * Quick actions for the Início page.
 * 6 actions mapped to the 4 project palettes + a couple of utility actions.
 */
import { BookOpen, Search, Globe, BarChart3, FileText, RefreshCcw } from "lucide-react";

export const QUICK_ACTIONS = [
  {
    id: "qa1",
    label: "Escrever capítulo",
    sub: "Continue seu livro em andamento",
    icon: BookOpen,
    project: "writing" as const,
  },
  {
    id: "qa2",
    label: "Buscar na biblioteca",
    sub: "Encontre qualquer arquivo semântico",
    icon: Search,
    project: "av" as const, // uses an accent palette for differentiation
  },
  {
    id: "qa3",
    label: "Pesquisar na web",
    sub: "Notícias e dados atualizados",
    icon: Globe,
    project: "mkt" as const,
  },
  {
    id: "qa4",
    label: "Analisar planilha",
    sub: "KPIs, gráficos e tendências",
    icon: BarChart3,
    project: "tech" as const,
  },
  {
    id: "qa5",
    label: "Gerar documento",
    sub: "Ata, relatório ou capítulo",
    icon: FileText,
    project: "writing" as const,
  },
  {
    id: "qa6",
    label: "Sincronizar repos",
    sub: "GitHub + Supabase",
    icon: RefreshCcw,
    project: "tech" as const,
  },
];
