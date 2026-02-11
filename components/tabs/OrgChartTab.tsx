import React, { useState, useMemo } from 'react';
import { 
  Users, 
  Table, 
  Sparkles, 
  Plus, 
  Copy, 
  ExternalLink, 
  Loader2, 
  Search, 
  Edit3, 
  Link as LinkIcon,
  ChevronRight,
  ChevronDown,
  Building2,
  ThumbsUp,
  ThumbsDown,
  ShieldAlert,
  Zap,
  Check,
  HelpCircle,
  FileSpreadsheet,
  ArrowRight
} from 'lucide-react';
import { Account, OrgContact, SellerInfo } from '../../types';
import { geminiService } from '../../services/geminiService';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { EditStakeholderModal } from '../modals/EditStakeholderModal';

interface OrgChartTabProps {
  account: Account;
  sellerInfo: SellerInfo;
  onUpdateAccount: (updatedAccount: Account) => void;
}

// --- Helper Functions & Components (Defined outside to prevent re-render crashes) ---

const getRoleColor = (role: string) => {
  switch(role) {
    case 'Economic Buyer': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
    case 'Champion': return 'bg-indigo-100 text-indigo-700 border-indigo-200';
    case 'Blocker': return 'bg-rose-100 text-rose-700 border-rose-200';
    case 'Influencer': return 'bg-amber-100 text-amber-700 border-amber-200';
    default: return 'bg-slate-100 text-slate-500 border-slate-200';
  }
};

