import {
  Home,
  Library,
  BookOpen,
  Film,
  TrendingUp,
  FileText,
  Brain,
  Wrench,
  Settings,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  id: string;
  label: string;
  href: string;
  icon: LucideIcon;
  /** Optional badge (e.g. count of items) */
  badge?: string | number;
  /** Project palette used to colorize the active state */
  projectColor?: "primary" | "writing" | "av" | "mkt" | "tech";
}

export const PRIMARY_NAV: NavItem[] = [
  { id: "inicio", label: "Início", href: "/", icon: Home, projectColor: "primary" },
  { id: "biblioteca", label: "Biblioteca", href: "/biblioteca", icon: Library, projectColor: "primary" },
  { id: "escrita", label: "Escrita Criativa", href: "/escrita", icon: BookOpen, projectColor: "writing" },
  { id: "audiovisual", label: "Audiovisual", href: "/audiovisual", icon: Film, projectColor: "av" },
  { id: "mercado", label: "Mercado", href: "/mercado", icon: TrendingUp, projectColor: "mkt" },
  { id: "documentos", label: "Documentos", href: "/documentos", icon: FileText, projectColor: "primary" },
  { id: "memoria", label: "Memória", href: "/memoria", icon: Brain, projectColor: "primary" },
  { id: "gestao", label: "Gestão Técnica", href: "/gestao", icon: Wrench, projectColor: "tech" },
  { id: "configuracoes", label: "Configurações", href: "/configuracoes", icon: Settings, projectColor: "primary" },
];

/** Map project palette token → Tailwind class set for the active nav item */
export const projectActiveClass: Record<NonNullable<NavItem["projectColor"]>, string> = {
  primary: "bg-primary-50 text-primary-700",
  writing: "bg-writing-100 text-writing-700",
  av: "bg-av-100 text-av-700",
  mkt: "bg-mkt-100 text-mkt-700",
  tech: "bg-tech-100 text-tech-700",
};
