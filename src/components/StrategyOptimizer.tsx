import React, { useState, useEffect } from 'react';
import {
  Sliders,
  Play,
  Award,
  TrendingUp,
  RotateCcw,
  CheckCircle2,
  Sparkles,
  Layers,
  ChevronDown,
  Clock,
  ShieldAlert,
  Percent,
  Plus,
  Trash2,
  Check,
  Briefcase,
  AlertTriangle,
} from 'lucide-react';
import { Strategy } from '../types/trading';
import { runBacktest } from '../services/backtestEngine';
import { getSavedStrategies, saveStrategy } from '../services/strategyStorage';
import { STRATEGY_TEMPLATES } from '../data/strategyTemplates';
import { UNDERLYING_CONFIGS } from '../services/optionPricer';

interface StrategyOptimizerProps {
  strategy: Strategy;
  onSelectStrategy?: (strategy: Strategy) => void;
  onApplyOptimized: (optimizedStrategy: Strategy) => void;
}

interface OptimizationResult {
  stopLossPct: number;
  entryTime: string;
  totalNetPnl: number;
  winRatePct: number;
  sharpeRatio: number;
  maxDrawdownPct: number;
  totalTrades: number;
  profitFactor: number;
}

export const StrategyOptimizer: React.FC<StrategyOptimizerProps> = ({
  strategy: initialStrategy,
  onSelectStrategy,
  onApplyOptimized,
}) => {
  // Strategy selection states
  const [selectedStrategy, setSelectedStrategy] = useState<Strategy>(initialStrategy);
  const [savedStrategies, setSavedStrategies] = useState<Strategy[]>([]);
  const [allStrategyChoices, setAllStrategyChoices] = useState<{ id: string; name: string; type: 'SAVED' | 'TEMPLATE' | 'ACTIVE'; strategy: Strategy }[]>([]);

  // Scan parameter configuration
  const [slOptions, setSlOptions] = useState<number[]>([15, 20, 25, 30, 35]);
  const [customSlInput, setCustomSlInput] = useState<string>('');
  const [entryTimeOptions, setEntryTimeOptions] = useState<string[]>([
    '09:18',
    '09:20',
    '09:30',
    '09:45',
  ]);
  const [customTimeInput, setCustomTimeInput] = useState<string>('');

  // Execution states
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [results, setResults] = useState<OptimizationResult[]>([]);
  const [appliedToast, setAppliedToast] = useState<boolean>(false);
  const [appliedRowIndex, setAppliedRowIndex] = useState<number | null>(null);

  // Sync initialStrategy if changed from parent
  useEffect(() => {
    setSelectedStrategy(initialStrategy);
  }, [initialStrategy.id]);

  // Load saved strategies & templates
  useEffect(() => {
    const saved = getSavedStrategies();
    setSavedStrategies(saved);

    const choices: { id: string; name: string; type: 'SAVED' | 'TEMPLATE' | 'ACTIVE'; strategy: Strategy }[] = [];

    // Add active strategy if not in saved
    if (!saved.some((s) => s.id === initialStrategy.id)) {
      choices.push({
        id: initialStrategy.id,
        name: `${initialStrategy.name} (Active Workspace)`,
        type: 'ACTIVE',
        strategy: initialStrategy,
      });
    }

    // Add saved strategies
    saved.forEach((s) => {
      choices.push({
        id: s.id,
        name: s.name,
        type: 'SAVED',
        strategy: s,
      });
    });

    // Add templates
    STRATEGY_TEMPLATES.forEach((t) => {
      choices.push({
        id: `template_${t.id}`,
        name: `${t.name} [Template]`,
        type: 'TEMPLATE',
        strategy: { ...t, id: `opt_template_${t.id}` },
      });
    });

    setAllStrategyChoices(choices);
  }, [initialStrategy]);

  // Handle switching target strategy
  const handleStrategyChange = (strategyId: string) => {
    const found = allStrategyChoices.find((c) => c.id === strategyId);
    if (found) {
      setSelectedStrategy(found.strategy);
      setResults([]); // Clear previous scan results to reflect new strategy
      if (onSelectStrategy) {
        onSelectStrategy(found.strategy);
      }
    }
  };

  // Toggle or add Stop Loss percentage
  const toggleSlOption = (sl: number) => {
    if (slOptions.includes(sl)) {
      if (slOptions.length > 1) {
        setSlOptions(slOptions.filter((item) => item !== sl));
      }
    } else {
      setSlOptions([...slOptions, sl].sort((a, b) => a - b));
    }
  };

  const handleAddCustomSl = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(customSlInput);
    if (!isNaN(val) && val > 0 && val <= 100) {
      if (!slOptions.includes(val)) {
        setSlOptions([...slOptions, val].sort((a, b) => a - b));
      }
      setCustomSlInput('');
    }
  };

  // Toggle or add Entry Time
  const toggleTimeOption = (t: string) => {
    if (entryTimeOptions.includes(t)) {
      if (entryTimeOptions.length > 1) {
        setEntryTimeOptions(entryTimeOptions.filter((item) => item !== t));
      }
    } else {
      setEntryTimeOptions([...entryTimeOptions, t].sort());
    }
  };

  const handleAddCustomTime = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = customTimeInput.trim();
    if (/^(09|10|11|12|13|14|15):[0-5][0-9]$/.test(trimmed)) {
      if (!entryTimeOptions.includes(trimmed)) {
        setEntryTimeOptions([...entryTimeOptions, trimmed].sort());
      }
      setCustomTimeInput('');
    }
  };

  // Run the grid parameter scan
  const handleRunOptimization = () => {
    if (slOptions.length === 0 || entryTimeOptions.length === 0) return;

    setIsScanning(true);
    setAppliedRowIndex(null);

    setTimeout(() => {
      const scanResults: OptimizationResult[] = [];

      for (const sl of slOptions) {
        for (const et of entryTimeOptions) {
          // Clone selected strategy with variations
          const clonedStrategy: Strategy = {
            ...selectedStrategy,
            entryTime: et,
            legs: selectedStrategy.legs.map((l) => ({
              ...l,
              stopLossType: 'PERCENTAGE',
              stopLossValue: sl,
            })),
          };

          const summary = runBacktest(clonedStrategy);
          scanResults.push({
            stopLossPct: sl,
            entryTime: et,
            totalNetPnl: summary.totalNetPnl,
            winRatePct: summary.winRatePct,
            sharpeRatio: summary.sharpeRatio,
            maxDrawdownPct: summary.maxDrawdownPct,
            totalTrades: summary.totalTrades,
            profitFactor: summary.profitFactor,
          });
        }
      }

      // Sort by highest Sharpe Ratio, then Net PnL
      scanResults.sort((a, b) => b.sharpeRatio - a.sharpeRatio || b.totalNetPnl - a.totalNetPnl);
      setResults(scanResults);
      setIsScanning(false);
    }, 180);
  };

  // Apply chosen setup to strategy
  const handleApply = (opt: OptimizationResult, rowIndex?: number) => {
    const updated: Strategy = {
      ...selectedStrategy,
      entryTime: opt.entryTime,
      legs: selectedStrategy.legs.map((l) => ({
        ...l,
        stopLossType: 'PERCENTAGE',
        stopLossValue: opt.stopLossPct,
      })),
    };

    setSelectedStrategy(updated);
    onApplyOptimized(updated);

    if (rowIndex !== undefined) {
      setAppliedRowIndex(rowIndex);
    } else {
      setAppliedToast(true);
      setTimeout(() => setAppliedToast(false), 2500);
    }
  };

  const bestResult = results.length > 0 ? results[0] : null;
  const underlyingConfig = UNDERLYING_CONFIGS[selectedStrategy.underlyingIndex];
  const totalCombinations = slOptions.length * entryTimeOptions.length;

  return (
    <div className="space-y-6 pb-12">
      {/* Header & Strategy Selector Bar */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 lg:p-5 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Sliders className="w-5 h-5 text-emerald-400" />
              <span>Strategy Parameter Scanner</span>
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Select any saved strategy or pre-built template to run multi-parameter risk-reward permutations.
            </p>
          </div>

          <button
            onClick={handleRunOptimization}
            disabled={isScanning || totalCombinations === 0}
            className="flex items-center justify-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 rounded-lg transition-colors shadow-sm shadow-emerald-950 cursor-pointer disabled:opacity-50 whitespace-nowrap"
          >
            <Play className={`w-3.5 h-3.5 fill-current ${isScanning ? 'animate-spin' : ''}`} />
            <span>{isScanning ? `Evaluating ${totalCombinations} Scenarios...` : `Run Scan (${totalCombinations} Permutations)`}</span>
          </button>
        </div>

        {/* Strategy Selector Control */}
        <div className="pt-2 border-t border-slate-800/80 grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
          <div className="md:col-span-1">
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-emerald-400" />
              <span>Target Strategy to Optimize:</span>
            </label>
            <div className="relative">
              <select
                value={
                  allStrategyChoices.find(
                    (c) => c.strategy.id === selectedStrategy.id || c.name === selectedStrategy.name
                  )?.id || selectedStrategy.id
                }
                onChange={(e) => handleStrategyChange(e.target.value)}
                className="w-full pl-3 pr-8 py-2 bg-slate-950 border border-slate-700 hover:border-slate-600 rounded-lg text-xs font-medium text-slate-100 focus:outline-none focus:border-emerald-500 transition-colors cursor-pointer appearance-none"
              >
                <optgroup label="Active / Saved Strategies">
                  {allStrategyChoices
                    .filter((c) => c.type === 'ACTIVE' || c.type === 'SAVED')
                    .map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                </optgroup>

                <optgroup label="Pre-built Strategy Templates">
                  {allStrategyChoices
                    .filter((c) => c.type === 'TEMPLATE')
                    .map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                </optgroup>
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
            </div>
          </div>

          {/* Selected Strategy Specs Badges */}
          <div className="md:col-span-2 flex flex-wrap items-center gap-2 text-xs">
            <span className="px-2.5 py-1 rounded bg-slate-800 text-slate-200 border border-slate-700 font-mono flex items-center gap-1">
              <span className="text-slate-400">Underlying:</span>
              <strong className="text-emerald-400">{underlyingConfig.displayName}</strong>
              <span className="text-[11px] text-slate-400">(₹{underlyingConfig.baseSpotPrice.toLocaleString('en-IN')})</span>
            </span>

            <span className="px-2.5 py-1 rounded bg-slate-800 text-slate-200 border border-slate-700 font-mono">
              <span className="text-slate-400">Legs:</span> <strong>{selectedStrategy.legs.length}</strong> (
              {selectedStrategy.legs.map((l) => `${l.action} ${l.instrument}`).join(' + ')})
            </span>

            <span className="px-2.5 py-1 rounded bg-slate-800 text-slate-200 border border-slate-700 font-mono">
              <span className="text-slate-400">Current Entry:</span> <strong>{selectedStrategy.entryTime}</strong>
            </span>

            <span className="px-2.5 py-1 rounded bg-slate-800 text-slate-200 border border-slate-700 font-mono">
              <span className="text-slate-400">Current SL:</span>{' '}
              <strong>{selectedStrategy.legs[0]?.stopLossValue || 25}%</strong>
            </span>

            <span className="px-2.5 py-1 rounded bg-slate-800 text-slate-200 border border-slate-700 font-mono">
              <span className="text-slate-400">DTE / Expiry:</span> <strong>{selectedStrategy.expiryType}</strong>
            </span>
          </div>
        </div>
      </div>

      {/* Parameter Range Configuration */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Stop Loss Permutations */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-rose-400" />
              <span className="text-xs font-semibold text-slate-200">
                Stop Loss Percentages to Scan ({slOptions.length} active)
              </span>
            </div>
            <span className="text-[11px] text-slate-400">Click chip to toggle</span>
          </div>

          <div className="flex flex-wrap gap-2 pt-1 font-mono text-xs">
            {[10, 15, 20, 25, 30, 35, 40, 50].map((sl) => {
              const isSelected = slOptions.includes(sl);
              return (
                <button
                  key={sl}
                  onClick={() => toggleSlOption(sl)}
                  className={`px-3 py-1.5 rounded-lg border transition-all cursor-pointer font-medium ${
                    isSelected
                      ? 'bg-rose-500/20 text-rose-300 border-rose-500/50 shadow-xs'
                      : 'bg-slate-950 text-slate-500 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {sl}% SL
                </button>
              );
            })}
          </div>

          {/* Add custom SL */}
          <form onSubmit={handleAddCustomSl} className="flex items-center gap-2 pt-1">
            <input
              type="number"
              min="1"
              max="100"
              value={customSlInput}
              onChange={(e) => setCustomSlInput(e.target.value)}
              placeholder="Custom SL % (e.g. 18)"
              className="px-2.5 py-1 bg-slate-950 border border-slate-800 rounded text-xs text-slate-200 font-mono w-40 focus:outline-none focus:border-rose-500"
            />
            <button
              type="submit"
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded text-xs font-medium cursor-pointer"
            >
              Add SL
            </button>
          </form>
        </div>

        {/* Entry Time Permutations */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-semibold text-slate-200">
                Entry Times to Scan ({entryTimeOptions.length} active)
              </span>
            </div>
            <span className="text-[11px] text-slate-400">Click chip to toggle</span>
          </div>

          <div className="flex flex-wrap gap-2 pt-1 font-mono text-xs">
            {['09:16', '09:18', '09:20', '09:25', '09:30', '09:45', '10:00', '10:15'].map((et) => {
              const isSelected = entryTimeOptions.includes(et);
              return (
                <button
                  key={et}
                  onClick={() => toggleTimeOption(et)}
                  className={`px-3 py-1.5 rounded-lg border transition-all cursor-pointer font-medium ${
                    isSelected
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-xs'
                      : 'bg-slate-950 text-slate-500 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {et} AM
                </button>
              );
            })}
          </div>

          {/* Add custom entry time */}
          <form onSubmit={handleAddCustomTime} className="flex items-center gap-2 pt-1">
            <input
              type="text"
              value={customTimeInput}
              onChange={(e) => setCustomTimeInput(e.target.value)}
              placeholder="HH:MM (e.g. 09:22)"
              className="px-2.5 py-1 bg-slate-950 border border-slate-800 rounded text-xs text-slate-200 font-mono w-40 focus:outline-none focus:border-emerald-500"
            />
            <button
              type="submit"
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded text-xs font-medium cursor-pointer"
            >
              Add Time
            </button>
          </form>
        </div>
      </div>

      {/* Best Sweet Spot Banner */}
      {bestResult && (
        <div className="bg-emerald-950/30 border border-emerald-800/60 rounded-xl p-4 sm:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-lg shadow-emerald-950/20">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">
                  Optimal Parameter Sweet Spot
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                  Rank #1 of {results.length}
                </span>
              </div>
              <div className="text-base font-bold text-white mt-1 font-mono">
                Entry at {bestResult.entryTime} IST with {bestResult.stopLossPct}% Stop Loss
              </div>
              <div className="text-xs text-slate-300 font-mono mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                <span>
                  Net P&L: <strong className="text-emerald-400">₹{bestResult.totalNetPnl.toLocaleString('en-IN')}</strong>
                </span>
                <span>·</span>
                <span>
                  Win Rate: <strong className="text-white">{bestResult.winRatePct}%</strong>
                </span>
                <span>·</span>
                <span>
                  Sharpe: <strong className="text-sky-400">{bestResult.sharpeRatio}</strong>
                </span>
                <span>·</span>
                <span>
                  Profit Factor: <strong className="text-white">{bestResult.profitFactor}</strong>
                </span>
                <span>·</span>
                <span>
                  Max DD: <strong className="text-rose-400">-{bestResult.maxDrawdownPct}%</strong>
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={() => handleApply(bestResult)}
            className="w-full md:w-auto px-5 py-2.5 text-xs font-bold text-slate-900 bg-emerald-400 hover:bg-emerald-300 rounded-lg transition-colors cursor-pointer whitespace-nowrap shadow-md shadow-emerald-950 flex items-center justify-center gap-1.5"
          >
            {appliedToast ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-slate-900" />
                <span>Applied to {selectedStrategy.name}!</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-slate-900" />
                <span>Apply Optimal Setup</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* Results Ranking Leaderboard */}
      {results.length > 0 && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-800 gap-2">
            <div>
              <span className="text-xs font-semibold text-slate-200">
                Permutation Comparison Leaderboard
              </span>
              <p className="text-[11px] text-slate-400">
                Target Strategy: <strong className="text-white">{selectedStrategy.name}</strong> ({selectedStrategy.legs.length} legs)
              </p>
            </div>
            <span className="text-xs text-slate-400 font-mono">
              {results.length} Scenarios Evaluated
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-sans">
                  <th className="py-2.5 px-3">Rank</th>
                  <th className="py-2.5 px-3">Entry Time</th>
                  <th className="py-2.5 px-3">SL %</th>
                  <th className="py-2.5 px-3 text-right">Net P&L (₹)</th>
                  <th className="py-2.5 px-3 text-right">Win Rate</th>
                  <th className="py-2.5 px-3 text-right">Sharpe</th>
                  <th className="py-2.5 px-3 text-right">Profit Factor</th>
                  <th className="py-2.5 px-3 text-right">Max DD %</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {results.map((res, idx) => {
                  const isProfit = res.totalNetPnl >= 0;
                  const isApplied = appliedRowIndex === idx;

                  return (
                    <tr
                      key={idx}
                      className={`hover:bg-slate-800/40 transition-colors ${
                        idx === 0 ? 'bg-emerald-950/20 font-semibold' : ''
                      }`}
                    >
                      <td className="py-2.5 px-3 text-slate-400">
                        {idx === 0 ? (
                          <span className="flex items-center gap-1 text-emerald-400">
                            <Award className="w-3.5 h-3.5" />
                            #1
                          </span>
                        ) : (
                          `#${idx + 1}`
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-white font-medium">{res.entryTime}</td>
                      <td className="py-2.5 px-3 text-rose-400">{res.stopLossPct}%</td>
                      <td
                        className={`py-2.5 px-3 text-right font-bold tabular-nums ${
                          isProfit ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {isProfit ? '+' : ''}₹{res.totalNetPnl.toLocaleString('en-IN')}
                      </td>
                      <td className="py-2.5 px-3 text-right text-emerald-400 tabular-nums">
                        {res.winRatePct}%
                      </td>
                      <td className="py-2.5 px-3 text-right text-sky-400 tabular-nums font-semibold">
                        {res.sharpeRatio}
                      </td>
                      <td className="py-2.5 px-3 text-right text-white tabular-nums">
                        {res.profitFactor}
                      </td>
                      <td className="py-2.5 px-3 text-right text-rose-400 tabular-nums">
                        -{res.maxDrawdownPct}%
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <button
                          onClick={() => handleApply(res, idx)}
                          className={`px-2.5 py-1 text-xs rounded transition-colors cursor-pointer font-sans ${
                            isApplied
                              ? 'bg-emerald-500 text-slate-900 font-bold'
                              : 'bg-slate-800 hover:bg-emerald-700 text-slate-300 hover:text-white border border-slate-700'
                          }`}
                        >
                          {isApplied ? 'Applied' : 'Apply'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
