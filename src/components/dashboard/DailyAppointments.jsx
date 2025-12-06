import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { Calendar, Car, Wrench } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

const DailyAppointments = () => {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAppointments = async () => {
      const today = new Date();
      // Create range for current day
      const startOfDay = new Date(today.setHours(0, 0, 0, 0)).toISOString();
      const endOfDay = new Date(today.setHours(23, 59, 59, 999)).toISOString();

      const { data, error } = await supabase
        .from('agendamentos')
        .select(`
          id,
          data_agendamento,
          nome_cliente,
          modelo_veiculo,
          placa_veiculo,
          status,
          servicos (
            nome
          )
        `)
        .gte('data_agendamento', startOfDay)
        .lte('data_agendamento', endOfDay)
        .order('data_agendamento', { ascending: true });

      if (error) {
        console.error('Error fetching daily appointments:', error);
      } else {
        setAppointments(data || []);
      }
      setLoading(false);
    };

    fetchAppointments();
  }, []);

  const getStatusStyle = (status) => {
    switch (status?.toLowerCase()) {
      case 'confirmado': return 'bg-green-100 text-green-700 hover:bg-green-100 border-green-200';
      case 'pendente': return 'bg-yellow-100 text-yellow-700 hover:bg-yellow-100 border-yellow-200';
      case 'cancelado': return 'bg-red-100 text-red-700 hover:bg-red-100 border-red-200';
      case 'concluido': return 'bg-blue-100 text-blue-700 hover:bg-blue-100 border-blue-200';
      default: return 'bg-gray-100 text-gray-700 hover:bg-gray-100 border-gray-200';
    }
  };

  return (
    <div className="bg-white rounded-xl border shadow-sm flex flex-col h-full">
      <div className="p-6 border-b flex flex-row items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Agendamentos do Dia</h3>
        <span className="text-sm text-muted-foreground capitalize">
          {format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR })}
        </span>
      </div>
      <ScrollArea className="h-[300px] sm:h-[350px] p-0">
        {loading ? (
          <div className="p-4 space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-4">
                 <Skeleton className="h-12 w-16 rounded-lg" />
                 <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-3 w-2/3" />
                 </div>
              </div>
            ))}
          </div>
        ) : appointments.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full p-8 text-center text-gray-500 gap-3">
            <div className="bg-gray-50 p-4 rounded-full">
              <Calendar className="h-8 w-8 text-gray-400" />
            </div>
            <div>
              <p className="font-medium text-gray-900">Sem agendamentos</p>
              <p className="text-sm mt-1">Não há agendamentos marcados para hoje.</p>
            </div>
          </div>
        ) : (
          <div className="divide-y">
            {appointments.map((apt) => (
              <div key={apt.id} className="p-4 hover:bg-gray-50 transition-colors flex items-start gap-4 group">
                <div className="flex flex-col items-center justify-center bg-blue-50 text-blue-700 rounded-lg p-2 min-w-[64px] h-[64px]">
                  <span className="text-xs font-medium uppercase text-blue-600/80">Hora</span>
                  <span className="text-xl font-bold tracking-tight">
                    {format(parseISO(apt.data_agendamento), 'HH:mm')}
                  </span>
                </div>
                
                <div className="flex-1 min-w-0 py-0.5">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <p className="text-sm font-semibold text-gray-900 truncate leading-tight">
                      {apt.nome_cliente}
                    </p>
                    <Badge variant="outline" className={`text-[10px] font-medium uppercase tracking-wider border px-2 py-0.5 h-5 ${getStatusStyle(apt.status)}`}>
                      {apt.status}
                    </Badge>
                  </div>
                  
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-1.5 text-xs text-gray-600">
                      <Car className="h-3.5 w-3.5 text-gray-400" />
                      <span className="truncate font-medium">
                        {apt.modelo_veiculo || 'Veículo não informado'} 
                      </span>
                      {apt.placa_veiculo && (
                        <span className="text-gray-400 font-normal">• {apt.placa_veiculo}</span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 text-xs text-gray-500">
                       <Wrench className="h-3.5 w-3.5 text-gray-400" />
                       <span className="truncate">
                         {apt.servicos?.nome || 'Serviço geral'}
                       </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
};

export default DailyAppointments;