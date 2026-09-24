import { DayOfWeek, UnderlyingIndex } from '../types/trading';
import { UNDERLYING_CONFIGS } from './optionPricer';

export interface Candle {
  timestamp: string; // "YYYY-MM-DD HH:mm"
  time: string; // "HH:mm"
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  iv: number;
}

export interface DayMarketData {
  date: string; // "YYYY-MM-DD"
  dayOfWeek: DayOfWeek;
  underlying: UnderlyingIndex;
  openPrice: number;
  highPrice: number;
  lowPrice: number;
  closePrice: number;
  regime: 'RANGE_BOUND' | 'BULL_TREND' | 'BEAR_TREND' | 'VOLATILE_EXPIRY' | 'AFTERNOON_REVERSAL';
  candles: Candle[];
}

// Pseudo-random deterministic generator for consistent backtest repeatability
class SeededRandom {
  private seed: number;
  constructor(seed: number = 42) {
    this.seed = seed;
  }
  next(): number {
    this.seed = (this.seed * 9301 + 49297) % 233280;
    return this.seed / 233280;
  }
  range(min: number, max: number): number {
    return min + this.next() * (max - min);
  }
}

export function generateIntradayDayData(
  dateStr: string,
  dayOfWeek: DayOfWeek,
  underlying: UnderlyingIndex,
  prevClose: number,
  seedNum: number
): DayMarketData {
  const rng = new SeededRandom(seedNum);
  const config = UNDERLYING_CONFIGS[underlying];
  const { volatilityRange } = config;

  // Determine market regime for this day
  const regimeRoll = rng.next();
  let regime: DayMarketData['regime'] = 'RANGE_BOUND';
  let targetReturn = 0;
  let intradayVolFactor = 1.0;

  if (regimeRoll < 0.35) {
    regime = 'RANGE_BOUND'; // High theta decay
    targetReturn = rng.range(-0.003, 0.003);
    intradayVolFactor = 0.7;
  } else if (regimeRoll < 0.55) {
    regime = 'BULL_TREND'; // Strong upmove
    targetReturn = rng.range(0.006, 0.018);
    intradayVolFactor = 1.1;
  } else if (regimeRoll < 0.75) {
    regime = 'BEAR_TREND'; // Sell-off
    targetReturn = rng.range(-0.019, -0.006);
    intradayVolFactor = 1.3;
  } else if (regimeRoll < 0.88) {
    regime = 'VOLATILE_EXPIRY'; // Both side whipsaws
    targetReturn = rng.range(-0.005, 0.005);
    intradayVolFactor = 1.6;
  } else {
    regime = 'AFTERNOON_REVERSAL'; // Morning fake-out then hard reverse
    targetReturn = rng.range(-0.002, 0.008);
    intradayVolFactor = 1.4;
  }

  // Opening gap
  const gapPct = rng.range(-0.006, 0.006);
  const openPrice = Math.round(prevClose * (1 + gapPct) * 10) / 10;
  const dayBaseIv = rng.range(volatilityRange[0], volatilityRange[1]);

  const candles: Candle[] = [];
  let currentPrice = openPrice;
  let dayHigh = openPrice;
  let dayLow = openPrice;

  // Trading minutes: 09:15 to 15:30 (375 minutes, sampled at 1-min or 3-min increments)
  // To keep simulation ultra-snappy and accurate, we use 3-minute bars (125 candles/day)
  const minuteStep = 3;
  let minuteCount = 0;

  for (let hour = 9; hour <= 15; hour++) {
    const startMin = hour === 9 ? 15 : 0;
    const endMin = hour === 15 ? 30 : 59;

    for (let minute = startMin; minute <= endMin; minute += minuteStep) {
      minuteCount++;
      const timeStr = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      const timestamp = `${dateStr} ${timeStr}`;

      // Time-of-day volatility curve (high in morning 9:15-10:00 and afternoon 14:00-15:30)
      let timeMultiplier = 1.0;
      if (hour === 9 || (hour === 10 && minute <= 15)) {
        timeMultiplier = 1.5; // morning impulse
      } else if (hour >= 11 && hour <= 13) {
        timeMultiplier = 0.55; // midday lull
      } else if (hour >= 14) {
        timeMultiplier = 1.4; // afternoon surge
      }

      // Regime drift
      let drift = 0;
      if (regime === 'BULL_TREND') {
        drift = 0.00015;
      } else if (regime === 'BEAR_TREND') {
        drift = -0.00018;
      } else if (regime === 'AFTERNOON_REVERSAL') {
        drift = hour < 12 ? 0.0002 : -0.00025;
      } else if (regime === 'VOLATILE_EXPIRY') {
        drift = Math.sin(minuteCount / 8) * 0.0003;
      }

      const noise = (rng.next() - 0.5) * 0.002 * intradayVolFactor * timeMultiplier;
      const barOpen = currentPrice;
      const change = currentPrice * (drift + noise);
      const barClose = Math.round((barOpen + change) * 10) / 10;

      const wickHigh = Math.max(barOpen, barClose) + Math.abs(rng.range(0.5, 8.0) * intradayVolFactor);
      const wickLow = Math.min(barOpen, barClose) - Math.abs(rng.range(0.5, 8.0) * intradayVolFactor);

      const barHigh = Math.round(wickHigh * 10) / 10;
      const barLow = Math.round(wickLow * 10) / 10;

      dayHigh = Math.max(dayHigh, barHigh);
      dayLow = Math.min(dayLow, barLow);
      currentPrice = barClose;

      // IV intraday decay (crush towards 15:30)
      const ivDecay = (minuteCount / 125) * 0.015;
      const currentIv = Math.max(0.08, dayBaseIv - ivDecay + (noise > 0 ? 0.002 : -0.002));

      candles.push({
        timestamp,
        time: timeStr,
        open: barOpen,
        high: barHigh,
        low: barLow,
        close: barClose,
        volume: Math.round(rng.range(20000, 150000)),
        iv: currentIv,
      });
    }
  }

  return {
    date: dateStr,
    dayOfWeek,
    underlying,
    openPrice,
    highPrice: dayHigh,
    lowPrice: dayLow,
    closePrice: currentPrice,
    regime,
    candles,
  };
}

