import React from 'react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import Sidebar from '@/components/layout/Sidebar'; // Adjusted path
import Topbar from '@/components/layout/Topbar'; // Adjusted path
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast';
import { useEffect, useState } from 'react';

const DashboardLayout = () => {
  const { user, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [activeView, setActiveView] = useState('home'); // State for active view in sidebar

  useEffect(() => {
    // Determine active view based on current path
    const path = location.pathname.split('/')[1] || 'home';
    const tab = new URLSearchParams(location.search).get('tab');
    
    // Map paths to activeView IDs in sidebar
    if (path === '') setActiveView('home');
    else if (path === 'cadastros') setActiveView('cadastros');
    else if (path === 'atendimentos') setActiveView('atendimentos');
    else if (path === 'agendamentos') setActiveView('agendamentos');
    else if (path === 'financeiro' || path.startsWith('contas-') || path.startsWith('fluxo')) setActiveView('financeiro');
    else if (path === 'relatorios' || path.startsWith('relatorio')) setActiveView('relatorios');
    else if (path === 'os' || path === 'orcamentos') setActiveView('atendimentos'); // Fallback for direct links
    else setActiveView(path);

  }, [location.pathname, location.search]);

  const handleLogout = async () => {
    try {
      await signOut();
      navigate('/login');
      toast({
        title: "Desconectado",
        description: "Você foi desconectado com sucesso.",
        className: "bg-green-50 border-green-200"
      });
    } catch (error) {
      toast({
        title: "Erro ao desconectar",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const currentUser = {
    name: user?.user_metadata?.full_name || user?.email,
    role: user?.user_metadata?.role || 'user',
  };

  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar currentUser={currentUser} activeView={activeView} onLogout={handleLogout} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Topbar currentUser={currentUser} />
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-100 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;