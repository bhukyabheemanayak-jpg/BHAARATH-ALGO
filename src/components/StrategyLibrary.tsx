import React, { useState } from 'react';
import {
  BookOpen,
  Plus,
  Trash2,
  Play,
  Copy,
  Edit3,
  Layers,
  Briefcase,
  Radio,
  Search,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Calendar,
  Zap,
  ArrowRight,
  ShieldAlert,
  Sliders,
  Flame,
} from 'lucide-react';
import { Strategy, UnderlyingIndex } from '../types/trading';
import {
  deleteStrategy,
  duplicateStrategy,
  getSavedStrategies,
  getPortfolios,
  savePortfolio,
} from '../services/strategyStorage';
import { UNDERLYING_CONFIGS } from '../services/optionPricer';

interface StrategyLibraryProps {
  onLoadStrategy: (strategy: Strategy) => void;
  onDeployToPaper: (strategy: Strategy) => void;
  onDeployToBroker: (strategy: Strategy) => void;
  onRunBacktest: (strategy: Strategy) => void;
  onNavigateToBuilder: () => void;
  onNavigateToPortfolios: () => void;
}

export const StrategyLibrary: React.FC<StrategyLibraryProps> = ({
  onLoadStrategy,
  onDeployToPaper,
  onDeployToBroker,
  onRunBacktest,
  onNavigateToBuilder,
  onNavigateToPortfolios,
}) => {
  const [strategies, setStrategies] = useState<Strategy[]>(() => getSavedStrategies());
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedUnderlying, setSelectedUnderlying] = useState<string>('ALL');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'CUSTOM' | 'PRESET'>('ALL');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [addToPortfolioStrategy, setAddToPortfolioStrategy] = useState<Strategy | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const refreshList = () => {
    setStrategies(getSavedStrategies());
  };

  // Delete handler
  const handleDelete = (id: string) => {
    const success = deleteStrategy(id);
    if (success) {
      refreshList();
      setDeleteConfirmId(null);
      showToast('Strategy deleted from Strategy Library.');
    }
  };

  // Duplicate handler
  const handleDuplicate = (id: string) => {
    const cloned = duplicateStrategy(id);
    if (cloned) {
      refreshList();
      showToast(`Strategy duplicated as "${cloned.name}".`);
    }
  };

  // Add to Portfolio handler
  const handleAddToPortfolio = (strategy: Strategy, portfolioId: string) => {
    const portfolios = getPortfolios();
    const port = portfolios.find((p) => p.id === portfolioId);
    if (!port) return;

    // Check if already in portfolio
    if (port.strategies.some((s) => s.strategyId === strategy.id)) {
      showToast(`"${strategy.name}" is already in portfolio "${port.name}".`);
      setAddToPortfolioStrategy(null);
      return;
    }

    port.strategies.push({
      strategyId: strategy.id,
      strategyName: strategy.name,
      enabled: true,
      lotsMultiplier: 1,
      weekdays: [...strategy.daysToTrade],
      dteOption: 'ANY',
    });

    savePortfolio(port);
    showToast(`Added "${strategy.name}" to portfolio "${port.name}".`);
    setAddToPortfolioStrategy(null);
  };

  // Filtered strategies
  const filteredStrategies = strategies.filter((strat) => {
    const matchesSearch =
      strat.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      strat.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (strat.tags && strat.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase())));

    const matchesUnderlying =
      selectedUnderlying === 'ALL' || strat.underlying === selectedUnderlying;

    const matchesType =
      typeFilter === 'ALL' ||
      (typeFilter === 'CUSTOM' && !strat.isPreset) ||
      (typeFilter === 'PRESET' && strat.isPreset);

    return matchesSearch && matchesUnderlying && matchesType;
  });

  const customCount = strategies.filter((s) => !s.isPreset).length;
  const presetCount = strategies.filter((s) => s.isPreset).length;
  const portfolios = getPortfolios();

  return (
    <div className="space-y-6 pb-16">
      {/* Toast banner */}
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
              <h3 className="text-base font-bold text-white">Delete Strategy?</h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Are you sure you want to delete this strategy from your library? If it is currently referenced in any portfolios, it will be unlinked. This action cannot be undone.
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

      {/* Add To Portfolio Modal */}
      {addToPortfolioStrategy && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-bold text-white">Add to Portfolio</h3>
              </div>
              <button
                onClick={() => setAddToPortfolioStrategy(null)}
                className="text-xs text-slate-400 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-300">
              Select a portfolio to bundle <span className="font-semibold text-emerald-400">"{addToPortfolioStrategy.name}"</span> into:
            </p>

            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {portfolios.map((port) => {
                const alreadyIncluded = port.strategies.some((s) => s.strategyId === addToPortfolioStrategy.id);
                return (
                  <div
                    key={port.id}
                    className={`p-3 rounded-lg border flex items-center justify-between gap-3 ${
                      alreadyIncluded
                        ? 'bg-slate-800/40 border-slate-800 opacity-60'
                        : 'bg-slate-800/80 border-slate-700/70 hover:border-emerald-500/60'
                    }`}
                  >
                    <div>
                      <div className="text-xs font-bold text-white flex items-center gap-2">
                        <span>{port.name}</span>
                        {alreadyIncluded && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-700 text-slate-300 font-normal">
                            Already Added
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        {port.strategies.length} strategies · Max Loss: ₹{port.overallRisk.maxLoss.toLocaleString('en-IN')}
                      </div>
                    </div>

                    {!alreadyIncluded && (
                      <button
                        onClick={() => handleAddToPortfolio(addToPortfolioStrategy, port.id)}
                        className="px-2.5 py-1 text-xs font-semibold text-emerald-300 bg-emerald-950 hover:bg-emerald-900 border border-emerald-700/60 rounded-md transition-colors cursor-pointer"
                      >
                        Add
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
              <button
                onClick={() => {
                  setAddToPortfolioStrategy(null);
                  onNavigateToPortfolios();
                }}
                className="text-xs text-emerald-400 hover:underline cursor-pointer flex items-center gap-1"
              >
                <span>Go to Portfolios Manager</span>
                <ArrowRight className="w-3 h-3" />
              </button>
              <button
                onClick={() => setAddToPortfolioStrategy(null)}
                className="px-3 py-1.5 text-xs text-slate-400 hover:text-white bg-slate-800 rounded-lg cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/80 border border-slate-800 rounded-xl p-4 lg:p-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <BookOpen className="w-4 h-4" />
            </div>
            <h1 className="text-lg lg:text-xl font-bold text-white">Strategy Library</h1>
            <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
              {strategies.length} strategies
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Manage your personal saved strategies and benchmark presets. Deploy directly to live Paper Trading, link to multi-strategy portfolios, or edit in the Strategy Builder.
          </p>
        </div>

        <div className="flex items-center flex-wrap gap-2.5">
          <button
            onClick={onNavigateToBuilder}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-colors shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create New Strategy</span>
          </button>

          <button
            onClick={onNavigateToPortfolios}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors cursor-pointer"
          >
            <Briefcase className="w-4 h-4 text-emerald-400" />
            <span>Portfolios ({portfolios.length})</span>
          </button>
        </div>
      </div>

      {/* Filters & Search Control Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-900/60 border border-slate-800/80 rounded-xl p-3">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search strategy by name, description, tags..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
          />
        </div>

        <div className="flex items-center flex-wrap gap-2">
          {/* Type Filter */}
          <div className="flex items-center p-0.5 bg-slate-950 border border-slate-800 rounded-lg text-xs">
            <button
              onClick={() => setTypeFilter('ALL')}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                typeFilter === 'ALL'
                  ? 'bg-slate-800 text-white font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              All ({strategies.length})
            </button>
            <button
              onClick={() => setTypeFilter('CUSTOM')}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                typeFilter === 'CUSTOM'
                  ? 'bg-emerald-600 text-white font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Custom ({customCount})
            </button>
            <button
              onClick={() => setTypeFilter('PRESET')}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                typeFilter === 'PRESET'
                  ? 'bg-slate-800 text-white font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Presets ({presetCount})
            </button>
          </div>

          {/* Underlying Filter */}
          <select
            value={selectedUnderlying}
            onChange={(e) => setSelectedUnderlying(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-emerald-500 cursor-pointer"
          >
            <option value="ALL">All Underlyings</option>
            <option value="NIFTY">NIFTY</option>
            <option value="BANKNIFTY">BANKNIFTY</option>
            <option value="FINNIFTY">FINNIFTY</option>
            <option value="SENSEX">SENSEX</option>
            <option value="MIDCPNIFTY">MIDCPNIFTY</option>
          </select>
        </div>
      </div>

      {/* Strategies Grid */}
      {filteredStrategies.length === 0 ? (
        <div className="text-center py-16 bg-slate-900/40 border border-slate-800/80 rounded-xl space-y-3">
          <BookOpen className="w-10 h-10 mx-auto text-slate-600" />
          <h3 className="text-sm font-semibold text-slate-300">No strategies found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            No strategies matched your search or filters. Create a new strategy or reset your filter criteria.
          </p>
          <button
            onClick={() => {
              setSearchQuery('');
              setSelectedUnderlying('ALL');
              setTypeFilter('ALL');
            }}
            className="px-3 py-1.5 text-xs text-emerald-400 hover:text-emerald-300 font-medium cursor-pointer"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredStrategies.map((strat) => {
            const underlyingConfig = UNDERLYING_CONFIGS[strat.underlying];
            return (
              <div
                key={strat.id}
                className="bg-slate-900/80 border border-slate-800 hover:border-slate-700/90 rounded-xl p-4 flex flex-col justify-between space-y-4 transition-all hover:shadow-lg hover:shadow-slate-950/40 group"
              >
                {/* Header info */}
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-bold text-white group-hover:text-emerald-400 transition-colors line-clamp-1">
                        {strat.name}
                      </h3>
                      <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                        <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-slate-800 text-emerald-400 border border-slate-700">
                          {strat.underlying}
                        </span>
                        {strat.isPreset ? (
                          <span className="text-[10px] font-medium px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 border border-slate-700">
                            Preset
                          </span>
                        ) : (
                          <span className="text-[10px] font-medium px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-300 border border-emerald-700/60 font-semibold">
                            Custom
                          </span>
                        )}
                        <span className="text-[10px] font-mono text-slate-400">
                          {strat.strategyType}
                        </span>
                      </div>
                    </div>

                    {/* Quick duplicate / delete actions */}
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleDuplicate(strat.id)}
                        className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-md transition-colors cursor-pointer"
                        title="Duplicate Strategy"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setDeleteConfirmId(strat.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-md transition-colors cursor-pointer"
                        title="Delete Strategy"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                    {strat.description || 'Custom multi-leg algorithmic options trading strategy.'}
                  </p>

                  {/* Badges / Metrics */}
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800/80 text-[11px] font-mono text-slate-400">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3 h-3 text-slate-500" />
                      <span>{strat.entryTime} - {strat.exitTime}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Layers className="w-3 h-3 text-slate-500" />
                      <span>{strat.legs.length} Leg{strat.legs.length !== 1 ? 's' : ''}</span>
                    </div>
                  </div>

                  {/* Weekdays */}
                  <div className="flex items-center gap-1 pt-1">
                    {(['MON', 'TUE', 'WED', 'THU', 'FRI'] as const).map((day) => {
                      const active = strat.daysToTrade.includes(day);
                      return (
                        <span
                          key={day}
                          className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${
                            active
                              ? 'bg-emerald-950/80 text-emerald-400 font-bold border border-emerald-800/60'
                              : 'bg-slate-950 text-slate-600'
                          }`}
                        >
                          {day.substring(0, 1)}
                        </span>
                      );
                    })}
                  </div>
                </div>

                {/* Primary Actions */}
                <div className="space-y-2 pt-2 border-t border-slate-800/80">
                  {/* Deployment row */}
                  <div className="grid grid-cols-3 gap-1.5">
                    <button
                      onClick={() => onDeployToBroker(strat)}
                      className="flex items-center justify-center gap-1 py-1.5 px-2 text-[11px] font-bold text-rose-300 bg-rose-950/80 hover:bg-rose-900/80 border border-rose-800/80 rounded-lg transition-colors cursor-pointer shadow-xs"
                      title="Deploy this strategy to Live Broker Execution"
                    >
                      <Flame className="w-3 h-3 text-rose-400" />
                      <span>Live</span>
                    </button>

                    <button
                      onClick={() => onDeployToPaper(strat)}
                      className="flex items-center justify-center gap-1 py-1.5 px-2 text-[11px] font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-colors cursor-pointer shadow-xs"
                      title="Deploy this strategy in Live Paper Trading"
                    >
                      <Radio className="w-3 h-3" />
                      <span>Paper</span>
                    </button>

                    <button
                      onClick={() => onRunBacktest(strat)}
                      className="flex items-center justify-center gap-1 py-1.5 px-2 text-[11px] font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
                      title="Run Backtest on historical data"
                    >
                      <Play className="w-3 h-3 text-emerald-400 fill-emerald-400" />
                      <span>Backtest</span>
                    </button>
                  </div>

                  {/* Secondary row */}
                  <div className="flex items-center justify-between gap-2">
                    <button
                      onClick={() => {
                        onLoadStrategy(strat);
                        onNavigateToBuilder();
                      }}
                      className="flex-1 flex items-center justify-center gap-1.5 py-1 px-2 text-[11px] font-medium text-slate-300 hover:text-white bg-slate-800/50 hover:bg-slate-800 border border-slate-700/60 rounded-md transition-colors cursor-pointer"
                    >
                      <Edit3 className="w-3 h-3 text-amber-400" />
                      <span>Edit in Builder</span>
                    </button>

                    <button
                      onClick={() => setAddToPortfolioStrategy(strat)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-1 px-2 text-[11px] font-medium text-slate-300 hover:text-white bg-slate-800/50 hover:bg-slate-800 border border-slate-700/60 rounded-md transition-colors cursor-pointer"
                    >
                      <Briefcase className="w-3 h-3 text-emerald-400" />
                      <span>+ Portfolio</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
