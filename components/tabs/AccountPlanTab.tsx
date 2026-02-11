
import React, { useState, useEffect } from 'react';
import { Sparkles, Save, FileText, RotateCcw, Loader2, CheckCircle, Search, ExternalLink, Info, Edit3, Eye, Wand2 } from 'lucide-react';
import { Account, SellerInfo, Frameworks, FrameworkCategory, AccountPlanTabProps } from '../../types';
import { geminiService, getLogContext, getFamilyContext } from '../../services/geminiService';
import { Button } from '../common/Button';
import { FormattedOutput } from '../common/FormattedOutput';
import { RefineWithAIModal } from '../modals/RefineWithAIModal';
import { ThinkingIndicator } from '../common/ThinkingIndicator';

const AccountPlanTab: React.FC<AccountPlanTabProps> = ({ 
  account, 
  sellerInfo, 
  frameworks, 
  onUpdateAccount,
  allAccounts = []
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [localPlan, setLocalPlan] = useState(account.accountPlan || '');
  const [isEditing, setIsEditing] = useState(!account.accountPlan);
  const [userInstructions, setUserInstructions] = useState('');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [sources, setSources] = useState<{ title: string; uri: string }[]>([]);
  const [isRefineModalOpen, setIsRefineModalOpen] = useState(false);

  useEffect(() => {
    setLocalPlan(account.accountPlan || '');
    if (!account.accountPlan) setIsEditing(true);
  }, [account.id, account.accountPlan]);

  const handleGenerate = async () => {
    if (!sellerInfo.companyName) {
      alert("Please configure your Seller Profile in Settings first.");
      return;
    }

    setIsGenerating(true);
    setSources([]);
    
    try {
      const result = await geminiService.generateAccountPlan(
        account,
        sellerInfo,
        frameworks,
        allAccounts,
        userInstructions
      );

      setLocalPlan(result.text);
      if (result.groundingUrls) setSources(result.groundingUrls);
      setIsEditing(false);
      
      const updatedAccount = { ...account, accountPlan: result.text };
      if (result.extractedRevenue && result.extractedRevenue !== 'null') {
        updatedAccount.annualRevenue = result.extractedRevenue;
      }
      handleSave(result.text, updatedAccount);
    } catch (error) {
      alert("AI generation failed.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = (contentToSave?: string, accountOverride?: Account) => {
    const content = contentToSave ?? localPlan;
    setSaveStatus('saving');
    const accToUpdate = accountOverride || account;
    onUpdateAccount({ ...accToUpdate, accountPlan: content });
    setTimeout(() => {
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    }, 500);
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
              <FileText size={20} />
            </div>
            <div>
              <h3 className="font-bold text-slate-800">Strategic Account Plan</h3>
              <p className="text-xs text-slate-500">
                {account.tier && account.tier !== 'Unassigned' ? (
                  <span className="font-bold text-indigo-600 uppercase tracking-wider">{account.tier} Execution Mode</span>
                ) : (
                  `Live intelligence for ${account.name}`
                )}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setIsEditing(!isEditing)}>
              {isEditing ? <Eye size={16} /> : <Edit3 size={16} />}
              {isEditing ? 'View Mode' : 'Edit Manually'}
            </Button>
            
            {localPlan && !isEditing && (
              <Button variant="outline" onClick={() => setIsRefineModalOpen(true)}>
                <Wand2 size={16} /> Refine
              </Button>
            )}

            {isEditing && (
              <Button variant="outline" onClick={() => handleSave()} disabled={saveStatus === 'saving' || !localPlan}>
                {saveStatus === 'saved' ? <CheckCircle size={16} className="text-emerald-500" /> : <Save size={16} />}
                {saveStatus === 'saving' ? 'Saving...' : 'Save'}
              </Button>
            )}

            <Button onClick={handleGenerate} disabled={isGenerating}>
              {isGenerating ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
              {localPlan ? 'Re-Generate' : 'Generate'}
            </Button>
          </div>
        </div>

        {isEditing && (
          <div className="relative animate-in slide-in-from-top-1 duration-200">
            <input 
              type="text"
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
              placeholder="Instructions for AI (e.g. 'Focus on cost-saving angles')..."
              value={userInstructions}
              onChange={(e) => setUserInstructions(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
            />
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm min-h-[700px] relative overflow-hidden flex flex-col">
            {isGenerating && (
              <div className="absolute inset-0 bg-white/90 backdrop-blur-sm z-20 flex items-center justify-center transition-all duration-500">
                <ThinkingIndicator 
                  customMessages={[
                    `Analyzing context for ${account.name}...`,
                    `Applying Tier: ${account.tier || 'Unassigned'} strategy rules...`,
                    "Reviewing communication logs & hierarchy...",
                    "Checking web for recent signals...",
                    "Synthesizing strategic plan..."
                  ]} 
                />
              </div>
            )}
            
            <div className="p-4 bg-slate-50 border-b border-slate-100 shrink-0">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Plan Editor</span>
            </div>

            {isEditing ? (
              <textarea
                className="w-full flex-1 p-8 md:p-12 text-slate-700 leading-relaxed outline-none resize-none font-mono text-sm bg-transparent"
                value={localPlan}
                onChange={(e) => setLocalPlan(e.target.value)}
              />
            ) : (
              <div className="flex-1 p-8 md:p-12 overflow-y-auto">
                {localPlan ? <FormattedOutput content={localPlan} /> : <div className="text-center py-24 text-slate-400 italic">No plan drafted yet.</div>}
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h4 className="text-sm font-black text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Search size={16} className="text-indigo-600" /> Research Sources
            </h4>
            {sources.length > 0 ? (
              <ul className="space-y-3">
                {sources.map((source, i) => (
                  <li key={i}>
                    <a href={source.uri} target="_blank" rel="noopener noreferrer" className="flex items-start gap-3 p-2 rounded-lg hover:bg-indigo-50 border border-transparent hover:border-indigo-100 transition-all">
                      <div className="shrink-0 mt-1 p-1 bg-slate-100 text-slate-400 rounded"><ExternalLink size={10} /></div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-700 truncate">{source.title}</p>
                        <p className="text-[10px] text-slate-400 truncate font-mono">{new URL(source.uri).hostname}</p>
                      </div>
                    </a>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-slate-400 italic">Sources appear here after generation.</p>
            )}
          </div>
        </div>
      </div>

      <RefineWithAIModal
        isOpen={isRefineModalOpen}
        onClose={() => setIsRefineModalOpen(false)}
        currentContent={localPlan}
        contextTitle={`Plan for ${account.name}`}
        onRefined={(newText) => {
          setLocalPlan(newText);
          handleSave(newText);
        }}
      />
    </div>
  );
};

export default AccountPlanTab;
