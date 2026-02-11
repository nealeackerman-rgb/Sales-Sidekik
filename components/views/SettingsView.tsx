
import React, { useState, useRef, useEffect } from 'react';
import { Save, Sparkles, RotateCcw, Download, Upload, Trash2, CheckCircle2, Settings, X, Edit3, UserCog, Database, ArrowRight, Target, Loader2, BarChart2 } from 'lucide-react';
import { SellerInfo, Frameworks, FrameworkCategory, DailyUsageStats } from '../../types';
import { INITIAL_FRAMEWORKS } from '../../constants';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { Textarea } from '../common/Textarea';
import { Modal } from '../common/Modal';
import { researchCompanyInfo, geminiService } from '../../services/geminiService';
import { usageService } from '../../services/usageService';

interface SettingsViewProps {
  sellerInfo: SellerInfo;
  onUpdate: (info: SellerInfo) => void;
  frameworks: Frameworks;
  onUpdateFrameworks: (frameworks: Frameworks) => void;
  onFinish?: () => void;
}

const SettingsView: React.FC<SettingsViewProps> = ({ 
  sellerInfo, 
  onUpdate, 
  frameworks = INITIAL_FRAMEWORKS, 
  onUpdateFrameworks,
  onFinish
}) => {
  const [activeTab, setActiveTab] = useState<'profile' | 'frameworks' | 'usage'>('profile');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isIcpLoading, setIsIcpLoading] = useState(false);
  const [editingCategory, setEditingCategory] = useState<FrameworkCategory | null>(null);
  const [tempFrameworkContent, setTempFrameworkContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  
  // New State for AI Enhancement
  const [aiInstruction, setAiInstruction] = useState('');
  const [enhancingCategory, setEnhancingCategory] = useState<string | null>(null);
  const [isBulkEnhancing, setIsBulkEnhancing] = useState(false);

  // Usage State
  const [todayUsage, setTodayUsage] = useState<DailyUsageStats | null>(null);
  const [usageHistory, setUsageHistory] = useState<DailyUsageStats[]>([]);
  const [lifetimeCost, setLifetimeCost] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Initial Load
    refreshUsage();

    // Listen for updates from other tabs/windows if needed, or just poll
    const handleUsageUpdate = () => refreshUsage();
    window.addEventListener('usage_updated', handleUsageUpdate);
    return () => window.removeEventListener('usage_updated', handleUsageUpdate);
  }, []);

  const refreshUsage = () => {
    setTodayUsage(usageService.getToday());
    setUsageHistory(usageService.getHistory());
    setLifetimeCost(usageService.getLifeTimeTotal());
  };

  const handleAiAutoFill = async () => {
    if (!sellerInfo.companyName) {
      alert("Please enter a Company Name first.");
      return;
    }
    setIsAiLoading(true);
    try {
      const result = await researchCompanyInfo(sellerInfo.companyName);
      onUpdate({
        ...sellerInfo,
        companyDescription: result.companyDescription || sellerInfo.companyDescription,
        products: result.products || sellerInfo.products,
      });
    } catch (error) {
      alert("Failed to research company.");
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleIcpAutoFill = async () => {
    if (!sellerInfo.companyDescription || !sellerInfo.products) {
      alert("Please provide company description and products first so I can deduce your ICP.");
      return;
    }
    setIsIcpLoading(true);
    try {
      const result = await geminiService.generateICP(sellerInfo);
      onUpdate({
        ...sellerInfo,
        idealCustomerProfile: result
      });
    } catch (error) {
      alert("Failed to generate ICP.");
    } finally {
      setIsIcpLoading(false);
    }
  };

  const isProfileComplete = sellerInfo.companyName && sellerInfo.sellerName && sellerInfo.companyDescription;

  const handleSaveProfile = () => {
    setIsSaving(true);
    onUpdate(sellerInfo);
    setTimeout(() => {
      setIsSaving(false);
      if (onFinish && isProfileComplete) {
        onFinish();
      } else {
        alert("Profile saved successfully!");
      }
    }, 600);
  };

  const handleExportData = () => {
    const data = {
      sellerInfo,
      frameworks,
      accounts: JSON.parse(localStorage.getItem('sales_sidekik_accounts') || '[]'),
      exportedAt: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sales-sidekik-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
  };

  const handleImportData = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target?.result as string);
        if (json.sellerInfo) onUpdate(json.sellerInfo);
        if (json.frameworks) onUpdateFrameworks(json.frameworks);
        if (json.accounts) localStorage.setItem('sales_sidekik_accounts', JSON.stringify(json.accounts));
        alert("Restored successfully!"); window.location.reload();
      } catch { alert("Invalid backup."); }
    };
    reader.readAsText(file);
  };

  const openEditor = (category: FrameworkCategory) => {
    setEditingCategory(category);
    setTempFrameworkContent(frameworks[category] || INITIAL_FRAMEWORKS[category] || '');
    setAiInstruction('');
  };

  const saveEditor = () => {
    if (editingCategory) {
      onUpdateFrameworks({ ...frameworks, [editingCategory]: tempFrameworkContent });
      setEditingCategory(null);
    }
  };

  // --- AI Enhance Logic ---

  const handleEnhanceFramework = async () => {
    if (!editingCategory) return;
    setEnhancingCategory(editingCategory);
    try {
      const result = await geminiService.enhanceFramework(editingCategory, tempFrameworkContent, aiInstruction);
      setTempFrameworkContent(result);
      setAiInstruction('');
    } catch (e) {
      alert("Failed to enhance framework. Please check your API connection.");
    } finally {
      setEnhancingCategory(null);
    }
  };

  const handleAutoEnhanceAll = async () => {
    if (!confirm("This will auto-fill any empty or short (<100 chars) frameworks using AI best practices. Continue?")) return;
    
    setIsBulkEnhancing(true);
    try {
      const updates: Partial<Frameworks> = {};
      let count = 0;

      // We use a simple loop. For production, `Promise.all` with concurrency limits is better.
      for (const category of Object.values(FrameworkCategory)) {
        const currentContent = frameworks[category] || INITIAL_FRAMEWORKS[category] || '';
        
        // Only enhance if it's "empty" or very short (placeholder)
        if (currentContent.length < 100) {
          const enhanced = await geminiService.enhanceFramework(
            category, 
            currentContent, 
            "Create a standard, best-practice framework for this category. Be concise."
          );
          updates[category] = enhanced;
          count++;
        }
      }

      if (count > 0) {
        onUpdateFrameworks({ ...frameworks, ...updates });
        alert(`Successfully enhanced ${count} frameworks with AI!`);
      } else {
        alert("All your frameworks are already detailed. No changes made.");
      }
    } catch (e) {
      alert("Bulk enhancement failed.");
      console.error(e);
    } finally {
      setIsBulkEnhancing(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-24">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Settings & Configuration</h1>
          <p className="text-slate-500 font-medium">Calibrate your AI Sidekik's context.</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex gap-2 bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
            <button onClick={() => setActiveTab('profile')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'profile' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-50'}`}>Profile</button>
            <button onClick={() => setActiveTab('frameworks')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'frameworks' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-50'}`}>Methodology</button>
            <button onClick={() => setActiveTab('usage')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'usage' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-50'}`}>Data & Usage</button>
          </div>
          {onFinish && isProfileComplete && (
            <Button onClick={onFinish} variant="primary" className="shadow-indigo-200">
              Go to Territory <ArrowRight size={18} />
            </Button>
          )}
        </div>
      </div>

      {activeTab === 'profile' && (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <Card className="p-8 border-indigo-100 relative overflow-visible">
            <div className="absolute -top-3 left-8 px-4 py-1 bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest rounded-full shadow-lg z-10">Seller Profile</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-6">
                <Input label="Full Name" value={sellerInfo.sellerName} onChange={(e) => onUpdate({...sellerInfo, sellerName: e.target.value})} placeholder="e.g. Jane Smith" />
                
                {/* Fixed Responsive Container for Company Name + Research Button */}
                <div className="flex flex-col sm:flex-row gap-3 items-end w-full">
                  <div className="w-full sm:flex-1">
                    <Input 
                      label="Your Company" 
                      value={sellerInfo.companyName} 
                      onChange={(e) => onUpdate({...sellerInfo, companyName: e.target.value})} 
                      placeholder="e.g. Acme Corp" 
                    />
                  </div>
                  <Button 
                    variant="ai" 
                    onClick={handleAiAutoFill} 
                    disabled={isAiLoading || !sellerInfo.companyName}
                    className="shrink-0 w-full sm:w-auto mb-[2px]"
                  >
                    {isAiLoading ? <RotateCcw className="animate-spin" size={16} /> : <Sparkles size={16} />}
                    Research
                  </Button>
                </div>
              </div>
              <div className="space-y-6">
                <Textarea label="Company Value Proposition" value={sellerInfo.companyDescription} onChange={(e) => onUpdate({...sellerInfo, companyDescription: e.target.value})} rows={3} placeholder="What unique problem do you solve?" />
                <Textarea label="Primary Products" value={sellerInfo.products} onChange={(e) => onUpdate({...sellerInfo, products: e.target.value})} rows={3} placeholder="What do you sell?" />
              </div>
            </div>
          </Card>

          <Card className="p-8 border-emerald-100 relative overflow-visible">
            <div className="absolute -top-3 left-8 px-4 py-1 bg-emerald-600 text-white text-[10px] font-black uppercase tracking-widest rounded-full shadow-lg z-10">Ideal Customer Profile (ICP)</div>
            <div className="flex justify-between items-center mb-6">
              <p className="text-sm text-slate-500 font-medium max-w-lg">Define who your "best" customers are. Sidekik uses this to filter news and prioritize leads.</p>
              <Button variant="ai" onClick={handleIcpAutoFill} disabled={isIcpLoading}>
                {isIcpLoading ? <RotateCcw className="animate-spin" size={16} /> : <Target size={16} />}
                Auto-Fill ICP
              </Button>
            </div>
            
            <div className="grid grid-cols-1 gap-8">
              <div className="space-y-6">
                <Textarea 
                  label="Key Personas / Roles" 
                  value={sellerInfo.idealCustomerProfile?.roles || ''} 
                  onChange={(e) => onUpdate({...sellerInfo, idealCustomerProfile: { ...sellerInfo.idealCustomerProfile!, roles: e.target.value }})} 
                  rows={5}
                  placeholder="e.g. CTO, Head of Security, VP Engineering. Include seniority, departments, and specific responsibilities." 
                />
              </div>
              <div className="space-y-6">
                <Textarea 
                  label="Core Pain Points We Solve" 
                  value={sellerInfo.idealCustomerProfile?.painPoints || ''} 
                  onChange={(e) => onUpdate({...sellerInfo, idealCustomerProfile: { ...sellerInfo.idealCustomerProfile!, painPoints: e.target.value }})} 
                  rows={5} 
                  placeholder="Describe the challenges your product addresses. Be detailed about technical hurdles, business inefficiencies, or strategic blockers." 
                />
              </div>
            </div>
          </Card>

          <div className="flex justify-end">
            <Button onClick={handleSaveProfile} disabled={isSaving} className="px-8 py-3 bg-indigo-600">
              {isSaving ? <RotateCcw className="animate-spin" size={18} /> : <CheckCircle2 size={18} />}
              {isSaving ? 'Saving Profile...' : 'Save & Continue'}
            </Button>
          </div>
        </div>
      )}

      {activeTab === 'frameworks' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="flex justify-between items-center bg-indigo-50 p-4 rounded-xl border border-indigo-100">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-100 text-indigo-700 rounded-lg">
                <Settings size={20} />
              </div>
              <div>
                <h3 className="font-bold text-indigo-900">Sales Methodology</h3>
                <p className="text-xs text-indigo-700">Define your playbooks. Sidekik will follow these rules when analyzing deals.</p>
              </div>
            </div>
            <Button 
              variant="ai" 
              onClick={handleAutoEnhanceAll} 
              disabled={isBulkEnhancing}
              className="text-xs"
            >
              {isBulkEnhancing ? <Loader2 className="animate-spin" size={14} /> : <Sparkles size={14} />}
              Auto-Enhance Defaults
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Object.values(FrameworkCategory).map((category) => (
              <div key={category} onClick={() => openEditor(category)} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 hover:border-indigo-400 cursor-pointer h-48 relative overflow-hidden group transition-all hover:shadow-md">
                <div className="flex justify-between items-start mb-4">
                  <div className="p-2 bg-slate-50 text-slate-500 rounded-xl group-hover:bg-indigo-600 group-hover:text-white transition-colors"><Settings size={20} /></div>
                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Rulebook</div>
                </div>
                <h3 className="font-bold text-slate-900 line-clamp-2 pr-2">{category}</h3>
                <p className="text-xs text-slate-400 mt-2 line-clamp-3">{frameworks[category] || INITIAL_FRAMEWORKS[category]}</p>
                <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-white to-transparent"></div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'usage' && (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="p-6 border-indigo-100 bg-indigo-50/30">
                    <h4 className="text-xs font-black text-indigo-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                        <BarChart2 size={14} /> Today's Cost
                    </h4>
                    <p className="text-3xl font-black text-indigo-900">${(todayUsage?.totalCost || 0).toFixed(4)}</p>
                    <p className="text-xs text-indigo-600 mt-1">
                        {todayUsage?.requestCount || 0} AI Requests
                    </p>
                </Card>
                <Card className="p-6 border-slate-200">
                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                        <Database size={14} /> Total Tokens (Today)
                    </h4>
                    <p className="text-3xl font-black text-slate-800">
                        {((todayUsage?.inputTokens || 0) + (todayUsage?.outputTokens || 0)).toLocaleString()}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                        In: {(todayUsage?.inputTokens || 0).toLocaleString()} • Out: {(todayUsage?.outputTokens || 0).toLocaleString()}
                    </p>
                </Card>
                <Card className="p-6 border-emerald-100 bg-emerald-50/30">
                    <h4 className="text-xs font-black text-emerald-600 uppercase tracking-widest mb-2 flex items-center gap-2">
                        <Target size={14} /> Est. Lifetime Cost
                    </h4>
                    <p className="text-3xl font-black text-emerald-900">${lifetimeCost.toFixed(4)}</p>
                    <p className="text-xs text-emerald-700 mt-1">
                        Based on local usage logs
                    </p>
                </Card>
            </div>

            <Card className="p-0 overflow-hidden">
                <div className="p-6 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                    <h3 className="font-bold text-slate-800">Usage History</h3>
                    <Button variant="outline" onClick={refreshUsage} className="h-8 text-xs">
                        <RotateCcw size={12} /> Refresh
                    </Button>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 border-b border-slate-100 text-xs font-black text-slate-400 uppercase tracking-wider">
                            <tr>
                                <th className="px-6 py-4">Date</th>
                                <th className="px-6 py-4 text-right">Requests</th>
                                <th className="px-6 py-4 text-right">Input Tokens</th>
                                <th className="px-6 py-4 text-right">Output Tokens</th>
                                <th className="px-6 py-4 text-right">Total Cost</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {usageHistory.length > 0 ? (
                                usageHistory.map((stat, i) => (
                                    <tr key={i} className="hover:bg-slate-50/50">
                                        <td className="px-6 py-4 font-medium text-slate-700">{stat.date}</td>
                                        <td className="px-6 py-4 text-right text-slate-500">{stat.requestCount}</td>
                                        <td className="px-6 py-4 text-right font-mono text-slate-500">{stat.inputTokens.toLocaleString()}</td>
                                        <td className="px-6 py-4 text-right font-mono text-slate-500">{stat.outputTokens.toLocaleString()}</td>
                                        <td className="px-6 py-4 text-right font-bold text-slate-800">${stat.totalCost.toFixed(4)}</td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-slate-400 italic">
                                        No usage history found. Start using AI features to track costs.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>

            <div className="flex flex-col md:flex-row items-center justify-between gap-6 p-6 bg-slate-50 rounded-2xl border border-slate-200">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-200 flex items-center justify-center text-slate-600"><Database size={22} /></div>
                    <div>
                        <h2 className="text-sm font-bold text-slate-800">Data Management</h2>
                        <p className="text-xs text-slate-500">Download or restore your local database.</p>
                    </div>
                </div>
                <div className="flex gap-3">
                    <Button variant="outline" onClick={handleExportData}>Download JSON</Button>
                    <Button variant="outline" onClick={() => fileInputRef.current?.click()}>Restore JSON</Button>
                    <input type="file" ref={fileInputRef} className="hidden" accept=".json" onChange={handleImportData} />
                </div>
            </div>
        </div>
      )}

      {editingCategory && (
        <Modal isOpen={!!editingCategory} onClose={() => setEditingCategory(null)} title={editingCategory}>
          <div className="space-y-6">
            <textarea 
              className="w-full h-[400px] p-4 text-sm font-mono bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 resize-none" 
              value={tempFrameworkContent} 
              onChange={(e) => setTempFrameworkContent(e.target.value)} 
            />
            
            {/* AI Consultant Box */}
            <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100 space-y-3">
              <div className="flex items-center gap-2 text-indigo-900 font-bold text-sm">
                <Sparkles size={16} />
                <span>AI Framework Consultant</span>
              </div>
              <div className="flex gap-2">
                <input 
                  type="text" 
                  placeholder="e.g., 'Focus on the Labeling technique' or 'Make it shorter'"
                  className="flex-1 px-3 py-2 bg-white border border-indigo-200 rounded-lg text-sm outline-none focus:border-indigo-500 placeholder-indigo-300"
                  value={aiInstruction}
                  onChange={(e) => setAiInstruction(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleEnhanceFramework();
                  }}
                />
                <Button 
                  onClick={handleEnhanceFramework} 
                  disabled={!!enhancingCategory}
                  className="shrink-0 bg-indigo-600 hover:bg-indigo-700 text-white"
                >
                  {enhancingCategory ? <Loader2 className="animate-spin" size={16} /> : 'Enhance'}
                </Button>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setEditingCategory(null)}>Cancel</Button>
              <Button onClick={saveEditor}>Apply Changes</Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default SettingsView;
