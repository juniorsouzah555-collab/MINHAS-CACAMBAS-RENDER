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
}

const COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'agora';
  if (min < 60) return `${min}min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

export default function RastreadorView() {
  const [locations, setLocations] = useState<VehicleLocation[]>([]);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<TrackingTarget | null>(null);
  const [isLeafletLoaded, setIsLeafletLoaded] = useState(false);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const trailRef = useRef<any[]>([]);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const poll = useCallback(async () => {
    try {
      const res = await fetch('/api/fulltrack/positions?_=' + Date.now());
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data)) setLocations(data);
    } catch {}
  }, []);

  useEffect(() => {
    poll();
    pollRef.current = setInterval(poll, 8000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
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
    }));

  const filtered = online.filter(d =>
    d.name.toLowerCase().includes(search.toLowerCase()) ||
    d.vehicleId.toLowerCase().includes(search.toLowerCase())
  );

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
      .bindTooltip(selected.name, { permanent: true, direction: 'top', offset: L.point(0, -20), className: 'rastreador-label' });

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
      setSelected(prev => prev ? { ...prev, lat: updated.lat, lng: updated.lng, speed: updated.speed, updatedAt: updated.updatedAt } : prev);
    }
  }, [locations]);

  useEffect(() => {
    return () => {
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }
      markerRef.current = null;
      trailRef.current = [];
    };
  }, []);

  const handleBack = () => {
    setSelected(null);
    if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }
    markerRef.current = null;
    trailRef.current = [];
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

        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 1000,
          background: 'linear-gradient(transparent, rgba(2,6,23,0.95) 30%)',
          padding: '40px 20px 28px',
        }}>
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
                <div style={{ fontSize: 17, fontWeight: 800, color: '#f1f5f9' }}>{selected.name}</div>
                <div style={{ fontSize: 12, color: '#64748b', fontFamily: 'SF Mono, monospace', marginTop: 1 }}>
                  {selected.vehicleId} · {selected.source}
                </div>
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
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#020617', color: '#e2e8f0', fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
      <style>{`
        @keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.5;transform:scale(1.3)} }
        @keyframes fadeInUp { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        .rt-card { animation: fadeInUp 0.4s ease backwards; }
        .rt-card:nth-child(2) { animation-delay: 0.05s; }
        .rt-card:nth-child(3) { animation-delay: 0.1s; }
        .rt-card:nth-child(4) { animation-delay: 0.15s; }
        .rt-card:nth-child(5) { animation-delay: 0.2s; }
        .rt-card:active { transform: scale(0.97) !important; }
        .rt-search:focus-within { border-color: rgba(56,189,248,0.4) !important; box-shadow: 0 0 0 3px rgba(56,189,248,0.1) !important; }
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 20, background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)' }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e', animation: 'pulse 2s ease-in-out infinite' }} />
            <span style={{ fontSize: 11, color: '#4ade80', fontWeight: 700 }}>LIVE</span>
          </div>
        </div>
      </div>

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
            placeholder="Buscar por nome ou placa..."
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

        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <div style={{ fontSize: 36, marginBottom: 8 }}>📡</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#475569' }}>
              {online.length === 0 ? 'Nenhum motorista online' : 'Nenhum resultado'}
            </div>
            <div style={{ fontSize: 12, color: '#334155', marginTop: 4 }}>
              {online.length === 0 ? 'GPS atualizado a cada 8 segundos' : 'Tente outro termo de busca'}
            </div>
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
                display: 'flex', alignItems: 'center', gap: 14,
                cursor: 'pointer',
                transition: 'transform 0.15s ease, background 0.15s ease, border-color 0.15s ease',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; }}
            >
              <div style={{
                width: 44, height: 44, borderRadius: 14,
                background: `linear-gradient(135deg, ${COLORS[i % COLORS.length]}, ${COLORS[i % COLORS.length]}88)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 16, fontWeight: 800, color: 'white', flexShrink: 0,
              }}>
                {d.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#f1f5f9' }}>{d.name}</div>
                <div style={{ fontSize: 12, color: '#64748b', marginTop: 1, fontFamily: 'SF Mono, monospace', fontVariantNumeric: 'tabular-nums' }}>
                  {d.vehicleId}
                </div>
                <div style={{ fontSize: 11, color: '#475569', marginTop: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {d.source} · {timeAgo(d.updatedAt)} atrás
                </div>
              </div>
              <div style={{
                fontSize: 14, fontWeight: 800,
                padding: '6px 12px', borderRadius: 12,
                fontVariantNumeric: 'tabular-nums',
                background: d.speed != null && d.speed > 0 ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)',
                color: d.speed != null && d.speed > 0 ? '#4ade80' : '#f87171',
              }}>
                {d.speed != null ? Math.round(d.speed) : '—'}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
