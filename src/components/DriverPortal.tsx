import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Smartphone, 
  Sparkles, 
  Fuel, 
  Calendar, 
  MapPin, 
  CheckCircle2, 
  Activity, 
  Clock, 
  ShieldCheck,
  Building,
  Navigation,
  Camera,
  Trash2,
  FileText,
  LogOut
} from 'lucide-react';
import { Vehicle, BotaFora, Lancamento, FuelLog, ComissaoMotorista, Dispatch } from '../types';
import { supabase, isSupabaseConfigured, sendHeartbeat, getOnlineUsers, uploadFuelReceipt } from '../lib/supabase';
import * as Geo from '../lib/geolocation';
import DriverLiveMap from './DriverLiveMap';

interface DriverPortalProps {
  vehicles: Vehicle[];
  botaForas: BotaFora[];
  motoristas: string[];
  currentUserEmail: string;
  currentUserRole: string;
  lancamentos: Lancamento[];
  comissoes: ComissaoMotorista[];
  dispatches: Dispatch[];
  fuelLogs: FuelLog[];
  garageDieselPrice?: number;
  garageDieselQty?: number;
  onAddLancamento: (newLan: Omit<Lancamento, 'id' | 'createdAt'>) => void;
  onAddComissao: (newCom: Omit<ComissaoMotorista, 'id' | 'createdAt'>) => void;
  onUpdateComissao: (updatedCom: ComissaoMotorista) => void;
  onAddFuelLog: (newLog: Omit<FuelLog, 'id' | 'mediaKmL'>) => void;
  onAuthorizeDispatch: (newDisp: Omit<Dispatch, 'id' | 'createdAt'>) => void;
  onShowToast: (title: string, message: string, type: 'success' | 'info' | 'warning') => void;
  onLogout?: () => void;
}

interface AuditEntry {
  id: string;
  action: string;
  description: string;
  time: string;
  timestamp: string;
  details: string;
  synchronized: boolean;
  lat?: number;
  lng?: number;
  observacao?: string;
  fotoNota?: string;
}

const AUDIT_STORAGE_KEY = 'relampago_driver_audit_log';

