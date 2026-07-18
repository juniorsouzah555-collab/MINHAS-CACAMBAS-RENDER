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
  LifeBuoy,
  Truck
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
  GarageRefill,
  Manutencao,
  PedagioDebito
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
import TrackingView from './components/TrackingView';
import BoletoView from './components/BoletoView';
import BancarioView from './components/BancarioView';
import ManutencaoView from './components/ManutencaoView';
import DescargaRapida from './components/DescargaRapida';
import DriverSelectScreen from './components/DriverSelectScreen';
import PayslipView from './components/PayslipView';
import NovoCliente from './components/NovoCliente';
import CtrVencidosView from './components/CtrVencidosView';
import PedagiosView from './components/PedagiosView';
import PortaoControlView from './components/PortaoControlView';

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

  // App core state DB — carregados via API do servidor (Render + Turso)
  const [vehicles, setVehicles] = useState<Vehicle[]>(INITIAL_VEHICLES);
  const [fuelLogs, setFuelLogs] = useState<FuelLog[]>(INITIAL_FUEL_LOGS);
  const [alerts, setAlerts] = useState<MaintenanceAlert[]>(INITIAL_ALERTS);
  const [invoices, setInvoices] = useState<Invoice[]>(INITIAL_INVOICES);
  const [dispatches, setDispatches] = useState<Dispatch[]>(INITIAL_DISPATCHES);
  
  // Bota fora & Lançamentos eco state
  const [botaForas, setBotaForas] = useState<BotaFora[]>(INITIAL_BOTA_FORAS);
  const [lancamentos, setLancamentos] = useState<Lancamento[]>(INITIAL_LANCAMENTOS);

  // Commissions (Comissões) tracking state
  const [comissoes, setComissoes] = useState<ComissaoMotorista[]>([
    { id: 'COM-001', motorista: 'Carlos Santana', vaziasColocadas: 24, retiradas: 22, data: '2026-06-16', createdAt: '2026-06-16T08:30:00Z' },
    { id: 'COM-002', motorista: 'Marcus Warren', vaziasColocadas: 18, retiradas: 18, data: '2026-06-15', createdAt: '2026-06-15T09:12:00Z' },
    { id: 'COM-003', motorista: 'Emily Watson', vaziasColocadas: 30, retiradas: 28, data: '2026-06-12', createdAt: '2026-06-12T11:05:00Z' }
  ]);

  // Manutenções state
  const [manutencoes, setManutencoes] = useState<Manutencao[]>([]);

  // Pedágios state
  const [pedagios, setPedagios] = useState<PedagioDebito[]>([]);
  const [pedagiosPendentes, setPedagiosPendentes] = useState(0);

  // Portão state
  const [portaoLoading, setPortaoLoading] = useState(false);
  const [portaoMsg, setPortaoMsg] = useState('');

  const handlePortao = async () => {
    const senha = prompt('Senha:');
    if (senha !== '52') {
      setPortaoMsg('Senha incorreta');
      setTimeout(() => setPortaoMsg(''), 2000);
      return;
    }
    setPortaoLoading(true);
    setPortaoMsg('');
    try {
      const res = await fetch('/api/portao', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setPortaoMsg(data.newState ? 'Portão ABERTO' : 'Portão FECHADO');
      } else {
        setPortaoMsg('Erro: ' + (data.error || 'desconhecido'));
      }
    } catch {
      setPortaoMsg('Erro ao conectar');
    } finally {
      setPortaoLoading(false);
      setTimeout(() => setPortaoMsg(''), 3000);
    }
  };

  // Registered Motoristas (Drivers) state
  const [motoristas, setMotoristas] = useState<string[]>([]);

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

  // NOTA: localStorage foi removido como fonte de dados.
  // Toda persistência é feita via servidor (Express + Turso).

  // Carrega veículos públicos na tela raiz (antes da autenticação)
  useEffect(() => {
    if (!isAuthenticated) {
      fetch('/api/public/vehicles').then(r => r.ok ? r.json() : []).then((data: any[]) => {
        if (Array.isArray(data) && data.length > 0) {
          setVehicles(data.map((v: any) => ({
            id: v.id,
            status: v.status || 'Available',
            efficiency: v.efficiency || 0,
            fuelUsed: v.fuel_used || 0,
            costPerKm: v.cost_per_km || 0,
            driver: v.driver || '',
            trend: [],
            lat: v.lat || 0,
            lng: v.lng || 0,
            isActive: v.is_active !== false,
            type: v.type || 'Caminhão',
            initialKm: v.initial_km || 0,
          })));
        }
      }).catch(() => {});
    }
  }, [isAuthenticated]);

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
                valorPadraoDescarte: b.valorPadraoDescarte ?? b.valor_padrao_descarte ?? undefined
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
                observacao: l.observacao || l.observation,
                pago: l.pago === true,
                valorPago: l.valor_pago !== undefined ? l.valor_pago : undefined,
                dataPagamento: l.data_pagamento || undefined,
                source: l.source || undefined
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
                lng: f.lng,
                observacao: f.observacao,
                fotoNota: f.foto_nota || f.fotoNota
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
              const mapped = listGarage.map((g: any) => ({
                id: g.id,
                data: g.data,
                quantidade_litros: g.quantidadeLitros ?? g.quantidade_litros ?? 0,
                valor_total: g.valorTotal ?? g.valor_total ?? 0,
                preco_por_litro: g.precoPorLitro ?? g.preco_por_litro ?? 0,
                created_at: g.createdAt ?? g.created_at ?? ''
              }));
              setGarageRefills(mapped);
            }

            // Load manutencoes from Supabase
            const { data: listMan, error: errMan } = await supabase.from('manutencoes').select('*').order('created_at', { ascending: false });
            if (!errMan && listMan) {
              const mapped = listMan.map((m: any) => ({
                id: m.id,
                vehicleId: m.vehicleId ?? m.vehicle_id ?? '',
                tipo: m.tipo ?? '',
                descricao: m.descricao ?? '',
                data: m.data ?? '',
                kmAtual: m.kmAtual ?? m.km_atual ?? undefined,
                proximoKm: m.proximoKm ?? m.proximo_km ?? undefined,
                custo: m.custo ?? 0,
                valorMaoDeObra: m.valorMaoDeObra ?? m.valor_mao_de_obra ?? 0,
                valorPeca: m.valorPeca ?? m.valor_peca ?? 0,
                local: m.local ?? 'Oficina',
                oficina: m.oficina ?? '',
                observacao: m.observacao,
                status: m.status ?? 'Pendente',
                createdAt: m.createdAt ?? m.created_at
              }));
              setManutencoes(mapped);
            }

            // Load garage config from vehicles table (special sentinel record)
            const { data: configVehicle, error: errConfig } = await supabase.from('vehicles').select('*').eq('type', 'garage_config').maybeSingle();
            if (!errConfig && configVehicle) {
              if (configVehicle.cost_per_km != null) {
                setGarageDieselPrice(Number(configVehicle.cost_per_km));
                localStorage.setItem('relampago_garage_diesel_price', String(configVehicle.cost_per_km));
              }
              if (configVehicle.efficiency != null) {
                setGarageDieselQty(Number(configVehicle.efficiency));
                localStorage.setItem('relampago_garage_diesel_qty', String(configVehicle.efficiency));
              }
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
          const resPedagios = await fetch("/api/pedagios");
          if (resPedagios.ok) {
            const data = await resPedagios.json();
            setPedagios(data.map((p: any) => ({
              id: p.id,
              placa: p.placa,
              concessionaria: p.concessionaria || '',
              valorTotal: p.valor_total ?? p.valorTotal ?? 0,
              dataPassagem: p.data_passagem || p.dataPassagem || '',
              dataConsulta: p.data_consulta || p.dataConsulta || '',
              pago: p.pago === true || p.pago === 1,
              dataPagamento: p.data_pagamento || p.dataPagamento || '',
              pixCode: p.pix_code || p.pixCode || '',
              observacao: p.observacao || '',
              createdAt: p.created_at || p.createdAt || '',
            })));
            const pendentes = data.filter((p: any) => !p.pago);
            setPedagiosPendentes(pendentes.length);
          }
        } catch (error) {
          console.error("Database connection error:", error);
        }
      };
      loadDatabaseData();
    }
  }, [isAuthenticated]);

  // Carrega dados mínimos para a página pública de descarga (sem auth)
  useEffect(() => {
    const publicPage = new URLSearchParams(window.location.search).get('page');
    if (publicPage !== 'descarga') return;
    (async () => {
      try {
        const [resVehicles, resBf] = await Promise.all([
          fetch('/api/public/vehicles'),
          fetch('/api/public/botaforas'),
        ]);
        if (resVehicles.ok) setVehicles(await resVehicles.json());
        if (resBf.ok) setBotaForas(await resBf.json());
      } catch {}
    })();
  }, []);

  // Keep-alive: pinga o servidor a cada 4 min pra não dormir no Render free
  useEffect(() => {
    const ping = () => fetch('/api/health').catch(() => {});
    ping();
    const interval = setInterval(ping, 4 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Sincronização em tempo real via Supabase Realtime (postgres_changes) entre
  // motorista (mobile) e admin (web). Substitui o polling antigo (que reconsultava
  // as tabelas inteiras a cada 60s) por um WebSocket que só recebe as mudanças.
  // Toda escrita local (handleAddLancamento, handleAddFuelLog, etc.) já atualiza o
  // estado otimisticamente, então os eventos recebidos aqui podem ser "eco" da
  // própria escrita do cliente — por isso usamos upsert por id (idempotente) em
  // vez de um simples append.
  useEffect(() => {
    if (!isAuthenticated || !isSupabaseConfigured()) return;

    let cancelled = false;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    const mapLancamento = (l: any) => ({
      id: l.id,
      botaForaId: l.bota_fora_id,
      botaForaNome: l.bota_fora_nome,
      quantidadeCacambas: l.quantidade_cacambas,
      valor: l.valor,
      data: l.data,
      driverName: l.driver_name,
      vehicleId: l.vehicle_id,
      status: l.status,
      createdAt: l.created_at,
      lat: l.lat,
      lng: l.lng,
      observacao: l.observacao,
      pago: l.pago === true,
      valorPago: l.valor_pago !== undefined ? l.valor_pago : undefined,
      dataPagamento: l.data_pagamento || undefined,
      source: l.source || undefined
    });
    const mapFuelLog = (f: any) => ({
      id: f.id,
      vehicleId: f.vehicle_id,
      quantidadeLitros: f.quantidade_litros,
      kmInicial: f.km_inicial,
      kmFinal: f.km_final,
      valorPago: f.valor_pago,
      data: f.data,
      driver: f.driver,
      mediaKmL: f.media_km_l,
      tipo: f.tipo,
      isRetiradaDiversa: f.is_retirada_diversa,
      lat: f.lat,
      lng: f.lng,
      observacao: f.observacao,
      fotoNota: f.foto_nota
    });
    const mapComissao = (c: any) => ({
      id: c.id,
      motorista: c.motorista || c.driver || 'Carlos Santana',
      vaziasColocadas: Number(c.vazias_colocadas ?? 0),
      retiradas: Number(c.retiradas ?? 0),
      data: c.data,
      createdAt: c.created_at
    });

    const upsertById = (setter: Function) => (mapped: any) =>
      setter((prev: any[]) => {
        const idx = prev.findIndex(p => p.id === mapped.id);
        if (idx === -1) return [mapped, ...prev];
        const copy = [...prev];
        copy[idx] = mapped;
        return copy;
      });
    const removeById = (setter: Function) => (id: string) =>
      setter((prev: any[]) => prev.filter(p => p.id !== id));

    const upsertLan = upsertById(setLancamentos);
    const removeLan = removeById(setLancamentos);
    const upsertFuel = upsertById(setFuelLogs);
    const removeFuel = removeById(setFuelLogs);
    const upsertCom = upsertById(setComissoes);
    const removeCom = removeById(setComissoes);

    // Para motoristas, restringe o canal aos próprios registros (reduz egress:
    // sem isso, cada motorista recebia em tempo real os lançamentos/abastecimentos/
    // comissões de TODOS os outros motoristas só pra descartar depois no client).
    // Admin continua sem filtro, pois precisa ver a frota inteira.
    const resolveDriverFilter = async (): Promise<string | null> => {
      if (!isDriverUser()) return null;
      if (currentUserEmail.toLowerCase() === 'motorista@relampago.com') return 'Carlos Santana';
      return null;
    };

    resolveDriverFilter().then((driverName) => {
      if (cancelled) return;

      const lanFilter = driverName ? `driver_name=eq.${driverName}` : undefined;
      const fuelFilter = driverName ? `driver=eq.${driverName}` : undefined;
      const comFilter = driverName ? `motorista=eq.${driverName}` : undefined;

      channel = supabase
        .channel('app-sync')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'lancamentos', filter: lanFilter }, (payload: any) => {
          if (payload.eventType === 'DELETE') removeLan(payload.old.id);
          else upsertLan(mapLancamento(payload.new));
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'fuel_logs', filter: fuelFilter }, (payload: any) => {
          if (payload.eventType === 'DELETE') removeFuel(payload.old.id);
          else upsertFuel(mapFuelLog(payload.new));
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'comissoes', filter: comFilter }, (payload: any) => {
          if (payload.eventType === 'DELETE') removeCom(payload.old.id);
          else upsertCom(mapComissao(payload.new));
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'vehicles', filter: 'id=eq.GARAGE-CONFIG' }, (payload: any) => {
          if (payload.eventType === 'DELETE') return;
          const v = payload.new;
          if (v.cost_per_km != null) {
            setGarageDieselPrice(Number(v.cost_per_km));
            localStorage.setItem('relampago_garage_diesel_price', String(v.cost_per_km));
          }
          if (v.efficiency != null) {
            setGarageDieselQty(Number(v.efficiency));
            localStorage.setItem('relampago_garage_diesel_qty', String(v.efficiency));
          }
        })
        .subscribe((status) => {
          if (status !== 'SUBSCRIBED') return;
          // Busca inicial do garage config assim que o canal conectar
          supabase.from('vehicles').select('cost_per_km, efficiency').eq('id', 'GARAGE-CONFIG').maybeSingle().then(({ data }) => {
            if (!data) return;
            if (data.cost_per_km != null) {
              setGarageDieselPrice(Number(data.cost_per_km));
              localStorage.setItem('relampago_garage_diesel_price', String(data.cost_per_km));
            }
            if (data.efficiency != null) {
              setGarageDieselQty(Number(data.efficiency));
              localStorage.setItem('relampago_garage_diesel_qty', String(data.efficiency));
            }
          });
        });
    });

    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
  }, [isAuthenticated, currentUserEmail, currentUserRole]);

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
    setGarageDieselPrice(refill.preco_por_litro);
    localStorage.setItem('relampago_garage_diesel_qty', newQty.toString());
    localStorage.setItem('relampago_garage_diesel_price', refill.preco_por_litro.toString());
    if (isSupabaseConfigured()) {
      supabase.from('vehicles').upsert({
        id: 'GARAGE-CONFIG',
        type: 'garage_config',
        status: 'garage_config',
        cost_per_km: refill.preco_por_litro,
        efficiency: newQty,
        fuel_used: 0,
        driver: '',
        trend: '',
        speed: 0,
        lat: 0,
        lng: 0,
        is_active: false
      }).then(({ error }) => {
        if (error) console.error('Supabase error saving garage config:', error);
      });
    }
  };

  const handleDeleteGarageRefill = async (id: string) => {
    const target = garageRefills.find(r => r.id === id);
    if (!target) return;
    const previousRefills = garageRefills;
    const previousQty = garageDieselQty;
    setGarageRefills(prev => {
      const updated = prev.filter(r => r.id !== id);
      localStorage.setItem('relampago_garage_refills', JSON.stringify(updated));
      return updated;
    });
    const newQty = Math.max(0, garageDieselQty - target.quantidade_litros);
    setGarageDieselQty(newQty);
    localStorage.setItem('relampago_garage_diesel_qty', newQty.toString());
    try {
      if (isSupabaseConfigured()) {
        const ok = await proxyDelete('garage_refills', `id=eq.${id}`);
        if (!ok) throw new Error('Falha ao excluir no servidor');
        await supabase.from('vehicles').upsert({
          id: 'GARAGE-CONFIG',
          type: 'garage_config',
          status: 'garage_config',
          efficiency: newQty,
          fuel_used: 0,
          driver: '',
          trend: '',
          speed: 0,
          lat: 0,
          lng: 0,
          is_active: false
        });
      }
    } catch (e) {
      setGarageRefills(previousRefills);
      localStorage.setItem('relampago_garage_refills', JSON.stringify(previousRefills));
      setGarageDieselQty(previousQty);
      localStorage.setItem('relampago_garage_diesel_qty', previousQty.toString());
      handleShowToast("Erro ao Excluir", "Não foi possível sincronizar a exclusão com o servidor. Tente novamente.", "info");
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
      setGarageDieselPrice(refill.preco_por_litro);
      localStorage.setItem('relampago_garage_diesel_qty', newQty.toString());
      localStorage.setItem('relampago_garage_diesel_price', refill.preco_por_litro.toString());
      if (isSupabaseConfigured()) {
        supabase.from('vehicles').upsert({
          id: 'GARAGE-CONFIG',
          type: 'garage_config',
          status: 'garage_config',
          efficiency: newQty,
          fuel_used: 0,
          driver: '',
          trend: '',
          speed: 0,
          lat: 0,
          lng: 0,
          is_active: false
        }).then(({ error }) => {
          if (error) console.error('Supabase error saving garage config qty:', error);
        });
      }
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
  
  // Action: Add Manutenção
  const handleAddManutencao = (newMan: Omit<Manutencao, 'id' | 'createdAt'>) => {
    const generatedId = `MAN-${Date.now()}`;
    const freshRecord: Manutencao = {
      ...newMan,
      id: generatedId,
      createdAt: new Date().toISOString()
    };
    setManutencoes(prev => [freshRecord, ...prev]);

    if (isSupabaseConfigured()) {
      supabase.from('manutencoes').insert([{
        id: freshRecord.id,
        vehicle_id: freshRecord.vehicleId,
        tipo: freshRecord.tipo,
        descricao: freshRecord.descricao,
        data: freshRecord.data,
        km_atual: freshRecord.kmAtual ?? null,
        proximo_km: freshRecord.proximoKm ?? null,
        custo: freshRecord.custo,
        valor_mao_de_obra: freshRecord.valorMaoDeObra ?? 0,
        valor_peca: freshRecord.valorPeca ?? 0,
        local: freshRecord.local ?? 'Oficina',
        oficina: freshRecord.oficina,
        observacao: freshRecord.observacao ?? null,
        status: freshRecord.status,
        created_at: freshRecord.createdAt
      }]).then(({ error }) => {
        if (error) console.error("Supabase error saving manutencao:", error);
      });
      // Update vehicle's last maintenance date
      supabase.from('vehicles').update({
        last_maintenance_date: freshRecord.data
      }).eq('id', freshRecord.vehicleId).then();
    }

    handleShowToast(
      "Manutenção Registrada",
      `Manutenção ${freshRecord.tipo} registrada para o veículo ${freshRecord.vehicleId}.`,
      "success"
    );
  };

  // Action: Update Manutenção
  const handleUpdateManutencao = (updated: Manutencao) => {
    setManutencoes(prev => prev.map(m => m.id === updated.id ? updated : m));
    if (isSupabaseConfigured()) {
      supabase.from('manutencoes').update({
        vehicle_id: updated.vehicleId,
        tipo: updated.tipo,
        descricao: updated.descricao,
        data: updated.data,
        km_atual: updated.kmAtual ?? null,
        proximo_km: updated.proximoKm ?? null,
        custo: updated.custo,
        valor_mao_de_obra: updated.valorMaoDeObra ?? 0,
        valor_peca: updated.valorPeca ?? 0,
        local: updated.local ?? 'Oficina',
        oficina: updated.oficina,
        observacao: updated.observacao ?? null,
        status: updated.status
      }).eq('id', updated.id).then(({ error }) => {
        if (error) console.error("Supabase error updating manutencao:", error);
      });
    }
    handleShowToast("Manutenção Atualizada", "O registro de manutenção foi alterado.", "success");
  };

  // Action: Delete Manutenção
  const handleDeleteManutencao = (id: string) => {
    setManutencoes(prev => prev.filter(m => m.id !== id));
    if (isSupabaseConfigured()) {
      supabase.from('manutencoes').delete().eq('id', id).then();
    }
    handleShowToast("Manutenção Removida", "O registro de manutenção foi excluído.", "info");
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
  const handleDeleteInvoice = async (id: string) => {
    const previous = invoices;
    setInvoices(prev => prev.filter(inv => inv.id !== id));
    try {
      if (isSupabaseConfigured()) {
        const ok = await proxyDelete('invoices', `id=eq.${id}`);
        if (!ok) throw new Error('Falha ao excluir no servidor');
      }
      const updated = previous.filter(inv => inv.id !== id);
      handleShowToast("Fatura Removida", `Fatura corporativa ${id} removida com sucesso.`, "info");
    } catch (e) {
      setInvoices(previous);
      handleShowToast("Erro ao Excluir", "Não foi possível sincronizar a exclusão com o servidor. Tente novamente.", "info");
    }
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
    const generatedId = `BTF-${Date.now()}`;
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
    const generatedId = `LAN-${Date.now()}`;
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
      supabase.from('lancamentos').insert([{
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
        lng: freshRecord.lng ?? null,
        observacao: freshRecord.observacao ?? null
      }]).then(({ error }) => {
        if (error) console.error("Supabase insert lancamento error:", error);
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

    // Save to Express API (shared in-memory DB for same-server clients)
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
  const handleDeleteLancamento = async (id: string) => {
    const previous = lancamentos;
    setLancamentos(prev => prev.filter(lan => lan.id !== id));
    try {
      if (isSupabaseConfigured()) {
        const ok = await proxyDelete('lancamentos', `id=eq.${id}`);
        if (!ok) throw new Error('Falha ao excluir no servidor');
      }
      const updated = previous.filter(lan => lan.id !== id);
      handleShowToast("Lançamento Excluído", `O registro foi removido do histórico de operações.`, "info");
    } catch (e) {
      setLancamentos(previous);
      handleShowToast("Erro ao Excluir", "Não foi possível sincronizar a exclusão com o servidor. Tente novamente.", "info");
    }
  };

  // Action: Editar Lançamento
  const handleEditLancamento = async (id: string, updates: Partial<Lancamento>) => {
    const previous = lancamentos;
    setLancamentos(prev => prev.map(lan => lan.id === id ? { ...lan, ...updates } : lan));
    try {
      if (isSupabaseConfigured()) {
        const ok = await proxyUpdate('lancamentos', updates, `id=eq.${id}`);
        if (!ok) throw new Error('Falha ao atualizar no servidor');
      }
      handleShowToast("Lançamento Atualizado", `O registro foi atualizado com sucesso.`, "success");
    } catch (e) {
      setLancamentos(previous);
      handleShowToast("Erro ao Atualizar", "Não foi possível sincronizar a atualização com o servidor. Tente novamente.", "info");
    }
  };

  // Action: Dar baixa em lote (todos os pendentes de um Bota Fora) — abate ganancioso
  const handleBaixaTotal = (lancamentoIds: string[], totalDebito: number, valorPagoTotal: number) => {
    let saldoRestante = Math.min(valorPagoTotal, totalDebito);
    const hoje = new Date().toISOString().split('T')[0];
    const pendentes = lancamentos.filter(l => lancamentoIds.includes(l.id));
    const resultado: Record<string, { pago: boolean; valorPago: number }> = {};

    for (const lan of pendentes) {
      if (saldoRestante <= 0) {
        resultado[lan.id] = { pago: false, valorPago: 0 };
      } else if (saldoRestante >= lan.valor) {
        resultado[lan.id] = { pago: true, valorPago: lan.valor };
        saldoRestante -= lan.valor;
      } else {
        resultado[lan.id] = { pago: false, valorPago: saldoRestante };
        saldoRestante = 0;
      }
    }

    setLancamentos(prev => prev.map(lan => {
      const r = resultado[lan.id];
      if (!r) return lan;
      return {
        ...lan,
        pago: r.pago,
        valorPago: r.valorPago,
        dataPagamento: r.valorPago > 0 ? hoje : lan.dataPagamento
      };
    }));

    if (isSupabaseConfigured()) {
      for (const id of lancamentoIds) {
        const r = resultado[id];
        if (!r) continue;
        proxyUpdate('lancamentos', {
          pago: r.pago,
          valor_pago: r.valorPago,
          data_pagamento: r.valorPago > 0 ? hoje : null
        }, `id=eq.${id}`);
      }
    }

    const quitados = Object.values(resultado).filter(r => r.pago).length;
    const parciais = Object.values(resultado).filter(r => !r.pago && r.valorPago > 0).length;
    handleShowToast(
      "Baixa Realizada",
      `Pagamento: R$ ${valorPagoTotal.toFixed(2)} | Quitados: ${quitados} | Parciais: ${parciais} | Restante: R$ ${Math.max(0, saldoRestante).toFixed(2)}`,
      "success"
    );
  };

  // Action: Dar baixa em Lançamento individual
  const handleBaixaLancamento = (id: string, valorAbatimento?: number) => {
    const lan = lancamentos.find(l => l.id === id);
    if (!lan) return;
    const valorPago = valorAbatimento !== undefined ? Math.min(lan.valor, lan.valor - valorAbatimento) : lan.valor;
    const pago = valorPago >= lan.valor;
    const hoje = new Date().toISOString().split('T')[0];

    setLancamentos(prev => prev.map(l => {
      if (l.id !== id) return l;
      return { ...l, pago, valorPago, dataPagamento: pago ? hoje : l.dataPagamento };
    }));

    if (isSupabaseConfigured()) {
      proxyUpdate('lancamentos', {
        pago,
        valor_pago: valorPago,
        data_pagamento: pago ? hoje : null
      }, `id=eq.${id}`);
    }
    handleShowToast("Baixa Realizada", `Lançamento ${id} ${pago ? 'quitado' : 'parcialmente abatido'} — R$ ${valorPago.toFixed(2)}/${lan.valor.toFixed(2)}`, "success");
  };

  // Action: Reverter baixa de Lançamento
  const handleReverterBaixaLancamento = (id: string) => {
    setLancamentos(prev => prev.map(lan => {
      if (lan.id !== id) return lan;
      const { pago, valorPago, dataPagamento, ...rest } = lan;
      return rest;
    }));
    if (isSupabaseConfigured()) {
      proxyUpdate('lancamentos', {
        pago: false,
        valor_pago: null,
        data_pagamento: null
      }, `id=eq.${id}`);
    }
    handleShowToast("Baixa Revertida", `O pagamento do lançamento ${id} foi estornado.`, "info");
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

  const handleDeleteVehicle = (id: string) => {
    setVehicles(prev => prev.filter(v => v.id !== id));
    if (isSupabaseConfigured()) {
      supabase.from('vehicles').delete().eq('id', id).then();
    }
    handleShowToast("Veículo Excluído", `O veículo "${id}" foi removido.`, "info");
  };

  // Action: Add new Fuel Log (Abastecimento)
  const handleAddFuelLog = (newLog: Omit<FuelLog, 'id' | 'mediaKmL'>) => {
    const generatedId = `AB-${Date.now()}`;
    
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

    setFuelLogs(prev => {
      const updated = [freshRecord, ...prev];
      return updated;
    });

    if (isSupabaseConfigured()) {
      supabase.from('fuel_logs').insert([{
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
        lng: freshRecord.lng ?? null,
        foto_nota: freshRecord.fotoNota ?? null
      }]).then(({ error }) => {
        if (error) console.error("Supabase insert fuel_log error:", error);
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
      const newQty = parseFloat(((garageDieselQty - newLog.quantidadeLitros) || 0).toFixed(2));
      setGarageDieselQty(newQty);
      localStorage.setItem('relampago_garage_diesel_qty', newQty.toString());
      if (isSupabaseConfigured()) {
        supabase.from('vehicles').upsert({
          id: 'GARAGE-CONFIG',
          type: 'garage_config',
          status: 'garage_config',
          cost_per_km: garageDieselPrice,
          efficiency: newQty,
          fuel_used: 0,
          driver: '',
          trend: '',
          speed: 0,
          lat: 0,
          lng: 0,
          is_active: false
        }).then(({ error }) => {
          if (error) console.error('Supabase error saving garage config after GARAGEM fueling:', error);
        });
      }
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

  const handleDeleteFuelLog = async (id: string) => {
    const previous = fuelLogs;
    setFuelLogs(prev => prev.filter(f => f.id !== id));
    try {
      if (isSupabaseConfigured()) {
        const ok = await proxyDelete('fuel_logs', `id=eq.${id}`);
        if (!ok) throw new Error('Falha ao excluir no servidor');
      }
      const updated = previous.filter(f => f.id !== id);
      handleShowToast("Abastecimento Excluído", "O registro de abastecimento foi removido.", "info");
    } catch (e) {
      setFuelLogs(previous);
      handleShowToast("Erro ao Excluir", "Não foi possível sincronizar a exclusão com o servidor. Tente novamente.", "info");
    }
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
  const [boletosBadgeCount, setBoletosBadgeCount] = useState(0);

  // URL params — precisa estar ANTES dos checks de render
  const urlParams = new URLSearchParams(window.location.search);
  const publicPage = urlParams.get('page');

  // Rota pública: motorista selecionando veículo
  const urlMotoristaParam = (urlParams.get('motorista') || urlParams.get('MOTORISTA') || '').toUpperCase();

  // PWA sem ?MOTORISTA: TADEU e RAMON sempre vão direto pro nome deles
  if (!urlMotoristaParam && !publicPage && !isAuthenticated) {
    const savedMotorista = (() => {
      try {
        const raw = localStorage.getItem('relampago_driver_name');
        if (!raw) return '';
        const name = raw.toUpperCase();
        return (name === 'TADEU' || name === 'RAMON') ? name : '';
      } catch { return ''; }
    })();
    if (savedMotorista) {
      window.location.href = `/?MOTORISTA=${savedMotorista}`;
      return null;
    }
  }

  if (urlMotoristaParam && !publicPage) {
    const todosMotoristas = ['TADEU', 'JUNIOR', 'RAMON'];
    const motoristasVisiveis = todosMotoristas.filter(n => n === urlMotoristaParam);
    if (motoristasVisiveis.length > 0) {
      return (
        <DriverSelectScreen
          motoristas={motoristasVisiveis}
          vehicles={[]}
          onSelectMotorista={(nome) => {
            // Só salva pra TADEU e RAMON
            if (nome === 'TADEU' || nome === 'RAMON') {
              try { localStorage.setItem('relampago_driver_name', nome); } catch {}
            }
            window.location.href = `/?page=descarga&motorista=${nome}`;
          }}
          onPortao={handlePortao}
          portaoLoading={portaoLoading}
          portaoMsg={portaoMsg}
          onAdmin={() => { window.location.href = '/?page=admin'; }}
          onCtr={() => { window.open('https://ctr-automacao-relampago.onrender.com', '_blank'); }}
        />
      );
    }
  }

  // Renderização exclusiva para motoristas (sem sidebar, header ou footer)
  if (isDriverUser()) {
    return (
      <div className="bg-gradient-to-br from-blue-50 to-blue-100/40 min-h-screen text-slate-800 font-sans antialiased">
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
          garageDieselPrice={garageDieselPrice}
          garageDieselQty={garageDieselQty}
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

  // Rota pública: /?page=admin — tela de login (só mostra se NÃO autenticado)
  if (publicPage === 'admin' && !isAuthenticated) {
    return (
      <div className="bg-slate-950 min-h-screen text-slate-100 font-sans antialiased">
        <LoginScreen onLoginSuccess={handleLoginSuccess} />
      </div>
    );
  }

  // Rota pública: /?page=descarga&motorista=TADEU&veiculo=FLT-8829
  if (publicPage === 'descarga') {
    const pubMotorista = urlParams.get('motorista') || 'Motorista';
    const pubVeiculo = urlParams.get('veiculo') || '';
    return (
      <DescargaRapida
        motorista={pubMotorista}
        veiculo={pubVeiculo}
        botaForas={botaForas}
        vehicles={vehicles}
      />
    );
  }

  // Rota pública sem parâmetros (PWA instalado): mostra seleção de motorista
  if (!isAuthenticated && !publicPage) {
    const todosMotoristas = ['TADEU', 'JUNIOR', 'RAMON'];

    return (
      <DriverSelectScreen
        motoristas={todosMotoristas}
        vehicles={[]}
        onSelectMotorista={(nome) => {
          window.location.href = `/?page=descarga&motorista=${nome}`;
        }}
        onPortao={handlePortao}
        portaoLoading={portaoLoading}
        portaoMsg={portaoMsg}
        onAdmin={() => { window.location.href = '/?page=admin'; }}
        onCtr={() => { window.open('https://ctr-automacao-relampago.onrender.com', '_blank'); }}
      />
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
      
      {/* Botão Portão (ADM) */}
      <button
        onClick={handlePortao}
        disabled={portaoLoading}
        className="fixed top-3 right-3 z-[200] px-3 py-1.5 rounded-lg bg-amber-600/80 text-white text-xs font-bold hover:bg-amber-500 active:scale-95 transition-all cursor-pointer disabled:opacity-50 shadow-lg"
      >
        {portaoLoading ? '...' : 'PORTÃO'}
      </button>
      {portaoMsg && (
        <div className="fixed top-12 right-3 z-[200] px-3 py-1.5 rounded-lg bg-slate-800 text-xs font-bold text-amber-400 shadow-lg">
          {portaoMsg}
        </div>
      )}

      {/* Sidebar navigation drawer */}
        <Sidebar 
          currentTab={currentTab} 
          setCurrentTab={(tab) => {
            setCurrentTab(tab);
            setSearchTerm(''); // clear local searches
          }} 
          onOpenNewDispatch={() => setIsNewDispatchOpen(true)}
          transitCount={transitBadgeCount}
          unseenBoletos={boletosBadgeCount}
          pedagiosPendentes={pedagiosPendentes}
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
              botaForas={botaForas}
              motoristas={motoristas}
              comissoes={comissoes}
              manutencoes={manutencoes}
              alerts={alerts}
              setCurrentTab={setCurrentTab}
              onOpenNewDispatch={() => setIsNewDispatchOpen(true)}
            />
          )}

          {currentTab === 'operations' && (
            <OperationsView 
              lancamentos={lancamentos}
              onDeleteLancamento={handleDeleteLancamento}
              onEditLancamento={handleEditLancamento}
              botaForas={botaForas}
              vehicles={vehicles}
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
              onBaixaLancamento={handleBaixaLancamento}
              onReverterBaixaLancamento={handleReverterBaixaLancamento}
              onBaixaTotal={handleBaixaTotal}
              onDeleteLancamento={handleDeleteLancamento}
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
              garageDieselPrice={garageDieselPrice}
              garageDieselQty={garageDieselQty}
              onAddLancamento={handleAddLancamento}
              onAddComissao={handleAddComissao}
              onUpdateComissao={handleUpdateComissao}
              onAddFuelLog={handleAddFuelLog}
              onAuthorizeDispatch={handleAuthorizeDispatch}
              onShowToast={(title, msg, type) => handleShowToast(title, msg, type === 'warning' ? 'info' : type)}
              onLogout={handleLogout}
            />
          )}

          {currentTab === 'tracking' && (
            <TrackingView vehicles={vehicles} motoristas={motoristas} />
          )}

          {currentTab === 'boletos' && (
            <BoletoView onNewBoletosCount={setBoletosBadgeCount} />
          )}

          {currentTab === 'bancario' && (
            <BancarioView />
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
              onDeleteVehicle={handleDeleteVehicle}
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
                if (isSupabaseConfigured()) {
                  supabase.from('vehicles').upsert({
                    id: 'GARAGE-CONFIG',
                    type: 'garage_config',
                    status: 'garage_config',
                    cost_per_km: price,
                    efficiency: qty,
                    fuel_used: 0,
                    driver: '',
                    trend: '',
                    speed: 0,
                    lat: 0,
                    lng: 0,
                    is_active: false
                  }).then(({ error }) => {
                    if (error) console.error('Supabase error saving garage config:', error);
                  });
                }
              }}
              garageRefills={garageRefills}
              onAddGarageRefill={handleAddGarageRefill}
              onDeleteGarageRefill={handleDeleteGarageRefill}
              onEditGarageRefill={handleEditGarageRefill}
            />
          )}

          {currentTab === 'manutencao' && (
            <ManutencaoView
              manutencoes={manutencoes}
              vehicles={vehicles}
              onAddManutencao={handleAddManutencao}
              onUpdateManutencao={handleUpdateManutencao}
              onDeleteManutencao={handleDeleteManutencao}
            />
          )}

          {currentTab === 'payslip' && (
            <PayslipView />
          )}

          {currentTab === 'novocliente' && (
            <NovoCliente />
          )}

          {currentTab === 'ctr-vencidos' && (
            <CtrVencidosView />
          )}

          {currentTab === 'pedagios' && (
            <PedagiosView
              pedagios={pedagios}
              setPedagios={setPedagios}
              onSummaryChange={(pendentes, valorTotal) => setPedagiosPendentes(pendentes)}
            />
          )}

          {currentTab === 'portao-control' && (
            <PortaoControlView />
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
