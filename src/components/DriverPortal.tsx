import React, { useState, useEffect, useRef } from 'react';
import { 
  Smartphone, 
  Sparkles, 
  Fuel, 
  Truck, 
  Calendar, 
  MapPin, 
  User, 
  DollarSign, 
  CheckCircle2, 
  Plus, 
  Minus, 
  Activity, 
  Clock, 
  PlusCircle, 
  ArrowUpRight, 
  ShieldCheck,
  Building,
  Navigation
} from 'lucide-react';
import { Vehicle, BotaFora, Lancamento, FuelLog, ComissaoMotorista, Dispatch } from '../types';

// Leaflet Dynamic Map Component
function DriverLiveMap({ 
  coords, 
  error, 
  onRetry 
}: { 
  coords: { lat: number; lng: number } | null; 
  error: string | null;
  onRetry: () => void;
}) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const [isLeafletLoaded, setIsLeafletLoaded] = useState(false);

  // Dynamic script/css loader
  useEffect(() => {
    // Check if Leaflet is already loaded
    if ((window as any).L) {
      setIsLeafletLoaded(true);
      return;
    }

    const cssId = 'leaflet-css';
    if (!document.getElementById(cssId)) {
      const link = document.createElement('link');
      link.id = cssId;
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }

    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.async = true;
    script.onload = () => {
      setIsLeafletLoaded(true);
    };
    document.body.appendChild(script);
  }, []);

  // Initialize and update the map when leaflet is loaded and coordinates change
  useEffect(() => {
    if (!isLeafletLoaded || !mapContainerRef.current) return;
    const L = (window as any).L;
    if (!L) return;

    if (!coords) return;

    const { lat, lng } = coords;

    if (!mapRef.current) {
      // Create map instance
      mapRef.current = L.map(mapContainerRef.current, {
        zoomControl: true,
        attributionControl: false
      }).setView([lat, lng], 15);

      // Add TileLayer (OpenStreetMap tile)
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
      }).addTo(mapRef.current);

      // Add a HTML div icon to avoid standard marker asset search issues within bundlers
      const iconHtml = `
        <div class="relative flex items-center justify-center">
          <div class="absolute inline-flex h-8 w-8 animate-ping rounded-full bg-emerald-400 opacity-75"></div>
          <div class="relative flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 border-2 border-white shadow-lg">
            <div class="h-2 w-2 bg-white rounded-full"></div>
          </div>
        </div>
      `;
      const customIcon = L.divIcon({
        html: iconHtml,
        className: 'custom-driver-icon',
        iconSize: [32, 32],
        iconAnchor: [16, 16]
      });

      markerRef.current = L.marker([lat, lng], { icon: customIcon }).addTo(mapRef.current);
    } else {
      // Map already exists, update center and marker location
      mapRef.current.setView([lat, lng], mapRef.current.getZoom());
      if (markerRef.current) {
        markerRef.current.setLatLng([lat, lng]);
      }
    }
  }, [isLeafletLoaded, coords]);

  // Clean map instance on unmount
  useEffect(() => {
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markerRef.current = null;
      }
    };
  }, []);

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-2xl shadow-inner overflow-hidden h-64 relative">
      {error ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-slate-50">
          <p className="text-xs font-semibold text-slate-500 mb-3 leading-relaxed">
            ⚠️ {error}
          </p>
          <button
            type="button"
            onClick={onRetry}
            className="px-4 py-1.5 bg-emerald-500 text-white font-extrabold text-[10px] uppercase tracking-wider rounded-lg hover:bg-emerald-600 transition-colors shadow-sm cursor-pointer"
          >
            Permitir Acesso à Localização
          </button>
        </div>
      ) : !coords ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-6 bg-slate-50 animate-pulse">
          <Navigation className="w-8 h-8 text-emerald-500 animate-spin mb-3" />
          <p className="text-xs font-bold text-slate-450 uppercase tracking-widest animate-pulse">
            Obtendo coordenadas GNSS em tempo real...
          </p>
        </div>
      ) : (
        <div ref={mapContainerRef} className="w-full h-full z-0" />
      )}
    </div>
  );
}

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
  onAddLancamento: (newLan: Omit<Lancamento, 'id' | 'createdAt'>) => void;
  onAddComissao: (newCom: Omit<ComissaoMotorista, 'id' | 'createdAt'>) => void;
  onUpdateComissao: (updatedCom: ComissaoMotorista) => void;
  onAddFuelLog: (newLog: Omit<FuelLog, 'id' | 'mediaKmL'>) => void;
  onAuthorizeDispatch: (newDisp: Omit<Dispatch, 'id' | 'createdAt'>) => void;
  onShowToast: (title: string, message: string, type: 'success' | 'info' | 'warning') => void;
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
  onAddLancamento,
  onAddComissao,
  onUpdateComissao,
  onAddFuelLog,
  onAuthorizeDispatch,
  onShowToast
}: DriverPortalProps) {
  const isDriverUser = currentUserRole.toLowerCase().includes('motorista') || currentUserRole.toLowerCase().includes('driver') || currentUserEmail === 'motorista@relampago.com';

  const getLinkedDriverName = () => {
    if (currentUserEmail.toLowerCase() === 'motorista@relampago.com') {
      return 'Carlos Santana';
    }
    const savedUsersStr = localStorage.getItem('relampago_system_users');
    if (savedUsersStr) {
      try {
        const savedUsers = JSON.parse(savedUsersStr);
        const matchedUser = savedUsers.find((u: any) => u.email.toLowerCase() === currentUserEmail.toLowerCase());
        if (matchedUser && matchedUser.linkedDriver) {
          return matchedUser.linkedDriver;
        }
      } catch (e) {
        console.error(e);
      }
    }
    return null;
  };

  const linkedDriverName = getLinkedDriverName();

  // Determine active driver name
  const [selectedDriver, setSelectedDriver] = useState<string>(() => {
    if (currentUserEmail === 'motorista@relampago.com') {
      return 'Carlos Santana'; // Default driver linked to this demo account
    }
    const linked = getLinkedDriverName();
    if (linked) {
      return linked;
    }
    return motoristas[0] || 'Carlos Santana';
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
  const [activeForm, setActiveForm] = useState<'buckets' | 'discharges' | 'refueling' | null>('discharges');

  // Today's date string "YYYY-MM-DD"
  const getTodayDateStr = () => {
    return new Date().toISOString().split('T')[0];
  };

  // 1. Buckets placed/removed form state
  const [bucketAction, setBucketAction] = useState<'colocar' | 'retirar'>('colocar');
  const [bucketQty, setBucketQty] = useState(1);
  const [bucketDate, setBucketDate] = useState(getTodayDateStr());

  // 2. Discharge form state
  const [selectedBotaForaId, setSelectedBotaForaId] = useState<string>(botaForas[0]?.id || 'BTF-01');
  const [dischargeQty, setDischargeQty] = useState(1);
  const [dischargeDate, setDischargeDate] = useState(getTodayDateStr());
  const [customDischargePrice, setCustomDischargePrice] = useState<string>('200');

  // Sincroniza o valor padrão do descarte ao alterar o bota-fora selecionado
  useEffect(() => {
    const selected = botaForas.find(b => b.id === selectedBotaForaId);
    if (selected) {
      setCustomDischargePrice(String(selected.valorPadraoDescarte || 200));
    }
  }, [selectedBotaForaId, botaForas]);

  // 3. Refueling form state
  const [fuelStationType, setFuelStationType] = useState<'POSTO' | 'GARAGEM'>('POSTO');
  const [liters, setLiters] = useState<string>('120');
  const [fuelPrice, setFuelPrice] = useState<string>('680'); // total value
  const [currentKm, setCurrentKm] = useState<string>('');

  // Geolocation state
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);

  // Request & Watch location
  const startWatchingLocation = () => {
    if (!navigator.geolocation) {
      setGeoError("Este navegador não suporta a API de Geolocalização.");
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        setUserCoords({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        });
        setGeoError(null);
      },
      (error) => {
        console.warn("Erro ao obter geolocalização:", error);
        switch (error.code) {
          case error.PERMISSION_DENIED:
            setGeoError("Acesso à localização recusado. Ative a permissão de geolocalização em seu navegador para habilitar o rastreamento em tempo real.");
            break;
          case error.POSITION_UNAVAILABLE:
            setGeoError("As informações de localização do dispositivo estão indisponíveis no momento.");
            break;
          case error.TIMEOUT:
            setGeoError("Tempo limite esgotado para obter a localização.");
            break;
          default:
            setGeoError("Ocorreu um erro desconhecido ao obter a geolocalização.");
            break;
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );

    return watchId;
  };

  useEffect(() => {
    const watchId = startWatchingLocation();
    return () => {
      if (watchId !== undefined) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, []);

  // Local actions logger stream (to verify live synchronizations)
  const [localAuditHistory, setLocalAuditHistory] = useState<Array<{
    id: string;
    action: string;
    description: string;
    time: string;
    details: string;
    synchronized: boolean;
    lat?: number;
    lng?: number;
  }>>([
    {
      id: 'AUD-001',
      action: 'Check-in de Sistema',
      description: 'Inicialização do app de motorista com suporte a coordenadas GNSS',
      time: 'Há alguns minutos',
      details: 'Dispositivo móvel conectado em ' + new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      synchronized: true
    }
  ]);

  // Adjust default vehicle on driver change
  useEffect(() => {
    const matched = vehicles.find(v => v.driver === selectedDriver);
    if (matched) {
      setSelectedVehicleId(matched.id);
      if (matched.initialKm) {
        setCurrentKm(String(matched.initialKm + 1200)); // estimate next KM
      }
    }
  }, [selectedDriver, vehicles]);

  // Calculations for Driver's Today statistics
  const todayStr = getTodayDateStr();

  // Buckets logged in commissions for today
  const driverCommissionsToday = comissoes.find(c => c.motorista === selectedDriver && c.data === todayStr);
  const placedTodayCount = driverCommissionsToday?.vaziasColocadas || 0;
  const removedTodayCount = driverCommissionsToday?.retiradas || 0;

  // Discharges logged in lancamentos for today
  const dischargesTodayCount = lancamentos
    .filter(l => l.driverName === selectedDriver && l.data === todayStr)
    .reduce((sum, current) => sum + current.quantidadeCacambas, 0);

  // Liters refueled today
  const fuelTodayLiters = fuelLogs
    .filter(f => f.driver === selectedDriver && f.data === todayStr)
    .reduce((sum, current) => sum + current.quantidadeLitros, 0);

  // Handle Buckets form submission
  const handleBucketsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clientName = 'Obra / Cliente Geral';

    // 1. Get or create current driver commission record for this selected date
    const targetDate = bucketDate;
    const existingCommission = comissoes.find(
      c => c.motorista === selectedDriver && c.data === targetDate
    );

    const isColocar = bucketAction === 'colocar';

    if (existingCommission) {
      // Update existing
      const updatedRecord: ComissaoMotorista = {
        ...existingCommission,
        vaziasColocadas: existingCommission.vaziasColocadas + (isColocar ? bucketQty : 0),
        retiradas: existingCommission.retiradas + (!isColocar ? bucketQty : 0),
        lat: userCoords?.lat || undefined,
        lng: userCoords?.lng || undefined,
      };
      onUpdateComissao(updatedRecord);
    } else {
      // Create new
      const newCommission: Omit<ComissaoMotorista, 'id' | 'createdAt'> = {
        motorista: selectedDriver,
        vaziasColocadas: isColocar ? bucketQty : 0,
        retiradas: !isColocar ? bucketQty : 0,
        data: targetDate,
        lat: userCoords?.lat || undefined,
        lng: userCoords?.lng || undefined,
      };
      onAddComissao(newCommission);
    }

    // 2. Also record a beautiful Completed Dispatch
    const generatedDispatch: Omit<Dispatch, 'id' | 'createdAt'> = {
      vehicleId: selectedVehicleId,
      driverName: selectedDriver,
      clientName: clientName,
      origin: isColocar ? 'Central - Depósito Vazio' : clientName,
      destination: isColocar ? clientName : 'Landfill / Área de Triagem',
      payloadType: isColocar ? 'Caçamba Vazia' : 'Entulhos de Obras',
      weight: isColocar ? 1.5 : 4.5 * bucketQty,
      status: 'Completed'
    };
    onAuthorizeDispatch(generatedDispatch);

    // 3. Log to local audit feed (visual feedback to the driver)
    const newAuditAction = {
      id: `AUD-${Math.floor(1000 + Math.random() * 9000)}`,
      action: isColocar ? '🚚 Colocada Registrada' : '🏗️ Retirada Registrada',
      description: `${bucketQty} caçamba(s) ${isColocar ? 'colocada(s)' : 'retirada(s)'} • ${clientName}`,
      time: 'Agora mesmo',
      details: `Registrado por ${selectedDriver} sob o veículo ${selectedVehicleId}`,
      synchronized: true,
      lat: userCoords?.lat || undefined,
      lng: userCoords?.lng || undefined,
    };
    setLocalAuditHistory(prev => [newAuditAction, ...prev]);

    onShowToast(
      "Ação Sincronizada", 
      `${bucketQty} caçamba(s) ${isColocar ? 'colocada(s)' : 'retirada(s)'} salvas no sistema central.`, 
      "success"
    );

    // Reset inputs
    setBucketQty(1);
  };

  // Handle Discharge (Descarte em bota-fora) submission
  const handleDischargeSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const selectedBotaFora = botaForas.find(b => b.id === selectedBotaForaId);
    if (!selectedBotaFora) {
      onShowToast("Erro", "Bota-Fora inválido selecionado.", "warning");
      return;
    }

    const pricePerBucket = parseFloat(customDischargePrice) || selectedBotaFora.valorPadraoDescarte || 200;
    const totalCost = pricePerBucket * dischargeQty;

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
    });

    // Auditor log
    const newAuditAction = {
      id: `AUD-${Math.floor(1000 + Math.random() * 9000)}`,
      action: '🔋 Descarregada Registrada',
      description: `${dischargeQty} caçambas no "${selectedBotaFora.nome}"`,
      time: 'Agora mesmo',
      details: `Custo total de R$ ${totalCost.toFixed(2)} faturado em faturas automáticas`,
      synchronized: true,
      lat: userCoords?.lat || undefined,
      lng: userCoords?.lng || undefined,
    };
    setLocalAuditHistory(prev => [newAuditAction, ...prev]);

    onShowToast(
      "Descarte Registrado", 
      `Dumping de ${dischargeQty} caçambas gravado no aterro "${selectedBotaFora.nome}" com custo total de R$ ${totalCost.toFixed(2)}.`, 
      "success"
    );

    setDischargeQty(1);
  };

  // Handle Fuel refueling submission
  const handleFuelSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const inputLiters = parseFloat(liters);
    const inputPrice = parseFloat(fuelPrice);
    if (isNaN(inputLiters) || inputLiters <= 0) {
      onShowToast("Valor de Litros Inválido", "Por favor, digite uma quantidade de litros válida.", "warning");
      return;
    }
    if (isNaN(inputPrice) || inputPrice <= 0) {
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
        initialKmValue = finalKmValue - 350; // estimate previous
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
    });

    // Audit trace
    const newAuditAction = {
      id: `AUD-${Math.floor(1000 + Math.random() * 9000)}`,
      action: '⛽ Abastecimento Controlado',
      description: `${inputLiters} Litros de Diesel • ${fuelStationType === 'GARAGEM' ? 'Bomba da Garagem' : 'Posto Externo'}`,
      time: 'Agora mesmo',
      details: `KM final digitado: ${currentKm || 'Não fornecido'} • R$ ${inputPrice.toFixed(2)} pagos`,
      synchronized: true,
      lat: userCoords?.lat || undefined,
      lng: userCoords?.lng || undefined,
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

  return (
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
            <span>Olá, {selectedDriver}!</span>
            <Sparkles className="w-4 h-4 text-emerald-400 fill-emerald-400" />
          </h2>
          <p className="text-[11px] sm:text-xs text-slate-300 leading-normal">
            Utilize este painel móvel simplificado para registrar as suas atividades em tempo real nas ruas de São Paulo.
          </p>
        </div>

        {/* Quick Driver or Vehicle Select to let anyone test seamlessly */}
        <div className="flex flex-row flex-wrap items-center gap-3 bg-slate-950/60 p-3 rounded-xl border border-slate-800 w-full md:w-auto justify-between sm:justify-start">
          {!isDriverUser && (
            <div className="space-y-1 min-w-[120px] flex-1 sm:flex-initial">
              <span className="block text-[8px] font-bold text-slate-500 uppercase font-sans">Simular Motorista</span>
              <select
                value={selectedDriver}
                onChange={(e) => setSelectedDriver(e.target.value)}
                className="bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs text-slate-200 outline-none focus:border-indigo-500 w-full sm:max-w-[150px] font-bold cursor-pointer"
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
        </div>
      </div>

      {/* Grid of counters indicating today's active achievements */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        
        <div className="bg-white border border-slate-200 p-3 sm:p-4 rounded-xl shadow-sm flex flex-col sm:flex-row items-center sm:items-start md:items-center gap-2 sm:gap-4 text-center sm:text-left">
          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600 shrink-0">
            <PlusCircle className="w-5 h-5 sm:w-6 sm:h-6 animate-pulse" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="block text-[9px] sm:text-[10px] uppercase tracking-wider font-bold text-slate-400 truncate">Colocadas</span>
            <strong className="text-base sm:text-xl font-extrabold text-slate-900 block mt-0.5 truncate">{placedTodayCount} cç.</strong>
            <span className="text-[9px] sm:text-[10px] text-slate-450 block mt-0.5 truncate">Hoje ({selectedDriver})</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 p-3 sm:p-4 rounded-xl shadow-sm flex flex-col sm:flex-row items-center sm:items-start md:items-center gap-2 sm:gap-4 text-center sm:text-left">
          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 shrink-0">
            <Truck className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="block text-[9px] sm:text-[10px] uppercase tracking-wider font-bold text-slate-400 truncate">Retiradas</span>
            <strong className="text-base sm:text-xl font-extrabold text-slate-900 block mt-0.5 truncate">{removedTodayCount} cç.</strong>
            <span className="text-[9px] sm:text-[10px] text-slate-450 block mt-0.5 truncate">Hoje ({selectedDriver})</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 p-3 sm:p-4 rounded-xl shadow-sm flex flex-col sm:flex-row items-center sm:items-start md:items-center gap-2 sm:gap-4 text-center sm:text-left">
          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-amber-50 rounded-xl flex items-center justify-center text-amber-600 shrink-0">
            <Building className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="block text-[9px] sm:text-[10px] uppercase tracking-wider font-bold text-slate-400 truncate">Descartes</span>
            <strong className="text-base sm:text-xl font-extrabold text-slate-900 block mt-0.5 truncate">{dischargesTodayCount} cç.</strong>
            <span className="text-[9px] sm:text-[10px] text-emerald-600 font-bold block mt-0.5 truncate">Sincronizados</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 p-3 sm:p-4 rounded-xl shadow-sm flex flex-col sm:flex-row items-center sm:items-start md:items-center gap-2 sm:gap-4 text-center sm:text-left">
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

      {/* Rastreamento de Geolocalização por Satélite */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div className="space-y-1">
            <h3 className="font-sans font-bold text-sm text-slate-800 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-emerald-500 animate-bounce" />
              <span>Rastreamento Operacional GNSS (Tempo Real)</span>
            </h3>
            <p className="text-[11px] text-slate-500 leading-normal">
              Roteamento do condutor monitorado centralmente com coordenadas geodésicas de precisão em tempo real.
            </p>
          </div>
          {userCoords && typeof userCoords.lat === 'number' && typeof userCoords.lng === 'number' && (
            <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-250 px-3 py-1.5 rounded-xl text-[10px] text-emerald-700 font-extrabold font-mono shrink-0">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>LAT: {userCoords.lat.toFixed(6)} | LNG: {userCoords.lng.toFixed(6)}</span>
            </div>
          )}
        </div>

        <DriverLiveMap 
          coords={userCoords} 
          error={geoError} 
          onRetry={() => {
            setGeoError(null);
            startWatchingLocation();
          }} 
        />
      </div>

      {/* Main Layout containing task entry forms and live logs */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Side: Modular and clean Touch actions form */}
        <div className="lg:col-span-7 space-y-4">
          
          <div className="bg-white border border-slate-250 rounded-2xl p-4 sm:p-6 shadow-sm">
            <h3 className="font-sans font-bold text-sm text-slate-800 mb-4 flex items-center gap-2 border-b border-slate-100 pb-3">
              <Activity className="w-4 h-4 text-emerald-600 animate-pulse" />
              <span>Registrar Nova Atividade de Trabalho</span>
            </h3>

            {/* Quick Select Buttons between actions forms */}
            <div className="grid grid-cols-3 gap-1.5 sm:gap-2 mb-6">
              <button
                type="button"
                onClick={() => setActiveForm('discharges')}
                className={`py-2 px-1.5 sm:px-3 rounded-xl border text-[10px] sm:text-[11px] font-black tracking-wide flex flex-col items-center gap-1.5 transition-all text-center cursor-pointer ${
                  activeForm === 'discharges' 
                    ? 'bg-emerald-600 border-emerald-600 text-white shadow shadow-emerald-500/20 shadow-md' 
                    : 'bg-slate-50 border-slate-250 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Building className="w-4 h-4" />
                <span>Descarregar Aterro</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveForm('refueling')}
                className={`py-2 px-1.5 sm:px-3 rounded-xl border text-[10px] sm:text-[11px] font-black tracking-wide flex flex-col items-center gap-1.5 transition-all text-center cursor-pointer ${
                  activeForm === 'refueling' 
                    ? 'bg-emerald-600 border-emerald-600 text-white shadow shadow-emerald-500/20 shadow-md' 
                    : 'bg-slate-50 border-slate-250 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Fuel className="w-4 h-4" />
                <span>Abastecimento</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveForm('buckets')}
                className={`py-2 px-1.5 sm:px-3 rounded-xl border text-[10px] sm:text-[11px] font-black tracking-wide flex flex-col items-center gap-1.5 transition-all text-center cursor-pointer ${
                  activeForm === 'buckets' 
                    ? 'bg-emerald-600 border-emerald-600 text-white shadow shadow-emerald-500/20 shadow-md' 
                    : 'bg-slate-50 border-slate-250 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Truck className="w-4 h-4" />
                <span>Coloca / Retira</span>
              </button>
            </div>

            {/* Render form 1: Buckets Colocar/Retirar */}
            {activeForm === 'buckets' && (
              <form onSubmit={handleBucketsSubmit} className="space-y-4 animate-in fade-in duration-200">
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider">Tipo da Operação</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setBucketAction('colocar')}
                      className={`py-3 px-4 rounded-xl border text-xs font-black transition-all text-center flex items-center justify-center gap-2 cursor-pointer ${
                        bucketAction === 'colocar'
                          ? 'bg-emerald-600 border-emerald-700 text-white shadow-lg ring-4 ring-emerald-300 scale-[1.02]'
                          : 'bg-slate-50 border-slate-200 text-slate-450 opacity-70 hover:bg-slate-100 hover:opacity-100'
                      }`}
                    >
                      <span>🚚 Colocar Caçamba (Vazia)</span>
                      {bucketAction === 'colocar' && <span className="bg-white/20 px-1.5 py-0.5 text-[9px] rounded-md font-bold">✓ ATIVO</span>}
                    </button>
                    <button
                      type="button"
                      onClick={() => setBucketAction('retirar')}
                      className={`py-3 px-4 rounded-xl border text-xs font-black transition-all text-center flex items-center justify-center gap-2 cursor-pointer ${
                        bucketAction === 'retirar'
                          ? 'bg-indigo-600 border-indigo-700 text-white shadow-lg ring-4 ring-indigo-300 scale-[1.02]'
                          : 'bg-slate-50 border-slate-200 text-slate-450 opacity-70 hover:bg-slate-100 hover:opacity-100'
                      }`}
                    >
                      <span>🏗️ Retirar Caçamba (Cheia)</span>
                      {bucketAction === 'retirar' && <span className="bg-white/20 px-1.5 py-0.5 text-[9px] rounded-md font-bold">✓ ATIVO</span>}
                    </button>
                  </div>
                </div>

                {/* Banner de Confirmação Ativa de Modo */}
                <div className={`p-4 rounded-xl border text-xs flex items-center gap-3 transition-all duration-200 ${
                  bucketAction === 'colocar'
                    ? 'bg-emerald-50 border-emerald-250 text-emerald-800'
                    : 'bg-indigo-50 border-indigo-250 text-indigo-800'
                }`}>
                  <span className="text-2xl animate-pulse">
                    {bucketAction === 'colocar' ? '🚚' : '🏗️'}
                  </span>
                  <div>
                    <strong className="block text-[10px] font-black uppercase tracking-wider">
                      Modo Selecionado: {bucketAction === 'colocar' ? 'LOGÍSTICA DE ENVIO' : 'LOGÍSTICA DE RECOLHIMENTO'}
                    </strong>
                    <p className="mt-1 leading-relaxed text-[11px] font-semibold">
                      {bucketAction === 'colocar'
                        ? 'Você confirmou a ação de DESCER uma caçamba vazia no endereço de entrega. Isso incrementará seu saldo de comissões.'
                        : 'Você confirmou a ação de RETIRAR e recolher uma caçamba com entulho para descarte.'}
                    </p>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider">Quantidade de Caçambas</label>
                  <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-xl max-w-[160px] p-1 justify-between">
                    <button
                      type="button"
                      onClick={() => setBucketQty(prev => Math.max(1, prev - 1))}
                      className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-slate-600 border border-slate-200 cursor-pointer shadow-sm hover:bg-slate-50 active:scale-95"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="text-sm font-extrabold text-slate-850 font-sans">{bucketQty}</span>
                    <button
                      type="button"
                      onClick={() => setBucketQty(prev => prev + 1)}
                      className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-slate-600 border border-slate-200 cursor-pointer shadow-sm hover:bg-slate-50 active:scale-95"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider">Data do Serviço</label>
                  <div className="relative">
                    <span className="absolute left-3 top-3 text-slate-400">
                      <Calendar className="w-4 h-4" />
                    </span>
                    <input
                      type="date"
                      value={bucketDate}
                      onChange={(e) => setBucketDate(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500/50"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-555 text-white py-3 rounded-xl text-xs font-black tracking-wide flex items-center justify-center gap-2 transition-all shadow-md shadow-emerald-505/20 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Sincronizar Atividade &amp; Gravar Comissão</span>
                </button>
              </form>
            )}

            {/* Render form 2: Discharges (Descarte bota-fora) */}
            {activeForm === 'discharges' && (
              <form onSubmit={handleDischargeSubmit} className="space-y-4 animate-in fade-in duration-200">
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider">Ponto de Descarte (Bota-Fora)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-3 text-slate-400">
                      <MapPin className="w-4 h-4" />
                    </span>
                    <select
                      value={selectedBotaForaId}
                      onChange={(e) => setSelectedBotaForaId(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-semibold outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 cursor-pointer"
                    >
                      {botaForas.map(b => (
                        <option key={b.id} value={b.id}>
                          {b.nome} {b.valorPadraoDescarte ? `(R$ ${b.valorPadraoDescarte}/cç)` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider">Quantidade Descarregada</label>
                  <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-xl max-w-[160px] p-1 justify-between">
                    <button
                      type="button"
                      onClick={() => setDischargeQty(prev => Math.max(1, prev - 1))}
                      className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-slate-600 border border-slate-200 cursor-pointer shadow-sm hover:bg-slate-50"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="text-sm font-extrabold text-slate-850">{dischargeQty}</span>
                    <button
                      type="button"
                      onClick={() => setDischargeQty(prev => prev + 1)}
                      className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-slate-600 border border-slate-200 cursor-pointer shadow-sm hover:bg-slate-50"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider">Valor Cobrado / Custo por Caçamba (R$)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-slate-450 font-bold text-xs">
                      R$
                    </span>
                    <input
                      type="number"
                      value={customDischargePrice}
                      onChange={(e) => setCustomDischargePrice(e.target.value)}
                      placeholder="Ex: 200"
                      className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 font-semibold"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider">Data da Descarga</label>
                  <div className="relative">
                    <span className="absolute left-3 top-3 text-slate-400">
                      <Calendar className="w-4 h-4" />
                    </span>
                    <input
                      type="date"
                      value={dischargeDate}
                      onChange={(e) => setDischargeDate(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500/50"
                    />
                  </div>
                </div>

                {/* Live cost estimator to let drivers know */}
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex justify-between items-center text-xs">
                  <span className="text-slate-505 font-medium">Estimativa do Faturamento de Descarte:</span>
                  <strong className="text-slate-850 font-extrabold text-sm text-emerald-600 font-mono">
                    R$ {((parseFloat(customDischargePrice) || 0) * dischargeQty).toFixed(2)}
                  </strong>
                </div>

                <button
                  type="submit"
                  className="w-full bg-gradient-to-r from-emerald-505 to-teal-600 hover:from-emerald-450 hover:to-teal-555 text-white py-3 rounded-xl text-xs font-black tracking-wide flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer"
                >
                  <Building className="w-4 h-4 text-white" />
                  <span>Confirmar Descarga &amp; Gerar Fatura PENDING</span>
                </button>
              </form>
            )}

            {/* Render form 3: Refueling (Abastecimento) */}
            {activeForm === 'refueling' && (
              <form onSubmit={handleFuelSubmit} className="space-y-4 animate-in fade-in duration-200">
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider">Origem do Diesel</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setFuelStationType('POSTO');
                        setFuelPrice('680');
                      }}
                      className={`py-2 px-3 rounded-lg border text-xs font-bold transition-all text-center cursor-pointer ${
                        fuelStationType === 'POSTO'
                          ? 'bg-emerald-50 border-emerald-500 text-emerald-700 font-extrabold'
                          : 'bg-white border-slate-200 text-slate-500'
                      }`}
                    >
                      ⛽ Posto Licenciado (Externo)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setFuelStationType('GARAGEM');
                        setFuelPrice('0'); // internal free garage inventory tracking
                      }}
                      className={`py-2 px-3 rounded-lg border text-xs font-bold transition-all text-center cursor-pointer ${
                        fuelStationType === 'GARAGEM'
                          ? 'bg-amber-50 border-amber-500 text-amber-700 font-extrabold'
                          : 'bg-white border-slate-200 text-slate-500'
                      }`}
                    >
                      🏢 Bomba da Garagem (Interno)
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider">Quantidade (Litros)</label>
                    <div className="relative">
                      <span className="absolute left-3 top-3 text-xs text-slate-400 font-bold">L</span>
                      <input
                        type="number"
                        required
                        value={liters}
                        onChange={(e) => setLiters(e.target.value)}
                        placeholder="Ex: 150"
                        className="w-full pl-8 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 outline-none font-bold"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider">Preço / Valor Pago (R$)</label>
                    <div className="relative">
                      <span className="absolute left-3 top-3 text-xs text-slate-400 font-bold">R$</span>
                      <input
                        type="number"
                        required
                        disabled={fuelStationType === 'GARAGEM'}
                        value={fuelStationType === 'GARAGEM' ? '0' : fuelPrice}
                        onChange={(e) => setFuelPrice(e.target.value)}
                        placeholder="Ex: 850"
                        className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-250 border-slate-200 rounded-xl text-xs text-slate-800 outline-none font-bold disabled:opacity-55"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider">Odômetro do Veículo (KM Atual)</label>
                    <span className="text-[9px] text-slate-450 font-mono">Último KM registrado: {activeVehicle?.initialKm || 120500} KM</span>
                  </div>
                  <div className="relative">
                    <span className="absolute left-3 top-3 text-slate-400">
                      <Navigation className="w-4 h-4" />
                    </span>
                    <input
                      type="number"
                      value={currentKm}
                      onChange={(e) => setCurrentKm(e.target.value)}
                      placeholder={activeVehicle ? String(activeVehicle.initialKm ? activeVehicle.initialKm + 150 : 120650) : "Ex: 120680"}
                      className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 outline-none font-bold font-mono tracking-wide"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-450 hover:to-teal-555 text-white py-3 rounded-xl text-xs font-black tracking-wide flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer"
                >
                  <Fuel className="w-4 h-4 text-white" />
                  <span>Gravar Abastecimento &amp; Subtrair Estoque</span>
                </button>
              </form>
            )}

          </div>

          {/* Guidelines info card for dispatch safety */}
          <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl flex items-start gap-3.5">
            <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div className="text-[11px] text-emerald-800 space-y-1 leading-relaxed">
              <strong className="block font-black text-emerald-900 uppercase tracking-wide">💡 DICA OPERACIONAL DE SINCRONISMO:</strong>
              <p>
                Este aplicativo de motorista possui <strong>sincronismo transparente bidirecional</strong>. Ao registrar qualquer caçamba ou abastecimento, as tabelas SQL correspondentes no banco central são alimentadas na hora, recalculando os lucros da empresa, as médias de consumo por KM/L de frota e abrindo as faturas para auditoria do Diretor imediatamente!
              </p>
            </div>
          </div>

        </div>

        {/* Right Side: Log of transactions already registered today */}
        <div className="lg:col-span-5 space-y-4">
          
          <div className="bg-white border border-slate-250 rounded-2xl p-6 shadow-sm flex flex-col h-full min-h-[480px]">
            
            <div className="flex justify-between items-center border-b border-slate-100 pb-3 mb-4">
              <h3 className="font-sans font-bold text-sm text-slate-800 flex items-center gap-2">
                <Clock className="w-4 h-4 text-emerald-600" />
                <span>Atividades de Rua Hoje</span>
              </h3>
              <span className="text-[9px] bg-emerald-100 text-emerald-800 font-extrabold px-2 py-0.5 rounded-full uppercase">
                {localAuditHistory.length} registros
              </span>
            </div>

            {/* Audit List of actions typed by the driver */}
            <div className="space-y-3 flex-1 overflow-y-auto max-h-[420px] scrollbar-thin pr-1">
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
                    <span className="text-[9px] text-slate-450 font-mono bg-slate-100 px-1 py-0.5 rounded">{item.time}</span>
                  </div>
                  <p className="text-slate-600 font-medium mb-1.5 leading-relaxed">{item.description}</p>
                  
                  {typeof item.lat === 'number' && typeof item.lng === 'number' && (
                    <div className="mt-1.5 mb-2 text-[10px] bg-slate-50 border border-slate-150 rounded-lg p-2 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1 text-slate-500 font-semibold font-mono">
                        <MapPin className="w-3.5 h-3.5 text-emerald-500 animate-pulse" />
                        <span>GPS: {item.lat.toFixed(6)}, {item.lng.toFixed(6)}</span>
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

            {/* Footer with telemetry indicator */}
            <div className="pt-4 border-t border-slate-100 mt-4 text-center text-[10px] text-slate-400 font-sans flex items-center justify-center gap-1.5">
              <Navigation className="w-3.5 h-3.5 text-slate-400" />
              <span>IP de rede homologada e rastreável: 10.32.22.4</span>
            </div>

          </div>

        </div>

      </div>

    </div>
  );
}
