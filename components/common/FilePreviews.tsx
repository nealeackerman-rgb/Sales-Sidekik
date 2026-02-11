
import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Download, FileText, BarChart3, PieChart, Users, ArrowRight, LayoutTemplate, Image as ImageIcon } from 'lucide-react';
import { SlideData, DocData, SlideRegion } from '../../types';
import { Button } from './Button';

// --- Helper for Layout Rendering ---
const SlideContentRenderer: React.FC<{ slide: SlideData }> = ({ slide }) => {
  const layout = slide.layoutType || 'text';

  // 1. SPLIT LAYOUTS
  if (layout === 'split_left' || layout === 'split_right') {
    const isRight = layout === 'split_right';
    const textRegion = slide.regions?.[0];
    const imgRegion = slide.regions?.[1] || slide.regions?.[0]; // Fallback

    const TextSide = (
      <div className="flex-1 p-8 flex flex-col justify-center bg-white">
        {textRegion?.header && <h3 className="text-xl font-bold text-indigo-700 mb-4">{textRegion.header}</h3>}
        <ul className="space-y-3">
          {textRegion?.content.map((b, i) => (
            <li key={i} className="flex items-start text-slate-600 text-sm">
              <span className="mr-2 text-indigo-400 font-bold">•</span>
              {b}
            </li>
          )) || <p className="text-slate-400 italic">No text content</p>}
        </ul>
      </div>
    );

    const ImageSide = (
      <div className="flex-1 bg-slate-100 flex items-center justify-center border-l border-slate-200">
        {imgRegion?.imageUrl ? (
          <img src={imgRegion.imageUrl} alt="Slide visual" className="w-full h-full object-cover" />
        ) : (
          <div className="text-slate-300 flex flex-col items-center">
            <ImageIcon size={48} />
            <p className="text-xs font-bold mt-2 uppercase tracking-widest">Image Placeholder</p>
          </div>
        )}
      </div>
    );

    return (
      <div className="flex h-full w-full">
        {isRight ? ImageSide : TextSide}
        {isRight ? TextSide : ImageSide}
      </div>
    );
  }

  // 2. KPI DASHBOARD
  if (layout === 'kpi') {
    return (
      <div className="flex items-center justify-center h-full w-full gap-6 px-8">
        {slide.regions?.map((reg, i) => (
          <div key={i} className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl p-6 text-center shadow-sm">
            <div className="text-4xl font-black text-indigo-600 mb-2">{reg.header || "0"}</div>
            <div className="text-sm font-bold text-slate-600 uppercase tracking-wider">{reg.content[0] || "Metric"}</div>
          </div>
        ))}
      </div>
    );
  }

  // 3. CHARTS
  if (layout === 'chart_bar' || layout === 'chart_pie') {
    return (
      <div className="flex h-full w-full p-8 gap-8">
        <div className="w-1/3 flex flex-col justify-center space-y-4">
          <h3 className="font-bold text-slate-800 border-b border-slate-100 pb-2">Key Insights</h3>
          <ul className="space-y-2">
            {slide.chartData?.summary.map((s, i) => (
              <li key={i} className="text-sm text-slate-600 flex gap-2">
                <ArrowRight size={14} className="text-indigo-500 shrink-0 mt-1" /> {s}
              </li>
            ))}
          </ul>
        </div>
        <div className="flex-1 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-center relative overflow-hidden">
          {/* Mock Chart Visuals */}
          {layout === 'chart_bar' ? (
            <div className="flex items-end gap-4 h-48">
              {[40, 70, 50, 90, 60].map((h, i) => (
                <div key={i} className="w-8 bg-indigo-500 rounded-t-sm" style={{ height: `${h}%`, opacity: 0.5 + (i * 0.1) }}></div>
              ))}
            </div>
          ) : (
            <div className="w-48 h-48 rounded-full border-8 border-indigo-500 border-t-indigo-300 border-r-indigo-100 rotate-45"></div>
          )}
          <div className="absolute bottom-4 right-4 text-[10px] text-slate-400 font-mono bg-white px-2 py-1 rounded border border-slate-200">
            {layout === 'chart_bar' ? 'Bar Chart' : 'Pie Chart'} Data Visualization
          </div>
        </div>
      </div>
    );
  }

  // 4. TEAM
  if (layout === 'team') {
    return (
      <div className="flex items-center justify-center h-full w-full gap-8 px-8 flex-wrap content-center">
        {slide.regions?.map((member, i) => (
          <div key={i} className="flex flex-col items-center text-center w-32">
            <div className="w-20 h-20 rounded-full bg-slate-200 mb-3 flex items-center justify-center overflow-hidden">
               {member.imageUrl ? <img src={member.imageUrl} className="w-full h-full object-cover" /> : <Users size={24} className="text-slate-400" />}
            </div>
            <p className="font-bold text-slate-800 text-sm">{member.header}</p>
            <p className="text-xs text-slate-500 mt-1">{member.content[0]}</p>
          </div>
        ))}
      </div>
    );
  }

  // 5. PROCESS
  if (layout === 'process') {
    return (
      <div className="flex items-center justify-center h-full w-full px-8 gap-2">
        {slide.regions?.map((step, i) => (
          <div key={i} className="flex-1 flex items-center">
            <div className="flex-1 bg-indigo-600 text-white p-4 rounded-lg relative shadow-md">
               <div className="text-2xl font-black opacity-30 absolute top-1 right-2">{i+1}</div>
               <div className="font-bold text-sm mb-1">{step.header}</div>
               <div className="text-[10px] opacity-90">{step.content[0]}</div>
            </div>
            {i < (slide.regions?.length || 0) - 1 && (
              <div className="w-4 h-0.5 bg-indigo-200 shrink-0"></div>
            )}
          </div>
        ))}
      </div>
    );
  }

  // 6. DEFAULT / TEXT
  // Defensive check for bullets
  const bullets = slide.bullets || slide.regions?.flatMap(r => r.content) || [];
  
  if (bullets.length === 0) {
      return (
          <div className="flex flex-col items-center justify-center h-full text-slate-300">
              <LayoutTemplate size={48} strokeWidth={1} />
              <p className="mt-4 text-sm font-medium">Empty Slide Layout: {layout}</p>
          </div>
      )
  }

  return (
    <div className="p-12 bg-white flex-1 overflow-y-auto">
      <ul className="space-y-5">
        {bullets.map((b, i) => (
          <li key={i} className="flex items-start text-slate-700 text-lg leading-relaxed">
            <span className="mr-4 text-indigo-500 font-bold text-2xl leading-[1.2]">•</span>
            {b}
          </li>
        ))}
      </ul>
    </div>
  );
};

