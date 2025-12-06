import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format, parseISO } from 'date-fns';

export const exportServicesCSV = (data) => {
  const headers = ["Nº OS", "Data", "Categoria", "Subcategoria", "Mecânico", "Status", "Valor"];
  const rows = data.map(item => [
    item.osNumber,
    format(parseISO(item.date), "dd/MM/yyyy"),
    item.category,
    item.subcategory,
    item.mechanic,
    item.osStatusLabel, // Use osStatusLabel for more descriptive status
    item.amount.toFixed(2)
  ]);

  const csvContent = "\uFEFF" + headers.join(",") + "\n" + rows.map(e => e.join(",")).join("\n");
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const downloadLink = document.createElement("a");
  downloadLink.href = url;
  downloadLink.download = "relatorio_servicos.csv";
  document.body.appendChild(downloadLink);
  downloadLink.click();
  document.body.removeChild(downloadLink);
};

export const createServicesPDF = (data, filters, totalValue, chartsData = null) => {
  const doc = new jsPDF();
  
  doc.setFontSize(16);
  doc.text("Relatório de Serviços", 14, 20);
  
  doc.setFontSize(10);
  doc.text(`Período: ${format(filters.dateRange.from, "dd/MM/yyyy")} a ${format(filters.dateRange.to || filters.dateRange.from, "dd/MM/yyyy")}`, 14, 28);
  
  let filterText = '';
  // Removed osStatus, plate, client, origin from filter text
  if (filters.mechanic && filters.mechanic !== 'all') filterText += ` | Mecânico: ${filters.mechanic}`;
  if (filters.category && filters.category !== 'all') filterText += ` | Categoria: ${filters.category}`;
  
  if (filterText) {
    doc.text(`Filtros: ${filterText.substring(3)}`, 14, 33); // Remove leading ' | '
  } else {
    doc.text('Filtros: Nenhum', 14, 33);
  }
  
  doc.text(`Gerado em: ${format(new Date(), "dd/MM/yyyy HH:mm")}`, 14, 38);

  // Removed "Placa" and "Cliente" from table columns
  const tableColumn = ["Nº OS", "Data", "Categoria", "Subcat.", "Mecânico", "Status", "Valor (R$)"];
  const tableRows = data.map(item => [
    item.osNumber,
    format(parseISO(item.date), "dd/MM/yyyy"),
    item.category.substring(0, 20),
    item.subcategory.substring(0, 20),
    item.mechanic,
    item.osStatusLabel, // Use osStatusLabel
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
      2: { cellWidth: 30 }, // Categoria
      3: { cellWidth: 30 }, // Subcategoria
      4: { cellWidth: 30 }  // Mecânico
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