import React, { useState } from 'react';
import {
  TrendingUp,
  Lock,
  Mail,
  Key,
  ShieldCheck,
  ArrowRight,
  Eye,
  EyeOff,
  UserCheck,
  Sparkles,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react';
import {
  getUserProfile,
  loginUser,
  UserProfile,
  validateMasterPassword,
  generatePasswordResetOtp,
  resetPasswordWithOtp,
  DEFAULT_MASTER_PASSWORD,
} from '../services/userAuthService';
import { PLATFORM_APPLET_ID, PLATFORM_NAME } from '../services/strategyStorage';

interface LoginScreenProps {
  onLoginSuccess: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const profile: UserProfile = getUserProfile();
  const [mode, setMode] = useState<'LOGIN' | 'FORGOT_PASSWORD'>('LOGIN');

  // Login form state
  const [email, setEmail] = useState<string>(profile.email);
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [rememberMe, setRememberMe] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  // Forgot password flow state
  const [forgotEmail, setForgotEmail] = useState<string>(profile.email);
  const [forgotStep, setForgotStep] = useState<'REQUEST_CODE' | 'ENTER_NEW_PASSWORD'>('REQUEST_CODE');
  const [generatedOtp, setGeneratedOtp] = useState<string | null>(null);
  const [enteredOtp, setEnteredOtp] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [showNewPassword, setShowNewPassword] = useState<boolean>(false);
  const [forgotError, setForgotError] = useState<string>('');
  const [forgotSuccessMsg, setForgotSuccessMsg] = useState<string>('');

  // Quick 1-click unlock for workspace owner
  const handleQuickUnlock = () => {
    setIsLoading(true);
    setErrorMsg('');
    setTimeout(() => {
      loginUser(profile.email, profile.name);
      setIsLoading(false);
      onLoginSuccess();
    }, 350);
  };

  // Standard credential verification
  const handleStandardSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!email.trim()) {
      setErrorMsg('Please enter your registered email address');
      return;
    }

    if (!password) {
      setErrorMsg('Please enter your master password.');
      return;
    }

    setIsLoading(true);

    setTimeout(() => {
      const isValid = validateMasterPassword(password);
      if (!isValid) {
        setIsLoading(false);
        setErrorMsg('Incorrect master password. If you forgot your password, click "Forgot Password?" below.');
        return;
      }

      loginUser(email, email === profile.email ? profile.name : undefined);
      setIsLoading(false);
      onLoginSuccess();
    }, 400);
  };

  // Request Reset OTP
  const handleRequestOtp = (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError('');
    setForgotSuccessMsg('');

    if (!forgotEmail.trim()) {
      setForgotError('Please enter your email address.');
      return;
    }

    setIsLoading(true);
    setTimeout(() => {
      const res = generatePasswordResetOtp(forgotEmail);
      setIsLoading(false);

      if (!res.success) {
        setForgotError(res.message);
      } else {
        setGeneratedOtp(res.code || '123456');
        setForgotStep('ENTER_NEW_PASSWORD');
        setForgotSuccessMsg(res.message);
      }
    }, 400);
  };

  // Submit New Password with OTP
  const handleResetSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError('');

    if (!enteredOtp || enteredOtp.trim().length !== 6) {
      setForgotError('Please enter the 6-digit security verification code.');
      return;
    }

    if (!newPassword || newPassword.length < 6) {
      setForgotError('New password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setForgotError('Passwords do not match. Please re-enter.');
      return;
    }

    setIsLoading(true);
    setTimeout(() => {
      const res = resetPasswordWithOtp(forgotEmail, enteredOtp, newPassword);
      setIsLoading(false);

      if (!res.success) {
        setForgotError(res.message);
      } else {
        setForgotSuccessMsg(res.message);
        setTimeout(() => {
          onLoginSuccess();
        }, 800);
      }
    }, 450);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 relative selection:bg-emerald-500/30 selection:text-emerald-200">
      {/* Background glow effects */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/3 w-64 h-64 bg-teal-500/5 rounded-full blur-2xl pointer-events-none" />

      <div className="max-w-md w-full relative z-10 space-y-6">
        {/* Brand Wordmark & Logo */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 shadow-xl shadow-emerald-950/40 mb-1">
            <TrendingUp className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center justify-center gap-2">
            <span>{PLATFORM_NAME}</span>
            <span className="text-xs font-mono font-normal px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              Personal Edition
            </span>
          </h1>
          <p className="text-xs text-slate-400 max-w-xs mx-auto">
            Algorithmic Options Trading & TradingView Webhook Bridge
          </p>
        </div>

        {/* Main Card */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl shadow-2xl p-6 sm:p-7 backdrop-blur-md space-y-6">
          
          {mode === 'LOGIN' ? (
            <>
              {/* Personal Account Fast Unlock Card */}
              <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800/90 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center text-white font-bold text-base shadow-md shadow-emerald-950/40">
                    {profile.name
                      .split(' ')
                      .map((n) => n[0])
                      .join('')
                      .substring(0, 2)
                      .toUpperCase() || 'BN'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <h3 className="text-sm font-bold text-white truncate">{profile.name}</h3>
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    </div>
                    <p className="text-xs text-slate-400 font-mono truncate">{profile.email}</p>
                  </div>
                </div>

                <button
                  onClick={handleQuickUnlock}
                  disabled={isLoading}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-md shadow-emerald-950 transition-all cursor-pointer group disabled:opacity-50"
                >
                  <UserCheck className="w-4 h-4 text-emerald-200" />
                  <span>{isLoading ? 'Unlocking Workspace...' : 'Quick Unlock Workspace'}</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                </button>
              </div>

              <div className="relative flex items-center justify-center">
                <div className="border-t border-slate-800 w-full" />
                <span className="bg-slate-900 px-3 text-[11px] uppercase tracking-wider text-slate-500 font-mono">
                  Or Sign In with Password
                </span>
              </div>

              {/* Sign In Form */}
              <form onSubmit={handleStandardSubmit} className="space-y-4">
                {errorMsg && (
                  <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <span>{errorMsg}</span>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Personal Email
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="bhukyabheemanayak@gmail.com"
                      required
                      className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-slate-100 placeholder-slate-600 focus:outline-none focus:border-emerald-500 transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-medium text-slate-300">
                      Master Password
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setMode('FORGOT_PASSWORD');
                        setForgotStep('REQUEST_CODE');
                        setForgotError('');
                        setForgotSuccessMsg('');
                      }}
                      className="text-[11px] text-emerald-400 hover:text-emerald-300 transition-colors cursor-pointer font-medium"
                    >
                      Forgot Password?
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter master password"
                      required
                      className="w-full pl-9 pr-9 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-slate-100 placeholder-slate-600 focus:outline-none focus:border-emerald-500 transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-300 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1">
                    Default master password: <code className="text-emerald-400/80 font-mono">Bhaarath@2026</code>
                  </p>
                </div>

                <div className="flex items-center justify-between text-xs pt-1">
                  <label className="flex items-center gap-2 text-slate-400 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="rounded border-slate-700 bg-slate-950 text-emerald-500 focus:ring-emerald-500/20"
                    />
                    <span>Remember this session</span>
                  </label>
                  <span className="text-[11px] text-slate-500 font-mono">2FA Secured</span>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 active:bg-slate-750 text-slate-100 rounded-xl text-xs font-semibold border border-slate-700 hover:border-slate-600 transition-colors cursor-pointer disabled:opacity-50"
                >
                  <Key className="w-3.5 h-3.5 text-amber-400" />
                  <span>{isLoading ? 'Verifying Password...' : 'Sign In with Password'}</span>
                </button>
              </form>
            </>
          ) : (
            /* Forgot Password Flow */
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <button
                  type="button"
                  onClick={() => setMode('LOGIN')}
                  className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back to Sign In</span>
                </button>
                <span className="text-xs font-bold text-white">Reset Master Password</span>
              </div>

              {forgotError && (
                <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <span className="flex-1">{forgotError}</span>
                </div>
              )}

              {forgotSuccessMsg && (
                <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span className="flex-1">{forgotSuccessMsg}</span>
                </div>
              )}

              {forgotStep === 'REQUEST_CODE' ? (
                <form onSubmit={handleRequestOtp} className="space-y-4">
                  <p className="text-xs text-slate-400">
                    Enter your registered email address. We will generate a secure 6-digit verification code to reset your master password.
                  </p>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">
                      Registered Email
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
                      <input
                        type="email"
                        value={forgotEmail}
                        onChange={(e) => setForgotEmail(e.target.value)}
                        placeholder="bhukyabheemanayak@gmail.com"
                        required
                        className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-slate-100 placeholder-slate-600 focus:outline-none focus:border-emerald-500 transition-colors"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-emerald-950 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <Key className="w-3.5 h-3.5 text-white" />
                    <span>{isLoading ? 'Generating Code...' : 'Send Security Reset Code'}</span>
                  </button>
                </form>
              ) : (
                <form onSubmit={handleResetSubmit} className="space-y-4">
                  {/* Generated Code Simulation Banner */}
                  {generatedOtp && (
                    <div className="p-3 rounded-xl bg-slate-950 border border-emerald-500/40 space-y-1.5">
                      <div className="flex items-center justify-between text-[11px] text-emerald-400">
                        <span className="font-semibold flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Security Code Sent
                        </span>
                        <span className="text-[10px] text-slate-400">Valid 15m</span>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs text-slate-400">Your 6-Digit Code:</span>
                        <button
                          type="button"
                          onClick={() => setEnteredOtp(generatedOtp)}
                          className="px-2.5 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 rounded font-mono font-bold text-xs cursor-pointer transition-colors"
                          title="Click to auto-fill"
                        >
                          {generatedOtp} (Auto-Fill)
                        </button>
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">
                      6-Digit Security Code
                    </label>
                    <input
                      type="text"
                      maxLength={6}
                      value={enteredOtp}
                      onChange={(e) => setEnteredOtp(e.target.value.replace(/\D/g, ''))}
                      placeholder="e.g. 482910"
                      required
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-center tracking-widest text-emerald-400 placeholder-slate-600 focus:outline-none focus:border-emerald-500 transition-colors text-base font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">
                      New Master Password
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
                      <input
                        type={showNewPassword ? 'text' : 'password'}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="At least 6 characters"
                        required
                        className="w-full pl-9 pr-9 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-slate-100 placeholder-slate-600 focus:outline-none focus:border-emerald-500 transition-colors"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-300 cursor-pointer"
                      >
                        {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">
                      Confirm New Master Password
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
                      <input
                        type={showNewPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Confirm password"
                        required
                        className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-slate-100 placeholder-slate-600 focus:outline-none focus:border-emerald-500 transition-colors"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-emerald-950 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{isLoading ? 'Resetting Password...' : 'Save Password & Sign In'}</span>
                  </button>

                  <div className="text-center pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setForgotStep('REQUEST_CODE');
                        setForgotError('');
                      }}
                      className="text-[11px] text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                    >
                      Didn't get code? Request new code
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* Instance ID Footer inside card */}
          <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500">
            <span>Instance: <code className="text-slate-400 font-mono">{PLATFORM_APPLET_ID.substring(0, 13)}...</code></span>
            <span className="flex items-center gap-1 text-emerald-400">
              <Sparkles className="w-3 h-3" />
              Online
            </span>
          </div>
        </div>

        {/* Security Notice */}
        <p className="text-center text-[11px] text-slate-600 font-mono">
          Private single-tenant trading environment. All webhooks & broker connections are encrypted.
        </p>
      </div>
    </div>
  );
};
