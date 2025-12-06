import React, { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { useDebounce } from '@/hooks/useDebounce';
import { logAuditEvent } from '@/lib/audit';

const getInitialState = (customer) => ({
  name: customer?.name || '',
  cpf: customer?.cpf || '',
  phone: customer?.phone || '',
  email: customer?.email || '',
  cep: customer?.cep || '',
  street: customer?.street || '',
  number: customer?.number || '',
  complement: customer?.complement || '',
  neighborhood: customer?.neighborhood || '',
  city: customer?.city || '',
  state: customer?.state || '',
  observations: customer?.observations || ''
});

const ClienteDialog = ({ isOpen, onClose, onSaveSuccess, customer, user }) => {
  const { toast } = useToast();
  const [formData, setFormData] = useState(getInitialState(customer));
  const [isSaving, setIsSaving] = useState(false);
  const [cepError, setCepError] = useState('');
  
  const debouncedCep = useDebounce(formData.cep, 500);

  useEffect(() => {
    setFormData(getInitialState(customer));
  }, [customer, isOpen]);

  const fetchAddressFromCep = useCallback(async (cep) => {
    if (cep.length !== 8) {
      setCepError('');
      return;
    }
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = await response.json();
      if (data.erro) {
        setCepError('CEP não encontrado.');
      } else {
        setFormData(prev => ({
          ...prev,
          street: data.logradouro,
          neighborhood: data.bairro,
          city: data.localidade,
          state: data.uf,
        }));
        setCepError('');
      }
    } catch (error) {
      setCepError('Erro ao buscar CEP.');
    }
  }, []);

  useEffect(() => {
    if (debouncedCep) {
      fetchAddressFromCep(debouncedCep.replace(/\D/g, ''));
    }
  }, [debouncedCep, fetchAddressFromCep]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  const validateCPF = async (cpf) => {
    if (!cpf) return true;
    const query = supabase.from('customers').select('id').eq('cpf', cpf);
    if(customer?.id) {
        query.neq('id', customer.id);
    }
    const { data, error } = await query;
    if (error) {
        toast({ title: 'Erro de validação', description: error.message, variant: 'destructive' });
        return false;
    }
    if (data.length > 0) {
        toast({ title: 'CPF duplicado', description: 'Este CPF já está cadastrado no sistema.', variant: 'destructive' });
        return false;
    }
    return true;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.phone) {
      toast({ title: 'Campos obrigatórios', description: 'Nome e Telefone são obrigatórios.', variant: 'destructive' });
      return;
    }

    if (!(await validateCPF(formData.cpf))) return;

    setIsSaving(true);
    try {
      const payload = { ...formData, cpf: formData.cpf || null, email: formData.email || null };
      
      let response;
      if (customer?.id) {
        response = await supabase.from('customers').update(payload).eq('id', customer.id).select().single();
        if (response.error) throw response.error;
        await logAuditEvent(user.id, 'update_customer', { customerId: response.data.id, changes: payload });
        toast({ title: `Cliente atualizado!`, description: 'Os dados foram salvos com sucesso.' });
      } else {
        response = await supabase.from('customers').insert(payload).select().single();
        if (response.error) throw response.error;
        await logAuditEvent(user.id, 'create_customer', { customerId: response.data.id, name: response.data.name });
        toast({ title: `Cliente cadastrado!`, description: 'Os dados foram salvos com sucesso.' });
      }

      onSaveSuccess();
      onClose();
    } catch (error) {
      toast({ title: `Erro ao salvar cliente`, description: error.message, variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{customer ? 'Editar Cliente' : 'Novo Cliente'}</DialogTitle>
          <DialogDescription>Preencha os dados do cliente abaixo.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} id="customer-form">
          <div className="grid gap-4 py-4 sm:grid-cols-2 md:grid-cols-3">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="name">Nome Completo *</Label>
              <Input id="name" name="name" value={formData.name} onChange={handleChange} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cpf">CPF</Label>
              <Input id="cpf" name="cpf" value={formData.cpf} onChange={handleChange} placeholder="000.000.000-00"/>
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Telefone / WhatsApp *</Label>
              <Input id="phone" name="phone" value={formData.phone} onChange={handleChange} required />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" value={formData.email} onChange={handleChange} />
            </div>
            <div className="space-y-2 md:col-span-3"><hr/></div>
            <div className="space-y-2">
              <Label htmlFor="cep">CEP</Label>
              <Input id="cep" name="cep" value={formData.cep} onChange={handleChange} />
              {cepError && <p className="text-xs text-red-500">{cepError}</p>}
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="street">Rua / Logradouro</Label>
              <Input id="street" name="street" value={formData.street} onChange={handleChange} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="number">Número</Label>
              <Input id="number" name="number" value={formData.number} onChange={handleChange} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="complement">Complemento</Label>
              <Input id="complement" name="complement" value={formData.complement} onChange={handleChange} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="neighborhood">Bairro</Label>
              <Input id="neighborhood" name="neighborhood" value={formData.neighborhood} onChange={handleChange} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="city">Cidade</Label>
              <Input id="city" name="city" value={formData.city} onChange={handleChange} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="state">Estado</Label>
              <Input id="state" name="state" value={formData.state} onChange={handleChange} />
            </div>
             <div className="space-y-2 md:col-span-3">
              <Label htmlFor="observations">Observações</Label>
              <Textarea id="observations" name="observations" value={formData.observations} onChange={handleChange} placeholder="Informações adicionais sobre o cliente..."/>
            </div>
          </div>
        </form>
         <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" form="customer-form" disabled={isSaving}>{isSaving ? 'Salvando...' : 'Salvar Cliente'}</Button>
          </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ClienteDialog;