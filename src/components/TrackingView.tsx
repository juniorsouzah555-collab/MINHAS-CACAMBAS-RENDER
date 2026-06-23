import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Users, RefreshCw, Navigation } from 'lucide-react';
import { Vehicle } from '../types';
import { getOnlineUsers } from '../lib/supabase';
import DriverLiveMap from './DriverLiveMap';

interface TrackingViewProps {
  vehicles: Vehicle[];
}

export default function TrackingView({ vehicles }: TrackingViewProps) {
  const [onlineUsers, setOnlineUsers] = useState<{ name: string; lat: number; lng: number }[]>([]);

  useEffect(() => {
    const poll = async () => {
      try {
        const r = await getOnlineUsers();
        setOnlineUsers(r);
      } catch {}
    };
    poll();
    const id = setInterval(poll, 15000);
    return () => clearInterval(id);
  }, []);

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
            Acompanhe a localização dos motoristas em tempo real
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-emerald-50 border border-emerald-200/60 px-3 py-1.5 rounded-lg text-xs font-bold text-emerald-700 flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5" />
            {onlineUsers.length} online
          </div>
          <button
            type="button"
            onClick={() => getOnlineUsers().then(setOnlineUsers).catch(() => {})}
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
        vehicles={vehicles.filter(v => v.status === 'In Transit' || v.status === 'Assigned')}
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
            Últimos 2 minutos
          </span>
        </div>
        <div className="divide-y divide-slate-100">
          {onlineUsers.length === 0 ? (
            <div className="px-5 py-8 text-center">
              <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-xs font-semibold text-slate-400">Nenhum motorista online no momento</p>
              <p className="text-[10px] text-slate-300 mt-1">Peça para um motorista fazer login pelo celular</p>
            </div>
          ) : (
            onlineUsers.map((u, i) => (
              <div key={i} className="px-5 py-3 flex items-center justify-between hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-sm font-semibold text-slate-800">{u.name}</span>
                </div>
                {u.lat && u.lng && (
                  <span className="text-[10px] font-mono text-slate-400">
                    {u.lat.toFixed(4)}, {u.lng.toFixed(4)}
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
