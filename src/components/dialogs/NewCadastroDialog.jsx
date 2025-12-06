import React, { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { useDebounce } from '@/hooks/useDebounce';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Loader2, Building2, User } from 'lucide-react';

const getInitialState = (data, type) => ({
  // Common
  phone: data?.phone || '',
  email: data?.email || '',
  cep: data?.cep || '',
  street: data?.street || '',
  number: data?.number || '',
  complement: data?.complement || '',
  neighborhood: data?.neighborhood || '',
  city: data?.city || '',
  state: data?.state || '',
  observations: data?.observations || '',
  
  // Customer Specific
  customer_type: data?.customer_type || 'fisica',
  name: data?.name || '', // Nome Completo (PF) or Razão Social (PJ/Supplier)
  cpf: data?.cpf || '',
  rg: data?.rg || '', // New field for PF
  trade_name: data?.trade_name || '', // Nome Fantasia (PJ/Supplier)
  cnpj: data?.cnpj || '',
  inscricao_estadual: data?.inscricao_estadual || '', // New field for PJ and Supplier
  
  // Supplier Specific
  supply_type: data?.supply_type || '',
});

const NewCadastroDialog = ({ isOpen, onClose, onSaveSuccess, entityToEdit = null, defaultTab = 'cliente', user }) => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [formData, setFormData] = useState(getInitialState(entityToEdit, defaultTab));
  const [isSaving, setIsSaving] = useState(false);
  const [cepLoading, setCepLoading] = useState(false);
  
  const debouncedCep = useDebounce(formData.cep, 500);

  useEffect(() => {
    if (isOpen) {
        setFormData(getInitialState(entityToEdit, defaultTab));
        setActiveTab(defaultTab);
    }
  }, [isOpen, entityToEdit, defaultTab]);

  const fetchAddressFromCep = useCallback(async (cep) => {
    if (!cep || cep.length < 8) return;
    
    setCepLoading(true);
    try {
      const cleanCep = cep.replace(/\D/g, '');
      const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
      const data = await response.json();
      
      if (!data.erro) {
        setFormData(prev => ({
          ...prev,
          street: data.logradouro,
          neighborhood: data.bairro,
          city: data.localidade,
          state: data.uf,
        }));
      }
    } catch (error) {
      console.error("Erro ao buscar CEP", error);
    } finally {
      setCepLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debouncedCep) {
      fetchAddressFromCep(debouncedCep);
    }
  }, [debouncedCep, fetchAddressFromCep]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleTypeChange = (value) => {
    setFormData(prev => ({ ...prev, customer_type: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const isCustomer = activeTab === 'cliente';
      const table = isCustomer ? 'customers' : 'suppliers';
      
      if (!formData.name) {
        throw new Error(isCustomer && formData.customer_type === 'fisica' ? 'Nome Completo é obrigatório' : 'Razão Social é obrigatória');
      }
      
      const payload = {
        phone: formData.phone,
        email: formData.email,
        cep: formData.cep,
        street: formData.street,
        number: formData.number,
        complement: formData.complement,
        neighborhood: formData.neighborhood,
        city: formData.city,
        state: formData.state,
        observations: formData.observations,
        updated_at: new Date(),
      };

      if (isCustomer) {
        payload.customer_type = formData.customer_type;
        payload.name = formData.name;
        
        if (formData.customer_type === 'fisica') {
          payload.cpf = formData.cpf;
          payload.rg = formData.rg; // Add RG
          payload.cnpj = null;
          payload.trade_name = null;
          payload.inscricao_estadual = null;
        } else { // Juridica
          payload.cpf = null;
          payload.rg = null;
          payload.cnpj = formData.cnpj;
          payload.trade_name = formData.trade_name;
          payload.inscricao_estadual = formData.inscricao_estadual; // Add IE
        }
      } else { // Supplier
        payload.name = formData.name;
        payload.trade_name = formData.trade_name;
        payload.cnpj = formData.cnpj;
        payload.supply_type = formData.supply_type;
        payload.inscricao_estadual = formData.inscricao_estadual; // Add IE
      }

      let error;
      if (entityToEdit?.id) {
        const { error: updateError } = await supabase
          .from(table)
          .update(payload)
          .eq('id', entityToEdit.id);
        error = updateError;
      } else {
        payload.created_at = new Date();
        const { error: insertError } = await supabase
          .from(table)
          .insert([payload]);
        error = insertError;
      }

      if (error) throw error;

      toast({
        title: "Sucesso!",
        description: `${isCustomer ? 'Cliente' : 'Fornecedor'} salvo com sucesso.`,
      });

      onSaveSuccess?.();
      onClose();
    } catch (error) {
      console.error(error);
      toast({
        title: "Erro ao salvar",
        description: error.message || "Ocorreu um erro ao tentar salvar.",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {entityToEdit 
              ? `Editar ${activeTab === 'cliente' ? 'Cliente' : 'Fornecedor'}` 
              : 'Novo Cadastro'}
          </DialogTitle>
          <DialogDescription>
            Preencha as informações abaixo para realizar o cadastro.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={!entityToEdit ? setActiveTab : undefined} className="w-full">
          {!entityToEdit && (
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="cliente">Cliente</TabsTrigger>
              <TabsTrigger value="fornecedor">Fornecedor</TabsTrigger>
            </TabsList>
          )}

          <form id="cadastro-form" onSubmit={handleSubmit} className="space-y-4 py-2">
            
            <TabsContent value="cliente" className="space-y-4 mt-0">
              <div className="flex flex-col space-y-3">
                <Label>Tipo de Pessoa</Label>
                <RadioGroup 
                  defaultValue="fisica" 
                  value={formData.customer_type} 
                  onValueChange={handleTypeChange}
                  className="flex gap-4"
                >
                  <div className="flex items-center space-x-2 border p-3 rounded-md w-full cursor-pointer hover:bg-slate-50">
                    <RadioGroupItem value="fisica" id="pf" />
                    <Label htmlFor="pf" className="flex items-center gap-2 cursor-pointer"><User className="w-4 h-4" /> Pessoa Física</Label>
                  </div>
                  <div className="flex items-center space-x-2 border p-3 rounded-md w-full cursor-pointer hover:bg-slate-50">
                    <RadioGroupItem value="juridica" id="pj" />
                    <Label htmlFor="pj" className="flex items-center gap-2 cursor-pointer"><Building2 className="w-4 h-4" /> Pessoa Jurídica</Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {formData.customer_type === 'fisica' ? (
                  <>
                    <div className="space-y-2 sm:col-span-2">
                      <Label htmlFor="name">Nome Completo *</Label>
                      <Input id="name" name="name" value={formData.name} onChange={handleChange} placeholder="Ex: João da Silva" required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cpf">CPF</Label>
                      <Input id="cpf" name="cpf" value={formData.cpf} onChange={handleChange} placeholder="000.000.000-00" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="rg">RG</Label>
                      <Input id="rg" name="rg" value={formData.rg} onChange={handleChange} placeholder="00.000.000-0" />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="space-y-2 sm:col-span-2">
                      <Label htmlFor="name">Razão Social *</Label>
                      <Input id="name" name="name" value={formData.name} onChange={handleChange} placeholder="Ex: Empresa Silva LTDA" required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="trade_name">Nome Fantasia</Label>
                      <Input id="trade_name" name="trade_name" value={formData.trade_name} onChange={handleChange} placeholder="Ex: Silva Auto Peças" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cnpj">CNPJ</Label>
                      <Input id="cnpj" name="cnpj" value={formData.cnpj} onChange={handleChange} placeholder="00.000.000/0000-00" />
                    </div>
                    <div className="space-y-2 sm:col-span-2">
                      <Label htmlFor="inscricao_estadual">Inscrição Estadual</Label>
                      <Input id="inscricao_estadual" name="inscricao_estadual" value={formData.inscricao_estadual} onChange={handleChange} placeholder="Isento ou número da IE" />
                    </div>
                  </>
                )}
              </div>
            </TabsContent>

            <TabsContent value="fornecedor" className="space-y-4 mt-0">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="fornecedor_name">Razão Social *</Label>
                  <Input id="fornecedor_name" name="name" value={formData.name} onChange={handleChange} placeholder="Ex: Distribuidora de Peças LTDA" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fornecedor_trade">Nome Fantasia</Label>
                  <Input id="fornecedor_trade" name="trade_name" value={formData.trade_name} onChange={handleChange} placeholder="Ex: Distribuidora Silva" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fornecedor_cnpj">CNPJ</Label>
                  <Input id="fornecedor_cnpj" name="cnpj" value={formData.cnpj} onChange={handleChange} placeholder="00.000.000/0000-00" />
                </div>
                 <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="fornecedor_ie">Inscrição Estadual</Label>
                  <Input id="fornecedor_ie" name="inscricao_estadual" value={formData.inscricao_estadual} onChange={handleChange} placeholder="Isento ou número da IE" />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="supply_type">Tipo de Fornecimento</Label>
                  <Input id="supply_type" name="supply_type" value={formData.supply_type} onChange={handleChange} placeholder="Ex: Peças Automotivas, Óleos, Pneus" />
                </div>
              </div>
            </TabsContent>

            <div className="border-t pt-4 mt-4">
              <h3 className="text-sm font-medium text-gray-500 mb-4 uppercase tracking-wider">Informações de Contato & Endereço</h3>
              <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="phone">Telefone / WhatsApp</Label>
                  <Input id="phone" name="phone" value={formData.phone} onChange={handleChange} placeholder="(00) 00000-0000" />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" name="email" type="email" value={formData.email} onChange={handleChange} placeholder="contato@exemplo.com" />
                </div>

                <div className="space-y-2 relative">
                  <Label htmlFor="cep">CEP</Label>
                  <div className="relative">
                    <Input id="cep" name="cep" value={formData.cep} onChange={handleChange} placeholder="00000-000" />
                    {cepLoading && <div className="absolute right-3 top-1/2 -translate-y-1/2"><Loader2 className="h-4 w-4 animate-spin text-gray-400"/></div>}
                  </div>
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
                  <Input id="state" name="state" value={formData.state} onChange={handleChange} maxLength={2} />
                </div>

                <div className="space-y-2 md:col-span-3">
                  <Label htmlFor="observations">Observações</Label>
                  <Textarea id="observations" name="observations" value={formData.observations} onChange={handleChange} placeholder="Informações adicionais..." />
                </div>
              </div>
            </div>
          </form>
        </Tabs>

        <DialogFooter className="gap-2">
          <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
          <Button type="submit" form="cadastro-form" disabled={isSaving}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {entityToEdit ? 'Salvar Alterações' : 'Cadastrar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default NewCadastroDialog;