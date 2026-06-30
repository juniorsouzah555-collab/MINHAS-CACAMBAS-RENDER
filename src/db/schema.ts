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

// ─── MÓDULO BANCÁRIO ─────────────────────────────────────
export const gruposConta = pgTable('grupos_conta', {
  id: text('id').primaryKey(),
  nome: text('nome').notNull(),
  tipo: text('tipo').notNull(),
});
export const categoriasConta = pgTable('categorias_conta', {
  id: text('id').primaryKey(),
  grupoId: text('grupo_id').notNull(),
  nome: text('nome').notNull(),
});
export const subcategoriasConta = pgTable('subcategorias_conta', {
  id: text('id').primaryKey(),
  categoriaId: text('categoria_id').notNull(),
  nome: text('nome').notNull(),
});
export const importacoesExtrato = pgTable('importacoes_extrato', {
  id: text('id').primaryKey(),
  nomeArquivo: text('nome_arquivo').notNull(),
  banco: text('banco').notNull(),
  dataInicio: text('data_inicio').notNull(),
  dataFim: text('data_fim').notNull(),
  totalLinhas: integer('total_linhas').notNull().default(0),
  categorizadas: integer('categorizadas').notNull().default(0),
  pendentes: integer('pendentes').notNull().default(0),
  status: text('status').notNull().default('PROCESSANDO'),
  createdAt: timestamp('created_at').defaultNow(),
});
export const extratoTransacoes = pgTable('extrato_transacoes', {
  id: text('id').primaryKey(),
  data: text('data').notNull(),
  descricao: text('descricao').notNull(),
  valor: real('valor').notNull(),
  tipo: text('tipo').notNull(),
  saldo: real('saldo'),
  categoria: text('categoria'),
  subcategoria: text('subcategoria'),
  centroCustoId: text('centro_custo_id'),
  status: text('status').notNull().default('PENDENTE'),
  importacaoId: text('importacao_id').notNull(),
  observacao: text('observacao'),
  createdAt: timestamp('created_at').defaultNow(),
});
export const centrosCusto = pgTable('centros_custo', {
  id: text('id').primaryKey(),
  nome: text('nome').notNull(),
  codigo: text('codigo').notNull(),
  descricao: text('descricao'),
  ativo: boolean('ativo').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});
export const conciliacoes = pgTable('conciliacoes', {
  id: text('id').primaryKey(),
  transacaoId: text('transacao_id').notNull(),
  lancamentoId: text('lancamento_id'),
  data: text('data').notNull(),
  valor: real('valor').notNull(),
  status: text('status').notNull().default('PENDENTE'),
  observacao: text('observacao'),
  createdAt: timestamp('created_at').defaultNow(),
});
export const regrasCategorizacao = pgTable('regras_categorizacao', {
  id: text('id').primaryKey(),
  padrao: text('padrao').notNull(),
  categoria: text('categoria').notNull(),
  subcategoria: text('subcategoria'),
  centroCustoId: text('centro_custo_id'),
  createdAt: timestamp('created_at').defaultNow(),
});
export const patrimonio = pgTable('patrimonio', {
  id: text('id').primaryKey(),
  nome: text('nome').notNull(),
  tipo: text('tipo').notNull(),
  dataAquisicao: text('data_aquisicao').notNull(),
  valorAquisicao: real('valor_aquisicao').notNull(),
  valorResidual: real('valor_residual').notNull().default(0),
  vidaUtil: integer('vida_util').notNull().default(5),
  depreciacaoAnual: real('depreciacao_anual').notNull().default(0),
  depreciacaoAcumulada: real('depreciacao_acumulada').notNull().default(0),
  valorContabil: real('valor_contabil').notNull().default(0),
  localizacao: text('localizacao'),
  observacao: text('observacao'),
  createdAt: timestamp('created_at').defaultNow(),
});
export const planosPagamento = pgTable('planos_pagamento', {
  id: text('id').primaryKey(),
  descricao: text('descricao').notNull(),
  instituicao: text('instituicao'),
  valorTotal: real('valor_total').notNull(),
  numeroParcelas: integer('numero_parcelas').notNull().default(1),
  parcelasPagas: integer('parcelas_pagas').notNull().default(0),
  valorParcela: real('valor_parcela').notNull().default(0),
  dataInicio: text('data_inicio').notNull(),
  dataFim: text('data_fim'),
  categoria: text('categoria'),
  subcategoria: text('subcategoria'),
  status: text('status').notNull().default('ATIVO'),
  mostrarDashboard: boolean('mostrar_dashboard').default(true),
  createdAt: timestamp('created_at').defaultNow(),
});
export const clientes = pgTable('clientes', {
  id: text('id').primaryKey(),
  tipo: text('tipo').notNull(),
  nome: text('nome').notNull(),
  documento: text('documento').notNull(),
  telefone: text('telefone').notNull(),
  email: text('email'),
  endereco: text('endereco'),
  observacao: text('observacao'),
  createdAt: timestamp('created_at').defaultNow(),
});
