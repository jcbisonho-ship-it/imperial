import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { ArrowUpCircle, ArrowDownCircle } from 'lucide-react';

const StockMovementHistory = ({ osId }) => {
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (osId) {
      fetchMovements();
    }
  }, [osId]);

  const fetchMovements = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_os_stock_movements', { p_os_id: osId });
      if (error) throw error;
      setMovements(data || []);
    } catch (error) {
      console.error('Error fetching stock movements:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium text-gray-900">Histórico de Movimentação de Estoque</h3>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Produto</TableHead>
              <TableHead className="text-center">Quantidade</TableHead>
              <TableHead>Motivo</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={5} className="text-center h-24">Carregando...</TableCell></TableRow>
            ) : movements.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center h-24 text-gray-500">Nenhuma movimentação registrada para esta OS.</TableCell></TableRow>
            ) : (
              movements.map((movement) => (
                <TableRow key={movement.id}>
                  <TableCell>{format(new Date(movement.created_at), 'dd/MM/yyyy HH:mm')}</TableCell>
                  <TableCell>
                    {movement.movement_type === 'SALE' || movement.movement_type === 'MANUAL_EXIT' ? (
                         <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 flex w-fit items-center gap-1">
                             <ArrowDownCircle className="w-3 h-3" /> Saída
                         </Badge>
                    ) : (
                         <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 flex w-fit items-center gap-1">
                             <ArrowUpCircle className="w-3 h-3" /> Entrada
                         </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                      <div className="flex flex-col">
                          <span className="font-medium">{movement.product_name}</span>
                          <span className="text-xs text-gray-500">{movement.variant_code}</span>
                      </div>
                  </TableCell>
                  <TableCell className="text-center font-bold">{Math.abs(movement.quantity)}</TableCell>
                  <TableCell className="text-gray-600 italic text-sm">{movement.reason}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default StockMovementHistory;