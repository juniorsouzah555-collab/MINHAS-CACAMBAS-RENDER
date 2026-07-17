import React, { useState, useEffect, useCallback } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Plus,
  Trash2,
  RefreshCw,
  Loader2,
  Search,
  X,
  DollarSign,
  Clock,
  Car,
  Filter,
  RotateCcw,
  Info
} from 'lucide-react';
import { PedagioDebito } from '../types';

const API_BASE = window.location.origin;

interface Props {
  pedagios: PedagioDebito[];
  setPedagios: React.Dispatch<React.SetStateAction<PedagioDebito[]>>;
  onSummaryChange?: (pendentes: number, valorTotal: number) => void;
}

export default function PedagiosView({ pedagios, setPedagios, onSummaryChange }: Props) {
  const [checking, setChecking] = useState<string | null>(null);
  const [checkResult, setCheckResult] = useState<{ placa: string; success: boolean; message: string } | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [newPlaca, setNewPlaca] = useState('');
  const [newValor, setNewValor] = useState('');
  const [newConcessionaria, setNewConcessionaria] = useState('');
  const [newDataPassagem, setNewDataPassagem] = useState('');
  const [newObservacao, setNewObservacao] = useState('');
  const [filter, setFilter] = useState<'ALL' | 'PENDENTE' | 'PAGO'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  const pendentes = pedagios.filter(p => !p.pago);
  const pagos = pedagios.filter(p => p.pago);
  const valorPendente = pendentes.reduce((s, p) => s + p.valorTotal, 0);
  const valorPago = pagos.reduce((s, p) => s + p.valorTotal, 0);

  useEffect(() => {
    onSummaryChange?.(pendentes.length, valorPendente);
  }, [pendentes.length, valorPendente, onSummaryChange]);

  const loadPedagios = useCallback(async () => {
    try {
      const token = localStorage.getItem('relampago_token');
      const res = await fetch(`${API_BASE}/api/pedagios`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setPedagios(data.map((p: any) => ({
          id: p.id,
          placa: p.placa,
          concessionaria: p.concessionaria || '',
          valorTotal: p.valor_total ?? p.valorTotal ?? 0,
          dataPassagem: p.data_passagem || p.dataPassagem || '',
          dataConsulta: p.data_consulta || p.dataConsulta || '',
          pago: p.pago === true || p.pago === 1,
          dataPagamento: p.data_pagamento || p.dataPagamento || '',
          pixCode: p.pix_code || p.pixCode || '',
          observacao: p.observacao || '',
          createdAt: p.created_at || p.createdAt || '',
        })));
      }
    } catch (e) {
      console.error('[Pedagios] Load error:', e);
    }
  }, [setPedagios]);

  useEffect(() => { loadPedagios(); }, [loadPedagios]);

  const handleCheck = async () => {
    const placa = prompt('Digite a placa para consultar no Pedagio Digital:');
    if (!placa) return;
    const normalized = placa.toUpperCase().replace(/[^A-Z0-9]/g, '');
    setChecking(normalized);
    setCheckResult(null);
    try {
      const token = localStorage.getItem('relampago_token');
      const res = await fetch(`${API_BASE}/api/pedagios/check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ placa: normalized }),
      });
      const data = await res.json();
      if (data.success && data.inserted && data.inserted.length > 0) {
        setPedagios(prev => [...data.inserted.map((d: any) => ({
          id: d.id,
          placa: d.placa,
          concessionaria: d.concessionaria || '',
          valorTotal: d.valorTotal,
          dataPassagem: '',
          dataConsulta: new Date().toISOString(),
          pago: false,
          createdAt: new Date().toISOString(),
        })), ...prev]);
        setCheckResult({ placa: normalized, success: true, message: `${data.inserted.length} debito(s) encontrado(s)!` });
      } else {
        setCheckResult({ placa: normalized, success: false, message: data.message || 'Nenhum debito encontrado via API. Registre manualmente abaixo.' });
      }
    } catch {
      setCheckResult({ placa: normalized, success: false, message: 'Erro de conexao. Registre o debito manualmente.' });
    } finally {
      setChecking(null);
    }
  };

  const handleAddManual = () => {
    if (!newPlaca || !newValor) return;
    const id = `PED-${Date.now()}`;
    const record = {
      id,
      placa: newPlaca.toUpperCase().replace(/[^A-Z0-9]/g, ''),
      concessionaria: newConcessionaria,
      valorTotal: parseFloat(newValor),
      dataPassagem: newDataPassagem,
      dataConsulta: new Date().toISOString(),
      pago: false,
      observacao: newObservacao,
      createdAt: new Date().toISOString(),
    };
    fetch(`${API_BASE}/api/pedagios`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('relampago_token')}` },
      body: JSON.stringify(record),
    }).then(() => {
      setPedagios(prev => [{ ...record, pago: false }, ...prev]);
      resetForm();
    });
  };

  const resetForm = () => {
    setNewPlaca('');
    setNewValor('');
    setNewConcessionaria('');
    setNewDataPassagem('');
    setNewObservacao('');
    setShowForm(false);
  };

  const handleMarkPaid = (id: string) => {
    fetch(`${API_BASE}/api/pedagios/${id}/pago`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${localStorage.getItem('relampago_token')}` },
    }).then(() => {
      setPedagios(prev => prev.map(p => p.id === id ? { ...p, pago: true, dataPagamento: new Date().toISOString() } : p));
    });
  };

  const handleReopen = (id: string) => {
    fetch(`${API_BASE}/api/pedagios/${id}/reabrir`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${localStorage.getItem('relampago_token')}` },
    }).then(() => {
      setPedagios(prev => prev.map(p => p.id === id ? { ...p, pago: false, dataPagamento: '' } : p));
    });
  };

  const handleDelete = (id: string) => {
    fetch(`${API_BASE}/api/pedagios/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${localStorage.getItem('relampago_token')}` },
    }).then(() => {
      setPedagios(prev => prev.filter(p => p.id !== id));
    });
  };

  const filtered = pedagios.filter(p => {
    const matchFilter = filter === 'ALL' || (filter === 'PENDENTE' && !p.pago) || (filter === 'PAGO' && p.pago);
    const matchSearch = !searchTerm || p.placa.toLowerCase().includes(searchTerm.toLowerCase()) || (p.concessionaria || '').toLowerCase().includes(searchTerm.toLowerCase());
    return matchFilter && matchSearch;
  });

  const formatDate = (d: string) => {
    if (!d) return '—';
    const p = d.split('T')[0].split('-');
    return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : d;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
            <AlertTriangle className={`w-5 h-5 ${pendentes.length > 0 ? 'text-amber-500' : 'text-slate-400'}`} />
            Pedagios Eletronicos
          </h2>
          <p className="text-xs text-slate-400 font-medium">Consulta e gestao de debitos de pedagio — Free Flow / Siga Facil</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleCheck}
            disabled={!!checking}
            className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs py-2 px-4 rounded-lg flex items-center gap-1.5 cursor-pointer transition-colors border border-slate-200"
          >
            {checking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            {checking ? 'Consultando...' : 'Consultar Placa'}
          </button>
          <button
            onClick={() => { resetForm(); setShowForm(!showForm); }}
            className="bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs py-2 px-4 rounded-lg flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {showForm ? 'Fechar' : 'Registrar Debito'}
          </button>
        </div>
      </div>

      {/* Scraper Result Banner */}
      {checkResult && (
        <div className={`flex items-center gap-3 p-3 rounded-xl border text-sm font-medium ${
          checkResult.success
            ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
            : 'bg-amber-50 border-amber-200 text-amber-700'
        }`}>
          {checkResult.success ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> : <Info className="w-4 h-4 flex-shrink-0" />}
          <span className="flex-1"><strong>{checkResult.placa}</strong> — {checkResult.message}</span>
          <button onClick={() => setCheckResult(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer"><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* KPI Cards */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-xs">
          <div className="flex justify-between items-center text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Pendentes</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-black font-sans text-slate-900 mt-1">{pendentes.length}</p>
          <span className="text-[10px] text-amber-600 font-bold">R$ {valorPendente.toFixed(2)}</span>
        </div>
        <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-xs">
          <div className="flex justify-between items-center text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Pagos</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-black font-sans text-slate-900 mt-1">{pagos.length}</p>
          <span className="text-[10px] text-emerald-600 font-bold">R$ {valorPago.toFixed(2)}</span>
        </div>
        <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-xs">
          <div className="flex justify-between items-center text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Total</span>
            <DollarSign className="w-4 h-4 text-purple-500" />
          </div>
          <p className="text-2xl font-black font-sans text-slate-900 mt-1">{pedagios.length}</p>
          <span className="text-[10px] text-slate-400">R$ {(valorPendente + valorPago).toFixed(2)}</span>
        </div>
        <div className={`border p-4 rounded-xl shadow-xs ${
          pendentes.length > 0
            ? 'bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200'
            : 'bg-white border-slate-200'
        }`}>
          <div className="flex justify-between items-center text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Acao</span>
            <AlertTriangle className={`w-4 h-4 ${pendentes.length > 0 ? 'text-amber-500' : 'text-slate-300'}`} />
          </div>
          <p className={`text-2xl font-black font-sans mt-1 ${pendentes.length > 0 ? 'text-amber-700' : 'text-slate-300'}`}>
            {pendentes.length > 0 ? 'ATENCAO' : 'LIVRE'}
          </p>
          <span className="text-[10px] text-slate-400">{pendentes.length > 0 ? 'Debitos aguardando pagamento' : 'Nenhum debito pendente'}</span>
        </div>
      </section>

      {/* Add Form */}
      {showForm && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-slate-900">Registrar Debito Manual</h3>
            <button onClick={resetForm} className="text-slate-400 hover:text-slate-600 cursor-pointer"><X className="w-4 h-4" /></button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">Placa *</label>
              <input value={newPlaca} onChange={e => setNewPlaca(e.target.value)} placeholder="ABC1D23"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 font-mono focus:border-purple-400 focus:ring-1 focus:ring-purple-400 focus:outline-none" />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">Valor (R$) *</label>
              <input value={newValor} onChange={e => setNewValor(e.target.value)} type="number" step="0.01" placeholder="0,00"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:border-purple-400 focus:ring-1 focus:ring-purple-400 focus:outline-none" />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">Concessionaria</label>
              <input value={newConcessionaria} onChange={e => setNewConcessionaria(e.target.value)} placeholder="Motiva, EcoRodovias..."
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:border-purple-400 focus:ring-1 focus:ring-purple-400 focus:outline-none" />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">Data Passagem</label>
              <input value={newDataPassagem} onChange={e => setNewDataPassagem(e.target.value)} type="date"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:border-purple-400 focus:ring-1 focus:ring-purple-400 focus:outline-none" />
            </div>
            <div className="md:col-span-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">Observacao</label>
              <input value={newObservacao} onChange={e => setNewObservacao(e.target.value)} placeholder="Opcional..."
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:border-purple-400 focus:ring-1 focus:ring-purple-400 focus:outline-none" />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={resetForm} className="px-4 py-2 text-slate-400 hover:text-slate-600 text-xs font-bold cursor-pointer">Cancelar</button>
            <button onClick={handleAddManual} disabled={!newPlaca || !newValor}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-xs font-bold cursor-pointer transition-colors">
              Salvar
            </button>
          </div>
        </div>
      )}

      {/* Filter + Search */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
          {[
            { key: 'ALL' as const, label: 'Todos' },
            { key: 'PENDENTE' as const, label: 'Pendentes' },
            { key: 'PAGO' as const, label: 'Pagos' },
          ].map(f => (
            <button key={f.key} onClick={() => setFilter(f.key)}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition-colors cursor-pointer ${
                filter === f.key ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-400 hover:text-slate-600'
              }`}>
              {f.label}
            </button>
          ))}
        </div>
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Buscar placa..."
            className="bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-900 w-48 focus:border-purple-400 focus:ring-1 focus:ring-purple-400 focus:outline-none" />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="text-left px-4 py-2.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Placa</th>
              <th className="text-left px-4 py-2.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Concessionaria</th>
              <th className="text-right px-4 py-2.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Valor</th>
              <th className="text-left px-4 py-2.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Data Passagem</th>
              <th className="text-center px-4 py-2.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Status</th>
              <th className="text-right px-4 py-2.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Acoes</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-12 text-slate-300">
                  <Car className="w-10 h-10 mx-auto mb-2 opacity-40" />
                  <p className="text-xs font-bold text-slate-400">Nenhum debito registrado</p>
                  <p className="text-[10px] text-slate-300 mt-1">Consulte uma placa ou registre manualmente</p>
                </td>
              </tr>
            ) : filtered.map(p => (
              <tr key={p.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors">
                <td className="px-4 py-2.5">
                  <span className="font-mono text-xs font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded">
                    {p.placa}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-xs text-slate-600">{p.concessionaria || '—'}</td>
                <td className="px-4 py-2.5 text-right">
                  <span className={`text-xs font-bold ${!p.pago ? 'text-amber-600' : 'text-emerald-600'}`}>
                    R$ {p.valorTotal.toFixed(2)}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-xs text-slate-400">{formatDate(p.dataPassagem)}</td>
                <td className="px-4 py-2.5 text-center">
                  {p.pago ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-600 border border-emerald-200 rounded-full text-[10px] font-bold">
                      <CheckCircle2 className="w-3 h-3" /> Pago
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 text-amber-600 border border-amber-200 rounded-full text-[10px] font-bold">
                      <AlertTriangle className="w-3 h-3" /> Pendente
                    </span>
                  )}
                </td>
                <td className="px-4 py-2.5">
                  <div className="flex items-center justify-end gap-0.5">
                    {!p.pago && (
                      <>
                        <button onClick={() => window.open(`https://www.pedagiodigital.com/?placa=${encodeURIComponent(p.placa)}`, '_blank')}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-purple-600 hover:bg-slate-100 transition-colors cursor-pointer"
                          title="Consultar no site">
                          <ExternalLink className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => handleMarkPaid(p.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-slate-100 transition-colors cursor-pointer"
                          title="Marcar como pago">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                    {p.pago && (
                      <button onClick={() => handleReopen(p.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-slate-100 transition-colors cursor-pointer"
                        title="Reabrir">
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button onClick={() => handleDelete(p.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-slate-100 transition-colors cursor-pointer"
                      title="Excluir">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer info */}
      <div className="text-[10px] text-slate-300 font-medium">
        <p>Pedagios eletronicos — Free Flow / Siga Facil — Motiva, EcoRodovias, CNL</p>
        <p className="mt-0.5">As passagens podem levar ate 48h para ficarem disponiveis no sistema do Pedagio Digital</p>
      </div>
    </div>
  );
}
