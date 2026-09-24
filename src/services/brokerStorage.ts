import { InstrumentType } from '../types/trading';

export type BrokerId =
  | 'ZERODHA'
  | 'ANGELONE'
  | 'DHAN'
  | 'FYERS'
  | 'UPSTOX'
  | 'GROWW'
  | 'SHOONYA'
  | 'KOTAK_NEO'
  | 'ICICI_DIRECT';

export interface BrokerInfoMeta {
  id: BrokerId;
  name: string;
  tag: string;
  authType: string;
  docsUrl: string;
  popular: boolean;
}

export const SUPPORTED_BROKERS: BrokerInfoMeta[] = [
  {
    id: 'ZERODHA',
    name: 'Zerodha Kite Connect',
    tag: 'Direct API',
    authType: 'API Key + Request Token / TOTP',
    docsUrl: 'https://kite.trade/docs/connect/v3/',
    popular: true,
  },
  {
    id: 'ANGELONE',
    name: 'Angel One SmartAPI',
    tag: 'SmartAPI',
    authType: 'Client Code + Password + TOTP',
    docsUrl: 'https://smartapi.angelbroking.com/',
    popular: true,
  },
  {
    id: 'DHAN',
    name: 'DhanHQ SuperFast API',
    tag: 'Direct Webhook / API',
    authType: 'Client ID + Access Token',
    docsUrl: 'https://dhanhq.co/',
    popular: true,
  },
  {
    id: 'FYERS',
    name: 'Fyers API v3',
    tag: 'REST & WebSocket',
    authType: 'App ID + Secret Key + Auth Code',
    docsUrl: 'https://myapi.fyers.in/docsv3',
    popular: true,
  },
  {
    id: 'UPSTOX',
    name: 'Upstox Pro API',
    tag: 'HFT API',
    authType: 'API Key + Secret + OAuth2',
    docsUrl: 'https://upstox.com/developer/api-documentation/',
    popular: true,
  },
  {
    id: 'GROWW',
    name: 'Groww Direct API',
    tag: 'Algo Gateway',
    authType: 'API Key + Token',
    docsUrl: 'https://groww.in/',
    popular: false,
  },
  {
    id: 'SHOONYA',
    name: 'Finvasia Shoonya',
    tag: 'Zero Brokerage API',
    authType: 'User ID + Password + 2FA / TOTP',
    docsUrl: 'https://shoonya.com/',
    popular: false,
  },
  {
    id: 'KOTAK_NEO',
    name: 'Kotak Neo Trade API',
    tag: 'Direct Trading',
    authType: 'Consumer Key + Secret + Neo Token',
    docsUrl: 'https://www.kotaksecurities.com/neo-api/',
    popular: false,
  },
  {
    id: 'ICICI_DIRECT',
    name: 'ICICI Direct Breeze',
    tag: 'Breeze API',
    authType: 'App Key + Secret Key + Session Token',
    docsUrl: 'https://api.icicidirect.com/breezeapi/',
    popular: false,
  },
];

export interface BrokerConnection {
  id: BrokerId;
  name: string;
  tag: string;
  clientId: string;
  apiKey: string;
  apiSecret?: string;
  totpKey?: string;
  redirectUrl?: string;
  isConnected: boolean;
  connectedAt?: string;
  tokenExpiresAt?: string;
  availableMargin: number;
  usedMargin: number;
  latencyMs: number;
  dailyOrdersRemaining: number;
  lastPingTime?: string;
}

export interface LiveDeploymentLeg {
  id: string;
  instrument: InstrumentType;
  action: 'BUY' | 'SELL';
  strike: number;
  lots: number;
  entryPrice: number;
  currentPrice: number;
  pnl: number;
  status: 'OPEN' | 'CLOSED';
  exitReason?: string;
}

export interface LiveDeploymentConfig {
  id: string;
  deploymentType: 'STRATEGY' | 'PORTFOLIO';
  targetId: string; // strategyId or portfolioId
  name: string;
  underlying: string;
  brokerId: BrokerId;
  brokerName: string;
  status: 'ACTIVE' | 'PAUSED' | 'SQUARED_OFF' | 'STOPPED';
  deployedAt: string;
  capitalAllocated: number;
  multiplier: number;
  orderType: 'MARKET' | 'LIMIT_BUFFER';
  limitBufferPts: number;
  currentPnl: number;
  realizedPnl: number;
  unrealizedPnl: number;
  maxDrawdown: number;
  peakPnl: number;
  legs: LiveDeploymentLeg[];
  overallRisk?: {
    maxLossEnabled: boolean;
    maxLoss: number;
    maxProfitEnabled: boolean;
    maxProfit: number;
  };
}

export interface LiveOrderRecord {
  orderId: string;
  deploymentId: string;
  deploymentName: string;
  brokerId: BrokerId;
  timestamp: string;
  symbol: string;
  action: 'BUY' | 'SELL';
  lots: number;
  quantity: number;
  price: number;
  status: 'COMPLETE' | 'TRIGGER_PENDING' | 'REJECTED' | 'CANCELLED';
  message: string;
}

