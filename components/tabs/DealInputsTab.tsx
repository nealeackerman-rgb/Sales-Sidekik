
import React, { useState } from 'react';
import { 
  History, 
  MessageSquare, 
  Plus, 
  Sparkles, 
  Loader2, 
  Calendar,
  ChevronRight,
  Phone,
  Mail,
  FileText,
  ChevronDown,
  ChevronUp,
  Copy,
  Check
} from 'lucide-react';
import { Account, CommunicationLog, Task, SellerInfo } from '../../types';
import { geminiService } from '../../services/geminiService';
import { FormattedOutput } from '../common/FormattedOutput';
import { Button } from '../common/Button';
import { Textarea } from '../common/Textarea';
import { Input } from '../common/Input';

interface DealInputsTabProps {
  account: Account;
  sellerInfo: SellerInfo;
  onUpdateAccount: (updatedAccount: Account) => void;
}

// Collapsible Card Component
const LogCard: React.FC<{ log: CommunicationLog }> = ({ log }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(log.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'Call': return <Phone size={16} className="text-blue-500" />;
      case 'Email': return <Mail size={16} className="text-emerald-500" />;
      case 'Message': return <MessageSquare size={16} className="text-amber-500" />;
      default: return <FileText size={16} className="text-slate-500" />;
    }
  };

  return (
    <div className={`group flex gap-4 transition-all duration-300 ${isExpanded ? 'items-start' : 'items-center'}`}>
      {/* Icon Column */}
      <div className={`mt-1 w-10 h-10 rounded-full bg-white border-2 border-slate-100 flex items-center justify-center shadow-sm group-hover:border-indigo-200 transition-colors shrink-0`}>
        {getIcon(log.type)}
      </div>

      {/* Card Content */}
      <div 
        className={`flex-1 bg-white border border-slate-200 rounded-2xl shadow-sm hover:shadow-md transition-all overflow-hidden cursor-pointer ${isExpanded ? 'ring-1 ring-indigo-500/20' : ''}`}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="p-4">
          <div className="flex justify-between items-center">
             <div className="flex items-center gap-3">
                <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">{log.type}</span>
                <span className="w-1 h-1 rounded-full bg-slate-200"></span>
                <span className="text-[10px] font-bold text-slate-400">{new Date(log.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
             </div>
             <div className="flex items-center gap-2">
                {isExpanded && (
                  <button 
                    onClick={handleCopy}
                    className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                    title="Copy content"
                  >
                    {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                  </button>
                )}
                <button className="text-slate-400 hover:text-indigo-600 transition-colors">
                  {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
             </div>
          </div>

          <div className="mt-2">
            {isExpanded ? (
              <div className="animate-in fade-in duration-200 cursor-text" onClick={e => e.stopPropagation()}>
                 <FormattedOutput content={log.content} className="text-sm" />
              </div>
            ) : (
              <p className="text-sm text-slate-500 truncate">{log.content.substring(0, 80)}{log.content.length > 80 ? '...' : ''}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const DealInputsTab: React.FC<DealInputsTabProps> = ({ account, sellerInfo, onUpdateAccount }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [content, setContent] = useState('');
  const [type, setType] = useState<CommunicationLog['type']>('Sales Note');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  // Custom ID generator to fix potential duplicate ID issues
  const generateId = () => {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
  };

  const handleLogInteraction = async () => {
    if (!content.trim()) return;

    setIsProcessing(true);
    try {
      // 60-Day Guardrail Check
      const inputDate = new Date(date);
      const now = new Date();
      const diffTime = Math.abs(now.getTime() - inputDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      let newTasks: Task[] = [];

      if (diffDays > 60) {
        alert("Note: This interaction is older than 60 days. It has been saved to history, but task extraction was skipped to maintain relevance.");
      } else {
        // Only process tasks if recent enough
        const result = await geminiService.processInteraction(content, sellerInfo.sellerName, date);
        newTasks = result.tasks.map((t: any) => ({
          id: generateId(), // Explicitly call custom generator for each task
          description: t.description,
          dueDate: t.dueDate,
          priority: t.priority || 'Medium',
          isCompleted: false
        }));
      }
      
      const newLog: CommunicationLog = {
        date: new Date(date).toISOString(),
        content: content,
        type: type,
      };

      onUpdateAccount({
        ...account,
        communicationLogs: [newLog, ...(account.communicationLogs || [])],
        tasks: [...newTasks, ...(account.tasks || [])]
      });

      setContent('');
      if (newTasks.length > 0) {
        alert(`Success! Logged interaction and extracted ${newTasks.length} tasks.`);
      }
    } catch (error) {
      alert("Failed to process interaction.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
      {/* Top/Left: Input Form */}
      <div className="lg:col-span-2 space-y-6 order-1">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xl lg:sticky lg:top-8">
          <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
            <Plus size={18} className="text-indigo-600" />
            Log New Interaction
          </h3>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Type</label>
                <select 
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                  value={type}
                  onChange={(e) => setType(e.target.value as any)}
                >
                  <option value="Call">Call</option>
                  <option value="Email">Email</option>
                  <option value="Message">Message</option>
                  <option value="Sales Note">Sales Note</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Date</label>
                <input 
                  type="date"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>
            </div>

            <Textarea 
              label="Content / Transcript"
              placeholder="Paste the email thread, call transcript, or your rough notes here..."
              rows={12}
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />

            <Button 
              className="w-full py-4 text-base" 
              onClick={handleLogInteraction} 
              disabled={isProcessing || !content.trim()}
            >
              {isProcessing ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  Processing Intelligence...
                </>
              ) : (
                <>
                  <Sparkles size={20} />
                  Log & Process with AI
                </>
              )}
            </Button>
            
            <p className="text-[10px] text-slate-400 text-center leading-relaxed font-medium">
              Sidekik will automatically extract next steps and update your task list after processing.
            </p>
          </div>
        </div>
      </div>

      {/* Bottom/Right: History Timeline */}
      <div className="lg:col-span-3 space-y-6 order-2">
        <div className="flex items-center justify-between mb-4 px-2">
          <h3 className="font-bold text-slate-800 flex items-center gap-2">
            <History size={18} className="text-indigo-600" />
            Interaction History
          </h3>
          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
            {account.communicationLogs?.length || 0} entries
          </span>
        </div>

        <div className="space-y-4 relative before:absolute before:inset-0 before:ml-5 before:-z-10 before:h-full before:w-0.5 before:bg-slate-100">
          {account.communicationLogs?.length ? (
            account.communicationLogs.map((log, i) => (
              <LogCard key={i} log={log} />
            ))
          ) : (
            <div className="bg-white border-2 border-dashed border-slate-100 rounded-2xl p-12 text-center text-slate-400 italic text-sm">
              No history found. Log your first interaction to begin AI tracking.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DealInputsTab;