function loadAuditLog(): AuditEntry[] {
  try {
    const saved = localStorage.getItem(AUDIT_STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch {}
  return [];
}

function saveAuditLog(entries: AuditEntry[]) {
  try {
    const safe = entries.map(({ fotoNota, ...rest }) => rest);
    localStorage.setItem(AUDIT_STORAGE_KEY, JSON.stringify(safe));
  } catch {}
}

function formatTimestamp(date: Date): string {
  return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function formatDateStr(date: Date): string {
  return date.toLocaleDateString('pt-BR') + ' ' + formatTimestamp(date);
}

export default function DriverPortal({
  vehicles,
  botaForas,
  motoristas,
  currentUserEmail,
  currentUserRole,
  lancamentos,
  comissoes,
  dispatches,
  fuelLogs,
  garageDieselPrice,
  garageDieselQty,
  onAddLancamento,
  onAddComissao,
  onUpdateComissao,
  onAddFuelLog,
  onAuthorizeDispatch,
  onShowToast,
  onLogout
}: DriverPortalProps) {
  const isDriverUser = currentUserRole.toLowerCase().includes('motorista') || currentUserRole.toLowerCase().includes('driver') || currentUserEmail === 'motorista@relampago.com';

  const getLinkedFromStorage = (): string | null => {
    if (currentUserEmail.toLowerCase() === 'motorista@relampago.com') return motoristas[0] || null;
    try {
      const raw = localStorage.getItem('relampago_system_users');
      if (raw) {
        const saved = JSON.parse(raw);
        const match = saved.find((u: any) => u.email?.toLowerCase() === currentUserEmail.toLowerCase());
        if (match?.linkedDriver) return match.linkedDriver;
      }
    } catch {}
    return null;
  };

  const [linkedDriverName, setLinkedDriverName] = useState<string | null>(getLinkedFromStorage);

  // Nomes de motoristas aprovados no user_approvals (filtro para o mapa)
  const [approvedDriverNames, setApprovedDriverNames] = useState<string[]>([]);
  useEffect(() => {
    supabase.from('user_approvals').select('name, email, role').eq('role', 'Motorista').then(({ data, error }) => {
      if (!error && data) {
        const names = data.map((u: any) => u.name || u.email?.split('@')[0] || '').filter(Boolean);
        setApprovedDriverNames([...new Set(names)]);
      }
    });
  }, []);

  // Busca linkedDriver do localStorage (sincrono)
  useEffect(() => {
    if (currentUserEmail.toLowerCase() === 'motorista@relampago.com') return;
    const linked = getLinkedFromStorage();
    if (linked) setLinkedDriverName(linked);
  }, [currentUserEmail]);

  // Determine active driver name
  const [selectedDriver, setSelectedDriver] = useState<string>(() => {
    if (currentUserEmail === 'motorista@relampago.com') {
      return motoristas[0] || '';
    }
    if (isDriverUser) {
      const linked = getLinkedFromStorage();
      if (linked) return linked;
    }
    return motoristas[0] || '';
  });

  // Force selectedDriver to stay linked to the actual driver if they are a driver user
  useEffect(() => {
    if (isDriverUser && linkedDriverName) {
      setSelectedDriver(linkedDriverName);
    }
  }, [isDriverUser, linkedDriverName]);

  // Select active vehicle
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>(() => {
    const matched = vehicles.find(v => v.driver === selectedDriver);
    return matched ? matched.id : (vehicles[0]?.id || 'FLT-8829');
  });

  const activeVehicle = vehicles.find(v => v.id === selectedVehicleId);

  // Form states and active forms
  const [activeForm, setActiveForm] = useState<'discharges' | 'refueling'>('discharges');

  const CTR_URL = import.meta.env.VITE_CTR_URL || 'https://ctr-automacao-relampago.onrender.com';

  // Today's date string "YYYY-MM-DD"
  const getTodayDateStr = () => {
    return new Date().toISOString().split('T')[0];
  };

  // 1. Discharge form state
  const [selectedBotaForaId, setSelectedBotaForaId] = useState<string>(botaForas[0]?.id || 'BTF-01');
  const [dischargeQty, setDischargeQty] = useState(1);
  const [dischargeDate, setDischargeDate] = useState(getTodayDateStr());
  const [customDischargePrice, setCustomDischargePrice] = useState<string>('200');
  const [dischargeObservacao, setDischargeObservacao] = useState('');
  const [formStep, setFormStep] = useState(0);
  // Evita que um toque duplo/rápido no botão "Próximo" do último passo intermediário
  // acabe acertando o botão "Confirmar & Faturar" que aparece na mesma posição assim
  // que o passo avança, registrando o descarte sem o usuário perceber.
  const [confirmReady, setConfirmReady] = useState(false);

  // Reseta o passo ao trocar de aba do formulário
  useEffect(() => {
    setFormStep(0);
  }, [activeForm]);

  useEffect(() => {
    setConfirmReady(false);
    if (formStep === 4) {
      const t = setTimeout(() => setConfirmReady(true), 500);
      return () => clearTimeout(t);
    }
  }, [formStep]);

  // Sincroniza o valor padrão do descarte ao alterar o bota-fora selecionado
  useEffect(() => {
    const selected = botaForas.find(b => b.id === selectedBotaForaId);
    if (selected) {
      setCustomDischargePrice(String(selected.valorPadraoDescarte || 200));
    }
  }, [selectedBotaForaId, botaForas]);

  // 2. Refueling form state
  const [fuelStationType, setFuelStationType] = useState<'POSTO' | 'GARAGEM'>('POSTO');
  const [liters, setLiters] = useState<string>('120');
  const [fuelPrice, setFuelPrice] = useState<string>('680');
  const [currentKm, setCurrentKm] = useState<string>('');
  const [fuelObservacao, setFuelObservacao] = useState('');
  const [fuelFotoNota, setFuelFotoNota] = useState<string | null>(null);
  const [fuelFotoFile, setFuelFotoFile] = useState<File | null>(null);
  const fotoInputRef = useRef<HTMLInputElement>(null);

  const garageCalculatedValue = useMemo(() => {
    const litersNum = parseFloat(liters) || 0;
    return (garageDieselPrice ?? 0) * litersNum;
  }, [garageDieselPrice, liters]);

  const handleFotoCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFuelFotoFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setFuelFotoNota(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleRemoveFoto = () => {
    setFuelFotoNota(null);
    setFuelFotoFile(null);
    if (fotoInputRef.current) fotoInputRef.current.value = '';
  };

  // Geolocation state
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);

  // Pede localização automaticamente ao entrar como motorista
  useEffect(() => {
    if (!isDriverUser) return;
    const definitive = localStorage.getItem('relampago_loc_definitivo') === 'true';
    if (definitive) Geo.startWatching(setUserCoords, setGeoError);
  }, [isDriverUser]);

  // Recupera localização quando a página volta a ficar visível (app fechado/reaberto)
  useEffect(() => {
    if (!isDriverUser) return;
    const handleVisibility = () => {
      if (document.visibilityState !== 'visible') return;
      const definitive = localStorage.getItem('relampago_loc_definitivo') === 'true';
      if (!definitive) return;
      Geo.getCurrentPosition().then((pos) => {
        if (pos) setUserCoords(pos);
        if (!Geo.startWatching) return;
      });
      Geo.startWatching(setUserCoords, setGeoError);
    };
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('pageshow', handleVisibility);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('pageshow', handleVisibility);
    };
  }, [isDriverUser]);

  // Pede localização
  const askLocation = async (auto = false) => {
    const granted = await Geo.requestPermission();
    if (!granted) {
      setGeoError("Acesso à localização recusado. Ative a permissão de geolocalização em seu navegador para habilitar o rastreamento em tempo real.");
      return;
    }
    const pos = await Geo.getCurrentPosition();
    if (pos) {
      setUserCoords(pos);
      setGeoError(null);
      localStorage.setItem('relampago_loc_definitivo', 'true');
      Geo.startWatching(setUserCoords, setGeoError);
    } else {
      setGeoError("Não foi possível obter a localização. Verifique se o GPS está ativo.");
    }
  };

  useEffect(() => {
    return () => { Geo.stopWatching(); };
  }, []);

  // Heartbeat com intervalo (usa ref para evitar reiniciar o timer)
  const coordsRef = useRef(userCoords);
  coordsRef.current = userCoords;
  useEffect(() => {
    if (!currentUserEmail) return;
    const beat = () => {
      const c = coordsRef.current;
      sendHeartbeat(currentUserEmail, c?.lat, c?.lng);
    };
    beat();
    const id = setInterval(beat, 30000);
    // Envia heartbeat imediatamente quando a página fica visível
    const onVisible = () => { if (document.visibilityState === 'visible') beat(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [currentUserEmail]);

  // Online badge (polling a cada 15s)
  const [onlineUsers, setOnlineUsers] = useState<{ name: string; lat: number; lng: number }[]>([]);
  useEffect(() => {
    const poll = async () => { try { const r = await getOnlineUsers(); console.log('[Poll] onlineUsers', r); setOnlineUsers(r); } catch {} };
    poll();
    const id = setInterval(poll, 15000);
    return () => clearInterval(id);
  }, []);

  // Local actions logger stream — persisted to localStorage
  const [localAuditHistory, setLocalAuditHistory] = useState<AuditEntry[]>(() => {
    const saved = loadAuditLog();
    if (saved.length > 0) return saved;
    return [{
      id: 'AUD-001',
      action: 'Check-in de Sistema',
      description: 'Inicialização do app de motorista com suporte a coordenadas GNSS',
      time: formatTimestamp(new Date()),
      timestamp: new Date().toISOString(),
      details: 'Dispositivo móvel conectado em ' + formatDateStr(new Date()),
      synchronized: true
    }];
  });

  const [previewFoto, setPreviewFoto] = useState<string | null>(null);

  // Persist audit log on every change
  useEffect(() => {
    saveAuditLog(localAuditHistory);
  }, [localAuditHistory]);

  // Adjust default vehicle on driver change
  useEffect(() => {
    const matched = vehicles.find(v => v.driver === selectedDriver);
    if (matched) {
      setSelectedVehicleId(matched.id);
      if (matched.initialKm) {
        setCurrentKm(String(matched.initialKm + 1200));
      }
    }
  }, [selectedDriver, vehicles]);

  // Calculations for Driver's Today statistics
  const todayStr = getTodayDateStr();

  // Discharges logged in lancamentos for today
  const dischargesTodayCount = lancamentos
    .filter(l => l.driverName === selectedDriver && l.data === todayStr)
    .reduce((sum, current) => sum + current.quantidadeCacambas, 0);

  // Liters refueled today
  const fuelTodayLiters = fuelLogs
    .filter(f => f.driver === selectedDriver && f.data === todayStr)
    .reduce((sum, current) => sum + current.quantidadeLitros, 0);

  // Handle Discharge (Descarte em bota-fora) submission
  const handleDischargeSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Impede submissão implícita do navegador (ex: Enter no campo de Data,
    // que é o único campo do passo e não tem botão de submit visível ainda).
    // A sincronização só deve ocorrer no último passo, via "Confirmar & Faturar".
    if (formStep < 4) {
      setFormStep(prev => Math.min(prev + 1, 4));
      return;
    }

    // Trava extra: ignora um toque que acerte o botão "Confirmar & Faturar"
    // nos primeiros instantes após ele aparecer (efeito de duplo-toque acidental
    // ao avançar do passo anterior).
    if (!confirmReady) {
      return;
    }

    const selectedBotaFora = botaForas.find(b => b.id === selectedBotaForaId);
    if (!selectedBotaFora) {
      onShowToast("Erro", "Bota-Fora inválido selecionado.", "warning");
      return;
    }

    const pricePerBucket = parseFloat(customDischargePrice) || selectedBotaFora.valorPadraoDescarte || 200;
    const totalCost = pricePerBucket * dischargeQty;
    const now = new Date();

    // Call global handler
    onAddLancamento({
      botaForaId: selectedBotaForaId,
      botaForaNome: selectedBotaFora.nome,
      quantidadeCacambas: dischargeQty,
      valor: totalCost,
      data: dischargeDate,
      driverName: selectedDriver,
      vehicleId: selectedVehicleId,
      status: 'Concluido',
      lat: userCoords?.lat || undefined,
      lng: userCoords?.lng || undefined,
      observacao: dischargeObservacao || undefined,
    });

    // Auditor log
    const newAuditAction: AuditEntry = {
      id: `AUD-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`,
      action: 'Descarga Registrada',
      description: `${dischargeQty} caçambas no "${selectedBotaFora.nome}"`,
      time: formatTimestamp(now),
      timestamp: now.toISOString(),
      details: `Custo total de R$ ${(totalCost ?? 0).toFixed(2)} faturado em faturas automáticas`,
      synchronized: true,
      lat: userCoords?.lat || undefined,
      lng: userCoords?.lng || undefined,
      observacao: dischargeObservacao || undefined,
    };
    setLocalAuditHistory(prev => [newAuditAction, ...prev]);

    onShowToast(
      "Descarte Registrado",
      `Dumping de ${dischargeQty} caçambas gravado no aterro "${selectedBotaFora.nome}" com custo total de R$ ${(totalCost ?? 0).toFixed(2)}.`,
      "success"
    );

    setDischargeQty(1);
    setDischargeObservacao('');
    // Volta o wizard pro passo inicial: um novo registro só pode ocorrer
    // refazendo o fluxo, evitando cliques repetidos no botão de confirmar
    // gerarem lançamentos duplicados do mesmo descarte.
    setFormStep(0);
  };

  // Handle Fuel refueling submission
  const handleFuelSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const inputLiters = parseFloat(liters);
    const isGaragem = fuelStationType === 'GARAGEM';
    let inputPrice = isGaragem ? garageCalculatedValue : parseFloat(fuelPrice);
    if (isGaragem && isSupabaseConfigured()) {
      try {
        const { data: cfg } = await supabase.from('vehicles').select('cost_per_km').eq('id', 'GARAGE-CONFIG').maybeSingle();
        if (cfg?.cost_per_km != null) {
          inputPrice = Number(cfg.cost_per_km) * inputLiters;
        }
      } catch {}
    }
    if (isNaN(inputLiters) || inputLiters <= 0) {
      onShowToast("Valor de Litros Inválido", "Por favor, digite uma quantidade de litros válida.", "warning");
      return;
    }
    if (!isGaragem && (isNaN(inputPrice) || inputPrice <= 0)) {
      onShowToast("Valor Pago Inválido", "Por favor, especifique o custo do abastecimento.", "warning");
      return;
    }

    // Attempt to calculate odometer (KMs)
    let finalKmValue: number | undefined = undefined;
    let initialKmValue: number | undefined = undefined;

    if (currentKm) {
      finalKmValue = parseInt(currentKm);
      if (activeVehicle && activeVehicle.initialKm) {
        initialKmValue = activeVehicle.initialKm;
      } else {
        initialKmValue = finalKmValue - 350;
      }
    }

    const now = new Date();

    // Sobe a foto pro Supabase Storage em vez de mandar base64 pela tabela
    // (base64 na tabela era o maior gerador de egress no polling de sincronização).
    // Se o upload falhar, o abastecimento ainda é registrado, só sem a foto.
    let uploadedFotoUrl: string | undefined;
    if (fuelFotoFile) {
      uploadedFotoUrl = (await uploadFuelReceipt(fuelFotoFile)) || undefined;
      if (!uploadedFotoUrl) {
        onShowToast("Foto não enviada", "O abastecimento foi gravado, mas a foto da nota não pôde ser enviada.", "warning");
      }
    }

    // Trigger parent state fuel logger
    onAddFuelLog({
      vehicleId: selectedVehicleId,
      quantidadeLitros: inputLiters,
      kmInicial: initialKmValue,
      kmFinal: finalKmValue,
      valorPago: inputPrice,
      data: getTodayDateStr(),
      driver: selectedDriver,
      tipo: fuelStationType,
      isRetiradaDiversa: false,
      lat: userCoords?.lat || undefined,
      lng: userCoords?.lng || undefined,
      fotoNota: uploadedFotoUrl,
    });

    // Audit trace
    const newAuditAction: AuditEntry = {
      id: `AUD-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`,
      action: 'Abastecimento Controlado',
      description: `${inputLiters} Litros de Diesel • ${fuelStationType === 'GARAGEM' ? 'Bomba da Garagem' : 'Posto Externo'}${fuelFotoNota ? ' • 📸 Com foto da nota' : ''}`,
      time: formatTimestamp(now),
      timestamp: now.toISOString(),
      details: `KM final digitado: ${currentKm || 'Não fornecido'} • R$ ${(inputPrice ?? 0).toFixed(2)} pagos`,
      synchronized: true,
      lat: userCoords?.lat || undefined,
      lng: userCoords?.lng || undefined,
      observacao: fuelObservacao || undefined,
    };
    setLocalAuditHistory(prev => [newAuditAction, ...prev]);

    onShowToast(
      "Abastecimento Gravado", 
      `Comprovante de ${inputLiters} L registrado para o veículo ${selectedVehicleId}. Tanques atualizados!`, 
      "success"
    );

    setLiters('120');
    setFuelPrice('680');
    setCurrentKm('');
    setFuelObservacao('');
    setFuelFotoNota(null);
    setFuelFotoFile(null);
    if (fotoInputRef.current) fotoInputRef.current.value = '';
  };

  if (isDriverUser && !linkedDriverName) {
    return (
      <div className="max-w-md mx-auto my-12 bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center text-slate-100 shadow-2xl relative overflow-hidden font-sans">
        <div className="absolute top-[-20%] left-[-20%] w-[50%] h-[50%] rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />
        
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-amber-500/10 p-0.5 border border-amber-500/20 mb-6">
          <Clock className="w-8 h-8 text-amber-500 animate-pulse" />
        </div>
        
        <h3 className="text-xl font-extrabold text-white tracking-tight leading-snug mb-3">
          Acesso Pendente de Vinculação
        </h3>
        
        <p className="text-xs text-slate-305 leading-relaxed max-w-sm mx-auto mb-6">
          Sua conta <span className="text-emerald-400 font-bold font-mono">{currentUserEmail}</span> foi criada com sucesso, mas para acessar o console de atividades, um administrador precisa vincular seu login a um motorista cadastrado no sistema.
        </p>
        
        <div className="bg-slate-950/60 rounded-2xl p-4 border border-slate-850 text-left space-y-2 mb-6">
          <div className="flex items-center gap-2 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
            <span>Passo-a-passo para ativação:</span>
          </div>
          <ul className="text-[11px] text-slate-300 space-y-2 font-medium">
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
              <span>O administrador acessa o menu de <strong className="text-slate-100 font-semibold">Configurações &rarr; Integrantes</strong>.</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
              <span>Na sua linha de cadastro, seleciona qual motorista do sistema de caçambas é você.</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
              <span>Após a vinculação, atualize a página para acessar o painel completo.</span>
            </li>
          </ul>
        </div>
        
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 transition-colors text-white font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-emerald-950/30 cursor-pointer"
        >
          Atualizar Página
        </button>
      </div>
    );
  }

  // Prepara lista de veículos + marcadores sintéticos para motoristas sem veículo
  const mapVehicles = (() => {
    // Se for motorista, mostra só ele mesmo no mapa
    if (isDriverUser) {
      return vehicles.filter(v => v.driver === selectedDriver && v.lat && v.lng);
    }
    // Admin: mostra todos os motoristas aprovados + sintéticos
    const activeNames = [...new Set(approvedDriverNames.length > 0 ? approvedDriverNames : motoristas)];
    const filtered = vehicles.filter(v => v.driver && v.lat && v.lng && activeNames.includes(v.driver));
    const driversOnMap = new Set(filtered.map(v => v.driver));
    const onlineMap = new Map(onlineUsers.map(u => [u.name, u]));
    console.log('[MV] onlineMap', [...onlineMap.entries()], 'activeNames', activeNames);
    activeNames.forEach((name: string, i: number) => {
      if (!driversOnMap.has(name)) {
        driversOnMap.add(name);
        const o = onlineMap.get(name) as { lat?: number; lng?: number } | undefined;
        const useLat = o?.lat ?? 0.15 + i * 0.04;
        const useLng = o?.lng ?? 0.15 + i * 0.04;
        console.log('[MV] synth for', name, 'online=', o, 'lat=', useLat, 'lng=', useLng);
        filtered.push({
          id: `syn-${i}`, driver: name,
          lat: useLat,
          lng: useLng,
          status: 'Available', speed: 0, efficiency: 0, fuelUsed: 0, costPerKm: 0,
          trend: [], isActive: true
        } as Vehicle);
      }
    });
    return filtered;
  })();

  // Tela de permissão de localização (antes de mostrar o portal)
  if (isDriverUser && localStorage.getItem('relampago_loc_definitivo') !== 'true' && !geoError && !userCoords) {
    return (
      <div className="max-w-md mx-auto my-12 bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center text-slate-100 shadow-2xl relative overflow-hidden font-sans">
        <div className="absolute top-[-20%] left-[-20%] w-[50%] h-[50%] rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
        
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-500/10 p-0.5 border border-emerald-500/20 mb-6">
          <Navigation className="w-8 h-8 text-emerald-500 animate-pulse" />
        </div>
        
        <h3 className="text-xl font-extrabold text-white tracking-tight leading-snug mb-3">
          Autorizar Localização
        </h3>
        
        <p className="text-xs text-slate-300 leading-relaxed max-w-sm mx-auto mb-6">
          Este aplicativo precisa da sua localização para registrar as coordenadas GPS das descargas e abastecimentos, além de mostrar sua posição em tempo real no mapa.
        </p>
        
        <div className="bg-slate-950/60 rounded-2xl p-4 border border-slate-800 text-left space-y-2 mb-6">
          <div className="flex items-center gap-2 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
            <span>Por que preciso disso?</span>
          </div>
          <ul className="text-[11px] text-slate-300 space-y-2 font-medium">
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
              <span>Registrar coordenadas exatas de cada descarga</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
              <span>Mostrar sua posição em tempo real no mapa</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
              <span>Comprovação geográfica das atividades realizadas</span>
            </li>
          </ul>
        </div>

        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={() => askLocation(true)}
            className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 transition-colors text-white font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-emerald-950/30 cursor-pointer"
          >
            Autorizar Definitivamente
          </button>
        </div>
      </div>
    );
  }

  // Tela de erro de localização (se negou ou deu erro)
  if (isDriverUser && geoError) {
    return (
      <div className="max-w-md mx-auto my-12 bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center text-slate-100 shadow-2xl relative overflow-hidden font-sans">
        <div className="absolute top-[-20%] left-[-20%] w-[50%] h-[50%] rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />
        
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-amber-500/10 p-0.5 border border-amber-500/20 mb-6">
          <MapPin className="w-8 h-8 text-amber-500" />
        </div>
        
        <h3 className="text-xl font-extrabold text-white tracking-tight leading-snug mb-3">
          Localização Não Autorizada
        </h3>
        
        <p className="text-xs text-slate-300 leading-relaxed max-w-sm mx-auto mb-6">
          {geoError}
        </p>
        
        <div className="bg-slate-950/60 rounded-2xl p-4 border border-slate-800 text-left space-y-2 mb-6">
          <ul className="text-[11px] text-slate-300 space-y-2 font-medium">
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
              <span>No Chrome: Configurações &rarr; Privacidade &rarr; Localização</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
              <span>No celular: Ajustes &rarr; Apps &rarr; Navegador &rarr; Localização</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
              <span>Após ativar, clique no botão abaixo para tentar novamente</span>
            </li>
          </ul>
        </div>

        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={() => { setGeoError(null); askLocation(true); }}
            className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 transition-colors text-white font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-emerald-950/30 cursor-pointer"
          >
            Tentar Novamente
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
    <div id="driver-app-console" className="space-y-4 sm:space-y-6">
      
      {/* Dynamic Header Section for smartphone styling view */}
      <div className="bg-gradient-to-r from-slate-900 to-indigo-950 p-4 sm:p-6 rounded-2xl border border-slate-800 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1 sm:space-y-1.5">
          <div className="flex items-center gap-2">
            <div className="bg-emerald-500/20 text-emerald-400 p-1 rounded font-black text-[9px] uppercase tracking-widest flex items-center gap-1">
              <Smartphone className="w-3 h-3" />
              <span>Console do Condutor</span>
            </div>
            <div className="text-slate-400 text-[10px] sm:text-xs flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Sincronizado</span>
            </div>
          </div>
          <h2 className="text-lg sm:text-xl font-extrabold tracking-tight font-sans flex items-center gap-2">
            <span>Olá, {isDriverUser ? selectedDriver : currentUserEmail.split('@')[0]}!</span>
            <Sparkles className="w-4 h-4 text-emerald-400 fill-emerald-400" />
          </h2>
          <p className="text-[11px] sm:text-xs text-slate-300 leading-normal">
            {isDriverUser
              ? 'Utilize este painel móvel simplificado para registrar as suas atividades em tempo real nas ruas de São Paulo.'
              : `Você está visualizando o Portal do Motorista como administrador. Use o simulador abaixo para agir como um motorista específico.`
            }
          </p>
        </div>

        {/* Quick Driver or Vehicle Select to let anyone test seamlessly */}
        <div className="flex flex-row flex-wrap items-center gap-3 bg-slate-950/60 p-3 rounded-xl border border-slate-800 w-full md:w-auto justify-between sm:justify-start">
          {!isDriverUser && (
            <div className="space-y-1 min-w-[140px] flex-1 sm:flex-initial">
              <span className="block text-[8px] font-bold text-slate-500 uppercase font-sans">👤 Ações como:</span>
              <select
                value={selectedDriver}
                onChange={(e) => setSelectedDriver(e.target.value)}
                className="bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs text-slate-200 outline-none focus:border-indigo-500 w-full sm:max-w-[180px] font-bold cursor-pointer"
              >
                {motoristas.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
          )}

          <div className="space-y-1 min-w-[100px] flex-1 sm:flex-initial">
            <span className="block text-[8px] font-bold text-slate-500 uppercase font-sans">Veículo Operado</span>
            <select
              value={selectedVehicleId}
              onChange={(e) => setSelectedVehicleId(e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs text-slate-200 outline-none focus:border-indigo-500 w-full font-bold font-mono cursor-pointer"
            >
              {vehicles.map(v => (
                <option key={v.id} value={v.id}>{v.id} ({v.type})</option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={() => onLogout?.()}
            className="flex items-center gap-1.5 px-3 py-2 bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 hover:text-rose-200 rounded-lg border border-rose-800/40 hover:border-rose-600/50 transition-all text-[11px] font-bold cursor-pointer"
            title="Sair do sistema"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Sair</span>
          </button>
        </div>
      </div>

      {/* Grid of counters indicating today's active achievements */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        
        <div className="bg-white border border-blue-200/60 p-3 sm:p-4 rounded-xl shadow-sm flex flex-col sm:flex-row items-center sm:items-start md:items-center gap-2 sm:gap-4 text-center sm:text-left">
          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-amber-50 rounded-xl flex items-center justify-center text-amber-600 shrink-0">
            <Building className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="block text-[9px] sm:text-[10px] uppercase tracking-wider font-bold text-slate-400 truncate">Descartes</span>
            <strong className="text-base sm:text-xl font-extrabold text-slate-900 block mt-0.5 truncate">{dischargesTodayCount} cç.</strong>
            <span className="text-[9px] sm:text-[10px] text-emerald-600 font-bold block mt-0.5 truncate">Sincronizados</span>
          </div>
        </div>

        <div className="bg-white border border-blue-200/60 p-3 sm:p-4 rounded-xl shadow-sm flex flex-col sm:flex-row items-center sm:items-start md:items-center gap-2 sm:gap-4 text-center sm:text-left">
          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-rose-50 rounded-xl flex items-center justify-center text-rose-600 shrink-0">
            <Fuel className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="block text-[9px] sm:text-[10px] uppercase tracking-wider font-bold text-slate-400 truncate">Diesel</span>
            <strong className="text-base sm:text-xl font-extrabold text-slate-900 block mt-0.5 truncate">{fuelTodayLiters} L</strong>
            <span className="text-[9px] sm:text-[10px] text-slate-450 block mt-0.5 truncate">Hoje abastecido</span>
          </div>
        </div>

      </div>

      {/* Lançamentos / Atividades de Rua Hoje */}
      <div className="relative bg-gradient-to-br from-white via-blue-50 to-blue-100/60 border-2 border-emerald-100/80 rounded-3xl p-5 sm:p-7 shadow-lg shadow-emerald-900/5 overflow-hidden">
        <div className="absolute -top-20 -right-20 w-40 h-40 rounded-full bg-emerald-500/5 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 w-40 h-40 rounded-full bg-teal-500/5 blur-3xl pointer-events-none" />
        <div className="relative">
          <div className="flex justify-between items-center mb-5">
            <div>
              <h3 className="font-sans font-extrabold text-base sm:text-lg text-slate-900 flex items-center gap-2.5">
                <span className="bg-gradient-to-br from-emerald-500 to-teal-600 p-2 rounded-xl shadow-md shadow-emerald-500/20">
                  <Clock className="w-4 h-4 text-white" />
                </span>
                <span>Atividades de Rua Hoje</span>
              </h3>
              <p className="text-[11px] text-slate-400 font-medium ml-[3.25rem] -mt-0.5">Registro de operações realizadas</p>
            </div>
            <span className="text-[10px] bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-extrabold px-3 py-1.5 rounded-full shadow-sm">
              {localAuditHistory.length} registro{localAuditHistory.length !== 1 ? 's' : ''}
            </span>
          </div>

        {/* Audit List of actions typed by the driver */}
        <div className="space-y-3 max-h-[320px] overflow-y-auto scrollbar-thin pr-1">
          {localAuditHistory.map((item, idx) => (
            <div 
              key={item.id} 
              className={`p-3.5 rounded-xl border border-slate-100 text-xs transition-all hover:bg-slate-50 relative ${
                idx === 0 ? 'bg-emerald-50/20 border-emerald-500/20' : 'bg-white'
              }`}
            >
              <div className="flex justify-between items-start gap-2 mb-1.5">
                <span className="font-black text-slate-800 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  {item.action}
                </span>
                <span className="text-[9px] text-slate-450 font-mono bg-slate-100 px-1 py-0.5 rounded">
                  {item.timestamp ? new Date(item.timestamp).toLocaleDateString('pt-BR') + ' ' + item.time : item.time}
                </span>
              </div>
              <p className="text-slate-600 font-medium mb-1.5 leading-relaxed">{item.description}</p>
              
              {item.observacao && (
                <div className="mb-2 text-[10px] bg-blue-50 border border-blue-100 rounded-lg p-2 text-blue-700 font-medium">
                  📝 {item.observacao}
                </div>
              )}

              {item.fotoNota && (
                <div className="mb-2">
                  <button
                    type="button"
                    onClick={() => setPreviewFoto(item.fotoNota!)}
                    className="w-full relative overflow-hidden rounded-xl border border-slate-200 cursor-pointer group"
                  >
                    <img
                      src={item.fotoNota}
                      alt="Nota fiscal"
                      className="w-full h-28 object-cover"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-all flex items-center justify-center">
                      <span className="text-white font-bold text-xs bg-black/40 px-3 py-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-all">
                        🔍 Visualizar
                      </span>
                    </div>
                  </button>
                </div>
              )}
              
              {typeof item.lat === 'number' && typeof item.lng === 'number' && (
                <div className="mt-1.5 mb-2 text-[10px] bg-slate-50 border border-slate-150 rounded-lg p-2 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1 text-slate-500 font-semibold font-mono">
                    <MapPin className="w-3.5 h-3.5 text-emerald-500 animate-pulse" />
                    <span>GPS: {(item.lat ?? 0).toFixed(6)}, {(item.lng ?? 0).toFixed(6)}</span>
                  </div>
                  <a 
                    href={`https://www.openstreetmap.org/?mlat=${item.lat}&mlon=${item.lng}#map=17/${item.lat}/${item.lng}`} 
                    target="_blank" 
                    rel="noreferrer referrer" 
                    className="text-[10px] font-black text-indigo-600 hover:text-indigo-800 hover:underline flex items-center gap-0.5 shrink-0"
                  >
                    Ver no Mapa ↗
                  </a>
                </div>
              )}

              <div className="flex items-center justify-between text-[10px] text-slate-450 border-t border-slate-100 pt-1.5 mt-1.5 font-sans">
                <span>{item.details}</span>
                <div className="flex items-center gap-1 text-[10px] text-emerald-600 font-bold">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Sincronizado</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      </div>

      {/* Formulário de Atividades - largura total */}
      <div className="relative bg-gradient-to-br from-white via-blue-50 to-blue-100/60 border-2 border-emerald-100/80 rounded-3xl p-5 sm:p-7 shadow-lg shadow-emerald-900/5 overflow-hidden">
        {/* Decorative bg elements */}
        <div className="absolute -top-20 -right-20 w-40 h-40 rounded-full bg-emerald-500/5 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 w-40 h-40 rounded-full bg-teal-500/5 blur-3xl pointer-events-none" />
        
        <div className="relative">
          <h3 className="font-sans font-extrabold text-base sm:text-lg text-slate-900 mb-1 flex items-center gap-2.5">
            <span className="bg-gradient-to-br from-emerald-500 to-teal-600 p-2 rounded-xl shadow-md shadow-emerald-500/20">
              <Activity className="w-4 h-4 text-white" />
            </span>
            <span>Registrar Atividade</span>
          </h3>
          <p className="text-[11px] text-slate-400 font-medium ml-[3.25rem] mb-5 -mt-1">
            Preencha os passos abaixo para registrar uma nova operação
          </p>

          {/* Quick Select Buttons between actions forms */}
          <div className="grid grid-cols-3 gap-2 mb-6">
            <button
              type="button"
              onClick={() => setActiveForm('discharges')}
              className={`relative py-3 px-2 sm:px-4 rounded-2xl border-2 text-[11px] sm:text-xs font-black tracking-wide flex flex-col items-center gap-2 transition-all text-center cursor-pointer overflow-hidden ${
                activeForm === 'discharges' 
                  ? 'bg-gradient-to-br from-emerald-600 to-emerald-700 border-emerald-500 text-white shadow-lg shadow-emerald-600/25 scale-[1.02]'
                  : 'bg-white border-blue-200/60 text-slate-600 hover:border-emerald-300 hover:bg-emerald-50/50 hover:text-emerald-700'
              }`}
            >
              {activeForm === 'discharges' && <div className="absolute inset-0 bg-white/5 pointer-events-none" />}
              <Building className={`w-5 h-5 ${activeForm === 'discharges' ? 'text-emerald-200' : ''}`} />
              <span>Descarregar Aterro</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveForm('refueling')}
              className={`relative py-3 px-2 sm:px-4 rounded-2xl border-2 text-[11px] sm:text-xs font-black tracking-wide flex flex-col items-center gap-2 transition-all text-center cursor-pointer overflow-hidden ${
                activeForm === 'refueling' 
                  ? 'bg-gradient-to-br from-emerald-600 to-emerald-700 border-emerald-500 text-white shadow-lg shadow-emerald-600/25 scale-[1.02]'
                  : 'bg-white border-blue-200/60 text-slate-600 hover:border-emerald-300 hover:bg-emerald-50/50 hover:text-emerald-700'
              }`}
            >
              {activeForm === 'refueling' && <div className="absolute inset-0 bg-white/5 pointer-events-none" />}
              <Fuel className={`w-5 h-5 ${activeForm === 'refueling' ? 'text-emerald-200' : ''}`} />
              <span>Abastecimento</span>
            </button>

            <button
              type="button"
              onClick={() => window.open(CTR_URL, '_blank')}
              className="relative py-3 px-2 sm:px-4 rounded-2xl border-2 text-[11px] sm:text-xs font-black tracking-wide flex flex-col items-center gap-2 transition-all text-center cursor-pointer overflow-hidden bg-white border-blue-200/60 text-slate-600 hover:border-orange-300 hover:bg-orange-50/50 hover:text-orange-700"
            >
              <FileText className="w-5 h-5" />
              <span>CTR</span>
            </button>
          </div>

          {/* Render form 1: Discharges (Descarte bota-fora) - Passo a passo */}
          {activeForm === 'discharges' && (
            <form onSubmit={handleDischargeSubmit} className="space-y-5">
              {/* Indicador de Progresso */}
              <div className="relative">
                <div className="flex items-center justify-between mb-2">
                  {['Descarte', 'Qtd', 'Valor', 'Data', 'Obs'].map((label, i) => (
                    <div key={label} className="flex flex-col items-center">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black border-2 transition-all duration-300 ${
                        formStep >= i
                          ? 'bg-emerald-500 border-emerald-500 text-white shadow-md shadow-emerald-500/30 scale-110'
                          : 'bg-slate-100 border-slate-300 text-slate-400'
                      }`}>
                        {formStep > i ? (
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                        ) : (
                          i + 1
                        )}
                      </div>
                      <span className={`text-[9px] font-bold mt-1.5 uppercase tracking-wider ${
                        formStep >= i ? 'text-emerald-600' : 'text-slate-400'
                      }`}>{label}</span>
                    </div>
                  ))}
                </div>
                {/* Barra de progresso conectando os círculos */}
                <div className="absolute top-4 left-0 right-0 h-0.5 bg-slate-200 -z-10 mx-4">
                  <div className="h-full bg-emerald-500 transition-all duration-500 rounded-full" style={{ width: `${(formStep / 4) * 100}%` }} />
                </div>
              </div>

              {/* Card do Passo Atual */}
              <div className="bg-white border border-blue-200/60 rounded-2xl p-5 sm:p-6 shadow-sm shadow-emerald-900/5">
                {/* Passo 1: Ponto de Descarte */}
                {formStep === 0 && (
                  <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                    <div className="flex items-center gap-2 mb-4">
                      <span className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-sm font-black">1</span>
                      <div>
                        <label className="text-xs font-black uppercase text-slate-500 tracking-wider">Ponto de Descarte</label>
                        <p className="text-[10px] text-slate-400">Selecione o bota-fora de destino</p>
                      </div>
                    </div>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-500 z-10">
                        <MapPin className="w-5 h-5" />
                      </span>
                      <select
                        value={selectedBotaForaId}
                        onChange={(e) => setSelectedBotaForaId(e.target.value)}
                        className="w-full pl-12 pr-5 py-4 bg-gradient-to-r from-emerald-50/50 to-white border-2 border-emerald-200 rounded-2xl text-base text-slate-800 font-bold outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 cursor-pointer appearance-none transition-all hover:border-emerald-300"
                        style={{
                          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
                          backgroundRepeat: 'no-repeat',
                          backgroundPosition: 'right 1rem center',
                          backgroundSize: '1rem'
                        }}
                      >
                        {botaForas.map(b => (
                          <option key={b.id} value={b.id}>
                            {b.nome} {b.valorPadraoDescarte ? `(R$ ${b.valorPadraoDescarte}/cç)` : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}

                {/* Passo 2: Quantidade (lista clicável 1-5) */}
                {formStep === 1 && (
                  <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                    <div className="flex items-center gap-2 mb-4">
                      <span className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-sm font-black">2</span>
                      <div>
                        <label className="text-xs font-black uppercase text-slate-500 tracking-wider">Quantidade de Caçambas</label>
                        <p className="text-[10px] text-slate-400">Escolha quantas caçambas foram descarregadas</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-5 gap-2.5">
                      {[1, 2, 3, 4, 5].map((qty) => (
                        <button
                          key={qty}
                          type="button"
                          onClick={() => setDischargeQty(qty)}
                          className={`relative py-5 rounded-2xl border-2 text-2xl font-black transition-all duration-200 cursor-pointer ${
                            dischargeQty === qty
                              ? 'bg-gradient-to-br from-emerald-500 to-emerald-600 border-emerald-400 text-white shadow-xl shadow-emerald-500/30 scale-110 -translate-y-1'
                              : 'bg-white border-blue-200/60 text-slate-600 hover:border-emerald-300 hover:bg-emerald-50 hover:shadow-md hover:-translate-y-0.5 active:scale-95'
                          }`}
                        >
                          {qty}
                        </button>
                      ))}
                    </div>
                    <div className="mt-3 text-center">
                      <span className="inline-block px-4 py-1.5 bg-emerald-50 border border-emerald-200 rounded-full text-xs font-bold text-emerald-700">
                        {dischargeQty} caçamba{dischargeQty > 1 ? 's' : ''} selecionada{dischargeQty > 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>
                )}

                {/* Passo 3: Valor Cobrado */}
                {formStep === 2 && (
                  <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                    <div className="flex items-center gap-2 mb-4">
                      <span className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-sm font-black">3</span>
                      <div>
                        <label className="text-xs font-black uppercase text-slate-500 tracking-wider">Valor Cobrado</label>
                        <p className="text-[10px] text-slate-400">Custo por caçamba para faturamento</p>
                      </div>
                    </div>
                    <div className="relative">
                      <span className="absolute left-5 top-1/2 -translate-y-1/2 text-emerald-500 font-black text-lg z-10">
                        R$
                      </span>
                      <input
                        type="number"
                        value={customDischargePrice}
                        onChange={(e) => setCustomDischargePrice(e.target.value)}
                        placeholder="200"
                        className="w-full pl-16 pr-5 py-5 bg-gradient-to-r from-emerald-50/50 to-white border-2 border-emerald-200 rounded-2xl text-2xl text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 font-black tracking-tight transition-all hover:border-emerald-300"
                      />
                    </div>
                    {/* Live cost estimator */}
                    <div className="mt-3 p-4 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-2xl shadow-lg shadow-emerald-500/20">
                      <div className="flex justify-between items-center text-white">
                        <div>
                          <span className="text-[11px] text-emerald-100 font-bold uppercase tracking-wider">Total da Descarga</span>
                          <p className="text-[10px] text-emerald-200 mt-0.5">{dischargeQty} caçamba{dischargeQty > 1 ? 's' : ''} × R$ {parseFloat(customDischargePrice) || 0}</p>
                        </div>
                        <strong className="text-2xl font-black text-white drop-shadow-sm">
                          R$ {(((parseFloat(customDischargePrice) || 0) * dischargeQty) || 0).toFixed(2)}
                        </strong>
                      </div>
                    </div>
                  </div>
                )}

                {/* Passo 4: Data */}
                {formStep === 3 && (
                  <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                    <div className="flex items-center gap-2 mb-4">
                      <span className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-sm font-black">4</span>
                      <div>
                        <label className="text-xs font-black uppercase text-slate-500 tracking-wider">Data da Descarga</label>
                        <p className="text-[10px] text-slate-400">Quando a descarga foi realizada</p>
                      </div>
                    </div>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-500 z-10">
                        <Calendar className="w-5 h-5" />
                      </span>
                      <input
                        type="date"
                        value={dischargeDate}
                        onChange={(e) => setDischargeDate(e.target.value)}
                        className="w-full pl-12 pr-5 py-4 bg-gradient-to-r from-emerald-50/50 to-white border-2 border-emerald-200 rounded-2xl text-lg text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 font-bold transition-all hover:border-emerald-300"
                      />
                    </div>
                  </div>
                )}

                {/* Passo 5: Observação + Submit */}
                {formStep === 4 && (
                  <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                    <div className="flex items-center gap-2 mb-4">
                      <span className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-sm font-black">5</span>
                      <div>
                        <label className="text-xs font-black uppercase text-slate-500 tracking-wider">Observação</label>
                        <p className="text-[10px] text-slate-400">Informações adicionais (opcional)</p>
                      </div>
                    </div>
                    <div className="relative">
                      <span className="absolute left-4 top-4 text-emerald-500 z-10">
                        <FileText className="w-5 h-5" />
                      </span>
                      <textarea
                        value={dischargeObservacao}
                        onChange={(e) => setDischargeObservacao(e.target.value)}
                        placeholder="Ex: Caçamba danificada, cliente ausente..."
                        rows={3}
                        className="w-full pl-12 pr-5 py-4 bg-gradient-to-r from-emerald-50/50 to-white border-2 border-emerald-200 rounded-2xl text-base text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 resize-none transition-all hover:border-emerald-300"
                      />
                    </div>

                    {/* Resumo antes de confirmar */}
                    <div className="mt-4 p-5 bg-gradient-to-br from-slate-50 to-slate-100/80 border border-blue-200/60 rounded-2xl">
                      <div className="flex items-center gap-2 mb-3">
                        <svg className="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        <span className="font-black text-sm text-slate-700 uppercase tracking-wide">Resumo da Descarga</span>
                      </div>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 text-sm">
                        <div className="flex flex-col">
                          <span className="text-[10px] font-bold text-slate-400 uppercase">Ponto</span>
                          <span className="font-bold text-slate-800">{botaForas.find(b => b.id === selectedBotaForaId)?.nome || '-'}</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[10px] font-bold text-slate-400 uppercase">Qtd</span>
                          <span className="font-bold text-slate-800">{dischargeQty} caçamba{dischargeQty > 1 ? 's' : ''}</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[10px] font-bold text-slate-400 uppercase">Valor</span>
                          <span className="font-bold text-emerald-600 text-lg -mt-1">R$ {(((parseFloat(customDischargePrice) || 0) * dischargeQty) || 0).toFixed(2)}</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[10px] font-bold text-slate-400 uppercase">Data</span>
                          <span className="font-bold text-slate-800">{dischargeDate}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Navegação entre passos */}
              <div className="flex items-center justify-between gap-3">
                {formStep > 0 ? (
                  <button
                    type="button"
                    onClick={() => setFormStep(prev => prev - 1)}
                    className="group inline-flex items-center gap-2 px-5 py-3 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-800 rounded-2xl border-2 border-blue-200/60 hover:border-slate-300 text-xs font-black tracking-wide transition-all cursor-pointer shadow-sm"
                  >
                    <svg className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" /></svg>
                    Voltar
                  </button>
                ) : (
                  <div />
                )}
                
                {formStep < 4 ? (
                  <button
                    type="button"
                    onClick={() => setFormStep(prev => prev + 1)}
                    className="group inline-flex items-center gap-2 px-7 py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white rounded-2xl text-xs font-black tracking-wide transition-all shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 cursor-pointer hover:-translate-y-0.5 active:translate-y-0"
                  >
                    Próximo
                    <svg className="w-4 h-4 transition-transform group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg>
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={!confirmReady}
                    className={`group inline-flex items-center gap-2 px-7 py-3 bg-gradient-to-r from-emerald-500 via-emerald-600 to-teal-600 hover:from-emerald-400 hover:via-emerald-500 hover:to-teal-500 text-white rounded-2xl text-xs font-black tracking-wide transition-all shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/45 hover:-translate-y-0.5 active:translate-y-0 ${confirmReady ? 'cursor-pointer' : 'opacity-50 cursor-not-allowed'}`}
                  >
                    <Building className="w-4 h-4" />
                    <span>Confirmar &amp; Faturar</span>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                  </button>
                )}
              </div>
            </form>
          )}

          {/* Render form 2: Refueling (Abastecimento) */}
          {activeForm === 'refueling' && (
            <form onSubmit={handleFuelSubmit} className="space-y-5">
              <div className="bg-white border border-blue-200/60 rounded-2xl p-5 sm:p-6 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <span className="w-8 h-8 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-sm font-black">
                    <Fuel className="w-4 h-4" />
                  </span>
                  <div>
                    <span className="text-xs font-black uppercase text-slate-500 tracking-wider">Origem do Diesel</span>
                    <p className="text-[10px] text-slate-400">Selecione a origem do abastecimento</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setFuelStationType('POSTO');
                      setFuelPrice('680');
                    }}
                    className={`relative py-4 px-3 rounded-2xl border-2 text-xs font-black tracking-wide transition-all text-center cursor-pointer ${
                      fuelStationType === 'POSTO'
                        ? 'bg-gradient-to-br from-emerald-500 to-emerald-600 border-emerald-400 text-white shadow-lg shadow-emerald-500/20 scale-[1.02]'
                        : 'bg-white border-blue-200/60 text-slate-600 hover:border-emerald-300 hover:bg-emerald-50'
                    }`}
                  >
                    ⛽ Posto Externo
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setFuelStationType('GARAGEM');
                      setFuelPrice('0');
                    }}
                    className={`relative py-4 px-3 rounded-2xl border-2 text-xs font-black tracking-wide transition-all text-center cursor-pointer ${
                      fuelStationType === 'GARAGEM'
                        ? 'bg-gradient-to-br from-amber-500 to-amber-600 border-amber-400 text-white shadow-lg shadow-amber-500/20 scale-[1.02]'
                        : 'bg-white border-blue-200/60 text-slate-600 hover:border-amber-300 hover:bg-amber-50'
                    }`}
                  >
                    🏢 Bomba Garagem
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-white border border-blue-200/60 rounded-2xl p-5 shadow-sm">
                  <label className="block text-xs font-black uppercase text-slate-500 tracking-wider mb-1">Quantidade (Litros)</label>
                  <p className="text-[10px] text-slate-400 mb-3">Volume abastecido</p>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-500 font-black text-lg">L</span>
                    <input
                      type="number"
                      required
                      value={liters}
                      onChange={(e) => setLiters(e.target.value)}
                      placeholder="150"
                      className="w-full pl-10 pr-4 py-3 bg-gradient-to-r from-emerald-50/50 to-white border-2 border-blue-200/60 rounded-xl text-xl text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 font-bold transition-all hover:border-emerald-300"
                    />
                  </div>
                </div>

                <div className="bg-white border border-blue-200/60 rounded-2xl p-5 shadow-sm">
                  <label className="block text-xs font-black uppercase text-slate-500 tracking-wider mb-1">Valor Pago (R$)</label>
                  <p className="text-[10px] text-slate-400 mb-3">Custo total do abastecimento</p>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-500 font-black text-lg">R$</span>
                    <input
                      type="number"
                      required
                      disabled={fuelStationType === 'GARAGEM'}
                      value={fuelStationType === 'GARAGEM' ? garageCalculatedValue.toFixed(2) : fuelPrice}
                      onChange={(e) => setFuelPrice(e.target.value)}
                      placeholder="850"
                      className="w-full pl-14 pr-4 py-3 bg-gradient-to-r from-emerald-50/50 to-white border-2 border-blue-200/60 rounded-xl text-xl text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 font-bold transition-all hover:border-emerald-300 disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-white border border-blue-200/60 rounded-2xl p-5 shadow-sm">
                <div className="flex justify-between items-center mb-3">
                  <div>
                    <label className="block text-xs font-black uppercase text-slate-500 tracking-wider">Odômetro (KM Atual)</label>
                    <p className="text-[10px] text-slate-400">Quilometragem do veículo</p>
                  </div>
                  <span className="text-[9px] bg-slate-100 text-slate-500 font-bold px-3 py-1.5 rounded-full font-mono">Último: {activeVehicle?.initialKm || 120500} KM</span>
                </div>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                    <Navigation className="w-5 h-5" />
                  </span>
                  <input
                    type="number"
                    value={currentKm}
                    onChange={(e) => setCurrentKm(e.target.value)}
                    placeholder={activeVehicle ? String(activeVehicle.initialKm ? activeVehicle.initialKm + 150 : 120650) : "120680"}
                    className="w-full pl-12 pr-4 py-3 bg-gradient-to-r from-blue-100/30 to-white border-2 border-blue-200/60 rounded-xl text-lg text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 font-bold font-mono tracking-wide transition-all hover:border-emerald-300"
                  />
                </div>
              </div>

              <div className="bg-white border border-blue-200/60 rounded-2xl p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <Camera className="w-4 h-4 text-slate-400" />
                  <span className="text-xs font-black uppercase text-slate-500 tracking-wider">Foto da Nota</span>
                </div>
                <input
                  ref={fotoInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleFotoCapture}
                  className="hidden"
                />
                {fuelFotoNota ? (
                  <div className="relative">
                    <img
                      src={fuelFotoNota}
                      alt="Nota fiscal"
                      className="w-full h-48 object-cover rounded-xl border-2 border-blue-200/60"
                    />
                    <button
                      type="button"
                      onClick={handleRemoveFoto}
                      className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full shadow-lg hover:bg-red-600 transition-all cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fotoInputRef.current?.click()}
                    className="w-full flex flex-col items-center justify-center gap-2 py-6 border-2 border-dashed border-slate-300 rounded-xl text-slate-500 hover:border-emerald-400 hover:text-emerald-600 transition-all cursor-pointer bg-gradient-to-r from-blue-100/30 to-white"
                  >
                    <Camera className="w-8 h-8" />
                    <span className="text-xs font-bold">Tirar Foto da Nota</span>
                    <span className="text-[10px] text-slate-400">Aponte a câmera para o comprovante</span>
                  </button>
                )}
              </div>

              <button
                type="submit"
                className="group w-full inline-flex items-center justify-center gap-2.5 px-7 py-4 bg-gradient-to-r from-emerald-500 via-emerald-600 to-teal-600 hover:from-emerald-400 hover:via-emerald-500 hover:to-teal-500 text-white rounded-2xl text-xs font-black tracking-wide transition-all shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/45 cursor-pointer hover:-translate-y-0.5 active:translate-y-0"
              >
                <Fuel className="w-5 h-5" />
                <span>Gravar Abastecimento</span>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
              </button>
            </form>
          )}
        </div>
      </div>

      {/* Guidelines info card for dispatch safety */}
      <div className="relative p-5 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-2xl shadow-lg shadow-emerald-500/20 flex items-start gap-4 overflow-hidden">
        <div className="absolute -top-4 -right-4 w-24 h-24 rounded-full bg-white/5 blur-2xl pointer-events-none" />
        <div className="absolute -bottom-4 -left-4 w-24 h-24 rounded-full bg-white/5 blur-2xl pointer-events-none" />
        <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center shrink-0 backdrop-blur-sm">
          <ShieldCheck className="w-5 h-5 text-white" />
        </div>
        <div className="text-[12px] text-white/90 space-y-1 leading-relaxed">
          <strong className="block font-black text-white uppercase tracking-wider text-xs">DICA OPERACIONAL</strong>
          <p className="text-white/80">
            Ao registrar qualquer atividade, os dados são sincronizados automaticamente com o sistema central, atualizando comissões, faturas e médias de consumo em tempo real.
          </p>
        </div>
      </div>

      {/* Mapa - movido para o final */}
      <div className="relative bg-gradient-to-br from-white via-blue-50 to-blue-100/60 border-2 border-emerald-100/80 rounded-3xl p-5 sm:p-7 shadow-lg shadow-emerald-900/5 overflow-hidden">
        <div className="absolute -top-20 -right-20 w-40 h-40 rounded-full bg-emerald-500/5 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 w-40 h-40 rounded-full bg-teal-500/5 blur-3xl pointer-events-none" />
        <div className="relative">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
            <div>
              <h3 className="font-sans font-extrabold text-base sm:text-lg text-slate-900 flex items-center gap-2.5">
                <span className="bg-gradient-to-br from-emerald-500 to-teal-600 p-2 rounded-xl shadow-md shadow-emerald-500/20">
                  <MapPin className="w-4 h-4 text-white" />
                </span>
                <span>Rastreamento GNSS</span>
              </h3>
              <p className="text-[11px] text-slate-400 font-medium ml-[3.25rem] -mt-0.5">
                Coordenadas geodésicas em tempo real
              </p>
            </div>
            {userCoords && typeof userCoords.lat === 'number' && typeof userCoords.lng === 'number' && (
              <div className="flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-600 px-3 py-2 rounded-xl text-[10px] text-white font-extrabold font-mono shadow-md shrink-0 ml-[3.25rem] sm:ml-0">
                <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                <span>{(userCoords.lat ?? 0).toFixed(6)} | {(userCoords.lng ?? 0).toFixed(6)}</span>
              </div>
            )}
          </div>

        <DriverLiveMap 
          coords={userCoords} 
          vehicles={mapVehicles}
          error={geoError} 
          onRetry={() => {
            setGeoError(null);
            askLocation();
          }}
          onlineUsers={onlineUsers}
          isDriverUser={isDriverUser}
        />
      </div>

    </div>
    </div>

      {previewFoto && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm"
          onClick={() => setPreviewFoto(null)}
        >
          <div className="relative max-w-2xl w-full bg-white rounded-3xl overflow-hidden shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => setPreviewFoto(null)}
              className="absolute top-3 right-3 z-10 bg-black/50 hover:bg-black/70 text-white rounded-full w-8 h-8 flex items-center justify-center transition-all cursor-pointer"
            >
              ✕
            </button>
            <img src={previewFoto} alt="Nota fiscal" className="w-full h-auto max-h-[80vh] object-contain" />
          </div>
        </div>
      )}
    </>
  );
}
