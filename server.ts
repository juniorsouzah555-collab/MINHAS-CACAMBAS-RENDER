import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import express from "express";
import Groq from 'groq-sdk';
import path from "path";
import jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';
import { createServer as createViteServer } from "vite";
import { db, libsqlClient, initializeDatabase } from './src/db/index.ts';
import { initDatabase } from './src/db/init.ts';
import { eq, count } from 'drizzle-orm';
import * as schema from './src/db/schema.ts';
import { INITIAL_VEHICLES, INITIAL_FUEL_LOGS, INITIAL_ALERTS, INITIAL_INVOICES, INITIAL_DISPATCHES, INITIAL_BOTA_FORAS, INITIAL_LANCAMENTOS } from './src/mockData.ts';

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

const JWT_SECRET = process.env.JWT_SECRET || 'relampago-jwt-secret-dev';
const APP_PASSWORD = process.env.APP_PASSWORD || 'admin123';
const DRIVER_PASSWORD = process.env.DRIVER_PASSWORD || 'parceiro123';
const VALID_CREDENTIALS = [APP_PASSWORD, DRIVER_PASSWORD, '12345678'];

app.use(express.json({ limit: '10mb' }));

function authMiddleware(req: express.Request, res: express.Response, next: express.NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token required' });
  }
  try {
    const token = authHeader.split(' ')[1];
    jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", database: "sqlite" });
});

app.post("/api/auth/login", (req, res) => {
  const { password } = req.body;
  if (!password) return res.status(400).json({ error: 'Password required' });
  if (!VALID_CREDENTIALS.includes(password)) return res.status(401).json({ error: 'Invalid password' });
  const token = jwt.sign({ authenticated: true, time: Date.now() }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ token });
});

app.get("/api/auth/check", (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return res.json({ valid: false });
  try {
    jwt.verify(authHeader.split(' ')[1], JWT_SECRET);
    res.json({ valid: true });
  } catch {
    res.json({ valid: false });
  }
});

async function seedDatabaseIfEmpty() {
  try {
    const lanCount = await db.select({ value: count() }).from(schema.lancamentos);
    const vehCount = await db.select({ value: count() }).from(schema.vehicles);
    const alreadySeeded = (lanCount[0]?.value ?? 0) > 0 || (vehCount[0]?.value ?? 0) > 0;
    if (alreadySeeded) return;
    console.log("Seeding initial fleet data...");
    for (const vehicle of INITIAL_VEHICLES) {
      await db.insert(schema.vehicles).values({
        id: vehicle.id, status: vehicle.status, efficiency: vehicle.efficiency,
        fuelUsed: vehicle.fuelUsed, costPerKm: vehicle.costPerKm, driver: vehicle.driver,
        trend: JSON.stringify(vehicle.trend), lastMaintenanceDate: vehicle.lastMaintenanceDate || null,
        speed: vehicle.speed || 0, lat: vehicle.lat, lng: vehicle.lng,
        isActive: vehicle.isActive, type: vehicle.type || 'Caminhão', initialKm: vehicle.initialKm || null,
      })
    }
    for (const bf of INITIAL_BOTA_FORAS) {
      await db.insert(schema.botaForas).values({
        id: bf.id, nome: bf.nome, cnpj: bf.cnpj, telefone: bf.telefone,
        endereco: bf.endereco, valorPadraoDescarte: bf.valorPadraoDescarte || null,
      })
    }
    for (const lan of INITIAL_LANCAMENTOS) {
      await db.insert(schema.lancamentos).values({
        id: lan.id, botaForaId: lan.botaForaId, botaForaNome: lan.botaForaNome,
        quantidadeCacambas: lan.quantidadeCacambas, valor: lan.valor, data: lan.data,
        driverName: lan.driverName || null, vehicleId: lan.vehicleId || null, status: lan.status,
      })
    }
    for (const fuel of INITIAL_FUEL_LOGS) {
      await db.insert(schema.fuelLogs).values({
        id: fuel.id, vehicleId: fuel.vehicleId, quantidadeLitros: fuel.quantidadeLitros,
        kmInicial: fuel.kmInicial || null, kmFinal: fuel.kmFinal || null, valorPago: fuel.valorPago,
        data: fuel.data, driver: fuel.driver || null, mediaKmL: fuel.mediaKmL || null,
        tipo: fuel.tipo || 'POSTO', isRetiradaDiversa: fuel.isRetiradaDiversa || false,
      })
    }
    for (const inv of INITIAL_INVOICES) {
      await db.insert(schema.invoices).values({
        id: inv.id, clientName: inv.clientName, entityCode: inv.entityCode,
        serviceDesc: inv.serviceDesc, issueDate: inv.issueDate, dueDate: inv.dueDate,
        amount: inv.amount, status: inv.status,
      })
    }
    for (const disp of INITIAL_DISPATCHES) {
      await db.insert(schema.dispatches).values({
        id: disp.id, vehicleId: disp.vehicleId, driverName: disp.driverName,
        clientName: disp.clientName, origin: disp.origin, destination: disp.destination,
        payloadType: disp.payloadType, weight: disp.weight, status: disp.status,
      })
    }
    for (const alert of INITIAL_ALERTS) {
      await db.insert(schema.maintenanceAlerts).values({
        id: alert.id, vehicleId: alert.vehicleId, title: alert.title, message: alert.message,
        timeAgo: alert.timeAgo, severity: alert.severity, type: alert.type, resolved: alert.resolved,
      })
    }
    console.log("Database seeded successfully!");
  } catch (error) {
    console.error("Failed to seed database:", error);
  }
}

