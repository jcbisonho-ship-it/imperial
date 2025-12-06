import React, { useState, useEffect, useMemo } from 'react';
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
import { Calendar as CalendarIcon, Filter, RefreshCcw, Search, User } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from '@/lib/customSupabaseClient'; // Import supabase

const FiltrosRelatorio = ({ 
  filters, 
  setFilters, 
  categories, 
  loading, 
  onRefresh 
}) => {
  const [subcategories, setSubcategories] = useState([]);

  // Helper to update a specific filter
  const updateFilter = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  // Fetch subcategories when categories or selected category changes
  useEffect(() => {
    const fetchSubcategories = async () => {
      if (filters.category && filters.category !== 'all') {
        const selectedCategory = categories.find(cat => cat.name === filters.category);
        if (selectedCategory) {
          const { data, error } = await supabase
            .from('financial_subcategories')
            .select('*')
            .eq('category_id', selectedCategory.id)
            .order('name');
          if (error) {
            console.error('Error fetching subcategories:', error);
            setSubcategories([]);
          } else {
            setSubcategories(data || []);
          }
        } else {
          setSubcategories([]);
        }
      } else {
        // If 'all' categories is selected, fetch all subcategories
        const { data, error } = await supabase
            .from('financial_subcategories')
            .select('*')
            .order('name');
        if (error) {
            console.error('Error fetching all subcategories:', error);
            setSubcategories([]);
        } else {
            setSubcategories(data || []);
        }
      }
    };

    fetchSubcategories();
  }, [filters.category, categories]);


  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-medium flex items-center gap-2">
          <Filter className="h-4 w-4" />
          Filtros de Relatório
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Date Filter */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Período</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !filters.dateRange && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {filters.dateRange?.from ? (
                    filters.dateRange.to ? (
                      <>
                        {format(filters.dateRange.from, "dd/MM/y", { locale: ptBR })} -{" "}
                        {format(filters.dateRange.to, "dd/MM/y", { locale: ptBR })}
                      </>
                    ) : (
                      format(filters.dateRange.from, "dd/MM/y", { locale: ptBR })
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
                  defaultMonth={filters.dateRange?.from}
                  selected={filters.dateRange}
                  onSelect={(range) => updateFilter('dateRange', range)}
                  numberOfMonths={2}
                  locale={ptBR}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Movement Type Filter */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Tipo de Movimentação</label>
            <Select value={filters.type} onValueChange={(val) => updateFilter('type', val)}>
              <SelectTrigger>
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="income">Receita</SelectItem>
                <SelectItem value="expense">Despesa</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Category Filter */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Categoria Financeira</label>
            <Select value={filters.category} onValueChange={(val) => {
              updateFilter('category', val);
              updateFilter('subcategory', 'all'); // Reset subcategory when category changes
            }}>
              <SelectTrigger>
                <SelectValue placeholder="Todas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {/* Subcategory Filter */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Subcategoria Financeira</label>
            <Select value={filters.subcategory} onValueChange={(val) => updateFilter('subcategory', val)} disabled={!filters.category || filters.category === 'all'}>
              <SelectTrigger>
                <SelectValue placeholder="Todas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {subcategories.map((sc) => (
                  <SelectItem key={sc.id} value={sc.name}>{sc.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Status Filter */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Status</label>
            <Select value={filters.status} onValueChange={(val) => updateFilter('status', val)}>
              <SelectTrigger>
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="paid">Pago</SelectItem>
                <SelectItem value="pending">Pendente</SelectItem>
                <SelectItem value="overdue">Vencido</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Payment Method Filter */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Forma de Pagamento</label>
            <Select value={filters.paymentMethod} onValueChange={(val) => updateFilter('paymentMethod', val)}>
              <SelectTrigger>
                <SelectValue placeholder="Todas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="Dinheiro">Dinheiro</SelectItem>
                <SelectItem value="Pix">Pix</SelectItem>
                <SelectItem value="Cartão de Crédito">Cartão de Crédito</SelectItem>
                <SelectItem value="Cartão de Débito">Cartão de Débito</SelectItem>
                <SelectItem value="Boleto">Boleto</SelectItem>
                <SelectItem value="Transferência">Transferência</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Responsible Filter (Text Search) */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Responsável</label>
            <div className="relative">
              <User className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Nome do responsável..."
                value={filters.responsible}
                onChange={(e) => updateFilter('responsible', e.target.value)}
                className="pl-8"
              />
            </div>
          </div>
          
           {/* Search Text */}
           <div className="space-y-2 col-span-2">
            <label className="text-sm font-medium text-gray-700">Buscar (Descrição ou Notas)</label>
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Ex: Pagamento Aluguel, OS #123..."
                value={filters.search}
                onChange={(e) => updateFilter('search', e.target.value)}
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
};

export default FiltrosRelatorio;