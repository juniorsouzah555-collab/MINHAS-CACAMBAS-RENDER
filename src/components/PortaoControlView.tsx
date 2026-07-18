import React, { useState, useEffect } from 'react';
import { Lock, Unlock, ShieldCheck, Clock, AlertTriangle } from 'lucide-react';

const API_BASE = window.location.origin;

export default function PortaoControlView() {
  const [password, setPassword] = useState('');
  const [authenticated, setAuthenticated] = useState(false);
  const [override, setOverride] = useState<'normal' | 'liberado' | 'travado'>('normal');
  const [schedule, setSchedule] = useState<{ allowed: boolean; reason: string }>({ allowed: false, reason: '' });
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  const fetchStatus = async () => {
    try {
      const r = await fetch(`${API_BASE}/api/portao-control`);
      const data = await r.json();
      setOverride(data.override);
      setSchedule(data.schedule);
    } catch {}
  };

  useEffect(() => { fetchStatus(); }, []);

  const handleAuth = async () => {
    setLoading(true);
    setError('');
    try {
      const r = await fetch(`${API_BASE}/api/portao-control`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password, action: override }),
      });
      const data = await r.json();
      if (!r.ok) { setError(data.error); return; }
      setAuthenticated(true);
      setMsg('Acesso liberado');
    } catch {
      setError('Erro ao conectar');
    } finally { setLoading(false); }
  };

  const handleAction = async (action: 'normal' | 'liberado' | 'travado') => {
    setLoading(true);
    setError('');
    setMsg('');
    try {
      const r = await fetch(`${API_BASE}/api/portao-control`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password, action }),
      });
      const data = await r.json();
      if (!r.ok) { setError(data.error); return; }
      setOverride(data.override);
      setMsg(action === 'liberado' ? 'Portão LIBERADO — funciona sempre' : action === 'travado' ? 'Portão TRAVADO — bloqueado' : 'Modo normal — respeita horários');
    } catch {
      setError('Erro ao conectar');
    } finally { setLoading(false); }
  };

  if (!authenticated) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm max-w-md mx-auto mt-10">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
            <Lock className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <h2 className="font-sans font-bold text-lg text-slate-900">Controle do Portão</h2>
            <p className="text-xs text-slate-500">Acesso restrito — senha necessária</p>
          </div>
        </div>
        <div className="space-y-4">
          <input
            type="password"
            placeholder="Digite a senha"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAuth()}
            className="w-full px-4 py-3 rounded-lg border border-slate-300 text-sm font-bold outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
          />
          {error && <p className="text-xs text-red-600 font-bold">{error}</p>}
          <button
            onClick={handleAuth}
            disabled={loading || !password}
            className="w-full py-3 rounded-lg bg-amber-600 text-white font-bold text-sm hover:bg-amber-700 transition-all cursor-pointer disabled:opacity-50"
          >
            {loading ? 'Verificando...' : 'Entrar'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm max-w-lg mx-auto mt-10 space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
          <ShieldCheck className="w-5 h-5 text-amber-600" />
        </div>
        <div>
          <h2 className="font-sans font-bold text-lg text-slate-900">Controle do Portão</h2>
          <p className="text-xs text-slate-500">Gerencie acesso e horários</p>
        </div>
      </div>

      {/* Status Atual */}
      <div className="p-4 rounded-lg border space-y-3" style={{
        borderColor: override === 'liberado' ? '#86efac' : override === 'travado' ? '#fca5a5' : '#e2e8f0',
        backgroundColor: override === 'liberado' ? '#f0fdf4' : override === 'travado' ? '#fef2f2' : '#f8fafc',
      }}>
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Modo Atual</span>
          <span className={`text-sm font-black px-3 py-1 rounded-full ${
            override === 'liberado' ? 'bg-green-500 text-white' : override === 'travado' ? 'bg-red-500 text-white' : 'bg-slate-200 text-slate-700'
          }`}>
            {override === 'liberado' ? 'LIBERADO' : override === 'travado' ? 'TRAVADO' : 'NORMAL'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-slate-400" />
          <span className={`text-xs font-bold ${schedule.allowed ? 'text-green-600' : 'text-red-600'}`}>
            {schedule.reason}
          </span>
        </div>
      </div>

      {/* Botões de Ação */}
      <div className="space-y-3">
        <button
          onClick={() => handleAction('liberado')}
          disabled={loading || override === 'liberado'}
          className="w-full py-4 rounded-xl bg-green-600 text-white font-black text-base hover:bg-green-700 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          <Unlock className="w-5 h-5" />
          Liberar Definitivo
        </button>
        <button
          onClick={() => handleAction('normal')}
          disabled={loading || override === 'normal'}
          className="w-full py-4 rounded-xl bg-slate-600 text-white font-black text-base hover:bg-slate-700 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          <Clock className="w-5 h-5" />
          Voltar ao Horário
        </button>
        <button
          onClick={() => handleAction('travado')}
          disabled={loading || override === 'travado'}
          className="w-full py-4 rounded-xl bg-red-600 text-white font-black text-base hover:bg-red-700 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          <Lock className="w-5 h-5" />
          Travar Portão
        </button>
      </div>

      {/* Mensagens */}
      {msg && <p className="text-xs text-green-600 font-bold text-center">{msg}</p>}
      {error && <p className="text-xs text-red-600 font-bold text-center">{error}</p>}

      {/* Legenda */}
      <div className="p-4 bg-slate-50 rounded-lg border border-slate-100 space-y-2">
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Regras de Horário (Modo Normal)</p>
        <div className="text-xs text-slate-600 space-y-1">
          <p><strong>Seg-Sex:</strong> 07:00 às 19:00</p>
          <p><strong>Sábado:</strong> 07:00 às 14:00</p>
          <p><strong>Domingo:</strong> Bloqueado</p>
        </div>
      </div>
    </div>
  );
}
