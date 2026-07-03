import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import express from "express";
import Groq from 'groq-sdk';
import path from "path";
import jwt from 'jsonwebtoken';
import { createServer as createViteServer } from "vite";
import { db, initializeDatabase } from './src/db/index.ts';
import { initDatabase } from './src/db/init.ts';
import { count } from 'drizzle-orm';
import { vehicles as vehiclesTable, fuelLogs as fuelLogsTable, maintenanceAlerts as alertsTable, invoices as invoicesTable, dispatches as dispatchesTable, botaForas as botaForasTable, lancamentos as lancamentosTable } from './src/db/schema.ts';
import { INITIAL_VEHICLES, INITIAL_FUEL_LOGS, INITIAL_ALERTS, INITIAL_INVOICES, INITIAL_DISPATCHES, INITIAL_BOTA_FORAS, INITIAL_LANCAMENTOS } from './src/mockData.ts';
import { adminDb, adminAuth } from './api/lib/firebase-admin.ts';

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

const JWT_SECRET = process.env.JWT_SECRET || 'relampago-jwt-secret-dev';
const APP_PASSWORD = process.env.APP_PASSWORD || 'admin123';

app.use(express.json());

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
  if (password !== APP_PASSWORD) return res.status(401).json({ error: 'Invalid password' });
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
    const counts = await db.select({ value: count() }).from(vehiclesTable);
    if (!counts || counts[0].value === 0) {
      console.log("Seeding initial fleet data...");
      for (const vehicle of INITIAL_VEHICLES) {
        await db.insert(vehiclesTable).values({
          id: vehicle.id, status: vehicle.status, efficiency: vehicle.efficiency,
          fuelUsed: vehicle.fuelUsed, costPerKm: vehicle.costPerKm, driver: vehicle.driver,
          trend: JSON.stringify(vehicle.trend), lastMaintenanceDate: vehicle.lastMaintenanceDate || null,
          speed: vehicle.speed || 0, lat: vehicle.lat, lng: vehicle.lng,
          isActive: vehicle.isActive, type: vehicle.type || 'Caminhão', initialKm: vehicle.initialKm || null,
        });
      }
      for (const bf of INITIAL_BOTA_FORAS) {
        await db.insert(botaForasTable).values({
          id: bf.id, nome: bf.nome, cnpj: bf.cnpj, telefone: bf.telefone,
          endereco: bf.endereco, valorPadraoDescarte: bf.valorPadraoDescarte || null,
        });
      }
      for (const lan of INITIAL_LANCAMENTOS) {
        await db.insert(lancamentosTable).values({
          id: lan.id, botaForaId: lan.botaForaId, botaForaNome: lan.botaForaNome,
          quantidadeCacambas: lan.quantidadeCacambas, valor: lan.valor, data: lan.data,
          driverName: lan.driverName || null, vehicleId: lan.vehicleId || null, status: lan.status,
        });
      }
      for (const fuel of INITIAL_FUEL_LOGS) {
        await db.insert(fuelLogsTable).values({
          id: fuel.id, vehicleId: fuel.vehicleId, quantidadeLitros: fuel.quantidadeLitros,
          kmInicial: fuel.kmInicial || null, kmFinal: fuel.kmFinal || null, valorPago: fuel.valorPago,
          data: fuel.data, driver: fuel.driver || null, mediaKmL: fuel.mediaKmL || null,
          tipo: fuel.tipo || 'POSTO', isRetiradaDiversa: fuel.isRetiradaDiversa || false,
        });
      }
      for (const inv of INITIAL_INVOICES) {
        await db.insert(invoicesTable).values({
          id: inv.id, clientName: inv.clientName, entityCode: inv.entityCode,
          serviceDesc: inv.serviceDesc, issueDate: inv.issueDate, dueDate: inv.dueDate,
          amount: inv.amount, status: inv.status,
        });
      }
      for (const disp of INITIAL_DISPATCHES) {
        await db.insert(dispatchesTable).values({
          id: disp.id, vehicleId: disp.vehicleId, driverName: disp.driverName,
          clientName: disp.clientName, origin: disp.origin, destination: disp.destination,
          payloadType: disp.payloadType, weight: disp.weight, status: disp.status,
        });
      }
      for (const alert of INITIAL_ALERTS) {
        await db.insert(alertsTable).values({
          id: alert.id, vehicleId: alert.vehicleId, title: alert.title, message: alert.message,
          timeAgo: alert.timeAgo, severity: alert.severity, type: alert.type, resolved: alert.resolved,
        });
      }
      console.log("Database seeded successfully!");
    }
  } catch (error) {
    console.error("Failed to seed database:", error);
  }
}

