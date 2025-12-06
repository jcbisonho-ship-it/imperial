import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { format } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const formatCurrency = (value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);

const ChartContainer = ({ title, children, loading }) => (
    <div className="bg-white p-6 rounded-xl shadow-lg">
        <h3 className="text-lg font-semibold text-gray-700 mb-4">{title}</h3>
        <div className="h-96">
        {loading ? <div className="flex items-center justify-center h-full"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div> : children}
        </div>
    </div>
);

const RelatorioRH = ({ filters }) => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();

    const fetchData = useCallback(async () => {
        if (!filters.dateRange.from || !filters.dateRange.to) return;
        setLoading(true);
        try {
            const { data: reportData, error } = await supabase.rpc('get_hr_report', {
                p_start_date: format(filters.dateRange.from, 'yyyy-MM-dd'),
                p_end_date: format(filters.dateRange.to, 'yyyy-MM-dd'),
                p_collaborator_id: filters.collaboratorId
            });
            if (error) throw error;
            setData(reportData);
        } catch (error) {
            toast({ title: "Erro ao buscar relatório de RH", description: error.message, variant: "destructive" });
        } finally {
            setLoading(false);
        }
    }, [filters, toast]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-4">
            <ChartContainer title="Comissões Pagas por Mecânico" loading={loading}>
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data?.commissions_by_mechanic} layout="vertical" margin={{ top: 5, right: 20, left: 40, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" tickFormatter={formatCurrency} />
                        <YAxis type="category" width={100} dataKey="name" />
                        <Tooltip formatter={(value) => formatCurrency(value)} />
                        <Bar dataKey="value" name="Comissão Paga" fill="#8884d8" />
                    </BarChart>
                </ResponsiveContainer>
            </ChartContainer>

            <ChartContainer title="Produtividade (Lucro Gerado) por Mecânico" loading={loading}>
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data?.productivity_by_mechanic} layout="vertical" margin={{ top: 5, right: 20, left: 40, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" tickFormatter={formatCurrency} />
                        <YAxis type="category" width={100} dataKey="name" />
                        <Tooltip formatter={(value) => formatCurrency(value)} />
                        <Bar dataKey="value" name="Lucro Gerado" fill="#82ca9d" />
                    </BarChart>
                </ResponsiveContainer>
            </ChartContainer>
            
            <div className="lg:col-span-2 text-center p-4 bg-gray-50 rounded-lg">
                <h3 className="text-lg font-semibold text-gray-700 mb-2">Ranking de Performance & Horas Trabalhadas</h3>
                <p className="text-sm text-gray-500">Funcionalidades adicionais serão implementadas em uma futura atualização.</p>
            </div>
        </div>
    );
};

export default RelatorioRH;