
import React from 'react';

export const Card: React.FC<{ children: React.ReactNode; className?: string; onClick?: () => void }> = ({ 
  children, 
  className = '', 
  onClick 
}) => (
  <div 
    onClick={onClick} 
    className={`bg-white rounded-2xl border border-slate-200 shadow-sm ${className}`}
  >
    {children}
  </div>
);
