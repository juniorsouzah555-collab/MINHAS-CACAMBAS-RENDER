/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { 
  LayoutDashboard, 
  Settings as SettingsIcon, 
  Truck, 
  DollarSign, 
  Trash2, 
  Activity, 
  Plus, 
  HelpCircle,
  Zap,
  FileText,
  Percent,
  Smartphone,
  MapPin
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
    { id: 'tracking', name: 'Rastreamento', icon: MapPin },
    { id: 'operations', name: 'Operações', icon: Activity },
    { id: 'disposal', name: 'Cadastro', icon: Trash2 },
    { id: 'finance', name: 'Financeiro', icon: DollarSign },
    { id: 'commissions', name: 'Comissões', icon: Percent },
    { id: 'reports', name: 'Relatórios', icon: FileText },
    { id: 'fleet', name: 'Frota', icon: Truck, badge: transitCount },
    { id: 'settings', name: 'Configurações', icon: SettingsIcon }
  ].filter(item => {
    if (isDriver) {
      return item.id === 'driver-portal';
    }
    return true;
  });

  return (
    <aside id="sidebar-container" className="hidden md:flex fixed left-0 top-0 h-full w-[280px] z-50 bg-slate-900 text-slate-100 flex flex-col py-6 border-r border-slate-800">
      {/* Brand Header */}
      <div className="px-6 mb-8 mt-1.5 animate-in fade-in duration-300">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-tr from-amber-500 to-cyan-500 rounded-lg flex items-center justify-center text-white shadow-md shadow-cyan-900/30">
            <Zap className="w-5 h-5 text-white animate-pulse" />
          </div>
          <div>
            <h1 className="font-orbitron font-extrabold text-sm tracking-wider text-white leading-tight select-none">
              <span className="text-amber-400">RELÂMPAGO</span>
              <span className="text-cyan-400 block text-xs tracking-widest mt-0.5">CAÇAMBAS</span>
            </h1>
          </div>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <li key={item.id}>
                <button
                  id={`nav-item-${item.id}`}
                  onClick={() => setCurrentTab(item.id)}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-lg text-sm font-bold transition-all duration-150 ease-in-out cursor-pointer group ${
                    isActive 
                      ? 'text-purple-400 bg-purple-950/40 border-r-4 border-purple-500' 
                      : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-5 h-5 transition-transform duration-150 ${isActive ? 'text-purple-400' : 'text-slate-450 group-hover:scale-105'}`} />
                    <span>{item.name}</span>
                  </div>
                  {item.badge !== undefined && item.badge > 0 && (
                    <span className="bg-purple-600 text-xs font-black px-2 py-0.5 rounded-full text-white animate-pulse">
                      {item.badge}
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Bottom Actions - Hidden for drivers */}
      {!isDriver && (
        <div className="px-4 mt-auto space-y-4 animate-in fade-in duration-200">
          <button
            id="btn-sidebar-new-dispatch"
            onClick={onOpenNewDispatch}
            className="w-full bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-500 hover:to-fuchsia-500 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 shadow-lg shadow-purple-600/20 cursor-pointer transition-all duration-150 hover:-translate-y-0.5"
          >
            <Plus className="w-4 h-4 text-white stroke-[3]" />
            <span>Novo Lançamento</span>
          </button>

          <div className="pt-2 border-t border-slate-800">
            <button
              onClick={() => setCurrentTab('help')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-bold transition-all duration-150 cursor-pointer ${
                currentTab === 'help' ? 'text-purple-400 bg-slate-850/50' : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/40'
              }`}
            >
              <HelpCircle className="w-5 h-5 text-slate-450" />
              <span>Central de Ajuda</span>
            </button>
          </div>
        </div>
      )}
    </aside>
  );
}
