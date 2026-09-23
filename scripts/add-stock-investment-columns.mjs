// scripts/add-stock-investment-columns.mjs
import pg from 'pg';

const { Client } = pg;
const password = process.env.SUPABASE_DB_PASSWORD || 'Bharatisthe1two3';
const projectRef = 'kcxrlctweznilghukmca';
const user = `postgres.${projectRef}`;
const host = 'aws-0-ap-southeast-1.pooler.supabase.com';

const sql = `
-- 1. Add columns to public.ledger
ALTER TABLE public.ledger ADD COLUMN IF NOT EXISTS withdrawal_use TEXT DEFAULT 'cash';
ALTER TABLE public.ledger ADD COLUMN IF NOT EXISTS stock_symbol TEXT DEFAULT '';
ALTER TABLE public.ledger ADD COLUMN IF NOT EXISTS holding_id UUID;
ALTER TABLE public.ledger ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- 2. Add columns to public.holdings
ALTER TABLE public.holdings ADD COLUMN IF NOT EXISTS company_name TEXT DEFAULT '';
ALTER TABLE public.holdings ADD COLUMN IF NOT EXISTS exchange TEXT DEFAULT 'NSE';
ALTER TABLE public.holdings ADD COLUMN IF NOT EXISTS price_updated_on TEXT;
ALTER TABLE public.holdings ADD COLUMN IF NOT EXISTS pe_ratio NUMERIC;
ALTER TABLE public.holdings ADD COLUMN IF NOT EXISTS beta NUMERIC;
ALTER TABLE public.holdings ADD COLUMN IF NOT EXISTS company_size TEXT DEFAULT 'Large cap';
ALTER TABLE public.holdings ADD COLUMN IF NOT EXISTS valuation_view TEXT DEFAULT 'Needs review';
ALTER TABLE public.holdings ADD COLUMN IF NOT EXISTS dividend_date TEXT;
ALTER TABLE public.holdings ADD COLUMN IF NOT EXISTS dividend_per_share NUMERIC;
ALTER TABLE public.holdings ADD COLUMN IF NOT EXISTS investment_note TEXT DEFAULT '';
ALTER TABLE public.holdings ADD COLUMN IF NOT EXISTS news_date TEXT;
ALTER TABLE public.holdings ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.holdings ADD COLUMN IF NOT EXISTS ledger_id UUID;
`;

async function run() {
  console.log('Connecting to Supabase PostgreSQL...');
  const client = new Client({
    host,
    port: 5432,
    database: 'postgres',
    user,
    password,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000,
  });

  try {
    await client.connect();
    console.log('Connected! Executing schema update...');
    await client.query(sql);
    console.log('Successfully added stock investment columns to ledger and holdings tables!');
  } catch (err) {
    console.error('Migration error:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

run();
