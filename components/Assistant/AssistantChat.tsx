import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Sparkles, X, Send, MessageCircle, Minus, Loader2, Mail, FileSearch, 
  ShieldAlert, Zap, Copy, Check, ArrowRight, CheckCircle2, Mic, 
  PanelLeftClose, PanelLeftOpen, Trash2, Video, AlertCircle, RefreshCw
} from 'lucide-react';
import { Account, Frameworks, SellerInfo, FrameworkCategory, CanvasMode, ChatAction, Task, CommunicationLog } from '../../types';
import { geminiService } from '../../services/geminiService';
import { FormattedOutput } from '../common/FormattedOutput';
import { useExtensionListener } from '../../hooks/useExtensionListener';

interface AssistantChatProps {
  activeAccount: Account | null;
  frameworks: Frameworks;
  sellerInfo: SellerInfo;
  onNavigateToCanvas?: (accountId: string, initialMode: CanvasMode, instruction: string) => void;
  onNavigate?: (accountId: string, tab: string, subTab?: string, instruction?: string) => void;
  onUpdateAccount?: (account: Account) => void;
  allAccounts?: Account[];
}

interface Message {
  id: string;
  role: 'assistant' | 'user';
  content: string;
  timestamp: Date;
  suggestedActions?: ChatAction[]; 
}

