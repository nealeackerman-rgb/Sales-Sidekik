
import React, { useState, useMemo } from 'react';
import { 
  TrendingUp, 
  Target, 
  Mic, 
  PlayCircle, 
  CheckCircle2, 
  XCircle, 
  Lightbulb, 
  Save, 
  Sparkles, 
  Loader2, 
  Trophy, 
  AlertTriangle, 
  Calendar,
  ArrowRight,
  RefreshCw,
  Quote
} from 'lucide-react';
import { Account, SellerInfo, Frameworks, FrameworkCategory, CoachingEvaluation, CommunicationLog } from '../../types';
import { geminiService } from '../../services/geminiService';
import { Button } from '../common/Button';
import { FormattedOutput } from '../common/FormattedOutput';

interface CoachingViewProps {
  accounts: Account[];
  sellerInfo: SellerInfo;
  frameworks: Frameworks;
  onUpdateAccount: (account: Account) => void;
  onUpdateSellerInfo: (info: SellerInfo) => void;
}

const STAGES = [
  { label: 'Discovery Call', framework: FrameworkCategory.DISCOVERY },
  { label: 'Solution / Demo', framework: FrameworkCategory.SOLUTION_PRESENTATION },
  { label: 'Negotiation', framework: FrameworkCategory.NEGOTIATION },
  { label: 'Deal Management', framework: FrameworkCategory.DEAL_MANAGEMENT },
];

