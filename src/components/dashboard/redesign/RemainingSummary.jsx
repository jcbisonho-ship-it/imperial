import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { supabase } from '@/lib/customSupabaseClient';
import { DollarSign } from 'lucide-react';
import { Link } from 'react-router-dom';

const DailyFinancials = ({ data, loading }) => (
  <Card>
    <CardHeader><CardTitle className="text-base flex items-center gap-2"><DollarSign className="w-4 h-4"/> Contas do Dia</CardTitle></CardHeader>
    <CardContent className="flex flex-col justify-between h-60">
      {loading ? <p>Carregando...</p> : (
        <>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Recebimentos previstos</p>
              <p className="text-2xl font-bold text-green-600">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(data.recebimentos)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Pagamentos previstos</p>
              <p className="text-2xl font-bold text-red-600">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(data.pagamentos)}</p>
            </div>
          </div>
          <Link to="/financeiro" className="w-full">
            <Button variant="secondary" className="w-full">
              Ir para o Financeiro
            </Button>
          </Link>
        </>
      )}
    </CardContent>
  </Card>
);

const RemainingSummary = ({ refreshTrigger }) => {
  const [summaryData, setSummaryData] = React.useState({
    financeiro: { recebimentos: 0, pagamentos: 0 }
  });
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const todayStr = format(new Date(), 'yyyy-MM-dd');
      try {
        const { data: financeiro, error } = await supabase.rpc('get_daily_financials', { p_date: todayStr });
        
        if (error) throw error;

        setSummaryData({
          financeiro: financeiro
        });
      } catch (error) {
        console.error("Error fetching remaining summary data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [refreshTrigger]);

  return (
    <DailyFinancials data={summaryData.financeiro} loading={loading} />
  );
};

export default RemainingSummary;