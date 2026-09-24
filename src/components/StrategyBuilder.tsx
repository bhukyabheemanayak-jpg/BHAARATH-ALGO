import React, { useState } from 'react';
import {
  Plus,
  Trash2,
  Copy,
  Clock,
  Calendar,
  ShieldAlert,
  Percent,
  TrendingUp,
  Download,
  Upload,
  BookOpen,
  Play,
  RotateCcw,
  Sparkles,
  Lock,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  Sliders,
  Radio,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import {
  DayOfWeek,
  ExpiryType,
  InstrumentType,
  PositionAction,
  StopLossType,
  Strategy,
  StrategyLeg,
  StrikeOffset,
  StrikeSelectionType,
  TargetProfitType,
  UnderlyingIndex,
} from '../types/trading';
import { UNDERLYING_CONFIGS } from '../services/optionPricer';
import { deleteStrategy, saveStrategy } from '../services/strategyStorage';

interface StrategyBuilderProps {
  strategy: Strategy;
  onChangeStrategy: (updated: Strategy) => void;
  onRunBacktest: () => void;
  onOpenTemplates: () => void;
  onOpenLibrary?: () => void;
  onDeployLive?: (strategy: Strategy) => void;
  onDeleteStrategy?: (id: string) => void;
  isBacktesting: boolean;
}

export const StrategyBuilder: React.FC<StrategyBuilderProps> = ({
  strategy,
  onChangeStrategy,
  onRunBacktest,
  onOpenTemplates,
  onOpenLibrary,
  onDeployLive,
  onDeleteStrategy,
  isBacktesting,
}) => {
  const currentConfig = UNDERLYING_CONFIGS[strategy.underlying];
  const [saveToast, setSaveToast] = useState(false);
  const [toastText, setToastText] = useState('Saved to Library!');
  const [isDeleting, setIsDeleting] = useState(false);
  const [expandedLockLegId, setExpandedLockLegId] = useState<string | null>(null);

  const updateStrategy = <K extends keyof Strategy>(key: K, value: Strategy[K]) => {
    onChangeStrategy({ ...strategy, [key]: value });
  };

  const handleUnderlyingChange = (newUnderlying: UnderlyingIndex) => {
    updateStrategy('underlying', newUnderlying);
  };

  const toggleDay = (day: DayOfWeek) => {
    const exists = strategy.daysToTrade.includes(day);
    const updated = exists
      ? strategy.daysToTrade.filter((d) => d !== day)
      : [...strategy.daysToTrade, day];
    if (updated.length > 0) {
      updateStrategy('daysToTrade', updated);
    }
  };

  // Leg Management
  const addLeg = (instrument: InstrumentType, action: PositionAction = 'SELL') => {
    const newLeg: StrategyLeg = {
      id: `leg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      instrument,
      action,
      lots: 1,
      expiry: 'WEEKLY',
      strikeSelectionType: 'OFFSET',
      strikeOffset: 'ATM',
      stopLossType: 'PERCENTAGE',
      stopLossValue: 25,
      targetProfitType: 'NONE',
      targetProfitValue: 0,
      trailingSL: {
        enabled: false,
        onProfitType: 'PERCENTAGE',
        onProfitValue: 20,
        trailByType: 'PERCENTAGE',
        trailByValue: 10,
      },
      trailingTarget: {
        enabled: false,
        onProfitType: 'PERCENTAGE',
        onProfitValue: 20,
        trailByType: 'PERCENTAGE',
        trailByValue: 10,
      },
      lockAndTrail: {
        enabled: false,
        triggerType: 'PERCENTAGE',
        triggerValue: 30,
        lockType: 'PERCENTAGE',
        lockValue: 10,
        trailEveryType: 'PERCENTAGE',
        trailEveryValue: 10,
        trailByType: 'PERCENTAGE',
        trailByValue: 10,
      },
      reEntry: {
        type: 'NONE',
        maxCount: 1,
        triggerOn: 'SL',
        slMaxCount: 1,
        targetMaxCount: 1,
      },
      momentum: {
        enabled: false,
        type: 'PCT_UP',
        value: 10,
      },
    };
    updateStrategy('legs', [...strategy.legs, newLeg]);
  };

  const updateLeg = (legId: string, updates: Partial<StrategyLeg>) => {
    const updatedLegs = strategy.legs.map((leg) =>
      leg.id === legId ? { ...leg, ...updates } : leg
    );
    updateStrategy('legs', updatedLegs);
  };

  const duplicateLeg = (leg: StrategyLeg) => {
    const cloned: StrategyLeg = {
      ...leg,
      id: `leg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    };
    updateStrategy('legs', [...strategy.legs, cloned]);
  };

  const removeLeg = (legId: string) => {
    if (strategy.legs.length <= 1) {
      alert('Strategy must have at least one active leg.');
      return;
    }
    updateStrategy('legs', strategy.legs.filter((l) => l.id !== legId));
  };

  // Export JSON
  const handleExportJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(strategy, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `${strategy.name.toLowerCase().replace(/\s+/g, '_')}_strategy.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Import JSON
  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed.legs && parsed.underlying) {
          onChangeStrategy(parsed);
        } else {
          alert('Invalid strategy JSON schema.');
        }
      } catch (err) {
        alert('Failed to parse strategy JSON file.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Save to Strategy Library
  const handleSaveToLibrary = () => {
    const { strategy: saved, isNew } = saveStrategy(strategy, false);
    onChangeStrategy(saved);
    setToastText(isNew ? 'New Strategy Saved to Library!' : 'Strategy Changes Saved!');
    setSaveToast(true);
    setTimeout(() => setSaveToast(false), 2400);
  };

  // Save as New Strategy
  const handleSaveAsNew = () => {
    const { strategy: saved } = saveStrategy(strategy, true);
    onChangeStrategy(saved);
    setToastText('Saved as New Strategy in Library!');
    setSaveToast(true);
    setTimeout(() => setSaveToast(false), 2400);
  };

  // Delete Strategy
  const handleConfirmDelete = () => {
    deleteStrategy(strategy.id);
    setIsDeleting(false);
    if (onDeleteStrategy) {
      onDeleteStrategy(strategy.id);
    }
  };

  const offsetOptions: { value: StrikeOffset; label: string }[] = [
    { value: 'ITM_3', label: 'ITM 3' },
    { value: 'ITM_2', label: 'ITM 2' },
    { value: 'ITM_1', label: 'ITM 1' },
    { value: 'ATM', label: 'ATM (At The Money)' },
    { value: 'OTM_1', label: 'OTM 1' },
    { value: 'OTM_2', label: 'OTM 2' },
    { value: 'OTM_3', label: 'OTM 3' },
    { value: 'OTM_4', label: 'OTM 4' },
    { value: 'OTM_5', label: 'OTM 5' },
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* Toast */}
      {saveToast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-emerald-600 text-white text-xs font-semibold px-4 py-2.5 rounded-lg shadow-xl border border-emerald-500 animate-in fade-in slide-in-from-bottom-2">
          <CheckCircle2 className="w-4 h-4 text-white" />
          <span>{toastText}</span>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleting && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-rose-400">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <h3 className="text-base font-bold text-white">Delete Current Strategy?</h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Are you sure you want to delete <span className="text-white font-semibold">"{strategy.name}"</span>? It will be permanently removed from your Strategy Library.
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setIsDeleting(false)}
                className="px-3.5 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 rounded-lg transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Confirm Delete</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Strategy Title & Quick Actions Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/70 border border-slate-800 rounded-xl p-4 lg:p-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={strategy.name}
              onChange={(e) => updateStrategy('name', e.target.value)}
              className="text-lg lg:text-xl font-bold text-white bg-transparent border-b border-transparent hover:border-slate-700 focus:border-emerald-500 focus:outline-none transition-colors w-full"
              placeholder="Strategy Name"
            />
            {strategy.isPreset ? (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700 shrink-0">
                Preset
              </span>
            ) : (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800/60 shrink-0">
                Custom
              </span>
            )}
          </div>
          <input
            type="text"
            value={strategy.description}
            onChange={(e) => updateStrategy('description', e.target.value)}
            className="text-xs text-slate-400 bg-transparent border-b border-transparent hover:border-slate-700 focus:border-emerald-500 focus:outline-none transition-colors w-full"
            placeholder="Strategy description..."
          />
        </div>

        <div className="flex items-center flex-wrap gap-2">
          {/* Live Deployment */}
          {onDeployLive && (
            <button
              onClick={() => onDeployLive(strategy)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 rounded-lg transition-colors cursor-pointer shadow-sm shadow-emerald-950"
              title="Deploy this strategy to Live Paper Trading"
            >
              <Radio className="w-3.5 h-3.5" />
              <span>Deploy Live</span>
            </button>
          )}

          {/* Library / Presets */}
          {onOpenLibrary ? (
            <button
              onClick={onOpenLibrary}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-800/80 hover:bg-slate-700 border border-slate-700/60 rounded-lg transition-colors cursor-pointer"
            >
              <BookOpen className="w-3.5 h-3.5 text-amber-400" />
              <span>Library</span>
            </button>
          ) : (
            <button
              onClick={onOpenTemplates}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-800/80 hover:bg-slate-700 border border-slate-700/60 rounded-lg transition-colors cursor-pointer"
            >
              <BookOpen className="w-3.5 h-3.5 text-amber-400" />
              <span>Presets</span>
            </button>
          )}

          {/* Save to Library */}
          <button
            onClick={handleSaveToLibrary}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-400 bg-emerald-950/70 hover:bg-emerald-900/70 border border-emerald-800/80 rounded-lg transition-colors cursor-pointer"
            title="Save strategy to Strategy Library"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Save</span>
          </button>

          {/* Save As New */}
          <button
            onClick={handleSaveAsNew}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-300 bg-slate-800/80 hover:bg-slate-700 border border-slate-700/60 rounded-lg transition-colors cursor-pointer"
            title="Save as a new copy in Library"
          >
            <Copy className="w-3.5 h-3.5 text-slate-400" />
            <span>Save As New</span>
          </button>

          {/* Delete Button */}
          <button
            onClick={() => setIsDeleting(true)}
            className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 border border-slate-700/60 rounded-lg transition-colors cursor-pointer"
            title="Delete this strategy"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>

          {/* Export & Import */}
          <button
            onClick={handleExportJSON}
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-slate-700/60 rounded-lg transition-colors cursor-pointer"
            title="Download Strategy JSON"
          >
            <Download className="w-3.5 h-3.5" />
          </button>

          <label
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-slate-700/60 rounded-lg transition-colors cursor-pointer"
            title="Import Strategy JSON"
          >
            <Upload className="w-3.5 h-3.5" />
            <input type="file" accept=".json" onChange={handleImportJSON} className="hidden" />
          </label>
        </div>
      </div>

      {/* Grid: Global Settings & Risk Rules */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Card 1: Instrument & Timing */}
        <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-emerald-400" />
              1. Underlying & Time
            </span>
            <span className="text-xs font-mono text-slate-500">
              Lot: {currentConfig.lotSize} qty
            </span>
          </div>

          {/* Underlying Selection */}
          <div>
            <label className="text-xs text-slate-400 block mb-1.5">Underlying Index</label>
            <div className="grid grid-cols-3 gap-1.5">
              {(['NIFTY', 'BANKNIFTY', 'FINNIFTY', 'SENSEX', 'MIDCPNIFTY'] as UnderlyingIndex[]).map(
                (sym) => {
                  const isSelected = strategy.underlying === sym;
                  return (
                    <button
                      key={sym}
                      type="button"
                      onClick={() => handleUnderlyingChange(sym)}
                      className={`px-2 py-1.5 text-xs font-medium rounded-lg transition-all text-center ${
                        isSelected
                          ? 'bg-emerald-600 text-white font-semibold shadow-sm'
                          : 'bg-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-700'
                      }`}
                    >
                      {sym}
                    </button>
                  );
                }
              )}
            </div>
          </div>

          {/* Entry & Exit Times */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-400 block mb-1">Entry Time</label>
              <input
                type="time"
                value={strategy.entryTime}
                onChange={(e) => updateStrategy('entryTime', e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs font-mono text-white bg-slate-950 border border-slate-700 rounded-lg focus:border-emerald-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1">Exit Time</label>
              <input
                type="time"
                value={strategy.exitTime}
                onChange={(e) => updateStrategy('exitTime', e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs font-mono text-white bg-slate-950 border border-slate-700 rounded-lg focus:border-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Quick timing presets */}
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <span className="text-slate-500">Presets:</span>
            {['09:20', '09:30', '09:45', '13:00'].map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => updateStrategy('entryTime', preset)}
                className="px-1.5 py-0.5 text-xs font-mono rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
              >
                {preset}
              </button>
            ))}
          </div>
        </div>

        {/* Card 2: Trading Days & Execution Settings */}
        <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-emerald-400" />
              2. Trading Days & Friction
            </span>
            <span className="text-xs font-mono text-slate-500">
              {strategy.daysToTrade.length}/5 Active
            </span>
          </div>

          {/* Day Toggles */}
          <div>
            <label className="text-xs text-slate-400 block mb-1.5">Select Trading Days</label>
            <div className="grid grid-cols-5 gap-1.5">
              {(['MON', 'TUE', 'WED', 'THU', 'FRI'] as DayOfWeek[]).map((day) => {
                const isActive = strategy.daysToTrade.includes(day);
                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => toggleDay(day)}
                    className={`py-1.5 text-xs font-semibold rounded-lg transition-all text-center ${
                      isActive
                        ? 'bg-slate-800 text-emerald-400 border border-emerald-500/40 shadow-sm'
                        : 'bg-slate-950/60 text-slate-600 border border-slate-800 hover:text-slate-400'
                    }`}
                  >
                    {day}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Capital & Friction */}
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-xs text-slate-400 block mb-1">Capital (₹)</label>
              <input
                type="number"
                value={strategy.initialCapital}
                onChange={(e) => updateStrategy('initialCapital', Number(e.target.value))}
                className="w-full px-2 py-1.5 text-xs font-mono text-white bg-slate-950 border border-slate-700 rounded-lg focus:border-emerald-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1">Slippage %</label>
              <input
                type="number"
                step="0.1"
                value={strategy.slippagePct}
                onChange={(e) => updateStrategy('slippagePct', Number(e.target.value))}
                className="w-full px-2 py-1.5 text-xs font-mono text-white bg-slate-950 border border-slate-700 rounded-lg focus:border-emerald-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1">Fee/Order (₹)</label>
              <input
                type="number"
                value={strategy.brokeragePerOrder}
                onChange={(e) => updateStrategy('brokeragePerOrder', Number(e.target.value))}
                className="w-full px-2 py-1.5 text-xs font-mono text-white bg-slate-950 border border-slate-700 rounded-lg focus:border-emerald-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Card 3: Overall Strategy Risk (MTM SL & Target) */}
        <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5 text-emerald-400" />
              3. Strategy Level Risk
            </span>
            <div className="flex items-center gap-1 text-xs">
              <span className="text-slate-500">Square-off:</span>
              <button
                type="button"
                onClick={() =>
                  updateStrategy(
                    'squareOffType',
                    strategy.squareOffType === 'COMPLETE' ? 'PARTIAL' : 'COMPLETE'
                  )
                }
                className="font-mono text-emerald-400 underline decoration-dotted hover:text-emerald-300"
              >
                {strategy.squareOffType}
              </button>
            </div>
          </div>

          {/* Overall MTM Stop Loss */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="overall_sl_toggle"
                checked={strategy.overallRisk.stopLossEnabled}
                onChange={(e) =>
                  updateStrategy('overallRisk', {
                    ...strategy.overallRisk,
                    stopLossEnabled: e.target.checked,
                  })
                }
                className="rounded border-slate-700 bg-slate-950 text-emerald-500 focus:ring-0"
              />
              <label htmlFor="overall_sl_toggle" className="text-xs text-slate-300">
                Overall Max Loss (SL)
              </label>
            </div>
            {strategy.overallRisk.stopLossEnabled && (
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  value={strategy.overallRisk.stopLossValue}
                  onChange={(e) =>
                    updateStrategy('overallRisk', {
                      ...strategy.overallRisk,
                      stopLossValue: Number(e.target.value),
                    })
                  }
                  className="w-20 px-2 py-1 text-xs font-mono text-white bg-slate-950 border border-slate-700 rounded focus:outline-none focus:border-emerald-500"
                />
                <button
                  type="button"
                  onClick={() =>
                    updateStrategy('overallRisk', {
                      ...strategy.overallRisk,
                      stopLossType:
                        strategy.overallRisk.stopLossType === 'MTM_AMOUNT'
                          ? 'MTM_PCT'
                          : 'MTM_AMOUNT',
                    })
                  }
                  className="px-1.5 py-1 text-xs font-mono bg-slate-800 rounded text-slate-300"
                >
                  {strategy.overallRisk.stopLossType === 'MTM_AMOUNT' ? '₹' : '%'}
                </button>
              </div>
            )}
          </div>

          {/* Overall MTM Target */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="overall_tgt_toggle"
                checked={strategy.overallRisk.targetEnabled}
                onChange={(e) =>
                  updateStrategy('overallRisk', {
                    ...strategy.overallRisk,
                    targetEnabled: e.target.checked,
                  })
                }
                className="rounded border-slate-700 bg-slate-950 text-emerald-500 focus:ring-0"
              />
              <label htmlFor="overall_tgt_toggle" className="text-xs text-slate-300">
                Overall Target Profit
              </label>
            </div>
            {strategy.overallRisk.targetEnabled && (
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  value={strategy.overallRisk.targetValue}
                  onChange={(e) =>
                    updateStrategy('overallRisk', {
                      ...strategy.overallRisk,
                      targetValue: Number(e.target.value),
                    })
                  }
                  className="w-20 px-2 py-1 text-xs font-mono text-white bg-slate-950 border border-slate-700 rounded focus:outline-none focus:border-emerald-500"
                />
                <button
                  type="button"
                  onClick={() =>
                    updateStrategy('overallRisk', {
                      ...strategy.overallRisk,
                      targetType:
                        strategy.overallRisk.targetType === 'MTM_AMOUNT'
                          ? 'MTM_PCT'
                          : 'MTM_AMOUNT',
                    })
                  }
                  className="px-1.5 py-1 text-xs font-mono bg-slate-800 rounded text-slate-300"
                >
                  {strategy.overallRisk.targetType === 'MTM_AMOUNT' ? '₹' : '%'}
                </button>
              </div>
            )}
          </div>

          {/* Overall Trailing Target */}
          <div className="space-y-1.5 pt-1 border-t border-slate-800/60">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="overall_trail_tgt_toggle"
                  checked={Boolean(strategy.overallRisk.trailingTargetEnabled)}
                  onChange={(e) =>
                    updateStrategy('overallRisk', {
                      ...strategy.overallRisk,
                      trailingTargetEnabled: e.target.checked,
                      trailingTargetValue: strategy.overallRisk.trailingTargetValue || 2000,
                    })
                  }
                  className="rounded border-slate-700 bg-slate-950 text-emerald-500 focus:ring-0"
                />
                <label htmlFor="overall_trail_tgt_toggle" className="text-xs text-slate-300 flex items-center gap-1">
                  <span>Trail Overall Target</span>
                  <span className="text-[10px] text-emerald-400 font-mono font-normal">(Extend runner)</span>
                </label>
              </div>
              {strategy.overallRisk.trailingTargetEnabled && (
                <div className="flex items-center gap-1">
                  <span className="text-[10px] text-slate-400">By ₹</span>
                  <input
                    type="number"
                    value={strategy.overallRisk.trailingTargetValue || 2000}
                    onChange={(e) =>
                      updateStrategy('overallRisk', {
                        ...strategy.overallRisk,
                        trailingTargetValue: Number(e.target.value),
                      })
                    }
                    className="w-20 px-2 py-1 text-xs font-mono text-white bg-slate-950 border border-slate-700 rounded focus:outline-none focus:border-emerald-500"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Overall Lock & Trail Strategy Profit */}
          <div className="space-y-2 pt-1.5 border-t border-slate-800/60">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="overall_lock_trail_toggle"
                  checked={Boolean(strategy.overallRisk.lockAndTrailEnabled)}
                  onChange={(e) =>
                    updateStrategy('overallRisk', {
                      ...strategy.overallRisk,
                      lockAndTrailEnabled: e.target.checked,
                      lockAndTrailTrigger: strategy.overallRisk.lockAndTrailTrigger || 4000,
                      lockAndTrailLockAmount: strategy.overallRisk.lockAndTrailLockAmount ?? 2000,
                      lockAndTrailStepAmount: strategy.overallRisk.lockAndTrailStepAmount || 1000,
                      lockAndTrailTrailAmount: strategy.overallRisk.lockAndTrailTrailAmount || 500,
                    })
                  }
                  className="rounded border-slate-700 bg-slate-950 text-amber-500 focus:ring-0"
                />
                <label htmlFor="overall_lock_trail_toggle" className="text-xs font-medium text-amber-300 flex items-center gap-1.5">
                  <Lock className="w-3 h-3 text-amber-400" />
                  <span>Lock & Trail Overall Profit</span>
                </label>
              </div>
            </div>

            {strategy.overallRisk.lockAndTrailEnabled && (
              <div className="p-2.5 rounded-lg bg-amber-950/20 border border-amber-800/30 space-y-2 text-[11px]">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-slate-400 block mb-0.5">If MTM Reaches:</span>
                    <div className="flex items-center gap-1">
                      <span className="text-slate-500 font-mono">₹</span>
                      <input
                        type="number"
                        value={strategy.overallRisk.lockAndTrailTrigger ?? 4000}
                        onChange={(e) =>
                          updateStrategy('overallRisk', {
                            ...strategy.overallRisk,
                            lockAndTrailTrigger: Number(e.target.value),
                          })
                        }
                        className="w-full px-2 py-1 text-xs font-mono text-white bg-slate-950 border border-slate-800 rounded focus:border-amber-500"
                      />
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-0.5">Lock Profit At:</span>
                    <div className="flex items-center gap-1">
                      <span className="text-slate-500 font-mono">₹</span>
                      <input
                        type="number"
                        value={strategy.overallRisk.lockAndTrailLockAmount ?? 2000}
                        onChange={(e) =>
                          updateStrategy('overallRisk', {
                            ...strategy.overallRisk,
                            lockAndTrailLockAmount: Number(e.target.value),
                          })
                        }
                        className="w-full px-2 py-1 text-xs font-mono text-emerald-400 font-semibold bg-slate-950 border border-slate-800 rounded focus:border-amber-500"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-amber-800/20">
                  <div>
                    <span className="text-slate-400 block mb-0.5">Then for every +₹:</span>
                    <div className="flex items-center gap-1">
                      <span className="text-slate-500 font-mono">₹</span>
                      <input
                        type="number"
                        value={strategy.overallRisk.lockAndTrailStepAmount ?? 1000}
                        onChange={(e) =>
                          updateStrategy('overallRisk', {
                            ...strategy.overallRisk,
                            lockAndTrailStepAmount: Number(e.target.value),
                          })
                        }
                        className="w-full px-2 py-1 text-xs font-mono text-white bg-slate-950 border border-slate-800 rounded focus:border-amber-500"
                      />
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-0.5">Trail Profit By:</span>
                    <div className="flex items-center gap-1">
                      <span className="text-slate-500 font-mono">₹</span>
                      <input
                        type="number"
                        value={strategy.overallRisk.lockAndTrailTrailAmount ?? 500}
                        onChange={(e) =>
                          updateStrategy('overallRisk', {
                            ...strategy.overallRisk,
                            lockAndTrailTrailAmount: Number(e.target.value),
                          })
                        }
                        className="w-full px-2 py-1 text-xs font-mono text-amber-300 font-semibold bg-slate-950 border border-slate-800 rounded focus:border-amber-500"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Strategy Legs Section Header */}
      <div className="flex items-center justify-between pt-2">
        <div className="flex items-center gap-2">
          <span className="text-base font-bold text-white">Strategy Legs</span>
          <span className="text-xs text-slate-400">({strategy.legs.length} configured)</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => addLeg('CE', 'SELL')}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-rose-300 bg-rose-950/40 hover:bg-rose-900/50 border border-rose-800/60 rounded-lg transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Sell Call (CE)</span>
          </button>

          <button
            type="button"
            onClick={() => addLeg('PE', 'SELL')}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-rose-300 bg-rose-950/40 hover:bg-rose-900/50 border border-rose-800/60 rounded-lg transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Sell Put (PE)</span>
          </button>

          <button
            type="button"
            onClick={() => addLeg('CE', 'BUY')}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-emerald-300 bg-emerald-950/40 hover:bg-emerald-900/50 border border-emerald-800/60 rounded-lg transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Buy Call (CE)</span>
          </button>

          <button
            type="button"
            onClick={() => addLeg('PE', 'BUY')}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-emerald-300 bg-emerald-950/40 hover:bg-emerald-900/50 border border-emerald-800/60 rounded-lg transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Buy Put (PE)</span>
          </button>
        </div>
      </div>

      {/* Leg Cards List */}
      <div className="space-y-4">
        {strategy.legs.map((leg, index) => {
          const isSell = leg.action === 'SELL';
          const qty = leg.lots * currentConfig.lotSize;

          return (
            <div
              key={leg.id}
              className={`rounded-xl border p-4 transition-all ${
                isSell
                  ? 'bg-slate-900/80 border-rose-950/80 hover:border-rose-900/60'
                  : 'bg-slate-900/80 border-emerald-950/80 hover:border-emerald-900/60'
              }`}
            >
              {/* Top Leg Row: Action, Instrument, Strike, Lots, Controls */}
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span className="text-xs font-bold text-slate-500 font-mono">
                    #{index + 1}
                  </span>

                  {/* Buy / Sell Toggle */}
                  <div className="flex items-center bg-slate-950 p-0.5 rounded-lg border border-slate-800">
                    <button
                      type="button"
                      onClick={() => updateLeg(leg.id, { action: 'BUY' })}
                      className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
                        !isSell
                          ? 'bg-emerald-600 text-white shadow-sm'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      BUY
                    </button>
                    <button
                      type="button"
                      onClick={() => updateLeg(leg.id, { action: 'SELL' })}
                      className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
                        isSell
                          ? 'bg-rose-600 text-white shadow-sm'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      SELL
                    </button>
                  </div>

                  {/* CE / PE / FUT */}
                  <div className="flex items-center bg-slate-950 p-0.5 rounded-lg border border-slate-800">
                    {(['CE', 'PE', 'FUT'] as InstrumentType[]).map((inst) => (
                      <button
                        key={inst}
                        type="button"
                        onClick={() => updateLeg(leg.id, { instrument: inst })}
                        className={`px-2.5 py-1 text-xs font-bold rounded-md transition-all ${
                          leg.instrument === inst
                            ? 'bg-slate-800 text-emerald-400'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        {inst}
                      </button>
                    ))}
                  </div>

                  {/* Lots & Qty */}
                  <div className="flex items-center gap-1.5 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800 text-xs">
                    <span className="text-slate-400">Lots:</span>
                    <input
                      type="number"
                      min={1}
                      max={100}
                      value={leg.lots}
                      onChange={(e) => updateLeg(leg.id, { lots: Math.max(1, Number(e.target.value)) })}
                      className="w-12 text-center font-mono font-bold text-white bg-transparent focus:outline-none"
                    />
                    <span className="text-slate-500 font-mono">({qty} qty)</span>
                  </div>

                  {/* Expiry Selector */}
                  <select
                    value={leg.expiry}
                    onChange={(e) => updateLeg(leg.id, { expiry: e.target.value as ExpiryType })}
                    className="bg-slate-950 border border-slate-800 text-xs text-slate-300 rounded-lg px-2.5 py-1 focus:outline-none"
                  >
                    <option value="WEEKLY">Weekly</option>
                    <option value="NEXT_WEEKLY">Next Weekly</option>
                    <option value="MONTHLY">Monthly</option>
                  </select>
                </div>

                {/* Clone & Delete Actions */}
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => duplicateLeg(leg)}
                    className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-md transition-colors"
                    title="Duplicate Leg"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => removeLeg(leg.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 rounded-md transition-colors"
                    title="Delete Leg"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Bottom Leg Row: Strike Selection, SL, Target, Trailing SL, Re-entry */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 pt-3">
                {/* 1. Strike Selection */}
                <div className="space-y-1">
                  <label className="text-xs text-slate-400 block">Strike Selection</label>
                  <div className="flex items-center gap-1">
                    <select
                      value={leg.strikeSelectionType}
                      onChange={(e) =>
                        updateLeg(leg.id, { strikeSelectionType: e.target.value as StrikeSelectionType })
                      }
                      className="bg-slate-950 border border-slate-800 text-xs text-slate-300 rounded-lg px-2 py-1.5 focus:outline-none flex-1"
                    >
                      <option value="OFFSET">Strike Offset</option>
                      <option value="CLOSEST_PREMIUM">Closest Premium</option>
                      <option value="DELTA">Target Delta</option>
                    </select>

                    {leg.strikeSelectionType === 'OFFSET' && (
                      <select
                        value={leg.strikeOffset}
                        onChange={(e) => updateLeg(leg.id, { strikeOffset: e.target.value as StrikeOffset })}
                        className="bg-slate-950 border border-slate-800 text-xs font-mono text-emerald-400 rounded-lg px-2 py-1.5 focus:outline-none flex-1"
                      >
                        {offsetOptions.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    )}

                    {leg.strikeSelectionType === 'CLOSEST_PREMIUM' && (
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-slate-400">₹</span>
                        <input
                          type="number"
                          value={leg.closestPremiumTarget || 100}
                          onChange={(e) => updateLeg(leg.id, { closestPremiumTarget: Number(e.target.value) })}
                          className="w-16 bg-slate-950 border border-slate-800 text-xs font-mono text-white rounded-lg px-2 py-1.5 focus:outline-none"
                        />
                      </div>
                    )}

                    {leg.strikeSelectionType === 'DELTA' && (
                      <select
                        value={leg.targetDelta || 0.3}
                        onChange={(e) => updateLeg(leg.id, { targetDelta: Number(e.target.value) })}
                        className="bg-slate-950 border border-slate-800 text-xs font-mono text-white rounded-lg px-2 py-1.5 focus:outline-none"
                      >
                        <option value={0.15}>0.15 Delta</option>
                        <option value={0.2}>0.20 Delta</option>
                        <option value={0.3}>0.30 Delta</option>
                        <option value={0.4}>0.40 Delta</option>
                        <option value={0.5}>0.50 (ATM)</option>
                      </select>
                    )}
                  </div>
                </div>

                {/* 2. Stop Loss & Editable Trailing SL */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs text-slate-400 font-medium">Stop Loss</label>
                    <select
                      value={leg.stopLossType}
                      onChange={(e) => updateLeg(leg.id, { stopLossType: e.target.value as StopLossType })}
                      className="bg-transparent text-xs text-slate-400 focus:outline-none cursor-pointer"
                    >
                      <option value="PERCENTAGE">% SL</option>
                      <option value="POINTS">Pts SL</option>
                      <option value="NONE">No SL</option>
                    </select>
                  </div>
                  {leg.stopLossType !== 'NONE' ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          min={0}
                          value={leg.stopLossValue}
                          onChange={(e) => updateLeg(leg.id, { stopLossValue: Number(e.target.value) })}
                          className="w-full bg-slate-950 border border-slate-800 text-xs font-mono text-rose-400 font-semibold rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-rose-500"
                          placeholder="SL value"
                        />
                        <span className="text-xs font-mono text-slate-500">
                          {leg.stopLossType === 'PERCENTAGE' ? '%' : 'pts'}
                        </span>
                      </div>

                      {/* Editable Trailing Stop Loss */}
                      <div className="pt-1 border-t border-slate-800/80">
                        <div className="flex items-center justify-between text-xs">
                          <label className="text-slate-400 flex items-center gap-1.5 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={Boolean(leg.trailingSL?.enabled)}
                              onChange={(e) =>
                                updateLeg(leg.id, {
                                  trailingSL: {
                                    ...(leg.trailingSL || {
                                      onProfitType: 'PERCENTAGE',
                                      onProfitValue: 20,
                                      trailByType: 'PERCENTAGE',
                                      trailByValue: 10,
                                    }),
                                    enabled: e.target.checked,
                                  },
                                })
                              }
                              className="rounded border-slate-700 bg-slate-950 text-emerald-500 focus:ring-0"
                            />
                            <span className="text-slate-300 font-medium">Trail Stop Loss</span>
                          </label>
                        </div>

                        {leg.trailingSL?.enabled && (
                          <div className="mt-1.5 p-2 bg-slate-950/80 rounded-lg border border-slate-800 space-y-1.5 text-[11px]">
                            <div className="flex items-center justify-between gap-1">
                              <span className="text-slate-400">On Profit:</span>
                              <div className="flex items-center gap-1">
                                <input
                                  type="number"
                                  min={0}
                                  value={leg.trailingSL.onProfitValue}
                                  onChange={(e) =>
                                    updateLeg(leg.id, {
                                      trailingSL: {
                                        ...leg.trailingSL,
                                        onProfitValue: Number(e.target.value),
                                      },
                                    })
                                  }
                                  className="w-14 px-1.5 py-0.5 text-xs font-mono text-white bg-slate-900 border border-slate-700 rounded focus:outline-none focus:border-emerald-500"
                                />
                                <button
                                  type="button"
                                  onClick={() =>
                                    updateLeg(leg.id, {
                                      trailingSL: {
                                        ...leg.trailingSL,
                                        onProfitType:
                                          leg.trailingSL.onProfitType === 'PERCENTAGE'
                                            ? 'POINTS'
                                            : 'PERCENTAGE',
                                      },
                                    })
                                  }
                                  className="px-1 py-0.5 text-[10px] font-mono bg-slate-800 hover:bg-slate-700 rounded text-slate-300 transition-colors"
                                >
                                  {leg.trailingSL.onProfitType === 'PERCENTAGE' ? '%' : 'pts'}
                                </button>
                              </div>
                            </div>

                            <div className="flex items-center justify-between gap-1">
                              <span className="text-slate-400">Trail SL By:</span>
                              <div className="flex items-center gap-1">
                                <input
                                  type="number"
                                  min={0}
                                  value={leg.trailingSL.trailByValue}
                                  onChange={(e) =>
                                    updateLeg(leg.id, {
                                      trailingSL: {
                                        ...leg.trailingSL,
                                        trailByValue: Number(e.target.value),
                                      },
                                    })
                                  }
                                  className="w-14 px-1.5 py-0.5 text-xs font-mono text-white bg-slate-900 border border-slate-700 rounded focus:outline-none focus:border-emerald-500"
                                />
                                <button
                                  type="button"
                                  onClick={() =>
                                    updateLeg(leg.id, {
                                      trailingSL: {
                                        ...leg.trailingSL,
                                        trailByType:
                                          leg.trailingSL.trailByType === 'PERCENTAGE'
                                            ? 'POINTS'
                                            : 'PERCENTAGE',
                                      },
                                    })
                                  }
                                  className="px-1 py-0.5 text-[10px] font-mono bg-slate-800 hover:bg-slate-700 rounded text-slate-300 transition-colors"
                                >
                                  {leg.trailingSL.trailByType === 'PERCENTAGE' ? '%' : 'pts'}
                                </button>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Re-entry on Stop Loss */}
                        <div className="pt-1.5 border-t border-slate-800/80">
                          <div className="flex items-center justify-between text-xs">
                            <label className="text-slate-400 flex items-center gap-1.5 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={
                                  leg.reEntry.type !== 'NONE' &&
                                  (leg.reEntry.triggerOn === 'SL' || leg.reEntry.triggerOn === 'BOTH')
                                }
                                onChange={(e) => {
                                  const checked = e.target.checked;
                                  if (checked) {
                                    const isTgtActive =
                                      leg.reEntry.type !== 'NONE' &&
                                      (leg.reEntry.triggerOn === 'TARGET' || leg.reEntry.triggerOn === 'BOTH');
                                    updateLeg(leg.id, {
                                      reEntry: {
                                        ...leg.reEntry,
                                        type: leg.reEntry.type === 'NONE' ? 'ASAP' : leg.reEntry.type,
                                        triggerOn: isTgtActive ? 'BOTH' : 'SL',
                                        maxCount: Math.max(1, leg.reEntry.maxCount || 1),
                                        slMaxCount: Math.max(1, leg.reEntry.slMaxCount || leg.reEntry.maxCount || 1),
                                      },
                                    });
                                  } else {
                                    if (leg.reEntry.triggerOn === 'BOTH') {
                                      updateLeg(leg.id, {
                                        reEntry: {
                                          ...leg.reEntry,
                                          triggerOn: 'TARGET',
                                        },
                                      });
                                    } else {
                                      updateLeg(leg.id, {
                                        reEntry: {
                                          ...leg.reEntry,
                                          type: 'NONE',
                                        },
                                      });
                                    }
                                  }
                                }}
                                className="rounded border-slate-700 bg-slate-950 text-indigo-500 focus:ring-0"
                              />
                              <span className="text-slate-300 font-medium">Re-enter on SL</span>
                            </label>
                            {leg.reEntry.type !== 'NONE' &&
                              (leg.reEntry.triggerOn === 'SL' || leg.reEntry.triggerOn === 'BOTH') && (
                                <div className="flex items-center gap-1">
                                  <input
                                    type="number"
                                    min={1}
                                    max={20}
                                    value={leg.reEntry.slMaxCount ?? leg.reEntry.maxCount ?? 1}
                                    onChange={(e) => {
                                      const val = Math.max(1, Number(e.target.value));
                                      updateLeg(leg.id, {
                                        reEntry: {
                                          ...leg.reEntry,
                                          slMaxCount: val,
                                          maxCount: Math.max(val, leg.reEntry.maxCount || 1),
                                        },
                                      });
                                    }}
                                    className="w-10 px-1 py-0.5 text-xs font-mono text-center text-indigo-300 bg-slate-900 border border-slate-700 rounded focus:border-indigo-500 focus:outline-none"
                                    title="No. of Re-entries on Stop Loss"
                                  />
                                  <span className="text-[10px] text-slate-400 font-mono">times</span>
                                </div>
                              )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-xs text-slate-500 italic py-1.5">No Stop Loss configured</div>
                  )}
                </div>

                {/* 3. Target Profit & Trailing Target */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs text-slate-400 font-medium">Target Profit</label>
                    <select
                      value={leg.targetProfitType}
                      onChange={(e) =>
                        updateLeg(leg.id, { targetProfitType: e.target.value as TargetProfitType })
                      }
                      className="bg-transparent text-xs text-slate-400 focus:outline-none cursor-pointer"
                    >
                      <option value="NONE">No Target</option>
                      <option value="PERCENTAGE">% Target</option>
                      <option value="POINTS">Pts Target</option>
                    </select>
                  </div>
                  {leg.targetProfitType !== 'NONE' ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          min={0}
                          value={leg.targetProfitValue}
                          onChange={(e) => updateLeg(leg.id, { targetProfitValue: Number(e.target.value) })}
                          className="w-full bg-slate-950 border border-slate-800 text-xs font-mono text-emerald-400 font-semibold rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-emerald-500"
                          placeholder="Target value"
                        />
                        <span className="text-xs font-mono text-slate-500">
                          {leg.targetProfitType === 'PERCENTAGE' ? '%' : 'pts'}
                        </span>
                      </div>

                      {/* Editable Trailing Target Profit */}
                      <div className="pt-1 border-t border-slate-800/80">
                        <div className="flex items-center justify-between text-xs">
                          <label className="text-slate-400 flex items-center gap-1.5 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={Boolean(leg.trailingTarget?.enabled)}
                              onChange={(e) =>
                                updateLeg(leg.id, {
                                  trailingTarget: {
                                    ...(leg.trailingTarget || {
                                      onProfitType: 'PERCENTAGE',
                                      onProfitValue: 20,
                                      trailByType: 'PERCENTAGE',
                                      trailByValue: 10,
                                    }),
                                    enabled: e.target.checked,
                                  },
                                })
                              }
                              className="rounded border-slate-700 bg-slate-950 text-emerald-500 focus:ring-0"
                            />
                            <span className="text-slate-300 font-medium">Trail Target</span>
                          </label>
                        </div>

                        {leg.trailingTarget?.enabled && (
                          <div className="mt-1.5 p-2 bg-slate-950/80 rounded-lg border border-slate-800 space-y-1.5 text-[11px]">
                            <div className="flex items-center justify-between gap-1">
                              <span className="text-slate-400">For Every:</span>
                              <div className="flex items-center gap-1">
                                <input
                                  type="number"
                                  min={0}
                                  value={leg.trailingTarget.onProfitValue}
                                  onChange={(e) =>
                                    updateLeg(leg.id, {
                                      trailingTarget: {
                                        ...leg.trailingTarget!,
                                        onProfitValue: Number(e.target.value),
                                      },
                                    })
                                  }
                                  className="w-14 px-1.5 py-0.5 text-xs font-mono text-white bg-slate-900 border border-slate-700 rounded focus:outline-none focus:border-emerald-500"
                                />
                                <button
                                  type="button"
                                  onClick={() =>
                                    updateLeg(leg.id, {
                                      trailingTarget: {
                                        ...leg.trailingTarget!,
                                        onProfitType:
                                          leg.trailingTarget?.onProfitType === 'PERCENTAGE'
                                            ? 'POINTS'
                                            : 'PERCENTAGE',
                                      },
                                    })
                                  }
                                  className="px-1 py-0.5 text-[10px] font-mono bg-slate-800 hover:bg-slate-700 rounded text-slate-300 transition-colors"
                                >
                                  {leg.trailingTarget.onProfitType === 'PERCENTAGE' ? '%' : 'pts'}
                                </button>
                              </div>
                            </div>

                            <div className="flex items-center justify-between gap-1">
                              <span className="text-slate-400">Extend By:</span>
                              <div className="flex items-center gap-1">
                                <input
                                  type="number"
                                  min={0}
                                  value={leg.trailingTarget.trailByValue}
                                  onChange={(e) =>
                                    updateLeg(leg.id, {
                                      trailingTarget: {
                                        ...leg.trailingTarget!,
                                        trailByValue: Number(e.target.value),
                                      },
                                    })
                                  }
                                  className="w-14 px-1.5 py-0.5 text-xs font-mono text-emerald-400 bg-slate-900 border border-slate-700 rounded focus:outline-none focus:border-emerald-500"
                                />
                                <button
                                  type="button"
                                  onClick={() =>
                                    updateLeg(leg.id, {
                                      trailingTarget: {
                                        ...leg.trailingTarget!,
                                        trailByType:
                                          leg.trailingTarget?.trailByType === 'PERCENTAGE'
                                            ? 'POINTS'
                                            : 'PERCENTAGE',
                                      },
                                    })
                                  }
                                  className="px-1 py-0.5 text-[10px] font-mono bg-slate-800 hover:bg-slate-700 rounded text-slate-300 transition-colors"
                                >
                                  {leg.trailingTarget.trailByType === 'PERCENTAGE' ? '%' : 'pts'}
                                </button>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Re-entry on Target */}
                        <div className="pt-1.5 border-t border-slate-800/80">
                          <div className="flex items-center justify-between text-xs">
                            <label className="text-slate-400 flex items-center gap-1.5 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={
                                  leg.reEntry.type !== 'NONE' &&
                                  (leg.reEntry.triggerOn === 'TARGET' || leg.reEntry.triggerOn === 'BOTH')
                                }
                                onChange={(e) => {
                                  const checked = e.target.checked;
                                  if (checked) {
                                    const isSlActive =
                                      leg.reEntry.type !== 'NONE' &&
                                      (leg.reEntry.triggerOn === 'SL' || leg.reEntry.triggerOn === 'BOTH');
                                    updateLeg(leg.id, {
                                      reEntry: {
                                        ...leg.reEntry,
                                        type: leg.reEntry.type === 'NONE' ? 'ASAP' : leg.reEntry.type,
                                        triggerOn: isSlActive ? 'BOTH' : 'TARGET',
                                        maxCount: Math.max(1, leg.reEntry.maxCount || 1),
                                        targetMaxCount: Math.max(1, leg.reEntry.targetMaxCount || leg.reEntry.maxCount || 1),
                                      },
                                    });
                                  } else {
                                    if (leg.reEntry.triggerOn === 'BOTH') {
                                      updateLeg(leg.id, {
                                        reEntry: {
                                          ...leg.reEntry,
                                          triggerOn: 'SL',
                                        },
                                      });
                                    } else {
                                      updateLeg(leg.id, {
                                        reEntry: {
                                          ...leg.reEntry,
                                          type: 'NONE',
                                        },
                                      });
                                    }
                                  }
                                }}
                                className="rounded border-slate-700 bg-slate-950 text-indigo-500 focus:ring-0"
                              />
                              <span className="text-slate-300 font-medium">Re-enter on Target</span>
                            </label>
                            {leg.reEntry.type !== 'NONE' &&
                              (leg.reEntry.triggerOn === 'TARGET' || leg.reEntry.triggerOn === 'BOTH') && (
                                <div className="flex items-center gap-1">
                                  <input
                                    type="number"
                                    min={1}
                                    max={20}
                                    value={leg.reEntry.targetMaxCount ?? leg.reEntry.maxCount ?? 1}
                                    onChange={(e) => {
                                      const val = Math.max(1, Number(e.target.value));
                                      updateLeg(leg.id, {
                                        reEntry: {
                                          ...leg.reEntry,
                                          targetMaxCount: val,
                                          maxCount: Math.max(val, leg.reEntry.maxCount || 1),
                                        },
                                      });
                                    }}
                                    className="w-10 px-1 py-0.5 text-xs font-mono text-center text-emerald-300 bg-slate-900 border border-slate-700 rounded focus:border-emerald-500 focus:outline-none"
                                    title="No. of Re-entries on Target Profit"
                                  />
                                  <span className="text-[10px] text-slate-400 font-mono">times</span>
                                </div>
                              )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-xs text-slate-500 italic py-1.5">No Target configured</div>
                  )}
                </div>

                {/* 4. Re-entry & Momentum Configuration */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs text-slate-400 font-medium">Re-entry Engine</label>
                    <span
                      className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                        leg.reEntry.type !== 'NONE'
                          ? 'bg-indigo-950/80 text-indigo-300 border border-indigo-800/40'
                          : 'bg-slate-900 text-slate-500'
                      }`}
                    >
                      {leg.reEntry.type !== 'NONE'
                        ? `${leg.reEntry.maxCount || 1}x ${leg.reEntry.triggerOn}`
                        : 'Off'}
                    </span>
                  </div>

                  <div className="space-y-2">
                    {/* Re-entry Master Row */}
                    <div className="flex items-center justify-between text-xs">
                      <label className="text-slate-400 flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={leg.reEntry.type !== 'NONE'}
                          onChange={(e) =>
                            updateLeg(leg.id, {
                              reEntry: {
                                ...(leg.reEntry || {
                                  type: 'ASAP',
                                  maxCount: 1,
                                  triggerOn: 'BOTH',
                                }),
                                type: e.target.checked ? 'ASAP' : 'NONE',
                                maxCount: Math.max(1, leg.reEntry.maxCount || 1),
                                slMaxCount: Math.max(1, leg.reEntry.slMaxCount || leg.reEntry.maxCount || 1),
                                targetMaxCount: Math.max(1, leg.reEntry.targetMaxCount || leg.reEntry.maxCount || 1),
                              },
                            })
                          }
                          className="rounded border-slate-700 bg-slate-950 text-indigo-500 focus:ring-0"
                        />
                        <span className="text-slate-300 font-medium">Enable Re-entry</span>
                      </label>

                      {leg.reEntry.type !== 'NONE' && (
                        <select
                          value={leg.reEntry.type}
                          onChange={(e) =>
                            updateLeg(leg.id, {
                              reEntry: { ...leg.reEntry, type: e.target.value as any },
                            })
                          }
                          className="bg-slate-950 text-xs font-mono text-indigo-300 rounded px-1.5 py-0.5 border border-slate-800 focus:outline-none focus:border-indigo-500"
                        >
                          <option value="ASAP">ASAP (Market)</option>
                          <option value="ASAP_REVERSE">ASAP Reverse</option>
                          <option value="RE_COST">Re-Cost</option>
                          <option value="RE_EXECUTE">Re-Execute</option>
                        </select>
                      )}
                    </div>

                    {/* Detailed Re-entry Controls when active */}
                    {leg.reEntry.type !== 'NONE' && (
                      <div className="p-2 bg-slate-950/80 rounded-lg border border-slate-800 space-y-2 text-[11px]">
                        {/* Trigger On: SL / Target / Both */}
                        <div>
                          <span className="text-slate-400 block mb-1 text-[10px]">Trigger Re-entry On:</span>
                          <div className="grid grid-cols-3 gap-1">
                            <button
                              type="button"
                              onClick={() =>
                                updateLeg(leg.id, {
                                  reEntry: { ...leg.reEntry, triggerOn: 'SL' },
                                })
                              }
                              className={`py-1 px-1 rounded text-center text-[10px] font-medium transition-colors cursor-pointer ${
                                leg.reEntry.triggerOn === 'SL'
                                  ? 'bg-rose-950 text-rose-300 border border-rose-700 font-semibold'
                                  : 'bg-slate-900 text-slate-400 hover:bg-slate-850 border border-slate-800'
                              }`}
                            >
                              🛑 On SL
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                updateLeg(leg.id, {
                                  reEntry: { ...leg.reEntry, triggerOn: 'TARGET' },
                                })
                              }
                              className={`py-1 px-1 rounded text-center text-[10px] font-medium transition-colors cursor-pointer ${
                                leg.reEntry.triggerOn === 'TARGET'
                                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-700 font-semibold'
                                  : 'bg-slate-900 text-slate-400 hover:bg-slate-850 border border-slate-800'
                              }`}
                            >
                              🎯 On Target
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                updateLeg(leg.id, {
                                  reEntry: { ...leg.reEntry, triggerOn: 'BOTH' },
                                })
                              }
                              className={`py-1 px-1 rounded text-center text-[10px] font-medium transition-colors cursor-pointer ${
                                leg.reEntry.triggerOn === 'BOTH'
                                  ? 'bg-indigo-950 text-indigo-300 border border-indigo-700 font-semibold'
                                  : 'bg-slate-900 text-slate-400 hover:bg-slate-850 border border-slate-800'
                              }`}
                            >
                              🔄 On Both
                            </button>
                          </div>
                        </div>

                        {/* Number of Re-entries (Editable with Steppers) */}
                        <div className="space-y-1.5 pt-1 border-t border-slate-800/80">
                          <div className="flex items-center justify-between">
                            <span className="text-slate-400 text-[10px]">No. of Re-entries:</span>
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => {
                                  const current = leg.reEntry.maxCount || 1;
                                  const next = Math.max(1, current - 1);
                                  updateLeg(leg.id, {
                                    reEntry: {
                                      ...leg.reEntry,
                                      maxCount: next,
                                      slMaxCount: next,
                                      targetMaxCount: next,
                                    },
                                  });
                                }}
                                className="w-5 h-5 flex items-center justify-center bg-slate-900 hover:bg-slate-800 rounded border border-slate-700 text-slate-300 font-bold cursor-pointer"
                              >
                                -
                              </button>
                              <input
                                type="number"
                                min={1}
                                max={20}
                                value={leg.reEntry.maxCount || 1}
                                onChange={(e) => {
                                  const val = Math.max(1, Number(e.target.value));
                                  updateLeg(leg.id, {
                                    reEntry: {
                                      ...leg.reEntry,
                                      maxCount: val,
                                      slMaxCount: val,
                                      targetMaxCount: val,
                                    },
                                  });
                                }}
                                className="w-12 px-1 py-0.5 text-center text-xs font-mono font-semibold text-white bg-slate-900 border border-slate-700 rounded focus:border-indigo-500 focus:outline-none"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  const current = leg.reEntry.maxCount || 1;
                                  const next = current + 1;
                                  updateLeg(leg.id, {
                                    reEntry: {
                                      ...leg.reEntry,
                                      maxCount: next,
                                      slMaxCount: next,
                                      targetMaxCount: next,
                                    },
                                  });
                                }}
                                className="w-5 h-5 flex items-center justify-center bg-slate-900 hover:bg-slate-800 rounded border border-slate-700 text-slate-300 font-bold cursor-pointer"
                              >
                                +
                              </button>
                            </div>
                          </div>

                          {/* Quick preset chips */}
                          <div className="flex items-center gap-1">
                            <span className="text-[9px] text-slate-500 mr-0.5">Presets:</span>
                            {[1, 2, 3, 5].map((cnt) => (
                              <button
                                key={cnt}
                                type="button"
                                onClick={() =>
                                  updateLeg(leg.id, {
                                    reEntry: {
                                      ...leg.reEntry,
                                      maxCount: cnt,
                                      slMaxCount: cnt,
                                      targetMaxCount: cnt,
                                    },
                                  })
                                }
                                className={`px-1.5 py-0.5 rounded text-[9px] font-mono cursor-pointer transition-colors ${
                                  (leg.reEntry.maxCount || 1) === cnt
                                    ? 'bg-indigo-600 text-white font-bold'
                                    : 'bg-slate-900 text-slate-400 hover:bg-slate-850 border border-slate-800'
                                }`}
                              >
                                {cnt}x
                              </button>
                            ))}
                          </div>

                          {/* If Both is chosen, also display individual limits */}
                          {leg.reEntry.triggerOn === 'BOTH' && (
                            <div className="grid grid-cols-2 gap-1.5 pt-1 mt-1 border-t border-slate-800/60 text-[10px]">
                              <div className="flex items-center justify-between bg-slate-900/60 px-1.5 py-0.5 rounded">
                                <span className="text-rose-400">SL Limit:</span>
                                <input
                                  type="number"
                                  min={1}
                                  max={20}
                                  value={leg.reEntry.slMaxCount ?? leg.reEntry.maxCount ?? 1}
                                  onChange={(e) => {
                                    const val = Math.max(1, Number(e.target.value));
                                    updateLeg(leg.id, {
                                      reEntry: {
                                        ...leg.reEntry,
                                        slMaxCount: val,
                                      },
                                    });
                                  }}
                                  className="w-9 px-1 text-center font-mono text-white bg-slate-950 border border-slate-700 rounded text-[11px]"
                                />
                              </div>
                              <div className="flex items-center justify-between bg-slate-900/60 px-1.5 py-0.5 rounded">
                                <span className="text-emerald-400">Tgt Limit:</span>
                                <input
                                  type="number"
                                  min={1}
                                  max={20}
                                  value={leg.reEntry.targetMaxCount ?? leg.reEntry.maxCount ?? 1}
                                  onChange={(e) => {
                                    const val = Math.max(1, Number(e.target.value));
                                    updateLeg(leg.id, {
                                      reEntry: {
                                        ...leg.reEntry,
                                        targetMaxCount: val,
                                      },
                                    });
                                  }}
                                  className="w-9 px-1 text-center font-mono text-white bg-slate-950 border border-slate-700 rounded text-[11px]"
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Momentum Toggle */}
                    <div className="flex items-center justify-between text-xs pt-1.5 border-t border-slate-800/80">
                      <label className="text-slate-400 flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={Boolean(leg.momentum?.enabled)}
                          onChange={(e) =>
                            updateLeg(leg.id, {
                              momentum: {
                                ...(leg.momentum || { type: 'PCT_UP', value: 10 }),
                                enabled: e.target.checked,
                              },
                            })
                          }
                          className="rounded border-slate-700 bg-slate-950 text-emerald-500 focus:ring-0"
                        />
                        <span className="text-slate-300">Momentum</span>
                      </label>
                      {leg.momentum?.enabled && (
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            value={leg.momentum.value}
                            onChange={(e) =>
                              updateLeg(leg.id, {
                                momentum: {
                                  ...leg.momentum!,
                                  value: Number(e.target.value),
                                },
                              })
                            }
                            className="w-12 px-1 py-0.5 text-xs font-mono text-white bg-slate-950 border border-slate-800 rounded"
                          />
                          <span className="text-[10px] text-slate-400">%</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* 5. Full-Width "Lock & Trail Profit" Card for this Leg */}
              <div className="mt-3 pt-3 border-t border-slate-800/80">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id={`lock_trail_${leg.id}`}
                      checked={Boolean(leg.lockAndTrail?.enabled)}
                      onChange={(e) => {
                        const enabled = e.target.checked;
                        updateLeg(leg.id, {
                          lockAndTrail: {
                            ...(leg.lockAndTrail || {
                              triggerType: 'PERCENTAGE',
                              triggerValue: 30,
                              lockType: 'PERCENTAGE',
                              lockValue: 10,
                              trailEveryType: 'PERCENTAGE',
                              trailEveryValue: 10,
                              trailByType: 'PERCENTAGE',
                              trailByValue: 10,
                            }),
                            enabled,
                          },
                        });
                        if (enabled) {
                          setExpandedLockLegId(leg.id);
                        }
                      }}
                      className="rounded border-slate-700 bg-slate-950 text-amber-500 focus:ring-0 cursor-pointer"
                    />
                    <label
                      htmlFor={`lock_trail_${leg.id}`}
                      className="text-xs font-semibold text-amber-300 flex items-center gap-1.5 cursor-pointer"
                    >
                      <Lock className="w-3.5 h-3.5 text-amber-400" />
                      <span>Lock Profit & Start Trailing</span>
                    </label>
                    <span className="text-[10px] text-slate-400 bg-amber-950/40 border border-amber-800/30 px-2 py-0.5 rounded-full font-mono">
                      Lock at X profit, trail from then
                    </span>
                  </div>

                  {leg.lockAndTrail?.enabled && (
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedLockLegId(expandedLockLegId === leg.id ? null : leg.id)
                      }
                      className="flex items-center gap-1 text-[11px] text-amber-400 hover:text-amber-300 font-mono transition-colors"
                    >
                      <span>
                        Lock {leg.lockAndTrail.lockValue}{leg.lockAndTrail.lockType === 'PERCENTAGE' ? '%' : 'pts'} @ {leg.lockAndTrail.triggerValue}{leg.lockAndTrail.triggerType === 'PERCENTAGE' ? '%' : 'pts'}
                      </span>
                      {expandedLockLegId === leg.id ? (
                        <ChevronUp className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5" />
                      )}
                    </button>
                  )}
                </div>

                {leg.lockAndTrail?.enabled && expandedLockLegId === leg.id && (
                  <div className="mt-2.5 p-3 rounded-xl bg-amber-950/20 border border-amber-800/40 space-y-2.5 text-xs">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {/* Step 1: Trigger & Lock */}
                      <div className="p-2.5 rounded-lg bg-slate-950/90 border border-amber-900/30 space-y-2">
                        <div className="flex items-center gap-1.5 text-amber-300 font-medium text-[11px]">
                          <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                          <span>1. Lock Trigger Condition</span>
                        </div>
                        
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-slate-400 text-[11px]">If Profit Reaches:</span>
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                min={1}
                                value={leg.lockAndTrail.triggerValue}
                                onChange={(e) =>
                                  updateLeg(leg.id, {
                                    lockAndTrail: {
                                      ...leg.lockAndTrail!,
                                      triggerValue: Number(e.target.value),
                                    },
                                  })
                                }
                                className="w-16 px-2 py-1 text-xs font-mono text-white bg-slate-900 border border-slate-700 rounded focus:border-amber-500"
                              />
                              <button
                                type="button"
                                onClick={() =>
                                  updateLeg(leg.id, {
                                    lockAndTrail: {
                                      ...leg.lockAndTrail!,
                                      triggerType:
                                        leg.lockAndTrail!.triggerType === 'PERCENTAGE'
                                          ? 'POINTS'
                                          : 'PERCENTAGE',
                                    },
                                  })
                                }
                                className="px-1.5 py-1 text-[10px] font-mono bg-slate-800 rounded text-slate-300 hover:bg-slate-700"
                              >
                                {leg.lockAndTrail.triggerType === 'PERCENTAGE' ? '%' : 'pts'}
                              </button>
                            </div>
                          </div>

                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1">
                              <span className="text-slate-400 text-[11px]">Lock Profit At:</span>
                              {leg.lockAndTrail.lockValue === 0 && (
                                <span className="text-[9px] text-emerald-400 bg-emerald-950 px-1 py-0.2 rounded border border-emerald-800">
                                  Breakeven
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                min={0}
                                value={leg.lockAndTrail.lockValue}
                                onChange={(e) =>
                                  updateLeg(leg.id, {
                                    lockAndTrail: {
                                      ...leg.lockAndTrail!,
                                      lockValue: Number(e.target.value),
                                    },
                                  })
                                }
                                className="w-16 px-2 py-1 text-xs font-mono text-emerald-400 font-semibold bg-slate-900 border border-slate-700 rounded focus:border-amber-500"
                              />
                              <button
                                type="button"
                                onClick={() =>
                                  updateLeg(leg.id, {
                                    lockAndTrail: {
                                      ...leg.lockAndTrail!,
                                      lockType:
                                        leg.lockAndTrail!.lockType === 'PERCENTAGE'
                                          ? 'POINTS'
                                          : 'PERCENTAGE',
                                    },
                                  })
                                }
                                className="px-1.5 py-1 text-[10px] font-mono bg-slate-800 rounded text-slate-300 hover:bg-slate-700"
                              >
                                {leg.lockAndTrail.lockType === 'PERCENTAGE' ? '%' : 'pts'}
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Step 2: Trailing From Then */}
                      <div className="p-2.5 rounded-lg bg-slate-950/90 border border-amber-900/30 space-y-2">
                        <div className="flex items-center gap-1.5 text-amber-300 font-medium text-[11px]">
                          <TrendingUp className="w-3.5 h-3.5 text-amber-400" />
                          <span>2. Trailing From Then</span>
                        </div>

                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-slate-400 text-[11px]">For Every Increase of:</span>
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                min={1}
                                value={leg.lockAndTrail.trailEveryValue}
                                onChange={(e) =>
                                  updateLeg(leg.id, {
                                    lockAndTrail: {
                                      ...leg.lockAndTrail!,
                                      trailEveryValue: Number(e.target.value),
                                    },
                                  })
                                }
                                className="w-16 px-2 py-1 text-xs font-mono text-white bg-slate-900 border border-slate-700 rounded focus:border-amber-500"
                              />
                              <button
                                type="button"
                                onClick={() =>
                                  updateLeg(leg.id, {
                                    lockAndTrail: {
                                      ...leg.lockAndTrail!,
                                      trailEveryType:
                                        leg.lockAndTrail!.trailEveryType === 'PERCENTAGE'
                                          ? 'POINTS'
                                          : 'PERCENTAGE',
                                    },
                                  })
                                }
                                className="px-1.5 py-1 text-[10px] font-mono bg-slate-800 rounded text-slate-300 hover:bg-slate-700"
                              >
                                {leg.lockAndTrail.trailEveryType === 'PERCENTAGE' ? '%' : 'pts'}
                              </button>
                            </div>
                          </div>

                          <div className="flex items-center justify-between gap-2">
                            <span className="text-slate-400 text-[11px]">Trail Profit By:</span>
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                min={1}
                                value={leg.lockAndTrail.trailByValue}
                                onChange={(e) =>
                                  updateLeg(leg.id, {
                                    lockAndTrail: {
                                      ...leg.lockAndTrail!,
                                      trailByValue: Number(e.target.value),
                                    },
                                  })
                                }
                                className="w-16 px-2 py-1 text-xs font-mono text-amber-300 font-semibold bg-slate-900 border border-slate-700 rounded focus:border-amber-500"
                              />
                              <button
                                type="button"
                                onClick={() =>
                                  updateLeg(leg.id, {
                                    lockAndTrail: {
                                      ...leg.lockAndTrail!,
                                      trailByType:
                                        leg.lockAndTrail!.trailByType === 'PERCENTAGE'
                                          ? 'POINTS'
                                          : 'PERCENTAGE',
                                    },
                                  })
                                }
                                className="px-1.5 py-1 text-[10px] font-mono bg-slate-800 rounded text-slate-300 hover:bg-slate-700"
                              >
                                {leg.lockAndTrail.trailByType === 'PERCENTAGE' ? '%' : 'pts'}
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Presets */}
                    <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-amber-900/30">
                      <span className="text-[10px] text-slate-400">Quick Presets:</span>
                      <button
                        type="button"
                        onClick={() =>
                          updateLeg(leg.id, {
                            lockAndTrail: {
                              enabled: true,
                              triggerType: 'PERCENTAGE',
                              triggerValue: 20,
                              lockType: 'PERCENTAGE',
                              lockValue: 0,
                              trailEveryType: 'PERCENTAGE',
                              trailEveryValue: 10,
                              trailByType: 'PERCENTAGE',
                              trailByValue: 10,
                            },
                          })
                        }
                        className="px-2 py-0.5 text-[10px] font-mono bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded text-emerald-300 cursor-pointer"
                      >
                        Lock @ Cost (Breakeven @ 20%)
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          updateLeg(leg.id, {
                            lockAndTrail: {
                              enabled: true,
                              triggerType: 'PERCENTAGE',
                              triggerValue: 30,
                              lockType: 'PERCENTAGE',
                              lockValue: 15,
                              trailEveryType: 'PERCENTAGE',
                              trailEveryValue: 10,
                              trailByType: 'PERCENTAGE',
                              trailByValue: 10,
                            },
                          })
                        }
                        className="px-2 py-0.5 text-[10px] font-mono bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded text-amber-300 cursor-pointer"
                      >
                        Lock 50% Profit (15% @ 30%)
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          updateLeg(leg.id, {
                            lockAndTrail: {
                              enabled: true,
                              triggerType: 'PERCENTAGE',
                              triggerValue: 40,
                              lockType: 'PERCENTAGE',
                              lockValue: 20,
                              trailEveryType: 'PERCENTAGE',
                              trailEveryValue: 5,
                              trailByType: 'PERCENTAGE',
                              trailByValue: 5,
                            },
                          })
                        }
                        className="px-2 py-0.5 text-[10px] font-mono bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded text-indigo-300 cursor-pointer"
                      >
                        Aggressive Runner (5:5)
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Floating or Bottom CTA Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3 text-xs text-slate-400">
          <div>
            Total Legs: <span className="font-mono text-white font-bold">{strategy.legs.length}</span>
          </div>
          <span aria-hidden="true">·</span>
          <div>
            Underlying: <span className="font-mono text-white font-bold">{strategy.underlying}</span>
          </div>
          <span aria-hidden="true">·</span>
          <div>
            Capital: <span className="font-mono text-white font-bold">₹{strategy.initialCapital.toLocaleString('en-IN')}</span>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            type="button"
            onClick={onRunBacktest}
            disabled={isBacktesting}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-6 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 rounded-lg transition-all shadow-md shadow-emerald-950 cursor-pointer disabled:opacity-50"
          >
            <Play className={`w-4 h-4 fill-current ${isBacktesting ? 'animate-spin' : ''}`} />
            <span>{isBacktesting ? 'Running Simulation...' : 'Backtest Strategy'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
