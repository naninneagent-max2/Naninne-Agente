"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { Sparkles, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { PRIMARY_NAV, projectActiveClass, type NavItem } from "@/lib/nav";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

/**
 * Sidebar — 240px on desktop, drawer on mobile.
 * Per master-doc §4 and design-system.md §10.
 * The active state uses the project palette (Escrita = blue, etc.).
 */
interface SidebarProps {
  variant?: "desktop" | "drawer";
  onNavigate?: () => void;
}

export function Sidebar({ variant = "desktop", onNavigate }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        "flex h-full flex-col gap-1 border-neutral-200 bg-background p-3",
        variant === "desktop" && "hidden w-sidebar shrink-0 border-r lg:flex",
        variant === "drawer" && "w-full"
      )}
      aria-label="Navegação principal"
    >
      {/* Section: Principal */}
      <p className="px-3 pt-3 text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
        Principal
      </p>
      <nav className="flex flex-col gap-0.5" role="navigation">
        {PRIMARY_NAV.map((item) => (
          <SidebarLink
            key={item.id}
            item={item}
            active={isActive(pathname, item.href)}
            onNavigate={onNavigate}
          />
        ))}
      </nav>

      {/* Spacer pushes the usage card to the bottom */}
      <div className="mt-auto pt-6">
        <UsageCard />
      </div>
    </aside>
  );
}

function SidebarLink({
  item,
  active,
  onNavigate,
}: {
  item: NavItem;
  active: boolean;
  onNavigate?: () => void;
}) {
  const Icon = item.icon;
  const activeClass = item.projectColor
    ? projectActiveClass[item.projectColor]
    : "bg-primary-50 text-primary-700";

  const link = (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group flex items-center gap-3 rounded-md px-3 py-2 text-body-sm font-medium text-neutral-600",
        "transition-colors duration-base ease-out",
        "hover:bg-neutral-100 hover:text-neutral-900",
        active && activeClass
      )}
    >
      <Icon
        className={cn(
          "h-[18px] w-[18px] shrink-0 transition-colors",
          active ? "" : "text-neutral-500 group-hover:text-neutral-700"
        )}
        aria-hidden="true"
      />
      <span className="truncate">{item.label}</span>
      {item.badge !== undefined && (
        <span
          className={cn(
            "ml-auto rounded-full bg-neutral-100 px-2 py-0.5 text-caption font-semibold text-neutral-500",
            active && "bg-white"
          )}
        >
          {item.badge}
        </span>
      )}
    </Link>
  );

  // Tooltip only on hover-elevate truncated labels (no-op for now since labels fit)
  if (false) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{link}</TooltipTrigger>
        <TooltipContent side="right">{item.label}</TooltipContent>
      </Tooltip>
    );
  }
  return link;
}

function UsageCard() {
  // Placeholder per design-system.md §4 sidebar — usage of the system.
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
      className="rounded-lg border border-neutral-200 bg-card p-3.5"
    >
      <h4 className="mb-2.5 flex items-center gap-1.5 text-caption font-semibold text-neutral-700">
        <Sparkles className="h-3.5 w-3.5 text-primary-500" />
        Uso do mês
      </h4>
      <div className="h-1.5 overflow-hidden rounded-full bg-neutral-100">
        <div
          className="h-full w-[34%] rounded-full bg-gradient-to-r from-primary-500 to-primary-300"
          aria-hidden="true"
        />
      </div>
      <div className="mt-1.5 flex items-center justify-between text-[11px] text-neutral-500">
        <span>34 / 100h</span>
        <span className="inline-flex items-center gap-0.5">
          <Zap className="h-3 w-3 text-primary-500" />
          Plano pessoal
        </span>
      </div>
    </motion.div>
  );
}

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}
