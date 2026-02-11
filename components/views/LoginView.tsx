import React, { useState } from 'react';
import { signInWithGoogle, loginWithEmail, registerWithEmail, sendPasswordReset } from '../../services/firebase';
import { ShieldCheck, Zap, Layout, Loader2, Globe, Mail, Lock, ArrowRight, CheckCircle2, ArrowLeft, Info, FileText } from 'lucide-react';
import { Logo } from '../Logo';
import { Modal } from '../common/Modal';
import BetaAgreement from '../legal/BetaAgreement';

export const LoginView = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [mode, setMode] = useState<'signin' | 'signup' | 'reset'>('signin');
  const [hasAgreed, setHasAgreed] = useState(false);
  const [showLegalModal, setShowLegalModal] = useState(false);
  
  // Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const validatePassword = (pass: string): string | null => {
    if (pass.length < 10) return "Password must be at least 10 characters long.";
    if (!/[A-Z]/.test(pass)) return "Password must contain at least one uppercase letter.";
    if (!/[a-z]/.test(pass)) return "Password must contain at least one lowercase letter.";
    if (!/[0-9]/.test(pass)) return "Password must contain at least one number.";
    if (!/[!@#$%^&*]/.test(pass)) return "Password must contain at least one special character (!@#$%^&*).";
    return null;
  };

  const handleGoogleLogin = async () => {
    if (!hasAgreed) return;
    setIsLoading(true);
    setError('');
    try {
      await signInWithGoogle();
    } catch (err: any) {
      console.error(err);
      setError("Unable to sign in with Google.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mode !== 'reset' && !hasAgreed) return;
    if (!email) return;
    if (mode !== 'reset' && !password) return;
    
    setError('');
    setSuccessMsg('');

    // Strict Password Validation for Signup
    if (mode === 'signup') {
      const validationError = validatePassword(password);
      if (validationError) {
        setError(validationError);
        return;
      }
    }
    
    setIsLoading(true);
    
    try {
      if (mode === 'signin') {
        await loginWithEmail(email, password);
      } else if (mode === 'signup') {
        await registerWithEmail(email, password);
      } else if (mode === 'reset') {
        await sendPasswordReset(email);
        setSuccessMsg("Reset link sent! Check your email.");
      }
    } catch (err: any) {
      console.error(err);
      let msg = "Authentication failed.";
      if (err.code === 'auth/invalid-credential') msg = "Invalid email or password.";
      if (err.code === 'auth/email-already-in-use') msg = "Email already in use.";
      if (err.code === 'auth/weak-password') msg = "Password should be at least 6 characters.";
      if (err.code === 'auth/user-not-found') msg = "No account found with this email.";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const getTitle = () => {
    if (mode === 'signin') return 'Welcome Back';
    if (mode === 'signup') return 'Create Account';
    return 'Reset Password';
  };

  const getSubtitle = () => {
    if (mode === 'signin') return 'Sign in to access your workspace';
    if (mode === 'signup') return 'Get started with your AI workspace';
    return 'Enter your email to receive recovery instructions';
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-2 bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-200">
        
        {/* Left Side: Brand & Value Prop */}
        <div className="hidden lg:flex bg-indigo-600 p-8 text-white relative overflow-hidden flex-col justify-between min-h-[500px]">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-16 -mt-16 blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-900/20 rounded-full -ml-16 -mb-16 blur-3xl"></div>

          <div className="relative z-10">
            <div className="mb-10">
              <div className="flex items-center gap-3">
                 <div className="relative flex h-10 w-10 items-center justify-center rounded-lg bg-white/10 backdrop-blur-sm text-white shadow-lg border border-white/10">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6">
                      <path fillOpacity="0.7" d="M3 15a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1H4a1 1 0 01-1-1v-4z" />
                      <path fillOpacity="0.85" d="M9 10a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H10a1 1 0 01-1-1v-9z" />
                      <path d="M16.5 2.5a.5.5 0 01.5.5v2.85l2.85-.01a.5.5 0 01.35.86l-2.2 2.2.86 3.1a.5.5 0 01-.77.56L15.5 11l-2.59 1.56a.5.5 0 01-.77-.56l.86-3.1-2.2-2.2a.5.5 0 01.35-.86L14 5.85V3a.5.5 0 01.5-.5z" />
                      <path fillRule="evenodd" d="M17 14a1 1 0 011 1v4a1 1 0 01-1 1h-2a1 1 0 01-1-1v-4a1 1 0 011-1h2z" clipRule="evenodd" />
                    </svg>
                 </div>
                 <div className="flex flex-col leading-none">
                    <span className="text-xl font-bold tracking-tight text-white">
                      Sales <span className="text-blue-200">Sidekik</span>
                    </span>
                    <span className="text-[10px] font-medium tracking-wider text-indigo-200 uppercase">
                      AI Assistant
                    </span>
                 </div>
              </div>
            </div>
            
            <h1 className="text-3xl font-black tracking-tight leading-tight mb-4">
              Your AI-Powered Sales Operating System
            </h1>
            <p className="text-indigo-100 text-sm leading-relaxed opacity-90 max-w-xs">
              Stop guessing. Start closing. Sidekik uses Gemini to analyze your territory, prep your discovery calls, and uncover blind spots in your deals.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-8 relative z-10">
            <div className="bg-white/10 backdrop-blur-sm p-3 rounded-xl border border-white/10">
              <Zap size={16} className="text-amber-300 mb-1" />
              <p className="font-bold text-xs">Instant Strategy</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm p-3 rounded-xl border border-white/10">
              <ShieldCheck size={16} className="text-emerald-300 mb-1" />
              <p className="font-bold text-xs">Deal Health</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm p-3 rounded-xl border border-white/10">
              <Layout size={16} className="text-indigo-300 mb-1" />
              <p className="font-bold text-xs">Territory Plan</p>
            </div>
          </div>
        </div>

        {/* Right Side: Login Form */}
        <div className="p-8 md:p-10 flex flex-col justify-center bg-white relative">
           <div className="max-w-xs mx-auto w-full space-y-6">
             <div className="mb-6 flex justify-center lg:justify-start">
               <Logo />
             </div>
             
             <div className="text-center lg:text-left">
               <h2 className="text-xl font-bold text-slate-900">{getTitle()}</h2>
               <p className="text-slate-500 mt-1 text-sm">{getSubtitle()}</p>
             </div>

             {error && (
               <div className="p-3 bg-rose-50 border border-rose-100 text-rose-600 text-xs rounded-xl font-medium flex items-center gap-2 animate-in fade-in slide-in-from-top-1">
                 <ShieldCheck size={14} />
                 {error}
               </div>
             )}

             {successMsg && (
               <div className="p-3 bg-emerald-50 border border-emerald-100 text-emerald-600 text-xs rounded-xl font-medium flex items-center gap-2">
                 <CheckCircle2 size={14} />
                 {successMsg}
               </div>
             )}

             {mode !== 'reset' && (
               <>
                 {/* Beta Agreement Logic */}
                 <div className="space-y-3">
                   <div className="flex items-start gap-2 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                     <input 
                       id="beta-agree"
                       type="checkbox" 
                       className="mt-1 w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                       checked={hasAgreed}
                       onChange={(e) => setHasAgreed(e.target.checked)}
                     />
                     <label htmlFor="beta-agree" className="text-[11px] text-slate-600 leading-tight cursor-pointer font-medium">
                       I agree to the <button type="button" onClick={() => setShowLegalModal(true)} className="text-indigo-600 font-bold hover:underline">Beta Participation Agreement</button>.
                     </label>
                   </div>

                   <button
                     onClick={handleGoogleLogin}
                     disabled={isLoading || !hasAgreed}
                     className={`w-full flex items-center justify-center gap-3 bg-white border border-slate-200 text-slate-700 font-bold py-2.5 px-4 rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm group text-sm ${(!hasAgreed || isLoading) ? 'opacity-50 cursor-not-allowed grayscale' : ''}`}
                   >
                     {isLoading ? (
                       <Loader2 size={18} className="animate-spin text-slate-400" />
                     ) : (
                       <Globe size={18} className={`text-slate-500 ${hasAgreed ? 'group-hover:text-indigo-600' : ''} transition-colors`} />
                     )}
                     <span>Continue with Google</span>
                   </button>
                 </div>

                 <div className="relative">
                   <div className="absolute inset-0 flex items-center">
                     <div className="w-full border-t border-slate-100"></div>
                   </div>
                   <div className="relative flex justify-center text-[10px] uppercase">
                     <span className="bg-white px-2 text-slate-400 font-bold tracking-widest">Or with email</span>
                   </div>
                 </div>
               </>
             )}

             {/* Email Form */}
             <form onSubmit={handleEmailAuth} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Email</label>
                  <div className="relative">
                    <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input 
                      type="email" 
                      required
                      className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                      placeholder="you@company.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                </div>

                {mode !== 'reset' && (
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center ml-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Password</label>
                      {mode === 'signin' && (
                        <button 
                          type="button"
                          onClick={() => { setMode('reset'); setError(''); setSuccessMsg(''); }}
                          className="text-[10px] font-bold text-indigo-600 hover:text-indigo-700"
                        >
                          Forgot Password?
                        </button>
                      )}
                    </div>
                    <div className="relative">
                      <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input 
                        type="password" 
                        required
                        className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                      />
                    </div>
                    {mode === 'signup' && (
                      <div className="flex gap-2 items-start mt-2 px-1">
                        <Info size={12} className="text-slate-400 shrink-0 mt-0.5" />
                        <p className="text-[10px] text-slate-500 leading-tight">
                          Must be 10+ chars, with at least one uppercase, lowercase, number, and special character.
                        </p>
                      </div>
                    )}
                  </div>
                )}

                <button
                   type="submit"
                   disabled={isLoading || (mode !== 'reset' && !hasAgreed)}
                   className={`w-full flex items-center justify-center gap-2 bg-indigo-600 text-white font-bold py-2.5 px-6 rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 mt-2 text-sm ${(mode !== 'reset' && !hasAgreed) || isLoading ? 'opacity-50 cursor-not-allowed grayscale' : ''}`}
                 >
                   {isLoading ? (
                      <Loader2 size={18} className="animate-spin text-white/70" />
                   ) : (
                      <>
                        {mode === 'signin' ? 'Sign In' : mode === 'signup' ? 'Create Account' : 'Send Reset Link'}
                        {mode !== 'reset' && <ArrowRight size={16} />}
                      </>
                   )}
                 </button>
             </form>

             <div className="pt-2 text-center">
               {mode === 'reset' ? (
                 <button 
                   onClick={() => { setMode('signin'); setError(''); setSuccessMsg(''); }}
                   className="flex items-center justify-center gap-2 w-full text-xs font-bold text-slate-500 hover:text-indigo-600 transition-colors"
                 >
                   <ArrowLeft size={14} /> Back to Sign In
                 </button>
               ) : (
                 <button 
                   onClick={() => {
                      setMode(mode === 'signin' ? 'signup' : 'signin');
                      setError('');
                      setSuccessMsg('');
                   }}
                   className="text-xs font-medium text-slate-500 hover:text-indigo-600 transition-colors"
                 >
                   {mode === 'signin' ? (
                     <>New to Sidekik? <span className="font-bold underline decoration-indigo-200 underline-offset-4">Create an account</span></>
                   ) : (
                     <>Already have an account? <span className="font-bold underline decoration-indigo-200 underline-offset-4">Sign in</span></>
                   )}
                 </button>
               )}
             </div>
           </div>
        </div>
      </div>

      {/* Legal Modal */}
      <Modal isOpen={showLegalModal} onClose={() => setShowLegalModal(false)} title="Beta Agreement">
        <BetaAgreement />
        <div className="mt-6 pt-4 border-t border-slate-100 flex justify-end">
           <button 
             onClick={() => { setHasAgreed(true); setShowLegalModal(false); }}
             className="px-6 py-2 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 transition-all"
           >
             Accept Terms
           </button>
        </div>
      </Modal>
    </div>
  );
};