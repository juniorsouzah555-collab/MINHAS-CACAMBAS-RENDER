import React, { useState } from 'react';
import { UserPlus, Copy, Send, CheckCircle, FileText, Image, CreditCard, MessageCircle } from 'lucide-react';

export default function NovoCliente() {
  const [nome, setNome] = useState('');
  const [cpf, setCpf] = useState('');
  const [endereco, setEndereco] = useState('');
  const [telefone, setTelefone] = useState('');
  const [dataLocacao, setDataLocacao] = useState(() => new Date().toISOString().split('T')[0]);
  const [copyOk, setCopyOk] = useState<string | null>(null);

  const hoje = new Date().toLocaleDateString('pt-BR');
  const hora = new Date().getHours();
  const saudacao = hora < 12 ? 'BOM DIA' : hora < 18 ? 'BOA TARDE' : 'BOA NOITE';
  const dataFmt = new Date(dataLocacao + 'T12:00:00').toLocaleDateString('pt-BR');

  // ── MENSAGEM 1: Cadastro do Cliente ──
  const msg1 =
    `📋 *CADASTRO DE CLIENTE - RELÂMPAGO CAÇAMBAS*\n\n` +
    `👤 *Nome:* ${nome}\n` +
    `📄 *CPF:* ${cpf}\n` +
    `📍 *Endereço:* ${endereco}\n` +
    `📱 *Telefone:* ${telefone}\n\n` +
    `📅 *Data:* ${hoje}\n` +
    `✅ *Cliente declara estar ciente e de acordo com os termos de contratação.*`;

  // ── MENSAGEM 2: Dados de Pagamento ──
  const msg2 =
    `${saudacao}\n\n` +
    `SEGUEM DADOS PARA PAGAMENTO REFERENTE A CAÇAMBA LOCADA DIA *${dataFmt}*\n\n` +
    `O PAGAMENTO DEVERÁ SER REALIZADO NA ENTREGA DA CAÇAMBA\n\n` +
    `ENDEREÇO: ${endereco}\n\n` +
    `PIX CNPJ *16.403.233.0001-75*\n` +
    `RELÂMPAGO ATT`;

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
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
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
          <p className="text-xs text-slate-400 font-medium">Preencha e envie as 3 mensagens pro cliente</p>
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

      {/* Mensagens geradas */}
      {isValid && (
        <div className="space-y-4">
          {/* MENSAGEM 1: Cadastro */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-5 py-3 bg-blue-50 border-b border-blue-100 flex items-center justify-between">
              <h3 className="text-xs font-bold text-blue-700 uppercase tracking-wider flex items-center gap-2">
                <MessageCircle className="w-3.5 h-3.5" />
                1ª Mensagem — Cadastro do Cliente
              </h3>
              <span className="text-[10px] font-bold text-blue-400">Envie primeiro</span>
            </div>
            <div className="p-4">
              <pre className="text-xs text-slate-700 whitespace-pre-wrap font-sans leading-relaxed bg-slate-50 p-3 rounded-lg mb-3">
                {msg1}
              </pre>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => handleCopy(msg1, 'msg1')}
                  className={`flex-1 py-2.5 rounded-lg text-xs font-bold border-2 transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    copyOk === 'msg1'
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {copyOk === 'msg1' ? <CheckCircle className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copyOk === 'msg1' ? '✓ Copiado!' : 'Copiar'}
                </button>
                <button
                  type="button"
                  onClick={() => handleSend(msg1)}
                  className="flex-1 py-2.5 rounded-lg text-xs font-bold bg-[#25D366] text-white hover:bg-[#20b858] transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  Enviar
                </button>
              </div>
            </div>
          </div>

          {/* MENSAGEM 2: Foto + PDF */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-5 py-3 bg-amber-50 border-b border-amber-100 flex items-center justify-between">
              <h3 className="text-xs font-bold text-amber-700 uppercase tracking-wider flex items-center gap-2">
                <Image className="w-3.5 h-3.5" />
                2ª Mensagem — Regras e Termos
              </h3>
              <span className="text-[10px] font-bold text-amber-400">Envie depois do cadastro</span>
            </div>
            <div className="p-4 space-y-3">
              <p className="text-xs text-amber-600">
                Envie a foto das regras e o PDF dos termos. O cliente deve ler e concordar.
              </p>
              <div className="flex gap-2">
                <a
                  href="/regras.jpg"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 py-2.5 rounded-lg text-xs font-bold bg-white border border-amber-200 text-amber-700 hover:bg-amber-50 transition-all flex items-center justify-center gap-1.5 no-underline"
                >
                  <Image className="w-3.5 h-3.5" />
                  Foto Regras
                </a>
                <a
                  href="/termos.pdf"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 py-2.5 rounded-lg text-xs font-bold bg-white border border-amber-200 text-amber-700 hover:bg-amber-50 transition-all flex items-center justify-center gap-1.5 no-underline"
                >
                  <FileText className="w-3.5 h-3.5" />
                  PDF Termos
                </a>
              </div>
            </div>
          </div>

          {/* MENSAGEM 3: Pagamento */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-5 py-3 bg-emerald-50 border-b border-emerald-100 flex items-center justify-between">
              <h3 className="text-xs font-bold text-emerald-700 uppercase tracking-wider flex items-center gap-2">
                <CreditCard className="w-3.5 h-3.5" />
                3ª Mensagem — Dados de Pagamento
              </h3>
              <span className="text-[10px] font-bold text-emerald-400">Envie por último</span>
            </div>
            <div className="p-4">
              <pre className="text-xs text-slate-700 whitespace-pre-wrap font-sans leading-relaxed bg-slate-50 p-3 rounded-lg mb-3">
                {msg2}
              </pre>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => handleCopy(msg2, 'msg2')}
                  className={`flex-1 py-2.5 rounded-lg text-xs font-bold border-2 transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    copyOk === 'msg2'
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {copyOk === 'msg2' ? <CheckCircle className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copyOk === 'msg2' ? '✓ Copiado!' : 'Copiar'}
                </button>
                <button
                  type="button"
                  onClick={() => handleSend(msg2)}
                  className="flex-1 py-2.5 rounded-lg text-xs font-bold bg-[#25D366] text-white hover:bg-[#20b858] transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  Enviar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