const CoachingView: React.FC<CoachingViewProps> = ({
  accounts,
  sellerInfo,
  frameworks,
  onUpdateAccount,
  onUpdateSellerInfo
}) => {
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [selectedLogIndex, setSelectedLogIndex] = useState<number | null>(null);
  const [selectedStage, setSelectedStage] = useState<string>(STAGES[0].label);
  const [analysisResult, setAnalysisResult] = useState<CoachingEvaluation | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isTrendAnalyzing, setIsTrendAnalyzing] = useState(false);

  // Derived state
  const selectedAccount = accounts.find(a => a.id === selectedAccountId);
  const logs = selectedAccount?.communicationLogs || [];
  const selectedLog = selectedLogIndex !== null ? logs[selectedLogIndex] : null;
  const currentFrameworkCat = STAGES.find(s => s.label === selectedStage)?.framework || FrameworkCategory.DISCOVERY;
  const frameworkContent = frameworks[currentFrameworkCat];

  const handleSelectAccount = (id: string) => {
    setSelectedAccountId(id);
    setSelectedLogIndex(null);
    setAnalysisResult(null);
  };

  const handleSelectLog = (index: number) => {
    setSelectedLogIndex(index);
    // If this log already has coaching data, load it
    const existingEvaluation = logs[index]?.coaching;
    if (existingEvaluation) {
      setAnalysisResult(existingEvaluation);
    } else {
      setAnalysisResult(null);
    }
  };

  const handleAnalyze = async () => {
    if (!selectedLog) return;
    setIsAnalyzing(true);
    try {
      const result = await geminiService.evaluateCall(
        selectedLog.content,
        selectedStage,
        frameworkContent
      );
      setAnalysisResult(result);
    } catch (error) {
      alert("Analysis failed. Please try again.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSaveEvaluation = async () => {
    if (!selectedAccount || selectedLogIndex === null || !analysisResult) return;

    // 1. Update the specific log with the evaluation
    const updatedLogs = [...logs];
    updatedLogs[selectedLogIndex] = {
      ...updatedLogs[selectedLogIndex],
      coaching: analysisResult
    };

    const updatedAccount = {
      ...selectedAccount,
      communicationLogs: updatedLogs
    };

    onUpdateAccount(updatedAccount);
    alert("Evaluation saved successfully!");

    // 2. Bonus: Check if we should update global trends
    // Count total evaluations across ALL accounts
    let totalEvals = 0;
    const allEvaluations: CoachingEvaluation[] = [];

    // Add previous evaluations from other accounts
    accounts.forEach(acc => {
      acc.communicationLogs?.forEach(log => {
        if (log.coaching) {
          totalEvals++;
          allEvaluations.push(log.coaching);
        }
      });
    });
    // Add this new one (if not already counted, though we just saved it to memory, 
    // the 'accounts' prop might not reflect it instantly in this scope depending on update timing.
    // Safest is to push the current result to our aggregation list.)
    allEvaluations.push(analysisResult); 
    
    if (allEvaluations.length >= 3) {
      handleUpdateTrends(allEvaluations);
    }
  };

  const handleUpdateTrends = async (evals: CoachingEvaluation[]) => {
    setIsTrendAnalyzing(true);
    try {
      // Sort by date desc and take top 10 for trends
      const recentEvals = evals.sort((a, b) => new Date(b.dateEvaluated).getTime() - new Date(a.dateEvaluated).getTime()).slice(0, 10);
      
      const trends = await geminiService.generateCoachingTrends(recentEvals);
      
      onUpdateSellerInfo({
        ...sellerInfo,
        coachingTrends: {
          ...trends,
          lastUpdated: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error("Failed to update trends", error);
    } finally {
      setIsTrendAnalyzing(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-emerald-500 border-emerald-100 bg-emerald-50';
    if (score >= 60) return 'text-amber-500 border-amber-100 bg-amber-50';
    return 'text-rose-500 border-rose-100 bg-rose-50';
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300 pb-24">
      
      {/* Top Section: Seller Trends */}
      <div className="bg-slate-900 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full -mr-16 -mt-16 blur-3xl"></div>
        
        <div className="flex flex-col md:flex-row gap-8 relative z-10">
          <div className="flex-1 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                <Trophy size={24} className="text-amber-400" />
              </div>
              <div>
                <h2 className="text-2xl font-black tracking-tight">Coaching Dashboard</h2>
                <p className="text-slate-400 text-sm font-medium">
                  {sellerInfo.coachingTrends ? `Based on analysis of your recent calls` : 'Complete 3 evaluations to unlock trends'}
                </p>
              </div>
            </div>

            {sellerInfo.coachingTrends ? (
              <div className="mt-4 p-4 bg-white/5 rounded-xl border border-white/10">
                <p className="text-slate-300 text-sm leading-relaxed italic">"{sellerInfo.coachingTrends.summary}"</p>
                <p className="text-[10px] text-slate-500 mt-2 font-bold uppercase tracking-widest">
                  Last Updated: {new Date(sellerInfo.coachingTrends.lastUpdated).toLocaleDateString()}
                </p>
              </div>
            ) : (
              <div className="mt-4 p-4 bg-white/5 rounded-xl border border-white/10 border-dashed text-center">
                <p className="text-slate-500 text-sm">No trend data yet. Analyze calls below.</p>
              </div>
            )}
          </div>

          <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-5">
              <h4 className="text-emerald-400 text-xs font-black uppercase tracking-widest mb-2 flex items-center gap-2">
                <Sparkles size={14} /> Superpower
              </h4>
              <p className="text-white font-bold text-lg leading-tight">
                {sellerInfo.coachingTrends?.topStrength || '---'}
              </p>
            </div>
            <div className="bg-rose-500/10 border border-rose-500/20 rounded-2xl p-5">
              <h4 className="text-rose-400 text-xs font-black uppercase tracking-widest mb-2 flex items-center gap-2">
                <AlertTriangle size={14} /> Focus Area
              </h4>
              <p className="text-white font-bold text-lg leading-tight">
                {sellerInfo.coachingTrends?.topWeakness || '---'}
              </p>
            </div>
          </div>
        </div>

        {isTrendAnalyzing && (
          <div className="absolute top-4 right-4 flex items-center gap-2 text-xs font-bold text-indigo-400 animate-pulse">
            <Loader2 size={12} className="animate-spin" /> Updating Trends...
          </div>
        )}
      </div>

      {/* Main Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[600px]">
        
        {/* Left Column: Selector & Input */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
            <h3 className="font-bold text-slate-900 flex items-center gap-2">
              <Target size={18} className="text-indigo-600" />
              Call Selection
            </h3>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Account</label>
                <select 
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                  value={selectedAccountId}
                  onChange={(e) => handleSelectAccount(e.target.value)}
                >
                  <option value="" disabled>Select Account...</option>
                  {accounts.map(acc => (
                    <option key={acc.id} value={acc.id}>{acc.name}</option>
                  ))}
                </select>
              </div>

              {selectedAccountId && (
                <div className="space-y-1.5 animate-in slide-in-from-top-2 duration-200">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Interaction Log</label>
                  {logs.length > 0 ? (
                    <div className="max-h-48 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                      {logs.map((log, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleSelectLog(idx)}
                          className={`w-full text-left p-3 rounded-xl border transition-all ${
                            selectedLogIndex === idx 
                              ? 'bg-indigo-50 border-indigo-200 shadow-sm' 
                              : 'bg-white border-slate-100 hover:border-slate-300'
                          }`}
                        >
                          <div className="flex justify-between items-center mb-1">
                            <span className={`text-[10px] font-black uppercase tracking-wider ${selectedLogIndex === idx ? 'text-indigo-600' : 'text-slate-500'}`}>
                              {log.type}
                            </span>
                            {log.coaching && <CheckCircle2 size={12} className="text-emerald-500" />}
                          </div>
                          <p className={`text-xs truncate font-medium ${selectedLogIndex === idx ? 'text-indigo-900' : 'text-slate-600'}`}>
                            {log.content}
                          </p>
                          <p className="text-[10px] text-slate-400 mt-1">{new Date(log.date).toLocaleDateString()} {new Date(log.date).toLocaleTimeString()}</p>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 bg-slate-50 rounded-xl text-center text-xs text-slate-400 italic">
                      No logs found for this account.
                    </div>
                  )}
                </div>
              )}

              {selectedLog && (
                <div className="space-y-4 pt-4 border-t border-slate-100 animate-in slide-in-from-top-2 duration-200">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Call Stage</label>
                    <div className="grid grid-cols-2 gap-2">
                      {STAGES.map((s) => (
                         <button
                           key={s.label}
                           onClick={() => setSelectedStage(s.label)}
                           className={`px-3 py-2 rounded-lg text-[10px] font-bold uppercase transition-all ${
                             selectedStage === s.label
                               ? 'bg-slate-800 text-white shadow-md'
                               : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                           }`}
                         >
                           {s.label}
                         </button>
                      ))}
                    </div>
                  </div>

                  <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100">
                    <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-2 flex items-center gap-1">
                      <Target size={12} /> Evaluating against
                    </h4>
                    <p className="text-xs font-medium text-indigo-900 line-clamp-3">
                      {frameworkContent || "No framework defined for this stage."}
                    </p>
                  </div>

                  <Button 
                    className="w-full py-4 text-base" 
                    onClick={handleAnalyze} 
                    disabled={isAnalyzing || !frameworkContent}
                  >
                    {isAnalyzing ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
                    {isAnalyzing ? 'Analyzing Interaction...' : 'Run Coach Analysis'}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Report Card */}
        <div className="lg:col-span-7">
          {analysisResult ? (
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden animate-in fade-in slide-in-from-right-4 duration-500">
              {/* Report Header */}
              <div className="bg-slate-50 p-6 border-b border-slate-100 flex items-center justify-between">
                <div>
                   <h3 className="font-bold text-slate-800 text-lg">Evaluation Report</h3>
                   <p className="text-xs text-slate-500">Evaluated against {selectedStage} Framework</p>
                </div>
                <div className={`w-16 h-16 rounded-full flex items-center justify-center border-4 text-xl font-black shadow-sm ${getScoreColor(analysisResult.score)}`}>
                  {analysisResult.score}
                </div>
              </div>

              <div className="p-8 space-y-8">
                {/* Feedback Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-3">
                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      <CheckCircle2 size={14} className="text-emerald-500" /> Strengths
                    </h4>
                    <ul className="space-y-2">
                      {analysisResult.strengths.map((s, i) => (
                        <li key={i} className="flex gap-2 text-sm text-slate-600 bg-emerald-50/50 p-2 rounded-lg border border-emerald-50">
                          <span className="text-emerald-500 font-bold">•</span> {s}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="space-y-3">
                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      <XCircle size={14} className="text-rose-500" /> Weaknesses
                    </h4>
                    <ul className="space-y-2">
                      {analysisResult.weaknesses.map((w, i) => (
                        <li key={i} className="flex gap-2 text-sm text-slate-600 bg-rose-50/50 p-2 rounded-lg border border-rose-50">
                          <span className="text-rose-500 font-bold">•</span> {w}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Missed Opps */}
                <div className="space-y-3">
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <Lightbulb size={14} className="text-amber-500" /> Missed Opportunities
                  </h4>
                  <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 space-y-2">
                    {analysisResult.missedOpportunities.map((m, i) => (
                      <div key={i} className="flex gap-3 text-sm text-amber-900">
                        <ArrowRight size={14} className="text-amber-500 shrink-0 mt-0.5" />
                        {m}
                      </div>
                    ))}
                    {analysisResult.missedOpportunities.length === 0 && (
                      <p className="text-xs text-amber-700 italic">No major missed opportunities detected. Great job!</p>
                    )}
                  </div>
                </div>

                {/* Coach's Note */}
                <div className="space-y-3">
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <Quote size={14} /> Coach's Feedback
                  </h4>
                  <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 italic text-slate-600 text-sm leading-relaxed relative">
                    <Quote size={40} className="absolute top-4 left-4 text-slate-200 -z-10" />
                    "{analysisResult.actionableFeedback}"
                  </div>
                </div>

                {/* Footer Action */}
                <div className="flex justify-end pt-4 border-t border-slate-100">
                  <Button onClick={handleSaveEvaluation} className="bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200">
                    <Save size={18} /> Save to Log
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full min-h-[500px] bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-center p-12">
              <div className="w-24 h-24 bg-white rounded-full shadow-sm flex items-center justify-center mb-6">
                <Mic size={40} className="text-slate-300" />
              </div>
              <h3 className="text-xl font-bold text-slate-400">Ready to Coach</h3>
              <p className="text-slate-400 max-w-sm mt-2 mb-8">
                Select an interaction from the left to analyze it against your {selectedStage} framework.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CoachingView;
