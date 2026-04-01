import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useUIStore, type Toast as ToastType } from '../../stores/ui-store';

function ToastItem({ toast }: { toast: ToastType }) {
  const removeToast = useUIStore((s) => s.removeToast);

  useEffect(() => {
    const timer = setTimeout(() => {
      removeToast(toast.id);
    }, toast.duration ?? 4000);
    return () => clearTimeout(timer);
  }, [toast.id, toast.duration, removeToast]);

  const iconMap: Record<string, LucideIcon> = {
    success: CheckCircle,
    error: AlertCircle,
    info: Info,
    warning: AlertTriangle,
  };

  const colorMap: Record<string, string> = {
    success: 'text-positive',
    error: 'text-negative',
    info: 'text-info',
    warning: 'text-gold',
  };

  const Icon = iconMap[toast.type];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      className="glass-card px-4 py-3 flex items-center gap-3 shadow-xl max-w-sm w-full"
    >
      <Icon size={22} className={colorMap[toast.type]} />
      <p className="text-sm text-text-primary flex-1">{toast.message}</p>
      <button
        onClick={() => removeToast(toast.id)}
        className="p-1.5 -m-1 text-text-muted hover:text-text-primary transition-colors"
        aria-label="Dismiss"
      >
        <X size={18} />
      </button>
    </motion.div>
  );
}

export function ToastContainer() {
  const toasts = useUIStore((s) => s.toasts);

  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 items-end">
      <AnimatePresence>
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} />
        ))}
      </AnimatePresence>
    </div>
  );
}
