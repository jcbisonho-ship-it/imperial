import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { PieChart } from "lucide-react";

const RelatoriosFinanceiros = () => {
  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <PieChart className="h-8 w-8 text-blue-600" />
          Relatórios Financeiros
        </h1>
        <p className="text-muted-foreground">Análises detalhadas sobre receitas, despesas e lucratividade.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Painel Financeiro</CardTitle>
          <CardDescription>Visão geral dos indicadores financeiros da oficina.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground border-2 border-dashed rounded-lg">
            <PieChart className="h-12 w-12 mb-4 opacity-20" />
            <p className="text-lg font-medium">Selecione um relatório</p>
            <p className="text-sm">Utilize os filtros para gerar análises financeiras.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default RelatoriosFinanceiros;