import React, { useState, useMemo } from 'react';
import {
  Wrench,
  Plus,
  Trash2,
  Search,
  Calendar,
  Truck,
  ClipboardList,
  CheckCircle,
  Clock,
  AlertCircle,
  Edit3,
  X,
  BarChart3,
  Coins,
  Filter,
  RotateCcw,
  Building,
  Hammer
} from 'lucide-react';
import { Manutencao, Vehicle } from '../types';

interface ManutencaoViewProps {
  manutencoes: Manutencao[];
  vehicles: Vehicle[];
  onAddManutencao: (manutencao: Omit<Manutencao, 'id' | 'createdAt'>) => void;
  onUpdateManutencao: (manutencao: Manutencao) => void;
  onDeleteManutencao: (id: string) => void;
}

const TIPOS = ['Preventiva', 'Corretiva', 'Elétrica', 'Mecânica', 'Pneus', 'Óleo', 'Outro'] as const;

export default function ManutencaoView({
  manutencoes,
  vehicles,
  onAddManutencao,
  onUpdateManutencao,
  onDeleteManutencao
}: ManutencaoViewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [vehicleFilter, setVehicleFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'Pendente' | 'Em Andamento' | 'Concluído'>('ALL');
  const [localFilter, setLocalFilter] = useState<'ALL' | 'Garagem' | 'Oficina'>('ALL');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');

  const [formVehicleId, setFormVehicleId] = useState('');
  const [formTipo, setFormTipo] = useState<Manutencao['tipo']>('Preventiva');
  const [formDescricao, setFormDescricao] = useState('');
  const [formData, setFormData] = useState(new Date().toISOString().split('T')[0]);
  const [formKmAtual, setFormKmAtual] = useState('');
  const [formProximoKm, setFormProximoKm] = useState('');
  const [formMaoDeObra, setFormMaoDeObra] = useState(0);
  const [formPeca, setFormPeca] = useState(0);
  const [formLocal, setFormLocal] = useState<'Garagem' | 'Oficina'>('Oficina');
  const [formOficina, setFormOficina] = useState('');
  const [formObservacao, setFormObservacao] = useState('');
  const [formStatus, setFormStatus] = useState<Manutencao['status']>('Pendente');

  const filtered = manutencoes.filter(m => {
    const matchSearch = !searchTerm ||
      (m.vehicleId ?? '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (m.descricao ?? '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (m.oficina ?? '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchVehicle = vehicleFilter === 'ALL' || m.vehicleId === vehicleFilter;
    const matchStatus = statusFilter === 'ALL' || m.status === statusFilter;
    const matchLocal = localFilter === 'ALL' || m.local === localFilter;
    const matchStart = !filterStartDate || m.data >= filterStartDate;
    const matchEnd = !filterEndDate || m.data <= filterEndDate;
    return matchSearch && matchVehicle && matchStatus && matchLocal && matchStart && matchEnd;
  });

  const rankingPorTipo = useMemo(() => {
    const groups: { [key: string]: { tipo: string; quantidade: number; custoTotal: number; maoDeObra: number; peca: number; concluidos: number } } = {};
    filtered.forEach(m => {
      const tipo = m.tipo || 'Outro';
      if (!groups[tipo]) groups[tipo] = { tipo, quantidade: 0, custoTotal: 0, maoDeObra: 0, peca: 0, concluidos: 0 };
      groups[tipo].quantidade += 1;
      groups[tipo].custoTotal += m.custo || 0;
      groups[tipo].maoDeObra += m.valorMaoDeObra || 0;
      groups[tipo].peca += m.valorPeca || 0;
      if (m.status === 'Concluído') groups[tipo].concluidos += 1;
    });
    return Object.values(groups).sort((a, b) => b.custoTotal - a.custoTotal);
  }, [filtered]);

  const rankingPorVeiculo = useMemo(() => {
    const groups: { [key: string]: { vehicleId: string; quantidade: number; custoTotal: number; maoDeObra: number; peca: number } } = {};
    filtered.forEach(m => {
      const vid = m.vehicleId || 'Não informado';
      if (!groups[vid]) groups[vid] = { vehicleId: vid, quantidade: 0, custoTotal: 0, maoDeObra: 0, peca: 0 };
      groups[vid].quantidade += 1;
      groups[vid].custoTotal += m.custo || 0;
      groups[vid].maoDeObra += m.valorMaoDeObra || 0;
      groups[vid].peca += m.valorPeca || 0;
    });
    return Object.values(groups).sort((a, b) => b.custoTotal - a.custoTotal);
  }, [filtered]);

  const totais = useMemo(() => {
    const garagem = filtered.filter(m => m.local === 'Garagem');
    const oficina = filtered.filter(m => m.local === 'Oficina');
    return {
      totalRegistros: filtered.length,
      custoTotal: filtered.reduce((acc, m) => acc + (m.custo || 0), 0),
      maoDeObraTotal: filtered.reduce((acc, m) => acc + (m.valorMaoDeObra || 0), 0),
      pecaTotal: filtered.reduce((acc, m) => acc + (m.valorPeca || 0), 0),
      concluidos: filtered.filter(m => m.status === 'Concluído').length,
      pendentes: filtered.filter(m => m.status === 'Pendente').length,
      custoGaragem: garagem.reduce((acc, m) => acc + (m.custo || 0), 0),
      maoDeObraGaragem: garagem.reduce((acc, m) => acc + (m.valorMaoDeObra || 0), 0),
      pecaGaragem: garagem.reduce((acc, m) => acc + (m.valorPeca || 0), 0),
      qtdGaragem: garagem.length,
      custoOficina: oficina.reduce((acc, m) => acc + (m.custo || 0), 0),
      maoDeObraOficina: oficina.reduce((acc, m) => acc + (m.valorMaoDeObra || 0), 0),
      pecaOficina: oficina.reduce((acc, m) => acc + (m.valorPeca || 0), 0),
      qtdOficina: oficina.length
    };
  }, [filtered]);

  const resetForm = () => {
    setEditId(null);
    setFormVehicleId('');
    setFormTipo('Preventiva');
    setFormDescricao('');
    setFormData(new Date().toISOString().split('T')[0]);
    setFormKmAtual('');
    setFormProximoKm('');
    setFormMaoDeObra(0);
    setFormPeca(0);
    setFormLocal('Oficina');
    setFormOficina('');
    setFormObservacao('');
    setFormStatus('Pendente');
    setShowForm(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formVehicleId || !formDescricao || !formOficina) return;
    const custoTotal = (formMaoDeObra || 0) + (formPeca || 0);
    if (custoTotal <= 0) return;

    if (editId) {
      onUpdateManutencao({
        id: editId,
        vehicleId: formVehicleId,
        tipo: formTipo,
        descricao: formDescricao,
        data: formData,
        kmAtual: formKmAtual ? Number(formKmAtual) : undefined,
        proximoKm: formProximoKm ? Number(formProximoKm) : undefined,
        custo: custoTotal,
        valorMaoDeObra: formMaoDeObra || 0,
        valorPeca: formPeca || 0,
        local: formLocal,
        oficina: formOficina,
        observacao: formObservacao || undefined,
        status: formStatus,
        createdAt: manutencoes.find(m => m.id === editId)?.createdAt || new Date().toISOString()
      });
    } else {
      onAddManutencao({
        vehicleId: formVehicleId,
        tipo: formTipo,
        descricao: formDescricao,
        data: formData,
        kmAtual: formKmAtual ? Number(formKmAtual) : undefined,
        proximoKm: formProximoKm ? Number(formProximoKm) : undefined,
        custo: custoTotal,
        valorMaoDeObra: formMaoDeObra || 0,
        valorPeca: formPeca || 0,
        local: formLocal,
        oficina: formOficina,
        observacao: formObservacao || undefined,
        status: formStatus
      });
    }
    resetForm();
  };

  const startEdit = (m: Manutencao) => {
    setEditId(m.id);
    setFormVehicleId(m.vehicleId);
    setFormTipo(m.tipo);
    setFormDescricao(m.descricao);
    setFormData(m.data);
    setFormKmAtual(m.kmAtual?.toString() || '');
    setFormProximoKm(m.proximoKm?.toString() || '');
    setFormMaoDeObra(m.valorMaoDeObra || 0);
    setFormPeca(m.valorPeca || 0);
    setFormLocal(m.local || 'Oficina');
    setFormOficina(m.oficina);
    setFormObservacao(m.observacao || '');
    setFormStatus(m.status);
    setShowForm(true);
  };

  const statusIcon = (s: Manutencao['status']) => {
    switch (s) {
      case 'Concluído': return <CheckCircle className="w-4 h-4 text-emerald-500" />;
      case 'Em Andamento': return <Clock className="w-4 h-4 text-amber-500" />;
      case 'Pendente': return <AlertCircle className="w-4 h-4 text-rose-500" />;
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    return dateStr;
  };

  const hasDateFilter = filterStartDate || filterEndDate;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
            <Wrench className="w-5 h-5 text-purple-600" />
            Manutenções dos Caminhões
          </h2>
          <p className="text-xs text-slate-400 font-medium">Registro de manutenções — Garagem própria e Oficinas externas</p>
        </div>
        <button
          type="button"
          onClick={() => { resetForm(); setShowForm(!showForm); }}
          className="bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs py-2 px-4 rounded-lg flex items-center gap-1.5 cursor-pointer transition-colors"
        >
          {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {showForm ? 'Fechar' : 'Nova Manutenção'}
        </button>
      </div>

      {/* Painel de Ranking e Gastos */}
      {manutencoes.length > 0 && (
        <div className="space-y-5">
          {/* KPI Cards */}
          <section className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-xs">
              <div className="flex justify-between items-center text-slate-400">
                <span className="text-[10px] font-bold uppercase tracking-wider">Total Registros</span>
                <ClipboardList className="w-4 h-4 text-purple-600" />
              </div>
              <p className="text-2xl font-black font-sans text-slate-900 mt-1">{totais.totalRegistros}</p>
              <span className="text-[10px] text-slate-400">Manutenções registradas</span>
            </div>
            <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-xs">
              <div className="flex justify-between items-center text-slate-400">
                <span className="text-[10px] font-bold uppercase tracking-wider">Custo Total</span>
                <Coins className="w-4 h-4 text-emerald-500" />
              </div>
              <p className="text-2xl font-black font-sans text-emerald-700 mt-1">R$ {totais.custoTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
              <span className="text-[10px] text-slate-400">Mão de obra + Peças</span>
            </div>
            <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-xs">
              <div className="flex justify-between items-center text-slate-400">
                <span className="text-[10px] font-bold uppercase tracking-wider">Mão de Obra</span>
                <Hammer className="w-4 h-4 text-blue-500" />
              </div>
              <p className="text-2xl font-black font-sans text-blue-700 mt-1">R$ {totais.maoDeObraTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
              <span className="text-[10px] text-slate-400">Servicos e mão-de-obra</span>
            </div>
            <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-xs">
              <div className="flex justify-between items-center text-slate-400">
                <span className="text-[10px] font-bold uppercase tracking-wider">Peças</span>
                <Wrench className="w-4 h-4 text-amber-500" />
              </div>
              <p className="text-2xl font-black font-sans text-amber-700 mt-1">R$ {totais.pecaTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
              <span className="text-[10px] text-slate-400">Peças e componentes</span>
            </div>
            <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-xs">
              <div className="flex justify-between items-center text-slate-400">
                <span className="text-[10px] font-bold uppercase tracking-wider">Pendentes</span>
                <AlertCircle className="w-4 h-4 text-rose-500" />
              </div>
              <p className="text-2xl font-black font-sans text-rose-600 mt-1">{totais.pendentes}</p>
              <span className="text-[10px] text-slate-400">Aguardando execução</span>
            </div>
          </section>

          {/* KPI Garagem vs Oficina */}
          <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 p-5 rounded-xl shadow-xs">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Hammer className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600">Garagem Própria</span>
                  <p className="text-xl font-black text-blue-900 font-mono">R$ {totais.custoGaragem.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                </div>
              </div>
              <div className="flex gap-3 mt-2">
                <span className="text-[10px] font-bold text-blue-500">Mão de obra: R$ {totais.maoDeObraGaragem.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                <span className="text-[10px] font-bold text-blue-500">Peças: R$ {totais.pecaGaragem.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </div>
              <span className="text-[10px] text-blue-500 font-bold mt-1 block">{totais.qtdGaragem} serviço(s) realizado(s) internamente</span>
            </div>
            <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 p-5 rounded-xl shadow-xs">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center">
                  <Building className="w-4 h-4 text-amber-600" />
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600">Oficina de Terceiro</span>
                  <p className="text-xl font-black text-amber-900 font-mono">R$ {totais.custoOficina.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                </div>
              </div>
              <div className="flex gap-3 mt-2">
                <span className="text-[10px] font-bold text-amber-500">Mão de obra: R$ {totais.maoDeObraOficina.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                <span className="text-[10px] font-bold text-amber-500">Peças: R$ {totais.pecaOficina.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </div>
              <span className="text-[10px] text-amber-500 font-bold mt-1 block">{totais.qtdOficina} serviço(s) terceirizado(s)</span>
            </div>
          </section>

          {/* Rankings */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Ranking por Tipo */}
            <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
              <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-purple-600" />
                <span className="text-[11px] font-black tracking-widest text-slate-500 uppercase">Ranking por Tipo</span>
              </div>
              <div className="p-4 space-y-3">
                {rankingPorTipo.map((item, index) => {
                  const maxCusto = Math.max(...rankingPorTipo.map(r => r.custoTotal), 1);
                  const pct = Math.round((item.custoTotal / maxCusto) * 100);
                  let rankBadge = "bg-slate-100 text-slate-600";
                  if (index === 0) rankBadge = "bg-amber-100 text-amber-800 border border-amber-200 font-black";
                  else if (index === 1) rankBadge = "bg-slate-200 text-slate-800 border border-slate-300 font-black";
                  else if (index === 2) rankBadge = "bg-orange-100 text-orange-850 border border-orange-200 font-black";

                  return (
                    <div key={item.tipo} className="flex items-center gap-3">
                      <span className={`inline-flex items-center justify-center w-6 h-6 rounded-lg text-xs font-bold shrink-0 ${rankBadge}`}>
                        #{index + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-extrabold text-slate-800">{item.tipo}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold text-slate-400">{item.quantidade}x</span>
                            <span className="text-xs font-black font-mono text-emerald-700">R$ {item.custoTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                          </div>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200/45">
                          <div className="bg-purple-600 h-full rounded-full transition-all duration-500" style={{ width: `${pct}%` }}></div>
                        </div>
                        <span className="text-[9px] text-slate-400 font-bold">{item.concluidos} concluído(s)</span>
                        <div className="flex gap-3 mt-1">
                          <span className="text-[9px] font-bold text-blue-500">Mão de obra: R$ {item.maoDeObra.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                          <span className="text-[9px] font-bold text-amber-600">Peças: R$ {item.peca.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {rankingPorTipo.length === 0 && (
                  <p className="text-xs text-slate-400 text-center py-4">Nenhum registro encontrado</p>
                )}
              </div>
            </div>

            {/* Ranking por Veículo */}
            <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
              <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
                <Truck className="w-4 h-4 text-indigo-600" />
                <span className="text-[11px] font-black tracking-widest text-slate-500 uppercase">Ranking por Veículo</span>
              </div>
              <div className="p-4 space-y-3">
                {rankingPorVeiculo.map((item, index) => {
                  const maxCusto = Math.max(...rankingPorVeiculo.map(r => r.custoTotal), 1);
                  const pct = Math.round((item.custoTotal / maxCusto) * 100);
                  let rankBadge = "bg-slate-100 text-slate-600";
                  if (index === 0) rankBadge = "bg-amber-100 text-amber-800 border border-amber-200 font-black";
                  else if (index === 1) rankBadge = "bg-slate-200 text-slate-800 border border-slate-300 font-black";
                  else if (index === 2) rankBadge = "bg-orange-100 text-orange-850 border border-orange-200 font-black";

                  return (
                    <div key={item.vehicleId} className="flex items-center gap-3">
                      <span className={`inline-flex items-center justify-center w-6 h-6 rounded-lg text-xs font-bold shrink-0 ${rankBadge}`}>
                        #{index + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-extrabold text-slate-800">{item.vehicleId}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold text-slate-400">{item.quantidade}x</span>
                            <span className="text-xs font-black font-mono text-emerald-700">R$ {item.custoTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                          </div>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200/45">
                          <div className="bg-indigo-600 h-full rounded-full transition-all duration-500" style={{ width: `${pct}%` }}></div>
                        </div>
                        <div className="flex gap-3 mt-1">
                          <span className="text-[9px] font-bold text-blue-500">Mão de obra: R$ {item.maoDeObra.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                          <span className="text-[9px] font-bold text-amber-600">Peças: R$ {item.peca.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {rankingPorVeiculo.length === 0 && (
                  <p className="text-xs text-slate-400 text-center py-4">Nenhum registro encontrado</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
          <h3 className="font-bold text-sm text-slate-900">{editId ? 'Editar' : 'Nova'} Manutenção</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase">Caminhão (Placa)</label>
              <select
                value={formVehicleId}
                onChange={e => setFormVehicleId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 p-2 rounded text-xs font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-purple-500"
                required
              >
                <option value="">Selecione um veículo</option>
                {vehicles.filter(v => v.type !== 'Veículo').map(v => (
                  <option key={v.id} value={v.id}>{v.id} - {v.driver}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase">Local</label>
              <select
                value={formLocal}
                onChange={e => setFormLocal(e.target.value as 'Garagem' | 'Oficina')}
                className="w-full bg-slate-50 border border-slate-200 p-2 rounded text-xs font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-purple-500"
              >
                <option value="Garagem">🏠 Garagem Própria</option>
                <option value="Oficina">🏭 Oficina de Terceiro</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase">Tipo</label>
              <select
                value={formTipo}
                onChange={e => setFormTipo(e.target.value as Manutencao['tipo'])}
                className="w-full bg-slate-50 border border-slate-200 p-2 rounded text-xs font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-purple-500"
              >
                {TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase">Data</label>
              <input
                type="date"
                value={formData}
                onChange={e => setFormData(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 p-2 rounded text-xs font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-purple-500"
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase">Descrição</label>
              <input
                type="text"
                value={formDescricao}
                onChange={e => setFormDescricao(e.target.value)}
                placeholder="Ex: Troca de óleo e filtros"
                className="w-full bg-slate-50 border border-slate-200 p-2 rounded text-xs font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-purple-500"
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase">KM Atual</label>
              <input
                type="number"
                value={formKmAtual}
                onChange={e => setFormKmAtual(e.target.value)}
                placeholder="Ex: 85000"
                className="w-full bg-slate-50 border border-slate-200 p-2 rounded text-xs font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-purple-500"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase">Próximo KM</label>
              <input
                type="number"
                value={formProximoKm}
                onChange={e => setFormProximoKm(e.target.value)}
                placeholder="Ex: 95000"
                className="w-full bg-slate-50 border border-slate-200 p-2 rounded text-xs font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-purple-500"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase">Mão de Obra (R$)</label>
              <input
                type="number"
                step="0.01"
                value={formMaoDeObra}
                onChange={e => setFormMaoDeObra(parseFloat(e.target.value) || 0)}
                placeholder="Ex: 250.00"
                className="w-full bg-slate-50 border border-slate-200 p-2 rounded text-xs font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-purple-500"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase">Peça (R$)</label>
              <input
                type="number"
                step="0.01"
                value={formPeca}
                onChange={e => setFormPeca(parseFloat(e.target.value) || 0)}
                placeholder="Ex: 200.00"
                className="w-full bg-slate-50 border border-slate-200 p-2 rounded text-xs font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-purple-500"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase">Total (R$)</label>
              <div className="w-full bg-slate-100 border border-slate-200 p-2 rounded text-xs font-black text-emerald-700 font-mono">
                R$ {((formMaoDeObra || 0) + (formPeca || 0)).toFixed(2)}
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase">{formLocal === 'Garagem' ? 'Responsável / Setor' : 'Nome da Oficina'}</label>
              <input
                type="text"
                value={formOficina}
                onChange={e => setFormOficina(e.target.value)}
                placeholder={formLocal === 'Garagem' ? 'Ex: Mecânico da equipe' : 'Nome da oficina'}
                className="w-full bg-slate-50 border border-slate-200 p-2 rounded text-xs font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-purple-500"
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase">Status</label>
              <select
                value={formStatus}
                onChange={e => setFormStatus(e.target.value as Manutencao['status'])}
                className="w-full bg-slate-50 border border-slate-200 p-2 rounded text-xs font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-purple-500"
              >
                <option value="Pendente">Pendente</option>
                <option value="Em Andamento">Em Andamento</option>
                <option value="Concluído">Concluído</option>
              </select>
            </div>
            <div className="space-y-1 md:col-span-2 lg:col-span-3">
              <label className="text-[10px] font-bold text-slate-400 uppercase">Observação</label>
              <textarea
                value={formObservacao}
                onChange={e => setFormObservacao(e.target.value)}
                placeholder="Observações adicionais..."
                rows={2}
                className="w-full bg-slate-50 border border-slate-200 p-2 rounded text-xs font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-purple-500"
              />
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              className="bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs py-2 px-6 rounded-lg cursor-pointer transition-colors"
            >
              {editId ? 'Atualizar' : 'Registrar'} Manutenção
            </button>
            <button
              type="button"
              onClick={resetForm}
              className="bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs py-2 px-4 rounded-lg cursor-pointer transition-colors"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      {/* Lista com filtros */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col gap-3 pb-3 border-b border-slate-100">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-purple-600" />
              <span className="text-[11px] font-black tracking-widest text-slate-500 uppercase">Filtros</span>
              {(localFilter !== 'ALL' || hasDateFilter || statusFilter !== 'ALL' || searchTerm || vehicleFilter !== 'ALL') && (
                <button
                  type="button"
                  onClick={() => { setLocalFilter('ALL'); setFilterStartDate(''); setFilterEndDate(''); setStatusFilter('ALL'); setSearchTerm(''); setVehicleFilter('ALL'); }}
                  className="text-[10px] font-extrabold text-purple-600 hover:text-purple-700 flex items-center gap-1 hover:underline cursor-pointer bg-transparent border-0"
                >
                  <RotateCcw className="w-3 h-3" />
                  Limpar
                </button>
              )}
            </div>
            <div className="flex gap-1 bg-slate-100 p-0.5 rounded self-start">
              {['ALL', 'Pendente', 'Em Andamento', 'Concluído'].map(s => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStatusFilter(s as any)}
                  className={`px-2 py-1 text-[10px] font-bold rounded cursor-pointer transition-colors ${
                    statusFilter === s ? 'bg-purple-600 text-white' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {s === 'ALL' ? 'Todos' : s}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Placa / Veículo</label>
              <select
                value={vehicleFilter}
                onChange={e => setVehicleFilter(e.target.value)}
                className="w-full bg-white border border-slate-200 p-1.5 rounded text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-purple-500 cursor-pointer h-[34px]"
              >
                <option value="ALL">Todos os veículos</option>
                {vehicles.filter(v => v.type !== 'Veículo').map(v => (
                  <option key={v.id} value={v.id}>{v.id} — {v.driver}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Local</label>
              <select
                value={localFilter}
                onChange={e => setLocalFilter(e.target.value as any)}
                className="w-full bg-white border border-slate-200 p-1.5 rounded text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-purple-500 cursor-pointer h-[34px]"
              >
                <option value="ALL">Todos (Garagem + Oficina)</option>
                <option value="Garagem">🏠 Garagem Própria</option>
                <option value="Oficina">🏭 Oficina de Terceiro</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Data Inicial</label>
              <input
                type="date"
                value={filterStartDate}
                onChange={e => setFilterStartDate(e.target.value)}
                className="w-full bg-white border border-slate-200 p-1.5 rounded text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-purple-500 h-[34px]"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Data Final</label>
              <input
                type="date"
                value={filterEndDate}
                onChange={e => setFilterEndDate(e.target.value)}
                className="w-full bg-white border border-slate-200 p-1.5 rounded text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-purple-500 h-[34px]"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Buscar</label>
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Placa, descrição..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full bg-white border border-slate-200 pl-8 pr-3 py-1.5 rounded text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-purple-500 h-[34px]"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          {filtered.map(m => (
            <div key={m.id} className="bg-slate-50 border border-slate-200 rounded-xl p-4 hover:border-purple-300 transition-all">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-[10px] font-black text-purple-700 bg-purple-100 px-2 py-0.5 rounded">{m.id}</span>
                    <span className="flex items-center gap-1 text-xs font-bold text-slate-700">
                      <Truck className="w-3.5 h-3.5 text-slate-400" />
                      {m.vehicleId}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                      m.local === 'Garagem' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'
                    }`}>
                      {m.local === 'Garagem' ? '🏠 Garagem' : '🏭 Oficina'}
                    </span>
                    <span className="text-[10px] bg-slate-200 text-slate-600 font-bold px-2 py-0.5 rounded">{m.tipo}</span>
                    <span className="flex items-center gap-1 text-[10px] text-slate-400">
                      <Calendar className="w-3 h-3" />
                      {formatDate(m.data)}
                    </span>
                    <span className="flex items-center gap-1">
                      {statusIcon(m.status)}
                      <span className={`text-[10px] font-bold ${
                        m.status === 'Concluído' ? 'text-emerald-600' :
                        m.status === 'Em Andamento' ? 'text-amber-600' :
                        'text-rose-600'
                      }`}>
                        {m.status}
                      </span>
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-slate-800">{m.descricao}</p>
                  <div className="flex items-center gap-4 text-xs text-slate-500 flex-wrap">
                    <span className="font-medium">{m.local === 'Garagem' ? 'Responsável:' : 'Oficina:'} <strong className="text-slate-700">{m.oficina}</strong></span>
                    {m.kmAtual !== undefined && <span>KM Atual: <strong>{m.kmAtual.toLocaleString()}</strong></span>}
                    {m.proximoKm !== undefined && <span>Próx. KM: <strong>{m.proximoKm.toLocaleString()}</strong></span>}
                    <span className="font-mono font-bold text-emerald-700">R$ {(m.custo ?? 0).toFixed(2)}</span>
                    <span className="text-[9px] text-slate-400 font-bold">MO: R$ {(m.valorMaoDeObra ?? 0).toFixed(2)} | Peça: R$ {(m.valorPeca ?? 0).toFixed(2)}</span>
                    {m.observacao && <span className="text-slate-400 italic">Obs: {m.observacao}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => startEdit(m)}
                    className="p-1.5 hover:bg-slate-200 rounded text-slate-500 hover:text-purple-600 cursor-pointer transition-colors"
                    title="Editar"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onDeleteManutencao(m.id)}
                    className="p-1.5 hover:bg-rose-100 rounded text-slate-500 hover:text-rose-600 cursor-pointer transition-colors"
                    title="Excluir"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="text-center py-12 text-slate-400 text-xs">
              Nenhuma manutenção encontrada com os filtros selecionados.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
