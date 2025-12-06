import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/lib/customSupabaseClient';
import { 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  isSameDay, 
  parseISO, 
  format 
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { TrendingUp } from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';

const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-white p-3 border border-slate-200 shadow-lg rounded-lg text-xs min-w-[150px]">
        <p className="font-bold text-slate-800 mb-2 border-b pb-1">{data.fullDate}</p>
        
        {data.amount > 0 ? (
          <div className="space-y-1">
            <p className="text-slate-600 flex justify-between">
              <span>Quantidade:</span>
              <span className="font-semibold">{data.count} OS(s)</span>
            </p>
            <p className="text-emerald-600 flex justify-between items-center font-bold text-sm pt-1">
              <span>Total:</span>
              <span>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(data.amount)}</span>
            </p>
          </div>
        ) : (
          <p className="text-slate-400 italic text-center py-1">Sem vendas neste dia</p>
        )}
      </div>
    );
  }
  return null;
};

const OSTimeline = () => {
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalRevenue, setTotalRevenue] = useState(0);

  useEffect(() => {
    const fetchOS = async () => {
      const now = new Date();
      const start = startOfMonth(now);
      const end = endOfMonth(now);

      // Buscar dados do Supabase
      const { data, error } = await supabase
        .from('service_orders')
        .select('created_at, total_amount')
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString());

      if (error) {
        console.error('Error fetching OS timeline chart:', error);
        setLoading(false);
        return;
      }

      // 1. Gerar array com todos os dias do mês
      const daysInMonth = eachDayOfInterval({ start, end });

      // 2. Agrupar dados por dia
      const rawData = data || [];
      
      const processedData = daysInMonth.map(day => {
        // Filtrar OS deste dia específico
        const dayOS = rawData.filter(os => isSameDay(parseISO(os.created_at), day));
        
        // Calcular totais do dia
        const dailyTotal = dayOS.reduce((acc, os) => acc + Number(os.total_amount), 0);

        return {
          date: format(day, 'dd'), // Eixo X (apenas o dia)
          fullDate: format(day, "dd 'de' MMMM", { locale: ptBR }), // Para tooltip
          amount: dailyTotal,
          count: dayOS.length,
          originalDate: day
        };
      });

      // Calcular receita total do mês
      const total = processedData.reduce((acc, curr) => acc + curr.amount, 0);
      
      setChartData(processedData);
      setTotalRevenue(total);
      setLoading(false);
    };

    fetchOS();
  }, []);

  const formatCurrencyAxis = (value) => {
    if (value >= 1000) return `${(value / 1000).toFixed(1)}k`;
    return value;
  };

  return (
    <Card className="w-full mt-6">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-emerald-600" /> 
            Faturamento Diário (Mês Atual)
          </CardTitle>
          <div className="text-right">
            <p className="text-xs text-muted-foreground font-medium uppercase">Total Acumulado</p>
            <p className="text-lg font-bold text-emerald-600">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalRevenue)}
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="h-[300px] w-full pt-4">
        {loading ? (
           <div className="flex items-center justify-center h-full">
             <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
           </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis 
                dataKey="date" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#64748b', fontSize: 12 }}
                dy={10}
                interval="preserveStartEnd" // Garante que dias importantes não sumam
                minTickGap={15} // Evita sobreposição de dias
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#64748b', fontSize: 12 }}
                tickFormatter={formatCurrencyAxis}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#10b981', strokeWidth: 1, strokeDasharray: '4 4' }} />
              <Line 
                type="monotone" 
                dataKey="amount" 
                stroke="#10b981" 
                strokeWidth={1} /* Alterado de 2 para 1 */
                dot={{ r: 3, fill: "#10b981", strokeWidth: 2, stroke: "#fff" }}
                activeDot={{ r: 6, fill: "#059669", stroke: "#fff", strokeWidth: 2 }}
                animationDuration={1500}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
};

export default OSTimeline;