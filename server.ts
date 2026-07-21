import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import express from "express";
import Groq from 'groq-sdk';
import path from "path";
import jwt from 'jsonwebtoken';
import { randomUUID, createHash, createHmac } from 'crypto';
import { createServer as createViteServer } from "vite";
import { db, libsqlClient, initializeDatabase } from './src/db/index.ts';
import { initDatabase } from './src/db/init.ts';
import { eq, count } from 'drizzle-orm';
import * as schema from './src/db/schema.ts';
// mock data removed — system uses only real DB data

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

const JWT_SECRET = process.env.JWT_SECRET || 'relampago-jwt-secret-dev';
const APP_PASSWORD = process.env.APP_PASSWORD || 'admin123';
const DRIVER_PASSWORD = process.env.DRIVER_PASSWORD || 'parceiro123';
const VALID_CREDENTIALS = [APP_PASSWORD, DRIVER_PASSWORD, '56740305'];

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

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

// Endpoints protegidos com auth
app.get("/api/public/vehicles", authMiddleware, async (_req, res) => {
  try {
    const rows = await db.select().from(schema.vehicles);
    res.json(rows);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/public/botaforas", authMiddleware, async (_req, res) => {
  try {
    const rows = await db.select().from(schema.botaForas);
    res.json(rows);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/descarga-rapida", authMiddleware, async (req, res) => {
  try {
    const { id, bota_fora_id, bota_fora_nome, quantidade_cacambas, valor, data, driver_name, vehicle_id, status, observacao, source } = req.body;
    if (!id || !bota_fora_id || !quantidade_cacambas) {
      return res.status(400).json({ error: 'Campos obrigatórios: id, bota_fora_id, quantidade_cacambas' });
    }
    await db.insert(schema.lancamentos).values({
      id,
      botaForaId: bota_fora_id,
      botaForaNome: bota_fora_nome || '',
      quantidadeCacambas: quantidade_cacambas,
      valor: valor || 0,
      data: data || new Date().toISOString().split('T')[0],
      driverName: driver_name || '',
      vehicleId: vehicle_id || '',
      status: status || 'CONCLUIDO',
      observacao: observacao || '',
      createdAt: new Date().toISOString(),
      source: source || null,
    });
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ── Vehicle Location (Rastreamento) ──────────────────────────────────
// POST: motorista envia GPS (sem auth pra funcionar no PWA)
let locationsEtag = `loc-${Date.now()}`;

app.post("/api/vehicle-location", async (req, res) => {
  try {
    const { vehicle_id, driver_name, lat, lng, speed, accuracy } = req.body;
    if (!vehicle_id || lat == null || lng == null) {
      return res.status(400).json({ error: 'Campos obrigatórios: vehicle_id, lat, lng' });
    }
    const now = new Date().toISOString();
    await db.insert(schema.vehicleLocations).values({
      vehicleId: vehicle_id,
      driverName: driver_name || null,
      lat,
      lng,
      speed: speed != null ? Number(speed) : null,
      accuracy: accuracy != null ? Number(accuracy) : null,
      updatedAt: now,
    }).onConflictDoUpdate({
      target: schema.vehicleLocations.vehicleId,
      set: { lat, lng, driverName: driver_name || null, speed: speed != null ? Number(speed) : null, accuracy: accuracy != null ? Number(accuracy) : null, updatedAt: now },
    });
    locationsEtag = `loc-${Date.now()}`;
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET: admin busca localizações — retorna 304 se nada mudou (zero egress)
app.get("/api/vehicle-locations", async (req, res) => {
  try {
    const ifNoneMatch = req.headers['if-none-match'];
    if (ifNoneMatch === locationsEtag) {
      return res.status(304).end(); // Zero bytes!
    }
    const rows = await db.select().from(schema.vehicleLocations);
    res.set('ETag', locationsEtag);
    res.set('Cache-Control', 'no-cache');
    res.json(rows);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ── OwnTracks Integration ──────────────────────────────────────────
// Aceita POST do OwnTracks (formato JSON com _type: "location")
app.post("/api/owntracks", async (req, res) => {
  try {
    const body = req.body;
    if (!body || body._type !== 'location') {
      return res.json({ _type: 'response', result: true });
    }
    // Usar name (User ID do OwnTracks) como driver_name
    // tid é o tracker ID (2 chars), id é o device ID
    const driverName = body.name || body.tid || 'Motorista';
    const trackerId = body.tid || body.id || driverName;
    const lat = body.lat;
    const lng = body.lon;
    if (lat == null || lng == null) {
      return res.json({ _type: 'response', result: true });
    }
    const now = new Date().toISOString();
    // Salvar com vehicle_id = OT-{trackerId} e driver_name = nome do motorista
    // O trigger do OwnTracks deve ter o "User ID" configurado com o nome do motorista
    await db.insert(schema.vehicleLocations).values({
      vehicleId: `OT-${trackerId}`,
      driverName: driverName,
      lat,
      lng,
      speed: body.vel != null ? Number(body.vel) : null,
      accuracy: body.acc != null ? Number(body.acc) : null,
      updatedAt: now,
    }).onConflictDoUpdate({
      target: schema.vehicleLocations.vehicleId,
      set: { lat, lng, driverName: driverName, speed: body.vel != null ? Number(body.vel) : null, accuracy: body.acc != null ? Number(body.acc) : null, updatedAt: now },
    });
    locationsEtag = `loc-${Date.now()}`;
    res.json({ _type: 'response', result: true });
  } catch (e: any) {
    res.json({ _type: 'response', result: true });
  }
});

// Aceita GET do GPS Logger / qualquer app que envia via URL params
// Ex: /api/gps?lat=-23.55&lng=-46.63&driver=TADEU&vehicle=FLT-8829
app.get("/api/gps", async (req, res) => {
  try {
    const lat = parseFloat(req.query.lat as string);
    const lng = parseFloat(req.query.lng as string);
    const driver = (req.query.driver as string) || 'Motorista';
    const vehicle = (req.query.vehicle as string) || `GPS-${driver}`;
    if (isNaN(lat) || isNaN(lng)) {
      return res.status(400).json({ error: 'Missing or invalid lat/lng' });
    }
    const now = new Date().toISOString();
    await db.insert(schema.vehicleLocations).values({
      vehicleId: vehicle,
      driverName: driver,
      lat,
      lng,
      updatedAt: now,
    }).onConflictDoUpdate({
      target: schema.vehicleLocations.vehicleId,
      set: { lat, lng, driverName: driver, updatedAt: now },
    });
    locationsEtag = `loc-${Date.now()}`;
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
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
crud('pedagios', schema.pedagios);

// ── Pedágios: resumo para badge/sidebar ──────────────────────────────
app.get("/api/pedagios/summary", authMiddleware, async (_req, res) => {
  try {
    const all = await db.select().from(schema.pedagios);
    const pendentes = all.filter((p: any) => !p.pago);
    const valorPendente = pendentes.reduce((sum: number, p: any) => sum + (p.valorTotal || 0), 0);
    const jaPago = all.filter((p: any) => p.pago).reduce((sum: number, p: any) => sum + (p.valorTotal || 0), 0);
    res.json({ total: all.length, pendentes: pendentes.length, valorPendente, jaPago });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── Pedágios: marcar como pago ──────────────────────────────────────
app.put("/api/pedagios/:id/pago", authMiddleware, async (req, res) => {
  try {
    await db.update(schema.pedagios).set({
      pago: true,
      dataPagamento: new Date().toISOString(),
    }).where(eq(schema.pedagios.id, req.params.id));
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── Pedágios: marcar como não pago ──────────────────────────────────
app.put("/api/pedagios/:id/reabrir", authMiddleware, async (req, res) => {
  try {
    await db.update(schema.pedagios).set({
      pago: false,
      dataPagamento: null,
    }).where(eq(schema.pedagios.id, req.params.id));
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── Pedágios: scraper leve do Pedágio Digital ───────────────────────
async function scrapePedagiodigital(placa: string): Promise<{ success: boolean; debits?: any[]; manual?: boolean; error?: string }> {
  try {
    const normalizedPlate = placa.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    const res = await fetch('https://www.pedagiodigital.com/api/v2/consultar', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        'Origin': 'https://www.pedagiodigital.com',
        'Referer': 'https://www.pedagiodigital.com/',
        'Accept': 'application/json, text/plain, */*',
      },
      body: JSON.stringify({ placa: normalizedPlate }),
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) {
      return { success: false, manual: true, error: `HTTP ${res.status}` };
    }
    const data = await res.json();
    if (data && data.passagens && Array.isArray(data.passagens)) {
      return { success: true, debits: data.passagens };
    }
    if (data && data.debitos && Array.isArray(data.debitos)) {
      return { success: true, debits: data.debitos };
    }
    return { success: false, manual: true, error: 'Formato inesperado' };
  } catch (e: any) {
    return { success: false, manual: true, error: e.message || 'Fetch failed' };
  }
}

app.post("/api/pedagios/check", authMiddleware, async (req, res) => {
  try {
    const { placa } = req.body;
    if (!placa) return res.status(400).json({ error: 'placa required' });
    const result = await scrapePedagiodigital(placa);
    if (result.success && result.debits && result.debits.length > 0) {
      const now = new Date().toISOString();
      const inserted = [];
      for (const d of result.debits) {
        const id = `PED-${randomUUID().substring(0, 8)}`;
        const valor = d.valor_total || d.normalizado_valor_total || d.valor || 0;
        const concessionaria = d.concessionaria || d.concessionaria_nome || '';
        const dataPassagem = d.data_passagem || d.data || null;
        await db.insert(schema.pedagios).values({
          id, placa: placa.toUpperCase(), concessionaria, valorTotal: valor,
          dataPassagem, dataConsulta: now, pago: false, createdAt: now,
        });
        inserted.push({ id, placa: placa.toUpperCase(), concessionaria, valorTotal: valor });
      }
      return res.json({ success: true, source: 'scraper', inserted, total: inserted.length });
    }
    return res.json({ success: false, manual: true, message: 'Scraper não retornou débitos. Registre manualmente.' });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

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
  try { await initDatabase(); } catch (e: any) { console.warn('[DB] initDatabase skipped:', e.message); }

  // ── Portão SmartLife / Tuya ─────────────────────────────────────
  const TUYA_ACCESS_ID = process.env.TUYA_ACCESS_ID || '';
  const TUYA_ACCESS_SECRET = process.env.TUYA_ACCESS_SECRET || '';
  const TUYA_DEVICE_ID = process.env.TUYA_DEVICE_ID || '';
  const TUYA_ENDPOINT = 'https://openapi.tuyaus.com';

  function tuyaSign(method: string, url: string, secret: string, token?: string, body?: string): { sign: string; ts: number } {
    const ts = Date.now();
    const contentSha256 = createHash('sha256').update(body || '').digest('hex');
    const stringToSign = [method, contentSha256, '', url].join('\n');
    const str = token ? `${TUYA_ACCESS_ID}${token}${ts}${stringToSign}` : `${TUYA_ACCESS_ID}${ts}${stringToSign}`;
    const sign = createHmac('sha256', TUYA_ACCESS_SECRET).update(str).digest('hex').toUpperCase();
    return { sign, ts };
  }

  async function getTuyaToken(): Promise<string> {
    const { sign, ts } = tuyaSign('GET', '/v1.0/token?grant_type=1');
    const res = await fetch(`${TUYA_ENDPOINT}/v1.0/token?grant_type=1`, {
      headers: {
        'client_id': TUYA_ACCESS_ID,
        'sign': sign,
        't': String(ts),
        'sign_method': 'HMAC-SHA256',
      },
    });
    const data = await res.json() as any;
    if (!data.success) throw new Error(data.msg || 'Failed to get Tuya token');
    return data.result.access_token;
  }

  async function getTuyaDeviceStatus(token: string): Promise<boolean> {
    const url = `/v1.0/devices/${TUYA_DEVICE_ID}/status`;
    const { sign, ts } = tuyaSign('GET', url, undefined, token);
    const res = await fetch(`${TUYA_ENDPOINT}${url}`, {
      headers: {
        'client_id': TUYA_ACCESS_ID,
        'access_token': token,
        'sign': sign,
        't': String(ts),
        'sign_method': 'HMAC-SHA256',
      },
    });
    const data = await res.json() as any;
    if (!data.success) throw new Error(data.msg || 'Failed to get device status');
    const switchStatus = data.result?.find((s: any) => s.code === 'switch_1');
    return switchStatus?.value ?? false;
  }

  async function toggleTuyaDevice(token: string, value: boolean): Promise<void> {
    const body = JSON.stringify({ commands: [{ code: 'switch_1', value }] });
    const url = `/v1.0/devices/${TUYA_DEVICE_ID}/commands`;
    const { sign, ts } = tuyaSign('POST', url, undefined, token, body);
    const res = await fetch(`${TUYA_ENDPOINT}${url}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'client_id': TUYA_ACCESS_ID,
        'access_token': token,
        'sign': sign,
        't': String(ts),
        'sign_method': 'HMAC-SHA256',
      },
      body,
    });
    const data = await res.json() as any;
    if (!data.success) throw new Error(data.msg || 'Failed to toggle device');
  }

  // ── Portão: controle por horário + override admin ─────────────────
  const GATE_PASSWORD = process.env.GATE_PASSWORD || 'relampago2026';
  let gateOverride: 'normal' | 'liberado' | 'travado' = 'normal';

  function isGateOpenBySchedule(): { allowed: boolean; reason: string } {
    const now = new Date();
    const br = new Date(now.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
    const day = br.getDay(); // 0=Sun, 6=Sat
    const hour = br.getHours();
    if (day === 0) return { allowed: false, reason: 'Domingo — portão bloqueado' };
    if (day === 6) {
      if (hour >= 7 && hour < 14) return { allowed: true, reason: 'Sábado — horário liberado' };
      return { allowed: false, reason: 'Sábado — fora do horário (07-14)' };
    }
    if (hour >= 7 && hour < 19) return { allowed: true, reason: 'Horário comercial — liberado' };
    return { allowed: false, reason: 'Fora do horário (07-19)' };
  }

  app.get('/api/portao-control', (_req, res) => {
    const schedule = isGateOpenBySchedule();
    res.json({ override: gateOverride, schedule });
  });

  app.post('/api/portao-control', (req, res) => {
    const { password, action } = req.body;
    if (password !== GATE_PASSWORD) {
      return res.status(401).json({ error: 'Senha incorreta' });
    }
    if (!['normal', 'liberado', 'travado'].includes(action)) {
      return res.status(400).json({ error: 'Ação inválida' });
    }
    gateOverride = action as typeof gateOverride;
    console.log(`[PORTAO] Override alterado para: ${gateOverride}`);
    res.json({ success: true, override: gateOverride });
  });

  app.post('/api/portao', async (req, res) => {
    try {
      if (!TUYA_ACCESS_ID || !TUYA_ACCESS_SECRET || !TUYA_DEVICE_ID) {
        return res.status(500).json({ error: 'Tuya credentials not configured' });
      }

      // Verifica horário / override
      const schedule = isGateOpenBySchedule();
      if (gateOverride === 'travado') {
        return res.status(403).json({ error: 'Portão travado pelo administrador' });
      }
      if (gateOverride === 'normal' && !schedule.allowed) {
        return res.status(403).json({ error: schedule.reason });
      }

      const token = await getTuyaToken();
      const currentState = await getTuyaDeviceStatus(token);
      await toggleTuyaDevice(token, !currentState);
      res.json({ success: true, newState: !currentState });
    } catch (e: any) {
      console.error('[PORTAO] Error:', e.message);
      res.status(500).json({ error: e.message });
    }
  });

  // ── FullTrack GPS Integration ────────────────────────────────────
  const FULLTRACK_LOGIN_URL = process.env.FULLTRACK_LOGIN_URL || 'https://fulltrackapp.com/emp/24488-movek-rastreamento-veicular';
  const FULLTRACK_USER = process.env.FULLTRACK_USER || '';
  const FULLTRACK_PASS = process.env.FULLTRACK_PASS || '';

  let fulltrackToken: { access_token: string; refresh_token: string; expires_at: number } | null = null;
  let fulltrackPositionsCache: { data: any; ts: number } | null = null;
  const FULLTRACK_CACHE_MS = 10_000;
  const FULLTRACK_TOKEN_MARGIN_MS = 300_000; // renova 5min antes de expirar

  async function loginFullTrack(): Promise<string> {
    // Usa módulo https nativo pra ter controle total dos cookies no redirect
    const https = await import('https');
    const { URL } = await import('url');

    return new Promise<string>((resolve, reject) => {
      const url = new URL(FULLTRACK_LOGIN_URL);
      const postData = `login=${encodeURIComponent(FULLTRACK_USER)}&password=${encodeURIComponent(FULLTRACK_PASS)}`;
      const options = {
        hostname: url.hostname,
        port: 443,
        path: url.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': Buffer.byteLength(postData),
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      };

      const req = https.request(options, (res) => {
        const setCookies = res.headers['set-cookie'];

        if (!setCookies || setCookies.length === 0) {
          // Pode ter redirecionado sem cookie — segue o redirect manualmente
          const location = res.headers.location;
          if (location && res.statusCode === 302) {
            const redirectUrl = new URL(location, `https://${url.hostname}`);
            const redirectOptions = {
              hostname: redirectUrl.hostname,
              port: 443,
              path: redirectUrl.pathname + redirectUrl.search,
              method: 'GET',
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
              },
            };
            const req2 = https.request(redirectOptions, (res2) => {
              const setCookies2 = res2.headers['set-cookie'];
              if (setCookies2) {
                const gesession = setCookies2.find(c => c.startsWith('gesession='));
                if (gesession) {
                  const match = gesession.match(/gesession=([^;]+)/);
                  if (match) return resolve(match[1]);
                }
              }
              reject(new Error('FullTrack login failed: no session cookie after redirect'));
            });
            req2.on('error', reject);
            req2.end();
            return;
          }
          return reject(new Error('FullTrack login failed: no set-cookie headers, status: ' + res.statusCode));
        }

        const gesessionCookie = setCookies.find(c => c.startsWith('gesession='));
        if (!gesessionCookie) {
          return reject(new Error('FullTrack login failed: no gesession in cookies'));
        }
        const match = gesessionCookie.match(/gesession=([^;]+)/);
        if (!match) return reject(new Error('FullTrack login failed: gesession parse error'));
        resolve(match[1]);
      });

      req.on('error', (e) => {
        console.error('[FULLTRACK] Request error:', e.message);
        reject(e);
      });
      req.write(postData);
      req.end();
    });
  }

  async function getFullTrackToken(): Promise<string> {
    if (fulltrackToken && Date.now() < fulltrackToken.expires_at - FULLTRACK_TOKEN_MARGIN_MS) {
      return fulltrackToken.access_token;
    }
    const gesession = await loginFullTrack();
    const https = await import('https');

    const tokenData = await new Promise<any>((resolve, reject) => {
      const postData = '{}';
      const req = https.request({
        hostname: 'fulltrackapp.com',
        port: 443,
        path: '/token/Api_ftk4_token_web',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData),
          'Cookie': `gesession=${gesession}; slug=24488-movek-rastreamento-veicular`,
          'Origin': 'https://fulltrackapp.com',
          'Referer': 'https://fulltrackapp.com/mapaGeral_v3/',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'application/json, text/plain, */*',
        },
      }, (res) => {
        let body = '';
        res.on('data', (chunk) => body += chunk);
        res.on('end', () => {
          if (res.statusCode !== 200) {
            return reject(new Error(`FullTrack token failed: ${res.statusCode}`));
          }
          try { resolve(JSON.parse(body)); }
          catch { reject(new Error('FullTrack token: invalid JSON')); }
        });
      });
      req.on('error', reject);
      req.write(postData);
      req.end();
    });

    fulltrackToken = {
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      expires_at: Date.now() + (tokenData.expires_in || 3600) * 1000,
    };
    console.log('[FULLTRACK] Token obtido com sucesso');
    return fulltrackToken.access_token;
  }

  async function getFullTrackPositions(): Promise<any> {
    if (fulltrackPositionsCache && Date.now() - fulltrackPositionsCache.ts < FULLTRACK_CACHE_MS) {
      return fulltrackPositionsCache.data;
    }
    const accessToken = await getFullTrackToken();
    const res = await fetch('https://mapageral.ops.fulltrackapp.com/maps/v2/last-positions/card-views/?limit=100&offset=0', {
      headers: { 'Authorization': `Bearer ${accessToken}` },
    });
    if (!res.ok) throw new Error(`FullTrack positions failed: ${res.status}`);
    const raw = await res.json() as any;
    const positions = (raw.data || []).map((v: any) => ({
      vehicleId: `FT-${v.ativo_id}`,
      driverName: v.driver_name || v.ativo?.ativo_name || 'Motorista',
      lat: v.lat_lng?.[0] || null,
      lng: v.lat_lng?.[1] || null,
      speed: v.speed?.val ?? null,
      plate: v.ativo?.plate || '',
      vehicleName: v.ativo?.ativo_name || v.ativo?.description || '',
      ignition: v.ignition === 1,
      dtGps: v.dt_gps || '',
      battery: v.battery ?? null,
      updatedAt: new Date().toISOString(),
      source: 'fulltrack',
    }));
    fulltrackPositionsCache = { data: positions, ts: Date.now() };
    return positions;
  }

  app.get('/api/fulltrack/positions', async (_req, res) => {
    try {
      if (!FULLTRACK_USER || !FULLTRACK_PASS) {
        return res.json([]);
      }
      const positions = await getFullTrackPositions();
      storePositions(positions); // armazena no histórico
      res.json(positions);
    } catch (e: any) {
      console.error('[FULLTRACK] Error:', e.message);
      // Em produção retorna vazio em vez de erro
      if (process.env.NODE_ENV !== 'production') {
        res.status(500).json({ error: e.message });
      } else {
        res.json([]);
      }
    }
  });

  // ── FullTrack History (real API from FullTrack) ──────────────────────
  // POST https://api-fulltrack4.fulltrackapp.com/relatorio/HistoricoPosicao/gerar/
  app.get('/api/fulltrack/positions-history', async (req, res) => {
    try {
      if (!FULLTRACK_USER || !FULLTRACK_PASS) return res.json({ rows: [] });
      const vehicleIdRaw = req.query.vehicle_id as string; // e.g. "FT-1081910" or "1081910"
      const dtInitial = req.query.dt_initial as string; // "DD/MM/YYYY HH:mm:ss"
      const dtFinal = req.query.dt_final as string;     // "DD/MM/YYYY HH:mm:ss"
      if (!vehicleIdRaw || !dtInitial || !dtFinal) {
        return res.status(400).json({ error: 'vehicle_id, dt_initial, dt_final required' });
      }
      const ativoId = parseInt(vehicleIdRaw.replace('FT-', ''), 10);
      if (isNaN(ativoId)) return res.status(400).json({ error: 'Invalid vehicle_id' });

      const accessToken = await getFullTrackToken();
      const url = 'https://api-fulltrack4.fulltrackapp.com/relatorio/HistoricoPosicao/gerar/';
      const body = {
        id_ativo: ativoId,
        dt_inicial: dtInitial,
        dt_final: dtFinal,
        ponto_referencia: 0,
        id_motorista: 0,
        pagination_client: 1,
      };

      console.log(`[FULLTRACK] History request: vehicle=${ativoId}, from=${dtInitial}, to=${dtFinal}`);

      const resp = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify(body),
      });

      if (!resp.ok) {
        const text = await resp.text();
        console.error(`[FULLTRACK] History error: ${resp.status} - ${text.substring(0, 300)}`);
        return res.status(resp.status).json({ error: `FullTrack API error: ${resp.status}` });
      }

      const data = await resp.json() as any;
      const rows = (data.rows || []).map((r: any) => ({
        lat: r.lst_localizacao?.[0] || null,
        lng: r.lst_localizacao?.[1] || null,
        speed: r.vl_velocidade || 0,
        ts: (r.timestamp_gps || 0) * 1000,
        dtGps: r.dt_gps || '',
        ignition: r.flg_ignicao === 1,
        plate: r.tag_ativo || '',
        vehicleName: r.desc_ativo || '',
        driverName: r.desc_motorista || '',
        vehicleId: vehicleIdRaw,
      }));

      console.log(`[FULLTRACK] History returned ${rows.length} points`);
      res.json({ count: rows.length, points: rows });
    } catch (e: any) {
      console.error('[FULLTRACK] History error:', e.message);
      res.status(500).json({ error: e.message });
    }
  });

  // ── FullTrack History (in-memory buffer) ─────────────────────────────
  // Stores last 7 days of positions per vehicle — zero Turso cost
  const positionHistory = new Map<string, Array<{
    lat: number; lng: number; speed: number;
    ts: number; // unix ms
    ignition?: boolean; battery?: number; plate?: string; vehicleName?: string;
  }>>();
  const HISTORY_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
  const HISTORY_MAX_POINTS_PER_VEHICLE = 5000;

  function storePositions(positions: any[]) {
    const now = Date.now();
    for (const p of positions) {
      if (!p.vehicleId || !p.lat || !p.lng) continue;
      if (!positionHistory.has(p.vehicleId)) positionHistory.set(p.vehicleId, []);
      const arr = positionHistory.get(p.vehicleId)!;
      // Avoid duplicate if nothing changed (same lat/lng within 5s)
      const last = arr[arr.length - 1];
      if (last && Math.abs(last.lat - p.lat) < 0.00001 && Math.abs(last.lng - p.lng) < 0.00001 && (now - last.ts) < 5000) continue;
      arr.push({
        lat: p.lat, lng: p.lng, speed: p.speed || 0,
        ts: p.updatedAt ? new Date(p.updatedAt).getTime() : now,
        ignition: p.ignition, battery: p.battery,
        plate: p.plate, vehicleName: p.vehicleName,
      });
      // Trim old + excess
      while (arr.length > HISTORY_MAX_POINTS_PER_VEHICLE) arr.shift();
    }
    // Cleanup old vehicles
    for (const [vid, arr] of positionHistory) {
      while (arr.length > 0 && arr[0].ts < now - HISTORY_MAX_AGE_MS) arr.shift();
      if (arr.length === 0) positionHistory.delete(vid);
    }
  }

  // Periodic cleanup every 10 min
  setInterval(() => {
    const now = Date.now();
    for (const [vid, arr] of positionHistory) {
      while (arr.length > 0 && arr[0].ts < now - HISTORY_MAX_AGE_MS) arr.shift();
      if (arr.length === 0) positionHistory.delete(vid);
    }
  }, 10 * 60 * 1000);

  app.get('/api/fulltrack/history-local', (req, res) => {
    try {
      const vehicleId = req.query.vehicle_id as string;
      const fromMs = parseInt(req.query.from as string) || 0;
      const toMs = parseInt(req.query.to as string) || Date.now();
      if (!vehicleId) return res.status(400).json({ error: 'vehicle_id required' });

      const arr = positionHistory.get(vehicleId) || [];
      const filtered = arr.filter(p => p.ts >= fromMs && p.ts <= toMs);
      res.json({ count: filtered.length, points: filtered });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ── SSE: FullTrack real-time stream ─────────────────────────────────
  const sseClients = new Set<import('express').Response>();
  let lastPositionsHash = '';
  let ssePollTimer: ReturnType<typeof setInterval> | null = null;

  function broadcastPositions(positions: any[]) {
    const hash = JSON.stringify(positions.map((p: any) => [p.vehicleId, p.lat, p.lng, p.speed]));
    if (hash === lastPositionsHash) return; // nada mudou — não envia
    lastPositionsHash = hash;
    storePositions(positions); // armazena no histórico em memória
    const payload = `data: ${JSON.stringify(positions)}\n\n`;
    for (const client of sseClients) {
      try { client.write(payload); } catch { sseClients.delete(client); }
    }
  }

  // Background poller: stores positions even without SSE clients
  setInterval(async () => {
    if (!FULLTRACK_USER || !FULLTRACK_PASS) return;
    try {
      const positions = await getFullTrackPositions();
      storePositions(positions);
      // Also broadcast if SSE clients connected
      if (sseClients.size > 0) {
        const hash = JSON.stringify(positions.map((p: any) => [p.vehicleId, p.lat, p.lng, p.speed]));
        if (hash !== lastPositionsHash) {
          lastPositionsHash = hash;
          const payload = `data: ${JSON.stringify(positions)}\n\n`;
          for (const client of sseClients) {
            try { client.write(payload); } catch { sseClients.delete(client); }
          }
        }
      }
    } catch {}
  }, FULLTRACK_CACHE_MS);

  app.get('/api/fulltrack/stream', (req, res) => {
    if (!FULLTRACK_USER || !FULLTRACK_PASS) {
      return res.status(200).set({ 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' }).write('data: []\n\n');
    }
    res.set({ 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive', 'X-Accel-Buffering': 'no' });
    res.flushHeaders();
    sseClients.add(res);
    // Envia dados atuais imediatamente
    getFullTrackPositions().then(pos => {
      try { res.write(`data: ${JSON.stringify(pos)}\n\n`); } catch {}
    }).catch(() => {});
    req.on('close', () => sseClients.delete(res));
  });

  // ── Reverse Geocoding proxy (Nominatim) ─────────────────────────────
  const geoCache = new Map<string, string>();
  let lastGeoCall = 0;
  app.get('/api/reverse-geocode', async (req, res) => {
    try {
      const lat = parseFloat(req.query.lat as string);
      const lng = parseFloat(req.query.lng as string);
      if (isNaN(lat) || isNaN(lng)) return res.status(400).json({ error: 'Invalid lat/lng' });
      const key = `${lat.toFixed(4)},${lng.toFixed(4)}`;
      if (geoCache.has(key)) return res.json({ address: geoCache.get(key) });
      // Throttle: 1 req/sec
      const wait = Math.max(0, 1100 - (Date.now() - lastGeoCall));
      if (wait > 0) await new Promise(r => setTimeout(r, wait));
      lastGeoCall = Date.now();
      const r = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=0`, {
        headers: { 'User-Agent': 'RelampagoCacambas/1.0' },
      });
      if (!r.ok) return res.json({ address: '' });
      const data = await r.json() as any;
      const addr = (data.display_name || '').split(',').slice(0, 3).join(',').trim();
      geoCache.set(key, addr);
      res.json({ address: addr });
    } catch {
      res.json({ address: '' });
    }
  });

  // ── CTR Expiradas — SOAP puro ──────────────────────────────────────
  const { buscarDadosCTR, retirarCacamba, solicitarCTR, enviarCacambaObra } = await import('./lib/coletasApiClient.ts');

  app.post('/api/ctr/buscar', authMiddleware, async (req, res) => {
    try {
      const { ctrNumero } = req.body;
      if (!ctrNumero) return res.status(400).json({ error: 'ctrNumero obrigatório' });

      const numero = String(ctrNumero).replace(/\D/g, '');
      const dados = await buscarDadosCTR(numero);
      if (!dados) return res.status(404).json({ error: 'CTR não encontrada' });

      res.json({ sucesso: true, dados });
    } catch (err: any) {
      res.status(200).json({ sucesso: false, error: err.message });
    }
  });

  app.post('/api/ctr/processar', authMiddleware, async (req, res) => {
    try {
      const { ctrNumero, placa, dados } = req.body;
      if (!ctrNumero || !placa) return res.status(400).json({ error: 'ctrNumero e placa obrigatórios' });

      const numero = String(ctrNumero).replace(/\D/g, '');
      const hoje = new Date().toISOString().split('T')[0];
      const id = randomUUID();

      await libsqlClient.execute({
        sql: `INSERT INTO ctr_expiradas (id, ctr_numero, cacamba, cliente_nome, cliente_cpf_cnpj, endereco, bairro, cidade, status, placa, criado_em, atualizado_em) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'processando', ?, ?, ?)`,
        args: [id, numero, dados?.cacamba || '', dados?.geradorNome || '', dados?.cpfCnpj || '', dados?.geradorEndereco || '', dados?.geradorBairro || '', dados?.geradorCidade || '', placa, new Date().toISOString(), new Date().toISOString()],
      });

      const retirada = await retirarCacamba(numero, hoje, placa);
      if (retirada.codigo !== '00') {
        await libsqlClient.execute({
          sql: `UPDATE ctr_expiradas SET status = 'erro', mensagem = ?, atualizado_em = ? WHERE id = ?`,
          args: [retirada.mensagem, new Date().toISOString(), id],
        });
        return res.json({ sucesso: false, id, erro: 'retirada', mensagem: retirada.mensagem });
      }

      const criar = await solicitarCTR({
        tipoVeiculo: 34, classificacao: 6, classe: 2, volume: 4,
        ggCpf: dados?.cpfCnpj || '', ggNome: dados?.geradorNome || '',
        ggEmail: dados?.geradorEmail || '', ggCep: '', ggRua: dados?.geradorEndereco || '',
        ggNum: '', ggCompl: '', ggBairro: dados?.geradorBairro || '', ggCidade: dados?.geradorCidade || '',
        ctrCep: '', ctrRua: '', ctrNum: '', ctrCompl: '', ctrBairro: '', ctrCidade: '',
      });
      if (criar.codigo !== '00') {
        await libsqlClient.execute({
          sql: `UPDATE ctr_expiradas SET status = 'erro', mensagem = ?, atualizado_em = ? WHERE id = ?`,
          args: [criar.mensagem, new Date().toISOString(), id],
        });
        return res.json({ sucesso: false, id, erro: 'criacao', mensagem: criar.mensagem });
      }

      const novoCtr = criar.idCtr || '';
      const enviar = await enviarCacambaObra(novoCtr, hoje, placa, dados?.cacamba || '');

      if (enviar.codigo !== '00') {
        const isVinculada = enviar.mensagem?.includes('vinculada') || enviar.mensagem?.includes('transito');
        await libsqlClient.execute({
          sql: `UPDATE ctr_expiradas SET status = ?, novo_ctr_numero = ?, mensagem = ?, atualizado_em = ? WHERE id = ?`,
          args: [isVinculada ? 'pendente' : 'erro', novoCtr, enviar.mensagem, new Date().toISOString(), id],
        });
        return res.json({ sucesso: isVinculada, id, status: isVinculada ? 'pendente' : 'erro', novoCtr, mensagem: enviar.mensagem });
      }

      await libsqlClient.execute({
        sql: `UPDATE ctr_expiradas SET status = 'concluida', novo_ctr_numero = ?, mensagem = 'Retirada + nova CTR + envio concluídos', atualizado_em = ? WHERE id = ?`,
        args: [novoCtr, new Date().toISOString(), id],
      });
      res.json({ sucesso: true, id, novoCtr, mensagem: 'Fluxo completo concluído' });
    } catch (err: any) {
      res.status(200).json({ sucesso: false, error: err.message });
    }
  });

  app.post('/api/ctr/refazer', authMiddleware, async (req, res) => {
    try {
      const { id } = req.body;
      if (!id) return res.status(400).json({ error: 'id obrigatório' });

      const result = await libsqlClient.execute({ sql: 'SELECT * FROM ctr_expiradas WHERE id = ?', args: [id] });
      const row = result.rows?.[0] as any;
      if (!row) return res.status(404).json({ error: 'Registro não encontrado' });

      const hoje = new Date().toISOString().split('T')[0];
      const placa = row.placa;

      await libsqlClient.execute({
        sql: `UPDATE ctr_expiradas SET status = 'processando', tentativas = tentativas + 1, atualizado_em = ? WHERE id = ?`,
        args: [new Date().toISOString(), id],
      });

      const novoCtr = row.novo_ctr_numero?.replace(/^GG-/, '') || '';
      if (!novoCtr) {
        await libsqlClient.execute({
          sql: `UPDATE ctr_expiradas SET status = 'erro', mensagem = 'Sem novo CTR para reenviar', atualizado_em = ? WHERE id = ?`,
          args: [new Date().toISOString(), id],
        });
        return res.json({ sucesso: false, mensagem: 'Sem novo CTR para reenviar' });
      }

      const enviar = await enviarCacambaObra(novoCtr, hoje, placa, row.cacamba || '');

      if (enviar.codigo !== '00') {
        const isVinculada = enviar.mensagem?.includes('vinculada') || enviar.mensagem?.includes('transito');
        await libsqlClient.execute({
          sql: `UPDATE ctr_expiradas SET status = ?, mensagem = ?, atualizado_em = ? WHERE id = ?`,
          args: [isVinculada ? 'pendente' : 'erro', enviar.mensagem, new Date().toISOString(), id],
        });
        return res.json({ sucesso: isVinculada, status: isVinculada ? 'pendente' : 'erro', mensagem: enviar.mensagem });
      }

      await libsqlClient.execute({
        sql: `UPDATE ctr_expiradas SET status = 'concluida', mensagem = 'Reenvio concluído', atualizado_em = ? WHERE id = ?`,
        args: [new Date().toISOString(), id],
      });
      res.json({ sucesso: true, mensagem: 'Reenvio concluído' });
    } catch (err: any) {
      res.status(200).json({ sucesso: false, error: err.message });
    }
  });

  app.get('/api/ctr/historico', authMiddleware, async (_req, res) => {
    try {
      const result = await libsqlClient.execute('SELECT * FROM ctr_expiradas ORDER BY criado_em DESC LIMIT 50');
      res.json({ sucesso: true, registros: result.rows });
    } catch (err: any) {
      res.status(200).json({ sucesso: false, error: err.message });
    }
  });

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
