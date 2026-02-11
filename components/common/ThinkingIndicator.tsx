
import React, { useState, useEffect } from 'react';
import { Sparkles, Loader2 } from 'lucide-react';

interface ThinkingIndicatorProps {
  customMessages?: string[];
  className?: string;
}

const DEFAULT_MESSAGES = [
  "Consulting your account data...",
  "Identifying key stakeholders...",
  "Checking for recent signals...",
  "Synthesizing AI recommendations..."
];

export const ThinkingIndicator: React.FC<ThinkingIndicatorProps> = ({ 
  customMessages, 
  className = '' 
}) => {
  const [msgIndex, setMsgIndex] = useState(0);
  const messages = customMessages && customMessages.length > 0 ? customMessages : DEFAULT_MESSAGES;

  useEffect(() => {
    const interval = setInterval(() => {
      setMsgIndex((prev) => (prev + 1) % messages.length);
    }, 2500);
    return () => clearInterval(interval);
  }, [messages.length]);

  return (
    <div className={`flex flex-col items-center justify-center space-y-3 ${className}`}>
      <div className="relative">
        <div className="absolute inset-0 bg-indigo-100 rounded-full animate-ping opacity-25"></div>
        <div className="relative bg-white p-3 rounded-full border border-indigo-100 shadow-sm flex items-center justify-center">
          <Sparkles className="text-indigo-600 animate-pulse" size={20} />
          <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5 shadow-sm">
             <Loader2 className="animate-spin text-slate-400" size={12} />
          </div>
        </div>
      </div>
      
      <p className="text-sm font-medium text-slate-600 animate-in fade-in slide-in-from-bottom-1 duration-500 key={msgIndex}">
        {messages[msgIndex]}
      </p>
    </div>
  );
};
