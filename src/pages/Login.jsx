import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useToast } from '@/components/ui/use-toast';

const Login = () => {
  const [email, setEmail] = useState('demo@example.com');
  const [password, setPassword] = useState('demo123');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { signIn, signUp, user, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const testUserEmail = 'admin@admin.com';
  const testUserPassword = 'password';

  useEffect(() => {
    if (user && !authLoading) {
      navigate('/');
    }
  }, [user, authLoading, navigate]);

  const handleTestUserSignUp = async () => {
    const { error, userAlreadyExists } = await signUp({
      email: testUserEmail,
      password: testUserPassword,
      options: {
        data: {
          full_name: 'Admin',
          role: 'admin',
        },
      },
    });

    // If there's an error and it's NOT the "user already exists" error, then something went wrong.
    if (error && !userAlreadyExists) {
      toast({
        variant: "destructive",
        title: "Admin Setup Failed",
        description: "Could not create the admin test user.",
      });
      return false; // Indicate failure
    }
    return true; // Indicate success or user already exists
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    if (email === testUserEmail) {
      const setupSuccess = await handleTestUserSignUp();
      // If admin setup failed for a reason other than user already existing, stop the login process.
      if (!setupSuccess) {
        setLoading(false);
        return;
      }
    }
    
    const { error } = await signIn({ email, password });

    setLoading(false);
    if (!error) {
      toast({
        title: "Login successful!",
        description: "Welcome back.",
      });
      navigate('/');
    }
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Login</CardTitle>
          <CardDescription>Acesse o painel com suas credenciais.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin}>
            <div className="grid w-full items-center gap-4">
              <div className="flex flex-col space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="flex flex-col space-y-1.5">
                <Label htmlFor="password">Senha</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Sua senha"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>
            <Button className="w-full mt-6" type="submit" disabled={loading}>
              {loading ? 'Entrando...' : 'Entrar'}
            </Button>
            <div className="mt-4 text-center text-sm text-gray-500">
              <p>Demo: <strong>demo@example.com</strong> / <strong>demo123</strong></p>
              <p>Admin: <strong>admin@admin.com</strong> / <strong>password</strong></p>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;