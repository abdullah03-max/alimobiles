import { useUiStore } from '@/stores/uiStore';
import { cn } from '@/lib/utils';
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

const icons = {
  success: CheckCircle2,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
};

const borderColors = {
  success: 'border-l-green-500',
  error: 'border-l-red-500',
  warning: 'border-l-yellow-500',
  info: 'border-l-blue-500',
};

export default function ToastContainer() {
  const toasts = useUiStore(s => s.toasts);
  const removeToast = useUiStore(s => s.removeToast);

  return (
    <div className="fixed top-4 right-4 z-[200] flex flex-col gap-2 w-80">
      <AnimatePresence>
        {toasts.map(toast => {
          const Icon = icons[toast.type];
          return (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, x: 100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 100 }}
              transition={{ duration: 0.3 }}
              className={cn(
                'bg-white rounded-lg shadow-lg border border-gray-200 border-l-4 p-3 flex items-start gap-3',
                borderColors[toast.type]
              )}
            >
              <Icon className={cn('w-5 h-5 flex-shrink-0 mt-0.5',
                toast.type === 'success' && 'text-green-500',
                toast.type === 'error' && 'text-red-500',
                toast.type === 'warning' && 'text-yellow-500',
                toast.type === 'info' && 'text-blue-500',
              )} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900">{toast.title}</p>
                {toast.message && <p className="text-xs text-gray-500 mt-0.5">{toast.message}</p>}
              </div>
              <button
                onClick={() => removeToast(toast.id)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
