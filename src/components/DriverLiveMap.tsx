import React, { useState, useEffect, useRef } from 'react';
import { Navigation } from 'lucide-react';
import { Vehicle } from '../types';

const vehicleToGps = (lat: number, lng: number) => ({
  lat: -23.5505 + (lat || 0) / 5000,
  lng: -46.6333 + (lng || 0) / 5000
});

interface DriverLiveMapProps {
  coords: { lat: number; lng: number } | null;
  vehicles: Vehicle[];
  error: string | null;
  onRetry: () => void;
  onlineUsers?: { name: string; lat: number; lng: number; vehicleId?: string; speed?: number | null; accuracy?: number | null }[];
  isDriverUser?: boolean;
}

export default function DriverLiveMap({
  coords,
  vehicles,
  error,
  onRetry,
  onlineUsers = [],
  isDriverUser = false
}: DriverLiveMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const [isLeafletLoaded, setIsLeafletLoaded] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const initialFitDone = useRef(false);
  const prevOnlineUsersRef = useRef<string>('');

  // 1. Load Leaflet CSS + JS (uma vez)
  useEffect(() => {
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
    script.onload = () => setIsLeafletLoaded(true);
    document.body.appendChild(script);
  }, []);

  // 2. Criar mapa (uma vez, assim que Leaflet carrega)
  useEffect(() => {
    if (!isLeafletLoaded || !mapContainerRef.current || mapRef.current) return;
    const L = (window as any).L;
    if (!L) return;

    const center = coords ? [coords.lat, coords.lng] : [-23.5505, -46.6333];
    mapRef.current = L.map(mapContainerRef.current, {
      zoomControl: true,
      attributionControl: false
    }).setView(center as [number, number], 11);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
    }).addTo(mapRef.current);
  }, [isLeafletLoaded, coords]);

  // 3. Atualizar markers (só quando dados mudam de verdade)
  useEffect(() => {
    if (!mapRef.current) return;
    const L = (window as any).L;
    if (!L) return;

    // Serializar pra comparar — evita redesenho desnecessário
    const key = JSON.stringify(onlineUsers.map(u => [u.vehicleId, u.lat, u.lng, u.speed]));
    if (key === prevOnlineUsersRef.current) return;
    prevOnlineUsersRef.current = key;

    // Limpa marcadores antigos
    markersRef.current.forEach(m => mapRef.current?.removeLayer(m));
    markersRef.current = [];

    // Vehicles (fake GPS - cadastro)
    vehicles.forEach(v => {
      const gps = vehicleToGps(v.lat, v.lng);
      const isInTransit = v.status === 'In Transit';
      const markerColor = isInTransit ? 'bg-emerald-500' : 'bg-slate-400';
      const iconHtml = `<div class="relative flex items-center justify-center"><div class="flex h-6 w-6 items-center justify-center rounded-full ${markerColor} border-2 border-white shadow-lg"><div class="h-2 w-2 bg-white rounded-full"></div></div></div>`;
      const icon = L.divIcon({ html: iconHtml, className: 'custom-vehicle-icon', iconSize: [24, 24], iconAnchor: [12, 12] });
      const marker = L.marker([gps.lat, gps.lng], { icon })
        .addTo(mapRef.current)
        .bindTooltip(v.driver, { permanent: true, direction: 'top', className: 'driver-label', offset: L.point(0, -14) });
      markersRef.current.push(marker);
    });

    // Coordenadas do usuário (driver view)
    if (coords && isDriverUser) {
      const userIconHtml = `<div class="relative flex items-center justify-center"><div class="absolute inline-flex h-8 w-8 animate-ping rounded-full bg-emerald-400 opacity-75"></div><div class="relative flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 border-2 border-white shadow-lg"><div class="h-2 w-2 bg-white rounded-full"></div></div></div>`;
      const userIcon = L.divIcon({ html: userIconHtml, className: 'custom-user-icon', iconSize: [32, 32], iconAnchor: [16, 16] });
      const userMarker = L.marker([coords.lat, coords.lng], { icon: userIcon })
        .addTo(mapRef.current)
        .bindTooltip('Você', { permanent: true, direction: 'top', className: 'driver-label driver-label--you' });
      markersRef.current.push(userMarker);
    }

    // Online users (FullTrack + PWA — GPS real)
    onlineUsers.forEach(u => {
      if (u.lat && u.lng) {
        const isOwnTracks = u.vehicleId?.startsWith('OT-');
        const bgColor = isOwnTracks ? 'bg-emerald-500' : 'bg-blue-500';
        const pulseClass = isOwnTracks ? 'animate-pulse' : '';
        const iconHtml = `<div class="relative flex items-center justify-center"><div class="flex h-6 w-6 items-center justify-center rounded-full ${bgColor} border-2 border-white shadow-lg ${pulseClass}"><div class="h-2 w-2 bg-white rounded-full"></div></div></div>`;
        const icon = L.divIcon({ html: iconHtml, className: 'custom-online-icon', iconSize: [24, 24], iconAnchor: [12, 12] });
        const source = isOwnTracks ? '📡' : '📱';
        const speedStr = u.speed != null && u.speed > 0 ? ` · ${Math.round(u.speed)} km/h` : '';
        const accStr = u.accuracy != null ? ` · ±${Math.round(u.accuracy)}m` : '';
        const marker = L.marker([u.lat, u.lng], { icon })
          .addTo(mapRef.current)
          .bindTooltip(`${source} ${u.name}${speedStr}${accStr}`, { permanent: true, direction: 'top', className: 'driver-label driver-label--online', offset: L.point(0, -14) });
        markersRef.current.push(marker);
      }
    });

    // Fit bounds no primeiro render com dados
    if (markersRef.current.length > 0 && !initialFitDone.current) {
      const group = L.featureGroup(markersRef.current);
      mapRef.current.fitBounds(group.getBounds().pad(0.15));
      initialFitDone.current = true;
    }
  }, [vehicles, onlineUsers, coords, isDriverUser]);

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await mapContainerRef.current?.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch {}
  };

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  useEffect(() => {
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markersRef.current = [];
      }
    };
  }, []);

  return (
    <div className="bg-slate-50 border border-blue-200/60 rounded-2xl shadow-inner overflow-hidden relative" style={{ height: isFullscreen ? '100vh' : '80vh' }}>
      {error ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-slate-50 z-10">
          <p className="text-xs font-semibold text-slate-500 mb-3 leading-relaxed">⚠️ {error}</p>
          <button type="button" onClick={onRetry} className="px-4 py-1.5 bg-emerald-500 text-white font-extrabold text-[10px] uppercase tracking-wider rounded-lg hover:bg-emerald-600 transition-colors shadow-sm cursor-pointer">
            Permitir Acesso à Localização
          </button>
        </div>
      ) : (
        <>
          <div ref={mapContainerRef} className="w-full h-full z-0" />
          {onlineUsers.length === 0 && (
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none" style={{zIndex:999}}>
              <Navigation className="w-8 h-8 text-slate-300 mb-3" />
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Carregando rastreamento...</p>
            </div>
          )}
          <button type="button" onClick={toggleFullscreen} className="absolute top-3 right-3 bg-white/90 hover:bg-white border border-blue-200/60 rounded-lg p-2 shadow-md transition-all cursor-pointer" style={{zIndex:1000}} title={isFullscreen ? 'Sair da tela cheia' : 'Abrir em tela cheia'}>
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-700">
              {isFullscreen ? (
                <><polyline points="4 14 10 14 10 20" /><polyline points="20 10 14 10 14 4" /><line x1="14" y1="10" x2="21" y2="3" /><line x1="3" y1="21" x2="10" y2="14" /></>
              ) : (
                <><polyline points="15 3 21 3 21 9" /><polyline points="9 21 3 21 3 15" /><line x1="21" y1="3" x2="14" y2="10" /><line x1="3" y1="21" x2="10" y2="14" /></>
              )}
            </svg>
          </button>
          <div className="absolute bottom-3 left-3 bg-white/90 border border-blue-200/60 rounded-lg px-2.5 py-1 shadow-md text-[10px] font-bold text-slate-600" style={{zIndex:1000}}>
            {onlineUsers.length > 0
              ? `${onlineUsers.length} rastreado${onlineUsers.length !== 1 ? 's' : ''}`
              : 'Nenhum rastreado'}
          </div>
          {onlineUsers.length > 0 && (
            <div className="absolute bottom-3 right-3 bg-white/90 border border-blue-200/60 rounded-lg px-2 py-1 shadow-md text-xs text-slate-600" style={{zIndex:1000}}>
              Online: {onlineUsers.map(u => u.name).join(', ')}
            </div>
          )}
        </>
      )}
    </div>
  );
}
