-- 20260923000001_add_stock_investment_columns.sql
-- Add rich stock investment tracking columns to ledger and holdings

ALTER TABLE public.ledger ADD COLUMN IF NOT EXISTS withdrawal_use TEXT DEFAULT 'cash';
ALTER TABLE public.ledger ADD COLUMN IF NOT EXISTS stock_symbol TEXT DEFAULT '';
ALTER TABLE public.ledger ADD COLUMN IF NOT EXISTS holding_id UUID;
ALTER TABLE public.ledger ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

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
