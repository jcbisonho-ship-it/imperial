import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import KPICards from './KPICards';
import DailyAppointments from './DailyAppointments';
import LembretesWidget from './LembretesWidget';
import QuickActions from './QuickActions';
import Charts from './Charts'; 
import OSTimeline from './OSTimeline'; 
import OrcamentoDialog from '@/components/orcamentos/OrcamentoDialog';
import TransacaoDialog from '@/components/financeiro/TransacaoDialog';
import { startOfMonth, endOfMonth, format } from 'date-fns';
import { useToast } from '@/components/ui/use-toast';

// RESPONSIVE CONSTANTS
const CONTAINER_CLASS = "w-full p-4 sm:p-6 md:p-8 space-y-6";

const DashboardHome = () => {
  const [summaryData, setSummaryData] = useState({
      kpis: { revenue: 0, profit: 0, completed_os: 0, average_ticket: 0, conversion_rate: 0 },
      top_clients: [],
      top_mechanics: [],
      revenue_trend: []
  });
  const [loading, setLoading] = useState(true);
  
  const [isBudgetDialogOpen, setIsBudgetDialogOpen] = useState(false);
  const [isExpenseDialogOpen, setIsExpenseDialogOpen] = useState(false);
  
  const [refreshKey, setRefreshKey] = useState(0);
  const { toast } = useToast();

  // FIX: Memoize dateRange to prevent infinite loop
  const dateRange = useMemo(() => ({ 
    from: startOfMonth(new Date()), 
    to: endOfMonth(new Date()) 
  }), []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
       const { data, error } = await supabase.rpc('get_executive_summary', {
           p_start_date: format(dateRange.from, 'yyyy-MM-dd'),
           p_end_date: format(dateRange.to, 'yyyy-MM-dd')
       });
       
       if (data) setSummaryData(data);
       if (error) throw error;
       
    } catch (error) {
      console.error('Dashboard error:', error);
    } finally {
      setLoading(false);
    }
  }, [dateRange]); 

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleBudgetSave = () => {
    toast({ 
      title: "Orçamento criado com sucesso!", 
      description: "O dashboard foi atualizado com as novas informações." 
    });
    setIsBudgetDialogOpen(false); 
    setRefreshKey(prev => prev + 1);
    fetchData();
  };

  const handleExpenseSave = () => {
    toast({ 
      title: "Conta a pagar registrada!", 
      description: "O financeiro foi atualizado." 
    });
    setIsExpenseDialogOpen(false);
    setRefreshKey(prev => prev + 1);
    fetchData();
  };

  return (
    <div className={CONTAINER_CLASS}>
      <QuickActions 
        onNewBudget={() => setIsBudgetDialogOpen(true)} 
        onNewExpense={() => setIsExpenseDialogOpen(true)}
      />

      <KPICards data={summaryData.kpis} loading={loading} />
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <DailyAppointments key={refreshKey} />
          </div>
          <LembretesWidget />
      </div>

      {/* Charts component */}
      <Charts dateRange={dateRange} />

      {/* Timeline Component */}
      <OSTimeline />

      <OrcamentoDialog 
        isOpen={isBudgetDialogOpen} 
        onClose={() => setIsBudgetDialogOpen(false)} 
        onSave={handleBudgetSave}
        budget={null}
      />

      <TransacaoDialog
        isOpen={isExpenseDialogOpen}
        onClose={() => setIsExpenseDialogOpen(false)}
        onSaveSuccess={handleExpenseSave}
        defaultType="expense"
      />
    </div>
  );
};

export default DashboardHome;