import React, { useState, useEffect } from 'react';
import {
  Sliders,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Clock,
  Shield,
  Layers,
  Zap,
  Split,
  RefreshCw,
  X,
  Info,
} from 'lucide-react';
import {
  ExecutionSettings,
  DEFAULT_EXECUTION_SETTINGS,
  getExecutionSettings,
  saveExecutionSettings,
} from '../services/brokerStorage';

interface ExecutionSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave?: (settings: ExecutionSettings) => void;
}

export const ExecutionSettingsModal: React.FC<ExecutionSettingsModalProps> = ({
  isOpen,
  onClose,
  onSave,
}) => {
  const [settings, setSettings] = useState<ExecutionSettings>(DEFAULT_EXECUTION_SETTINGS);
  const [activeTab, setActiveTab] = useState<'ORDER_TYPE' | 'MARGIN_SEQ' | 'SLICING' | 'RETRY' | 'SQUARE_OFF'>('ORDER_TYPE');
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setSettings(getExecutionSettings());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 2500);
  };

  const handleSave = () => {
    saveExecutionSettings(settings);
    if (onSave) onSave(settings);
    showToast('Execution settings saved successfully!');
    setTimeout(() => {
      onClose();
    }, 600);
  };

  const handleResetDefaults = () => {
    setSettings(DEFAULT_EXECUTION_SETTINGS);
    showToast('Reset to Bhaarath Algo recommended defaults.');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full flex flex-col max-h-[90vh] shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Execution Settings
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-emerald-400 border border-slate-700">
                  Bhaarath Algo
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Configure order pricing, leg sequencing, order slicing, retry rules, and square-off mechanics.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-md transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sub-navigation Tabs */}
        <div className="flex items-center gap-1 px-5 py-2.5 border-b border-slate-800 bg-slate-950/40 overflow-x-auto text-xs font-semibold">
          <button
            onClick={() => setActiveTab('ORDER_TYPE')}
            className={`px-3 py-1.5 rounded-lg transition-colors shrink-0 cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'ORDER_TYPE'
                ? 'bg-slate-800 text-white shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span>Order Type & Buffer</span>
          </button>

          <button
            onClick={() => setActiveTab('MARGIN_SEQ')}
            className={`px-3 py-1.5 rounded-lg transition-colors shrink-0 cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'MARGIN_SEQ'
                ? 'bg-slate-800 text-white shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-emerald-400" />
            <span>Margin & Leg Sequence</span>
          </button>

          <button
            onClick={() => setActiveTab('SLICING')}
            className={`px-3 py-1.5 rounded-lg transition-colors shrink-0 cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'SLICING'
                ? 'bg-slate-800 text-white shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Split className="w-3.5 h-3.5 text-sky-400" />
            <span>Order Slicing (Freeze)</span>
          </button>

          <button
            onClick={() => setActiveTab('RETRY')}
            className={`px-3 py-1.5 rounded-lg transition-colors shrink-0 cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'RETRY'
                ? 'bg-slate-800 text-white shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <RefreshCw className="w-3.5 h-3.5 text-indigo-400" />
            <span>Retries & Timeout</span>
          </button>

          <button
            onClick={() => setActiveTab('SQUARE_OFF')}
            className={`px-3 py-1.5 rounded-lg transition-colors shrink-0 cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'SQUARE_OFF'
                ? 'bg-slate-800 text-white shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Shield className="w-3.5 h-3.5 text-rose-400" />
            <span>Square-Off & Risk</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs">
          {/* Toast Notification inside modal */}
          {toastMsg && (
            <div className="p-2.5 bg-emerald-950/80 border border-emerald-800 text-emerald-300 rounded-lg flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{toastMsg}</span>
            </div>
          )}

          {/* TAB 1: ORDER TYPE & BUFFER */}
          {activeTab === 'ORDER_TYPE' && (
            <div className="space-y-4">
              <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 space-y-3">
                <label className="block font-semibold text-slate-200">
                  Default Order Execution Type
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setSettings({ ...settings, orderType: 'LIMIT' })}
                    className={`p-3 rounded-lg border text-left cursor-pointer transition-all ${
                      settings.orderType === 'LIMIT'
                        ? 'border-emerald-500 bg-emerald-950/20 text-white'
                        : 'border-slate-800 bg-slate-900 text-slate-400'
                    }`}
                  >
                    <div className="font-bold text-sm text-emerald-400">Limit with Buffer</div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      Places limit order at LTP ± buffer to avoid sudden market spikes.
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSettings({ ...settings, orderType: 'MARKET' })}
                    className={`p-3 rounded-lg border text-left cursor-pointer transition-all ${
                      settings.orderType === 'MARKET'
                        ? 'border-emerald-500 bg-emerald-950/20 text-white'
                        : 'border-slate-800 bg-slate-900 text-slate-400'
                    }`}
                  >
                    <div className="font-bold text-sm text-sky-400">Direct Market</div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      Instantly fills at best available market price.
                    </div>
                  </button>
                </div>
              </div>

              {settings.orderType === 'LIMIT' && (
                <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="font-semibold text-slate-200">
                      Limit Order Buffer Configuration
                    </label>
                    <span className="text-[11px] text-slate-400">
                      For SELL: LTP - buffer | For BUY: LTP + buffer
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <span className="text-[11px] text-slate-400 block mb-1">Buffer Mode</span>
                      <select
                        value={settings.limitBufferType}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            limitBufferType: e.target.value as 'POINTS' | 'PERCENTAGE',
                          })
                        }
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-emerald-500"
                      >
                        <option value="POINTS">Absolute Points (INR)</option>
                        <option value="PERCENTAGE">Percentage (%)</option>
                      </select>
                    </div>

                    <div>
                      <span className="text-[11px] text-slate-400 block mb-1">
                        Buffer Value ({settings.limitBufferType === 'POINTS' ? 'Points' : '%'})
                      </span>
                      <input
                        type="number"
                        step={settings.limitBufferType === 'POINTS' ? '0.1' : '0.5'}
                        value={settings.limitBufferValue}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            limitBufferValue: parseFloat(e.target.value) || 0,
                          })
                        }
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 space-y-2.5">
                <label className="flex items-center gap-2 text-slate-200 font-semibold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.priceProtectionEnabled}
                    onChange={(e) =>
                      setSettings({ ...settings, priceProtectionEnabled: e.target.checked })
                    }
                    className="rounded text-emerald-500"
                  />
                  <span>Freak Trade & Price Protection</span>
                </label>
                <p className="text-[11px] text-slate-400">
                  Guards against erroneous trades during illiquid market openings by rejecting orders if the market bid-ask spread deviates by more than the protection buffer.
                </p>
                {settings.priceProtectionEnabled && (
                  <div className="flex items-center gap-2 pt-1 font-mono">
                    <span className="text-slate-400">Protection Buffer:</span>
                    <input
                      type="number"
                      step="0.5"
                      value={settings.priceProtectionPct}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          priceProtectionPct: parseFloat(e.target.value) || 1,
                        })
                      }
                      className="w-24 bg-slate-900 border border-slate-800 rounded px-2.5 py-1 text-white text-xs"
                    />
                    <span className="text-slate-400">%</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: MARGIN & LEG SEQUENCE */}
          {activeTab === 'MARGIN_SEQ' && (
            <div className="space-y-4">
              <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 space-y-3">
                <label className="block font-semibold text-slate-200">
                  Leg Execution Sequencing (Margin Benefit)
                </label>
                <div className="space-y-2">
                  <label
                    onClick={() => setSettings({ ...settings, legSequence: 'BUY_FIRST' })}
                    className={`p-3 rounded-lg border flex items-start gap-3 cursor-pointer transition-all ${
                      settings.legSequence === 'BUY_FIRST'
                        ? 'border-emerald-500 bg-emerald-950/20 text-white'
                        : 'border-slate-800 bg-slate-900 text-slate-400'
                    }`}
                  >
                    <input
                      type="radio"
                      name="legSeq"
                      checked={settings.legSequence === 'BUY_FIRST'}
                      onChange={() => setSettings({ ...settings, legSequence: 'BUY_FIRST' })}
                      className="mt-1 text-emerald-500"
                    />
                    <div>
                      <div className="font-bold text-sm text-emerald-400">
                        Buy Legs First (Hedge First) - Highly Recommended
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        Fires BUY hedge positions first so exchange margin requirements decrease up to 70% before placing SELL positions. Avoids broker margin shortfall rejections.
                      </div>
                    </div>
                  </label>

                  <label
                    onClick={() => setSettings({ ...settings, legSequence: 'PARALLEL' })}
                    className={`p-3 rounded-lg border flex items-start gap-3 cursor-pointer transition-all ${
                      settings.legSequence === 'PARALLEL'
                        ? 'border-emerald-500 bg-emerald-950/20 text-white'
                        : 'border-slate-800 bg-slate-900 text-slate-400'
                    }`}
                  >
                    <input
                      type="radio"
                      name="legSeq"
                      checked={settings.legSequence === 'PARALLEL'}
                      onChange={() => setSettings({ ...settings, legSequence: 'PARALLEL' })}
                      className="mt-1 text-emerald-500"
                    />
                    <div>
                      <div className="font-bold text-sm text-sky-400">
                        Parallel (All Legs Concurrently)
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        Dispatches all legs simultaneously across threads for fastest entry.
                      </div>
                    </div>
                  </label>

                  <label
                    onClick={() => setSettings({ ...settings, legSequence: 'SEQUENTIAL' })}
                    className={`p-3 rounded-lg border flex items-start gap-3 cursor-pointer transition-all ${
                      settings.legSequence === 'SEQUENTIAL'
                        ? 'border-emerald-500 bg-emerald-950/20 text-white'
                        : 'border-slate-800 bg-slate-900 text-slate-400'
                    }`}
                  >
                    <input
                      type="radio"
                      name="legSeq"
                      checked={settings.legSequence === 'SEQUENTIAL'}
                      onChange={() => setSettings({ ...settings, legSequence: 'SEQUENTIAL' })}
                      className="mt-1 text-emerald-500"
                    />
                    <div>
                      <div className="font-bold text-sm text-slate-300">
                        Strict Sequential (Leg by Leg)
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        Executes leg 1, waits for exchange confirmation, then executes leg 2.
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="font-semibold text-slate-200 block">Delay Between Legs</span>
                  <span className="text-[11px] text-slate-400">
                    Inter-leg execution interval to avoid broker rate limits.
                  </span>
                </div>
                <div className="flex items-center gap-1.5 font-mono">
                  <input
                    type="number"
                    step="50"
                    value={settings.legDelayMs}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        legDelayMs: Math.max(0, parseInt(e.target.value) || 0),
                      })
                    }
                    className="w-24 bg-slate-900 border border-slate-800 rounded px-2.5 py-1 text-white text-xs"
                  />
                  <span className="text-slate-400">ms</span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: ORDER SLICING */}
          {activeTab === 'SLICING' && (
            <div className="space-y-4">
              <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 space-y-3">
                <label className="flex items-center gap-2 text-slate-200 font-semibold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.autoSliceEnabled}
                    onChange={(e) =>
                      setSettings({ ...settings, autoSliceEnabled: e.target.checked })
                    }
                    className="rounded text-emerald-500"
                  />
                  <span>Auto-Slice Orders Exceeding Exchange Freeze Limits</span>
                </label>
                <p className="text-[11px] text-slate-400">
                  NSE/BSE imposes maximum quantity limits per single order (Freeze Limits). If your portfolio lot size exceeds this, the engine automatically splits orders into compliant child chunks.
                </p>
              </div>

              {settings.autoSliceEnabled && (
                <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 space-y-3 font-mono">
                  <div className="font-bold text-slate-200 text-xs uppercase tracking-wider">
                    Max Quantity Per Sliced Order
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <span className="text-[11px] text-slate-400 block mb-1">NIFTY Freeze</span>
                      <input
                        type="number"
                        step="50"
                        value={settings.niftySliceQty}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            niftySliceQty: parseInt(e.target.value) || 1800,
                          })
                        }
                        className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1 text-white text-xs"
                      />
                      <span className="text-[10px] text-slate-500 mt-0.5 block">36 Lots (50x)</span>
                    </div>

                    <div>
                      <span className="text-[11px] text-slate-400 block mb-1">BANKNIFTY Freeze</span>
                      <input
                        type="number"
                        step="15"
                        value={settings.bankNiftySliceQty}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            bankNiftySliceQty: parseInt(e.target.value) || 900,
                          })
                        }
                        className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1 text-white text-xs"
                      />
                      <span className="text-[10px] text-slate-500 mt-0.5 block">60 Lots (15x)</span>
                    </div>

                    <div>
                      <span className="text-[11px] text-slate-400 block mb-1">FINNIFTY Freeze</span>
                      <input
                        type="number"
                        step="40"
                        value={settings.finNiftySliceQty}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            finNiftySliceQty: parseInt(e.target.value) || 1800,
                          })
                        }
                        className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1 text-white text-xs"
                      />
                      <span className="text-[10px] text-slate-500 mt-0.5 block">45 Lots (40x)</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-900 flex items-center justify-between">
                    <span className="text-slate-400 text-xs">Delay between sliced chunks:</span>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        step="50"
                        value={settings.sliceDelayMs}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            sliceDelayMs: parseInt(e.target.value) || 100,
                          })
                        }
                        className="w-20 bg-slate-900 border border-slate-800 rounded px-2 py-1 text-white text-xs"
                      />
                      <span className="text-slate-400">ms</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: RETRIES & TIMEOUT */}
          {activeTab === 'RETRY' && (
            <div className="space-y-4">
              <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 space-y-3">
                <label className="flex items-center gap-2 text-slate-200 font-semibold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.retryOnFailure}
                    onChange={(e) =>
                      setSettings({ ...settings, retryOnFailure: e.target.checked })
                    }
                    className="rounded text-emerald-500"
                  />
                  <span>Auto-Retry Rejected Orders</span>
                </label>
                <p className="text-[11px] text-slate-400">
                  If the broker API rejects an order due to transient socket errors or rate limits, auto-retry placing the leg.
                </p>

                {settings.retryOnFailure && (
                  <div className="grid grid-cols-2 gap-3 pt-2 font-mono">
                    <div>
                      <span className="text-[11px] text-slate-400 block mb-1">Max Retries</span>
                      <select
                        value={settings.maxRetries}
                        onChange={(e) =>
                          setSettings({ ...settings, maxRetries: parseInt(e.target.value) || 1 })
                        }
                        className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1 text-white text-xs"
                      >
                        <option value="1">1 Attempt</option>
                        <option value="2">2 Attempts</option>
                        <option value="3">3 Attempts (Standard)</option>
                        <option value="5">5 Attempts</option>
                      </select>
                    </div>

                    <div>
                      <span className="text-[11px] text-slate-400 block mb-1">Retry Interval</span>
                      <select
                        value={settings.retryIntervalMs}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            retryIntervalMs: parseInt(e.target.value) || 500,
                          })
                        }
                        className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1 text-white text-xs"
                      >
                        <option value="250">250 ms</option>
                        <option value="500">500 ms</option>
                        <option value="1000">1000 ms (1s)</option>
                        <option value="2000">2000 ms (2s)</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>

              <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-200">
                    Unfilled Limit Order Timeout Action
                  </span>
                  <span className="text-[11px] text-slate-400">
                    When limit order remains unexecuted
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-[11px] text-slate-400 block mb-1">Timeout Seconds</span>
                    <div className="flex items-center gap-1.5 font-mono">
                      <input
                        type="number"
                        min="2"
                        max="120"
                        value={settings.unfilledTimeoutSeconds}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            unfilledTimeoutSeconds: parseInt(e.target.value) || 10,
                          })
                        }
                        className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1 text-white text-xs"
                      />
                      <span className="text-slate-400">sec</span>
                    </div>
                  </div>

                  <div>
                    <span className="text-[11px] text-slate-400 block mb-1">On Timeout Action</span>
                    <select
                      value={settings.unfilledOrderAction}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          unfilledOrderAction: e.target.value as any,
                        })
                      }
                      className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1 text-white text-xs font-mono"
                    >
                      <option value="CONVERT_TO_MARKET">Convert to Market (Recommended default)</option>
                      <option value="CANCEL">Cancel Order & Halt Strategy</option>
                      <option value="KEEP_OPEN">Keep Waiting indefinitely</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: SQUARE-OFF & RISK */}
          {activeTab === 'SQUARE_OFF' && (
            <div className="space-y-4">
              <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="font-semibold text-slate-200 block">
                    Intraday Auto Square-Off Time
                  </span>
                  <span className="text-[11px] text-slate-400">
                    All intraday option legs will be closed automatically before broker cutoff.
                  </span>
                </div>
                <input
                  type="time"
                  value={settings.autoSquareOffTime}
                  onChange={(e) =>
                    setSettings({ ...settings, autoSquareOffTime: e.target.value })
                  }
                  className="bg-slate-900 border border-slate-800 rounded px-3 py-1.5 text-white font-mono text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 space-y-2">
                <label className="flex items-center gap-2 text-slate-200 font-semibold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.cancelPendingOrdersOnSquareOff}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        cancelPendingOrdersOnSquareOff: e.target.checked,
                      })
                    }
                    className="rounded text-emerald-500"
                  />
                  <span>Cancel Pending SL/Limit Orders Before Square-Off</span>
                </label>
                <p className="text-[11px] text-slate-400">
                  Prevents double execution where an open Stop Loss order triggers right after a manual or intraday square-off market order.
                </p>
              </div>

              <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 space-y-3 font-mono">
                <label className="flex items-center gap-2 text-slate-200 font-semibold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.killSwitchEnabled}
                    onChange={(e) =>
                      setSettings({ ...settings, killSwitchEnabled: e.target.checked })
                    }
                    className="rounded text-rose-500"
                  />
                  <span className="text-rose-400">Master Account Kill Switch</span>
                </label>
                <p className="text-[11px] text-slate-400">
                  Automatically squares off all live positions and permanently blocks new entries for the remainder of the day if daily MTM loss breaches this threshold.
                </p>
                {settings.killSwitchEnabled && (
                  <div className="flex items-center gap-2 pt-1">
                    <span className="text-slate-400 text-xs">Kill Switch Max Loss:</span>
                    <span className="text-slate-300">₹</span>
                    <input
                      type="number"
                      step="1000"
                      value={settings.killSwitchMaxLoss}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          killSwitchMaxLoss: parseInt(e.target.value) || 0,
                        })
                      }
                      className="w-32 bg-slate-900 border border-slate-800 rounded px-2.5 py-1 text-white text-xs"
                    />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3.5 border-t border-slate-800 bg-slate-950/60">
          <button
            type="button"
            onClick={handleResetDefaults}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset to Bhaarath Algo Defaults</span>
          </button>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 text-xs text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleSave}
              className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-colors cursor-pointer shadow-sm flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Save Execution Settings</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
