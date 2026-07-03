import { drizzle } from 'drizzle-orm/sql-js';
import initSqlJs from 'sql.js';
import * as schema from './schema.ts';
import fs from 'fs';

const DB_PATH = process.env.DATABASE_PATH || 'cacambas.db';
let _db: any = null;

export let sqliteDb: any = null;
export const db = new Proxy({} as any, {
  get(_, prop: string) {
    if (!_db) throw new Error('Database not initialized');
    const val = (_db as any)[prop];
    return typeof val === 'function' ? val.bind(_db) : val;
  },
  set(_, prop: string, value: any) {
    if (!_db) throw new Error('Database not initialized');
    (_db as any)[prop] = value;
    return true;
  },
});

export async function initializeDatabase() {
  const SQL = await initSqlJs();
  let sqlite: any;
  try {
    if (fs.existsSync(DB_PATH)) {
      const buffer = fs.readFileSync(DB_PATH);
      sqlite = new SQL.Database(buffer);
    } else {
      sqlite = new SQL.Database();
    }
  } catch {
    sqlite = new SQL.Database();
  }
  sqlite.run('PRAGMA journal_mode=MEMORY');
  sqliteDb = sqlite;
  _db = drizzle(sqlite, { schema });
  startAutoSave();
}

function startAutoSave() {
  setInterval(() => {
    if (sqliteDb) {
      try { fs.writeFileSync(DB_PATH, Buffer.from(sqliteDb.export())); } catch {}
    }
  }, 30000);
  process.on('SIGINT', () => { saveDb(); process.exit(0); });
  process.on('SIGTERM', () => { saveDb(); process.exit(0); });
}

function saveDb() {
  if (sqliteDb) {
    try { fs.writeFileSync(DB_PATH, Buffer.from(sqliteDb.export())); } catch {}
  }
}