const StakeholderCardContent: React.FC<{ contact: OrgContact }> = ({ contact }) => (
  <>
    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border-2 ${
      contact.sentiment === 'Positive' ? 'border-emerald-100 bg-emerald-50 text-emerald-600' :
      contact.sentiment === 'Negative' ? 'border-rose-100 bg-rose-50 text-rose-600' :
      'border-slate-100 bg-slate-50 text-slate-400'
    }`}>
      {contact.sentiment === 'Positive' ? <ThumbsUp size={20} /> : 
       contact.sentiment === 'Negative' ? <ThumbsDown size={20} /> : 
       <Building2 size={20} />}
    </div>
    
    <div className="flex-1 min-w-0">
      <div className="flex items-center justify-between gap-2">
        <h4 className="font-black text-slate-900 truncate tracking-tight text-xs">{contact.name}</h4>
      </div>
      <p className="text-[10px] font-medium text-slate-500 truncate">{contact.title}</p>
      <span className={`inline-block mt-1 px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider border ${getRoleColor(contact.role)}`}>
        {contact.role}
      </span>
    </div>
  </>
);

const VerticalNode: React.FC<{ 
  contact: OrgContact; 
  allContacts: OrgContact[];
  onEdit: (c: OrgContact) => void;
}> = ({ contact, allContacts, onEdit }) => {
  const reports = allContacts.filter(c => c.managerId === contact.id);
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <div className="flex flex-col gap-3">
      <div 
        className="flex items-start gap-4 p-4 bg-white border border-slate-200 rounded-2xl shadow-sm hover:border-indigo-400 hover:shadow-md transition-all group cursor-pointer"
        onClick={() => onEdit(contact)}
      >
        <StakeholderCardContent contact={contact} />
        <div className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
          <Edit3 size={16} className="text-slate-400" />
        </div>
      </div>

      {reports.length > 0 && (
        <div className="flex gap-4">
          <div className="ml-5 border-l-2 border-slate-100 flex flex-col items-center">
            <button 
              onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded); }}
              className="w-4 h-4 bg-white border border-slate-200 rounded flex items-center justify-center text-slate-400 hover:text-indigo-600 -ml-[9px] z-10"
            >
              {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
            </button>
          </div>
          {isExpanded && (
            <div className="flex-1 space-y-4 pt-2">
              {reports.map(r => (
                <VerticalNode 
                  key={r.id} 
                  contact={r} 
                  allContacts={allContacts} 
                  onEdit={onEdit} 
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const HorizontalNode: React.FC<{ 
  contact: OrgContact; 
  allContacts: OrgContact[];
  onEdit: (c: OrgContact) => void;
}> = ({ contact, allContacts, onEdit }) => {
  const reports = allContacts.filter(c => c.managerId === contact.id);

  return (
    <div className="flex flex-col items-center min-w-[200px]">
      <div 
        className="w-48 flex flex-col items-center text-center p-3 bg-white border border-slate-200 rounded-2xl shadow-sm hover:border-indigo-400 hover:shadow-md transition-all group cursor-pointer z-10"
        onClick={() => onEdit(contact)}
      >
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center border-2 mb-2 ${
          contact.sentiment === 'Positive' ? 'border-emerald-100 bg-emerald-50 text-emerald-600' :
          contact.sentiment === 'Negative' ? 'border-rose-100 bg-rose-50 text-rose-600' :
          'border-slate-100 bg-slate-50 text-slate-400'
        }`}>
          {contact.sentiment === 'Positive' ? <ThumbsUp size={20} /> : 
           contact.sentiment === 'Negative' ? <ThumbsDown size={20} /> : 
           <Building2 size={20} />}
        </div>
        <h4 className="font-black text-slate-900 truncate tracking-tight text-xs w-full px-1">{contact.name}</h4>
        <p className="text-[10px] font-medium text-slate-500 truncate w-full px-1">{contact.title}</p>
        <span className={`inline-block mt-1 px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider border ${getRoleColor(contact.role)}`}>
          {contact.role}
        </span>
      </div>

      {reports.length > 0 && (
        <div className="flex flex-col items-center w-full mt-4 relative">
          {/* Vertical line from parent to horizontal bar */}
          <div className="w-0.5 h-4 bg-slate-200"></div>
          
          {/* Horizontal connecting bar */}
          {reports.length > 1 && (
            <div className="absolute top-4 left-[12.5%] right-[12.5%] h-0.5 bg-slate-200"></div>
          )}
          
          <div className="flex gap-4 pt-4">
            {reports.map((r) => (
              <div key={r.id} className="relative flex flex-col items-center">
                {/* Vertical line up to horizontal bar */}
                <div className="w-0.5 h-4 bg-slate-200 mb-0"></div>
                <HorizontalNode 
                  contact={r} 
                  allContacts={allContacts} 
                  onEdit={onEdit} 
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// --- Main Component ---

const OrgChartTab: React.FC<OrgChartTabProps> = ({ 
  account, 
  sellerInfo, 
  onUpdateAccount 
}) => {
  const [viewMode, setViewMode] = useState<'visual' | 'sheets'>('visual');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [editingContact, setEditingContact] = useState<OrgContact | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [sheetUrl, setSheetUrl] = useState(account.googleSheetUrl || '');
  const [copied, setCopied] = useState(false);

  const contacts = useMemo(() => account.orgChart || [], [account.orgChart]);
  const rootContacts = useMemo(() => contacts.filter(c => !c.managerId), [contacts]);

  const handleSaveContact = (contact: OrgContact) => {
    const exists = contacts.find(c => c.id === contact.id);
    const updated = exists 
      ? contacts.map(c => c.id === contact.id ? contact : c)
      : [contact, ...contacts];
    
    onUpdateAccount({ ...account, orgChart: updated });
  };

  const handleDeleteContact = (id: string) => {
    if (!confirm("Are you sure? This will remove the stakeholder.")) return;
    const updated = contacts.filter(c => c.id !== id).map(c => 
      c.managerId === id ? { ...c, managerId: '' } : c
    );
    onUpdateAccount({ ...account, orgChart: updated });
    setIsModalOpen(false);
  };

  const handleAutoBuild = async (customInstruction?: string) => {
    setIsAiLoading(true);
    try {
      const newContacts: OrgContact[] = await geminiService.researchStakeholders(account, sellerInfo, customInstruction);
      
      const merged = [...contacts];
      newContacts.forEach((nc: OrgContact) => {
        if (!merged.some(c => c.name.toLowerCase() === nc.name.toLowerCase())) {
          merged.push(nc);
        }
      });

      const finalMerged = merged.map(c => {
        if (!c.managerId && (c as any).managerName) {
          const m = merged.find(potential => 
            potential.name.toLowerCase() === ((c as any).managerName || '').toLowerCase()
          );
          if (m) return { ...c, managerId: m.id };
        }
        return c;
      });

      onUpdateAccount({ ...account, orgChart: finalMerged });
    } catch (error) {
      alert("AI research failed.");
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleCustomSearch = () => {
    const query = window.prompt("Who should I look for? (e.g., 'Find Brand Managers', 'Find the CTO and their team')");
    if (query && query.trim()) {
      handleAutoBuild(query);
    }
  };

  const handleScanInputs = async () => {
    setIsAiLoading(true);
    try {
      const newContacts: OrgContact[] = await geminiService.scanInputsForStakeholders(account);
      const merged = [...contacts];
      newContacts.forEach((nc: OrgContact) => {
        if (!merged.some(c => c.name.toLowerCase() === nc.name.toLowerCase())) {
          merged.push(nc);
        }
      });
      onUpdateAccount({ ...account, orgChart: merged });
    } catch (error) {
      alert("Scan failed.");
    } finally {
      setIsAiLoading(false);
    }
  };

  // Improved Copy Function for Google Sheets Org Charts
  const copyToSheets = () => {
    // Exact format required by Google Sheets "Org Chart" chart type:
    // Col 1: Name (ID)
    // Col 2: Manager (Parent ID)
    // Col 3: Tooltip (Optional, we use Title/Role)
    const headers = ["Name", "Manager", "Role/Title"];
    const rows = contacts.map(c => {
      const manager = contacts.find(m => m.id === c.managerId);
      return [
        c.name,
        manager ? manager.name : '',
        `${c.title} (${c.role})`
      ].join('\t');
    });
    
    const tsv = [headers.join('\t'), ...rows].join('\n');
    
    navigator.clipboard.writeText(tsv);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const handleSaveSheetUrl = () => {
    // Directly save the URL provided by the user without regex manipulation
    // This allows /edit, /preview, /pubhtml etc. to work as intended by the paster
    onUpdateAccount({ ...account, googleSheetUrl: sheetUrl });
  };

  const handleClearSheetUrl = () => {
    if(confirm("Unlink this spreadsheet?")) {
        onUpdateAccount({ ...account, googleSheetUrl: '' });
        setSheetUrl('');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
            <Users size={20} />
          </div>
          <div>
            <h3 className="font-bold text-slate-800">Account Stakeholder Map</h3>
            <p className="text-xs text-slate-500">Visualize decision makers and power centers</p>
          </div>
        </div>

        <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-xl">
          <button 
            onClick={() => setViewMode('visual')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${viewMode === 'visual' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <Users size={16} /> Visual Chart
          </button>
          <button 
            onClick={() => setViewMode('sheets')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${viewMode === 'sheets' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <Table size={16} /> Google Sheets
          </button>
        </div>
      </div>

      {viewMode === 'visual' ? (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <div className="lg:col-span-3 space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between px-4 gap-4">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Stakeholder Hierarchy</h4>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={() => { setEditingContact(null); setIsModalOpen(true); }}>
                  <Plus size={16} /> Add Manual
                </Button>
                <Button variant="ai" onClick={() => handleAutoBuild()} disabled={isAiLoading}>
                  {isAiLoading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                  Auto-Build
                </Button>
                <Button variant="outline" onClick={handleCustomSearch} disabled={isAiLoading}>
                   <Search size={16} /> Custom Search
                </Button>
                <Button variant="outline" onClick={handleScanInputs} disabled={isAiLoading}>
                   <Zap size={16} /> Scan Logs
                </Button>
              </div>
            </div>

            {/* Tree Container */}
            <div className="relative">
              {isAiLoading && (
                <div className="absolute inset-0 bg-white/60 backdrop-blur-sm z-50 flex flex-col items-center justify-center rounded-3xl">
                  <Loader2 size={32} className="animate-spin text-indigo-600 mb-4" />
                  <p className="font-bold text-slate-800">AI Research in Progress...</p>
                </div>
              )}

              {rootContacts.length > 0 ? (
                <>
                  {/* Mobile View: Vertical */}
                  <div className="md:hidden space-y-6">
                    {rootContacts.map(c => (
                      <VerticalNode 
                        key={c.id} 
                        contact={c} 
                        allContacts={contacts} 
                        onEdit={(c) => { setEditingContact(c); setIsModalOpen(true); }} 
                      />
                    ))}
                  </div>

                  {/* Desktop View: Horizontal Tree */}
                  <div className="hidden md:block overflow-x-auto pb-12 pt-8 min-h-[400px]">
                    <div className="flex justify-center gap-12 min-w-max px-8">
                      {rootContacts.map(c => (
                        <HorizontalNode 
                          key={c.id} 
                          contact={c} 
                          allContacts={contacts} 
                          onEdit={(c) => { setEditingContact(c); setIsModalOpen(true); }} 
                        />
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <div className="bg-white border-2 border-dashed border-slate-100 rounded-3xl p-20 text-center">
                  <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-300">
                    <Users size={32} />
                  </div>
                  <h4 className="text-lg font-bold text-slate-800">Map your stakeholders</h4>
                  <p className="text-slate-400 text-sm max-w-xs mx-auto mt-2">
                    Use Auto-Build to search for executives or Custom Search for specific roles.
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="lg:col-span-1 space-y-6">
            <div className="bg-slate-900 p-6 rounded-3xl text-white shadow-xl relative overflow-hidden">
               <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full -mr-8 -mt-8"></div>
               <h4 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Deal Influence</h4>
               <div className="space-y-4">
                 <div className="flex items-center justify-between text-xs">
                   <span className="text-slate-400">Total Contacts</span>
                   <span className="font-bold">{contacts.length}</span>
                 </div>
                 <div className="flex items-center justify-between text-xs">
                   <span className="text-slate-400">Champions</span>
                   <span className="font-bold text-indigo-400">{contacts.filter(c => c.role === 'Champion').length}</span>
                 </div>
                 <div className="flex items-center justify-between text-xs">
                   <span className="text-slate-400">Economic Buyers</span>
                   <span className="font-bold text-emerald-400">{contacts.filter(c => c.role === 'Economic Buyer').length}</span>
                 </div>
                 <div className="flex items-center justify-between text-xs">
                   <span className="text-slate-400">Blockers</span>
                   <span className="font-bold text-rose-400">{contacts.filter(c => c.role === 'Blocker').length}</span>
                 </div>
               </div>
               
               <div className="mt-8 pt-6 border-t border-white/10">
                 <p className="text-[10px] text-slate-400 leading-relaxed italic">
                   "A deal is dead without a Champion. Identify one at the Director level or above."
                 </p>
               </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Power Signals</h4>
              <div className="space-y-3">
                 {contacts.filter(c => c.sentiment === 'Negative').map(c => (
                   <div key={c.id} className="flex gap-2 p-2 bg-rose-50 border border-rose-100 rounded-lg">
                     <ShieldAlert size={14} className="text-rose-600 shrink-0 mt-0.5" />
                     <div>
                       <p className="text-[10px] font-bold text-rose-800">{c.name} is Negative</p>
                       <p className="text-[9px] text-rose-600 line-clamp-1">Potential blocker identified</p>
                     </div>
                   </div>
                 ))}
                 {contacts.filter(c => c.role === 'Economic Buyer').length === 0 && (
                   <div className="flex gap-2 p-2 bg-amber-50 border border-amber-100 rounded-lg">
                     <ShieldAlert size={14} className="text-amber-600 shrink-0 mt-0.5" />
                     <div>
                       <p className="text-[10px] font-bold text-amber-800">Missing Buyer</p>
                       <p className="text-[9px] text-amber-600">No Economic Buyer mapped yet.</p>
                     </div>
                   </div>
                 )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6 animate-in fade-in duration-300 h-full flex flex-col">
           {account.googleSheetUrl ? (
             <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden flex-1 flex flex-col min-h-[700px] relative">
               <div className="bg-slate-50 p-3 flex justify-between items-center border-b border-slate-200 shrink-0">
                 <div className="flex items-center gap-2 max-w-[60%]">
                   <LinkIcon size={16} className="text-emerald-600 shrink-0" />
                   <span className="text-xs font-bold text-slate-700 truncate">{account.googleSheetUrl}</span>
                 </div>
                 <div className="flex gap-2">
                   <a href={account.googleSheetUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 text-slate-700 rounded-lg text-xs font-bold hover:bg-slate-100">
                     <ExternalLink size={12} /> Open in New Tab
                   </a>
                   <button onClick={handleClearSheetUrl} className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 text-rose-700 rounded-lg text-xs font-bold hover:bg-rose-100">
                     Unlink
                   </button>
                 </div>
               </div>
               
               {/* Embed Instruction/Fallback Layer */}
               <div className="relative flex-1 w-full bg-slate-100">
                 <iframe 
                    src={account.googleSheetUrl} 
                    className="absolute inset-0 w-full h-full border-none z-10"
                    title="Stakeholder Spreadsheet"
                    allow="clipboard-write"
                  />
                  {/* Fallback Message behind the iframe (visible if iframe loads slowly or fails) */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-12 z-0">
                    <Loader2 className="animate-spin text-slate-400 mb-4" size={32} />
                    <p className="text-slate-500 font-medium mb-2">Loading Sheet...</p>
                    <p className="text-xs text-slate-400 max-w-sm">
                      If the sheet doesn't appear, you may need to sign in to Google in this browser or the sheet permissions might be restricted. 
                      <br/><br/>
                      <a href={account.googleSheetUrl} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline">Click here to open in new tab</a>.
                    </p>
                  </div>
               </div>
             </div>
           ) : (
             <div className="flex flex-col lg:flex-row gap-8 min-h-[600px]">
               {/* Setup Wizard */}
               <div className="lg:w-1/3 space-y-6">
                 <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                   <h4 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                     <Sparkles size={20} className="text-emerald-500" /> Setup Wizard
                   </h4>
                   
                   <div className="space-y-6">
                     {/* Step 1 */}
                     <div className="relative pl-6 pb-6 border-l-2 border-slate-200 last:border-0 last:pb-0">
                       <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-slate-900 text-white flex items-center justify-center text-[10px] font-bold">1</div>
                       <h5 className="font-bold text-sm text-slate-800 mb-1">Create New Sheet</h5>
                       <a 
                         href="https://sheets.new" 
                         target="_blank" 
                         rel="noreferrer" 
                         className="inline-flex items-center gap-2 text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-2 rounded-lg hover:bg-emerald-100 transition-colors border border-emerald-200"
                       >
                         <FileSpreadsheet size={14} /> Click to create sheet
                       </a>
                       <p className="text-xs text-slate-500 mt-2">
                         Name your sheet (e.g. "Acme Org Chart").
                       </p>
                     </div>

                     {/* Step 2 */}
                     <div className="relative pl-6 pb-6 border-l-2 border-slate-200 last:border-0 last:pb-0">
                       <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-slate-900 text-white flex items-center justify-center text-[10px] font-bold">2</div>
                       <h5 className="font-bold text-sm text-slate-800 mb-1">Copy & Paste Data</h5>
                       <button 
                         onClick={copyToSheets}
                         className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-2 rounded-lg hover:bg-indigo-100 transition-colors border border-indigo-200 mb-2 w-full justify-center"
                       >
                         {copied ? <Check size={14} /> : <Copy size={14} />} {copied ? 'Copied to Clipboard' : 'Copy Org Data'}
                       </button>
                       <p className="text-xs text-slate-500">
                         Paste this into <strong>Cell A1</strong> of your new sheet.
                       </p>
                     </div>

                     {/* Step 3 */}
                     <div className="relative pl-6 pb-6 border-l-2 border-slate-200 last:border-0 last:pb-0">
                       <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-slate-900 text-white flex items-center justify-center text-[10px] font-bold">3</div>
                       <h5 className="font-bold text-sm text-slate-800 mb-1">Create Chart</h5>
                       <p className="text-xs text-slate-500 leading-relaxed">
                         In Google Sheets:<br/>
                         1. Select columns A, B, and C.<br/>
                         2. Click <strong>Insert {'>'} Chart</strong>.<br/>
                         3. Set Chart Type to <strong>Organizational Chart</strong>.
                       </p>
                     </div>

                     {/* Step 4 */}
                     <div className="relative pl-6 border-l-2 border-slate-200 last:border-0">
                       <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-slate-900 text-white flex items-center justify-center text-[10px] font-bold">4</div>
                       <h5 className="font-bold text-sm text-slate-800 mb-1">Link It</h5>
                       <p className="text-xs text-slate-500 mb-2">
                         Copy the URL from your browser address bar and paste it in the box to the right <ArrowRight size={12} className="inline" />
                       </p>
                     </div>
                   </div>
                 </div>
               </div>

               {/* URL Input Area */}
               <div className="flex-1 bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl flex flex-col items-center justify-center p-12 text-center">
                 <div className="w-20 h-20 bg-white rounded-full shadow-sm flex items-center justify-center mb-6">
                   <LinkIcon size={32} className="text-emerald-500" />
                 </div>
                 <h3 className="text-xl font-bold text-slate-800 mb-2">Embed Google Sheet</h3>
                 <p className="text-slate-400 max-w-sm mb-8 text-sm">
                   Paste the full URL of your Google Sheet below to view and edit it directly within Sidekik.
                 </p>
                 
                 <div className="flex w-full max-w-md gap-2">
                   <input 
                     type="text" 
                     placeholder="https://docs.google.com/spreadsheets/d/..." 
                     className="flex-1 px-4 py-3 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-emerald-500 outline-none shadow-sm"
                     value={sheetUrl}
                     onChange={(e) => setSheetUrl(e.target.value)}
                   />
                   <Button onClick={handleSaveSheetUrl} disabled={!sheetUrl} className="bg-emerald-600 hover:bg-emerald-700 text-white px-6">
                     Save Link
                   </Button>
                 </div>
                 <div className="mt-6 flex items-start gap-2 bg-blue-50 text-blue-700 p-3 rounded-xl max-w-sm text-left">
                    <HelpCircle size={16} className="shrink-0 mt-0.5" />
                    <p className="text-[10px] leading-relaxed">
                      <strong>Why create externally?</strong> Google security prevents the "New Sheet" page from loading inside other apps. Once created, paste the link here to work on it without leaving Sidekik.
                    </p>
                 </div>
               </div>
             </div>
           )}
        </div>
      )}

      <EditStakeholderModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveContact}
        onDelete={handleDeleteContact}
        contact={editingContact}
        allContacts={contacts}
      />
    </div>
  );
};

export default OrgChartTab;