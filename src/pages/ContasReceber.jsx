import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { formatCurrency } from '@/lib/utils';
import { format, isPast, startOfDay } from 'date-fns';
import { ArrowDownLeft, PlusCircle, MoreHorizontal, Edit, Trash2, CheckCircle, Filter, X, Search, Tag, CreditCard, Calendar as CalendarIcon } from 'lucide-react';
import TransacaoDialog from '@/components/financeiro/TransacaoDialog';
import PaymentConfirmationDialog from '@/components/financeiro/PaymentConfirmationDialog';
import { useToast } from '@/components/ui/use-toast';

const getStatusBadge = (item) => {
  if (item.status === 'paid') return { label: 'Pago', color: 'bg-green-500 text-white hover:bg-green-600' };
  if (!item.due_date) return { label: 'Pendente', color: 'bg-yellow-100 text-yellow-800' };
  
  const dueDate = startOfDay(new Date(item.due_date));
  const today = startOfDay(new Date());

  if (today > dueDate) {
      return { label: 'Vencida', color: 'bg-red-100 text-red-800 border-red-200' };
  } else {
      return { label: 'A Vencer', color: 'bg-green-100 text-green-800 border-green-200' };
  }
};

const ContasReceber = ({ refreshKey }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [transactionToDelete, setTransactionToDelete] = useState(null);
  
  const [isPayDialogOpen, setIsPayDialogOpen] = useState(false);
  const [transactionToPay, setTransactionToPay] = useState(null);

  const { toast } = useToast();
  
  // Filters State
  const [loading, setLoading] = useState(true);
  const [receivables, setReceivables] = useState([]);
  const [dateRange, setDateRange] = useState({ from: undefined, to: undefined });
  const [statusFilter, setStatusFilter] = useState('pending');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [subcategoryFilter, setSubcategoryFilter] = useState('all');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Options State
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);

  // Load Categories and Subcategories
  useEffect(() => {
    const loadOptions = async () => {
      const { data: cats } = await supabase
        .from('financial_categories')
        .select('id, name')
        .eq('type', 'income')
        .order('name');
      
      const { data: subcats } = await supabase
        .from('financial_subcategories')
        .select('id, name, category_id')
        .order('name');

      if (cats) setCategories(cats);
      if (subcats) setSubcategories(subcats);
    };
    loadOptions();
  }, []);

  const fetchReceivables = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('transactions')
        .select('*, category:financial_categories(name), subcategory:financial_subcategories(name)')
        .eq('type', 'income')
        .order('due_date', { ascending: true });

      // Apply Filters
      if (statusFilter !== 'all') {
        if (statusFilter === 'pending') {
          query = query.neq('status', 'paid');
        } else if (statusFilter === 'paid') {
          query = query.eq('status', 'paid');
        } else if (statusFilter === 'overdue') {
          query = query.neq('status', 'paid').lt('due_date', new Date().toISOString().split('T')[0]);
        }
      }

      if (dateRange?.from) {
        query = query.gte('due_date', format(dateRange.from, 'yyyy-MM-dd'));
        if (dateRange.to) {
            query = query.lte('due_date', format(dateRange.to, 'yyyy-MM-dd'));
        }
      }

      if (categoryFilter !== 'all') {
        query = query.eq('category_id', categoryFilter);
      }

      if (subcategoryFilter !== 'all') {
        query = query.eq('subcategory_id', subcategoryFilter);
      }
      
      if (paymentMethodFilter) {
         query = query.ilike('payment_method', `%${paymentMethodFilter}%`);
      }

      if (searchTerm) {
        query = query.ilike('description', `%${searchTerm}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      setReceivables(data || []);

    } catch (error) {
      console.error('Error fetching receivables:', error);
      toast({ variant: 'destructive', title: 'Erro', description: 'Falha ao carregar contas a receber.' });
    } finally {
      setLoading(false);
    }
  }, [statusFilter, dateRange, categoryFilter, subcategoryFilter, paymentMethodFilter, searchTerm, toast]);

  useEffect(() => {
    fetchReceivables();
  }, [fetchReceivables, refreshKey]);

  const clearFilters = () => {
    setStatusFilter('pending');
    setCategoryFilter('all');
    setSubcategoryFilter('all');
    setPaymentMethodFilter('');
    setSearchTerm('');
    setDateRange({ from: undefined, to: undefined });
  };

  const handleSaveSuccess = () => {
    fetchReceivables();
    setIsModalOpen(false);
    setSelectedTransaction(null);
  };

  const handleEdit = (transaction) => {
    setSelectedTransaction(transaction);
    setIsModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!transactionToDelete) return;
    try {
      const { error } = await supabase.from('transactions').delete().eq('id', transactionToDelete);
      if (error) throw error;
      toast({ title: 'Sucesso', description: 'Registro excluído.' });
      fetchReceivables();
    } catch (error) {
      toast({ variant: 'destructive', title: 'Erro', description: error.message });
    }
    setIsDeleteDialogOpen(false);
    setTransactionToDelete(null);
  };

  const handleDelete = (id) => {
    setTransactionToDelete(id);
    setIsDeleteDialogOpen(true);
  };

  const handleMarkAsPaid = (transaction) => {
      setTransactionToPay(transaction);
      setIsPayDialogOpen(true);
  };

  const confirmPayment = async ({ accountId, paymentDate }) => {
    if (!transactionToPay) return;
    try {
      const { error } = await supabase
        .from('transactions')
        .update({ 
            status: 'paid', 
            transaction_date: paymentDate,
            account_id: accountId 
        })
        .eq('id', transactionToPay.id);
        
      if (error) throw error;
      toast({ title: 'Sucesso', description: 'Conta marcada como recebida e movida para o Caixa.' });
      fetchReceivables();
    } catch (error) {
      toast({ variant: 'destructive', title: 'Erro', description: error.message });
    }
    setIsPayDialogOpen(false);
    setTransactionToPay(null);
  };

  const handleNew = () => {
    setSelectedTransaction(null);
    setIsModalOpen(true);
  };

  const filteredSubcategories = subcategories.filter(sc => categoryFilter === 'all' || sc.category_id === categoryFilter);

  return (
    <>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
                <div className="flex items-center gap-2">
                    <ArrowDownLeft className="h-6 w-6 text-green-600" />
                    <h3 className="text-2xl font-bold text-gray-800">Contas a Receber</h3>
                </div>
                <p className="text-sm text-muted-foreground mt-1">Gerencie seus recebimentos previstos e realizados.</p>
            </div>
            <div className="flex gap-2 w-full md:w-auto">
                 <Button variant="outline" onClick={clearFilters} size="sm" className="w-full md:w-auto border-dashed">
                    <X className="w-4 h-4 mr-2" /> Limpar Filtros
                </Button>
                <Button onClick={handleNew} size="sm" className="w-full md:w-auto">
                    <PlusCircle className="h-4 w-4 mr-2" /> Nova Conta
                </Button>
            </div>
        </div>

        {/* Filters Section */}
        <Card className="border shadow-sm bg-white">
            <CardContent className="p-4 md:p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="space-y-2">
                         <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                            <CalendarIcon className="w-3.5 h-3.5" /> Vencimento
                         </label>
                         <DateRangePicker 
                            date={dateRange}
                            setDate={setDateRange}
                            className="w-full"
                        />
                    </div>

                    <div className="space-y-2">
                         <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                            <Filter className="w-3.5 h-3.5" /> Status
                         </label>
                         <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className="w-full bg-white">
                                <SelectValue placeholder="Status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todos</SelectItem>
                                <SelectItem value="pending">Pendente</SelectItem>
                                <SelectItem value="overdue">Vencido</SelectItem>
                                <SelectItem value="paid">Pago</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                         <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                            <Tag className="w-3.5 h-3.5" /> Categoria
                         </label>
                         <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                            <SelectTrigger className="w-full bg-white">
                                <SelectValue placeholder="Categoria" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todas</SelectItem>
                                {categories.map(c => (
                                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                         <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                            <CreditCard className="w-3.5 h-3.5" /> Meio de Pagamento
                         </label>
                         <Input 
                            placeholder="Ex: Pix, Boleto..." 
                            value={paymentMethodFilter}
                            onChange={(e) => setPaymentMethodFilter(e.target.value)}
                            className="bg-white"
                         />
                    </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                     <div className="space-y-2">
                         <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                            <Tag className="w-3.5 h-3.5" /> Subcategoria
                         </label>
                         <Select value={subcategoryFilter} onValueChange={setSubcategoryFilter}>
                            <SelectTrigger className="w-full bg-white">
                                <SelectValue placeholder="Subcategoria" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todas</SelectItem>
                                {filteredSubcategories.map(sc => (
                                    <SelectItem key={sc.id} value={sc.id}>{sc.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                         <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                            <Search className="w-3.5 h-3.5" /> Pesquisar
                         </label>
                         <div className="relative">
                            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                            <Input
                                placeholder="Pesquisar por descrição..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 bg-white"
                            />
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
        
        <div className="border rounded-md bg-white shadow-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vencimento</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Subcategoria</TableHead>
                <TableHead>Meio de Pagamento</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8">
                     <div className="flex justify-center items-center gap-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                        <span>Carregando...</span>
                    </div>
                </TableCell></TableRow>
              ) : (receivables || []).length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                    <div className="flex flex-col items-center gap-2">
                        <Search className="h-8 w-8 text-gray-300" />
                        <p>Nenhuma conta encontrada com os filtros atuais.</p>
                    </div>
                </TableCell></TableRow>
              ) : (
                receivables.map((item) => {
                  const status = getStatusBadge(item);
                  return (
                  <TableRow 
                    key={item.id}
                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => handleEdit(item)}
                  >
                    <TableCell>
                      {item.due_date ? format(new Date(item.due_date), 'dd/MM/yyyy') : '-'}
                    </TableCell>
                    <TableCell className="font-medium">
                      <div className="flex flex-col">
                        <span>{item.description}</span>
                      </div>
                    </TableCell>
                    <TableCell>{item.category?.name || '-'}</TableCell>
                    <TableCell>{item.subcategory?.name || '-'}</TableCell>
                    <TableCell>{item.payment_method || '-'}</TableCell>
                    <TableCell className="text-right font-bold text-green-600">{formatCurrency(item.amount)}</TableCell>
                    <TableCell className="text-center">
                      <Badge className={status.color}>
                        {status.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <span className="sr-only">Abrir menu</span>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Ações</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => handleEdit(item)}>
                              <Edit className="mr-2 h-4 w-4" /> Editar
                            </DropdownMenuItem>
                            {item.status !== 'paid' && (
                                <DropdownMenuItem onClick={() => handleMarkAsPaid(item)}>
                                <CheckCircle className="mr-2 h-4 w-4" /> Marcar como Recebido
                                </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleDelete(item.id)} className="text-red-600">
                              <Trash2 className="mr-2 h-4 w-4" /> Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                )})
              )}
            </TableBody>
          </Table>
        </div>
      </div>
      <TransacaoDialog
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSaveSuccess={handleSaveSuccess}
        transaction={selectedTransaction}
        defaultType="income"
      />
      
      {/* Payment/Receive Confirmation Dialog */}
      <PaymentConfirmationDialog 
        isOpen={isPayDialogOpen} 
        onClose={() => setIsPayDialogOpen(false)} 
        onConfirm={confirmPayment}
        transaction={transactionToPay}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este registro? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-red-600 hover:bg-red-700">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default ContasReceber;