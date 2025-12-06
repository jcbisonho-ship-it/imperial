import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { subDays, format } from 'date-fns';

const COLORS = ['#FFBB28', '#00C49F', '#8884d8', '#0088FE', '#FF8042'];

const statusLabels = {
  pending: 'Pendente',
  in_progress: 'Em Andamento',
  awaiting_payment: 'Aguardando Pagamento',
  completed: 'Concluída',
  canceled: 'Cancelada',
};

const ServiceOrdersReports = () => {
  const [reportData, setReportData] = useState({ byStatus: [], byTechnician: [], timeline: [] });
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchReportData = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('work_orders').select('status, order_date, technician_id, technician:collaborators(name)');
      if (error) throw error;

      // 1. By Status
      const statusCounts = data.reduce((acc, order) => {
        const statusKey = order.status || 'unknown';
        acc[statusKey] = (acc[statusKey] || 0) + 1;
        return acc;
      }, {});
      const byStatus = Object.entries(statusCounts).map(([name, value]) => ({ name: statusLabels[name] || name, value }));

      // 2. By Technician
      const techCounts = data.reduce((acc, order) => {
        const techName = order.technician?.name || 'Não Atribuído';
        acc[techName] = (acc[techName] || 0) + 1;
        return acc;
      }, {});
      const byTechnician = Object.entries(techCounts).map(([name, OS_Count]) => ({ name, OS_Count }));

      // 3. Timeline (last 30 days)
      const timelineData = {};
      for (let i = 29; i >= 0; i--) {
        const date = subDays(new Date(), i);
        const formattedDate = format(date, 'yyyy-MM-dd');
        timelineData[formattedDate] = { name: format(date, 'dd/MM'), count: 0 };
      }
      data.forEach(order => {
        const orderDate = order.order_date;
        if (orderDate && timelineData[orderDate]) {
          timelineData[orderDate].count++;
        }
      });
      const timeline = Object.values(timelineData);

      setReportData({ byStatus, byTechnician, timeline });
    } catch (error) {
      toast({ title: "Erro ao gerar relatórios", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchReportData();
  }, [fetchReportData]);

  if (loading) {
    return <div className="p-6 text-center">Carregando relatórios...</div>;
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-4">
      <div className="bg-white p-6 rounded-xl shadow-lg">
        <h3 className="font-semibold text-lg mb-4">Ordens de Serviço por Status</h3>
        {reportData.byStatus.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={reportData.byStatus} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} fill="#8884d8" label>
                {reportData.byStatus.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        ) : <p className="text-center text-gray-500">Sem dados para exibir.</p>}
      </div>
      <div className="bg-white p-6 rounded-xl shadow-lg">
        <h3 className="font-semibold text-lg mb-4">Ordens de Serviço por Técnico</h3>
        {reportData.byTechnician.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={reportData.byTechnician} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Legend />
              <Bar dataKey="OS_Count" fill="#82ca9d" name="Nº de OS" />
            </BarChart>
          </ResponsiveContainer>
        ) : <p className="text-center text-gray-500">Sem dados para exibir.</p>}
      </div>
      <div className="bg-white p-6 rounded-xl shadow-lg lg:col-span-2">
        <h3 className="font-semibold text-lg mb-4">Linha do Tempo de OS (Últimos 30 dias)</h3>
        {reportData.timeline.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={reportData.timeline} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="count" stroke="#8884d8" name="Nº de OS" />
            </LineChart>
          </ResponsiveContainer>
        ) : <p className="text-center text-gray-500">Sem dados para exibir.</p>}
      </div>
    </div>
  );
};

export default ServiceOrdersReports;