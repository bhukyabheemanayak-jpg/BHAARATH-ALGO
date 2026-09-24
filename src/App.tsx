import React, { useState, useEffect } from 'react';
import { Navbar, ActiveTab } from './components/Navbar';
import { StrategyBuilder } from './components/StrategyBuilder';
import { StrategyLibrary } from './components/StrategyLibrary';
import { PortfolioManager } from './components/PortfolioManager';
import { TradingViewAlerts } from './components/TradingViewAlerts';
import { BacktestAnalytics } from './components/BacktestAnalytics';
import { PayoffChart } from './components/PayoffChart';
import { PaperTrading } from './components/PaperTrading';
import { StrategyOptimizer } from './components/StrategyOptimizer';
import { BrokerBridge } from './components/BrokerBridge';
import { LiveDeployment } from './components/LiveDeployment';
import { TemplateModal } from './components/TemplateModal';
import { UserProfileModal } from './components/UserProfileModal';
import { LoginScreen } from './components/LoginScreen';
import { STRATEGY_TEMPLATES } from './data/strategyTemplates';
import { BacktestSummary, Portfolio, Strategy } from './types/trading';
import { runBacktest } from './services/backtestEngine';
import { getSavedStrategies } from './services/strategyStorage';
import { getIsAuthenticated, logoutUser } from './services/userAuthService';

