"use client";

import { toast as sonnerToast } from "sonner";

type ToastOptions = {
  description?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
};

type AnyOpts = string | ToastOptions;

export function useToast() {
  return {
    success: (title: string, opts?: AnyOpts) =>
      sonnerToast.success(title, typeof opts === "string" ? { description: opts } : opts),
    error: (title: string, opts?: AnyOpts) =>
      sonnerToast.error(title, typeof opts === "string" ? { description: opts } : opts),
    info: (title: string, opts?: AnyOpts) =>
      sonnerToast.info(title, typeof opts === "string" ? { description: opts } : opts),
    warning: (title: string, opts?: AnyOpts) =>
      sonnerToast.warning(title, typeof opts === "string" ? { description: opts } : opts),
    promise: <T,>(
      promise: Promise<T>,
      msgs: { loading: string; success: string; error: string }
    ) =>
      sonnerToast.promise(promise, {
        loading: msgs.loading,
        success: msgs.success,
        error: msgs.error,
      }),
  };
}
