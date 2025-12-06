import React, { useState, useEffect, useCallback } from 'react';
import { useDebounce } from '@/hooks/useDebounce';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, MoreVertical, Ban, Eye, FileText, Lock } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from '@/components/ui/badge';
import { osService } from '@/services/osService';
import ServiceOrderDetail from '@/components/os/ServiceOrderDetail';
import ServiceOrderCancelDialog from '@/components/os/ServiceOrderCancelDialog';
import { formatCurrency, formatOSNumber } from '@/lib/utils';
import { format } from 'date-fns';

const ServiceOrders = () => {
  const [serviceOrders, setServiceOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  
  const [selectedOSId, setSelectedOSId] = useState(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  
  const [cancelOS, setCancelOS] = useState(null);
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);

  const { toast } = useToast();
  const debouncedSearchTerm = useDebounce(searchTerm, 500);

  const loadServiceOrders = useCallback(async () => {
    setLoading(true);
    try {
      // Check if search term is numeric (for direct ID lookup)
      if (debouncedSearchTerm && !isNaN(debouncedSearchTerm)) {
          const os = await osService.getByNumber(parseInt(debouncedSearchTerm));
          setServiceOrders(os ? [os] : []);
      } else {
          const data = await osService.getList({
              status: statusFilter,
              search: debouncedSearchTerm
          });
          setServiceOrders(data);
      }
    } catch (error) {
      console.error(error);
      toast({ title: "Erro ao carregar OS", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast, debouncedSearchTerm, statusFilter]);
  
  useEffect(() => {
    loadServiceOrders();
  }, [loadServiceOrders]);

  const openDetail = (os) => {
      setSelectedOSId(os.id);
      setIsDetailOpen(true);
  };

  const openCancel = (os) => {
      setCancelOS(os);
      setIsCancelDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Ordens de Serviço</h2>
          <p className="text-gray-600">Gerenciamento seguro de serviços (Numeração Sequencial).</p>
        </div>
        <Button variant="outline" disabled className="cursor-not-allowed opacity-70">
            <Lock className="w-4 h-4 mr-2" /> Nova OS (Via Orçamento)
        </Button>
      </div>

      <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="relative md:col-span-2">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <Input 
                    placeholder="Buscar por Nº OS, cliente ou placa..." 
                    className="pl-10" 
                    value={searchTerm} 
                    onChange={e => setSearchTerm(e.target.value)} 
                />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger><SelectValue placeholder="Filtrar por status..." /></SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">Todos os Status</SelectItem>
                    <SelectItem value="Aberta">Aberta</SelectItem>
                    <SelectItem value="Concluída">Concluída</SelectItem>
                    <SelectItem value="Cancelada">Cancelada</SelectItem>
                </SelectContent>
            </Select>
        </div>
        
        <div className="overflow-x-auto">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Nº OS</TableHead>
                        <TableHead>Cliente</TableHead>
                        <TableHead>Veículo</TableHead>
                        <TableHead>Data</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead className="text-center">Ações</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {loading ? (
                        <TableRow><TableCell colSpan="7" className="text-center py-10">Carregando...</TableCell></TableRow>
                    ) : serviceOrders.length === 0 ? (
                        <TableRow><TableCell colSpan="7" className="text-center py-10 text-gray-500">Nenhuma OS encontrada.</TableCell></TableRow>
                    ) : (
                        serviceOrders.map(order => (
                            <TableRow key={order.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => openDetail(order)}>
                                {/* REMOVED '#' prefix - only displaying the number now */}
                                <TableCell className="font-mono font-bold text-lg text-blue-600">
                                    {formatOSNumber(order.os_number)}
                                </TableCell>
                                <TableCell className="font-medium">{order.customer_name}</TableCell>
                                <TableCell>{order.vehicle_plate}</TableCell>
                                <TableCell>{format(new Date(order.created_at), 'dd/MM/yyyy')}</TableCell>
                                <TableCell>
                                    <Badge variant={order.status === 'Aberta' ? 'default' : order.status === 'Cancelada' ? 'destructive' : 'success'}>
                                        {order.status}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-right font-bold text-gray-800">{formatCurrency(order.total_amount)}</TableCell>
                                <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon"><MoreVertical className="w-5 h-5" /></Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem onClick={() => openDetail(order)}>
                                                <Eye className="w-4 h-4 mr-2" /> Visualizar Detalhes
                                            </DropdownMenuItem>
                                            {order.status === 'Aberta' ? (
                                                <DropdownMenuItem className="text-red-600" onClick={() => openCancel(order)}>
                                                    <Ban className="w-4 h-4 mr-2" /> Cancelar OS
                                                </DropdownMenuItem>
                                            ) : (
                                                <DropdownMenuItem disabled className="text-gray-400 cursor-not-allowed">
                                                    <Lock className="w-4 h-4 mr-2" /> Cancelamento Bloqueado
                                                </DropdownMenuItem>
                                            )}
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

      <ServiceOrderDetail 
        isOpen={isDetailOpen} 
        onClose={() => setIsDetailOpen(false)} 
        osId={selectedOSId} 
        onUpdate={loadServiceOrders}
      />

      {cancelOS && (
        <ServiceOrderCancelDialog 
            isOpen={isCancelDialogOpen}
            onClose={() => setIsCancelDialogOpen(false)}
            osId={cancelOS.id}
            osNumber={cancelOS.os_number}
            onSuccess={loadServiceOrders}
        />
      )}
    </div>
  );
};

export default ServiceOrders;