import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import express from "express";
import Groq from 'groq-sdk';
import path from "path";
import { createServer as createViteServer } from "vite";
import { db } from './src/db/index.ts';

const SUPABASE_URL = 'https://wxxyvsidghvidqbypmmp.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4eHl2c2lkZ2h2aWRxYnlwbW1wIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MjE3MDk3NCwiZXhwIjoyMDk3NzQ2OTc0fQ.W-_oZBbh63zechy6uj43lHlTiqIqMIrTscyWxsT-_RI';
import { 
  vehicles as vehiclesTable, 
  fuelLogs as fuelLogsTable, 
  maintenanceAlerts as alertsTable, 
  invoices as invoicesTable, 
  dispatches as dispatchesTable, 
  botaForas as botaForasTable, 
  lancamentos as lancamentosTable 
} from './src/db/schema.ts';
import { count, eq } from 'drizzle-orm';

// Mock initial data to seed database
import { 
  INITIAL_VEHICLES, 
  INITIAL_FUEL_LOGS, 
  INITIAL_ALERTS, 
  INITIAL_INVOICES, 
  INITIAL_DISPATCHES, 
  INITIAL_BOTA_FORAS, 
  INITIAL_LANCAMENTOS 
} from './src/mockData.ts';

const app = express();
const PORT = 3000;

app.use(express.json());

// API controller paths
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", database: "connected" });
});

// In-memory database fallback when PostgreSQL connection is down/unconfigured
let useMemoryDb = !process.env.SQL_HOST;

const memoryVehicles = [...INITIAL_VEHICLES];
const memoryFuelLogs = [...INITIAL_FUEL_LOGS];
const memoryAlerts = [...INITIAL_ALERTS];
const memoryInvoices = [...INITIAL_INVOICES];
const memoryDispatches = [...INITIAL_DISPATCHES];
const memoryBotaForas = [...INITIAL_BOTA_FORAS];
const memoryLancamentos = [...INITIAL_LANCAMENTOS];

// Seed database on demand or during startup if DB is empty
async function seedDatabaseIfEmpty() {
  if (useMemoryDb) {
    console.log("Memory DB fallback active. Skipping Postgres seeding.");
    return;
  }
  try {
    const counts = await db.select({ value: count() }).from(vehiclesTable);
    if (!counts || counts[0].value === 0) {
      console.log("Database tables are empty. Seeding initial fleet data...");

      // Seed Vehicles
      for (const vehicle of INITIAL_VEHICLES) {
        await db.insert(vehiclesTable).values({
          id: vehicle.id,
          status: vehicle.status,
          efficiency: vehicle.efficiency,
          fuelUsed: vehicle.fuelUsed,
          costPerKm: vehicle.costPerKm,
          driver: vehicle.driver,
          trend: JSON.stringify(vehicle.trend),
          lastMaintenanceDate: vehicle.lastMaintenanceDate || null,
          speed: vehicle.speed || 0,
          lat: vehicle.lat,
          lng: vehicle.lng,
          isActive: vehicle.isActive,
          type: vehicle.type || 'Caminhão',
          initialKm: vehicle.initialKm || null,
        });
      }

      // Seed Bota Foras
      for (const bf of INITIAL_BOTA_FORAS) {
        await db.insert(botaForasTable).values({
          id: bf.id,
          nome: bf.nome,
          cnpj: bf.cnpj,
          telefone: bf.telefone,
          endereco: bf.endereco,
          valorPadraoDescarte: bf.valorPadraoDescarte || null,
        });
      }

      // Seed Lancamentos
      for (const lan of INITIAL_LANCAMENTOS) {
        await db.insert(lancamentosTable).values({
          id: lan.id,
          botaForaId: lan.botaForaId,
          botaForaNome: lan.botaForaNome,
          quantidadeCacambas: lan.quantidadeCacambas,
          valor: lan.valor,
          data: lan.data,
          driverName: lan.driverName || null,
          vehicleId: lan.vehicleId || null,
          status: lan.status,
        });
      }

      // Seed Fuel Logs
      for (const fuel of INITIAL_FUEL_LOGS) {
        await db.insert(fuelLogsTable).values({
          id: fuel.id,
          vehicleId: fuel.vehicleId,
          quantidadeLitros: fuel.quantidadeLitros,
          kmInicial: fuel.kmInicial || null,
          kmFinal: fuel.kmFinal || null,
          valorPago: fuel.valorPago,
          data: fuel.data,
          driver: fuel.driver || null,
          mediaKmL: fuel.mediaKmL || null,
          tipo: fuel.tipo || 'POSTO',
          isRetiradaDiversa: fuel.isRetiradaDiversa || false,
        });
      }

      // Seed Invoices
      for (const inv of INITIAL_INVOICES) {
        await db.insert(invoicesTable).values({
          id: inv.id,
          clientName: inv.clientName,
          entityCode: inv.entityCode,
          serviceDesc: inv.serviceDesc,
          issueDate: inv.issueDate,
          dueDate: inv.dueDate,
          amount: inv.amount,
          status: inv.status,
        });
      }

      // Seed Dispatches
      for (const disp of INITIAL_DISPATCHES) {
        await db.insert(dispatchesTable).values({
          id: disp.id,
          vehicleId: disp.vehicleId,
          driverName: disp.driverName,
          clientName: disp.clientName,
          origin: disp.origin,
          destination: disp.destination,
          payloadType: disp.payloadType,
          weight: disp.weight,
          status: disp.status,
        });
      }

      // Seed Maintenance Alerts
      for (const alert of INITIAL_ALERTS) {
        await db.insert(alertsTable).values({
          id: alert.id,
          vehicleId: alert.vehicleId,
          title: alert.title,
          message: alert.message,
          timeAgo: alert.timeAgo,
          severity: alert.severity,
          type: alert.type,
          resolved: alert.resolved,
        });
      }

      console.log("Database seeded successfully with initial fleet data!");
    }
  } catch (error) {
    console.error("Failed to seed database on startup, falling back to Memory DB:", error);
    useMemoryDb = true;
  }
}

