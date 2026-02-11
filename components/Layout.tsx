import React from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import { ViewId, Account, SellerInfo } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  activeView: ViewId;
  onViewChange: (view: ViewId) => void;
  activeAccount: Account | null;
  accounts: Account[];
  recentAccountIds: string[];
  onSelectAccount: (accountId: string) => void;
  onAddAccount: (name?: string) => void;
  onLogInteraction: () => void;
  onClearAccount: () => void;
  isMobileMenuOpen: boolean;
  toggleMobileMenu: () => void;
  closeMobileMenu: () => void;
  isSyncing: boolean;
  sellerInfo: SellerInfo;
}

const Layout: React.FC<LayoutProps> = ({ 
  children, 
  activeView, 
  onViewChange, 
  activeAccount,
  accounts,
  recentAccountIds,
  onSelectAccount,
  onAddAccount,
  onLogInteraction,
  onClearAccount,
  isMobileMenuOpen,
  toggleMobileMenu,
  closeMobileMenu,
  isSyncing,
  sellerInfo
}) => {
  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 font-sans overflow-hidden">
      <Sidebar 
        activeView={activeView} 
        onViewChange={(view) => {
          onViewChange(view);
          closeMobileMenu();
        }}
        isOpen={isMobileMenuOpen}
        onClose={closeMobileMenu}
        activeAccount={activeAccount}
        accounts={accounts}
        onSelectAccount={onSelectAccount}
        onAddAccount={() => onAddAccount()}
        onClearAccount={onClearAccount}
        isSyncing={isSyncing}
        sellerInfo={sellerInfo}
      />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header 
          activeView={activeView} 
          activeAccount={activeAccount}
          onToggleSidebar={toggleMobileMenu} 
          accounts={accounts}
          recentAccountIds={recentAccountIds}
          onSelectAccount={onSelectAccount}
          onAddAccount={onAddAccount}
          onLogInteraction={onLogInteraction}
          onNavigateToSettings={() => onViewChange('settings')}
        />
        
        <main className="flex-1 overflow-y-auto bg-slate-50">
          <div className="p-4 md:p-8 max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;