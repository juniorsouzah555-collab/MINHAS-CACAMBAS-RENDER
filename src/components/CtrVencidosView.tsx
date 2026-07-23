import React, { useState, useEffect, useCallback } from "react";
import {
  Clock,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Loader2,
  Truck,
  Search,
  Trash2,
} from "lucide-react";

const PLACAS = ["BTR-7G55", "BTT-1H69", "CVP-5184", "DHP-2C75"];

interface CtrDados {
  numeroGuia: string;
  cacamba: string;
  cpfCnpj: string;
  geradorNome: string;
  geradorEndereco: string;
  geradorBairro: string;
  geradorCidade: string;
  volumesCacamba: string;
  dataEnvio: string;
}

interface Registro {
  id: string;
  ctr_numero: string;
  cacamba: string;
  cliente_nome: string;
  cliente_cpf_cnpj: string;
  endereco: string;
  bairro: string;
  cidade: string;
  gerador_rua: string;
  gerador_num: string;
  gerador_cep: string;
  obra_endereco: string;
  obra_rua: string;
  obra_num: string;
  obra_bairro: string;
  obra_cidade: string;
  obra_cep: string;
  novo_ctr_numero: string;
  status: string;
  mensagem: string;
  placa: string;
  tentativas: number;
  data_envio: string;
  data_retirada: string;
  data_destino_final: string;
  criado_em: string;
  atualizado_em: string;
}

const STATUS_MAP: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  buscando: { label: "Buscando...", color: "text-blue-600 bg-blue-50 border-blue-200", icon: <Loader2 className="w-4 h-4 animate-spin" /> },
  pronto: { label: "Pronto pra processar", color: "text-slate-600 bg-slate-50 border-slate-200", icon: <Search className="w-4 h-4" /> },
  processando: { label: "Processando...", color: "text-blue-600 bg-blue-50 border-blue-200", icon: <Loader2 className="w-4 h-4 animate-spin" /> },
  concluida: { label: "Concluído", color: "text-green-600 bg-green-50 border-green-200", icon: <CheckCircle2 className="w-4 h-4" /> },
  pendente: { label: "Caçamba não liberada", color: "text-orange-600 bg-orange-50 border-orange-200", icon: <Clock className="w-4 h-4" /> },
  entregue: { label: "Já entregue no destino", color: "text-purple-600 bg-purple-50 border-purple-200", icon: <CheckCircle2 className="w-4 h-4" /> },
  erro: { label: "Erro", color: "text-red-600 bg-red-50 border-red-200", icon: <XCircle className="w-4 h-4" /> },
};

function getToken() {
  return localStorage.getItem("relampago_token") || "";
}

