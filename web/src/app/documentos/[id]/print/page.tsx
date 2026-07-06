"use client";
import * as React from "react";
import { use } from "react";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

type Document = {
  id: string;
  title: string;
  description: string | null;
  format: string;
  status: string;
  content: string;
  created_at: string;
};

export default function PrintDocument({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [doc, setDoc] = React.useState<Document | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    fetch(`/api/documents?id=${id}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        setDoc(d.document ?? null);
        setLoading(false);
      });
  }, [id]);

  React.useEffect(() => {
    if (doc && typeof window !== "undefined") {
      // Auto-trigger print once content is loaded
      const t = setTimeout(() => window.print(), 800);
      return () => clearTimeout(t);
    }
  }, [doc]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen text-muted-foreground text-sm">
        Carregando documento...
      </div>
    );
  }

  if (!doc) {
    return (
      <div className="flex items-center justify-center min-h-screen text-muted-foreground text-sm">
        Documento não encontrado
      </div>
    );
  }

  return (
    <>
      {/* Print button — hidden in print */}
      <div className="fixed top-4 right-4 print:hidden z-10">
        <Button onClick={() => window.print()} className="gap-2 shadow-lg">
          <Printer className="h-4 w-4" />
          Imprimir / Salvar como PDF
        </Button>
      </div>

      <style>{`
        @page { size: A4; margin: 2cm; }
        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>

      <article className="max-w-[680px] mx-auto px-8 py-12 print:py-0 print:max-w-none print:px-0 bg-white text-neutral-900">
        <header className="mb-8 pb-4 border-b border-neutral-200">
          <h1 className="text-3xl font-semibold text-neutral-900 mb-2 leading-tight">
            {doc.title}
          </h1>
          {doc.description && (
            <p className="text-sm italic text-neutral-600 mb-2">{doc.description}</p>
          )}
          <p className="text-xs text-neutral-500">
            Gerado por Naninne · {new Date(doc.created_at).toLocaleString("pt-BR")}
          </p>
        </header>

        <MarkdownPrintRender content={doc.content} />
      </article>
    </>
  );
}

// Lightweight markdown → HTML renderer for print view
function MarkdownPrintRender({ content }: { content: string }) {
  const html = React.useMemo(() => renderMarkdown(content), [content]);
  return <div dangerouslySetInnerHTML={{ __html: html }} />;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function renderInline(s: string): string {
  let out = escapeHtml(s);
  // **bold**
  out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  // *italic*
  out = out.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<em>$1</em>');
  // `code`
  out = out.replace(/`([^`]+)`/g, '<code style="background:#f3f4f6;padding:0 4px;border-radius:3px;font-family:monospace;font-size:0.85em">$1</code>');
  // [text](url)
  out = out.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" style="color:#0563C1;text-decoration:underline">$1</a>');
  return out;
}

function renderMarkdown(md: string): string {
  const lines = md.split("\n");
  const out: string[] = [];
  let inCode = false;
  let codeBuf: string[] = [];
  let inList: "ul" | "ol" | null = null;

  function flushList() {
    if (inList) {
      out.push(`</${inList}>`);
      inList = null;
    }
  }
  function flushCode() {
    if (inCode) {
      out.push(`<pre style="background:#f3f4f6;padding:12px;border-radius:6px;overflow:auto;font-family:monospace;font-size:0.85em;line-height:1.5"><code>${escapeHtml(codeBuf.join("\n"))}</code></pre>`);
      codeBuf = [];
      inCode = false;
    }
  }

  for (const line of lines) {
    // Code fence
    if (line.startsWith("```")) {
      flushList();
      if (inCode) {
        flushCode();
      } else {
        inCode = true;
        codeBuf = [];
      }
      continue;
    }
    if (inCode) {
      codeBuf.push(line);
      continue;
    }

    // Headings
    if (line.startsWith("#### ")) {
      flushList();
      out.push(`<h4 style="font-size:1.05em;font-weight:600;margin:1.2em 0 0.5em">${renderInline(line.slice(5))}</h4>`);
      continue;
    }
    if (line.startsWith("### ")) {
      flushList();
      out.push(`<h3 style="font-size:1.2em;font-weight:600;margin:1.3em 0 0.5em">${renderInline(line.slice(4))}</h3>`);
      continue;
    }
    if (line.startsWith("## ")) {
      flushList();
      out.push(`<h2 style="font-size:1.4em;font-weight:600;margin:1.5em 0 0.6em">${renderInline(line.slice(3))}</h2>`);
      continue;
    }
    if (line.startsWith("# ")) {
      flushList();
      out.push(`<h1 style="font-size:1.7em;font-weight:700;margin:1.8em 0 0.7em">${renderInline(line.slice(2))}</h1>`);
      continue;
    }

    // Horizontal rule
    if (line.trim() === "---" || line.trim() === "***") {
      flushList();
      out.push(`<hr style="border:none;border-top:1px solid #e5e7eb;margin:2em 0"/>`);
      continue;
    }

    // Empty line
    if (line.trim() === "") {
      flushList();
      continue;
    }

    // Lists
    const bulletMatch = line.match(/^(\s*)[-*]\s(.+)/);
    if (bulletMatch) {
      if (inList !== "ul") {
        flushList();
        out.push(`<ul style="margin:0.6em 0;padding-left:1.5em">`);
        inList = "ul";
      }
      out.push(`<li style="margin:0.3em 0">${renderInline(bulletMatch[2])}</li>`);
      continue;
    }
    const numMatch = line.match(/^(\s*)\d+\.\s(.+)/);
    if (numMatch) {
      if (inList !== "ol") {
        flushList();
        out.push(`<ol style="margin:0.6em 0;padding-left:1.5em">`);
        inList = "ol";
      }
      out.push(`<li style="margin:0.3em 0">${renderInline(numMatch[2])}</li>`);
      continue;
    }

    // Blockquote
    if (line.startsWith("> ")) {
      flushList();
      out.push(`<blockquote style="border-left:3px solid #cbd5e0;padding-left:1em;margin:1em 0;color:#475569;font-style:italic">${renderInline(line.slice(2))}</blockquote>`);
      continue;
    }

    // Regular paragraph
    flushList();
    out.push(`<p style="margin:0.8em 0;line-height:1.7;text-align:justify">${renderInline(line)}</p>`);
  }

  flushCode();
  flushList();
  return out.join("\n");
}
