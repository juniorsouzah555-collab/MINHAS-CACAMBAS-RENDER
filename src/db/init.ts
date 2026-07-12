import { libsqlClient } from './index.ts';

const CREATE_TABLES = [
  `CREATE TABLE IF NOT EXISTS bota_foras (id TEXT PRIMARY KEY, nome TEXT NOT NULL, cnpj TEXT NOT NULL, telefone TEXT NOT NULL, endereco TEXT NOT NULL, valor_padrao_descarte REAL, created_at TEXT)`,
  `CREATE TABLE IF NOT EXISTS lancamentos (id TEXT PRIMARY KEY, bota_fora_id TEXT NOT NULL, bota_fora_nome TEXT NOT NULL, quantidade_cacambas INTEGER NOT NULL, valor REAL NOT NULL, data TEXT NOT NULL, driver_name TEXT, vehicle_id TEXT, status TEXT NOT NULL, created_at TEXT, lat REAL, lng REAL, observacao TEXT, pago INTEGER DEFAULT 0, valor_pago REAL, data_pagamento TEXT, source TEXT)`,
  `CREATE TABLE IF NOT EXISTS vehicles (id TEXT PRIMARY KEY, status TEXT NOT NULL, efficiency REAL NOT NULL, fuel_used REAL NOT NULL, cost_per_km REAL NOT NULL, driver TEXT NOT NULL, trend TEXT, last_maintenance_date TEXT, speed INTEGER, lat REAL NOT NULL, lng REAL NOT NULL, is_active INTEGER DEFAULT 1 NOT NULL, type TEXT, initial_km INTEGER)`,
  `CREATE TABLE IF NOT EXISTS fuel_logs (id TEXT PRIMARY KEY, vehicle_id TEXT NOT NULL, quantidade_litros REAL NOT NULL, km_inicial INTEGER, km_final INTEGER, valor_pago REAL NOT NULL, data TEXT NOT NULL, driver TEXT, media_km_l REAL, tipo TEXT, is_retirada_diversa INTEGER DEFAULT 0, lat REAL, lng REAL, observacao TEXT, foto_nota TEXT)`,
  `CREATE TABLE IF NOT EXISTS maintenance_alerts (id TEXT PRIMARY KEY, vehicle_id TEXT NOT NULL, title TEXT NOT NULL, message TEXT NOT NULL, time_ago TEXT NOT NULL, severity TEXT NOT NULL, type TEXT NOT NULL, resolved INTEGER DEFAULT 0 NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS invoices (id TEXT PRIMARY KEY, client_name TEXT NOT NULL, entity_code TEXT NOT NULL, service_desc TEXT NOT NULL, issue_date TEXT NOT NULL, due_date TEXT NOT NULL, amount REAL NOT NULL, status TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS dispatches (id TEXT PRIMARY KEY, vehicle_id TEXT NOT NULL, driver_name TEXT NOT NULL, client_name TEXT NOT NULL, origin TEXT NOT NULL, destination TEXT NOT NULL, payload_type TEXT NOT NULL, weight REAL NOT NULL, status TEXT NOT NULL, created_at TEXT)`,
  `CREATE TABLE IF NOT EXISTS motoristas (id INTEGER PRIMARY KEY AUTOINCREMENT, nome TEXT NOT NULL, created_at TEXT)`,
  `CREATE TABLE IF NOT EXISTS comissoes (id TEXT PRIMARY KEY, motorista TEXT NOT NULL, vazias_colocadas INTEGER, retiradas INTEGER, data TEXT NOT NULL, created_at TEXT)`,
  `CREATE TABLE IF NOT EXISTS manutencoes (id TEXT PRIMARY KEY, vehicle_id TEXT NOT NULL, tipo TEXT NOT NULL, descricao TEXT NOT NULL, data TEXT NOT NULL, km_atual INTEGER, proximo_km INTEGER, custo REAL NOT NULL, valor_mao_de_obra REAL DEFAULT 0, valor_peca REAL DEFAULT 0, local TEXT DEFAULT 'Oficina', oficina TEXT NOT NULL, observacao TEXT, status TEXT NOT NULL, created_at TEXT)`,
  `CREATE TABLE IF NOT EXISTS user_approvals (id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT NOT NULL UNIQUE, name TEXT, role TEXT DEFAULT 'Operador de Frota', status TEXT DEFAULT 'Ativo', linked_driver TEXT, created_at TEXT)`,
  `CREATE TABLE IF NOT EXISTS grupos_conta (id TEXT PRIMARY KEY, nome TEXT NOT NULL, tipo TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS categorias_conta (id TEXT PRIMARY KEY, grupo_id TEXT NOT NULL, nome TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS subcategorias_conta (id TEXT PRIMARY KEY, categoria_id TEXT NOT NULL, nome TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS importacoes_extrato (id TEXT PRIMARY KEY, nome_arquivo TEXT NOT NULL, banco TEXT NOT NULL, data_inicio TEXT NOT NULL, data_fim TEXT NOT NULL, total_linhas INTEGER NOT NULL DEFAULT 0, categorizadas INTEGER NOT NULL DEFAULT 0, pendentes INTEGER NOT NULL DEFAULT 0, status TEXT NOT NULL DEFAULT 'PROCESSANDO', created_at TEXT)`,
  `CREATE TABLE IF NOT EXISTS extrato_transacoes (id TEXT PRIMARY KEY, data TEXT NOT NULL, descricao TEXT NOT NULL, valor REAL NOT NULL, tipo TEXT NOT NULL, saldo REAL, categoria TEXT, subcategoria TEXT, centro_custo_id TEXT, status TEXT NOT NULL DEFAULT 'PENDENTE', importacao_id TEXT NOT NULL, observacao TEXT, created_at TEXT)`,
  `CREATE TABLE IF NOT EXISTS centros_custo (id TEXT PRIMARY KEY, nome TEXT NOT NULL, codigo TEXT NOT NULL, descricao TEXT, ativo INTEGER DEFAULT 1 NOT NULL, created_at TEXT)`,
  `CREATE TABLE IF NOT EXISTS conciliacoes (id TEXT PRIMARY KEY, transacao_id TEXT NOT NULL, lancamento_id TEXT, data TEXT NOT NULL, valor REAL NOT NULL, status TEXT NOT NULL DEFAULT 'PENDENTE', observacao TEXT, created_at TEXT)`,
  `CREATE TABLE IF NOT EXISTS regras_categorizacao (id TEXT PRIMARY KEY, padrao TEXT NOT NULL, categoria TEXT NOT NULL, subcategoria TEXT, centro_custo_id TEXT, created_at TEXT)`,
  `CREATE TABLE IF NOT EXISTS patrimonio (id TEXT PRIMARY KEY, nome TEXT NOT NULL, tipo TEXT NOT NULL, data_aquisicao TEXT NOT NULL, valor_aquisicao REAL NOT NULL, valor_residual REAL NOT NULL DEFAULT 0, vida_util INTEGER NOT NULL DEFAULT 5, depreciacao_anual REAL NOT NULL DEFAULT 0, depreciacao_acumulada REAL NOT NULL DEFAULT 0, valor_contabil REAL NOT NULL DEFAULT 0, localizacao TEXT, observacao TEXT, created_at TEXT)`,
  `CREATE TABLE IF NOT EXISTS planos_pagamento (id TEXT PRIMARY KEY, descricao TEXT NOT NULL, instituicao TEXT, valor_total REAL NOT NULL, numero_parcelas INTEGER NOT NULL DEFAULT 1, parcelas_pagas INTEGER NOT NULL DEFAULT 0, valor_parcela REAL NOT NULL DEFAULT 0, data_inicio TEXT NOT NULL, data_fim TEXT, categoria TEXT, subcategoria TEXT, status TEXT NOT NULL DEFAULT 'ATIVO', mostrar_dashboard INTEGER DEFAULT 1, created_at TEXT)`,
  `CREATE TABLE IF NOT EXISTS clientes (id TEXT PRIMARY KEY, tipo TEXT NOT NULL, nome TEXT NOT NULL, documento TEXT NOT NULL, telefone TEXT NOT NULL, email TEXT, endereco TEXT, observacao TEXT, created_at TEXT)`,
  `CREATE TABLE IF NOT EXISTS garage_refills (id TEXT PRIMARY KEY, data TEXT NOT NULL, quantidade_litros REAL NOT NULL, valor_total REAL NOT NULL, preco_por_litro REAL NOT NULL, created_at TEXT)`,
  `CREATE TABLE IF NOT EXISTS plano_contas (id TEXT PRIMARY KEY, codigo TEXT NOT NULL, nome TEXT NOT NULL, tipo TEXT NOT NULL, created_at TEXT)`,
  `CREATE TABLE IF NOT EXISTS contas_pagar (id TEXT PRIMARY KEY, name TEXT NOT NULL, date TEXT NOT NULL, checked INTEGER NOT NULL DEFAULT 0, sender TEXT)`,
  `CREATE TABLE IF NOT EXISTS gmail_tokens (email TEXT PRIMARY KEY, refresh_token TEXT, access_token TEXT, expires_at INTEGER)`,
  `CREATE TABLE IF NOT EXISTS gmail_filters (id TEXT PRIMARY KEY, type TEXT NOT NULL, value TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS gmail_aliases (id TEXT PRIMARY KEY, sender TEXT NOT NULL, alias TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS gmail_hidden (id TEXT PRIMARY KEY, message_id TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS folha_pagamento (id TEXT PRIMARY KEY, competencia TEXT NOT NULL, funcionario_data TEXT NOT NULL, created_at TEXT)`,
];

