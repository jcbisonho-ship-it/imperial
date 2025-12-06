import React from 'react';
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
import { Calendar as CalendarIcon, Filter, RefreshCcw, Search, User, Wrench } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const FiltrosRelatorio = ({ 
  filters, 
  setFilters, 
  mechanics, 
  categories, 
  subcategories, 
  loading, 
  onRefresh 
}) => {
  
  // Helper to update a specific filter
  const updateFilter = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const filteredSubcategories = subcategories.filter(
    (sub) => filters.category === "all" || sub.id_categoria === filters.category
  );

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-medium flex items-center gap-2">
          <Filter className="h-4 w-4" />
          Filtros de Relatório
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {/* Date Filter */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Período</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !filters.dateRange?.from && "text-muted-foreground"
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

          {/* Service Category Filter */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Categorias</label>
            <Select value={filters.category} onValueChange={(val) => {
              updateFilter('category', val);
              updateFilter('subcategory', 'all'); // Reset subcategory when category changes
            }}>
              <SelectTrigger>
                <SelectValue placeholder="Todas as Categorias" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>{cat.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Subcategory Filter */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Subcategoria</label>
            <Select value={filters.subcategory} onValueChange={(val) => updateFilter('subcategory', val)} disabled={!filters.category || filters.category === 'all'}>
              <SelectTrigger>
                <SelectValue placeholder="Todas as Subcategorias" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {filteredSubcategories.map((sub) => (
                  <SelectItem key={sub.id} value={sub.id}>{sub.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Mechanic Filter */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Mecânico</label>
            <Select value={filters.mechanic} onValueChange={(val) => updateFilter('mechanic', val)}>
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

          {/* Search Text */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Buscar (Descrição do Serviço ou OS)</label>
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Ex: Troca de óleo, 1032..."
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