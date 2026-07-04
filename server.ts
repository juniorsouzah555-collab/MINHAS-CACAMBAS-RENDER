import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import express from "express";
import Groq from 'groq-sdk';
import path from "path";
import jwt from 'jsonwebtoken';
import { createServer as createViteServer } from "vite";
import { db, initializeDatabase } from './src/db/index.ts';
import { initDatabase } from './src/db/init.ts';
import { eq, count } from 'drizzle-orm';
import * as schema from './src/db/schema.ts';
import { INITIAL_VEHICLES, INITIAL_FUEL_LOGS, INITIAL_ALERTS, INITIAL_INVOICES, INITIAL_DISPATCHES, INITIAL_BOTA_FORAS, INITIAL_LANCAMENTOS } from './src/mockData.ts';

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

const JWT_SECRET = process.env.JWT_SECRET || 'relampago-jwt-secret-dev';
const APP_PASSWORD = process.env.APP_PASSWORD || 'admin123';
const DRIVER_PASSWORD = process.env.DRIVER_PASSWORD || 'parceiro123';
const VALID_CREDENTIALS = [APP_PASSWORD, DRIVER_PASSWORD];

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
crud('grupos-conta', schema.gruposConta);
crud('categorias-conta', schema.categoriasConta);
crud('subcategorias-conta', schema.subcategoriasConta);
crud('importacoes-extrato', schema.importacoesExtrato);
crud('extrato-transacoes', schema.extratoTransacoes);
crud('centros-custo', schema.centrosCusto);
crud('conciliacoes', schema.conciliacoes);
crud('regras-categorizacao', schema.regrasCategorizacao);
crud('patrimonio', schema.patrimonio);
crud('planos-pagamento', schema.planosPagamento);
crud('clientes', schema.clientes);
crud('user-approvals', schema.userApprovals);

