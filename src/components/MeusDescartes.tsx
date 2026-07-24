import React, { useState } from 'react';
import { FileText, Calendar, Clock, Truck, ArrowLeft, BarChart3 } from 'lucide-react';
import { Lancamento } from '../types';

interface MeusDescartesProps {
  motorista: string;
  motoristas?: string[];
  lancamentos: Lancamento[];
  onBack: () => void;
}

export default function MeusDescartes({ motorista, motoristas = [], lancamentos, onBack }: MeusDescartesProps) {
  const [periodo, setPeriodo] = useState<'mes' | 'semana' | 'todos'>('mes');
  const [filtroMotorista, setFiltroMotorista] = useState(motorista || 'TODOS');

  const showPicker = motoristas.length > 1;

  const myLancamentos = lancamentos
    .filter(l => !showPicker || filtroMotorista === 'TODOS' ? true : l.driverName === filtroMotorista)
    .filter(l => {
      if (periodo === 'todos') return true;
      const d = new Date(l.createdAt || l.data);
      const now = new Date();
      if (periodo === 'semana') {
        const semanaAtras = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        return d >= semanaAtras;
      }
      if (periodo === 'mes') {
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      }
      return true;
    })
    .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));

  const totalValor = myLancamentos.reduce((s, l) => s + l.valor, 0);
  const totalQtd = myLancamentos.reduce((s, l) => s + l.quantidadeCacambas, 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-indigo-950 p-3">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4 pt-3">
          <button
            onClick={onBack}
            className="p-2 rounded-xl bg-white/10 text-white hover:bg-white/20 transition-all cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-black text-white">Meus Descartes</h1>
            <p className="text-xs text-slate-400">{showPicker ? 'Todos os motoristas' : filtroMotorista}</p>
          </div>
          <BarChart3 className="w-6 h-6 text-emerald-400" />
        </div>

        {/* Seletor de motorista (só quando JUNIOR vê todos) */}
        {showPicker && (
          <div className="flex gap-2 mb-3 overflow-x-auto pb-1">
            {['TODOS', ...motoristas].map(nome => (
              <button
                key={nome}
                onClick={() => setFiltroMotorista(nome)}
                className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  filtroMotorista === nome
                    ? 'bg-emerald-600 text-white'
                    : 'bg-white/10 text-slate-300 hover:bg-white/20'
                }`}
              >
                {nome === 'TODOS' ? 'Todos' : nome}
              </button>
            ))}
          </div>
        )}

        {/* Filtro período */}
        <div className="flex gap-2 mb-4">
          {([
            { key: 'mes' as const, label: 'Mês' },
            { key: 'semana' as const, label: 'Semana' },
            { key: 'todos' as const, label: 'Tudo' },
          ]).map(p => (
            <button
              key={p.key}
              onClick={() => setPeriodo(p.key)}
              className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                periodo === p.key
                  ? 'bg-emerald-600 text-white'
                  : 'bg-white/10 text-slate-300 hover:bg-white/20'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Resumo */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="bg-white/5 rounded-xl p-3 text-center">
            <p className="text-[9px] text-blue-400 font-bold uppercase tracking-wider">Registros</p>
            <p className="text-xl font-black text-blue-300">{myLancamentos.length}</p>
          </div>
          <div className="bg-white/5 rounded-xl p-3 text-center">
            <p className="text-[9px] text-emerald-400 font-bold uppercase tracking-wider">Caçambas</p>
            <p className="text-xl font-black text-emerald-300">{totalQtd}</p>
          </div>
          <div className="bg-white/5 rounded-xl p-3 text-center">
            <p className="text-[9px] text-amber-400 font-bold uppercase tracking-wider">Valor</p>
            <p className="text-lg font-black text-amber-300">R$ {totalValor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
          </div>
        </div>

        {/* Lista */}
        {myLancamentos.length === 0 ? (
          <div className="bg-white/5 rounded-2xl p-8 text-center">
            <FileText className="w-10 h-10 text-slate-600 mx-auto mb-3" />
            <p className="text-sm font-bold text-slate-400">Nenhum descarte registrado</p>
            <p className="text-xs text-slate-500 mt-1">neste período</p>
          </div>
        ) : (
          <div className="space-y-2">
            {myLancamentos.map(lan => {
              const dataFmt = lan.data ? (() => {
                const [y, m, d] = lan.data.split('-');
                return `${d}/${m}/${y}`;
              })() : '—';
              const horaFmt = lan.createdAt ? (() => {
                try {
                  return new Date(lan.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                } catch { return '—'; }
              })() : '—';
              return (
                <div key={lan.id} className="bg-white/5 border border-white/10 rounded-xl p-3 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-600/20 flex items-center justify-center shrink-0">
                    <span className="text-emerald-400 font-black text-sm">{lan.quantidadeCacambas}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white text-xs truncate">{lan.botaForaNome || '—'}</span>
                      {lan.numero != null && (
                        <span className="text-[9px] font-mono bg-white/10 text-slate-300 px-1.5 py-0.5 rounded">#{lan.numero}</span>
                      )}
                    </div>
                    {showPicker && filtroMotorista === 'TODOS' && lan.driverName && (
                      <span className="text-[10px] text-emerald-400 font-bold">{lan.driverName}</span>
                    )}
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] text-slate-400 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />{dataFmt}
                      </span>
                      <span className="text-[10px] text-slate-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" />{horaFmt}
                      </span>
                      {lan.vehicleId && (
                        <span className="text-[10px] text-slate-400 flex items-center gap-1">
                          <Truck className="w-3 h-3" />{lan.vehicleId}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-black text-white">R$ {lan.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                    <p className="text-[9px] text-slate-400 font-medium">
                      {lan.source === 'mobile' ? 'Celular' : 'Web'}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
