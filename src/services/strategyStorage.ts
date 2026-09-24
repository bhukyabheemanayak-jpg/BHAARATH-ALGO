import { STRATEGY_TEMPLATES } from '../data/strategyTemplates';
import {
  Portfolio,
  Strategy,
  StrategyFolder,
  TradingViewAlertConfig,
  TradingViewSignalLog,
} from '../types/trading';

const STRATEGIES_STORAGE_KEY = 'algotest_saved_strategies_v1';
const PORTFOLIOS_STORAGE_KEY = 'algotest_saved_portfolios_v1';
const STRATEGY_FOLDERS_STORAGE_KEY = 'bhaarath_strategy_folders_v1';

export const DEFAULT_STRATEGY_FOLDERS: StrategyFolder[] = [
  {
    id: 'fld_mcx',
    name: 'MCX Commodities',
    color: 'amber',
    description: 'Crude Oil, Natural Gas, Gold & Silver commodity options and futures strategies',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'fld_straddles',
    name: 'Intraday Straddles & Strangles',
    color: 'emerald',
    description: 'High-theta non-directional ATM/OTM options strategies',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'fld_directional',
    name: 'Directional Spreads',
    color: 'sky',
    description: 'Bull call and bear put hedged vertical spreads',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'fld_iron_condor',
    name: 'Iron Condors & Wings',
    color: 'purple',
    description: 'Defined-risk 4-legged options structures with wide breakevens',
    createdAt: new Date().toISOString(),
  },
];

// Initial pre-configured portfolios representing real Algotest multi-strategy systems
const DEFAULT_PORTFOLIOS: Portfolio[] = [
  {
    id: 'port_intraday_alpha',
    name: 'Intraday Options Alpha',
    description: 'High Sharpe ratio multi-index portfolio running Short Straddles and Directional Spreads tuned for theta capture and risk-mitigated tail risk.',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isPreset: true,
    tags: ['Intraday', 'Theta Decay', 'Nifty & BankNifty'],
    overallRisk: {
      maxLossEnabled: true,
      maxLoss: 12000,
      maxLossType: 'MTM_AMOUNT',
      maxProfitEnabled: true,
      maxProfit: 25000,
      maxProfitType: 'MTM_AMOUNT',
      lockAndTrailProfit: {
        enabled: true,
        triggerAmount: 15000,
        lockAmount: 8000,
        trailEvery: 3000,
        trailBy: 2000,
      },
    },
    strategies: [
      {
        strategyId: 'tpl_920_short_straddle',
        strategyName: '9:20 AM Short Straddle',
        enabled: true,
        lotsMultiplier: 2,
        weekdays: ['MON', 'TUE', 'WED', 'THU', 'FRI'],
        dteOption: 'ANY',
      },
      {
        strategyId: 'tpl_iron_condor',
        strategyName: 'Weekly Iron Condor',
        enabled: true,
        lotsMultiplier: 1,
        weekdays: ['MON', 'TUE', 'WED'],
        dteOption: '2',
      },
    ],
  },
  {
    id: 'port_zero_dte_expiry',
    name: '0 DTE Expiry Day Gamma Crusher',
    description: 'Deploys ATM straddles and dynamic lock-and-trail wings specifically on 0 DTE expiry days (Thu for Nifty, Wed for BankNifty) to maximize rapid time decay.',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isPreset: true,
    tags: ['0 DTE', 'Expiry Day', 'Dynamic Trailing'],
    overallRisk: {
      maxLossEnabled: true,
      maxLoss: 15000,
      maxLossType: 'MTM_AMOUNT',
      maxProfitEnabled: true,
      maxProfit: 35000,
      maxProfitType: 'MTM_AMOUNT',
      lockAndTrailProfit: {
        enabled: true,
        triggerAmount: 18000,
        lockAmount: 10000,
        trailEvery: 4000,
        trailBy: 2500,
      },
    },
    strategies: [
      {
        strategyId: 'tpl_920_short_straddle',
        strategyName: '9:20 AM Short Straddle',
        enabled: true,
        lotsMultiplier: 3,
        weekdays: ['WED', 'THU'],
        dteOption: '0', // Expiry day only!
      },
      {
        strategyId: 'tpl_calendar_put_spread',
        strategyName: 'Bear Put Spread (Hedge)',
        enabled: true,
        lotsMultiplier: 2,
        weekdays: ['WED', 'THU'],
        dteOption: '0',
      },
    ],
  },
];

/**
 * Retrieve all saved strategies from localStorage.
 * If empty, seeds with default templates marked with isPreset: true.
 */
