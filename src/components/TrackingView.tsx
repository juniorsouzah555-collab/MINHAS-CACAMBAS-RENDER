import React, { useState, useEffect, useCallback, useRef } from 'react';
import { MapPin, Users, RefreshCw, Navigation, Truck } from 'lucide-react';
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

// Cache global de endereços (sobrevive re-renders)
const addressCache = new Map<string, string>();

async function reverseGeocode(lat: number, lng: number): Promise<string> {
  const key = `${lat.toFixed(4)},${lng.toFixed(4)}`;
  if (addressCache.has(key)) return addressCache.get(key)!;
  try {
    const res = await fetch(`/api/reverse-geocode?lat=${lat}&lng=${lng}`);
    if (res.ok) {
      const data = await res.json();
      const addr = data.address || '';
      if (addr) addressCache.set(key, addr);
      return addr;
    }
  } catch {}
  return '';
}

export default function TrackingView({ vehicles, motoristas }: TrackingViewProps) {
  const [locations, setLocations] = useState<VehicleLocation[]>([]);
  const prevRef = useRef<VehicleLocation[]>([]);
  const ftDataRef = useRef<VehicleLocation[]>([]);
  const [addresses, setAddresses] = useState<Record<string, string>>({});
  const [flyTo, setFlyTo] = useState<{ lat: number; lng: number } | null>(null);

  const updateLocations = useCallback(() => {
    const ft = ftDataRef.current;
    if (ft.length === 0) return;
    prevRef.current = ft;
    setLocations(ft);
  }, []);

  // SSE: FullTrack real-time stream
  useEffect(() => {
    let es: EventSource | null = null;
    let fallbackTimer: ReturnType<typeof setInterval> | null = null;

    function connect() {
      es = new EventSource('/api/fulltrack/stream');
      es.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data);
          if (Array.isArray(data)) {
            ftDataRef.current = data;
            updateLocations();
          }
        } catch {}
      };
      es.onerror = () => {
        es?.close();
        es = null;
        if (!fallbackTimer) {
          fallbackTimer = setInterval(async () => {
            try {
              const res = await fetch('/api/fulltrack/positions?_=' + Date.now());
              if (res.ok) {
                const data = await res.json();
                if (Array.isArray(data)) {
                  ftDataRef.current = data;
                  updateLocations();
                }
              }
            } catch {}
          }, 10000);
        }
      };
    }

    connect();

    return () => {
      es?.close();
      if (fallbackTimer) clearInterval(fallbackTimer);
    };
  }, [updateLocations]);

  // Filtra só motoristas com localização recente (últimos 60 min)
  const now = Date.now();
  const recent = locations.filter(l => {
    const diff = now - new Date(l.updatedAt).getTime();
    return diff < 60 * 60 * 1000;
  });

  const online = motoristas.length > 0 ? recent.filter(l => {
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
  }) : recent;

  const displayList = motoristas.length > 0 && online.length > 0 ? online : recent;

  // Reverse geocoding: busca endereços dos veículos visíveis
  useEffect(() => {
    const toFetch = displayList.filter(l => l.lat && l.lng && !addresses[`${l.lat.toFixed(4)},${l.lng.toFixed(4)}`]);
    if (toFetch.length === 0) return;

    let cancelled = false;
    (async () => {
      const newAddresses: Record<string, string> = {};
      for (const l of toFetch) {
        const key = `${l.lat.toFixed(4)},${l.lng.toFixed(4)}`;
        const addr = await reverseGeocode(l.lat, l.lng);
        if (addr) newAddresses[key] = addr;
      }
      if (!cancelled && Object.keys(newAddresses).length > 0) {
        setAddresses(prev => ({ ...prev, ...newAddresses }));
      }
    })();
    return () => { cancelled = true; };
  }, [displayList]);

  const onlineUsers = displayList.map(l => ({
    name: l.driverName || 'Motorista',
    lat: l.lat,
    lng: l.lng,
    speed: l.speed,
    accuracy: l.accuracy,
    vehicleId: l.vehicleId,
    plate: l.plate,
  }));

  const ftCount = displayList.length;

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
            FullTrack · Tempo real
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
        </div>
      </div>

      {/* Live Map */}
      <DriverLiveMap
        coords={null}
        vehicles={[]}
        error={null}
        onRetry={() => {}}
        onlineUsers={onlineUsers}
        isDriverUser={false}
        flyTo={flyTo}
      />

      {/* Online Drivers List */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-sm font-bold font-sans text-slate-800 flex items-center gap-2">
            <Navigation className="w-4 h-4 text-emerald-500" />
            Motoristas Online
          </h3>
          <span className="text-[10px] font-bold text-slate-400">
            Tempo real via SSE
          </span>
        </div>
        <div className="p-3 space-y-2">
          {displayList.length === 0 ? (
            <div className="px-5 py-10 text-center">
              <Users className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-sm font-semibold text-slate-400">Nenhum motorista online no momento</p>
              <p className="text-xs text-slate-300 mt-1">Aguardando dados de GPS...</p>
            </div>
          ) : (
            displayList.map((l, i) => {
              const addrKey = l.lat && l.lng ? `${l.lat.toFixed(4)},${l.lng.toFixed(4)}` : '';
              const addr = addrKey ? addresses[addrKey] : '';
              const isMoving = l.speed != null && l.speed > 0;
              return (
                <div
                  key={l.vehicleId || i}
                  className="bg-slate-50 hover:bg-slate-100 border border-slate-200/60 rounded-xl px-5 py-4 flex items-center gap-4 transition-all cursor-pointer hover:shadow-md hover:border-slate-300"
                  onClick={() => { if (l.lat && l.lng) setFlyTo({ lat: l.lat, lng: l.lng }); }}
                >
                  {/* Status dot */}
                  <div className="relative shrink-0">
                    <div className={`w-3.5 h-3.5 rounded-full ${isMoving ? 'bg-emerald-500' : 'bg-blue-500'} animate-pulse`} />
                    {isMoving && (
                      <div className="absolute inset-0 w-3.5 h-3.5 rounded-full bg-emerald-400 animate-ping opacity-40" />
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg font-black text-slate-900 tracking-tight">{l.plate || l.vehicleId}</span>
                      {isMoving && (
                        <span className="text-sm font-bold text-emerald-600 bg-emerald-50 border border-emerald-200/60 px-2.5 py-0.5 rounded-lg tabular-nums">
                          {Math.round(l.speed!)} km/h
                        </span>
                      )}
                      {l.ignition === false && (
                        <span className="text-[10px] font-bold text-amber-600 bg-amber-50 border border-amber-200/60 px-2 py-0.5 rounded-md">IGN OFF</span>
                      )}
                    </div>
                    {addr ? (
                      <div className="flex items-center gap-1 text-sm text-slate-500 font-medium truncate">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{addr}</span>
                      </div>
                    ) : (
                      <div className="text-xs text-slate-400 font-medium">
                        Última atualização: {new Date(l.updatedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    )}
                  </div>

                  {/* Speed badge right side */}
                  {!isMoving && (
                    <div className="shrink-0 text-right">
                      <div className="text-xs font-bold text-slate-400">Parado</div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
