import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { updateUserProfile, updateUserAuth, uploadAvatar, updateUserPassword } from '@/services/authService';
import { Camera } from 'lucide-react';

const Profile = () => {
    const { user, session } = useAuth();
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [avatarUrl, setAvatarUrl] = useState(null);
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const fileInputRef = useRef(null);

    useEffect(() => {
        if (user) {
            setFullName(user.user_metadata?.full_name || '');
            setEmail(user.email || '');
            setAvatarUrl(user.user_metadata?.avatar_url || null);
        }
    }, [user]);

    const handleUpdateProfile = async (e) => {
        e.preventDefault();
        setLoading(true);

        const { error: authError } = await updateUserAuth({ data: { full_name: fullName } });

        if (authError) {
            toast({ title: 'Erro ao atualizar perfil', description: authError.message, variant: 'destructive' });
        } else {
            toast({ title: 'Perfil atualizado com sucesso!' });
        }
        setLoading(false);
    };

    const handleUpdatePassword = async (e) => {
        e.preventDefault();
        if (password !== confirmPassword) {
            toast({ title: 'Erro', description: 'As senhas não coincidem.', variant: 'destructive' });
            return;
        }
        if (password.length < 6) {
            toast({ title: 'Senha fraca', description: 'A senha deve ter pelo menos 6 caracteres.', variant: 'destructive' });
            return;
        }
        setLoading(true);
        const { error } = await updateUserPassword(password);
        if (error) {
            toast({ title: 'Erro ao atualizar senha', description: error.message, variant: 'destructive' });
        } else {
            toast({ title: 'Senha atualizada com sucesso!' });
            setPassword('');
            setConfirmPassword('');
        }
        setLoading(false);
    };

    const handleAvatarChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setLoading(true);
        const { data, error } = await uploadAvatar(user.id, file);
        if (error) {
            toast({ title: 'Erro no upload', description: error.message, variant: 'destructive' });
        } else {
            const { error: updateError } = await updateUserAuth({ data: { avatar_url: data.avatar_url } });
            if (updateError) {
                toast({ title: 'Erro ao salvar avatar', description: updateError.message, variant: 'destructive' });
            } else {
                setAvatarUrl(data.avatar_url);
                toast({ title: 'Avatar atualizado!' });
            }
        }
        setLoading(false);
    };

    const getInitials = (name) => {
        return name.split(' ').map(n => n[0]).join('').toUpperCase();
    };

    return (
        <div className="space-y-8">
            <h2 className="text-2xl font-bold text-gray-800">Meu Perfil</h2>
            
            <div className="bg-white p-6 rounded-xl shadow-lg">
                <h3 className="text-lg font-semibold mb-4">Informações Pessoais</h3>
                <form onSubmit={handleUpdateProfile} className="space-y-4 max-w-lg">
                    <div className="flex items-center space-x-4">
                        <div className="relative">
                            <Avatar className="h-24 w-24">
                                <AvatarImage src={avatarUrl} alt={fullName} />
                                <AvatarFallback className="text-3xl">{fullName ? getInitials(fullName) : 'U'}</AvatarFallback>
                            </Avatar>
                            <Button type="button" size="icon" className="absolute bottom-0 right-0 rounded-full h-8 w-8" onClick={() => fileInputRef.current.click()}>
                                <Camera className="h-4 w-4" />
                            </Button>
                            <Input type="file" ref={fileInputRef} onChange={handleAvatarChange} accept="image/*" className="hidden" />
                        </div>
                        <div className="flex-grow space-y-2">
                            <div>
                                <Label htmlFor="fullName">Nome Completo</Label>
                                <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} />
                            </div>
                             <div>
                                <Label htmlFor="email">Email</Label>
                                <Input id="email" value={email} disabled />
                            </div>
                        </div>
                    </div>
                    <Button type="submit" disabled={loading}>{loading ? 'Salvando...' : 'Salvar Alterações'}</Button>
                </form>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-lg">
                <h3 className="text-lg font-semibold mb-4">Alterar Senha</h3>
                <form onSubmit={handleUpdatePassword} className="space-y-4 max-w-lg">
                    <div>
                        <Label htmlFor="password">Nova Senha</Label>
                        <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
                    </div>
                    <div>
                        <Label htmlFor="confirmPassword">Confirmar Nova Senha</Label>
                        <Input id="confirmPassword" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
                    </div>
                    <Button type="submit" disabled={loading}>{loading ? 'Atualizando...' : 'Atualizar Senha'}</Button>
                </form>
            </div>
        </div>
    );
};

export default Profile;