export function getSavedStrategies(): Strategy[] {
  try {
    const raw = localStorage.getItem(STRATEGIES_STORAGE_KEY);
    if (!raw) {
      // Seed with templates
      const seeded: Strategy[] = STRATEGY_TEMPLATES.map((tpl) => ({
        ...tpl,
        isPreset: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        tags: ['Preset', tpl.underlying, tpl.strategyType],
      }));
      localStorage.setItem(STRATEGIES_STORAGE_KEY, JSON.stringify(seeded));
      return seeded;
    }
    const parsed: Strategy[] = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      const seeded: Strategy[] = STRATEGY_TEMPLATES.map((tpl) => ({
        ...tpl,
        isPreset: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        tags: ['Preset', tpl.underlying, tpl.strategyType],
      }));
      localStorage.setItem(STRATEGIES_STORAGE_KEY, JSON.stringify(seeded));
      return seeded;
    }

    // Merge any newly introduced templates (e.g. MCX commodity strategies)
    let hasNewTemplates = false;
    for (const tpl of STRATEGY_TEMPLATES) {
      if (!parsed.some((s) => s.id === tpl.id)) {
        parsed.push({
          ...tpl,
          isPreset: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          tags: ['Preset', tpl.underlying, tpl.strategyType],
        });
        hasNewTemplates = true;
      }
    }
    if (hasNewTemplates) {
      localStorage.setItem(STRATEGIES_STORAGE_KEY, JSON.stringify(parsed));
    }

    return parsed;
  } catch (err) {
    console.error('Failed to load saved strategies from localStorage:', err);
    return STRATEGY_TEMPLATES;
  }
}

/**
 * Strategy Folder Management
 */
export function getStrategyFolders(): StrategyFolder[] {
  try {
    const raw = localStorage.getItem(STRATEGY_FOLDERS_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STRATEGY_FOLDERS_STORAGE_KEY, JSON.stringify(DEFAULT_STRATEGY_FOLDERS));
      return DEFAULT_STRATEGY_FOLDERS;
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      localStorage.setItem(STRATEGY_FOLDERS_STORAGE_KEY, JSON.stringify(DEFAULT_STRATEGY_FOLDERS));
      return DEFAULT_STRATEGY_FOLDERS;
    }
    return parsed;
  } catch (err) {
    console.error('Failed to load strategy folders from localStorage:', err);
    return DEFAULT_STRATEGY_FOLDERS;
  }
}

export function saveStrategyFolder(folder: Partial<StrategyFolder> & { name: string }): StrategyFolder {
  const currentFolders = getStrategyFolders();
  const now = new Date().toISOString();

  if (folder.id) {
    const idx = currentFolders.findIndex((f) => f.id === folder.id);
    if (idx >= 0) {
      const updated: StrategyFolder = {
        ...currentFolders[idx],
        ...folder,
      };
      currentFolders[idx] = updated;
      localStorage.setItem(STRATEGY_FOLDERS_STORAGE_KEY, JSON.stringify(currentFolders));
      return updated;
    }
  }

  const newFolder: StrategyFolder = {
    id: `fld_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    name: folder.name.trim(),
    color: folder.color || 'emerald',
    description: folder.description || '',
    createdAt: now,
  };

  currentFolders.push(newFolder);
  localStorage.setItem(STRATEGY_FOLDERS_STORAGE_KEY, JSON.stringify(currentFolders));
  return newFolder;
}

export function deleteStrategyFolder(folderId: string): boolean {
  const currentFolders = getStrategyFolders();
  const filtered = currentFolders.filter((f) => f.id !== folderId);
  localStorage.setItem(STRATEGY_FOLDERS_STORAGE_KEY, JSON.stringify(filtered));

  // Move strategies in this folder to uncategorized
  const currentStrategies = getSavedStrategies();
  let updated = false;
  const newStrategies = currentStrategies.map((s) => {
    if (s.folderId === folderId) {
      updated = true;
      return { ...s, folderId: undefined };
    }
    return s;
  });

  if (updated) {
    localStorage.setItem(STRATEGIES_STORAGE_KEY, JSON.stringify(newStrategies));
  }

  return true;
}

export function moveStrategyToFolder(strategyId: string, folderId: string | null): boolean {
  const currentStrategies = getSavedStrategies();
  const idx = currentStrategies.findIndex((s) => s.id === strategyId);
  if (idx < 0) return false;

  currentStrategies[idx] = {
    ...currentStrategies[idx],
    folderId: folderId || undefined,
    updatedAt: new Date().toISOString(),
  };

  localStorage.setItem(STRATEGIES_STORAGE_KEY, JSON.stringify(currentStrategies));
  return true;
}

/**
 * Save or update a strategy in localStorage.
 */
export function saveStrategy(strategy: Strategy, asNew: boolean = false): { strategy: Strategy; isNew: boolean } {
  const currentList = getSavedStrategies();
  const now = new Date().toISOString();

  let targetStrategy: Strategy;
  let isNewRecord = false;

  if (asNew || !strategy.id || strategy.isPreset) {
    // Generate a new custom ID if creating new or saving a preset as custom
    targetStrategy = {
      ...strategy,
      id: `strat_custom_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: asNew ? `${strategy.name} (Copy)` : (strategy.isPreset ? `${strategy.name} (Custom)` : strategy.name),
      isPreset: false,
      createdAt: now,
      updatedAt: now,
      tags: strategy.tags ? [...strategy.tags.filter((t) => t !== 'Preset'), 'Custom'] : ['Custom', strategy.underlying],
    };
    currentList.unshift(targetStrategy);
    isNewRecord = true;
  } else {
    const index = currentList.findIndex((s) => s.id === strategy.id);
    if (index >= 0) {
      targetStrategy = {
        ...strategy,
        updatedAt: now,
        isPreset: false,
      };
      currentList[index] = targetStrategy;
    } else {
      targetStrategy = {
        ...strategy,
        createdAt: strategy.createdAt || now,
        updatedAt: now,
        isPreset: false,
      };
      currentList.unshift(targetStrategy);
      isNewRecord = true;
    }
  }

  localStorage.setItem(STRATEGIES_STORAGE_KEY, JSON.stringify(currentList));
  return { strategy: targetStrategy, isNew: isNewRecord };
}

