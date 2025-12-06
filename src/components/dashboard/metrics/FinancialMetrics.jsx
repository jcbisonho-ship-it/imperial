import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/lib/customSupabaseClient';
import { formatCurrency } from '@/lib/utils';
import { Wallet, TrendingUp, AlertCircle } from 'lucide-react';
import { startOfMonth, endOfMonth, format } from 'date-fns';

const FinancialMetrics = () => {
  const [metrics, setMetrics] = useState({
    total_pending: 0,
    total_paid: 0,
    total_overdue: 0,
    collection_rate: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMetrics = async () => {
      const start = format(startOfMonth(new Date()), 'yyyy-MM-dd');
      const end = format(endOfMonth(new Date()), 'yyyy-MM-dd');
      try {
        const { data, error } = await supabase.rpc('get_dashboard_financial_metrics', { p_start_date: start, p_end_date: end });
        if (error) throw error;
        setMetrics(data);
      } catch (error) {
        console.error("Error fetching financial metrics", error);
      } finally {
        setLoading(false);
      }
    };
    fetchMetrics();
  }, []);

  if (loading) return <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-pulse"><div className="h-24 bg-gray-100 rounded-xl"></div><div className="h-24 bg-gray-100 rounded-xl"></div><div className="h-24 bg-gray-100 rounded-xl"></div></div>;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Card className="border-l-4 border-l-yellow-500 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-gray-600">A Receber (Pendente)</CardTitle>
          <Wallet className="h-4 w-4 text-yellow-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-yellow-700">{formatCurrency(metrics.total_pending)}</div>
          <p className="text-xs text-muted-foreground">Aguardando pagamento</p>
        </CardContent>
      </Card>

      <Card className="border-l-4 border-l-green-500 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-gray-600">Total Recebido</CardTitle>
          <TrendingUp className="h-4 w-4 text-green-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-700">{formatCurrency(metrics.total_paid)}</div>
          <p className="text-xs text-muted-foreground">Taxa de Recebimento: {metrics.collection_rate}%</p>
        </CardContent>
      </Card>

      <Card className="border-l-4 border-l-red-500 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-gray-600">Valores Vencidos</CardTitle>
          <AlertCircle className="h-4 w-4 text-red-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-red-700">{formatCurrency(metrics.total_overdue)}</div>
          <p className="text-xs text-muted-foreground">Necessita cobrança</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default FinancialMetrics;