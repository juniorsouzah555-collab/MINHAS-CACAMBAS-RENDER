import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';

export const pedagios = sqliteTable('pedagios', {
  id: text('id').primaryKey(),
  placa: text('placa').notNull(),
  concessionaria: text('concessionaria'),
  valorTotal: real('valor_total').notNull(),
  dataPassagem: text('data_passagem'),
  dataConsulta: text('data_consulta'),
  pago: integer('pago', { mode: 'boolean' }).default(false),
  dataPagamento: text('data_pagamento'),
  pixCode: text('pix_code'),
  observacao: text('observacao'),
  createdAt: text('created_at'),
});

export const botaForas = sqliteTable('bota_foras', {
  id: text('id').primaryKey(),
  nome: text('nome').notNull(),
  cnpj: text('cnpj').notNull(),
  telefone: text('telefone').notNull(),
  endereco: text('endereco').notNull(),
  valorPadraoDescarte: real('valor_padrao_descarte'),
  createdAt: text('created_at'),
});

export const lancamentos = sqliteTable('lancamentos', {
  id: text('id').primaryKey(),
  botaForaId: text('bota_fora_id').notNull(),
  botaForaNome: text('bota_fora_nome').notNull(),
  quantidadeCacambas: integer('quantidade_cacambas').notNull(),
  valor: real('valor').notNull(),
  data: text('data').notNull(),
  driverName: text('driver_name'),
  vehicleId: text('vehicle_id'),
  status: text('status').notNull(),
  createdAt: text('created_at'),
  lat: real('lat'),
  lng: real('lng'),
  observacao: text('observacao'),
  pago: integer('pago', { mode: 'boolean' }).default(false),
  valorPago: real('valor_pago'),
  dataPagamento: text('data_pagamento'),
  source: text('source'),
});

export const vehicleLocations = sqliteTable('vehicle_locations', {
  vehicleId: text('vehicle_id').primaryKey(),
  driverName: text('driver_name'),
  lat: real('lat').notNull(),
  lng: real('lng').notNull(),
  speed: real('speed'),
  accuracy: real('accuracy'),
  updatedAt: text('updated_at').notNull(),
});

export const vehicles = sqliteTable('vehicles', {
  id: text('id').primaryKey(),
  status: text('status').notNull(),
  efficiency: real('efficiency').notNull(),
  fuelUsed: real('fuel_used').notNull(),
  costPerKm: real('cost_per_km').notNull(),
  driver: text('driver').notNull(),
  trend: text('trend'),
  lastMaintenanceDate: text('last_maintenance_date'),
  speed: integer('speed'),
  lat: real('lat').notNull(),
  lng: real('lng').notNull(),
  isActive: integer('is_active', { mode: 'boolean' }).default(true).notNull(),
  type: text('type'),
  initialKm: integer('initial_km'),
});

export const fuelLogs = sqliteTable('fuel_logs', {
  id: text('id').primaryKey(),
  vehicleId: text('vehicle_id').notNull(),
  quantidadeLitros: real('quantidade_litros').notNull(),
  kmInicial: integer('km_inicial'),
  kmFinal: integer('km_final'),
  valorPago: real('valor_pago').notNull(),
  data: text('data').notNull(),
  driver: text('driver'),
  mediaKmL: real('media_km_l'),
  tipo: text('tipo'),
  isRetiradaDiversa: integer('is_retirada_diversa', { mode: 'boolean' }).default(false),
  lat: real('lat'),
  lng: real('lng'),
  observacao: text('observacao'),
  fotoNota: text('foto_nota'),
});

export const maintenanceAlerts = sqliteTable('maintenance_alerts', {
  id: text('id').primaryKey(),
  vehicleId: text('vehicle_id').notNull(),
  title: text('title').notNull(),
  message: text('message').notNull(),
  timeAgo: text('time_ago').notNull(),
  severity: text('severity').notNull(),
  type: text('type').notNull(),
  resolved: integer('resolved', { mode: 'boolean' }).default(false).notNull(),
});

