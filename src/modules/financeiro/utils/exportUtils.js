import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format, parseISO } from 'date-fns';

export const exportFinancialCSV = (data) => {
  const headers = ["ID", "Data", "Descrição", "Tipo", "Categoria", "Forma Pagamento", "Responsável", "Status", "Valor"];
  const rows = data.map(item => [
    item.id, // FIXED: Using id directly
    format(parseISO(item.date), "dd/MM/yyyy"),
    item.description,
    item.typeLabel,
    item.category,
    item.paymentMethod,
    item.responsible,
    item.statusLabel,
    item.amount.toFixed(2)
  ]);

  const csvContent = "\uFEFF" + headers.join(",") + "\n" + rows.map(e => e.join(",")).join("\n");
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const downloadLink = document.createElement("a");
  downloadLink.href = url;
  downloadLink.download = "relatorio_financeiro.csv";
  document.body.appendChild(downloadLink);
  downloadLink.click();
  document.body.removeChild(downloadLink);
};

export const createFinancialPDF = (data, filters, totalValue, chartsData = null) => {
  const doc = new jsPDF();
  
  doc.setFontSize(16);
  doc.text("Relatório Financeiro", 14, 20);
  
  doc.setFontSize(10);
  doc.text(`Período: ${format(filters.dateRange.from, "dd/MM/yyyy")} a ${format(filters.dateRange.to || filters.dateRange.from, "dd/MM/yyyy")}`, 14, 28);
  
  let filterText = `Tipo: ${filters.type === 'all' ? 'Todos' : filters.type === 'income' ? 'Receita' : 'Despesa'}`;
  if (filters.category !== 'all') filterText += ` | Categoria: ${filters.category}`;
  if (filters.status !== 'all') filterText += ` | Status: ${filters.status === 'paid' ? 'Pago' : 'Pendente'}`;
  
  doc.text(filterText, 14, 33);
  doc.text(`Gerado em: ${format(new Date(), "dd/MM/yyyy HH:mm")}`, 14, 38);

  const tableColumn = ["Data", "Descrição", "Tipo", "Categoria", "Pgto", "Responsável", "Valor (R$)"];
  const tableRows = data.map(item => [
    format(parseISO(item.date), "dd/MM/yyyy"),
    item.description.substring(0, 30) + (item.description.length > 30 ? '...' : ''),
    item.typeLabel.toUpperCase(),
    item.category,
    item.paymentMethod,
    item.responsible,
    item.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })
  ]);

  autoTable(doc, {
    startY: 45,
    head: [tableColumn],
    body: tableRows,
    theme: 'striped',
    headStyles: { fillColor: [41, 128, 185] },
    styles: { fontSize: 8 },
    columnStyles: {
      1: { cellWidth: 40 }, // Descrição
      5: { cellWidth: 25 }  // Responsável
    },
    foot: [['', '', '', '', '', 'TOTAL', totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })]],
    footStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold' }
  });

  if (chartsData) {
      const finalY = doc.lastAutoTable.finalY || 150;
      doc.text("Resumo Visual disponível no painel.", 14, finalY + 10);
  }

  return doc;
};