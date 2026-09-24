import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Calendar,
  Download,
  Filter,
  Search,
  Percent,
  Activity,
  Layers,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Briefcase,
  Sliders,
  Check,
  Zap,
} from 'lucide-react';
import {
  BacktestSummary,
  DayOfWeek,
  Portfolio,
  PortfolioBacktestSummary,
  Strategy,
  TradeRecord,
} from '../types/trading';
import { getSavedPortfolios, getSavedStrategies } from '../services/strategyStorage';
import { runBacktest, runPortfolioBacktest } from '../services/backtestEngine';

interface BacktestAnalyticsProps {
  summary: BacktestSummary | null;
  onRunBacktest: () => void;
  isBacktesting: boolean;
  currentStrategy?: Strategy;
  onSelectStrategy?: (strategy: Strategy) => void;
  onSelectPortfolio?: (portfolio: Portfolio) => void;
}

export const BacktestAnalytics: React.FC<BacktestAnalyticsProps> = ({
  summary: propSummary,
  onRunBacktest,
  isBacktesting: propIsBacktesting,
  currentStrategy,
  onSelectStrategy,
  onSelectPortfolio,
}) => {
  const [chartMode, setChartMode] = useState<'EQUITY' | 'DRAWDOWN'>('EQUITY');
  const [hoveredPoint, setHoveredPoint] = useState<{
    date: string;
    dayPnl: number;
    cumulativePnl: number;
    drawdownPct: number;
    x: number;
    y: number;
  } | null>(null);

  // Filters for Trade Log
  const [searchQuery, setSearchQuery] = useState('');
  const [reasonFilter, setReasonFilter] = useState<string>('ALL');

  // Selection state: Strategy or Portfolio
  const [selectionType, setSelectionType] = useState<'STRATEGY' | 'PORTFOLIO'>('STRATEGY');
  const [savedStrategies, setSavedStrategies] = useState<Strategy[]>([]);
  const [savedPortfolios, setSavedPortfolios] = useState<Portfolio[]>([]);
  const [selectedStrategyId, setSelectedStrategyId] = useState<string>('');
  const [selectedPortfolioId, setSelectedPortfolioId] = useState<string>('');

  // Results state
  const [localStrategySummary, setLocalStrategySummary] = useState<BacktestSummary | null>(
    propSummary
  );
  const [portfolioResult, setPortfolioResult] = useState<PortfolioBacktestSummary | null>(null);
  const [activeConstituentView, setActiveConstituentView] = useState<'COMBINED' | string>('COMBINED');
  const [localIsBacktesting, setLocalIsBacktesting] = useState<boolean>(false);

  // Initialize saved strategies and portfolios
  useEffect(() => {
    const strats = getSavedStrategies();
    const ports = getSavedPortfolios();
    setSavedStrategies(strats);
    setSavedPortfolios(ports);

    if (currentStrategy) {
      setSelectedStrategyId(currentStrategy.id);
    } else if (strats.length > 0) {
      setSelectedStrategyId(strats[0].id);
    }

    if (ports.length > 0) {
      setSelectedPortfolioId(ports[0].id);
    }
  }, [currentStrategy]);

  // Sync with propSummary if updated externally
  useEffect(() => {
    if (propSummary && selectionType === 'STRATEGY') {
      setLocalStrategySummary(propSummary);
    }
  }, [propSummary, selectionType]);

  // Switch between Strategy and Portfolio mode
  const handleSwitchMode = (mode: 'STRATEGY' | 'PORTFOLIO') => {
    setSelectionType(mode);
    setActiveConstituentView('COMBINED');

    if (mode === 'PORTFOLIO' && !portfolioResult && savedPortfolios.length > 0) {
      const port = savedPortfolios.find((p) => p.id === selectedPortfolioId) || savedPortfolios[0];
      if (port) {
        executePortfolioBacktest(port);
      }
    }
  };

  // Run Strategy Backtest
  const executeStrategyBacktest = (targetStrat: Strategy) => {
    setLocalIsBacktesting(true);
    setTimeout(() => {
      const res = runBacktest(targetStrat);
      setLocalStrategySummary(res);
      setLocalIsBacktesting(false);
      onSelectStrategy?.(targetStrat);
    }, 200);
  };

  // Run Portfolio Backtest
  const executePortfolioBacktest = (targetPort: Portfolio) => {
    setLocalIsBacktesting(true);
    setTimeout(() => {
      const res = runPortfolioBacktest(targetPort, savedStrategies);
      setPortfolioResult(res);
      setActiveConstituentView('COMBINED');
      setLocalIsBacktesting(false);
      onSelectPortfolio?.(targetPort);
    }, 250);
  };

  // Strategy change handler
  const handleStrategyChange = (id: string) => {
    setSelectedStrategyId(id);
    const found = savedStrategies.find((s) => s.id === id);
    if (found) {
      executeStrategyBacktest(found);
    }
  };

  // Portfolio change handler
  const handlePortfolioChange = (id: string) => {
    setSelectedPortfolioId(id);
    const found = savedPortfolios.find((p) => p.id === id);
    if (found) {
      executePortfolioBacktest(found);
    }
  };

  // Re-run current backtest
  const handleRunCurrentBacktest = () => {
    if (selectionType === 'STRATEGY') {
      const strat =
        savedStrategies.find((s) => s.id === selectedStrategyId) ||
        currentStrategy ||
        savedStrategies[0];
      if (strat) executeStrategyBacktest(strat);
      else onRunBacktest();
    } else {
      const port = savedPortfolios.find((p) => p.id === selectedPortfolioId) || savedPortfolios[0];
      if (port) executePortfolioBacktest(port);
    }
  };

  // Determine which summary to display
  const currentSelectedStrat =
    savedStrategies.find((s) => s.id === selectedStrategyId) || currentStrategy;
  const currentSelectedPort = savedPortfolios.find((p) => p.id === selectedPortfolioId);

  let summary: BacktestSummary | null = null;
  if (selectionType === 'STRATEGY') {
    summary = localStrategySummary || propSummary;
  } else {
    if (portfolioResult) {
      if (activeConstituentView === 'COMBINED') {
        summary = portfolioResult.combinedSummary;
      } else {
        const found = portfolioResult.strategySummaries.find(
          (s) => s.strategyId === activeConstituentView
        );
        summary = found ? found.summary : portfolioResult.combinedSummary;
      }
    }
  }

  const isBacktesting = localIsBacktesting || propIsBacktesting;

  // Render Top Selector Bar Component
  const renderSelectorBar = () => (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 space-y-3.5 shadow-sm">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Mode Switch: Strategy vs Portfolio */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-300">Backtest Target:</span>
          <div className="flex items-center p-0.5 bg-slate-950 rounded-lg border border-slate-800">
            <button
              type="button"
              onClick={() => handleSwitchMode('STRATEGY')}
              className={`flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                selectionType === 'STRATEGY'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Saved Strategies ({savedStrategies.length})</span>
            </button>
            <button
              type="button"
              onClick={() => handleSwitchMode('PORTFOLIO')}
              className={`flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                selectionType === 'PORTFOLIO'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Briefcase className="w-3.5 h-3.5" />
              <span>Portfolios ({savedPortfolios.length})</span>
            </button>
          </div>
        </div>

        {/* Action Button */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleRunCurrentBacktest}
            disabled={isBacktesting}
            className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-colors cursor-pointer shadow-sm disabled:opacity-50"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${isBacktesting ? 'animate-spin' : ''}`} />
            <span>
              {isBacktesting
                ? 'Simulating...'
                : `Run ${selectionType === 'STRATEGY' ? 'Strategy' : 'Portfolio'} Backtest`}
            </span>
          </button>
        </div>
      </div>

      {/* Dropdown Selector & Details */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 border-t border-slate-800/80">
        <div className="md:col-span-2">
          <label className="block text-[11px] font-medium text-slate-400 mb-1">
            {selectionType === 'STRATEGY' ? 'Select Saved Strategy:' : 'Select Portfolio:'}
          </label>
          {selectionType === 'STRATEGY' ? (
            <select
              value={selectedStrategyId}
              onChange={(e) => handleStrategyChange(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-medium cursor-pointer"
            >
              {savedStrategies.map((s) => (
                <option key={s.id} value={s.id}>
                  [{s.underlying}] {s.name} ({s.legs.length} legs · {s.entryTime} to {s.exitTime})
                </option>
              ))}
            </select>
          ) : (
            <select
              value={selectedPortfolioId}
              onChange={(e) => handlePortfolioChange(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-medium cursor-pointer"
            >
              {savedPortfolios.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.strategies.length} strategies bundled)
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Quick Details Chip */}
        <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-850 flex flex-col justify-center text-xs font-mono">
          {selectionType === 'STRATEGY' && currentSelectedStrat && (
            <div className="space-y-1">
              <div className="flex items-center justify-between text-slate-400">
                <span>
                  Underlying: <b className="text-emerald-400">{currentSelectedStrat.underlying}</b>
                </span>
                <span>{currentSelectedStrat.legs.length} Legs</span>
              </div>
              <div className="text-[11px] text-slate-400 truncate">
                Days: {currentSelectedStrat.daysToTrade.join(', ')} · {currentSelectedStrat.entryTime} - {currentSelectedStrat.exitTime}
              </div>
            </div>
          )}
          {selectionType === 'PORTFOLIO' && currentSelectedPort && (
            <div className="space-y-1">
              <div className="flex items-center justify-between text-slate-400">
                <span>
                  Bundled: <b className="text-emerald-400">{currentSelectedPort.strategies.length} Strategies</b>
                </span>
                <span>
                  {currentSelectedPort.overallRisk?.maxLossEnabled
                    ? `Max SL: ₹${currentSelectedPort.overallRisk.maxLoss}`
                    : 'No SL'}
                </span>
              </div>
              <div className="text-[11px] text-slate-400 truncate">
                {currentSelectedPort.strategies.map((s) => s.strategyName).join(', ')}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Portfolio Constituent Sub-tabs when Portfolio is backtested */}
      {selectionType === 'PORTFOLIO' && portfolioResult && (
        <div className="pt-2 border-t border-slate-800/80 flex items-center gap-1.5 overflow-x-auto">
          <span className="text-[11px] text-slate-400 font-medium mr-1 shrink-0">View Breakdown:</span>
          <button
            onClick={() => setActiveConstituentView('COMBINED')}
            className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors cursor-pointer shrink-0 ${
              activeConstituentView === 'COMBINED'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            ✨ Combined Portfolio ({portfolioResult.strategySummaries.length} Strategies)
          </button>
          {portfolioResult.strategySummaries.map((ss) => (
            <button
              key={ss.strategyId}
              onClick={() => setActiveConstituentView(ss.strategyId)}
              className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors cursor-pointer shrink-0 ${
                activeConstituentView === ss.strategyId
                  ? 'bg-emerald-600 text-white font-bold shadow-xs'
                  : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              {ss.strategyName} ({ss.lotsMultiplier}x · {ss.scheduleMode})
            </button>
          ))}
        </div>
      )}
    </div>
  );

  if (!summary) {
    return (
      <div className="space-y-6 pb-12">
        {renderSelectorBar()}
        <div className="flex flex-col items-center justify-center p-12 text-center bg-slate-900/40 border border-slate-800 rounded-xl space-y-4">
          <Activity className="w-12 h-12 text-slate-600 animate-pulse" />
          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-200">
              Ready to Backtest {selectionType === 'STRATEGY' ? 'Strategy' : 'Portfolio'}
            </h3>
            <p className="text-xs text-slate-400 max-w-sm">
              Select a saved strategy or portfolio from the dropdown above and run the simulation across historical market sessions.
            </p>
          </div>
          <button
            onClick={handleRunCurrentBacktest}
            disabled={isBacktesting}
            className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg shadow-sm transition-colors cursor-pointer"
          >
            {isBacktesting ? 'Simulating...' : 'Run Backtest Now'}
          </button>
        </div>
      </div>
    );
  }

  const {
    strategyName,
    underlying,
    period,
    initialCapital,
    totalNetPnl,
    totalGrossPnl,
    totalBrokerageTaxes,
    totalSlippageCost,
    roiPct,
    winRatePct,
    lossRatePct,
    totalTrades,
    winningTrades,
    losingTrades,
    profitFactor,
    sharpeRatio,
    sortinoRatio,
    maxDrawdown,
    maxDrawdownPct,
    avgWinPnl,
    avgLossPnl,
    riskRewardRatio,
    expectancy,
    maxConsecutiveWins,
    maxConsecutiveLosses,
    dayWisePerformance,
    monthlyPerformance,
    dailyResults,
    tradeLog,
  } = summary;

  const isNetProfit = totalNetPnl >= 0;

  // SVG Chart Geometry
  const chartWidth = 900;
  const chartHeight = 240;
  const padLeft = 60;
  const padRight = 20;
  const padTop = 20;
  const padBottom = 30;

  const innerWidth = chartWidth - padLeft - padRight;
  const innerHeight = chartHeight - padTop - padBottom;

  // Calculate scales for Equity / Drawdown
  const equityValues = dailyResults.map((d) => d.cumulativePnl);
  const drawdownValues = dailyResults.map((d) => -d.drawdownPct);

  const valuesToScale = chartMode === 'EQUITY' ? equityValues : drawdownValues;
  const minVal = Math.min(0, ...valuesToScale);
  const maxVal = Math.max(100, ...valuesToScale);
  const valRange = maxVal - minVal || 1;

  const getX = (index: number) => {
    if (dailyResults.length <= 1) return padLeft + innerWidth / 2;
    return padLeft + (index / (dailyResults.length - 1)) * innerWidth;
  };

  const getY = (val: number) => {
    return padTop + innerHeight - ((val - minVal) / valRange) * innerHeight;
  };

  const zeroY = getY(0);

  // Generate SVG path points
  const points = dailyResults.map((d, i) => {
    const val = chartMode === 'EQUITY' ? d.cumulativePnl : -d.drawdownPct;
    return { x: getX(i), y: getY(val), d };
  });

  const linePath = points.reduce((acc, pt, i) => {
    return i === 0 ? `M ${pt.x},${pt.y}` : `${acc} L ${pt.x},${pt.y}`;
  }, '');

  const areaPath =
    points.length > 0
      ? `${linePath} L ${points[points.length - 1].x},${zeroY} L ${points[0].x},${zeroY} Z`
      : '';

  // Filtered trades
  const filteredTrades = tradeLog.filter((trade) => {
    const matchesSearch =
      searchQuery === '' ||
      trade.legId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      trade.date.includes(searchQuery);

    const matchesReason =
      reasonFilter === 'ALL' ||
      (reasonFilter === 'STOP_LOSS' && trade.exitReason === 'STOP_LOSS') ||
      (reasonFilter === 'TARGET_PROFIT' && trade.exitReason === 'TARGET_PROFIT') ||
      (reasonFilter === 'SQUARE_OFF' && trade.exitReason === 'SQUARE_OFF');

    return matchesSearch && matchesReason;
  });

  // Export CSV
  const handleExportCSV = () => {
    const headers = [
      'Date',
      'Leg',
      'Action',
      'Instrument',
      'Strike',
      'Quantity',
      'Entry Time',
      'Entry Price',
      'Exit Time',
      'Exit Price',
      'Gross PnL (INR)',
      'Statutory Charges (INR)',
      'Net PnL (INR)',
      'Return %',
      'Exit Reason',
    ];

    const rows = tradeLog.map((t) => [
      t.date,
      t.legId,
      t.action,
      t.instrument,
      t.strike,
      t.quantity,
      t.entryTime,
      t.entryPrice,
      t.exitTime,
      t.exitPrice,
      t.pnl,
      t.brokerage,
      t.netPnl,
      t.pnlPct,
      t.exitReason,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${strategyName.replace(/\s+/g, '_')}_trades.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Selector Bar for Saved Strategies and Portfolios */}
      {renderSelectorBar()}

      {/* Strategy / Portfolio Summary Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/80 border border-slate-800 rounded-xl p-4 lg:p-5">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-white">{strategyName}</h2>
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-emerald-400 border border-slate-700">
              {selectionType === 'PORTFOLIO'
                ? activeConstituentView === 'COMBINED'
                  ? 'PORTFOLIO'
                  : 'LEG STRATEGY'
                : underlying}
            </span>
            {selectionType === 'PORTFOLIO' && activeConstituentView === 'COMBINED' && (
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-emerald-950/60 text-emerald-300 border border-emerald-800">
                {portfolioResult?.strategySummaries.length} Strategies Combined
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-400 mt-1">
            <span>Period: {period.start} to {period.end}</span>
            <span aria-hidden="true">·</span>
            <span>{period.totalTradingDays} sessions</span>
            <span aria-hidden="true">·</span>
            <span>Initial Capital: ₹{initialCapital.toLocaleString('en-IN')}</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleRunCurrentBacktest}
            disabled={isBacktesting}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors cursor-pointer"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${isBacktesting ? 'animate-spin' : ''}`} />
            <span>Re-run Simulation</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* High-Impact Performance Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Metric 1: Net PnL */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5 space-y-1">
          <span className="text-xs text-slate-400">Total Net P&L</span>
          <div className={`text-lg font-bold font-mono tabular-nums ${isNetProfit ? 'text-emerald-400' : 'text-rose-400'}`}>
            {isNetProfit ? '+' : ''}₹{totalNetPnl.toLocaleString('en-IN')}
          </div>
          <div className="text-xs text-slate-500 font-mono">
            ROI: <span className={roiPct >= 0 ? 'text-emerald-400' : 'text-rose-400'}>{roiPct}%</span>
          </div>
        </div>

        {/* Metric 2: Win Rate */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5 space-y-1">
          <span className="text-xs text-slate-400">Win Rate</span>
          <div className="text-lg font-bold font-mono text-emerald-400 tabular-nums">
            {winRatePct}%
          </div>
          <div className="text-xs text-slate-500 font-mono">
            {winningTrades}W / {losingTrades}L ({totalTrades} trades)
          </div>
        </div>

        {/* Metric 3: Profit Factor */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5 space-y-1">
          <span className="text-xs text-slate-400">Profit Factor</span>
          <div className="text-lg font-bold font-mono text-white tabular-nums">
            {profitFactor}
          </div>
          <div className="text-xs text-slate-500 font-mono">
            Exp: ₹{expectancy}/trade
          </div>
        </div>

        {/* Metric 4: Max Drawdown */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5 space-y-1">
          <span className="text-xs text-slate-400">Max Drawdown</span>
          <div className="text-lg font-bold font-mono text-rose-400 tabular-nums">
            -{maxDrawdownPct}%
          </div>
          <div className="text-xs text-slate-500 font-mono">
            -₹{maxDrawdown.toLocaleString('en-IN')}
          </div>
        </div>

        {/* Metric 5: Sharpe & Sortino */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5 space-y-1">
          <span className="text-xs text-slate-400">Sharpe Ratio</span>
          <div className="text-lg font-bold font-mono text-sky-400 tabular-nums">
            {sharpeRatio}
          </div>
          <div className="text-xs text-slate-500 font-mono">
            Sortino: {sortinoRatio}
          </div>
        </div>

        {/* Metric 6: Risk-Reward */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5 space-y-1">
          <span className="text-xs text-slate-400">Risk : Reward</span>
          <div className="text-lg font-bold font-mono text-white tabular-nums">
            1 : {riskRewardRatio}
          </div>
          <div className="text-xs text-slate-500 font-mono">
            Max Cons: {maxConsecutiveWins}W / {maxConsecutiveLosses}L
          </div>
        </div>
      </div>

      {/* Equity & Drawdown Interactive SVG Chart */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 lg:p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-0.5">
            <h3 className="text-sm font-bold text-white">Performance Trajectory</h3>
            <span className="text-xs text-slate-400">
              {chartMode === 'EQUITY'
                ? 'Cumulative Net P&L (post brokerage & slippage friction)'
                : 'Underwater Drawdown from Historical Peak'}
            </span>
          </div>

          <div className="flex items-center bg-slate-950 p-1 rounded-lg border border-slate-800">
            <button
              onClick={() => setChartMode('EQUITY')}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                chartMode === 'EQUITY'
                  ? 'bg-slate-800 text-emerald-400 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Equity Curve (₹)
            </button>
            <button
              onClick={() => setChartMode('DRAWDOWN')}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                chartMode === 'DRAWDOWN'
                  ? 'bg-slate-800 text-rose-400 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Drawdown (%)
            </button>
          </div>
        </div>

        {/* Chart Viewport */}
        <div className="relative w-full overflow-hidden">
          <svg
            viewBox={`0 0 ${chartWidth} ${chartHeight}`}
            className="w-full h-auto select-none"
            onMouseLeave={() => setHoveredPoint(null)}
          >
            <defs>
              <linearGradient id="equityGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
              </linearGradient>
              <linearGradient id="drawdownGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.0" />
                <stop offset="100%" stopColor="#f43f5e" stopOpacity="0.3" />
              </linearGradient>
            </defs>

            {/* Horizontal Grid lines */}
            {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => {
              const y = padTop + innerHeight * pct;
              const val = Math.round(maxVal - pct * valRange);
              return (
                <g key={i}>
                  <line
                    x1={padLeft}
                    y1={y}
                    x2={chartWidth - padRight}
                    y2={y}
                    stroke="#1e293b"
                    strokeDasharray="3,3"
                  />
                  <text
                    x={padLeft - 8}
                    y={y + 4}
                    fill="#64748b"
                    fontSize="10"
                    fontFamily="monospace"
                    textAnchor="end"
                  >
                    {chartMode === 'EQUITY' ? `₹${val.toLocaleString()}` : `${val}%`}
                  </text>
                </g>
              );
            })}

            {/* Zero Axis Reference Line */}
            {zeroY >= padTop && zeroY <= padTop + innerHeight && (
              <line
                x1={padLeft}
                y1={zeroY}
                x2={chartWidth - padRight}
                y2={zeroY}
                stroke="#475569"
                strokeWidth="1.2"
              />
            )}

            {/* Area Fill */}
            <path
              d={areaPath}
              fill={chartMode === 'EQUITY' ? 'url(#equityGrad)' : 'url(#drawdownGrad)'}
            />

            {/* Main Curve Line */}
            <path
              d={linePath}
              fill="none"
              stroke={chartMode === 'EQUITY' ? '#10b981' : '#f43f5e'}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Interactive hover overlays */}
            {points.map((pt, i) => (
              <circle
                key={i}
                cx={pt.x}
                cy={pt.y}
                r="6"
                className="opacity-0 hover:opacity-100 cursor-pointer fill-emerald-400 transition-opacity"
                onMouseEnter={() =>
                  setHoveredPoint({
                    date: pt.d.date,
                    dayPnl: pt.d.netPnl,
                    cumulativePnl: pt.d.cumulativePnl,
                    drawdownPct: pt.d.drawdownPct,
                    x: pt.x,
                    y: pt.y,
                  })
                }
              />
            ))}
          </svg>

          {/* Tooltip Overlay */}
          {hoveredPoint && (
            <div
              className="absolute pointer-events-none bg-slate-950/95 border border-slate-700 rounded-lg p-2.5 shadow-xl text-xs font-mono space-y-1 transform -translate-x-1/2 -translate-y-full"
              style={{
                left: `${(hoveredPoint.x / chartWidth) * 100}%`,
                top: `${(hoveredPoint.y / chartHeight) * 100 - 8}%`,
              }}
            >
              <div className="text-slate-400 font-sans font-semibold">{hoveredPoint.date}</div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-slate-400">Day P&L:</span>
                <span className={hoveredPoint.dayPnl >= 0 ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                  {hoveredPoint.dayPnl >= 0 ? '+' : ''}₹{hoveredPoint.dayPnl.toLocaleString('en-IN')}
                </span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-slate-400">Total Net:</span>
                <span className="text-white font-bold">
                  ₹{hoveredPoint.cumulativePnl.toLocaleString('en-IN')}
                </span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-slate-400">Drawdown:</span>
                <span className="text-rose-400 font-bold">
                  -{hoveredPoint.drawdownPct}%
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Grid: Day-of-Week Breakdown & Statutory Friction Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Day-of-Week Distribution */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-emerald-400" />
              Day-of-Week Performance
            </span>
            <span className="text-xs text-slate-500 font-mono">Mon - Fri</span>
          </div>

          <div className="space-y-2.5">
            {(['MON', 'TUE', 'WED', 'THU', 'FRI'] as DayOfWeek[]).map((day) => {
              const perf = dayWisePerformance[day];
              const isProfit = perf.pnl >= 0;

              return (
                <div key={day} className="flex items-center justify-between text-xs font-mono">
                  <div className="w-14 font-bold text-slate-300">{day}</div>
                  <div className="flex-1 px-3">
                    <div className="h-2 w-full bg-slate-950 rounded-full overflow-hidden flex items-center">
                      <div
                        className={`h-full rounded-full ${isProfit ? 'bg-emerald-500' : 'bg-rose-500'}`}
                        style={{ width: `${Math.min(100, Math.max(10, perf.winRate))}%` }}
                      />
                    </div>
                  </div>
                  <div className="w-20 text-right text-slate-400">{perf.winRate}% Win</div>
                  <div className={`w-28 text-right font-bold tabular-nums ${isProfit ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {isProfit ? '+' : ''}₹{perf.pnl.toLocaleString('en-IN')}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Friction & Brokerage Costs */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Percent className="w-3.5 h-3.5 text-emerald-400" />
              Execution Friction & Statutory Charges
            </span>
            <span className="text-xs text-slate-500 font-mono">Indian Derivatives</span>
          </div>

          <div className="space-y-2 text-xs font-mono">
            <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
              <span className="text-slate-400">Gross Simulation P&L</span>
              <span className={`font-bold tabular-nums ${totalGrossPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                ₹{totalGrossPnl.toLocaleString('en-IN')}
              </span>
            </div>

            <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
              <span className="text-slate-400">Total Statutory (Brokerage + STT + GST)</span>
              <span className="text-rose-400 tabular-nums">
                -₹{totalBrokerageTaxes.toLocaleString('en-IN')}
              </span>
            </div>

            <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
              <span className="text-slate-400">Simulated Slippage Friction</span>
              <span className="text-rose-400 tabular-nums">
                -₹{totalSlippageCost.toLocaleString('en-IN')}
              </span>
            </div>

            <div className="flex items-center justify-between pt-1 text-sm">
              <span className="text-white font-semibold font-sans">Net Realized P&L</span>
              <span className={`font-bold tabular-nums ${isNetProfit ? 'text-emerald-400' : 'text-rose-400'}`}>
                {isNetProfit ? '+' : ''}₹{totalNetPnl.toLocaleString('en-IN')}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Monthly Return Heatmap Matrix */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <span className="text-xs font-semibold text-slate-300">
            Monthly Return Matrix (Heatmap)
          </span>
          <span className="text-xs text-slate-500 font-mono">Calendar Breakdown</span>
        </div>

        <div className="overflow-x-auto">
          <div className="flex items-center gap-2 py-1">
            {Object.keys(monthlyPerformance).map((mKey) => {
              const pnl = monthlyPerformance[mKey];
              const isProfit = pnl >= 0;
              return (
                <div
                  key={mKey}
                  className={`flex-1 min-w-[90px] p-2.5 rounded-lg border text-center font-mono ${
                    isProfit
                      ? 'bg-emerald-950/30 border-emerald-800/50 text-emerald-400'
                      : 'bg-rose-950/30 border-rose-800/50 text-rose-400'
                  }`}
                >
                  <div className="text-xs text-slate-400 font-sans">{mKey}</div>
                  <div className="text-xs font-bold mt-1 tabular-nums">
                    {isProfit ? '+' : ''}₹{pnl.toLocaleString('en-IN')}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Trade Log Table */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div>
            <h3 className="text-sm font-bold text-white">Execution Trade Log</h3>
            <span className="text-xs text-slate-400">
              Showing {filteredTrades.length} of {tradeLog.length} recorded trades
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
              <input
                type="text"
                placeholder="Search date or leg..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs font-mono bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-slate-700 w-44"
              />
            </div>

            {/* Exit Reason Filter */}
            <select
              value={reasonFilter}
              onChange={(e) => setReasonFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 text-xs text-slate-300 rounded-lg px-2.5 py-1.5 focus:outline-none"
            >
              <option value="ALL">All Exits</option>
              <option value="LOCK_TRAIL_SL">Locked & Trailed SL</option>
              <option value="TRAIL_SL">Trailing SL Hit</option>
              <option value="STOP_LOSS">Stop Loss Hit</option>
              <option value="TARGET_PROFIT">Target Hit</option>
              <option value="OVERALL_LOCK_TRAIL">Strategy Locked Profit</option>
              <option value="SQUARE_OFF">Square Off (Time)</option>
            </select>
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-sans">
                <th className="py-2 px-3">Date</th>
                <th className="py-2 px-3">Leg</th>
                <th className="py-2 px-3">Action</th>
                <th className="py-2 px-3">Qty</th>
                <th className="py-2 px-3">Entry Time/Price</th>
                <th className="py-2 px-3">Exit Time/Price</th>
                <th className="py-2 px-3 text-right">Net P&L (₹)</th>
                <th className="py-2 px-3 text-right">Return %</th>
                <th className="py-2 px-3 text-right">Exit Trigger</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-850">
              {filteredTrades.slice(0, 50).map((trade) => {
                const isWin = trade.netPnl >= 0;
                return (
                  <tr key={trade.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-2 px-3 text-slate-300">{trade.date}</td>
                    <td className="py-2 px-3 font-semibold text-slate-200">
                      {trade.instrument} {trade.strike}
                    </td>
                    <td className="py-2 px-3">
                      <span
                        className={`text-xs font-bold ${
                          trade.action === 'BUY' ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {trade.action}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-slate-400">{trade.quantity}</td>
                    <td className="py-2 px-3 text-slate-300">
                      {trade.entryTime} @ ₹{trade.entryPrice}
                    </td>
                    <td className="py-2 px-3 text-slate-300">
                      {trade.exitTime} @ ₹{trade.exitPrice}
                    </td>
                    <td
                      className={`py-2 px-3 text-right font-bold tabular-nums ${
                        isWin ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {isWin ? '+' : ''}₹{trade.netPnl.toLocaleString('en-IN')}
                    </td>
                    <td
                      className={`py-2 px-3 text-right font-bold tabular-nums ${
                        trade.pnlPct >= 0 ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {trade.pnlPct}%
                    </td>
                    <td className="py-2 px-3 text-right">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium ${
                          trade.exitReason === 'LOCK_TRAIL_SL'
                            ? 'bg-amber-950/80 text-amber-300 border border-amber-700/60'
                            : trade.exitReason === 'TRAIL_SL'
                            ? 'bg-yellow-950/80 text-yellow-300 border border-yellow-700/60'
                            : trade.exitReason === 'OVERALL_LOCK_TRAIL'
                            ? 'bg-amber-950/90 text-amber-200 border border-amber-600/70'
                            : trade.exitReason === 'TARGET_PROFIT' || trade.exitReason === 'OVERALL_TARGET'
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/40'
                            : trade.exitReason === 'STOP_LOSS' || trade.exitReason === 'OVERALL_SL'
                            ? 'bg-rose-950 text-rose-400 border border-rose-800/40'
                            : 'bg-slate-800 text-slate-400 border border-slate-700'
                        }`}
                      >
                        {trade.exitReason === 'LOCK_TRAIL_SL' && '🔒 Locked Trail'}
                        {trade.exitReason === 'TRAIL_SL' && '⚡ Trailing SL'}
                        {trade.exitReason === 'OVERALL_LOCK_TRAIL' && '🔒 Strat Lock'}
                        {trade.exitReason === 'TARGET_PROFIT' && '🎯 Target'}
                        {trade.exitReason === 'OVERALL_TARGET' && '🎯 Strat Target'}
                        {trade.exitReason === 'STOP_LOSS' && '🛑 Stop Loss'}
                        {trade.exitReason === 'OVERALL_SL' && '🛑 Strat SL'}
                        {trade.exitReason === 'SQUARE_OFF' && '⏰ Time Exit'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filteredTrades.length > 50 && (
            <div className="text-center text-xs text-slate-500 py-3 border-t border-slate-800">
              Showing first 50 rows. Click "Export CSV" to view all {filteredTrades.length} trades.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
