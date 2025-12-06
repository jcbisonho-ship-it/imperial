import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Search, FileText, Trash2, Edit, Calendar as CalendarIcon, MoreVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import ServiceOrderDialog from '@/components/os/ServiceOrderDialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { logAuditEvent } from '@/lib/audit';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuPortal, DropdownMenuSubContent } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import OSViewer from '@/components/os/OSViewer';

const statusMap = {
  pending: { label: 'Pendente', color: 'bg-yellow-500' },
  in_progress: { label: 'Em Andamento', color: 'bg-blue-500' },
  awaiting_payment: { label: 'Aguardando Pagamento', color: 'bg-purple-500' },
  completed: { label: 'Concluída', color: 'bg-green-500' },
  canceled: { label: 'Cancelada', color: 'bg-red-500' },
};

const ServiceOrders = ({setActiveTab}) => {
  const [serviceOrders, setServiceOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState(null);
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({ status: 'in_progress', customer_id: '', technician_id: '', dateRange: { from: null, to: null } });
  
  const [customers, setCustomers] = useState([]);
  const [collaborators, setCollaborators] = useState([]);

  const { toast } = useToast();
  const { user } = useAuth();

  const loadDropdownData = useCallback(async () => {
    try {
      const [customersRes, collaboratorsRes] = await Promise.all([
        supabase.from('customers').select('id, name').order('name'),
        supabase.from('collaborators').select('id, name').order('name'),
      ]);
      if (customersRes.error) throw customersRes.error;
      if (collaboratorsRes.error) throw collaboratorsRes.error;

      setCustomers(customersRes.data || []);
      setCollaborators(collaboratorsRes.data || []);
    } catch(error) {
      toast({ title: "Erro ao carregar dados de apoio", description: error.message, variant: "destructive" });
    }
  }, [toast]);
  
  const loadServiceOrders = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase.rpc('get_work_order_summary');

      if (filters.status && filters.status !== 'all') query = query.eq('status', filters.status);
      if (filters.customer_id) query = query.eq('customer_id', filters.customer_id);
      if (filters.technician_id) query = query.eq('technician_id', filters.technician_id);
      if (filters.dateRange.from) query = query.gte('order_date', format(filters.dateRange.from, 'yyyy-MM-dd'));
      if (filters.dateRange.to) query = query.lte('order_date', format(filters.dateRange.to, 'yyyy-MM-dd'));
      
      if (searchTerm) {
        query = query.or(`customer_name.ilike.%${searchTerm}%,vehicle_plate.ilike.%${searchTerm}%,title.ilike.%${searchTerm}%`);
      }

      const { data, error } = await query.order('order_date', { ascending: false });

      if (error) throw error;
      setServiceOrders(data || []);
    } catch (error) {
      toast({ title: "Erro ao carregar Ordens de Serviço", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast, filters, searchTerm]);
  
  useEffect(() => {
    loadDropdownData();
    loadServiceOrders();
  }, [loadDropdownData, loadServiceOrders]);

  const handleStatusChange = async (orderId, newStatus) => {
    try {
      const { error } = await supabase.from('work_orders').update({ status: newStatus, completion_date: newStatus === 'completed' ? new Date().toISOString() : null }).eq('id', orderId);
      if (error) throw error;
      await logAuditEvent(user.id, 'update_os_status', { orderId, newStatus });
      toast({ title: 'Status atualizado com sucesso!' });
      if (newStatus === 'completed' && setActiveTab) {
        setActiveTab('financeiro');
      } else {
        loadServiceOrders();
      }
    } catch (error) {
      toast({ title: 'Erro ao atualizar status', description: error.message, variant: 'destructive' });
    }
  };
  
  const handleDelete = async () => {
    if (!editingOrder) return;
    try {
      await supabase.rpc('delete_work_order_and_related', { p_work_order_id: editingOrder.id });
      await logAuditEvent(user.id, 'delete_work_order', { orderId: editingOrder.id });
      toast({ title: 'Ordem de Serviço removida com sucesso!' });
      loadServiceOrders();
    } catch (error) {
      toast({ title: 'Erro ao remover Ordem de Serviço', description: error.message, variant: 'destructive' });
    } finally {
      setIsDeleteOpen(false);
      setEditingOrder(null);
    }
  };

  const handleFilterChange = (filterName, value) => {
    setFilters(prev => ({ ...prev, [filterName]: value }));
  };
  
  const formatCurrency = (value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Ordens de Serviço</h2>
          <p className="text-gray-600">Gerencie todas as ordens de serviço da oficina.</p>
        </div>
        <Button onClick={() => { setEditingOrder(null); setIsDialogOpen(true); }} className="bg-gradient-to-r from-blue-600 to-blue-800 hover:from-blue-700 hover:to-blue-900">
          <Plus className="w-4 h-4 mr-2" /> Nova Ordem de Serviço
        </Button>
      </div>

      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mb-6">
            <div className="relative xl:col-span-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <Input placeholder="Buscar cliente, placa, título..." className="pl-10" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
            </div>
            <Select value={filters.status || ''} onValueChange={(value) => handleFilterChange('status', value === 'all' ? '' : value)}>
                <SelectTrigger><SelectValue placeholder="Filtrar por Status" /></SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">Todos Status</SelectItem>
                    {Object.entries(statusMap).map(([key, {label}]) => <SelectItem key={key} value={key}>{label}</SelectItem>)}
                </SelectContent>
            </Select>
            <Select value={filters.customer_id || ''} onValueChange={(value) => handleFilterChange('customer_id', value === 'all' ? '' : value)}>
                <SelectTrigger><SelectValue placeholder="Filtrar por Cliente" /></SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">Todos Clientes</SelectItem>
                    {customers.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
            </Select>
             <Select value={filters.technician_id || ''} onValueChange={(value) => handleFilterChange('technician_id', value === 'all' ? '' : value)}>
                <SelectTrigger><SelectValue placeholder="Filtrar por Técnico" /></SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">Todos Técnicos</SelectItem>
                    {collaborators.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
            </Select>
            <Popover>
                <PopoverTrigger asChild>
                    <Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !filters.dateRange.from && "text-muted-foreground")}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {filters.dateRange.from ? (
                            filters.dateRange.to ? (
                                `${format(filters.dateRange.from, "dd/MM/y")} - ${format(filters.dateRange.to, "dd/MM/y")}`
                            ) : (
                                format(filters.dateRange.from, "dd/MM/y")
                            )
                        ) : (
                            <span>Selecione um período</span>
                        )}
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="range" selected={filters.dateRange} onSelect={(range) => handleFilterChange('dateRange', range || { from: null, to: null })} numberOfMonths={2} />
                </PopoverContent>
            </Popover>
        </div>
        
        {loading ? (
          <div className="text-center py-12">Carregando Ordens de Serviço...</div>
        ) : serviceOrders.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">Nenhuma Ordem de Serviço encontrada</p>
            <p className="text-gray-400 text-sm">Ajuste os filtros ou clique em "Nova Ordem de Serviço" para começar.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {serviceOrders.map(order => (
              <div key={order.id} className="border rounded-lg p-4 flex flex-col md:flex-row justify-between items-start md:items-center hover:bg-gray-50 transition-colors">
                <div className="flex-1 mb-4 md:mb-0">
                    <div className="flex items-center gap-3 flex-wrap">
                      <p className="font-semibold text-gray-800">{order.customer_name}</p>
                      <p className="text-sm text-gray-600">{order.vehicle_model} - {order.vehicle_plate}</p>
                    </div>
                    <p className="font-medium text-gray-700 mt-1">{order.title}</p>
                     <p className="text-sm text-gray-500 mt-1">Técnico: {order.technician_name || 'Não atribuído'}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      Data: {format(parseISO(order.order_date), "dd/MM/yyyy", { locale: ptBR })}
                    </p>
                </div>
                <div className="flex items-center gap-4 self-start md:self-center">
                  <div className="text-right">
                    <p className="font-bold text-lg">{formatCurrency(order.total_cost)}</p>
                    <Badge className={`${statusMap[order.status]?.color || 'bg-gray-400'} text-white`}>{statusMap[order.status]?.label || 'Desconhecido'}</Badge>
                  </div>
                   <DropdownMenu>
                      <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreVertical className="w-5 h-5" /></Button></DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => { setEditingOrder(order); setIsViewerOpen(true); }}><FileText className="w-4 h-4 mr-2" />Ver Detalhes</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => { setEditingOrder(order); setIsDialogOpen(true); }}><Edit className="w-4 h-4 mr-2" />Editar</DropdownMenuItem>
                        <DropdownMenuSub>
                          <DropdownMenuSubTrigger>Mudar Status</DropdownMenuSubTrigger>
                          <DropdownMenuPortal><DropdownMenuSubContent>
                            {Object.entries(statusMap).map(([key, {label}]) => (
                                <DropdownMenuItem key={key} onClick={() => handleStatusChange(order.id, key)} disabled={order.status === key}>{label}</DropdownMenuItem>
                            ))}
                          </DropdownMenuSubContent></DropdownMenuPortal>
                        </DropdownMenuSub>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-red-600" onClick={() => { setEditingOrder(order); setIsDeleteOpen(true); }}><Trash2 className="w-4 h-4 mr-2" />Excluir</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {isDialogOpen && (
        <ServiceOrderDialog
          isOpen={isDialogOpen}
          onClose={() => { setIsDialogOpen(false); setEditingOrder(null); }}
          onSaveSuccess={loadServiceOrders}
          serviceOrder={editingOrder}
          user={user}
        />
      )}
      
      {isViewerOpen && (
        <OSViewer
          isOpen={isViewerOpen}
          onClose={() => setIsViewerOpen(false)}
          orderId={editingOrder?.id}
        />
      )}

      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle><AlertDialogDescription>Esta ação é irreversível e excluirá a OS e todos os seus itens. O estoque não será estornado.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction className="bg-destructive hover:bg-destructive/90" onClick={handleDelete}>Excluir</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ServiceOrders;