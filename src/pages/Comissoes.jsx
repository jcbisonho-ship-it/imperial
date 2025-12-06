import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, Calendar, Download } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

const Comissoes = () => {
  const { toast } = useToast();

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Users className="h-8 w-8 text-orange-600" />
            Gestão de Comissões
          </h1>
          <p className="text-muted-foreground mt-1">Acompanhe e processe o pagamento de comissões dos colaboradores.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Calendar className="mr-2 h-4 w-4" /> Período
          </Button>
          <Button variant="secondary" onClick={() => toast({ title: "Em breve", description: "Relatório será gerado." })}>
            <Download className="mr-2 h-4 w-4" /> Relatório
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Pendente</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">R$ 0,00</div>
            <p className="text-xs text-muted-foreground">Aguardando pagamento</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Pago no Período</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">R$ 0,00</div>
            <p className="text-xs text-muted-foreground">Comissões finalizadas</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Detalhamento por Colaborador</CardTitle>
          <CardDescription>Lista de comissões calculadas por serviços e produtos.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground border-2 border-dashed rounded-lg">
            <Users className="h-12 w-12 mb-4 opacity-20" />
            <p className="text-lg font-medium">Nenhum dado de comissão</p>
            <p className="text-sm">Os cálculos de comissões aparecerão aqui.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Comissoes;