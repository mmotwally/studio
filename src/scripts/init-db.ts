
import { initializeDatabaseForScript } from '@/lib/database';

async function main() {
  console.log('Initializing database via script...');
  let db;
  try {
    // Pass true to drop existing tables before creating new ones
    db = await initializeDatabaseForScript(true);
    console.log('Database initialization script finished successfully.');
  } catch (err) {
    console.error('Failed to initialize database from script:', err);
    process.exit(1); // Exit if script fails
  } finally {
    if (db) {
      try {
        await db.close();
        console.log('Database connection closed by script.');
      } catch (closeErr) {
        console.error('Failed to close database connection in script:', closeErr);
      }
    }
  }
}

main();