app.get("/api/vehicles/map", authMiddleware, async (req, res) => {
  try {
    const list = await db.select().from(schema.vehicles);
    const parsed = list.map(v => ({ ...v, trend: v.trend ? JSON.parse(v.trend) : [] }));
    res.json(parsed);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

const KEYWORD_RULES: { words: string[]; categoria: string; subcategoria?: string; centroCusto?: string }[] = [
  { words: ['combustivel', 'diesel', 'gasolina', 'etanol', 'abastec', 'posto', 'shell', 'ipiranga', 'br'], categoria: 'Combustível', subcategoria: 'Diesel S10', centroCusto: 'Frota' },
  { words: ['manutencao', 'oficina', 'mecanico', 'peca', 'pneu', 'oleo', 'troca oleo', 'filtro', 'suspensao', 'freio'], categoria: 'Manutenção de Frota', centroCusto: 'Frota' },
  { words: ['seguro', 'seguradora'], categoria: 'Seguro', centroCusto: 'Frota' },
  { words: ['ipva', 'licenciamento', 'detran', 'emplacamento'], categoria: 'IPVA / Licenciamento', centroCusto: 'Frota' },
  { words: ['pedagio', 'sem parar', 'conectcar', 'tag'], categoria: 'Pedágios', centroCusto: 'Operacional' },
  { words: ['salario', 'salário', 'folha', 'proventos', 'holerite'], categoria: 'Salários', centroCusto: 'Administrativo' },
  { words: ['pro labore', 'prolabore'], categoria: 'Pró-Labore', centroCusto: 'Administrativo' },
  { words: ['aluguel', 'locacao imovel'], categoria: 'Aluguel', centroCusto: 'Administrativo' },
  { words: ['agua', 'luz', 'energia', 'telefone', 'celular', 'concessionaria'], categoria: 'Água, Luz, Telefone', centroCusto: 'Administrativo' },
  { words: ['internet', 'ti', 'sistema', 'software', 'hospedagem', 'dominio', 'saas'], categoria: 'Internet / TI', centroCusto: 'Administrativo' },
  { words: ['escritorio', 'material', 'papelaria', 'impressao'], categoria: 'Material de Escritório', centroCusto: 'Administrativo' },
  { words: ['marketing', 'publicidade', 'anuncio', 'google ads', 'facebook', 'instagram', 'divulgacao'], categoria: 'Marketing', centroCusto: 'Vendas' },
  { words: ['comissao', 'comissão'], categoria: 'Comissões', centroCusto: 'Vendas' },
  { words: ['tarifa', 'taxa bancaria', 'cora', 'custo cartao', 'maquininha', 'anel', 'ted', 'doc', 'pix'], categoria: 'Tarifas Bancárias', centroCusto: 'Administrativo' },
  { words: ['juros', 'multa atraso', 'encargos'], categoria: 'Juros', centroCusto: 'Administrativo' },
  { words: ['simples nacional', 'das', 'fgts', 'inss', 'irpj', 'csll', 'pis', 'cofins'], categoria: 'Simples Nacional', centroCusto: 'Administrativo' },
  { words: ['iss', 'issqn'], categoria: 'ISS', centroCusto: 'Administrativo' },
  { words: ['recebimento', 'pagamento cliente', 'transferencia recebida', 'servico prestado'], categoria: 'Receita de Serviços', centroCusto: 'Operacional' },
  { words: ['locacao cacamba', 'aluguel cacamba', 'cacamba'], categoria: 'Locação de Caçambas', centroCusto: 'Operacional' },
  { words: ['transporte', 'descarte', 'aterra', 'residuo', 'entulho'], categoria: 'Transporte e Descarte', centroCusto: 'Operacional' },
  { words: ['multa', 'infracao', 'transito'], categoria: 'Outras Receitas', centroCusto: 'Administrativo' },
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
  const cache = new Map<string, { categoria: string; subcategoria: string | null; centroCusto: string | null }>();
  const groqKey = process.env.GROQ_API_KEY;
  if (groqKey) {
    try {
      const groq = new Groq({ apiKey: groqKey });
      const catsStr = (catsList || []).join(',') || 'N/A';
      const subsStr = (subsList || []).join(',') || 'N/A';
      const ccsStr = (ccsList || []).join(',') || 'N/A';
      const batchPrompt = transacoes.map((t: any) => `ID:${t.id} | "${t.descricao}" | R$${t.valor} | ${t.tipo}`).join('\n');
      const systemPrompt = `Você é um categorizador financeiro brasileiro. Para cada transação, responda APENAS um JSON array de objetos com {id, c, s, cc}. c = categoria (escolha entre: ${catsStr}) s = subcategoria (escolha entre: ${subsStr}) ou null cc = centro de custo (escolha entre: ${ccsStr}) ou null Se não houver match, use c = "PENDENTE", s = null, cc = null.`;
      const response = await groq.chat.completions.create({ model: 'llama-3.3-70b-versatile', messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: batchPrompt }], temperature: 0.1, max_tokens: 4096 });
      const rawText = response.choices?.[0]?.message?.content || '';
      if (rawText) {
        const cleaned = rawText.replace(/```json?\s*/g, '').replace(/```\s*/g, '').trim();
        const parsed = JSON.parse(cleaned);
        if (Array.isArray(parsed)) {
          for (const item of parsed) {
            if (item.id && item.c) {
              const key = (transacoes.find((t: any) => t.id === item.id)?.descricao || '').toLowerCase().trim();
              cache.set(key, { categoria: item.c !== 'PENDENTE' ? item.c : 'PENDENTE', subcategoria: item.s || null, centroCusto: item.cc || null });
            }
          }
        }
      }
    } catch (e) { console.error('[GROQ] error, falling back to local:', (e as any)?.message || e); }
  }
  const results = transacoes.map((t: any) => {
    const key = (t.descricao || '').toLowerCase().trim();
    if (cache.has(key)) return { id: t.id, ...cache.get(key)! };
    const result = localCategorize(t.descricao);
    cache.set(key, result);
    return { id: t.id, ...result };
  });
  res.json({ results });
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
