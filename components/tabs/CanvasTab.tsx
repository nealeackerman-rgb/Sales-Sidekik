
import React, { useState, useEffect, useRef } from 'react';
import { 
  FileText, 
  Sparkles, 
  Loader2, 
  ScanEye, 
  UploadCloud, 
  Check,
  Copy,
  PenTool,
  Palette,
  Layout,
  MessageSquare,
  AlertCircle,
  FileSearch,
  CheckCircle2,
  XCircle,
  Info,
  ArrowRight,
  RefreshCw,
  Zap,
  FileCheck,
  Plus,
  Wand2,
  Download
} from 'lucide-react';
import { Account, SellerInfo, CanvasMode, Frameworks, AuditType, AuditResult, FrameworkCategory, SlidePrescription, DeckStrategy, GeneratedContent } from '../../types';
import { geminiCanvas } from '../../services/geminiCanvas';
import { generateWordDoc } from '../../services/fileGenerationService';
import { Button } from '../common/Button';
import { FormattedOutput } from '../common/FormattedOutput';

interface CanvasTabProps {
  account: Account;
  sellerInfo: SellerInfo;
  frameworks: Frameworks;
  onUpdateAccount: (updatedAccount: Account) => void;
  allAccounts?: Account[];
  initialMode?: CanvasMode;
  initialInstruction?: string;
}

