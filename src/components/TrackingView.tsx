import React, { useState, useEffect, useCallback, useRef } from 'react';
import { MapPin, Users, RefreshCw, Navigation, Truck, Smartphone } from 'lucide-react';
import { Vehicle } from '../types';
import DriverLiveMap from './DriverLiveMap';

interface VehicleLocation {
  vehicleId: string;
  driverName: string | null;
  lat: number;
  lng: number;
  speed: number | null;
  accuracy: number | null;
  updatedAt: string;
  source?: string;
  plate?: string;
  vehicleName?: string;
  ignition?: boolean;
}

interface TrackingViewProps {
  vehicles: Vehicle[];
  motoristas: string[];
}

export default function TrackingView({ vehicles, motoristas }: TrackingViewProps) {
  const [locations, setLocations] = useState<VehicleLocation[]>([]);
  const prevRef = useRef<VehicleLocation[]>([]);

  const poll = useCallback(async () => {
    try {
      const [pwaRes, ftRes] = await Promise.allSettled([
        fetch('/api/vehicle-locations?_=' + Date.now()),
        fetch('/api/fulltrack/positions?_=' + Date.now()),
      ]);

      const pwaData = pwaRes.status === 'fulfilled' && pwaRes.value.ok
        ? await pwaRes.value.json().catch(() => []) : [];
      const ftData = ftRes.status === 'fulfilled' && ftRes.value.ok
        ? await ftRes.value.json().catch(() => []) : [];

      const pwa: VehicleLocation[] = Array.isArray(pwaData) ? pwaData : [];
      const ft: VehicleLocation[] = Array.isArray(ftData) ? ftData : [];

      // Se AMBOS falharam, não limpa — mantém dados anteriores
      if (ft.length === 0 && pwa.length === 0) return;

      // Merge: novos dados substituem, mas dados antigos ficam se não foram retornados
      const merged = new Map<string, VehicleLocation>();

      // Preserva dados anteriores que não vieram nesta resposta
      for (const prev of prevRef.current) {
        merged.set(prev.vehicleId, prev);
      }

      // FullTrack sobrescreve tudo (dados mais frescos)
      for (const v of ft) merged.set(v.vehicleId, v);

      // PWA só preenche quem não veio do FullTrack
      const ftVehicleIds = new Set(ft.map(f => f.vehicleId));
      const ftPlates = new Set(ft.filter(f => f.plate).map(f => f.plate!.toLowerCase()));
      const ftNames = new Set(ft.filter(f => f.vehicleName).map(f => f.vehicleName!.toLowerCase()));

      for (const p of pwa) {
        if (ftVehicleIds.has(p.vehicleId)) continue;
        const pName = (p.driverName || '').toLowerCase();
        const pVid = (p.vehicleId || '').toLowerCase();
        if (ftNames.has(pName)) continue;
        if (ftPlates.has(pVid.replace('ot-', ''))) continue;
        merged.set(p.vehicleId, p);
      }

      const result = Array.from(merged.values());
      prevRef.current = result;
      setLocations(result);
    } catch {}
  }, []);

  useEffect(() => {
    poll();
    const id = setInterval(poll, 10000);
    return () => clearInterval(id);
  }, [poll]);

  // Filtra só motoristas com localização recente (últimos 60 min)
  const now = Date.now();
  const online = locations.filter(l => {
    const diff = now - new Date(l.updatedAt).getTime();
    if (diff >= 60 * 60 * 1000) return false;
    const name = (l.driverName || '').toLowerCase().trim();
    const vid = (l.vehicleId || '').toLowerCase().trim();
    const plate = (l.plate || '').toLowerCase().trim();
    return motoristas.some(m => {
      const ml = m.toLowerCase().trim();
      if (name === ml || name.includes(ml) || ml.includes(name)) return true;
      if (vid.includes(ml) || ml.includes(vid.replace('ot-', '').replace('ft-', ''))) return true;
      if (plate && (plate.includes(ml) || ml.includes(plate))) return true;
      return false;
    });
  });

  // Se não tem motoristas configurados, mostra todos os online
  const displayList = motoristas.length > 0 ? online : locations.filter(l => {
    const diff = now - new Date(l.updatedAt).getTime();
    return diff < 60 * 60 * 1000;
  });

  const onlineUsers = displayList.map(l => ({
    name: l.driverName || 'Motorista',
    lat: l.lat,
    lng: l.lng,
    speed: l.speed,
    accuracy: l.accuracy,
    vehicleId: l.vehicleId,
  }));

  const pwaCount = displayList.filter(l => l.source !== 'fulltrack').length;
  const ftCount = displayList.filter(l => l.source === 'fulltrack').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black font-sans text-slate-900 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-emerald-600" />
            Rastreamento de Motoristas
          </h2>
          <p className="text-xs text-slate-400 font-medium mt-0.5">
            FullTrack + GPS PWA · Últimos 60 min de atividade
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-emerald-50 border border-emerald-200/60 px-3 py-1.5 rounded-lg text-xs font-bold text-emerald-700 flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5" />
            {displayList.length} online
          </div>
          {ftCount > 0 && (
            <div className="bg-blue-50 border border-blue-200/60 px-2.5 py-1.5 rounded-lg text-[10px] font-bold text-blue-600 flex items-center gap-1">
              <Truck className="w-3 h-3" />
              {ftCount} rastreador
            </div>
          )}
          {pwaCount > 0 && (
            <div className="bg-violet-50 border border-violet-200/60 px-2.5 py-1.5 rounded-lg text-[10px] font-bold text-violet-600 flex items-center gap-1">
              <Smartphone className="w-3 h-3" />
              {pwaCount} PWA
            </div>
          )}
          <button
            type="button"
            onClick={poll}
            className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Atualizar
          </button>
        </div>
      </div>

      {/* Live Map — só onlineUsers (FullTrack + PWA GPS real), sem vehicles fake */}
      <DriverLiveMap
        coords={null}
        vehicles={[]}
        error={null}
        onRetry={() => {}}
        onlineUsers={onlineUsers}
        isDriverUser={false}
      />

      {/* Online Drivers List */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-sm font-bold font-sans text-slate-800 flex items-center gap-2">
            <Navigation className="w-4 h-4 text-emerald-500" />
            Motoristas Online
          </h3>
          <span className="text-[10px] font-bold text-slate-400">
            Últimos 60 minutos
          </span>
        </div>
        <div className="divide-y divide-slate-100">
          {displayList.length === 0 ? (
            <div className="px-5 py-8 text-center">
              <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-xs font-semibold text-slate-400">Nenhum motorista online no momento</p>
              <p className="text-[10px] text-slate-300 mt-1">FullTrack + GPS PWA atualizado a cada 10s</p>
            </div>
          ) : (
            displayList.map((l, i) => (
              <div key={l.vehicleId || i} className="px-5 py-3 flex items-center justify-between hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-2 h-2 rounded-full shrink-0 ${l.source === 'fulltrack' ? 'bg-blue-500' : 'bg-violet-500'} animate-pulse`} />
                  <div className="min-w-0">
                    <span className="text-sm font-semibold text-slate-800 block truncate">{l.driverName}</span>
                    <span className="text-[10px] text-slate-400 font-medium block truncate max-w-[300px]">
                      {l.plate && <span className="text-slate-500 font-bold">{l.plate}</span>}
                      {!l.plate && l.vehicleId}
                      {l.ignition === false && <span className="ml-1 text-amber-500">ign off</span>}
                      {l.speed != null && l.speed > 0 && <span className="ml-2 text-emerald-600 font-bold">{Math.round(l.speed)} km/h</span>}
                      {l.accuracy != null && <span className="ml-2 text-slate-300">±{Math.round(l.accuracy)}m</span>}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-2">
                  {l.source === 'fulltrack' && (
                    <span className="text-[9px] font-bold text-blue-500 bg-blue-50 px-1.5 py-0.5 rounded">FT</span>
                  )}
                  {l.lat && l.lng && (
                    <span className="text-[10px] font-mono text-slate-400">
                      {l.lat.toFixed(4)}, {l.lng.toFixed(4)}
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
