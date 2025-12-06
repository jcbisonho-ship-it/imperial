import React, { useState } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { logAuditEvent } from '@/lib/audit';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { formatCurrency } from '@/lib/utils';

const statusColumns = [
  { id: 'in_progress', title: 'Em Andamento', bg: 'bg-blue-50' },
  { id: 'completed', title: 'Finalizada', bg: 'bg-green-50' },
  { id: 'delivered', title: 'Entregue', bg: 'bg-gray-100' },
];

const OSKanban = ({ serviceOrders, loading, onRefresh, onEdit }) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [draggedOrder, setDraggedOrder] = useState(null);
  
  // Confirmation State
  const [confirmConfig, setConfirmConfig] = useState({
    isOpen: false,
    orderId: null,
    newStatus: null,
    title: '',
    description: '',
    loading: false
  });

  const handleDragStart = (e, order) => {
    setDraggedOrder(order);
    // Set drag data for compatibility
    e.dataTransfer.setData("text/plain", order.id);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDrop = async (e, newStatus) => {
    e.preventDefault();
    if (!draggedOrder || draggedOrder.status === newStatus) return;

    // Determine confirmation message based on target status
    let title = "Mover OS";
    let description = `Deseja mover esta OS para "${statusColumns.find(c => c.id === newStatus)?.title || newStatus}"?`;
    
    if (newStatus === 'completed') {
        title = "Finalizar OS";
        description = "Ao mover para Finalizada, você confirma que todo o serviço foi executado. Deseja continuar?";
    }

    // Open Confirmation
    setConfirmConfig({
        isOpen: true,
        orderId: draggedOrder.id,
        newStatus: newStatus,
        title,
        description,
        loading: false
    });
    
    setDraggedOrder(null);
  };

  const executeMove = async () => {
    const { orderId, newStatus } = confirmConfig;
    setConfirmConfig(prev => ({ ...prev, loading: true }));
    
    try {
      const { error } = await supabase.from('work_orders').update({ status: newStatus }).eq('id', orderId);
      if (error) throw error;
      
      await logAuditEvent(user.id, 'update_os_status_kanban', { orderId, to: newStatus });
      
      toast({ title: 'Status atualizado!' });
      onRefresh();
      setConfirmConfig(prev => ({ ...prev, isOpen: false }));
    } catch (error) {
      toast({ title: 'Erro ao atualizar status', description: error.message, variant: 'destructive' });
      setConfirmConfig(prev => ({ ...prev, loading: false }));
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  return (
    <>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-full">
        {statusColumns.map(column => (
            <div 
                key={column.id} 
                onDrop={(e) => handleDrop(e, column.id)} 
                onDragOver={handleDragOver} 
                className={`rounded-lg p-3 flex flex-col h-full border ${column.bg}`}
            >
            <h3 className="font-bold text-center p-2 text-gray-700 uppercase text-sm tracking-wide mb-2 border-b border-gray-200/50">
                {column.title}
            </h3>
            
            <div className="space-y-3 flex-1 overflow-y-auto min-h-[200px]">
                {loading ? (
                <div className="p-4 bg-white rounded-lg shadow-sm animate-pulse h-24 border"></div>
                ) : (
                serviceOrders
                    .filter(order => order.status === column.id)
                    .map(order => (
                    <Card 
                        key={order.id} 
                        draggable 
                        onDragStart={(e) => handleDragStart(e, order)}
                        onClick={() => onEdit(order)}
                        className="cursor-move hover:shadow-md transition-all active:cursor-grabbing border-l-4 border-l-blue-500"
                    >
                        <CardHeader className="p-3 pb-1">
                        <CardTitle className="text-sm font-bold text-gray-800 truncate">
                            {order.title || `OS #${order.os_number}`}
                        </CardTitle>
                        <p className="text-xs text-gray-500 truncate">{order.customer_name}</p>
                        </CardHeader>
                        <CardContent className="p-3 pt-2 text-xs space-y-1.5">
                        <div className="flex justify-between items-center">
                            <span className="font-mono bg-gray-100 px-1.5 py-0.5 rounded text-gray-600">{order.vehicle_plate}</span>
                            <span className="font-bold text-blue-700">{formatCurrency(order.total_cost)}</span>
                        </div>
                        <div className="text-gray-400 flex justify-between">
                            <span>{order.technician_name || 'Sem técnico'}</span>
                            <span>{format(new Date(order.order_date), "dd/MM", { locale: ptBR })}</span>
                        </div>
                        </CardContent>
                    </Card>
                    ))
                )}
                {/* Dropzone indicator if empty */}
                {!loading && serviceOrders.filter(order => order.status === column.id).length === 0 && (
                    <div className="h-full flex items-center justify-center text-gray-400 text-xs border-2 border-dashed border-gray-200 rounded-lg">
                        Arraste para aqui
                    </div>
                )}
            </div>
            </div>
        ))}
        </div>

        <ConfirmationDialog 
            open={confirmConfig.isOpen}
            onOpenChange={(open) => !open && setConfirmConfig(prev => ({ ...prev, isOpen: false }))}
            title={confirmConfig.title}
            description={confirmConfig.description}
            onConfirm={executeMove}
            loading={confirmConfig.loading}
        />
    </>
  );
};

export default OSKanban;