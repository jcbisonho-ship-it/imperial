import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/lib/customSupabaseClient';
import { Eye, Calculator } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { Badge } from '@/components/ui/badge';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import ComissaoDialog from './ComissaoDialog';

// RESPONSIVE CONSTANTS
const CONTAINER_CLASS = "w-full p-4 sm:p-6 md:p-8 space-y-6";
const HEADER_CLASS = "flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4";
const BUTTON_CLASS = "w-full sm:w-auto";

const ComissoesList = () => {
  const [commissions, setCommissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({ from: startOfMonth(new Date()), to: endOfMonth(new Date()) });
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedCommission, setSelectedCommission] = useState(null);
  const { toast } = useToast();

  const fetchCommissions = useCallback(async () => {
    if (!dateRange?.from || !dateRange?.to) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_commissions_summary', {
        period_start: format(dateRange.from, 'yyyy-MM-dd'),
        period_end: format(dateRange.to, 'yyyy-MM-dd')
      });
      if (error) throw error;
      setCommissions(data || []);
    } catch (error) {
      toast({ title: 'Erro ao buscar comissões', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [dateRange, toast]);

  useEffect(() => {
    fetchCommissions();
  }, [fetchCommissions]);

  const handleCalculate = async () => {
    setLoading(true);
    try {
       const { error } = await supabase.rpc('calculate_and_store_commissions', {
         period_start: format(dateRange.from, 'yyyy-MM-dd'),
         period_end: format(dateRange.to, 'yyyy-MM-dd')
       });
       if(error) throw error;
       toast({ title: 'Comissões calculadas com sucesso!' });
       fetchCommissions();
    } catch (error) {
        toast({ title: 'Erro ao calcular', description: error.message, variant: 'destructive' });
        setLoading(false);
    }
  };

  const openDialog = (commission) => {
    setSelectedCommission(commission);
    setIsDialogOpen(true);
  };

  return (
    <div className={CONTAINER_CLASS}>
      <div className={HEADER_CLASS}>
        <div>
           <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">Comissões</h1>
           <p className="text-gray-500 mt-1 text-sm sm:text-base">Relatório e cálculo de comissões.</p>
        </div>
        <Button onClick={handleCalculate} disabled={loading} className={BUTTON_CLASS}>
          <Calculator className="mr-2 h-4 w-4" /> Recalcular Período
        </Button>
      </div>

      <div className="bg-white p-4 rounded-lg border shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
            <span className="text-sm font-medium text-gray-700">Período de Apuração:</span>
            <DateRangePicker date={dateRange} setDate={setDateRange} className="w-full sm:w-auto" />
        </div>

        <div className="rounded-md border overflow-x-auto">
          <Table className="min-w-[800px]">
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead>Colaborador</TableHead>
                <TableHead className="text-right">Comissão M.O.</TableHead>
                <TableHead className="text-right">Comissão Peças</TableHead>
                <TableHead className="text-right">Total Geral</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                 <TableRow><TableCell colSpan={6} className="h-24 text-center"><div className="flex justify-center"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div></div></TableCell></TableRow>
              ) : commissions.length === 0 ? (
                 <TableRow><TableCell colSpan={6} className="h-24 text-center text-gray-500">Nenhum registro de comissão no período.</TableCell></TableRow>
              ) : (
                commissions.map((c, idx) => (
                  <TableRow key={idx} className="hover:bg-gray-50">
                    <TableCell className="font-medium">{c.collaborator_name}</TableCell>
                    <TableCell className="text-right text-gray-600">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(c.mo_commission)}</TableCell>
                    <TableCell className="text-right text-gray-600">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(c.parts_commission)}</TableCell>
                    <TableCell className="text-right font-bold text-green-600">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(c.total_commission)}</TableCell>
                    <TableCell className="text-center">
                        <Badge variant={c.status === 'paid' ? 'default' : 'secondary'}>
                            {c.status === 'paid' ? 'Pago' : 'Pendente'}
                        </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => openDialog(c)} title="Detalhes"><Eye className="h-4 w-4 text-blue-600" /></Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <ComissaoDialog isOpen={isDialogOpen} onClose={() => setIsDialogOpen(false)} commissionData={selectedCommission} dateRange={dateRange} />
    </div>
  );
};

export default ComissoesList;