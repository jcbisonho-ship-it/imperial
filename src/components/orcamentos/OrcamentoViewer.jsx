import React, { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const formatCurrency = (value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);

const statusMap = {
  draft: { label: 'Rascunho', color: 'bg-gray-500' },
  pending: { label: 'Pendente', color: 'bg-yellow-500' },
  pending_approval: { label: 'Pendente Aprovação', color: 'bg-yellow-500' },
  approved: { label: 'Aprovado', color: 'bg-green-500' },
  rejected: { label: 'Rejeitado', color: 'bg-red-500' },
  converted: { label: 'Convertido em OS', color: 'bg-blue-500' },
};

const OrcamentoViewer = ({ isOpen, onClose, budgetId }) => {
  const [budget, setBudget] = useState(null);
  const [items, setItems] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchData = useCallback(async () => {
    if (!budgetId) return;
    setLoading(true);
    try {
      // Fetch Budget Summary
      const { data: budgetData, error: budgetError } = await supabase
        .rpc('get_budget_summary')
        .eq('id', budgetId)
        .single();
      if (budgetError) throw budgetError;
      setBudget(budgetData);

      // Fetch Items
      const { data: itemsData, error: itemsError } = await supabase
        .from('budget_items')
        .select('*, collaborator:collaborators(name)')
        .eq('budget_id', budgetId);
      if (itemsError) throw itemsError;
      setItems(itemsData);

      // Fetch History with Correct Relation
      const { data: historyData, error: historyError } = await supabase
        .from('budget_history')
        .select('*, user:users_data(full_name)')
        .eq('budget_id', budgetId)
        .order('created_at', { ascending: false });
      
      if (historyError) throw historyError;
      setHistory(historyData);

    } catch (error) {
      console.error("Error fetching budget details:", error);
      toast({ title: 'Erro ao carregar dados do orçamento', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [budgetId, toast]);

  useEffect(() => {
    if (isOpen) {
      fetchData();
    }
  }, [isOpen, fetchData]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Detalhes do Orçamento</DialogTitle>
          {budget && <DialogDescription>ID: #{budget.id.substring(0, 8)}</DialogDescription>}
        </DialogHeader>
        {loading ? (
          <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>
        ) : budget ? (
          <div className="space-y-6 py-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div><p className="font-semibold">Cliente:</p><p>{budget.customer_name}</p></div>
              <div><p className="font-semibold">Veículo:</p><p>{budget.vehicle_description}</p></div>
              <div><p className="font-semibold">Data:</p><p>{format(new Date(budget.created_at), 'dd/MM/yyyy')}</p></div>
              <div><p className="font-semibold">Status:</p><Badge className={`${statusMap[budget.status]?.color || 'bg-gray-500'} text-white`}>{statusMap[budget.status]?.label || budget.status}</Badge></div>
              <div className="md:col-span-2"><p className="font-semibold">Total:</p><p className="text-lg font-bold">{formatCurrency(budget.total_cost)}</p></div>
            </div>

            <div>
              <h4 className="font-semibold mb-2">Itens e Serviços</h4>
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50"><tr className="text-left"><th className="p-2">Descrição</th><th className="p-2">Qtd.</th><th className="p-2">Preço Unit.</th><th className="p-2 text-right">Total</th></tr></thead>
                  <tbody>
                    {items.map(item => (
                      <tr key={item.id} className="border-t"><td className="p-2">{item.description}</td><td className="p-2">{item.quantity}</td><td className="p-2">{formatCurrency(item.unit_price)}</td><td className="p-2 text-right">{formatCurrency(item.total_price)}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div>
              <h4 className="font-semibold mb-2">Histórico de Alterações</h4>
              <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                {history.length > 0 ? history.map(h => (
                  <div key={h.id} className="text-xs p-3 bg-gray-50 rounded-md border">
                    <p className="font-semibold">{h.comment}</p>
                    <p className="text-gray-500 mt-1">
                      {h.status_from && `Status alterado de ${statusMap[h.status_from]?.label || h.status_from} para ${statusMap[h.status_to]?.label || h.status_to}. `}
                      Por {h.user?.full_name || 'Sistema'} em {format(new Date(h.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </p>
                  </div>
                )) : <p className="text-sm text-gray-500">Nenhum histórico de alterações encontrado.</p>}
              </div>
            </div>
          </div>
        ) : (
          <p className="text-center text-gray-500 py-10">Não foi possível carregar os dados do orçamento.</p>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default OrcamentoViewer;