import React, { useState } from 'react';
import { Truck } from 'lucide-react';
import { Vehicle } from '../types';

interface DriverSelectScreenProps {
  motoristas: string[];
  vehicles: Vehicle[];
  savedVehicle: string;
  onSelectMotorista: (nome: string, vehicleId: string) => void;
  onPortao: () => void;
  portaoLoading: boolean;
  portaoMsg: string;
  onAdmin: () => void;
  onCtr: () => void;
}

export default function DriverSelectScreen({
  motoristas,
  vehicles,
  savedVehicle,
  onSelectMotorista,
  onPortao,
  portaoLoading,
  portaoMsg,
  onAdmin,
  onCtr,
}: DriverSelectScreenProps) {
  const [selectedVehicle, setSelectedVehicle] = useState(savedVehicle);

  return (
    <div className="bg-gradient-to-br from-slate-900 to-indigo-950 min-h-screen text-slate-100 font-sans antialiased flex items-center justify-center p-6 relative">
      {/* Botão Portão */}
      <button
        onClick={onPortao}
        disabled={portaoLoading}
        className="absolute top-4 right-4 px-3 py-1.5 rounded-lg bg-amber-600/80 text-white text-xs font-bold hover:bg-amber-500 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
      >
        {portaoLoading ? '...' : 'PORTÃO'}
      </button>
      {portaoMsg && (
        <div className="absolute top-12 right-4 px-3 py-1.5 rounded-lg bg-slate-800 text-xs font-bold text-amber-400 shadow-lg">
          {portaoMsg}
        </div>
      )}

      <div className="text-center max-w-sm w-full">
        <Truck className="w-14 h-14 text-emerald-400 mx-auto mb-4" />
        <h1 className="text-xl font-black text-white mb-1">Relâmpago Caçambas</h1>
        <p className="text-sm text-slate-400 mb-6">Selecione o veículo e seu nome</p>

        {/* Seletor de Veículo */}
        {vehicles.length > 0 && (
          <div className="mb-6">
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Veículo</label>
            <select
              value={selectedVehicle}
              onChange={(e) => setSelectedVehicle(e.target.value)}
              className="w-full py-3 px-4 rounded-xl bg-slate-800/80 border border-slate-700 text-white font-bold text-sm outline-none focus:border-emerald-500 cursor-pointer"
            >
              <option value="">Selecione o veículo...</option>
              {vehicles.map(v => (
                <option key={v.id} value={v.id}>{v.id} {v.type ? `(${v.type})` : ''} {v.driver ? `- ${v.driver}` : ''}</option>
              ))}
            </select>
          </div>
        )}

        {/* Botões dos Motoristas */}
        <div className="space-y-3">
          {motoristas.map(nome => (
            <button
              key={nome}
              onClick={() => onSelectMotorista(nome, selectedVehicle)}
              disabled={!selectedVehicle}
              className="w-full py-4 rounded-xl bg-emerald-600 text-white font-black text-lg hover:bg-emerald-700 active:scale-[0.98] transition-all shadow-lg shadow-emerald-500/30 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {nome}
            </button>
          ))}
        </div>

        <button
          onClick={onCtr}
          className="mt-6 w-full py-4 rounded-xl bg-orange-600 text-white font-black text-lg hover:bg-orange-700 active:scale-[0.98] transition-all shadow-lg shadow-orange-500/30 cursor-pointer"
        >
          CTR
        </button>

        <button
          onClick={onAdmin}
          className="mt-8 text-xs text-slate-500 hover:text-slate-300 cursor-pointer"
        >
          Acessar como administrador
        </button>
      </div>
    </div>
  );
}
