import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/lib/customSupabaseClient';
import { formatCurrency } from '@/lib/utils';
import { AlertCircle, CheckCircle2, PackageMinus, FileText } from 'lucide-react';

const FinancialWidgets = () => {
  const [kpis, setKpis] = useState({
    open_os: 0,
    total_receivable: 0,
    stock_exits: 0,
    overdue_count: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchKPIs = async () => {
      try {
        const { data, error } = await supabase.rpc('get_financial_dashboard_kpis');
        if (error) throw error;
        setKpis(data);
      } catch (error) {
        console.error("Error fetching KPIs", error);
      } finally {
        setLoading(false);
      }
    };
    fetchKPIs();
  }, []);

  if (loading) return <div className="grid grid-cols-1 md:grid-cols-4 gap-4 animate-pulse"><div className="h-32 bg-gray-200 rounded-xl"></div><div className="h-32 bg-gray-200 rounded-xl"></div><div className="h-32 bg-gray-200 rounded-xl"></div><div className="h-32 bg-gray-200 rounded-xl"></div></div>;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <Card className="border-l-4 border-l-blue-500 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-gray-600">Total OS Abertas</CardTitle>
          <FileText className="h-4 w-4 text-blue-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{kpis.open_os}</div>
          <p className="text-xs text-muted-foreground">Ordens em andamento</p>
        </CardContent>
      </Card>

      <Card className="border-l-4 border-l-yellow-500 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-gray-600">Contas a Receber</CardTitle>
          <AlertCircle className="h-4 w-4 text-yellow-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(kpis.total_receivable)}</div>
          <p className="text-xs text-muted-foreground">Montante pendente</p>
        </CardContent>
      </Card>

      <Card className="border-l-4 border-l-red-500 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-gray-600">Contas Vencidas</CardTitle>
          <AlertCircle className="h-4 w-4 text-red-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-red-600">{kpis.overdue_count}</div>
          <p className="text-xs text-muted-foreground">Faturas atrasadas</p>
        </CardContent>
      </Card>

      <Card className="border-l-4 border-l-purple-500 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-gray-600">Estoque Baixado</CardTitle>
          <PackageMinus className="h-4 w-4 text-purple-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{kpis.stock_exits}</div>
          <p className="text-xs text-muted-foreground">Itens movimentados (Saída)</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default FinancialWidgets;