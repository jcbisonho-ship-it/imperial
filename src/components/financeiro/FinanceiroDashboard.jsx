import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { DollarSign, Landmark, ArrowUpCircle, ArrowDownCircle, PieChart, Banknote } from 'lucide-react';
import { startOfMonth, endOfMonth, format } from 'date-fns';
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';

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

const FinanceiroDashboard = () => {
  const { toast } = useToast();
  const [summary, setSummary] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    try {
      const now = new Date();
      const startDate = format(startOfMonth(now), 'yyyy-MM-dd');
      const endDate = format(endOfMonth(now), 'yyyy-MM-dd');

      const [summaryRes, accountsRes] = await Promise.all([
        supabase.rpc('get_financial_summary', { start_date: startDate, end_date: endDate }),
        supabase.rpc('get_account_balances')
      ]);

      if (summaryRes.error) throw summaryRes.error;
      if (accountsRes.error) throw accountsRes.error;

      setSummary(summaryRes.data);
      setAccounts(accountsRes.data);
    } catch (error) {
      toast({ title: "Erro ao carregar dashboard financeiro", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const dreData = [
    { name: 'Receita', value: summary?.total_revenue || 0, fill: '#22c55e' },
    { name: 'Custos', value: summary?.total_expenses || 0, fill: '#ef4444' },
    { name: 'Lucro', value: summary?.net_profit || 0, fill: '#3b82f6' },
  ];
  
  const cashFlowData = [
     { name: 'A Receber (Pendente)', value: summary?.receivables_pending || 0, fill: '#22c55e' },
     { name: 'A Receber (Atrasado)', value: summary?.receivables_overdue || 0, fill: '#facc15' },
     { name: 'A Pagar (Pendente)', value: summary?.payables_pending || 0, fill: '#ef4444' },
     { name: 'A Pagar (Atrasado)', value: summary?.payables_overdue || 0, fill: '#f97316' },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Receita do Mês" value={formatCurrency(summary?.total_revenue)} icon={ArrowUpCircle} colorClass="bg-green-500" loading={loading} />
        <StatCard title="Despesas do Mês" value={formatCurrency(summary?.total_expenses)} icon={ArrowDownCircle} colorClass="bg-red-500" loading={loading} />
        <StatCard title="Lucro Líquido do Mês" value={formatCurrency(summary?.net_profit)} icon={DollarSign} colorClass="bg-blue-500" loading={loading} />
        <StatCard title="Contas a Receber" value={formatCurrency((summary?.receivables_pending || 0) + (summary?.receivables_overdue || 0))} icon={Banknote} colorClass="bg-yellow-500" loading={loading} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-lg">
          <h3 className="text-lg font-semibold text-gray-700 mb-4">DRE Simplificado (Mês Atual)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={dreData} layout="vertical">
              <XAxis type="number" hide />
              <YAxis type="category" dataKey="name" width={80} stroke="#4b5563" />
              <Tooltip formatter={(value) => formatCurrency(value)} cursor={{ fill: '#f3f4f6' }} />
              <Bar dataKey="value" barSize={35} radius={[0, 5, 5, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-lg">
          <h3 className="text-lg font-semibold text-gray-700 mb-4">Saldos em Contas</h3>
          {loading ? Array(3).fill(0).map((_, i) => <div key={i} className="h-10 bg-gray-200 rounded-md animate-pulse mb-2"></div>) : (
            <div className="space-y-4">
              {accounts.map(account => (
                <div key={account.id} className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <Landmark className="w-5 h-5 text-gray-500" />
                    <span className="font-medium text-gray-800">{account.name}</span>
                  </div>
                  <span className="font-semibold text-gray-900">{formatCurrency(account.current_balance)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      
       <div className="bg-white p-6 rounded-xl shadow-lg">
          <h3 className="text-lg font-semibold text-gray-700 mb-4">Fluxo de Caixa Futuro (Pendente/Atrasado)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={cashFlowData}>
              <XAxis dataKey="name" stroke="#4b5563" />
              <YAxis hide />
              <Tooltip formatter={(value) => formatCurrency(value)} cursor={{ fill: '#f3f4f6' }} />
              <Bar dataKey="value" barSize={60} radius={[5, 5, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
    </div>
  );
};

export default FinanceiroDashboard;