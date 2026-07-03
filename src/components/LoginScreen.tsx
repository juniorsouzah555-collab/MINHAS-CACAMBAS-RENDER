import React, { useState } from 'react';
import { 
  Lock, 
  Mail, 
  Eye, 
  EyeOff, 
  Truck, 
  ShieldCheck, 
  ArrowRight,
  AlertCircle
} from 'lucide-react';

interface LoginScreenProps {
  onLoginSuccess: (userEmail: string, userRole: string) => void;
}

export default function LoginScreen({ onLoginSuccess }: LoginScreenProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

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
    const normEmail = email.trim().toLowerCase();

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      if (res.ok) {
        const data = await res.json();
        localStorage.setItem('relampago_token', data.token);
        const role = normEmail === 'jrodrigues138@gmail.com' ? 'Administrador Geral' : 'Operador de Frota';
        setIsLoading(false);
        onLoginSuccess(normEmail, role);
        return;
      }
    } catch {}

    const isDemo = 
      (normEmail === 'jrodrigues138@gmail.com' && password === '12345678') ||
      (normEmail === 'motorista@relampago.com' && password === 'parceiro123');

    if (isDemo) {
      const role = normEmail === 'jrodrigues138@gmail.com' ? 'Administrador Geral' : 'Motorista';
      localStorage.setItem('relampago_token', 'demo-token');
      setIsLoading(false);
      onLoginSuccess(normEmail, role);
      return;
    }

    try {
      const raw = localStorage.getItem('relampago_invited_drivers');
      if (raw) {
        const invited: { email: string; password: string; role: string }[] = JSON.parse(raw);
        const match = invited.find(d => d.email === normEmail && d.password === password);
        if (match) {
          localStorage.setItem('relampago_token', 'invited-token');
          setIsLoading(false);
          onLoginSuccess(normEmail, match.role);
          return;
        }
      }
    } catch {}

    setIsLoading(false);
    setErrorMsg('Credencial inv�lida. Verifique seu e-mail e senha ou solicite um novo convite ao administrador.');
  };

  return (
    <div className="min-h-screen w-full bg-[#f8f6f3] flex flex-col justify-center items-center p-4 relative overflow-hidden select-none">
      
      {/* Decorative subtle background */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-teal-500/3 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-15%] right-[-10%] w-[55%] h-[55%] rounded-full bg-amber-500/3 blur-[150px] pointer-events-none" />
      
      {/* Subtle grid pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#e5e2dd_1px,transparent_1px),linear-gradient(to_bottom,#e5e2dd_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-20" />

      {/* Main Container */}
      <div className="w-full max-w-sm space-y-5 relative z-10">
        
        {/* Logo area */}
        <div className="text-center animate-fade-in-up">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-white border border-[#e5e2dd] shadow-sm mb-4">
            <div className="w-full h-full rounded-[14px] flex items-center justify-center bg-gradient-to-br from-teal-500 to-teal-600">
              <Truck className="w-7 h-7 text-white" />
            </div>
          </div>
          <h1 className="text-2xl font-display font-bold text-[#1a1a2e] tracking-tight">
            Relâmpago Caçambas
          </h1>
          <p className="text-sm text-[#6b7280] mt-1.5 font-medium">
            Logística Inteligente de Entulhos
          </p>
        </div>

        {/* Main login card */}
        <div className="bg-white border border-[#e5e2dd] rounded-2xl p-6 shadow-sm animate-fade-in-up delay-100">
          
          {errorMsg && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3.5 flex items-start gap-3 mb-4 animate-fade-in">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <span className="text-[13px] font-medium text-red-700 leading-relaxed">
                {errorMsg}
              </span>
            </div>
          )}

          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-[#6b7280]">
                E-mail
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#b0aba3]">
                  <Mail className="w-4 h-4" />
                </span>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nome@relampago.com"
                  className="w-full bg-white border border-[#e5e2dd] rounded-xl pl-10 pr-4 py-2.5 text-sm text-[#1a1a2e] font-medium placeholder:text-[#b0aba3] focus:border-teal-500 focus:ring-0"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="block text-xs font-semibold text-[#6b7280]">
                  Senha
                </label>
                <button
                  type="button"
                  onClick={() => alert("Solicite ao administrador a redefinição da sua senha.")}
                  className="text-[11px] font-semibold text-teal-600 hover:text-teal-700 cursor-pointer"
                >
                  Recuperar senha?
                </button>
              </div>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#b0aba3]">
                  <Lock className="w-4 h-4" />
                </span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-white border border-[#e5e2dd] rounded-xl pl-10 pr-10 py-2.5 text-sm text-[#1a1a2e] font-medium placeholder:text-[#b0aba3] focus:border-teal-500 focus:ring-0"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#b0aba3] hover:text-[#6b7280] transition-colors cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-[#9ca3af] pt-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input 
                  type="checkbox" 
                  defaultChecked 
                  className="rounded border-[#e5e2dd] bg-white text-teal-600 focus:ring-0 focus:ring-offset-0 w-4 h-4" 
                />
                <span>Lembrar credenciais</span>
              </label>
              <div className="flex items-center gap-1.5 text-teal-600/70">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span className="font-medium">Criptografado</span>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-teal-600 hover:bg-teal-700 text-white py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all shadow-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>Entrar no Painel</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>

        <div className="text-center animate-fade-in-up delay-200">
          <span className="text-xs text-[#b0aba3]">
            © 2026 Relâmpago Caçambas Ltda.
          </span>
        </div>
      </div>
    </div>
  );
}
