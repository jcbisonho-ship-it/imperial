import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';

const ColaboradorDialog = ({ isOpen, onClose, onSaveSuccess, collaborator, mode }) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const getInitialState = () => ({
    name: '', cpf: '', phone: '', email: '', role: '',
    commission_mo_pct: '', commission_parts_pct: '',
    observations: '', status: 'ativo'
  });
  const [formData, setFormData] = useState(getInitialState());
  const [cpfError, setCpfError] = useState('');
  const [emailError, setEmailError] = useState('');

  // Responsive classes
  const INPUT_CLASS = "h-11 sm:h-9 text-base sm:text-sm";
  const BUTTON_CLASS = "w-full sm:w-auto h-11 sm:h-9 px-6 sm:px-4 text-base sm:text-sm";
  const LABEL_CLASS = "text-base sm:text-sm font-medium";

  useEffect(() => {
    if (isOpen) {
      if (mode === 'edit' && collaborator) {
        setFormData({
          name: collaborator.name || '',
          cpf: collaborator.cpf || '',
          phone: collaborator.phone || '',
          email: collaborator.email || '',
          role: collaborator.role || '',
          commission_mo_pct: collaborator.commission_mo_pct || '',
          commission_parts_pct: collaborator.commission_parts_pct || '',
          observations: collaborator.observations || '',
          status: collaborator.status || 'ativo',
        });
      } else {
        setFormData(getInitialState());
      }
      setCpfError('');
      setEmailError('');
    }
  }, [collaborator, isOpen, mode]);

  const handleChange = (e) => {
    const { id, value } = e.target;
    if (id === 'cpf') setCpfError('');
    if (id === 'email') setEmailError('');
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const handleSelectChange = (id, value) => {
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const validateCPF = async (cpf) => {
    if (!cpf) return true;
    let query = supabase.from('collaborators').select('id').eq('cpf', cpf);
    if (collaborator?.id) {
      query = query.not('id', 'eq', collaborator.id);
    }
    const { data, error } = await query;
    if (error) {
      console.error("Erro validação CPF:", error);
      return false;
    }
    if (data && data.length > 0) {
      setCpfError("Este CPF já está cadastrado.");
      return false;
    }
    return true;
  };

  const validateEmail = async (email) => {
    if (!email) return false;
    let query = supabase.from('collaborators').select('id').eq('email', email);
    if (collaborator?.id) {
      query = query.not('id', 'eq', collaborator.id);
    }
    const { data, error } = await query;
    if (error) {
      console.error("Erro validação Email:", error);
      return false;
    }
    if (data && data.length > 0) {
      setEmailError("Este email já está cadastrado.");
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    // Validate required fields
    if (!formData.email || !formData.email.trim()) {
        setEmailError("O email é obrigatório.");
        setLoading(false);
        return;
    }

    const isCpfValid = await validateCPF(formData.cpf);
    const isEmailValid = await validateEmail(formData.email);

    if (!isCpfValid || !isEmailValid) {
      setLoading(false);
      return;
    }

    // Prepare payload
    // Email is required and validated, so we send it as is.
    // CPF is optional but unique, so we send null if empty to avoid unique constraint on empty string
    const payload = {
      ...formData,
      email: formData.email.trim(),
      cpf: formData.cpf ? formData.cpf : null,
      commission_mo_pct: formData.commission_mo_pct ? parseFloat(formData.commission_mo_pct) : null,
      commission_parts_pct: formData.commission_parts_pct ? parseFloat(formData.commission_parts_pct) : null,
    };

    try {
      let result;
      if (mode === 'edit') {
        result = await supabase.from('collaborators').update(payload).eq('id', collaborator.id);
      } else {
        result = await supabase.from('collaborators').insert(payload);
      }
      
      if (result.error) throw result.error;
      
      toast({ title: `Colaborador ${mode === 'edit' ? 'atualizado' : 'criado'} com sucesso!` });
      onSaveSuccess();
      onClose();
    } catch (error) {
      console.error("Erro ao salvar:", error);
      if (error.code === '23505') { // Unique violation
        if (error.message?.includes('email')) {
          setEmailError("Este email já está em uso.");
          toast({ title: 'Erro ao salvar', description: 'O email informado já está cadastrado.', variant: 'destructive' });
        } else if (error.message?.includes('cpf')) {
          setCpfError("Este CPF já está em uso.");
          toast({ title: 'Erro ao salvar', description: 'O CPF informado já está cadastrado.', variant: 'destructive' });
        } else {
          toast({ title: 'Erro de duplicidade', description: 'Um registro com estes dados já existe.', variant: 'destructive' });
        }
      } else if (error.code === '23502') { // Not null violation
         toast({ title: 'Campos obrigatórios', description: 'O campo Email é obrigatório.', variant: 'destructive' });
      } else {
        toast({ title: 'Erro ao salvar colaborador', description: error.message, variant: 'destructive' });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-full h-full max-w-none sm:w-3/4 sm:max-w-none md:w-full md:h-full rounded-none sm:rounded-lg flex flex-col p-0 gap-0 bg-white">
        <DialogHeader className="p-4 sm:p-6 border-b flex-none">
          <DialogTitle className="text-lg sm:text-xl">{mode === 'edit' ? 'Editar' : 'Novo'} Colaborador</DialogTitle>
          <DialogDescription className="text-base sm:text-sm">Preencha os dados do colaborador.</DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          <form id="colab-form" onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><Label htmlFor="name" className={LABEL_CLASS}>Nome Completo *</Label><Input id="name" value={formData.name} onChange={handleChange} required className={INPUT_CLASS} /></div>
              <div>
                  <Label htmlFor="email" className={LABEL_CLASS}>Email *</Label>
                  <Input id="email" type="email" value={formData.email} onChange={handleChange} required className={INPUT_CLASS} />
                  {emailError && <p className="text-red-500 text-xs mt-1">{emailError}</p>}
              </div>
              <div>
                  <Label htmlFor="role" className={LABEL_CLASS}>Cargo / Função</Label>
                  <Input id="role" value={formData.role || ''} onChange={handleChange} className={INPUT_CLASS} placeholder="Ex: Mecânico" />
              </div>
              <div>
                  <Label htmlFor="cpf" className={LABEL_CLASS}>CPF</Label>
                  <Input id="cpf" value={formData.cpf} onChange={handleChange} className={INPUT_CLASS} />
                  {cpfError && <p className="text-red-500 text-xs mt-1">{cpfError}</p>}
              </div>
              <div><Label htmlFor="phone" className={LABEL_CLASS}>Telefone</Label><Input id="phone" type="tel" value={formData.phone} onChange={handleChange} className={INPUT_CLASS} /></div>
              <div>
                <Label htmlFor="commission_mo_pct" className={LABEL_CLASS}>Comissão M.O. (%)</Label>
                <Input id="commission_mo_pct" type="number" step="0.1" min="0" max="20" value={formData.commission_mo_pct} onChange={handleChange} placeholder="0-20" className={INPUT_CLASS} />
              </div>
              <div>
                <Label htmlFor="commission_parts_pct" className={LABEL_CLASS}>Comissão Peças (%)</Label>
                <Input id="commission_parts_pct" type="number" step="0.1" min="0" max="20" value={formData.commission_parts_pct} onChange={handleChange} placeholder="0-20" className={INPUT_CLASS} />
              </div>
              <div className="md:col-span-2"><Label htmlFor="observations" className={LABEL_CLASS}>Observações</Label><Textarea id="observations" value={formData.observations} onChange={handleChange} className="min-h-[100px]" /></div>
              <div>
                <Label htmlFor="status" className={LABEL_CLASS}>Status</Label>
                <Select value={formData.status} onValueChange={(v) => handleSelectChange('status', v)}>
                  <SelectTrigger className={INPUT_CLASS}><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ativo">Ativo</SelectItem>
                    <SelectItem value="inativo">Inativo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </form>
        </div>
        <DialogFooter className="p-4 sm:p-6 border-t flex-none flex-col-reverse sm:flex-row gap-3 sm:gap-2 bg-gray-50 sm:bg-white">
          <Button type="button" variant="outline" onClick={onClose} disabled={loading} className={BUTTON_CLASS}>Cancelar</Button>
          <Button type="submit" form="colab-form" disabled={loading} className={BUTTON_CLASS}>{loading ? 'Salvando...' : 'Salvar'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ColaboradorDialog;