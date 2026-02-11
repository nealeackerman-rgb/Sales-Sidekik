
import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Textarea } from '../common/Textarea';
import { Sparkles, Loader2, Building2 } from 'lucide-react';
import { geminiService } from '../../services/geminiService';
import { Account, CommunicationLog, Task, SellerInfo } from '../../types';

interface AddInputModalProps {
  isOpen: boolean;
  onClose: () => void;
  accounts: Account[];
  sellerInfo: SellerInfo;
  onUpdateAccount: (updatedAccount: Account) => void;
}

export const AddInputModal: React.FC<AddInputModalProps> = ({
  isOpen,
  onClose,
  accounts,
  sellerInfo,
  onUpdateAccount
}) => {
  const [selectedAccountId, setSelectedAccountId] = useState(accounts[0]?.id || '');
  const [content, setContent] = useState('');
  const [type, setType] = useState<CommunicationLog['type']>('Sales Note');
  const [isLoading, setIsLoading] = useState(false);

  // Custom ID generator to prevent duplicate IDs in rapid batch creation
  const generateId = () => {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
  };

  const handleSubmit = async () => {
    const account = accounts.find(a => a.id === selectedAccountId);
    if (!account || !content.trim()) return;

    setIsLoading(true);
    try {
      const now = new Date().toISOString();
      // Pass 'now' as the context date since this is a quick-add "Just happened" input
      const result = await geminiService.processInteraction(content, sellerInfo.sellerName, now);
      
      const newLog: CommunicationLog = {
        date: now,
        content: content,
        type: type,
      };

      const newTasks: Task[] = result.tasks.map((t: any) => ({
        id: generateId(), // Use custom generator
        description: t.description,
        dueDate: t.dueDate,
        priority: t.priority || 'Medium',
        isCompleted: false
      }));

      onUpdateAccount({
        ...account,
        communicationLogs: [newLog, ...(account.communicationLogs || [])],
        tasks: [...newTasks, ...(account.tasks || [])]
      });

      setContent('');
      onClose();
      alert(`Sidekik analyzed the input for ${account.name} and found ${newTasks.length} tasks.`);
    } catch (error) {
      alert("Failed to process input.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Log Global Interaction">
      <div className="space-y-6">
        <div className="space-y-1.5">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Target Account</label>
          <div className="relative">
            <Building2 size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <select
              className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
              value={selectedAccountId}
              onChange={(e) => setSelectedAccountId(e.target.value)}
            >
              <option value="" disabled>Select an account...</option>
              {accounts.map(acc => (
                <option key={acc.id} value={acc.id}>{acc.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Type</label>
          <div className="flex bg-slate-100 p-1 rounded-xl gap-1">
            {(['Call', 'Email', 'Message', 'Sales Note'] as const).map(t => (
              <button
                key={t}
                onClick={() => setType(t)}
                className={`flex-1 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${
                  type === t ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <Textarea
          placeholder="What happened? Sidekik will find the tasks for you."
          rows={8}
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />

        <div className="flex gap-3 pt-2">
          <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button className="flex-1" onClick={handleSubmit} disabled={isLoading || !content.trim() || !selectedAccountId}>
            {isLoading ? <Loader2 className="animate-spin" size={18} /> : <Sparkles size={18} />}
            {isLoading ? 'Processing...' : 'Process with AI'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
