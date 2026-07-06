"use client";

import * as React from "react";
import Link from "next/link";
import { Search, Settings, Bell, Menu, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

/**
 * TopBar — fixed 64px, sticky. Per master-doc §4 + design-system.md.
 * Server-safe: the search is disabled, the avatar dropdown is a placeholder.
 */
export function TopBar({ onMenuClick }: { onMenuClick?: () => void }) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  return (
    <header
      className="sticky top-0 z-sticky flex h-topbar items-center gap-6 border-b border-neutral-200 bg-white/85 px-6 backdrop-blur-md"
      role="banner"
    >
      {/* Mobile menu trigger */}
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden"
        onClick={onMenuClick}
        aria-label="Abrir menu"
      >
        <Menu className="h-5 w-5" />
      </Button>

      {/* Brand */}
      <Link
        href="/"
        className="flex items-center gap-2.5 text-body font-semibold text-neutral-900"
        aria-label="Naninne — Início"
      >
        <span
          className="flex h-7 w-7 items-center justify-center rounded-md bg-primary-500 text-white shadow-elevation-1"
          aria-hidden="true"
        >
          <span className="text-body font-bold">N</span>
        </span>
        <span className="hidden sm:inline">Naninne</span>
      </Link>

      {/* Global search (disabled) */}
      <div className="relative ml-2 hidden flex-1 max-w-[640px] md:flex">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400"
          aria-hidden="true"
        />
        <Input
          type="search"
          placeholder="Buscar em tudo (em breve)"
          disabled
          aria-label="Busca global"
          className="h-10 cursor-not-allowed bg-neutral-100 pl-10 pr-16 text-body-sm"
        />
        <kbd className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 rounded border border-neutral-300 bg-white px-1.5 py-0.5 text-[11px] font-medium text-neutral-500 sm:inline">
          ⌘K
        </kbd>
      </div>

      {/* Right actions */}
      <div className="ml-auto flex items-center gap-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(mounted && theme === "dark" ? "light" : "dark")}
              aria-label="Alternar tema"
            >
              {mounted && theme === "dark" ? (
                <Sun className="h-5 w-5" />
              ) : (
                <Moon className="h-5 w-5" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>Alternar tema</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Notificações" disabled>
              <Bell className="h-5 w-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Notificações (em breve)</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Configurações" disabled>
              <Settings className="h-5 w-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Configurações (em breve)</TooltipContent>
        </Tooltip>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="ml-2 rounded-full focus-visible:outline-none"
              aria-label="Menu do perfil"
            >
              <Avatar>
                <AvatarFallback name="Robert Silva" />
              </Avatar>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>Robert Silva</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem disabled>Meu perfil</DropdownMenuItem>
            <DropdownMenuItem disabled>Preferências</DropdownMenuItem>
            <DropdownMenuItem disabled>Atividade recente</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem disabled>Sair</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
