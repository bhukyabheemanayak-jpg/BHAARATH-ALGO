export type UnderlyingIndex =
  | 'NIFTY'
  | 'BANKNIFTY'
  | 'FINNIFTY'
  | 'MIDCPNIFTY'
  | 'SENSEX'
  | 'CRUDEOIL'
  | 'NATURALGAS'
  | 'GOLD'
  | 'SILVER'
  | 'COPPER'
  | 'ZINC';

export type InstrumentType = 'CE' | 'PE' | 'FUT';
export type PositionAction = 'BUY' | 'SELL';
export type ExpiryType = 'WEEKLY' | 'NEXT_WEEKLY' | 'MONTHLY';

export type StrikeSelectionType = 'OFFSET' | 'CLOSEST_PREMIUM' | 'STRADDLE_WIDTH' | 'DELTA';

export type StrikeOffset = 
  | 'ITM_5' | 'ITM_4' | 'ITM_3' | 'ITM_2' | 'ITM_1'
  | 'ATM' 
  | 'OTM_1' | 'OTM_2' | 'OTM_3' | 'OTM_4' | 'OTM_5';

export type StopLossType = 'PERCENTAGE' | 'POINTS' | 'UNDERLYING_PTS' | 'UNDERLYING_PCT' | 'NONE';
export type TargetProfitType = 'PERCENTAGE' | 'POINTS' | 'UNDERLYING_PTS' | 'UNDERLYING_PCT' | 'NONE';

export interface TrailingSL {
  enabled: boolean;
  onProfitType: 'POINTS' | 'PERCENTAGE';
  onProfitValue: number;
  trailByType: 'POINTS' | 'PERCENTAGE';
  trailByValue: number;
}

export interface TrailingTarget {
  enabled: boolean;
  onProfitType: 'POINTS' | 'PERCENTAGE';
  onProfitValue: number;
  trailByType: 'POINTS' | 'PERCENTAGE';
  trailByValue: number;
}

export interface LockAndTrailProfit {
  enabled: boolean;
  triggerType: 'POINTS' | 'PERCENTAGE';
  triggerValue: number;
  lockType: 'POINTS' | 'PERCENTAGE';
  lockValue: number;
  trailEveryType: 'POINTS' | 'PERCENTAGE';
  trailEveryValue: number;
  trailByType: 'POINTS' | 'PERCENTAGE';
  trailByValue: number;
}

export type ReEntryType = 'NONE' | 'ASAP' | 'ASAP_REVERSE' | 'RE_COST' | 'RE_EXECUTE';
export type ReEntryTrigger = 'SL' | 'TARGET' | 'BOTH';

export interface ReEntryRule {
  type: ReEntryType;
  maxCount: number;
  triggerOn: ReEntryTrigger;
  slMaxCount?: number;
  targetMaxCount?: number;
}

export interface SimpleMomentum {
  enabled: boolean;
  type: 'POINTS_UP' | 'POINTS_DOWN' | 'PCT_UP' | 'PCT_DOWN';
  value: number;
}

export interface StrategyLeg {
  id: string;
  instrument: InstrumentType;
  action: PositionAction;
  lots: number;
  expiry: ExpiryType;
  strikeSelectionType: StrikeSelectionType;
  strikeOffset: StrikeOffset;
  closestPremiumTarget?: number;
  straddleWidthPct?: number;
  targetDelta?: number;
  stopLossType: StopLossType;
  stopLossValue: number;
  targetProfitType: TargetProfitType;
  targetProfitValue: number;
  trailingSL: TrailingSL;
  trailingTarget?: TrailingTarget;
  lockAndTrail?: LockAndTrailProfit;
  reEntry: ReEntryRule;
  momentum: SimpleMomentum;
}

export type DayOfWeek = 'MON' | 'TUE' | 'WED' | 'THU' | 'FRI';

