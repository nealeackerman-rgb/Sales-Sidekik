
import React, { useState, useEffect } from 'react';
import Layout from './components/Layout';
import Dashboard from './components/views/Dashboard';
import SettingsView from './components/views/SettingsView';
import TerritoryView from './components/views/TerritoryView';
import TerritoryPlanView from './components/views/TerritoryPlanView';
import TasksView from './components/views/TasksView';
import CoachingView from './components/views/CoachingView';
import HelpView from './components/views/HelpView';
import AddAccountModal from './components/modals/AddAccountModal';
import { AddInputModal } from './components/modals/AddInputModal';
import AccountWorkspace from './components/AccountWorkspace';
import AssistantChat from './components/Assistant/AssistantChat';
import { Modal } from './components/common/Modal';
import { Button } from './components/common/Button';
import { Sparkles, Loader2 } from 'lucide-react';
import { Account, SellerInfo, ViewId, Frameworks, NavigationExtras, CanvasMode } from './types';
import { INITIAL_FRAMEWORKS, INITIAL_SELLER_INFO } from './constants';
import { useSync } from './hooks/useSync';
import { useAccountsCollection } from './hooks/useAccountsCollection';
import { LoginView } from './components/views/LoginView';
import { auth, onAuthStateChanged, User } from './services/firebase';

type GlobalView = 'dashboard' | 'territory' | 'territoryPlan' | 'tasks' | 'coaching' | 'settings' | 'help';

