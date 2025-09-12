-- Add last_scraped_at column to domains table
ALTER TABLE domains ADD COLUMN IF NOT EXISTS last_scraped_at TIMESTAMPTZ;
