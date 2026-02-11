
import React from 'react';

export const Logo: React.FC = () => {
  return (
    <div className="flex items-center gap-3 cursor-pointer group">
      {/* LOGO ICON */}
      <div className="relative flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/30 transition-all duration-300 group-hover:scale-105 group-hover:shadow-blue-500/50">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6">
          <path fillOpacity="0.7" d="M3 15a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1H4a1 1 0 01-1-1v-4z" />
          <path fillOpacity="0.85" d="M9 10a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H10a1 1 0 01-1-1v-9z" />
          <path d="M16.5 2.5a.5.5 0 01.5.5v2.85l2.85-.01a.5.5 0 01.35.86l-2.2 2.2.86 3.1a.5.5 0 01-.77.56L15.5 11l-2.59 1.56a.5.5 0 01-.77-.56l.86-3.1-2.2-2.2a.5.5 0 01.35-.86L14 5.85V3a.5.5 0 01.5-.5z" />
          <path fillRule="evenodd" d="M17 14a1 1 0 011 1v4a1 1 0 01-1 1h-2a1 1 0 01-1-1v-4a1 1 0 011-1h2z" clipRule="evenodd" />
        </svg>
      </div>

      {/* BRAND NAME & SUBTITLE */}
      <div className="flex flex-col leading-none">
        <span className="text-lg font-bold tracking-tight text-slate-900">
          Sales <span className="text-blue-600">Sidekik</span>
        </span>
        <span className="text-[10px] font-medium tracking-wider text-slate-500 uppercase">
          AI Assistant
        </span>
      </div>
    </div>
  );
};
