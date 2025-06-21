
"use server";

import sqlite3 from 'sqlite3';
import { open, type Database } from 'sqlite';
import path from 'path';
import { format } from 'date-fns';

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
const SEED_UNIT_ML_ID     = 'u0a1b2c3-0011-4000-8000-000000000011';
const SEED_UNIT_GRAM_ID   = 'u0a1b2c3-0012-4000-8000-000000000012';

const SEED_CAT_WOOD_PANELS_ID   = 'c0a1b2c3-0001-4000-8000-000000000001';
const SEED_CAT_EDGE_BANDING_ID  = 'c0a1b2c3-0002-4000-8000-000000000002';
const SEED_CAT_HARDWARE_ID      = 'c0a1b2c3-0003-4000-8000-000000000003';
const SEED_CAT_FASTENERS_ID     = 'c0a1b2c3-0004-4000-8000-000000000004';
const SEED_CAT_FINISHES_ID      = 'c0a1b2c3-0005-4000-8000-000000000005';
const SEED_CAT_ACCESSORIES_ID   = 'c0a1b2c3-0006-4000-8000-000000000006';
const SEED_CAT_ADHESIVES_ID     = 'c0a1b2c3-0007-4000-8000-000000000007';

const SEED_SUB_CAT_PLYWOOD_ID       = 'sc01-0001-4000-8000-plywood';
const SEED_SUB_CAT_MDF_ID           = 'sc01-0002-4000-8000-mdf';
const SEED_SUB_CAT_PARTICLE_ID    = 'sc01-0003-4000-8000-particle';
const SEED_SUB_CAT_VENEER_SHT_ID    = 'sc01-0004-4000-8000-veneersh';
const SEED_SUB_CAT_PVC_EDGE_ID      = 'sc02-0001-4000-8000-pvcedge';
const SEED_SUB_CAT_WOODVEN_EDGE_ID  = 'sc02-0002-4000-8000-woodvenedge';
const SEED_SUB_CAT_HINGES_ID        = 'sc03-0001-4000-8000-hinges';
const SEED_SUB_CAT_DRAWERSLIDES_ID  = 'sc03-0002-4000-8000-drawerslides';
const SEED_SUB_CAT_HANDLES_ID       = 'sc03-0003-4000-8000-handles';
const SEED_SUB_CAT_SHELFSUP_ID    = 'sc03-0004-4000-8000-shelfsupports';
const SEED_SUB_CAT_LEGS_ID          = 'sc03-0005-4000-8000-legs';
const SEED_SUB_CAT_SCREWS_ID        = 'sc04-0001-4000-8000-screws';
const SEED_SUB_CAT_NAILS_ID         = 'sc04-0002-4000-8000-nails';
const SEED_SUB_CAT_DOWELS_ID        = 'sc04-0003-4000-8000-dowels';
const SEED_SUB_CAT_CAMLOCKS_ID      = 'sc04-0004-4000-8000-camlocks';
const SEED_SUB_CAT_PAINT_ID         = 'sc05-0001-4000-8000-paint';
const SEED_SUB_CAT_VARNISH_ID       = 'sc05-0002-4000-8000-varnish';
const SEED_SUB_CAT_STAIN_ID         = 'sc05-0003-4000-8000-stain';
const SEED_SUB_CAT_PRIMER_ID        = 'sc05-0004-4000-8000-primer';
const SEED_SUB_CAT_DRAWERORG_ID     = 'sc06-0001-4000-8000-drawerorg';
const SEED_SUB_CAT_LAZYSUSAN_ID     = 'sc06-0002-4000-8000-lazysusan';
const SEED_SUB_CAT_LED_ID           = 'sc06-0003-4000-8000-led';
const SEED_SUB_CAT_WOODGLUE_ID      = 'sc07-0001-4000-8000-woodglue';
const SEED_SUB_CAT_SILICONE_ID      = 'sc07-0002-4000-8000-silicone';

const SEED_LOC_MAIN_WH_A1S1_ID      = 'loc01-0001-4000-8000-mainwh_a1s1';
const SEED_LOC_WORKSHOP_B2_ID       = 'loc01-0002-4000-8000-workshop_b2';
const SEED_LOC_SHOWROOM_BACK_ID   = 'loc01-0003-4000-8000-showroomback';
const SEED_LOC_CUTTING_RACKC_ID   = 'loc01-0004-4000-8000-cutting_c';

const SEED_SUP_PANELPRO_ID          = 'sup01-0001-4000-8000-panelpro';
const SEED_SUP_HARDWAREHUB_ID       = 'sup01-0002-4000-8000-hardwarehub';
const SEED_SUP_FINISHINGTOUCH_ID    = 'sup01-0003-4000-8000-finishingtouch';
const SEED_SUP_LOCALTIMBER_ID       = 'sup01-0004-4000-8000-localtimber';

