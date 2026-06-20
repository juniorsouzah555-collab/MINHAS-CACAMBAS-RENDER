import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { db } from './src/db/index.ts';

const SUPABASE_URL = 'https://rhmgkapdvexzjasvbifd.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJobWdrYXBkdmV4emphc3ZiaWZkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTY1MjA3OSwiZXhwIjoyMDk3MjI4MDc5fQ.uZgF0vW3Q7DpeEqNDgv1ItiwncBwBBaCgpE5CnJ5fIM';
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
