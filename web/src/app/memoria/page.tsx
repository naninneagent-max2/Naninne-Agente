import { PagePlaceholder } from "@/components/ui/page-placeholder";

export const metadata = {
  title: "Memória",
  description: "Veja e edite tudo o que Naninne sabe sobre você.",
};

export default function MemoriaPage() {
  return (
    <PagePlaceholder
      title="Memória"
      subtitle="Tudo o que Naninne lembra sobre você, seus projetos e preferências"
      description="Aqui você vê, edita e apaga cada memória que Naninne acumulou. Total transparência e controle sobre o que entra no contexto das conversas."
      sprint="Previsão: Sprint 1"
      iconName="Brain"
      features={[
        "Timeline de memórias com data, origem e projeto associado",
        "Editor inline: corrija, refine ou apague qualquer memória",
        "Marcadores manuais de preferência (tom literário, formato favorito, etc.)",
        "Modo 'soneca' para esquecer temporariamente um projeto sem perder histórico",
        "Exportação completa de todas as memórias em JSON (portabilidade total)",
      ]}
    />
  );
}
