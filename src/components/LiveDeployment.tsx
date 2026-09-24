import React, { useState, useEffect } from 'react';
import {
  Flame,
  Radio,
  Plus,
  Play,
  Pause,
  Square,
  AlertTriangle,
  RotateCcw,
  Trash2,
  CheckCircle2,
  Zap,
  Briefcase,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  ShieldAlert,
  Server,
  Filter,
  Check,
  X,
  ExternalLink,
  Sliders,
} from 'lucide-react';
import {
  LiveDeploymentConfig,
  LiveDeploymentLeg,
  LiveOrderRecord,
  getLiveDeployments,
  saveLiveDeployment,
  deleteLiveDeployment,
  updateLiveDeploymentStatus,
  getLiveOrders,
  addLiveOrder,
  clearLiveOrders,
  getBrokerConnections,
  BrokerConnection,
  ExecutionSettings,
  getExecutionSettings,
} from '../services/brokerStorage';
import { ExecutionSettingsModal } from './ExecutionSettingsModal';
import { getSavedStrategies, getPortfolios } from '../services/strategyStorage';
import { Strategy, Portfolio } from '../types/trading';

interface LiveDeploymentProps {
  onNavigateToBrokers?: () => void;
  onNavigateToBuilder?: (strategy: Strategy) => void;
}

