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
    type: row.type || 'Deposit',
    amount: row.amount !== null && row.amount !== undefined ? String(row.amount) : '',
    note: row.note || '',
    metadata: row.metadata || {},
  };
}

// Helper to convert UI ledger object to database row
export function mapLedgerToDb(entry) {
  return {
    id: entry.id,
    date: entry.date,
    type: entry.type || 'Deposit',
    withdrawal_use: 'cash',
    stock_symbol: null,
    holding_id: null,
    amount: entry.amount !== '' ? Number(entry.amount) : 0,
    note: entry.note || '',
    metadata: entry.metadata || {},
    updated_at: new Date().toISOString(),
  };
}

// Helper to convert database row to UI holding object
export function mapHoldingFromDb(row) {
  const tranches = Array.isArray(row.metadata?.tranches) && row.metadata.tranches.length > 0
    ? row.metadata.tranches
    : (row.qty && row.buy_price ? [{
        id: `${row.id}-t1`,
        date: row.date,
        qty: Number(row.qty),
        buyPrice: Number(row.buy_price),
        note: 'Initial purchase'
      }] : []);

  return {
    id: row.id,
    date: row.date,
    stock: row.stock || '',
    companyName: row.company_name || '',
    exchange: row.exchange || 'NSE',
    qty: row.qty !== null && row.qty !== undefined ? String(row.qty) : '',
    buyPrice: row.buy_price !== null && row.buy_price !== undefined ? String(row.buy_price) : '',
    currentPrice: row.current_price !== null && row.current_price !== undefined ? String(row.current_price) : '',
    priceUpdatedOn: row.price_updated_on || row.date,
    peRatio: row.pe_ratio !== null && row.pe_ratio !== undefined ? String(row.pe_ratio) : '',
    beta: row.beta !== null && row.beta !== undefined ? String(row.beta) : '',
    companySize: row.company_size || 'Large cap',
    valuationView: row.valuation_view || 'Needs review',
    dividendDate: row.dividend_date || '',
    dividendPerShare: row.dividend_per_share !== null && row.dividend_per_share !== undefined ? String(row.dividend_per_share) : '',
    investmentNote: row.investment_note || '',
    newsDate: row.news_date || '',
    metadata: row.metadata || {},
    tranches: tranches,
  };
}

