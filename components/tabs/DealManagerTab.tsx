
import React, { useState, useEffect } from 'react';
import { 
  Briefcase, 
  Sparkles, 
  Loader2, 
  CheckCircle2, 
  AlertTriangle, 
  Target, 
  Calendar, 
  DollarSign, 
  Save, 
  RotateCcw,
  Zap,
  TrendingUp,
  FileText,
  ShieldAlert,
  Info,
  Edit3,
  Eye,
  HelpCircle,
  RefreshCw,
  ThumbsUp,
  ArrowRight
} from 'lucide-react';
import { Account, SellerInfo, Frameworks, FrameworkCategory, DealData } from '../../types';
import { geminiService } from '../../services/geminiService';
import { Button } from '../common/Button';
import { Textarea } from '../common/Textarea';
import { Input } from '../common/Input';
import { FormattedOutput } from '../common/FormattedOutput';

interface DealManagerTabProps {
  account: Account;
  sellerInfo: SellerInfo;
  frameworks: Frameworks;
  onUpdateAccount: (updatedAccount: Account) => void;
  allAccounts?: Account[];
}

const DealManagerTab: React.FC<DealManagerTabProps> = ({ 
  account, 
  sellerInfo, 
  frameworks, 
  onUpdateAccount,
  allAccounts = []
}) => {
  const initialDeal: DealData = account.deal || {
    stage: 'Discovery',
    amount: '',
    closeDate: '',
    probability: 20,
    analysis: '',
  };

  const [deal, setDeal] = useState<DealData>(initialDeal);
  const [dealStatus, setDealStatus] = useState<'Active' | 'None'>(account.dealStatus || 'None');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isAnalyzingHealth, setIsAnalyzingHealth] = useState(false);
  const [isCalculatingProbability, setIsCalculatingProbability] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [isEditing, setIsEditing] = useState(!account.deal?.analysis);

  const frameworkRules = frameworks[FrameworkCategory.DEAL_MANAGEMENT] || 'Focus on MEDDPICC.';

  useEffect(() => {
    if (account.deal) setDeal(account.deal);
    if (account.dealStatus) setDealStatus(account.dealStatus);
  }, [account.id]);

  const handleUpdateDeal = (updates: Partial<DealData>) => {
    const newDeal = { ...deal, ...updates };
    setDeal(newDeal);
    handleSave(newDeal, dealStatus);
  };

  const handleStatusChange = (status: 'Active' | 'None') => {
    setDealStatus(status);
    handleSave(deal, status);
  };

  const handleSave = (dealToSave: DealData, statusToSave: 'Active' | 'None') => {
    setSaveStatus('saving');
    onUpdateAccount({ ...account, deal: dealToSave, dealStatus: statusToSave });
    setTimeout(() => {
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    }, 500);
  };

  const handleRunHealthCheck = async () => {
    setIsAnalyzingHealth(true);
    try {
      const fwName = FrameworkCategory.DEAL_MANAGEMENT;
      const fwDef = frameworks[fwName] || "MEDDPICC";
      
      // Call updated analysis with Probability Calculation and allAccounts context
      const result = await geminiService.analyzeDealHealth(account, fwName, fwDef, allAccounts);
      
      const updatedDeal = { 
          ...deal, 
          analysis: result.analysisMarkdown,
          probability: result.calculatedProbability,
          probabilityRationale: result.probabilityRationale,
          aiAnalysis: result.aiAnalysis
      };

      setDeal(updatedDeal);
      handleSave(updatedDeal, dealStatus);
      setIsEditing(false); // Switch to View Mode to see formatted result
    } catch (error) {
      console.error(error);
      alert("Deal audit failed. Please try again.");
    } finally {
      setIsAnalyzingHealth(false);
    }
  };

  const handleRefreshProbability = async () => {
    setIsCalculatingProbability(true);
    try {
      const result = await geminiService.calculateDealProbability(account);
      const updatedDeal = {
        ...deal,
        probability: result.calculatedProbability,
        probabilityRationale: result.probabilityRationale
      };
      setDeal(updatedDeal);
      handleSave(updatedDeal, dealStatus);
    } catch (error) {
      console.error(error);
      alert("Probability update failed.");
    } finally {
      setIsCalculatingProbability(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-emerald-500 border-emerald-100 bg-emerald-50';
    if (score >= 50) return 'text-amber-500 border-amber-100 bg-amber-50';
    return 'text-rose-500 border-rose-100 bg-rose-50';
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300 pb-20">
      {/* Strategic Header: Deal Metadata */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col xl:flex-row gap-6">
        <div className="flex-1 space-y-6">
            {/* Status Toggle */}
            <div className="flex items-center gap-4">
                <label className="text-sm font-bold text-slate-700">Deal Status:</label>
                <div className="flex bg-slate-100 p-1 rounded-lg">
                    <button
                        onClick={() => handleStatusChange('None')}
                        className={`px-4 py-2 rounded-md text-xs font-bold transition-all ${
                            dealStatus === 'None' 
                                ? 'bg-white text-slate-600 shadow-sm' 
                                : 'text-slate-400 hover:text-slate-600'
                        }`}
                    >
                        No Active Deal
                    </button>
                    <button
                        onClick={() => handleStatusChange('Active')}
                        className={`px-4 py-2 rounded-md text-xs font-bold transition-all ${
                            dealStatus === 'Active' 
                                ? 'bg-indigo-600 text-white shadow-sm' 
                                : 'text-slate-400 hover:text-indigo-600'
                        }`}
                    >
                        Active Deal
                    </button>
                </div>
            </div>

            {/* Conditional Fields */}
            {dealStatus === 'Active' && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-in slide-in-from-top-2 duration-300">
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-1">
                        <Target size={10} /> Stage
                        </label>
                        <select 
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500"
                        value={deal.stage}
                        onChange={(e) => handleUpdateDeal({ stage: e.target.value })}
                        >
                        <option>Qualification</option>
                        <option>Discovery</option>
                        <option>Validation/POC</option>
                        <option>Negotiation</option>
                        <option>Closed Won</option>
                        <option>Closed Lost</option>
                        </select>
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-1">
                        <DollarSign size={10} /> Amount
                        </label>
                        <input 
                        type="text"
                        placeholder="$0.00"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500"
                        value={deal.amount}
                        onChange={(e) => handleUpdateDeal({ amount: e.target.value })}
                        />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-1">
                        <Calendar size={10} /> Target Close
                        </label>
                        <input 
                        type="date"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500"
                        value={deal.closeDate}
                        onChange={(e) => handleUpdateDeal({ closeDate: e.target.value })}
                        />
                    </div>
                    <div className="space-y-1.5">
                        <div className="flex justify-between items-center">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-1">
                            <TrendingUp size={10} /> Probability
                            </label>
                            <div className="flex items-center gap-2">
                                <span className={`text-[10px] font-bold ${deal.probability >= 70 ? 'text-emerald-600' : 'text-slate-600'}`}>
                                    {deal.probability}%
                                </span>
                                <button 
                                    onClick={handleRefreshProbability}
                                    disabled={isCalculatingProbability}
                                    className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-indigo-600 transition-colors"
                                    title="Recalculate Probability with AI"
                                >
                                    <RefreshCw size={12} className={isCalculatingProbability ? 'animate-spin' : ''} />
                                </button>
                            </div>
                        </div>
                        <input 
                        type="range" 
                        min="0" max="100" step="5"
                        className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600 mt-2"
                        value={deal.probability}
                        onChange={(e) => handleUpdateDeal({ probability: parseInt(e.target.value) })}
                        title="AI Adjusted Score"
                        />
                        {deal.probabilityRationale && (
                            <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-2 mt-1">
                                <p className="text-[9px] text-indigo-800 leading-tight">
                                    <span className="font-bold">AI Rationale:</span> {deal.probabilityRationale}
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>

        <div className="flex items-start gap-2 shrink-0 pt-6 xl:pt-0">
          <Button variant="outline" onClick={() => handleSave(deal, dealStatus)} disabled={saveStatus === 'saving'}>
            {saveStatus === 'saved' ? <CheckCircle2 size={16} className="text-emerald-500" /> : <Save size={16} />}
            {saveStatus === 'saving' ? 'Saving...' : 'Save Changes'}
          </Button>
          <Button onClick={handleRunHealthCheck} disabled={isAnalyzingHealth || dealStatus !== 'Active'}>
            {isAnalyzingHealth ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
            {dealStatus === 'Active' ? 'Run Deal Audit' : 'Activate Deal First'}
          </Button>
        </div>
      </div>

      {dealStatus === 'Active' ? (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Main Document Area */}
            <div className="lg:col-span-3 space-y-6">
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm min-h-[700px] flex flex-col relative overflow-hidden">
                {isProcessing || isAnalyzingHealth ? (
                <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-30 flex flex-col items-center justify-center text-center p-8">
                    <Loader2 className="animate-spin text-indigo-600 mb-4" size={48} />
                    <h4 className="text-xl font-black text-slate-900 tracking-tight">Performing Deal Audit</h4>
                    <p className="text-slate-500 text-sm max-w-sm mt-3 leading-relaxed">
                    Calculating Probability Score and checking Framework Compliance against your Evidence Logs.
                    </p>
                </div>
                ) : null}

                <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                    <FileText size={16} className="text-slate-400" />
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Deal Audit Report</span>
                    </div>
                    <div className="flex items-center gap-1.5 px-2 py-1 bg-indigo-50 text-indigo-600 rounded text-[10px] font-bold">
                    <Zap size={10} /> Active Framework: {FrameworkCategory.DEAL_MANAGEMENT}
                    </div>
                </div>
                
                <button 
                    onClick={() => setIsEditing(!isEditing)} 
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
                >
                    {isEditing ? <Eye size={14} /> : <Edit3 size={14} />}
                    {isEditing ? 'View Mode' : 'Edit Mode'}
                </button>
                </div>

                {isEditing ? (
                <textarea 
                    className="flex-1 w-full p-8 md:p-12 text-slate-700 leading-relaxed outline-none resize-none font-mono text-sm bg-transparent"
                    value={deal.analysis}
                    onChange={(e) => setDeal({ ...deal, analysis: e.target.value })}
                    placeholder="Start typing your deal analysis or click 'Run Deal Audit' to let Sidekik verify your deal against the evidence..."
                />
                ) : (
                <div className="flex-1 w-full p-8 md:p-12 overflow-y-auto">
                    {deal.analysis ? (
                    <FormattedOutput content={deal.analysis} />
                    ) : (
                    <div className="flex flex-col items-center justify-center h-full text-center text-slate-400">
                        <Sparkles size={48} className="opacity-20 mb-4" />
                        <p className="italic">Run an audit to generate the scorecard.</p>
                    </div>
                    )}
                </div>
                )}
            </div>
            </div>

            {/* AI Health Sidebar */}
            <div className="lg:col-span-1 space-y-6">
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden">
                <div className="flex items-center justify-between mb-6 relative z-10">
                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Framework Score</h4>
                    {deal.aiAnalysis && (
                        <div className={`w-14 h-14 rounded-full flex items-center justify-center border-4 text-xl font-black shadow-sm ${getScoreColor(deal.aiAnalysis.score)}`}>
                            {deal.aiAnalysis.score}
                        </div>
                    )}
                </div>

                {deal.aiAnalysis ? (
                <div className="space-y-6 relative z-10">
                    <div className="space-y-3">
                        <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest flex items-center gap-1.5">
                            <ThumbsUp size={12} /> Strengths
                        </p>
                        <ul className="space-y-2">
                            {(deal.aiAnalysis.strengths || []).map((strength, i) => (
                            <li key={i} className="text-xs text-slate-600 leading-snug flex gap-2 bg-emerald-50 p-2 rounded-lg border border-emerald-100">
                                <span className="text-emerald-500 font-bold">•</span> {strength}
                            </li>
                            ))}
                            {(!deal.aiAnalysis.strengths || deal.aiAnalysis.strengths.length === 0) && (
                                <li className="text-xs text-slate-400 italic">No specific strengths verified yet.</li>
                            )}
                        </ul>
                    </div>

                    <div className="space-y-3">
                        <p className="text-[10px] font-black text-rose-600 uppercase tracking-widest flex items-center gap-1.5">
                            <ShieldAlert size={12} /> Gaps & Risks
                        </p>
                        <ul className="space-y-2">
                            {(deal.aiAnalysis.gaps || []).map((gap, i) => (
                            <li key={i} className="text-xs text-slate-600 leading-snug flex gap-2 bg-rose-50 p-2 rounded-lg border border-rose-100">
                                <span className="text-rose-500 font-bold">•</span> {gap}
                            </li>
                            ))}
                            {(!deal.aiAnalysis.gaps || deal.aiAnalysis.gaps.length === 0) && (
                                <li className="text-xs text-slate-400 italic">No significant gaps detected.</li>
                            )}
                        </ul>
                    </div>

                    <div className="space-y-3">
                        <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest flex items-center gap-1.5">
                            <ArrowRight size={12} /> Recommended Actions
                        </p>
                        <ul className="space-y-2">
                            {(deal.aiAnalysis.recommendations || []).map((rec, i) => (
                            <li key={i} className="text-xs text-slate-600 leading-snug flex gap-2 bg-indigo-50 p-2 rounded-lg border border-indigo-100">
                                <span className="text-indigo-500 font-bold">•</span> {rec}
                            </li>
                            ))}
                            {(!deal.aiAnalysis.recommendations || deal.aiAnalysis.recommendations.length === 0) && (
                                <li className="text-xs text-slate-400 italic">No actions needed.</li>
                            )}
                        </ul>
                    </div>

                    <div className="pt-4 border-t border-slate-100">
                    <p className="text-[9px] text-slate-400 mt-3 text-center italic">
                        Audit Timestamp: {new Date(deal.aiAnalysis.lastUpdated).toLocaleTimeString()}
                    </p>
                    </div>
                </div>
                ) : (
                <div className="py-12 text-center space-y-4">
                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-300">
                    <AlertTriangle size={32} />
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed px-4">
                    Run the "Deal Audit" to populate this scorecard with strengths, weaknesses, and a framework score.
                    </p>
                </div>
                )}
            </div>

            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 shadow-inner space-y-4">
                <div className="flex items-center gap-2 text-indigo-600">
                <Info size={16} />
                <h4 className="text-[10px] font-black uppercase tracking-widest">Evidence Verification</h4>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">
                Sidekik strictly ignores outside knowledge. It will only credit you for information found in your <strong>Input Logs</strong>.
                </p>
                <div className="pt-2">
                <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-tighter">
                    <span>Evidence Strength</span>
                    <span>100%</span>
                </div>
                <div className="w-full h-1 bg-slate-200 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 w-full"></div>
                </div>
                </div>
            </div>
            </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 bg-slate-50 border border-dashed border-slate-200 rounded-3xl">
            <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mb-6 text-slate-300 shadow-sm">
                <Briefcase size={32} />
            </div>
            <h3 className="text-xl font-bold text-slate-700 mb-2">No Active Deal</h3>
            <p className="text-slate-500 max-w-sm text-center mb-8">
                Mark this account as having an "Active Deal" to unlock the Deal Room, Audit Tools, and Pipeline Tracking.
            </p>
            <Button onClick={() => handleStatusChange('Active')}>
                Start Deal Cycle
            </Button>
        </div>
      )}
    </div>
  );
};

export default DealManagerTab;
