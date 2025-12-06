import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

const MechanicDialog = ({ isOpen, onClose, onSave, mechanic }) => {
  const [formData, setFormData] = useState({
    name: '', cpf: '', rg: '', phone: '', email: '', specialty: '', hourly_rate: '',
  });

  // Responsive classes
  const INPUT_CLASS = "h-11 sm:h-9 text-base sm:text-sm";
  const BUTTON_CLASS = "w-full sm:w-auto h-11 sm:h-9 px-6 sm:px-4 text-base sm:text-sm";
  const LABEL_CLASS = "text-base sm:text-sm font-medium";

  useEffect(() => {
    if (mechanic) {
      setFormData({
        name: mechanic.name || '', cpf: mechanic.cpf || '', rg: mechanic.rg || '', phone: mechanic.phone || '', email: mechanic.email || '', specialty: mechanic.specialty || '', hourly_rate: mechanic.hourly_rate || '',
      });
    } else {
      setFormData({ name: '', cpf: '', rg: '', phone: '', email: '', specialty: '', hourly_rate: '' });
    }
  }, [mechanic, isOpen]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-full h-full max-w-none sm:w-3/4 sm:max-w-none md:w-full md:h-full rounded-none sm:rounded-lg flex flex-col p-0 gap-0 bg-white">
        <DialogHeader className="p-4 sm:p-6 border-b flex-none">
          <DialogTitle className="text-lg sm:text-xl">{mechanic ? 'Editar Mecânico' : 'Novo Mecânico'}</DialogTitle>
          <DialogDescription className="text-base sm:text-sm">Preencha os dados do mecânico.</DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          <form id="mechanic-form" onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2"><Label className={LABEL_CLASS}>Nome Completo *</Label><Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required className={INPUT_CLASS} /></div>
              <div><Label className={LABEL_CLASS}>CPF *</Label><Input value={formData.cpf} onChange={(e) => setFormData({ ...formData, cpf: e.target.value })} required className={INPUT_CLASS} /></div>
              <div><Label className={LABEL_CLASS}>RG</Label><Input value={formData.rg} onChange={(e) => setFormData({ ...formData, rg: e.target.value })} className={INPUT_CLASS} /></div>
              <div><Label className={LABEL_CLASS}>Telefone</Label><Input type="tel" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className={INPUT_CLASS} /></div>
              <div><Label className={LABEL_CLASS}>Email *</Label><Input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} required className={INPUT_CLASS} /></div>
              <div><Label className={LABEL_CLASS}>Especialidade</Label><Input value={formData.specialty} onChange={(e) => setFormData({ ...formData, specialty: e.target.value })} className={INPUT_CLASS} /></div>
              <div><Label className={LABEL_CLASS}>Valor por Hora</Label><Input type="number" step="0.01" placeholder="Deixe em branco se não aplicável" value={formData.hourly_rate} onChange={(e) => setFormData({ ...formData, hourly_rate: e.target.value })} className={INPUT_CLASS} /></div>
            </div>
          </form>
        </div>
        <DialogFooter className="p-4 sm:p-6 border-t flex-none flex-col-reverse sm:flex-row gap-3 sm:gap-2 bg-gray-50 sm:bg-white">
            <Button type="button" variant="outline" onClick={onClose} className={BUTTON_CLASS}>Cancelar</Button>
            <Button type="submit" form="mechanic-form" className={BUTTON_CLASS}>{mechanic ? 'Atualizar' : 'Cadastrar'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default MechanicDialog;