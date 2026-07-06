"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MessageCircle, Library, Plus, Activity, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface MobileNavItem {
  id: string;
  label: string;
  href: string;
  icon: LucideIcon;
  isAction?: boolean;
}

const ITEMS: MobileNavItem[] = [
  { id: "chat", label: "Chat", href: "/", icon: MessageCircle },
  { id: "biblioteca", label: "Biblioteca", href: "/biblioteca", icon: Library },
  { id: "criar", label: "Criar", href: "/escrita", icon: Plus, isAction: true },
  { id: "atividade", label: "Atividade", href: "/memoria", icon: Activity },
];

/**
 * MobileBottomNav — 4 icons for screens <768px.
 * Per master-doc §4: Chat / Biblioteca / Criar / Atividade.
 * Server-safe; no client-only state needed.
 */
export function MobileBottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-sticky border-t border-neutral-200 bg-white/95 backdrop-blur-md md:hidden"
      aria-label="Navegação inferior"
    >
      <ul className="flex h-16 items-stretch justify-around">
        {ITEMS.map((item) => {
          const Icon = item.icon;
          const active =
            item.href === "/"
              ? pathname === "/"
              : pathname === item.href || pathname.startsWith(`${item.href}/`);

          if (item.isAction) {
            return (
              <li key={item.id} className="flex items-center">
                <Link
                  href={item.href}
                  aria-label={item.label}
                  className="flex h-12 w-12 -translate-y-2 items-center justify-center rounded-full bg-primary-500 text-white shadow-elevation-3 transition-transform active:scale-95"
                >
                  <Icon className="h-6 w-6" />
                </Link>
              </li>
            );
          }

          return (
            <li key={item.id} className="flex-1">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-full flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors",
                  active ? "text-primary-600" : "text-neutral-500"
                )}
              >
                <Icon
                  className={cn(
                    "h-5 w-5",
                    active ? "text-primary-600" : "text-neutral-500"
                  )}
                  aria-hidden="true"
                />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
