// scripts/execute-migration.mjs
import pg from 'pg';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const { Client } = pg;

const regions = ['ap-southeast-1', 'ap-south-1', 'us-east-1', 'eu-central-1'];
const password = process.env.SUPABASE_DB_PASSWORD;
if (!password) {
  console.error('Error: Please provide SUPABASE_DB_PASSWORD environment variable.');
  process.exit(1);
}
const projectRef = 'kcxrlctweznilghukmca';
const user = `postgres.${projectRef}`;

async function tryConnect() {
  for (const region of regions) {
    const host = `aws-0-${region}.pooler.supabase.com`;
    console.log(`Attempting connection to ${host}:5432...`);
    const client = new Client({
      host,
      port: 5432,
      database: 'postgres',
      user,
      password,
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 5000,
    });

    try {
      await client.connect();
      console.log(`Connected successfully to ${host}!`);
      return client;
    } catch (e) {
      console.log(`Failed connecting to ${host}: ${e.message}`);
    }
  }

  // Also try 6543 (transaction pooler)
  for (const region of regions) {
    const host = `aws-0-${region}.pooler.supabase.com`;
    console.log(`Attempting connection to ${host}:6543...`);
    const client = new Client({
      host,
      port: 6543,
      database: 'postgres',
      user,
      password,
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 5000,
    });

    try {
      await client.connect();
      console.log(`Connected successfully to ${host}:6543!`);
      return client;
    } catch (e) {
      console.log(`Failed connecting to ${host}:6543: ${e.message}`);
    }
  }

  throw new Error('Could not connect to any pooler host');
}

async function run() {
  const client = await tryConnect();

  try {
    // 1. Run schema.sql
    const schemaPath = path.resolve(__dirname, '../supabase/schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    console.log('Executing supabase/schema.sql...');
    await client.query(schemaSql);
    console.log('✅ schema.sql executed successfully! Tables & RLS created.');

    // 2. Run seed.sql
    const seedPath = path.resolve(__dirname, '../supabase/seed.sql');
    const seedSql = fs.readFileSync(seedPath, 'utf8');
    console.log('Executing supabase/seed.sql...');
    await client.query(seedSql);
    console.log('✅ seed.sql executed successfully! Historical data imported.');

    // 3. Verify counts
    const tradesCount = await client.query('SELECT count(*) FROM public.trades');
    const ledgerCount = await client.query('SELECT count(*) FROM public.ledger');
    const holdingsCount = await client.query('SELECT count(*) FROM public.holdings');
    const settings = await client.query('SELECT * FROM public.settings');

    console.log('\n--- Database Verification ---');
    console.log(`Trades: ${tradesCount.rows[0].count}`);
    console.log(`Ledger: ${ledgerCount.rows[0].count}`);
    console.log(`Holdings: ${holdingsCount.rows[0].count}`);
    console.log('Settings:', settings.rows[0]);
    console.log('-----------------------------\n');
  } finally {
    await client.end();
  }
}

run().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
