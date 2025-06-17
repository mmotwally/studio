
"use server";

import sqlite3 from 'sqlite3';
import { open, type Database } from 'sqlite';
import path from 'path';

const DB_FILE = path.join(process.cwd(), 'local.db');

let appDbPromise: Promise<Database<sqlite3.Database, sqlite3.Statement>> | null = null;

// Define constant UUIDs for seeded entities
const SEED_DEPT_ENGINEERING_ID = 'd0a1b2c3-0001-4000-8000-000000000001';
const SEED_DEPT_PRODUCTION_ID  = 'd0a1b2c3-0002-4000-8000-000000000002';
const SEED_DEPT_MAINTENANCE_ID = 'd0a1b2c3-0003-4000-8000-000000000003';
const SEED_DEPT_DESIGN_ID      = 'd0a1b2c3-0004-4000-8000-000000000004';

const SEED_UNIT_PCS_ID    = 'u0a1b2c3-0001-4000-8000-000000000001';
const SEED_UNIT_SET_ID    = 'u0a1b2c3-0002-4000-8000-000000000002';
const SEED_UNIT_PAIR_ID   = 'u0a1b2c3-0003-4000-8000-000000000003';
const SEED_UNIT_SHEET_ID  = 'u0a1b2c3-0004-4000-8000-000000000004';
const SEED_UNIT_METER_ID  = 'u0a1b2c3-0005-4000-8000-000000000005';
const SEED_UNIT_SQM_ID    = 'u0a1b2c3-0006-4000-8000-000000000006';
const SEED_UNIT_LITER_ID  = 'u0a1b2c3-0007-4000-8000-000000000007';
const SEED_UNIT_KG_ID     = 'u0a1b2c3-0008-4000-8000-000000000008';
const SEED_UNIT_BOX_ID    = 'u0a1b2c3-0009-4000-8000-000000000009';
const SEED_UNIT_ROLL_ID   = 'u0a1b2c3-0010-4000-8000-000000000010';
const SEED_UNIT_ML_ID     = 'u0a1b2c3-0011-4000-8000-000000000011'; // Derived from Liter
const SEED_UNIT_GRAM_ID   = 'u0a1b2c3-0012-4000-8000-000000000012'; // Derived from Kg

const SEED_CAT_WOOD_PANELS_ID   = 'c0a1b2c3-0001-4000-8000-000000000001';
const SEED_CAT_EDGE_BANDING_ID  = 'c0a1b2c3-0002-4000-8000-000000000002';
const SEED_CAT_HARDWARE_ID      = 'c0a1b2c3-0003-4000-8000-000000000003';
const SEED_CAT_FASTENERS_ID     = 'c0a1b2c3-0004-4000-8000-000000000004';
const SEED_CAT_FINISHES_ID      = 'c0a1b2c3-0005-4000-8000-000000000005';
const SEED_CAT_ACCESSORIES_ID   = 'c0a1b2c3-0006-4000-8000-000000000006';
const SEED_CAT_ADHESIVES_ID     = 'c0a1b2c3-0007-4000-8000-000000000007';

// For sub-categories, locations, suppliers, their IDs can still be dynamic if not directly referenced by other seed data's FKs.
// However, if inventory items were to reference specific supplier IDs, those supplier IDs would also need to be constant.
// For now, inventory refers to supplierId by a dynamic UUID.

