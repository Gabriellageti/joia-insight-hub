import type { ConsultingReportRow } from "@/lib/consulting-reports";
import { REPORT_SECTIONS, sectionToText } from "@/lib/consulting-reports";
import type { Json } from "@/integrations/supabase/types";

export async function exportConsultingReportPdf(report: ConsultingReportRow, clientName: string): Promise<void> {
  const { jsPDF } = await import("jspdf");
  const pdf = new jsPDF({ unit: "mm", format: "a4" });
  const margin = 18; const width = 210 - margin * 2; const pageHeight = 297; let y = 20;
  const addPageIfNeeded = (height: number) => { if (y + height > pageHeight - 18) { pdf.addPage(); y = 20; } };
  pdf.setFillColor(20, 48, 76); pdf.rect(0, 0, 210, 34, "F"); pdf.setTextColor(255, 255, 255); pdf.setFont("helvetica", "bold"); pdf.setFontSize(18); pdf.text(report.title, margin, 17); pdf.setFontSize(9); pdf.text(`${clientName} · ${new Date(report.period_start + "T12:00:00").toLocaleDateString("pt-BR")} a ${new Date(report.period_end + "T12:00:00").toLocaleDateString("pt-BR")} · versão ${report.version_number}`, margin, 27); y = 45; pdf.setTextColor(35, 42, 50);
  const sections = (report.sections || {}) as Record<string, Json | undefined>;
  for (const [key, label] of REPORT_SECTIONS) {
    const content = sectionToText(sections[key]); if (!content.trim()) continue;
    addPageIfNeeded(16); pdf.setFont("helvetica", "bold"); pdf.setFontSize(13); pdf.setTextColor(20, 48, 76); pdf.text(label, margin, y); y += 7;
    pdf.setFont("helvetica", "normal"); pdf.setFontSize(9.5); pdf.setTextColor(45, 50, 55);
    for (const line of pdf.splitTextToSize(content, width) as string[]) { addPageIfNeeded(5); pdf.text(line, margin, y); y += 4.8; }
    y += 4;
  }
  const total = pdf.getNumberOfPages();
  for (let page = 1; page <= total; page++) { pdf.setPage(page); pdf.setDrawColor(220); pdf.line(margin, 284, 210 - margin, 284); pdf.setFontSize(8); pdf.setTextColor(110); pdf.text("JoIA Ops · Relatório de Consultoria", margin, 290); pdf.text(`Página ${page} de ${total}`, 210 - margin, 290, { align: "right" }); }
  pdf.save(`relatorio-consultoria-${clientName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.pdf`);
}
