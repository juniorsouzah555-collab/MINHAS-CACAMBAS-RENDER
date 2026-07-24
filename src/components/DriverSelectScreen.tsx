import React, { useState } from 'react';
import { Truck, FileText, BarChart3, ArrowLeft } from 'lucide-react';
import { Vehicle, Lancamento } from '../types';
import MeusDescartes from './MeusDescartes';

interface DriverSelectScreenProps {
  motoristas: string[];
  vehicles: Vehicle[];
  onSelectMotorista: (nome: string) => void;
  onPortao: () => void;
  portaoLoading: boolean;
  portaoMsg: string;
  onAdmin: () => void;
  onCtr: () => void;
  lancamentos?: Lancamento[];
  isJunior?: boolean;
}

export default function DriverSelectScreen({
  motoristas,
  onSelectMotorista,
  onPortao,
  portaoLoading,
  portaoMsg,
  onAdmin,
  onCtr,
  lancamentos = [],
  isJunior = false,
}: DriverSelectScreenProps) {
  const [viewReport, setViewReport] = useState(false);

  if (viewReport) {
    return (
      <MeusDescartes
        motorista={motoristas.length === 1 ? motoristas[0] : ''}
        motoristas={motoristas}
        lancamentos={lancamentos}
        onBack={() => setViewReport(false)}
      />
    );
  }

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
        <p className="text-sm text-slate-400 mb-6">Selecione seu nome</p>

        {/* Botões dos Motoristas */}
        <div className="space-y-3">
          {motoristas.map(nome => (
            <React.Fragment key={nome}>
              <button
                onClick={() => onSelectMotorista(nome)}
                className="w-full py-4 rounded-xl bg-emerald-600 text-white font-black text-lg hover:bg-emerald-700 active:scale-[0.98] transition-all shadow-lg shadow-emerald-500/30 cursor-pointer"
              >
                {nome}
              </button>
              {nome === 'JUNIOR' && (
                <button
                  onClick={() => { window.location.href = '/?page=rastreador'; }}
                  className="w-full py-3 rounded-xl bg-sky-600/80 text-white font-bold text-sm hover:bg-sky-700 active:scale-[0.98] transition-all shadow-lg shadow-sky-500/20 cursor-pointer flex items-center justify-center gap-2"
                >
                  📍 RASTREADOR
                </button>
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Botão Relatório - só pra JUNIOR */}
        {isJunior && (
          <button
            onClick={() => setViewReport(true)}
            className="mt-4 w-full py-3 rounded-xl bg-blue-600 text-white font-black text-sm hover:bg-blue-700 active:scale-[0.98] transition-all shadow-lg shadow-blue-500/30 cursor-pointer flex items-center justify-center gap-2"
          >
            <BarChart3 className="w-4 h-4" />
            RELATÓRIO
          </button>
        )}

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
