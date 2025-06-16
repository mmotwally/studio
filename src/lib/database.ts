
import sqlite3 from 'sqlite3';
import { open, type Database } from 'sqlite';
import path from 'path';

const DB_FILE = path.join(process.cwd(), 'local.db');

export async function openDb(): Promise<Database<sqlite3.Database, sqlite3.Statement>> {
  return open({
    filename: DB_FILE,
    driver: sqlite3.Database,
  });
}

export async function initializeDatabase(db?: Database<sqlite3.Database, sqlite3.Statement>) {
  const dbConnection = db || await openDb();

  await dbConnection.exec(`
    CREATE TABLE IF NOT EXISTS inventory (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT,
      quantity INTEGER NOT NULL DEFAULT 0,
      unitCost REAL NOT NULL DEFAULT 0,
      location TEXT,
      supplier TEXT,
      lastUpdated TEXT NOT NULL,
      lowStock INTEGER NOT NULL DEFAULT 0 
    );
  `);

  await dbConnection.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      role TEXT,
      avatarUrl TEXT
    );
  `);

  await dbConnection.exec(`
    CREATE TABLE IF NOT EXISTS roles (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      description TEXT
    );
  `);

  console.log('Database tables created or already exist.');
  if (!db) {
    await dbConnection.close();
  }
}
