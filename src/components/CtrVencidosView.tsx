import React, { useState, useCallback } from "react";
import {
  Clock,
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  Truck,
  ExternalLink,
} from "lucide-react";

const API_CTR = "https://ctr-automacao-relampago.onrender.com";

interface CtrData {
  numeroCtr: string;
  cacamba: string;
  endereco: string;
  bairro: string;
  cidade: string;
  clienteNome: string;
  clienteCpfCnpj: string;
  tipoMaterial: string;
  diasSemBaixa: number;
}

interface ResultadoItem {
  cacamba: string;
  data?: CtrData;
  status:
    | "retirada_feita"
    | "retirada_erro"
    | "ctr_criada"
    | "ctr_erro"
    | "pendente_recebimento"
    | "concluido";
  mensagem: string;
  numeroCtrAntigo?: string;
  numeroCtrNovo?: string;
}

const STATUS_LABEL: Record<string, string> = {
  retirada_feita: "Retirada feita",
  retirada_erro: "Erro na retirada",
  ctr_criada: "CTR criada",
  ctr_erro: "Erro ao criar CTR",
  pendente_recebimento: "Aguardando recebimento",
  concluido: "Concluído",
};

const STATUS_COLOR: Record<string, string> = {
  retirada_feita: "text-yellow-600 bg-yellow-50 border-yellow-200",
  retirada_erro: "text-red-600 bg-red-50 border-red-200",
  ctr_criada: "text-blue-600 bg-blue-50 border-blue-200",
  ctr_erro: "text-red-600 bg-red-50 border-red-200",
  pendente_recebimento: "text-orange-600 bg-orange-50 border-orange-200",
  concluido: "text-green-600 bg-green-50 border-green-200",
};

const STATUS_ICON: Record<string, React.ReactNode> = {
  retirada_feita: <AlertTriangle className="w-4 h-4" />,
  retirada_erro: <XCircle className="w-4 h-4" />,
  ctr_criada: <CheckCircle2 className="w-4 h-4" />,
  ctr_erro: <XCircle className="w-4 h-4" />,
  pendente_recebimento: <Clock className="w-4 h-4" />,
  concluido: <CheckCircle2 className="w-4 h-4" />,
};

const PLACAS = ["BTR-7G55", "BTT-1H69", "CVP-5184", "DHP-2C75"];