const MIGRATIONS = [
  `ALTER TABLE manutencoes ADD COLUMN local TEXT DEFAULT 'Oficina'`,
  `ALTER TABLE manutencoes ADD COLUMN valor_mao_de_obra REAL DEFAULT 0`,
  `ALTER TABLE manutencoes ADD COLUMN valor_peca REAL DEFAULT 0`,
  `ALTER TABLE lancamentos ADD COLUMN source TEXT`,
];

async function deduplicateFolhaPagamento() {
  try {
    const all = await libsqlClient.execute('SELECT id, competencia, funcionario_data, created_at FROM folha_pagamento ORDER BY competencia, created_at DESC');
    const seen = new Map<string, boolean>();
    for (const row of all.rows) {
      const key = `${row.competencia}|${row.funcionario_data}`;
      if (seen.has(key)) {
        await libsqlClient.execute({ sql: 'DELETE FROM folha_pagamento WHERE id = ?', args: [row.id as string] });
      } else {
        seen.set(key, true);
      }
    }
  } catch {}
}

export async function initDatabase() {
  for (const sql of CREATE_TABLES) {
    await libsqlClient.execute(sql);
  }
  for (const sql of MIGRATIONS) {
    try {
      await libsqlClient.execute(sql);
    } catch {
      // Column already exists — safe to ignore
    }
  }
  await deduplicateFolhaPagamento();
}
