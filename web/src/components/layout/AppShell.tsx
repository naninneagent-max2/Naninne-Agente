"use client";

import * as React from "react";
import { TopBar } from "./TopBar";
import { Sidebar } from "./Sidebar";
import { RightPanel } from "./RightPanel";
import { MobileBottomNav } from "./MobileBottomNav";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

/**
 * AppShell — the 3-panel layout per master-doc §4.
 * Desktop: Sidebar (240px) | Content (1fr) | RightPanel (320px)
 * Notebook: Sidebar | Content | RightPanel as drawer
 * Tablet:   Sidebar (drawer) | Content
 * Mobile:   TopBar | Content | BottomNav
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const [drawerOpen, setDrawerOpen] = React.useState(false);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <TopBar onMenuClick={() => setDrawerOpen(true)} />

      <div className="flex flex-1">
        {/* Desktop sidebar (≥ lg) */}
        <Sidebar variant="desktop" />

        {/* Mobile/tablet drawer (< lg) */}
        <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
          <SheetContent side="left" className="w-[280px] p-0">
            <SheetHeader className="sr-only">
              <SheetTitle>Navegação</SheetTitle>
            </SheetHeader>
            <Sidebar
              variant="drawer"
              onNavigate={() => setDrawerOpen(false)}
            />
          </SheetContent>
        </Sheet>

        {/* Main content */}
        <main className="min-w-0 flex-1" id="main-content">
          {children}
        </main>

        {/* Desktop right panel (≥ xl) */}
        <RightPanel />
      </div>

      {/* Mobile bottom nav (< md) */}
      <MobileBottomNav />
    </div>
  );
}

// Re-export so callers can use a single import path
export { Button };
