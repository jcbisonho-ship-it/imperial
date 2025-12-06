import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Edit, Trash2, Search, Check, X, FileText, RefreshCw, MoreVertical, FileDown, ArrowRightCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import BudgetDialog from '@/components/dialogs/BudgetDialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useDebounce } from '@/hooks/useDebounce';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Badge } from '@/components/ui/badge';
import { BUDGET_STATUS, BUDGET_STATUS_MAP } from '@/lib/constants';
import { osService } from '@/services/osService';
import PrintDocumentDialog from '@/components/documentos/PrintDocumentDialog';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';

const Budgets = ({ setActiveTab }) => {
  const [budgets, setBudgets] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isPrintDialogOpen, setIsPrintDialogOpen] = useState(false);
  const [budgetToPrint, setBudgetToPrint] = useState(null);
  const [editingBudget, setEditingBudget] = useState(null);
  const [loading, setLoading] = useState(true);
  const [convertingId, setConvertingId] = useState(null);
  
  // Confirmation Dialog State
  const [confirmConvert, setConfirmConvert] = useState({
    isOpen: false,
    budget: null
  });

  const { toast } = useToast();
  const debouncedSearchTerm = useDebounce(searchTerm, 500);

  const loadBudgets = useCallback(async () => {
    try {
      setLoading(true);
      let query = supabase.from('budgets').select(`
        id,
        budget_number,
        status,
        total_cost,
        created_at,
        customer:customers(name),
        vehicle:vehicles(brand, model, plate)
      `);

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      let { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;

      if (debouncedSearchTerm) {
        const lowerSearch = debouncedSearchTerm.toLowerCase();
        data = data.filter(b => 
          String(b.budget_number).includes(lowerSearch) ||
          b.customer?.name?.toLowerCase().includes(lowerSearch) ||
          b.vehicle?.brand?.toLowerCase().includes(lowerSearch) ||
          b.vehicle?.model?.toLowerCase().includes(lowerSearch) ||
          b.vehicle?.plate?.toLowerCase().includes(lowerSearch)
        );
      }

      const formattedData = data.map(b => ({
        ...b,
        customer_name: b.customer?.name || 'Cliente Removido',
        vehicle_description: b.vehicle ? `${b.vehicle.brand} ${b.vehicle.model} (${b.vehicle.plate})` : 'Veículo Removido'
      }));

      setBudgets(formattedData || []);
    } catch (error) {
      console.error("Fetch Error:", error);
      toast({ title: "Erro ao carregar orçamentos", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast, debouncedSearchTerm, statusFilter]);

  useEffect(() => {
    loadBudgets();
  }, [loadBudgets]);
  
  const handleDeleteBudget = async (id) => {
    try {
      const { error } = await supabase.rpc('delete_budget_cascade', { p_budget_id: id });
      
      if (error) throw error;
      
      loadBudgets();
      toast({ title: "Orçamento removido!", description: "O orçamento e seus vínculos foram removidos." });
    } catch (error) {
      console.error("Delete Error:", error);
      toast({ title: "Erro ao remover orçamento", description: error.message, variant: "destructive" });
    }
  };
  
  const handleStatusChange = async (budget, newStatus) => {
    try {
      const { error } = await supabase.from('budgets').update({ status: newStatus }).eq('id', budget.id);
      if (error) throw error;
      toast({ title: `Status atualizado!`, description: "O status foi alterado com sucesso." });
      loadBudgets();
    } catch (error) {
      console.error("Status Change Error:", error);
      toast({ title: "Erro ao atualizar status", description: error.message, variant: "destructive" });
    }
  };

  const convertToOS = async (budget) => {
      setConvertingId(budget.id);
      try {
          const data = await osService.createFromBudget(budget.id);
          
          toast({ 
              title: "Orçamento Convertido!", 
              description: `OS #${data.os_number} criada com sucesso.`,
              className: "bg-green-50 border-green-200"
          });
          
          loadBudgets();
          if (setActiveTab) setActiveTab('os');
      } catch (error) {
          console.error("Conversion Error:", error);
          toast({ title: "Erro na conversão", description: error.message, variant: "destructive" });
      } finally {
          setConvertingId(null);
      }
  };

  // Confirmation Handlers
  const requestConversion = (budget) => {
    setConfirmConvert({ isOpen: true, budget });
  };

  const handleConfirmConversion = async () => {
    if (confirmConvert.budget) {
      await convertToOS(confirmConvert.budget);
      setConfirmConvert({ isOpen: false, budget: null });
    }
  };

  const handleGeneratePdf = (budget) => {
    setBudgetToPrint(budget);
    setIsPrintDialogOpen(true);
  };

  const handleCloseDialogs = () => {
    setIsDialogOpen(false);
    setIsPrintDialogOpen(false);
  }

  return (
    <div className="space-y-6 relative h-full">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Orçamentos</h2>
          <p className="text-gray-600">Gerencie orçamentos ativos e pendentes.</p>
        </div>
        <Button onClick={() => { setEditingBudget(null); setIsDialogOpen(true); }}>
          <Plus className="w-4 h-4 mr-2" /> Novo Orçamento
        </Button>
      </div>

      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="relative md:col-span-2">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <Input 
                  placeholder="Buscar por número, cliente ou veículo..." 
                  className="pl-10" 
                  value={searchTerm} 
                  onChange={e => setSearchTerm(e.target.value)} 
                />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger><SelectValue placeholder="Filtrar por status..." /></SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">Todos os Status</SelectItem>
                    <SelectItem value={BUDGET_STATUS.QUOTED}>Pendente</SelectItem>
                    <SelectItem value={BUDGET_STATUS.DRAFT}>Rascunho</SelectItem>
                    <SelectItem value={BUDGET_STATUS.APPROVED}>Aprovado</SelectItem>
                    <SelectItem value={BUDGET_STATUS.CONVERTED}>Convertido em OS</SelectItem>
                    <SelectItem value={BUDGET_STATUS.REJECTED}>Rejeitado</SelectItem>
                </SelectContent>
            </Select>
        </div>

        <div className="overflow-x-auto">
            <Table>
                <TableHeader>
                    <TableRow className="bg-gray-50">
                        <TableHead className="w-[100px]">Número</TableHead>
                        <TableHead className="w-[140px]">Status</TableHead>
                        <TableHead>Cliente</TableHead>
                        <TableHead>Veículo</TableHead>
                        <TableHead className="w-[120px]">Data</TableHead>
                        <TableHead className="text-right w-[120px]">Valor Total</TableHead>
                        <TableHead className="text-center w-[80px]">Ações</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {loading ? (
                        <TableRow><TableCell colSpan={7} className="text-center py-10"><RefreshCw className="animate-spin h-8 w-8 mx-auto text-blue-500" /></TableCell></TableRow>
                    ) : budgets.length === 0 ? (
                        <TableRow><TableCell colSpan={7} className="text-center py-10"><FileText className="w-12 h-12 text-gray-300 mx-auto mb-2" /><p className="text-gray-500">Nenhum orçamento encontrado.</p></TableCell></TableRow>
                    ) : (
                        budgets.map((budget) => (
                            <TableRow key={budget.id} className={budget.status === BUDGET_STATUS.CONVERTED ? "bg-gray-50 opacity-75" : "hover:bg-gray-50"}>
                                <TableCell className="font-mono font-medium text-gray-900">
                                    #{String(budget.budget_number || '0').padStart(6, '0')}
                                </TableCell>
                                <TableCell>
                                    <Badge variant={BUDGET_STATUS_MAP[budget.status]?.variant || 'outline'} className="whitespace-nowrap">
                                        {BUDGET_STATUS_MAP[budget.status]?.label || budget.status}
                                    </Badge>
                                </TableCell>
                                <TableCell className="font-medium">{budget.customer_name}</TableCell>
                                <TableCell className="text-gray-600">{budget.vehicle_description}</TableCell>
                                <TableCell className="text-gray-500 text-sm">{new Date(budget.created_at).toLocaleDateString('pt-BR')}</TableCell>
                                <TableCell className="text-right font-bold text-gray-900">R$ {Number(budget.total_cost).toFixed(2)}</TableCell>
                                <TableCell className="text-center">
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="w-4 h-4" /></Button></DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="w-48">
                                            <DropdownMenuItem onClick={() => { setEditingBudget(budget); setIsDialogOpen(true); }}>
                                                <Edit className="w-4 h-4 mr-2"/>
                                                {budget.status === BUDGET_STATUS.CONVERTED ? 'Visualizar' : 'Editar'}
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => handleGeneratePdf(budget)}>
                                                <FileDown className="w-4 h-4 mr-2"/>
                                                Imprimir/Exportar
                                            </DropdownMenuItem>
                                            
                                            {budget.status === BUDGET_STATUS.APPROVED && (
                                                <>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem 
                                                        onClick={() => requestConversion(budget)} 
                                                        disabled={convertingId === budget.id}
                                                        className="font-bold text-blue-600 focus:text-blue-700 focus:bg-blue-50 cursor-pointer"
                                                    >
                                                        {convertingId === budget.id ? <RefreshCw className="w-4 h-4 mr-2 animate-spin"/> : <ArrowRightCircle className="w-4 h-4 mr-2"/>}
                                                        Converter em OS
                                                    </DropdownMenuItem>
                                                </>
                                            )}

                                            {[BUDGET_STATUS.DRAFT, BUDGET_STATUS.QUOTED].includes(budget.status) && (
                                                <>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem onClick={() => handleStatusChange(budget, BUDGET_STATUS.APPROVED)} className="text-green-600 focus:text-green-700 focus:bg-green-50">
                                                        <Check className="w-4 h-4 mr-2"/>Aprovar
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => handleStatusChange(budget, BUDGET_STATUS.REJECTED)} className="text-red-600 focus:text-red-700 focus:bg-red-50">
                                                        <X className="w-4 h-4 mr-2"/>Rejeitar
                                                    </DropdownMenuItem>
                                                </>
                                            )}
                                            
                                            <DropdownMenuSeparator />
                                            <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                    <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-red-600 focus:text-red-700 focus:bg-red-50">
                                                        <Trash2 className="w-4 h-4 mr-2"/>Excluir
                                                    </DropdownMenuItem>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent>
                                                    <AlertDialogHeader>
                                                        <AlertDialogTitle>Excluir Orçamento</AlertDialogTitle>
                                                        <AlertDialogDescription>
                                                            Esta ação irá remover permanentemente este orçamento e todos os itens associados.
                                                            {budget.status === BUDGET_STATUS.CONVERTED && " ATENÇÃO: A Ordem de Serviço gerada também será removida."}
                                                        </AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                        <AlertDialogAction onClick={() => handleDeleteBudget(budget.id)} className="bg-red-600 hover:bg-red-700">Excluir Permanentemente</AlertDialogAction>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </TableCell>
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>
        </div>
      </div>

      {isDialogOpen && <BudgetDialog isOpen={isDialogOpen} onClose={() => setIsDialogOpen(false)} onSave={loadBudgets} budget={editingBudget} />}
      
      {isPrintDialogOpen && budgetToPrint && <PrintDocumentDialog isOpen={isPrintDialogOpen} onClose={handleCloseDialogs} docId={budgetToPrint.id} docType="orcamento" />}
      
      <ConfirmationDialog 
        open={confirmConvert.isOpen}
        onOpenChange={(open) => !open && setConfirmConvert({ isOpen: false, budget: null })}
        title="Confirmar Conversão"
        description={`Deseja realmente converter o orçamento #${String(confirmConvert.budget?.budget_number || '').padStart(6, '0')} em uma Ordem de Serviço? Esta ação irá gerar uma nova OS e realizar a reserva dos itens no estoque.`}
        onConfirm={handleConfirmConversion}
        loading={convertingId === confirmConvert.budget?.id}
        confirmText="Converter"
        variant="default"
      />
    </div>
  );
};

export default Budgets;