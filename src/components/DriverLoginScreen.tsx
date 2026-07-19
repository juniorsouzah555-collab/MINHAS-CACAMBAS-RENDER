import React, { useState } from 'react';
import { Truck, Lock, ArrowRight, AlertCircle } from 'lucide-react';

interface DriverLoginScreenProps {
  motorista: string;
  onLoginSuccess: () => void;
  onBack: () => void;
}

export default function DriverLoginScreen({ motorista, onLoginSuccess, onBack }: DriverLoginScreenProps) {
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      if (res.ok) {
        const data = await res.json();
        localStorage.setItem('relampago_driver_token', data.token);
        localStorage.setItem('relampago_driver_name', motorista);
        setIsLoading(false);
        onLoginSuccess();
        return;
      }
    } catch {}

    // Fallback: senha fixa do motorista
    if (password === '56740305') {
      localStorage.setItem('relampago_driver_token', 'driver-session');
      localStorage.setItem('relampago_driver_name', motorista);
      setIsLoading(false);
      onLoginSuccess();
      return;
    }

    setIsLoading(false);
    setErrorMsg('Senha incorreta. Tente novamente.');
  };

  return (
    <div className="bg-gradient-to-br from-slate-900 to-indigo-950 min-h-screen text-slate-100 font-sans antialiased flex items-center justify-center p-6">
      <div className="text-center max-w-sm w-full">
        <Truck className="w-14 h-14 text-emerald-400 mx-auto mb-4" />
        <h1 className="text-xl font-black text-white mb-1">Relâmpago Caçambas</h1>
        <p className="text-sm text-slate-400 mb-2">Olá, <span className="text-emerald-400 font-bold">{motorista}</span></p>
        <p className="text-xs text-slate-500 mb-6">Digite sua senha para continuar</p>

        {errorMsg && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 flex items-center gap-2 mb-4">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span className="text-xs text-red-300">{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500">
              <Lock className="w-4 h-4" />
            </span>
            <input
              type="password"
              autoFocus
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Digite sua senha"
              className="w-full bg-slate-800/50 border border-slate-600/50 rounded-xl pl-10 pr-4 py-3.5 text-sm text-white font-medium placeholder:text-slate-500 focus:border-emerald-500 focus:ring-0"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading || !password}
            className="w-full py-3.5 rounded-xl bg-emerald-600 text-white font-black text-base hover:bg-emerald-700 active:scale-[0.98] transition-all shadow-lg shadow-emerald-500/30 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <span>Entrar</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <button
          onClick={onBack}
          className="mt-6 text-xs text-slate-500 hover:text-slate-300 cursor-pointer"
        >
          ← Voltar
        </button>
      </div>
    </div>
  );
}