async function _createTables(dbConnection: Database<sqlite3.Database, sqlite3.Statement>) {
  await dbConnection.exec(`
    CREATE TABLE IF NOT EXISTS departments (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      code TEXT NOT NULL UNIQUE
    );
  `);

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
      id TEXT PRIMARY KEY,
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

  await dbConnection.exec(`
    CREATE TABLE IF NOT EXISTS requisitions (
      id TEXT PRIMARY KEY, -- e.g., REQ-YYYYMMDD-001
      requesterId TEXT, -- For future use with user authentication
      departmentId TEXT,
      orderNumber TEXT,
      bomNumber TEXT,
      dateCreated TEXT NOT NULL,
      dateNeeded TEXT,
      status TEXT NOT NULL DEFAULT 'PENDING_APPROVAL', -- PENDING_APPROVAL, APPROVED, REJECTED, FULFILLED, PARTIALLY_FULFILLED, CANCELLED
      notes TEXT,
      lastUpdated TEXT NOT NULL,
      FOREIGN KEY (requesterId) REFERENCES users(id) ON DELETE SET NULL,
      FOREIGN KEY (departmentId) REFERENCES departments(id) ON DELETE SET NULL
    );
  `);

  await dbConnection.exec(`
    CREATE TABLE IF NOT EXISTS requisition_items (
      id TEXT PRIMARY KEY, -- UUID
      requisitionId TEXT NOT NULL,
      inventoryItemId TEXT NOT NULL,
      quantityRequested INTEGER NOT NULL,
      quantityApproved INTEGER, 
      quantityIssued INTEGER DEFAULT 0,
      isApproved INTEGER DEFAULT 0, 
      notes TEXT,
      FOREIGN KEY (requisitionId) REFERENCES requisitions(id) ON DELETE CASCADE,
      FOREIGN KEY (inventoryItemId) REFERENCES inventory(id) ON DELETE RESTRICT 
    );
  `);

  console.log('Tables schema checked/created by _createTables.');
}

async function _dropTables(dbConnection: Database<sqlite3.Database, sqlite3.Statement>) {
  await dbConnection.exec(`DROP TABLE IF EXISTS requisition_items;`);
  await dbConnection.exec(`DROP TABLE IF EXISTS requisitions;`);
  await dbConnection.exec(`DROP TABLE IF EXISTS inventory;`);
  await dbConnection.exec(`DROP TABLE IF EXISTS units_of_measurement;`);
  await dbConnection.exec(`DROP TABLE IF EXISTS suppliers;`);
  await dbConnection.exec(`DROP TABLE IF EXISTS locations;`);
  await dbConnection.exec(`DROP TABLE IF EXISTS sub_categories;`);
  await dbConnection.exec(`DROP TABLE IF EXISTS categories;`);
  await dbConnection.exec(`DROP TABLE IF EXISTS users;`);
  await dbConnection.exec(`DROP TABLE IF EXISTS roles;`);
  await dbConnection.exec(`DROP TABLE IF EXISTS departments;`);
  console.log('Existing tables dropped by _dropTables.');
}

