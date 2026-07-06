import { PagePlaceholder } from "@/components/ui/page-placeholder";

export const metadata = {
  title: "Gestão Técnica",
  description: "Saúde do sistema, logs de agentes, custos e pendências.",
};

export default function GestaoPage() {
  return (
    <PagePlaceholder
      title="Gestão Técnica"
      subtitle="Saúde do sistema, logs, custos e fila de operações"
      description="Painel transparente sobre o que está acontecendo: modelos em uso, custos por operação, fila de tarefas, logs auditáveis e checkpoints de segurança."
      sprint="Previsão: Sprint 2"
      iconName="Wrench"
      features={[
        "Status ao vivo de cada agente (ocioso, em operação, com erro)",
        "Custos discriminados por modelo, projeto e tipo de operação",
        "Fila de tarefas longas com possibilidade de pausar, retomar ou cancelar",
        "Logs auditáveis de toda ação irreversível (quem pediu, quando, com aprovação)",
        "Repositórios GitHub sincronizados e migrations Supabase pendentes",
      ]}
    />
  );
}
