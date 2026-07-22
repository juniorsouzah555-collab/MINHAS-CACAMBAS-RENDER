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
import { Lancamento, BotaFora, Vehicle } from '../types';

interface OperationsViewProps {
  lancamentos: Lancamento[];
  onDeleteLancamento: (id: string) => void;
  onEditLancamento: (id: string, updates: Partial<Lancamento>) => void;
  botaForas: BotaFora[];
  vehicles: Vehicle[];
  searchTerm: string;
  onOpenNewDispatch: () => void; // mapped to launching the New Lançamento Modal!
}

export default function OperationsView({
  lancamentos,
  onDeleteLancamento,
  onEditLancamento,
  botaForas,
  vehicles,
  searchTerm,
  onOpenNewDispatch
}: OperationsViewProps) {
  const [botaForaFilter, setBotaForaFilter] = useState('ALL');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [editingLancamento, setEditingLancamento] = useState<Lancamento | null>(null);
  const [editForm, setEditForm] = useState({
    botaForaId: '',
    botaForaNome: '',
    quantidadeCacambas: 1,
    valor: 0,
    data: '',
    driverName: '',
    vehicleId: '',
    observacao: ''
  });

  // Handle resetting of filters
  const handleResetFilters = () => {
    setBotaForaFilter('ALL');
    setFilterStartDate('');
    setFilterEndDate('');
  };

  // Open edit modal
  const openEditModal = (lan: Lancamento) => {
    setEditingLancamento(lan);
    setEditForm({
      botaForaId: lan.botaForaId,
      botaForaNome: lan.botaForaNome,
      quantidadeCacambas: lan.quantidadeCacambas,
      valor: lan.valor,
      data: lan.data,
      driverName: lan.driverName || '',
      vehicleId: lan.vehicleId || '',
      observacao: lan.observacao || ''
    });
  };

  // Save edit
  const saveEdit = () => {
    if (!editingLancamento) return;
    onEditLancamento(editingLancamento.id, {
      botaForaId: editForm.botaForaId,
      botaForaNome: editForm.botaForaNome,
      quantidadeCacambas: editForm.quantidadeCacambas,
      valor: editForm.valor,
      data: editForm.data,
      driverName: editForm.driverName || undefined,
      vehicleId: editForm.vehicleId || undefined,
      observacao: editForm.observacao || undefined
    });
    setEditingLancamento(null);
  };

  // Send via WhatsApp
  const sendWhatsApp = (lan: Lancamento) => {
    const local = lan.botaForaNome || '';
    const dataFmt = lan.data ? new Date(lan.data + 'T12:00:00').toLocaleDateString('pt-BR') : '';
    const valorLinha = lan.valor > 0 ? `\n💰 Valor: R$ ${lan.valor.toFixed(2).replace('.', ',')}` : '';
    const numLinha = lan.numero != null ? `📋 *Lançamento #${lan.numero}*\n` : '';
    const msg =
      `✅ *Lançamento registrado*\n` +
      numLinha +
      `📍 Local: ${local}\n` +
      `📦 Quantidade: ${lan.quantidadeCacambas} caçamba${lan.quantidadeCacambas > 1 ? 's' : ''}` +
      valorLinha +
      (lan.vehicleId ? `\n🚛 Veículo: ${lan.vehicleId}` : '') +
      (lan.driverName ? `\n👷 Motorista: ${lan.driverName}` : '') +
      `\n📅 Data: ${dataFmt}` +
      (lan.observacao ? `\n📝 Obs: ${lan.observacao}` : '');
    const url = `https://wa.me/?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
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

    return result.sort((a, b) => (b.data || '').localeCompare(a.data || '') || (b.createdAt || '').localeCompare(a.createdAt || ''));
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

  const formatDateTime = (isoStr: string) => {
    if (!isoStr) return '';
    try {
      const d = new Date(isoStr);
      return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch {
      return isoStr;
    }
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
              className={`bg-white border border-slate-200 p-5 rounded-2xl shadow-sm hover:shadow-md hover:border-slate-300 transition-all duration-150 flex flex-col justify-between border-t-4 border-t-emerald-500 ${
                lan.source === 'mobile' ? 'ring-2 ring-orange-400 shadow-[0_0_15px_rgba(251,146,60,0.3)]' : ''
              }`}
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
                      <div className="flex items-center gap-2">
                        <h4 className="font-sans font-bold text-sm text-slate-900 leading-tight">{lan.botaForaNome}</h4>
                        {lan.numero != null && (
                          <span className="px-1.5 py-0.5 rounded-md text-[8px] font-black bg-indigo-100 text-indigo-700 tracking-wider">#{lan.numero}</span>
                        )}
                      </div>
                      <code className="text-[9px] text-slate-400 font-mono font-semibold uppercase">{lan.id}</code>
                    </div>
                  </div>

                  {/* Date Badge */}
                  <div className="flex flex-col items-end gap-1">
                    <span className="px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600 border border-slate-200 flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-slate-400 shrink-0" />
                      <span>{formatDate(lan.data)}</span>
                    </span>
                    {lan.createdAt && (
                      <span className="px-2.5 py-0.5 rounded-full text-[9px] font-bold tracking-wider bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-indigo-400 shrink-0" />
                        <span>{formatDateTime(lan.createdAt)}</span>
                      </span>
                    )}
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

                {/* Action buttons */}
                <div className="flex items-center gap-1">
                  {/* WhatsApp button */}
                  <button
                    type="button"
                    onClick={() => sendWhatsApp(lan)}
                    className="text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 p-1.5 rounded-lg border border-transparent hover:border-emerald-100 transition-colors cursor-pointer flex items-center gap-1 bg-transparent"
                    title="Enviar via WhatsApp"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                    </svg>
                    <span className="text-[10px] font-bold uppercase tracking-wider hidden sm:inline">WhatsApp</span>
                  </button>

                  {/* Edit button */}
                  <button
                    type="button"
                    onClick={() => openEditModal(lan)}
                    className="text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 p-1.5 rounded-lg border border-transparent hover:border-indigo-100 transition-colors cursor-pointer flex items-center gap-1 bg-transparent"
                    title="Editar Lançamento"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                    </svg>
                    <span className="text-[10px] font-bold uppercase tracking-wider hidden sm:inline">Editar</span>
                  </button>

                  {/* Delete button */}
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

      {/* Edit Modal */}
      {editingLancamento && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-slate-900">Editar Lançamento</h3>
              <button
                onClick={() => setEditingLancamento(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12"></path>
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              {/* Bota Fora */}
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Local de Descarga</label>
                <select
                  value={editForm.botaForaId}
                  onChange={(e) => {
                    const bf = botaForas.find(b => b.id === e.target.value);
                    setEditForm(prev => ({
                      ...prev,
                      botaForaId: e.target.value,
                      botaForaNome: bf?.nome || ''
                    }));
                  }}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-slate-800 focus:outline-none focus:border-indigo-500"
                >
                  {botaForas.map(bf => (
                    <option key={bf.id} value={bf.id}>{bf.nome}</option>
                  ))}
                </select>
              </div>

              {/* Quantidade */}
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Quantidade de Caçambas</label>
                <input
                  type="number"
                  min="1"
                  value={editForm.quantidadeCacambas}
                  onChange={(e) => setEditForm(prev => ({ ...prev, quantidadeCacambas: parseInt(e.target.value) || 1 }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-slate-800 focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Valor */}
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Valor (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={editForm.valor}
                  onChange={(e) => setEditForm(prev => ({ ...prev, valor: parseFloat(e.target.value) || 0 }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-slate-800 focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Data */}
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Data</label>
                <input
                  type="date"
                  value={editForm.data}
                  onChange={(e) => setEditForm(prev => ({ ...prev, data: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-slate-800 focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Veículo */}
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Veículo</label>
                <select
                  value={editForm.vehicleId}
                  onChange={(e) => setEditForm(prev => ({ ...prev, vehicleId: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-slate-800 focus:outline-none focus:border-indigo-500"
                >
                  <option value="">Selecionar veículo</option>
                  {vehicles.filter(v => v.isActive).map(v => (
                    <option key={v.id} value={v.id}>{v.id} - {v.driver || 'Sem motorista'}</option>
                  ))}
                </select>
              </div>

              {/* Observação */}
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Observação</label>
                <input
                  type="text"
                  value={editForm.observacao}
                  onChange={(e) => setEditForm(prev => ({ ...prev, observacao: e.target.value }))}
                  placeholder="Observação opcional"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Buttons */}
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setEditingLancamento(null)}
                className="flex-1 py-3 rounded-xl font-bold text-sm bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={saveEdit}
                className="flex-1 py-3 rounded-xl font-bold text-sm bg-indigo-600 text-white hover:bg-indigo-700 transition-colors cursor-pointer"
              >
                Salvar Alterações
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
