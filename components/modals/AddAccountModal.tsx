
import React, { useState, useEffect } from 'react';
import { X, Save, PlusCircle } from 'lucide-react';
import { Account } from '../../types';

interface AddAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (account: Partial<Account>) => void;
  initialName?: string;
}

const AddAccountModal: React.FC<AddAccountModalProps> = ({ isOpen, onClose, onSave, initialName }) => {
  const [formData, setFormData] = useState<{
    name: string;
    relationshipStatus: 'Prospect' | 'Customer' | 'Former Customer';
    renewalDate: string;
    currentSpend: string;
    currentProducts: string;
    dealStatus: 'Active' | 'None';
  }>({
    name: '',
    relationshipStatus: 'Prospect',
    renewalDate: '',
    currentSpend: '',
    currentProducts: '',
    dealStatus: 'None',
  });

  // Sync initialName when modal opens
  useEffect(() => {
    if (isOpen) {
      setFormData(prev => ({
        ...prev,
        name: initialName || '',
      }));
    }
  }, [isOpen, initialName]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return alert('Account name is required');
    
    onSave({
      id: crypto.randomUUID(),
      name: formData.name,
      relationshipStatus: formData.relationshipStatus,
      dealStatus: formData.dealStatus,
      // Revenue is intentionally omitted to be filled by AI or Spreadsheet View
      currentSpend: formData.relationshipStatus === 'Customer' ? `$${formData.currentSpend}` : undefined,
      renewalDate: formData.relationshipStatus === 'Customer' ? formData.renewalDate : undefined,
      currentProducts: formData.currentProducts,
      tier: 'Unassigned',
      tasks: [],
      communicationLogs: [],
    });
    
    // Reset form
    setFormData({ 
      name: '', 
      relationshipStatus: 'Prospect', 
      renewalDate: '', 
      currentSpend: '', 
      currentProducts: '', 
      dealStatus: 'None' 
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <PlusCircle className="text-indigo-600" size={24} />
            New Account
          </h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
            <X size={20} className="text-slate-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-slate-700">Account Name</label>
            <input
              autoFocus
              required
              type="text"
              placeholder="e.g. Acme Corp"
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 transition-all outline-none"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700">Relationship Status</label>
              <select
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 transition-all outline-none"
                value={formData.relationshipStatus}
                onChange={(e) => setFormData({ ...formData, relationshipStatus: e.target.value as any })}
              >
                <option value="Prospect">Prospect</option>
                <option value="Customer">Customer</option>
                <option value="Former Customer">Former Customer</option>
              </select>
            </div>
            {/* Revenue Input removed as requested */}
          </div>
          
          <div className="space-y-1.5">
             <label className="text-sm font-semibold text-slate-700">Initial Active Deal?</label>
             <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                   <input 
                     type="radio" 
                     name="dealStatus"
                     className="accent-indigo-600 w-4 h-4"
                     checked={formData.dealStatus === 'None'}
                     onChange={() => setFormData({...formData, dealStatus: 'None'})}
                   />
                   <span className="text-sm text-slate-600">No Active Deal</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                   <input 
                     type="radio" 
                     name="dealStatus"
                     className="accent-indigo-600 w-4 h-4"
                     checked={formData.dealStatus === 'Active'}
                     onChange={() => setFormData({...formData, dealStatus: 'Active'})}
                   />
                   <span className="text-sm text-indigo-700 font-bold">Active Deal</span>
                </label>
             </div>
          </div>

          <div className="space-y-1.5">
             <label className="text-sm font-semibold text-slate-700">Current Products</label>
             <input
                type="text"
                placeholder="e.g. None or 'Competitor X', 'Module A'"
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 transition-all outline-none"
                value={formData.currentProducts}
                onChange={(e) => setFormData({ ...formData, currentProducts: e.target.value })}
             />
          </div>

          {formData.relationshipStatus === 'Customer' && (
            <div className="grid grid-cols-2 gap-4 animate-in slide-in-from-top-2 duration-200 p-4 bg-emerald-50 rounded-xl border border-emerald-100">
               <div className="space-y-1.5">
                 <label className="text-xs font-bold text-emerald-700 uppercase">Current Spend</label>
                 <input
                   type="text"
                   placeholder="10,000"
                   className="w-full px-3 py-2 bg-white border border-emerald-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                   value={formData.currentSpend}
                   onChange={(e) => setFormData({ ...formData, currentSpend: e.target.value })}
                 />
               </div>
               <div className="space-y-1.5">
                 <label className="text-xs font-bold text-emerald-700 uppercase">Renewal Date</label>
                 <input
                   type="date"
                   className="w-full px-3 py-2 bg-white border border-emerald-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                   value={formData.renewalDate}
                   onChange={(e) => setFormData({ ...formData, renewalDate: e.target.value })}
                 />
               </div>
            </div>
          )}

          <div className="pt-4 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-lg shadow-indigo-200 transition-colors flex items-center justify-center gap-2"
            >
              <Save size={18} />
              Save Account
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddAccountModal;
