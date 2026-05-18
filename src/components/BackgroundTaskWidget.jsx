import React from 'react';
import { useBackgroundTask } from '@/lib/BackgroundTaskContext';
import { useLocation } from 'react-router-dom';
import { Loader2, X } from 'lucide-react';
import { createPageUrl } from '@/utils';

export default function BackgroundTaskWidget() {
  const { task, finishTask } = useBackgroundTask();
  const location = useLocation();

  if (!task) return null;

  // Eğer kullanıcı işlemin başlatıldığı sayfadaysa widget'ı gösterme (popup zaten açık)
  const taskPagePath = '/' + task.pageRoute;
  const isOnTaskPage = location.pathname === taskPagePath;
  if (isOnTaskPage) return null;

  const pct = task.total > 0 ? Math.round((task.current / task.total) * 100) : 0;

  return (
    <div className="fixed bottom-6 right-6 z-50 w-72 bg-white border border-slate-200 rounded-2xl shadow-xl p-4 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Loader2 className="h-4 w-4 text-indigo-600 animate-spin shrink-0" />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-900 truncate">{task.name}</p>
            <p className="text-xs text-slate-500 truncate">{task.pageName} Sayfası</p>
          </div>
        </div>
        <button
          onClick={finishTask}
          className="text-slate-400 hover:text-slate-600 transition-colors shrink-0"
          title="Kapat"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs text-slate-600">
            {task.current} / {task.total} kayıt
          </span>
          <span className="text-xs font-bold text-indigo-600">%{pct}</span>
        </div>
        <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
          <div
            className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    </div>
  );
}
