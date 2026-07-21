import React, { useState, useEffect, useCallback } from "react";
import {
  Clock,
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertTriangle,
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
  novo_ctr_numero: string;
  status: string;
  mensagem: string;
  placa: string;
  tentativas: number;
  criado_em: string;
  atualizado_em: string;
}

const STATUS_MAP: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  buscando: { label: "Buscando...", color: "text-blue-600 bg-blue-50 border-blue-200", icon: <Loader2 className="w-4 h-4 animate-spin" /> },
  pronto: { label: "Pronto pra processar", color: "text-slate-600 bg-slate-50 border-slate-200", icon: <Search className="w-4 h-4" /> },
  processando: { label: "Processando...", color: "text-blue-600 bg-blue-50 border-blue-200", icon: <Loader2 className="w-4 h-4 animate-spin" /> },
  concluida: { label: "Concluído", color: "text-green-600 bg-green-50 border-green-200", icon: <CheckCircle2 className="w-4 h-4" /> },
  pendente: { label: "Caçamba não liberada", color: "text-orange-600 bg-orange-50 border-orange-200", icon: <Clock className="w-4 h-4" /> },
  erro: { label: "Erro", color: "text-red-600 bg-red-50 border-red-200", icon: <XCircle className="w-4 h-4" /> },
};

function getToken() {
  return localStorage.getItem("relampago_token") || "";
}

