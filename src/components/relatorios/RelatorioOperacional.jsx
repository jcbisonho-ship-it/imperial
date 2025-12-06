import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { format } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const ChartContainer = ({ title, children, loading }) => (
    <div className="bg-white p-6 rounded-xl shadow-lg">
        <h3 className="text-lg font-semibold text-gray-700 mb-4">{title}</h3>
        <div className="h-80">
        {loading ? <div className="flex items-center justify-center h-full"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div> : children}
        </div>
    </div>
);

const StatCard = ({ title, value, loading }) => (
    <div className="bg-white p-6 rounded-xl shadow-lg text-center">
        <p className="text-sm font-medium text-gray-500">{title}</p>
        {loading ? <div className="h-8 w-20 mx-auto bg-gray-200 rounded-md animate-pulse mt-2"></div> : <p className="text-3xl font-bold text-gray-800 mt-1">{value}</p>}
    </div>
);


const RelatorioOperacional = ({ filters }) => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();

    const fetchData = useCallback(async () => {
        if (!filters.dateRange.from || !filters.dateRange.to) return;
        setLoading(true);
        try {
            const { data: reportData, error } = await supabase.rpc('get_operational_report', {
                p_start_date: format(filters.dateRange.from, 'yyyy-MM-dd'),
                p_end_date: format(filters.dateRange.to, 'yyyy-MM-dd'),
                p_collaborator_id: filters.collaboratorId,
                p_status: filters.status,
            });
            if (error) throw error;
            setData(reportData);
        } catch (error) {
            toast({ title: "Erro ao buscar relatório operacional", description: error.message, variant: "destructive" });
        } finally {
            setLoading(false);
        }
    }, [filters, toast]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);
    
    const PIE_COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];
    
    return (
        <div className="space-y-6 mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                 <ChartContainer title="OS por Status" loading={loading}>
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie data={data?.os_by_status} dataKey="value" nameKey="status" cx="50%" cy="50%" outerRadius={80} label>
                                {data?.os_by_status?.map((entry, index) => <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />)}
                            </Pie>
                            <Tooltip />
                            <Legend />
                        </PieChart>
                    </ResponsiveContainer>
                </ChartContainer>
                
                 <div className="space-y-6">
                    <StatCard title="Tempo Médio de Execução" value={`${(data?.avg_execution_time_days || 0).toFixed(1)} dias`} loading={loading} />
                     <StatCard title="Taxa de Retrabalho" value="N/A" loading={loading} />
                 </div>

                 <ChartContainer title="Top 10 Produtos/Serviços Usados" loading={loading}>
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data?.top_products} layout="vertical" margin={{ top: 5, right: 20, left: 50, bottom: 5 }}>
                            <XAxis type="number" />
                            <YAxis type="category" width={100} dataKey="name" tick={{ fontSize: 12 }}/>
                            <Tooltip />
                            <Bar dataKey="value" name="Quantidade" fill="#82ca9d" />
                        </BarChart>
                    </ResponsiveContainer>
                </ChartContainer>

                <ChartContainer title="Top 5 Veículos Atendidos" loading={loading}>
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data?.top_vehicles} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                             <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis />
                            <Tooltip />
                            <Bar dataKey="value" name="Nº de Atendimentos" fill="#FFBB28" />
                        </BarChart>
                    </ResponsiveContainer>
                </ChartContainer>
            </div>
        </div>
    );
};

export default RelatorioOperacional;