/**
 * Delete a strategy by ID.
 */
export function deleteStrategy(id: string): boolean {
  const currentList = getSavedStrategies();
  const filtered = currentList.filter((s) => s.id !== id);
  if (filtered.length === currentList.length) return false;
  localStorage.setItem(STRATEGIES_STORAGE_KEY, JSON.stringify(filtered));

  // Also remove from portfolios that reference it
  const portfolios = getPortfolios();
  let portfolioUpdated = false;
  const updatedPortfolios = portfolios.map((port) => {
    const origLen = port.strategies.length;
    const remaining = port.strategies.filter((ps) => ps.strategyId !== id);
    if (remaining.length !== origLen) {
      portfolioUpdated = true;
      return { ...port, strategies: remaining, updatedAt: new Date().toISOString() };
    }
    return port;
  });

  if (portfolioUpdated) {
    localStorage.setItem(PORTFOLIOS_STORAGE_KEY, JSON.stringify(updatedPortfolios));
  }

  return true;
}

/**
 * Duplicate a strategy.
 */
export function duplicateStrategy(id: string): Strategy | null {
  const currentList = getSavedStrategies();
  const target = currentList.find((s) => s.id === id);
  if (!target) return null;

  const now = new Date().toISOString();
  const cloned: Strategy = {
    ...target,
    id: `strat_custom_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    name: `${target.name} (Copy)`,
    isPreset: false,
    createdAt: now,
    updatedAt: now,
    tags: target.tags ? [...target.tags.filter((t) => t !== 'Preset'), 'Custom'] : ['Custom', target.underlying],
  };

  currentList.unshift(cloned);
  localStorage.setItem(STRATEGIES_STORAGE_KEY, JSON.stringify(currentList));
  return cloned;
}

/**
 * Retrieve all portfolios from localStorage.
 */
export function getPortfolios(): Portfolio[] {
  try {
    const raw = localStorage.getItem(PORTFOLIOS_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(PORTFOLIOS_STORAGE_KEY, JSON.stringify(DEFAULT_PORTFOLIOS));
      return DEFAULT_PORTFOLIOS;
    }
    const parsed: Portfolio[] = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      localStorage.setItem(PORTFOLIOS_STORAGE_KEY, JSON.stringify(DEFAULT_PORTFOLIOS));
      return DEFAULT_PORTFOLIOS;
    }
    return parsed;
  } catch (err) {
    console.error('Failed to load portfolios from localStorage:', err);
    return DEFAULT_PORTFOLIOS;
  }
}

export const getSavedPortfolios = getPortfolios;

/**
 * Save or update a portfolio in localStorage.
 */
export function savePortfolio(portfolio: Portfolio): Portfolio {
  const currentList = getPortfolios();
  const now = new Date().toISOString();

  let targetPort: Portfolio;
  const index = currentList.findIndex((p) => p.id === portfolio.id);

  if (index >= 0) {
    targetPort = {
      ...portfolio,
      updatedAt: now,
      isPreset: false,
    };
    currentList[index] = targetPort;
  } else {
    targetPort = {
      ...portfolio,
      id: portfolio.id || `port_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      createdAt: portfolio.createdAt || now,
      updatedAt: now,
      isPreset: false,
    };
    currentList.unshift(targetPort);
  }

  localStorage.setItem(PORTFOLIOS_STORAGE_KEY, JSON.stringify(currentList));
  return targetPort;
}