// REST Endpoints to synchronize state securely

// Vehicles Endpoints
app.get("/api/vehicles", async (req, res) => {
  try {
    if (useMemoryDb) {
      return res.json(memoryVehicles);
    }
    const list = await db.select().from(vehiclesTable);
    const parsed = list.map(v => ({
      ...v,
      trend: v.trend ? JSON.parse(v.trend) : []
    }));
    res.json(parsed);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/vehicles", async (req, res) => {
  try {
    const v = req.body;
    if (useMemoryDb) {
      const idx = memoryVehicles.findIndex(item => item.id === v.id);
      if (idx !== -1) {
        memoryVehicles[idx] = { ...memoryVehicles[idx], ...v };
      } else {
        memoryVehicles.push(v);
      }
      return res.json({ success: true, vehicle: v });
    }
    await db.insert(vehiclesTable).values({
      id: v.id,
      status: v.status || 'Available',
      efficiency: Number(v.efficiency) || 0,
      fuelUsed: Number(v.fuelUsed) || 0,
      costPerKm: Number(v.costPerKm) || 0,
      driver: v.driver || 'Não Atribuído',
      trend: JSON.stringify(v.trend || []),
      lastMaintenanceDate: v.lastMaintenanceDate || null,
      speed: Number(v.speed) || 0,
      lat: Number(v.lat) || 0,
      lng: Number(v.lng) || 0,
      isActive: v.isActive !== false,
      type: v.type || 'Caminhão',
      initialKm: Number(v.initialKm) || 0,
    });
    res.json({ success: true, vehicle: v });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// Bota Foras Endpoints
app.get("/api/botaforas", async (req, res) => {
  try {
    if (useMemoryDb) {
      return res.json(memoryBotaForas);
    }
    const list = await db.select().from(botaForasTable);
    res.json(list);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/botaforas", async (req, res) => {
  try {
    const bf = req.body;
    if (useMemoryDb) {
      memoryBotaForas.push(bf);
      return res.json({ success: true, botafora: bf });
    }
    await db.insert(botaForasTable).values({
      id: bf.id,
      nome: bf.nome,
      cnpj: bf.cnpj,
      telefone: bf.telefone,
      endereco: bf.endereco,
      valorPadraoDescarte: bf.valorPadraoDescarte ? Number(bf.valorPadraoDescarte) : null,
    });
    res.json({ success: true, botafora: bf });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// Lancamentos Endpoints
app.get("/api/lancamentos", async (req, res) => {
  try {
    if (useMemoryDb) {
      return res.json(memoryLancamentos);
    }
    const list = await db.select().from(lancamentosTable);
    res.json(list);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/lancamentos", async (req, res) => {
  try {
    const lan = req.body;
    if (useMemoryDb) {
      memoryLancamentos.push(lan);
      if (lan.vehicleId) {
        const vehicle = memoryVehicles.find(v => v.id === lan.vehicleId);
        if (vehicle) {
          vehicle.status = 'In Transit';
          vehicle.speed = 55;
          vehicle.lat = Math.floor(100 + Math.random() * 150);
          vehicle.lng = Math.floor(250 + Math.random() * 600);
        }
      }
      return res.json({ success: true, lancamento: lan });
    }
    await db.insert(lancamentosTable).values({
      id: lan.id,
      botaForaId: lan.botaForaId,
      botaForaNome: lan.botaForaNome,
      quantidadeCacambas: Number(lan.quantidadeCacambas),
      valor: Number(lan.valor),
      data: lan.data,
      driverName: lan.driverName || null,
      vehicleId: lan.vehicleId || null,
      status: lan.status || 'Concluido',
      lat: lan.lat !== undefined ? Number(lan.lat) : null,
      lng: lan.lng !== undefined ? Number(lan.lng) : null,
    });
    res.json({ success: true, lancamento: lan });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// Fuel Logs Endpoints
app.get("/api/fuel-logs", async (req, res) => {
  try {
    if (useMemoryDb) {
      return res.json(memoryFuelLogs);
    }
    const list = await db.select().from(fuelLogsTable);
    res.json(list);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/fuel-logs", async (req, res) => {
  try {
    const f = req.body;
    if (useMemoryDb) {
      memoryFuelLogs.push(f);
      return res.json({ success: true, log: f });
    }
    await db.insert(fuelLogsTable).values({
      id: f.id,
      vehicleId: f.vehicleId,
      quantidadeLitros: Number(f.quantidadeLitros),
      kmInicial: f.kmInicial ? Number(f.kmInicial) : null,
      kmFinal: f.kmFinal ? Number(f.kmFinal) : null,
      valorPago: Number(f.valorPago),
      data: f.data,
      driver: f.driver || null,
      mediaKmL: f.mediaKmL ? Number(f.mediaKmL) : null,
      tipo: f.tipo || 'POSTO',
      isRetiradaDiversa: f.isRetiradaDiversa || false,
      lat: f.lat !== undefined ? Number(f.lat) : null,
      lng: f.lng !== undefined ? Number(f.lng) : null,
    });
    res.json({ success: true, log: f });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// Alerts Endpoints
app.get("/api/alerts", async (req, res) => {
  try {
    if (useMemoryDb) {
      return res.json(memoryAlerts);
    }
    const list = await db.select().from(alertsTable);
    res.json(list);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// Invoices Endpoints
app.get("/api/invoices", async (req, res) => {
  try {
    if (useMemoryDb) {
      return res.json(memoryInvoices);
    }
    const list = await db.select().from(invoicesTable);
    res.json(list);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/invoices", async (req, res) => {
  try {
    const inv = req.body;
    if (useMemoryDb) {
      memoryInvoices.push(inv);
      return res.json({ success: true, invoice: inv });
    }
    await db.insert(invoicesTable).values({
      id: inv.id,
      clientName: inv.clientName,
      entityCode: inv.entityCode,
      serviceDesc: inv.serviceDesc,
      issueDate: inv.issueDate,
      dueDate: inv.dueDate,
      amount: Number(inv.amount),
      status: inv.status || 'PENDING',
    });
    res.json({ success: true, invoice: inv });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// Dispatched Endpoints
app.get("/api/dispatches", async (req, res) => {
  try {
    if (useMemoryDb) {
      return res.json(memoryDispatches);
    }
    const list = await db.select().from(dispatchesTable);
    res.json(list);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/dispatches", async (req, res) => {
  try {
    const d = req.body;
    if (useMemoryDb) {
      memoryDispatches.push(d);
      const vehicle = memoryVehicles.find(v => v.id === d.vehicleId);
      if (vehicle) {
        vehicle.status = 'In Transit';
        vehicle.speed = 62;
        vehicle.lat = Math.floor(100 + Math.random() * 150);
        vehicle.lng = Math.floor(250 + Math.random() * 600);
      }
      return res.json({ success: true, dispatch: d });
    }
    await db.insert(dispatchesTable).values({
      id: d.id,
      vehicleId: d.vehicleId,
      driverName: d.driverName,
      clientName: d.clientName,
      origin: d.origin,
      destination: d.destination,
      payloadType: d.payloadType,
      weight: Number(d.weight),
      status: d.status || 'Assigned',
    });
    res.json({ success: true, dispatch: d });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ─── Auth API endpoints (proxy for Supabase Admin API) ───

// Busca um usuário pelo email na lista de usuários do Supabase Auth
async function getUserIdByEmail(email: string): Promise<string | null> {
  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
      headers: { 'apikey': SERVICE_ROLE_KEY, 'Authorization': `Bearer ${SERVICE_ROLE_KEY}` }
    });
    if (!res.ok) return null;
    const data = await res.json();
    const user = (data?.users || []).find((u: any) => u.email?.toLowerCase() === email.toLowerCase());
    return user?.id || null;
  } catch { return null; }
}

// Endpoint: confirmar email de um usuário (por email — faz lookup)
app.post('/api/auth/confirm-email', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email é obrigatório' });
  try {
    const userId = await getUserIdByEmail(email);
    if (!userId) return res.json({ ok: false, error: 'Usuário não encontrado no Auth' });
    const r = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${userId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`
      },
      body: JSON.stringify({ email_confirm: true })
    });
    res.json({ ok: r.ok });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// Endpoint: criar usuário já confirmado via Admin API (não depende de SMTP)
app.post('/api/auth/signup', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email e senha são obrigatórios' });
  try {
    const r = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`
      },
      body: JSON.stringify({ email, password, email_confirm: true })
    });
    const data = await r.json();
    res.json({ ok: r.ok, userId: data?.id || null, error: data?.msg || null });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// Endpoint: deletar um usuário de user_approvals (usa service_role, sem RLS)
app.post('/api/auth/delete-user', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email é obrigatório' });
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/user_approvals?email=eq.${encodeURIComponent(email)}`, {
      method: 'DELETE',
      headers: {
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'Prefer': 'return=minimal'
      }
    });
    res.json({ ok: r.ok });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// Endpoint: confirmar email por userId (mais confiável, sem lookup)
app.post('/api/auth/confirm-user', async (req, res) => {
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ error: 'userId é obrigatório' });
  try {
    const r = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${userId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`
      },
      body: JSON.stringify({ email_confirm: true })
    });
    res.json({ ok: r.ok });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// Endpoint: atualizar senha + confirmar email
app.post('/api/auth/update-password', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email e senha são obrigatórios' });
  try {
    const userId = await getUserIdByEmail(email);
    if (!userId) return res.json({ ok: false, error: 'Usuário não encontrado no Auth' });
    const r = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${userId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`
      },
      body: JSON.stringify({ password, email_confirm: true })
    });
    res.json({ ok: r.ok });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ─── Bancário: Patrimônio ───
interface PatrimonioItem {
  id: string; nome: string; tipo: string; dataAquisicao: string;
  valorAquisicao: number; valorResidual: number; vidaUtil: number;
  depreciacaoAnual: number; depreciacaoAcumulada: number; valorContabil: number;
  localizacao?: string; observacao?: string; createdAt: string;
}
const memoryPatrimonio: PatrimonioItem[] = [];

app.get('/api/bancario/patrimonio', (req, res) => res.json(memoryPatrimonio));
app.post('/api/bancario/patrimonio', (req, res) => {
  const p: PatrimonioItem = { ...req.body };
  memoryPatrimonio.push(p);
  res.json({ success: true, item: p });
});
app.delete('/api/bancario/patrimonio/:id', (req, res) => {
  const idx = memoryPatrimonio.findIndex(p => p.id === req.params.id);
  if (idx !== -1) memoryPatrimonio.splice(idx, 1);
  res.json({ success: true });
});

// ─── Bancário: Planos ───
interface PlanoItem {
  id: string; descricao: string; instituicao?: string;
  valorTotal: number; numeroParcelas: number; parcelasPagas: number;
  valorParcela: number; dataInicio: string; dataFim?: string;
  categoria?: string; subcategoria?: string;
  status: string; mostrarDashboard: boolean; createdAt: string;
}
const memoryPlanos: PlanoItem[] = [];

app.get('/api/bancario/planos', (req, res) => res.json(memoryPlanos));
app.post('/api/bancario/planos', (req, res) => {
  const p: PlanoItem = { ...req.body };
  memoryPlanos.push(p);
  res.json({ success: true, plano: p });
});
app.delete('/api/bancario/planos/:id', (req, res) => {
  const idx = memoryPlanos.findIndex(p => p.id === req.params.id);
  if (idx !== -1) memoryPlanos.splice(idx, 1);
  res.json({ success: true });
});

// ─── Bancário: Clientes ───
interface ClienteItem {
  id: string; tipo: string; nome: string; documento: string;
  telefone: string; email?: string; endereco?: string;
  observacao?: string; createdAt: string;
}
const memoryClientes: ClienteItem[] = [];

app.get('/api/bancario/clientes', (req, res) => res.json(memoryClientes));
app.post('/api/bancario/clientes', (req, res) => {
  const c: ClienteItem = { ...req.body };
  memoryClientes.push(c);
  res.json({ success: true, cliente: c });
});
app.delete('/api/bancario/clientes/:id', (req, res) => {
  const idx = memoryClientes.findIndex(c => c.id === req.params.id);
  if (idx !== -1) memoryClientes.splice(idx, 1);
  res.json({ success: true });
});

// ─── Bancário: Categorização local + IA ───
// Mapa de palavras-chave → categoria/subcategoria/centro de custo
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

app.post('/api/bancario/categorize', async (req, res) => {
  const { transacoes, categorias: catsList, subcategorias: subsList, centrosCusto: ccsList } = req.body;
  if (!transacoes || !Array.isArray(transacoes) || transacoes.length === 0) {
    return res.status(400).json({ error: 'transacoes array is required' });
  }

  const cache = new Map<string, { categoria: string; subcategoria: string | null; centroCusto: string | null }>();

  // Tenta Groq (6000 req/min, limite generoso)
  const groqKey = process.env.GROQ_API_KEY;
  if (groqKey) {
    try {
      const groq = new Groq({ apiKey: groqKey });
      const catsStr = (catsList || []).join(',') || 'N/A';
      const subsStr = (subsList || []).join(',') || 'N/A';
      const ccsStr = (ccsList || []).join(',') || 'N/A';

      const batchPrompt = transacoes.map((t: any) =>
        `ID:${t.id} | "${t.descricao}" | R$${t.valor} | ${t.tipo}`
      ).join('\n');

      const systemPrompt = `Você é um categorizador financeiro brasileiro. Para cada transação, responda APENAS um JSON array de objetos com {id, c, s, cc}.
c = categoria (escolha entre: ${catsStr})
s = subcategoria (escolha entre: ${subsStr}) ou null
cc = centro de custo (escolha entre: ${ccsStr}) ou null
Se não houver match, use c = "PENDENTE", s = null, cc = null.`;

      const response = await groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: batchPrompt },
        ],
        temperature: 0.1,
        max_tokens: 4096,
      });

      const rawText = response.choices?.[0]?.message?.content || '';
      if (rawText) {
        const cleaned = rawText.replace(/```json?\s*/g, '').replace(/```\s*/g, '').trim();
        const parsed = JSON.parse(cleaned);
        if (Array.isArray(parsed)) {
          for (const item of parsed) {
            if (item.id && item.c) {
              const key = (transacoes.find((t: any) => t.id === item.id)?.descricao || '').toLowerCase().trim();
              cache.set(key, {
                categoria: item.c !== 'PENDENTE' ? item.c : 'PENDENTE',
                subcategoria: item.s || null,
                centroCusto: item.cc || null,
              });
            }
          }
        }
      }
    } catch (e) {
      console.error('[GROQ] error, falling back to local:', (e as any)?.message || e);
    }
  }

  // Preenche o que faltou com matching local
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
  // Call seeder
  await seedDatabaseIfEmpty();

  // Vite middleware for development
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