export default function CtrVencidosView() {
  const [loading, setLoading] = useState(false);
  const [resultados, setResultados] = useState<ResultadoItem[]>([]);
  const [mensagem, setMensagem] = useState("");
  const [placa, setPlaca] = useState(PLACAS[0]);
  const [cacambaInput, setCacambaInput] = useState("");
  const [postbackInput, setPostbackInput] = useState("");

  const handleProcessar = useCallback(async () => {
    setLoading(true);
    setMensagem("");
    setResultados([]);

    try {
      const body: any = { placa };
      if (cacambaInput.trim() && postbackInput.trim()) {
        body.cacamba = cacambaInput.trim();
        body.postbackTarget = postbackInput.trim();
      }

      const res = await fetch(`${API_CTR}/api/ctr/vencidos`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-access-token": "relampago2026",
        },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (data.sucesso === false && data.resultados?.length === 0) {
        setMensagem(data.mensagem || "Nenhuma CTR vencida encontrada");
      }

      if (data.resultados) {
        setResultados(data.resultados);
      }

      if (!data.sucesso && data.mensagem) {
        setMensagem(data.mensagem);
      }
    } catch (err: any) {
      setMensagem(`Erro de conexão: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [placa, cacambaInput, postbackInput]);

  const getNumeroSucesso = () =>
    resultados.filter((r) => r.status === "concluido").length;
  const getNumeroErro = () =>
    resultados.filter(
      (r) => r.status === "retirada_erro" || r.status === "ctr_erro"
    ).length;

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
              CTRs Vencidas — Renovação Automática
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Identifica CTRs com mais de 3 dias, dá retirada, cria nova CTR com
              os mesmos dados e reenvia para obra
            </p>
          </div>
        </div>

        {/* Config */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
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
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Caçamba (opcional)
            </label>
            <input
              type="text"
              value={cacambaInput}
              onChange={(e) => setCacambaInput(e.target.value)}
              placeholder="Ex: 36"
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Postback Target (opcional)
            </label>
            <input
              type="text"
              value={postbackInput}
              onChange={(e) => setPostbackInput(e.target.value)}
              placeholder="ctl00$cphBody$gv...$lkbtn..."
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>
        </div>

        <button
          onClick={handleProcessar}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700 active:scale-[0.98] transition-all disabled:opacity-50 shadow-lg shadow-indigo-500/30 cursor-pointer"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Processando...
            </>
          ) : (
            <>
              <RefreshCw className="w-4 h-4" />
              {cacambaInput.trim() && postbackInput.trim()
                ? "Processar Caçamba Específica"
                : "Verificar e Renovar CTRs Vencidas"}
            </>
          )}
        </button>

        {mensagem && (
          <div className="mt-4 p-3 rounded-lg bg-slate-50 border border-slate-200 text-sm text-slate-600">
            {mensagem}
          </div>
        )}

        {/* Resumo */}
        {resultados.length > 0 && (
          <div className="mt-4 flex gap-4 text-sm">
            <div className="px-3 py-2 rounded-lg bg-green-50 border border-green-200 text-green-700 font-bold">
              {getNumeroSucesso()} concluídas
            </div>
            <div className="px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-red-700 font-bold">
              {getNumeroErro()} com erro
            </div>
            <div className="px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-600">
              {resultados.length} total
            </div>
          </div>
        )}
      </div>

      {/* Resultados */}
      {resultados.length > 0 && (
        <div className="space-y-4">
          {resultados.map((r, i) => (
            <div
              key={i}
              className={`rounded-xl border p-5 ${
                r.status === "concluido"
                  ? "bg-green-50 border-green-200"
                  : r.status.includes("erro")
                  ? "bg-red-50 border-red-200"
                  : "bg-white border-slate-200"
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Truck className="w-5 h-5 text-slate-600" />
                  <span className="font-black text-lg text-slate-900">
                    Caçamba {r.cacamba}
                  </span>
                </div>
                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border ${
                    STATUS_COLOR[r.status]
                  }`}
                >
                  {STATUS_ICON[r.status]}
                  {STATUS_LABEL[r.status]}
                </span>
              </div>

              <p className="text-sm text-slate-600 mb-3">{r.mensagem}</p>

              {/* Dados da CTR */}
              {r.data && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-2 text-xs bg-white/80 rounded-lg p-3 border border-slate-100">
                  <div>
                    <span className="text-slate-400">CTR Antiga:</span>
                    <span className="ml-1 font-bold text-slate-800">
                      {r.numeroCtrAntigo || r.data.numeroCtr}
                    </span>
                  </div>
                  {r.numeroCtrNovo && (
                    <div>
                      <span className="text-slate-400">Nova CTR:</span>
                      <span className="ml-1 font-bold text-green-700">
                        {r.numeroCtrNovo}
                      </span>
                    </div>
                  )}
                  <div>
                    <span className="text-slate-400">Cliente:</span>
                    <span className="ml-1 text-slate-700">
                      {r.data.clienteNome}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400">CPF/CNPJ:</span>
                    <span className="ml-1 text-slate-700">
                      {r.data.clienteCpfCnpj}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400">Endereço:</span>
                    <span className="ml-1 text-slate-700">
                      {r.data.endereco}, {r.data.bairro}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400">Material:</span>
                    <span className="ml-1 text-slate-700">
                      {r.data.tipoMaterial}
                    </span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Abrir CTR Automacao */}
      <div className="text-center">
        <a
          href={API_CTR}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-xs text-indigo-600 hover:text-indigo-800 font-medium"
        >
          <ExternalLink className="w-3 h-3" />
          Abrir CTR Automação
        </a>
      </div>
    </div>
  );
}
