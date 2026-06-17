/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { X, ClipboardCheck, Calendar, DollarSign, Archive, User, Truck, Coins } from 'lucide-react';
import { BotaFora, Vehicle, Lancamento } from '../types';

interface NewDispatchModalProps {
  botaForas: BotaFora[];
  vehicles: Vehicle[];
  motoristas: string[];
  onClose: () => void;
  onSubmit: (lancamento: Omit<Lancamento, 'id' | 'createdAt'>) => void;
}

export default function NewDispatchModal({ botaForas, vehicles, motoristas, onClose, onSubmit }: NewDispatchModalProps) {
  // Fields: Bota Fora, Quantidade de Caçambas, Valor, Data, and optional vehicle/driver
  const [botaForaId, setBotaForaId] = useState('');
  const [quantidadeCacambas, setQuantidadeCacambas] = useState(1);
  const [valor, setValor] = useState(250.00);
  const [data, setData] = useState(() => {
    // Current date default in format YYYY-MM-DD
    return new Date().toISOString().split('T')[0];
  });
  const [selectedVehicleId, setSelectedVehicleId] = useState('');
  const [driverName, setDriverName] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Pre-select first bota fora and first vehicle
  useEffect(() => {
    if (botaForas.length > 0) {
      const firstBtf = botaForas[0];
      setBotaForaId(firstBtf.id);
      if (firstBtf.valorPadraoDescarte !== undefined && firstBtf.valorPadraoDescarte > 0) {
        setValor(firstBtf.valorPadraoDescarte * quantidadeCacambas);
      }
    }
  }, [botaForas]);

  // Automatically update the default disposal cost based on the chosen landfill + quantity
  useEffect(() => {
    if (botaForaId) {
      const selected = botaForas.find(b => b.id === botaForaId);
      if (selected && selected.valorPadraoDescarte !== undefined && selected.valorPadraoDescarte > 0) {
        setValor(selected.valorPadraoDescarte * quantidadeCacambas);
      }
    }
  }, [botaForaId, quantidadeCacambas, botaForas]);

  useEffect(() => {
    if (vehicles.length > 0) {
      const available = vehicles.find(v => v.status !== 'Maintenance') || vehicles[0];
      setSelectedVehicleId(available.id);
      setDriverName(available.driver);
    }
  }, [vehicles]);

  // Auto-populate driver name when vehicle is chosen
  const handleVehicleChange = (id: string) => {
    setSelectedVehicleId(id);
    const selected = vehicles.find(v => v.id === id);
    if (selected) {
      setDriverName(selected.driver);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!botaForaId) {
      setErrorMsg('Por favor, selecione um Bota Fora cadastrado.');
      return;
    }
    if (quantidadeCacambas <= 0) {
      setErrorMsg('A quantidade de caçambas deve ser um número positivo maior que zero.');
      return;
    }
    if (valor <= 0) {
      setErrorMsg('O valor total do descarte deve ser maior que zero.');
      return;
    }
    if (!data) {
      setErrorMsg('Por favor, defina a data do descarte.');
      return;
    }

    const targetBotaFora = botaForas.find(b => b.id === botaForaId);
    const botaForaNome = targetBotaFora ? targetBotaFora.nome : 'Bota Fora Geral';

    onSubmit({
      botaForaId,
      botaForaNome,
      quantidadeCacambas: Number(quantidadeCacambas),
      valor: Number(valor),
      data,
      vehicleId: selectedVehicleId || undefined,
      driverName: driverName.trim() || undefined,
      status: 'Concluido'
    });
  };

  const selectedBtfObj = botaForas.find(b => b.id === botaForaId);

  return (
    <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center text-white shadow-md shadow-purple-500/10">
              <ClipboardCheck className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-sans font-bold text-base">Novo Lançamento de Descarte</h3>
              <p className="text-slate-400 text-xs">Informe quantidades descartadas e o cálculo de valor tarifário</p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="text-slate-450 hover:text-white p-1 rounded-full hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

         {/* Content Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMsg && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold py-2.5 px-4 rounded-lg flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-rose-600"></span>
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Bota Fora Select Dropdown */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Selecione o Bota Fora (Destino) *</label>
            {botaForas.length === 0 ? (
              <div className="p-2.5 bg-yellow-50 text-yellow-850 text-xs font-semibold rounded-lg border border-yellow-250">
                Nenhum Bota Fora cadastrado! Por favor, vá na aba "Descarte" e cadastre uma área antes de lançar.
              </div>
            ) : (
              <div className="space-y-1">
                <select
                  value={botaForaId}
                  onChange={(e) => setBotaForaId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-sans focus:outline-none focus:ring-2 focus:ring-purple-500/40 focus:border-purple-500 text-slate-800 font-semibold"
                  required
                >
                  {botaForas.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.id} - {b.nome} {b.valorPadraoDescarte !== undefined ? `(Tarifa: R$ ${b.valorPadraoDescarte.toFixed(2)})` : ''}
                    </option>
                  ))}
                </select>
                {selectedBtfObj?.valorPadraoDescarte !== undefined && selectedBtfObj.valorPadraoDescarte > 0 && (
                  <div className="text-[11px] text-purple-650 font-bold flex items-center gap-1.5 mt-1 bg-purple-50 p-2 rounded border border-purple-100">
                    <Coins className="w-4 h-4 text-purple-500 shrink-0" />
                    <span>Valor total sugerido automaticamente pela tarifa: <strong>{quantidadeCacambas} caçamba(s) x R$ {selectedBtfObj.valorPadraoDescarte.toFixed(2)} = R$ {(selectedBtfObj.valorPadraoDescarte * quantidadeCacambas).toFixed(2)}</strong></span>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Quantidade de Caçambas */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Quantidade de Caçambas Descartadas *</label>
              <div className="relative">
                <Archive className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={quantidadeCacambas}
                  onChange={(e) => setQuantidadeCacambas(Math.max(1, parseInt(e.target.value) || 1))}
                  placeholder="Ex: 5"
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold focus:outline-none focus:ring-2 focus:ring-purple-500/40 focus:border-purple-500 text-slate-800"
                  required
                />
              </div>
            </div>

            {/* Valor do descarte */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Valor do Lançamento (R$) *</label>
              <div className="relative">
                <span className="text-xs font-bold text-purple-600 absolute left-3 top-1/2 -translate-y-1/2 font-mono">R$</span>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={valor}
                  onChange={(e) => setValor(Math.max(0.01, parseFloat(e.target.value) || 0.01))}
                  placeholder="Ex: 450.00"
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold focus:outline-none focus:ring-2 focus:ring-purple-500/40 focus:border-purple-500 text-slate-850 font-mono"
                  required
                />
              </div>
            </div>

          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Data Input */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Data do Lançamento *</label>
              <div className="relative">
                <Calendar className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  type="date"
                  value={data}
                  onChange={(e) => setData(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-sans focus:outline-none focus:ring-2 focus:ring-purple-500/40 focus:border-purple-500 text-slate-800 font-semibold"
                  required
                />
              </div>
            </div>

            {/* Optional Vehicle links */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Veículo Transportador (Opcional)</label>
              <div className="relative">
                <Truck className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <select
                  value={selectedVehicleId}
                  onChange={(e) => handleVehicleChange(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-sans focus:outline-none focus:ring-2 focus:ring-purple-500/40 focus:border-purple-500 text-slate-800 font-semibold"
                >
                  <option value="">Nenhum Veículo Vinculado</option>
                  {vehicles.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.id} - {v.driver}
                    </option>
                  ))}
                </select>
              </div>
            </div>

          </div>

          {/* Driver Selection */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Nome do Motorista Cooperado *</label>
            <div className="relative">
              <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <select
                value={driverName}
                onChange={(e) => setDriverName(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-sans focus:outline-none focus:ring-2 focus:ring-purple-500/40 focus:border-purple-500 text-slate-800 font-bold"
                required
              >
                <option value="">-- Selecione o Motorista --</option>
                {motoristas.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Buttons Footer */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-205 hover:bg-slate-50 text-slate-650 rounded-lg text-xs font-bold transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={botaForas.length === 0}
              className={`px-6 py-2 rounded-lg text-xs font-bold transition-all duration-150 shadow-lg cursor-pointer ${
                botaForas.length === 0 
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none' 
                  : 'bg-slate-900 hover:bg-slate-850 active:bg-slate-950 text-white shadow-slate-900/10'
              }`}
            >
              Gravar Lançamento Econômico
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
