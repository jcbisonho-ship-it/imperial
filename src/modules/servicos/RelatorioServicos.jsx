import React, { useState, useEffect, useMemo } from 'react';
import { Helmet } from 'react-helmet';
import { supabase } from '@/lib/customSupabaseClient';
import { format, subDays, startOfDay, endOfDay, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
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
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// Sub-components
import FiltrosRelatorio from './components/FiltrosRelatorio';
import TabelaRelatorio from './components/TabelaRelatorio';
import { createServicesPDF, exportServicesCSV } from './utils/exportUtils';

const RelatorioServicos = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState([]);
  const [mechanics, setMechanics] = useState([]);
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
    category: "all", 
    subcategory: "all", 
    mechanic: "all",
    search: "", // Added search filter state
  });

  // 1. Fetch Mechanics, Categories, and Subcategories
  useEffect(() => {
    const fetchDropdownData = async () => {
      try {
        const { data: collaborators, error: collabsError } = await supabase
            .from('collaborators')
            .select('id, name')
            .order('name');
        if (collabsError) throw collabsError;
        setMechanics(collaborators || []);

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
      // Construct the select string
      const selectString = `
        id,
        item_type,
        description,
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
        .eq('item_type', 'service') // Only services
        .gte('work_order.created_at', startOfDay(filters.dateRange.from).toISOString())
        .lte('work_order.created_at', endOfDay(filters.dateRange.to || filters.dateRange.from).toISOString())
        .order('id', { ascending: false })
        .limit(5000); 

      // Apply Filters
      if (filters.mechanic && filters.mechanic !== 'all') {
        query = query.eq('collaborator_id', filters.mechanic);
      }

      if (filters.category && filters.category !== 'all') {
        query = query.eq('servico.id_categoria', filters.category);
      }

      if (filters.subcategory && filters.subcategory !== 'all') {
        query = query.eq('servico.id_subcategoria', filters.subcategory);
      }
      
      const { data: rawItems, error } = await query;

      if (error) throw error;

      // Secondary Fetch: Get OS Numbers from service_orders table manually
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

          // Determine Category Names
          let categoryName = 'Não Categorizado';
          let subcategoryName = '---';
          
          if (item.servico) {
            categoryName = categories.find(cat => cat.id === item.servico.id_categoria)?.nome || 'Não Categorizado';
            subcategoryName = subcategories.find(sub => sub.id === item.servico.id_subcategoria)?.nome || '---';
          }

          return {
            id: String(item.id),
            osId: osId,
            osNumber: osNumber,
            date: wo.created_at,
            description: item.description || '',
            category: categoryName, 
            subcategory: subcategoryName, 
            amount: Number(item.total_price),
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

  // Trigger fetch when filters change (except text search which is client-side)
  useEffect(() => {
    if (filters.dateRange?.from) {
      fetchData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    filters.dateRange, 
    filters.mechanic, 
    filters.category, 
    filters.subcategory,
  ]);

  // Client-side filtering including the new search
  const filteredData = useMemo(() => {
    return data.filter(item => {
        const matchesSearch = filters.search === "" || 
            item.description.toLowerCase().includes(filters.search.toLowerCase()) ||
            item.osNumber.toString().includes(filters.search);
            
        return matchesSearch;
    });
  }, [data, filters.search]); 

  const TOTAL_VALUE = useMemo(() => {
    return filteredData.reduce((acc, item) => acc + item.amount, 0);
  }, [filteredData]);

  // 4. Chart Data
  const chartDataByMechanic = useMemo(() => {
      const grouped = filteredData.reduce((acc, item) => {
          const key = item.mechanic;
          if (!acc[key]) acc[key] = { name: key, value: 0 };
          acc[key].value += item.amount;
          return acc;
      }, {});
      return Object.values(grouped).sort((a, b) => b.value - a.value);
  }, [filteredData]);

  const chartDataByStatus = useMemo(() => {
       const grouped = filteredData.reduce((acc, item) => {
          const key = item.osStatusLabel;
          if (!acc[key]) acc[key] = { name: key, value: 0 };
          acc[key].value += 1; // Count
          return acc;
      }, {});
      return Object.values(grouped);
  }, [filteredData]);

  // Actions
  const handleOpenPreview = () => {
      setIsExportModalOpen(true);
      setTimeout(() => {
        const doc = createServicesPDF(filteredData, filters, TOTAL_VALUE);
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
        pdfDoc.save(`relatorio_servicos.pdf`);
        toast({ title: "PDF Salvo", description: "Relatório baixado com sucesso." });
    }
  };

  const handleWhatsApp = () => {
      const fromDate = format(filters.dateRange.from, "dd/MM/yyyy");
      const toDate = format(filters.dateRange.to || filters.dateRange.from, "dd/MM/yyyy");
      
      let message = `*Relatório de Serviços - Horizontes*\n`;
      message += `📅 Período: ${fromDate} a ${toDate}\n`;
      message += `🛠️ Total Serviços: ${filteredData.length}\n`;
      message += `💰 Valor Total: ${TOTAL_VALUE.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}\n`;
      
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
        <title>Relatório de Serviços - Controle</title>
        <meta name="description" content="Relatório detalhado de serviços realizados." />
      </Helmet>

      <div className="space-y-6 animate-in fade-in duration-500">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-gray-900">Relatório de Serviços</h2>
            <p className="text-muted-foreground">
              Análise operacional de serviços, produtividade e valores.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => exportServicesCSV(filteredData)} disabled={loading || filteredData.length === 0}>
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

        {/* Filters */}
        <FiltrosRelatorio 
            filters={filters} 
            setFilters={setFilters} 
            mechanics={mechanics} 
            categories={categories}
            subcategories={subcategories}
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
                data={filteredData} 
                loading={loading} 
                totalValue={TOTAL_VALUE}
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
            ) : filteredData.length === 0 ? (
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
                      Valor por Mecânico
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[300px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartDataByMechanic} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                          <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                          <YAxis />
                          <Tooltip 
                             formatter={(value) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                             contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                          />
                          <Bar dataKey="value" name="Valor Total" fill="#3b82f6" radius={[4, 4, 0, 0]} />
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

export default RelatorioServicos;