export default function CtrVencidosView() {
  const [ctrInput, setCtrInput] = useState("");
  const [placa, setPlaca] = useState(PLACAS[0]);
  const [buscando, setBuscando] = useState(false);
  const [dadosEncontrados, setDadosEncontrados] = useState<CtrDados | null>(null);
  const [ctrAtiva, setCtrAtiva] = useState<string | null>(null);
  const [registros, setRegistros] = useState<Registro[]>([]);
  const [mensagem, setMensagem] = useState("");

  const carregarHistorico = useCallback(async () => {
    try {
      const res = await fetch("/api/ctr/historico", {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await res.json();
      if (data.sucesso && data.registros) {
        setRegistros(data.registros);
      }
    } catch {}
  }, []);

  useEffect(() => {
    carregarHistorico();
  }, [carregarHistorico]);

  const handleBuscar = useCallback(async () => {
    const numero = ctrInput.replace(/\D/g, "").replace(/^0+/, "");
    if (!numero) {
      setMensagem("Digite o número da CTR");
      return;
    }

    setBuscando(true);
    setMensagem("");
    setDadosEncontrados(null);
    setCtrAtiva(null);

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

      setDadosEncontrados(data.dados);
      setCtrAtiva(numero);
    } catch (err: any) {
      setMensagem(`Erro: ${err.message}`);
    } finally {
      setBuscando(false);
    }
  }, [ctrInput]);

  const handleProcessar = useCallback(async () => {
    if (!ctrAtiva || !dadosEncontrados) return;

    setMensagem("");
    try {
      const res = await fetch("/api/ctr/processar", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({
          ctrNumero: ctrAtiva,
          placa,
          dados: dadosEncontrados,
        }),
      });
      const data = await res.json();

      if (data.sucesso) {
        setMensagem(`✅ CTR processada! Nova CTR: GG-${data.novoCtr}`);
        setDadosEncontrados(null);
        setCtrAtiva(null);
        setCtrInput("");
      } else if (data.status === "pendente") {
        setMensagem(`⚠️ Caçamba ainda não liberada pelo destino final. Nova CTR: GG-${data.novoCtr}. Clique "Refazer" quando liberar.`);
        await carregarHistorico();
      } else {
        setMensagem(`❌ ${data.mensagem || data.error || "Erro ao processar"}`);
        await carregarHistorico();
      }
      await carregarHistorico();
    } catch (err: any) {
      setMensagem(`Erro: ${err.message}`);
    }
  }, [ctrAtiva, dadosEncontrados, placa, carregarHistorico]);

  const handleRefazer = useCallback(async (id: string) => {
    setMensagem("");
    try {
      const res = await fetch("/api/ctr/refazer", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();

      if (data.sucesso) {
        setMensagem("✅ Reenvio concluído!");
      } else if (data.status === "pendente") {
        setMensagem("⚠️ Caçamba ainda não liberada. Tente novamente depois.");
      } else {
        setMensagem(`❌ ${data.mensagem || data.error || "Erro ao reenviar"}`);
      }
      await carregarHistorico();
    } catch (err: any) {
      setMensagem(`Erro: ${err.message}`);
    }
  }, [carregarHistorico]);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 rounded-lg bg-indigo-100 text-indigo-600">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-black text-slate-900">
              CTRs Vencidas — Renovação
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Informe o número da CTR vencida. O sistema busca os dados, dá retirada, cria nova CTR e envia pra obra.
            </p>
          </div>
        </div>

        {/* Input */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
          <div className="sm:col-span-1">
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Número da CTR
            </label>
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
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Placa do Caminhão
            </label>
            <select
              value={placa}
              onChange={(e) => setPlaca(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm font-medium bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
            >
              {PLACAS.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
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

        {/* Dados encontrados */}
        {dadosEncontrados && (
          <div className="mt-4 bg-indigo-50 border border-indigo-200 rounded-xl p-4">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="font-black text-indigo-900 text-base">
                  GG-{ctrAtiva}
                </h3>
                <p className="text-xs text-indigo-600">
                  Caçamba: {dadosEncontrados.cacamba} — {dadosEncontrados.volumesCacamba}
                </p>
              </div>
              <span className="text-xs text-indigo-500 bg-indigo-100 px-2 py-1 rounded-full">
                Dados carregados via SOAP
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-2 text-xs">
              <div>
                <span className="text-indigo-400">Cliente:</span>
                <span className="ml-1 font-bold text-indigo-900">{dadosEncontrados.geradorNome}</span>
              </div>
              <div>
                <span className="text-indigo-400">CPF/CNPJ:</span>
                <span className="ml-1 text-indigo-800">{dadosEncontrados.cpfCnpj}</span>
              </div>
              <div>
                <span className="text-indigo-400">Endereço:</span>
                <span className="ml-1 text-indigo-800">
                  {dadosEncontrados.geradorEndereco}, {dadosEncontrados.geradorBairro} — {dadosEncontrados.geradorCidade}
                </span>
              </div>
              <div>
                <span className="text-indigo-400">Envio Obra:</span>
                <span className="ml-1 text-indigo-800">{dadosEncontrados.dataEnvio}</span>
              </div>
            </div>
            <button
              onClick={handleProcessar}
              className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-green-600 text-white font-bold text-sm hover:bg-green-700 active:scale-[0.98] transition-all shadow-lg shadow-green-500/30 cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              Processar — Retirar + Criar Nova + Enviar
            </button>
          </div>
        )}

        {/* Mensagem */}
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

      {/* Lista de processadas */}
      {registros.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
          <h3 className="text-sm font-bold text-slate-700 mb-4">Histórico</h3>
          <div className="space-y-3">
            {registros.map((r) => {
              const st = STATUS_MAP[r.status] || STATUS_MAP.erro;
              return (
                <div
                  key={r.id}
                  className={`rounded-xl border p-4 ${
                    r.status === "concluida"
                      ? "bg-green-50 border-green-200"
                      : r.status === "pendente"
                      ? "bg-orange-50 border-orange-200"
                      : r.status === "erro"
                      ? "bg-red-50 border-red-200"
                      : "bg-white border-slate-200"
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Truck className="w-4 h-4 text-slate-600" />
                      <span className="font-black text-slate-900">
                        GG-{r.ctr_numero}
                      </span>
                      {r.cacamba && (
                        <span className="text-xs text-slate-500">Caçamba {r.cacamba}</span>
                      )}
                    </div>
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border ${st.color}`}>
                      {st.icon}
                      {st.label}
                    </span>
                  </div>

                  {r.cliente_nome && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-1 text-xs mb-2">
                      <div>
                        <span className="text-slate-400">Cliente:</span>
                        <span className="ml-1 text-slate-700">{r.cliente_nome}</span>
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
                    </div>
                  )}

                  {r.mensagem && (
                    <p className="text-xs text-slate-500 mb-2">{r.mensagem}</p>
                  )}

                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400">
                      {r.criado_em ? new Date(r.criado_em).toLocaleString("pt-BR") : ""}
                      {r.tentativas > 0 && ` — ${r.tentativas} tentativa(s)`}
                    </span>
                    {(r.status === "pendente" || r.status === "erro") && r.novo_ctr_numero && (
                      <button
                        onClick={() => handleRefazer(r.id)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-orange-500 text-white text-xs font-bold hover:bg-orange-600 active:scale-[0.98] transition-all cursor-pointer"
                      >
                        <RefreshCw className="w-3 h-3" />
                        Refazer
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
