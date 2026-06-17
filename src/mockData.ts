/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Vehicle, FuelLog, MaintenanceAlert, Invoice, DailyFuelData, OperatingCostStructure, Dispatch, BotaFora, Lancamento } from './types';

export const INITIAL_VEHICLES: Vehicle[] = [
  {
    id: 'FLT-8829',
    status: 'In Transit',
    efficiency: 4.2,
    fuelUsed: 1240,
    costPerKm: 1.02,
    driver: 'Carlos Santana',
    trend: [3.8, 3.9, 4.1, 4.0, 4.2],
    speed: 68,
    lat: 150,
    lng: 300,
    isActive: true,
    type: 'Caminhão',
    initialKm: 120500
  },
  {
    id: 'FLT-3112',
    status: 'In Transit',
    efficiency: 3.9,
    fuelUsed: 1480,
    costPerKm: 1.09,
    driver: 'Marcus Warren',
    trend: [3.5, 3.7, 3.6, 3.8, 3.9],
    speed: 72,
    lat: 200,
    lng: 800,
    isActive: true,
    type: 'Caminhão',
    initialKm: 145200
  },
  {
    id: 'FLT-5541',
    status: 'Loading',
    efficiency: 3.1,
    fuelUsed: 1120,
    costPerKm: 1.34,
    driver: 'Sophia Loren',
    trend: [3.4, 3.2, 3.3, 3.1, 3.1],
    speed: 0,
    lat: 250,
    lng: 450,
    isActive: true,
    type: 'Caminhão',
    initialKm: 98100
  },
  {
    id: 'FLT-0922',
    status: 'Maintenance',
    efficiency: 2.4,
    fuelUsed: 2105,
    costPerKm: 1.88,
    driver: 'Arthur Pendragon',
    trend: [3.0, 2.8, 2.7, 2.5, 2.4],
    speed: 0,
    lat: 200,
    lng: 500,
    isActive: true,
    type: 'Veículo',
    initialKm: 76400
  },
  {
    id: 'FLT-7721',
    status: 'In Transit',
    efficiency: 3.5,
    fuelUsed: 1310,
    costPerKm: 1.18,
    driver: 'Emily Watson',
    trend: [3.5, 3.5, 3.6, 3.5, 3.5],
    speed: 55,
    lat: 120,
    lng: 950,
    isActive: true,
    type: 'Caminhão',
    initialKm: 110200
  },
  {
    id: 'FLT-4402',
    status: 'Available',
    efficiency: 3.8,
    fuelUsed: 980,
    costPerKm: 1.12,
    driver: 'Jackson Briggs',
    trend: [3.6, 3.7, 3.7, 3.8, 3.8],
    speed: 0,
    lat: 280,
    lng: 150,
    isActive: true,
    type: 'Veículo',
    initialKm: 55100
  }
];

export const INITIAL_FUEL_LOGS: FuelLog[] = [
  {
    id: 'F-101',
    vehicleId: 'FLT-8829',
    quantidadeLitros: 150,
    kmInicial: 120500,
    kmFinal: 121130, // 630 km run. 630 / 150 = 4.2 Km/L
    valorPago: 825.00,
    data: '2026-06-15',
    driver: 'Carlos Santana',
    mediaKmL: 4.2
  },
  {
    id: 'F-102',
    vehicleId: 'FLT-3112',
    quantidadeLitros: 200,
    kmInicial: 145200,
    kmFinal: 145980, // 780 km run. 780 / 200 = 3.9 Km/L
    valorPago: 1100.00,
    data: '2026-06-14',
    driver: 'Marcus Warren',
    mediaKmL: 3.9
  },
  {
    id: 'F-103',
    vehicleId: 'FLT-5541',
    quantidadeLitros: 180,
    kmInicial: 98100,
    kmFinal: 98658, // 558 km run. 558 / 180 = 3.1 Km/L
    valorPago: 990.00,
    data: '2026-06-12',
    driver: 'Sophia Loren',
    mediaKmL: 3.1
  }
];

