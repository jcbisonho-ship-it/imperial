import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Helmet } from 'react-helmet';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ArrowLeft, Calendar as CalendarIcon, Loader2 } from 'lucide-react';
import { format, setHours, setMinutes, parse } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { getAvailableTimeSlots } from '@/utils/agendamentoUtils';
import { cn } from "@/lib/utils";

const NovoAgendamento = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [formData, setFormData] = useState({
    clienteId: '',
    veiculoId: '',
    servicoId: '',
    data: undefined,
    horario: '',
    observacoes: '',
  });

  const [clientes, setClientes] = useState([]);
  const [veiculos, setVeiculos] = useState([]);
  const [servicos, setServicos] = useState([]);
  const [agendamentosDoDia, setAgendamentosDoDia] = useState([]);

  const [loading, setLoading] = useState({
    clientes: true,
    servicos: true,
    veiculos: false,
    horarios: false,
    submit: false,
  });

  // Data fetching
  useEffect(() => {
    const fetchInitialData = async () => {
      const { data: clientesData, error: clientesError } = await supabase.from('customers').select('id, name');
      if (clientesError) toast({ title: 'Erro ao buscar clientes', variant: 'destructive' });
      else setClientes(clientesData);
      setLoading(p => ({ ...p, clientes: false }));

      const { data: servicosData, error: servicosError } = await supabase.from('servicos').select('id, nome, tempo_duracao_minutos');
      if (servicosError) toast({ title: 'Erro ao buscar serviços', variant: 'destructive' });
      else setServicos(servicosData);
      setLoading(p => ({ ...p, servicos: false }));
    };
    fetchInitialData();
  }, [toast]);

  // Fetch vehicles when client changes
  useEffect(() => {
    if (!formData.clienteId) {
      setVeiculos([]);
      setFormData(p => ({ ...p, veiculoId: '' }));
      return;
    }
    const fetchVehicles = async () => {
      setLoading(p => ({ ...p, veiculos: true }));
      const { data, error } = await supabase.from('vehicles').select('id, brand, model, plate').eq('customer_id', formData.clienteId);
      if (error) toast({ title: 'Erro ao buscar veículos', variant: 'destructive' });
      else setVeiculos(data);
      setLoading(p => ({ ...p, veiculos: false }));
    };
    fetchVehicles();
  }, [formData.clienteId, toast]);
  
  // Fetch existing appointments when date changes
  useEffect(() => {
    if (!formData.data) return;
    const fetchAgendamentos = async () => {
      setLoading(p => ({ ...p, horarios: true }));
      const dayStart = format(formData.data, 'yyyy-MM-dd 00:00:00');
      const dayEnd = format(formData.data, 'yyyy-MM-dd 23:59:59');
      
      const { data, error } = await supabase
        .from('agendamentos')
        .select('data_agendamento, servicos(tempo_duracao_minutos)')
        .gte('data_agendamento', dayStart)
        .lte('data_agendamento', dayEnd);
        
      if (error) toast({ title: 'Erro ao buscar horários', variant: 'destructive' });
      else setAgendamentosDoDia(data || []);
      setLoading(p => ({ ...p, horarios: false }));
    };
    fetchAgendamentos();
  }, [formData.data, toast]);

  const handleSelectChange = (name, value) => {
    setFormData(prev => ({ ...prev, [name]: value, ...(name === 'data' || name === 'servicoId' ? { horario: '' } : {}) }));
  };

  const selectedService = useMemo(() => servicos.find(s => s.id === formData.servicoId), [formData.servicoId, servicos]);

  const availableTimeSlots = useMemo(() => {
    if (!formData.data || !selectedService) return [];
    return getAvailableTimeSlots(formData.data, agendamentosDoDia, selectedService.tempo_duracao_minutos);
  }, [formData.data, selectedService, agendamentosDoDia]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { clienteId, veiculoId, servicoId, data, horario, observacoes } = formData;
    if (!clienteId || !veiculoId || !servicoId || !data || !horario) {
      toast({ title: "Preencha todos os campos obrigatórios", variant: "destructive" });
      return;
    }

    setLoading(p => ({ ...p, submit: true }));
    const [hours, minutes] = horario.split(':').map(Number);
    const dataAgendamento = setMinutes(setHours(data, hours), minutes);

    const selectedCliente = clientes.find(c => c.id === clienteId);
    const selectedVeiculo = veiculos.find(v => v.id === veiculoId);
    
    const { error } = await supabase.from('agendamentos').insert({
      cliente_id: clienteId,
      servico_id: servicoId,
      data_agendamento: dataAgendamento.toISOString(),
      nome_cliente: selectedCliente?.name,
      email_cliente: 'email@placeholder.com', // Placeholder, needs real data
      telefone_cliente: '00000000000', // Placeholder
      placa_veiculo: selectedVeiculo?.plate,
      modelo_veiculo: `${selectedVeiculo?.brand} ${selectedVeiculo?.model}`,
      status: 'pendente',
      observacoes: observacoes,
    });
    
    setLoading(p => ({ ...p, submit: false }));

    if (error) {
      toast({ title: "Erro ao criar agendamento", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Agendamento criado com sucesso!" });
      navigate('/agendamentos');
    }
  };

  return (
    <div className="container mx-auto py-8">
      <Helmet>
        <title>Novo Agendamento</title>
        <meta name="description" content="Crie um novo agendamento para serviços." />
      </Helmet>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button variant="outline" size="icon" onClick={() => navigate(-1)} type="button">
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <CardTitle>Novo Agendamento</CardTitle>
              </div>
            </div>
          </CardHeader>
          <CardContent className="grid gap-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="cliente">Cliente *</Label>
                <Select name="clienteId" onValueChange={value => handleSelectChange('clienteId', value)} disabled={loading.clientes}>
                  <SelectTrigger><SelectValue placeholder={loading.clientes ? "Carregando..." : "Selecione um cliente"} /></SelectTrigger>
                  <SelectContent>
                    {clientes.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="veiculo">Veículo *</Label>
                <Select name="veiculoId" onValueChange={value => handleSelectChange('veiculoId', value)} disabled={!formData.clienteId || loading.veiculos}>
                  <SelectTrigger><SelectValue placeholder={loading.veiculos ? "Carregando..." : "Selecione um veículo"} /></SelectTrigger>
                  <SelectContent>
                    {veiculos.map(v => <SelectItem key={v.id} value={v.id}>{`${v.brand} ${v.model} (${v.plate})`}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="space-y-2">
                <Label htmlFor="servico">Serviço *</Label>
                <Select name="servicoId" onValueChange={value => handleSelectChange('servicoId', value)} disabled={loading.servicos}>
                  <SelectTrigger><SelectValue placeholder={loading.servicos ? "Carregando..." : "Selecione um serviço"} /></SelectTrigger>
                  <SelectContent>
                    {servicos.map(s => <SelectItem key={s.id} value={s.id}>{`${s.nome} (${s.tempo_duracao_minutos} min)`}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="data">Data do Agendamento *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !formData.data && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.data ? format(formData.data, "PPP", { locale: ptBR }) : <span>Escolha uma data</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={formData.data}
                      onSelect={value => handleSelectChange('data', value)}
                      initialFocus
                      locale={ptBR}
                      disabled={(date) => date < new Date(new Date().setHours(0,0,0,0)) || date.getDay() === 0 || date.getDay() === 6}
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <Label htmlFor="horario">Horário *</Label>
                 <Select name="horario" value={formData.horario} onValueChange={value => handleSelectChange('horario', value)} disabled={!formData.data || !formData.servicoId || loading.horarios}>
                  <SelectTrigger><SelectValue placeholder={loading.horarios ? "Verificando..." : "Selecione um horário"} /></SelectTrigger>
                  <SelectContent>
                    {availableTimeSlots.length > 0 ? (
                      availableTimeSlots.map(slot => <SelectItem key={slot} value={slot}>{slot}</SelectItem>)
                    ) : (
                      <SelectItem value="no-slots" disabled>Nenhum horário disponível</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="observacoes">Observações</Label>
              <Textarea id="observacoes" placeholder="Adicione qualquer observação relevante aqui..." value={formData.observacoes} onChange={e => setFormData(p => ({...p, observacoes: e.target.value}))}/>
            </div>
          </CardContent>
          <CardFooter className="flex justify-end">
            <Button type="submit" disabled={loading.submit}>
              {loading.submit && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar Agendamento
            </Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  );
};

export default NovoAgendamento;