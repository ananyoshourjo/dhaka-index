import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

const dataDirectory = path.resolve(
  process.env.DHAKA_INDEX_DATA_DIR ?? path.join(process.cwd(), "..", "data"),
);
const dbPath = path.join(dataDirectory, "dhaka-index.db");

fs.mkdirSync(path.dirname(dbPath), { recursive: true });

const globalForDb = globalThis as typeof globalThis & {
  __dhakaIndexAdminDb?: Database.Database;
};

export const db =
  globalForDb.__dhakaIndexAdminDb ??
  new Database(dbPath, {
    fileMustExist: false,
  });

if (!globalForDb.__dhakaIndexAdminDb) {
  globalForDb.__dhakaIndexAdminDb = db;
}

db.pragma("journal_mode = WAL");
db.pragma("busy_timeout = 30000");
db.pragma("foreign_keys = ON");

function ensureAdminJobColumns() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS app_admins (
      user_id TEXT PRIMARY KEY,
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES "user" ("id") ON DELETE CASCADE
    );
  `);

  const columns = db.prepare(`PRAGMA table_info(jobs)`).all() as Array<{
    name: string;
  }>;

  if (columns.length === 0) {
    return;
  }

  const columnNames = new Set(columns.map((column) => column.name));

  if (!columnNames.has("admin_title")) {
    db.exec(`ALTER TABLE jobs ADD COLUMN admin_title TEXT`);
  }

  if (!columnNames.has("admin_company")) {
    db.exec(`ALTER TABLE jobs ADD COLUMN admin_company TEXT`);
  }

  if (!columnNames.has("admin_deadline_at")) {
    db.exec(`ALTER TABLE jobs ADD COLUMN admin_deadline_at TEXT`);
  }

  if (!columnNames.has("admin_deadline_override")) {
    db.exec(`ALTER TABLE jobs ADD COLUMN admin_deadline_override INTEGER NOT NULL DEFAULT 0`);
  }

  if (!columnNames.has("admin_edited_at")) {
    db.exec(`ALTER TABLE jobs ADD COLUMN admin_edited_at TEXT`);
  }

  if (!columnNames.has("deleted_at")) {
    db.exec(`ALTER TABLE jobs ADD COLUMN deleted_at TEXT`);
  }
}

ensureAdminJobColumns();
