import React, { useState, useEffect, useCallback } from 'react';
import { AlertTriangle, CheckCircle2, ExternalLink, Plus, Trash2, RefreshCw, Loader2, Search, X, Copy, DollarSign, Clock, Car } from 'lucide-react';
import { PedagioDebito } from '../types';

const API_BASE = window.location.origin;

interface Props {
  pedagios: PedagioDebito[];
  setPedagios: React.Dispatch<React.SetStateAction<PedagioDebito[]>>;
  onSummaryChange?: (pendentes: number, valorTotal: number) => void;
}

export default function PedagiosView({ pedagios, setPedagios, onSummaryChange }: Props) {
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [newPlaca, setNewPlaca] = useState('');
  const [newValor, setNewValor] = useState('');
  const [newConcessionaria, setNewConcessionaria] = useState('');
  const [newDataPassagem, setNewDataPassagem] = useState('');
  const [newObservacao, setNewObservacao] = useState('');
  const [filter, setFilter] = useState<'all' | 'pendente' | 'pago'>('all');
  const [copiedPix, setCopiedPix] = useState<string | null>(null);

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

  const handleCheck = async (placa: string) => {
    setChecking(placa);
    try {
      const token = localStorage.getItem('relampago_token');
      const res = await fetch(`${API_BASE}/api/pedagios/check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ placa }),
      });
      const data = await res.json();
      if (data.success && data.inserted) {
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
      } else {
        window.open(`https://www.pedagiodigital.com/?placa=${encodeURIComponent(placa)}`, '_blank');
      }
    } catch {
      window.open(`https://www.pedagiodigital.com/?placa=${encodeURIComponent(placa)}`, '_blank');
    } finally {
      setChecking(null);
    }
  };

  const handleAddManual = async () => {
    if (!newPlaca || !newValor) return;
    const token = localStorage.getItem('relampago_token');
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
    const res = await fetch(`${API_BASE}/api/pedagios`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(record),
    });
    if (res.ok) {
      setPedagios(prev => [{ ...record, pago: false }, ...prev]);
      setNewPlaca('');
      setNewValor('');
      setNewConcessionaria('');
      setNewDataPassagem('');
      setNewObservacao('');
      setShowAdd(false);
    }
  };

  const handleMarkPaid = async (id: string) => {
    const token = localStorage.getItem('relampago_token');
    await fetch(`${API_BASE}/api/pedagios/${id}/pago`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}` },
    });
    setPedagios(prev => prev.map(p => p.id === id ? { ...p, pago: true, dataPagamento: new Date().toISOString() } : p));
  };

  const handleReopen = async (id: string) => {
    const token = localStorage.getItem('relampago_token');
    await fetch(`${API_BASE}/api/pedagios/${id}/reabrir`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}` },
    });
    setPedagios(prev => prev.map(p => p.id === id ? { ...p, pago: false, dataPagamento: '' } : p));
  };

  const handleDelete = async (id: string) => {
    const token = localStorage.getItem('relampago_token');
    await fetch(`${API_BASE}/api/pedagios/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    setPedagios(prev => prev.filter(p => p.id !== id));
  };

  const copyPix = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedPix(code);
    setTimeout(() => setCopiedPix(null), 2000);
  };

  const filtered = filter === 'pendente' ? pendentes : filter === 'pago' ? pagos : pedagios;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${pendentes.length > 0 ? 'bg-gradient-to-br from-amber-500 to-red-500 animate-pulse' : 'bg-slate-700'}`}>
            <AlertTriangle className={`w-5 h-5 ${pendentes.length > 0 ? 'text-white' : 'text-slate-400'}`} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Pedagios</h2>
            <p className="text-xs text-slate-400">Consulta e gestao de pedagios eletronicos</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => { const p = prompt('Digite a placa para consultar:'); if (p) handleCheck(p); }}
            className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm font-bold transition-all cursor-pointer"
          >
            <Search className="w-4 h-4" />
            Consultar Placa
          </button>
          <button
            onClick={() => setShowAdd(!showAdd)}
            className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-sm font-bold transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Registrar Debito
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className={`rounded-xl p-4 border ${pendentes.length > 0 ? 'bg-gradient-to-br from-amber-950/60 to-red-950/40 border-amber-700/50' : 'bg-slate-800/50 border-slate-700/50'}`}>
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">Pendentes</span>
          </div>
          <div className="text-2xl font-black text-white">{pendentes.length}</div>
          <div className="text-sm font-bold text-amber-400">R$ {valorPendente.toFixed(2)}</div>
        </div>
        <div className="rounded-xl p-4 border bg-slate-800/50 border-slate-700/50">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Pagos</span>
          </div>
          <div className="text-2xl font-black text-white">{pagos.length}</div>
          <div className="text-sm font-bold text-emerald-400">R$ {valorPago.toFixed(2)}</div>
        </div>
        <div className="rounded-xl p-4 border bg-slate-800/50 border-slate-700/50">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="w-4 h-4 text-slate-400" />
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total</span>
          </div>
          <div className="text-2xl font-black text-white">{pedagios.length}</div>
          <div className="text-sm font-bold text-slate-300">R$ {(valorPendente + valorPago).toFixed(2)}</div>
        </div>
      </div>

      {/* Add Form */}
      {showAdd && (
        <div className="bg-slate-800/80 border border-slate-700/50 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-white font-bold">Registrar Debito Manual</h3>
            <button onClick={() => setShowAdd(false)} className="text-slate-400 hover:text-white cursor-pointer"><X className="w-5 h-5" /></button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-400 mb-1 block">Placa *</label>
              <input value={newPlaca} onChange={e => setNewPlaca(e.target.value)} placeholder="ABC1D23"
                className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:border-amber-500 focus:outline-none" />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-400 mb-1 block">Valor (R$) *</label>
              <input value={newValor} onChange={e => setNewValor(e.target.value)} type="number" step="0.01" placeholder="0.00"
                className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:border-amber-500 focus:outline-none" />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-400 mb-1 block">Concessionaria</label>
              <input value={newConcessionaria} onChange={e => setNewConcessionaria(e.target.value)} placeholder="Motiva, EcoRodovias..."
                className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:border-amber-500 focus:outline-none" />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-400 mb-1 block">Data Passagem</label>
              <input value={newDataPassagem} onChange={e => setNewDataPassagem(e.target.value)} type="date"
                className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:border-amber-500 focus:outline-none" />
            </div>
            <div className="md:col-span-2">
              <label className="text-xs font-bold text-slate-400 mb-1 block">Observacao</label>
              <input value={newObservacao} onChange={e => setNewObservacao(e.target.value)} placeholder="Opcional..."
                className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:border-amber-500 focus:outline-none" />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowAdd(false)} className="px-4 py-2 text-slate-400 hover:text-white text-sm cursor-pointer">Cancelar</button>
            <button onClick={handleAddManual} disabled={!newPlaca || !newValor}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white rounded-lg text-sm font-bold cursor-pointer transition-all">
              Salvar
            </button>
          </div>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex gap-1 bg-slate-800/50 p-1 rounded-lg w-fit">
        {[
          { key: 'all' as const, label: 'Todos', count: pedagios.length },
          { key: 'pendente' as const, label: 'Pendentes', count: pendentes.length },
          { key: 'pago' as const, label: 'Pagos', count: pagos.length },
        ].map(f => (
          <button key={f.key} onClick={() => setFilter(f.key)}
            className={`px-4 py-2 rounded-md text-sm font-bold transition-all cursor-pointer ${
              filter === f.key
                ? f.key === 'pendente' && pendentes.length > 0
                  ? 'bg-gradient-to-r from-amber-600 to-red-600 text-white'
                  : 'bg-slate-700 text-white'
                : 'text-slate-400 hover:text-white'
            }`}>
            {f.label} ({f.count})
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700/50">
              <th className="text-left px-4 py-3 text-xs font-bold text-slate-400 uppercase">Placa</th>
              <th className="text-left px-4 py-3 text-xs font-bold text-slate-400 uppercase">Concessionaria</th>
              <th className="text-right px-4 py-3 text-xs font-bold text-slate-400 uppercase">Valor</th>
              <th className="text-left px-4 py-3 text-xs font-bold text-slate-400 uppercase">Data Passagem</th>
              <th className="text-center px-4 py-3 text-xs font-bold text-slate-400 uppercase">Status</th>
              <th className="text-right px-4 py-3 text-xs font-bold text-slate-400 uppercase">Acoes</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-12 text-slate-500">
                  <Car className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p className="font-bold">Nenhum debito registrado</p>
                  <p className="text-xs mt-1">Consulte uma placa ou registre manualmente</p>
                </td>
              </tr>
            ) : filtered.map(p => (
              <tr key={p.id} className={`border-b border-slate-700/30 transition-colors ${!p.pago ? 'bg-amber-950/10 hover:bg-amber-950/20' : 'hover:bg-slate-700/20'}`}>
                <td className="px-4 py-3">
                  <span className="font-mono font-bold text-white bg-slate-700/50 px-2 py-1 rounded text-xs">
                    {p.placa}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-300">{p.concessionaria || '—'}</td>
                <td className="px-4 py-3 text-right">
                  <span className={`font-bold ${!p.pago ? 'text-amber-400' : 'text-emerald-400'}`}>
                    R$ {p.valorTotal.toFixed(2)}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-400 text-xs">
                  {p.dataPassagem ? new Date(p.dataPassagem).toLocaleDateString('pt-BR') : '—'}
                </td>
                <td className="px-4 py-3 text-center">
                  {p.pago ? (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-900/30 text-emerald-400 rounded-full text-xs font-bold">
                      <CheckCircle2 className="w-3 h-3" /> Pago
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-900/30 text-amber-400 rounded-full text-xs font-bold animate-pulse">
                      <AlertTriangle className="w-3 h-3" /> Pendente
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    {!p.pago && (
                      <>
                        <button onClick={() => handleCheck(p.placa)} disabled={checking === p.placa}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-amber-400 hover:bg-slate-700/50 transition-all cursor-pointer"
                          title="Consultar no Pedagio Digital">
                          {checking === p.placa ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                        </button>
                        <button onClick={() => window.open(`https://www.pedagiodigital.com/?placa=${encodeURIComponent(p.placa)}`, '_blank')}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-blue-400 hover:bg-slate-700/50 transition-all cursor-pointer"
                          title="Abrir Pedagio Digital">
                          <ExternalLink className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleMarkPaid(p.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-400 hover:bg-slate-700/50 transition-all cursor-pointer"
                          title="Marcar como pago">
                          <CheckCircle2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                    {p.pago && (
                      <button onClick={() => handleReopen(p.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-amber-400 hover:bg-slate-700/50 transition-all cursor-pointer"
                        title="Reabrir debito">
                        <RefreshCw className="w-4 h-4" />
                      </button>
                    )}
                    <button onClick={() => handleDelete(p.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-slate-700/50 transition-all cursor-pointer"
                      title="Excluir">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Help text */}
      <div className="bg-slate-800/30 border border-slate-700/30 rounded-xl p-4 text-xs text-slate-400 space-y-1">
        <p><strong className="text-slate-300">Como funciona:</strong></p>
        <p>1. Clique <strong className="text-amber-400">"Consultar Placa"</strong> para buscar debitos automaticamente no Pedagio Digital</p>
        <p>2. Se o scraper nao retornar resultados, clique no icone <ExternalLink className="w-3 h-3 inline" /> para abrir o site manualmente</p>
        <p>3. Anote o valor e registre via <strong className="text-amber-400">"Registrar Debito"</strong></p>
        <p>4. Quando pagar no Pedagio Digital, marque como <strong className="text-emerald-400">"Pago"</strong> aqui</p>
      </div>
    </div>
  );
}
