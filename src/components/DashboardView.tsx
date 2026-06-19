/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { 
  Boxes, 
  Truck, 
  Sparkles, 
  DollarSign, 
  CheckCircle2, 
  Clock, 
  Activity, 
  TrendingUp, 
  Leaf, 
  ArrowRight,
  Trash2,
  Fuel,
  Calendar
} from 'lucide-react';
import { Vehicle, Dispatch, Invoice, FuelLog, Lancamento } from '../types';

interface DashboardViewProps {
  vehicles: Vehicle[];
  dispatches: Dispatch[];
  invoices: Invoice[];
  fuelLogs: FuelLog[];
  lancamentos: Lancamento[];
  setCurrentTab: (tab: string) => void;
  onOpenNewDispatch: () => void;
}

const translateDispatchStatus = (status: string) => {
  switch (status) {
    case 'Assigned': return 'Atribuído';
    case 'In Transit': return 'Em Trânsito';
    case 'Completed': return 'Concluído';
    default: return status;
  }
};

export default function DashboardView({
  vehicles,
  dispatches,
  invoices,
  fuelLogs,
  lancamentos,
  setCurrentTab,
  onOpenNewDispatch
}: DashboardViewProps) {
  const [selectedMonth, setSelectedMonth] = useState<string>('2026-06');

  // Extract all unique months present in data
  const monthOptions = useMemo(() => {
    const monthsSet = new Set<string>();
    lancamentos.forEach(l => {
      if (l.data && l.data.length >= 7) {
        monthsSet.add(l.data.substring(0, 7));
      }
    });
    fuelLogs.forEach(f => {
      if (f.data && f.data.length >= 7) {
        monthsSet.add(f.data.substring(0, 7));
      }
    });

    // Default to '2026-06' if set is empty
    if (monthsSet.size === 0) {
      monthsSet.add('2026-06');
    }

    // Sort descending
    return Array.from(monthsSet).sort((a, b) => b.localeCompare(a));
  }, [lancamentos, fuelLogs]);

  const formatMonthLabel = (m: string) => {
    if (m === 'ALL') return 'Todos os Meses (Geral)';
    const parts = m.split('-');
    if (parts.length === 2) {
      const year = parts[0];
      const monthIdx = parseInt(parts[1]) - 1;
      const monthNames = [
        'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
      ];
      if (monthIdx >= 0 && monthIdx < 12) {
        return `${monthNames[monthIdx]} de ${year}`;
      }
    }
    return m;
  };

  // Filter data by selected month
  const filteredLancamentosForKPI = useMemo(() => {
    if (selectedMonth === 'ALL') return lancamentos;
    return lancamentos.filter(l => l.data && l.data.startsWith(selectedMonth));
  }, [lancamentos, selectedMonth]);

  const filteredFuelLogsForKPI = useMemo(() => {
    if (selectedMonth === 'ALL') return fuelLogs;
    return fuelLogs.filter(f => f.data && f.data.startsWith(selectedMonth));
  }, [fuelLogs, selectedMonth]);

  // Computed variables for operations dashboard
  const activeTravelers = useMemo(() => vehicles.filter(v => v.status === 'In Transit'), [vehicles]);
  const activeTransitCount = activeTravelers.length;

  const totalCapacityTonsMoved = useMemo(() => {
    return dispatches.reduce((acc, curr) => acc + (Number(curr.weight) || 0), 0);
  }, [dispatches]);

  const co2SavingsTons = useMemo(() => {
    return parseFloat(((totalCapacityTonsMoved ?? 0) * 1.4).toFixed(1));
  }, [totalCapacityTonsMoved]);

  // Specific Minimalist KPIs requested by the user:
  // 1. Quantidade de caçambas
  const totalCacambas = useMemo(() => {
    return filteredLancamentosForKPI.reduce((acc, curr) => acc + (Number(curr.quantidadeCacambas) || 0), 0);
  }, [filteredLancamentosForKPI]);

  // 2. Valor gasto com bota fora
  const totalBotaForaGasto = useMemo(() => {
    return filteredLancamentosForKPI.reduce((acc, curr) => acc + (Number(curr.valor) || 0), 0);
  }, [filteredLancamentosForKPI]);

  // 3. Valor gasto com combustível
  const totalFuelGasto = useMemo(() => {
    return filteredFuelLogsForKPI.reduce((acc, curr) => acc + (Number(curr.valorPago) || 0), 0);
  }, [filteredFuelLogsForKPI]);

  // 4. Média do valor de combustível gasto por caçamba (Valor total gasto com combustível / Quantidade de Caçambas)
  const fuelPerCacamba = useMemo(() => {
    const divider = Number(totalCacambas) || 0;
    if (divider === 0) return 0;
    return (Number(totalFuelGasto) || 0) / divider;
  }, [totalFuelGasto, totalCacambas]);

  // Alternativa literal: "O VALOR TOTAL DAQUELE MES DIVIDIDO PELO VALOR TOTAL BRUTO DE COMBUSTIVEL EM REAIS"
  const relacaoTotalMesCombustivel = useMemo(() => {
    const divider = Number(totalFuelGasto) || 0;
    if (divider === 0) return 0;
    return (Number(totalBotaForaGasto) || 0) / divider;
  }, [totalBotaForaGasto, totalFuelGasto]);

  return (
    <div className="space-y-6">
      
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white rounded-2xl p-6 shadow-md relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none"></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-xl font-bold font-sans">Painel de Operações Relâmpago Caçambas</h3>
            <p className="text-xs text-slate-300 mt-1 leading-relaxed max-w-xl">
              Olá, Alex. Os sistemas de agendamento de frota estão saudáveis. Temos <strong>{activeTransitCount} veículos</strong> em trânsito, 
              garantindo acompanhamento operacional contínuo e sustentável.
            </p>
          </div>
          <button 
            onClick={onOpenNewDispatch}
            className="bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer self-start md:self-auto shadow-md animate-pulse"
          >
            <Truck className="w-4 h-4 stroke-[2.5]" />
            <span>Novo Despacho</span>
          </button>
        </div>
      </div>

      {/* Month Selector Filter Row */}
      <div className="bg-slate-50 border border-slate-200/60 p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-purple-600 animate-pulse" />
          <span className="text-xs font-black text-slate-700 uppercase tracking-wider font-sans">
            Filtro Operacional Mensal
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold text-slate-500">Selecione o Mês:</span>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="bg-white border border-slate-250 py-1.5 px-3 rounded-lg text-xs font-extrabold text-slate-800 shadow-xs focus:outline-hidden focus:border-purple-500 font-sans cursor-pointer"
          >
            <option value="ALL">Todos os Meses (Geral)</option>
            {monthOptions.map((mo) => (
              <option key={mo} value={mo}>
                {formatMonthLabel(mo)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Analytics Cards Grid */}
      <section className="grid grid-cols-1 md:grid-cols-4 gap-5">
        
        {/* KPI 1: Quantidade de caçambas */}
        <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-sm relative overflow-hidden group hover:border-slate-300 transition-colors">
          <div className="flex justify-between items-center text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Quantidade de Caçambas</span>
            <Boxes className="w-4 h-4 text-purple-600" />
          </div>
          <p className="text-2xl font-black font-sans text-slate-900 mt-2">{totalCacambas}</p>
          <span className="text-[10px] text-slate-400 font-medium">Caçambas descartadas no sistema</span>
        </div>

        {/* KPI 2: Valor gasto com bota fora */}
        <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-sm relative overflow-hidden group hover:border-emerald-250 transition-colors">
          <div className="flex justify-between items-center text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider font-sans">Valor com Bota Fora</span>
            <Trash2 className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-black font-sans text-slate-900 mt-2">
            R$ {totalBotaForaGasto.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <span className="text-[10px] text-slate-400 font-medium">Custo total gasto com bota fora</span>
        </div>

        {/* KPI 3: Valor gasto com combustível */}
        <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-sm relative overflow-hidden group hover:border-slate-300 transition-colors">
          <div className="flex justify-between items-center text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Valor Gasto Combustível</span>
            <Fuel className="w-4 h-4 text-purple-700" />
          </div>
          <p className="text-2xl font-black font-sans text-slate-900 mt-2">
            R$ {totalFuelGasto.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <span className="text-[10px] text-slate-400 font-medium font-sans">Soma bruta paga em abastecimentos</span>
        </div>

        {/* KPI 4: Média do valor de combustível gasto por caçamba */}
        <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-sm relative overflow-hidden group hover:border-fuchsia-250 transition-colors">
          <div className="flex justify-between items-center text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Custo Combustível / Caçamba</span>
            <TrendingUp className="w-4 h-4 text-fuchsia-600" />
          </div>
          <p className="text-2xl font-black font-sans text-purple-750 mt-2">
            R$ {fuelPerCacamba.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <div className="mt-1 flex items-center justify-between text-[10px] text-slate-400 font-bold">
            <span>Razão Total Mês / Combustível:</span>
            <span className="text-fuchsia-600 font-black font-mono">{(relacaoTotalMesCombustivel ?? 0).toFixed(2)}x</span>
          </div>
        </div>

      </section>

      {/* Two Columns Section: Live Transit Dispatch Log and Quick Links */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        
        {/* Active Dispatches Feed */}
        <section className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
            <div>
              <h4 className="font-sans font-bold text-sm text-slate-900">Despachos Ativos em Tempo Real</h4>
              <p className="text-slate-400 text-xs mt-0.5">Acompanhamento e status de rotas de carga e coletas ao vivo</p>
            </div>
            <button 
              onClick={() => setCurrentTab('operations')}
              className="text-xs text-emerald-600 hover:text-emerald-700 font-bold flex items-center gap-1 cursor-pointer"
            >
              <span>Ver Todos</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3.5">
            {dispatches.map((disp) => {
              const inTransit = disp.status === 'In Transit';
              
              return (
                <div key={disp.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 bg-slate-50 border border-slate-100 rounded-lg group hover:border-slate-200 transition-colors">
                  <div className="flex gap-3">
                    <div className="w-9 h-9 rounded bg-slate-200 text-slate-800 flex items-center justify-center font-mono font-bold text-xs shrink-0 shadow-sm border border-slate-200">
                      {disp.vehicleId.split('-')[1] || disp.vehicleId}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-xs text-slate-800 font-sans">{disp.clientName}</span>
                        <div className="w-1 h-1 rounded-full bg-slate-400"></div>
                        <span className="text-[10px] text-slate-400 font-mono">{disp.id}</span>
                      </div>
                      <p className="text-[11px] text-slate-500 font-medium mt-0.5 font-sans">
                        Retirada de {disp.origin} → Descarte em {disp.destination}
                      </p>
                      <span className="text-[10px] text-slate-400 font-bold font-mono">Carga: {disp.payloadType} ({disp.weight} Toneladas)</span>
                    </div>
                  </div>

                  <div className="mt-3 sm:mt-0 flex items-center gap-3">
                    <div className="text-right hidden sm:block">
                      <span className="text-[9px] font-bold text-slate-400 uppercase">Motorista</span>
                      <p className="text-xs font-semibold text-slate-800 mt-0.5">{disp.driverName}</p>
                    </div>
                    <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border ${
                      inTransit ? 'bg-emerald-50 text-emerald-700 border-emerald-100 animate-pulse' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {translateDispatchStatus(disp.status)}
                    </span>
                  </div>
                </div>
              );
            })}

            {dispatches.length === 0 && (
              <div className="text-center py-10 text-xs text-slate-400 font-sans">
                Nenhum despacho ativo no momento. Use "Novo Despacho" para autorizar uma rota.
              </div>
            )}
          </div>
        </section>

        {/* Quick Utilities Menu */}
        <section className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col justify-between">
          <div>
            <h4 className="font-sans font-bold text-sm text-slate-900 pb-3 border-b border-slate-100 mb-4 leading-none">Atalhos Rápidos</h4>
            <div className="space-y-2.5">
              
              <button 
                onClick={() => setCurrentTab('fleet')}
                className="w-full flex items-center justify-between p-3 border border-slate-105 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold scroll-smooth cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-6 h-6 rounded bg-indigo-50 text-indigo-700 flex items-center justify-center">
                    <Truck className="w-3.5 h-3.5" />
                  </div>
                  <span>Métricas de Frota Ativa</span>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
              </button>

              <button 
                onClick={() => setCurrentTab('finance')}
                className="w-full flex items-center justify-between p-3 border border-slate-105 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-6 h-6 rounded bg-emerald-50 text-emerald-700 flex items-center justify-center">
                    <DollarSign className="w-3.5 h-3.5" />
                  </div>
                  <span>Contabilidade e Livro Caixa</span>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
              </button>

              <button 
                onClick={() => setCurrentTab('disposal')}
                className="w-full flex items-center justify-between p-3 border border-slate-105 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-6 h-6 rounded bg-rose-50 text-rose-700 flex items-center justify-center">
                    <Boxes className="w-3.5 h-3.5" />
                  </div>
                  <span>Cadastro de Bota Foras</span>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
              </button>

            </div>
          </div>

          <div className="bg-slate-50 border border-slate-100 rounded-xl p-3.5 text-xs text-slate-500 mt-6 leading-relaxed flex items-start gap-2.5">
            <Sparkles className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
            <div>
              <strong className="text-slate-800 block mb-0.5">Dica Ecológica:</strong>
              O sistema inteligente Relâmpago otimiza e sugere rotas eficientes reduzindo gastos com combustível em até 8% na média. Veja na seção "Frota".
            </div>
          </div>
        </section>

      </div>

    </div>
  );
}
