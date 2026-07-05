import React, { useState } from 'react';
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
  X
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
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'Pendente' | 'Em Andamento' | 'Concluído'>('ALL');

  const [formVehicleId, setFormVehicleId] = useState('');
  const [formTipo, setFormTipo] = useState<Manutencao['tipo']>('Preventiva');
  const [formDescricao, setFormDescricao] = useState('');
  const [formData, setFormData] = useState(new Date().toISOString().split('T')[0]);
  const [formKmAtual, setFormKmAtual] = useState('');
  const [formProximoKm, setFormProximoKm] = useState('');
  const [formCusto, setFormCusto] = useState(0);
  const [formOficina, setFormOficina] = useState('');
  const [formObservacao, setFormObservacao] = useState('');
  const [formStatus, setFormStatus] = useState<Manutencao['status']>('Pendente');

  const filtered = manutencoes.filter(m => {
    const matchSearch = !searchTerm || 
      (m.vehicleId ?? '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (m.descricao ?? '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (m.oficina ?? '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = statusFilter === 'ALL' || m.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const resetForm = () => {
    setEditId(null);
    setFormVehicleId('');
    setFormTipo('Preventiva');
    setFormDescricao('');
    setFormData(new Date().toISOString().split('T')[0]);
    setFormKmAtual('');
    setFormProximoKm('');
    setFormCusto(0);
    setFormOficina('');
    setFormObservacao('');
    setFormStatus('Pendente');
    setShowForm(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formVehicleId || !formDescricao || !formOficina || formCusto <= 0) return;

    if (editId) {
      onUpdateManutencao({
        id: editId,
        vehicleId: formVehicleId,
        tipo: formTipo,
        descricao: formDescricao,
        data: formData,
        kmAtual: formKmAtual ? Number(formKmAtual) : undefined,
        proximoKm: formProximoKm ? Number(formProximoKm) : undefined,
        custo: formCusto,
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
        custo: formCusto,
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
    setFormCusto(m.custo);
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
            <Wrench className="w-5 h-5 text-purple-600" />
            Manutenções dos Caminhões
          </h2>
          <p className="text-xs text-slate-400 font-medium">Registro de manutenções preventivas e corretivas da frota</p>
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
              <label className="text-[10px] font-bold text-slate-400 uppercase">Custo (R$)</label>
              <input
                type="number"
                step="0.01"
                value={formCusto}
                onChange={e => setFormCusto(parseFloat(e.target.value) || 0)}
                placeholder="Ex: 450.00"
                className="w-full bg-slate-50 border border-slate-200 p-2 rounded text-xs font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-purple-500"
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase">Oficina</label>
              <input
                type="text"
                value={formOficina}
                onChange={e => setFormOficina(e.target.value)}
                placeholder="Nome da oficina"
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

      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar por placa, descrição ou oficina..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="bg-slate-50 border border-slate-200 pl-8 pr-3 py-1.5 rounded text-xs font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-purple-500 w-64"
              />
            </div>
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
                    <span className="text-[10px] bg-slate-200 text-slate-600 font-bold px-2 py-0.5 rounded">{m.tipo}</span>
                    <span className="flex items-center gap-1 text-[10px] text-slate-400">
                      <Calendar className="w-3 h-3" />
                      {m.data}
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
                    <span className="font-medium">Oficina: <strong className="text-slate-700">{m.oficina}</strong></span>
                    {m.kmAtual !== undefined && <span>KM Atual: <strong>{m.kmAtual.toLocaleString()}</strong></span>}
                    {m.proximoKm !== undefined && <span>Próx. KM: <strong>{m.proximoKm.toLocaleString()}</strong></span>}
                    <span className="font-mono font-bold text-emerald-700">R$ {(m.custo ?? 0).toFixed(2)}</span>
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
              Nenhuma manutenção encontrada.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
