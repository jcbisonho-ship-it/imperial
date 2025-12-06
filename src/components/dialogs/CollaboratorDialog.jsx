import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const ROLES = ['Mecânico', 'Ajudante', 'Secretária', 'Motorista', 'Gerente', 'Vendedor', 'Outro'];

const CollaboratorDialog = ({ isOpen, onClose, onSave, collaborator }) => {
  const getInitialFormData = () => ({
    name: '',
    email: '',
    phone: '',
    cpf: '',
    rg: '',
    role: '',
    specialty: '',
    hourly_rate: '',
    commission_rate: '',
    commission_mo_pct: '',
    commission_parts_pct: '',
  });
  
  const [formData, setFormData] = useState(getInitialFormData());

  useEffect(() => {
    if (isOpen) {
        if (collaborator) {
            setFormData({
                name: collaborator.name || '',
                email: collaborator.email || '',
                phone: collaborator.phone || '',
                cpf: collaborator.cpf || '',
                rg: collaborator.rg || '',
                role: collaborator.role || '',
                specialty: collaborator.specialty || '',
                hourly_rate: collaborator.hourly_rate || '',
                commission_rate: collaborator.commission_rate || '',
                commission_mo_pct: collaborator.commission_mo_pct || '',
                commission_parts_pct: collaborator.commission_parts_pct || '',
            });
        } else {
            setFormData(getInitialFormData());
        }
    }
  }, [collaborator, isOpen]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };
  
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.id]: e.target.value });
  };
  
  const handleRoleChange = (value) => {
    setFormData({ ...formData, role: value });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{collaborator ? 'Editar Colaborador' : 'Novo Colaborador'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <Label htmlFor="name">Nome Completo *</Label>
              <Input id="name" value={formData.name} onChange={handleChange} required />
            </div>
             <div>
              <Label htmlFor="role">Função *</Label>
               <Select onValueChange={handleRoleChange} value={formData.role} required>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a função" />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map(role => <SelectItem key={role} value={role}>{role}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
                <Label htmlFor="email">Email *</Label>
                <Input id="email" type="email" value={formData.email} onChange={handleChange} required />
            </div>
            <div>
              <Label htmlFor="phone">Telefone</Label>
              <Input id="phone" type="tel" value={formData.phone} onChange={handleChange} />
            </div>
            <div>
              <Label htmlFor="cpf">CPF</Label>
              <Input id="cpf" value={formData.cpf} onChange={handleChange} />
            </div>
            <div>
              <Label htmlFor="rg">RG</Label>
              <Input id="rg" value={formData.rg} onChange={handleChange} />
            </div>
            {formData.role === 'Mecânico' && (
              <>
                <div>
                  <Label htmlFor="specialty">Especialidade</Label>
                  <Input id="specialty" value={formData.specialty} onChange={handleChange} placeholder="Ex: Motor, Elétrica"/>
                </div>
                <div>
                  <Label htmlFor="hourly_rate">Valor por Hora</Label>
                  <Input id="hourly_rate" type="number" step="0.01" value={formData.hourly_rate} onChange={handleChange} placeholder="Deixe em branco se não aplicável" />
                </div>
              </>
            )}
            <div>
                <Label htmlFor="commission_mo_pct">Comissão M.O. (%)</Label>
                <Input id="commission_mo_pct" type="number" step="0.1" min="0" max="20" value={formData.commission_mo_pct} onChange={handleChange} placeholder="0-20%"/>
            </div>
            <div>
                <Label htmlFor="commission_parts_pct">Comissão Peças (%)</Label>
                <Input id="commission_parts_pct" type="number" step="0.1" min="0" max="20" value={formData.commission_parts_pct} onChange={handleChange} placeholder="0-20%"/>
            </div>
          </div>
          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit">{collaborator ? 'Atualizar' : 'Cadastrar'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CollaboratorDialog;