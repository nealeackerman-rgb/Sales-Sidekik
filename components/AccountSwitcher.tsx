
import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Plus, Check, Building2, Search } from 'lucide-react';
import { Account } from '../types';

interface AccountSwitcherProps {
  accounts: Account[];
  activeAccount: Account | null;
  onSelectAccount: (accountId: string) => void;
  onAddAccount: () => void;
}

const AccountSwitcher: React.FC<AccountSwitcherProps> = ({ 
  accounts, 
  activeAccount, 
  onSelectAccount, 
  onAddAccount 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredAccounts = accounts.filter(acc => 
    acc.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="relative mb-6" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all duration-200 ${
          isOpen 
            ? 'border-indigo-500 bg-white ring-2 ring-indigo-50' 
            : 'border-slate-200 bg-slate-50 hover:border-indigo-300 hover:bg-indigo-50/30'
        }`}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
            activeAccount ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-500'
          }`}>
            <Building2 size={16} />
          </div>
          <div className="text-left min-w-0">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Active Context</p>
            <p className="text-sm font-bold text-slate-800 truncate">
              {activeAccount ? activeAccount.name : 'Select Account'}
            </p>
          </div>
        </div>
        <ChevronDown size={16} className={`text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-xl z-[60] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="p-2 border-b border-slate-100">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
              <input 
                type="text" 
                placeholder="Find account..."
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border-none text-xs rounded-lg focus:ring-1 focus:ring-indigo-500 outline-none"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                autoFocus
              />
            </div>
          </div>

          <div className="max-h-60 overflow-y-auto py-1">
            {filteredAccounts.length > 0 ? (
              filteredAccounts.map((account) => (
                <button
                  key={account.id}
                  onClick={() => {
                    onSelectAccount(account.id);
                    setIsOpen(false);
                  }}
                  className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-slate-50 transition-colors group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-6 h-6 rounded bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-indigo-100 group-hover:text-indigo-600">
                      <Building2 size={12} />
                    </div>
                    <span className={`text-sm truncate ${activeAccount?.id === account.id ? 'font-bold text-indigo-600' : 'text-slate-700'}`}>
                      {account.name}
                    </span>
                  </div>
                  {activeAccount?.id === account.id && <Check size={14} className="text-indigo-600" />}
                </button>
              ))
            ) : (
              <div className="px-3 py-4 text-center text-xs text-slate-400">
                No accounts found.
              </div>
            )}
          </div>

          <div className="p-2 border-t border-slate-100 bg-slate-50">
            <button
              onClick={() => {
                onAddAccount();
                setIsOpen(false);
              }}
              className="w-full flex items-center justify-center gap-2 py-2 text-xs font-bold text-indigo-600 hover:bg-white border border-transparent hover:border-indigo-100 rounded-lg transition-all"
            >
              <Plus size={14} />
              Add New Account
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AccountSwitcher;
