import React, { useState, useEffect } from 'react';
import { 
  CheckSquare, 
  Sparkles, 
  Plus, 
  ShieldAlert, 
  Lightbulb, 
  Circle, 
  Loader2, 
  Trash2,
  RefreshCw,
  Activity,
  Star,
  Calendar
} from 'lucide-react';
import { Account, Frameworks, SellerInfo, Task } from '../../types';
import { geminiService } from '../../services/geminiService';
import { Button } from '../common/Button';

interface DealDashboardTabProps {
  account: Account;
  frameworks: Frameworks;
  sellerInfo: SellerInfo;
  onUpdateAccount: (updatedAccount: Account) => void;
}

const DealDashboardTab: React.FC<DealDashboardTabProps> = ({ 
  account, 
  frameworks, 
  sellerInfo,
  onUpdateAccount 
}) => {
  // --- Task State ---
  const [newTaskDesc, setNewTaskDesc] = useState('');
  const [isScanningTasks, setIsScanningTasks] = useState(false);

  // --- Strategy State ---
  const [isStrategizing, setIsStrategizing] = useState(false);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);

  // Auto-generate summary if missing on mount
  useEffect(() => {
    if (!account.aiSummary && !isGeneratingSummary && account.communicationLogs && account.communicationLogs.length > 0) {
      handleRefreshSummary();
    }
  }, [account.id]);

  // Custom ID Generator to prevent duplicate IDs in batch operations
  const generateId = () => {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
  };

  // --- Handlers: Tasks ---

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskDesc.trim()) return;

    const newTask: Task = {
      id: generateId(),
      description: newTaskDesc,
      dueDate: new Date().toISOString().split('T')[0], // Default to today
      isCompleted: false,
      priority: 'Medium'
    };

    onUpdateAccount({
      ...account,
      tasks: [newTask, ...(account.tasks || [])]
    });
    setNewTaskDesc('');
  };

  const updateTask = (taskId: string, updates: Partial<Task>) => {
    const updatedTasks = (account.tasks || []).map((t: Task) => 
      t.id === taskId ? { ...t, ...updates } : t
    );
    onUpdateAccount({ ...account, tasks: updatedTasks });
  };

  const deleteTask = (taskId: string) => {
    const updatedTasks = (account.tasks || []).filter((t: Task) => t.id !== taskId);
    onUpdateAccount({ ...account, tasks: updatedTasks });
  };

  const extractTasksFromLastCall = async () => {
    const lastLog = account.communicationLogs?.[0];
    if (!lastLog) {
      alert("No communication logs found. Add a note or transcript first.");
      return;
    }

    // Guardrail: 60 Days
    const logDate = new Date(lastLog.date);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - logDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays > 60) {
      alert(`This interaction is ${diffDays} days old. Task extraction is disabled for logs older than 60 days to prevent stale tasks.`);
      return;
    }

    setIsScanningTasks(true);
    try {
      const extracted = await geminiService.extractNextStepsFromLog(lastLog.content, account.id, account.name, lastLog.date);
      
      // Filter out duplicates based on description text
      const existingDesc = new Set((account.tasks || []).map((t: Task) => t.description));
      const newUnique = extracted.filter((t: any) => !existingDesc.has(t.description));

      if (newUnique.length > 0) {
        // Map to ensure completely new objects with unique IDs
        const tasksToAdd: Task[] = newUnique.map((t: any) => ({
            id: generateId(),
            description: t.description,
            dueDate: t.dueDate || undefined,
            priority: 'Medium',
            isCompleted: false
        }));

        onUpdateAccount({
          ...account,
          tasks: [...tasksToAdd, ...(account.tasks || [])]
        });
      } else {
        alert("No new unique tasks found in the last log.");
      }
    } catch (error) {
      alert("Failed to extract tasks.");
    } finally {
      setIsScanningTasks(false);
    }
  };

  // --- Handlers: Strategy ---

  const generateStrategy = async () => {
    setIsStrategizing(true);
    try {
      // Create a context string of all frameworks
      const fwContext = Object.entries(frameworks)
        .map(([k, v]) => `${k}:\n${v}`)
        .join('\n\n');

      const recommendations = await geminiService.generateDealStrategy(account, fwContext);
      
      onUpdateAccount({
        ...account,
        dealStrategy: {
          recommendations,
          lastAnalysisDate: new Date().toISOString()
        }
      });
    } catch (error) {
      alert("Strategy generation failed.");
    } finally {
      setIsStrategizing(false);
    }
  };

  const handleRefreshSummary = async () => {
    setIsGeneratingSummary(true);
    try {
      const summaryText = await geminiService.generateAccountStatusSummary(account);
      onUpdateAccount({
        ...account,
        aiSummary: {
          text: summaryText,
          lastUpdated: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error("Summary failed", error);
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  // --- Render ---

  const activeTasks = (account.tasks || []).filter((t: Task) => !t.isCompleted);
  const recommendations = account.dealStrategy?.recommendations || [];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300 pb-20">
      
      {/* Executive Pulse Summary Card */}
      <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-6 relative overflow-hidden shadow-sm">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/40 rounded-full -mr-16 -mt-16 blur-2xl"></div>
        <div className="flex justify-between items-start mb-2 relative z-10">
          <div className="flex items-center gap-2 text-indigo-800 font-bold">
            <Activity size={18} />
            <h3>Executive Pulse Check</h3>
          </div>
          <button 
            onClick={handleRefreshSummary} 
            disabled={isGeneratingSummary}
            className="p-1.5 text-indigo-400 hover:text-indigo-700 hover:bg-white/50 rounded-lg transition-colors"
            title="Refresh Summary based on recent logs"
          >
            <RefreshCw size={14} className={isGeneratingSummary ? 'animate-spin' : ''} />
          </button>
        </div>
        <div className="relative z-10">
          {isGeneratingSummary ? (
            <div className="flex items-center gap-2 text-indigo-600 text-sm">
              <Loader2 size={16} className="animate-spin" /> Analyzing recent context...
            </div>
          ) : (
            <p className="text-indigo-900 text-sm md:text-base font-medium leading-relaxed">
              {account.aiSummary?.text || "No summary available. Log recent interactions to generate a status pulse."}
            </p>
          )}
          {account.aiSummary && (
            <p className="text-[10px] text-indigo-400 mt-2 font-bold uppercase tracking-wider">
              Updated: {new Date(account.aiSummary.lastUpdated).toLocaleTimeString()}
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 min-h-[600px]">
        
        {/* Column 1: Next Steps */}
        <div className="flex flex-col bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <CheckSquare size={18} className="text-emerald-600" />
              Tactical Next Steps
            </h3>
            <span className="text-xs font-bold bg-white border border-slate-200 px-2 py-0.5 rounded-full text-slate-500">
              {activeTasks.length} Active
            </span>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {/* Quick Add Form */}
            <form onSubmit={handleAddTask} className="flex gap-2 mb-4">
              <input 
                type="text" 
                placeholder="Add step..." 
                className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                value={newTaskDesc}
                onChange={(e) => setNewTaskDesc(e.target.value)}
              />
              <button 
                type="submit" 
                disabled={!newTaskDesc.trim()}
                className="bg-slate-900 text-white p-2 rounded-lg hover:bg-slate-700 disabled:opacity-50 transition-colors"
              >
                <Plus size={18} />
              </button>
            </form>

            {/* AI Extract Button */}
            {account.communicationLogs && account.communicationLogs.length > 0 && (
               <Button 
                 variant="ai" 
                 className="w-full text-xs py-2 mb-2" 
                 onClick={extractTasksFromLastCall} 
                 disabled={isScanningTasks}
               >
                 {isScanningTasks ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                 Extract from Last Call
               </Button>
            )}

            {/* Task List */}
            {activeTasks.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-xs italic">
                No active tasks. You're all caught up!
              </div>
            ) : (
              activeTasks.map(task => (
                <div key={task.id} className="group flex items-start gap-3 p-3 bg-white border border-slate-100 rounded-xl hover:border-indigo-200 hover:shadow-sm transition-all relative">
                  <button 
                    onClick={() => updateTask(task.id, { isCompleted: true })}
                    className="mt-1 text-slate-300 hover:text-emerald-500 transition-colors"
                  >
                    <Circle size={18} />
                  </button>
                  
                  <div className="flex-1 min-w-0 space-y-2">
                    {/* Editable Description */}
                    <input 
                      className="text-sm text-slate-700 font-medium leading-snug w-full bg-transparent outline-none border-b border-transparent focus:border-indigo-200 transition-all placeholder-slate-300"
                      value={task.description}
                      onChange={(e) => updateTask(task.id, { description: e.target.value })}
                      placeholder="Task description..."
                    />
                    
                    <div className="flex items-center gap-3">
                      {/* Priority Toggle */}
                      <button 
                        onClick={() => updateTask(task.id, { priority: task.priority === 'High' ? 'Medium' : 'High' })}
                        className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-bold border transition-colors ${
                          task.priority === 'High' 
                            ? 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100' 
                            : 'bg-slate-50 text-slate-400 border-slate-200 hover:text-slate-600 hover:border-slate-300'
                        }`}
                        title="Toggle High Priority"
                      >
                        <Star size={12} className={task.priority === 'High' ? 'fill-amber-500 text-amber-500' : ''} />
                        {task.priority === 'High' ? 'High Priority' : 'Normal'}
                      </button>

                      {/* Editable Date */}
                      <div className="flex items-center gap-1.5 text-slate-400 group-focus-within:text-indigo-500 transition-colors">
                        <Calendar size={12} />
                        <input 
                          type="date"
                          className="bg-transparent outline-none text-[10px] font-bold uppercase tracking-wider cursor-pointer w-24 text-slate-500 hover:text-indigo-600 focus:text-indigo-600"
                          value={task.dueDate || ''}
                          onChange={(e) => updateTask(task.id, { dueDate: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>

                  <button 
                    onClick={() => deleteTask(task.id)}
                    className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-rose-500 transition-all p-1"
                    title="Delete Task"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Column 2: Strategic Blindspots */}
        <div className="flex flex-col bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <ShieldAlert size={18} className="text-rose-500" />
              Strategic Blindspots
            </h3>
            <Button 
              variant="outline" 
              className="h-7 px-2 text-xs" 
              onClick={generateStrategy} 
              disabled={isStrategizing}
            >
              {isStrategizing ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
              {isStrategizing ? 'Analyzing...' : 'Analyze'}
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50">
            {recommendations.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-center p-6">
                <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mb-4 text-slate-300 shadow-sm">
                  <Lightbulb size={24} />
                </div>
                <p className="text-sm font-bold text-slate-600">No strategy generated yet.</p>
                <p className="text-xs text-slate-400 mt-2">
                  Click "Analyze" to have Sidekik compare your deal progress against your frameworks to find gaps.
                </p>
              </div>
            ) : (
              recommendations.map((rec, i) => (
                <div key={i} className="bg-white p-4 rounded-xl border-l-4 border-l-rose-500 border-y border-r border-slate-200 shadow-sm">
                  <div className="flex items-start gap-2 mb-2">
                    <ShieldAlert size={14} className="text-rose-500 shrink-0 mt-0.5" />
                    <h4 className="text-xs font-black text-rose-600 uppercase tracking-wider">{rec.blindspot || "Strategic Gap"}</h4>
                  </div>
                  
                  <p className="text-sm font-bold text-slate-800 mb-3">{rec.action || "Consult with leadership."}</p>
                  
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                    <p className="text-xs text-slate-600 italic leading-relaxed">
                      <span className="font-bold text-indigo-600 not-italic mr-1">Coach:</span> 
                      "{rec.howTo || "Check interaction logs for missing framework elements."}"
                    </p>
                  </div>
                </div>
              ))
            )}
            
            {recommendations.length > 0 && (
               <p className="text-[10px] text-slate-400 text-center pt-4">
                 Last analyzed: {new Date(account.dealStrategy!.lastAnalysisDate).toLocaleDateString()}
               </p>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default DealDashboardTab;