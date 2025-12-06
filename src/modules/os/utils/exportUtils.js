import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format, parseISO } from 'date-fns';

export const exportServicesCSV = (data) => {
  const headers = ["Nº OS", "Data", "Tipo", "Descrição", "Valor", "Custo", "Lucro Real", "Lucro %"];
  const rows = data.map(item => [
    item.osNumber,
    format(parseISO(item.date), "dd/MM/yyyy"),
    item.typeLabel,
    item.description, 
    item.amount.toFixed(2),
    item.totalCost.toFixed(2),
    item.profit.toFixed(2),
    item.margin.toFixed(2) + '%'
  ]);

  const csvContent = "\uFEFF" + headers.join(",") + "\n" + rows.map(e => e.join(",")).join("\n");
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const downloadLink = document.createElement("a");
  downloadLink.href = url;
  downloadLink.download = "relatorio_os_detalhado.csv";
  document.body.appendChild(downloadLink);
  downloadLink.click();
  document.body.removeChild(downloadLink);
};

export const createServicesPDF = (data, filters, totals, chartsData = null) => {
  const doc = new jsPDF({ orientation: 'landscape' });
  
  doc.setFontSize(16);
  doc.text("Relatório de Ordens de Serviço (Detalhado)", 14, 20);
  
  doc.setFontSize(10);
  doc.text(`Período: ${format(filters.dateRange.from, "dd/MM/yyyy")} a ${format(filters.dateRange.to || filters.dateRange.from, "dd/MM/yyyy")}`, 14, 28);
  
  let filterText = '';
  if (filters.type && filters.type !== 'all') {
    const typeMap = { product: 'Peças', service: 'Serviços', external_service: 'Serviços Externos' };
    filterText += ` | Tipo: ${typeMap[filters.type] || filters.type}`;
  }
  
  if (filterText) {
    doc.text(`Filtros: ${filterText.substring(3)}`, 14, 33);
  } else {
    doc.text('Filtros: Nenhum', 14, 33);
  }
  
  doc.text(`Gerado em: ${format(new Date(), "dd/MM/yyyy HH:mm")}`, 14, 38);

  const tableColumn = ["OS", "Data", "Tipo", "Descrição", "Valor", "Custo", "Lucro", "%"];
  const tableRows = data.map(item => [
    item.osNumber,
    format(parseISO(item.date), "dd/MM"),
    item.typeLabel,
    item.description.substring(0, 50),
    item.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 }),
    item.totalCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 }),
    item.profit.toLocaleString('pt-BR', { minimumFractionDigits: 2 }),
    item.margin.toFixed(1) + '%'
  ]);

  autoTable(doc, {
    startY: 45,
    head: [tableColumn],
    body: tableRows,
    theme: 'striped',
    headStyles: { fillColor: [41, 128, 185] },
    styles: { fontSize: 8, cellPadding: 2 },
    columnStyles: {
      0: { cellWidth: 15 },
      1: { cellWidth: 20 },
      2: { cellWidth: 25 }, 
      3: { cellWidth: 'auto' }, 
      4: { cellWidth: 25, halign: 'right' },
      5: { cellWidth: 25, halign: 'right' },
      6: { cellWidth: 25, halign: 'right' },
      7: { cellWidth: 20, halign: 'right' }
    },
    foot: [['', '', '', 'TOTAIS', 
        totals.totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 }),
        totals.totalCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 }),
        totals.totalProfit.toLocaleString('pt-BR', { minimumFractionDigits: 2 }),
        totals.totalValue > 0 ? ((totals.totalProfit / totals.totalValue) * 100).toFixed(1) + '%' : '0%'
    ]],
    footStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold' }
  });

  if (chartsData) {
      const finalY = doc.lastAutoTable.finalY || 150;
      doc.text("Resumo Visual disponível no painel.", 14, finalY + 10);
  }

  return doc;
};