const App: React.FC = () => {
  // Auth State
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // App State
  const [globalView, setGlobalView] = useState<GlobalView>('territory');
  const [activeAccountId, setActiveAccountId] = useState<string | null>(null);
  const [navExtras, setNavExtras] = useState<NavigationExtras>({});
  const [isAddAccountModalOpen, setIsAddAccountModalOpen] = useState(false);
  const [isAddInputModalOpen, setIsAddInputModalOpen] = useState(false);
  const [showActivationModal, setShowActivationModal] = useState(false);
  const [prefilledName, setPrefilledName] = useState('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // Recent Accounts History
  const [recentAccountIds, setRecentAccountIds] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem('sales_sidekik_recent_accounts');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });
  
  // Persistence Hooks
  const [sellerInfo, setSellerInfo, isSellerSyncing] = useSync<SellerInfo>('seller_info', INITIAL_SELLER_INFO);
  const [frameworks, setFrameworks, isFrameworkSyncing] = useSync<Frameworks>('frameworks', INITIAL_FRAMEWORKS);
  
  // NEW: Collection-based Accounts Hook
  const { 
    accounts, 
    saveAccount, 
    deleteAccount, 
    bulkSave,
    bulkDelete, 
    isLoading: isAccountsLoading, 
    isSyncing: isAccountsSyncing 
  } = useAccountsCollection();

  const isGlobalSyncing = isSellerSyncing || isFrameworkSyncing || isAccountsSyncing;

  // Initial Auth Check
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Context Loading after Auth
  useEffect(() => {
    if (!user) return;

    if (globalView === 'settings') return;

    const savedActiveAccountId = localStorage.getItem('sales_sidekik_active_account_id');
    if (savedActiveAccountId) setActiveAccountId(savedActiveAccountId);

    const timer = setTimeout(() => {
      if (!sellerInfo.companyName || !sellerInfo.sellerName) {
        setShowActivationModal(true);
      }
    }, 1500);

    return () => clearTimeout(timer);
  }, [user, sellerInfo.companyName, sellerInfo.sellerName, globalView]);

  const toggleMobileMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen);
  const closeMobileMenu = () => setIsMobileMenuOpen(false);

  const handleUpdateSellerInfo = (info: SellerInfo) => {
    setSellerInfo(info);
  };

  const handleUpdateFrameworks = (fws: Frameworks) => {
    setFrameworks(fws);
  };

  const handleAddAccount = (newAccount: Partial<Account>) => {
    const acc = { ...newAccount, isInPortfolio: true } as Account;
    saveAccount(acc); 
    if (acc.id) handleSelectAccount(acc.id);
  };

  const handleUpdateAccount = (updatedAccount: Account) => {
    saveAccount(updatedAccount); 
  };

  const handleBulkUpdateAccounts = (updatedAccounts: Account[]) => {
    bulkSave(updatedAccounts); 
  };

  const handleBulkDeleteAccounts = (accountIds: string[]) => {
    bulkDelete(accountIds);
  };

  const triggerAddAccountModal = (name?: string) => {
    setPrefilledName(name || '');
    setIsAddAccountModalOpen(true);
  };

  const handleSelectAccount = (id: string, extras?: NavigationExtras) => {
    const account = accounts.find(a => a.id === id);
    if (!account?.isInPortfolio) return;

    setActiveAccountId(id);
    if (extras) {
      setNavExtras(extras);
    } else {
      setNavExtras({});
    }
    localStorage.setItem('sales_sidekik_active_account_id', id);
    
    setRecentAccountIds(prev => {
        const filtered = prev.filter(aid => aid !== id);
        const next = [id, ...filtered].slice(0, 5); 
        localStorage.setItem('sales_sidekik_recent_accounts', JSON.stringify(next));
        return next;
    });

    closeMobileMenu();
  };

  const handleClearAccount = () => {
    setActiveAccountId(null);
    setNavExtras({});
    localStorage.removeItem('sales_sidekik_active_account_id');
  };

  const handleNavigateToSettings = () => {
    handleClearAccount();
    setGlobalView('settings');
    setShowActivationModal(false);
    closeMobileMenu();
  };

  const handleFinishSetup = () => {
    setGlobalView('territory');
    setShowActivationModal(false);
    if (accounts.length === 0) {
      triggerAddAccountModal();
    }
  };

  const handleAssistantNavigation = (accountId: string, initialMode: CanvasMode, instruction: string) => {
    handleSelectAccount(accountId, { 
      initialTab: 'canvas', 
      initialCanvasMode: initialMode, 
      initialInstruction: instruction 
    });
  };

  const handleChatNavigation = (accountId: string, tab: string, subTab?: string, instruction?: string) => {
    handleSelectAccount(accountId, {
      initialTab: tab,
      initialSubTab: subTab,
      initialInstruction: instruction 
    });
  };

  const activeAccount = accounts.find(a => a.id === activeAccountId) || null;

  const renderContent = () => {
    if (activeAccount) {
      return (
        <AccountWorkspace 
          key={activeAccount.id}
          account={activeAccount} 
          sellerInfo={sellerInfo}
          frameworks={frameworks}
          onBack={handleClearAccount} 
          onUpdateAccount={handleUpdateAccount}
          initialTab={navExtras.initialTab}
          initialCanvasMode={navExtras.initialCanvasMode}
          initialInstruction={navExtras.initialInstruction}
          initialSubTab={navExtras.initialSubTab} 
          allAccounts={accounts} 
        />
      );
    }

    switch (globalView) {
      case 'dashboard':
        return (
          <Dashboard 
            accounts={accounts.filter(a => a.isInPortfolio)}
            sellerInfo={sellerInfo} 
            onUpdateSellerInfo={handleUpdateSellerInfo}
            onUpdateAccount={handleUpdateAccount}
            onSelectAccount={handleSelectAccount}
          />
        );
      case 'territory':
        return (
          <TerritoryView 
            accounts={accounts} 
            activeAccountId={activeAccountId}
            onAddAccount={() => triggerAddAccountModal()}
            onSelectAccount={handleSelectAccount}
            onUpdateAccount={handleUpdateAccount}
            onBulkUpdateAccounts={handleBulkUpdateAccounts}
            onBulkDeleteAccounts={handleBulkDeleteAccounts} 
            onDeleteAccount={deleteAccount}
            sellerInfo={sellerInfo}
            frameworks={frameworks}
            onUpdateSellerInfo={handleUpdateSellerInfo}
          />
        );
      case 'territoryPlan':
        return (
          <TerritoryPlanView 
            accounts={accounts}
            sellerInfo={sellerInfo}
            frameworks={frameworks}
            onUpdateSellerInfo={handleUpdateSellerInfo}
            onUpdateAccount={handleUpdateAccount}
          />
        );
      case 'tasks':
        return (
          <TasksView 
            accounts={accounts.filter(a => a.isInPortfolio)} 
            onUpdateAccount={handleUpdateAccount}
            onNavigateToAccount={(id, tab, extras) => handleSelectAccount(id, { initialTab: tab, ...extras })}
          />
        );
      case 'coaching':
        return (
          <CoachingView 
             accounts={accounts.filter(a => a.isInPortfolio)}
             sellerInfo={sellerInfo}
             frameworks={frameworks}
             onUpdateAccount={handleUpdateAccount}
             onUpdateSellerInfo={handleUpdateSellerInfo}
          />
        );
      case 'settings':
        return (
          <SettingsView 
            sellerInfo={sellerInfo} 
            onUpdate={handleUpdateSellerInfo}
            frameworks={frameworks}
            onUpdateFrameworks={handleUpdateFrameworks}
            onFinish={handleFinishSetup}
          />
        );
      case 'help':
        return <HelpView />;
      default:
        return null;
    }
  };

  if (authLoading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="animate-spin text-indigo-600" size={32} />
      </div>
    );
  }

  if (!user) {
    return <LoginView />;
  }

  return (
    <>
      <Layout 
        activeView={activeAccount ? 'accountWorkspace' : globalView as ViewId} 
        onViewChange={(v) => {
          setGlobalView(v as GlobalView);
          closeMobileMenu();
        }}
        activeAccount={activeAccount}
        accounts={accounts.filter(a => a.isInPortfolio)}
        recentAccountIds={recentAccountIds}
        onSelectAccount={handleSelectAccount}
        onAddAccount={triggerAddAccountModal}
        onLogInteraction={() => setIsAddInputModalOpen(true)}
        onClearAccount={handleClearAccount}
        isMobileMenuOpen={isMobileMenuOpen}
        toggleMobileMenu={toggleMobileMenu}
        closeMobileMenu={closeMobileMenu}
        isSyncing={isGlobalSyncing}
        sellerInfo={sellerInfo}
      >
        <div className="relative">
          {isAccountsLoading && accounts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <Loader2 className="animate-spin text-indigo-600" size={32} />
              <p className="text-slate-400 font-medium">Synchronizing Portfolio...</p>
            </div>
          ) : renderContent()}
        </div>
      </Layout>

      <AddAccountModal 
        isOpen={isAddAccountModalOpen}
        onClose={() => setIsAddAccountModalOpen(false)}
        onSave={handleAddAccount}
        initialName={prefilledName}
      />

      <AddInputModal 
        isOpen={isAddInputModalOpen}
        onClose={() => setIsAddInputModalOpen(false)}
        accounts={accounts.filter(a => a.isInPortfolio)}
        sellerInfo={sellerInfo}
        onUpdateAccount={handleUpdateAccount}
      />

      <Modal 
        isOpen={showActivationModal} 
        onClose={() => setShowActivationModal(false)}
        title="Activate Your AI Sidekik"
        hideClose={true}
      >
        <div className="flex flex-col items-center text-center space-y-6">
          <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center shadow-inner">
            <Sparkles size={32} />
          </div>
          <div className="space-y-2">
            <p className="text-slate-600 font-medium leading-relaxed">
              To unlock automated strategy, prospecting, and coaching, please calibrate your seller profile with your name and company information.
            </p>
          </div>
          <Button 
            className="w-full py-4 text-base" 
            onClick={handleNavigateToSettings}
          >
            Get Started: Configure Profile
          </Button>
        </div>
      </Modal>

      <AssistantChat 
        activeAccount={activeAccount} 
        frameworks={frameworks}
        sellerInfo={sellerInfo}
        onNavigateToCanvas={handleAssistantNavigation}
        onNavigate={handleChatNavigation}
        onUpdateAccount={handleUpdateAccount}
        allAccounts={accounts} // <--- PASSING ALL ACCOUNTS TO ASSISTANT
      />
    </>
  );
};

export default App;
