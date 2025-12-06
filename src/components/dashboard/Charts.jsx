import React, { useState, useEffect, useCallback } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList } from 'recharts';
import { supabase } from '@/lib/customSupabaseClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatISO } from 'date-fns';

const ChartContainer = ({ title, children, loading }) => (
  <Card>
    <CardHeader>
      <CardTitle className="text-base font-semibold">{title}</CardTitle>
    </CardHeader>
    <CardContent className="h-[300px] w-full">
      {loading ? (
        <div className="flex items-center justify-center h-full">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          {children}
        </ResponsiveContainer>
      )}
    </CardContent>
  </Card>
);

const Charts = ({ dateRange }) => {
  const [productivityData, setProductivityData] = useState([]);
  const [osRevenueData, setOsRevenueData] = useState([]);
  const [loading, setLoading] = useState(true);

  const formatCurrency = (value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  const formatCurrencyShort = (value) => `R$${(value/1000).toFixed(1)}k`; // Formatter specifically for top labels if space is tight, but full currency is requested usually.
  // Let's use full currency for labels but maybe small font
  const formatCurrencyLabel = (value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(value);

  const fetchChartData = useCallback(async () => {
    setLoading(true);
    try {
      const from = dateRange.from;
      const to = dateRange.to;

      // 1. Fetch Productivity (Chart 1 - Torres/Bar Chart)
      const { data: prodData, error: prodError } = await supabase.rpc('get_mechanic_productivity', {
        start_date: formatISO(from, { representation: 'date' }),
        end_date: formatISO(to, { representation: 'date' })
      });
      
      if (prodError) throw prodError;
      setProductivityData(prodData || []);

      // 2. Fetch OS Revenue Generated (Chart 2 - Bar Chart)
      const { data: osData, error: osError } = await supabase
        .from('service_orders')
        .select('created_at, total_amount')
        .gte('created_at', formatISO(from))
        .lte('created_at', formatISO(to));

      if (osError) throw osError;

      const aggregated = osData.reduce((acc, curr) => {
        const key = curr.created_at.split('T')[0];
        acc[key] = (acc[key] || 0) + Number(curr.total_amount);
        return acc;
      }, {});

      const sortedKeys = Object.keys(aggregated).sort();
      
      const revenueData = sortedKeys.map(key => {
         const [year, month, day] = key.split('-');
         return {
             date: `${day}/${month}`, 
             amount: aggregated[key]
         };
      });

      setOsRevenueData(revenueData);

    } catch (error) {
      console.error("Error fetching chart data:", error);
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  useEffect(() => {
    fetchChartData();
  }, [fetchChartData]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Productivity of Collaborators (Vertical Bars / Torres) */}
        <ChartContainer title="Produtividade dos Colaboradores" loading={loading}>
             {productivityData.length === 0 ? (
                <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                  Sem dados de produtividade no período.
                </div>
             ) : (
                <BarChart data={productivityData} margin={{ top: 20, right: 20, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="mechanic_name" fontSize={12} tickLine={false} axisLine={false} />
                    {/* YAxis hidden as requested */}
                    <YAxis hide />
                    <Tooltip formatter={(value) => formatCurrency(value)} cursor={{fill: 'transparent'}} />
                    <Bar dataKey="labor_total" fill="#3b82f6" name="Total M.O." radius={[4, 4, 0, 0]}>
                      <LabelList 
                        dataKey="labor_total" 
                        position="top" 
                        formatter={(value) => formatCurrencyLabel(value)}
                        style={{ fill: '#64748b', fontSize: '11px', fontWeight: 500 }} 
                      />
                    </Bar>
                </BarChart>
             )}
        </ChartContainer>

        {/* Chart 2: Gross Revenue of Generated OS (Bar Chart) */}
        <ChartContainer title="Faturamento Bruto de OS Geradas" loading={loading}>
             {osRevenueData.length === 0 ? (
                <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                  Nenhuma OS gerada no período.
                </div>
             ) : (
                <BarChart data={osRevenueData} margin={{ top: 20, right: 20, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="date" fontSize={12} tickLine={false} axisLine={false} />
                    {/* YAxis hidden as requested */}
                    <YAxis hide />
                    <Tooltip formatter={(value) => formatCurrency(value)} cursor={{fill: 'transparent'}} />
                    <Bar dataKey="amount" fill="#10b981" name="Faturamento" radius={[4, 4, 0, 0]}>
                      <LabelList 
                        dataKey="amount" 
                        position="top" 
                        formatter={(value) => formatCurrencyLabel(value)}
                        style={{ fill: '#64748b', fontSize: '11px', fontWeight: 500 }}
                      />
                    </Bar>
                </BarChart>
             )}
        </ChartContainer>
    </div>
  );
};

export default Charts;