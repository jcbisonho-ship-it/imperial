import React from 'react';
import { Button } from '@/components/ui/button';
import { FileText, Wrench, UserPlus, Calendar } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const HeaderActions = () => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-lg shadow-sm border">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Visão geral da sua oficina hoje</p>
      </div>
      
      <div className="flex flex-wrap gap-2 w-full sm:w-auto">
        <Button 
          onClick={() => navigate('/orcamentos')} 
          className="bg-blue-600 hover:bg-blue-700 text-white flex-1 sm:flex-none"
        >
          <FileText className="w-4 h-4 mr-2" />
          Novo Orçamento
        </Button>
        
        <Button 
          variant="outline" 
          onClick={() => navigate('/os')}
          className="flex-1 sm:flex-none"
        >
          <Wrench className="w-4 h-4 mr-2" />
          Nova OS
        </Button>

        <Button 
          variant="outline" 
          onClick={() => navigate('/clientes')}
          className="flex-1 sm:flex-none"
        >
          <UserPlus className="w-4 h-4 mr-2" />
          Cliente
        </Button>
        
        <Button 
          variant="outline" 
          onClick={() => navigate('/novo-agendamento')}
          className="flex-1 sm:flex-none"
        >
          <Calendar className="w-4 h-4 mr-2" />
          Agendar
        </Button>
      </div>
    </div>
  );
};

export default HeaderActions;