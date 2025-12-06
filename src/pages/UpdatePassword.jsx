import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/lib/customSupabaseClient'; // CORRECTED IMPORT
import { updateUserPassword } from '@/services/authService';

const UpdatePassword = () => {
    const navigate = useNavigate();
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [hasSession, setHasSession] = useState(false);

    useEffect(() => {
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'PASSWORD_RECOVERY') {
                setHasSession(!!session);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    const handleUpdate = async (e) => {
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
            toast({ title: 'Sucesso!', description: 'Sua senha foi atualizada. Faça login com a nova senha.' });
            await supabase.auth.signOut();
            navigate('/login');
        }
        setLoading(false);
    };

    if (!hasSession) {
        return (
             <div className="flex items-center justify-center min-h-screen bg-gray-100">
                <div className="w-full max-w-md p-8 text-center bg-white rounded-lg shadow-md">
                    <h1 className="text-2xl font-bold">Aguardando autenticação...</h1>
                    <p className="mt-2 text-gray-600">Por favor, clique no link enviado para o seu e-mail para continuar.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-100">
            <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md">
                <div className="text-center">
                    <h1 className="text-3xl font-bold text-gray-900">Atualizar Senha</h1>
                    <p className="mt-2 text-sm text-gray-600">Digite sua nova senha.</p>
                </div>
                <form onSubmit={handleUpdate} className="space-y-6">
                    <div className="space-y-2">
                        <Label htmlFor="password">Nova Senha</Label>
                        <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="confirmPassword">Confirmar Nova Senha</Label>
                        <Input id="confirmPassword" type="password" required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
                    </div>
                    <Button type="submit" className="w-full" disabled={loading}>
                        {loading ? 'Atualizando...' : 'Atualizar Senha'}
                    </Button>
                </form>
            </div>
        </div>
    );
};

export default UpdatePassword;