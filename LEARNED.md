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

### Conexão Direta
- Pooler NÃO funciona (tenant not found)
- Conexão direta só tem IPv6 — inacessível deste ambiente
- Apenas REST API (porta 443) funciona via URL do projeto

## Fluxo de Dados
```
Usuário faz ação → Handler React → Supabase REST (INSERT/UPDATE/DELETE)
                                 → setState() → useEffect persistence → localStorage

Recarregar página → useState(localStorage) → useEffect → Supabase SELECT
                                                    → se ok: sobrescreve state
                                                    → se erro: mantém localStorage
```

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