// Helper to convert UI holding object to database row
export function mapHoldingToDb(holding) {
  const tranches = Array.isArray(holding.tranches) && holding.tranches.length > 0
    ? holding.tranches
    : (holding.qty && holding.buyPrice ? [{
        id: `${holding.id || 't'}-1`,
        date: holding.date,
        qty: Number(holding.qty),
        buyPrice: Number(holding.buyPrice),
        note: 'Initial purchase'
      }] : []);

  let totalQty = 0;
  let totalInvested = 0;
  tranches.forEach(t => {
    const q = Number(t.qty) || 0;
    const p = Number(t.buyPrice) || 0;
    totalQty += q;
    totalInvested += (q * p);
  });

  const avgBuyPrice = totalQty > 0 ? (totalInvested / totalQty) : (Number(holding.buyPrice) || 0);
  const effectiveQty = totalQty > 0 ? totalQty : (Number(holding.qty) || 0);

  const buyNum = Number(avgBuyPrice.toFixed(4));
  let curNum = null;
  if (holding.currentPrice !== '' && holding.currentPrice != null && !isNaN(Number(holding.currentPrice))) {
    curNum = Number(holding.currentPrice);
  } else if (buyNum > 0) {
    curNum = buyNum;
  }

  const updatedMetadata = {
    ...(holding.metadata || {}),
    tranches: tranches
  };

  return {
    id: holding.id,
    date: tranches[0]?.date || holding.date,
    stock: (holding.stock || '').toUpperCase().trim(),
    company_name: holding.companyName || '',
    exchange: holding.exchange || 'NSE',
    qty: effectiveQty,
    buy_price: buyNum,
    current_price: curNum,
    price_updated_on: holding.priceUpdatedOn || holding.date || new Date().toISOString().split('T')[0],
    pe_ratio: holding.peRatio !== '' && holding.peRatio != null ? Number(holding.peRatio) : null,
    beta: holding.beta !== '' && holding.beta != null ? Number(holding.beta) : null,
    company_size: holding.companySize || 'Large cap',
    valuation_view: holding.valuationView || 'Needs review',
    dividend_date: holding.dividendDate || null,
    dividend_per_share: holding.dividendPerShare !== '' && holding.dividendPerShare != null ? Number(holding.dividendPerShare) : null,
    investment_note: holding.investmentNote || '',
    news_date: holding.newsDate || null,
    ledger_id: null,
    metadata: updatedMetadata,
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

// Reference catalog for Indian equities (instant offline & fallback quotes)
export const STOCK_PRICE_CATALOG = {
  BSE: 3270.70,
  COALINDIA: 424.55,
  "COAL INDIA": 424.55,
  COAL: 424.55,
  NSE: 1850.00,
  MSCI: 6.94,
  MSEI: 6.94,
  "METROPOLITAN STOCK EXCHANGE": 6.94,
  RELIANCE: 1385.50,
  HDFCBANK: 1682.00,
  HDFC: 1682.00,
  INFY: 1912.00,
  INFOSYS: 1912.00,
  TCS: 4125.00,
  ITC: 492.00,
  TATAMOTORS: 975.00,
  "TATA MOTORS": 975.00,
  SBIN: 815.00,
  SBI: 815.00,
  ICICIBANK: 1240.00,
  ICICI: 1240.00,
  BHARTIARTL: 1650.00,
  AIRTEL: 1650.00,
  LT: 3580.00,
  "L&T": 3580.00,
  MARUTI: 12450.00,
  HINDUNILVR: 2850.00,
  HUL: 2850.00,
  BAJFINANCE: 7120.00,
  "BAJAJ FINANCE": 7120.00,
  SUNPHARMA: 1890.00,
  AXISBANK: 1210.00,
  KOTAKBANK: 1780.00,
  TITAN: 3680.00,
  ADANIENT: 2950.00,
  WIPRO: 540.00,
  NTPC: 410.00,
  ONGC: 295.00,
  POWERGRID: 335.00,
  TATASTEEL: 152.00,
};

/**
 * Fetches the current market price (CMP) for an equity symbol.
 * Checks serverless quote endpoint, falling back instantly to reference price catalog.
 */
export async function fetchStockQuote(rawSymbol) {
  if (!rawSymbol) return null;
  const clean = rawSymbol.trim().toUpperCase().replace(/\s+/g, '');

  try {
    const res = await fetch(`/api/quote?symbol=${encodeURIComponent(clean)}`);
    if (res.ok) {
      const data = await res.json();
      if (data && data.price != null && !isNaN(data.price)) {
        return {
          symbol: clean,
          price: Number(data.price),
          source: data.source || 'live',
        };
      }
    }
  } catch (err) {
    // network or dev server without /api
  }

  const fallback = STOCK_PRICE_CATALOG[clean] || STOCK_PRICE_CATALOG[rawSymbol.trim().toUpperCase()];
  if (fallback != null) {
    return {
      symbol: clean,
      price: fallback,
      source: 'catalog',
    };
  }

  return null;
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

const HABITS_CACHE_KEY = 'belief-habits-cache-v1';

export function loadLocalHabitsCache() {
  try {
    const raw = localStorage.getItem(HABITS_CACHE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    return {};
  }
}

export function saveLocalHabitsCache(data) {
  try {
    localStorage.setItem(HABITS_CACHE_KEY, JSON.stringify(data));
  } catch (e) {
    console.warn('Could not save local habits cache', e);
  }
}

export async function loadDailyHabitsFromDb() {
  try {
    const { data, error } = await supabase.from('daily_habits').select('*').order('date', { ascending: false });
    if (error) {
      console.warn('Could not load habits from Supabase:', error.message);
      return loadLocalHabitsCache();
    }
    const habitMap = {};
    if (data && data.length > 0) {
      data.forEach(row => {
        habitMap[row.date] = {
          habits: row.habits || {},
          completedCount: row.completed_count || 0,
        };
      });
      saveLocalHabitsCache(habitMap);
    } else {
      return loadLocalHabitsCache();
    }
    return habitMap;
  } catch (e) {
    return loadLocalHabitsCache();
  }
}

export async function persistDailyHabitToDb({ date, habits, completedCount }) {
  // Update local cache immediately
  const cache = loadLocalHabitsCache();
  cache[date] = { habits, completedCount };
  saveLocalHabitsCache(cache);

  // Sync to Supabase
  try {
    const { error } = await supabase.from('daily_habits').upsert({
      date,
      habits,
      completed_count: completedCount,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'date' });
    if (error) console.warn('Failed to upsert habit to Supabase:', error.message);
    return { error };
  } catch (e) {
    console.warn('Network error saving habit:', e);
    return { error: e };
  }
}
