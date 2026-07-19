import React, { useState, useEffect, useRef, useCallback } from 'react';

interface VehicleLocation {
  vehicleId: string;
  driverName: string | null;
  lat: number;
  lng: number;
  speed: number | null;
  accuracy: number | null;
  updatedAt: string;
  plate?: string;
  vehicleName?: string;
  ignition?: boolean;
  dtGps?: string;
  battery?: number | null;
  source?: string;
}

interface TrackingTarget {
  name: string;
  lat: number;
  lng: number;
  speed: number | null;
  vehicleId: string;
  accuracy: number | null;
  updatedAt: string;
  source: string;
  plate?: string;
  address?: string;
}

const COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

function HistoryPlayer({ total, idx, setIdx }: { total: number; idx: number; setIdx: (i: number) => void }) {
  const [playing, setPlaying] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (playing) {
      intervalRef.current = setInterval(() => {
        setIdx((prev: number) => {
          if (prev >= total - 1) { setPlaying(false); return prev; }
          return prev + 1;
        });
      }, 200);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [playing, total]);

  return (
    <button
      onClick={() => {
        if (idx >= total - 1) setIdx(0);
        setPlaying(v => !v);
      }}
      style={{
        width: 44, height: 44, borderRadius: 14,
        background: playing ? 'rgba(56,189,248,0.15)' : 'rgba(255,255,255,0.06)',
        border: playing ? '1px solid rgba(56,189,248,0.3)' : '1px solid rgba(255,255,255,0.1)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: playing ? '#38bdf8' : '#e2e8f0', fontSize: 18, cursor: 'pointer',
      }}
    >
      {playing ? '⏸' : '▶'}
    </button>
  );
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'agora';
  if (min < 60) return `${min}min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

const addressCache = new Map<string, string>();

async function reverseGeocode(lat: number, lng: number): Promise<string> {
  const key = `${lat.toFixed(4)},${lng.toFixed(4)}`;
  if (addressCache.has(key)) return addressCache.get(key)!;
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
      { headers: { 'User-Agent': 'RelampagoTracker/1.0' } }
    );
    if (!res.ok) return '';
    const data = await res.json();
    const addr = data.address;
    if (!addr) return '';
    const parts: string[] = [];
    if (addr.road) parts.push(addr.road);
    if (addr.suburb || addr.neighbourhood) parts.push(addr.suburb || addr.neighbourhood);
    if (addr.city || addr.town || addr.village) parts.push(addr.city || addr.town || addr.village);
    const result = parts.join(', ') || data.display_name?.split(',').slice(0, 2).join(',') || '';
    addressCache.set(key, result);
    return result;
  } catch {
    return '';
  }
}

export default function RastreadorView() {
  const [locations, setLocations] = useState<VehicleLocation[]>([]);
  const [addresses, setAddresses] = useState<Record<string, string>>({});
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<TrackingTarget | null>(null);
  const [isLeafletLoaded, setIsLeafletLoaded] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [historyPoints, setHistoryPoints] = useState<any[]>([]);
  const [historyDate, setHistoryDate] = useState(() => {
    const d = new Date(); return d.toISOString().slice(0, 10);
  });
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyIdx, setHistoryIdx] = useState(0);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const miniMapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const miniMapRef = useRef<any>(null);
  const miniMapMarkersRef = useRef<any[]>([]);
  const markerRef = useRef<any>(null);
  const trailRef = useRef<any[]>([]);
  const historyLineRef = useRef<any>(null);
  const historyMarkerRef = useRef<any>(null);
  const historyStartMarkerRef = useRef<any>(null);
  const historyEndMarkerRef = useRef<any>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const poll = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const res = await fetch('/api/fulltrack/positions?_=' + Date.now());
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setLocations(data);
        setFetchError(null);
      }
    } catch (e: any) {
      setFetchError(e.message || 'Erro de conexão');
    } finally {
      setInitialLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    poll();
    pollRef.current = setInterval(() => poll(), 8000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [poll]);

  const handleManualRefresh = useCallback(() => {
    poll(true);
  }, [poll]);

  useEffect(() => {
    if ((window as any).L) { setIsLeafletLoaded(true); return; }
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
    script.onload = () => setIsLeafletLoaded(true);
    document.body.appendChild(script);
  }, []);

  const online: TrackingTarget[] = locations
    .filter(l => (Date.now() - new Date(l.updatedAt).getTime()) < 60 * 60 * 1000)
    .map(l => ({
      name: l.driverName || l.vehicleName || 'Motorista',
      lat: l.lat,
      lng: l.lng,
      speed: l.speed,
      vehicleId: l.vehicleId,
      accuracy: l.accuracy,
      updatedAt: l.updatedAt,
      source: l.source || 'FullTrack',
      plate: l.plate,
      address: addresses[l.vehicleId] || '',
    }));

  const filtered = online.filter(d =>
    d.name.toLowerCase().includes(search.toLowerCase()) ||
    d.vehicleId.toLowerCase().includes(search.toLowerCase()) ||
    (d.address && d.address.toLowerCase().includes(search.toLowerCase()))
  );

  // Reverse geocode all online vehicles
  useEffect(() => {
    if (online.length === 0) return;
    let cancelled = false;
    const loadAddresses = async () => {
      for (const v of online) {
        if (addresses[v.vehicleId]) continue;
        const addr = await reverseGeocode(v.lat, v.lng);
        if (!cancelled && addr) {
          setAddresses(prev => ({ ...prev, [v.vehicleId]: addr }));
        }
        await new Promise(r => setTimeout(r, 1100));
      }
    };
    loadAddresses();
    return () => { cancelled = true; };
  }, [online.map(v => v.vehicleId).join(',')]);

  // Minimap — shows all vehicles
  useEffect(() => {
    if (!isLeafletLoaded || !miniMapContainerRef.current || selected) return;
    const L = (window as any).L;
    if (!L) return;

    if (!miniMapRef.current) {
      miniMapRef.current = L.map(miniMapContainerRef.current, {
        zoomControl: false,
        attributionControl: false,
        dragging: false,
        scrollWheelZoom: false,
        doubleClickZoom: false,
        touchZoom: false,
        keyboard: false,
      });

      L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        maxZoom: 19,
      }).addTo(miniMapRef.current);
    }

    // Clear old markers
    miniMapMarkersRef.current.forEach(m => miniMapRef.current.removeLayer(m));
    miniMapMarkersRef.current = [];

    if (online.length === 0) return;

    const bounds: [number, number][] = [];

    online.forEach((v, i) => {
      const color = COLORS[i % COLORS.length];
      const iconHtml = `<div style="width:14px;height:14px;border-radius:50%;background:${color};border:2.5px solid white;box-shadow:0 1px 6px rgba(0,0,0,0.4)"></div>`;
      const icon = L.divIcon({ html: iconHtml, className: '', iconSize: [14, 14], iconAnchor: [7, 7] });
      const marker = L.marker([v.lat, v.lng], { icon })
        .bindTooltip(v.plate || v.name, { permanent: false, direction: 'top', offset: L.point(0, -10) })
        .addTo(miniMapRef.current);
      miniMapMarkersRef.current.push(marker);
      bounds.push([v.lat, v.lng]);
    });

    if (bounds.length > 0) {
      miniMapRef.current.fitBounds(bounds, { padding: [30, 30], maxZoom: 14 });
    }
  }, [online, isLeafletLoaded, selected]);

  // Cleanup minimap on unmount or when selecting a vehicle
  useEffect(() => {
    return () => {
      if (miniMapRef.current) { miniMapRef.current.remove(); miniMapRef.current = null; }
      miniMapMarkersRef.current = [];
    };
  }, []);

  useEffect(() => {
    if (selected && miniMapRef.current) {
      miniMapRef.current.remove();
      miniMapRef.current = null;
      miniMapMarkersRef.current = [];
    }
  }, [selected]);

  // Full map — selected vehicle
  useEffect(() => {
    if (!selected || !isLeafletLoaded || !mapContainerRef.current) return;
    const L = (window as any).L;
    if (!L) return;

    if (!mapRef.current) {
      mapRef.current = L.map(mapContainerRef.current, {
        zoomControl: false,
        attributionControl: false,
      }).setView([selected.lat, selected.lng], 15);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
      }).addTo(mapRef.current);

      L.control.zoom({ position: 'topright' }).addTo(mapRef.current);
    }

    mapRef.current.setView([selected.lat, selected.lng], 15);

    if (markerRef.current) mapRef.current.removeLayer(markerRef.current);

    const iconHtml = `<div style="position:relative;display:flex;align-items:center;justify-content:center">
      <div style="position:absolute;width:36px;height:36px;border-radius:50%;background:rgba(34,197,94,0.15);animation:pulse 2s ease-in-out infinite"></div>
      <div style="width:16px;height:16px;border-radius:50%;background:#22c55e;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);position:relative;z-index:1"></div>
    </div>`;
    const icon = L.divIcon({ html: iconHtml, className: '', iconSize: [36, 36], iconAnchor: [18, 18] });
    markerRef.current = L.marker([selected.lat, selected.lng], { icon })
      .addTo(mapRef.current)
      .bindTooltip(selected.plate || selected.name, { permanent: true, direction: 'top', offset: L.point(0, -20), className: 'rastreador-label' });

    trailRef.current.push(L.circleMarker([selected.lat, selected.lng], {
      radius: 3, fillColor: '#22c55e', fillOpacity: 0.4, stroke: false
    }).addTo(mapRef.current));

    if (trailRef.current.length > 30) {
      const old = trailRef.current.shift();
      mapRef.current.removeLayer(old);
    }

    return () => {};
  }, [selected, isLeafletLoaded]);

  useEffect(() => {
    if (!selected) return;
    const updated = online.find(d => d.vehicleId === selected.vehicleId);
    if (updated) {
      setSelected(prev => {
        if (!prev) return prev;
        if (prev.lat === updated.lat && prev.lng === updated.lng && prev.speed === updated.speed && prev.updatedAt === updated.updatedAt && prev.address === updated.address) return prev;
        return { ...prev, lat: updated.lat, lng: updated.lng, speed: updated.speed, updatedAt: updated.updatedAt, address: updated.address };
      });
    }
  }, [locations]);

  useEffect(() => {
    return () => {
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }
      markerRef.current = null;
      trailRef.current = [];
    };
  }, []);

  // Fetch history from FullTrack real API
  const fetchHistory = useCallback(async () => {
    if (!selected || !showHistory) return;
    setHistoryLoading(true);
    setHistoryError(null);
    try {
      const d = new Date(historyDate);
      const pad = (n: number) => n.toString().padStart(2, '0');
      const dtInitial = `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} 00:00:00`;
      const dtFinal = `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} 23:59:59`;
      const res = await fetch(
        `/api/fulltrack/positions-history?vehicle_id=${selected.vehicleId}&dt_initial=${encodeURIComponent(dtInitial)}&dt_final=${encodeURIComponent(dtFinal)}`
      );
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        setHistoryError(errData.error || `Erro ${res.status}`);
        setHistoryPoints([]);
        return;
      }
      const data = await res.json();
      const pts = (data.points || []).sort((a: any, b: any) => a.ts - b.ts);
      setHistoryPoints(pts);
      setHistoryIdx(0);
    } catch (e: any) {
      setHistoryError(e.message || 'Erro de conexão');
      setHistoryPoints([]);
    }
    setHistoryLoading(false);
  }, [selected, showHistory, historyDate]);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  // Draw history polyline + markers on map
  useEffect(() => {
    if (!selected || !isLeafletLoaded || !mapRef.current || !showHistory || historyPoints.length === 0) return;
    const L = (window as any).L;
    if (!L) return;

    // Remove old layers
    if (historyLineRef.current) { mapRef.current.removeLayer(historyLineRef.current); historyLineRef.current = null; }
    if (historyMarkerRef.current) { mapRef.current.removeLayer(historyMarkerRef.current); historyMarkerRef.current = null; }
    if (historyStartMarkerRef.current) { mapRef.current.removeLayer(historyStartMarkerRef.current); historyStartMarkerRef.current = null; }
    if (historyEndMarkerRef.current) { mapRef.current.removeLayer(historyEndMarkerRef.current); historyEndMarkerRef.current = null; }

    const latlngs = historyPoints.map((p: any) => [p.lat, p.lng] as [number, number]);

    // Draw full polyline (dimmed)
    historyLineRef.current = L.polyline(latlngs, {
      color: '#38bdf8', weight: 4, opacity: 0.3,
      dashArray: '6 4',
    }).addTo(mapRef.current);

    // Start marker (green)
    const startIcon = L.divIcon({
      html: '<div style="width:14px;height:14px;border-radius:50%;background:#22c55e;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.4)"></div>',
      className: '', iconSize: [14, 14], iconAnchor: [7, 7],
    });
    historyStartMarkerRef.current = L.marker(latlngs[0], { icon: startIcon })
      .bindTooltip('Início', { permanent: true, direction: 'top', offset: L.point(0, -10), className: 'rastreador-label' })
      .addTo(mapRef.current);

    // End marker (red)
    const endIcon = L.divIcon({
      html: '<div style="width:14px;height:14px;border-radius:50%;background:#ef4444;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.4)"></div>',
      className: '', iconSize: [14, 14], iconAnchor: [7, 7],
    });
    historyEndMarkerRef.current = L.marker(latlngs[latlngs.length - 1], { icon: endIcon })
      .bindTooltip('Fim', { permanent: true, direction: 'top', offset: L.point(0, -10), className: 'rastreador-label' })
      .addTo(mapRef.current);

    // Fit bounds
    mapRef.current.fitBounds(historyLineRef.current.getBounds(), { padding: [50, 50] });
  }, [selected, isLeafletLoaded, showHistory, historyPoints]);

  // Position marker along scrubber
  useEffect(() => {
    if (!selected || !isLeafletLoaded || !mapRef.current || !showHistory || historyPoints.length === 0) return;
    const L = (window as any).L;
    if (!L) return;

    if (historyMarkerRef.current) { mapRef.current.removeLayer(historyMarkerRef.current); historyMarkerRef.current = null; }

    const pt = historyPoints[historyIdx];
    if (!pt) return;

    const icon = L.divIcon({
      html: `<div style="position:relative;display:flex;align-items:center;justify-content:center">
        <div style="position:absolute;width:30px;height:30px;border-radius:50%;background:rgba(56,189,248,0.2);animation:pulse 1.5s ease-in-out infinite"></div>
        <div style="width:14px;height:14px;border-radius:50%;background:#38bdf8;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.4);position:relative;z-index:1"></div>
      </div>`,
      className: '', iconSize: [30, 30], iconAnchor: [15, 15],
    });

    historyMarkerRef.current = L.marker([pt.lat, pt.lng], { icon })
      .addTo(mapRef.current);

    mapRef.current.setView([pt.lat, pt.lng], mapRef.current.getZoom());
  }, [historyIdx, historyPoints, isLeafletLoaded, showHistory]);

  const handleBack = () => {
    setSelected(null);
    setShowHistory(false);
    setHistoryPoints([]);
    setHistoryIdx(0);
    if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }
    markerRef.current = null;
    trailRef.current = [];
    historyLineRef.current = null;
    historyMarkerRef.current = null;
    historyStartMarkerRef.current = null;
    historyEndMarkerRef.current = null;
  };

  if (selected) {
    return (
      <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: '#020617' }}>
        <style>{`
          @keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.5;transform:scale(1.3)} }
          .rastreador-label { background: rgba(0,0,0,0.75) !important; color: #f1f5f9 !important; border: none !important; border-radius: 8px !important; padding: 4px 10px !important; font-size: 12px !important; font-weight: 700 !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif !important; box-shadow: 0 2px 8px rgba(0,0,0,0.3) !important; }
          .rastreador-label::before { border-top-color: rgba(0,0,0,0.75) !important; }
        `}</style>

        <div ref={mapContainerRef} style={{ position: 'absolute', inset: 0 }} />

        <button
          onClick={handleBack}
          style={{
            position: 'absolute', top: 16, left: 16, zIndex: 1000,
            width: 44, height: 44, borderRadius: 14,
            background: 'rgba(2,6,23,0.85)', backdropFilter: 'blur(12px)',
            border: '1px solid rgba(255,255,255,0.08)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#e2e8f0', fontSize: 20, cursor: 'pointer',
          }}
        >
          ‹
        </button>

        {/* Histórico toggle */}
        <button
          onClick={() => { setShowHistory(v => !v); }}
          style={{
            position: 'absolute', top: 16, left: 68, zIndex: 1000,
            height: 44, borderRadius: 14, padding: '0 16px',
            background: showHistory ? 'rgba(56,189,248,0.15)' : 'rgba(2,6,23,0.85)',
            backdropFilter: 'blur(12px)',
            border: showHistory ? '1px solid rgba(56,189,248,0.3)' : '1px solid rgba(255,255,255,0.08)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: 6, color: showHistory ? '#38bdf8' : '#e2e8f0', fontSize: 13,
            fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
          }}
        >
          <span style={{ fontSize: 16 }}>📅</span>
          {showHistory ? 'Voltar ao Live' : 'Histórico'}
        </button>

        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 1000,
          background: 'linear-gradient(transparent, rgba(2,6,23,0.95) 30%)',
          padding: '40px 20px 28px',
        }}>
          {showHistory ? (
            /* ── History Controls ── */
            <div style={{
              background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(56,189,248,0.15)',
              borderRadius: 18, padding: 18,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <span style={{ fontSize: 18 }}>📅</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 800, color: '#38bdf8' }}>Histórico de Rota</div>
                  <div style={{ fontSize: 11, color: '#64748b' }}>
                    {historyPoints.length} ponto{historyPoints.length !== 1 ? 's' : ''} registrado{historyPoints.length !== 1 ? 's' : ''}
                  </div>
                </div>
                <input
                  type="date"
                  value={historyDate}
                  onChange={e => setHistoryDate(e.target.value)}
                  max={new Date().toISOString().slice(0, 10)}
                  style={{
                    background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 10, padding: '8px 12px', color: '#e2e8f0',
                    fontSize: 13, fontFamily: 'inherit', outline: 'none',
                  }}
                />
                <button
                  onClick={fetchHistory}
                  disabled={historyLoading}
                  style={{
                    width: 36, height: 36, borderRadius: 10,
                    background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: historyLoading ? '#38bdf8' : '#94a3b8', fontSize: 14, cursor: historyLoading ? 'wait' : 'pointer',
                  }}
                  title="Recarregar histórico"
                >
                  <span className={historyLoading ? 'rt-spin' : ''}>🔄</span>
                </button>
              </div>

              {historyLoading ? (
                <div style={{ textAlign: 'center', padding: '20px 0' }}>
                  <div className="rt-spin" style={{ fontSize: 24, marginBottom: 8 }}>🔄</div>
                  <div style={{ fontSize: 13, color: '#64748b' }}>Carregando histórico...</div>
                </div>
              ) : historyError ? (
                <div style={{ textAlign: 'center', padding: '16px 0' }}>
                  <div style={{ fontSize: 13, color: '#ef4444', fontWeight: 700 }}>Erro ao carregar</div>
                  <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>{historyError}</div>
                  <button
                    onClick={fetchHistory}
                    style={{
                      marginTop: 10, background: 'rgba(56,189,248,0.1)', border: '1px solid rgba(56,189,248,0.3)',
                      borderRadius: 8, padding: '6px 16px', color: '#38bdf8', fontSize: 12,
                      fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                    }}
                  >
                    Tentar novamente
                  </button>
                </div>
              ) : historyPoints.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '16px 0' }}>
                  <div style={{ fontSize: 13, color: '#64748b' }}>Nenhum ponto registrado neste dia</div>
                  <div style={{ fontSize: 11, color: '#475569', marginTop: 4 }}>Os dados começam a se acumular a cada 8 segundos</div>
                </div>
              ) : (
                <>
                  {/* Time display */}
                  <div style={{
                    textAlign: 'center', marginBottom: 10,
                    fontSize: 13, color: '#94a3b8', fontFamily: 'SF Mono, monospace',
                  }}>
                    {new Date(historyPoints[historyIdx]?.ts || 0).toLocaleTimeString('pt-BR')}
                    {historyPoints[historyIdx]?.speed != null && historyPoints[historyIdx].speed > 0 && (
                      <span style={{ marginLeft: 10, color: '#4ade80', fontWeight: 700 }}>
                        {Math.round(historyPoints[historyIdx].speed)} km/h
                      </span>
                    )}
                  </div>

                  {/* Scrubber */}
                  <input
                    type="range"
                    min={0}
                    max={historyPoints.length - 1}
                    value={historyIdx}
                    onChange={e => setHistoryIdx(parseInt(e.target.value))}
                    style={{
                      width: '100%', height: 6, borderRadius: 3,
                      background: 'rgba(255,255,255,0.06)', outline: 'none',
                      accentColor: '#38bdf8', cursor: 'pointer',
                    }}
                  />

                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
                    <span style={{ fontSize: 10, color: '#475569' }}>
                      {new Date(historyPoints[0]?.ts || 0).toLocaleTimeString('pt-BR')}
                    </span>
                    <span style={{ fontSize: 10, color: '#475569' }}>
                      {new Date(historyPoints[historyPoints.length - 1]?.ts || 0).toLocaleTimeString('pt-BR')}
                    </span>
                  </div>

                  {/* Play/Pause button */}
                  <div style={{ display: 'flex', justifyContent: 'center', marginTop: 10 }}>
                    <HistoryPlayer
                      total={historyPoints.length}
                      idx={historyIdx}
                      setIdx={setHistoryIdx}
                    />
                  </div>
                </>
              )}
            </div>
          ) : (
            /* ── Normal Live Detail ── */
            <div style={{
              background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: 18, padding: 18,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                <div style={{
                  width: 10, height: 10, borderRadius: '50%',
                  background: '#22c55e', boxShadow: '0 0 8px rgba(34,197,94,0.5)',
                  animation: 'pulse 2s ease-in-out infinite',
                }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 17, fontWeight: 800, color: '#f1f5f9' }}>{selected.plate || selected.name}</div>
                  <div style={{ fontSize: 12, color: '#64748b', fontFamily: 'SF Mono, monospace', marginTop: 1 }}>
                    {selected.name} · {selected.source}
                  </div>
                  {selected.address && (
                    <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 3 }}>
                      📍 {selected.address}
                    </div>
                  )}
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 28, fontWeight: 800, color: '#f1f5f9', fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
                    {selected.speed != null ? Math.round(selected.speed) : '—'}
                  </div>
                  <div style={{ fontSize: 11, color: '#64748b' }}>km/h</div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <div style={{
                  flex: 1, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.04)',
                  borderRadius: 12, padding: '10px 12px', textAlign: 'center',
                }}>
                  <div style={{ fontSize: 10, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 }}>Precisão</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#e2e8f0', fontVariantNumeric: 'tabular-nums' }}>
                    {selected.accuracy != null ? `±${Math.round(selected.accuracy)}m` : '—'}
                  </div>
                </div>
                <div style={{
                  flex: 1, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.04)',
                  borderRadius: 12, padding: '10px 12px', textAlign: 'center',
                }}>
                  <div style={{ fontSize: 10, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 }}>Atualizado</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#e2e8f0' }}>
                    {timeAgo(selected.updatedAt)}
                  </div>
                </div>
                <div style={{
                  flex: 1, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.04)',
                  borderRadius: 12, padding: '10px 12px', textAlign: 'center',
                }}>
                  <div style={{ fontSize: 10, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 }}>Fonte</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#e2e8f0' }}>
                    {selected.source}
                  </div>
                </div>
              </div>

              <div style={{
                marginTop: 10, fontSize: 11, color: '#475569', fontFamily: 'SF Mono, monospace',
                textAlign: 'center', fontVariantNumeric: 'tabular-nums',
              }}>
                {selected.lat.toFixed(6)}, {selected.lng.toFixed(6)}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#020617', color: '#e2e8f0', fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
      <style>{`
        @keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.5;transform:scale(1.3)} }
        @keyframes fadeInUp { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        .rt-card { animation: fadeInUp 0.4s ease backwards; }
        .rt-card:nth-child(2) { animation-delay: 0.05s; }
        .rt-card:nth-child(3) { animation-delay: 0.1s; }
        .rt-card:nth-child(4) { animation-delay: 0.15s; }
        .rt-card:nth-child(5) { animation-delay: 0.2s; }
        .rt-card:active { transform: scale(0.97) !important; }
        .rt-search:focus-within { border-color: rgba(56,189,248,0.4) !important; box-shadow: 0 0 0 3px rgba(56,189,248,0.1) !important; }
        .rt-spin { animation: spin 0.8s linear infinite; display: inline-block; }
      `}</style>

      {/* Header */}
      <div style={{ padding: '24px 24px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <button
            onClick={() => window.history.back()}
            style={{
              width: 44, height: 44, borderRadius: 14,
              background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#94a3b8', fontSize: 18, cursor: 'pointer',
            }}
          >
            ‹
          </button>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#f1f5f9', letterSpacing: '-0.02em' }}>Rastreamento</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              onClick={handleManualRefresh}
              disabled={refreshing}
              style={{
                width: 36, height: 36, borderRadius: 12,
                background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: refreshing ? '#38bdf8' : '#94a3b8', fontSize: 16, cursor: refreshing ? 'wait' : 'pointer',
              }}
              title="Atualizar posições"
            >
              <span className={refreshing ? 'rt-spin' : ''}>🔄</span>
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 20, background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)' }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e', animation: 'pulse 2s ease-in-out infinite' }} />
              <span style={{ fontSize: 11, color: '#4ade80', fontWeight: 700 }}>LIVE</span>
            </div>
          </div>
        </div>
      </div>

      {/* Minimap */}
      {online.length > 0 && (
        <div style={{ padding: '16px 24px 0' }}>
          <div style={{
            borderRadius: 18, overflow: 'hidden',
            border: '1px solid rgba(255,255,255,0.06)',
            height: 180,
          }}>
            <div ref={miniMapContainerRef} style={{ width: '100%', height: '100%' }} />
          </div>
          <div style={{ fontSize: 10, color: '#475569', textAlign: 'center', marginTop: 6 }}>
            {online.length} veículo{online.length !== 1 ? 's' : ''} no mapa
          </div>
        </div>
      )}

      {/* Search */}
      <div style={{ padding: '16px 24px 0' }}>
        <div className="rt-search" style={{
          background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: 16, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 10,
          transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
        }}>
          <span style={{ color: '#475569', fontSize: 14 }}>🔍</span>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nome, placa ou endereço..."
            style={{ background: 'none', border: 'none', outline: 'none', color: '#e2e8f0', fontSize: 15, width: '100%', fontFamily: 'inherit' }}
          />
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'flex', gap: 8, padding: '16px 24px 0' }}>
        {[
          { val: online.length, label: 'Online', color: '#22c55e' },
          { val: online.filter(d => d.source === 'FullTrack').length, label: 'FullTrack', color: '#3b82f6' },
          { val: online.filter(d => d.source === 'PWA').length, label: 'PWA', color: '#f59e0b' },
        ].map((s, i) => (
          <div key={i} style={{
            flex: 1, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: 12, padding: 12, textAlign: 'center',
          }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#f1f5f9', fontVariantNumeric: 'tabular-nums' }}>{s.val}</div>
            <div style={{ fontSize: 10, color: s.color, marginTop: 2, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 600 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Driver List */}
      <div style={{ padding: '16px 24px 100px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1 }}>Motoristas</span>
          <span style={{ fontSize: 11, color: '#475569' }}>{filtered.length} encontrado{filtered.length !== 1 ? 's' : ''}</span>
        </div>

        {initialLoading ? (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <div className="rt-spin" style={{ fontSize: 32, marginBottom: 12 }}>🔄</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#64748b' }}>Conectando ao GPS...</div>
            <div style={{ fontSize: 12, color: '#475569', marginTop: 4 }}>Aguarde um momento</div>
          </div>
        ) : fetchError ? (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <div style={{ fontSize: 36, marginBottom: 8 }}>⚠️</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#ef4444' }}>Erro ao conectar</div>
            <div style={{ fontSize: 12, color: '#64748b', marginTop: 4, marginBottom: 16 }}>{fetchError}</div>
            <button
              onClick={handleManualRefresh}
              style={{
                background: 'rgba(56,189,248,0.1)', border: '1px solid rgba(56,189,248,0.3)',
                borderRadius: 12, padding: '10px 24px', color: '#38bdf8', fontSize: 13,
                fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              Tentar novamente
            </button>
          </div>
        ) : filtered.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <div style={{ fontSize: 36, marginBottom: 8 }}>📡</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#475569' }}>
              {online.length === 0 ? 'Nenhum motorista online' : 'Nenhum resultado'}
            </div>
            <div style={{ fontSize: 12, color: '#334155', marginTop: 4 }}>
              {online.length === 0 ? 'Verifique se o GPS está conectado' : 'Tente outro termo de busca'}
            </div>
            {online.length === 0 && (
              <button
                onClick={handleManualRefresh}
                style={{
                  marginTop: 16, background: 'rgba(56,189,248,0.1)', border: '1px solid rgba(56,189,248,0.3)',
                  borderRadius: 12, padding: '10px 24px', color: '#38bdf8', fontSize: 13,
                  fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                Atualizar agora
              </button>
            )}
          </div>
        ) : (
          filtered.map((d, i) => (
            <div
              key={d.vehicleId}
              className="rt-card"
              onClick={() => setSelected(d)}
              style={{
                background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: 18, padding: 16, marginBottom: 10,
                cursor: 'pointer',
                transition: 'transform 0.15s ease, background 0.15s ease, border-color 0.15s ease',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 14,
                  background: `linear-gradient(135deg, ${COLORS[i % COLORS.length]}, ${COLORS[i % COLORS.length]}88)`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 16, fontWeight: 800, color: 'white', flexShrink: 0,
                }}>
                  {d.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#f1f5f9' }}>{d.plate || d.name}</div>
                  <div style={{ fontSize: 12, color: '#64748b', marginTop: 1 }}>
                    {d.name}
                  </div>
                  {d.address ? (
                    <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      📍 {d.address}
                    </div>
                  ) : (
                    <div style={{ fontSize: 11, color: '#475569', marginTop: 3 }}>
                      {d.source} · {timeAgo(d.updatedAt)} atrás
                    </div>
                  )}
                  {d.address && (
                    <div style={{ fontSize: 10, color: '#475569', marginTop: 2 }}>
                      {d.source} · {timeAgo(d.updatedAt)} atrás
                    </div>
                  )}
                </div>
                <div style={{
                  fontSize: 14, fontWeight: 800,
                  padding: '6px 12px', borderRadius: 12,
                  fontVariantNumeric: 'tabular-nums', flexShrink: 0,
                  background: d.speed != null && d.speed > 0 ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)',
                  color: d.speed != null && d.speed > 0 ? '#4ade80' : '#f87171',
                }}>
                  {d.speed != null ? Math.round(d.speed) : '—'}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
