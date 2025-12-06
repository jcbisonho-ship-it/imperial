import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ServiceOrdersReports from '@/components/dashboard/ServiceOrdersReports';

const Reports = () => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-800">Relatórios</h2>
        <p className="text-gray-600">Analise o desempenho da sua oficina.</p>
      </div>
      <Tabs defaultValue="serviceOrders" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="serviceOrders">Ordens de Serviço</TabsTrigger>
          <TabsTrigger value="financial">Financeiro</TabsTrigger>
          <TabsTrigger value="inventory">Estoque</TabsTrigger>
        </TabsList>
        <TabsContent value="serviceOrders">
          <ServiceOrdersReports />
        </TabsContent>
        <TabsContent value="financial">
          <div className="p-6 bg-white rounded-xl shadow-lg mt-4">
            <h3 className="text-lg font-semibold">Relatórios Financeiros</h3>
            <p className="text-gray-500 mt-2">🚧 Esta funcionalidade ainda não foi implementada. 🚀</p>
          </div>
        </TabsContent>
        <TabsContent value="inventory">
          <div className="p-6 bg-white rounded-xl shadow-lg mt-4">
            <h3 className="text-lg font-semibold">Relatórios de Estoque</h3>
            <p className="text-gray-500 mt-2">🚧 Esta funcionalidade ainda não foi implementada. 🚀</p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Reports;