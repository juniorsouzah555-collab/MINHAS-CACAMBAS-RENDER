import React, { useState, useEffect } from 'react';
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
import { supabase, isSupabaseConfigured, updateUserPasswordByEmail, createInvitedUser } from '../lib/supabase';

interface LoginScreenProps {
  onLoginSuccess: (userEmail: string, userRole: string) => void;
}

export default function LoginScreen({ onLoginSuccess }: LoginScreenProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const isConfigured = isSupabaseConfigured();

  // Limpeza: remove de relampago_invited_drivers quem nao esta em relampago_system_users
  useEffect(() => {
    try {
      const invitedRaw = localStorage.getItem('relampago_invited_drivers');
      const systemRaw = localStorage.getItem('relampago_system_users');
      if (invitedRaw && systemRaw) {
        const invited = JSON.parse(invitedRaw);
        const system = JSON.parse(systemRaw);
        const systemEmails = new Set(system.map((u: any) => u.email?.toLowerCase().trim()));
        const filtered = invited.filter((d: any) => systemEmails.has(d.email?.toLowerCase().trim()));
        if (filtered.length !== invited.length) {
          localStorage.setItem('relampago_invited_drivers', JSON.stringify(filtered));
        }
      }
    } catch {}
  }, []);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    
    if (!email || !password) {
      setErrorMsg('Por favor, preencha todos os campos.');
      return;
    }

    setIsLoading(true);

    const normEmail = email.trim().toLowerCase();

    // 1. Tenta login via Supabase (funciona se email já foi confirmado)
    if (isConfigured) {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: normEmail,
        password: password,
      });

      if (!error && data?.user) {
        // Verifica se o usuario existe no user_approvals (pode ter sido excluido)
        if (normEmail !== 'jrodrigues138@gmail.com') {
          try {
            const { data: approvalRecord } = await supabase
              .from('user_approvals')
              .select('*')
              .eq('email', normEmail)
              .maybeSingle();
            if (!approvalRecord) {
              await supabase.auth.signOut();
              setIsLoading(false);
              setErrorMsg('Este usuario foi removido do sistema. Contate o administrador.');
              return;
            }
            let role = approvalRecord.role || 'Operador de Frota';
            setIsLoading(false);
            onLoginSuccess(normEmail, role);
            return;
          } catch {
            setIsLoading(false);
            setErrorMsg('Erro ao verificar usuario. Tente novamente.');
            return;
          }
        }
        setIsLoading(false);
        onLoginSuccess(normEmail, 'Administrador Geral');
        return;
      }

      // Se signInWithPassword falhou, tenta confirmar email + atualizar senha via Admin API
      // (para usuários convidados antes da autoconfirmação automática)
      try {
        const { data: checkUser } = await supabase
          .from('user_approvals')
          .select('email, role')
          .eq('email', normEmail)
          .maybeSingle();
        if (checkUser) {
          const ok = await updateUserPasswordByEmail(normEmail, password);
          if (ok) {
            const { data: retryData, error: retryError } = await supabase.auth.signInWithPassword({
              email: normEmail,
              password: password,
            });
            if (!retryError && retryData?.user) {
              setIsLoading(false);
              onLoginSuccess(normEmail, checkUser.role || 'Motorista');
              return;
            }
          } else {
            const created = await createInvitedUser(normEmail, password);
            if (created.ok) {
              const { data: retryData2, error: retryError2 } = await supabase.auth.signInWithPassword({
                email: normEmail,
                password: password,
              });
              if (!retryError2 && retryData2?.user) {
                setIsLoading(false);
                onLoginSuccess(normEmail, checkUser.role || 'Motorista');
                return;
              }
            }
          }
        }
      } catch {}
    }

    // 2. Fallback: contas demo fixas
    const isDemo = 
      (normEmail === 'jrodrigues138@gmail.com' && password === '12345678') ||
      (normEmail === 'motorista@relampago.com' && password === 'parceiro123');

    if (isDemo) {
      const role = normEmail === 'jrodrigues138@gmail.com' ? 'Administrador Geral' : 'Motorista';
      setIsLoading(false);
      onLoginSuccess(normEmail, role);
      return;
    }

    // 3. Fallback: motoristas convidados (verifica localStorage + Supabase)
    try {
      const raw = localStorage.getItem('relampago_invited_drivers');
      if (raw) {
        const invited: { email: string; password: string; role: string }[] = JSON.parse(raw);
        const match = invited.find(d => d.email === normEmail && d.password === password);
        if (match) {
          // Verifica se o usuario ainda existe no Supabase antes de permitir login
          if (isConfigured) {
            try {
              const { data: approvalRecord } = await supabase
                .from('user_approvals')
                .select('email')
                .eq('email', normEmail)
                .maybeSingle();
              // Se erro na query ou usuario nao encontrado, trata como deletado
              if (!approvalRecord) {
                const filtered = invited.filter(d => d.email !== normEmail);
                localStorage.setItem('relampago_invited_drivers', JSON.stringify(filtered));
                setIsLoading(false);
                setErrorMsg('Este usuario foi removido do sistema. Contate o administrador.');
                return;
              }
            } catch {
              // Se query falhar (RLS, rede), assume que usuario foi deletado
              const filtered = invited.filter(d => d.email !== normEmail);
              localStorage.setItem('relampago_invited_drivers', JSON.stringify(filtered));
              setIsLoading(false);
              setErrorMsg('Este usuario foi removido do sistema. Contate o administrador.');
              return;
            }
          }
          setIsLoading(false);
          onLoginSuccess(normEmail, match.role);
          return;
        }
      }
    } catch {}

    // 4. Nada funcionou
    setIsLoading(false);
    setErrorMsg('Credencial inválida. Verifique seu e-mail e senha ou solicite um novo convite ao administrador.');
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
          <div className="text-center mb-6">
            <div 
              className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-400 via-emerald-600 to-teal-700 p-0.5 shadow-xl shadow-emerald-950/40 mb-3"
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

          {errorMsg && (
            <div className="bg-red-950/50 border border-red-900/60 rounded-xl p-3 flex items-start gap-2.5 mb-4">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span className="text-[11px] font-sans font-bold text-red-300 leading-relaxed">
                {errorMsg}
              </span>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest font-sans animate-pulse">
                E-mail do Operador ou Motorista
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

            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="block text-[10px] font-bold text-slate-450 uppercase tracking-widest font-sans">
                  Senha de Acesso
                </label>
                <button
                  type="button"
                  onClick={() => alert("Solicite ao administrador a redefinição da sua senha.")}
                  className="text-[9px] font-extrabold text-emerald-400 hover:underline cursor-pointer font-sans font-mono"
                >
                  Recuperar senha?
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

            <div className="flex items-center justify-between text-[11px] text-slate-400 font-sans pt-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input 
                  type="checkbox" 
                  defaultChecked 
                  className="rounded border-slate-800 bg-slate-950 text-emerald-500 focus:ring-0 focus:ring-offset-0 w-3.5 h-3.5" 
                />
                <span>Lembrar credenciais</span>
              </label>
              <div className="flex items-center gap-1 text-[10px] text-emerald-500/80 font-bold">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Criptografado</span>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-450 hover:to-teal-550 text-white py-2.5 rounded-xl text-xs font-black tracking-wide flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-950/30 font-sans disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>Entrar no Painel</span>
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

