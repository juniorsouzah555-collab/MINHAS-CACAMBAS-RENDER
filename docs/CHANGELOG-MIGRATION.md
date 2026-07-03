# Migration: Supabase + Firebase → JWT + SQLite on Render

## Summary
This repo was originally a copy of `RELAMPAGO-CACAMBAS-` migrated from Supabase (auth) + Firebase Firestore (data) to a self-contained Express server with JWT auth + SQLite, deployed on Render free plan.

The original repo (`juniorsouzah555-collab/RELAMPAGO-CACAMBAS-`) is untouched. This repo (`MINHAS-CACAMBAS-RENDER`) is the migrated version.

---

## What Changed

### 1. Authentication
| Before | After |
|--------|-------|
| Supabase Auth + Firebase Auth (`signInWithEmailAndPassword`) | JWT only (`POST /api/auth/login`) |
| User accounts per email | Single app-wide password (`APP_PASSWORD`) |
| Supabase Admin SDK for user management | Firebase Admin REST API endpoints removed |

**Files:** `server.ts`, `src/components/LoginScreen.tsx`, `src/App.tsx`

### 2. Database
| Before | After |
|--------|-------|
| Firebase Firestore (via `src/lib/supabase.ts` wrapper) | SQLite via `sql.js` + `drizzle-orm/sql-js` |
| Data stored in Firebase project `cacambas-4ecdb` | Data stored in `cacambas.db` file (ephemeral on Render) |
| Supabase Realtime subscriptions (Firestore `onSnapshot` shim) | No realtime (polling removed, channels stubbed) |

**Files:** `src/db/index.ts`, `src/db/schema.ts`, `src/db/init.ts`, `server.ts`

### 3. Server Architecture
| Before | After |
|--------|-------|
| Vite dev server + Supabase REST API | Express server (port from `PORT` env var) |
| Firebase Admin SDK for proxy writes | All CRUD via SQLite REST endpoints |
| Vercel deployment | Render deployment |

**Files:** `server.ts`, `package.json`

### 4. Frontend Data Layer
| Before | After |
|--------|-------|
| `src/lib/supabase.ts` → Firebase Firestore via Web SDK | `src/lib/supabase.ts` → Express REST API (`fetch`) |
| `src/lib/firebase.ts` (Firebase Web SDK init) | **Deleted** |
| Snake_case ↔ camelCase mapping required | Same mapping kept for compatibility |

**Files:** `src/lib/supabase.ts` (rewritten), `src/lib/firebase.ts` (deleted), `src/lib/api.ts` (new)

### 5. Removed Files
| File | Reason |
|------|--------|
| `src/lib/firebase.ts` | Firebase Web SDK no longer used |
| `api/lib/firebase-admin.ts` | Firebase Admin SDK no longer used |
| `api/lib/firebase-service-account.json` | Service account no longer used |

### 6. Removed Dependencies
| Package | Reason |
|---------|--------|
| `firebase` | Firebase Web SDK removed |
| `firebase-admin` | Firebase Admin SDK removed |
| `@supabase/supabase-js` | Supabase client removed |
| `@vercel/node` | No longer deploying to Vercel |

---

## Server API Endpoints

All endpoints require `Authorization: Bearer <jwt-token>` header.

### Auth
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/login` | Login with `{ password }`, returns JWT |
| GET | `/api/auth/check` | Check if JWT is valid |

### CRUD (all tables)
Generic CRUD for all tables below:
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/{table}` | List all records |
| POST | `/api/{table}` | Create record |
| PUT | `/api/{table}/:id` | Update record by ID |
| DELETE | `/api/{table}/:id` | Delete record by ID |

### Tables Available
- `vehicles`, `botaforas`, `lancamentos`, `fuel-logs`, `alerts`
- `invoices`, `dispatches`, `motoristas`, `comissoes`, `manutencoes`
- `garage-refills`, `plano-contas`, `grupos-conta`, `categorias-conta`
- `subcategorias-conta`, `importacoes-extrato`, `extrato-transacoes`
- `centros-custo`, `conciliacoes`, `regras-categorizacao`, `patrimonio`
- `planos-pagamento`, `clientes`, `user-approvals`

### Bancario
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/bancario/categorize` | Categorize transactions (Groq AI + local rules) |

### Health
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | `{ status: "ok", database: "sqlite" }` |

---

## Deployment

- **URL:** https://minhas-cacambas.onrender.com
- **Platform:** Render (free plan — hibernates after 15 min inactivity)
- **Login password:** `admin123` (configurable via `APP_PASSWORD` env var)

### Env Vars Required
| Variable | Description |
|----------|-------------|
| `APP_PASSWORD` | Master password for login |
| `JWT_SECRET` | Secret key for JWT signing |
| `GROQ_API_KEY` | (optional) For AI categorization |

---

## Data Flow

```
Browser (React)
  │
  ├─ Login: POST /api/auth/login → { token }
  │
  ├─ Reads: supabase.from('table').select('*')
  │   └─ src/lib/supabase.ts (rewritten)
  │       └─ fetch → GET /api/{table} → Express → SQLite
  │
  └─ Writes: supabase.from('table').insert({...})
      └─ src/lib/supabase.ts (rewritten)
          └─ fetch → POST /api/{table} → Express → SQLite
```

---

## Key Architecture Decisions

1. **sql.js instead of better-sqlite3** — Pure WASM, zero native dependencies. Works on Windows without node-gyp/Python build tools.

2. **Proxy pattern for db export** — `sql.js` requires async `initSqlJs()` before use. The exported `db` object uses a Proxy to defer access until initialization completes, avoiding ESM live-binding issues.

3. **Chainable query API kept** — `src/lib/supabase.ts` still exports `supabase.from('table').select('*')` with the same interface, but now backed by REST API instead of Firebase Firestore. All component code continues to work without changes.

4. **In-memory filtering** — `.eq()`, `.order()`, `.limit()` filters are applied client-side after fetching all data from the server. This is fine for small datasets (<10k records).

5. **No WebSocket/realtime** — Render free plan doesn't support WebSocket reliably. The original `supabase.channel()` and `onSnapshot` subscriptions are replaced with no-op stubs. For future tracking needs, polling-based approach is recommended.

---

## Tracking / Rastreamento (Not Implemented)

The original app used Firebase Firestore for driver heartbeat tracking (`sendHeartbeat()`, `getOnlineUsers()`). These functions now use the `user-approvals` REST endpoint but need a proper implementation:

- **Polling approach:** Driver portal sends GPS position via `POST /api/heartbeat` every 30s
- **Admin reads:** Admin tracking page polls `GET /api/online-users` every 15s
- **No WebSocket:** Render free doesn't support long-running WebSocket connections

For a complete tracking solution, additional endpoints and geolocation integration in `src/lib/geolocation.ts` are needed.
