import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/lib/customSupabaseClient';
import { Plus, Search, Edit2, Trash2, ArrowUpCircle, ArrowDownCircle, MoreHorizontal, Eye } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import TransacaoDialog from './TransacaoDialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

// RESPONSIVE CONSTANTS
const CONTAINER_CLASS = "w-full p-4 sm:p-6 md:p-8 space-y-6";
const HEADER_CLASS = "flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4";
const BUTTON_CLASS = "w-full sm:w-auto";
const SEARCH_CLASS = "w-full sm:w-72";

const TransacoesList = () => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const { toast } = useToast();

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [transactionToDelete, setTransactionToDelete] = useState(null);

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*, category:financial_categories(name), account:accounts(name)')
        .order('transaction_date', { ascending: false });
      if (error) throw error;
      setTransactions(data || []);
    } catch (error) {
      toast({ title: 'Erro ao buscar transações', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const confirmDelete = async () => {
    if (!transactionToDelete) return;
    try {
      const { error } = await supabase.from('transactions').delete().eq('id', transactionToDelete);
      if (error) throw error;
      toast({ title: 'Transação excluída com sucesso' });
      fetchTransactions();
    } catch (error) {
      toast({ title: 'Erro ao excluir', description: error.message, variant: 'destructive' });
    }
    setIsDeleteDialogOpen(false);
    setTransactionToDelete(null);
  };

  const handleDelete = (id) => {
    setTransactionToDelete(id);
    setIsDeleteDialogOpen(true);
  };

  const openDialog = (transaction = null) => {
    setSelectedTransaction(transaction);
    setIsDialogOpen(true);
  };

  const filteredTransactions = transactions.filter(t => 
    t.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className={CONTAINER_CLASS}>
      <div className={HEADER_CLASS}>
        <div>
           <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">Extrato Financeiro</h1>
           <p className="text-gray-500 mt-1 text-sm sm:text-base">Registro detalhado de movimentações.</p>
        </div>
        <Button onClick={() => openDialog()} className={BUTTON_CLASS}>
          <Plus className="mr-2 h-4 w-4" /> Nova Transação
        </Button>
      </div>

      <div className="bg-white p-4 rounded-lg border shadow-sm space-y-4">
        <div className={`relative ${SEARCH_CLASS}`}>
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
            <Input 
                placeholder="Buscar descrição..." 
                value={searchTerm} 
                onChange={(e) => setSearchTerm(e.target.value)} 
                className="pl-9 h-10"
            />
        </div>

        <div className="rounded-md border overflow-x-auto">
          <Table className="min-w-[900px]">
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead>Data</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Conta</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                 <TableRow><TableCell colSpan={7} className="h-24 text-center"><div className="flex justify-center"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div></div></TableCell></TableRow>
              ) : filteredTransactions.length === 0 ? (
                 <TableRow><TableCell colSpan={7} className="h-24 text-center text-gray-500">Nenhuma transação encontrada.</TableCell></TableRow>
              ) : (
                filteredTransactions.map((t) => (
                  <TableRow key={t.id} className="hover:bg-gray-50">
                    <TableCell className="text-gray-600">{format(new Date(t.transaction_date), 'dd/MM/yyyy')}</TableCell>
                    <TableCell className="font-medium">{t.description}</TableCell>
                    <TableCell>{t.category?.name || '-'}</TableCell>
                    <TableCell>{t.account?.name || '-'}</TableCell>
                    <TableCell>
                        <div className={`flex items-center font-bold ${t.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                            {t.type === 'income' ? <ArrowUpCircle className="w-4 h-4 mr-2"/> : <ArrowDownCircle className="w-4 h-4 mr-2"/>}
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(t.amount)}
                        </div>
                    </TableCell>
                    <TableCell>
                        <Badge variant={t.status === 'paid' ? 'default' : 'outline'}>
                            {t.status === 'paid' ? 'Pago' : 'Pendente'}
                        </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <span className="sr-only">Abrir menu</span>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Ações</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => openDialog(t)}>
                              <Eye className="mr-2 h-4 w-4" /> Visualizar
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleDelete(t.id)} className="text-red-600">
                              <Trash2 className="mr-2 h-4 w-4" /> Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <TransacaoDialog isOpen={isDialogOpen} onClose={() => setIsDialogOpen(false)} onSaveSuccess={fetchTransactions} transaction={selectedTransaction} />
      
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta transação? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default TransacoesList;