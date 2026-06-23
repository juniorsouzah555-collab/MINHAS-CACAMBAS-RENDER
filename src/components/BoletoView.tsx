import React, { useState, useCallback, useEffect } from 'react';
import { FileText, Mail, Download, RefreshCw, AlertCircle, CheckCircle2, LogOut, Settings, Plus, X, ExternalLink, Trash2, Edit3 } from 'lucide-react';

const API_BASE = window.location.origin;

interface BoletoEmail {
  id: string; subject: string; from: string; date: string; snippet: string;
  hasAttachment: boolean; attachmentId?: string; filename?: string; mimeType?: string;
  boletoLink?: string; alias?: string;
}

interface Filter {
  id: number; type: string; value: string;
}

interface Alias {
  id: number; sender: string; alias: string;
}

export default function BoletoView() {
  const [connected, setConnected] = useState<boolean | null>(null);
  const [emails, setEmails] = useState<BoletoEmail[]>([]);
  const [aliases, setAliases] = useState<Alias[]>([]);
  const [loading, setLoading] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchMode, setSearchMode] = useState<'strict' | 'broad'>('strict');

  const [filters, setFilters] = useState<Filter[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [newType, setNewType] = useState<'sender' | 'subject' | 'body'>('sender');
  const [newValue, setNewValue] = useState('');
  const [addingFilter, setAddingFilter] = useState(false);

  const [showAliasPanel, setShowAliasPanel] = useState(false);
  const [editingAlias, setEditingAlias] = useState<Alias | null>(null);
  const [aliasSender, setAliasSender] = useState('');
  const [aliasName, setAliasName] = useState('');

  const fetchBoletos = useCallback(async (mode?: 'strict' | 'broad') => {
    const m = mode || searchMode;
    setLoading(true); setError(null);
    try {
      const r = await fetch(`${API_BASE}/api/gmail?action=fetch&mode=${m}`);
      const data = await r.json();
      setConnected(data.connected);
      if (data.emails) setEmails(data.emails);
      if (data.aliases) setAliases(data.aliases);
      if (data.error) setError(data.error);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }, [searchMode]);

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

  const handleDownload = (msgId: string, attachmentId: string, filename: string) => {
    const url = `${API_BASE}/api/gmail?action=download&msgId=${msgId}&attachmentId=${attachmentId}&filename=${encodeURIComponent(filename)}`;
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.click();
  };

  const handleView = (msgId: string, attachmentId: string, filename: string) => {
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
  };

  const toggleAliasPanel = () => {
    if (!showAliasPanel) fetchAliases();
    setShowAliasPanel(!showAliasPanel);
    setShowFilters(false);
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
          {emails.length === 0 ? (
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
            <div className="divide-y divide-slate-100">
              {emails.map(email => (
                <div key={email.id} className="px-6 py-5 hover:bg-slate-50 transition-colors group">
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
                        <a href={email.boletoLink} target="_blank" rel="noopener noreferrer"
                          className="bg-purple-50 hover:bg-purple-100 text-purple-700 px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors">
                          <ExternalLink className="w-4 h-4" />
                          Ver online
                        </a>
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
          )}
        </div>
      )}
    </div>
  );
}
