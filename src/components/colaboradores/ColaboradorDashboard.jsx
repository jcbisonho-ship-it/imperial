import React, { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import { Wrench, DollarSign, Clock, Trophy, X } from 'lucide-react';
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, format, eachDayOfInterval } from 'date-fns';
import { Button } from '@/components/ui/button';

const formatCurrency = (value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);

const StatCard = ({ title, value, icon: Icon, color, loading }) => (
  <div className="bg-white p-4 rounded-xl shadow-sm border flex items-center justify-between">
    <div>
      <p className="text-sm font-medium text-gray-500">{title}</p>
      {loading ? <div className="h-7 w-20 bg-gray-200 rounded-md animate-pulse mt-1"></div> : <p className="text-2xl font-bold text-gray-800">{value}</p>}
    </div>
    <div className={`p-3 rounded-full ${color}`}><Icon className="w-5 h-5 text-white" /></div>
  </div>
);

const ColaboradorDashboard = ({ isOpen, onClose, collaboratorId }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchData = useCallback(async () => {
    if (!collaboratorId) return;
    setLoading(true);
    try {
      const { data: collab, error: collabErr } = await supabase.from('collaborators').select('*').eq('id', collaboratorId).single();
      if (collabErr) throw collabErr;

      const now = new Date();
      const weekStart = startOfWeek(now);
      const weekEnd = endOfWeek(now);
      const monthStart = startOfMonth(now);
      const monthEnd = endOfMonth(now);

      const { data: osItems, error: osItemsErr } = await supabase
        .from('work_order_items')
        .select('*, work_orders!inner(status, completion_date, created_at)')
        .eq('collaborator_id', collaboratorId)
        .eq('work_orders.status', 'completed');
      if (osItemsErr) throw osItemsErr;

      const completedThisWeek = osItems.filter(item => new Date(item.work_orders.completion_date) >= weekStart && new Date(item.work_orders.completion_date) <= weekEnd);
      const completedThisMonth = osItems.filter(item => new Date(item.work_orders.completion_date) >= monthStart && new Date(item.work_orders.completion_date) <= monthEnd);

      const uniqueOsWeek = new Set(completedThisWeek.map(i => i.work_order_id)).size;
      const uniqueOsMonth = new Set(completedThisMonth.map(i => i.work_order_id)).size;

      const profitThisMonth = completedThisMonth.reduce((acc, item) => acc + (item.total_price - (item.cost_price * item.quantity)), 0);
      
      const totalTimeMs = osItems.reduce((acc, item) => {
        const completion = new Date(item.work_orders.completion_date);
        const creation = new Date(item.work_orders.created_at);
        return acc + (completion.getTime() - creation.getTime());
      }, 0);
      const avgTimeHours = osItems.length > 0 ? (totalTimeMs / osItems.length / 1000 / 3600) : 0;
      
      const profitByDay = completedThisMonth.reduce((acc, item) => {
          const day = format(new Date(item.work_orders.completion_date), 'dd/MM');
          const profit = item.total_price - (item.cost_price * item.quantity);
          if(!acc[day]) acc[day] = { date: day, lucro: 0 };
          acc[day].lucro += profit;
          return acc;
      }, {});
      
      const allMonthDays = eachDayOfInterval({ start: monthStart, end: monthEnd });
      const chartData = allMonthDays.map(day => {
          const formatted = format(day, 'dd/MM');
          return { date: formatted, lucro: profitByDay[formatted]?.lucro || 0 };
      });
      
      setData({
        collaborator: collab,
        osWeek: uniqueOsWeek,
        osMonth: uniqueOsMonth,
        profitMonth: profitThisMonth,
        avgTime: avgTimeHours.toFixed(1) + 'h',
        chartData
      });

    } catch (error) {
      toast({ title: 'Erro ao carregar dashboard', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [collaboratorId, toast]);

  useEffect(() => {
    if (isOpen) fetchData();
  }, [isOpen, fetchData]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-full h-full max-w-none sm:w-3/4 sm:max-w-none md:w-full md:h-full rounded-none sm:rounded-lg flex flex-col p-0 gap-0 bg-white">
        <DialogHeader className="p-4 sm:p-6 border-b flex-none flex-row justify-between items-start">
          <div>
            <DialogTitle className="text-lg sm:text-xl">Dashboard do Colaborador</DialogTitle>
            {data && <DialogDescription className="text-base sm:text-sm">{data.collaborator.name}</DialogDescription>}
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="-mt-2 -mr-2 sm:mt-0 sm:mr-0"><X className="w-5 h-5" /></Button>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-gray-50/50">
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard title="OS Concluídas (Semana)" value={data?.osWeek} icon={Wrench} color="bg-blue-500" loading={loading} />
              <StatCard title="OS Concluídas (Mês)" value={data?.osMonth} icon={Wrench} color="bg-indigo-500" loading={loading} />
              <StatCard title="Lucro Gerado (Mês)" value={formatCurrency(data?.profitMonth)} icon={DollarSign} color="bg-green-500" loading={loading} />
              <StatCard title="Tempo Médio por OS" value={data?.avgTime} icon={Clock} color="bg-yellow-500" loading={loading} />
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border h-[400px]">
              <h3 className="text-lg font-semibold text-gray-700 mb-4">Lucro Gerado por Dia (Mês Atual)</h3>
              {loading ? <div className="flex items-center justify-center h-full"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div> :
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data?.chartData} margin={{ top: 5, right: 20, left: -10, bottom: 50 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="date" angle={-45} textAnchor="end" height={60} tick={{fontSize: 12}} />
                  <YAxis tickFormatter={formatCurrency} tick={{fontSize: 12}} />
                  <Tooltip formatter={(value) => formatCurrency(value)} />
                  <Legend />
                  <Line type="monotone" dataKey="lucro" stroke="#82ca9d" strokeWidth={3} dot={{r: 4}} name="Lucro (R$)" />
                </LineChart>
              </ResponsiveContainer>}
            </div>
            <div className="text-center p-6 bg-blue-50 rounded-lg border border-blue-100">
               <h3 className="text-lg font-semibold text-blue-800 mb-2">Metas e Gamificação</h3>
               <p className="text-sm text-blue-600">O sistema de ranking e metas mensais será ativado em breve. Continue com o bom trabalho!</p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ColaboradorDashboard;