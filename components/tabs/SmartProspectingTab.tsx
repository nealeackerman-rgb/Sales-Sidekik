
import React, { useState, useEffect } from 'react';
import { 
  Target, 
  PlayCircle, 
  Sparkles, 
  Loader2, 
  Wand2,
  RefreshCw,
  Building2,
  Zap,
  Trash2,
  Copy,
  Check
} from 'lucide-react';
import { Account, SellerInfo, SalesPlay } from '../../types';
import { geminiService, getFamilyContext } from '../../services/geminiService';
import { Button } from '../common/Button';
import { FormattedOutput } from '../common/FormattedOutput';
import { Textarea } from '../common/Textarea';
import { RefineWithAIModal } from '../modals/RefineWithAIModal';

interface SmartProspectingTabProps {
  account: Account;
  sellerInfo: SellerInfo;
  onUpdateAccount: (updatedAccount: Account) => void;
  initialSubTab?: string;
  allAccounts?: Account[];
}

const PlayCard: React.FC<{ play: SalesPlay; onDelete: () => void }> = ({ play, onDelete }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(play.script);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 hover:border-indigo-300 transition-all shadow-sm group">
      <div className="flex justify-between items-start mb-3">
        <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
          <PlayCircle size={16} className="text-indigo-600" />
          {play.title}
        </h4>
        <button 
          onClick={onDelete}
          className="text-slate-300 hover:text-rose-500 transition-colors p-1"
          title="Delete Play"
        >
          <Trash2 size={14} />
        </button>
      </div>
      
      <div className="space-y-3 mb-4">
        <div className="flex gap-2 text-xs">
          <span className="font-bold text-slate-500 uppercase tracking-wider w-16 shrink-0">Objective</span>
          <span className="text-slate-700">{play.objective}</span>
        </div>
        <div className="flex gap-2 text-xs">
          <span className="font-bold text-slate-500 uppercase tracking-wider w-16 shrink-0">Target</span>
          <span className="text-slate-700 font-medium bg-slate-100 px-1.5 py-0.5 rounded">{play.target}</span>
        </div>
        <div className="flex gap-2 text-xs">
          <span className="font-bold text-slate-500 uppercase tracking-wider w-16 shrink-0">Hook</span>
          <span className="text-slate-700 italic">"{play.hook}"</span>
        </div>
      </div>

      <div className="bg-slate-50 rounded-lg p-3 border border-slate-100 relative group/script">
        <p className="text-xs text-slate-600 font-mono whitespace-pre-wrap">{play.script}</p>
        <button 
          onClick={handleCopy}
          className="absolute top-2 right-2 p-1.5 bg-white border border-slate-200 rounded text-slate-400 hover:text-indigo-600 transition-colors opacity-0 group-hover/script:opacity-100"
          title="Copy Script"
        >
          {copied ? <Check size={12} /> : <Copy size={12} />}
        </button>
      </div>
    </div>
  );
};

