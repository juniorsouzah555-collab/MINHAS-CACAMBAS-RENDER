/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { 
  Calendar, 
  Search, 
  Download, 
  Printer, 
  FileText, 
  Info, 
  TrendingUp, 
  DollarSign, 
  Package, 
  Filter,
  CheckCircle,
  Truck
} from 'lucide-react';
import { BotaFora, Lancamento } from '../types';

interface ReportsViewProps {
  botaForas: BotaFora[];
  lancamentos: Lancamento[];
}

export default function ReportsView({ botaForas, lancamentos }: ReportsViewProps) {
  const [startDate, setStartDate] = useState('2026-06-01');
  const [endDate, setEndDate] = useState('2026-06-30');
  const [selectedBotaForaId, setSelectedBotaForaId] = useState('ALL');
  const [searchBotaFora, setSearchBotaFora] = useState('');

  // Filter bota foras matching search text
  const searchedBotaForas = useMemo(() => {
    if (!searchBotaFora.trim()) return botaForas;
    const query = searchBotaFora.toLowerCase();
    return botaForas.filter(b => 
      b.nome.toLowerCase().includes(query) || 
      b.cnpj.includes(query) ||
      b.endereco.toLowerCase().includes(query)
    );
  }, [botaForas, searchBotaFora]);

  // Filter lancamentos based on period and bota fora
  const filteredLancamentos = useMemo(() => {
    return lancamentos.filter(lan => {
      // Date bounds check
      const lanDate = lan.data; // "YYYY-MM-DD"
      const matchesDate = (!startDate || lanDate >= startDate) && (!endDate || lanDate <= endDate);
      
      // Bota Fora check
      let matchesBotaFora = true;
      if (selectedBotaForaId !== 'ALL') {
        matchesBotaFora = lan.botaForaId === selectedBotaForaId;
      } else if (searchBotaFora.trim()) {
        const matchingIds = searchedBotaForas.map(b => b.id);
        matchesBotaFora = matchingIds.includes(lan.botaForaId);
      }

      return matchesDate && matchesBotaFora;
    });
  }, [lancamentos, startDate, endDate, selectedBotaForaId, searchedBotaForas, searchBotaFora]);

  // Metrics
  const summary = useMemo(() => {
    let totalCacambas = 0;
    let totalValor = 0;
    
    filteredLancamentos.forEach(lan => {
      totalCacambas += lan.quantidadeCacambas;
      totalValor += lan.valor;
    });

    const averageValorPerCacamba = totalCacambas > 0 ? totalValor / totalCacambas : 0;

    return {
      totalCacambas,
      totalValor,
      averageValorPerCacamba,
      totalLancamentos: filteredLancamentos.length
    };
  }, [filteredLancamentos]);

  // Format currencies and date
  const formatCurrency = (val: number) => {
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
  };

  // Export reported data to CSV
  const handleExportCSV = () => {
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "ID LANCAMENTO,BOTA FORA,QUANTIDADE CACAMBAS,VALOR TOTAL (R$),DATA,MOTORISTA,PLACAVEICULO,STATUS\r\n";
    
    filteredLancamentos.forEach(lan => {
      csvContent += `"${lan.id}","${lan.botaForaNome}",${lan.quantidadeCacambas},${lan.valor},"${formatDate(lan.data)}","${lan.driverName || 'N/A'}","${lan.vehicleId || 'N/A'}","${lan.status}"\r\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `relatorio_relampago_${startDate}_a_${endDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Safe manual browser print layout trigger
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      
      {/* Title Header with Export Callouts */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="font-sans font-bold text-lg text-slate-900 flex items-center gap-2">
            <FileText className="w-5 h-5 text-emerald-500" />
            <span>Gerador de Relatórios Consolidados Por Período</span>
          </h2>
          <p className="text-slate-400 text-xs mt-0.5">Filtre descarregamentos de caçambas, audite valores gastos e exporte planilhas oficiais de conformidade municipal.</p>
        </div>
        
        <div className="flex gap-2">
          <button 
            type="button"
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3.5 py-1.5 border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold text-xs rounded-lg transition-all cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Imprimir</span>
          </button>
          
          <button 
            type="button"
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg transition-all cursor-pointer shadow-sm shadow-emerald-600/10"
          >
            <Download className="w-4 h-4" />
            <span>Exportar Planilha (CSV)</span>
          </button>
        </div>
      </div>

      {/* Reports Filtering Console */}
      <div className="bg-slate-900 text-slate-100 p-5 rounded-xl border border-slate-800 shadow-lg grid grid-cols-1 md:grid-cols-4 gap-4">
        
        {/* Start Date */}
        <div className="space-y-1.5">
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">DATA DE INÍCIO</label>
          <div className="relative">
            <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs font-sans focus:outline-none focus:ring-1 focus:ring-emerald-500 text-white font-medium"
            />
          </div>
        </div>

        {/* End Date */}
        <div className="space-y-1.5">
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">DATA DE TÉRMINO</label>
          <div className="relative">
            <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs font-sans focus:outline-none focus:ring-1 focus:ring-emerald-500 text-white font-medium"
            />
          </div>
        </div>

        {/* Selected landfill / bota fora dropdown */}
        <div className="space-y-1.5">
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">FILTRO DA ÁREA (BOTA FORA)</label>
          <div className="relative">
            <Filter className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <select
              value={selectedBotaForaId}
              onChange={(e) => setSelectedBotaForaId(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs font-sans focus:outline-none focus:ring-1 focus:ring-emerald-500 text-white font-medium appearance-none"
            >
              <option value="ALL">Mostrar Todos Bota Foras</option>
              {botaForas.map(b => (
                <option key={b.id} value={b.id}>{b.nome}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Instante keyword query for landfills (CNPJ/Nome) */}
        <div className="space-y-1.5">
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">BUSCA TEXTUAL BOTA FORA</label>
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text"
              placeholder="Digite CNPJ, nome ou endereço..."
              value={searchBotaFora}
              onChange={(e) => setSearchBotaFora(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs font-sans focus:outline-none focus:ring-1 focus:ring-emerald-500 text-white font-medium"
            />
          </div>
        </div>

      </div>

      {/* Structured Metrics Summary Cards */}
      <section className="grid grid-cols-1 md:grid-cols-4 gap-5">
        
        {/* Metric 1 */}
        <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-sm">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">TOTAL CAÇAMBAS DESCARTADAS</span>
            <div className="p-1.5 bg-emerald-50 rounded-lg text-emerald-600">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <span className="text-3xl font-bold font-sans text-slate-900">{summary.totalCacambas}</span>
            <p className="text-[10px] text-slate-400 font-medium mt-1">Unidades descartas no período</p>
          </div>
        </div>

        {/* Metric 2 */}
        <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-sm">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">VALOR TOTAL DE TRANSFÊRENCIAS</span>
            <div className="p-1.5 bg-emerald-50 rounded-lg text-emerald-600">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <span className="text-3xl font-bold font-sans text-emerald-700">{formatCurrency(summary.totalValor)}</span>
            <p className="text-[10px] text-slate-400 font-medium mt-1">Montante total faturado ativo</p>
          </div>
        </div>

        {/* Metric 3 */}
        <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-sm">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">MÉDIA POR DISCOS / CAÇAMBA</span>
            <div className="p-1.5 bg-indigo-50 rounded-lg text-indigo-600">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <span className="text-3xl font-bold font-sans text-slate-900">{formatCurrency(summary.averageValorPerCacamba)}</span>
            <p className="text-[10px] text-slate-300 font-medium mt-1">Custo unitário ponderado</p>
          </div>
        </div>

        {/* Metric 4 */}
        <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-sm">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">QUANTIDADE DE LANÇAMENTOS</span>
            <div className="p-1.5 bg-slate-50 rounded-lg text-slate-600">
              <CheckCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <span className="text-3xl font-bold font-sans text-slate-900">{summary.totalLancamentos}</span>
            <p className="text-[10px] text-slate-400 font-medium mt-1">Lançamentos de descarte localizados</p>
          </div>
        </div>

      </section>

      {/* Main Print-Ready Report Table Block */}
      <div id="section-to-print" className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        
        {/* Printable Paper Header (visible on print only via Tailwind or clean class styling) */}
        <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
          <div>
            <h3 className="font-sans font-bold text-sm text-slate-900">Histórico de Transações de Descarte</h3>
            <p className="text-slate-400 text-xs mt-0.5">Demostrativo de {formatDate(startDate)} a {formatDate(endDate)}</p>
          </div>
          
          <div className="text-[11px] text-slate-500 font-mono text-right bg-white border border-slate-100 p-2 rounded-lg">
            <div>Filtro Bota Fora: <strong className="text-slate-750">{selectedBotaForaId === 'ALL' ? 'Todos' : botaForas.find(b => b.id === selectedBotaForaId)?.nome}</strong></div>
            {searchBotaFora && <div className="mt-0.5">Termo Pesquisa: <strong>"{searchBotaFora}"</strong></div>}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-sans font-bold text-slate-500 uppercase tracking-wider">
                <th className="px-5 py-3">CÓDIGO</th>
                <th className="px-5 py-3">BOTA FORA / DESTINO</th>
                <th className="px-5 py-3 text-center">QUANTIDADE CAÇAMBAS</th>
                <th className="px-5 py-3 text-right">VALOR UNITÁRIO / TOTAL</th>
                <th className="px-5 py-3">DATA DESCARTE</th>
                <th className="px-5 py-3">MOTORISTA / TRUCK</th>
                <th className="px-5 py-3 text-right">STATUS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
              {filteredLancamentos.map((lan) => {
                const btf = botaForas.find(b => b.id === lan.botaForaId);
                const valorCacambaStr = formatCurrency(lan.quantidadeCacambas > 0 ? lan.valor / lan.quantidadeCacambas : 0);

                return (
                  <tr key={lan.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-5 py-3.5 font-mono font-bold text-slate-900">{lan.id}</td>
                    <td className="px-5 py-3.5">
                      <div>
                        <strong className="text-slate-900 text-sm block">{lan.botaForaNome}</strong>
                        {btf && <span className="text-[10px] text-slate-400 font-medium">CNPJ: {btf.cnpj}</span>}
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-center font-bold text-sm text-slate-800">
                      {lan.quantidadeCacambas} caçambas
                    </td>
                    <td className="px-5 py-3.5 text-right font-mono">
                      <div className="font-bold text-slate-900 text-sm">{formatCurrency(lan.valor)}</div>
                      <div className="text-[10px] text-slate-400">Media: {valorCacambaStr}/un</div>
                    </td>
                    <td className="px-5 py-3.5 font-semibold text-slate-600">
                      {formatDate(lan.data)}
                    </td>
                    <td className="px-5 py-3.5 text-slate-500 font-medium">
                      <div className="flex items-center gap-1">
                        <Truck className="w-3.5 h-3.5 text-slate-400" />
                        <span>{lan.driverName || 'N/A'}</span>
                      </div>
                      <div className="text-[10px] font-mono text-slate-400 mt-0.5">{lan.vehicleId || 'Sem veículo'}</div>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <span className="bg-emerald-50 text-emerald-800 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border border-emerald-100">
                        {lan.status}
                      </span>
                    </td>
                  </tr>
                );
              })}

              {filteredLancamentos.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-400 font-medium font-sans">
                    Nenhum lançamento de descarte de caçambas localizado para os filtros selecionados no período de datas.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Summary aggregate footer for print accountability */}
        <div className="p-5 border-t border-slate-200 bg-slate-50/40 flex flex-col sm:flex-row sm:items-center sm:justify-between text-xs font-semibold text-slate-705 gap-3">
          <div>
            Total de Caçambas Registradas no Período: <strong className="text-slate-900 font-bold text-sm ml-1">{summary.totalCacambas}</strong>
          </div>
          <div>
            Soma Monetária dos Lançamentos Auditados: <strong className="text-emerald-700 font-bold text-sm ml-1">{formatCurrency(summary.totalValor)}</strong>
          </div>
        </div>

      </div>

      <div className="bg-white border border-slate-200 p-4 rounded-xl text-xs text-slate-500 flex items-start gap-2.5 leading-relaxed">
        <Info className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
        <div>
          Este relatório cumpre as diretrizes legislativas ambientais nacionais de auditoria de <strong>Bota Foras e Gerenciadores de Resíduos de Construção Civil (RCC)</strong>. Os relatórios gerados por períodos são rastreados individualmente por suas assinaturas fiscais e auditores do sistema Relâmpago Caçambas.
        </div>
      </div>

    </div>
  );
}
