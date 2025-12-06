import React, { useState, useEffect, useMemo } from 'react';
import { Helmet } from 'react-helmet';
import { supabase } from '@/lib/customSupabaseClient';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import {
  Printer,
  FileSpreadsheet,
  Share2,
  Download,
  MessageCircle,
  PieChart as PieChartIcon,
  List as ListIcon,
  Loader2,
  BarChart as BarChartIcon,
  AlertCircle
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
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
    LabelList
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// Sub-components
import FiltrosRelatorio from './components/FiltrosRelatorio';
import TabelaRelatorio from './components/TabelaRelatorio';
import { createServicesPDF, exportServicesCSV } from './utils/exportUtils';

const RelatorioOS = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState([]); // Raw items data
  const [categories, setCategories] = useState([]); 
  const [subcategories, setSubcategories] = useState([]); 
  
  // PDF Preview States
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [pdfUrl, setPdfUrl] = useState(null);
  const [pdfDoc, setPdfDoc] = useState(null);
  
  const [activeTab, setActiveTab] = useState("listing");

  // Filter State
  const [filters, setFilters] = useState({
    dateRange: {
      from: subDays(new Date(), 30),
      to: new Date(),
    },
    type: "all", // Changed from category to type
    search: "",
  });

  // 1. Fetch Categories and Subcategories (Required for table display mapping)
  useEffect(() => {
    const fetchDropdownData = async () => {
      try {
        const { data: cats, error: catsError } = await supabase
            .from('categorias')
            .select('id, nome')
            .order('nome');
        if (catsError) throw catsError;
        setCategories(cats || []);

        const { data: subcats, error: subcatsError } = await supabase
            .from('subcategorias')
            .select('id, nome, id_categoria')
            .order('nome');
        if (subcatsError) throw subcatsError;
        setSubcategories(subcats || []);

      } catch (error) {
        console.error("Error fetching dropdown data:", error);
      }
    };
    fetchDropdownData();
  }, []);

  // 2. Main Data Fetching
  const fetchData = async () => {
    setLoading(true);
    try {
      const selectString = `
        id,
        item_type,
        description,
        quantity,
        cost_price,
        total_price,
        collaborator_id,
        collaborator:collaborators(name),
        servico_id,
        servico:servicos(id, nome, id_categoria, id_subcategoria),
        work_order_id,
        work_order:work_orders!inner(
            id,
            created_at,
            status
        )
      `;

      let query = supabase
        .from('work_order_items')
        .select(selectString)
        .gte('work_order.created_at', startOfDay(filters.dateRange.from).toISOString())
        .lte('work_order.created_at', endOfDay(filters.dateRange.to || filters.dateRange.from).toISOString())
        .order('work_order(created_at)', { ascending: false })
        .limit(5000); 

      // Apply Filters
      if (filters.type && filters.type !== 'all') {
        query = query.eq('item_type', filters.type);
      }
      
      const { data: rawItems, error } = await query;

      if (error) throw error;

      // Secondary Fetch: Get OS Numbers
      const osIds = [...new Set(rawItems.map(item => item.work_order?.id).filter(Boolean))];
      let osMap = {};
      
      if (osIds.length > 0) {
        const { data: osData, error: osError } = await supabase
          .from('service_orders')
          .select('id, os_number, status')
          .in('id', osIds);
          
        if (!osError && osData) {
          osData.forEach(os => {
            osMap[os.id] = os;
          });
        }
      }

      const processedData = (rawItems || []).map(item => {
          const wo = item.work_order;
          const osInfo = osMap[wo.id];
          
          const osStatus = osInfo?.status || wo.status || 'Desconhecido';
          const osNumber = osInfo?.os_number || 'N/A';
          const osId = wo.id;

          let statusLabel = osStatus;
          if (osStatus === 'completed') statusLabel = 'Finalizada';
          if (osStatus === 'Aberta') statusLabel = 'Aberta';
          if (osStatus === 'Cancelada') statusLabel = 'Cancelada';
          if (osStatus === 'Em Andamento') statusLabel = 'Em Execução';

          let categoryName = 'Não Categorizado';
          let subcategoryName = '---';
          
          if (item.servico) {
            categoryName = categories.find(cat => cat.id === item.servico.id_categoria)?.nome || 'Não Categorizado';
            subcategoryName = subcategories.find(sub => sub.id === item.servico.id_subcategoria)?.nome || '---';
          } else if (item.item_type === 'product') {
              categoryName = 'Peças';
          } else if (item.item_type === 'external_service') {
              categoryName = 'Externo';
          }

          // Format item label based on type
          let typeLabel = 'Item';
          if (item.item_type === 'product') typeLabel = 'Peça';
          else if (item.item_type === 'service') typeLabel = 'Serviço';
          else if (item.item_type === 'external_service') typeLabel = 'Serviço Externo';

          // Financial Calculations
          const quantity = Number(item.quantity) || 1;
          const unitCost = Number(item.cost_price) || 0;
          const totalCost = unitCost * quantity;
          const amount = Number(item.total_price) || 0;
          const profit = amount - totalCost;
          const margin = amount > 0 ? (profit / amount) * 100 : 0;

          return {
            id: String(item.id),
            itemType: item.item_type,
            typeLabel: typeLabel,
            osId: osId,
            osNumber: osNumber,
            date: wo.created_at,
            description: item.description || '',
            category: categoryName, 
            subcategory: subcategoryName, 
            amount: amount,
            quantity: quantity,
            totalCost: totalCost,
            profit: profit,
            margin: margin,
            mechanic: item.collaborator?.name || 'Não atribuído',
            mechanicId: item.collaborator_id,
            osStatus: osStatus, 
            osStatusLabel: statusLabel, 
          };
        });

      setData(processedData);

    } catch (error) {
      console.error('Error fetching service report data:', error);
      toast({
        variant: "destructive",
        title: "Erro ao gerar relatório",
        description: error.message
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (filters.dateRange?.from) {
      fetchData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.dateRange, filters.type]);

  // Client-side filtering (Search)
  const filteredItems = useMemo(() => {
    return data.filter(item => {
        const matchesSearch = filters.search === "" || 
            item.description.toLowerCase().includes(filters.search.toLowerCase()) ||
            item.osNumber.toString().includes(filters.search);
            
        return matchesSearch;
    });
  }, [data, filters.search]); 

  const TOTAL_VALUE = useMemo(() => {
    return filteredItems.reduce((acc, item) => acc + item.amount, 0);
  }, [filteredItems]);

  const TOTAL_COST = useMemo(() => {
    return filteredItems.reduce((acc, item) => acc + item.totalCost, 0);
  }, [filteredItems]);

  const TOTAL_PROFIT = useMemo(() => {
    return filteredItems.reduce((acc, item) => acc + item.profit, 0);
  }, [filteredItems]);

  // Chart Data (Use filteredItems for granularity)
  const chartDataByType = useMemo(() => {
      const grouped = filteredItems.reduce((acc, item) => {
          const key = item.typeLabel;
          if (!acc[key]) acc[key] = { name: key, value: 0 };
          acc[key].value += item.amount;
          return acc;
      }, {});
      return Object.values(grouped).sort((a, b) => b.value - a.value);
  }, [filteredItems]);

  const chartDataByStatus = useMemo(() => {
       const grouped = filteredItems.reduce((acc, item) => {
          const key = item.osStatusLabel;
          if (!acc[key]) acc[key] = { name: key, value: 0 };
          acc[key].value += 1; // Count items, or could be grouped by OS if preferred for charts
          return acc;
      }, {});
      return Object.values(grouped);
  }, [filteredItems]);

  // Actions
  const handleOpenPreview = () => {
      setIsExportModalOpen(true);
      setTimeout(() => {
        // Export individual items now
        const doc = createServicesPDF(filteredItems, filters, {
           totalValue: TOTAL_VALUE,
           totalCost: TOTAL_COST,
           totalProfit: TOTAL_PROFIT
        });
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
        pdfDoc.save(`relatorio_os.pdf`);
        toast({ title: "PDF Salvo", description: "Relatório baixado com sucesso." });
    }
  };

  const handleWhatsApp = () => {
      const fromDate = format(filters.dateRange.from, "dd/MM/yyyy");
      const toDate = format(filters.dateRange.to || filters.dateRange.from, "dd/MM/yyyy");
      
      let message = `*Relatório de Ordens de Serviço - Horizontes*\n`;
      message += `📅 Período: ${fromDate} a ${toDate}\n`;
      message += `🛠️ Total Itens: ${filteredItems.length}\n`;
      message += `💰 Valor Total: ${TOTAL_VALUE.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}\n`;
      message += `📉 Custo Total: ${TOTAL_COST.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}\n`;
      message += `📈 Lucro Total: ${TOTAL_PROFIT.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}\n`;
      
      const url = `https://wa.me/?text=${encodeURIComponent(message)}`;
      window.open(url, '_blank');
      setIsExportModalOpen(false);
  };

  useEffect(() => {
    return () => { if (pdfUrl) URL.revokeObjectURL(pdfUrl); };
  }, [pdfUrl]);

  return (
    <>
      <Helmet>
        <title>Relatório de Ordens de Serviço - Controle</title>
        <meta name="description" content="Relatório detalhado de ordens de serviço." />
      </Helmet>

      <div className="space-y-6 animate-in fade-in duration-500">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-gray-900">Relatório de Ordens de Serviço</h2>
            <p className="text-muted-foreground">
              Análise operacional detalhada por item (Peças e Serviços).
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => exportServicesCSV(filteredItems)} disabled={loading || filteredItems.length === 0}>
              <FileSpreadsheet className="mr-2 h-4 w-4" />
              CSV
            </Button>

            <Dialog open={isExportModalOpen} onOpenChange={setIsExportModalOpen}>
              <DialogTrigger asChild>
                <Button onClick={handleOpenPreview} disabled={loading || filteredItems.length === 0}>
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

        {/* Filters */}
        <FiltrosRelatorio 
            filters={filters} 
            setFilters={setFilters} 
            loading={loading}
            onRefresh={fetchData}
        />

        {/* Tabs */}
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
            <TabelaRelatorio 
                data={filteredItems} 
                loading={loading} 
                totalValue={TOTAL_VALUE}
                totalCost={TOTAL_COST}
                totalProfit={TOTAL_PROFIT}
            />
          </TabsContent>

          <TabsContent value="charts" className="mt-0">
             {loading ? (
              <div className="h-64 w-full flex items-center justify-center border rounded-md bg-white">
                <div className="flex items-center gap-2 text-muted-foreground">
                   <Loader2 className="h-5 w-5 animate-spin" />
                   Carregando gráficos...
                </div>
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="h-64 w-full flex flex-col items-center justify-center border rounded-md bg-white gap-2 text-muted-foreground">
                 <AlertCircle className="h-8 w-8 opacity-50" />
                 <p>Não há dados para exibir nos gráficos.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                 <Card>
                  <CardHeader>
                    <CardTitle className="text-base font-medium flex items-center gap-2">
                      <BarChartIcon className="h-4 w-4" />
                      Valor por Tipo
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[300px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartDataByType} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                          <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                          <YAxis />
                          <Tooltip 
                             formatter={(value) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                             contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                          />
                          <Bar dataKey="value" name="Valor Total" fill="#3b82f6" radius={[4, 4, 0, 0]}>
                            <LabelList 
                                dataKey="value" 
                                position="top" 
                                formatter={(value) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                fill="#64748b"
                                fontSize={12}
                            />
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base font-medium flex items-center gap-2">
                      <PieChartIcon className="h-4 w-4" />
                      Volume por Status
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[300px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartDataByStatus} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" opacity={0.1} horizontal={true} vertical={false} />
                          <XAxis type="number" hide />
                          <YAxis 
                            dataKey="name" 
                            type="category"
                            width={100}
                            tick={{ fontSize: 11 }}
                            interval={0}
                          />
                          <Tooltip 
                            cursor={{fill: 'transparent'}}
                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                          />
                          <Bar dataKey="value" name="Quantidade" fill="#22c55e" radius={[0, 4, 4, 0]} barSize={20} />
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

export default RelatorioOS;