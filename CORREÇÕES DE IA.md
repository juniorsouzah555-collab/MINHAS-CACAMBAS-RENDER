# Lições Aprendidas — RELAMPAGO-CACAMBAS

## Arquitetura
- **Frontend**: React SPA (Vite + TypeScript)
- **Backend**: Supabase (REST API) + Express server (legacy in-memory fallback)
- **Build**: `npm run build` → `dist/` (Vite) + `dist/server.cjs` (Express)
- **Deploy**: Vercel (auto-deploy from GitHub main branch)

## Problemas Corrigidos & Soluções

### 1. Credenciais Supabase no Build

**Problema**: Vite NÃO inlineia variáveis `VITE_SUPABASE_*` do `.env` no JS compilado.
`import.meta.env.VITE_SUPABASE_URL` ficava `undefined` no `dist/assets/index-*.js`.

**Solução**: Hardcodear URL e anon key diretamente em `src/lib/supabase.ts`:
```ts
const HARDCODED_URL = 'https://rhmgkapdvexzjasvbifd.supabase.co';
const HARDCODED_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';
export let supabase = createClient(HARDCODED_URL, HARDCODED_KEY);
export const isSupabaseConfigured = (): boolean => true;
```

### 2. Dual Persistence (Supabase + localStorage)

Toda operação de escrita deve salvar nos DOIS lugares:
1. Supabase (INSERT/UPDATE/DELETE via REST API)
2. React state → `useEffect` persistence hook escreve no `localStorage`

No carregamento:
1. `useState()` lê do `localStorage` (fallback)
2. `useEffect([isAuthenticated])` tenta Supabase
3. Se Supabase retornar dados (inclusive array vazio), sobrescreve o state
4. Se Supabase falhar, mantém o dado do `localStorage`

### 3. SettingsView — Usuários

**Problema**: `useEffect` que carregava `user_approvals` só sobrescrevia se `data.length > 0`.
Quando o banco ficava vazio (todos excluídos), os usuários hardcoded reapareciam.

**Solução**: Sempre sobrescrever com dados do Supabase, mesmo se vazio:
```ts
useEffect(() => {
  if (isSupabaseConfigured()) {
    supabase.from('user_approvals').select('*').then(({ data, error }) => {
      if (data) {
        setUsers(data.length > 0 ? data.map(...) : []);
      }
    });
  }
}, []);
```

### 4. App.tsx — Carregamento de Dados

**Problema**: Código usava `if (data && data.length > 0 && !error)` para sobrescrever.
Quando Supabase retornava vazio, mantinha estado local (stale).

**Solução**: Usar `if (!error)` e `(data || [])` para cada tabela:
```ts
const { data, error } = await supabase.from('vehicles').select('*');
if (!error) {
  setVehicles((data || []).map(v => ({ ... })));
} else {
  console.error(error);
}
```

## Database (Supabase)

