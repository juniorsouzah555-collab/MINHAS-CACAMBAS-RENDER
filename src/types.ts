/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface BotaFora {
  id: string;
  nome: string;
  cnpj: string;
  telefone: string;
  endereco: string;
  createdAt: string;
  valorPadraoDescarte?: number;
}

export interface Lancamento {
  id: string;
  botaForaId: string;
  botaForaNome: string;
  quantidadeCacambas: number;
  valor: number;
  data: string;
  driverName?: string;
  vehicleId?: string;
  status: 'Pendente' | 'Concluido';
  createdAt: string;
  lat?: number;
  lng?: number;
  observacao?: string;
}

export interface Vehicle {
  id: string;
  status: 'In Transit' | 'Loading' | 'Maintenance' | 'Available';
  efficiency: number; // in Km/L
  fuelUsed: number;   // MTD in L
  costPerKm: number;  // in USD
  driver: string;
  trend: number[];    // trend data points for rendering Sparklines
  lastMaintenanceDate?: string;
  speed?: number;     // Current speed in km/h
  lng: number;        // coordinate for Map
  lat: number;        // coordinate for Map
  isActive: boolean;
  type?: 'Caminhão' | 'Veículo';
  initialKm?: number;
}

export interface FuelLog {
  id: string;
  vehicleId: string;
  quantidadeLitros: number;
  kmInicial?: number;
  kmFinal?: number;
  valorPago: number;
  data: string;
  driver?: string;
  mediaKmL?: number;
  tipo?: 'POSTO' | 'GARAGEM';
  isRetiradaDiversa?: boolean;
  lat?: number;
  lng?: number;
}

export interface MaintenanceAlert {
  id: string;
  vehicleId: string;
  title: string;
  message: string;
  timeAgo: string;
  severity: 'critical' | 'warning' | 'info';
  type: 'engine' | 'tire' | 'oil' | 'general';
  resolved: boolean;
}

export type InvoiceStatus = 'PENDING' | 'OVERDUE' | 'DRAFT' | 'PAID';

export interface Invoice {
  id: string;
  clientName: string;
  entityCode: string; // e.g. "NM", "GC", etc
  serviceDesc: string;
  issueDate: string;
  dueDate: string;
  amount: number;
  status: InvoiceStatus;
}

export interface Dispatch {
  id: string;
  vehicleId: string;
  driverName: string;
  clientName: string;
  origin: string;
  destination: string;
  payloadType: string;
  weight: number; // in Tons
  status: 'Assigned' | 'In Transit' | 'Completed';
  createdAt: string;
}

export interface DailyFuelData {
  day: string;
  thisWeek: number;
  lastWeek: number;
}

export interface OperatingCostStructure {
  name: string;
  value: number;
  percentage: number;
  color: string;
}

export interface ComissaoMotorista {
  id: string;
  motorista: string;
  vaziasColocadas: number;
  retiradas: number;
  data: string;
  createdAt: string;
  lat?: number;
  lng?: number;
}

