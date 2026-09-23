import { supabase } from '../lib/supabase';
import initialBackupData from '../data/initialData.json';

const LOCAL_CACHE_KEY = 'belief-trading-local-cache-v1';

// Helper to convert database row to UI trade object
export function mapTradeFromDb(row) {
  return {
    id: row.id,
    date: row.date,
    index: row.index,
    strategy: row.strategy,
    bias: row.bias || 'Sideways',
    gross: row.gross !== null && row.gross !== undefined ? String(row.gross) : '',
    charges: row.charges !== null && row.charges !== undefined ? String(row.charges) : '',
    capitalDeployed: row.capital_deployed ? String(row.capital_deployed) : '',
    rules: row.rules || { sl: true, sizing: true, noRevenge: true, plan: true },
    notes: row.notes || '',
  };
}

// Helper to convert UI trade object to database row
export function mapTradeToDb(trade) {
  return {
    id: trade.id,
    date: trade.date,
    index: trade.index,
    strategy: trade.strategy,
    bias: trade.bias || 'Sideways',
    gross: trade.gross !== '' ? Number(trade.gross) : 0,
    charges: trade.charges !== '' ? Number(trade.charges) : 0,
    capital_deployed: trade.capitalDeployed ? Number(trade.capitalDeployed) : null,
    rules: trade.rules || { sl: true, sizing: true, noRevenge: true, plan: true },
    notes: trade.notes || '',
    updated_at: new Date().toISOString(),
  };
}

// Helper to convert database row to UI ledger object
export function mapLedgerFromDb(row) {
  return {
    id: row.id,
    date: row.date,
    type: row.type,
    amount: row.amount !== null && row.amount !== undefined ? String(row.amount) : '',
    note: row.note || '',
  };
}

// Helper to convert UI ledger object to database row
export function mapLedgerToDb(entry) {
  return {
    id: entry.id,
    date: entry.date,
    type: entry.type,
    amount: entry.amount !== '' ? Number(entry.amount) : 0,
    note: entry.note || '',
    updated_at: new Date().toISOString(),
  };
}

// Helper to convert database row to UI holding object
export function mapHoldingFromDb(row) {
  return {
    id: row.id,
    date: row.date,
    stock: row.stock,
    qty: row.qty !== null && row.qty !== undefined ? String(row.qty) : '',
    buyPrice: row.buy_price !== null && row.buy_price !== undefined ? String(row.buy_price) : '',
    currentPrice: row.current_price !== null && row.current_price !== undefined ? String(row.current_price) : '',
  };
}

// Helper to convert UI holding object to database row
export function mapHoldingToDb(holding) {
  return {
    id: holding.id,
    date: holding.date,
    stock: holding.stock,
    qty: holding.qty !== '' ? Number(holding.qty) : 0,
    buy_price: holding.buyPrice !== '' ? Number(holding.buyPrice) : 0,
    current_price: holding.currentPrice !== '' && holding.currentPrice !== null ? Number(holding.currentPrice) : null,
    updated_at: new Date().toISOString(),
  };
}

