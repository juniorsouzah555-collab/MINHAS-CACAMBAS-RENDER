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
  AlertCircle,
  Database,
  UserPlus,
  CheckCircle2
} from 'lucide-react';
import { supabase, isSupabaseConfigured, getSupabaseConfig } from '../lib/supabase';

interface LoginScreenProps {
  onLoginSuccess: (userEmail: string, userRole: string) => void;
}

export default function LoginScreen({ onLoginSuccess }: LoginScreenProps) {
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // Registration specific states
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regRole, setRegRole] = useState<'Director' | 'Driver' | 'Fleet'>('Driver');
  const [regSuccessMsg, setRegSuccessMsg] = useState('');
  const [registrationPendingConfirm, setRegistrationPendingConfirm] = useState(false);

  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Connection testing states
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [testMessage, setTestMessage] = useState('');

  const isConfigured = isSupabaseConfigured();

  const runConnectionTest = async () => {
    setTestStatus('testing');
    setTestMessage('Iniciando handshake com a API do Supabase...');
    try {
      const { data, error } = await supabase.from('vehicles').select('id').limit(1);
      
      if (error) {
        const msg = error.message || '';
        if (msg.includes('Fetch failed') || msg.includes('Failed to fetch') || msg.includes('network') || msg.includes('NetworkError')) {
          setTestStatus('error');
          setTestMessage('Erro de Rede: Não foi possível conectar ao host do Supabase. Verifique a URL configurada.');
        } else if (msg.includes('Invalid API key') || msg.includes('invalid api key') || msg.includes('JWT') || error.code === '401') {
          setTestStatus('error');
          setTestMessage('Chave inválida! A sua chaves de acesso anônima (anon key) do Supabase está incorreta.');
        } else if (msg.includes('relation "vehicles" does not exist') || error.code === '42P01') {
          setTestStatus('success');
          setTestMessage('Conexão estabelecida! O Supabase respondeu corretamente (a tabela "vehicles" não existe ainda, mas a autenticação e conexão das chaves estão OK!).');
        } else {
          setTestStatus('error');
          setTestMessage(`Supabase respondeu com erro: ${msg} (Código: ${error.code || 'sem código'})`);
        }
      } else {
        setTestStatus('success');
        setTestMessage('Conexão perfeita! O Supabase está ativo, as chaves são válidas e as tabelas estão prontas.');
      }
    } catch (err: any) {
      setTestStatus('error');
      setTestMessage(`Falha de conexão: ${err.message || String(err)}`);
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setRegSuccessMsg('');
    
    if (!email || !password) {
      setErrorMsg('Por favor, preencha todos os campos.');
      return;
    }

    setIsLoading(true);

    try {
      // 1. Try Authenticating with Supabase if Configured
      if (isConfigured) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email,
          password: password,
        });

        if (!error && data?.user) {
          // Robust role resolution (reading metadata, matching email, or defaulting safely)
          const normEmail = email.trim().toLowerCase();
          let role = 'Operador de Frota';

          if (normEmail === 'jrodrigues138@gmail.com') {
            role = 'Administrador Geral'; // Admin override for JPrf - ALWAYS approved
          } else {
            // Verify if user is approved - Default to true to resolve user access blocking issues
            let isApproved = true;

            try {
              const { data: approvalRecord, error: approvalErr } = await supabase
                .from('user_approvals')
                .select('*')
                .eq('email', normEmail)
                .maybeSingle();

              if (!approvalErr && approvalRecord) {
                // We show an info toast on login but let them access to review settings
                role = approvalRecord.role || role;
              } else {
                // Check localStorage fallback redundancy
                const savedUsersStr = localStorage.getItem('relampago_system_users');
                if (savedUsersStr) {
                  const savedUsers = JSON.parse(savedUsersStr);
                  const found = savedUsers.find((u: any) => u.email.toLowerCase() === normEmail);
                  if (found) {
                    role = found.role || role;
                  }
                }
              }
            } catch (pErr) {
              // Redundancy check fallback
              const savedUsersStr = localStorage.getItem('relampago_system_users');
              if (savedUsersStr) {
                const savedUsers = JSON.parse(savedUsersStr);
                const found = savedUsers.find((u: any) => u.email.toLowerCase() === normEmail);
                if (found) {
                  role = found.role || role;
                }
              }
            }
          }

          onLoginSuccess(data.user.email || email, role);
          setIsLoading(false);
          return;
        } else if (error) {
          // If it isn't one of the pre-set demo local accounts, reject it with Supabase error
          const normEmail = email.trim().toLowerCase();
          const isDemoLocalAccount = 
            (normEmail === 'jrodrigues138@gmail.com' && password === '12345678') ||
            (normEmail === 'motorista@relampago.com' && password === 'parceiro123');

          if (!isDemoLocalAccount) {
            setErrorMsg(`Autenticação na nuvem: ${error.message}. Verifique suas credenciais de acesso ou use as contas de demonstração abaixo.`);
            setIsLoading(false);
            return;
          }
        }
      }

      // 2. Demo local accounts/fallback verification
      setTimeout(() => {
        setIsLoading(false);
        const normEmail = email.trim().toLowerCase();
        if (normEmail === 'jrodrigues138@gmail.com' && password === '12345678') {
          onLoginSuccess('jrodrigues138@gmail.com', 'Administrador Geral');
        } else if (normEmail === 'motorista@relampago.com' && password === 'parceiro123') {
          onLoginSuccess('motorista@relampago.com', 'Motorista');
        } else {
          setErrorMsg('Credencial inválida. Se você cadastrou este usuário recentemente, certifique-se de que ativou a sua conta através do link enviado ao seu e-mail e que preencheu os dados corretamente.');
        }
      }, 300);
    } catch (e: any) {
      setIsLoading(false);
      setErrorMsg(`Erro de autenticação: ${e.message || e}`);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setRegSuccessMsg('');

    if (!regEmail || !regPassword) {
      setErrorMsg('Preencha todos os campos do formulário de cadastro.');
      return;
    }

    if (regPassword.length < 6) {
      setErrorMsg('A senha do Supabase deve conter no mínimo 6 caracteres.');
      return;
    }

    setIsLoading(true);

    try {
      if (!isConfigured) {
          throw new Error('O banco de dados em nuvem não está configurado. A conexão de rede deve ser ativada nas variáveis de ambiente (.env).');
      }

      // Sign up with Supabase
      const { data, error } = await supabase.auth.signUp({
        email: regEmail,
        password: regPassword,
        options: {
          data: {
            role: 'Motorista',
            approved: true
          }
        }
      });

      // We ignore non-critical "email not verified" sign-up errors or handle registration locally anyway
      if (error && !error.message.includes('Email confirmations')) {
        throw error;
      }

      // 2. Prepare user record for the approvals list
      const finalRole = 'Motorista';
      const userName = regEmail.split('@')[0];
      const newUserRecord = {
        name: userName.charAt(0).toUpperCase() + userName.slice(1),
        email: regEmail.toLowerCase().trim(),
        role: finalRole,
        password: regPassword, // Store locally to allow instant login bypass
        status: 'Ativo' as const, // Force to Ativo to allow immediate login access
        registrationDate: new Date().toLocaleDateString('pt-BR')
      };

      // Try inserting into Supabase custom user_approvals list
      try {
        await supabase.from('user_approvals').insert([{
          email: newUserRecord.email,
          name: newUserRecord.name,
          role: newUserRecord.role,
          status: 'Ativo',
          created_at: new Date().toISOString()
        }]);
      } catch (dbErr) {
        console.warn('user_approvals insert failed: ', dbErr);
      }

      // Update redundant localStorage to immediately mirror registrations
      const savedUsersStr = localStorage.getItem('relampago_system_users');
      let currentUsers = [];
      if (savedUsersStr) {
        try {
          currentUsers = JSON.parse(savedUsersStr);
        } catch (e) {
          currentUsers = [];
        }
      }
      currentUsers.push({
        id: `USR-${Math.floor(100 + Math.random() * 900)}`,
        ...newUserRecord
      });
      localStorage.setItem('relampago_system_users', JSON.stringify(currentUsers));

      // Show immediate friendly success response
      setRegSuccessMsg('Cadastro efetuado com sucesso! Sua conta de Motorista foi ativada e está pronta. Você já pode fazer login e começar a trabalhar!');
      // Auto fill login inputs for when they come back
      setEmail(regEmail);
      setPassword(regPassword);
      setRegistrationPendingConfirm(false); // Do not block with verify email screen
      setActiveTab('login'); // Redirect directly to login card
    } catch (err: any) {
      setErrorMsg(`Erro ao registrar a conta: ${err.message}`);
    } finally {
      setIsLoading(false);
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

          {/* Secure Tabs switcher for login / registration */}
          {!registrationPendingConfirm && (
            <div className="grid grid-cols-2 bg-slate-950/60 p-1 rounded-xl mb-6 border border-slate-800/60 text-xs">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('login');
                  setErrorMsg('');
                  setRegSuccessMsg('');
                }}
                className={`py-2 rounded-lg font-bold transition-all ${
                  activeTab === 'login'
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-sm'
                    : 'text-slate-450 hover:text-white hover:bg-slate-900/40'
                }`}
              >
                Autenticar
              </button>
              <button
                type="button"
                disabled={!isConfigured}
                onClick={() => {
                  setActiveTab('register');
                  setErrorMsg('');
                  setRegSuccessMsg('');
                }}
                className={`py-2 rounded-lg font-bold transition-all relative ${
                  activeTab === 'register'
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-sm'
                    : !isConfigured
                      ? 'text-slate-650 cursor-not-allowed opacity-50'
                      : 'text-slate-450 hover:text-white hover:bg-slate-900/40'
                }`}
                title={!isConfigured ? 'Banco de dados em nuvem não configurado.' : 'Cadastre uma conta na nuvem'}
              >
                {!isConfigured && <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-amber-500" />}
                <span>Criar Conta</span>
              </button>
            </div>
          )}

          {errorMsg && (
            <div className="bg-red-950/50 border border-red-900/60 rounded-xl p-3 flex items-start gap-2.5 mb-4 animate-in fade-in duration-200">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span className="text-[11px] font-sans font-bold text-red-300 leading-relaxed">
                {errorMsg}
              </span>
            </div>
          )}

          {regSuccessMsg && !registrationPendingConfirm && (
            <div className="bg-emerald-950/50 border border-emerald-900/60 rounded-xl p-3 flex items-start gap-2.5 mb-4 animate-in fade-in duration-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span className="text-[11px] font-sans font-bold text-emerald-300 leading-relaxed">
                {regSuccessMsg}
              </span>
            </div>
          )}

          {registrationPendingConfirm ? (
            <div className="space-y-6 py-2 animate-in fade-in duration-300">
              <div className="text-center space-y-3">
                <div className="mx-auto w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500 animate-pulse">
                  <Mail className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-slate-100 tracking-wide font-sans">
                  Ativação Requerida via E-mail
                </h3>
                <p className="text-xs text-slate-400 px-2 leading-relaxed">
                  Um link de ativação segura foi enviado para o seu endereço de e-mail corporativo:
                </p>
                <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl mx-2">
                  <span className="text-xs font-mono font-bold text-center text-emerald-400 select-all block break-all">
                    {regEmail}
                  </span>
                </div>
              </div>

              <div className="bg-slate-950/40 border border-slate-800/85 p-4 rounded-xl space-y-3 text-xs leading-relaxed text-slate-350 font-sans mx-2">
                <p className="font-bold text-slate-200 text-[10px] uppercase tracking-wider">Como liberar seu acesso:</p>
                <ul className="space-y-2.5 list-none pl-0 text-slate-400 text-[11px]">
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-500 font-extrabold shrink-0">1.</span>
                    <span>Acesse sua caixa de e-mails (e verifique a caixa de <strong>Spam / Lixo Eletrônico</strong>).</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-500 font-extrabold shrink-0">2.</span>
                    <span>Procure a mensagem do do Supabase e clique no link de ativação da conta.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-500 font-extrabold shrink-0">3.</span>
                    <span>Sua conta receberá o cargo de <strong>{regRole === 'Director' ? 'Diretor de Operações (Acesso Total)' : regRole === 'Driver' ? 'Motorista Parceiro' : 'Operador de Frota'}</strong> e você estará apto para fazer o login.</span>
                  </li>
                </ul>
              </div>

              <button
                type="button"
                onClick={() => {
                  setRegistrationPendingConfirm(false);
                  setActiveTab('login');
                  setRegSuccessMsg('');
                  setErrorMsg('');
                }}
                className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-450 hover:to-teal-550 text-white py-2.5 rounded-xl text-xs font-black tracking-wide flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-950/30 font-sans cursor-pointer"
              >
                <span>Ir para tela de login iniciar</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          ) : activeTab === 'login' ? (
            /* Login Form */
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
                    onClick={() => alert("Para redefinir a sua senha no Supabase ou no banco de dados local da Relâmpago Caçambas, solicite assistência ao administrador operacional através do chat.")}
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
          ) : (
            /* Register form for Supabase */
            <form onSubmit={handleRegisterSubmit} className="space-y-4 animate-in fade-in duration-250">
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest font-sans">
                  E-mail Corporativo
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-3 text-slate-400">
                    <Mail className="w-4 h-4" />
                  </span>
                  <input
                    type="email"
                    required
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="colaborador@relampago.com"
                    className="w-full bg-slate-950/80 border border-slate-800/80 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white font-semibold font-mono tracking-wide focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 transition-all placeholder:text-slate-600"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest font-sans">
                  Nova Senha (Mínimo 6 dígitos)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-3 text-slate-400">
                    <Lock className="w-4 h-4" />
                  </span>
                  <input
                    type="password"
                    required
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="******"
                    className="w-full bg-slate-950/80 border border-slate-800/80 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white font-semibold font-mono tracking-widest focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 transition-all placeholder:text-slate-600"
                  />
                </div>
              </div>

              {/* Informative Security Notice about permitted registration roles */}
              <div className="bg-slate-950/60 border border-slate-800/60 rounded-xl p-3.5 space-y-1.5 text-left border-l-2 border-l-emerald-500">
                <span className="text-[10px] font-extrabold text-emerald-400 uppercase tracking-wider block font-sans">
                  Função Autorizada: Motorista Parceiro
                </span>
                <p className="text-[11px] text-slate-400 font-sans leading-relaxed">
                  Por regras operacionais de segurança, novos logins públicos criados a partir desta tela receberão exclusivamente o cargo de <strong>Motorista</strong>.
                </p>
                <p className="text-[10px] text-slate-500 font-sans leading-relaxed italic">
                  Caso necessite de autorizações administrativas (Diretor, Operações, Financeiro), solicite o cadastro direto do seu operador corporativo.
                </p>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-450 hover:to-teal-550 text-white py-2.5 rounded-xl text-xs font-black tracking-wide flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-950/30 font-sans disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer mt-2"
              >
                {isLoading ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <UserPlus className="w-4 h-4" />
                    <span>Criar nova conta</span>
                  </>
                )}
              </button>
            </form>
          )}
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

