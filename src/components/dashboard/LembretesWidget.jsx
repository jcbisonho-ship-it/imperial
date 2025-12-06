import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { WrapText as NotepadText, RefreshCw, Plus, Trash2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import LembreteDialog from '@/components/lembretes/LembreteDialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

const LembretesWidget = () => {
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
        .order('created_at', { ascending: false });

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
    <div className="bg-white rounded-xl border shadow-sm flex flex-col h-full">
      <div className="p-6 border-b flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center">
          <NotepadText className="w-5 h-5 mr-2 text-yellow-600" />
          Lembretes
        </h3>
        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setIsDialogOpen(true)}>
            <Plus className="w-5 h-5" />
        </Button>
      </div>
      <ScrollArea className="h-[300px] sm:h-[350px] p-0">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <RefreshCw className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : lembretes.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-gray-500 p-6">
            <NotepadText className="w-12 h-12 text-gray-300 mb-2" />
            <p>Nenhum lembrete ativo.</p>
            <p className="text-xs mt-1">Clique em "+" para adicionar um.</p>
          </div>
        ) : (
          <ul className="divide-y">
            {lembretes.map((lembrete) => (
              <li key={lembrete.id} className="p-4 text-sm text-gray-700 flex justify-between items-start gap-2 hover:bg-gray-50">
                <span className="flex-1 whitespace-pre-wrap">{lembrete.content}</span>
                 <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-gray-400 hover:text-red-600 hover:bg-red-50 flex-shrink-0">
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
       {isDialogOpen && (
        <LembreteDialog
          isOpen={isDialogOpen}
          onClose={() => setIsDialogOpen(false)}
          onSave={handleSave}
          lembrete={null}
        />
      )}
    </div>
  );
};

export default LembretesWidget;