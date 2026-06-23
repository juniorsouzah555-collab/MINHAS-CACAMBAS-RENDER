import React, { useState, useCallback } from 'react';
import { FileText, Mail, Download, RefreshCw, AlertCircle, CheckCircle2, LogOut } from 'lucide-react';

const API_BASE = window.location.origin;

interface BoletoEmail {
  id: string;
  subject: string;
  from: string;
  date: string;
  snippet: string;
  hasAttachment: boolean;
  attachmentId?: string;
  filename?: string;
  mimeType?: string;
}

export default function BoletoView() {
  const [connected, setConnected] = useState<boolean | null>(null);
  const [emails, setEmails] = useState<BoletoEmail[]>([]);
  const [loading, setLoading] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBoletos = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch(`${API_BASE}/api/gmail?action=fetch`);
      const data = await r.json();
      setConnected(data.connected);
      if (data.emails) setEmails(data.emails);
      if (data.error) setError(data.error);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => { fetchBoletos(); }, [fetchBoletos]);

  const handleConnect = () => {
    setConnecting(true);
    window.location.href = `${API_BASE}/api/gmail?action=auth`;
  };

  const handleDisconnect = async () => {
    if (!confirm('Desconectar o Gmail? Os boletos não serão mais buscados automaticamente.')) return;
    setDisconnecting(true);
    setError(null);
    try {
      const r = await fetch(`${API_BASE}/api/gmail?action=disconnect`, { method: 'POST' });
      const result = await r.json();
      if (r.ok) {
        setConnected(false);
        setEmails([]);
      } else {
        setError(result?.error || 'Erro ao desconectar');
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setDisconnecting(false);
    }
  };

  const handleDownload = async (msgId: string, attachmentId: string, filename: string) => {
    try {
      const url = `${API_BASE}/api/gmail?action=download&msgId=${msgId}&attachmentId=${attachmentId}&filename=${encodeURIComponent(filename)}`;
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
    } catch {}
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch { return dateStr; }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black font-sans text-slate-900 flex items-center gap-2">
            <FileText className="w-5 h-5 text-emerald-600" />
            Boletos
          </h2>
          <p className="text-xs text-slate-400 font-medium mt-0.5">
            Boletos recebidos por e-mail — integração Gmail
          </p>
        </div>
        <div className="flex items-center gap-2">
          {connected === true && (
            <button
              type="button"
              onClick={handleDisconnect}
              disabled={disconnecting}
              className="bg-red-50 hover:bg-red-100 text-red-600 border border-red-200/60 px-3 py-1.5 rounded-lg text-[10px] font-bold flex items-center gap-1.5 cursor-pointer transition-colors disabled:opacity-50"
            >
              <LogOut className="w-3 h-3" />
              {disconnecting ? 'Desconectando...' : 'Desconectar'}
            </button>
          )}
          {connected === true && (
            <span className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200/60 px-3 py-1.5 rounded-lg">
              <CheckCircle2 className="w-3 h-3" />
              Conectado
            </span>
          )}
          <button
            type="button"
            onClick={fetchBoletos}
            disabled={loading}
            className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200/60 rounded-xl px-5 py-3 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
          <p className="text-[11px] font-semibold text-red-700">{error}</p>
        </div>
      )}

      {/* Connect Gmail Card */}
      {connected === false && !error && (
        <div className="bg-white border border-slate-200 rounded-xl p-8 text-center shadow-sm">
          <Mail className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-base font-bold text-slate-800 mb-2">Conectar Gmail</h3>
          <p className="text-xs text-slate-500 mb-6 max-w-md mx-auto">
            Conecte sua conta do Gmail para buscar automaticamente os boletos que chegam todo mês.
            Usaremos apenas acesso de leitura para identificar e-mails com boletos anexados.
          </p>
          <button
            type="button"
            onClick={handleConnect}
            disabled={connecting}
            className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs uppercase tracking-wider px-6 py-3 rounded-xl flex items-center gap-2 mx-auto cursor-pointer transition-colors disabled:opacity-50"
          >
            <Mail className="w-4 h-4" />
            {connecting ? 'Conectando...' : 'Conectar Gmail'}
          </button>
        </div>
      )}

      {/* Loading */}
      {loading && connected !== false && !error && (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center shadow-sm">
          <RefreshCw className="w-8 h-8 text-slate-300 mx-auto mb-3 animate-spin" />
          <p className="text-xs font-semibold text-slate-400">Buscando boletos...</p>
        </div>
      )}

      {/* Boleto List */}
      {!loading && connected === true && !error && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          {emails.length === 0 ? (
            <div className="p-12 text-center">
              <FileText className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-sm font-semibold text-slate-500">Nenhum boleto encontrado</p>
              <p className="text-[10px] text-slate-400 mt-1">
                Os e-mails com "boleto" ou "fatura" no assunto aparecerão aqui
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {emails.map((email) => (
                <div key={email.id} className="px-5 py-4 hover:bg-slate-50 transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-slate-800 truncate">{email.subject}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        {email.from} • {formatDate(email.date)}
                      </p>
                      <p className="text-[11px] text-slate-500 mt-1.5 leading-relaxed line-clamp-2">{email.snippet}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {email.hasAttachment && email.attachmentId && (
                        <button
                          type="button"
                          onClick={() => handleDownload(email.id, email.attachmentId!, email.filename || 'boleto.pdf')}
                          className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 px-3 py-1.5 rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                          title="Baixar boleto"
                        >
                          <Download className="w-3 h-3" />
                          {email.filename?.replace(/.pdf$/i, '')?.substring(0, 15) || 'PDF'}
                        </button>
                      )}
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
