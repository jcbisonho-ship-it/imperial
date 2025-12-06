import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

const EmployeeDialog = ({ isOpen, onClose, onSave, employee }) => {
  const [formData, setFormData] = useState({
    name: '', role: '', phone: '', email: '', commission: '10', username: '', password: ''
  });

  // Responsive classes
  const INPUT_CLASS = "h-11 sm:h-9 text-base sm:text-sm";
  const BUTTON_CLASS = "w-full sm:w-auto h-11 sm:h-9 px-6 sm:px-4 text-base sm:text-sm";
  const LABEL_CLASS = "text-base sm:text-sm font-medium";

  useEffect(() => {
    if (employee) {
      setFormData(employee);
    } else {
      setFormData({
        name: '', role: '', phone: '', email: '', commission: '10', username: '', password: ''
      });
    }
  }, [employee, isOpen]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
    onClose();
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-full h-full max-w-none sm:w-3/4 sm:max-w-none md:w-full md:h-full rounded-none sm:rounded-lg flex flex-col p-0 gap-0 bg-white">
        <DialogHeader className="p-4 sm:p-6 border-b flex-none">
          <DialogTitle className="text-lg sm:text-xl">{employee ? 'Editar Funcionário' : 'Novo Funcionário'}</DialogTitle>
          <DialogDescription className="text-base sm:text-sm">Preencha os dados do funcionário.</DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          <form id="employee-form" onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label className={LABEL_CLASS}>Nome Completo</Label>
              <Input type="text" name="name" value={formData.name} onChange={handleChange} required className={INPUT_CLASS} />
            </div>
            <div>
              <Label className={LABEL_CLASS}>Cargo</Label>
              <Input type="text" name="role" value={formData.role} onChange={handleChange} required className={INPUT_CLASS} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label className={LABEL_CLASS}>Telefone</Label>
                <Input type="tel" name="phone" value={formData.phone} onChange={handleChange} required className={INPUT_CLASS} />
              </div>
              <div>
                <Label className={LABEL_CLASS}>Comissão (%)</Label>
                <Input type="number" name="commission" value={formData.commission} onChange={handleChange} required min="0" max="100" step="0.1" className={INPUT_CLASS} />
              </div>
            </div>
            <div>
              <Label className={LABEL_CLASS}>Email</Label>
              <Input type="email" name="email" value={formData.email} onChange={handleChange} required className={INPUT_CLASS} />
            </div>
            <div>
              <Label className={LABEL_CLASS}>Usuário (Login)</Label>
              <Input type="text" name="username" value={formData.username} onChange={handleChange} required className={INPUT_CLASS} />
            </div>
            <div>
              <Label className={LABEL_CLASS}>Senha</Label>
              <Input type="password" name="password" value={formData.password} onChange={handleChange} required={!employee} className={INPUT_CLASS} />
            </div>
          </form>
        </div>
        <DialogFooter className="p-4 sm:p-6 border-t flex-none flex-col-reverse sm:flex-row gap-3 sm:gap-2 bg-gray-50 sm:bg-white">
            <Button type="button" onClick={onClose} variant="outline" className={BUTTON_CLASS}>Cancelar</Button>
            <Button type="submit" form="employee-form" className={`${BUTTON_CLASS} bg-gradient-to-r from-blue-600 to-blue-800 hover:from-blue-700 hover:to-blue-900`}>{employee ? 'Atualizar' : 'Cadastrar'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EmployeeDialog;