export default function CtrVencidosView() {
  const [ctrInput, setCtrInput] = useState("");
  const [placa, setPlaca] = useState(PLACAS[0]);
  const [buscando, setBuscando] = useState(false);
  const [mensagem, setMensagem] = useState("");
  const [ativos, setAtivos] = useState<Registro[]>([]);
  const [concluidas, setConcluidas] = useState<Registro[]>([]);
  const [cepEdits, setCepEdits] = useState<Record<string, string>>({});

  const carregarDados = useCallback(async () => {
    try {
      await fetch("/api/ctr/limpar-stuck", {
        method: "POST",
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const res = await fetch("/api/ctr/historico", {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await res.json();
      if (data.sucesso && data.registros) {
        setAtivos(data.registros.filter((r: Registro) => r.status !== "concluida"));
        setConcluidas(data.registros.filter((r: Registro) => r.status === "concluida"));
      }
    } catch {}
  }, []);

  useEffect(() => {
    carregarDados();
  }, [carregarDados]);

  const handleBuscar = useCallback(async () => {
    const numero = ctrInput.replace(/\D/g, "").replace(/^0+/, "");
    if (!numero) {
      setMensagem("Digite o número da CTR");
      return;
    }
    setBuscando(true);
    setMensagem("");
    try {
      const res = await fetch("/api/ctr/buscar", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ ctrNumero: numero }),
      });
      const data = await res.json();
      if (!data.sucesso) {
        setMensagem(data.error || "CTR não encontrada");
        return;
      }
      setCtrInput("");
      const r = data.registro;
      const novoCard: Registro = {
        id: r.id,
        ctr_numero: r.ctr_numero || numero,
        cacamba: data.dados?.cacamba || "",
        cliente_nome: data.dados?.geradorNome || "",
        cliente_cpf_cnpj: data.dados?.cpfCnpj || "",
        endereco: data.dados?.geradorEndereco || "",
        bairro: data.dados?.geradorBairro || "",
        cidade: data.dados?.geradorCidade || "",
        gerador_rua: data.dados?.geradorRua || r.gerador_rua || "",
        gerador_num: data.dados?.geradorNum || r.gerador_num || "",
        gerador_cep: data.dados?.geradorCep || r.gerador_cep || "",
        obra_endereco: data.dados?.obraEndereco || r.obra_endereco || "",
        obra_rua: data.dados?.obraRua || r.obra_rua || "",
        obra_num: data.dados?.obraNum || r.obra_num || "",
        obra_bairro: data.dados?.obraBairro || r.obra_bairro || "",
        obra_cidade: data.dados?.obraCidade || r.obra_cidade || "",
        obra_cep: data.dados?.obraCep || r.obra_cep || "",
        novo_ctr_numero: r.novo_ctr_numero || "",
        status: r.status,
        mensagem: data.dados?.dataDestinoFinal ? `Entregue em ${data.dados.dataDestinoFinal}` : "",
        placa: r.placa || "",
        tentativas: r.tentativas || 0,
        data_envio: data.dados?.dataEnvio || "",
        data_retirada: data.dados?.dataRetirada || "",
        data_destino_final: data.dados?.dataDestinoFinal || "",
        criado_em: r.criado_em || new Date().toISOString(),
        atualizado_em: r.atualizado_em || new Date().toISOString(),
      };
      setAtivos(prev => {
        const exists = prev.find(p => p.id === novoCard.id);
        if (exists) return prev.map(p => p.id === novoCard.id ? novoCard : p);
        return [novoCard, ...prev];
      });
    } catch (err: any) {
      setMensagem(`Erro: ${err.message}`);
    } finally {
      setBuscando(false);
    }
  }, [ctrInput, carregarDados]);

  const handleProcessar = useCallback(async (registro: Registro) => {
    setMensagem("");
    setAtivos(prev => prev.map(r => r.id === registro.id ? { ...r, status: "processando" } : r));
    try {
      const res = await fetch("/api/ctr/processar", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({
          ctrNumero: registro.ctr_numero,
          placa,
          dados: {
            cacamba: registro.cacamba,
            cpfCnpj: registro.cliente_cpf_cnpj,
            geradorNome: registro.cliente_nome,
            geradorEndereco: registro.endereco,
            geradorBairro: registro.bairro,
            geradorCidade: registro.cidade,
          },
        }),
      });
      const data = await res.json();
      if (data.sucesso) {
        setMensagem(`✅ GG-${registro.ctr_numero} processada! Nova CTR: GG-${data.novoCtr}`);
      } else if (data.status === "pendente") {
        setMensagem(`⚠️ GG-${registro.ctr_numero}: Caçamba não liberada. Nova CTR: GG-${data.novoCtr}`);
      } else {
        setMensagem(`❌ GG-${registro.ctr_numero}: ${data.mensagem || data.error || "Erro"}`);
      }
      await carregarDados();
    } catch (err: any) {
      setMensagem(`Erro: ${err.message}`);
      await carregarDados();
    }
  }, [placa, carregarDados]);

  const handleRefazer = useCallback(async (id: string) => {
    setMensagem("");
    try {
      const res = await fetch("/api/ctr/refazer", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ id, placa }),
      });
      const data = await res.json();
      if (data.sucesso) {
        setMensagem("✅ Reenvio concluído!");
      } else if (data.status === "pendente") {
        setMensagem("⚠️ Caçamba ainda não liberada. Tente novamente depois.");
      } else {
        setMensagem(`❌ ${data.mensagem || data.error || "Erro ao reenviar"}`);
      }
      await carregarDados();
    } catch (err: any) {
      setMensagem(`Erro: ${err.message}`);
    }
  }, [carregarDados]);

  const handleApagar = useCallback(async (id: string) => {
    setAtivos(prev => prev.filter(r => r.id !== id));
    try {
      await fetch(`/api/ctr/registro/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${getToken()}` },
      });
    } catch {}
  }, []);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header + Busca */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 rounded-lg bg-indigo-100 text-indigo-600">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-black text-slate-900">CTRs Vencidas — Renovação</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Informe o número da CTR vencida. O sistema busca os dados, dá retirada, cria nova CTR e envia pra obra.
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="sm:col-span-1">
            <label className="block text-xs font-bold text-slate-700 mb-1">Número da CTR</label>
            <input
              type="text"
              value={ctrInput}
              onChange={(e) => setCtrInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleBuscar()}
              placeholder="Ex: 32187918"
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Placa do Caminhão</label>
            <select
              value={placa}
              onChange={(e) => setPlaca(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm font-medium bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
            >
              {PLACAS.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={handleBuscar}
              disabled={buscando || !ctrInput.trim()}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700 active:scale-[0.98] transition-all disabled:opacity-50 cursor-pointer"
            >
              {buscando ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Buscando...</>
              ) : (
                <><Search className="w-4 h-4" /> Buscar CTR</>
              )}
            </button>
          </div>
        </div>
        {mensagem && (
          <div className={`mt-4 p-3 rounded-lg text-sm ${
            mensagem.startsWith("✅") ? "bg-green-50 border border-green-200 text-green-700" :
            mensagem.startsWith("⚠️") ? "bg-orange-50 border border-orange-200 text-orange-700" :
            mensagem.startsWith("❌") ? "bg-red-50 border border-red-200 text-red-700" :
            "bg-slate-50 border border-slate-200 text-slate-600"
          }`}>
            {mensagem}
          </div>
        )}
      </div>

      {/* CTRs Ativas — não concluídas */}
      {ativos.length > 0 && (
        <div className="space-y-3">
          {ativos.map((r) => {
            const st = STATUS_MAP[r.status] || STATUS_MAP.erro;
            const processando = r.status === "processando";
            return (
              <div
                key={r.id}
                className={`rounded-xl border p-5 ${
                  r.status === "pendente" ? "bg-orange-50 border-orange-200" :
                  r.status === "erro" ? "bg-red-50 border-red-200" :
                  r.status === "entregue" ? "bg-purple-50 border-purple-200" :
                  "bg-white border-slate-200"
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Truck className="w-5 h-5 text-slate-600" />
                    <span className="font-black text-lg text-slate-900">GG-{r.ctr_numero}</span>
                    {r.cacamba && <span className="text-xs text-slate-500">Caçamba {r.cacamba}</span>}
                  </div>
                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border ${st.color}`}>
                    {st.icon}
                    {st.label}
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-1 text-xs mb-3">
                  <div>
                    <span className="text-slate-400">Cliente:</span>
                    <span className="ml-1 font-bold text-slate-800">{r.cliente_nome}</span>
                  </div>
                  <div>
                    <span className="text-slate-400">Endereço:</span>
                    <span className="ml-1 text-slate-700">{r.endereco}</span>
                  </div>
                  {r.novo_ctr_numero && (
                    <div>
                      <span className="text-slate-400">Nova CTR:</span>
                      <span className="ml-1 font-bold text-green-700">{r.novo_ctr_numero}</span>
                    </div>
                  )}
                  {r.status === "entregue" && r.data_envio && (
                    <div>
                      <span className="text-slate-400">Enviada:</span>
                      <span className="ml-1 text-purple-700 font-bold">{r.data_envio}</span>
                    </div>
                  )}
                  {r.status === "entregue" && r.data_destino_final && (
                    <div>
                      <span className="text-slate-400">Entregue:</span>
                      <span className="ml-1 text-purple-700 font-bold">{r.data_destino_final}</span>
                    </div>
                  )}
                </div>
                {r.mensagem && <p className="text-xs text-slate-500 mb-3">{r.mensagem}</p>}
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400">
                    {r.criado_em ? new Date(r.criado_em).toLocaleString("pt-BR") : ""}
                    {r.tentativas > 0 && ` — ${r.tentativas} tentativa(s)`}
                  </span>
                  <div className="flex gap-2">
                    {r.status === "pronto" && (
                      <button
                        onClick={() => handleProcessar(r)}
                        disabled={processando}
                        className="flex items-center gap-1 px-4 py-2 rounded-lg bg-green-600 text-white text-xs font-bold hover:bg-green-700 active:scale-[0.98] transition-all disabled:opacity-50 cursor-pointer"
                      >
                        <RefreshCw className={`w-3 h-3 ${processando ? "animate-spin" : ""}`} />
                        Processar — Retirar + Criar + Enviar
                      </button>
                    )}
                    {r.status === "entregue" && (
                      <button
                        onClick={() => handleRefazer(r.id)}
                        className="flex items-center gap-1 px-4 py-2 rounded-lg bg-purple-600 text-white text-xs font-bold hover:bg-purple-700 active:scale-[0.98] transition-all cursor-pointer"
                      >
                        <RefreshCw className="w-3 h-3" />
                        Refazer — Criar nova CTR + Enviar
                      </button>
                    )}
                    {(r.status === "pendente" || r.status === "erro") && r.novo_ctr_numero && (
                      <button
                        onClick={() => handleRefazer(r.id)}
                        className="flex items-center gap-1 px-4 py-2 rounded-lg bg-orange-500 text-white text-xs font-bold hover:bg-orange-600 active:scale-[0.98] transition-all cursor-pointer"
                      >
                        <RefreshCw className="w-3 h-3" />
                        Refazer
                      </button>
                    )}
                    {r.status === "erro" && (
                      <button
                        onClick={() => handleApagar(r.id)}
                        className="flex items-center gap-1 px-3 py-2 rounded-lg bg-red-100 text-red-600 text-xs font-bold hover:bg-red-200 active:scale-[0.98] transition-all cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" />
                        Apagar
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Histórico — concluídas */}
      {concluidas.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
          <h3 className="text-sm font-bold text-slate-700 mb-4">Histórico — Concluídas</h3>
          <div className="space-y-2">
            {concluidas.map((r) => (
              <div key={r.id} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  <span className="text-sm font-bold text-slate-800">GG-{r.ctr_numero}</span>
                  {r.cacamba && <span className="text-xs text-slate-500">Caçamba {r.cacamba}</span>}
                  {r.gerador_rua && (
                    <span className="text-xs text-slate-500">
                      {r.gerador_rua}{r.gerador_num ? `, ${r.gerador_num}` : ""}
                    </span>
                  )}
                  {r.novo_ctr_numero && (
                    <span className="text-xs text-green-600 font-bold">→ {r.novo_ctr_numero}</span>
                  )}
                </div>
                <span className="text-xs text-slate-400">
                  {r.criado_em ? new Date(r.criado_em).toLocaleString("pt-BR") : ""}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Vazio */}
      {ativos.length === 0 && concluidas.length === 0 && !mensagem && (
        <div className="text-center py-12 text-slate-400">
          <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Nenhuma CTR vencida registrada. Digite o número de uma CTR acima para começar.</p>
        </div>
      )}
    </div>
  );
}
