import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { AppShell } from "@/components/layout/AppShell";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: {
    default: "Naninne — Seu segundo cérebro digital",
    template: "%s · Naninne",
  },
  description:
    "Naninne: assistente pessoal inteligente com biblioteca universal. Escreva, pesquise, gere documentos e nunca mais esqueça uma ideia.",
  applicationName: "Naninne",
  authors: [{ name: "Naninne" }],
  keywords: [
    "Naninne",
    "assistente IA",
    "biblioteca universal",
    "escrita criativa",
    "memória digital",
  ],
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FAFAF7" },
    { media: "(prefers-color-scheme: dark)", color: "#0F1014" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning className={inter.variable}>
      <body className="font-sans antialiased">
        <Providers>
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-tooltip focus:rounded-md focus:bg-primary-500 focus:px-4 focus:py-2 focus:text-white"
          >
            Pular para o conteúdo
          </a>
          <AppShell>{children}</AppShell>
        </Providers>
      </body>
    </html>
  );
}
