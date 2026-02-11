import React, { useState, useRef, useEffect } from 'react';
import { Search, Menu, User, Plus, Building2, Check, Sparkles, MessageSquare, ChevronDown, Clock } from 'lucide-react';
import { ViewId, Account } from '../types';

interface HeaderProps {
  activeView: ViewId;
  activeAccount: Account | null;
  onToggleSidebar: () => void;
  accounts: Account[];
  recentAccountIds: string[];
  onSelectAccount: (accountId: string) => void;
  onAddAccount: (name?: string) => void;
  onLogInteraction: () => void;
  onNavigateToSettings: () => void;
}

const Header: React.FC<HeaderProps> = ({ 
  activeView, 
  activeAccount, 
  onToggleSidebar, 
  accounts, 
  recentAccountIds,
  onSelectAccount, 
  onAddAccount,
  onLogInteraction,
  onNavigateToSettings
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const quickAddRef = useRef<HTMLDivElement>(null);

  const formatTitle = (view: ViewId) => {
    if (view === 'accountWorkspace') return 'Account';
    return view
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, (str) => str.toUpperCase());
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
      if (quickAddRef.current && !quickAddRef.current.contains(event.target as Node)) {
        setIsQuickAddOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredAccounts = searchTerm.trim() 
    ? accounts.filter(acc => acc.name.toLowerCase().includes(searchTerm.toLowerCase()))
    : [];

  // Derive recent accounts objects from IDs
  const recentAccounts = recentAccountIds
    .map(id => accounts.find(a => a.id === id))
    .filter((a): a is Account => !!a);

  const displayAccounts = searchTerm.trim() 
    ? filteredAccounts 
    : (recentAccounts.length > 0 ? recentAccounts : accounts.slice(0, 5));

  const listTitle = searchTerm.trim() 
    ? 'Search Results' 
    : (recentAccounts.length > 0 ? 'Recent Accounts' : 'Suggested Accounts');

  const handleSelect = (id: string) => {
    onSelectAccount(id);
    setSearchTerm('');
    setIsDropdownOpen(false);
  };

  const handleCreateNew = () => {
    onAddAccount(searchTerm);
    setSearchTerm('');
    setIsDropdownOpen(false);
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 md:px-8 shrink-0 z-40">
      <div className="flex items-center gap-3 flex-1">
        <button 
          onClick={onToggleSidebar}
          className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg md:hidden"
        >
          <Menu size={20} />
        </button>
        
        <div className="hidden lg:flex items-center gap-2 mr-4">
          <h2 className="text-lg font-bold text-slate-800 tracking-tight whitespace-nowrap">
            {formatTitle(activeView)}
          </h2>
          {activeAccount && (
            <div className="flex items-center gap-2 animate-in fade-in slide-in-from-left-2 duration-300">
              <span className="text-slate-300 font-light">/</span>
              <span className="text-sm font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg">
                {activeAccount.name}
              </span>
            </div>
          )}
        </div>

        {/* Omni-Search */}
        <div className="relative max-w-xl w-full" ref={dropdownRef}>
          <div className="relative group">
            <Search className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${isDropdownOpen ? 'text-indigo-500' : 'text-slate-400'}`} size={18} />
            <input 
              type="text" 
              placeholder="Search territory or people..." 
              className={`w-full pl-11 pr-4 py-2.5 bg-slate-100 border-transparent transition-all rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:shadow-lg outline-none ${isDropdownOpen ? 'bg-white ring-2 ring-indigo-50' : ''}`}
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setIsDropdownOpen(true);
              }}
              onFocus={() => setIsDropdownOpen(true)}
            />
          </div>

          {isDropdownOpen && (searchTerm.trim() || accounts.length > 0) && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 z-[60]">
              <div className="max-h-[300px] overflow-y-auto">
                <div className="p-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50/50 flex items-center justify-between">
                  <span>{listTitle}</span>
                  {searchTerm.trim() === '' && recentAccounts.length > 0 && <Clock size={12} className="text-slate-400" />}
                </div>
                
                {displayAccounts.map((acc) => (
                  <button
                    key={acc.id}
                    onClick={() => handleSelect(acc.id)}
                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-indigo-50 transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${activeAccount?.id === acc.id ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-400 group-hover:bg-indigo-100 group-hover:text-indigo-600'}`}>
                        <Building2 size={16} />
                      </div>
                      <div className="text-left">
                        <p className={`text-sm font-bold ${activeAccount?.id === acc.id ? 'text-indigo-600' : 'text-slate-700'}`}>{acc.name}</p>
                        <p className="text-[10px] text-slate-400 uppercase font-medium">{acc.relationshipStatus || 'Prospect'}</p>
                      </div>
                    </div>
                    {activeAccount?.id === acc.id && <Check size={16} className="text-indigo-600" />}
                  </button>
                ))}

                {displayAccounts.length === 0 && searchTerm.trim() && (
                   <div className="px-4 py-3 text-sm text-slate-500 italic">No matches found.</div>
                )}

                {searchTerm.trim() && !filteredAccounts.some(a => a.name.toLowerCase() === searchTerm.toLowerCase()) && (
                  <button
                    onClick={handleCreateNew}
                    className="w-full flex items-center gap-3 px-4 py-4 hover:bg-indigo-50 border-t border-slate-50 transition-colors group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center">
                      <Plus size={18} />
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-bold text-indigo-600">Create new account</p>
                      <p className="text-xs text-indigo-400 flex items-center gap-1">
                        <Sparkles size={10} />
                        Add "{searchTerm}"
                      </p>
                    </div>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Quick Add Dropdown */}
        <div className="relative" ref={quickAddRef}>
          <button 
            onClick={() => setIsQuickAddOpen(!isQuickAddOpen)}
            className="hidden sm:flex items-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 shrink-0"
          >
            <Plus size={18} />
            Quick Add
            <ChevronDown size={14} className={`transition-transform ${isQuickAddOpen ? 'rotate-180' : ''}`} />
          </button>
          
          {isQuickAddOpen && (
            <div className="absolute top-full right-0 mt-2 w-56 bg-white border border-slate-200 rounded-2xl shadow-2xl py-2 z-[60] animate-in fade-in slide-in-from-top-2 duration-200">
              <button 
                onClick={() => { onAddAccount(); setIsQuickAddOpen(false); }}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 text-left transition-colors group"
              >
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors">
                  <Building2 size={16} />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-800">New Account</p>
                  <p className="text-[10px] text-slate-400 font-medium uppercase">Expand territory</p>
                </div>
              </button>
              <button 
                onClick={() => { onLogInteraction(); setIsQuickAddOpen(false); }}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 text-left transition-colors group"
              >
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                  <MessageSquare size={16} />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-800">Log Interaction</p>
                  <p className="text-[10px] text-slate-400 font-medium uppercase">Add note or call</p>
                </div>
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 md:gap-4 ml-3">
        <button 
          onClick={onNavigateToSettings}
          className="flex items-center gap-2 p-1 rounded-lg hover:bg-slate-50 transition-colors"
          title="Profile & Settings"
        >
          <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 border border-slate-200">
            <User size={18} />
          </div>
        </button>
      </div>
    </header>
  );
};

export default Header;