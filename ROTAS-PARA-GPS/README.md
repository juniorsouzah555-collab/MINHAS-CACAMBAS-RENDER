# Rota do Motorista — evita vias restritas em São Paulo

## O que faz
Motorista digita só o **destino**. O sistema pega a localização atual dele via
GPS do navegador, manda pra Directions API do Google, checa se a rota sugerida
passa por alguma via restrita (Rebouças, 9 de Julho, Paulista, 23 de Maio etc.)
e, se passar, recalcula automaticamente com waypoints que forçam um caminho
alternativo. O motorista só vê a rota final desenhada no mapa — sem
pontinhos/waypoints aparecendo.

## Instalar dependências
```bash
npm install @react-google-maps/api
```

## Variáveis de ambiente (.env.local)
```
GOOGLE_MAPS_API_KEY=sua_chave_backend         # usada na API route (Directions API)
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=sua_chave_front # usada no mapa (JS API)
```
No Google Cloud Console, habilite: **Directions API** e **Maps JavaScript API**.
Pode ser a mesma chave nas duas variáveis, mas é mais seguro restringir cada
uma por domínio/IP e por API habilitada.

## Arquivos criados
- `lib/restricted-routes.ts` — lista de vias restritas + lógica de detecção
- `app/api/rota-motorista/route.ts` — endpoint que calcula a rota e evita as vias
- `app/motorista/rota/page.tsx` — tela do motorista (destino + mapa)

## Ajustar as vias restritas e desvios
Edite `lib/restricted-routes.ts`:
- `RESTRICTED_STREETS`: adicione o nome da via e as palavras-chave que aparecem
  nas instruções do Google (ex: "23 de Maio").
- `DETOUR_WAYPOINTS`: para cada via restrita, informe um ponto (lat/lng) de uma
  via alternativa liberada. **As coordenadas de exemplo da Av. Indianópolis
  precisam ser conferidas/ajustadas antes de ir pra produção.**

## Como funciona por dentro
1. Frontend pega a localização atual (`navigator.geolocation`).
2. Chama `POST /api/rota-motorista` com `origin` e `destination`.
3. A API route chama a Directions API do Google.
4. Verifica se algum passo da rota menciona uma via restrita.
5. Se sim, adiciona os waypoints de desvio e recalcula (até 3 tentativas).
6. Retorna a rota final; o frontend decodifica o polyline e desenha a linha
   azul no mapa, com marcador A (origem) e B (destino) — sem waypoints visíveis.

## Limitação atual
A detecção de via restrita é por **texto** (nome da rua nas instruções), não
por geometria da rota. Funciona bem pro conjunto de avenidas já mapeadas, mas
se quiser algo mais preciso (baseado em coordenadas/polígonos), me chama que a
gente evolui pra checagem geométrica.