const KEY_INVENTORY_ITEM_ID = 'WP-PLY-001';


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
      lastPurchasePrice REAL DEFAULT 0,
      averageCost REAL DEFAULT 0,
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
      -- In a real app, add password hash, salt, etc.
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
    CREATE TABLE IF NOT EXISTS permissions (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      description TEXT,
      "group" TEXT NOT NULL
    );
  `);

  await dbConnection.exec(`
    CREATE TABLE IF NOT EXISTS role_permissions (
      roleId TEXT NOT NULL,
      permissionId TEXT NOT NULL,
      PRIMARY KEY (roleId, permissionId),
      FOREIGN KEY (roleId) REFERENCES roles(id) ON DELETE CASCADE,
      FOREIGN KEY (permissionId) REFERENCES permissions(id) ON DELETE CASCADE
    );
  `);

  await dbConnection.exec(`
    CREATE TABLE IF NOT EXISTS requisitions (
      id TEXT PRIMARY KEY, 
      requesterId TEXT, 
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
      id TEXT PRIMARY KEY, 
      requisitionId TEXT NOT NULL,
      inventoryItemId TEXT NOT NULL,
      quantityRequested INTEGER NOT NULL,
      quantityApproved INTEGER, 
      quantityIssued INTEGER DEFAULT 0,
      isApproved INTEGER DEFAULT 0, -- 0 for false, 1 for true (or based on quantityApproved > 0)
      notes TEXT,
      FOREIGN KEY (requisitionId) REFERENCES requisitions(id) ON DELETE CASCADE,
      FOREIGN KEY (inventoryItemId) REFERENCES inventory(id) ON DELETE RESTRICT -- Prevent item deletion if in use
    );
  `);

  await dbConnection.exec(`
    CREATE TABLE IF NOT EXISTS purchase_orders (
      id TEXT PRIMARY KEY,
      supplierId TEXT NOT NULL,
      orderDate TEXT NOT NULL,
      expectedDeliveryDate TEXT,
      status TEXT NOT NULL DEFAULT 'DRAFT', -- DRAFT, PENDING_APPROVAL, APPROVED, ORDERED, PARTIALLY_RECEIVED, RECEIVED, CANCELLED
      notes TEXT,
      shippingAddress TEXT,
      billingAddress TEXT,
      lastUpdated TEXT NOT NULL,
      createdById TEXT, -- Could be a user ID
      FOREIGN KEY (supplierId) REFERENCES suppliers(id) ON DELETE RESTRICT,
      FOREIGN KEY (createdById) REFERENCES users(id) ON DELETE SET NULL
    );
  `);

  await dbConnection.exec(`
    CREATE TABLE IF NOT EXISTS purchase_order_items (
      id TEXT PRIMARY KEY,
      purchaseOrderId TEXT NOT NULL,
      inventoryItemId TEXT NOT NULL,
      description TEXT, -- Can be copied from inventory item at time of PO or custom
      quantityOrdered INTEGER NOT NULL,
      unitCost REAL NOT NULL,
      quantityApproved INTEGER, -- Quantity approved by manager, if different from ordered
      quantityReceived INTEGER DEFAULT 0,
      notes TEXT,
      FOREIGN KEY (purchaseOrderId) REFERENCES purchase_orders(id) ON DELETE CASCADE,
      FOREIGN KEY (inventoryItemId) REFERENCES inventory(id) ON DELETE RESTRICT
    );
  `);

  await dbConnection.exec(`
    CREATE TABLE IF NOT EXISTS stock_movements (
      id TEXT PRIMARY KEY,
      inventoryItemId TEXT NOT NULL,
      movementType TEXT NOT NULL, -- 'PO_RECEIPT', 'REQUISITION_ISSUE', 'REQUISITION_RETURN', 'ADJUSTMENT_IN', 'ADJUSTMENT_OUT', 'INITIAL_STOCK'
      quantityChanged INTEGER NOT NULL, -- Positive for IN, Negative for OUT
      balanceAfterMovement INTEGER NOT NULL,
      referenceId TEXT, -- e.g., PO ID, Requisition ID, Adjustment Note ID
      movementDate TEXT NOT NULL,
      userId TEXT, -- User who performed/triggered the action
      notes TEXT,
      FOREIGN KEY (inventoryItemId) REFERENCES inventory(id) ON DELETE CASCADE, -- If item is deleted, movements are too
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE SET NULL
    );
  `);

  await dbConnection.exec(`
    CREATE TABLE IF NOT EXISTS cabinet_templates (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL, -- 'base', 'wall', 'tall', 'custom'
      previewImage TEXT,
      defaultDimensions TEXT NOT NULL, -- JSON string
      parameters TEXT NOT NULL, -- JSON string
      parts TEXT NOT NULL, -- JSON string
      accessories TEXT, -- JSON string, optional
      createdAt TEXT NOT NULL,
      lastUpdated TEXT NOT NULL
    );
  `);

  await dbConnection.exec(`
    CREATE TABLE IF NOT EXISTS custom_formulas (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      formula_string TEXT NOT NULL,
      dimension_type TEXT NOT NULL CHECK (dimension_type IN ('Width', 'Height', 'Quantity', 'Thickness')),
      description TEXT,
      part_type TEXT, -- e.g., 'Side Panel', 'Door'
      context TEXT, -- e.g., 'Base', 'Wall'
      created_at TEXT NOT NULL
    );
  `);

  await dbConnection.exec(`
    CREATE TABLE IF NOT EXISTS material_definitions (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      type TEXT NOT NULL DEFAULT 'panel', -- 'panel', 'edge_band', 'other'
      costPerSqm REAL, 
      costPerMeter REAL, 
      thickness REAL, 
      defaultSheetWidth REAL,
      defaultSheetHeight REAL,
      hasGrain INTEGER DEFAULT 0, -- 0 for false, 1 for true
      notes TEXT,
      createdAt TEXT NOT NULL,
      lastUpdated TEXT NOT NULL
    );
  `);

  await dbConnection.exec(`
    CREATE TABLE IF NOT EXISTS accessory_definitions (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      type TEXT NOT NULL DEFAULT 'other', -- 'hinge', 'drawer_slide', 'handle', 'shelf_pin', 'leg', 'screw', 'other'
      unitCost REAL NOT NULL DEFAULT 0.01,
      description TEXT,
      supplierId TEXT,
      sku TEXT,
      createdAt TEXT NOT NULL,
      lastUpdated TEXT NOT NULL,
      FOREIGN KEY (supplierId) REFERENCES suppliers(id) ON DELETE SET NULL
    );
  `);

  console.log('Tables schema checked/created by _createTables.');
}

async function _dropTables(dbConnection: Database<sqlite3.Database, sqlite3.Statement>) {
  await dbConnection.exec(`DROP TABLE IF EXISTS accessory_definitions;`);
  await dbConnection.exec(`DROP TABLE IF EXISTS material_definitions;`);
  await dbConnection.exec(`DROP TABLE IF EXISTS custom_formulas;`);
  await dbConnection.exec(`DROP TABLE IF EXISTS cabinet_templates;`);
  await dbConnection.exec(`DROP TABLE IF EXISTS stock_movements;`);
  await dbConnection.exec(`DROP TABLE IF EXISTS purchase_order_items;`);
  await dbConnection.exec(`DROP TABLE IF EXISTS purchase_orders;`);
  await dbConnection.exec(`DROP TABLE IF EXISTS requisition_items;`);
  await dbConnection.exec(`DROP TABLE IF EXISTS requisitions;`);
  await dbConnection.exec(`DROP TABLE IF EXISTS inventory;`);
  await dbConnection.exec(`DROP TABLE IF EXISTS units_of_measurement;`);
  await dbConnection.exec(`DROP TABLE IF EXISTS suppliers;`);
  await dbConnection.exec(`DROP TABLE IF EXISTS locations;`);
  await dbConnection.exec(`DROP TABLE IF EXISTS sub_categories;`);
  await dbConnection.exec(`DROP TABLE IF EXISTS categories;`);
  await dbConnection.exec(`DROP TABLE IF EXISTS users;`);
  await dbConnection.exec(`DROP TABLE IF EXISTS role_permissions;`);
  await dbConnection.exec(`DROP TABLE IF EXISTS permissions;`);
  await dbConnection.exec(`DROP TABLE IF EXISTS roles;`);
  await dbConnection.exec(`DROP TABLE IF EXISTS departments;`);
  console.log('Existing tables dropped by _dropTables.');
}

async function _seedInitialData(db: Database<sqlite3.Database, sqlite3.Statement>) {
  console.log('Seeding initial data...');

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

  const subCategoriesData = [
    { id: SEED_SUB_CAT_PLYWOOD_ID, name: 'Plywood', categoryId: SEED_CAT_WOOD_PANELS_ID, code: 'PLY' },
    { id: SEED_SUB_CAT_MDF_ID, name: 'MDF', categoryId: SEED_CAT_WOOD_PANELS_ID, code: 'MDF' },
    { id: SEED_SUB_CAT_PARTICLE_ID, name: 'Particle Board', categoryId: SEED_CAT_WOOD_PANELS_ID, code: 'PB' },
    { id: SEED_SUB_CAT_VENEER_SHT_ID, name: 'Veneer Sheets', categoryId: SEED_CAT_WOOD_PANELS_ID, code: 'VEN' },
    { id: SEED_SUB_CAT_PVC_EDGE_ID, name: 'PVC Edge Banding', categoryId: SEED_CAT_EDGE_BANDING_ID, code: 'PVC' },
    { id: SEED_SUB_CAT_WOODVEN_EDGE_ID, name: 'Wood Veneer Edge Banding', categoryId: SEED_CAT_EDGE_BANDING_ID, code: 'WVE' },
    { id: SEED_SUB_CAT_HINGES_ID, name: 'Hinges', categoryId: SEED_CAT_HARDWARE_ID, code: 'HNG' },
    { id: SEED_SUB_CAT_DRAWERSLIDES_ID, name: 'Drawer Slides', categoryId: SEED_CAT_HARDWARE_ID, code: 'DRS' },
    { id: SEED_SUB_CAT_HANDLES_ID, name: 'Handles & Knobs', categoryId: SEED_CAT_HARDWARE_ID, code: 'HND' },
    { id: SEED_SUB_CAT_SHELFSUP_ID, name: 'Shelf Supports', categoryId: SEED_CAT_HARDWARE_ID, code: 'SHS' },
    { id: SEED_SUB_CAT_LEGS_ID, name: 'Cabinet Legs', categoryId: SEED_CAT_HARDWARE_ID, code: 'LEG' },
    { id: SEED_SUB_CAT_SCREWS_ID, name: 'Screws', categoryId: SEED_CAT_FASTENERS_ID, code: 'SCR' },
    { id: SEED_SUB_CAT_NAILS_ID, name: 'Nails & Brads', categoryId: SEED_CAT_FASTENERS_ID, code: 'NLB' },
    { id: SEED_SUB_CAT_DOWELS_ID, name: 'Dowels', categoryId: SEED_CAT_FASTENERS_ID, code: 'DWL' },
    { id: SEED_SUB_CAT_CAMLOCKS_ID, name: 'Cam Locks & Fittings', categoryId: SEED_CAT_FASTENERS_ID, code: 'CMF' },
    { id: SEED_SUB_CAT_PAINT_ID, name: 'Paint', categoryId: SEED_CAT_FINISHES_ID, code: 'PNT' },
    { id: SEED_SUB_CAT_VARNISH_ID, name: 'Varnish / Lacquer', categoryId: SEED_CAT_FINISHES_ID, code: 'VAR' },
    { id: SEED_SUB_CAT_STAIN_ID, name: 'Wood Stain', categoryId: SEED_CAT_FINISHES_ID, code: 'STN' },
    { id: SEED_SUB_CAT_PRIMER_ID, name: 'Primer', categoryId: SEED_CAT_FINISHES_ID, code: 'PRM' },
    { id: SEED_SUB_CAT_DRAWERORG_ID, name: 'Drawer Organizers', categoryId: SEED_CAT_ACCESSORIES_ID, code: 'DOR' },
    { id: SEED_SUB_CAT_LAZYSUSAN_ID, name: 'Lazy Susans', categoryId: SEED_CAT_ACCESSORIES_ID, code: 'LSN' },
    { id: SEED_SUB_CAT_LED_ID, name: 'LED Lighting Strips', categoryId: SEED_CAT_ACCESSORIES_ID, code: 'LED' },
    { id: SEED_SUB_CAT_WOODGLUE_ID, name: 'Wood Glue', categoryId: SEED_CAT_ADHESIVES_ID, code: 'WGL' },
    { id: SEED_SUB_CAT_SILICONE_ID, name: 'Silicone Sealant', categoryId: SEED_CAT_ADHESIVES_ID, code: 'SIL' },
  ];
  
  for (const subCat of subCategoriesData) {
    try {
      await db.run(
        'INSERT INTO sub_categories (id, name, categoryId, code) VALUES (?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET name=excluded.name, categoryId=excluded.categoryId, code=excluded.code',
        subCat.id, subCat.name, subCat.categoryId, subCat.code
      );
    } catch (e) {
      console.warn(`Could not insert/update sub-category ${subCat.name} for category ID ${subCat.categoryId}: ${(e as Error).message}`);
    }
  }
  console.log('Sub-Categories seeded.');

  const locationsData = [
    { id: SEED_LOC_MAIN_WH_A1S1_ID, store: 'Main Warehouse', rack: 'A1', shelf: 'S1' },
    { id: SEED_LOC_WORKSHOP_B2_ID, store: 'Workshop Storage', rack: 'B2', shelf: null },
    { id: SEED_LOC_SHOWROOM_BACK_ID, store: 'Showroom Backstock', rack: null, shelf: null },
    { id: SEED_LOC_CUTTING_RACKC_ID, store: 'Cutting Department', rack: 'C', shelf: 'Bin 3' },
  ];
  
  for (const loc of locationsData) {
    try {
      await db.run(
        'INSERT INTO locations (id, store, rack, shelf) VALUES (?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET store=excluded.store, rack=excluded.rack, shelf=excluded.shelf',
        loc.id, loc.store, loc.rack, loc.shelf
      );
    } catch (e) {
      console.warn(`Could not insert/update location ${loc.store} - ${loc.rack} - ${loc.shelf}: ${(e as Error).message}`);
    }
  }
  console.log('Locations seeded.');

  const suppliersData = [
    { id: SEED_SUP_PANELPRO_ID, name: 'PanelPro Supplies', contactPerson: 'John Doe', contactMail: 'john@panelpro.com', contactPhone: '555-1234', address: '123 Panel St, Suite A, Panel City' },
    { id: SEED_SUP_HARDWAREHUB_ID, name: 'Hardware Hub Inc.', contactPerson: 'Jane Smith', contactMail: 'jane@hardwarehub.com', contactPhone: '555-5678', address: '456 Hinge Ave, Hardware Town' },
    { id: SEED_SUP_FINISHINGTOUCH_ID, name: 'Finishing Touches Co.', contactPerson: 'Sam Lee', contactMail: 'sales@finishing.co', contactPhone: '555-9012', address: '789 Varnish Rd, Paintville' },
    { id: SEED_SUP_LOCALTIMBER_ID, name: 'Local Timber Yard', contactPerson: null, contactMail: 'info@localtimber.com', contactPhone: '555-3456', address: '1 Forest Way, Timber Town' },
  ];
  
  for (const sup of suppliersData) {
    try {
      await db.run(
        'INSERT INTO suppliers (id, name, contactPerson, contactMail, contactPhone, address) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET name=excluded.name, contactPerson=excluded.contactPerson, contactMail=excluded.contactMail, contactPhone=excluded.contactPhone, address=excluded.address',
        sup.id, sup.name, sup.contactPerson, sup.contactMail, sup.contactPhone, sup.address
      );
    } catch (e) {
      console.warn(`Could not insert/update supplier ${sup.name}: ${(e as Error).message}`);
    }
  }
  console.log('Suppliers seeded.');

  // Clear existing permissions before seeding new ones
  await db.run('DELETE FROM permissions');

  const permissionsData = [
    // Settings Group
    { id: crypto.randomUUID(), name: 'Manage Roles', description: 'Can create, edit, and delete user roles and their permissions.', group: 'Settings' },
    { id: crypto.randomUUID(), name: 'Manage Departments', description: 'Can create, edit, and delete departments.', group: 'Settings' },
    { id: crypto.randomUUID(), name: 'Manage Categories', description: 'Can create, edit, and delete inventory categories & sub-categories.', group: 'Settings' },
    { id: crypto.randomUUID(), name: 'Manage Locations', description: 'Can create, edit, and delete inventory storage locations.', group: 'Settings' },
    { id: crypto.randomUUID(), name: 'Manage Suppliers', description: 'Can create, edit, and delete suppliers.', group: 'Settings' },
    { id: crypto.randomUUID(), name: 'Manage Units of Measurement', description: 'Can create, edit, and delete units of measurement.', group: 'Settings' },

    // Inventory Group
    { id: crypto.randomUUID(), name: 'View Inventory', description: 'Can view the inventory list and item details.', group: 'Inventory' },
    { id: crypto.randomUUID(), name: 'Create Inventory Items', description: 'Can add new items to the inventory.', group: 'Inventory' },
    { id: crypto.randomUUID(), name: 'Edit Inventory Items', description: 'Can edit existing inventory items.', group: 'Inventory' },
    { id: crypto.randomUUID(), name: 'Delete Inventory Items', description: 'Can delete items from the inventory.', group: 'Inventory' },
    { id: crypto.randomUUID(), name: 'Adjust Stock Manually', description: 'Can perform manual stock adjustments.', group: 'Inventory' },
    { id: crypto.randomUUID(), name: 'Import from Excel', description: 'Can bulk import inventory items from an Excel file.', group: 'Inventory' },
    { id: crypto.randomUUID(), name: 'Export to Excel', description: 'Can export the inventory list to an Excel file.', group: 'Inventory' },
    { id: crypto.randomUUID(), name: 'View Stock Movement History', description: 'Can view the historical stock movements for an item.', group: 'Inventory' },
    
    // Requisitions Group
    { id: crypto.randomUUID(), name: 'View All Requisitions', description: 'Can view all material requisitions.', group: 'Requisitions' },
    { id: crypto.randomUUID(), name: 'Create Requisitions', description: 'Can create new material requisitions.', group: 'Requisitions' },
    { id: crypto.randomUUID(), name: 'Edit Requisitions', description: 'Can edit requisitions (may reset fulfillment).', group: 'Requisitions' },
    { id: crypto.randomUUID(), name: 'Delete Requisitions', description: 'Can delete requisitions (returns issued stock).', group: 'Requisitions' },
    { id: crypto.randomUUID(), name: 'Cancel Requisitions', description: 'Can cancel an active requisition (returns issued stock).', group: 'Requisitions' },
    { id: crypto.randomUUID(), name: 'Approve Requisition Items', description: 'Can approve or reject items on a pending requisition.', group: 'Requisitions' },
    { id: crypto.randomUUID(), name: 'Fulfill Requisitions', description: 'Can issue stock for an approved requisition.', group: 'Requisitions' },
    { id: crypto.randomUUID(), name: 'Print Requisition Vouchers', description: 'Can generate and print/download a PDF issue voucher.', group: 'Requisitions' },

    // Purchase Orders Group
    { id: crypto.randomUUID(), name: 'View All Purchase Orders', description: 'Can view all purchase orders.', group: 'Purchase Orders' },
    { id: crypto.randomUUID(), name: 'Create Purchase Orders', description: 'Can create new purchase orders.', group: 'Purchase Orders' },
    { id: crypto.randomUUID(), name: 'Edit Purchase Orders', description: 'Can edit POs before they are processed.', group: 'Purchase Orders' },
    { id: crypto.randomUUID(), name: 'Delete Purchase Orders', description: 'Can delete DRAFT or CANCELLED purchase orders.', group: 'Purchase Orders' },
    { id: crypto.randomUUID(), name: 'Cancel Purchase Orders', description: 'Can cancel an active purchase order.', group: 'Purchase Orders' },
    { id: crypto.randomUUID(), name: 'Submit POs for Approval', description: 'Can move a PO from DRAFT to PENDING_APPROVAL.', group: 'Purchase Orders' },
    { id: crypto.randomUUID(), name: 'Approve Purchase Order Items', description: 'Can approve items on a PO submitted for approval.', group: 'Purchase Orders' },
    { id: crypto.randomUUID(), name: 'Mark POs as Ordered', description: 'Can move an APPROVED PO to ORDERED status.', group: 'Purchase Orders' },
    { id: crypto.randomUUID(), name: 'Receive Stock from POs', description: 'Can receive stock against an ordered purchase order.', group: 'Purchase Orders' },
    { id: crypto.randomUUID(), name: 'Print Purchase Orders', description: 'Can generate and print/download a PDF of a PO.', group: 'Purchase Orders' },

    // Reports Group
    { id: crypto.randomUUID(), name: 'Generate & View Reports', description: 'Can view the reports page and generate all available reports.', group: 'Reports' },

    // Cabinet Designer Group
    { id: crypto.randomUUID(), name: 'Use Cabinet Designer', description: 'Can access and use the main calculator and project planner features.', group: 'Cabinet Designer' },
    { id: crypto.randomUUID(), name: 'Manage Cabinet Templates', description: 'Can create, edit, and delete global cabinet templates.', group: 'Cabinet Designer' },
    { id: crypto.randomUUID(), name: 'Manage Cabinet Formulas', description: 'Can create, edit, and delete global formulas.', group: 'Cabinet Designer' },
    { id: crypto.randomUUID(), name: 'Manage Cabinet Materials', description: 'Can create, edit, and delete material definitions.', group: 'Cabinet Designer' },
    { id: crypto.randomUUID(), name: 'Manage Cabinet Accessories', description: 'Can create, edit, and delete accessory definitions.', group: 'Cabinet Designer' },
    
    // Advanced Tools Group
    { id: crypto.randomUUID(), name: 'Use Nesting Optimization', description: 'Can access and use the nesting optimization tools.', group: 'Advanced Tools' },
  ];

  for (const perm of permissionsData) {
    try {
      await db.run(
        'INSERT INTO permissions (id, name, description, "group") VALUES (?, ?, ?, ?)',
        perm.id, perm.name, perm.description, perm.group
      );
    } catch (e) {
      console.warn(`Could not insert permission ${perm.name}: ${(e as Error).message}`);
    }
  }
  console.log('Permissions seeded.');

  const inventoryItemsData = [
    {
      id: KEY_INVENTORY_ITEM_ID, name: '18mm Birch Plywood (2440x1220mm)', description: 'High-quality birch plywood for structural and aesthetic applications.', imageUrl: 'https://placehold.co/300x200.png?text=Plywood',
      quantity: 50, unitCost: 45.50, lowStock: 0, minStockLevel: 10, maxStockLevel: 100,
      categoryId: SEED_CAT_WOOD_PANELS_ID, subCategoryId: SEED_SUB_CAT_PLYWOOD_ID, locationId: SEED_LOC_MAIN_WH_A1S1_ID, supplierId: SEED_SUP_PANELPRO_ID, unitId: SEED_UNIT_SHEET_ID,
    },
    {
      id: 'WP-MDF-001', name: 'Standard MDF Sheet (2440x1220x18mm)', description: 'Medium-density fiberboard, ideal for paint-grade cabinet doors and panels.', imageUrl: 'https://placehold.co/300x200.png?text=MDF',
      quantity: 75, unitCost: 28.00, lowStock: 0, minStockLevel: 20, maxStockLevel: 150,
      categoryId: SEED_CAT_WOOD_PANELS_ID, subCategoryId: SEED_SUB_CAT_MDF_ID, locationId: SEED_LOC_MAIN_WH_A1S1_ID, supplierId: SEED_SUP_PANELPRO_ID, unitId: SEED_UNIT_SHEET_ID,
    },
    {
      id: 'EB-PVC-001', name: 'White PVC Edge Banding (22mm x 0.45mm)', description: 'Durable PVC edge banding for finishing MDF and particle board edges.', imageUrl: 'https://placehold.co/300x200.png?text=Edge+Band',
      quantity: 5, unitCost: 15.00, lowStock: 1, minStockLevel: 2, maxStockLevel: 10,
      categoryId: SEED_CAT_EDGE_BANDING_ID, subCategoryId: SEED_SUB_CAT_PVC_EDGE_ID, locationId: SEED_LOC_WORKSHOP_B2_ID, supplierId: SEED_SUP_FINISHINGTOUCH_ID, unitId: SEED_UNIT_ROLL_ID,
    },
    {
      id: 'HW-HNG-001', name: 'Soft-Close Cabinet Hinges (Full Overlay)', description: 'European style soft-close hinges for a quiet and smooth cabinet door operation.', imageUrl: 'https://placehold.co/300x200.png?text=Hinges',
      quantity: 200, unitCost: 1.80, lowStock: 0, minStockLevel: 50, maxStockLevel: 300,
      categoryId: SEED_CAT_HARDWARE_ID, subCategoryId: SEED_SUB_CAT_HINGES_ID, locationId: SEED_LOC_WORKSHOP_B2_ID, supplierId: SEED_SUP_HARDWAREHUB_ID, unitId: SEED_UNIT_PAIR_ID,
    },
     {
      id: 'FS-SCR-001', name: 'Wood Screws 4x30mm (Box of 200)', description: 'General purpose countersunk wood screws.', imageUrl: 'https://placehold.co/300x200.png?text=Screws',
      quantity: 30, unitCost: 4.50, lowStock: 0, minStockLevel: 5, maxStockLevel: 50,
      categoryId: SEED_CAT_FASTENERS_ID, subCategoryId: SEED_SUB_CAT_SCREWS_ID, locationId: SEED_LOC_WORKSHOP_B2_ID, supplierId: SEED_SUP_HARDWAREHUB_ID, unitId: SEED_UNIT_BOX_ID,
    },
    {
      id: 'FN-PNT-001', name: 'White Acrylic Paint (1 Liter)', description: 'Water-based white acrylic paint for furniture.', imageUrl: 'https://placehold.co/300x200.png?text=Paint',
      quantity: 10, unitCost: 12.75, lowStock: 0, minStockLevel: 3, maxStockLevel: 20,
      categoryId: SEED_CAT_FINISHES_ID, subCategoryId: SEED_SUB_CAT_PAINT_ID, locationId: SEED_LOC_SHOWROOM_BACK_ID, supplierId: SEED_SUP_FINISHINGTOUCH_ID, unitId: SEED_UNIT_LITER_ID,
    },
  ];
  
  await db.run('DELETE FROM inventory'); 
  await db.run('DELETE FROM stock_movements'); // Clear stock movements when reseeding inventory

  const seedDate = new Date().toISOString();

  for (const item of inventoryItemsData) {
    try {
      await db.run(
        `INSERT INTO inventory (id, name, description, imageUrl, quantity, unitCost, lastPurchasePrice, averageCost, lastUpdated, lowStock, minStockLevel, maxStockLevel, categoryId, subCategoryId, locationId, supplierId, unitId)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET
         name=excluded.name, description=excluded.description, imageUrl=excluded.imageUrl, quantity=excluded.quantity, unitCost=excluded.unitCost, 
         lastPurchasePrice=excluded.lastPurchasePrice, averageCost=excluded.averageCost, 
         lastUpdated=excluded.lastUpdated, lowStock=excluded.lowStock, minStockLevel=excluded.minStockLevel, maxStockLevel=excluded.maxStockLevel, categoryId=excluded.categoryId, subCategoryId=excluded.subCategoryId, locationId=excluded.locationId, supplierId=excluded.supplierId, unitId=excluded.unitId`,
        item.id, item.name, item.description, item.imageUrl, item.quantity, item.unitCost, 
        item.unitCost, item.unitCost, 
        seedDate, item.lowStock, item.minStockLevel, item.maxStockLevel,
        item.categoryId, item.subCategoryId, item.locationId, item.supplierId, item.unitId
      );

      // Seed INITIAL_STOCK movement only if quantity > 0
      if (item.quantity > 0) {
        await db.run(
          `INSERT INTO stock_movements (id, inventoryItemId, movementType, quantityChanged, balanceAfterMovement, movementDate, notes)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          crypto.randomUUID(),
          item.id,
          'INITIAL_STOCK',
          item.quantity,
          item.quantity, // Balance after initial stock is just the quantity
          seedDate,
          'Initial stock seeding'
        );
      }

    } catch (e) {
      console.warn(`Could not insert/update inventory item ${item.name} with ID ${item.id}: ${(e as Error).message}`);
    }
  }
  console.log('Inventory Items and initial stock movements seeded.');
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
        const tablesToEnsureExist = ['departments', 'inventory', 'units_of_measurement', 'categories', 'sub_categories', 'locations', 'suppliers', 'users', 'roles', 'permissions', 'role_permissions', 'requisitions', 'requisition_items', 'purchase_orders', 'purchase_order_items', 'stock_movements', 'cabinet_templates', 'custom_formulas', 'material_definitions', 'accessory_definitions'];
        const columnsToCheck: Record<string, string[]> = {
          inventory: ['minStockLevel', 'maxStockLevel', 'description', 'imageUrl', 'lastPurchasePrice', 'averageCost'],
          units_of_measurement: ['conversion_factor', 'base_unit_id'],
          suppliers: ['contactPhone'],
          categories: ['code'],
          sub_categories: ['code', 'categoryId'],
          requisitions: ['requesterId', 'departmentId', 'orderNumber', 'bomNumber', 'dateNeeded', 'status', 'notes', 'lastUpdated', 'departmentId'],
          requisition_items: ['requisitionId', 'inventoryItemId', 'quantityRequested', 'quantityApproved', 'quantityIssued', 'isApproved', 'notes'],
          purchase_orders: ['supplierId', 'orderDate', 'status', 'lastUpdated', 'shippingAddress', 'billingAddress'],
          purchase_order_items: ['purchaseOrderId', 'inventoryItemId', 'quantityOrdered', 'unitCost', 'quantityApproved'],
          stock_movements: ['inventoryItemId', 'movementType', 'quantityChanged', 'balanceAfterMovement', 'movementDate'],
          cabinet_templates: ['name', 'type', 'defaultDimensions', 'parameters', 'parts', 'createdAt', 'lastUpdated', 'accessories'],
          custom_formulas: ['name', 'formula_string', 'dimension_type', 'created_at', 'part_type', 'context'],
          material_definitions: ['name', 'type', 'costPerSqm', 'thickness', 'hasGrain', 'createdAt', 'lastUpdated'],
          accessory_definitions: ['name', 'type', 'unitCost', 'createdAt', 'lastUpdated'],
          permissions: ['name', 'description', 'group'],
          role_permissions: ['roleId', 'permissionId'],
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
        
        let needsFullSeed = false;
        if (schemaNeedsReset) {
          needsFullSeed = true;
        } else {
          // If schema seems okay, ensure tables exist (might be first run on a new DB file)
          // and then check if key seed data is present.
          await _createTables(db); 
          
          const categoryCountResult = await db.get('SELECT COUNT(*) as count FROM categories');
          if ((categoryCountResult?.count ?? 0) === 0) {
            console.log('Categories table is empty. Flagging for full seed.');
            needsFullSeed = true;
          }

          if (!needsFullSeed) {
            const deptCheck = await db.get('SELECT id FROM departments WHERE id = ?', SEED_DEPT_ENGINEERING_ID);
            if (!deptCheck) {
              console.log('Key seeded department (Engineering) not found. Flagging for full seed.');
              needsFullSeed = true;
            }
          }
          if (!needsFullSeed) {
            const invCheck = await db.get('SELECT id FROM inventory WHERE id = ?', KEY_INVENTORY_ITEM_ID);
            if (!invCheck) {
              console.log(`Key seeded inventory item (${KEY_INVENTORY_ITEM_ID}) not found. Flagging for full seed.`);
              needsFullSeed = true;
            }
          }
        }

        if (needsFullSeed) {
          console.log('Full data reset and seed will be performed by openDb.');
          await _dropTables(db);
          await _createTables(db);
          await _seedInitialData(db);
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

  let needsFullSeed = dropFirst;

  if (!needsFullSeed) {
    // If not explicitly dropping, check if seeding is needed based on data state
    await _createTables(db); // Ensure tables exist
    const categoryCountResult = await db.get('SELECT COUNT(*) as count FROM categories');
    if ((categoryCountResult?.count ?? 0) === 0) {
        console.log("Script: Categories table empty, needs seed.");
        needsFullSeed = true;
    }

    if (!needsFullSeed) {
      const deptCheck = await db.get('SELECT id FROM departments WHERE id = ?', SEED_DEPT_ENGINEERING_ID);
      if (!deptCheck) {
          console.log("Script: Key department missing, needs seed.");
          needsFullSeed = true;
      }
    }
    if (!needsFullSeed) {
      const invCheck = await db.get('SELECT id FROM inventory WHERE id = ?', KEY_INVENTORY_ITEM_ID);
      if (!invCheck) {
          console.log("Script: Key inventory item missing, needs seed.");
          needsFullSeed = true;
      }
    }
  }

  if (needsFullSeed) {
    console.log('Full data reset and seed will be performed by initializeDatabaseForScript.');
    await _dropTables(db);
    await _createTables(db);
    await _seedInitialData(db);
  } else {
    console.log('Script: Database schema and key seed data appear to be intact. No full reset performed.');
    await _createTables(db); // Still ensure all tables are there
  }
  
  console.log('Database initialization by script complete.');
  return db;
}
    
    

    

    
