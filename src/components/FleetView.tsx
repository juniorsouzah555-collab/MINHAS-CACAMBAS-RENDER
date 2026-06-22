/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import { 
  Truck, 
  Car, 
  MapPin, 
  Fuel, 
  TrendingUp, 
  AlertTriangle, 
  RefreshCw, 
  Plus, 
  Activity, 
  FileText,
  User,
  Gauge,
  PlusCircle,
  Clock,
  Wrench,
  X,
  Search,
  CheckCircle2,
  Calendar,
  Layers,
  Pencil,
  RotateCcw,
  Tag,
  Coins,
  Trash2,
  Save,
  Edit3,
  Image as ImageIcon
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell
} from 'recharts';
import { Vehicle, FuelLog, MaintenanceAlert, GarageRefill } from '../types';

interface FleetViewProps {
  vehicles: Vehicle[];
  fuelLogs: FuelLog[];
  alerts: MaintenanceAlert[];
  fuelTrendData: any[];
  costStructureData: any[];
  searchTerm: string;
  currentUserRole?: string;
  onStopDispatchVehicle: (vehicleId: string, alertId: string) => void;
  onLogMaintenanceTicket: (id: string, description: string, estimatedCost: number) => void;
  onRefreshData: () => void;
  onAddVehicle: (vehicle: Omit<Vehicle, 'status' | 'efficiency' | 'fuelUsed' | 'costPerKm' | 'trend' | 'isActive' | 'lat' | 'lng' | 'speed'>) => void;
  onUpdateVehicle: (vehicle: Vehicle) => void;
  onAddFuelLog: (log: Omit<FuelLog, 'id' | 'mediaKmL'>) => void;
  onDeleteFuelLog?: (id: string) => void;
  onEditFuelLog?: (log: FuelLog) => void;
  motoristas: string[];
  garageDieselQty: number;
  garageDieselPrice: number;
  onUpdateGarageDiesel: (qty: number, price: number) => void;
  garageRefills: GarageRefill[];
  onAddGarageRefill: (refill: Omit<GarageRefill, 'id' | 'created_at'>) => void;
  onDeleteGarageRefill?: (id: string) => void;
  onEditGarageRefill?: (id: string, refill: Omit<GarageRefill, 'id' | 'created_at'>) => void;
}