// --- Slide Preview Container ---
export const SlidePreview: React.FC<{ slides: SlideData[]; onDownload: () => void }> = ({ slides, onDownload }) => {
  const [index, setIndex] = useState(0);
  const slide = slides[index];

  if (!slide) return <div className="text-center p-10 text-slate-400">No slides generated</div>;

  return (
    <div className="flex flex-col items-center space-y-6 w-full max-w-4xl mx-auto animate-in fade-in zoom-in duration-300">
      
      {/* Slide Canvas */}
      <div className="relative w-full aspect-video bg-white shadow-2xl rounded-xl overflow-hidden border border-slate-200 flex flex-col ring-1 ring-slate-900/5">
        {/* Header Region */}
        <div className="h-[18%] bg-indigo-600 w-full px-10 flex items-center shrink-0 justify-between">
          <h2 className="text-white text-2xl font-bold truncate tracking-tight max-w-[80%]">{slide.title}</h2>
          <span className="text-[10px] text-indigo-200 font-mono bg-indigo-700/50 px-2 py-1 rounded uppercase">
            {slide.layoutType || 'Standard'}
          </span>
        </div>
        
        {/* Content Render Switch */}
        <div className="flex-1 relative overflow-hidden">
           <SlideContentRenderer slide={slide} />
        </div>
        
        {/* Speaker Notes Region */}
        <div className="bg-slate-50 border-t border-slate-100 p-4 text-xs text-slate-500 shrink-0 flex gap-2">
          <span className="font-black text-slate-400 uppercase tracking-wider shrink-0">Speaker Notes:</span>
          <span className="italic truncate">{slide.speakerNotes || 'No notes provided.'}</span>
        </div>
      </div>
      
      {/* Control Bar */}
      <div className="flex justify-between w-full items-center bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex gap-2 items-center">
          <Button variant="outline" onClick={() => setIndex(Math.max(0, index - 1))} disabled={index === 0}>
            <ChevronLeft size={18}/>
          </Button>
          <span className="px-4 text-sm font-bold text-slate-600 tabular-nums min-w-[100px] text-center">
            Slide {index + 1} of {slides.length}
          </span>
          <Button variant="outline" onClick={() => setIndex(Math.min(slides.length - 1, index + 1))} disabled={index === slides.length - 1}>
            <ChevronRight size={18}/>
          </Button>
        </div>
        <Button onClick={onDownload} className="bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200">
          <Download size={18} className="mr-2"/> Download .pptx
        </Button>
      </div>
    </div>
  );
};

// --- Doc Preview Component ---
export const DocPreview: React.FC<{ data: DocData; onDownload: () => void }> = ({ data, onDownload }) => {
  return (
    <div className="flex flex-col items-center space-y-6 w-full max-w-3xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-300">
      
      {/* Paper Canvas */}
      <div className="w-full bg-white shadow-2xl rounded-xl border border-slate-200 p-12 min-h-[600px] max-h-[800px] overflow-y-auto custom-scrollbar ring-1 ring-slate-900/5">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-4xl font-black text-slate-900 mb-10 pb-6 border-b-2 border-slate-100">{data.title}</h1>
          <div className="space-y-10">
            {data.sections.map((s, i) => (
              <div key={i}>
                <h2 className="text-lg font-bold text-indigo-700 mb-3 uppercase tracking-wide">{s.header}</h2>
                <div className="text-slate-700 leading-relaxed whitespace-pre-wrap text-base text-justify font-serif">
                  {s.content}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      {/* Action Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm w-full flex justify-between items-center">
        <div className="flex items-center gap-2 text-slate-400 text-xs font-medium">
          <FileText size={16} />
          Document Preview
        </div>
        <Button onClick={onDownload} className="bg-blue-600 hover:bg-blue-700 shadow-blue-200">
          <Download size={18} className="mr-2"/> Download .docx
        </Button>
      </div>
    </div>
  );
};
