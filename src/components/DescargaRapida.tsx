import React, { useState, useEffect } from 'react';
import { MapPin, Minus, Plus, CheckCircle2, Truck, Clock, Send } from 'lucide-react';
import { BotaFora, Vehicle } from '../types';

interface DescargaRapidaProps {
  motorista: string;
  veiculo: string;
  botaForas: BotaFora[];
  vehicles: Vehicle[];
  onSuccess?: () => void;
}

export default function DescargaRapida({ motorista, veiculo, botaForas, vehicles, onSuccess }: DescargaRapidaProps) {
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>(veiculo || '');
  const [selectedBotaFora, setSelectedBotaFora] = useState<string>('');
  const [quantidade, setQuantidade] = useState<number>(1);
  const [data, setData] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [observacao, setObservacao] = useState('');
  const [valorCustomizado, setValorCustomizado] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const selectedBf = botaForas.find(b => b.id === selectedBotaFora);
  const isPortoDeAreia = selectedBf?.nome?.toUpperCase().includes('PORTO DE AREIA') || false;

  const handleSubmit = async () => {
    if (!selectedBotaFora) { setError('Selecione o local de descarga'); return; }
    if (!selectedVehicleId) { setError('Selecione o veículo'); return; }
    if (isPortoDeAreia && (!valorCustomizado || parseFloat(valorCustomizado) <= 0)) { setError('Informe o valor do descarte'); return; }
    setSending(true);
    setError('');
    try {
      const valorFinal = isPortoDeAreia
        ? parseFloat(valorCustomizado)
        : (selectedBf?.valorPadraoDescarte || 0) * quantidade;
      const res = await fetch('/api/descarga-rapida', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: crypto.randomUUID(),
          bota_fora_id: selectedBotaFora,
          bota_fora_nome: selectedBf?.nome || '',
          quantidade_cacambas: quantidade,
          valor: valorFinal,
          data,
          driver_name: motorista,
          vehicle_id: selectedVehicleId,
          status: 'CONCLUIDO',
          observacao: observacao || `Descarga rápida via WhatsApp`,
          created_at: new Date().toISOString(),
        }),
      });
      if (!res.ok) throw new Error('Erro ao enviar');
      setSent(true);
      if (onSuccess) onSuccess();
    } catch (e: any) {
      setError('Erro ao registrar. Tente novamente.');
    } finally {
      setSending(false);
    }
  };

  if (sent) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl p-8 text-center max-w-sm w-full shadow-2xl">
          <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
          <h2 className="text-xl font-black text-slate-900 mb-2">Descarga Registrada!</h2>
          <p className="text-sm text-slate-500 mb-1">{quantidade} caçamba{quantidade > 1 ? 's' : ''}</p>
          <p className="text-sm text-slate-500 mb-4">{botaForas.find(b => b.id === selectedBotaFora)?.nome}</p>
          <p className="text-xs text-slate-400 mb-4">{motorista} • {selectedVehicleId}</p>

          {/* Botão WhatsApp */}
          {(() => {
            const local = botaForas.find(b => b.id === selectedBotaFora)?.nome || '';
            const dataFmt = new Date(data + 'T12:00:00').toLocaleDateString('pt-BR');
            const valorTotal = isPortoDeAreia
              ? parseFloat(valorCustomizado || '0')
              : (botaForas.find(b => b.id === selectedBotaFora)?.valorPadraoDescarte || 0) * quantidade;
            const valorLinha = valorTotal > 0 ? `\n💰 Valor: R$ ${valorTotal.toFixed(2).replace('.', ',')}` : '';
            const msg = encodeURIComponent(
              `✅ *Descarga registrada*\n` +
              `📍 Local: ${local}\n` +
              `📦 Quantidade: ${quantidade} caçamba${quantidade > 1 ? 's' : ''}\n` +
              valorLinha +
              `🚛 Veículo: ${selectedVehicleId}\n` +
              `👷 Motorista: ${motorista}\n` +
              `📅 Data: ${dataFmt}` +
              (observacao ? `\n📝 Obs: ${observacao}` : '')
            );
            return (
              <a
                href={`https://wa.me/?text=${msg}`}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full bg-[#25D366] text-white py-3 rounded-xl font-bold text-sm hover:bg-[#20b858] transition-all cursor-pointer text-center no-underline"
              >
                📲 Enviar pro WhatsApp
              </a>
            );
          })()}

          <button
            onClick={() => { setSent(false); setSelectedBotaFora(''); setSelectedVehicleId(''); setQuantidade(1); setObservacao(''); }}
            className="mt-3 w-full bg-slate-100 text-slate-600 py-3 rounded-xl font-bold text-sm hover:bg-slate-200 cursor-pointer"
          >
            Nova Descarga
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-indigo-950 p-4">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="text-center mb-6 pt-4">
          <Truck className="w-10 h-10 text-emerald-400 mx-auto mb-2" />
          <h1 className="text-lg font-black text-white">Registrar Descarga</h1>
          <div className="flex items-center justify-center gap-3 mt-2 text-xs text-slate-300">
            <span className="flex items-center gap-1"><span className="text-emerald-400 font-bold">{motorista}</span></span>
          </div>
        </div>

        {/* Form */}
        <div className="bg-white rounded-2xl p-5 shadow-2xl space-y-5">

          {/* Veículo */}
          <div>
            <label className="text-[10px] font-black uppercase text-slate-400 mb-2 block tracking-wider">Qual veículo?</label>
            <div className="grid grid-cols-2 gap-2">
              {vehicles.filter(v => v.isActive).map(v => (
                <button
                  key={v.id}
                  onClick={() => { setSelectedVehicleId(v.id); setError(''); }}
                  className={`p-3 rounded-xl border-2 text-left transition-all cursor-pointer ${
                    selectedVehicleId === v.id
                      ? 'border-blue-500 bg-blue-50 shadow-md'
                      : 'border-slate-200 hover:border-slate-300 bg-slate-50'
                  }`}
                >
                  <Truck className={`w-4 h-4 mb-1 ${selectedVehicleId === v.id ? 'text-blue-600' : 'text-slate-400'}`} />
                  <span className={`text-xs font-bold block ${selectedVehicleId === v.id ? 'text-blue-800' : 'text-slate-700'}`}>
                    {v.id}
                  </span>
                  <span className="text-[10px] text-slate-400">{v.driver || 'Sem motorista'}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Local */}
          <div>
            <label className="text-[10px] font-black uppercase text-slate-400 mb-2 block tracking-wider">Onde descarregou?</label>
            <div className="grid grid-cols-2 gap-2">
              {botaForas.map(bf => (
                <button
                  key={bf.id}
                  onClick={() => { setSelectedBotaFora(bf.id); setError(''); }}
                  className={`p-3 rounded-xl border-2 text-left transition-all cursor-pointer ${
                    selectedBotaFora === bf.id
                      ? 'border-emerald-500 bg-emerald-50 shadow-md'
                      : 'border-slate-200 hover:border-slate-300 bg-slate-50'
                  }`}
                >
                  <MapPin className={`w-4 h-4 mb-1 ${selectedBotaFora === bf.id ? 'text-emerald-600' : 'text-slate-400'}`} />
                  <span className={`text-xs font-bold block ${selectedBotaFora === bf.id ? 'text-emerald-800' : 'text-slate-700'}`}>
                    {bf.nome}
                  </span>
                  {bf.valorPadraoDescarte ? (
                    <span className="text-[10px] text-slate-400">R$ {bf.valorPadraoDescarte.toFixed(0)}/caçamba</span>
                  ) : null}
                </button>
              ))}
            </div>
          </div>

          {/* Quantidade */}
          <div>
            <label className="text-[10px] font-black uppercase text-slate-400 mb-2 block tracking-wider">Quantidade de caçambas</label>
            <div className="flex items-center justify-center gap-6">
              <button
                onClick={() => setQuantidade(q => Math.max(1, q - 1))}
                className="w-14 h-14 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center hover:bg-red-200 active:scale-95 transition-all cursor-pointer"
              >
                <Minus className="w-6 h-6" />
              </button>
              <span className="text-5xl font-black text-slate-900 w-20 text-center font-mono">{quantidade}</span>
              <button
                onClick={() => setQuantidade(q => q + 1)}
                className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center hover:bg-emerald-200 active:scale-95 transition-all cursor-pointer"
              >
                <Plus className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* Valor do descarte — só PORTO DE AREIA */}
          {isPortoDeAreia && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <label className="text-[10px] font-black uppercase text-amber-700 mb-1 block tracking-wider">Valor total do descarte (R$)</label>
              <input
                type="number"
                value={valorCustomizado}
                onChange={e => setValorCustomizado(e.target.value)}
                placeholder="Ex: 350"
                className="w-full bg-white border border-amber-300 rounded-xl px-4 py-3 text-lg font-bold text-amber-900 placeholder:text-amber-300 focus:outline-none focus:border-amber-500"
              />
            </div>
          )}

          {/* Data */}
          <div>
            <label className="text-[10px] font-black uppercase text-slate-400 mb-1 block tracking-wider">Data</label>
            <input
              type="date"
              value={data}
              onChange={e => setData(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-800 focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Observação */}
          <div>
            <label className="text-[10px] font-black uppercase text-slate-400 mb-1 block tracking-wider">Observação (opcional)</label>
            <input
              type="text"
              value={observacao}
              onChange={e => setObservacao(e.target.value)}
              placeholder="Ex: descarregou tudo, cliente satisfeito..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 placeholder:text-slate-300 focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Erro */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-xs font-bold text-red-600 text-center">
              {error}
            </div>
          )}

          {/* Enviar */}
          <button
            onClick={handleSubmit}
            disabled={sending || !selectedBotaFora}
            className={`w-full py-4 rounded-xl font-black text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
              sending || !selectedBotaFora
                ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                : 'bg-emerald-600 text-white hover:bg-emerald-700 active:scale-[0.98] shadow-lg shadow-emerald-500/30'
            }`}
          >
            {sending ? (
              <span className="animate-pulse">Enviando...</span>
            ) : (
              <>
                <Send className="w-4 h-4" />
                Registrar Descarga
              </>
            )}
          </button>

          {/* Info */}
          <div className="text-center">
            <Clock className="w-3 h-3 text-slate-300 inline mr-1" />
            <span className="text-[10px] text-slate-300">
              {new Date().toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
