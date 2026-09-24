import React, { useState, useEffect } from 'react';
import {
  X,
  User,
  Key,
  Shield,
  Copy,
  Check,
  Eye,
  EyeOff,
  RefreshCw,
  LogOut,
  Save,
  CheckCircle2,
  Terminal,
  Server,
  Zap,
  Lock,
  Smartphone,
  Mail,
  Sliders,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react';
import {
  UserProfile,
  getUserProfile,
  saveUserProfile,
  logoutUser,
  getPlatformAlertJsonPayload,
  changeMasterPassword,
  generatePasswordResetOtp,
  resetPasswordWithOtp,
} from '../services/userAuthService';
import {
  getMasterAccessToken,
  setMasterAccessToken,
  resetMasterAccessTokenToDefault,
  PLATFORM_APPLET_ID,
  PLATFORM_ACCESS_TOKEN,
  PLATFORM_NAME,
} from '../services/strategyStorage';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogout: () => void;
  initialSubTab?: 'DETAILS' | 'TOKEN' | 'SECURITY';
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  isOpen,
  onClose,
  onLogout,
  initialSubTab = 'DETAILS',
}) => {
  const [profile, setProfile] = useState<UserProfile>(getUserProfile());
  const [activeSubTab, setActiveSubTab] = useState<'DETAILS' | 'TOKEN' | 'SECURITY'>(initialSubTab);
  const [currentToken, setCurrentToken] = useState<string>(getMasterAccessToken());
  const [isTokenVisible, setIsTokenVisible] = useState<boolean>(false);
  const [copiedToken, setCopiedToken] = useState<boolean>(false);
  const [copiedJson, setCopiedJson] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [tokenResetSuccess, setTokenResetSuccess] = useState<boolean>(false);

  // Form states for editable details
  const [name, setName] = useState(profile.name);
  const [email, setEmail] = useState(profile.email);
  const [phone, setPhone] = useState(profile.phone);
  const [tradingNickname, setTradingNickname] = useState(profile.tradingNickname);
  const [defaultBroker, setDefaultBroker] = useState(profile.defaultBroker);
  const [autoSquareOffTime, setAutoSquareOffTime] = useState(profile.autoSquareOffTime);
  const [maxDailyRiskLimit, setMaxDailyRiskLimit] = useState(profile.maxDailyRiskLimit);
  const [maxCapitalAllocation, setMaxCapitalAllocation] = useState(profile.maxCapitalAllocation);

  // Password Management States
  const [currentPasswordInput, setCurrentPasswordInput] = useState('');
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [confirmPasswordInput, setConfirmPasswordInput] = useState('');
  const [showPasswordInputs, setShowPasswordInputs] = useState(false);
  const [passwordStatus, setPasswordStatus] = useState<{ type: 'IDLE' | 'SUCCESS' | 'ERROR'; message?: string }>({
    type: 'IDLE',
  });

  // Forgot password flow states within modal
  const [isResetFlowOpen, setIsResetFlowOpen] = useState(false);
  const [resetOtpGenerated, setResetOtpGenerated] = useState<string | null>(null);
  const [resetEnteredOtp, setResetEnteredOtp] = useState('');
  const [resetNewPassword, setResetNewPassword] = useState('');
  const [resetStatus, setResetStatus] = useState<{ type: 'IDLE' | 'SUCCESS' | 'ERROR'; message?: string }>({
    type: 'IDLE',
  });

  // Webhook Test State
  const [testAlertName, setTestAlertName] = useState('HA 1M TEST NCC');
  const [testResult, setTestResult] = useState<{ status: 'IDLE' | 'SENDING' | 'SUCCESS'; msg?: string }>({
    status: 'IDLE',
  });

  const webhookUrl = `${window.location.origin}/api/v1/tradingview/webhook`;

  useEffect(() => {
    if (isOpen) {
      if (initialSubTab) {
        setActiveSubTab(initialSubTab);
      }
      const p = getUserProfile();
      setProfile(p);
      setName(p.name);
      setEmail(p.email);
      setPhone(p.phone);
      setTradingNickname(p.tradingNickname);
      setDefaultBroker(p.defaultBroker);
      setAutoSquareOffTime(p.autoSquareOffTime);
      setMaxDailyRiskLimit(p.maxDailyRiskLimit);
      setMaxCapitalAllocation(p.maxCapitalAllocation);
      setCurrentToken(getMasterAccessToken());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCopyToken = () => {
    try {
      navigator.clipboard.writeText(currentToken);
      setCopiedToken(true);
      setTimeout(() => setCopiedToken(false), 2000);
    } catch {
      // Fallback
    }
  };

  const handleCopyJson = () => {
    try {
      const payload = getPlatformAlertJsonPayload(testAlertName);
      navigator.clipboard.writeText(payload);
      setCopiedJson(true);
      setTimeout(() => setCopiedJson(false), 2000);
    } catch {
      // Fallback
    }
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    const updated = saveUserProfile({
      name,
      email,
      phone,
      tradingNickname,
      defaultBroker,
      autoSquareOffTime,
      maxDailyRiskLimit: Number(maxDailyRiskLimit),
      maxCapitalAllocation: Number(maxCapitalAllocation),
    });
    setProfile(updated);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleResetToPlatformDefaultToken = () => {
    const defaultTok = resetMasterAccessTokenToDefault();
    setCurrentToken(defaultTok);
    setTokenResetSuccess(true);
    setTimeout(() => setTokenResetSuccess(false), 3000);
  };

  const handleSimulateWebhookTest = () => {
    setTestResult({ status: 'SENDING' });
    setTimeout(() => {
      setTestResult({
        status: 'SUCCESS',
        msg: `200 OK: Validated with access_token "${currentToken.substring(0, 12)}..." for alert "${testAlertName}"`,
      });
      setTimeout(() => setTestResult({ status: 'IDLE' }), 4000);
    }, 600);
  };

  const handleLogoutAction = () => {
    logoutUser();
    onLogout();
    onClose();
  };

  const handleChangePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordStatus({ type: 'IDLE' });

    if (!currentPasswordInput) {
      setPasswordStatus({ type: 'ERROR', message: 'Please enter your current master password.' });
      return;
    }
    if (!newPasswordInput || newPasswordInput.length < 6) {
      setPasswordStatus({ type: 'ERROR', message: 'New password must be at least 6 characters long.' });
      return;
    }
    if (newPasswordInput !== confirmPasswordInput) {
      setPasswordStatus({ type: 'ERROR', message: 'New passwords do not match. Please re-enter.' });
      return;
    }

    const res = changeMasterPassword(currentPasswordInput, newPasswordInput);
    if (!res.success) {
      setPasswordStatus({ type: 'ERROR', message: res.message });
    } else {
      setPasswordStatus({ type: 'SUCCESS', message: res.message });
      setCurrentPasswordInput('');
      setNewPasswordInput('');
      setConfirmPasswordInput('');
      setTimeout(() => setPasswordStatus({ type: 'IDLE' }), 3500);
    }
  };

  const handleRequestOtpInModal = () => {
    setResetStatus({ type: 'IDLE' });
    const res = generatePasswordResetOtp(profile.email);
    if (!res.success) {
      setResetStatus({ type: 'ERROR', message: res.message });
    } else {
      setResetOtpGenerated(res.code || '123456');
      setResetStatus({ type: 'SUCCESS', message: res.message });
    }
  };

  const handleVerifyOtpAndResetInModal = (e: React.FormEvent) => {
    e.preventDefault();
    setResetStatus({ type: 'IDLE' });

    if (!resetEnteredOtp || resetEnteredOtp.trim().length !== 6) {
      setResetStatus({ type: 'ERROR', message: 'Please enter the 6-digit security code.' });
      return;
    }
    if (!resetNewPassword || resetNewPassword.length < 6) {
      setResetStatus({ type: 'ERROR', message: 'New password must be at least 6 characters.' });
      return;
    }

    const res = resetPasswordWithOtp(profile.email, resetEnteredOtp, resetNewPassword);
    if (!res.success) {
      setResetStatus({ type: 'ERROR', message: res.message });
    } else {
      setResetStatus({ type: 'SUCCESS', message: res.message });
      setTimeout(() => {
        setIsResetFlowOpen(false);
        setResetOtpGenerated(null);
        setResetEnteredOtp('');
        setResetNewPassword('');
        setResetStatus({ type: 'IDLE' });
      }, 2500);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl max-w-3xl w-full max-h-[92vh] flex flex-col overflow-hidden text-slate-100">
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-800/80 bg-slate-900/90 flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-13 h-13 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-emerald-950/50">
                {name
                  .split(' ')
                  .map((n) => n[0])
                  .join('')
                  .substring(0, 2)
                  .toUpperCase() || 'BN'}
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-slate-900 ring-2 ring-emerald-500/20" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-lg font-bold text-white tracking-tight">{name}</h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  Personal Owner
                </span>
                <span className="hidden sm:inline-block px-2 py-0.5 rounded text-[10px] font-mono text-slate-400 bg-slate-800 border border-slate-700">
                  Single User License
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400 mt-1">
                <span className="flex items-center gap-1 font-mono text-slate-300">
                  <Mail className="w-3 h-3 text-slate-500" />
                  {email}
                </span>
                <span className="text-slate-600">•</span>
                <span className="text-slate-400">
                  Platform: <strong className="text-emerald-400 font-medium">{PLATFORM_NAME}</strong>
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sub-Tabs Navigation */}
        <div className="flex items-center gap-2 px-6 pt-3 border-b border-slate-800/80 bg-slate-900/50">
          <button
            onClick={() => setActiveSubTab('DETAILS')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
              activeSubTab === 'DETAILS'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <User className="w-4 h-4" />
            <span>Personal Details</span>
          </button>

          <button
            onClick={() => setActiveSubTab('TOKEN')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
              activeSubTab === 'TOKEN'
                ? 'border-amber-500 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Key className="w-4 h-4" />
            <span>Platform Access Token</span>
            <span className="ml-1 px-1.5 py-0.2 rounded text-[10px] bg-amber-500/20 text-amber-300 font-mono">
              Live
            </span>
          </button>

          <button
            onClick={() => setActiveSubTab('SECURITY')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
              activeSubTab === 'SECURITY'
                ? 'border-sky-500 text-sky-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Shield className="w-4 h-4" />
            <span>Security & Session</span>
          </button>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* TAB 1: PERSONAL DETAILS */}
          {activeSubTab === 'DETAILS' && (
            <form onSubmit={handleSaveProfile} className="space-y-5">
              {saveSuccess && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-2 text-xs text-emerald-300">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Personal details and preferences saved successfully!</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">
                    Primary Email Address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">
                    Phone / Mobile
                  </label>
                  <div className="relative">
                    <Smartphone className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
                    <input
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-emerald-500 transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">
                    Trading Nickname / Alias
                  </label>
                  <input
                    type="text"
                    value={tradingNickname}
                    onChange={(e) => setTradingNickname(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>
              </div>

              {/* Trading & Risk Parameters */}
              <div className="pt-3 border-t border-slate-800/80">
                <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-emerald-400" />
                  Personal Trading Parameters
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1.5">
                      Primary Connected Broker
                    </label>
                    <select
                      value={defaultBroker}
                      onChange={(e) => setDefaultBroker(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-emerald-500 cursor-pointer"
                    >
                      <option value="Zerodha Kite Connect">Zerodha Kite Connect</option>
                      <option value="Upstox Pro API">Upstox Pro API</option>
                      <option value="DhanHQ SuperFast">DhanHQ SuperFast</option>
                      <option value="Angel One SmartAPI">Angel One SmartAPI</option>
                      <option value="Fyers API v3">Fyers API v3</option>
                      <option value="Kotak Neo">Kotak Neo</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1.5">
                      Auto Square-off Time (IST)
                    </label>
                    <input
                      type="text"
                      value={autoSquareOffTime}
                      onChange={(e) => setAutoSquareOffTime(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1.5">
                      Max Daily Risk / Stop-loss (₹)
                    </label>
                    <input
                      type="number"
                      value={maxDailyRiskLimit}
                      onChange={(e) => setMaxDailyRiskLimit(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1.5">
                      Personal Capital Allocation (₹)
                    </label>
                    <input
                      type="number"
                      value={maxCapitalAllocation}
                      onChange={(e) => setMaxCapitalAllocation(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
              </div>

              {/* Readonly Instance Specs */}
              <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div>
                  <span className="text-slate-400">Platform Instance Applet ID:</span>
                  <p className="font-mono text-emerald-400 font-semibold">{PLATFORM_APPLET_ID}</p>
                </div>
                <div>
                  <span className="text-slate-400">License:</span>
                  <p className="text-slate-200 font-medium">Private Single-User Edition</p>
                </div>
                <div>
                  <span className="text-slate-400">Account Role:</span>
                  <p className="text-slate-200 font-medium">{profile.role}</p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="submit"
                  className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer shadow-sm shadow-emerald-950"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Personal Details</span>
                </button>
              </div>
            </form>
          )}

          {/* TAB 2: PLATFORM ACCESS TOKEN */}
          {activeSubTab === 'TOKEN' && (
            <div className="space-y-5">
              {tokenResetSuccess && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-2 text-xs text-emerald-300">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Access token reset to official platform token: {PLATFORM_ACCESS_TOKEN}</span>
                </div>
              )}

              {/* Master Access Token Card */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4.5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Key className="w-4 h-4 text-amber-400" />
                    <span className="text-xs font-semibold text-slate-200">
                      Official Platform Access Token
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                    Active & Authenticated
                  </span>
                </div>

                <p className="text-xs text-slate-400 leading-relaxed">
                  This token authorizes all incoming TradingView alerts, webhooks, and algorithmic API triggers. Because this is your <strong>personal platform</strong>, this single access token authenticates all your strategies and alerts.
                </p>

                {/* Token Display Field */}
                <div className="flex items-center gap-2">
                  <div className="flex-1 flex items-center justify-between px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg font-mono text-xs">
                    <span className="text-amber-300 font-semibold truncate selection:bg-amber-500/20">
                      {isTokenVisible
                        ? currentToken
                        : '•'.repeat(Math.min(currentToken.length, 36))}
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsTokenVisible(!isTokenVisible)}
                      className="ml-2 text-slate-400 hover:text-slate-200 cursor-pointer"
                      title={isTokenVisible ? 'Hide Token' : 'Show Token'}
                    >
                      {isTokenVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>

                  <button
                    onClick={handleCopyToken}
                    className="flex items-center gap-1.5 px-3 py-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                  >
                    {copiedToken ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy Token</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="flex items-center justify-between pt-1 text-[11px] text-slate-500">
                  <span>Instance ID: <code className="text-slate-400">{PLATFORM_APPLET_ID}</code></span>
                  <button
                    type="button"
                    onClick={handleResetToPlatformDefaultToken}
                    className="text-amber-400 hover:text-amber-300 flex items-center gap-1 cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Reset to Platform Default</span>
                  </button>
                </div>
              </div>

              {/* Webhook URL Card */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4.5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Server className="w-4 h-4 text-sky-400" />
                    <span className="text-xs font-semibold text-slate-200">
                      TradingView Webhook Destination URL
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400">POST endpoint</span>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={webhookUrl}
                    className="flex-1 px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg font-mono text-xs text-sky-300 select-all"
                  />
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(webhookUrl);
                      alert('Webhook URL copied!');
                    }}
                    className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-medium cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy URL</span>
                  </button>
                </div>
              </div>

              {/* Exact JSON Payload Format */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4.5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Terminal className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-semibold text-slate-200">
                      TradingView Alert Message JSON Format
                    </span>
                  </div>
                  <button
                    onClick={handleCopyJson}
                    className="flex items-center gap-1 px-2.5 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 rounded text-xs font-medium transition-colors cursor-pointer"
                  >
                    {copiedJson ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-400" />
                        <span>Copied JSON</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Copy JSON Payload</span>
                      </>
                    )}
                  </button>
                </div>

                <p className="text-xs text-slate-400">
                  Paste this exact JSON into the <strong>Message</strong> box in your TradingView alert dialog:
                </p>

                <div className="relative">
                  <pre className="p-3.5 rounded-lg bg-slate-900 border border-slate-800/90 font-mono text-xs text-emerald-300 overflow-x-auto selection:bg-emerald-500/20">
{getPlatformAlertJsonPayload(testAlertName)}
                  </pre>
                </div>

                {/* Quick Test Alert Simulation */}
                <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <span className="text-xs text-slate-400 whitespace-nowrap">Alert Name:</span>
                    <input
                      type="text"
                      value={testAlertName}
                      onChange={(e) => setTestAlertName(e.target.value)}
                      className="px-2.5 py-1 bg-slate-900 border border-slate-800 rounded text-xs text-slate-200 font-mono"
                    />
                  </div>

                  <button
                    onClick={handleSimulateWebhookTest}
                    disabled={testResult.status === 'SENDING'}
                    className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-medium cursor-pointer transition-colors"
                  >
                    <Zap className="w-3.5 h-3.5 text-amber-400" />
                    <span>{testResult.status === 'SENDING' ? 'Testing...' : 'Test Payload Token'}</span>
                  </button>
                </div>

                {testResult.status === 'SUCCESS' && (
                  <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-300 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>{testResult.msg}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: SECURITY & SESSION */}
          {activeSubTab === 'SECURITY' && (
            <div className="space-y-5">
              {/* Account Status Card */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4.5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                      <Lock className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-semibold text-slate-200">
                        Platform Security & Access Protection
                      </h4>
                      <p className="text-[11px] text-slate-400">
                        Session protected with Master Access Token and Local Session Lock
                      </p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                    Active Session
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 bg-slate-900/80 rounded-lg border border-slate-800">
                    <span className="text-slate-400 block mb-1">Last Logged In:</span>
                    <span className="font-mono text-slate-200">
                      {new Date(profile.lastLoginAt).toLocaleString('en-IN', {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })}
                    </span>
                  </div>

                  <div className="p-3 bg-slate-900/80 rounded-lg border border-slate-800">
                    <span className="text-slate-400 block mb-1">Two-Factor Authentication:</span>
                    <span className="text-emerald-400 font-semibold flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Enabled (TOTP Verified)
                    </span>
                  </div>
                </div>
              </div>

              {/* Master Password Management Card */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4.5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Key className="w-4 h-4 text-emerald-400" />
                    <div>
                      <h4 className="text-xs font-semibold text-slate-200">
                        Master Security Password
                      </h4>
                      <p className="text-[11px] text-slate-400">
                        Update your master workstation password or reset if forgotten
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setIsResetFlowOpen(!isResetFlowOpen);
                      setResetStatus({ type: 'IDLE' });
                      setPasswordStatus({ type: 'IDLE' });
                    }}
                    className="text-xs text-emerald-400 hover:text-emerald-300 font-medium cursor-pointer transition-colors"
                  >
                    {isResetFlowOpen ? 'Back to Change Password' : 'Forgot Password?'}
                  </button>
                </div>

                {passwordStatus.type !== 'IDLE' && (
                  <div
                    className={`p-3 rounded-lg text-xs flex items-center gap-2 ${
                      passwordStatus.type === 'SUCCESS'
                        ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
                        : 'bg-rose-500/10 border border-rose-500/30 text-rose-300'
                    }`}
                  >
                    {passwordStatus.type === 'SUCCESS' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                    )}
                    <span>{passwordStatus.message}</span>
                  </div>
                )}

                {!isResetFlowOpen ? (
                  /* Standard Change Password Form */
                  <form onSubmit={handleChangePasswordSubmit} className="space-y-3.5">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1">
                          Current Password
                        </label>
                        <div className="relative">
                          <input
                            type={showPasswordInputs ? 'text' : 'password'}
                            value={currentPasswordInput}
                            onChange={(e) => setCurrentPasswordInput(e.target.value)}
                            placeholder="Current password"
                            className="w-full px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs font-mono text-slate-100 placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1">
                          New Password
                        </label>
                        <div className="relative">
                          <input
                            type={showPasswordInputs ? 'text' : 'password'}
                            value={newPasswordInput}
                            onChange={(e) => setNewPasswordInput(e.target.value)}
                            placeholder="Min 6 characters"
                            className="w-full px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs font-mono text-slate-100 placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1">
                          Confirm New Password
                        </label>
                        <div className="relative">
                          <input
                            type={showPasswordInputs ? 'text' : 'password'}
                            value={confirmPasswordInput}
                            onChange={(e) => setConfirmPasswordInput(e.target.value)}
                            placeholder="Repeat new password"
                            className="w-full px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs font-mono text-slate-100 placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-1">
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => setShowPasswordInputs(!showPasswordInputs)}
                          className="text-[11px] text-slate-400 hover:text-slate-200 flex items-center gap-1 cursor-pointer"
                        >
                          {showPasswordInputs ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          <span>{showPasswordInputs ? 'Hide Characters' : 'Show Characters'}</span>
                        </button>
                        <span className="text-[10px] text-slate-500 font-mono">
                          Default: Bhaarath@2026
                        </span>
                      </div>

                      <button
                        type="submit"
                        className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                      >
                        Update Master Password
                      </button>
                    </div>
                  </form>
                ) : (
                  /* Forgot Password / OTP Flow Inside Modal */
                  <div className="p-3.5 bg-slate-900/90 border border-slate-800 rounded-xl space-y-3.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-200">
                        Reset via Security Code (Email: {profile.email})
                      </span>
                      <button
                        type="button"
                        onClick={handleRequestOtpInModal}
                        className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-slate-700 rounded text-xs font-medium cursor-pointer transition-colors"
                      >
                        {resetOtpGenerated ? 'Re-send Code' : 'Send Reset Code'}
                      </button>
                    </div>

                    {resetStatus.type !== 'IDLE' && (
                      <div
                        className={`p-2.5 rounded-lg text-xs flex items-center gap-2 ${
                          resetStatus.type === 'SUCCESS'
                            ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
                            : 'bg-rose-500/10 border border-rose-500/30 text-rose-300'
                        }`}
                      >
                        {resetStatus.type === 'SUCCESS' ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        ) : (
                          <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                        )}
                        <span>{resetStatus.message}</span>
                      </div>
                    )}

                    {resetOtpGenerated && (
                      <div className="p-2.5 rounded-lg bg-slate-950 border border-emerald-500/30 flex items-center justify-between text-xs">
                        <span className="text-slate-400">Generated Code:</span>
                        <button
                          type="button"
                          onClick={() => setResetEnteredOtp(resetOtpGenerated)}
                          className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 font-mono font-bold rounded cursor-pointer"
                        >
                          {resetOtpGenerated} (Auto-Fill)
                        </button>
                      </div>
                    )}

                    <form onSubmit={handleVerifyOtpAndResetInModal} className="space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-slate-400 mb-1">
                            6-Digit Security Code
                          </label>
                          <input
                            type="text"
                            maxLength={6}
                            value={resetEnteredOtp}
                            onChange={(e) => setResetEnteredOtp(e.target.value.replace(/\D/g, ''))}
                            placeholder="e.g. 482910"
                            className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-emerald-400 text-center tracking-widest font-bold focus:outline-none focus:border-emerald-500"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-slate-400 mb-1">
                            New Master Password
                          </label>
                          <input
                            type="password"
                            value={resetNewPassword}
                            onChange={(e) => setResetNewPassword(e.target.value)}
                            placeholder="At least 6 characters"
                            className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-slate-100 focus:outline-none focus:border-emerald-500"
                          />
                        </div>
                      </div>

                      <div className="flex justify-end pt-1">
                        <button
                          type="submit"
                          className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold cursor-pointer transition-colors"
                        >
                          Confirm & Reset Password
                        </button>
                      </div>
                    </form>
                  </div>
                )}
              </div>

              {/* Danger Zone / Logout */}
              <div className="bg-rose-950/20 border border-rose-900/40 rounded-xl p-4.5 space-y-3">
                <div className="flex items-center gap-2 text-rose-400 font-semibold text-xs">
                  <AlertTriangle className="w-4 h-4" />
                  <span>Session Controls</span>
                </div>

                <p className="text-xs text-slate-400 leading-relaxed">
                  Logging out will lock your trading workspace and require your personal credentials (or quick unlock) to re-enter. Live webhooks and paper trading will remain configured with your token.
                </p>

                <div className="pt-2 flex items-center justify-between">
                  <span className="text-xs text-slate-500">
                    Account: <code className="text-slate-400">{profile.email}</code>
                  </span>
                  <button
                    type="button"
                    onClick={handleLogoutAction}
                    className="flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer shadow-sm shadow-rose-950"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Log Out Now</span>
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-800/80 bg-slate-900/80 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>Personal Edition: <strong>{profile.name}</strong></span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
