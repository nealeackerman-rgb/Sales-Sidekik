
import React from 'react';

interface FormattedOutputProps {
  content: string;
  className?: string;
}

export const FormattedOutput: React.FC<FormattedOutputProps> = ({ content, className = '' }) => {
  if (!content) return null;
  
  // Split lines but keep them for processing
  const lines = content.split('\n');
  
  const parseInline = (text: string) => {
    // 1. Split by Bold (**text**)
    const parts = text.split(/(\*\*.*?\*\*)/g);
    
    return parts.map((part, index) => {
        // Handle Bold
        if (part.startsWith('**') && part.endsWith('**')) {
            return <strong key={index} className="font-bold text-slate-900">{part.slice(2, -2)}</strong>;
        }
        
        // Handle Italic (*text*)
        const subParts = part.split(/(\*.*?\*)/g); 
        
        return (
            <span key={index}>
                {subParts.map((subPart, subIndex) => {
                    // Italic Match
                    if (subPart.startsWith('*') && subPart.endsWith('*') && subPart.length > 2 && !subPart.includes(' ')) { 
                        // Strict check to avoid matching list bullets if logic fails elsewhere, 
                        // though here we are usually safe inside a line.
                        // Actually standard markdown allows spaces in italics " *like this* ".
                        return <em key={subIndex} className="italic text-slate-700">{subPart.slice(1, -1)}</em>;
                    } else if (subPart.startsWith('*') && subPart.endsWith('*') && subPart.length > 2) {
                         return <em key={subIndex} className="italic text-slate-700">{subPart.slice(1, -1)}</em>;
                    }

                    // Handle Links [Title](url)
                    // We simply check if the string contains a link pattern
                    const linkMatch = subPart.match(/\[(.*?)\]\((.*?)\)/);
                    if (linkMatch) {
                        const [full, label, url] = linkMatch;
                        const pre = subPart.split(full)[0];
                        const post = subPart.split(full)[1];
                        return (
                            <React.Fragment key={subIndex}>
                                {pre}
                                <a href={url} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline font-medium">{label}</a>
                                {post}
                            </React.Fragment>
                        );
                    }
                    
                    // Handle raw URLs
                    if (subPart.match(/^https?:\/\//)) {
                         return <a key={subIndex} href={subPart} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">{subPart}</a>
                    }

                    return subPart;
                })}
            </span>
        );
    });
  };

  return (
    <div className={`text-[15px] text-slate-600 leading-relaxed space-y-3 ${className}`}>
      {lines.map((line, i) => {
        const trimmed = line.trim();
        
        // Skip empty lines or lines that are just a bullet point (AI artifact)
        if (!trimmed) return <div key={i} className="h-2" />;
        if (trimmed === '•' || trimmed === '-') return null; 

        // Headers
        if (trimmed.startsWith('#### ')) return <h4 key={i} className="text-[15px] font-bold text-indigo-700 mt-4 mb-2 uppercase tracking-wide flex items-center gap-2">{parseInline(trimmed.replace(/^####\s+/, ''))}</h4>;
        if (trimmed.startsWith('### ')) return <h3 key={i} className="text-[17px] font-bold text-indigo-900 mt-6 mb-2">{parseInline(trimmed.replace(/^###\s+/, ''))}</h3>;
        if (trimmed.startsWith('## ')) return <h2 key={i} className="text-[20px] font-bold text-slate-800 mt-8 mb-3 pb-2 border-b border-slate-100">{parseInline(trimmed.replace(/^##\s+/, ''))}</h2>;
        if (trimmed.startsWith('# ')) return <h1 key={i} className="text-[24px] font-black text-slate-900 mt-8 mb-4">{parseInline(trimmed.replace(/^#\s+/, ''))}</h1>;

        // Blockquotes (Handle > text)
        if (trimmed.startsWith('>')) {
             const quoteContent = trimmed.replace(/^>\s*/, '');
             // If empty, ignore (cleans up stray > characters)
             if (!quoteContent) return null;
             return <blockquote key={i} className="border-l-4 border-indigo-200 pl-4 py-2 italic text-slate-500 my-3 bg-slate-50/50 rounded-r-lg">{parseInline(quoteContent)}</blockquote>
        }

        // Unordered Lists
        if (trimmed.match(/^[-*•]\s+/)) {
            return (
                <div key={i} className="flex items-start ml-2 mb-1">
                    <span className="mr-2 text-indigo-500 font-bold mt-1.5 text-[10px]">•</span>
                    <div className="flex-1">{parseInline(trimmed.replace(/^[-*•]\s+/, ''))}</div>
                </div>
            );
        }

        // Numbered Lists
        const numMatch = trimmed.match(/^(\d+)\.\s+/);
        if (numMatch) {
             return (
                <div key={i} className="flex items-start ml-2 mb-1">
                    <span className="mr-2 text-indigo-600 font-bold min-w-[20px]">{numMatch[1]}.</span>
                    <div className="flex-1">{parseInline(trimmed.replace(/^\d+\.\s+/, ''))}</div>
                </div>
             );
        }

        // Horizontal Rule
        if (trimmed === '---' || trimmed === '***') {
            return <hr key={i} className="my-6 border-slate-200" />;
        }

        // Standard Paragraph
        return <p key={i} className="mb-2">{parseInline(trimmed)}</p>;
      })}
    </div>
  );
};
