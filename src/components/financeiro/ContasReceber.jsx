import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from '@/components/ui/badge';
import { formatCurrency, formatDate } from '@/lib/utils';
import { ArrowDownLeft } from 'lucide-react';

const ContasReceber = () => {
  const [receivables, setReceivables] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReceivables = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('contas_receber')
          .select(`
            id,
            valor_total,
            valor_liquido,
            data_vencimento,
            status,
            created_at,
            customers (name)
          `)
          .order('data_vencimento', { ascending: true });
        
        if (error) throw error;
        setReceivables(data || []);
      } catch (error) {
        console.error('Error fetching receivables:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchReceivables();
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <ArrowDownLeft className="h-6 w-6 text-green-600" />
        <h3 className="text-xl font-bold text-gray-800">Contas a Receber</h3>
      </div>
      
      <div className="border rounded-md bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cliente</TableHead>
              <TableHead>Vencimento</TableHead>
              <TableHead className="text-right">Valor Total</TableHead>
              <TableHead className="text-right">Valor Líquido</TableHead>
              <TableHead className="text-center">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={5} className="text-center py-8">Carregando...</TableCell></TableRow>
            ) : receivables.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center py-8">Nenhum registro encontrado.</TableCell></TableRow>
            ) : (
              receivables.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.customers?.name || 'Cliente Desconhecido'}</TableCell>
                  <TableCell>{formatDate(item.data_vencimento)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(item.valor_total)}</TableCell>
                  <TableCell className="text-right font-bold text-gray-900">{formatCurrency(item.valor_liquido)}</TableCell>
                  <TableCell className="text-center">
                    <Badge variant={item.status === 'pago' ? 'success' : item.status === 'pendente' ? 'warning' : 'outline'}>
                      {item.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default ContasReceber;