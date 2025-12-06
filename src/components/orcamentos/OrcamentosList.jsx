
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Plus, MoreHorizontal, FileText, CheckCircle, ArrowRightCircle, Printer, MessageCircle, Trash2, Loader2, CreditCard, ClipboardList } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useSearchParams, useNavigate } from 'react-router-dom';
import OrcamentoDialog from '@/components/orcamentos/OrcamentoDialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import OSFinalizationDialog from '@/components/orcamentos/OSFinalizationDialog';
import { BUDGET_STATUS, BUDGET_STATUS_MAP } from '@/lib/constants';
import { sendWhatsApp } from '@/lib/whatsapp';
import { osService } from '@/services/osService';
import PrintDocumentDialog from '@/components/documentos/PrintDocumentDialog'; // Import the unified print dialog

const getStatusVariant = (status) => {
    return BUDGET_STATUS_MAP[status]?.variant || 'secondary';
};

const OrcamentosList = () => {
    const [orcamentos, setOrcamentos] = useState([]);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();
    const [searchParams, setSearchParams] = useSearchParams();
    const navigate = useNavigate();

    const [isBudgetDialogOpen, setIsBudgetDialogOpen] = useState(false);
    const [isFinalizationDialogOpen, setIsFinalizationDialogOpen] = useState(false);
    const [isPrintDialogOpen, setIsPrintDialogOpen] = useState(false); // State for print dialog
    const [selectedBudget, setSelectedBudget] = useState(null);
    const [budgetToFinalize, setBudgetToFinalize] = useState(null);
    const [budgetToPrint, setBudgetToPrint] = useState(null); // State for budget to print
    const [printOptions, setPrintOptions] = useState({}); // State for print options
    const [budgetToDelete, setBudgetToDelete] = useState(null);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [actionLoading, setActionLoading] = useState(null);

    const fromDashboard = searchParams.get('from') === 'dashboard';

    const fetchOrcamentos = useCallback(async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('budgets')
            .select('*, customer:customers(phone, whatsapp, name), vehicle:vehicles(brand, model, plate)')
            .neq('status', 'converted')
            .order('created_at', { ascending: false });

        if (error) {
            toast({ title: 'Erro ao buscar orçamentos', description: error.message, variant: 'destructive' });
            setOrcamentos([]);
        } else {
            const formattedData = data.map(b => ({
                ...b,
                customer_name: b.customer?.name || b.customer_name || 'N/A',
                vehicle_description: b.vehicle ? `${b.vehicle.model} ${b.vehicle.plate}` : b.vehicle_description || 'N/A',
            }))
            setOrcamentos(formattedData);
        }
        setLoading(false);
    }, [toast]);


    useEffect(() => {
        fetchOrcamentos();
    }, [fetchOrcamentos]);
    
    useEffect(() => {
        const channel = supabase.channel('budgets_channel')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'budgets' }, payload => {
            fetchOrcamentos();
          }).subscribe();
    
        return () => {
          supabase.removeChannel(channel);
        };
    }, [fetchOrcamentos]);

    const handleNewBudget = () => {
        setSelectedBudget(null);
        setIsBudgetDialogOpen(true); // <-- Esta é a linha que abre o modal
    };

    const handleEditBudget = (budget) => {
        setSelectedBudget(budget);
        setIsBudgetDialogOpen(true);
    };

    const handleCloseDialogs = () => {
        setIsBudgetDialogOpen(false);
        setIsFinalizationDialogOpen(false);
        setIsPrintDialogOpen(false);
        if (fromDashboard) navigate('/');
    };
    
    // Used for updates that shouldn't close the dialog (e.g. saving budget in progress)
    const handleBudgetUpdate = () => {
        fetchOrcamentos();
    };

    // Used for updates that should close the dialog (e.g. finalization)
    const handleSaveAndClose = () => {
        fetchOrcamentos();
        handleCloseDialogs();
    };
    
    const handleFinalizeAndConvertToOS = (budget) => {
        setBudgetToFinalize(budget);
        setIsFinalizationDialogOpen(true);
    };
    
    const handleGeneratePdf = (budget) => {
        setBudgetToPrint(budget);
        setPrintOptions({}); // Default: full print
        setIsPrintDialogOpen(true);
    };
    
    const handleGenerateChecklist = (budget) => {
        setBudgetToPrint(budget);
        setPrintOptions({ checklistOnly: true }); // Checklist only
        setIsPrintDialogOpen(true);
    };
    
    const handleSendWhatsApp = (budget) => {
        const customer = budget.customer;
        const phone = customer?.whatsapp || customer?.phone;

        if (!phone) {
            toast({ title: "Telefone não encontrado", description: "O cliente não possui um número de WhatsApp ou telefone cadastrado.", variant: "destructive" });
            return;
        }

        const message = `Olá, ${budget.customer_name}! Segue o seu orçamento ${budget.budget_number} no valor de R$ ${budget.total_cost.toFixed(2)}. Estamos à disposição para qualquer dúvida.`;
        sendWhatsApp(phone, message);
    };


    const handleChangeStatus = async (budgetId, newStatus) => {
        setActionLoading(budgetId);
        const { error } = await supabase.from('budgets').update({ status: newStatus }).eq('id', budgetId);
        if (error) {
            toast({ title: 'Erro ao alterar status', description: error.message, variant: 'destructive' });
        } else {
            toast({ title: 'Status alterado com sucesso!' });
            fetchOrcamentos();
        }
        setActionLoading(null);
    };
    
    const confirmDelete = (budget) => {
        setBudgetToDelete(budget);
        setIsDeleteDialogOpen(true);
    }
    
    const handleDelete = async () => {
        if (!budgetToDelete) return;
        try {
            const { error } = await supabase.rpc('delete_budget_cascade', { p_budget_id: budgetToDelete.id });
            if (error) throw error;
            toast({ title: 'Orçamento excluído com sucesso!' });
            fetchOrcamentos();
        } catch (error) {
            toast({ title: 'Erro ao excluir', description: error.message, variant: 'destructive' });
        } finally {
            setIsDeleteDialogOpen(false);
            setBudgetToDelete(null);
        }
    };

    return (
        <>
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <h1 className="text-2xl font-bold text-gray-800">Orçamentos</h1>
                    <Button onClick={handleNewBudget} className="bg-gradient-to-r from-blue-600 to-blue-800 text-white">
                        <Plus className="w-4 h-4 mr-2" /> Novo Orçamento
                    </Button>
                </div>

                <div className="bg-white rounded-xl shadow-lg">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left text-gray-500">
                            <thead className="text-xs text-gray-700 uppercase bg-gray-100">
                                <tr>
                                    <th className="px-6 py-3">Nº</th>
                                    <th className="px-6 py-3">Data</th>
                                    <th className="px-6 py-3">Cliente</th>
                                    <th className="px-6 py-3">Veículo</th>
                                    <th className="px-6 py-3 text-right">Valor</th>
                                    <th className="px-6 py-3 text-center">Status</th>
                                    <th className="px-6 py-3 text-right">Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr><td colSpan="7" className="text-center py-12"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div></td></tr>
                                ) : orcamentos.length > 0 ? (
                                    orcamentos.map(b => (
                                        <tr 
                                            key={b.id} 
                                            className="bg-white border-b hover:bg-gray-50 cursor-pointer transition-colors"
                                            onClick={() => handleEditBudget(b)}
                                        >
                                            <td className="px-6 py-4 font-medium text-gray-900">{b.budget_number || b.id.substring(0, 4)}</td>
                                            <td className="px-6 py-4">{format(parseISO(b.created_at), "dd/MM/yyyy", { locale: ptBR })}</td>
                                            <td className="px-6 py-4">{b.customer_name}</td>
                                            <td className="px-6 py-4">{b.vehicle_description}</td>
                                            <td className="px-6 py-4 text-right">R$ {b.total_cost.toFixed(2)}</td>
                                            <td className="px-6 py-4 text-center"><Badge variant={getStatusVariant(b.status)}>{BUDGET_STATUS_MAP[b.status]?.label || b.status}</Badge></td>
                                            <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                                                {actionLoading === b.id ? <Loader2 className="h-5 w-5 animate-spin mx-auto" /> :
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="w-5 h-5" /></Button></DropdownMenuTrigger>
                                                    <DropdownMenuContent side="bottom" align="end" sideOffset={5} avoidCollisions={true}>
                                                        <DropdownMenuItem onClick={() => handleEditBudget(b)}><FileText className="w-4 h-4 mr-2" />Visualizar/Editar</DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => handleGeneratePdf(b)}><Printer className="w-4 h-4 mr-2" />Imprimir Orçamento</DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => handleGenerateChecklist(b)}><ClipboardList className="w-4 h-4 mr-2" />Imprimir Checklist</DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => handleSendWhatsApp(b)}><MessageCircle className="w-4 h-4 mr-2" />Enviar por WhatsApp</DropdownMenuItem>
                                                        <DropdownMenuSeparator />
                                                        {b.status !== BUDGET_STATUS.APPROVED && (
                                                          <DropdownMenuItem onClick={() => handleChangeStatus(b.id, BUDGET_STATUS.APPROVED)}>
                                                              <CheckCircle className="w-4 h-4 mr-2 text-green-500" />Aprovar
                                                          </DropdownMenuItem>
                                                        )}
                                                        <DropdownMenuItem onClick={() => handleFinalizeAndConvertToOS(b)} disabled={b.status !== BUDGET_STATUS.APPROVED} className="text-blue-600 focus:text-blue-700">
                                                            <CreditCard className="w-4 h-4 mr-2" />Finalizar e Criar OS
                                                        </DropdownMenuItem>
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem onClick={() => confirmDelete(b)} className="text-red-500 focus:text-red-600">
                                                            <Trash2 className="w-4 h-4 mr-2" />Excluir
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                                }
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr><td colSpan="7" className="text-center py-12 text-gray-500">Nenhum orçamento encontrado.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {isBudgetDialogOpen && <OrcamentoDialog isOpen={isBudgetDialogOpen} onClose={handleCloseDialogs} onSave={handleBudgetUpdate} budget={selectedBudget} />}
            
            {isFinalizationDialogOpen && budgetToFinalize && <OSFinalizationDialog isOpen={isFinalizationDialogOpen} onClose={handleCloseDialogs} onSave={handleSaveAndClose} budget={budgetToFinalize} />}

            {isPrintDialogOpen && budgetToPrint && <PrintDocumentDialog isOpen={isPrintDialogOpen} onClose={handleCloseDialogs} docId={budgetToPrint.id} docType="orcamento" options={printOptions} />}

            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
                        <AlertDialogDescription>
                            Tem certeza que deseja excluir o orçamento {budgetToDelete?.budget_number || budgetToDelete?.id.substring(0,4)}? Itens de estoque e financeiros relacionados também podem ser afetados. Esta ação não pode ser desfeita.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">Excluir</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
};

export default OrcamentosList;
