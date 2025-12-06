
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { supabase } from '@/lib/customSupabaseClient';
import { format } from 'date-fns';
import { formatCurrency } from '@/lib/utils';

// ==========================================
// 1. CONFIGURATION (Unified)
// ==========================================
const PDF_CONFIG = {
  page: {
    format: 'a4',
    orientation: 'p',
    unit: 'mm',
    width: 210,  // A4 Standard
    height: 297, // A4 Standard
    margins: { top: 10, bottom: 10, left: 10, right: 10 }
  },
  colors: {
    primary: '#2A4C8C',    // Imperial Dark Blue
    secondary: '#2E64A3',  // Highlight Blue
    textDark: '#000000',
    textGray: '#555555',
    border: '#CECECE', // Light gray for borders
    bgLight: '#E6F0FF',
    white: '#FFFFFF'
  },
  fonts: {
    name: "helvetica",
    sizes: {
      title: 12,
      header: 10,
      body: 8,
      small: 7,
      tiny: 6
    },
    styles: { normal: "normal", bold: "bold" }
  },
  layout: {
    lineHeight: 4,
    boxPadding: 3,
    headerHeight: 28,
    sectionHeaderHeight: 7
  },
  defaults: {
    company: {
      name: "IMPERIAL SERVIÇOS AUTOMOTIVOS",
      address: "Av Comendador Aladino Selmi nº 450 – Vila San Martins – Campinas – SP – Cep 13069-096",
      contact: "(19) 98267-2781 | imperial.s.a@hotmail.com"
    }
  }
};

// ==========================================
// 2. HELPER FUNCTIONS
// ==========================================

const fetchCompanyData = async () => {
  const { data, error } = await supabase.from('oficina_dados').select('*').single();
  if (error || !data) {
    return PDF_CONFIG.defaults.company;
  }
  return {
    name: data.nome || PDF_CONFIG.defaults.company.name,
    address: data.endereco || PDF_CONFIG.defaults.company.address,
    contact: `${data.telefone || ''} | ${data.email || ''}` || PDF_CONFIG.defaults.company.contact,
    logo_url: data.logo_url
  };
};

const fetchDocumentTemplate = async () => {
  const { data, error } = await supabase.from('document_templates').select('*').single();
  if (error || !data) {
    // Return a default structure if no template exists
    return {
      company_logo_url: null,
      primary_color: PDF_CONFIG.colors.primary,
      company_info: PDF_CONFIG.defaults.company
    };
  }
  return data;
};

const loadImage = async (url) => {
  if (!url) return null;
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  });
};

const checkPageBreak = (doc, currentY, heightNeeded) => {
  const pageHeight = doc.internal.pageSize.height;
  if (currentY + heightNeeded > pageHeight - PDF_CONFIG.page.margins.bottom) {
    doc.addPage();
    return PDF_CONFIG.page.margins.top;
  }
  return currentY;
};

// Draws a blue header bar with white centered text (e.g., "DADOS DO CLIENTE")
const drawSectionTitle = (doc, y, titles = []) => {
  const { left, right } = PDF_CONFIG.page.margins;
  const contentWidth = PDF_CONFIG.page.width - left - right;
  const height = PDF_CONFIG.layout.sectionHeaderHeight;

  // Background
  doc.setFillColor(PDF_CONFIG.colors.secondary);
  doc.rect(left, y, contentWidth, height, 'F');
  
  // Border
  doc.setDrawColor(PDF_CONFIG.colors.border);
  doc.setLineWidth(0.1);
  doc.rect(left, y, contentWidth, height);

  // Text
  doc.setTextColor(PDF_CONFIG.colors.white);
  doc.setFont(PDF_CONFIG.fonts.name, PDF_CONFIG.fonts.styles.bold);
  doc.setFontSize(9);

  const segmentWidth = contentWidth / titles.length;
  titles.forEach((title, index) => {
    const textX = left + (segmentWidth * index) + (segmentWidth / 2);
    const textY = y + (height / 2) + 1.5;
    doc.text(title.toUpperCase(), textX, textY, { align: 'center' });
  });

  return y + height;
};