app.post('/api/auth/signup', authMiddleware, async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ ok: false, error: 'email and password required' });
    const user = await adminAuth.createUser({ email, password });
    res.json({ ok: true, userId: user.uid });
  } catch (e: any) { res.json({ ok: false, error: e.message }); }
});

app.post('/api/auth/confirm-email', authMiddleware, async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ ok: false });
    const user = await adminAuth.getUserByEmail(email);
    if (!user) return res.json({ ok: false });
    await adminAuth.updateUser(user.uid, { emailVerified: true });
    res.json({ ok: true });
  } catch { res.json({ ok: false }); }
});

app.post('/api/auth/confirm-user', authMiddleware, async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ ok: false });
    await adminAuth.updateUser(userId, { emailVerified: true });
    res.json({ ok: true });
  } catch { res.json({ ok: false }); }
});

app.post('/api/auth/delete-user', authMiddleware, async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ ok: false });
    const user = await adminAuth.getUserByEmail(email);
    if (user) await adminAuth.deleteUser(user.uid);
    res.json({ ok: true });
  } catch { res.json({ ok: false }); }
});

app.post('/api/auth/update-password', authMiddleware, async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ ok: false });
    const user = await adminAuth.getUserByEmail(email);
    if (!user) return res.json({ ok: false });
    await adminAuth.updateUser(user.uid, { password });
    res.json({ ok: true });
  } catch { res.json({ ok: false }); }
});

app.post('/api/auth/link-driver', authMiddleware, async (req, res) => {
  try {
    const { email, linkedDriver } = req.body;
    if (!email || !linkedDriver) return res.status(400).json({ ok: false });
    const user = await adminAuth.getUserByEmail(email);
    if (user) {
      await adminAuth.updateUser(user.uid, { displayName: linkedDriver });
    }
    res.json({ ok: true });
  } catch { res.json({ ok: false }); }
});

