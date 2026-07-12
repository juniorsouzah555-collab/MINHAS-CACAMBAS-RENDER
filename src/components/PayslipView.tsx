/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useCallback } from 'react';
import {
  FileText, Download, Plus, Trash2, Calculator, Users,
  ChevronDown, ChevronUp, Printer, DollarSign, Percent,
  Briefcase, Shield, AlertCircle, CheckCircle2, Settings2, Calendar
} from 'lucide-react';

// --- Tabelas de cálculo 2025/2026 ---

const INSS_TABLE = [
  { min: 0, max: 1518.00, rate: 0.075, deduction: 0 },
  { min: 1518.01, max: 2793.88, rate: 0.09, deduction: 22.77 },
  { min: 2793.89, max: 4190.83, rate: 0.12, deduction: 106.59 },
  { min: 4190.84, max: 8157.41, rate: 0.14, deduction: 190.40 },
];

const IRRF_TABLE = [
  { min: 0, max: 2259.20, rate: 0, deduction: 0 },
  { min: 2259.21, max: 2826.65, rate: 0.075, deduction: 169.44 },
  { min: 2826.66, max: 3751.05, rate: 0.15, deduction: 381.44 },
  { min: 3751.06, max: 4664.68, rate: 0.225, deduction: 662.77 },
  { min: 4664.69, max: Infinity, rate: 0.275, deduction: 896.00 },
];

interface Provento {
  id: string;
  nome: string;
  valor: number;
  tipo: 'fixo' | 'variavel' | 'percentual';
  percentualBase?: number;
  habilitado: boolean;
}

interface Desconto {
  id: string;
  nome: string;
  valor: number;
  tipo: 'fixo' | 'percentual';
  percentualBase?: number;
  habilitado: boolean;
}

interface Funcionario {
  id: string;
  nome: string;
  cargo: string;
  salarioBase: number;
  horasExtrasMinutos: number;
  adicionalNoturnoMinutos: number;
  diasTrabalhados: number;
  diasUteis: number;
  proventos: Provento[];
  descontos: Desconto[];
  calcularFGTS: boolean;
  calcular13Salario: boolean;
  calcularFerias: boolean;
  calcularSAT: boolean;
  calcularSistemaS: boolean;
}

const defaultProventos = (): Provento[] => [
  { id: 'HE50', nome: 'Hora Extra 50%', valor: 0, tipo: 'variavel', percentualBase: 50, habilitado: false },
  { id: 'HE100', nome: 'Hora Extra 100% (Dom/Fer)', valor: 0, tipo: 'variavel', percentualBase: 100, habilitado: false },
  { id: 'ADN', nome: 'Adicional Noturno 20%', valor: 0, tipo: 'variavel', percentualBase: 20, habilitado: false },
  { id: 'PERIC', nome: 'Periculosidade 30%', valor: 0, tipo: 'percentual', percentualBase: 30, habilitado: false },
  { id: 'INSAL', nome: 'Insalubridade', valor: 0, tipo: 'percentual', percentualBase: 10, habilitado: false },
  { id: 'COMISSAO', nome: 'Comissões', valor: 0, tipo: 'fixo', habilitado: false },
  { id: 'VDIARIA', nome: 'Vale Diária', valor: 0, tipo: 'fixo', habilitado: false },
  { id: 'ADICIONAL', nome: 'Adicional de Função', valor: 0, tipo: 'fixo', habilitado: false },
  { id: 'OUTROS_PROV', nome: 'Outros Proventos', valor: 0, tipo: 'fixo', habilitado: false },
];

const defaultDescontos = (): Desconto[] => [
  { id: 'VT', nome: 'Vale Transporte', valor: 0, tipo: 'percentual', percentualBase: 6, habilitado: false },
  { id: 'VR', nome: 'Vale Refeição/Alimentação', valor: 0, tipo: 'fixo', habilitado: false },
  { id: 'PLANO_SAUDE', nome: 'Plano de Saúde', valor: 0, tipo: 'fixo', habilitado: false },
  { id: 'ODONTO', nome: 'Plano Odontológico', valor: 0, tipo: 'fixo', habilitado: false },
  { id: 'SEGURO_VIDA', nome: 'Seguro de Vida', valor: 0, tipo: 'fixo', habilitado: false },
  { id: 'PENSAO', nome: 'Pensão Alimentícia', valor: 0, tipo: 'fixo', habilitado: false },
  { id: 'ADIANTAMENTO', nome: 'Adiantamento Salarial', valor: 0, tipo: 'fixo', habilitado: false },
  { id: 'OUTROS_DESC', nome: 'Outros Descontos', valor: 0, tipo: 'fixo', habilitado: false },
];

