import { createClient, type Client } from '@libsql/client';
import { drizzle, type LibSQLDatabase } from 'drizzle-orm/libsql';
import * as schema from './schema.ts';

const TURSO_URL = process.env.TURSO_DATABASE_URL;
const TURSO_TOKEN = process.env.TURSO_AUTH_TOKEN;

let _client: Client | null = null;
let _db: LibSQLDatabase<typeof schema> | null = null;

function getClient(): Client {
  if (!_client) {
    if (!TURSO_URL) throw new Error('TURSO_DATABASE_URL environment variable is required');
    _client = createClient({ url: TURSO_URL, authToken: TURSO_TOKEN });
  }
  return _client;
}

function getDb(): LibSQLDatabase<typeof schema> {
  if (!_db) {
    _db = drizzle(getClient(), { schema });
  }
  return _db;
}

export const libsqlClient = new Proxy({} as Client, { get: (_, p) => (getClient() as any)[p] });
export const db = new Proxy({} as LibSQLDatabase<typeof schema>, { get: (_, p) => (getDb() as any)[p] });

export function isDbAvailable(): boolean {
  return !!TURSO_URL;
}

export async function initializeDatabase() {
  if (!TURSO_URL) {
    console.warn('[DB] TURSO_DATABASE_URL não configurada — banco indisponível, server roda sem db');
    return;
  }
  getClient();
  console.log('Conectado ao Turso database');
}
