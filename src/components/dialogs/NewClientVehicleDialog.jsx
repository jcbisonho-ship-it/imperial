import React, { useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { Search } from 'lucide-react';

const NewClientVehicleDialog = ({ isOpen, onClose, onSave }) => {
  const [customerData, setCustomerData] = useState({ name: '', cpf: '', phone: '', email: '' });
  const [vehicleData, setVehicleData] = useState({ plate: '', brand: '', model: '', year: '', color: '' });
  const [isFetchingPlate, setIsFetchingPlate] = useState(false);
  const { toast } = useToast();

  // Responsive classes
  const INPUT_CLASS = "h-11 sm:h-9 text-base sm:text-sm";
  const BUTTON_CLASS = "w-full sm:w-auto h-11 sm:h-9 px-6 sm:px-4 text-base sm:text-sm";
  const LABEL_CLASS = "text-base sm:text-sm font-medium";

  const handleCustomerChange = (e) => {
    setCustomerData({ ...customerData, [e.target.id]: e.target.value });
  };
  
  const handleVehicleChange = (e) => {
    const { id, value } = e.target;
    setVehicleData({ ...vehicleData, [id]: id === 'plate' ? value.toUpperCase() : value });
  };

  const isPlateValid = (plate) => /^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$/.test(plate.toUpperCase());

  const handlePlateLookup = useCallback(async () => {
    if (!isPlateValid(vehicleData.plate)) {
       toast({ title: "Placa inválida", description: "Use o formato ABC1D23.", variant: "destructive" });
       return;
    }

    setIsFetchingPlate(true);
    try {
      const { data, error } = await supabase.functions.invoke('vehicle-lookup', {
        body: JSON.stringify({ plate: vehicleData.plate }),
      });

      if (error) throw new Error(error.message);
      
      if (data && data.success) {
        setVehicleData(prev => ({
          ...prev,
          brand: data.data.marca || '',
          model: data.data.modelo || '',
          year: data.data.anoModelo || '',
          color: data.data.cor || '',
        }));
        toast({ title: "Veículo Encontrado!", description: "Dados preenchidos." });
      } else {
        toast({ title: "Veículo não encontrado", description: data.error || "A placa não retornou resultados.", variant: "destructive" });
      }
    } catch (err) {
      toast({ title: "Erro ao consultar placa", description: "Verifique a placa e tente novamente.", variant: "destructive" });
    } finally {
      setIsFetchingPlate(false);
    }
  }, [vehicleData.plate, toast]);
  
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!customerData.name || !customerData.cpf || !vehicleData.plate || !vehicleData.brand || !vehicleData.model) {
      toast({ title: "Campos obrigatórios", description: "Preencha todos os campos com *.", variant: "destructive" });
      return;
    }
    onSave({ customerData, vehicleData });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-full h-full max-w-none sm:w-3/4 sm:max-w-none md:w-full md:h-full rounded-none sm:rounded-lg flex flex-col p-0 gap-0 bg-white">
        <DialogHeader className="p-4 sm:p-6 border-b flex-none">
          <DialogTitle className="text-lg sm:text-xl">Novo Cliente e Veículo</DialogTitle>
          <DialogDescription className="text-base sm:text-sm">Cadastre um novo cliente e seu veículo de forma rápida.</DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          <form id="new-cv-form" onSubmit={handleSubmit} className="space-y-6">
            <div>
              <h4 className="font-medium text-gray-800 mb-2">Dados do Cliente</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1"><Label className={LABEL_CLASS}>Nome Completo *</Label><Input id="name" type="text" required value={customerData.name} onChange={handleCustomerChange} className={INPUT_CLASS} /></div>
                <div className="space-y-1"><Label className={LABEL_CLASS}>CPF *</Label><Input id="cpf" type="text" required value={customerData.cpf} onChange={handleCustomerChange} maxLength={11} className={INPUT_CLASS} /></div>
                <div className="space-y-1"><Label className={LABEL_CLASS}>Telefone</Label><Input id="phone" type="tel" value={customerData.phone} onChange={handleCustomerChange} maxLength={11} className={INPUT_CLASS} /></div>
                <div className="space-y-1"><Label className={LABEL_CLASS}>Email</Label><Input id="email" type="email" value={customerData.email} onChange={handleCustomerChange} className={INPUT_CLASS} /></div>
              </div>
            </div>
            <div className="pt-4 border-t">
              <h4 className="font-medium text-gray-800 mb-2">Dados do Veículo</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className={LABEL_CLASS}>Placa *</Label>
                  <div className="relative">
                    <Input id="plate" value={vehicleData.plate} onChange={handleVehicleChange} required placeholder="ABC1D23" maxLength={7} className={INPUT_CLASS} />
                    <Button type="button" size="icon" variant="ghost" className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8" onClick={handlePlateLookup} disabled={isFetchingPlate || !isPlateValid(vehicleData.plate)}>
                      {isFetchingPlate ? <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-blue-600"></div> : <Search className="h-4 w-4 text-gray-500" />}
                    </Button>
                  </div>
                </div>
                <div className="space-y-1"><Label className={LABEL_CLASS}>Marca *</Label><Input id="brand" required value={vehicleData.brand} onChange={handleVehicleChange} className={INPUT_CLASS} /></div>
                <div className="space-y-1"><Label className={LABEL_CLASS}>Modelo *</Label><Input id="model" required value={vehicleData.model} onChange={handleVehicleChange} className={INPUT_CLASS} /></div>
                <div className="space-y-1"><Label className={LABEL_CLASS}>Ano</Label><Input id="year" value={vehicleData.year} onChange={handleVehicleChange} className={INPUT_CLASS} /></div>
                <div className="md:col-span-2 space-y-1"><Label className={LABEL_CLASS}>Cor</Label><Input id="color" value={vehicleData.color} onChange={handleVehicleChange} className={INPUT_CLASS} /></div>
              </div>
            </div>
          </form>
        </div>
        <DialogFooter className="p-4 sm:p-6 border-t flex-none flex-col-reverse sm:flex-row gap-3 sm:gap-2 bg-gray-50 sm:bg-white">
            <Button type="button" variant="outline" onClick={onClose} className={BUTTON_CLASS}>Cancelar</Button>
            <Button type="submit" form="new-cv-form" className={BUTTON_CLASS}>Cadastrar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default NewClientVehicleDialog;