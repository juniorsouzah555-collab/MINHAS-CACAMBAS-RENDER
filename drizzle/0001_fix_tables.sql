-- Add missing columns to fuel_logs
ALTER TABLE "fuel_logs" ADD COLUMN IF NOT EXISTS "lat" real;
ALTER TABLE "fuel_logs" ADD COLUMN IF NOT EXISTS "lng" real;

-- Add missing columns to lancamentos
ALTER TABLE "lancamentos" ADD COLUMN IF NOT EXISTS "lat" real;
ALTER TABLE "lancamentos" ADD COLUMN IF NOT EXISTS "lng" real;

-- Create motoristas table
CREATE TABLE IF NOT EXISTS "motoristas" (
	"id" serial PRIMARY KEY NOT NULL,
	"nome" text NOT NULL,
	"created_at" timestamp DEFAULT now()
);

-- Create comissoes table
CREATE TABLE IF NOT EXISTS "comissoes" (
	"id" text PRIMARY KEY NOT NULL,
	"motorista" text NOT NULL,
	"vazias_colocadas" integer,
	"retiradas" integer,
	"data" text NOT NULL,
	"created_at" timestamp DEFAULT now()
);

-- Create user_approvals table
CREATE TABLE IF NOT EXISTS "user_approvals" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" text NOT NULL UNIQUE,
	"name" text,
	"role" text DEFAULT 'Operador de Frota',
	"status" text DEFAULT 'Ativo',
	"linked_driver" text,
	"created_at" timestamp DEFAULT now()
);

-- Disable Row Level Security on ALL tables for anon key access
ALTER TABLE "bota_foras" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "dispatches" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "fuel_logs" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "invoices" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "lancamentos" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "maintenance_alerts" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "users" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "vehicles" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "motoristas" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "comissoes" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "user_approvals" DISABLE ROW LEVEL SECURITY;