export interface ExecutionSettings {
  orderType: 'MARKET' | 'LIMIT';
  limitBufferType: 'POINTS' | 'PERCENTAGE';
  limitBufferValue: number;
  priceProtectionEnabled: boolean;
  priceProtectionPct: number;
  legSequence: 'BUY_FIRST' | 'PARALLEL' | 'SEQUENTIAL';
  legDelayMs: number;
  autoSliceEnabled: boolean;
  niftySliceQty: number;
  bankNiftySliceQty: number;
  finNiftySliceQty: number;
  sliceDelayMs: number;
  retryOnFailure: boolean;
  maxRetries: number;
  retryIntervalMs: number;
  unfilledOrderAction: 'CANCEL' | 'CONVERT_TO_MARKET' | 'KEEP_OPEN';
  unfilledTimeoutSeconds: number;
  autoSquareOffTime: string;
  cancelPendingOrdersOnSquareOff: boolean;
  killSwitchMaxLoss: number;
  killSwitchEnabled: boolean;
  maxSlippageTolerancePct: number;
}

export const DEFAULT_EXECUTION_SETTINGS: ExecutionSettings = {
  orderType: 'LIMIT',
  limitBufferType: 'POINTS',
  limitBufferValue: 0.5,
  priceProtectionEnabled: true,
  priceProtectionPct: 3.0,
  legSequence: 'BUY_FIRST',
  legDelayMs: 250,
  autoSliceEnabled: true,
  niftySliceQty: 1800,
  bankNiftySliceQty: 900,
  finNiftySliceQty: 1800,
  sliceDelayMs: 150,
  retryOnFailure: true,
  maxRetries: 3,
  retryIntervalMs: 500,
  unfilledOrderAction: 'CONVERT_TO_MARKET',
  unfilledTimeoutSeconds: 10,
  autoSquareOffTime: '15:20',
  cancelPendingOrdersOnSquareOff: true,
  killSwitchMaxLoss: 15000,
  killSwitchEnabled: true,
  maxSlippageTolerancePct: 2.0,
};

const EXECUTION_SETTINGS_KEY = 'algotest_execution_settings_v2';

export function getExecutionSettings(): ExecutionSettings {
  try {
    const raw = localStorage.getItem(EXECUTION_SETTINGS_KEY);
    if (!raw) {
      localStorage.setItem(EXECUTION_SETTINGS_KEY, JSON.stringify(DEFAULT_EXECUTION_SETTINGS));
      return DEFAULT_EXECUTION_SETTINGS;
    }
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_EXECUTION_SETTINGS, ...parsed };
  } catch {
    return DEFAULT_EXECUTION_SETTINGS;
  }
}

export function saveExecutionSettings(settings: ExecutionSettings): void {
  localStorage.setItem(EXECUTION_SETTINGS_KEY, JSON.stringify(settings));
}

const BROKERS_KEY = 'algotest_broker_connections_v2';
const LIVE_DEPLOYMENTS_KEY = 'algotest_live_deployments_v2';
const LIVE_ORDERS_KEY = 'algotest_live_orders_v2';

const DEFAULT_CONNECTED_BROKER: BrokerConnection = {
  id: 'ZERODHA',
  name: 'Zerodha Kite Connect',
  tag: 'Direct API',
  clientId: 'ZT8842',
  apiKey: 'kite_prod_api_key_8842',
  apiSecret: '••••••••••••••••••••••••',
  totpKey: 'JBSWY3DPEHPK3PXP',
  isConnected: true,
  connectedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
  tokenExpiresAt: new Date(Date.now() + 3600000 * 6).toISOString(),
  availableMargin: 854000,
  usedMargin: 125000,
  latencyMs: 14,
  dailyOrdersRemaining: 188,
  lastPingTime: new Date().toLocaleTimeString(),
};

/**
 * Retrieve broker connections
 */
