import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Building2, 
  Filter, 
  ArrowUpDown, 
  ArrowUp, 
  ArrowDown, 
  Sparkles, 
  Loader2, 
  Download, 
  Upload, 
  Trash2, 
  SlidersHorizontal, 
  ChevronDown, 
  ChevronRight, 
  AlertTriangle,
  Link
} from 'lucide-react';
import { Account, SellerInfo, Frameworks, FrameworkCategory } from '../../types';
import { geminiService } from '../../services/geminiService';
import { Button } from '../common/Button';
import { Modal } from '../common/Modal';
import { ThinkingIndicator } from '../common/ThinkingIndicator';
import { ScrollableTabs } from '../common/ScrollableTabs';

interface TerritoryViewProps {
  accounts: Account[];
  onAddAccount: () => void;
  onSelectAccount: (accountId: string) => void;
  onUpdateAccount?: (account: Account) => void;
  onBulkUpdateAccounts?: (accounts: Account[]) => void;
  onBulkDeleteAccounts?: (accountIds: string[]) => void;
  onDeleteAccount?: (accountId: string) => void;
  activeAccountId: string | null;
  sellerInfo?: SellerInfo;
  frameworks?: Frameworks;
  onUpdateSellerInfo?: (info: SellerInfo) => void;
}

type SortKey = 'name' | 'relationshipStatus' | 'tier' | 'annualRevenue' | 'currentSpend' | 'currentProducts' | 'dealStatus' | 'estimatedGrowth' | 'growthSignals' | 'rationale' | 'parentCompany';
type SortDirection = 'asc' | 'desc';

interface SortConfig {
  key: SortKey;
  direction: SortDirection;
}

interface FilterState {
  relationship: string[];
  dealStatus: string;
  tier: string[];
  minRevenue: string;
  maxRevenue: string;
  growthDirection: 'All' | 'Positive' | 'Negative';
}

