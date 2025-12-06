import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { adminCreateUser, adminUpdateUser } from '@/services/authService';

const roles = ['admin', 'manager', 'mechanic', 'receptionist'];

const UsuarioDialog = ({ isOpen, onClose, onSaveSuccess, user }) => {
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        full_name: '',
        role: 'receptionist',
    });

    // Responsive classes
    const INPUT_CLASS = "h-11 sm:h-9 text-base sm:text-sm";
    const BUTTON_CLASS = "w-full sm:w-auto h-11 sm:h-9 px-6 sm:px-4 text-base sm:text-sm";
    const LABEL_CLASS = "text-base sm:text-sm font-medium";

    useEffect(() => {
        if (user) {
            setFormData({
                email: user.email || '',
                password: '',
                full_name: user.full_name || '',
                role: user.role || 'receptionist',
            });
        } else {
            setFormData({ email: '', password: '', full_name: '', role: 'receptionist' });
        }
    }, [user]);

    const handleChange = (e) => {
        const { id, value } = e.target;
        setFormData(prev => ({ ...prev, [id]: value }));
    };

    const handleRoleChange = (value) => {
        setFormData(prev => ({ ...prev, role: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            if (user) { // Editing existing user
                const updates = {
                    user_metadata: { full_name: formData.full_name, role: formData.role },
                };
                if (formData.email !== user.email) {
                    updates.email = formData.email;
                }
                if (formData.password) {
                    updates.password = formData.password;
                }
                const { error } = await adminUpdateUser(user.id, updates);
                if (error) throw error;
                toast({ title: 'Usuário atualizado com sucesso!' });
            } else { // Creating new user
                const { error } = await adminCreateUser(formData.email, formData.password, formData.full_name, formData.role);
                if (error) throw error;
                toast({ title: 'Usuário criado com sucesso!' });
            }
            onSaveSuccess();
            onClose();
        } catch (error) {
            toast({ title: `Erro ao ${user ? 'atualizar' : 'criar'} usuário`, description: error.message, variant: 'destructive' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="w-full h-full max-w-none sm:w-3/4 sm:max-w-none md:w-full md:h-full rounded-none sm:rounded-lg flex flex-col p-0 gap-0 bg-white">
                <DialogHeader className="p-4 sm:p-6 border-b flex-none">
                    <DialogTitle className="text-lg sm:text-xl">{user ? 'Editar' : 'Novo'} Usuário</DialogTitle>
                    <DialogDescription className="text-base sm:text-sm">Preencha os dados do usuário.</DialogDescription>
                </DialogHeader>
                <div className="flex-1 overflow-y-auto p-4 sm:p-6">
                    <form id="user-form" onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <Label htmlFor="full_name" className={LABEL_CLASS}>Nome Completo</Label>
                            <Input id="full_name" value={formData.full_name} onChange={handleChange} required className={INPUT_CLASS} />
                        </div>
                        <div>
                            <Label htmlFor="email" className={LABEL_CLASS}>Email</Label>
                            <Input id="email" type="email" value={formData.email} onChange={handleChange} required className={INPUT_CLASS} />
                        </div>
                        <div>
                            <Label htmlFor="password" className={LABEL_CLASS}>Senha</Label>
                            <Input id="password" type="password" placeholder={user ? 'Deixe em branco para não alterar' : ''} onChange={handleChange} required={!user} className={INPUT_CLASS} />
                        </div>
                        <div>
                            <Label htmlFor="role" className={LABEL_CLASS}>Perfil de Acesso</Label>
                            <Select value={formData.role} onValueChange={handleRoleChange}>
                                <SelectTrigger className={INPUT_CLASS}><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {roles.map(role => (
                                        <SelectItem key={role} value={role} className="capitalize">{role}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </form>
                </div>
                <DialogFooter className="p-4 sm:p-6 border-t flex-none flex-col-reverse sm:flex-row gap-3 sm:gap-2 bg-gray-50 sm:bg-white">
                    <Button type="button" variant="outline" onClick={onClose} disabled={loading} className={BUTTON_CLASS}>Cancelar</Button>
                    <Button type="submit" form="user-form" disabled={loading} className={BUTTON_CLASS}>{loading ? 'Salvando...' : 'Salvar'}</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default UsuarioDialog;