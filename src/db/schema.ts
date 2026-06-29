import { integer, pgTable, serial, text, timestamp, real, boolean } from 'drizzle-orm/pg-core';

// Define the 'users' table.
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(), // Firebase Auth UID
  email: text('email').notNull(),
  role: text('role').default('Operador de Frota'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Define 'bota_foras' table
export const botaForas = pgTable('bota_foras', {
  id: text('id').primaryKey(),
  nome: text('nome').notNull(),
  cnpj: text('cnpj').notNull(),
  telefone: text('telefone').notNull(),
  endereco: text('endereco').notNull(),
  valorPadraoDescarte: real('valor_padrao_descarte'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Define 'lancamentos' table
export const lancamentos = pgTable('lancamentos', {
  id: text('id').primaryKey(),
  botaForaId: text('bota_fora_id').notNull(),
  botaForaNome: text('bota_fora_nome').notNull(),
  quantidadeCacambas: integer('quantidade_cacambas').notNull(),
  valor: real('valor').notNull(),
  data: text('data').notNull(),
  driverName: text('driver_name'),
  vehicleId: text('vehicle_id'),
  status: text('status').notNull(), // 'Pendente' | 'Concluido'
  createdAt: timestamp('created_at').defaultNow(),
  lat: real('lat'),
  lng: real('lng'),
  observacao: text('observacao'),
  pago: boolean('pago').default(false),
  valorPago: real('valor_pago'),
  dataPagamento: text('data_pagamento'),
});

// Define 'vehicles' table
export const vehicles = pgTable('vehicles', {
  id: text('id').primaryKey(),
  status: text('status').notNull(), // 'In Transit' | 'Loading' | 'Maintenance' | 'Available'
  efficiency: real('efficiency').notNull(),
  fuelUsed: real('fuel_used').notNull(),
  costPerKm: real('cost_per_km').notNull(),
  driver: text('driver').notNull(),
  trend: text('trend'), // Stringified JSON array of numbers
  lastMaintenanceDate: text('last_maintenance_date'),
  speed: integer('speed'),
  lat: real('lat').notNull(),
  lng: real('lng').notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  type: text('type'), // 'Caminhão' | 'Veículo'
  initialKm: integer('initial_km'),
});

// Define 'fuel_logs' table
export const fuelLogs = pgTable('fuel_logs', {
  id: text('id').primaryKey(),
  vehicleId: text('vehicle_id').notNull(),
  quantidadeLitros: real('quantidade_litros').notNull(),
  kmInicial: integer('km_inicial'),
  kmFinal: integer('km_final'),
  valorPago: real('valor_pago').notNull(),
  data: text('data').notNull(),
  driver: text('driver'),
  mediaKmL: real('media_km_l'),
  tipo: text('tipo'), // 'POSTO' | 'GARAGEM'
  isRetiradaDiversa: boolean('is_retirada_diversa').default(false),
  lat: real('lat'),
  lng: real('lng'),
  observacao: text('observacao'),
  fotoNota: text('foto_nota'),
});

// Define 'maintenance_alerts' table
export const maintenanceAlerts = pgTable('maintenance_alerts', {
  id: text('id').primaryKey(),
  vehicleId: text('vehicle_id').notNull(),
  title: text('title').notNull(),
  message: text('message').notNull(),
  timeAgo: text('time_ago').notNull(),
  severity: text('severity').notNull(), // 'critical' | 'warning' | 'info'
  type: text('type').notNull(), // 'engine' | 'tire' | 'oil' | 'general'
  resolved: boolean('resolved').default(false).notNull(),
});

// Define 'invoices' table
export const invoices = pgTable('invoices', {
  id: text('id').primaryKey(),
  clientName: text('client_name').notNull(),
  entityCode: text('entity_code').notNull(),
  serviceDesc: text('service_desc').notNull(),
  issueDate: text('issue_date').notNull(),
  dueDate: text('due_date').notNull(),
  amount: real('amount').notNull(),
  status: text('status').notNull(), // 'PENDING' | 'OVERDUE' | 'DRAFT' | 'PAID'
});

// Define 'dispatches' table
export const dispatches = pgTable('dispatches', {
  id: text('id').primaryKey(),
  vehicleId: text('vehicle_id').notNull(),
  driverName: text('driver_name').notNull(),
  clientName: text('client_name').notNull(),
  origin: text('origin').notNull(),
  destination: text('destination').notNull(),
  payloadType: text('payload_type').notNull(),
  weight: real('weight').notNull(),
  status: text('status').notNull(), // 'Assigned' | 'In Transit' | 'Completed'
  createdAt: timestamp('created_at').defaultNow(),
});

// Define 'motoristas' table
export const motoristas = pgTable('motoristas', {
  id: serial('id').primaryKey(),
  nome: text('nome').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

// Define 'comissoes' table
export const comissoes = pgTable('comissoes', {
  id: text('id').primaryKey(),
  motorista: text('motorista').notNull(),
  vaziasColocadas: integer('vazias_colocadas'),
  retiradas: integer('retiradas'),
  data: text('data').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

// Define 'manutencoes' table
export const manutencoes = pgTable('manutencoes', {
  id: text('id').primaryKey(),
  vehicleId: text('vehicle_id').notNull(),
  tipo: text('tipo').notNull(), // 'Preventiva' | 'Corretiva' | 'Elétrica' | 'Mecânica' | 'Pneus' | 'Óleo' | 'Outro'
  descricao: text('descricao').notNull(),
  data: text('data').notNull(),
  kmAtual: integer('km_atual'),
  proximoKm: integer('proximo_km'),
  custo: real('custo').notNull(),
  oficina: text('oficina').notNull(),
  observacao: text('observacao'),
  status: text('status').notNull(), // 'Pendente' | 'Em Andamento' | 'Concluído'
  createdAt: timestamp('created_at').defaultNow(),
});

// Define 'user_approvals' table
export const userApprovals = pgTable('user_approvals', {
  id: serial('id').primaryKey(),
  email: text('email').notNull().unique(),
  name: text('name'),
  role: text('role').default('Operador de Frota'),
  status: text('status').default('Ativo'),
  linkedDriver: text('linked_driver'),
  createdAt: timestamp('created_at').defaultNow(),
});
