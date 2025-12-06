import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from '@/components/ui/badge';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Layers } from 'lucide-react';

const Parcelas = () => {
  const [installments, setInstallments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchInstallments = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('parcelas')
          .select(`
            id,
            numero_parcela,
            valor,
            data_vencimento,
            status,
            conta:contas_receber (
              customers (name)
            )
          `)
          .order('data_vencimento', { ascending: true });
        
        if (error) throw error;
        setInstallments(data || []);
      } catch (error) {
        console.error('Error fetching installments:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchInstallments();
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Layers className="h-6 w-6 text-purple-600" />
        <h3 className="text-xl font-bold text-gray-800">Parcelas</h3>
      </div>

      <div className="border rounded-md bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cliente</TableHead>
              <TableHead className="text-center">Parcela #</TableHead>
              <TableHead>Vencimento</TableHead>
              <TableHead className="text-right">Valor</TableHead>
              <TableHead className="text-center">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={5} className="text-center py-8">Carregando...</TableCell></TableRow>
            ) : installments.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center py-8">Nenhuma parcela encontrada.</TableCell></TableRow>
            ) : (
              installments.map((inst) => (
                <TableRow key={inst.id}>
                  <TableCell className="font-medium">{inst.conta?.customers?.name || 'N/A'}</TableCell>
                  <TableCell className="text-center">{inst.numero_parcela}</TableCell>
                  <TableCell>{formatDate(inst.data_vencimento)}</TableCell>
                  <TableCell className="text-right font-bold">{formatCurrency(inst.valor)}</TableCell>
                  <TableCell className="text-center">
                    <Badge variant={inst.status === 'pago' ? 'success' : inst.status === 'atrasado' ? 'destructive' : 'outline'}>
                      {inst.status}
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

export default Parcelas;