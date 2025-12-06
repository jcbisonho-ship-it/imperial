import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowDownLeft, ArrowUpRight, LineChart, ArrowRightLeft } from "lucide-react";
import { useToast } from '@/components/ui/use-toast';

import ContasReceber from '@/pages/ContasReceber';
import ContasPagar from '@/pages/ContasPagar';
import FluxoCaixa from '@/pages/FluxoCaixa';
import Transferencias from '@/pages/Transferencias';

const Financeiro = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = searchParams.get('tab') || 'receber';
  const [refreshKey, setRefreshKey] = useState(0); 
  const { toast } = useToast();

  const handleTabChange = (value) => {
    setSearchParams({ tab: value });
  };

  return (
    <>
      <div className="p-6 space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex flex-col gap-2">
            <h1 className="text-3xl font-bold tracking-tight">Financeiro</h1>
            <p className="text-muted-foreground">
              Central de controle financeiro da empresa.
            </p>
          </div>
        </div>

        <Tabs value={currentTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 max-w-[1000px]">
            <TabsTrigger value="receber" className="flex items-center gap-2">
              <ArrowDownLeft className="h-4 w-4 text-green-600" />
              <span>Contas a Receber</span>
            </TabsTrigger>
            <TabsTrigger value="pagar" className="flex items-center gap-2">
              <ArrowUpRight className="h-4 w-4 text-red-600" />
              <span>Contas a Pagar</span>
            </TabsTrigger>
            <TabsTrigger value="fluxo" className="flex items-center gap-2">
              <LineChart className="h-4 w-4 text-blue-600" />
              <span>Fluxo de Caixa</span>
            </TabsTrigger>
            <TabsTrigger value="transferencias" className="flex items-center gap-2">
              <ArrowRightLeft className="h-4 w-4 text-purple-600" />
              <span>Transferências</span>
            </TabsTrigger>
          </TabsList>

          <div className="mt-6">
            <TabsContent value="receber" className="focus-visible:ring-0 m-0 outline-none">
              <ContasReceber key={`receber-${refreshKey}`} />
            </TabsContent>
            
            <TabsContent value="pagar" className="focus-visible:ring-0 m-0 outline-none">
              <ContasPagar key={`pagar-${refreshKey}`} />
            </TabsContent>

            <TabsContent value="fluxo" className="focus-visible:ring-0 m-0 outline-none">
              <FluxoCaixa key={`fluxo-${refreshKey}`} />
            </TabsContent>

            <TabsContent value="transferencias" className="focus-visible:ring-0 m-0 outline-none">
              <Transferencias key={`transferencias-${refreshKey}`} />
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </>
  );
};

export default Financeiro;