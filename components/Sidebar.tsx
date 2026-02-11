
import React from 'react';
import { 
  LayoutDashboard,
  Map as MapIcon, 
  Settings, 
  ListTodo, 
  TrendingUp,
  ChevronRight,
  Building2,
  Sparkles,
  LifeBuoy,
  Compass,
  Wifi,
  WifiOff,
  RefreshCw,
  LogOut
} from 'lucide-react';
import { ViewId, Account, SellerInfo } from '../types';
import { isMock, signOut } from '../services/firebase';
import { Logo } from './Logo';

interface SidebarProps {
  activeView: ViewId | string;
  onViewChange: (view: any) => void;
  isOpen: boolean;
  onClose: () => void;
  activeAccount: Account | null;
  accounts: Account[];
  onSelectAccount: (accountId: string) => void;
  onAddAccount: () => void;
  onClearAccount: () => void;
  isSyncing: boolean;
  sellerInfo: SellerInfo;
}

const Sidebar: React.FC<SidebarProps> = ({ 
  activeView, 
  onViewChange, 
  isOpen, 
  onClose,
  activeAccount, 
  onClearAccount,
  isSyncing,
  sellerInfo
}) => {
  const globalItems = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
    { id: 'territory', label: 'Territory', icon: <MapIcon size={18} /> },
    { id: 'territoryPlan', label: 'Territory Plan', icon: <Compass size={18} /> },
    { id: 'tasks', label: 'Global Tasks', icon: <ListTodo size={18} /> },
    { id: 'coaching', label: 'Coaching', icon: <TrendingUp size={18} /> },
    { id: 'settings', label: 'Settings', icon: <Settings size={18} /> },
  ];

  const handleGlobalClick = (viewId: string) => {
    onClearAccount();
    onViewChange(viewId);
  };

  const handleSupportClick = () => {
    onClearAccount();
    onViewChange('help');
  };

  const handleLogout = async () => {
    try {
      await signOut();
      // App.tsx listener will handle redirection to LoginView
    } catch (error) {
      console.error("Logout failed", error);
    }
  };

  const getInitials = (name: string) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 md:hidden animate-in fade-in duration-300"
          onClick={onClose}
        />
      )}

      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-200 transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex flex-col h-full">
          {/* Branding Area */}
          <div className="p-6 border-b border-slate-50">
            <div className="mb-6">
              <Logo />
            </div>

            {/* Compact Active Context Display */}
            {activeAccount ? (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                  <Building2 size={16} />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Active</p>
                  <p className="text-sm font-bold text-slate-800 truncate">{activeAccount.name}</p>
                </div>
              </div>
            ) : (
              <div className="bg-indigo-50/50 border border-indigo-100 rounded-xl p-3 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
                  <Sparkles size={16} />
                </div>
                <p className="text-xs font-bold text-indigo-600">Global Mode</p>
              </div>
            )}
          </div>

          {/* Navigation Area */}
          <nav className="flex-1 overflow-y-auto px-4 py-6 space-y-1">
            <h3 className="px-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
              Main Navigation
            </h3>
            {globalItems.map((item) => (
              <button
                key={item.id}
                onClick={() => handleGlobalClick(item.id)}
                className={`w-full flex items-center justify-between px-4 py-2.5 rounded-lg text-sm font-medium transition-all group ${
                  !activeAccount && activeView === item.id 
                    ? 'bg-indigo-50 text-indigo-700 shadow-sm font-bold' 
                    : 'text-slate-600 hover:bg-slate-50 hover:text-indigo-600'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className={`${!activeAccount && activeView === item.id ? 'text-indigo-600' : 'text-slate-400 group-hover:text-indigo-500'}`}>
                    {item.icon}
                  </span>
                  {item.label}
                </div>
                {!activeAccount && activeView === item.id && <ChevronRight size={14} className="opacity-50" />}
              </button>
            ))}
          </nav>

          {/* Bottom Utility Area */}
          <div className="p-4 border-t border-slate-100 bg-slate-50/50 space-y-4">
            <button 
              onClick={handleSupportClick}
              className={`w-full flex items-center gap-3 px-2 py-2 text-sm font-medium transition-colors group ${
                activeView === 'help' ? 'text-indigo-600 font-bold' : 'text-slate-600 hover:text-indigo-600'
              }`}
            >
              <LifeBuoy size={18} className={`${activeView === 'help' ? 'text-indigo-600' : 'text-slate-400 group-hover:text-indigo-500'}`} />
              Help & Support
            </button>

            <div className="flex items-center justify-between px-2 gap-2">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-md shadow-indigo-200 relative shrink-0">
                  {getInitials(sellerInfo.sellerName)}
                  <div className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 border-2 border-white rounded-full ${
                    isSyncing ? 'bg-amber-400' : isMock ? 'bg-amber-400' : 'bg-emerald-400'
                  }`}></div>
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900 truncate max-w-[90px]">
                    {sellerInfo.sellerName || 'Guest User'}
                  </p>
                  <div className="flex items-center gap-1.5">
                    {isSyncing ? (
                      <>
                        <RefreshCw size={10} className="text-amber-500 animate-spin" />
                        <p className="text-[10px] text-amber-600 font-bold">Syncing...</p>
                      </>
                    ) : isMock ? (
                      <>
                        <WifiOff size={10} className="text-amber-500" />
                        <p className="text-[10px] text-amber-600 font-bold">Local Mode</p>
                      </>
                    ) : (
                      <>
                        <Wifi size={10} className="text-emerald-500" />
                        <p className="text-[10px] text-emerald-600 font-bold">Connected</p>
                      </>
                    )}
                  </div>
                </div>
              </div>
              
              <button 
                onClick={handleLogout}
                className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors shrink-0"
                title="Sign Out"
              >
                <LogOut size={18} />
              </button>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
