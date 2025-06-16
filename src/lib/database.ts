
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
      name TEXT NOT NULL UNIQUE,
      code TEXT NOT NULL UNIQUE
    );
  `);

  await dbConnection.exec(`
    CREATE TABLE IF NOT EXISTS sub_categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      categoryId TEXT NOT NULL,
      code TEXT NOT NULL,
      FOREIGN KEY (categoryId) REFERENCES categories(id) ON DELETE CASCADE,
      UNIQUE (name, categoryId),
      UNIQUE (categoryId, code)
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
      contactPhone TEXT,
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
      id TEXT PRIMARY KEY, -- Will store structured ID like CAT-SUB-001 or UUID if no category
      name TEXT NOT NULL,
      description TEXT,
      imageUrl TEXT,
      quantity INTEGER NOT NULL DEFAULT 0,
      unitCost REAL NOT NULL DEFAULT 0,
      lastUpdated TEXT NOT NULL,
      lowStock INTEGER NOT NULL DEFAULT 0,
      minStockLevel INTEGER DEFAULT 0,
      maxStockLevel INTEGER DEFAULT 0,
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
  const unitPcsId = crypto.randomUUID();
  const unitSetId = crypto.randomUUID();
  const unitPairId = crypto.randomUUID();
  const unitSheetId = crypto.randomUUID();
  const unitMeterId = crypto.randomUUID();
  const unitSqMId = crypto.randomUUID();
  const unitLiterId = crypto.randomUUID();
  const unitKgId = crypto.randomUUID();
  const unitBoxId = crypto.randomUUID();
  const unitRollId = crypto.randomUUID();
  const unitMlId = crypto.randomUUID();
  const unitGramId = crypto.randomUUID();

  const units = [
    { id: unitPcsId, name: 'Piece', abbreviation: 'pcs', base_unit_id: null, conversion_factor: 1.0 },
    { id: unitSetId, name: 'Set', abbreviation: 'set', base_unit_id: null, conversion_factor: 1.0 },
    { id: unitPairId, name: 'Pair', abbreviation: 'pr', base_unit_id: null, conversion_factor: 1.0 },
    { id: unitSheetId, name: 'Sheet', abbreviation: 'sh', base_unit_id: null, conversion_factor: 1.0 },
    { id: unitMeterId, name: 'Meter', abbreviation: 'm', base_unit_id: null, conversion_factor: 1.0 },
    { id: unitSqMId, name: 'Square Meter', abbreviation: 'sqm', base_unit_id: null, conversion_factor: 1.0 },
    { id: unitLiterId, name: 'Liter', abbreviation: 'L', base_unit_id: null, conversion_factor: 1.0 },
    { id: unitKgId, name: 'Kilogram', abbreviation: 'kg', base_unit_id: null, conversion_factor: 1.0 },
    { id: unitBoxId, name: 'Box', abbreviation: 'box', base_unit_id: null, conversion_factor: 1.0 },
    { id: unitRollId, name: 'Roll', abbreviation: 'roll', base_unit_id: null, conversion_factor: 1.0 },
    { id: unitMlId, name: 'Milliliter', abbreviation: 'mL', base_unit_id: unitLiterId, conversion_factor: 0.001 },
    { id: unitGramId, name: 'Gram', abbreviation: 'g', base_unit_id: unitKgId, conversion_factor: 0.001 },
  ];
  
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
  const catWoodPanelsId = crypto.randomUUID();
  const catEdgeBandingId = crypto.randomUUID();
  const catHardwareId = crypto.randomUUID();
  const catFastenersId = crypto.randomUUID();
  const catFinishesId = crypto.randomUUID();
  const catAccessoriesId = crypto.randomUUID();
  const catAdhesivesId = crypto.randomUUID();

  const categoriesData = [
    { id: catWoodPanelsId, name: 'Wood Panels', code: 'WP' },
    { id: catEdgeBandingId, name: 'Edge Banding', code: 'EB' },
    { id: catHardwareId, name: 'Hardware', code: 'HW' },
    { id: catFastenersId, name: 'Fasteners', code: 'FS' },
    { id: catFinishesId, name: 'Finishes', code: 'FN' },
    { id: catAccessoriesId, name: 'Accessories', code: 'AC' },
    { id: catAdhesivesId, name: 'Adhesives & Sealants', code: 'AS' },
  ];

  for (const cat of categoriesData) {
    try {
      await db.run('INSERT INTO categories (id, name, code) VALUES (?, ?, ?) ON CONFLICT(name) DO NOTHING', cat.id, cat.name, cat.code);
    } catch (e) {
       console.warn(`Could not insert category ${cat.name}: ${(e as Error).message}`);
    }
  }
  console.log('Categories seeded.');

  // Sub-Categories
  const subCatPlywoodId = crypto.randomUUID();
  const subCatMdfId = crypto.randomUUID();
  const subCatParticleBoardId = crypto.randomUUID();
  const subCatVeneerSheetsId = crypto.randomUUID();
  const subCatPvcEdgeId = crypto.randomUUID();
  const subCatWoodVeneerEdgeId = crypto.randomUUID();
  const subCatHingesId = crypto.randomUUID();
  const subCatDrawerSlidesId = crypto.randomUUID();
  const subCatHandlesId = crypto.randomUUID();
  const subCatShelfSupportsId = crypto.randomUUID();
  const subCatCabinetLegsId = crypto.randomUUID();
  const subCatScrewsId = crypto.randomUUID();
  const subCatNailsBradsId = crypto.randomUUID();
  const subCatDowelsId = crypto.randomUUID();
  const subCatCamLocksId = crypto.randomUUID();
  const subCatPaintId = crypto.randomUUID();
  const subCatVarnishId = crypto.randomUUID();
  const subCatWoodStainId = crypto.randomUUID();
  const subCatPrimerId = crypto.randomUUID();
  const subCatDrawerOrgId = crypto.randomUUID();
  const subCatLazySusanId = crypto.randomUUID();
  const subCatLedStripId = crypto.randomUUID();
  const subCatWoodGlueId = crypto.randomUUID();
  const subCatSiliconeId = crypto.randomUUID();


  const subCategoriesData = [
    { id: subCatPlywoodId, name: 'Plywood', categoryId: catWoodPanelsId, code: 'PLY' },
    { id: subCatMdfId, name: 'MDF', categoryId: catWoodPanelsId, code: 'MDF' },
    { id: subCatParticleBoardId, name: 'Particle Board', categoryId: catWoodPanelsId, code: 'PB' },
    { id: subCatVeneerSheetsId, name: 'Veneer Sheets', categoryId: catWoodPanelsId, code: 'VEN' },
    { id: subCatPvcEdgeId, name: 'PVC Edge Banding', categoryId: catEdgeBandingId, code: 'PVC' },
    { id: subCatWoodVeneerEdgeId, name: 'Wood Veneer Edge Banding', categoryId: catEdgeBandingId, code: 'WVE' },
    { id: subCatHingesId, name: 'Hinges', categoryId: catHardwareId, code: 'HNG' },
    { id: subCatDrawerSlidesId, name: 'Drawer Slides', categoryId: catHardwareId, code: 'DRS' },
    { id: subCatHandlesId, name: 'Handles & Knobs', categoryId: catHardwareId, code: 'HND' },
    { id: subCatShelfSupportsId, name: 'Shelf Supports', categoryId: catHardwareId, code: 'SHS' },
    { id: subCatCabinetLegsId, name: 'Cabinet Legs', categoryId: catHardwareId, code: 'LEG' },
    { id: subCatScrewsId, name: 'Screws', categoryId: catFastenersId, code: 'SCR' },
    { id: subCatNailsBradsId, name: 'Nails & Brads', categoryId: catFastenersId, code: 'NLB' },
    { id: subCatDowelsId, name: 'Dowels', categoryId: catFastenersId, code: 'DWL' },
    { id: subCatCamLocksId, name: 'Cam Locks & Fittings', categoryId: catFastenersId, code: 'CMF' },
    { id: subCatPaintId, name: 'Paint', categoryId: catFinishesId, code: 'PNT' },
    { id: subCatVarnishId, name: 'Varnish / Lacquer', categoryId: catFinishesId, code: 'VAR' },
    { id: subCatWoodStainId, name: 'Wood Stain', categoryId: catFinishesId, code: 'STN' },
    { id: subCatPrimerId, name: 'Primer', categoryId: catFinishesId, code: 'PRM' },
    { id: subCatDrawerOrgId, name: 'Drawer Organizers', categoryId: catAccessoriesId, code: 'DOR' },
    { id: subCatLazySusanId, name: 'Lazy Susans', categoryId: catAccessoriesId, code: 'LSN' },
    { id: subCatLedStripId, name: 'LED Lighting Strips', categoryId: catAccessoriesId, code: 'LED' },
    { id: subCatWoodGlueId, name: 'Wood Glue', categoryId: catAdhesivesId, code: 'WGL' },
    { id: subCatSiliconeId, name: 'Silicone Sealant', categoryId: catAdhesivesId, code: 'SIL' },
  ];

  for (const subCat of subCategoriesData) {
    try {
      await db.run(
        'INSERT INTO sub_categories (id, name, categoryId, code) VALUES (?, ?, ?, ?) ON CONFLICT(name, categoryId) DO NOTHING',
        subCat.id, subCat.name, subCat.categoryId, subCat.code
      );
    } catch (e) {
      console.warn(`Could not insert sub-category ${subCat.name} for category ID ${subCat.categoryId}: ${(e as Error).message}`);
    }
  }
  console.log('Sub-Categories seeded.');

  // Locations
  const locMainWarehouseA1S1Id = crypto.randomUUID();
  const locWorkshopStorageB2Id = crypto.randomUUID();
  const locShowroomBackstockId = crypto.randomUUID();
  const locCuttingDeptRackCId = crypto.randomUUID();

  const locationsData = [
    { id: locMainWarehouseA1S1Id, store: 'Main Warehouse', rack: 'A1', shelf: 'S1' },
    { id: locWorkshopStorageB2Id, store: 'Workshop Storage', rack: 'B2', shelf: null },
    { id: locShowroomBackstockId, store: 'Showroom Backstock', rack: null, shelf: null },
    { id: locCuttingDeptRackCId, store: 'Cutting Department', rack: 'C', shelf: 'Bin 3' },
  ];
  for (const loc of locationsData) {
    try {
      await db.run(
        'INSERT INTO locations (id, store, rack, shelf) VALUES (?, ?, ?, ?) ON CONFLICT(store, rack, shelf) DO NOTHING',
        loc.id, loc.store, loc.rack, loc.shelf
      );
    } catch (e) {
      console.warn(`Could not insert location ${loc.store} - ${loc.rack} - ${loc.shelf}: ${(e as Error).message}`);
    }
  }
  console.log('Locations seeded.');

  // Suppliers
  const supPanelProId = crypto.randomUUID();
  const supHardwareHubId = crypto.randomUUID();
  const supFinishingTouchesId = crypto.randomUUID();
  const supLocalTimberId = crypto.randomUUID();

  const suppliersData = [
    { id: supPanelProId, name: 'PanelPro Supplies', contactPerson: 'John Doe', contactMail: 'john@panelpro.com', contactPhone: '555-1234', address: '123 Panel St, Suite A, Panel City' },
    { id: supHardwareHubId, name: 'Hardware Hub Inc.', contactPerson: 'Jane Smith', contactMail: 'jane@hardwarehub.com', contactPhone: '555-5678', address: '456 Hinge Ave, Hardware Town' },
    { id: supFinishingTouchesId, name: 'Finishing Touches Co.', contactPerson: 'Sam Lee', contactMail: 'sales@finishing.co', contactPhone: '555-9012', address: '789 Varnish Rd, Paintville' },
    { id: supLocalTimberId, name: 'Local Timber Yard', contactPerson: null, contactMail: 'info@localtimber.com', contactPhone: '555-3456', address: '1 Forest Way, Timber Town' },
  ];
  for (const sup of suppliersData) {
    try {
      await db.run(
        'INSERT INTO suppliers (id, name, contactPerson, contactMail, contactPhone, address) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(name) DO NOTHING',
        sup.id, sup.name, sup.contactPerson, sup.contactMail, sup.contactPhone, sup.address
      );
    } catch (e) {
      console.warn(`Could not insert supplier ${sup.name}: ${(e as Error).message}`);
    }
  }
  console.log('Suppliers seeded.');

  // Inventory Items (now using structured IDs from addInventoryItemAction logic if called, but for seeding, we'll pre-assign some)
  const inventoryItemsData = [
    // These IDs are illustrative for seeding; actual generation is in addInventoryItemAction
    {
      id: 'WP-PLY-001', name: '18mm Birch Plywood (2440x1220mm)', description: 'High-quality birch plywood for structural and aesthetic applications.', imageUrl: 'https://placehold.co/300x200.png?text=Plywood',
      quantity: 50, unitCost: 45.50, lowStock: 0, minStockLevel: 10, maxStockLevel: 100,
      categoryId: catWoodPanelsId, subCategoryId: subCatPlywoodId, locationId: locMainWarehouseA1S1Id, supplierId: supPanelProId, unitId: unitSheetId,
    },
    {
      id: 'WP-MDF-001', name: 'Standard MDF Sheet (2440x1220x18mm)', description: 'Medium-density fiberboard, ideal for paint-grade cabinet doors and panels.', imageUrl: 'https://placehold.co/300x200.png?text=MDF',
      quantity: 75, unitCost: 28.00, lowStock: 0, minStockLevel: 20, maxStockLevel: 150,
      categoryId: catWoodPanelsId, subCategoryId: subCatMdfId, locationId: locMainWarehouseA1S1Id, supplierId: supPanelProId, unitId: unitSheetId,
    },
    {
      id: 'EB-PVC-001', name: 'White PVC Edge Banding (22mm x 0.45mm)', description: 'Durable PVC edge banding for finishing MDF and particle board edges.', imageUrl: 'https://placehold.co/300x200.png?text=Edge+Band',
      quantity: 5, unitCost: 15.00, lowStock: 1, minStockLevel: 2, maxStockLevel: 10,
      categoryId: catEdgeBandingId, subCategoryId: subCatPvcEdgeId, locationId: locWorkshopStorageB2Id, supplierId: supFinishingTouchesId, unitId: unitRollId,
    },
    {
      id: 'HW-HNG-001', name: 'Soft-Close Cabinet Hinges (Full Overlay)', description: 'European style soft-close hinges for a quiet and smooth cabinet door operation.', imageUrl: 'https://placehold.co/300x200.png?text=Hinges',
      quantity: 200, unitCost: 1.80, lowStock: 0, minStockLevel: 50, maxStockLevel: 300,
      categoryId: catHardwareId, subCategoryId: subCatHingesId, locationId: locWorkshopStorageB2Id, supplierId: supHardwareHubId, unitId: unitPairId,
    },
  ];

  for (const item of inventoryItemsData) {
    try {
      await db.run(
        `INSERT INTO inventory (id, name, description, imageUrl, quantity, unitCost, lastUpdated, lowStock, minStockLevel, maxStockLevel, categoryId, subCategoryId, locationId, supplierId, unitId)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        item.id, item.name, item.description, item.imageUrl, item.quantity, item.unitCost, new Date().toISOString(), item.lowStock, item.minStockLevel, item.maxStockLevel,
        item.categoryId, item.subCategoryId, item.locationId, item.supplierId, item.unitId
      );
    } catch (e) {
      console.warn(`Could not insert inventory item ${item.name} with ID ${item.id}: ${(e as Error).message}`);
    }
  }
  console.log('Inventory Items seeded.');
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
        const tablesToEnsureExist = ['inventory', 'units_of_measurement', 'categories', 'sub_categories', 'locations', 'suppliers', 'users', 'roles'];
        const columnsToCheck: Record<string, string[]> = {
          inventory: ['minStockLevel', 'maxStockLevel', 'description', 'imageUrl'],
          units_of_measurement: ['conversion_factor', 'base_unit_id'],
          suppliers: ['contactPhone'],
          categories: ['code'],
          sub_categories: ['code', 'categoryId'],
        };


        for (const tableName of tablesToEnsureExist) {
          const tableExists = await db.get(`SELECT name FROM sqlite_master WHERE type='table' AND name='${tableName}';`);
          if (!tableExists) {
            console.warn(`Table ${tableName} does not exist. Flagging for full schema reset.`);
            schemaNeedsReset = true;
            break; 
          }
          if (columnsToCheck[tableName]) {
            const tableInfo = await db.all(`PRAGMA table_info(${tableName});`);
            const existingColumnNames = tableInfo.map(col => col.name);
            for (const columnName of columnsToCheck[tableName]) {
              if (!existingColumnNames.includes(columnName)) {
                console.warn(`Old schema detected for table ${tableName} (missing column: ${columnName}). Flagging for table reset.`);
                schemaNeedsReset = true;
                break; 
              }
            }
            if (schemaNeedsReset) break; 
          }
        }


        if (schemaNeedsReset) {
          console.log('Performing data reset: dropping and recreating all tables due to detected schema mismatch or missing tables/columns.');
          await _dropTables(db);
          await _createTables(db);
          console.log('All tables have been reset and recreated.');
          await _seedInitialData(db); 
        } else {
          await _createTables(db); 
          const categoryCountResult = await db.get('SELECT COUNT(*) as count FROM categories');
          const categoryCount = categoryCountResult?.count ?? 0;
          
          if (categoryCount === 0) {
            console.log('Categories table is empty, but no schema reset was triggered. Seeding initial data.');
            await _seedInitialData(db);
          } else {
            const inventoryCountResult = await db.get('SELECT COUNT(*) as count FROM inventory');
            const inventoryCount = inventoryCountResult?.count ?? 0;
            if (inventoryCount === 0) {
                 console.log('Inventory table is empty. Re-seeding initial data for inventory (and potentially related lookups if they were also empty).');
                await _seedInitialData(db); // Re-seed all if inventory is empty as it might indicate a partial wipe or first seed
            }
          }
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
  } else { 
    const categoryCountResult = await db.get('SELECT COUNT(*) as count FROM categories');
    const categoryCount = categoryCountResult?.count ?? 0;
    if (categoryCount === 0) {
        console.log('Script: Categories table is empty. Seeding initial data.');
        await _seedInitialData(db);
    }
  }

  return db;
}

    