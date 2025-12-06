import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Plus, Search, MoreVertical, Edit, Trash2, RefreshCw, WrapText as NotepadText } from 'lucide-react';
import LembreteDialog from './LembreteDialog';
import { useDebounce } from '@/hooks/useDebounce';

const LembretesList = () => {
  const [lembretes, setLembretes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingLembrete, setEditingLembrete] = useState(null);
  const { toast } = useToast();
  const debouncedSearchTerm = useDebounce(searchTerm, 500);

  const fetchLembretes = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase.from('lembretes').select('*');

      if (debouncedSearchTerm) {
        query = query.ilike('content', `%${debouncedSearchTerm}%`);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;
      setLembretes(data || []);
    } catch (error) {
      toast({ title: 'Erro ao buscar lembretes', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast, debouncedSearchTerm]);

  useEffect(() => {
    fetchLembretes();
  }, [fetchLembretes]);

  const handleEdit = (lembrete) => {
    setEditingLembrete(lembrete);
    setIsDialogOpen(true);
  };

  const handleCreate = () => {
    setEditingLembrete(null);
    setIsDialogOpen(true);
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

  const handleSave = () => {
    fetchLembretes();
    setIsDialogOpen(false);
  };

  return (
    <div className="space-y-6">
       <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
            {/* This space is intentionally left for consistency with other pages, maybe for a title if needed later */}
        </div>
        <Button onClick={handleCreate} className="w-full sm:w-auto">
          <Plus className="w-4 h-4 mr-2" /> Novo Lembrete
        </Button>
      </div>
      
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input
              placeholder="Buscar por conteúdo do lembrete..."
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        
        <div className="rounded-md border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead>Lembrete</TableHead>
                <TableHead className="text-center w-[120px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={2} className="text-center py-10">
                    <RefreshCw className="animate-spin h-8 w-8 mx-auto text-blue-500" />
                  </TableCell>
                </TableRow>
              ) : lembretes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={2} className="text-center py-10">
                    <NotepadText className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                    <p className="text-gray-500">Nenhum lembrete encontrado.</p>
                  </TableCell>
                </TableRow>
              ) : (
                lembretes.map((lembrete) => (
                  <TableRow 
                    key={lembrete.id} 
                    className="hover:bg-gray-50 cursor-pointer group"
                    onClick={() => handleEdit(lembrete)}
                  >
                    <TableCell className="max-w-xl whitespace-pre-wrap">{lembrete.content}</TableCell>
                    <TableCell className="text-center">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleEdit(lembrete); }}>
                            <Edit className="w-4 h-4 mr-2" />
                            Editar
                          </DropdownMenuItem>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <DropdownMenuItem onSelect={(e) => e.preventDefault()} onClick={(e) => e.stopPropagation()} className="text-red-600 focus:text-red-700 focus:bg-red-50">
                                <Trash2 className="w-4 h-4 mr-2" />
                                Excluir
                              </DropdownMenuItem>
                            </AlertDialogTrigger>
                            <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Excluir Lembrete</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Esta ação não pode ser desfeita. O lembrete será permanentemente removido.
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
      {isDialogOpen && (
        <LembreteDialog
          isOpen={isDialogOpen}
          onClose={() => setIsDialogOpen(false)}
          onSave={handleSave}
          lembrete={editingLembrete}
        />
      )}
    </div>
  );
};

export default LembretesList;