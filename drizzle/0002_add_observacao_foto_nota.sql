-- Add missing columns that the app writes but were never migrated,
-- causing inserts with these fields to fail silently (PGRST204).
ALTER TABLE "lancamentos" ADD COLUMN IF NOT EXISTS "observacao" text;
ALTER TABLE "fuel_logs" ADD COLUMN IF NOT EXISTS "observacao" text;
ALTER TABLE "fuel_logs" ADD COLUMN IF NOT EXISTS "foto_nota" text;
