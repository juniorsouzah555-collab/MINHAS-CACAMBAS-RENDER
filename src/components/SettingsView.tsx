/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import { supabase, isSupabaseConfigured, confirmUserEmailByEmail, updateUserPasswordByEmail } from '../lib/supabase';
import { 
  Settings, 
  Cpu, 
  Leaf, 
  Save, 
  Building,
  Users,
  UserPlus,
  Shield,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  Mail,
  Calendar,
  Trash2,
  Lock,
  Plus,
  UserCheck,
  Zap,
  Sliders,
  AlertCircle,
  Send,
  Key,
  Copy
} from 'lucide-react';

interface SettingsViewProps {
  onShowNotification: (msg: string) => void;
  motoristas: string[];
  onMotoristasChange: (names: string[]) => void;
}

interface SystemUser {
  id: string;
  name: string;
  email: string;
  role: string;
  status: 'Ativo' | 'Inativo';
  registrationDate: string;
  linkedDriver?: string;
}

interface RolePermission {
  id: string;
  name: string;
  description: string;
  categories: 'Leitura' | 'Escrita' | 'Crítica';
}

export default function SettingsView({ onShowNotification, motoristas, onMotoristasChange }: SettingsViewProps) {
  // Tabs: 'system' (general settings), 'users' (user registration), 'permissions' (authorization levels)
  const [activeSubTab, setActiveSubTab] = useState<'system' | 'users' | 'permissions'>('system');

  // Load users from Supabase on mount (faz merge, não sobrescreve)
  useEffect(() => {
    if (isSupabaseConfigured()) {
      supabase.from('user_approvals').select('*').then(({ data, error }) => {
        if (data && data.length > 0) {
          setUsers(prev => {
            const updated = [...prev];
            data.forEach((u: any) => {
              const email = u.email?.toLowerCase().trim();
              if (!email) return;
              const existing = updated.findIndex(x => x.email.toLowerCase().trim() === email);
              const mapped = {
                id: u.id || `USR-${Math.floor(100 + Math.random() * 900)}`,
                name: u.name || email.split('@')[0],
                email,
                role: u.role || 'Motorista',
                status: u.status === 'Ativo' ? 'Ativo' : 'Inativo',
                registrationDate: u.created_at
                  ? new Date(u.created_at).toLocaleDateString('pt-BR')
                  : new Date().toLocaleDateString('pt-BR'),
                linkedDriver: u.linked_driver || u.linkedDriver || undefined
              };
              if (existing !== -1) {
                updated[existing] = { ...updated[existing], ...mapped };
              } else {
                updated.push(mapped);
              }
            });
            return updated;
          });
        }
      });
    }
  }, []);

  // General Settings State
  const [tickSpeed, setTickSpeed] = useState(5);
  const [co2Coefficient, setCo2Coefficient] = useState(1.4);
  const [rerouting, setRerouting] = useState(true);
  const [companyName, setCompanyName] = useState('RELAMPAGO CAÇAMBAS LTDA');
  const [cnpj, setCnpj] = useState('02.948.345/0001-05');
  const [defaultTerminal, setDefaultTerminal] = useState('Aterro Central - Setor 4');

  // Interactive Users Database — carregado do localStorage para persistir exclusões
  const [users, setUsers] = useState<SystemUser[]>(() => {
    try {
      const saved = localStorage.getItem('relampago_settings_users');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return [
      { id: "USR-001", name: "Alex Rivera", email: "relampagoentulho@gmail.com", role: "Administrador Geral", status: "Ativo", registrationDate: "12/01/2026" },
      { id: "USR-002", name: "Carlos Augusto Silva", email: "carlos.silva@relampago.com", role: "Diretor de Operações", status: "Ativo", registrationDate: "15/02/2026" },
      { id: "USR-003", name: "Mariana Souza", email: "financeiro@relampago.com", role: "Financeiro", status: "Ativo", registrationDate: "03/03/2026" },
      { id: "USR-004", name: "Marcos Pinheiro", email: "marcos@relampago.com", role: "Motorista", status: "Inativo", registrationDate: "10/05/2026" }
    ];
  });

  // Persiste usuários no localStorage para exclusões sobreviverem a refresh
  useEffect(() => {
    localStorage.setItem('relampago_settings_users', JSON.stringify(users));
  }, [users]);

  // Lista combinada: motoristas do sistema + todos os usuários com role Motorista
  const allAvailableDrivers = useMemo(() => {
    const set = new Set(motoristas);
    users.forEach(u => {
      if (u.role === 'Motorista' && u.name) {
        set.add(u.name);
      }
    });
    return Array.from(set);
  }, [motoristas, users]);

  const handleLinkDriver = (userId: string, driverName: string) => {
    const updated = users.map(u => {
      if (u.id === userId) {
        return { ...u, linkedDriver: driverName || undefined };
      }
      return u;
    });
    setUsers(updated);

    const targetUser = users.find(u => u.id === userId);
    if (targetUser) {
      // 1. Save to local storage for local/offline mock support
      const savedUsersStr = localStorage.getItem('relampago_system_users');
      let savedUsers = [];
      if (savedUsersStr) {
        try { savedUsers = JSON.parse(savedUsersStr); } catch (e) {}
      }
      const existingIdx = savedUsers.findIndex((su: any) => su.email?.toLowerCase().trim() === targetUser.email.toLowerCase().trim());
      if (existingIdx !== -1) {
        savedUsers[existingIdx].linkedDriver = driverName || undefined;
      } else {
        savedUsers.push({ email: targetUser.email.toLowerCase().trim(), linkedDriver: driverName || undefined });
      }
      localStorage.setItem('relampago_system_users', JSON.stringify(savedUsers));

      // linked_driver fica apenas no localStorage (a tabela Supabase não tem essa coluna)
    }

    onShowNotification(`Vinculação de motorista atualizada com sucesso!`);
  };

  // Load offline saved users attributes on mount
  useEffect(() => {
    const saved = localStorage.getItem('relampago_system_users');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setUsers(prev => {
            const updated = prev.map(u => {
              const match = parsed.find((x: any) => x.email?.toLowerCase().trim() === u.email.toLowerCase().trim());
              if (match) {
                return {
                  ...u,
                  linkedDriver: match.linkedDriver || u.linkedDriver,
                  role: match.role || u.role,
                  status: match.status || u.status
                };
              }
              return u;
            });
            // Adiciona usuários do localStorage que não existem no state (ex: convidados)
            parsed.forEach((p: any) => {
              if (p.email && !updated.find(u => u.email.toLowerCase().trim() === p.email.toLowerCase().trim())) {
                updated.push({
                  id: p.id || `USR-${Math.floor(100 + Math.random() * 900)}`,
                  name: p.name || p.email.split('@')[0],
                  email: p.email.toLowerCase().trim(),
                  role: p.role || 'Motorista',
                  status: p.status || 'Inativo',
                  registrationDate: p.registrationDate || new Date().toLocaleDateString('pt-BR'),
                  linkedDriver: p.linkedDriver || undefined
                });
              }
            });
            return updated;
          });
        }
      } catch (e) {
        console.error("Error loading offline system users:", e);
      }
    }
  }, []);

  // Load dynamic users from Supabase if configured and merge partners
  useEffect(() => {
    const syncUsersFromSupabase = async () => {
      if (!isSupabaseConfigured()) return;
      try {
        const { data: remoteUsers, error } = await supabase
          .from('user_approvals')
          .select('*');
        
        if (!error && remoteUsers && remoteUsers.length > 0) {
          setUsers(prev => {
            const updated = [...prev];
            remoteUsers.forEach(ru => {
              const cleanedEmail = ru.email.toLowerCase().trim();
              const existingIdx = updated.findIndex(u => u.email.toLowerCase().trim() === cleanedEmail);
              const mappedUser: SystemUser = {
                id: ru.id ? `USR-${ru.id}` : `USR-${Math.floor(100 + Math.random() * 900)}`,
                name: ru.name || cleanedEmail.split('@')[0],
                email: cleanedEmail,
                role: ru.role || 'Operador de Frota',
                status: ru.status === 'Ativo' ? 'Ativo' : 'Inativo',
                linkedDriver: ru.linked_driver || ru.linkedDriver || undefined,
                registrationDate: ru.created_at ? new Date(ru.created_at).toLocaleDateString('pt-BR') : new Date().toLocaleDateString('pt-BR')
              };
              if (existingIdx !== -1) {
                // Keep active updates but conserve local ones as base
                updated[existingIdx] = {
                  ...updated[existingIdx],
                  role: mappedUser.role,
                  status: mappedUser.status,
                  linkedDriver: mappedUser.linkedDriver || updated[existingIdx].linkedDriver
                };
              } else {
                updated.push(mappedUser);
              }
            });
            return updated;
          });
        }
      } catch (err) {
        console.warn("Could not load user_approvals dynamically:", err);
      }
    };
    syncUsersFromSupabase();
  }, []);

  // Form for New User Registration State
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRole, setNewUserRole] = useState('Diretor de Operações');
  const [newUserStatus, setNewUserStatus] = useState<'Ativo' | 'Inativo'>('Ativo');

  // Driver Invitation State
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteLinkedDriver, setInviteLinkedDriver] = useState('');
  const [inviteGeneratedPassword, setInviteGeneratedPassword] = useState('');
  const [inviteSuccessMsg, setInviteSuccessMsg] = useState('');
  const [inviteLoading, setInviteLoading] = useState(false);

  const generatePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    let pwd = '';
    for (let i = 0; i < 10; i++) {
      pwd += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return pwd + '@1';
  };

  const handleInviteDriver = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteSuccessMsg('');
    setInviteGeneratedPassword('');

    if (!inviteEmail.trim()) {
      onShowNotification('Preencha o e-mail do motorista.');
      return;
    }

    const email = inviteEmail.trim().toLowerCase();
    const userName = email.split('@')[0];
    const formattedName = userName.charAt(0).toUpperCase() + userName.slice(1);
    const tempPassword = generatePassword();

    setInviteLoading(true);

    // Tenta criar no Supabase
    try {
      if (isSupabaseConfigured()) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password: tempPassword,
          options: { data: { role: 'Motorista' } }
        });

        // Confirma o email automaticamente via Admin API para login funcionar de qualquer dispositivo
        if (data?.user?.id) {
          await confirmUserEmailByEmail(email);
        } else if (error) {
          // Se o usuário já existe, tenta confirmar mesmo assim
          await confirmUserEmailByEmail(email);
        }

        const { error: insertError } = await supabase.from('user_approvals').insert([{
          email,
          name: formattedName,
          role: 'Motorista',
          status: 'Inativo',
          created_at: new Date().toISOString()
        }]);
        if (insertError) console.error('Supabase insert user_approvals error:', insertError);
      }
    } catch {
      // ignora falha
    }

    // Salva credenciais localmente para login sem confirmação de email
    try {
      const raw = localStorage.getItem('relampago_invited_drivers');
      const list: { email: string; password: string; role: string }[] = raw ? JSON.parse(raw) : [];
      if (!list.find(d => d.email === email)) {
        list.push({ email, password: tempPassword, role: 'Motorista' });
        localStorage.setItem('relampago_invited_drivers', JSON.stringify(list));
      }
    } catch {}

    const newUserRecord = {
      id: `USR-${Math.floor(100 + Math.random() * 900)}`,
      name: formattedName,
      email,
      role: 'Motorista' as const,
      status: 'Inativo' as const,
      registrationDate: new Date().toLocaleDateString('pt-BR'),
      linkedDriver: inviteLinkedDriver || undefined
    };

    setInviteGeneratedPassword(tempPassword);
    setInviteSuccessMsg(`Motorista ${email} cadastrado! Senha temporária: ${tempPassword}. O motorista já pode fazer login.`);
    onShowNotification(`Motorista ${email} convidado com sucesso!`);

    setUsers(prev => [...prev, newUserRecord]);

    // Persiste no localStorage para não sumir ao recarregar a página
    try {
      const raw = localStorage.getItem('relampago_system_users');
      const list: any[] = raw ? JSON.parse(raw) : [];
      if (!list.find(x => x.email?.toLowerCase() === email)) {
        list.push(newUserRecord);
        localStorage.setItem('relampago_system_users', JSON.stringify(list));
      }
    } catch {}

    setInviteEmail('');
    setInviteLinkedDriver('');
    setInviteLoading(false);
  };

  // Role Permissions levels state
  const [selectedRoleForPermissions, setSelectedRoleForPermissions] = useState<string>('Administrador Geral');
  
  // Dynamic permissions matrix per role (state)
  const [permissionsMap, setPermissionsMap] = useState<{ [role: string]: { [permissionId: string]: boolean } }>({
    "Administrador Geral": {
      "access_dashboard": true,
      "manage_dispatches": true,
      "financial_control": true,
      "fleet_gps": true,
      "purge_history": true,
    },
    "Diretor de Operações": {
      "access_dashboard": true,
      "manage_dispatches": true,
      "financial_control": false,
      "fleet_gps": true,
      "purge_history": false,
    },
    "Financeiro": {
      "access_dashboard": true,
      "manage_dispatches": false,
      "financial_control": true,
      "fleet_gps": false,
      "purge_history": false,
    },
    "Motorista": {
      "access_dashboard": false,
      "manage_dispatches": false,
      "financial_control": false,
      "fleet_gps": true,
      "purge_history": false,
    }
  });

  // Available permission points to tweak
  const permissionDefinitions: RolePermission[] = [
    {
      id: "access_dashboard",
      name: "Acessar Bi-Dashboards & Estatísticas",
      description: "Visualização direta dos indicadores globais de faturamento, caçambas totais e rankings de bota fora.",
      categories: "Leitura"
    },
    {
      id: "manage_dispatches",
      name: "Lançamento e Modificação de Caçambas",
      description: "Autorização para criar novos envios de caçambas, bota foras e auditar logs individuais de balança.",
      categories: "Escrita"
    },
    {
      id: "financial_control",
      name: "Gestão Contábil & Comissões",
      description: "Controle de fechamento de faturas, valores unitários por bota fora e liquidação de comissões de motoristas.",
      categories: "Escrita"
    },
    {
      id: "fleet_gps",
      name: "Rastreio de Frota e Telemetria",
      description: "Visualizar mapas interativos e coordenadas de trânsito em tempo real.",
      categories: "Leitura"
    },
    {
      id: "purge_history",
      name: "Excluir Registros & Purgar Histórico",
      description: "Capacidade crítica de excluir lançamentos e limpar faturas emitidas definitivamente. Ação irreversível.",
      categories: "Crítica"
    }
  ];

  // Actions
  const handleSaveSystemSettings = (e: React.FormEvent) => {
    e.preventDefault();
    onShowNotification(`Configurações de sistema atualizadas com sucesso para RELAMPAGO CAÇAMBAS CNPJ ${cnpj}!`);
  };

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName.trim() || !newUserEmail.trim()) {
      alert("Por favor, preencha todos os campos do usuário.");
      return;
    }

    const newUserObj: SystemUser = {
      id: `USR-${Math.floor(100 + Math.random() * 900)}`,
      name: newUserName,
      email: newUserEmail.toLowerCase().trim(),
      role: newUserRole,
      status: newUserStatus,
      registrationDate: new Date().toLocaleDateString('pt-BR')
    };

    const updatedUsers = [...users, newUserObj];
    setUsers(updatedUsers);

    // Try inserting into Supabase
    if (isSupabaseConfigured()) {
      supabase.from('user_approvals').insert([{
        email: newUserObj.email,
        name: newUserObj.name,
        role: newUserObj.role,
        status: newUserObj.status === 'Ativo' ? 'Ativo' : 'Inativo',
        created_at: new Date().toISOString()
      }]).then(({ error }) => {
        if (error) console.warn("Supabase user_approvals insert error: ", error);
      });
    }
    
    // Set default permissions for this role if not exists
    if (!permissionsMap[newUserRole]) {
      setPermissionsMap({
        ...permissionsMap,
        [newUserRole]: {
          "access_dashboard": true,
          "manage_dispatches": false,
          "financial_control": false,
          "fleet_gps": true,
          "purge_history": false,
        }
      });
    }

    setNewUserName('');
    setNewUserEmail('');
    onShowNotification(`Usuário ${newUserName} adicionado com sucesso no cargo ${newUserRole}!`);
  };

  const handleResetPassword = (email: string, name: string) => {
    const newPassword = prompt(`Digite a nova senha para ${name} (${email}):`);
    if (!newPassword || newPassword.trim().length < 4) {
      onShowNotification('Senha não alterada — mínimo de 4 caracteres.');
      return;
    }

    // Atualiza no localStorage (fallback para login sem confirmação)
    try {
      const raw = localStorage.getItem('relampago_invited_drivers');
      const list: { email: string; password: string; role: string }[] = raw ? JSON.parse(raw) : [];
      const idx = list.findIndex(d => d.email === email.toLowerCase().trim());
      if (idx !== -1) {
        list[idx].password = newPassword.trim();
      } else {
        list.push({ email: email.toLowerCase().trim(), password: newPassword.trim(), role: 'Motorista' });
      }
      localStorage.setItem('relampago_invited_drivers', JSON.stringify(list));
    } catch {}

    // Atualiza a senha e confirma o email no Supabase Auth para login funcionar de qualquer dispositivo
    if (isSupabaseConfigured()) {
      updateUserPasswordByEmail(email.toLowerCase().trim(), newPassword.trim()).catch(() => {});
    }

    onShowNotification(`Senha de ${name} redefinida com sucesso!`);
  };

  const handleDeleteUser = (id: string, name: string) => {
    const targetUser = users.find(u => u.id === id);
    if (confirm(`Deseja realmente excluir o cadastro de ${name}?`)) {
      const updated = users.filter(u => u.id !== id);
      setUsers(updated);

      if (targetUser) {
        // Remove também do relampago_system_users
        try {
          const raw = localStorage.getItem('relampago_system_users');
          if (raw) {
            const list = JSON.parse(raw);
            const filtered = list.filter((x: any) => x.email?.toLowerCase().trim() !== targetUser.email.toLowerCase().trim());
            localStorage.setItem('relampago_system_users', JSON.stringify(filtered));
          }
        } catch {}
        // Remove do Supabase se possível
        if (isSupabaseConfigured()) {
          supabase.from('user_approvals').delete().eq('email', targetUser.email.toLowerCase().trim()).then(({ error }) => {
            if (error) console.warn("Supabase user_approvals delete failed: ", error);
          });
        }
      }

      onShowNotification(`Cadastro de ${name} removido do sistema corporativo.`);
    }
  };

  const toggleUserStatus = (id: string) => {
    let activatedName = '';
    const updated = users.map(u => {
      if (u.id === id) {
        const nextStatus = u.status === 'Ativo' ? 'Inativo' : 'Ativo';
        onShowNotification(`O status de ${u.name} agora é ${nextStatus}`);

        // Se ativou um motorista, adiciona à lista de motoristas
        if (nextStatus === 'Ativo' && u.role === 'Motorista') {
          activatedName = u.name;
        }

        // Update in Supabase
        if (isSupabaseConfigured()) {
          supabase
            .from('user_approvals')
            .update({ status: nextStatus === 'Ativo' ? 'Ativo' : 'Inativo' })
            .eq('email', u.email.toLowerCase().trim())
            .then(({ error }) => {
              if (error) {
                supabase.from('user_approvals').insert([{
                  email: u.email.toLowerCase().trim(),
                  name: u.name,
                  role: u.role,
                  status: nextStatus === 'Ativo' ? 'Ativo' : 'Inativo',
                  created_at: new Date().toISOString()
                }]);
              }
            });
        }

        return { ...u, status: nextStatus };
      }
      return u;
    });

    setUsers(updated);

    if (activatedName && !motoristas.includes(activatedName)) {
      onMotoristasChange([...motoristas, activatedName]);
    }
  };

  const handleTogglePermission = (permissionId: string) => {
    const currentRolePermissions = { ...permissionsMap[selectedRoleForPermissions] };
    const nextVal = !currentRolePermissions[permissionId];
    
    setPermissionsMap({
      ...permissionsMap,
      [selectedRoleForPermissions]: {
        ...currentRolePermissions,
        [permissionId]: nextVal
      }
    });
  };

  const handleSavePermissions = () => {
    onShowNotification(`Níveis de Liberação e Permissões de "${selectedRoleForPermissions}" foram atualizados e salvos!`);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Brand & SubTab Header */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-2xl pointer-events-none group-hover:bg-indigo-500/10 transition-colors"></div>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-slate-900 border border-slate-700/80 rounded-xl flex items-center justify-center text-amber-400 shadow-md shadow-fuchsia-900/10 shrink-0">
              <Settings className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-orbitron font-extrabold text-base tracking-wide text-slate-900 leading-none">
                  <span className="text-amber-500 mr-1.5 font-bold">RELÂMPAGO</span>
                  <span className="text-cyan-500 font-bold">CAÇAMBAS</span>
                </h2>
                <span className="p-1 px-2.5 rounded-full text-[9px] font-black bg-cyan-50 text-cyan-700 border border-cyan-150 uppercase tracking-widest font-mono">
                  SISTEMA DE SEGURANÇA E PARAMETRIZAÇÃO
                </span>
              </div>
              <p className="text-slate-400 text-xs mt-1.5">
                Razão Social Oficial: <strong className="text-slate-800 font-mono font-bold text-xs">{companyName} • CNPJ {cnpj}</strong>
              </p>
            </div>
          </div>
        </div>

        {/* Sub Navigation controls */}
        <div className="flex flex-wrap items-center gap-2 mt-6 pt-5 border-t border-slate-100">
          <button
            onClick={() => setActiveSubTab('system')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeSubTab === 'system'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-600'
            }`}
          >
            <Cpu className="w-4 h-4 text-emerald-500" />
            <span>Parametrização do Sistema</span>
          </button>

          <button
            onClick={() => setActiveSubTab('users')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeSubTab === 'users'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-600'
            }`}
          >
            <Users className="w-4 h-4 text-cyan-500" />
            <span>Usuários e seus Cadastros</span>
            <span className="bg-cyan-100 text-cyan-800 text-[9px] font-black font-sans px-1.5 py-0.5 rounded-full">
              {users.length}
            </span>
          </button>

          <button
            onClick={() => setActiveSubTab('permissions')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeSubTab === 'permissions'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-600'
            }`}
          >
            <Shield className="w-4 h-4 text-amber-500" />
            <span>Níveis de Liberação e Permissões</span>
          </button>
        </div>
      </div>

      {/* RENDER ACTIVE TAB */}

      {/* 1. General System Parametrization */}
      {activeSubTab === 'system' && (
        <form onSubmit={handleSaveSystemSettings} className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in duration-200">
          
          {/* Telemetry settings */}
          <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm space-y-4">
            <div className="flex items-center gap-2 pb-2.5 border-b border-slate-100">
              <Cpu className="w-4.5 h-4.5 text-emerald-600" />
              <h3 className="font-sans font-bold text-xs text-slate-800 uppercase tracking-wide">Métricas de Telemetria e GPS</h3>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-slate-700">Intervalo de Telemetria (segundos)</label>
                  <span className="text-xs font-mono font-black text-emerald-700 bg-emerald-50 border border-emerald-105 px-2 py-0.5 rounded-lg">{tickSpeed} s</span>
                </div>
                <input
                  type="range"
                  min="2"
                  max="30"
                  value={tickSpeed}
                  onChange={(e) => setTickSpeed(parseInt(e.target.value))}
                  className="w-full accent-emerald-500 bg-slate-100 rounded-lg appearance-none h-1.5 cursor-pointer"
                />
                <span className="text-[10px] text-slate-400 block font-medium leading-relaxed">
                  Controla a frequência de sincronização das caçambas ativas e velocidade dos caminhões.
                </span>
              </div>

              <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-100 mt-2">
                <div>
                  <span className="text-xs font-black text-slate-800 block">Roteamento Inteligente Ativo</span>
                  <span className="text-[10px] text-slate-400 mt-0.5 block leading-normal max-w-sm">
                    Utiliza cálculos em tempo real para propor desvios ecológicos para as caçambas de entulho.
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={rerouting}
                  onChange={(e) => setRerouting(e.target.checked)}
                  className="w-4.5 h-4.5 rounded text-emerald-600 focus:ring-emerald-500 accent-emerald-500 cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Environmental Carbon compensation */}
          <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm space-y-4">
            <div className="flex items-center gap-2 pb-2.5 border-b border-slate-100">
              <Leaf className="w-4.5 h-4.5 text-emerald-500" />
              <h3 className="font-sans font-bold text-xs text-slate-800 uppercase tracking-wide">Parâmetros Ambientais (Compensação)</h3>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 block">Coeficiente de Equivalência de Carbono</label>
                <div className="flex gap-3">
                  <input
                    type="number"
                    step="0.1"
                    value={co2Coefficient}
                    onChange={(e) => setCo2Coefficient(parseFloat(e.target.value) || 0)}
                    className="bg-slate-50 border border-slate-200 p-2.5 text-xs rounded-xl text-slate-850 font-mono font-extrabold w-24 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  />
                  <div className="text-[10px] text-slate-400 leading-normal flex items-center font-medium">
                    Toneladas de resíduo de caçamba reciclado necessárias para poupar uma tonelada métrica de emissões brutas.
                  </div>
                </div>
                <span className="text-[10px] text-slate-400 block pt-1 font-medium">
                  Configura o multiplicador estatístico exibido no Dashboard principal da Relâmpago Caçambas.
                </span>
              </div>
            </div>
          </div>

          {/* Company Data Details */}
          <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm lg:col-span-2 space-y-4">
            <div className="flex items-center gap-2 pb-2.5 border-b border-slate-100">
              <Building className="w-4.5 h-4.5 text-indigo-600" />
              <h3 className="font-sans font-bold text-xs text-slate-800 uppercase tracking-wide">Informações e Dados Corporativos</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Razão Social da Corporação</label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 p-2.5 text-xs rounded-xl text-slate-800 font-bold focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">CNPJ Cadastrado</label>
                <input
                  type="text"
                  value={cnpj}
                  onChange={(e) => setCnpj(e.target.value)}
                  placeholder="02.948.345/0001-05"
                  className="w-full bg-slate-50 border border-slate-200 p-2.5 text-xs rounded-xl text-slate-800 font-mono font-bold focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Terminal de Descarte Padrão</label>
                <select
                  value={defaultTerminal}
                  onChange={(e) => setDefaultTerminal(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 p-2.5 text-xs rounded-xl text-slate-800 font-bold focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                >
                  <option value="Aterro Central - Setor 4">Aterro Central - Setor 4</option>
                  <option value="Usina de Recuperação de Biogás">Usina de Recuperação de Biogás</option>
                  <option value="Aterro de Resíduos Perigosos - Área C">Aterro de Resíduos Perigosos - Área C</option>
                  <option value="Estação de Resíduos Regional">Estação de Resíduos Regional</option>
                </select>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="text-[10px] text-slate-400 font-mono leading-normal">
                Plataforma Relâmpago Caçambas v3.6 • Licenciado sob CNPJ <strong>{cnpj}</strong>
              </div>

              <button
                type="submit"
                className="bg-emerald-650 hover:bg-emerald-650/90 active:bg-emerald-700 text-white font-extrabold text-[11px] uppercase tracking-wider px-5 py-2.5 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer shadow-md transition-all active:scale-98"
              >
                <Save className="w-4 h-4 text-emerald-300" />
                <span>Salvar Parâmetros</span>
              </button>
            </div>
          </div>
        </form>
      )}

      {/* 2. Users Database & Registration Module */}
      {activeSubTab === 'users' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-200">
          
          {/* Left column: Registration forms */}
          <div className="space-y-6">

          {/* User Registration Form */}
          <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm space-y-4">
            <div className="flex items-center gap-2 pb-2.5 border-b border-slate-100">
              <UserPlus className="w-4.5 h-4.5 text-cyan-600" />
              <h3 className="font-sans font-bold text-xs text-slate-800 uppercase tracking-wide">Novo Cadastro de Usuário</h3>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Nome Completo</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Pedro Henrique Souza"
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl text-xs font-sans text-slate-800 font-semibold focus:ring-1 focus:ring-cyan-500 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Endereço de E-mail</label>
                <input
                  type="email"
                  required
                  placeholder="Ex: pedro@relampago.com"
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl text-xs font-sans text-slate-800 font-semibold focus:ring-1 focus:ring-cyan-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Nível de Função</label>
                  <select
                    value={newUserRole}
                    onChange={(e) => setNewUserRole(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 p-2 rounded-xl text-xs font-sans font-bold text-slate-700"
                  >
                    <option value="Administrador Geral">Administrador Geral</option>
                    <option value="Diretor de Operações">Diretor de Operações</option>
                    <option value="Financeiro">Financeiro</option>
                    <option value="Motorista">Motorista</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Estado Inicial</label>
                  <select
                    value={newUserStatus}
                    onChange={(e) => setNewUserStatus(e.target.value as 'Ativo' | 'Inativo')}
                    className="w-full bg-slate-50 border border-slate-200 p-2 rounded-xl text-xs font-sans font-bold text-slate-700"
                  >
                    <option value="Ativo">Ativo/Liberado</option>
                    <option value="Inativo">Inativo/Bloqueado</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-cyan-600 hover:bg-cyan-550 active:bg-cyan-700 text-white font-extrabold text-xs uppercase tracking-wider py-3 rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow-md transition-all active:scale-98"
              >
                <Plus className="w-4 h-4 text-emerald-300" />
                <span>Salvar Usuário</span>
              </button>
            </form>
          </div>

            {/* Invite Driver Form */}
            <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm space-y-4">
              <div className="flex items-center gap-2 pb-2.5 border-b border-slate-100">
                <Send className="w-4.5 h-4.5 text-emerald-600" />
                <h3 className="font-sans font-bold text-xs text-slate-800 uppercase tracking-wide">Convidar Novo Motorista</h3>
              </div>

              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-[10px] text-emerald-800 leading-relaxed">
                O administrador cadastra o e-mail do motorista. O sistema envia um e-mail de confirmação e o motorista só é liberado após confirmar o cadastro.
              </div>

              <form onSubmit={handleInviteDriver} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">E-mail do Motorista</label>
                  <input
                    type="email"
                    required
                    placeholder="Ex: motorista@email.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl text-xs font-sans text-slate-800 font-semibold focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Vincular a Motorista (opcional)</label>
                  <select
                    value={inviteLinkedDriver}
                    onChange={(e) => setInviteLinkedDriver(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 p-2 rounded-xl text-xs font-sans font-bold text-slate-700"
                  >
                    <option value="">-- Sem Vinculação --</option>
                    {allAvailableDrivers.map(drv => (
                      <option key={drv} value={drv}>{drv}</option>
                    ))}
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={inviteLoading}
                  className="w-full bg-emerald-600 hover:bg-emerald-550 active:bg-emerald-700 text-white font-extrabold text-xs uppercase tracking-wider py-3 rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow-md transition-all active:scale-98 disabled:opacity-50"
                >
                  {inviteLoading ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Convidar Motorista</span>
                    </>
                  )}
                </button>
              </form>

              {inviteSuccessMsg && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-[10px] text-emerald-800 leading-relaxed space-y-2">
                  <p>{inviteSuccessMsg}</p>
                  {inviteGeneratedPassword && (
                    <div className="bg-white border border-emerald-300 rounded-lg p-3">
                      <div className="flex items-center gap-1.5 text-[9px] font-black text-slate-500 uppercase tracking-wider mb-1.5">
                        <Key className="w-3 h-3" />
                        <span>Senha Temporária (repassar ao motorista)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <code className="text-xs font-mono font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200 select-all flex-1">
                          {inviteGeneratedPassword}
                        </code>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(inviteGeneratedPassword);
                            onShowNotification('Senha copiada!');
                          }}
                          className="p-2 bg-slate-100 hover:bg-slate-200 rounded-lg border border-slate-200 cursor-pointer"
                          title="Copiar senha"
                        >
                          <Copy className="w-4 h-4 text-slate-600" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Active Users Table Grid */}
          <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Users className="w-4.5 h-4.5 text-slate-700" />
                <h3 className="font-sans font-bold text-xs text-slate-800 uppercase tracking-wide">Base de Usuários Cadastrados</h3>
              </div>
              <span className="text-[9px] font-black tracking-widest text-slate-400 bg-slate-100 border border-slate-200 rounded px-2.5 py-0.5">
                {users.length} INTEGRANTES ATIVOS
              </span>
            </div>

            <div className="space-y-4">
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-3xs bg-slate-50/20">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-150 text-[10px] font-black text-slate-500 uppercase tracking-wider">
                        <th className="px-4 py-3">Nome Integrante</th>
                        <th className="px-4 py-3">Nível de Função</th>
                        <th className="px-4 py-3">Motorista Vinculado</th>
                        <th className="px-4 py-3 text-center">Status</th>
                        <th className="px-4 py-3 text-right">Ação</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {users.map((u) => {
                        return (
                          <tr key={u.id} className="hover:bg-slate-50/70 transition-all">
                            {/* avatar + description email */}
                            <td className="px-4 py-3 whitespace-nowrap">
                              <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0">
                                  <span className="font-black text-xs text-slate-600">
                                    {u.name.charAt(0)}
                                  </span>
                                </div>
                                <div className="flex flex-col">
                                  <span className="text-xs font-bold text-slate-800 leading-tight">{u.name}</span>
                                  <span className="text-[10px] text-slate-450 leading-none mt-0.5 flex items-center gap-1">
                                    <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                                    {u.email}
                                  </span>
                                </div>
                              </div>
                            </td>

                            {/* role */}
                            <td className="px-4 py-3 whitespace-nowrap">
                              <div className="flex items-center gap-1.5 pt-0.5">
                                <Shield className={`w-3.5 h-3.5 ${
                                  u.role === 'Administrador Geral' ? 'text-amber-500' :
                                  u.role === 'Diretor de Operações' ? 'text-indigo-550' :
                                  u.role === 'Financeiro' ? 'text-emerald-500' : 'text-slate-400'
                                }`} />
                                <span className={`text-[11px] font-bold ${
                                  u.role === 'Administrador Geral' ? 'text-amber-800' :
                                  u.role === 'Diretor de Operações' ? 'text-indigo-700' :
                                  u.role === 'Financeiro' ? 'text-emerald-700' : 'text-slate-700'
                                }`}>
                                  {u.role}
                                </span>
                              </div>
                            </td>

                            {/* linked motorista driver */}
                            <td className="px-4 py-3 whitespace-nowrap">
                              {u.role.toLowerCase().includes('motorista') || u.role.toLowerCase().includes('driver') ? (
                                <select
                                  value={u.linkedDriver || ""}
                                  onChange={(e) => handleLinkDriver(u.id, e.target.value)}
                                  className="bg-slate-50 border border-slate-200 rounded px-1.5 py-1 text-[10px] text-slate-800 outline-none focus:border-cyan-500 font-bold cursor-pointer max-w-[150px]"
                                >
                                  <option value="">-- Sem Vinculação --</option>
                                  {allAvailableDrivers.map((drv) => (
                                    <option key={drv} value={drv}>
                                      {drv}
                                    </option>
                                  ))}
                                </select>
                              ) : (
                                <span className="text-slate-400 text-[10px] font-mono pl-4">—</span>
                              )}
                            </td>

                            {/* status check badge */}
                            <td className="px-4 py-3 text-center whitespace-nowrap">
                              <button
                                type="button"
                                onClick={() => toggleUserStatus(u.id)}
                                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-black cursor-pointer transition-colors border ${
                                  u.status === 'Ativo'
                                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                                    : 'bg-rose-50 text-rose-850 border-rose-200 hover:bg-rose-100'
                                }`}
                                title="Trocar status do usuário"
                              >
                                {u.status === 'Ativo' ? (
                                  <>
                                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                    <span>ATIVO</span>
                                  </>
                                ) : (
                                  <>
                                    <XCircle className="w-3 h-3 text-rose-600" />
                                    <span>BLOQUEADO</span>
                                  </>
                                )}
                              </button>
                            </td>

                            {/* password reset + deleting */}
                            <td className="px-4 py-3 text-right whitespace-nowrap">
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleResetPassword(u.email, u.name)}
                                  className="px-2 py-1 bg-transparent hover:bg-amber-50 text-slate-400 hover:text-amber-600 rounded-lg border border-transparent hover:border-amber-100 transition-colors cursor-pointer"
                                  title="Redefinir senha"
                                >
                                  <Key className="w-4 h-4" />
                                </button>
                                <button
                                  type="button"
                                  disabled={u.role === 'Administrador Geral'}
                                  onClick={() => handleDeleteUser(u.id, u.name)}
                                  className={`px-2 py-1 bg-transparent hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg border border-transparent hover:border-rose-100 transition-colors ${
                                    u.role === 'Administrador Geral' ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'
                                  }`}
                                  title={u.role === 'Administrador Geral' ? "Impossível excluir o administrador raiz" : "Excluir Cadastro"}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Security info banner for GDPR and compliance */}
              <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="text-xs font-black text-amber-900 uppercase">Segurança Operacional da Relâmpago Caçambas</h4>
                  <p className="text-[10px] text-amber-800 leading-normal font-medium">
                    As permissões e cargos regulam o controle das faturas e os valores repassados aos bota foras e motoristas. Bloqueie ou altere os status corporativos caso algum funcionário mude de setor correspondente.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. Role Authorization Matrix & Release Levels */}
      {activeSubTab === 'permissions' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6 animate-in fade-in duration-200">
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div className="flex items-start gap-2.5">
              <Shield className="w-5 h-5 text-amber-500 mt-1 shrink-0" />
              <div>
                <h3 className="font-sans font-black text-base text-slate-900 leading-tight">Níveis de Liberação & Permissões</h3>
                <p className="text-xs text-slate-400 mt-0.5 font-medium">Defina regras de acesso e privilégios específicos para cada cargo da Relâmpago Caçambas.</p>
              </div>
            </div>

            {/* Quick selector of active Role */}
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-1.5 self-start md:self-auto">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">EDITAR CARGO:</span>
              <select
                value={selectedRoleForPermissions}
                onChange={(e) => setSelectedRoleForPermissions(e.target.value)}
                className="bg-transparent border-none text-xs font-black text-slate-800 focus:outline-none cursor-pointer"
              >
                <option value="Administrador Geral">Administrador Geral</option>
                <option value="Diretor de Operações">Diretor de Operações</option>
                <option value="Financeiro">Financeiro</option>
                <option value="Motorista">Motorista</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Left side summary detail cards */}
            <div className="space-y-4">
              <div className="bg-slate-900 text-white p-5 rounded-2xl border border-slate-850 relative overflow-hidden flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="p-1 px-2 text-[8px] font-black bg-amber-500/10 border border-amber-500/20 text-amber-400 uppercase tracking-widest rounded">
                      CARGO ATIVO
                    </span>
                    <Shield className="w-4 h-4 text-amber-400" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-sm font-sans font-black text-white">{selectedRoleForPermissions}</h4>
                    <p className="text-[10px] text-slate-400 leading-relaxed">
                      Este perfil possui atribuições de liberação direta de ações na balança e fluxos monetários da Relâmpago Caçambas.
                    </p>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-820 mt-4 text-[10px] text-slate-500 flex gap-1.5 items-center">
                  <UserCheck className="w-3.5 h-3.5 text-emerald-450 shrink-0" />
                  <span>Acesso auditado por Logs do Sistema</span>
                </div>
              </div>

              {/* Role explanation */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-2">
                <span className="font-extrabold text-[10px] uppercase text-slate-405 tracking-wider block">Atalhos Rápidos</span>
                <p className="text-slate-500 text-[11px] leading-normal font-medium">
                  A equipe financeira necessita exclusivamente de acessos a tarifas, comissões e balanços brutos. Diretores de Operações necessitam de GPS e lançamentos de caçambas integrados.
                </p>
              </div>

            </div>

            {/* Right side Matrix table toggle items */}
            <div className="md:col-span-2 space-y-4">
              <div className="border border-slate-200 rounded-2xl overflow-hidden bg-slate-50/10">
                <div className="bg-slate-50 px-4 py-3 border-b border-slate-150 flex items-center justify-between">
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Permissão Técnica</span>
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Estado de Liberação</span>
                </div>

                <div className="divide-y divide-slate-150">
                  {permissionDefinitions.map((perm) => {
                    // Check active value
                    const isActive = !!(permissionsMap[selectedRoleForPermissions] && permissionsMap[selectedRoleForPermissions][perm.id]);
                    
                    return (
                      <div key={perm.id} className="p-4 bg-white hover:bg-slate-50/50 transition-colors flex items-start justify-between gap-5">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-black text-slate-800">{perm.name}</span>
                            
                            {/* Categories tags type */}
                            <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${
                              perm.categories === 'Crítica' ? 'bg-rose-50 text-rose-700 border border-rose-150' :
                              perm.categories === 'Escrita' ? 'bg-indigo-50 text-indigo-700 border border-indigo-150' :
                              'bg-slate-100 text-slate-600 border border-slate-200/50'
                            }`}>
                              {perm.categories}
                            </span>
                          </div>
                          <p className="text-[10.5px] text-slate-450 leading-relaxed font-medium">
                            {perm.description}
                          </p>
                        </div>

                        {/* Interactive toggle control */}
                        <div className="pt-1.5">
                          <button
                            type="button"
                            onClick={() => handleTogglePermission(perm.id)}
                            className={`w-11 h-6 rounded-full transition-colors relative focus:outline-none cursor-pointer ${
                              isActive ? 'bg-emerald-500' : 'bg-slate-200'
                            }`}
                          >
                            <span className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform shadow-xs ${
                              isActive ? 'translate-x-5' : 'translate-x-0'
                            }`} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Save permissions trigger */}
              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={handleSavePermissions}
                  className="bg-indigo-650 hover:bg-indigo-600 active:bg-indigo-700 text-white font-extrabold text-[11px] uppercase tracking-wider px-6 py-3 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer shadow-md transition-all active:scale-98"
                >
                  <Lock className="w-4 h-4 text-indigo-300" />
                  <span>Salvar Regras de Função</span>
                </button>
              </div>

            </div>

          </div>

        </div>
      )}

    </div>
  );
}
