import React, { useState, useEffect } from 'react';
import { UserPlus, Copy, Send, CheckCircle, Trash2, Pencil, X, Check } from 'lucide-react';

interface CadastroPendente {
  id: string;
  nome: string;
  documento: string;
  telefone: string;
  endereco: string;
  created_at: string;
}

export default function NovoCliente() {
  const [nome, setNome] = useState('');
  const [cpf, setCpf] = useState('');
  const [endereco, setEndereco] = useState('');
  const [telefone, setTelefone] = useState('');
  const [dataLocacao, setDataLocacao] = useState(() => new Date().toISOString().split('T')[0]);
  const [copyOk, setCopyOk] = useState<string | null>(null);
  const [pendentes, setPendentes] = useState<CadastroPendente[]>([]);
  const [enviando, setEnviando] = useState<string | null>(null);
  const [editando, setEditando] = useState<string | null>(null);
  const [editNome, setEditNome] = useState('');
  const [editCpf, setEditCpf] = useState('');
  const [editTel, setEditTel] = useState('');
  const [editEnd, setEditEnd] = useState('');

  const hora = new Date().getHours();
  const saudacao = hora < 12 ? 'BOM DIA' : hora < 18 ? 'BOA TARDE' : 'BOA NOITE';
  const dataFmt = new Date(dataLocacao + 'T12:00:00').toLocaleDateString('pt-BR');
  const baseUrl = window.location.origin;

  useEffect(() => {
    fetch('/api/cadastro-publico/pendentes')
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setPendentes(data); })
      .catch(() => {});
  }, []);

  const gerarMensagem = (c?: CadastroPendente) => {
    const n = c?.nome || nome;
    const d = c?.documento || cpf;
    const e = c?.endereco || endereco;
    const t = c?.telefone || telefone;
    const data = c?.created_at
      ? new Date(c.created_at).toLocaleDateString('pt-BR')
      : dataFmt;

    return (
      `${saudacao}\n\n` +
      `📋 *CADASTRO DE CLIENTE - RELÂMPAGO CAÇAMBAS*\n\n` +
      `👤 *Nome:* ${n}\n` +
      `📄 *CPF:* ${d}\n` +
      `📍 *Endereço:* ${e}\n` +
      `📱 *Telefone:* ${t}\n\n` +
      `💰 *Pagamento:* NA ENTREGA DA CAÇAMBA\n` +
      `📅 *Data da Locação:* ${data}\n\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `📄 *REGRAS DE CONTRATAÇÃO:*\n` +
      `${baseUrl}/regras.jpg\n\n` +
      `📄 *TERMOS DE CONTRATAÇÃO (PDF):*\n` +
      `${baseUrl}/termos.pdf\n` +
      `━━━━━━━━━━━━━━━━━━━━\n\n\n` +
      `💰 *CHAVE PIX (CNPJ):*\n` +
      `${baseUrl}/pix\n\n` +
      `RELÂMPAGO ATT\n\n` +
      `✅ *Cliente declara estar ciente e de acordo com os termos.*`
    );
  };

  const handleCopy = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setCopyOk(id);
    setTimeout(() => setCopyOk(null), 2000);
  };

  const handleSend = (text: string) => {
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  const handleEnviarPendente = (c: CadastroPendente) => {
    setEnviando(c.id);
    handleSend(gerarMensagem(c));
    setTimeout(() => setEnviando(null), 1000);
  };

  const handleApagarPendente = async (c: CadastroPendente) => {
    if (!confirm(`Apagar o cadastro de ${c.nome}?`)) return;
    await fetch(`/api/cadastro-publico/${c.id}`, { method: 'DELETE' }).catch(() => {});
    setPendentes(prev => prev.filter(p => p.id !== c.id));
  };

  const handleEditar = (c: CadastroPendente) => {
    setEditando(c.id);
    setEditNome(c.nome);
    setEditCpf(c.documento);
    setEditTel(c.telefone);
    setEditEnd(c.endereco);
  };

  const handleSalvarEdicao = async (c: CadastroPendente) => {
    await fetch(`/api/cadastro-publico/${c.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome: editNome, documento: editCpf, telefone: editTel, endereco: editEnd }),
    }).catch(() => {});
    setPendentes(prev => prev.map(p => p.id === c.id ? { ...p, nome: editNome, documento: editCpf, telefone: editTel, endereco: editEnd } : p));
    setEditando(null);
  };

  const handleEnviarTodos = () => {
    if (pendentes.length === 0) return;
    const texto = pendentes.map(c => gerarMensagem(c)).join('\n\n\n');
    handleSend(texto);
  };

  const isValid = nome.trim() && cpf.trim() && endereco.trim();

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Cadastros Pendentes */}
      {pendentes.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-5 py-3 bg-amber-50 border-b border-amber-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-amber-600 text-lg">🔔</span>
              <h3 className="text-sm font-bold text-amber-800">
                Cadastros Pendentes
              </h3>
              <span className="bg-amber-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                {pendentes.length}
              </span>
            </div>
            {pendentes.length > 1 && (
              <button
                onClick={handleEnviarTodos}
                className="text-xs font-bold text-amber-700 hover:text-amber-900 transition-all cursor-pointer"
              >
                Enviar Todos
              </button>
            )}
          </div>
          <div className="p-4 space-y-3">
            {pendentes.map(c => (
              <div key={c.id} className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                {editando === c.id ? (
                  <div className="space-y-3">
                    <input value={editNome} onChange={e => setEditNome(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/30" placeholder="Nome" />
                    <div className="grid grid-cols-2 gap-3">
                      <input value={editCpf} onChange={e => setEditCpf(e.target.value)} className="px-3 py-2 border border-slate-200 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/30" placeholder="CPF" />
                      <input value={editTel} onChange={e => setEditTel(e.target.value)} className="px-3 py-2 border border-slate-200 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/30" placeholder="Telefone" />
                    </div>
                    <input value={editEnd} onChange={e => setEditEnd(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/30" placeholder="Endereço" />
                    <div className="flex items-center gap-2">
                      <button onClick={() => handleSalvarEdicao(c)} className="py-2 px-4 rounded-xl font-bold text-xs bg-emerald-500 text-white hover:bg-emerald-600 cursor-pointer flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5" /> Salvar
                      </button>
                      <button onClick={() => setEditando(null)} className="py-2 px-4 rounded-xl font-bold text-xs bg-slate-200 text-slate-600 hover:bg-slate-300 cursor-pointer flex items-center gap-1.5">
                        <X className="w-3.5 h-3.5" /> Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-slate-800 truncate">{c.nome}</p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {c.documento} · {c.telefone}
                      </p>
                      {c.endereco && (
                        <p className="text-xs text-slate-400 mt-0.5 truncate">{c.endereco}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 ml-3 shrink-0">
                      <button
                        onClick={() => handleEditar(c)}
                        className="py-2 px-2.5 rounded-xl font-bold text-xs bg-blue-50 text-blue-500 hover:bg-blue-100 border border-blue-200 transition-all cursor-pointer"
                        title="Editar"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleApagarPendente(c)}
                        className="py-2 px-2.5 rounded-xl font-bold text-xs bg-red-50 text-red-500 hover:bg-red-100 border border-red-200 transition-all cursor-pointer"
                        title="Apagar"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleEnviarPendente(c)}
                        disabled={enviando === c.id}
                        className="py-2 px-4 rounded-xl font-bold text-xs bg-[#25D366] text-white hover:bg-[#20b858] transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                      >
                        <Send className="w-3.5 h-3.5" />
                        {enviando === c.id ? '...' : 'Enviar'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center shadow-lg">
          <UserPlus className="w-5 h-5 text-white" />
        </div>
        <div>
          <h2 className="text-lg font-black font-sans text-slate-900">Novo Cliente</h2>
          <p className="text-xs text-slate-400 font-medium">Preencha os dados e envie tudo de uma vez</p>
        </div>
      </div>

      {/* Form */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 space-y-4">
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Nome Completo *</label>
          <input
            type="text"
            value={nome}
            onChange={e => setNome(e.target.value)}
            placeholder="João da Silva"
            className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">CPF/CNPJ *</label>
            <input
              type="text"
              value={cpf}
              onChange={e => setCpf(e.target.value)}
              placeholder="000.000.000-00"
              className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Telefone</label>
            <input
              type="tel"
              value={telefone}
              onChange={e => setTelefone(e.target.value)}
              placeholder="(11) 99999-9999"
              className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Endereço Completo *</label>
          <input
            type="text"
            value={endereco}
            onChange={e => setEndereco(e.target.value)}
            placeholder="Rua X, 123 - Bairro - Cidade/UF"
            className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Data da Locação</label>
          <input
            type="date"
            value={dataLocacao}
            onChange={e => setDataLocacao(e.target.value)}
            className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all"
          />
        </div>
      </div>

      {/* Preview + Ações */}
      {isValid && (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-5 py-3 bg-slate-50 border-b border-slate-100">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Preview da Mensagem</h3>
          </div>
          <div className="p-5 space-y-4">
            <pre className="text-xs text-slate-700 whitespace-pre-wrap font-sans leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-100">
              {gerarMensagem()}
            </pre>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleSend('💰 *CHAVE PIX (CNPJ):*\n16.403.233.0001-75')}
                className="py-3 rounded-xl font-bold text-sm bg-amber-500 text-white hover:bg-amber-600 transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                💰 Enviar PIX
              </button>
              <button
                type="button"
                onClick={() => handleSend(gerarMensagem())}
                className="py-3 rounded-xl font-bold text-sm bg-[#25D366] text-white hover:bg-[#20b858] transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <Send className="w-4 h-4" />
                Enviar WhatsApp
              </button>
              <button
                type="button"
                onClick={() => handleCopy(gerarMensagem(), 'msg')}
                className={`py-3 rounded-xl font-bold text-sm border-2 transition-all cursor-pointer flex items-center justify-center gap-2 ${
                  copyOk === 'msg'
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                {copyOk === 'msg' ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copyOk === 'msg' ? '✓ Copiado!' : '📋 Copiar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