// Load cache from localStorage
function getLocalCache() {
  try {
    const raw = localStorage.getItem(LOCAL_CACHE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn('Failed to read local cache', e);
  }
  return null;
}

// Save cache to localStorage
export function saveLocalCache(data) {
  try {
    localStorage.setItem(LOCAL_CACHE_KEY, JSON.stringify(data));
  } catch (e) {
    console.warn('Failed to save local cache', e);
  }
}

/**
 * Loads dashboard data from Supabase.
 * If tables don't exist yet or connection fails, falls back gracefully to historical data.
 */
export async function loadDashboardData() {
  const localCache = getLocalCache();
  const baseline = localCache || initialBackupData;

  try {
    const [settingsRes, tradesRes, ledgerRes, holdingsRes] = await Promise.all([
      supabase.from('settings').select('*').limit(1),
      supabase.from('trades').select('*').order('date', { ascending: true }),
      supabase.from('ledger').select('*').order('date', { ascending: true }),
      supabase.from('holdings').select('*').order('date', { ascending: true }),
    ]);

    // Check if table missing (PGRST205) or schema error
    const isMissingTable = [settingsRes, tradesRes, ledgerRes, holdingsRes].some(
      (r) => r.error && (r.error.code === 'PGRST205' || r.error.message?.includes('schema cache'))
    );

    if (isMissingTable) {
      console.info('Supabase tables not detected yet. Using bundled historical data.');
      return {
        startingCapital: baseline.startingCapital ?? 975000,
        targetPct: baseline.targetPct ?? 0.75,
        trades: baseline.trades ?? [],
        ledger: baseline.ledger ?? [],
        holdings: baseline.holdings ?? [],
        isSupabaseConnected: true,
        tablesReady: false,
        source: localCache ? 'cache' : 'seed',
      };
    }

    // Check if any general error
    if (settingsRes.error || tradesRes.error || ledgerRes.error || holdingsRes.error) {
      const err = settingsRes.error || tradesRes.error || ledgerRes.error || holdingsRes.error;
      console.warn('Supabase query issue, falling back to local data:', err.message);
      return {
        startingCapital: baseline.startingCapital ?? 975000,
        targetPct: baseline.targetPct ?? 0.75,
        trades: baseline.trades ?? [],
        ledger: baseline.ledger ?? [],
        holdings: baseline.holdings ?? [],
        isSupabaseConnected: false,
        tablesReady: false,
        source: 'fallback',
      };
    }

    // Tables exist and query succeeded!
    const trades = (tradesRes.data || []).map(mapTradeFromDb);
    const ledger = (ledgerRes.data || []).map(mapLedgerFromDb);
    const holdings = (holdingsRes.data || []).map(mapHoldingFromDb);

    let startingCapital = 975000;
    let targetPct = 0.75;
    if (settingsRes.data && settingsRes.data.length > 0) {
      startingCapital = Number(settingsRes.data[0].starting_capital) || 975000;
      targetPct = Number(settingsRes.data[0].target_pct) || 0.75;
    } else if (baseline.startingCapital) {
      startingCapital = baseline.startingCapital;
      targetPct = baseline.targetPct ?? 0.75;
    }

    // If tables are ready but empty, we can provide the initial backup data
    const isEmpty = trades.length === 0 && ledger.length === 0 && holdings.length === 0;

    return {
      startingCapital: isEmpty ? (baseline.startingCapital ?? 975000) : startingCapital,
      targetPct: isEmpty ? (baseline.targetPct ?? 0.75) : targetPct,
      trades: isEmpty ? (baseline.trades ?? []) : trades,
      ledger: isEmpty ? (baseline.ledger ?? []) : ledger,
      holdings: isEmpty ? (baseline.holdings ?? []) : holdings,
      isSupabaseConnected: true,
      tablesReady: true,
      isEmpty,
      source: isEmpty ? 'seed' : 'supabase',
    };
  } catch (err) {
    console.error('Network or unexpected error connecting to Supabase:', err);
    return {
      startingCapital: baseline.startingCapital ?? 975000,
      targetPct: baseline.targetPct ?? 0.75,
      trades: baseline.trades ?? [],
      ledger: baseline.ledger ?? [],
      holdings: baseline.holdings ?? [],
      isSupabaseConnected: false,
      tablesReady: false,
      source: 'offline',
    };
  }
}

// Save single trade
export async function persistTrade(trade) {
  const payload = mapTradeToDb(trade);
  return supabase.from('trades').upsert(payload);
}

// Delete single trade
export async function removeTradeFromDb(id) {
  return supabase.from('trades').delete().eq('id', id);
}

// Save single ledger entry
export async function persistLedger(entry) {
  const payload = mapLedgerToDb(entry);
  return supabase.from('ledger').upsert(payload);
}

// Delete single ledger entry
export async function removeLedgerFromDb(id) {
  return supabase.from('ledger').delete().eq('id', id);
}

// Save single holding
export async function persistHolding(holding) {
  const payload = mapHoldingToDb(holding);
  return supabase.from('holdings').upsert(payload);
}

// Delete single holding
export async function removeHoldingFromDb(id) {
  return supabase.from('holdings').delete().eq('id', id);
}

// Save settings
export async function persistSettings(settings) {
  return supabase.from('settings').upsert({
    id: 'user_settings',
    starting_capital: Number(settings.startingCapital) || 975000,
    target_pct: Number(settings.targetPct) || 0.75,
    updated_at: new Date().toISOString(),
  });
}

/**
 * Seeds or synchronizes the complete dataset to Supabase.
 */
export async function syncAllToSupabase({ startingCapital, targetPct, trades, ledger, holdings }) {
  const results = {
    settings: false,
    trades: 0,
    ledger: 0,
    holdings: 0,
    errors: [],
  };

  try {
    // 1. Settings
    const sRes = await persistSettings({ startingCapital, targetPct });
    if (sRes.error) results.errors.push(`Settings: ${sRes.error.message}`);
    else results.settings = true;

    // 2. Trades in batches of 50
    if (trades && trades.length > 0) {
      const dbTrades = trades.map(mapTradeToDb);
      const tRes = await supabase.from('trades').upsert(dbTrades, { onConflict: 'id' });
      if (tRes.error) results.errors.push(`Trades: ${tRes.error.message}`);
      else results.trades = trades.length;
    }

    // 3. Ledger
    if (ledger && ledger.length > 0) {
      const dbLedger = ledger.map(mapLedgerToDb);
      const lRes = await supabase.from('ledger').upsert(dbLedger, { onConflict: 'id' });
      if (lRes.error) results.errors.push(`Ledger: ${lRes.error.message}`);
      else results.ledger = ledger.length;
    }

    // 4. Holdings
    if (holdings && holdings.length > 0) {
      const dbHoldings = holdings.map(mapHoldingToDb);
      const hRes = await supabase.from('holdings').upsert(dbHoldings, { onConflict: 'id' });
      if (hRes.error) results.errors.push(`Holdings: ${hRes.error.message}`);
      else results.holdings = holdings.length;
    }
  } catch (err) {
    results.errors.push(`Sync failed: ${err.message}`);
  }

  return results;
}
