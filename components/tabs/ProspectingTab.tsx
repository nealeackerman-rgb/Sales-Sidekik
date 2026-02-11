import React, { useState, useEffect } from 'react';
import { 
  Mail, 
  Linkedin, 
  Sparkles, 
  Loader2, 
  Save, 
  CheckCircle, 
  Search, 
  ExternalLink,
  History,
  Copy,
  ChevronRight,
  UserPlus,
  Users,
  PenLine,
  X
} from 'lucide-react';
import { Account, SellerInfo, Frameworks, FrameworkCategory, ProspectTarget } from '../../types';
import { geminiService, getFamilyContext } from '../../services/geminiService';
import { Button } from '../common/Button';
import { Textarea } from '../common/Textarea';
import { FormattedOutput } from '../common/FormattedOutput';

interface ProspectingTabProps {
  account: Account;
  sellerInfo: SellerInfo;
  frameworks: Frameworks;
  onUpdateAccount: (updatedAccount: Account) => void;
  allAccounts?: Account[];
}

const ProspectingTab: React.FC<ProspectingTabProps> = ({ 
  account, 
  sellerInfo, 
  frameworks, 
  onUpdateAccount,
  allAccounts = []
}) => {
  const [activeMode, setActiveMode] = useState<'compose' | 'finder'>('compose');
  
  // Compose State
  const [msgType, setMsgType] = useState<'Email' | 'LinkedIn'>('Email');
  const [prospectInfo, setProspectInfo] = useState('');
  const [currentMessage, setCurrentMessage] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [sources, setSources] = useState<{ title: string; uri: string }[]>([]);

  // Finder State
  const [isFinding, setIsFinding] = useState(false);
  const [customSearchQuery, setCustomSearchQuery] = useState('');

  // Use persisted prospects from account
  const foundProspects = account.prospects || [];

  const handleGenerateMessage = async (customContext?: string, forceType?: 'Email' | 'LinkedIn') => {
    const contextToUse = customContext || prospectInfo;
    const typeToUse = forceType || msgType;

    if (!contextToUse.trim()) {
      alert("Please provide some info about the prospect.");
      return;
    }

    setIsGenerating(true);
    setSources([]);

    try {
      const category = typeToUse === 'Email' 
        ? FrameworkCategory.PROSPECTING_EMAIL 
        : FrameworkCategory.PROSPECTING_LINKEDIN;
      
      const framework = frameworks[category] || '';
      const familyContext = getFamilyContext(account, allAccounts);
      
      const result = await geminiService.generateProspectingMessage(
        typeToUse,
        contextToUse,
        account,
        sellerInfo,
        framework,
        familyContext
      );
      
      setCurrentMessage(result.text);
      if (result.groundingUrls) setSources(result.groundingUrls);
      
      setMsgType(typeToUse);

    } catch (error) {
      alert("Failed to draft message.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveToHistory = () => {
    if (!currentMessage.trim()) return;
    setSaveStatus('saving');
    
    const newMsg = {
      type: msgType,
      content: currentMessage,
      date: new Date().toISOString()
    };

    const updated = {
      ...account,
      prospectingMessages: [newMsg, ...(account.prospectingMessages || [])]
    };

    onUpdateAccount(updated);
    setTimeout(() => {
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    }, 500);
  };

  const handleFindProspects = async (useCustom = false) => {
    if (useCustom && !customSearchQuery.trim()) return;

    setIsFinding(true);
    try {
      const targets = await geminiService.findProspects(account, sellerInfo, useCustom ? customSearchQuery : undefined);
      
      // Deduplicate by name before merging
      const existingNames = new Set(foundProspects.map((p: ProspectTarget) => p.name.toLowerCase()));
      const uniqueNew = targets.filter((p: any) => !existingNames.has(p.name.toLowerCase()));

      const updatedProspects = [...foundProspects, ...uniqueNew];
      onUpdateAccount({ ...account, prospects: updatedProspects });
      
      if (uniqueNew.length === 0) {
        alert("Scan complete. No new unique prospects found.");
      }
      
      if (useCustom) setCustomSearchQuery('');

    } catch (error) {
      alert("Could not find prospects. Please try again.");
    } finally {
      setIsFinding(false);
    }
  };

  const handleDeleteProspect = (id: string) => {
    if (!confirm("Remove this prospect from the list?")) return;
    const updated = foundProspects.filter((p: ProspectTarget) => p.id !== id);
    onUpdateAccount({ ...account, prospects: updated });
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(currentMessage);
    alert("Copied to clipboard!");
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
      
      {/* LEFT COLUMN: Controls & Inputs */}
      <div className="lg:col-span-2 space-y-6">
        
        {/* Toggle Header */}
        <div className="bg-slate-100 p-1 rounded-xl flex gap-1 border border-slate-200">
          <button
            onClick={() => setActiveMode('compose')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all ${
              activeMode === 'compose' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <PenLine size={14} /> Manual Compose
          </button>
          <button
            onClick={() => setActiveMode('finder')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all ${
              activeMode === 'finder' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Users size={14} /> Find IDP's
          </button>
        </div>

        {activeMode === 'compose' && (
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4 animate-in slide-in-from-left-2 duration-300">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-bold text-slate-800">Draft Message</h3>
              <div className="flex bg-slate-100 p-1 rounded-lg gap-1">
                <button
                  onClick={() => setMsgType('Email')}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all ${
                    msgType === 'Email' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  <Mail size={12} /> Email
                </button>
                <button
                  onClick={() => setMsgType('LinkedIn')}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all ${
                    msgType === 'LinkedIn' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  <Linkedin size={12} /> LinkedIn
                </button>
              </div>
            </div>

            <Textarea 
              label="Prospect Context"
              placeholder="Who is this for? Any recent posts or info you noticed? (e.g. 'Jane Doe, Head of Eng. They just hired 10 devs.')"
              rows={5}
              value={prospectInfo}
              onChange={(e) => setProspectInfo(e.target.value)}
            />

            <Button 
              className="w-full" 
              onClick={() => handleGenerateMessage()} 
              disabled={isGenerating || !prospectInfo.trim()}
            >
              {isGenerating ? <Loader2 className="animate-spin" size={18} /> : <Sparkles size={18} />}
              Draft with Sidekik
            </Button>

            <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-xl text-[10px] text-indigo-700 font-medium">
              Sidekik will search for recent news about {account.name} to add relevance to your draft.
            </div>
          </div>
        )}

        {activeMode === 'finder' && (
          <div className="space-y-4 animate-in slide-in-from-left-2 duration-300">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <div className="text-center mb-4">
                <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Search size={20} />
                </div>
                <h3 className="font-bold text-slate-800">Find Ideal Prospects</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Scan for people matching your ICP or run a custom search.
                </p>
              </div>

              <div className="space-y-3">
                <Button onClick={() => handleFindProspects(false)} disabled={isFinding} className="w-full">
                  {isFinding ? <Loader2 className="animate-spin" size={16} /> : <Sparkles size={16} />}
                  {isFinding ? 'Scanning...' : 'Auto-Scan for ICP Matches'}
                </Button>
                
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-100"></div>
                  </div>
                  <div className="relative flex justify-center text-[10px] uppercase">
                    <span className="bg-white px-2 text-slate-400 font-bold tracking-widest">Or Search Custom</span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <input 
                    type="text"
                    placeholder="e.g. Find titles interested in customer experience"
                    className="flex-1 text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
                    value={customSearchQuery}
                    onChange={(e) => setCustomSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleFindProspects(true)}
                  />
                  <button 
                    onClick={() => handleFindProspects(true)}
                    disabled={isFinding || !customSearchQuery.trim()}
                    className="bg-indigo-50 text-indigo-600 p-2 rounded-lg hover:bg-indigo-100 disabled:opacity-50"
                  >
                    <Search size={16} />
                  </button>
                </div>
              </div>
            </div>

            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1 custom-scrollbar">
              {foundProspects.map((p, i) => (
                <div key={p.id || i} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:border-indigo-300 transition-colors group relative">
                  {/* Delete Button */}
                  <button 
                    onClick={() => handleDeleteProspect(p.id)}
                    className="absolute top-2 right-2 text-slate-300 hover:text-rose-500 p-1 rounded-full hover:bg-rose-50 opacity-0 group-hover:opacity-100 transition-all"
                    title="Remove prospect"
                  >
                    <X size={14} />
                  </button>

                  <div className="flex justify-between items-start mb-2 pr-6">
                    <div>
                      <h4 className="font-bold text-sm text-slate-800">{p.name}</h4>
                      <p className="text-xs text-slate-500 font-medium">{p.title}</p>
                    </div>
                    {p.linkedin && (
                      <a href={p.linkedin} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 bg-blue-50 p-1.5 rounded-lg">
                        <Linkedin size={14} />
                      </a>
                    )}
                  </div>
                  
                  {p.context && (
                    <p className="text-[10px] text-slate-500 italic mb-3 border-l-2 border-indigo-100 pl-2 line-clamp-3">
                      {p.context}
                    </p>
                  )}
                  
                  {p.addedBy && (
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider mb-3 inline-block ${
                      p.addedBy === 'Signal' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'
                    }`}>
                      via {p.addedBy}
                    </span>
                  )}

                  <div className="flex gap-2">
                    <button 
                      onClick={() => handleGenerateMessage(`Draft email for ${p.name}, ${p.title}. Context: ${p.context}`, 'Email')}
                      className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-slate-50 hover:bg-indigo-50 text-slate-600 hover:text-indigo-600 rounded-lg text-[10px] font-bold transition-colors border border-slate-200 hover:border-indigo-200"
                    >
                      <Mail size={12} /> Draft Email
                    </button>
                    <button 
                      onClick={() => handleGenerateMessage(`Draft LinkedIn message for ${p.name}, ${p.title}. Context: ${p.context}`, 'LinkedIn')}
                      className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-slate-50 hover:bg-blue-50 text-slate-600 hover:text-blue-600 rounded-lg text-[10px] font-bold transition-colors border border-slate-200 hover:border-blue-200"
                    >
                      <Linkedin size={12} /> Draft DM
                    </button>
                  </div>
                </div>
              ))}
              
              {!isFinding && foundProspects.length === 0 && (
                <div className="text-center py-8 text-slate-400 text-xs italic">
                  No prospects found yet. Start a scan.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Previous Drafts History (Visible in both modes) */}
        <div className="space-y-4 pt-4 border-t border-slate-200">
          <h3 className="font-bold text-slate-800 flex items-center gap-2 px-2">
            <History size={18} className="text-slate-400" />
            Previous Drafts
          </h3>
          <div className="space-y-3">
            {account.prospectingMessages?.length ? (
              account.prospectingMessages.slice(0, 5).map((msg, i) => (
                <div key={i} className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm hover:bg-slate-50 transition-colors">
                  <div className="flex justify-between items-start mb-1">
                    <div className="flex items-center gap-2">
                      {msg.type === 'Email' ? <Mail size={12} className="text-indigo-600" /> : <Linkedin size={12} className="text-blue-600" />}
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{new Date(msg.date).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-600 line-clamp-2 italic mb-2">"{msg.content}"</p>
                  <button 
                    onClick={() => {
                        setCurrentMessage(msg.content);
                        setMsgType(msg.type);
                        setActiveMode('compose'); // Switch to compose to see it
                    }}
                    className="text-[10px] font-bold text-indigo-600 hover:underline flex items-center gap-1"
                  >
                    Restore <ChevronRight size={10} />
                  </button>
                </div>
              ))
            ) : (
              <div className="text-center py-4 text-slate-400 italic text-xs">No drafts saved yet.</div>
            )}
          </div>
        </div>
      </div>

      {/* RIGHT COLUMN: The Editor */}
      <div className="lg:col-span-3 space-y-6">
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm min-h-[600px] flex flex-col relative overflow-hidden">
          {isGenerating && (
            <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-20 flex flex-col items-center justify-center text-center p-8">
              <Loader2 className="animate-spin text-indigo-600 mb-4" size={32} />
              <h4 className="text-lg font-bold text-slate-800">Drafting Response</h4>
              <p className="text-slate-500 text-sm max-w-xs mt-2">Applying your custom prospecting framework and finding trigger events...</p>
            </div>
          )}

          <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
               <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Editor</span>
               <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                   msgType === 'Email' ? 'bg-indigo-100 text-indigo-700' : 'bg-blue-100 text-blue-700'
               }`}>
                   {msgType} Mode
               </span>
            </div>
            
            <div className="flex gap-2">
              <button 
                onClick={copyToClipboard}
                disabled={!currentMessage}
                className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-white rounded-lg transition-all"
                title="Copy to clipboard"
              >
                <Copy size={16} />
              </button>
              <button 
                onClick={handleSaveToHistory}
                disabled={!currentMessage || saveStatus === 'saving'}
                className="flex items-center gap-1.5 px-3 py-1 bg-white border border-slate-200 text-slate-700 rounded-lg text-xs font-bold hover:bg-slate-50 transition-all"
              >
                {saveStatus === 'saved' ? <CheckCircle size={14} className="text-emerald-500" /> : <Save size={14} />}
                {saveStatus === 'saving' ? 'Saving...' : 'Save Draft'}
              </button>
            </div>
          </div>

          <textarea 
            className="flex-1 w-full p-8 md:p-12 text-slate-700 leading-relaxed outline-none resize-none font-sans text-sm"
            value={currentMessage}
            onChange={(e) => setCurrentMessage(e.target.value)}
            placeholder={activeMode === 'finder' 
                ? "Select a prospect on the left and click 'Draft Email' or 'Draft DM' to generate content here..."
                : "Generated draft will appear here..."
            }
          />
        </div>

        {sources.length > 0 && (
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h4 className="text-sm font-black text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Search size={16} className="text-indigo-600" /> Potential Trigger Events Found
            </h4>
            <ul className="space-y-3">
              {sources.map((source, i) => (
                <li key={i}>
                  <a href={source.uri} target="_blank" rel="noopener noreferrer" className="flex items-start gap-3 p-2 rounded-lg hover:bg-indigo-50 transition-colors border border-transparent hover:border-indigo-100">
                    <div className="shrink-0 mt-1 p-1 bg-slate-100 text-slate-400 rounded"><ExternalLink size={10} /></div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-700 truncate">{source.title}</p>
                      <p className="text-[10px] text-slate-400 truncate font-mono">{new URL(source.uri).hostname}</p>
                    </div>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProspectingTab;