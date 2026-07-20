# Plano: Integrar Rota Motorista no MINHAS-CACAMBAS-RENDER

## Contexto
Sistema que calcula rotas pra motoristas evitando vias restritas de SP (Rebouças, 9 de Julho, Paulista, 23 de Maio, JK, Santo Amaro).
O download original é Next.js — precisa adaptar pra React + Vite + Express.

## Decisão: Google Maps Directions API
- $200/mês de crédito grátis (suficiente pra operação)
- Melhor detecção de vias restritas (pelo nome da rua nos steps)
- O código original já foi feito pra isso

## Configuração Google Cloud Console
1. Criar conta em https://console.cloud.google.com
2. Criar projeto
3. Habilitar: **Directions API** + **Maps JavaScript API**
4. Criar chave de API (RESTRICTED por domínio/IP)
5. Adicionar no `.env.local`:
```
GOOGLE_MAPS_API_KEY=sua_chave_aqui
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=sua_chave_aqui
```

## Arquivos a criar/modificar

### 1. `src/lib/restricted-routes.ts` — CRIAR
Copiar do download original, sem mudanças significativas.
- Lista de vias restritas (REBOUÇAS, 9 DE JULHO, PAULISTA, 23 DE MAIO, JK, SANTO AMARO)
- Função `routeHasRestrictedStreet()` — detecta via restrita nos steps
- Função `getDetourWaypointsFor()` — retorna waypoints de desvio

### 2. `POST /api/rota-motorista` em `server.ts` — ADICIONAR
Adaptar `route.ts` do download pra Express:
- Recebe `{ origin, destination }` 
- Chama Google Directions API (REST)
- Verifica vias restritas
- Se restrita, recalcula com waypoints (até 3 tentativas)
- Limita desvio a 15% da distância original
- Retorna polyline + metadata

### 3. `src/components/RotaMotoristaView.tsx` — CRIAR
Adaptar `page.tsx` do download pra:
- **Leaflet** (CDN) em vez de @react-google-maps/api (já usado no projeto)
- Input de destino + botão "Calcular Rota"
- Pega GPS do navegador (`navigator.geolocation`)
- Chama `/api/rota-motorista`
- Decodifica polyline (usar lib `@mapbox/polyline` OU decodificação manual)
- Desenha rota no mapa + marcadores A (origem) / B (destino)
- Estilo dark (igual RastreadorView)

### 4. `src/App.tsx` — MODIFICAR
Adicionar rota: `if (publicPage === 'rota-motorista')`
- Acessível via `/?page=rota-motorista`
- Apenas pra JUNIOR por enquanto
- Pode exigir autenticação de motorista (relampago_driver_token)

## Dependências
- Nenhuma dependência npm nova necessária (tudo via CDN/fetch)
- OU instalar `@mapbox/polyline` (~3KB) pra decodificar polyline (alternativa: código manual de ~20 linhas)

## Navegação
- Rota pública: `/?page=rota-motorista`
- Ou dentro do app do motorista (após login com relampago_driver_token)
- Por enquanto: só JUNIOR

## Fluxo do Motorista
1. Acessa o link → tela com mapa + campo "Destino"
2. Digita endereço (ex: "Rua Augusta, 1000, São Paulo")
3. Clica "Calcular Rota"
4. App pega GPS当前位置 do celular
5. Server chama Google Directions API
6. Verifica se passa por via restrita
7. Se sim, recalcula com waypoints de desvio
8. Retorna rota final
9. Frontend desenha linha azul no mapa + marcadores A/B

## Limitações
- Detecção por texto (nome da rua) — funciona bem pro conjunto de avenidas mapeadas
- Se quiser detecção geométrica (polígonos), evoluir depois
- Google Maps API pode ter custo se passar de $200/mês (improvável na operação atual)
