import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { PlusCircle, Calendar as CalendarIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';

const MeusAgendamentos = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [agendamentos, setAgendamentos] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchAgendamentos = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('agendamentos')
      .select('*, servicos(nome)')
      .eq('user_id', user.id)
      .order('data_agendamento', { ascending: false });
    
    if (error) {
      toast({ title: 'Erro ao buscar seus agendamentos', description: error.message, variant: 'destructive' });
    } else {
      setAgendamentos(data);
    }
    setLoading(false);
  }, [user, toast]);

  useEffect(() => {
    fetchAgendamentos();
  }, [fetchAgendamentos]);

  const getStatusBadge = (status) => {
    switch (status) {
      case 'confirmado': return <Badge variant="success" className='bg-green-100 text-green-800 border-green-200'>Confirmado</Badge>;
      case 'concluido': return <Badge variant="success">Concluído</Badge>;
      case 'cancelado': return <Badge variant="destructive">Cancelado</Badge>;
      case 'pendente':
      default: return <Badge variant="secondary" className='bg-yellow-100 text-yellow-800 border-yellow-200'>Pendente</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">Meus Agendamentos</h2>
        <Button onClick={() => navigate('/agendar?from=app')} className="bg-blue-600 hover:bg-blue-700">
          <PlusCircle className="w-4 h-4 mr-2" /> Novo Agendamento
        </Button>
      </div>
      <div className="bg-white rounded-xl shadow-lg p-6">
        {loading ? (
          <div className="text-center py-12"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div></div>
        ) : agendamentos.length > 0 ? (
          <ul className="space-y-4">
            {agendamentos.map(ag => (
              <li key={ag.id} className="border p-4 rounded-lg flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <p className="font-bold text-lg text-gray-800">{ag.servicos?.nome}</p>
                  <p className="text-gray-600">
                    {format(parseISO(ag.data_agendamento), "EEEE, dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}
                  </p>
                  <p className="text-sm text-gray-500">Veículo: {ag.modelo_veiculo} - {ag.placa_veiculo}</p>
                </div>
                {getStatusBadge(ag.status)}
              </li>
            ))}
          </ul>
        ) : (
          <div className="text-center py-12 text-gray-500">
            <CalendarIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="mb-4">Você ainda não tem agendamentos.</p>
            <Button onClick={() => navigate('/agendar?from=app')} className="bg-blue-600 hover:bg-blue-700">
              <PlusCircle className="w-4 h-4 mr-2" /> Fazer meu primeiro agendamento
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default MeusAgendamentos;