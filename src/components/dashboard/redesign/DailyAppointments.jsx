import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Calendar } from 'lucide-react';
import { format, startOfToday, endOfToday } from 'date-fns';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

const DailyAppointments = ({ refreshTrigger }) => {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAppointments = async () => {
      setLoading(true);
      const todayStart = startOfToday().toISOString();
      const todayEnd = endOfToday().toISOString();

      try {
        const { data, error } = await supabase
          .from('agendamentos')
          .select('id, data_agendamento, nome_cliente, modelo_veiculo, placa_veiculo, servicos(nome), status')
          .gte('data_agendamento', todayStart)
          .lte('data_agendamento', todayEnd)
          .order('data_agendamento', { ascending: true });

        if (error) throw error;
        setAppointments(data || []);
      } catch (error) {
        console.error("Error fetching daily appointments:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAppointments();
  }, [refreshTrigger]);
  
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
    <Card className="col-span-1 lg:col-span-2">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base font-medium flex items-center gap-2">
          <Calendar className="h-5 w-5" /> Agendamentos do Dia
        </CardTitle>
        <Link to="/agendamentos">
          <Button variant="ghost" size="sm">Ver todos</Button>
        </Link>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[200px] pr-3">
          {loading ? (
             <div className="space-y-2">
              {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : appointments.length === 0 ? (
            <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
              Nenhum agendamento para hoje.
            </div>
          ) : (
            <div className="w-full text-sm">
                <div className="grid grid-cols-7 gap-2 font-semibold text-xs text-muted-foreground py-2 border-b">
                    <div className="col-span-2">Cliente</div>
                    <div>Veículo</div>
                    <div>Data</div>
                    <div>Hora</div>
                    <div>Serviço</div>
                    <div className="text-center">Status</div>
                </div>
                 <div className="space-y-1 mt-1">
                 {appointments.map((apt) => (
                    <div key={apt.id} className="grid grid-cols-7 gap-2 items-center p-2 rounded-md hover:bg-gray-50">
                        <div className="col-span-2 font-medium truncate">{apt.nome_cliente}</div>
                        <div className="text-muted-foreground text-xs">
                          <div>{apt.modelo_veiculo || '-'}</div>
                          <div className="font-mono">{apt.placa_veiculo || 'N/A'}</div>
                        </div>
                        <div className="text-muted-foreground">{format(new Date(apt.data_agendamento), 'dd/MM')}</div>
                        <div className="text-muted-foreground">{format(new Date(apt.data_agendamento), 'HH:mm')}</div>
                        <div className="truncate text-muted-foreground text-xs">{apt.servicos?.nome || '-'}</div>
                        <div className="flex justify-center">{getStatusBadge(apt.status)}</div>
                    </div>
                ))}
                </div>
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default DailyAppointments;