export const INITIAL_ALERTS: MaintenanceAlert[] = [
  {
    id: 'ALT-101',
    vehicleId: 'FLT-0922',
    title: 'FLT-0922: Aquecimento Crítico do Motor',
    message: 'Alerta de superaquecimento ativado há 12 min. Manutenção necessária de imediato.',
    timeAgo: 'Há 12 min',
    severity: 'critical',
    type: 'engine',
    resolved: false
  },
  {
    id: 'ALT-102',
    vehicleId: 'FLT-4402',
    title: 'FLT-4402: Pressão Baixa nos Pneus',
    message: 'Pneu frontal esquerdo com 28 PSI. Agendado para inspeção ao fim do expediente.',
    timeAgo: 'Há 1h',
    severity: 'warning',
    type: 'tire',
    resolved: false
  },
  {
    id: 'ALT-103',
    vehicleId: 'FLT-8829',
    title: 'FLT-8829: Prazo de Troca de Óleo',
    message: 'Próxima manutenção necessária em 450 Km. Recomendação: Agendar para sexta-feira.',
    timeAgo: 'Há 3h',
    severity: 'info',
    type: 'oil',
    resolved: false
  }
];

export const INITIAL_INVOICES: Invoice[] = [
  {
    id: '#INV-2023-1042',
    clientName: 'Consórcio Municipal Norte',
    entityCode: 'MN',
    serviceDesc: 'Contrato de Serviço #982',
    issueDate: '12 Out, 2023',
    dueDate: '12 Nov, 2023',
    amount: 12450.00,
    status: 'PENDING'
  },
  {
    id: '#INV-2023-1045',
    clientName: 'GreenCycle Inc.',
    entityCode: 'GC',
    serviceDesc: 'Ordem de Descarte em Lote',
    issueDate: '14 Out, 2023',
    dueDate: '28 Out, 2023',
    amount: 5200.00,
    status: 'OVERDUE'
  },
  {
    id: '#INV-2023-1051',
    clientName: 'Distrito Ambiental Lakeside',
    entityCode: 'AL',
    serviceDesc: 'Manutenção Sazonal',
    issueDate: '20 Out, 2023',
    dueDate: '20 Nov, 2023',
    amount: 8900.00,
    status: 'PENDING'
  },
  {
    id: '#INV-2023-1055',
    clientName: 'Indústrias Titan',
    entityCode: 'IT',
    serviceDesc: 'Descarte de Resíduos Perigosos',
    issueDate: '22 Out, 2023',
    dueDate: '22 Nov, 2023',
    amount: 24320.00,
    status: 'DRAFT'
  },
  {
    id: '#INV-2023-1021',
    clientName: 'Apex Logística S/A',
    entityCode: 'AX',
    serviceDesc: 'Taxa de Combustível Multifrota',
    issueDate: '02 Out, 2023',
    dueDate: '02 Nov, 2023',
    amount: 15400.00,
    status: 'PAID'
  },
  {
    id: '#INV-2023-1033',
    clientName: 'Metro Saneamento',
    entityCode: 'MS',
    serviceDesc: 'Taxa de Descarte em Aterro',
    issueDate: '08 Out, 2023',
    dueDate: '08 Nov, 2023',
    amount: 32000.00,
    status: 'PAID'
  }
];

export const INITIAL_DISPATCHES: Dispatch[] = [
  {
    id: 'DISP-401',
    vehicleId: 'FLT-8829',
    driverName: 'Carlos Santana',
    clientName: 'Consórcio Municipal Norte',
    origin: 'Unidade A (Centro)',
    destination: 'Aterro do Setor 4',
    payloadType: 'Reciclados Padrão',
    weight: 8.5,
    status: 'In Transit',
    createdAt: '2026-06-16T08:30:00Z'
  },
  {
    id: 'DISP-402',
    vehicleId: 'FLT-3112',
    driverName: 'Marcus Warren',
    clientName: 'GreenCycle Inc.',
    origin: 'Estação de Transbordo Principal',
    destination: 'Usina de Biogás',
    payloadType: 'Resíduos Orgânicos',
    weight: 12.2,
    status: 'In Transit',
    createdAt: '2026-06-16T09:15:00Z'
  }
];

