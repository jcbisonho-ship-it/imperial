import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { signUp } from '@/services/authService';

const Register = () => {
    const navigate = useNavigate();
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const handleRegister = async (e) => {
        e.preventDefault();
        if (password.length < 6) {
            toast({
                title: 'Senha fraca',
                description: 'A senha deve ter pelo menos 6 caracteres.',
                variant: 'destructive',
            });
            return;
        }
        setLoading(true);
        const { error } = await signUp(email, password, fullName);
        if (error) {
            toast({
                title: 'Erro no Registro',
                description: error.message || 'Não foi possível criar a conta.',
                variant: 'destructive',
            });
        } else {
            toast({
                title: 'Registro bem-sucedido!',
                description: 'Verifique seu e-mail para confirmar sua conta.',
            });
            navigate('/login');
        }
        setLoading(false);
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-100">
            <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md">
                <div className="text-center">
                    <h1 className="text-3xl font-bold text-gray-900">Crie sua Conta</h1>
                    <p className="mt-2 text-sm text-gray-600">Preencha os campos para se registrar.</p>
                </div>
                <form onSubmit={handleRegister} className="space-y-6">
                    <div className="space-y-2">
                        <Label htmlFor="fullName">Nome Completo</Label>
                        <Input id="fullName" type="text" required value={fullName} onChange={(e) => setFullName(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="password">Senha</Label>
                        <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
                    </div>
                    <Button type="submit" className="w-full" disabled={loading}>
                        {loading ? 'Registrando...' : 'Registrar'}
                    </Button>
                </form>
                <p className="text-sm text-center text-gray-600">
                    Já tem uma conta?{' '}
                    <Link to="/login" className="font-medium text-blue-600 hover:underline">
                        Faça login
                    </Link>
                </p>
            </div>
        </div>
    );
};

export default Register;