-- Add color column to the columns table
ALTER TABLE columns ADD COLUMN IF NOT EXISTS color TEXT;
