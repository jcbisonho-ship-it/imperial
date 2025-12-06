import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { ArrowRightLeft, Calendar as CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';

const Transferencias = () => {
    const [accounts, setAccounts] = useState([]);
    const [loading, setLoading] = useState(false);
    const { toast } = useToast();
    const [formData, setFormData] = useState({
        source_account_id: '',
        destination_account_id: '',
        amount: '',
        date: new Date(),
        description: ''
    });

    useEffect(() => {
        const fetchAccounts = async () => {
            const { data } = await supabase.from('accounts').select('*').order('name');
            setAccounts(data || []);
        };
        fetchAccounts();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.source_account_id || !formData.destination_account_id || !formData.amount) {
            toast({ title: "Erro", description: "Preencha todos os campos obrigatórios.", variant: "destructive" });
            return;
        }
        if (formData.source_account_id === formData.destination_account_id) {
            toast({ title: "Erro", description: "A conta de origem e destino devem ser diferentes.", variant: "destructive" });
            return;
        }

        setLoading(true);
        try {
            // Find or Create 'Transferência' category
            const { data: categoryData, error: catError } = await supabase
                .from('financial_categories')
                .select('id')
                .eq('name', 'Transferência')
                .single();
            
            let categoryId = categoryData?.id;

            if (!categoryId) {
                const { data: newCat } = await supabase.from('financial_categories').insert([{ name: 'Transferência', type: 'expense' }]).select().single();
                categoryId = newCat.id;
            }

            const amount = parseFloat(formData.amount);
            const dateStr = formData.date.toISOString();

            // Create Outgoing Transaction
            const { error: t1Error } = await supabase.from('transactions').insert({
                account_id: formData.source_account_id,
                type: 'expense',
                amount: amount,
                description: `Transferência para conta destino (Ref: ${format(formData.date, 'HH:mm')})`,
                category_id: categoryId,
                transaction_date: dateStr,
                status: 'paid',
                notes: formData.description
            });
            if (t1Error) throw t1Error;

            // Create Incoming Transaction
            const { error: t2Error } = await supabase.from('transactions').insert({
                account_id: formData.destination_account_id,
                type: 'income',
                amount: amount,
                description: `Transferência recebida da conta origem (Ref: ${format(formData.date, 'HH:mm')})`,
                category_id: categoryId,
                transaction_date: dateStr,
                status: 'paid',
                notes: formData.description
            });
            if (t2Error) throw t2Error;

            toast({ title: "Sucesso", description: "Transferência realizada com sucesso!" });
            setFormData({ ...formData, amount: '', description: '' });
        } catch (error) {
            console.error(error);
            toast({ title: "Erro", description: "Falha ao realizar transferência.", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto mt-8">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <ArrowRightLeft className="h-6 w-6 text-purple-600" />
                        Nova Transferência
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label>Conta Origem (Saiu)</Label>
                                <Select value={formData.source_account_id} onValueChange={(v) => setFormData({ ...formData, source_account_id: v })}>
                                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                                    <SelectContent>
                                        {accounts.map(acc => <SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Conta Destino (Entrou)</Label>
                                <Select value={formData.destination_account_id} onValueChange={(v) => setFormData({ ...formData, destination_account_id: v })}>
                                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                                    <SelectContent>
                                        {accounts.map(acc => <SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label>Valor (R$)</Label>
                                <Input 
                                    type="number" 
                                    step="0.01" 
                                    value={formData.amount} 
                                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })} 
                                    placeholder="0,00"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Data</Label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button variant="outline" className="w-full justify-start text-left font-normal">
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {format(formData.date, "dd/MM/yyyy")}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0">
                                        <Calendar mode="single" selected={formData.date} onSelect={(d) => d && setFormData({ ...formData, date: d })} initialFocus />
                                    </PopoverContent>
                                </Popover>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Observações</Label>
                            <Input 
                                value={formData.description} 
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })} 
                                placeholder="Opcional"
                            />
                        </div>

                        <Button type="submit" className="w-full" disabled={loading}>
                            {loading ? 'Processando...' : 'Confirmar Transferência'}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
};

export default Transferencias;