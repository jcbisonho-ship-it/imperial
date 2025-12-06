import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { WrapText as NotepadText, RefreshCw, Plus, Trash2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import LembreteDialog from '@/components/lembretes/LembreteDialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Link } from 'react-router-dom';

const DailyReminders = () => {
  const [lembretes, setLembretes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();

  const fetchLembretes = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('lembretes')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5); // Fetch only a few for the dashboard

      if (error) throw error;
      setLembretes(data || []);
    } catch (error) {
      toast({
        title: "Erro ao buscar lembretes",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLembretes();
  }, []);

  const handleSave = () => {
    fetchLembretes();
    setIsDialogOpen(false);
  };

  const handleDelete = async (id) => {
    try {
      const { error } = await supabase.from('lembretes').delete().eq('id', id);
      if (error) throw error;
      toast({ title: 'Lembrete excluído com sucesso!' });
      fetchLembretes();
    } catch (error) {
      toast({ title: 'Erro ao excluir lembrete', description: error.message, variant: 'destructive' });
    }
  };

  return (
    <>
      <div className="bg-card border rounded-xl shadow-sm flex flex-col h-full">
        <div className="p-4 border-b flex justify-between items-center">
          <h3 className="text-base font-semibold text-card-foreground flex items-center">
            <NotepadText className="w-5 h-5 mr-2 text-yellow-600" />
            Lembretes
          </h3>
          <div className="flex items-center gap-2">
            <Link to="/agendamentos?tab=lembretes" className="text-xs text-muted-foreground hover:text-primary transition-colors">
              Ver todos
            </Link>
            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setIsDialogOpen(true)}>
              <Plus className="w-5 h-5" />
            </Button>
          </div>
        </div>
        <ScrollArea className="flex-1">
          {loading ? (
            <div className="flex items-center justify-center h-full p-6">
              <RefreshCw className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : lembretes.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground p-6">
              <NotepadText className="w-10 h-10 text-gray-300 mb-2" />
              <p className="text-sm">Nenhum lembrete.</p>
              <p className="text-xs mt-1">Clique em "+" para adicionar.</p>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {lembretes.map((lembrete) => (
                <li key={lembrete.id} className="px-4 py-3 text-sm text-card-foreground flex justify-between items-start gap-2 hover:bg-muted/50">
                  <span className="flex-1 whitespace-pre-wrap">{lembrete.content}</span>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-red-600 hover:bg-red-50 flex-shrink-0">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Excluir Lembrete</AlertDialogTitle>
                        <AlertDialogDescription>
                          Tem certeza que deseja excluir este lembrete? Esta ação não pode ser desfeita.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDelete(lembrete.id)} className="bg-red-600 hover:bg-red-700">
                          Excluir
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </li>
              ))}
            </ul>
          )}
        </ScrollArea>
      </div>
      {isDialogOpen && (
        <LembreteDialog
          isOpen={isDialogOpen}
          onClose={() => setIsDialogOpen(false)}
          onSave={handleSave}
          lembrete={null}
        />
      )}
    </>
  );
};

export default DailyReminders;