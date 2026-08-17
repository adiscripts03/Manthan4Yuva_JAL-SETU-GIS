import { MongoClient, Db } from 'mongodb';
import { config } from '../config/index.js';

let client: MongoClient | null = null;
let db: Db | null = null;

/**
 * Connect to MongoDB and return the database instance.
 * Reuses the existing connection if already connected.
 */
export async function connectDB(): Promise<Db> {
  if (db) return db;

  console.log('[DB] Connecting to MongoDB...');
  client = new MongoClient(config.mongoUri);
  await client.connect();
  db = client.db(config.dbName);

  // Verify connection
  await db.command({ ping: 1 });
  console.log(`[DB] Connected to database: ${config.dbName}`);

  return db;
}

/**
 * Get the current database instance.
 * Throws if not connected.
 */
export function getDB(): Db {
  if (!db) {
    throw new Error('Database not connected. Call connectDB() first.');
  }
  return db;
}

/**
 * Gracefully close the MongoDB connection.
 */
export async function closeDB(): Promise<void> {
  if (client) {
    await client.close();
    client = null;
    db = null;
    console.log('[DB] Connection closed.');
  }
}

/**
 * Create required geospatial and regular indexes on collections.
 */
export async function createIndexes(database: Db): Promise<void> {
  console.log('[DB] Creating indexes...');

  // Waterways — 2dsphere on geometry for spatial queries
  await database.collection('waterways').createIndex(
    { geometry: '2dsphere' },
    { background: true }
  );
  await database.collection('waterways').createIndex(
    { waterway: 1 },
    { background: true }
  );
  await database.collection('waterways').createIndex(
    { osm_id: 1 },
    { unique: true, background: true }
  );

  // Flood locations — 2dsphere on geometry
  await database.collection('flood_locations').createIndex(
    { geometry: '2dsphere' },
    { background: true }
  );

  // Citizen reports — 2dsphere on location, status index
  await database.collection('citizen_reports').createIndex(
    { location: '2dsphere' },
    { background: true }
  );
  await database.collection('citizen_reports').createIndex(
    { status: 1 },
    { background: true }
  );
  await database.collection('citizen_reports').createIndex(
    { created_at: -1 },
    { background: true }
  );

  // Interventions — indexes on status and waterway
  await database.collection('interventions').createIndex(
    { status: 1 },
    { background: true }
  );
  await database.collection('interventions').createIndex(
    { work_order_id: 1 },
    { unique: true, sparse: true, background: true }
  );

  console.log('[DB] Indexes created.');
}