export default function App() {
  const initialSaved = getSavedStrategies();
  const [strategy, setStrategy] = useState<Strategy>(initialSaved[0] || STRATEGY_TEMPLATES[0]);
  const [activePortfolio, setActivePortfolio] = useState<Portfolio | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>('BUILDER');
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState<boolean>(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState<boolean>(false);
  const [profileSubTab, setProfileSubTab] = useState<'DETAILS' | 'TOKEN' | 'SECURITY'>('DETAILS');
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(getIsAuthenticated());
  const [backtestSummary, setBacktestSummary] = useState<BacktestSummary | null>(null);
  const [isBacktesting, setIsBacktesting] = useState<boolean>(false);

  // Sync auth state
  useEffect(() => {
    const handleAuthChange = () => {
      setIsAuthenticated(getIsAuthenticated());
    };
    window.addEventListener('bhaarath_auth_changed', handleAuthChange);
    window.addEventListener('storage', handleAuthChange);
    return () => {
      window.removeEventListener('bhaarath_auth_changed', handleAuthChange);
      window.removeEventListener('storage', handleAuthChange);
    };
  }, []);

  // Execute Backtest
  const handleExecuteBacktest = (targetStrategy: Strategy = strategy) => {
    setIsBacktesting(true);
    setTimeout(() => {
      const summary = runBacktest(targetStrategy);
      setBacktestSummary(summary);
      setIsBacktesting(false);
      setActiveTab('BACKTEST');
    }, 250);
  };

  // Load template
  const handleSelectTemplate = (template: Strategy) => {
    setStrategy(template);
    setBacktestSummary(null);
  };

  // Auto-run initial backtest so users immediately see rich analytics upon landing
  useEffect(() => {
    const summary = runBacktest(strategy);
    setBacktestSummary(summary);
  }, []);

  // If user is logged out, render the Login / Unlock Screen
  if (!isAuthenticated) {
    return <LoginScreen onLoginSuccess={() => setIsAuthenticated(true)} />;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Bar adhering to 3-zone contract */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        underlying={strategy.underlying}
        onRunQuickBacktest={() => handleExecuteBacktest(strategy)}
        isBacktesting={isBacktesting}
        onOpenProfile={(subTab) => {
          if (subTab) setProfileSubTab(subTab);
          setIsProfileModalOpen(true);
        }}
        onLogout={() => {
          logoutUser();
          setIsAuthenticated(false);
        }}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 lg:px-6 pt-5">
        {activeTab === 'BUILDER' && (
          <StrategyBuilder
            strategy={strategy}
            onChangeStrategy={setStrategy}
            onRunBacktest={() => handleExecuteBacktest(strategy)}
            onOpenTemplates={() => setIsTemplateModalOpen(true)}
            onOpenLibrary={() => setActiveTab('LIBRARY')}
            onDeployLive={(strat) => {
              setStrategy(strat);
              setActivePortfolio(null);
              setActiveTab('PAPER');
            }}
            onDeleteStrategy={() => {
              const remaining = getSavedStrategies();
              setStrategy(remaining[0] || STRATEGY_TEMPLATES[0]);
            }}
            isBacktesting={isBacktesting}
          />
        )}

        {activeTab === 'LIBRARY' && (
          <StrategyLibrary
            onLoadStrategy={(selected: Strategy) => {
              setStrategy(selected);
              setActiveTab('BUILDER');
            }}
            onDeployToPaper={(selected: Strategy) => {
              setStrategy(selected);
              setActivePortfolio(null);
              setActiveTab('PAPER');
            }}
            onDeployToBroker={(selected: Strategy) => {
              setStrategy(selected);
              setActivePortfolio(null);
              setActiveTab('BROKER');
            }}
            onRunBacktest={(selected: Strategy) => {
              setStrategy(selected);
              handleExecuteBacktest(selected);
            }}
            onNavigateToBuilder={() => setActiveTab('BUILDER')}
            onNavigateToPortfolios={() => setActiveTab('PORTFOLIOS')}
          />
        )}

        {activeTab === 'PORTFOLIOS' && (
          <PortfolioManager
            onDeployPortfolioToPaper={(port) => {
              setActivePortfolio(port);
              setActiveTab('PAPER');
            }}
            onDeployPortfolioToBroker={(port) => {
              setActivePortfolio(port);
              setActiveTab('LIVE');
            }}
            onOpenStrategyBuilder={(strat) => {
              setStrategy(strat);
              setActiveTab('BUILDER');
            }}
          />
        )}

        {activeTab === 'SIGNALS' && (
          <TradingViewAlerts
            onDeployToPaper={(selected) => {
              setStrategy(selected);
              setActivePortfolio(null);
              setActiveTab('PAPER');
            }}
            onDeployToBroker={(selected) => {
              setStrategy(selected);
              setActivePortfolio(null);
              setActiveTab('LIVE');
            }}
            onOpenProfile={() => {
              setProfileSubTab('TOKEN');
              setIsProfileModalOpen(true);
            }}
          />
        )}

        {activeTab === 'LIVE' && (
          <LiveDeployment
            onNavigateToBrokers={() => setActiveTab('BROKER')}
            onNavigateToBuilder={(strat) => {
              setStrategy(strat);
              setActiveTab('BUILDER');
            }}
          />
        )}

        {activeTab === 'BACKTEST' && (
          <BacktestAnalytics
            summary={backtestSummary}
            onRunBacktest={() => handleExecuteBacktest(strategy)}
            isBacktesting={isBacktesting}
            currentStrategy={strategy}
            onSelectStrategy={(s) => setStrategy(s)}
            onSelectPortfolio={(p) => setActivePortfolio(p)}
          />
        )}

        {activeTab === 'PAYOFF' && <PayoffChart strategy={strategy} />}

        {activeTab === 'PAPER' && (
          <PaperTrading strategy={strategy} initialPortfolio={activePortfolio} />
        )}

        {activeTab === 'OPTIMIZER' && (
          <StrategyOptimizer
            strategy={strategy}
            onApplyOptimized={(optStrat) => {
              setStrategy(optStrat);
              const summary = runBacktest(optStrat);
              setBacktestSummary(summary);
            }}
          />
        )}

        {activeTab === 'TEMPLATES' && (
          <StrategyLibrary
            onLoadStrategy={(selected: Strategy) => {
              setStrategy(selected);
              setActiveTab('BUILDER');
            }}
            onDeployToPaper={(selected: Strategy) => {
              setStrategy(selected);
              setActivePortfolio(null);
              setActiveTab('PAPER');
            }}
            onDeployToBroker={(selected: Strategy) => {
              setStrategy(selected);
              setActivePortfolio(null);
              setActiveTab('LIVE');
            }}
            onRunBacktest={(selected: Strategy) => {
              setStrategy(selected);
              handleExecuteBacktest(selected);
            }}
            onNavigateToBuilder={() => setActiveTab('BUILDER')}
            onNavigateToPortfolios={() => setActiveTab('PORTFOLIOS')}
          />
        )}

        {activeTab === 'BROKER' && <BrokerBridge />}
      </main>

      {/* Strategy Templates Modal */}
      <TemplateModal
        isOpen={isTemplateModalOpen}
        onClose={() => setIsTemplateModalOpen(false)}
        onSelectTemplate={handleSelectTemplate}
        currentStrategyId={strategy.id}
      />

      {/* User Profile & Access Token Modal */}
      <UserProfileModal
        isOpen={isProfileModalOpen}
        initialSubTab={profileSubTab}
        onClose={() => setIsProfileModalOpen(false)}
        onLogout={() => {
          logoutUser();
          setIsAuthenticated(false);
        }}
      />
    </div>
  );
}

