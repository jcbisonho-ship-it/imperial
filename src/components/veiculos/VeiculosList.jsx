import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PlusCircle, MoreHorizontal, Edit, Trash2, History, Car, Search } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import VeiculoDialog from './VeiculoDialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import VeiculoHistorico from './VeiculoHistorico';

const VeiculosList = () => {
  const [veiculos, setVeiculos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [selectedVeiculo, setSelectedVeiculo] = useState(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [veiculoToDelete, setVeiculoToDelete] = useState(null);
  const { toast } = useToast();

  const fetchVeiculos = async () => {
    setLoading(true);
    try {
      // Use the existing RPC function for efficient searching if available, or fallback to direct join
      const { data, error } = await supabase
        .from('vehicles')
        .select('*, customer:customers(name)')
        .order('created_at', { ascending: false });

      if (error) throw error;

      let filteredData = data;
      if (searchTerm) {
          const term = searchTerm.toLowerCase();
          filteredData = data.filter(v => 
              v.plate?.toLowerCase().includes(term) || 
              v.model?.toLowerCase().includes(term) || 
              v.brand?.toLowerCase().includes(term) ||
              v.customer?.name?.toLowerCase().includes(term)
          );
      }

      setVeiculos(filteredData || []);
    } catch (error) {
      toast({
        title: 'Erro ao carregar veículos',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchVeiculos();
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm]);

  const handleNewVeiculo = () => {
    setSelectedVeiculo(null);
    setIsModalOpen(true);
  };

  const handleEditVeiculo = (veiculo) => {
    setSelectedVeiculo(veiculo);
    setIsModalOpen(true);
  };

  const handleViewHistory = (veiculo) => {
    setSelectedVeiculo(veiculo);
    setIsHistoryOpen(true);
  };

  const handleDeleteClick = (veiculo) => {
    setVeiculoToDelete(veiculo);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!veiculoToDelete) return;
    try {
      const { error } = await supabase.from('vehicles').delete().eq('id', veiculoToDelete.id);
      if (error) throw error;
      toast({ title: 'Veículo excluído com sucesso' });
      fetchVeiculos();
    } catch (error) {
      toast({
        title: 'Erro ao excluir',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsDeleteDialogOpen(false);
      setVeiculoToDelete(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="relative w-full sm:w-72">
           <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
           <Input
             placeholder="Placa, modelo ou cliente..."
             className="pl-8"
             value={searchTerm}
             onChange={(e) => setSearchTerm(e.target.value)}
           />
        </div>
        <Button onClick={handleNewVeiculo}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Novo Veículo
        </Button>
      </div>

      <div className="border rounded-md bg-white">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50">
              <TableHead>Placa</TableHead>
              <TableHead>Veículo</TableHead>
              <TableHead>Cliente/Proprietário</TableHead>
              <TableHead>Ano/Cor</TableHead>
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
            ) : veiculos.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                  Nenhum veículo encontrado.
                </TableCell>
              </TableRow>
            ) : (
              veiculos.map((veiculo) => (
                <TableRow 
                  key={veiculo.id}
                  className="hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => handleEditVeiculo(veiculo)}
                >
                  <TableCell className="font-bold font-mono text-blue-600">
                    {veiculo.plate}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                        <Car className="w-4 h-4 text-gray-400" />
                        <span>{veiculo.brand} {veiculo.model}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {veiculo.customer?.name || '-'}
                  </TableCell>
                  <TableCell>
                    {veiculo.year ? `${veiculo.year}` : '-'} 
                    {veiculo.color && <span className="text-gray-400 mx-1">•</span>}
                    {veiculo.color}
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
                          <DropdownMenuItem onClick={() => handleEditVeiculo(veiculo)}>
                            <Edit className="mr-2 h-4 w-4" /> Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleViewHistory(veiculo)}>
                            <History className="mr-2 h-4 w-4" /> Histórico
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => handleDeleteClick(veiculo)} className="text-red-600">
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
        <VeiculoDialog
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSave={fetchVeiculos}
          veiculo={selectedVeiculo}
        />
      )}

      {isHistoryOpen && selectedVeiculo && (
         <VeiculoHistorico 
            isOpen={isHistoryOpen}
            onClose={() => setIsHistoryOpen(false)}
            vehicleId={selectedVeiculo.id}
            vehiclePlate={selectedVeiculo.plate}
         />
      )}

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o veículo <strong>{veiculoToDelete?.plate}</strong>?
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

export default VeiculosList;