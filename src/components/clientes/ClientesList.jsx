import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PlusCircle, MoreHorizontal, FileText, Trash2, Edit, Search, Phone, Mail, Car } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import ClienteDialog from './ClienteDialog';
import ClientHistoryDialog from '@/components/dialogs/ClientHistoryDialog';

const ClientesList = () => {
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCliente, setSelectedCliente] = useState(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [clienteToDelete, setClienteToDelete] = useState(null);
  const { toast } = useToast();

  const fetchClientes = async () => {
    setLoading(true);
    try {
      let query = supabase.from('customers').select('*').order('name', { ascending: true });

      if (searchTerm) {
        query = query.or(`name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%,cpf.ilike.%${searchTerm}%`);
      }

      const { data, error } = await query;

      if (error) throw error;
      setClientes(data || []);
    } catch (error) {
      toast({
        title: 'Erro ao carregar clientes',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchClientes();
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm]);

  const handleNewCliente = () => {
    setSelectedCliente(null);
    setIsModalOpen(true);
  };

  const handleEditCliente = (cliente) => {
    setSelectedCliente(cliente);
    setIsModalOpen(true);
  };

  const handleViewHistory = (cliente) => {
    setSelectedCliente(cliente);
    setIsHistoryOpen(true);
  };

  const handleDeleteClick = (cliente) => {
    setClienteToDelete(cliente);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!clienteToDelete) return;
    try {
      const { error } = await supabase.from('customers').delete().eq('id', clienteToDelete.id);
      if (error) throw error;

      toast({ title: 'Cliente excluído com sucesso' });
      fetchClientes();
    } catch (error) {
      toast({
        title: 'Erro ao excluir',
        description: 'Não é possível excluir clientes com vínculos ativos (veículos, orçamentos, etc).',
        variant: 'destructive',
      });
    } finally {
      setIsDeleteDialogOpen(false);
      setClienteToDelete(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, CPF, email..."
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Button onClick={handleNewCliente}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Novo Cliente
        </Button>
      </div>

      <div className="border rounded-md bg-white">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50">
              <TableHead>Nome</TableHead>
              <TableHead>Contato</TableHead>
              <TableHead>Documento</TableHead>
              <TableHead>Cidade/UF</TableHead>
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
            ) : clientes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                  Nenhum cliente encontrado.
                </TableCell>
              </TableRow>
            ) : (
              clientes.map((cliente) => (
                <TableRow 
                  key={cliente.id} 
                  className="hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => handleEditCliente(cliente)}
                >
                  <TableCell className="font-medium">
                    <div>{cliente.name}</div>
                    {cliente.email && (
                      <div className="text-xs text-gray-500 flex items-center mt-0.5">
                        <Mail className="w-3 h-3 mr-1" /> {cliente.email}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1 text-sm">
                      <div className="flex items-center">
                        <Phone className="w-3 h-3 mr-1 text-gray-400" />
                        {cliente.whatsapp || cliente.phone || '-'}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{cliente.cpf || cliente.cnpj || '-'}</TableCell>
                  <TableCell>
                    {cliente.city && cliente.state ? `${cliente.city}/${cliente.state}` : '-'}
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
                          <DropdownMenuItem onClick={() => handleEditCliente(cliente)}>
                            <Edit className="mr-2 h-4 w-4" /> Editar Cadastro
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleViewHistory(cliente)}>
                            <Car className="mr-2 h-4 w-4" /> Veículos e Histórico
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => handleDeleteClick(cliente)} className="text-red-600">
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
        <ClienteDialog
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSave={fetchClientes}
          cliente={selectedCliente}
        />
      )}

      {isHistoryOpen && selectedCliente && (
        <ClientHistoryDialog
          isOpen={isHistoryOpen}
          onClose={() => setIsHistoryOpen(false)}
          clientId={selectedCliente.id}
          clientName={selectedCliente.name}
        />
      )}

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o cliente <strong>{clienteToDelete?.name}</strong>?
              Esta ação não pode ser desfeita.
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

export default ClientesList;