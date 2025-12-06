import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { DollarSign } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

const RegisterPaymentDialog = ({ isOpen, onClose, osData, onSuccess }) => {
  const [formData, setFormData] = useState({
    payment_date: new Date().toISOString().split('T')[0],
    method: 'credit_card',
    amount: osData?.total_amount || '',
    notes: ''
  });
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handlePayment = async () => {
    setLoading(true);
    try {
        // 1. Update Accounts Receivable
        const { error: arError } = await supabase
            .from('accounts_receivable')
            .update({ status: 'Pago', updated_at: new Date() })
            .eq('service_order_id', osData.id);
            
        if (arError) throw arError;

        // 2. Create Transaction
        const { error: txError } = await supabase.from('transactions').insert({
            description: `Pagamento OS #${osData.os_number} - ${formData.method}`,
            type: 'income',
            amount: formData.amount,
            transaction_date: formData.payment_date,
            status: 'paid',
            category_id: null, // Ideally map to a category like "Services"
            account_id: null, // Needs default account logic or selection
            work_order_id: null, // Legacy ref, can use notes or linking table if schema supported
            notes: `OS: ${osData.os_number}. ${formData.notes}`
        });

        if (txError) throw txError;

        toast({ title: "Pagamento Registrado", description: "O financeiro foi atualizado com sucesso." });
        if(onSuccess) onSuccess();
        onClose();
    } catch (error) {
        console.error(error);
        toast({ title: "Erro ao registrar pagamento", description: "Verifique se existe uma conta a receber pendente.", variant: "destructive" });
    } finally {
        setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Registrar Pagamento</DialogTitle>
          <DialogDescription>OS #{osData?.os_number} - Total: {formatCurrency(osData?.total_amount)}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
                <Label>Data Pagamento</Label>
                <Input type="date" value={formData.payment_date} onChange={e => setFormData({...formData, payment_date: e.target.value})} />
            </div>
            <div className="space-y-2">
                <Label>Valor (R$)</Label>
                <Input type="number" value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label>Forma de Pagamento</Label>
            <Select value={formData.method} onValueChange={v => setFormData({...formData, method: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                    <SelectItem value="credit_card">Cartão de Crédito</SelectItem>
                    <SelectItem value="debit_card">Cartão de Débito</SelectItem>
                    <SelectItem value="cash">Dinheiro</SelectItem>
                    <SelectItem value="pix">PIX</SelectItem>
                    <SelectItem value="bank_transfer">Transferência</SelectItem>
                </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
             <Label>Observações</Label>
             <Textarea value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handlePayment} disabled={loading} className="bg-green-600 hover:bg-green-700">
            <DollarSign className="w-4 h-4 mr-2" />
            {loading ? 'Processando...' : 'Confirmar Pagamento'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default RegisterPaymentDialog;