const SmartProspectingTab: React.FC<SmartProspectingTabProps> = ({ 
  account, 
  sellerInfo, 
  onUpdateAccount,
  initialSubTab,
  allAccounts = []
}) => {
  const [activeTab, setActiveTab] = useState<'matrix' | 'plays'>('matrix');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRefineModalOpen, setIsRefineModalOpen] = useState(false);

  useEffect(() => {
    if (initialSubTab === 'plays') {
      setActiveTab('plays');
    }
  }, [initialSubTab]);

  // Helper to safely get plays array (handling legacy string data)
  const getPlays = (): SalesPlay[] => {
    if (Array.isArray(account.salesPlays)) return account.salesPlays;
    return [];
  };

  const salesPlays = getPlays();

  const handleGenerateMatrix = async () => {
    setIsGenerating(true);
    try {
      const familyContext = getFamilyContext(account, allAccounts);
      const matrix = await geminiService.generatePriorityMatrix(account, sellerInfo, familyContext);
      onUpdateAccount({ ...account, prospectingPlan: matrix });
    } catch (error) {
      alert("Failed to generate Priority Matrix.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGeneratePlays = async () => {
    if (!account.prospectingPlan) {
      alert("Please generate the Strategic Priority Matrix first.");
      return;
    }
    setIsGenerating(true);
    try {
      const plays = await geminiService.generateSalesPlays(account, sellerInfo, account.prospectingPlan);
      onUpdateAccount({ ...account, salesPlays: plays });
    } catch (error) {
      alert("Failed to generate Sales Plays.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDeletePlay = (index: number) => {
    const updated = [...salesPlays];
    updated.splice(index, 1);
    onUpdateAccount({ ...account, salesPlays: updated });
  };

  // Unified Refine Handler for Modal
  const handleRefineContent = async (instruction: string) => {
    if (activeTab === 'matrix') {
      const refined = await geminiService.refineStrategy(account.prospectingPlan || '', instruction);
      onUpdateAccount({ ...account, prospectingPlan: refined });
    } else {
      const refined = await geminiService.refineSalesPlays(salesPlays, instruction);
      onUpdateAccount({ ...account, salesPlays: refined });
    }
  };

  const isCustomer = account.relationshipStatus === 'Customer' || account.relationshipStatus === 'Former Customer';

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      
      {/* Header Context Card */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${isCustomer ? 'bg-indigo-50 text-indigo-600' : 'bg-rose-50 text-rose-600'}`}>
            {isCustomer ? <Zap size={24} /> : <Target size={24} />}
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-lg">Smart Prospecting Engine</h3>
            <p className="text-sm text-slate-500 font-medium">
              Mode: <span className={`font-bold ${isCustomer ? 'text-indigo-600' : 'text-rose-600'}`}>
                {isCustomer ? "Expansion & Cross-Sell" : "Breaking In (New Business)"}
              </span>
            </p>
          </div>
        </div>

        <div className="flex p-1 bg-slate-100 rounded-xl border border-slate-200">
          <button
            onClick={() => setActiveTab('matrix')}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${
              activeTab === 'matrix' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Target size={16} /> Priority Matrix
          </button>
          <button
            onClick={() => setActiveTab('plays')}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${
              activeTab === 'plays' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <PlayCircle size={16} /> Sales Plays
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Main Content Area */}
        <div className="lg:col-span-3">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm min-h-[600px] relative overflow-hidden flex flex-col">
            
            {/* Loading Overlay */}
            {isGenerating && (
              <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-30 flex flex-col items-center justify-center text-center p-8">
                <Loader2 className="animate-spin text-indigo-600 mb-4" size={48} />
                <h4 className="text-xl font-black text-slate-900 tracking-tight">
                  Analyzing Opportunity
                </h4>
                <p className="text-slate-500 text-sm max-w-sm mt-3 leading-relaxed">
                  {isCustomer 
                    ? "Identifying product gaps and whitespace opportunities based on current usage..." 
                    : "Scanning news and reports to map your value prop to their urgent pains..."}
                </p>
              </div>
            )}

            {/* Action Bar */}
            <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between shrink-0">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                {activeTab === 'matrix' ? 'Strategic Analysis' : 'Execution Scripts'}
              </span>
              <div className="flex gap-2">
                {activeTab === 'matrix' ? (
                  <Button onClick={handleGenerateMatrix} disabled={isGenerating}>
                    <Sparkles size={16} /> {account.prospectingPlan ? 'Re-Generate' : 'Generate Matrix'}
                  </Button>
                ) : (
                  <Button onClick={handleGeneratePlays} disabled={isGenerating || !account.prospectingPlan}>
                    <PlayCircle size={16} /> {salesPlays.length > 0 ? 'Re-Write Plays' : 'Generate Plays'}
                  </Button>
                )}
              </div>
            </div>

            {/* Render Output */}
            <div className="flex-1 p-8 md:p-12 bg-slate-50/30 overflow-y-auto">
              {activeTab === 'matrix' ? (
                account.prospectingPlan ? (
                  <div className="animate-in fade-in duration-300">
                    <FormattedOutput content={account.prospectingPlan} />
                    <div className="mt-8 pt-6 border-t border-slate-200 flex justify-center">
                      <Button variant="outline" onClick={() => setIsRefineModalOpen(true)}>
                        <Wand2 size={16} /> Refine Matrix with AI
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-center text-slate-400">
                    <Target size={48} className="opacity-20 mb-4" />
                    <p className="italic mb-2">No strategy matrix yet.</p>
                    <p className="text-xs max-w-xs">Click Generate to analyze {account.name} against your product suite.</p>
                  </div>
                )
              ) : (
                salesPlays.length > 0 ? (
                  <div className="space-y-6 animate-in fade-in duration-300">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {salesPlays.map((play, idx) => (
                        <PlayCard 
                          key={idx} 
                          play={play} 
                          onDelete={() => handleDeletePlay(idx)}
                        />
                      ))}
                    </div>
                    <div className="flex justify-center pt-4">
                      <Button variant="outline" onClick={() => setIsRefineModalOpen(true)}>
                        <Wand2 size={16} /> Refine Plays with AI
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-center text-slate-400">
                    <PlayCircle size={48} className="opacity-20 mb-4" />
                    <p className="italic mb-2">No plays generated yet.</p>
                    <p className="text-xs max-w-xs">Create a Matrix first, then generate actionable plays here.</p>
                  </div>
                )
              )}
            </div>

          </div>
        </div>

        {/* Sidebar Info */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-slate-900 p-6 rounded-2xl text-white shadow-xl relative overflow-hidden">
             <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/20 rounded-full -mr-16 -mt-16 blur-xl"></div>
             <h4 className="text-xs font-black text-indigo-300 uppercase tracking-[0.2em] mb-4">Input Context</h4>
             
             <div className="space-y-4 relative z-10">
               <div>
                 <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Selling</p>
                 <p className="text-xs font-medium text-slate-200 line-clamp-3">{sellerInfo.products || "No products defined"}</p>
               </div>
               <div>
                 <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Account Has</p>
                 <p className="text-xs font-medium text-slate-200 line-clamp-2">
                   {account.currentProducts || (isCustomer ? "Unknown (Update Account)" : "None (Prospect)")}
                 </p>
               </div>
             </div>
          </div>

          <div className="bg-indigo-50 p-6 rounded-2xl border border-indigo-100">
            <h4 className="text-xs font-black text-indigo-800 uppercase tracking-widest mb-2 flex items-center gap-2">
              <RefreshCw size={14} /> Logic Explained
            </h4>
            {isCustomer ? (
              <p className="text-xs text-indigo-700 leading-relaxed">
                Since this is a <strong>Customer</strong>, the AI performs a <strong>White Space Analysis</strong>. It looks for products you sell that they don't have yet, and positions them as "Expansion" opportunities.
              </p>
            ) : (
              <p className="text-xs text-indigo-700 leading-relaxed">
                Since this is a <strong>Prospect</strong>, the AI searches for <strong>Strategic Pain</strong>. It maps your value prop to their public challenges to create a "Breaking In" strategy.
              </p>
            )}
          </div>
        </div>

      </div>

      <RefineWithAIModal
        isOpen={isRefineModalOpen}
        onClose={() => setIsRefineModalOpen(false)}
        currentContent={activeTab === 'matrix' ? (account.prospectingPlan || '') : JSON.stringify(salesPlays, null, 2)}
        contextTitle={activeTab === 'matrix' ? `Priority Matrix for ${account.name}` : `Sales Plays for ${account.name}`}
        onRefined={handleRefineContent}
      />
    </div>
  );
};

export default SmartProspectingTab;
