import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar as CalendarIcon, Filter } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Helmet } from 'react-helmet';

// Import report components
import RelatorioProdutividadeColaboradores from '@/components/relatorios/RelatorioProdutividadeColaboradores';
import RelatorioControleEstoque from '@/components/relatorios/RelatorioControleEstoque';

// Integrated Modules
import RelatorioFinanceiro from '@/modules/financeiro/RelatorioFinanceiro';
import RelatorioOS from '@/modules/os/RelatorioOS'; // Updated import path and component name

const Relatorios = () => {
  const [activeTab, setActiveTab] = useState("produtividade-colaboradores"); 
  const [date, setDate] = useState({
    from: subDays(new Date(), 30),
    to: new Date(),
  });

  return (
    <>
      <Helmet>
        <title>Relatórios - Horizontes</title>
        <meta name="description" content="Visão detalhada do desempenho financeiro, operacional e de produtividade." />
      </Helmet>
      <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Relatórios Gerenciais</h1>
            <p className="text-gray-600">Visão detalhada do desempenho financeiro e operacional.</p>
          </div>

          {/* Global Date Filter - optional usage */}
          <div className="flex items-center gap-2 bg-white p-2 rounded-md border shadow-sm">
            <Filter className="w-4 h-4 text-gray-500" />
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={cn(
                    "w-[240px] justify-start text-left font-normal",
                    !date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date?.from ? (
                    date.to ? (
                      <>
                        {format(date.from, "dd/MM/y", { locale: ptBR })} -{" "}
                        {format(date.to, "dd/MM/y", { locale: ptBR })}
                      </>
                    ) : (
                      format(date.from, "dd/MM/y", { locale: ptBR })
                    )
                  ) : (
                    <span>Selecione o período</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  initialFocus
                  mode="range"
                  defaultMonth={date?.from}
                  selected={date}
                  onSelect={setDate}
                  numberOfMonths={2}
                  locale={ptBR}
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="overflow-x-auto pb-2">
            <TabsList className="w-full justify-start h-auto flex-wrap gap-1 bg-transparent p-0">
              <TabsTrigger value="produtividade-colaboradores" className="data-[state=active]:bg-white data-[state=active]:shadow-sm border border-transparent data-[state=active]:border-gray-200">
                Produtividade Colaboradores
              </TabsTrigger>
              <TabsTrigger value="controle-estoque" className="data-[state=active]:bg-white data-[state=active]:shadow-sm border border-transparent data-[state=active]:border-gray-200">
                Controle de Estoque
              </TabsTrigger>
              <TabsTrigger value="financeiro" className="data-[state=active]:bg-white data-[state=active]:shadow-sm border border-transparent data-[state=active]:border-gray-200">
                Financeiro
              </TabsTrigger>
              <TabsTrigger value="os" className="data-[state=active]:bg-white data-[state=active]:shadow-sm border border-transparent data-[state=active]:border-gray-200">
                Ordens de Serviço
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="mt-4">
            <TabsContent value="produtividade-colaboradores">
              <RelatorioProdutividadeColaboradores />
            </TabsContent>
            <TabsContent value="controle-estoque">
              <RelatorioControleEstoque />
            </TabsContent>
            <TabsContent value="financeiro">
              <RelatorioFinanceiro />
            </TabsContent>
            <TabsContent value="os">
              <RelatorioOS />
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </>
  );
};

export default Relatorios;