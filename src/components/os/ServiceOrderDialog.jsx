import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Trash2, DollarSign, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import ItemCombobox from '@/components/dialogs/ItemCombobox';
import { WORK_ORDER_STATUS } from '@/lib/constants';
import { formatCurrency } from '@/lib/utils';

const ServiceOrderDialog = ({ isOpen, onClose, onSaveSuccess, workOrder = null }) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('geral');
  
  // Lists
  const [customers, setCustomers] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [technicians, setTechnicians] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [financialCategories, setFinancialCategories] = useState([]);
  
  // Form State
  const [formData, setFormData] = useState({
    customer_id: '',
    vehicle_id: '',
    technician_id: '',
    status: 'Aberta',
    title: '',
    description: '',
    priority: 'normal',
    km: '',
    scheduled_date: format(new Date(), 'yyyy-MM-dd'),
    notes: ''
  });

  const [items, setItems] = useState([]);
  const [payments, setPayments] = useState([]); // Array for split payments

  useEffect(() => {
    if (isOpen) {
      fetchBaseData();
      if (workOrder) {
         loadWorkOrderData(workOrder);
      } else {
         resetForm();
      }
    }
  }, [isOpen, workOrder]);

  const fetchBaseData = async () => {
    const [custRes, techRes, accRes, catRes] = await Promise.all([
        supabase.from('customers').select('id, name'),
        supabase.from('collaborators').select('id, name').eq('role', 'mechanic').eq('status', 'active'),
        supabase.from('accounts').select('id, name'),
        supabase.from('financial_categories').select('id, name').eq('type', 'income')
    ]);
    
    if (custRes.data) setCustomers(custRes.data);
    if (techRes.data) setTechnicians(techRes.data);
    if (accRes.data) setAccounts(accRes.data);
    if (catRes.data) setFinancialCategories(catRes.data);
  };

  useEffect(() => {
      if (formData.customer_id) {
          fetchVehicles(formData.customer_id);
      } else {
          setVehicles([]);
      }
  }, [formData.customer_id]);

  const fetchVehicles = async (customerId) => {
      const { data } = await supabase.from('vehicles').select('*').eq('customer_id', customerId);
      if (data) setVehicles(data);
  };

  const loadWorkOrderData = async (wo) => {
      setFormData({
          customer_id: wo.customer_id,
          vehicle_id: wo.vehicle_id,
          technician_id: wo.technician_id || '',
          status: wo.status,
          title: wo.title || '',
          description: wo.description || '',
          priority: wo.priority || 'normal',
          km: wo.km || '',
          scheduled_date: wo.scheduled_date || format(new Date(), 'yyyy-MM-dd'),
          notes: wo.notes || ''
      });

      // Load Items
      const { data: woItems } = await supabase.from('work_order_items').select('*').eq('work_order_id', wo.id);
      if (woItems) {
          setItems(woItems.map(i => ({
              ...i,
              tempId: Math.random().toString(36),
              type: i.item_type
          })));
      }

      // Load Transactions (Financials)
      const { data: trans } = await supabase.from('transactions')
        .select('*')
        .eq('work_order_id', wo.id)
        .eq('type', 'income');
      
      if (trans && trans.length > 0) {
          setPayments(trans.map(t => ({
              tempId: Math.random().toString(36),
              payment_method: t.payment_method || '',
              account_id: t.account_id || '',
              amount: t.amount,
              due_date: t.due_date || wo.scheduled_date,
              status: t.status,
              dbId: t.id // Keep track of existing ID
          })));
      } else {
        setPayments([]);
      }
  };

  const resetForm = () => {
      setFormData({
        customer_id: '', vehicle_id: '', technician_id: '', status: 'Aberta',
        title: '', description: '', priority: 'normal', km: '',
        scheduled_date: format(new Date(), 'yyyy-MM-dd'), notes: ''
      });
      setItems([]);
      setPayments([]);
      setActiveTab('geral');
  };

  // --- ITEM HANDLERS ---
  const handleAddItem = (item) => {
      const newItem = {
          tempId: Math.random().toString(36),
          item_type: item.type,
          product_id: item.product_id || null,
          product_variant_id: item.value,
          description: item.label,
          quantity: 1,
          unit_price: item.price,
          total_price: item.price
      };
      setItems([...items, newItem]);
  };

  const handleRemoveItem = (index) => {
      setItems(items.filter((_, i) => i !== index));
  };

  const handleUpdateItem = (index, field, value) => {
      const newItems = [...items];
      newItems[index][field] = value;
      if (field === 'quantity' || field === 'unit_price') {
          newItems[index].total_price = (newItems[index].quantity * newItems[index].unit_price);
      }
      setItems(newItems);
  };

  // --- PAYMENT HANDLERS ---
  const handleAddPayment = () => {
      const itemsTotal = items.reduce((sum, item) => sum + (parseFloat(item.total_price) || 0), 0);
      const currentPaymentsTotal = payments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
      const remaining = Math.max(0, itemsTotal - currentPaymentsTotal);

      setPayments([...payments, {
          tempId: Math.random().toString(36),
          payment_method: '',
          account_id: '',
          amount: remaining,
          due_date: formData.scheduled_date || format(new Date(), 'yyyy-MM-dd'),
          status: 'pending'
      }]);
  };

  const handleRemovePayment = (index) => {
      setPayments(payments.filter((_, i) => i !== index));
  };

  const handleUpdatePayment = (index, field, value) => {
      const newPayments = [...payments];
      newPayments[index][field] = value;
      setPayments(newPayments);
  };

  // --- SUBMIT ---
  const handleSubmit = async () => {
      if (!formData.customer_id || !formData.vehicle_id) {
          toast({ title: 'Campos obrigatórios', description: 'Selecione cliente e veículo.', variant: 'destructive' });
          return;
      }

      setLoading(true);
      try {
          // 1. Save/Update OS
          const payload = {
              ...formData,
              order_date: new Date().toISOString(), // Ensure created date is set
              updated_at: new Date().toISOString()
          };
          
          let woId = workOrder?.id;
          
          if (woId) {
              const { error } = await supabase.from('work_orders').update(payload).eq('id', woId);
              if (error) throw error;
              // Clear existing items to rewrite (simplest sync method)
              await supabase.from('work_order_items').delete().eq('work_order_id', woId);
          } else {
              const { data, error } = await supabase.from('work_orders').insert(payload).select().single();
              if (error) throw error;
              woId = data.id;
          }

          // 2. Save Items
          const itemsToInsert = items.map(item => ({
              work_order_id: woId,
              item_type: item.item_type,
              product_id: item.product_id,
              product_variant_id: item.product_variant_id,
              collaborator_id: formData.technician_id || null,
              description: item.description,
              quantity: parseFloat(item.quantity),
              unit_price: parseFloat(item.unit_price),
              total_price: parseFloat(item.total_price),
              cost_price: 0 
          }));
          
          if (itemsToInsert.length > 0) {
              const { error: itemsError } = await supabase.from('work_order_items').insert(itemsToInsert);
              if (itemsError) throw itemsError;
          }

          // 3. Save Financials (Transactions)
          // Strategy: If any existing transaction is PAID, we DO NOT touch it to maintain integrity.
          // If all are PENDING, we can sync (delete old pending, insert new).
          
          const { data: existingTrans } = await supabase.from('transactions')
             .select('status')
             .eq('work_order_id', woId)
             .eq('type', 'income');
             
          const hasPaidTransaction = existingTrans?.some(t => t.status === 'paid');

          if (hasPaidTransaction) {
             // If there are paid transactions, we only insert NEW ones, we don't delete old ones to avoid data loss.
             // Actually, complex syncing with paid transactions is risky. 
             // If the user is editing an OS with paid transactions, we skip full sync and alert if they tried to change it.
             // For this implementation, we will only sync if NO paid transactions exist, or only append?
             // Let's stick to: If hasPaidTransaction, we skip financial update logic to be safe, 
             // unless the user explicitly knows. 
             // But the prompt is about "Creating". For creation, no paid trans exist. 
             // For editing, we'll check.
             if (payments.length > 0) {
                 toast({ title: 'Aviso Financeiro', description: 'Existem pagamentos já baixados. O plano financeiro não foi totalmente sobrescrito para evitar erros.', variant: 'warning' });
             }
          } else {
             // Safe to rewrite pending transactions
             await supabase.from('transactions').delete().eq('work_order_id', woId).eq('type', 'income').eq('status', 'pending');
             
             const transactionsToInsert = payments.map(p => ({
                 work_order_id: woId,
                 account_id: p.account_id,
                 type: 'income',
                 description: `Receita OS ${woId.substring(0,8)}`,
                 amount: parseFloat(p.amount),
                 transaction_date: new Date().toISOString(), // Creation date of transaction record
                 status: 'pending', // Always pending initially as per requirements
                 payment_method: p.payment_method,
                 due_date: p.due_date, // From input or OS date
                 category_id: financialCategories[0]?.id // Default category
             }));

             if (transactionsToInsert.length > 0) {
                 const { error: transError } = await supabase.from('transactions').insert(transactionsToInsert);
                 if (transError) throw transError;
             }
          }

          toast({ title: 'Ordem de Serviço salva com sucesso!' });
          onSaveSuccess();
          onClose();
      } catch (error) {
          console.error(error);
          toast({ title: 'Erro ao salvar', description: error.message, variant: 'destructive' });
      } finally {
          setLoading(false);
      }
  };

  const itemsTotal = items.reduce((sum, item) => sum + (parseFloat(item.total_price) || 0), 0);
  const paymentsTotal = payments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
  const financialBalance = itemsTotal - paymentsTotal;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{workOrder ? 'Editar Ordem de Serviço' : 'Nova Ordem de Serviço'}</DialogTitle>
          <DialogDescription>Preencha os detalhes da OS.</DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
            <div className="px-1">
                <TabsList className="w-full justify-start">
                    <TabsTrigger value="geral">Geral</TabsTrigger>
                    <TabsTrigger value="itens">Itens e Serviços</TabsTrigger>
                    <TabsTrigger value="financeiro" className="flex gap-2">
                        Financeiro 
                        {financialBalance !== 0 && <span className="w-2 h-2 rounded-full bg-yellow-500" />}
                    </TabsTrigger>
                </TabsList>
            </div>

            <div className="flex-1 overflow-y-auto p-1 mt-2">
                <TabsContent value="geral" className="space-y-4 mt-0">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Cliente *</Label>
                            <Select value={formData.customer_id} onValueChange={(v) => setFormData(prev => ({ ...prev, customer_id: v }))}>
                                <SelectTrigger><SelectValue placeholder="Selecione o cliente" /></SelectTrigger>
                                <SelectContent>{customers.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Veículo *</Label>
                            <Select value={formData.vehicle_id} onValueChange={(v) => setFormData(prev => ({ ...prev, vehicle_id: v }))} disabled={!formData.customer_id}>
                                <SelectTrigger><SelectValue placeholder="Selecione o veículo" /></SelectTrigger>
                                <SelectContent>{vehicles.map(v => <SelectItem key={v.id} value={v.id}>{v.brand} {v.model} ({v.plate})</SelectItem>)}</SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Mecânico Responsável</Label>
                            <Select value={formData.technician_id} onValueChange={(v) => setFormData(prev => ({ ...prev, technician_id: v }))}>
                                <SelectTrigger><SelectValue placeholder="Selecione o mecânico" /></SelectTrigger>
                                <SelectContent>{technicians.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Status</Label>
                            <Select value={formData.status} onValueChange={(v) => setFormData(prev => ({ ...prev, status: v }))}>
                                <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Aberta">Aberta</SelectItem>
                                    <SelectItem value="Concluída">Concluída</SelectItem>
                                    <SelectItem value="Cancelada">Cancelada</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Título / Resumo</Label>
                            <Input value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} placeholder="Ex: Troca de óleo" />
                        </div>
                        <div className="space-y-2">
                            <Label>Quilometragem</Label>
                            <Input type="number" value={formData.km} onChange={e => setFormData({...formData, km: e.target.value})} placeholder="KM atual" />
                        </div>
                        <div className="md:col-span-2 space-y-2">
                             <Label>Observações Técnicas</Label>
                             <Textarea value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} placeholder="Detalhes do serviço..." />
                        </div>
                    </div>
                </TabsContent>

                <TabsContent value="itens" className="space-y-4 mt-0">
                    <div className="border rounded-lg p-4 space-y-4 bg-white">
                        <div className="flex justify-between items-center flex-wrap gap-2">
                            <h3 className="text-lg font-semibold">Peças e Serviços</h3>
                            <div className="w-full sm:w-72">
                                <ItemCombobox onSelect={handleAddItem} />
                            </div>
                        </div>
                        
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Descrição</TableHead>
                                    <TableHead className="w-20">Qtd</TableHead>
                                    <TableHead className="w-28">Unit. (R$)</TableHead>
                                    <TableHead className="w-28 text-right">Total (R$)</TableHead>
                                    <TableHead className="w-10"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {items.map((item, idx) => (
                                    <TableRow key={item.tempId || idx}>
                                        <TableCell>{item.description}</TableCell>
                                        <TableCell>
                                            <Input type="number" className="h-8 px-2" value={item.quantity} onChange={e => handleUpdateItem(idx, 'quantity', e.target.value)} />
                                        </TableCell>
                                        <TableCell>
                                            <Input type="number" className="h-8 px-2" value={item.unit_price} onChange={e => handleUpdateItem(idx, 'unit_price', e.target.value)} />
                                        </TableCell>
                                        <TableCell className="text-right font-medium">
                                            {parseFloat(item.total_price).toFixed(2)}
                                        </TableCell>
                                        <TableCell>
                                            <Button variant="ghost" size="icon" onClick={() => handleRemoveItem(idx)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {items.length === 0 && (
                                    <TableRow><TableCell colSpan={5} className="text-center text-gray-500 h-24">Nenhum item adicionado.</TableCell></TableRow>
                                )}
                            </TableBody>
                        </Table>
                        <div className="flex justify-end items-center gap-2 pt-2 border-t">
                            <span className="font-semibold text-lg">Total Itens:</span>
                            <span className="text-2xl font-bold text-blue-700">{formatCurrency(itemsTotal)}</span>
                        </div>
                    </div>
                </TabsContent>

                <TabsContent value="financeiro" className="space-y-4 mt-0">
                     <div className="border rounded-lg p-4 bg-white space-y-4">
                        <div className="flex justify-between items-center">
                             <div>
                                <h3 className="text-lg font-semibold flex items-center gap-2"><DollarSign className="w-5 h-5 text-green-600"/> Plano de Pagamento</h3>
                                <p className="text-sm text-gray-500">Defina como esta OS será paga. Isso irá gerar contas a receber.</p>
                             </div>
                             <Button size="sm" variant="outline" onClick={handleAddPayment}><Plus className="w-4 h-4 mr-2" /> Adicionar Pagamento</Button>
                        </div>

                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-40">Forma Pagamento</TableHead>
                                        <TableHead className="w-40">Conta Destino</TableHead>
                                        <TableHead className="w-32">Vencimento</TableHead>
                                        <TableHead className="w-32">Valor (R$)</TableHead>
                                        <TableHead className="w-10"></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {payments.map((p, idx) => (
                                        <TableRow key={p.tempId || idx}>
                                            <TableCell>
                                                <Input 
                                                    value={p.payment_method} 
                                                    onChange={e => handleUpdatePayment(idx, 'payment_method', e.target.value)} 
                                                    placeholder="Ex: Pix, Dinheiro"
                                                    disabled={p.status === 'paid'}
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <Select 
                                                    value={p.account_id} 
                                                    onValueChange={v => handleUpdatePayment(idx, 'account_id', v)}
                                                    disabled={p.status === 'paid'}
                                                >
                                                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                                                    <SelectContent>
                                                        {accounts.map(acc => <SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>)}
                                                    </SelectContent>
                                                </Select>
                                            </TableCell>
                                            <TableCell>
                                                <Input 
                                                    type="date" 
                                                    value={p.due_date ? format(new Date(p.due_date), 'yyyy-MM-dd') : ''} 
                                                    onChange={e => handleUpdatePayment(idx, 'due_date', e.target.value)}
                                                    disabled={p.status === 'paid'}
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <Input 
                                                    type="number" 
                                                    step="0.01" 
                                                    value={p.amount} 
                                                    onChange={e => handleUpdatePayment(idx, 'amount', e.target.value)}
                                                    disabled={p.status === 'paid'}
                                                />
                                            </TableCell>
                                            <TableCell>
                                                {p.status !== 'paid' && (
                                                    <Button variant="ghost" size="icon" onClick={() => handleRemovePayment(idx)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {payments.length === 0 && (
                                        <TableRow><TableCell colSpan={5} className="text-center text-gray-500 py-6">Nenhum pagamento registrado.</TableCell></TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>

                        <div className="flex justify-between items-center pt-2 border-t">
                            <div className="flex items-center gap-2">
                                {Math.abs(financialBalance) > 0.01 && (
                                    <div className="flex items-center text-yellow-600 bg-yellow-50 px-3 py-1 rounded-md text-sm font-medium">
                                        <AlertCircle className="w-4 h-4 mr-2"/>
                                        Diferença: {formatCurrency(financialBalance)}
                                    </div>
                                )}
                            </div>
                            <div className="text-right">
                                <div className="text-sm text-gray-500">Total Previsto</div>
                                <div className={`text-xl font-bold ${Math.abs(financialBalance) < 0.01 ? 'text-green-600' : 'text-gray-800'}`}>
                                    {formatCurrency(paymentsTotal)}
                                </div>
                            </div>
                        </div>
                     </div>
                </TabsContent>
            </div>
        </Tabs>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={loading}>{loading ? 'Salvando...' : 'Salvar OS'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ServiceOrderDialog;