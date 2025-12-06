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
import { Search, Calendar as CalendarIcon, Filter, Printer, FileSpreadsheet, RefreshCcw, Loader2, AlertCircle, BarChart as BarChartIcon, Share2, Download, MessageCircle, Package, Coins, Tags, TrendingUp, DollarSign, Layers, ChevronDown, ChevronDown as // Changed from ChevronLeft/Right to ChevronDown
  History } from 'lucide-react';
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu, // Imported DropdownMenu components
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LabelList
} from 'recharts';

const RelatorioControleEstoque = () => {
  const { toast } = useToast();
  
  // View Mode State: 'movements' (Listagem/Histórico) or 'position' (Posição Atual)
  const [viewMode, setViewMode] = useState('movements'); 

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState([]); // Movements Data
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [productMeta, setProductMeta] = useState([]); 
  
  // State for Current Stock Snapshot
  const [currentStock, setCurrentStock] = useState([]);
  const [stockLoading, setStockLoading] = useState(false);
  
  // PDF Preview States
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [pdfUrl, setPdfUrl] = useState(null);
  const [pdfDoc, setPdfDoc] = useState(null);
  
  // Filters
  const [dateRange, setDateRange] = useState({
    from: subDays(new Date(), 30),
    to: new Date(),
  });
  
  const [movementTypeFilter, setMovementTypeFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [subcategoryFilter, setSubcategoryFilter] = useState("all");
  const [searchFilter, setSearchFilter] = useState("");

  // Handler for changing view mode
  const handleViewModeChange = (newMode) => {
    setViewMode(newMode);
    if (newMode === 'movements') {
      fetchMovementsData();
    } else {
      fetchCurrentStock();
    }
  };

  // 1. Fetch Initial Filters (Categories/Subcategories)
  useEffect(() => {
    const fetchFilters = async () => {
      try {
        const { data: prodRes } = await supabase.from('products').select('category, subcategory');
        
        if (prodRes) {
            const rawProducts = prodRes;
            setProductMeta(rawProducts);

            const uniqueCats = [...new Set(rawProducts.map(i => i.category).filter(Boolean))].sort();
            setCategories(uniqueCats);
            
            const uniqueSubcats = [...new Set(rawProducts.map(i => i.subcategory).filter(Boolean))].sort();
            setSubcategories(uniqueSubcats);
        }
      } catch (error) {
        console.error('Error fetching filters:', error);
      }
    };

    fetchFilters();
    // Initial fetch based on default view
    if (viewMode === 'movements') {
        fetchMovementsData();
    } else {
        fetchCurrentStock();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch Current Stock Snapshot
  const fetchCurrentStock = async () => {
      setStockLoading(true);
      try {
          const { data, error } = await supabase
              .from('product_variants')
              .select(`
                  stock,
                  cost_price,
                  sale_price,
                  product:products (description, category, subcategory)
              `);
          
          if (error) throw error;
          setCurrentStock(data || []);
      } catch (err) {
          console.error(err);
          toast({ title: 'Erro ao buscar estoque atual', variant: 'destructive' });
      } finally {
          setStockLoading(false);
      }
  };

  // Update visible subcategories when category changes
  const availableSubcategories = useMemo(() => {
      if (categoryFilter === "all") return subcategories;
      
      // Filter subcategories that exist within the selected category
      const relevantSubcats = productMeta
          .filter(p => p.category === categoryFilter)
          .map(p => p.subcategory)
          .filter(Boolean);
          
      return [...new Set(relevantSubcats)].sort();
  }, [categoryFilter, subcategories, productMeta]);

  // Reset subcategory when category changes
  useEffect(() => {
      if (categoryFilter !== 'all' && subcategoryFilter !== 'all') {
          // Check if current subcategory is valid for new category
          const isValid = productMeta.some(p => p.category === categoryFilter && p.subcategory === subcategoryFilter);
          if (!isValid) {
              setSubcategoryFilter('all');
          }
      }
  }, [categoryFilter]);

  // 2. Main Data Fetching (Movements)
  const fetchMovementsData = async () => {
    setLoading(true);
    try {
      // STEP 1: Fetch Stock Movements first
      let query = supabase
        .from('stock_movements')
        .select(`
          id,
          created_at,
          movement_type,
          quantity_in,
          unit_cost_invoice,
          reason,
          responsible_person,
          invoice_number,
          supplier,
          product_variant:product_variants(
             id,
             cost_price,
             product:products(description, category, subcategory)
          ),
          service_order:service_orders(
             id,
             os_number,
             customer:customers(name)
          )
        `)
        .gte('created_at', startOfDay(dateRange.from).toISOString())
        .lte('created_at', endOfDay(dateRange.to || dateRange.from).toISOString())
        .order('created_at', { ascending: false });

      const { data: movementsData, error } = await query;
      if (error) throw error;

      // STEP 2: Extract Service Order IDs to fetch items manually
      const soIds = movementsData
        .map(m => m.service_order?.id)
        .filter(id => !!id);
      
      let woItemsMap = {}; // Map: "workOrderId_variantId" -> itemData

      if (soIds.length > 0) {
        const uniqueIds = [...new Set(soIds)];
        const { data: itemsData, error: itemsError } = await supabase
            .from('work_order_items')
            .select('work_order_id, product_variant_id, total_price, quantity, unit_price, cost_price')
            .in('work_order_id', uniqueIds);
        
        if (!itemsError && itemsData) {
            itemsData.forEach(item => {
                const key = `${item.work_order_id}_${item.product_variant_id}`;
                woItemsMap[key] = item;
            });
        }
      }

      // STEP 3: Process Data & Merge
      const processedData = (movementsData || []).map(item => {
        const productName = item.product_variant?.product?.description || 'Produto Desconhecido';
        const category = item.product_variant?.product?.category || 'Sem Categoria';
        const subcategory = item.product_variant?.product?.subcategory || '-';
        
        // Calculate Reference Number (OS or NF)
        let refNumber = '-';
        if (item.service_order) {
            refNumber = item.service_order.os_number;
        } else if (item.invoice_number) {
            refNumber = item.invoice_number;
        }

        // Calculate Client/Supplier Name
        let clientSupplier = '-';
        if (item.service_order?.customer?.name) {
            clientSupplier = item.service_order.customer.name;
        } else if (item.supplier) {
            clientSupplier = item.supplier;
        } else if (item.responsible_person) {
            clientSupplier = item.responsible_person; 
        }

        // Determine Base Value (Cost)
        const unitCost = item.unit_cost_invoice || item.product_variant?.cost_price || 0;
        const quantity = Number(item.quantity_in);
        const totalCostValue = quantity * Number(unitCost);
        
        const isEntry = ['INVOICE_ENTRY', 'POSITIVE_ADJUSTMENT'].includes(item.movement_type);
        const direction = isEntry ? 'Entrada' : 'Saída';
        
        // Ensure reason is descriptive
        let reason = item.reason;
        if (item.movement_type === 'SALE' && item.service_order) {
             reason = `OS #${item.service_order.os_number}`;
        }

        // Profit Calculation for Sales
        let saleValue = 0;
        let realProfit = 0;
        let profitMargin = 0;

        // Try to find the matching WO Item if this is a Sale linked to an OS
        if (item.movement_type === 'SALE' && item.service_order?.id && item.product_variant?.id) {
            const key = `${item.service_order.id}_${item.product_variant.id}`;
            const woItem = woItemsMap[key];

            if (woItem) {
                // Unit Sale Price used in the OS
                const unitSalePrice = Number(woItem.unit_price) || 0;
                saleValue = unitSalePrice * quantity;
                
                // Use the cost recorded in WO Item if available (snapshot), otherwise current movement cost
                const costBasis = Number(woItem.cost_price) || unitCost;
                const totalCostBasis = costBasis * quantity;

                realProfit = saleValue - totalCostBasis;
                profitMargin = saleValue > 0 ? (realProfit / saleValue) * 100 : 0;
            }
        }

        return {
          id: item.id,
          date: item.created_at,
          productName,
          category,
          subcategory,
          quantity: quantity,
          movementTypeRaw: item.movement_type,
          movementTypeLabel: direction,
          unitValue: unitCost,
          totalValue: totalCostValue, // This is Total Cost
          saleValue,
          realProfit,
          profitMargin,
          reason: reason,
          osNumber: item.service_order?.os_number,
          refNumber: refNumber,
          clientSupplier: clientSupplier
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

  // Trigger fetch when date range changes (ONLY IF in movements view)
  useEffect(() => {
    if (dateRange?.from && viewMode === 'movements') {
      fetchMovementsData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateRange]);

  // 3. Client-side Filtering
  const filteredData = useMemo(() => {
    return data.filter(item => {
            
        const matchesType = movementTypeFilter === "all" || 
            (movementTypeFilter === 'entrada' && item.movementTypeLabel === 'Entrada') ||
            (movementTypeFilter === 'saida' && item.movementTypeLabel === 'Saída');
            
        const matchesCategory = categoryFilter === "all" || item.category === categoryFilter;

        const matchesSubcategory = subcategoryFilter === "all" || item.subcategory === subcategoryFilter;
        
        const matchesSearch = searchFilter === "" || 
            item.productName.toLowerCase().includes(searchFilter.toLowerCase()) ||
            (item.subcategory && item.subcategory.toLowerCase().includes(searchFilter.toLowerCase())) ||
            (item.osNumber && item.osNumber.toString().includes(searchFilter)) ||
            (item.refNumber && item.refNumber.toString().includes(searchFilter));

        return matchesType && matchesCategory && matchesSubcategory && matchesSearch;
    });
  }, [data, movementTypeFilter, categoryFilter, subcategoryFilter, searchFilter]);

  // 4. Current Stock Calculations
  const filteredStockItems = useMemo(() => {
    return currentStock.filter(item => {
        const cat = item.product?.category || 'Sem Categoria';
        const sub = item.product?.subcategory || 'Geral';
        const description = item.product?.description || '';

        const matchesCategory = categoryFilter === "all" || cat === categoryFilter;
        const matchesSubcategory = subcategoryFilter === "all" || sub === subcategoryFilter;
        const matchesSearch = searchFilter === "" || 
            description.toLowerCase().includes(searchFilter.toLowerCase()) ||
            (sub && sub.toLowerCase().includes(searchFilter.toLowerCase())) ||
            (cat && cat.toLowerCase().includes(searchFilter.toLowerCase()));

        return matchesCategory && matchesSubcategory && matchesSearch;
    }).sort((a, b) => (a.product?.description || '').localeCompare(b.product?.description || ''));
  }, [currentStock, categoryFilter, subcategoryFilter, searchFilter]);

  const stockSummary = useMemo(() => {
    let totalCost = 0;
    let totalSale = 0;
    let totalItems = 0;
    const byCategory = {};

    filteredStockItems.forEach(item => {
        const qty = Number(item.stock) || 0;
        if (qty <= 0) return; 

        const cost = Number(item.cost_price) || 0;
        const sale = Number(item.sale_price) || 0;
        const cat = item.product?.category || 'Sem Categoria';
        const sub = item.product?.subcategory || 'Geral';
        
        totalCost += qty * cost;
        totalSale += qty * sale;
        totalItems += qty;

        const key = `${cat}|||${sub}`;
        if (!byCategory[key]) {
            byCategory[key] = { category: cat, subcategory: sub, qty: 0, cost: 0, sale: 0 };
        }
        byCategory[key].qty += qty;
        byCategory[key].cost += qty * cost;
        byCategory[key].sale += qty * sale;
    });

    // Enhance grouped data with profit calculation
    const groupedData = Object.values(byCategory).map(item => {
        const profit = item.sale - item.cost;
        const margin = item.sale > 0 ? (profit / item.sale) * 100 : 0;
        return {
            ...item,
            profit,
            margin
        };
    }).sort((a, b) => a.category.localeCompare(b.category));

    return {
        totalCost,
        totalSale,
        totalItems,
        grouped: groupedData
    };
  }, [filteredStockItems]);


  // 5. Process Data for Charts
  const chartDataPieces = useMemo(() => {
    const grouped = filteredData.reduce((acc, item) => {
        if (!acc[item.productName]) {
            acc[item.productName] = { name: item.productName, totalValue: 0, quantity: 0 };
        }
        acc[item.productName].totalValue += item.totalValue;
        acc[item.productName].quantity += item.quantity;
        return acc;
    }, {});
    
    return Object.values(grouped)
        .sort((a, b) => b.totalValue - a.totalValue)
        .slice(0, 10);
  }, [filteredData]);

  const chartDataInOut = useMemo(() => {
      const stats = {
          Entrada: { name: 'Entrada', value: 0 },
          Saída: { name: 'Saída', value: 0 }
      };
      
      filteredData.forEach(item => {
          const type = item.movementTypeLabel;
          if (stats[type]) {
              stats[type].value += item.totalValue;
          }
      });
      
      return Object.values(stats);
  }, [filteredData]);

  const chartDataProfitByCategory = useMemo(() => {
      const grouped = filteredData.reduce((acc, item) => {
          if (item.movementTypeLabel === 'Saída' && item.realProfit > 0) {
              const cat = item.category || 'Outros';
              if (!acc[cat]) acc[cat] = { name: cat, value: 0 };
              acc[cat].value += item.realProfit;
          }
          return acc;
      }, {});
      return Object.values(grouped).sort((a, b) => b.value - a.value).slice(0, 8);
  }, [filteredData]);

  const COLORS = ['#0ea5e9', '#22c55e', '#eab308', '#f97316', '#ef4444', '#8b5cf6', '#ec4899', '#6366f1'];
  
  // Totals for Listing Tab
  const TOTAL_VALUE = filteredData.reduce((acc, item) => acc + item.totalValue, 0);
  const TOTAL_PROFIT = filteredData.reduce((acc, item) => acc + (item.realProfit || 0), 0);
  const TOTAL_SALE_VALUE = filteredData.reduce((acc, item) => acc + (item.saleValue || 0), 0);
  const TOTAL_MARGIN = TOTAL_SALE_VALUE > 0 ? (TOTAL_PROFIT / TOTAL_SALE_VALUE) * 100 : 0;

  // Totals for Position Tab (Derived from stockSummary)
  const positionTotalProfit = stockSummary.totalSale - stockSummary.totalCost;
  const positionTotalMargin = stockSummary.totalSale > 0 ? (positionTotalProfit / stockSummary.totalSale) * 100 : 0;

  // PDF Creation Logic
  const createReportPDF = () => {
    const doc = new jsPDF({ orientation: 'landscape' });
    
    doc.setFontSize(16);
    doc.text("Relatório de Controle de Estoque", 14, 20);
    
    doc.setFontSize(10);
    if (viewMode === 'movements') {
        doc.text(`Período: ${format(dateRange.from, "dd/MM/yyyy")} a ${format(dateRange.to || dateRange.from, "dd/MM/yyyy")}`, 14, 28);
    }
    doc.text(`Gerado em: ${format(new Date(), "dd/MM/yyyy HH:mm")}`, 14, viewMode === 'movements' ? 33 : 28);

    if (viewMode === 'position') {
        doc.text("Visualização: Posição Atual de Estoque", 14, 35);
        
        // Added new columns to PDF
        const tableColumn = ["Categoria", "Subcategoria", "Qtd Itens", "Valor Venda", "Valor Custo", "Lucro Potencial", "Margem %"];
        const tableRows = stockSummary.grouped.map(item => [
            item.category,
            item.subcategory,
            item.qty,
            item.sale.toLocaleString('pt-BR', { minimumFractionDigits: 2 }),
            item.cost.toLocaleString('pt-BR', { minimumFractionDigits: 2 }),
            item.profit.toLocaleString('pt-BR', { minimumFractionDigits: 2 }),
            item.margin.toFixed(2) + '%'
        ]);

        autoTable(doc, {
            startY: 45,
            head: [tableColumn],
            body: tableRows,
            theme: 'striped',
            headStyles: { fillColor: [41, 128, 185] },
            styles: { fontSize: 9 },
            foot: [['TOTAIS GERAIS', '', stockSummary.totalItems, stockSummary.totalSale.toLocaleString('pt-BR', { minimumFractionDigits: 2 }), stockSummary.totalCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 }), positionTotalProfit.toLocaleString('pt-BR', { minimumFractionDigits: 2 }), positionTotalMargin.toFixed(2) + '%']],
            footStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold' }
        });
    } else {
      doc.text("Visualização: Detalhamento de Movimentações", 14, 40);
      
      const tableColumn = ["Data", "Ref.", "Peça", "Subcat.", "Tipo", "Qtd", "Custo Total", "Lucro Real", "Mg%"];
      const tableRows = filteredData.map(item => [
        format(parseISO(item.date), "dd/MM/yyyy"),
        String(item.refNumber),
        item.productName,
        item.subcategory,
        item.movementTypeLabel.toUpperCase(),
        item.quantity,
        item.totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 }),
        item.movementTypeLabel === 'Saída' ? item.realProfit.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '-',
        item.movementTypeLabel === 'Saída' ? item.profitMargin.toFixed(1) + '%' : '-'
      ]);

      autoTable(doc, {
        startY: 50,
        head: [tableColumn],
        body: tableRows,
        theme: 'striped',
        headStyles: { fillColor: [41, 128, 185] },
        styles: { fontSize: 8 },
        columnStyles: {
            2: { cellWidth: 50 }, // Description
        },
        foot: [['', '', '', '', '', '', TOTAL_VALUE.toLocaleString('pt-BR', { minimumFractionDigits: 2 }), TOTAL_PROFIT.toLocaleString('pt-BR', { minimumFractionDigits: 2 }), TOTAL_MARGIN.toFixed(1) + '%']],
        footStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold' }
      });
    }

    return doc;
  };

  // Actions
  const handleOpenPreview = () => {
      setIsExportModalOpen(true);
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
        pdfDoc.save(`relatorio_estoque_${viewMode}.pdf`);
        toast({
            title: "PDF Salvo",
            description: `Relatório baixado com sucesso.`
        });
    }
  };

  const handleWhatsApp = () => {
      const fromDate = format(dateRange.from, "dd/MM/yyyy");
      const toDate = format(dateRange.to || dateRange.from, "dd/MM/yyyy");

      let message = `*Relatório de Controle de Estoque - Horizontes*\n`;
      if (viewMode === 'movements') {
        message += `📅 Período: ${fromDate} a ${toDate}\n`;
        message += `💰 Valor Movimentado: ${TOTAL_VALUE.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}\n`;
        message += `📈 Lucro Estimado (Saídas): ${TOTAL_PROFIT.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}\n`;
      } else {
        message += `📈 Valor de Venda Potencial (Estoque): ${stockSummary.totalSale.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}\n`;
        message += `💸 Custo Total do Estoque: ${stockSummary.totalCost.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}\n`;
        message += `📦 Itens em Estoque: ${stockSummary.totalItems}\n`;
      }


      const url = `https://wa.me/?text=${encodeURIComponent(message)}`;
      window.open(url, '_blank');
      setIsExportModalOpen(false);
  };

  const handleExportCSV = () => {
    if (viewMode === 'position') {
        // Updated CSV headers and data
        let headers = ["Categoria", "Subcategoria", "Qtd Itens", "Valor Venda Total", "Valor Custo Total", "Lucro Potencial", "Margem %"];
        let rows = stockSummary.grouped.map(item => [
            item.category,
            item.subcategory,
            item.qty,
            item.sale.toFixed(2),
            item.cost.toFixed(2),
            item.profit.toFixed(2),
            item.margin.toFixed(2)
        ]);
        // Add footer row to CSV
        rows.push([
             "TOTAIS GERAIS",
             "",
             stockSummary.totalItems,
             stockSummary.totalSale.toFixed(2),
             stockSummary.totalCost.toFixed(2),
             positionTotalProfit.toFixed(2),
             positionTotalMargin.toFixed(2)
        ]);
        const csvContent = "\uFEFF" + headers.join(",") + "\n" + rows.map(e => e.join(",")).join("\n");
        downloadBlob(csvContent, "posicao_estoque.csv");
    } else {
        let headers = ["Data", "Ref", "Peca", "Categoria", "Subcategoria", "Tipo", "Qtd", "Custo Total", "Valor Venda", "Lucro Real", "Margem %"];
        let rows = filteredData.map(item => [
            format(parseISO(item.date), "dd/MM/yyyy"),
            item.refNumber,
            item.productName,
            item.category,
            item.subcategory,
            item.movementTypeLabel,
            item.quantity,
            item.totalValue.toFixed(2),
            item.saleValue.toFixed(2),
            item.realProfit.toFixed(2),
            item.profitMargin.toFixed(2)
        ]);
        // Add footer row to CSV
        rows.push([
            "TOTAIS",
            "",
            "",
            "",
            "",
            "",
            "",
            TOTAL_VALUE.toFixed(2),
            TOTAL_SALE_VALUE.toFixed(2),
            TOTAL_PROFIT.toFixed(2),
            TOTAL_MARGIN.toFixed(2)
        ]);
        const csvContent = "\uFEFF" + headers.join(",") + "\n" + rows.map(e => e.join(",")).join("\n");
        downloadBlob(csvContent, "movimentacoes_estoque.csv");
    }
  };

  const downloadBlob = (content, filename) => {
      const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const downloadLink = document.createElement("a");
      downloadLink.href = url;
      downloadLink.download = filename;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
  }

  useEffect(() => {
    return () => { if (pdfUrl) URL.revokeObjectURL(pdfUrl); };
  }, [pdfUrl]);

  const FilterSection = ({ showDateFilter = false, showTypeFilter = false, onRefresh, loading }) => (
      <Card className="mb-6">
          <CardHeader className="pb-3">
              <CardTitle className="text-base font-medium flex items-center gap-2">
                  <Filter className="h-4 w-4" />
                  Filtros
              </CardTitle>
          </CardHeader>
          <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                  {showDateFilter && (
                      <div className="space-y-2">
                          <label className="text-sm font-medium text-gray-700">Período</label>
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
                  )}

                  {showTypeFilter && (
                      <div className="space-y-2">
                          <label className="text-sm font-medium text-gray-700">Tipo Movimentação</label>
                          <Select value={movementTypeFilter} onValueChange={setMovementTypeFilter}>
                              <SelectTrigger>
                                  <SelectValue placeholder="Todos" />
                              </SelectTrigger>
                              <SelectContent>
                                  <SelectItem value="all">Todos</SelectItem>
                                  <SelectItem value="entrada">Entrada</SelectItem>
                                  <SelectItem value="saida">Saída</SelectItem>
                              </SelectContent>
                          </Select>
                      </div>
                  )}

                  <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">Categoria</label>
                      <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                          <SelectTrigger>
                              <SelectValue placeholder="Todas" />
                          </SelectTrigger>
                          <SelectContent>
                              <SelectItem value="all">Todas</SelectItem>
                              {categories.map((c) => (
                                  <SelectItem key={c} value={c}>{c}</SelectItem>
                              ))}
                          </SelectContent>
                      </Select>
                  </div>

                  <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">Subcategoria</label>
                      <Select value={subcategoryFilter} onValueChange={setSubcategoryFilter}>
                          <SelectTrigger>
                              <SelectValue placeholder="Todas" />
                          </SelectTrigger>
                          <SelectContent>
                              <SelectItem value="all">Todas</SelectItem>
                              {availableSubcategories.map((s) => (
                                  <SelectItem key={s} value={s}>{s}</SelectItem>
                              ))}
                          </SelectContent>
                      </Select>
                  </div>

                  <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">
                           Buscar
                      </label>
                      <div className="relative">
                          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                          <Input
                              placeholder="Ex: Pastilha, Freio..."
                              value={searchFilter}
                              onChange={(e) => setSearchFilter(e.target.value)}
                              className="pl-8"
                          />
                      </div>
                  </div>
              </div>

              <div className="mt-4 flex justify-end">
                  <Button variant="ghost" onClick={onRefresh} disabled={loading}>
                      <RefreshCcw className={cn("mr-2 h-4 w-4", loading && "animate-spin")} />
                      Atualizar Dados
                  </Button>
              </div>
          </CardContent>
      </Card>
  );

  return (
    <>
      <Helmet>
        <title>Controle de Estoque - Relatórios</title>
        <meta name="description" content="Relatório detalhado de movimentações de estoque, entradas e saídas com análise de lucro." />
      </Helmet>

      <div className="space-y-6 animate-in fade-in duration-500">
        {/* Header & Actions */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex flex-col">
            <h2 className="text-2xl font-bold tracking-tight text-gray-900">
                Controle de Estoque
            </h2>
            <div className="flex items-center gap-2 mt-1">
                 <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="flex items-center gap-1 text-muted-foreground hover:text-gray-900">
                            {viewMode === 'movements' ? (
                                <>
                                    <History className="h-4 w-4" />
                                    Listagem de Movimentações e Análise
                                </>
                            ) : (
                                <>
                                    <Package className="h-4 w-4" />
                                    Posição Atual do Estoque
                                </>
                            )}
                            <ChevronDown className="ml-1 h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                        <DropdownMenuItem onClick={() => handleViewModeChange('movements')}>
                            Listagem de Movimentações e Análise
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleViewModeChange('position')}>
                            Posição Atual do Estoque
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                 </DropdownMenu>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleExportCSV} disabled={loading}>
              <FileSpreadsheet className="mr-2 h-4 w-4" />
              CSV
            </Button>

            <Dialog open={isExportModalOpen} onOpenChange={setIsExportModalOpen}>
              <DialogTrigger asChild>
                <Button onClick={handleOpenPreview} disabled={loading}>
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

        {/* Dynamic Filter Section */}
        <FilterSection 
            showDateFilter={viewMode === 'movements'}
            showTypeFilter={viewMode === 'movements'}
            onRefresh={viewMode === 'movements' ? fetchMovementsData : fetchCurrentStock}
            loading={viewMode === 'movements' ? loading : stockLoading}
        />

        {/* Main Content Area Switched by viewMode */}
        {viewMode === 'movements' && (
          <div className="space-y-6">
             {/* Results Table */}
            <div className="rounded-md border bg-white shadow-sm overflow-hidden">
              <Table>
                <TableHeader className="bg-gray-50">
                  <TableRow>
                    <TableHead className="w-[90px]">Data</TableHead>
                    <TableHead className="w-[100px]">Ref/OS</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead className="hidden md:table-cell">Subcategoria</TableHead>
                    <TableHead className="w-[90px]">Tipo</TableHead>
                    <TableHead className="text-right w-[70px]">Qtd.</TableHead>
                    <TableHead className="text-right w-[110px]">Custo Tot</TableHead>
                    <TableHead className="text-right w-[110px]">Lucro Real</TableHead>
                    <TableHead className="text-right w-[70px]">Lucro %</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={9} className="h-24 text-center">
                        <div className="flex justify-center items-center gap-2 text-muted-foreground">
                          <Loader2 className="h-5 w-5 animate-spin" />
                          Carregando dados...
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : filteredData.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="h-32 text-center">
                        <div className="flex flex-col items-center justify-center text-muted-foreground gap-2">
                          <AlertCircle className="h-8 w-8 opacity-50" />
                          <p>Nenhum registro encontrado para os filtros selecionados.</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredData.map((item, index) => (
                      <TableRow key={`${item.id}-${index}`} className="hover:bg-gray-50/50 transition-colors">
                        <TableCell className="whitespace-nowrap">
                          {format(parseISO(item.date), "dd/MM/yy")}
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                            {item.refNumber}
                        </TableCell>
                        <TableCell>
                            <span className="font-medium text-gray-900 block">{item.productName}</span>
                            <span className="text-xs text-gray-500 md:hidden">{item.subcategory}</span>
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-sm text-gray-600">
                            {item.subcategory}
                        </TableCell>
                         <TableCell>
                          <Badge variant={item.movementTypeLabel === 'Entrada' ? 'success' : 'destructive'} className="text-[10px] font-normal">
                              {item.movementTypeLabel}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono font-medium">{item.quantity}</TableCell>
                        <TableCell className="text-right text-sm text-gray-600">
                          {item.totalValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </TableCell>
                        <TableCell className={cn("text-right font-medium", item.realProfit > 0 ? "text-green-600" : "text-gray-400")}>
                           {item.movementTypeLabel === 'Saída' ? item.realProfit.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '-'}
                        </TableCell>
                        <TableCell className={cn("text-right text-sm", item.realProfit > 0 ? "text-green-600" : "text-gray-400")}>
                           {item.movementTypeLabel === 'Saída' ? item.profitMargin.toFixed(0) + '%' : '-'}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
                <TableFooter className="bg-slate-100/80 border-t">
                  <TableRow>
                    <TableCell colSpan={6} className="text-right font-bold text-gray-800 text-sm">TOTAIS DO PERÍODO</TableCell>
                    <TableCell className="text-right font-bold text-gray-800 text-sm">
                      {TOTAL_VALUE.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </TableCell>
                    <TableCell className={cn("text-right font-bold text-sm", TOTAL_PROFIT >= 0 ? "text-green-700" : "text-red-600")}>
                      {TOTAL_PROFIT.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </TableCell>
                    <TableCell className={cn("text-right font-bold text-sm", TOTAL_MARGIN >= 0 ? "text-green-700" : "text-red-600")}>
                      {TOTAL_MARGIN.toFixed(1)}%
                    </TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
            </div>

             {/* Charts Section - Integrated Below Table */}
             {loading ? (
              <div className="h-64 w-full flex items-center justify-center border rounded-md bg-white">
                <div className="flex items-center gap-2 text-muted-foreground">
                   <Loader2 className="h-5 w-5 animate-spin" />
                   Carregando gráficos...
                </div>
              </div>
            ) : filteredData.length === 0 ? (
               null
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
                {/* Chart 1: Profit by Category */}
                <Card className="col-span-1 lg:col-span-2">
                  <CardHeader>
                    <CardTitle className="text-base font-medium flex items-center gap-2">
                      <DollarSign className="h-4 w-4" />
                      Lucro Real por Categoria (Top 8)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                     <div className="h-[300px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartDataProfitByCategory} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                          <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                          <YAxis />
                          <Tooltip 
                             formatter={(value) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                             contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                          />
                          <Bar dataKey="value" name="Lucro Real" fill="#22c55e" radius={[4, 4, 0, 0]}>
                             <LabelList dataKey="value" position="top" formatter={(val) => `R$ ${Math.floor(val)}`} fontSize={12} fill="#15803d" />
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base font-medium flex items-center gap-2">
                      <Package className="h-4 w-4" />
                      Top Peças por Valor Movimentado
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[300px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartDataPieces} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
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
                          <Bar dataKey="totalValue" name="Valor Total" radius={[0, 4, 4, 0]}>
                            {chartDataPieces.map((entry, index) => (
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
                      Movimentação: Entradas vs Saídas
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[300px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartDataInOut} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                          <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                          <YAxis />
                          <Tooltip 
                             formatter={(value) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                             contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                          />
                          <Bar dataKey="value" name="Valor Total" radius={[4, 4, 0, 0]}>
                            {chartDataInOut.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.name === 'Entrada' ? '#3b82f6' : '#ef4444'} />
                            ))}
                             <LabelList dataKey="value" position="top" formatter={(val) => `R$ ${Math.floor(val)}`} fontSize={12} />
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        )}
          
        {viewMode === 'position' && (
           <div className="space-y-6">
              {/* Snapshot KPI Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card className="bg-blue-50 border-blue-100">
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                          <CardTitle className="text-sm font-medium text-blue-700">Custo Total Estoque</CardTitle>
                          <Coins className="h-4 w-4 text-blue-600" />
                      </CardHeader>
                      <CardContent>
                          {stockLoading ? <Loader2 className="h-6 w-6 animate-spin text-blue-600" /> : (
                              <div className="text-2xl font-bold text-blue-900">
                                  {stockSummary.totalCost.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                              </div>
                          )}
                          <p className="text-xs text-blue-600 mt-1">Baseado no preço de custo atual</p>
                      </CardContent>
                  </Card>
                  
                  <Card className="bg-green-50 border-green-100">
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                          <CardTitle className="text-sm font-medium text-green-700">Valor Venda Total</CardTitle>
                          <TrendingUp className="h-4 w-4 text-green-600" />
                      </CardHeader>
                      <CardContent>
                           {stockLoading ? <Loader2 className="h-6 w-6 animate-spin text-green-600" /> : (
                              <div className="text-2xl font-bold text-green-900">
                                  {stockSummary.totalSale.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                              </div>
                           )}
                           <p className="text-xs text-green-600 mt-1">Potencial de receita</p>
                      </CardContent>
                  </Card>

                  <Card className="bg-slate-50 border-slate-200">
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                          <CardTitle className="text-sm font-medium text-slate-700">Itens em Estoque</CardTitle>
                          <Package className="h-4 w-4 text-slate-600" />
                      </CardHeader>
                      <CardContent>
                           {stockLoading ? <Loader2 className="h-6 w-6 animate-spin text-slate-600" /> : (
                              <div className="text-2xl font-bold text-slate-900">
                                  {stockSummary.totalItems}
                              </div>
                           )}
                           <p className="text-xs text-slate-500 mt-1">Quantidade total de peças</p>
                      </CardContent>
                  </Card>
              </div>

              {/* Grouped Table */}
              <div className="rounded-md border bg-white shadow-sm overflow-hidden">
                 <div className="p-4 border-b bg-gray-50 flex items-center gap-2">
                     <Tags className="h-4 w-4 text-gray-500" />
                     <h3 className="font-semibold text-gray-700">Totais por Categoria e Subcategoria</h3>
                 </div>
                 <Table>
                     <TableHeader>
                         <TableRow>
                             <TableHead>Categoria</TableHead>
                             <TableHead>Subcategoria</TableHead>
                             <TableHead className="text-right">Qtd Itens</TableHead>
                             <TableHead className="text-right">Valor Venda Total</TableHead>
                             <TableHead className="text-right">Valor Custo Total</TableHead>
                             <TableHead className="text-right">Lucro Potencial</TableHead>
                             <TableHead className="text-right">Margem %</TableHead>
                         </TableRow>
                     </TableHeader>
                     <TableBody>
                        {stockLoading ? (
                            <TableRow><TableCell colSpan={7} className="h-24 text-center">Carregando...</TableCell></TableRow>
                        ) : stockSummary.grouped.length === 0 ? (
                            <TableRow><TableCell colSpan={7} className="h-24 text-center text-muted-foreground">Nenhum item em estoque para os filtros selecionados.</TableCell></TableRow>
                        ) : (
                            stockSummary.grouped.map((group, idx) => (
                                <TableRow key={idx}>
                                    <TableCell className="font-medium">{group.category}</TableCell>
                                    <TableCell className="text-gray-600">{group.subcategory}</TableCell>
                                    <TableCell className="text-right font-mono">{group.qty}</TableCell>
                                    <TableCell className="text-right font-medium text-green-700">
                                        {group.sale.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                    </TableCell>
                                    <TableCell className="text-right font-medium text-blue-700">
                                        {group.cost.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                    </TableCell>
                                    <TableCell className="text-right font-medium text-orange-600">
                                        {group.profit.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                    </TableCell>
                                    <TableCell className="text-right font-medium text-gray-700">
                                        {group.margin.toFixed(2)}%
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                     </TableBody>
                     {stockSummary.grouped.length > 0 && (
                        <TableFooter className="bg-slate-100/80 border-t">
                            <TableRow>
                                <TableCell colSpan={2} className="text-right font-bold text-gray-800 text-sm">TOTAIS GERAIS</TableCell>
                                <TableCell className="text-right font-bold text-gray-800 text-sm font-mono">{stockSummary.totalItems}</TableCell>
                                <TableCell className="text-right font-bold text-green-700 text-sm">
                                    {stockSummary.totalSale.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                </TableCell>
                                <TableCell className="text-right font-bold text-blue-700 text-sm">
                                    {stockSummary.totalCost.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                </TableCell>
                                <TableCell className="text-right font-bold text-orange-600 text-sm">
                                    {positionTotalProfit.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                </TableCell>
                                <TableCell className="text-right font-bold text-gray-800 text-sm">
                                    {positionTotalMargin.toFixed(2)}%
                                </TableCell>
                            </TableRow>
                        </TableFooter>
                     )}
                 </Table>
              </div>

              {/* Detailed Products Table - Shown only when filtered by Category or Subcategory */}
              {(categoryFilter !== 'all' || subcategoryFilter !== 'all') ? (
                  <div className="rounded-md border bg-white shadow-sm overflow-hidden mt-8">
                     <div className="p-4 border-b bg-gray-50 flex items-center gap-2">
                         <Layers className="h-4 w-4 text-gray-500" />
                         <h3 className="font-semibold text-gray-700">Detalhamento de Produtos em Estoque</h3>
                     </div>
                     <Table>
                         <TableHeader>
                             <TableRow>
                                 <TableHead>Produto</TableHead>
                                 <TableHead>Categoria</TableHead>
                                 <TableHead>Subcategoria</TableHead>
                                 <TableHead className="text-right">Estoque</TableHead>
                                 <TableHead className="text-right">Custo Unit.</TableHead>
                                 <TableHead className="text-right">Venda Unit.</TableHead>
                                 <TableHead className="text-right">Total Custo</TableHead>
                                 <TableHead className="text-right">Total Venda</TableHead>
                             </TableRow>
                         </TableHeader>
                         <TableBody>
                            {stockLoading ? (
                                <TableRow><TableCell colSpan={8} className="h-24 text-center">Carregando...</TableCell></TableRow>
                            ) : filteredStockItems.length === 0 ? (
                                <TableRow><TableCell colSpan={8} className="h-24 text-center text-muted-foreground">Nenhum produto encontrado.</TableCell></TableRow>
                            ) : (
                                filteredStockItems.map((item, idx) => {
                                    const qty = Number(item.stock) || 0;
                                    const cost = Number(item.cost_price) || 0;
                                    const sale = Number(item.sale_price) || 0;
                                    
                                    return (
                                        <TableRow key={idx} className="hover:bg-gray-50/50">
                                            <TableCell className="font-medium">{item.product?.description}</TableCell>
                                            <TableCell className="text-gray-600 text-sm">{item.product?.category}</TableCell>
                                            <TableCell className="text-gray-600 text-sm">{item.product?.subcategory}</TableCell>
                                            <TableCell className="text-right font-mono font-bold">{qty}</TableCell>
                                            <TableCell className="text-right text-sm text-gray-600">
                                                {cost.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                            </TableCell>
                                            <TableCell className="text-right text-sm text-gray-600">
                                                {sale.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                            </TableCell>
                                            <TableCell className="text-right font-medium text-blue-700">
                                                {(qty * cost).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                            </TableCell>
                                            <TableCell className="text-right font-medium text-green-700">
                                                {(qty * sale).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            )}
                         </TableBody>
                     </Table>
                  </div>
              ) : (
                  <div className="mt-8 text-center p-8 border-2 border-dashed rounded-md bg-gray-50 text-gray-500">
                      <p className="text-sm">Selecione uma categoria ou subcategoria nos filtros acima para visualizar o detalhamento de produtos.</p>
                  </div>
              )}
          </div>
        )}
      </div>
    </>
  );
};

export default RelatorioControleEstoque;