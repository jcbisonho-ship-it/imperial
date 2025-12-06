import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { format } from 'date-fns';

const formatCurrency = (value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);

const ChartCard = ({ title, children, loading }) => (
  <div className="bg-white p-6 rounded-xl shadow-lg h-[400px] flex flex-col">
    <h3 className="text-lg font-semibold text-gray-700 mb-4">{title}</h3>
    <div className="flex-grow">
      {loading ? (
        <div className="flex items-center justify-center h-full">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          {children}
        </ResponsiveContainer>
      )}
    </div>
  </div>
);

const ComissoesCharts = ({ dateRange }) => {
  const { toast } = useToast();
  const [chartData, setChartData] = useState({ byMechanic: [], statusDistribution: [] });
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!dateRange.from || !dateRange.to) return;
    setLoading(true);
    try {
      const from = format(dateRange.from, 'yyyy-MM-dd');
      const to = format(dateRange.to, 'yyyy-MM-dd');
      
      const { data, error } = await supabase.rpc('get_commissions_summary', { period_start: from, period_end: to });
      if (error) throw error;
      
      const statusData = data.reduce((acc, curr) => {
        const key = curr.status === 'paid' ? 'Pagas' : 'Pendentes';
        const existing = acc.find(item => item.name === key);
        if (existing) {
          existing.value += curr.total_commission;
        } else {
          acc.push({ name: key, value: curr.total_commission });
        }
        return acc;
      }, []);

      const mechanicData = data.reduce((acc, curr) => {
        const key = curr.collaborator_name;
        const existing = acc.find(item => item.name === key);
        if(existing) {
            existing.total_commission += curr.total_commission;
        } else {
            acc.push({ name: key, total_commission: curr.total_commission });
        }
        return acc;
      }, []);
      
      setChartData({ byMechanic: mechanicData, statusDistribution: statusData });
    } catch (error) {
      toast({ title: "Erro ao carregar gráficos de comissões", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [dateRange, toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const PIE_COLORS = ['#22c55e', '#facc15'];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-4">
      <ChartCard title="Comissões por Mecânico" loading={loading}>
        <BarChart data={chartData.byMechanic} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis type="number" tickFormatter={formatCurrency} />
          <YAxis type="category" width={100} dataKey="name" />
          <Tooltip formatter={(value) => formatCurrency(value)} />
          <Legend />
          <Bar dataKey="total_commission" fill="#3b82f6" name="Comissão Total" />
        </BarChart>
      </ChartCard>
      <ChartCard title="Distribuição de Status" loading={loading}>
        <PieChart>
          <Pie data={chartData.statusDistribution} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={120} label>
            {chartData.statusDistribution.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip formatter={(value) => formatCurrency(value)} />
          <Legend />
        </PieChart>
      </ChartCard>
       <div className="lg:col-span-2 text-center p-4 bg-gray-50 rounded-lg">
         <h3 className="text-lg font-semibold text-gray-700 mb-2">Gráfico de Comissões ao Longo do Tempo</h3>
         <p className="text-sm text-gray-500">Este gráfico será implementado em uma futura atualização.</p>
      </div>
    </div>
  );
};

export default ComissoesCharts;