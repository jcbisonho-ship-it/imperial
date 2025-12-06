import React, { useState, useEffect, useCallback } from 'react';
import { useDebounce } from '@/hooks/useDebounce';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { UserPlus, Search, MoreHorizontal, Edit, Trash2, Car, History, FileWarning, CheckCircle, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import ClienteDialog from '@/components/clientes/ClienteDialog';
import VeiculoDialog from '@/components/veiculos/VeiculoDialog';
import ClientHistoryDialog from '@/components/dialogs/ClientHistoryDialog';
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
import { useAuth } from '@/contexts/SupabaseAuthContext';

const CustomerRegistration = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({ has_pending_os: false, no_vehicle: false, highSpender: false });
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
  const [pageCount, setPageCount] = useState(0);

  const [isCustomerDialogOpen, setIsCustomerDialogOpen] = useState(false);
  const [isVehicleDialogOpen, setIsVehicleDialogOpen] = useState(false);
  const [isHistoryDialogOpen, setIsHistoryDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [allCustomersForDialog, setAllCustomersForDialog] = useState([]);

  const debouncedSearchTerm = useDebounce(searchTerm, 500);

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    const { pageIndex, pageSize } = pagination;
    const from = pageIndex * pageSize;
    const to = from + pageSize - 1;

    let query = supabase.from('get_customer_summary').select('*', { count: 'exact' });

    if (debouncedSearchTerm) {
      query = query.or(`name.ilike.%${debouncedSearchTerm}%,cpf.ilike.%${debouncedSearchTerm}%,phone.ilike.%${debouncedSearchTerm}%`);
    }

    if (filters.has_pending_os) query = query.eq('has_pending_os', true);
    if (filters.no_vehicle) query = query.eq('vehicle_count', 0);
    
    query = query.order('name', { ascending: true }).range(from, to);

    const { data, error, count } = await query;

    if (error) {
      toast({ title: 'Erro ao carregar clientes', description: error.message, variant: 'destructive' });
      setCustomers([]);
    } else {
      setCustomers(data);
      setPageCount(Math.ceil(count / pageSize));
    }
    setLoading(false);
  }, [pagination, debouncedSearchTerm, filters, toast]);
  
  const fetchAllCustomers = async () => {
      const { data } = await supabase.from('customers').select('id, name');
      if (data) setAllCustomersForDialog(data);
  };

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  useEffect(() => {
    if (isVehicleDialogOpen) {
      fetchAllCustomers();
    }
  }, [isVehicleDialogOpen]);

  const handleFilterChange = (filterName) => {
    setFilters(prev => ({ ...prev, [filterName]: !prev[filterName] }));
    setPagination(prev => ({ ...prev, pageIndex: 0 }));
  };

  const openCustomerDialog = (customer = null) => {
    setSelectedCustomer(customer);
    setIsCustomerDialogOpen(true);
  };
  
  const openVehicleDialog = (customer = null, vehicle = null) => {
    setSelectedCustomer(customer);
    setIsVehicleDialogOpen(true);
  };

  const openHistoryDialog = (customer) => {
    setSelectedCustomer(customer);
    setIsHistoryDialogOpen(true);
  };

  const openDeleteDialog = (customer) => {
    setSelectedCustomer(customer);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteCustomer = async () => {
    if (!selectedCustomer) return;
    try {
        const { error: osError } = await supabase.from('work_orders').delete().eq('customer_id', selectedCustomer.id);
        if (osError) throw osError;
        
        const { error: vehicleError } = await supabase.from('vehicles').delete().eq('customer_id', selectedCustomer.id);
        if (vehicleError) throw vehicleError;

        const { error } = await supabase.from('customers').delete().eq('id', selectedCustomer.id);
        if (error) throw error;
        
        toast({ title: 'Cliente deletado com sucesso!' });
        fetchCustomers();
    } catch (error) {
        toast({ title: 'Erro ao deletar cliente', description: 'O cliente pode ter registros associados que não puderam ser excluídos. Detalhes: ' + error.message, variant: 'destructive' });
    }
    setIsDeleteDialogOpen(false);
    setSelectedCustomer(null);
  };
  

  const StatusBadge = ({ customer }) => {
    if (customer.has_pending_os) {
      return <Badge variant="warning" className="flex items-center gap-1"><Clock className="w-3 h-3" /> OS Pendente</Badge>;
    }
    if (customer.vehicle_count === 0) {
      return <Badge variant="secondary" className="flex items-center gap-1"><FileWarning className="w-3 h-3" /> Sem Veículo</Badge>;
    }
    return <Badge variant="success" className="flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Ativo</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Clientes</h2>
          <p className="text-gray-600">Gerencie sua base de clientes.</p>
        </div>
        <Button onClick={() => openCustomerDialog()} className="bg-blue-600 hover:bg-blue-700">
          <UserPlus className="w-4 h-4 mr-2" /> Novo Cliente
        </Button>
      </div>

      <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6">
        <div className="flex flex-col md:flex-row gap-4 mb-4">
          <div className="relative flex-grow">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input placeholder="Buscar por nome, CPF ou telefone..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button variant={filters.has_pending_os ? 'default' : 'outline'} size="sm" onClick={() => handleFilterChange('has_pending_os')}>OS Pendente</Button>
            <Button variant={filters.no_vehicle ? 'default' : 'outline'} size="sm" onClick={() => handleFilterChange('no_vehicle')}>Sem Veículo</Button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-gray-500">
            <thead className="text-xs text-gray-700 uppercase bg-gray-50">
              <tr>
                <th scope="col" className="px-4 py-3">Nome</th>
                <th scope="col" className="px-4 py-3 hidden sm:table-cell">CPF</th>
                <th scope="col" className="px-4 py-3 hidden md:table-cell">Telefone</th>
                <th scope="col" className="px-4 py-3 text-center">Nº Veículos</th>
                <th scope="col" className="px-4 py-3 text-center">Status</th>
                <th scope="col" className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="bg-white border-b"><td colSpan="6" className="p-4"><div className="h-6 bg-gray-200 rounded animate-pulse"></div></td></tr>
                ))
              ) : customers.length > 0 ? (
                customers.map(customer => (
                  <tr key={customer.id} className="bg-white border-b hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{customer.name}</td>
                    <td className="px-4 py-3 hidden sm:table-cell">{customer.cpf || '-'}</td>
                    <td className="px-4 py-3 hidden md:table-cell">{customer.phone}</td>
                    <td className="px-4 py-3 text-center">{customer.vehicle_count}</td>
                    <td className="px-4 py-3 text-center"><StatusBadge customer={customer} /></td>
                    <td className="px-4 py-3 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="w-4 h-4" /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openCustomerDialog(customer)}><Edit className="w-4 h-4 mr-2" /> Editar Cliente</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openVehicleDialog(customer)}><Car className="w-4 h-4 mr-2" /> Cadastrar Veículo</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openHistoryDialog(customer)}><History className="w-4 h-4 mr-2" /> Ver Histórico</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-red-600" onClick={() => openDeleteDialog(customer)}><Trash2 className="w-4 h-4 mr-2" /> Excluir Cliente</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan="6" className="text-center py-12 text-gray-500">Nenhum cliente encontrado.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        
        <div className="flex items-center justify-between pt-4">
          <span className="text-sm text-muted-foreground">Página {pagination.pageIndex + 1} de {pageCount || 1}</span>
          <div className="flex gap-2">
            <Button size="sm" onClick={() => setPagination(p => ({ ...p, pageIndex: p.pageIndex - 1 }))} disabled={pagination.pageIndex === 0}>Anterior</Button>
            <Button size="sm" onClick={() => setPagination(p => ({ ...p, pageIndex: p.pageIndex + 1 }))} disabled={pagination.pageIndex >= pageCount - 1}>Próximo</Button>
          </div>
        </div>
      </div>

      {isCustomerDialogOpen && <ClienteDialog isOpen={isCustomerDialogOpen} onClose={() => setIsCustomerDialogOpen(false)} onSaveSuccess={fetchCustomers} customer={selectedCustomer} user={user} />}
      {isVehicleDialogOpen && <VeiculoDialog isOpen={isVehicleDialogOpen} onClose={() => setIsVehicleDialogOpen(false)} onSaveSuccess={fetchCustomers} customer={selectedCustomer} customers={allCustomersForDialog} user={user} />}
      {isHistoryDialogOpen && <ClientHistoryDialog isOpen={isHistoryDialogOpen} onClose={() => setIsHistoryDialogOpen(false)} customer={selectedCustomer} />}

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Isso excluirá permanentemente o cliente e todos os seus veículos, orçamentos e ordens de serviço associadas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive hover:bg-destructive/90" onClick={handleDeleteCustomer}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default CustomerRegistration;