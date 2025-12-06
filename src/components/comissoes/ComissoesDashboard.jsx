import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { DollarSign, UserCheck, PieChart, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';

const formatCurrency = (value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);

const StatCard = ({ title, value, icon: Icon, colorClass, loading }) => (
  <div className="bg-white p-6 rounded-xl shadow-lg flex items-center justify-between">
    <div>
      <p className="text-sm font-medium text-gray-500">{title}</p>
      {loading ? <div className="h-8 w-32 bg-gray-200 rounded-md animate-pulse mt-1"></div> : <p className="text-2xl font-bold text-gray-800">{value}</p>}
    </div>
    <div className={`p-3 rounded-full ${colorClass}`}><Icon className="w-6 h-6 text-white" /></div>
  </div>
);

const ComissoesDashboard = ({ dateRange }) => {
  const { toast } = useToast();
  const [summary, setSummary] = useState({ total_paid: 0, total_pending: 0, mechanic_count: 0 });
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);

  const fetchData = useCallback(async () => {
    if (!dateRange.from || !dateRange.to) return;
    setLoading(true);
    try {
      const from = format(dateRange.from, 'yyyy-MM-dd');
      const to = format(dateRange.to, 'yyyy-MM-dd');
      
      const { data, error } = await supabase.rpc('get_commissions_summary', { period_start: from, period_end: to });
      if (error) throw error;
      
      const summaryData = data.reduce((acc, curr) => {
        if (curr.status === 'paid') {
          acc.total_paid += curr.total_commission;
        } else {
          acc.total_pending += curr.total_commission;
        }
        return acc;
      }, { total_paid: 0, total_pending: 0 });
      
      summaryData.mechanic_count = new Set(data.map(d => d.collaborator_id)).size;
      setSummary(summaryData);

    } catch (error) {
      toast({ title: "Erro ao carregar dashboard de comissões", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [dateRange, toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCalculateCommissions = async () => {
    setCalculating(true);
    try {
      const from = format(dateRange.from, 'yyyy-MM-dd');
      const to = format(dateRange.to, 'yyyy-MM-dd');
      const { error } = await supabase.rpc('calculate_and_store_commissions', { period_start: from, period_end: to });
      if (error) throw error;
      toast({ title: "Sucesso!", description: "Comissões calculadas e armazenadas para o período selecionado." });
      fetchData(); // Refresh data after calculation
    } catch (error) {
      toast({ title: "Erro ao calcular comissões", description: error.message, variant: "destructive" });
    } finally {
      setCalculating(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 mt-4 space-y-6">
       <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 p-4 border-l-4 border-blue-500 bg-blue-50 rounded-lg">
        <div>
          <h3 className="text-lg font-semibold text-gray-800">Calcular Comissões do Período</h3>
          <p className="text-sm text-gray-600">Clique no botão para processar as OS concluídas e pagas no período selecionado e gerar os registros de comissão. Esta ação substituirá qualquer cálculo anterior para o mesmo período.</p>
        </div>
        <Button onClick={handleCalculateCommissions} disabled={calculating}>
          {calculating ? 'Calculando...' : 'Calcular Comissões'}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <StatCard title="Comissões Pagas" value={formatCurrency(summary.total_paid)} icon={DollarSign} colorClass="bg-green-500" loading={loading} />
        <StatCard title="Comissões Pendentes" value={formatCurrency(summary.total_pending)} icon={AlertTriangle} colorClass="bg-yellow-500" loading={loading} />
        <StatCard title="Mecânicos com Comissão" value={summary.mechanic_count} icon={UserCheck} colorClass="bg-indigo-500" loading={loading} />
      </div>
    </div>
  );
};

export default ComissoesDashboard;