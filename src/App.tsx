/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  CheckCircle2, 
  Info, 
  X, 
  AlertTriangle,
  Leaf,
  HelpCircle,
  Clock,
  BookOpen,
  LifeBuoy
} from 'lucide-react';

// Data types & Pre-populated datasets
import { 
  Vehicle, 
  FuelLog,
  MaintenanceAlert, 
  Invoice, 
  Dispatch, 
  InvoiceStatus,
  BotaFora,
  Lancamento,
  ComissaoMotorista,
  GarageRefill
} from './types';
import { 
  INITIAL_VEHICLES, 
  INITIAL_FUEL_LOGS,
  INITIAL_ALERTS, 
  INITIAL_INVOICES, 
  INITIAL_DISPATCHES, 
  FUEL_TREND_DATA, 
  COST_STRUCTURE_DATA,
  INITIAL_BOTA_FORAS,
  INITIAL_LANCAMENTOS
} from './mockData';

import { supabase, isSupabaseConfigured, proxyInsert, proxyUpdate, proxyDelete } from './lib/supabase';

// Component layout pieces
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import FleetView from './components/FleetView';
import FinanceView from './components/FinanceView';
import DashboardView from './components/DashboardView';
import OperationsView from './components/OperationsView';
import DisposalView from './components/DisposalView';
import SettingsView from './components/SettingsView';
import NewDispatchModal from './components/NewDispatchModal';
import ReportsView from './components/ReportsView';
import CommissionsView from './components/CommissionsView';
import LoginScreen from './components/LoginScreen';
import DriverPortal from './components/DriverPortal';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return localStorage.getItem('relampago_auth_active') === 'true';
  });
  const [currentUserEmail, setCurrentUserEmail] = useState<string>(() => {
    return localStorage.getItem('relampago_auth_email') || '';
  });
  const [currentUserRole, setCurrentUserRole] = useState<string>(() => {
    return localStorage.getItem('relampago_auth_role') || '';
  });

  const [currentTab, setCurrentTab] = useState<string>(() => {
    return localStorage.getItem('relampago_auth_tab') || 
      (localStorage.getItem('relampago_auth_role')?.toLowerCase().includes('motorista') ? 'driver-portal' : 'fleet');
  });
  const [searchTerm, setSearchTerm] = useState<string>('');

  // App core state DB — carregados do localStorage para persistir entre sessões
  const [vehicles, setVehicles] = useState<Vehicle[]>(() => {
    try { const s = localStorage.getItem('relampago_vehicles'); if (s) return JSON.parse(s); } catch {}
    return INITIAL_VEHICLES;
  });
  const [fuelLogs, setFuelLogs] = useState<FuelLog[]>(() => {
    try { const s = localStorage.getItem('relampago_fuel_logs'); if (s) return JSON.parse(s); } catch {}
    return INITIAL_FUEL_LOGS;
  });
  const [alerts, setAlerts] = useState<MaintenanceAlert[]>(() => {
    try { const s = localStorage.getItem('relampago_alerts'); if (s) return JSON.parse(s); } catch {}
    return INITIAL_ALERTS;
  });
  const [invoices, setInvoices] = useState<Invoice[]>(() => {
    try { const s = localStorage.getItem('relampago_invoices'); if (s) return JSON.parse(s); } catch {}
    return INITIAL_INVOICES;
  });
  const [dispatches, setDispatches] = useState<Dispatch[]>(() => {
    try { const s = localStorage.getItem('relampago_dispatches'); if (s) return JSON.parse(s); } catch {}
    return INITIAL_DISPATCHES;
  });
  
  // Bota fora & Lançamentos eco state
  const [botaForas, setBotaForas] = useState<BotaFora[]>(() => {
    try { const s = localStorage.getItem('relampago_bota_foras'); if (s) return JSON.parse(s); } catch {}
    return INITIAL_BOTA_FORAS;
  });
  const [lancamentos, setLancamentos] = useState<Lancamento[]>(() => {
    try { const s = localStorage.getItem('relampago_lancamentos'); if (s) return JSON.parse(s); } catch {}
    return INITIAL_LANCAMENTOS;
  });

  // Commissions (Comissões) tracking state
  const [comissoes, setComissoes] = useState<ComissaoMotorista[]>(() => {
    try { const s = localStorage.getItem('relampago_comissoes'); if (s) return JSON.parse(s); } catch {}
    return [
      { id: 'COM-001', motorista: 'Carlos Santana', vaziasColocadas: 24, retiradas: 22, data: '2026-06-16', createdAt: '2526-06-16T08:30:00Z' },
      { id: 'COM-002', motorista: 'Marcus Warren', vaziasColocadas: 18, retiradas: 18, data: '2026-06-15', createdAt: '2526-06-15T09:12:00Z' },
      { id: 'COM-003', motorista: 'Emily Watson', vaziasColocadas: 30, retiradas: 28, data: '2026-06-12', createdAt: '2526-06-12T11:05:00Z' }
    ];
  });

  // Registered Motoristas (Drivers) state
  const [motoristas, setMotoristas] = useState<string[]>(() => {
    try { const s = localStorage.getItem('relampago_motoristas'); if (s) return JSON.parse(s); } catch {}
    return ['Carlos Santana', 'Marcus Warren', 'Emily Watson', 'Sophia Loren', 'Alexandre Nero', 'Beatriz Albuquerque'];
  });

  // Helper para verificar se usuário é motorista
  const isDriverUser = (): boolean => {
    return currentUserRole.toLowerCase().includes('motorista') || currentUserEmail === 'motorista@relampago.com';
  };

  // Forçar reativamente usuários de nível Motorista a acessarem unicamente o Portal do Motorista
  useEffect(() => {
    if (isDriverUser() && currentTab !== 'driver-portal') {
      setCurrentTab('driver-portal');
    }
  }, [currentUserRole, currentUserEmail, currentTab]);

  // Limpeza automatica: remove de relampago_invited_drivers quem nao está mais em relampago_system_users
  useEffect(() => {
    try {
      const invitedRaw = localStorage.getItem('relampago_invited_drivers');
      const systemRaw = localStorage.getItem('relampago_system_users');
      if (invitedRaw && systemRaw) {
        const invited = JSON.parse(invitedRaw);
        const system = JSON.parse(systemRaw);
        const systemEmails = new Set(system.map((u: any) => u.email?.toLowerCase().trim()));
        const filtered = invited.filter((d: any) => systemEmails.has(d.email?.toLowerCase().trim()));
        if (filtered.length !== invited.length) {
          localStorage.setItem('relampago_invited_drivers', JSON.stringify(filtered));
          console.log('Limpeza automatica:', invited.length - filtered.length, 'motorista(s) removido(s) de relampago_invited_drivers');
        }
      }
    } catch {}
  }, []);

  // Load data from Cloud SQL / Supabase when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      const loadDatabaseData = async () => {
        try {
          if (isSupabaseConfigured()) {
            console.log("Supabase config detected. Querying Supabase directly...");
            const { data: listVehicles, error: errVehicles } = await supabase.from('vehicles').select('*');
            if (!errVehicles) {
              setVehicles((listVehicles || []).map((v: any) => {
                let parsedTrend: number[] = [];
                if (v.trend) {
                  if (typeof v.trend === 'string') {
                    try {
                      parsedTrend = JSON.parse(v.trend);
                    } catch (e) {
                      const match = v.trend.match(/\{([^}]+)\}/);
                      if (match) {
                        parsedTrend = match[1].split(',').map(Number);
                      } else {
                        parsedTrend = [];
                      }
                    }
                  } else if (Array.isArray(v.trend)) {
                    parsedTrend = v.trend;
                  }
                }
                return {
                  id: v.id,
                  status: v.status,
                  efficiency: v.efficiency,
                  fuelUsed: v.fuel_used !== undefined ? v.fuel_used : v.fuelUsed,
                  costPerKm: v.cost_per_km !== undefined ? v.cost_per_km : v.costPerKm,
                  driver: v.driver,
                  trend: parsedTrend,
                  lastMaintenanceDate: v.last_maintenance_date || v.lastMaintenanceDate,
                  speed: v.speed,
                  lat: v.lat,
                  lng: v.lng,
                  isActive: v.is_active !== undefined ? v.is_active : v.isActive,
                  type: v.type,
                  initialKm: v.initial_km !== undefined ? v.initial_km : v.initialKm
                };
              }));
            } else {
              console.error("Supabase load vehicles error:", errVehicles);
            }

            const { data: listBf, error: errBf } = await supabase.from('bota_foras').select('*');
            if (!errBf) {
              setBotaForas((listBf || []).map((b: any) => ({
                id: b.id,
                nome: b.nome,
                cnpj: b.cnpj,
                telefone: b.telefone,
                endereco: b.endereco,
                createdAt: b.created_at || b.createdAt,
                valorPadraoDescarte: (b.valor_padrao_descarte !== undefined && b.valor_padrao_descarte !== null) ? b.valor_padrao_descarte : undefined
              })));
            }

            const { data: listLan, error: errLan } = await supabase.from('lancamentos').select('*');
            if (!errLan) {
              setLancamentos((listLan || []).map((l: any) => ({
                id: l.id,
                botaForaId: l.bota_fora_id || l.botaForaId,
                botaForaNome: l.bota_fora_nome || l.botaForaNome,
                quantidadeCacambas: l.quantidade_cacambas !== undefined ? l.quantidade_cacambas : l.quantidadeCacambas,
                valor: l.valor,
                data: l.data,
                driverName: l.driver_name || l.driverName,
                vehicleId: l.vehicle_id || l.vehicleId,
                status: l.status,
                createdAt: l.created_at || l.createdAt,
                lat: l.lat,
                lng: l.lng,
                observacao: l.observacao || l.observation
              })));
            }

            const { data: listFuel, error: errFuel } = await supabase.from('fuel_logs').select('*');
            if (!errFuel) {
              setFuelLogs((listFuel || []).map((f: any) => ({
                id: f.id,
                vehicleId: f.vehicle_id || f.vehicleId,
                quantidadeLitros: f.quantidade_litros !== undefined ? f.quantidade_litros : f.quantidadeLitros,
                kmInicial: f.km_inicial !== undefined ? f.km_inicial : f.kmInicial,
                kmFinal: f.km_final !== undefined ? f.km_final : f.kmFinal,
                valorPago: f.valor_pago !== undefined ? f.valor_pago : f.valorPago,
                data: f.data,
                driver: f.driver,
                mediaKmL: f.media_km_l !== undefined ? f.media_km_l : f.mediaKmL,
                tipo: f.tipo,
                isRetiradaDiversa: f.is_retirada_diversa !== undefined ? f.is_retirada_diversa : f.isRetiradaDiversa,
                lat: f.lat,
                lng: f.lng
              })));
            }

            const { data: listAlerts, error: errAlerts } = await supabase.from('maintenance_alerts').select('*');
            if (!errAlerts) {
              setAlerts(listAlerts || []);
            }

            const { data: listInvoices, error: errInvoices } = await supabase.from('invoices').select('*');
            if (!errInvoices) {
              setInvoices((listInvoices || []).map((i: any) => ({
                id: i.id,
                clientName: i.client_name || i.clientName,
                entityCode: i.entity_code || i.entityCode,
                serviceDesc: i.service_desc || i.serviceDesc,
                issueDate: i.issue_date || i.issueDate,
                dueDate: i.due_date || i.dueDate,
                amount: i.amount,
                status: i.status
              })));
            }

            const { data: listDisp, error: errDisp } = await supabase.from('dispatches').select('*');
            if (!errDisp) {
              setDispatches((listDisp || []).map((d: any) => ({
                id: d.id,
                vehicleId: d.vehicle_id || d.vehicleId,
                driverName: d.driver_name || d.driverName,
                clientName: d.client_name || d.clientName,
                origin: d.origin,
                destination: d.destination,
                payloadType: d.payload_type || d.payloadType,
                weight: d.weight,
                status: d.status,
                createdAt: d.created_at || d.createdAt
              })));
            }

            const { data: listMotoristas, error: errMotoristas } = await supabase.from('motoristas').select('*');
            if (!errMotoristas) {
              setMotoristas((listMotoristas || []).map((m: any) => m.nome || m.name).filter(Boolean));
            } else {
              console.error("Supabase load motoristas error:", errMotoristas);
            }

            const { data: listComissoes, error: errComissoes } = await supabase.from('comissoes').select('*').order('created_at', { ascending: false });
            if (!errComissoes) {
              setComissoes(listComissoes.map((c: any) => {
                const vaziasColocadas = c.vazias_colocadas !== undefined && c.vazias_colocadas !== null
                  ? Number(c.vazias_colocadas)
                  : (c.vaziasColocadas !== undefined && c.vaziasColocadas !== null ? Number(c.vaziasColocadas) : 0);
                
                const retiradas = c.retiradas !== undefined && c.retiradas !== null
                  ? Number(c.retiradas)
                  : (c.retiradas_qtd !== undefined && c.retiradas_qtd !== null ? Number(c.retiradas_qtd) : 0);

                return {
                  id: c.id,
                  motorista: c.motorista || c.driver || c.driverName || c.driver_name || 'Carlos Santana',
                  vaziasColocadas,
                  retiradas,
                  data: c.data,
                  createdAt: c.created_at || c.createdAt
                };
              }));
            } else if (errComissoes) {
              console.error("Supabase load comissoes error:", errComissoes);
            }

            // Load garage refills from Supabase (se tabela existir)
            const { data: listGarage, error: errGarage } = await supabase.from('garage_refills').select('*').order('created_at', { ascending: false });
            if (!errGarage && listGarage && listGarage.length > 0) {
              setGarageRefills(listGarage.map((g: any) => ({
                id: g.id,
                data: g.data,
                quantidade_litros: g.quantidade_litros,
                valor_total: g.valor_total,
                preco_por_litro: g.preco_por_litro,
                created_at: g.created_at || g.createdAt
              })));
            }

            return;
          }

          const resVehicles = await fetch("/api/vehicles");
          if (resVehicles.ok) {
            const data = await resVehicles.json();
            setVehicles(data);
          }
          const resBf = await fetch("/api/botaforas");
          if (resBf.ok) {
            const data = await resBf.json();
            setBotaForas(data);
          }
          const resLan = await fetch("/api/lancamentos");
          if (resLan.ok) {
            const data = await resLan.json();
            setLancamentos(data);
          }
          const resFuel = await fetch("/api/fuel-logs");
          if (resFuel.ok) {
            const data = await resFuel.json();
            setFuelLogs(data);
          }
          const resAlerts = await fetch("/api/alerts");
          if (resAlerts.ok) {
            const data = await resAlerts.json();
            setAlerts(data);
          }
          const resInvoices = await fetch("/api/invoices");
          if (resInvoices.ok) {
            const data = await resInvoices.json();
            setInvoices(data);
          }
          const resDispatches = await fetch("/api/dispatches");
          if (resDispatches.ok) {
            const data = await resDispatches.json();
            setDispatches(data);
          }
        } catch (error) {
          console.error("Database connection error, trying localStorage:", error);
          const loadFallback = (key: string, setter: (v: any) => void) => {
            try { const s = localStorage.getItem(key); if (s) setter(JSON.parse(s)); } catch {}
          };
          loadFallback('relampago_vehicles', setVehicles);
          loadFallback('relampago_fuel_logs', setFuelLogs);
          loadFallback('relampago_alerts', setAlerts);
          loadFallback('relampago_invoices', setInvoices);
          loadFallback('relampago_dispatches', setDispatches);
          loadFallback('relampago_bota_foras', setBotaForas);
          loadFallback('relampago_lancamentos', setLancamentos);
          loadFallback('relampago_comissoes', setComissoes);
          loadFallback('relampago_motoristas', setMotoristas);
        }
      };
      loadDatabaseData();
    }
  }, [isAuthenticated]);

  // Sincroniza automaticamente cada estado com localStorage sempre que muda
  useEffect(() => { localStorage.setItem('relampago_vehicles', JSON.stringify(vehicles)); }, [vehicles]);
  useEffect(() => { localStorage.setItem('relampago_fuel_logs', JSON.stringify(fuelLogs)); }, [fuelLogs]);
  useEffect(() => { localStorage.setItem('relampago_alerts', JSON.stringify(alerts)); }, [alerts]);
  useEffect(() => { localStorage.setItem('relampago_invoices', JSON.stringify(invoices)); }, [invoices]);
  useEffect(() => { localStorage.setItem('relampago_dispatches', JSON.stringify(dispatches)); }, [dispatches]);
  useEffect(() => { localStorage.setItem('relampago_bota_foras', JSON.stringify(botaForas)); }, [botaForas]);
  useEffect(() => { localStorage.setItem('relampago_lancamentos', JSON.stringify(lancamentos)); }, [lancamentos]);
  useEffect(() => { localStorage.setItem('relampago_comissoes', JSON.stringify(comissoes)); }, [comissoes]);
  useEffect(() => { localStorage.setItem('relampago_motoristas', JSON.stringify(motoristas)); }, [motoristas]);
  useEffect(() => { if (isAuthenticated) localStorage.setItem('relampago_auth_tab', currentTab); }, [currentTab, isAuthenticated]);

  // Garage Diesel Tank States
  const [garageDieselQty, setGarageDieselQty] = useState<number>(() => {
    const saved = localStorage.getItem('relampago_garage_diesel_qty');
    return saved ? parseFloat(saved) : 5000;
  });
  const [garageDieselPrice, setGarageDieselPrice] = useState<number>(() => {
    const saved = localStorage.getItem('relampago_garage_diesel_price');
    return saved ? parseFloat(saved) : 5.68;
  });
  const [garageRefills, setGarageRefills] = useState<GarageRefill[]>(() => {
    const saved = localStorage.getItem('relampago_garage_refills');
    return saved ? JSON.parse(saved) : [];
  });

  const handleAddGarageRefill = (refill: Omit<GarageRefill, 'id' | 'created_at'>) => {
    const record: GarageRefill = {
      ...refill,
      id: `GR-${Date.now()}`,
      created_at: new Date().toISOString()
    };
    setGarageRefills(prev => {
      const updated = [record, ...prev];
      localStorage.setItem('relampago_garage_refills', JSON.stringify(updated));
      return updated;
    });
    // Sync to Supabase (se tabela existir)
    if (isSupabaseConfigured()) {
      proxyInsert('garage_refills', {
        id: record.id,
        data: record.data,
        quantidade_litros: record.quantidade_litros,
        valor_total: record.valor_total,
        preco_por_litro: record.preco_por_litro,
        created_at: record.created_at
      });
    }
    // Increase garage stock
    const newQty = garageDieselQty + refill.quantidade_litros;
    setGarageDieselQty(newQty);
    localStorage.setItem('relampago_garage_diesel_qty', newQty.toString());
    localStorage.setItem('relampago_garage_diesel_price', refill.preco_por_litro.toString());
  };

  const handleDeleteGarageRefill = (id: string) => {
    const target = garageRefills.find(r => r.id === id);
    if (!target) return;
    setGarageRefills(prev => {
      const updated = prev.filter(r => r.id !== id);
      localStorage.setItem('relampago_garage_refills', JSON.stringify(updated));
      return updated;
    });
    // Subtract from garage stock
    const newQty = Math.max(0, garageDieselQty - target.quantidade_litros);
    setGarageDieselQty(newQty);
    localStorage.setItem('relampago_garage_diesel_qty', newQty.toString());
    if (isSupabaseConfigured()) {
      proxyDelete('garage_refills', `id=eq.${id}`);
    }
  };

  const handleEditGarageRefill = (id: string, refill: Omit<GarageRefill, 'id' | 'created_at'>) => {
    const oldRecord = garageRefills.find(r => r.id === id);
    setGarageRefills(prev => {
      const updated = prev.map(r => r.id === id ? { ...r, ...refill } : r);
      localStorage.setItem('relampago_garage_refills', JSON.stringify(updated));
      return updated;
    });
    // Adjust garage stock
    if (oldRecord) {
      const diff = refill.quantidade_litros - oldRecord.quantidade_litros;
      const newQty = Math.max(0, garageDieselQty + diff);
      setGarageDieselQty(newQty);
      localStorage.setItem('relampago_garage_diesel_qty', newQty.toString());
    }
    if (isSupabaseConfigured()) {
      proxyUpdate('garage_refills', {
        data: refill.data,
        quantidade_litros: refill.quantidade_litros,
        valor_total: refill.valor_total,
        preco_por_litro: refill.preco_por_litro
      }, `id=eq.${id}`);
    }
  };

  const handleAddMotorista = (name: string) => {
    setMotoristas(prev => [...prev, name]);
    if (isSupabaseConfigured()) {
      supabase.from('motoristas').insert([{ nome: name }]).then(({ error }) => {
        if (error) console.error("Supabase error saving motorista:", error);
      });
    }
    handleShowToast("Motorista Cadastrado", `O motorista "${name}" foi adicionado com sucesso.`, "success");
  };

  const handleUpdateMotorista = (oldName: string, newName: string) => {
    setMotoristas(prev => prev.map(x => x === oldName ? newName : x));
    setComissoes(prev => prev.map(c => c.motorista === oldName ? { ...c, motorista: newName } : c));
    setDispatches(prev => prev.map(d => d.driverName === oldName ? { ...d, driverName: newName } : d));
    
    if (isSupabaseConfigured()) {
      supabase.from('motoristas').update({ nome: newName }).eq('nome', oldName).then();
    }

    handleShowToast("Motorista Atualizado", `O cadastro de "${oldName}" foi alterado para "${newName}".`, "success");
  };

  const handleDeleteMotorista = (name: string) => {
    setMotoristas(prev => prev.filter(x => x !== name));
    if (isSupabaseConfigured()) {
      supabase.from('motoristas').delete().eq('nome', name).then();
    }
    handleShowToast("Motorista Removido", `O motorista "${name}" foi removido do cadastro.`, "info");
  };

  const handleAddComissao = (newCom: Omit<ComissaoMotorista, 'id' | 'createdAt'>) => {
    const freshRecord: ComissaoMotorista = {
      ...newCom,
      id: `COM-${Math.floor(100 + Math.random() * 900)}`,
      createdAt: new Date().toISOString()
    };
    setComissoes(prev => [freshRecord, ...prev]);

    if (isSupabaseConfigured()) {
      supabase.from('comissoes').insert([{
        id: freshRecord.id,
        motorista: freshRecord.motorista,
        vazias_colocadas: freshRecord.vaziasColocadas ?? null,
        retiradas: freshRecord.retiradas ?? null,
        data: freshRecord.data,
        created_at: freshRecord.createdAt
      }]).then(({ error }) => {
        if (error) console.error("Supabase error saving comissao:", error);
      });
    }

    handleShowToast(
      "Comissão Registrada", 
      `Atividade gravada com sucesso para o motorista ${newCom.motorista}.`, 
      "success"
    );
  };

  const handleUpdateComissao = (updatedCom: ComissaoMotorista) => {
    setComissoes(prev => prev.map(c => c.id === updatedCom.id ? updatedCom : c));
    if (isSupabaseConfigured()) {
      supabase.from('comissoes').update({
        motorista: updatedCom.motorista,
        vazias_colocadas: updatedCom.vaziasColocadas ?? null,
        retiradas: updatedCom.retiradas ?? null,
        data: updatedCom.data
      }).eq('id', updatedCom.id).then(({ error }) => {
        if (error) console.error("Supabase error updating comissao:", error);
      });
    }
    handleShowToast(
      "Comissão Atualizada",
      `Os dados de comissão para ${updatedCom.motorista} foram salvos com sucesso.`,
      "success"
    );
  };

  const handleDeleteComissao = (id: string) => {
    setComissoes(prev => prev.filter(c => c.id !== id));
    if (isSupabaseConfigured()) {
      supabase.from('comissoes').delete().eq('id', id).then();
    }
    handleShowToast(
      "Lançamento Removido", 
      "O registro de comissão do motorista foi deletado com sucesso.", 
      "info"
    );
  };
  
  // Charts Telemetry State
  const [fuelTrend, setFuelTrend] = useState(FUEL_TREND_DATA);
  const [costStructure, setCostStructure] = useState(COST_STRUCTURE_DATA);

  // Layout UI Controllers
  const [isNewDispatchOpen, setIsNewDispatchOpen] = useState(false);
  const [notificationsCount, setNotificationsCount] = useState(3);
  
  // Custom interactive toast notification state
  const [toast, setToast] = useState<{
    visible: boolean;
    title: string;
    message: string;
    type: 'success' | 'info';
  }>({
    visible: false,
    title: '',
    message: '',
    type: 'success'
  });

  // Action: Trigger toast popup helper
  const handleShowToast = (title: string, message: string, type: 'success' | 'info' = 'success') => {
    setToast({
      visible: true,
      title,
      message,
      type
    });
  };

  // Auto-dismiss toast timer
  useEffect(() => {
    if (toast.visible) {
      const timer = setTimeout(() => {
        setToast(prev => ({ ...prev, visible: false }));
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [toast.visible]);

  const handleLoginSuccess = (userEmail: string, userRole: string) => {
    setIsAuthenticated(true);
    setCurrentUserEmail(userEmail);
    setCurrentUserRole(userRole);
    localStorage.setItem('relampago_auth_active', 'true');
    localStorage.setItem('relampago_auth_email', userEmail);
    localStorage.setItem('relampago_auth_role', userRole);

    const isDriver = userRole.toLowerCase().includes('motorista') || userEmail === 'motorista@relampago.com';
    const tab = isDriver ? 'driver-portal' : 'fleet';
    setCurrentTab(tab);
    localStorage.setItem('relampago_auth_tab', tab);

    handleShowToast("Acesso Autorizado", `Bem-vindo! Entrou como ${userRole}.`, "success");
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('relampago_auth_active');
    localStorage.removeItem('relampago_auth_email');
    localStorage.removeItem('relampago_auth_role');
    handleShowToast("Sessão Encerrada", "Você saiu do sistema de forma segura.", "info");
  };

  // Action: Trigger micro-telemetry fluctuations on custom intervals
  const handleRefreshData = () => {
    setVehicles(prev => prev.map(v => {
      if (v.status === 'In Transit') {
        const randomSpeedChange = Math.floor(Math.random() * 9) - 4; // -4 to +4 speed
        const currentSpeed = Math.max(45, Math.min(110, (v.speed || 60) + randomSpeedChange));
        // fluctuate efficiency slightly
        const randomEfficiencyChange = parseFloat((Math.random() * 0.4 - 0.2).toFixed(1));
        const efficiency = Math.max(2.1, Math.min(5.2, parseFloat(((v.efficiency ?? 0) + randomEfficiencyChange).toFixed(1))));

        const updated = {
          ...v,
          speed: currentSpeed,
          efficiency,
          fuelUsed: v.fuelUsed + Math.floor(Math.random() * 12) + 2
        };

        if (isSupabaseConfigured()) {
          supabase.from('vehicles').update({
            speed: updated.speed,
            efficiency: updated.efficiency,
            fuel_used: updated.fuelUsed
          }).eq('id', v.id).then();
        }

        return updated;
      }
      return v;
    }));

    handleShowToast(
      "Sincronização Concluída", 
      "Rastreamento de satélite, dados de telemetria GPS e queima de diesel atualizados com sucesso.", 
      "success"
    );
  };

  // Action: Stop dispatch and pull vehicle safely into maintenance
  const handleStopDispatchVehicle = (vehicleId: string, alertId: string) => {
    setVehicles(prev => prev.map(v => {
      if (v.id === vehicleId) {
        if (isSupabaseConfigured()) {
          supabase.from('vehicles').update({ status: 'Maintenance', speed: 0 }).eq('id', vehicleId).then();
        }
        return {
          ...v,
          status: 'Maintenance',
          speed: 0,
          lat: v.lat + (Math.random() * 10 - 5), // adjust coordinates to look parked
          lng: v.lng + (Math.random() * 10 - 5)
        };
      }
      return v;
    }));

    // Mark matching alert resolved
    setAlerts(prev => prev.map(a => a.id === alertId ? { ...a, resolved: true } : a));
    if (isSupabaseConfigured()) {
      supabase.from('maintenance_alerts').update({ resolved: true }).eq('id', alertId).then();
    }

    // Resolve matching running dispatch
    setDispatches(prev => prev.map(d => {
      if (d.vehicleId === vehicleId && d.status === 'In Transit') {
        if (isSupabaseConfigured()) {
          supabase.from('dispatches').update({ status: 'Completed' }).eq('id', d.id).then();
        }
        return { ...d, status: 'Completed' };
      }
      return d;
    }));

    setNotificationsCount(prev => Math.max(0, prev - 1));
    handleShowToast(
      "Parada de Emergência Ativa", 
      `Comados enviados! O veículo ${vehicleId} foi imobilizado com sucesso e direcionado para a central mais próxima.`, 
      "success"
    );
  };

  // Action: Log maintenance ticket
  const handleLogMaintenanceTicket = (alertId: string) => {
    setAlerts(prev => prev.map(a => a.id === alertId ? { ...a, resolved: true } : a));
    if (isSupabaseConfigured()) {
      supabase.from('maintenance_alerts').update({ resolved: true }).eq('id', alertId).then();
    }
    setNotificationsCount(prev => Math.max(0, prev - 1));
    handleShowToast(
      "Ordem de Serviço Aberta", 
      "Oficina mecânica da Relâmpago Caçambas acionada para inspeção corretiva urgente.", 
      "success"
    );
  };

  // Action: Complete and secure cargo delivery
  const handleCompleteRoute = (dispatchId: string) => {
    const targetDisp = dispatches.find(d => d.id === dispatchId);
    if (!targetDisp) return;

    // Change dispatch status
    setDispatches(prev => prev.map(d => d.id === dispatchId ? { ...d, status: 'Completed' } : d));

    // Free the vehicle up
    setVehicles(prev => prev.map(v => {
      if (v.id === targetDisp.vehicleId) {
        return {
          ...v,
          status: 'Available',
          speed: 0
        };
      }
      return v;
    }));

    if (isSupabaseConfigured()) {
      supabase.from('dispatches').update({ status: 'Completed' }).eq('id', dispatchId).then();
      supabase.from('vehicles').update({ status: 'Available', speed: 0 }).eq('id', targetDisp.vehicleId).then();
    }

    handleShowToast(
      "Remessa Concluída", 
      `A ordem de despacho ${dispatchId} foi finalizada. Registros de balança gravados no banco ecológico.`, 
      "success"
    );
  };

  // Action: Settle or configure Invoice State
  const handleUpdateInvoiceStatus = (id: string, newStatus: InvoiceStatus) => {
    setInvoices(prev => prev.map(inv => inv.id === id ? { ...inv, status: newStatus } : inv));
    
    if (isSupabaseConfigured()) {
      supabase.from('invoices').update({ status: newStatus }).eq('id', id).then();
    }

    const displayStatus = newStatus === 'PAID' ? 'Pago' : 'Pendente';
    handleShowToast(
      "Status Atualizado",
      `Fatura ${id} alterada para ${displayStatus} no guarda-livros corporativo.`,
      "success"
    );
  };

  // Action: Delete Invoice
  const handleDeleteInvoice = (id: string) => {
    setInvoices(prev => prev.filter(inv => inv.id !== id));
    if (isSupabaseConfigured()) {
      supabase.from('invoices').delete().eq('id', id).then();
    }
    handleShowToast(
      "Fatura Removida",
      `Fatura corporativa ${id} apagada e auditada com sucesso.`,
      "info"
    );
  };

  // Action: Authorize new cargo pickup dispatch
  const handleAuthorizeDispatch = (newDisp: Omit<Dispatch, 'id' | 'createdAt'>) => {
    const generatedId = `DISP-${Math.floor(400 + Math.random() * 99)}`;
    const freshRecord: Dispatch = {
      ...newDisp,
      id: generatedId,
      createdAt: new Date().toISOString()
    };

    setDispatches([freshRecord, ...dispatches]);

    if (isSupabaseConfigured()) {
      supabase.from('dispatches').insert([{
        id: freshRecord.id,
        vehicle_id: freshRecord.vehicleId ?? null,
        driver_name: freshRecord.driverName ?? null,
        client_name: freshRecord.clientName ?? null,
        origin: freshRecord.origin ?? null,
        destination: freshRecord.destination ?? null,
        payload_type: freshRecord.payloadType ?? null,
        weight: freshRecord.weight ?? null,
        status: freshRecord.status ?? null,
        created_at: freshRecord.createdAt
      }]).then(({ error }) => {
        if (error) console.error("Supabase error saving dispatch:", error);
      });
    }

    // Save to Database
    fetch("/api/dispatches", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(freshRecord)
    }).catch(err => console.error("Error saving Dispatch:", err));

    // Change fleet vehicle status to In Transit & set tracking coordinates speeds
    setVehicles(prev => prev.map(v => {
      if (v.id === newDisp.vehicleId) {
        return {
          ...v,
          status: 'In Transit',
          speed: 62,
          // coordinate range for visual tracking mapping
          lat: Math.floor(100 + Math.random() * 150),
          lng: Math.floor(250 + Math.random() * 600)
        };
      }
      return v;
    }));

    if (isSupabaseConfigured() && newDisp.vehicleId) {
      supabase.from('vehicles').update({
        status: 'In Transit',
        speed: 62,
        lat: Math.floor(100 + Math.random() * 150),
        lng: Math.floor(250 + Math.random() * 600)
      }).eq('id', newDisp.vehicleId).then(({ error }) => {
        if (error) console.error("Supabase error updating vehicle status in dispatch:", error);
      });
    }

    setIsNewDispatchOpen(false);
    handleShowToast(
      "Despacho Autorizado", 
      `Veículo ${newDisp.vehicleId} em trânsito com o motorista ${newDisp.driverName}. ID da Rota: ${generatedId}`, 
      "success"
    );
  };

  // Action: Add new Bota Fora
  const handleAddBotaFora = (newBtf: Omit<BotaFora, 'id' | 'createdAt'>) => {
    const generatedId = `BTF-0${botaForas.length + 1}`;
    const freshRecord: BotaFora = {
      ...newBtf,
      id: generatedId,
      createdAt: new Date().toISOString()
    };
    setBotaForas(prev => [...prev, freshRecord]);

    if (isSupabaseConfigured()) {
      supabase.from('bota_foras').insert([{
        id: freshRecord.id,
        nome: freshRecord.nome,
        cnpj: freshRecord.cnpj,
        telefone: freshRecord.telefone,
        endereco: freshRecord.endereco,
        valor_padrao_descarte: freshRecord.valorPadraoDescarte ?? null,
        created_at: freshRecord.createdAt
      }]).then(({ error }) => {
        if (error) console.error("Supabase error saving bota fora:", error);
      });
    }

    // Save to Database
    fetch("/api/botaforas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(freshRecord)
    }).catch(err => console.error("Error saving Bota Fora:", err));

    handleShowToast("Bota Fora Cadastrado", `A área "${newBtf.nome}" foi cadastrada com sucesso.`, "success");
  };

  // Action: Update existing Bota Fora
  const handleUpdateBotaFora = (updatedBtf: BotaFora) => {
    setBotaForas(prev => prev.map(b => b.id === updatedBtf.id ? updatedBtf : b));
    if (isSupabaseConfigured()) {
      supabase.from('bota_foras').update({
        nome: updatedBtf.nome,
        cnpj: updatedBtf.cnpj,
        telefone: updatedBtf.telefone,
        endereco: updatedBtf.endereco,
        valor_padrao_descarte: updatedBtf.valorPadraoDescarte ?? null
      }).eq('id', updatedBtf.id).then(({ error }) => {
        if (error) console.error("Error updating bota fora in Supabase:", error);
      });
    }
    handleShowToast("Bota Fora Atualizado", `A área "${updatedBtf.nome}" foi editada com sucesso.`, "success");
  };

  // Action: Delete Bota Fora
  const handleDeleteBotaFora = (id: string) => {
    setBotaForas(prev => prev.filter(b => b.id !== id));
    if (isSupabaseConfigured()) {
      supabase.from('bota_foras').delete().eq('id', id).then();
    }
    handleShowToast("Bota Fora Removido", `O bota fora ${id} foi removido das áreas ativas.`, "info");
  };

  // Action: Add new Lançamento
  const handleAddLancamento = (newLan: Omit<Lancamento, 'id' | 'createdAt'>) => {
    const generatedId = `LAN-10${lancamentos.length + 1}`;
    const freshRecord: Lancamento = {
      ...newLan,
      id: generatedId,
      createdAt: new Date().toISOString()
    };

    setLancamentos(prev => [freshRecord, ...prev]);

    // Generate associated billing (faturamento) record automatically in invoices list
    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    let formattedIssueDate = '16 Jun, 2026';
    let formattedDueDate = '16 Jul, 2026';
    
    if (newLan.data) {
      const parts = newLan.data.split('-');
      if (parts.length === 3) {
        const year = parts[0];
        const monthIdx = Number(parts[1]) - 1;
        const day = parts[2];
        
        formattedIssueDate = `${day} ${months[monthIdx]}, ${year}`;
        
        // Calculate due date (30 days later)
        const issueDateObj = new Date(Number(year), monthIdx, Number(day));
        issueDateObj.setDate(issueDateObj.getDate() + 30);
        formattedDueDate = `${String(issueDateObj.getDate()).padStart(2, '0')} ${months[issueDateObj.getMonth()]}, ${issueDateObj.getFullYear()}`;
      }
    }

    const autoInvoice: Invoice = {
      id: `#INV-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      clientName: newLan.botaForaNome,
      entityCode: 'BF',
      serviceDesc: `Descarte de ${newLan.quantidadeCacambas} Caçambas (${newLan.vehicleId || 'Sem veículo'})`,
      issueDate: formattedIssueDate,
      dueDate: formattedDueDate,
      amount: newLan.valor,
      status: 'PENDING'
    };

    setInvoices(prev => [autoInvoice, ...prev]);

    if (isSupabaseConfigured()) {
      proxyInsert('lancamentos', {
        id: freshRecord.id,
        bota_fora_id: freshRecord.botaForaId,
        bota_fora_nome: freshRecord.botaForaNome,
        quantidade_cacambas: freshRecord.quantidadeCacambas,
        valor: freshRecord.valor,
        data: freshRecord.data,
        driver_name: freshRecord.driverName ?? null,
        vehicle_id: freshRecord.vehicleId ?? null,
        status: freshRecord.status,
        created_at: freshRecord.createdAt,
        lat: freshRecord.lat ?? null,
        lng: freshRecord.lng ?? null
      }).then((ok) => {
        if (!ok) {
          console.error("Proxy error saving lancamento");
          handleShowToast("Sincronização Parcial", "Dados salvos localmente, mas falha ao sincronizar com servidor.", "info");
        }
      });
      supabase.from('invoices').insert([{
        id: autoInvoice.id,
        client_name: autoInvoice.clientName,
        entity_code: autoInvoice.entityCode,
        service_desc: autoInvoice.serviceDesc,
        issue_date: autoInvoice.issueDate,
        due_date: autoInvoice.dueDate,
        amount: autoInvoice.amount,
        status: autoInvoice.status
      }]).then(({ error }) => {
        if (error) {
          console.error("Supabase error saving invoice:", error);
          handleShowToast("Sincronização Parcial", "Fatura salva localmente, mas falha ao sincronizar com servidor.", "info");
        }
      });
    }

    // Automatically assign Comissao if this was performed by a driver
    if (newLan.driverName && newLan.driverName !== 'Não Atribuído' && newLan.driverName !== 'Não atribuído' && newLan.driverName.trim() !== '') {
      const existing = comissoes.find(c => c.motorista === newLan.driverName && c.data === newLan.data);
      if (existing) {
        handleUpdateComissao({
          ...existing,
          retiradas: (existing.retiradas || 0) + newLan.quantidadeCacambas
        });
      } else {
        handleAddComissao({
          motorista: newLan.driverName,
          vaziasColocadas: 0,
          retiradas: newLan.quantidadeCacambas,
          data: newLan.data
        });
      }
    }

    // Save to Database
    fetch("/api/lancamentos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(freshRecord)
    }).catch(err => console.error("Error saving Lancamento:", err));

    fetch("/api/invoices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(autoInvoice)
    }).catch(err => console.error("Error saving Invoice:", err));

    // If vehicle is defined, optionally transition its status to In Transit to support continuity!
    if (newLan.vehicleId) {
      setVehicles(prev => prev.map(v => {
        if (v.id === newLan.vehicleId) {
          return {
            ...v,
            status: 'In Transit',
            speed: 55,
            lat: Math.floor(100 + Math.random() * 150),
            lng: Math.floor(250 + Math.random() * 600)
          };
        }
        return v;
      }));

      if (isSupabaseConfigured()) {
        supabase.from('vehicles').update({
          status: 'In Transit',
          speed: 55,
          lat: Math.floor(100 + Math.random() * 150),
          lng: Math.floor(250 + Math.random() * 600)
        }).eq('id', newLan.vehicleId).then(({ error }) => {
          if (error) console.error("Supabase error updating vehicle status in lancamento:", error);
        });
      }
    }

    setIsNewDispatchOpen(false);
    handleShowToast(
      "Lançamento Realizado", 
      `${newLan.quantidadeCacambas} caçambas lançadas com faturamento automático no financeiro.`, 
      "success"
    );
  };

  // Action: Delete Lançamento
  const handleDeleteLancamento = (id: string) => {
    setLancamentos(prev => prev.filter(lan => lan.id !== id));
    if (isSupabaseConfigured()) {
      proxyDelete('lancamentos', `id=eq.${id}`);
    }
    handleShowToast("Lançamento Excluído", `O extrato ${id} foi removido do histórico de operações.`, "info");
  };

  // Action: Add new Vehicle
  const handleAddVehicle = (newVehicle: Omit<Vehicle, 'status' | 'efficiency' | 'fuelUsed' | 'costPerKm' | 'trend' | 'isActive' | 'lat' | 'lng' | 'speed'>) => {
    const lat = Math.floor(120 + Math.random() * 100);
    const lng = Math.floor(250 + Math.random() * 500);
    const freshRecord: Vehicle = {
      ...newVehicle,
      status: 'Available',
      efficiency: 0,
      fuelUsed: 0,
      costPerKm: 1.10, // standard default
      trend: [0],
      speed: 0,
      lat,
      lng,
      isActive: true
    };
    setVehicles(prev => [...prev, freshRecord]);

    if (isSupabaseConfigured()) {
      supabase.from('vehicles').insert([{
        id: freshRecord.id,
        status: freshRecord.status,
        efficiency: freshRecord.efficiency,
        fuel_used: freshRecord.fuelUsed,
        cost_per_km: freshRecord.costPerKm,
        driver: freshRecord.driver,
        trend: JSON.stringify(freshRecord.trend),
        last_maintenance_date: freshRecord.lastMaintenanceDate ?? null,
        speed: freshRecord.speed,
        lat: freshRecord.lat,
        lng: freshRecord.lng,
        is_active: freshRecord.isActive,
        type: freshRecord.type ?? null,
        initial_km: freshRecord.initialKm ?? null
      }]).then(({ error }) => {
        if (error) console.error("Supabase error saving vehicle:", error);
      });
    }

    // Save to Database
    fetch("/api/vehicles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(freshRecord)
    }).catch(err => console.error("Error saving Vehicle:", err));

    handleShowToast("Veículo Cadastrado", `O veículo com placa/ID "${newVehicle.id}" foi inserido com sucesso.`, "success");
  };

  // Action: Update existing Vehicle
  const handleUpdateVehicle = (updatedVehicle: Vehicle) => {
    setVehicles(prev => prev.map(v => v.id === updatedVehicle.id ? updatedVehicle : v));
    if (isSupabaseConfigured()) {
      supabase.from('vehicles').update({
        status: updatedVehicle.status,
        efficiency: updatedVehicle.efficiency,
        fuel_used: updatedVehicle.fuelUsed,
        cost_per_km: updatedVehicle.costPerKm,
        driver: updatedVehicle.driver,
        trend: JSON.stringify(updatedVehicle.trend),
        last_maintenance_date: updatedVehicle.lastMaintenanceDate,
        speed: updatedVehicle.speed,
        lat: updatedVehicle.lat,
        lng: updatedVehicle.lng,
        is_active: updatedVehicle.isActive,
        type: updatedVehicle.type,
        initial_km: updatedVehicle.initialKm
      }).eq('id', updatedVehicle.id).then(({ error }) => {
        if (error) console.error("Supabase error updating vehicle:", error);
      });
    }
    handleShowToast("Veículo Atualizado", `O cadastro do veículo "${updatedVehicle.id}" foi alterado com sucesso.`, "success");
  };

  // Action: Add new Fuel Log (Abastecimento)
  const handleAddFuelLog = (newLog: Omit<FuelLog, 'id' | 'mediaKmL'>) => {
    const generatedId = `AB-${100 + fuelLogs.length + 1}`;
    
    let mediaKmL: number | undefined = undefined;
    if (!newLog.isRetiradaDiversa && newLog.kmFinal !== undefined && newLog.kmInicial !== undefined) {
      const distance = newLog.kmFinal - newLog.kmInicial;
      mediaKmL = distance > 0 && newLog.quantidadeLitros > 0 
        ? parseFloat(((distance / newLog.quantidadeLitros) || 0).toFixed(2)) 
        : 0;
    }

    const freshRecord: FuelLog = {
      ...newLog,
      id: generatedId,
      mediaKmL
    };

    setFuelLogs(prev => [freshRecord, ...prev]);

    if (isSupabaseConfigured()) {
      fetch('/api/fuel-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: freshRecord.id,
          vehicle_id: freshRecord.vehicleId,
          quantidade_litros: freshRecord.quantidadeLitros,
          km_inicial: freshRecord.kmInicial ?? null,
          km_final: freshRecord.kmFinal ?? null,
          valor_pago: freshRecord.valorPago,
          data: freshRecord.data,
          driver: freshRecord.driver ?? null,
          media_km_l: freshRecord.mediaKmL ?? null,
          tipo: freshRecord.tipo ?? null,
          is_retirada_diversa: freshRecord.isRetiradaDiversa,
          lat: freshRecord.lat ?? null,
          lng: freshRecord.lng ?? null
        })
      }).then(async r => {
        const text = await r.text();
        console.log("fuel-log API response:", r.status, text);
        if (!r.ok) {
          handleShowToast("Erro", `API ${r.status}: ${text.substring(0, 100)}`, "info");
        }
      });
    }

    // Save to Database
    fetch("/api/fuel-logs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(freshRecord)
    }).catch(err => console.error("Error saving Fuel Log:", err));

    // If type is GARAGEM, subtract quantity to update stocks (can go negative)
    if (newLog.tipo === 'GARAGEM') {
      setGarageDieselQty(prev => {
        const newQty = parseFloat(((prev - newLog.quantidadeLitros) || 0).toFixed(2));
        localStorage.setItem('relampago_garage_diesel_qty', newQty.toString());
        return newQty;
      });
    }

    // Update corresponding vehicle's stats: efficiency, fuelUsed
    setVehicles(prev => prev.map(v => {
      if (v.id === newLog.vehicleId) {
        const totalFuel = v.fuelUsed + newLog.quantidadeLitros;
        
        if (newLog.isRetiradaDiversa) {
          return {
            ...v,
            fuelUsed: totalFuel
          };
        }

        const trendPts = [...(v.trend || [2.5])];
        if (mediaKmL !== undefined && mediaKmL > 0) trendPts.push(mediaKmL);
        const updatedTrend = trendPts.slice(-5);

        return {
          ...v,
          efficiency: (mediaKmL !== undefined && mediaKmL > 0) ? mediaKmL : v.efficiency,
          fuelUsed: totalFuel,
          trend: updatedTrend
        };
      }
      return v;
    }));

    if (isSupabaseConfigured()) {
      const vObj = vehicles.find(v => v.id === newLog.vehicleId);
      if (vObj) {
        const totalFuel = vObj.fuelUsed + newLog.quantidadeLitros;
        let efficiency = vObj.efficiency;
        let trend = [...(vObj.trend || [2.5])];
        if (!newLog.isRetiradaDiversa && mediaKmL !== undefined && mediaKmL > 0) {
          efficiency = mediaKmL;
          trend.push(mediaKmL);
        }
        const updatedTrend = trend.slice(-5);

        proxyUpdate('vehicles', {
          efficiency,
          fuel_used: totalFuel,
          trend: JSON.stringify(updatedTrend)
        }, `id=eq.${newLog.vehicleId}`);
      }
    }

    if (newLog.isRetiradaDiversa) {
      handleShowToast(
        "Retirada Diversa Gravada",
        `Retirada avulsa para "${newLog.vehicleId}" de ${newLog.quantidadeLitros}L registrada com sucesso.`,
        "success"
      );
    } else {
      const sourceLabel = newLog.tipo === 'GARAGEM' ? 'Garagem' : 'Posto';
      handleShowToast(
        "Combustível Registrado", 
        `Abastecimento (${sourceLabel}) para "${newLog.vehicleId}" de ${newLog.quantidadeLitros}L cadastrado. Média: ${mediaKmL !== undefined ? mediaKmL : 0} Km/L`, 
        "success"
      );
    }
  };

  const handleDeleteFuelLog = (id: string) => {
    setFuelLogs(prev => prev.filter(f => f.id !== id));
    if (isSupabaseConfigured()) {
      proxyDelete('fuel_logs', `id=eq.${id}`);
    }
    handleShowToast("Abastecimento Excluído", "O registro de abastecimento foi removido.", "info");
  };

  const handleEditFuelLog = (updated: FuelLog) => {
    setFuelLogs(prev => prev.map(f => f.id === updated.id ? updated : f));
    if (isSupabaseConfigured()) {
      proxyUpdate('fuel_logs', {
        vehicle_id: updated.vehicleId,
        quantidade_litros: updated.quantidadeLitros,
        km_inicial: updated.kmInicial ?? null,
        km_final: updated.kmFinal ?? null,
        valor_pago: updated.valorPago,
        data: updated.data,
        driver: updated.driver ?? null,
        tipo: updated.tipo ?? null,
        observacao: updated.observacao ?? null,
      }, `id=eq.${updated.id}`);
    }
    handleShowToast("Abastecimento Atualizado", "O registro de abastecimento foi alterado.", "success");
  };

  // Quick mark read unread metrics
  const handleClearNotifications = () => {
    setNotificationsCount(0);
    handleShowToast("Alertas Limpos", "Todos os avisos críticos e notificações foram marcados como lidos.", "info");
  };

  // Filter dynamic badges counts
  const transitBadgeCount = vehicles.filter(v => v.status === 'In Transit').length;

  // Renderização exclusiva para motoristas (sem sidebar, header ou footer)
  if (isDriverUser()) {
    return (
      <div className="bg-slate-950 min-h-screen text-slate-100 font-sans antialiased">
        <DriverPortal
          vehicles={vehicles}
          botaForas={botaForas}
          motoristas={motoristas}
          currentUserEmail={currentUserEmail}
          currentUserRole={currentUserRole}
          lancamentos={lancamentos}
          comissoes={comissoes}
          dispatches={dispatches}
          fuelLogs={fuelLogs}
          onAddLancamento={handleAddLancamento}
          onAddComissao={handleAddComissao}
          onUpdateComissao={handleUpdateComissao}
          onAddFuelLog={handleAddFuelLog}
          onAuthorizeDispatch={handleAuthorizeDispatch}
          onShowToast={(title, msg, type) => handleShowToast(title, msg, type === 'warning' ? 'info' : type)}
          onLogout={handleLogout}
        />

        {/* Dynamic Slide-Up Toast Popup */}
        <div 
          id="quick-operational-toast"
          className={`fixed bottom-6 right-6 z-[100] transform transition-all duration-300 ${
            toast.visible ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-24 opacity-0 scale-95 pointer-events-none'
          }`}
        >
          <div className="bg-slate-900 border border-slate-800 text-white p-4 px-5 rounded-xl shadow-2xl flex items-center gap-3.5 max-w-sm">
            <div className="shrink-0 bg-emerald-500/20 p-2 rounded-lg text-emerald-400 flex items-center justify-center">
              {toast.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              ) : (
                <Info className="w-5 h-5 text-indigo-400 animate-pulse" />
              )}
            </div>
            <div className="flex-1 font-sans">
              <div className="font-bold text-xs leading-none text-slate-100">{toast.title}</div>
              <div className="text-[11px] text-slate-300 mt-1 leading-relaxed">{toast.message}</div>
            </div>
            <button 
              onClick={() => setToast(prev => ({ ...prev, visible: false }))}
              className="text-slate-400 hover:text-white p-1 rounded-full hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="bg-slate-950 min-h-screen text-slate-100 font-sans antialiased">
        <LoginScreen onLoginSuccess={handleLoginSuccess} />
        
        {/* Dynamic Slide-Up Toast Popup */}
        <div 
          id="quick-operational-toast"
          className={`fixed bottom-6 right-6 z-[100] transform transition-all duration-300 ${
            toast.visible ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-24 opacity-0 scale-95 pointer-events-none'
          }`}
        >
          <div className="bg-slate-900 border border-slate-800 text-white p-4 px-5 rounded-xl shadow-2xl flex items-center gap-3.5 max-w-sm">
            <div className="shrink-0 bg-emerald-500/20 p-2 rounded-lg text-emerald-400 flex items-center justify-center">
              {toast.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              ) : (
                <Info className="w-5 h-5 text-indigo-400 animate-pulse" />
              )}
            </div>
            <div className="flex-1 font-sans">
              <div className="font-bold text-xs leading-none text-slate-100">{toast.title}</div>
              <div className="text-[11px] text-slate-300 mt-1 leading-relaxed">{toast.message}</div>
            </div>
            <button 
              onClick={() => setToast(prev => ({ ...prev, visible: false }))}
              className="text-slate-400 hover:text-white p-1 rounded-full hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-50 min-h-screen text-slate-800 font-sans flex antialiased selection:bg-purple-500/20">
      
      {/* Sidebar navigation drawer */}
      <Sidebar 
        currentTab={currentTab} 
        setCurrentTab={(tab) => {
          setCurrentTab(tab);
          setSearchTerm(''); // clear local searches
        }} 
        onOpenNewDispatch={() => setIsNewDispatchOpen(true)}
        transitCount={transitBadgeCount}
        userRole={currentUserRole}
        userEmail={currentUserEmail}
      />

      {/* Main workspace arena */}
      <div className="flex-1 md:ml-[280px] min-h-screen flex flex-col justify-between overflow-x-hidden">
        
        {/* Persistent top bar */}
        <Header 
          currentTab={currentTab} 
          searchTerm={searchTerm} 
          setSearchTerm={setSearchTerm} 
          notificationsCount={notificationsCount}
          onClearNotifications={handleClearNotifications}
          userEmail={currentUserEmail}
          userRole={currentUserRole}
          onLogout={handleLogout}
          onNavigate={setCurrentTab}
        />

        {/* Dynamic Inner views router based on selected navigation hooks */}
        <main className="p-3 sm:p-6 flex-1 max-w-7xl w-full mx-auto space-y-4 sm:space-y-6">
          
          {currentTab === 'dashboard' && (
            <DashboardView 
              vehicles={vehicles}
              dispatches={dispatches}
              invoices={invoices}
              fuelLogs={fuelLogs}
              lancamentos={lancamentos}
              setCurrentTab={setCurrentTab}
              onOpenNewDispatch={() => setIsNewDispatchOpen(true)}
            />
          )}

          {currentTab === 'operations' && (
            <OperationsView 
              lancamentos={lancamentos}
              onDeleteLancamento={handleDeleteLancamento}
              searchTerm={searchTerm}
              onOpenNewDispatch={() => setIsNewDispatchOpen(true)}
            />
          )}

          {currentTab === 'disposal' && (
            <DisposalView 
              botaForas={botaForas}
              onAddBotaFora={handleAddBotaFora}
              onUpdateBotaFora={handleUpdateBotaFora}
              onDeleteBotaFora={handleDeleteBotaFora}
              motoristas={motoristas}
              onAddMotorista={handleAddMotorista}
              onUpdateMotorista={handleUpdateMotorista}
              onDeleteMotorista={handleDeleteMotorista}
            />
          )}

          {currentTab === 'finance' && (
            <FinanceView 
              invoices={invoices}
              fuelTrend={fuelTrend}
              costStructure={costStructure}
              botaForas={botaForas}
              lancamentos={lancamentos}
              onAddInvoice={(inv) => {
                const generatedId = `#INV-2026-${Math.floor(1000 + Math.random() * 9000)}`;
                setInvoices([{ ...inv, id: generatedId }, ...invoices]);
                handleShowToast("Fatura Criada", "A fatura foi anexada ao livro com sucesso.", "success");
              }}
              onUpdateInvoiceStatus={handleUpdateInvoiceStatus}
              onDeleteInvoice={handleDeleteInvoice}
              searchTerm={searchTerm}
            />
          )}

          {currentTab === 'commissions' && (
            <CommissionsView 
              comissoes={comissoes}
              lancamentos={lancamentos}
              motoristas={motoristas}
              onAddComissao={handleAddComissao}
              onUpdateComissao={handleUpdateComissao}
              onDeleteComissao={handleDeleteComissao}
            />
          )}

          {currentTab === 'driver-portal' && (
            <DriverPortal
              vehicles={vehicles}
              botaForas={botaForas}
              motoristas={motoristas}
              currentUserEmail={currentUserEmail}
              currentUserRole={currentUserRole}
              lancamentos={lancamentos}
              comissoes={comissoes}
              dispatches={dispatches}
              fuelLogs={fuelLogs}
              onAddLancamento={handleAddLancamento}
              onAddComissao={handleAddComissao}
              onUpdateComissao={handleUpdateComissao}
              onAddFuelLog={handleAddFuelLog}
              onAuthorizeDispatch={handleAuthorizeDispatch}
              onShowToast={(title, msg, type) => handleShowToast(title, msg, type === 'warning' ? 'info' : type)}
              onLogout={handleLogout}
            />
          )}

          {currentTab === 'reports' && (
            <ReportsView 
              botaForas={botaForas}
              lancamentos={lancamentos}
            />
          )}

          {currentTab === 'fleet' && (
            <FleetView 
              vehicles={vehicles}
              fuelLogs={fuelLogs}
              alerts={alerts}
              fuelTrendData={fuelTrend}
              costStructureData={costStructure}
              searchTerm={searchTerm}
              currentUserRole={currentUserRole}
              onStopDispatchVehicle={handleStopDispatchVehicle}
              onLogMaintenanceTicket={handleLogMaintenanceTicket}
              onRefreshData={handleRefreshData}
              onAddVehicle={handleAddVehicle}
              onUpdateVehicle={handleUpdateVehicle}
              onAddFuelLog={handleAddFuelLog}
              onDeleteFuelLog={handleDeleteFuelLog}
              onEditFuelLog={handleEditFuelLog}
              motoristas={motoristas}
              garageDieselQty={garageDieselQty}
              garageDieselPrice={garageDieselPrice}
              onUpdateGarageDiesel={(qty, price) => {
                setGarageDieselQty(qty);
                setGarageDieselPrice(price);
                localStorage.setItem('relampago_garage_diesel_qty', qty.toString());
                localStorage.setItem('relampago_garage_diesel_price', price.toString());
              }}
              garageRefills={garageRefills}
              onAddGarageRefill={handleAddGarageRefill}
              onDeleteGarageRefill={handleDeleteGarageRefill}
              onEditGarageRefill={handleEditGarageRefill}
            />
          )}

          {currentTab === 'settings' && (
            <SettingsView
              motoristas={motoristas}
              onMotoristasChange={(names) => setMotoristas(names)}
              onShowNotification={(msg) => handleShowToast("Configurações Salvas", msg, "success")}
            />
          )}

          {currentTab === 'help' && (
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-6 max-w-4xl mx-auto">
              <div>
                <h3 className="font-sans font-bold text-lg text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
                  <LifeBuoy className="w-5 h-5 text-indigo-500 animate-spin" />
                  <span>Central de Ajuda &amp; Manuais Relâmpago Caçambas</span>
                </h3>
                <p className="text-slate-400 text-xs mt-1">Diretrizes de conformidade, instruções de balança e parâmetros operacionais do sistema</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-3">
                
                <div className="p-4 bg-slate-50 border border-slate-100 rounded-lg space-y-2">
                  <div className="flex items-center gap-2 font-bold text-xs text-slate-800">
                    <BookOpen className="w-4 h-4 text-emerald-600" />
                    <span>Como posso registrar ordens de despacho de rota?</span>
                  </div>
                  <p className="text-xs text-slate-505 leading-relaxed">
                    Clique em "Novo Despacho" no menu inferior da barra lateral esquerda ou na tela de operações. Preencha os campos de peso líquido bruto, vincule um motorista e uma unidade livre, informe endereços exatos para retida e descarte ecológico e envie o formulário para transmissão.
                  </p>
                </div>

                <div className="p-4 bg-slate-50 border border-slate-100 rounded-lg space-y-2">
                  <div className="flex items-center gap-2 font-bold text-xs text-slate-800">
                    <Clock className="w-4 h-4 text-emerald-600" />
                    <span>Redirecionamento de pânico por superaquecimento terminal</span>
                  </div>
                  <p className="text-xs text-slate-505 leading-relaxed">
                    Na aba "Frota", consulte a lista de Alertas de Manutenção periódicas. Clique no sinal "BARRAR ENVIO" ou "TICKET" no cockpit. O sistema realiza o sinal preventivo veicular, zera a acelerabilidade e realoca os parâmetros do caminhão para inspeção corretiva da carcaça do motor.
                  </p>
                </div>

                <div className="p-4 bg-slate-50 border border-slate-100 rounded-lg space-y-2">
                  <div className="flex items-center gap-2 font-bold text-xs text-slate-800">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Cobrança ativa e auditoria de caixa</span>
                  </div>
                  <p className="text-xs text-slate-505 leading-relaxed">
                    Utilize o ecossistema "Financeiro" para gerenciar as notas de débito em lote. Mude o status do faturamento clicando nas ações de confirmação de caixa de forma rápida para faturar e garantir a conciliação imediata face aos regulamentos municipais.
                  </p>
                </div>

                <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-lg space-y-2">
                  <div className="flex items-center gap-2 font-bold text-xs text-emerald-800">
                    <Leaf className="w-4 h-4 text-emerald-600" />
                    <span>Coeficiente oficial de sustentabilidade (CO2)</span>
                  </div>
                  <p className="text-xs text-emerald-700 leading-relaxed">
                    Estimamos e auditamos cientificamente uma equivalência de compensação de carbono correspondente a <strong>1.4 toneladas coletivas por peso líquido recuperado</strong> em aterros licenciados.
                  </p>
                </div>

              </div>

              <div className="pt-4 border-t border-slate-100 text-xs text-slate-400 text-center flex items-center justify-center gap-2">
                <span>Plataforma Operacional Relâmpago Caçambas v3.6. Para canais diretos de emergência e links, contate relampagoentulho@gmail.com</span>
              </div>
            </div>
          )}

        </main>

        {/* Global Footer info bar */}
        <footer className="py-4 text-center border-t border-slate-200 bg-white text-slate-400 text-[11px] font-medium mt-8 shadow-inner select-none pointer-events-none">
          © 2026 Relâmpago Caçambas Ltda • Razão Social: 02.948.345/0001-05. Métricas e telemetria atualizadas de forma segura.
        </footer>

      </div>

      {/* Floating dispatch form modal */}
      {isNewDispatchOpen && (
        <NewDispatchModal 
          botaForas={botaForas}
          vehicles={vehicles}
          motoristas={motoristas}
          onClose={() => setIsNewDispatchOpen(false)}
          onSubmit={handleAddLancamento}
        />
      )}

      {/* Dynamic Slide-Up Toast Popup (Matches the toast in the mockup) */}
      <div 
        id="quick-operational-toast"
        className={`fixed bottom-6 right-6 z-[100] transform transition-all duration-300 ${
          toast.visible ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-24 opacity-0 scale-95 pointer-events-none'
        }`}
      >
        <div className="bg-slate-900 border border-slate-800 text-white p-4 px-5 rounded-xl shadow-2xl flex items-center gap-3.5 max-w-sm">
          <div className="shrink-0 bg-emerald-500/20 p-2 rounded-lg text-emerald-400 flex items-center justify-center">
            {toast.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            ) : (
              <Info className="w-5 h-5 text-indigo-400 animate-pulse" />
            )}
          </div>
          <div className="flex-1 font-sans">
            <div className="font-bold text-xs leading-none text-slate-100">{toast.title}</div>
            <div className="text-[11px] text-slate-300 mt-1 leading-relaxed">{toast.message}</div>
          </div>
          <button 
            onClick={() => setToast(prev => ({ ...prev, visible: false }))}
            className="text-slate-400 hover:text-white p-1 rounded-full hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

    </div>
  );
}
