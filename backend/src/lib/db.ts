import { Database } from "bun:sqlite";
import { join } from "path";

const DB_PATH = join(import.meta.dir, "../../trending.db");

let _db: Database | null = null;

function getDb(): Database {
  if (_db) return _db;
  _db = new Database(DB_PATH, { create: true });
  _db.run("PRAGMA journal_mode=WAL");
  _db.run(`
    CREATE TABLE IF NOT EXISTS TrendingSearch (
      id             TEXT PRIMARY KEY,
      query          TEXT NOT NULL UNIQUE,
      count          INTEGER NOT NULL DEFAULT 1,
      platforms      TEXT NOT NULL,
      cachedProducts TEXT,
      cacheExpiresAt TEXT,
      lastSearchedAt TEXT NOT NULL DEFAULT (datetime('now')),
      createdAt      TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);
  return _db;
}

function generateCuid(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).slice(2, 9);
  return `c${timestamp}${random}`;
}

export interface TrendingSearchRow {
  id: string;
  query: string;
  count: number;
  platforms: string;
  cachedProducts: string | null;
  cacheExpiresAt: string | null;
  lastSearchedAt: string;
  createdAt: string;
}

export function upsertTrendingSearch(
  query: string,
  platforms: string[],
  products: unknown[]
): void {
  const db = getDb();
  const now = new Date().toISOString();
  const cacheExpires = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const cachedProducts = JSON.stringify(products.slice(0, 10));
  const platformsJson = JSON.stringify(platforms);

  const existing = db
    .query<TrendingSearchRow, [string]>(
      "SELECT id, count FROM TrendingSearch WHERE query = ?"
    )
    .get(query.toLowerCase());

  if (existing) {
    db.run(
      `UPDATE TrendingSearch
       SET count = ?, platforms = ?, cachedProducts = ?, cacheExpiresAt = ?, lastSearchedAt = ?
       WHERE query = ?`,
      [
        existing.count + 1,
        platformsJson,
        cachedProducts,
        cacheExpires,
        now,
        query.toLowerCase(),
      ]
    );
  } else {
    db.run(
      `INSERT INTO TrendingSearch (id, query, count, platforms, cachedProducts, cacheExpiresAt, lastSearchedAt, createdAt)
       VALUES (?, ?, 1, ?, ?, ?, ?, ?)`,
      [
        generateCuid(),
        query.toLowerCase(),
        platformsJson,
        cachedProducts,
        cacheExpires,
        now,
        now,
      ]
    );
  }
}

export function getTopTrending(limit = 10): TrendingSearchRow[] {
  const db = getDb();
  return db
    .query<TrendingSearchRow, []>(
      `SELECT * FROM TrendingSearch ORDER BY count DESC LIMIT ${limit}`
    )
    .all();
}

export function updateTrendingCache(
  query: string,
  products: unknown[],
  platforms: string[]
): void {
  const db = getDb();
  const now = new Date().toISOString();
  const cacheExpires = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  db.run(
    `UPDATE TrendingSearch
     SET cachedProducts = ?, cacheExpiresAt = ?, platforms = ?, lastSearchedAt = ?
     WHERE query = ?`,
    [
      JSON.stringify(products.slice(0, 10)),
      cacheExpires,
      JSON.stringify(platforms),
      now,
      query.toLowerCase(),
    ]
  );
}