const RecipeCard: React.FC<{ slide: SlidePrescription }> = ({ slide }) => {
  const [copiedSection, setCopiedSection] = useState<number | null>(null);

  const handleCopy = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(idx);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'Keep': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'Modify': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'Discard': return 'bg-rose-100 text-rose-700 border-rose-200';
      case 'New': return 'bg-indigo-100 text-indigo-700 border-indigo-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all space-y-4">
      <div className="flex justify-between items-start border-b border-slate-100 pb-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Slide {slide.slideNumber}</span>
            <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider border ${getActionColor(slide.action)}`}>
              {slide.action}
            </span>
          </div>
          <h4 className="font-bold text-slate-800">{slide.title}</h4>
        </div>
      </div>

      <div className="space-y-3">
        <p className="text-xs text-slate-500 italic leading-relaxed"><span className="font-bold text-slate-700 not-italic">Strategy:</span> {slide.reasoning}</p>
        
        <div className="space-y-2">
          {slide.contentInstructions.map((inst, i) => (
            <div key={i} className="bg-slate-50 rounded-xl border border-slate-100 p-3 group relative">
              <div className="flex justify-between items-start mb-1">
                <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">{inst.targetSection}</span>
                <button 
                  onClick={() => handleCopy(inst.suggestedText, i)}
                  className="p-1 text-slate-400 hover:text-indigo-600 transition-colors"
                  title="Copy to clipboard"
                >
                  {copiedSection === i ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                </button>
              </div>
              <p className="text-xs text-slate-700 font-medium leading-relaxed pr-6">{inst.suggestedText}</p>
            </div>
          ))}
        </div>

        <div className="bg-indigo-600/5 border border-indigo-100 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
             <MessageSquare size={14} className="text-indigo-600" />
             <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Talk Track</span>
          </div>
          <p className="text-sm text-indigo-900 font-medium leading-relaxed italic">
            "{slide.talkTrack}"
          </p>
        </div>
      </div>
    </div>
  );
};

const CanvasTab: React.FC<CanvasTabProps> = ({ 
  account, 
  sellerInfo, 
  frameworks,
  allAccounts = [],
  initialMode,
  initialInstruction 
}) => {
  const [viewMode, setViewMode] = useState<'architect' | 'creator' | 'auditor'>('architect');
  
  // --- Architect State ---
  const [contextInput, setContextInput] = useState(initialInstruction || '');
  const [isGenerating, setIsGenerating] = useState(false);
  const [deckStrategy, setDeckStrategy] = useState<DeckStrategy | null>(null);
  const [deckFile, setDeckFile] = useState<{ name: string; data: string; mimeType: string } | null>(null);
  const architectFileInputRef = useRef<HTMLInputElement>(null);

  // --- Creator State ---
  const [creatorMode, setCreatorMode] = useState<'executive-summary' | 'proposal'>('executive-summary');
  const [creatorTopic, setCreatorTopic] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [generatedContent, setGeneratedContent] = useState<GeneratedContent | null>(null);

  // --- Auditor State ---
  const [auditType, setAuditType] = useState<AuditType>('slide');
  const [auditFile, setAuditFile] = useState<{ name: string; data: string; mimeType: string } | null>(null);
  const [auditText, setAuditText] = useState('');
  const [isAuditing, setIsAuditing] = useState(false);
  const [auditResult, setAuditResult] = useState<AuditResult | null>(null);
  const auditorFileInputRef = useRef<HTMLInputElement>(null);

  const handleDeckFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 4 * 1024 * 1024) { alert("File size too large (Max 4MB)"); return; }
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = (reader.result as string).split(',')[1];
        setDeckFile({ name: file.name, data: base64, mimeType: file.type });
        setDeckStrategy(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGeneratePrescription = async () => {
    if (!deckFile || !contextInput.trim()) {
      alert("Please upload your template and provide deck context.");
      return;
    }
    setIsGenerating(true);
    try {
      const strategy = await geminiCanvas.generateDeckPrescription(
        account,
        sellerInfo,
        frameworks,
        deckFile.data,
        deckFile.mimeType,
        allAccounts,
        contextInput
      );
      setDeckStrategy(strategy);
    } catch (error) {
      alert("Strategy generation failed.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateContent = async () => {
    if (!creatorTopic.trim()) return;
    setIsCreating(true);
    try {
      const content = await geminiCanvas.generateContentForFile(
        account,
        sellerInfo,
        frameworks,
        creatorMode,
        creatorTopic
      );
      setGeneratedContent(content);
    } catch (error) {
      alert("Creation failed.");
    } finally {
      setIsCreating(false);
    }
  };

  const handleAuditorFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = (reader.result as string).split(',')[1];
        setAuditFile({ name: file.name, data: base64, mimeType: file.type });
        setAuditText('');
        setAuditResult(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAudit = async () => {
    if (!auditFile && !auditText.trim()) return;
    setIsAuditing(true);
    try {
      const dataToAudit = auditFile ? auditFile.data : auditText;
      const mimeType = auditFile ? auditFile.mimeType : 'text/plain';
      const result = await geminiCanvas.auditFileContent(account, dataToAudit, mimeType, auditType, frameworks);
      setAuditResult(result);
    } catch (error) {
      alert("Audit failed.");
    } finally {
      setIsAuditing(false);
    }
  };

  return (
    <div className="h-[calc(100vh-220px)] flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      
      {/* Universal Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white ${viewMode === 'architect' ? 'bg-indigo-600' : viewMode === 'creator' ? 'bg-emerald-600' : 'bg-rose-600'}`}>
            {viewMode === 'architect' ? <PenTool size={20} /> : viewMode === 'creator' ? <Plus size={20} /> : <ScanEye size={20} />}
          </div>
          <div>
            <h2 className="font-black text-slate-800 text-lg">
              {viewMode === 'architect' ? 'Deck Architect' : viewMode === 'creator' ? 'Creative Studio' : 'Strategic Auditor'}
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              {viewMode === 'architect' ? 'Blueprint for existing templates' : viewMode === 'creator' ? 'Generate compliant documents' : 'Audit your content for deal compliance'}
            </p>
          </div>
        </div>

        <div className="flex p-1 bg-slate-100 rounded-xl border border-slate-200">
          <button
            onClick={() => setViewMode('architect')}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${
              viewMode === 'architect' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <PenTool size={16} /> Architect
          </button>
          <button
            onClick={() => setViewMode('creator')}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${
              viewMode === 'creator' ? 'bg-white shadow-sm text-emerald-600' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Plus size={16} /> Creator
          </button>
          <button
            onClick={() => setViewMode('auditor')}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${
              viewMode === 'auditor' ? 'bg-white shadow-sm text-rose-600' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <ScanEye size={16} /> Auditor
          </button>
        </div>
      </div>

      {viewMode === 'architect' ? (
        // --- DECK ARCHITECT INTERFACE ---
        <div className="flex-1 flex flex-col lg:flex-row gap-6 min-h-0">
          <div className="lg:w-1/3 flex flex-col bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden shrink-0">
            <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
               <UploadCloud size={16} className="text-indigo-600" />
               <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Blueprint Configuration</span>
            </div>
            
            <div className="p-6 flex-1 flex flex-col space-y-6 overflow-y-auto custom-scrollbar">
              <div 
                className="border-2 border-dashed border-slate-200 rounded-xl p-6 flex flex-col items-center justify-center text-center cursor-pointer hover:border-indigo-300 hover:bg-indigo-50 transition-all group"
                onClick={() => architectFileInputRef.current?.click()}
              >
                <div className="w-10 h-10 bg-slate-50 rounded-full flex items-center justify-center mb-3 group-hover:bg-white group-hover:text-indigo-600 text-slate-400">
                  <Layout size={20} />
                </div>
                {deckFile ? (
                  <div>
                    <p className="text-sm font-bold text-slate-800 break-all">{deckFile.name}</p>
                    <p className="text-[10px] text-indigo-500 mt-1 font-bold">Template Uploaded</p>
                  </div>
                ) : (
                  <div>
                    <p className="text-sm font-bold text-slate-600">Upload Deck Template</p>
                    <p className="text-[10px] text-slate-400 mt-1">PDF or Images (Max 4MB)</p>
                  </div>
                )}
                <input 
                  type="file" 
                  ref={architectFileInputRef} 
                  className="hidden" 
                  accept="image/*,application/pdf" 
                  onChange={handleDeckFileChange} 
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Presentation Goal</label>
                <textarea
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none resize-none transition-all placeholder:text-slate-400 min-h-[120px]"
                  placeholder="e.g. 'Prep for CFO QBR', 'Initial Pitch to Stakeholders'..."
                  value={contextInput}
                  onChange={(e) => setContextInput(e.target.value)}
                />
              </div>

              <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100 flex gap-3">
                 <Zap size={18} className="text-indigo-600 shrink-0" />
                 <p className="text-[10px] text-indigo-700 leading-relaxed font-medium">
                   Sidekik will audit your template and suggest exact text based on <strong>{account.name}</strong> CRM logs and <strong>Family Success</strong>.
                 </p>
              </div>

              <Button 
                onClick={handleGeneratePrescription} 
                disabled={isGenerating || !deckFile || !contextInput.trim()}
                className="w-full py-4 text-base"
              >
                {isGenerating ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
                {isGenerating ? 'Building Prescription...' : 'Generate Deck Strategy'}
              </Button>
            </div>
          </div>

          <div className="flex-1 bg-slate-50 rounded-2xl border border-slate-200 border-dashed overflow-hidden flex flex-col relative">
            {!deckStrategy && !isGenerating && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-12 text-slate-400">
                <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mb-6">
                  <PenTool size={40} className="text-indigo-300" />
                </div>
                <h3 className="text-lg font-bold text-slate-600">The Prescription Engine</h3>
                <p className="max-w-xs mt-2 text-sm leading-relaxed">Upload your corporate slides and describe your goal. Sidekik will map your deal evidence to your template.</p>
              </div>
            )}

            {isGenerating && (
              <div className="absolute inset-0 bg-white/90 z-20 flex flex-col items-center justify-center text-center p-12">
                <Loader2 size={48} className="animate-spin text-indigo-600 mb-6" />
                <h4 className="text-xl font-black text-slate-900 mb-2">Analyzing Blueprint</h4>
                <p className="text-slate-500 text-sm max-w-sm">Cross-referencing your template with interaction logs, hierarchy leverage, and deal frameworks...</p>
              </div>
            )}

            {deckStrategy && (
              <div className="flex flex-col h-full animate-in fade-in duration-500">
                <div className="p-6 border-b border-slate-200 bg-white shadow-sm flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-xs shadow-inner">
                      {deckStrategy.slides.length}
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-800 text-sm">Strategic Blueprint Loaded</h3>
                      <p className="text-[10px] text-slate-500 font-medium italic truncate max-w-[300px]">"{deckStrategy.strategySummary}"</p>
                    </div>
                  </div>
                  <Button variant="outline" onClick={() => setDeckStrategy(null)} className="h-8 text-xs">
                    <RefreshCw size={12} /> Start Over
                  </Button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                  {deckStrategy.slides.map((slide, idx) => (
                    <RecipeCard key={idx} slide={slide} />
                  ))}
                  
                  <div className="pt-6 border-t border-slate-200 flex flex-col items-center text-center space-y-4">
                    <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
                      <CheckCircle2 size={24} />
                    </div>
                    <div className="max-w-xs">
                       <h4 className="font-bold text-slate-800">Ready to present</h4>
                       <p className="text-xs text-slate-400 mt-1">Copy the text above into your corporate presentation tool to finalize the deck.</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : viewMode === 'creator' ? (
        // --- CREATIVE STUDIO INTERFACE ---
        <div className="flex-1 flex flex-col lg:flex-row gap-6 min-h-0">
          <div className="lg:w-1/3 flex flex-col bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden shrink-0">
            <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
               <Palette size={16} className="text-emerald-600" />
               <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Document Factory</span>
            </div>
            
            <div className="p-6 flex-1 flex flex-col space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Asset Type</label>
                <div className="grid grid-cols-2 gap-2">
                   <button 
                     onClick={() => setCreatorMode('executive-summary')}
                     className={`py-2 rounded-xl text-xs font-bold transition-all border ${creatorMode === 'executive-summary' ? 'bg-emerald-50 border-emerald-200 text-emerald-700 shadow-sm' : 'bg-slate-50 border-slate-200 text-slate-500'}`}
                   >
                     Summary
                   </button>
                   <button 
                     onClick={() => setCreatorMode('proposal')}
                     className={`py-2 rounded-xl text-xs font-bold transition-all border ${creatorMode === 'proposal' ? 'bg-emerald-50 border-emerald-200 text-emerald-700 shadow-sm' : 'bg-slate-50 border-slate-200 text-slate-500'}`}
                   >
                     Proposal
                   </button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Specific Topic</label>
                <textarea
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none resize-none transition-all min-h-[120px]"
                  placeholder="e.g. 'Project Alpha ROI for CFO', 'Onboarding Plan'..."
                  value={creatorTopic}
                  onChange={(e) => setCreatorTopic(e.target.value)}
                />
              </div>

              <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100 flex gap-3">
                 <Zap size={18} className="text-emerald-600 shrink-0" />
                 <p className="text-[10px] text-emerald-700 leading-relaxed font-medium">
                   Asset will be generated following your <strong>{creatorMode === 'proposal' ? FrameworkCategory.NEGOTIATION : FrameworkCategory.EXECUTIVE_SUMMARY_TEMPLATE}</strong> framework.
                 </p>
              </div>

              <Button 
                onClick={handleGenerateContent} 
                disabled={isCreating || !creatorTopic.trim()}
                className="w-full py-4 text-base bg-emerald-600 hover:bg-emerald-700"
              >
                {isCreating ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
                Generate Compliant Asset
              </Button>
            </div>
          </div>

          <div className="flex-1 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col relative">
            {isCreating && (
              <div className="absolute inset-0 bg-white/90 z-20 flex flex-col items-center justify-center text-center p-12">
                <Loader2 size={48} className="animate-spin text-emerald-600 mb-6" />
                <h4 className="text-xl font-black text-slate-900 mb-2">Drafting Methodology Asset</h4>
                <p className="text-slate-500 text-sm max-w-sm">Applying your sales framework to the account interaction logs...</p>
              </div>
            )}

            {generatedContent && generatedContent.docStructure ? (
              <div className="flex flex-col h-full animate-in fade-in duration-500">
                <div className="p-6 border-b border-slate-200 bg-white flex items-center justify-between shrink-0">
                  <div>
                    <h3 className="font-bold text-slate-800 text-sm">{generatedContent.docStructure.title}</h3>
                    <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-widest">Framework Compliant</p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => generateWordDoc(generatedContent.docStructure!.title, generatedContent.docStructure!)} className="h-8 text-xs">
                      <Download size={14} /> Download .docx
                    </Button>
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto p-8 bg-slate-50/30 custom-scrollbar">
                   <div className="max-w-3xl mx-auto space-y-8 bg-white p-12 border border-slate-200 shadow-sm min-h-full rounded-xl">
                      <h1 className="text-3xl font-black text-slate-900">{generatedContent.docStructure.title}</h1>
                      {generatedContent.docStructure.sections.map((s, i) => (
                        <div key={i} className="space-y-3">
                           <h2 className="text-sm font-black text-indigo-600 uppercase tracking-widest border-b border-slate-100 pb-2">{s.header}</h2>
                           <FormattedOutput content={s.content} className="text-sm leading-relaxed" />
                        </div>
                      ))}
                   </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center p-12 text-slate-400">
                <FileText size={48} className="opacity-20 mb-4" />
                <p className="italic">Fill out the topic and mode to the left to generate methodology-compliant documents.</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        // --- AUDITOR VIEW (MAINTAINED) ---
        <div className="flex-1 flex flex-col lg:flex-row gap-6 min-h-0">
          <div className="lg:w-1/3 flex flex-col bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden shrink-0">
            <div className="flex p-2 gap-2 border-b border-slate-100">
              {(['slide', 'document', 'email'] as AuditType[]).map((type) => (
                <button
                  key={type}
                  onClick={() => { setAuditType(type); setAuditResult(null); }}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                    auditType === type ? 'bg-rose-50 text-rose-600 shadow-sm' : 'text-slate-400 hover:bg-slate-50'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>

            <div className="p-6 flex-1 flex flex-col space-y-6">
              <div 
                className="border-2 border-dashed border-slate-200 rounded-xl p-6 flex flex-col items-center justify-center text-center cursor-pointer hover:border-rose-300 hover:bg-rose-50 transition-all group"
                onClick={() => auditorFileInputRef.current?.click()}
              >
                <div className="w-10 h-10 bg-slate-50 rounded-full flex items-center justify-center mb-3 group-hover:bg-white group-hover:text-rose-600 text-slate-400">
                  <UploadCloud size={20} />
                </div>
                {auditFile ? (
                  <div>
                    <p className="text-sm font-bold text-slate-800 break-all">{auditFile.name}</p>
                    <p className="text-xs text-rose-500 mt-1 font-bold cursor-pointer hover:underline" onClick={(e) => { e.stopPropagation(); setAuditFile(null); }}>Remove File</p>
                  </div>
                ) : (
                  <div>
                    <p className="text-sm font-bold text-slate-600">Click to Upload File</p>
                    <p className="text-[10px] text-slate-400 mt-1">Images, PDFs (Max 4MB)</p>
                  </div>
                )}
                <input 
                  type="file" 
                  ref={auditorFileInputRef} 
                  className="hidden" 
                  accept="image/*,application/pdf" 
                  onChange={handleAuditorFileChange} 
                />
              </div>

              <div className="relative flex items-center py-2">
                <div className="flex-grow border-t border-slate-100"></div>
                <span className="flex-shrink-0 mx-4 text-slate-300 text-xs font-bold uppercase">OR Paste Text</span>
                <div className="flex-grow border-t border-slate-100"></div>
              </div>

              <textarea 
                className="flex-1 w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm focus:bg-white focus:ring-2 focus:ring-rose-500 outline-none resize-none transition-all placeholder:text-slate-400"
                placeholder="Paste content here..."
                value={auditText}
                onChange={(e) => { setAuditText(e.target.value); if(e.target.value) setAuditFile(null); }}
              />

              <Button onClick={handleAudit} disabled={isAuditing || (!auditFile && !auditText.trim())} className="w-full bg-rose-600 hover:bg-rose-700 shadow-rose-200">
                {isAuditing ? <Loader2 size={18} className="animate-spin" /> : <FileCheck size={18} />}
                {isAuditing ? 'Auditing...' : 'Run Compliance Audit'}
              </Button>
            </div>
          </div>

          <div className="flex-1 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col relative">
            {!auditResult && !isAuditing && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-12 text-slate-400">
                <div className="w-20 h-20 bg-rose-50 rounded-full flex items-center justify-center mb-6">
                  <ScanEye size={40} className="text-rose-300" />
                </div>
                <h3 className="text-lg font-bold text-slate-600">Strategic Compliance</h3>
                <p className="max-w-xs mt-2 text-sm leading-relaxed">Verify your customer-facing content against your deal facts and frameworks.</p>
              </div>
            )}

            {isAuditing && (
              <div className="absolute inset-0 bg-white/90 z-20 flex flex-col items-center justify-center text-center p-12">
                <Loader2 size={40} className="animate-spin text-rose-600 mb-4" />
                <p className="font-bold text-slate-700">Verifying methodology alignment...</p>
              </div>
            )}

            {auditResult && (
              <div className="flex flex-col h-full overflow-y-auto custom-scrollbar p-8 space-y-8 animate-in fade-in duration-500">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-6">
                    <div>
                      <h3 className="text-xl font-black text-slate-900">Audit Findings</h3>
                      <p className="text-xs text-slate-500 font-medium mt-1">Audit Type: <span className="text-rose-600 font-bold uppercase">{auditType}</span></p>
                    </div>
                    <div className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider border shadow-sm ${
                      auditResult.status === 'Pass' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'
                    }`}>
                      {auditResult.status}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-6">
                    <div className="space-y-2">
                       <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><AlertCircle size={12} className="text-amber-500" /> Critique</h4>
                       <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm text-slate-700 leading-relaxed italic">"{auditResult.critique}"</div>
                    </div>
                    <div className="space-y-2">
                       <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><CheckCircle2 size={12} className="text-emerald-500" /> Suggested Fix</h4>
                       <div className="p-4 bg-emerald-50/50 border border-emerald-100 rounded-2xl text-sm text-emerald-900 leading-relaxed font-medium">{auditResult.suggestion}</div>
                    </div>
                  </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CanvasTab;
