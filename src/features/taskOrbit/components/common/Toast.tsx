import React from 'react';
import { useTaskOrbit } from '../../context/TaskOrbitContext';
import { Sparkles, CheckCircle2 } from 'lucide-react';

export const Toast: React.FC = () => {
  const { toast } = useTaskOrbit();

  if (!toast) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 animate-in slide-in-from-bottom-3 duration-200 pointer-events-none">
      <div className="bg-slate-900 text-white px-4 py-3 rounded-xl shadow-xl flex items-center gap-3 border border-slate-800 text-xs max-w-sm pointer-events-auto">
        <div className="p-1 rounded-full bg-indigo-500/20 text-indigo-400 shrink-0">
          {toast.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          ) : (
            <Sparkles className="w-4 h-4 text-indigo-400" />
          )}
        </div>
        <div className="min-w-0">
          {toast.authorName && (
            <span className="font-bold text-slate-200 block text-[11px] truncate">
              {toast.authorName}
            </span>
          )}
          <span className="text-slate-300 font-medium leading-snug line-clamp-2">
            {toast.text}
          </span>
        </div>
      </div>
    </div>
  );
};
