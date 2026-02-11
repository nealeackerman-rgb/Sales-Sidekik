
import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Textarea } from '../common/Textarea';
import { Sparkles, Loader2, Wand2 } from 'lucide-react';
import { geminiService } from '../../services/geminiService';

interface RefineWithAIModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentContent: string;
  onRefined: (newContent: string) => void;
  contextTitle: string;
}

export const RefineWithAIModal: React.FC<RefineWithAIModalProps> = ({
  isOpen,
  onClose,
  currentContent,
  onRefined,
  contextTitle
}) => {
  const [instructions, setInstructions] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleRefine = async () => {
    if (!instructions.trim()) return;
    setIsLoading(true);
    try {
      const prompt = `
Context: Refining content for "${contextTitle}".
Current Content:
${currentContent}

User's Refinement Request:
${instructions}

Task: Update the current content based on the instructions. Keep the style professional and strategic. Output ONLY the updated content in Markdown.
`;
      const response = await geminiService.generateContent(prompt, "You are a master of sales communication and strategy refinement.");
      onRefined(response.text);
      setInstructions('');
      onClose();
    } catch (error) {
      alert("Refinement failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Refine with AI">
      <div className="space-y-6">
        <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100 flex gap-3">
          <Wand2 className="text-indigo-600 shrink-0" size={20} />
          <p className="text-sm text-indigo-700 font-medium">
            Sidekik will rewrite your current selection based on your specific directions.
          </p>
        </div>

        <Textarea
          label="What would you like to change?"
          placeholder="e.g. 'Make it more executive-focused', 'Add a section about their cloud strategy', 'Make it more concise'..."
          rows={4}
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
        />

        <div className="flex gap-3">
          <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button className="flex-1" onClick={handleRefine} disabled={isLoading || !instructions.trim()}>
            {isLoading ? <Loader2 className="animate-spin" size={18} /> : <Sparkles size={18} />}
            {isLoading ? 'Processing...' : 'Refine Content'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
