
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  CheckCircle2, 
  Circle, 
  Calendar, 
  Trash2, 
  Plus, 
  Sparkles, 
  Loader2, 
  Filter,
  Building2,
  ListTodo,
  AlertCircle,
  Mail,
  Star
} from 'lucide-react';
import { Account, Task } from '../../types';
import { geminiService } from '../../services/geminiService';
import { Button } from '../common/Button';

interface TasksViewProps {
  accounts: Account[];
  onUpdateAccount: (updatedAccount: Account) => void;
  onNavigateToAccount: (accountId: string, tab?: string, extras?: any) => void;
}

// Auto-resizing textarea component
const AutoResizeTextarea = ({ value, onChange, className, placeholder }: { value: string, onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void, className?: string, placeholder?: string }) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [value]);

  return (
    <textarea
      ref={textareaRef}
      className={className}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      rows={1}
    />
  );
};

const TasksView: React.FC<TasksViewProps> = ({ accounts, onUpdateAccount, onNavigateToAccount }) => {
  const [filterAccountId, setFilterAccountId] = useState<string>('all');
  const [isScanning, setIsScanning] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);
  
  // Quick Add State
  const [newTaskDesc, setNewTaskDesc] = useState('');
  const [newTaskAccount, setNewTaskAccount] = useState('');
  const [newTaskDate, setNewTaskDate] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<'High' | 'Medium'>('Medium');

  // Derived Tasks List (Flattened)
  const allTasks = useMemo(() => {
    return accounts.flatMap(account => 
      (account.tasks || []).map(task => ({
        ...task,
        accountId: account.id,
        accountName: account.name
      }))
    );
  }, [accounts]);

  const filteredTasks = allTasks.filter(t => {
    const matchesAccount = filterAccountId === 'all' || t.accountId === filterAccountId;
    return matchesAccount;
  });

  // Sort: High priority first, then by date (if exists), then by creation/default
  const sortTasks = (tasks: typeof allTasks) => {
    return tasks.sort((a, b) => {
      // 1. Priority
      if (a.priority === 'High' && b.priority !== 'High') return -1;
      if (a.priority !== 'High' && b.priority === 'High') return 1;
      // 2. Date (if available) - undefined dates go last
      if (a.dueDate && b.dueDate) return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      if (a.dueDate) return -1;
      if (b.dueDate) return 1;
      return 0;
    });
  };

  const activeTasks = sortTasks(filteredTasks.filter(t => !t.isCompleted));
  const completedTasks = filteredTasks.filter(t => t.isCompleted);

  // --- Actions ---

  const handleUpdateTask = (accountId: string, taskId: string, updates: Partial<Task>) => {
    const account = accounts.find(a => a.id === accountId);
    if (!account) return;

    const updatedTasks = (account.tasks || []).map(t => 
      t.id === taskId ? { ...t, ...updates } : t
    );

    onUpdateAccount({ ...account, tasks: updatedTasks });
  };

  const handleDeleteTask = (accountId: string, taskId: string) => {
    const account = accounts.find(a => a.id === accountId);
    if (!account) return;

    const updatedTasks = (account.tasks || []).filter(t => t.id !== taskId);
    onUpdateAccount({ ...account, tasks: updatedTasks });
  };

  const handleDraftEmail = (task: any) => {
    if (task.accountId) {
      onNavigateToAccount(task.accountId, 'canvas', { 
        initialCanvasMode: 'email', 
        initialInstruction: `Draft an email regarding: "${task.description}". Due date: ${task.dueDate || 'ASAP'}` 
      });
    }
  };

  const handleDeleteAllCompleted = () => {
    if (!confirm("Are you sure you want to remove all completed tasks from view?")) return;
    
    // We need to batch updates per account to avoid race conditions if doing it sequentially
    // However, onUpdateAccount handles one account at a time.
    // We'll iterate accounts that have completed tasks.
    accounts.forEach(acc => {
      if (acc.tasks?.some(t => t.isCompleted)) {
        const cleanedTasks = acc.tasks.filter(t => !t.isCompleted);
        onUpdateAccount({ ...acc, tasks: cleanedTasks });
      }
    });
  };

  const handleQuickAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskDesc.trim() || !newTaskAccount) return;

    const account = accounts.find(a => a.id === newTaskAccount);
    if (!account) return;

    const newTask: Task = {
      id: crypto.randomUUID(),
      description: newTaskDesc,
      dueDate: newTaskDate || undefined,
      isCompleted: false,
      priority: newTaskPriority
    };

    onUpdateAccount({ ...account, tasks: [newTask, ...(account.tasks || [])] });
    setNewTaskDesc('');
    setNewTaskDate('');
    setNewTaskPriority('Medium');
  };

  const handleGlobalScan = async () => {
    setIsScanning(true);
    let tasksFound = 0;

    try {
      // Iterate all accounts, checking only the LATEST log for efficiency
      for (const account of accounts) {
        const lastLog = account.communicationLogs?.[0];
        if (!lastLog) continue;

        // Skip if log is very old (> 7 days) to save tokens, or implement specific logic
        const logDate = new Date(lastLog.date);
        const daysDiff = (new Date().getTime() - logDate.getTime()) / (1000 * 3600 * 24);
        if (daysDiff > 7) continue;

        try {
          // Pass the log date as context
          const result = await geminiService.processInteraction(lastLog.content, 'User', lastLog.date);
          if (result.tasks && result.tasks.length > 0) {
            // Avoid duplicate tasks (simple check by description)
            const existingDescriptions = new Set((account.tasks || []).map(t => t.description.toLowerCase()));
            const newUniqueTasks = result.tasks
              .filter((t: any) => !existingDescriptions.has(t.description.toLowerCase()))
              .map((t: any) => ({
                id: crypto.randomUUID(),
                description: t.description,
                dueDate: t.dueDate,
                isCompleted: false,
                priority: t.priority || 'Medium'
              }));
            
            if (newUniqueTasks.length > 0) {
              tasksFound += newUniqueTasks.length;
              onUpdateAccount({
                ...account,
                tasks: [...newUniqueTasks, ...(account.tasks || [])]
              });
            }
          }
        } catch (e) {
          console.warn(`Failed to scan account ${account.name}`, e);
        }
      }
      alert(`Global Scan Complete! Found ${tasksFound} new tasks from recent interactions.`);
    } catch (error) {
      alert("Scan failed. Please try again.");
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300 pb-24">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">Global Task Force</h2>
          <p className="text-slate-500 font-medium">Manage execution across {accounts.length} accounts.</p>
        </div>
        <div className="flex gap-2">
           <div className="bg-white p-1 rounded-xl border border-slate-200 flex items-center shadow-sm">
             <div className="px-3 text-slate-400 border-r border-slate-100">
               <Filter size={16} />
             </div>
             <select 
               className="bg-transparent text-sm font-bold text-slate-700 px-3 py-1.5 outline-none cursor-pointer"
               value={filterAccountId}
               onChange={(e) => setFilterAccountId(e.target.value)}
             >
               <option value="all">All Accounts</option>
               {accounts.map(acc => (
                 <option key={acc.id} value={acc.id}>{acc.name}</option>
               ))}
             </select>
           </div>
           
           <Button onClick={handleGlobalScan} disabled={isScanning} className="bg-indigo-600">
             {isScanning ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
             {isScanning ? 'Scanning Logs...' : 'Scan All Inputs'}
           </Button>
        </div>
      </div>

      {/* Main Card */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        
        {/* Quick Add Bar */}
        <form onSubmit={handleQuickAdd} className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col md:flex-row gap-3 items-center">
          <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center shrink-0">
            <Plus size={18} />
          </div>
          
          <input 
            type="text" 
            placeholder="Add a new task..." 
            className="flex-1 bg-white border border-slate-200 px-4 py-2 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
            value={newTaskDesc}
            onChange={(e) => setNewTaskDesc(e.target.value)}
          />

          <div className="relative w-full md:w-48">
             <Building2 size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
             <select
               className="w-full bg-white border border-slate-200 pl-9 pr-3 py-2 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 appearance-none"
               value={newTaskAccount}
               onChange={(e) => setNewTaskAccount(e.target.value)}
               required
             >
               <option value="" disabled>Select Account...</option>
               {accounts.map(acc => (
                 <option key={acc.id} value={acc.id}>{acc.name}</option>
               ))}
             </select>
          </div>

          <div className="relative w-full md:w-32">
            <button 
              type="button"
              onClick={() => setNewTaskPriority(prev => prev === 'High' ? 'Medium' : 'High')}
              className={`w-full flex items-center justify-center gap-2 border px-3 py-2 rounded-xl text-sm font-bold transition-all ${
                newTaskPriority === 'High' ? 'bg-amber-50 text-amber-600 border-amber-200' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
              }`}
            >
              <Star size={14} fill={newTaskPriority === 'High' ? "currentColor" : "none"} />
              {newTaskPriority === 'High' ? 'High' : 'Normal'}
            </button>
          </div>

          <div className="relative w-full md:w-40">
            <input
              type="date"
              className="w-full bg-white border border-slate-200 px-3 py-2 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 text-slate-600"
              value={newTaskDate}
              onChange={(e) => setNewTaskDate(e.target.value)}
            />
          </div>

          <button 
            type="submit"
            disabled={!newTaskDesc.trim() || !newTaskAccount}
            className="w-full md:w-auto px-4 py-2 bg-slate-900 text-white rounded-xl text-sm font-bold hover:bg-slate-700 disabled:opacity-50 transition-colors"
          >
            Add
          </button>
        </form>

        {/* Active Tasks Table */}
        <div className="overflow-x-auto min-h-[300px]">
          {activeTasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-16 h-16 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mb-4">
                <CheckCircle2 size={32} />
              </div>
              <h3 className="text-lg font-bold text-slate-800">All Caught Up!</h3>
              <p className="text-slate-400 text-sm max-w-xs mt-2">
                No active tasks found. Use "Scan All Inputs" to find missed action items from your calls.
              </p>
            </div>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="bg-white border-b border-slate-100">
                <tr>
                  <th className="px-6 py-3 font-bold text-slate-400 text-[10px] uppercase tracking-wider w-12">Done</th>
                  <th className="px-6 py-3 font-bold text-slate-400 text-[10px] uppercase tracking-wider">Task Description</th>
                  <th className="px-6 py-3 font-bold text-slate-400 text-[10px] uppercase tracking-wider w-48">Account</th>
                  <th className="px-6 py-3 font-bold text-slate-400 text-[10px] uppercase tracking-wider w-40">Due Date</th>
                  <th className="px-6 py-3 font-bold text-slate-400 text-[10px] uppercase tracking-wider w-24 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {activeTasks.map(task => (
                  <tr key={task.id} className={`group transition-colors ${task.priority === 'High' ? 'bg-amber-50/30 hover:bg-amber-50/50' : 'hover:bg-slate-50/80'}`}>
                    <td className="px-6 py-4 align-top pt-5">
                      <button 
                        onClick={() => handleUpdateTask(task.accountId, task.id, { isCompleted: true })}
                        className="text-slate-300 hover:text-emerald-500 transition-colors"
                      >
                        <Circle size={20} />
                      </button>
                    </td>
                    <td className="px-6 py-4 align-top">
                      <div className="flex gap-3">
                        <button
                          onClick={() => handleUpdateTask(task.accountId, task.id, { priority: task.priority === 'High' ? 'Medium' : 'High' })}
                          className={`mt-1 shrink-0 transition-colors ${task.priority === 'High' ? 'text-amber-500' : 'text-slate-200 group-hover:text-slate-300 hover:text-amber-400'}`}
                          title="Toggle Priority"
                        >
                          <Star size={16} fill={task.priority === 'High' ? "currentColor" : "none"} />
                        </button>
                        <AutoResizeTextarea 
                          className="w-full bg-transparent outline-none text-slate-700 font-medium placeholder-slate-300 resize-none overflow-hidden leading-relaxed py-0.5"
                          value={task.description}
                          onChange={(e) => handleUpdateTask(task.accountId, task.id, { description: e.target.value })}
                        />
                      </div>
                    </td>
                    <td className="px-6 py-4 align-top pt-5">
                      <div className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                        <span className="text-xs font-bold text-slate-600 truncate max-w-[150px]">{task.accountName}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 align-top pt-5">
                      <div className="flex items-center gap-2 text-slate-500">
                        <Calendar size={14} />
                        <input 
                          type="date"
                          className="bg-transparent outline-none text-xs font-medium w-full"
                          value={task.dueDate || ''}
                          onChange={(e) => handleUpdateTask(task.accountId, task.id, { dueDate: e.target.value })}
                        />
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right align-top pt-4">
                      <div className="flex justify-end items-center gap-1">
                        {task.accountId && (
                          <button 
                            onClick={() => handleDraftEmail(task)}
                            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                            title="Draft Email with AI"
                          >
                            <Mail size={16} />
                          </button>
                        )}
                        <button 
                          onClick={() => handleDeleteTask(task.accountId, task.id)}
                          className="text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all p-1.5"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Completed Section */}
      {completedTasks.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between px-2">
            <button 
              onClick={() => setShowCompleted(!showCompleted)}
              className="flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-indigo-600 transition-colors"
            >
              <CheckCircle2 size={16} />
              {showCompleted ? 'Hide' : 'Show'} Completed ({completedTasks.length})
            </button>
            
            {showCompleted && (
              <button 
                onClick={handleDeleteAllCompleted}
                className="text-xs font-bold text-rose-600 hover:bg-rose-50 px-3 py-1.5 rounded-lg transition-colors"
              >
                Clear History
              </button>
            )}
          </div>

          {showCompleted && (
            <div className="bg-slate-50 rounded-3xl border border-slate-200 overflow-hidden">
               <table className="w-full text-left text-sm opacity-60 hover:opacity-100 transition-opacity">
                 <tbody className="divide-y divide-slate-200/50">
                    {completedTasks.map(task => (
                      <tr key={task.id} className="hover:bg-slate-100/50">
                        <td className="px-6 py-3 w-12 align-top pt-4">
                          <button 
                            onClick={() => handleUpdateTask(task.accountId, task.id, { isCompleted: false })}
                            className="text-emerald-500 hover:text-slate-400 transition-colors"
                          >
                            <CheckCircle2 size={20} />
                          </button>
                        </td>
                        <td className="px-6 py-3 align-top">
                          <div className="flex gap-2">
                            {task.priority === 'High' && (
                                <Star size={14} className="mt-1 text-amber-500 fill-amber-500 shrink-0" />
                            )}
                            <span className="line-through text-slate-500">{task.description}</span>
                          </div>
                        </td>
                        <td className="px-6 py-3 w-48 text-xs text-slate-400 align-top pt-4">
                          {task.accountName}
                        </td>
                        <td className="px-6 py-3 w-40 text-xs text-slate-400 align-top pt-4">
                          {task.dueDate || '-'}
                        </td>
                        <td className="px-6 py-3 w-24"></td>
                      </tr>
                    ))}
                 </tbody>
               </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TasksView;
