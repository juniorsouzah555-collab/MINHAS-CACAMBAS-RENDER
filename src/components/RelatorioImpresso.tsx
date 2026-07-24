import React, { useState, useMemo } from "react";
import { Calendar, Printer, FileText, Truck, Smartphone, Monitor } from "lucide-react";
import { Lancamento } from "../types";

interface RelatorioImpressoProps {
  lancamentos: Lancamento[];
}

function formatDate(d: string): string {
  if (!d) return "—";
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
}

function formatTime(iso: string): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "—";
  }
}

export default function RelatorioImpresso({ lancamentos }: RelatorioImpressoProps) {
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().slice(0, 10);
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().slice(0, 10));

  const filtered = useMemo(() => {
    return lancamentos
      .filter((l) => {
        const d = l.data;
        return (!startDate || d >= startDate) && (!endDate || d <= endDate);
      })
      .sort((a, b) => (b.data || "").localeCompare(a.data || ""));
  }, [lancamentos, startDate, endDate]);

  const totalCacambas = filtered.reduce((s, l) => s + l.quantidadeCacambas, 0);
  const totalValor = filtered.reduce((s, l) => s + l.valor, 0);

  const handlePrint = () => {
    const ts = document.getElementById("print-timestamp-rel");
    if (ts) ts.textContent = `Impresso em: ${new Date().toLocaleDateString("pt-BR")} às ${new Date().toLocaleTimeString("pt-BR")}`;
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* ── Controles (não imprime) ── */}
      <div className="no-print bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 rounded-lg bg-emerald-100 text-emerald-600">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-black text-slate-900">Relatório de Descartes</h2>
            <p className="text-xs text-slate-500">Relatório para impressão — formato ATT Transcar</p>
          </div>
        </div>
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Data Início</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Data Fim</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
            />
          </div>
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 text-white font-bold text-sm hover:bg-emerald-700 transition-all cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            Imprimir
          </button>
        </div>
      </div>

      {/* ── Relatório (imprimível) ── */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden print:shadow-none print:border-0 print:rounded-none">
        {/* Cabeçalho verde */}
        <div className="bg-emerald-600 text-white p-6 print:bg-emerald-600">
          <div className="flex items-center gap-3 mb-2">
            <Truck className="w-7 h-7" />
            <h1 className="text-xl font-black">RELATÓRIO DE DESCARTES (CAÇAMBAS)</h1>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm mt-3">
            <div>
              <span className="text-emerald-200 text-xs">Cliente</span>
              <p className="font-bold">RELAMPAGO CACAMBAS</p>
            </div>
            <div>
              <span className="text-emerald-200 text-xs">Período</span>
              <p className="font-bold">{formatDate(startDate)} a {formatDate(endDate)}</p>
            </div>
            <div>
              <span className="text-emerald-200 text-xs">Total de Caçambas</span>
              <p className="font-bold text-lg">{totalCacambas}</p>
            </div>
            <div>
              <span className="text-emerald-200 text-xs">Valor Total</span>
              <p className="font-bold text-lg">R$ {totalValor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
            </div>
          </div>
          <p className="text-[10px] text-emerald-300 mt-3" id="print-timestamp-rel"></p>
        </div>

        {/* Tabela */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-100 text-slate-700 text-xs font-bold uppercase">
                <th className="px-3 py-2.5 text-left">Registro</th>
                <th className="px-3 py-2.5 text-left">Data</th>
                <th className="px-3 py-2.5 text-left">Horário</th>
                <th className="px-3 py-2.5 text-left">Empresa</th>
                <th className="px-3 py-2.5 text-left">Nº Lançamento</th>
                <th className="px-3 py-2.5 text-center">Origem</th>
                <th className="px-3 py-2.5 text-center">Qtd</th>
                <th className="px-3 py-2.5 text-right">Valor Unit.</th>
                <th className="px-3 py-2.5 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((lan, i) => (
                <tr
                  key={lan.id}
                  className={`border-b border-slate-100 ${
                    i % 2 === 0 ? "bg-white" : "bg-slate-50/60"
                  } ${lan.source === "mobile" ? "bg-orange-50/40" : ""}`}
                >
                  <td className="px-3 py-2 font-bold text-slate-800">{i + 1}º</td>
                  <td className="px-3 py-2 text-slate-700">{formatDate(lan.data)}</td>
                  <td className="px-3 py-2 text-slate-700 font-mono text-xs">{formatTime(lan.createdAt)}</td>
                  <td className="px-3 py-2 text-slate-700">{lan.botaForaNome || "—"}</td>
                  <td className="px-3 py-2 font-bold text-slate-800">{lan.numero ? `#${lan.numero}` : "—"}</td>
                  <td className="px-3 py-2 text-center">
                    {lan.source === "mobile" ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-100 text-orange-700">
                        <Smartphone className="w-3 h-3" />
                        Celular
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700">
                        <Monitor className="w-3 h-3" />
                        Web
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-center font-bold">{lan.quantidadeCacambas}</td>
                  <td className="px-3 py-2 text-right text-slate-600">
                    R$ {lan.valor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-3 py-2 text-right font-bold text-slate-900">
                    R$ {(lan.quantidadeCacambas * lan.valor).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-3 py-8 text-center text-slate-400">
                    Nenhum lançamento encontrado no período selecionado.
                  </td>
                </tr>
              )}
            </tbody>
            {filtered.length > 0 && (
              <tfoot>
                <tr className="bg-slate-100 font-black text-slate-900">
                  <td colSpan={6} className="px-3 py-3 text-right">TOTAIS</td>
                  <td className="px-3 py-3 text-center text-lg">{totalCacambas}</td>
                  <td className="px-3 py-3 text-right">—</td>
                  <td className="px-3 py-3 text-right text-lg">
                    R$ {totalValor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {/* Rodapé */}
        <div className="p-4 border-t border-slate-200 text-xs text-slate-400 flex justify-between">
          <span>RELAMPAGO CACAMBAS — Sistema de Gestão de Caçambas</span>
          <span>{filtered.length} registro(s)</span>
        </div>
      </div>
    </div>
  );
}
