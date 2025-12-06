import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useToast } from '@/components/ui/use-toast';
import { getServicos } from '@/api/servicosApi';
import { getAvailableTimeSlots } from '@/utils/agendamentoUtils';
import Calendar from '@/components/agendamentos/Calendar';
import TimeSlotPicker from '@/components/agendamentos/TimeSlotPicker';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Car, CheckCircle, ArrowLeft } from 'lucide-react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';

const AgendamentoPublico = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const [step, setStep] = useState(1);
  const [servicos, setServicos] = useState([]);
  const [selectedService, setSelectedService] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedTime, setSelectedTime] = useState(null);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [agendamentos, setAgendamentos] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    nome_cliente: '',
    email_cliente: '',
    telefone_cliente: '',
    placa_veiculo: '',
    modelo_veiculo: '',
    observacoes: '',
  });

  const fromApp = searchParams.get('from') === 'app';

  // Populate form data from authenticated user or URL params
  useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        nome_cliente: user.user_metadata?.full_name || prev.nome_cliente,
        email_cliente: user.email || prev.email_cliente,
      }));
    }

    // URL Params override (useful for Client Portal pre-filling)
    const name = searchParams.get('name');
    const email = searchParams.get('email');
    const phone = searchParams.get('phone');
    const plate = searchParams.get('plate');
    const model = searchParams.get('model');

    if (name || email || phone || plate || model) {
        setFormData(prev => ({
            ...prev,
            nome_cliente: name || prev.nome_cliente,
            email_cliente: email || prev.email_cliente,
            telefone_cliente: phone || prev.telefone_cliente,
            placa_veiculo: plate || prev.placa_veiculo,
            modelo_veiculo: model || prev.modelo_veiculo,
        }));
    }
  }, [user, searchParams]);

  useEffect(() => {
    const fetchServices = async () => {
      try {
        const data = await getServicos();
        setServicos(data || []);
      } catch (error) {
        toast({ title: 'Erro ao carregar serviços', variant: 'destructive' });
      }
    };
    fetchServices();
  }, [toast]);
  
  const selectedServiceDetails = useMemo(() => {
    return servicos.find(s => s.id === selectedService);
  }, [selectedService, servicos]);

  const fetchAgendamentosForDate = useCallback(async (date) => {
      if (!date) return;
      const startDate = new Date(date);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(date);
      endDate.setHours(23, 59, 59, 999);

      const { data, error } = await supabase
          .from('agendamentos')
          .select('data_agendamento, servicos(tempo_duracao_minutos)')
          .gte('data_agendamento', startDate.toISOString())
          .lte('data_agendamento', endDate.toISOString())
          .in('status', ['pendente', 'confirmado']);
      
      if (error) {
          console.error('Error fetching appointments:', error);
          toast({ title: 'Erro ao buscar horários', description: error.message, variant: 'destructive' });
          setAgendamentos([]);
      } else {
          // Defensive check: ensure data is an array
          setAgendamentos(Array.isArray(data) ? data : []);
      }
  }, [toast]);

  useEffect(() => {
    if (selectedDate) {
      fetchAgendamentosForDate(selectedDate);
    }
  }, [selectedDate, fetchAgendamentosForDate]);

  useEffect(() => {
    if (selectedDate && selectedServiceDetails) {
      setSlotsLoading(true);
      try {
        // FIX: Argument order corrected here.
        // Previous incorrect order: (date, duration, appointments) -> caused "is not iterable" on duration
        // Correct order: (date, existingAppointments, serviceDuration)
        const duration = selectedServiceDetails.tempo_duracao_minutos || 60;
        const slots = getAvailableTimeSlots(
          selectedDate, 
          agendamentos, 
          duration
        );
        setAvailableSlots(slots || []);
      } catch (err) {
        console.error("Error calculating slots:", err);
        setAvailableSlots([]);
      } finally {
        setSelectedTime(null);
        setSlotsLoading(false);
      }
    }
  }, [selectedDate, selectedServiceDetails, agendamentos]);


  const handleFormChange = (e) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const handleNextStep = () => setStep(prev => prev + 1);
  const handlePrevStep = () => setStep(prev => prev - 1);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    if (!selectedService || !selectedTime) {
      toast({ title: 'Por favor, complete todos os passos.', variant: 'destructive' });
      setIsSubmitting(false);
      return;
    }

    const data_agendamento = new Date(selectedDate);
    const [hours, minutes] = selectedTime.split(':');
    data_agendamento.setHours(parseInt(hours), parseInt(minutes), 0, 0);
    
    const { error } = await supabase.from('agendamentos').insert({
      ...formData,
      servico_id: selectedService,
      data_agendamento: data_agendamento.toISOString(),
      user_id: user?.id || null,
      status: 'pendente'
    });

    if (error) {
      toast({ title: 'Erro ao criar agendamento', description: error.message, variant: 'destructive' });
    } else {
      setStep(4); // Success step
    }
    setIsSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-4xl shadow-2xl">
        {step !== 4 && (
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                 <Car className="h-8 w-8 text-blue-600" />
                 <h1 className="text-2xl font-bold text-gray-800">Agendamento Online</h1>
              </div>
              <Button variant="ghost" onClick={() => navigate(-1)}><ArrowLeft className="mr-2 h-4 w-4"/> Voltar</Button>
            </div>
            <CardDescription>
              {step === 1 && "Selecione o serviço e a data desejada."}
              {step === 2 && "Escolha o melhor horário para você."}
              {step === 3 && "Preencha seus dados para confirmar."}
            </CardDescription>
          </CardHeader>
        )}
        <CardContent>
          {step === 1 && (
            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <Label htmlFor="servico" className="text-lg font-semibold mb-2 block">Serviço</Label>
                <Select onValueChange={setSelectedService} value={selectedService}>
                  <SelectTrigger className="w-full h-12 text-base">
                    <SelectValue placeholder="Escolha um serviço..." />
                  </SelectTrigger>
                  <SelectContent>
                    {servicos.map(s => (
                      <SelectItem key={s.id} value={s.id} className="text-base p-3">
                        <div className="flex justify-between w-full">
                          <span>{s.nome}</span>
                          <span className="text-gray-500">{s.tempo_duracao_minutos} min</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-lg font-semibold mb-2 block">Data</Label>
                <Calendar selectedDate={selectedDate} onDateChange={setSelectedDate} />
              </div>
            </div>
          )}
          {step === 2 && selectedServiceDetails && (
             <div>
                <h3 className="text-xl font-semibold mb-4">Escolha um horário</h3>
                <TimeSlotPicker 
                  // "Dumb" Mode props
                  availableSlots={availableSlots} 
                  selectedSlot={selectedTime} 
                  onSlotSelect={setSelectedTime}
                  isLoading={slotsLoading}
                  
                  // "Smart" Mode props (needed for compatibility if component was updated)
                  selectedDate={selectedDate}
                  service={selectedServiceDetails}
                  onTimeSelect={setSelectedTime}
                  currentSelectedTime={selectedTime}
                />
            </div>
          )}
          {step === 3 && (
            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                 <h3 className="text-xl font-semibold mb-2">Seus dados</h3>
                 <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label htmlFor="nome_cliente">Nome Completo</Label>
                    <Input id="nome_cliente" value={formData.nome_cliente} onChange={handleFormChange} required />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="email_cliente">E-mail</Label>
                    <Input id="email_cliente" type="email" value={formData.email_cliente} onChange={handleFormChange} required />
                  </div>
                 </div>
                 <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label htmlFor="telefone_cliente">Telefone / WhatsApp</Label>
                    <Input id="telefone_cliente" value={formData.telefone_cliente} onChange={handleFormChange} required/>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="placa_veiculo">Placa do Veículo</Label>
                    <Input id="placa_veiculo" value={formData.placa_veiculo} onChange={handleFormChange} />
                  </div>
                 </div>
                 <div className="space-y-1">
                    <Label htmlFor="modelo_veiculo">Marca/Modelo do Veículo</Label>
                    <Input id="modelo_veiculo" value={formData.modelo_veiculo} onChange={handleFormChange} />
                  </div>
                 <div className="space-y-1">
                  <Label htmlFor="observacoes">Observações</Label>
                  <Textarea id="observacoes" value={formData.observacoes} onChange={handleFormChange} placeholder="Alguma informação adicional?" />
                 </div>
              </div>
            </form>
          )}
          {step === 4 && (
            <div className="text-center p-8">
              <CheckCircle className="mx-auto h-16 w-16 text-green-500 mb-4" />
              <h2 className="text-2xl font-bold mb-2">Agendamento solicitado com sucesso!</h2>
              <p className="text-gray-600 mb-6">Você receberá um e-mail de confirmação em breve. Entraremos em contato se houver qualquer problema.</p>
              <Button onClick={() => fromApp ? navigate('/meus-agendamentos') : setStep(1)}>
                {fromApp ? 'Ver Meus Agendamentos' : 'Fazer Novo Agendamento'}
              </Button>
            </div>
          )}
        </CardContent>
        {step < 4 && (
            <CardFooter className="flex justify-between">
                <Button variant="outline" onClick={handlePrevStep} disabled={step === 1}>
                    Voltar
                </Button>
                {step < 3 ? (
                    <Button onClick={handleNextStep} disabled={(step === 1 && !selectedService) || (step === 2 && !selectedTime)}>
                        Próximo
                    </Button>
                ) : (
                    <Button type="submit" onClick={handleSubmit} disabled={isSubmitting}>
                        {isSubmitting ? 'Confirmando...' : 'Confirmar Agendamento'}
                    </Button>
                )}
            </CardFooter>
        )}
      </Card>
    </div>
  );
};

export default AgendamentoPublico;