### Chaves
- **Anon key** (pública, uso no frontend): começa com `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
- **Service role** (servidor): começa com `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...role:service_role...`
- **sb_secret_***: NÃO funciona como service_role (formato diferente)

### RLS
- Disabled em todas as tabelas (SET session_replication_role = replica + permissões grant)

### Tabelas
| Tabela | Uso |
|--------|-----|
| `vehicles` | Frota de veículos |
| `bota_foras` | Cadastro de descarte/reciclagem |
| `lancamentos` | Lançamentos de operações |
| `fuel_logs` | Abastecimentos |
| `maintenance_alerts` | Alertas de manutenção |
| `invoices` | Faturas |
| `dispatches` | Despachos |
| `motoristas` | Motoristas |
| `comissoes` | Comissões |
| `user_approvals` | Usuários do sistema (SettingsView) |
| `garage_refills` | Abastecimentos da garagem (diesel) |

#### 11. Garage Diesel Price — Só no localStorage

**Problema**: `garageDieselPrice` e `garageDieselQty` só existiam no `localStorage`. Preço definido no FleetView (web) não aparecia no DriverPortal (mobile) porque cada browser tem seu próprio localStorage.

**Solução**: Armazenar como um registro especial `GARAGE-CONFIG` na tabela `vehicles`:
- `cost_per_km` → diesel price (decimal)
- `efficiency` → diesel qty (integer)
- Usar upsert em todos os pontos de salvamento (FleetView price, add/edit/delete garage refills)
- Carregar do Supabase no `useEffect` de autenticação em App.tsx
- Adicionar subscription Realtime para `vehicles` com filtro `id === 'GARAGE-CONFIG'`
- **Pré-submissão**: `handleFuelSubmit` busca `cost_per_km` do Supabase antes de calcular valor do abastecimento de garagem

### 12. Realtime — Tabelas não estavam na Publicação

**Problema**: As subscriptions Realtime (`lancamentos`, `fuel_logs`, `comissoes`, `vehicles`) nunca recebiam eventos. Apenas refresh manual mostrava dados novos. Causa: tabelas não estavam na publicação `supabase_realtime`.

**Solução**: Usar Supabase Management API com Personal Access Token (PAT) para executar SQL via endpoint `/v1/projects/{ref}/database/query`:
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE vehicles;
ALTER PUBLICATION supabase_realtime ADD TABLE lancamentos;
ALTER PUBLICATION supabase_realtime ADD TABLE fuel_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE comissoes;
ALTER PUBLICATION supabase_realtime ADD TABLE garage_refills;
```

**PAT (Personal Access Token)**: Gerar em https://supabase.com/dashboard/account/tokens. Formato: `sbp_*`. Usar no header `Authorization: Bearer {pat}`. **Não é o mesmo que service_role key**.

### 13. Capacitor + Background Geolocation

**Problema**: App web/PWA não consegue manter geolocalização quando o navegador é fechado — JavaScript é suspenso pelo sistema operacional. Motorista sumia do mapa após 120s sem heartbeat.

**Solução**: Configurar Capacitor para empacotar o React como app nativo Android com permissão de background location:

**Pacotes instalados**:
- `@capacitor/core@8`, `@capacitor/cli`, `@capacitor/android`
- `@capacitor/geolocation` (foreground)
- `@capacitor-community/background-geolocation` (background)

**Arquivos gerados**:
- `capacitor.config.ts` — config: appId `com.relampago.motorista`, webDir `dist`
- `android/` — projeto Android gerado por `npx cap add android`
- `src/lib/geolocation.ts` — serviço unificado que usa `BackgroundGeolocation.addWatcher()` com `backgroundMessage` quando nativo, `navigator.geolocation` como fallback no browser

**Permissões Android** (em `android/app/src/main/AndroidManifest.xml`):
```xml
<uses-permission android:name="android.permission.ACCESS_BACKGROUND_LOCATION" />
<uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
<uses-permission android:name="android.permission.FOREGROUND_SERVICE_LOCATION" />
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
```

**Fluxo de build do APK** (apenas primeira vez):
```bash
npm run build && npx cap sync android
# Depois: Android Studio → Build → Build APK
# Ou via CLI (se ANDROID_HOME configurado):
cd android && ./gradlew assembleDebug
```

**Atualizações futuras**: Apenas `npm run build && npx cap sync android` — o APK carrega o React da Vercel, então código novo chega automaticamente. Não precisa gerar novo APK para updates de funcionalidade.

**Limitação**: O `@capacitor-community/background-geolocation` usa foreground service com notificação persistente. O usuário verá uma notificação "Rastreando localização em tempo real" enquanto o app estiver em background.

## Fluxo de Dados
```
Usuário faz ação → Handler React → Supabase REST (INSERT/UPDATE/DELETE)
                                 → setState() → useEffect persistence → localStorage

Recarregar página → useState(localStorage) → useEffect → Supabase SELECT
                                                    → se ok: sobrescreve state
                                                    → se erro: mantém localStorage
```

### 5. Proxy Serverless para Mutacoes (Junho 2026)

**Problema**: RLS habilitado no Supabase bloqueava INSERT/UPDATE/DELETE direto do frontend (anon key).