export const LiveDeployment: React.FC<LiveDeploymentProps> = ({
  onNavigateToBrokers,
  onNavigateToBuilder,
}) => {
  const [deployments, setDeployments] = useState<LiveDeploymentConfig[]>([]);
  const [orders, setOrders] = useState<LiveOrderRecord[]>([]);
  const [brokers, setBrokers] = useState<BrokerConnection[]>([]);
  const [savedStrategies, setSavedStrategies] = useState<Strategy[]>([]);
  const [savedPortfolios, setSavedPortfolios] = useState<Portfolio[]>([]);

  // Modals & UI State
  const [isDeployModalOpen, setIsDeployModalOpen] = useState<boolean>(false);
  const [isEmergencyModalOpen, setIsEmergencyModalOpen] = useState<boolean>(false);
  const [isExecutionSettingsOpen, setIsExecutionSettingsOpen] = useState<boolean>(false);
  const [executionSettings, setExecutionSettings] = useState<ExecutionSettings>(getExecutionSettings());
  const [selectedTab, setSelectedTab] = useState<'DEPLOYMENTS' | 'ORDER_BOOK'>('DEPLOYMENTS');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Deploy modal form state
  const [deployTargetType, setDeployTargetType] = useState<'STRATEGY' | 'PORTFOLIO'>('STRATEGY');
  const [selectedTargetId, setSelectedTargetId] = useState<string>('');
  const [selectedBrokerId, setSelectedBrokerId] = useState<string>('');
  const [multiplier, setMultiplier] = useState<number>(1);
  const [capitalAllocated, setCapitalAllocated] = useState<number>(300000);
  const [orderType, setOrderType] = useState<'LIMIT_BUFFER' | 'MARKET'>('LIMIT_BUFFER');
  const [limitBufferPts, setLimitBufferPts] = useState<number>(0.5);
  const [maxLoss, setMaxLoss] = useState<number>(5000);
  const [maxProfit, setMaxProfit] = useState<number>(12000);
  const [maxLossEnabled, setMaxLossEnabled] = useState<boolean>(true);
  const [maxProfitEnabled, setMaxProfitEnabled] = useState<boolean>(true);

  const refreshData = () => {
    setDeployments(getLiveDeployments());
    setOrders(getLiveOrders());
    const brokerList = getBrokerConnections();
    setBrokers(brokerList);
    const strats = getSavedStrategies();
    setSavedStrategies(strats);
    const ports = getPortfolios();
    setSavedPortfolios(ports);

    if (strats.length > 0 && !selectedTargetId) {
      setSelectedTargetId(strats[0].id);
    }
    const active = brokerList.find((b) => b.isConnected);
    if (active && !selectedBrokerId) {
      setSelectedBrokerId(active.id);
    } else if (brokerList.length > 0 && !selectedBrokerId) {
      setSelectedBrokerId(brokerList[0].id);
    }
  };

  useEffect(() => {
    refreshData();
  }, []);

  // Live price tick simulator
  useEffect(() => {
    const interval = setInterval(() => {
      setDeployments((prev) => {
        let hasChanges = false;
        const updated = prev.map((dep) => {
          if (dep.status !== 'ACTIVE') return dep;

          // Slightly wiggle open leg prices
          let depPnlDelta = 0;
          const updatedLegs = dep.legs.map((leg) => {
            if (leg.status !== 'OPEN') return leg;

            const wiggle = (Math.random() - 0.49) * 0.8;
            const newPrice = Math.max(0.5, Math.round((leg.currentPrice + wiggle) * 10) / 10);
            const lotSize = dep.underlying === 'BANKNIFTY' ? 15 : 50;
            const legPnl =
              leg.action === 'SELL'
                ? (leg.entryPrice - newPrice) * leg.lots * lotSize
                : (newPrice - leg.entryPrice) * leg.lots * lotSize;

            depPnlDelta += Math.round(legPnl);
            return {
              ...leg,
              currentPrice: newPrice,
              pnl: Math.round(legPnl),
            };
          });

          hasChanges = true;
          const openPnl = updatedLegs
            .filter((l) => l.status === 'OPEN')
            .reduce((acc, l) => acc + l.pnl, 0);
          const newCurrentPnl = (dep.realizedPnl || 0) + openPnl;
          return {
            ...dep,
            legs: updatedLegs,
            currentPnl: newCurrentPnl,
            unrealizedPnl: openPnl,
            peakPnl: Math.max(dep.peakPnl, newCurrentPnl),
          };
        });

        return hasChanges ? updated : prev;
      });
    }, 2500);

    return () => clearInterval(interval);
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Open deploy modal
  const handleOpenDeployModal = () => {
    const activeBroker = brokers.find((b) => b.isConnected);
    if (activeBroker) {
      setSelectedBrokerId(activeBroker.id);
    }
    if (deployTargetType === 'STRATEGY' && savedStrategies.length > 0) {
      setSelectedTargetId(savedStrategies[0].id);
    } else if (deployTargetType === 'PORTFOLIO' && savedPortfolios.length > 0) {
      setSelectedTargetId(savedPortfolios[0].id);
    }
    setIsDeployModalOpen(true);
  };

  // Execute Live Deployment
  const handleConfirmDeployment = () => {
    const broker = brokers.find((b) => b.id === selectedBrokerId);
    if (!broker || !broker.isConnected) {
      showToast('Selected broker is not connected! Please connect broker in Broker Bridge.');
      return;
    }

    let targetName = '';
    let underlying = 'NIFTY';
    let generatedLegs: LiveDeploymentLeg[] = [];

    if (deployTargetType === 'STRATEGY') {
      const strat = savedStrategies.find((s) => s.id === selectedTargetId);
      if (!strat) return;
      targetName = strat.name;
      underlying = strat.underlying;
      const baseSpot = underlying === 'BANKNIFTY' ? 48200 : 22400;

      generatedLegs = strat.legs.map((l, i) => {
        const estPrice = l.strikeOffset === 'ATM' ? 110 : 75;
        return {
          id: `live_leg_${Date.now()}_${i}`,
          instrument: l.instrument,
          action: l.action,
          strike: baseSpot,
          lots: l.lots * multiplier,
          entryPrice: estPrice,
          currentPrice: estPrice,
          pnl: 0,
          status: 'OPEN',
        };
      });
    } else {
      const port = savedPortfolios.find((p) => p.id === selectedTargetId);
      if (!port) return;
      targetName = port.name;
      underlying = 'NIFTY';

      // Build legs for all strategies in portfolio
      port.strategies.forEach((sc, sIdx) => {
        if (!sc.enabled) return;
        const st = savedStrategies.find((s) => s.id === sc.strategyId);
        const stratMult = (sc.lotsMultiplier || 1) * multiplier;
        if (st) {
          st.legs.forEach((l, lIdx) => {
            generatedLegs.push({
              id: `live_port_${Date.now()}_${sIdx}_${lIdx}`,
              instrument: l.instrument,
              action: l.action,
              strike: 22400,
              lots: l.lots * stratMult,
              entryPrice: 105,
              currentPrice: 105,
              pnl: 0,
              status: 'OPEN',
            });
          });
        }
      });
    }

    // Apply Algotest Leg Execution Sequencing (Buy legs first for margin benefit)
    if (executionSettings.legSequence === 'BUY_FIRST') {
      generatedLegs.sort((a, b) => {
        if (a.action === 'BUY' && b.action === 'SELL') return -1;
        if (a.action === 'SELL' && b.action === 'BUY') return 1;
        return 0;
      });
    }

    const newDep: LiveDeploymentConfig = {
      id: `live_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      deploymentType: deployTargetType,
      targetId: selectedTargetId,
      name: `${targetName} (Live)`,
      underlying,
      brokerId: broker.id,
      brokerName: broker.name,
      status: 'ACTIVE',
      deployedAt: new Date().toISOString(),
      capitalAllocated,
      multiplier,
      orderType,
      limitBufferPts: executionSettings.limitBufferValue,
      currentPnl: 0,
      realizedPnl: 0,
      unrealizedPnl: 0,
      maxDrawdown: 0,
      peakPnl: 0,
      legs: generatedLegs,
      overallRisk: {
        maxLossEnabled,
        maxLoss,
        maxProfitEnabled,
        maxProfit,
      },
    };

    saveLiveDeployment(newDep);

    // Place initial live orders into order book with execution settings context
    generatedLegs.forEach((leg, idx) => {
      const seqNote =
        executionSettings.legSequence === 'BUY_FIRST' && leg.action === 'BUY'
          ? ' [Buy-First Margin Benefit]'
          : '';
      const bufferNote =
        orderType === 'LIMIT_BUFFER'
          ? ` [Limit Buffer: ${executionSettings.limitBufferValue} pts]`
          : '';

      const orderRecord: LiveOrderRecord = {
        orderId: `ORD_${Date.now().toString().slice(-6)}_${idx + 1}`,
        deploymentId: newDep.id,
        deploymentName: newDep.name,
        brokerId: broker.id,
        timestamp: new Date().toLocaleTimeString(),
        symbol: `${underlying}24SEP${leg.strike}${leg.instrument}`,
        action: leg.action,
        lots: leg.lots,
        quantity: leg.lots * (underlying === 'BANKNIFTY' ? 15 : 50),
        price: leg.entryPrice,
        status: 'COMPLETE',
        message: `Order executed on NSE via ${broker.name} gateway${seqNote}${bufferNote}.`,
      };
      addLiveOrder(orderRecord);
    });

    refreshData();
    setIsDeployModalOpen(false);
    showToast(`Live Deployment "${newDep.name}" placed successfully to ${broker.name}!`);
  };

  // Pause / Resume Deployment
  const handleTogglePause = (dep: LiveDeploymentConfig) => {
    const nextStatus = dep.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';
    updateLiveDeploymentStatus(dep.id, nextStatus);
    refreshData();
    showToast(
      nextStatus === 'PAUSED'
        ? `Live deployment "${dep.name}" paused.`
        : `Live deployment "${dep.name}" resumed.`
    );
  };

  // Square off single deployment
  const handleSquareOffDeployment = (dep: LiveDeploymentConfig) => {
    const updatedLegs = dep.legs.map((leg) => ({
      ...leg,
      status: 'CLOSED' as const,
      exitReason: 'MANUAL_SQUARE_OFF',
    }));

    const updatedDep: LiveDeploymentConfig = {
      ...dep,
      status: 'SQUARED_OFF',
      realizedPnl: dep.currentPnl,
      unrealizedPnl: 0,
      legs: updatedLegs,
    };

    saveLiveDeployment(updatedDep);

    // Add exit order records
    dep.legs.forEach((leg, idx) => {
      if (leg.status === 'OPEN') {
        const exitAction = leg.action === 'BUY' ? 'SELL' : 'BUY';
        addLiveOrder({
          orderId: `ORD_SQ_${Date.now().toString().slice(-6)}_${idx}`,
          deploymentId: dep.id,
          deploymentName: dep.name,
          brokerId: dep.brokerId,
          timestamp: new Date().toLocaleTimeString(),
          symbol: `${dep.underlying}24SEP${leg.strike}${leg.instrument}`,
          action: exitAction,
          lots: leg.lots,
          quantity: leg.lots * (dep.underlying === 'BANKNIFTY' ? 15 : 50),
          price: leg.currentPrice,
          status: 'COMPLETE',
          message: `Square-off market order executed.`,
        });
      }
    });

    refreshData();
    showToast(`Squared off all legs for "${dep.name}". Realized P&L: ₹${dep.currentPnl}`);
  };

  // Square off an individual leg in a deployment
  const handleSquareOffLeg = (dep: LiveDeploymentConfig, legId: string) => {
    const targetLeg = dep.legs.find((l) => l.id === legId);
    if (!targetLeg || targetLeg.status !== 'OPEN') return;

    const lotSize = dep.underlying === 'BANKNIFTY' ? 15 : 50;
    const exitAction = targetLeg.action === 'BUY' ? 'SELL' : 'BUY';

    const updatedLegs = dep.legs.map((leg) => {
      if (leg.id === legId) {
        return {
          ...leg,
          status: 'CLOSED' as const,
          exitReason: 'MANUAL_LEG_SQUARE_OFF',
        };
      }
      return leg;
    });

    const openLegsRemaining = updatedLegs.filter((l) => l.status === 'OPEN');
    const allLegsClosed = openLegsRemaining.length === 0;

    const newRealizedPnl = (dep.realizedPnl || 0) + targetLeg.pnl;
    const newUnrealizedPnl = openLegsRemaining.reduce((acc, l) => acc + l.pnl, 0);
    const newCurrentPnl = newRealizedPnl + newUnrealizedPnl;

    const updatedDep: LiveDeploymentConfig = {
      ...dep,
      status: allLegsClosed ? 'SQUARED_OFF' : dep.status,
      legs: updatedLegs,
      realizedPnl: newRealizedPnl,
      unrealizedPnl: newUnrealizedPnl,
      currentPnl: newCurrentPnl,
    };

    saveLiveDeployment(updatedDep);

    // Place exit market order for this specific leg
    const orderRecord: LiveOrderRecord = {
      orderId: `ORD_SQ_LEG_${Date.now().toString().slice(-6)}`,
      deploymentId: dep.id,
      deploymentName: dep.name,
      brokerId: dep.brokerId,
      timestamp: new Date().toLocaleTimeString(),
      symbol: `${dep.underlying}24SEP${targetLeg.strike}${targetLeg.instrument}`,
      action: exitAction,
      lots: targetLeg.lots,
      quantity: targetLeg.lots * lotSize,
      price: targetLeg.currentPrice,
      status: 'COMPLETE',
      message: `Leg square-off order executed for ${targetLeg.action} ${targetLeg.strike} ${targetLeg.instrument} at ₹${targetLeg.currentPrice.toFixed(2)}.`,
    };
    addLiveOrder(orderRecord);

    refreshData();
    showToast(
      `Squared off ${targetLeg.action} ${targetLeg.strike} ${targetLeg.instrument} leg. Realized P&L: ₹${targetLeg.pnl.toLocaleString('en-IN')}`
    );
  };

  // Delete deployment
  const handleDelete = (id: string) => {
    deleteLiveDeployment(id);
    refreshData();
    showToast('Deployment removed.');
  };

  // Emergency square-off all deployments
  const handleEmergencySquareOffAll = () => {
    deployments.forEach((dep) => {
      if (dep.status === 'ACTIVE' || dep.status === 'PAUSED') {
        handleSquareOffDeployment(dep);
      }
    });
    setIsEmergencyModalOpen(false);
    showToast('EMERGENCY ACTION: All live positions squared off across all brokers!');
  };

  // Summary figures
  const activeDeployments = deployments.filter((d) => d.status === 'ACTIVE');
  const totalPnl = deployments.reduce((acc, d) => acc + d.currentPnl, 0);
  const totalRealized = deployments.reduce((acc, d) => acc + d.realizedPnl, 0);
  const totalUnrealized = deployments.reduce((acc, d) => acc + d.unrealizedPnl, 0);
  const totalOpenLegs = deployments.reduce(
    (acc, d) => acc + d.legs.filter((l) => l.status === 'OPEN').length,
    0
  );

  const activeConnectedBroker = brokers.find((b) => b.isConnected);

  return (
    <div className="space-y-6 pb-12">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 border border-emerald-500/60 text-white text-xs px-4 py-2.5 rounded-lg shadow-xl flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/80 border border-slate-800 rounded-xl p-4 lg:p-5">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Flame className="w-5 h-5 text-rose-500 animate-pulse" />
              <span>Live Trading Deployments</span>
            </h2>
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-rose-950/60 text-rose-400 border border-rose-800/60 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
              REAL EXECUTION
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            Deploy saved single strategies or bundled multi-strategy portfolios directly to your connected stock broker. Monitor live MTM, manage open legs, and execute emergency square-offs.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Active Broker Badge */}
          {activeConnectedBroker ? (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-950 border border-emerald-800/60 rounded-lg text-xs font-mono">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-slate-300">{activeConnectedBroker.name}</span>
              <span className="text-emerald-400 font-bold">({activeConnectedBroker.latencyMs}ms)</span>
            </div>
          ) : (
            <button
              onClick={onNavigateToBrokers}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-950/60 border border-amber-800/60 text-amber-300 rounded-lg text-xs font-mono hover:bg-amber-900/60 cursor-pointer"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>No Broker Connected (Connect Now)</span>
            </button>
          )}

          {/* Execution Settings Button */}
          <button
            onClick={() => setIsExecutionSettingsOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors cursor-pointer"
            title="Configure order type, leg sequence, slicing and square-off rules"
          >
            <Sliders className="w-3.5 h-3.5 text-amber-400" />
            <span>Execution Settings</span>
          </button>

          {/* New Deployment Button */}
          <button
            onClick={handleOpenDeployModal}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-colors cursor-pointer shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Deploy Live Strategy / Portfolio</span>
          </button>

          {/* Emergency Square-off */}
          {totalOpenLegs > 0 && (
            <button
              onClick={() => setIsEmergencyModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 rounded-lg transition-colors cursor-pointer shadow-sm"
            >
              <ShieldAlert className="w-4 h-4" />
              <span>Square-Off All ({totalOpenLegs})</span>
            </button>
          )}
        </div>
      </div>

      {/* Live Performance Stats Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5 space-y-1">
          <span className="text-xs text-slate-400">Total Live MTM P&L</span>
          <div
            className={`text-xl font-bold font-mono tabular-nums ${
              totalPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {totalPnl >= 0 ? '+' : ''}₹{totalPnl.toLocaleString('en-IN')}
          </div>
          <div className="text-[11px] text-slate-500 font-mono">
            Across {deployments.length} deployments
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5 space-y-1">
          <span className="text-xs text-slate-400">Realized P&L</span>
          <div
            className={`text-lg font-bold font-mono tabular-nums ${
              totalRealized >= 0 ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {totalRealized >= 0 ? '+' : ''}₹{totalRealized.toLocaleString('en-IN')}
          </div>
          <div className="text-[11px] text-slate-500 font-mono">Closed trades</div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5 space-y-1">
          <span className="text-xs text-slate-400">Unrealized MTM</span>
          <div
            className={`text-lg font-bold font-mono tabular-nums ${
              totalUnrealized >= 0 ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {totalUnrealized >= 0 ? '+' : ''}₹{totalUnrealized.toLocaleString('en-IN')}
          </div>
          <div className="text-[11px] text-slate-500 font-mono">Active positions</div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5 space-y-1">
          <span className="text-xs text-slate-400">Active Live Positions</span>
          <div className="text-lg font-bold font-mono text-white tabular-nums">
            {totalOpenLegs} Open Legs
          </div>
          <div className="text-[11px] text-slate-500 font-mono">
            {activeDeployments.length} running algos
          </div>
        </div>
      </div>

      {/* Tabs Switcher: Deployments vs Order Book */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSelectedTab('DEPLOYMENTS')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
              selectedTab === 'DEPLOYMENTS'
                ? 'bg-slate-800 text-white shadow-xs'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Active Deployments ({deployments.length})
          </button>
          <button
            onClick={() => setSelectedTab('ORDER_BOOK')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
              selectedTab === 'ORDER_BOOK'
                ? 'bg-slate-800 text-white shadow-xs'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Live Order Book ({orders.length})
          </button>
        </div>

        {selectedTab === 'ORDER_BOOK' && orders.length > 0 && (
          <button
            onClick={() => {
              clearLiveOrders();
              setOrders([]);
            }}
            className="text-[11px] text-slate-400 hover:text-rose-400 transition-colors"
          >
            Clear Log
          </button>
        )}
      </div>

      {/* Deployments Tab Content */}
      {selectedTab === 'DEPLOYMENTS' && (
        <div className="space-y-4">
          {deployments.length === 0 ? (
            <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-12 text-center space-y-3">
              <Flame className="w-12 h-12 text-slate-600 mx-auto" />
              <h3 className="text-sm font-bold text-slate-300">No Live Deployments Running</h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Deploy your saved strategies or portfolios to initiate automated live order routing with your connected stock broker.
              </p>
              <button
                onClick={handleOpenDeployModal}
                className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg shadow-sm transition-colors cursor-pointer"
              >
                Deploy Strategy or Portfolio Live Now
              </button>
            </div>
          ) : (
            deployments.map((dep) => {
              const isProfit = dep.currentPnl >= 0;

              return (
                <div
                  key={dep.id}
                  className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 lg:p-5 space-y-4"
                >
                  {/* Deployment Card Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-bold text-white">{dep.name}</h3>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                          {dep.deploymentType}
                        </span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-emerald-400 border border-slate-700">
                          {dep.underlying}
                        </span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800/60">
                          Broker: {dep.brokerName}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-400 mt-1 font-mono">
                        <span>Multiplier: {dep.multiplier}x</span>
                        <span>·</span>
                        <span>Order Type: {dep.orderType}</span>
                        <span>·</span>
                        <span>
                          Deployed: {new Date(dep.deployedAt).toLocaleTimeString()}
                        </span>
                        {dep.overallRisk?.maxLossEnabled && (
                          <>
                            <span>·</span>
                            <span className="text-rose-400">
                              Max SL: ₹{dep.overallRisk.maxLoss}
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Live PnL & Status */}
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 block">Current MTM P&L</span>
                        <span
                          className={`text-lg font-bold font-mono tabular-nums ${
                            isProfit ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          {isProfit ? '+' : ''}₹{dep.currentPnl.toLocaleString('en-IN')}
                        </span>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1.5">
                        {dep.status !== 'SQUARED_OFF' && (
                          <>
                            <button
                              onClick={() => handleTogglePause(dep)}
                              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg cursor-pointer"
                              title={dep.status === 'ACTIVE' ? 'Pause Algos' : 'Resume Algos'}
                            >
                              {dep.status === 'ACTIVE' ? (
                                <Pause className="w-3.5 h-3.5 text-amber-400" />
                              ) : (
                                <Play className="w-3.5 h-3.5 text-emerald-400" />
                              )}
                            </button>

                            <button
                              onClick={() => handleSquareOffDeployment(dep)}
                              className="px-2.5 py-1.5 bg-rose-950/60 hover:bg-rose-900/60 text-rose-300 border border-rose-800/60 rounded-lg text-xs font-semibold cursor-pointer"
                            >
                              Square Off
                            </button>
                          </>
                        )}

                        <button
                          onClick={() => handleDelete(dep.id)}
                          className="p-2 bg-slate-800 hover:bg-rose-950/40 text-slate-400 hover:text-rose-400 rounded-lg cursor-pointer"
                          title="Remove Deployment"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Open Legs Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead>
                        <tr className="border-b border-slate-800/80 text-[11px] text-slate-400 uppercase font-semibold">
                          <th className="pb-2">Leg Instrument</th>
                          <th className="pb-2">Action</th>
                          <th className="pb-2">Strike</th>
                          <th className="pb-2">Lots</th>
                          <th className="pb-2">Entry Price</th>
                          <th className="pb-2">LTP (Live)</th>
                          <th className="pb-2">P&L (INR)</th>
                          <th className="pb-2 text-center">Status</th>
                          <th className="pb-2 text-right">Leg Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-850/60 font-mono">
                        {dep.legs.map((leg) => {
                          const legProfit = leg.pnl >= 0;

                          return (
                            <tr key={leg.id} className="hover:bg-slate-800/30">
                              <td className="py-2.5 text-slate-200 font-semibold">
                                <span
                                  className={`px-1.5 py-0.5 rounded text-[10px] mr-1.5 ${
                                    leg.instrument === 'CE'
                                      ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                                      : 'bg-indigo-950 text-indigo-400 border border-indigo-800'
                                  }`}
                                >
                                  {leg.instrument}
                                </span>
                                {dep.underlying} {leg.strike}
                              </td>
                              <td className="py-2.5">
                                <span
                                  className={`font-bold ${
                                    leg.action === 'BUY' ? 'text-sky-400' : 'text-rose-400'
                                  }`}
                                >
                                  {leg.action}
                                </span>
                              </td>
                              <td className="py-2.5 text-slate-300">{leg.strike}</td>
                              <td className="py-2.5 text-slate-300">{leg.lots} lots</td>
                              <td className="py-2.5 text-slate-300">₹{leg.entryPrice.toFixed(2)}</td>
                              <td className="py-2.5 text-white font-bold">
                                ₹{leg.currentPrice.toFixed(2)}
                              </td>
                              <td
                                className={`py-2.5 font-bold tabular-nums ${
                                  legProfit ? 'text-emerald-400' : 'text-rose-400'
                                }`}
                              >
                                {legProfit ? '+' : ''}₹{leg.pnl.toLocaleString('en-IN')}
                              </td>
                              <td className="py-2.5 text-center">
                                <span
                                  className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                                    leg.status === 'OPEN'
                                      ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                                      : 'bg-slate-800 text-slate-400'
                                  }`}
                                >
                                  {leg.status}
                                </span>
                              </td>
                              <td className="py-2.5 text-right">
                                {leg.status === 'OPEN' && dep.status !== 'SQUARED_OFF' ? (
                                  <button
                                    onClick={() => handleSquareOffLeg(dep, leg.id)}
                                    className="px-2.5 py-1 text-[11px] font-bold text-rose-300 hover:text-white bg-rose-950/70 hover:bg-rose-900 border border-rose-800/80 rounded transition-colors cursor-pointer"
                                    title={`Square off ${leg.instrument} ${leg.strike} leg immediately`}
                                  >
                                    Square Off
                                  </button>
                                ) : (
                                  <span className="text-[11px] text-slate-500 font-mono">
                                    {leg.exitReason === 'MANUAL_LEG_SQUARE_OFF'
                                      ? 'Leg Squared Off'
                                      : 'Closed'}
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Order Book Tab Content */}
      {selectedTab === 'ORDER_BOOK' && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Live Exchange Order Routing Log
            </h3>
            <span className="text-xs text-slate-500 font-mono">
              Direct connection with Broker FIX/REST API
            </span>
          </div>

          {orders.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500">
              No orders placed in current live session yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left font-mono">
                <thead>
                  <tr className="border-b border-slate-800 text-[11px] text-slate-400 uppercase">
                    <th className="pb-2">Time</th>
                    <th className="pb-2">Order ID</th>
                    <th className="pb-2">Symbol</th>
                    <th className="pb-2">Action</th>
                    <th className="pb-2">Quantity</th>
                    <th className="pb-2">Price</th>
                    <th className="pb-2">Status</th>
                    <th className="pb-2">Broker Gateway</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-850">
                  {orders.map((ord) => (
                    <tr key={ord.orderId} className="hover:bg-slate-800/30">
                      <td className="py-2.5 text-slate-400">{ord.timestamp}</td>
                      <td className="py-2.5 text-slate-200 font-bold">{ord.orderId}</td>
                      <td className="py-2.5 text-white">{ord.symbol}</td>
                      <td className="py-2.5">
                        <span
                          className={`font-bold ${
                            ord.action === 'BUY' ? 'text-sky-400' : 'text-rose-400'
                          }`}
                        >
                          {ord.action}
                        </span>
                      </td>
                      <td className="py-2.5 text-slate-300">
                        {ord.quantity} ({ord.lots} lots)
                      </td>
                      <td className="py-2.5 text-slate-200">₹{ord.price.toFixed(2)}</td>
                      <td className="py-2.5">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            ord.status === 'COMPLETE'
                              ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                              : 'bg-amber-950 text-amber-400 border border-amber-800'
                          }`}
                        >
                          {ord.status}
                        </span>
                      </td>
                      <td className="py-2.5 text-slate-400">{ord.brokerId}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Deploy Strategy / Portfolio Modal */}
      {isDeployModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-lg w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Flame className="w-5 h-5 text-rose-500" />
                <h3 className="text-base font-bold text-white">
                  Deploy to Live Broker Execution
                </h3>
              </div>
              <button
                onClick={() => setIsDeployModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-md"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              {/* Target Selector Toggle */}
              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  Deployment Target
                </label>
                <div className="grid grid-cols-2 gap-2 p-1 bg-slate-950 rounded-lg border border-slate-800">
                  <button
                    type="button"
                    onClick={() => {
                      setDeployTargetType('STRATEGY');
                      if (savedStrategies.length > 0) setSelectedTargetId(savedStrategies[0].id);
                    }}
                    className={`py-1.5 font-semibold rounded-md transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
                      deployTargetType === 'STRATEGY'
                        ? 'bg-emerald-600 text-white'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>Saved Strategy ({savedStrategies.length})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDeployTargetType('PORTFOLIO');
                      if (savedPortfolios.length > 0) setSelectedTargetId(savedPortfolios[0].id);
                    }}
                    className={`py-1.5 font-semibold rounded-md transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
                      deployTargetType === 'PORTFOLIO'
                        ? 'bg-emerald-600 text-white'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Briefcase className="w-3.5 h-3.5" />
                    <span>Portfolio Batch ({savedPortfolios.length})</span>
                  </button>
                </div>
              </div>

              {/* Select Target Item */}
              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  Select {deployTargetType === 'STRATEGY' ? 'Saved Strategy' : 'Portfolio'}
                </label>
                {deployTargetType === 'STRATEGY' ? (
                  <select
                    value={selectedTargetId}
                    onChange={(e) => setSelectedTargetId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-medium focus:outline-none focus:border-emerald-500 cursor-pointer"
                  >
                    {savedStrategies.map((s) => (
                      <option key={s.id} value={s.id}>
                        [{s.underlying}] {s.name} ({s.legs.length} legs · {s.entryTime} to {s.exitTime})
                      </option>
                    ))}
                  </select>
                ) : (
                  <select
                    value={selectedTargetId}
                    onChange={(e) => setSelectedTargetId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-medium focus:outline-none focus:border-emerald-500 cursor-pointer"
                  >
                    {savedPortfolios.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.strategies.length} strategies bundled)
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Broker Selector */}
              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  Route Orders to Broker Account
                </label>
                <select
                  value={selectedBrokerId}
                  onChange={(e) => setSelectedBrokerId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-medium focus:outline-none focus:border-emerald-500 cursor-pointer font-mono"
                >
                  {brokers.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.clientId}) - {b.isConnected ? 'CONNECTED' : 'DISCONNECTED'}
                    </option>
                  ))}
                </select>
              </div>

              {/* Multiplier & Capital */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">
                    Lot Multiplier
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={multiplier}
                    onChange={(e) => setMultiplier(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">
                    Order Execution Type
                  </label>
                  <select
                    value={orderType}
                    onChange={(e) => setOrderType(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-emerald-500 cursor-pointer"
                  >
                    <option value="LIMIT_BUFFER">Limit with Buffer (+0.5 pts)</option>
                    <option value="MARKET">Direct Market Order</option>
                  </select>
                </div>
              </div>

              {/* Risk Guards */}
              <div className="p-3 bg-slate-950/80 rounded-lg border border-slate-850 space-y-2">
                <span className="font-semibold text-slate-300 block text-[11px] uppercase tracking-wider">
                  Live Portfolio Risk Guards
                </span>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="flex items-center gap-1.5 text-slate-400 mb-1">
                      <input
                        type="checkbox"
                        checked={maxLossEnabled}
                        onChange={(e) => setMaxLossEnabled(e.target.checked)}
                        className="rounded"
                      />
                      <span>Max Loss (SL ₹)</span>
                    </label>
                    <input
                      type="number"
                      disabled={!maxLossEnabled}
                      value={maxLoss}
                      onChange={(e) => setMaxLoss(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-white font-mono text-xs disabled:opacity-40"
                    />
                  </div>

                  <div>
                    <label className="flex items-center gap-1.5 text-slate-400 mb-1">
                      <input
                        type="checkbox"
                        checked={maxProfitEnabled}
                        onChange={(e) => setMaxProfitEnabled(e.target.checked)}
                        className="rounded"
                      />
                      <span>Max Target (₹)</span>
                    </label>
                    <input
                      type="number"
                      disabled={!maxProfitEnabled}
                      value={maxProfit}
                      onChange={(e) => setMaxProfit(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-white font-mono text-xs disabled:opacity-40"
                    />
                  </div>
                </div>
              </div>
              {/* Active Algotest Execution Settings Info Banner */}
              <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-amber-400 shrink-0" />
                  <div className="text-[11px] text-slate-300">
                    <span className="font-semibold text-amber-300">Execution Mode:</span>{' '}
                    {executionSettings.legSequence === 'BUY_FIRST' ? 'Buy First (Margin Benefit)' : 'Parallel'} · {executionSettings.orderType}
                    {executionSettings.autoSliceEnabled ? ' · Slicing ON' : ''}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsExecutionSettingsOpen(true)}
                  className="text-[11px] font-bold text-emerald-400 hover:text-emerald-300 underline cursor-pointer shrink-0"
                >
                  Configure
                </button>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setIsDeployModalOpen(false)}
                className="px-3.5 py-1.5 text-xs text-slate-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeployment}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 rounded-lg transition-colors cursor-pointer shadow-sm flex items-center gap-1.5"
              >
                <Flame className="w-3.5 h-3.5" />
                <span>Confirm Live Deployment</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Emergency Square-off Confirmation Modal */}
      {isEmergencyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="bg-slate-900 border border-rose-800 rounded-xl max-w-md w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center gap-2 text-rose-400">
              <ShieldAlert className="w-6 h-6" />
              <h3 className="text-base font-bold text-white">
                Confirm Emergency Square-Off
              </h3>
            </div>

            <p className="text-xs text-slate-300">
              This action will instantly send market square-off exit orders for <b>all {totalOpenLegs} open positions</b> across all active live deployments to the stock broker exchange gateway.
            </p>

            <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2.5">
              <button
                onClick={() => setIsEmergencyModalOpen(false)}
                className="px-3.5 py-1.5 text-xs text-slate-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleEmergencySquareOffAll}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 rounded-lg transition-colors cursor-pointer"
              >
                Yes, Square-Off All Positions Now
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Algotest Execution Settings Modal */}
      <ExecutionSettingsModal
        isOpen={isExecutionSettingsOpen}
        onClose={() => setIsExecutionSettingsOpen(false)}
        onSave={(updated) => {
          setExecutionSettings(updated);
          refreshData();
        }}
      />
    </div>
  );
};