export interface OverallRiskManagement {
  stopLossEnabled: boolean;
  stopLossType: 'MTM_AMOUNT' | 'MTM_PCT';
  stopLossValue: number;
  targetEnabled: boolean;
  targetType: 'MTM_AMOUNT' | 'MTM_PCT';
  targetValue: number;
  trailingTargetEnabled?: boolean;
  trailingTargetType?: 'MTM_AMOUNT' | 'MTM_PCT';
  trailingTargetStep?: number;
  trailingTargetValue?: number;
  lockAndTrailEnabled?: boolean;
  lockAndTrailTrigger?: number;
  lockAndTrailLockAmount?: number;
  lockAndTrailStepAmount?: number;
  lockAndTrailTrailAmount?: number;
  trailingEnabled: boolean;
  trailingTriggerProfit: number;
  trailingAmount: number;
}

export interface Strategy {
  id: string;
  name: string;
  description: string;
  underlying: UnderlyingIndex;
  strategyType: 'INTRADAY' | 'POSITIONAL';
  entryTime: string; // e.g. "09:20"
  exitTime: string;  // e.g. "15:15"
  daysToTrade: DayOfWeek[];
  legs: StrategyLeg[];
  overallRisk: OverallRiskManagement;
  squareOffType: 'COMPLETE' | 'PARTIAL';
  initialCapital: number;
  slippagePct: number;
  brokeragePerOrder: number;
  createdAt?: string;
  updatedAt?: string;
  isPreset?: boolean;
  tags?: string[];
  folderId?: string;
}

export interface StrategyFolder {
  id: string;
  name: string;
  color?: string; // 'emerald' | 'amber' | 'rose' | 'sky' | 'purple' | 'slate'
  description?: string;
  createdAt: string;
}

export type DTEOption = 'ANY' | '0' | '1' | '2' | '3' | '4' | 'CUSTOM';
export type PortfolioScheduleMode = 'WEEKDAYS' | 'DTE';

export interface PortfolioStrategyConfig {
  strategyId: string;
  strategyName: string;
  enabled: boolean;
  lotsMultiplier: number;
  scheduleMode?: PortfolioScheduleMode; // 'WEEKDAYS' | 'DTE'
  weekdays: DayOfWeek[];
  dteOption: DTEOption;
  customDteRange?: { min: number; max: number };
}

