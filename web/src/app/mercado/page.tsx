import { PagePlaceholder } from "@/components/ui/page-placeholder";

export const metadata = {
  title: "Mercado",
  description: "Análise de planilhas, dados comerciais e apresentações executivas.",
};

export default function MercadoPage() {
  return (
    <PagePlaceholder
      title="Mercado"
      subtitle="Análise de planilhas, dados comerciais e apresentações executivas"
      description="Aqui você carrega planilhas, pede KPIs, gráficos e apresentações executivas com dados oficiais verificados."
      sprint="Previsão: Sprint 4"
      iconName="TrendingUp"
      features={[
        "Upload de planilhas Excel/Google Sheets com leitura semântica",
        "Geração de 8+ gráficos automáticos (linha, barra, pizza, mapa de calor)",
        "Apresentações executivas em PowerPoint/Google Slides prontas para envio",
        "Pesquisa web em tempo real (ABIEC, Cepea, Scot, IBGE) com fonte em cada número",
        "Conector com WhatsApp e e-mail para envio de relatórios ao time",
      ]}
    />
  );
}
