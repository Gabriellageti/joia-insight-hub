-- Add payment settlement details to financial records.
-- These fields are used when a receivable is marked as paid.
ALTER TABLE public.financial_records
ADD COLUMN IF NOT EXISTS paid_at DATE,
ADD COLUMN IF NOT EXISTS payment_method TEXT,
ADD COLUMN IF NOT EXISTS payment_notes TEXT;
