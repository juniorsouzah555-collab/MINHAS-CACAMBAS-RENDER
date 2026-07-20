// lib/restricted-routes.ts
// Configuração de vias restritas para caçambas em São Paulo
// e pontos de desvio (waypoints) para forçar rotas alternativas no Google Maps.

export interface RestrictedStreet {
  name: string;
  keywords: string[]; // trechos que aparecem nas instruções do Google Maps
}

export interface Waypoint {
  lat: number;
  lng: number;
  label: string;
}

// Vias restritas conhecidas para caçambas (ZMRC / VER / restrição de horário/porte)
// Adicione/edite conforme for mapeando outras vias da sua operação.
export const RESTRICTED_STREETS: RestrictedStreet[] = [
  { name: "Avenida Rebouças", keywords: ["Rebouças"] },
  { name: "Avenida Nove de Julho", keywords: ["9 de Julho", "Nove de Julho"] },
  { name: "Avenida Santo Amaro", keywords: ["Santo Amaro"] },
  { name: "Avenida Presidente Juscelino Kubitschek", keywords: ["Juscelino Kubitschek", " JK "] },
  { name: "Avenida Paulista", keywords: ["Paulista"] },
  { name: "Avenida 23 de Maio", keywords: ["23 de Maio"] },
];

// Waypoints de desvio conhecidos, associados a um trecho do nome da via restrita.
// Cada waypoint "força" o Google Maps a passar por uma via alternativa liberada.
// IMPORTANTE: as coordenadas abaixo são exemplos — confira e ajuste as coordenadas
// reais da Av. Indianópolis (ou outra via de desvio) antes de usar em produção.
export const DETOUR_WAYPOINTS: Record<string, Waypoint[]> = {
  "23 de Maio": [{ lat: -23.6205, lng: -46.6767, label: "Av. Indianópolis" }],
};

export function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "");
}

// Recebe uma "route" no formato da Directions API (REST) e verifica
// se algum passo (step) menciona uma via restrita nas instruções.
export function routeHasRestrictedStreet(route: any): {
  restricted: boolean;
  matchedStreets: string[];
} {
  const matched = new Set<string>();

  for (const leg of route.legs || []) {
    for (const step of leg.steps || []) {
      const text = stripHtml(step.html_instructions || "");
      for (const street of RESTRICTED_STREETS) {
        if (street.keywords.some((kw) => text.includes(kw))) {
          matched.add(street.name);
        }
      }
    }
  }

  return { restricted: matched.size > 0, matchedStreets: Array.from(matched) };
}

export function getDetourWaypointsFor(matchedStreets: string[]): Waypoint[] {
  const waypoints: Waypoint[] = [];
  for (const street of matchedStreets) {
    for (const key of Object.keys(DETOUR_WAYPOINTS)) {
      if (street.includes(key)) {
        waypoints.push(...DETOUR_WAYPOINTS[key]);
      }
    }
  }
  return waypoints;
}
