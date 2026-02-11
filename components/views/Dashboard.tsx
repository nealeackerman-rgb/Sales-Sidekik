
import React, { useEffect, useState, useMemo } from 'react';
import { 
  CheckCircle2, 
  Circle, 
  TrendingUp, 
  ArrowRight,
  Zap,
  Loader2,
  Trophy,
  Briefcase,
  AlertTriangle,
  Target,
  Plus,
  RefreshCw,
  MoreHorizontal,
  PlayCircle,
  Trash2,
  Building2,
  Copy,
  Check,
  TrendingDown,
  BrainCircuit,
  X,
  Maximize2
} from 'lucide-react';
import { Account, SellerInfo, Task, SalesPlay, CoachingEvaluation, NavigationExtras } from '../../types';
import { geminiService } from '../../services/geminiService';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { Modal } from '../common/Modal';

interface DashboardProps {
  accounts: Account[];
  sellerInfo: SellerInfo;
  onUpdateSellerInfo: (info: SellerInfo) => void;
  onUpdateAccount: (account: Account) => void;
  onSelectAccount: (accountId: string, extras?: NavigationExtras) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ 
  accounts, 
  sellerInfo, 
  onUpdateSellerInfo, 
  onUpdateAccount, 
  onSelectAccount 
}) => {
  const [isRefreshingPulse, setIsRefreshingPulse] = useState(false);
  const [manualPlayAccounts, setManualPlayAccounts] = useState<string[]>([]); // IDs of manually added accounts for play view
  const [isAddingPlayAccount, setIsAddingPlayAccount] = useState(false);
  const [isUpdatingTrends, setIsUpdatingTrends] = useState(false);
  const [selectedPlay, setSelectedPlay] = useState<(SalesPlay & { accountName: string; accountId: string; originalIndex: number }) | null>(null);
  const [selectedPulseAccount, setSelectedPulseAccount] = useState<Account | null>(null);

  // --- 1. PIPELINE HEALTH (Active Deals) ---
  const activeDeals = useMemo(() => {
    return accounts
      .filter(a => a.dealStatus === 'Active')
      .sort((a, b) => {
        return (b.deal?.probability || 0) - (a.deal?.probability || 0);
      });
  }, [accounts]);

  // --- 2. SALES PLAYS AGGREGATION ---
  const activePlayAccounts = useMemo(() => {
    return accounts.filter(a => 
      (a.tier === 'Tier 1' || manualPlayAccounts.includes(a.id)) && 
      Array.isArray(a.salesPlays) && a.salesPlays.length > 0
    );
  }, [accounts, manualPlayAccounts]);

  // Flattened list of plays for rendering
  const dashboardPlays = useMemo(() => {
    return activePlayAccounts.flatMap(acc => {
      // Strict safety check for legacy data types
      const plays = acc.salesPlays;
      if (!Array.isArray(plays)) return [];

      return plays.map((play, index) => ({
        ...play,
        accountId: acc.id,
        accountName: acc.name,
        originalIndex: index
      }));
    });
  }, [activePlayAccounts]);

  const availableAccountsForPlays = useMemo(() => {
    return accounts.filter(a => 
      a.tier !== 'Tier 1' && 
      !manualPlayAccounts.includes(a.id)
    );
  }, [accounts, manualPlayAccounts]);

  // --- ACTIONS ---

  const handleRefreshPulse = async () => {
    if (activeDeals.length === 0) return;
    setIsRefreshingPulse(true);
    try {
      const dealsToRefresh = activeDeals.slice(0, 5); // Limit to top 5
      await Promise.all(dealsToRefresh.map(async (acc) => {
        const summary = await geminiService.generateAccountStatusSummary(acc);
        const updatedAcc = { 
            ...acc, 
            aiSummary: { text: summary, lastUpdated: new Date().toISOString() } 
        };
        onUpdateAccount(updatedAcc);
      }));
    } catch (e) {
      console.error("Pulse refresh failed", e);
    } finally {
      setIsRefreshingPulse(false);
    }
  };

  const handleDeletePlay = (accountId: string, playIndex: number) => {
    const account = accounts.find(a => a.id === accountId);
    if (!account || !Array.isArray(account.salesPlays)) return;

    const updatedPlays = [...account.salesPlays];
    updatedPlays.splice(playIndex, 1);
    
    onUpdateAccount({
      ...account,
      salesPlays: updatedPlays
    });
    
    if (selectedPlay && selectedPlay.accountId === accountId && selectedPlay.originalIndex === playIndex) {
      setSelectedPlay(null);
    }
  };

  const handleAddManualAccount = (accountId: string) => {
    setManualPlayAccounts(prev => [...prev, accountId]);
    setIsAddingPlayAccount(false);
  };

  const handleRefreshCoaching = async () => {
    setIsUpdatingTrends(true);
    try {
      // Gather all evals
      const allEvals: CoachingEvaluation[] = [];
      accounts.forEach(acc => {
        acc.communicationLogs?.forEach(log => {
          if (log.coaching) allEvals.push(log.coaching);
        });
      });

      if (allEvals.length < 3) {
        alert("Need at least 3 analyzed calls to generate trends.");
        return;
      }

      const trends = await geminiService.generateCoachingTrends(allEvals);
      onUpdateSellerInfo({
        ...sellerInfo,
        coachingTrends: {
          ...trends,
          lastUpdated: new Date().toISOString()
        }
      });
    } catch (e) {
      console.error(e);
      alert("Failed to update trends.");
    } finally {
      setIsUpdatingTrends(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 70) return 'bg-emerald-500';
    if (score >= 40) return 'bg-amber-500';
    return 'bg-rose-500';
  };

  return (
    <div className="space-y-8 pb-20 animate-in fade-in slide-in-from-bottom-2 duration-300">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Global Command</h1>
          <p className="text-slate-500 font-medium">Pipeline velocity & strategic execution.</p>
        </div>
        <div className="flex gap-2">
           <Button variant="outline" onClick={handleRefreshPulse} disabled={isRefreshingPulse || activeDeals.length === 0}>
             {isRefreshingPulse ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
             Refresh Pulse
           </Button>
        </div>
      </div>

      {/* PILLAR 1: COMPACT ACTIVE DEAL PULSE */}
      <div className="space-y-4">
        <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
          <Briefcase size={16} className="text-indigo-600" />
          Active Deal Pulse
        </h3>
        
        {activeDeals.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {activeDeals.map(acc => (
              <div 
                key={acc.id} 
                className="bg-white border border-slate-200 rounded-xl shadow-sm hover:shadow-md transition-all cursor-pointer relative overflow-hidden group flex flex-col p-4"
                onClick={() => setSelectedPulseAccount(acc)}
              >
                {/* Header */}
                <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2 overflow-hidden">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                            (acc.deal?.probability || 0) >= 70 ? 'bg-emerald-100 text-emerald-600' : 
                            (acc.deal?.probability || 0) >= 40 ? 'bg-amber-100 text-amber-600' : 'bg-rose-100 text-rose-600'
                        }`}>
                            <Briefcase size={16} />
                        </div>
                        <div className="min-w-0">
                            <h4 className="font-bold text-slate-800 text-sm truncate">{acc.name}</h4>
                            <p className="text-[10px] text-slate-500 font-bold">{acc.deal?.amount || 'Value TBD'} • {acc.deal?.stage}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-1">
                        <span className={`text-[10px] font-black px-1.5 py-0.5 rounded ${
                            (acc.deal?.probability || 0) >= 70 ? 'bg-emerald-100 text-emerald-700' : 
                            (acc.deal?.probability || 0) >= 40 ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'
                        }`}>
                            {acc.deal?.probability}%
                        </span>
                        <button className="text-slate-300 hover:text-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity p-1">
                            <Maximize2 size={12} />
                        </button>
                    </div>
                </div>

                {/* Scrollable Content Box */}
                <div 
                    className="bg-slate-50 p-2 rounded-lg border border-slate-100 text-xs text-slate-600 font-medium mb-3 h-24 overflow-y-auto custom-scrollbar cursor-text leading-relaxed"
                    onClick={(e) => e.stopPropagation()} // Stop click so it doesn't open modal when scrolling text
                >
                    {acc.aiSummary?.text ? (
                        <div className="mb-2">
                            <span className="text-indigo-600 font-bold uppercase text-[9px] tracking-wider block mb-0.5"> <Zap size={10} className="inline mb-0.5" /> Executive Pulse</span>
                            {acc.aiSummary.text}
                        </div>
                    ) : null}
                    
                    {acc.deal?.probabilityRationale ? (
                        <div>
                            <span className="text-indigo-600 font-bold uppercase text-[9px] tracking-wider block mb-0.5"><BrainCircuit size={10} className="inline mb-0.5" /> AI Rationale</span>
                            {acc.deal.probabilityRationale}
                        </div>
                    ) : null}
                    
                    {!acc.aiSummary?.text && !acc.deal?.probabilityRationale && (
                        <span className="text-slate-400 italic">No summary available. Log activity to generate pulse.</span>
                    )}
                </div>

                {/* Footer Action */}
                <button 
                    onClick={(e) => { e.stopPropagation(); onSelectAccount(acc.id, { initialTab: 'deal' }); }}
                    className="w-full py-1.5 bg-white border border-slate-200 text-slate-600 rounded-lg text-[10px] font-bold hover:text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50 transition-colors flex items-center justify-center gap-1"
                >
                    Go to Deal Room <ArrowRight size={10} />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl p-8 text-center">
            <p className="text-slate-400 text-sm italic">No active deals. Convert targets from your territory to populate the pulse.</p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* PILLAR 2: STRATEGIC PLAY EXECUTION */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <Target size={16} className="text-indigo-600" />
              Strategic Play Execution
            </h3>
            <button 
              onClick={() => setIsAddingPlayAccount(true)}
              className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 bg-indigo-50 px-2 py-1 rounded-lg hover:bg-indigo-100 transition-colors"
            >
              <Plus size={12} /> Add Target
            </button>
          </div>

          <div className="bg-slate-50/50 rounded-3xl border border-slate-200 p-6 min-h-[400px]">
            {dashboardPlays.length > 0 ? (
              <div className="columns-1 md:columns-2 gap-4 space-y-4">
                {dashboardPlays.map((play, idx) => (
                  <div 
                    key={`${play.accountId}-${idx}`} 
                    className="break-inside-avoid bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all group relative cursor-pointer"
                    onClick={() => setSelectedPlay(play)}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
                          <PlayCircle size={12} />
                        </div>
                        <div>
                          <h4 className="text-xs font-black text-slate-800 uppercase tracking-wide">{play.title}</h4>
                          <p className="text-[10px] text-slate-500 font-bold">{play.accountName}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button 
                          onClick={(e) => { e.stopPropagation(); setSelectedPlay(play); }}
                          className="text-slate-300 hover:text-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity p-1"
                          title="Expand"
                        >
                          <Maximize2 size={12} />
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleDeletePlay(play.accountId, play.originalIndex); }}
                          className="text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity p-1"
                          title="Remove Play"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                    
                    <div 
                      className="bg-slate-50 p-2 rounded-lg border border-slate-100 text-xs text-slate-600 font-mono mb-2 h-24 overflow-y-auto custom-scrollbar cursor-text"
                      onClick={(e) => e.stopPropagation()} // Allow selecting/scrolling text without opening modal
                    >
                      {play.script}
                    </div>
                    
                    <div className="flex gap-2">
                      <button 
                        onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(play.script); }}
                        className="flex-1 py-1.5 bg-white border border-slate-200 text-slate-600 rounded text-[10px] font-bold hover:text-indigo-600 hover:border-indigo-200 transition-colors flex items-center justify-center gap-1"
                      >
                        <Copy size={10} /> Copy Script
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); onSelectAccount(play.accountId, { initialTab: 'strategy', initialSubTab: 'plays' }); }}
                        className="flex-1 py-1.5 bg-indigo-600 text-white rounded text-[10px] font-bold hover:bg-indigo-700 transition-colors flex items-center justify-center gap-1"
                      >
                        Go to Sales Play <ArrowRight size={10} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center py-20">
                <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mb-4 text-slate-300 shadow-sm">
                  <PlayCircle size={32} />
                </div>
                <h3 className="text-lg font-bold text-slate-700">No Plays Loaded</h3>
                <p className="text-slate-400 text-sm max-w-xs mt-2 mb-6">
                  Add "Tier 1" accounts in Territory or manually add targets here to populate your execution board.
                </p>
                <Button onClick={() => setIsAddingPlayAccount(true)}>
                  <Plus size={16} /> Add Target Account
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* PILLAR 3: HOLISTIC COACHING CORNER */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <Trophy size={16} className="text-amber-500" />
              Coach's Corner
            </h3>
            <button 
              onClick={handleRefreshCoaching}
              disabled={isUpdatingTrends}
              className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 disabled:opacity-50"
            >
              <RefreshCw size={12} className={isUpdatingTrends ? 'animate-spin' : ''} /> Refresh
            </button>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-auto min-h-[400px]">
            {sellerInfo.coachingTrends ? (
              <div className="flex-1 flex flex-col">
                {/* Summary Header */}
                <div className="bg-slate-900 p-6 text-white relative overflow-hidden shrink-0">
                  <div className="relative z-10">
                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Performance Summary</h4>
                    <p className="text-sm font-medium leading-relaxed opacity-90">
                      "{sellerInfo.coachingTrends.summary}"
                    </p>
                  </div>
                  <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/20 rounded-full -mr-16 -mt-16 blur-2xl"></div>
                </div>

                <div className="p-6 space-y-6 flex-1 bg-slate-50/30">
                  {/* Core Strengths & Weaknesses */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-emerald-50 border border-emerald-100 p-3 rounded-xl">
                      <div className="flex items-center gap-2 text-emerald-700 mb-1">
                        <TrendingUp size={14} />
                        <span className="text-[10px] font-black uppercase">Top Strength</span>
                      </div>
                      <p className="text-xs font-bold text-slate-800">{sellerInfo.coachingTrends.topStrength}</p>
                    </div>
                    <div className="bg-rose-50 border border-rose-100 p-3 rounded-xl">
                      <div className="flex items-center gap-2 text-rose-700 mb-1">
                        <AlertTriangle size={14} />
                        <span className="text-[10px] font-black uppercase">Top Weakness</span>
                      </div>
                      <p className="text-xs font-bold text-slate-800">{sellerInfo.coachingTrends.topWeakness}</p>
                    </div>
                  </div>

                  {/* Trajectory */}
                  <div className="space-y-4">
                    <div>
                      <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                        <TrendingUp size={12} className="text-indigo-500" /> Improving Trends
                      </h5>
                      <ul className="space-y-2">
                        {(sellerInfo.coachingTrends.improvingAreas || []).map((area, i) => (
                          <li key={i} className="text-xs font-medium text-slate-600 bg-white border border-slate-100 px-3 py-2 rounded-lg shadow-sm flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span> {area}
                          </li>
                        ))}
                        {(!sellerInfo.coachingTrends.improvingAreas || sellerInfo.coachingTrends.improvingAreas.length === 0) && (
                          <li className="text-xs text-slate-400 italic">No clear upward trends yet.</li>
                        )}
                      </ul>
                    </div>

                    <div>
                      <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                        <TrendingDown size={12} className="text-amber-500" /> Declining Trends
                      </h5>
                      <ul className="space-y-2">
                        {(sellerInfo.coachingTrends.decliningAreas || []).map((area, i) => (
                          <li key={i} className="text-xs font-medium text-slate-600 bg-white border border-slate-100 px-3 py-2 rounded-lg shadow-sm flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span> {area}
                          </li>
                        ))}
                        {(!sellerInfo.coachingTrends.decliningAreas || sellerInfo.coachingTrends.decliningAreas.length === 0) && (
                          <li className="text-xs text-slate-400 italic">No declining areas detected.</li>
                        )}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center p-8 bg-slate-50">
                <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mb-6 text-amber-400 shadow-sm border border-slate-100">
                  <Trophy size={32} />
                </div>
                <h3 className="text-lg font-bold text-slate-800">Holistic Analysis</h3>
                <p className="text-slate-500 text-sm mt-2 mb-6 leading-relaxed">
                  Evaluate at least 3 calls in the Coaching Tab to unlock portfolio-wide performance trends.
                </p>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Add Account Modal for Plays */}
      <Modal isOpen={isAddingPlayAccount} onClose={() => setIsAddingPlayAccount(false)} title="Add Target for Sales Plays">
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Select an account to add to your Sales Play dashboard. If plays exist, they will appear immediately. If not, go to the account to generate them.
          </p>
          <div className="max-h-[300px] overflow-y-auto space-y-2 pr-1">
            {availableAccountsForPlays.map(acc => (
              <button
                key={acc.id}
                onClick={() => handleAddManualAccount(acc.id)}
                className="w-full flex items-center justify-between p-3 bg-white border border-slate-200 rounded-xl hover:border-indigo-500 hover:shadow-md transition-all text-left group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-slate-100 text-slate-500 rounded-lg flex items-center justify-center group-hover:bg-indigo-100 group-hover:text-indigo-600">
                    <Building2 size={16} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800">{acc.name}</p>
                    <p className="text-[10px] text-slate-400 uppercase">{acc.relationshipStatus}</p>
                  </div>
                </div>
                {Array.isArray(acc.salesPlays) && acc.salesPlays.length > 0 && (
                  <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded">
                    {acc.salesPlays.length} Plays Ready
                  </span>
                )}
              </button>
            ))}
            {availableAccountsForPlays.length === 0 && (
              <p className="text-center text-slate-400 text-xs italic py-4">
                No other accounts available to add.
              </p>
            )}
          </div>
        </div>
      </Modal>

      {/* Play Details Modal */}
      {selectedPlay && (
        <Modal 
          isOpen={!!selectedPlay} 
          onClose={() => setSelectedPlay(null)} 
          title={selectedPlay.title}
          maxWidth="max-w-4xl"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-full">
            
            {/* Left Column: Metadata */}
            <div className="space-y-6">
              <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 flex flex-col gap-3">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">Target Account</p>
                    <p className="text-lg font-bold text-indigo-900">{selectedPlay.accountName}</p>
                  </div>
                  <Button 
                    onClick={() => onSelectAccount(selectedPlay.accountId, { initialTab: 'strategy', initialSubTab: 'plays' })}
                    className="text-xs h-8 whitespace-nowrap"
                  >
                    Open Account <ArrowRight size={12} />
                  </Button>
                </div>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Objective</p>
                    <p className="text-sm font-medium text-slate-700 leading-snug">{selectedPlay.objective}</p>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Target Role</p>
                    <p className="text-sm font-medium text-slate-700 leading-snug">{selectedPlay.target}</p>
                  </div>
                </div>
                <div className="bg-amber-50 p-3 rounded-xl border border-amber-100">
                  <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-1">Hook</p>
                  <p className="text-sm font-medium text-amber-900 italic">"{selectedPlay.hook}"</p>
                </div>
              </div>
            </div>

            {/* Right Column: Script */}
            <div className="flex flex-col h-full">
              <div className="flex-1 bg-slate-50 border border-slate-200 rounded-xl p-4 relative flex flex-col">
                <div className="flex justify-between items-center mb-2">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Script / Message</p>
                  <button 
                    onClick={() => { navigator.clipboard.writeText(selectedPlay.script); }}
                    className="flex items-center gap-1 text-[10px] font-bold text-indigo-600 hover:text-indigo-800 transition-colors"
                  >
                    <Copy size={12} /> Copy to Clipboard
                  </button>
                </div>
                
                <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 bg-white rounded-lg border border-slate-100 p-3 shadow-inner">
                  <p className="font-mono text-sm text-slate-600 whitespace-pre-wrap leading-relaxed">
                    {selectedPlay.script}
                  </p>
                </div>
              </div>
              
              <div className="flex justify-end pt-4">
                <Button variant="outline" onClick={() => setSelectedPlay(null)}>Close</Button>
              </div>
            </div>

          </div>
        </Modal>
      )}

      {/* Pulse Details Modal */}
      {selectedPulseAccount && (
        <Modal 
          isOpen={!!selectedPulseAccount} 
          onClose={() => setSelectedPulseAccount(null)} 
          title={`Deal Pulse: ${selectedPulseAccount.name}`}
          maxWidth="max-w-2xl"
        >
          <div className="space-y-6">
             {/* Header Stats */}
             <div className="flex gap-4">
                <div className="flex-1 bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Deal Value</p>
                    <p className="text-lg font-black text-slate-800">{selectedPulseAccount.deal?.amount || '-'}</p>
                </div>
                <div className="flex-1 bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Stage</p>
                    <p className="text-lg font-black text-slate-800">{selectedPulseAccount.deal?.stage || '-'}</p>
                </div>
                <div className="flex-1 bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Probability</p>
                    <p className={`text-lg font-black ${
                        (selectedPulseAccount.deal?.probability || 0) >= 70 ? 'text-emerald-600' : 
                        (selectedPulseAccount.deal?.probability || 0) >= 40 ? 'text-amber-600' : 'text-rose-600'
                    }`}>
                        {selectedPulseAccount.deal?.probability || 0}%
                    </p>
                </div>
             </div>

             {/* Full Text Content */}
             <div className="space-y-4">
                <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100">
                    <h4 className="text-sm font-bold text-indigo-900 mb-2 flex items-center gap-2">
                        <Zap size={16} /> Executive Pulse
                    </h4>
                    <p className="text-sm text-indigo-800 leading-relaxed">
                        {selectedPulseAccount.aiSummary?.text || "No pulse generated."}
                    </p>
                    {selectedPulseAccount.aiSummary && (
                        <p className="text-[10px] text-indigo-400 mt-2 font-bold uppercase">
                            Updated: {new Date(selectedPulseAccount.aiSummary.lastUpdated).toLocaleDateString()}
                        </p>
                    )}
                </div>

                {selectedPulseAccount.deal?.probabilityRationale && (
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                        <h4 className="text-sm font-bold text-slate-800 mb-2 flex items-center gap-2">
                            <BrainCircuit size={16} /> AI Probability Rationale
                        </h4>
                        <p className="text-sm text-slate-600 leading-relaxed">
                            {selectedPulseAccount.deal.probabilityRationale}
                        </p>
                    </div>
                )}
             </div>

             {/* Footer Actions */}
             <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <Button variant="outline" onClick={() => setSelectedPulseAccount(null)}>Close</Button>
                <Button onClick={() => {
                    onSelectAccount(selectedPulseAccount.id, { initialTab: 'deal' });
                    setSelectedPulseAccount(null);
                }}>
                    Open Deal Manager <ArrowRight size={16} />
                </Button>
             </div>
          </div>
        </Modal>
      )}

    </div>
  );
};

export default Dashboard;
