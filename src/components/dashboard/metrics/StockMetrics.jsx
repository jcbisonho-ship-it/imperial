import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/lib/customSupabaseClient';
import { formatCurrency } from '@/lib/utils';
import { PackageMinus, ShoppingBag } from 'lucide-react';
import { startOfMonth, endOfMonth, format } from 'date-fns';

const StockMetrics = () => {
  const [metrics, setMetrics] = useState({
    total_items_deducted: 0,
    total_value_deducted: 0,
    top_products: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMetrics = async () => {
      const start = format(startOfMonth(new Date()), 'yyyy-MM-dd');
      const end = format(endOfMonth(new Date()), 'yyyy-MM-dd');
      try {
        const { data, error } = await supabase.rpc('get_dashboard_stock_metrics', { p_start_date: start, p_end_date: end });
        if (error) throw error;
        setMetrics(data);
      } catch (error) {
        console.error("Error fetching stock metrics", error);
      } finally {
        setLoading(false);
      }
    };
    fetchMetrics();
  }, []);

  if (loading) return <div className="h-32 bg-gray-100 rounded-xl animate-pulse"></div>;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Card className="border-l-4 border-l-purple-500 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-gray-600">Movimentação Mensal (Saída)</CardTitle>
          <PackageMinus className="h-4 w-4 text-purple-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{metrics.total_items_deducted} Itens</div>
          <p className="text-xs text-muted-foreground">Custo estimado: {formatCurrency(metrics.total_value_deducted)}</p>
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-gray-600">Top 5 Produtos (Mês)</CardTitle>
          <ShoppingBag className="h-4 w-4 text-gray-400" />
        </CardHeader>
        <CardContent>
          <ul className="space-y-1">
            {metrics.top_products.length > 0 ? (
                metrics.top_products.map((p, i) => (
                    <li key={i} className="text-xs flex justify-between">
                        <span className="truncate max-w-[180px]">{p.name}</span>
                        <span className="font-bold text-purple-600">{p.value} un</span>
                    </li>
                ))
            ) : (
                <li className="text-xs text-gray-400">Sem movimentação.</li>
            )}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};

export default StockMetrics;