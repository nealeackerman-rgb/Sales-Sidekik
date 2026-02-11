import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { Textarea } from '../common/Textarea';
import { OrgContact } from '../../types';
import { Trash2, UserPlus, Save } from 'lucide-react';

interface EditStakeholderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (contact: OrgContact) => void;
  onDelete?: (id: string) => void;
  contact?: OrgContact | null;
  allContacts: OrgContact[];
}

export const EditStakeholderModal: React.FC<EditStakeholderModalProps> = ({
  isOpen,
  onClose,
  onSave,
  onDelete,
  contact,
  allContacts
}) => {
  const [formData, setFormData] = useState<OrgContact>({
    id: '',
    name: '',
    title: '',
    role: 'Unknown',
    sentiment: 'Neutral',
    managerId: '',
    notes: '',
    linkedIn: ''
  });

  useEffect(() => {
    if (contact) {
      setFormData(contact);
    } else {
      setFormData({
        id: crypto.randomUUID(),
        name: '',
        title: '',
        role: 'Unknown',
        sentiment: 'Neutral',
        managerId: '',
        notes: '',
        linkedIn: ''
      });
    }
  }, [contact, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.title) return alert("Name and Title are required.");
    onSave(formData);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={contact ? "Edit Stakeholder" : "Add Stakeholder"}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input 
          label="Full Name" 
          value={formData.name} 
          onChange={(e) => setFormData({ ...formData, name: e.target.value })} 
          placeholder="e.g. Sarah Jenkins"
          required
        />
        <Input 
          label="Title" 
          value={formData.title} 
          onChange={(e) => setFormData({ ...formData, title: e.target.value })} 
          placeholder="e.g. VP of Operations"
          required
        />
        
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Buying Role</label>
            <select 
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500"
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
            >
              <option value="Champion">Champion</option>
              <option value="Economic Buyer">Economic Buyer</option>
              <option value="Blocker">Blocker</option>
              <option value="Influencer">Influencer</option>
              <option value="User">User</option>
              <option value="Unknown">Unknown</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Sentiment</label>
            <select 
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500"
              value={formData.sentiment}
              onChange={(e) => setFormData({ ...formData, sentiment: e.target.value as any })}
            >
              <option value="Positive">Positive</option>
              <option value="Neutral">Neutral</option>
              <option value="Negative">Negative</option>
              <option value="Unknown">Unknown</option>
            </select>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Reports To</label>
          <select 
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500"
            value={formData.managerId || ''}
            onChange={(e) => setFormData({ ...formData, managerId: e.target.value })}
          >
            <option value="">No Manager (Root)</option>
            {allContacts
              .filter(c => c.id !== formData.id)
              .map(c => (
                <option key={c.id} value={c.id}>{c.name} ({c.title})</option>
              ))
            }
          </select>
        </div>

        <Input 
          label="LinkedIn URL" 
          value={formData.linkedIn || ''} 
          onChange={(e) => setFormData({ ...formData, linkedIn: e.target.value })} 
          placeholder="https://linkedin.com/in/..."
        />

        <Textarea 
          label="Strategic Notes" 
          value={formData.notes || ''} 
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })} 
          rows={3}
          placeholder="e.g. 'Highly focused on ROI metrics', 'Worked with our competitor before'..."
        />

        <div className="flex gap-3 pt-2">
          {contact && onDelete && (
            <Button type="button" variant="danger" onClick={() => onDelete(contact.id)}>
              <Trash2 size={18} />
            </Button>
          )}
          <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button type="submit" className="flex-1">
            <Save size={18} />
            {contact ? 'Update' : 'Save'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};