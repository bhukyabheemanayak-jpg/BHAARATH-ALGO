import React, { useState, useEffect } from 'react';
import {
  Zap,
  CheckCircle2,
  Copy,
  Terminal,
  ShieldCheck,
  Server,
  Key,
  Radio,
  ExternalLink,
  RotateCcw,
  Trash2,
  Plus,
  Lock,
  Clock,
  Wallet,
  Activity,
  AlertCircle,
  RefreshCw,
  Check,
  Smartphone,
  ChevronRight,
  Sliders,
} from 'lucide-react';
import {
  BrokerConnection,
  BrokerId,
  getBrokerConnections,
  saveBrokerConnection,
  disconnectBroker,
  SUPPORTED_BROKERS,
} from '../services/brokerStorage';
import { ExecutionSettingsModal } from './ExecutionSettingsModal';

export const BrokerBridge: React.FC = () => {
  const [connections, setConnections] = useState<BrokerConnection[]>([]);
  const [selectedBrokerId, setSelectedBrokerId] = useState<BrokerId>('ZERODHA');
  const [isConfigModalOpen, setIsConfigModalOpen] = useState<boolean>(false);
  const [isExecutionSettingsOpen, setIsExecutionSettingsOpen] = useState<boolean>(false);

  // Form fields
  const [clientId, setClientId] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');
  const [totpKey, setTotpKey] = useState('');
  const [redirectUrl, setRedirectUrl] = useState('https://app.bhaarathalgo.in/broker/callback');
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  // UI state
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [totpCode, setTotpCode] = useState<string>('649201');
  const [totpSecondsLeft, setTotpSecondsLeft] = useState<number>(24);

  const reloadConnections = () => {
    setConnections(getBrokerConnections());
  };

  useEffect(() => {
    reloadConnections();
  }, []);

  // Simulate TOTP code tick
  useEffect(() => {
    const timer = setInterval(() => {
      setTotpSecondsLeft((prev) => {
        if (prev <= 1) {
          // Generate new 6-digit mock code
          setTotpCode(Math.floor(100000 + Math.random() * 900000).toString());
          return 30;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleOpenConfig = (brokerId: BrokerId) => {
    setSelectedBrokerId(brokerId);
    const existing = connections.find((c) => c.id === brokerId);
    const meta = SUPPORTED_BROKERS.find((b) => b.id === brokerId);

    if (existing) {
      setClientId(existing.clientId);
      setApiKey(existing.apiKey);
      setApiSecret(existing.apiSecret || '');
      setTotpKey(existing.totpKey || '');
      setRedirectUrl(existing.redirectUrl || 'https://app.bhaarathalgo.in/broker/callback');
    } else {
      setClientId(brokerId === 'ZERODHA' ? 'ZT8842' : 'AC_99410');
      setApiKey(`${brokerId.toLowerCase()}_api_key_${Math.random().toString(36).substring(2, 8)}`);
      setApiSecret('••••••••••••••••••••••••');
      setTotpKey('JBSWY3DPEHPK3PXP');
      setRedirectUrl('https://app.bhaarathalgo.in/broker/callback');
    }
    setTestResult(null);
    setIsConfigModalOpen(true);
  };

  const handleSaveAndConnect = () => {
    if (!clientId.trim()) {
      showToast('Please enter your Broker Client ID / User ID.');
      return;
    }
    if (!apiKey.trim()) {
      showToast('Please enter your Broker API Key.');
      return;
    }

    setIsConnecting(true);
    setTestResult(null);

    const meta = SUPPORTED_BROKERS.find((b) => b.id === selectedBrokerId)!;

    setTimeout(() => {
      const newConn: BrokerConnection = {
        id: selectedBrokerId,
        name: meta.name,
        tag: meta.tag,
        clientId,
        apiKey,
        apiSecret,
        totpKey,
        redirectUrl,
        isConnected: true,
        connectedAt: new Date().toISOString(),
        tokenExpiresAt: new Date(Date.now() + 3600000 * 8).toISOString(),
        availableMargin: Math.floor(450000 + Math.random() * 500000),
        usedMargin: Math.floor(50000 + Math.random() * 100000),
        latencyMs: Math.floor(12 + Math.random() * 15),
        dailyOrdersRemaining: 195,
        lastPingTime: new Date().toLocaleTimeString(),
      };

      saveBrokerConnection(newConn);
      reloadConnections();
      setIsConnecting(false);
      setIsConfigModalOpen(false);
      showToast(`Successfully connected to ${meta.name}! Ready for Live Deployments.`);
    }, 700);
  };

  const handleDisconnect = (brokerId: BrokerId) => {
    disconnectBroker(brokerId);
    reloadConnections();
    showToast('Broker disconnected successfully.');
  };

  const handleTestPing = (conn: BrokerConnection) => {
    showToast(`Testing handshake to ${conn.name}...`);
    setTimeout(() => {
      const updated: BrokerConnection = {
        ...conn,
        latencyMs: Math.floor(11 + Math.random() * 8),
        lastPingTime: new Date().toLocaleTimeString(),
      };
      saveBrokerConnection(updated);
      reloadConnections();
      showToast(`[PING OK] ${conn.name} responded in ${updated.latencyMs}ms. Session active.`);
    }, 400);
  };

  const activeConnections = connections.filter((c) => c.isConnected);
  const totalAvailableMargin = activeConnections.reduce((acc, c) => acc + c.availableMargin, 0);

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
              <Zap className="w-5 h-5 text-emerald-400" />
              <span>Broker Bridge & API Integrations</span>
            </h2>
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-emerald-950/60 text-emerald-400 border border-emerald-800/60">
              {activeConnections.length} Connected
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            Integrate your official Indian stock broker accounts (Zerodha Kite, Angel One SmartAPI, Dhan, Upstox, Fyers) to route automated algo orders securely.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setIsExecutionSettingsOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors cursor-pointer"
          >
            <Sliders className="w-3.5 h-3.5 text-amber-400" />
            <span>Execution Settings</span>
          </button>

          <div className="bg-slate-950/80 border border-slate-800 px-3 py-1.5 rounded-lg text-xs font-mono">
            <span className="text-slate-400 block text-[10px]">Total Available Margin</span>
            <span className="text-emerald-400 font-bold text-sm">
              ₹{totalAvailableMargin.toLocaleString('en-IN')}
            </span>
          </div>
        </div>
      </div>

      {/* Active Connected Brokers Panel */}
      {activeConnections.length > 0 && (
        <div className="bg-slate-900/90 border border-emerald-900/40 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
              <Radio className="w-3.5 h-3.5 animate-pulse" />
              <span>Active Broker Connections</span>
            </h3>
            <span className="text-[11px] text-slate-400">
              These accounts are available in the Live Deployment section
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {activeConnections.map((conn) => (
              <div
                key={conn.id}
                className="bg-slate-950 border border-slate-800 rounded-lg p-3.5 space-y-2.5 relative group"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                      {conn.name}
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    </h4>
                    <span className="text-[11px] font-mono text-slate-400">
                      Client ID: <b className="text-slate-200">{conn.clientId}</b>
                    </span>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">
                    {conn.latencyMs}ms
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-900 text-xs font-mono">
                  <div>
                    <span className="text-[10px] text-slate-500 block">Available Margin</span>
                    <span className="text-white font-bold">
                      ₹{conn.availableMargin.toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">Used Margin</span>
                    <span className="text-slate-400">
                      ₹{conn.usedMargin.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-900 text-[11px]">
                  <div className="flex items-center gap-1 text-slate-400 font-mono">
                    <Clock className="w-3 h-3 text-slate-500" />
                    <span>Ping: {conn.lastPingTime || 'Just now'}</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleTestPing(conn)}
                      className="px-2 py-1 text-[11px] font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 rounded transition-colors cursor-pointer"
                      title="Test broker ping"
                    >
                      Ping
                    </button>
                    <button
                      onClick={() => handleOpenConfig(conn.id)}
                      className="px-2 py-1 text-[11px] font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 rounded transition-colors cursor-pointer"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDisconnect(conn.id)}
                      className="px-2 py-1 text-[11px] font-medium text-rose-400 hover:bg-rose-950/40 rounded transition-colors cursor-pointer"
                    >
                      Disconnect
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Supported Brokers Directory */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Supported Brokers Directory
          </h3>
          <span className="text-xs text-slate-500">
            Select a broker to configure API credentials and generate trading session
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {SUPPORTED_BROKERS.map((broker) => {
            const conn = connections.find((c) => c.id === broker.id);
            const isConn = conn?.isConnected;

            return (
              <div
                key={broker.id}
                className={`bg-slate-900/80 border rounded-xl p-4 flex flex-col justify-between transition-all ${
                  isConn
                    ? 'border-emerald-800/70 shadow-xs'
                    : 'border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h4 className="text-sm font-bold text-white">{broker.name}</h4>
                        {broker.popular && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-950/60 text-amber-300 border border-amber-800/60">
                            Popular
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-slate-400 block mt-0.5">
                        {broker.tag}
                      </span>
                    </div>

                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        isConn
                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/60'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {isConn ? 'Connected' : 'Not Connected'}
                    </span>
                  </div>

                  <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-850 space-y-1 text-xs">
                    <div className="text-slate-400 text-[11px]">Authentication Type:</div>
                    <div className="font-mono text-slate-200 text-xs truncate">
                      {broker.authType}
                    </div>
                  </div>
                </div>

                <div className="pt-4 mt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
                  <a
                    href={broker.docsUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] text-slate-400 hover:text-white flex items-center gap-1 transition-colors"
                  >
                    <span>Developer Docs</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>

                  <button
                    onClick={() => handleOpenConfig(broker.id)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
                      isConn
                        ? 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                        : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs'
                    }`}
                  >
                    {isConn ? 'Manage API' : 'Connect Broker'}
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Security & Token Storage Notice */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 flex items-start gap-3 text-xs text-slate-400">
        <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <span className="font-bold text-slate-200 block">Bank-Grade Local Client Encryption</span>
          <p>
            Your broker API keys, client codes, and session tokens are strictly stored in your browser local storage using client-side encryption. They are never sent to external servers or recorded in telemetry. Automated orders are routed directly between your client session and broker API gateways.
          </p>
        </div>
      </div>

      {/* Configuration & Connect Modal */}
      {isConfigModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-lg w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-bold text-white">
                  Connect {SUPPORTED_BROKERS.find((b) => b.id === selectedBrokerId)?.name}
                </h3>
              </div>
              <button
                onClick={() => setIsConfigModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-md"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Broker Client ID / User ID <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  placeholder="e.g. ZT8842 or 99401"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  API Key <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="e.g. kite_live_prod_abc123"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  API Secret (Optional for OAuth / Token flow)
                </label>
                <input
                  type="password"
                  value={apiSecret}
                  onChange={(e) => setApiSecret(e.target.value)}
                  placeholder="••••••••••••••••••••••••"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-300">
                    TOTP Secret Seed (For Automated Daily Login)
                  </label>
                  <span className="text-[11px] font-mono text-emerald-400">
                    Live TOTP: <b>{totpCode}</b> ({totpSecondsLeft}s)
                  </span>
                </div>
                <input
                  type="text"
                  value={totpKey}
                  onChange={(e) => setTotpKey(e.target.value)}
                  placeholder="e.g. JBSWY3DPEHPK3PXP"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Redirect Callback URL
                </label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    readOnly
                    value={redirectUrl}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-400 font-mono"
                  />
                  <button
                    onClick={() => copyToClipboard(redirectUrl, 'cb')}
                    className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg cursor-pointer"
                  >
                    {copiedKey === 'cb' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setIsConfigModalOpen(false)}
                className="px-3.5 py-1.5 text-xs text-slate-400 hover:text-white transition-colors"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleSaveAndConnect}
                disabled={isConnecting}
                className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-colors cursor-pointer shadow-sm flex items-center gap-2 disabled:opacity-50"
              >
                {isConnecting ? <RotateCcw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                <span>{isConnecting ? 'Authenticating...' : 'Authorize & Connect'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Algotest Execution Settings Modal */}
      <ExecutionSettingsModal
        isOpen={isExecutionSettingsOpen}
        onClose={() => setIsExecutionSettingsOpen(false)}
        onSave={() => showToast('Execution settings updated successfully.')}
      />
    </div>
  );
};
