
import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  Loader2, 
  Edit3, 
  Eye, 
  Save, 
  CheckCircle, 
  Search, 
  ExternalLink, 
  Wand2,
  CalendarCheck2,
  Download,
  Target,
  User
} from 'lucide-react';
import { Account, SellerInfo, Frameworks, MeetingType, DocData } from '../../types';
import { geminiService, getFamilyContext } from '../../services/geminiService';
import { generateWordDoc } from '../../services/fileGenerationService';
import { Button } from '../common/Button';
import { Textarea } from '../common/Textarea';
import { FormattedOutput } from '../common/FormattedOutput';
import { RefineWithAIModal } from '../modals/RefineWithAIModal';

interface MeetingPrepTabProps {
  account: Account;
  sellerInfo: SellerInfo;
  frameworks: Frameworks;
  onUpdateAccount: (updatedAccount: Account) => void;
  allAccounts?: Account[]; 
  initialInstruction?: string;
}

const MeetingPrepTab: React.FC<MeetingPrepTabProps> = ({ 
  account, 
  sellerInfo, 
  frameworks, 
  onUpdateAccount,
  allAccounts = [],
  initialInstruction
}) => {
  // State for Inputs
  const [meetingGoal, setMeetingGoal] = useState(account.meetingPrep?.contextInput || initialInstruction || '');
  const [linkedinContext, setLinkedinContext] = useState(account.discoveryLinkedInContext || '');
  
  // State for Output
  const [prepGuide, setPrepGuide] = useState(account.meetingPrep?.content || '');
  
  const [isLoading, setIsLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(!prepGuide);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [sources, setSources] = useState<{ title: string; uri: string }[]>([]);
  const [isRefineModalOpen, setIsRefineModalOpen] = useState(false);

  useEffect(() => {
    if (account.meetingPrep) {
      // If we have saved prep, load it
      if (!meetingGoal) setMeetingGoal(account.meetingPrep.contextInput || '');
      setPrepGuide(account.meetingPrep.content);
      if (account.meetingPrep.content) setIsEditing(false);
    }
    // Also check legacy field for LinkedIn context if not already set
    if (!linkedinContext && account.discoveryLinkedInContext) {
      setLinkedinContext(account.discoveryLinkedInContext);
    }
  }, [account.id]);

  const handleGenerate = async () => {
    if (!meetingGoal.trim()) {
      alert("Please describe the goal of the meeting.");
      return;
    }

    setIsLoading(true);
    setSources([]);
    try {
      const familyContext = getFamilyContext(account, allAccounts);
      
      // We pass ALL frameworks now, letting AI decide which one fits the goal
      const result = await geminiService.generateMeetingPrep(
        meetingGoal,
        linkedinContext,
        account,
        frameworks,
        familyContext
      );

      setPrepGuide(result.text);
      if (result.groundingUrls) setSources(result.groundingUrls);
      setIsEditing(false);
      handleSave(result.text);
    } catch (error) {
      console.error(error);
      alert("AI Meeting Prep failed.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = (contentToSave?: string) => {
    const content = contentToSave ?? prepGuide;
    setSaveStatus('saving');
    
    // We update both the meeting prep object and the legacy field for linkedin context
    onUpdateAccount({ 
      ...account, 
      discoveryLinkedInContext: linkedinContext,
      meetingPrep: { 
        type: 'Discovery', // Defaulting type for schema compatibility, though logic is now dynamic
        content: content, 
        contextInput: meetingGoal, 
        lastUpdated: new Date().toISOString() 
      } 
    });

    setTimeout(() => {
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    }, 500);
  };

  const handleDownload = async () => {
    if (!prepGuide) return;
    const docData: DocData = { title: `Meeting Strategy - ${account.name}`, sections: [{ header: 'Strategic Guide', content: prepGuide }] };
    try { await generateWordDoc(`${account.name}_Prep`, docData); } catch (e) { alert("Download failed."); }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
              <CalendarCheck2 size={20} />
            </div>
            <div>
              <h3 className="font-bold text-slate-800">Meeting Strategy Engine</h3>
              <p className="text-xs text-slate-500">Intelligent Methodology Selection</p>
            </div>
          </div>
          
          <div className="flex gap-2">
            {prepGuide && !isEditing && (
              <Button variant="outline" onClick={handleDownload}><Download size={16} /> Doc</Button>
            )}

            <Button variant="outline" onClick={() => setIsEditing(!isEditing)}>
              {isEditing ? <Eye size={16} /> : <Edit3 size={16} />}
              {isEditing ? 'View Guide' : 'Edit Inputs'}
            </Button>

            {prepGuide && !isEditing && (
              <Button variant="outline" onClick={() => setIsRefineModalOpen(true)}><Wand2 size={16} /> Refine</Button>
            )}

            {isEditing && (
              <Button variant="outline" onClick={() => handleSave()} disabled={saveStatus === 'saving' || !prepGuide}>
                {saveStatus === 'saved' ? <CheckCircle size={16} className="text-emerald-500" /> : <Save size={16} />}
                {saveStatus === 'saving' ? 'Saving...' : 'Save'}
              </Button>
            )}
            
            <Button onClick={handleGenerate} disabled={isLoading}>
              {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
              {prepGuide ? 'Regenerate Strategy' : 'Generate Strategy'}
            </Button>
          </div>
        </div>

        {isEditing && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2 border-t border-slate-100 animate-in slide-in-from-top-2 duration-200">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-indigo-600 uppercase tracking-widest flex items-center gap-2">
                <Target size={12} /> Meeting Goal & Context
              </label>
              <Textarea 
                placeholder="e.g. 'Discovery with the CIO. They are concerned about security. I need to pivot to value.' OR 'Negotiating the final contract terms.'"
                rows={6}
                value={meetingGoal}
                onChange={(e) => setMeetingGoal(e.target.value)}
                className="bg-indigo-50/30 focus:bg-white"
              />
              <p className="text-[10px] text-slate-400">
                Sidekik will act as your elite sales assistant, matching this goal to your frameworks.
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-blue-600 uppercase tracking-widest flex items-center gap-2">
                <User size={12} /> Stakeholder Bio / LinkedIn
              </label>
              <Textarea 
                placeholder="Paste their LinkedIn 'About' section, recent posts, or your notes on their personality..."
                rows={6}
                value={linkedinContext}
                onChange={(e) => setLinkedinContext(e.target.value)}
                className="bg-blue-50/30 focus:bg-white"
              />
              <p className="text-[10px] text-slate-400">
                Used for Persona Analysis and tailored communication tips.
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm min-h-[600px] relative overflow-hidden flex flex-col">
            {isLoading && (
              <div className="absolute inset-0 bg-white/90 backdrop-blur-sm z-20 flex flex-col items-center justify-center text-center p-8">
                <Loader2 className="animate-spin text-indigo-600 mb-4" size={32} />
                <h4 className="text-lg font-bold text-slate-800">Architecting Strategic Plan</h4>
                <div className="space-y-2 mt-4 text-sm text-slate-500">
                  <p>1. Aligning Methodology (Priority #1)...</p>
                  <p>2. Integrating Market Signals & Logs...</p>
                  <p>3. Profiling Stakeholder Persona...</p>
                </div>
              </div>
            )}
            
            <div className="p-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sidekik Strategic Outline</span>
              {prepGuide && !isEditing && !isLoading && (
                 <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded">
                   Framework Aligned
                 </span>
              )}
            </div>

            {isEditing ? (
              <textarea
                className="w-full flex-1 p-8 md:p-12 text-slate-700 leading-relaxed outline-none resize-none font-mono text-sm bg-transparent"
                value={prepGuide}
                onChange={(e) => setPrepGuide(e.target.value)}
                placeholder="Your generated strategy will appear here..."
              />
            ) : (
              <div className="flex-1 p-8 md:p-12 overflow-y-auto">
                {prepGuide ? <FormattedOutput content={prepGuide} /> : <div className="text-center py-24 text-slate-400 italic">Enter your goal and bio above to generate a strategy.</div>}
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h4 className="text-sm font-black text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Search size={16} className="text-indigo-600" /> Grounding Evidence
            </h4>
            {sources.length > 0 ? (
              <ul className="space-y-3">
                {sources.map((s, i) => (
                  <li key={i}>
                    <a href={s.uri} target="_blank" rel="noopener noreferrer" className="flex items-start gap-3 p-2 rounded-lg hover:bg-indigo-50 transition-all">
                      <div className="shrink-0 mt-1 text-slate-400"><ExternalLink size={10} /></div>
                      <p className="text-xs font-bold text-slate-700 truncate">{s.title}</p>
                    </a>
                  </li>
                ))}
              </ul>
            ) : <p className="text-xs text-slate-400 italic">Historical evidence from logs and recent signals will be used.</p>}
          </div>
        </div>
      </div>

      <RefineWithAIModal
        isOpen={isRefineModalOpen}
        onClose={() => setIsRefineModalOpen(false)}
        currentContent={prepGuide}
        contextTitle={`Meeting Prep for ${account.name}`}
        onRefined={(newText) => {
          setPrepGuide(newText);
          handleSave(newText);
        }}
      />
    </div>
  );
};

export default MeetingPrepTab;
