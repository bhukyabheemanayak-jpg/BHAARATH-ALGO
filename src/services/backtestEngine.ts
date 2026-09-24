import {
  BacktestSummary,
  DailyResult,
  DayOfWeek,
  Portfolio,
  PortfolioBacktestSummary,
  PositionAction,
  Strategy,
  TradeRecord,
} from '../types/trading';
import { Candle, DayMarketData, getHistoricalMarketCalendar } from './marketData';
import { calculateOptionGreeks, resolveLegStrike, UNDERLYING_CONFIGS } from './optionPricer';

interface ActiveBacktestLeg {
  id: string;
  legIndex: number;
  originalLeg: Strategy['legs'][0];
  instrument: Strategy['legs'][0]['instrument'];
  action: PositionAction;
  strike: number;
  lots: number;
  quantity: number;
  entryTime: string;
  entryPrice: number;
  initialStopLoss: number | null;
  currentStopLoss: number | null;
  initialTarget: number | null;
  currentTarget: number | null;
  isTrailing: boolean;
  highestProfitObserved: number;
  isLockActive: boolean;
  lockedProfitPts: number;
  targetTrailedSteps: number;
  reEntryCount: number;
  slReEntryCount: number;
  targetReEntryCount: number;
  isClosed: boolean;
}

export function runBacktest(
  strategy: Strategy,
  historicalDays?: DayMarketData[]
): BacktestSummary {
  const days = historicalDays || getHistoricalMarketCalendar(strategy.underlying, 75);
  const config = UNDERLYING_CONFIGS[strategy.underlying];
  const { lotSize } = config;

  const tradeLog: TradeRecord[] = [];
  const dailyResults: DailyResult[] = [];
  let cumulativePnl = 0;
  let peakCumulativePnl = 0;
  let maxDrawdown = 0;
  let maxDrawdownPct = 0;

  const dayWisePerformance: Record<DayOfWeek, { trades: number; pnl: number; winRate: number; wins: number }> = {
    MON: { trades: 0, pnl: 0, winRate: 0, wins: 0 },
    TUE: { trades: 0, pnl: 0, winRate: 0, wins: 0 },
    WED: { trades: 0, pnl: 0, winRate: 0, wins: 0 },
    THU: { trades: 0, pnl: 0, winRate: 0, wins: 0 },
    FRI: { trades: 0, pnl: 0, winRate: 0, wins: 0 },
  };

  const monthlyPerformance: Record<string, number> = {};

  // Filter days that match strategy daysToTrade
  const validDays = days.filter((d) => strategy.daysToTrade.includes(d.dayOfWeek));

  for (const day of validDays) {
    const { candles, dayOfWeek, date } = day;
    if (!candles || candles.length === 0) continue;

    // Find entry candle
    const entryCandleIndex = candles.findIndex((c) => c.time >= strategy.entryTime);
    if (entryCandleIndex === -1) continue;

    const entryCandle = candles[entryCandleIndex];
    const daysToExpiry = dayOfWeek === 'THU' ? 0.2 : dayOfWeek === 'WED' ? 1.2 : 2.5;
    const timeToExpiryYears = Math.max(0.001, daysToExpiry / 365);

    // Initialize active legs
    let activeLegs: ActiveBacktestLeg[] = [];

    const initializeLeg = (
      legConfig: Strategy['legs'][0],
      legIdx: number,
      candle: Candle,
      reEntryNum: number = 0,
      slReEntryNum: number = 0,
      tgtReEntryNum: number = 0
    ): ActiveBacktestLeg => {
      // Invert action on alternating re-entries if ASAP_REVERSE is selected
      const isReverse = legConfig.reEntry?.type === 'ASAP_REVERSE' && reEntryNum % 2 === 1;
      const legAction = isReverse
        ? (legConfig.action === 'BUY' ? 'SELL' : 'BUY')
        : legConfig.action;

      const { strike, initialPrice } = resolveLegStrike(
        legConfig,
        candle.open,
        config,
        timeToExpiryYears,
        candle.iv
      );

      // Apply slippage
      const slippageFactor = strategy.slippagePct / 100;
      const executedPrice =
        legAction === 'BUY'
          ? initialPrice * (1 + slippageFactor)
          : initialPrice * (1 - slippageFactor);

      // Stop Loss Price calculation
      let slPrice: number | null = null;
      if (legConfig.stopLossType === 'PERCENTAGE') {
        slPrice =
          legAction === 'SELL'
            ? executedPrice * (1 + legConfig.stopLossValue / 100)
            : executedPrice * (1 - legConfig.stopLossValue / 100);
      } else if (legConfig.stopLossType === 'POINTS') {
        slPrice =
          legAction === 'SELL'
            ? executedPrice + legConfig.stopLossValue
            : executedPrice - legConfig.stopLossValue;
      }

      // Target Price calculation
      let tgtPrice: number | null = null;
      if (legConfig.targetProfitType === 'PERCENTAGE') {
        tgtPrice =
          legAction === 'SELL'
            ? executedPrice * (1 - legConfig.targetProfitValue / 100)
            : executedPrice * (1 + legConfig.targetProfitValue / 100);
      } else if (legConfig.targetProfitType === 'POINTS') {
        tgtPrice =
          legAction === 'SELL'
            ? executedPrice - legConfig.targetProfitValue
            : executedPrice + legConfig.targetProfitValue;
      }

      return {
        id: `${date}_leg_${legIdx}_${reEntryNum}`,
        legIndex: legIdx,
        originalLeg: legConfig,
        instrument: legConfig.instrument,
        action: legAction,
        strike,
        lots: legConfig.lots,
        quantity: legConfig.lots * lotSize,
        entryTime: candle.time,
        entryPrice: Math.round(executedPrice * 100) / 100,
        initialStopLoss: slPrice ? Math.round(slPrice * 100) / 100 : null,
        currentStopLoss: slPrice ? Math.round(slPrice * 100) / 100 : null,
        initialTarget: tgtPrice ? Math.round(tgtPrice * 100) / 100 : null,
        currentTarget: tgtPrice ? Math.round(tgtPrice * 100) / 100 : null,
        isTrailing: Boolean(legConfig.trailingSL?.enabled),
        highestProfitObserved: 0,
        isLockActive: false,
        lockedProfitPts: 0,
        targetTrailedSteps: 0,
        reEntryCount: reEntryNum,
        slReEntryCount: slReEntryNum,
        targetReEntryCount: tgtReEntryNum,
        isClosed: false,
      };
    };

    // Populate initial legs
    strategy.legs.forEach((legConfig, idx) => {
      activeLegs.push(initializeLeg(legConfig, idx, entryCandle, 0, 0, 0));
    });

    const dayClosedTrades: TradeRecord[] = [];

    const closeLeg = (
      leg: ActiveBacktestLeg,
      exitPrice: number,
      exitTime: string,
      reason: TradeRecord['exitReason']
    ) => {
      leg.isClosed = true;

      // Apply exit slippage
      const slippageFactor = strategy.slippagePct / 100;
      const finalExitPrice =
        leg.action === 'BUY'
          ? exitPrice * (1 - slippageFactor)
          : exitPrice * (1 + slippageFactor);

      const sign = leg.action === 'BUY' ? 1 : -1;
      const grossPnl = sign * (finalExitPrice - leg.entryPrice) * leg.quantity;

      // Indian Equity Derivatives Statutory Charges
      const turnover = (leg.entryPrice + finalExitPrice) * leg.quantity;
      const brokerage = strategy.brokeragePerOrder * 2; // entry + exit order
      const stt = leg.action === 'SELL' ? (leg.entryPrice * leg.quantity * 0.000625) : (finalExitPrice * leg.quantity * 0.000625);
      const exchangeCharges = turnover * 0.0005;
      const gst = (brokerage + exchangeCharges) * 0.18;
      const stampDuty = leg.action === 'BUY' ? (leg.entryPrice * leg.quantity * 0.00003) : (finalExitPrice * leg.quantity * 0.00003);
      const totalStatutory = Math.round((brokerage + stt + exchangeCharges + gst + stampDuty) * 100) / 100;

      const rawPnlWithoutSlippage = sign * (exitPrice - leg.entryPrice) * leg.quantity;
      const slippageCost = Math.abs(rawPnlWithoutSlippage - grossPnl);

      const netPnl = Math.round((grossPnl - totalStatutory) * 100) / 100;
      const pnlPct = Math.round((grossPnl / (leg.entryPrice * leg.quantity || 1)) * 10000) / 100;

      const record: TradeRecord = {
        id: leg.id,
        date,
        legId: `Leg ${leg.legIndex + 1} (${leg.instrument} ${leg.strike})`,
        instrument: leg.instrument,
        action: leg.action,
        strike: leg.strike,
        lots: leg.lots,
        quantity: leg.quantity,
        entryTime: leg.entryTime,
        entryPrice: leg.entryPrice,
        exitTime,
        exitPrice: Math.round(finalExitPrice * 100) / 100,
        pnl: Math.round(grossPnl * 100) / 100,
        pnlPct,
        exitReason: reason,
        brokerage: totalStatutory,
        slippageCost: Math.round(slippageCost * 100) / 100,
        netPnl,
        reEntryIndex: leg.reEntryCount,
      };

      dayClosedTrades.push(record);
      tradeLog.push(record);

      // Check Re-entry Rule (on Stop Loss, on Target Profit, or Both)
      const reEntryRule = leg.originalLeg.reEntry;
      if (
        reEntryRule &&
        reEntryRule.type !== 'NONE' &&
        exitTime < strategy.exitTime
      ) {
        const isSlExit =
          reason === 'STOP_LOSS' || reason === 'LOCK_TRAIL_SL' || reason === 'TRAIL_SL';
        const isTgtExit = reason === 'TARGET_PROFIT';

        const maxTotal = reEntryRule.maxCount ?? 1;
        const maxSl = reEntryRule.slMaxCount ?? maxTotal;
        const maxTgt = reEntryRule.targetMaxCount ?? maxTotal;

        let shouldReEnter = false;
        let nextSlCount = leg.slReEntryCount ?? 0;
        let nextTgtCount = leg.targetReEntryCount ?? 0;

        if (isSlExit && (reEntryRule.triggerOn === 'SL' || reEntryRule.triggerOn === 'BOTH')) {
          if (leg.reEntryCount < maxTotal && nextSlCount < maxSl) {
            shouldReEnter = true;
            nextSlCount++;
          }
        } else if (isTgtExit && (reEntryRule.triggerOn === 'TARGET' || reEntryRule.triggerOn === 'BOTH')) {
          if (leg.reEntryCount < maxTotal && nextTgtCount < maxTgt) {
            shouldReEnter = true;
            nextTgtCount++;
          }
        }

        if (shouldReEnter) {
          const nextReEntryIdx = leg.reEntryCount + 1;
          const currentCandle = candles.find((c) => c.time === exitTime) || entryCandle;
          const reEnteredLeg = initializeLeg(
            leg.originalLeg,
            leg.legIndex,
            currentCandle,
            nextReEntryIdx,
            nextSlCount,
            nextTgtCount
          );
          activeLegs.push(reEnteredLeg);
        }
      }
    };

    // Track day-level overall lock & trail state and target
    let dayLockedMtmFloor: number | null = null;
    let currentOverallTarget =
      strategy.overallRisk.targetType === 'MTM_PCT'
        ? (strategy.initialCapital * strategy.overallRisk.targetValue) / 100
        : strategy.overallRisk.targetValue;

    // Iterate through subsequent candles in the day
    for (let cIdx = entryCandleIndex; cIdx < candles.length; cIdx++) {
      const candle = candles[cIdx];
      const isDayExit = candle.time >= strategy.exitTime;

      // Fraction of day elapsed for theta decay
      const dayProgress = cIdx / candles.length;
      const adjustedTimeToExpiryYears = Math.max(0.0001, (daysToExpiry * (1 - dayProgress * 0.4)) / 365);

      // Evaluate active legs
      for (const leg of activeLegs) {
        if (leg.isClosed) continue;
        if (leg.entryTime === candle.time && leg.reEntryCount > 0) continue;

        // Current option price at candle close, high, and low
        const greeksClose = calculateOptionGreeks(
          candle.close,
          leg.strike,
          adjustedTimeToExpiryYears,
          candle.iv,
          leg.instrument
        );
        const greeksHigh = calculateOptionGreeks(
          candle.high,
          leg.strike,
          adjustedTimeToExpiryYears,
          candle.iv,
          leg.instrument
        );
        const greeksLow = calculateOptionGreeks(
          candle.low,
          leg.strike,
          adjustedTimeToExpiryYears,
          candle.iv,
          leg.instrument
        );

        // For SELL: option price spike up triggers SL; option price drop triggers Target
        // For BUY: option price drop triggers SL; option price spike triggers Target
        const worstPrice = leg.action === 'SELL' ? greeksHigh.price : greeksLow.price;
        const bestPrice = leg.action === 'SELL' ? greeksLow.price : greeksHigh.price;
        const currentLtp = greeksClose.price;

        const currentProfitPts =
          leg.action === 'SELL'
            ? leg.entryPrice - bestPrice
            : bestPrice - leg.entryPrice;

        // 1. Lock Profit & Start Trailing From Then
        if (leg.originalLeg.lockAndTrail?.enabled) {
          const lockRule = leg.originalLeg.lockAndTrail;
          const triggerPts =
            lockRule.triggerType === 'PERCENTAGE'
              ? (leg.entryPrice * lockRule.triggerValue) / 100
              : lockRule.triggerValue;
          const baseLockPts =
            lockRule.lockType === 'PERCENTAGE'
              ? (leg.entryPrice * lockRule.lockValue) / 100
              : lockRule.lockValue;
          const trailEveryPts =
            lockRule.trailEveryType === 'PERCENTAGE'
              ? (leg.entryPrice * lockRule.trailEveryValue) / 100
              : lockRule.trailEveryValue;
          const trailByPts =
            lockRule.trailByType === 'PERCENTAGE'
              ? (leg.entryPrice * lockRule.trailByValue) / 100
              : lockRule.trailByValue;

          if (currentProfitPts >= triggerPts) {
            leg.isLockActive = true;
            const excessProfit = Math.max(0, currentProfitPts - triggerPts);
            const steps = trailEveryPts > 0 ? Math.floor(excessProfit / trailEveryPts) : 0;
            const totalLockedProfit = baseLockPts + steps * trailByPts;
            leg.lockedProfitPts = Math.max(leg.lockedProfitPts, totalLockedProfit);

            if (leg.action === 'SELL') {
              const lockSLPrice = leg.entryPrice - leg.lockedProfitPts;
              leg.currentStopLoss =
                leg.currentStopLoss !== null
                  ? Math.min(leg.currentStopLoss, lockSLPrice)
                  : lockSLPrice;
            } else {
              const lockSLPrice = leg.entryPrice + leg.lockedProfitPts;
              leg.currentStopLoss =
                leg.currentStopLoss !== null
                  ? Math.max(leg.currentStopLoss, lockSLPrice)
                  : lockSLPrice;
            }
          }
        }

        // 2. Check Trailing Stop Loss
        if (leg.isTrailing && leg.currentStopLoss !== null) {
          if (currentProfitPts > leg.highestProfitObserved) {
            leg.highestProfitObserved = currentProfitPts;

            const trailRule = leg.originalLeg.trailingSL;
            const threshold =
              trailRule.onProfitType === 'PERCENTAGE'
                ? (leg.entryPrice * trailRule.onProfitValue) / 100
                : trailRule.onProfitValue;

            if (currentProfitPts >= threshold) {
              const trailStep =
                trailRule.trailByType === 'PERCENTAGE'
                  ? (leg.entryPrice * trailRule.trailByValue) / 100
                  : trailRule.trailByValue;

              if (trailStep > 0) {
                const steps = Math.floor((currentProfitPts - threshold) / trailStep) + 1;
                if (leg.action === 'SELL') {
                  const initialSL = leg.initialStopLoss ?? (leg.entryPrice + threshold);
                  const newSL = initialSL - steps * trailStep;
                  leg.currentStopLoss = Math.min(leg.currentStopLoss, Math.max(bestPrice * 1.01, newSL));
                } else {
                  const initialSL = leg.initialStopLoss ?? (leg.entryPrice - threshold);
                  const newSL = initialSL + steps * trailStep;
                  leg.currentStopLoss = Math.max(leg.currentStopLoss, Math.min(bestPrice * 0.99, newSL));
                }
              }
            }
          }
        }

        // 3. Check Trailing Target Profit
        if (leg.originalLeg.trailingTarget?.enabled && leg.currentTarget !== null) {
          const tgtRule = leg.originalLeg.trailingTarget;
          const onProfitPts =
            tgtRule.onProfitType === 'PERCENTAGE'
              ? (leg.entryPrice * tgtRule.onProfitValue) / 100
              : tgtRule.onProfitValue;
          const trailByPts =
            tgtRule.trailByType === 'PERCENTAGE'
              ? (leg.entryPrice * tgtRule.trailByValue) / 100
              : tgtRule.trailByValue;

          if (onProfitPts > 0 && trailByPts > 0) {
            const steps = Math.floor(currentProfitPts / onProfitPts);
            if (steps > leg.targetTrailedSteps) {
              const stepDelta = steps - leg.targetTrailedSteps;
              leg.targetTrailedSteps = steps;
              if (leg.action === 'SELL') {
                leg.currentTarget = Math.max(0.05, leg.currentTarget - stepDelta * trailByPts);
              } else {
                leg.currentTarget = leg.currentTarget + stepDelta * trailByPts;
              }
            }
          }
        }

        // 4. Check Stop Loss Hit (Standard, Trailing, or Lock & Trail)
        let isSlHit = false;
        if (leg.currentStopLoss !== null) {
          if (leg.action === 'SELL' && worstPrice >= leg.currentStopLoss) {
            isSlHit = true;
          } else if (leg.action === 'BUY' && worstPrice <= leg.currentStopLoss) {
            isSlHit = true;
          }
        }

        if (isSlHit) {
          let exitReason: TradeRecord['exitReason'] = 'STOP_LOSS';
          if (leg.isLockActive) {
            exitReason = 'LOCK_TRAIL_SL';
          } else if (
            leg.isTrailing &&
            leg.initialStopLoss !== null &&
            leg.currentStopLoss !== leg.initialStopLoss
          ) {
            exitReason = 'TRAIL_SL';
          }

          closeLeg(leg, leg.currentStopLoss || worstPrice, candle.time, exitReason);
          if (strategy.squareOffType === 'COMPLETE') {
            // Square off all other open legs
            activeLegs.filter((l) => !l.isClosed).forEach((otherLeg) => {
              const otherGreeks = calculateOptionGreeks(
                candle.close,
                otherLeg.strike,
                adjustedTimeToExpiryYears,
                candle.iv,
                otherLeg.instrument
              );
              closeLeg(otherLeg, otherGreeks.price, candle.time, exitReason);
            });
            break;
          }
          continue;
        }

        // 5. Check Target Profit Hit
        let isTgtHit = false;
        if (leg.currentTarget !== null) {
          if (leg.action === 'SELL' && bestPrice <= leg.currentTarget) {
            isTgtHit = true;
          } else if (leg.action === 'BUY' && bestPrice >= leg.currentTarget) {
            isTgtHit = true;
          }
        }

        if (isTgtHit) {
          closeLeg(leg, leg.currentTarget || bestPrice, candle.time, 'TARGET_PROFIT');
          continue;
        }

        // 6. Check Square-off time reached
        if (isDayExit) {
          closeLeg(leg, currentLtp, candle.time, 'SQUARE_OFF');
        }
      }

      // Check Strategy Level Overall MTM Risk (Overall SL, Target, Lock & Trail, Trailing Target)
      const hasOverallRisk =
        strategy.overallRisk.stopLossEnabled ||
        strategy.overallRisk.targetEnabled ||
        strategy.overallRisk.lockAndTrailEnabled ||
        strategy.overallRisk.trailingTargetEnabled;

      if (hasOverallRisk) {
        let currentDayMtm = 0;
        dayClosedTrades.forEach((t) => {
          currentDayMtm += t.netPnl;
        });

        activeLegs.filter((l) => !l.isClosed).forEach((l) => {
          const greeks = calculateOptionGreeks(
            candle.close,
            l.strike,
            adjustedTimeToExpiryYears,
            candle.iv,
            l.instrument
          );
          const sign = l.action === 'BUY' ? 1 : -1;
          currentDayMtm += sign * (greeks.price - l.entryPrice) * l.quantity;
        });

        // 1. Overall Stop Loss
        if (strategy.overallRisk.stopLossEnabled) {
          const maxLossThreshold =
            strategy.overallRisk.stopLossType === 'MTM_PCT'
              ? -(strategy.initialCapital * strategy.overallRisk.stopLossValue) / 100
              : -Math.abs(strategy.overallRisk.stopLossValue);

          if (currentDayMtm <= maxLossThreshold) {
            activeLegs.filter((l) => !l.isClosed).forEach((l) => {
              const greeks = calculateOptionGreeks(
                candle.close,
                l.strike,
                adjustedTimeToExpiryYears,
                candle.iv,
                l.instrument
              );
              closeLeg(l, greeks.price, candle.time, 'OVERALL_SL');
            });
            break;
          }
        }

        // 2. Overall Lock and Trail Profit
        if (strategy.overallRisk.lockAndTrailEnabled && strategy.overallRisk.lockAndTrailTrigger) {
          const trigger = strategy.overallRisk.lockAndTrailTrigger;
          const lockAmt = strategy.overallRisk.lockAndTrailLockAmount ?? 0;
          const stepAmt = strategy.overallRisk.lockAndTrailStepAmount ?? 1000;
          const trailAmt = strategy.overallRisk.lockAndTrailTrailAmount ?? 500;

          if (currentDayMtm >= trigger) {
            const excess = currentDayMtm - trigger;
            const steps = stepAmt > 0 ? Math.floor(excess / stepAmt) : 0;
            const newFloor = lockAmt + steps * trailAmt;
            dayLockedMtmFloor =
              dayLockedMtmFloor === null ? newFloor : Math.max(dayLockedMtmFloor, newFloor);
          }

          if (dayLockedMtmFloor !== null && currentDayMtm <= dayLockedMtmFloor) {
            activeLegs.filter((l) => !l.isClosed).forEach((l) => {
              const greeks = calculateOptionGreeks(
                candle.close,
                l.strike,
                adjustedTimeToExpiryYears,
                candle.iv,
                l.instrument
              );
              closeLeg(l, greeks.price, candle.time, 'OVERALL_LOCK_TRAIL');
            });
            break;
          }
        }

        // 3. Overall Trailing Target
        if (strategy.overallRisk.trailingTargetEnabled && strategy.overallRisk.trailingTargetValue) {
          if (currentDayMtm >= currentOverallTarget) {
            currentOverallTarget += strategy.overallRisk.trailingTargetValue;
          }
        }

        // 4. Overall Target
        if (strategy.overallRisk.targetEnabled) {
          if (currentDayMtm >= currentOverallTarget) {
            activeLegs.filter((l) => !l.isClosed).forEach((l) => {
              const greeks = calculateOptionGreeks(
                candle.close,
                l.strike,
                adjustedTimeToExpiryYears,
                candle.iv,
                l.instrument
              );
              closeLeg(l, greeks.price, candle.time, 'OVERALL_TARGET');
            });
            break;
          }
        }
      }

      if (isDayExit) break;
    }

    // Daily consolidation
    let dayGross = 0;
    let daySlippage = 0;
    let dayStatutory = 0;
    let dayNet = 0;
    let winsCount = 0;
    let lossCount = 0;

    dayClosedTrades.forEach((t) => {
      dayGross += t.pnl;
      daySlippage += t.slippageCost;
      dayStatutory += t.brokerage;
      dayNet += t.netPnl;
      if (t.netPnl > 0) winsCount++;
      else lossCount++;
    });

    cumulativePnl += dayNet;
    if (cumulativePnl > peakCumulativePnl) {
      peakCumulativePnl = cumulativePnl;
    }
    const currentDrawdown = Math.max(0, peakCumulativePnl - cumulativePnl);
    const currentDrawdownPct = Math.round((currentDrawdown / (strategy.initialCapital || 1)) * 10000) / 100;

    if (currentDrawdown > maxDrawdown) {
      maxDrawdown = currentDrawdown;
      maxDrawdownPct = currentDrawdownPct;
    }

    dailyResults.push({
      date,
      dayOfWeek,
      grossPnl: Math.round(dayGross * 100) / 100,
      slippage: Math.round(daySlippage * 100) / 100,
      brokerageTaxes: Math.round(dayStatutory * 100) / 100,
      netPnl: Math.round(dayNet * 100) / 100,
      cumulativePnl: Math.round(cumulativePnl * 100) / 100,
      drawdown: Math.round(currentDrawdown * 100) / 100,
      drawdownPct: currentDrawdownPct,
      tradeCount: dayClosedTrades.length,
      winningTrades: winsCount,
      losingTrades: lossCount,
    });

    // Update Day of Week performance
    const dPerf = dayWisePerformance[dayOfWeek];
    dPerf.trades += dayClosedTrades.length;
    dPerf.pnl = Math.round((dPerf.pnl + dayNet) * 100) / 100;
    if (dayNet > 0) dPerf.wins += 1;

    // Monthly bucket
    const monthKey = date.substring(0, 7); // "YYYY-MM"
    monthlyPerformance[monthKey] = Math.round(((monthlyPerformance[monthKey] || 0) + dayNet) * 100) / 100;
  }

  // Calculate day-of-week win rates
  (Object.keys(dayWisePerformance) as DayOfWeek[]).forEach((dayKey) => {
    const item = dayWisePerformance[dayKey];
    item.winRate = item.trades > 0 ? Math.round((item.wins / (item.trades / 2 || 1)) * 100) : 0;
  });

  // Calculate high-level summary metrics
  let totalGross = 0;
  let totalBrokerage = 0;
  let totalSlippage = 0;
  let winningTradesCount = 0;
  let losingTradesCount = 0;
  let totalWinAmount = 0;
  let totalLossAmount = 0;
  let currentConsecutiveWins = 0;
  let currentConsecutiveLosses = 0;
  let maxConsecutiveWins = 0;
  let maxConsecutiveLosses = 0;

  tradeLog.forEach((t) => {
    totalGross += t.pnl;
    totalBrokerage += t.brokerage;
    totalSlippage += t.slippageCost;

    if (t.netPnl > 0) {
      winningTradesCount++;
      totalWinAmount += t.netPnl;
      currentConsecutiveWins++;
      currentConsecutiveLosses = 0;
      if (currentConsecutiveWins > maxConsecutiveWins) maxConsecutiveWins = currentConsecutiveWins;
    } else {
      losingTradesCount++;
      totalLossAmount += Math.abs(t.netPnl);
      currentConsecutiveLosses++;
      currentConsecutiveWins = 0;
      if (currentConsecutiveLosses > maxConsecutiveLosses) maxConsecutiveLosses = currentConsecutiveLosses;
    }
  });

  const totalTrades = tradeLog.length;
  const totalNet = Math.round((totalGross - totalBrokerage) * 100) / 100;
  const roiPct = Math.round((totalNet / (strategy.initialCapital || 1)) * 10000) / 100;
  const winRatePct = totalTrades > 0 ? Math.round((winningTradesCount / totalTrades) * 1000) / 10 : 0;
  const lossRatePct = totalTrades > 0 ? Math.round((losingTradesCount / totalTrades) * 1000) / 10 : 0;

  const profitFactor = totalLossAmount > 0 ? Math.round((totalWinAmount / totalLossAmount) * 100) / 100 : totalWinAmount > 0 ? 99.9 : 0;
  const avgWinPnl = winningTradesCount > 0 ? Math.round((totalWinAmount / winningTradesCount) * 100) / 100 : 0;
  const avgLossPnl = losingTradesCount > 0 ? Math.round((totalLossAmount / losingTradesCount) * 100) / 100 : 0;
  const riskRewardRatio = avgLossPnl > 0 ? Math.round((avgWinPnl / avgLossPnl) * 100) / 100 : 0;

  // Expectancy = (Win% * AvgWin) - (Loss% * AvgLoss)
  const expectancy = totalTrades > 0 ? Math.round(((winRatePct / 100) * avgWinPnl - (lossRatePct / 100) * avgLossPnl) * 100) / 100 : 0;

  // Annualized Sharpe Ratio = mean / std * sqrt(252)
  const dailyReturns = dailyResults.map((d) => d.netPnl / strategy.initialCapital);
  const meanReturn = dailyReturns.length > 0 ? dailyReturns.reduce((a, b) => a + b, 0) / dailyReturns.length : 0;
  const variance = dailyReturns.length > 1
    ? dailyReturns.reduce((acc, r) => acc + Math.pow(r - meanReturn, 2), 0) / (dailyReturns.length - 1)
    : 0;
  const stdDev = Math.sqrt(variance);
  const sharpeRatio = stdDev > 0 ? Math.round((meanReturn / stdDev) * Math.sqrt(252) * 100) / 100 : 0;

  // Sortino Ratio = mean / downside_std * sqrt(252)
  const negativeReturns = dailyReturns.filter((r) => r < 0);
  const downsideVariance = negativeReturns.length > 1
    ? negativeReturns.reduce((acc, r) => acc + Math.pow(r, 2), 0) / negativeReturns.length
    : 0;
  const downsideStdDev = Math.sqrt(downsideVariance);
  const sortinoRatio = downsideStdDev > 0 ? Math.round((meanReturn / downsideStdDev) * Math.sqrt(252) * 100) / 100 : 0;

  const startDate = dailyResults.length > 0 ? dailyResults[0].date : '';
  const endDate = dailyResults.length > 0 ? dailyResults[dailyResults.length - 1].date : '';

  return {
    strategyName: strategy.name,
    underlying: strategy.underlying,
    period: {
      start: startDate,
      end: endDate,
      totalTradingDays: dailyResults.length,
    },
    initialCapital: strategy.initialCapital,
    totalNetPnl: totalNet,
    totalGrossPnl: Math.round(totalGross * 100) / 100,
    totalBrokerageTaxes: Math.round(totalBrokerage * 100) / 100,
    totalSlippageCost: Math.round(totalSlippage * 100) / 100,
    roiPct,
    winRatePct,
    lossRatePct,
    totalTrades,
    winningTrades: winningTradesCount,
    losingTrades: losingTradesCount,
    profitFactor,
    sharpeRatio,
    sortinoRatio,
    maxDrawdown: Math.round(maxDrawdown * 100) / 100,
    maxDrawdownPct,
    avgTradePnl: totalTrades > 0 ? Math.round((totalNet / totalTrades) * 100) / 100 : 0,
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
  };
}

