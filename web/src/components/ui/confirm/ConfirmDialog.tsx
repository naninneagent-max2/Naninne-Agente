"use client";
import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  description?: string;
  confirmText?: string;        // botão "Excluir"
  confirmPhrase?: string;       // se exigir digitação, ex: nome do item
  destructive?: boolean;
  loading?: boolean;
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = "Confirmar",
  confirmPhrase,
  destructive = true,
  loading = false,
}: ConfirmDialogProps) {
  const [typed, setTyped] = React.useState("");

  React.useEffect(() => {
    if (open) setTyped("");
  }, [open]);

  const phraseOk = !confirmPhrase || typed.trim() === confirmPhrase;
  const canConfirm = phraseOk && !loading;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-tooltip bg-black/50 flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 12 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-background rounded-2xl shadow-2xl max-w-md w-full overflow-hidden"
          >
            <div className="flex items-start gap-3 px-5 py-4 border-b border-border">
              {destructive && (
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600">
                  <AlertTriangle className="h-5 w-5" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h2 className="text-base font-semibold text-neutral-900">{title}</h2>
                {description && (
                  <p className="text-sm text-neutral-600 mt-1">{description}</p>
                )}
              </div>
              <button
                onClick={onClose}
                aria-label="Fechar"
                className="text-muted-foreground hover:text-foreground p-1"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {confirmPhrase && (
              <div className="px-5 py-4 space-y-2 bg-muted/30">
                <label className="block text-caption text-muted-foreground">
                  Para confirmar, digite <code className="font-mono text-neutral-900 bg-background px-1.5 py-0.5 rounded text-[11px]">{confirmPhrase}</code>
                </label>
                <Input
                  autoFocus
                  value={typed}
                  onChange={(e) => setTyped(e.target.value)}
                  placeholder={confirmPhrase}
                  className="font-mono"
                />
              </div>
            )}

            <div className="flex gap-2 px-5 py-3 border-t border-border bg-background">
              <Button variant="ghost" onClick={onClose} disabled={loading} className="flex-1">
                Cancelar
              </Button>
              <Button
                variant={destructive ? "danger" : "primary"}
                onClick={onConfirm}
                disabled={!canConfirm}
                className="flex-1"
              >
                {loading ? "Excluindo..." : confirmText}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
