import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/lib/customSupabaseClient';
import { Plus, Search, Edit2, Trash2, Truck, Phone, Loader2, MoreHorizontal } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import NewCadastroDialog from '@/components/dialogs/NewCadastroDialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const FornecedoresList = () => {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const { toast } = useToast();

  const fetchSuppliers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('suppliers')
        .select('*')
        .order('name');

      if (error) throw error;
      setSuppliers(data || []);
    } catch (error) {
      console.error('Error fetching suppliers:', error);
      toast({ title: 'Erro', description: 'Falha ao carregar fornecedores.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      const { error } = await supabase.from('suppliers').delete().eq('id', deleteId);
      if (error) throw error;
      toast({ title: 'Fornecedor excluído com sucesso' });
      fetchSuppliers();
    } catch (error) {
      toast({ title: 'Erro ao excluir', description: error.message, variant: 'destructive' });
    } finally {
      setDeleteId(null);
    }
  };

  const handleEdit = (supplier) => {
    setSelectedSupplier(supplier);
    setIsDialogOpen(true);
  };

  const handleAddNew = () => {
      setSelectedSupplier(null);
      setIsDialogOpen(true);
  }

  const filteredSuppliers = suppliers.filter(s =>
    s.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.trade_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.cnpj?.includes(searchTerm) ||
    s.supply_type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 w-full">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
           <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">Fornecedores</h1>
           <p className="text-gray-500 mt-1 text-sm sm:text-base">Gerencie seus parceiros e fornecedores de peças/serviços.</p>
        </div>
        <Button onClick={handleAddNew} className="w-full sm:w-auto">
          <Plus className="mr-2 h-4 w-4" /> Novo Fornecedor
        </Button>
      </div>

      <div className="bg-white p-4 rounded-lg border shadow-sm space-y-4">
        <div className="relative max-w-sm w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
          <Input
            placeholder="Buscar por Razão Social, Fantasia ou CNPJ..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 w-full"
          />
        </div>

        <div className="rounded-md border overflow-hidden">
          <div className="overflow-x-auto w-full">
            <Table className="min-w-[900px]">
                <TableHeader>
                <TableRow className="bg-gray-50">
                    <TableHead className="w-[250px]">Razão Social / Fantasia</TableHead>
                    <TableHead>CNPJ</TableHead>
                    <TableHead>Tipo de Fornecimento</TableHead>
                    <TableHead>Contato</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                </TableRow>
                </TableHeader>
                <TableBody>
                {loading ? (
                    <TableRow>
                        <TableCell colSpan={5} className="h-24 text-center">
                            <div className="flex items-center justify-center"><Loader2 className="animate-spin h-6 w-6 text-blue-600" /></div>
                        </TableCell>
                    </TableRow>
                ) : filteredSuppliers.length === 0 ? (
                    <TableRow>
                        <TableCell colSpan={5} className="h-24 text-center text-gray-500">Nenhum fornecedor encontrado.</TableCell>
                    </TableRow>
                ) : (
                    filteredSuppliers.map((supplier) => (
                    <TableRow key={supplier.id} className="hover:bg-gray-50">
                        <TableCell className="font-medium">
                            <div className="flex items-center gap-3">
                                <div className="bg-orange-100 p-2 rounded-full hidden sm:block">
                                    <Truck className="h-4 w-4 text-orange-600" />
                                </div>
                                <div className="flex flex-col">
                                    <span>{supplier.name}</span>
                                    {supplier.trade_name && <span className="text-xs text-gray-500">{supplier.trade_name}</span>}
                                </div>
                            </div>
                        </TableCell>
                        <TableCell className="text-gray-600 font-mono text-sm">
                            {supplier.cnpj || '-'}
                        </TableCell>
                        <TableCell>
                            {supplier.supply_type ? (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                    {supplier.supply_type}
                                </span>
                            ) : (
                                <span className="text-gray-400 text-sm">-</span>
                            )}
                        </TableCell>
                        <TableCell>
                            <div className="flex flex-col text-sm">
                                <span className="flex items-center gap-1 text-gray-600"><Phone className="w-3 h-3" /> {supplier.phone || '-'}</span>
                                <span className="text-gray-500 text-xs">{supplier.email}</span>
                            </div>
                        </TableCell>
                        <TableCell className="text-right">
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" className="h-8 w-8 p-0">
                                        <span className="sr-only">Abrir menu</span>
                                        <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuLabel>Ações</DropdownMenuLabel>
                                    <DropdownMenuItem onClick={() => handleEdit(supplier)}>
                                        <Edit2 className="mr-2 h-4 w-4" /> Editar
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={() => setDeleteId(supplier.id)} className="text-red-600 focus:text-red-600">
                                        <Trash2 className="mr-2 h-4 w-4" /> Excluir
                                    </DropdownMenuItem>
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
      </div>

      <NewCadastroDialog 
        isOpen={isDialogOpen} 
        onClose={() => setIsDialogOpen(false)} 
        onSaveSuccess={fetchSuppliers} 
        entityToEdit={selectedSupplier}
        defaultTab="fornecedor"
      />

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Isso excluirá permanentemente o fornecedor.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default FornecedoresList;