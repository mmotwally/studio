
import { openDb, initializeDatabase } from '@/lib/database';

async function main() {
  console.log('Initializing database...');
  const db = await openDb();
  await initializeDatabase(db);
  await db.close();
  console.log('Database initialization complete.');
}

main().catch((err) => {
  console.error('Failed to initialize database:', err);
  process.exit(1);
});
