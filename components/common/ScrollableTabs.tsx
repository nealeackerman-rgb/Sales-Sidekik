
import React, { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface ScrollableTabsProps {
  children: React.ReactNode;
  className?: string;
  containerClassName?: string;
}

export const ScrollableTabs: React.FC<ScrollableTabsProps> = ({ 
  children, 
  className = '',
  containerClassName = '' 
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(false);

  const checkScroll = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      // Use a 1px buffer for rounding errors
      setShowLeftArrow(scrollLeft > 1);
      setShowRightArrow(scrollLeft + clientWidth < scrollWidth - 1);
    }
  };

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;

    // Initial check
    checkScroll();

    // Resize observer to handle window or content changes
    const resizeObserver = new ResizeObserver(() => checkScroll());
    resizeObserver.observe(container);

    // Scroll listener
    container.addEventListener('scroll', checkScroll);

    return () => {
      resizeObserver.disconnect();
      container.removeEventListener('scroll', checkScroll);
    };
  }, [children]);

  const scrollBy = (offset: number) => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: offset, behavior: 'smooth' });
    }
  };

  return (
    <div className={`relative group/scroll-container flex items-center min-w-0 ${className}`}>
      {/* Left Arrow & Fade */}
      {showLeftArrow && (
        <>
          <div className="absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-slate-50 to-transparent z-10 pointer-events-none" />
          <button
            onClick={() => scrollBy(-200)}
            className="absolute left-0 z-20 p-1 bg-white border border-slate-200 rounded-full shadow-md text-slate-600 hover:text-indigo-600 hover:scale-110 transition-all ml-1"
          >
            <ChevronLeft size={16} />
          </button>
        </>
      )}

      {/* The Scrollable Viewport */}
      <div 
        ref={scrollRef}
        className={`flex overflow-x-auto no-scrollbar gap-1 min-w-0 flex-1 scroll-smooth ${containerClassName}`}
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        <style dangerouslySetInnerHTML={{ __html: `
          .no-scrollbar::-webkit-scrollbar { display: none; }
        `}} />
        {children}
      </div>

      {/* Right Arrow & Fade */}
      {showRightArrow && (
        <>
          <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-slate-50 to-transparent z-10 pointer-events-none" />
          <button
            onClick={() => scrollBy(200)}
            className="absolute right-0 z-20 p-1 bg-white border border-slate-200 rounded-full shadow-md text-slate-600 hover:text-indigo-600 hover:scale-110 transition-all mr-1"
          >
            <ChevronRight size={16} />
          </button>
        </>
      )}
    </div>
  );
};
