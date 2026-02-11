
import React, { useState, useEffect } from 'react';
import { 
  ChevronLeft, 
  Target, 
  Briefcase, 
  CalendarCheck2, 
  Radio, 
  Users, 
  Zap,
  Send,
  Sparkles,
  LayoutDashboard,
  PenTool,
  Compass
} from 'lucide-react';
import { Account, SellerInfo, Frameworks, CanvasMode } from '../types';
import AccountPlanTab from './tabs/AccountPlanTab';
import DealInputsTab from './tabs/DealInputsTab';
import MeetingPrepTab from './tabs/MeetingPrepTab';
import ProspectingTab from './tabs/ProspectingTab';
import SignalsTab from './tabs/SignalsTab';
import OrgChartTab from './tabs/OrgChartTab';
import DealManagerTab from './tabs/DealManagerTab';
import DealDashboardTab from './tabs/DealDashboardTab';
import CanvasTab from './tabs/CanvasTab';
import SmartProspectingTab from './tabs/SmartProspectingTab';
import { Modal } from './common/Modal';
import { Button } from './common/Button';
import { ScrollableTabs } from './common/ScrollableTabs';
import { geminiService } from '../services/geminiService';
import { FormattedOutput } from './common/FormattedOutput';

interface AccountWorkspaceProps {
  account: Account;
  sellerInfo: SellerInfo;
  frameworks: Frameworks;
  onBack: () => void;
  onUpdateAccount: (updatedAccount: Account) => void;
  initialTab?: string;
  initialCanvasMode?: CanvasMode;
  initialInstruction?: string;
  initialSubTab?: string; 
  allAccounts?: Account[]; // <--- NEW PROP
}

type AccountTab = 'dashboard' | 'strategy' | 'canvas' | 'plan' | 'inputs' | 'meeting' | 'prospecting' | 'signals' | 'org' | 'deal';

