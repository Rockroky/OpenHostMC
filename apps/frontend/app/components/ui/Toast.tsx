'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

interface ToastStore {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
}

// Simple in-memory event emitter for toast management
type ToastListener = (toasts: Toast[]) => void;
const listeners: Set<ToastListener> = new Set();
let toastsState: Toast[] = [];

const notify = () => listeners.forEach((l) => l([...toastsState]));

export const toast = {
  success: (title: string, message?: string, duration = 4000) => {
    const id = Math.random().toString(36).slice(2);
    toastsState = [...toastsState, { id, type: 'success', title, message, duration }];
    notify();
    return id;
  },
  error: (title: string, message?: string, duration = 5000) => {
    const id = Math.random().toString(36).slice(2);
    toastsState = [...toastsState, { id, type: 'error', title, message, duration }];
    notify();
    return id;
  },
  warning: (title: string, message?: string, duration = 4000) => {
    const id = Math.random().toString(36).slice(2);
    toastsState = [...toastsState, { id, type: 'warning', title, message, duration }];
    notify();
    return id;
  },
  info: (title: string, message?: string, duration = 4000) => {
    const id = Math.random().toString(36).slice(2);
    toastsState = [...toastsState, { id, type: 'info', title, message, duration }];
    notify();
    return id;
  },
  dismiss: (id: string) => {
    toastsState = toastsState.filter((t) => t.id !== id);
    notify();
  },
};

const ICONS: Record<ToastType, React.ReactNode> = {
  success: <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />,
  error: <XCircle className="w-4 h-4 text-red-400 shrink-0" />,
  warning: <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />,
  info: <Info className="w-4 h-4 text-blue-400 shrink-0" />,
};

const STYLE: Record<ToastType, string> = {
  success: 'border-emerald-500/30 bg-zinc-900',
  error: 'border-red-500/30 bg-zinc-900',
  warning: 'border-amber-500/30 bg-zinc-900',
  info: 'border-blue-500/30 bg-zinc-900',
};

const BAR_COLOR: Record<ToastType, string> = {
  success: 'bg-emerald-500',
  error: 'bg-red-500',
  warning: 'bg-amber-500',
  info: 'bg-blue-500',
};

function ToastItem({ t, onDismiss }: { t: Toast; onDismiss: (id: string) => void }) {
  const [progress, setProgress] = useState(100);
  const duration = t.duration ?? 4000;
  const shouldReduce = useReducedMotion();

  useEffect(() => {
    const start = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - start;
      const remaining = Math.max(0, 100 - (elapsed / duration) * 100);
      setProgress(remaining);
      if (remaining === 0) {
        clearInterval(interval);
        onDismiss(t.id);
      }
    }, 50);
    return () => clearInterval(interval);
  }, [t.id, duration, onDismiss]);

  return (
    <motion.div
      layout={!shouldReduce}
      initial={shouldReduce ? { opacity: 0 } : { opacity: 0, x: 60, scale: 0.92 }}
      animate={shouldReduce ? { opacity: 1 } : { opacity: 1, x: 0, scale: 1 }}
      exit={shouldReduce ? { opacity: 0 } : { opacity: 0, x: 60, scale: 0.92 }}
      transition={{ type: 'spring', stiffness: 320, damping: 26 }}
      className={`relative w-80 rounded-xl border shadow-2xl shadow-black/40 overflow-hidden ${STYLE[t.type]}`}
    >
      <div className="flex items-start gap-3 p-4 pr-10">
        {ICONS[t.type]}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-zinc-100 leading-snug">{t.title}</p>
          {t.message && (
            <p className="text-xs text-zinc-400 mt-0.5 leading-relaxed">{t.message}</p>
          )}
        </div>
      </div>
      <button
        onClick={() => onDismiss(t.id)}
        className="absolute top-3 right-3 text-zinc-500 hover:text-zinc-200 transition-colors"
      >
        <X className="w-3.5 h-3.5" />
      </button>
      {/* Progress bar */}
      <div className="h-0.5 bg-zinc-800">
        <motion.div
          className={`h-full ${BAR_COLOR[t.type]}`}
          style={{ width: `${progress}%` }}
          transition={{ duration: 0.05 }}
        />
      </div>
    </motion.div>
  );
}

export function ToastProvider() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    const listener: ToastListener = (t) => setToasts(t);
    listeners.add(listener);
    return () => { listeners.delete(listener); };
  }, []);

  const handleDismiss = useCallback((id: string) => {
    toast.dismiss(id);
  }, []);

  return (
    <div className="fixed bottom-5 right-5 z-[9999] flex flex-col gap-2 items-end pointer-events-none">
      <AnimatePresence mode="popLayout">
        {toasts.map((t) => (
          <div key={t.id} className="pointer-events-auto">
            <ToastItem t={t} onDismiss={handleDismiss} />
          </div>
        ))}
      </AnimatePresence>
    </div>
  );
}
