import React, { useState, useEffect, useCallback } from 'react';
import { Helmet } from 'react-helmet';
import { supabase } from '@/lib/customSupabaseClient';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from '@/components/ui/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatDate } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Filter, X, Search, Calendar as CalendarIcon, ArrowDownUp, Tag, Wallet, Trash2 } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const FluxoCaixa = () => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Delete State
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [transactionToDelete, setTransactionToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Filter States
  const [dateRange, setDateRange] = useState({
    from: new Date(new Date().setMonth(new Date().getMonth() - 1)), // Last month
    to: new Date(), // Today
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterAccount, setFilterAccount] = useState('all');
  
  // Filter Options
  const [categories, setCategories] = useState([]);
  const [accounts, setAccounts] = useState([]);

  // Load filter options on mount
  useEffect(() => {
    const loadOptions = async () => {
        const { data: cats } = await supabase.from('financial_categories').select('id, name').order('name');
        const { data: accs } = await supabase.from('accounts').select('id, name').order('name');
        if (cats) setCategories(cats);
        if (accs) setAccounts(accs);
    };
    loadOptions();
  }, []);

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { from, to } = dateRange;
      let query = supabase
        .from('transactions')
        .select('*, accounts(name), financial_categories(name)')
        .order('transaction_date', { ascending: false });

      // Date Filter
      if (from && to) {
        query = query.gte('transaction_date', format(from, 'yyyy-MM-dd'));
        query = query.lte('transaction_date', format(to, 'yyyy-MM-dd'));
      }

      // Type Filter
      if (filterType && filterType !== 'all') {
          query = query.eq('type', filterType);
      }
      
      // Category Filter
      if (filterCategory && filterCategory !== 'all') {
          query = query.eq('category_id', filterCategory);
      }
      
      // Account Filter
      if (filterAccount && filterAccount !== 'all') {
          query = query.eq('account_id', filterAccount);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Search Filter (Client-side for partial matches)
      let filteredData = data;
      if (searchTerm) {
        const lowerCaseSearchTerm = searchTerm.toLowerCase();
        filteredData = data.filter(transaction =>
          transaction.description?.toLowerCase().includes(lowerCaseSearchTerm) ||
          transaction.type?.toLowerCase().includes(lowerCaseSearchTerm) ||
          (transaction.accounts?.name?.toLowerCase() || '').includes(lowerCaseSearchTerm) ||
          (transaction.financial_categories?.name?.toLowerCase() || '').includes(lowerCaseSearchTerm) ||
          (transaction.notes && transaction.notes.toLowerCase().includes(lowerCaseSearchTerm))
        );
      }

      setTransactions(filteredData || []);
    } catch (err) {
      console.error('Error fetching transactions:', err);
      setError('Erro ao carregar transações.');
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar as transações do fluxo de caixa.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [dateRange, searchTerm, filterType, filterCategory, filterAccount]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const clearFilters = () => {
      setFilterType('all');
      setFilterCategory('all');
      setFilterAccount('all');
      setSearchTerm('');
      // Reset date range to default if needed
      setDateRange({ from: new Date(new Date().setMonth(new Date().getMonth() - 1)), to: new Date() });
  };

  const handleDeleteClick = (transaction) => {
    setTransactionToDelete(transaction);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!transactionToDelete) return;
    
    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', transactionToDelete.id);

      if (error) throw error;

      toast({
        title: 'Sucesso',
        description: 'Transação excluída com sucesso.',
      });
      
      // Refresh list
      fetchTransactions();
    } catch (err) {
      console.error('Error deleting transaction:', err);
      toast({
        title: 'Erro',
        description: 'Erro ao excluir transação.',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
      setTransactionToDelete(null);
    }
  };

  const totalIncome = transactions.filter(t => t.type === 'income' && t.status === 'paid').reduce((sum, t) => sum + t.amount, 0);
  const totalExpense = transactions.filter(t => t.type === 'expense' && t.status === 'paid').reduce((sum, t) => sum + t.amount, 0);
  const balance = totalIncome - totalExpense;

  const handleDateRangeChange = (range) => {
    if (range?.from) {
        setDateRange(range);
    }
  };

  const formatDescription = (description) => {
    if (!description) return '';
    const osMatch = description.match(/OS\s*#?(\d+)/i);
    if (osMatch && osMatch[1]) {
      return `OS${osMatch[1]}`;
    }
    return description;
  };

  const getCategoryDisplayName = (transaction) => {
    if (transaction.type === 'income' && transaction.work_order_id) {
      return 'Rec. de OS';
    }
    return transaction.financial_categories?.name || 'Sem categoria';
  };

  return (
    <>
      <Helmet>
        <title>Fluxo de Caixa - CRM de Oficinas</title>
        <meta name="description" content="Controle o fluxo de caixa da sua oficina mecânica. Veja entradas, saídas e saldo." />
      </Helmet>
      <div className="flex flex-col gap-6 p-6 bg-gray-50/50 min-h-screen">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
                <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Fluxo de Caixa</h1>
                <p className="text-muted-foreground text-sm mt-1">Gerencie todas as entradas e saídas financeiras da oficina.</p>
            </div>
            <div className="flex gap-2 w-full md:w-auto">
                <Button variant="outline" onClick={clearFilters} size="sm" className="w-full md:w-auto border-dashed">
                    <X className="w-4 h-4 mr-2" /> Limpar
                </Button>
                <Button onClick={fetchTransactions} disabled={loading} size="sm" className="w-full md:w-auto">
                    {loading ? 'Atualizando...' : 'Atualizar Lista'}
                </Button>
            </div>
        </div>

        {/* Summary Cards - Moved to Top */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-l-4 border-l-green-500 shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 pt-4 px-4">
              <CardTitle className="text-sm font-medium text-gray-600">Total Entradas</CardTitle>
              <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center text-green-600">
                <ArrowDownUp className="h-4 w-4 rotate-180" />
              </div>
            </CardHeader>
            <CardContent className="pb-4 px-4">
              <div className="text-2xl font-bold text-green-700">
                {totalIncome.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </div>
              <p className="text-xs text-muted-foreground mt-1 font-medium">
                 + {transactions.filter(t => t.type === 'income' && t.status === 'paid').length} transações
              </p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-red-500 shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 pt-4 px-4">
              <CardTitle className="text-sm font-medium text-gray-600">Total Saídas</CardTitle>
              <div className="h-8 w-8 rounded-full bg-red-100 flex items-center justify-center text-red-600">
                <ArrowDownUp className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent className="pb-4 px-4">
              <div className="text-2xl font-bold text-red-700">
                {totalExpense.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </div>
              <p className="text-xs text-muted-foreground mt-1 font-medium">
                 - {transactions.filter(t => t.type === 'expense' && t.status === 'paid').length} transações
              </p>
            </CardContent>
          </Card>

          <Card className={`border-l-4 ${balance >= 0 ? 'border-l-blue-500' : 'border-l-orange-500'} shadow-sm hover:shadow-md transition-shadow`}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 pt-4 px-4">
              <CardTitle className="text-sm font-medium text-gray-600">Saldo do Período</CardTitle>
              <div className={`h-8 w-8 rounded-full flex items-center justify-center ${balance >= 0 ? 'bg-blue-100 text-blue-600' : 'bg-orange-100 text-orange-600'}`}>
                <Wallet className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent className="pb-4 px-4">
              <div className={`text-2xl font-bold ${balance >= 0 ? 'text-blue-700' : 'text-orange-700'}`}>
                {balance.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </div>
              <p className="text-xs text-muted-foreground mt-1 font-medium">
                 Resultado (Entradas - Saídas)
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Filters Section - Moved Below Summary Cards */}
        <Card className="border shadow-sm bg-white">
            <CardHeader className="pb-3 border-b bg-gray-50/40 px-6 pt-5">
                <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4 text-primary" />
                    <CardTitle className="text-base font-medium">Filtros e Pesquisa</CardTitle>
                </div>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
                {/* Primary Filters Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="space-y-2">
                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                            <CalendarIcon className="w-3.5 h-3.5" /> Período
                        </label>
                        <DateRangePicker 
                            onUpdate={handleDateRangeChange} 
                            initialDateRange={dateRange}
                            className="w-full" 
                        />
                    </div>
                    
                    <div className="space-y-2">
                         <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                            <ArrowDownUp className="w-3.5 h-3.5" /> Tipo
                         </label>
                         <Select value={filterType} onValueChange={setFilterType}>
                            <SelectTrigger className="w-full bg-white">
                                <SelectValue placeholder="Selecione..." />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todos os tipos</SelectItem>
                                <SelectItem value="income">Entradas (Receitas)</SelectItem>
                                <SelectItem value="expense">Saídas (Despesas)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                         <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                            <Tag className="w-3.5 h-3.5" /> Categoria
                         </label>
                         <Select value={filterCategory} onValueChange={setFilterCategory}>
                            <SelectTrigger className="w-full bg-white">
                                <SelectValue placeholder="Selecione..." />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todas as categorias</SelectItem>
                                {categories.map(cat => (
                                    <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                         <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                            <Wallet className="w-3.5 h-3.5" /> Conta
                         </label>
                         <Select value={filterAccount} onValueChange={setFilterAccount}>
                            <SelectTrigger className="w-full bg-white">
                                <SelectValue placeholder="Selecione..." />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todas as contas</SelectItem>
                                {accounts.map(acc => (
                                    <SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <Separator className="bg-gray-100" />

                {/* Search Row */}
                <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <Input
                        placeholder="Pesquisar por descrição, observações, valor ou cliente..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 bg-gray-50/50 border-gray-200 focus:bg-white transition-colors"
                    />
                </div>
            </CardContent>
        </Card>

        {/* Transactions List */}
        <Card className="border shadow-sm">
          <CardHeader className="border-b bg-gray-50/30 px-6 py-4">
            <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                    Histórico de Movimentações
                    <span className="text-xs font-normal text-muted-foreground bg-gray-100 px-2 py-0.5 rounded-full border">
                        {transactions.length} registros
                    </span>
                </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
               <div className="flex justify-center items-center py-12">
                  <div className="flex flex-col items-center gap-3">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    <span className="text-sm text-muted-foreground">Carregando transações...</span>
                  </div>
               </div>
            ) : error ? (
              <div className="p-8 text-center">
                 <p className="text-red-500 font-medium mb-2">Erro ao carregar dados</p>
                 <p className="text-sm text-gray-500">{error}</p>
              </div>
            ) : transactions.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground flex flex-col items-center gap-3">
                 <div className="h-12 w-12 bg-gray-100 rounded-full flex items-center justify-center text-gray-400">
                    <Search className="h-6 w-6" />
                 </div>
                 <p className="font-medium">Nenhuma transação encontrada</p>
                 <p className="text-sm max-w-sm mx-auto">Tente ajustar os filtros de data, tipo ou categoria para ver os resultados.</p>
                 <Button variant="outline" size="sm" onClick={clearFilters} className="mt-2">
                    Limpar todos os filtros
                 </Button>
              </div>
            ) : (
              <ScrollArea className="h-[600px] w-full">
                <Table>
                  <TableHeader className="sticky top-0 bg-white z-10 shadow-sm">
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="w-[120px]">Data</TableHead>
                      <TableHead className="w-[110px]">Tipo</TableHead>
                      <TableHead className="min-w-[200px]">Descrição</TableHead>
                      <TableHead>Categoria</TableHead>
                      <TableHead>Conta</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                      <TableHead className="w-[140px] text-center">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.map((transaction) => (
                      <TableRow key={transaction.id} className="hover:bg-gray-50/80 transition-colors group">
                        <TableCell className="font-medium text-gray-600">
                            {formatDate(transaction.transaction_date)}
                        </TableCell>
                        <TableCell>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                                transaction.type === 'income' 
                                    ? 'bg-green-50 text-green-700 border-green-200' 
                                    : 'bg-red-50 text-red-700 border-red-200'
                            }`}>
                                {transaction.type === 'income' ? 'Entrada' : 'Saída'}
                            </span>
                        </TableCell>
                        <TableCell>
                            <div className="flex flex-col">
                                <span className="font-medium text-gray-900">{formatDescription(transaction.description)}</span>
                                {transaction.notes && (
                                    <span className="text-xs text-gray-500 truncate max-w-[250px]" title={transaction.notes}>
                                        {transaction.notes}
                                    </span>
                                )}
                            </div>
                        </TableCell>
                        <TableCell>
                            <span className="text-sm text-gray-600 bg-gray-100 px-2 py-1 rounded-md inline-block">
                                {getCategoryDisplayName(transaction)}
                            </span>
                        </TableCell>
                        <TableCell className="text-gray-600">{transaction.accounts?.name || '-'}</TableCell>
                        <TableCell className="text-right">
                            <span className={`font-bold ${transaction.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                                {transaction.type === 'expense' && '- '}
                                {transaction.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </span>
                        </TableCell>
                        <TableCell className="text-center">
                           <div className="flex items-center justify-center gap-2">
                               {transaction.status === 'paid' ? (
                                   <span className="h-6 w-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center" title="Pago">
                                       <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                                          <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                                       </svg>
                                   </span>
                               ) : (
                                    <span className="h-6 w-6 rounded-full bg-yellow-100 text-yellow-600 flex items-center justify-center" title="Pendente">
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm.75-13a.75.75 0 00-1.5 0v5c0 .414.336.75.75.75h4a.75.75 0 000-1.5h-3.25V5z" clipRule="evenodd" />
                                        </svg>
                                    </span>
                               )}
                               <Button 
                                 variant="ghost" 
                                 size="icon" 
                                 className="h-8 w-8 text-gray-400 hover:text-red-600 hover:bg-red-50" 
                                 onClick={() => handleDeleteClick(transaction)}
                               >
                                 <Trash2 className="h-4 w-4" />
                               </Button>
                           </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta transação de {transactionToDelete?.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}? 
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className="bg-red-600 hover:bg-red-700 text-white">
              {isDeleting ? 'Excluindo...' : 'Excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default FluxoCaixa;