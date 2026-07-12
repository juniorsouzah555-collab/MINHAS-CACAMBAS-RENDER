import React, { useState } from 'react';
import { UserPlus, Copy, Send, CheckCircle } from 'lucide-react';

export default function NovoCliente() {
  const [nome, setNome] = useState('');
  const [cpf, setCpf] = useState('');
  const [endereco, setEndereco] = useState('');
  const [telefone, setTelefone] = useState('');
  const [dataLocacao, setDataLocacao] = useState(() => new Date().toISOString().split('T')[0]);
  const [copyOk, setCopyOk] = useState(false);

  const hora = new Date().getHours();
  const saudacao = hora < 12 ? 'BOM DIA' : hora < 18 ? 'BOA TARDE' : 'BOA NOITE';
  const dataFmt = new Date(dataLocacao + 'T12:00:00').toLocaleDateString('pt-BR');
  const baseUrl = window.location.origin;

  const gerarMensagem = () => {
    return (
      `${saudacao}\n\n` +
      `📋 *CADASTRO DE CLIENTE - RELÂMPAGO CAÇAMBAS*\n\n` +
      `👤 *Nome:* ${nome}\n` +
      `📄 *CPF:* ${cpf}\n` +
      `📍 *Endereço:* ${endereco}\n` +
      `📱 *Telefone:* ${telefone}\n\n` +
      `💰 *Pagamento:* NA ENTREGA DA CAÇAMBA\n` +
      `📅 *Data da Locação:* ${dataFmt}\n\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `📄 *REGRAS DE CONTRATAÇÃO:*\n` +
      `${baseUrl}/regras.jpg\n` +
      `📄 *TERMOS DE CONTRATAÇÃO (PDF):*\n` +
      `${baseUrl}/termos.pdf\n` +
      `━━━━━━━━━━━━━━━━━━━━\n\n` +
      `PIX CNPJ *16.403.233.0001-75*\n` +
      `RELÂMPAGO ATT\n\n` +
      `✅ *Cliente declara estar ciente e de acordo com os termos.*`
    );
  };

  const handleCopy = async () => {
    const msg = gerarMensagem();
    try {
      await navigator.clipboard.writeText(msg);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = msg;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setCopyOk(true);
    setTimeout(() => setCopyOk(false), 2000);
  };

  const handleSend = () => {
    const msg = gerarMensagem();
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const isValid = nome.trim() && cpf.trim() && endereco.trim();

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
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
              type="text"
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
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleCopy}
                className={`flex-1 py-3 rounded-xl font-bold text-sm border-2 transition-all cursor-pointer flex items-center justify-center gap-2 ${
                  copyOk
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                {copyOk ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copyOk ? '✓ Copiado!' : '📋 Copiar Tudo'}
              </button>
              <button
                type="button"
                onClick={handleSend}
                className="flex-1 py-3 rounded-xl font-bold text-sm bg-[#25D366] text-white hover:bg-[#20b858] transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <Send className="w-4 h-4" />
                🟢 Enviar no WhatsApp
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
