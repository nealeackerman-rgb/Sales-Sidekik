import React, { useState, useRef, useEffect } from 'react';
import { 
  LifeBuoy, 
  ShieldCheck, 
  Lock, 
  Database, 
  EyeOff, 
  Send, 
  Bot, 
  User, 
  Loader2, 
  Mail, 
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  FileText
} from 'lucide-react';
import { geminiService } from '../../services/geminiService';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { FormattedOutput } from '../common/FormattedOutput';
import BetaAgreement from '../legal/BetaAgreement';

const HelpView: React.FC = () => {
  const [messages, setMessages] = useState<{ role: 'user' | 'bot'; content: string; timestamp: Date }[]>([
    { 
      role: 'bot', 
      content: "Hello! I'm the Sidekik Support Bot. I can help you with features, settings, or troubleshooting. How can I assist you today?", 
      timestamp: new Date() 
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [ticketDraft, setTicketDraft] = useState<{ summary: string; timestamp: string } | null>(null);
  const [isLegalExpanded, setIsLegalExpanded] = useState(false);
  
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isProcessing, ticketDraft]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isProcessing) return;

    const userMsg = inputValue;
    setInputValue('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg, timestamp: new Date() }]);
    setIsProcessing(true);
    setTicketDraft(null); // Reset draft on new message

    try {
      const response = await geminiService.askHelpBot(userMsg);
      
      // Check for Escalation Protocol
      if (response.includes('ESCALATE_TO_DEV')) {
        const summary = response.replace('ESCALATE_TO_DEV:', '').trim();
        setTicketDraft({
          summary,
          timestamp: new Date().toISOString()
        });
        setMessages(prev => [...prev, { 
          role: 'bot', 
          content: "I've detected a technical issue that requires human attention. I've drafted a support ticket for you below.", 
          timestamp: new Date() 
        }]);
      } else {
        setMessages(prev => [...prev, { role: 'bot', content: response, timestamp: new Date() }]);
      }
    } catch (error) {
      setMessages(prev => [...prev, { role: 'bot', content: "I'm having trouble connecting to the support database. Please try again later.", timestamp: new Date() }]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleEmailSupport = () => {
    if (!ticketDraft) return;
    const subject = encodeURIComponent(`Bug Report: ${ticketDraft.summary.substring(0, 50)}...`);
    const body = encodeURIComponent(`
Issue Summary: ${ticketDraft.summary}
Timestamp: ${ticketDraft.timestamp}
User Agent: ${navigator.userAgent}

[Please add any additional screenshots or details here]
    `);
    window.location.href = `mailto:support@salessidekik.com?subject=${subject}&body=${body}`;
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-20 animate-in fade-in slide-in-from-bottom-2 duration-300">
      
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <LifeBuoy className="text-indigo-600" size={32} />
            Help & Support
          </h2>
          <p className="text-slate-500 font-medium mt-1">Troubleshooting, guides, and security information.</p>
        </div>
        <a 
          href="mailto:support@salessidekik.com" 
          className="hidden md:flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-indigo-600 transition-colors"
        >
          <Mail size={16} /> support@salessidekik.com
        </a>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Info & Security */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="p-6 border-indigo-100 bg-indigo-50/50">
            <h3 className="font-bold text-indigo-900 mb-4 flex items-center gap-2">
              <ShieldCheck size={20} className="text-indigo-600" />
              Security & Privacy
            </h3>
            <div className="space-y-4">
              <div className="flex gap-3">
                <div className="bg-white p-2 rounded-lg text-indigo-600 shrink-0 h-fit border border-indigo-100">
                  <Database size={16} />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-800">Local First Data</h4>
                  <p className="text-xs text-slate-600 leading-relaxed mt-1">
                    Your account plans, notes, and CRM data are stored locally on your device or your personal Firebase instance. We do not host a central database of your sales data.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="bg-white p-2 rounded-lg text-indigo-600 shrink-0 h-fit border border-indigo-100">
                  <Lock size={16} />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-800">Enterprise AI Security</h4>
                  <p className="text-xs text-slate-600 leading-relaxed mt-1">
                    We use Google Gemini Enterprise API. Your inputs are not used to train public models. Data is encrypted in transit and at rest.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="bg-white p-2 rounded-lg text-indigo-600 shrink-0 h-fit border border-indigo-100">
                  <EyeOff size={16} />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-800">Zero-Retention Policy</h4>
                  <p className="text-xs text-slate-600 leading-relaxed mt-1">
                    Sales Sidekik does not retain your transcripts or generated strategies after your session ends, unless you explicitly save them to your workspace.
                  </p>
                </div>
              </div>
            </div>
          </Card>

          {/* New Terms & Conditions Section */}
          <Card className="overflow-hidden">
            <button 
              onClick={() => setIsLegalExpanded(!isLegalExpanded)}
              className="w-full flex items-center justify-between p-6 hover:bg-slate-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                  <FileText size={20} />
                </div>
                <h3 className="font-bold text-slate-800">Terms & Conditions</h3>
              </div>
              {isLegalExpanded ? <ChevronUp size={18} className="text-slate-400" /> : <ChevronDown size={18} className="text-slate-400" />}
            </button>
            {isLegalExpanded && (
              <div className="px-6 pb-6 animate-in slide-in-from-top-2 duration-300">
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                  <BetaAgreement />
                </div>
              </div>
            )}
          </Card>

          <Card className="p-6">
            <h3 className="font-bold text-slate-800 mb-4">Quick Resources</h3>
            <ul className="space-y-3">
              <li>
                <a href="#" className="flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors group">
                  <span className="text-sm font-medium text-slate-700">Getting Started Guide</span>
                  <ExternalLink size={14} className="text-slate-400 group-hover:text-indigo-600" />
                </a>
              </li>
              <li>
                <a href="#" className="flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors group">
                  <span className="text-sm font-medium text-slate-700">Prompting Best Practices</span>
                  <ExternalLink size={14} className="text-slate-400 group-hover:text-indigo-600" />
                </a>
              </li>
              <li>
                <a href="#" className="flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors group">
                  <span className="text-sm font-medium text-slate-700">API Key Management</span>
                  <ExternalLink size={14} className="text-slate-400 group-hover:text-indigo-600" />
                </a>
              </li>
            </ul>
          </Card>
        </div>

        {/* Right Column: HelpBot Chat */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[600px]">
            {/* Chat Header */}
            <div className="bg-slate-50 p-4 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white">
                  <Bot size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-sm">Sidekik Technical Support</h3>
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Online</span>
                  </div>
                </div>
              </div>
              <Button variant="outline" className="px-3 h-8 text-xs" onClick={() => setMessages([])}>
                Clear Chat
              </Button>
            </div>

            {/* Chat Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/30" ref={scrollRef}>
              {messages.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] p-4 rounded-2xl text-sm leading-relaxed shadow-sm ${
                    msg.role === 'user' 
                      ? 'bg-indigo-600 text-white rounded-br-none' 
                      : 'bg-white text-slate-700 border border-slate-200 rounded-bl-none'
                  }`}>
                     <FormattedOutput content={msg.content} />
                     <p className={`text-[9px] mt-2 font-medium ${msg.role === 'user' ? 'text-indigo-200' : 'text-slate-400'}`}>
                       {msg.timestamp.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                     </p>
                  </div>
                </div>
              ))}
              
              {isProcessing && (
                <div className="flex justify-start">
                  <div className="bg-white p-4 rounded-2xl rounded-bl-none border border-slate-200 shadow-sm flex items-center gap-2">
                    <Loader2 size={16} className="animate-spin text-indigo-600" />
                    <span className="text-xs text-slate-500 font-medium">Checking knowledge base...</span>
                  </div>
                </div>
              )}

              {/* Ticket Draft Card */}
              {ticketDraft && (
                <div className="mx-8 bg-rose-50 border border-rose-100 rounded-2xl p-5 animate-in fade-in slide-in-from-bottom-2">
                  <div className="flex items-center gap-2 text-rose-700 mb-2">
                    <AlertTriangle size={18} />
                    <h4 className="font-bold">Technical Issue Detected</h4>
                  </div>
                  <p className="text-sm text-rose-800 mb-4">
                    The automated system couldn't resolve this. I've prepared a bug report for our engineering team.
                  </p>
                  <div className="bg-white p-3 rounded-lg border border-rose-100 text-xs font-mono text-slate-600 mb-4">
                    <span className="font-bold text-slate-900">Summary:</span> {ticketDraft.summary}
                  </div>
                  <Button variant="danger" className="w-full" onClick={handleEmailSupport}>
                    <Mail size={16} /> Send Bug Report
                  </Button>
                </div>
              )}
            </div>

            {/* Chat Input */}
            <form onSubmit={handleSendMessage} className="p-4 bg-white border-t border-slate-200">
              <div className="relative">
                <input 
                  type="text" 
                  placeholder="Describe your issue or ask a 'How-to' question..."
                  className="w-full pl-4 pr-12 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 transition-all outline-none"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  disabled={isProcessing}
                />
                <button 
                  type="submit"
                  disabled={!inputValue.trim() || isProcessing}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:bg-slate-300 transition-all shadow-md shadow-indigo-100"
                >
                  {isProcessing ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HelpView;