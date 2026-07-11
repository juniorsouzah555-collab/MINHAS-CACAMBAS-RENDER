/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { 
  Users, 
  Calendar, 
  Plus, 
  Trash2, 
  Search, 
  Box, 
  CheckCircle,
  Truck,
  Filter,
  RotateCcw,
  AlertCircle,
  Pencil
} from 'lucide-react';
import { ComissaoMotorista } from '../types';

interface CommissionsViewProps {
  comissoes: ComissaoMotorista[];
  motoristas: string[];
  onAddComissao: (newCom: Omit<ComissaoMotorista, 'id' | 'createdAt'>) => void;
  onUpdateComissao?: (updatedCom: ComissaoMotorista) => void;
  onDeleteComissao: (id: string) => void;
}

export default function CommissionsView({
  comissoes,
  motoristas = [],
  onAddComissao,
  onUpdateComissao,
  onDeleteComissao
}: CommissionsViewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [motoristaInput, setMotoristaInput] = useState('');
  const [vaziasInput, setVaziasInput] = useState(0);
  const [retiradasInput, setRetiradasInput] = useState(0);
  const [dataInput, setDataInput] = useState(() => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  });

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Advanced Filters State
  const [filterMotorista, setFilterMotorista] = useState<string>('ALL');
  const [filterStartDate, setFilterStartDate] = useState<string>('');
  const [filterEndDate, setFilterEndDate] = useState<string>('');

  // Extract unique drivers present in comissoes and registered motoristas to populate dropdown
  const listDrivers = useMemo(() => {
    const setOfDrivers = new Set<string>();
    // Add configured ones from state
    motoristas.forEach(d => setOfDrivers.add(d));
    // Add any driver registered in current commissions
    comissoes.forEach(c => setOfDrivers.add(c.motorista));
    return Array.from(setOfDrivers).sort();
  }, [comissoes, motoristas]);

  // Check if date-based filters are active
  const isDateFilterActive = useMemo(() => {
    return !!(filterStartDate || filterEndDate);
  }, [filterStartDate, filterEndDate]);

  // Filter commissions based on all selectors
  const filteredComissoes = useMemo(() => {
    return comissoes.filter(c => {
      // 1. Motorista specific filter
      if (filterMotorista !== 'ALL' && c.motorista !== filterMotorista) {
        return false;
      }

      // 2. Date filters check (Period Range)
      if (filterStartDate && c.data < filterStartDate) {
        return false;
      }
      if (filterEndDate && c.data > filterEndDate) {
        return false;
      }

      // 3. General text search bar
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matchesName = c.motorista.toLowerCase().includes(query);
        const matchesDate = c.data.includes(query);
        const matchesId = c.id.toLowerCase().includes(query);
        if (!matchesName && !matchesDate && !matchesId) {
          return false;
        }
      }

      return true;
    });
  }, [comissoes, filterMotorista, filterStartDate, filterEndDate, searchTerm]);

  // Aggregate stats dynamically based on filtered results for perfect verification!
  const totals = useMemo(() => {
    let totVazias = 0;
    let totRetiradas = 0;
    
    filteredComissoes.forEach(c => {
      totVazias += c.vaziasColocadas;
      totRetiradas += c.retiradas;
    });

    return {
      totalVazias: totVazias,
      totalRetiradas: totRetiradas,
      totalLancados: filteredComissoes.length,
      saldoGeral: totVazias + totRetiradas
    };
  }, [filteredComissoes]);

  // Handle resetting of filters
  const handleResetFilters = () => {
    setFilterMotorista('ALL');
    setFilterStartDate('');
    setFilterEndDate('');
    setSearchTerm('');
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!motoristaInput.trim()) return;

    if (editingId) {
      onUpdateComissao?.({
        id: editingId,
        motorista: motoristaInput.trim(),
        vaziasColocadas: Number(vaziasInput) || 0,
        retiradas: Number(retiradasInput) || 0,
        data: dataInput,
        createdAt: comissoes.find(c => c.id === editingId)?.createdAt || new Date().toISOString()
      });
      setEditingId(null);
    } else {
      onAddComissao({
        motorista: motoristaInput.trim(),
        vaziasColocadas: Number(vaziasInput) || 0,
        retiradas: Number(retiradasInput) || 0,
        data: dataInput
      });
    }

    // Reset form
    setMotoristaInput('');
    setVaziasInput(0);
    setRetiradasInput(0);
    setIsFormOpen(false);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Title Header with action button */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <h2 className="font-sans font-black text-slate-900 text-xl tracking-tight leading-none">Comissões de Motoristas</h2>
          <p className="text-xs text-slate-500 mt-1.5 font-bold uppercase tracking-wider text-purple-650">Controle de caçambas vazias colocadas e caçambas retiradas</p>
        </div>
        
        <button
          onClick={() => setIsFormOpen(!isFormOpen)}
          className="bg-purple-600 hover:bg-purple-500 text-white font-bold py-2.5 px-4 rounded-lg flex items-center justify-center gap-2 shadow-lg shadow-purple-600/20 cursor-pointer transition-all duration-150 self-start md:self-auto text-xs font-sans uppercase tracking-wider"
        >
          <Plus className="w-4 h-4 text-white stroke-[2.5]" />
          <span>{isFormOpen ? 'Fechar Lançador' : 'Lançar Atividade'}</span>
        </button>
      </div>

      {/* KPI Stats Panel */}
      <section className="grid grid-cols-1 md:grid-cols-4 gap-5">
        <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-xs">
          <div className="flex justify-between items-center text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider font-sans">Total de Lançamentos</span>
            <CheckCircle className="w-4 h-4 text-purple-600" />
          </div>
          <p className="text-2xl font-black font-sans text-slate-900 mt-2">{totals.totalLancados}</p>
          <span className="text-[10px] text-slate-400 font-medium">Registrado de atividades</span>
        </div>

        <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-xs">
          <div className="flex justify-between items-center text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Vazias Colocadas</span>
            <Box className="w-4 h-4 text-blue-500" />
          </div>
          <p className="text-2xl font-black font-sans text-slate-900 mt-2">{totals.totalVazias}</p>
          <span className="text-[10px] text-slate-400 font-medium font-sans">Contêineres implantados em campo</span>
        </div>

        <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-xs">
          <div className="flex justify-between items-center text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Retiradas Termos</span>
            <Box className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-black font-sans text-slate-900 mt-2">{totals.totalRetiradas}</p>
          <span className="text-[10px] text-slate-400 font-medium">Caçambas colhidas cheias</span>
        </div>

        <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-xs">
          <div className="flex justify-between items-center text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Saldo Total Acumulado</span>
            <Truck className="w-4 h-4 text-purple-600" />
          </div>
          <p className="text-2xl font-black font-sans text-purple-750 mt-2">{totals.saldoGeral} un</p>
          <span className="text-[10px] text-slate-400 font-medium">Soma de movimentações geral</span>
        </div>
      </section>

      {/* Interactive Filters Panel for Verification */}
      <section className="bg-slate-50 border border-slate-200 p-4 rounded-xl shadow-xs space-y-3.5">
        <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-purple-600" />
            <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider font-sans">
              Painel de Consulta por Período e Motorista
            </h3>
          </div>
          {(filterMotorista !== 'ALL' || filterStartDate || filterEndDate || searchTerm) && (
            <button
              onClick={handleResetFilters}
              className="text-[10px] font-extrabold text-purple-600 hover:text-purple-700 flex items-center gap-1 hover:underline transition-all cursor-pointer bg-transparent border-0"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Limpar Filtros</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Driver Selector */}
          <div>
            <label className="block text-[10px] font-extrabold text-slate-500 mb-1 uppercase tracking-wider">
              Motorista Selecionado
            </label>
            <select
              value={filterMotorista}
              onChange={(e) => setFilterMotorista(e.target.value)}
              className="w-full bg-white border border-slate-250 py-1.5 px-3 rounded-lg text-xs font-bold text-slate-800 focus:outline-hidden focus:border-purple-500 font-sans cursor-pointer h-[34px]"
            >
              <option value="ALL">🟢 Todos os Motoristas (Geral)</option>
              {listDrivers.map((driver) => (
                <option key={driver} value={driver}>
                  👤 {driver}
                </option>
              ))}
            </select>
          </div>

          {/* Start Date */}
          <div>
            <label className="block text-[10px] font-extrabold text-slate-500 mb-1 uppercase tracking-wider">
              Data Inicial (Período)
            </label>
            <input
              type="date"
              value={filterStartDate}
              onChange={(e) => setFilterStartDate(e.target.value)}
              className="w-full bg-white border border-slate-250 py-1 px-3 rounded-lg text-xs font-bold text-slate-800 focus:outline-hidden focus:border-purple-500 font-sans h-[34px]"
            />
          </div>

          {/* End Date */}
          <div>
            <label className="block text-[10px] font-extrabold text-slate-500 mb-1 uppercase tracking-wider">
              Data Final (Período)
            </label>
            <input
              type="date"
              value={filterEndDate}
              onChange={(e) => setFilterEndDate(e.target.value)}
              className="w-full bg-white border border-slate-250 py-1 px-3 rounded-lg text-xs font-bold text-slate-800 focus:outline-hidden focus:border-purple-500 font-sans h-[34px]"
            />
          </div>

          {/* Text Search Secondary */}
          <div>
            <label className="block text-[10px] font-extrabold text-slate-500 mb-1 uppercase tracking-wider">
              Buscar Código ou Texto
            </label>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Ex: COM-001..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-white pl-8 pr-3 py-1.5 border border-slate-250 rounded-lg text-xs font-bold text-slate-800 focus:outline-hidden focus:border-purple-500 font-sans h-[34px]"
              />
            </div>
          </div>
        </div>

        {/* Dynamic Warning Alert */}
        {isDateFilterActive && filterMotorista === 'ALL' && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-2.5 flex items-start gap-2 text-amber-850 text-xs font-bold animate-pulse">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <span>Pesquisa por datas ativa!</span> Como solicitado, selecione um motorista específico no filtro para visualizar os lançamentos do período no histórico.
            </div>
          </div>
        )}
      </section>

      {/* Main Panel layout for Form and list */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Adicionar Form - shown either as full card on LG, or toggleable */}
        {isFormOpen && (
          <div className="lg:col-span-1 animate-in slide-in-from-left duration-200">
            <div className="bg-white border border-slate-200 rounded-xl shadow-xs p-5 space-y-4">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="font-sans font-extrabold text-slate-900 text-sm">
                  {editingId ? 'Editar Atividade de Motorista' : 'Registrar Atividade de Motorista'}
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {editingId ? 'Modifique os dados do lançamento selecionado' : 'Informe os contêineres e data para comissão'}
                </p>
              </div>

              <form onSubmit={handleFormSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-black text-slate-500 mb-1.5 uppercase font-sans tracking-wider">Motorista</label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      value={motoristaInput}
                      onChange={(e) => setMotoristaInput(e.target.value)}
                      placeholder="Selecione ou digite o nome..."
                      className="w-full pl-3 pr-3 py-2 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-purple-500 font-sans"
                      list="drivers-list"
                    />
                    <datalist id="drivers-list">
                      {listDrivers.map((drv, i) => (
                        <option key={i} value={drv} />
                      ))}
                    </datalist>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-black text-slate-500 mb-1.5 uppercase font-sans tracking-wider text-blue-650">Vazias Colocadas</label>
                    <input
                      type="number"
                      min="0"
                      required
                      value={vaziasInput}
                      onChange={(e) => setVaziasInput(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono font-bold text-slate-800 focus:outline-hidden focus:border-purple-400"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-black text-slate-500 mb-1.5 uppercase font-sans tracking-wider text-emerald-650">Retiradas</label>
                    <input
                      type="number"
                      min="0"
                      required
                      value={retiradasInput}
                      onChange={(e) => setRetiradasInput(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono font-bold text-slate-800 focus:outline-hidden focus:border-purple-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-500 mb-1.5 uppercase font-sans tracking-wider">Data do Serviço</label>
                  <div className="relative">
                    <input
                      type="date"
                      required
                      value={dataInput}
                      onChange={(e) => setDataInput(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:outline-hidden focus:border-purple-500 font-sans"
                    />
                  </div>
                </div>

                <div className="flex gap-2">
                  {editingId && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingId(null);
                        setMotoristaInput('');
                        setVaziasInput(0);
                        setRetiradasInput(0);
                        setIsFormOpen(false);
                      }}
                      className="w-1/2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold py-2.5 rounded-lg text-xs uppercase tracking-wider transition-all cursor-pointer"
                    >
                      Cancelar
                    </button>
                  )}
                  <button
                    type="submit"
                    className={`bg-purple-600 hover:bg-purple-700 text-white font-extrabold py-2.5 rounded-lg text-xs uppercase tracking-wider transition-all cursor-pointer shadow-md hover:-translate-y-0.5 ${editingId ? 'w-1/2' : 'w-full'}`}
                  >
                    {editingId ? 'Salvar Alterações' : 'Gravar Lançamento'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* List of Entries and filter bar */}
        <div className={`space-y-4 transition-all duration-300 ${isFormOpen ? 'lg:col-span-2' : 'lg:col-span-3'}`}>
          <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
            {/* Search filter bar */}
            <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-3">
              <span className="text-[11px] font-black tracking-widest text-slate-400 uppercase">
                Histórico de Lançamentos de Comissões
              </span>
              {filterMotorista !== 'ALL' && (
                <span className="text-[10px] font-black tracking-wide text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md uppercase font-sans">
                  Filtro: {filterMotorista}
                </span>
              )}
            </div>

            {/* List Table or Select Motorista Trigger */}
            {filteredComissoes.length === 0 ? (
              <div className="p-12 text-center space-y-2">
                <Users className="w-10 h-10 text-slate-300 mx-auto" />
                <h4 className="text-xs font-bold text-slate-600 uppercase">Nenhum lançamento encontrado</h4>
                <p className="text-[10px] text-slate-400">Cadastre ou ajuste os filtros para ver as comissões registradas.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[500px]">
                  <thead>
                    <tr className="border-b border-slate-150 bg-slate-50/20 text-slate-400">
                      <th className="px-5 py-3 text-left text-[10px] font-black uppercase tracking-wider">Motorista</th>
                      <th className="px-5 py-3 text-center text-[10px] font-black uppercase tracking-wider">Vazias Colocadas</th>
                      <th className="px-5 py-3 text-center text-[10px] font-black uppercase tracking-wider">Retiradas</th>
                      <th className="px-5 py-3 text-center text-[10px] font-black uppercase tracking-wider">Data</th>
                      <th className="px-5 py-3 text-right text-[10px] font-black uppercase tracking-wider">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredComissoes.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/50 transition-all font-sans">
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-purple-50 text-purple-700 flex items-center justify-center font-bold text-xs">
                              {item.motorista.charAt(0)}
                            </div>
                            <div>
                              <span className="text-xs font-bold text-slate-900 block">{item.motorista}</span>
                              <span className="text-[8px] font-mono text-slate-400 uppercase tracking-widest">{item.id}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3.5 text-center">
                          <span className="inline-block px-3.5 py-1.5 bg-blue-50 text-blue-800 font-mono text-base md:text-lg lg:text-xl font-black rounded-lg border border-blue-100 shadow-2xs">
                            {item.vaziasColocadas}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-center">
                          <span className="inline-block px-3.5 py-1.5 bg-emerald-50 text-emerald-800 font-mono text-base md:text-lg lg:text-xl font-black rounded-lg border border-emerald-100 shadow-2xs">
                            {item.retiradas}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-center">
                          <div className="flex items-center justify-center gap-1.5 text-slate-600 font-bold text-xs">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            <span>{formatDate(item.data)}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => {
                                setEditingId(item.id);
                                setMotoristaInput(item.motorista);
                                setVaziasInput(item.vaziasColocadas);
                                setRetiradasInput(item.retiradas);
                                setDataInput(item.data);
                                setIsFormOpen(true);
                              }}
                              className="text-slate-400 hover:text-purple-650 p-1.5 rounded-md hover:bg-purple-50 transition-all cursor-pointer bg-transparent border-0"
                              title="Editar Registro"
                              type="button"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => onDeleteComissao(item.id)}
                              className="text-slate-400 hover:text-rose-600 p-1.5 rounded-md hover:bg-rose-50 transition-all cursor-pointer bg-transparent border-0"
                              title="Remover Registro"
                              type="button"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>



    </div>
  );
}
