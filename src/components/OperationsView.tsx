/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { 
  Archive, 
  Trash2, 
  Calendar, 
  DollarSign, 
  User, 
  Truck, 
  Search, 
  PlusSquare, 
  Clock,
  Sparkles,
  Layers,
  RotateCcw,
  Building,
  Award,
  ChevronRight,
  TrendingUp,
  MapPin,
  FileText
} from 'lucide-react';
import { Lancamento } from '../types';

interface OperationsViewProps {
  lancamentos: Lancamento[];
  onDeleteLancamento: (id: string) => void;
  searchTerm: string;
  onOpenNewDispatch: () => void; // mapped to launching the New Lançamento Modal!
}

export default function OperationsView({
  lancamentos,
  onDeleteLancamento,
  searchTerm,
  onOpenNewDispatch
}: OperationsViewProps) {
  const [botaForaFilter, setBotaForaFilter] = useState('ALL');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');

  // Handle resetting of filters
  const handleResetFilters = () => {
    setBotaForaFilter('ALL');
    setFilterStartDate('');
    setFilterEndDate('');
  };

  // Filter lancamentos based on search input, dropdown bota fora name, and period start/end dates
  const filteredLancamentos = useMemo(() => {
    let result = lancamentos;

    if (botaForaFilter !== 'ALL') {
      result = result.filter(lan => lan.botaForaNome === botaForaFilter);
    }

    if (filterStartDate) {
      result = result.filter(lan => lan.data >= filterStartDate);
    }

    if (filterEndDate) {
      result = result.filter(lan => lan.data <= filterEndDate);
    }

    if (searchTerm.trim()) {
      const query = searchTerm.toLowerCase();
      result = result.filter(lan => 
        lan.id.toLowerCase().includes(query) ||
        lan.botaForaNome.toLowerCase().includes(query) ||
        (lan.driverName && lan.driverName.toLowerCase().includes(query)) ||
        (lan.vehicleId && lan.vehicleId.toLowerCase().includes(query))
      );
    }

    return result;
  }, [lancamentos, botaForaFilter, filterStartDate, filterEndDate, searchTerm]);

  // Compute stats on the fly based on FILTERED results for dynamic interaction
  const metrics = useMemo(() => {
    let totalCacambas = 0;
    let totalValor = 0;
    
    filteredLancamentos.forEach(lan => {
      totalCacambas += lan.quantidadeCacambas;
      totalValor += lan.valor;
    });

    return {
      totalCacambas,
      totalValor,
      totalLancamentos: filteredLancamentos.length
    };
  }, [filteredLancamentos]);

  // Unique Bota Foras for inline filter dropdown
  const uniqueBotaForaNames = useMemo(() => {
    const names = new Set<string>();
    lancamentos.forEach(lan => {
      if (lan.botaForaNome) {
        names.add(lan.botaForaNome);
      }
    });
    return Array.from(names);
  }, [lancamentos]);

  // Aggregate operations statistics for Bota Fora (Dumping Areas) ranking, affected by start/end date filters
  const aggregatedBotaForas = useMemo(() => {
    const groups: { [key: string]: { botaFora: string; quantidade: number; valor: number; lancamentosCount: number } } = {};
    
    let target = lancamentos;
    if (filterStartDate) {
      target = target.filter(l => l.data >= filterStartDate);
    }
    if (filterEndDate) {
      target = target.filter(l => l.data <= filterEndDate);
    }

    target.forEach(l => {
      const key = l.botaForaNome || 'Não Especificado';
      if (!groups[key]) {
        groups[key] = {
          botaFora: key,
          quantidade: 0,
          valor: 0,
          lancamentosCount: 0
        };
      }
      groups[key].quantidade += l.quantidadeCacambas;
      groups[key].valor += l.valor;
      groups[key].lancamentosCount += 1;
    });

    return Object.values(groups).sort((a, b) => b.quantidade - a.quantidade);
  }, [lancamentos, filterStartDate, filterEndDate]);

  // Non-editable dynamic date range indicator string
  const dateInterval = useMemo(() => {
    const formatDateStr = (dateStr: string) => {
      try {
        const parts = dateStr.split('-');
        if (parts.length === 3) {
          return `${parts[2]}/${parts[1]}/${parts[0]}`;
        }
        return dateStr;
      } catch {
        return dateStr;
      }
    };

    if (filterStartDate || filterEndDate) {
      const start = filterStartDate ? formatDateStr(filterStartDate) : 'Mín';
      const end = filterEndDate ? formatDateStr(filterEndDate) : 'Máx';
      return `${start} até ${end}`;
    }

    if (!lancamentos || lancamentos.length === 0) {
      return 'Sem lançamentos catalogados';
    }

    const dates = lancamentos.map(l => l.data).filter(Boolean);
    if (dates.length === 0) return 'Sem lançamentos catalogados';
    dates.sort();

    const minDate = formatDateStr(dates[0]);
    const maxDate = formatDateStr(dates[dates.length - 1]);

    if (minDate === maxDate) {
      return minDate;
    }
    return `${minDate} — ${maxDate}`;
  }, [lancamentos, filterStartDate, filterEndDate]);

  // Format currencies and date
  const formatCurrency = (val: number) => {
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Intro Banner */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-2xl pointer-events-none group-hover:bg-indigo-500/10 transition-colors"></div>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-50 rounded-lg flex items-center justify-center text-indigo-600 shadow-sm shadow-indigo-500/10">
            <Archive className="w-5 h-5 text-indigo-650" />
          </div>
          <div>
            <h2 className="font-sans font-bold text-lg text-slate-900 leading-tight">Painel Executivo de Operações de Descarte</h2>
            <p className="text-slate-400 text-xs mt-0.5">Visão unificada das descargas autorizadas, volume de caçambas, fluxos de despesa e relatórios analíticos de bota fora.</p>
          </div>
        </div>
      </div>

      {/* Control Panel: Filters, Date Pickers, and Reset Actions */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <span className="p-1 px-2.5 rounded-lg text-[9px] font-black bg-indigo-50 text-indigo-700 tracking-wider">FILTROS E PERÍODO</span>
            <span className="text-[10px] font-medium text-slate-400">Refine a exibição das operações e o Ranking de Bota Foras por período</span>
          </div>
          {(botaForaFilter !== 'ALL' || filterStartDate || filterEndDate) && (
            <button
              onClick={handleResetFilters}
              className="flex items-center gap-1.5 px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg border border-slate-200 transition-all cursor-pointer self-start md:self-auto"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Limpar Filtros</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {/* 1. Bota Fora Select */}
          <div className="space-y-1">
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider select-none">Bota Fora</label>
            <select
              value={botaForaFilter}
              onChange={(e) => setBotaForaFilter(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl text-xs font-sans text-slate-700 font-bold focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="ALL">Visualizar Todos</option>
              {uniqueBotaForaNames.map(name => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </div>

          {/* 2. Start Date */}
          <div className="space-y-1">
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider select-none">Data Inicial</label>
            <input
              type="date"
              value={filterStartDate}
              onChange={(e) => setFilterStartDate(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl text-xs font-sans text-slate-700 font-bold focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-600 focus:text-slate-900"
            />
          </div>

          {/* 3. End Date */}
          <div className="space-y-1">
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider select-none">Data Final</label>
            <input
              type="date"
              value={filterEndDate}
              onChange={(e) => setFilterEndDate(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl text-xs font-sans text-slate-700 font-bold focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-600 focus:text-slate-900"
            />
          </div>

          {/* 4. Action Button: Novo Lançamento aligned with forms fields */}
          <div className="flex items-end">
            <button 
              type="button"
              onClick={onOpenNewDispatch}
              className="w-full bg-indigo-650 hover:bg-indigo-600 active:bg-indigo-750 text-white font-extrabold text-xs uppercase tracking-wider py-3 rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow-md transition-all active:scale-98"
            >
              <PlusSquare className="w-4 h-4 text-emerald-400" />
              <span>Novo Lançamento</span>
            </button>
          </div>
        </div>
      </div>

      {/* Metrics Banner */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Stat 1 */}
        <div className="bg-slate-900 text-slate-100 p-5 rounded-xl border border-slate-800 shadow-lg relative overflow-hidden flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">VOLUME TOTAL FILTRADO</span>
            <div className="p-1.5 bg-emerald-500/20 rounded-lg text-emerald-450">
              <Archive className="w-4 h-4 text-emerald-400" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold font-sans text-white">{metrics.totalCacambas}</span>
            <span className="text-xs text-slate-400 font-semibold uppercase">caçambas descartadas</span>
          </div>
        </div>

        {/* Stat 2 */}
        <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest font-sans">VALOR GLOBAL DOS DESCARTES</span>
            <div className="p-1.5 bg-emerald-50 rounded-lg text-emerald-600">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold font-sans text-emerald-700">{formatCurrency(metrics.totalValor)}</span>
            <span className="text-xs text-slate-400 font-semibold uppercase">montante bruto</span>
          </div>
        </div>

        {/* Stat 3 */}
        <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest font-sans">LANÇAMENTOS EXTRATADOS</span>
            <div className="p-1.5 bg-indigo-50 rounded-lg text-indigo-600">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold font-sans text-slate-950">{metrics.totalLancamentos}</span>
            <span className="text-xs text-slate-400 font-semibold uppercase font-sans">entradas auditadas</span>
          </div>
        </div>
      </section>

      {/* Ranking de Áreas de Destinação (Bota Foras) */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden space-y-6 p-6">
        
        {/* Title + Date Interval Banner */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 shrink-0 shadow-3xs">
              <Building className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-sans font-black text-base text-slate-900 tracking-tight">Ranking de Movimentação por Bota Fora</h3>
              <p className="text-slate-400 text-xs mt-0.5 font-medium">Classificação consolidada das áreas licenciadas de destinação de resíduos, ordenada pelo volume total de caçambas.</p>
            </div>
          </div>

          {/* Date range element - Unalterable */}
          <div className="flex items-center gap-3 bg-slate-50 border border-slate-200/80 px-4 py-2.5 rounded-xl self-start lg:self-center">
            <Calendar className="w-4 h-4 text-indigo-500 shrink-0" />
            <div>
              <span className="block text-[9px] font-black tracking-widest text-slate-400 uppercase select-none">Intervalo Analisado (Fixo)</span>
              <span className="text-xs font-extrabold text-slate-800 font-sans tracking-tight">
                {dateInterval}
              </span>
            </div>
          </div>
        </div>

        {aggregatedBotaForas.length === 0 ? (
          <div className="p-16 text-center space-y-3 bg-slate-50/20 rounded-2xl border border-dashed border-slate-250">
            <Archive className="w-10 h-10 text-slate-300 mx-auto animate-pulse" />
            <h4 className="text-xs font-black text-slate-600 uppercase tracking-wider">Ausência de descarga registrada</h4>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">Nenhuma operação de descarte pôde ser encontrada sob os parâmetros aplicados.</p>
          </div>
        ) : (
          <div className="space-y-4">
            
            {/* Quick Metrics Header */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-indigo-50/30 border border-indigo-100 rounded-xl p-3.5">
              <div className="px-3 py-1 bg-white border border-slate-200/40 rounded-lg shadow-3xs">
                <span className="block text-[9px] font-extrabold text-slate-400 uppercase">Áreas Ativadas</span>
                <span className="text-lg font-black text-indigo-950 font-mono">
                  {aggregatedBotaForas.length} postos
                </span>
              </div>
              <div className="px-3 py-1 bg-white border border-slate-200/40 rounded-lg shadow-3xs">
                <span className="block text-[9px] font-extrabold text-slate-400 uppercase">Volume Descarregado</span>
                <span className="text-lg font-black text-indigo-955 font-mono text-indigo-650">
                  {aggregatedBotaForas.reduce((acc, curr) => acc + curr.quantidade, 0)} Caçambas
                </span>
              </div>
              <div className="col-span-2 sm:col-span-1 px-3 py-1 bg-white border border-slate-200/40 rounded-lg shadow-3xs">
                <span className="block text-[9px] font-extrabold text-slate-400 uppercase">Tarifário Acumulado</span>
                <span className="text-lg font-black text-emerald-800 font-mono">
                  R$ {aggregatedBotaForas.reduce((acc, curr) => acc + curr.valor, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            {/* List Format View - Bota Fora Rank */}
            <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-3xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-black text-slate-500 uppercase tracking-wider select-none">
                      <th className="px-5 py-3 text-center w-16">Posição</th>
                      <th className="px-5 py-3">Área de Destinação (Bota Fora)</th>
                      <th className="px-5 py-3 text-center">Frequência</th>
                      <th className="px-5 py-3 min-w-[200px]">Proporção Compartilhada</th>
                      <th className="px-5 py-3 text-right">Tarifa Acumulada</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {aggregatedBotaForas.map((item, index) => {
                      const maxQtd = Math.max(...aggregatedBotaForas.map(g => g.quantidade), 1);
                      const percentage = Math.round((item.quantidade / maxQtd) * 100);
                      
                      // Custom rank badges style
                      let rankBadge = "bg-slate-100 text-slate-600";
                      if (index === 0) rankBadge = "bg-amber-100 text-amber-800 border border-amber-200 font-black";
                      else if (index === 1) rankBadge = "bg-slate-200 text-slate-800 border border-slate-300 font-black";
                      else if (index === 2) rankBadge = "bg-orange-100 text-orange-850 border border-orange-200 font-black";

                      return (
                        <tr key={`${item.botaFora}-${index}`} className="hover:bg-slate-50/65 transition-all">
                          {/* Rank indicator */}
                          <td className="px-5 py-3.5 text-center whitespace-nowrap">
                            <span className={`inline-flex items-center justify-center w-6 h-6 rounded-lg text-xs font-bold ${rankBadge}`}>
                              #{index + 1}
                            </span>
                          </td>
                          
                          {/* Bota Fora Name */}
                          <td className="px-5 py-3.5 whitespace-nowrap">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-650 flex items-center justify-center shrink-0">
                                <Building className="w-4 h-4 text-indigo-600" />
                              </div>
                              <div>
                                <span className="block text-xs font-extrabold text-slate-900">{item.botaFora}</span>
                                <span className="block text-[9px] text-emerald-600 font-bold uppercase tracking-wider flex items-center gap-1">
                                  <span className="w-1 h-1 rounded-full bg-emerald-500 animate-ping shrink-0"></span>
                                  Licenciado e Ativo
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* Operations Freq */}
                          <td className="px-5 py-3.5 text-center whitespace-nowrap">
                            <span className="inline-flex items-center gap-1 text-slate-700 text-xs font-bold font-sans">
                              {item.lancamentosCount} {item.lancamentosCount === 1 ? 'lançamento' : 'lançamentos'}
                            </span>
                          </td>

                          {/* Volume & Custom Visual Progress Bar */}
                          <td className="px-5 py-3.5">
                            <div className="space-y-1">
                              <div className="flex items-center justify-between text-[11px] font-extrabold">
                                <span className="text-slate-800 font-mono font-black">{item.quantidade} Caçambas</span>
                                <span className="text-slate-400 text-[10px]">{percentage}%</span>
                              </div>
                              <div className="w-full bg-slate-100 hover:bg-slate-200 rounded-full h-2.5 overflow-hidden border border-slate-200/45 relative">
                                <div 
                                  className="bg-indigo-650 h-full rounded-full transition-all duration-500" 
                                  style={{ width: `${percentage}%` }}
                                ></div>
                              </div>
                            </div>
                          </td>

                          {/* Cumulative tariffs */}
                          <td className="px-5 py-3.5 text-right whitespace-nowrap">
                            <span className="inline-block px-3 py-1 bg-emerald-50 text-emerald-800 font-mono font-black text-xs rounded-lg border border-emerald-100">
                              R$ {item.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}
      </div>

      {/* Individual Operations Feed Header */}
      <div className="flex items-center justify-between pt-4 border-b border-slate-200 pb-2">
        <div>
          <h3 className="font-sans font-bold text-sm text-slate-900">Extratos Individuais de Lançamentos</h3>
          <p className="text-slate-400 text-[10px]">Histórico detalhado de depósitos por caçamba e faturas emitidas</p>
        </div>
        <span className="text-[9px] font-bold text-slate-500 bg-slate-150 text-slate-700 px-2.5 py-1 rounded-md">
          {filteredLancamentos.length} {filteredLancamentos.length === 1 ? 'Lançamento Filtrado' : 'Lançamentos Filtrados'}
        </span>
      </div>

      {/* Beautiful Dumpster Disposals Feed */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {filteredLancamentos.map((lan) => {
          // average cost calculation per bucket
          const avgUnitCost = lan.quantidadeCacambas > 0 ? lan.valor / lan.quantidadeCacambas : 0;
          
          return (
            <div 
              key={lan.id} 
              className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm hover:shadow-md hover:border-slate-300 transition-all duration-150 flex flex-col justify-between border-t-4 border-t-emerald-500"
            >
              <div className="space-y-4">
                
                {/* Upper line: Bota fora name and ID */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    {/* Visual dumpster bucket box */}
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex flex-col items-center justify-center font-bold shadow-inner">
                      <Archive className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span className="text-[10px] leading-tight font-extrabold">{lan.quantidadeCacambas}</span>
                    </div>
                    <div>
                      <h4 className="font-sans font-bold text-sm text-slate-900 leading-tight">{lan.botaForaNome}</h4>
                      <code className="text-[9px] text-slate-400 font-mono font-semibold uppercase">{lan.id}</code>
                    </div>
                  </div>

                  {/* Date Badge */}
                  <div className="flex flex-col items-end">
                    <span className="px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600 border border-slate-200 flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-slate-400 shrink-0" />
                      <span>{formatDate(lan.data)}</span>
                    </span>
                  </div>
                </div>

                {/* Logistics links lines */}
                <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 pt-3 border-t border-slate-100">
                  <div className="space-y-0.5">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Volume Descontado</span>
                    <strong className="text-slate-800 text-sm font-sans flex items-center gap-1.5">
                      {lan.quantidadeCacambas} Caçambas
                    </strong>
                  </div>

                  <div className="space-y-0.5 text-right">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Valor Total</span>
                    <strong className="text-emerald-700 text-sm font-bold font-mono">
                      {formatCurrency(lan.valor)}
                    </strong>
                  </div>
                </div>

                {/* Observação do motorista */}
                {lan.observacao && (
                  <div className="text-[11px] text-blue-700 bg-blue-50 border border-blue-100 p-2.5 rounded-lg flex items-start gap-2">
                    <FileText className="w-3.5 h-3.5 text-blue-500 shrink-0 mt-0.5" />
                    <span className="font-medium">{lan.observacao}</span>
                  </div>
                )}

                {/* Subtext info */}
                <div className="flex items-center justify-between text-[11px] text-slate-400 font-sans bg-slate-50 p-2 rounded-lg">
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Média por caçamba: <strong>{formatCurrency(avgUnitCost)}</strong></span>
                  </div>
                  {lan.vehicleId && (
                    <div className="flex items-center gap-1 text-slate-600">
                      <Truck className="w-3 h-3 text-slate-400" />
                      <span>{lan.vehicleId}</span>
                    </div>
                  )}
                </div>

              </div>

              {/* Lower Section: Motorista and Actions */}
              <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between">
                
                {lan.driverName ? (
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-slate-100 rounded-full flex items-center justify-center text-slate-600">
                      <User className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <span className="text-[8px] font-bold text-slate-400 uppercase block leading-none">Motorista</span>
                      <span className="text-xs font-semibold text-slate-700">{lan.driverName}</span>
                    </div>
                  </div>
                ) : (
                  <div className="text-[10px] italic text-slate-400 font-medium">Lançamento direto de balança</div>
                )}

                {/* Delete trigger */}
                <button
                  type="button"
                  onClick={() => onDeleteLancamento(lan.id)}
                  className="text-slate-400 hover:text-rose-600 hover:bg-rose-50 p-1.5 rounded-lg border border-transparent hover:border-rose-100 transition-colors cursor-pointer flex items-center gap-1 bg-transparent"
                  title="Excluir Lançamento"
                >
                  <Trash2 className="w-4 h-4 text-slate-450 hover:text-rose-605" />
                  <span className="text-[10px] font-bold uppercase tracking-wider hidden sm:inline">Excluir</span>
                </button>

              </div>

            </div>
          );
        })}

        {filteredLancamentos.length === 0 && (
          <div className="col-span-2 text-center py-16 bg-white border border-slate-200 rounded-2xl text-slate-400 font-sans text-xs flex flex-col items-center gap-2 shadow-xs">
            <Archive className="w-8 h-8 text-slate-350" />
            <span>Nenhum lançamento de descarte localizado para estes filtros de pesquisa. Realize uma nova entrada.</span>
          </div>
        )}
      </section>

      {/* Tip panel */}
      <div className="p-4 bg-slate-100 rounded-xl text-xs text-slate-500 flex items-start gap-2 max-w-2xl">
        <Sparkles className="w-4 h-4 text-orange-400 shrink-0 mt-0.5" />
        <div>
          Para gerar relatórios completos contendo somas e listagens impressas por períodos de balança customizados, utilize a aba **Relatórios** na barra lateral.
        </div>
      </div>

    </div>
  );
}
