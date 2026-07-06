import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from "docx";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* eslint-disable @typescript-eslint/no-explicit-any */

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }
    const url = new URL(request.url);
    const format = (url.searchParams.get("format") ?? "markdown").toLowerCase();

    const { data: doc, error } = await supabase
      .from("generated_documents")
      .select("id, title, description, format, status, content, metadata, created_at")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();
    if (error || !doc) {
      return NextResponse.json({ error: "Documento não encontrado" }, { status: 404 });
    }

    const filename = sanitizeFilename(doc.title);

    if (format === "docx") {
      const buffer = await generateDocx(doc);
      return new Response(buffer as any, {
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          "Content-Disposition": `attachment; filename="${filename}.docx"`,
        },
      });
    }

    if (format === "pdf") {
      // Server-side PDF is expensive. Redirect to client print view.
      return NextResponse.redirect(new URL(`/documentos/${id}/print`, request.url), 302);
    }

    // Default: markdown
    const md = (doc as any).content ?? "";
    return new Response(md, {
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}.md"`,
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

function sanitizeFilename(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9-_ ]/g, "")
    .replace(/\s+/g, "_")
    .slice(0, 80);
}

async function generateDocx(doc: any): Promise<Buffer> {
  const lines = (doc.content as string ?? "").split("\n");

  const paragraphs: Paragraph[] = [];

  // Title
  paragraphs.push(
    new Paragraph({
      text: doc.title,
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.LEFT,
      spacing: { after: 200 },
    })
  );

  // Metadata line
  const metaText = [
    doc.description ? doc.description : null,
    new Date(doc.created_at).toLocaleString("pt-BR"),
  ]
    .filter(Boolean)
    .join(" · ");
  if (metaText) {
    paragraphs.push(
      new Paragraph({
        children: [
          new TextRun({
            text: metaText,
            italics: true,
            color: "666666",
            size: 18,
          }),
        ],
        spacing: { after: 300 },
      })
    );
  }

  // Body — convert markdown to docx paragraphs
  let inCodeBlock = false;
  for (const line of lines) {
    if (line.startsWith("```")) {
      inCodeBlock = !inCodeBlock;
      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({
              text: inCodeBlock ? "[código]" : "",
              italics: true,
              color: "888888",
            }),
          ],
          spacing: { before: 100, after: 100 },
        })
      );
      continue;
    }

    // Markdown headings → docx headings
    if (line.startsWith("# ")) {
      paragraphs.push(
        new Paragraph({
          text: line.slice(2),
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 300, after: 150 },
        })
      );
      continue;
    }
    if (line.startsWith("## ")) {
      paragraphs.push(
        new Paragraph({
          text: line.slice(3),
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 200, after: 100 },
        })
      );
      continue;
    }
    if (line.startsWith("### ")) {
      paragraphs.push(
        new Paragraph({
          text: line.slice(4),
          heading: HeadingLevel.HEADING_3,
          spacing: { before: 200, after: 100 },
        })
      );
      continue;
    }
    if (line.startsWith("#### ")) {
      paragraphs.push(
        new Paragraph({
          text: line.slice(5),
          heading: HeadingLevel.HEADING_4,
          spacing: { before: 150, after: 100 },
        })
      );
      continue;
    }

    // Horizontal rule
    if (line.trim() === "---" || line.trim() === "***") {
      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({
              text: "─".repeat(60),
              color: "cccccc",
            }),
          ],
          alignment: AlignmentType.CENTER,
          spacing: { before: 200, after: 200 },
        })
      );
      continue;
    }

    // Empty line → paragraph break
    if (line.trim() === "") {
      paragraphs.push(new Paragraph({ text: "" }));
      continue;
    }

    // Bullet list
    if (line.match(/^\s*[-*]\s/)) {
      const text = line.replace(/^\s*[-*]\s/, "");
      paragraphs.push(
        new Paragraph({
          children: [new TextRun({ text })],
          bullet: { level: 0 },
          spacing: { after: 80 },
        })
      );
      continue;
    }

    // Numbered list
    if (line.match(/^\s*\d+\.\s/)) {
      const text = line.replace(/^\s*\d+\.\s/, "");
      paragraphs.push(
        new Paragraph({
          children: [new TextRun({ text })],
          numbering: { reference: "default-numbering", level: 0 },
          spacing: { after: 80 },
        })
      );
      continue;
    }

    // Blockquote
    if (line.startsWith("> ")) {
      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({
              text: line.slice(2),
              italics: true,
              color: "555555",
            }),
          ],
          indent: { left: 720 },
          spacing: { after: 100 },
        })
      );
      continue;
    }

    // Regular paragraph — handle **bold** and *italic*
    const runs = parseInlineFormatting(line);
    paragraphs.push(
      new Paragraph({
        children: runs,
        spacing: { after: 120 },
        alignment: AlignmentType.JUSTIFIED,
      })
    );
  }

  const document = new Document({
    creator: "Naninne",
    title: doc.title,
    description: doc.description ?? undefined,
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 1134, // 2 cm
              right: 1134,
              bottom: 1134,
              left: 1134,
            },
          },
        },
        children: paragraphs,
      },
    ],
    numbering: {
      config: [
        {
          reference: "default-numbering",
          levels: [
            {
              level: 0,
              format: "decimal",
              text: "%1.",
              alignment: AlignmentType.START,
            },
          ],
        },
      ],
    },
  });

  return await Packer.toBuffer(document);
}

