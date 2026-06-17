import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { db } from './src/db/index.ts';
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

// Seed database on demand or during startup if DB is empty
async function seedDatabaseIfEmpty() {
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
    console.error("Failed to seed database on startup:", error);
  }
}

// REST Endpoints to synchronize state securely

// Vehicles Endpoints
app.get("/api/vehicles", async (req, res) => {
  try {
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
    const list = await db.select().from(botaForasTable);
    res.json(list);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/botaforas", async (req, res) => {
  try {
    const bf = req.body;
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
    const list = await db.select().from(lancamentosTable);
    res.json(list);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/lancamentos", async (req, res) => {
  try {
    const lan = req.body;
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
    });
    res.json({ success: true, lancamento: lan });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// Fuel Logs Endpoints
app.get("/api/fuel-logs", async (req, res) => {
  try {
    const list = await db.select().from(fuelLogsTable);
    res.json(list);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/fuel-logs", async (req, res) => {
  try {
    const f = req.body;
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
    });
    res.json({ success: true, log: f });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// Alerts Endpoints
app.get("/api/alerts", async (req, res) => {
  try {
    const list = await db.select().from(alertsTable);
    res.json(list);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// Invoices Endpoints
app.get("/api/invoices", async (req, res) => {
  try {
    const list = await db.select().from(invoicesTable);
    res.json(list);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/invoices", async (req, res) => {
  try {
    const inv = req.body;
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
    const list = await db.select().from(dispatchesTable);
    res.json(list);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/dispatches", async (req, res) => {
  try {
    const d = req.body;
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
