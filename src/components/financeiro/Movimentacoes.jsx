import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency } from '@/lib/utils';
import { format } from 'date-fns';
import { ArrowRightLeft, TrendingUp, TrendingDown } from 'lucide-react';

const Movimentacoes = () => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('movimentacoes_financeiras')
          .select(`
            id,
            tipo,
            valor,
            descricao,
            data_movimentacao,
            conta:contas_internas (nome)
          `)
          .order('data_movimentacao', { ascending: false });
        
        if (error) throw error;
        setTransactions(data || []);
      } catch (error) {
        console.error('Error fetching transactions:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTransactions();
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <ArrowRightLeft className="h-6 w-6 text-blue-600" />
        <h3 className="text-xl font-bold text-gray-800">Movimentações Financeiras</h3>
      </div>

      <div className="border rounded-md bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead>Conta</TableHead>
              <TableHead className="text-center">Tipo</TableHead>
              <TableHead className="text-right">Valor</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={5} className="text-center py-8">Carregando...</TableCell></TableRow>
            ) : transactions.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center py-8">Nenhuma movimentação encontrada.</TableCell></TableRow>
            ) : (
              transactions.map((tx) => (
                <TableRow key={tx.id}>
                  <TableCell>{format(new Date(tx.data_movimentacao), 'dd/MM/yyyy HH:mm')}</TableCell>
                  <TableCell className="font-medium">{tx.descricao}</TableCell>
                  <TableCell>{tx.conta?.nome || '-'}</TableCell>
                  <TableCell className="text-center">
                    <span className={`flex items-center justify-center gap-1 font-medium ${tx.tipo === 'entrada' ? 'text-green-600' : 'text-red-600'}`}>
                      {tx.tipo === 'entrada' ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                      {tx.tipo.toUpperCase()}
                    </span>
                  </TableCell>
                  <TableCell className={`text-right font-bold ${tx.tipo === 'entrada' ? 'text-green-600' : 'text-red-600'}`}>
                    {tx.tipo === 'saida' ? '-' : '+'}{formatCurrency(tx.valor)}
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

export default Movimentacoes;