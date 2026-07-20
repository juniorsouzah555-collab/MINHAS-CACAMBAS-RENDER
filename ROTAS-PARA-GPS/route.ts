import { NextRequest, NextResponse } from "next/server";
import {
  routeHasRestrictedStreet,
  getDetourWaypointsFor,
} from "@/lib/restricted-routes";

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY!;
const MAX_TENTATIVAS = 3;

// Quanto a mais (em %) uma rota com desvio pode ter de distância em relação
// à rota original antes de ser considerada "absurda" e descartada.
const LIMITE_DESVIO_PERCENTUAL = 15;

async function fetchDirections(
  origin: string,
  destination: string,
  waypoints: { lat: number; lng: number }[] = []
) {
  const params = new URLSearchParams({
    origin,
    destination,
    key: GOOGLE_MAPS_API_KEY,
    region: "br",
    language: "pt-BR",
  });

  if (waypoints.length > 0) {
    const wp = waypoints.map((w) => `via:${w.lat},${w.lng}`).join("|");
    params.set("waypoints", wp);
  }

  const res = await fetch(
    `https://maps.googleapis.com/maps/api/directions/json?${params.toString()}`
  );
  return res.json();
}

// Soma a distância (em metros) de todas as legs de uma rota
function distanciaTotalMetros(route: any): number {
  return (route.legs || []).reduce(
    (soma: number, leg: any) => soma + (leg.distance?.value || 0),
    0
  );
}

export async function POST(req: NextRequest) {
  try {
    const { origin, destination } = await req.json();

    if (!origin || !destination) {
      return NextResponse.json(
        { error: "origin e destination são obrigatórios" },
        { status: 400 }
      );
    }

    // 1. Calcula a rota original (sem nenhum desvio) — essa é a referência
    // de distância "normal" pra comparar depois.
    const dataOriginal = await fetchDirections(origin, destination);

    if (dataOriginal.status !== "OK") {
      return NextResponse.json(
        {
          error: "Não foi possível calcular a rota",
          detalhes: dataOriginal.status,
        },
        { status: 502 }
      );
    }

    const distanciaOriginal = distanciaTotalMetros(dataOriginal.routes[0]);
    const { restricted: restritaOriginal } = routeHasRestrictedStreet(
      dataOriginal.routes[0]
    );

    // Se a rota original já não passa por via restrita, entrega ela mesmo.
    if (!restritaOriginal) {
      return NextResponse.json({
        route: dataOriginal.routes[0],
        waypointsUsados: [],
        tentativas: 0,
        distanciaOriginalMetros: distanciaOriginal,
        distanciaFinalMetros: distanciaOriginal,
      });
    }

    // 2. Tenta desviar, mas sempre comparando com a distância original.
    let waypoints: { lat: number; lng: number }[] = [];
    let data = dataOriginal;
    let tentativas = 0;
    let melhorRotaValida: any = null;
    let melhorWaypoints: { lat: number; lng: number }[] = [];

    while (tentativas < MAX_TENTATIVAS) {
      const route = data.routes[0];
      const { restricted, matchedStreets } = routeHasRestrictedStreet(route);

      if (!restricted) {
        melhorRotaValida = route;
        melhorWaypoints = waypoints;
        break;
      }

      const novosWaypoints = getDetourWaypointsFor(matchedStreets);
      if (novosWaypoints.length === 0) break; // sem desvio mapeado pra essa via

      const tentativaWaypoints = [...waypoints, ...novosWaypoints];
      const tentativaData = await fetchDirections(
        origin,
        destination,
        tentativaWaypoints
      );
      tentativas++;

      if (tentativaData.status !== "OK") break;

      const distanciaTentativa = distanciaTotalMetros(tentativaData.routes[0]);
      const aumentoPercentual =
        ((distanciaTentativa - distanciaOriginal) / distanciaOriginal) * 100;

      // Filtro principal: só aceita o desvio se não ficar muito mais longo
      // que a rota original.
      if (aumentoPercentual > LIMITE_DESVIO_PERCENTUAL) {
        // Rota absurda — descarta e para de tentar mais waypoints em cima dela.
        break;
      }

      waypoints = tentativaWaypoints;
      data = tentativaData;
    }

    // 3. Se conseguiu uma rota sem via restrita e dentro do limite de distância, usa ela.
    if (melhorRotaValida) {
      const distanciaFinal = distanciaTotalMetros(melhorRotaValida);
      return NextResponse.json({
        route: melhorRotaValida,
        waypointsUsados: melhorWaypoints,
        tentativas,
        distanciaOriginalMetros: distanciaOriginal,
        distanciaFinalMetros: distanciaFinal,
      });
    }

    // 4. Não conseguiu um desvio razoável: entrega a rota original mesmo,
    // avisando que ela passa por via restrita, pra decisão manual do motorista/despachante.
    return NextResponse.json({
      route: dataOriginal.routes[0],
      waypointsUsados: [],
      tentativas,
      distanciaOriginalMetros: distanciaOriginal,
      distanciaFinalMetros: distanciaOriginal,
      aviso:
        "Não foi possível encontrar um desvio razoável (distância extra acima do limite). " +
        "A rota retornada passa por via restrita — confirme manualmente antes de seguir.",
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Erro interno ao calcular rota" },
      { status: 500 }
    );
  }
}
