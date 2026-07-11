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
  pago?: boolean;
  valorPago?: number;
  dataPagamento?: string;
}

export interface Vehicle {
  id: string;
  status: 'In Transit' | 'Loading' | 'Maintenance' | 'Available' | 'Assigned';
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
  observacao?: string;
  fotoNota?: string;
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

export interface GarageRefill {
  id: string;
  data: string;
  quantidade_litros: number;
  valor_total: number;
  preco_por_litro: number;
  created_at: string;
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

export interface Manutencao {
  id: string;
  vehicleId: string;
  tipo: 'Preventiva' | 'Corretiva' | 'Elétrica' | 'Mecânica' | 'Pneus' | 'Óleo' | 'Outro';
  descricao: string;
  data: string;
  kmAtual?: number;
  proximoKm?: number;
  custo: number;
  valorMaoDeObra: number;
  valorPeca: number;
  local: 'Garagem' | 'Oficina';
  oficina: string;
  observacao?: string;
  status: 'Pendente' | 'Em Andamento' | 'Concluído';
  createdAt: string;
}

export interface GrupoConta {
  id: string;
  nome: string;
  tipo: 'RECEITA' | 'DESPESA';
}
export interface CategoriaConta {
  id: string;
  grupoId: string;
  nome: string;
}
export interface SubcategoriaConta {
  id: string;
  categoriaId: string;
  nome: string;
}
export interface ExtratoTransacao {
  id: string;
  data: string;
  descricao: string;
  valor: number;
  tipo: 'CREDITO' | 'DEBITO';
  saldo?: number;
  categoria?: string;
  subcategoria?: string;
  centroCustoId?: string;
  status: 'PENDENTE' | 'CATEGORIZADO' | 'IGNORADO' | 'CONCILIADO';
  importacaoId: string;
  observacao?: string;
  createdAt: string;
}
export interface ImportacaoExtrato {
  id: string;
  nomeArquivo: string;
  banco: string;
  dataInicio: string;
  dataFim: string;
  totalLinhas: number;
  categorizadas: number;
  pendentes: number;
  status: 'PROCESSANDO' | 'CONCLUIDO' | 'ERRO';
  createdAt: string;
}
export interface CentroCusto {
  id: string;
  nome: string;
  codigo: string;
  descricao?: string;
  ativo: boolean;
  createdAt: string;
}
export interface Conciliacao {
  id: string;
  transacaoId: string;
  lancamentoId?: string;
  data: string;
  valor: number;
  status: 'PENDENTE' | 'CONCILIADO' | 'DIVERGENTE';
  observacao?: string;
  createdAt: string;
}
export interface RegraCategorizacao {
  id: string;
  padrao: string;
  categoria: string;
  subcategoria: string;
  centroCustoId?: string;
  createdAt: string;
}
export interface PatrimonioItem {
  id: string;
  nome: string;
  tipo: 'IMOVEL' | 'VEICULO' | 'MAQUINA' | 'EQUIPAMENTO' | 'MOVEIS' | 'OUTROS';
  dataAquisicao: string;
  valorAquisicao: number;
  valorResidual: number;
  vidaUtil: number;
  depreciacaoAnual: number;
  depreciacaoAcumulada: number;
  valorContabil: number;
  localizacao?: string;
  observacao?: string;
  createdAt: string;
}
export interface PlanoPagamento {
  id: string;
  descricao: string;
  instituicao?: string;
  valorTotal: number;
  numeroParcelas: number;
  parcelasPagas: number;
  valorParcela: number;
  dataInicio: string;
  dataFim?: string;
  categoria?: string;
  subcategoria?: string;
  status: 'ATIVO' | 'CONCLUIDO' | 'CANCELADO';
  mostrarDashboard: boolean;
  createdAt: string;
}
export interface Cliente {
  id: string;
  tipo: 'PF' | 'PJ';
  nome: string;
  documento: string;
  telefone: string;
  email?: string;
  endereco?: string;
  observacao?: string;
  createdAt: string;
}