const AccountWorkspace: React.FC<AccountWorkspaceProps> = ({ 
  account, 
  sellerInfo, 
  frameworks, 
  onBack, 
  onUpdateAccount,
  initialTab,
  initialCanvasMode,
  initialInstruction,
  initialSubTab,
  allAccounts = []
}) => {
  const [activeTab, setActiveTab] = useState<AccountTab>((initialTab as AccountTab) || 'dashboard');
  const [showSignalModal, setShowSignalModal] = useState(false);
  const [latestUpdates, setLatestUpdates] = useState('');
  const [isWatchdogScanning, setIsWatchdogScanning] = useState(false);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab as AccountTab);
    }
  }, [initialTab]);

  useEffect(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const canScan = sellerInfo.companyName && sellerInfo.products;
    
    if (canScan && account.lastSignalCheck !== todayStr) {
      const runWatchdog = async () => {
        setIsWatchdogScanning(true);
        try {
          const parentName = allAccounts.find(a => a.id === account.parentAccountId)?.name;
          const result = await geminiService.checkForNewSignals(account, sellerInfo, parentName);
          if (result.text && result.text.trim() !== 'NO_NEW_SIGNALS') {
            const timestamp = new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
            const entry = `**📅 Update: ${timestamp}**\n${result.text}\n\n---\n\n${account.signals || ''}`;
            onUpdateAccount({ ...account, signals: entry, lastSignalCheck: todayStr });
            setLatestUpdates(result.text);
            setShowSignalModal(true);
          } else {
            onUpdateAccount({ ...account, lastSignalCheck: todayStr });
          }
        } catch (error) {
          console.warn("[Watchdog] Intelligence check failed:", error);
        } finally {
          setIsWatchdogScanning(false);
        }
      };
      runWatchdog();
    }
  }, [account.id]);

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={16} /> },
    { id: 'inputs', label: 'Inputs', icon: <Zap size={16} /> },
    { id: 'plan', label: 'Account Plan', icon: <Target size={16} /> },
    { id: 'deal', label: 'Deal Manager', icon: <Briefcase size={16} /> },
    { id: 'signals', label: 'Signals', icon: <Radio size={16} /> },
    { id: 'meeting', label: 'Meeting Prep', icon: <CalendarCheck2 size={16} /> },
    { id: 'strategy', label: 'Prospecting Strategy', icon: <Compass size={16} /> },
    { id: 'prospecting', label: 'Prospecting', icon: <Send size={16} /> },
    { id: 'org', label: 'Org Chart', icon: <Users size={16} /> },
    { id: 'canvas', label: 'Content Creator', icon: <PenTool size={16} /> },
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DealDashboardTab account={account} frameworks={frameworks} sellerInfo={sellerInfo} onUpdateAccount={onUpdateAccount} />;
      case 'inputs':
        return <DealInputsTab account={account} sellerInfo={sellerInfo} onUpdateAccount={onUpdateAccount} />;
      case 'plan':
        return <AccountPlanTab 
          account={account} 
          sellerInfo={sellerInfo} 
          frameworks={frameworks} 
          onUpdateAccount={onUpdateAccount}
          allAccounts={allAccounts}
        />;
      case 'deal':
        return <DealManagerTab 
          account={account} 
          sellerInfo={sellerInfo} 
          frameworks={frameworks} 
          onUpdateAccount={onUpdateAccount} 
          allAccounts={allAccounts}
        />;
      case 'signals':
        return <SignalsTab 
          account={account} 
          sellerInfo={sellerInfo} 
          onUpdateAccount={onUpdateAccount}
          allAccounts={allAccounts}
        />;
      case 'meeting':
        return <MeetingPrepTab 
          account={account} 
          sellerInfo={sellerInfo} 
          frameworks={frameworks} 
          onUpdateAccount={onUpdateAccount} 
          allAccounts={allAccounts} 
          initialInstruction={initialInstruction} 
        />;
      case 'strategy':
        return <SmartProspectingTab 
          account={account} 
          sellerInfo={sellerInfo} 
          onUpdateAccount={onUpdateAccount} 
          initialSubTab={initialSubTab}
          allAccounts={allAccounts}
        />;
      case 'prospecting':
        return <ProspectingTab 
          account={account} 
          sellerInfo={sellerInfo} 
          frameworks={frameworks} 
          onUpdateAccount={onUpdateAccount} 
          allAccounts={allAccounts}
        />;
      case 'org':
        return <OrgChartTab account={account} sellerInfo={sellerInfo} onUpdateAccount={onUpdateAccount} />;
      case 'canvas':
        return <CanvasTab 
          account={account} 
          sellerInfo={sellerInfo} 
          frameworks={frameworks}
          onUpdateAccount={onUpdateAccount} 
          allAccounts={allAccounts}
          initialMode={initialCanvasMode}
          initialInstruction={initialInstruction}
        />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4">
        <button onClick={onBack} className="flex items-center gap-2 text-sm font-bold text-slate-400 hover:text-indigo-600 transition-colors w-fit">
          <ChevronLeft size={16} /> Back to Territory
        </button>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h2 className="text-3xl font-black text-slate-900 tracking-tight">{account.name}</h2>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${account.relationshipStatus === 'Customer' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>
                {account.relationshipStatus}
              </span>
              {account.dealStatus === 'Active' && (
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-100 text-indigo-700">
                  <Zap size={10} className="fill-indigo-700" /> Active Deal
                </span>
              )}
              {isWatchdogScanning && (
                <div className="flex items-center gap-2 px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded-full text-[10px] font-bold animate-pulse border border-indigo-100">
                  <Sparkles size={10} /> Checking Intelligence...
                </div>
              )}
            </div>
            <p className="text-slate-500 text-sm font-medium">Strategic Account • {account.annualRevenue || 'Enterprise'}</p>
          </div>
        </div>
      </div>
      <div className="border-b border-slate-200 pb-1">
        <ScrollableTabs>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as AccountTab)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                activeTab === tab.id 
                  ? 'bg-indigo-50 text-indigo-700 shadow-sm ring-1 ring-indigo-200' 
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </ScrollableTabs>
      </div>
      <div className="min-h-[400px]">{renderTabContent()}</div>
      <Modal isOpen={showSignalModal} onClose={() => setShowSignalModal(false)} title="🔔 New Intelligence Detected">
        <div className="space-y-6">
          <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100 flex gap-4">
            <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center shrink-0"><Sparkles size={20} /></div>
            <div>
              <p className="text-sm text-indigo-900 font-bold mb-1">Sidekik Watchdog Alert</p>
              <p className="text-xs text-indigo-700 leading-relaxed">Found significant new market triggers for <strong>{account.name}</strong>.</p>
            </div>
          </div>
          <div className="max-h-[300px] overflow-y-auto p-4 bg-slate-50 rounded-2xl border border-slate-100">
            <FormattedOutput content={latestUpdates} className="text-sm" />
          </div>
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={() => { setShowSignalModal(false); setActiveTab('signals'); }}>View All History</Button>
            <Button className="flex-1" onClick={() => setShowSignalModal(false)}>Acknowledge</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default AccountWorkspace;
