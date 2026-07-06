/* eslint-disable @typescript-eslint/no-unused-vars, react/no-unescaped-entities, @next/next/no-img-element */
"use client";

import * as React from "react";
import {
  FileText,
  Image as ImageIcon,
  Video,
  Music,
  Eye,
  Download,
  ExternalLink,
  Copy,
  RefreshCw,
  AlertCircle,
  Loader2,
  Type,
  Search,
  FileType,
  FileSpreadsheet,
  Presentation,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type ViewerKind = "pdf" | "image" | "video" | "audio" | "text" | "office" | "unknown";

type ViewResponse = {
  url: string;
  mime_type: string;
  format: string;
  filename: string;
  size_bytes: number;
  expires_in: number;
};

function classify(mime: string): ViewerKind {
  if (mime === "application/pdf") return "pdf";
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("video/")) return "video";
  if (mime.startsWith("audio/")) return "audio";
  if (mime.startsWith("text/") || mime === "application/json" || mime === "application/xml")
    return "text";
  if (
    mime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    mime === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
    mime === "application/vnd.openxmlformats-officedocument.presentationml.presentation" ||
    mime === "application/vnd.ms-excel" ||
    mime === "application/vnd.ms-powerpoint" ||
    mime === "application/msword"
  ) {
    return "office";
  }
  return "unknown";
}

const VIEWER_ICONS: Record<ViewerKind, React.ComponentType<{ className?: string }>> = {
  pdf: FileText,
  image: ImageIcon,
  video: Video,
  audio: Music,
  text: Type,
  office: FileType,
  unknown: FileText,
};

const VIEWER_LABELS: Record<ViewerKind, string> = {
  pdf: "PDF",
  image: "Imagem",
  video: "Vídeo",
  audio: "Áudio",
  text: "Texto",
  office: "Documento Office",
  unknown: "Arquivo",
};

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

interface FileViewerProps {
  itemId: string;
  mimeType: string;
  format: string;
  filename: string;
  fileSize: number;
  storagePath: string | null;
  fullText: string;
  onDownload: () => void;
}

type SubTab = "view" | "text";

