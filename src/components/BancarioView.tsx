import React, { useState, useEffect, useMemo } from 'react';
import { Landmark, FileSpreadsheet, Split, BarChart3, Crosshair, RefreshCw, Upload, Download, Brain, CheckCircle2, AlertCircle, FileText, Save, ChevronDown, ChevronRight, Plus, Trash2, Pencil, X, Search, Wallet, Calendar, Building2, Users as UsersIcon, TrendingUp, TrendingDown, PieChart, DollarSign, Percent } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { GrupoConta, CategoriaConta, SubcategoriaConta, ExtratoTransacao, ImportacaoExtrato, CentroCusto, Conciliacao, RegraCategorizacao, PatrimonioItem, PlanoPagamento, Cliente } from '../types';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart as RePieChart, Pie, Cell, Legend } from 'recharts';

const API_BASE = window.location.origin;

function generateId(prefix = '') { return `${prefix}${Date.now()}-${Math.random().toString(36).slice(2, 8)}`; }
function loadLocal<T>(key: string, fallback: T): T {
  try { const s = localStorage.getItem(key); if (s) return JSON.parse(s); } catch {}
  return fallback;
}
function saveLocal(key: string, data: any) {
  try { localStorage.setItem(key, JSON.stringify(data)); } catch {}
}

