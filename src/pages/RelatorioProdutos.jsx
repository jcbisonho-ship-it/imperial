import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Package } from "lucide-react";

const RelatorioProdutos = () => {
  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Package className="h-8 w-8 text-emerald-600" />
          Relatórios de Produtos
        </h1>
        <p className="text-muted-foreground">Giro de estoque, produtos mais vendidos e margem de lucro.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Performance de Produtos</CardTitle>
          <CardDescription>Analise o desempenho do seu estoque.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground border-2 border-dashed rounded-lg">
            <Package className="h-12 w-12 mb-4 opacity-20" />
            <p className="text-lg font-medium">Aguardando dados</p>
            <p className="text-sm">As estatísticas de produtos e estoque aparecerão aqui.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default RelatorioProdutos;