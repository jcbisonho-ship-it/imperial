import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { format } from 'date-fns';
import { DollarSign, TrendingUp, TrendingDown, AlertCircle as CircleAlert, Landmark } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';

const formatCurrency = (value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);

const ChartContainer = ({ title, children, loading }) => (
    <div className="bg-white p-6 rounded-xl shadow-lg">
        <h3 className="text-lg font-semibold text-gray-700 mb-4">{title}</h3>
        <div className="h-80">
        {loading ? <div className="flex items-center justify-center h-full"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div> : children}
        </div>
    </div>
);

const StatCard = ({ title, value, icon: Icon, colorClass, loading }) => (
  <div className="bg-white p-4 rounded-xl shadow-lg flex items-center gap-4">
    <div className={`p-3 rounded-lg ${colorClass}`}><Icon className="w-6 h-6 text-white" /></div>
    <div>
      <p className="text-sm font-medium text-gray-500">{title}</p>
      {loading ? <div className="h-7 w-24 bg-gray-200 rounded-md animate-pulse mt-1"></div> : <p className="text-xl font-bold text-gray-800">{value}</p>}
    </div>
  </div>
);

const RelatorioFinanceiro = ({ filters }) => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();

    const fetchData = useCallback(async () => {
        if (!filters.dateRange.from || !filters.dateRange.to) return;
        setLoading(true);
        try {
            const { data: reportData, error } = await supabase.rpc('get_financial_report', {
                p_start_date: format(filters.dateRange.from, 'yyyy-MM-dd'),
                p_end_date: format(filters.dateRange.to, 'yyyy-MM-dd')
            });
            if (error) throw error;
            setData(reportData);
        } catch (error) {
            toast({ title: "Erro ao buscar relatório financeiro", description: error.message, variant: "destructive" });
        } finally {
            setLoading(false);
        }
    }, [filters, toast]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);
    
    return (
        <div className="space-y-6 mt-4">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <StatCard title="Contas a Receber Vencidas" value={formatCurrency(data?.overdue_receivables)} icon={TrendingDown} colorClass="bg-red-500" loading={loading} />
                <StatCard title="Contas a Pagar Vencidas" value={formatCurrency(data?.overdue_payables)} icon={TrendingDown} colorClass="bg-orange-500" loading={loading} />
            </div>

            <ChartContainer title="Receita vs Custos vs Lucro" loading={loading}>
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data?.revenue_trend} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" tickFormatter={(d) => format(new Date(d), 'dd/MM')} />
                        <YAxis tickFormatter={formatCurrency}/>
                        <Tooltip formatter={(value) => formatCurrency(value)} />
                        <Legend />
                        <Line type="monotone" dataKey="revenue" name="Receita" stroke="#22c55e" />
                        <Line type="monotone" dataKey="expense" name="Custo" stroke="#ef4444" />
                        <Line type="monotone" dataKey="profit" name="Lucro" stroke="#3b82f6" strokeWidth={2} />
                    </LineChart>
                </ResponsiveContainer>
            </ChartContainer>

            <ChartContainer title="Custos por Categoria" loading={loading}>
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data?.costs_by_category} layout="vertical" margin={{ top: 5, right: 20, left: 40, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" tickFormatter={formatCurrency} />
                        <YAxis type="category" width={120} dataKey="name" />
                        <Tooltip formatter={(value) => formatCurrency(value)} />
                        <Bar dataKey="value" name="Custo" fill="#ef4444" />
                    </BarChart>
                </ResponsiveContainer>
            </ChartContainer>
        </div>
    );
};

export default RelatorioFinanceiro;