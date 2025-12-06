import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { logAuditEvent } from '@/lib/audit';
import { v4 as uuidv4 } from 'uuid';
import { Car, Loader2 } from 'lucide-react';

const getInitialState = (vehicle) => ({
  plate: vehicle?.plate || '',
  model: vehicle?.model || '',
  brand: vehicle?.brand || '',
  year: vehicle?.year || '',
  color: vehicle?.color || '',
  observations: vehicle?.observations || '',
  customer_id: vehicle?.customer_id || '',
});

const VeiculoDialog = ({ isOpen, onClose, onSaveSuccess, vehicle, customer, customers = [], user }) => {
  const [formData, setFormData] = useState(getInitialState(vehicle));
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [customersList, setCustomersList] = useState(customers);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const { toast } = useToast();

  // Responsive classes
  const INPUT_CLASS = "h-11 sm:h-9 text-base sm:text-sm";
  const BUTTON_CLASS = "w-full sm:w-auto h-11 sm:h-9 px-6 sm:px-4 text-base sm:text-sm";
  const LABEL_CLASS = "text-base sm:text-sm font-medium";

  useEffect(() => {
    if (isOpen) {
        const initialData = getInitialState(vehicle);
        if (customer) {
            initialData.customer_id = customer.id;
        }
        setFormData(initialData);
        setPhotoPreview(vehicle?.photo_url || null);
        setPhotoFile(null);

        // Fetch customers if not provided via props and we are not in a specific customer context
        if (!customer && customersList.length === 0) {
            fetchCustomers();
        }
    }
  }, [vehicle, customer, isOpen]);

  const fetchCustomers = async () => {
    setLoadingCustomers(true);
    try {
        const { data, error } = await supabase
            .from('customers')
            .select('id, name, cpf, cnpj')
            .order('name');
        
        if (error) throw error;
        setCustomersList(data || []);
    } catch (error) {
        console.error('Error fetching customers:', error);
        toast({ title: 'Erro', description: 'Não foi possível carregar a lista de clientes.', variant: 'destructive' });
    } finally {
        setLoadingCustomers(false);
    }
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setPhotoPreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const uploadPhoto = async (file, plate) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${plate.replace(/[^a-zA-Z0-9]/g, '')}-${uuidv4()}.${fileExt}`;
    const filePath = `vehicle-photos/${fileName}`;
    
    if (vehicle?.photo_url) {
        const oldFileName = vehicle.photo_url.split('/').pop();
        if (oldFileName) {
            await supabase.storage.from('vehicles').remove([`vehicle-photos/${oldFileName}`]);
        }
    }

    const { error: uploadError } = await supabase.storage.from('vehicles').upload(filePath, file, {
        cacheControl: '3600',
        upsert: true
    });
    if (uploadError) throw uploadError;
    
    const { data } = supabase.storage.from('vehicles').getPublicUrl(filePath);
    return data.publicUrl;
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate customer selection
      if (!formData.customer_id) {
          toast({ title: 'Cliente Obrigatório', description: 'Por favor, selecione o proprietário do veículo.', variant: 'destructive' });
          setLoading(false);
          return;
      }

      const plateQuery = supabase.from('vehicles').select('id').eq('plate', formData.plate.toUpperCase());
      if (vehicle?.id) plateQuery.neq('id', vehicle.id);
      
      const { data: plateCheck, error: plateError } = await plateQuery;
      if (plateError) throw plateError;
      if (plateCheck && plateCheck.length > 0) {
        toast({ title: 'Placa já cadastrada', description: 'A placa informada já pertence a outro veículo.', variant: 'destructive' });
        setLoading(false);
        return;
      }

      let photo_url = vehicle?.photo_url || null;
      if (photoFile) photo_url = await uploadPhoto(photoFile, formData.plate);

      const payload = { ...formData, plate: formData.plate.toUpperCase(), photo_url };
      
      let result;
      if (vehicle?.id) {
        result = await supabase.from('vehicles').update(payload).eq('id', vehicle.id).select().single();
        if (result.error) throw result.error;
        await logAuditEvent(user?.id, 'update_vehicle', { vehicleId: result.data.id, changes: payload });
        toast({ title: 'Veículo atualizado!' });
      } else {
        result = await supabase.from('vehicles').insert(payload).select().single();
        if (result.error) throw result.error;
        await logAuditEvent(user?.id, 'create_vehicle', { vehicleId: result.data.id, plate: result.data.plate, customerId: result.data.customer_id });
        toast({ title: 'Veículo cadastrado!' });
      }

      onSaveSuccess();
      onClose();
    } catch (error) {
      toast({ title: 'Erro ao salvar veículo', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-full h-full max-w-none sm:w-3/4 sm:max-w-none md:w-full md:h-full rounded-none sm:rounded-lg flex flex-col p-0 gap-0 bg-white">
        <DialogHeader className="p-4 sm:p-6 border-b flex-none">
          <DialogTitle className="text-lg sm:text-xl">{vehicle ? 'Editar Veículo' : 'Novo Veículo'}</DialogTitle>
          <DialogDescription className="text-base sm:text-sm">
            {customer ? `Para o cliente: ${customer.name}` : 'Preencha os dados do veículo e selecione o proprietário.'}
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          <form id="vehicle-form" onSubmit={handleSubmit} className="space-y-4">
            {!customer && (
              <div className="space-y-1">
                  <Label htmlFor="customer_id" className={LABEL_CLASS}>Cliente Proprietário *</Label>
                  <Select 
                    required 
                    value={formData.customer_id} 
                    onValueChange={(value) => setFormData({...formData, customer_id: value})}
                    disabled={loadingCustomers}
                  >
                      <SelectTrigger className={INPUT_CLASS}>
                        <SelectValue placeholder={loadingCustomers ? "Carregando clientes..." : "Selecione um cliente"} />
                      </SelectTrigger>
                      <SelectContent className="max-h-[200px]">
                          {customersList.map(c => (
                            <SelectItem key={c.id} value={c.id}>
                                {c.name} {c.cpf ? `(CPF: ${c.cpf})` : c.cnpj ? `(CNPJ: ${c.cnpj})` : ''}
                            </SelectItem>
                          ))}
                      </SelectContent>
                  </Select>
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1"><Label htmlFor="plate" className={LABEL_CLASS}>Placa *</Label><Input id="plate" required value={formData.plate} onChange={e => setFormData({...formData, plate: e.target.value.toUpperCase()})} className={INPUT_CLASS} placeholder="ABC1234" maxLength={7} /></div>
              <div className="space-y-1"><Label htmlFor="model" className={LABEL_CLASS}>Modelo *</Label><Input id="model" required value={formData.model} onChange={e => setFormData({...formData, model: e.target.value})} className={INPUT_CLASS} placeholder="Ex: Gol 1.0" /></div>
              <div className="space-y-1"><Label htmlFor="brand" className={LABEL_CLASS}>Marca</Label><Input id="brand" value={formData.brand} onChange={e => setFormData({...formData, brand: e.target.value})} className={INPUT_CLASS} placeholder="Ex: Volkswagen" /></div>
              <div className="space-y-1"><Label htmlFor="year" className={LABEL_CLASS}>Ano</Label><Input id="year" type="number" value={formData.year} onChange={e => setFormData({...formData, year: e.target.value})} className={INPUT_CLASS} placeholder="Ex: 2020" /></div>
              <div className="sm:col-span-2 space-y-1"><Label htmlFor="color" className={LABEL_CLASS}>Cor</Label><Input id="color" value={formData.color} onChange={e => setFormData({...formData, color: e.target.value})} className={INPUT_CLASS} placeholder="Ex: Branco" /></div>
              <div className="sm:col-span-2 space-y-1"><Label htmlFor="observations" className={LABEL_CLASS}>Observações</Label><Textarea id="observations" value={formData.observations} onChange={e => setFormData({...formData, observations: e.target.value})} className="min-h-[100px]" placeholder="Detalhes adicionais..." /></div>
              <div className="sm:col-span-2 space-y-1">
                <Label htmlFor="photo" className={LABEL_CLASS}>Foto do Veículo</Label>
                <Input id="photo" type="file" onChange={handlePhotoChange} accept="image/*" className={`${INPUT_CLASS} pt-1.5`} />
                {photoPreview ? (
                  <img src={photoPreview} alt="Pré-visualização do veículo" className="mt-2 rounded-lg max-h-40 object-cover w-full" />
                ) : (
                  <div className="mt-2 rounded-lg h-40 w-full bg-gray-100 flex items-center justify-center border border-dashed border-gray-300">
                      <Car className="w-16 h-16 text-gray-300"/>
                  </div>
                )}
              </div>
            </div>
          </form>
        </div>
        <DialogFooter className="p-4 sm:p-6 border-t flex-none flex-col-reverse sm:flex-row gap-3 sm:gap-2 bg-gray-50 sm:bg-white">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading} className={BUTTON_CLASS}>Cancelar</Button>
            <Button type="submit" form="vehicle-form" disabled={loading} className={BUTTON_CLASS}>{loading ? 'Salvando...' : 'Salvar'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default VeiculoDialog;