function parseInlineFormatting(line: string): TextRun[] {
  const runs: TextRun[] = [];
  // Tokenize on **bold**, *italic*, `code`, [text](url)
  const tokens = tokenizeInline(line);
  for (const tok of tokens) {
    if (tok.type === "code") {
      runs.push(new TextRun({ text: tok.text, font: "Courier New", color: "c7254e" }));
    } else if (tok.type === "bold") {
      runs.push(new TextRun({ text: tok.text, bold: true }));
    } else if (tok.type === "italic") {
      runs.push(new TextRun({ text: tok.text, italics: true }));
    } else if (tok.type === "bolditalic") {
      runs.push(new TextRun({ text: tok.text, bold: true, italics: true }));
    } else if (tok.type === "link") {
      runs.push(
        new TextRun({
          text: tok.text,
          color: "0563C1",
          underline: { type: "single", color: "0563C1" },
        })
      );
    } else {
      runs.push(new TextRun({ text: tok.text }));
    }
  }
  return runs;
}

type Token = { type: "text" | "code" | "bold" | "italic" | "bolditalic" | "link"; text: string; url?: string };

function tokenizeInline(line: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  let buf = "";
  while (i < line.length) {
    // **bold**
    if (line[i] === "*" && line[i + 1] === "*") {
      if (buf) {
        tokens.push({ type: "text", text: buf });
        buf = "";
      }
      const end = line.indexOf("**", i + 2);
      if (end === -1) {
        buf += line.slice(i);
        break;
      }
      const boldText = line.slice(i + 2, end);
      // Check for *italic* inside the bold text
      tokens.push({ type: "bold", text: boldText });
      i = end + 2;
      continue;
    }
    // `code`
    if (line[i] === "`") {
      if (buf) {
        tokens.push({ type: "text", text: buf });
        buf = "";
      }
      const end = line.indexOf("`", i + 1);
      if (end === -1) {
        buf += line.slice(i);
        break;
      }
      tokens.push({ type: "code", text: line.slice(i + 1, end) });
      i = end + 1;
      continue;
    }
    // *italic*
    if (line[i] === "*") {
      if (buf) {
        tokens.push({ type: "text", text: buf });
        buf = "";
      }
      const end = line.indexOf("*", i + 1);
      if (end === -1) {
        buf += line.slice(i);
        break;
      }
      tokens.push({ type: "italic", text: line.slice(i + 1, end) });
      i = end + 1;
      continue;
    }
    // [text](url)
    if (line[i] === "[") {
      const linkMatch = line.slice(i).match(/^\[([^\]]+)\]\(([^)]+)\)/);
      if (linkMatch) {
        if (buf) {
          tokens.push({ type: "text", text: buf });
          buf = "";
        }
        tokens.push({ type: "link", text: linkMatch[1], url: linkMatch[2] });
        i += linkMatch[0].length;
        continue;
      }
    }
    buf += line[i];
    i++;
  }
  if (buf) {
    tokens.push({ type: "text", text: buf });
  }
  return tokens;
}