// Generic field drawer: "Label: Value"
const drawField = (doc, x, y, label, value, maxWidth) => {
  doc.setFont(PDF_CONFIG.fonts.name, PDF_CONFIG.fonts.styles.bold);
  doc.setTextColor(PDF_CONFIG.colors.secondary);
  doc.setFontSize(PDF_CONFIG.fonts.sizes.body);
  doc.text(label, x, y);

  const labelWidth = doc.getTextWidth(label);
  doc.setFont(PDF_CONFIG.fonts.name, PDF_CONFIG.fonts.styles.normal);
  doc.setTextColor(PDF_CONFIG.colors.textDark);
  
  const valueX = x + labelWidth + 2;
  // Handle multi-line values if maxWidth is provided
  if (maxWidth) {
    const availableWidth = maxWidth - (labelWidth + 2);
    const splitText = doc.splitTextToSize(value || '', availableWidth);
    doc.text(splitText, valueX, y);
    return splitText.length * PDF_CONFIG.layout.lineHeight; // Return height used
  } else {
    doc.text(value || '', valueX, y);
    return PDF_CONFIG.layout.lineHeight;
  }
};

// ==========================================
// 3. MAIN DRAWING COMPONENTS
// ==========================================

const drawHeader = async (doc, startY, templateData, badgeInfo) => {
  const { left, right } = PDF_CONFIG.page.margins;
  const contentWidth = PDF_CONFIG.page.width - left - right;
  const height = PDF_CONFIG.layout.headerHeight;

  // Layout Zones
  const logoZoneW = contentWidth * 0.30;
  const centerZoneW = contentWidth * 0.45;
  const badgeZoneW = contentWidth * 0.25;

  const centerX = left + logoZoneW;
  const badgeX = centerX + centerZoneW;

  // 1. LOGO (Vertically Centered)
  if (templateData.company_logo_url) {
    try {
      const img = await loadImage(templateData.company_logo_url);
      if (img) {
        const ratio = img.width / img.height;
        let finalH = height - 4;
        let finalW = finalH * ratio;
        if (finalW > logoZoneW - 4) {
          finalW = logoZoneW - 4;
          finalH = finalW / ratio;
        }
        const logoY = startY + ((height - finalH) / 2);
        const logoX = left + ((logoZoneW - finalW) / 2);
        doc.addImage(img, 'PNG', logoX, logoY, finalW, finalH);
      }
    } catch (e) { console.error("Logo error", e); }
  }

  // 2. COMPANY INFO (Center - Vertically Centered)
  const centerTextX = centerX + (centerZoneW / 2);
  
  // Reorganize company address and contact details
  const companyAddressParts = PDF_CONFIG.defaults.company.address.split(' – ');
  const addressLine1 = companyAddressParts[0] + ' – ' + companyAddressParts[1]; // "Av Comendador Aladino Selmi nº 450 – Vila San Martins"
  // User requested to directly use the full string for addressLine2
  const addressLine2 = "Campinas – SP – Cep 13069-096";
  const contactLine = PDF_CONFIG.defaults.company.contact; // "(19) 98267-2781 | imperial.s.a@hotmail.com"

  // Pre-calculate content height to center it
  doc.setFont(PDF_CONFIG.fonts.name, PDF_CONFIG.fonts.styles.normal);
  doc.setFontSize(PDF_CONFIG.fonts.sizes.tiny);
  
  const companyNameLineHeight = 4; // for font size 10, approx 4mm
  const addressLineHeight = 3; // for font size 6, approx 3mm per line
  const contactLineHeight = 3; // for font size 6, approx 3mm
  
  // Total height for the three new lines (company name, address lines 1 & 2, contact line)
  const totalInfoBlockHeight = companyNameLineHeight + (addressLineHeight * 2) + contactLineHeight;

  // Start Y position to center the entire company info block within the header height
  let textY = startY + ((height - totalInfoBlockHeight) / 2) + 3; // Adjusted for baseline

  // Draw Name
  doc.setTextColor(PDF_CONFIG.colors.secondary);
  doc.setFont(PDF_CONFIG.fonts.name, PDF_CONFIG.fonts.styles.bold);
  doc.setFontSize(PDF_CONFIG.fonts.sizes.header);
  doc.text(PDF_CONFIG.defaults.company.name, centerTextX, textY, { align: 'center' });
  
  textY += companyNameLineHeight; // Move down for next line

  // Draw Address & Contact
  doc.setTextColor(PDF_CONFIG.colors.textGray);
  doc.setFont(PDF_CONFIG.fonts.name, PDF_CONFIG.fonts.styles.normal);
  doc.setFontSize(PDF_CONFIG.fonts.sizes.tiny);
  
  doc.text(addressLine1, centerTextX, textY, { align: 'center' });
  textY += addressLineHeight;
  doc.text(addressLine2, centerTextX, textY, { align: 'center' }); 
  textY += addressLineHeight;
  doc.text(contactLine, centerTextX, textY, { align: 'center' });

  // 3. BADGE (Right - Vertically Centered)
  const badgeTextX = badgeX + (badgeZoneW / 2);
  
  // Estimate badge block height: Title (Y) -> Number (Y+6) -> Date (Y+10) => Total span ~14mm
  const badgeBlockHeight = 14;
  let badgeY = startY + ((height - badgeBlockHeight) / 2) + 3;

  doc.setTextColor(PDF_CONFIG.colors.secondary);
  doc.setFont(PDF_CONFIG.fonts.name, PDF_CONFIG.fonts.styles.bold);
  doc.setFontSize(PDF_CONFIG.fonts.sizes.title);
  doc.text(badgeInfo.title, badgeTextX, badgeY, { align: 'center' });

  badgeY += 6;
  doc.setTextColor(PDF_CONFIG.colors.textDark);
  doc.setFontSize(PDF_CONFIG.fonts.sizes.header);
  doc.text(`Nº ${String(badgeInfo.number).padStart(6, '0')}`, badgeTextX, badgeY, { align: 'center' });

  badgeY += 4;
  doc.setFont(PDF_CONFIG.fonts.name, PDF_CONFIG.fonts.styles.normal);
  doc.setFontSize(PDF_CONFIG.fonts.sizes.body);
  doc.text(badgeInfo.date, badgeTextX, badgeY, { align: 'center' });

  // Border around header
  doc.setDrawColor(PDF_CONFIG.colors.border);
  doc.rect(left, startY, contentWidth, height);

  return startY + height + 2;
};