export interface TradingViewAlertConfig {
  id: string;
  name: string;
  description?: string;
  strategyId: string;
  strategyName: string;
  portfolioId?: string;
  portfolioName?: string;
  targetEnvironment: 'PAPER' | 'BROKER';
  brokerId?: 'ZERODHA' | 'ANGELONE' | 'DHAN' | 'FYERS' | 'UPSTOX';
  entrySignalId: string; // e.g. "ENTRY_STRAT_920"
  exitSignalId: string;  // e.g. "EXIT_STRAT_920"
  secretToken: string;
  webhookUrl: string;
  enabled: boolean;
  triggerCount: number;
  lastTriggeredAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TradingViewSignalLog {
  id: string;
  alertId: string;
  alertName: string;
  signalId: string;
  action: 'ENTRY' | 'EXIT';
  strategyName: string;
  timestamp: string;
  status: 'EXECUTED' | 'REJECTED' | 'SIMULATED';
  details: string;
  payload: Record<string, any>;
}

export interface PortfolioOverallRisk {
  maxLossEnabled: boolean;
  maxLoss: number;
  maxLossType: 'MTM_AMOUNT' | 'MTM_PCT';
  maxProfitEnabled: boolean;
  maxProfit: number;
  maxProfitType: 'MTM_AMOUNT' | 'MTM_PCT';
  lockAndTrailProfit: {
    enabled: boolean;
    triggerAmount: number;
    lockAmount: number;
    trailEvery: number;
    trailBy: number;
  };
}

export interface Portfolio {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  strategies: PortfolioStrategyConfig[];
  overallRisk: PortfolioOverallRisk;
  tags?: string[];
  isPreset?: boolean;
}

export interface UnderlyingConfig {
  symbol: UnderlyingIndex;
  displayName: string;
  lotSize: number;
  strikeInterval: number;
  baseSpotPrice: number;
  tradingHours: { start: string; end: string };
  volatilityRange: [number, number];
}

export interface TradeRecord {
  id: string;
  date: string;
  legId: string;
  instrument: InstrumentType;
  action: PositionAction;
  strike: number;
  lots: number;
  quantity: number;
  entryTime: string;
  entryPrice: number;
  exitTime: string;
  exitPrice: number;
  pnl: number;
  pnlPct: number;
  exitReason:
    | 'STOP_LOSS'
    | 'TARGET_PROFIT'
    | 'TRAIL_SL'
    | 'LOCK_TRAIL_SL'
    | 'SQUARE_OFF'
    | 'OVERALL_SL'
    | 'OVERALL_TARGET'
    | 'OVERALL_LOCK_TRAIL';
  brokerage: number;
  slippageCost: number;
  netPnl: number;
  reEntryIndex?: number;
  notes?: string;
}

export interface DailyResult {
  date: string;
  dayOfWeek: DayOfWeek;
  grossPnl: number;
  slippage: number;
  brokerageTaxes: number;
  netPnl: number;
  cumulativePnl: number;
  drawdown: number;
  drawdownPct: number;
  tradeCount: number;
  winningTrades: number;
  losingTrades: number;
}

export interface BacktestSummary {
  strategyName: string;
  underlying: UnderlyingIndex;
  period: { start: string; end: string; totalTradingDays: number };
  initialCapital: number;
  totalNetPnl: number;
  totalGrossPnl: number;
  totalBrokerageTaxes: number;
  totalSlippageCost: number;
  roiPct: number;
  winRatePct: number;
  lossRatePct: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  profitFactor: number;
  sharpeRatio: number;
  sortinoRatio: number;
  maxDrawdown: number;
  maxDrawdownPct: number;
  avgTradePnl: number;
  avgWinPnl: number;
  avgLossPnl: number;
  riskRewardRatio: number;
  expectancy: number;
  maxConsecutiveWins: number;
  maxConsecutiveLosses: number;
  dayWisePerformance: Record<DayOfWeek, { trades: number; pnl: number; winRate: number }>;
  monthlyPerformance: Record<string, number>; // "2024-01": 15200
  dailyResults: DailyResult[];
  tradeLog: TradeRecord[];
}

export interface PortfolioBacktestSummary {
  portfolioId: string;
  portfolioName: string;
  combinedSummary: BacktestSummary;
  strategySummaries: {
    strategyId: string;
    strategyName: string;
    lotsMultiplier: number;
    scheduleMode: PortfolioScheduleMode;
    summary: BacktestSummary;
  }[];
}

export interface OptionGreeks {
  price: number;
  delta: number;
  gamma: number;
  theta: number;
  vega: number;
  iv: number;
}

export interface PayoffPoint {
  spotPrice: number;
  pnlAtExpiry: number;
  pnlCurrent: number;
}

export interface StrategyPayoffAnalysis {
  underlyingSpot: number;
  maxProfit: number | 'UNLIMITED';
  maxLoss: number | 'UNLIMITED';
  riskRewardRatio: string;
  lowerBreakeven: number | null;
  upperBreakeven: number | null;
  netDelta: number;
  netTheta: number;
  netGamma: number;
  netVega: number;
  payoffPoints: PayoffPoint[];
}

export interface ActivePaperPosition {
  legId: string;
  originalLeg?: StrategyLeg;
  strategyId?: string;
  strategyName?: string;
  portfolioId?: string;
  portfolioName?: string;
  instrument: InstrumentType;
  action: PositionAction;
  strike: number;
  lots: number;
  quantity: number;
  entryPrice: number;
  currentLtp: number;
  unrealizedPnl: number;
  stopLossPrice: number | null;
  targetPrice: number | null;
  trailingSLPrice: number | null;
  highestProfitPts?: number;
  isLockActive?: boolean;
  lockedProfitPts?: number;
  targetTrailedSteps?: number;
  reEntryCount?: number;
  slReEntryCount?: number;
  targetReEntryCount?: number;
  status: 'ACTIVE' | 'STOP_LOSS_HIT' | 'TARGET_HIT' | 'SQUARED_OFF';
}
