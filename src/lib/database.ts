
import sqlite3 from 'sqlite3';
import { open, type Database } from 'sqlite';
import path from 'path';

const DB_FILE = path.join(process.cwd(), 'local.db');

// Global promise for the app's shared, initialized DB connection
let appDbPromise: Promise<Database<sqlite3.Database, sqlite3.Statement>> | null = null;

async function _createTables(dbConnection: Database<sqlite3.Database, sqlite3.Statement>) {
  // Categories Table
  await dbConnection.exec(`
    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE
    );
  `);

  // Sub-Categories Table
  await dbConnection.exec(`
    CREATE TABLE IF NOT EXISTS sub_categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      categoryId TEXT NOT NULL,
      FOREIGN KEY (categoryId) REFERENCES categories(id) ON DELETE CASCADE
    );
  `);

  // Locations Table
  await dbConnection.exec(`
    CREATE TABLE IF NOT EXISTS locations (
      id TEXT PRIMARY KEY,
      store TEXT NOT NULL,
      rack TEXT,
      shelf TEXT,
      UNIQUE (store, rack, shelf)
    );
  `);

  // Suppliers Table
  await dbConnection.exec(`
    CREATE TABLE IF NOT EXISTS suppliers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      contactPerson TEXT,
      contactMail TEXT,
      address TEXT
    );
  `);

  // Units of Measurement Table
  await dbConnection.exec(`
    CREATE TABLE IF NOT EXISTS units_of_measurement (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      abbreviation TEXT UNIQUE
    );
  `);

  // Inventory Table
  await dbConnection.exec(`
    CREATE TABLE IF NOT EXISTS inventory (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 0,
      unitCost REAL NOT NULL DEFAULT 0,
      lastUpdated TEXT NOT NULL,
      lowStock INTEGER NOT NULL DEFAULT 0, /* Boolean: 0 for false, 1 for true */
      categoryId TEXT,
      subCategoryId TEXT,
      locationId TEXT,
      supplierId TEXT,
      unitId TEXT,
      FOREIGN KEY (categoryId) REFERENCES categories(id) ON DELETE SET NULL,
      FOREIGN KEY (subCategoryId) REFERENCES sub_categories(id) ON DELETE SET NULL,
      FOREIGN KEY (locationId) REFERENCES locations(id) ON DELETE SET NULL,
      FOREIGN KEY (supplierId) REFERENCES suppliers(id) ON DELETE SET NULL,
      FOREIGN KEY (unitId) REFERENCES units_of_measurement(id) ON DELETE SET NULL
    );
  `);

  // Users Table
  await dbConnection.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      role TEXT, /* Could be a foreign key to a 'roles' table if roles become complex */
      avatarUrl TEXT
    );
  `);

  // Roles Table (example, can be expanded)
  await dbConnection.exec(`
    CREATE TABLE IF NOT EXISTS roles (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      description TEXT
    );
  `);
  console.log('Tables schema checked/created by _createTables.');
}

async function _dropTables(dbConnection: Database<sqlite3.Database, sqlite3.Statement>) {
  await dbConnection.exec(`DROP TABLE IF EXISTS inventory;`);
  await dbConnection.exec(`DROP TABLE IF EXISTS units_of_measurement;`);
  await dbConnection.exec(`DROP TABLE IF EXISTS suppliers;`);
  await dbConnection.exec(`DROP TABLE IF EXISTS locations;`);
  await dbConnection.exec(`DROP TABLE IF EXISTS sub_categories;`);
  await dbConnection.exec(`DROP TABLE IF EXISTS categories;`);
  await dbConnection.exec(`DROP TABLE IF EXISTS users;`);
  await dbConnection.exec(`DROP TABLE IF EXISTS roles;`);
  console.log('Existing tables dropped by _dropTables.');
}

// Function for the application to get a shared, initialized DB connection
export async function openDb(): Promise<Database<sqlite3.Database, sqlite3.Statement>> {
  if (!appDbPromise) {
    appDbPromise = (async () => {
      let db: Database<sqlite3.Database, sqlite3.Statement> | null = null;
      try {
        console.log(`App is opening/getting database connection to: ${DB_FILE}`);
        db = await open({
          filename: DB_FILE,
          driver: sqlite3.Database,
        });
        console.log('App database connection opened.');
        await db.exec('PRAGMA foreign_keys = ON;'); // Enforce foreign key constraints

        let schemaNeedsReset = false;
        try {
          // Check if inventory table exists
          const inventoryTableExists = await db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='inventory';");
          if (inventoryTableExists) {
            // If inventory table exists, check for a column from the new schema (e.g., categoryId)
            // This query will throw an error if the column doesn't exist.
            await db.get('SELECT categoryId FROM inventory LIMIT 1;');
            console.log('Inventory table schema check: categoryId column found.');
          } else {
            // Inventory table doesn't exist, so _createTables will handle it without needing a reset.
            console.log('Inventory table does not exist yet. It will be created.');
          }
        } catch (e: any) {
          // Check if the error is specifically "no such column" for our target column.
          if (e.message && e.message.toLowerCase().includes('no such column') && e.message.toLowerCase().includes('categoryid')) {
            console.warn(`Old schema detected in 'inventory' table (missing 'categoryId'). Reason: ${e.message}. Flagging for table reset.`);
            schemaNeedsReset = true;
          } else if (e.message && e.message.toLowerCase().includes('no such table') && e.message.toLowerCase().includes('inventory')) {
             // This case is if inventory table itself is missing, _createTables handles this, no reset needed by this logic block.
             console.log(`Inventory table not found during schema check. It will be created.`);
          } else {
            // An unexpected error occurred during the schema check.
            console.error('Unexpected error during schema check:', e);
            // We might not want to reset for all types of errors, so we re-throw.
            // Or, depending on policy, we might still proceed to _createTables.
            // For now, let's re-throw to make it visible.
            // throw e; // Or decide to let _createTables try its best.
            // For robustness in this dev context, let's assume _createTables should run.
             console.warn(`An unexpected issue during schema check: ${e.message}. Proceeding to ensure tables.`);
          }
        }

        if (schemaNeedsReset) {
          console.log('Performing data reset: dropping and recreating all tables due to detected old inventory schema.');
          await _dropTables(db);
          await _createTables(db);
          console.log('All tables have been reset and recreated.');
        } else {
          // If schema was okay, or specific column-missing error wasn't hit,
          // just ensure all tables are created (IF NOT EXISTS).
          await _createTables(db);
        }
        
        console.log('App database tables ensured/initialized.');
        return db;
      } catch (error) {
        console.error('App failed to open or initialize database:', error);
        if (db) {
          try {
            await db.close();
          } catch (closeErr) {
            console.error("Failed to close DB connection on error path:", closeErr);
          }
        }
        appDbPromise = null; // Reset promise on failure to allow retry
        throw error;
      }
    })();
  }
  return appDbPromise;
}

// Function specifically for the init-db.ts script
export async function initializeDatabaseForScript(dropFirst: boolean = false): Promise<Database<sqlite3.Database, sqlite3.Statement>> {
  console.log(`Script is initializing database: ${DB_FILE}`);
  const db = await open({
    filename: DB_FILE,
    driver: sqlite3.Database,
  });
  await db.exec('PRAGMA foreign_keys = ON;'); // Enforce foreign key constraints

  if (dropFirst) {
    console.log('Dropping existing tables as requested by script...');
    await _dropTables(db);
  }

  await _createTables(db);
  console.log('Database initialization by script complete. Tables created/ensured.');
  return db; // Return the connection so the script can close it
}
