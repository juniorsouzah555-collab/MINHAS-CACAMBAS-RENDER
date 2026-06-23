# Diretrizes — RELAMPAGO-CACAMBAS

## Stack
- Frontend: React 19 + Vite + TypeScript + Tailwind CSS 4
- Backend: Supabase (REST API) + Express server (legacy fallback)
- Deploy: Vercel (auto-deploy from GitHub main)
- UI: lucide-react, recharts, motion

## Convenções de Código
- Nomes Supabase: snake_case (`fuel_used`, `cost_per_km`)
- Nomes React: camelCase (`fuelUsed`, `costPerKm`)
- Sempre mapear snake_case → camelCase em `.select()`
- Sempre sobrescrever state com dados do Supabase, mesmo se vazio (array vazio)
- Escrever nos DOIS lugares: Supabase + localStorage

## Supabase
- Credenciais hardcoded em `src/lib/supabase.ts` (Vite não inlineia .env)
- Anon key pública, service role key server-side
- RLS desabilitado (bypass via service_role em `api/proxy.ts`)
- Conexão direta apenas IPv6 — usar REST API (porta 443)
- Mutations via proxy endpoints: `proxyInsert()`, `proxyUpdate()`, `proxyDelete()`

## Regras de Negócio
- Login: verificar `user_approvals` após auth — se não achar, fazer signOut()
- Delete usuário: remover de `user_approvals` + `auth.users` + `relampago_invited_drivers`
- Carregamento: useState(localStorage) → useEffect → Supabase SELECT → sobrescreve state
- Named exports, sem `export default` (padrão do projeto)

## Verificação
```bash
npm run lint          # tsc --noEmit
npm run build         # vite build
```

## Sempre
- Verifique o AGENTS.md antes de modificar código
- Siga o estilo do código ao redor
- Prefira simplicidade sobre abstrações complexas
- Verifique CORREÇÕES DE IA.md para lições aprendidas
