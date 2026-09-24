import React, { useState } from 'react';
import {
  Briefcase,
  Plus,
  Trash2,
  Edit3,
  Copy,
  Radio,
  Zap,
  Calendar,
  Clock,
  Layers,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Sliders,
  ChevronDown,
  ChevronUp,
  Flame,
} from 'lucide-react';
import {
  DayOfWeek,
  DTEOption,
  Portfolio,
  PortfolioStrategyConfig,
  Strategy,
} from '../types/trading';
import {
  deletePortfolio,
  duplicatePortfolio,
  getPortfolios,
  getSavedStrategies,
  savePortfolio,
} from '../services/strategyStorage';

interface PortfolioManagerProps {
  onDeployPortfolioToPaper: (portfolio: Portfolio) => void;
  onDeployPortfolioToBroker: (portfolio: Portfolio) => void;
  onOpenStrategyBuilder: (strategy: Strategy) => void;
}

export const PortfolioManager: React.FC<PortfolioManagerProps> = ({
  onDeployPortfolioToPaper,
  onDeployPortfolioToBroker,
  onOpenStrategyBuilder,
}) => {
  const [portfolios, setPortfolios] = useState<Portfolio[]>(() => getPortfolios());
  const [savedStrategies, setSavedStrategies] = useState<Strategy[]>(() => getSavedStrategies());
  const [isEditorOpen, setIsEditorOpen] = useState<boolean>(false);
  const [editingPortfolio, setEditingPortfolio] = useState<Portfolio | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const refreshList = () => {
    setPortfolios(getPortfolios());
    setSavedStrategies(getSavedStrategies());
  };

  // Create new portfolio template
  const handleOpenCreate = () => {
    const defaultStrat = savedStrategies[0];
    const newPort: Portfolio = {
      id: `port_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: 'New Multi-Strategy Portfolio',
      description: 'Multi-strategy options portfolio with automated weekday and DTE deployment rules.',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      strategies: defaultStrat
        ? [
            {
              strategyId: defaultStrat.id,
              strategyName: defaultStrat.name,
              enabled: true,
              lotsMultiplier: 1,
              weekdays: ['MON', 'TUE', 'WED', 'THU', 'FRI'],
              dteOption: 'ANY',
            },
          ]
        : [],
      overallRisk: {
        maxLossEnabled: true,
        maxLoss: 10000,
        maxLossType: 'MTM_AMOUNT',
        maxProfitEnabled: true,
        maxProfit: 20000,
        maxProfitType: 'MTM_AMOUNT',
        lockAndTrailProfit: {
          enabled: false,
          triggerAmount: 12000,
          lockAmount: 6000,
          trailEvery: 2000,
          trailBy: 1000,
        },
      },
    };
    setEditingPortfolio(newPort);
    setIsEditorOpen(true);
  };

  const handleOpenEdit = (port: Portfolio) => {
    setEditingPortfolio(JSON.parse(JSON.stringify(port)));
    setIsEditorOpen(true);
  };

  const handleSaveEditor = () => {
    if (!editingPortfolio) return;
    if (!editingPortfolio.name.trim()) {
      alert('Please enter a portfolio name.');
      return;
    }
    if (editingPortfolio.strategies.length === 0) {
      alert('Please add at least one strategy to the portfolio.');
      return;
    }

    savePortfolio(editingPortfolio);
    refreshList();
    setIsEditorOpen(false);
    setEditingPortfolio(null);
    showToast(`Portfolio "${editingPortfolio.name}" saved.`);
  };

  const handleDelete = (id: string) => {
    deletePortfolio(id);
    refreshList();
    setDeleteConfirmId(null);
    showToast('Portfolio deleted.');
  };

  const handleDuplicate = (id: string) => {
    const cloned = duplicatePortfolio(id);
    if (cloned) {
      refreshList();
      showToast(`Portfolio duplicated as "${cloned.name}".`);
    }
  };

  // Add strategy into editing portfolio
  const addStrategyToEditing = (strategyId: string) => {
    if (!editingPortfolio) return;
    const strat = savedStrategies.find((s) => s.id === strategyId);
    if (!strat) return;

    const newConfig: PortfolioStrategyConfig = {
      strategyId: strat.id,
      strategyName: strat.name,
      enabled: true,
      lotsMultiplier: 1,
      scheduleMode: 'WEEKDAYS',
      weekdays: [...strat.daysToTrade],
      dteOption: 'ANY',
    };

    setEditingPortfolio({
      ...editingPortfolio,
      strategies: [...editingPortfolio.strategies, newConfig],
    });
  };

  const updateStrategyInEditing = (index: number, updates: Partial<PortfolioStrategyConfig>) => {
    if (!editingPortfolio) return;
    const updated = [...editingPortfolio.strategies];
    updated[index] = { ...updated[index], ...updates };
    setEditingPortfolio({ ...editingPortfolio, strategies: updated });
  };

  const removeStrategyFromEditing = (index: number) => {
    if (!editingPortfolio) return;
    const updated = editingPortfolio.strategies.filter((_, i) => i !== index);
    setEditingPortfolio({ ...editingPortfolio, strategies: updated });
  };

  const toggleWeekdayInStrategy = (index: number, day: DayOfWeek) => {
    if (!editingPortfolio) return;
    const current = editingPortfolio.strategies[index].weekdays;
    const exists = current.includes(day);
    const nextDays = exists ? current.filter((d) => d !== day) : [...current, day];
    if (nextDays.length > 0) {
      updateStrategyInEditing(index, { weekdays: nextDays });
    }
  };

  const getDteLabel = (dte: DTEOption, range?: { min: number; max: number }): string => {
    switch (dte) {
      case '0':
        return '0 DTE (Expiry Day)';
      case '1':
        return '1 DTE (Day Before Expiry)';
      case '2':
        return '2 DTE';
      case '3':
        return '3 DTE';
      case '4':
        return '4+ DTE';
      case 'CUSTOM':
        return `DTE ${range?.min ?? 0}-${range?.max ?? 2}`;
      case 'ANY':
      default:
        return 'Any DTE';
    }
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-emerald-600 text-white text-xs font-semibold px-4 py-2.5 rounded-lg shadow-xl border border-emerald-500 animate-in fade-in slide-in-from-bottom-2">
          <CheckCircle2 className="w-4 h-4 text-white" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-rose-400">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <h3 className="text-base font-bold text-white">Delete Portfolio?</h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Are you sure you want to delete this portfolio? Your underlying saved strategies will NOT be deleted, only this portfolio bundle.
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="px-3.5 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirmId)}
                className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 rounded-lg transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Confirm Delete</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Interactive Portfolio Editor Modal */}
      {isEditorOpen && editingPortfolio && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden my-auto">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <Briefcase className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white">
                    {editingPortfolio.id.startsWith('port_custom') || !portfolios.some((p) => p.id === editingPortfolio.id)
                      ? 'Create New Portfolio'
                      : 'Edit Portfolio'}
                  </h2>
                  <p className="text-xs text-slate-400">
                    Bundle multiple strategies with custom Weekday schedules, DTE filters, and Portfolio-level risk management.
                  </p>
                </div>
              </div>

              <button
                onClick={() => {
                  setIsEditorOpen(false);
                  setEditingPortfolio(null);
                }}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-6 flex-1 text-xs">
              {/* Portfolio Name & Description */}
              <div className="space-y-3 bg-slate-950/50 p-4 rounded-xl border border-slate-800/80">
                <div>
                  <label className="block text-slate-400 font-medium mb-1">Portfolio Name</label>
                  <input
                    type="text"
                    value={editingPortfolio.name}
                    onChange={(e) =>
                      setEditingPortfolio({ ...editingPortfolio, name: e.target.value })
                    }
                    placeholder="e.g. BankNifty & Nifty Expiry Portfolio"
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-medium mb-1">Description</label>
                  <textarea
                    rows={2}
                    value={editingPortfolio.description}
                    onChange={(e) =>
                      setEditingPortfolio({ ...editingPortfolio, description: e.target.value })
                    }
                    placeholder="Brief description of the portfolio strategy thesis..."
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-emerald-500 resize-none"
                  />
                </div>
              </div>

              {/* Multi-Strategy List in Portfolio */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <Layers className="w-4 h-4 text-emerald-400" />
                      <span>Included Strategies ({editingPortfolio.strategies.length})</span>
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Configure execution schedule (Weekdays & DTE) and lot multiplier for each strategy.
                    </p>
                  </div>

                  {/* Add Strategy Dropdown */}
                  <div className="flex items-center gap-2">
                    <select
                      onChange={(e) => {
                        if (e.target.value) {
                          addStrategyToEditing(e.target.value);
                          e.target.value = '';
                        }
                      }}
                      defaultValue=""
                      className="bg-slate-950 border border-emerald-600/60 text-emerald-300 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-emerald-400 cursor-pointer font-medium"
                    >
                      <option value="" disabled>
                        + Add Strategy to Portfolio...
                      </option>
                      {savedStrategies.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({s.underlying})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Strategies List */}
                {editingPortfolio.strategies.length === 0 ? (
                  <div className="text-center py-8 bg-slate-950/40 border border-dashed border-slate-800 rounded-xl space-y-2">
                    <p className="text-xs text-slate-400">No strategies added yet.</p>
                    <p className="text-[11px] text-slate-500">
                      Select a saved strategy from the dropdown above to add it.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {editingPortfolio.strategies.map((stratConfig, idx) => {
                      const stratObj = savedStrategies.find((s) => s.id === stratConfig.strategyId);
                      return (
                        <div
                          key={`${stratConfig.strategyId}_${idx}`}
                          className={`p-4 rounded-xl border transition-all ${
                            stratConfig.enabled
                              ? 'bg-slate-950/60 border-slate-800'
                              : 'bg-slate-950/30 border-slate-900 opacity-60'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-2.5">
                              <input
                                type="checkbox"
                                checked={stratConfig.enabled}
                                onChange={(e) =>
                                  updateStrategyInEditing(idx, { enabled: e.target.checked })
                                }
                                className="w-4 h-4 accent-emerald-500 rounded cursor-pointer"
                              />
                              <div>
                                <span className="text-xs font-bold text-white">
                                  {stratConfig.strategyName}
                                </span>
                                {stratObj && (
                                  <span className="ml-2 text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-emerald-400 border border-slate-700">
                                    {stratObj.underlying} · {stratObj.legs.length} Legs
                                  </span>
                                )}
                              </div>
                            </div>

                            <button
                              onClick={() => removeStrategyFromEditing(idx)}
                              className="p-1 text-slate-500 hover:text-rose-400 rounded transition-colors cursor-pointer"
                              title="Remove from portfolio"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          {/* Execution Controls: Lots, Weekdays, DTE */}
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3 pt-3 border-t border-slate-900">
                            {/* Multiplier */}
                            <div>
                              <label className="block text-[11px] text-slate-400 font-medium mb-1">
                                Lots Multiplier
                              </label>
                              <div className="flex items-center gap-1.5">
                                <input
                                  type="number"
                                  min={1}
                                  max={20}
                                  value={stratConfig.lotsMultiplier}
                                  onChange={(e) =>
                                    updateStrategyInEditing(idx, {
                                      lotsMultiplier: Math.max(1, parseInt(e.target.value) || 1),
                                    })
                                  }
                                  className="w-16 bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs text-white text-center"
                                />
                                <span className="text-[11px] text-slate-400 font-mono">
                                  x {stratObj?.legs[0]?.lots || 1} lot(s)
                                </span>
                              </div>
                            </div>

                            {/* Schedule Mode Selector & Execution Controls */}
                            <div className="space-y-2.5 mt-3 pt-3 border-t border-slate-900 col-span-full">
                              <div className="flex flex-wrap items-center justify-between gap-2 pb-1 border-b border-slate-900/60">
                                <div className="flex items-center gap-2">
                                  <span className="text-[11px] text-slate-400 font-medium">
                                    Execution Schedule Mode:
                                  </span>
                                  <div className="flex items-center p-0.5 bg-slate-900 rounded-lg border border-slate-800">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        updateStrategyInEditing(idx, { scheduleMode: 'WEEKDAYS' })
                                      }
                                      className={`px-2.5 py-1 text-[11px] font-semibold rounded cursor-pointer transition-colors ${
                                        (stratConfig.scheduleMode || 'WEEKDAYS') === 'WEEKDAYS'
                                          ? 'bg-emerald-600 text-white shadow-xs'
                                          : 'text-slate-400 hover:text-white'
                                      }`}
                                    >
                                      📅 Active Weekdays
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        updateStrategyInEditing(idx, { scheduleMode: 'DTE' })
                                      }
                                      className={`px-2.5 py-1 text-[11px] font-semibold rounded cursor-pointer transition-colors ${
                                        stratConfig.scheduleMode === 'DTE'
                                          ? 'bg-amber-600 text-white shadow-xs'
                                          : 'text-slate-400 hover:text-white'
                                      }`}
                                    >
                                      ⏳ Days to Expiry (DTE)
                                    </button>
                                  </div>
                                </div>

                                <span className="text-[10px] text-slate-500 font-mono italic">
                                  {(stratConfig.scheduleMode || 'WEEKDAYS') === 'WEEKDAYS'
                                    ? 'Weekdays active · DTE greyed out'
                                    : 'DTE active · Weekdays greyed out'}
                                </span>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                {/* Weekdays Control */}
                                <div
                                  className={`p-2.5 rounded-lg border transition-all ${
                                    (stratConfig.scheduleMode || 'WEEKDAYS') === 'WEEKDAYS'
                                      ? 'bg-slate-900/60 border-emerald-500/40'
                                      : 'bg-slate-950/40 border-slate-850 opacity-30 pointer-events-none select-none'
                                  }`}
                                >
                                  <div className="flex items-center justify-between mb-1.5">
                                    <label className="text-[11px] font-medium text-slate-300">
                                      Active Weekdays
                                    </label>
                                    {(stratConfig.scheduleMode || 'WEEKDAYS') !== 'WEEKDAYS' && (
                                      <span className="text-[9px] text-amber-400/80 font-mono">
                                        (Greyed Out)
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-1">
                                    {(['MON', 'TUE', 'WED', 'THU', 'FRI'] as DayOfWeek[]).map((day) => {
                                      const isActive = stratConfig.weekdays.includes(day);
                                      const isModeActive =
                                        (stratConfig.scheduleMode || 'WEEKDAYS') === 'WEEKDAYS';
                                      return (
                                        <button
                                          key={day}
                                          type="button"
                                          disabled={!isModeActive}
                                          onClick={() => toggleWeekdayInStrategy(idx, day)}
                                          className={`flex-1 py-1 text-[10px] font-mono rounded transition-colors ${
                                            isActive && isModeActive
                                              ? 'bg-emerald-600 text-white font-bold'
                                              : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                                          } ${!isModeActive ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                                        >
                                          {day.substring(0, 1)}
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>

                                {/* DTE Option Control */}
                                <div
                                  className={`p-2.5 rounded-lg border transition-all ${
                                    stratConfig.scheduleMode === 'DTE'
                                      ? 'bg-slate-900/60 border-amber-500/40'
                                      : 'bg-slate-950/40 border-slate-850 opacity-30 pointer-events-none select-none'
                                  }`}
                                >
                                  <div className="flex items-center justify-between mb-1.5">
                                    <label className="text-[11px] font-medium text-slate-300">
                                      DTE (Days to Expiry)
                                    </label>
                                    {stratConfig.scheduleMode !== 'DTE' && (
                                      <span className="text-[9px] text-emerald-400/80 font-mono">
                                        (Greyed Out)
                                      </span>
                                    )}
                                  </div>
                                  <select
                                    value={stratConfig.dteOption}
                                    disabled={stratConfig.scheduleMode !== 'DTE'}
                                    onChange={(e) =>
                                      updateStrategyInEditing(idx, {
                                        dteOption: e.target.value as DTEOption,
                                      })
                                    }
                                    className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 cursor-pointer disabled:cursor-not-allowed"
                                  >
                                    <option value="ANY">Any DTE (All Days)</option>
                                    <option value="0">0 DTE (Expiry Day Only)</option>
                                    <option value="1">1 DTE (Day Before Expiry)</option>
                                    <option value="2">2 DTE</option>
                                    <option value="3">3 DTE</option>
                                    <option value="4">4+ DTE</option>
                                    <option value="CUSTOM">Custom DTE Range</option>
                                  </select>

                                  {stratConfig.dteOption === 'CUSTOM' && stratConfig.scheduleMode === 'DTE' && (
                                    <div className="flex items-center gap-1.5 mt-1.5">
                                      <span className="text-[10px] text-slate-500">Min:</span>
                                      <input
                                        type="number"
                                        min={0}
                                        max={30}
                                        value={stratConfig.customDteRange?.min ?? 0}
                                        onChange={(e) =>
                                          updateStrategyInEditing(idx, {
                                            customDteRange: {
                                              min: parseInt(e.target.value) || 0,
                                              max: stratConfig.customDteRange?.max ?? 2,
                                            },
                                          })
                                        }
                                        className="w-12 bg-slate-900 border border-slate-800 rounded px-1.5 py-0.5 text-xs text-center"
                                      />
                                      <span className="text-[10px] text-slate-500">Max:</span>
                                      <input
                                        type="number"
                                        min={0}
                                        max={30}
                                        value={stratConfig.customDteRange?.max ?? 2}
                                        onChange={(e) =>
                                          updateStrategyInEditing(idx, {
                                            customDteRange: {
                                              min: stratConfig.customDteRange?.min ?? 0,
                                              max: parseInt(e.target.value) || 2,
                                            },
                                          })
                                        }
                                        className="w-12 bg-slate-900 border border-slate-800 rounded px-1.5 py-0.5 text-xs text-center"
                                      />
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Overall Portfolio Risk Management */}
              <div className="bg-slate-950/50 p-4 rounded-xl border border-slate-800/80 space-y-3">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-emerald-400" />
                  <span>Overall Portfolio Risk Management</span>
                </h3>
                <p className="text-[11px] text-slate-400">
                  Global MTM Stop Loss, Target Profit, and Lock-and-Trail applied across all combined strategies in this portfolio.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  {/* Portfolio Max Loss */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs text-slate-300 font-medium">
                        Portfolio Stop Loss
                      </label>
                      <input
                        type="checkbox"
                        checked={editingPortfolio.overallRisk.maxLossEnabled}
                        onChange={(e) =>
                          setEditingPortfolio({
                            ...editingPortfolio,
                            overallRisk: {
                              ...editingPortfolio.overallRisk,
                              maxLossEnabled: e.target.checked,
                            },
                          })
                        }
                        className="w-3.5 h-3.5 accent-emerald-500 rounded cursor-pointer"
                      />
                    </div>
                    {editingPortfolio.overallRisk.maxLossEnabled && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-400">₹</span>
                        <input
                          type="number"
                          step={500}
                          value={editingPortfolio.overallRisk.maxLoss}
                          onChange={(e) =>
                            setEditingPortfolio({
                              ...editingPortfolio,
                              overallRisk: {
                                ...editingPortfolio.overallRisk,
                                maxLoss: parseFloat(e.target.value) || 0,
                              },
                            })
                          }
                          className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-white"
                          placeholder="e.g. 10000"
                        />
                      </div>
                    )}
                  </div>

                  {/* Portfolio Max Profit */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs text-slate-300 font-medium">
                        Portfolio Target Profit
                      </label>
                      <input
                        type="checkbox"
                        checked={editingPortfolio.overallRisk.maxProfitEnabled}
                        onChange={(e) =>
                          setEditingPortfolio({
                            ...editingPortfolio,
                            overallRisk: {
                              ...editingPortfolio.overallRisk,
                              maxProfitEnabled: e.target.checked,
                            },
                          })
                        }
                        className="w-3.5 h-3.5 accent-emerald-500 rounded cursor-pointer"
                      />
                    </div>
                    {editingPortfolio.overallRisk.maxProfitEnabled && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-400">₹</span>
                        <input
                          type="number"
                          step={500}
                          value={editingPortfolio.overallRisk.maxProfit}
                          onChange={(e) =>
                            setEditingPortfolio({
                              ...editingPortfolio,
                              overallRisk: {
                                ...editingPortfolio.overallRisk,
                                maxProfit: parseFloat(e.target.value) || 0,
                              },
                            })
                          }
                          className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-white"
                          placeholder="e.g. 25000"
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Portfolio Lock & Trail */}
                <div className="pt-3 border-t border-slate-900 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs text-slate-300 font-medium">
                      Lock & Trail Portfolio Profit
                    </label>
                    <input
                      type="checkbox"
                      checked={editingPortfolio.overallRisk.lockAndTrailProfit.enabled}
                      onChange={(e) =>
                        setEditingPortfolio({
                          ...editingPortfolio,
                          overallRisk: {
                            ...editingPortfolio.overallRisk,
                            lockAndTrailProfit: {
                              ...editingPortfolio.overallRisk.lockAndTrailProfit,
                              enabled: e.target.checked,
                            },
                          },
                        })
                      }
                      className="w-3.5 h-3.5 accent-emerald-500 rounded cursor-pointer"
                    />
                  </div>

                  {editingPortfolio.overallRisk.lockAndTrailProfit.enabled && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-[11px]">
                      <div>
                        <span className="text-slate-400 block mb-1">Trigger at (₹)</span>
                        <input
                          type="number"
                          value={editingPortfolio.overallRisk.lockAndTrailProfit.triggerAmount}
                          onChange={(e) =>
                            setEditingPortfolio({
                              ...editingPortfolio,
                              overallRisk: {
                                ...editingPortfolio.overallRisk,
                                lockAndTrailProfit: {
                                  ...editingPortfolio.overallRisk.lockAndTrailProfit,
                                  triggerAmount: parseFloat(e.target.value) || 0,
                                },
                              },
                            })
                          }
                          className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-white"
                        />
                      </div>
                      <div>
                        <span className="text-slate-400 block mb-1">Lock profit (₹)</span>
                        <input
                          type="number"
                          value={editingPortfolio.overallRisk.lockAndTrailProfit.lockAmount}
                          onChange={(e) =>
                            setEditingPortfolio({
                              ...editingPortfolio,
                              overallRisk: {
                                ...editingPortfolio.overallRisk,
                                lockAndTrailProfit: {
                                  ...editingPortfolio.overallRisk.lockAndTrailProfit,
                                  lockAmount: parseFloat(e.target.value) || 0,
                                },
                              },
                            })
                          }
                          className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-white"
                        />
                      </div>
                      <div>
                        <span className="text-slate-400 block mb-1">Every increase (₹)</span>
                        <input
                          type="number"
                          value={editingPortfolio.overallRisk.lockAndTrailProfit.trailEvery}
                          onChange={(e) =>
                            setEditingPortfolio({
                              ...editingPortfolio,
                              overallRisk: {
                                ...editingPortfolio.overallRisk,
                                lockAndTrailProfit: {
                                  ...editingPortfolio.overallRisk.lockAndTrailProfit,
                                  trailEvery: parseFloat(e.target.value) || 0,
                                },
                              },
                            })
                          }
                          className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-white"
                        />
                      </div>
                      <div>
                        <span className="text-slate-400 block mb-1">Trail lock by (₹)</span>
                        <input
                          type="number"
                          value={editingPortfolio.overallRisk.lockAndTrailProfit.trailBy}
                          onChange={(e) =>
                            setEditingPortfolio({
                              ...editingPortfolio,
                              overallRisk: {
                                ...editingPortfolio.overallRisk,
                                lockAndTrailProfit: {
                                  ...editingPortfolio.overallRisk.lockAndTrailProfit,
                                  trailBy: parseFloat(e.target.value) || 0,
                                },
                              },
                            })
                          }
                          className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-white"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-end gap-3">
              <button
                onClick={() => {
                  setIsEditorOpen(false);
                  setEditingPortfolio(null);
                }}
                className="px-4 py-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEditor}
                className="px-5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-colors shadow-sm cursor-pointer"
              >
                Save Portfolio
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/80 border border-slate-800 rounded-xl p-4 lg:p-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Briefcase className="w-4 h-4" />
            </div>
            <h1 className="text-lg lg:text-xl font-bold text-white">Portfolios</h1>
            <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
              {portfolios.length} portfolios
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Combine multiple saved strategies into unified portfolios with individual Weekday & DTE execution rules. When deployed, all eligible strategies execute simultaneously.
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-colors shadow-sm cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Create Portfolio</span>
        </button>
      </div>

      {/* Portfolios List */}
      {portfolios.length === 0 ? (
        <div className="text-center py-16 bg-slate-900/40 border border-slate-800/80 rounded-xl space-y-3">
          <Briefcase className="w-10 h-10 mx-auto text-slate-600" />
          <h3 className="text-sm font-semibold text-slate-300">No portfolios created yet</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Group multiple strategies together to deploy them simultaneously with automated day-of-week and DTE scheduling.
          </p>
          <button
            onClick={handleOpenCreate}
            className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-colors cursor-pointer"
          >
            Create Your First Portfolio
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {portfolios.map((portfolio) => {
            const activeStrategiesCount = portfolio.strategies.filter((s) => s.enabled).length;
            return (
              <div
                key={portfolio.id}
                className="bg-slate-900/80 border border-slate-800 hover:border-slate-700/80 rounded-xl p-5 space-y-4 transition-all"
              >
                {/* Top Info & Actions */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <h3 className="text-base font-bold text-white">{portfolio.name}</h3>
                      <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800/60">
                        {activeStrategiesCount} / {portfolio.strategies.length} Active
                      </span>
                      {portfolio.isPreset && (
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 border border-slate-700">
                          Preset
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                      {portfolio.description}
                    </p>
                  </div>

                  {/* Top Action Buttons */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => onDeployPortfolioToPaper(portfolio)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 rounded-lg transition-colors shadow-sm cursor-pointer"
                      title="Deploy all active strategies in this portfolio to Paper Trading"
                    >
                      <Radio className="w-3.5 h-3.5" />
                      <span>Deploy Paper</span>
                    </button>

                    <button
                      onClick={() => onDeployPortfolioToBroker(portfolio)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-300 bg-rose-950/80 hover:bg-rose-900/80 border border-rose-800/80 rounded-lg transition-colors shadow-sm cursor-pointer"
                      title="Deploy this portfolio to Live Broker Execution"
                    >
                      <Flame className="w-3.5 h-3.5 text-rose-400" />
                      <span>Deploy Live</span>
                    </button>

                    <button
                      onClick={() => handleOpenEdit(portfolio)}
                      className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                      title="Edit Portfolio"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => handleDuplicate(portfolio.id)}
                      className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                      title="Duplicate Portfolio"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => setDeleteConfirmId(portfolio.id)}
                      className="p-2 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                      title="Delete Portfolio"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Included Strategies Table/Cards */}
                <div className="bg-slate-950/60 rounded-xl border border-slate-800/80 overflow-hidden">
                  <div className="px-3.5 py-2 bg-slate-950/90 border-b border-slate-800/80 flex items-center justify-between text-[11px] font-mono text-slate-400">
                    <span>Bundled Strategies & Day/DTE Schedule</span>
                    <span>Multi-Execution Rules</span>
                  </div>

                  <div className="divide-y divide-slate-800/60">
                    {portfolio.strategies.map((stratConfig, idx) => {
                      const stratObj = savedStrategies.find((s) => s.id === stratConfig.strategyId);
                      return (
                        <div
                          key={idx}
                          className="px-3.5 py-2.5 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs"
                        >
                          <div className="flex items-center gap-3">
                            <span
                              className={`w-2 h-2 rounded-full ${
                                stratConfig.enabled ? 'bg-emerald-400' : 'bg-slate-600'
                              }`}
                            />
                            <div>
                              <div className="font-semibold text-slate-200 flex items-center gap-2">
                                <span>{stratConfig.strategyName}</span>
                                {stratObj && (
                                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 border border-slate-700">
                                    {stratObj.underlying} · {stratObj.entryTime} to {stratObj.exitTime}
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-slate-400 mt-0.5">
                                Multiplier: <span className="font-mono text-emerald-400 font-semibold">{stratConfig.lotsMultiplier}x</span> lots
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-4 flex-wrap">
                            {/* Weekdays indicator */}
                            <div
                              className={`flex items-center gap-1 ${
                                stratConfig.scheduleMode === 'DTE'
                                  ? 'opacity-30 line-through'
                                  : ''
                              }`}
                              title={
                                stratConfig.scheduleMode === 'DTE'
                                  ? 'Weekdays disabled: Strategy scheduled by DTE'
                                  : 'Active Weekdays'
                              }
                            >
                              <span className="text-[10px] text-slate-500 font-mono mr-1">Days:</span>
                              {(['MON', 'TUE', 'WED', 'THU', 'FRI'] as DayOfWeek[]).map((day) => {
                                const active = stratConfig.weekdays.includes(day);
                                return (
                                  <span
                                    key={day}
                                    className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${
                                      active && stratConfig.scheduleMode !== 'DTE'
                                        ? 'bg-emerald-950 text-emerald-300 font-bold border border-emerald-800/60'
                                        : 'bg-slate-900 text-slate-600'
                                    }`}
                                  >
                                    {day.substring(0, 1)}
                                  </span>
                                );
                              })}
                            </div>

                            {/* DTE Badge indicator */}
                            <div
                              className={`flex items-center gap-1.5 ${
                                (stratConfig.scheduleMode || 'WEEKDAYS') === 'WEEKDAYS'
                                  ? 'opacity-30'
                                  : ''
                              }`}
                              title={
                                (stratConfig.scheduleMode || 'WEEKDAYS') === 'WEEKDAYS'
                                  ? 'DTE disabled: Strategy scheduled by Weekdays'
                                  : 'Active DTE Target'
                              }
                            >
                              <span className="text-[10px] text-slate-500 font-mono">DTE:</span>
                              <span
                                className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                                  stratConfig.scheduleMode === 'DTE'
                                    ? 'bg-amber-950/80 text-amber-300 border-amber-800/70 font-bold'
                                    : 'bg-slate-900 text-slate-500 border-slate-800'
                                }`}
                              >
                                {getDteLabel(stratConfig.dteOption, stratConfig.customDteRange)}
                              </span>
                            </div>

                            {stratObj && (
                              <button
                                onClick={() => onOpenStrategyBuilder(stratObj)}
                                className="text-[11px] text-slate-400 hover:text-emerald-400 hover:underline cursor-pointer"
                              >
                                View Strategy
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Portfolio Risk Footer */}
                <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 pt-1 flex-wrap gap-2">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1 text-slate-300">
                      <ShieldAlert className="w-3 h-3 text-rose-400" />
                      Portfolio SL: ₹{portfolio.overallRisk.maxLoss.toLocaleString('en-IN')}
                    </span>
                    <span className="flex items-center gap-1 text-slate-300">
                      <ShieldCheck className="w-3 h-3 text-emerald-400" />
                      Portfolio Target: ₹{portfolio.overallRisk.maxProfit.toLocaleString('en-IN')}
                    </span>
                  </div>

                  {portfolio.overallRisk.lockAndTrailProfit.enabled && (
                    <span className="text-amber-400">
                      Lock & Trail: Lock ₹{portfolio.overallRisk.lockAndTrailProfit.lockAmount} @ ₹{portfolio.overallRisk.lockAndTrailProfit.triggerAmount}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