export function getBrokerConnections(): BrokerConnection[] {
  try {
    const raw = localStorage.getItem(BROKERS_KEY);
    if (!raw) {
      localStorage.setItem(BROKERS_KEY, JSON.stringify([DEFAULT_CONNECTED_BROKER]));
      return [DEFAULT_CONNECTED_BROKER];
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : [DEFAULT_CONNECTED_BROKER];
  } catch {
    return [DEFAULT_CONNECTED_BROKER];
  }
}

/**
 * Save broker connection
 */
export function saveBrokerConnection(conn: BrokerConnection): void {
  const current = getBrokerConnections();
  const index = current.findIndex((c) => c.id === conn.id);
  if (index >= 0) {
    current[index] = conn;
  } else {
    current.push(conn);
  }
  localStorage.setItem(BROKERS_KEY, JSON.stringify(current));
}

/**
 * Disconnect broker
 */
export function disconnectBroker(brokerId: BrokerId): void {
  const current = getBrokerConnections();
  const updated = current.map((c) =>
    c.id === brokerId ? { ...c, isConnected: false } : c
  );
  localStorage.setItem(BROKERS_KEY, JSON.stringify(updated));
}

/**
 * Get active connected broker
 */
export function getActiveBroker(): BrokerConnection | null {
  const current = getBrokerConnections();
  return current.find((c) => c.isConnected) || null;
}

/**
 * Live Deployments management
 */
export function getLiveDeployments(): LiveDeploymentConfig[] {
  try {
    const raw = localStorage.getItem(LIVE_DEPLOYMENTS_KEY);
    if (!raw) {
      // Seed an initial active live deployment
      const initial: LiveDeploymentConfig[] = [
        {
          id: 'live_dep_920_straddle',
          deploymentType: 'STRATEGY',
          targetId: 'tpl_920_short_straddle',
          name: '9:20 AM Short Straddle (Live)',
          underlying: 'NIFTY',
          brokerId: 'ZERODHA',
          brokerName: 'Zerodha Kite Connect',
          status: 'ACTIVE',
          deployedAt: new Date(Date.now() - 3600000 * 1.5).toISOString(),
          capitalAllocated: 300000,
          multiplier: 2,
          orderType: 'LIMIT_BUFFER',
          limitBufferPts: 0.5,
          currentPnl: 3450,
          realizedPnl: 0,
          unrealizedPnl: 3450,
          maxDrawdown: 450,
          peakPnl: 3800,
          legs: [
            {
              id: 'leg_1_ce',
              instrument: 'CE',
              action: 'SELL',
              strike: 22400,
              lots: 2,
              entryPrice: 112.5,
              currentPrice: 94.2,
              pnl: 1830,
              status: 'OPEN',
            },
            {
              id: 'leg_2_pe',
              instrument: 'PE',
              action: 'SELL',
              strike: 22400,
              lots: 2,
              entryPrice: 108.0,
              currentPrice: 91.8,
              pnl: 1620,
              status: 'OPEN',
            },
          ],
          overallRisk: {
            maxLossEnabled: true,
            maxLoss: 6000,
            maxProfitEnabled: true,
            maxProfit: 12000,
          },
        },
      ];
      localStorage.setItem(LIVE_DEPLOYMENTS_KEY, JSON.stringify(initial));
      return initial;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveLiveDeployment(dep: LiveDeploymentConfig): void {
  const current = getLiveDeployments();
  const index = current.findIndex((d) => d.id === dep.id);
  if (index >= 0) {
    current[index] = dep;
  } else {
    current.unshift(dep);
  }
  localStorage.setItem(LIVE_DEPLOYMENTS_KEY, JSON.stringify(current));
}

export function deleteLiveDeployment(id: string): void {
  const current = getLiveDeployments();
  const filtered = current.filter((d) => d.id !== id);
  localStorage.setItem(LIVE_DEPLOYMENTS_KEY, JSON.stringify(filtered));
}

export function updateLiveDeploymentStatus(
  id: string,
  status: LiveDeploymentConfig['status']
): void {
  const current = getLiveDeployments();
  const updated = current.map((d) => (d.id === id ? { ...d, status } : d));
  localStorage.setItem(LIVE_DEPLOYMENTS_KEY, JSON.stringify(updated));
}

/**
 * Live Orders Management
 */
export function getLiveOrders(): LiveOrderRecord[] {
  try {
    const raw = localStorage.getItem(LIVE_ORDERS_KEY);
    if (!raw) {
      const initialOrders: LiveOrderRecord[] = [
        {
          orderId: 'ORD_240924_884102',
          deploymentId: 'live_dep_920_straddle',
          deploymentName: '9:20 AM Short Straddle (Live)',
          brokerId: 'ZERODHA',
          timestamp: '09:20:01 AM',
          symbol: 'NIFTY24SEP22400CE',
          action: 'SELL',
          lots: 2,
          quantity: 100,
          price: 112.5,
          status: 'COMPLETE',
          message: 'Order filled on NSE at ₹112.50',
        },
        {
          orderId: 'ORD_240924_884103',
          deploymentId: 'live_dep_920_straddle',
          deploymentName: '9:20 AM Short Straddle (Live)',
          brokerId: 'ZERODHA',
          timestamp: '09:20:01 AM',
          symbol: 'NIFTY24SEP22400PE',
          action: 'SELL',
          lots: 2,
          quantity: 100,
          price: 108.0,
          status: 'COMPLETE',
          message: 'Order filled on NSE at ₹108.00',
        },
      ];
      localStorage.setItem(LIVE_ORDERS_KEY, JSON.stringify(initialOrders));
      return initialOrders;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function addLiveOrder(order: LiveOrderRecord): void {
  const current = getLiveOrders();
  current.unshift(order);
  localStorage.setItem(LIVE_ORDERS_KEY, JSON.stringify(current.slice(0, 100)));
}

export function clearLiveOrders(): void {
  localStorage.setItem(LIVE_ORDERS_KEY, JSON.stringify([]));
}
