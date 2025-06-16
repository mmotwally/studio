
import sqlite3 from 'sqlite3';
import { open, type Database } from 'sqlite';
import path from 'path';

const DB_FILE = path.join(process.cwd(), 'local.db');

// Global promise for the app's shared, initialized DB connection
let appDbPromise: Promise<Database<sqlite3.Database, sqlite3.Statement>> | null = null;

async function _createTables(dbConnection: Database<sqlite3.Database, sqlite3.Statement>) {
  // Inventory Table
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

  // Users Table
  await dbConnection.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      role TEXT,
      avatarUrl TEXT
    );
  `);

  // Roles Table
  await dbConnection.exec(`
    CREATE TABLE IF NOT EXISTS roles (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      description TEXT
    );
  `);
  console.log('Tables schema checked/created by _createTables.');
}

// Function for the application to get a shared, initialized DB connection
export async function openDb(): Promise<Database<sqlite3.Database, sqlite3.Statement>> {
  if (!appDbPromise) {
    appDbPromise = (async () => {
      try {
        console.log(`App is opening/getting database connection to: ${DB_FILE}`);
        const db = await open({
          filename: DB_FILE,
          driver: sqlite3.Database,
        });
        console.log('App database connection opened. Ensuring tables exist...');
        await _createTables(db); // Initialize on first connection for the app
        console.log('App database tables ensured.');
        return db;
      } catch (error) {
        console.error('App failed to open or initialize database:', error);
        appDbPromise = null; // Reset promise on failure to allow retry
        throw error;
      }
    })();
  }
  return appDbPromise;
}

// Function specifically for the init-db.ts script
// This will open its own connection, create tables, and then the script can close it.
export async function initializeDatabaseForScript(): Promise<Database<sqlite3.Database, sqlite3.Statement>> {
  console.log(`Script is initializing database: ${DB_FILE}`);
  const db = await open({
    filename: DB_FILE,
    driver: sqlite3.Database,
  });
  await _createTables(db);
  console.log('Database initialization by script complete. Tables created/ensured.');
  return db; // Return the connection so the script can close it
}
