import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { FileText, DollarSign, Car, UserPlus, Calendar } from 'lucide-react';
import OrcamentoDialog from '@/components/orcamentos/OrcamentoDialog';
import VeiculoDialog from '@/components/veiculos/VeiculoDialog';
import NewCadastroDialog from '@/components/dialogs/NewCadastroDialog';
import NovoAgendamentoDialog from '@/components/agendamentos/NovoAgendamentoDialog';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';

const QuickActions = ({ onNewBudget, onNewExpense }) => { 
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  
  const [isBudgetDialogOpen, setIsBudgetDialogOpen] = useState(false);
  const [isVehicleDialogOpen, setIsVehicleDialogOpen] = useState(false);
  const [isCadastroDialogOpen, setIsCadastroDialogOpen] = useState(false);
  const [isAgendamentoDialogOpen, setIsAgendamentoDialogOpen] = useState(false);
  const [customers, setCustomers] = useState([]);

  const handleNewBudget = () => {
    if (onNewBudget) {
      onNewBudget();
    } else {
      setIsBudgetDialogOpen(true);
    }
  };

  const handleNewVehicle = async () => {
    // Fetch customers before opening the dialog to ensure the select list is populated
    const { data, error } = await supabase.from('customers').select('id, name').order('name');
    if (error) {
      toast({ title: 'Erro ao carregar clientes', description: 'Não foi possível carregar a lista de clientes.', variant: 'destructive' });
    } else {
      setCustomers(data || []);
      setIsVehicleDialogOpen(true);
    }
  };

  const handleNewCadastro = () => {
    setIsCadastroDialogOpen(true);
  };

  const handleNewAgendamento = () => {
    setIsAgendamentoDialogOpen(true);
  };

  const handleSaveBudget = () => {
    toast({ title: "Orçamento salvo com sucesso!", description: "Você pode visualizá-lo na lista de orçamentos." });
    setIsBudgetDialogOpen(false);
  };

  const handleSaveVehicle = () => {
    toast({ title: "Veículo cadastrado com sucesso!", description: "O novo veículo foi adicionado ao sistema." });
    setIsVehicleDialogOpen(false);
  };

  const handleSaveCadastro = () => {
    setIsCadastroDialogOpen(false);
  };
  
  const handleSaveAgendamento = () => {
    toast({ title: "Agendamento criado com sucesso!", description: "O novo agendamento foi adicionado à agenda." });
    setIsAgendamentoDialogOpen(false);
  };

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
        <Button 
          onClick={handleNewBudget} 
          className="h-auto py-4 flex flex-col items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white"
        >
          <FileText className="h-6 w-6" />
          <span>Novo Orçamento</span>
        </Button>

        <Button 
          variant="outline" 
          onClick={onNewExpense}
          className="h-auto py-4 flex flex-col items-center gap-2 hover:bg-red-50 hover:text-red-600 hover:border-red-200"
        >
          <DollarSign className="h-6 w-6" />
          <span>Nova Despesa</span>
        </Button>

        <Button 
          variant="outline" 
          onClick={handleNewVehicle} 
          className="h-auto py-4 flex flex-col items-center gap-2 hover:bg-orange-50 hover:text-orange-600 hover:border-orange-200"
        >
          <Car className="h-6 w-6" />
          <span>Novo Veículo</span>
        </Button>

        <Button 
          variant="outline" 
          onClick={handleNewCadastro} 
          className="h-auto py-4 flex flex-col items-center gap-2 hover:bg-green-50 hover:text-green-600 hover:border-green-200"
        >
          <UserPlus className="h-6 w-6" />
          <span>Novo Cliente/Fornecedor</span>
        </Button>

        <Button 
          variant="outline" 
          onClick={handleNewAgendamento} 
          className="h-auto py-4 flex flex-col items-center gap-2 hover:bg-purple-50 hover:text-purple-600 hover:border-purple-200"
        >
          <Calendar className="h-6 w-6" />
          <span>Novo Agendamento</span>
        </Button>
      </div>

      {isBudgetDialogOpen && (
        <OrcamentoDialog 
          isOpen={isBudgetDialogOpen} 
          onClose={() => setIsBudgetDialogOpen(false)} 
          onSave={handleSaveBudget} 
          budget={null}
        />
      )}

      {isVehicleDialogOpen && (
        <VeiculoDialog 
          isOpen={isVehicleDialogOpen} 
          onClose={() => setIsVehicleDialogOpen(false)} 
          onSaveSuccess={handleSaveVehicle} 
          vehicle={null}
          customers={customers}
          user={user}
        />
      )}

      {isCadastroDialogOpen && (
        <NewCadastroDialog
          isOpen={isCadastroDialogOpen}
          onClose={() => setIsCadastroDialogOpen(false)}
          onSaveSuccess={handleSaveCadastro}
          user={user}
        />
      )}

      {isAgendamentoDialogOpen && (
        <NovoAgendamentoDialog
          isOpen={isAgendamentoDialogOpen}
          onClose={() => setIsAgendamentoDialogOpen(false)}
          onSave={handleSaveAgendamento}
          agendamento={null}
        />
      )}
    </>
  );
};

export default QuickActions;