export default function FleetView({
  vehicles,
  fuelLogs,
  alerts,
  fuelTrendData,
  costStructureData,
  searchTerm,
  currentUserRole,
  onStopDispatchVehicle,
  onLogMaintenanceTicket,
  onRefreshData,
  onAddVehicle,
  onUpdateVehicle,
  onAddFuelLog,
  onDeleteFuelLog,
  onEditFuelLog,
  motoristas,
  garageDieselQty,
  garageDieselPrice,
  onUpdateGarageDiesel,
  garageRefills,
  onAddGarageRefill,
  onDeleteGarageRefill,
  onEditGarageRefill
}: FleetViewProps) {
  // Navigation tabs: overview, refuels, register
  const [activeSubTab, setActiveSubTab] = useState<'overview' | 'refuels' | 'register'>('overview');

  // Sub-tab 1: Metric Date & Search Query Filters (Visão Geral & Desempenho)
  const [metricPeriod, setMetricPeriod] = useState<'monthly' | '30' | '7' | 'all'>('monthly');
  const [metricType, setMetricType] = useState<'all' | 'Caminhão' | 'Veículo'>('all');
  const [metricQuery, setMetricQuery] = useState('');

  // Sub-tab 2: Fuel Entry form fields
  const [fuelVehicleId, setFuelVehicleId] = useState('');
  const [fuelKmInicial, setFuelKmInicial] = useState<number | ''>('');
  const [fuelKmFinal, setFuelKmFinal] = useState<number | ''>('');
  const [fuelLitres, setFuelLitres] = useState<number | ''>('');
  const [fuelPricePerLitreUnitString, setFuelPricePerLitreUnitString] = useState<string>('');
  const [fuelDate, setFuelDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [fuelSource, setFuelSource] = useState<'POSTO' | 'GARAGEM'>('POSTO');
  const [isRetiradaDiversa, setIsRetiradaDiversa] = useState(false);

  // Garage refill form
  const [garageRefillLitros, setGarageRefillLitros] = useState<number | ''>('');
  const [garageRefillValor, setGarageRefillValor] = useState<number | ''>('');
  const [garageRefillPrecoLitro, setGarageRefillPrecoLitro] = useState<number | ''>('');
  const [garageRefillData, setGarageRefillData] = useState(() => new Date().toISOString().split('T')[0]);
  const [showGarageRefillForm, setShowGarageRefillForm] = useState(false);
  const [editingGarageRefillId, setEditingGarageRefillId] = useState<string | null>(null);

  // Search and date filters for Fuel logs extratos
  const [fuelSearchQuery, setFuelSearchQuery] = useState('');
  const [fuelFilterStartDate, setFuelFilterStartDate] = useState('');
  const [fuelFilterEndDate, setFuelFilterEndDate] = useState('');

  // Settle filtered Fuel Logs list
  const filteredFuelLogs = useMemo(() => {
    return fuelLogs
      .filter(log => {
        const q = fuelSearchQuery.toLowerCase().trim();
        const matchSearch = !q ||
          log.vehicleId.toLowerCase().includes(q) ||
          (log.driver && log.driver.toLowerCase().includes(q));

        let matchDate = true;
        if (fuelFilterStartDate && fuelFilterEndDate) {
          matchDate = log.data >= fuelFilterStartDate && log.data <= fuelFilterEndDate;
        } else if (fuelFilterStartDate) {
          matchDate = log.data >= fuelFilterStartDate;
        } else if (fuelFilterEndDate) {
          matchDate = log.data <= fuelFilterEndDate;
        }

        return matchSearch && matchDate;
      })
      // Mais recentes primeiro: ids novos são gerados com Date.now() (AB-<epoch>),
      // então ordenar por id decrescente equivale a ordenar por criação decrescente.
      .sort((a, b) => (a.id < b.id ? 1 : a.id > b.id ? -1 : 0));
  }, [fuelLogs, fuelSearchQuery, fuelFilterStartDate, fuelFilterEndDate]);

  // Sub-tab 3: Register/Edit Vehicle Form fields
  const [editingVehicleId, setEditingVehicleId] = useState<string | null>(null);
  const [newVehicleId, setNewVehicleId] = useState('');
  const [newVehicleDriver, setNewVehicleDriver] = useState('');
  const [newVehicleType, setNewVehicleType] = useState<'Caminhão' | 'Veículo'>('Caminhão');
  const [newVehicleInitialKm, setNewVehicleInitialKm] = useState<number | ''>('');

  const isAdmin = !currentUserRole?.toLowerCase().includes('motorista') && currentUserRole !== 'motorista@relampago.com';

  // Edit Fuel Log Modal
  const [editingFuelLog, setEditingFuelLog] = useState<FuelLog | null>(null);
  const [editFuelVehicleId, setEditFuelVehicleId] = useState('');
  const [editFuelLitres, setEditFuelLitres] = useState<number | ''>('');
  const [editFuelKmInicial, setEditFuelKmInicial] = useState<number | ''>('');
  const [editFuelKmFinal, setEditFuelKmFinal] = useState<number | ''>('');
  const [editFuelValorPago, setEditFuelValorPago] = useState<number | ''>('');
  const [editFuelData, setEditFuelData] = useState('');
  const [editFuelDriver, setEditFuelDriver] = useState('');
  const [editFuelTipo, setEditFuelTipo] = useState<'POSTO' | 'GARAGEM'>('POSTO');
  const [editFuelObservacao, setEditFuelObservacao] = useState('');

  // Photo lightbox preview for fuel log receipts
  const [previewFotoNota, setPreviewFotoNota] = useState<string | null>(null);

  // Maintenance Logging Modal
  const [maintenanceVehicleId, setMaintenanceVehicleId] = useState<string | null>(null);
  const [maintenanceDesc, setMaintenanceDesc] = useState('');
  const [maintenanceCost, setMaintenanceCost] = useState<number | ''>('');

  // Auto-populate intermediate fuelKmInicial based on log selection
  const handleFuelVehicleChange = (vId: string) => {
    setFuelVehicleId(vId);
    if (!vId) {
      setFuelKmInicial('');
      return;
    }
    // Pull last fuel KmFinal for this vehicle, or default to vehicle's initialKm
    const matchLogs = fuelLogs
      .filter(l => l.vehicleId === vId)
      .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());
    
    if (matchLogs.length > 0) {
      setFuelKmInicial(matchLogs[0].kmFinal);
    } else {
      const v = vehicles.find(x => x.id === vId);
      setFuelKmInicial(v?.initialKm || 0);
    }
  };

  // Fuel form submit handler
  const handleRefuelSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!fuelVehicleId || !fuelLitres || !fuelDate) {
      alert("Por favor, preencha todos os campos obrigatórios do formulário.");
      return;
    }

    const valueInputParsed = parseFloat(fuelPricePerLitreUnitString.replace(/\./g, '').replace(',', '.')) || 0;

    let kmInicial: number | undefined = undefined;
    let kmFinal: number | undefined = undefined;
    let valorPago = 0;

    if (isRetiradaDiversa) {
      if (valueInputParsed <= 0) {
        alert("Por favor, preencha o valor da retirada.");
        return;
      }
      valorPago = valueInputParsed;
    } else {
      const parsedPricePerLitre = fuelSource === 'GARAGEM' 
        ? garageDieselPrice 
        : valueInputParsed;
        
      if (parsedPricePerLitre <= 0) {
        alert("Por favor, informe o valor por litro do combustível.");
        return;
      }

      if (fuelKmInicial === null || fuelKmInicial === '' || !fuelKmFinal) {
        alert("Por favor, informe o KM Inicial e o KM Final do veículo.");
        return;
      }

      if (Number(fuelKmFinal) <= Number(fuelKmInicial)) {
        alert("O KM Final deve ser estritamente maior do que o KM Inicial cadastrado!");
        return;
      }

      kmInicial = Number(fuelKmInicial);
      kmFinal = Number(fuelKmFinal);
      valorPago = parsedPricePerLitre * Number(fuelLitres);
    }

    onAddFuelLog({
      vehicleId: fuelVehicleId,
      driver: vehicles.find(v => v.id === fuelVehicleId)?.driver || 'Desconhecido',
      data: fuelDate,
      quantidadeLitros: Number(fuelLitres),
      kmInicial,
      kmFinal,
      valorPago,
      tipo: fuelSource,
      isRetiradaDiversa
    });

    // Reset fields
    setFuelVehicleId('');
    setFuelKmInicial('');
    setFuelKmFinal('');
    setFuelLitres('');
    setFuelPricePerLitreUnitString('');
    setFuelSource('POSTO');
    setIsRetiradaDiversa(false);
  };

  // Vehicle Create or Update Submit Handler
  const handleRegVehicleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVehicleId.trim() || !newVehicleDriver.trim() || newVehicleInitialKm === '') {
      alert("Por favor, preencha todos os campos obrigatórios (*).");
      return;
    }

    const uppercaseId = newVehicleId.trim().toUpperCase();

    if (editingVehicleId) {
      // Find current state attributes to preserve
      const existing = vehicles.find(v => v.id === editingVehicleId);
      onUpdateVehicle({
        id: editingVehicleId, // keep editing key
        driver: newVehicleDriver.trim(),
        type: newVehicleType,
        initialKm: Number(newVehicleInitialKm),
        status: existing?.status || 'Available',
        efficiency: existing?.efficiency || 0,
        fuelUsed: existing?.fuelUsed || 0,
        costPerKm: existing?.costPerKm || 1.10,
        trend: existing?.trend || [0],
        speed: existing?.speed || 0,
        lat: existing?.lat || 110,
        lng: existing?.lng || 300,
        isActive: existing?.isActive ?? true
      });
      setEditingVehicleId(null);
    } else {
      // Add flow
      // Check collision
      const isDuplicated = vehicles.some(v => v.id.toUpperCase() === uppercaseId);
      if (isDuplicated) {
        alert("Já existe um veículo cadastrado com esta placa ou prefixo!");
        return;
      }
      onAddVehicle({
        id: uppercaseId,
        driver: newVehicleDriver.trim(),
        type: newVehicleType,
        initialKm: Number(newVehicleInitialKm)
      });
    }

    // Reset Form fields
    setNewVehicleId('');
    setNewVehicleDriver('');
    setNewVehicleType('Caminhão');
    setNewVehicleInitialKm('');
  };

  // Launch edit of vehicle from list
  const startEditingVehicle = (v: Vehicle) => {
    setEditingVehicleId(v.id);
    setNewVehicleId(v.id);
    setNewVehicleDriver(v.driver);
    setNewVehicleType(v.type);
    setNewVehicleInitialKm(v.initialKm || 0);
  };

  // Cancel edit mode
  const cancelEditingVehicle = () => {
    setEditingVehicleId(null);
    setNewVehicleId('');
    setNewVehicleDriver('');
    setNewVehicleType('Caminhão');
    setNewVehicleInitialKm('');
  };

  // Maintenance submit handler
  const handleMaintenanceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!maintenanceVehicleId || !maintenanceDesc.trim() || !maintenanceCost) return;
    onLogMaintenanceTicket(maintenanceVehicleId, maintenanceDesc.trim(), Number(maintenanceCost));
    setMaintenanceVehicleId(null);
    setMaintenanceDesc('');
    setMaintenanceCost('');
  };

  // DYNAMIC FILTERING LOGIC (METRIC PERIODS & SEARCH QUERIES)
  const filteredVehiclesForMetrics = useMemo(() => {
    return vehicles.filter(v => {
      const matchType = metricType === 'all' || v.type === metricType;
      
      const query = metricQuery.trim().toLowerCase();
      const matchSearch = !query || 
        v.id.toLowerCase().includes(query) || 
        v.driver.toLowerCase().includes(query);

      return matchType && matchSearch;
    });
  }, [vehicles, metricType, metricQuery]);

  const filteredLogsForMetrics = useMemo(() => {
    return fuelLogs.filter(log => {
      // Must belong to a currently filtered vehicle
      const isCarMatch = filteredVehiclesForMetrics.some(v => v.id === log.vehicleId);
      if (!isCarMatch) return false;

      // Period filters
      if (metricPeriod === 'all') return true;

      const logDate = new Date(log.data);
      const today = new Date('2026-06-16'); // Hard reference date matching system logs
      const diffTime = Math.abs(today.getTime() - logDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (metricPeriod === '7') {
        return diffDays <= 7;
      }
      if (metricPeriod === '30') {
        return diffDays <= 30;
      }
      if (metricPeriod === 'monthly') {
        // Mês atual: Junho de 2026 (index 5)
        return logDate.getFullYear() === 2026 && logDate.getMonth() === 5;
      }
      return true;
    });
  }, [fuelLogs, filteredVehiclesForMetrics, metricPeriod]);

  // DERIVED METRICS ACCORDING TO FILTERED SELECTIONS
  // 1. Volumes of fuel used (L)
  const metricVolumeLitres = useMemo(() => {
    return filteredLogsForMetrics.reduce((acc, curr) => acc + curr.quantidadeLitros, 0);
  }, [filteredLogsForMetrics]);

  // 2. SALDO ACUMULADO EM REAIS DO COMBUSTIVEL
  const metricTotalFuelCost = useMemo(() => {
    return filteredLogsForMetrics.reduce((acc, curr) => acc + curr.valorPago, 0);
  }, [filteredLogsForMetrics]);

  // 3. Average Km/L efficiency
  const metricAverageEfficiency = useMemo(() => {
    if (filteredLogsForMetrics.length > 0) {
      const totalKm = filteredLogsForMetrics.reduce((acc, curr) => acc + ((curr.kmFinal || 0) - (curr.kmInicial || 0)), 0);
      const totalL = filteredLogsForMetrics.reduce((acc, curr) => acc + (curr.quantidadeLitros || 0), 0);
      if (totalL > 0) {
        return parseFloat(((totalKm / totalL) || 0).toFixed(2));
      }
    }
    // Fallback to active vehicle listed efficiency
    const activeVehicles = filteredVehiclesForMetrics.filter(v => v.status !== 'Maintenance');
    if (activeVehicles.length === 0) return 0;
    const sum = activeVehicles.reduce((acc, v) => acc + (v.efficiency || 0), 0);
    const avg = sum / activeVehicles.length;
    return parseFloat((avg ?? 0).toFixed(1));
  }, [filteredVehiclesForMetrics, filteredLogsForMetrics]);

  // 4. Operating cost (Custo Op) in BRL (R$/Km)
  const metricAverageOperatingCost = useMemo(() => {
    if (filteredVehiclesForMetrics.length === 0) return 0;
    const sum = filteredVehiclesForMetrics.reduce((acc, v) => acc + (v.costPerKm || 0), 0);
    const avg = sum / filteredVehiclesForMetrics.length;
    return parseFloat((avg ?? 0).toFixed(2));
  }, [filteredVehiclesForMetrics]);

  // 5. Active alerts
  const metricActiveAlerts = useMemo(() => {
    return alerts.filter(a => !a.resolved && filteredVehiclesForMetrics.some(fv => fv.id === a.vehicleId)).length;
  }, [alerts, filteredVehiclesForMetrics]);

  // Dynamic filter label info string
  const getFilterDescriptionLabel = () => {
    const pLabel = {
      monthly: 'Mês Atual (Junho 2026)',
      '30': 'Últimos 30 dias',
      '7': 'Últimos 7 dias',
      all: 'Histograma Total (Todo o histórico)'
    }[metricPeriod];

    const tLabel = {
      all: 'Frota Inteira',
      'Caminhão': 'Somente Caminhões',
      'Veículo': 'Apenas Veículos Apoio'
    }[metricType];

    return `${tLabel} • Período: ${pLabel}${metricQuery ? ` • Busca: "${metricQuery}"` : ''}`;
  };

  return (
    <div className="space-y-6">
      
      {/* Tab bar header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center text-purple-600 shadow-sm shadow-purple-500/10">
            <Truck className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-sans font-black text-slate-800 text-base leading-none">Gestão de Frota e Abastecimentos</h2>
            <p className="text-slate-400 text-xs mt-1">Status operacional dos motoristas, consumo de combustível e alertas</p>
          </div>
        </div>

        {/* Tab Toggle - Premium, Intuitive, and Beautifully Stylized Design */}
        <div className="flex flex-col sm:flex-row bg-slate-50 p-1.5 rounded-2xl border border-slate-200/80 gap-2 self-stretch sm:self-auto shadow-sm">
          <button
            id="tab-overview"
            onClick={() => setActiveSubTab('overview')}
            className={`flex items-center justify-between sm:justify-start gap-3 px-5 py-2.5 rounded-xl text-xs font-black transition-all duration-300 cursor-pointer ${
              activeSubTab === 'overview'
                ? 'bg-gradient-to-r from-purple-700 via-indigo-750 to-indigo-800 text-white shadow-lg shadow-purple-650/20 scale-[1.02] border-none'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-150/80'
            }`}
          >
            <div className="flex items-center gap-2">
              <Activity className={`w-4 h-4 ${activeSubTab === 'overview' ? 'text-white animate-pulse' : 'text-slate-500'}`} />
              <span>Visão Geral & Desempenho</span>
            </div>
            <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full ${
              activeSubTab === 'overview' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-500'
            }`}>
              Feed
            </span>
          </button>

          <button
            id="tab-refuels"
            onClick={() => setActiveSubTab('refuels')}
            className={`flex items-center justify-between sm:justify-start gap-3 px-5 py-2.5 rounded-xl text-xs font-black transition-all duration-300 cursor-pointer ${
              activeSubTab === 'refuels'
                ? 'bg-gradient-to-r from-purple-700 via-indigo-750 to-indigo-800 text-white shadow-lg shadow-purple-650/20 scale-[1.02] border-none'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-150/80'
            }`}
          >
            <div className="flex items-center gap-2">
              <Fuel className={`w-4 h-4 ${activeSubTab === 'refuels' ? 'text-white' : 'text-slate-500'}`} />
              <span>Abastecimentos</span>
            </div>
            <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${
              activeSubTab === 'refuels' ? 'bg-white/20 text-white font-extrabold' : 'bg-slate-200 text-slate-500'
            }`}>
              {fuelLogs.length}
            </span>
          </button>

          <button
            id="tab-register"
            onClick={() => setActiveSubTab('register')}
            className={`flex items-center justify-between sm:justify-start gap-3 px-5 py-2.5 rounded-xl text-xs font-black transition-all duration-300 cursor-pointer ${
              activeSubTab === 'register'
                ? 'bg-gradient-to-r from-purple-700 via-indigo-750 to-indigo-800 text-white shadow-lg shadow-purple-650/20 scale-[1.02] border-none'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-150/80'
            }`}
          >
            <div className="flex items-center gap-2">
              <PlusCircle className={`w-4 h-4 ${activeSubTab === 'register' ? 'text-white' : 'text-slate-500'}`} />
              <span>Veículos e Cadastro</span>
            </div>
            <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${
              activeSubTab === 'register' ? 'bg-white/20 text-white font-extrabold' : 'bg-slate-200 text-slate-500'
            }`}>
              {vehicles.length}
            </span>
          </button>
        </div>
      </div>

      {/* Sub-Tab 1: Overview & Performance (Visão Geral & Desempenho) */}
      {activeSubTab === 'overview' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          
          {/* SEARCH & RUNTIME FILTER BLOCK */}
          <div className="bg-slate-900 text-white rounded-2xl p-5 border border-slate-800 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/5 rounded-full blur-3xl pointer-events-none"></div>
            
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-white/10 pb-4 mb-4">
              <div>
                <h3 className="font-sans font-black text-sm uppercase tracking-wider text-purple-400">Controles e Filtros de Pesquisa de Desempenho</h3>
                <p className="text-slate-400 text-xs mt-0.5 font-medium">Ajuste períodos de medição e termos filtrados da frota</p>
              </div>
              <button 
                onClick={() => {
                  setMetricPeriod('monthly');
                  setMetricType('all');
                  setMetricQuery('');
                  onRefreshData();
                }}
                className="text-[11px] bg-slate-800 hover:bg-slate-755 text-white border border-slate-700 font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 cursor-pointer"
                title="Resetar todos os filtros para obter a visão canônica padrão"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Resetar Filtros</span>
              </button>
            </div>

            {/* Form grid controls */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Period Select Selector */}
              <div className="space-y-1">
                <label className="block text-[10px] font-black uppercase text-purple-300 tracking-wider flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Selecione o Ciclo / Período</span>
                </label>
                <select
                  value={metricPeriod}
                  onChange={(e) => setMetricPeriod(e.target.value as any)}
                  className="w-full bg-slate-800/80 border border-slate-700/80 rounded-lg text-xs font-semibold focus:outline-none focus:border-purple-500 text-slate-100 py-2.5 px-3"
                >
                  <option value="monthly">Junho 2026 (Mês Atual)</option>
                  <option value="7">Últimos 7 dias</option>
                  <option value="30">Últimos 30 dias</option>
                  <option value="all">Filtro Total (Histórico Completo)</option>
                </select>
              </div>

              {/* Vehicle Type selector */}
              <div className="space-y-1">
                <label className="block text-[10px] font-black uppercase text-purple-300 tracking-wider flex items-center gap-1">
                  <Layers className="w-3.5 h-3.5" />
                  <span>Categoria do Equipamento</span>
                </label>
                <select
                  value={metricType}
                  onChange={(e) => setMetricType(e.target.value as any)}
                  className="w-full bg-slate-800/80 border border-slate-700/80 rounded-lg text-xs font-semibold focus:outline-none focus:border-purple-500 text-slate-100 py-2.5 px-3"
                >
                  <option value="all">Todas as Categoria (Frota Completa)</option>
                  <option value="Caminhão">Apenas Caminhões Caçamba</option>
                  <option value="Veículo">Apenas Veículos de Apoio</option>
                </select>
              </div>

              {/* Search String */}
              <div className="space-y-1">
                <label className="block text-[10px] font-black uppercase text-purple-300 tracking-wider flex items-center gap-1">
                  <Search className="w-3.5 h-3.5" />
                  <span>Pesquisar Placa ou Motorista</span>
                </label>
                <input
                  type="text"
                  placeholder="EX: FLT-7890 ou 'Anderson'..."
                  value={metricQuery}
                  onChange={(e) => setMetricQuery(e.target.value)}
                  className="w-full bg-slate-800/80 border border-slate-700/80 rounded-lg text-xs font-semibold focus:outline-none focus:border-purple-500 text-white py-2.5 px-3.5 placeholder:text-slate-500"
                />
              </div>
            </div>

            {/* Filter description badge footer */}
            <div className="text-[10px] text-slate-400 font-mono mt-3.5 pt-3 border-t border-white/5 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse"></span>
              <span>Filtrado ativo: <strong className="text-purple-300">{getFilterDescriptionLabel()}</strong></span>
            </div>
          </div>

          {/* Core Metrics Cards Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            
            <div className="bg-white border border-slate-200/90 rounded-xl p-4 shadow-sm flex flex-col justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Eficiência de Combustível</span>
              <span className="text-2xl font-black font-sans text-slate-900 mt-2 block">
                {(metricAverageEfficiency ?? 0).toFixed(2)} <span className="text-xs text-slate-450 font-bold">Km/L</span>
              </span>
              <div className="text-[10px] text-purple-650 mt-2.5 flex items-center gap-1.5 bg-purple-50 border border-purple-100 py-0.5 px-1.5 rounded w-fit font-bold">
                <Gauge className="w-3.5 h-3.5 text-purple-650 shrink-0" />
                Média Ponderada
              </div>
            </div>

            <div className="bg-white border border-slate-200/90 rounded-xl p-4 shadow-sm flex flex-col justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Volume Consumido</span>
              <span className="text-2xl font-black font-sans text-slate-900 mt-2 block">
                {metricVolumeLitres.toLocaleString()} <span className="text-xs text-slate-450 font-bold">L</span>
              </span>
              <div className="text-[10px] text-purple-650 mt-2.5 flex items-center gap-1.5 bg-purple-50 border border-purple-100 py-0.5 px-1.5 rounded w-fit font-bold">
                <Fuel className="w-3.5 h-3.5 text-purple-650 shrink-0" />
                Total Abastecido
              </div>
            </div>

            {/* 3. SALDO ACUMULADO EM REAIS DO COMBUSTIVEL MENSAL / PERIOODO */}
            <div className="bg-purple-950/20 border border-purple-200/80 rounded-xl p-4 shadow-sm flex flex-col justify-between">
              <span className="text-[10px] font-black text-purple-750 uppercase tracking-wider block">Saldo Acumulado Combustível</span>
              <span className="text-2xl font-black font-mono text-purple-900 mt-2 block">
                R$ {metricTotalFuelCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <div className="text-[10px] text-purple-700 mt-2.5 flex items-center gap-1.5 bg-purple-100/60 border border-purple-250 py-0.5 px-1.5 rounded w-fit font-bold">
                <Coins className="w-3.5 h-3.5 text-purple-700 shrink-0" />
                Despesa no Período
              </div>
            </div>

            {/* 4. OPERATING COST (Custo Op) in BRL (R$/Km) */}
            <div className="bg-white border border-slate-200/90 rounded-xl p-4 shadow-sm flex flex-col justify-between font-medium">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Custo Operacional Médio (OP)</span>
              <span className="text-2xl font-black font-mono text-slate-900 mt-2 block">
                R$ {(metricAverageOperatingCost ?? 0).toFixed(2)} <span className="text-xs text-slate-450 font-bold font-sans">/ Km</span>
              </span>
              <div className="text-[10px] text-fuchsia-750 mt-2.5 flex items-center gap-1.5 bg-fuchsia-50 border border-fuchsia-100 py-0.5 px-1.5 rounded w-fit font-bold">
                <TrendingUp className="w-3.5 h-3.5 text-fuchsia-750 shrink-0" />
                Em Reais (R$)
              </div>
            </div>

            <div className="bg-white border border-slate-200/90 rounded-xl p-4 shadow-sm flex flex-col justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Alertas Mecânicos Ativos</span>
              <span className={`text-2xl font-black font-sans mt-2 block ${metricActiveAlerts > 0 ? 'text-amber-650' : 'text-slate-900'}`}>
                {metricActiveAlerts} <span className="text-xs text-slate-450 font-bold">Alertas</span>
              </span>
              <div className="text-[10px] mt-2.5 flex items-center gap-1.5 bg-amber-50 border border-amber-100 text-amber-700 py-0.5 px-1.5 rounded w-fit font-bold">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                {metricActiveAlerts > 0 ? 'Exige atenção' : 'Tudo operacional'}
              </div>
            </div>

          </div>

          {/* Graphics section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm lg:col-span-2">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
                <div>
                  <h4 className="font-sans font-bold text-sm text-slate-900">Evolução do Custo Mensal de Combustível</h4>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Histórico consolidado anual (R$ / Mês)</p>
                </div>
                <TrendingUp className="w-5 h-5 text-purple-650" />
              </div>

              <div className="h-64 mt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={fuelTrendData.map(ft => ({ ...ft, thisWeek: ft.thisWeek || 0, lastWeek: ft.lastWeek || 0 }))} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorFuelGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#9333ea" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#9333ea" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="day" stroke="#94a3b8" fontSize={10} tickLine={false} />
                    <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} tickFormatter={(val) => `R$ ${val || 0}`} />
                    <Tooltip 
                      formatter={(value: any) => [`R$ ${(value || 0).toLocaleString()}`, 'Combustível']}
                      contentStyle={{ background: '#0f172a', border: 'none', borderRadius: '8px', color: '#f8fafc', fontSize: '11px' }}
                    />
                    <Area type="monotone" dataKey="thisWeek" stroke="#a855f7" strokeWidth={2} fillOpacity={1} fill="url(#colorFuelGrad)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
                <div>
                  <h4 className="font-sans font-bold text-sm text-slate-900">Composição de Custo Operacional (R$/Km)</h4>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Fatores incidentes por km percorrido</p>
                </div>
                <Layers className="w-5 h-5 text-fuchsia-600" />
              </div>

              <div className="h-64 mt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={costStructureData.map(c => ({ ...c, value: c.value || 0 }))} layout="vertical" margin={{ top: 5, right: 10, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis type="number" stroke="#94a3b8" fontSize={10} tickLine={false} tickFormatter={(val) => `R$ ${val || 0}`} />
                    <YAxis type="category" dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} />
                    <Tooltip 
                      formatter={(value: any) => [`R$ ${(typeof value === 'number' ? value : 0).toFixed(2)}`, 'Valor']}
                      contentStyle={{ background: '#0f172a', border: 'none', borderRadius: '8px', color: '#f8fafc', fontSize: '11px' }}
                    />
                    <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                      {costStructureData.map((entry, index) => {
                        const colors = ['#9333ea', '#c084fc', '#e879f9'];
                        return <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />;
                      })}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Active Vehicles Telemetry list */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <div className="px-5 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h4 className="font-sans font-bold text-sm text-slate-900">Monitoramento e Telemetria de Frota Ativa</h4>
                <p className="text-slate-400 text-[10px] uppercase font-bold tracking-wider mt-0.5">Indicadores do filtro de pesquisa ativo ({filteredVehiclesForMetrics.length} veículos)</p>
              </div>
              <span className="text-[10px] bg-purple-50 text-purple-800 border border-purple-100 font-extrabold px-3 py-1 rounded-full truncate">
                {vehicles.filter(v => v.status === 'In Transit').length} em trânsito
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50">
                    <th className="px-5 py-3 font-sans font-bold text-slate-600 text-xs border-b border-slate-150">ID / PLACA</th>
                    <th className="px-5 py-3 font-sans font-bold text-slate-600 text-xs border-b border-slate-150">MOTORISTA RESPONSÁVEL</th>
                    <th className="px-5 py-3 font-sans font-bold text-slate-600 text-xs border-b border-slate-150">TIPO</th>
                    <th className="px-5 py-3 font-sans font-bold text-slate-600 text-xs border-b border-slate-150 text-right">EFICIÊNCIA ATUAL</th>
                    <th className="px-5 py-3 font-sans font-bold text-slate-600 text-xs border-b border-slate-150 text-right">CUSTO OP EST. (REAL)</th>
                    <th className="px-5 py-3 font-sans font-bold text-slate-600 text-xs border-b border-slate-150">STATUS ATUAL</th>
                    <th className="px-5 py-3 font-sans font-bold text-slate-600 text-xs border-b border-slate-150 text-center">AÇÕES</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredVehiclesForMetrics.map((v) => {
                    const latestKm = v.initialKm || 0;
                    const cOp = v.costPerKm != null ? `R$ ${(v.costPerKm ?? 0).toFixed(2)}/Km` : 'R$ 1.10/Km';
                    return (
                      <tr key={v.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-5 py-3.5 font-mono text-xs font-black text-slate-900">{v.id}</td>
                        <td className="px-5 py-3.5">
                          <div className="text-xs font-semibold text-slate-800">{v.driver}</div>
                          <div className="text-[10px] text-slate-400 mt-0.5">KM Cadastrado: {latestKm.toLocaleString()} KM</div>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="inline-flex items-center gap-1 text-xs text-slate-650">
                            {v.type === 'Caminhão' ? <Truck className="w-3.5 h-3.5 text-slate-400" /> : <Car className="w-3.5 h-3.5 text-slate-400" />}
                            {v.type}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 font-mono text-xs text-slate-900 font-bold text-right">
                          {(v.efficiency ?? 0) > 0 ? `${(v.efficiency ?? 0).toFixed(1)} Km/L` : 'S/ Refuel'}
                        </td>
                        <td className="px-5 py-3.5 font-mono text-xs text-slate-900 font-bold text-right text-purple-700">
                          {cOp}
                        </td>
                        <td className="px-5 py-3.5">
                          <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-black uppercase border ${
                            v.status === 'Available' ? 'bg-purple-50 text-purple-800 border-purple-100' :
                            v.status === 'In Transit' ? 'bg-fuchsia-50 text-fuchsia-800 border-fuchsia-100 animate-pulse' :
                            'bg-amber-50 text-amber-850 border-amber-100'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${
                              v.status === 'Available' ? 'bg-purple-500' :
                              v.status === 'In Transit' ? 'bg-fuchsia-500' : 'bg-amber-500'
                            }`}></span>
                            {v.status === 'Available' ? 'Disponível' : v.status === 'In Transit' ? 'Em Transito' : 'Manutenção'}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-center">
                          <div className="flex items-center justify-center gap-1">
                            {v.status === 'In Transit' && (
                              <button
                                onClick={() => onStopDispatchVehicle(v.id, '')}
                                className="text-[10px] bg-slate-900 hover:bg-slate-800 text-white font-extrabold px-2.5 py-1 rounded transition-all cursor-pointer"
                                title="Finalizar viagem manualmente"
                              >
                                Parar Viagem
                              </button>
                            )}

                            {v.status !== 'Maintenance' && (
                              <button
                                onClick={() => setMaintenanceVehicleId(v.id)}
                                className="p-1 px-1.5 border border-slate-200 hover:border-purple-300 hover:bg-purple-50 text-slate-500 hover:text-purple-600 rounded transition-all cursor-pointer"
                                title="Registrar Ocorrência Mecânica"
                              >
                                <Wrench className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                  {filteredVehiclesForMetrics.length === 0 && (
                    <tr>
                      <td colSpan={7} className="text-center py-12 text-slate-400 text-xs font-medium">
                        Nenhum veículo correspondente aos filtros de pesquisa localizados.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* Sub-Tab 2: Fuel controls (Controle de Abastecimentos) */}
      {activeSubTab === 'refuels' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          
          {garageDieselQty < 0 && (
            <div className="bg-red-55 border-l-4 border-red-500 p-4 rounded-xl flex items-start gap-3.5 shadow-sm animate-pulse-subtle">
              <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-sans font-extrabold text-sm text-red-900 border-0 m-0">ALERTA: Estoque do Tanque Negativo!</h4>
                <p className="text-red-700 text-xs mt-1 leading-relaxed">
                  O tanque central da garagem está com saldo negativo (<strong>{garageDieselQty.toLocaleString()} Litros</strong>).
                  Por favor, reabasteça o depósito de combustível físico para restabelecer o saldo operacional seguro.
                </p>
              </div>
            </div>
          )}

          {/* BOMBA DE COMBUSTÍVEL - DEPOSITO GARAGEM CARD */}
          <div className="bg-gradient-to-r from-slate-900 via-purple-950 to-slate-900 text-white rounded-2xl p-5 border border-purple-900/40 shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4.5">
              <div className={`w-14 h-14 rounded-xl border flex items-center justify-center shrink-0 shadow-inner ${
                garageDieselQty < 0 
                  ? 'bg-red-500/10 border-red-500/30 text-red-400' 
                  : 'bg-purple-500/10 border-purple-500/25 text-purple-400'
              }`}>
                <Fuel className={`w-8 h-8 ${garageDieselQty < 0 ? 'text-red-500 animate-bounce' : 'text-purple-400 animate-pulse'}`} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded tracking-wider uppercase ${
                    garageDieselQty < 0 ? 'bg-red-600 text-white' : 'bg-purple-600 text-white'
                  }`}>
                    Tanque Garagem {garageDieselQty < 0 && '• CRÍTICO'}
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium font-sans">Estoque de Diesel Interno</span>
                </div>
                <h3 className={`font-sans font-black text-2xl mt-1 flex items-baseline gap-1.5 ${
                  garageDieselQty < 0 ? 'text-red-450' : 'text-slate-100'
                }`}>
                  <span>{garageDieselQty.toLocaleString()}</span>
                  <span className={`text-xs font-semibold uppercase tracking-wider ${
                    garageDieselQty < 0 ? 'text-red-300' : 'text-purple-300'
                  }`}>Litros Disponíveis</span>
                </h3>
                <p className="text-slate-400 text-[10px] mt-0.5 font-medium font-sans">
                  Controle central de diesel comprado a preço de atacado para frotistas.
                </p>
              </div>
            </div>

            {/* Inputs de Preenchimento da Bomba Garagem */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full md:w-auto shrink-0 bg-slate-950/50 p-4 rounded-xl border border-white/5 shadow-inner">
              <div className="space-y-1">
                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-wider">Quantidade de Diesel (L)</label>
                <div className="relative">
                  <input
                    type="number"
                    value={garageDieselQty}
                    onChange={(e) => onUpdateGarageDiesel(parseFloat(e.target.value) || 0, garageDieselPrice)}
                    className="w-full sm:w-36 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 font-bold font-mono focus:outline-none focus:border-purple-500 text-right"
                    placeholder="Abastecer Tanque"
                  />
                  <span className="absolute left-2 text-[8px] font-extrabold text-purple-400 bg-purple-500/10 border border-purple-500/20 px-1 py-0.5 rounded top-1/2 -translate-y-1/2 select-none uppercase">Tanque</span>
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-wider">Valor do Litro Diesel (R$/L)</label>
                <div className="relative text-emerald-400">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold font-mono">R$</span>
                  <input
                    type="text"
                    value={garageDieselPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    onChange={(e) => {
                      const digits = e.target.value.replace(/\D/g, '');
                      if (!digits) {
                        onUpdateGarageDiesel(garageDieselQty, 0);
                        return;
                      }
                      const val = parseInt(digits, 10) / 100;
                      onUpdateGarageDiesel(garageDieselQty, val);
                    }}
                    className="w-full sm:w-38 bg-slate-900 border border-slate-700 rounded-lg pl-7 pr-2.5 py-1.5 text-xs text-slate-100 font-bold font-mono focus:outline-none focus:border-purple-500 text-right"
                    placeholder="Ex: 5,68"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* HISTORICO DE ABASTECIMENTO DO TANQUE GARAGEM */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Fuel className="w-5 h-5 text-purple-600" />
                <h3 className="font-sans font-bold text-base text-slate-900">Tanque Garagem — Abastecimentos</h3>
              </div>
              <button
                onClick={() => setShowGarageRefillForm(!showGarageRefillForm)}
                className="flex items-center gap-1.5 text-[11px] font-bold text-purple-700 bg-purple-50 border border-purple-200 rounded-lg px-3 py-1.5 hover:bg-purple-100 cursor-pointer"
              >
                {showGarageRefillForm ? 'Fechar' : <><Plus className="w-3.5 h-3.5" /> Novo Abastecimento</>}
              </button>
            </div>

            {showGarageRefillForm && (
              <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 mb-4">
                <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 items-end">
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Data</label>
                    <input
                      type="date"
                      value={garageRefillData}
                      onChange={(e) => setGarageRefillData(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-purple-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Litros (L)</label>
                    <input
                      type="number"
                      value={garageRefillLitros}
                      onChange={(e) => setGarageRefillLitros(parseFloat(e.target.value) || '')}
                      className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-purple-500"
                      placeholder="Ex: 1000"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Valor Total (R$)</label>
                    <input
                      type="number"
                      value={garageRefillValor}
                      onChange={(e) => setGarageRefillValor(parseFloat(e.target.value) || '')}
                      className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-purple-500"
                      placeholder="Ex: 5680"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Preço por Litro (R$/L)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={garageRefillPrecoLitro}
                      onChange={(e) => setGarageRefillPrecoLitro(parseFloat(e.target.value) || '')}
                      className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-purple-500"
                      placeholder="Ex: 5.68"
                    />
                  </div>
                  <button
                    onClick={() => {
                      if (!garageRefillLitros || !garageRefillValor || !garageRefillPrecoLitro || garageRefillLitros <= 0 || garageRefillValor <= 0 || garageRefillPrecoLitro <= 0) return;
                      if (editingGarageRefillId) {
                        onEditGarageRefill?.(editingGarageRefillId, {
                          data: garageRefillData,
                          quantidade_litros: garageRefillLitros as number,
                          valor_total: garageRefillValor as number,
                          preco_por_litro: garageRefillPrecoLitro as number
                        });
                        setEditingGarageRefillId(null);
                      } else {
                        onAddGarageRefill({
                          data: garageRefillData,
                          quantidade_litros: garageRefillLitros as number,
                          valor_total: garageRefillValor as number,
                          preco_por_litro: garageRefillPrecoLitro as number
                        });
                      }
                      setGarageRefillLitros('');
                      setGarageRefillValor('');
                      setGarageRefillPrecoLitro('');
                      setGarageRefillData(new Date().toISOString().split('T')[0]);
                      setShowGarageRefillForm(false);
                    }}
                    className="w-full bg-purple-600 text-white rounded-lg px-4 py-2 text-xs font-bold hover:bg-purple-700 cursor-pointer disabled:opacity-50"
                    disabled={!garageRefillLitros || !garageRefillValor || !garageRefillPrecoLitro || garageRefillLitros <= 0 || garageRefillValor <= 0 || garageRefillPrecoLitro <= 0}
                  >
                    {editingGarageRefillId ? 'Salvar Edição' : 'Registrar Abastecimento'}
                  </button>
                </div>
              </div>
            )}

            {garageRefills.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="text-left py-2 px-2 font-bold text-slate-400 uppercase tracking-wider">Data</th>
                      <th className="text-right py-2 px-2 font-bold text-slate-400 uppercase tracking-wider">Litros</th>
                      <th className="text-right py-2 px-2 font-bold text-slate-400 uppercase tracking-wider">Valor Total</th>
                      <th className="text-right py-2 px-2 font-bold text-slate-400 uppercase tracking-wider">R$/L</th>
                      <th className="text-right py-2 px-2 font-bold text-slate-400 uppercase tracking-wider">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {garageRefills.map(r => (
                      <tr key={r.id} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="py-2 px-2 font-semibold text-slate-700">{new Date(r.data + 'T12:00:00').toLocaleDateString('pt-BR')}</td>
                        <td className="py-2 px-2 text-right font-bold text-slate-900">{r.quantidade_litros.toLocaleString()}</td>
                        <td className="py-2 px-2 text-right font-bold text-emerald-600">R$ {r.valor_total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                        <td className="py-2 px-2 text-right font-mono text-slate-500">R$ {r.preco_por_litro.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                        <td className="py-2 px-2 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => {
                                setEditingGarageRefillId(r.id);
                                setGarageRefillData(r.data);
                                setGarageRefillLitros(r.quantidade_litros);
                                setGarageRefillValor(r.valor_total);
                                setShowGarageRefillForm(true);
                              }}
                              className="p-1 text-slate-400 hover:text-blue-600 cursor-pointer"
                              title="Editar"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => {
                                if (confirm(`Excluir abastecimento de ${r.quantidade_litros}L em ${new Date(r.data + 'T12:00:00').toLocaleDateString('pt-BR')}?`)) {
                                  onDeleteGarageRefill?.(r.id);
                                }
                              }}
                              className="p-1 text-slate-400 hover:text-red-600 cursor-pointer"
                              title="Excluir"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-50 font-bold">
                      <td className="py-2 px-2 text-slate-600">Total</td>
                      <td className="py-2 px-2 text-right text-slate-900">{garageRefills.reduce((s, r) => s + r.quantidade_litros, 0).toLocaleString()}</td>
                      <td className="py-2 px-2 text-right text-emerald-700">R$ {garageRefills.reduce((s, r) => s + r.valor_total, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                      <td className="py-2 px-2 text-right text-slate-400">—</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            ) : (
              <p className="text-xs text-slate-400 text-center py-6">Nenhum abastecimento registrado no tanque da garagem.</p>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* New Supply entry form */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm h-fit">
              <div className="border-b border-slate-100 pb-3 mb-4">
                <h3 className="font-sans font-bold text-base text-slate-900 flex items-center gap-2">
                  <Fuel className="w-5 h-5 text-purple-600" />
                  <span>Registrar Abastecimento</span>
                </h3>
                <p className="text-slate-400 text-xs mt-0.5">Lançamento de combustível pago e KM percorrido</p>
              </div>

              <form onSubmit={handleRefuelSubmit} className="space-y-4">
                {/* Tipo de Lançamento */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Tipo de Lançamento</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setIsRetiradaDiversa(false)}
                      className={`py-2 px-3 text-xs font-bold rounded-lg border flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        !isRetiradaDiversa
                          ? 'bg-purple-600 text-white border-purple-600 font-black shadow-xs'
                          : 'bg-slate-50 text-slate-650 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      🚚 Regular
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsRetiradaDiversa(true);
                        setFuelKmFinal('');
                      }}
                      className={`py-2 px-3 text-xs font-bold rounded-lg border flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        isRetiradaDiversa
                          ? 'bg-amber-600 text-white border-amber-600 font-black shadow-xs'
                          : 'bg-slate-50 text-slate-650 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      ⚠️ Retirada Diversa
                    </button>
                  </div>
                </div>

                {/* Opção POSTO ou GARAGEM */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Local do Abastecimento</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setFuelSource('POSTO');
                        setFuelPricePerLitreUnitString('');
                      }}
                      className={`py-2 px-3 text-xs font-bold rounded-lg border flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        fuelSource === 'POSTO'
                          ? 'bg-purple-600 text-white border-purple-600 font-black shadow-xs'
                          : 'bg-slate-50 text-slate-650 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      ⛽ Posto Externo
                    </button>
                    <button
                      type="button"
                      disabled={isRetiradaDiversa}
                      onClick={() => {
                        setFuelSource('GARAGEM');
                        setFuelPricePerLitreUnitString(
                          garageDieselPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                        );
                      }}
                      className={`py-2 px-3 text-xs font-bold rounded-lg border flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        fuelSource === 'GARAGEM'
                          ? 'bg-purple-600 text-white border-purple-600 font-black shadow-xs'
                          : 'bg-slate-50 text-slate-650 border-slate-200 hover:bg-slate-100'
                      } ${isRetiradaDiversa ? 'opacity-40 cursor-not-allowed' : ''}`}
                    >
                      🏢 Garagem Própria
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Veículo / Motorista associado</label>
                  <select
                    value={fuelVehicleId}
                    onChange={(e) => handleFuelVehicleChange(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-purple-500 font-bold"
                    required
                  >
                    <option value="">Selecione um veículo...</option>
                    {vehicles.map(v => (
                      <option key={v.id} value={v.id}>
                        {v.id} - {v.driver} ({v.type || 'Caminhão'})
                      </option>
                    ))}
                  </select>
                </div>

                {!isRetiradaDiversa && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">KM Inicial</label>
                      <input
                        type="number"
                        value={fuelKmInicial}
                        placeholder="0"
                        className="w-full bg-slate-100/80 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-700 font-semibold font-mono cursor-not-allowed focus:outline-none"
                        readOnly
                        title="Preenchido de forma automática com o último KM lançado para este veículo para precisão de médias!"
                      />
                      <p className="text-[9px] text-purple-500 font-bold mt-0.5 italic">KM anterior puxado auto.</p>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-950 mb-1">KM Final <span className="text-purple-600 font-bold">*</span></label>
                      <input
                        type="number"
                        value={fuelKmFinal}
                        onChange={(e) => setFuelKmFinal(e.target.value === '' ? '' : Number(e.target.value))}
                        placeholder="Atual"
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 font-bold font-mono focus:outline-none focus:border-purple-500"
                        required={!isRetiradaDiversa}
                      />
                      <p className="text-[9px] text-slate-400 mt-0.5 italic">Odômetro no ato</p>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 font-sans">Quantidade de Litros (L)</label>
                  <input
                    type="number"
                    step="any"
                    value={fuelLitres}
                    onChange={(e) => setFuelLitres(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="EX: 150"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 font-bold font-mono focus:outline-none focus:border-purple-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 font-sans">
                    {isRetiradaDiversa ? 'Valor da Retirada (R$)' : `Valor do Combustível por Litro (R$/L)${fuelSource === 'GARAGEM' ? ' (Exclusivo)' : ''}`}
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-purple-600 text-xs font-bold font-mono">R$</span>
                    <input
                      type="text"
                      value={fuelPricePerLitreUnitString}
                      onChange={(e) => {
                        if (!isRetiradaDiversa && fuelSource === 'GARAGEM') return;
                        const input = e.target.value;
                        const digits = input.replace(/\D/g, '');
                        if (!digits) {
                          setFuelPricePerLitreUnitString('');
                          return;
                        }
                        const val = parseInt(digits, 10) / 100;
                        setFuelPricePerLitreUnitString(val.toLocaleString('pt-BR', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2
                        }));
                      }}
                      disabled={!isRetiradaDiversa && fuelSource === 'GARAGEM'}
                      placeholder={isRetiradaDiversa ? "Ex: 250,00" : "Ex: 5,89"}
                      className={`w-full border rounded-lg pl-9 pr-3 py-2 text-xs font-bold font-mono focus:outline-none focus:border-purple-500 ${
                        (!isRetiradaDiversa && fuelSource === 'GARAGEM') ? 'bg-slate-150 text-slate-500 border-slate-300 font-bold cursor-not-allowed' : 'bg-slate-50 border-slate-200 text-slate-900'
                      }`}
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 font-sans">Data</label>
                  <input
                    type="date"
                    value={fuelDate}
                    onChange={(e) => setFuelDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 font-semibold focus:outline-none focus:border-purple-500"
                    required
                  />
                </div>

                {/* Dynamic Live Cost & Estimation Panel */}
                {((fuelLitres !== '' && Number(fuelLitres) > 0) || (fuelPricePerLitreUnitString !== '' && (parseFloat(fuelPricePerLitreUnitString.replace(/\./g, '').replace(',', '.')) || 0) > 0)) && (
                  <div className="bg-purple-50 border border-purple-100 p-3.5 rounded-lg space-y-2 animate-in fade-in duration-200 font-sans">
                    {!isRetiradaDiversa && fuelKmInicial !== '' && fuelKmFinal !== '' && Number(fuelKmFinal) > Number(fuelKmInicial) && (
                      <>
                        <div className="flex justify-between text-xs text-slate-600 font-medium pb-1.5 border-b border-purple-100/50">
                          <span>Distância Percorrida:</span>
                          <strong className="text-slate-950 font-bold font-mono">{Number(fuelKmFinal) - Number(fuelKmInicial)} KM</strong>
                        </div>
                        {Number(fuelLitres) > 0 && (
                          <div className="flex justify-between text-xs text-slate-600 font-medium pb-1.5 border-b border-purple-100/50">
                            <span>Eficiência Estimada:</span>
                            <strong className="text-purple-700 font-extrabold font-mono text-sm">
                              {(((Number(fuelKmFinal) - Number(fuelKmInicial)) / Number(fuelLitres)) || 0).toFixed(2)} Km/L
                            </strong>
                          </div>
                        )}
                      </>
                    )}
                    
                    {fuelPricePerLitreUnitString !== '' && (
                      <div className="flex justify-between text-xs text-slate-600 font-medium">
                        <span>{isRetiradaDiversa ? "Valor Total:" : "Preço do Litro:"}</span>
                        <strong className="text-slate-950 font-bold font-mono">
                          R$ {(parseFloat(fuelPricePerLitreUnitString.replace(/\./g, '').replace(',', '.')) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {!isRetiradaDiversa && "/ Litro"}
                        </strong>
                      </div>
                    )}

                    {!isRetiradaDiversa && fuelLitres !== '' && Number(fuelLitres) > 0 && fuelPricePerLitreUnitString !== '' && (
                      <div className="flex justify-between text-xs text-slate-800 font-black border-t border-purple-150 pt-1.5 mt-1.5">
                        <span>CUSTO ESTIMADO:</span>
                        <strong className="text-purple-750 font-black font-mono text-base">
                          R$ {((parseFloat(fuelPricePerLitreUnitString.replace(/\./g, '').replace(',', '.')) || 0) * Number(fuelLitres)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </strong>
                      </div>
                    )}
                  </div>
                )}

              <button
                type="submit"
                className="w-full bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-500 hover:to-fuchsia-500 text-white font-bold py-3 rounded-lg text-xs shadow-md shadow-purple-600/10 cursor-pointer transition-colors"
              >
                SALVAR ABASTECIMENTO
              </button>
            </form>
          </div>

          {/* Aggregate Cards & Log lists */}
          <div className="lg:col-span-2 space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm flex flex-col justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Volume Total Abastecido</span>
                <span className="text-2xl font-black font-sans text-slate-900 mt-2 block">
                  {fuelLogs.reduce((acc, curr) => acc + curr.quantidadeLitros, 0).toLocaleString()} L
                </span>
                <div className="text-[10px] text-purple-600 mt-2 flex items-center gap-1 font-bold">
                  <span className="w-2 h-2 rounded-full bg-purple-500"></span> Litragem Consolidada
                </div>
              </div>

              <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm flex flex-col justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Valor Total Investido</span>
                <span className="text-2xl font-black font-sans text-slate-900 mt-2 block">
                  R$ {fuelLogs.reduce((acc, curr) => acc + curr.valorPago, 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <div className="text-[10px] text-fuchsia-600 mt-2 flex items-center gap-1 font-bold">
                  <span className="w-2 h-2 rounded-full bg-fuchsia-500"></span> Despesa em Combustível
                </div>
              </div>

              <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm flex flex-col justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">KM Distância Percorrida</span>
                <span className="text-2xl font-black font-sans text-slate-900 mt-2 block">
                  {fuelLogs.reduce((acc, curr) => {
                    if (curr.isRetiradaDiversa || curr.kmFinal === undefined || curr.kmInicial === undefined) {
                      return acc;
                    }
                    return acc + (curr.kmFinal - curr.kmInicial);
                  }, 0).toLocaleString()} KM
                </span>
                <div className="text-[10px] text-slate-400 mt-2 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-slate-500"></span> Histórico de Logística
                </div>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
              <div className="px-5 py-4 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h4 className="font-sans font-bold text-sm text-slate-900">Extratos de Lançamento de Combustível</h4>
                  <p className="text-slate-400 text-[10px] uppercase font-bold tracking-wider mt-0.5">Controle de eficácia de consumo</p>
                </div>
                
                {/* Search Bar & Date Filter Controls */}
                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative">
                    <input
                      type="text"
                      value={fuelSearchQuery}
                      onChange={(e) => setFuelSearchQuery(e.target.value)}
                      placeholder="Pesquisar veículo ou mot..."
                      className="bg-slate-50 border border-slate-200 rounded-lg pl-3 pr-3 py-1.5 text-xs text-slate-900 font-medium focus:outline-none focus:border-purple-500 w-44"
                    />
                  </div>
                  
                  {/* Filtro por Período */}
                  <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5">
                    <div className="flex items-center gap-1">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">De</span>
                      <input
                        type="date"
                        value={fuelFilterStartDate}
                        onChange={(e) => setFuelFilterStartDate(e.target.value)}
                        className="bg-transparent text-xs text-slate-700 font-semibold focus:outline-none"
                        title="Data de Início"
                      />
                    </div>
                    <span className="text-slate-300">|</span>
                    <div className="flex items-center gap-1">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Até</span>
                      <input
                        type="date"
                        value={fuelFilterEndDate}
                        onChange={(e) => setFuelFilterEndDate(e.target.value)}
                        className="bg-transparent text-xs text-slate-700 font-semibold focus:outline-none"
                        title="Data Limite"
                      />
                    </div>
                    {(fuelFilterStartDate || fuelFilterEndDate) && (
                      <button 
                        type="button"
                        onClick={() => {
                          setFuelFilterStartDate('');
                          setFuelFilterEndDate('');
                        }}
                        className="text-[10px] text-purple-600 hover:text-purple-800 font-black ml-1.5 hover:underline cursor-pointer transition-colors"
                        title="Limpar Período"
                      >
                        Limpar
                      </button>
                    )}
                  </div>

                  <span className="text-[10px] bg-slate-100 text-slate-800 font-extrabold px-2.5 py-1.5 rounded truncate">
                    {filteredFuelLogs.length} de {fuelLogs.length} Logs
                  </span>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50">
                      <th className="px-5 py-3 font-sans font-bold text-slate-600 text-xs border-b border-slate-150 uppercase tracking-wider">VEÍCULO / MOT.</th>
                      <th className="px-5 py-3 font-sans font-bold text-slate-600 text-xs border-b border-slate-150 uppercase tracking-wider">DATA</th>
                      <th className="px-5 py-3 font-sans font-bold text-slate-600 text-xs border-b border-slate-150 uppercase tracking-wider">ODÔMETRO (INICIAL ➔ FINAL)</th>
                      <th className="px-5 py-3 font-sans font-bold text-slate-600 text-xs border-b border-slate-150 uppercase tracking-wider text-right">LITROS &amp; DISTÂNCIA</th>
                      <th className="px-5 py-3 font-sans font-bold text-slate-600 text-xs border-b border-slate-150 uppercase tracking-wider text-right">CUSTO TOTAL</th>
                      <th className="px-5 py-3 font-sans font-bold text-slate-600 text-xs border-b border-slate-150 uppercase tracking-wider text-right">EFICIÊNCIA</th>
                      {isAdmin && (
                        <th className="px-5 py-3 font-sans font-bold text-slate-600 text-xs border-b border-slate-150 uppercase tracking-wider text-center">AÇÕES</th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {filteredFuelLogs.map((log) => {
                      const isRetirada = !!log.isRetiradaDiversa;
                      const computedDist = (!isRetirada && log.kmFinal !== undefined && log.kmInicial !== undefined) ? (log.kmFinal - log.kmInicial) : 0;
                      const efficiencyVal = (!isRetirada && typeof log.mediaKmL === 'number') ? log.mediaKmL : (log.quantidadeLitros > 0 ? (computedDist / log.quantidadeLitros) : 0);
                      const isHighEfficiency = !isRetirada && efficiencyVal >= 4.0;
                      
                      return (
                        <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-5 py-3.5">
                            <span className="font-mono text-xs text-slate-900 font-black flex items-center gap-1.5 animate-in fade-in">
                              <span>{log.vehicleId}</span>
                              {log.tipo === 'GARAGEM' ? (
                                <span className="text-[8px] bg-slate-950 text-purple-300 font-extrabold px-1.5 py-0.2 rounded border border-purple-500/30 uppercase tracking-wide">GARAGEM</span>
                              ) : isRetirada ? (
                                <span className="text-[8px] bg-amber-500 text-white font-extrabold px-1.5 py-0.2 rounded uppercase tracking-wide">RETIRADA DIVERSA</span>
                              ) : (
                                <span className="text-[8px] bg-slate-100 text-slate-600 font-extrabold px-1.5 py-0.2 rounded uppercase tracking-wide">POSTO</span>
                              )}
                            </span>
                            <span className="block text-[11px] text-slate-550 mt-0.5">{log.driver || 'N/A'}</span>
                          </td>
                          <td className="px-5 py-3.5 font-mono text-xs text-slate-500">{log.data}</td>
                          <td className="px-5 py-3.5 font-mono text-xs text-slate-650">
                            {isRetirada ? (
                              <span className="text-amber-600 font-bold italic">Sem Odômetro</span>
                            ) : (
                              `${log.kmInicial?.toLocaleString() || 0} ➔ ${log.kmFinal?.toLocaleString() || 0}`
                            )}
                          </td>
                          <td className="px-5 py-3.5 font-mono text-xs text-slate-600 text-right">
                            <div>{log.quantidadeLitros} Litros</div>
                            {isRetirada ? (
                              <div className="text-[10px] text-amber-500 font-bold">Retirada Avulsa</div>
                            ) : (
                              <div className="text-[10px] text-slate-400 font-bold">{computedDist} KM percorridos</div>
                            )}
                          </td>
                          <td className="px-5 py-3.5 font-mono text-xs font-bold text-slate-950 text-right">
                            <div>R$ {(log.valorPago || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                            {isRetirada ? (
                              <span className="text-[9px] text-amber-600 bg-amber-50 border border-amber-200 px-1.5 py-0.2 rounded font-extrabold inline-block mt-1 uppercase">Retirada</span>
                            ) : (
                              <span className="text-[10px] text-purple-650 font-extrabold block mt-0.5">
                                (R$ {(((log.valorPago ?? 0) / (log.quantidadeLitros || 1)) || 0).toFixed(2)}/L)
                              </span>
                            )}
                          </td>
                          <td className="px-5 py-3.5 text-right font-sans">
                            {isRetirada ? (
                              <span className="inline-block px-2.5 py-0.5 rounded text-[10px] font-black tracking-wider uppercase bg-slate-100 text-slate-500 border border-slate-200">
                                —
                              </span>
                            ) : (
                              <span className={`inline-block px-2.5 py-0.5 rounded text-[10px] font-black tracking-wider uppercase ${
                                isHighEfficiency ? 'bg-purple-50 text-purple-800 border border-purple-100' : 'bg-fuchsia-50 text-fuchsia-800 border border-fuchsia-100'
                              }`}>
                                {(efficiencyVal ?? 0).toFixed(2)} Km/L
                              </span>
                            )}
                          </td>
                          {isAdmin && (
                            <td className="px-3 py-3.5 text-center">
                              <div className="flex items-center justify-center gap-1">
                                {log.fotoNota && (
                                  <button
                                    type="button"
                                    onClick={() => setPreviewFotoNota(log.fotoNota!)}
                                    className="text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 p-1.5 rounded-lg border border-transparent hover:border-emerald-100 transition-colors cursor-pointer"
                                    title="Ver foto da nota fiscal"
                                  >
                                    <ImageIcon className="w-4 h-4" />
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingFuelLog(log);
                                    setEditFuelVehicleId(log.vehicleId);
                                    setEditFuelLitres(log.quantidadeLitros);
                                    setEditFuelKmInicial(log.kmInicial ?? '');
                                    setEditFuelKmFinal(log.kmFinal ?? '');
                                    setEditFuelValorPago(log.valorPago);
                                    setEditFuelData(log.data);
                                    setEditFuelDriver(log.driver || '');
                                    setEditFuelTipo(log.tipo || 'POSTO');
                                    setEditFuelObservacao(log.observacao || '');
                                  }}
                                  className="text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 p-1.5 rounded-lg border border-transparent hover:border-indigo-100 transition-colors cursor-pointer"
                                  title="Editar"
                                >
                                  <Pencil className="w-4 h-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (window.confirm('Excluir este registro de abastecimento?')) {
                                      onDeleteFuelLog?.(log.id);
                                    }
                                  }}
                                  className="text-slate-400 hover:text-rose-600 hover:bg-rose-50 p-1.5 rounded-lg border border-transparent hover:border-rose-100 transition-colors cursor-pointer"
                                  title="Excluir"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          )}
                        </tr>
                      );
                    })}

                    {filteredFuelLogs.length === 0 && (
                      <tr>
                        <td colSpan={6} className="text-center py-10 font-sans text-slate-400 text-sm">
                          Nenhum registro de abastecimento localizado com os filtros selecionados.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

        </div>
      </div>
      )}

      {/* Sub-Tab 3: Add/Edit Vehicle Form AND Live listing of registered Vehicles */}
      {activeSubTab === 'register' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in fade-in duration-200">
          
          {/* Form left Column */}
          <div className="lg:col-span-4 bg-white border border-slate-200 rounded-xl p-5 shadow-sm h-fit relative">
            {editingVehicleId && (
              <div className="absolute top-3 right-3 text-[10px] font-black uppercase bg-purple-150 text-purple-850 px-2.5 py-0.5 rounded tracking-wider animate-pulse select-none">
                Modo Edição
              </div>
            )}
            <div className="border-b border-slate-100 pb-3 mb-5">
              <h3 className="font-sans font-bold text-sm text-slate-900 flex items-center gap-2">
                <Truck className="w-5 h-5 text-purple-650" />
                <span>{editingVehicleId ? 'Editar Veículo' : 'Cadastrar Novo Veículo / Caminhão'}</span>
              </h3>
              <p className="text-slate-400 text-xs mt-0.5">Adicione ou edite equipamentos de transporte para controle imediato</p>
            </div>

            <form onSubmit={handleRegVehicleSubmit} className="space-y-4">
              
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Identificação / Prefixo / Placa <span className="text-purple-600">*</span></label>
                <input
                  type="text"
                  value={newVehicleId}
                  onChange={(e) => setNewVehicleId(e.target.value)}
                  placeholder="EX: FLT-7890 ou ABC-1234"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3.5 py-2 text-xs text-slate-900 font-bold font-mono focus:outline-none focus:border-purple-500 placeholder:font-sans uppercase disabled:bg-slate-100 disabled:text-slate-450 disabled:cursor-not-allowed"
                  required
                  disabled={editingVehicleId !== null} // Plate/ID is primary key, edit motorista/tipo and starting values
                />
                <p className="text-[10px] text-slate-400 mt-1">Placa ou prefixo identificador único</p>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Motorista Encarregado <span className="text-purple-600">*</span></label>
                <select
                  value={newVehicleDriver}
                  onChange={(e) => setNewVehicleDriver(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3.5 py-2 text-xs text-slate-900 font-bold focus:outline-none focus:border-purple-500"
                  required
                >
                  <option value="">Selecione o motorista titular...</option>
                  {motoristas.map((drv) => (
                    <option key={drv} value={drv}>{drv}</option>
                  ))}
                </select>
                <p className="text-[10px] text-slate-400 mt-1">Nome do motorista cooperado titular</p>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Categoria Geral</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewVehicleType('Caminhão')}
                    className={`py-2 rounded-lg text-xs font-bold border transition-all flex items-center justify-center gap-2 cursor-pointer ${
                      newVehicleType === 'Caminhão'
                        ? 'bg-purple-50 border-purple-300 text-purple-800 font-extrabold'
                        : 'bg-white border-slate-200 text-slate-650 hover:bg-slate-50/50'
                    }`}
                  >
                    <Truck className="w-3.5 h-3.5" />
                    <span>Caminhão Caçamba</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewVehicleType('Veículo')}
                    className={`py-2 rounded-lg text-xs font-bold border transition-all flex items-center justify-center gap-2 cursor-pointer ${
                      newVehicleType === 'Veículo'
                        ? 'bg-purple-50 border-purple-300 text-purple-800 font-extrabold'
                        : 'bg-white border-slate-200 text-slate-650 hover:bg-slate-50/50'
                    }`}
                  >
                    <Car className="w-3.5 h-3.5" />
                    <span>Veículo Apoio</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Odômetro Inicial / Atual (KM) *</label>
                <input
                  type="number"
                  value={newVehicleInitialKm}
                  onChange={(e) => setNewVehicleInitialKm(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="Ex: 120000"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3.5 py-2 text-xs text-slate-900 font-mono font-bold focus:outline-none focus:border-purple-500"
                  required
                />
                <p className="text-[10px] text-slate-400 mt-1">KM atual usado no cálculo das médias</p>
              </div>

              <div className="flex gap-2 pt-1">
                {editingVehicleId && (
                  <button
                    type="button"
                    onClick={cancelEditingVehicle}
                    className="flex-1 bg-slate-100 hover:bg-slate-200 active:bg-slate-250 text-slate-700 font-bold py-2.5 rounded-lg text-xs transition-colors cursor-pointer flex items-center justify-center gap-1 border border-slate-200"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Cancelar</span>
                  </button>
                )}
                <button
                  type="submit"
                  className="flex-2 bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-500 hover:to-fuchsia-500 text-white font-bold py-2.5 rounded-lg text-xs shadow-md shadow-purple-600/10 cursor-pointer transition-colors"
                >
                  {editingVehicleId ? 'SALVAR ALTERAÇÕES' : 'CADASTRAR VEÍCULO'}
                </button>
              </div>
            </form>
          </div>

          {/* List display right Column */}
          <div className="lg:col-span-8 bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
            <div className="border-b border-slate-100 pb-3 mb-4">
              <h4 className="font-sans font-bold text-sm text-slate-900">Veículos e Caminhões Cadastrados no Sistema</h4>
              <p className="text-slate-400 text-[10px] uppercase font-bold tracking-wider mt-0.5">Clique em "Editar" para atualizar motoristas e dados de odômetro</p>
            </div>

            <div className="overflow-y-auto max-h-[460px] pr-1">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50">
                    <th className="px-4 py-2.5 font-sans font-bold text-slate-600 text-xs border-b border-slate-150 uppercase tracking-widest">Placa / ID</th>
                    <th className="px-4 py-2.5 font-sans font-bold text-slate-600 text-xs border-b border-slate-150 uppercase tracking-widest">Motorista Titular</th>
                    <th className="px-4 py-2.5 font-sans font-bold text-slate-600 text-xs border-b border-slate-150 uppercase tracking-widest">Categoria</th>
                    <th className="px-4 py-2.5 font-sans font-bold text-slate-600 text-xs border-b border-slate-150 uppercase tracking-widest text-right">Odômetro Cadastro</th>
                    <th className="px-4 py-2.5 font-sans font-bold text-slate-600 text-xs border-b border-slate-150 uppercase tracking-widest text-right">Custo / Km</th>
                    <th className="px-4 py-2.5 font-sans font-bold text-slate-600 text-xs border-b border-slate-150 uppercase tracking-widest text-center">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {vehicles.map((v) => (
                    <tr key={v.id} className={`hover:bg-slate-50/50 transition-colors ${editingVehicleId === v.id ? 'bg-purple-50/30' : ''}`}>
                      <td className="px-4 py-3 font-mono text-xs font-black text-slate-900">{v.id}</td>
                      <td className="px-4 py-3 text-xs text-slate-800 font-bold">{v.driver}</td>
                      <td className="px-4 py-3 text-xs text-slate-500">
                        <span className="flex items-center gap-1">
                          {v.type === 'Caminhão' ? <Truck className="w-3.5 h-3.5 text-purple-500" /> : <Car className="w-3.5 h-3.5 text-fuchsia-500" />}
                          {v.type}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-800 text-right">{(v.initialKm || 0).toLocaleString()} KM</td>
                      <td className="px-4 py-3 font-mono text-xs text-purple-700 text-right">R$ {(v.costPerKm ?? 1.10).toFixed(2)}</td>
                      <td className="px-4 py-3 text-center">
                        <button
                          type="button"
                          onClick={() => startEditingVehicle(v)}
                          className="px-2.5 py-1 text-[11px] font-bold border border-slate-200 hover:border-purple-300 hover:bg-purple-50 text-slate-500 hover:text-purple-700 bg-white rounded-lg transition-colors cursor-pointer inline-flex items-center gap-1 select-none"
                          title="Fazer edição do cadastro deste veículo"
                        >
                          <Pencil className="w-3 h-3" />
                          <span>Editar</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="text-[10px] text-slate-400 mt-4 border-t border-slate-100 pt-3 flex items-center justify-between font-bold">
              <span>Total de unidades cadastradas: {vehicles.length}</span>
              <CheckCircle2 className="w-4 h-4 text-purple-600" />
            </div>
          </div>

        </div>
      )}

      {/* Maintenance Occurrence Dialog Modal */}
      {maintenanceVehicleId && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden border border-slate-200">
            <div className="bg-slate-900 text-white p-4 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Wrench className="w-4 h-4 text-purple-400" />
                <h4 className="font-sans font-bold text-xs">Ocorrência de Manutenção: {maintenanceVehicleId}</h4>
              </div>
              <button onClick={() => setMaintenanceVehicleId(null)} className="text-white hover:text-slate-200">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleMaintenanceSubmit} className="p-4 space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Descrição do Defeito / Serviço</label>
                <textarea
                  required
                  placeholder="Ex: Troca da junta do motor e pastilhas de freio..."
                  value={maintenanceDesc}
                  onChange={(e) => setMaintenanceDesc(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-xs focus:outline-none focus:border-purple-500 min-h-[60px]"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Estimativa de Custo (R$)</label>
                <div className="relative">
                  <span className="absolute left-2.5 top-2 text-xs font-mono font-bold text-purple-650">R$</span>
                  <input
                    type="number"
                    required
                    step="0.01"
                    placeholder="0.00"
                    value={maintenanceCost}
                    onChange={(e) => setMaintenanceCost(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 pl-8 pr-2 py-1.5 rounded text-xs font-bold focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setMaintenanceVehicleId(null)}
                  className="font-bold text-xs px-3.5 py-1.5 border border-slate-200 rounded hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs px-4 py-1.5 rounded"
                >
                  Confirmar Envio
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Fuel Log Modal */}
      {editingFuelLog && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <Fuel className="w-5 h-5 text-indigo-600" />
                <h4 className="font-sans font-bold text-sm">Editar Abastecimento</h4>
              </div>
              <button onClick={() => setEditingFuelLog(null)} className="text-slate-400 hover:text-slate-700">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                onEditFuelLog?.({
                  ...editingFuelLog,
                  vehicleId: editFuelVehicleId,
                  quantidadeLitros: Number(editFuelLitres) || 0,
                  kmInicial: editFuelKmInicial === '' ? undefined : Number(editFuelKmInicial),
                  kmFinal: editFuelKmFinal === '' ? undefined : Number(editFuelKmFinal),
                  valorPago: Number(editFuelValorPago) || 0,
                  data: editFuelData,
                  driver: editFuelDriver || undefined,
                  tipo: editFuelTipo,
                  observacao: editFuelObservacao || undefined,
                });
                setEditingFuelLog(null);
              }}
              className="p-5 space-y-4"
            >
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Veículo</label>
                  <input
                    required
                    value={editFuelVehicleId}
                    onChange={(e) => setEditFuelVehicleId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-xs focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Motorista</label>
                  <input
                    value={editFuelDriver}
                    onChange={(e) => setEditFuelDriver(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-xs focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Litros</label>
                  <input
                    required
                    type="number"
                    step="0.01"
                    value={editFuelLitres}
                    onChange={(e) => setEditFuelLitres(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-xs focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Valor Pago (R$)</label>
                  <input
                    required
                    type="number"
                    step="0.01"
                    value={editFuelValorPago}
                    onChange={(e) => setEditFuelValorPago(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-xs focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Data</label>
                  <input
                    required
                    type="date"
                    value={editFuelData}
                    onChange={(e) => setEditFuelData(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-xs focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Tipo</label>
                  <select
                    value={editFuelTipo}
                    onChange={(e) => setEditFuelTipo(e.target.value as 'POSTO' | 'GARAGEM')}
                    className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-xs focus:outline-none focus:border-indigo-500"
                  >
                    <option value="POSTO">Posto</option>
                    <option value="GARAGEM">Garagem</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Observação</label>
                <textarea
                  value={editFuelObservacao}
                  onChange={(e) => setEditFuelObservacao(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-xs focus:outline-none focus:border-indigo-500 min-h-[50px]"
                  placeholder="Observação sobre o abastecimento..."
                />
              </div>
              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setEditingFuelLog(null)}
                  className="font-bold text-xs px-3.5 py-1.5 border border-slate-200 rounded hover:bg-slate-50 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-4 py-1.5 rounded flex items-center gap-1.5 cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Lightbox: foto da nota fiscal do abastecimento */}
      {previewFotoNota && (
        <div
          className="fixed inset-0 bg-black/80 z-[200] flex items-center justify-center p-4"
          onClick={() => setPreviewFotoNota(null)}
        >
          <div className="relative max-w-2xl w-full" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setPreviewFotoNota(null)}
              className="absolute -top-10 right-0 text-white hover:text-slate-300 cursor-pointer"
              title="Fechar"
            >
              <X className="w-7 h-7" />
            </button>
            <img src={previewFotoNota} alt="Nota fiscal" className="w-full h-auto max-h-[80vh] object-contain rounded-xl shadow-2xl" />
          </div>
        </div>
      )}

    </div>
  );
}
