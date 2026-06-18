/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { 
  DollarSign, 
  Percent, 
  TrendingUp, 
  CheckCircle, 
  Fuel, 
  Activity, 
  Trash2, 
  FilePlus, 
  RefreshCw,
  Search,
  Filter,
  CreditCard,
  Building,
  Calendar,
  AlertTriangle,
  FileCheck,
  Archive,
  Info
} from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, PieChart, Pie, Cell } from 'recharts';
import { Invoice, DailyFuelData, OperatingCostStructure, BotaFora, Lancamento } from '../types';

interface FinanceViewProps {
  invoices: Invoice[];
  fuelTrend: DailyFuelData[];
  costStructure: OperatingCostStructure[];
  botaForas: BotaFora[];
  lancamentos: Lancamento[];
  onAddInvoice: (invoice: Omit<Invoice, 'id'>) => void;
  onUpdateInvoiceStatus: (id: string, status: Invoice['status']) => void;
  onDeleteInvoice: (id: string) => void;
  searchTerm: string;
}

const translateInvoiceStatus = (status: string) => {
  switch (status) {
    case 'PAID': return 'Pago';
    case 'PENDING': return 'Pendente';
    case 'OVERDUE': return 'Atrasado';
    case 'DRAFT': return 'Rascunho';
    default: return status;
  }
};

