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
  const pwaDataRef = useRef<VehicleLocation[]>([]);
  const [addresses, setAddresses] = useState<Record<string, string>>({});
  const [flyTo, setFlyTo] = useState<{ lat: number; lng: number } | null>(null);
  // Normalize plate: remove non-alphanumeric, lowercase
  const normPlate = (s: string) => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');

  // Merge FT + PWA → FullTrack always wins
  const mergeAndUpdate = useCallback(() => {
    const ft = ftDataRef.current;
    const pwa = pwaDataRef.current;

    if (ft.length === 0 && pwa.length === 0) return;

    // 1) FullTrack entries keyed by vehicleId (FT-xxx)
    const merged = new Map<string, VehicleLocation>();
    for (const v of ft) merged.set(v.vehicleId, v);

    // Build lookup sets for deduplication
    const ftIds = new Set(ft.map(f => f.vehicleId));
    const ftPlates = new Set(ft.filter(f => f.plate).map(f => normPlate(f.plate!)));
    const ftNames = new Set(ft.filter(f => f.vehicleName).map(f => f.vehicleName!.toLowerCase().trim()));
    const ftDriverNames = new Set(ft.map(f => (f.driverName || '').toLowerCase().trim()));

    // 2) PWA entries — only add if NOT already covered by FullTrack
    for (const p of pwa) {
      const pVid = normPlate(p.vehicleId || '');
      const pName = (p.driverName || '').toLowerCase().trim();
      // Skip if FT has same vehicleId
      if (ftIds.has(p.vehicleId)) continue;
      // Skip if FT has matching plate (normalize both sides)
      if (ftPlates.has(pVid)) continue;
      // Skip if FT has matching driver name
      if (ftDriverNames.has(pName)) continue;
      // Skip if FT has matching vehicle name
      if (ftNames.has(pName)) continue;
      merged.set(p.vehicleId, p);
    }

    const result = Array.from(merged.values());
    prevRef.current = result;
    setLocations(result);
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
            mergeAndUpdate();
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
                  mergeAndUpdate();
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
  }, [mergeAndUpdate]);

  // Poll PWA (Turso) a cada 10s
  useEffect(() => {
    const pollPwa = async () => {
      try {
        const res = await fetch('/api/vehicle-locations?_=' + Date.now());
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) {
            pwaDataRef.current = data;
            mergeAndUpdate();
          }
        }
      } catch {}
    };
    pollPwa();
    const id = setInterval(pollPwa, 10000);
    return () => clearInterval(id);
  }, [mergeAndUpdate]);

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
            FullTrack + GPS PWA · Tempo real
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
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-sm font-bold font-sans text-slate-800 flex items-center gap-2">
            <Navigation className="w-4 h-4 text-emerald-500" />
            Motoristas Online
          </h3>
          <span className="text-[10px] font-bold text-slate-400">
            Tempo real via SSE
          </span>
        </div>
        <div className="divide-y divide-slate-100">
          {displayList.length === 0 ? (
            <div className="px-5 py-8 text-center">
              <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-xs font-semibold text-slate-400">Nenhum motorista online no momento</p>
              <p className="text-[10px] text-slate-300 mt-1">Aguardando dados de GPS...</p>
            </div>
          ) : (
            displayList.map((l, i) => {
              const addrKey = l.lat && l.lng ? `${l.lat.toFixed(4)},${l.lng.toFixed(4)}` : '';
              const addr = addrKey ? addresses[addrKey] : '';
              return (
                <div
                  key={l.vehicleId || i}
                  className="px-5 py-3 flex items-center justify-between hover:bg-slate-50 transition-colors cursor-pointer"
                  onClick={() => { if (l.lat && l.lng) setFlyTo({ lat: l.lat, lng: l.lng }); }}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-2 h-2 rounded-full shrink-0 ${l.source === 'fulltrack' ? 'bg-blue-500' : 'bg-violet-500'} animate-pulse`} />
                    <div className="min-w-0">
                      <span className="text-sm font-semibold text-slate-800 block truncate">{l.driverName}</span>
                      <span className="text-[10px] text-slate-400 font-medium block truncate max-w-[300px]">
                        {l.plate && <span className="text-slate-500 font-bold">{l.plate}</span>}
                        {!l.plate && l.vehicleId}
                        {l.ignition === false && <span className="ml-1 text-amber-500">ign off</span>}
                        {l.speed != null && l.speed > 0 && <span className="ml-2 text-emerald-600 font-bold">{Math.round(l.speed)} km/h</span>}
                      </span>
                      {addr && (
                        <span className="text-[10px] text-slate-500 font-medium block truncate max-w-[300px] mt-0.5">
                          <MapPin className="w-3 h-3 inline mr-0.5 -mt-0.5" />{addr}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    {l.source === 'fulltrack' && (
                      <span className="text-[9px] font-bold text-blue-500 bg-blue-50 px-1.5 py-0.5 rounded">FT</span>
                    )}
                    {l.lat && l.lng && !addr && (
                      <span className="text-[10px] font-mono text-slate-400">
                        {l.lat.toFixed(4)}, {l.lng.toFixed(4)}
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
