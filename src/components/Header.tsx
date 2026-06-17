/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Search, Bell, HelpCircle, User, LogOut, CheckCircle2 } from 'lucide-react';

interface HeaderProps {
  currentTab: string;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  notificationsCount: number;
  onClearNotifications: () => void;
  userEmail?: string;
  userRole?: string;
  onLogout?: () => void;
}

export default function Header({ 
  currentTab, 
  searchTerm, 
  setSearchTerm, 
  notificationsCount, 
  onClearNotifications,
  userEmail = 'JRodrigues138@gmail.com',
  userRole = 'Diretor de Operações',
  onLogout
}: HeaderProps) {
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showNotificationsMenu, setShowNotificationsMenu] = useState(false);

  // Derive a neat display name from email
  const getDisplayName = () => {
    if (userEmail === 'JRodrigues138@gmail.com') return 'J. Rodrigues';
    if (userEmail === 'motorista@relampago.com') return 'Motorista Parceiro';
    if (userEmail.includes('@')) {
      const part = userEmail.split('@')[0];
      return part.charAt(0).toUpperCase() + part.slice(1);
    }
    return userEmail;
  };

  const getPlaceholder = () => {
    switch (currentTab) {
      case 'fleet':
        return 'Buscar por ID do veículo ou motorista...';
      case 'finance':
        return 'Buscar faturas, clientes ou descrições de serviço...';
      case 'operations':
        return 'Buscar rotas ou tipos de carga...';
      case 'commissions':
        return 'Buscar por motorista ou data de comissão...';
      default:
        return 'Buscar no painel Relâmpago Caçambas...';
    }
  };

  const getTitle = () => {
    switch (currentTab) {
      case 'dashboard':
        return 'Painel Relâmpago Caçambas';
      case 'operations':
        return 'Rotas e Envios';
      case 'disposal':
        return 'Console de Descarte e Reciclagem';
      case 'finance':
        return 'Gestão Financeira';
      case 'commissions':
        return 'Controle de Comissões';
      case 'fleet':
        return 'Desempenho da Frota';
      case 'settings':
        return 'Configurações de Segurança';
      case 'help':
        return 'Central de Ajuda';
      default:
        return 'Logística Relâmpago';
    }
  };

  return (
    <header className="w-full h-16 sticky top-0 z-40 bg-white border-b border-slate-200 flex items-center justify-between px-6 shadow-sm">
      <div className="flex items-center gap-8">
        <h2 className="font-sans font-bold text-xl text-slate-900 tracking-tight">{getTitle()}</h2>
        <div className="relative w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            id="workspace-search-input"
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 bg-slate-50 border border-slate-200 rounded-full text-sm font-sans focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all text-slate-800"
            placeholder={getPlaceholder()}
          />
          {searchTerm && (
            <button 
              onClick={() => setSearchTerm('')} 
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 font-sans cursor-pointer"
            >
              Limpar
            </button>
          )}
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* Support Link */}
        <button 
          onClick={() => alert("Conectando com a equipe de despacho técnico 24/7 da Relâmpago Caçambas...")}
          className="flex items-center gap-1.5 text-sm text-slate-600 hover:text-emerald-600 font-medium transition-colors cursor-pointer"
        >
          <HelpCircle className="w-4 h-4" />
          <span className="font-sans">Suporte</span>
        </button>

        {/* Notifications Icon with Dropdown */}
        <div className="relative">
          <button 
            onClick={() => {
              setShowNotificationsMenu(!showNotificationsMenu);
              setShowProfileMenu(false);
            }}
            className="relative cursor-pointer hover:bg-slate-100 p-2 rounded-full transition-colors flex items-center justify-center text-slate-600 hover:text-slate-900"
          >
            <Bell className="w-5 h-5" />
            {notificationsCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full border border-white"></span>
            )}
          </button>

          {showNotificationsMenu && (
            <div className="absolute right-0 mt-2 w-82 bg-white border border-slate-200 rounded-xl shadow-xl z-50 p-4 animate-in fade-in slide-in-from-top-3 duration-150">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-2">
                <h4 className="font-semibold text-sm text-slate-800">Alertas Operacionais</h4>
                {notificationsCount > 0 && (
                  <button 
                    onClick={onClearNotifications} 
                    className="text-xs text-emerald-600 hover:text-emerald-500 font-semibold cursor-pointer"
                  >
                    Marcar como lido/Limpar
                  </button>
                )}
              </div>
              <ul className="space-y-3">
                {notificationsCount > 0 ? (
                  <>
                    <li className="flex gap-2 text-xs text-slate-600 p-1.5 bg-red-50 rounded">
                      <span className="font-bold text-red-600 shrink-0">🚨 Crítico:</span>
                      <span>Veículo FLT-0922 ativou alerta de limite crítico de calor do motor.</span>
                    </li>
                    <li className="flex gap-2 text-xs text-slate-600 p-1.5 bg-amber-50 rounded">
                      <span className="font-bold text-amber-600 shrink-0">⚠️ Pneus:</span>
                      <span>Veículo FLT-4402 registrou pneu esquerdo com pressão baixa (28 PSI).</span>
                    </li>
                    <li className="flex gap-2 text-xs text-slate-600 p-1.5 bg-emerald-50 rounded">
                      <span className="font-bold text-emerald-600 shrink-0">✓ Auditoria:</span>
                      <span>Relatórios mensais de conformidade financeira processados com sucesso.</span>
                    </li>
                  </>
                ) : (
                  <div className="text-center py-4 text-xs text-slate-400 font-sans flex flex-col items-center gap-1">
                    <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                    <span>Nenhuma notificação não lida! Sistema operando normalmente.</span>
                  </div>
                )}
              </ul>
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="h-8 w-px bg-slate-200 mx-1"></div>

        {/* Profile Avatar & Interactive Menu */}
        <div className="relative">
          <button 
            onClick={() => {
              setShowProfileMenu(!showProfileMenu);
              setShowNotificationsMenu(false);
            }}
            className="flex items-center gap-2 px-2 py-1 hover:bg-slate-50 border border-transparent hover:border-slate-100 rounded-lg transition-all cursor-pointer"
          >
            <img 
              alt={`Perfil de ${getDisplayName()}`} 
              className="w-8 h-8 rounded-full border border-slate-200 shadow-sm object-cover" 
              referrerPolicy="no-referrer"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuDS86a3u-TPGP_ZM-SJ8usbPuszd5Jw8SOhgiBhNGLZUSqrYXpvuAvB9nnq9-Wu4koMUce61MNGfjNNwcOUneUT3RzHKVI04fixAOSNIwRWZVtFHgv9FKS9Y8Z_nXEUlx4NItQRzKvCnvsEFAMOKDvTCTdjT823x8aePp8XuLJdU8w6UpHf2Ke9ZMNQ8wdUnUgoLfU5wNsK1yYPjDSImG6u_8YhuzP752Pv5XOMCCOezwNzHsnJXNBuqwyW5OnyICjXRRIgdkB281Jf"
            />
            <div className="hidden md:flex flex-col items-start text-xs text-left">
              <span className="font-semibold text-slate-800 leading-none mb-0.5">{getDisplayName()}</span>
              <span className="text-[10px] text-slate-400 font-medium">{userRole}</span>
            </div>
          </button>

          {showProfileMenu && (
            <div className="absolute right-0 mt-2 w-56 bg-white border border-slate-200 rounded-xl shadow-xl z-50 p-2 animate-in fade-in slide-in-from-top-3 duration-150">
              <div className="p-2 border-b border-slate-100 mb-1">
                <p className="text-xs text-slate-400 font-semibold uppercase">Conta Corporativa</p>
                <p className="text-sm font-semibold text-slate-800 break-all">{userEmail}</p>
                <p className="text-slate-500 text-xs mt-0.5">Função: {userRole}</p>
              </div>
              <button 
                onClick={() => {
                  alert(`Perfil ativo: ${getDisplayName()} (${userRole}). Canal corporativo Relâmpago Caçambas.`);
                  setShowProfileMenu(false);
                }}
                className="w-full text-left p-2 hover:bg-slate-50 rounded text-xs text-slate-700 hover:text-slate-900 font-medium flex items-center gap-2 cursor-pointer"
              >
                <User className="w-4 h-4 text-slate-500" />
                Configurações de Perfil
              </button>
              <button 
                onClick={() => {
                  if (onLogout) {
                    onLogout();
                  } else {
                    alert("Efetuando saída segura do sistema local.");
                  }
                  setShowProfileMenu(false);
                }}
                className="w-full text-left p-2 hover:bg-red-50 rounded text-xs text-rose-600 hover:text-rose-700 font-semibold flex items-center gap-2 border-t border-slate-100 mt-1 cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                Sair / Fechar Sessão
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