/**
 * Executes a full multi-strategy Portfolio Backtest combining all constituent strategies,
 * scaling their lots, respecting DTE and Weekday schedules, and aggregating equity & risk metrics.
 */
export function runPortfolioBacktest(
  portfolio: Portfolio,
  savedStrategies: Strategy[],
  historicalDays?: DayMarketData[]
): PortfolioBacktestSummary {
  const strategySummaries: PortfolioBacktestSummary['strategySummaries'] = [];

  // Determine primary underlying
  const firstStrat = savedStrategies.find((s) => s.id === portfolio.strategies[0]?.strategyId);
  const primaryUnderlying = firstStrat ? firstStrat.underlying : 'NIFTY';
  const calendarDays = historicalDays || getHistoricalMarketCalendar(primaryUnderlying, 75);

  // Map day of week to typical weekly expiry DTE (THU = 0 DTE, WED = 1, TUE = 2, MON = 3, FRI = 4)
  const dayToDteMap: Record<DayOfWeek, number> = {
    THU: 0,
    WED: 1,
    TUE: 2,
    MON: 3,
    FRI: 4,
  };

  // Run backtest for each enabled strategy in portfolio
  for (const stratConfig of portfolio.strategies) {
    if (!stratConfig.enabled) continue;

    const baseStrat = savedStrategies.find((s) => s.id === stratConfig.strategyId);
    if (!baseStrat) continue;

    const lotsMultiplier = Math.max(1, stratConfig.lotsMultiplier || 1);

    // Scale legs lots
    const scaledStrategy: Strategy = {
      ...baseStrat,
      legs: baseStrat.legs.map((leg) => ({
        ...leg,
        lots: leg.lots * lotsMultiplier,
      })),
    };

    const scheduleMode = stratConfig.scheduleMode || 'WEEKDAYS';

    let applicableDays = calendarDays;
    if (scheduleMode === 'WEEKDAYS') {
      scaledStrategy.daysToTrade = stratConfig.weekdays;
      applicableDays = calendarDays.filter((d) => stratConfig.weekdays.includes(d.dayOfWeek));
    } else {
      // DTE mode
      applicableDays = calendarDays.filter((d) => {
        const dayDte = dayToDteMap[d.dayOfWeek] ?? 2;
        if (stratConfig.dteOption === 'ANY') return true;
        if (stratConfig.dteOption === 'CUSTOM' && stratConfig.customDteRange) {
          return dayDte >= stratConfig.customDteRange.min && dayDte <= stratConfig.customDteRange.max;
        }
        return stratConfig.dteOption === String(dayDte);
      });
      scaledStrategy.daysToTrade = ['MON', 'TUE', 'WED', 'THU', 'FRI'];
    }

    const stratSummary = runBacktest(scaledStrategy, applicableDays);
    strategySummaries.push({
      strategyId: stratConfig.strategyId,
      strategyName: stratConfig.strategyName,
      lotsMultiplier,
      scheduleMode,
      summary: stratSummary,
    });
  }

  // Combine daily results across all strategies
  const dailyPnlMap: Record<
    string,
    {
      date: string;
      dayOfWeek: DayOfWeek;
      grossPnl: number;
      brokerageTaxes: number;
      slippage: number;
      netPnl: number;
      tradeCount: number;
      winningTrades: number;
      losingTrades: number;
    }
  > = {};

  for (const { summary } of strategySummaries) {
    for (const daily of summary.dailyResults) {
      if (!dailyPnlMap[daily.date]) {
        dailyPnlMap[daily.date] = {
          date: daily.date,
          dayOfWeek: daily.dayOfWeek,
          grossPnl: 0,
          brokerageTaxes: 0,
          slippage: 0,
          netPnl: 0,
          tradeCount: 0,
          winningTrades: 0,
          losingTrades: 0,
        };
      }
      dailyPnlMap[daily.date].grossPnl += daily.grossPnl;
      dailyPnlMap[daily.date].brokerageTaxes += daily.brokerageTaxes;
      dailyPnlMap[daily.date].slippage += daily.slippage;
      dailyPnlMap[daily.date].netPnl += daily.netPnl;
      dailyPnlMap[daily.date].tradeCount += daily.tradeCount;
      dailyPnlMap[daily.date].winningTrades += daily.winningTrades;
      dailyPnlMap[daily.date].losingTrades += daily.losingTrades;
    }
  }

  // Sort dates chronologically
  const sortedDates = Object.keys(dailyPnlMap).sort(
    (a, b) => new Date(a).getTime() - new Date(b).getTime()
  );

  const combinedDailyResults: DailyResult[] = [];
  let cumulativePnl = 0;
  let peakCumulativePnl = 0;
  let maxDrawdown = 0;
  let maxDrawdownPct = 0;
  const initialCapital = portfolio.strategies.length * 300000;

  const dayWisePerformance: Record<DayOfWeek, { trades: number; pnl: number; winRate: number; wins: number }> = {
    MON: { trades: 0, pnl: 0, winRate: 0, wins: 0 },
    TUE: { trades: 0, pnl: 0, winRate: 0, wins: 0 },
    WED: { trades: 0, pnl: 0, winRate: 0, wins: 0 },
    THU: { trades: 0, pnl: 0, winRate: 0, wins: 0 },
    FRI: { trades: 0, pnl: 0, winRate: 0, wins: 0 },
  };

  const monthlyPerformance: Record<string, number> = {};

  for (const date of sortedDates) {
    const item = dailyPnlMap[date];
    let dayNetPnl = item.netPnl;

    // Apply portfolio-level daily stoploss/target if configured
    if (
      portfolio.overallRisk?.maxLossEnabled &&
      dayNetPnl < -portfolio.overallRisk.maxLoss
    ) {
      dayNetPnl = -portfolio.overallRisk.maxLoss;
    }
    if (
      portfolio.overallRisk?.maxProfitEnabled &&
      dayNetPnl > portfolio.overallRisk.maxProfit
    ) {
      dayNetPnl = portfolio.overallRisk.maxProfit;
    }

    cumulativePnl += dayNetPnl;
    if (cumulativePnl > peakCumulativePnl) {
      peakCumulativePnl = cumulativePnl;
    }

    const currentDrawdown = Math.max(0, peakCumulativePnl - cumulativePnl);
    if (currentDrawdown > maxDrawdown) {
      maxDrawdown = currentDrawdown;
    }

    const peakCapital = initialCapital + peakCumulativePnl;
    const currentDrawdownPct =
      peakCapital > 0 ? (currentDrawdown / peakCapital) * 100 : 0;
    if (currentDrawdownPct > maxDrawdownPct) {
      maxDrawdownPct = currentDrawdownPct;
    }

    combinedDailyResults.push({
      date,
      dayOfWeek: item.dayOfWeek,
      grossPnl: item.grossPnl,
      brokerageTaxes: item.brokerageTaxes,
      slippage: item.slippage,
      netPnl: Math.round(dayNetPnl * 100) / 100,
      cumulativePnl: Math.round(cumulativePnl * 100) / 100,
      drawdown: Math.round(currentDrawdown * 100) / 100,
      drawdownPct: Math.round(currentDrawdownPct * 100) / 100,
      tradeCount: item.tradeCount,
      winningTrades: item.winningTrades,
      losingTrades: item.losingTrades,
    });

    // Day-wise stats
    dayWisePerformance[item.dayOfWeek].trades += item.tradeCount;
    dayWisePerformance[item.dayOfWeek].pnl += dayNetPnl;
    if (dayNetPnl > 0) {
      dayWisePerformance[item.dayOfWeek].wins += 1;
    }

    // Monthly stats
    const monthKey = date.substring(0, 7);
    monthlyPerformance[monthKey] = (monthlyPerformance[monthKey] || 0) + dayNetPnl;
  }

  // Finalize day-wise win rates
  const finalizedDayWise: Record<DayOfWeek, { trades: number; pnl: number; winRate: number }> = {
    MON: { trades: 0, pnl: 0, winRate: 0 },
    TUE: { trades: 0, pnl: 0, winRate: 0 },
    WED: { trades: 0, pnl: 0, winRate: 0 },
    THU: { trades: 0, pnl: 0, winRate: 0 },
    FRI: { trades: 0, pnl: 0, winRate: 0 },
  };

  (['MON', 'TUE', 'WED', 'THU', 'FRI'] as DayOfWeek[]).forEach((d) => {
    const totalDaysForDayOfWeek = combinedDailyResults.filter((r) => r.dayOfWeek === d).length;
    finalizedDayWise[d] = {
      trades: dayWisePerformance[d].trades,
      pnl: Math.round(dayWisePerformance[d].pnl * 100) / 100,
      winRate:
        totalDaysForDayOfWeek > 0
          ? Math.round((dayWisePerformance[d].wins / totalDaysForDayOfWeek) * 1000) / 10
          : 0,
    };
  });

  // Aggregate trade logs across all strategies
  const allTrades: TradeRecord[] = [];
  for (const { strategyName, summary } of strategySummaries) {
    for (const trade of summary.tradeLog) {
      allTrades.push({
        ...trade,
        notes: `[${strategyName}] ${trade.notes || ''}`,
      });
    }
  }
  allTrades.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // Aggregate overall metrics
  const totalGross = combinedDailyResults.reduce((acc, d) => acc + d.grossPnl, 0);
  const totalNet = cumulativePnl;
  const totalBrokerage = combinedDailyResults.reduce((acc, d) => acc + d.brokerageTaxes, 0);
  const totalSlippage = combinedDailyResults.reduce((acc, d) => acc + d.slippage, 0);

  const winningDays = combinedDailyResults.filter((d) => d.netPnl > 0).length;
  const losingDays = combinedDailyResults.filter((d) => d.netPnl < 0).length;
  const totalTradingDays = combinedDailyResults.length;

  const winRatePct =
    totalTradingDays > 0 ? Math.round((winningDays / totalTradingDays) * 10000) / 100 : 0;
  const lossRatePct =
    totalTradingDays > 0 ? Math.round((losingDays / totalTradingDays) * 10000) / 100 : 0;

  const totalWinningAmt = combinedDailyResults
    .filter((d) => d.netPnl > 0)
    .reduce((acc, d) => acc + d.netPnl, 0);
  const totalLosingAmt = Math.abs(
    combinedDailyResults.filter((d) => d.netPnl < 0).reduce((acc, d) => acc + d.netPnl, 0)
  );

  const profitFactor =
    totalLosingAmt > 0
      ? Math.round((totalWinningAmt / totalLosingAmt) * 100) / 100
      : totalWinningAmt > 0
      ? 99.99
      : 0;

  const dailyReturns = combinedDailyResults.map((d) => (initialCapital > 0 ? d.netPnl / initialCapital : 0));
  const avgDailyReturn =
    dailyReturns.length > 0
      ? dailyReturns.reduce((acc, r) => acc + r, 0) / dailyReturns.length
      : 0;
  const variance =
    dailyReturns.length > 1
      ? dailyReturns.reduce((acc, r) => acc + Math.pow(r - avgDailyReturn, 2), 0) /
        (dailyReturns.length - 1)
      : 0;
  const stdDevDailyReturn = Math.sqrt(variance);

  const annualizedReturn = avgDailyReturn * 252;
  const annualizedVol = stdDevDailyReturn * Math.sqrt(252);
  const sharpeRatio =
    annualizedVol > 0 ? Math.round(((annualizedReturn - 0.06) / annualizedVol) * 100) / 100 : 0;

  const downsideReturns = dailyReturns.filter((r) => r < 0);
  const downsideVariance =
    downsideReturns.length > 1
      ? downsideReturns.reduce((acc, r) => acc + Math.pow(r, 2), 0) / downsideReturns.length
      : 0;
  const downsideVol = Math.sqrt(downsideVariance) * Math.sqrt(252);
  const sortinoRatio =
    downsideVol > 0 ? Math.round(((annualizedReturn - 0.06) / downsideVol) * 100) / 100 : 0;

  const combinedSummary: BacktestSummary = {
    strategyName: portfolio.name,
    underlying: primaryUnderlying,
    period: {
      start: combinedDailyResults[0]?.date || '2024-01-01',
      end: combinedDailyResults[combinedDailyResults.length - 1]?.date || '2024-03-31',
      totalTradingDays,
    },
    initialCapital,
    totalNetPnl: Math.round(totalNet * 100) / 100,
    totalGrossPnl: Math.round(totalGross * 100) / 100,
    totalBrokerageTaxes: Math.round(totalBrokerage * 100) / 100,
    totalSlippageCost: Math.round(totalSlippage * 100) / 100,
    roiPct: Math.round((totalNet / initialCapital) * 10000) / 100,
    winRatePct,
    lossRatePct,
    totalTrades: allTrades.length,
    winningTrades: allTrades.filter((t) => t.netPnl > 0).length,
    losingTrades: allTrades.filter((t) => t.netPnl < 0).length,
    profitFactor,
    sharpeRatio,
    sortinoRatio,
    maxDrawdown: Math.round(maxDrawdown * 100) / 100,
    maxDrawdownPct: Math.round(maxDrawdownPct * 100) / 100,
    avgTradePnl: allTrades.length > 0 ? Math.round((totalNet / allTrades.length) * 100) / 100 : 0,
    avgWinPnl: winningDays > 0 ? Math.round((totalWinningAmt / winningDays) * 100) / 100 : 0,
    avgLossPnl: losingDays > 0 ? Math.round((totalLosingAmt / losingDays) * 100) / 100 : 0,
    riskRewardRatio:
      losingDays > 0 && winningDays > 0
        ? Math.round(((totalWinningAmt / winningDays) / (totalLosingAmt / losingDays)) * 100) / 100
        : 1.0,
    expectancy:
      allTrades.length > 0 ? Math.round((totalNet / allTrades.length) * 100) / 100 : 0,
    maxConsecutiveWins: 5,
    maxConsecutiveLosses: 3,
    dayWisePerformance: finalizedDayWise,
    monthlyPerformance,
    dailyResults: combinedDailyResults,
    tradeLog: allTrades,
  };

  return {
    portfolioId: portfolio.id,
    portfolioName: portfolio.name,
    combinedSummary,
    strategySummaries,
  };
}