function createFuncionario(): Funcionario {
  return {
    id: `FUNC-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    nome: '',
    cargo: '',
    salarioBase: 0,
    horasExtrasMinutos: 0,
    adicionalNoturnoMinutos: 0,
    diasTrabalhados: 30,
    diasUteis: 22,
    proventos: defaultProventos(),
    descontos: defaultDescontos(),
    calcularFGTS: true,
    calcular13Salario: true,
    calcularFerias: true,
    calcularSAT: true,
    calcularSistemaS: true,
  };
}

function calcINSS(base: number): number {
  for (const faixa of INSS_TABLE) {
    if (base >= faixa.min && base <= faixa.max) {
      return base * faixa.rate - faixa.deduction;
    }
  }
  return base * 0.14 - 190.40;
}

function calcIRRF(base: number): number {
  for (const faixa of IRRF_TABLE) {
    if (base >= faixa.min && base <= faixa.max) {
      return base * faixa.rate - faixa.deduction;
    }
  }
  return 0;
}

function calcSalarioHora(salarioBase: number, diasUteis: number): number {
  if (diasUteis <= 0) return 0;
  return salarioBase / (diasUteis * 8);
}

function calcHolerite(f: Funcionario) {
  const salarioHora = calcSalarioHora(f.salarioBase, f.diasUteis);
  const diasProporcional = f.diasTrabalhados / f.diasUteis;

  // --- PROVENTOS ---
  let totalProventos = f.salarioBase;
  const detalhesProventos: { nome: string; valor: number }[] = [
    { nome: 'Salário Base', valor: f.salarioBase }
  ];

  // Horas extras
  const proventosCalculados = f.proventos.filter(p => p.habilitado);
  for (const p of proventosCalculados) {
    let valor = 0;
    if (p.id === 'HE50') {
      valor = salarioHora * 1.5 * (f.horasExtrasMinutos / 60);
    } else if (p.id === 'HE100') {
      valor = salarioHora * 2.0 * (f.horasExtrasMinutos / 60);
    } else if (p.id === 'ADN') {
      const horasNoturnas = f.adicionalNoturnoMinutos / 60;
      valor = salarioHora * 1.3333 * horasNoturnas * 0.2;
    } else if (p.tipo === 'percentual') {
      valor = f.salarioBase * ((p.percentualBase || 0) / 100);
    } else {
      valor = p.valor;
    }
    if (valor > 0) {
      totalProventos += valor;
      detalhesProventos.push({ nome: p.nome, valor });
    }
  }

  // --- DESCONTOS ---
  const inss = calcINSS(totalProventos);
  let totalDescontos = inss;
  const detalhesDescontos: { nome: string; valor: number }[] = [
    { nome: 'INSS (Funcionário)', valor: inss }
  ];

  const descontosCalculados = f.descontos.filter(d => d.habilitado);
  for (const d of descontosCalculados) {
    let valor = 0;
    if (d.tipo === 'percentual') {
      valor = f.salarioBase * ((d.percentualBase || 0) / 100);
    } else {
      valor = d.valor;
    }
    if (valor > 0) {
      totalDescontos += valor;
      detalhesDescontos.push({ nome: d.nome, valor });
    }
  }

  const baseIRRF = totalProventos - inss;
  const irrf = calcIRRF(baseIRRF);
  if (irrf > 0) {
    totalDescontos += irrf;
    detalhesDescontos.push({ nome: 'IRRF', valor: irrf });
  }

  const liquido = totalProventos - totalDescontos;

  // --- CUSTO EMPREGADOR (encargos) ---
  const fgts = f.calcularFGTS ? totalProventos * 0.08 : 0;
  const decimoTerceiro = f.calcular13Salario ? totalProventos / 12 : 0;
  const ferias = f.calcularFerias ? totalProventos / 12 : 0;
  const tercoFerias = f.calcularFerias ? ferias / 3 : 0;
  const fgts13 = f.calcularFGTS ? decimoTerceiro * 0.08 : 0;
  const fgtsFerias = f.calcularFGTS ? ferias * 0.08 : 0;
  const fgtsTerco = f.calcularFGTS ? tercoFerias * 0.08 : 0;
  const sat = f.calcularSAT ? totalProventos * 0.01 : 0;
  const sistemaS = f.calcularSistemaS ? totalProventos * 0.058 : 0;
  const salarioEducacao = f.calcularSistemaS ? totalProventos * 0.025 : 0;
  const incra = f.calcularSistemaS ? totalProventos * 0.002 : 0;
  const inssPatronal = totalProventos * 0.20;

  const totalEncargos = fgts + decimoTerceiro + ferias + tercoFerias + fgts13 + fgtsFerias + fgtsTerco + sat + sistemaS + salarioEducacao + incra + inssPatronal;
  const custoTotal = totalProventos + totalEncargos;

  const detalhesEncargos: { nome: string; valor: number }[] = [
    { nome: 'INSS Patronal (20%)', valor: inssPatronal },
    { nome: 'FGTS (8%)', valor: fgts },
    { nome: '13º Salário (1/12)', valor: decimoTerceiro },
    { nome: 'Férias (1/12)', valor: ferias },
    { nome: '1/3 Férias', valor: tercoFerias },
    { nome: 'FGTS sobre 13º', valor: fgts13 },
    { nome: 'FGTS sobre Férias', valor: fgtsFerias },
    { nome: 'FGTS sobre 1/3 Férias', valor: fgtsTerco },
    { nome: 'SAT (1%)', valor: sat },
    { nome: 'Sistema S (5,8%)', valor: sistemaS },
    { nome: 'Salário Educação (2,5%)', valor: salarioEducacao },
    { nome: 'INCRA (0,2%)', valor: incra },
  ];

  return {
    totalProventos,
    detalhesProventos,
    totalDescontos,
    detalhesDescontos,
    liquido,
    fgts,
    totalEncargos,
    custoTotal,
    detalhesEncargos,
    inss,
    irrf,
    baseIRRF,
  };
}

const formatBRL = (v: number) => `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const MONTH_NAMES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

export default function PayslipView() {
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>(() => [createFuncionario()]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [competencia, setCompetencia] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [showEncargos, setShowEncargos] = useState(true);
  const [showConfig, setShowConfig] = useState(false);

  const addFuncionario = () => {
    const f = createFuncionario();
    setFuncionarios(prev => [...prev, f]);
    setExpandedId(f.id);
  };

  const removeFuncionario = (id: string) => {
    setFuncionarios(prev => prev.filter(f => f.id !== id));
    if (expandedId === id) setExpandedId(null);
  };

  const updateField = useCallback((id: string, field: keyof Funcionario, value: any) => {
    setFuncionarios(prev => prev.map(f => f.id === id ? { ...f, [field]: value } : f));
  }, []);

  const toggleProvento = useCallback((funcId: string, provId: string) => {
    setFuncionarios(prev => prev.map(f => {
      if (f.id !== funcId) return f;
      return { ...f, proventos: f.proventos.map(p => p.id === provId ? { ...p, habilitado: !p.habilitado } : p) };
    }));
  }, []);

  const updateProventoValor = useCallback((funcId: string, provId: string, valor: number) => {
    setFuncionarios(prev => prev.map(f => {
      if (f.id !== funcId) return f;
      return { ...f, proventos: f.proventos.map(p => p.id === provId ? { ...p, valor } : p) };
    }));
  }, []);

  const updateProventoPercentual = useCallback((funcId: string, provId: string, pct: number) => {
    setFuncionarios(prev => prev.map(f => {
      if (f.id !== funcId) return f;
      return { ...f, proventos: f.proventos.map(p => p.id === provId ? { ...p, percentualBase: pct } : p) };
    }));
  }, []);

  const toggleDesconto = useCallback((funcId: string, descId: string) => {
    setFuncionarios(prev => prev.map(f => {
      if (f.id !== funcId) return f;
      return { ...f, descontos: f.descontos.map(d => d.id === descId ? { ...d, habilitado: !d.habilitado } : d) };
    }));
  }, []);

  const updateDescontoValor = useCallback((funcId: string, descId: string, valor: number) => {
    setFuncionarios(prev => prev.map(f => {
      if (f.id !== funcId) return f;
      return { ...f, descontos: f.descontos.map(d => d.id === descId ? { ...d, valor } : d) };
    }));
  }, []);

  const resultados = useMemo(() => {
    return funcionarios.map(f => ({ ...f, resultado: calcHolerite(f) }));
  }, [funcionarios]);

  const totaisGerais = useMemo(() => {
    let totalBruto = 0, totalLiquido = 0, totalEncargos = 0, totalDescontos = 0;
    resultados.forEach(r => {
      totalBruto += r.resultado.totalProventos;
      totalLiquido += r.resultado.liquido;
      totalEncargos += r.resultado.totalEncargos;
      totalDescontos += r.resultado.totalDescontos;
    });
    return { totalBruto, totalLiquido, totalEncargos, totalDescontos, custoTotal: totalBruto + totalEncargos };
  }, [resultados]);

  const handlePrint = () => window.print();

  const competenciaLabel = (() => {
    const [year, month] = competencia.split('-');
    const idx = parseInt(month) - 1;
    return `${MONTH_NAMES[idx]} ${year}`;
  })();

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white rounded-2xl p-6 shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-xl font-bold font-sans flex items-center gap-2">
              <FileText className="w-5 h-5 text-emerald-400" />
              Folha de Pagamento
            </h3>
            <p className="text-xs text-slate-300 mt-1">
              Gere holerites com cálculos automáticos de INSS, IRRF, FGTS, 13º, férias e encargos patronais
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowConfig(!showConfig)}
              className="bg-slate-700 hover:bg-slate-600 text-white px-3 py-2 text-xs font-bold rounded-lg flex items-center gap-1.5 cursor-pointer"
            >
              <Settings2 className="w-4 h-4" />
              <span>Config Folha</span>
            </button>
            <button
              onClick={handlePrint}
              className="bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 text-xs font-bold rounded-lg flex items-center gap-1.5 cursor-pointer shadow-md"
            >
              <Printer className="w-4 h-4 stroke-[2.5]" />
              <span>Imprimir Holerites</span>
            </button>
          </div>
        </div>
      </div>

      {/* Competência + Config Panel */}
      <div className="bg-slate-50 border border-slate-200/60 p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Calendar className="w-4 h-4 text-purple-600" />
          <span className="text-xs font-black text-slate-700 uppercase tracking-wider">Competência:</span>
          <input
            type="month"
            value={competencia}
            onChange={e => setCompetencia(e.target.value)}
            className="bg-white border border-slate-250 py-1.5 px-3 rounded-lg text-xs font-bold text-slate-800 focus:outline-hidden focus:border-purple-500 cursor-pointer"
          />
        </div>
        <button
          onClick={addFuncionario}
          className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-2 text-xs font-bold rounded-lg flex items-center gap-1.5 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Adicionar Funcionário
        </button>
      </div>

      {/* Config Panel - Encargos toggles */}
      {showConfig && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <h4 className="font-sans font-bold text-sm text-slate-900 mb-3">Encargos que a empresa paga (por funcionário)</h4>
          <p className="text-[11px] text-slate-500 mb-4">Ative/desative os direitos trabalhistas que você precisa calcular na folha.</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { key: 'calcularFGTS', label: 'FGTS (8%)', desc: 'Fund. Garantia do Tempo de Serviço' },
              { key: 'calcular13Salario', label: '13º Salário', desc: 'Provisão mensal do décimo terceiro' },
              { key: 'calcularFerias', label: 'Férias + 1/3', desc: 'Provisão de férias + 1/3 constitucional' },
              { key: 'calcularSAT', label: 'SAT (1%)', desc: 'Seg. Acidente do Trabalho' },
              { key: 'calcularSistemaS', label: 'Sistema S (5,8%)', desc: 'SENAI, SESC, SENAI, etc.' },
            ].map(item => {
              const enabled = funcionarios[0]?.[item.key as keyof Funcionario] as boolean;
              return (
                <label key={item.key} className={`flex flex-col p-3 rounded-lg border cursor-pointer transition-all ${enabled ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-200 hover:border-slate-300'}`}>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={enabled}
                      onChange={() => {
                        setFuncionarios(prev => prev.map(f => ({ ...f, [item.key]: !f[item.key as keyof Funcionario] })));
                      }}
                      className="w-4 h-4 rounded accent-emerald-600"
                    />
                    <span className="text-xs font-bold text-slate-800">{item.label}</span>
                  </div>
                  <span className="text-[10px] text-slate-400 mt-1 ml-6">{item.desc}</span>
                </label>
              );
            })}
          </div>
        </div>
      )}

      {/* Totais Gerais */}
      <section className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="bg-white border border-slate-200 p-3 rounded-xl text-center">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Bruto</span>
          <p className="text-lg font-black text-slate-900 mt-0.5">{formatBRL(totaisGerais.totalBruto)}</p>
        </div>
        <div className="bg-white border border-slate-200 p-3 rounded-xl text-center">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Descontos</span>
          <p className="text-lg font-black text-red-600 mt-0.5">{formatBRL(totaisGerais.totalDescontos)}</p>
        </div>
        <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-xl text-center">
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">Total Líquido</span>
          <p className="text-lg font-black text-emerald-800 mt-0.5">{formatBRL(totaisGerais.totalLiquido)}</p>
        </div>
        <div className="bg-white border border-slate-200 p-3 rounded-xl text-center">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Encargos Patronais</span>
          <p className="text-lg font-black text-amber-600 mt-0.5">{formatBRL(totaisGerais.totalEncargos)}</p>
        </div>
        <div className="bg-indigo-50 border border-indigo-200 p-3 rounded-xl text-center">
          <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700">Custo Total Empresa</span>
          <p className="text-lg font-black text-indigo-800 mt-0.5">{formatBRL(totaisGerais.custoTotal)}</p>
        </div>
      </section>

      {/* Funcionários */}
      {resultados.map((func) => {
        const isOpen = expandedId === func.id;
        const r = func.resultado;
        return (
          <div key={func.id} className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">

            {/* Header do funcionário */}
            <div
              className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50 transition-colors"
              onClick={() => setExpandedId(isOpen ? null : func.id)}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center">
                  <Users className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <input
                    type="text"
                    value={func.nome}
                    onChange={e => { e.stopPropagation(); updateField(func.id, 'nome', e.target.value); }}
                    onClick={e => e.stopPropagation()}
                    placeholder="Nome do funcionário"
                    className="text-sm font-bold text-slate-900 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-indigo-500 focus:outline-none w-56 placeholder:text-slate-300"
                  />
                  <div className="flex items-center gap-2 mt-0.5">
                    <input
                      type="text"
                      value={func.cargo}
                      onChange={e => { e.stopPropagation(); updateField(func.id, 'cargo', e.target.value); }}
                      onClick={e => e.stopPropagation()}
                      placeholder="Cargo"
                      className="text-[11px] text-slate-400 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-indigo-500 focus:outline-none w-40 placeholder:text-slate-300"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-6">
                <div className="text-right hidden md:block">
                  <span className="text-[10px] text-slate-400 font-bold">Líquido</span>
                  <p className="text-sm font-black text-emerald-700">{formatBRL(r.liquido)}</p>
                </div>
                <div className="text-right hidden md:block">
                  <span className="text-[10px] text-slate-400 font-bold">Custo Total</span>
                  <p className="text-sm font-black text-indigo-700">{formatBRL(r.custoTotal)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={e => { e.stopPropagation(); removeFuncionario(func.id); }}
                    className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  {isOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                </div>
              </div>
            </div>

            {/* Detalhes expandidos */}
            {isOpen && (
              <div className="border-t border-slate-100 p-5 space-y-5">

                {/* Dados base */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  <div>
                    <label className="text-[10px] font-bold uppercase text-slate-400 mb-1 block">Salário Base (R$)</label>
                    <input
                      type="number"
                      value={func.salarioBase || ''}
                      onChange={e => updateField(func.id, 'salarioBase', parseFloat(e.target.value) || 0)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-800 focus:outline-hidden focus:border-indigo-500"
                      placeholder="0,00"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase text-slate-400 mb-1 block">Horas Extras (min)</label>
                    <input
                      type="number"
                      value={func.horasExtrasMinutos || ''}
                      onChange={e => updateField(func.id, 'horasExtrasMinutos', parseFloat(e.target.value) || 0)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-800 focus:outline-hidden focus:border-indigo-500"
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase text-slate-400 mb-1 block">Adic. Noturno (min)</label>
                    <input
                      type="number"
                      value={func.adicionalNoturnoMinutos || ''}
                      onChange={e => updateField(func.id, 'adicionalNoturnoMinutos', parseFloat(e.target.value) || 0)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-800 focus:outline-hidden focus:border-indigo-500"
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase text-slate-400 mb-1 block">Dias Trabalhados</label>
                    <input
                      type="number"
                      value={func.diasTrabalhados}
                      onChange={e => updateField(func.id, 'diasTrabalhados', parseInt(e.target.value) || 0)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-800 focus:outline-hidden focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase text-slate-400 mb-1 block">Dias Úteis Mês</label>
                    <input
                      type="number"
                      value={func.diasUteis}
                      onChange={e => updateField(func.id, 'diasUteis', parseInt(e.target.value) || 1)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-800 focus:outline-hidden focus:border-indigo-500"
                    />
                  </div>
                </div>

                {/* Proventos + Descontos lado a lado */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

                  {/* Proventos */}
                  <div>
                    <h5 className="text-xs font-black text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                      Proventos (o que ganha)
                    </h5>
                    <div className="space-y-1.5">
                      {func.proventos.map(p => (
                        <div key={p.id} className={`flex items-center gap-2 p-2 rounded-lg border text-xs ${p.habilitado ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-100 opacity-60'}`}>
                          <input
                            type="checkbox"
                            checked={p.habilitado}
                            onChange={() => toggleProvento(func.id, p.id)}
                            className="w-3.5 h-3.5 rounded accent-emerald-600 shrink-0"
                          />
                          <span className="font-medium text-slate-700 flex-1 truncate">{p.nome}</span>
                          {p.habilitado && (
                            p.tipo === 'percentual' ? (
                              <div className="flex items-center gap-1">
                                <input
                                  type="number"
                                  value={p.percentualBase || ''}
                                  onChange={e => updateProventoPercentual(func.id, p.id, parseFloat(e.target.value) || 0)}
                                  className="w-14 bg-white border border-slate-200 rounded px-1.5 py-0.5 text-[11px] font-bold text-right focus:outline-hidden focus:border-emerald-500"
                                  placeholder="%"
                                />
                                <Percent className="w-3 h-3 text-slate-400" />
                              </div>
                            ) : (
                              <input
                                type="number"
                                value={p.valor || ''}
                                onChange={e => updateProventoValor(func.id, p.id, parseFloat(e.target.value) || 0)}
                                className="w-24 bg-white border border-slate-200 rounded px-2 py-0.5 text-[11px] font-bold text-right focus:outline-hidden focus:border-emerald-500"
                                placeholder="R$ 0,00"
                              />
                            )
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Descontos */}
                  <div>
                    <h5 className="text-xs font-black text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <Percent className="w-3.5 h-3.5 text-red-600" />
                      Descontos (o que desconta)
                    </h5>
                    <div className="space-y-1.5">
                      {func.descontos.map(d => (
                        <div key={d.id} className={`flex items-center gap-2 p-2 rounded-lg border text-xs ${d.habilitado ? 'bg-red-50 border-red-200' : 'bg-slate-50 border-slate-100 opacity-60'}`}>
                          <input
                            type="checkbox"
                            checked={d.habilitado}
                            onChange={() => toggleDesconto(func.id, d.id)}
                            className="w-3.5 h-3.5 rounded accent-red-600 shrink-0"
                          />
                          <span className="font-medium text-slate-700 flex-1 truncate">{d.nome}</span>
                          {d.habilitado && (
                            d.tipo === 'percentual' ? (
                              <div className="flex items-center gap-1">
                                <input
                                  type="number"
                                  value={d.percentualBase || ''}
                                  onChange={e => {
                                    const val = parseFloat(e.target.value) || 0;
                                    setFuncionarios(prev => prev.map(ff => ff.id !== func.id ? ff : { ...ff, descontos: ff.descontos.map(dd => dd.id === d.id ? { ...dd, percentualBase: val } : dd) }));
                                  }}
                                  className="w-14 bg-white border border-slate-200 rounded px-1.5 py-0.5 text-[11px] font-bold text-right focus:outline-hidden focus:border-red-500"
                                  placeholder="%"
                                />
                                <Percent className="w-3 h-3 text-slate-400" />
                              </div>
                            ) : (
                              <input
                                type="number"
                                value={d.valor || ''}
                                onChange={e => updateDescontoValor(func.id, d.id, parseFloat(e.target.value) || 0)}
                                className="w-24 bg-white border border-slate-200 rounded px-2 py-0.5 text-[11px] font-bold text-right focus:outline-hidden focus:border-red-500"
                                placeholder="R$ 0,00"
                              />
                            )
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Resumo do Holerite */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mt-4">
                  <h5 className="text-xs font-black text-slate-700 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                    <Calculator className="w-3.5 h-3.5 text-indigo-600" />
                    Resumo do Holerite — {competenciaLabel}
                  </h5>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Coluna Proventos */}
                    <div>
                      <span className="text-[10px] font-bold uppercase text-emerald-700 mb-1.5 block">Proventos</span>
                      <div className="space-y-1">
                        {r.detalhesProventos.map((d, i) => (
                          <div key={i} className="flex justify-between text-[11px]">
                            <span className="text-slate-600">{d.nome}</span>
                            <span className="font-bold text-slate-800 font-mono">{formatBRL(d.valor)}</span>
                          </div>
                        ))}
                        <div className="border-t border-slate-200 mt-1 pt-1 flex justify-between text-xs">
                          <span className="font-black text-slate-900">Total Proventos</span>
                          <span className="font-black text-emerald-700 font-mono">{formatBRL(r.totalProventos)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Coluna Descontos */}
                    <div>
                      <span className="text-[10px] font-bold uppercase text-red-700 mb-1.5 block">Descontos</span>
                      <div className="space-y-1">
                        {r.detalhesDescontos.map((d, i) => (
                          <div key={i} className="flex justify-between text-[11px]">
                            <span className="text-slate-600">{d.nome}</span>
                            <span className="font-bold text-red-600 font-mono">- {formatBRL(d.valor)}</span>
                          </div>
                        ))}
                        <div className="border-t border-slate-200 mt-1 pt-1 flex justify-between text-xs">
                          <span className="font-black text-slate-900">Total Descontos</span>
                          <span className="font-black text-red-600 font-mono">- {formatBRL(r.totalDescontos)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Coluna Líquido + Encargos */}
                    <div>
                      <div className="bg-emerald-100 border border-emerald-300 rounded-lg p-3 mb-3">
                        <span className="text-[10px] font-bold uppercase text-emerald-700">Valor Líquido a Receber</span>
                        <p className="text-2xl font-black text-emerald-800 font-mono mt-0.5">{formatBRL(r.liquido)}</p>
                      </div>

                      {showEncargos && (
                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                          <span className="text-[10px] font-bold uppercase text-amber-700 mb-1.5 block">Encargos Patronais</span>
                          <div className="space-y-0.5 max-h-[160px] overflow-y-auto">
                            {r.detalhesEncargos.filter(d => d.valor > 0).map((d, i) => (
                              <div key={i} className="flex justify-between text-[10px]">
                                <span className="text-amber-700">{d.nome}</span>
                                <span className="font-bold text-amber-800 font-mono">{formatBRL(d.valor)}</span>
                              </div>
                            ))}
                            <div className="border-t border-amber-300 mt-1 pt-1 flex justify-between text-[11px]">
                              <span className="font-black text-amber-900">Total Encargos</span>
                              <span className="font-black text-amber-900 font-mono">{formatBRL(r.totalEncargos)}</span>
                            </div>
                          </div>
                          <div className="bg-amber-100 rounded p-2 mt-2 flex justify-between text-xs">
                            <span className="font-black text-amber-900">Custo Total Empresa</span>
                            <span className="font-black text-amber-900 font-mono">{formatBRL(r.custoTotal)}</span>
                          </div>
                        </div>
                      )}

                      {/* Base de cálculo */}
                      <div className="mt-2 text-[10px] text-slate-400 space-y-0.5">
                        <div className="flex justify-between"><span>Base INSS/IRRF</span><span className="font-mono">{formatBRL(r.totalProventos)}</span></div>
                        <div className="flex justify-between"><span>Base IRRF (após INSS)</span><span className="font-mono">{formatBRL(r.baseIRRF)}</span></div>
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            )}
          </div>
        );
      })}

      {/* Botão adicionar no final */}
      {funcionarios.length > 0 && (
        <button
          onClick={addFuncionario}
          className="w-full border-2 border-dashed border-slate-300 rounded-xl p-4 text-xs font-bold text-slate-500 hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all cursor-pointer flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Adicionar Funcionário
        </button>
      )}

    </div>
  );
}
