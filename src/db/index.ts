import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import * as schema from './schema.ts';

const TURSO_URL = process.env.TURSO_DATABASE_URL;
const TURSO_TOKEN = process.env.TURSO_AUTH_TOKEN;

let libsqlClient: any = null;
let db: any = null;

if (TURSO_URL) {
  libsqlClient = createClient({ url: TURSO_URL, authToken: TURSO_TOKEN });
  db = drizzle(libsqlClient, { schema });
} else {
  console.warn('[DB] TURSO_DATABASE_URL não configurada — banco indisponível');
}

export { libsqlClient, db };

export async function initializeDatabase() {
  if (!TURSO_URL) {
    console.warn('[DB] TURSO_DATABASE_URL não configurada — server roda sem db');
    return;
  }
  console.log('Conectado ao Turso database');
}