export default function BancarioView() {
  const [activeTab, setActiveTab] = useState('dashboard');

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: PieChart },
    { id: 'importar', label: 'Importar Extrato', icon: Upload },
    { id: 'plano-contas', label: 'Plano de Contas', icon: Split },
    { id: 'dre', label: 'DRE', icon: BarChart3 },
    { id: 'patrimonio', label: 'Patrimônio', icon: Building2 },
    { id: 'planos', label: 'Planos', icon: Calendar },
    { id: 'clientes', label: 'Clientes', icon: UsersIcon },
    { id: 'centro-custo', label: 'Centro de Custo', icon: Crosshair },
    { id: 'conciliacao', label: 'Conciliação', icon: FileSpreadsheet },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <Landmark className="w-6 h-6 text-purple-600" />
            Bancário
          </h2>
          <p className="text-sm text-slate-400 font-medium mt-0.5">
            Gestão Financeira Completa
          </p>
        </div>
        <button onClick={() => {
          const keys = ['bancario_transacoes', 'bancario_importacoes', 'bancario_grupos', 'bancario_categorias', 'bancario_subcategorias', 'bancario_centros', 'bancario_regras', 'bancario_conciliacoes', 'bancario_patrimonio', 'bancario_planos', 'bancario_clientes'];
          keys.forEach(k => localStorage.removeItem(k));
          window.location.reload();
        }} className="text-xs text-red-500 hover:text-red-700 font-bold border border-red-200 rounded-lg px-3 py-1.5 hover:bg-red-50 transition-colors cursor-pointer">
          Limpar Todos os Dados
        </button>
      </div>

      <div className="flex border-b border-slate-200 overflow-x-auto">
        {tabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-xs font-bold transition-all relative shrink-0 cursor-pointer ${
                activeTab === tab.id ? 'text-purple-600 border-b-2 border-purple-500' : 'text-slate-400 hover:text-slate-600'
              }`}>
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {activeTab === 'dashboard' && <DashboardView />}
      {activeTab === 'importar' && <ExtratoImportView />}
      {activeTab === 'plano-contas' && <PlanoContasView />}
      {activeTab === 'dre' && <DREView />}
      {activeTab === 'patrimonio' && <PatrimonioView />}
      {activeTab === 'planos' && <PlanosView />}
      {activeTab === 'clientes' && <ClientesView />}
      {activeTab === 'centro-custo' && <CentroCustoView />}
      {activeTab === 'conciliacao' && <ConciliacaoView />}
    </div>
  );
}

const formatMoney = (v: number) => `R$ ${Math.abs(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

// ─── SEED DATA ───
const SEED_GRUPOS: GrupoConta[] = [
  { id: 'GRP-REC', nome: 'Receita Operacional', tipo: 'RECEITA' },
  { id: 'GRP-REC-NAO', nome: 'Receita Não Operacional', tipo: 'RECEITA' },
  { id: 'GRP-DES-OPE', nome: 'Custos Operacionais', tipo: 'DESPESA' },
  { id: 'GRP-DES-ADM', nome: 'Despesas Administrativas', tipo: 'DESPESA' },
  { id: 'GRP-DES-VEN', nome: 'Despesas com Vendas', tipo: 'DESPESA' },
  { id: 'GRP-DES-FIN', nome: 'Despesas Financeiras', tipo: 'DESPESA' },
  { id: 'GRP-DES-IMP', nome: 'Impostos', tipo: 'DESPESA' },
];
const SEED_CATEGORIAS: CategoriaConta[] = [
  { id: 'CAT-LOC', grupoId: 'GRP-REC', nome: 'Locação de Caçambas' },
  { id: 'CAT-TRA', grupoId: 'GRP-REC', nome: 'Transporte e Descarte' },
  { id: 'CAT-SRV', grupoId: 'GRP-REC', nome: 'Receita de Serviços' },
  { id: 'CAT-JUR', grupoId: 'GRP-REC-NAO', nome: 'Juros e Multas' },
  { id: 'CAT-OUT', grupoId: 'GRP-REC-NAO', nome: 'Outras Receitas' },
  { id: 'CAT-COM', grupoId: 'GRP-DES-OPE', nome: 'Combustível' },
  { id: 'CAT-MAN', grupoId: 'GRP-DES-OPE', nome: 'Manutenção de Frota' },
  { id: 'CAT-PNE', grupoId: 'GRP-DES-OPE', nome: 'Pneus' },
  { id: 'CAT-SEG', grupoId: 'GRP-DES-OPE', nome: 'Seguro' },
  { id: 'CAT-IPV', grupoId: 'GRP-DES-OPE', nome: 'IPVA / Licenciamento' },
  { id: 'CAT-PED', grupoId: 'GRP-DES-OPE', nome: 'Pedágios' },
  { id: 'CAT-SAL', grupoId: 'GRP-DES-ADM', nome: 'Salários' },
  { id: 'CAT-PRO', grupoId: 'GRP-DES-ADM', nome: 'Pró-Labore' },
  { id: 'CAT-ALU', grupoId: 'GRP-DES-ADM', nome: 'Aluguel' },
  { id: 'CAT-UTI', grupoId: 'GRP-DES-ADM', nome: 'Água, Luz, Telefone' },
  { id: 'CAT-ESC', grupoId: 'GRP-DES-ADM', nome: 'Material de Escritório' },
  { id: 'CAT-TI', grupoId: 'GRP-DES-ADM', nome: 'Internet / TI' },
  { id: 'CAT-MKT', grupoId: 'GRP-DES-VEN', nome: 'Marketing' },
  { id: 'CAT-COMV', grupoId: 'GRP-DES-VEN', nome: 'Comissões' },
  { id: 'CAT-TAR', grupoId: 'GRP-DES-FIN', nome: 'Tarifas Bancárias' },
  { id: 'CAT-JURF', grupoId: 'GRP-DES-FIN', nome: 'Juros' },
  { id: 'CAT-SN', grupoId: 'GRP-DES-IMP', nome: 'Simples Nacional' },
  { id: 'CAT-ISS', grupoId: 'GRP-DES-IMP', nome: 'ISS' },
  { id: 'CAT-DAS', grupoId: 'GRP-DES-IMP', nome: 'DAS' },
  { id: 'CAT-SAL-NEW', grupoId: 'GRP-DES-ADM', nome: 'Salários Motoristas' },
  { id: 'CAT-BEN', grupoId: 'GRP-DES-ADM', nome: 'Benefícios' },
  { id: 'CAT-DEP', grupoId: 'GRP-DES-ADM', nome: 'Depreciação' },
];
const SEED_SUBCATEGORIAS: SubcategoriaConta[] = [
  { id: 'SUB-LOC-1', categoriaId: 'CAT-LOC', nome: 'Caçamba 4m³' },
  { id: 'SUB-LOC-2', categoriaId: 'CAT-LOC', nome: 'Caçamba 6m³' },
  { id: 'SUB-LOC-3', categoriaId: 'CAT-LOC', nome: 'Caçamba 8m³' },
  { id: 'SUB-TRA-1', categoriaId: 'CAT-TRA', nome: 'Descarte em Aterro' },
  { id: 'SUB-TRA-2', categoriaId: 'CAT-TRA', nome: 'Transporte de Resíduos' },
  { id: 'SUB-COM-1', categoriaId: 'CAT-COM', nome: 'Diesel S10' },
  { id: 'SUB-COM-2', categoriaId: 'CAT-COM', nome: 'Diesel Comum' },
  { id: 'SUB-MAN-1', categoriaId: 'CAT-MAN', nome: 'Troca de Óleo' },
  { id: 'SUB-MAN-2', categoriaId: 'CAT-MAN', nome: 'Peças' },
  { id: 'SUB-MAN-3', categoriaId: 'CAT-MAN', nome: 'Mão de Obra' },
  { id: 'SUB-SAL-1', categoriaId: 'CAT-SAL', nome: 'Salários Motoristas' },
  { id: 'SUB-SAL-2', categoriaId: 'CAT-SAL', nome: 'Salários Administrativo' },
  { id: 'SUB-SAL-3', categoriaId: 'CAT-SAL', nome: 'Benefícios' },
  { id: 'SUB-DEP-1', categoriaId: 'CAT-DEP', nome: 'Depreciação Veículos' },
  { id: 'SUB-DEP-2', categoriaId: 'CAT-DEP', nome: 'Depreciação Equipamentos' },
  { id: 'SUB-DEP-3', categoriaId: 'CAT-DEP', nome: 'Depreciação Imóveis' },
];
const SEED_CENTROS: CentroCusto[] = [
  { id: 'CC-ADM', nome: 'Administrativo', codigo: 'ADM', ativo: true, createdAt: new Date().toISOString() },
  { id: 'CC-OPE', nome: 'Operacional', codigo: 'OPE', ativo: true, createdAt: new Date().toISOString() },
  { id: 'CC-VEN', nome: 'Vendas', codigo: 'VEN', ativo: true, createdAt: new Date().toISOString() },
  { id: 'CC-FRO', nome: 'Frota', codigo: 'FRO', ativo: true, createdAt: new Date().toISOString() },
];

// ─── SHARED HOOK ───
function useBancarioData() {
  const [grupos] = useState<GrupoConta[]>(() => loadLocal('bancario_grupos', SEED_GRUPOS));
  const [categorias] = useState<CategoriaConta[]>(() => loadLocal('bancario_categorias', SEED_CATEGORIAS));
  const [subcategorias] = useState<SubcategoriaConta[]>(() => loadLocal('bancario_subcategorias', SEED_SUBCATEGORIAS));
  const [centrosCusto] = useState<CentroCusto[]>(() => loadLocal('bancario_centros', SEED_CENTROS));
  const [transacoes, setTransacoes] = useState<ExtratoTransacao[]>(() => loadLocal('bancario_transacoes', []));

  const atualizarTransacao = (id: string, updates: Partial<ExtratoTransacao>) => {
    setTransacoes(prev => {
      const next = prev.map(t => t.id === id ? { ...t, ...updates } as ExtratoTransacao : t);
      saveLocal('bancario_transacoes', next);
      return next;
    });
  };

  return { grupos, categorias, subcategorias, centrosCusto, transacoes, setTransacoes, atualizarTransacao };
}

// ─── DASHBOARD ───
function DashboardView() {
  const { transacoes, categorias, subcategorias, grupos, centrosCusto } = useBancarioData();
  const [planos] = useState<PlanoPagamento[]>(() => loadLocal('bancario_planos', []));

  const stats = useMemo(() => {
    const receitas = transacoes.filter(t => t.tipo === 'CREDITO' && t.status !== 'PENDENTE' && t.status !== 'IGNORADO');
    const despesas = transacoes.filter(t => t.tipo === 'DEBITO' && t.status !== 'PENDENTE' && t.status !== 'IGNORADO');
    const totalReceitas = receitas.reduce((a, t) => a + t.valor, 0);
    const totalDespesas = despesas.reduce((a, t) => a + t.valor, 0);
    const saldo = totalReceitas - totalDespesas;
    const margem = totalReceitas > 0 ? ((saldo / totalReceitas) * 100) : 0;

    const custosOperacionais = despesas.filter(t => t.categoria && categorias.find(c => c.nome === t.categoria)?.grupoId === 'GRP-DES-OPE').reduce((a, t) => a + t.valor, 0);
    const despesasAdm = despesas.filter(t => t.categoria && categorias.find(c => c.nome === t.categoria)?.grupoId === 'GRP-DES-ADM').reduce((a, t) => a + t.valor, 0);

    return { totalReceitas, totalDespesas, saldo, margem, custosOperacionais, despesasAdm, totalTransacoes: transacoes.length, pendentes: transacoes.filter(t => t.status === 'PENDENTE').length };
  }, [transacoes, categorias]);

  const fluxoPorMes = useMemo(() => {
    const meses: Record<string, { mes: string; receitas: number; despesas: number; saldo: number }> = {};
    for (const t of transacoes) {
      if (t.status === 'PENDENTE' || t.status === 'IGNORADO') continue;
      const m = t.data.substring(0, 7);
      if (!meses[m]) meses[m] = { mes: m, receitas: 0, despesas: 0, saldo: 0 };
      if (t.tipo === 'CREDITO') meses[m].receitas += t.valor;
      else meses[m].despesas += t.valor;
    }
    return Object.values(meses).sort((a, b) => a.mes.localeCompare(b.mes));
  }, [transacoes]);

  const categoriasPorValor = useMemo(() => {
    const map: Record<string, number> = {};
    for (const t of transacoes) {
      if (t.status === 'PENDENTE' || t.status === 'IGNORADO') continue;
      const nome = t.categoria || 'Sem Categoria';
      map[nome] = (map[nome] || 0) + t.valor;
    }
    return Object.entries(map).map(([name, value]) => ({ name, value: Math.round(value) })).sort((a, b) => b.value - a.value);
  }, [transacoes]);

  const planosAtivos = planos.filter(p => p.status === 'ATIVO');
  const totalParcelasMes = planosAtivos.reduce((a, p) => a + p.valorParcela, 0);

  const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f97316', '#eab308', '#22c55e', '#14b8a6', '#06b6d4', '#3b82f6'];

  return (
    <div className="space-y-6">
      {/* Cards de resumo */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
          <div className="flex items-center gap-2 text-emerald-700 mb-1">
            <TrendingUp className="w-4 h-4" />
            <span className="text-[10px] font-bold uppercase tracking-wider">Receitas</span>
          </div>
          <p className="text-xl font-black text-emerald-700">{formatMoney(stats.totalReceitas)}</p>
        </div>
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-4">
          <div className="flex items-center gap-2 text-rose-700 mb-1">
            <TrendingDown className="w-4 h-4" />
            <span className="text-[10px] font-bold uppercase tracking-wider">Despesas</span>
          </div>
          <p className="text-xl font-black text-rose-700">{formatMoney(stats.totalDespesas)}</p>
        </div>
        <div className={`border rounded-xl p-4 ${stats.saldo >= 0 ? 'bg-blue-50 border-blue-200' : 'bg-red-50 border-red-200'}`}>
          <div className="flex items-center gap-2 mb-1">
            <DollarSign className={`w-4 h-4 ${stats.saldo >= 0 ? 'text-blue-700' : 'text-red-700'}`} />
            <span className="text-[10px] font-bold uppercase tracking-wider">Saldo</span>
          </div>
          <p className={`text-xl font-black ${stats.saldo >= 0 ? 'text-blue-700' : 'text-red-700'}`}>{formatMoney(stats.saldo)}</p>
        </div>
        <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
          <div className="flex items-center gap-2 text-indigo-700 mb-1">
            <Percent className="w-4 h-4" />
            <span className="text-[10px] font-bold uppercase tracking-wider">Margem</span>
          </div>
          <p className={`text-xl font-black ${stats.margem >= 0 ? 'text-indigo-700' : 'text-red-600'}`}>{stats.margem >= 0 ? '+' : ''}{stats.margem.toFixed(1)}%</p>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="flex items-center gap-2 text-amber-700 mb-1">
            <Calendar className="w-4 h-4" />
            <span className="text-[10px] font-bold uppercase tracking-wider">Planos Mês</span>
          </div>
          <p className="text-xl font-black text-amber-700">{formatMoney(totalParcelasMes)}</p>
        </div>
      </div>

      {/* Gráfico fluxo de caixa */}
      {fluxoPorMes.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
          <h3 className="text-sm font-bold text-slate-700 mb-4">Fluxo de Caixa Mensal</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={fluxoPorMes}>
              <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `R$${(v/1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: number) => formatMoney(v)} />
              <Bar dataKey="receitas" name="Receitas" fill="#22c55e" radius={[4,4,0,0]} />
              <Bar dataKey="despesas" name="Despesas" fill="#f43f5e" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Categorias por valor */}
        {categoriasPorValor.length > 0 && (
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
            <h3 className="text-sm font-bold text-slate-700 mb-4">Categorias</h3>
            <ResponsiveContainer width="100%" height={250}>
              <RePieChart>
                <Pie data={categoriasPorValor.slice(0, 8)} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  {categoriasPorValor.slice(0, 8).map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v: number) => formatMoney(v)} />
              </RePieChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Planos ativos */}
        {planosAtivos.length > 0 && (
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
            <h3 className="text-sm font-bold text-slate-700 mb-4">Planos Ativos</h3>
            <div className="space-y-3">
              {planosAtivos.slice(0, 5).map(p => {
                const pct = p.numeroParcelas > 0 ? (p.parcelasPagas / p.numeroParcelas) * 100 : 0;
                return (
                  <div key={p.id}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-semibold text-slate-700">{p.descricao}</span>
                      <span className="text-slate-500">{p.parcelasPagas}/{p.numeroParcelas} · {formatMoney(p.valorParcela)}/mês</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2">
                      <div className="bg-purple-500 h-2 rounded-full transition-all" style={{ width: `${Math.min(pct, 100)}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── PLANO DE CONTAS ───
function PlanoContasView() {
  const [grupos, setGrupos] = useState<GrupoConta[]>(() => loadLocal('bancario_grupos', SEED_GRUPOS));
  const [categorias, setCategorias] = useState<CategoriaConta[]>(() => loadLocal('bancario_categorias', SEED_CATEGORIAS));
  const [subcategorias, setSubcategorias] = useState<SubcategoriaConta[]>(() => loadLocal('bancario_subcategorias', SEED_SUBCATEGORIAS));

  useEffect(() => { saveLocal('bancario_grupos', grupos); }, [grupos]);
  useEffect(() => { saveLocal('bancario_categorias', categorias); }, [categorias]);
  useEffect(() => { saveLocal('bancario_subcategorias', subcategorias); }, [subcategorias]);

  useEffect(() => {
    const fetchData = async () => {
      if (!supabase) return;
      const { data: g } = await supabase.from('grupos_conta').select('*');
      if (g?.length) setGrupos(g);
      const { data: c } = await supabase.from('categorias_conta').select('*');
      if (c?.length) setCategorias(c);
      const { data: s } = await supabase.from('subcategorias_conta').select('*');
      if (s?.length) setSubcategorias(s);
    };
    fetchData();

    const channel = supabase.channel('bancario-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'grupos_conta' }, (p: any) => {
        if (p.eventType === 'INSERT') setGrupos(prev => [...prev, p.new]);
        else if (p.eventType === 'DELETE') setGrupos(prev => prev.filter(x => x.id !== p.old.id));
        else if (p.eventType === 'UPDATE') setGrupos(prev => prev.map(x => x.id === p.new.id ? p.new : x));
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'categorias_conta' }, (p: any) => {
        if (p.eventType === 'INSERT') setCategorias(prev => [...prev, p.new]);
        else if (p.eventType === 'DELETE') setCategorias(prev => prev.filter(x => x.id !== p.old.id));
        else if (p.eventType === 'UPDATE') setCategorias(prev => prev.map(x => x.id === p.new.id ? p.new : x));
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'subcategorias_conta' }, (p: any) => {
        if (p.eventType === 'INSERT') setSubcategorias(prev => [...prev, p.new]);
        else if (p.eventType === 'DELETE') setSubcategorias(prev => prev.filter(x => x.id !== p.old.id));
        else if (p.eventType === 'UPDATE') setSubcategorias(prev => prev.map(x => x.id === p.new.id ? p.new : x));
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const [novoGrupo, setNovoGrupo] = useState('');
  const [novoGrupoTipo, setNovoGrupoTipo] = useState<'RECEITA' | 'DESPESA'>('RECEITA');
  const [novaCat, setNovaCat] = useState('');
  const [novaCatGrupo, setNovaCatGrupo] = useState('');
  const [novaSub, setNovaSub] = useState('');
  const [novaSubCat, setNovaSubCat] = useState('');
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const addGrupo = async () => {
    if (!novoGrupo.trim()) return;
    const g: GrupoConta = { id: generateId('GRP-'), nome: novoGrupo.trim(), tipo: novoGrupoTipo };
    setGrupos(prev => [...prev, g]);
    if (supabase) await supabase.from('grupos_conta').insert([g]);
    setNovoGrupo('');
  };

  const deleteGrupo = async (id: string) => {
    setGrupos(prev => prev.filter(x => x.id !== id));
    setCategorias(prev => prev.filter(c => c.grupoId !== id));
    setSubcategorias(prev => prev.filter(s => !categorias.find(c => c.id === s.categoriaId)?.grupoId));
    if (supabase) {
      await supabase.from('grupos_conta').delete().eq('id', id);
      await supabase.from('categorias_conta').delete().eq('grupo_id', id);
    }
  };

  const addCategoria = async () => {
    if (!novaCat.trim() || !novaCatGrupo) return;
    const c: CategoriaConta = { id: generateId('CAT-'), grupoId: novaCatGrupo, nome: novaCat.trim() };
    setCategorias(prev => [...prev, c]);
    if (supabase) await supabase.from('categorias_conta').insert([{ id: c.id, grupo_id: c.grupoId, nome: c.nome }]);
    setNovaCat('');
  };

  const deleteCategoria = async (id: string) => {
    setCategorias(prev => prev.filter(x => x.id !== id));
    setSubcategorias(prev => prev.filter(s => s.categoriaId !== id));
    if (supabase) {
      await supabase.from('categorias_conta').delete().eq('id', id);
      await supabase.from('subcategorias_conta').delete().eq('categoria_id', id);
    }
  };

  const addSubcategoria = async () => {
    if (!novaSub.trim() || !novaSubCat) return;
    const s: SubcategoriaConta = { id: generateId('SUB-'), categoriaId: novaSubCat, nome: novaSub.trim() };
    setSubcategorias(prev => [...prev, s]);
    if (supabase) await supabase.from('subcategorias_conta').insert([{ id: s.id, categoria_id: s.categoriaId, nome: s.nome }]);
    setNovaSub('');
  };

  const deleteSubcategoria = async (id: string) => {
    setSubcategorias(prev => prev.filter(x => x.id !== id));
    if (supabase) await supabase.from('subcategorias_conta').delete().eq('id', id);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Grupos</h3>
        <div className="flex items-center gap-2">
          <input type="text" value={novoGrupo} onChange={e => setNovoGrupo(e.target.value)}
            placeholder="Nome do grupo (ex: Receita Operacional)"
            className="flex-1 text-sm border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-emerald-400"
            onKeyDown={e => e.key === 'Enter' && addGrupo()} />
          <select value={novoGrupoTipo} onChange={e => setNovoGrupoTipo(e.target.value as any)}
            className="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-700 cursor-pointer">
            <option value="RECEITA">Receita</option>
            <option value="DESPESA">Despesa</option>
          </select>
          <button onClick={addGrupo} disabled={!novoGrupo.trim()}
            className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-bold cursor-pointer transition-colors disabled:opacity-50">
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {grupos.length === 0 && <p className="text-sm text-slate-400 italic">Nenhum grupo cadastrado.</p>}

        <div className="space-y-2">
          {grupos.map(g => {
            const cats = categorias.filter(c => c.grupoId === g.id);
            const isOpen = expanded[g.id];
            const cor = g.tipo === 'RECEITA' ? 'text-emerald-600 bg-emerald-50 border-emerald-200' : 'text-rose-600 bg-rose-50 border-rose-200';
            return (
              <div key={g.id} className="border border-slate-200 rounded-xl overflow-hidden">
                <div className={`flex items-center justify-between px-4 py-3 cursor-pointer ${cor}`}
                  onClick={() => setExpanded(prev => ({ ...prev, [g.id]: !prev[g.id] }))}>
                  <div className="flex items-center gap-2">
                    {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    <span className="font-bold text-sm">{g.nome}</span>
                    <span className="text-[10px] font-bold opacity-60">{g.tipo === 'RECEITA' ? 'RECEITA' : 'DESPESA'}</span>
                    <span className="text-[10px] bg-white/50 px-2 py-0.5 rounded-full">{cats.length} cat.</span>
                  </div>
                  <button onClick={e => { e.stopPropagation(); deleteGrupo(g.id); }}
                    className="text-red-400 hover:text-red-600 p-1 cursor-pointer"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>

                {isOpen && (
                  <div className="px-4 pb-4 pt-2 space-y-2">
                    <div className="flex items-center gap-2 pl-4">
                      <input type="text" value={novaCatGrupo === g.id ? novaCat : ''}
                        onChange={e => { setNovaCat(e.target.value); setNovaCatGrupo(g.id); }}
                        placeholder="Nova categoria..."
                        className="flex-1 text-xs border border-slate-200 rounded-lg px-3 py-1.5 outline-none focus:border-purple-400"
                        onKeyDown={e => e.key === 'Enter' && addCategoria()} />
                      <button onClick={addCategoria} disabled={!novaCat.trim() || novaCatGrupo !== g.id}
                        className="bg-purple-500 hover:bg-purple-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-colors disabled:opacity-50">
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>

                    {cats.map(c => {
                      const subs = subcategorias.filter(s => s.categoriaId === c.id);
                      return (
                        <div key={c.id} className="pl-6 border-l-2 border-slate-200 space-y-1">
                          <div className="flex items-center justify-between py-1.5 px-3 bg-slate-50 rounded-lg">
                            <span className="text-sm font-semibold text-slate-700">{c.nome}</span>
                            <button onClick={() => deleteCategoria(c.id)}
                              className="text-red-300 hover:text-red-500 p-0.5 cursor-pointer"><X className="w-3 h-3" /></button>
                          </div>
                          <div className="flex items-center gap-2 pl-4">
                            <input type="text" value={novaSubCat === c.id ? novaSub : ''}
                              onChange={e => { setNovaSub(e.target.value); setNovaSubCat(c.id); }}
                              placeholder="Subcategoria..."
                              className="flex-1 text-xs border border-slate-200 rounded px-2 py-1 outline-none focus:border-emerald-400"
                              onKeyDown={e => e.key === 'Enter' && addSubcategoria()} />
                            <button onClick={addSubcategoria} disabled={!novaSub.trim() || novaSubCat !== c.id}
                              className="bg-emerald-400 hover:bg-emerald-500 text-white px-2 py-1 rounded text-xs font-bold cursor-pointer disabled:opacity-50">
                              + Sub
                            </button>
                          </div>
                          {subs.map(s => (
                            <div key={s.id} className="flex items-center justify-between pl-8 py-1">
                              <span className="text-xs text-slate-500">• {s.nome}</span>
                              <button onClick={() => deleteSubcategoria(s.id)}
                                className="text-red-300 hover:text-red-500 p-0.5 cursor-pointer"><X className="w-2.5 h-2.5" /></button>
                            </div>
                          ))}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── IMPORTAR EXTRATO (AGORA 100% AUTOMÁTICO) ───
function ExtratoImportView() {
  const [importacoes, setImportacoes] = useState<ImportacaoExtrato[]>(() => loadLocal('bancario_importacoes', []));
  const [transacoes, setTransacoes] = useState<ExtratoTransacao[]>(() => loadLocal('bancario_transacoes', []));
  const [regras, setRegras] = useState<RegraCategorizacao[]>(() => loadLocal('bancario_regras', []));
  const [processing, setProcessing] = useState(false);
  const [activeImportId, setActiveImportId] = useState<string | null>(null);
  const [autoDir, setAutoDir] = useState(true);

  useEffect(() => { saveLocal('bancario_importacoes', importacoes); }, [importacoes]);
  useEffect(() => { saveLocal('bancario_transacoes', transacoes); }, [transacoes]);
  useEffect(() => { saveLocal('bancario_regras', regras); }, [regras]);

  const [searchTerm, setSearchTerm] = useState('');
  const [filtroStatus, setFiltroStatus] = useState<string>('TODOS');

  const grupos = useState<GrupoConta[]>(() => loadLocal('bancario_grupos', SEED_GRUPOS))[0];
  const categorias = useState<CategoriaConta[]>(() => loadLocal('bancario_categorias', SEED_CATEGORIAS))[0];
  const subcategorias = useState<SubcategoriaConta[]>(() => loadLocal('bancario_subcategorias', SEED_SUBCATEGORIAS))[0];
  const centrosCusto = useState<CentroCusto[]>(() => loadLocal('bancario_centros', SEED_CENTROS))[0];

  // Regras locais expandidas para categorização automática
  // Ordem: mais específicas primeiro, genéricas depois
  const CATEGORY_RULES: { words: string[]; categoria: string; subcategoria?: string; centroCusto?: string }[] = [
    // ── RECEITAS ──
    { words: ['pix recebido', 'pix-recebido', 'transferencia recebida', 'deposito recebido', 'dep dinheiro', 'recebimento pix', 'recebimento ted', 'recebimento doc', 'recebimento boleto', 'credito em conta', 'doc recebido', 'ted recebida'], categoria: 'Receita de Serviços', subcategoria: 'Transferências Recebidas', centroCusto: 'Operacional' },
    { words: ['pagamento cliente', 'pagamento de cliente', 'servico prestado', 'recebimento servico', 'recebimento de servico'], categoria: 'Receita de Serviços', subcategoria: 'Pagamento de Clientes', centroCusto: 'Operacional' },
    { words: ['locacao cacamba', 'aluguel cacamba', 'cacamba'], categoria: 'Locação de Caçambas', subcategoria: 'Aluguel de Caçambas', centroCusto: 'Operacional' },
    { words: ['transporte residuo', 'descarte entulho', 'aterra sanitario', 'coleta entulho', 'transporte entulho'], categoria: 'Transporte e Descarte', subcategoria: 'Coleta e Destinação', centroCusto: 'Operacional' },
    { words: ['venda sucata', 'venda de sucata', 'reciclagem', 'sucata'], categoria: 'Venda de Sucata', subcategoria: 'Reciclagem', centroCusto: 'Operacional' },

    // ── DESPESAS OPERACIONAIS ──
    { words: ['abastecimento diesel', 'diesel s10', 'diesel s500', 'combustivel diesel', 'oleo diesel'], categoria: 'Combustível', subcategoria: 'Diesel', centroCusto: 'Frota' },
    { words: ['gasolina', 'etanol', 'alcool', 'abastecimento gasolina'], categoria: 'Combustível', subcategoria: 'Gasolina/Etanol', centroCusto: 'Frota' },
    { words: ['posto shell', 'posto ipiranga', 'posto br', 'abastecimento posto'], categoria: 'Combustível', subcategoria: 'Abastecimento', centroCusto: 'Frota' },

    { words: ['troca oleo', 'trocadeoleo', 'troca de oleo'], categoria: 'Manutenção de Frota', subcategoria: 'Troca de Óleo', centroCusto: 'Frota' },
    { words: ['pneu', 'pneus', 'recauchutagem', 'borracharia'], categoria: 'Manutenção de Frota', subcategoria: 'Pneus', centroCusto: 'Frota' },
    { words: ['alinhamento', 'balanceamento', 'suspensao', 'geometria'], categoria: 'Manutenção de Frota', subcategoria: 'Suspensão', centroCusto: 'Frota' },
    { words: ['freio', 'embreagem', 'embreagem'], categoria: 'Manutenção de Frota', subcategoria: 'Freios/Embreagem', centroCusto: 'Frota' },
    { words: ['manutencao caminhao', 'oficina mecanica', 'conserto caminhao', 'reparo caminhao'], categoria: 'Manutenção de Frota', subcategoria: 'Oficina Mecânica', centroCusto: 'Frota' },
    { words: ['peca caminhao', 'peca para caminhao', 'peca automotiva', 'pecas'], categoria: 'Manutenção de Frota', subcategoria: 'Peças', centroCusto: 'Frota' },
    { words: ['manutencao preventiva', 'revisao', 'manutencao programada'], categoria: 'Manutenção de Frota', subcategoria: 'Revisão Preventiva', centroCusto: 'Frota' },
    { words: ['funilaria', 'pintura caminhao', 'lataria', 'martelinho'], categoria: 'Manutenção de Frota', subcategoria: 'Funilaria/Pintura', centroCusto: 'Frota' },
    { words: ['guincho', 'reboque', 'socorro mecanico'], categoria: 'Manutenção de Frota', subcategoria: 'Guincho', centroCusto: 'Frota' },

    { words: ['seguro caminhao', 'seguro frota', 'sulfran', 'porto seguro caminhao'], categoria: 'Seguro', subcategoria: 'Seguro Frota', centroCusto: 'Frota' },
    { words: ['seguro vida', 'seguro saude'], categoria: 'Seguro', subcategoria: 'Seguro Pessoal', centroCusto: 'Administrativo' },

    { words: ['ipva caminhao', 'ipva'], categoria: 'IPVA / Licenciamento', subcategoria: 'IPVA', centroCusto: 'Frota' },
    { words: ['licenciamento', 'emplacamento', 'detran', 'renavam', 'crlv'], categoria: 'IPVA / Licenciamento', subcategoria: 'Licenciamento', centroCusto: 'Frota' },
    { words: ['multa transito', 'multa de transito', 'infracao transito'], categoria: 'IPVA / Licenciamento', subcategoria: 'Multas', centroCusto: 'Frota' },

    { words: ['pedagio', 'sem parar', 'conectcar', 'tag passagem', 'passagem pedagio'], categoria: 'Pedágios', subcategoria: 'Pedágios', centroCusto: 'Frota' },

    // ── DESPESAS ADMINISTRATIVAS ──
    { words: ['salario motorista', 'salario funcionario', 'salario', 'salário', 'folha pagamento', 'pagamento folha'], categoria: 'Salários', subcategoria: 'Salários', centroCusto: 'Administrativo' },
    { words: ['pro labore', 'prolabore', 'pro-labore', 'retirada lucro', 'distribuicao lucro'], categoria: 'Pró-Labore', subcategoria: 'Pró-Labore', centroCusto: 'Administrativo' },
    { words: ['rescisao', 'aviso previo', 'ferias', 'decimo terceiro', '13o salario', 'fgts recisao'], categoria: 'Salários', subcategoria: 'Rescisão', centroCusto: 'Administrativo' },
    { words: ['vale transporte', 'vale alimentacao', 'vale refeicao', 'vt', 'vr'], categoria: 'Salários', subcategoria: 'Benefícios', centroCusto: 'Administrativo' },
    { words: ['inss patronal', 'fgts', 'fgts mensal'], categoria: 'Simples Nacional', subcategoria: 'FGTS', centroCusto: 'Administrativo' },

    { words: ['aluguel imovel', 'aluguel sede', 'aluguel galpao', 'locacao imovel'], categoria: 'Aluguel', subcategoria: 'Imóvel Sede', centroCusto: 'Administrativo' },
    { words: ['aluguel cacamba terceiro', 'aluguel de cacamba', 'locacao cacamba pago'], categoria: 'Aluguel', subcategoria: 'Caçambas de Terceiros', centroCusto: 'Operacional' },

    { words: ['conta luz', 'energia eletrica', 'copel', 'conta energia'], categoria: 'Água, Luz, Telefone', subcategoria: 'Energia Elétrica', centroCusto: 'Administrativo' },
    { words: ['conta agua', 'agua', 'sanepar', 'concessionaria agua'], categoria: 'Água, Luz, Telefone', subcategoria: 'Água', centroCusto: 'Administrativo' },
    { words: ['telefone', 'oi fibra', 'vivo fibra', 'claro', 'tim', 'conta telefone', 'celular corporativo'], categoria: 'Água, Luz, Telefone', subcategoria: 'Telefone/Internet', centroCusto: 'Administrativo' },

    { words: ['internet fibra', 'internet corporativa', 'banda larga'], categoria: 'Internet / TI', subcategoria: 'Internet', centroCusto: 'Administrativo' },
    { words: ['sistema gestao', 'software gestao', 'assinatura sistema', 'saas', 'hospedagem site', 'dominio', 'servidor cloud'], categoria: 'Internet / TI', subcategoria: 'Sistemas', centroCusto: 'Administrativo' },
    { words: ['manutencao computador', 'conserto computador', 'informatica', 'notebook', 'impressora', 'cartucho', 'toner'], categoria: 'Internet / TI', subcategoria: 'Equipamentos TI', centroCusto: 'Administrativo' },

    { words: ['material escritorio', 'papelaria', 'caneta', 'papel sulfite', 'pastas', 'arquivo'], categoria: 'Material de Escritório', subcategoria: 'Papelaria', centroCusto: 'Administrativo' },
    { words: ['impressao', 'xerox', 'encadernacao', 'plotagem'], categoria: 'Material de Escritório', subcategoria: 'Impressões', centroCusto: 'Administrativo' },
    { words: ['agua mineral', 'cafe', 'copo descartavel', 'limpeza escritorio'], categoria: 'Material de Escritório', subcategoria: 'Copa/Limpeza', centroCusto: 'Administrativo' },

    { words: ['simples nacional', 'das mensal', 'das', 'pagamento das'], categoria: 'Simples Nacional', subcategoria: 'DAS', centroCusto: 'Administrativo' },
    { words: ['irpj', 'csll', 'pis', 'cofins', 'issqn', 'iss', 'icms'], categoria: 'Simples Nacional', subcategoria: 'Tributos Federais', centroCusto: 'Administrativo' },
    { words: ['contador', 'contabilidade', 'escritorio contabil', 'servicos contabeis', 'nota fiscal', 'nf-e', 'nfs-e'], categoria: 'Serviços Contábeis', subcategoria: 'Contabilidade', centroCusto: 'Administrativo' },

    { words: ['tarifa manutencao conta', 'cesta servicos', 'tarifa pacote', 'tarifa bancaria', 'taxa transferencia', 'cobranca tarifa', 'tarifa cobranca'], categoria: 'Tarifas Bancárias', subcategoria: 'Tarifas de Conta', centroCusto: 'Administrativo' },
    { words: ['maquininha', 'maquina cartao', 'taxa maquininha', 'ton', 'cielo', 'rede', 'getnet'], categoria: 'Tarifas Bancárias', subcategoria: 'Taxas Maquininha', centroCusto: 'Administrativo' },
    { words: ['juros mora', 'multa atraso', 'encargos bancarios', 'iof'], categoria: 'Tarifas Bancárias', subcategoria: 'Juros/Encargos', centroCusto: 'Administrativo' },

    { words: ['boleto', 'pagamento de boleto', 'boleto gerado'], categoria: 'Pagamento de Boletos', subcategoria: 'Boletos', centroCusto: 'Administrativo' },

    { words: ['pix transferido', 'pix enviado', 'pix-enviado', 'transferencia enviada', 'pagamento ted', 'pagamento doc', 'doc enviado', 'ted enviada'], categoria: 'Transferências Enviadas', subcategoria: 'PIX/TED', centroCusto: 'Administrativo' },

    // ── DESPESAS PESSOAIS / DIVERSOS ──
    { words: ['restaurante', 'lanchonete', 'padaria', 'mercado', 'supermercado', 'acougue', 'hortifruti', 'delivery'], categoria: 'Alimentação', subcategoria: 'Refeições', centroCusto: 'Administrativo' },
    { words: ['farmacia', 'remedio', 'medicamento', 'consulta medica', 'exame laboratorio', 'plano saude', 'dentista', 'clinica medica'], categoria: 'Saúde', subcategoria: 'Saúde', centroCusto: 'Administrativo' },
    { words: ['curso', 'faculdade', 'escola', 'universidade', 'material escolar', 'mensalidade escolar'], categoria: 'Educação', subcategoria: 'Educação', centroCusto: 'Administrativo' },
    { words: ['roupa', 'calcado', 'tenis', 'uniforme'], categoria: 'Vestuário', subcategoria: 'Vestuário', centroCusto: 'Administrativo' },
    { words: ['cartao credito', 'fatura cartao', 'cartao visa', 'cartao mastercard', 'elo', 'nubank'], categoria: 'Cartão de Crédito', subcategoria: 'Fatura Cartão', centroCusto: 'Administrativo' },
    { words: ['emprestimo', 'financiamento', 'credito consignado', 'refinanciamento'], categoria: 'Financiamentos', subcategoria: 'Empréstimos', centroCusto: 'Administrativo' },
    { words: ['advogado', 'honorario advogado', 'custas judiciais', 'justica', 'tribunal'], categoria: 'Honorários Advocatícios', subcategoria: 'Jurídico', centroCusto: 'Administrativo' },
    { words: ['marketing', 'publicidade', 'anuncio', 'google ads', 'facebook ads', 'instagram', 'divulgacao', 'propaganda'], categoria: 'Marketing', subcategoria: 'Anúncios', centroCusto: 'Vendas' },
    { words: ['combustivel', 'abastec'], categoria: 'Combustível', subcategoria: 'Combustível', centroCusto: 'Frota' },
    { words: ['manutencao', 'oficina', 'mecanico', 'reparo'], categoria: 'Manutenção de Frota', subcategoria: 'Manutenção Geral', centroCusto: 'Frota' },
    { words: ['seguro'], categoria: 'Seguro', subcategoria: 'Seguros', centroCusto: 'Administrativo' },
  ];

  // Categorização local — COMPLETA, ordem: específicas primeiro
  const categorizeTransaction = (descricao: string, tipo?: 'CREDITO' | 'DEBITO'): { categoria: string | null; subcategoria: string | null; centroCusto: string | null } => {
    const lower = descricao.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

    // Regras do usuário primeiro
    for (const r of regras) {
      if (lower.includes(r.padrao.toLowerCase()))
        return { categoria: r.categoria, subcategoria: r.subcategoria || null, centroCusto: r.centroCustoId || null };
    }

    // Regras fixas — ordem: mais específicas primeiro (lista CATEGORY_RULES acima)
    for (const rule of CATEGORY_RULES) {
      for (const word of rule.words) {
        if (lower.includes(word))
          return { categoria: rule.categoria, subcategoria: rule.subcategoria || null, centroCusto: rule.centroCusto || null };
      }
    }

    // ── FALLBACK POR TIPO ──
    // Se mesmo assim não categorizou, usa o tipo (CREDITO/DEBITO) + palavras-chave genéricas
    if (tipo === 'CREDITO') {
      if (/(pix|ted|doc|transferencia|deposito|credito|recebimento|boleto|pagamento)/i.test(lower))
        return { categoria: 'Receita de Serviços', subcategoria: 'Transferências Recebidas', centroCusto: 'Operacional' };
    } else if (tipo === 'DEBITO') {
      if (/(tarifa|cesta|iof|juros|encargos bancarios)/i.test(lower))
        return { categoria: 'Tarifas Bancárias', subcategoria: 'Tarifas de Conta', centroCusto: 'Administrativo' };
      if (/(pix|ted|doc|transferencia|pagamento|boleto)/i.test(lower))
        return { categoria: 'Transferências Enviadas', subcategoria: 'PIX/TED', centroCusto: 'Administrativo' };
      if (/(combustivel|diesel|gasolina|abastec|posto)/i.test(lower))
        return { categoria: 'Combustível', subcategoria: 'Combustível', centroCusto: 'Frota' };
      if (/(oleo|pneu|manutencao|oficina|mecanico|reparo|peca|revisao|guincho)/i.test(lower))
        return { categoria: 'Manutenção de Frota', subcategoria: 'Manutenção Geral', centroCusto: 'Frota' };
      if (/(seguro|sulfran)/i.test(lower))
        return { categoria: 'Seguro', subcategoria: 'Seguros', centroCusto: 'Administrativo' };
      if (/(ipva|licenciamento|detran|multa|emplacamento)/i.test(lower))
        return { categoria: 'IPVA / Licenciamento', subcategoria: 'IPVA', centroCusto: 'Frota' };
      if (/(pedagio|sem parar|conectcar|tag)/i.test(lower))
        return { categoria: 'Pedágios', subcategoria: 'Pedágios', centroCusto: 'Frota' };
      if (/(salario|salário|prolabore|pro-labore|folha|ferias|decimo|rescisao)/i.test(lower))
        return { categoria: 'Salários', subcategoria: 'Salários', centroCusto: 'Administrativo' };
      if (/(aluguel|locacao)/i.test(lower))
        return { categoria: 'Aluguel', subcategoria: 'Imóvel Sede', centroCusto: 'Administrativo' };
      if (/(luz|energia|copel|agua|sanepar|telefone|oi fibra|vivo|claro)/i.test(lower))
        return { categoria: 'Água, Luz, Telefone', subcategoria: 'Telefone/Internet', centroCusto: 'Administrativo' };
      if (/(material escritorio|papelaria|impressao)/i.test(lower))
        return { categoria: 'Material de Escritório', subcategoria: 'Papelaria', centroCusto: 'Administrativo' };
      if (/(simples|das|fgts|inss)/i.test(lower))
        return { categoria: 'Simples Nacional', subcategoria: 'DAS', centroCusto: 'Administrativo' };
      if (/(contador|contabilidade|nota fiscal)/i.test(lower))
        return { categoria: 'Serviços Contábeis', subcategoria: 'Contabilidade', centroCusto: 'Administrativo' };
      if (/(maquininha|ton|cielo|rede|getnet)/i.test(lower))
        return { categoria: 'Tarifas Bancárias', subcategoria: 'Taxas Maquininha', centroCusto: 'Administrativo' };
      if (/(restaurante|lanchonete|padaria|mercado|supermercado|farmacia|remedio)/i.test(lower))
        return { categoria: 'Alimentação', subcategoria: 'Refeições', centroCusto: 'Administrativo' };
      if (/(cartao credito|fatura cartao|nubank|elo)/i.test(lower))
        return { categoria: 'Cartão de Crédito', subcategoria: 'Fatura Cartão', centroCusto: 'Administrativo' };
    }

    return { categoria: null, subcategoria: null, centroCusto: null };
  };

  // Categorização em lote (100% local, síncrona)
  const categorizeBatch = (transacoesList: ExtratoTransacao[]): ExtratoTransacao[] => {
    return transacoesList.map(t => {
      const r = categorizeTransaction(t.descricao, t.tipo);
      if (r.categoria) {
        return { ...t, categoria: r.categoria, subcategoria: r.subcategoria || undefined, centroCustoId: r.centroCusto || undefined, status: 'CATEGORIZADO' as const };
      }
      return t;
    });
  };

  // Tenta OpenRouter no background (não bloqueia o import)
  const categorizarComIA = async (pendentes: ExtratoTransacao[]) => {
    if (pendentes.length === 0) return;
    try {
      setUsandoIA(true);
      const catNomes = categorias.map(c => c.nome);
      const subNomes = subcategorias.map(s => s.nome);
      const ccNomes = centrosCusto.map(c => c.nome);

      const prompt = `Categorize cada transacao bancaria. Responda SOMENTE JSON array [{id,c,s,cc}].
Categorias: ${catNomes.join(' | ')}
Subcategorias: ${subNomes.join(' | ')}
CentrosCusto: ${ccNomes.join(' | ')}
Se nenhuma categoria encaixar, use c = "PENDENTE".

${pendentes.map(t => `{id:"${t.id}", desc:"${t.descricao}", valor:${t.valor}, tipo:"${t.tipo}"}`).join('\n')}`;

      const r = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${aiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': window.location.origin,
          'X-Title': 'Relampago Cacambas',
        },
        body: JSON.stringify({
          model: aiModel,
          messages: [{ role: 'system', content: 'Voce é um categorizador financeiro brasileiro. Responda APENAS JSON.' }, { role: 'user', content: prompt }],
          temperature: 0.1, max_tokens: 4096,
        }),
      });

      if (!r.ok) { console.error('[IA] OpenRouter erro HTTP', r.status, await r.text().catch(() => '')); return; }

      const d = await r.json();
      const rawText = d.choices?.[0]?.message?.content || '';
      if (!rawText) { console.error('[IA] Resposta vazia da API'); return; }

      const cleaned = rawText.replace(/```json?\s*/g, '').replace(/```\s*/g, '').trim();
      const parsed = JSON.parse(cleaned);
      if (!Array.isArray(parsed)) return;

      const map = new Map(parsed.map((item: any) => [item.id, item]));
      let mudou = false;
      const updated = pendentes.map(t => {
        const r = map.get(t.id);
        if (r && r.c && r.c !== 'PENDENTE') {
          mudou = true;
          return { ...t, categoria: r.c, subcategoria: r.s || undefined, centroCustoId: r.cc || undefined, status: 'CATEGORIZADO' as const };
        }
        return t;
      });

      if (mudou) {
        setTransacoes(prev => {
          const mp = new Map(prev.map((x: ExtratoTransacao) => [x.id, x]));
          for (const u of updated) mp.set(u.id, u);
          const next = [...mp.values()];
          saveLocal('bancario_transacoes', next);
          return next;
        });
      }
    } catch (e) { console.error('[IA] Erro categorizando', e); } finally {
      setUsandoIA(false);
    }
  };

  // Parse OFX (SGML-like format usado por bancos brasileiros)
  const parseOFX = (text: string): { data: string; descricao: string; valor: number; tipo: 'CREDITO' | 'DEBITO' }[] => {
    const results: { data: string; descricao: string; valor: number; tipo: 'CREDITO' | 'DEBITO' }[] = [];

    // Remove quebras de linha dentro de tags
    let clean = text.replace(/\r\n?/g, '\n').replace(/>\s+</g, '><').replace(/\n\s*/g, '');

    // Extrai todos os blocos <STMTTRN>...</STMTTRN>
    const trnRegex = /<STMTTRN>(.*?)<\/STMTTRN>/gi;
    let match: RegExpExecArray | null;
    while ((match = trnRegex.exec(clean)) !== null) {
      const block = match[1];

      const getTag = (tag: string): string => {
        const m = new RegExp(`<${tag}>[ \t]*(.*?)[ \t]*<\/${tag}>`, 'i').exec(block);
        return m ? m[1].trim() : '';
      };

      const trnType = getTag('TRNTYPE').toUpperCase();
      const dtPosted = getTag('DTPOSTED');
      let trnAmt = getTag('TRNAMT');
      const memo = getTag('MEMO');
      const name = getTag('NAME');

      if (!dtPosted || !trnAmt) continue;

      // Converte data OFX (YYYYMMDD ou YYYYMMDDHHMMSS) para DD/MM/YYYY
      let data = dtPosted;
      if (/^\d{8}$/.test(data)) {
        data = `${data.slice(6,8)}/${data.slice(4,6)}/${data.slice(0,4)}`;
      } else if (/^\d{14}$/.test(data)) {
        data = `${data.slice(6,8)}/${data.slice(4,6)}/${data.slice(0,4)}`;
      }

      const descricao = memo || name || 'Sem descrição';
      let valor = parseFloat(trnAmt.replace(',', ''));
      if (isNaN(valor)) continue;

      let tipo: 'CREDITO' | 'DEBITO' = 'CREDITO';
      if (valor < 0 || trnType === 'DEBIT' || trnType === 'OTHER') {
        valor = Math.abs(valor);
        tipo = 'DEBITO';
      }

      if (data && descricao && valor > 0) {
        results.push({ data, descricao, valor, tipo });
      }
    }

    return results;
  };

  // Parse CSV (lida com formato brasileiro e americano, BOM, headers)
  const parseCSV = (text: string): { data: string; descricao: string; valor: number; tipo: 'CREDITO' | 'DEBITO' }[] => {
    // Remove BOM e normaliza quebras de linha
    let clean = text.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    const lines = clean.split('\n').filter(l => l.trim());
    const results: any[] = [];

    // Detecta delimitador (; na primeira linha é mais comum em bancos BR)
    const firstLine = lines[0] || '';
    const delim = firstLine.includes(';') ? ';' : firstLine.includes('\t') ? '\t' : ',';

    // Pula header (primeira linha se contiver texto não-numérico)
    const startIdx = lines.length > 0 && /[a-zA-Z]/g.test(lines[0].split(delim).filter(Boolean).join('')) ? 1 : 0;

    for (let i = startIdx; i < lines.length; i++) {
      const line = lines[i];
      // Separa por delimitador, respeitando aspas
      const parts: string[] = [];
      let current = '';
      let inQuotes = false;
      for (const ch of line) {
        if (ch === '"') { inQuotes = !inQuotes; continue; }
        if (ch === delim && !inQuotes) { parts.push(current); current = ''; continue; }
        current += ch;
      }
      parts.push(current);

      if (parts.length < 2) continue;

      let data = '', descricao = '', valor = 0, tipo: 'CREDITO' | 'DEBITO' = 'CREDITO';

      for (const p of parts) {
        let s = p.trim().replace(/["']/g, '');
        if (!s) continue;

        // Data: DD/MM/YYYY ou YYYY-MM-DD
        if (/^\d{2}\/\d{2}\/\d{4}$/.test(s) || /^\d{4}-\d{2}-\d{2}$/.test(s)) { data = s; continue; }

        // Valor numérico (incluindo negativo)
        // Remove símbolos de moeda e espaços
        let valStr = s.replace(/[R$\s]/g, '').trim();

        // Detecta formato brasileiro (1.234,56) vs americano (1234.56)
        const temVirgula = valStr.includes(',');
        const temPonto = valStr.replace(/[^\d.,\-]/g, '').includes('.');
        const ultimaVirgula = valStr.lastIndexOf(',');
        const ultimoPonto = valStr.lastIndexOf('.');

        let num: number;
        if (temVirgula && (!temPonto || ultimaVirgula > ultimoPonto)) {
          num = parseFloat(valStr.replace(/\./g, '').replace(',', '.'));
        } else {
          num = parseFloat(valStr.replace(',', ''));
        }

        const digitCount = valStr.replace(/[^0-9]/g, '').length;
        if (!isNaN(num) && digitCount > 0 && digitCount < 15) {
          if (num < 0) { valor = Math.abs(num); tipo = 'DEBITO'; }
          else { valor = num; tipo = 'CREDITO'; }
          continue;
        }

        // Descrição (texto longo)
        if (s.length > 2) descricao = s;
      }

      if (data && descricao && valor > 0) {
        results.push({ data, descricao, valor, tipo });
      }
    }
    return results;
  };

  const [errorMsg, setErrorMsg] = useState('');
  const [usandoIA, setUsandoIA] = useState(false);
  const [aiKey, setAiKey] = useState(() => loadLocal('bancario_ai_key', ''));
  const [aiModel, setAiModel] = useState(() => loadLocal('bancario_ai_model', 'meta-llama/llama-3.3-70b-instruct:free'));
  useEffect(() => { saveLocal('bancario_ai_key', aiKey); }, [aiKey]);
  useEffect(() => { saveLocal('bancario_ai_model', aiModel); }, [aiModel]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setErrorMsg('');
    setProcessing(true);

    try {
      const text = await file.text();

      // Detecta se é OFX (começa com OFXHEADER ou <OFX>)
      const isOFX = /^\s*(OFXHEADER|<OFX>)/i.test(text);
      const parsed = isOFX ? parseOFX(text) : parseCSV(text);

    if (parsed.length === 0) {
      // Debug: mostra primeiros 200 chars do arquivo
      const preview = text.slice(0, 200).replace(/\n/g, '\\n');
      setErrorMsg(`Nenhuma transação encontrada no ${isOFX ? 'OFX' : 'CSV'}. Preview: "${preview}"`);
      setProcessing(false);
      return;
    }

    const dates = parsed.map(p => p.data).sort();
    const importacao: ImportacaoExtrato = {
      id: generateId('IMP-'), nomeArquivo: file.name, banco: 'Cora',
      dataInicio: dates[0], dataFim: dates[dates.length - 1],
      totalLinhas: parsed.length, categorizadas: 0, pendentes: parsed.length,
      status: 'CONCLUIDO', createdAt: new Date().toISOString(),
    };

    const transacoesNovas: ExtratoTransacao[] = parsed.map(p => ({
      id: generateId('EXT-'), data: p.data, descricao: p.descricao, valor: p.valor, tipo: p.tipo,
      status: 'PENDENTE', importacaoId: importacao.id, createdAt: new Date().toISOString(),
    }));

    setImportacoes(prev => [importacao, ...prev]);
    setTransacoes(prev => {
      const todas = [...transacoesNovas, ...prev];
      saveLocal('bancario_transacoes', todas);
      return todas;
    });
    setActiveImportId(importacao.id);

    if (supabase) {
      await supabase.from('importacoes_extrato').insert([{
        id: importacao.id, nome_arquivo: importacao.nomeArquivo, banco: importacao.banco,
        data_inicio: importacao.dataInicio, data_fim: importacao.dataFim,
        total_linhas: importacao.totalLinhas, categorizadas: 0, pendentes: importacao.totalLinhas, status: 'CONCLUIDO',
      }]);
    }

    // ─── AUTO-CATEGORIZAÇÃO IMEDIATA ───
    const categorizadas = categorizeBatch(transacoesNovas);
    const cats = categorizadas.filter(t => t.status === 'CATEGORIZADO').length;

    if (cats > 0) {
      setTransacoes(prev => {
        const map = new Map(prev.map(x => [x.id, x]));
        for (const u of categorizadas) map.set(u.id, u);
        const next = [...map.values()];
        saveLocal('bancario_transacoes', next);
        return next;
      });
      setImportacoes(prev => prev.map(i =>
        i.id === importacao.id ? { ...i, categorizadas: cats, pendentes: i.totalLinhas - cats } : i
      ));
    }

    // Tenta IA no background pro que sobrou
    const aindaPendentes = categorizadas.filter(t => t.status !== 'CATEGORIZADO');
    if (aindaPendentes.length > 0) {
      categorizarComIA(aindaPendentes);
    }

    setProcessing(false);
    } catch (err: any) {
      setErrorMsg(`Erro ao processar arquivo: ${err.message || 'erro desconhecido'}`);
      setProcessing(false);
    }
  };

  // Gera CSV de exemplo para teste
  const gerarCSVExemplo = () => {
    const linhas = [
      'Data;Descrição;Valor',
      '01/03/2025;PIX RECEBIDO - DOUGLAS SILVEIRA;50,00',
      '01/03/2025;PAGAMENTO DE BOLETO - NU PAGAMENTOS SA;-500,00',
      '02/03/2025;PIX RECEBIDO - EDUARDO CIDRAL;75,00',
      '03/03/2025;PAGAMENTO CONTA LUZ - COPEL;-162,59',
      '04/03/2025;PIX RECEBIDO - DNA SUCATAS;1200,00',
      '05/03/2025;PAGTO CONTA TELEFONE - OI FIBRA;-153,25',
      '06/03/2025;ABASTECIMENTO DIESEL - POSTO SHELL;-850,00',
      '07/03/2025;PIX RECEBIDO - LILIAN DE FATIMA;100,00',
      '08/03/2025;MANUTENCAO CAMINHAO - OFICINA;-1200,00',
      '10/03/2025;PIX ENVIADO - JOSIANI APARECIDA PEREIRA;-300,00',
      '10/03/2025;PIX RECEBIDO - JAIME PLACIDO;480,00',
      '12/03/2025;SEGURO SULFRAN;-250,00',
    ];
    const blob = new Blob([linhas.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'extrato_exemplo.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  const autoCategorizeNow = () => {
    const pending = transacoes.filter(t => t.status === 'PENDENTE');
    if (pending.length === 0) return;

    setProcessing(true);
    const updated = categorizeBatch(pending);

    const cats = updated.filter(u => u.status === 'CATEGORIZADO').length;
    setTransacoes(prev => {
      const map = new Map(prev.map(x => [x.id, x]));
      for (const u of updated) map.set(u.id, u);
      const next = [...map.values()];
      saveLocal('bancario_transacoes', next);
      return next;
    });

    if (cats > 0) {
      setImportacoes(prev => prev.map(i => ({
        ...i, categorizadas: i.categorizadas + cats, pendentes: i.pendentes - cats
      })));
    }
    setProcessing(false);
  };

  const updateTransacao = (id: string, updates: Partial<ExtratoTransacao>) => {
    setTransacoes(prev => {
      const next = prev.map(t => t.id === id ? { ...t, ...updates } as ExtratoTransacao : t);
      saveLocal('bancario_transacoes', next);
      return next;
    });
  };

  const transacoesFiltradas = useMemo(() => {
    let list = activeImportId ? transacoes.filter(t => t.importacaoId === activeImportId) : transacoes;
    if (searchTerm) list = list.filter(t => t.descricao.toLowerCase().includes(searchTerm.toLowerCase()));
    if (filtroStatus !== 'TODOS') list = list.filter(t => t.status === filtroStatus);
    return list;
  }, [transacoes, activeImportId, searchTerm, filtroStatus]);

  const pendentes = transacoes.filter(t => t.status === 'PENDENTE').length;
  const categorizadas = transacoes.filter(t => t.status === 'CATEGORIZADO' || t.status === 'CONCILIADO').length;
  const pctCategorizadas = transacoes.length > 0 ? Math.round((categorizadas / transacoes.length) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Upload */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
        <h3 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
          <Upload className="w-4 h-4 text-emerald-600" />
          Importar Extrato (CSV / OFX)
        </h3>
        <p className="text-xs text-slate-400 mb-4">
          Faça upload do extrato bancário em CSV ou OFX. Todas as transações serão categorizadas automaticamente.
        </p>

        {errorMsg && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
            <span className="text-xs text-red-700">{errorMsg}</span>
            <button onClick={() => setErrorMsg('')} className="ml-auto text-red-400 hover:text-red-600 cursor-pointer"><X className="w-3.5 h-3.5" /></button>
          </div>
        )}

        <label className={`flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-8 cursor-pointer transition-colors ${processing ? 'border-slate-200 bg-slate-50' : 'border-emerald-300 hover:border-emerald-400 bg-emerald-50/30'}`}>
          <FileSpreadsheet className={`w-10 h-10 mb-3 ${processing ? 'text-slate-300 animate-spin' : 'text-emerald-500'}`} />
          <span className="text-sm font-bold text-slate-700">{processing ? 'Processando...' : 'Clique para selecionar CSV/OFX'}</span>
          <span className="text-xs text-slate-400 mt-1">CSV (; ou ,) ou OFX</span>
          <input type="file" accept=".csv,.txt,.ofx" onChange={handleFileUpload} className="sr-only" disabled={processing} />
        </label>
        <button onClick={gerarCSVExemplo} className="text-xs text-purple-600 hover:text-purple-800 font-bold mt-2 cursor-pointer">
          ↓ Baixar CSV de exemplo
        </button>
      </div>

      {/* Status bar */}
      {transacoes.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-center gap-3">
            <FileText className="w-5 h-5 text-blue-600" />
            <div>
              <span className="text-lg font-black text-blue-700">{transacoes.length}</span>
              <p className="text-[10px] font-bold text-blue-600 uppercase">Total</p>
            </div>
          </div>
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <div>
              <span className="text-lg font-black text-emerald-700">{categorizadas}</span>
              <p className="text-[10px] font-bold text-emerald-600 uppercase">Categorizadas ({pctCategorizadas}%)</p>
            </div>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600" />
            <div>
              <span className="text-lg font-black text-amber-700">{pendentes}</span>
              <p className="text-[10px] font-bold text-amber-600 uppercase">Pendentes</p>
            </div>
          </div>
        </div>
      )}

      {/* Auto-categorize button */}
      {pendentes > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {usandoIA ? <RefreshCw className="w-5 h-5 text-purple-600 animate-spin" /> : <Brain className="w-5 h-5 text-amber-600" />}
            <span className="text-sm font-bold text-amber-800">
              {processing ? (usandoIA ? 'Categorizando com IA...' : 'Processando...') : `${pendentes} pendente(s) — clique para categorizar (IA + regras)`}
            </span>
          </div>
          <button onClick={autoCategorizeNow} disabled={processing}
            className="bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white px-5 py-2 rounded-lg text-sm font-bold flex items-center gap-2 cursor-pointer transition-colors">
            <Brain className="w-4 h-4" />
            {processing ? 'Categorizando...' : 'Categorizar Agora'}
          </button>
        </div>
      )}

      {/* AI Config */}
      <details className="bg-slate-50 border border-slate-200 rounded-xl p-4">
        <summary className="text-xs font-bold text-slate-500 cursor-pointer select-none flex items-center gap-2">
          <Brain className="w-3.5 h-3.5 text-purple-500" />
          Configuração da IA (OpenRouter)
        </summary>
        <div className="mt-3 space-y-2">
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">API Key</label>
            <input type="password" value={aiKey} onChange={e => setAiKey(e.target.value)}
              placeholder="sk-or-v1-..."
              className="w-full text-xs border border-slate-200 rounded-lg px-3 py-1.5 outline-none focus:border-purple-400 font-mono" />
          </div>
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Modelo</label>
            <select value={aiModel} onChange={e => setAiModel(e.target.value)}
              className="w-full text-xs border border-slate-200 rounded-lg px-3 py-1.5 bg-white text-slate-700 cursor-pointer">
              <optgroup label="Grátis">
                <option value="meta-llama/llama-3.3-70b-instruct:free">Llama 3.3 70B (grátis)</option>
                <option value="google/gemini-2.0-flash-001:free">Gemini 2.0 Flash (grátis)</option>
                <option value="mistralai/mistral-small-24b-instruct-2501:free">Mistral Small (grátis)</option>
              </optgroup>
              <optgroup label="Pagos (recomendado)">
                <option value="openai/gpt-4o-mini">GPT-4o Mini (~$0.15/M)</option>
                <option value="google/gemini-2.0-flash-001">Gemini 2.0 Flash (~$0.10/M)</option>
              </optgroup>
            </select>
          </div>
          <p className="text-[10px] text-slate-400">Key salva no localStorage. Modelos grátis podem falhar por rate-limit.</p>
        </div>
      </details>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-400">Importação:</span>
          <select value={activeImportId || ''} onChange={e => setActiveImportId(e.target.value || null)}
            className="text-xs border border-slate-200 rounded-lg px-3 py-1.5 bg-white text-slate-700 cursor-pointer">
            <option value="">Todas as importações</option>
            {importacoes.map(i => (
              <option key={i.id} value={i.id}>
                {i.nomeArquivo} — {new Date(i.createdAt).toLocaleDateString('pt-BR')} ({i.categorizadas}/{i.totalLinhas})
              </option>
            ))}
          </select>
        </div>
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
            placeholder="Buscar transação..."
            className="w-full text-xs border border-slate-200 rounded-lg pl-8 pr-3 py-1.5 outline-none focus:border-purple-400" />
        </div>
        <select value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)}
          className="text-xs border border-slate-200 rounded-lg px-3 py-1.5 bg-white text-slate-700 cursor-pointer">
          <option value="TODOS">Todos Status</option>
          <option value="PENDENTE">Pendente</option>
          <option value="CATEGORIZADO">Categorizado</option>
          <option value="CONCILIADO">Conciliado</option>
        </select>
      </div>

      {/* Transactions table */}
      {transacoesFiltradas.length > 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                  <th className="px-4 py-3">Data</th>
                  <th className="px-4 py-3">Descrição</th>
                  <th className="px-4 py-3 text-right">Valor</th>
                  <th className="px-4 py-3">Categoria</th>
                  <th className="px-4 py-3">Subcategoria</th>
                  <th className="px-4 py-3">Centro Custo</th>
                  <th className="px-4 py-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {transacoesFiltradas.map(t => (
                  <tr key={t.id} className="text-xs hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 text-slate-500 font-mono">{t.data}</td>
                    <td className="px-4 py-3 text-slate-700 font-medium max-w-[220px] truncate" title={t.descricao}>{t.descricao}</td>
                    <td className={`px-4 py-3 font-mono font-bold text-right ${t.tipo === 'CREDITO' ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {t.tipo === 'CREDITO' ? '+' : '-'}R$ {t.valor.toFixed(2)}
                    </td>
                    <td className="px-4 py-3">
                      <select value={t.categoria || ''} onChange={e => updateTransacao(t.id, { categoria: e.target.value || undefined })}
                        className="text-xs border border-slate-200 rounded px-2 py-1 bg-white cursor-pointer max-w-[130px]">
                        <option value="">--</option>
                        {categorias.map(c => <option key={c.id} value={c.nome}>{c.nome}</option>)}
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <select value={t.subcategoria || ''} onChange={e => updateTransacao(t.id, { subcategoria: e.target.value || undefined })}
                        className="text-xs border border-slate-200 rounded px-2 py-1 bg-white cursor-pointer max-w-[130px]">
                        <option value="">--</option>
                        {subcategorias.map(s => <option key={s.id} value={s.nome}>{s.nome}</option>)}
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <select value={t.centroCustoId || ''} onChange={e => updateTransacao(t.id, { centroCustoId: e.target.value || undefined })}
                        className="text-xs border border-slate-200 rounded px-2 py-1 bg-white cursor-pointer max-w-[100px]">
                        <option value="">--</option>
                        {centrosCusto.filter(cc => cc.ativo).map(cc => <option key={cc.id} value={cc.id}>{cc.codigo}</option>)}
                      </select>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold whitespace-nowrap ${
                        t.status === 'CATEGORIZADO' ? 'bg-emerald-50 text-emerald-700' :
                        t.status === 'CONCILIADO' ? 'bg-blue-50 text-blue-700' :
                        t.status === 'IGNORADO' ? 'bg-slate-100 text-slate-500' :
                        'bg-amber-50 text-amber-700'
                      }`}>
                        {t.status === 'CATEGORIZADO' ? 'OK' : t.status === 'CONCILIADO' ? 'CONC' : t.status === 'IGNORADO' ? 'IGN' : '?'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="text-center py-12 text-slate-400">
          <FileSpreadsheet className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p className="text-sm font-bold">Nenhuma transação</p>
          <p className="text-xs mt-1">Importe um extrato CSV para começar.</p>
        </div>
      )}
    </div>
  );
}

// ─── DRE AVANÇADO ───
function DREView() {
  const { transacoes, grupos, categorias, subcategorias } = useBancarioData();
  const [periodoInicio, setPeriodoInicio] = useState('');
  const [periodoFim, setPeriodoFim] = useState('');
  const [apenasCategorizados, setApenasCategorizados] = useState(true);

  const dre = useMemo(() => {
    let filtradas = transacoes;
    if (apenasCategorizados) filtradas = filtradas.filter(t => t.status !== 'PENDENTE' && t.status !== 'IGNORADO');
    if (periodoInicio) filtradas = filtradas.filter(t => t.data >= periodoInicio);
    if (periodoFim) filtradas = filtradas.filter(t => t.data <= periodoFim);

    const receitas: { nome: string; valor: number; subcategorias: { nome: string; valor: number }[] }[] = [];
    const despesas: { nome: string; valor: number; subcategorias: { nome: string; valor: number }[] }[] = [];

    for (const g of grupos) {
      const catList = categorias.filter(c => c.grupoId === g.id);
      for (const c of catList) {
        const item = { nome: c.nome, valor: 0, subcategorias: [] as { nome: string; valor: number }[] };
        const subs = subcategorias.filter(s => s.categoriaId === c.id);
        for (const s of subs) {
          const total = filtradas.filter(t => t.subcategoria === s.nome)
            .reduce((acc, t) => t.tipo === 'CREDITO' ? acc + t.valor : acc - t.valor, 0);
          if (total !== 0) {
            item.subcategorias.push({ nome: s.nome, valor: Math.abs(total) });
            item.valor += total;
          }
        }
        const directTotal = filtradas.filter(t => t.categoria === c.nome && !t.subcategoria)
          .reduce((acc, t) => t.tipo === 'CREDITO' ? acc + t.valor : acc - t.valor, 0);
        if (directTotal !== 0) item.valor += directTotal;

        if (item.valor !== 0 || item.subcategorias.length > 0) {
          if (g.tipo === 'RECEITA') receitas.push(item);
          else despesas.push(item);
        }
      }
    }

    const totalReceitas = receitas.reduce((a, i) => a + i.valor, 0);
    const totalDespesas = despesas.reduce((a, i) => a + i.valor, 0);
    const lucro = totalReceitas - totalDespesas;
    const margem = totalReceitas > 0 ? (lucro / totalReceitas) * 100 : 0;

    return { receitas, despesas, totalReceitas, totalDespesas, lucro, margem };
  }, [transacoes, grupos, categorias, subcategorias, periodoInicio, periodoFim, apenasCategorizados]);

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-slate-400" />
          <input type="date" value={periodoInicio} onChange={e => setPeriodoInicio(e.target.value)}
            className="text-xs border border-slate-200 rounded-lg px-3 py-1.5 outline-none focus:border-purple-400" />
          <span className="text-xs text-slate-400">até</span>
          <input type="date" value={periodoFim} onChange={e => setPeriodoFim(e.target.value)}
            className="text-xs border border-slate-200 rounded-lg px-3 py-1.5 outline-none focus:border-purple-400" />
        </div>
        <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
          <input type="checkbox" checked={apenasCategorizados} onChange={e => setApenasCategorizados(e.target.checked)}
            className="rounded cursor-pointer" />
          Apenas categorizados
        </label>
      </div>

      {/* Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5">
          <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">Receitas</span>
          <p className="text-2xl font-black text-emerald-700 mt-1">{formatMoney(dre.totalReceitas)}</p>
        </div>
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-5">
          <span className="text-[10px] font-bold text-rose-700 uppercase tracking-wider">Despesas</span>
          <p className="text-2xl font-black text-rose-700 mt-1">{formatMoney(dre.totalDespesas)}</p>
        </div>
        <div className={`border rounded-xl p-5 ${dre.lucro >= 0 ? 'bg-blue-50 border-blue-200' : 'bg-red-50 border-red-200'}`}>
          <span className="text-[10px] font-bold uppercase tracking-wider ${dre.lucro >= 0 ? 'text-blue-700' : 'text-red-700'}">Resultado</span>
          <p className={`text-2xl font-black mt-1 ${dre.lucro >= 0 ? 'text-blue-700' : 'text-red-700'}`}>
            {dre.lucro >= 0 ? '+' : '-'}{formatMoney(Math.abs(dre.lucro))}
          </p>
        </div>
        <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-5">
          <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider">Margem Líquida</span>
          <p className={`text-2xl font-black mt-1 ${dre.margem >= 0 ? 'text-indigo-700' : 'text-red-600'}`}>
            {dre.margem >= 0 ? '+' : ''}{dre.margem.toFixed(1)}%
          </p>
        </div>
      </div>

      {/* DRE Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h3 className="text-sm font-bold text-slate-700">Demonstrativo de Resultados</h3>
        </div>
        <div className="p-6 space-y-6">
          {dre.receitas.length === 0 && dre.despesas.length === 0 ? (
            <p className="text-sm text-slate-400 italic text-center py-8">
              Nenhum dado disponível. Importe e categorize transações primeiro.
            </p>
          ) : (
            <>
              {/* Receitas */}
              {dre.receitas.length > 0 && (
                <div>
                  <h4 className="text-sm font-bold text-emerald-700 mb-3">RECEITAS</h4>
                  <div className="space-y-2">
                    {dre.receitas.map(cat => (
                      <div key={cat.nome}>
                        <div className="flex items-center justify-between py-1.5 px-3 bg-emerald-50 rounded-lg">
                          <span className="text-sm font-semibold text-slate-700">{cat.nome}</span>
                          <span className="text-sm font-bold text-emerald-600">{formatMoney(cat.valor)}</span>
                        </div>
                        {cat.subcategorias.map(sub => (
                          <div key={sub.nome} className="flex items-center justify-between py-1 pl-6 pr-3">
                            <span className="text-xs text-slate-500">{sub.nome}</span>
                            <span className="text-xs font-mono text-slate-600">{formatMoney(sub.valor)}</span>
                          </div>
                        ))}
                      </div>
                    ))}
                    <div className="flex items-center justify-between py-2 border-t border-emerald-200 mt-2">
                      <span className="text-sm font-bold text-emerald-700">Total de Receitas</span>
                      <span className="text-sm font-black text-emerald-700">{formatMoney(dre.totalReceitas)}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Despesas */}
              {dre.despesas.length > 0 && (
                <div>
                  <h4 className="text-sm font-bold text-rose-700 mb-3">DESPESAS</h4>
                  <div className="space-y-2">
                    {dre.despesas.map(cat => (
                      <div key={cat.nome}>
                        <div className="flex items-center justify-between py-1.5 px-3 bg-rose-50 rounded-lg">
                          <span className="text-sm font-semibold text-slate-700">{cat.nome}</span>
                          <span className="text-sm font-bold text-rose-600">{formatMoney(cat.valor)}</span>
                        </div>
                        {cat.subcategorias.map(sub => (
                          <div key={sub.nome} className="flex items-center justify-between py-1 pl-6 pr-3">
                            <span className="text-xs text-slate-500">{sub.nome}</span>
                            <span className="text-xs font-mono text-slate-600">{formatMoney(sub.valor)}</span>
                          </div>
                        ))}
                      </div>
                    ))}
                    <div className="flex items-center justify-between py-2 border-t border-rose-200 mt-2">
                      <span className="text-sm font-bold text-rose-700">Total de Despesas</span>
                      <span className="text-sm font-black text-rose-700">{formatMoney(dre.totalDespesas)}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Resultado */}
              <div className={`flex items-center justify-between py-3 px-4 rounded-xl ${dre.lucro >= 0 ? 'bg-blue-50' : 'bg-red-50'}`}>
                <div>
                  <span className="text-base font-bold">Resultado Líquido</span>
                  <p className="text-[10px] text-slate-500 font-medium">Margem: {dre.margem.toFixed(1)}%</p>
                </div>
                <span className={`text-base font-black ${dre.lucro >= 0 ? 'text-blue-700' : 'text-red-700'}`}>
                  {formatMoney(dre.lucro)}
                </span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── PATRIMÔNIO ───
function PatrimonioView() {
  const [itens, setItens] = useState<PatrimonioItem[]>(() => loadLocal('bancario_patrimonio', []));
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ nome: '', tipo: 'EQUIPAMENTO' as PatrimonioItem['tipo'], dataAquisicao: '', valorAquisicao: 0, valorResidual: 0, vidaUtil: 5, localizacao: '', observacao: '' });

  useEffect(() => { saveLocal('bancario_patrimonio', itens); }, [itens]);

  useEffect(() => {
    fetch(`${API_BASE}/api/bancario/patrimonio`).then(r => r.json()).then(data => {
      if (data.length) setItens(data);
    }).catch(() => {});
  }, []);

  const calcDepreciacao = (valorAquisicao: number, valorResidual: number, vidaUtil: number) => {
    return vidaUtil > 0 ? (valorAquisicao - valorResidual) / vidaUtil : 0;
  };

  const addItem = async () => {
    if (!form.nome.trim() || !form.dataAquisicao || form.valorAquisicao <= 0) return;
    const depAnual = calcDepreciacao(form.valorAquisicao, form.valorResidual, form.vidaUtil);
    const anosDesdeAquisicao = Math.max(0, Math.floor((Date.now() - new Date(form.dataAquisicao).getTime()) / (365.25 * 24 * 60 * 60 * 1000)));
    const depAcum = Math.min(depAnual * anosDesdeAquisicao, form.valorAquisicao - form.valorResidual);
    const item: PatrimonioItem = {
      id: generateId('PAT-'), nome: form.nome.trim(), tipo: form.tipo,
      dataAquisicao: form.dataAquisicao, valorAquisicao: form.valorAquisicao, valorResidual: form.valorResidual,
      vidaUtil: form.vidaUtil, depreciacaoAnual: depAnual, depreciacaoAcumulada: depAcum,
      valorContabil: form.valorAquisicao - depAcum, localizacao: form.localizacao || undefined,
      observacao: form.observacao || undefined, createdAt: new Date().toISOString(),
    };
    setItens(prev => [item, ...prev]);
    await fetch(`${API_BASE}/api/bancario/patrimonio`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(item) }).catch(() => {});
    setShowForm(false);
    setForm({ nome: '', tipo: 'EQUIPAMENTO', dataAquisicao: '', valorAquisicao: 0, valorResidual: 0, vidaUtil: 5, localizacao: '', observacao: '' });
  };

  const deleteItem = async (id: string) => {
    setItens(prev => prev.filter(i => i.id !== id));
    await fetch(`${API_BASE}/api/bancario/patrimonio/${id}`, { method: 'DELETE' }).catch(() => {});
  };

  const tipos: { value: PatrimonioItem['tipo']; label: string }[] = [
    { value: 'IMOVEL', label: 'Imóvel' }, { value: 'VEICULO', label: 'Veículo' },
    { value: 'MAQUINA', label: 'Máquina' }, { value: 'EQUIPAMENTO', label: 'Equipamento' },
    { value: 'MOVEIS', label: 'Móveis' }, { value: 'OUTROS', label: 'Outros' },
  ];

  const totalPatrimonio = itens.reduce((a, i) => a + i.valorAquisicao, 0);
  const totalDepreciado = itens.reduce((a, i) => a + i.depreciacaoAcumulada, 0);
  const totalContabil = itens.reduce((a, i) => a + i.valorContabil, 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <span className="text-[10px] font-bold text-blue-700 uppercase">Valor Aquisição</span>
          <p className="text-xl font-black text-blue-700 mt-1">{formatMoney(totalPatrimonio)}</p>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <span className="text-[10px] font-bold text-amber-700 uppercase">Depreciado</span>
          <p className="text-xl font-black text-amber-700 mt-1">{formatMoney(totalDepreciado)}</p>
        </div>
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
          <span className="text-[10px] font-bold text-emerald-700 uppercase">Valor Contábil</span>
          <p className="text-xl font-black text-emerald-700 mt-1">{formatMoney(totalContabil)}</p>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Ativo Imobilizado</h3>
        <button onClick={() => setShowForm(!showForm)}
          className="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 cursor-pointer transition-colors">
          <Plus className="w-4 h-4" /> Novo Item
        </button>
      </div>

      {showForm && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase">Nome do Bem</label>
              <input type="text" value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
                className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 mt-1 outline-none focus:border-purple-400" placeholder="Ex: Caminhão Mercedes" />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase">Tipo</label>
              <select value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value as any }))}
                className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 mt-1 bg-white cursor-pointer">
                {tipos.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase">Data Aquisição</label>
              <input type="date" value={form.dataAquisicao} onChange={e => setForm(f => ({ ...f, dataAquisicao: e.target.value }))}
                className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 mt-1 outline-none focus:border-purple-400" />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase">Valor Aquisição</label>
              <input type="number" value={form.valorAquisicao || ''} onChange={e => setForm(f => ({ ...f, valorAquisicao: Number(e.target.value) }))}
                className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 mt-1 outline-none focus:border-purple-400" />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase">Valor Residual</label>
              <input type="number" value={form.valorResidual || ''} onChange={e => setForm(f => ({ ...f, valorResidual: Number(e.target.value) }))}
                className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 mt-1 outline-none focus:border-purple-400" />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase">Vida Útil (anos)</label>
              <input type="number" value={form.vidaUtil} onChange={e => setForm(f => ({ ...f, vidaUtil: Number(e.target.value) }))}
                className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 mt-1 outline-none focus:border-purple-400" />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase">Localização</label>
              <input type="text" value={form.localizacao} onChange={e => setForm(f => ({ ...f, localizacao: e.target.value }))}
                className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 mt-1 outline-none focus:border-purple-400" placeholder="Opcional" />
            </div>
          </div>
          <div className="flex items-center gap-2 pt-2">
            <button onClick={addItem} disabled={!form.nome.trim() || !form.dataAquisicao || form.valorAquisicao <= 0}
              className="bg-purple-500 hover:bg-purple-600 text-white px-6 py-2 rounded-lg text-sm font-bold cursor-pointer transition-colors disabled:opacity-50">
              <Save className="w-4 h-4 inline mr-1" /> Salvar Item
            </button>
            <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600 px-4 py-2 text-sm font-bold cursor-pointer">
              Cancelar
            </button>
          </div>
          {form.valorAquisicao > 0 && (
            <p className="text-xs text-slate-500">
              Depreciação anual: {formatMoney(calcDepreciacao(form.valorAquisicao, form.valorResidual, form.vidaUtil))} |
              Vida útil: {form.vidaUtil} anos
            </p>
          )}
        </div>
      )}

      {itens.length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          <Building2 className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p className="text-sm font-bold">Nenhum item cadastrado</p>
          <p className="text-xs mt-1">Adicione veículos, máquinas, imóveis e outros bens.</p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b">
                  <th className="px-4 py-3">Item</th>
                  <th className="px-4 py-3">Tipo</th>
                  <th className="px-4 py-3 text-right">V. Aquisição</th>
                  <th className="px-4 py-3 text-right">Depreciação Acum.</th>
                  <th className="px-4 py-3 text-right">V. Contábil</th>
                  <th className="px-4 py-3 text-center">Vida Util</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {itens.map(item => (
                  <tr key={item.id} className="text-xs hover:bg-slate-50">
                    <td className="px-4 py-3"><span className="font-semibold text-slate-700">{item.nome}</span></td>
                    <td className="px-4 py-3"><span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded-full">{tipos.find(t => t.value === item.tipo)?.label || item.tipo}</span></td>
                    <td className="px-4 py-3 text-right font-mono">{formatMoney(item.valorAquisicao)}</td>
                    <td className="px-4 py-3 text-right font-mono text-amber-600">{formatMoney(item.depreciacaoAcumulada)}</td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-emerald-600">{formatMoney(item.valorContabil)}</td>
                    <td className="px-4 py-3 text-center text-slate-500">{item.vidaUtil} anos</td>
                    <td className="px-4 py-3"><button onClick={() => deleteItem(item.id)} className="text-red-300 hover:text-red-500 cursor-pointer"><Trash2 className="w-3.5 h-3.5" /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── PLANOS ───
function PlanosView() {
  const [planos, setPlanos] = useState<PlanoPagamento[]>(() => loadLocal('bancario_planos', []));
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ descricao: '', instituicao: '', valorTotal: 0, numeroParcelas: 1, parcelasPagas: 0, dataInicio: '', categoria: '', subcategoria: '', mostrarDashboard: true });

  useEffect(() => { saveLocal('bancario_planos', planos); }, [planos]);

  useEffect(() => {
    fetch(`${API_BASE}/api/bancario/planos`).then(r => r.json()).then(data => {
      if (data.length) setPlanos(data);
    }).catch(() => {});
  }, []);

  const addPlano = async () => {
    if (!form.descricao.trim() || !form.dataInicio || form.valorTotal <= 0) return;
    const valorParcela = form.numeroParcelas > 0 ? form.valorTotal / form.numeroParcelas : form.valorTotal;
    const plano: PlanoPagamento = {
      id: generateId('PLN-'), descricao: form.descricao.trim(), instituicao: form.instituicao || undefined,
      valorTotal: form.valorTotal, numeroParcelas: form.numeroParcelas, parcelasPagas: form.parcelasPagas,
      valorParcela, dataInicio: form.dataInicio, status: 'ATIVO',
      categoria: form.categoria || undefined, subcategoria: form.subcategoria || undefined,
      mostrarDashboard: form.mostrarDashboard, createdAt: new Date().toISOString(),
    };
    setPlanos(prev => [plano, ...prev]);
    await fetch(`${API_BASE}/api/bancario/planos`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(plano) }).catch(() => {});
    setShowForm(false);
    setForm({ descricao: '', instituicao: '', valorTotal: 0, numeroParcelas: 1, parcelasPagas: 0, dataInicio: '', categoria: '', subcategoria: '', mostrarDashboard: true });
  };

  const deletePlano = async (id: string) => {
    setPlanos(prev => prev.filter(p => p.id !== id));
    await fetch(`${API_BASE}/api/bancario/planos/${id}`, { method: 'DELETE' }).catch(() => {});
  };

  const toggleStatus = (id: string) => {
    setPlanos(prev => prev.map(p => p.id === id ? { ...p, status: p.status === 'ATIVO' ? 'CONCLUIDO' : 'ATIVO' } as PlanoPagamento : p));
  };

  const incrementParcela = (id: string) => {
    setPlanos(prev => prev.map(p => {
      if (p.id !== id) return p;
      const novasPagas = Math.min(p.parcelasPagas + 1, p.numeroParcelas);
      return { ...p, parcelasPagas: novasPagas, status: novasPagas >= p.numeroParcelas ? 'CONCLUIDO' : 'ATIVO' } as PlanoPagamento;
    }));
  };

  const categoriasList = useState<CategoriaConta[]>(() => loadLocal('bancario_categorias', SEED_CATEGORIAS))[0];
  const subcategoriasList = useState<SubcategoriaConta[]>(() => loadLocal('bancario_subcategorias', SEED_SUBCATEGORIAS))[0];

  const totalPlanos = planos.reduce((a, p) => a + p.valorTotal, 0);
  const totalPago = planos.reduce((a, p) => a + (p.valorParcela * p.parcelasPagas), 0);
  const totalRestante = totalPlanos - totalPago;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <span className="text-[10px] font-bold text-blue-700 uppercase">Valor Total</span>
          <p className="text-xl font-black text-blue-700 mt-1">{formatMoney(totalPlanos)}</p>
        </div>
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
          <span className="text-[10px] font-bold text-emerald-700 uppercase">Já Pago</span>
          <p className="text-xl font-black text-emerald-700 mt-1">{formatMoney(totalPago)}</p>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <span className="text-[10px] font-bold text-amber-700 uppercase">Restante</span>
          <p className="text-xl font-black text-amber-700 mt-1">{formatMoney(totalRestante)}</p>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Planos de Pagamento</h3>
        <button onClick={() => setShowForm(!showForm)}
          className="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 cursor-pointer transition-colors">
          <Plus className="w-4 h-4" /> Novo Plano
        </button>
      </div>

      {showForm && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase">Descrição</label>
              <input type="text" value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))}
                className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 mt-1 outline-none focus:border-purple-400" placeholder="Ex: Financiamento Caminhão" />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase">Instituição</label>
              <input type="text" value={form.instituicao} onChange={e => setForm(f => ({ ...f, instituicao: e.target.value }))}
                className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 mt-1 outline-none focus:border-purple-400" placeholder="Opcional" />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase">Valor Total</label>
              <input type="number" value={form.valorTotal || ''} onChange={e => setForm(f => ({ ...f, valorTotal: Number(e.target.value) }))}
                className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 mt-1 outline-none focus:border-purple-400" />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase">Nº Parcelas</label>
              <input type="number" value={form.numeroParcelas} onChange={e => setForm(f => ({ ...f, numeroParcelas: Number(e.target.value) }))}
                className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 mt-1 outline-none focus:border-purple-400" min={1} />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase">Parcelas Pagas</label>
              <input type="number" value={form.parcelasPagas} onChange={e => setForm(f => ({ ...f, parcelasPagas: Number(e.target.value) }))}
                className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 mt-1 outline-none focus:border-purple-400" min={0} />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase">Data Início</label>
              <input type="date" value={form.dataInicio} onChange={e => setForm(f => ({ ...f, dataInicio: e.target.value }))}
                className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 mt-1 outline-none focus:border-purple-400" />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase">Categoria</label>
              <select value={form.categoria} onChange={e => setForm(f => ({ ...f, categoria: e.target.value }))}
                className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 mt-1 bg-white cursor-pointer">
                <option value="">--</option>
                {categoriasList.map(c => <option key={c.id} value={c.nome}>{c.nome}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase">Subcategoria</label>
              <select value={form.subcategoria} onChange={e => setForm(f => ({ ...f, subcategoria: e.target.value }))}
                className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 mt-1 bg-white cursor-pointer">
                <option value="">--</option>
                {subcategoriasList.map(s => <option key={s.id} value={s.nome}>{s.nome}</option>)}
              </select>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={addPlano} disabled={!form.descricao.trim() || !form.dataInicio || form.valorTotal <= 0}
              className="bg-purple-500 hover:bg-purple-600 text-white px-6 py-2 rounded-lg text-sm font-bold cursor-pointer transition-colors disabled:opacity-50">
              <Save className="w-4 h-4 inline mr-1" /> Salvar Plano
            </button>
            <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
              <input type="checkbox" checked={form.mostrarDashboard} onChange={e => setForm(f => ({ ...f, mostrarDashboard: e.target.checked }))} className="rounded cursor-pointer" />
              Mostrar no Dashboard
            </label>
            <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600 text-sm font-bold cursor-pointer">Cancelar</button>
          </div>
          {form.numeroParcelas > 0 && form.valorTotal > 0 && (
            <p className="text-xs text-slate-500">Parcela: {formatMoney(form.valorTotal / form.numeroParcelas)} · {form.numeroParcelas}x de {formatMoney(form.valorTotal / form.numeroParcelas)}</p>
          )}
        </div>
      )}

      {planos.length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          <Calendar className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p className="text-sm font-bold">Nenhum plano cadastrado</p>
          <p className="text-xs mt-1">Adicione financiamentos, consórcios, parcelamentos.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {planos.map(p => {
            const pct = p.numeroParcelas > 0 ? (p.parcelasPagas / p.numeroParcelas) * 100 : 0;
            const pago = p.valorParcela * p.parcelasPagas;
            const restante = p.valorTotal - pago;
            return (
              <div key={p.id} className={`bg-white border rounded-xl p-5 shadow-sm ${p.status === 'CONCLUIDO' ? 'border-emerald-200 opacity-70' : 'border-slate-200'}`}>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h4 className="text-sm font-bold text-slate-700">{p.descricao}</h4>
                    {p.instituicao && <span className="text-[10px] text-slate-400">{p.instituicao}</span>}
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    p.status === 'ATIVO' ? 'bg-amber-50 text-amber-700' :
                    p.status === 'CONCLUIDO' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                  }`}>{p.status}</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2.5 mb-3">
                  <div className={`h-2.5 rounded-full transition-all ${p.status === 'CONCLUIDO' ? 'bg-emerald-400' : 'bg-purple-500'}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                </div>
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div><span className="text-slate-400 block text-[9px]">Parcelas</span><span className="font-bold text-slate-700">{p.parcelasPagas}/{p.numeroParcelas}</span></div>
                  <div><span className="text-slate-400 block text-[9px]">Parcela</span><span className="font-bold text-slate-700">{formatMoney(p.valorParcela)}</span></div>
                  <div><span className="text-slate-400 block text-[9px]">Restante</span><span className="font-bold text-amber-700">{formatMoney(restante)}</span></div>
                </div>
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
                  <div className="flex gap-1">
                    {p.status === 'ATIVO' && <button onClick={() => incrementParcela(p.id)} className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-1 rounded font-bold hover:bg-emerald-200 cursor-pointer transition-colors">+1 Parcela</button>}
                    <button onClick={() => toggleStatus(p.id)} className="text-[10px] bg-slate-100 text-slate-600 px-2 py-1 rounded font-bold hover:bg-slate-200 cursor-pointer transition-colors">{p.status === 'ATIVO' ? 'Concluir' : 'Reativar'}</button>
                  </div>
                  <button onClick={() => deletePlano(p.id)} className="text-red-300 hover:text-red-500 cursor-pointer"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── CLIENTES ───
function ClientesView() {
  const [clientes, setClientes] = useState<Cliente[]>(() => loadLocal('bancario_clientes', []));
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [form, setForm] = useState({ tipo: 'PF' as 'PF' | 'PJ', nome: '', documento: '', telefone: '', email: '', endereco: '', observacao: '' });

  useEffect(() => { saveLocal('bancario_clientes', clientes); }, [clientes]);

  useEffect(() => {
    fetch(`${API_BASE}/api/bancario/clientes`).then(r => r.json()).then(data => {
      if (data.length) setClientes(data);
    }).catch(() => {});
  }, []);

  const addCliente = async () => {
    if (!form.nome.trim() || !form.documento.trim() || !form.telefone.trim()) return;
    const c: Cliente = {
      id: generateId('CLI-'), tipo: form.tipo, nome: form.nome.trim(),
      documento: form.documento.trim(), telefone: form.telefone.trim(),
      email: form.email || undefined, endereco: form.endereco || undefined,
      observacao: form.observacao || undefined, createdAt: new Date().toISOString(),
    };
    setClientes(prev => [c, ...prev]);
    await fetch(`${API_BASE}/api/bancario/clientes`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(c) }).catch(() => {});
    setShowForm(false);
    setForm({ tipo: 'PF', nome: '', documento: '', telefone: '', email: '', endereco: '', observacao: '' });
  };

  const deleteCliente = async (id: string) => {
    setClientes(prev => prev.filter(c => c.id !== id));
    await fetch(`${API_BASE}/api/bancario/clientes/${id}`, { method: 'DELETE' }).catch(() => {});
  };

  const filtrados = clientes.filter(c =>
    c.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.documento.includes(searchTerm) ||
    c.telefone.includes(searchTerm)
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Clientes PF/PJ</h3>
        <button onClick={() => setShowForm(!showForm)}
          className="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 cursor-pointer transition-colors">
          <Plus className="w-4 h-4" /> Novo Cliente
        </button>
      </div>

      <div className="relative max-w-xs">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
        <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
          placeholder="Buscar por nome, CPF ou telefone..."
          className="w-full text-xs border border-slate-200 rounded-lg pl-8 pr-3 py-2 outline-none focus:border-purple-400" />
      </div>

      {showForm && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase">Tipo</label>
              <select value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value as any }))}
                className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 mt-1 bg-white cursor-pointer">
                <option value="PF">Pessoa Física (PF)</option>
                <option value="PJ">Pessoa Jurídica (PJ)</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase">Nome</label>
              <input type="text" value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
                className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 mt-1 outline-none focus:border-purple-400" placeholder="Nome completo / Razão social" />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase">{form.tipo === 'PF' ? 'CPF' : 'CNPJ'}</label>
              <input type="text" value={form.documento} onChange={e => setForm(f => ({ ...f, documento: e.target.value }))}
                className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 mt-1 outline-none focus:border-purple-400" placeholder="Apenas números" />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase">Telefone</label>
              <input type="text" value={form.telefone} onChange={e => setForm(f => ({ ...f, telefone: e.target.value }))}
                className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 mt-1 outline-none focus:border-purple-400" placeholder="(41) 99999-9999" />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase">Email</label>
              <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 mt-1 outline-none focus:border-purple-400" placeholder="Opcional" />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase">Endereço</label>
              <input type="text" value={form.endereco} onChange={e => setForm(f => ({ ...f, endereco: e.target.value }))}
                className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 mt-1 outline-none focus:border-purple-400" placeholder="Opcional" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={addCliente} disabled={!form.nome.trim() || !form.documento.trim() || !form.telefone.trim()}
              className="bg-purple-500 hover:bg-purple-600 text-white px-6 py-2 rounded-lg text-sm font-bold cursor-pointer transition-colors disabled:opacity-50">
              <Save className="w-4 h-4 inline mr-1" /> Salvar Cliente
            </button>
            <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600 text-sm font-bold cursor-pointer">Cancelar</button>
          </div>
        </div>
      )}

      {filtrados.length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          <UsersIcon className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p className="text-sm font-bold">{clientes.length === 0 ? 'Nenhum cliente cadastrado' : 'Nenhum resultado'}</p>
          <p className="text-xs mt-1">{clientes.length === 0 ? 'Adicione seus clientes PF e PJ.' : 'Tente outro termo de busca.'}</p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b">
                  <th className="px-4 py-3">Nome</th>
                  <th className="px-4 py-3">Tipo</th>
                  <th className="px-4 py-3">Documento</th>
                  <th className="px-4 py-3">Telefone</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtrados.map(c => (
                  <tr key={c.id} className="text-xs hover:bg-slate-50">
                    <td className="px-4 py-3 font-semibold text-slate-700">{c.nome}</td>
                    <td className="px-4 py-3"><span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${c.tipo === 'PJ' ? 'bg-blue-50 text-blue-700' : 'bg-emerald-50 text-emerald-700'}`}>{c.tipo}</span></td>
                    <td className="px-4 py-3 font-mono text-slate-600">{c.documento}</td>
                    <td className="px-4 py-3 text-slate-500">{c.telefone}</td>
                    <td className="px-4 py-3 text-slate-400">{c.email || '—'}</td>
                    <td className="px-4 py-3"><button onClick={() => deleteCliente(c.id)} className="text-red-300 hover:text-red-500 cursor-pointer"><Trash2 className="w-3.5 h-3.5" /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── CENTRO DE CUSTO ───
function CentroCustoView() {
  const [centros, setCentros] = useState<CentroCusto[]>(() => loadLocal('bancario_centros', SEED_CENTROS));
  const [novoNome, setNovoNome] = useState('');
  const [novoCodigo, setNovoCodigo] = useState('');

  useEffect(() => { saveLocal('bancario_centros', centros); }, [centros]);

  useEffect(() => {
    const fetchData = async () => {
      if (!supabase) return;
      const { data } = await supabase.from('centros_custo').select('*');
      if (data?.length) setCentros(data);
    };
    fetchData();
  }, []);

  const addCentro = async () => {
    if (!novoNome.trim() || !novoCodigo.trim()) return;
    const cc: CentroCusto = { id: generateId('CC-'), nome: novoNome.trim(), codigo: novoCodigo.trim(), ativo: true, createdAt: new Date().toISOString() };
    setCentros(prev => [...prev, cc]);
    if (supabase) await supabase.from('centros_custo').insert([{ id: cc.id, nome: cc.nome, codigo: cc.codigo }]);
    setNovoNome(''); setNovoCodigo('');
  };

  const deleteCentro = async (id: string) => {
    setCentros(prev => prev.filter(c => c.id !== id));
    if (supabase) await supabase.from('centros_custo').delete().eq('id', id);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Centros de Custo</h3>
        <div className="flex items-center gap-2">
          <input type="text" value={novoCodigo} onChange={e => setNovoCodigo(e.target.value)}
            placeholder="Código (ex: ADM, OPE)"
            className="w-28 text-sm border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-purple-400 uppercase" />
          <input type="text" value={novoNome} onChange={e => setNovoNome(e.target.value)}
            placeholder="Nome (ex: Administrativo)"
            className="flex-1 text-sm border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-purple-400"
            onKeyDown={e => e.key === 'Enter' && addCentro()} />
          <button onClick={addCentro} disabled={!novoNome.trim() || !novoCodigo.trim()}
            className="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-lg text-sm font-bold cursor-pointer transition-colors disabled:opacity-50">
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {centros.length === 0 && <p className="text-sm text-slate-400 italic">Nenhum centro de custo cadastrado.</p>}

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {centros.map(cc => (
            <div key={cc.id} className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-purple-600 bg-purple-100 px-2 py-0.5 rounded">{cc.codigo}</span>
                <p className="text-sm font-bold text-slate-700 mt-1">{cc.nome}</p>
              </div>
              <button onClick={() => deleteCentro(cc.id)}
                className="text-red-300 hover:text-red-500 p-1 cursor-pointer"><Trash2 className="w-3.5 h-3.5" /></button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── CONCILIAÇÃO ───
function ConciliacaoView() {
  const transacoes = useState<ExtratoTransacao[]>(() => loadLocal('bancario_transacoes', []))[0];
  const [filtroStatus, setFiltroStatus] = useState<string>('TODOS');

  const filtered = filtroStatus === 'TODOS' ? transacoes : transacoes.filter(t => t.status === filtroStatus);

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-slate-700">Conciliação Bancária</h3>
          <select value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)}
            className="text-xs border border-slate-200 rounded-lg px-3 py-1.5 bg-white text-slate-700 cursor-pointer">
            <option value="TODOS">Todas</option>
            <option value="PENDENTE">Pendentes</option>
            <option value="CATEGORIZADO">Categorizadas</option>
            <option value="CONCILIADO">Conciliadas</option>
          </select>
        </div>

        {filtered.length === 0 ? (
          <p className="text-sm text-slate-400 italic">Nenhuma transação encontrada.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b">
                  <th className="px-4 py-3">Data</th>
                  <th className="px-4 py-3">Descrição</th>
                  <th className="px-4 py-3 text-right">Valor</th>
                  <th className="px-4 py-3">Categoria</th>
                  <th className="px-4 py-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered.map(t => (
                  <tr key={t.id} className="text-xs hover:bg-slate-50">
                    <td className="px-4 py-3 text-slate-500 font-mono">{t.data}</td>
                    <td className="px-4 py-3 text-slate-700 max-w-[200px] truncate">{t.descricao}</td>
                    <td className={`px-4 py-3 font-mono font-bold text-right ${t.tipo === 'CREDITO' ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {t.tipo === 'CREDITO' ? '+' : '-'}R$ {t.valor.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-slate-500">{t.categoria || '—'}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                        t.status === 'CONCILIADO' ? 'bg-emerald-50 text-emerald-700' :
                        t.status === 'CATEGORIZADO' ? 'bg-blue-50 text-blue-700' :
                        'bg-amber-50 text-amber-700'
                      }`}>{t.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