const MessageBubble: React.FC<{ 
  msg: Message; 
  onAction?: (action: ChatAction) => void;
}> = ({ msg, onAction }) => {
  const [copied, setCopied] = useState(false);
  const [executedActions, setExecutedActions] = useState<Set<number>>(new Set());

  const handleCopy = () => {
    navigator.clipboard.writeText(msg.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExecuteAction = (action: ChatAction, index: number) => {
    if (onAction) {
      onAction(action);
      setExecutedActions(prev => new Set(prev).add(index));
    }
  };

  return (
    <div className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[90%] p-3 rounded-2xl text-sm ${
        msg.role === 'user' 
          ? 'bg-indigo-600 text-white rounded-br-none' 
          : 'bg-white text-slate-700 shadow-sm border border-slate-100 rounded-bl-none'
      }`}>
        {msg.role === 'assistant' ? (
          <div className="space-y-3">
            <FormattedOutput content={msg.content} className="text-sm text-inherit space-y-2" />
            {msg.suggestedActions && msg.suggestedActions.length > 0 && (
              <div className="space-y-2 mt-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
                {msg.suggestedActions.map((action, idx) => {
                  const isDone = executedActions.has(idx);
                  return (
                    <div key={idx} className="p-3 bg-indigo-50 border border-indigo-100 rounded-xl">
                      <div className="flex items-center gap-2 mb-2 text-indigo-800 font-bold text-xs uppercase tracking-wide">
                        <Zap size={12} /> Suggestion
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-xs text-indigo-700 font-medium truncate">
                          {action.label || 'Action'}
                        </p>
                        <button 
                          onClick={() => handleExecuteAction(action, idx)}
                          disabled={isDone && action.type !== 'navigate'} 
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm shrink-0 ${
                            isDone && action.type !== 'navigate'
                              ? 'bg-emerald-100 text-emerald-700 cursor-default' 
                              : 'bg-indigo-600 text-white hover:bg-indigo-700'
                          }`}
                        >
                          {isDone && action.type !== 'navigate' ? (
                            <><CheckCircle2 size={12} /> Done</>
                          ) : (
                            <><ArrowRight size={12} /> {action.type === 'navigate' ? 'Go' : 'Execute'}</>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            <div className="pt-2 mt-1 border-t border-slate-100 flex justify-end">
              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 px-2 py-1 text-[10px] font-bold text-slate-400 hover:text-indigo-600 bg-slate-50 hover:bg-indigo-50 rounded-lg transition-all"
                title="Copy to clipboard"
              >
                {copied ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                {copied ? 'Copied' : 'Copy Text'}
              </button>
            </div>
          </div>
        ) : (
          msg.content
        )}
      </div>
    </div>
  );
};

const AssistantChat: React.FC<AssistantChatProps> = ({ 
  activeAccount, 
  frameworks, 
  sellerInfo,
  onNavigateToCanvas,
  onNavigate,
  onUpdateAccount,
  allAccounts = []
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  
  // Extension & Context Listeners
  const { incomingContext, meetingStatus, clearIncomingContext } = useExtensionListener();
  const isOnGoogleMeet = typeof window !== 'undefined' && window.location.hostname.includes('meet.google.com');
  const meetLocked = isOnGoogleMeet && (!meetingStatus || !meetingStatus.isRecording);

  // Window Sizing State
  const [chatWidth, setChatWidth] = useState(400);
  const [isResizing, setIsResizing] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const initialMessages: Message[] = [
    {
      id: '1',
      role: 'assistant',
      content: "Hi! I'm your Sales Sidekik. I have access to your sales methodology and current account context. How can I help you win today?",
      timestamp: new Date(),
    }
  ];

  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [isCoachMode, setIsCoachMode] = useState(() => localStorage.getItem('sales_sidekik_coach_mode') === 'true');
  
  const lastBriefedAccountId = useRef<string | null>(null);
  const prevAccountIdRef = useRef<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [isLoading, messages.length, incomingContext]);

  useEffect(() => {
    localStorage.setItem('sales_sidekik_coach_mode', String(isCoachMode));
  }, [isCoachMode]);

  useEffect(() => {
    if (activeAccount?.id !== prevAccountIdRef.current) {
      setMessages([{
        id: Date.now().toString(),
        role: 'assistant',
        content: activeAccount 
          ? `Context switched to **${activeAccount.name}**. I'm reviewing the file...` 
          : "Global Mode active. How can I help?",
        timestamp: new Date()
      }]);
      prevAccountIdRef.current = activeAccount?.id || null;
      lastBriefedAccountId.current = null; 
      if (activeAccount && isCoachMode) {
        setIsOpen(true);
        setIsMinimized(false);
      }
    }
  }, [activeAccount?.id, isCoachMode]);

  const parseResponse = (rawText: string): { cleanContent: string, actions: ChatAction[] } => {
    const actionFullBlockRegex = /:::ACTION:::([\s\S]*?)(?:::END:::|$)/g;
    const actions: ChatAction[] = [];
    const matches = Array.from(rawText.matchAll(actionFullBlockRegex));
    
    for (const match of matches) {
      try {
        let jsonStr = match[1].trim();
        jsonStr = jsonStr.replace(/^```json/, '').replace(/^```/, '').replace(/```$/, '').trim();
        const firstBrace = jsonStr.indexOf('{');
        const firstBracket = jsonStr.indexOf('[');
        const lastBrace = jsonStr.lastIndexOf('}');
        const lastBracket = jsonStr.lastIndexOf(']');
        let start = -1;
        if (firstBrace !== -1 && firstBracket !== -1) start = Math.min(firstBrace, firstBracket);
        else start = Math.max(firstBrace, firstBracket);
        const end = Math.max(lastBrace, lastBracket);
        if (start !== -1 && end !== -1 && end > start) {
            jsonStr = jsonStr.substring(start, end + 1);
        }
        const action = JSON.parse(jsonStr);
        
        if (action.type === 'create_tasks' && Array.isArray(action.payload) && action.payload.length > 0) {
           actions.push(action);
        } else if (action.type === 'navigate' && action.payload) {
           actions.push(action);
        } else if (action.type === 'log_interaction' && action.payload) {
           actions.push(action);
        }
      } catch (e) { console.error("Failed to parse action JSON", e); }
    }
    
    let cleanContent = rawText;
    matches.forEach(m => { cleanContent = cleanContent.replace(m[0], ''); });
    cleanContent = cleanContent.replace(/:::ACTION:::/g, '').replace(/:::END:::/g, '').trim();
    return { cleanContent, actions };
  };

  useEffect(() => {
    const triggerCoach = async () => {
      if (!isCoachMode || !activeAccount || !sellerInfo.sellerName || isLoading) return;
      if (lastBriefedAccountId.current === activeAccount.id) return;
      
      await new Promise(r => setTimeout(r, 1200));
      setIsLoading(true);
      lastBriefedAccountId.current = activeAccount.id;
      
      try {
        const briefingRaw = await geminiService.generateAccountBriefing(activeAccount, sellerInfo, frameworks, allAccounts);
        const { cleanContent, actions } = parseResponse(briefingRaw);
        
        const coachMsg: Message = {
          id: Date.now().toString(),
          role: 'assistant',
          content: cleanContent || "I've reviewed the account. How would you like to proceed?",
          timestamp: new Date(),
          suggestedActions: actions
        };
        
        setMessages(prev => {
          const filtered = prev.filter(m => !m.content.includes("I'm reviewing the file..."));
          return [...filtered, coachMsg];
        });
      } catch (e) { 
        console.error("Coach briefing failed", e); 
      } finally { 
        setIsLoading(false); 
      }
    };
    triggerCoach();
  }, [activeAccount, isCoachMode, sellerInfo.sellerName, allAccounts]);

  const handleSend = async (e?: React.FormEvent, customPrompt?: string) => {
    if (e) e.preventDefault();
    const finalInput = customPrompt || input;
    if (!finalInput.trim() || isLoading) return;
    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: finalInput, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);
    try {
      const apiHistory = messages.map(m => ({ role: m.role, content: m.content }));
      let responseText = await geminiService.runAssistantChat(finalInput, apiHistory, activeAccount, frameworks, sellerInfo, allAccounts);
      const canvasTriggerRegex = /:::CANVAS_TRIGGER\s*(\{[\s\S]*?\})\s*:::/;
      const matchCanvas = responseText.match(canvasTriggerRegex);
      if (matchCanvas && matchCanvas[1] && activeAccount && onNavigateToCanvas) {
        try {
          const triggerData = JSON.parse(matchCanvas[1]);
          responseText = responseText.replace(matchCanvas[0], '').trim();
          if (!responseText) responseText = "Opening Canvas now...";
          onNavigateToCanvas(activeAccount.id, triggerData.mode, triggerData.instruction);
          responseText += "\n\n*(I've opened the Canvas editor for you)*";
        } catch (e) { console.error("Failed to parse canvas trigger", e); }
      }
      const { cleanContent, actions } = parseResponse(responseText);
      const aiMsg: Message = { id: (Date.now() + 1).toString(), role: 'assistant', content: cleanContent, timestamp: new Date(), suggestedActions: actions };
      setMessages(prev => [...prev, aiMsg]);
    } catch (error) {
      setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: 'assistant', content: "Sorry, I encountered an error connecting to my strategic engine.", timestamp: new Date() }]);
    } finally { setIsLoading(false); }
  };

  const handleGmailAnalyze = () => {
    if (!incomingContext) return;
    const prompt = `Analyze this email from **${incomingContext.sender}** regarding **${incomingContext.subject}**:
    
    BODY:
    ${incomingContext.body}
    
    Provide strategic coaching and a draft reply matching my methodology.`;
    handleSend(undefined, prompt);
    clearIncomingContext();
  };

  const startResizing = useCallback((mouseDownEvent: React.MouseEvent) => {
    if (isMobile) return;
    mouseDownEvent.preventDefault();
    setIsResizing(true);
    const startX = mouseDownEvent.clientX;
    const startWidth = chatWidth;
    const onMouseMove = (mouseMoveEvent: MouseEvent) => {
      const newWidth = startWidth + (startX - mouseMoveEvent.clientX);
      if (newWidth > 350 && newWidth < 1200) setChatWidth(newWidth);
    };
    const onMouseUp = () => {
      setIsResizing(false);
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  }, [chatWidth, isMobile]);

  const toggleWideMode = () => {
    if (isMobile) return;
    if (chatWidth > 500) setChatWidth(400);
    else setChatWidth(800);
  };

  const handleClearChat = () => {
    if (confirm("Reset current conversation?")) {
      setMessages([{
        id: Date.now().toString(),
        role: 'assistant',
        content: activeAccount ? `History cleared. Context: **${activeAccount.name}**.` : "History cleared. How can I help?",
        timestamp: new Date()
      }]);
    }
  };

  const handleExecuteAction = (action: ChatAction) => {
    if (!activeAccount) return;
    if (action.type === 'navigate' && onNavigate) {
      onNavigate(activeAccount.id, action.payload.tab, action.payload.subTab, action.payload.context);
    } else if (onUpdateAccount) {
      if (action.type === 'create_tasks') {
        const payloadArr = Array.isArray(action.payload) ? action.payload : [action.payload];
        const newTasks: Task[] = payloadArr.map((t: any) => ({
          id: crypto.randomUUID(),
          description: t.description || t.action || "New Task",
          dueDate: t.dueDate || t.due_date || new Date().toISOString().split('T')[0],
          priority: t.priority || 'Medium',
          isCompleted: false
        }));
        onUpdateAccount({ ...activeAccount, tasks: [...newTasks, ...(activeAccount.tasks || [])] });
      } else if (action.type === 'log_interaction') {
        const newLog: CommunicationLog = {
          date: action.payload.date || new Date().toISOString(),
          content: action.payload.content,
          type: action.payload.type || 'Sales Note'
        };
        onUpdateAccount({ ...activeAccount, communicationLogs: [newLog, ...(activeAccount.communicationLogs || [])] });
        setMessages(prev => [...prev, {
            id: Date.now().toString(),
            role: 'assistant',
            content: `**Memory Updated:** I've saved that note to the Deal Inputs.`,
            timestamp: new Date()
        }]);
      }
    }
  };

  const quickActions = [
    { label: 'Draft Email', icon: <Mail size={14} />, prompt: `Draft a personalized prospecting email for this account using my "${FrameworkCategory.PROSPECTING_EMAIL}" framework.` },
    { label: 'Analyze Context', icon: <FileSearch size={14} />, prompt: "Analyze our current position using the primary sales methodology I've provided in my settings." },
    { label: 'Identify Risks', icon: <ShieldAlert size={14} />, prompt: `What are the major deal risks for this account based on my "${FrameworkCategory.DEAL_MANAGEMENT}" framework?` },
  ];

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className={`fixed ${isMobile ? 'bottom-4 right-4 w-12 h-12' : 'bottom-6 right-6 w-14 h-14'} bg-indigo-600 text-white rounded-full shadow-2xl flex items-center justify-center hover:bg-indigo-700 hover:scale-110 transition-all z-[100] group`}
      >
        <Sparkles size={isMobile ? 20 : 24} className="group-hover:rotate-12 transition-transform" />
        {!isMobile && (
          <span className="absolute right-full mr-4 bg-slate-900 text-white px-3 py-1.5 rounded-lg text-sm font-bold opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
            Ask Sidekik
          </span>
        )}
      </button>
    );
  }

  const dynamicWidth = isMobile ? 'calc(100% - 2rem)' : (isMinimized ? 300 : chatWidth);
  const dynamicHeight = isMinimized ? '4rem' : (isMobile ? '75vh' : '600px');
  const dynamicPosition = isMobile ? 'bottom-4 right-4 left-4' : 'bottom-6 right-6';

  return (
    <div 
      className={`fixed ${dynamicPosition} bg-white rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.3)] border border-slate-200 overflow-hidden flex flex-col transition-all z-[100]`}
      style={{ 
        width: dynamicWidth, 
        height: dynamicHeight, 
        transition: isResizing ? 'none' : 'width 0.3s ease, height 0.3s ease, transform 0.3s ease' 
      }}
    >
      {!isMinimized && !isMobile && (
        <div 
          className="absolute left-0 top-0 bottom-0 w-1.5 cursor-ew-resize hover:bg-indigo-400/50 z-50 flex items-center justify-center group/handle transition-colors"
          onMouseDown={startResizing}
        >
          <div className="h-8 w-0.5 bg-slate-300 group-hover/handle:bg-white rounded-full" />
        </div>
      )}

      <div 
        className="bg-indigo-600 p-3 flex items-center justify-between text-white shrink-0 cursor-default select-none shadow-md z-10"
        onDoubleClick={toggleWideMode}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className={`${isMobile ? 'w-7 h-7' : 'w-8 h-8'} bg-white/20 rounded-lg flex items-center justify-center shrink-0`}>
            <Sparkles size={isMobile ? 16 : 18} />
          </div>
          <div className="min-w-0">
            <h3 className={`${isMobile ? 'text-xs' : 'text-sm'} font-bold leading-none mb-1`}>AI Sidekik</h3>
            {activeAccount && !isMinimized && (
              <div className="flex items-center gap-1.5">
                <div className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse"></div>
                <span className="text-[9px] font-bold text-indigo-100 uppercase tracking-wider truncate max-w-[120px]">
                  {activeAccount.name}
                </span>
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          {incomingContext && !isMinimized && (
            <div className="flex items-center gap-1.5 px-2 py-1 bg-white/10 rounded-lg animate-pulse mr-2" title="Email context available">
              <Mail size={12} className="text-white" />
              <span className="text-[8px] font-black uppercase">Context</span>
            </div>
          )}
          {!isMinimized && activeAccount && (
            <button 
              onClick={() => setIsCoachMode(!isCoachMode)}
              className={`flex items-center gap-1.5 px-2 py-1 rounded-lg transition-all border shrink-0 ${
                isCoachMode ? "bg-emerald-500/20 border-emerald-400 text-emerald-100" : "bg-slate-900/20 border-white/20 text-indigo-300"
              }`}
            >
              <Mic size={10} className={isCoachMode ? "text-emerald-400" : "text-indigo-400"} />
              <span className="text-[8px] font-black uppercase">Coach {isCoachMode ? 'ON' : 'OFF'}</span>
            </button>
          )}
          {!isMinimized && !isMobile && (
            <>
              <button onClick={handleClearChat} className="p-1.5 hover:bg-white/20 rounded-md transition-colors text-white/70 hover:text-white" title="Clear History">
                <Trash2 size={16} />
              </button>
              <button onClick={toggleWideMode} className="p-1.5 hover:bg-white/20 rounded-md transition-colors text-white/70 hover:text-white">
                {chatWidth > 500 ? <PanelLeftClose size={16} /> : <PanelLeftOpen size={16} />}
              </button>
            </>
          )}
          <button onClick={() => setIsMinimized(!isMinimized)} className="p-1.5 hover:bg-white/20 rounded-md transition-colors text-white/70 hover:text-white">
            {isMinimized ? <MessageCircle size={16} /> : <Minus size={16} />}
          </button>
          <button onClick={() => setIsOpen(false)} className="p-1.5 hover:bg-white/20 rounded-md transition-colors text-white/70 hover:text-white">
            <X size={16} />
          </button>
        </div>
      </div>

      {!isMinimized && (
        <>
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50 custom-scrollbar relative">
            
            {/* CONTEXT CARD: GMAIL */}
            {incomingContext && (
              <div className="sticky top-0 z-20 mb-4 animate-in slide-in-from-top-2 duration-300">
                <div className="bg-white border border-indigo-200 rounded-2xl p-4 shadow-xl ring-4 ring-indigo-50/50 flex flex-col gap-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-indigo-100 text-indigo-600 rounded-lg flex items-center justify-center shrink-0">
                        <Mail size={16} />
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs font-bold text-slate-800 truncate">📧 Email Context Detected</h4>
                        <p className="text-[10px] text-slate-500 font-medium truncate">From: {incomingContext.sender}</p>
                      </div>
                    </div>
                    <button onClick={clearIncomingContext} className="p-1 text-slate-400 hover:text-slate-600 rounded-full transition-colors">
                      <X size={14} />
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={handleGmailAnalyze}
                      disabled={isLoading}
                      className="flex-1 bg-indigo-600 text-white text-xs font-bold py-2 rounded-lg hover:bg-indigo-700 transition-all flex items-center justify-center gap-1.5 shadow-md shadow-indigo-100"
                    >
                      <Sparkles size={14} /> Analyze & Reply
                    </button>
                    <button 
                      onClick={clearIncomingContext}
                      className="px-3 py-2 text-slate-500 hover:text-slate-700 text-xs font-bold"
                    >
                      Ignore
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* PRIVACY WARNING: GOOGLE MEET */}
            {meetLocked && (
              <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl flex gap-3 animate-in fade-in duration-300">
                <AlertCircle className="text-rose-500 shrink-0" size={20} />
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-rose-900 uppercase tracking-tight">Privacy Watchdog</h4>
                  <p className="text-[10px] text-rose-700 leading-relaxed font-medium">
                    ⚠️ Call is not being recorded. AI coaching and analysis are disabled until recording starts.
                  </p>
                </div>
              </div>
            )}

            {messages.map((msg) => (
              <MessageBubble key={msg.id} msg={msg} onAction={handleExecuteAction} />
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white p-3 rounded-2xl rounded-bl-none shadow-sm border border-slate-100 flex items-center gap-2">
                  <Loader2 className="animate-spin text-indigo-600" size={16} />
                  <span className="text-xs text-slate-500 font-medium">Thinking...</span>
                </div>
              </div>
            )}
          </div>

          <div className="px-4 py-2 flex gap-2 overflow-x-auto no-scrollbar border-t border-slate-100 bg-white shrink-0">
            {quickActions.map((action, idx) => (
              <button
                key={idx}
                onClick={() => handleSend(undefined, action.prompt)}
                disabled={isLoading || meetLocked}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-slate-200 bg-slate-50 text-[10px] font-bold text-slate-600 hover:border-indigo-300 hover:text-indigo-600 hover:bg-indigo-50 transition-all whitespace-nowrap disabled:opacity-30 shadow-sm"
              >
                {action.icon}
                {action.label}
              </button>
            ))}
          </div>

          <form onSubmit={handleSend} className="p-4 bg-white border-t border-slate-100 shrink-0">
            <div className="relative">
              <input
                type="text"
                placeholder={meetLocked ? "Enable recording to talk..." : "Ask me anything..."}
                className="w-full pl-4 pr-12 py-3 bg-slate-100 border-none rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 transition-all outline-none disabled:opacity-50"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={isLoading || meetLocked}
              />
              <button
                type="submit"
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors disabled:opacity-30"
                disabled={!input.trim() || isLoading || meetLocked}
              >
                {isLoading ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
              </button>
            </div>
          </form>
        </>
      )}
    </div>
  );
};

export default AssistantChat;
