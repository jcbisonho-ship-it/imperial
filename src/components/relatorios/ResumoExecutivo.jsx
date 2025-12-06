import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { format } from 'date-fns';
import { DollarSign, Wrench, BarChart2, TrendingUp, Users, UserCheck } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';

const formatCurrency = (value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);

const StatCard = ({ title, value, icon: Icon, colorClass, loading }) => (
  <div className="bg-white p-4 rounded-xl shadow-lg flex items-center gap-4">
    <div className={`p-3 rounded-lg ${colorClass}`}><Icon className="w-6 h-6 text-white" /></div>
    <div>
      <p className="text-sm font-medium text-gray-500">{title}</p>
      {loading ? <div className="h-7 w-24 bg-gray-200 rounded-md animate-pulse mt-1"></div> : <p className="text-xl font-bold text-gray-800">{value}</p>}
    </div>
  </div>
);

const ChartContainer = ({ title, children, loading }) => (
    <div className="bg-white p-6 rounded-xl shadow-lg">
        <h3 className="text-lg font-semibold text-gray-700 mb-4">{title}</h3>
        <div className="h-72">
        {loading ? <div className="flex items-center justify-center h-full"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div> : children}
        </div>
    </div>
);

const ResumoExecutivo = ({ filters }) => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();

    const fetchData = useCallback(async () => {
        if (!filters.dateRange.from || !filters.dateRange.to) return;
        setLoading(true);
        try {
            const { data: reportData, error } = await supabase.rpc('get_executive_summary', {
                p_start_date: format(filters.dateRange.from, 'yyyy-MM-dd'),
                p_end_date: format(filters.dateRange.to, 'yyyy-MM-dd')
            });
            if (error) throw error;
            setData(reportData);
        } catch (error) {
            toast({ title: "Erro ao buscar resumo executivo", description: error.message, variant: "destructive" });
        } finally {
            setLoading(false);
        }
    }, [filters, toast]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);
    
    return (
        <div className="space-y-6 mt-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                <StatCard title="Faturamento" value={formatCurrency(data?.kpis.revenue)} icon={DollarSign} colorClass="bg-green-500" loading={loading} />
                <StatCard title="Lucro" value={formatCurrency(data?.kpis.profit)} icon={TrendingUp} colorClass="bg-blue-500" loading={loading} />
                <StatCard title="OS Concluídas" value={data?.kpis.completed_os || 0} icon={Wrench} colorClass="bg-indigo-500" loading={loading} />
                <StatCard title="Ticket Médio" value={formatCurrency(data?.kpis.average_ticket)} icon={BarChart2} colorClass="bg-yellow-500" loading={loading} />
                <StatCard title="Taxa de Conversão" value={`${(data?.kpis.conversion_rate || 0).toFixed(1)}%`} icon={UserCheck} colorClass="bg-pink-500" loading={loading} />
            </div>

            <ChartContainer title="Tendência de Faturamento" loading={loading}>
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data?.revenue_trend} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" tickFormatter={(d) => format(new Date(d), 'dd/MM')} />
                        <YAxis tickFormatter={formatCurrency}/>
                        <Tooltip formatter={(value) => formatCurrency(value)} />
                        <Legend />
                        <Line type="monotone" dataKey="revenue" name="Faturamento" stroke="#22c55e" strokeWidth={2} />
                    </LineChart>
                </ResponsiveContainer>
            </ChartContainer>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <ChartContainer title="Top 5 Clientes por Faturamento" loading={loading}>
                     <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data?.top_clients} layout="vertical" margin={{ top: 5, right: 20, left: 40, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis type="number" tickFormatter={formatCurrency} />
                            <YAxis type="category" width={100} dataKey="name" />
                            <Tooltip formatter={(value) => formatCurrency(value)} />
                            <Bar dataKey="value" name="Faturamento" fill="#8884d8" />
                        </BarChart>
                    </ResponsiveContainer>
                </ChartContainer>
                <ChartContainer title="Top 5 Mecânicos por OS Concluídas" loading={loading}>
                     <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data?.top_mechanics} layout="vertical" margin={{ top: 5, right: 20, left: 40, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis type="number" />
                            <YAxis type="category" width={100} dataKey="name" />
                            <Tooltip />
                            <Bar dataKey="value" name="OS Concluídas" fill="#82ca9d" />
                        </BarChart>
                    </ResponsiveContainer>
                </ChartContainer>
            </div>
        </div>
    );
};

export default ResumoExecutivo;