const drawClientVehicleBlock = (doc, startY, client, vehicle) => {
  let y = startY;
  const { left, right } = PDF_CONFIG.page.margins;
  const contentWidth = PDF_CONFIG.page.width - left - right;
  const halfWidth = contentWidth / 2;
  const pad = PDF_CONFIG.layout.boxPadding;
  const lh = PDF_CONFIG.layout.lineHeight;

  // Header Bar
  y = drawSectionTitle(doc, y, ["DADOS DO CLIENTE", "DADOS DO VEÍCULO"]);

  // Calculate content height
  const leftX = left + pad;
  const rightX = left + halfWidth + pad;
  const maxTextWidth = halfWidth - (pad * 2) - 15; // approximate label width

  // Simulate text split to calculate height needed
  const addressLines = doc.splitTextToSize(client.address || '', maxTextWidth).length;
  const vehicleDetailLines = doc.splitTextToSize(vehicle.details || '', maxTextWidth).length;
  
  const leftRows = 3 + addressLines; // Name, Tel, Email + Address
  const rightRows = 3 + vehicleDetailLines; // Model, Plate, KM + Details
  const contentHeight = (Math.max(leftRows, rightRows) * lh) + (pad * 2);

  // Draw Box Border & Divider
  doc.setDrawColor(PDF_CONFIG.colors.border);
  doc.rect(left, y, contentWidth, contentHeight);
  doc.line(left + halfWidth, y, left + halfWidth, y + contentHeight);

  // Content Y Position
  let cy = y + pad + lh;

  // Left Column (Client)
  drawField(doc, leftX, cy, "Nome:", client.name);
  drawField(doc, leftX, cy + lh, "Tel:", client.phone);
  drawField(doc, leftX, cy + lh * 2, "Email:", client.email);
  drawField(doc, leftX, cy + lh * 3, "End:", client.address, halfWidth - (pad * 2));

  // Right Column (Vehicle)
  drawField(doc, rightX, cy, "Veículo:", vehicle.model);
  drawField(doc, rightX, cy + lh, "Placa:", vehicle.plate);
  drawField(doc, rightX, cy + lh * 2, "KM:", vehicle.km);
  drawField(doc, rightX, cy + lh * 3, "Ano/Cor:", vehicle.details, halfWidth - (pad * 2));

  return y + contentHeight + 4;
};

