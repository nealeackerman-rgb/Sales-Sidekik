import React, { useState, useEffect } from 'react';
import { 
  Linkedin, 
  Sparkles, 
  Loader2, 
  Edit3, 
  Eye, 
  Save, 
  CheckCircle, 
  Search, 
  ExternalLink, 
  Info, 
  RotateCcw,
  Wand2,
  BookOpen
} from 'lucide-react';
import { Account, SellerInfo, Frameworks, FrameworkCategory } from '../../types';
import { geminiService } from '../../services/geminiService';
import { Button } from '../common/Button';
import { Textarea } from '../common/Textarea';
import { FormattedOutput } from '../common/FormattedOutput';
import { RefineWithAIModal } from '../modals/RefineWithAIModal';

interface DiscoveryPrepTabProps {
  account: Account;
  sellerInfo: SellerInfo;
  frameworks: Frameworks;
  onUpdateAccount: (updatedAccount: Account) => void;
}

const DiscoveryPrepTab: React.FC<DiscoveryPrepTabProps> = ({ 
  account, 
  sellerInfo, 
  frameworks, 
  onUpdateAccount 
}) => {
  const [linkedinInput, setLinkedinInput] = useState('');
  const [prepGuide, setPrepGuide] = useState(account.discoveryPrep || '');
  const [isLoading, setIsLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(!account.discoveryPrep);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [sources, setSources] = useState<{ title: string; uri: string }[]>([]);
  const [isRefineModalOpen, setIsRefineModalOpen] = useState(false);

  useEffect(() => {
    setPrepGuide(account.discoveryPrep || '');
    if (!account.discoveryPrep) setIsEditing(true);
  }, [account.id, account.discoveryPrep]);

  const handleGenerate = async () => {
    if (!linkedinInput.trim() && !prepGuide) {
      alert("Please paste some prospect context (LinkedIn/Bio) first.");
      return;
    }

    setIsLoading(true);
    setSources([]);

    try {
      const framework = frameworks[FrameworkCategory.DISCOVERY] || '';
      const result = await geminiService.generateDiscoveryPrep(
        "Discovery",
        linkedinInput || "Analyzing existing context...", 
        account, 
        framework
      );
      
      setPrepGuide(result.text);
      if (result.groundingUrls) setSources(result.groundingUrls);
      setIsEditing(false);
      handleSave(result.text);
    } catch (error) {
      console.error(error);
      alert("AI Prep Generation failed. Check your API key and try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = (contentToSave?: string) => {
    const content = contentToSave ?? prepGuide;
    setSaveStatus('saving');
    onUpdateAccount({ ...account, discoveryPrep: content });
    setTimeout(() => {
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    }, 500);
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      {/* Configuration Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
              <Linkedin size={20} />
            </div>
            <div>
              <h3 className="font-bold text-slate-800">Adaptive Discovery Prep</h3>
              <p className="text-xs text-slate-500">Grounded in your custom methodology</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setIsEditing(!isEditing)}>
              {isEditing ? <Eye size={16} /> : <Edit3 size={16} />}
              {isEditing ? 'View Guide' : 'Edit Guide'}
            </Button>
            <Button variant="outline" onClick={() => handleSave()} disabled={saveStatus === 'saving' || !prepGuide}>
              {saveStatus === 'saved' ? <CheckCircle size={16} className="text-emerald-500" /> : <Save size={16} />}
              {saveStatus === 'saving' ? 'Saving...' : 'Save'}
            </Button>
            <Button onClick={handleGenerate} disabled={isLoading || (!linkedinInput && !prepGuide)}>
              {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
              {prepGuide ? 'Refresh Guide' : 'Generate Guide'}
            </Button>
          </div>
        </div>

        {(isEditing || !prepGuide) && (
          <div className="space-y-3 animate-in slide-in-from-top-1 duration-200">
            <div className="flex items-center justify-between px-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Prospect LinkedIn / Bio / Context</label>
              <div className="flex items-center gap-1 text-[10px] font-bold text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded">
                <BookOpen size={10} /> Framework: {FrameworkCategory.DISCOVERY}
              </div>
            </div>
            <Textarea 
              placeholder="Paste LinkedIn Profile 'About' section, recent posts, or Bio text here..."
              rows={5}
              value={linkedinInput}
              onChange={(e) => setLinkedinInput(e.target.value)}
              className="text-sm font-sans"
            />
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-3">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm min-h-[600px] relative overflow-hidden">
            {isLoading && (
              <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-20 flex flex-col items-center justify-center text-center p-8">
                <Loader2 className="animate-spin text-indigo-600 mb-4" size={32} />
                <h4 className="text-lg font-bold text-slate-800">Analyzing Methodology & Market</h4>
                <p className="text-slate-500 text-sm max-w-xs mt-2">
                  Sidekik is mapping LinkedIn insights to your custom {FrameworkCategory.DISCOVERY} framework...
                </p>
              </div>
            )}
            
            <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Discovery Playbook</span>
                {sources.length > 0 && <span className="bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded text-[10px] font-bold">Research Verified</span>}
              </div>
              {!isEditing && prepGuide && (
                <button 
                  onClick={() => setIsRefineModalOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1 bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold hover:bg-indigo-200 transition-all"
                >
                  <Wand2 size={14} /> Refine with AI
                </button>
              )}
            </div>

            {isEditing ? (
              <textarea
                className="w-full h-full min-h-[550px] p-8 md:p-12 text-slate-700 leading-relaxed outline-none resize-none font-mono text-sm bg-transparent"
                value={prepGuide}
                onChange={(e) => setPrepGuide(e.target.value)}
                placeholder="Your tailored discovery guide will appear here..."
              />
            ) : (
              <div className="p-8 md:p-12">
                {prepGuide ? (
                  <FormattedOutput content={prepGuide} />
                ) : (
                  <div className="flex flex-col items-center justify-center py-24 text-slate-400 text-center">
                    <Linkedin size={48} strokeWidth={1} className="mb-4 opacity-20" />
                    <p className="italic">Paste LinkedIn data above and click Generate to build a tailored guide.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar Info */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h4 className="text-sm font-black text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Search size={16} className="text-indigo-600" /> Research Grounding
            </h4>
            {sources.length > 0 ? (
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
            ) : (
              <p className="text-xs text-slate-400 italic leading-relaxed">
                When you generate, Sidekik scans for recent podcasts, news, and 10-Ks to populate your framework.
              </p>
            )}
          </div>

          <div className="bg-indigo-50 p-6 rounded-2xl border border-indigo-100">
            <div className="flex items-center gap-2 text-indigo-700 mb-2">
              <Info size={16} />
              <h4 className="text-xs font-bold uppercase tracking-widest">Pro Tip</h4>
            </div>
            <p className="text-xs text-indigo-600 leading-relaxed">
              Sidekik uses the specific structure you defined in <span className="font-bold">Settings &gt; Discovery</span>. Update your rulebook there to change the output style.
            </p>
          </div>
        </div>
      </div>

      <RefineWithAIModal
        isOpen={isRefineModalOpen}
        onClose={() => setIsRefineModalOpen(false)}
        currentContent={prepGuide}
        contextTitle={`Discovery Prep for ${account.name}`}
        onRefined={(newText) => {
          setPrepGuide(newText);
          handleSave(newText);
        }}
      />
    </div>
  );
};

export default DiscoveryPrepTab;