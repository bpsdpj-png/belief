-- ==============================================================================
-- Belief Trading Dashboard - Supabase Schema Migration
-- Database: PostgreSQL (Supabase)
-- Created: 2026-09-23
-- ==============================================================================

-- 1. Enable UUID extension if not enabled
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 2. TRADES TABLE
-- Logs individual trade executions, P&L, charges, bias, and discipline checklist
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.trades (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date TEXT NOT NULL,
    index TEXT NOT NULL,
    strategy TEXT NOT NULL,
    bias TEXT DEFAULT 'Sideways',
    gross NUMERIC DEFAULT 0,
    charges NUMERIC DEFAULT 0,
    capital_deployed NUMERIC,
    rules JSONB DEFAULT '{"sl": true, "sizing": true, "noRevenge": true, "plan": true}'::jsonb,
    notes TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==============================================================================
-- 3. CAPITAL LEDGER TABLE
-- Tracks deposits, withdrawals, and capital injections
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('Deposit', 'Withdrawal', 'Investment')),
    withdrawal_use TEXT DEFAULT 'cash',
    stock_symbol TEXT DEFAULT '',
    holding_id UUID,
    amount NUMERIC DEFAULT 0 NOT NULL,
    note TEXT DEFAULT '',
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==============================================================================
-- 4. EQUITY HOLDINGS TABLE
-- Tracks equity investments funded from trading capital
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.holdings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date TEXT NOT NULL,
    stock TEXT NOT NULL,
    company_name TEXT DEFAULT '',
    exchange TEXT DEFAULT 'NSE',
    qty NUMERIC DEFAULT 0 NOT NULL,
    buy_price NUMERIC DEFAULT 0 NOT NULL,
    current_price NUMERIC,
    price_updated_on TEXT,
    pe_ratio NUMERIC,
    beta NUMERIC,
    company_size TEXT DEFAULT 'Large cap',
    valuation_view TEXT DEFAULT 'Needs review',
    dividend_date TEXT,
    dividend_per_share NUMERIC,
    investment_note TEXT DEFAULT '',
    news_date TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    ledger_id UUID,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==============================================================================
-- 5. SETTINGS TABLE
-- Tracks starting capital, target percentage, and account configurations
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.settings (
    id TEXT PRIMARY KEY DEFAULT 'user_settings',
    starting_capital NUMERIC DEFAULT 975000 NOT NULL,
    target_pct NUMERIC DEFAULT 0.75 NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==============================================================================
-- 6. INDEXES
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_trades_date ON public.trades (date DESC);
CREATE INDEX IF NOT EXISTS idx_trades_index ON public.trades (index);
CREATE INDEX IF NOT EXISTS idx_ledger_date ON public.ledger (date DESC);
CREATE INDEX IF NOT EXISTS idx_ledger_type ON public.ledger (type);
CREATE INDEX IF NOT EXISTS idx_holdings_date ON public.holdings (date DESC);

-- ==============================================================================
-- 7. ROW LEVEL SECURITY (RLS) POLICIES
-- Permits read, insert, update, delete for client applications via publishable anon key
-- ==============================================================================
ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.holdings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- Trades Policies
DROP POLICY IF EXISTS "Public select on trades" ON public.trades;
CREATE POLICY "Public select on trades" ON public.trades FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public insert on trades" ON public.trades;
CREATE POLICY "Public insert on trades" ON public.trades FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Public update on trades" ON public.trades;
CREATE POLICY "Public update on trades" ON public.trades FOR UPDATE USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public delete on trades" ON public.trades;
CREATE POLICY "Public delete on trades" ON public.trades FOR DELETE USING (true);

-- Ledger Policies
DROP POLICY IF EXISTS "Public select on ledger" ON public.ledger;
CREATE POLICY "Public select on ledger" ON public.ledger FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public insert on ledger" ON public.ledger;
CREATE POLICY "Public insert on ledger" ON public.ledger FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Public update on ledger" ON public.ledger;
CREATE POLICY "Public update on ledger" ON public.ledger FOR UPDATE USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public delete on ledger" ON public.ledger;
CREATE POLICY "Public delete on ledger" ON public.ledger FOR DELETE USING (true);

-- Holdings Policies
DROP POLICY IF EXISTS "Public select on holdings" ON public.holdings;
CREATE POLICY "Public select on holdings" ON public.holdings FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public insert on holdings" ON public.holdings;
CREATE POLICY "Public insert on holdings" ON public.holdings FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Public update on holdings" ON public.holdings;
CREATE POLICY "Public update on holdings" ON public.holdings FOR UPDATE USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public delete on holdings" ON public.holdings;
CREATE POLICY "Public delete on holdings" ON public.holdings FOR DELETE USING (true);

-- Settings Policies
DROP POLICY IF EXISTS "Public select on settings" ON public.settings;
CREATE POLICY "Public select on settings" ON public.settings FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public insert on settings" ON public.settings;
CREATE POLICY "Public insert on settings" ON public.settings FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Public update on settings" ON public.settings;
CREATE POLICY "Public update on settings" ON public.settings FOR UPDATE USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public delete on settings" ON public.settings;
CREATE POLICY "Public delete on settings" ON public.settings FOR DELETE USING (true);
