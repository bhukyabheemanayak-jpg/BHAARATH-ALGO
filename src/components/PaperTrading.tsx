import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Radio,
  AlertOctagon,
  TrendingUp,
  TrendingDown,
  ShieldAlert,
  Clock,
  CheckCircle2,
  Briefcase,
  Layers,
  Calendar,
  Filter,
  Zap,
} from 'lucide-react';
import {
  ActivePaperPosition,
  DayOfWeek,
  DTEOption,
  Portfolio,
  Strategy,
} from '../types/trading';
import {
  calculateOptionGreeks,
  resolveLegStrike,
  UNDERLYING_CONFIGS,
} from '../services/optionPricer';
import { getPortfolios, getSavedStrategies } from '../services/strategyStorage';

interface PaperTradingProps {
  strategy?: Strategy;
  initialPortfolio?: Portfolio | null;
}

interface OrderEvent {
  id: string;
  time: string;
  message: string;
  type: 'INFO' | 'SL_TRIGGER' | 'TARGET_TRIGGER' | 'SQUARE_OFF';
}

export const PaperTrading: React.FC<PaperTradingProps> = ({
  strategy: incomingStrategy,
  initialPortfolio = null,
}) => {
  const savedStrategies = getSavedStrategies();
  const savedPortfolios = getPortfolios();

  const defaultStrategy = incomingStrategy || savedStrategies[0];
  const [activeMode, setActiveMode] = useState<'STRATEGY' | 'PORTFOLIO'>(
    initialPortfolio ? 'PORTFOLIO' : 'STRATEGY'
  );

  const [selectedStrategy, setSelectedStrategy] = useState<Strategy>(defaultStrategy);
  const [selectedPortfolio, setSelectedPortfolio] = useState<Portfolio>(
    initialPortfolio || savedPortfolios[0]
  );

  // Simulation day and DTE for portfolio scheduling (Algotest feature)
  const [simulatedDay, setSimulatedDay] = useState<DayOfWeek>('WED');
  const [simulatedDte, setSimulatedDte] = useState<string>('0'); // 0 DTE expiry day by default
  const [positionStrategyFilter, setPositionStrategyFilter] = useState<string>('ALL');

  const activeUnderlying =
    activeMode === 'STRATEGY'
      ? selectedStrategy.underlying
      : (savedStrategies.find((s) => s.id === selectedPortfolio?.strategies[0]?.strategyId)?.underlying || 'NIFTY');

  const config = UNDERLYING_CONFIGS[activeUnderlying];

  // Simulation State
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [speedMultiplier, setSpeedMultiplier] = useState<number>(1);
  const [currentMinute, setCurrentMinute] = useState<number>(555); // 09:15 AM = 555
  const [simulatedSpot, setSimulatedSpot] = useState<number>(config.baseSpotPrice);
  const [activePositions, setActivePositions] = useState<ActivePaperPosition[]>([]);
  const [orderEvents, setOrderEvents] = useState<OrderEvent[]>([]);
  const [realizedPnl, setRealizedPnl] = useState<number>(0);
  const [deployedStrategyIds, setDeployedStrategyIds] = useState<string[]>([]);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Sync if props change
  useEffect(() => {
    if (incomingStrategy) {
      setSelectedStrategy(incomingStrategy);
    }
  }, [incomingStrategy]);

  useEffect(() => {
    if (initialPortfolio) {
      setSelectedPortfolio(initialPortfolio);
      setActiveMode('PORTFOLIO');
    }
  }, [initialPortfolio]);

  // Format minute to HH:mm
  const formatTime = (totalMinutes: number): string => {
    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  };

  // Convert "HH:mm" to total minutes
  const parseTimeToMinutes = (timeStr: string): number => {
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + m;
  };

  // Strategy match checker for portfolio honoring scheduleMode (Weekdays vs DTE)
  const isStrategyEligibleInPortfolio = (stratConfig: Portfolio['strategies'][0]) => {
    if (!stratConfig.enabled) return false;
    const mode = stratConfig.scheduleMode || 'WEEKDAYS';

    if (mode === 'WEEKDAYS') {
      // Governed strictly by active weekdays
      return stratConfig.weekdays.includes(simulatedDay);
    } else {
      // Governed strictly by DTE (Days to Expiry)
      if (stratConfig.dteOption === 'ANY' || simulatedDte === 'ALL') return true;
      if (stratConfig.dteOption === 'CUSTOM' && stratConfig.customDteRange) {
        const dteNum = parseInt(simulatedDte);
        return dteNum >= stratConfig.customDteRange.min && dteNum <= stratConfig.customDteRange.max;
      }
      return stratConfig.dteOption === simulatedDte;
    }
  };

  // Initialize or Reset
  const handleReset = () => {
    setIsRunning(false);
    setCurrentMinute(555); // 09:15
    setSimulatedSpot(config.baseSpotPrice);
    setActivePositions([]);
    setRealizedPnl(0);
    setDeployedStrategyIds([]);

    const sessionTitle =
      activeMode === 'STRATEGY'
        ? `Strategy "${selectedStrategy.name}" (${selectedStrategy.underlying})`
        : `Portfolio "${selectedPortfolio.name}" (${selectedPortfolio.strategies.length} strategies, Simulated on ${simulatedDay} @ ${simulatedDte} DTE)`;

    setOrderEvents([
      {
        id: `ev_${Date.now()}`,
        time: '09:15',
        message: `[READY] Paper Trading Session initialized for ${sessionTitle}. Click Start to advance the live simulator.`,
        type: 'INFO',
      },
    ]);
  };

  useEffect(() => {
    handleReset();
  }, [selectedStrategy, selectedPortfolio, activeMode, simulatedDay, simulatedDte]);

  // Helper to deploy a specific strategy's legs
  const deployStrategyLegs = (
    strat: Strategy,
    lotsMultiplier: number = 1,
    timeStr: string = formatTime(currentMinute)
  ) => {
    const stratConfig = UNDERLYING_CONFIGS[strat.underlying] || config;
    const deployed: ActivePaperPosition[] = strat.legs.map((leg, idx) => {
      const { strike, initialPrice } = resolveLegStrike(
        leg,
        simulatedSpot,
        stratConfig,
        0.005,
        0.14
      );

      let slPrice: number | null = null;
      if (leg.stopLossType === 'PERCENTAGE') {
        slPrice =
          leg.action === 'SELL'
            ? initialPrice * (1 + leg.stopLossValue / 100)
            : initialPrice * (1 - leg.stopLossValue / 100);
      } else if (leg.stopLossType === 'POINTS') {
        slPrice =
          leg.action === 'SELL'
            ? initialPrice + leg.stopLossValue
            : initialPrice - leg.stopLossValue;
      }

      let tgtPrice: number | null = null;
      if (leg.targetProfitType === 'PERCENTAGE') {
        tgtPrice =
          leg.action === 'SELL'
            ? initialPrice * (1 - leg.targetProfitValue / 100)
            : initialPrice * (1 + leg.targetProfitValue / 100);
      } else if (leg.targetProfitType === 'POINTS') {
        tgtPrice =
          leg.action === 'SELL'
            ? initialPrice - leg.targetProfitValue
            : initialPrice + leg.targetProfitValue;
      }

      const lots = leg.lots * lotsMultiplier;

      return {
        legId: activeMode === 'PORTFOLIO' ? `[${strat.name}] Leg ${idx + 1}` : `Leg ${idx + 1}`,
        originalLeg: leg,
        strategyId: strat.id,
        strategyName: strat.name,
        portfolioId: activeMode === 'PORTFOLIO' ? selectedPortfolio.id : undefined,
        portfolioName: activeMode === 'PORTFOLIO' ? selectedPortfolio.name : undefined,
        instrument: leg.instrument,
        action: leg.action,
        strike,
        lots,
        quantity: lots * stratConfig.lotSize,
        entryPrice: initialPrice,
        currentLtp: initialPrice,
        unrealizedPnl: 0,
        stopLossPrice: slPrice ? Math.round(slPrice * 10) / 10 : null,
        targetPrice: tgtPrice ? Math.round(tgtPrice * 10) / 10 : null,
        trailingSLPrice: null,
        highestProfitPts: 0,
        isLockActive: false,
        lockedProfitPts: 0,
        targetTrailedSteps: 0,
        reEntryCount: 0,
        slReEntryCount: 0,
        targetReEntryCount: 0,
        status: 'ACTIVE',
      };
    });

    setActivePositions((prev) => [...prev, ...deployed]);
    setDeployedStrategyIds((prev) => [...prev, strat.id]);

    setOrderEvents((prev) => [
      {
        id: `ev_entry_${Date.now()}_${strat.id}`,
        time: timeStr,
        message: `[ENTRY EXECUTED] Deployed "${strat.name}" (${deployed.length} legs, ${lotsMultiplier}x multiplier) at index spot ₹${simulatedSpot}.`,
        type: 'INFO',
      },
      ...prev,
    ]);
  };

  // Immediate Deployment of All Eligible Strategies
  const handleDeployAllNow = () => {
    if (activeMode === 'STRATEGY') {
      if (activePositions.length === 0) {
        deployStrategyLegs(selectedStrategy, 1);
      }
    } else {
      const eligible = selectedPortfolio.strategies.filter(isStrategyEligibleInPortfolio);
      eligible.forEach((sc) => {
        if (!deployedStrategyIds.includes(sc.strategyId)) {
          const strat = savedStrategies.find((s) => s.id === sc.strategyId);
          if (strat) {
            deployStrategyLegs(strat, sc.lotsMultiplier);
          }
        }
      });
    }
  };

  // Main Tick Loop
  useEffect(() => {
    if (!isRunning) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    const intervalMs = Math.max(100, Math.floor(1000 / speedMultiplier));

    timerRef.current = setInterval(() => {
      setCurrentMinute((prevMin) => {
        if (prevMin >= 930) {
          // 15:30 PM Market close
          setIsRunning(false);
          return 930;
        }

        const nextMin = prevMin + 1;
        const timeStr = formatTime(nextMin);

        // Simulated Spot Brownian Walk
        setSimulatedSpot((prevSpot) => {
          const delta = (Math.random() - 0.49) * 4;
          return Math.round((prevSpot + delta) * 10) / 10;
        });

        // 1. Check Entry Times
        if (activeMode === 'STRATEGY') {
          const entryMinutes = parseTimeToMinutes(selectedStrategy.entryTime);
          if (nextMin === entryMinutes && activePositions.length === 0) {
            deployStrategyLegs(selectedStrategy, 1, timeStr);
          }
        } else {
          // Portfolio Mode: check each eligible strategy's entry time
          const eligible = selectedPortfolio.strategies.filter(isStrategyEligibleInPortfolio);
          eligible.forEach((sc) => {
            const strat = savedStrategies.find((s) => s.id === sc.strategyId);
            if (strat && !deployedStrategyIds.includes(strat.id)) {
              const stratEntryMin = parseTimeToMinutes(strat.entryTime);
              if (nextMin === stratEntryMin) {
                deployStrategyLegs(strat, sc.lotsMultiplier, timeStr);
              }
            }
          });
        }

        // 2. Update active positions & check individual legs
        if (activePositions.length > 0) {
          const newlyReEntered: ActivePaperPosition[] = [];

          setActivePositions((prevPositions) => {
            const updated = prevPositions.map((pos) => {
              if (pos.status !== 'ACTIVE') return pos;

              const parentStrat =
                savedStrategies.find((s) => s.id === pos.strategyId) || selectedStrategy;
              const exitMinutes = parseTimeToMinutes(parentStrat.exitTime);
              const isExitTimeReached = nextMin >= exitMinutes;

              // Re-price option
              const greeks = calculateOptionGreeks(
                simulatedSpot,
                pos.strike,
                0.003,
                0.14,
                pos.instrument
              );
              const currentLtp = greeks.price;
              const sign = pos.action === 'BUY' ? 1 : -1;
              const unrealizedPnl = Math.round(sign * (currentLtp - pos.entryPrice) * pos.quantity);

              const currentProfitPts =
                pos.action === 'SELL'
                  ? pos.entryPrice - currentLtp
                  : currentLtp - pos.entryPrice;

              let updatedStopLoss = pos.stopLossPrice;
              let updatedTarget = pos.targetPrice;
              let isLockActive = pos.isLockActive ?? false;
              let lockedProfitPts = pos.lockedProfitPts ?? 0;
              let highestProfitPts = Math.max(pos.highestProfitPts ?? 0, currentProfitPts);
              let targetTrailedSteps = pos.targetTrailedSteps ?? 0;

              // Check Lock & Trail Profit
              if (pos.originalLeg?.lockAndTrail?.enabled) {
                const lockRule = pos.originalLeg.lockAndTrail;
                const triggerPts =
                  lockRule.triggerType === 'PERCENTAGE'
                    ? (pos.entryPrice * lockRule.triggerValue) / 100
                    : lockRule.triggerValue;
                const baseLockPts =
                  lockRule.lockType === 'PERCENTAGE'
                    ? (pos.entryPrice * lockRule.lockValue) / 100
                    : lockRule.lockValue;
                const stepPts =
                  lockRule.trailEveryType === 'PERCENTAGE'
                    ? (pos.entryPrice * lockRule.trailEveryValue) / 100
                    : lockRule.trailEveryValue;
                const trailPts =
                  lockRule.trailByType === 'PERCENTAGE'
                    ? (pos.entryPrice * lockRule.trailByValue) / 100
                    : lockRule.trailByValue;

                if (currentProfitPts >= triggerPts) {
                  isLockActive = true;
                  const excess = currentProfitPts - triggerPts;
                  const steps = stepPts > 0 ? Math.floor(excess / stepPts) : 0;
                  lockedProfitPts = Math.max(lockedProfitPts, baseLockPts + steps * trailPts);

                  if (pos.action === 'SELL') {
                    const lockSL = pos.entryPrice - lockedProfitPts;
                    updatedStopLoss =
                      updatedStopLoss !== null ? Math.min(updatedStopLoss, lockSL) : lockSL;
                  } else {
                    const lockSL = pos.entryPrice + lockedProfitPts;
                    updatedStopLoss =
                      updatedStopLoss !== null ? Math.max(updatedStopLoss, lockSL) : lockSL;
                  }
                }
              }

              // Check Trailing SL
              if (pos.originalLeg?.trailingSL?.enabled && updatedStopLoss !== null) {
                const trailRule = pos.originalLeg.trailingSL;
                const threshold =
                  trailRule.onProfitType === 'PERCENTAGE'
                    ? (pos.entryPrice * trailRule.onProfitValue) / 100
                    : trailRule.onProfitValue;
                const trailBy =
                  trailRule.trailByType === 'PERCENTAGE'
                    ? (pos.entryPrice * trailRule.trailByValue) / 100
                    : trailRule.trailByValue;

                if (currentProfitPts >= threshold) {
                  const steps = Math.floor((currentProfitPts - threshold) / threshold) + 1;
                  if (pos.action === 'SELL') {
                    const newSL = (pos.originalLeg?.stopLossValue || 0) - steps * trailBy;
                    const calculatedSL = pos.entryPrice + newSL;
                    updatedStopLoss = Math.min(updatedStopLoss, calculatedSL);
                  } else {
                    const newSL = (pos.originalLeg?.stopLossValue || 0) + steps * trailBy;
                    const calculatedSL = pos.entryPrice - newSL;
                    updatedStopLoss = Math.max(updatedStopLoss, calculatedSL);
                  }
                }
              }

              // Check Trailing Target
              if (pos.originalLeg?.trailingTarget?.enabled && updatedTarget !== null) {
                const trailTgtRule = pos.originalLeg.trailingTarget;
                const onProfitThreshold =
                  trailTgtRule.onProfitType === 'PERCENTAGE'
                    ? (pos.entryPrice * trailTgtRule.onProfitValue) / 100
                    : trailTgtRule.onProfitValue;
                const trailByAmt =
                  trailTgtRule.trailByType === 'PERCENTAGE'
                    ? (pos.entryPrice * trailTgtRule.trailByValue) / 100
                    : trailTgtRule.trailByValue;

                if (currentProfitPts >= onProfitThreshold) {
                  const currentSteps = Math.floor((currentProfitPts - onProfitThreshold) / onProfitThreshold) + 1;
                  if (currentSteps > targetTrailedSteps) {
                    targetTrailedSteps = currentSteps;
                    if (pos.action === 'SELL') {
                      updatedTarget = Math.max(0.05, updatedTarget - trailByAmt);
                    } else {
                      updatedTarget = updatedTarget + trailByAmt;
                    }
                  }
                }
              }

              // Check Triggers
              const hitSL =
                updatedStopLoss !== null &&
                (pos.action === 'SELL'
                  ? currentLtp >= updatedStopLoss
                  : currentLtp <= updatedStopLoss);

              const hitTgt =
                updatedTarget !== null &&
                (pos.action === 'SELL'
                  ? currentLtp <= updatedTarget
                  : currentLtp >= updatedTarget);

              if (hitSL) {
                setRealizedPnl((r) => r + unrealizedPnl);
                setOrderEvents((prev) => [
                  {
                    id: `ev_sl_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
                    time: timeStr,
                    message: `[STOP LOSS HIT] ${pos.legId} (${pos.action} ${pos.instrument} ${pos.strike}) squared off @ ₹${currentLtp} (P&L: ₹${unrealizedPnl})`,
                    type: 'SL_TRIGGER',
                  },
                  ...prev,
                ]);

                // Check Re-entry on SL
                const origLeg = pos.originalLeg;
                const reEntryRule = origLeg?.reEntry;
                if (
                  origLeg &&
                  reEntryRule &&
                  reEntryRule.type !== 'NONE' &&
                  !isExitTimeReached &&
                  (reEntryRule.triggerOn === 'SL' || reEntryRule.triggerOn === 'BOTH')
                ) {
                  const maxTotal = reEntryRule.maxCount ?? 1;
                  const maxSl = reEntryRule.slMaxCount ?? maxTotal;
                  const currentTotal = pos.reEntryCount ?? 0;
                  const currentSl = pos.slReEntryCount ?? 0;

                  if (currentTotal < maxTotal && currentSl < maxSl) {
                    const nextReEntryIdx = currentTotal + 1;
                    const nextSlCount = currentSl + 1;
                    const nextAction =
                      reEntryRule.type === 'ASAP_REVERSE' && nextReEntryIdx % 2 === 1
                        ? (origLeg.action === 'BUY' ? 'SELL' : 'BUY')
                        : origLeg.action;

                    const stratConfig = UNDERLYING_CONFIGS[parentStrat.underlying] || config;
                    const { strike: newStrike, initialPrice: newEntryPrice } = resolveLegStrike(
                      { ...origLeg, action: nextAction },
                      simulatedSpot,
                      stratConfig,
                      0.005,
                      0.14
                    );

                    let slPrice: number | null = null;
                    if (origLeg.stopLossType === 'PERCENTAGE') {
                      slPrice =
                        nextAction === 'SELL'
                          ? newEntryPrice * (1 + origLeg.stopLossValue / 100)
                          : newEntryPrice * (1 - origLeg.stopLossValue / 100);
                    }

                    newlyReEntered.push({
                      legId: `${pos.legId.split(' (R')[0]} (R#${nextReEntryIdx})`,
                      originalLeg: origLeg,
                      strategyId: pos.strategyId,
                      strategyName: pos.strategyName,
                      portfolioId: pos.portfolioId,
                      portfolioName: pos.portfolioName,
                      instrument: origLeg.instrument,
                      action: nextAction,
                      strike: newStrike,
                      lots: pos.lots,
                      quantity: pos.quantity,
                      entryPrice: newEntryPrice,
                      currentLtp: newEntryPrice,
                      unrealizedPnl: 0,
                      stopLossPrice: slPrice ? Math.round(slPrice * 10) / 10 : null,
                      targetPrice: null,
                      trailingSLPrice: null,
                      highestProfitPts: 0,
                      isLockActive: false,
                      lockedProfitPts: 0,
                      targetTrailedSteps: 0,
                      reEntryCount: nextReEntryIdx,
                      slReEntryCount: nextSlCount,
                      targetReEntryCount: pos.targetReEntryCount ?? 0,
                      status: 'ACTIVE' as const,
                    });
                  }
                }

                return {
                  ...pos,
                  currentLtp,
                  unrealizedPnl,
                  status: 'STOP_LOSS_HIT' as const,
                };
              }

              if (hitTgt) {
                setRealizedPnl((r) => r + unrealizedPnl);
                setOrderEvents((prev) => [
                  {
                    id: `ev_tgt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
                    time: timeStr,
                    message: `[TARGET HIT] ${pos.legId} (${pos.action} ${pos.instrument} ${pos.strike}) squared off @ ₹${currentLtp} (P&L: ₹${unrealizedPnl})`,
                    type: 'TARGET_TRIGGER',
                  },
                  ...prev,
                ]);

                return {
                  ...pos,
                  currentLtp,
                  unrealizedPnl,
                  status: 'TARGET_HIT' as const,
                };
              }

              if (isExitTimeReached) {
                setRealizedPnl((r) => r + unrealizedPnl);
                setOrderEvents((prev) => [
                  {
                    id: `ev_exit_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
                    time: timeStr,
                    message: `[TIME EXIT] ${pos.legId} squared off at strategy exit time @ ₹${currentLtp} (P&L: ₹${unrealizedPnl})`,
                    type: 'SQUARE_OFF',
                  },
                  ...prev,
                ]);
                return {
                  ...pos,
                  currentLtp,
                  unrealizedPnl,
                  status: 'SQUARED_OFF' as const,
                };
              }

              return {
                ...pos,
                currentLtp,
                unrealizedPnl,
                stopLossPrice: updatedStopLoss,
                targetPrice: updatedTarget,
                isLockActive,
                lockedProfitPts,
                highestProfitPts,
                targetTrailedSteps,
                status: pos.status,
              };
            });

            return [...updated, ...newlyReEntered];
          });
        }

        return nextMin;
      });
    }, intervalMs);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [
    isRunning,
    speedMultiplier,
    activeMode,
    selectedStrategy,
    selectedPortfolio,
    simulatedSpot,
    activePositions,
    deployedStrategyIds,
    simulatedDay,
    simulatedDte,
  ]);

  // Overall MTM Calculations
  const unrealizedMtm = activePositions
    .filter((p) => p.status === 'ACTIVE')
    .reduce((acc, p) => acc + p.unrealizedPnl, 0);
  const totalMtm = realizedPnl + unrealizedMtm;

  // Check Portfolio-level Risk Triggers
  useEffect(() => {
    if (activeMode === 'PORTFOLIO' && selectedPortfolio) {
      const { overallRisk } = selectedPortfolio;

      if (overallRisk.maxLossEnabled && totalMtm <= -overallRisk.maxLoss) {
        // Portfolio SL breached
        handleSquareOffAll();
        setOrderEvents((prev) => [
          {
            id: `ev_port_sl_${Date.now()}`,
            time: formatTime(currentMinute),
            message: `[PORTFOLIO STOP LOSS TRIGGERED] Total Portfolio MTM reached -₹${Math.abs(
              totalMtm
            ).toLocaleString('en-IN')}. Emergency squared off all strategies!`,
            type: 'SL_TRIGGER',
          },
          ...prev,
        ]);
      } else if (overallRisk.maxProfitEnabled && totalMtm >= overallRisk.maxProfit) {
        // Portfolio Target reached
        handleSquareOffAll();
        setOrderEvents((prev) => [
          {
            id: `ev_port_tgt_${Date.now()}`,
            time: formatTime(currentMinute),
            message: `[PORTFOLIO TARGET REACHED] Total Portfolio MTM hit target +₹${totalMtm.toLocaleString(
              'en-IN'
            )}. Locked gains and squared off all positions!`,
            type: 'TARGET_TRIGGER',
          },
          ...prev,
        ]);
      }
    }
  }, [totalMtm, activeMode, selectedPortfolio]);

  // Emergency Kill Switch
  const handleSquareOffAll = () => {
    setActivePositions((prev) =>
      prev.map((pos) => {
        if (pos.status === 'ACTIVE') {
          setRealizedPnl((r) => r + pos.unrealizedPnl);
          return { ...pos, status: 'SQUARED_OFF' };
        }
        return pos;
      })
    );
    setOrderEvents((prev) => [
      {
        id: `ev_kill_${Date.now()}`,
        time: formatTime(currentMinute),
        message: `[MANUAL SQUARE OFF] All active positions across all strategies squared off.`,
        type: 'SQUARE_OFF',
      },
      ...prev,
    ]);
  };

  // Close single leg
  const handleCloseLeg = (legId: string) => {
    setActivePositions((prev) =>
      prev.map((pos) => {
        if (pos.legId === legId && pos.status === 'ACTIVE') {
          setRealizedPnl((r) => r + pos.unrealizedPnl);
          return { ...pos, status: 'SQUARED_OFF' };
        }
        return pos;
      })
    );
  };

  // Strategy-wise Breakdown Calculation
  const strategyBreakdown: Record<
    string,
    { name: string; openLegs: number; realized: number; unrealized: number; total: number }
  > = {};

  activePositions.forEach((pos) => {
    const sId = pos.strategyId || 'DEFAULT';
    const sName = pos.strategyName || selectedStrategy.name;
    if (!strategyBreakdown[sId]) {
      strategyBreakdown[sId] = { name: sName, openLegs: 0, realized: 0, unrealized: 0, total: 0 };
    }
    if (pos.status === 'ACTIVE') {
      strategyBreakdown[sId].openLegs += 1;
      strategyBreakdown[sId].unrealized += pos.unrealizedPnl;
    } else {
      strategyBreakdown[sId].realized += pos.unrealizedPnl;
    }
    strategyBreakdown[sId].total = strategyBreakdown[sId].realized + strategyBreakdown[sId].unrealized;
  });

  const filteredPositions = activePositions.filter((pos) => {
    if (positionStrategyFilter === 'ALL') return true;
    return pos.strategyId === positionStrategyFilter;
  });

  const qualifyingStrategiesCount =
    activeMode === 'PORTFOLIO'
      ? selectedPortfolio.strategies.filter(isStrategyEligibleInPortfolio).length
      : 1;

  return (
    <div className="space-y-6 pb-16">
      {/* Mode Selector & Strategy/Portfolio Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/80 border border-slate-800 rounded-xl p-4 lg:p-5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <Radio
              className={`w-4 h-4 ${isRunning ? 'animate-pulse text-emerald-400' : 'text-slate-500'}`}
            />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base font-bold text-white">Live Paper Trading Simulator</h2>
              <span
                className={`text-xs px-2 py-0.5 rounded font-mono font-semibold ${
                  isRunning
                    ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/50'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                {isRunning ? 'SIMULATION RUNNING' : 'PAUSED'}
              </span>
            </div>
            <div className="text-xs text-slate-400 mt-0.5">
              Live automated execution with multi-strategy portfolio scheduling, DTE rules, and trailing profit.
            </div>
          </div>
        </div>

        {/* Mode Switcher */}
        <div className="flex items-center gap-2 bg-slate-950 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => {
              setActiveMode('STRATEGY');
              handleReset();
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
              activeMode === 'STRATEGY'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Single Strategy</span>
          </button>

          <button
            onClick={() => {
              setActiveMode('PORTFOLIO');
              handleReset();
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
              activeMode === 'PORTFOLIO'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Briefcase className="w-3.5 h-3.5" />
            <span>Portfolio Deployment</span>
          </button>
        </div>
      </div>

      {/* Deployment Configuration Bar */}
      <div className="bg-slate-900/60 border border-slate-800/90 rounded-xl p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {activeMode === 'STRATEGY' ? (
          /* Strategy Selection */
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-xs text-slate-400 font-medium">Active Strategy:</span>
            <select
              value={selectedStrategy.id}
              onChange={(e) => {
                const found = savedStrategies.find((s) => s.id === e.target.value);
                if (found) {
                  setSelectedStrategy(found);
                  handleReset();
                }
              }}
              className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500 cursor-pointer font-medium"
            >
              {savedStrategies.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.underlying})
                </option>
              ))}
            </select>

            <span className="text-xs font-mono text-slate-400">
              Entry: {selectedStrategy.entryTime} · Exit: {selectedStrategy.exitTime}
            </span>
          </div>
        ) : (
          /* Portfolio & DTE / Weekday Simulator Selection */
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 font-medium">Portfolio:</span>
              <select
                value={selectedPortfolio.id}
                onChange={(e) => {
                  const found = savedPortfolios.find((p) => p.id === e.target.value);
                  if (found) {
                    setSelectedPortfolio(found);
                    handleReset();
                  }
                }}
                className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500 cursor-pointer font-bold"
              >
                {savedPortfolios.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.strategies.length} strategies)
                  </option>
                ))}
              </select>
            </div>

            {/* Weekday Simulator */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-slate-400 font-medium">Simulated Day:</span>
              <div className="flex items-center p-0.5 bg-slate-950 rounded-lg border border-slate-800">
                {(['MON', 'TUE', 'WED', 'THU', 'FRI'] as DayOfWeek[]).map((d) => (
                  <button
                    key={d}
                    onClick={() => {
                      setSimulatedDay(d);
                      handleReset();
                    }}
                    className={`px-2 py-1 text-[11px] font-mono rounded cursor-pointer transition-colors ${
                      simulatedDay === d
                        ? 'bg-emerald-600 text-white font-bold'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>

            {/* DTE Simulator */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 font-medium">DTE:</span>
              <select
                value={simulatedDte}
                onChange={(e) => {
                  setSimulatedDte(e.target.value);
                  handleReset();
                }}
                className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-amber-300 font-mono focus:outline-none focus:border-emerald-500 cursor-pointer"
              >
                <option value="0">0 DTE (Expiry Day)</option>
                <option value="1">1 DTE</option>
                <option value="2">2 DTE</option>
                <option value="3">3 DTE</option>
                <option value="4">4+ DTE</option>
                <option value="ALL">All DTEs (Force Run All)</option>
              </select>
            </div>

            {/* Qualifying count badge */}
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-800 text-emerald-400 border border-slate-700">
              {qualifyingStrategiesCount} of {selectedPortfolio.strategies.length} Strategies Qualifying Today
            </span>
          </div>
        )}

        {/* Quick Instant Deploy Button */}
        <button
          onClick={handleDeployAllNow}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-600 rounded-lg transition-colors cursor-pointer shrink-0"
          title="Instantly deploy active legs right now without waiting for entry time"
        >
          <Zap className="w-3.5 h-3.5 text-amber-300" />
          <span>Execute Entry Now</span>
        </button>
      </div>

      {/* Live Simulation Controls Bar */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Clock & Spot Info */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 font-mono text-xs">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-white font-bold">{formatTime(currentMinute)}</span>
            <span className="text-slate-500">/ 15:30</span>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 font-mono text-xs">
            <span className="text-slate-400">{activeUnderlying} Spot:</span>
            <span className="text-emerald-400 font-bold tabular-nums">₹{simulatedSpot}</span>
          </div>

          {/* Speed Multiplier */}
          <div className="flex items-center bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs font-mono">
            {[1, 5, 20].map((s) => (
              <button
                key={s}
                onClick={() => setSpeedMultiplier(s)}
                className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${
                  speedMultiplier === s
                    ? 'bg-slate-800 text-emerald-400 font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {s}x
              </button>
            ))}
          </div>
        </div>

        {/* Simulator Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsRunning(!isRunning)}
            className={`flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer shadow-sm ${
              isRunning
                ? 'bg-amber-600 hover:bg-amber-500 text-white'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white'
            }`}
          >
            {isRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-current" />}
            <span>{isRunning ? 'Pause Simulation' : 'Start Simulation'}</span>
          </button>

          <button
            onClick={handleReset}
            className="p-2 text-slate-400 hover:text-white bg-slate-800 rounded-lg border border-slate-700 transition-colors cursor-pointer"
            title="Reset Simulation"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* MTM Banner & Risk Indicators */}
      <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {/* Total MTM */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 space-y-1 sm:col-span-2">
          <span className="text-xs text-slate-400">
            {activeMode === 'PORTFOLIO' ? 'Combined Portfolio MTM (Net P&L)' : 'Total Strategy MTM'}
          </span>
          <div
            className={`text-2xl font-bold font-mono tabular-nums ${
              totalMtm >= 0 ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {totalMtm >= 0 ? '+' : ''}₹{totalMtm.toLocaleString('en-IN')}
          </div>
          <div className="text-xs text-slate-500 font-mono flex items-center gap-3">
            <span>Realized: ₹{realizedPnl.toLocaleString('en-IN')}</span>
            <span>·</span>
            <span>Unrealized: ₹{unrealizedMtm.toLocaleString('en-IN')}</span>
          </div>
        </div>

        {/* Active Legs count */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 space-y-1">
          <span className="text-xs text-slate-400">Open Positions</span>
          <div className="text-2xl font-bold font-mono text-white tabular-nums">
            {activePositions.filter((p) => p.status === 'ACTIVE').length} / {activePositions.length || '--'}
          </div>
          <div className="text-xs text-slate-500">
            {activeMode === 'PORTFOLIO'
              ? `${deployedStrategyIds.length} strategies deployed`
              : `Entry scheduled: ${selectedStrategy.entryTime}`}
          </div>
        </div>

        {/* Emergency Kill Switch */}
        <div className="bg-slate-900/80 border border-rose-950/80 rounded-xl p-4 flex flex-col justify-between">
          <span className="text-xs text-rose-400 font-semibold flex items-center gap-1">
            <AlertOctagon className="w-3.5 h-3.5" />
            Emergency Kill Switch
          </span>
          <button
            onClick={handleSquareOffAll}
            disabled={activePositions.filter((p) => p.status === 'ACTIVE').length === 0}
            className="w-full mt-2 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 disabled:opacity-40 rounded-lg transition-colors cursor-pointer"
          >
            Square Off All Positions
          </button>
        </div>
      </div>

      {/* Portfolio Strategy Breakdown Widget (when in Portfolio mode) */}
      {activeMode === 'PORTFOLIO' && Object.keys(strategyBreakdown).length > 0 && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Briefcase className="w-3.5 h-3.5 text-emerald-400" />
              <span>Strategy-Wise P&L Breakdown</span>
            </span>
            <span className="text-xs text-slate-500 font-mono">Live Contribution</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {Object.entries(strategyBreakdown).map(([stratId, item]) => (
              <div
                key={stratId}
                className="bg-slate-950/60 border border-slate-800/80 rounded-lg p-3 space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white line-clamp-1">{item.name}</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-300">
                    {item.openLegs} Open
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-slate-400">Total P&L:</span>
                  <span
                    className={`font-bold tabular-nums ${
                      item.total >= 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {item.total >= 0 ? '+' : ''}₹{item.total.toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono">
                  <span>Realized: ₹{item.realized.toLocaleString('en-IN')}</span>
                  <span>Unrealized: ₹{item.unrealized.toLocaleString('en-IN')}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Active Positions Table */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-300">Live Positions Monitor</span>
            <span className="text-xs text-slate-500 font-mono">({activePositions.length} Total)</span>
          </div>

          {/* Strategy Filter Tabs */}
          {activeMode === 'PORTFOLIO' && Object.keys(strategyBreakdown).length > 1 && (
            <div className="flex items-center gap-1 overflow-x-auto text-xs">
              <button
                onClick={() => setPositionStrategyFilter('ALL')}
                className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                  positionStrategyFilter === 'ALL'
                    ? 'bg-emerald-600 text-white font-bold'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                All
              </button>
              {Object.entries(strategyBreakdown).map(([stratId, item]) => (
                <button
                  key={stratId}
                  onClick={() => setPositionStrategyFilter(stratId)}
                  className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer whitespace-nowrap ${
                    positionStrategyFilter === stratId
                      ? 'bg-emerald-600 text-white font-bold'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {item.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {filteredPositions.length === 0 ? (
          <div className="text-center py-8 text-xs text-slate-500 space-y-2">
            <p>No active positions open in this filter view.</p>
            <p className="text-[11px] text-slate-600">
              Click <span className="text-emerald-400 font-semibold">Start Simulation</span> or <span className="text-amber-300 font-semibold">Execute Entry Now</span> to deploy legs.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-sans">
                  <th className="py-2 px-3">Position</th>
                  <th className="py-2 px-3">Action</th>
                  <th className="py-2 px-3">Qty</th>
                  <th className="py-2 px-3">Entry Price</th>
                  <th className="py-2 px-3">Current LTP</th>
                  <th className="py-2 px-3">SL Level</th>
                  <th className="py-2 px-3">Target Level</th>
                  <th className="py-2 px-3 text-right">P&L (₹)</th>
                  <th className="py-2 px-3 text-right">Status</th>
                  <th className="py-2 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850">
                {filteredPositions.map((pos) => {
                  const isProfit = pos.unrealizedPnl >= 0;
                  return (
                    <tr key={pos.legId} className="hover:bg-slate-800/40">
                      <td className="py-2 px-3 font-semibold text-white">
                        <div className="flex items-center gap-1.5">
                          <span>{pos.legId}</span>
                          <span className="text-[10px] text-slate-400">
                            ({pos.instrument} {pos.strike})
                          </span>
                        </div>
                      </td>
                      <td className="py-2 px-3">
                        <span
                          className={`font-bold ${
                            pos.action === 'BUY' ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          {pos.action}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-slate-400">{pos.quantity}</td>
                      <td className="py-2 px-3 text-slate-300">₹{pos.entryPrice}</td>
                      <td className="py-2 px-3 font-bold text-white tabular-nums">
                        ₹{pos.currentLtp}
                      </td>
                      <td className="py-2 px-3 text-rose-400 tabular-nums">
                        {pos.stopLossPrice ? `₹${pos.stopLossPrice}` : '--'}
                      </td>
                      <td className="py-2 px-3 text-emerald-400 tabular-nums">
                        {pos.targetPrice ? `₹${pos.targetPrice}` : '--'}
                      </td>
                      <td
                        className={`py-2 px-3 text-right font-bold tabular-nums ${
                          isProfit ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {isProfit ? '+' : ''}₹{pos.unrealizedPnl.toLocaleString('en-IN')}
                      </td>
                      <td className="py-2 px-3 text-right">
                        <span
                          className={`px-2 py-0.5 rounded text-xs ${
                            pos.status === 'ACTIVE'
                              ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/40'
                              : 'bg-slate-800 text-slate-400 border border-slate-700'
                          }`}
                        >
                          {pos.status.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-right">
                        {pos.status === 'ACTIVE' && (
                          <button
                            onClick={() => handleCloseLeg(pos.legId)}
                            className="px-2 py-0.5 text-xs text-rose-400 hover:text-rose-300 bg-rose-950/40 border border-rose-900 rounded cursor-pointer"
                          >
                            Close
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Live Order Book / Event Log */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <span className="text-xs font-semibold text-slate-300">Live Execution Log</span>
          <span className="text-xs text-slate-500 font-mono">Timestamped Events</span>
        </div>

        <div className="max-h-48 overflow-y-auto space-y-1.5 font-mono text-xs pr-2">
          {orderEvents.map((ev) => (
            <div
              key={ev.id}
              className={`p-2 rounded border flex items-start gap-2 ${
                ev.type === 'SL_TRIGGER'
                  ? 'bg-rose-950/20 border-rose-900/50 text-rose-300'
                  : ev.type === 'TARGET_TRIGGER'
                  ? 'bg-emerald-950/20 border-emerald-900/50 text-emerald-300'
                  : 'bg-slate-950/40 border-slate-800 text-slate-300'
              }`}
            >
              <span className="text-slate-500 font-bold shrink-0">{ev.time}</span>
              <span className="flex-1">{ev.message}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
