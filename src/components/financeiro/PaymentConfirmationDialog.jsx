import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarIcon, Loader2 } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';

const PaymentConfirmationDialog = ({ isOpen, onClose, onConfirm, transaction }) => {
  const { toast } = useToast();
  const [accounts, setAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && transaction) {
      const fetchInitialData = async () => {
        setLoading(true);
        try {
            const { data: accountsData, error: accountsError } = await supabase
                .from('accounts')
                .select('id, name')
                .order('name');
            if (accountsError) throw accountsError;
            setAccounts(accountsData || []);
            
            // Use account_id from the transaction object if it exists
            if (transaction.account_id) {
                setSelectedAccount(transaction.account_id);
            } else {
                setSelectedAccount('');
            }
            setPaymentDate(new Date());

        } catch (error) {
            console.error('Error loading dialog data:', error);
            toast({ title: "Erro ao carregar dados", description: error.message, variant: "destructive" });
        } finally {
            setLoading(false);
        }
      };
      
      fetchInitialData();
    }
  }, [isOpen, transaction, toast]);

  const handleConfirm = () => {
    if (!selectedAccount) {
      toast({ title: 'Erro', description: 'Selecione a conta de destino.', variant: 'destructive' });
      return;
    }
    onConfirm({ accountId: selectedAccount, paymentDate });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Confirmar Recebimento</DialogTitle>
          <DialogDescription>
             Selecione a conta onde o valor será registrado e a data efetiva.
          </DialogDescription>
        </DialogHeader>
        
        {loading ? (
            <div className="py-12 flex justify-center items-center">
                <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
            </div>
        ) : (
            <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                    <Label>Caixa de Destino</Label>
                    <Select value={selectedAccount} onValueChange={setSelectedAccount}>
                    <SelectTrigger>
                        <SelectValue placeholder="Selecione a conta" />
                    </SelectTrigger>
                    <SelectContent>
                        {accounts.map(acc => (
                        <SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>
                        ))}
                    </SelectContent>
                    </Select>
                </div>

                <div className="grid gap-2">
                    <Label>Data do Recebimento</Label>
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button variant="outline" className={`w-full justify-start text-left font-normal ${!paymentDate && "text-muted-foreground"}`}>
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {paymentDate ? format(paymentDate, "dd/MM/yyyy") : <span>Selecione</span>}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                            <Calendar mode="single" selected={paymentDate} onSelect={setPaymentDate} initialFocus />
                        </PopoverContent>
                    </Popover>
                </div>
            </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>Cancelar</Button>
          <Button onClick={handleConfirm} disabled={loading}>Confirmar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PaymentConfirmationDialog;