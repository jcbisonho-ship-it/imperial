import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { format, parseISO } from 'date-fns';

const getInitialFormData = () => ({
    customer_id: '',
    vehicle_id: '',
    technician_id: '',
    title: '',
    description: '',
    status: 'pending',
    priority: 'medium',
    order_date: format(new Date(), 'yyyy-MM-dd'),
    scheduled_date: '',
    completed_date: '',
    notes: '',
});

const ServiceOrderDialog = ({ isOpen, onClose, onSave, serviceOrder, customers = [], vehicles = [], collaborators = [] }) => {
  const { toast } = useToast();
  const [formData, setFormData] = useState(getInitialFormData());

  useEffect(() => {
    if (isOpen) {
      if (serviceOrder) {
        setFormData({
            id: serviceOrder.id,
            customer_id: serviceOrder.customer_id || '',
            vehicle_id: serviceOrder.vehicle_id || '',
            technician_id: serviceOrder.technician_id || '',
            title: serviceOrder.title || '',
            description: serviceOrder.description || '',
            status: serviceOrder.status || 'pending',
            priority: serviceOrder.priority || 'medium',
            order_date: serviceOrder.order_date ? format(parseISO(serviceOrder.order_date), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
            scheduled_date: serviceOrder.scheduled_date ? format(parseISO(serviceOrder.scheduled_date), 'yyyy-MM-dd') : '',
            completed_date: serviceOrder.completed_date ? format(parseISO(serviceOrder.completed_date), 'yyyy-MM-dd') : '',
            notes: serviceOrder.notes || '',
        });
      } else {
        setFormData(getInitialFormData());
      }
    }
  }, [isOpen, serviceOrder]);

  const customerVehicles = useMemo(() => {
    if (!formData.customer_id || !vehicles) {
      return [];
    }
    return vehicles.filter(v => v.customer_id === formData.customer_id);
  }, [formData.customer_id, vehicles]);

  const handleChange = useCallback((e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  }, []);

  const handleSelectChange = useCallback((name, value) => {
    setFormData(prev => {
      if (name === 'customer_id' && prev.customer_id !== value) {
        return { ...prev, customer_id: value, vehicle_id: '' };
      }
      return { ...prev, [name]: value };
    });
  }, []);

  const handleSave = () => {
    if (!formData.customer_id || !formData.vehicle_id || !formData.title) {
      toast({ title: "Campos obrigatórios", description: "Cliente, Veículo e Título são obrigatórios.", variant: "destructive" });
      return;
    }
    
    const dataToSave = { ...formData };
    if (!dataToSave.scheduled_date) dataToSave.scheduled_date = null;
    if (!dataToSave.completed_date) dataToSave.completed_date = null;
    if (!dataToSave.technician_id) dataToSave.technician_id = null;

    onSave(dataToSave);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{serviceOrder ? 'Editar Ordem de Serviço' : 'Nova Ordem de Serviço'}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4 sm:grid-cols-2 md:grid-cols-3">
            <div className="space-y-2">
                <Label htmlFor="customer_id">Cliente *</Label>
                <Select name="customer_id" value={formData.customer_id} onValueChange={(value) => handleSelectChange('customer_id', value)}>
                    <SelectTrigger><SelectValue placeholder="Selecione um cliente" /></SelectTrigger>
                    <SelectContent>{(customers || []).map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
            </div>
            <div className="space-y-2">
                <Label htmlFor="vehicle_id">Veículo *</Label>
                <Select name="vehicle_id" value={formData.vehicle_id} onValueChange={(value) => handleSelectChange('vehicle_id', value)} disabled={!formData.customer_id}>
                    <SelectTrigger><SelectValue placeholder="Selecione um veículo" /></SelectTrigger>
                    <SelectContent>{customerVehicles.map(v => <SelectItem key={v.id} value={v.id}>{`${v.model} - ${v.plate}`}</SelectItem>)}</SelectContent>
                </Select>
            </div>
            <div className="space-y-2">
                <Label htmlFor="technician_id">Técnico Responsável</Label>
                <Select name="technician_id" value={formData.technician_id || ''} onValueChange={(value) => handleSelectChange('technician_id', value)}>
                    <SelectTrigger><SelectValue placeholder="Selecione um técnico" /></SelectTrigger>
                    <SelectContent>{(collaborators || []).map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
            </div>
            <div className="space-y-2 sm:col-span-2 md:col-span-3">
                <Label htmlFor="title">Título do Serviço *</Label>
                <Input id="title" name="title" value={formData.title} onChange={handleChange} placeholder="Ex: Troca de óleo e filtros" />
            </div>
            <div className="space-y-2 sm:col-span-2 md:col-span-3">
                <Label htmlFor="description">Descrição do Problema / Solicitação</Label>
                <Textarea id="description" name="description" value={formData.description} onChange={handleChange} placeholder="Descreva o problema relatado pelo cliente..." />
            </div>
            <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select name="status" value={formData.status} onValueChange={(value) => handleSelectChange('status', value)}>
                    <SelectTrigger><SelectValue placeholder="Selecione o status" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="pending">Pendente</SelectItem>
                        <SelectItem value="in_progress">Em Andamento</SelectItem>
                        <SelectItem value="awaiting_payment">Aguardando Pagamento</SelectItem>
                        <SelectItem value="completed">Concluída</SelectItem>
                        <SelectItem value="canceled">Cancelada</SelectItem>
                    </SelectContent>
                </Select>
            </div>
            <div className="space-y-2">
                <Label htmlFor="priority">Prioridade</Label>
                <Select name="priority" value={formData.priority} onValueChange={(value) => handleSelectChange('priority', value)}>
                    <SelectTrigger><SelectValue placeholder="Selecione a prioridade" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="low">Baixa</SelectItem>
                        <SelectItem value="medium">Média</SelectItem>
                        <SelectItem value="high">Alta</SelectItem>
                    </SelectContent>
                </Select>
            </div>
            <div className="space-y-2">
                <Label htmlFor="order_date">Data da Ordem</Label>
                <Input id="order_date" name="order_date" type="date" value={formData.order_date} onChange={handleChange} />
            </div>
            <div className="space-y-2">
                <Label htmlFor="scheduled_date">Data de Agendamento</Label>
                <Input id="scheduled_date" name="scheduled_date" type="date" value={formData.scheduled_date} onChange={handleChange} />
            </div>
            <div className="space-y-2">
                <Label htmlFor="completed_date">Data de Conclusão</Label>
                <Input id="completed_date" name="completed_date" type="date" value={formData.completed_date} onChange={handleChange} />
            </div>
            <div className="space-y-2 sm:col-span-2 md:col-span-3">
                <Label htmlFor="notes">Notas Internas</Label>
                <Textarea id="notes" name="notes" value={formData.notes} onChange={handleChange} placeholder="Observações para a equipe..." />
            </div>
        </div>
        <DialogFooter>
          <DialogClose asChild><Button type="button" variant="outline">Cancelar</Button></DialogClose>
          <Button onClick={handleSave}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ServiceOrderDialog;