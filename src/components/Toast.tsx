import React from 'react';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
}

interface ToastContainerProps {
  toasts: ToastMessage[];
  onRemove: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onRemove }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-4 left-4 sm:left-auto sm:right-6 sm:w-96 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map((toast) => {
        const bgStyle =
          toast.type === 'success'
            ? 'bg-emerald-800 text-white border-emerald-700'
            : toast.type === 'error'
            ? 'bg-red-800 text-white border-red-700'
            : toast.type === 'warning'
            ? 'bg-amber-600 text-slate-950 font-medium border-amber-500'
            : 'bg-blue-800 text-white border-blue-700';

        const Icon =
          toast.type === 'success'
            ? CheckCircle2
            : toast.type === 'error'
            ? AlertCircle
            : toast.type === 'warning'
            ? AlertTriangle
            : Info;

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start justify-between gap-3 p-3.5 rounded-xl shadow-xl border text-xs sm:text-sm animate-in slide-in-from-bottom-5 duration-200 ${bgStyle}`}
          >
            <div className="flex items-start gap-2.5">
              <Icon className="w-5 h-5 shrink-0 mt-0.5" />
              <span className="leading-snug">{toast.message}</span>
            </div>
            <button
              type="button"
              onClick={() => onRemove(toast.id)}
              className="p-1 rounded-md opacity-70 hover:opacity-100 transition-opacity"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
