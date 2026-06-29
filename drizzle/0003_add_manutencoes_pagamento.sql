-- Migration 0003: Add manutencoes table and pagamento fields to lancamentos

-- Add pagamento fields to lancamentos
ALTER TABLE lancamentos ADD COLUMN IF NOT EXISTS pago BOOLEAN DEFAULT FALSE;
ALTER TABLE lancamentos ADD COLUMN IF NOT EXISTS valor_pago REAL;
ALTER TABLE lancamentos ADD COLUMN IF NOT EXISTS data_pagamento TEXT;

-- Create manutencoes table
CREATE TABLE IF NOT EXISTS manutencoes (
  id TEXT PRIMARY KEY,
  vehicle_id TEXT NOT NULL,
  tipo TEXT NOT NULL,
  descricao TEXT NOT NULL,
  data TEXT NOT NULL,
  km_atual INTEGER,
  proximo_km INTEGER,
  custo REAL NOT NULL,
  oficina TEXT NOT NULL,
  observacao TEXT,
  status TEXT NOT NULL DEFAULT 'Pendente',
  created_at TIMESTAMP DEFAULT NOW()
);
