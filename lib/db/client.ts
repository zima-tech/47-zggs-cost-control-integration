import fs from "node:fs";
import path from "node:path";

import BetterSqlite3 from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";

import * as schema from "@/lib/db/schema";

const dataDirectory = path.join(process.cwd(), "data");
const databasePath = path.join(dataDirectory, "admin.sqlite");

type SqliteConnection = InstanceType<typeof BetterSqlite3>;

function createConnection() {
  fs.mkdirSync(dataDirectory, { recursive: true });

  const connection = new BetterSqlite3(databasePath);

  connection.pragma("foreign_keys = ON");
  connection.pragma("journal_mode = WAL");

  return connection;
}

const globalForAdminDb = globalThis as typeof globalThis & {
  __adminSqliteConnection__?: SqliteConnection;
};

const sqlite = globalForAdminDb.__adminSqliteConnection__ ?? createConnection();

if (process.env.NODE_ENV !== "production") {
  globalForAdminDb.__adminSqliteConnection__ = sqlite;
}

const db = drizzle(sqlite, { schema });

export { dataDirectory, databasePath, db, sqlite };
