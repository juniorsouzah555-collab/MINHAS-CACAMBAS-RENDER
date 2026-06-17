/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Trash2, 
  Plus, 
  MapPin, 
  Phone, 
  FileText, 
  Building, 
  Sparkles,
  Search,
  CheckCircle2,
  AlertCircle,
  Pencil,
  RotateCcw,
  Coins,
  User
} from 'lucide-react';
import { BotaFora } from '../types';

interface DisposalViewProps {
  botaForas: BotaFora[];
  onAddBotaFora: (botaFora: Omit<BotaFora, 'id' | 'createdAt'>) => void;
  onUpdateBotaFora: (botaFora: BotaFora) => void;
  onDeleteBotaFora: (id: string) => void;
  motoristas: string[];
  onAddMotorista: (nome: string) => void;
  onUpdateMotorista: (oldNome: string, newNome: string) => void;
  onDeleteMotorista: (nome: string) => void;
}

export default function DisposalView({
  botaForas,
  onAddBotaFora,
  onUpdateBotaFora,
  onDeleteBotaFora,
  motoristas,
  onAddMotorista,
  onUpdateMotorista,
  onDeleteMotorista
}: DisposalViewProps) {
  // Local state for edit/add mode
  const [editId, setEditId] = useState<string | null>(null);
  
  // Form fields
  const [nome, setNome] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [telefone, setTelefone] = useState('');
  const [endereco, setEndereco] = useState('');
  const [valorPadraoDescarte, setValorPadraoDescarte] = useState<number | ''>('');
  
  const [searchTerm, setSearchTerm] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Drivers local form state
  const [newDriverName, setNewDriverName] = useState('');
  const [editingDriver, setEditingDriver] = useState<string | null>(null);
  const [editingDriverValue, setEditingDriverValue] = useState('');

  // Submit Handler handles both Add and Edit
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim()) {
      setErrorMsg('Por favor, digite o nome do Bota Fora / Aterro.');
      return;
    }
    if (!cnpj.trim()) {
      setErrorMsg('Por favor, especifique o CNPJ.');
      return;
    }
    if (!endereco.trim()) {
      setErrorMsg('O endereço do Bota Fora é obrigatório.');
      return;
    }

    const valParsed = valorPadraoDescarte === '' ? undefined : Number(valorPadraoDescarte);

    if (editId) {
      // Edit Mode
      onUpdateBotaFora({
        id: editId,
        nome: nome.trim(),
        cnpj: cnpj.trim(),
        telefone: telefone.trim(),
        endereco: endereco.trim(),
        createdAt: botaForas.find(b => b.id === editId)?.createdAt || new Date().toISOString(),
        valorPadraoDescarte: valParsed
      });
      setEditId(null);
    } else {
      // Add Mode
      onAddBotaFora({
        nome: nome.trim(),
        cnpj: cnpj.trim(),
        telefone: telefone.trim(),
        endereco: endereco.trim(),
        valorPadraoDescarte: valParsed
      });
    }

    // Reset Form fields
    setNome('');
    setCnpj('');
    setTelefone('');
    setEndereco('');
    setValorPadraoDescarte('');
    setErrorMsg('');
  };

  // Turn on Edit Mode
  const handleStartEdit = (b: BotaFora) => {
    setEditId(b.id);
    setNome(b.nome);
    setCnpj(b.cnpj);
    setTelefone(b.telefone || '');
    setEndereco(b.endereco);
    setValorPadraoDescarte(b.valorPadraoDescarte !== undefined ? b.valorPadraoDescarte : '');
    setErrorMsg('');
  };

  // Cancel Edit mode
  const handleCancelEdit = () => {
    setEditId(null);
    setNome('');
    setCnpj('');
    setTelefone('');
    setEndereco('');
    setValorPadraoDescarte('');
    setErrorMsg('');
  };

  // Filter Bota foras list dynamically
  const filteredBotaForas = botaForas.filter(b => {
    const query = searchTerm.toLowerCase();
    return b.nome.toLowerCase().includes(query) || 
           b.cnpj.includes(query) || 
           (b.telefone && b.telefone.includes(query)) ||
           b.endereco.toLowerCase().includes(query);
  });

  return (
    <div className="space-y-6">
      
      {/* Intro Banner */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 rounded-full blur-2xl pointer-events-none group-hover:bg-purple-500/10 transition-colors"></div>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center text-purple-600 shadow-sm shadow-purple-500/10">
            <Trash2 className="w-5 h-5 text-purple-650" />
          </div>
          <div>
            <h2 className="font-sans font-bold text-lg text-slate-900">Cadastro de Bota Foras</h2>
            <p className="text-slate-400 text-xs mt-0.5">Gerenciamento simplificado de áreas de destinação e reciclagem, com controle de valores padrão de descarte.</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Registration/Edit Form (Left Column) */}
        <div className="lg:col-span-5 bg-white border border-slate-200 p-5 rounded-xl shadow-sm h-fit relative">
          {editId && (
            <div className="absolute top-3 right-3 text-[10px] font-black uppercase bg-fuchsia-100 text-fuchsia-700 px-2 py-0.5 rounded tracking-wide font-sans animate-pulse">
              Modo Edição
            </div>
          )}
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100 mb-4">
            {editId ? (
              <Pencil className="w-5 h-5 text-purple-600" />
            ) : (
              <Plus className="w-5 h-5 text-purple-650" />
            )}
            <h4 className="font-sans font-bold text-sm text-slate-900 leading-none">
              {editId ? 'Editar Bota Fora' : 'Cadastrar Bota Fora'}
            </h4>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {errorMsg && (
              <div className="p-3 bg-rose-50 border border-rose-100 rounded-lg text-xs font-semibold text-rose-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Nome Field */}
            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">RAZÃO SOCIAL / NOME DO BOTA FORA *</label>
              <div className="relative">
                <Building className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Ex: Aterro de Resíduos Sólidos ABC"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 pl-9 pr-3 py-2 rounded-lg text-xs font-sans focus:outline-none focus:ring-1 focus:ring-purple-500 text-slate-800 font-semibold"
                  required
                />
              </div>
            </div>

            {/* CNPJ Field */}
            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">CNPJ *</label>
              <div className="relative">
                <FileText className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Ex: 00.000.000/0001-00"
                  value={cnpj}
                  onChange={(e) => setCnpj(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 pl-9 pr-3 py-2 rounded-lg text-xs font-sans focus:outline-none focus:ring-1 focus:ring-purple-500 text-slate-800 font-semibold"
                  required
                />
              </div>
            </div>

            {/* Telefone Field */}
            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">TELEFONE DE CONTATO</label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Ex: (11) 99999-9999"
                  value={telefone}
                  onChange={(e) => setTelefone(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 pl-9 pr-3 py-2 rounded-lg text-xs font-sans focus:outline-none focus:ring-1 focus:ring-purple-500 text-slate-800 font-semibold"
                />
              </div>
            </div>

            {/* Valor Padrão Descarte Field */}
            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">VALOR PADRÃO DESCARTE AUTOMÁTICO (R$ POR CAÇAMBA)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold text-purple-600 font-mono">R$</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="Ex: 200.00 (Valor para novos lançamentos automáticos)"
                  value={valorPadraoDescarte}
                  onChange={(e) => setValorPadraoDescarte(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 pl-10 pr-3 py-2 rounded-lg text-xs font-sans focus:outline-none focus:ring-1 focus:ring-purple-500 text-slate-850 font-bold font-mono"
                />
              </div>
              <p className="text-[9px] text-purple-400/80 leading-none mt-1">Ao selecionar este Bota Fora no novo lançamento, o preço total será pré-preenchido de acordo.</p>
            </div>

            {/* Endereço Field */}
            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">ENDEREÇO COMPLETO *</label>
              <div className="relative">
                <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-[15px]" />
                <textarea
                  placeholder="Rua, Número, Bairro, Cidade - Estado"
                  value={endereco}
                  onChange={(e) => setEndereco(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 pl-9 pr-3 py-2 rounded-lg text-xs font-sans focus:outline-none focus:ring-1 focus:ring-purple-500 text-slate-800 font-semibold min-h-[70px] resize-none"
                  required
                />
              </div>
            </div>

            <div className="flex gap-2">
              {editId && (
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="flex items-center justify-center gap-1.5 px-4 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 font-bold text-xs py-2.5 rounded-lg border border-slate-200 cursor-pointer transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Cancelar</span>
                </button>
              )}
              <button
                type="submit"
                className="flex-1 bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-500 hover:to-fuchsia-500 active:from-purple-700 active:to-fuchsia-700 text-white font-bold text-xs py-2.5 rounded-lg shadow-md shadow-purple-600/10 cursor-pointer transition-colors"
              >
                {editId ? 'Salvar Alterações do Bota Fora' : 'Confirmar e Cadastrar Bota Fora'}
              </button>
            </div>
          </form>

          <div className="bg-slate-50 border border-slate-150 p-4 rounded-lg text-xs text-slate-500 mt-5 leading-relaxed flex items-start gap-2">
            <Sparkles className="w-4 h-4 text-purple-500 shrink-0 mt-0.5" />
            <div>
              Ao cadastrar um <strong>Bota Fora</strong>, a área fica imediatamente disponível para seleção e lançamento de caçambas descarregadas nos relatórios analíticos da plataforma.
            </div>
          </div>
        </div>

        {/* Registered list display (Right Column) */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col justify-between">
          <div className="space-y-4">
            
            {/* Search filter drawer */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-100">
              <div>
                <h4 className="font-sans font-bold text-sm text-slate-900 leading-none">Áreas Ativas e Autorizadas</h4>
                <p className="text-slate-400 text-[10px] mt-0.5">Consulta de bota-foras parceiros cadastrados</p>
              </div>

              <div className="relative self-start sm:self-center">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Pesquisar área..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="bg-slate-50 border border-slate-200 pl-8 pr-3 py-1 rounded text-xs focus:outline-none focus:ring-1 focus:ring-purple-500 text-slate-800 font-medium w-40 sm:w-56"
                />
              </div>
            </div>

            {/* Bota-Foras Grid */}
            <div className="space-y-3.5 max-h-[460px] overflow-y-auto pr-1">
              {filteredBotaForas.map((rec) => (
                <div key={rec.id} className="p-4 bg-slate-50 border border-slate-200/60 rounded-xl flex justify-between items-start gap-3 hover:border-slate-350 transition-all hover:shadow-sm group">
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-slate-900 font-sans">{rec.nome}</span>
                      <span className="font-mono text-[9px] text-purple-600 bg-purple-50 border border-purple-100 px-1.5 py-0.2 rounded font-bold">{rec.id}</span>
                      {rec.valorPadraoDescarte !== undefined && rec.valorPadraoDescarte > 0 && (
                        <span className="font-sans text-[10px] text-fuchsia-700 bg-fuchsia-50 border border-fuchsia-100 px-1.5 py-0.2 rounded font-black flex items-center gap-0.5">
                          <Coins className="w-2.5 h-2.5" />
                          Tarifa: R$ {rec.valorPadraoDescarte.toFixed(2)}/caçamba
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-slate-650 text-xs">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-slate-400 text-[10px] uppercase">CNPJ:</span>
                        <span className="font-mono text-slate-800">{rec.cnpj}</span>
                      </div>
                      {rec.telefone && (
                        <div className="flex items-center gap-1.5">
                          <Phone className="w-3 h-3 text-slate-400" />
                          <span className="text-slate-800">{rec.telefone}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-start gap-1.5 text-slate-500 text-xs pt-0.5">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                      <span className="leading-relaxed">{rec.endereco}</span>
                    </div>
                  </div>

                  {/* Operational actions: Edit & Delete */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleStartEdit(rec)}
                      title="Editar Bota Fora"
                      className="p-1.5 border border-slate-200 bg-white hover:bg-purple-50 text-slate-400 hover:text-purple-600 rounded-lg cursor-pointer transition-colors"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteBotaFora(rec.id)}
                      title="Remover Bota Fora"
                      className="p-1.5 border border-slate-200 bg-white hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg cursor-pointer transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}

              {filteredBotaForas.length === 0 && (
                <div className="text-center py-16 text-slate-400 flex flex-col items-center gap-2 justify-center border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                  <AlertCircle className="w-8 h-8 text-slate-300" />
                  <span className="font-sans font-bold text-xs text-slate-500">Nenhum Bota Fora Localizado</span>
                  <p className="text-[10px] text-slate-400 max-w-xs mt-0.5">Ajuste os filtros de pesquisa ou utilize o formulário ao lado de cadastro para registrar nova área.</p>
                </div>
              )}
            </div>

          </div>

          <div className="text-[10px] text-slate-400 border-t border-slate-100 pt-3.5 mt-5 flex items-center gap-1 justify-between select-none font-medium">
            <span>Total de bota foras cadastrados: <strong>{botaForas.length}</strong></span>
            <CheckCircle2 className="w-4 h-4 text-purple-500" />
          </div>
        </div>

      </div>

      {/* Dynamic Motoristas Registration Area */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
          <div className="w-8 h-8 bg-purple-50 rounded-lg flex items-center justify-center text-purple-650">
            <User className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-sans font-bold text-sm text-slate-900">Cadastro de Motoristas Cooperados</h3>
            <p className="text-slate-400 text-[10px]">Cadastre condutores para que fiquem disponíveis nas abas de Comissões, Frota e no Lançamento de Descartes.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              if (editingDriver) {
                const updatedVal = editingDriverValue.trim();
                if (!updatedVal) return;
                if (updatedVal.toLowerCase() !== editingDriver.toLowerCase() && motoristas.some(m => m.toLowerCase() === updatedVal.toLowerCase())) {
                  alert("Este motorista já está cadastrado!");
                  return;
                }
                onUpdateMotorista(editingDriver, updatedVal);
                setEditingDriver(null);
                setEditingDriverValue('');
              } else {
                const addVal = newDriverName.trim();
                if (!addVal) return;
                if (motoristas.some(m => m.toLowerCase() === addVal.toLowerCase())) {
                  alert("Este motorista já está cadastrado!");
                  return;
                }
                onAddMotorista(addVal);
                setNewDriverName('');
              }
            }} 
            className="md:col-span-4 space-y-3"
          >
            <div className="space-y-1">
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider">
                {editingDriver ? 'EDITAR MOTORISTA *' : 'NOME COMPLETO DO MOTORISTA *'}
              </label>
              <input
                type="text"
                placeholder={editingDriver ? `Renomear: ${editingDriver}` : "Ex: Alexandre de Souza"}
                value={editingDriver ? editingDriverValue : newDriverName}
                onChange={(e) => {
                  if (editingDriver) {
                    setEditingDriverValue(e.target.value);
                  } else {
                    setNewDriverName(e.target.value);
                  }
                }}
                className="w-full bg-slate-50 border border-slate-200 px-3.5 py-2 rounded-lg text-xs font-sans text-slate-800 font-bold focus:ring-1 focus:ring-purple-500 focus:outline-hidden"
                required
              />
            </div>
            <div className="flex gap-2">
              {editingDriver && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingDriver(null);
                    setEditingDriverValue('');
                  }}
                  className="px-3 bg-slate-100 hover:bg-slate-200 text-slate-705 font-extrabold text-[11px] uppercase tracking-wider py-2.5 rounded-lg border border-slate-250 cursor-pointer transition-all"
                >
                  Sair
                </button>
              )}
              <button
                type="submit"
                className="flex-1 bg-gradient-to-r from-purple-650 to-indigo-600 hover:from-purple-600 hover:to-indigo-550 text-white font-extrabold text-xs uppercase tracking-wider py-2.5 rounded-lg shadow-xs cursor-pointer transition-all hover:-translate-y-0.5 active:translate-y-0"
              >
                {editingDriver ? 'Salvar Nome' : 'Adicionar Motorista'}
              </button>
            </div>
          </form>

          <div className="md:col-span-8 space-y-2">
            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider">MOTORISTAS DISPONÍVEIS ({motoristas.length})</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 max-h-[160px] overflow-y-auto pr-1">
              {motoristas.map((drv) => (
                <div 
                  key={drv} 
                  className={`p-2.5 border rounded-lg flex items-center justify-between text-xs font-bold transition-all shadow-2xs group ${
                    editingDriver === drv 
                      ? 'bg-purple-50/70 border-purple-300 text-purple-900 ring-1 ring-purple-400/20' 
                      : 'bg-slate-50 border-slate-200/60 text-slate-800 hover:border-slate-350'
                  }`}
                >
                  <span className="truncate pr-1 flex items-center gap-1.5 flex-1">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${editingDriver === drv ? 'bg-fuchsia-500 animate-pulse' : 'bg-purple-500'}`}></span>
                    <span className="truncate">{drv}</span>
                  </span>
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingDriver(drv);
                        setEditingDriverValue(drv);
                      }}
                      className="text-slate-400 hover:text-purple-600 p-1 rounded-sm hover:bg-purple-50 transition-all cursor-pointer bg-transparent border-0"
                      title="Editar Motorista"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm(`Deseja realmente remover o motorista "${drv}"?`)) {
                          onDeleteMotorista(drv);
                          if (editingDriver === drv) {
                            setEditingDriver(null);
                            setEditingDriverValue('');
                          }
                        }
                      }}
                      className="text-slate-400 hover:text-rose-600 p-1 rounded-sm hover:bg-rose-50 transition-all cursor-pointer bg-transparent border-0"
                      title="Excluir Motorista"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
