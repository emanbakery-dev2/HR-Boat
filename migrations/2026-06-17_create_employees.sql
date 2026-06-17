-- Migration: create employees table (idempotent)
CREATE TABLE IF NOT EXISTS public.employees (
  iqama_number TEXT PRIMARY KEY,
  name TEXT,
  gender TEXT,
  nationality TEXT,
  occupation TEXT,
  passport_number TEXT,
  passport_expiry_date DATE,
  iqama_issue_date DATE,
  iqama_expiry_date DATE,
  birth_date DATE,
  outside_the_kingdom BOOLEAN DEFAULT FALSE,
  hijri_iqama_expiry_date TEXT,
  employer_number TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;

-- Ensure the policy exists (drop then create for idempotency)
DROP POLICY IF EXISTS "Allow all for authenticated users" ON public.employees;

CREATE POLICY "Allow all for authenticated users"
  ON public.employees
  FOR ALL
  USING (true)
  WITH CHECK (true);