const TerritoryView: React.FC<TerritoryViewProps> = ({ 
  accounts, 
  onAddAccount, 
  onSelectAccount, 
  onUpdateAccount, 
  onBulkUpdateAccounts,
  onBulkDeleteAccounts,
  onDeleteAccount,
  activeAccountId,
  sellerInfo,
  frameworks,
  onUpdateSellerInfo
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'portfolio' | 'staging'>('portfolio'); 
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'tier', direction: 'asc' });
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Advanced Filter State
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    relationship: [],
    dealStatus: 'All',
    tier: [],
    minRevenue: '',
    maxRevenue: '',
    growthDirection: 'All'
  });

  // Strategy Panel State
  const [isGenerating, setIsGenerating] = useState(false);
  const [enrichmentProgress, setEnrichmentProgress] = useState({ current: 0, total: 0 }); 
  const [isImporting, setIsImporting] = useState(false);
  
  // Tuning State
  const [showTuneModal, setShowTuneModal] = useState(false);
  const [customCriteria, setCustomCriteria] = useState('');

  // Delete State
  const [accountToDelete, setAccountToDelete] = useState<Account | null>(null);

  // Group State
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  // Column Width State
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({
    name: 280,
    parentCompany: 180,
    relationshipStatus: 140,
    dealStatus: 120,
    tier: 100,
    annualRevenue: 130,
    currentSpend: 130,
    currentProducts: 180,
    estimatedGrowth: 120,
    growthSignals: 250,
    rationale: 250
  });

  // Helper to parse standardized numbers
  const parseNumber = (value?: string | number): number => {
    if (value === undefined || value === null) return 0;
    const strVal = String(value); 
    const clean = strVal.replace(/[^0-9.-]/g, '');
    const num = parseFloat(clean);
    return isNaN(num) ? 0 : num;
  };

  // Helper to normalize names for strict deduplication and smart parent matching
  const normalizeName = (name: string): string => {
    if (!name) return '';
    let clean = name.toLowerCase();
    clean = clean.replace(/\(.*\)/g, '');
    clean = clean.replace(/[^a-z0-9]/g, ' ');
    const words = clean.split(/\s+/).filter(w => w.length > 0);
    const stopWords = new Set([
        'inc', 'incorporated', 'corp', 'corporation', 'llc', 'ltd', 'limited', 
        'co', 'company', 'group', 'holdings', 'enterprises', 
        'the', 'and', 'lp', 'llp', 'plc', 'nv', 'sa', 'gmbh'
    ]);
    const significant = words.filter(w => !stopWords.has(w));
    if (significant.length === 0) return words.join('');
    return significant.join('');
  };

  const handleSort = (key: SortKey) => {
    setSortConfig(current => ({
      key,
      direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const toggleGroup = (accountId: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(accountId)) {
        next.delete(accountId);
      } else {
        next.add(accountId);
      }
      return next;
    });
  };

  // --- FILTER LOGIC ---
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filters.relationship.length > 0) count++;
    if (filters.dealStatus !== 'All') count++;
    if (filters.tier.length > 0) count++;
    if (filters.minRevenue || filters.maxRevenue) count++;
    if (filters.growthDirection !== 'All') count++;
    return count;
  }, [filters]);

  const filteredAccounts = useMemo(() => {
    let result = accounts.filter(acc => {
      const isInPortfolio = acc.isInPortfolio;
      if (viewMode === 'portfolio' && !isInPortfolio) return false;
      if (viewMode === 'staging' && isInPortfolio) return false;
      if (searchTerm && !acc.name.toLowerCase().includes(searchTerm.toLowerCase())) return false;
      if (filters.relationship.length > 0 && !filters.relationship.includes(acc.relationshipStatus)) return false;
      if (filters.dealStatus === 'Active' && acc.dealStatus !== 'Active') return false;
      if (filters.dealStatus === 'None' && acc.dealStatus === 'Active') return false;
      if (filters.tier.length > 0 && (!acc.tier || !filters.tier.includes(acc.tier))) return false;
      const rev = parseNumber(acc.annualRevenue);
      if (filters.minRevenue && rev < parseNumber(filters.minRevenue)) return false;
      if (filters.maxRevenue && rev > parseNumber(filters.maxRevenue)) return false;
      const growth = parseNumber(acc.estimatedGrowth);
      if (filters.growthDirection === 'Positive' && growth <= 0) return false;
      if (filters.growthDirection === 'Negative' && growth >= 0) return false;
      return true;
    });
    return result;
  }, [accounts, searchTerm, viewMode, filters]);

  // STRATEGY: Define a memoized list of valid parent candidates (Portfolio accounts only)
  const validParentCandidates = useMemo(() => {
    return accounts
      .filter(a => a.isInPortfolio)
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [accounts]);

  // --- GROUPING LOGIC ---
  const flatGroupedList = useMemo(() => {
    const accountMap = new Map<string, Account>(accounts.map(a => [a.id, a]));
    const filteredIdSet = new Set(filteredAccounts.map(a => a.id));
    const roots = new Map<string, Account>();
    const childrenMap: Record<string, Account[]> = {}; 

    filteredAccounts.forEach(acc => {
      if (acc.parentAccountId && accountMap.has(acc.parentAccountId)) {
        const parent = accountMap.get(acc.parentAccountId)!;
        if (!childrenMap[parent.id]) {
          childrenMap[parent.id] = [];
          roots.set(parent.id, parent);
        }
        childrenMap[parent.id].push(acc);
        roots.delete(acc.id); 
      } else {
        if (!roots.has(acc.id)) {
            roots.set(acc.id, acc);
        }
      }
    });

    const rootArray: Account[] = Array.from(roots.values());

    rootArray.sort((a, b) => {
      let valA: any = (a as any)[sortConfig.key];
      let valB: any = (b as any)[sortConfig.key];
      const multiplier = sortConfig.direction === 'asc' ? 1 : -1;
      if (['annualRevenue', 'currentSpend', 'estimatedGrowth'].includes(sortConfig.key)) {
        return (parseNumber(valA) - parseNumber(valB)) * multiplier;
      }
      if (!valA) valA = '';
      if (!valB) valB = '';
      if (valA < valB) return -1 * multiplier;
      if (valA > valB) return 1 * multiplier;
      return 0;
    });

    const flatList: { account: Account, isChild: boolean, hasChildren: boolean, isExpanded: boolean, isVirtual: boolean }[] = [];

    rootArray.forEach(root => {
      const children = childrenMap[root.id] || [];
      const isExpanded = expandedGroups.has(root.id);
      const isVirtual = !filteredIdSet.has(root.id);
      flatList.push({ account: root, isChild: false, hasChildren: children.length > 0, isExpanded, isVirtual });
      if (isExpanded) {
        children.sort((a, b) => {
            let valA: any = (a as any)[sortConfig.key];
            let valB: any = (b as any)[sortConfig.key];
            const multiplier = sortConfig.direction === 'asc' ? 1 : -1;
            if (['annualRevenue', 'currentSpend', 'estimatedGrowth'].includes(sortConfig.key)) {
                return (parseNumber(valA) - parseNumber(valB)) * multiplier;
            }
            if (!valA) valA = '';
            if (!valB) valB = '';
            if (valA < valB) return -1 * multiplier;
            if (valA > valB) return 1 * multiplier;
            return 0;
        });
        children.forEach(child => {
          flatList.push({ account: child, isChild: true, hasChildren: false, isExpanded: false, isVirtual: false });
        });
      }
    });
    return flatList;
  }, [filteredAccounts, accounts, sortConfig, expandedGroups]);

  const handleFieldChange = (account: Account, field: keyof Account, value: any) => {
    if (onUpdateAccount) {
        onUpdateAccount({ ...account, [field]: value });
    }
    if (field === 'parentAccountId' && value) {
        setExpandedGroups(prev => {
            const next = new Set(prev);
            next.add(value);
            return next;
        });
    }
  };

  const handleClearStaging = () => {
    const stagingAccounts = accounts.filter(a => !a.isInPortfolio);
    if (stagingAccounts.length === 0) return;
    if (confirm(`Are you sure you want to clear all ${stagingAccounts.length} accounts from the Staging Area? Accounts in your Portfolio will remain safe.`)) {
       if (onBulkDeleteAccounts) {
           const ids = stagingAccounts.map(a => a.id);
           onBulkDeleteAccounts(ids);
           alert("Staging area cleared.");
       }
    }
  };

  const handleAnalyzeEnrich = async () => {
    if (!sellerInfo || !frameworks || !onBulkUpdateAccounts) {
      alert("System not ready. Missing configuration.");
      return;
    }
    if (filteredAccounts.length === 0) {
      alert("No accounts visible to analyze.");
      return;
    }
    setIsGenerating(true);
    setEnrichmentProgress({ current: 0, total: filteredAccounts.length }); 
    try {
      const framework = frameworks[FrameworkCategory.TERRITORY_PLANNING] || '';
      const updatedAccounts = await geminiService.enrichTerritoryData(filteredAccounts, sellerInfo, framework, accounts, customCriteria, (progress) => setEnrichmentProgress(progress));
      const acctMap = new Map(accounts.map(a => [a.id, a]));
      updatedAccounts.forEach(upd => { acctMap.set(upd.id, upd); });
      onBulkUpdateAccounts(Array.from(acctMap.values()));
      setShowTuneModal(false);
      setTimeout(() => {
          setIsGenerating(false);
          alert(`Analysis Complete! Enriched ${updatedAccounts.length} accounts.`);
      }, 500);
    } catch (error) {
      console.error(error);
      alert("Failed to analyze territory.");
      setIsGenerating(false);
    } finally {
      setEnrichmentProgress({ current: 0, total: 0 });
    }
  };

  const handleExportCSV = () => {
    if (!filteredAccounts.length) return;
    const headers = ["Account Name", "Parent Company", "Relationship", "Tier", "Revenue (M)", "Est. Growth", "Products Used", "Growth Signals", "Rationale"];
    const accountMap = new Map<string, Account>(accounts.map(a => [a.id, a]));
    const csvContent = [
      headers.join(","),
      ...filteredAccounts.map(row => {
        const parentName = row.parentAccountId ? accountMap.get(row.parentAccountId)?.name || '' : '';
        return [`"${row.name}"`, `"${parentName}"`, `"${row.relationshipStatus}"`, `"${row.tier || ''}"`, `"${row.annualRevenue || ''}"`, `"${row.estimatedGrowth || ''}"`, `"${row.currentProducts || ''}"`, `"${row.growthSignals || ''}"`, `"${row.rationale || ''}"`].join(",")
      })
    ].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `territory_data_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const parseCSVLocal = (text: string) => {
    const lines = text.split(/\r?\n/);
    if (lines.length < 2) return [];
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/^"|"$/g, ''));
    let nameIdx = -1, revIdx = -1, statusIdx = -1, parentIdx = -1, prodIdx = -1;
    headers.forEach((h, i) => {
        if (h.includes('status') || h.includes('relationship') || h.includes('stage')) statusIdx = i;
        else if (h.includes('parent')) parentIdx = i;
        else if (h.includes('product') || h.includes('uses') || h.includes('tech')) prodIdx = i;
        else if (h.includes('revenue') || h.includes('rev') || h.includes('arr')) revIdx = i;
        else if (h.includes('name') || h.includes('company') || h.includes('account') || h.includes('organization')) {
            if (nameIdx === -1 || h.includes('name')) nameIdx = i;
        }
    });
    if (nameIdx === -1) nameIdx = 0;
    const data: any[] = [];
    const splitRegex = /,(?=(?:(?:[^"]*"){2})*[^"]*$)/;
    for(let i=1; i<lines.length; i++) {
        if(!lines[i].trim()) continue;
        const values = lines[i].split(splitRegex).map(v => v.trim().replace(/^"|"$/g, '').replace(/""/g, '"'));
        if (values.length <= nameIdx) continue;
        const row: any = {};
        row.name = values[nameIdx];
        if (revIdx !== -1 && values[revIdx]) row.annualRevenue = values[revIdx];
        if (statusIdx !== -1 && values[statusIdx]) row.relationshipStatus = values[statusIdx];
        if (parentIdx !== -1 && values[parentIdx]) row.parentCompanyName = values[parentIdx];
        if (prodIdx !== -1 && values[prodIdx]) row.currentProducts = values[prodIdx];
        if (!row.relationshipStatus) row.relationshipStatus = 'Prospect';
        if (row.name) data.push(row);
    }
    return data;
  };

  const handleImportCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsImporting(true);
    try {
        const text = await file.text();
        const mappedData = parseCSVLocal(text);
        if (mappedData.length === 0) { alert("Could not parse CSV data."); return; }
        const newAccounts: Account[] = mappedData.map((row: any) => ({
            id: crypto.randomUUID(), name: row.name || 'Unknown Company', annualRevenue: row.annualRevenue ? String(row.annualRevenue) : undefined, relationshipStatus: row.relationshipStatus || 'Prospect', dealStatus: 'None', tier: 'Unassigned', isInPortfolio: false, growthSignals: '', rationale: '', tasks: [], communicationLogs: [], parentAccountId: undefined, currentProducts: row.currentProducts, _tempParentName: row.parentCompanyName 
        } as any));
        const existingNormalizedNames = new Set(accounts.map(a => normalizeName(a.name)));
        const uniqueNew = newAccounts.filter(a => !existingNormalizedNames.has(normalizeName(a.name)));
        const allAccountsMap = new Map<string, string>();
        accounts.forEach(a => allAccountsMap.set(normalizeName(a.name), a.id));
        uniqueNew.forEach(a => allAccountsMap.set(normalizeName(a.name), a.id));
        const finalAccounts = uniqueNew.map(acc => {
            const tempParent = (acc as any)._tempParentName;
            let resolvedParentId = undefined;
            if (tempParent) {
                const normalizedParent = normalizeName(tempParent);
                if (allAccountsMap.has(normalizedParent)) resolvedParentId = allAccountsMap.get(normalizedParent);
            }
            const { _tempParentName, ...rest } = acc as any;
            return { ...rest, parentAccountId: resolvedParentId } as Account;
        });
        if (onBulkUpdateAccounts) {
            if (finalAccounts.length > 0) {
              onBulkUpdateAccounts([...accounts, ...finalAccounts]);
              alert(`Imported ${finalAccounts.length} new accounts to Staging.`);
              setViewMode('staging');
              setFilters({ relationship: [], dealStatus: 'All', tier: [], minRevenue: '', maxRevenue: '', growthDirection: 'All' });
            } else { alert("All accounts in CSV already exist."); }
        }
    } catch (error) { console.error(error); alert("Import failed."); } finally {
        setIsImporting(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleAddToPortfolio = (account: Account) => { if (onUpdateAccount) onUpdateAccount({ ...account, isInPortfolio: true }); };
  const confirmDelete = () => { if (!accountToDelete) return; if (onDeleteAccount) onDeleteAccount(accountToDelete.id); setAccountToDelete(null); };
  const handleAccountClick = (account: Account) => { if (account.isInPortfolio) onSelectAccount(account.id); };
  const toggleFilterArray = (field: 'tier' | 'relationship', value: string) => {
    setFilters(prev => {
      const current = prev[field];
      const updated = current.includes(value) ? current.filter(v => v !== value) : [...current, value];
      return { ...prev, [field]: updated };
    });
  };

  const startResizing = (key: string, e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    const startX = e.pageX;
    const startWidth = columnWidths[key];
    const onMouseMove = (moveEvent: MouseEvent) => setColumnWidths(prev => ({ ...prev, [key]: Math.max(50, startWidth + (moveEvent.pageX - startX)) }));
    const onMouseUp = () => { document.removeEventListener('mousemove', onMouseMove); document.removeEventListener('mouseup', onMouseUp); document.body.style.cursor = 'default'; };
    document.addEventListener('mousemove', onMouseMove); document.addEventListener('mouseup', onMouseUp); document.body.style.cursor = 'col-resize';
  };

  const SortIcon = ({ column }: { column: SortKey }) => (
    sortConfig.key !== column ? <ArrowUpDown size={12} className="text-slate-300 opacity-0 group-hover:opacity-100" />
      : sortConfig.direction === 'asc' ? <ArrowUp size={12} className="text-indigo-600" /> : <ArrowDown size={12} className="text-indigo-600" />
  );

  const ColumnHeader = ({ label, column, isStrategic = false }: { label: string, column: SortKey, isStrategic?: boolean }) => (
    <th className={`relative px-3 py-3 border-b border-r border-slate-200 text-left group hover:bg-slate-100 select-none ${isStrategic ? 'bg-indigo-50/50' : 'bg-slate-50'}`} style={{ width: columnWidths[column], minWidth: columnWidths[column] }}>
      <div className="flex items-center gap-2 cursor-pointer h-full" onClick={() => handleSort(column)}>
        {isStrategic && <Sparkles size={10} className="text-indigo-400" />}
        <span className={`text-[11px] font-bold uppercase tracking-wider truncate block ${sortConfig.key === column ? 'text-indigo-700' : isStrategic ? 'text-indigo-900' : 'text-slate-50'}`}>{label}</span>
        <SortIcon column={column} />
      </div>
      <div className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-indigo-400 z-10 opacity-0 group-hover:opacity-100" onMouseDown={(e) => startResizing(column, e)} onClick={(e) => e.stopPropagation()} />
    </th>
  );

  return (
    <div className="space-y-4 h-full flex flex-col pb-20">
      
      {/* Controls Container */}
      <div className="flex flex-col gap-4 shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">Territory Command Center</h2>
            <p className="text-sm text-slate-500 font-medium">{viewMode === 'portfolio' ? 'Managing Active Portfolio' : 'Lead Staging Area'} • {filteredAccounts.length} accounts visible</p>
          </div>
          <div className="bg-slate-100 p-1 rounded-lg flex border border-slate-200">
             <button onClick={() => setViewMode('portfolio')} className={`px-4 py-2 text-xs font-bold rounded-md transition-all ${viewMode === 'portfolio' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>My Portfolio</button>
             <button onClick={() => setViewMode('staging')} className={`px-4 py-2 text-xs font-bold rounded-md transition-all ${viewMode === 'staging' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Lead Staging</button>
          </div>
        </div>

        {/* Row 2: Search, Filters, Actions */}
        <div className="flex flex-col xl:flex-row gap-3 items-start xl:items-center justify-between bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex flex-col sm:flex-row gap-3 w-full xl:w-auto">
            <div className="relative group w-full sm:w-48">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input type="text" placeholder="Search accounts..." className="w-full pl-10 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
            <Button variant="outline" onClick={() => setIsFilterModalOpen(true)} className={`text-xs py-2 px-3 ${activeFiltersCount > 0 ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : ''}`}>
                <Filter size={14} className={activeFiltersCount > 0 ? "fill-indigo-700" : ""} /> Filters {activeFiltersCount > 0 && `(${activeFiltersCount})`}
            </Button>
          </div>

          <div className="flex items-center gap-2 w-full xl:w-auto min-w-0">
             <ScrollableTabs containerClassName="items-center gap-2">
                <div className="flex items-center bg-slate-50 rounded-lg p-0.5 border border-slate-200 shrink-0">
                  <button onClick={handleExportCSV} className="p-2 hover:bg-white hover:shadow-sm rounded-md text-slate-500 hover:text-indigo-600 transition-all" title="Export CSV"><Download size={16} /></button>
                  <div className="w-px h-4 bg-slate-200 mx-1"></div>
                  <button onClick={() => fileInputRef.current?.click()} className="p-2 hover:bg-white hover:shadow-sm rounded-md text-slate-500 hover:text-indigo-600 transition-all" title="Import CSV" disabled={isImporting}>{isImporting ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}</button>
                  <input type="file" ref={fileInputRef} className="hidden" accept=".csv" onChange={handleImportCSV} />
                </div>

                <button onClick={() => setShowTuneModal(true)} className={`shrink-0 flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold border transition-all ${customCriteria ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`} title="Tune AI Logic">
                  <SlidersHorizontal size={14} /> Tune {customCriteria && <div className="w-2 h-2 rounded-full bg-indigo-500"></div>}
                </button>

                {viewMode === 'staging' && (
                    <Button onClick={handleClearStaging} variant="outline" className="shrink-0 whitespace-nowrap py-2 text-xs text-rose-600 border-rose-200 hover:bg-rose-50 hover:border-rose-300" title="Remove all accounts from Staging"><Trash2 size={14} /> Clear Staging</Button>
                )}

                <Button onClick={handleAnalyzeEnrich} disabled={isGenerating} variant="ai" className="shrink-0 whitespace-nowrap py-2 text-xs min-w-[140px]">
                  {isGenerating ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />} {isGenerating ? `Enriching (${enrichmentProgress.current}/${enrichmentProgress.total})...` : 'Analyze & Enrich'}
                </Button>

                <Button onClick={onAddAccount} className="shrink-0 whitespace-nowrap py-2 text-xs"><Plus size={14} /> Add</Button>
             </ScrollableTabs>
          </div>
        </div>
      </div>

      {/* The Super Table */}
      <div className="bg-white rounded-lg border border-slate-300 shadow-sm overflow-hidden flex-1 flex flex-col relative">
        <div className="overflow-auto flex-1 w-full relative">
          <table className="w-full text-left border-collapse table-fixed">
            <thead className="sticky top-0 z-20 shadow-sm">
              <tr>
                <ColumnHeader label="Account Name" column="name" />
                <ColumnHeader label="Parent Company" column="parentCompany" />
                <ColumnHeader label="Relationship" column="relationshipStatus" />
                <ColumnHeader label="Deal Status" column="dealStatus" />
                <ColumnHeader label="Revenue (Millions)" column="annualRevenue" />
                <ColumnHeader label="Current Spend" column="currentSpend" />
                <ColumnHeader label="Products Used" column="currentProducts" />
                <ColumnHeader label="Tier" column="tier" isStrategic />
                <ColumnHeader label="Est. Growth" column="estimatedGrowth" isStrategic />
                <ColumnHeader label="Growth Signals" column="growthSignals" isStrategic />
                <ColumnHeader label="Rationale" column="rationale" isStrategic />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {flatGroupedList.map(({ account, isChild, hasChildren, isExpanded, isVirtual }) => (
                <tr key={account.id} className={`group hover:bg-indigo-50/10 transition-colors ${activeAccountId === account.id ? 'bg-indigo-50/40' : ''} ${isChild ? 'bg-slate-50/50' : 'bg-white'} ${isVirtual ? 'opacity-70 bg-slate-50/30' : ''}`}>
                    <td className={`px-3 py-2 border-r border-slate-200 ${account.isInPortfolio ? 'cursor-pointer hover:bg-indigo-50/30' : ''}`} onClick={() => handleAccountClick(account)}>
                    <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 overflow-hidden w-full">
                            <div className={`shrink-0 transition-all ${isChild ? 'w-6' : 'w-0'}`}></div>
                            <div className="w-5 shrink-0 flex justify-center">
                                {hasChildren ? (
                                    <button onClick={(e) => { e.stopPropagation(); toggleGroup(account.id); }} className="w-4 h-4 flex items-center justify-center border border-slate-300 rounded bg-white hover:bg-indigo-50 hover:border-indigo-300 text-slate-500 hover:text-indigo-600 transition-colors">{isExpanded ? <span className="mb-2 font-bold">-</span> : <span className="mb-0.5 font-bold">+</span>}</button>
                                ) : null}
                            </div>
                            <div className={`w-6 h-6 rounded flex items-center justify-center border text-[10px] shrink-0 ${account.isInPortfolio ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-slate-100 text-slate-400 border-slate-200'}`}><Building2 size={12} /></div>
                            <div className="min-w-0 flex-1">
                                <span className={`font-bold text-sm truncate block ${account.isInPortfolio ? 'text-indigo-700 underline decoration-indigo-200 decoration-1 underline-offset-2' : 'text-slate-800'}`} title={account.name}>{account.name}</span>
                                {isVirtual && <span className="text-[9px] text-slate-400 italic block leading-none mt-0.5">Parent Context</span>}
                            </div>
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            {!account.isInPortfolio && ( <button onClick={(e) => { e.stopPropagation(); handleAddToPortfolio(account); }} className="p-1 rounded hover:bg-emerald-100 text-slate-400 hover:text-emerald-600 transition-colors" title="Add to Portfolio"><Plus size={14} /></button> )}
                            <button onClick={(e) => { e.stopPropagation(); setAccountToDelete(account); }} className="p-1 rounded hover:bg-rose-100 text-slate-400 hover:text-rose-600 transition-colors" title="Delete Account"><Trash2 size={14} /></button>
                        </div>
                    </div>
                    </td>
                    <td className="p-0 border-r border-slate-100">
                        <select 
                          className="w-full h-full px-3 py-2 bg-transparent outline-none text-xs font-medium text-slate-600 cursor-pointer" 
                          value={account.parentAccountId || ''} 
                          onChange={(e) => handleFieldChange(account, 'parentAccountId', e.target.value || undefined)}
                        >
                            <option value="">- Independent -</option>
                            {/* STRATEGY: Only show portfolio accounts as valid parent candidates */}
                            {validParentCandidates.filter(a => a.id !== account.id).map(parent => ( 
                              <option key={parent.id} value={parent.id}>{parent.name}</option> 
                            ))}
                        </select>
                    </td>
                    <td className="p-0 border-r border-slate-100">
                    <select className={`w-full h-full px-3 py-2 bg-transparent outline-none text-xs font-bold cursor-pointer appearance-none truncate ${account.relationshipStatus === 'Customer' ? 'text-emerald-700' : account.relationshipStatus === 'Former Customer' ? 'text-rose-700' : 'text-slate-600'}`} value={account.relationshipStatus} onChange={(e) => handleFieldChange(account, 'relationshipStatus', e.target.value)}>
                        <option value="Prospect">Prospect</option>
                        <option value="Customer">Customer</option>
                        <option value="Former Customer">Former Customer</option>
                    </select>
                    </td>
                    <td className="p-0 border-r border-slate-100">
                    <select className={`w-full h-full px-3 py-2 bg-transparent outline-none text-xs font-bold cursor-pointer appearance-none truncate ${account.dealStatus === 'Active' ? 'text-indigo-700 bg-indigo-50/50' : 'text-slate-400'}`} value={account.dealStatus} onChange={(e) => handleFieldChange(account, 'dealStatus', e.target.value)}>
                        <option value="None">None</option>
                        <option value="Active">Active Deal</option>
                    </select>
                    </td>
                    <td className="p-0 border-r border-slate-100 relative">
                    <input type="text" className="w-full h-full px-3 py-2 bg-transparent outline-none text-xs font-mono text-right text-slate-600 placeholder-slate-300 focus:bg-white focus:ring-2 focus:ring-indigo-500 pr-8" value={account.annualRevenue || ''} onChange={(e) => handleFieldChange(account, 'annualRevenue', e.target.value)} placeholder="-" />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-bold pointer-events-none">M</span>
                    </td>
                    <td className="p-0 border-r border-slate-100">
                    <TextInput value={account.currentSpend} onChange={(val) => handleFieldChange(account, 'currentSpend', val)} placeholder="-" className="text-right font-mono text-slate-600" />
                    </td>
                    <td className="p-0 border-r border-slate-100">
                    <TextInput value={account.currentProducts} onChange={(val) => handleFieldChange(account, 'currentProducts', val)} placeholder="e.g. Modules, Competitors..." className="text-left italic text-slate-600" />
                    </td>
                    <td className="p-0 border-r border-indigo-100 bg-indigo-50/10">
                    <select className={`w-full h-full px-3 py-2 bg-transparent outline-none text-xs font-bold cursor-pointer appearance-none truncate ${(account.tier || '').includes('1') ? 'text-indigo-700' : 'text-slate-500'}`} value={account.tier || 'Unassigned'} onChange={(e) => handleFieldChange(account, 'tier', e.target.value)}>
                        <option value="Unassigned">-</option>
                        <option value="Tier 1">Tier 1</option>
                        <option value="Tier 2">Tier 2</option>
                        <option value="Tier 3">Tier 3</option>
                    </select>
                    </td>
                    <td className="p-0 border-r border-indigo-100 bg-indigo-50/10">
                    <TextInput value={account.estimatedGrowth} onChange={(val) => handleFieldChange(account, 'estimatedGrowth', val)} placeholder="-" className={`text-right font-bold ${(account.estimatedGrowth || '').includes('-') ? 'text-rose-500' : 'text-emerald-600'}`} />
                    </td>
                    <td className="px-3 py-2 border-r border-indigo-100 bg-indigo-50/10 text-xs text-slate-600 align-middle">
                    <div className="line-clamp-2 hover:line-clamp-none cursor-help transition-all" title={account.growthSignals || ''}>{account.growthSignals || '-'}</div>
                    </td>
                    <td className="px-3 py-2 border-r border-indigo-100 bg-indigo-50/10 text-xs text-slate-500 italic align-middle">
                    <div className="line-clamp-2 hover:line-clamp-none cursor-help transition-all" title={account.rationale || ''}>{account.rationale || '-'}</div>
                    </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="bg-slate-50 border-t border-slate-200 p-2 text-[10px] text-slate-400 font-medium text-right shrink-0">Showing {filteredAccounts.length} accounts (plus parents)</div>
      </div>

      <Modal isOpen={isGenerating} onClose={() => {}} title="Territory Analysis in Progress" hideClose={true} maxWidth="max-w-md">
        <div className="p-6 space-y-6">
            <ThinkingIndicator customMessages={["Consulting your account data...", "Analyzing company revenue...", "Checking growth signals...", "Determining strategic tiers...", "Mapping parent/child hierarchy..."]} />
            <div className="space-y-2">
                <div className="flex justify-between text-xs font-bold text-slate-500"><span>Processing...</span><span>{Math.round((enrichmentProgress.current / (enrichmentProgress.total || 1)) * 100)}%</span></div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden"><div className="h-full bg-indigo-600 transition-all duration-500 ease-out" style={{ width: `${(enrichmentProgress.current / (enrichmentProgress.total || 1)) * 100}%` }}></div></div>
                <p className="text-center text-[10px] text-slate-400 font-medium pt-1">Processed {enrichmentProgress.current} of {enrichmentProgress.total} accounts</p>
            </div>
            <div className="flex items-center gap-3 p-3 bg-amber-50 border border-amber-100 rounded-xl"><AlertTriangle className="text-amber-500 shrink-0" size={18} /><p className="text-xs text-amber-800 leading-snug">Please <strong>do not close</strong> this window or navigate away. The AI is actively writing to your database.</p></div>
        </div>
      </Modal>

      <Modal isOpen={isFilterModalOpen} onClose={() => setIsFilterModalOpen(false)} title="Advanced Filters">
        <div className="space-y-6">
            <div className="space-y-2"><label className="text-xs font-bold text-slate-500 uppercase">Relationship Status</label>
                <div className="flex gap-2">{['Prospect', 'Customer', 'Former Customer'].map(status => ( <button key={status} onClick={() => toggleFilterArray('relationship', status)} className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${filters.relationship.includes(status) ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}>{status}</button> ))}</div>
            </div>
            <div className="space-y-2"><label className="text-xs font-bold text-slate-500 uppercase">Account Tier</label>
                <div className="flex gap-2">{['Tier 1', 'Tier 2', 'Tier 3', 'Unassigned'].map(tier => ( <button key={tier} onClick={() => toggleFilterArray('tier', tier)} className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${filters.tier.includes(tier) ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}>{tier}</button> ))}</div>
            </div>
            <div className="pt-4 flex justify-end gap-3 border-t border-slate-100 mt-4"><Button variant="outline" onClick={() => { setFilters({ relationship: [], dealStatus: 'All', tier: [], minRevenue: '', maxRevenue: '', growthDirection: 'All' }); }}>Reset</Button><Button onClick={() => setIsFilterModalOpen(false)}>Done</Button></div>
        </div>
      </Modal>

      <Modal isOpen={showTuneModal} onClose={() => setShowTuneModal(false)} title="Tune Strategy Engine">
        <div className="space-y-4"><div className="p-4 bg-indigo-50 border border-indigo-100 rounded-xl text-xs text-indigo-800 leading-relaxed">Provide custom instructions for the "Analyze & Enrich" process. This will override default logic for Tiering and Prioritization.</div>
            <textarea className="w-full h-32 p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 resize-none" placeholder="e.g. 'Prioritize healthcare companies over retail', 'Focus on companies with >100M revenue', 'Ignore crypto startups'" value={customCriteria} onChange={(e) => setCustomCriteria(e.target.value)} />
            <div className="flex justify-end gap-3 pt-2"><Button variant="outline" onClick={() => setCustomCriteria('')}>Clear</Button><Button onClick={() => setShowTuneModal(false)}>Save & Close</Button></div>
        </div>
      </Modal>

      <Modal isOpen={!!accountToDelete} onClose={() => setAccountToDelete(null)} title="Delete Account">
        <div className="space-y-4"><div className="bg-rose-50 border border-rose-100 rounded-xl p-4 flex gap-3"><AlertTriangle className="text-rose-600 shrink-0" size={24} /><div className="space-y-1"><h4 className="font-bold text-rose-900 text-sm">Permanent Deletion</h4><p className="text-xs text-rose-700 leading-relaxed">Are you sure you want to delete <strong>{accountToDelete?.name}</strong>? This will permanently remove all associated data, including notes, tasks, and deal history.</p></div></div>
            <div className="flex gap-3 pt-2"><Button variant="outline" className="flex-1" onClick={() => setAccountToDelete(null)}>Cancel</Button><Button variant="danger" className="flex-1" onClick={confirmDelete}>Delete Forever</Button></div>
        </div>
      </Modal>
    </div>
  );
};

const TextInput = ({ value, onChange, placeholder, className }: { value?: string, onChange: (val: string) => void, placeholder?: string, className?: string }) => {
  const [localValue, setLocalValue] = useState(value || '');
  useEffect(() => { setLocalValue(value || ''); }, [value]);
  const handleBlur = () => { if (localValue !== value) onChange(localValue); };
  return ( <input type="text" className={`w-full h-full px-3 py-2 bg-transparent outline-none text-xs placeholder-slate-300 focus:bg-white focus:ring-2 focus:ring-indigo-500 transition-all ${className}`} placeholder={placeholder} value={localValue} onChange={(e) => setLocalValue(e.target.value)} onBlur={handleBlur} /> );
};

export default TerritoryView;