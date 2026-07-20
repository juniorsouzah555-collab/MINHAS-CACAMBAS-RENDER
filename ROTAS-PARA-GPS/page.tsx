"use client";

import { useState, useCallback } from "react";
import {
  GoogleMap,
  Polyline,
  Marker,
  useJsApiLoader,
} from "@react-google-maps/api";

const containerStyle = { width: "100%", height: "100vh" };
const defaultCenter = { lat: -23.5505, lng: -46.6333 };

export default function RotaMotoristaPage() {
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!,
    libraries: ["geometry"],
  });

  const [destino, setDestino] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [path, setPath] = useState<google.maps.LatLngLiteral[]>([]);
  const [origemPonto, setOrigemPonto] =
    useState<google.maps.LatLngLiteral | null>(null);
  const [destinoPonto, setDestinoPonto] =
    useState<google.maps.LatLngLiteral | null>(null);

  const getLocalizacaoAtual = (): Promise<GeolocationPosition> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("Geolocalização não suportada neste dispositivo"));
        return;
      }
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 10000,
      });
    });
  };

  const handleConfirmar = useCallback(async () => {
    if (!destino.trim()) {
      setErro("Digite o endereço de destino");
      return;
    }

    setCarregando(true);
    setErro(null);

    try {
      const pos = await getLocalizacaoAtual();
      const origin = `${pos.coords.latitude},${pos.coords.longitude}`;

      const res = await fetch("/api/rota-motorista", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ origin, destination: destino }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErro(data.error || "Erro ao calcular rota");
        return;
      }

      // Decodifica o polyline retornado pela Directions API (REST)
      // usando a lib "geometry" do próprio Google Maps JS.
      const decoded = window.google.maps.geometry.encoding.decodePath(
        data.route.overview_polyline.points
      );
      const decodedPath = decoded.map((p) => ({ lat: p.lat(), lng: p.lng() }));

      setPath(decodedPath);
      setOrigemPonto({
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
      });
      setDestinoPonto(decodedPath[decodedPath.length - 1]);
    } catch (e: any) {
      setErro(e.message || "Não foi possível obter sua localização");
    } finally {
      setCarregando(false);
    }
  }, [destino]);

  if (!isLoaded) return <div>Carregando mapa...</div>;

  return (
    <div className="flex flex-col h-screen">
      <div className="p-4 flex gap-2 bg-white shadow z-10">
        <input
          type="text"
          placeholder="Endereço de destino"
          value={destino}
          onChange={(e) => setDestino(e.target.value)}
          className="flex-1 border rounded px-3 py-2"
        />
        <button
          onClick={handleConfirmar}
          disabled={carregando}
          className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50"
        >
          {carregando ? "Calculando..." : "Confirmar"}
        </button>
      </div>

      {erro && <div className="p-2 text-red-600 bg-red-50">{erro}</div>}

      <div className="flex-1">
        <GoogleMap
          mapContainerStyle={containerStyle}
          center={origemPonto || defaultCenter}
          zoom={13}
        >
          {origemPonto && <Marker position={origemPonto} label="A" />}
          {destinoPonto && <Marker position={destinoPonto} label="B" />}
          {path.length > 0 && (
            <Polyline
              path={path}
              options={{ strokeColor: "#2563eb", strokeWeight: 5 }}
            />
          )}
        </GoogleMap>
      </div>
    </div>
  );
}
