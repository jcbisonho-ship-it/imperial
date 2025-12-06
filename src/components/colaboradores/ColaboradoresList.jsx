import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PlusCircle, MoreHorizontal, Edit, Trash2, Shield, Mail, Phone } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import ColaboradorDialog from './ColaboradorDialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

const ColaboradoresList = () => {
  const [colaboradores, setColaboradores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedColaborador, setSelectedColaborador] = useState(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [colaboradorToDelete, setColaboradorToDelete] = useState(null);
  const { toast } = useToast();

  const fetchColaboradores = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('collaborators')
        .select('*')
        .order('name', { ascending: true });

      if (searchTerm) {
        query = query.or(`name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,cpf.ilike.%${searchTerm}%`);
      }

      const { data, error } = await query;

      if (error) throw error;
      setColaboradores(data || []);
    } catch (error) {
      toast({
        title: 'Erro ao carregar colaboradores',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchColaboradores();
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm]);

  const handleNewColaborador = () => {
    setSelectedColaborador(null);
    setIsModalOpen(true);
  };

  const handleEditColaborador = (colaborador) => {
    setSelectedColaborador(colaborador);
    setIsModalOpen(true);
  };

  const handleDeleteClick = (colaborador) => {
    setColaboradorToDelete(colaborador);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!colaboradorToDelete) return;
    try {
      const { error } = await supabase.from('collaborators').delete().eq('id', colaboradorToDelete.id);
      if (error) throw error;
      toast({ title: 'Colaborador excluído com sucesso' });
      fetchColaboradores();
    } catch (error) {
      toast({
        title: 'Erro ao excluir',
        description: 'Não é possível excluir colaboradores com vínculos ativos.',
        variant: 'destructive',
      });
    } finally {
      setIsDeleteDialogOpen(false);
      setColaboradorToDelete(null);
    }
  };

  const getRoleBadge = (role) => {
    const roles = {
      'admin': 'bg-red-100 text-red-800',
      'manager': 'bg-purple-100 text-purple-800',
      'technician': 'bg-blue-100 text-blue-800',
      'sales': 'bg-green-100 text-green-800',
    };
    return roles[role] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <Input
          placeholder="Buscar por nome, email..."
          className="max-w-sm"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <Button onClick={handleNewColaborador}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Novo Colaborador
        </Button>
      </div>

      <div className="border rounded-md bg-white">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50">
              <TableHead>Nome</TableHead>
              <TableHead>Cargo</TableHead>
              <TableHead>Contato</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  <div className="flex justify-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                  </div>
                </TableCell>
              </TableRow>
            ) : colaboradores.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                  Nenhum colaborador encontrado.
                </TableCell>
              </TableRow>
            ) : (
              colaboradores.map((colaborador) => (
                <TableRow 
                  key={colaborador.id} 
                  className="hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => handleEditColaborador(colaborador)}
                >
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                       <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-600">
                          {colaborador.name.substring(0, 2).toUpperCase()}
                       </div>
                       {colaborador.name}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={getRoleBadge(colaborador.role)}>
                      {colaborador.role === 'technician' ? 'Mecânico' : colaborador.role}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col text-sm gap-1">
                      {colaborador.email && (
                        <div className="flex items-center text-gray-500">
                          <Mail className="w-3 h-3 mr-1" /> {colaborador.email}
                        </div>
                      )}
                      {colaborador.phone && (
                         <div className="flex items-center text-gray-500">
                           <Phone className="w-3 h-3 mr-1" /> {colaborador.phone}
                         </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={colaborador.status === 'active' ? 'default' : 'secondary'}>
                       {colaborador.status === 'active' ? 'Ativo' : 'Inativo'}
                    </Badge>
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
                          <DropdownMenuItem onClick={() => handleEditColaborador(colaborador)}>
                            <Edit className="mr-2 h-4 w-4" /> Editar
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => handleDeleteClick(colaborador)} className="text-red-600">
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
        <ColaboradorDialog
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSave={fetchColaboradores}
          colaborador={selectedColaborador}
        />
      )}

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o colaborador <strong>{colaboradorToDelete?.name}</strong>?
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

export default ColaboradoresList;