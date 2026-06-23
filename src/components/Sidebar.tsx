import React from 'react';
import { 
  LayoutDashboard, 
  Truck, 
  DollarSign, 
  Trash2, 
  Activity, 
  FileText,
  Percent,
  Smartphone,
  Plus,
  HelpCircle
} from 'lucide-react';

interface SidebarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  onOpenNewDispatch: () => void;
  transitCount: number;
  userRole?: string;
  userEmail?: string;
}

export default function Sidebar({ currentTab, setCurrentTab, onOpenNewDispatch, transitCount, userRole, userEmail }: SidebarProps) {
  const isDriver = (userRole?.toLowerCase().includes('motorista') || userEmail === 'motorista@relampago.com');

  const navItems = [
    { id: 'dashboard', name: 'Painel', icon: LayoutDashboard },
    { id: 'driver-portal', name: 'Portal Motorista', icon: Smartphone },
    { id: 'operations', name: 'Operações', icon: Activity },
    { id: 'disposal', name: 'Cadastro', icon: Trash2 },
    { id: 'finance', name: 'Financeiro', icon: DollarSign },
    { id: 'commissions', name: 'Comissões', icon: Percent },
    { id: 'reports', name: 'Relatórios', icon: FileText },
    { id: 'fleet', name: 'Frota', icon: Truck, badge: transitCount },
    { id: 'settings', name: 'Configurações', icon: Truck }
  ].filter(item => {
    if (isDriver) {
      return item.id === 'driver-portal';
    }
    return true;
  });

  return (
    <aside className="hidden md:flex fixed left-0 top-0 h-full w-[280px] z-50 bg-white border-r border-[#f0efed] flex-col py-5">
      <div className="px-6 mb-7">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center shadow-sm">
            <Truck className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-display font-extrabold text-sm tracking-tight text-[#1a1a2e] leading-tight">
              Relâmpago
            </h1>
            <span className="text-[11px] font-semibold text-[#b0aba3] tracking-wide">
              CAÇAMBAS
            </span>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3">
        <ul className="space-y-0.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <li key={item.id}>
                <button
                  onClick={() => setCurrentTab(item.id)}
                  className={`w-full flex items-center justify-between px-4 py-2.5 rounded-lg text-sm font-medium transition-all cursor-pointer ${
                    isActive 
                      ? 'bg-teal-50 text-teal-700 font-semibold' 
                      : 'text-[#6b7280] hover:bg-[#f5f4f2] hover:text-[#1a1a2e]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4.5 h-4.5 ${isActive ? 'text-teal-600' : 'text-[#b0aba3]'}`} />
                    <span>{item.name}</span>
                  </div>
                  {item.badge !== undefined && item.badge > 0 && (
                    <span className="bg-teal-500 text-xs font-bold px-1.5 py-0.5 rounded-full text-white">
                      {item.badge}
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {!isDriver && (
        <div className="px-4 mt-auto space-y-3">
          <div className="divider" />
          <button
            onClick={onOpenNewDispatch}
            className="w-full bg-teal-600 hover:bg-teal-700 text-white font-semibold py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm text-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Lançamento</span>
          </button>

          <button
            onClick={() => setCurrentTab('help')}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all cursor-pointer ${
              currentTab === 'help' ? 'bg-teal-50 text-teal-700' : 'text-[#6b7280] hover:bg-[#f5f4f2] hover:text-[#1a1a2e]'
            }`}
          >
            <HelpCircle className="w-4.5 h-4.5 text-[#b0aba3]" />
            <span>Ajuda</span>
          </button>
        </div>
      )}
    </aside>
  );
}
