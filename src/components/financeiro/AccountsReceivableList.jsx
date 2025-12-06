import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Calendar, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { isPast, parseISO } from 'date-fns';
import { useToast } from '@/components/ui/use-toast';
import RegisterPaymentDialog from '@/components/os/actions/RegisterPaymentDialog';
import { formatDate } from '@/lib/utils';

const AccountsReceivableList = () => {
    const [receivables, setReceivables] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [selectedAccount, setSelectedAccount] = useState(null);
    const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
    const { toast } = useToast();

    const fetchReceivables = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase.rpc('get_accounts_receivable', {
                 p_status: statusFilter !== 'all' ? statusFilter : null,
                 p_customer_name: searchTerm || null
            });

            if (error) throw error;
            setReceivables(data || []);
        } catch (error) {
            console.error('Error fetching receivables:', error);
            toast({ title: 'Erro', description: 'Falha ao carregar contas a receber.', variant: 'destructive' });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchReceivables();
    }, [statusFilter, searchTerm]);

    const handleRegisterPayment = (account) => {
        setSelectedAccount(account);
        setIsPaymentDialogOpen(true);
    };

    const getStatusBadge = (status, dueDate) => {
        if (status === 'Pago') return <Badge className="bg-green-100 text-green-800 border-green-200">Pago</Badge>;
        if (status === 'Cancelado') return <Badge className="bg-gray-100 text-gray-800 border-gray-200">Cancelado</Badge>;
        
        const isOverdue = isPast(parseISO(dueDate)) && status === 'Pendente';
        if (isOverdue) return <Badge className="bg-red-100 text-red-800 border-red-200 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Vencido</Badge>;
        
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">Pendente</Badge>;
    };

    return (
        <div className="space-y-6 w-full">
             <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Contas a Receber (OS)</h2>
                    <p className="text-gray-500 text-sm">Gerencie os recebimentos vindos das Ordens de Serviço.</p>
                </div>
            </div>

            <div className="bg-white p-4 rounded-lg border shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row gap-4 w-full">
                    <div className="relative flex-grow">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                        <Input
                            placeholder="Buscar por cliente..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-9 w-full"
                        />
                    </div>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-full sm:w-[200px]">
                            <SelectValue placeholder="Filtrar Status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todos</SelectItem>
                            <SelectItem value="Pendente">Pendente</SelectItem>
                            <SelectItem value="Pago">Pago</SelectItem>
                            <SelectItem value="Cancelado">Cancelado</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="rounded-md border overflow-hidden">
                    <div className="overflow-x-auto w-full">
                        <Table className="min-w-[800px]">
                            <TableHeader>
                                <TableRow className="bg-gray-50">
                                    <TableHead className="w-[100px]">OS #</TableHead>
                                    <TableHead>Cliente</TableHead>
                                    <TableHead>Vencimento</TableHead>
                                    <TableHead className="text-right">Valor</TableHead>
                                    <TableHead className="text-center">Status</TableHead>
                                    <TableHead className="text-right">Ações</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="h-24 text-center">
                                            <div className="flex items-center justify-center"><Loader2 className="animate-spin h-6 w-6 text-blue-600" /></div>
                                        </TableCell>
                                    </TableRow>
                                ) : receivables.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="h-24 text-center text-gray-500">Nenhum registro encontrado.</TableCell>
                                    </TableRow>
                                ) : (
                                    receivables.map((item) => (
                                        <TableRow key={item.id} className="hover:bg-gray-50">
                                            <TableCell className="font-mono font-medium">#{item.os_number}</TableCell>
                                            <TableCell className="font-medium text-gray-700">{item.customer_name}</TableCell>
                                            <TableCell className="text-gray-600 text-sm">
                                                <div className="flex items-center gap-2">
                                                    <Calendar className="w-3 h-3 text-gray-400" />
                                                    {formatDate(item.due_date)}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right font-bold text-gray-900">
                                                R$ {Number(item.amount).toFixed(2)}
                                            </TableCell>
                                            <TableCell className="text-center">
                                                {getStatusBadge(item.status, item.due_date)}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                {item.status === 'Pendente' && (
                                                    <Button 
                                                        size="sm" 
                                                        variant="outline" 
                                                        className="text-green-600 hover:text-green-700 hover:bg-green-50 border-green-200"
                                                        onClick={() => handleRegisterPayment(item)}
                                                    >
                                                        <CheckCircle2 className="w-4 h-4 mr-2" />
                                                        Registrar Pagamento
                                                    </Button>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </div>
            </div>

            <RegisterPaymentDialog 
                isOpen={isPaymentDialogOpen}
                onClose={() => setIsPaymentDialogOpen(false)}
                onSuccess={fetchReceivables}
                account={selectedAccount}
            />
        </div>
    );
};

export default AccountsReceivableList;