import {
  InstrumentType,
  OptionGreeks,
  PayoffPoint,
  PositionAction,
  StrategyLeg,
  StrategyPayoffAnalysis,
  StrikeOffset,
  UnderlyingConfig,
  UnderlyingIndex,
} from '../types/trading';

export const UNDERLYING_CONFIGS: Record<UnderlyingIndex, UnderlyingConfig> = {
  NIFTY: {
    symbol: 'NIFTY',
    displayName: 'NIFTY 50',
    lotSize: 25,
    strikeInterval: 50,
    baseSpotPrice: 23500,
    tradingHours: { start: '09:15', end: '15:30' },
    volatilityRange: [0.11, 0.16],
  },
  BANKNIFTY: {
    symbol: 'BANKNIFTY',
    displayName: 'BANK NIFTY',
    lotSize: 15,
    strikeInterval: 100,
    baseSpotPrice: 50200,
    tradingHours: { start: '09:15', end: '15:30' },
    volatilityRange: [0.13, 0.20],
  },
  FINNIFTY: {
    symbol: 'FINNIFTY',
    displayName: 'FIN NIFTY',
    lotSize: 25,
    strikeInterval: 50,
    baseSpotPrice: 24100,
    tradingHours: { start: '09:15', end: '15:30' },
    volatilityRange: [0.12, 0.18],
  },
  SENSEX: {
    symbol: 'SENSEX',
    displayName: 'BSE SENSEX',
    lotSize: 10,
    strikeInterval: 100,
    baseSpotPrice: 77500,
    tradingHours: { start: '09:15', end: '15:30' },
    volatilityRange: [0.11, 0.16],
  },
  MIDCPNIFTY: {
    symbol: 'MIDCPNIFTY',
    displayName: 'MIDCAP NIFTY',
    lotSize: 50,
    strikeInterval: 25,
    baseSpotPrice: 12400,
    tradingHours: { start: '09:15', end: '15:30' },
    volatilityRange: [0.14, 0.22],
  },
  CRUDEOIL: {
    symbol: 'CRUDEOIL',
    displayName: 'MCX CRUDE OIL',
    lotSize: 100,
    strikeInterval: 50,
    baseSpotPrice: 6250,
    tradingHours: { start: '09:00', end: '23:30' },
    volatilityRange: [0.24, 0.42],
  },
  NATURALGAS: {
    symbol: 'NATURALGAS',
    displayName: 'MCX NATURAL GAS',
    lotSize: 1250,
    strikeInterval: 5,
    baseSpotPrice: 245,
    tradingHours: { start: '09:00', end: '23:30' },
    volatilityRange: [0.35, 0.65],
  },
  GOLD: {
    symbol: 'GOLD',
    displayName: 'MCX GOLD',
    lotSize: 100,
    strikeInterval: 250,
    baseSpotPrice: 76500,
    tradingHours: { start: '09:00', end: '23:30' },
    volatilityRange: [0.11, 0.17],
  },
  SILVER: {
    symbol: 'SILVER',
    displayName: 'MCX SILVER',
    lotSize: 30,
    strikeInterval: 500,
    baseSpotPrice: 89500,
    tradingHours: { start: '09:00', end: '23:30' },
    volatilityRange: [0.16, 0.28],
  },
  COPPER: {
    symbol: 'COPPER',
    displayName: 'MCX COPPER',
    lotSize: 2500,
    strikeInterval: 5,
    baseSpotPrice: 840,
    tradingHours: { start: '09:00', end: '23:30' },
    volatilityRange: [0.14, 0.24],
  },
  ZINC: {
    symbol: 'ZINC',
    displayName: 'MCX ZINC',
    lotSize: 5000,
    strikeInterval: 2.5,
    baseSpotPrice: 265,
    tradingHours: { start: '09:00', end: '23:30' },
    volatilityRange: [0.15, 0.26],
  },
};

// Cumulative standard normal distribution approximation (Abramowitz & Stegun)
function normalCdf(x: number): number {
  const b1 = 0.319381530;
  const b2 = -0.356563782;
  const b3 = 1.781477937;
  const b4 = -1.821255978;
  const b5 = 1.330274429;
  const p = 0.2316419;
  const c = 0.39894228;

  if (x >= 0.0) {
    const t = 1.0 / (1.0 + p * x);
    return (1.0 - c * Math.exp(-x * x / 2.0) * t *
      (t * (t * (t * (t * b5 + b4) + b3) + b2) + b1));
  } else {
    const t = 1.0 / (1.0 - p * x);
    return (c * Math.exp(-x * x / 2.0) * t *
      (t * (t * (t * (t * b5 + b4) + b3) + b2) + b1));
  }
}

