-- ============================================================
-- RELAMPAGO CACAMBAS - Migração completa do banco de dados
-- Cole no SQL Editor do Supabase e execute (uma vez)
-- ============================================================

-- Tabela: bota_foras
CREATE TABLE IF NOT EXISTS "bota_foras" (
  "id" text PRIMARY KEY NOT NULL,
  "nome" text NOT NULL,
  "cnpj" text NOT NULL,
  "telefone" text NOT NULL,
  "endereco" text NOT NULL,
  "valor_padrao_descarte" real,
  "created_at" timestamp DEFAULT now()
);

-- Tabela: dispatches
CREATE TABLE IF NOT EXISTS "dispatches" (
  "id" text PRIMARY KEY NOT NULL,
  "vehicle_id" text NOT NULL,
  "driver_name" text NOT NULL,
  "client_name" text NOT NULL,
  "origin" text NOT NULL,
  "destination" text NOT NULL,
  "payload_type" text NOT NULL,
  "weight" real NOT NULL,
  "status" text NOT NULL,
  "created_at" timestamp DEFAULT now()
);

-- Tabela: fuel_logs
CREATE TABLE IF NOT EXISTS "fuel_logs" (
  "id" text PRIMARY KEY NOT NULL,
  "vehicle_id" text NOT NULL,
  "quantidade_litros" real NOT NULL,
  "km_inicial" integer,
  "km_final" integer,
  "valor_pago" real NOT NULL,
  "data" text NOT NULL,
  "driver" text,
  "media_km_l" real,
  "tipo" text,
  "is_retirada_diversa" boolean DEFAULT false,
  "lat" real,
  "lng" real,
  "observacao" text,
  "foto_nota" text
);

-- Tabela: invoices
CREATE TABLE IF NOT EXISTS "invoices" (
  "id" text PRIMARY KEY NOT NULL,
  "client_name" text NOT NULL,
  "entity_code" text NOT NULL,
  "service_desc" text NOT NULL,
  "issue_date" text NOT NULL,
  "due_date" text NOT NULL,
  "amount" real NOT NULL,
  "status" text NOT NULL
);

-- Tabela: lancamentos
CREATE TABLE IF NOT EXISTS "lancamentos" (
  "id" text PRIMARY KEY NOT NULL,
  "bota_fora_id" text NOT NULL,
  "bota_fora_nome" text NOT NULL,
  "quantidade_cacambas" integer NOT NULL,
  "valor" real NOT NULL,
  "data" text NOT NULL,
  "driver_name" text,
  "vehicle_id" text,
  "status" text NOT NULL,
  "created_at" timestamp DEFAULT now(),
  "lat" real,
  "lng" real,
  "observacao" text
);

-- Tabela: maintenance_alerts
CREATE TABLE IF NOT EXISTS "maintenance_alerts" (
  "id" text PRIMARY KEY NOT NULL,
  "vehicle_id" text NOT NULL,
  "title" text NOT NULL,
  "message" text NOT NULL,
  "time_ago" text NOT NULL,
  "severity" text NOT NULL,
  "type" text NOT NULL,
  "resolved" boolean DEFAULT false NOT NULL
);

-- Tabela: vehicles
CREATE TABLE IF NOT EXISTS "vehicles" (
  "id" text PRIMARY KEY NOT NULL,
  "status" text NOT NULL,
  "efficiency" real NOT NULL,
  "fuel_used" real NOT NULL,
  "cost_per_km" real NOT NULL,
  "driver" text NOT NULL,
  "trend" text,
  "last_maintenance_date" text,
  "speed" integer,
  "lat" real NOT NULL,
  "lng" real NOT NULL,
  "is_active" boolean DEFAULT true NOT NULL,
  "type" text,
  "initial_km" integer
);

-- Tabela: motoristas
CREATE TABLE IF NOT EXISTS "motoristas" (
  "id" serial PRIMARY KEY NOT NULL,
  "nome" text NOT NULL,
  "created_at" timestamp DEFAULT now()
);

-- Tabela: comissoes
CREATE TABLE IF NOT EXISTS "comissoes" (
  "id" text PRIMARY KEY NOT NULL,
  "motorista" text NOT NULL,
  "vazias_colocadas" integer,
  "retiradas" integer,
  "data" text NOT NULL,
  "created_at" timestamp DEFAULT now()
);

-- Tabela: user_approvals
CREATE TABLE IF NOT EXISTS "user_approvals" (
  "id" serial PRIMARY KEY NOT NULL,
  "email" text NOT NULL UNIQUE,
  "name" text,
  "role" text DEFAULT 'Operador de Frota',
  "status" text DEFAULT 'Ativo',
  "linked_driver" text,
  "created_at" timestamp DEFAULT now()
);

-- Tabela: garage_refills (para abastecimento na garagem)
CREATE TABLE IF NOT EXISTS "garage_refills" (
  "id" text PRIMARY KEY NOT NULL,
  "data" text NOT NULL,
  "quantidade_litros" real NOT NULL,
  "valor_total" real NOT NULL,
  "preco_por_litro" real NOT NULL,
  "created_at" timestamp DEFAULT now()
);

-- Tabela: plano_contas (contas/boletos a pagar, antes só em localStorage)
CREATE TABLE IF NOT EXISTS "plano_contas" (
  "id" text PRIMARY KEY NOT NULL,
  "name" text NOT NULL,
  "date" text NOT NULL,
  "checked" boolean DEFAULT false,
  "sender" text,
  "created_at" timestamp DEFAULT now()
);

-- Desabilitar RLS em todas as tabelas para acesso com anon key
ALTER TABLE "bota_foras" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "dispatches" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "fuel_logs" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "invoices" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "lancamentos" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "maintenance_alerts" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "vehicles" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "motoristas" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "comissoes" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "user_approvals" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "garage_refills" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "plano_contas" DISABLE ROW LEVEL SECURITY;
