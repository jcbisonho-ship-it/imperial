import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/lib/customSupabaseClient';
import { Plus, Search, Edit2, Trash2, Eye, Car, Loader2, User } from 'lucide-react';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import ServiceOrderDialog from './ServiceOrderDialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import ServiceOrderDetail from './ServiceOrderDetail';
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

const STATUS_MAP = {
  'pending': { label: 'Pendente', color: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  'Aberta': { label: 'Aberta', color: 'bg-blue-100 text-blue-800 border-blue-200' },
  'in_progress': { label: 'Em Andamento', color: 'bg-blue-100 text-blue-800 border-blue-200' },
  'completed': { label: 'Concluída', color: 'bg-green-100 text-green-800 border-green-200' },
  'Concluída': { label: 'Concluída', color: 'bg-green-100 text-green-800 border-green-200' },
  'cancelled': { label: 'Cancelada', color: 'bg-red-100 text-red-800 border-red-200' },
  'Cancelada': { label: 'Cancelada', color: 'bg-red-100 text-red-800 border-red-200' },
};

const ServiceOrderList = () => {
  const [workOrders, setWorkOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const { toast } = useToast();

  const fetchWorkOrders = async () => {
    setLoading(true);
    try {
        const { data, error } = await supabase
            .from('service_orders')
            .select(`
                id,
                os_number,
                status,
                total_amount,
                created_at,
                customer:customers(name),
                vehicle:vehicles(plate, model),
                budget:budgets(
                    *,
                    items:budget_items(
                        *,
                        collaborator:collaborators(name)
                    )
                )
            `).order('os_number', { ascending: false });

      if (error) throw error;
      
      const flattened = data.map(wo => {
        let technicianName = '-';
        if (wo.budget?.items) {
          const serviceItemWithTech = wo.budget.items.find(item => item.item_type === 'service' && item.collaborator);
          if (serviceItemWithTech) {
            technicianName = serviceItemWithTech.collaborator.name;
          }
        }
        
        return {
          id: wo.id,
          os_number: wo.os_number,
          order_date: wo.created_at,
          status: wo.status,
          total_cost: wo.total_amount,
          customer_name: wo.customer?.name || 'Desconhecido',
          vehicle_plate: wo.vehicle?.plate || '-',
          vehicle_model: wo.vehicle?.model || '-',
          technician_name: technicianName,
        };
      });

      setWorkOrders(flattened || []);
    } catch (error) {
      console.error('Error fetching work orders:', error);
      toast({ title: 'Erro', description: 'Falha ao carregar ordens de serviço.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkOrders();
  }, []);

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      const { error } = await supabase.from('service_orders').delete().eq('id', deleteId);
      if (error) throw error;

      toast({ title: 'OS excluída com sucesso' });
      fetchWorkOrders();
    } catch (error) {
      toast({ title: 'Erro ao excluir', description: error.message, variant: 'destructive' });
    } finally {
      setDeleteId(null);
    }
  };

  const handleEdit = (order) => {
    setSelectedOrder(order);
    setIsDialogOpen(true);
  };

  const handleView = (order) => {
      setSelectedOrder(order);
      setIsDetailOpen(true);
  }

  const handleAddNew = () => {
      setSelectedOrder(null);
      setIsDialogOpen(true);
  }

  const filteredOrders = workOrders.filter(wo => {
    const matchesSearch = 
        wo.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        wo.vehicle_plate?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        String(wo.os_number).includes(searchTerm);
    
    const matchesStatus = statusFilter === 'all' || wo.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6 w-full">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
           <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">Ordens de Serviço</h1>
           <p className="text-gray-500 mt-1 text-sm sm:text-base">Gerencie os serviços da oficina.</p>
        </div>
        <Button onClick={handleAddNew} className="w-full sm:w-auto">
          <Plus className="mr-2 h-4 w-4" /> Nova OS
        </Button>
      </div>

      <div className="bg-white p-4 rounded-lg border shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row gap-4 w-full">
            <div className="relative flex-grow">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                <Input
                    placeholder="Buscar por cliente, placa ou número..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 w-full"
                />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-[200px]">
                    <SelectValue placeholder="Filtrar por Status" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">Todos os Status</SelectItem>
                    <SelectItem value="Aberta">Aberta</SelectItem>
                    <SelectItem value="pending">Pendente</SelectItem>
                    <SelectItem value="in_progress">Em Andamento</SelectItem>
                    <SelectItem value="completed">Concluída</SelectItem>
                    <SelectItem value="Concluída">Concluída</SelectItem>
                    <SelectItem value="cancelled">Cancelada</SelectItem>
                    <SelectItem value="Cancelada">Cancelada</SelectItem>
                </SelectContent>
            </Select>
        </div>

        <div className="rounded-md border overflow-hidden">
          <div className="overflow-x-auto w-full">
            <Table className="min-w-[900px]">
                <TableHeader>
                <TableRow className="bg-gray-50">
                    <TableHead className="w-[100px]">Número</TableHead>
                    <TableHead className="w-[120px]">Data</TableHead>
                    <TableHead>Veículo</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                </TableRow>
                </TableHeader>
                <TableBody>
                {loading ? (
                    <TableRow>
                        <TableCell colSpan={7} className="h-24 text-center">
                            <div className="flex items-center justify-center"><Loader2 className="animate-spin h-6 w-6 text-blue-600" /></div>
                        </TableCell>
                    </TableRow>
                ) : filteredOrders.length === 0 ? (
                    <TableRow>
                        <TableCell colSpan={7} className="h-24 text-center text-gray-500">Nenhuma OS encontrada.</TableCell>
                    </TableRow>
                ) : (
                    filteredOrders.map((wo) => (
                    <TableRow key={wo.id} className="hover:bg-gray-50">
                        <TableCell className="font-mono text-sm text-gray-900 font-medium">
                            {wo.os_number}
                        </TableCell>
                        <TableCell className="text-sm text-gray-600 whitespace-nowrap">
                            {format(new Date(wo.order_date), 'dd/MM/yy')}
                        </TableCell>
                        <TableCell>
                            <div className="flex items-center gap-1 text-sm text-gray-900">
                                <Car className="w-4 h-4 text-gray-400" />
                                <span>{wo.vehicle_plate} • {wo.vehicle_model}</span>
                            </div>
                        </TableCell>
                        <TableCell>
                            <div className="flex items-center gap-2 text-sm">
                                <User className="w-4 h-4 text-gray-400" />
                                <span>{wo.customer_name}</span>
                            </div>
                        </TableCell>
                        <TableCell className="text-right font-medium text-sm">
                            R$ {Number(wo.total_cost).toFixed(2)}
                        </TableCell>
                        <TableCell className="text-center">
                            <Badge variant="outline" className={`${STATUS_MAP[wo.status]?.color || 'bg-gray-100'} whitespace-nowrap`}>
                                {STATUS_MAP[wo.status]?.label || wo.status}
                            </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="icon" onClick={() => handleView(wo)} title="Visualizar Detalhes">
                                <Eye className="h-4 w-4 text-blue-600" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleEdit(wo)} title="Editar" disabled={['completed', 'Concluída', 'cancelled', 'Cancelada'].includes(wo.status)}>
                                <Edit2 className={`h-4 w-4 ${['completed', 'Concluída', 'cancelled', 'Cancelada'].includes(wo.status) ? 'text-gray-300' : 'text-orange-600'}`} />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => setDeleteId(wo.id)} title="Excluir">
                                <Trash2 className="h-4 w-4 text-red-600" />
                            </Button>
                        </div>
                        </TableCell>
                    </TableRow>
                    ))
                )}
                </TableBody>
            </Table>
          </div>
        </div>
      </div>

      <ServiceOrderDialog 
        isOpen={isDialogOpen} 
        onClose={() => setIsDialogOpen(false)} 
        onSaveSuccess={fetchWorkOrders} 
        workOrder={selectedOrder} 
      />

      <ServiceOrderDetail
        isOpen={isDetailOpen}
        onClose={() => { setIsDetailOpen(false); fetchWorkOrders(); }}
        osId={selectedOrder?.id}
        onUpdate={fetchWorkOrders}
      />

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Isso excluirá permanentemente a ordem de serviço.
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

export default ServiceOrderList;