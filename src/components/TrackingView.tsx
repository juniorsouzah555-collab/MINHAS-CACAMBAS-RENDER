import React, { useState, useEffect, useCallback } from 'react';
import { MapPin, Users, RefreshCw, Navigation, Loader } from 'lucide-react';
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
}

interface TrackingViewProps {
  vehicles: Vehicle[];
  motoristas: string[];
}

export default function TrackingView({ vehicles, motoristas }: TrackingViewProps) {
  const [locations, setLocations] = useState<VehicleLocation[]>([]);

  const poll = useCallback(async () => {
    try {
      const res = await fetch('/api/vehicle-locations?_=' + Date.now());
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data)) setLocations(data);
    } catch {}
  }, []);

  useEffect(() => {
    poll();
    const id = setInterval(poll, 10000); // Poll a cada 10s pra tempo real
    return () => clearInterval(id);
  }, [poll]);

  // Filtra só motoristas com localização recente (últimos 30 min)
  const now = Date.now();
  const online = locations.filter(l => {
    const diff = now - new Date(l.updatedAt).getTime();
    if (diff >= 30 * 60 * 1000) return false;
    const name = (l.driverName || '').toLowerCase();
    const vid = (l.vehicleId || '').toLowerCase();
    return motoristas.some(m => {
      const ml = m.toLowerCase();
      return ml === name || ml.startsWith(name) || vid.includes(ml) || vid.startsWith('ot-' + ml);
    });
  });

  const onlineUsers = online.map(l => ({
    name: l.driverName || 'Motorista',
    lat: l.lat,
    lng: l.lng,
    speed: l.speed,
    accuracy: l.accuracy,
    vehicleId: l.vehicleId,
  }));

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
            GPS a cada 5min ou 100m · ETag cache (egress mínimo)
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-emerald-50 border border-emerald-200/60 px-3 py-1.5 rounded-lg text-xs font-bold text-emerald-700 flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5" />
            {online.length} online
          </div>
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

      {/* Live Map */}
      <DriverLiveMap
        coords={null}
        vehicles={vehicles.filter(v => (v.status === 'In Transit' || v.status === 'Assigned') && motoristas.some(m => m.toLowerCase() === (v.driver || '').toLowerCase()))}
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
            Últimos 30 minutos
          </span>
        </div>
        <div className="divide-y divide-slate-100">
          {online.length === 0 ? (
            <div className="px-5 py-8 text-center">
              <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-xs font-semibold text-slate-400">Nenhum motorista online no momento</p>
              <p className="text-[10px] text-slate-300 mt-1">GPS atualizado a cada 5 minutos pelo PWA</p>
            </div>
          ) : (
            online.map((l, i) => (
              <div key={l.vehicleId || i} className="px-5 py-3 flex items-center justify-between hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                  <div className="min-w-0">
                    <span className="text-sm font-semibold text-slate-800 block truncate">{l.driverName}</span>
                    <span className="text-[10px] text-slate-400 font-medium block truncate max-w-[300px]">
                      {l.vehicleId}
                      {l.speed != null && l.speed > 0 && <span className="ml-2 text-emerald-600 font-bold">{Math.round(l.speed)} km/h</span>}
                      {l.accuracy != null && <span className="ml-2 text-slate-300">±{Math.round(l.accuracy)}m</span>}
                    </span>
                  </div>
                </div>
                {l.lat && l.lng && (
                  <span className="text-[10px] font-mono text-slate-400 shrink-0 ml-2">
                    {l.lat.toFixed(4)}, {l.lng.toFixed(4)}
                  </span>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
