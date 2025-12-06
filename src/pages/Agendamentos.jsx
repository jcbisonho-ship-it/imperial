import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, Calendar, CheckCircle, XCircle, Clock, Plus, Trash2, Edit, FileText } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useSearchParams, useNavigate } from 'react-router-dom';
import NovoAgendamentoDialog from '@/components/agendamentos/NovoAgendamentoDialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const Agendamentos = () => {
  const [agendamentos, setAgendamentos] = useState([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [isNewAppointmentModalOpen, setIsNewAppointmentModalOpen] = useState(false);
  const [appointmentToDelete, setAppointmentToDelete] = useState(null);
  const [appointmentToEdit, setAppointmentToEdit] = useState(null);
  const [convertingId, setConvertingId] = useState(null);

  const fromDashboard = searchParams.get('from') === 'dashboard';

  const fetchAgendamentos = useCallback(async () => {
    setLoading(true);
    // Filter out appointments that have already been converted (converted_to_budget_id is not null)
    const { data, error } = await supabase
      .from('agendamentos')
      .select(`
        id,
        data_agendamento,
        nome_cliente,
        email_cliente,
        telefone_cliente,
        modelo_veiculo,
        placa_veiculo,
        status,
        observacoes,
        servico_id,
        cliente_id,
        converted_to_budget_id,
        servicos (
          nome,
          tempo_duracao_minutos,
          valor_referencia
        )
      `)
      .is('converted_to_budget_id', null)
      .neq('status', 'cancelado') // Filter out canceled appointments from the main view based on requirement 4 context (removes from list)
      .order('data_agendamento', { ascending: false });

    if (error) {
      toast({ title: 'Erro ao buscar agendamentos', description: error.message, variant: 'destructive' });
      setAgendamentos([]);
    } else {
      setAgendamentos(data);
    }
    setLoading(false);
  }, [toast]);

  useEffect(() => {
    fetchAgendamentos();
  }, [fetchAgendamentos]);

  useEffect(() => {
    if (searchParams.get('action') === 'new') {
      setIsNewAppointmentModalOpen(true);
      // Clean up search param after opening
      searchParams.delete('action');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);
  
  const handleDeleteAppointment = async () => {
    if (!appointmentToDelete) return;
    
    const { error } = await supabase.from('agendamentos').delete().eq('id', appointmentToDelete.id);
    
    if (error) {
      toast({ title: 'Erro ao excluir agendamento', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Agendamento excluído com sucesso!' });
      setAgendamentos(prev => prev.filter(apt => apt.id !== appointmentToDelete.id));
    }
    setAppointmentToDelete(null); // Close the dialog
  };

  const handleStatusChange = async (id, status) => {
    // Optimistic update
    setAgendamentos(currentAgendamentos => {
      if (status === 'cancelado') {
        // If cancelling, remove from list as requested
        return currentAgendamentos.filter(ag => ag.id !== id);
      }
      return currentAgendamentos.map(ag =>
        ag.id === id ? { ...ag, status: status } : ag
      );
    });

    const { error } = await supabase
      .from('agendamentos')
      .update({ status })
      .eq('id', id)
      .select();

    if (error) {
      toast({ title: 'Erro ao atualizar status', description: `Código: ${error.code} | Mensagem: ${error.message}`, variant: 'destructive' });
      fetchAgendamentos(); // Revert on error
    } else {
      const successMessage = status === 'cancelado' ? 'Agendamento cancelado e removido da lista.' : 'Status atualizado com sucesso!';
      toast({ title: successMessage });
    }
  };
  
  const handleConvertToBudget = async (agendamento) => {
    if (convertingId) return;
    setConvertingId(agendamento.id);
    
    try {
      // 1. Prepare Budget Data
      // Try to find vehicle ID if not directly linked but plate exists
      let vehicleId = null;
      if (agendamento.placa_veiculo) {
          const cleanPlate = agendamento.placa_veiculo.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
          const { data: vData } = await supabase.from('vehicles').select('id').ilike('plate', cleanPlate).maybeSingle();
          if (vData) vehicleId = vData.id;
      }

      // Service info from the joined query
      const serviceName = agendamento.servicos?.nome || 'Serviço Agendado';
      const servicePrice = agendamento.servicos?.valor_referencia || 0;

      const budgetPayload = {
          customer_id: agendamento.cliente_id || null,
          vehicle_id: vehicleId, // Might be null
          customer_name: agendamento.nome_cliente || 'Cliente',
          vehicle_description: `${agendamento.modelo_veiculo || ''} ${agendamento.placa_veiculo || ''}`.trim() || 'Veículo não informado',
          status: 'pending', // Corresponds to 'Orçamento' / QUOTED
          total_cost: servicePrice,
          km: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
      };

      // 2. Create Budget
      const { data: budgetData, error: budgetError } = await supabase
          .from('budgets')
          .insert(budgetPayload)
          .select()
          .single();

      if (budgetError) throw budgetError;

      // 3. Create Budget Item (Service)
      const itemPayload = {
          budget_id: budgetData.id,
          description: serviceName,
          quantity: 1,
          unit_price: servicePrice,
          item_type: 'service',
          created_at: new Date().toISOString()
      };
      
      const { error: itemError } = await supabase.from('budget_items').insert(itemPayload);
      
      if (itemError) {
          console.error("Error creating budget item:", itemError);
          toast({ title: "Aviso", description: "Orçamento criado, mas houve erro ao adicionar o item.", variant: "warning" });
      } else {
          // 4. Mark Agendamento as Converted
          const { error: updateError } = await supabase
            .from('agendamentos')
            .update({ converted_to_budget_id: budgetData.id })
            .eq('id', agendamento.id);

          if (updateError) {
             console.error("Error updating appointment status:", updateError);
             toast({ title: "Aviso", description: "Orçamento criado, mas não foi possível atualizar o status do agendamento.", variant: "warning" });
          } else {
             // Remove from list immediately
             setAgendamentos(prev => prev.filter(item => item.id !== agendamento.id));

             toast({ 
                title: "Orçamento Criado!", 
                description: `O agendamento foi convertido em orçamento com sucesso.`,
                action: <Button variant="outline" size="sm" onClick={() => navigate('/orcamentos')}>Ver Orçamentos</Button>
             });
          }
      }

    } catch (error) {
        toast({ title: "Erro ao converter", description: error.message, variant: "destructive" });
    } finally {
        setConvertingId(null);
    }
  };

  const handleNewAppointmentClick = () => {
    setAppointmentToEdit(null);
    setIsNewAppointmentModalOpen(true);
  };

  const handleEditAppointmentClick = (agendamento) => {
    setAppointmentToEdit(agendamento);
    setIsNewAppointmentModalOpen(true);
  };
  
  const handleAppointmentSave = () => {
    setIsNewAppointmentModalOpen(false); 
    setAppointmentToEdit(null);
    fetchAgendamentos(); 
    if (fromDashboard) {
        navigate('/');
    }
  }

  const handleCloseNewAppointmentDialog = () => {
    setIsNewAppointmentModalOpen(false);
    setAppointmentToEdit(null);
    if (fromDashboard) {
        navigate('/');
    }
  }

  return (
    <>
      <div className="space-y-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold">Agendamentos</h1>
            <p className="text-muted-foreground">Gerencie todos os agendamentos da oficina.</p>
          </div>
          <Button
            onClick={handleNewAppointmentClick}
            className="bg-gradient-to-r from-blue-600 to-blue-800 hover:from-blue-700 hover:to-blue-900 text-white"
          >
            <Plus className="w-4 h-4 mr-2" />
            Novo Agendamento
          </Button>
        </div>
        <div className="bg-white rounded-xl shadow-lg">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-gray-500">
              <thead className="text-xs text-gray-700 uppercase bg-gray-100">
                <tr>
                  <th className="px-6 py-3">Cliente</th>
                  <th className="px-6 py-3">Contato</th>
                  <th className="px-6 py-3">Data e Hora</th>
                  <th className="px-6 py-3">Serviço</th>
                  <th className="px-6 py-3">Veículo</th>
                  {/* Status Column Removed as requested */}
                  <th className="px-6 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="6" className="text-center py-12"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div></td></tr>
                ) : agendamentos.length > 0 ? (
                  agendamentos.map(ag => (
                    <tr 
                      key={ag.id} 
                      className="bg-white border-b hover:bg-gray-50 cursor-pointer transition-colors"
                      onClick={() => handleEditAppointmentClick(ag)}
                    >
                      <td className="px-6 py-4 font-medium text-gray-900">{ag.nome_cliente}</td>
                      <td className="px-6 py-4">{ag.email_cliente}<br/>{ag.telefone_cliente}</td>
                      <td className="px-6 py-4">
                        {ag.data_agendamento ? format(parseISO(ag.data_agendamento), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }) : 'N/A'}
                      </td>
                      <td className="px-6 py-4">{ag.servicos?.nome || 'N/A'}</td>
                      <td className="px-6 py-4">
                        <div>{ag.modelo_veiculo || 'N/A'}</div>
                        <div className="font-mono text-muted-foreground">{ag.placa_veiculo || 'N/A'}</div>
                      </td>
                      {/* Status Cell Removed as requested */}
                      <td className="px-6 py-4 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={(e) => e.stopPropagation()}
                            >
                                <MoreHorizontal className="w-5 h-5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent onClick={(e) => e.stopPropagation()}>
                             <DropdownMenuItem onClick={() => handleEditAppointmentClick(ag)}>
                                <Edit className="w-4 h-4 mr-2" /> Editar
                             </DropdownMenuItem>
                             <DropdownMenuItem onClick={() => handleConvertToBudget(ag)} disabled={convertingId === ag.id}>
                                {convertingId === ag.id ? (
                                  <Clock className="w-4 h-4 mr-2 animate-spin" />
                                ) : (
                                  <FileText className="w-4 h-4 mr-2" />
                                )}
                                Converter para Orçamento
                             </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleStatusChange(ag.id, 'confirmado')} disabled={ag.status === 'confirmado'}>
                              <CheckCircle className="w-4 h-4 mr-2 text-green-500" /> Confirmar Agendamento
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleStatusChange(ag.id, 'cancelado')} className="text-red-600 focus:text-red-700 focus:bg-red-50">
                              <XCircle className="w-4 h-4 mr-2" /> Cancelar Agendamento
                            </DropdownMenuItem>
                             {/* 'Marcar como Pendente' action Removed as requested */}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr><td colSpan="6" className="text-center py-12 text-gray-500">
                    <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    Nenhum agendamento encontrado.
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      <NovoAgendamentoDialog
        isOpen={isNewAppointmentModalOpen}
        onClose={handleCloseNewAppointmentDialog}
        onSave={handleAppointmentSave}
        agendamento={appointmentToEdit}
      />
      
      <AlertDialog open={!!appointmentToDelete} onOpenChange={() => setAppointmentToDelete(null)}>
        <AlertDialogContent onClick={(e) => e.stopPropagation()}>
          <AlertDialogHeader>
            <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Isso excluirá permanentemente o agendamento de <strong>{appointmentToDelete?.nome_cliente}</strong> para o dia {appointmentToDelete?.data_agendamento ? format(parseISO(appointmentToDelete.data_agendamento), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }) : ''}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteAppointment} className="bg-red-600 hover:bg-red-700">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </>
  );
};

export default Agendamentos;