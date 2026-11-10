-- Add taste profile score columns to wines table
-- These store the 0-100 numeric scores from AI profile generation
ALTER TABLE wines ADD COLUMN IF NOT EXISTS acidity_score INTEGER;
ALTER TABLE wines ADD COLUMN IF NOT EXISTS tannin_score INTEGER;
ALTER TABLE wines ADD COLUMN IF NOT EXISTS body_score INTEGER;
ALTER TABLE wines ADD COLUMN IF NOT EXISTS sweetness_score INTEGER;

