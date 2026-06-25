import React, { useState, useCallback, useEffect, useRef } from 'react';
import { FileText, Mail, Download, RefreshCw, AlertCircle, CheckCircle2, LogOut, Settings, Plus, X, ExternalLink, Trash2, Edit3, Bell, ChevronDown, ChevronRight, CheckSquare, Square, Pencil, Check, BookOpen } from 'lucide-react';
import { supabase } from '../lib/supabase';

const API_BASE = window.location.origin;

interface BoletoEmail {
  id: string; subject: string; from: string; fromEmail?: string; date: string; snippet: string;
  hasAttachment: boolean; attachmentId?: string; filename?: string; mimeType?: string;
  boletoLink?: string; alias?: string; hasProvider?: boolean;
  isNew?: boolean;
}

interface Filter {
  id: number; type: string; value: string;
}

interface Alias {
  id: number; sender: string; alias: string;
}

interface Props {
  onNewBoletosCount?: (count: number) => void;
}

const SEEN_KEY = 'seen_boletos';

function loadSeen(): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem(SEEN_KEY) || '[]')); } catch { return new Set(); }
}

function saveSeen(ids: Set<string>) {
  try { localStorage.setItem(SEEN_KEY, JSON.stringify([...ids])); } catch {}
}

export default function BoletoView({ onNewBoletosCount }: Props) {
  const [connected, setConnected] = useState<boolean | null>(null);
  const [emails, setEmails] = useState<BoletoEmail[]>([]);
  const [aliases, setAliases] = useState<Alias[]>([]);
  const [loading, setLoading] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchMode, setSearchMode] = useState<'strict' | 'broad'>('strict');
  const [days, setDays] = useState(30);

  interface Bill { id: string; name: string; date: string; checked: boolean; sender?: string; }
  const [billsOpen, setBillsOpen] = useState(true);
  const [bills, setBills] = useState<Bill[]>([]);
  const [newBillName, setNewBillName] = useState('');
  const [newBillDate, setNewBillDate] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() + 5);
    return d.toISOString().slice(0, 10);
  });
  const [newBillSender, setNewBillSender] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editSender, setEditSender] = useState('');

  const [activeBillSender, setActiveBillSender] = useState<string | null>(null);

  useEffect(() => {
    supabase.from('plano_contas').select('*').order('date').then(({ data, error }) => {
      if (error) { console.error('Erro ao carregar plano de contas:', error); return; }
      if (data) setBills(data.map((b: any) => ({ id: b.id, name: b.name, date: b.date, checked: b.checked, sender: b.sender || undefined })));
    });
  }, []);

  const addBill = (name: string, date: string, sender: string) => {
    const id = crypto.randomUUID();
    setBills(prev => [...prev, { id, name, date, checked: false, sender: sender || undefined }]);
    supabase.from('plano_contas').insert([{ id, name, date, checked: false, sender: sender || null }])
      .then(({ error }) => { if (error) console.error('Erro ao salvar conta:', error); });
  };

  const editBill = (id: string, name: string, date: string, sender: string) => {
    setBills(prev => prev.map(b => b.id === id ? { ...b, name, date, sender } : b));
    supabase.from('plano_contas').update({ name, date, sender: sender || null }).eq('id', id)
      .then(({ error }) => { if (error) console.error('Erro ao atualizar conta:', error); });
  };

  const toggleBillChecked = (bill: Bill) => {
    setBills(prev => prev.map(b => b.id === bill.id ? { ...b, checked: !b.checked } : b));
    supabase.from('plano_contas').update({ checked: !bill.checked }).eq('id', bill.id)
      .then(({ error }) => { if (error) console.error('Erro ao atualizar conta:', error); });
  };

  const deleteBill = (id: string) => {
    setBills(prev => prev.filter(b => b.id !== id));
    supabase.from('plano_contas').delete().eq('id', id)
      .then(({ error }) => { if (error) console.error('Erro ao excluir conta:', error); });
  };

  const [filters, setFilters] = useState<Filter[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [newType, setNewType] = useState<'sender' | 'subject' | 'body'>('sender');
  const [newValue, setNewValue] = useState('');
  const [addingFilter, setAddingFilter] = useState(false);

  const [showAliasPanel, setShowAliasPanel] = useState(false);
  const [editingAlias, setEditingAlias] = useState<Alias | null>(null);
  const [aliasSender, setAliasSender] = useState('');
  const [aliasName, setAliasName] = useState('');

  const [providers, setProviders] = useState<{ id: number; sender: string; password: string }[]>([]);
  const [showProviders, setShowProviders] = useState(false);
  const [newProviderSender, setNewProviderSender] = useState('');
  const [newProviderPassword, setNewProviderPassword] = useState('');
  const [addingProvider, setAddingProvider] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState<string | null>(null);

  const fetchBoletos = useCallback(async (mode?: 'strict' | 'broad') => {
    const m = mode || searchMode;
    setLoading(true); setError(null);
    try {
      const r = await fetch(`${API_BASE}/api/gmail?action=fetch&mode=${m}&days=${days}`);
      const data = await r.json();
      setConnected(data.connected);
      if (data.emails) {
        const seen = loadSeen();
        let newCount = 0;
        const marked = data.emails.map((e: BoletoEmail) => {
          const isNew = !seen.has(e.id);
          if (isNew) newCount++;
          return { ...e, isNew };
        });
        const allIds = new Set<string>(data.emails.map((e: BoletoEmail) => e.id));
        saveSeen(new Set<string>([...seen, ...allIds]));
        setEmails(marked);
        onNewBoletosCount?.(newCount);
      }
      if (data.aliases) setAliases(data.aliases);
      if (data.error) setError(data.error);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }, [searchMode, days, onNewBoletosCount]);

  const fetchFilters = useCallback(async () => {
    try {
      const r = await fetch(`${API_BASE}/api/gmail?action=getFilters`);
      const data = await r.json();
      if (data.filters) setFilters(data.filters);
    } catch {}
  }, []);

  const fetchAliases = useCallback(async () => {
    try {
      const r = await fetch(`${API_BASE}/api/gmail?action=getAliases`);
      const data = await r.json();
      if (data.aliases) setAliases(data.aliases);
    } catch {}
  }, []);

  const fetchProviders = useCallback(async () => {
    try {
      const r = await fetch(`${API_BASE}/api/gmail?action=getProviders`);
      const data = await r.json();
      if (data.providers) setProviders(data.providers);
    } catch {}
  }, []);

  const handleAddProvider = async () => {
    if (!newProviderSender.trim() || !newProviderPassword.trim()) return;
    setAddingProvider(true);
    try {
      await fetch(`${API_BASE}/api/gmail?action=addProvider`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sender: newProviderSender.trim(), password: newProviderPassword.trim() }),
      });
      setNewProviderSender(''); setNewProviderPassword('');
      await fetchProviders();
      fetchBoletos();
    } catch (e: any) { setError(e.message); }
    finally { setAddingProvider(false); }
  };

  const handleRemoveProvider = async (id: number) => {
    try {
      await fetch(`${API_BASE}/api/gmail?action=removeProvider`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      await fetchProviders();
      fetchBoletos();
    } catch (e: any) { setError(e.message); }
  };

  const handleDownloadProviderPdf = async (email: BoletoEmail) => {
    markEmailClicked(email.id);
    setDownloadingPdf(email.id);
    try {
      const params = new URLSearchParams({ action: 'downloadProviderPdf', sender: email.from, url: email.boletoLink! });
      if (email.fromEmail) params.set('senderEmail', email.fromEmail);
      const r = await fetch(`${API_BASE}/api/gmail?${params}`);
      if (!r.ok) {
        const err = await r.json();
        setError(err.error || 'Erro ao baixar PDF');
        return;
      }
      const blob = await r.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'boleto.pdf';
      a.click();
      URL.revokeObjectURL(a.href);
    } catch (e: any) { setError(e.message); }
    finally { setDownloadingPdf(null); }
  };

  useEffect(() => { fetchBoletos(); }, [fetchBoletos]);

  const switchMode = (mode: 'strict' | 'broad') => {
    setSearchMode(mode);
    fetchBoletos(mode);
  };

  const handleConnect = () => { setConnecting(true); window.location.href = `${API_BASE}/api/gmail?action=auth`; };

  const handleDisconnect = async () => {
    if (!confirm('Desconectar o Gmail?')) return;
    setDisconnecting(true); setError(null);
    try {
      const r = await fetch(`${API_BASE}/api/gmail?action=disconnect`, { method: 'POST' });
      if (r.ok) { setConnected(false); setEmails([]); }
      else setError((await r.json())?.error || 'Erro ao desconectar');
    } catch (e: any) { setError(e.message); }
    finally { setDisconnecting(false); }
  };

  const markEmailClicked = (id: string) => {
    setEmails(prev => prev.map(e => e.id === id ? { ...e, isNew: false } : e));
    const seen = loadSeen();
    seen.add(id);
    saveSeen(seen);
  };

  const handleDownload = (msgId: string, attachmentId: string, filename: string) => {
    markEmailClicked(msgId);
    const url = `${API_BASE}/api/gmail?action=download&msgId=${msgId}&attachmentId=${attachmentId}&filename=${encodeURIComponent(filename)}`;
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.click();
  };

  const handleView = (msgId: string, attachmentId: string, filename: string) => {
    markEmailClicked(msgId);
    window.open(`${API_BASE}/api/gmail?action=view&msgId=${msgId}&attachmentId=${attachmentId}&filename=${encodeURIComponent(filename)}`, '_blank');
  };

  const handleHideEmail = async (messageId: string) => {
    try {
      await fetch(`${API_BASE}/api/gmail?action=hideEmail`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageId }),
      });
      setEmails(prev => prev.filter(e => e.id !== messageId));
    } catch (e: any) { setError(e.message); }
  };

  const handleAddFilter = async () => {
    if (!newValue.trim()) return;
    setAddingFilter(true);
    try {
      await fetch(`${API_BASE}/api/gmail?action=addFilter`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: newType, value: newValue.trim() }),
      });
      setNewValue('');
      await fetchFilters();
    } catch (e: any) { setError(e.message); }
    finally { setAddingFilter(false); }
  };

  const handleRemoveFilter = async (id: number) => {
    try {
      await fetch(`${API_BASE}/api/gmail?action=removeFilter`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      await fetchFilters();
    } catch (e: any) { setError(e.message); }
  };

  const handleSaveAlias = async () => {
    if (!aliasSender.trim() || !aliasName.trim()) return;
    try {
      await fetch(`${API_BASE}/api/gmail?action=saveAlias`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sender: aliasSender.trim(), alias: aliasName.trim() }),
      });
      setAliasSender(''); setAliasName(''); setEditingAlias(null);
      await fetchAliases();
      fetchBoletos();
    } catch (e: any) { setError(e.message); }
  };

  const handleDeleteAlias = async (id: number) => {
    try {
      await fetch(`${API_BASE}/api/gmail?action=deleteAlias`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      await fetchAliases();
      fetchBoletos();
    } catch (e: any) { setError(e.message); }
  };

  const toggleFilters = () => {
    if (!showFilters) fetchFilters();
    setShowFilters(!showFilters);
    setShowAliasPanel(false);
    setShowProviders(false);
  };

  const toggleAliasPanel = () => {
    if (!showAliasPanel) fetchAliases();
    setShowAliasPanel(!showAliasPanel);
    setShowFilters(false);
    setShowProviders(false);
  };

  const toggleProviders = () => {
    if (!showProviders) fetchProviders();
    setShowProviders(!showProviders);
    setShowFilters(false);
    setShowAliasPanel(false);
  };

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
    } catch { return dateStr; }
  };

  const displayName = (email: BoletoEmail) => {
    if (email.alias) return email.alias;
    return email.from;
  };

  const emailMatchesSender = (email: BoletoEmail, sender: string): boolean => {
    if (!sender) return true;
    const s = sender.toLowerCase();
    return (email.from?.toLowerCase().includes(s) || email.fromEmail?.toLowerCase().includes(s)) ?? false;
  };

  // Helper to get alias name from sender
  const aliasNameForSender = (sender: string): string => {
    const alias = aliases.find(a => sender && (a.sender === sender || a.sender.includes(sender) || sender.includes(a.sender)));
    return alias ? alias.alias : sender;
  };

  const filteredEmails = activeBillSender ? emails.filter(e => emailMatchesSender(e, activeBillSender)) : emails;

  const clearBillFilter = () => setActiveBillSender(null);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <FileText className="w-6 h-6 text-emerald-600" />
            Boletos
          </h2>
          <p className="text-sm text-slate-400 font-medium mt-0.5">
            Boletos recebidos por e-mail
          </p>
        </div>
        <div className="flex items-center gap-2">
          {connected === true && (
            <button type="button" onClick={handleDisconnect} disabled={disconnecting}
              className="bg-red-50 hover:bg-red-100 text-red-600 border border-red-200/60 px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors disabled:opacity-50">
              <LogOut className="w-3.5 h-3.5" />
              {disconnecting ? 'Desconectando...' : 'Desconectar'}
            </button>
          )}
          {connected === true && (
            <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 bg-emerald-50 border border-emerald-200/60 px-3 py-2 rounded-lg">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Conectado
            </span>
          )}
          {connected === true && (
            <button type="button" onClick={toggleAliasPanel}
              className={`border px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors ${showAliasPanel ? 'bg-purple-50 text-purple-700 border-purple-200' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>
              <Edit3 className="w-3.5 h-3.5" />
              Apelidos
            </button>
          )}
          {connected === true && (
            <button type="button" onClick={toggleProviders}
              className={`border px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors ${showProviders ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>
              <Download className="w-3.5 h-3.5" />
              Provedores
            </button>
          )}
          {connected === true && (
            <button type="button" onClick={toggleFilters}
              className={`border px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors ${showFilters ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>
              <Settings className="w-3.5 h-3.5" />
              Filtros
            </button>
          )}
          <button type="button" onClick={fetchBoletos} disabled={loading}
            className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-1.5 cursor-pointer transition-colors disabled:opacity-50">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </button>
        </div>
      </div>

      {/* Days Filter */}
      {connected === true && (
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
            <button type="button" onClick={() => { setDays(7); fetchBoletos(); }}
              className={`px-3 py-1.5 rounded-md text-xs font-bold cursor-pointer transition-colors ${days === 7 ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
              7 dias
            </button>
            <button type="button" onClick={() => { setDays(15); fetchBoletos(); }}
              className={`px-3 py-1.5 rounded-md text-xs font-bold cursor-pointer transition-colors ${days === 15 ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
              15 dias
            </button>
            <button type="button" onClick={() => { setDays(30); fetchBoletos(); }}
              className={`px-3 py-1.5 rounded-md text-xs font-bold cursor-pointer transition-colors ${days === 30 ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
              30 dias
            </button>
            <button type="button" onClick={() => { setDays(60); fetchBoletos(); }}
              className={`px-3 py-1.5 rounded-md text-xs font-bold cursor-pointer transition-colors ${days === 60 ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
              60 dias
            </button>
            <button type="button" onClick={() => { setDays(90); fetchBoletos(); }}
              className={`px-3 py-1.5 rounded-md text-xs font-bold cursor-pointer transition-colors ${days === 90 ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
              90 dias
            </button>
          </div>
          <span className="text-[10px] text-slate-400 font-medium">últimos {days} dias</span>
        </div>
      )}

      {/* Plano de Contas */}
      {connected === true && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <button
            onClick={() => setBillsOpen(!billsOpen)}
            className="w-full flex items-center justify-between px-6 py-4 hover:bg-slate-50 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-emerald-600" />
              <span className="text-base font-bold text-slate-800">Plano de Contas</span>
              {bills.length > 0 && (
                <span className="text-xs font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                  {bills.filter(b => !b.checked).length}/{bills.length}
                </span>
              )}
            </div>
            {billsOpen ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
          </button>

          {billsOpen && (
            <div className="px-6 pb-4 space-y-1">
              {bills.length === 0 && (
                <p className="text-sm text-slate-400 italic py-2">Nenhuma conta cadastrada.</p>
              )}
              {[...bills].sort((a, b) => a.date.localeCompare(b.date)).map(bill => {
                const today = new Date().toISOString().slice(0, 10);
                const isLate = !bill.checked && bill.date < today;
                const isFiltering = activeBillSender === bill.sender;
                const emailCount = bill.sender ? emails.filter(e => e.isNew && emailMatchesSender(e, bill.sender!)).length : 0;
                return (
                <div key={bill.id} className={`group flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${isFiltering ? 'bg-emerald-50 ring-1 ring-emerald-300' : 'hover:bg-slate-50'}`}>
                  <button onClick={() => toggleBillChecked(bill)}
                    className="shrink-0 cursor-pointer text-slate-400 hover:text-emerald-500 transition-colors">
                    {bill.checked
                      ? <CheckSquare className="w-5 h-5 text-emerald-500" />
                      : <Square className="w-5 h-5" />
                    }
                  </button>

                  {editingId === bill.id ? (
                    <div className="flex items-center gap-1 flex-1 min-w-0">
                      <input
                        type="text"
                        value={editName}
                        onChange={e => setEditName(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') { const t = editName.trim(); if (t) { editBill(bill.id, t, editDate, editSender); } setEditingId(null); } if (e.key === 'Escape') setEditingId(null); }}
                        className="flex-1 text-sm bg-slate-100 text-slate-800 px-2 py-1 rounded outline-none border border-slate-300"
                        autoFocus
                      />
                      <input type="date" value={editDate} onChange={e => setEditDate(e.target.value)}
                        className="text-sm bg-slate-100 text-slate-800 px-2 py-1 rounded outline-none border border-slate-300 w-32" />
                      <select value={editSender} onChange={e => setEditSender(e.target.value)}
                        className="text-xs bg-slate-100 text-slate-700 px-2 py-1.5 rounded outline-none border border-slate-300 cursor-pointer max-w-[120px]">
                        <option value="">Sem filtro</option>
                        {aliases.map(a => <option key={a.id} value={a.sender}>{a.alias}</option>)}
                      </select>
                      <button onClick={() => { const t = editName.trim(); if (t) { editBill(bill.id, t, editDate, editSender); } setEditingId(null); }}
                        className="shrink-0 cursor-pointer text-emerald-500 hover:text-emerald-400 transition-colors">
                        <Check className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`text-sm ${bill.checked ? 'text-slate-400 line-through' : 'text-slate-700 font-medium'}`}>
                            {bill.name}
                          </span>
                          {emailCount > 0 && (
                            <span className="text-[10px] font-bold text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded-full shrink-0 leading-none">
                              {emailCount}
                            </span>
                          )}
                          {bill.sender && (
                            <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded shrink-0">
                              {aliasNameForSender(bill.sender)}
                            </span>
                          )}
                        </div>
                        <span className={`text-[11px] ${bill.checked ? 'text-slate-300' : isLate ? 'text-red-500' : 'text-slate-400'}`}>
                          {new Date(bill.date + 'T12:00:00').toLocaleDateString('pt-BR')}
                          {isLate && <span className="ml-1 text-red-500">(atrasado)</span>}
                        </span>
                      </div>
                      {bill.sender && (
                        <button onClick={() => setActiveBillSender(isFiltering ? null : bill.sender!)}
                          className={`shrink-0 cursor-pointer transition-colors ${isFiltering ? 'text-emerald-600' : 'text-slate-300 hover:text-emerald-500 opacity-0 group-hover:opacity-100'}`}
                          title={isFiltering ? 'Limpar filtro' : `Filtrar por ${aliasNameForSender(bill.sender)}`}>
                          <FileText className="w-4 h-4" />
                        </button>
                      )}
                      <button onClick={() => { setEditingId(bill.id); setEditName(bill.name); setEditDate(bill.date); setEditSender(bill.sender || ''); }}
                        className="shrink-0 opacity-0 group-hover:opacity-100 cursor-pointer text-slate-400 hover:text-blue-500 transition-all">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => deleteBill(bill.id)}
                        className="shrink-0 opacity-0 group-hover:opacity-100 cursor-pointer text-slate-400 hover:text-red-500 transition-all">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
                </div>
              );})}
              <div className="flex items-center gap-2 pt-2">
                <input type="text" value={newBillName} onChange={e => setNewBillName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { const n = newBillName.trim(); if (n) { addBill(n, newBillDate, newBillSender); setNewBillName(''); } } }}
                  placeholder="Nome da conta..."
                  className="flex-1 text-sm border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-emerald-400 transition-colors" />
                <input type="date" value={newBillDate} onChange={e => setNewBillDate(e.target.value)}
                  className="text-sm border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-emerald-400 transition-colors" />
                <select value={newBillSender} onChange={e => setNewBillSender(e.target.value)}
                  className="text-xs border border-slate-200 rounded-lg px-2 py-2 outline-none focus:border-emerald-400 transition-colors cursor-pointer bg-white text-slate-700">
                  <option value="">Sem filtro</option>
                  {aliases.map(a => <option key={a.id} value={a.sender}>{a.alias}</option>)}
                </select>
                <button onClick={() => { const n = newBillName.trim(); if (n) { addBill(n, newBillDate, newBillSender); setNewBillName(''); } }}
                  disabled={!newBillName.trim()}
                  className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-1 cursor-pointer transition-colors disabled:opacity-50">
                  <Plus className="w-4 h-4" />
                  Adicionar
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200/60 rounded-xl px-5 py-3 flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
          <p className="text-sm font-semibold text-red-700">{error}</p>
        </div>
      )}

      {/* Mode Tabs */}
      {connected === true && (
        <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1 w-fit">
          <button type="button" onClick={() => switchMode('strict')}
            className={`px-4 py-2 rounded-md text-xs font-bold cursor-pointer transition-colors ${searchMode === 'strict' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
            Filtrado
          </button>
          <button type="button" onClick={() => switchMode('broad')}
            className={`px-4 py-2 rounded-md text-xs font-bold cursor-pointer transition-colors ${searchMode === 'broad' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
            Abrangente
          </button>
        </div>
      )}

      {/* Filters Panel */}
      {connected === true && showFilters && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Filtros de busca</h3>
          {filters.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {filters.map(f => (
                <span key={f.id}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-bold bg-slate-100 text-slate-700">
                  <span className="uppercase text-[10px] text-slate-400 mr-0.5">
                    {f.type === 'sender' ? 'DE:' : f.type === 'subject' ? 'ASS:' : 'CORPO:'}
                  </span>
                  {f.value}
                  <button type="button" onClick={() => handleRemoveFilter(f.id)}
                    className="ml-0.5 hover:bg-red-200 rounded-full p-0.5 cursor-pointer transition-colors">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
          <div className="flex items-center gap-2">
            <select value={newType} onChange={e => setNewType(e.target.value as any)}
              className="text-sm font-bold border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-700 cursor-pointer">
              <option value="sender">Remetente</option>
              <option value="subject">Assunto</option>
              <option value="body">Corpo</option>
            </select>
            <input type="text" value={newValue} onChange={e => setNewValue(e.target.value)}
              placeholder={newType === 'sender' ? 'ex: banco@exemplo.com' : newType === 'subject' ? 'ex: mensalidade' : 'ex: 2ª via'}
              className="flex-1 text-sm border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-emerald-400 transition-colors"
              onKeyDown={e => e.key === 'Enter' && handleAddFilter()}
            />
            <button type="button" onClick={handleAddFilter} disabled={addingFilter || !newValue.trim()}
              className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-1 cursor-pointer transition-colors disabled:opacity-50">
              <Plus className="w-4 h-4" />
              {addingFilter ? '...' : 'Adicionar'}
            </button>
          </div>
        </div>
      )}

      {/* Alias Panel */}
      {connected === true && showAliasPanel && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Apelidos dos remetentes</h3>
          <p className="text-xs text-slate-400 -mt-3">
            Dê nomes personalizados para cada remetente. O nome aparecerá na listagem dos boletos.
          </p>

          {aliases.length > 0 && (
            <div className="space-y-2">
              {aliases.map(a => (
                <div key={a.id} className="flex items-center justify-between bg-slate-50 rounded-lg px-4 py-2.5">
                  <div>
                    <p className="text-sm font-bold text-slate-700">{a.alias}</p>
                    <p className="text-xs text-slate-400">{a.sender}</p>
                  </div>
                  <button type="button" onClick={() => handleDeleteAlias(a.id)}
                    className="text-red-400 hover:text-red-600 cursor-pointer transition-colors p-1">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center gap-2">
            <input type="text" value={aliasSender} onChange={e => setAliasSender(e.target.value)}
              placeholder="E-mail ou domínio (ex: @asaas.com)"
              className="flex-1 text-sm border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-purple-400 transition-colors"
            />
            <input type="text" value={aliasName} onChange={e => setAliasName(e.target.value)}
              placeholder="Nome (ex: MOVEK)"
              className="flex-1 text-sm border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-purple-400 transition-colors"
              onKeyDown={e => e.key === 'Enter' && handleSaveAlias()}
            />
            <button type="button" onClick={handleSaveAlias} disabled={!aliasSender.trim() || !aliasName.trim()}
              className="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-1 cursor-pointer transition-colors disabled:opacity-50">
              <Plus className="w-4 h-4" />
              Salvar
            </button>
          </div>
          <p className="text-[10px] text-slate-400">
            Dica: cadastre o domínio do remetente (ex: @movek.com.br) para agrupar todos os e-mails dele.
          </p>
        </div>
      )}

      {/* Provider Panel */}
      {connected === true && showProviders && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">
            Provedores de boletos
          </h3>
          <p className="text-xs text-slate-400 -mt-3">
            Cadastre provedores que exigem senha para acessar o PDF (ex: Lello Condomínios).
            O botão "Baixar boleto" aparecerá nos e-mails desses remetentes.
          </p>

          {providers.length > 0 && (
            <div className="space-y-2">
              {providers.map(p => (
                <div key={p.id} className="flex items-center justify-between bg-slate-50 rounded-lg px-4 py-2.5">
                  <div>
                    <p className="text-sm font-bold text-slate-700">{p.sender}</p>
                    <p className="text-xs text-slate-400">Senha: {'•'.repeat(8)}</p>
                  </div>
                  <button type="button" onClick={() => handleRemoveProvider(p.id)}
                    className="text-red-400 hover:text-red-600 cursor-pointer transition-colors p-1">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center gap-2">
            <input type="text" value={newProviderSender} onChange={e => setNewProviderSender(e.target.value)}
              placeholder="E-mail do remetente"
              className="flex-1 text-sm border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-amber-400 transition-colors"
            />
            <input type="password" value={newProviderPassword} onChange={e => setNewProviderPassword(e.target.value)}
              placeholder="Senha (CPF/CNPJ)"
              className="w-36 text-sm border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-amber-400 transition-colors"
              onKeyDown={e => e.key === 'Enter' && handleAddProvider()}
            />
            <button type="button" onClick={handleAddProvider}
              disabled={addingProvider || !newProviderSender.trim() || !newProviderPassword.trim()}
              className="bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-1 cursor-pointer transition-colors disabled:opacity-50">
              <Plus className="w-4 h-4" />
              {addingProvider ? '...' : 'Adicionar'}
            </button>
          </div>
        </div>
      )}

      {/* Connect Gmail Card */}
      {connected === false && !error && (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center shadow-sm">
          <Mail className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-slate-800 mb-2">Conectar Gmail</h3>
          <p className="text-sm text-slate-500 mb-6 max-w-md mx-auto">
            Conecte sua conta do Gmail para buscar automaticamente os boletos.
          </p>
          <button type="button" onClick={handleConnect} disabled={connecting}
            className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-sm uppercase tracking-wider px-8 py-4 rounded-xl flex items-center gap-2 mx-auto cursor-pointer transition-colors disabled:opacity-50">
            <Mail className="w-5 h-5" />
            {connecting ? 'Conectando...' : 'Conectar Gmail'}
          </button>
        </div>
      )}

      {/* Loading */}
      {loading && connected !== false && !error && (
        <div className="bg-white border border-slate-200 rounded-xl p-16 text-center shadow-sm">
          <RefreshCw className="w-10 h-10 text-slate-300 mx-auto mb-4 animate-spin" />
          <p className="text-base font-semibold text-slate-400">Buscando boletos...</p>
        </div>
      )}

      {/* Boleto List */}
      {!loading && connected === true && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          {activeBillSender && (
            <div className="flex items-center gap-2 px-6 py-2.5 bg-emerald-50 border-b border-emerald-200">
              <FileText className="w-4 h-4 text-emerald-600" />
              <span className="text-sm font-semibold text-emerald-700">
                Filtrando por: {aliasNameForSender(activeBillSender)}
              </span>
              <button onClick={clearBillFilter}
                className="ml-auto text-xs font-bold text-emerald-600 hover:text-emerald-500 bg-emerald-100 hover:bg-emerald-200 px-2.5 py-1 rounded-md cursor-pointer transition-colors">
                Limpar filtro
              </button>
            </div>
          )}
          {filteredEmails.length === 0 ? (
            <div className="p-16 text-center">
              <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-lg font-semibold text-slate-500">
                {searchMode === 'strict' ? 'Nenhum boleto nos filtros' : 'Nenhum boleto encontrado'}
              </p>
              <p className="text-sm text-slate-400 mt-1">
                {searchMode === 'strict'
                  ? 'Adicione filtros de assunto, remetente ou corpo para restringir a busca'
                  : 'Tente adicionar filtros ou apelidos para personalizar a busca'}
              </p>
            </div>
          ) : (
            <div>
              {filteredEmails.some(e => e.isNew) && (
                <div className="flex items-center gap-2 px-6 py-3 bg-amber-50 border-b border-amber-200">
                  <Bell className="w-4 h-4 text-amber-600" />
                  <span className="text-sm font-bold text-amber-700">
                    {filteredEmails.filter(e => e.isNew).length} novo(s) boleto(s)
                  </span>
                </div>
              )}
              <div className="divide-y divide-slate-100">
              {filteredEmails.map(email => (
                <div key={email.id} className={`px-6 py-5 hover:bg-slate-50 transition-colors group ${email.isNew ? 'bg-amber-50/40 border-l-4 border-l-amber-400' : ''}`}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <p className="text-base font-bold text-slate-800 truncate leading-snug">{email.subject}</p>
                      <p className="text-sm font-semibold text-slate-500">
                        {displayName(email)}
                      </p>
                      <p className="text-xs font-medium text-slate-400">
                        {formatDate(email.date)}
                      </p>
                      {email.snippet && (
                        <p className="text-sm text-slate-500 mt-2 leading-relaxed line-clamp-2">{email.snippet}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {email.hasAttachment && email.attachmentId && (
                        <>
                          <button type="button"
                            onClick={() => handleView(email.id, email.attachmentId!, email.filename || 'boleto.pdf')}
                            className="bg-blue-50 hover:bg-blue-100 text-blue-700 px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors">
                            <ExternalLink className="w-4 h-4" />
                            Visualizar
                          </button>
                          <button type="button"
                            onClick={() => handleDownload(email.id, email.attachmentId!, email.filename || 'boleto.pdf')}
                            className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
                            title="Baixar boleto">
                            <Download className="w-4 h-4" />
                            {email.filename?.replace(/.pdf$/i, '')?.substring(0, 15) || 'PDF'}
                          </button>
                        </>
                      )}
                      {!email.hasAttachment && email.boletoLink && (
                        <>
                          {email.hasProvider && (
                            <button type="button" onClick={() => handleDownloadProviderPdf(email)}
                              disabled={downloadingPdf === email.id}
                              className="bg-amber-50 hover:bg-amber-100 text-amber-700 px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors disabled:opacity-50">
                              <Download className="w-4 h-4" />
                              {downloadingPdf === email.id ? 'Baixando...' : 'Baixar boleto'}
                            </button>
                          )}
                          <a href={email.boletoLink} target="_blank" rel="noopener noreferrer" onClick={() => markEmailClicked(email.id)}
                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold cursor-pointer transition-colors bg-purple-50 hover:bg-purple-100 text-purple-700">
                            <ExternalLink className="w-4 h-4" />
                            Ver online
                          </a>
                        </>
                      )}
                      {!email.hasAttachment && !email.boletoLink && (
                        <span className="text-xs text-slate-300 italic px-1">Sem PDF</span>
                      )}
                      <button type="button" onClick={() => handleHideEmail(email.id)}
                        className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-500 cursor-pointer transition-all p-1.5 rounded-lg hover:bg-red-50"
                        title="Ocultar este e-mail">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
