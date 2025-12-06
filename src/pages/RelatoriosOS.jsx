import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { FileText } from "lucide-react";

const RelatoriosOS = () => {
  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <FileText className="h-8 w-8 text-indigo-600" />
          Relatórios de Ordens de Serviço
        </h1>
        <p className="text-muted-foreground">Métricas e histórico de atendimentos realizados.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Análise de Atendimentos</CardTitle>
          <CardDescription>Estatísticas sobre volume, status e performance das OS.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground border-2 border-dashed rounded-lg">
            <FileText className="h-12 w-12 mb-4 opacity-20" />
            <p className="text-lg font-medium">Nenhum relatório gerado</p>
            <p className="text-sm">Os dados das Ordens de Serviço serão exibidos aqui.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default RelatoriosOS;