export const invoices = sqliteTable('invoices', {
  id: text('id').primaryKey(),
  clientName: text('client_name').notNull(),
  entityCode: text('entity_code').notNull(),
  serviceDesc: text('service_desc').notNull(),
  issueDate: text('issue_date').notNull(),
  dueDate: text('due_date').notNull(),
  amount: real('amount').notNull(),
  status: text('status').notNull(),
});

export const dispatches = sqliteTable('dispatches', {
  id: text('id').primaryKey(),
  vehicleId: text('vehicle_id').notNull(),
  driverName: text('driver_name').notNull(),
  clientName: text('client_name').notNull(),
  origin: text('origin').notNull(),
  destination: text('destination').notNull(),
  payloadType: text('payload_type').notNull(),
  weight: real('weight').notNull(),
  status: text('status').notNull(),
  createdAt: text('created_at'),
});

export const motoristas = sqliteTable('motoristas', {
  id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
  nome: text('nome').notNull(),
  createdAt: text('created_at'),
});

export const comissoes = sqliteTable('comissoes', {
  id: text('id').primaryKey(),
  motorista: text('motorista').notNull(),
  vaziasColocadas: integer('vazias_colocadas'),
  retiradas: integer('retiradas'),
  data: text('data').notNull(),
  createdAt: text('created_at'),
});

export const manutencoes = sqliteTable('manutencoes', {
  id: text('id').primaryKey(),
  vehicleId: text('vehicle_id').notNull(),
  tipo: text('tipo').notNull(),
  descricao: text('descricao').notNull(),
  data: text('data').notNull(),
  kmAtual: integer('km_atual'),
  proximoKm: integer('proximo_km'),
  custo: real('custo').notNull(),
  valorMaoDeObra: real('valor_mao_de_obra'),
  valorPeca: real('valor_peca'),
  local: text('local').default('Oficina'),
  oficina: text('oficina').notNull(),
  observacao: text('observacao'),
  status: text('status').notNull(),
  createdAt: text('created_at'),
});

export const userApprovals = sqliteTable('user_approvals', {
  id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
  email: text('email').notNull().unique(),
  name: text('name'),
  role: text('role').default('Operador de Frota'),
  status: text('status').default('Ativo'),
  linkedDriver: text('linked_driver'),
  createdAt: text('created_at'),
});

export const gruposConta = sqliteTable('grupos_conta', {
  id: text('id').primaryKey(),
  nome: text('nome').notNull(),
  tipo: text('tipo').notNull(),
});
export const categoriasConta = sqliteTable('categorias_conta', {
  id: text('id').primaryKey(),
  grupoId: text('grupo_id').notNull(),
  nome: text('nome').notNull(),
});
export const subcategoriasConta = sqliteTable('subcategorias_conta', {
  id: text('id').primaryKey(),
  categoriaId: text('categoria_id').notNull(),
  nome: text('nome').notNull(),
});
export const importacoesExtrato = sqliteTable('importacoes_extrato', {
  id: text('id').primaryKey(),
  nomeArquivo: text('nome_arquivo').notNull(),
  banco: text('banco').notNull(),
  dataInicio: text('data_inicio').notNull(),
  dataFim: text('data_fim').notNull(),
  totalLinhas: integer('total_linhas').notNull().default(0),
  categorizadas: integer('categorizadas').notNull().default(0),
  pendentes: integer('pendentes').notNull().default(0),
  status: text('status').notNull().default('PROCESSANDO'),
  createdAt: text('created_at'),
});
export const extratoTransacoes = sqliteTable('extrato_transacoes', {
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
  createdAt: text('created_at'),
});
export const centrosCusto = sqliteTable('centros_custo', {
  id: text('id').primaryKey(),
  nome: text('nome').notNull(),
  codigo: text('codigo').notNull(),
  descricao: text('descricao'),
  ativo: integer('ativo', { mode: 'boolean' }).default(true).notNull(),
  createdAt: text('created_at'),
});
export const conciliacoes = sqliteTable('conciliacoes', {
  id: text('id').primaryKey(),
  transacaoId: text('transacao_id').notNull(),
  lancamentoId: text('lancamento_id'),
  data: text('data').notNull(),
  valor: real('valor').notNull(),
  status: text('status').notNull().default('PENDENTE'),
  observacao: text('observacao'),
  createdAt: text('created_at'),
});
export const regrasCategorizacao = sqliteTable('regras_categorizacao', {
  id: text('id').primaryKey(),
  padrao: text('padrao').notNull(),
  categoria: text('categoria').notNull(),
  subcategoria: text('subcategoria'),
  centroCustoId: text('centro_custo_id'),
  createdAt: text('created_at'),
});
export const patrimonio = sqliteTable('patrimonio', {
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
  createdAt: text('created_at'),
});
export const planosPagamento = sqliteTable('planos_pagamento', {
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
  mostrarDashboard: integer('mostrar_dashboard', { mode: 'boolean' }).default(true),
  createdAt: text('created_at'),
});
export const garageRefills = sqliteTable('garage_refills', {
  id: text('id').primaryKey(),
  data: text('data').notNull(),
  quantidadeLitros: real('quantidade_litros').notNull(),
  valorTotal: real('valor_total').notNull(),
  precoPorLitro: real('preco_por_litro').notNull(),
  createdAt: text('created_at'),
});

