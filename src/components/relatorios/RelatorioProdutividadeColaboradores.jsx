import React, { useState, useEffect, useMemo } from 'react';
import { Helmet } from 'react-helmet';
import { supabase } from '@/lib/customSupabaseClient';
import { format, subDays, startOfDay, endOfDay, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { 
  Search, 
  Calendar as CalendarIcon, 
  Filter, 
  Printer, 
  FileSpreadsheet, 
  RefreshCcw,
  Loader2,
  AlertCircle,
  BarChart as BarChartIcon,
  List as ListIcon,
  PieChart as PieChartIcon,
  Share2,
  Download,
  MessageCircle
} from 'lucide-react';
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell
} from 'recharts';

const RelatorioProdutividadeColaboradores = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState([]);
  const [mechanics, setMechanics] = useState([]);
  
  // PDF Preview States
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [pdfUrl, setPdfUrl] = useState(null);
  const [pdfDoc, setPdfDoc] = useState(null);
  
  const [activeTab, setActiveTab] = useState("listing");
  
  // Filters
  const [dateRange, setDateRange] = useState({
    from: subDays(new Date(), 30),
    to: new Date(),
  });
  
  const [selectedMechanic, setSelectedMechanic] = useState("all");
  const [serviceTypeFilter, setServiceTypeFilter] = useState("");

  // 1. Fetch Mechanics for Dropdown
  useEffect(() => {
    const fetchMechanics = async () => {
      try {
        const { data, error } = await supabase
          .from('collaborators')
          .select('id, name')
          .order('name');
        
        if (error) throw error;
        setMechanics(data || []);
      } catch (error) {
        console.error('Error fetching mechanics:', error);
        toast({
          variant: "destructive",
          title: "Erro ao carregar mecânicos",
          description: "Não foi possível carregar a lista de colaboradores para o filtro."
        });
      }
    };

    fetchMechanics();
  }, [toast]);

  // 2. Main Data Fetching
  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch Service Orders (OS) within date range
      let osQuery = supabase
        .from('service_orders')
        .select(`
          id,
          os_number,
          created_at,
          status,
          total_amount,
          customer:customers(name),
          vehicle:vehicles(plate, brand, model)
        `)
        .gte('created_at', startOfDay(dateRange.from).toISOString())
        .lte('created_at', endOfDay(dateRange.to || dateRange.from).toISOString())
        .order('created_at', { ascending: false });

      const { data: osData, error: osError } = await osQuery;

      if (osError) throw osError;

      if (!osData || osData.length === 0) {
        setData([]);
        setLoading(false);
        return;
      }

      const osIds = osData.map(os => os.id);

      // Fetch Work Order Items (Services only)
      const { data: itemsData, error: itemsError } = await supabase
        .from('work_order_items')
        .select(`
          id,
          work_order_id,
          item_type,
          description,
          total_price,
          collaborator_id,
          collaborators(name)
        `)
        .in('work_order_id', osIds)
        .eq('item_type', 'service'); // Only labor/services count for productivity

      if (itemsError) throw itemsError;

      // Process and Merge Data
      const processedData = osData.map(os => {
        const osItems = itemsData.filter(item => item.work_order_id === os.id);

        return {
          ...os,
          items: osItems,
          totalServiceValue: osItems.reduce((sum, item) => sum + (Number(item.total_price) || 0), 0)
        };
      });

      setData(processedData);

    } catch (error) {
      console.error('Error fetching report data:', error);
      toast({
        variant: "destructive",
        title: "Erro ao gerar relatório",
        description: error.message
      });
    } finally {
      setLoading(false);
    }
  };

  // Trigger fetch when date range changes
  useEffect(() => {
    if (dateRange?.from) {
      fetchData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateRange]);

  // 3. Client-side Filtering (Dynamic Table Updates)
  const filteredData = useMemo(() => {
    const flattenedData = [];

    data.forEach(os => {
      os.items.forEach(item => {
        const matchesMechanic = selectedMechanic === "all" || item.collaborator_id === selectedMechanic;
        const matchesServiceType = serviceTypeFilter === "" || 
          (item.description && item.description.toLowerCase().includes(serviceTypeFilter.toLowerCase()));
        
        if (matchesMechanic && matchesServiceType) {
          flattenedData.push({
            os_id: os.id,
            os_number: os.os_number,
            created_at: os.created_at,
            status: os.status,
            customer_name: os.customer?.name,
            vehicle_plate: os.vehicle?.plate,
            vehicle_brand: os.vehicle?.brand,
            vehicle_model: os.vehicle?.model,
            collaborator_id: item.collaborator_id,
            collaborator_name: item.collaborators?.name || 'Não atribuído',
            service_description: item.description,
            service_value: Number(item.total_price) || 0,
          });
        }
      });
    });

    return flattenedData;

  }, [data, selectedMechanic, serviceTypeFilter]);

  // 4. Process Data for Charts
  const chartData = useMemo(() => {
    const groupedData = filteredData.reduce((acc, item) => {
      const mechanicName = item.collaborator_name || 'Desconhecido';
      
      if (!acc[mechanicName]) {
        acc[mechanicName] = {
          name: mechanicName,
          totalValue: 0,
          serviceCount: 0
        };
      }
      
      acc[mechanicName].totalValue += item.service_value;
      acc[mechanicName].serviceCount += 1;
      
      return acc;
    }, {});

    return Object.values(groupedData).sort((a, b) => b.totalValue - a.totalValue);
  }, [filteredData]);

  // Colors for the chart bars
  const COLORS = ['#0ea5e9', '#22c55e', '#eab308', '#f97316', '#ef4444', '#8b5cf6', '#ec4899', '#6366f1'];

  // Calculate Grand Total for services in the filtered view
  const totalServices = filteredData.reduce((sum, item) => sum + item.service_value, 0);

  // Helper to convert hex to rgb for jsPDF
  const hexToRgb = (hex) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 0, g: 0, b: 0 };
  }

  // PDF Creation Logic
  const createReportPDF = () => {
    const doc = new jsPDF();
    const mechanicName = selectedMechanic === "all" 
      ? "Todos" 
      : mechanics.find(m => m.id === selectedMechanic)?.name || "Selecionado";

    doc.setFontSize(16);
    doc.text("Relatório de Produtividade dos Colaboradores", 14, 20);
    
    doc.setFontSize(10);
    doc.text(`Período: ${format(dateRange.from, "dd/MM/yyyy")} a ${format(dateRange.to || dateRange.from, "dd/MM/yyyy")}`, 14, 28);
    doc.text(`Colaborador: ${mechanicName}`, 14, 33);
    doc.text(`Gerado em: ${format(new Date(), "dd/MM/yyyy HH:mm")}`, 14, 38);

    // DYNAMIC CONTENT BASED ON ACTIVE TAB
    if (activeTab === 'listing') {
      doc.text("Visualização: Listagem Detalhada", 14, 43);
      const tableColumn = ["OS", "Data", "Veículo - Placa", "Colaborador", "Tipo de Serviço", "Valor Serviço"];
      const tableRows = filteredData.map(item => [
        item.os_number,
        format(parseISO(item.created_at), "dd/MM/yyyy"),
        `${item.vehicle_brand || ''} ${item.vehicle_model || ''} - ${item.vehicle_plate || 'N/A'}`,
        item.collaborator_name,
        item.service_description,
        item.service_value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })
      ]);

      autoTable(doc, {
        startY: 45,
        head: [tableColumn],
        body: tableRows,
        theme: 'striped',
        headStyles: { fillColor: [41, 128, 185] },
        foot: [['', '', '', '', 'TOTAL', totalServices.toLocaleString('pt-BR', { minimumFractionDigits: 2 })]],
        footStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold' }
      });
    } else {
      // CHART SUMMARY VIEW - DRAW CHARTS MANUALLY
      doc.text("Visualização: Gráficos de Desempenho", 14, 43);
      
      let currentY = 55;
      const chartHeight = 60;
      const chartWidth = 170; // 14 left margin
      const startX = 14;
      const maxBarWidth = 25; 

      // --- CHART 1: FATURAMENTO ---
      doc.setFontSize(12);
      doc.setFont(undefined, 'bold');
      doc.text("Faturamento Total por Colaborador", 14, currentY - 5);
      doc.setFont(undefined, 'normal');
      
      doc.setDrawColor(200, 200, 200);
      doc.line(startX, currentY + chartHeight, startX + chartWidth, currentY + chartHeight); // X Axis

      if (chartData.length > 0) {
        const maxRevenue = Math.max(...chartData.map(d => d.totalValue)) || 1;
        const calculatedBarWidth = (chartWidth / chartData.length) - 10; 
        const barWidth = Math.min(calculatedBarWidth, maxBarWidth);
        const spacing = (chartWidth - (barWidth * chartData.length)) / (chartData.length + 1);

        chartData.forEach((item, index) => {
            const barHeight = (item.totalValue / maxRevenue) * (chartHeight - 10); 
            const x = startX + spacing + (index * (barWidth + spacing));
            const y = currentY + chartHeight - barHeight;

            const colorHex = COLORS[index % COLORS.length];
            const rgb = hexToRgb(colorHex);
            doc.setFillColor(rgb.r, rgb.g, rgb.b);
            
            doc.rect(x, y, barWidth, barHeight, 'F');

            doc.setFontSize(8);
            doc.setTextColor(50, 50, 50);
            const valueText = item.totalValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0, maximumFractionDigits: 0 });
            doc.text(valueText, x + barWidth/2, y - 2, { align: 'center' });

            const nameParts = item.name.split(' ');
            const shortName = nameParts[0] + (nameParts.length > 1 ? ` ${nameParts[nameParts.length-1].charAt(0)}.` : '');
            doc.text(shortName, x + barWidth/2, currentY + chartHeight + 5, { align: 'center' });
        });
      } else {
          doc.text("Sem dados para exibir.", startX, currentY + 30);
      }

      currentY += chartHeight + 35; 

      // --- CHART 2: QUANTIDADE DE SERVIÇOS ---
      doc.setFontSize(12);
      doc.setTextColor(0, 0, 0); 
      doc.setFont(undefined, 'bold');
      doc.text("Quantidade de Serviços por Colaborador", 14, currentY - 5);
      doc.setFont(undefined, 'normal');

      doc.setDrawColor(200, 200, 200);
      doc.line(startX, currentY + chartHeight, startX + chartWidth, currentY + chartHeight);

      if (chartData.length > 0) {
        const maxCount = Math.max(...chartData.map(d => d.serviceCount)) || 1;
        const calculatedBarWidth = (chartWidth / chartData.length) - 10;
        const barWidth = Math.min(calculatedBarWidth, maxBarWidth);
        const spacing = (chartWidth - (barWidth * chartData.length)) / (chartData.length + 1);

        chartData.forEach((item, index) => {
            const barHeight = (item.serviceCount / maxCount) * (chartHeight - 10);
            const x = startX + spacing + (index * (barWidth + spacing));
            const y = currentY + chartHeight - barHeight;

            const colorHex = COLORS[(index + 2) % COLORS.length];
            const rgb = hexToRgb(colorHex);
            doc.setFillColor(rgb.r, rgb.g, rgb.b);

            doc.rect(x, y, barWidth, barHeight, 'F');

            doc.setFontSize(8);
            doc.setTextColor(50, 50, 50);
            doc.text(item.serviceCount.toString(), x + barWidth/2, y - 2, { align: 'center' });

            const nameParts = item.name.split(' ');
            const shortName = nameParts[0] + (nameParts.length > 1 ? ` ${nameParts[nameParts.length-1].charAt(0)}.` : '');
            doc.text(shortName, x + barWidth/2, currentY + chartHeight + 5, { align: 'center' });
        });
      } else {
         doc.text("Sem dados para exibir.", startX, currentY + 30);
      }
      
      currentY += chartHeight + 20;
      const totalCount = chartData.reduce((acc, item) => acc + item.serviceCount, 0);
      
      doc.setDrawColor(0); 
      doc.setFillColor(245, 245, 245); 
      doc.rect(startX, currentY, chartWidth, 20, 'FD'); 
      
      doc.setFontSize(10);
      doc.setTextColor(0);
      doc.text(`Resumo Geral:`, startX + 5, currentY + 8);
      doc.setFont(undefined, 'bold');
      doc.text(`Total de Serviços: ${totalCount}`, startX + 5, currentY + 15);
      doc.text(`Faturamento Total: ${totalServices.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`, startX + 60, currentY + 15);
    }

    return doc;
  };

  // Actions for Modal
  const handleOpenPreview = () => {
      setIsExportModalOpen(true);
      // Generate PDF
      setTimeout(() => {
        const doc = createReportPDF();
        setPdfDoc(doc);
        setPdfUrl(doc.output('bloburl'));
      }, 100);
  };

  const handlePrint = () => {
    if (pdfDoc) {
        pdfDoc.autoPrint();
        window.open(pdfDoc.output('bloburl'), '_blank');
    }
  };

  const handleSave = () => {
    if (pdfDoc) {
        pdfDoc.save(`relatorio_produtividade_${activeTab}.pdf`);
        toast({
            title: "PDF Salvo",
            description: `Relatório (${activeTab === 'listing' ? 'Listagem' : 'Resumo Gráfico'}) baixado com sucesso.`
        });
    }
  };

  const handleWhatsApp = () => {
      const mechanicName = selectedMechanic === "all" 
      ? "Todos" 
      : mechanics.find(m => m.id === selectedMechanic)?.name || "Selecionado";
      
      const fromDate = format(dateRange.from, "dd/MM/yyyy");
      const toDate = format(dateRange.to || dateRange.from, "dd/MM/yyyy");

      let message = `*Relatório de Produtividade - Horizontes*\n`;
      message += `📅 Período: ${fromDate} a ${toDate}\n`;
      message += `👤 Colaborador: ${mechanicName}\n`;
      message += `📑 Visualização: ${activeTab === 'listing' ? 'Listagem Detalhada' : 'Resumo Gerencial'}\n\n`;
      
      message += `*Resumo Geral:*\n`;
      message += `🔢 Total de Serviços: ${filteredData.length}\n`;
      message += `💰 Valor Total: ${totalServices.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}\n\n`;
      
      if (chartData.length > 0) {
        message += `*Top Colaboradores:*\n`;
        chartData.forEach((item, index) => {
           message += `${index + 1}. ${item.name}: ${item.totalValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} (${item.serviceCount} svcs)\n`;
        });
      }

      const url = `https://wa.me/?text=${encodeURIComponent(message)}`;
      window.open(url, '_blank');
      setIsExportModalOpen(false);
  };

  const handleExportCSV = () => {
    let headers, rows, filename;

    if (activeTab === 'listing') {
      headers = ["OS Numero", "Data da OS", "Veiculo Modelo", "Veiculo Placa", "Nome do Cliente", "Colaborador", "Tipo de Serviço", "Valor Servico"];
      rows = filteredData.map(item => [
        item.os_number,
        format(parseISO(item.created_at), "dd/MM/yyyy"),
        item.vehicle_model || '',
        item.vehicle_plate || '',
        item.customer_name || '',
        item.collaborator_name,
        item.service_description,
        item.service_value.toFixed(2)
      ]);
      filename = "relatorio_produtividade_detalhado.csv";
    } else {
      headers = ["Colaborador", "Qtd Servicos", "Faturamento Total"];
      rows = chartData.map(item => [
        item.name,
        item.serviceCount,
        item.totalValue.toFixed(2)
      ]);
      filename = "relatorio_produtividade_resumo.csv";
    }

    const csvContent = "\uFEFF" + headers.join(",") + "\n" + rows.map(e => e.join(",")).join("\n");
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const downloadLink = document.createElement("a");
    downloadLink.href = url;
    downloadLink.download = filename;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
  };

  // Clean up preview URL
  useEffect(() => {
    return () => {
        if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    };
  }, [pdfUrl]);

  return (
    <>
      <Helmet>
        <title>Produtividade dos Colaboradores - Relatórios</title>
        <meta name="description" content="Análise detalhada de serviços realizados e valores gerados por colaborador e OS." />
      </Helmet>

      <div className="space-y-6 animate-in fade-in duration-500">
        {/* Header & Actions */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-gray-900">Produtividade dos Colaboradores</h2>
            <p className="text-muted-foreground">
              Análise detalhada de serviços realizados e valores gerados por colaborador.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleExportCSV} disabled={loading || filteredData.length === 0}>
              <FileSpreadsheet className="mr-2 h-4 w-4" />
              CSV
            </Button>

            <Dialog open={isExportModalOpen} onOpenChange={setIsExportModalOpen}>
              <DialogTrigger asChild>
                <Button onClick={handleOpenPreview} disabled={loading || filteredData.length === 0}>
                  <Share2 className="mr-2 h-4 w-4" />
                  Exportar / Imprimir
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl h-[90vh] flex flex-col">
                <DialogHeader className="flex-shrink-0 flex flex-row items-center justify-between pb-4 border-b">
                  <DialogTitle>Visualizar Impressão</DialogTitle>
                  <div className="flex items-center gap-2">
                     <Button onClick={handleWhatsApp} variant="outline" size="sm" className="text-green-600 hover:text-green-700 border-green-200 hover:bg-green-50">
                        <MessageCircle className="w-4 h-4 mr-2" /> WhatsApp
                     </Button>
                     <Button onClick={handleSave} variant="outline" size="sm" disabled={!pdfUrl}>
                        <Download className="w-4 h-4 mr-2" /> Baixar PDF
                     </Button>
                     <Button onClick={handlePrint} size="sm" disabled={!pdfUrl}>
                        <Printer className="w-4 h-4 mr-2" /> Imprimir
                     </Button>
                  </div>
                </DialogHeader>
                
                <div className="flex-1 bg-gray-100 rounded-md overflow-hidden border mt-4 relative">
                   {!pdfUrl ? (
                       <div className="flex items-center justify-center h-full flex-col gap-2">
                           <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                           <p className="text-sm text-gray-500">Gerando pré-visualização...</p>
                       </div>
                   ) : (
                       <iframe src={pdfUrl} className="w-full h-full" title="PDF Preview" />
                   )}
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Filters Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Filtros de Relatório
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Date Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Período da OS</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !dateRange && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateRange?.from ? (
                        dateRange.to ? (
                          <>
                            {format(dateRange.from, "dd/MM/y", { locale: ptBR })} -{" "}
                            {format(dateRange.to, "dd/MM/y", { locale: ptBR })}
                          </>
                        ) : (
                          format(dateRange.from, "dd/MM/y", { locale: ptBR })
                        )
                      ) : (
                        <span>Selecione o período</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      initialFocus
                      mode="range"
                      defaultMonth={dateRange?.from}
                      selected={dateRange}
                      onSelect={setDateRange}
                      numberOfMonths={2}
                      locale={ptBR}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Mechanic Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Colaborador</label>
                <Select value={selectedMechanic} onValueChange={setSelectedMechanic}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {mechanics.map((m) => (
                      <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Service Type Filter (Text) */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Tipo de Serviço</label>
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Ex: Freio, Suspensão..."
                    value={serviceTypeFilter}
                    onChange={(e) => setServiceTypeFilter(e.target.value)}
                    className="pl-8"
                  />
                </div>
              </div>
            </div>
            
            <div className="mt-4 flex justify-end">
               <Button variant="ghost" onClick={fetchData} disabled={loading}>
                  <RefreshCcw className={cn("mr-2 h-4 w-4", loading && "animate-spin")} />
                  Atualizar Dados
               </Button>
            </div>
          </CardContent>
        </Card>

        {/* Tabs for List and Charts */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="flex items-center justify-between mb-4">
            <TabsList className="bg-white border">
              <TabsTrigger value="listing" className="flex items-center gap-2">
                <ListIcon className="h-4 w-4" />
                Listagem
              </TabsTrigger>
              <TabsTrigger value="charts" className="flex items-center gap-2">
                <PieChartIcon className="h-4 w-4" />
                Gráficos
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="listing" className="mt-0">
            {/* Results Table */}
            <div className="rounded-md border bg-white shadow-sm overflow-hidden">
              <Table>
                <TableHeader className="bg-gray-50">
                  <TableRow>
                    <TableHead className="w-[100px]">Nº OS</TableHead>
                    <TableHead>Data da OS</TableHead>
                    <TableHead>Veículo - Placa</TableHead>
                    <TableHead>Colaborador</TableHead>
                    <TableHead>Tipo de Serviço</TableHead>
                    <TableHead className="text-right">Valor do Serviço</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center">
                        <div className="flex justify-center items-center gap-2 text-muted-foreground">
                          <Loader2 className="h-5 w-5 animate-spin" />
                          Carregando dados...
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : filteredData.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-32 text-center">
                        <div className="flex flex-col items-center justify-center text-muted-foreground gap-2">
                          <AlertCircle className="h-8 w-8 opacity-50" />
                          <p>Nenhum registro encontrado para os filtros selecionados.</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredData.map((item, index) => (
                      <TableRow key={`${item.os_id}-${item.collaborator_id}-${item.service_description}-${index}`} className="hover:bg-gray-50/50 transition-colors">
                        <TableCell className="font-medium">
                          <Badge variant="outline" className="font-mono">{item.os_number}</Badge>
                        </TableCell>
                        <TableCell>
                          {format(parseISO(item.created_at), "dd/MM/yyyy")}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium text-gray-900">{item.vehicle_plate || 'N/A'}</span>
                            <span className="text-xs text-gray-500">{item.vehicle_brand} {item.vehicle_model}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-gray-700">{item.collaborator_name}</TableCell>
                        <TableCell className="text-gray-700">{item.service_description}</TableCell>
                        <TableCell className="text-right font-semibold text-gray-900">
                          {item.service_value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
                <TableFooter className="bg-slate-100/80 border-t">
                  <TableRow>
                    <TableCell colSpan={5} className="text-right font-bold text-gray-800 text-base">TOTAL GERAL</TableCell>
                    <TableCell className="text-right font-bold text-emerald-600 text-lg">
                      {totalServices.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="charts" className="mt-0">
            {/* Charts Section */}
            {loading ? (
              <div className="h-64 w-full flex items-center justify-center border rounded-md bg-white">
                <div className="flex items-center gap-2 text-muted-foreground">
                   <Loader2 className="h-5 w-5 animate-spin" />
                   Carregando gráficos...
                </div>
              </div>
            ) : filteredData.length === 0 ? (
              <div className="h-64 w-full flex flex-col items-center justify-center border rounded-md bg-white gap-2 text-muted-foreground">
                 <AlertCircle className="h-8 w-8 opacity-50" />
                 <p>Não há dados para exibir nos gráficos com os filtros atuais.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base font-medium flex items-center gap-2">
                      <BarChartIcon className="h-4 w-4" />
                      Faturamento por Colaborador
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[300px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                          <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                          <XAxis 
                            dataKey="name" 
                            tick={{ fontSize: 12 }} 
                            angle={-45} 
                            textAnchor="end"
                            interval={0}
                          />
                          <YAxis />
                          <Tooltip 
                            formatter={(value) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            labelStyle={{ color: '#111827', fontWeight: 'bold' }}
                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                          />
                          <Bar dataKey="totalValue" name="Valor Total" radius={[4, 4, 0, 0]}>
                            {chartData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base font-medium flex items-center gap-2">
                      <BarChartIcon className="h-4 w-4" />
                      Quantidade de Serviços por Colaborador
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[300px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                          <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                          <XAxis 
                            dataKey="name" 
                            tick={{ fontSize: 12 }}
                            angle={-45} 
                            textAnchor="end"
                            interval={0}
                          />
                          <YAxis allowDecimals={false} />
                          <Tooltip 
                            labelStyle={{ color: '#111827', fontWeight: 'bold' }}
                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                          />
                          <Bar dataKey="serviceCount" name="Qtd. Serviços" radius={[4, 4, 0, 0]}>
                            {chartData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[(index + 2) % COLORS.length]} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
};

export default RelatorioProdutividadeColaboradores;