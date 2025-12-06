import React, { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { Calendar as CalendarIcon, PlusCircle, X, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { ScrollArea } from '@/components/ui/scroll-area';
import CategoriaFinanceiraDialog from './CategoriaFinanceiraDialog';
import SubcategoriaFinanceiraDialog from './SubcategoriaFinanceiraDialog';
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

const TransacaoDialog = ({ isOpen, onClose, onSaveSuccess, transaction, defaultType }) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [accounts, setAccounts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  
  // Modal states for creating on-the-fly
  const [isCatModalOpen, setIsCatModalOpen] = useState(false);
  const [isSubCatModalOpen, setIsSubCatModalOpen] = useState(false);

  // Delete confirmation state
  const [deleteConfirmation, setDeleteConfirmation] = useState({ isOpen: false, id: null, type: null, name: '' });
  const [isDeleting, setIsDeleting] = useState(false);
  
  const getInitialState = useCallback(() => ({
    description: '', 
    type: defaultType || 'expense', 
    amount: '', 
    account_id: '', 
    category_id: '', 
    subcategory_id: '',
    payment_method: '', 
    status: 'pending',
    notes: '',
    transaction_date: new Date(), 
    due_date: null,
  }), [defaultType]);
  
  const [formData, setFormData] = useState(getInitialState());

  const fetchDropdownData = useCallback(async () => {
    try {
      const [accRes, catRes, subCatRes] = await Promise.all([
        supabase.from('accounts').select('id, name'),
        supabase.from('financial_categories').select('id, name, type').order('name'),
        supabase.from('financial_subcategories').select('id, name, category_id').order('name')
      ]);
      if (accRes.error) throw accRes.error;
      if (catRes.error) throw catRes.error;
      if (subCatRes.error) throw subCatRes.error;
      setAccounts(accRes.data || []);
      setCategories(catRes.data || []);
      setSubcategories(subCatRes.data || []);
    } catch (error) {
      console.error("Error fetching dropdown data:", error);
      toast({ title: "Erro ao carregar dados", description: error.message, variant: "destructive" });
    }
  }, [toast]);

  useEffect(() => {
    if(isOpen) {
      fetchDropdownData();
      if (transaction) {
        setFormData({
          description: transaction.description || '',
          type: transaction.type || defaultType || 'expense',
          amount: transaction.amount || '',
          account_id: transaction.account_id || '',
          category_id: transaction.category_id || '',
          subcategory_id: transaction.subcategory_id || '',
          payment_method: transaction.payment_method || '', 
          status: transaction.status || 'pending',
          notes: transaction.notes || '',
          transaction_date: transaction.transaction_date ? new Date(transaction.transaction_date) : new Date(),
          due_date: transaction.due_date ? new Date(transaction.due_date) : null,
        });
      } else {
        setFormData(getInitialState());
      }
    }
  }, [transaction, isOpen, fetchDropdownData, getInitialState, defaultType]);

  const handleSelectChange = (id, value) => {
    const changes = { [id]: value };
    if (id === 'type') {
      changes.category_id = '';
      changes.subcategory_id = '';
    }
    if (id === 'category_id') {
      changes.subcategory_id = '';
    }
    setFormData(prev => ({ ...prev, ...changes }));
  };

  const handleNewCategory = (newCat) => {
    fetchDropdownData().then(() => {
      if (newCat.type === formData.type) {
        setFormData(prev => ({ ...prev, category_id: newCat.id, subcategory_id: '' }));
      }
    });
  };

  const handleNewSubcategory = (newSub) => {
    fetchDropdownData().then(() => {
        setFormData(prev => ({ ...prev, subcategory_id: newSub.id }));
    });
  };

  const handleDeleteRequest = (e, id, type, name) => {
    // CRITICAL: Prevent the Select component from capturing this interaction
    e.preventDefault();
    e.stopPropagation(); 
    setDeleteConfirmation({ isOpen: true, id, type, name });
  };

  const executeDelete = async () => {
      const { id, type } = deleteConfirmation;
      if (!id) return;

      setIsDeleting(true);
      try {
        const table = type === 'category' ? 'financial_categories' : 'financial_subcategories';
        
        // First check if it's used in transactions
        const column = type === 'category' ? 'category_id' : 'subcategory_id';
        const { count, error: checkError } = await supabase
            .from('transactions')
            .select('*', { count: 'exact', head: true })
            .eq(column, id);
            
        if (checkError) throw checkError;

        if (count > 0) {
            throw new Error(`Este item está sendo usado em ${count} transações e não pode ser excluído.`);
        }

        // If category, check if it has subcategories
        if (type === 'category') {
             const { count: subCount, error: subCheckError } = await supabase
                .from('financial_subcategories')
                .select('*', { count: 'exact', head: true })
                .eq('category_id', id);
             
             if (subCheckError) throw subCheckError;
             
             if (subCount > 0) {
                 throw new Error(`Esta categoria possui ${subCount} subcategorias. Exclua as subcategorias primeiro.`);
             }
        }

        const { error } = await supabase.from(table).delete().eq('id', id);
        
        if (error) {
            throw error;
        }
        
        toast({ title: 'Item excluído com sucesso.' });
        
        // Clear selection if the deleted item was currently selected
        if (type === 'category' && formData.category_id === id) {
           setFormData(prev => ({ ...prev, category_id: '', subcategory_id: '' }));
        }
        if (type === 'subcategory' && formData.subcategory_id === id) {
           setFormData(prev => ({ ...prev, subcategory_id: '' }));
        }

        // Refresh the list
        await fetchDropdownData();
        
        // Close dialog only on success
        setDeleteConfirmation({ isOpen: false, id: null, type: null, name: '' });

      } catch (err) {
        console.error("Delete error:", err);
        toast({ variant: 'destructive', title: 'Erro ao excluir', description: err.message });
      } finally {
        setIsDeleting(false);
      }
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.description || !formData.amount || !formData.category_id) {
        toast({ title: 'Campos obrigatórios', description: 'Preencha descrição, valor e categoria.', variant: 'destructive'});
        return;
    }

    if (formData.status === 'paid' && !formData.account_id) {
        toast({ title: 'Conta obrigatória', description: 'Para transações pagas, é necessário selecionar a conta de origem/destino.', variant: 'destructive'});
        return;
    }

    setLoading(true);
    try {
        const payload = { 
            ...formData, 
            amount: parseFloat(formData.amount),
            subcategory_id: formData.subcategory_id || null,
            account_id: formData.account_id || null
        };
        
        let result;
        if(transaction) {
            result = await supabase.from('transactions').update(payload).eq('id', transaction.id);
        } else {
            result = await supabase.from('transactions').insert(payload);
        }
        
        if (result.error) throw result.error;
        
        toast({ title: `Transação ${transaction ? 'atualizada' : 'criada'} com sucesso!` });
        if(onSaveSuccess) onSaveSuccess();
        onClose();
    } catch (error) {
        toast({ title: 'Erro ao salvar transação', description: error.message, variant: 'destructive' });
    } finally {
        setLoading(false);
    }
  };

  const filteredCategories = categories.filter(c => c.type === formData.type);
  const filteredSubcategories = subcategories.filter(sc => sc.category_id === formData.category_id);

  return (
    <>
    <style>{`
        /* Hide delete button when displayed inside SelectTrigger/SelectValue */
        [data-radix-select-trigger] .delete-btn { display: none !important; }
        
        /* Ensure delete button is visible on hover inside content items */
        .select-item-container { position: relative; } /* Ensure proper positioning context for absolute X */
        .select-item-container .delete-btn { 
            opacity: 0; 
            transition: opacity 0.2s; 
            z-index: 50; /* Ensure it's above other elements if any */
        }
        .select-item-container:hover .delete-btn { opacity: 1; }
        .select-item-container:active .delete-btn { opacity: 1; } /* Fallback for touch/active state */
    `}</style>

    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] flex flex-col max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>{transaction ? 'Editar' : 'Nova'} {formData.type === 'income' ? 'Receita' : 'Despesa'}</DialogTitle>
          <DialogDescription>Preencha os detalhes da movimentação financeira.</DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 px-1">
            <form id="transacao-form" onSubmit={handleSubmit} className="space-y-4 py-4 px-1">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                    <Label>Descrição *</Label>
                    <Input id="description" value={formData.description} onChange={e => setFormData(p => ({...p, description: e.target.value}))} required placeholder="Ex: Pagamento de Fornecedor" />
                </div>
                
                <div>
                    <Label>Valor (R$) *</Label>
                    <Input id="amount" type="number" step="0.01" value={formData.amount} onChange={e => setFormData(p => ({...p, amount: e.target.value}))} required placeholder="0,00" />
                </div>
                
                <div>
                    <Label>Tipo</Label>
                    <Select value={formData.type} onValueChange={v => handleSelectChange('type', v)} disabled={!!defaultType}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                            {!defaultType && <><SelectItem value="income">Entrada (Receita)</SelectItem><SelectItem value="expense">Saída (Despesa)</SelectItem></>}
                            {defaultType === 'income' && <SelectItem value="income">Entrada (Receita)</SelectItem>}
                            {defaultType === 'expense' && <SelectItem value="expense">Saída (Despesa)</SelectItem>}
                        </SelectContent>
                    </Select>
                </div>
                
                <div>
                    <Label>Categoria *</Label>
                    <div className="flex gap-2">
                        <Select value={formData.category_id} onValueChange={v => handleSelectChange('category_id', v)} required>
                            <SelectTrigger><SelectValue placeholder="Selecione"/></SelectTrigger>
                            <SelectContent className="max-h-[200px]">
                                {filteredCategories.length === 0 ? (
                                    <SelectItem value="empty" disabled>Nenhuma categoria encontrada</SelectItem>
                                ) : (
                                    filteredCategories.map(c => (
                                        <SelectItem key={c.id} value={c.id} className="group relative flex items-center justify-between min-w-[200px] select-item-container">
                                            <span className="truncate pr-2">{c.name}</span>
                                            <div 
                                                role="button"
                                                className="delete-btn p-1 rounded-md hover:bg-red-100 text-gray-400 hover:text-red-600 transition-all z-50 absolute right-1"
                                                onPointerDown={(e) => {
                                                    // FIX: Execute logic HERE because preventDefault() prevents onClick from firing
                                                    handleDeleteRequest(e, c.id, 'category', c.name);
                                                }}
                                                title="Excluir categoria"
                                            >
                                                <X className="h-4 w-4" />
                                            </div>
                                        </SelectItem>
                                    ))
                                )}
                            </SelectContent>
                        </Select>
                        <Button type="button" variant="outline" size="icon" onClick={() => setIsCatModalOpen(true)} title="Nova Categoria" className="shrink-0">
                            <PlusCircle className="h-4 w-4" />
                        </Button>
                    </div>
                </div>

                <div>
                    <Label>Subcategoria</Label>
                    <div className="flex gap-2">
                        <Select value={formData.subcategory_id} onValueChange={v => handleSelectChange('subcategory_id', v)} disabled={!formData.category_id}>
                            <SelectTrigger><SelectValue placeholder={!formData.category_id ? 'Selecione categoria' : 'Selecione (Opcional)'}/></SelectTrigger>
                            <SelectContent className="max-h-[200px]">
                                {filteredSubcategories.length === 0 ? (
                                    <SelectItem value="empty" disabled>Nenhuma subcategoria</SelectItem>
                                ) : (
                                    filteredSubcategories.map(sc => (
                                        <SelectItem key={sc.id} value={sc.id} className="group relative flex items-center justify-between min-w-[200px] select-item-container">
                                            <span className="truncate pr-2">{sc.name}</span>
                                            <div 
                                                role="button"
                                                className="delete-btn p-1 rounded-md hover:bg-red-100 text-gray-400 hover:text-red-600 transition-all z-50 absolute right-1"
                                                onPointerDown={(e) => {
                                                    // FIX: Execute logic HERE because preventDefault() prevents onClick from firing
                                                    handleDeleteRequest(e, sc.id, 'subcategory', sc.name);
                                                }}
                                                title="Excluir subcategoria"
                                            >
                                                <X className="h-4 w-4" />
                                            </div>
                                        </SelectItem>
                                    ))
                                )}
                            </SelectContent>
                        </Select>
                        <Button type="button" variant="outline" size="icon" onClick={() => setIsSubCatModalOpen(true)} disabled={!formData.category_id} title="Nova Subcategoria" className="shrink-0">
                            <PlusCircle className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
                
                <div>
                    <Label>Conta / Caixa {formData.status === 'paid' && '*'}</Label>
                    <Select value={formData.account_id} onValueChange={v => handleSelectChange('account_id', v)}>
                        <SelectTrigger><SelectValue placeholder="Selecione (Opcional)"/></SelectTrigger>
                        <SelectContent>
                            {accounts.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>

                <div>
                    <Label>Meio de Pagamento</Label>
                    <Input 
                        id="payment_method" 
                        value={formData.payment_method} 
                        onChange={e => setFormData(p => ({...p, payment_method: e.target.value}))} 
                        placeholder="Ex: Pix, Dinheiro, Cartão" 
                    />
                </div>
                
                <div>
                    <Label>Status</Label>
                    <Select value={formData.status} onValueChange={v => handleSelectChange('status', v)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="paid">Pago / Realizado</SelectItem>
                            <SelectItem value="pending">Pendente / Agendado</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-1">
                    <Label>Data da Transação</Label>
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button variant="outline" className={`w-full justify-start text-left font-normal ${!formData.transaction_date && "text-muted-foreground"}`}>
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {formData.transaction_date ? format(formData.transaction_date, "dd/MM/yyyy") : <span>Selecione</span>}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                            <Calendar mode="single" selected={formData.transaction_date} onSelect={d => d && setFormData(p => ({...p, transaction_date: d}))} initialFocus />
                        </PopoverContent>
                    </Popover>
                </div>
                
                {formData.status === 'pending' && (
                <div className="space-y-1">
                    <Label>Data de Vencimento</Label>
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button variant="outline" className={`w-full justify-start text-left font-normal ${!formData.due_date && "text-muted-foreground"}`}>
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {formData.due_date ? format(formData.due_date, "dd/MM/yyyy") : <span>Selecione</span>}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                            <Calendar mode="single" selected={formData.due_date} onSelect={d => setFormData(p => ({...p, due_date: d}))} initialFocus />
                        </PopoverContent>
                    </Popover>
                </div>
                )}
                
                <div className="md:col-span-2">
                    <Label>Observações</Label>
                    <Textarea value={formData.notes} onChange={e => setFormData(p => ({...p, notes: e.target.value}))} placeholder="Detalhes adicionais..." />
                </div>
                </div>
            </form>
        </ScrollArea>

        <DialogFooter className="mt-4">
          <Button type="button" variant="outline" onClick={onClose} disabled={loading}>Cancelar</Button>
          <Button type="submit" form="transacao-form" disabled={loading}>{loading ? 'Salvando...' : 'Salvar'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    
    <CategoriaFinanceiraDialog
        isOpen={isCatModalOpen}
        onClose={() => setIsCatModalOpen(false)}
        onSave={handleNewCategory}
        defaultType={formData.type}
    />

    <SubcategoriaFinanceiraDialog
        isOpen={isSubCatModalOpen}
        onClose={() => setIsSubCatModalOpen(false)}
        onSave={handleNewSubcategory}
        categoriaId={formData.category_id}
    />

    {/* Delete Confirmation Alert */}
    <AlertDialog open={deleteConfirmation.isOpen} onOpenChange={(open) => {
        if (!open && !isDeleting) {
            setDeleteConfirmation({isOpen: false, id: null, type: null, name: ''});
        }
    }}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Excluir {deleteConfirmation.type === 'category' ? 'Categoria' : 'Subcategoria'}</AlertDialogTitle>
                <AlertDialogDescription>
                    Tem certeza que deseja excluir permanentemente <strong>"{deleteConfirmation.name}"</strong>?
                    <br/><br/>
                    <span className="text-red-600 font-semibold">Atenção:</span> Esta ação não pode ser desfeita e falhará se o item estiver em uso.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
                <Button 
                    variant="destructive" 
                    onClick={executeDelete} 
                    disabled={isDeleting}
                    className="bg-red-600 hover:bg-red-700"
                >
                    {isDeleting ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Excluindo...
                        </>
                    ) : (
                        'Excluir Permanentemente'
                    )}
                </Button>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
    </>
  );
};

export default TransacaoDialog;