export const planoContas = sqliteTable('plano_contas', {
  id: text('id').primaryKey(),
  codigo: text('codigo').notNull(),
  nome: text('nome').notNull(),
  tipo: text('tipo').notNull(),
  createdAt: text('created_at'),
});

export const contasPagar = sqliteTable('contas_pagar', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  date: text('date').notNull(),
  checked: integer('checked', { mode: 'boolean' }).notNull().default(false),
  sender: text('sender'),
});

export const gmailTokens = sqliteTable('gmail_tokens', {
  email: text('email').primaryKey(),
  refreshToken: text('refresh_token'),
  accessToken: text('access_token'),
  expiresAt: integer('expires_at'),
});

export const gmailFilters = sqliteTable('gmail_filters', {
  id: text('id').primaryKey(),
  type: text('type').notNull(),
  value: text('value').notNull(),
});

export const gmailAliases = sqliteTable('gmail_aliases', {
  id: text('id').primaryKey(),
  sender: text('sender').notNull(),
  alias: text('alias').notNull(),
});

export const gmailHidden = sqliteTable('gmail_hidden', {
  id: text('id').primaryKey(),
  messageId: text('message_id').notNull(),
});

export const clientes = sqliteTable('clientes', {
  id: text('id').primaryKey(),
  tipo: text('tipo').notNull(),
  nome: text('nome').notNull(),
  documento: text('documento').notNull(),
  telefone: text('telefone').notNull(),
  email: text('email'),
  endereco: text('endereco'),
  observacao: text('observacao'),
  createdAt: text('created_at'),
});

export const folhaPagamento = sqliteTable('folha_pagamento', {
  id: text('id').primaryKey(),
  competencia: text('competencia').notNull(),
  funcionarioData: text('funcionario_data').notNull(),
  createdAt: text('created_at'),
});

export const ctrExpiradas = sqliteTable('ctr_expiradas', {
  id: text('id').primaryKey(),
  ctrNumero: text('ctr_numero').notNull(),
  cacamba: text('cacamba'),
  clienteNome: text('cliente_nome'),
  clienteCpfCnpj: text('cliente_cpf_cnpj'),
  endereco: text('endereco'),
  bairro: text('bairro'),
  cidade: text('cidade'),
  novoCtrNumero: text('novo_ctr_numero'),
  status: text('status').default('buscando'),
  mensagem: text('mensagem'),
  placa: text('placa'),
  tentativas: integer('tentativas').default(0),
  dataEnvio: text('data_envio'),
  dataRetirada: text('data_retirada'),
  dataDestinoFinal: text('data_destino_final'),
  geradorRua: text('gerador_rua'),
  geradorNum: text('gerador_num'),
  geradorCep: text('gerador_cep'),
  criadoEm: text('criado_em'),
  atualizadoEm: text('atualizado_em'),
});