app.post('/api/proxy', authMiddleware, async (req, res) => {
  try {
    const { table, action, data, filter } = req.body;
    if (!table || !action) return res.status(400).json({ error: 'table and action required' });

    if (action === 'insert' && data) {
      const id = data.id || crypto.randomUUID();
      await adminDb.collection(table).doc(id).set(data);
      return res.json({ success: true, id });
    }

    if (action === 'update' && data) {
      const id = filter?.split('=')[1] || data.id;
      if (!id) return res.status(400).json({ error: 'id required for update' });
      await adminDb.collection(table).doc(id).set(data);
      return res.json({ success: true });
    }

    if (action === 'delete') {
      const id = filter?.split('=')[1];
      if (!id) return res.status(400).json({ error: 'id required for delete' });
      await adminDb.collection(table).doc(id).delete();
      return res.json({ success: true });
    }

    res.status(400).json({ error: 'invalid action' });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/vehicles", authMiddleware, async (req, res) => {
  try {
    const list = await db.select().from(vehiclesTable);
    const parsed = list.map(v => ({ ...v, trend: v.trend ? JSON.parse(v.trend) : [] }));
    res.json(parsed);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.post("/api/vehicles", authMiddleware, async (req, res) => {
  try {
    const v = req.body;
    await db.insert(vehiclesTable).values({
      id: v.id, status: v.status || 'Available', efficiency: Number(v.efficiency) || 0,
      fuelUsed: Number(v.fuelUsed) || 0, costPerKm: Number(v.costPerKm) || 0,
      driver: v.driver || 'Não Atribuído', trend: JSON.stringify(v.trend || []),
      lastMaintenanceDate: v.lastMaintenanceDate || null, speed: Number(v.speed) || 0,
      lat: Number(v.lat) || 0, lng: Number(v.lng) || 0, isActive: v.isActive !== false,
      type: v.type || 'Caminhão', initialKm: Number(v.initialKm) || 0,
    });
    res.json({ success: true, vehicle: v });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.get("/api/botaforas", authMiddleware, async (req, res) => {
  try { res.json(await db.select().from(botaForasTable)); }
  catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.post("/api/botaforas", authMiddleware, async (req, res) => {
  try {
    const bf = req.body;
    await db.insert(botaForasTable).values({
      id: bf.id, nome: bf.nome, cnpj: bf.cnpj, telefone: bf.telefone, endereco: bf.endereco,
      valorPadraoDescarte: bf.valorPadraoDescarte ? Number(bf.valorPadraoDescarte) : null,
    });
    res.json({ success: true, botafora: bf });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.get("/api/lancamentos", authMiddleware, async (req, res) => {
  try { res.json(await db.select().from(lancamentosTable)); }
  catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.post("/api/lancamentos", authMiddleware, async (req, res) => {
  try {
    const lan = req.body;
    await db.insert(lancamentosTable).values({
      id: lan.id, botaForaId: lan.botaForaId, botaForaNome: lan.botaForaNome,
      quantidadeCacambas: Number(lan.quantidadeCacambas), valor: Number(lan.valor), data: lan.data,
      driverName: lan.driverName || null, vehicleId: lan.vehicleId || null,
      status: lan.status || 'Concluido', lat: lan.lat !== undefined ? Number(lan.lat) : null,
      lng: lan.lng !== undefined ? Number(lan.lng) : null,
    });
    res.json({ success: true, lancamento: lan });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.get("/api/fuel-logs", authMiddleware, async (req, res) => {
  try { res.json(await db.select().from(fuelLogsTable)); }
  catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.post("/api/fuel-logs", authMiddleware, async (req, res) => {
  try {
    const f = req.body;
    await db.insert(fuelLogsTable).values({
      id: f.id, vehicleId: f.vehicleId, quantidadeLitros: Number(f.quantidadeLitros),
      kmInicial: f.kmInicial ? Number(f.kmInicial) : null,
      kmFinal: f.kmFinal ? Number(f.kmFinal) : null, valorPago: Number(f.valorPago), data: f.data,
      driver: f.driver || null, mediaKmL: f.mediaKmL ? Number(f.mediaKmL) : null,
      tipo: f.tipo || 'POSTO', isRetiradaDiversa: f.isRetiradaDiversa || false,
      lat: f.lat !== undefined ? Number(f.lat) : null, lng: f.lng !== undefined ? Number(f.lng) : null,
    });
    res.json({ success: true, log: f });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.get("/api/alerts", authMiddleware, async (req, res) => {
  try { res.json(await db.select().from(alertsTable)); }
  catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.get("/api/invoices", authMiddleware, async (req, res) => {
  try { res.json(await db.select().from(invoicesTable)); }
  catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.post("/api/invoices", authMiddleware, async (req, res) => {
  try {
    const inv = req.body;
    await db.insert(invoicesTable).values({
      id: inv.id, clientName: inv.clientName, entityCode: inv.entityCode,
      serviceDesc: inv.serviceDesc, issueDate: inv.issueDate, dueDate: inv.dueDate,
      amount: Number(inv.amount), status: inv.status || 'PENDING',
    });
    res.json({ success: true, invoice: inv });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.get("/api/dispatches", authMiddleware, async (req, res) => {
  try { res.json(await db.select().from(dispatchesTable)); }
  catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.post("/api/dispatches", authMiddleware, async (req, res) => {
  try {
    const d = req.body;
    await db.insert(dispatchesTable).values({
      id: d.id, vehicleId: d.vehicleId, driverName: d.driverName, clientName: d.clientName,
      origin: d.origin, destination: d.destination, payloadType: d.payloadType,
      weight: Number(d.weight), status: d.status || 'Assigned',
    });
    res.json({ success: true, dispatch: d });
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

const bancarioItems: Record<string, any[]> = {
  patrimonio: [], planos: [], clientes: [],
};

app.get('/api/bancario/:tipo', authMiddleware, (req, res) => {
  res.json(bancarioItems[req.params.tipo] || []);
});

app.post('/api/bancario/:tipo', authMiddleware, (req, res) => {
  const tipo = req.params.tipo;
  if (!bancarioItems[tipo]) bancarioItems[tipo] = [];
  bancarioItems[tipo].push(req.body);
  res.json({ success: true, item: req.body });
});

app.delete('/api/bancario/:tipo/:id', authMiddleware, (req, res) => {
  const tipo = req.params.tipo;
  if (bancarioItems[tipo]) {
    bancarioItems[tipo] = bancarioItems[tipo].filter((p: any) => p.id !== req.params.id);
  }
  res.json({ success: true });
});

async function startServer() {
  await initializeDatabase();
  initDatabase();
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
