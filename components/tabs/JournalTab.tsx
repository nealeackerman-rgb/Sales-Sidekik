import React, { useState } from 'react';
import { 
  Plus, 
  MessageSquare, 
  Phone, 
  Mail, 
  FileText, 
  Sparkles, 
  Loader2, 
  Trash2, 
  Calendar,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { Account, CommunicationLog, Task } from '../../types';
import { geminiService } from '../../services/geminiService';
import { Button } from '../common/Button';
import { Textarea } from '../common/Textarea';

interface JournalTabProps {
  account: Account;
  onUpdateAccount: (updatedAccount: Account) => void;
}

const JournalTab: React.FC<JournalTabProps> = ({ account, onUpdateAccount }) => {
  const [newLog, setNewLog] = useState('');
  const [logType, setLogType] = useState<CommunicationLog['type']>('Sales Note');
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleAddLog = async (analyze = false) => {
    if (!newLog.trim()) return;

    const logEntry: CommunicationLog = {
      date: new Date().toISOString(),
      content: newLog,
      type: logType,
    };

    const updatedLogs = [logEntry, ...(account.communicationLogs || [])];
    let updatedTasks = [...(account.tasks || [])];

    if (analyze) {
      setIsAnalyzing(true);
      try {
        const analysis = await geminiService.analyzeInteraction(newLog);
        
        // Convert extracted tasks to account task format
        const newTasks: Task[] = analysis.extractedTasks.map((t: { description: string; dueDate?: string }) => ({
          id: crypto.randomUUID(),
          description: t.description,
          dueDate: t.dueDate || undefined,
          isCompleted: false
        }));

        updatedTasks = [...newTasks, ...updatedTasks];
        alert(`Sidekik Analysis Complete:\n- Summary: ${analysis.summary}\n- Extracted ${newTasks.length} tasks.`);
      } catch (error) {
        console.error("AI Analysis failed", error);
        alert("Log saved, but AI analysis encountered an error.");
      } finally {
        setIsAnalyzing(false);
      }
    }

    onUpdateAccount({
      ...account,
      communicationLogs: updatedLogs,
      tasks: updatedTasks
    });
    setNewLog('');
  };

  const getIcon = (type: CommunicationLog['type']) => {
    switch (type) {
      case 'Call': return <Phone size={16} />;
      case 'Email': return <Mail size={16} />;
      case 'Message': return <MessageSquare size={16} />;
      default: return <FileText size={16} />;
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
      {/* Input Section */}
      <div className="lg:col-span-2 space-y-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-800">Log Interaction</h3>
            <div className="flex bg-slate-100 p-1 rounded-lg gap-1">
              {(['Call', 'Email', 'Message', 'Sales Note'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setLogType(t)}
                  className={`px-3 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all ${
                    logType === t ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <Textarea
            placeholder={logType === 'Call' ? "Paste transcript or call notes here..." : "Add a note or email copy..."}
            rows={6}
            value={newLog}
            onChange={(e) => setNewLog(e.target.value)}
            className="text-sm"
          />

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => handleAddLog(false)} disabled={!newLog.trim() || isAnalyzing}>
              Save Simple Note
            </Button>
            <Button onClick={() => handleAddLog(true)} disabled={!newLog.trim() || isAnalyzing} className="bg-indigo-600">
              {isAnalyzing ? <Loader2 className="animate-spin" size={18} /> : <Sparkles size={18} />}
              {isAnalyzing ? 'Analyzing...' : 'Sidekik Process'}
            </Button>
          </div>
        </div>

        {/* Timeline */}
        <div className="space-y-4">
          <h3 className="font-bold text-slate-800 flex items-center gap-2 px-2">
            <Calendar size={18} className="text-slate-400" />
            History
          </h3>
          <div className="relative space-y-4 before:absolute before:inset-0 before:ml-5 before:-z-10 before:h-full before:w-0.5 before:bg-slate-100">
            {account.communicationLogs?.length ? (
              account.communicationLogs.map((log, i) => (
                <div key={i} className="flex gap-4 group">
                  <div className="mt-1 w-10 h-10 rounded-full bg-white border-2 border-slate-100 flex items-center justify-center text-slate-400 group-hover:border-indigo-200 group-hover:text-indigo-600 transition-colors shrink-0">
                    {getIcon(log.type)}
                  </div>
                  <div className="flex-1 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest">{log.type}</span>
                      <span className="text-[10px] text-slate-400">{new Date(log.date).toLocaleDateString()}</span>
                    </div>
                    <p className="text-sm text-slate-600 whitespace-pre-wrap">{log.content}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-12 text-slate-400 italic text-sm">No interaction logs yet.</div>
            )}
          </div>
        </div>
      </div>

      {/* Task Extraction Preview / Task List */}
      <div className="space-y-6">
        <div className="bg-slate-900 rounded-2xl p-6 text-white shadow-xl">
          <h3 className="font-bold mb-4 flex items-center gap-2">
            <CheckCircle2 size={18} className="text-emerald-400" />
            Active Tasks
          </h3>
          <div className="space-y-3">
            {account.tasks?.filter(t => !t.isCompleted).map(task => (
              <div key={task.id} className="flex gap-3 p-3 bg-white/5 border border-white/10 rounded-xl group hover:bg-white/10 transition-all">
                <button 
                  onClick={() => {
                    const updated = account.tasks?.map(t => t.id === task.id ? {...t, isCompleted: true} : t);
                    onUpdateAccount({...account, tasks: updated});
                  }}
                  className="mt-0.5 w-5 h-5 rounded border border-white/30 flex items-center justify-center hover:border-emerald-400 transition-colors"
                >
                  <div className="w-2.5 h-2.5 rounded-sm bg-transparent group-hover:bg-white/10"></div>
                </button>
                <div className="flex-1">
                  <p className="text-sm font-medium leading-snug">{task.description}</p>
                  {task.dueDate && <p className="text-[10px] text-white/40 mt-1 uppercase tracking-wider font-bold">{task.dueDate}</p>}
                </div>
              </div>
            ))}
            {!account.tasks?.some(t => !t.isCompleted) && (
              <div className="text-center py-8 text-white/30 text-xs italic">All caught up! Use "Sidekik Process" to find more.</div>
            )}
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2 text-indigo-600 mb-3">
            <AlertCircle size={18} />
            <h4 className="text-sm font-bold">Sales Pro-Tip</h4>
          </div>
          <p className="text-xs text-slate-500 leading-relaxed">
            Pasting call transcripts allows Sidekik to extract subtle customer challenges that might be missed in high-level summaries.
          </p>
        </div>
      </div>
    </div>
  );
};

export default JournalTab;