import React, { useState, useEffect, useCallback } from 'react';
import { useDebounce } from '@/hooks/useDebounce';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { PlusCircle, Search, MoreHorizontal, Edit, Trash2, History } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import VeiculoDialog from '@/components/veiculos/VeiculoDialog';
import VehicleHistoryDialog from '@/components/dialogs/VehicleHistoryDialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useAuth } from '@/contexts/SupabaseAuthContext';

const VehicleRegistration = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
  const [pageCount, setPageCount] = useState(0);

  const [isVehicleDialogOpen, setIsVehicleDialogOpen] = useState(false);
  const [isHistoryDialogOpen, setIsHistoryDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [customers, setCustomers] = useState([]);

  const debouncedSearchTerm = useDebounce(searchTerm, 500);

  const fetchVehicles = useCallback(async () => {
    setLoading(true);
    const { pageIndex, pageSize } = pagination;
    const from = pageIndex * pageSize;
    const to = from + pageSize - 1;

    let query = supabase.rpc('get_vehicle_summary', {}, { count: 'exact' });

    if (debouncedSearchTerm) {
      query = query.or(`plate.ilike.%${debouncedSearchTerm}%,brand.ilike.%${debouncedSearchTerm}%,model.ilike.%${debouncedSearchTerm}%,customer_name.ilike.%${debouncedSearchTerm}%`);
    }
    
    query = query.order('created_at', { ascending: false }).range(from, to);

    const { data, error, count } = await query;

    if (error) {
      toast({ title: 'Erro ao carregar veículos', description: error.message, variant: 'destructive' });
      setVehicles([]);
    } else {
      setVehicles(data);
      setPageCount(Math.ceil(count / pageSize));
    }
    setLoading(false);
  }, [pagination, debouncedSearchTerm, toast]);
  
  const fetchCustomers = async () => {
      const { data } = await supabase.from('customers').select('id, name');
      if (data) setCustomers(data);
  };

  useEffect(() => {
    fetchVehicles();
  }, [fetchVehicles]);

  useEffect(() => {
    if(isVehicleDialogOpen) {
        fetchCustomers();
    }
  }, [isVehicleDialogOpen]);


  const openVehicleDialog = (vehicle = null) => {
    setSelectedVehicle(vehicle);
    setIsVehicleDialogOpen(true);
  };
  
  const openHistoryDialog = (vehicle) => {
    setSelectedVehicle(vehicle);
    setIsHistoryDialogOpen(true);
  };

  const openDeleteDialog = (vehicle) => {
    setSelectedVehicle(vehicle);
    setIsDeleteDialogOpen(true);
  };
  
  const handleDeleteVehicle = async () => {
    if (!selectedVehicle) return;
    try {
        const { error } = await supabase.from('vehicles').delete().eq('id', selectedVehicle.id);
        if (error) throw error;
        toast({ title: 'Veículo deletado com sucesso!' });
        fetchVehicles();
    } catch(error) {
        toast({ title: 'Erro ao deletar veículo', description: `O veículo pode ter OS ou orçamentos associados. Erro: ${error.message}`, variant: 'destructive' });
    }
    setIsDeleteDialogOpen(false);
    setSelectedVehicle(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Veículos</h2>
          <p className="text-gray-600">Gerencie a frota de veículos cadastrados.</p>
        </div>
        <Button onClick={() => openVehicleDialog()} className="bg-blue-600 hover:bg-blue-700">
          <PlusCircle className="w-4 h-4 mr-2" /> Novo Veículo
        </Button>
      </div>

      <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6">
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <Input placeholder="Buscar por placa, modelo, marca ou cliente..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10"/>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-gray-500">
            <thead className="text-xs text-gray-700 uppercase bg-gray-50">
              <tr>
                <th scope="col" className="px-4 py-3">Placa</th>
                <th scope="col" className="px-4 py-3">Veículo</th>
                <th scope="col" className="px-4 py-3 hidden md:table-cell">Cliente</th>
                <th scope="col" className="px-4 py-3 text-center">Status</th>
                <th scope="col" className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="bg-white border-b"><td colSpan="5" className="p-4"><div className="h-6 bg-gray-200 rounded animate-pulse"></div></td></tr>
                ))
              ) : vehicles.length > 0 ? (
                vehicles.map(vehicle => (
                  <tr key={vehicle.id} className="bg-white border-b hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-gray-900">{vehicle.plate}</td>
                    <td className="px-4 py-3">{vehicle.brand} {vehicle.model} ({vehicle.year})</td>
                    <td className="px-4 py-3 hidden md:table-cell">{vehicle.customer_name}</td>
                    <td className="px-4 py-3 text-center">
                      {vehicle.has_pending_os ? (<Badge variant="warning">OS Pendente</Badge>) : (<Badge variant="success">Ativo</Badge>)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="w-4 h-4" /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openVehicleDialog(vehicle)}><Edit className="w-4 h-4 mr-2" /> Editar</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openHistoryDialog(vehicle)}><History className="w-4 h-4 mr-2" /> Ver Histórico</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-red-600" onClick={() => openDeleteDialog(vehicle)}><Trash2 className="w-4 h-4 mr-2" /> Excluir</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan="5" className="text-center py-12 text-gray-500">Nenhum veículo encontrado.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        
        <div className="flex items-center justify-between pt-4">
          <span className="text-sm text-muted-foreground">Página {pagination.pageIndex + 1} de {pageCount || 1}</span>
          <div className="flex gap-2">
            <Button size="sm" onClick={() => setPagination(p => ({...p, pageIndex: p.pageIndex - 1}))} disabled={pagination.pageIndex === 0}>Anterior</Button>
            <Button size="sm" onClick={() => setPagination(p => ({...p, pageIndex: p.pageIndex + 1}))} disabled={pagination.pageIndex >= pageCount - 1}>Próximo</Button>
          </div>
        </div>
      </div>

      {isVehicleDialogOpen && <VeiculoDialog isOpen={isVehicleDialogOpen} onClose={() => setIsVehicleDialogOpen(false)} onSaveSuccess={fetchVehicles} vehicle={selectedVehicle} customers={customers} user={user} />}
      {isHistoryDialogOpen && <VehicleHistoryDialog isOpen={isHistoryDialogOpen} onClose={() => setIsHistoryDialogOpen(false)} vehicle={selectedVehicle} customer={customers.find(c => c.id === selectedVehicle.customer_id)} />}
      
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle><AlertDialogDescription>Esta ação é irreversível e excluirá o veículo. Ordens de serviço e orçamentos associados não serão removidos.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction className="bg-destructive hover:bg-destructive/90" onClick={handleDeleteVehicle}>Excluir</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default VehicleRegistration;