/**
 * Delete a portfolio by ID.
 */
export function deletePortfolio(id: string): boolean {
  const currentList = getPortfolios();
  const filtered = currentList.filter((p) => p.id !== id);
  if (filtered.length === currentList.length) return false;
  localStorage.setItem(PORTFOLIOS_STORAGE_KEY, JSON.stringify(filtered));
  return true;
}

/**
 * Duplicate a portfolio.
 */
export function duplicatePortfolio(id: string): Portfolio | null {
  const currentList = getPortfolios();
  const target = currentList.find((p) => p.id === id);
  if (!target) return null;

  const now = new Date().toISOString();
  const cloned: Portfolio = {
    ...target,
    id: `port_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    name: `${target.name} (Copy)`,
    isPreset: false,
    createdAt: now,
    updatedAt: now,
  };

  currentList.unshift(cloned);
  localStorage.setItem(PORTFOLIOS_STORAGE_KEY, JSON.stringify(currentList));
  return cloned;
}

// -------------------------------------------------------------
// TRADINGVIEW PINE SCRIPT ALERTS STORAGE & MANAGEMENT
// -------------------------------------------------------------
const TV_ALERTS_STORAGE_KEY = 'algotest_tv_alerts_v1';
const TV_LOGS_STORAGE_KEY = 'algotest_tv_logs_v1';

export const PLATFORM_APPLET_ID = '1a97c796-75f8-4dfe-bfa3-3b436d0b0ad6';
export const PLATFORM_NAME = 'Bhaarath Algo';
export const PLATFORM_ACCESS_TOKEN = 'bha_live_1a97c79675f84dfebfa33b436d0b0ad6';

const DEFAULT_TV_ALERTS: TradingViewAlertConfig[] = [
  {
    id: 'tva_supertrend_bnf',
    name: 'BankNifty 5M Supertrend Crossover Alert',
    description: 'Executes 9:20 AM Short Straddle when 5m Supertrend generates buy/sell signal in TradingView.',
    strategyId: 'tpl_920_short_straddle',
    strategyName: '9:20 AM Short Straddle',
    targetEnvironment: 'PAPER',
    entrySignalId: 'ENTRY_BNF_SUPERTREND_920',
    exitSignalId: 'EXIT_BNF_SUPERTREND_920',
    secretToken: PLATFORM_ACCESS_TOKEN,
    webhookUrl: 'https://api.bhaarathalgo.in/webhook/v1/trade',
    enabled: true,
    triggerCount: 4,
    lastTriggeredAt: '2026-09-24T09:25:00.000Z',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'tva_ema_cross_nifty',
    name: 'Nifty 15M 9/21 EMA Cross Directional Alert',
    description: 'Triggers Directional Bull Put Spread upon bullish EMA cross and squares off on bearish cross.',
    strategyId: 'tpl_bull_put_spread',
    strategyName: 'Nifty Directional Bull Put Spread',
    targetEnvironment: 'PAPER',
    entrySignalId: 'ENTRY_NFT_EMA9_21',
    exitSignalId: 'EXIT_NFT_EMA9_21',
    secretToken: PLATFORM_ACCESS_TOKEN,
    webhookUrl: 'https://api.bhaarathalgo.in/webhook/v1/trade',
    enabled: true,
    triggerCount: 2,
    lastTriggeredAt: '2026-09-23T11:45:00.000Z',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

/**
 * Retrieve all TradingView alert configs.
 */
export function getTradingViewAlerts(): TradingViewAlertConfig[] {
  try {
    const raw = localStorage.getItem(TV_ALERTS_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(TV_ALERTS_STORAGE_KEY, JSON.stringify(DEFAULT_TV_ALERTS));
      return [...DEFAULT_TV_ALERTS];
    }
    const parsed = JSON.parse(raw);
    const alerts: TradingViewAlertConfig[] = Array.isArray(parsed) ? parsed : [...DEFAULT_TV_ALERTS];
    const currentMasterToken = getMasterAccessToken();
    // Automatically migrate old webhook URLs and assign official platform access token
    return alerts.map((a) => ({
      ...a,
      secretToken:
        !a.secretToken ||
        a.secretToken.startsWith('sec_tv_') ||
        a.secretToken === 'gZhu2M9spNbqmU5ENiOrm0bWyPcgXDtV'
          ? currentMasterToken
          : a.secretToken,
      webhookUrl:
        !a.webhookUrl || a.webhookUrl.includes('algotest.in')
          ? 'https://api.bhaarathalgo.in/webhook/v1/trade'
          : a.webhookUrl,
    }));
  } catch (err) {
    return [...DEFAULT_TV_ALERTS];
  }
}

/**
 * Save or update a TradingView alert config.
 */
export function saveTradingViewAlert(alert: TradingViewAlertConfig): TradingViewAlertConfig {
  const list = getTradingViewAlerts();
  const existingIdx = list.findIndex((a) => a.id === alert.id);
  const now = new Date().toISOString();

  let savedAlert: TradingViewAlertConfig;
  if (existingIdx >= 0) {
    savedAlert = { ...alert, updatedAt: now };
    list[existingIdx] = savedAlert;
  } else {
    savedAlert = { ...alert, createdAt: now, updatedAt: now };
    list.unshift(savedAlert);
  }

  localStorage.setItem(TV_ALERTS_STORAGE_KEY, JSON.stringify(list));
  return savedAlert;
}

/**
 * Delete a TradingView alert config.
 */
export function deleteTradingViewAlert(id: string): boolean {
  const list = getTradingViewAlerts();
  const filtered = list.filter((a) => a.id !== id);
  if (filtered.length === list.length) return false;
  localStorage.setItem(TV_ALERTS_STORAGE_KEY, JSON.stringify(filtered));
  return true;
}

/**
 * Retrieve signal logs.
 */
export function getTradingViewLogs(): TradingViewSignalLog[] {
  try {
    const raw = localStorage.getItem(TV_LOGS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Append a signal execution log.
 */
export function addTradingViewLog(log: TradingViewSignalLog): void {
  const logs = getTradingViewLogs();
  logs.unshift(log);
  if (logs.length > 50) logs.pop(); // keep last 50
  localStorage.setItem(TV_LOGS_STORAGE_KEY, JSON.stringify(logs));
}

/**
 * Clear signal logs.
 */
export function clearTradingViewLogs(): void {
  localStorage.removeItem(TV_LOGS_STORAGE_KEY);
}

/**
 * Generate a unique ID for TradingView signals.
 */
export function generateSignalId(prefix: 'ENTRY' | 'EXIT', nameSlug: string): string {
  const cleanSlug = nameSlug.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase().substring(0, 10);
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}_${cleanSlug || 'SIG'}_${rand}`;
}

const MASTER_ACCESS_TOKEN_KEY = 'bhaarath_master_access_token';

/**
 * Retrieve personal master access token. Defaults to official platform access token.
 */
export function getMasterAccessToken(): string {
  try {
    const token = localStorage.getItem(MASTER_ACCESS_TOKEN_KEY);
    if (token && token.trim() && token.trim() !== 'gZhu2M9spNbqmU5ENiOrm0bWyPcgXDtV') {
      return token.trim();
    }
    // Return official platform access token for this Bhaarath Algo instance
    return PLATFORM_ACCESS_TOKEN;
  } catch {
    return PLATFORM_ACCESS_TOKEN;
  }
}

/**
 * Save personal master access token.
 */
export function setMasterAccessToken(token: string): void {
  try {
    localStorage.setItem(MASTER_ACCESS_TOKEN_KEY, token.trim());
  } catch (err) {
    console.error('Failed to save master access token:', err);
  }
}

/**
 * Reset personal master access token to platform's default official token.
 */
export function resetMasterAccessTokenToDefault(): string {
  setMasterAccessToken(PLATFORM_ACCESS_TOKEN);
  syncAccessTokenToAllAlerts(PLATFORM_ACCESS_TOKEN);
  return PLATFORM_ACCESS_TOKEN;
}

/**
 * Sync personal master access token across all existing TradingView alerts.
 */
export function syncAccessTokenToAllAlerts(token: string): TradingViewAlertConfig[] {
  setMasterAccessToken(token);
  const alerts = getTradingViewAlerts();
  const updated = alerts.map((a) => ({
    ...a,
    secretToken: token.trim(),
    updatedAt: new Date().toISOString(),
  }));
  localStorage.setItem(TV_ALERTS_STORAGE_KEY, JSON.stringify(updated));
  return updated;
}