**Solucao**: Criar endpoints Vercel serverless em `api/` que usam `SUPABASE_SERVICE_ROLE_KEY` (server-side) para bypassar RLS:
- `api/proxy.ts` — generico (INSERT, UPDATE, DELETE)
- `api/fuel-log.ts` — especifico para abastecimentos
- `api/auth/*.ts` — operacoes de auth (signup, confirm, delete, link-driver)

Helpers no frontend: `proxyInsert()`, `proxyUpdate()`, `proxyDelete()` em `src/lib/supabase.ts`.

### 6. Tela Branca no Mobile (ReferenceError: TDZ)

**Problema**: `getLinkedFromStorage()` era definida com `const` depois de `useState()` que a chamava. No mobile (IOS/Android), o JS Engine era mais rigido com Temporal Dead Zone — `ReferenceError: Cannot access 'getLinkedFromStorage' before initialization`.

**Solucao**: Mover definicao da funcao para ANTES de todos os `useState()` que a referenciam em `DriverPortal.tsx`.

### 7. Delete User — Nao Removia do Auth

**Problema**: `api/auth/delete-user.ts` so deletava da tabela `user_approvals`, mas NAO do `auth.users` do Supabase. O usuario continuava existindo no Auth, entao `signInWithPassword()` ainda funcionava.

**Solucao**: Atualizar endpoint para usar `admin.auth.admin.listUsers()` + `admin.auth.admin.deleteUser(id)` para remover tambem do Auth. Usar `createClient` com service_role key.

### 8. Login — Fallback localStorage Ignorava Exclusao

**Problema**: No fluxo de login, passo 3 (fallback `relampago_invited_drivers`) tentava verificar no Supabase se o usuario existia, mas o `try/catch` com `catch {}` vazio engolia qualquer erro — se a query falhasse (RLS, rede), `deleted` ficava `false` e o login passava.

**Solucao**: 
- Passo 1: apos `signInWithPassword` bem-sucedido, verificar `user_approvals` — se nao achar registro, fazer `signOut()` e negar acesso.
- Passo 3: tratar QUALQUER erro na query Supabase como "usuario deletado", removendo do localStorage e negando acesso.

### 9. Coluna `observacao` Ausente no Supabase

**Problema**: `proxyInsert('lancamentos', { ..., observacao: '...' })` falhava porque a coluna `observacao` nao existe na tabela `lancamentos` do Supabase. Erro `PGRST204` — `proxyInsert()` retornava `false` → toast "Sincronizacao Parcial".

**Solucao**: Remover `observacao` do payload enviado ao Supabase. Dados continuam salvos no localStorage. Para adicionar no futuro: criar coluna `observacao text nullable` na tabela `lancamentos` pelo dashboard do Supabase.

### 10. Motorista Deletado Continuava no localStorage

**Problema**: `handleDeleteUser()` em `SettingsView.tsx` removia o usuario de `relampago_system_users` mas NAO de `relampago_invited_drivers`. As credenciais ficavam no localStorage, permitindo login mesmo apos exclusao.

**Solucao**: Adicionar limpeza de `relampago_invited_drivers` no `handleDeleteUser()`. Adicionar `useEffect` no `LoginScreen.tsx` que sincroniza as duas listas no startup.

## Convenções de Código
- **Nomes das colunas no Supabase**: snake_case (ex: `fuel_used`, `cost_per_km`)
- **Nomes das propriedades no React**: camelCase (ex: `fuelUsed`, `costPerKm`)
- Mapeamento snake_case → camelCase em cada `.select()`
- Variáveis de ambiente usam prefixo `VITE_` (Vite)

## Verificação Rápida
```bash
# Build local
npm run build

# Servir produção
npx serve dist -l 3000

# Testar Supabase via Node
node -e "
const { createClient } = require('@supabase/supabase-js');
const s = createClient('https://rhmgkapdvexzjasvbifd.supabase.co', 'ANON_KEY_AQUI');
s.from('vehicles').select('*').limit(1).then(r => {
  console.log('OK:', r.data?.length, 'erro:', r.error?.message);
});
"
```
