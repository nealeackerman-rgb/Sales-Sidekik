
import React from 'react';

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
}

export const Textarea: React.FC<TextareaProps> = ({ label, className = '', ...props }) => (
  <div className="space-y-1.5 w-full">
    {label && <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">{label}</label>}
    <textarea
      className={`w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white focus:border-indigo-500 outline-none transition-all resize-none ${className}`}
      {...props}
    />
  </div>
);