const drawTable = (doc, startY, items) => {
  let y = startY;
  const categories = [
    { key: 'product', title: 'PEÇAS' },
    { key: 'service', title: 'SERVIÇOS' },
    { key: 'external', title: 'SERVIÇOS EXTERNOS' }
  ];

  let totalGeneral = 0;

  categories.forEach(cat => {
    let catItems = [];
    if (cat.key === 'external') {
        catItems = items.filter(i => ['external_service', 'servico_externo'].includes(i.item_type));
    } else {
        catItems = items.filter(i => i.item_type === cat.key);
    }

    if (catItems.length === 0) return;

    const catTotal = catItems.reduce((acc, i) => acc + ((i.quantity || 0) * (i.unit_price || 0)), 0);
    totalGeneral += catTotal;

    y = checkPageBreak(doc, y, 30);

    doc.autoTable({
      startY: y,
      head: [[cat.title, "Qtd", "V. Unit", "Total"]],
      body: catItems.map(i => [
        i.description,
        i.quantity,
        formatCurrency(i.unit_price || 0),
        formatCurrency((i.quantity || 0) * (i.unit_price || 0))
      ]),
      foot: [[
        { content: `Total ${cat.title}:`, colSpan: 3, styles: { halign: 'right', fontStyle: 'bold' } },
        { content: formatCurrency(catTotal), styles: { halign: 'center', fontStyle: 'bold' } }
      ]],
      theme: 'grid',
      styles: {
        font: PDF_CONFIG.fonts.name,
        fontSize: PDF_CONFIG.fonts.sizes.body,
        textColor: PDF_CONFIG.colors.textDark,
        lineColor: PDF_CONFIG.colors.border,
        lineWidth: 0.1,
        cellPadding: 1.5,
        halign: 'center'
      },
      headStyles: {
        fillColor: PDF_CONFIG.colors.secondary,
        textColor: PDF_CONFIG.colors.white,
        fontStyle: 'bold',
        valign: 'middle'
      },
      footStyles: {
        fillColor: PDF_CONFIG.colors.white,
        textColor: PDF_CONFIG.colors.secondary,
        lineColor: PDF_CONFIG.colors.border
      },
      columnStyles: {
        0: { cellWidth: 'auto', halign: 'left' },
        1: { cellWidth: 15 },
        2: { cellWidth: 25 },
        3: { cellWidth: 25 }
      },
      margin: PDF_CONFIG.page.margins
    });

    y = doc.lastAutoTable.finalY + 4;
  });

  return { y, totalGeneral };
};

const drawTotal = (doc, startY, total) => {
  let y = checkPageBreak(doc, startY, 20);
  const { left, right } = PDF_CONFIG.page.margins;
  
  doc.setDrawColor(PDF_CONFIG.colors.border);
  doc.setLineWidth(0.5);
  doc.line(left, y, PDF_CONFIG.page.width - right, y);
  y += 7;

  doc.setFont(PDF_CONFIG.fonts.name, PDF_CONFIG.fonts.styles.bold);
  doc.setFontSize(13);
  doc.setTextColor(PDF_CONFIG.colors.secondary);
  doc.text(`TOTAL GERAL: ${formatCurrency(total)}`, PDF_CONFIG.page.width - right, y, { align: 'right' });
  
  return y + 10;
};

