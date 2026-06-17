import React, { useState } from 'react';
import { 
  Lock, 
  Mail, 
  Eye, 
  EyeOff, 
  Truck, 
  ShieldCheck, 
  Zap, 
  ArrowRight,
  AlertCircle
} from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

interface LoginScreenProps {
  onLoginSuccess: (userEmail: string, userRole: string) => void;
}

export default function LoginScreen({ onLoginSuccess }: LoginScreenProps) {
  const [email, setEmail] = useState('JRodrigues138@gmail.com');
  const [password, setPassword] = useState('relampago2026');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    
    if (!email || !password) {
      setErrorMsg('Por favor, preencha todos os campos.');
      return;
    }

    setIsLoading(true);

    try {
      // 1. Try Authenticating with Supabase if Configured
      if (isSupabaseConfigured()) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email,
          password: password,
        });

        if (!error && data?.user) {
          const role = email === 'JRodrigues138@gmail.com' ? 'Diretor de Operações' : 'Operador de Frota';
          onLoginSuccess(data.user.email || email, role);
          setIsLoading(false);
          return;
        } else if (error) {
          // If it isn't one of the pre-set demo local accounts, reject it with Supabase error
          const isDemoLocalAccount = 
            (email === 'JRodrigues138@gmail.com' && password === 'relampago2026') ||
            (email === 'motorista@relampago.com' && password === 'parceiro123') ||
            (email === 'admin' && password === 'admin');

          if (!isDemoLocalAccount) {
            setErrorMsg(`Supabase Auth: ${error.message}`);
            setIsLoading(false);
            return;
          }
        }
      }

      // 2. Demo local accounts/fallback verification
      setTimeout(() => {
        setIsLoading(false);
        if (email === 'JRodrigues138@gmail.com' && password === 'relampago2026') {
          onLoginSuccess(email, 'Diretor de Operações');
        } else if (email === 'motorista@relampago.com' && password === 'parceiro123') {
          onLoginSuccess(email, 'Operador de Frota');
        } else if (email === 'admin' && password === 'admin') {
          onLoginSuccess('admin@relampago.com', 'Administrador');
        } else {
          setErrorMsg('E-mail ou senha incorretos! Por favor, verifique as suas credenciais de acesso.');
        }
      }, 300);
    } catch (e: any) {
      setIsLoading(false);
      setErrorMsg(`Erro de autenticação: ${e.message || e}`);
    }
  };

  return (
    <div className="min-h-screen w-full bg-slate-950 flex flex-col justify-center items-center p-4 relative overflow-hidden select-none">
      
      {/* Immersive background decoration (ambient circles) */}
      <div className="absolute top-[-25%] left-[-15%] w-[60%] h-[60%] rounded-full bg-emerald-950/20 blur-[130px] pointer-events-none animate-pulse-glow" style={{ animationDuration: '8s' }} />
      <div className="absolute bottom-[-15%] right-[-10%] w-[55%] h-[55%] rounded-full bg-purple-950/20 blur-[160px] pointer-events-none animate-pulse-glow" style={{ animationDelay: '-5s', animationDuration: '10s' }} />
      
      {/* Decorative lightning spark grid pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#020617_2px,transparent_2px),linear-gradient(to_bottom,#020617_2px,transparent_2px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-35" />

      {/* Main Container */}
      <div className="w-full max-w-md space-y-4 relative z-10">
        
        {/* Main login card box with clean entering animation */}
        <div 
          className="w-full bg-slate-900/40 backdrop-blur-xl border border-slate-800/80 rounded-3xl p-8 shadow-2xl relative"
        >
          {/* Brand Header */}
          <div className="text-center mb-8">
            <div 
              className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-400 via-emerald-600 to-teal-700 p-0.5 shadow-xl shadow-emerald-950/40 mb-4"
            >
              <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center relative overflow-hidden">
                <Zap className="w-8 h-8 text-emerald-400 absolute animate-pulse" />
                <Truck className="w-5 h-5 text-emerald-500 opacity-20 absolute -bottom-1 -right-1" />
              </div>
            </div>
            
            <h1 className="text-2xl font-black font-sans text-white tracking-tight leading-none">
              Relâmpago Caçambas
            </h1>
            <p className="text-xs text-slate-400 font-medium mt-2 font-sans">
              Logística Inteligente de Entulhos & Gestão de Caçambas
            </p>
          </div>

          {/* Form area */}
          <form onSubmit={handleLoginSubmit} className="space-y-5">
            {errorMsg && (
              <div 
                className="bg-red-950/50 border border-red-900/60 rounded-xl p-3 flex items-start gap-2.5"
              >
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <span className="text-[11px] font-sans font-bold text-red-300 leading-relaxed">
                  {errorMsg}
                </span>
              </div>
            )}

            {/* Email input field */}
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest font-sans">
                E-mail Funcional
              </label>
              <div className="relative">
                <span className="absolute left-3 top-3 text-slate-400">
                  <Mail className="w-4 h-4" />
                </span>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nome@relampago.com"
                  className="w-full bg-slate-950/80 border border-slate-800/80 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white font-semibold font-mono tracking-wide focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 transition-all placeholder:text-slate-600"
                />
              </div>
            </div>

            {/* Password Input field */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="block text-[10px] font-bold text-slate-450 uppercase tracking-widest font-sans">
                  Senha Operacional
                </label>
                <button
                  type="button"
                  onClick={() => alert("Por favor, entre em contato com o administrador do sistema operacional para recuperar ou redefinir a sua senha.")}
                  className="text-[9px] font-extrabold text-emerald-400 hover:underline cursor-pointer font-sans"
                >
                  Esqueceu a senha?
                </button>
              </div>
              <div className="relative">
                <span className="absolute left-3 top-3 text-slate-400">
                  <Lock className="w-4 h-4" />
                </span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="******"
                  className="w-full bg-slate-950/80 border border-slate-800/80 rounded-xl pl-10 pr-10 py-2.5 text-xs text-white font-semibold font-mono tracking-widest focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 transition-all placeholder:text-slate-600"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Remember me & security declaration */}
            <div className="flex items-center justify-between text-[11px] text-slate-400 font-sans">
              <label className="flex items-center gap-2 cursor-pointer">
                <input 
                  type="checkbox" 
                  defaultChecked 
                  className="rounded border-slate-800 bg-slate-950 text-emerald-500 focus:ring-0 focus:ring-offset-0 w-3.5 h-3.5" 
                />
                <span>Manter conectado</span>
              </label>
              <div className="flex items-center gap-1 text-[10px] text-emerald-500/80 font-bold">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Criptografia SSL</span>
              </div>
            </div>

            {/* Submit Action Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-450 hover:to-teal-550 text-white py-2.5 rounded-xl text-xs font-black tracking-wide flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-950/30 font-sans disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>Autenticar no Sistema</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Page Footer credentials */}
        <div className="text-center">
          <span className="text-[10px] text-slate-600 font-mono mt-2 inline-block">
            © 2026 Relâmpago Caçambas Ltda. Todos os direitos reservados.
          </span>
        </div>
      </div>
    </div>
  );
}