// Pre-generate historical trading days for the backtesting calendar (e.g. 90 trading days)
export function getHistoricalMarketCalendar(
  underlying: UnderlyingIndex,
  daysCount: number = 75
): DayMarketData[] {
  const config = UNDERLYING_CONFIGS[underlying];
  let lastClose = config.baseSpotPrice;
  const days: DayMarketData[] = [];

  // Generate backwards from recent 2026/2025 dates
  const daysOfWeekMap: DayOfWeek[] = ['MON', 'TUE', 'WED', 'THU', 'FRI'];
  const baseDate = new Date(2026, 8, 20); // Sept 2026

  let added = 0;
  let curDate = new Date(baseDate.getTime() - daysCount * 1.5 * 86400000);

  let seed = underlying.charCodeAt(0) * 1000;

  while (added < daysCount) {
    const dayNum = curDate.getDay();
    if (dayNum >= 1 && dayNum <= 5) {
      // Mon to Fri
      const dayOfWeek = daysOfWeekMap[dayNum - 1];
      const yyyy = curDate.getFullYear();
      const mm = String(curDate.getMonth() + 1).padStart(2, '0');
      const dd = String(curDate.getDate()).padStart(2, '0');
      const dateStr = `${yyyy}-${mm}-${dd}`;

      seed += 137;
      const dayData = generateIntradayDayData(dateStr, dayOfWeek, underlying, lastClose, seed);
      lastClose = dayData.closePrice;
      days.push(dayData);
      added++;
    }
    curDate.setDate(curDate.getDate() + 1);
  }

  return days;
}