export const FUEL_TREND_DATA: DailyFuelData[] = [
  { day: 'SEG', thisWeek: 32, lastWeek: 24 },
  { day: 'TER', thisWeek: 20, lastWeek: 28 },
  { day: 'QUA', thisWeek: 40, lastWeek: 32 },
  { day: 'QUI', thisWeek: 24, lastWeek: 20 },
  { day: 'SEX', thisWeek: 36, lastWeek: 36 },
  { day: 'SÁB', thisWeek: 8, lastWeek: 12 }
];

export const COST_STRUCTURE_DATA: OperatingCostStructure[] = [
  { name: 'Combustível', value: 74000, percentage: 50, color: '#004ac6' },
  { name: 'Manutenção', value: 37000, percentage: 25, color: '#006e2d' },
  { name: 'Pedágio & Seguros', value: 37000, percentage: 25, color: '#4d556b' }
];

export const INITIAL_BOTA_FORAS: BotaFora[] = [
  {
    id: 'BTF-01',
    nome: 'Aterro Central Paulista',
    cnpj: '12.345.678/0001-99',
    telefone: '(11) 98765-4321',
    endereco: 'Av. das Nações Unidas, 4500 - Pinheiros, São Paulo - SP',
    createdAt: '2026-05-10T10:00:00Z'
  },
  {
    id: 'BTF-02',
    nome: 'Ecodescarte Sul',
    cnpj: '98.765.432/0001-11',
    telefone: '(51) 3244-1234',
    endereco: 'Rodovia RS-118, Km 12 - Gravataí - RS',
    createdAt: '2026-05-15T14:30:00Z'
  },
  {
    id: 'BTF-03',
    nome: 'Recicla Norte Ambiental',
    cnpj: '45.678.901/0001-22',
    telefone: '(81) 99122-8877',
    endereco: 'Distrito Industrial Recife Norte, Lote 14 - Olinda - PE',
    createdAt: '2026-05-20T08:15:00Z'
  }
];

export const INITIAL_LANCAMENTOS: Lancamento[] = [
  {
    id: 'LAN-101',
    botaForaId: 'BTF-01',
    botaForaNome: 'Aterro Central Paulista',
    quantidadeCacambas: 12,
    valor: 2400.00,
    data: '2026-06-16',
    driverName: 'Carlos Santana',
    vehicleId: 'FLT-8829',
    status: 'Concluido',
    createdAt: '2026-06-16T08:30:00Z'
  },
  {
    id: 'LAN-102',
    botaForaId: 'BTF-02',
    botaForaNome: 'Ecodescarte Sul',
    quantidadeCacambas: 8,
    valor: 1800.00,
    data: '2026-06-15',
    driverName: 'Marcus Warren',
    vehicleId: 'FLT-3112',
    status: 'Concluido',
    createdAt: '2026-06-15T09:15:00Z'
  },
  {
    id: 'LAN-103',
    botaForaId: 'BTF-01',
    botaForaNome: 'Aterro Central Paulista',
    quantidadeCacambas: 15,
    valor: 3100.00,
    data: '2026-06-12',
    driverName: 'Emily Watson',
    vehicleId: 'FLT-7721',
    status: 'Concluido',
    createdAt: '2026-06-12T11:00:00Z'
  },
  {
    id: 'LAN-104',
    botaForaId: 'BTF-03',
    botaForaNome: 'Recicla Norte Ambiental',
    quantidadeCacambas: 20,
    valor: 4500.00,
    data: '2026-06-10',
    driverName: 'Sophia Loren',
    vehicleId: 'FLT-5541',
    status: 'Concluido',
    createdAt: '2026-06-10T14:45:00Z'
  },
  {
    id: 'LAN-105',
    botaForaId: 'BTF-02',
    botaForaNome: 'Ecodescarte Sul',
    quantidadeCacambas: 5,
    valor: 1100.00,
    data: '2026-06-08',
    driverName: 'Jackson Briggs',
    vehicleId: 'FLT-4402',
    status: 'Concluido',
    createdAt: '2026-06-08T16:20:00Z'
  }
];

