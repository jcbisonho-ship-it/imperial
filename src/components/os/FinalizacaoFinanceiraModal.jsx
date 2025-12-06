import React, { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, Calculator, CreditCard, Calendar, AlertTriangle, Loader2 } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { osService } from '@/services/osService';

const PAYMENT_TYPES = [
    { value: 'dinheiro', label: 'Dinheiro' },
    { value: 'pix', label: 'PIX' },
    { value: 'cartao_credito', label: 'Cartão de Crédito' },
    { value: 'cartao_debito', label: 'Cartão de Débito' },
    { value: 'boleto', label: 'Boleto' },
    { value: 'transferencia', label: 'Transferência Bancária' }
];

const FinalizacaoFinanceiraModal = ({ isOpen, onClose, budgetData, onConfirm }) => {
    const [activeTab, setActiveTab] = useState("pagamento");
    const [accounts, setAccounts] = useState([]);
    const [financialCategories, setFinancialCategories] = useState([]);
    const [loading, setLoading] = useState(false);
    const { toast } = useToast();

    // State for financial data
    const [payments, setPayments] = useState([]);
    const [installments, setInstallments] = useState([]);
    const [discount, setDiscount] = useState({ type: 'fixed', value: 0 }); // fixed or percentage
    
    // Installment settings
    const [installmentConfig, setInstallmentConfig] = useState({ count: 1, interval: 30 });

    // New payment input state
    const [newPayment, setNewPayment] = useState({
        type: 'pix',
        amount: 0,
        accountId: '',
        status: 'paid', // 'paid' (Caixa) or 'pending' (Contas a Receber)
        observation: '',
        dueDate: new Date().toISOString().split('T')[0]
    });

    const totalBudget = Number(budgetData?.total_cost || 0);

    const fetchFullBudgetData = useCallback(async () => {
        if (!budgetData?.id) return;
        resetForm();
    }, [budgetData]);
    
    useEffect(() => {
        if (isOpen) {
            fetchAccounts();
            fetchFullBudgetData();
        }
    }, [isOpen, fetchFullBudgetData]);

    const resetForm = () => {
        setPayments([]);
        setInstallments([]);
        setDiscount({ type: 'fixed', value: 0 });
        setInstallmentConfig({ count: 1, interval: 30 });
        setNewPayment({ 
            type: 'pix', 
            amount: totalBudget, 
            accountId: '', 
            status: 'paid',
            observation: '',
            dueDate: new Date().toISOString().split('T')[0]
        });
    };

    const fetchAccounts = async () => {
        try {
            const [accRes, catRes] = await Promise.all([
                supabase.from('accounts').select('id, name'),
                supabase.from('financial_categories').select('id').eq('type', 'income').limit(1)
            ]);

            if (accRes.error) throw accRes.error;
            setAccounts(accRes.data || []);
            if (catRes.data && catRes.data.length > 0) {
                 setFinancialCategories(catRes.data);
            }
            
            if (accRes.data && accRes.data.length > 0) {
                setNewPayment(prev => ({ ...prev, accountId: accRes.data[0].id }));
            }
        } catch (error) {
            console.error('Error fetching accounts:', error);
            toast({ title: 'Erro', description: 'Não foi possível carregar dados financeiros.', variant: 'destructive' });
        }
    };

    // Calculations
    const discountValue = discount.type === 'fixed' 
        ? Number(discount.value) 
        : (totalBudget * (Number(discount.value) / 100));
    
    const netValue = Math.max(0, totalBudget - discountValue);
    
    const totalPaid = payments.reduce((acc, p) => acc + Number(p.amount), 0);
    const remaining = Math.max(0, netValue - totalPaid);

    const handleAddPayment = () => {
        if (Number(newPayment.amount) <= 0) {
            toast({ title: 'Valor inválido', description: 'O valor deve ser maior que zero.', variant: 'destructive' });
            return;
        }
        // Account is mandatory ONLY if status is PAID
        if (newPayment.status === 'paid' && !newPayment.accountId) {
            toast({ title: 'Conta obrigatória', description: 'Selecione a conta de destino para pagamentos realizados.', variant: 'destructive' });
            return;
        }
        
        setPayments([...payments, { ...newPayment, id: Date.now() }]);
        
        // Reset amount to remaining, keeping other settings
        const currentTotalPaid = [...payments, { ...newPayment }].reduce((acc, p) => acc + Number(p.amount), 0);
        const newRemaining = Math.max(0, netValue - currentTotalPaid);
        
        setNewPayment(prev => ({ 
            ...prev, 
            amount: newRemaining, 
            observation: '' 
        }));
    };

    const handleRemovePayment = (id) => {
        setPayments(payments.filter(p => p.id !== id));
    };

    const generateInstallments = () => {
        if (remaining <= 0) return; 
        
        const count = Math.max(1, Number(installmentConfig.count));
        const interval = Math.max(1, Number(installmentConfig.interval));
        const installmentValue = remaining / count;
        
        const newInstallments = [];
        for (let i = 1; i <= count; i++) {
            const date = new Date();
            date.setDate(date.getDate() + (interval * (i - 1))); 
            
            newInstallments.push({
                number: i,
                value: installmentValue,
                dueDate: date.toISOString().split('T')[0],
                status: 'pending', // Installments are always pending initially
                type: 'boleto' // Default type for installments
            });
        }
        setInstallments(newInstallments);
    };

    useEffect(() => {
        if (remaining > 0) {
            generateInstallments();
        } else {
            setInstallments([]);
        }
    }, [installmentConfig, remaining, discountValue]);


    const handleConfirm = async () => {
        const totalInstallments = installments.reduce((acc, i) => acc + Number(i.value), 0);
        const totalAllocated = totalPaid + totalInstallments;
        
        if (Math.abs(totalAllocated - netValue) > 0.05) {
             toast({ 
                 title: 'Valores divergentes', 
                 description: `O total alocado (${formatCurrency(totalAllocated)}) deve ser igual ao valor líquido (${formatCurrency(netValue)}). Diferença: ${formatCurrency(netValue - totalAllocated)}`, 
                 variant: 'destructive' 
             });
             return;
        }

        setLoading(true);
        try {
            // Combine immediate payments and installments into a single list of transactions
            // The backend function will iterate over this list and create records in 'transactions' table
            const allTransactions = [
                ...payments.map(p => ({
                    amount: p.amount,
                    type: 'income',
                    status: p.status, // 'paid' or 'pending'
                    payment_method: p.type,
                    account_id: p.accountId || null,
                    description: `Receita OS (Pagamento: ${PAYMENT_TYPES.find(t=>t.value===p.type)?.label})`,
                    due_date: p.status === 'pending' ? p.dueDate : null, // If pending, it needs a due date
                    transaction_date: p.status === 'paid' ? new Date().toISOString() : null, // If paid, effective date is now
                    notes: p.observation,
                    category_id: financialCategories[0]?.id
                })),
                ...installments.map(i => ({
                    amount: i.value,
                    type: 'income',
                    status: 'pending',
                    payment_method: 'boleto', // Default or configurable?
                    account_id: null, // Pending usually doesn't have account yet
                    description: `Receita OS (Parcela ${i.number}/${installments.length})`,
                    due_date: i.dueDate,
                    transaction_date: null,
                    notes: 'Gerado automaticamente pelo parcelamento',
                    category_id: financialCategories[0]?.id
                }))
            ];

            const financialData = {
                transactions: allTransactions,
                discountValue,
                netValue,
                totalBudget,
            };

            await osService.createFromBudget(budgetData.id, financialData);
            
            onConfirm();
            onClose();

        } catch (error) {
            console.error("Finalization Error:", error);
            toast({ title: 'Erro na conversão', description: error.message, variant: 'destructive' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Calculator className="h-5 w-5 text-blue-600" />
                        Finalizar e Converter Orçamento #{budgetData?.budget_number}
                    </DialogTitle>
                    <DialogDescription>
                        Defina os lançamentos financeiros para esta Ordem de Serviço.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 py-4">
                    <div className="lg:col-span-2 space-y-6">
                        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                            <TabsList className="grid w-full grid-cols-2">
                                <TabsTrigger value="pagamento">Lançamentos Financeiros</TabsTrigger>
                                <TabsTrigger value="parcelamento" disabled={remaining <= 0}>Parcelamento Automático</TabsTrigger>
                            </TabsList>

                            <TabsContent value="pagamento" className="space-y-4 mt-4 border p-4 rounded-md bg-gray-50">
                                <h4 className="font-semibold text-sm text-gray-700 flex items-center gap-2">
                                    <CreditCard className="h-4 w-4" /> Adicionar Pagamento / Recebível
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <div>
                                        <Label>Forma de Pagamento</Label>
                                        <Select 
                                            value={newPayment.type} 
                                            onValueChange={(v) => setNewPayment({...newPayment, type: v})}
                                        >
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                {PAYMENT_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div>
                                        <Label>Status do Lançamento</Label>
                                        <Select 
                                            value={newPayment.status} 
                                            onValueChange={(v) => setNewPayment({...newPayment, status: v})}
                                        >
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="paid">Pago (Entra no Caixa)</SelectItem>
                                                <SelectItem value="pending">Pendente (Contas a Receber)</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div>
                                        <Label>Conta Destino {newPayment.status === 'paid' && '*'}</Label>
                                        <Select 
                                            value={newPayment.accountId} 
                                            onValueChange={(v) => setNewPayment({...newPayment, accountId: v})}
                                        >
                                            <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                                            <SelectContent>
                                                {accounts.map(acc => <SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div>
                                        <Label>Vencimento (Se Pendente)</Label>
                                        <Input 
                                            type="date"
                                            value={newPayment.dueDate}
                                            onChange={(e) => setNewPayment({...newPayment, dueDate: e.target.value})}
                                            disabled={newPayment.status === 'paid'}
                                        />
                                    </div>
                                    <div>
                                        <Label>Valor (R$)</Label>
                                        <Input 
                                            type="number" 
                                            step="0.01" 
                                            value={newPayment.amount}
                                            onChange={(e) => setNewPayment({...newPayment, amount: e.target.value})}
                                        />
                                    </div>
                                    <div>
                                        <Label>Observação</Label>
                                        <Input 
                                            value={newPayment.observation}
                                            onChange={(e) => setNewPayment({...newPayment, observation: e.target.value})}
                                            placeholder="Ex: NSU 12345"
                                        />
                                    </div>
                                </div>
                                <Button onClick={handleAddPayment} className="w-full" disabled={Number(newPayment.amount) <= 0}>
                                    <Plus className="w-4 h-4 mr-2" /> Adicionar Lançamento
                                </Button>

                                {payments.length > 0 && (
                                    <div className="mt-4">
                                        <Label>Lançamentos Adicionados</Label>
                                        <div className="border rounded-md overflow-hidden">
                                            <Table>
                                                <TableHeader>
                                                    <TableRow className="bg-gray-100">
                                                        <TableHead>Tipo</TableHead>
                                                        <TableHead>Status</TableHead>
                                                        <TableHead>Vencimento</TableHead>
                                                        <TableHead>Valor</TableHead>
                                                        <TableHead></TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {payments.map(p => (
                                                        <TableRow key={p.id}>
                                                            <TableCell>{PAYMENT_TYPES.find(t => t.value === p.type)?.label}</TableCell>
                                                            <TableCell>
                                                                <span className={`text-xs px-2 py-1 rounded-full ${p.status === 'paid' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                                                                    {p.status === 'paid' ? 'Pago' : 'Pendente'}
                                                                </span>
                                                            </TableCell>
                                                            <TableCell>
                                                                {p.status === 'pending' && formatCurrency(p.dueDate)}
                                                                {p.status === 'paid' && '-'}
                                                            </TableCell>
                                                            <TableCell>{formatCurrency(p.amount)}</TableCell>
                                                            <TableCell className="text-right">
                                                                <Button variant="ghost" size="sm" onClick={() => handleRemovePayment(p.id)}>
                                                                    <Trash2 className="h-4 w-4 text-red-500"/>
                                                                </Button>
                                                            </TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        </div>
                                    </div>
                                )}
                            </TabsContent>

                            <TabsContent value="parcelamento" className="space-y-4 mt-4 border p-4 rounded-md bg-gray-50">
                                <h4 className="font-semibold text-sm text-gray-700 flex items-center gap-2">
                                    <Calendar className="h-4 w-4" /> Gerar Parcelas (Saldo Restante)
                                </h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <Label>Qtd. Parcelas</Label>
                                        <Input 
                                            type="number" 
                                            min="1" 
                                            max="24"
                                            value={installmentConfig.count}
                                            onChange={(e) => setInstallmentConfig({...installmentConfig, count: e.target.value})}
                                        />
                                    </div>
                                    <div>
                                        <Label>Intervalo (Dias)</Label>
                                        <Input 
                                            type="number" 
                                            min="1" 
                                            value={installmentConfig.interval}
                                            onChange={(e) => setInstallmentConfig({...installmentConfig, interval: e.target.value})}
                                        />
                                    </div>
                                </div>
                                
                                {installments.length > 0 && (
                                    <div className="max-h-60 overflow-y-auto border rounded-md">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead className="w-[50px]">#</TableHead>
                                                    <TableHead>Vencimento</TableHead>
                                                    <TableHead className="text-right">Valor</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {installments.map((inst, idx) => (
                                                    <TableRow key={idx}>
                                                        <TableCell>{inst.number}</TableCell>
                                                        <TableCell>
                                                            <Input 
                                                                type="date" 
                                                                value={inst.dueDate}
                                                                onChange={(e) => {
                                                                    const newInst = [...installments];
                                                                    newInst[idx].dueDate = e.target.value;
                                                                    setInstallments(newInst);
                                                                }}
                                                                className="h-8 w-full"
                                                            />
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            {formatCurrency(inst.value)}
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                )}
                            </TabsContent>
                        </Tabs>
                        
                        <div className="border p-4 rounded-md bg-white">
                            <h4 className="font-semibold text-sm text-gray-700 mb-3">Descontos</h4>
                            <div className="flex gap-4 items-end">
                                <div className="w-1/3">
                                    <Label>Tipo</Label>
                                    <Select 
                                        value={discount.type} 
                                        onValueChange={(v) => setDiscount({...discount, type: v})}
                                    >
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="fixed">Valor Fixo (R$)</SelectItem>
                                            <SelectItem value="percentage">Porcentagem (%)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="w-1/3">
                                    <Label>Valor do Desconto</Label>
                                    <Input 
                                        type="number" 
                                        min="0"
                                        value={discount.value}
                                        onChange={(e) => setDiscount({...discount, value: e.target.value})}
                                    />
                                </div>
                                <div className="pb-2 text-sm text-gray-500">
                                    Aplicado: {formatCurrency(discountValue)}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-slate-50 p-6 rounded-xl h-fit shadow-sm border space-y-4">
                        <h3 className="text-lg font-bold text-gray-900 border-b pb-2">Resumo Financeiro</h3>
                        
                        <div className="space-y-3 text-sm">
                            <div className="flex justify-between">
                                <span className="text-gray-600">Valor Orçamento:</span>
                                <span className="font-medium">{formatCurrency(totalBudget)}</span>
                            </div>
                            <div className="flex justify-between text-red-600">
                                <span>Desconto:</span>
                                <span>- {formatCurrency(discountValue)}</span>
                            </div>
                            <div className="flex justify-between border-t pt-2 text-lg font-bold">
                                <span>Total Líquido:</span>
                                <span className="text-blue-700">{formatCurrency(netValue)}</span>
                            </div>
                        </div>

                        <div className="space-y-2 pt-4">
                             <div className="flex justify-between text-sm">
                                <span className="text-green-600 font-medium">Lançamentos (Lista):</span>
                                <span>{formatCurrency(totalPaid)}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-orange-600 font-medium">Parcelas Automáticas:</span>
                                <span>{formatCurrency(installments.reduce((acc, i) => acc + Number(i.value), 0))}</span>
                            </div>
                            
                            <div className="flex justify-between border-t pt-2 font-bold">
                                <span>Restante a Alocar:</span>
                                <span className={`${remaining > 0.05 ? 'text-red-600' : 'text-green-600'}`}>
                                    {formatCurrency(remaining)}
                                </span>
                            </div>
                        </div>

                        {Math.abs(remaining) > 0.05 && (
                            <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-md text-yellow-800 text-xs flex items-start gap-2">
                                <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                                <p>Aloque todo o valor líquido (via pagamentos ou parcelas) para finalizar.</p>
                            </div>
                        )}

                        <DialogFooter className="flex-col gap-2 sm:flex-col mt-6">
                            <Button className="w-full" onClick={handleConfirm} disabled={Math.abs(remaining) > 0.05 || loading}>
                                {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/> Processando...</> : 'Confirmar e Criar OS'}
                            </Button>
                            <Button variant="outline" className="w-full" onClick={onClose} disabled={loading}>
                                Cancelar
                            </Button>
                        </DialogFooter>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default FinalizacaoFinanceiraModal;