function normalPdf(x: number): number {
  return Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);
}

const RISK_FREE_RATE = 0.065; // ~6.5% Indian Repo Rate proxy

export function calculateOptionGreeks(
  spot: number,
  strike: number,
  timeToExpiryYears: number,
  iv: number,
  type: InstrumentType,
  r: number = RISK_FREE_RATE
): OptionGreeks {
  if (type === 'FUT') {
    return {
      price: spot * Math.exp(r * Math.max(0.0001, timeToExpiryYears)),
      delta: 1.0,
      gamma: 0.0,
      theta: 0.0,
      vega: 0.0,
      iv: 0.0,
    };
  }

  const T = Math.max(0.0001, timeToExpiryYears); // avoid div by zero
  const sigma = Math.max(0.01, iv);

  const sqrtT = Math.sqrt(T);
  const d1 = (Math.log(spot / strike) + (r + 0.5 * sigma * sigma) * T) / (sigma * sqrtT);
  const d2 = d1 - sigma * sqrtT;

  const nd1 = normalCdf(d1);
  const nd2 = normalCdf(d2);
  const n_neg_d1 = normalCdf(-d1);
  const n_neg_d2 = normalCdf(-d2);
  const npdf_d1 = normalPdf(d1);

  let price = 0;
  let delta = 0;
  let theta = 0;

  if (type === 'CE') {
    price = spot * nd1 - strike * Math.exp(-r * T) * nd2;
    delta = nd1;
    // Theta in ₹/day
    theta = (-(spot * npdf_d1 * sigma) / (2 * sqrtT) - r * strike * Math.exp(-r * T) * nd2) / 365;
  } else {
    // PE
    price = strike * Math.exp(-r * T) * n_neg_d2 - spot * n_neg_d1;
    delta = nd1 - 1.0;
    theta = (-(spot * npdf_d1 * sigma) / (2 * sqrtT) + r * strike * Math.exp(-r * T) * n_neg_d2) / 365;
  }

  // Minimum option intrinsic
  const intrinsic = type === 'CE' ? Math.max(0, spot - strike) : Math.max(0, strike - spot);
  price = Math.max(price, intrinsic);

  const gamma = npdf_d1 / (spot * sigma * sqrtT);
  // Vega per 1% IV change
  const vega = (spot * sqrtT * npdf_d1) / 100;

  return {
    price: Math.round(price * 100) / 100,
    delta: Math.round(delta * 1000) / 1000,
    gamma: Math.round(gamma * 100000) / 100000,
    theta: Math.round(theta * 100) / 100,
    vega: Math.round(vega * 100) / 100,
    iv: Math.round(iv * 1000) / 10,
  };
}

export function getAtmStrike(spot: number, interval: number): number {
  return Math.round(spot / interval) * interval;
}

export function resolveStrikeFromOffset(
  spot: number,
  interval: number,
  instrument: InstrumentType,
  offset: StrikeOffset
): number {
  const atm = getAtmStrike(spot, interval);
  if (offset === 'ATM') return atm;

  const stepsMatch = offset.match(/(ITM|OTM)_(\d+)/);
  if (!stepsMatch) return atm;

  const direction = stepsMatch[1];
  const steps = parseInt(stepsMatch[2], 10);

  if (instrument === 'CE') {
    // For Calls: ITM is lower strikes, OTM is higher strikes
    return direction === 'ITM' ? atm - steps * interval : atm + steps * interval;
  } else if (instrument === 'PE') {
    // For Puts: ITM is higher strikes, OTM is lower strikes
    return direction === 'ITM' ? atm + steps * interval : atm - steps * interval;
  }

  return atm;
}

export function findStrikeByClosestPremium(
  spot: number,
  interval: number,
  type: InstrumentType,
  targetPremium: number,
  timeToExpiryYears: number,
  iv: number
): { strike: number; price: number } {
  const atm = getAtmStrike(spot, interval);
  let bestStrike = atm;
  let minDiff = Infinity;
  let bestPrice = 0;

  // Search +/- 15 strikes around ATM
  for (let step = -15; step <= 15; step++) {
    const candidateStrike = atm + step * interval;
    if (candidateStrike <= 0) continue;
    const greeks = calculateOptionGreeks(spot, candidateStrike, timeToExpiryYears, iv, type);
    const diff = Math.abs(greeks.price - targetPremium);
    if (diff < minDiff) {
      minDiff = diff;
      bestStrike = candidateStrike;
      bestPrice = greeks.price;
    }
  }

  return { strike: bestStrike, price: bestPrice };
}

