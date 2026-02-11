
import React, { useState, useMemo } from 'react';
import { Compass, Sparkles, Loader2, FileText, Wand2, ArrowRight, Eye, Edit3, Save, CheckCircle } from 'lucide-react';
import { Account, SellerInfo, Frameworks, FrameworkCategory } from '../../types';
import { geminiService } from '../../services/geminiService';
import { Button } from '../common/Button';
import { FormattedOutput } from '../common/FormattedOutput';
import { RefineWithAIModal } from '../modals/RefineWithAIModal';

interface TerritoryPlanViewProps {
  accounts: Account[];
  sellerInfo: SellerInfo;
  frameworks: Frameworks;
  onUpdateSellerInfo: (info: SellerInfo) => void;
  onUpdateAccount: (account: Account) => void;
}

const TerritoryPlanView: React.FC<TerritoryPlanViewProps> = ({
  accounts,
  sellerInfo,
  frameworks,
  onUpdateSellerInfo,
  onUpdateAccount
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isRefineModalOpen, setIsRefineModalOpen] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

  // STRATEGY: Only analyze accounts that are in the active Portfolio
  const portfolioAccounts = useMemo(() => 
    accounts.filter(a => a.isInPortfolio), 
    [accounts]
  );

  const plan = sellerInfo.territoryPlan;

  // Readiness Check: Do we have portfolio accounts that are actually tiered?
  const hasTieredPortfolio = useMemo(() => {
    return portfolioAccounts.some(a => a.tier && a.tier !== 'Unassigned');
  }, [portfolioAccounts]);

  const handleGenerate = async () => {
    if (portfolioAccounts.length === 0) {
      alert("Please add accounts to your 'My Portfolio' section before generating a plan.");
      return;
    }
    
    setIsGenerating(true);
    try {
      const framework = frameworks[FrameworkCategory.TERRITORY_PLANNING] || "Focus on Revenue and Growth";
      // We explicitly pass only portfolio accounts. Staging accounts are ignored.
      const newPlan = await geminiService.draftTerritoryPlan(portfolioAccounts, sellerInfo, framework);
      onUpdateSellerInfo({
        ...sellerInfo,
        territoryPlan: newPlan
      });
      setIsEditing(false);
    } catch (error) {
      console.error(error);
      alert("Failed to draft strategic plan. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRefineContent = (newText: string) => {
    if (!plan) return;
    onUpdateSellerInfo({
      ...sellerInfo,
      territoryPlan: {
        ...plan,
        document: newText,
        lastUpdated: new Date().toISOString()
      }
    });
  };

  const handleSaveManualEdit = () => {
    setSaveStatus('saving');
    // Save happens via onUpdateSellerInfo
    setTimeout(() => {
      setSaveStatus('saved');
      setTimeout(() => {
        setSaveStatus('idle');
        setIsEditing(false);
      }, 1500);
    }, 500);
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">Territory Strategic Plan</h2>
          <p className="text-sm text-slate-500 font-medium">Executive Narrative derived exclusively from your active Portfolio Tiers.</p>
        </div>
        <div className="flex gap-2">
          {plan && (
            <Button variant="outline" onClick={() => setIsEditing(!isEditing)}>
              {isEditing ? <Eye size={16} /> : <Edit3 size={16} />}
              {isEditing ? 'View Mode' : 'Edit Manually'}
            </Button>
          )}
          
          {hasTieredPortfolio && (
            <Button onClick={handleGenerate} disabled={isGenerating} variant={plan ? 'outline' : 'ai'}>
              {isGenerating ? <Loader2 size={16} className="animate-spin" /> : <FileText size={16} />}
              {plan ? 'Re-Draft Plan' : 'Draft Executive Plan'}
            </Button>
          )}
        </div>
      </div>

      {!hasTieredPortfolio ? (
        <div className="bg-white rounded-3xl border border-dashed border-slate-200 p-12 flex flex-col items-center justify-center text-center min-h-[400px]">
          <div className="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center mb-6 text-amber-300">
            <Sparkles size={40} />
          </div>
          <h3 className="text-xl font-bold text-slate-800 mb-2">Portfolio Readiness Check</h3>
          <p className="text-slate-400 max-w-sm mb-8">
            The Territory Plan analyzes your <strong>My Portfolio</strong> section. Assign tiers (Tier 1, 2, or 3) to your portfolio accounts in the Territory tab to generate a strategy.
          </p>
          <div className="flex flex-col items-center gap-4">
             <div className="flex items-center gap-2 text-sm font-bold text-indigo-600 bg-indigo-50 px-4 py-2 rounded-xl">
               Go to Territory <ArrowRight size={16} /> "My Portfolio" Tab
             </div>
             <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest">Note: Accounts in Staging are ignored by the Plan</p>
          </div>
        </div>
      ) : !plan ? (
        <div className="bg-white rounded-3xl border border-dashed border-slate-200 p-12 flex flex-col items-center justify-center text-center min-h-[400px]">
          <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mb-6 text-indigo-300">
            <Compass size={40} />
          </div>
          <h3 className="text-xl font-bold text-slate-800 mb-2">Strategy Blueprint Ready</h3>
          <p className="text-slate-400 max-w-sm mb-8">
            Found {portfolioAccounts.filter(a => a.tier?.includes('1')).length} Tier 1 accounts in your portfolio. Click below to synthesize these into a high-level territory narrative.
          </p>
          <Button onClick={handleGenerate} disabled={isGenerating} className="px-8 py-4 text-base" variant="ai">
            Draft Strategic Narrative
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm min-h-[600px] flex flex-col relative overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center shrink-0">
               <div className="flex items-center gap-2">
                 <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Strategic Document</span>
                 <span className="text-[10px] font-bold text-indigo-600 bg-indigo-100 px-2 py-0.5 rounded uppercase">
                   Portfolio Focus
                 </span>
               </div>
               <div className="flex items-center gap-3">
                 <span className="text-[10px] font-bold text-slate-400">Last Updated: {new Date(plan.lastUpdated).toLocaleDateString()}</span>
                 {plan && !isEditing && (
                    <Button variant="ai" className="h-8 text-xs" onClick={() => setIsRefineModalOpen(true)}>
                      <Wand2 size={14} /> Refine with AI
                    </Button>
                 )}
                 {isEditing && (
                    <Button variant="outline" className="h-8 text-xs" onClick={handleSaveManualEdit} disabled={saveStatus === 'saving'}>
                       {saveStatus === 'saved' ? <CheckCircle size={14} className="text-emerald-500" /> : <Save size={14} />}
                       {saveStatus === 'saving' ? 'Saving...' : 'Save Changes'}
                    </Button>
                 )}
               </div>
            </div>

            {isEditing ? (
              <textarea
                className="w-full flex-1 p-8 md:p-12 text-slate-700 leading-relaxed outline-none resize-none font-mono text-sm bg-transparent"
                value={plan.document}
                onChange={(e) => {
                  onUpdateSellerInfo({
                    ...sellerInfo,
                    territoryPlan: {
                      ...plan,
                      document: e.target.value,
                      lastUpdated: new Date().toISOString()
                    }
                  });
                }}
              />
            ) : (
              <div className="flex-1 p-8 md:p-12 overflow-y-auto custom-scrollbar">
                <FormattedOutput content={plan.document} />
              </div>
            )}
          </div>
        </div>
      )}

      {plan && (
        <RefineWithAIModal
          isOpen={isRefineModalOpen}
          onClose={() => setIsRefineModalOpen(false)}
          currentContent={plan.document}
          contextTitle="Territory Strategy Narrative"
          onRefined={handleRefineContent}
        />
      )}
    </div>
  );
};

export default TerritoryPlanView;
