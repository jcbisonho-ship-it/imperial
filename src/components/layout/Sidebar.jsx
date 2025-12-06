import React, { useState, useEffect } from 'react';
import { Home, Users, Settings, BarChart3, DollarSign, FileText, CalendarClock, FolderOpen, ClipboardList } from 'lucide-react'; 
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/customSupabaseClient';

const NavItem = ({ icon: Icon, label, isActive, to }) => {
  return (
    <motion.li
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className={`
        flex items-center p-3 my-1 rounded-lg transition-all duration-200
        ${isActive ? 'bg-gradient-to-r from-blue-600 to-blue-800 text-white shadow-lg' : 'text-gray-600 hover:bg-gray-200'}
      `}
    >
      <Link to={to} className="flex items-center w-full h-full">
        <Icon className="w-6 h-6 mr-3" />
        <span className="font-medium">{label}</span>
      </Link>
    </motion.li>
  );
};

const Sidebar = ({ currentUser, activeView, onLogout }) => {
  const [companyLogoUrl, setCompanyLogoUrl] = useState('');
  const [loadingLogo, setLoadingLogo] = useState(true);

  useEffect(() => {
    const fetchCompanyLogo = async () => {
      setLoadingLogo(true);
      const { data, error } = await supabase
        .from('document_templates')
        .select('company_logo_url')
        .eq('id', 1)
        .single();

      if (data) {
        setCompanyLogoUrl(data.company_logo_url);
      } else if (error && error.code !== 'PGRST116') {
        console.error('Error fetching company logo:', error.message);
      }
      setLoadingLogo(false);
    };

    fetchCompanyLogo();
  }, []);

  const navItems = [
    { id: 'home', label: 'Início', icon: Home, to: '/' },
    { id: 'orcamentos', label: 'Orçamentos', icon: FileText, to: '/orcamentos' },
    { id: 'os', label: 'Ordens de Serviço', icon: ClipboardList, to: '/os' },
    { id: 'agendamentos', label: 'Agendamentos e Lembretes', icon: CalendarClock, to: '/agendamentos' },
    { id: 'cadastros', label: 'Cadastros', icon: Users, to: '/cadastros' },
    { id: 'financeiro', label: 'Financeiro', icon: DollarSign, to: '/financeiro' },
    { id: 'documentos', label: 'Documentos', icon: FolderOpen, to: '/documentos' },
    { id: 'relatorios', label: 'Relatórios', icon: BarChart3, to: '/relatorios' },
    { id: 'configuracoes', label: 'Configurações', icon: Settings, to: '/configuracoes' },
  ];

  return (
    <aside className="w-64 bg-white shadow-xl flex flex-col h-full">
      <div className="p-6 border-b flex justify-center items-center">
        {loadingLogo ? (
          <div className="h-20 w-full bg-gray-200 animate-pulse rounded-md" />
        ) : companyLogoUrl ? (
          <img 
            src={companyLogoUrl} 
            alt="Logo da Empresa" 
            className="max-h-28 w-auto max-w-full object-contain transition-all duration-300"
          />
        ) : (
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-800">Imperial</h1>
            <p className="text-sm text-gray-500">Serviços Automotivos</p>
          </div>
        )}
      </div>

      <nav className="flex-1 px-4 py-4">
        <ul>
          {navItems.map(item => (
            <NavItem
              key={item.id}
              icon={item.icon}
              label={item.label}
              isActive={activeView === item.id}
              to={item.to}
            />
          ))}
        </ul>
      </nav>

      <div className="p-4 border-t">
        <div className="flex items-center">
          <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold mr-3">
            {currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
          </div>
          <div>
            <p className="font-semibold text-gray-800 text-sm">{currentUser?.name}</p>
            <button
              onClick={onLogout}
              className="text-xs text-red-500 hover:underline"
            >
              Sair
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;