-- Migration 0004: Add source column to lancamentos (mobile vs web)
ALTER TABLE lancamentos ADD COLUMN IF NOT EXISTS source TEXT;
