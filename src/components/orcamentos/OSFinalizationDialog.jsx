import React, { useState, useMemo, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { osService } from '@/services/osService';
import { formatCurrency, cn } from '@/lib/utils';
import { v4 as uuidv4 } from 'uuid';
import { Plus, Trash2, Loader2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format } from 'date-fns';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';

const OSFinalizationDialog = ({ isOpen, onClose, onSave, budget }) => {
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [accounts, setAccounts] = useState([]);
    
    // Financial State
    const [discountValue, setDiscountValue] = useState(0);
    const [payments, setPayments] = useState([]);
    const [installments, setInstallments] = useState([]);
    
    // Confirmation State
    const [showConfirmation, setShowConfirmation] = useState(false);

    // Focus State for New Payments
    const [shouldFocusNewPayment, setShouldFocusNewPayment] = useState(false);

    const netValue = useMemo(() => {
        return (budget?.total_cost || 0) - discountValue;
    }, [budget, discountValue]);

    const paidValue = useMemo(() => {
        return payments.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
    }, [payments]);

    const remainingValue = useMemo(() => {
        const val = netValue - paidValue;
        return val > 0.005 ? val : 0; // Avoid floating point inaccuracies
    }, [netValue, paidValue]);
    
    useEffect(() => {
        const fetchAccounts = async () => {
            const { data, error } = await supabase.from('accounts').select('id, name');
            if (error) {
                console.error('Erro ao buscar contas:', error);
            } else {
                setAccounts(data || []);
            }
        };
        if(isOpen) fetchAccounts();
    }, [isOpen]);

    // Automatically add first payment line when dialog opens or when netValue changes if list is empty
    useEffect(() => {
        if (isOpen && payments.length === 0 && accounts.length > 0 && netValue > 0) {
             setPayments([{ 
                id: uuidv4(), 
                type: '', 
                amount: netValue.toFixed(2), // Default to full amount
                accountId: accounts[0].id, 
                status: 'paid', 
                observation: '' 
            }]);
        }
    }, [isOpen, accounts, netValue]);

    // Effect to handle auto-focus on new payment lines
    useEffect(() => {
        if (shouldFocusNewPayment && payments.length > 0) {
            const timer = setTimeout(() => {
                const rows = document.querySelectorAll('.payment-row');
                if (rows.length > 0) {
                    const lastRow = rows[rows.length - 1];
                    // Find the first focusable element (usually the Type select trigger)
                    const firstFocusable = lastRow.querySelector('button, input');
                    if (firstFocusable) {
                        firstFocusable.focus();
                    }
                }
            }, 50); // Small delay to ensure DOM is updated
            setShouldFocusNewPayment(false);
            return () => clearTimeout(timer);
        }
    }, [payments, shouldFocusNewPayment]);

    const addPayment = () => {
        const newAmount = remainingValue > 0 ? remainingValue.toFixed(2) : '';
        setPayments(prev => [...prev, { 
            id: uuidv4(), 
            type: '', 
            amount: newAmount, 
            accountId: accounts.length > 0 ? accounts[0].id : '', 
            status: 'paid', // Default to 'paid'
            observation: '' 
        }]);
        setShouldFocusNewPayment(true);
    };
    
    const removePayment = (id) => {
        setPayments(prev => prev.filter(p => p.id !== id));
    };

    const updatePayment = (id, field, value) => {
        setPayments(prev => prev.map(p => {
            if (p.id === id) {
                const updated = { ...p, [field]: value };
                return updated;
            }
            return p;
        }));
    };

    const generateInstallments = () => {
        if (remainingValue > 0) {
            setInstallments([{
                id: uuidv4(),
                number: 1,
                value: remainingValue,
                dueDate: new Date(new Date().setDate(new Date().getDate() + 30)),
                status: 'pendente'
            }]);
        } else {
            setInstallments([]);
        }
    };
    
    const handleRowKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            e.stopPropagation();

            const currentRow = e.currentTarget.closest('.payment-row');
            if (!currentRow) return;

            // Get all focusable elements in the current row
            const focusableElements = Array.from(currentRow.querySelectorAll('button, input, select, textarea, [tabindex]:not([tabindex="-1"])'));
            
            // Filter out disabled elements and hidden inputs if any
            const visibleFocusable = focusableElements.filter(el => !el.disabled && el.offsetParent !== null);
            
            // Exclude delete button from navigation flow usually, but let's keep it simple:
            // Just inputs and selects mostly.
            const inputsAndSelects = visibleFocusable.filter(el => 
                el.tagName === 'INPUT' || 
                (el.tagName === 'BUTTON' && el.getAttribute('role') === 'combobox')
            );

            const currentIndex = inputsAndSelects.indexOf(e.currentTarget);

            if (currentIndex !== -1 && currentIndex < inputsAndSelects.length - 1) {
                // Move to next field
                const nextElement = inputsAndSelects[currentIndex + 1];
                nextElement.focus();
            } else {
                // It's the last field, create new line
                addPayment();
            }
        }
    };
    
    const handleInitialSubmit = () => {
        // Validation before showing confirmation
        for (const p of payments) {
            if (p.status === 'paid' && !p.accountId) {
                toast({ title: 'Erro de validação', description: `Selecione uma Conta/Caixa para o pagamento de valor R$ ${p.amount}`, variant: 'destructive' });
                return;
            }
            if (!p.type) {
                toast({ title: 'Erro de validação', description: `Selecione a forma de pagamento para o valor R$ ${p.amount}`, variant: 'destructive' });
                return;
            }
        }
        setShowConfirmation(true);
    };

    const handleRealSubmit = async () => {
        setLoading(true);
        try {
            const financialData = {
                discountValue,
                netValue,
                payments: payments.map(p => ({
                    ...p, 
                    amount: parseFloat(p.amount),
                    status: p.status || 'pending',
                    account_id: p.accountId || null 
                })),
                installments: installments.map(i => ({...i, dueDate: format(i.dueDate, 'yyyy-MM-dd') }))
            };
            
            const result = await osService.createFromBudget(budget.id, financialData);

            toast({ 
                title: 'OS Gerada com Sucesso!', 
                description: `A OS ${result.os_number} foi finalizada e os registros financeiros foram criados.` 
            });
            onSave();
            onClose();
        } catch (error) {
            console.error(error);
            toast({ title: 'Erro ao gerar OS', description: error.message, variant: 'destructive' });
        } finally {
            setLoading(false);
            setShowConfirmation(false);
        }
    };

    return (
        <>
            <Dialog open={isOpen} onOpenChange={onClose}>
                <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Finalizar e Enviar para OS</DialogTitle>
                        <DialogDescription>
                            Confirme os detalhes financeiros para gerar a Ordem de Serviço finalizada. Orçamento {budget.budget_number}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-6 py-4">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div className="bg-gray-50 p-4 rounded-lg border">
                                <Label className="text-xs text-gray-500 uppercase">Total Bruto</Label>
                                <p className="font-bold text-xl">{formatCurrency(budget?.total_cost)}</p>
                            </div>
                            <div className="bg-gray-50 p-4 rounded-lg border space-y-1">
                                <Label htmlFor="discount" className="text-xs text-gray-500 uppercase">Desconto (R$)</Label>
                                <Input 
                                    id="discount" 
                                    type="number" 
                                    value={discountValue} 
                                    onChange={e => setDiscountValue(Number(e.target.value) || 0)} 
                                    className="h-8 bg-white" 
                                />
                            </div>
                            <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                                <Label className="text-xs text-blue-600 uppercase font-bold">Total Líquido</Label>
                                <p className="font-bold text-2xl text-blue-700">{formatCurrency(netValue)}</p>
                            </div>
                        </div>
                        
                        <div className="space-y-4 border rounded-lg p-4 bg-white">
                            <div className="flex justify-between items-center pb-2 border-b">
                                <h3 className="font-semibold flex items-center gap-2">
                                    <span className="bg-blue-100 text-blue-700 w-6 h-6 rounded-full flex items-center justify-center text-xs">1</span>
                                    Pagamentos / Entradas
                                </h3>
                            </div>
                            
                            {payments.length === 0 && (
                                <div className="text-center py-6 text-gray-400 text-sm bg-gray-50 rounded-md border border-dashed">
                                    Nenhuma forma de pagamento adicionada.
                                </div>
                            )}

                            <div className="space-y-3">
                                {payments.map(payment => (
                                    <div key={payment.id} className="payment-row grid grid-cols-12 gap-2 items-end bg-gray-50 p-3 rounded-md border">
                                        <div className="col-span-12 sm:col-span-3 space-y-1">
                                            <Label className="text-xs">Forma Pag.</Label>
                                            <Select value={payment.type} onValueChange={v => updatePayment(payment.id, 'type', v)}>
                                                <SelectTrigger 
                                                    className="h-8 bg-white"
                                                    onKeyDown={handleRowKeyDown}
                                                >
                                                    <SelectValue placeholder="Selecione..."/>
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="dinheiro">Dinheiro</SelectItem>
                                                    <SelectItem value="pix">PIX</SelectItem>
                                                    <SelectItem value="cartao_credito">Cartão Crédito</SelectItem>
                                                    <SelectItem value="cartao_debito">Cartão Débito</SelectItem>
                                                    <SelectItem value="boleto">Boleto</SelectItem>
                                                    <SelectItem value="transferencia">Transferência</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div className="col-span-6 sm:col-span-2 space-y-1">
                                            <Label className="text-xs">Status</Label>
                                            <Select value={payment.status} onValueChange={v => updatePayment(payment.id, 'status', v)}>
                                                <SelectTrigger 
                                                    className={`h-8 bg-white ${payment.status === 'paid' ? 'text-green-600 font-medium' : 'text-yellow-600'}`}
                                                    onKeyDown={handleRowKeyDown}
                                                >
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="paid">Pago (Caixa)</SelectItem>
                                                    <SelectItem value="pending">Pendente</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div className="col-span-6 sm:col-span-2 space-y-1">
                                            <Label className="text-xs">Valor (R$)</Label>
                                            <Input 
                                                type="number" 
                                                value={payment.amount} 
                                                onChange={e => updatePayment(payment.id, 'amount', e.target.value)} 
                                                onKeyDown={handleRowKeyDown}
                                                className="h-8 bg-white payment-amount-input"
                                                placeholder="0.00"
                                            />
                                        </div>

                                        <div className="col-span-12 sm:col-span-4 space-y-1">
                                            <Label className="text-xs">
                                                {payment.status === 'paid' ? 'Conta Destino / Caixa' : 'Conta Prevista (Opcional)'}
                                            </Label>
                                            <Select 
                                                value={payment.accountId} 
                                                onValueChange={v => updatePayment(payment.id, 'accountId', v)}
                                            >
                                                <SelectTrigger 
                                                    className="h-8 bg-white"
                                                    onKeyDown={handleRowKeyDown}
                                                >
                                                    <SelectValue placeholder="Selecione a conta..."/>
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {accounts.map(acc => <SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>)}
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div className="col-span-12 sm:col-span-1 flex justify-end">
                                            <Button 
                                                variant="ghost" 
                                                size="icon" 
                                                onClick={() => removePayment(payment.id)}
                                                className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                                                tabIndex={-1} // Skip tab stop to keep flow faster
                                            >
                                                <Trash2 className="w-4 h-4"/>
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            
                            <div className="flex justify-start pt-2">
                                <Button 
                                    variant="outline" 
                                    size="sm" 
                                    onClick={addPayment} 
                                    className="mt-2"
                                >
                                    <Plus className="w-3.5 h-3.5 mr-1.5" />
                                    Adicionar Pagamento
                                </Button>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-50 p-4 rounded-lg border">
                                <div className="flex gap-6 text-sm">
                                    <div>
                                        <span className="text-gray-500 block">Total Alocado:</span>
                                        <span className={cn("font-bold text-lg", paidValue > netValue ? "text-red-600" : "text-green-600")}>
                                            {formatCurrency(paidValue)}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-gray-500 block">Restante:</span>
                                        <span className={cn("font-bold text-lg", remainingValue > 0 ? "text-orange-600" : "text-gray-400")}>
                                            {formatCurrency(remainingValue)}
                                        </span>
                                    </div>
                                </div>
                                
                                {remainingValue > 0 && (
                                    <Button variant="secondary" onClick={generateInstallments} size="sm" className="w-full sm:w-auto">
                                        Gerar Parcelas (Restante)
                                    </Button>
                                )}
                            </div>

                            {installments.length > 0 && (
                                <div className="space-y-2 border rounded-lg p-4 bg-white">
                                    <h4 className="font-semibold text-sm flex items-center gap-2">
                                        <span className="bg-orange-100 text-orange-700 w-6 h-6 rounded-full flex items-center justify-center text-xs">2</span>
                                        Parcelas Futuras (Contas a Receber)
                                    </h4>
                                    <div className="space-y-2">
                                        {installments.map(inst => (
                                            <div key={inst.id} className="flex justify-between items-center p-2 bg-gray-50 rounded border text-sm">
                                                <span className="font-medium">Parcela {inst.number}</span>
                                                <span className="font-bold text-gray-700">{formatCurrency(inst.value)}</span>
                                                <span className="text-gray-500">Vencimento: {format(inst.dueDate, 'dd/MM/yyyy')}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button variant="outline" onClick={onClose}>Cancelar</Button>
                        <Button onClick={handleInitialSubmit} disabled={loading || remainingValue < -0.05}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Confirmar e Gerar OS
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <ConfirmationDialog 
                open={showConfirmation} 
                onOpenChange={setShowConfirmation}
                title="Confirmar Finalização" 
                description={`Deseja realmente finalizar este orçamento e convertê-lo em Ordem de Serviço (OS)? As movimentações financeiras serão registradas no sistema.`}
                onConfirm={handleRealSubmit}
                confirmText="Sim, Finalizar"
                loading={loading}
            />
        </>
    );
};

export default OSFinalizationDialog;