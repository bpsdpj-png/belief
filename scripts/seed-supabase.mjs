// scripts/seed-supabase.mjs
import { createClient } from '@supabase/supabase-js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://kcxrlctweznilghukmca.supabase.co';
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_WFWLxjicAVhyuaRfJfPLQg_qns8OCIQ';

console.log('Connecting to Supabase at:', SUPABASE_URL);

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false }
});

const dataPath = path.resolve(__dirname, '../src/data/initialData.json');
const rawData = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));

async function runSeed() {
  console.log(`Loaded backup dataset with ${rawData.trades?.length || 0} trades, ${rawData.ledger?.length || 0} ledger items, and ${rawData.holdings?.length || 0} holdings.`);

  // 1. Settings
  console.log('Seeding settings...');
  const { error: sErr } = await supabase.from('settings').upsert({
    id: 'user_settings',
    starting_capital: Number(rawData.startingCapital) || 975000,
    target_pct: 0.75,
    updated_at: new Date().toISOString()
  });
  if (sErr) {
    console.error('Settings error:', sErr.message);
    if (sErr.code === 'PGRST205' || sErr.message?.includes('schema cache')) {
      console.log('\nNOTE: The database tables have not been created yet in Supabase.');
      console.log('Please execute supabase/schema.sql in your Supabase SQL Editor first:\nhttps://supabase.com/dashboard/project/kcxrlctweznilghukmca/sql\n');
      return;
    }
  } else {
    console.log('Settings successfully seeded.');
  }

  // 2. Trades
  if (rawData.trades && rawData.trades.length > 0) {
    console.log(`Seeding ${rawData.trades.length} trades...`);
    const dbTrades = rawData.trades.map(t => ({
      id: t.id,
      date: t.date,
      index: t.index,
      strategy: t.strategy,
      bias: t.bias || 'Sideways',
      gross: t.gross !== '' ? Number(t.gross) : 0,
      charges: t.charges !== '' ? Number(t.charges) : 0,
      capital_deployed: t.capitalDeployed ? Number(t.capitalDeployed) : null,
      rules: t.rules || { sl: true, sizing: true, noRevenge: true, plan: true },
      notes: t.notes || '',
      updated_at: new Date().toISOString()
    }));

    const { error: tErr } = await supabase.from('trades').upsert(dbTrades, { onConflict: 'id' });
    if (tErr) console.error('Trades error:', tErr.message);
    else console.log(`Successfully seeded ${dbTrades.length} trades.`);
  }

  // 3. Ledger
  if (rawData.ledger && rawData.ledger.length > 0) {
    console.log(`Seeding ${rawData.ledger.length} ledger entries...`);
    const dbLedger = rawData.ledger.map(l => ({
      id: l.id,
      date: l.date,
      type: l.type,
      amount: l.amount !== '' ? Number(l.amount) : 0,
      note: l.note || '',
      updated_at: new Date().toISOString()
    }));

    const { error: lErr } = await supabase.from('ledger').upsert(dbLedger, { onConflict: 'id' });
    if (lErr) console.error('Ledger error:', lErr.message);
    else console.log(`Successfully seeded ${dbLedger.length} ledger entries.`);
  }

  // 4. Holdings
  if (rawData.holdings && rawData.holdings.length > 0) {
    console.log(`Seeding ${rawData.holdings.length} equity holdings...`);
    const dbHoldings = rawData.holdings.map(h => ({
      id: h.id,
      date: h.date,
      stock: h.stock,
      qty: h.qty !== '' ? Number(h.qty) : 0,
      buy_price: h.buyPrice !== '' ? Number(h.buyPrice) : 0,
      current_price: h.currentPrice !== '' && h.currentPrice !== null ? Number(h.currentPrice) : null,
      updated_at: new Date().toISOString()
    }));

    const { error: hErr } = await supabase.from('holdings').upsert(dbHoldings, { onConflict: 'id' });
    if (hErr) console.error('Holdings error:', hErr.message);
    else console.log(`Successfully seeded ${dbHoldings.length} equity holdings.`);
  }

  console.log('Seed process finished!');
}

runSeed().catch(console.error);
