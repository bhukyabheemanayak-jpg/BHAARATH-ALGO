import React, { useState, useEffect, useRef } from 'react';
import {
  TrendingUp,
  Play,
  Layers,
  BarChart3,
  Activity,
  Sliders,
  BookOpen,
  Radio,
  Zap,
  Briefcase,
  FolderKanban,
  Bell,
  Flame,
  Key,
  User,
  LogOut,
  ChevronDown,
  Shield,
} from 'lucide-react';
import { UnderlyingIndex } from '../types/trading';
import { UNDERLYING_CONFIGS } from '../services/optionPricer';
import { getUserProfile, UserProfile } from '../services/userAuthService';

export type ActiveTab =
  | 'BUILDER'
  | 'LIBRARY'
  | 'PORTFOLIOS'
  | 'SIGNALS'
  | 'LIVE'
  | 'BACKTEST'
  | 'PAYOFF'
  | 'PAPER'
  | 'OPTIMIZER'
  | 'TEMPLATES'
  | 'BROKER';

interface NavbarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  underlying: UnderlyingIndex;
  onRunQuickBacktest: () => void;
  isBacktesting: boolean;
  onOpenProfile: (subTab?: 'DETAILS' | 'TOKEN' | 'SECURITY') => void;
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  underlying,
  onRunQuickBacktest,
  isBacktesting,
  onOpenProfile,
  onLogout,
}) => {
  const currentConfig = UNDERLYING_CONFIGS[underlying];
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);
  const [profile, setProfile] = useState<UserProfile>(getUserProfile());
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleUpdate = () => {
      setProfile(getUserProfile());
    };
    window.addEventListener('bhaarath_profile_updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    return () => {
      window.removeEventListener('bhaarath_profile_updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDropdownOpen]);

  const navLinks: { id: ActiveTab; label: string; icon: React.ReactNode }[] = [
    { id: 'BUILDER', label: 'Strategy Builder', icon: <Layers className="w-3.5 h-3.5" /> },
    { id: 'LIBRARY', label: 'Strategy Library', icon: <BookOpen className="w-3.5 h-3.5 text-amber-400" /> },
    { id: 'PORTFOLIOS', label: 'Portfolios', icon: <Briefcase className="w-3.5 h-3.5 text-emerald-400" /> },
    { id: 'SIGNALS', label: 'TradingView Alerts', icon: <Bell className="w-3.5 h-3.5 text-amber-400" /> },
    { id: 'LIVE', label: 'Live Deployment', icon: <Flame className="w-3.5 h-3.5 text-rose-400" /> },
    { id: 'BACKTEST', label: 'Backtest', icon: <BarChart3 className="w-3.5 h-3.5" /> },
    { id: 'PAYOFF', label: 'Payoff', icon: <Activity className="w-3.5 h-3.5" /> },
    { id: 'PAPER', label: 'Paper Trading', icon: <Radio className="w-3.5 h-3.5 text-emerald-400" /> },
    { id: 'OPTIMIZER', label: 'Optimizer', icon: <Sliders className="w-3.5 h-3.5" /> },
    { id: 'BROKER', label: 'Broker Bridge', icon: <Zap className="w-3.5 h-3.5 text-sky-400" /> },
  ];

  const userInitials = profile.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase() || 'BN';

  return (
    <header className="sticky top-0 z-50 bg-slate-950/95 backdrop-blur-md border-b border-slate-800/80 px-4 lg:px-6 py-2.5">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* Zone 1: Single text element wordmark */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold text-base shadow-inner">
            <TrendingUp className="w-4 h-4" />
          </div>
          <button
            onClick={() => setActiveTab('BUILDER')}
            className="text-left group cursor-pointer"
          >
            <span className="text-base font-bold tracking-tight text-white group-hover:text-emerald-400 transition-colors">
              Bhaarath Algo
            </span>
            <span className="hidden sm:inline-block ml-2 text-xs font-mono text-slate-500">
              Personal
            </span>
          </button>
        </div>

        {/* Zone 2: Navigation Links */}
        <nav className="hidden md:flex items-center gap-1 overflow-x-auto py-1 px-1.5 bg-slate-900/80 rounded-lg border border-slate-800">
          {navLinks.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-slate-800 text-emerald-400 shadow-sm font-semibold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Primary Actions */}
        <div className="flex items-center gap-2.5 shrink-0">
          {/* Ticker Indicator */}
          <div className="hidden lg:flex items-center gap-2 px-2.5 py-1 rounded-md bg-slate-900/60 border border-slate-800 text-xs font-mono">
            <span className="text-slate-400">{currentConfig.displayName}</span>
            <span className="text-emerald-400 font-semibold tabular-nums">
              ₹{currentConfig.baseSpotPrice.toLocaleString('en-IN')}
            </span>
          </div>

          {/* Quick Backtest Button */}
          <button
            onClick={onRunQuickBacktest}
            disabled={isBacktesting}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 disabled:opacity-50 rounded-lg transition-colors shadow-sm shadow-emerald-950 whitespace-nowrap cursor-pointer"
          >
            <Play className={`w-3.5 h-3.5 fill-current ${isBacktesting ? 'animate-spin' : ''}`} />
            <span>{isBacktesting ? 'Simulating...' : 'Run Backtest'}</span>
          </button>

          {/* User Profile & Session Menu */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 transition-colors cursor-pointer"
              title="Open Personal Profile & Settings"
            >
              <div className="relative">
                <div className="w-6.5 h-6.5 rounded-full bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center text-white text-[11px] font-bold shadow-xs">
                  {userInitials}
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-slate-950" />
              </div>
              <span className="hidden md:inline-block text-xs font-medium text-slate-200 max-w-[100px] truncate">
                {profile.name.split(' ')[0]}
              </span>
              <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown Menu */}
            {isDropdownOpen && (
              <div className="absolute right-0 mt-2 w-64 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                {/* User Info Header */}
                <div className="px-4 py-2.5 border-b border-slate-800/80">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold text-xs">
                      {userInitials}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-white truncate">{profile.name}</p>
                      <p className="text-[11px] text-slate-400 font-mono truncate">{profile.email}</p>
                    </div>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                    <span>Personal Owner</span>
                    <span className="font-mono">Active</span>
                  </div>
                </div>

                {/* Menu Action Items */}
                <div className="py-1 text-xs">
                  <button
                    onClick={() => {
                      setIsDropdownOpen(false);
                      onOpenProfile('DETAILS');
                    }}
                    className="w-full flex items-center gap-2.5 px-4 py-2 text-slate-300 hover:text-white hover:bg-slate-800/80 transition-colors text-left cursor-pointer"
                  >
                    <User className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Personal Profile & Details</span>
                  </button>

                  <button
                    onClick={() => {
                      setIsDropdownOpen(false);
                      onOpenProfile('TOKEN');
                    }}
                    className="w-full flex items-center gap-2.5 px-4 py-2 text-slate-300 hover:text-white hover:bg-slate-800/80 transition-colors text-left cursor-pointer"
                  >
                    <Key className="w-3.5 h-3.5 text-amber-400" />
                    <span>Platform Access Token & Webhook</span>
                  </button>

                  <button
                    onClick={() => {
                      setIsDropdownOpen(false);
                      onOpenProfile('SECURITY');
                    }}
                    className="w-full flex items-center gap-2.5 px-4 py-2 text-slate-300 hover:text-white hover:bg-slate-800/80 transition-colors text-left cursor-pointer"
                  >
                    <Shield className="w-3.5 h-3.5 text-sky-400" />
                    <span>Security & 2FA</span>
                  </button>
                </div>

                {/* Logout Row */}
                <div className="pt-1 mt-1 border-t border-slate-800/80">
                  <button
                    onClick={() => {
                      setIsDropdownOpen(false);
                      onLogout();
                    }}
                    className="w-full flex items-center gap-2.5 px-4 py-2 text-rose-400 hover:text-rose-300 hover:bg-rose-950/30 transition-colors text-left cursor-pointer text-xs font-medium"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Log Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile nav bar row */}
      <div className="md:hidden flex items-center justify-between gap-1 overflow-x-auto pt-2 pb-1 border-t border-slate-900 mt-2">
        <div className="flex items-center gap-1">
          {navLinks.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded whitespace-nowrap ${
                  isActive
                    ? 'bg-slate-800 text-emerald-400'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        <button
          onClick={() => onOpenProfile('DETAILS')}
          className="flex items-center gap-1 px-2 py-1 bg-slate-900 border border-slate-800 rounded text-xs text-slate-200 shrink-0"
        >
          <User className="w-3 h-3 text-emerald-400" />
          <span>Profile</span>
        </button>
      </div>
    </header>
  );
};

