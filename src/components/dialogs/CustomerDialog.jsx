import React, { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { logAudit } from '@/lib/audit';

const CustomerDialog = ({ isOpen, onClose, onSaveSuccess, customer }) => {
  const [formData, setFormData] = useState({ name: '', cpf: '', phone: '', email: '', observations: '', cep: '', street: '', number: '', complement: '', neighborhood: '', city: '', state: '' });
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  // Responsive classes
  const INPUT_CLASS = "h-11 sm:h-9 text-base sm:text-sm";
  const BUTTON_CLASS = "w-full sm:w-auto h-11 sm:h-9 px-6 sm:px-4 text-base sm:text-sm";
  const LABEL_CLASS = "text-base sm:text-sm font-medium";

  useEffect(() => {
    if (customer) {
      setFormData({
        name: customer.name || '', cpf: customer.cpf || '', phone: customer.phone || '', email: customer.email || '', observations: customer.observations || '', cep: customer.cep || '', street: customer.street || '', number: customer.number || '', complement: customer.complement || '', neighborhood: customer.neighborhood || '', city: customer.city || '', state: customer.state || ''
      });
    } else {
      setFormData({ name: '', cpf: '', phone: '', email: '', observations: '', cep: '', street: '', number: '', complement: '', neighborhood: '', city: '', state: '' });
    }
  }, [customer, isOpen]);

  const validateCPF = async (cpf) => {
    if (!cpf) return true;
    const { data, error } = await supabase.from('customers').select('id').eq('cpf', cpf).neq('id', customer?.id || '00000000-0000-0000-0000-000000000000');
    if (error) {
      toast({ title: 'Erro ao validar CPF', description: error.message, variant: 'destructive' });
      return false;
    }
    if (data.length > 0) {
      toast({ title: 'CPF já cadastrado', description: 'Este CPF já pertence a outro cliente.', variant: 'destructive' });
      return false;
    }
    return true;
  };

  const handleCepLookup = useCallback(async () => {
    const cep = formData.cep.replace(/\D/g, '');
    if (cep.length !== 8) return;
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = await response.json();
      if (data.erro) { toast({ title: 'CEP não encontrado', variant: 'destructive' }); return; }
      setFormData(prev => ({ ...prev, street: data.logradouro, neighborhood: data.bairro, city: data.localidade, state: data.uf }));
      toast({ title: 'Endereço preenchido!' });
    } catch (error) { toast({ title: 'Erro ao buscar CEP', description: error.message, variant: 'destructive' }); }
  }, [formData.cep, toast]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    if (!(await validateCPF(formData.cpf))) {
      setLoading(false);
      return;
    }
    
    try {
      if (customer) {
        const { data, error } = await supabase.from('customers').update(formData).eq('id', customer.id).select().single();
        if (error) throw error;
        await logAudit(user.id, 'update_customer', { customerId: data.id, changes: formData });
        toast({ title: 'Cliente atualizado com sucesso!' });
      } else {
        const { data, error } = await supabase.from('customers').insert(formData).select().single();
        if (error) throw error;
        await logAudit(user.id, 'create_customer', { customerId: data.id, name: data.name });
        toast({ title: 'Cliente cadastrado com sucesso!' });
      }
      onSaveSuccess();
      onClose();
    } catch (error) {
      toast({ title: 'Erro ao salvar cliente', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { id, value } = e.target;
    setFormData({ ...formData, [id]: value });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-full h-full max-w-none sm:w-3/4 sm:max-w-none md:w-full md:h-full rounded-none sm:rounded-lg flex flex-col p-0 gap-0 bg-white">
        <DialogHeader className="p-4 sm:p-6 border-b flex-none">
          <DialogTitle className="text-lg sm:text-xl">{customer ? 'Editar Cliente' : 'Novo Cliente'}</DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          <form id="customer-form" onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1"><Label htmlFor="name" className={LABEL_CLASS}>Nome Completo *</Label><Input id="name" required value={formData.name} onChange={handleChange} className={INPUT_CLASS} /></div>
              <div className="space-y-1"><Label htmlFor="cpf" className={LABEL_CLASS}>CPF *</Label><Input id="cpf" required value={formData.cpf} onChange={handleChange} className={INPUT_CLASS} /></div>
              <div className="space-y-1"><Label htmlFor="phone" className={LABEL_CLASS}>Telefone *</Label><Input id="phone" type="tel" required value={formData.phone} onChange={handleChange} className={INPUT_CLASS} /></div>
              <div className="space-y-1"><Label htmlFor="email" className={LABEL_CLASS}>Email</Label><Input id="email" type="email" value={formData.email} onChange={handleChange} className={INPUT_CLASS} /></div>
              <div className="md:col-span-2 space-y-1"><Label htmlFor="observations" className={LABEL_CLASS}>Observações</Label><Textarea id="observations" value={formData.observations} onChange={handleChange} className="min-h-[100px]" /></div>
            </div>
            <div className="space-y-4 pt-4 border-t">
              <h4 className="font-medium text-gray-800">Endereço</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1"><Label htmlFor="cep" className={LABEL_CLASS}>CEP</Label>
                  <div className="flex gap-2"><Input id="cep" value={formData.cep} onChange={handleChange} className={INPUT_CLASS} /><Button type="button" variant="outline" onClick={handleCepLookup} className={BUTTON_CLASS}>Buscar</Button></div>
                </div>
                <div className="md:col-span-2 space-y-1"><Label htmlFor="street" className={LABEL_CLASS}>Rua</Label><Input id="street" value={formData.street} onChange={handleChange} className={INPUT_CLASS} /></div>
                <div className="space-y-1"><Label htmlFor="number" className={LABEL_CLASS}>Número</Label><Input id="number" value={formData.number} onChange={handleChange} className={INPUT_CLASS} /></div>
                <div className="space-y-1"><Label htmlFor="neighborhood" className={LABEL_CLASS}>Bairro</Label><Input id="neighborhood" value={formData.neighborhood} onChange={handleChange} className={INPUT_CLASS} /></div>
                <div className="space-y-1"><Label htmlFor="city" className={LABEL_CLASS}>Cidade</Label><Input id="city" value={formData.city} onChange={handleChange} className={INPUT_CLASS} /></div>
              </div>
            </div>
          </form>
        </div>
        <DialogFooter className="p-4 sm:p-6 border-t flex-none flex-col-reverse sm:flex-row gap-3 sm:gap-2 bg-gray-50 sm:bg-white">
          <Button type="button" variant="outline" onClick={onClose} disabled={loading} className={BUTTON_CLASS}>Cancelar</Button>
          <Button type="submit" form="customer-form" disabled={loading} className={BUTTON_CLASS}>{loading ? 'Salvando...' : 'Salvar'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CustomerDialog;