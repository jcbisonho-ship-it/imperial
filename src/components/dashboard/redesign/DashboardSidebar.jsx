import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { format, parseISO } from 'date-fns';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { Edit, Trash2, Eye, Plus, CalendarDays, StickyNote } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import LembreteDialog from '@/components/lembretes/LembreteDialog';
import { Badge } from '@/components/ui/badge';

const DailyAppointments = ({ data, loading, onAction }) => {
  const { toast } = useToast();
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base flex items-center gap-2"><CalendarDays className="w-4 h-4"/> Agendamentos do Dia</CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-60">
          {loading && <p>Carregando...</p>}
          {!loading && data.length === 0 && <p className="text-sm text-muted-foreground text-center pt-10">Nenhum agendamento para hoje.</p>}
          <div className="space-y-4">
            {data.map(item => (
              <div key={item.id} className="flex items-center">
                <div className="flex flex-col">
                  <span className="font-mono text-sm font-semibold">{format(parseISO(item.data_agendamento), 'HH:mm')}</span>
                  <Badge variant="outline" className="mt-1 w-fit">{item.status}</Badge>
                </div>
                <div className="ml-4 space-y-1 flex-1">
                  <p className="text-sm font-medium leading-none truncate">{item.nome_cliente}</p>
                  <p className="text-sm text-muted-foreground truncate">{item.placa_veiculo || 'N/A'}</p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => toast({title: "Visualização não implementada."})}><Eye className="h-4 w-4" /></Button>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

const RemindersList = ({ data, loading, onAction }) => {
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [editingLembrete, setEditingLembrete] = React.useState(null);
  const { toast } = useToast();

  const handleEdit = (lembrete) => {
    setEditingLembrete(lembrete);
    setIsDialogOpen(true);
  };
  
  const handleDelete = async (id) => {
    try {
      const { error } = await supabase.from('lembretes').delete().eq('id', id);
      if (error) throw error;
      toast({ title: 'Lembrete excluído!' });
      onAction();
    } catch(error) {
      toast({ title: 'Erro ao excluir.', description: error.message, variant: 'destructive'});
    }
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2"><StickyNote className="w-4 h-4"/> Lembretes</CardTitle>
            <Button size="sm" variant="outline" onClick={() => setIsDialogOpen(true)}><Plus className="w-4 h-4 mr-1"/> Novo</Button>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-60">
            {loading && <p>Carregando...</p>}
            {!loading && data.length === 0 && <p className="text-sm text-muted-foreground text-center pt-10">Nenhum lembrete pendente.</p>}
            <div className="space-y-3">
              {data.map(item => (
                <div key={item.id} className="flex items-start justify-between gap-2">
                  <p className="text-sm flex-1 break-words">{item.content}</p>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(item)}><Edit className="h-4 w-4" /></Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                          <AlertDialogHeader>
                              <AlertDialogTitle>Excluir Lembrete?</AlertDialogTitle>
                              <AlertDialogDescription>Esta ação é irreversível.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(item.id)} className="bg-destructive hover:bg-destructive/90">Excluir</AlertDialogAction>
                          </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
      {isDialogOpen && (
        <LembreteDialog 
          isOpen={isDialogOpen}
          onClose={() => setIsDialogOpen(false)}
          onSave={() => {onAction(); setIsDialogOpen(false);}}
          lembrete={editingLembrete}
        />
      )}
    </>
  );
};

const DashboardSidebar = ({ refreshTrigger, onActionComplete }) => {
  const [summaryData, setSummaryData] = React.useState({
    agendamentos: [],
    lembretes: [],
  });
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const todayStr = format(new Date(), 'yyyy-MM-dd');
      try {
        const [ agendamentos, lembretes ] = await Promise.all([
          supabase.from('agendamentos').select(`id, data_agendamento, nome_cliente, placa_veiculo, status`).eq('data_agendamento', todayStr).order('data_agendamento'),
          supabase.from('lembretes').select(`*`).order('created_at', { ascending: false }),
        ]);
        
        if (agendamentos.error) throw agendamentos.error;
        if (lembretes.error) throw lembretes.error;

        setSummaryData({
          agendamentos: agendamentos.data,
          lembretes: lembretes.data,
        });
      } catch (error) {
        console.error("Error fetching daily summary:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [refreshTrigger]);

  return (
    <div className="space-y-6">
      <DailyAppointments data={summaryData.agendamentos} loading={loading} onAction={onActionComplete} />
      <RemindersList data={summaryData.lembretes} loading={loading} onAction={onActionComplete} />
    </div>
  );
};

export default DashboardSidebar;