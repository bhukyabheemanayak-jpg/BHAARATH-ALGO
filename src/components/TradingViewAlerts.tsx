import React, { useState, useEffect } from 'react';
import {
  Bell,
  Plus,
  Copy,
  CheckCircle2,
  Play,
  Trash2,
  Edit3,
  ExternalLink,
  Code2,
  Terminal,
  Radio,
  Zap,
  RefreshCw,
  Sliders,
  ShieldCheck,
  AlertTriangle,
  ArrowRight,
  Info,
  Check,
  Activity,
  FileJson,
  Key,
  User,
} from 'lucide-react';
import { Strategy, TradingViewAlertConfig, TradingViewSignalLog } from '../types/trading';
import {
  getTradingViewAlerts,
  saveTradingViewAlert,
  deleteTradingViewAlert,
  getTradingViewLogs,
  addTradingViewLog,
  clearTradingViewLogs,
  generateSignalId,
  getSavedStrategies,
  getMasterAccessToken,
  setMasterAccessToken,
  syncAccessTokenToAllAlerts,
  resetMasterAccessTokenToDefault,
  PLATFORM_APPLET_ID,
  PLATFORM_ACCESS_TOKEN,
  PLATFORM_NAME,
} from '../services/strategyStorage';
import { UNDERLYING_CONFIGS } from '../services/optionPricer';

export const getStrategyAlertJson = (
  alert: TradingViewAlertConfig,
  compact: boolean = false
): string => {
  const payload = {
    access_token: alert.secretToken,
    alert_type: '{{strategy.order.comment}}',
    alert_name: alert.name,
    strategy_id: '{{strategy.order.alert_message}}',
  };
  return compact ? JSON.stringify(payload) : JSON.stringify(payload, null, 2);
};

export const getEntryAlertJson = (
  alert: TradingViewAlertConfig,
  compact: boolean = false
): string => {
  const payload = {
    access_token: alert.secretToken,
    alert_type: 'entry',
    alert_name: alert.name,
    strategy_id: alert.entrySignalId,
  };
  return compact ? JSON.stringify(payload) : JSON.stringify(payload, null, 2);
};

export const getExitAlertJson = (
  alert: TradingViewAlertConfig,
  compact: boolean = false
): string => {
  const payload = {
    access_token: alert.secretToken,
    alert_type: 'exit',
    alert_name: alert.name,
    strategy_id: alert.exitSignalId,
  };
  return compact ? JSON.stringify(payload) : JSON.stringify(payload, null, 2);
};

interface TradingViewAlertsProps {
  onDeployToPaper?: (strategy: Strategy) => void;
  onDeployToBroker?: (strategy: Strategy) => void;
  onOpenProfile?: () => void;
}

