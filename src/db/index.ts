import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import * as schema from './schema.ts';

const TURSO_URL = process.env.TURSO_DATABASE_URL;
const TURSO_TOKEN = process.env.TURSO_AUTH_TOKEN;

if (!TURSO_URL) {
  throw new Error('TURSO_DATABASE_URL environment variable is required');
}

export const libsqlClient = createClient({
  url: TURSO_URL,
  authToken: TURSO_TOKEN,
});

export const db = drizzle(libsqlClient, { schema });

export async function initializeDatabase() {
  console.log('Conectado ao Turso database');
}
