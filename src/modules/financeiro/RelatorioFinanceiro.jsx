import React, { useState, useEffect, useMemo } from 'react';
import { Helmet } from 'react-helmet';
import { supabase } from '@/lib/customSupabaseClient';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
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
    Cell,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// Sub-components
import FiltrosRelatorio from './components/FiltrosRelatorio';
import TabelaRelatorio from './components/TabelaRelatorio';
import { createFinancialPDF, exportFinancialCSV } from './utils/exportUtils';

const RelatorioFinanceiro = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState([]);
  const [categories, setCategories] = useState([]);
  
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
    type: "all",
    category: "all",
    subcategory: "all", // Added subcategory filter
    paymentMethod: "all",
    status: "all",
    responsible: "",
    search: ""
  });

  // 1. Fetch Categories
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const { data: cats, error } = await supabase.from('financial_categories').select('*').order('name');
        if (error) throw error;
        setCategories(cats || []);
      } catch (error) {
        console.error("Error fetching categories:", error);
      }
    };
    fetchCategories();
  }, []);

  // 2. Main Data Fetching
  const fetchData = async () => {
    setLoading(true);
    try {
      // FIXED: Removed created_at (does not exist in table)
      // FIXED: Use transaction_date as primary date
      let query = supabase
        .from('transactions')
        .select(`
          id,
          transaction_date,
          description,
          amount,
          type,
          payment_method,
          status,
          notes,
          category:financial_categories(name, id),
          subcategory:financial_subcategories(name),
          work_order:service_orders(
            customer:customers(name),
            os_number
          )
        `)
        .gte('transaction_date', startOfDay(filters.dateRange.from).toISOString())
        .lte('transaction_date', endOfDay(filters.dateRange.to || filters.dateRange.from).toISOString())
        .order('transaction_date', { ascending: false });

      const { data: rawData, error } = await query;

      if (error) throw error;

      // Process Data
      const processedData = (rawData || []).map(item => {
        const categoryName = item.category?.name || 'Sem Categoria';
        const subcategoryName = item.subcategory?.name || 'Sem Subcategoria';
        
        // Determine Responsible
        let responsible = '-';
        if (item.work_order?.customer?.name) {
            responsible = item.work_order.customer.name;
        } else {
            responsible = '-'; 
        }

        const isIncome = item.type === 'income';

        let descriptionDisplay = item.description || '';
        // Enhance description for OS-related income
        if (isIncome && item.work_order?.os_number) {
          // Attempt to clean description like "Pagamento referente à OS #1234 (Dinheiro)" to "Pagamento OS 1234"
          // Or "os1234" to "OS 1234"
          const osMatch = descriptionDisplay.match(/OS #?(\d+)/i);
          if (osMatch && osMatch[1]) {
            descriptionDisplay = `Receita OS ${osMatch[1]}`;
          } else if (descriptionDisplay.startsWith('os') && !isNaN(descriptionDisplay.substring(2))) {
            // Case for 'os1234'
            descriptionDisplay = `Receita OS ${descriptionDisplay.substring(2)}`;
          } else if (descriptionDisplay.includes('Pagamento referente à OS #')) {
            // General capture for 'Pagamento referente à OS #XXXX'
            descriptionDisplay = `Receita OS ${item.work_order.os_number}`;
          } else if (descriptionDisplay.includes('os') && item.work_order.os_number.toString() === descriptionDisplay.replace('os', '')) {
            descriptionDisplay = `Receita OS ${item.work_order.os_number}`;
          }
        }


        return {
          id: String(item.id), // FIXED: Safely convert bigint/number to string
          date: item.transaction_date, // FIXED: Use transaction_date directly
          description: descriptionDisplay, // Use cleaned description
          typeRaw: item.type,
          typeLabel: isIncome ? 'Receita' : 'Despesa',
          category: categoryName,
          subcategory: subcategoryName, // Added subcategory to processed data
          paymentMethod: item.payment_method,
          status: item.status,
          statusLabel: item.status === 'paid' ? 'Pago' : 'Pendente',
          responsible: responsible,
          amount: Number(item.amount),
          notes: item.notes
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
    if (filters.dateRange?.from) {
      fetchData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.dateRange]);

  // 3. Client-side Filtering
  const filteredData = useMemo(() => {
    return data.filter(item => {
      const matchesType = filters.type === "all" || item.typeRaw === filters.type;
      const matchesCategory = filters.category === "all" || item.category === filters.category;
      const matchesSubcategory = filters.subcategory === "all" || item.subcategory === filters.subcategory; // Filter by subcategory
      const matchesPayment = filters.paymentMethod === "all" || item.paymentMethod === filters.paymentMethod;
      const matchesStatus = filters.status === "all" || 
                            (filters.status === 'paid' && item.status === 'paid') ||
                            (filters.status === 'pending' && item.status === 'pending') ||
                            (filters.status === 'overdue' && item.status === 'pending');

      const matchesResponsible = filters.responsible === "" || 
                                 item.responsible.toLowerCase().includes(filters.responsible.toLowerCase());
      
      const matchesSearch = filters.search === "" || 
                            item.description.toLowerCase().includes(filters.search.toLowerCase()) ||
                            (item.notes && item.notes.toLowerCase().includes(filters.search.toLowerCase()));

      return matchesType && matchesCategory && matchesSubcategory && matchesPayment && matchesStatus && matchesResponsible && matchesSearch;
    });
  }, [data, filters]);

  const TOTAL_VALUE = useMemo(() => {
    return filteredData.reduce((acc, item) => {
      if (item.typeRaw === 'income') return acc + item.amount;
      if (item.typeRaw === 'expense') return acc - item.amount;
      return acc;
    }, 0);
  }, [filteredData]);

  // 4. Chart Data
  const chartDataByType = useMemo(() => {
      const stats = {
          Receita: { name: 'Receita', value: 0 },
          Despesa: { name: 'Despesa', value: 0 }
      };
      
      filteredData.forEach(item => {
          const type = item.typeLabel; // 'Receita' or 'Despesa'
          if (stats[type]) {
              stats[type].value += item.amount;
          }
      });
      return Object.values(stats);
  }, [filteredData]);

  const chartDataByCategory = useMemo(() => {
      const grouped = filteredData.reduce((acc, item) => {
          if (!acc[item.category]) {
              acc[item.category] = { name: item.category, value: 0 };
          }
          acc[item.category].value += item.amount;
          return acc;
      }, {});
      return Object.values(grouped).sort((a, b) => b.value - a.value).slice(0, 10);
  }, [filteredData]);

  // Actions
  const handleOpenPreview = () => {
      setIsExportModalOpen(true);
      setTimeout(() => {
        const doc = createFinancialPDF(filteredData, filters, TOTAL_VALUE);
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
        pdfDoc.save(`relatorio_financeiro.pdf`);
        toast({ title: "PDF Salvo", description: "Relatório baixado com sucesso." });
    }
  };

  const handleWhatsApp = () => {
      const fromDate = format(filters.dateRange.from, "dd/MM/yyyy");
      const toDate = format(filters.dateRange.to || filters.dateRange.from, "dd/MM/yyyy");
      
      let message = `*Relatório Financeiro - Horizontes*\n`;
      message += `📅 Período: ${fromDate} a ${toDate}\n`;
      message += `💰 Saldo/Total Filtrado: ${TOTAL_VALUE.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}\n`;
      
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
        <title>Relatório Financeiro - Controle</title>
        <meta name="description" content="Relatório detalhado de movimentações financeiras." />
      </Helmet>

      <div className="space-y-6 animate-in fade-in duration-500">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-gray-900">Relatório Financeiro</h2>
            <p className="text-muted-foreground">
              Análise de receitas, despesas e fluxo de caixa.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => exportFinancialCSV(filteredData)} disabled={loading || filteredData.length === 0}>
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
            categories={categories} 
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
                      Receita vs Despesa
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
                          <Bar dataKey="value" name="Valor" radius={[4, 4, 0, 0]}>
                            {chartDataByType.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.name === 'Receita' ? '#22c55e' : '#ef4444'} />
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
                      <PieChartIcon className="h-4 w-4" />
                      Top Categorias (Volume R$)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[300px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartDataByCategory} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
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
                            formatter={(value) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                          />
                          <Bar dataKey="value" name="Valor" fill="#3b82f6" radius={[0, 4, 4, 0]} />
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

export default RelatorioFinanceiro;