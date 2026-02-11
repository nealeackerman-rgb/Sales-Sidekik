
import React, { useState, useEffect } from 'react';
import { 
  Radio, 
  Sparkles, 
  Loader2, 
  Search, 
  ExternalLink, 
  Zap, 
  ShieldAlert, 
  TrendingUp, 
  UserPlus,
  RefreshCw,
  Info,
  Wand2,
  Edit3,
  CheckCircle,
  Save,
  Eye
} from 'lucide-react';
import { Account, SellerInfo } from '../../types';
import { geminiService } from '../../services/geminiService';
import { Button } from '../common/Button';
import { FormattedOutput } from '../common/FormattedOutput';
import { RefineWithAIModal } from '../modals/RefineWithAIModal';

interface SignalsTabProps {
  account: Account;
  sellerInfo: SellerInfo;
  onUpdateAccount: (updatedAccount: Account) => void;
  allAccounts?: Account[];
}

const SignalsTab: React.FC<SignalsTabProps> = ({ 
  account, 
  sellerInfo, 
  onUpdateAccount,
  allAccounts = []
}) => {
  const [isScanning, setIsScanning] = useState(false);
  const [sources, setSources] = useState<{ title: string; uri: string }[]>([]);
  
  // Edit State
  const [localSignals, setLocalSignals] = useState(account.signals || '');
  const [isEditing, setIsEditing] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [isRefineModalOpen, setIsRefineModalOpen] = useState(false);

  useEffect(() => {
    setLocalSignals(account.signals || '');
  }, [account.signals]);

  const handleScan = async (customPrompt?: string) => {
    setIsScanning(true);
    setSources([]);
    
    try {
      const parentName = allAccounts.find(a => a.id === account.parentAccountId)?.name;
      const result = await geminiService.generateSignals(account, sellerInfo, customPrompt, account.signals || '', parentName);
      
      if (result.text.includes("NO_NEW_SIGNALS")) {
        alert("Scan complete: No new relevant signals found since last update.");
        setIsScanning(false);
        return;
      }

      const timestamp = new Date().toLocaleDateString(undefined, { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric' 
      });

      // Append new signals to the top
      const entry = `**📅 Scan: ${timestamp}${customPrompt ? ` (Query: ${customPrompt})` : ''}**\n${result.text}\n\n---\n\n${localSignals || ''}`;
      
      const newSignalsContent = entry.trim();
      setLocalSignals(newSignalsContent);

      const updatePayload: Partial<Account> = {
        signals: newSignalsContent,
        lastSignalCheck: new Date().toISOString().split('T')[0]
      };

      // Merge contacts found in signals
      if (result.detectedContacts && result.detectedContacts.length > 0) {
        const existingProspects = account.prospects || [];
        const existingNames = new Set(existingProspects.map(p => p.name.toLowerCase()));
        
        const newProspects = result.detectedContacts
          .filter((c: any) => !existingNames.has(c.name.toLowerCase()))
          .map((c: any) => ({
            id: crypto.randomUUID(),
            name: c.name,
            title: c.title,
            linkedin: c.linkedin,
            context: c.context,
            addedBy: 'Signal' as const,
            dateAdded: new Date().toISOString()
          }));

        if (newProspects.length > 0) {
          updatePayload.prospects = [...newProspects, ...existingProspects];
          alert(`Found ${newProspects.length} new potential prospects from signals! Check the Prospecting tab.`);
        }
      }

      onUpdateAccount({ ...account, ...updatePayload });
      if (result.groundingUrls) setSources(result.groundingUrls);
    } catch (error) {
      alert("Signal scan failed. Please check your settings.");
      console.error(error);
    } finally {
      setIsScanning(false);
    }
  };

  const handleSave = (contentToSave?: string) => {
    const content = contentToSave ?? localSignals;
    setSaveStatus('saving');
    onUpdateAccount({ ...account, signals: content });
    setTimeout(() => {
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    }, 500);
  };

  const handleCustomPrompt = () => {
    const query = window.prompt("What specific information should I search for?");
    if (query && query.trim()) handleScan(query);
  };

  const icp = sellerInfo.idealCustomerProfile;
  const hasIcp = icp && icp.roles && icp.painPoints;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center">
              <Radio size={20} className={isScanning ? 'animate-pulse' : ''} />
            </div>
            <div>
              <h3 className="font-bold text-slate-800">Account Signal Engine</h3>
              <p className="text-xs text-slate-500">Sales triggers mapped to {sellerInfo.companyName} solutions</p>
            </div>
          </div>
          <div className="flex gap-2">
            {!hasIcp && (
              <div className="flex items-center gap-2 px-3 py-1 bg-amber-50 border border-amber-100 text-amber-700 rounded-lg text-[10px] font-bold">
                <ShieldAlert size={14} /> ICP Context Missing
              </div>
            )}
            
            <Button variant="outline" onClick={() => setIsEditing(!isEditing)}>
              {isEditing ? <Eye size={16} /> : <Edit3 size={16} />}
              {isEditing ? 'View Mode' : 'Edit Manually'}
            </Button>
            
            {localSignals && !isEditing && (
              <Button variant="outline" onClick={() => setIsRefineModalOpen(true)}>
                <Wand2 size={16} /> Refine
              </Button>
            )}

            {isEditing && (
              <Button variant="outline" onClick={() => handleSave()} disabled={saveStatus === 'saving'}>
                {saveStatus === 'saved' ? <CheckCircle size={16} className="text-emerald-500" /> : <Save size={16} />}
                {saveStatus === 'saving' ? 'Saving...' : 'Save'}
              </Button>
            )}

            <Button variant="outline" onClick={handleCustomPrompt} disabled={isScanning}>
              <Search size={16} /> Custom
            </Button>
            
            <Button onClick={() => handleScan()} disabled={isScanning} className="min-w-[140px]">
              {isScanning ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
              {isScanning ? 'Scanning...' : 'Scan Now'}
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm min-h-[600px] relative overflow-hidden flex flex-col">
            {isScanning && (
              <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-20 flex flex-col items-center justify-center text-center p-8">
                <Loader2 className="animate-spin text-rose-600 mb-4" size={48} />
                <h4 className="text-xl font-black text-slate-900 tracking-tight">Mapping Market Pulses</h4>
                <p className="text-slate-500 text-sm max-w-sm mt-3 leading-relaxed">
                  Searching for executive moves and financial shifts at <strong>{account.name}</strong> that align with <strong>{sellerInfo.products}</strong>.
                </p>
              </div>
            )}

            <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between shrink-0">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Intelligence History</span>
            </div>

            {isEditing ? (
              <textarea
                className="w-full flex-1 p-8 md:p-12 text-slate-700 leading-relaxed outline-none resize-none font-mono text-sm bg-transparent"
                value={localSignals}
                onChange={(e) => setLocalSignals(e.target.value)}
                placeholder="Edit your intelligence history here..."
              />
            ) : (
              <div className="flex-1 p-8 md:p-12 overflow-y-auto">
                {localSignals ? (
                  <FormattedOutput content={localSignals} />
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-center py-12">
                    <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6 text-slate-200">
                      <Radio size={40} strokeWidth={1} />
                    </div>
                    <h4 className="text-lg font-bold text-slate-400">No Signals Found</h4>
                    <p className="text-slate-400 text-sm max-w-xs mt-2">
                      Start a scan to find timely sales angles for {account.name}.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h4 className="text-sm font-black text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Search size={16} className="text-rose-600" /> Trigger Sources
            </h4>
            {sources.length > 0 ? (
              <ul className="space-y-3">
                {sources.map((source, i) => (
                  <li key={i}>
                    <a href={source.uri} target="_blank" rel="noopener noreferrer" className="flex items-start gap-3 p-3 rounded-xl hover:bg-rose-50 transition-all border border-transparent hover:border-indigo-100 group">
                      <div className="shrink-0 mt-0.5 p-1 bg-slate-100 text-slate-400 rounded group-hover:bg-rose-100 group-hover:text-rose-600 transition-colors">
                        <ExternalLink size={10} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[11px] font-bold text-slate-700 truncate">{source.title}</p>
                        <p className="text-[9px] text-slate-400 truncate font-mono mt-0.5">{new URL(source.uri).hostname}</p>
                      </div>
                    </a>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="py-8 text-center text-[10px] text-slate-400 italic">No sources currently linked.</div>
            )}
          </div>

          <div className="bg-slate-900 p-6 rounded-2xl text-white shadow-xl relative overflow-hidden">
            <h4 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Filtering Context</h4>
            <div className="space-y-4">
              <div>
                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1">Target Personas</p>
                <p className="text-xs font-medium text-slate-200 line-clamp-2">{icp?.roles || 'Not defined'}</p>
              </div>
              <div>
                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1">Target Pains</p>
                <p className="text-xs font-medium text-slate-200 line-clamp-2">{icp?.painPoints || 'Not defined'}</p>
              </div>
            </div>
            <div className="mt-6 pt-6 border-t border-white/10">
              <p className="text-[10px] text-slate-400 italic flex items-center gap-2">
                <Info size={12} /> Calibration set in Settings
              </p>
            </div>
          </div>
        </div>
      </div>

      <RefineWithAIModal
        isOpen={isRefineModalOpen}
        onClose={() => setIsRefineModalOpen(false)}
        currentContent={localSignals}
        contextTitle={`Signals for ${account.name}`}
        onRefined={(newText) => {
          setLocalSignals(newText);
          handleSave(newText);
        }}
      />
    </div>
  );
};

export default SignalsTab;