async function _seedInitialData(db: Database<sqlite3.Database, sqlite3.Statement>) {
  console.log('Seeding initial data...');

  // Departments
  const departmentsData = [
    { id: SEED_DEPT_ENGINEERING_ID, name: 'Engineering', code: 'ENG' },
    { id: SEED_DEPT_PRODUCTION_ID, name: 'Production', code: 'PROD' },
    { id: SEED_DEPT_MAINTENANCE_ID, name: 'Maintenance', code: 'MAINT' },
    { id: SEED_DEPT_DESIGN_ID, name: 'Design Office', code: 'DESIGN' },
  ];
  for (const dept of departmentsData) {
    try {
      await db.run('INSERT INTO departments (id, name, code) VALUES (?, ?, ?) ON CONFLICT(id) DO UPDATE SET name=excluded.name, code=excluded.code', dept.id, dept.name, dept.code);
    } catch (e) {
      console.warn(`Could not insert/update department ${dept.name}: ${(e as Error).message}`);
    }
  }
  console.log('Departments seeded.');

  // Units of Measurement
  const units = [
    { id: SEED_UNIT_PCS_ID, name: 'Piece', abbreviation: 'pcs', base_unit_id: null, conversion_factor: 1.0 },
    { id: SEED_UNIT_SET_ID, name: 'Set', abbreviation: 'set', base_unit_id: null, conversion_factor: 1.0 },
    { id: SEED_UNIT_PAIR_ID, name: 'Pair', abbreviation: 'pr', base_unit_id: null, conversion_factor: 1.0 },
    { id: SEED_UNIT_SHEET_ID, name: 'Sheet', abbreviation: 'sh', base_unit_id: null, conversion_factor: 1.0 },
    { id: SEED_UNIT_METER_ID, name: 'Meter', abbreviation: 'm', base_unit_id: null, conversion_factor: 1.0 },
    { id: SEED_UNIT_SQM_ID, name: 'Square Meter', abbreviation: 'sqm', base_unit_id: null, conversion_factor: 1.0 },
    { id: SEED_UNIT_LITER_ID, name: 'Liter', abbreviation: 'L', base_unit_id: null, conversion_factor: 1.0 },
    { id: SEED_UNIT_KG_ID, name: 'Kilogram', abbreviation: 'kg', base_unit_id: null, conversion_factor: 1.0 },
    { id: SEED_UNIT_BOX_ID, name: 'Box', abbreviation: 'box', base_unit_id: null, conversion_factor: 1.0 },
    { id: SEED_UNIT_ROLL_ID, name: 'Roll', abbreviation: 'roll', base_unit_id: null, conversion_factor: 1.0 },
    { id: SEED_UNIT_ML_ID, name: 'Milliliter', abbreviation: 'mL', base_unit_id: SEED_UNIT_LITER_ID, conversion_factor: 0.001 },
    { id: SEED_UNIT_GRAM_ID, name: 'Gram', abbreviation: 'g', base_unit_id: SEED_UNIT_KG_ID, conversion_factor: 0.001 },
  ];
  
  for (const unit of units) {
    try {
      await db.run(
        `INSERT INTO units_of_measurement (id, name, abbreviation, base_unit_id, conversion_factor) 
         VALUES (?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET name=excluded.name, abbreviation=excluded.abbreviation, base_unit_id=excluded.base_unit_id, conversion_factor=excluded.conversion_factor`,
        unit.id, unit.name, unit.abbreviation, unit.base_unit_id, unit.conversion_factor
      );
    } catch (e) {
      console.warn(`Could not insert/update unit ${unit.name}: ${(e as Error).message}`);
    }
  }
  console.log('Units of Measurement seeded.');

  // Categories
  const categoriesData = [
    { id: SEED_CAT_WOOD_PANELS_ID, name: 'Wood Panels', code: 'WP' },
    { id: SEED_CAT_EDGE_BANDING_ID, name: 'Edge Banding', code: 'EB' },
    { id: SEED_CAT_HARDWARE_ID, name: 'Hardware', code: 'HW' },
    { id: SEED_CAT_FASTENERS_ID, name: 'Fasteners', code: 'FS' },
    { id: SEED_CAT_FINISHES_ID, name: 'Finishes', code: 'FN' },
    { id: SEED_CAT_ACCESSORIES_ID, name: 'Accessories', code: 'AC' },
    { id: SEED_CAT_ADHESIVES_ID, name: 'Adhesives & Sealants', code: 'AS' },
  ];

  for (const cat of categoriesData) {
    try {
      await db.run('INSERT INTO categories (id, name, code) VALUES (?, ?, ?) ON CONFLICT(id) DO UPDATE SET name=excluded.name, code=excluded.code', cat.id, cat.name, cat.code);
    } catch (e) {
       console.warn(`Could not insert/update category ${cat.name}: ${(e as Error).message}`);
    }
  }
  console.log('Categories seeded.');

  // Sub-Categories (Using dynamic UUIDs for these as they are less likely to be FK targets from UI state directly after load)
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
    { id: subCatPlywoodId, name: 'Plywood', categoryId: SEED_CAT_WOOD_PANELS_ID, code: 'PLY' },
    { id: subCatMdfId, name: 'MDF', categoryId: SEED_CAT_WOOD_PANELS_ID, code: 'MDF' },
    { id: subCatParticleBoardId, name: 'Particle Board', categoryId: SEED_CAT_WOOD_PANELS_ID, code: 'PB' },
    { id: subCatVeneerSheetsId, name: 'Veneer Sheets', categoryId: SEED_CAT_WOOD_PANELS_ID, code: 'VEN' },
    { id: subCatPvcEdgeId, name: 'PVC Edge Banding', categoryId: SEED_CAT_EDGE_BANDING_ID, code: 'PVC' },
    { id: subCatWoodVeneerEdgeId, name: 'Wood Veneer Edge Banding', categoryId: SEED_CAT_EDGE_BANDING_ID, code: 'WVE' },
    { id: subCatHingesId, name: 'Hinges', categoryId: SEED_CAT_HARDWARE_ID, code: 'HNG' },
    { id: subCatDrawerSlidesId, name: 'Drawer Slides', categoryId: SEED_CAT_HARDWARE_ID, code: 'DRS' },
    { id: subCatHandlesId, name: 'Handles & Knobs', categoryId: SEED_CAT_HARDWARE_ID, code: 'HND' },
    { id: subCatShelfSupportsId, name: 'Shelf Supports', categoryId: SEED_CAT_HARDWARE_ID, code: 'SHS' },
    { id: subCatCabinetLegsId, name: 'Cabinet Legs', categoryId: SEED_CAT_HARDWARE_ID, code: 'LEG' },
    { id: subCatScrewsId, name: 'Screws', categoryId: SEED_CAT_FASTENERS_ID, code: 'SCR' },
    { id: subCatNailsBradsId, name: 'Nails & Brads', categoryId: SEED_CAT_FASTENERS_ID, code: 'NLB' },
    { id: subCatDowelsId, name: 'Dowels', categoryId: SEED_CAT_FASTENERS_ID, code: 'DWL' },
    { id: subCatCamLocksId, name: 'Cam Locks & Fittings', categoryId: SEED_CAT_FASTENERS_ID, code: 'CMF' },
    { id: subCatPaintId, name: 'Paint', categoryId: SEED_CAT_FINISHES_ID, code: 'PNT' },
    { id: subCatVarnishId, name: 'Varnish / Lacquer', categoryId: SEED_CAT_FINISHES_ID, code: 'VAR' },
    { id: subCatWoodStainId, name: 'Wood Stain', categoryId: SEED_CAT_FINISHES_ID, code: 'STN' },
    { id: subCatPrimerId, name: 'Primer', categoryId: SEED_CAT_FINISHES_ID, code: 'PRM' },
    { id: subCatDrawerOrgId, name: 'Drawer Organizers', categoryId: SEED_CAT_ACCESSORIES_ID, code: 'DOR' },
    { id: subCatLazySusanId, name: 'Lazy Susans', categoryId: SEED_CAT_ACCESSORIES_ID, code: 'LSN' },
    { id: subCatLedStripId, name: 'LED Lighting Strips', categoryId: SEED_CAT_ACCESSORIES_ID, code: 'LED' },
    { id: subCatWoodGlueId, name: 'Wood Glue', categoryId: SEED_CAT_ADHESIVES_ID, code: 'WGL' },
    { id: subCatSiliconeId, name: 'Silicone Sealant', categoryId: SEED_CAT_ADHESIVES_ID, code: 'SIL' },
  ];
  // Clear existing sub-categories before seeding to prevent conflicts if codes change for same name/category.
  await db.run('DELETE FROM sub_categories');
  for (const subCat of subCategoriesData) {
    try {
      await db.run(
        'INSERT INTO sub_categories (id, name, categoryId, code) VALUES (?, ?, ?, ?)',
        subCat.id, subCat.name, subCat.categoryId, subCat.code
      );
    } catch (e) {
      console.warn(`Could not insert sub-category ${subCat.name} for category ID ${subCat.categoryId}: ${(e as Error).message}`);
    }
  }
  console.log('Sub-Categories seeded.');

  // Locations (Dynamic UUIDs)
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
  await db.run('DELETE FROM locations');
  for (const loc of locationsData) {
    try {
      await db.run(
        'INSERT INTO locations (id, store, rack, shelf) VALUES (?, ?, ?, ?)',
        loc.id, loc.store, loc.rack, loc.shelf
      );
    } catch (e) {
      console.warn(`Could not insert location ${loc.store} - ${loc.rack} - ${loc.shelf}: ${(e as Error).message}`);
    }
  }
  console.log('Locations seeded.');

  // Suppliers (Dynamic UUIDs)
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
  await db.run('DELETE FROM suppliers');
  for (const sup of suppliersData) {
    try {
      await db.run(
        'INSERT INTO suppliers (id, name, contactPerson, contactMail, contactPhone, address) VALUES (?, ?, ?, ?, ?, ?)',
        sup.id, sup.name, sup.contactPerson, sup.contactMail, sup.contactPhone, sup.address
      );
    } catch (e) {
      console.warn(`Could not insert supplier ${sup.name}: ${(e as Error).message}`);
    }
  }
  console.log('Suppliers seeded.');

  // Inventory Items (Uses constant string IDs for items, but dynamic UUIDs for FKs to locations/suppliers)
  const inventoryItemsData = [
    {
      id: 'WP-PLY-001', name: '18mm Birch Plywood (2440x1220mm)', description: 'High-quality birch plywood for structural and aesthetic applications.', imageUrl: 'https://placehold.co/300x200.png?text=Plywood',
      quantity: 50, unitCost: 45.50, lowStock: 0, minStockLevel: 10, maxStockLevel: 100,
      categoryId: SEED_CAT_WOOD_PANELS_ID, subCategoryId: subCatPlywoodId, locationId: locMainWarehouseA1S1Id, supplierId: supPanelProId, unitId: SEED_UNIT_SHEET_ID,
    },
    {
      id: 'WP-MDF-001', name: 'Standard MDF Sheet (2440x1220x18mm)', description: 'Medium-density fiberboard, ideal for paint-grade cabinet doors and panels.', imageUrl: 'https://placehold.co/300x200.png?text=MDF',
      quantity: 75, unitCost: 28.00, lowStock: 0, minStockLevel: 20, maxStockLevel: 150,
      categoryId: SEED_CAT_WOOD_PANELS_ID, subCategoryId: subCatMdfId, locationId: locMainWarehouseA1S1Id, supplierId: supPanelProId, unitId: SEED_UNIT_SHEET_ID,
    },
    {
      id: 'EB-PVC-001', name: 'White PVC Edge Banding (22mm x 0.45mm)', description: 'Durable PVC edge banding for finishing MDF and particle board edges.', imageUrl: 'https://placehold.co/300x200.png?text=Edge+Band',
      quantity: 5, unitCost: 15.00, lowStock: 1, minStockLevel: 2, maxStockLevel: 10,
      categoryId: SEED_CAT_EDGE_BANDING_ID, subCategoryId: subCatPvcEdgeId, locationId: locWorkshopStorageB2Id, supplierId: supFinishingTouchesId, unitId: SEED_UNIT_ROLL_ID,
    },
    {
      id: 'HW-HNG-001', name: 'Soft-Close Cabinet Hinges (Full Overlay)', description: 'European style soft-close hinges for a quiet and smooth cabinet door operation.', imageUrl: 'https://placehold.co/300x200.png?text=Hinges',
      quantity: 200, unitCost: 1.80, lowStock: 0, minStockLevel: 50, maxStockLevel: 300,
      categoryId: SEED_CAT_HARDWARE_ID, subCategoryId: subCatHingesId, locationId: locWorkshopStorageB2Id, supplierId: supHardwareHubId, unitId: SEED_UNIT_PAIR_ID,
    },
  ];
  await db.run('DELETE FROM inventory');
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
        const tablesToEnsureExist = ['departments', 'inventory', 'units_of_measurement', 'categories', 'sub_categories', 'locations', 'suppliers', 'users', 'roles', 'requisitions', 'requisition_items'];
        const columnsToCheck: Record<string, string[]> = {
          inventory: ['minStockLevel', 'maxStockLevel', 'description', 'imageUrl'],
          units_of_measurement: ['conversion_factor', 'base_unit_id'],
          suppliers: ['contactPhone'],
          categories: ['code'],
          sub_categories: ['code', 'categoryId'],
          requisitions: ['requesterId', 'departmentId', 'orderNumber', 'bomNumber', 'dateNeeded', 'status', 'notes', 'lastUpdated'],
          requisition_items: ['requisitionId', 'inventoryItemId', 'quantityRequested', 'quantityApproved', 'quantityIssued', 'isApproved', 'notes'],
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
            // Check if key seeded departments exist, if not, re-seed.
            const seededDeptCheck = await db.get('SELECT id FROM departments WHERE id = ?', SEED_DEPT_ENGINEERING_ID);
            if (!seededDeptCheck) {
                 console.log('Key seeded department (Engineering) not found. Re-seeding all initial data.');
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

  // Always seed if dropping first, or if foundational tables like categories are empty or missing key seeded data.
  if (dropFirst) { 
    await _seedInitialData(db);
  } else { 
    const categoryCountResult = await db.get('SELECT COUNT(*) as count FROM categories');
    const categoryCount = categoryCountResult?.count ?? 0;
    if (categoryCount === 0) {
        console.log('Script: Categories table is empty. Seeding initial data.');
        await _seedInitialData(db);
    } else {
        const seededDeptCheck = await db.get('SELECT id FROM departments WHERE id = ?', SEED_DEPT_ENGINEERING_ID);
        if (!seededDeptCheck) {
             console.log('Script: Key seeded department not found. Re-seeding all initial data.');
             await _seedInitialData(db);
        }
    }
  }

  return db;
}
    
    