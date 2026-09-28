import React from 'react';
import { ShieldCheck, History, Database, BookOpen, PlusCircle } from 'lucide-react';

interface HeaderProps {
  activeTab: 'form' | 'history' | 'pma' | 'manuals';
  onTabChange: (tab: 'form' | 'history' | 'pma' | 'manuals') => void;
  historyCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onTabChange,
  historyCount,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-slate-800 border-b border-slate-700 text-white shadow-md">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Zone 1: Brand Wordmark (Single text element) */}
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-slate-700 border border-slate-600 flex items-center justify-center text-white shadow-sm font-black text-sm">
            EW
          </div>
          <span className="text-base sm:text-lg font-bold tracking-tight text-white select-none">
            Eastway Inspection
          </span>
        </div>

        {/* Zone 2: Navigation Links (Desktop & Tablet) */}
        <nav className="hidden md:flex items-center gap-1 bg-slate-900/60 p-1 rounded-xl border border-slate-700">
          <button
            type="button"
            onClick={() => onTabChange('form')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 ${
              activeTab === 'form'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
            }`}
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Inspection Form</span>
          </button>

          <button
            type="button"
            onClick={() => onTabChange('history')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 ${
              activeTab === 'history'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Records ({historyCount})</span>
          </button>

          <button
            type="button"
            onClick={() => onTabChange('pma')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 ${
              activeTab === 'pma'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>PMA Fleet</span>
          </button>

          <button
            type="button"
            onClick={() => onTabChange('manuals')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 ${
              activeTab === 'manuals'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Manuals SOP</span>
          </button>
        </nav>

        {/* Zone 3: Quick Action */}
        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-300 bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700/60">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Online / Ready</span>
          </div>

          <button
            type="button"
            onClick={() => onTabChange('history')}
            className="md:hidden flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg border border-slate-700"
          >
            <History className="w-4 h-4 text-blue-400" />
            <span>History ({historyCount})</span>
          </button>
        </div>
      </div>
    </header>
  );
};