const drawFooter = (doc, startY) => {
  const { width, height } = doc.internal.pageSize;
  const { left, right, bottom } = PDF_CONFIG.page.margins;
  
  const footerHeight = 35;
  let y = height - bottom - footerHeight;

  // Add page if overlapping content
  if (startY > y) {
    doc.addPage();
    y = height - bottom - footerHeight;
  }

  // Signatures
  const sigLineY = y + 15;
  doc.setDrawColor(PDF_CONFIG.colors.border);
  doc.setLineWidth(0.3);
  doc.setTextColor(PDF_CONFIG.colors.textDark);

  // Left
  doc.line(left, sigLineY, left + 60, sigLineY);
  doc.setFontSize(PDF_CONFIG.fonts.sizes.small);
  doc.text("ASSINATURA DA OFICINA", left + 30, sigLineY + 3, { align: 'center' });

  // Right
  doc.line(width - right - 60, sigLineY, width - right, sigLineY);
  doc.text("ASSINATURA DO CLIENTE", width - right - 30, sigLineY + 3, { align: 'center' });

  // Disclaimer
  y = sigLineY + 12;
  doc.setFontSize(PDF_CONFIG.fonts.sizes.tiny);
  doc.setTextColor(PDF_CONFIG.colors.textGray);
  const text = "Garantia de 90 dias para serviços. Peças possuem garantia do fabricante. O pagamento deve ser efetuado na retirada do veículo.";
  doc.text(text, width / 2, y, { align: 'center' });
  
  // Page Numbers
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.text(`Página ${i} de ${pageCount}`, width / 2, height - 5, { align: 'center' });
  }
};

// ==========================================
// 4. MAIN EXPORTS
// ==========================================

export const generateDocumentPDF = async (docId, docType) => {
  // 1. Data Fetching
  const [companyData, template] = await Promise.all([
    fetchCompanyData(),
    fetchDocumentTemplate()
  ]);

  let docData = null;
  let items = [];
  let badgeInfo = { title: 'DOCUMENTO', number: '', date: '' };

  // 2. Data Normalization
  if (docType === 'orcamento' || docType === 'budget') {
    const { data } = await supabase.from('budgets').select(`
      *, customer:customers(*), vehicle:vehicles(*), budget_items(*)
    `).eq('id', docId).single();
    docData = data;
    items = data.budget_items || [];
    badgeInfo = {
      title: 'ORÇAMENTO',
      number: data.budget_number,
      date: format(new Date(data.created_at), "dd/MM/yyyy")
    };
  } else {
    const { data } = await supabase.from('service_orders').select(`
      *, customer:customers(*), vehicle:vehicles(*)
    `).eq('id', docId).single();
    docData = data;
    
    // Fetch items from work_orders mirror
    const { data: woData } = await supabase.from('work_orders')
      .select(`*, work_order_items(*)`).eq('id', docId).maybeSingle();
    
    if (woData) {
      items = woData.work_order_items || [];
      docData.km = woData.km; // Prefer KM from WO
    }

    badgeInfo = {
      title: 'ORDEM DE SERVIÇO',
      number: data.os_number,
      date: format(new Date(data.created_at), "dd/MM/yyyy")
    };
  }

  const client = {
    name: docData.customer_name || docData.customer?.name || "",
    phone: docData.customer?.phone || docData.customer?.whatsapp || "",
    email: docData.customer?.email || "",
    address: docData.customer?.address || ""
  };

  const vehicle = {
    model: docData.vehicle_description || (docData.vehicle ? `${docData.vehicle.brand} ${docData.vehicle.model}` : ""),
    plate: docData.vehicle?.plate || "",
    km: docData.km ? `${docData.km} KM` : "",
    details: docData.vehicle ? `${docData.vehicle.year || ''} / ${docData.vehicle.color || ''}` : ""
  };

  // 3. Document Generation
  const doc = new jsPDF('p', 'mm', 'A4');
  let cursorY = PDF_CONFIG.page.margins.top;

  cursorY = await drawHeader(doc, cursorY, template, badgeInfo);
  cursorY = drawClientVehicleBlock(doc, cursorY, client, vehicle);
  
  const { y: tableEndY, totalGeneral } = drawTable(doc, cursorY, items);
  cursorY = tableEndY;

  const finalTotal = docData.total_amount !== undefined ? docData.total_amount : (docData.total_cost !== undefined ? docData.total_cost : totalGeneral);
  cursorY = drawTotal(doc, cursorY, finalTotal);

  drawFooter(doc, cursorY);

  return doc;
};

