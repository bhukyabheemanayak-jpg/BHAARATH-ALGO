import React from 'react';
import { X, BookOpen, ArrowRight, ShieldCheck, Check } from 'lucide-react';
import { Strategy } from '../types/trading';
import { STRATEGY_TEMPLATES } from '../data/strategyTemplates';

interface TemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTemplate: (template: Strategy) => void;
  currentStrategyId: string;
}

export const TemplateModal: React.FC<TemplateModalProps> = ({
  isOpen,
  onClose,
  onSelectTemplate,
  currentStrategyId,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 lg:p-5 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Strategy Templates Library</h3>
              <p className="text-xs text-slate-400">
                Load battle-tested algorithmic presets with pre-configured legs, stop losses, and timeframes.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Templates Grid */}
        <div className="p-4 lg:p-5 max-h-[70vh] overflow-y-auto space-y-3">
          {STRATEGY_TEMPLATES.map((tpl) => {
            const isSelected = currentStrategyId === tpl.id;

            return (
              <div
                key={tpl.id}
                className={`p-4 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                  isSelected
                    ? 'bg-slate-850 border-emerald-500/50 shadow-sm'
                    : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 hover:bg-slate-800/40'
                }`}
              >
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-white">{tpl.name}</span>
                    <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-850 text-emerald-400 border border-slate-700">
                      {tpl.underlying}
                    </span>
                    <span className="text-xs text-slate-500 font-mono">
                      {tpl.legs.length} legs · {tpl.entryTime} to {tpl.exitTime}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    {tpl.description}
                  </p>
                </div>

                <div className="shrink-0 flex items-center gap-2">
                  <button
                    onClick={() => {
                      onSelectTemplate(tpl);
                      onClose();
                    }}
                    className={`flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-slate-800 text-emerald-400 border border-emerald-500/40'
                        : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm'
                    }`}
                  >
                    <span>{isSelected ? 'Active' : 'Load Template'}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
