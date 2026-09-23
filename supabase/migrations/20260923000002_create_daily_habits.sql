-- Migration: Create daily_habits table for personal habit tracker
CREATE TABLE IF NOT EXISTS public.daily_habits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date TEXT NOT NULL UNIQUE,
  habits JSONB NOT NULL DEFAULT '{}'::jsonb,
  completed_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS and policies
ALTER TABLE public.daily_habits ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'daily_habits' AND policyname = 'Public select daily_habits'
  ) THEN
    CREATE POLICY "Public select daily_habits" ON public.daily_habits FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'daily_habits' AND policyname = 'Public insert daily_habits'
  ) THEN
    CREATE POLICY "Public insert daily_habits" ON public.daily_habits FOR INSERT WITH CHECK (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'daily_habits' AND policyname = 'Public update daily_habits'
  ) THEN
    CREATE POLICY "Public update daily_habits" ON public.daily_habits FOR UPDATE USING (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'daily_habits' AND policyname = 'Public delete daily_habits'
  ) THEN
    CREATE POLICY "Public delete daily_habits" ON public.daily_habits FOR DELETE USING (true);
  END IF;
END $$;
