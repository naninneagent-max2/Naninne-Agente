export type Template = {
  id: string;
  label: string;
  icon: string; // emoji or lucide name
  description: string;
  projectSlug?: string; // optional, biases to a project
  prompt: string;
};

export const TEMPLATES: Template[] = [
  {
    id: "tpl-capitulo",
    label: "Escrever capítulo",
    icon: "📖",
    description: "Continuar de onde você parou com tom e estrutura consistentes",
    projectSlug: "escrita",
    prompt:
      "Vamos trabalhar no livro que está em andamento. Estou no capítulo atual e quero continuar. " +
      "Por favor: (1) me dê um resumo do tom e ritmo dos capítulos anteriores (use a biblioteca como referência), " +
      "(2) sugira o foco narrativo do próximo capítulo cruzando com O Pequeno Príncipe, " +
      "(3) escreva 8 páginas em estilo literário mantendo a voz autoral.",
  },
  {
    id: "tpl-cena",
    label: "Criar cena de roteiro",
    icon: "🎬",
    description: "Estruturar cena com composição e prompt Midjourney",
    projectSlug: "audiovisual",
    prompt:
      "Preciso estruturar uma cena de roteiro. Me ajude a definir: (1) a situação dramática e as forças em jogo, " +
      "(2) a composição de câmera (plano, movimento, luz), (3) o diálogo (sucinto, subtexto), " +
      "(4) gere o prompt Midjourney em inglês com estilo cinematográfico para servir de concept art.",
  },
  {
    id: "tpl-analisar",
    label: "Analisar dados de mercado",
    icon: "📊",
    description: "Subir planilha + pergunta de negócio",
    projectSlug: "mercado",
    prompt:
      "Vou subir uma planilha em seguida. Quero que você me dê: (1) KPIs principais (com números e contexto), " +
      "(2) outliers e o que eles significam, (3) correlações não óbvias, " +
      "(4) 3-5 recomendações acionáveis. Use a biblioteca se houver material sobre o segmento.",
  },
  {
    id: "tpl-revisar",
    label: "Revisar capítulo",
    icon: "🪞",
    description: "Checklist narrativo + sugestões cirúrgicas",
    projectSlug: "escrita",
    prompt:
      "Vou colar um capítulo ou trecho logo abaixo. Quero uma revisão focada em: " +
      "(1) arco narrativo (tensão, ritmo, clímax), (2) voz e consistência de tom, " +
      "(3) fraseado (clareza, ritmo, vícios), (4) diálogos (subtexto, naturalidade). " +
      "Marque trechos específicos e proponha reescritas cirúrgicas, não genéricas.",
  },
  {
    id: "tpl-pesquisar",
    label: "Pesquisar contexto",
    icon: "🔎",
    description: "Buscar fontes relevantes na biblioteca + nota explicativa",
    prompt:
      "Quero entender o seguinte tópico. Primeiro cruze com o que já está na minha biblioteca " +
      "(notas, trechos de livros, documentos). Depois indique o que vale aprofundar e por quê. " +
      "Cite trechos específicos que sustentem cada afirmação.",
  },
  {
    id: "tpl-sintetizar",
    label: "Sintetizar conversa",
    icon: "🧠",
    description: "Extrair memórias úteis + estruturar próximos passos",
    prompt:
      "Vamos consolidar o que conversamos até aqui. Me dê: " +
      "(1) os 3-5 pontos mais importantes que precisam ficar na memória, " +
      "(2) decisões ou compromissos assumidos, " +
      "(3) próximos passos concretos (o quê + quando).",
  },
];

export function templatesForProject(slug?: string | null): Template[] {
  if (!slug) return TEMPLATES;
  return TEMPLATES.filter((t) => !t.projectSlug || t.projectSlug === slug);
}