function normalizeBody(body: any): any {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return body;
  const result: any = {};
  for (const key of Object.keys(body)) {
    const camelKey = key.replace(/_([a-z])/g, (_: string, c: string) => c.toUpperCase());
    const value = (body as any)[key];
    result[camelKey] = Array.isArray(value) ? JSON.stringify(value) : value;
  }
  return result;
}

function crud(tableName: string, drizzleTable: any) {
  const basePath = `/api/${tableName}`;

  app.get(basePath, authMiddleware, async (req, res) => {
    try { res.json(await db.select().from(drizzleTable)); }
    catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.post(basePath, authMiddleware, async (req, res) => {
    try {
      await db.insert(drizzleTable).values(normalizeBody(req.body))
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.put(`${basePath}/:id`, authMiddleware, async (req, res) => {
    try {
      await db.update(drizzleTable).set(normalizeBody(req.body)).where(eq(drizzleTable.id, req.params.id));
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.delete(`${basePath}/:id`, authMiddleware, async (req, res) => {
    try {
      await db.delete(drizzleTable).where(eq(drizzleTable.id, req.params.id));
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
}

crud('vehicles', schema.vehicles);
crud('botaforas', schema.botaForas);
crud('bota_foras', schema.botaForas);
crud('lancamentos', schema.lancamentos);
crud('fuel-logs', schema.fuelLogs);
crud('fuel_logs', schema.fuelLogs);
crud('alerts', schema.maintenanceAlerts);
crud('maintenance_alerts', schema.maintenanceAlerts);
crud('invoices', schema.invoices);
crud('dispatches', schema.dispatches);
crud('motoristas', schema.motoristas);
crud('comissoes', schema.comissoes);
crud('manutencoes', schema.manutencoes);
crud('garage-refills', schema.garageRefills);
crud('garage_refills', schema.garageRefills);
crud('plano-contas', schema.planoContas);
crud('plano_contas', schema.planoContas);
crud('grupos-conta', schema.gruposConta);
crud('grupos_conta', schema.gruposConta);
crud('categorias-conta', schema.categoriasConta);
crud('categorias_conta', schema.categoriasConta);
crud('subcategorias-conta', schema.subcategoriasConta);
crud('subcategorias_conta', schema.subcategoriasConta);
crud('importacoes-extrato', schema.importacoesExtrato);
crud('importacoes_extrato', schema.importacoesExtrato);
crud('extrato-transacoes', schema.extratoTransacoes);
crud('extrato_transacoes', schema.extratoTransacoes);
crud('centros-custo', schema.centrosCusto);
crud('centros_custo', schema.centrosCusto);
crud('conciliacoes', schema.conciliacoes);
crud('regras-categorizacao', schema.regrasCategorizacao);
crud('contas_pagar', schema.contasPagar);
crud('patrimonio', schema.patrimonio);
crud('planos-pagamento', schema.planosPagamento);
crud('planos_pagamento', schema.planosPagamento);
crud('clientes', schema.clientes);
crud('user-approvals', schema.userApprovals);
crud('folha_pagamento', schema.folhaPagamento);

app.get("/api/vehicles/map", authMiddleware, async (req, res) => {
  try {
    const list = await db.select().from(schema.vehicles);
    const parsed = list.map(v => ({ ...v, trend: v.trend ? JSON.parse(v.trend) : [] }));
    res.json(parsed);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

const KEYWORD_RULES: { words: string[]; categoria: string; subcategoria?: string; centroCusto?: string }[] = [
  { words: ['pix recebido', 'recebimento pix', 'pix-recebido', 'retorno pix', 'entrada pix'], categoria: 'Recebimentos PIX', subcategoria: 'PIX Recebido', centroCusto: 'Operacional' },
  { words: ['transferencia recebida', 'ted recebido', 'doc recebido', 'credito em conta', 'deposito recebido', 'deposito'], categoria: 'Transferencias Recebidas', centroCusto: 'Operacional' },
  { words: ['locacao cacamba', 'aluguel cacamba', 'cacamba', 'loca cacamba'], categoria: 'Servicos de Cacambas', centroCusto: 'Operacional' },
  { words: ['diesel', 'combustivel diesel', 'oleo diesel'], categoria: 'Combustivel', subcategoria: 'Diesel S10', centroCusto: 'Frota' },
  { words: ['gasolina', 'etanol', 'alcool', 'aditivado'], categoria: 'Combustivel', subcategoria: 'Gasolina', centroCusto: 'Frota' },
  { words: ['abastec', 'posto shell', 'posto ipiranga', 'posto br', 'combustivel'], categoria: 'Combustivel', centroCusto: 'Frota' },
  { words: ['troca oleo', 'troca de oleo'], categoria: 'Manutencao de Frota', subcategoria: 'Troca de Oleo', centroCusto: 'Frota' },
  { words: ['pneu', 'pneus', 'borracharia'], categoria: 'Manutencao de Frota', subcategoria: 'Pneus', centroCusto: 'Frota' },
  { words: ['alinhamento', 'balanceamento', 'suspensao'], categoria: 'Manutencao de Frota', subcategoria: 'Suspensao', centroCusto: 'Frota' },
  { words: ['manutencao', 'oficina', 'mecanico', 'peca', 'reparo', 'revisao', 'guincho'], categoria: 'Manutencao de Frota', centroCusto: 'Frota' },
  { words: ['seguro', 'seguradora', 'sulfran'], categoria: 'Seguro Veicular', centroCusto: 'Frota' },
  { words: ['ipva', 'licenciamento', 'detran', 'emplacamento', 'renavam'], categoria: 'IPVA e Licenciamento', centroCusto: 'Frota' },
  { words: ['pedagio', 'sem parar', 'conectcar', 'tag'], categoria: 'Pedagios', centroCusto: 'Frota' },
  { words: ['salario', 'salario base', 'folha', 'proventos', 'holerite'], categoria: 'Salarios e Encargos', subcategoria: 'Salario Base', centroCusto: 'Administrativo' },
  { words: ['pro labore', 'prolabore'], categoria: 'Salarios e Encargos', centroCusto: 'Administrativo' },
  { words: ['fgts'], categoria: 'FGTS', centroCusto: 'Administrativo' },
  { words: ['inss'], categoria: 'Salarios e Encargos', subcategoria: 'INSS', centroCusto: 'Administrativo' },
  { words: ['aluguel', 'locacao imovel'], categoria: 'Aluguel', centroCusto: 'Administrativo' },
  { words: ['conta luz', 'energia', 'copel', 'conta agua', 'sanepar', 'concessionaria'], categoria: 'Agua, Luz e Telefone', centroCusto: 'Administrativo' },
  { words: ['telefone', 'celular', 'oi fibra', 'vivo', 'claro'], categoria: 'Agua, Luz e Telefone', centroCusto: 'Administrativo' },
  { words: ['internet', 'sistema', 'software', 'hospedagem', 'dominio', 'saas'], categoria: 'Internet e TI', centroCusto: 'Administrativo' },
  { words: ['escritorio', 'material', 'papelaria', 'impressao'], categoria: 'Material de Escritorio', centroCusto: 'Administrativo' },
  { words: ['marketing', 'publicidade', 'anuncio', 'google ads', 'facebook', 'instagram', 'divulgacao'], categoria: 'Marketing', centroCusto: 'Vendas' },
  { words: ['simples nacional', 'das'], categoria: 'Simples Nacional', centroCusto: 'Administrativo' },
  { words: ['iss', 'issqn'], categoria: 'ISS', centroCusto: 'Administrativo' },
  { words: ['recebimento', 'pagamento cliente', 'servico prestado'], categoria: 'Servicos de Cacambas', centroCusto: 'Operacional' },
  { words: ['descarte', 'aterra', 'residuo', 'entulho'], categoria: 'Descarte e Aterro', centroCusto: 'Operacional' },
  { words: ['tarifa', 'cesta servicos', 'taxa bancaria', 'taxa de manutencao', 'manutencao da conta'], categoria: 'Tarifas Bancarias', subcategoria: 'Taxa de Manutencao', centroCusto: 'Administrativo' },
  { words: ['pix enviado', 'pix transferido', 'transferencia enviada', 'ted enviado', 'doc enviado', 'pagto', 'pagamento'], categoria: 'Transferencias Enviadas', subcategoria: 'Pix', centroCusto: 'Administrativo' },
  { words: ['pix', 'ted', 'doc', 'transferencia', 'saque'], categoria: 'Transferencias Enviadas', subcategoria: 'Pix', centroCusto: 'Administrativo' },
  { words: ['boleto', 'pagamento de boleto'], categoria: 'Tarifas Bancarias', subcategoria: 'Boleto', centroCusto: 'Administrativo' },
  { words: ['maquininha', 'cielo', 'rede', 'getnet', 'ton'], categoria: 'Tarifas Bancarias', centroCusto: 'Administrativo' },
  { words: ['juros', 'multa atraso', 'encargos'], categoria: 'Juros e Multas', centroCusto: 'Administrativo' },
  { words: ['cartao credito', 'fatura cartao', 'nubank', 'elo'], categoria: 'Cartao de Credito', subcategoria: 'Compra', centroCusto: 'Administrativo' },
  { words: ['restaurante', 'lanchonete', 'padaria'], categoria: 'Alimentacao', subcategoria: 'Restaurante', centroCusto: 'Administrativo' },
  { words: ['mercado', 'supermercado', 'acougue'], categoria: 'Alimentacao', subcategoria: 'Supermercado', centroCusto: 'Administrativo' },
  { words: ['ifood', 'delivery', 'rappi'], categoria: 'Alimentacao', subcategoria: 'Delivery', centroCusto: 'Administrativo' },
  { words: ['farmacia', 'remedio', 'medicamento', 'consulta medica', 'dentista'], categoria: 'Saude', centroCusto: 'Administrativo' },
  { words: ['contabilidade', 'contador', 'nota fiscal'], categoria: 'Comissoes', centroCusto: 'Administrativo' },
];

function localCategorize(descricao: string): { categoria: string; subcategoria: string | null; centroCusto: string | null } {
  const lower = (descricao || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  for (const rule of KEYWORD_RULES) {
    for (const word of rule.words) {
      if (lower.includes(word)) {
        return { categoria: rule.categoria, subcategoria: rule.subcategoria || null, centroCusto: rule.centroCusto || null };
      }
    }
  }
  return { categoria: 'PENDENTE', subcategoria: null, centroCusto: null };
}

app.post('/api/bancario/categorize', authMiddleware, async (req, res) => {
  const { transacoes, categorias: catsList, subcategorias: subsList, centrosCusto: ccsList } = req.body;
  if (!transacoes || !Array.isArray(transacoes) || transacoes.length === 0) {
    return res.status(400).json({ error: 'transacoes array is required' });
  }

  const validCats = new Set((catsList || []).map((s: string) => s));
  const validSubs = new Set((subsList || []).map((s: string) => s));
  const validCCs = new Set((ccsList || []).map((s: string) => s));

  const groqKey = process.env.GROQ_API_KEY;
  if (groqKey) {
    try {
      const groq = new Groq({ apiKey: groqKey });
      const catsStr = (catsList || []).join(', ') || 'N/A';
      const subsStr = (subsList || []).join(', ') || 'N/A';
      const ccsStr = (ccsList || []).join(', ') || 'N/A';
      const batch = transacoes.map((t: any) => `- ID:${t.id} | "${t.descricao}" | R$${t.valor} | tipo:${t.tipo}`).join('\n');
      const systemPrompt = `Voce e um classificador financeiro para uma empresa de cacambas em Diadema/SP.

Categorias disponiveis (USE EXATAMENTE, sem alterar): ${catsStr}
Subcategorias disponiveis (USE EXATAMENTE ou null): ${subsStr}
Centros de custo (USE EXATAMENTE ou null): ${ccsStr}

=== REGRA MAIS IMPORTANTE: O CAMPO tipo DEFINE SE E SAIDA OU ENTRADA ===
Se tipo = CREDITO = O DINHEIRO ESTA ENTRANDO NA CONTA (receita).
Se tipo = DEBITO = O DINHEIRO ESTA SAINDO DA CONTA (despesa).
NUNCA classifique um CREDITO como despesa. NUNCA classifique um DEBITO como receita.

Se tipo = CREDITO:
  - Se contem PIX, transferencia recebida, retorno, deposito → "Recebimentos PIX" s:"PIX Recebido" cc:"Operacional"
  - Se contem TED/DOC recebido → "Transferencias Recebidas" cc:"Operacional"
  - Se e prestacao de servico de cacamba → "Servicos de Cacambas" cc:"Operacional"

Se tipo = DEBITO:
  - Se contem PIX enviado, transferencia enviada, pagto, pagamento para pessoa/fornecedor → "Transferencias Enviadas" s:"Pix" cc:"Administrativo"
  - Diesel, gasolina, posto, abastecimento → "Combustivel" s:"Diesel S10" cc:"Frota"
  - Oficina, mecanico, pneu, oleo, pecas → "Manutencao de Frota" cc:"Frota"
  - Salario, prolabore, folha pagamento → "Salarios e Encargos" s:"Salario Base" cc:"Administrativo"
  - Aluguel, locacao imovel → "Aluguel" cc:"Administrativo"
  - Conta de luz, agua, telefone, energia, copel, saneamento → "Agua, Luz e Telefone" cc:"Administrativo"
  - Tarifa bancaria, cesta servicos, manutencao de conta → "Tarifas Bancarias" s:"Taxa de Manutencao" cc:"Administrativo"
  - Simples nacional, DAS → "Simples Nacional" cc:"Administrativo"
  - FGTS → "FGTS" cc:"Administrativo"
  - INSS → "Salarios e Encargos" s:"INSS" cc:"Administrativo"
  - Cacamba, aluguel cacamba, locacao cacamba → "Servicos de Cacambas" cc:"Operacional"
  - Descarte, entulho, aterro → "Descarte e Aterro" cc:"Operacional"
  - Seguro → "Seguro Veicular" cc:"Frota"
  - IPVA, licenciamento → "IPVA e Licenciamento" cc:"Frota"
  - Pedagio → "Pedagios" cc:"Frota"
  - Cartao de credito, fatura, nubank, inter → "Cartao de Credito" s:"Compra" cc:"Administrativo"
  - Marketing, publicidade → "Marketing" cc:"Vendas"
  - Farmacia, remedio → "Saude" cc:"Administrativo"
  - ISS → "ISS" cc:"Administrativo"
  - Boleto pago → "Tarifas Bancarias" s:"Boleto" cc:"Administrativo"
  - Juros, multa atraso, SPC → "Juros e Multas" cc:"Administrativo"
  - Emprestimo, parcela emprestimo → "Emprestimos" cc:"Administrativo"
  - Compra material, mercado, supermercado → "Alimentacao" cc:"Administrativo"

FORMATO DE RESPOSTA:
Responda SOMENTE um JSON array. Nada antes ou depois.
Cada objeto: {"id":"ID","c":"categoria","s":"subcategoria ou null","cc":"centro de custo ou null"}
Os valores DEVEM ser EXATAMENTE iguais a uma das opcoes listadas. Nao invente nomes.
Se nao tiver certeza, use c = "PENDENTE"`;
      const response = await groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Classifique estas transacoes:\n${batch}` }
        ],
        temperature: 0.1,
        max_tokens: 4096,
      });
      const rawText = response.choices?.[0]?.message?.content || '';
      if (rawText) {
        const cleaned = rawText.replace(/```json?\s*/g, '').replace(/```\s*/g, '').trim();
        const parsed = JSON.parse(cleaned);
        if (Array.isArray(parsed)) {
          const despesaCats = new Set(['Combustivel','Manutencao de Frota','Descarte e Aterro','Pedagios','Seguro Veicular','IPVA e Licenciamento','Salarios e Encargos','Aluguel','Agua, Luz e Telefone','Internet e TI','Material de Escritorio','Marketing','Alimentacao','Saude','Comissoes','Tarifas Bancarias','Juros e Multas','Emprestimos','Cartao de Credito','Transferencias Enviadas','Simples Nacional','ISS','FGTS']);
          const receitaCats = new Set(['Recebimentos PIX','Transferencias Recebidas','Servicos de Cacambas']);
          const results: any[] = [];
          for (const t of transacoes) {
            const ai = parsed.find((p: any) => p.id === t.id);
            if (ai && ai.c && ai.c !== 'PENDENTE' && validCats.has(ai.c)) {
              let cat = ai.c;
              let sub = ai.s && validSubs.has(ai.s) ? ai.s : null;
              let cc = ai.cc && validCCs.has(ai.cc) ? ai.cc : null;
              if (t.tipo === 'CREDITO' && despesaCats.has(cat)) {
                cat = 'Recebimentos PIX';
                sub = 'PIX Recebido';
                cc = 'Operacional';
              } else if (t.tipo === 'DEBITO' && receitaCats.has(cat) && cat !== 'Servicos de Cacambas') {
                cat = 'Transferencias Enviadas';
                sub = 'Pix';
                cc = 'Administrativo';
              }
              results.push({ id: t.id, categoria: cat, subcategoria: sub, centroCusto: cc });
            } else {
              const local = localCategorize(t.descricao);
              results.push({ id: t.id, ...local });
            }
          }
          return res.json({ results });
        }
      }
    } catch (e) { console.error('[GROQ] error:', (e as any)?.message || e); }
  }

  const results = transacoes.map((t: any) => {
    return { id: t.id, ...localCategorize(t.descricao) };
  });
  res.json({ results });
});

// ---- GMAIL INTEGRATION (ported from api/gmail.ts, Firestore -> Turso) ----

const GMAIL_CLIENT_ID = process.env.GMAIL_CLIENT_ID || '';
const GMAIL_CLIENT_SECRET = process.env.GMAIL_CLIENT_SECRET || '';

function gmailRedirectUri(req: express.Request): string {
  const host = req.get('host') || 'localhost:3000';
  const proto = req.headers['x-forwarded-proto'] || 'http';
  return `${proto}://${host}/api/gmail?action=callback`;
}

async function getGmailToken(email: string): Promise<any | null> {
  try {
    const r = await libsqlClient.execute({ sql: 'SELECT * FROM gmail_tokens WHERE email = ?', args: [email] });
    return r.rows[0] || null;
  } catch { return null; }
}

async function upsertGmailToken(email: string, refreshToken: string, accessToken: string, expiresAt: number) {
  try {
    await libsqlClient.execute({
      sql: 'INSERT OR REPLACE INTO gmail_tokens (email, refresh_token, access_token, expires_at) VALUES (?, ?, ?, ?)',
      args: [email, refreshToken, accessToken, expiresAt],
    });
  } catch {}
}

async function deleteGmailToken(email: string) {
  try { await libsqlClient.execute({ sql: 'DELETE FROM gmail_tokens WHERE email = ?', args: [email] }); } catch {}
}

async function getFirstGmailEmail(): Promise<string | null> {
  try {
    const r = await libsqlClient.execute('SELECT email FROM gmail_tokens LIMIT 1');
    return (r.rows[0]?.email as string) || null;
  } catch { return null; }
}

async function refreshGmailAccessToken(refreshToken: string): Promise<{ accessToken: string; expiresAt: number } | null> {
  try {
    const r = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ client_id: GMAIL_CLIENT_ID, client_secret: GMAIL_CLIENT_SECRET, refresh_token: refreshToken, grant_type: 'refresh_token' }),
    });
    if (!r.ok) return null;
    const data = await r.json();
    return { accessToken: data.access_token, expiresAt: Date.now() + data.expires_in * 1000 };
  } catch { return null; }
}

async function getGmailAccessToken(): Promise<{ token: string; email: string } | null> {
  const email = await getFirstGmailEmail();
  if (!email) return null;
  const stored = await getGmailToken(email);
  if (!stored) return null;
  let accessToken = stored.access_token as string;
  const expiresAt = stored.expires_at as number;
  if (!accessToken || !expiresAt || expiresAt < Date.now()) {
    const refreshToken = stored.refresh_token as string;
    if (!refreshToken) return null;
    const refreshed = await refreshGmailAccessToken(refreshToken);
    if (!refreshed) return null;
    accessToken = refreshed.accessToken;
    await upsertGmailToken(email, refreshToken, refreshed.accessToken, refreshed.expiresAt);
  }
  return { token: accessToken, email };
}

async function getGmailFilters() {
  try {
    const r = await libsqlClient.execute("SELECT * FROM gmail_filters WHERE type != 'provider'");
    return r.rows;
  } catch { return []; }
}

async function getGmailProviders(): Promise<{ id: string; sender: string; password: string }[]> {
  try {
    const r = await libsqlClient.execute("SELECT * FROM gmail_filters WHERE type = 'provider'");
    return r.rows.map((row: any) => {
      try { return { id: row.id, ...JSON.parse(row.value) }; } catch { return null; }
    }).filter(Boolean);
  } catch { return []; }
}

async function getGmailAliases() {
  try { const r = await libsqlClient.execute('SELECT * FROM gmail_aliases'); return r.rows; } catch { return []; }
}

async function getGmailHiddenIds(): Promise<Set<string>> {
  try {
    const r = await libsqlClient.execute('SELECT message_id FROM gmail_hidden');
    return new Set(r.rows.map((x: any) => x.message_id));
  } catch { return new Set(); }
}

function resolveAlias(from: string, aliases: any[]): string | undefined {
  const lower = from.toLowerCase();
  const emailMatch = aliases.find((a: any) => lower.includes((a.sender || '').toLowerCase()));
  if (emailMatch) return emailMatch.alias;
  const domain = from.match(/@([\w-]+\.\w+)/)?.[1]?.toLowerCase();
  if (domain) {
    const domainMatch = aliases.find((a: any) => domain.includes((a.sender || '').toLowerCase()) || (a.sender || '').toLowerCase().includes(domain));
    if (domainMatch) return domainMatch.alias;
  }
  return undefined;
}

function gmailFindAttachment(part: any): any {
  if (!part) return null;
  if (part.filename && part.filename.length > 0 && (part.mimeType === 'application/pdf' || part.filename?.toLowerCase().includes('boleto'))) return part;
  if (part.parts) { for (const p of part.parts) { const found = gmailFindAttachment(p); if (found) return found; } }
  return null;
}

function gmailDecodeBody(part: any): string[] {
  const texts: string[] = [];
  if (!part) return texts;
  if (part.body?.data && (part.mimeType === 'text/html' || part.mimeType === 'text/plain')) {
    try { texts.push(Buffer.from(part.body.data, 'base64').toString('utf-8')); } catch {}
  }
  if (part.parts) { for (const p of part.parts) { texts.push(...gmailDecodeBody(p)); } }
  return texts;
}

function gmailExtractBoletoLink(bodies: string[]): string | null {
  const allUrls: string[] = [];
  const urlRegex = /https?:\/\/[^\s"<>']+/gi;
  for (const body of bodies) { const matches = body.match(urlRegex); if (matches) allUrls.push(...matches); }
  const score = (url: string): number => {
    const u = url.toLowerCase(); let s = 0;
    if (/\.pdf\b/.test(u)) s += 100;
    if (/\b(?:boleto|fatura|cobranca)\b/.test(u)) s += 50;
    if (/\b(?:invoice|payment|pay|checkout)\b/.test(u)) s += 30;
    if (/asaas\.com\/[a-z]\/[a-z0-9]{16}/.test(u)) s += 80;
    if (/asaas\.com\/(?:cobranca|invoice|payment)/.test(u)) s += 60;
    if (/mercadopago/.test(u)) s += 40;
    if (/pagar\.me/.test(u)) s += 40;
    if (/\/(?:boleto|fatura|cobranca|2avia|2a-via|segunda-via)\b/.test(u)) s += 50;
    if (/resolvafacil/.test(u)) s += 80;
    if (/\?.*token=/.test(u)) s += 60;
    if (/\?.*uuid=/.test(u)) s += 50;
    if (/lellocondominios/.test(u) && /\/api\//.test(u)) s += 70;
    if (/customerLogo|logo|\.png|\.jpg|\.gif|\.css|favicon/i.test(u)) s -= 80;
    if (/unsubscribe|tracking|open\?/i.test(u)) s -= 60;
    if (/prevencao-fraude|prevencao[/-]fraude/i.test(u)) s -= 80;
    return s;
  };
  const scored = allUrls.map(u => ({ url: u, score: score(u) })).filter(x => x.score > 0);
  scored.sort((a, b) => b.score - a.score);
  let best = scored[0]?.url || null;
  if (best && (/resolvafacil/.test(best) || /lellocondominios/.test(best))) {
    try {
      let cleaned = best.replace(/&amp;/g, '&');
      const parsed = new URL(cleaned);
      const token = parsed.searchParams.get('token') || '';
      if (token && !parsed.searchParams.has('uuid') && token.split('.').length === 3) {
        try { const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString()); const uuid = payload.UUID || payload.uuid || ''; if (uuid) parsed.searchParams.set('uuid', uuid); } catch {}
      }
      if (!parsed.searchParams.has('x-lello-parceiro-hashid')) {
        for (const body of bodies) {
          const hashMatch = body.match(/x-lello-parceiro-hashid[=:]\s*([a-f0-9-]+)/i);
          if (hashMatch) { parsed.searchParams.set('x-lello-parceiro-hashid', hashMatch[1]); break; }
        }
      }
      if (parsed.pathname.includes('/prestacao-contas') && token) { parsed.pathname = parsed.pathname.replace('/prestacao-contas', '/boletos'); }
      best = parsed.toString();
    } catch {}
  }
  return best;
}

async function gmailFetchBoletoEmails(accessToken: string, strict: boolean, days: number) {
  const defaultTerms = [
    `subject:boleto`, `subject:fatura`, `subject:2\\u00aa via`,
    `subject:segunda via`, `subject:cobran\\u00e7a`, `subject:boleto eletr\\u00f4nico`,
  ];
  const filters = await getGmailFilters();
  const filterTerms: string[] = [];
  for (const f of filters) {
    const v = (f as any).value as string;
    const t = (f as any).type as string;
    if (t === 'subject') filterTerms.push(`subject:${v.includes(' ') ? `"${v}"` : v}`);
    if (t === 'sender') filterTerms.push(`from:${v.includes(' ') ? `"${v}"` : v}`);
    if (t === 'body') filterTerms.push(v.includes(' ') ? `"${v}"` : v);
  }
  const age = `newer_than:${days}d`;
  let query: string | null;
  if (strict) {
    const senderFilters = filters.filter((f: any) => f.type === 'sender');
    if (senderFilters.length === 0) query = null;
    else {
      const terms = senderFilters.map((f: any) => `from:${(f.value as string).includes(' ') ? `"${f.value}"` : f.value}`);
      query = `(${terms.join(' OR ')}) ${age}`;
    }
  } else {
    query = `(${[...defaultTerms, ...filterTerms].join(' OR ')}) ${age}`;
  }
  if (!query) return [];

  const r = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(query)}&maxResults=50`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!r.ok) return [];
  const { messages = [] } = await r.json();
  if (messages.length === 0) return [];

  const hiddenIds = await getGmailHiddenIds();
  const aliases = await getGmailAliases();
  const providers = await getGmailProviders();

  const result: any[] = [];
  for (const msg of messages.slice(0, 50)) {
    if (hiddenIds.has(msg.id)) continue;
    try {
      const detail = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=full`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!detail.ok) continue;
      const data = await detail.json();
      const h = data.payload?.headers || [];
      const rawFrom = h.find((x: any) => x.name === 'From')?.value || '';
      const from = rawFrom.replace(/<[^>]+>/g, '').trim().split('"').join('') || '';
      const fromEmail = rawFrom.match(/<([^>]+)>/)?.[1] || rawFrom.trim();
      const subject = h.find((x: any) => x.name === 'Subject')?.value || '(sem assunto)';
      const date = h.find((x: any) => x.name === 'Date')?.value || '';
      const attach = data.payload?.body?.attachmentId ? data.payload.body : gmailFindAttachment(data.payload);
      let boletoLink: string | undefined;
      if (!attach) {
        const bodies = gmailDecodeBody(data.payload);
        const link = gmailExtractBoletoLink(bodies);
        if (link) boletoLink = link;
      }
      if (!attach && !boletoLink) continue;
      const hasProvider = !!boletoLink && providers.some((p: any) => p.sender && (p.sender === from || p.sender === fromEmail));
      result.push({
        id: msg.id, subject, from, fromEmail, date, snippet: data.snippet || '',
        hasAttachment: !!attach,
        attachmentId: attach?.body?.attachmentId || attach?.attachmentId,
        filename: attach?.filename, mimeType: attach?.mimeType,
        boletoLink, alias: resolveAlias(from, aliases), hasProvider,
      });
    } catch {}
  }
  return result;
}

async function gmailTryFetchProviderPdf(boletoUrl: string, password: string): Promise<{ buffer: Buffer; filename: string } | null> {
  try {
    const parsed = new URL(boletoUrl);
    if (parsed.hostname.includes('lellocondominios') || parsed.hostname.includes('resolvafacil')) {
      const token = parsed.searchParams.get('token') || '';
      let uuid = parsed.searchParams.get('uuid') || '';
      const hashId = parsed.searchParams.get('x-lello-parceiro-hashid') || '';
      if (!uuid && token && token.split('.').length === 3) {
        try { const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString()); uuid = payload.UUID || payload.uuid || ''; } catch {}
      }
      if (!token) return null;
      if (token.split('.').length === 3) {
        try {
          const postRes = await fetch('https://api.lellocondominios.com.br/resolvafacil-api/v2/external/primeira-via/boleto', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`, ...(hashId ? { 'x-lello-parceiro-hashid': hashId } : {}) },
            body: JSON.stringify({ cpf: password }),
          });
          if (postRes.ok && postRes.headers.get('content-type')?.includes('pdf')) {
            return { buffer: Buffer.from(await postRes.arrayBuffer()), filename: 'boleto-lello.pdf' };
          }
        } catch {}
      }
      if (uuid) {
        const apiUrl = `https://api.lellocondominios.com.br/resolvafacil-api/v2/external/primeira-via?token=${encodeURIComponent(token)}&uuid=${encodeURIComponent(uuid)}&digitosDocumento=${encodeURIComponent(password)}`;
        const res = await fetch(apiUrl, { headers: hashId ? { 'x-lello-parceiro-hashid': hashId } : {} });
        if (res.ok && res.headers.get('content-type')?.includes('pdf')) {
          return { buffer: Buffer.from(await res.arrayBuffer()), filename: `boleto-lello-${uuid.substring(0, 8)}.pdf` };
        }
      }
    }
  } catch {}
  return null;
}

// Gmail routes (no authMiddleware - client doesn't send token for these)
app.get('/api/gmail', async (req, res) => {
  const action = req.query.action as string;
  try {
    if (action === 'auth') {
      const redirectUri = gmailRedirectUri(req);
      return res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${new URLSearchParams({
        client_id: GMAIL_CLIENT_ID, redirect_uri: redirectUri, response_type: 'code',
        scope: 'https://www.googleapis.com/auth/gmail.readonly', access_type: 'offline', prompt: 'consent',
      })}`);
    }

    if (action === 'callback') {
      const code = req.query.code as string;
      const oauthError = req.query.error as string;
      if (oauthError) return res.redirect('/?gmail=error');
      if (!code) return res.status(400).json({ error: 'Missing authorization code' });
      const redirectUri = gmailRedirectUri(req);
      const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ code, client_id: GMAIL_CLIENT_ID, client_secret: GMAIL_CLIENT_SECRET, redirect_uri: redirectUri, grant_type: 'authorization_code' }),
      });
      if (!tokenRes.ok) return res.status(400).json({ error: 'Token exchange failed' });
      const tokens = await tokenRes.json();
      const profileRes = await fetch('https://www.googleapis.com/gmail/v1/users/me/profile', { headers: { Authorization: `Bearer ${tokens.access_token}` } });
      const profile = await profileRes.json();
      const email = profile.emailAddress || 'admin';
      if (tokens.refresh_token) {
        await upsertGmailToken(email, tokens.refresh_token, tokens.access_token, Date.now() + tokens.expires_in * 1000);
      }
      return res.redirect('/?gmail=connected');
    }

    if (action === 'fetch') {
      const tok = await getGmailAccessToken();
      if (!tok) return res.json({ connected: false, emails: [] });
      const strict = req.query.mode === 'strict';
      const days = parseInt(req.query.days as string) || 30;
      const [emails, aliases] = await Promise.all([gmailFetchBoletoEmails(tok.token, strict, days), getGmailAliases()]);
      return res.json({ connected: true, emails, aliases, mode: strict ? 'strict' : 'broad', days });
    }

    if (action === 'download' || action === 'view') {
      const msgId = req.query.msgId as string;
      const attachmentId = req.query.attachmentId as string;
      const filename = req.query.filename as string || 'boleto.pdf';
      if (!msgId || !attachmentId) return res.status(400).json({ error: 'Missing msgId or attachmentId' });
      const tok = await getGmailAccessToken();
      if (!tok) return res.status(401).json({ error: 'Not connected' });
      const attRes = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${msgId}/attachments/${attachmentId}`, { headers: { Authorization: `Bearer ${tok.token}` } });
      if (!attRes.ok) return res.status(500).json({ error: 'Failed to fetch attachment' });
      const attData = await attRes.json();
      const buf = Buffer.from(attData.data, 'base64');
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', action === 'view' ? `inline; filename="${filename}"` : `attachment; filename="${filename}"`);
      return res.send(buf);
    }

    if (action === 'disconnect') {
      const email = await getFirstGmailEmail();
      if (email) await deleteGmailToken(email);
      return res.json({ ok: true });
    }

    if (action === 'getFilters') {
      const filters = await getGmailFilters();
      return res.json({ filters });
    }

    if (action === 'getAliases') {
      const aliases = await getGmailAliases();
      return res.json({ aliases });
    }

    if (action === 'getProviders') {
      const providers = await getGmailProviders();
      return res.json({ providers });
    }

    if (action === 'downloadProviderPdf') {
      const boletoUrl = req.query.url as string;
      const sender = req.query.sender as string;
      const senderEmail = req.query.senderEmail as string;
      if (!boletoUrl || !sender) return res.status(400).json({ error: 'url and sender required' });
      const providers = await getGmailProviders();
      const provider = providers.find((p: any) => p.sender === sender || (senderEmail && p.sender === senderEmail));
      if (!provider) return res.status(404).json({ error: 'Provider not found for this sender' });
      const pdf = await gmailTryFetchProviderPdf(boletoUrl, provider.password);
      if (!pdf) return res.status(404).json({ error: 'N\u00e3o foi poss\u00edvel obter o PDF. Verifique a senha cadastrada.' });
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${pdf.filename}"`);
      return res.send(pdf.buffer);
    }

    return res.json({ connected: false });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.post('/api/gmail', async (req, res) => {
  const action = req.query.action as string;
  try {
    if (action === 'addFilter') {
      const { type, value } = req.body;
      if (!type || !value) return res.status(400).json({ error: 'type and value required' });
      const id = randomUUID();
      await libsqlClient.execute({ sql: 'INSERT INTO gmail_filters (id, type, value) VALUES (?, ?, ?)', args: [id, type, value] });
      return res.json({ ok: true });
    }

    if (action === 'removeFilter') {
      const id = req.body?.id || req.query.id;
      if (!id) return res.status(400).json({ error: 'id required' });
      await libsqlClient.execute({ sql: 'DELETE FROM gmail_filters WHERE id = ?', args: [id] });
      return res.json({ ok: true });
    }

    if (action === 'addProvider') {
      const { sender, password } = req.body || {};
      if (!sender || !password) return res.status(400).json({ error: 'sender and password required' });
      const id = randomUUID();
      await libsqlClient.execute({ sql: 'INSERT INTO gmail_filters (id, type, value) VALUES (?, ?, ?)', args: [id, 'provider', JSON.stringify({ sender, password })] });
      return res.json({ ok: true });
    }

    if (action === 'removeProvider') {
      const id = req.body?.id || req.query.id;
      if (!id) return res.status(400).json({ error: 'id required' });
      await libsqlClient.execute({ sql: 'DELETE FROM gmail_filters WHERE id = ?', args: [id] });
      return res.json({ ok: true });
    }

    if (action === 'hideEmail') {
      const { messageId } = req.body;
      if (!messageId) return res.status(400).json({ error: 'messageId required' });
      const id = randomUUID();
      await libsqlClient.execute({ sql: 'INSERT INTO gmail_hidden (id, message_id) VALUES (?, ?)', args: [id, messageId] });
      return res.json({ ok: true });
    }

    if (action === 'saveAlias') {
      const { sender, alias } = req.body;
      if (!sender || !alias) return res.status(400).json({ error: 'sender and alias required' });
      const existing = await libsqlClient.execute({ sql: 'SELECT id FROM gmail_aliases WHERE sender = ?', args: [sender] });
      if (existing.rows.length > 0) {
        await libsqlClient.execute({ sql: 'UPDATE gmail_aliases SET alias = ? WHERE sender = ?', args: [alias, sender] });
      } else {
        const id = randomUUID();
        await libsqlClient.execute({ sql: 'INSERT INTO gmail_aliases (id, sender, alias) VALUES (?, ?, ?)', args: [id, sender, alias] });
      }
      return res.json({ ok: true });
    }

    if (action === 'deleteAlias') {
      const id = req.body?.id || req.query.id;
      if (!id) return res.status(400).json({ error: 'id required' });
      await libsqlClient.execute({ sql: 'DELETE FROM gmail_aliases WHERE id = ?', args: [id] });
      return res.json({ ok: true });
    }

    return res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

async function startServer() {
  await initializeDatabase();
  await initDatabase();
  await seedDatabaseIfEmpty();

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
