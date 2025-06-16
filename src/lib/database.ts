
"use server";

import sqlite3 from 'sqlite3';
import { open, type Database } from 'sqlite';
import path from 'path';

const DB_FILE = path.join(process.cwd(), 'local.db');

let appDbPromise: Promise<Database<sqlite3.Database, sqlite3.Statement>> | null = null;

async function _createTables(dbConnection: Database<sqlite3.Database, sqlite3.Statement>) {
  await dbConnection.exec(`
    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE
    );
  `);

  await dbConnection.exec(`
    CREATE TABLE IF NOT EXISTS sub_categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      categoryId TEXT NOT NULL,
      FOREIGN KEY (categoryId) REFERENCES categories(id) ON DELETE CASCADE,
      UNIQUE (name, categoryId)
    );
  `);

  await dbConnection.exec(`
    CREATE TABLE IF NOT EXISTS locations (
      id TEXT PRIMARY KEY,
      store TEXT NOT NULL,
      rack TEXT,
      shelf TEXT,
      UNIQUE (store, rack, shelf)
    );
  `);

  await dbConnection.exec(`
    CREATE TABLE IF NOT EXISTS suppliers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      contactPerson TEXT,
      contactMail TEXT,
      address TEXT
    );
  `);

  await dbConnection.exec(`
    CREATE TABLE IF NOT EXISTS units_of_measurement (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      abbreviation TEXT UNIQUE,
      base_unit_id TEXT,
      conversion_factor REAL NOT NULL DEFAULT 1.0,
      FOREIGN KEY (base_unit_id) REFERENCES units_of_measurement(id) ON DELETE SET NULL
    );
  `);

  await dbConnection.exec(`
    CREATE TABLE IF NOT EXISTS inventory (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 0,
      unitCost REAL NOT NULL DEFAULT 0,
      lastUpdated TEXT NOT NULL,
      lowStock INTEGER NOT NULL DEFAULT 0,
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

async function _seedInitialData(db: Database<sqlite3.Database, sqlite3.Statement>) {
  console.log('Seeding initial data...');

  // Units of Measurement
  const units = [
    { id: crypto.randomUUID(), name: 'Piece', abbreviation: 'pcs', base_unit_id: null, conversion_factor: 1.0 },
    { id: crypto.randomUUID(), name: 'Set', abbreviation: 'set', base_unit_id: null, conversion_factor: 1.0 },
    { id: crypto.randomUUID(), name: 'Pair', abbreviation: 'pr', base_unit_id: null, conversion_factor: 1.0 },
    { id: crypto.randomUUID(), name: 'Sheet', abbreviation: 'sh', base_unit_id: null, conversion_factor: 1.0 },
    { id: crypto.randomUUID(), name: 'Meter', abbreviation: 'm', base_unit_id: null, conversion_factor: 1.0 },
    { id: crypto.randomUUID(), name: 'Square Meter', abbreviation: 'sqm', base_unit_id: null, conversion_factor: 1.0 },
    { id: crypto.randomUUID(), name: 'Liter', abbreviation: 'L', base_unit_id: null, conversion_factor: 1.0 },
    { id: crypto.randomUUID(), name: 'Kilogram', abbreviation: 'kg', base_unit_id: null, conversion_factor: 1.0 },
    { id: crypto.randomUUID(), name: 'Box', abbreviation: 'box', base_unit_id: null, conversion_factor: 1.0 },
    { id: crypto.randomUUID(), name: 'Roll', abbreviation: 'roll', base_unit_id: null, conversion_factor: 1.0 },
  ];

  const literUnit = units.find(u => u.name === 'Liter');
  const kilogramUnit = units.find(u => u.name === 'Kilogram');

  if (literUnit) {
    units.push({ id: crypto.randomUUID(), name: 'Milliliter', abbreviation: 'mL', base_unit_id: literUnit.id, conversion_factor: 0.001 });
  }
  if (kilogramUnit) {
    units.push({ id: crypto.randomUUID(), name: 'Gram', abbreviation: 'g', base_unit_id: kilogramUnit.id, conversion_factor: 0.001 });
  }
  
  for (const unit of units) {
    try {
      await db.run(
        `INSERT INTO units_of_measurement (id, name, abbreviation, base_unit_id, conversion_factor) 
         VALUES (?, ?, ?, ?, ?) ON CONFLICT(name) DO NOTHING`,
        unit.id, unit.name, unit.abbreviation, unit.base_unit_id, unit.conversion_factor
      );
    } catch (e) {
      console.warn(`Could not insert unit ${unit.name}: ${(e as Error).message}`);
    }
  }
  console.log('Units of Measurement seeded.');

  // Categories
  const categoriesData = [
    { id: crypto.randomUUID(), name: 'Wood Panels' },
    { id: crypto.randomUUID(), name: 'Edge Banding' },
    { id: crypto.randomUUID(), name: 'Hardware' },
    { id: crypto.randomUUID(), name: 'Fasteners' },
    { id: crypto.randomUUID(), name: 'Finishes' },
    { id: crypto.randomUUID(), name: 'Accessories' },
    { id: crypto.randomUUID(), name: 'Adhesives & Sealants' },
  ];

  const categoryMap = new Map<string, string>();
  for (const cat of categoriesData) {
    try {
      await db.run('INSERT INTO categories (id, name) VALUES (?, ?) ON CONFLICT(name) DO NOTHING', cat.id, cat.name);
      categoryMap.set(cat.name, cat.id);
    } catch (e) {
       console.warn(`Could not insert category ${cat.name}: ${(e as Error).message}`);
    }
  }
  console.log('Categories seeded.');

  // Sub-Categories
  const subCategoriesData = [
    { name: 'Plywood', categoryName: 'Wood Panels' },
    { name: 'MDF (Medium-Density Fiberboard)', categoryName: 'Wood Panels' },
    { name: 'Particle Board', categoryName: 'Wood Panels' },
    { name: 'Veneer Sheets', categoryName: 'Wood Panels' },
    { name: 'PVC Edge Banding', categoryName: 'Edge Banding' },
    { name: 'Wood Veneer Edge Banding', categoryName: 'Edge Banding' },
    { name: 'Hinges', categoryName: 'Hardware' },
    { name: 'Drawer Slides', categoryName: 'Hardware' },
    { name: 'Handles & Knobs', categoryName: 'Hardware' },
    { name: 'Shelf Supports', categoryName: 'Hardware' },
    { name: 'Cabinet Legs', categoryName: 'Hardware' },
    { name: 'Screws', categoryName: 'Fasteners' },
    { name: 'Nails & Brads', categoryName: 'Fasteners' },
    { name: 'Dowels', categoryName: 'Fasteners' },
    { name: 'Cam Locks & Fittings', categoryName: 'Fasteners' },
    { name: 'Paint', categoryName: 'Finishes' },
    { name: 'Varnish / Lacquer', categoryName: 'Finishes' },
    { name: 'Wood Stain', categoryName: 'Finishes' },
    { name: 'Primer', categoryName: 'Finishes' },
    { name: 'Drawer Organizers', categoryName: 'Accessories' },
    { name: 'Lazy Susans', categoryName: 'Accessories' },
    { name: 'LED Lighting Strips', categoryName: 'Accessories' },
    { name: 'Wood Glue', categoryName: 'Adhesives & Sealants' },
    { name: 'Silicone Sealant', categoryName: 'Adhesives & Sealants' },
  ];

  for (const subCat of subCategoriesData) {
    const parentCategoryId = categoryMap.get(subCat.categoryName);
    if (parentCategoryId) {
      try {
        await db.run(
          'INSERT INTO sub_categories (id, name, categoryId) VALUES (?, ?, ?) ON CONFLICT(name, categoryId) DO NOTHING',
          crypto.randomUUID(), subCat.name, parentCategoryId
        );
      } catch (e) {
        console.warn(`Could not insert sub-category ${subCat.name} for ${subCat.categoryName}: ${(e as Error).message}`);
      }
    } else {
      console.warn(`Parent category ${subCat.categoryName} not found for sub-category ${subCat.name}.`);
    }
  }
  console.log('Sub-Categories seeded.');
  console.log('Initial data seeding complete.');
}


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
        await db.exec('PRAGMA foreign_keys = ON;');

        let schemaNeedsReset = false;
        try {
          // Check for inventory table presence
          const inventoryTableExists = await db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='inventory';");
          if (inventoryTableExists) {
            // Check for a key column from the current inventory schema
            await db.get('SELECT categoryId FROM inventory LIMIT 1;');
          } else {
             schemaNeedsReset = true; 
             console.log('Inventory table does not exist. Flagging for table reset.');
          }

          // Check for units_of_measurement table and the conversion_factor column
          const uomTableExists = await db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='units_of_measurement';");
          if (uomTableExists) {
            await db.get('SELECT conversion_factor FROM units_of_measurement LIMIT 1;');
          } else {
             schemaNeedsReset = true;
             console.log('Units_of_measurement table does not exist. Flagging for table reset.');
          }

        } catch (e: any) {
          if (e.message && e.message.toLowerCase().includes('no such column')) {
            console.warn(`Old schema detected (missing expected column: ${e.message}). Flagging for table reset.`);
            schemaNeedsReset = true;
          } else if (e.message && e.message.toLowerCase().includes('no such table')) {
             console.warn(`A table seems to be missing: ${e.message}. Flagging for table reset.`);
             schemaNeedsReset = true;
          } else {
            console.warn(`An unexpected issue during schema check: ${e.message}. Proceeding to ensure tables, but manual 'db:init' might be needed if issues persist.`);
          }
        }

        if (schemaNeedsReset) {
          console.log('Performing data reset: dropping and recreating all tables due to detected schema mismatch or missing tables.');
          await _dropTables(db);
          await _createTables(db);
          console.log('All tables have been reset and recreated.');
          await _seedInitialData(db); // Seed data after reset
        } else {
          await _createTables(db); // Ensure tables exist if no reset was needed
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
        appDbPromise = null;
        throw error;
      }
    })();
  }
  return appDbPromise;
}

export async function initializeDatabaseForScript(dropFirst: boolean = false): Promise<Database<sqlite3.Database, sqlite3.Statement>> {
  console.log(`Script is initializing database: ${DB_FILE}`);
  const db = await open({
    filename: DB_FILE,
    driver: sqlite3.Database,
  });
  await db.exec('PRAGMA foreign_keys = ON;');

  if (dropFirst) {
    console.log('Dropping existing tables as requested by script...');
    await _dropTables(db);
  }

  await _createTables(db);
  console.log('Database initialization by script complete. Tables created/ensured.');

  if (dropFirst) {
    await _seedInitialData(db);
  }

  return db;
}