export const TradingViewAlerts: React.FC<TradingViewAlertsProps> = ({
  onDeployToPaper,
  onDeployToBroker,
  onOpenProfile,
}) => {
  const [alerts, setAlerts] = useState<TradingViewAlertConfig[]>([]);
  const [logs, setLogs] = useState<TradingViewSignalLog[]>([]);
  const [savedStrategies, setSavedStrategies] = useState<Strategy[]>([]);

  // Modals state
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [isScriptModalOpen, setIsScriptModalOpen] = useState<boolean>(false);
  const [isTokenModalOpen, setIsTokenModalOpen] = useState<boolean>(false);
  const [customTokenInput, setCustomTokenInput] = useState<string>('');
  const [masterToken, setMasterToken] = useState<string>(getMasterAccessToken());
  const [applyTokenToAllOnSave, setApplyTokenToAllOnSave] = useState<boolean>(false);
  const [activeAlertForScript, setActiveAlertForScript] = useState<TradingViewAlertConfig | null>(
    null
  );
  const [scriptType, setScriptType] = useState<
    'STRATEGY' | 'INDICATOR' | 'MESSAGE_JSON' | 'RAW_PAYLOAD'
  >('STRATEGY');
  const [cardJsonTab, setCardJsonTab] = useState<Record<string, 'STRATEGY' | 'ENTRY' | 'EXIT'>>({});

  // Form state
  const [editingAlert, setEditingAlert] = useState<TradingViewAlertConfig | null>(null);

  // UI state
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const webhookBaseUrl = 'https://api.bhaarathalgo.in/webhook/v1/trade';

  const refreshData = () => {
    setAlerts(getTradingViewAlerts());
    setLogs(getTradingViewLogs());
    setSavedStrategies(getSavedStrategies());
    setMasterToken(getMasterAccessToken());
  };

  useEffect(() => {
    refreshData();
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Open create modal
  const handleOpenCreate = () => {
    const strats = getSavedStrategies();
    const defaultStrat = strats[0];
    const baseSlug = defaultStrat ? defaultStrat.name.substring(0, 8) : 'ALERT';
    const currentMasterToken = getMasterAccessToken();

    const newAlert: TradingViewAlertConfig = {
      id: `tva_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
      name: `New TradingView Signal Alert`,
      description: 'Executes options strategy automatically when TradingView triggers alert webhook.',
      strategyId: defaultStrat ? defaultStrat.id : '',
      strategyName: defaultStrat ? defaultStrat.name : 'Select Strategy',
      targetEnvironment: 'PAPER',
      entrySignalId: generateSignalId('ENTRY', baseSlug),
      exitSignalId: generateSignalId('EXIT', baseSlug),
      secretToken: currentMasterToken,
      webhookUrl: webhookBaseUrl,
      enabled: true,
      triggerCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setApplyTokenToAllOnSave(false);
    setEditingAlert(newAlert);
    setIsEditModalOpen(true);
  };

  // Open edit modal
  const handleOpenEdit = (alert: TradingViewAlertConfig) => {
    setApplyTokenToAllOnSave(false);
    setEditingAlert({ ...alert });
    setIsEditModalOpen(true);
  };

  // Save alert
  const handleSaveAlert = () => {
    if (!editingAlert) return;
    if (!editingAlert.name.trim()) {
      showToast('Please provide an alert name.');
      return;
    }
    if (!editingAlert.strategyId) {
      showToast('Please link a saved strategy.');
      return;
    }

    const sanitizedToken = editingAlert.secretToken.trim() || getMasterAccessToken();
    const finalAlert: TradingViewAlertConfig = {
      ...editingAlert,
      secretToken: sanitizedToken,
    };

    saveTradingViewAlert(finalAlert);

    if (applyTokenToAllOnSave && sanitizedToken) {
      syncAccessTokenToAllAlerts(sanitizedToken);
      showToast(`Updated access token across all your strategies!`);
    } else {
      showToast(`TradingView alert "${finalAlert.name}" saved successfully!`);
    }

    refreshData();
    setIsEditModalOpen(false);
    setEditingAlert(null);
  };

  // Delete alert
  const handleDeleteAlert = (id: string) => {
    deleteTradingViewAlert(id);
    refreshData();
    setDeleteConfirmId(null);
    showToast('TradingView signal alert deleted.');
  };

  // Toggle enable/disable
  const handleToggleEnable = (alert: TradingViewAlertConfig) => {
    const updated = { ...alert, enabled: !alert.enabled };
    saveTradingViewAlert(updated);
    refreshData();
  };

  // Simulate incoming signal (Entry or Exit)
  const handleSimulateSignal = (
    alert: TradingViewAlertConfig,
    action: 'ENTRY' | 'EXIT'
  ) => {
    const strat = savedStrategies.find((s) => s.id === alert.strategyId);
    const timeStr = new Date().toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });

    const signalId = action === 'ENTRY' ? alert.entrySignalId : alert.exitSignalId;
    const signalPattern =
      action === 'ENTRY'
        ? `comment='entry', alert_message='${signalId}'`
        : `comment='exit', alert_message='${signalId}'`;

    const payload = {
      access_token: alert.secretToken,
      alert_type: action === 'ENTRY' ? 'entry' : 'exit',
      alert_name: alert.name,
      strategy_id: signalId,
      pattern: signalPattern,
      action,
      timestamp: timeStr,
    };

    const details =
      action === 'ENTRY'
        ? `[MATCHED: "${signalPattern}"] Entry signal received. Dispatched ${
            strat?.legs.length || 2
          } legs for "${alert.strategyName}" to ${
            alert.targetEnvironment === 'PAPER' ? 'Paper Simulator' : 'Broker API'
          }.`
        : `[MATCHED: "${signalPattern}"] Exit signal received. Executed square-off for all positions of "${alert.strategyName}".`;

    const logEntry: TradingViewSignalLog = {
      id: `log_${Date.now()}`,
      alertId: alert.id,
      alertName: alert.name,
      signalId,
      action,
      strategyName: alert.strategyName,
      timestamp: timeStr,
      status: 'EXECUTED',
      details,
      payload,
    };

    addTradingViewLog(logEntry);

    // Update alert trigger count
    const updatedAlert: TradingViewAlertConfig = {
      ...alert,
      triggerCount: (alert.triggerCount || 0) + 1,
      lastTriggeredAt: new Date().toISOString(),
    };
    saveTradingViewAlert(updatedAlert);
    refreshData();

    showToast(`⚡ Simulated signal [${signalPattern}] executed!`);
  };

  // Pine script code generator
  const generatePineScript = (alert: TradingViewAlertConfig): string => {
    if (scriptType === 'STRATEGY') {
      return `//@version=5
strategy("Bhaarath Algo Bridge - ${alert.name.replace(/"/g, '')}", overlay=true, margin_long=100, margin_short=100)

// ==============================================================================
// 1. BHAARATH ALGO TRADINGVIEW SIGNAL PARAMETERS
// Paste these arguments directly into your TradingView strategy:
// Entry Pattern: comment='entry', alert_message='${alert.entrySignalId}'
// Exit Pattern:  comment='exit', alert_message='${alert.exitSignalId}'
//
// 2. TRADINGVIEW CREATE ALERT CONFIGURATION:
// - Step 1: Notifications Tab -> Check "Webhook URL" & Paste:
//   ${alert.webhookUrl}
// - Step 2: Settings Tab -> Under "Message", Paste this JSON Block:
// {
//   "access_token": "${alert.secretToken}",
//   "alert_type": "{{strategy.order.comment}}",
//   "alert_name": "${alert.name.replace(/"/g, '')}",
//   "strategy_id": "{{strategy.order.alert_message}}"
// }
// ==============================================================================

// Indicator Inputs & Conditions (Customize with your technical logic)
fastEmaLength = input.int(9, "Fast EMA Length")
slowEmaLength = input.int(21, "Slow EMA Length")

fastEMA = ta.ema(close, fastEmaLength)
slowEMA = ta.ema(close, slowEmaLength)

longCondition = ta.crossover(fastEMA, slowEMA)
exitCondition = ta.crossunder(fastEMA, slowEMA)

plot(fastEMA, "Fast EMA", color=color.green, linewidth=2)
plot(slowEMA, "Slow EMA", color=color.red, linewidth=2)

// ==============================================================================
// 3. ORDER EXECUTION WITH UNIQUE BHAARATH ALGO SIGNAL IDENTIFIERS
// ==============================================================================
if (longCondition and strategy.position_size == 0)
    strategy.entry("AlgoEntry", strategy.long, comment='entry', alert_message='${alert.entrySignalId}')

if (exitCondition and strategy.position_size > 0)
    strategy.close("AlgoEntry", comment='exit', alert_message='${alert.exitSignalId}')
`;
    } else if (scriptType === 'INDICATOR') {
      return `//@version=5
indicator("Bhaarath Algo Signal Alert - ${alert.name.replace(/"/g, '')}", overlay=true)

// ==============================================================================
// 1. INDICATOR LOGIC (Customize with RSI / Supertrend / EMA)
// ==============================================================================
rsiLength = input.int(14, "RSI Length")
rsiOverbought = input.int(70, "Overbought")
rsiOversold = input.int(30, "Oversold")

vrsi = ta.rsi(close, rsiLength)

buySignal  = ta.crossover(vrsi, rsiOversold)
sellSignal = ta.crossunder(vrsi, rsiOverbought)

plot(close, "Price", color=color.gray)

// ==============================================================================
// 2. DISPATCH ALERTS WITH EXACT ENTRY & EXIT PATTERN
// In TradingView: Settings -> Message: Paste JSON Block or Alert Pattern
// ==============================================================================
if (buySignal)
    alert("comment='entry', alert_message='${alert.entrySignalId}'", alert.freq_once_per_bar_close)

if (sellSignal)
    alert("comment='exit', alert_message='${alert.exitSignalId}'", alert.freq_once_per_bar_close)
`;
    } else if (scriptType === 'MESSAGE_JSON') {
      return getStrategyAlertJson(alert);
    } else {
      return JSON.stringify(
        {
          webhook_url: alert.webhookUrl,
          tradingview_message_json: {
            access_token: alert.secretToken,
            alert_type: '{{strategy.order.comment}}',
            alert_name: alert.name,
            strategy_id: '{{strategy.order.alert_message}}',
          },
          pinescript_entry_pattern: `comment='entry', alert_message='${alert.entrySignalId}'`,
          pinescript_exit_pattern: `comment='exit', alert_message='${alert.exitSignalId}'`,
          entry_signal_id: alert.entrySignalId,
          exit_signal_id: alert.exitSignalId,
          access_token: alert.secretToken,
          strategy_name: alert.strategyName,
        },
        null,
        2
      );
    }
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 border border-emerald-500 text-white px-4 py-2.5 rounded-xl shadow-2xl text-xs font-medium flex items-center gap-2 animate-in fade-in duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/80 border border-slate-800 rounded-xl p-4 lg:p-5">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <span>TradingView Pine Script Strategy Alerts</span>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-800 text-amber-400 border border-slate-700">
                  Signals Engine
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Link TradingView webhook alerts directly to your saved options strategies with unique Entry and Exit IDs on Bhaarath Algo.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleOpenCreate}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-colors cursor-pointer shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Create Signal Alert</span>
          </button>
        </div>
      </div>

      {/* Webhook & Personal Access Token Banners */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
        {/* Webhook Endpoint Banner */}
        <div className="bg-slate-900/60 border border-slate-800/90 rounded-xl p-4 flex flex-col justify-between gap-3">
          <div className="flex items-start sm:items-center gap-2.5">
            <Terminal className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5 sm:mt-0" />
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-slate-300 font-semibold">
                  TradingView Webhook Destination URL:
                </span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-400 border border-emerald-800/60 font-mono">
                  Bhaarath Algo Endpoint
                </span>
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs font-mono text-emerald-400 font-bold select-all truncate">
                  {webhookBaseUrl}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between gap-2 flex-wrap pt-2 border-t border-slate-800/60">
            <span className="text-[11px] text-slate-400">
              Notifications tab → Check “Webhook URL” & paste.
            </span>
            <button
              onClick={() => copyToClipboard(webhookBaseUrl, 'webhook_url')}
              className="flex items-center gap-1.5 px-3 py-1 text-xs font-mono text-slate-300 hover:text-white bg-slate-950 border border-slate-800 rounded-lg cursor-pointer transition-colors"
            >
              <Copy className="w-3.5 h-3.5 text-emerald-400" />
              <span>{copiedKey === 'webhook_url' ? 'Copied URL!' : 'Copy Webhook URL'}</span>
            </button>
          </div>
        </div>

        {/* Platform Master Access Token Banner */}
        <div className="bg-slate-900/60 border border-slate-800/90 rounded-xl p-4 flex flex-col justify-between gap-3">
          <div className="flex items-start sm:items-center gap-2.5">
            <Key className="w-4 h-4 text-amber-400 shrink-0 mt-0.5 sm:mt-0" />
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-slate-300 font-semibold">
                  Platform Access Token ({PLATFORM_NAME}):
                </span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-950 text-amber-400 border border-amber-800/60 font-mono">
                  Personal Instance Key
                </span>
                <span className="text-[10px] text-slate-500 font-mono truncate hidden sm:inline-block">
                  ID: {PLATFORM_APPLET_ID}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs font-mono text-amber-300 font-bold select-all truncate">
                  {masterToken}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between gap-2 flex-wrap pt-2 border-t border-slate-800/60">
            <span className="text-[11px] text-slate-400">
              Personal auth token for this platform. Paste into TradingView <code className="text-amber-300">access_token</code>.
            </span>
            <div className="flex items-center gap-2">
              {masterToken !== PLATFORM_ACCESS_TOKEN && (
                <button
                  onClick={() => {
                    resetMasterAccessTokenToDefault();
                    refreshData();
                    showToast(`Reset to Platform Default Token (${PLATFORM_ACCESS_TOKEN})`);
                  }}
                  className="px-2 py-1 text-[11px] text-amber-300 hover:text-amber-200 bg-amber-950/60 hover:bg-amber-900/60 border border-amber-800/60 rounded-lg cursor-pointer transition-colors"
                  title="Reset to official platform access token"
                >
                  Reset Default
                </button>
              )}
              {onOpenProfile && (
                <button
                  onClick={onOpenProfile}
                  className="flex items-center gap-1.5 px-2.5 py-1 text-xs text-emerald-400 hover:text-emerald-300 bg-emerald-950/40 hover:bg-emerald-900/40 border border-emerald-800/60 rounded-lg cursor-pointer transition-colors font-medium"
                  title="View personal details and platform token"
                >
                  <User className="w-3.5 h-3.5" />
                  <span>My Profile</span>
                </button>
              )}
              <button
                onClick={() => {
                  setCustomTokenInput(masterToken);
                  setIsTokenModalOpen(true);
                }}
                className="px-2.5 py-1 text-xs text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg cursor-pointer transition-colors font-medium"
              >
                Manage Key
              </button>
              <button
                onClick={() => copyToClipboard(masterToken, 'master_token')}
                className="flex items-center gap-1.5 px-3 py-1 text-xs font-mono text-slate-300 hover:text-white bg-slate-950 border border-slate-800 rounded-lg cursor-pointer transition-colors"
              >
                <Copy className="w-3.5 h-3.5 text-amber-400" />
                <span>{copiedKey === 'master_token' ? 'Copied!' : 'Copy Token'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Alerts Grid / Cards */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-300">
            Active Signal Bridges ({alerts.length})
          </span>
          <span className="text-[11px] text-slate-500 font-mono">
            Unique Entry & Exit IDs for Pine Script
          </span>
        </div>

        {alerts.length === 0 ? (
          <div className="text-center py-12 bg-slate-900/40 border border-dashed border-slate-800 rounded-xl space-y-3">
            <Bell className="w-8 h-8 text-slate-600 mx-auto" />
            <div className="text-xs text-slate-400">No TradingView signal alerts configured yet.</div>
            <button
              onClick={handleOpenCreate}
              className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg cursor-pointer"
            >
              + Create First Alert Bridge
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {alerts.map((alert) => {
              const strat = savedStrategies.find((s) => s.id === alert.strategyId);
              return (
                <div
                  key={alert.id}
                  className={`bg-slate-900/80 border rounded-xl p-4 flex flex-col justify-between space-y-4 transition-all ${
                    alert.enabled ? 'border-slate-800 shadow-sm' : 'border-slate-850 opacity-60'
                  }`}
                >
                  <div className="space-y-3">
                    {/* Top row: Title & Switch */}
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-white">{alert.name}</span>
                          <span
                            className={`w-2 h-2 rounded-full ${
                              alert.enabled ? 'bg-emerald-400' : 'bg-slate-600'
                            }`}
                          />
                        </div>
                        {alert.description && (
                          <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">
                            {alert.description}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => handleToggleEnable(alert)}
                          className={`px-2 py-0.5 text-[10px] font-mono rounded cursor-pointer transition-colors ${
                            alert.enabled
                              ? 'bg-emerald-950 text-emerald-300 border border-emerald-800/60 font-bold'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {alert.enabled ? 'ACTIVE' : 'PAUSED'}
                        </button>
                        <button
                          onClick={() => handleOpenEdit(alert)}
                          className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition-colors cursor-pointer"
                          title="Edit Alert"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeleteConfirmId(alert.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded transition-colors cursor-pointer"
                          title="Delete Alert"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Target Strategy & Environment */}
                    <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-850 flex items-center justify-between text-xs font-mono">
                      <div className="flex items-center gap-2">
                        <span className="text-slate-400">Target:</span>
                        <span className="font-bold text-white">{alert.strategyName}</span>
                        {strat && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-emerald-400 border border-slate-700">
                            {strat.underlying} · {strat.legs.length} Legs
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-slate-900 text-amber-300 border border-slate-800">
                        {alert.targetEnvironment === 'PAPER' ? 'Paper Trading' : 'Broker Gateway'}
                      </span>
                    </div>

                    {/* Unique Identifiers for Entry and Exit */}
                    <div className="space-y-2 font-mono text-xs">
                      {/* Entry ID */}
                      <div className="flex items-center justify-between p-2 rounded-lg bg-slate-950/80 border border-slate-800/80">
                        <div className="flex items-center gap-2 overflow-hidden">
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800/60 shrink-0">
                            ENTRY ID
                          </span>
                          <span className="text-slate-200 font-semibold truncate select-all">
                            {alert.entrySignalId}
                          </span>
                        </div>
                        <button
                          onClick={() => copyToClipboard(alert.entrySignalId, `entry_${alert.id}`)}
                          className="p-1 text-slate-400 hover:text-emerald-400 transition-colors cursor-pointer shrink-0"
                          title="Copy Entry Signal ID"
                        >
                          {copiedKey === `entry_${alert.id}` ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>

                      {/* Exit ID */}
                      <div className="flex items-center justify-between p-2 rounded-lg bg-slate-950/80 border border-slate-800/80">
                        <div className="flex items-center gap-2 overflow-hidden">
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-950 text-rose-400 border border-rose-800/60 shrink-0">
                            EXIT ID
                          </span>
                          <span className="text-slate-200 font-semibold truncate select-all">
                            {alert.exitSignalId}
                          </span>
                        </div>
                        <button
                          onClick={() => copyToClipboard(alert.exitSignalId, `exit_${alert.id}`)}
                          className="p-1 text-slate-400 hover:text-emerald-400 transition-colors cursor-pointer shrink-0"
                          title="Copy Exit Signal ID"
                        >
                          {copiedKey === `exit_${alert.id}` ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* PineScript Strategy Integration Snippets (Exact User Format) */}
                    <div className="space-y-1.5 font-mono text-xs bg-slate-950 p-2.5 rounded-lg border border-slate-800/90">
                      <div className="flex items-center justify-between text-[11px] font-sans font-semibold mb-0.5">
                        <span className="flex items-center gap-1.5 text-amber-300">
                          <Code2 className="w-3.5 h-3.5" />
                          <span>TradingView Strategy Arguments</span>
                        </span>
                        <span className="text-[10px] text-slate-400 font-normal">
                          Paste in PineScript strategy
                        </span>
                      </div>

                      {/* Entry pattern */}
                      <div className="flex items-center justify-between p-1.5 rounded bg-slate-900/90 border border-emerald-900/50">
                        <div className="flex items-center gap-1.5 overflow-hidden">
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-400 shrink-0 font-mono">
                            ENTRY
                          </span>
                          <span className="text-slate-200 text-[11px] font-mono truncate select-all">
                            comment='entry', alert_message='{alert.entrySignalId}'
                          </span>
                        </div>
                        <button
                          onClick={() =>
                            copyToClipboard(
                              `comment='entry', alert_message='${alert.entrySignalId}'`,
                              `pattern_entry_${alert.id}`
                            )
                          }
                          className="flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold text-emerald-400 hover:text-white bg-emerald-950/80 hover:bg-emerald-800 border border-emerald-800/80 rounded cursor-pointer transition-colors shrink-0 ml-1.5"
                          title="Copy Entry pattern: comment='entry', alert_message='uniqueid'"
                        >
                          {copiedKey === `pattern_entry_${alert.id}` ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-400" />
                              <span>Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span>Copy</span>
                            </>
                          )}
                        </button>
                      </div>

                      {/* Exit pattern */}
                      <div className="flex items-center justify-between p-1.5 rounded bg-slate-900/90 border border-rose-900/50">
                        <div className="flex items-center gap-1.5 overflow-hidden">
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-rose-950 text-rose-400 shrink-0 font-mono">
                            EXIT
                          </span>
                          <span className="text-slate-200 text-[11px] font-mono truncate select-all">
                            comment='exit', alert_message='{alert.exitSignalId}'
                          </span>
                        </div>
                        <button
                          onClick={() =>
                            copyToClipboard(
                              `comment='exit', alert_message='${alert.exitSignalId}'`,
                              `pattern_exit_${alert.id}`
                            )
                          }
                          className="flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold text-rose-400 hover:text-white bg-rose-950/80 hover:bg-rose-800 border border-rose-800/80 rounded cursor-pointer transition-colors shrink-0 ml-1.5"
                          title="Copy Exit pattern: comment='exit', alert_message='uniqueid'"
                        >
                          {copiedKey === `pattern_exit_${alert.id}` ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-400" />
                              <span>Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span>Copy</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Copy JSON Block to Paste under "Message" in Settings in TradingView */}
                    <div className="space-y-2 font-mono text-xs bg-slate-950 p-2.5 rounded-lg border border-sky-900/60 shadow-inner">
                      <div className="flex items-center justify-between text-[11px] font-sans font-semibold">
                        <span className="flex items-center gap-1.5 text-sky-300">
                          <FileJson className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                          <span>Paste under “Message” in Settings in TradingView</span>
                        </span>
                        {/* Selector for Strategy JSON, Entry JSON, Exit JSON */}
                        <div className="flex items-center bg-slate-900 p-0.5 rounded border border-slate-800 text-[10px]">
                          <button
                            type="button"
                            onClick={() =>
                              setCardJsonTab((prev) => ({ ...prev, [alert.id]: 'STRATEGY' }))
                            }
                            className={`px-1.5 py-0.5 rounded transition-colors cursor-pointer ${
                              (cardJsonTab[alert.id] || 'STRATEGY') === 'STRATEGY'
                                ? 'bg-sky-600 text-white font-bold'
                                : 'text-slate-400 hover:text-white'
                            }`}
                          >
                            Strategy JSON
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setCardJsonTab((prev) => ({ ...prev, [alert.id]: 'ENTRY' }))
                            }
                            className={`px-1.5 py-0.5 rounded transition-colors cursor-pointer ${
                              cardJsonTab[alert.id] === 'ENTRY'
                                ? 'bg-emerald-600 text-white font-bold'
                                : 'text-slate-400 hover:text-white'
                            }`}
                          >
                            Entry
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setCardJsonTab((prev) => ({ ...prev, [alert.id]: 'EXIT' }))
                            }
                            className={`px-1.5 py-0.5 rounded transition-colors cursor-pointer ${
                              cardJsonTab[alert.id] === 'EXIT'
                                ? 'bg-rose-600 text-white font-bold'
                                : 'text-slate-400 hover:text-white'
                            }`}
                          >
                            Exit
                          </button>
                        </div>
                      </div>

                      {/* JSON Block Code Preview */}
                      <div className="relative bg-slate-900/90 rounded border border-slate-800 p-2 text-[11px] font-mono text-slate-300 leading-snug overflow-x-auto max-h-28">
                        <pre className="select-all">
                          {cardJsonTab[alert.id] === 'ENTRY'
                            ? getEntryAlertJson(alert)
                            : cardJsonTab[alert.id] === 'EXIT'
                            ? getExitAlertJson(alert)
                            : getStrategyAlertJson(alert)}
                        </pre>
                      </div>

                      {/* 1-Click Copy Buttons (Formatted & Compact 1-Line) */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-0.5">
                        <button
                          type="button"
                          onClick={() => {
                            const activeType = cardJsonTab[alert.id] || 'STRATEGY';
                            const jsonText =
                              activeType === 'ENTRY'
                                ? getEntryAlertJson(alert, false)
                                : activeType === 'EXIT'
                                ? getExitAlertJson(alert, false)
                                : getStrategyAlertJson(alert, false);
                            copyToClipboard(jsonText, `json_msg_${alert.id}`);
                            showToast(
                              'Copied JSON Block! Paste directly under "Message" in TradingView Alert Settings.'
                            );
                          }}
                          className="flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-lg bg-sky-950/90 hover:bg-sky-900/90 border border-sky-800/80 text-sky-200 hover:text-white text-xs font-semibold cursor-pointer transition-colors shadow-sm"
                          title="Copy Formatted JSON to Paste under Message in Settings in TradingView"
                        >
                          {copiedKey === `json_msg_${alert.id}` ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                              <span className="text-emerald-300 font-bold">
                                Copied JSON!
                              </span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5 text-sky-400" />
                              <span>Copy JSON Block</span>
                            </>
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            const activeType = cardJsonTab[alert.id] || 'STRATEGY';
                            const jsonText =
                              activeType === 'ENTRY'
                                ? getEntryAlertJson(alert, true)
                                : activeType === 'EXIT'
                                ? getExitAlertJson(alert, true)
                                : getStrategyAlertJson(alert, true);
                            copyToClipboard(jsonText, `json_msg_compact_${alert.id}`);
                            showToast(
                              'Copied Compact 1-Line JSON! Paste under "Message" in TradingView Alert Settings.'
                            );
                          }}
                          className="flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-slate-300 hover:text-white text-xs font-mono cursor-pointer transition-colors shadow-sm"
                          title="Copy single-line compact JSON"
                        >
                          {copiedKey === `json_msg_compact_${alert.id}` ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                              <span className="text-emerald-300 font-bold">
                                Copied 1-Line!
                              </span>
                            </>
                          ) : (
                            <>
                              <FileJson className="w-3.5 h-3.5 text-slate-400" />
                              <span>Copy 1-Line Compact</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Actions & Simulation triggers */}
                  <div className="pt-2 border-t border-slate-850 flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleSimulateSignal(alert, 'ENTRY')}
                        className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-emerald-300 hover:text-white bg-emerald-950/60 hover:bg-emerald-800 border border-emerald-800/80 rounded cursor-pointer transition-colors"
                        title="Simulate incoming Entry Webhook Signal from TradingView"
                      >
                        <Zap className="w-3 h-3 text-amber-300" />
                        <span>Test Entry</span>
                      </button>

                      <button
                        onClick={() => handleSimulateSignal(alert, 'EXIT')}
                        className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-rose-300 hover:text-white bg-rose-950/60 hover:bg-rose-800 border border-rose-800/80 rounded cursor-pointer transition-colors"
                        title="Simulate incoming Exit Webhook Signal from TradingView"
                      >
                        <Zap className="w-3 h-3 text-rose-300" />
                        <span>Test Exit</span>
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-slate-500 font-mono">
                        Triggered {alert.triggerCount || 0}x
                      </span>

                      <button
                        onClick={() => {
                          setActiveAlertForScript(alert);
                          setIsScriptModalOpen(true);
                        }}
                        className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-amber-400 hover:text-amber-300 bg-amber-950/40 border border-amber-900/60 rounded cursor-pointer transition-colors"
                      >
                        <Code2 className="w-3.5 h-3.5" />
                        <span>Get Pine Script</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Live Signals Execution Log Console */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-semibold text-slate-300">
              Live Webhook Signals Execution Console
            </span>
            <span className="text-xs text-slate-500 font-mono">({logs.length} signals logged)</span>
          </div>

          {logs.length > 0 && (
            <button
              onClick={() => {
                clearTradingViewLogs();
                refreshData();
              }}
              className="text-xs text-slate-500 hover:text-slate-300 cursor-pointer font-mono"
            >
              Clear Logs
            </button>
          )}
        </div>

        {logs.length === 0 ? (
          <div className="text-center py-6 text-xs text-slate-500 font-mono">
            No TradingView webhook signals received yet. Click <span className="text-emerald-400 font-semibold">Test Entry</span> or <span className="text-rose-400 font-semibold">Test Exit</span> on any alert card above to verify signal processing.
          </div>
        ) : (
          <div className="max-h-60 overflow-y-auto space-y-1.5 font-mono text-xs pr-2">
            {logs.map((log) => (
              <div
                key={log.id}
                className={`p-2.5 rounded border flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${
                  log.action === 'ENTRY'
                    ? 'bg-emerald-950/20 border-emerald-900/50 text-emerald-300'
                    : 'bg-rose-950/20 border-rose-900/50 text-rose-300'
                }`}
              >
                <div className="flex items-start sm:items-center gap-2.5">
                  <span className="text-slate-500 font-bold shrink-0">{log.timestamp}</span>
                  <span
                    className={`px-1.5 py-0.2 rounded text-[10px] font-bold shrink-0 ${
                      log.action === 'ENTRY'
                        ? 'bg-emerald-900/60 text-emerald-300'
                        : 'bg-rose-900/60 text-rose-300'
                    }`}
                  >
                    {log.action}
                  </span>
                  <span className="font-semibold text-white">{log.signalId}</span>
                  <span className="text-slate-400 hidden md:inline">→ {log.details}</span>
                </div>

                <span className="text-[10px] px-2 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-800 shrink-0 self-end sm:self-auto">
                  STATUS: {log.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pine Script Code Generator Modal */}
      {isScriptModalOpen && activeAlertForScript && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Code2 className="w-4 h-4 text-amber-400" />
                  <span>TradingView Pine Script (v5) Integration Code</span>
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Pre-populated with unique Entry ID ({activeAlertForScript.entrySignalId}) and Exit ID ({activeAlertForScript.exitSignalId})
                </p>
              </div>

              <button
                onClick={() => setIsScriptModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg text-xs"
              >
                ✕ Close
              </button>
            </div>

            {/* Quick Copy Snippets Banner */}
            <div className="p-3 bg-slate-950 border-b border-slate-800 space-y-2.5">
              <div className="text-[11px] text-amber-300 font-semibold flex items-center justify-between">
                <span>TradingView PineScript & Alert Message Parameters:</span>
                <span className="text-[10px] text-slate-400">Bhaarath Algo Signals v5</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono">
                <div className="flex items-center justify-between p-2 rounded bg-slate-900 border border-emerald-900/60">
                  <div className="overflow-hidden">
                    <span className="text-[9px] text-emerald-400 font-bold block mb-0.5">FOR ENTRY:</span>
                    <span className="text-slate-200 text-[11px] select-all truncate block">
                      comment='entry', alert_message='{activeAlertForScript.entrySignalId}'
                    </span>
                  </div>
                  <button
                    onClick={() =>
                      copyToClipboard(
                        `comment='entry', alert_message='${activeAlertForScript.entrySignalId}'`,
                        'modal_entry'
                      )
                    }
                    className="ml-2 px-2.5 py-1 text-[10px] font-bold text-emerald-300 bg-emerald-950 hover:bg-emerald-800 border border-emerald-800 rounded cursor-pointer shrink-0 transition-colors"
                  >
                    {copiedKey === 'modal_entry' ? 'Copied!' : 'Copy'}
                  </button>
                </div>

                <div className="flex items-center justify-between p-2 rounded bg-slate-900 border border-rose-900/60">
                  <div className="overflow-hidden">
                    <span className="text-[9px] text-rose-400 font-bold block mb-0.5">FOR EXIT:</span>
                    <span className="text-slate-200 text-[11px] select-all truncate block">
                      comment='exit', alert_message='{activeAlertForScript.exitSignalId}'
                    </span>
                  </div>
                  <button
                    onClick={() =>
                      copyToClipboard(
                        `comment='exit', alert_message='${activeAlertForScript.exitSignalId}'`,
                        'modal_exit'
                      )
                    }
                    className="ml-2 px-2.5 py-1 text-[10px] font-bold text-rose-300 bg-rose-950 hover:bg-rose-800 border border-rose-800 rounded cursor-pointer shrink-0 transition-colors"
                  >
                    {copiedKey === 'modal_exit' ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              </div>

              {/* Quick Copy JSON Block for TradingView Message */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between p-2.5 rounded bg-sky-950/40 border border-sky-800/60 text-xs font-mono gap-2">
                <div className="overflow-hidden min-w-0">
                  <span className="text-[9px] text-sky-400 font-bold flex items-center gap-1 mb-0.5">
                    <FileJson className="w-3 h-3 shrink-0" />
                    <span>COPY JSON BLOCK TO PASTE UNDER “MESSAGE” IN SETTINGS IN TRADINGVIEW:</span>
                  </span>
                  <span className="text-slate-300 text-[11px] select-all truncate block">
                    {getStrategyAlertJson(activeAlertForScript, true)}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => {
                      copyToClipboard(
                        getStrategyAlertJson(activeAlertForScript, false),
                        'modal_json_block'
                      );
                      showToast('Copied JSON Block! Paste under "Message" in TradingView Alert Settings.');
                    }}
                    className="px-2.5 py-1.5 text-[10px] font-bold text-sky-200 hover:text-white bg-sky-900/80 hover:bg-sky-800 border border-sky-700 rounded cursor-pointer transition-colors flex items-center gap-1.5"
                  >
                    <Copy className="w-3 h-3" />
                    <span>{copiedKey === 'modal_json_block' ? 'Copied JSON!' : 'Copy JSON'}</span>
                  </button>
                  <button
                    onClick={() => {
                      copyToClipboard(
                        getStrategyAlertJson(activeAlertForScript, true),
                        'modal_json_block_compact'
                      );
                      showToast('Copied 1-Line Compact JSON! Paste under "Message" in TradingView Alert Settings.');
                    }}
                    className="px-2.5 py-1.5 text-[10px] font-mono text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-850 border border-slate-700 rounded cursor-pointer transition-colors flex items-center gap-1"
                  >
                    <FileJson className="w-3 h-3" />
                    <span>{copiedKey === 'modal_json_block_compact' ? 'Copied 1-Line!' : '1-Line'}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Script Type Switcher */}
            <div className="p-3 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800 text-xs">
                <button
                  onClick={() => setScriptType('STRATEGY')}
                  className={`px-3 py-1 rounded font-medium transition-colors cursor-pointer ${
                    scriptType === 'STRATEGY'
                      ? 'bg-amber-600 text-white font-bold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Strategy (alert_message)
                </button>
                <button
                  onClick={() => setScriptType('INDICATOR')}
                  className={`px-3 py-1 rounded font-medium transition-colors cursor-pointer ${
                    scriptType === 'INDICATOR'
                      ? 'bg-amber-600 text-white font-bold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Indicator (alert() function)
                </button>
                <button
                  onClick={() => setScriptType('MESSAGE_JSON')}
                  className={`px-3 py-1 rounded font-medium transition-colors cursor-pointer ${
                    scriptType === 'MESSAGE_JSON'
                      ? 'bg-sky-600 text-white font-bold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  TradingView Message JSON
                </button>
                <button
                  onClick={() => setScriptType('RAW_PAYLOAD')}
                  className={`px-3 py-1 rounded font-medium transition-colors cursor-pointer ${
                    scriptType === 'RAW_PAYLOAD'
                      ? 'bg-amber-600 text-white font-bold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Raw Config
                </button>
              </div>

              <button
                onClick={() =>
                  copyToClipboard(generatePineScript(activeAlertForScript), 'pine_code')
                }
                className="flex items-center gap-1.5 px-3 py-1 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-colors cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>{copiedKey === 'pine_code' ? 'Copied to Clipboard!' : 'Copy Content'}</span>
              </button>
            </div>

            {/* Code Box */}
            <div className="p-4 flex-1 overflow-y-auto bg-slate-950 font-mono text-xs text-slate-200">
              <pre className="whitespace-pre-wrap">{generatePineScript(activeAlertForScript)}</pre>
            </div>

            {/* TradingView Setup Instructions */}
            <div className="p-4 bg-slate-900/90 border-t border-slate-800 text-xs space-y-1.5 text-slate-400">
              <span className="text-white font-bold block mb-1">
                How to setup in TradingView:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                <div className="p-2 rounded bg-slate-950 border border-slate-850">
                  <span className="font-bold text-amber-400">Step 1: </span>
                  Paste code into Pine Editor and click "Add to chart".
                </div>
                <div className="p-2 rounded bg-slate-950 border border-slate-850">
                  <span className="font-bold text-amber-400">Step 2: </span>
                  Press <kbd className="px-1 bg-slate-800 rounded">Alt + A</kbd> to open Create Alert.
                </div>
                <div className="p-2 rounded bg-slate-950 border border-slate-850">
                  <span className="font-bold text-amber-400">Step 3 (Notifications): </span>
                  Check Webhook URL & paste: <span className="text-emerald-400 font-mono font-bold">{webhookBaseUrl}</span>.
                </div>
                <div className="p-2 rounded bg-slate-950 border border-slate-850">
                  <span className="font-bold text-sky-400">Step 4 (Settings): </span>
                  Under "Message", paste the <span className="text-sky-300 font-mono">JSON Block</span> or <code className="text-amber-300">{'{{strategy.order.alert_message}}'}</code>.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create / Edit Alert Modal */}
      {isEditModalOpen && editingAlert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl space-y-4 p-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Bell className="w-4 h-4 text-emerald-400" />
                <span>
                  {editingAlert.id.startsWith('tva_') ? 'Configure TradingView Signal Alert' : 'Edit Alert'}
                </span>
              </h3>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg text-xs cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              {/* Alert Name */}
              <div>
                <label className="text-slate-400 block mb-1">Alert Name</label>
                <input
                  type="text"
                  value={editingAlert.name}
                  onChange={(e) => setEditingAlert({ ...editingAlert, name: e.target.value })}
                  placeholder="e.g. 5M BankNifty Supertrend Crossover"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Linked Strategy */}
              <div>
                <label className="text-slate-400 block mb-1">
                  Link to Saved Strategy (From Library)
                </label>
                <select
                  value={editingAlert.strategyId}
                  onChange={(e) => {
                    const found = savedStrategies.find((s) => s.id === e.target.value);
                    if (found) {
                      setEditingAlert({
                        ...editingAlert,
                        strategyId: found.id,
                        strategyName: found.name,
                      });
                    }
                  }}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500 cursor-pointer"
                >
                  {savedStrategies.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.underlying} · {s.legs.length} Legs)
                    </option>
                  ))}
                </select>
              </div>

              {/* Execution Destination */}
              <div>
                <label className="text-slate-400 block mb-1">Execution Destination</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setEditingAlert({ ...editingAlert, targetEnvironment: 'PAPER' })
                    }
                    className={`p-2.5 rounded-lg border text-left cursor-pointer transition-colors ${
                      editingAlert.targetEnvironment === 'PAPER'
                        ? 'bg-slate-900 border-emerald-500 text-white font-bold'
                        : 'bg-slate-950 border-slate-800 text-slate-400'
                    }`}
                  >
                    <Radio className="w-3.5 h-3.5 mb-1 text-emerald-400" />
                    <span>Live Paper Trading</span>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setEditingAlert({ ...editingAlert, targetEnvironment: 'BROKER' })
                    }
                    className={`p-2.5 rounded-lg border text-left cursor-pointer transition-colors ${
                      editingAlert.targetEnvironment === 'BROKER'
                        ? 'bg-slate-900 border-emerald-500 text-white font-bold'
                        : 'bg-slate-950 border-slate-800 text-slate-400'
                    }`}
                  >
                    <Zap className="w-3.5 h-3.5 mb-1 text-amber-400" />
                    <span>Broker Gateway (Live Orders)</span>
                  </button>
                </div>
              </div>

              {/* Unique Signal IDs */}
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <span className="font-semibold text-slate-300 block">
                  Unique Signal Identifiers (For Pine Script)
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-slate-400 block mb-1">Unique Entry ID</label>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        value={editingAlert.entrySignalId}
                        onChange={(e) =>
                          setEditingAlert({ ...editingAlert, entrySignalId: e.target.value })
                        }
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-emerald-400 font-mono font-bold text-xs"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setEditingAlert({
                            ...editingAlert,
                            entrySignalId: generateSignalId('ENTRY', editingAlert.name),
                          })
                        }
                        className="p-2 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg border border-slate-800"
                        title="Regenerate unique ID"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="text-slate-400 block mb-1">Unique Exit ID</label>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        value={editingAlert.exitSignalId}
                        onChange={(e) =>
                          setEditingAlert({ ...editingAlert, exitSignalId: e.target.value })
                        }
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-rose-400 font-mono font-bold text-xs"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setEditingAlert({
                            ...editingAlert,
                            exitSignalId: generateSignalId('EXIT', editingAlert.name),
                          })
                        }
                        className="p-2 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg border border-slate-800"
                        title="Regenerate unique ID"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Access Token Configuration */}
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <div className="flex items-center justify-between">
                  <label className="text-slate-300 font-semibold block flex items-center gap-1.5">
                    <Key className="w-3.5 h-3.5 text-amber-400" />
                    <span>Access Token (access_token)</span>
                  </label>
                  <span className="text-[10px] text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-900/60 font-mono">
                    Personal Auth Key
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    value={editingAlert.secretToken}
                    onChange={(e) =>
                      setEditingAlert({ ...editingAlert, secretToken: e.target.value })
                    }
                    placeholder="e.g. gZhu2M9spNbqmU5ENiOrm0bWyPcgXDtV"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-amber-300 font-mono font-bold text-xs focus:outline-none focus:border-amber-500"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setEditingAlert({
                        ...editingAlert,
                        secretToken: getMasterAccessToken(),
                      })
                    }
                    className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white rounded-lg border border-slate-800 text-[11px] whitespace-nowrap cursor-pointer transition-colors"
                    title="Reset to Master Personal Token"
                  >
                    Use Master
                  </button>
                </div>

                <div className="p-2.5 rounded-lg bg-sky-950/40 border border-sky-850/60 text-[11px] text-sky-200 space-y-1.5">
                  <div className="flex items-center gap-1.5 font-semibold text-sky-300">
                    <Info className="w-3.5 h-3.5 shrink-0" />
                    <span>Personal Use: Same Token for All Strategies</span>
                  </div>
                  <p className="text-slate-300 text-[11px] leading-relaxed">
                    For personal use, your <code className="text-amber-300 font-mono">access_token</code> <strong>can be the exact same across all your strategies</strong>! 
                    Bhaarath Algo routes incoming signals to the correct strategy using the unique <code className="text-sky-300 font-mono">strategy_id</code> (<code className="text-amber-300 font-mono">alert_message</code>).
                  </p>
                  <label className="flex items-center gap-2 pt-1 cursor-pointer select-none text-slate-200">
                    <input
                      type="checkbox"
                      checked={applyTokenToAllOnSave}
                      onChange={(e) => setApplyTokenToAllOnSave(e.target.checked)}
                      className="rounded border-slate-700 text-emerald-500 focus:ring-0 cursor-pointer"
                    />
                    <span className="text-[11px] font-medium">
                      Apply this access token to <strong>all</strong> my strategies
                    </span>
                  </label>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white bg-slate-800 rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveAlert}
                className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg cursor-pointer shadow-sm"
              >
                Save Signal Alert
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Platform Master Access Token Modal */}
      {isTokenModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl p-5 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <Key className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">
                    Platform Access Token & Credentials
                  </h3>
                  <span className="text-[11px] text-slate-400">
                    {PLATFORM_NAME} • Instance Authentication
                  </span>
                </div>
              </div>
              <button
                onClick={() => setIsTokenModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg text-xs cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              {/* Platform Applet Instance Info */}
              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800/90 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 font-medium text-[11px]">Platform Applet ID:</span>
                  <span className="font-mono text-emerald-400 font-bold text-[11px] select-all">
                    {PLATFORM_APPLET_ID}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 font-medium text-[11px]">Official Platform Token:</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-amber-300 font-bold text-[11px] select-all">
                      {PLATFORM_ACCESS_TOKEN}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setCustomTokenInput(PLATFORM_ACCESS_TOKEN);
                        showToast('Applied official platform access token!');
                      }}
                      className="px-2 py-0.5 rounded bg-amber-950 text-amber-400 border border-amber-800/70 hover:bg-amber-900 text-[10px] font-semibold cursor-pointer transition-colors"
                    >
                      Use Platform Token
                    </button>
                  </div>
                </div>
              </div>

              {/* Personal Use Explanation */}
              <div className="p-3 rounded-lg bg-sky-950/40 border border-sky-850 text-slate-300 space-y-1.5">
                <span className="font-bold text-sky-300 block flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>How This Platform Authenticates Your TradingView Signals</span>
                </span>
                <p className="text-[11px] leading-relaxed">
                  Because you are using this platform for personal trading, your <strong>access token is identical across all your strategies</strong>. 
                  Incoming webhooks are automatically routed to the right options strategy using the unique <code className="text-sky-300 font-mono">strategy_id</code>!
                </p>
                <div className="grid grid-cols-2 gap-2 pt-1 font-mono text-[10px]">
                  <div className="p-2 rounded bg-slate-950 border border-slate-800">
                    <span className="text-amber-400 font-bold block">access_token</span>
                    <span className="text-slate-400">Authenticates this platform instance</span>
                  </div>
                  <div className="p-2 rounded bg-slate-950 border border-slate-800">
                    <span className="text-sky-400 font-bold block">strategy_id</span>
                    <span className="text-slate-400">Routes to the specific strategy</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">
                  Active Access Token in Bhaarath Algo:
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={customTokenInput}
                    onChange={(e) => setCustomTokenInput(e.target.value)}
                    placeholder="e.g. bha_live_1a97c79675f84dfebfa33b436d0b0ad6"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-amber-300 font-mono font-bold text-xs focus:outline-none focus:border-amber-500"
                  />
                  <button
                    type="button"
                    onClick={() => copyToClipboard(customTokenInput, 'input_token')}
                    className="px-3 py-2 text-xs font-mono bg-slate-950 border border-slate-800 hover:bg-slate-800 text-slate-300 rounded-lg cursor-pointer shrink-0 transition-colors"
                  >
                    {copiedKey === 'input_token' ? 'Copied' : 'Copy'}
                  </button>
                </div>
              </div>

              {/* TradingView Message JSON Preview */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-semibold text-slate-400">
                  TradingView Alert Message JSON Format:
                </span>
                <pre className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 font-mono text-[11px] text-emerald-400 overflow-x-auto">
{JSON.stringify(
  {
    access_token: customTokenInput.trim() || PLATFORM_ACCESS_TOKEN,
    alert_type: "{{strategy.order.comment}}",
    alert_name: "HA 1M TEST NCC",
    strategy_id: "{{strategy.order.alert_message}}"
  },
  null,
  2
)}
                </pre>
              </div>

              <p className="text-[11px] text-slate-400">
                Clicking <strong>Save & Sync</strong> will immediately update all your saved strategies and Pine Script alert generators in Bhaarath Algo.
              </p>
            </div>

            <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => {
                  setCustomTokenInput(PLATFORM_ACCESS_TOKEN);
                }}
                className="text-[11px] text-slate-400 hover:text-amber-300 underline cursor-pointer"
              >
                Reset to Platform Token
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsTokenModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white bg-slate-800 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const cleaned = customTokenInput.trim();
                    if (!cleaned) {
                      showToast('Access token cannot be empty.');
                      return;
                    }
                    syncAccessTokenToAllAlerts(cleaned);
                    refreshData();
                    setIsTokenModalOpen(false);
                    showToast('Platform access token updated and synced across all strategies!');
                  }}
                  className="px-5 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-500 rounded-lg cursor-pointer shadow-sm"
                >
                  Save & Sync Across All Strategies
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-rose-400">
              <AlertTriangle className="w-5 h-5" />
              <span className="font-bold text-sm text-white">Delete Signal Alert</span>
            </div>
            <p className="text-xs text-slate-400">
              Are you sure you want to delete this TradingView signal alert bridge? Webhook signals referencing these Entry/Exit IDs will no longer trigger automatic executions.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="px-3 py-1.5 text-xs font-medium text-slate-400 hover:text-white bg-slate-800 rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteAlert(deleteConfirmId)}
                className="px-4 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 rounded-lg cursor-pointer"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