export const generateBlankChecklistPDF = async () => {
  const [companyData, template] = await Promise.all([
    fetchCompanyData(),
    fetchDocumentTemplate()
  ]);

  const doc = new jsPDF('p', 'mm', 'A4');
  let cursorY = PDF_CONFIG.page.margins.top;
  const { left, right } = PDF_CONFIG.page.margins;
  const contentWidth = PDF_CONFIG.page.width - left - right;

  // Header
  cursorY = await drawHeader(doc, cursorY, template, {
    title: 'CHECKLIST',
    number: '----',
    date: format(new Date(), "dd/MM/yyyy")
  });

  // Checklist Title Bar
  cursorY = drawSectionTitle(doc, cursorY, ["INSPEÇÃO VEICULAR - ENTRADA / SAÍDA"]);
  cursorY += 5;

  // Blank Client/Vehicle Fields for manual filling
  const lineH = 8;
  const half = contentWidth / 2;
  
  doc.setFont(PDF_CONFIG.fonts.name, PDF_CONFIG.fonts.styles.bold);
  doc.setFontSize(9);
  doc.setTextColor(PDF_CONFIG.colors.textDark);
  
  // Custom manual drawing for blank fields
  const drawManualField = (label, x, y, w) => {
    doc.text(label, x, y);
    doc.setDrawColor(PDF_CONFIG.colors.border); // Set border color for lines
    doc.line(x + doc.getTextWidth(label) + 2, y + 1, x + w - 5, y + 1);
  };

  drawManualField("Cliente:", left, cursorY, half);
  drawManualField("Data:", left + half, cursorY, half);
  cursorY += lineH;
  
  drawManualField("Veículo:", left, cursorY, half);
  drawManualField("Placa:", left + half, cursorY, half);
  cursorY += lineH;
  
  drawManualField("KM:", left, cursorY, half);
  drawManualField("Combustível:", left + half, cursorY, half);
  cursorY += lineH * 1.5;

  // Checklist Items Grid
  const items = [
    "Luzes Painel", "Buzina", "Vidros", "Travas", "Espelhos", 
    "Luzes Int.", "Ar Cond.", "Rádio", "Bancos", "Cintos",
    "Faróis", "Setas", "Luz Freio", "Luz Ré", "Pneus",
    "Estepe", "Macaco", "Chave Roda", "Triângulo", "Bateria"
  ];

  const colWidth = contentWidth / 4;
  
  doc.setFontSize(8);
  items.forEach((item, index) => {
    const col = index % 4;
    const row = Math.floor(index / 4);
    const x = left + (col * colWidth);
    const y = cursorY + (row * 7);
    
    doc.setDrawColor(PDF_CONFIG.colors.border); // Set border color for checkboxes
    doc.rect(x, y - 4, 3, 3); // Checkbox
    doc.text(item, x + 5, y - 1.5);
  });

  cursorY += (Math.ceil(items.length / 4) * 7) + 5;

  // Observations Box
  doc.setFont(PDF_CONFIG.fonts.name, PDF_CONFIG.fonts.styles.bold);
  doc.text("OBSERVAÇÕES / AVARIAS:", left, cursorY);
  cursorY += 2;
  doc.setDrawColor(PDF_CONFIG.colors.border);
  doc.rect(left, cursorY, contentWidth, 40);
  cursorY += 45;

  drawFooter(doc, cursorY);
  return doc;
};
