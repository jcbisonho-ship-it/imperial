import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { supabase } from '@/lib/customSupabaseClient';
import { subDays, startOfDay, endOfDay, formatISO } from 'date-fns';
import { useToast } from '@/components/ui/use-toast';

const filters = [
  { label: "Último dia", days: 1 },
  { label: "Últimos 7 dias", days: 7 },
  { label: "Últimos 30 dias", days: 30 },
  // { label: "Intervalo personalizado", days: 0 },
];

const ProductivityChart = ({ refreshTrigger }) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeFilter, setActiveFilter] = useState(7); // default to 7 days
  const { toast } = useToast();

  const fetchProductivityData = useCallback(async (days) => {
    setLoading(true);
    try {
      const endDate = endOfDay(new Date());
      const startDate = startOfDay(subDays(endDate, days - 1));

      const { data: result, error } = await supabase.rpc('get_mechanic_productivity', {
        start_date: formatISO(startDate),
        end_date: formatISO(endDate)
      });
      
      if (error) throw error;
      
      setData(result || []);
    } catch (error) {
      toast({
        title: "Erro ao buscar dados de produtividade",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);
  
  useEffect(() => {
    fetchProductivityData(activeFilter);
  }, [activeFilter, fetchProductivityData, refreshTrigger]);

  const handleFilterChange = (days) => {
    if (days === 0) {
      toast({ title: "Filtro personalizado ainda não implementado."});
    } else {
      setActiveFilter(days);
    }
  };
  
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <CardTitle>Produtividade (Mão de Obra)</CardTitle>
          <div className="flex items-center gap-2">
            {filters.map(filter => (
              <Button
                key={filter.days}
                variant={activeFilter === filter.days ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleFilterChange(filter.days)}
              >
                {filter.label}
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div style={{ height: '350px' }}>
          {loading ? (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground">Carregando gráfico...</div>
          ) : data.length === 0 ? (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground">Nenhum dado de produtividade no período.</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" tickFormatter={(value) => `R$ ${value}`} />
                <YAxis dataKey="mechanic_name" type="category" width={100} />
                <Tooltip formatter={(value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)} />
                <Bar dataKey="labor_total" fill="#3b82f6" name="Total M.O." barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default ProductivityChart;