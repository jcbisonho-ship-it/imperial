import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { isPast, differenceInDays } from 'date-fns';
import { formatDate } from '@/lib/utils';

const formatCurrency = (value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);

const getStatus = (transaction) => {
  if (transaction.status === 'paid') {
    return { label: 'Pago', color: 'bg-green-500' };
  }
  if (isPast(new Date(transaction.due_date))) {
    return { label: `Atrasado ${differenceInDays(new Date(), new Date(transaction.due_date))}d`, color: 'bg-red-500' };
  }
  return { label: 'Pendente', color: 'bg-yellow-500' };
};

const ContasPagar = () => {
  const { toast } = useToast();
  const [payables, setPayables] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchPayables = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('type', 'expense')
        .order('due_date', { ascending: true });
      if (error) throw error;
      setPayables(data);
    } catch (error) {
      toast({ title: 'Erro ao carregar contas a pagar', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchPayables();
  }, [fetchPayables]);

  const handleMarkAsPaid = async (id) => {
    try {
        const { error } = await supabase.from('transactions').update({ status: 'paid', transaction_date: new Date() }).eq('id', id);
        if (error) throw error;
        toast({ title: 'Sucesso!', description: 'Conta marcada como paga.'});
        fetchPayables();
    } catch (error) {
         toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 mt-4">
       <h3 className="text-lg font-semibold text-gray-700 mb-4">Contas a Pagar</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left text-gray-500">
          <thead className="text-xs text-gray-700 uppercase bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3">Vencimento</th>
              <th scope="col" className="px-6 py-3">Descrição</th>
              <th scope="col" className="px-6 py-3">Valor</th>
              <th scope="col" className="px-6 py-3">Status</th>
              <th scope="col" className="px-6 py-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="5" className="text-center py-12"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div></td></tr>
            ) : payables.length > 0 ? (
              payables.map(p => {
                const status = getStatus(p);
                return (
                  <tr key={p.id} className="bg-white border-b hover:bg-gray-50">
                    <td className="px-6 py-4">{formatDate(p.due_date)}</td>
                    <td className="px-6 py-4 font-medium text-gray-900">{p.description}</td>
                    <td className="px-6 py-4 font-semibold text-red-600">{formatCurrency(p.amount)}</td>
                    <td className="px-6 py-4"><Badge className={`${status.color} text-white`}>{status.label}</Badge></td>
                    <td className="px-6 py-4 text-right">
                        {p.status === 'pending' && <Button size="sm" onClick={() => handleMarkAsPaid(p.id)}>Marcar como Pago</Button>}
                    </td>
                  </tr>
                )
            })
            ) : (
              <tr><td colSpan="5" className="text-center py-12 text-gray-500">Nenhuma conta a pagar encontrada.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ContasPagar;