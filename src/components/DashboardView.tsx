/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import {
  Boxes,
  Truck,
  DollarSign,
  TrendingUp,
  ArrowRight,
  Trash2,
  Fuel,
  Calendar,
  Trophy,
  Wrench,
  AlertTriangle,
  Crown,
  Target,
  Users,
  BarChart3
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
  LineChart, Line,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from 'recharts';
import { Vehicle, Dispatch, Invoice, FuelLog, Lancamento, BotaFora, ComissaoMotorista, Manutencao, MaintenanceAlert } from '../types';

interface DashboardViewProps {
  vehicles: Vehicle[];
  dispatches: Dispatch[];
  invoices: Invoice[];
  fuelLogs: FuelLog[];
  lancamentos: Lancamento[];
  botaForas: BotaFora[];
  motoristas: string[];
  comissoes: ComissaoMotorista[];
  manutencoes: Manutencao[];
  alerts: MaintenanceAlert[];
  setCurrentTab: (tab: string) => void;
  onOpenNewDispatch: () => void;
}

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16'];

const formatMonthLabel = (m: string) => {
  const parts = m.split('-');
  if (parts.length === 2) {
    const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const idx = parseInt(parts[1]) - 1;
    if (idx >= 0 && idx < 12) return `${monthNames[idx]}/${parts[0].slice(2)}`;
  }
  return m;
};

const formatBRL = (v: number) => `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-900 text-white px-3 py-2 rounded-lg shadow-xl text-xs">
      <p className="font-bold mb-1">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color }} className="font-mono">
          {p.name}: {typeof p.value === 'number' && p.value > 100 ? formatBRL(p.value) : p.value}
        </p>
      ))}
    </div>
  );
};

export default function DashboardView({
  vehicles, dispatches, invoices, fuelLogs, lancamentos,
  botaForas, motoristas, comissoes, manutencoes, alerts,
  setCurrentTab, onOpenNewDispatch
}: DashboardViewProps) {
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  const monthOptions = useMemo(() => {
    const monthsSet = new Set<string>();
    lancamentos.forEach(l => { if (l.data?.length >= 7) monthsSet.add(l.data.substring(0, 7)); });
    fuelLogs.forEach(f => { if (f.data?.length >= 7) monthsSet.add(f.data.substring(0, 7)); });
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    monthsSet.add(currentMonth);
    return Array.from(monthsSet).sort((a, b) => b.localeCompare(a));
  }, [lancamentos, fuelLogs]);

  const fmtMonth = (m: string) => {
    const parts = m.split('-');
    const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    if (parts.length === 2) {
      const idx = parseInt(parts[1]) - 1;
      if (idx >= 0 && idx < 12) return `${monthNames[idx]} de ${parts[0]}`;
    }
    return m;
  };

  const filteredLancamentos = useMemo(() =>
    selectedMonth === 'ALL' ? lancamentos : lancamentos.filter(l => l.data?.startsWith(selectedMonth)),
    [lancamentos, selectedMonth]
  );

  const filteredFuelLogs = useMemo(() =>
    selectedMonth === 'ALL' ? fuelLogs : fuelLogs.filter(f => f.data?.startsWith(selectedMonth)),
    [fuelLogs, selectedMonth]
  );

  const filteredManutencoes = useMemo(() =>
    selectedMonth === 'ALL' ? manutencoes : manutencoes.filter(m => m.data?.startsWith(selectedMonth)),
    [manutencoes, selectedMonth]
  );

  const totalCacambas = useMemo(() => filteredLancamentos.reduce((a, c) => a + (Number(c.quantidadeCacambas) || 0), 0), [filteredLancamentos]);
  const totalBotaFora = useMemo(() => filteredLancamentos.reduce((a, c) => a + (Number(c.valor) || 0), 0), [filteredLancamentos]);
  const totalCombustivel = useMemo(() => filteredFuelLogs.reduce((a, c) => a + (Number(c.valorPago) || 0), 0), [filteredFuelLogs]);
  const custoPorCacamba = useMemo(() => totalCacambas > 0 ? totalCombustivel / totalCacambas : 0, [totalCombustivel, totalCacambas]);
  const totalManutencao = useMemo(() => filteredManutencoes.reduce((a, c) => a + (Number(c.custo) || 0), 0), [filteredManutencoes]);
  const custoTotal = totalBotaFora + totalCombustivel + totalManutencao;

  const pendingAlerts = useMemo(() => alerts.filter(a => !a.resolved), [alerts]);
  const pendingManutencoes = useMemo(() => manutencoes.filter(m => m.status !== 'Concluído'), [manutencoes]);
  const activeVehicles = useMemo(() => vehicles.filter(v => v.isActive), [vehicles]);

  const lancamentosPagos = useMemo(() => filteredLancamentos.filter(l => l.pago).reduce((a, c) => a + (Number(c.valorPago) || Number(c.valor) || 0), 0), [filteredLancamentos]);
  const lancamentosPendentes = totalBotaFora - lancamentosPagos;

  const monthlyChartData = useMemo(() => {
    const map = new Map<string, { mes: string; cacambas: number; botaFora: number; combustivel: number }>();
    const sortedMonths = Array.from(monthOptions).sort();
    sortedMonths.forEach(m => map.set(m, { mes: formatMonthLabel(m), cacambas: 0, botaFora: 0, combustivel: 0 }));
    lancamentos.forEach(l => {
      const m = l.data?.substring(0, 7);
      if (m && map.has(m)) {
        const d = map.get(m)!;
        d.cacambas += Number(l.quantidadeCacambas) || 0;
        d.botaFora += Number(l.valor) || 0;
      }
    });
    fuelLogs.forEach(f => {
      const m = f.data?.substring(0, 7);
      if (m && map.has(m)) {
        const d = map.get(m)!;
        d.combustivel += Number(f.valorPago) || 0;
      }
    });
    return Array.from(map.values());
  }, [monthOptions, lancamentos, fuelLogs]);

  const botaForaPieData = useMemo(() => {
    const map = new Map<string, number>();
    filteredLancamentos.forEach(l => {
      const nome = l.botaForaNome || 'Sem Bota Fora';
      map.set(nome, (map.get(nome) || 0) + (Number(l.quantidadeCacambas) || 0));
    });
    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [filteredLancamentos]);

  const motoristaRanking = useMemo(() => {
    const map = new Map<string, { nome: string; cacambas: number; valor: number; lancamentos: number }>();
    filteredLancamentos.forEach(l => {
      const nome = l.driverName || 'Desconhecido';
      if (!map.has(nome)) map.set(nome, { nome, cacambas: 0, valor: 0, lancamentos: 0 });
      const d = map.get(nome)!;
      d.cacambas += Number(l.quantidadeCacambas) || 0;
      d.valor += Number(l.valor) || 0;
      d.lancamentos += 1;
    });
    return Array.from(map.values()).sort((a, b) => b.cacambas - a.cacambas);
  }, [filteredLancamentos]);

  const comissaoRanking = useMemo(() => {
    const map = new Map<string, { nome: string; vazias: number; retiradas: number; total: number }>();
    comissoes.forEach(c => {
      const nome = c.motorista || 'Desconhecido';
      if (!map.has(nome)) map.set(nome, { nome, vazias: 0, retiradas: 0, total: 0 });
      const d = map.get(nome)!;
      d.vazias += Number(c.vaziasColocadas) || 0;
      d.retiradas += Number(c.retiradas) || 0;
      d.total += (Number(c.vaziasColocadas) || 0) + (Number(c.retiradas) || 0);
    });
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [comissoes]);

  const motoristaBarData = useMemo(() => {
    return motoristaRanking.slice(0, 6).map(m => ({ nome: m.nome.length > 12 ? m.nome.slice(0, 12) + '...' : m.nome, cacambas: m.cacambas, valor: m.valor }));
  }, [motoristaRanking]);

  const comissaoBarData = useMemo(() => {
    return comissaoRanking.slice(0, 6).map(c => ({ nome: c.nome.length > 12 ? c.nome.slice(0, 12) + '...' : c.nome, vazias: c.vazias, retiradas: c.retiradas }));
  }, [comissaoRanking]);

  const topMotorista = motoristaRanking[0];
  const topComissao = comissaoRanking[0];

  return (
    <div className="space-y-6">

      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-6 shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none"></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-xl font-bold font-sans">Painel Relampago Caçambas</h3>
            <p className="text-xs text-slate-300 mt-1 leading-relaxed max-w-xl">
              Visão completa das operações. <strong>{activeVehicles.length} veículos ativos</strong> | {' '}
              <strong>{motoristaRanking.length} motoristas</strong> em operação | {' '}
              {pendingManutencoes.length > 0 && <span className="text-amber-300">{pendingManutencoes.length} manutenções pendentes</span>}
              {pendingAlerts.length > 0 && <span className="text-red-300"> | {pendingAlerts.length} alertas</span>}
            </p>
          </div>
          <button
            onClick={onOpenNewDispatch}
            className="bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer self-start md:self-auto shadow-md"
          >
            <Truck className="w-4 h-4 stroke-[2.5]" />
            <span>Novo Despacho</span>
          </button>
        </div>
      </div>

      {/* Month Filter */}
      <div className="bg-slate-50 border border-slate-200/60 p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-purple-600" />
          <span className="text-xs font-black text-slate-700 uppercase tracking-wider font-sans">Filtro Mensal</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold text-slate-500">Mês:</span>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="bg-white border border-slate-250 py-1.5 px-3 rounded-lg text-xs font-extrabold text-slate-800 shadow-xs focus:outline-hidden focus:border-purple-500 font-sans cursor-pointer"
          >
            <option value="ALL">Todos os Meses</option>
            {monthOptions.map((mo) => (
              <option key={mo} value={mo}>{fmtMonth(mo)}</option>
            ))}
          </select>
        </div>
      </div>

      {/* KPIs Row */}
      <section className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm hover:border-purple-300 transition-colors">
          <div className="flex justify-between items-center text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Caçambas</span>
            <Boxes className="w-4 h-4 text-purple-600" />
          </div>
          <p className="text-2xl font-black font-sans text-slate-900 mt-1">{totalCacambas}</p>
          <span className="text-[10px] text-slate-400 font-medium">descartadas no mês</span>
        </div>

        <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm hover:border-emerald-300 transition-colors">
          <div className="flex justify-between items-center text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Bota Fora</span>
            <Trash2 className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-black font-sans text-slate-900 mt-1">{formatBRL(totalBotaFora)}</p>
          <span className="text-[10px] text-slate-400 font-medium">pago em descarte</span>
        </div>

        <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm hover:border-orange-300 transition-colors">
          <div className="flex justify-between items-center text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Combustível</span>
            <Fuel className="w-4 h-4 text-orange-600" />
          </div>
          <p className="text-2xl font-black font-sans text-slate-900 mt-1">{formatBRL(totalCombustivel)}</p>
          <span className="text-[10px] text-slate-400 font-medium">gasto em abastecimento</span>
        </div>

        <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm hover:border-blue-300 transition-colors">
          <div className="flex justify-between items-center text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Manutenção</span>
            <Wrench className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-2xl font-black font-sans text-slate-900 mt-1">{formatBRL(totalManutencao)}</p>
          <span className="text-[10px] text-slate-400 font-medium">custo total do mês</span>
        </div>

        <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm hover:border-fuchsia-300 transition-colors">
          <div className="flex justify-between items-center text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Custo/Caçamba</span>
            <TrendingUp className="w-4 h-4 text-fuchsia-600" />
          </div>
          <p className="text-2xl font-black font-sans text-fuchsia-700 mt-1">{formatBRL(custoPorCacamba)}</p>
          <span className="text-[10px] text-slate-400 font-medium">combustível por unidade</span>
        </div>
      </section>

      {/* Financial Mini Cards */}
      <section className="grid grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 border border-emerald-200 p-4 rounded-xl">
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">Recebido (Pago)</span>
          <p className="text-xl font-black text-emerald-800 mt-1">{formatBRL(lancamentosPagos)}</p>
        </div>
        <div className="bg-gradient-to-br from-amber-50 to-amber-100/50 border border-amber-200 p-4 rounded-xl">
          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700">A Receber (Pendente)</span>
          <p className="text-xl font-black text-amber-800 mt-1">{formatBRL(lancamentosPendentes)}</p>
        </div>
        <div className="bg-gradient-to-br from-slate-50 to-slate-100/50 border border-slate-200 p-4 rounded-xl">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-700">Custo Total Operação</span>
          <p className="text-xl font-black text-slate-900 mt-1">{formatBRL(custoTotal)}</p>
        </div>
      </section>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Monthly Bar Chart */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="font-sans font-bold text-sm text-slate-900">Evolução Mensal</h4>
              <p className="text-slate-400 text-[11px] mt-0.5">Caçambas, bota fora e combustível</p>
            </div>
            <BarChart3 className="w-4 h-4 text-slate-400" />
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={monthlyChartData} barGap={2}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="mes" tick={{ fontSize: 11 }} stroke="#94a3b8" />
              <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" />
              <Tooltip content={<CustomTooltip />} />
              <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="cacambas" name="Caçambas" fill="#6366f1" radius={[4, 4, 0, 0]} />
              <Bar dataKey="botaFora" name="Bota Fora" fill="#10b981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="combustivel" name="Combustível" fill="#f59e0b" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Bota Fora Pie Chart */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="font-sans font-bold text-sm text-slate-900">Caçambas por Bota Fora</h4>
              <p className="text-slate-400 text-[11px] mt-0.5">Distribuição do descarte no período</p>
            </div>
            <Target className="w-4 h-4 text-slate-400" />
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={botaForaPieData}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={95}
                paddingAngle={3}
                dataKey="value"
                nameKey="name"
                label={({ name, percent }) => `${name.length > 14 ? name.slice(0, 14) + '...' : name} ${(percent * 100).toFixed(0)}%`}
                labelLine={{ strokeWidth: 1 }}
              >
                {botaForaPieData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value: number) => [`${value} cacambas`, 'Quantidade']} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Motorista Ranking Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Top Motorista Card - DESTAQUE */}
        <div className="bg-gradient-to-br from-indigo-600 to-purple-700 text-white rounded-2xl p-6 shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-3">
              <Crown className="w-5 h-5 text-amber-300" />
              <span className="text-xs font-black uppercase tracking-wider text-indigo-200">Motorista Destaque</span>
            </div>
            {topMotorista ? (
              <>
                <p className="text-2xl font-black">{topMotorista.nome}</p>
                <div className="mt-3 space-y-1.5">
                  <div className="flex justify-between text-sm">
                    <span className="text-indigo-200">Caçambas descarregadas</span>
                    <span className="font-black">{topMotorista.cacambas}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-indigo-200">Valor gerado</span>
                    <span className="font-black">{formatBRL(topMotorista.valor)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-indigo-200">Lançamentos</span>
                    <span className="font-black">{topMotorista.lancamentos}</span>
                  </div>
                </div>
              </>
            ) : (
              <p className="text-indigo-200 text-sm">Nenhum lançamento no período</p>
            )}
          </div>
        </div>

        {/* Top Comissão Card */}
        <div className="bg-gradient-to-br from-emerald-600 to-teal-700 text-white rounded-2xl p-6 shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-3">
              <Trophy className="w-5 h-5 text-amber-300" />
              <span className="text-xs font-black uppercase tracking-wider text-emerald-200">Mais Comissões</span>
            </div>
            {topComissao ? (
              <>
                <p className="text-2xl font-black">{topComissao.nome}</p>
                <div className="mt-3 space-y-1.5">
                  <div className="flex justify-between text-sm">
                    <span className="text-emerald-200">Vazias colocadas</span>
                    <span className="font-black">{topComissao.vazias}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-emerald-200">Retiradas</span>
                    <span className="font-black">{topComissao.retiradas}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-emerald-200">Total operações</span>
                    <span className="font-black">{topComissao.total}</span>
                  </div>
                </div>
              </>
            ) : (
              <p className="text-emerald-200 text-sm">Nenhuma comissão registrada</p>
            )}
          </div>
        </div>

        {/* Motoristas Table */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-slate-500" />
              <h4 className="font-sans font-bold text-sm text-slate-900">Ranking Motoristas</h4>
            </div>
            <button onClick={() => setCurrentTab('commissions')} className="text-[10px] text-indigo-600 hover:text-indigo-700 font-bold cursor-pointer flex items-center gap-0.5">
              Ver tudo <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          <div className="space-y-2 max-h-[200px] overflow-y-auto">
            {motoristaRanking.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-4">Nenhum dado no período</p>
            ) : motoristaRanking.map((m, i) => (
              <div key={m.nome} className={`flex items-center justify-between p-2 rounded-lg text-xs ${i === 0 ? 'bg-indigo-50 border border-indigo-100' : 'hover:bg-slate-50'}`}>
                <div className="flex items-center gap-2">
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${i === 0 ? 'bg-indigo-600 text-white' : i === 1 ? 'bg-slate-400 text-white' : i === 2 ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-500'}`}>
                    {i + 1}
                  </span>
                  <span className="font-semibold text-slate-800 truncate max-w-[100px]">{m.nome}</span>
                </div>
                <div className="text-right">
                  <span className="font-black text-slate-900">{m.cacambas}</span>
                  <span className="text-slate-400 ml-0.5">cacambas</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Motorista Performance Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Motorista Bar Chart */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <div className="mb-4">
            <h4 className="font-sans font-bold text-sm text-slate-900">Caçambas por Motorista</h4>
            <p className="text-slate-400 text-[11px] mt-0.5">Top motoristas descarregando no período</p>
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={motoristaBarData} layout="vertical" barSize={16}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11 }} stroke="#94a3b8" />
              <YAxis dataKey="nome" type="category" width={100} tick={{ fontSize: 11 }} stroke="#94a3b8" />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="cacambas" name="Caçambas" fill="#6366f1" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Comissão Stacked Bar */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <div className="mb-4">
            <h4 className="font-sans font-bold text-sm text-slate-900">Comissões por Motorista</h4>
            <p className="text-slate-400 text-[11px] mt-0.5">Vazias colocadas vs. Retiradas</p>
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={comissaoBarData} layout="vertical" barSize={16}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11 }} stroke="#94a3b8" />
              <YAxis dataKey="nome" type="category" width={100} tick={{ fontSize: 11 }} stroke="#94a3b8" />
              <Tooltip content={<CustomTooltip />} />
              <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="vazias" name="Vazias Colocadas" stackId="a" fill="#10b981" radius={[0, 0, 0, 0]} />
              <Bar dataKey="retiradas" name="Retiradas" stackId="a" fill="#06b6d4" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Fleet & Maintenance + Alerts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Fleet Status */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Truck className="w-4 h-4 text-slate-500" />
              <h4 className="font-sans font-bold text-sm text-slate-900">Frota</h4>
            </div>
            <button onClick={() => setCurrentTab('fleet')} className="text-[10px] text-indigo-600 hover:text-indigo-700 font-bold cursor-pointer flex items-center gap-0.5">
              Ver tudo <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          <div className="space-y-2.5">
            <div className="flex justify-between items-center p-2.5 bg-emerald-50 rounded-lg">
              <span className="text-xs text-emerald-700 font-medium">Ativos</span>
              <span className="text-sm font-black text-emerald-800">{activeVehicles.length}</span>
            </div>
            <div className="flex justify-between items-center p-2.5 bg-blue-50 rounded-lg">
              <span className="text-xs text-blue-700 font-medium">Em Trânsito</span>
              <span className="text-sm font-black text-blue-800">{vehicles.filter(v => v.status === 'In Transit').length}</span>
            </div>
            <div className="flex justify-between items-center p-2.5 bg-amber-50 rounded-lg">
              <span className="text-xs text-amber-700 font-medium">Manutenção</span>
              <span className="text-sm font-black text-amber-800">{vehicles.filter(v => v.status === 'Maintenance').length}</span>
            </div>
            <div className="flex justify-between items-center p-2.5 bg-slate-50 rounded-lg">
              <span className="text-xs text-slate-700 font-medium">Total Frota</span>
              <span className="text-sm font-black text-slate-800">{vehicles.length}</span>
            </div>
          </div>
        </div>

        {/* Maintenance Status */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Wrench className="w-4 h-4 text-slate-500" />
              <h4 className="font-sans font-bold text-sm text-slate-900">Manutenções</h4>
            </div>
            <button onClick={() => setCurrentTab('manutencao')} className="text-[10px] text-indigo-600 hover:text-indigo-700 font-bold cursor-pointer flex items-center gap-0.5">
              Ver tudo <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          <div className="space-y-2.5">
            <div className="flex justify-between items-center p-2.5 bg-amber-50 rounded-lg">
              <span className="text-xs text-amber-700 font-medium">Pendentes</span>
              <span className="text-sm font-black text-amber-800">{manutencoes.filter(m => m.status === 'Pendente').length}</span>
            </div>
            <div className="flex justify-between items-center p-2.5 bg-blue-50 rounded-lg">
              <span className="text-xs text-blue-700 font-medium">Em Andamento</span>
              <span className="text-sm font-black text-blue-800">{manutencoes.filter(m => m.status === 'Em Andamento').length}</span>
            </div>
            <div className="flex justify-between items-center p-2.5 bg-emerald-50 rounded-lg">
              <span className="text-xs text-emerald-700 font-medium">Concluídas</span>
              <span className="text-sm font-black text-emerald-800">{manutencoes.filter(m => m.status === 'Concluído').length}</span>
            </div>
            {pendingManutencoes.length > 0 && (
              <div className="mt-2 space-y-1.5 max-h-[80px] overflow-y-auto">
                {pendingManutencoes.slice(0, 3).map(m => (
                  <div key={m.id} className="text-[10px] text-slate-600 bg-slate-50 rounded p-1.5 truncate">
                    <span className="font-bold">{m.vehicleId}</span> - {m.descricao?.slice(0, 30) || m.tipo}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Alerts */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-slate-500" />
              <h4 className="font-sans font-bold text-sm text-slate-900">Alertas</h4>
            </div>
            <button onClick={() => setCurrentTab('fleet')} className="text-[10px] text-indigo-600 hover:text-indigo-700 font-bold cursor-pointer flex items-center gap-0.5">
              Ver tudo <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          {pendingAlerts.length === 0 ? (
            <div className="text-center py-6">
              <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-2">
                <span className="text-emerald-600 text-lg">&#10003;</span>
              </div>
              <p className="text-xs text-slate-500 font-medium">Tudo tranquilo!</p>
              <p className="text-[10px] text-slate-400 mt-0.5">Nenhum alerta pendente</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[180px] overflow-y-auto">
              {pendingAlerts.slice(0, 5).map(a => (
                <div key={a.id} className={`p-2.5 rounded-lg border text-xs ${
                  a.severity === 'critical' ? 'bg-red-50 border-red-100' :
                  a.severity === 'warning' ? 'bg-amber-50 border-amber-100' :
                  'bg-blue-50 border-blue-100'
                }`}>
                  <div className="flex items-center justify-between">
                    <span className={`font-bold ${
                      a.severity === 'critical' ? 'text-red-700' :
                      a.severity === 'warning' ? 'text-amber-700' : 'text-blue-700'
                    }`}>{a.vehicleId}</span>
                    <span className="text-[9px] text-slate-400">{a.timeAgo}</span>
                  </div>
                  <p className="text-slate-600 mt-0.5 truncate">{a.title}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <button onClick={() => setCurrentTab('fleet')} className="flex items-center gap-2.5 p-3 bg-white border border-slate-200 rounded-xl hover:border-indigo-300 hover:bg-indigo-50 transition-all cursor-pointer text-left">
          <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center"><Truck className="w-4 h-4 text-indigo-600" /></div>
          <div><span className="text-xs font-bold text-slate-800 block">Frota</span><span className="text-[10px] text-slate-400">{activeVehicles.length} ativos</span></div>
        </button>
        <button onClick={() => setCurrentTab('finance')} className="flex items-center gap-2.5 p-3 bg-white border border-slate-200 rounded-xl hover:border-emerald-300 hover:bg-emerald-50 transition-all cursor-pointer text-left">
          <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center"><DollarSign className="w-4 h-4 text-emerald-600" /></div>
          <div><span className="text-xs font-bold text-slate-800 block">Financeiro</span><span className="text-[10px] text-slate-400">Faturas e pagamentos</span></div>
        </button>
        <button onClick={() => setCurrentTab('manutencao')} className="flex items-center gap-2.5 p-3 bg-white border border-slate-200 rounded-xl hover:border-amber-300 hover:bg-amber-50 transition-all cursor-pointer text-left">
          <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center"><Wrench className="w-4 h-4 text-amber-600" /></div>
          <div><span className="text-xs font-bold text-slate-800 block">Manutenção</span><span className="text-[10px] text-slate-400">{pendingManutencoes.length} pendentes</span></div>
        </button>
        <button onClick={() => setCurrentTab('commissions')} className="flex items-center gap-2.5 p-3 bg-white border border-slate-200 rounded-xl hover:border-purple-300 hover:bg-purple-50 transition-all cursor-pointer text-left">
          <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center"><Trophy className="w-4 h-4 text-purple-600" /></div>
          <div><span className="text-xs font-bold text-slate-800 block">Comissões</span><span className="text-[10px] text-slate-400">{comissaoRanking.length} motoristas</span></div>
        </button>
      </div>

    </div>
  );
}
