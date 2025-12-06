import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, FileSignature } from "lucide-react";

import OS from '@/pages/OS';
import Orcamentos from '@/pages/Orcamentos';

const Atendimentos = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = searchParams.get('tab') || 'orcamentos'; // Changed default tab

  const handleTabChange = (value) => {
    setSearchParams({ tab: value });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Ordens e Orçamentos</h1>
        <p className="text-muted-foreground">
          Gerencie suas ordens de serviço e orçamentos.
        </p>
      </div>

      <Tabs value={currentTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="grid w-full grid-cols-2 h-auto">
          {/* Orçamentos tab now appears first */}
          <TabsTrigger value="orcamentos" className="flex items-center gap-2 py-3">
            <FileSignature className="h-4 w-4" />
            <span className="hidden sm:inline">Orçamentos</span>
          </TabsTrigger>
          {/* Ordens de Serviço tab appears second */}
          <TabsTrigger value="os" className="flex items-center gap-2 py-3">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">Ordens de Serviço</span>
            <span className="sm:hidden">OS</span>
          </TabsTrigger>
        </TabsList>

        <div className="mt-6">
          {/* Content for Orçamentos tab */}
          <TabsContent value="orcamentos" className="focus-visible:ring-0">
            <Orcamentos />
          </TabsContent>
          {/* Content for Ordens de Serviço tab */}
          <TabsContent value="os" className="focus-visible:ring-0">
            <OS />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
};

export default Atendimentos;