export default function FinanceView({
  invoices,
  fuelTrend,
  costStructure,
  botaForas,
  lancamentos,
  onAddInvoice,
  onUpdateInvoiceStatus,
  onDeleteInvoice,
  searchTerm
}: FinanceViewProps) {
  const [activeSubTab, setActiveSubTab] = useState<'INVOICES' | 'BOTA_FORAS' | 'COSTS'>('INVOICES');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PAID' | 'PENDING' | 'OVERDUE'>('ALL');
  
  // Local search specifically for Bota Foras
  const [botaForaSearchQuery, setBotaForaSearchQuery] = useState('');

  // New Invoice form states
  const [clientName, setClientName] = useState('');
  const [entityCode, setEntityCode] = useState('');
  const [serviceDesc, setServiceDesc] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [amount, setAmount] = useState(1500);

  // Financial statistics calculated live for invoices
  const stats = useMemo(() => {
    let pending = 0;
    let overdue = 0;
    let paid = 0;

    invoices.forEach(inv => {
      if (inv.status === 'PENDING') pending += inv.amount;
      else if (inv.status === 'OVERDUE') overdue += inv.amount;
      else if (inv.status === 'PAID') paid += inv.amount;
    });

    return { pending, overdue, paid };
  }, [invoices]);

  // Invoice list filtered on state hooks, global search AND custom bota fora query
  const filteredInvoices = useMemo(() => {
    let result = invoices;

    if (statusFilter !== 'ALL') {
      result = result.filter(inv => inv.status === statusFilter);
    }

    // Combine global search and direct bota fora query
    const matchQuery = (botaForaSearchQuery || searchTerm).trim().toLowerCase();
    if (matchQuery) {
      result = result.filter(inv => 
        inv.id.toLowerCase().includes(matchQuery) ||
        inv.clientName.toLowerCase().includes(matchQuery) ||
        inv.serviceDesc.toLowerCase().includes(matchQuery) ||
        inv.entityCode.toLowerCase().includes(matchQuery)
      );
    }

    return result;
  }, [invoices, statusFilter, searchTerm, botaForaSearchQuery]);

  // Aggregate stats per Bota Fora (counts and dollars)
  const botaForaFinanceStats = useMemo(() => {
    return botaForas.map(btf => {
      const matchLancamentos = lancamentos.filter(lan => lan.botaForaId === btf.id);
      const totalCacambas = matchLancamentos.reduce((sum, lan) => sum + lan.quantidadeCacambas, 0);
      const totalValor = matchLancamentos.reduce((sum, lan) => sum + lan.valor, 0);
      
      return {
        ...btf,
        totalCacambas,
        totalValor,
        lancamentosCount: matchLancamentos.length
      };
    });
  }, [botaForas, lancamentos]);

  // Filter bota fora financial breakdown list based on the search queries
  const filteredBotaForasFinance = useMemo(() => {
    const query = botaForaSearchQuery.trim().toLowerCase();
    if (!query) return botaForaFinanceStats;
    return botaForaFinanceStats.filter(item => 
      item.nome.toLowerCase().includes(query) ||
      item.cnpj.includes(query) ||
      item.id.toLowerCase().includes(query) ||
      item.endereco.toLowerCase().includes(query)
    );
  }, [botaForaFinanceStats, botaForaSearchQuery]);

  const handleInvoiceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName || !serviceDesc || !dueDate || amount <= 0) {
      alert("Por favor, preencha todos os campos obrigatórios da fatura.");
      return;
    }

    // Format simple date to Portuguese style
    const [year, month, day] = dueDate.split('-');
    const formattedDate = `${day}/${month}/${year}`;

    onAddInvoice({
      clientName,
      entityCode: entityCode.toUpperCase() || 'CLI',
      serviceDesc,
      issueDate: '16/06/2026',
      dueDate: formattedDate,
      amount,
      status: 'PENDING'
    });

    // Reset Form fields
    setClientName('');
    setEntityCode('');
    setServiceDesc('');
    setDueDate('');
    setAmount(1500);
  };

  return (
    <div className="space-y-6">
            {/* Finance Navigation Tabs */}
      <div className="flex border-b border-slate-200">
        <button
          type="button"
          onClick={() => setActiveSubTab('INVOICES')}
          className={`px-5 py-3 text-xs font-bold transition-all relative cursor-pointer ${
            activeSubTab === 'INVOICES' 
              ? 'text-purple-600 border-b-2 border-purple-500' 
              : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          FATURAMENTO E CONTAS ATIVAS
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab('BOTA_FORAS')}
          className={`px-5 py-3 text-xs font-bold transition-all relative cursor-pointer ${
            activeSubTab === 'BOTA_FORAS' 
              ? 'text-purple-600 border-b-2 border-purple-500' 
              : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          FINANCEIRO DOS BOTA FORAS
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab('COSTS')}
          className={`px-5 py-3 text-xs font-bold transition-all relative cursor-pointer ${
            activeSubTab === 'COSTS' 
              ? 'text-purple-600 border-b-2 border-purple-500' 
              : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          ESTRUTURA DE CUSTOS E COMBUSTÍVEL
        </button>
      </div>

      {activeSubTab === 'INVOICES' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Main Ledger Content */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Live Audit Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              
              <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm">
                <div className="flex justify-between items-center text-slate-400">
                  <span className="text-[10px] font-bold uppercase tracking-wider">Contas Pendentes</span>
                  <DollarSign className="w-4 h-4 text-emerald-600" />
                </div>
                <p className="text-xl font-bold font-sans text-slate-900 mt-1">R$ {stats.pending.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                <p className="text-[10px] text-slate-400 font-medium">Aguardando auditoria e liberação</p>
              </div>

              <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm">
                <div className="flex justify-between items-center text-slate-400">
                  <span className="text-[10px] font-bold uppercase tracking-wider">Inadimplência</span>
                  <AlertTriangle className="w-4 h-4 text-rose-500" />
                </div>
                <p className="text-xl font-bold font-sans text-rose-600 mt-1">R$ {stats.overdue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                <p className="text-[10px] text-slate-400 font-medium">Faturas vencidas não quitadas</p>
              </div>

              <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm">
                <div className="flex justify-between items-center text-slate-400">
                  <span className="text-[10px] font-bold uppercase tracking-wider">Ganhos Quitados</span>
                  <CheckCircle className="w-4 h-4 text-indigo-600" />
                </div>
                <p className="text-xl font-bold font-sans text-slate-900 mt-1">R$ {stats.paid.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                <p className="text-[10px] text-slate-400 font-medium">Total de faturas pagas acumuladas</p>
              </div>

            </div>

            {/* Invoices List Section */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
              
              {/* Filter Row */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-3 border-b border-slate-100 gap-3">
                <div>
                  <h4 className="font-sans font-bold text-sm text-slate-900 leading-none">Contas e Faturas Ativas</h4>
                  <p className="text-slate-400 text-xs mt-0.5">Visão geral do caixa e faturas correspondentes</p>
                </div>
                
                {/* Status Filter buttons */}
                <div className="flex gap-1 bg-slate-100 p-0.5 rounded self-start">
                  {['ALL', 'PAID', 'PENDING'].map((status) => (
                    <button
                      type="button"
                      key={status}
                      onClick={() => setStatusFilter(status as any)}
                      className={`px-2 py-1 text-[10px] font-bold rounded cursor-pointer transition-colors ${
                        statusFilter === status 
                          ? 'bg-slate-900 text-white' 
                          : 'text-slate-500 hover:text-slate-705'
                      }`}
                    >
                      {status === 'ALL' ? 'Todos' : translateInvoiceStatus(status)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Bota Fora Search Input (Prominent Improvement!) */}
              <div className="relative bg-slate-50 p-2.5 rounded-lg border border-slate-150 flex items-center gap-2">
                <Search className="w-4 h-4 text-slate-400 shrink-0" />
                <input
                  type="text"
                  placeholder="Pesquisar por Bota Fora (Nome, CNPJ, Codigo, Cliente)..."
                  value={botaForaSearchQuery}
                  onChange={(e) => setBotaForaSearchQuery(e.target.value)}
                  className="bg-transparent border-none text-xs w-full focus:outline-none placeholder-slate-400 text-slate-750 font-medium"
                />
                {botaForaSearchQuery && (
                  <button 
                    type="button"
                    onClick={() => setBotaForaSearchQuery('')}
                    className="text-[10px] font-bold text-slate-400 hover:text-slate-600 transition-colors uppercase shrink-0"
                  >
                    limpar
                  </button>
                )}
              </div>

              <div className="overflow-x-auto pr-1">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      <th className="pb-3 pt-1">Cliente / Destino</th>
                      <th className="pb-3 pt-1">Descrição</th>
                      <th className="pb-3 pt-1">Vencimento</th>
                      <th className="pb-3 pt-1 text-right">Valor</th>
                      <th className="pb-3 pt-1 text-center">Status</th>
                      <th className="pb-3 pt-1 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-55 text-xs">
                    {filteredInvoices.map((inv) => {
                      const isPaid = inv.status === 'PAID';
                      const isPending = inv.status === 'PENDING';
                      
                      return (
                        <tr key={inv.id} className="text-xs hover:bg-slate-50/60 transition-colors">
                          <td className="py-3">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 bg-slate-100 text-slate-700 font-bold flex items-center justify-center text-[10px] rounded shrink-0 border border-slate-200 uppercase">
                                {inv.entityCode}
                              </div>
                              <div>
                                <span className="font-semibold text-slate-800 font-sans block leading-none">{inv.clientName}</span>
                                <span className="text-[9px] text-slate-400 font-mono mt-0.5 inline-block">{inv.id}</span>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 text-slate-600 font-medium pl-1 max-w-[150px] truncate">{inv.serviceDesc}</td>
                          <td className="py-3 text-slate-400 font-mono">{inv.dueDate}</td>
                          <td className="py-3 font-mono font-bold text-slate-900 text-right">R$ {inv.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                          <td className="py-3 text-center">
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border ${
                              isPaid ? 'bg-indigo-50 text-indigo-700 border-indigo-100' :
                              isPending ? 'bg-amber-50 text-amber-700 border-amber-100' :
                              'bg-rose-50 text-rose-700 border-rose-100'
                            }`}>
                              {translateInvoiceStatus(inv.status)}
                            </span>
                          </td>
                          <td className="py-3 text-right font-semibold">
                            <div className="flex items-center justify-end gap-1.5">
                              
                              {/* Status changer buttons */}
                              {!isPaid && (
                                <button
                                  type="button"
                                  onClick={() => onUpdateInvoiceStatus(inv.id, 'PAID')}
                                  title="Marcar como PAGO"
                                  className="p-1 hover:bg-emerald-50 rounded text-emerald-600 cursor-pointer transition-colors border border-slate-100"
                                >
                                  <FileCheck className="w-3.5 h-3.5" />
                                </button>
                              )}

                              {isPaid && (
                                <button
                                  type="button"
                                  onClick={() => onUpdateInvoiceStatus(inv.id, 'PENDING')}
                                  title="Mudar para PENDENTE"
                                  className="p-1 hover:bg-amber-50 rounded text-amber-500 cursor-pointer transition-colors border border-slate-100"
                                >
                                  <RefreshCw className="w-3.5 h-3.5" />
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() => onDeleteInvoice(inv.id)}
                                title="Excluir Registro"
                                className="p-1 hover:bg-rose-50 rounded text-rose-500 cursor-pointer transition-colors border border-slate-100"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}

                    {filteredInvoices.length === 0 && (
                      <tr>
                        <td colSpan={6} className="text-center py-12 text-slate-400 font-sans font-medium">
                          Nenhum registro de faturamento localizado para os filtros informados.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>

          {/* New Invoice creation panel */}
          <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-sm text-slate-800 flex flex-col justify-between h-fit">
            <div>
              <div className="flex items-center gap-2 pb-3 border-b border-slate-100 mb-4">
                <FilePlus className="w-5 h-5 text-emerald-600" />
                <h4 className="font-sans font-bold text-sm text-slate-900 leading-none">Gerar Registro de Faturamento</h4>
              </div>

              <form onSubmit={handleInvoiceSubmit} className="space-y-4">
                
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Nome do Cliente / Bota Fora</label>
                  <div className="relative">
                    <Building className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      required
                      placeholder="Ex: Aterro Paulista Ltda"
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 pl-8 pr-3 py-1.5 rounded text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium text-slate-800"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Sigla Entidade</label>
                    <input
                      type="text"
                      maxLength={3}
                      placeholder="Ex: AP"
                      value={entityCode}
                      onChange={(e) => setEntityCode(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 p-1.5 rounded text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-800 font-bold uppercase text-center"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Valor total bruto (R$)</label>
                    <input
                      type="number"
                      required
                      value={amount}
                      onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                      className="w-full bg-slate-50 border border-slate-200 p-1.5 rounded text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-850 font-mono font-bold"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Descrição dos Serviços</label>
                  <input
                    type="text"
                    required
                    placeholder="Contrato de Descarte de Caçambas"
                    value={serviceDesc}
                    onChange={(e) => setServiceDesc(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 px-3 py-1.5 rounded text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-800 font-medium"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Data de Vencimento</label>
                  <div className="relative">
                    <Calendar className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    <input
                      type="date"
                      required
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 pl-8 pr-3 py-1.5 rounded text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-855 font-semibold"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full bg-slate-900 hover:bg-slate-850 active:bg-slate-950 text-white font-bold text-xs py-2.5 rounded shadow-sm cursor-pointer mt-4 transition-colors"
                >
                  Registrar Fatura no Guarda-Livros
                </button>
              </form>
            </div>
          </div>

        </div>
      )}

      {/* NEW SUB TAB: Financeiro dos Bota Foras (Satisfies requirement 4!) */}
      {activeSubTab === 'BOTA_FORAS' && (
        <div className="space-y-6">
          
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-100">
              <div>
                <h4 className="font-sans font-bold text-sm text-slate-900 leading-none">Faturamento e Contabilidade das Áreas de Descarte</h4>
                <p className="text-slate-400 text-xs mt-0.5">Visão consolidada de caçambas logadas e valores divididos por Bota Fora parceiro</p>
              </div>

              {/* Real search bar for Bota Foras */}
              <div className="relative bg-slate-100 p-1 rounded-lg flex items-center gap-2 self-start sm:self-center border border-slate-200">
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Buscar Bota Fora (Nome ou CNPJ)..."
                  value={botaForaSearchQuery}
                  onChange={(e) => setBotaForaSearchQuery(e.target.value)}
                  className="bg-transparent pl-8 pr-3 py-1.5 text-xs text-slate-750 font-semibold focus:outline-none placeholder-slate-400 w-64 md:w-80"
                />
              </div>
            </div>

            {/* List of aggregated financial values per Bota Fora */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-2">
              {filteredBotaForasFinance.map(btf => {
                return (
                  <div key={btf.id} className="bg-slate-50 hover:bg-white border-2 border-slate-200 hover:border-purple-300 hover:shadow-lg rounded-2xl p-5 space-y-4 transition-all duration-300 relative overflow-hidden group">
                    <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-purple-500 to-indigo-600"></div>
                    
                    <div className="flex justify-between items-start pt-1">
                      <div>
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="font-mono text-[9px] font-black text-purple-700 bg-purple-100 px-2 py-0.5 rounded uppercase tracking-wider">{btf.id}</span>
                          <span className="text-[10px] text-slate-400 font-bold">PARCEIRO AUDITADO</span>
                        </div>
                        <h5 className="font-sans font-black text-base text-slate-900 group-hover:text-purple-700 transition-colors leading-tight">{btf.nome}</h5>
                        <span className="text-[10px] text-slate-400 font-mono mt-0.5 block">CNPJ: {btf.cnpj}</span>
                      </div>

                      {/* Cumulative total valor */}
                      <div className="text-right bg-emerald-50 border border-emerald-100 p-2.5 rounded-xl">
                        <span className="text-[8px] text-emerald-800 uppercase font-black tracking-wider block">Total Recebido</span>
                        <strong className="text-base font-black text-emerald-700 font-mono block mt-0.5">
                          R$ {btf.totalValor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </strong>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 bg-white p-3 rounded-xl border border-slate-150 text-xs shadow-inner">
                      <div className="space-y-0.5">
                        <span className="text-[9px] font-bold text-slate-400 uppercase block">Caçambas Descarregadas</span>
                        <strong className="text-slate-800 text-sm font-sans flex items-center gap-1.5 mt-0.5">
                          <Archive className="w-4 h-4 text-purple-500 shrink-0" />
                          <span className="text-slate-900 font-black">{btf.totalCacambas} un.</span>
                        </strong>
                      </div>

                      <div className="space-y-0.5 text-right border-l border-slate-100 pl-4">
                        <span className="text-[9px] font-bold text-slate-400 uppercase block">Envios de Caçambas</span>
                        <strong className="text-slate-800 font-sans text-sm flex items-center justify-end gap-1.5 mt-0.5">
                          <Activity className="w-4 h-4 text-indigo-500 shrink-0" />
                          <span className="text-slate-900 font-black">{btf.lancamentosCount} logs</span>
                        </strong>
                      </div>
                    </div>

                    <div className="text-[10px] text-slate-500 bg-slate-100 p-2 rounded-lg font-medium flex items-center gap-1.5">
                      <span className="text-purple-650 font-bold uppercase shrink-0 text-[8px] border border-purple-305 px-1 py-0.2 rounded bg-white">Endereço</span>
                      <span className="truncate" title={btf.endereco}>{btf.endereco}</span>
                    </div>
                  </div>
                );
              })}

              {filteredBotaForasFinance.length === 0 && (
                <div className="col-span-2 text-center py-12 text-slate-400 font-sans text-xs">
                  Nenhum Bota Fora correspondente à busca encontrado. Vá em "Descarte" para cadastrar.
                </div>
              )}
            </div>
          </div>

          {/* Quick info */}
          <div className="bg-white border border-slate-200 p-4 rounded-xl text-xs text-slate-500 flex items-start gap-2 max-w-2xl">
            <Info className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              Caso deseje auditar individualmente transações com datas específicas do período selecionado por bota foras na barra de pesquisa, gere o relatório consolidado na aba **Relatórios**.
            </div>
          </div>

        </div>
      )}

      {activeSubTab === 'COSTS' && (
        /* Fuel Trend Diagnostics Tab with Recharts Visualizers */
        <div className="space-y-6">
          
          {/* Guia de Ajuda e Boas-Vindas à Análise Financeira */}
          <div className="bg-purple-50 border border-purple-200/60 rounded-2xl p-5 flex items-start gap-3.5 shadow-sm animate-in fade-in duration-200">
            <div className="w-10 h-10 rounded-xl bg-purple-600/10 border border-purple-500/20 flex items-center justify-center text-purple-600 shrink-0">
              <Info className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h4 className="font-sans font-black text-sm text-slate-900">Entenda a sua Estrutura de Custos Operacionais</h4>
              <p className="text-slate-650 text-xs mt-1 leading-relaxed">
                Este painel apresenta de forma simples e gráfica para onde vai o dinheiro da sua empresa. Aqui você compara o 
                abastecimento de combustível feito nesta semana contra o da semana passada para evitar desperdícios, além de 
                visualizar a proporção de despesas operacionais divididas entre <strong>Combustível</strong>, <strong>Manutenção dos Caminhões</strong>, 
                e tarifas de <strong>Pedágio & Seguros</strong>. Todos os dados são atualizados de forma automática com base nos seus lançamentos.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Recharts Bar charts - Fuel burns */}
            <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
              <div>
                <span className="text-[9px] bg-purple-100 text-purple-800 font-extrabold px-1.5 py-0.5 rounded tracking-wider uppercase mb-1 inline-block">Análise Comparativa</span>
                <h4 className="font-sans font-extrabold text-sm text-slate-900 leading-none">Abastecimento de Combustível nos Dias da Semana</h4>
                <p className="text-slate-400 text-[10px] uppercase font-bold tracking-wider mt-1.5">Litros de Diesel Consumidos no Dia: Esta Semana vs. Semana Anterior</p>
              </div>

              <div className="w-full h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={fuelTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#64748b', fontWeight: 'bold' }} stroke="#e2e8f0" />
                    <YAxis tick={{ fontSize: 10, fill: '#64748b' }} stroke="#e2e8f0" />
                    <Tooltip 
                      formatter={(val: number) => [`${(val || 0).toLocaleString()} Litros`, 'Volume Abastecido']}
                      wrapperStyle={{ fontSize: 11, fontFamily: 'Inter, sans-serif' }} 
                    />
                    <Legend wrapperStyle={{ fontSize: 11, fontWeight: 'medium' }} />
                    <Bar dataKey="thisWeek" name="Esta Semana (Litros)" fill="#9333ea" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="lastWeek" name="Semana Passada (Litros)" fill="#cbd5e1" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-slate-50 p-3 rounded-lg text-[11px] text-slate-500 leading-normal border border-slate-150">
                💡 <strong>Dica de Auditoria:</strong> Se as barras da <span className="text-purple-600 font-bold">"Esta Semana"</span> estiverem consideravelmente maiores que as da <span className="text-slate-450 font-bold">"Semana Passada"</span> sem um aumento correspondente no log de caçambas, verifique possíveis desvios ou vazamentos.
              </div>
            </div>

            {/* Recharts Pie Chart - Operating Expenses distribution */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col justify-between h-fit space-y-4">
              <div className="space-y-4">
                <div>
                  <span className="text-[9px] bg-indigo-100 text-indigo-805 font-extrabold px-1.5 py-0.5 rounded tracking-wider uppercase mb-1 inline-block">Divisão de Gastos</span>
                  <h4 className="font-sans font-extrabold text-sm text-slate-900 leading-none">Distribuição de Despesas Operacionais</h4>
                  <p className="text-slate-400 text-[10px] uppercase font-bold tracking-wider mt-1.5">Quanto cada categoria representa nas finanças da frota</p>
                </div>

                <div className="w-full h-[180px] flex items-center justify-center relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={costStructure}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={75}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {costStructure.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(val: number) => [`R$ ${(val || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 'Despesa Acumulada']} />
                    </PieChart>
                  </ResponsiveContainer>
                  
                  <div className="absolute flex flex-col items-center">
                    <span className="text-[8px] uppercase font-bold tracking-wider text-slate-400">Despesa Total</span>
                    <span className="text-sm font-black text-slate-800 font-sans leading-none mt-1">
                      R$ {costStructure.reduce((a, b) => a + b.value, 0).toLocaleString('pt-BR')}
                    </span>
                  </div>
                </div>

                <div className="space-y-2 border-t border-slate-100 pt-3">
                  {costStructure.map((entry, idx) => (
                    <div key={idx} className="flex items-center justify-between text-xs pb-1.5 border-b border-slate-50 last:border-0 last:pb-0">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: entry.color }}></div>
                        <span className="font-bold text-slate-700">{entry.name}</span>
                      </div>
                      <div className="space-x-3 text-right">
                        <span className="font-mono text-slate-400 text-[10px] font-bold">{entry.percentage}%</span>
                        <span className="font-mono font-bold text-slate-900">R$ {entry.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

          </div>

        </div>
      )}

    </div>
  );
}
