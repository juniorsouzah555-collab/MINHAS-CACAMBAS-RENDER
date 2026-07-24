import React, { useState, useMemo } from "react";
import { Printer, FileText, Truck, Smartphone, Monitor, Download } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Lancamento, BotaFora } from "../types";

interface RelatorioImpressoProps {
  lancamentos: Lancamento[];
  botaForas: BotaFora[];
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

function generatePDF(
  filtered: Lancamento[],
  empresaNome: string,
  startDate: string,
  endDate: string,
  totalCacambas: number,
  totalValor: number
) {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const green: [number, number, number] = [5, 150, 80];

  // ── Cabeçalho verde ──
  doc.setFillColor(...green);
  doc.rect(0, 0, pageW, 32, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("RELATORIO DE DESCARTES (CACAMBAS)", 14, 14);

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(`Cliente: ${empresaNome}`, 14, 21);
  doc.text(`Periodo: ${formatDate(startDate)} a ${formatDate(endDate)}`, 14, 26);
  doc.text(
    `Total: ${totalCacambas} cacamba(s)  |  Valor: R$ ${totalValor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
    pageW / 2,
    26,
    { align: "center" }
  );
  doc.text(
    `Impresso em: ${new Date().toLocaleDateString("pt-BR")} as ${new Date().toLocaleTimeString("pt-BR")}`,
    pageW - 14,
    26,
    { align: "right" }
  );

  // ── Tabela ──
  const rows = filtered.map((lan, i) => [
    `${i + 1}o`,
    formatDate(lan.data),
    formatTime(lan.createdAt),
    lan.botaForaNome || "—",
    lan.numero != null ? `#${lan.numero}` : "—",
    lan.source === "mobile" ? "Celular" : "Web",
    String(lan.quantidadeCacambas),
    `R$ ${lan.valor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
    `R$ ${(lan.quantidadeCacambas * lan.valor).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
  ]);

  autoTable(doc, {
    startY: 36,
    head: [["#", "Data", "Horario", "Empresa", "Nº Lanc.", "Origem", "Qtd", "Valor Unit.", "Total"]],
    body: rows,
    foot: [["", "", "", "", "TOTAIS", "", String(totalCacambas), "", `R$ ${totalValor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`]],
    theme: "grid",
    styles: { fontSize: 7, cellPadding: 2, textColor: [30, 30, 30] },
    headStyles: { fillColor: green, fontStyle: "bold", textColor: [255, 255, 255] },
    footStyles: { fillColor: [226, 232, 240], fontStyle: "bold", textColor: [15, 23, 42] },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      0: { cellWidth: 12 },
      6: { halign: "center" as const },
      7: { halign: "right" as const },
      8: { halign: "right" as const },
    },
    didParseCell(data) {
      if (data.section === "body" && data.column.index === 5) {
        const src = filtered[data.row.index]?.source;
        data.cell.styles.textColor = src === "mobile" ? [194, 65, 12] : [37, 99, 235];
      }
    },
  });

  // ── Rodapé ──
  const finalY = (doc as any).lastAutoTable?.finalY || 36;
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text("RELAMPAGO CACAMBAS — Sistema de Gestao de Cacambas", 14, finalY + 6);
  doc.text(`${filtered.length} registro(s)`, pageW - 14, finalY + 6, { align: "right" });

  doc.save(`relatorio-descartes-${startDate}-${endDate}.pdf`);
}

export default function RelatorioImpresso({ lancamentos, botaForas }: RelatorioImpressoProps) {
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().slice(0, 10);
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [selectedBotaFora, setSelectedBotaFora] = useState("ALL");
  const [generating, setGenerating] = useState(false);

  const filtered = useMemo(() => {
    return lancamentos
      .filter((l) => {
        const d = l.data;
        const matchDate = (!startDate || d >= startDate) && (!endDate || d <= endDate);
        const matchBf = selectedBotaFora === "ALL" || l.botaForaId === selectedBotaFora;
        return matchDate && matchBf;
      })
      .sort((a, b) => (b.data || "").localeCompare(a.data || ""));
  }, [lancamentos, startDate, endDate, selectedBotaFora]);

  const totalCacambas = filtered.reduce((s, l) => s + l.quantidadeCacambas, 0);
  const totalValor = filtered.reduce((s, l) => s + l.valor, 0);
  const empresaSelecionada = botaForas.find((b) => b.id === selectedBotaFora);
  const empresaNome = empresaSelecionada?.nome || "TODAS AS EMPRESAS";

  const handlePrint = () => {
    const ts = document.getElementById("print-timestamp-rel");
    if (ts) ts.textContent = `Impresso em: ${new Date().toLocaleDateString("pt-BR")} às ${new Date().toLocaleTimeString("pt-BR")}`;
    window.print();
  };

  const handleDownloadPDF = () => {
    setGenerating(true);
    setTimeout(() => {
      generatePDF(filtered, empresaNome, startDate, endDate, totalCacambas, totalValor);
      setGenerating(false);
    }, 100);
  };

  return (
    <div>
      {/* ── Controles (não imprime) ── */}
      <div className="no-print mb-6 bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 rounded-lg bg-emerald-100 text-emerald-600">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-black text-slate-900">Relatório de Descartes</h2>
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
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Empresa</label>
            <select
              value={selectedBotaFora}
              onChange={(e) => setSelectedBotaFora(e.target.value)}
              className="px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-400"
            >
              <option value="ALL">Todas</option>
              {botaForas.map((bf) => (
                <option key={bf.id} value={bf.id}>{bf.nome}</option>
              ))}
            </select>
          </div>
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 text-white font-bold text-sm hover:bg-emerald-700 transition-all cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            Imprimir
          </button>
          <button
            onClick={handleDownloadPDF}
            disabled={generating || filtered.length === 0}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 text-white font-bold text-sm hover:bg-blue-700 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="w-4 h-4" />
            {generating ? "Gerando..." : "Baixar PDF"}
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
              <p className="font-bold">{empresaNome}</p>
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
                  <td className="px-3 py-2 font-bold text-slate-800">{lan.numero != null ? `#${lan.numero}` : "—"}</td>
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
