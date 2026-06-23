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
  onNavigate?: (tab: string) => void;
}

export default function Header({ 
  currentTab, 
  searchTerm, 
  setSearchTerm, 
  notificationsCount, 
  onClearNotifications,
  userEmail = 'JRodrigues138@gmail.com',
  userRole = 'Diretor de Operações',
  onLogout,
  onNavigate
}: HeaderProps) {
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showNotificationsMenu, setShowNotificationsMenu] = useState(false);

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
      case 'fleet': return 'Buscar por ID do veículo ou motorista...';
      case 'finance': return 'Buscar faturas, clientes ou descrições...';
      case 'operations': return 'Buscar rotas ou tipos de carga...';
      case 'commissions': return 'Buscar por motorista ou data...';
      case 'driver-portal': return 'Buscar registros ou abastecimentos...';
      default: return 'Buscar no painel...';
    }
  };

  const getTitle = () => {
    switch (currentTab) {
      case 'dashboard': return 'Painel';
      case 'driver-portal': return 'Portal do Motorista';
      case 'operations': return 'Operações';
      case 'disposal': return 'Cadastro';
      case 'finance': return 'Financeiro';
      case 'commissions': return 'Comissões';
      case 'fleet': return 'Frota';
      case 'settings': return 'Configurações';
      case 'help': return 'Ajuda';
      default: return 'Relâmpago';
    }
  };

  return (
    <header className="w-full h-16 sticky top-0 z-40 bg-white/70 backdrop-blur-md border-b border-[#f0efed] flex items-center justify-between px-4 md:px-6">
      <div className="flex items-center gap-3 md:gap-8 overflow-hidden">
        <h2 className="font-display font-bold text-lg text-[#1a1a2e] tracking-tight truncate">
          {getTitle()}
        </h2>
        <div className="relative w-72 hidden md:block">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#b0aba3]" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 bg-[#f5f4f2] border border-[#e5e2dd] rounded-lg text-sm text-[#1a1a2e] placeholder:text-[#b0aba3] focus:border-teal-500 focus:ring-0 transition-all"
            placeholder={getPlaceholder()}
          />
          {searchTerm && (
            <button 
              onClick={() => setSearchTerm('')} 
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#b0aba3] hover:text-[#6b7280] font-medium cursor-pointer"
            >
              Limpar
            </button>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 md:gap-3 shrink-0">
        <button 
          onClick={() => alert("Conectando com a equipe de despacho técnico 24/7 da Relâmpago Caçambas...")}
          className="flex items-center gap-1 text-xs text-[#6b7280] hover:text-teal-600 font-medium transition-colors cursor-pointer"
        >
          <HelpCircle className="w-4 h-4" />
          <span className="hidden sm:inline">Suporte</span>
        </button>

        <div className="relative">
          <button 
            onClick={() => {
              setShowNotificationsMenu(!showNotificationsMenu);
              setShowProfileMenu(false);
            }}
            className="relative cursor-pointer hover:bg-[#f5f4f2] p-2 rounded-lg transition-colors flex items-center justify-center text-[#6b7280] hover:text-[#1a1a2e]"
          >
            <Bell className="w-4.5 h-4.5" />
            {notificationsCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-400 rounded-full border-2 border-white"></span>
            )}
          </button>

          {showNotificationsMenu && (
            <div className="absolute right-0 mt-2 w-80 bg-white border border-[#f0efed] rounded-xl shadow-lg z-50 p-4 animate-fade-in-up">
              <div className="flex items-center justify-between pb-2 border-b border-[#f0efed] mb-2">
                <h4 className="font-semibold text-sm text-[#1a1a2e]">Notificações</h4>
                {notificationsCount > 0 && (
                  <button 
                    onClick={onClearNotifications} 
                    className="text-xs text-teal-600 hover:text-teal-700 font-semibold cursor-pointer"
                  >
                    Limpar
                  </button>
                )}
              </div>
              <ul className="space-y-2">
                {notificationsCount > 0 ? (
                  <>
                    <li className="flex gap-2 text-xs text-[#6b7280] p-2 bg-red-50 rounded-lg">
                      <span className="font-bold text-red-500 shrink-0">Crítico:</span>
                      <span>Veículo FLT-0922 — alerta de calor do motor.</span>
                    </li>
                    <li className="flex gap-2 text-xs text-[#6b7280] p-2 bg-amber-50 rounded-lg">
                      <span className="font-bold text-amber-500 shrink-0">Pneus:</span>
                      <span>FLT-4402 — pressão baixa (28 PSI).</span>
                    </li>
                    <li className="flex gap-2 text-xs text-[#6b7280] p-2 bg-emerald-50 rounded-lg">
                      <span className="font-bold text-emerald-500 shrink-0">Auditoria:</span>
                      <span>Relatórios financeiros processados.</span>
                    </li>
                  </>
                ) : (
                  <div className="text-center py-4 text-xs text-[#b0aba3] flex flex-col items-center gap-1">
                    <CheckCircle2 className="w-5 h-5 text-teal-500" />
                    <span>Nenhuma notificação.</span>
                  </div>
                )}
              </ul>
            </div>
          )}
        </div>

        <div className="h-6 w-px bg-[#f0efed]"></div>

        <div className="relative">
          <button 
            onClick={() => {
              setShowProfileMenu(!showProfileMenu);
              setShowNotificationsMenu(false);
            }}
            className="flex items-center gap-2 px-2 py-1 hover:bg-[#f5f4f2] rounded-lg transition-all cursor-pointer"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center text-white text-xs font-bold shadow-sm">
              {getDisplayName().charAt(0)}
            </div>
            <div className="hidden md:flex flex-col items-start text-xs text-left">
              <span className="font-semibold text-[#1a1a2e] leading-none mb-0.5">{getDisplayName()}</span>
              <span className="text-[10px] text-[#b0aba3] font-medium">{userRole}</span>
            </div>
          </button>

          {showProfileMenu && (
            <div className="absolute right-0 mt-2 w-56 bg-white border border-[#f0efed] rounded-xl shadow-lg z-50 p-2 animate-fade-in-up">
              <div className="p-2 border-b border-[#f0efed] mb-1">
                <p className="text-[10px] text-[#b0aba3] font-semibold uppercase tracking-wider">Conta</p>
                <p className="text-sm font-semibold text-[#1a1a2e] break-all">{userEmail}</p>
                <p className="text-[#6b7280] text-xs mt-0.5">Função: {userRole}</p>
              </div>
              {!(userRole?.toLowerCase().includes('motorista') || userEmail === 'motorista@relampago.com') && (
                <button 
                  onClick={() => {
                    if (onNavigate) onNavigate('settings');
                    setShowProfileMenu(false);
                  }}
                  className="w-full text-left p-2 hover:bg-[#f5f4f2] rounded-lg text-xs text-[#6b7280] hover:text-[#1a1a2e] font-medium flex items-center gap-2 cursor-pointer"
                >
                  <User className="w-3.5 h-3.5" />
                  Configurações
                </button>
              )}
              <button 
                onClick={() => {
                  if (onLogout) onLogout();
                  setShowProfileMenu(false);
                }}
                className="w-full text-left p-2 hover:bg-red-50 rounded-lg text-xs text-red-500 hover:text-red-600 font-semibold flex items-center gap-2 border-t border-[#f0efed] mt-1 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                Sair
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
