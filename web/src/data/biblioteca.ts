/**
 * Mock data for the Biblioteca tab — 20 realistic items.
 * Format diversity: PDF, MP3, JPG, DOCX, TXT, MP4, EML, etc.
 * NO Lorem ipsum — content reflects a personal/professional library
 * of a Brazilian user (Robert, the Naninne PO).
 */
export type FileType = "pdf" | "audio" | "image" | "doc" | "video" | "web" | "text";

export interface LibraryItem {
  id: string;
  name: string;
  type: FileType;
  sizeKb: number;
  addedAt: string; // ISO
  tags: string[];
  project: "escrita" | "audiovisual" | "mercado" | "tech" | "geral";
  source?: string;
}

const tag = (...t: string[]) => t;

export const BIBLIOTECA_ITEMS: LibraryItem[] = [
  {
    id: "b01",
    name: "O Príncipe — Maquiavel.pdf",
    type: "pdf",
    sizeKb: 1820,
    addedAt: "2026-07-04",
    tags: tag("livro", "filosofia", "clássico"),
    project: "escrita",
  },
  {
    id: "b02",
    name: "Reunião Casa de Memória 2026-07-01.mp3",
    type: "audio",
    sizeKb: 12340,
    addedAt: "2026-07-01",
    tags: tag("reunião", "transcrição pendente"),
    project: "geral",
  },
  {
    id: "b03",
    name: "Recibo papelaria 2026-06-28.jpg",
    type: "image",
    sizeKb: 240,
    addedAt: "2026-06-28",
    tags: tag("recibo", "despesa"),
    project: "mercado",
  },
  {
    id: "b04",
    name: "Roteiro O INVISÍVEL — v3 FINAL.pdf",
    type: "pdf",
    sizeKb: 4520,
    addedAt: "2026-06-25",
    tags: tag("roteiro", "noir", "v3"),
    project: "audiovisual",
  },
  {
    id: "b05",
    name: "Anotações de leitura — Cap. XVIII.docx",
    type: "doc",
    sizeKb: 88,
    addedAt: "2026-06-24",
    tags: tag("anotação", "escrita"),
    project: "escrita",
  },
  {
    id: "b06",
    name: "Apresentação Pecuária 2025 Q4.pptx",
    type: "doc",
    sizeKb: 6230,
    addedAt: "2026-06-22",
    tags: tag("apresentação", "RC Agropecuária"),
    project: "mercado",
  },
  {
    id: "b07",
    name: "WhatsApp Robert + Maria 2026-06-20.txt",
    type: "text",
    sizeKb: 32,
    addedAt: "2026-06-20",
    tags: tag("conversa", "whatsapp"),
    project: "geral",
  },
  {
    id: "b08",
    name: "Casa de Memória — Planta baixa.pdf",
    type: "pdf",
    sizeKb: 3140,
    addedAt: "2026-06-18",
    tags: tag("projeto", "arquitetura"),
    project: "geral",
  },
  {
    id: "b09",
    name: "Moodboard O INVISÍVEL — frame 01.jpg",
    type: "image",
    sizeKb: 1980,
    addedAt: "2026-06-15",
    tags: tag("moodboard", "referência visual"),
    project: "audiovisual",
  },
  {
    id: "b10",
    name: "Planilha controle de gado 2026.xlsx",
    type: "doc",
    sizeKb: 410,
    addedAt: "2026-06-12",
    tags: tag("planilha", "RC Agropecuária", "KPI"),
    project: "mercado",
  },
  {
    id: "b11",
    name: "Áudio meditação guiada 10min.m4a",
    type: "audio",
    sizeKb: 5680,
    addedAt: "2026-06-10",
    tags: tag("pessoal", "wellness"),
    project: "geral",
  },
  {
    id: "b12",
    name: "The Atlantic — AI Agents 2026.pdf",
    type: "pdf",
    sizeKb: 1240,
    addedAt: "2026-06-08",
    tags: tag("artigo", "IA", "inglês"),
    project: "tech",
  },
  {
    id: "b13",
    name: "Referência Blade Runner 2049 — cena chuva.mp4",
    type: "video",
    sizeKb: 48230,
    addedAt: "2026-06-05",
    tags: tag("referência", "cinematografia"),
    project: "audiovisual",
  },
  {
    id: "b14",
    name: "Email cliente RC Agropecuária 2026-05-30.eml",
    type: "text",
    sizeKb: 18,
    addedAt: "2026-05-30",
    tags: tag("email", "cliente"),
    project: "mercado",
  },
  {
    id: "b15",
    name: "Foto quadro Caspar David Friedrich.jpg",
    type: "image",
    sizeKb: 3120,
    addedAt: "2026-05-28",
    tags: tag("moodboard", "pintura", "romantismo"),
    project: "audiovisual",
  },
  {
    id: "b16",
    name: "Anotação solta — 'a biblioteca é uma máquina do tempo'.md",
    type: "text",
    sizeKb: 4,
    addedAt: "2026-05-26",
    tags: tag("ideia", "anotação rápida"),
    project: "escrita",
  },
  {
    id: "b17",
    name: "ABIEC — Relatório Anual Pecuária 2025.pdf",
    type: "pdf",
    sizeKb: 7820,
    addedAt: "2026-05-22",
    tags: tag("relatório", "fonte oficial"),
    project: "mercado",
  },
  {
    id: "b18",
    name: "LangGraph docs — multi-agent patterns.pdf",
    type: "pdf",
    sizeKb: 2240,
    addedAt: "2026-05-20",
    tags: tag("documentação", "LangGraph"),
    project: "tech",
  },
  {
    id: "b19",
    name: "Nota fiscal Combustível Posto Ipiranga.pdf",
    type: "pdf",
    sizeKb: 96,
    addedAt: "2026-05-18",
    tags: tag("recibo", "combustível"),
    project: "mercado",
  },
  {
    id: "b20",
    name: "Página salva — Vila Itororó (arquitetura paulistana).url",
    type: "web",
    sizeKb: 1,
    addedAt: "2026-05-15",
    tags: tag("web", "arquitetura", "São Paulo"),
    project: "geral",
  },
];
