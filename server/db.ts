import fs from 'fs';
import path from 'path';
import { DatabaseSync } from 'node:sqlite';

export interface DbRecord {
  id: string;
  [key: string]: any;
}

// Built-in SQLite database (Node.js 22 built-in, completely self-contained - NO external database required)
let sqliteDb: DatabaseSync | null = null;

function getDbFilePath(): string {
  // Check local data directory first, then fallback to /tmp for serverless/read-only environments
  const localDir = path.resolve(process.cwd(), 'data');
  try {
    if (!fs.existsSync(localDir)) {
      fs.mkdirSync(localDir, { recursive: true });
    }
    return path.resolve(localDir, 'vcm.sqlite');
  } catch {
    const tmpDir = '/tmp';
    return path.resolve(tmpDir, 'vcm.sqlite');
  }
}

function initSqlite(): DatabaseSync | null {
  if (sqliteDb) return sqliteDb;
  try {
    const dbPath = getDbFilePath();
    sqliteDb = new DatabaseSync(dbPath);
    sqliteDb.exec(`
      CREATE TABLE IF NOT EXISTS records (
        table_name TEXT NOT NULL,
        id TEXT NOT NULL,
        data TEXT NOT NULL,
        created_at INTEGER DEFAULT (strftime('%s', 'now')),
        PRIMARY KEY (table_name, id)
      );
      CREATE INDEX IF NOT EXISTS idx_records_table ON records(table_name);
    `);
  } catch (err) {
    console.warn('SQLite file warning, falling back to in-memory SQLite store:', err);
    try {
      sqliteDb = new DatabaseSync(':memory:');
      sqliteDb.exec(`
        CREATE TABLE IF NOT EXISTS records (
          table_name TEXT NOT NULL,
          id TEXT NOT NULL,
          data TEXT NOT NULL,
          PRIMARY KEY (table_name, id)
        );
      `);
    } catch {
      sqliteDb = null;
    }
  }
  return sqliteDb;
}

// Memory fallback store if SQLite cannot be loaded
const memoryStore = new Map<string, Map<string, any>>();

export const db = {
  async list<T = any>(table: string, options: { limit?: number } = {}): Promise<{ items: T[] }> {
    const limit = options.limit || 5000;
    const sqlite = initSqlite();
    if (sqlite) {
      try {
        const stmt = sqlite.prepare('SELECT data FROM records WHERE table_name = ? LIMIT ?');
        const rows = stmt.all(table, limit) as Array<{ data: string }>;
        return {
          items: rows.map((r) => {
            try {
              return JSON.parse(r.data) as T;
            } catch {
              return {} as T;
            }
          }),
        };
      } catch (err) {
        console.warn('SQLite list error:', err);
      }
    }

    const tableMap = memoryStore.get(table) || new Map<string, any>();
    const items = Array.from(tableMap.values()).slice(0, limit) as T[];
    return { items };
  },

  async get<T = any>(table: string, ids: string[]): Promise<T[]> {
    if (!ids || ids.length === 0) return [];
    const sqlite = initSqlite();
    if (sqlite) {
      try {
        const results: T[] = [];
        const stmt = sqlite.prepare('SELECT data FROM records WHERE table_name = ? AND id = ?');
        for (const id of ids) {
          const row = stmt.get(table, String(id)) as { data: string } | undefined;
          if (row) {
            try {
              results.push(JSON.parse(row.data) as T);
            } catch {}
          }
        }
        return results;
      } catch (err) {
        console.warn('SQLite get error:', err);
      }
    }

    const tableMap = memoryStore.get(table) || new Map<string, any>();
    return ids
      .map((id) => tableMap.get(String(id)))
      .filter(Boolean) as T[];
  },

  async add(table: string, records: any[]): Promise<string[]> {
    const ids: string[] = [];
    for (const rec of records) {
      const id = String(rec.id || (rec.id === 0 ? 0 : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`));
      const record = { ...rec, id };

      const sqlite = initSqlite();
      if (sqlite) {
        try {
          const stmt = sqlite.prepare(
            `INSERT INTO records (table_name, id, data)
             VALUES (?, ?, ?)
             ON CONFLICT(table_name, id) DO UPDATE SET data = excluded.data`
          );
          stmt.run(table, id, JSON.stringify(record));
          ids.push(id);
          continue;
        } catch (err) {
          console.warn('SQLite add error:', err);
        }
      }

      if (!memoryStore.has(table)) {
        memoryStore.set(table, new Map());
      }
      memoryStore.get(table)!.set(id, record);
      ids.push(id);
    }
    return ids;
  },

  async update(table: string, updates: Array<{ id: string; record: any }>): Promise<boolean[]> {
    const results: boolean[] = [];
    for (const u of updates) {
      const id = String(u.id);
      const record = { ...u.record, id };

      const sqlite = initSqlite();
      if (sqlite) {
        try {
          const stmt = sqlite.prepare(
            `INSERT INTO records (table_name, id, data)
             VALUES (?, ?, ?)
             ON CONFLICT(table_name, id) DO UPDATE SET data = excluded.data`
          );
          stmt.run(table, id, JSON.stringify(record));
          results.push(true);
          continue;
        } catch (err) {
          console.warn('SQLite update error:', err);
        }
      }

      if (!memoryStore.has(table)) {
        memoryStore.set(table, new Map());
      }
      memoryStore.get(table)!.set(id, record);
      results.push(true);
    }
    return results;
  },

  async delete(table: string, ids: string[]): Promise<boolean[]> {
    const results: boolean[] = [];
    for (const id of ids) {
      const sId = String(id);
      const sqlite = initSqlite();
      if (sqlite) {
        try {
          const stmt = sqlite.prepare('DELETE FROM records WHERE table_name = ? AND id = ?');
          stmt.run(table, sId);
          results.push(true);
          continue;
        } catch (err) {
          console.warn('SQLite delete error:', err);
        }
      }

      if (memoryStore.has(table)) {
        memoryStore.get(table)!.delete(sId);
      }
      results.push(true);
    }
    return results;
  },
};
