import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { sendPasswordResetEmail } from '@/services/authService';

const ResetPassword = () => {
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState('');

    const handleReset = async (e) => {
        e.preventDefault();
        setLoading(true);
        const { error } = await sendPasswordResetEmail(email);
        if (error) {
            toast({
                title: 'Erro',
                description: error.message,
                variant: 'destructive',
            });
        } else {
            toast({
                title: 'E-mail enviado!',
                description: 'Verifique sua caixa de entrada para o link de redefinição de senha.',
            });
        }
        setLoading(false);
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-100">
            <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md">
                <div className="text-center">
                    <h1 className="text-3xl font-bold text-gray-900">Redefinir Senha</h1>
                    <p className="mt-2 text-sm text-gray-600">Digite seu e-mail para receber o link de redefinição.</p>
                </div>
                <form onSubmit={handleReset} className="space-y-6">
                    <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
                    </div>
                    <Button type="submit" className="w-full" disabled={loading}>
                        {loading ? 'Enviando...' : 'Enviar Link'}
                    </Button>
                </form>
                 <p className="text-sm text-center text-gray-600">
                    Lembrou a senha?{' '}
                    <Link to="/login" className="font-medium text-blue-600 hover:underline">
                        Faça login
                    </Link>
                </p>
            </div>
        </div>
    );
};

export default ResetPassword;