import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/lib/customSupabaseClient';
import { formatCurrency } from '@/lib/utils';
import { FileText, AlertOctagon, DollarSign, Activity, Ban } from 'lucide-react';
import { startOfMonth, endOfMonth, format } from 'date-fns';

const OSMetrics = () => {
  const [metrics, setMetrics] = useState({
    total_open: 0,
    total_cancelled: 0,
    total_value_open: 0,
    cancellation_rate: 0,
    total_created_period: 0,
    revenue_period: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMetrics = async () => {
      const start = format(startOfMonth(new Date()), 'yyyy-MM-dd');
      const end = format(endOfMonth(new Date()), 'yyyy-MM-dd');
      
      try {
        const { data, error } = await supabase.rpc('get_dashboard_os_metrics', { p_start_date: start, p_end_date: end });
        if (error) throw error;
        setMetrics(data);
      } catch (error) {
        console.error("Error fetching OS metrics", error);
      } finally {
        setLoading(false);
      }
    };
    fetchMetrics();
  }, []);

  if (loading) return <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-pulse"><div className="h-32 bg-gray-100 rounded-xl"></div><div className="h-32 bg-gray-100 rounded-xl"></div><div className="h-32 bg-gray-100 rounded-xl"></div></div>;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <Card className="border-l-4 border-l-blue-500 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-gray-600">OS Abertas</CardTitle>
          <FileText className="h-4 w-4 text-blue-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{metrics.total_open}</div>
          <p className="text-xs text-muted-foreground">Total valor: {formatCurrency(metrics.total_value_open)}</p>
        </CardContent>
      </Card>

      <Card className="border-l-4 border-l-green-500 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-gray-600">Desempenho Mensal</CardTitle>
          <Activity className="h-4 w-4 text-green-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{metrics.total_created_period}</div>
          <p className="text-xs text-muted-foreground">OS criadas este mês</p>
          <div className="mt-1 text-sm font-semibold text-green-600">Receita: {formatCurrency(metrics.revenue_period)}</div>
        </CardContent>
      </Card>

      <Card className="border-l-4 border-l-red-500 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-gray-600">Cancelamentos</CardTitle>
          <Ban className="h-4 w-4 text-red-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{metrics.total_cancelled}</div>
          <p className="text-xs text-muted-foreground">Taxa global: {metrics.cancellation_rate}%</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default OSMetrics;