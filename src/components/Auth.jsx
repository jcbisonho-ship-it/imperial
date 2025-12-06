import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Car, Mail, Lock, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useToast } from '@/components/ui/use-toast';

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn, signUp } = useAuth();
  const { toast } = useToast();

  const handleTestUserSignUp = async () => {
    // Updated password to "admin123"
    const { data, error } = await signUp({
      email: "admin@admin.com", 
      password: "admin123",
      options: {
        data: { full_name: "Admin", role: "admin" }
      }
    });
    if (error && error.message.includes("already registered")) {
        // User exists, so we can proceed to sign in.
        return true;
    } else if (error) {
        toast({
          title: "Falha ao criar usuário de teste",
          description: error.message,
          variant: "destructive",
        });
        return false;
    } else {
        toast({
          title: "Usuário de teste criado!",
          description: "Agora você pode logar com as credenciais de teste.",
        });
        return true; // User created, proceed to login.
    }
  };


  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    if (!email.includes('@')) {
      toast({
        title: "Erro de Validação",
        description: "O email deve conter o símbolo '@'.",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    if (isLogin) {
       // Updated password to "admin123"
       if (email === "admin@admin.com" && password === "admin123") {
         const canLogin = await handleTestUserSignUp();
         if(canLogin){
            const { error } = await signIn({ email, password });
             if (error) {
                toast({
                    title: "Falha no Login",
                    description: "Verifique seu email e senha. O usuário de teste pode precisar de verificação por email se a configuração do Supabase exigir.",
                    variant: "destructive",
                });
            }
         }
       } else {
         const { error } = await signIn({ email, password });
          if (error) {
            toast({
              title: "Falha no Login",
              description: "Verifique seu email e senha.",
              variant: "destructive",
            });
          }
       }
    } else { // Sign up logic
      const { data: signUpData, error: signUpError } = await signUp({
        email, 
        password,
        options: {
          data: { full_name: fullName, role: "user" } // Default role 'user'
        }
      });

      if (signUpError) {
        toast({
          title: "Falha no Cadastro",
          description: signUpError.message,
          variant: "destructive",
        });
      } else {
        // Automatically sign in the user after successful sign-up
        const { error: signInError } = await signIn({ email, password });
        if (signInError) {
            toast({
                title: "Cadastro realizado, mas o login automático falhou.",
                description: "Por favor, tente fazer o login manualmente. A verificação de email pode ser necessária.",
                variant: "destructive",
            });
            setIsLogin(true); // Switch to login form
        } else {
            toast({
                title: "Cadastro realizado com sucesso!",
                description: "Você foi logado automaticamente.",
            });
            // No need to setIsLogin(true) as the user will be redirected to dashboard
        }
      }
    }
    setLoading(false);
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <motion.div
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md p-8 space-y-8 bg-white rounded-2xl shadow-xl"
      >
        <div className="text-center">
          <div className="inline-block p-3 bg-blue-100 rounded-full mb-4">
            <Car className="w-8 h-8 text-blue-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Imperial Serviços</h1>
          <p className="text-gray-600 mt-2">
            {isLogin ? 'Bem-vindo de volta!' : 'Crie sua conta para começar'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {!isLogin && (
            <div className="space-y-2">
              <Label htmlFor="fullName">Nome Completo</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <Input id="fullName" type="text" placeholder="Seu nome completo" value={fullName} onChange={(e) => setFullName(e.target.value)} required className="pl-10" />
              </div>
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <Input id="email" type="email" placeholder="voce@exemplo.com" value={email} onChange={(e) => setEmail(e.target.value)} required className="pl-10" />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Senha</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <Input id="password" type="password" placeholder="Sua senha" value={password} onChange={(e) => setPassword(e.target.value)} required className="pl-10" />
            </div>
          </div>

          <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700" disabled={loading}>
            {loading ? 'Carregando...' : (isLogin ? 'Entrar' : 'Cadastrar')}
          </Button>
        </form>

        <p className="text-center text-sm text-gray-600">
          {isLogin ? 'Não tem uma conta?' : 'Já tem uma conta?'}
          <button
            type="button"
            onClick={() => setIsLogin(!isLogin)}
            className="font-medium text-blue-600 hover:underline ml-1"
          >
            {isLogin ? 'Cadastre-se' : 'Faça login'}
          </button>
        </p>
      </motion.div>
    </div>
  );
};

export default Auth;