export function findStrikeByTargetDelta(
  spot: number,
  interval: number,
  type: InstrumentType,
  targetDelta: number, // e.g. 0.30
  timeToExpiryYears: number,
  iv: number
): { strike: number; price: number; delta: number } {
  const atm = getAtmStrike(spot, interval);
  let bestStrike = atm;
  let minDiff = Infinity;
  let bestPrice = 0;
  let bestDelta = 0;

  for (let step = -15; step <= 15; step++) {
    const candidateStrike = atm + step * interval;
    if (candidateStrike <= 0) continue;
    const greeks = calculateOptionGreeks(spot, candidateStrike, timeToExpiryYears, iv, type);
    const absDelta = Math.abs(greeks.delta);
    const diff = Math.abs(absDelta - Math.abs(targetDelta));
    if (diff < minDiff) {
      minDiff = diff;
      bestStrike = candidateStrike;
      bestPrice = greeks.price;
      bestDelta = greeks.delta;
    }
  }

  return { strike: bestStrike, price: bestPrice, delta: bestDelta };
}

export function resolveLegStrike(
  leg: StrategyLeg,
  spot: number,
  config: UnderlyingConfig,
  timeToExpiryYears: number,
  iv: number
): { strike: number; initialPrice: number } {
  const { strikeInterval } = config;

  if (leg.instrument === 'FUT') {
    return { strike: spot, initialPrice: spot };
  }

  if (leg.strikeSelectionType === 'OFFSET') {
    const strike = resolveStrikeFromOffset(spot, strikeInterval, leg.instrument, leg.strikeOffset);
    const greeks = calculateOptionGreeks(spot, strike, timeToExpiryYears, iv, leg.instrument);
    return { strike, initialPrice: greeks.price };
  }

  if (leg.strikeSelectionType === 'CLOSEST_PREMIUM' && leg.closestPremiumTarget) {
    const res = findStrikeByClosestPremium(
      spot,
      strikeInterval,
      leg.instrument,
      leg.closestPremiumTarget,
      timeToExpiryYears,
      iv
    );
    return { strike: res.strike, initialPrice: res.price };
  }

  if (leg.strikeSelectionType === 'DELTA' && leg.targetDelta) {
    const res = findStrikeByTargetDelta(
      spot,
      strikeInterval,
      leg.instrument,
      leg.targetDelta,
      timeToExpiryYears,
      iv
    );
    return { strike: res.strike, initialPrice: res.price };
  }

  // Default fallback: ATM
  const atm = getAtmStrike(spot, strikeInterval);
  const greeks = calculateOptionGreeks(spot, atm, timeToExpiryYears, iv, leg.instrument);
  return { strike: atm, initialPrice: greeks.price };
}

