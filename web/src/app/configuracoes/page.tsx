import { PagePlaceholder } from "@/components/ui/page-placeholder";

export const metadata = {
  title: "Configurações",
  description: "Conecte serviços, ajuste modelos e personalize sua experiência.",
};

export default function ConfiguracoesPage() {
  return (
    <PagePlaceholder
      title="Configurações"
      subtitle="Conecte serviços, ajuste modelos e personalize sua experiência"
      description="Tudo que você pode ajustar: chaves de API, modelos preferidos por tipo de tarefa, integrações (GitHub, Google Drive, Notion) e aparência."
      sprint="Previsão: Sprint 1"
      iconName="Settings"
      features={[
        "Chaves de API (OpenAI, Anthropic, Google) com criptografia em repouso",
        "Escolha de modelo por tipo de tarefa (custo × qualidade por caso de uso)",
        "Integrações com GitHub, Google Drive, Notion, WhatsApp e e-mail",
        "Tema claro/escuro/sistema + densidade de interface (confortável/compacta)",
        "Gerenciamento de consentimento (quais dados vão para qual modelo)",
      ]}
    />
  );
}
