-- Add missing columns to leads table to match frontend type
ALTER TABLE public.leads
ADD COLUMN IF NOT EXISTS value numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS next_action text,
ADD COLUMN IF NOT EXISTS next_action_date date;

-- Add missing columns to content_items table to match frontend type  
-- (content and author columns already exist, just ensuring scheduled_date is properly used as publishDate)