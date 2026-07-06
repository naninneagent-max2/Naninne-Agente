import { PagePlaceholder } from "@/components/ui/page-placeholder";

export const metadata = {
  title: "Documentos",
  description: "Lista de todos os documentos gerados pelos agentes.",
};

export default function DocumentosPage() {
  return (
    <PagePlaceholder
      title="Documentos"
      subtitle="Lista de tudo que foi gerado (atas, capítulos, relatórios, apresentações)"
      description="Cada documento gerado pelos agentes aparece aqui, organizado por projeto, data e tipo. Tudo versionado e reversível."
      sprint="Previsão: Sprint 1"
      iconName="FileText"
      features={[
        "Lista cronológica de documentos gerados com filtros por projeto e tipo",
        "Diff visual entre versões com restauração em 1 clique",
        "Exportação em PDF, DOCX, Markdown e link compartilhável",
        "Busca semântica dentro do conteúdo de todos os documentos",
        "Agrupamento por conversa de origem (qual pedido gerou o quê)",
      ]}
    />
  );
}
