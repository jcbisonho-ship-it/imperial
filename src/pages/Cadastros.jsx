import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Briefcase, Car, Package, PenTool } from "lucide-react";
import Clientes from '@/pages/Clientes';
import Colaboradores from '@/pages/Colaboradores';
import Veiculos from '@/pages/Veiculos';
import Produtos from '@/pages/Produtos';
import Servicos from '@/pages/Servicos';
const Cadastros = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = searchParams.get('tab') || 'clientes';
  const handleTabChange = value => {
    setSearchParams({
      tab: value
    });
  };
  return <div className="p-6 space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Cadastros</h1>
        <p className="text-muted-foreground">
          Central de gerenciamento de cadastros da oficina.
        </p>
      </div>

      <Tabs value={currentTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-3 lg:grid-cols-5 h-auto"> {/* Adjusted grid-cols from 6 to 5 */}
          <TabsTrigger value="clientes" className="flex items-center gap-2 py-3">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Clientes e Fornecedores</span>
          </TabsTrigger>
          {/* Fornecedores tab removed as requested */}
          <TabsTrigger value="colaboradores" className="flex items-center gap-2 py-3">
            <Briefcase className="h-4 w-4" />
            <span className="hidden sm:inline">Colaboradores</span>
          </TabsTrigger>
          <TabsTrigger value="veiculos" className="flex items-center gap-2 py-3">
            <Car className="h-4 w-4" />
            <span className="hidden sm:inline">Veículos</span>
          </TabsTrigger>
          <TabsTrigger value="produtos" className="flex items-center gap-2 py-3">
            <Package className="h-4 w-4" />
            <span className="hidden sm:inline">Produtos</span>
          </TabsTrigger>
          <TabsTrigger value="servicos" className="flex items-center gap-2 py-3">
            <PenTool className="h-4 w-4" />
            <span className="hidden sm:inline">Serviços</span>
          </TabsTrigger>
        </TabsList>

        <div className="mt-6">
          <TabsContent value="clientes" className="focus-visible:ring-0">
            <Clientes />
          </TabsContent>
          
          {/* Fornecedores TabsContent removed as requested */}

          <TabsContent value="colaboradores" className="focus-visible:ring-0">
            <Colaboradores />
          </TabsContent>

          <TabsContent value="veiculos" className="focus-visible:ring-0">
            <Veiculos />
          </TabsContent>

          <TabsContent value="produtos" className="focus-visible:ring-0">
            <Produtos />
          </TabsContent>

          <TabsContent value="servicos" className="focus-visible:ring-0">
            <Servicos />
          </TabsContent>
        </div>
      </Tabs>
    </div>;
};
export default Cadastros;