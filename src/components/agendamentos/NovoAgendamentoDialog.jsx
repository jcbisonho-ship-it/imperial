import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarPlus as CalendarIcon, Loader2, Search, User, Check, X } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import TimeSlotPicker from '@/components/agendamentos/TimeSlotPicker';
import { useDebounce } from '@/hooks/useDebounce';

const NovoAgendamentoDialog = ({ isOpen, onClose, onSave, agendamento }) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [servicos, setServicos] = useState([]);
  
  // Customer Search State (now tied to nome_cliente)
  const [customerSuggestions, setCustomerSuggestions] = useState([]);
  const [isSearchingCustomer, setIsSearchingCustomer] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const nameInputRef = useRef(null);

  const debouncedCustomerName = useDebounce(nameInputRef.current?.value || '', 300);

  const [formData, setFormData] = useState({
    cliente_id: null,
    nome_cliente: '',
    email_cliente: '',
    telefone_cliente: '',
    modelo_veiculo: '',
    placa_veiculo: '',
    servico_id: '',
    data_agendamento: null,
    observacoes: '',
    status: 'pendente',
  });

  useEffect(() => {
    async function fetchServicos() {
      const { data, error } = await supabase.from('servicos').select('*');
      if (error) {
        toast({ title: 'Erro ao buscar serviços', description: error.message, variant: 'destructive' });
      } else {
        setServicos(data);
      }
    }
    fetchServicos();
  }, [toast]);

  // Customer Search Effect
  useEffect(() => {
    async function searchCustomers() {
      const currentName = formData.nome_cliente;
      if (!currentName || currentName.length < 3 || formData.cliente_id) { // Don't search if already linked
        setCustomerSuggestions([]);
        setShowSuggestions(false);
        return;
      }

      setIsSearchingCustomer(true);
      const { data, error } = await supabase
        .from('customers')
        .select('id, name, email, phone, vehicles(id, brand, model, plate)')
        .ilike('name', `%${currentName}%`)
        .limit(5);

      if (!error && data) {
        setCustomerSuggestions(data);
        setShowSuggestions(data.length > 0);
      } else {
        setCustomerSuggestions([]);
        setShowSuggestions(false);
      }
      setIsSearchingCustomer(false);
    }

    if (debouncedCustomerName && debouncedCustomerName === formData.nome_cliente) {
        searchCustomers();
    }
  }, [debouncedCustomerName, formData.nome_cliente, formData.cliente_id]);


  useEffect(() => {
    if (agendamento) {
      setFormData({
        ...agendamento,
        cliente_id: agendamento.cliente_id || null,
        data_agendamento: agendamento.data_agendamento ? new Date(agendamento.data_agendamento) : null
      });
    } else {
      setFormData({
        cliente_id: null,
        nome_cliente: '',
        email_cliente: '',
        telefone_cliente: '',
        modelo_veiculo: '',
        placa_veiculo: '',
        servico_id: '',
        data_agendamento: null,
        observacoes: '',
        status: 'pendente',
      });
    }
    setCustomerSuggestions([]); // Clear suggestions on dialog open/close
    setShowSuggestions(false);
  }, [agendamento, isOpen]);

  const handleDateSelect = (date) => {
    setFormData(prev => ({...prev, data_agendamento: date}));
  }

  const handleTimeSelect = (timeString) => {
    if (!formData.data_agendamento) return;
    
    const [hours, minutes] = timeString.split(':').map(Number);
    const newDate = new Date(formData.data_agendamento);
    newDate.setHours(hours);
    newDate.setMinutes(minutes);
    newDate.setSeconds(0);
    newDate.setMilliseconds(0);

    setFormData(prev => ({...prev, data_agendamento: newDate}));
  };

  const handleSelectCustomer = (customer) => {
    setFormData(prev => ({
      ...prev,
      cliente_id: customer.id,
      nome_cliente: customer.name,
      email_cliente: customer.email || '',
      telefone_cliente: customer.phone || '',
      // Optionally pre-fill vehicle if they have only one
      modelo_veiculo: customer.vehicles?.[0] ? `${customer.vehicles[0].brand} ${customer.vehicles[0].model}` : prev.modelo_veiculo,
      placa_veiculo: customer.vehicles?.[0] ? customer.vehicles[0].plate : prev.placa_veiculo,
    }));
    setCustomerSuggestions([]);
    setShowSuggestions(false);
    toast({ title: 'Cliente selecionado', description: 'Dados preenchidos automaticamente.' });
  };

  const handleClearCustomer = () => {
    setFormData(prev => ({
        ...prev,
        cliente_id: null,
        nome_cliente: '',
        email_cliente: '',
        telefone_cliente: '',
        modelo_veiculo: '',
        placa_veiculo: '',
    }));
    setCustomerSuggestions([]);
    setShowSuggestions(false);
  };

  const handleNomeClienteChange = (e) => {
    const value = e.target.value;
    setFormData(prev => ({ ...prev, nome_cliente: value }));
    // If user starts typing after a customer was selected, clear the linked customer
    if (formData.cliente_id && value !== formData.nome_cliente) {
        setFormData(prev => ({ ...prev, cliente_id: null }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    
    if (!formData.data_agendamento) {
        toast({ title: "Erro", description: "Selecione a data e hora do agendamento.", variant: "destructive" });
        setLoading(false);
        return;
    }

    const submissionData = {
      ...formData,
      placa_veiculo: formData.placa_veiculo ? formData.placa_veiculo.toUpperCase() : null
    };

    // Clean up related objects
    delete submissionData.servicos;

    try {
      const { error } = agendamento?.id 
        ? await supabase.from('agendamentos').update(submissionData).eq('id', agendamento.id)
        : await supabase.from('agendamentos').insert([submissionData]);

      if (error) throw error;
      
      toast({ title: 'Sucesso!', description: `Agendamento ${agendamento?.id ? 'atualizado' : 'criado'} com sucesso.` });
      if(onSave) onSave();
      onClose(); // Close dialog on success

    } catch (error) {
      toast({ title: `Erro ao ${agendamento?.id ? 'atualizar' : 'criar'} agendamento`, description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };
  
  const selectedService = servicos.find(s => s.id === formData.servico_id);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-xl overflow-y-auto max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>{agendamento ? 'Editar Agendamento' : 'Novo Agendamento'}</DialogTitle>
          <DialogDescription>Preencha os detalhes para o agendamento do serviço.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          
          {formData.cliente_id && (
              <div className="flex items-center justify-between bg-green-50 border border-green-200 p-2 rounded-md text-sm text-green-800 mb-2">
                  <div className="flex items-center gap-2">
                      <Check className="w-4 h-4" />
                      <span className="font-medium">Cliente vinculado: {formData.nome_cliente}</span>
                  </div>
                  {!agendamento && (
                      <Button type="button" variant="ghost" size="sm" className="h-6 text-green-800 hover:text-green-900 hover:bg-green-100" onClick={handleClearCustomer}>
                          <X className="w-4 h-4 mr-1"/> Desvincular
                      </Button>
                  )}
              </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2 relative">
              <Label htmlFor="nome_cliente">Nome do Cliente</Label>
              <Input 
                id="nome_cliente" 
                ref={nameInputRef}
                value={formData.nome_cliente} 
                onChange={handleNomeClienteChange} 
                onFocus={() => { if(!formData.cliente_id && formData.nome_cliente.length >= 3) setShowSuggestions(true); }}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 100)} // Delay to allow click on suggestion
                required 
                className={formData.cliente_id ? 'bg-gray-50' : ''}
              />
              {isSearchingCustomer && (
                <Loader2 className="absolute right-3 top-1/2 mt-3 -translate-y-1/2 h-4 w-4 animate-spin text-gray-400" />
              )}
              
              {showSuggestions && customerSuggestions.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-1 bg-white rounded-md shadow-lg border z-50 max-h-48 overflow-y-auto">
                  {customerSuggestions.map((customer) => (
                    <div 
                      key={customer.id}
                      className="p-3 hover:bg-gray-50 cursor-pointer border-b last:border-0 flex items-center gap-3"
                      onMouseDown={() => handleSelectCustomer(customer)} // Use onMouseDown to trigger before onBlur
                    >
                      <div className="bg-blue-100 p-2 rounded-full text-blue-600">
                          <User className="h-4 w-4" />
                      </div>
                      <div>
                          <p className="font-medium text-sm">{customer.name}</p>
                          <p className="text-xs text-gray-500">{customer.email} • {customer.phone}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="telefone_cliente">Telefone</Label>
              <Input id="telefone_cliente" value={formData.telefone_cliente} onChange={(e) => setFormData({...formData, telefone_cliente: e.target.value})} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="email_cliente">Email</Label>
            <Input id="email_cliente" type="email" value={formData.email_cliente} onChange={(e) => setFormData({...formData, email_cliente: e.target.value})} required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="modelo_veiculo">Modelo do Veículo</Label>
              <Input id="modelo_veiculo" value={formData.modelo_veiculo} onChange={(e) => setFormData({...formData, modelo_veiculo: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="placa_veiculo">Placa</Label>
              <Input id="placa_veiculo" value={formData.placa_veiculo} onChange={(e) => setFormData({...formData, placa_veiculo: e.target.value})} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="servico_id">Serviço</Label>
            <Select onValueChange={(value) => setFormData({...formData, servico_id: value})} value={formData.servico_id}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um serviço" />
              </SelectTrigger>
              <SelectContent>
                {servicos.map(servico => (
                  <SelectItem key={servico.id} value={servico.id}>{servico.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label>Data e Hora</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start text-left font-normal">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {formData.data_agendamento ? format(formData.data_agendamento, "PPP 'às' HH:mm", { locale: ptBR }) : <span>Escolha uma data e hora</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={formData.data_agendamento}
                  onSelect={handleDateSelect}
                  disabled={(date) => date < new Date().setHours(0,0,0,0)} // Disable past days
                  initialFocus
                />
                <div className="p-4 border-t border-border w-[320px]">
                  <p className="mb-2 text-sm font-medium">Horários Disponíveis:</p>
                  <TimeSlotPicker 
                     selectedDate={formData.data_agendamento} 
                     onTimeSelect={handleTimeSelect}
                     service={selectedService}
                     currentSelectedTime={formData.data_agendamento ? format(formData.data_agendamento, 'HH:mm') : null}
                  />
                </div>
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label htmlFor="observacoes">Observações</Label>
            <Textarea id="observacoes" value={formData.observacoes || ''} onChange={(e) => setFormData({...formData, observacoes: e.target.value})} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {agendamento ? 'Salvar Alterações' : 'Salvar Agendamento'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default NovoAgendamentoDialog;