export function calculateStrategyPayoff(
  legs: StrategyLeg[],
  underlying: UnderlyingIndex,
  currentSpot: number,
  daysToExpiry: number = 3,
  iv: number = 0.14
): StrategyPayoffAnalysis {
  const config = UNDERLYING_CONFIGS[underlying];
  const { lotSize, strikeInterval } = config;
  const timeToExpiryYears = daysToExpiry / 365;

  // Resolve current strikes & premiums for all active legs
  const resolvedLegs = legs.map((leg) => {
    const { strike, initialPrice } = resolveLegStrike(
      leg,
      currentSpot,
      config,
      timeToExpiryYears,
      iv
    );
    const greeks = calculateOptionGreeks(currentSpot, strike, timeToExpiryYears, iv, leg.instrument);
    const quantity = leg.lots * lotSize;
    const sign = leg.action === 'BUY' ? 1 : -1;

    return {
      leg,
      strike,
      entryPrice: initialPrice,
      quantity,
      sign,
      greeks,
    };
  });

  // Calculate Net Greeks
  let netDelta = 0;
  let netTheta = 0;
  let netGamma = 0;
  let netVega = 0;

  for (const item of resolvedLegs) {
    netDelta += item.sign * item.greeks.delta * item.quantity;
    netTheta += item.sign * item.greeks.theta * item.quantity;
    netGamma += item.sign * item.greeks.gamma * item.quantity;
    netVega += item.sign * item.greeks.vega * item.quantity;
  }

  // Payoff across spot range (+/- 8% of spot)
  const rangePct = 0.08;
  const minSpot = Math.round((currentSpot * (1 - rangePct)) / strikeInterval) * strikeInterval;
  const maxSpot = Math.round((currentSpot * (1 + rangePct)) / strikeInterval) * strikeInterval;
  const steps = 70;
  const stepSize = (maxSpot - minSpot) / steps;

  const payoffPoints: PayoffPoint[] = [];
  let maxProfit = -Infinity;
  let maxLoss = Infinity;
  const breakevens: number[] = [];

  let prevPnlAtExpiry: number | null = null;
  let prevSpot: number | null = null;

  for (let s = minSpot; s <= maxSpot; s += stepSize) {
    const spot = Math.round(s);
    let pnlAtExpiry = 0;
    let pnlCurrent = 0;

    for (const item of resolvedLegs) {
      const { leg, strike, entryPrice, quantity, sign } = item;

      // Expiry Payoff
      let expiryValue = 0;
      if (leg.instrument === 'CE') {
        expiryValue = Math.max(0, spot - strike);
      } else if (leg.instrument === 'PE') {
        expiryValue = Math.max(0, strike - spot);
      } else {
        expiryValue = spot;
      }
      const legExpiryPnl = sign * (expiryValue - entryPrice) * quantity;
      pnlAtExpiry += legExpiryPnl;

      // Current T+0 Payoff (with remaining time decay / IV)
      const currentGreeks = calculateOptionGreeks(
        spot,
        strike,
        timeToExpiryYears * 0.7, // halfway through
        iv,
        leg.instrument
      );
      const legCurrentPnl = sign * (currentGreeks.price - entryPrice) * quantity;
      pnlCurrent += legCurrentPnl;
    }

    if (pnlAtExpiry > maxProfit) maxProfit = pnlAtExpiry;
    if (pnlAtExpiry < maxLoss) maxLoss = pnlAtExpiry;

    // Detect zero crossings for breakeven points
    if (prevPnlAtExpiry !== null && prevSpot !== null) {
      if ((prevPnlAtExpiry < 0 && pnlAtExpiry >= 0) || (prevPnlAtExpiry > 0 && pnlAtExpiry <= 0)) {
        // Linear interpolation
        const fraction = Math.abs(prevPnlAtExpiry) / (Math.abs(prevPnlAtExpiry) + Math.abs(pnlAtExpiry));
        const beSpot = Math.round(prevSpot + fraction * (spot - prevSpot));
        breakevens.push(beSpot);
      }
    }

    prevPnlAtExpiry = pnlAtExpiry;
    prevSpot = spot;

    payoffPoints.push({
      spotPrice: spot,
      pnlAtExpiry: Math.round(pnlAtExpiry),
      pnlCurrent: Math.round(pnlCurrent),
    });
  }

  // Check if unlimited profit or loss (e.g. naked short or naked long)
  let isMaxProfitUnlimited = false;
  let isMaxLossUnlimited = false;

  for (const item of resolvedLegs) {
    if (item.leg.instrument === 'CE' && item.sign === -1) {
      isMaxLossUnlimited = true; // Short Call has unlimited risk
    }
    if (item.leg.instrument === 'PE' && item.sign === -1) {
      // Short put has large capped risk down to 0
    }
    if (item.leg.instrument === 'CE' && item.sign === 1) {
      isMaxProfitUnlimited = true; // Long Call has unlimited profit
    }
  }

  return {
    underlyingSpot: currentSpot,
    maxProfit: isMaxProfitUnlimited ? 'UNLIMITED' : Math.round(maxProfit),
    maxLoss: isMaxLossUnlimited ? 'UNLIMITED' : Math.round(maxLoss),
    riskRewardRatio:
      isMaxLossUnlimited || isMaxProfitUnlimited
        ? 'Undefined'
        : `1 : ${Math.abs(maxProfit / (maxLoss || 1)).toFixed(2)}`,
    lowerBreakeven: breakevens.length > 0 ? Math.min(...breakevens) : null,
    upperBreakeven: breakevens.length > 1 ? Math.max(...breakevens) : null,
    netDelta: Math.round(netDelta * 100) / 100,
    netTheta: Math.round(netTheta),
    netGamma: Math.round(netGamma * 1000) / 1000,
    netVega: Math.round(netVega),
    payoffPoints,
  };
}
