import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PlusCircle, MoreHorizontal, Edit, Trash2, Wrench, Search } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { formatCurrency } from '@/lib/utils';
import ServicoDialog from '@/components/servicos/ServicoDialog';
import GerenciarCategorias from '@/components/servicos/GerenciarCategorias';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

const Servicos = () => {
  const [servicos, setServicos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCategoriesOpen, setIsCategoriesOpen] = useState(false);
  const [selectedServico, setSelectedServico] = useState(null);
  
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [servicoToDelete, setServicoToDelete] = useState(null);
  
  const { toast } = useToast();

  const fetchServicos = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('servicos')
        .select('*, categoria:categorias(nome), subcategoria:subcategorias(nome)')
        .order('nome', { ascending: true });

      if (searchTerm) {
        query = query.ilike('nome', `%${searchTerm}%`);
      }

      const { data, error } = await query;

      if (error) throw error;
      setServicos(data || []);
    } catch (error) {
      toast({
        title: 'Erro ao carregar serviços',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchServicos();
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm]);

  const handleNewServico = () => {
    setSelectedServico(null);
    setIsModalOpen(true);
  };

  const handleEditServico = (servico) => {
    setSelectedServico(servico);
    setIsModalOpen(true);
  };

  const handleDeleteClick = (servico) => {
    setServicoToDelete(servico);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!servicoToDelete) return;
    try {
      const { error } = await supabase.from('servicos').delete().eq('id', servicoToDelete.id);
      if (error) throw error;
      toast({ title: 'Serviço excluído com sucesso' });
      fetchServicos();
    } catch (error) {
       toast({
        title: 'Erro ao excluir',
        description: 'Não é possível excluir serviços que já foram utilizados em ordens de serviço.',
        variant: 'destructive',
      });
    } finally {
      setIsDeleteDialogOpen(false);
      setServicoToDelete(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
         <div className="relative w-full sm:w-72">
           <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
           <Input
             placeholder="Buscar serviço..."
             className="pl-8"
             value={searchTerm}
             onChange={(e) => setSearchTerm(e.target.value)}
           />
        </div>
        <div className="flex gap-2">
            <Button variant="outline" onClick={() => setIsCategoriesOpen(true)}>
                Gerenciar Categorias
            </Button>
            <Button onClick={handleNewServico}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Novo Serviço
            </Button>
        </div>
      </div>

      <div className="border rounded-md bg-white">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50">
              <TableHead>Nome/Descrição</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Tempo Padrão</TableHead>
              <TableHead className="text-right">Valor Referência</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                    <div className="flex justify-center"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div></div>
                </TableCell>
              </TableRow>
            ) : servicos.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                  Nenhum serviço encontrado.
                </TableCell>
              </TableRow>
            ) : (
              servicos.map((servico) => (
                <TableRow 
                    key={servico.id}
                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => handleEditServico(servico)}
                >
                  <TableCell className="font-medium">
                    <div className="flex flex-col">
                        <span>{servico.nome}</span>
                        {servico.codigo && <span className="text-xs text-gray-500">Cód: {servico.codigo}</span>}
                    </div>
                  </TableCell>
                  <TableCell>
                    {servico.categoria?.nome || '-'}
                    {servico.subcategoria && <span className="text-xs text-gray-500 ml-2">/ {servico.subcategoria.nome}</span>}
                  </TableCell>
                  <TableCell>
                    {servico.tempo_duracao_minutos ? `${servico.tempo_duracao_minutos} min` : '-'}
                  </TableCell>
                  <TableCell className="text-right font-bold text-blue-600">
                    {formatCurrency(servico.valor_referencia)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEditServico(servico)}>
                            <Edit className="mr-2 h-4 w-4" /> Editar
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => handleDeleteClick(servico)} className="text-red-600">
                            <Trash2 className="mr-2 h-4 w-4" /> Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {isModalOpen && (
        <ServicoDialog
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSave={fetchServicos}
          servico={selectedServico}
        />
      )}

      {isCategoriesOpen && (
          <GerenciarCategorias 
            isOpen={isCategoriesOpen}
            onClose={() => setIsCategoriesOpen(false)}
          />
      )}

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o serviço <strong>{servicoToDelete?.nome}</strong>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Servicos;