export function FileViewer({
  itemId,
  mimeType,
  format,
  filename,
  fileSize,
  storagePath,
  fullText,
  onDownload,
}: FileViewerProps) {
  const [subTab, setSubTab] = React.useState<SubTab>("view");
  const [viewData, setViewData] = React.useState<ViewResponse | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [iframeError, setIframeError] = React.useState(false);
  const [textSearch, setTextSearch] = React.useState("");
  const [copied, setCopied] = React.useState(false);

  const kind = classify(mimeType);
  const ViewerIcon = VIEWER_ICONS[kind];

  // Load view URL when entering "view" tab
  const loadViewUrl = React.useCallback(async () => {
    if (!storagePath) {
      setError("Arquivo original não está mais no storage");
      return;
    }
    setLoading(true);
    setError(null);
    setIframeError(false);
    try {
      const res = await fetch(`/api/library/${itemId}/view`);
      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        setViewData(data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro de rede");
    } finally {
      setLoading(false);
    }
  }, [itemId, storagePath]);

  React.useEffect(() => {
    if (subTab === "view" && !viewData) {
      loadViewUrl();
    }
  }, [subTab, viewData, loadViewUrl]);

  function openInNewTab() {
    if (viewData?.url) {
      window.open(viewData.url, "_blank", "noopener,noreferrer");
    }
  }

  async function copyText() {
    if (!fullText) return;
    try {
      await navigator.clipboard.writeText(fullText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const ta = document.createElement("textarea");
      ta.value = fullText;
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand("copy");
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {}
      document.body.removeChild(ta);
    }
  }

  return (
    <div className="space-y-3">
      {/* Sub-tabs */}
      <div className="flex items-center gap-1 border-b border-border">
        <button
          onClick={() => setSubTab("view")}
          className={cn(
            "px-3 py-1.5 text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5",
            subTab === "view"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          <Eye className="h-3.5 w-3.5" />
          Visualizar
        </button>
        <button
          onClick={() => setSubTab("text")}
          className={cn(
            "px-3 py-1.5 text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5",
            subTab === "text"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          <Type className="h-3.5 w-3.5" />
          Texto extraído
        </button>
      </div>

      {subTab === "view" && (
        <ViewerView
          kind={kind}
          viewData={viewData}
          loading={loading}
          error={error}
          iframeError={iframeError}
          setIframeError={setIframeError}
          filename={filename}
          fileSize={fileSize}
          mimeType={mimeType}
          format={format}
          onDownload={onDownload}
          onOpenInNewTab={openInNewTab}
          onRefresh={loadViewUrl}
        />
      )}

      {subTab === "text" && (
        <TextView
          fullText={fullText}
          textSearch={textSearch}
          setTextSearch={setTextSearch}
          copied={copied}
          onCopy={copyText}
        />
      )}
    </div>
  );
}

function ViewerView({
  kind,
  viewData,
  loading,
  error,
  iframeError,
  setIframeError,
  filename,
  fileSize,
  mimeType,
  format,
  onDownload,
  onOpenInNewTab,
  onRefresh,
}: {
  kind: ViewerKind;
  viewData: ViewResponse | null;
  loading: boolean;
  error: string | null;
  iframeError: boolean;
  setIframeError: (b: boolean) => void;
  filename: string;
  fileSize: number;
  mimeType: string;
  format: string;
  onDownload: () => void;
  onOpenInNewTab: () => void;
  onRefresh: () => void;
}) {
  const ViewerIcon = VIEWER_ICONS[kind];

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center text-sm">
        <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
        <p className="text-red-700">{error}</p>
        <Button variant="secondary" size="sm" onClick={onDownload} className="mt-3">
          <Download className="h-4 w-4 mr-1" />
          Baixar arquivo
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Action bar */}
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-muted/30 p-2">
        <div className="flex items-center gap-2 px-2 text-sm">
          <ViewerIcon className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">{VIEWER_LABELS[kind]}</span>
          <span className="text-caption text-muted-foreground">
            {format.toUpperCase()} · {formatSize(fileSize)}
          </span>
        </div>
        <div className="ml-auto flex items-center gap-1">
          {viewData && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onOpenInNewTab}
              title="Abrir em nova aba"
            >
              <ExternalLink className="h-4 w-4" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={onRefresh}
            disabled={loading}
            title="Atualizar URL"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          </Button>
          <Button variant="secondary" size="sm" onClick={onDownload}>
            <Download className="h-4 w-4 mr-1" />
            Baixar
          </Button>
        </div>
      </div>

      {/* Viewer */}
      <div className="rounded-lg border border-border bg-muted/20 overflow-hidden">
        {loading && !viewData && (
          <div className="flex items-center justify-center p-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <span className="ml-2 text-sm text-muted-foreground">Carregando visualização...</span>
          </div>
        )}

        {viewData && kind === "pdf" && !iframeError && (
          <iframe
            src={`${viewData.url}#toolbar=1&navpanes=1&scrollbar=1`}
            className="w-full"
            style={{ height: "min(70vh, 800px)", minHeight: 500 }}
            title={filename}
            onError={() => setIframeError(true)}
            onLoad={(e) => {
              // Some browsers don't trigger onError for iframes — set a fallback
              const iframe = e.currentTarget;
              try {
                // If contentDocument is null and not cross-origin, iframe blocked
                if (!iframe.contentDocument && !iframe.contentWindow) {
                  // Cross-origin is expected; nothing to do
                }
              } catch {
                // Cross-origin — expected
              }
            }}
          />
        )}

        {viewData && kind === "pdf" && iframeError && (
          <FallbackView
            icon={FileText}
            title="Seu navegador não permite visualizar PDF inline"
            description="Baixe o arquivo para abrir no seu visualizador preferido."
            onDownload={onDownload}
            onOpenInNewTab={onOpenInNewTab}
          />
        )}

        {viewData && kind === "image" && (
          <div className="flex items-center justify-center bg-checkerboard p-4" style={{ minHeight: 400 }}>
            <img
              src={viewData.url}
              alt={filename}
              className="max-w-full max-h-[70vh] object-contain rounded"
              onError={() => setIframeError(true)}
            />
          </div>
        )}

        {viewData && kind === "video" && (
          <div className="flex items-center justify-center bg-black p-4">
            <video
              src={viewData.url}
              controls
              autoPlay={false}
              className="max-w-full max-h-[70vh] rounded"
              onError={() => setIframeError(true)}
            >
              Seu navegador não suporta vídeo HTML5.
            </video>
          </div>
        )}

        {viewData && kind === "audio" && (
          <div className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <Music className="h-10 w-10 text-muted-foreground" />
              <div>
                <p className="font-medium">{filename}</p>
                <p className="text-caption text-muted-foreground">Áudio · {formatSize(fileSize)}</p>
              </div>
            </div>
            <audio
              src={viewData.url}
              controls
              className="w-full"
              onError={() => setIframeError(true)}
            >
              Seu navegador não suporta áudio HTML5.
            </audio>
          </div>
        )}

        {viewData && kind === "office" && (
          <OfficeFallback
            filename={filename}
            viewData={viewData}
            onDownload={onDownload}
            onOpenInNewTab={onOpenInNewTab}
          />
        )}

        {viewData && kind === "unknown" && (
          <FallbackView
            icon={FileText}
            title="Tipo de arquivo não suportado para visualização inline"
            description={`O formato "${format}" não pode ser exibido no navegador. Baixe para abrir.`}
            onDownload={onDownload}
            onOpenInNewTab={onOpenInNewTab}
          />
        )}

        {!viewData && !loading && !error && (
          <div className="p-12 text-center text-sm text-muted-foreground">
            Clique em "Atualizar URL" para tentar carregar.
          </div>
        )}
      </div>
    </div>
  );
}

function FallbackView({
  icon: Icon,
  title,
  description,
  onDownload,
  onOpenInNewTab,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  onDownload: () => void;
  onOpenInNewTab: () => void;
}) {
  return (
    <div className="p-12 text-center">
      <Icon className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
      <h3 className="font-medium text-sm mb-1">{title}</h3>
      <p className="text-caption text-muted-foreground mb-4 max-w-sm mx-auto">{description}</p>
      <div className="flex items-center justify-center gap-2">
        <Button variant="secondary" size="sm" onClick={onOpenInNewTab}>
          <ExternalLink className="h-4 w-4 mr-1" />
          Abrir em nova aba
        </Button>
        <Button size="sm" onClick={onDownload}>
          <Download className="h-4 w-4 mr-1" />
          Baixar
        </Button>
      </div>
    </div>
  );
}

function OfficeFallback({
  filename,
  viewData,
  onDownload,
  onOpenInNewTab,
}: {
  filename: string;
  viewData: ViewResponse;
  onDownload: () => void;
  onOpenInNewTab: () => void;
}) {
  // Google Docs viewer needs a public URL. For our private signed URL,
  // we offer Office Online via the same signed URL — but it may not work
  // because the signed URL expires. Best UX: suggest download.
  const icon =
    viewData.mime_type.includes("spreadsheet") ? FileSpreadsheet :
    viewData.mime_type.includes("presentation") ? Presentation :
    FileType;
  return (
    <FallbackView
      icon={icon}
      title="Documento Office"
      description="DOCX/XLSX/PPTX não são renderizados nativamente. Baixe para abrir no Word/Excel/PowerPoint, ou use uma versão convertida em PDF."
      onDownload={onDownload}
      onOpenInNewTab={onOpenInNewTab}
    />
  );
}

function TextView({
  fullText,
  textSearch,
  setTextSearch,
  copied,
  onCopy,
}: {
  fullText: string;
  textSearch: string;
  setTextSearch: (s: string) => void;
  copied: boolean;
  onCopy: () => void;
}) {
  if (!fullText) {
    return (
      <div className="rounded-lg border border-border bg-muted/20 p-12 text-center text-sm text-muted-foreground">
        Texto extraído não disponível para este arquivo.
        <br />
        (Pode ter sido indexado antes desta feature, ou é um arquivo sem texto extraível.)
      </div>
    );
  }
  const lines = fullText.split("\n");
  const filtered = textSearch.trim()
    ? lines.filter((l) => l.toLowerCase().includes(textSearch.toLowerCase()))
    : lines;
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar no texto extraído..."
            value={textSearch}
            onChange={(e) => setTextSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button variant="secondary" onClick={onCopy} disabled={!fullText}>
          <Copy className="h-4 w-4 mr-1" />
          {copied ? "Copiado!" : "Copiar texto"}
        </Button>
      </div>
      <div className="rounded-md border border-border bg-muted/20 p-4 max-h-[60vh] overflow-y-auto">
        <pre className="whitespace-pre-wrap text-sm font-mono leading-relaxed">
          {filtered.join("\n")}
        </pre>
      </div>
      <p className="text-caption text-muted-foreground">
        {filtered.length} de {lines.length} linhas
        {textSearch && ` (buscando "${textSearch}")`}
        {" · "}
        {fullText.length.toLocaleString("pt-BR")} caracteres
      </p>
    </div>
  );
}
