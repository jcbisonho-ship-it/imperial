import React from 'react';
import { Home, Users, Package, Wrench, Settings, BarChart3, DollarSign, UserCog, FileText } from 'lucide-react';
import { motion } from 'framer-motion';

const NavItem = ({ icon: Icon, label, isActive, onClick }) => {
  return (
    <motion.li
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className={`
        flex items-center p-3 my-1 rounded-lg cursor-pointer transition-all duration-200
        ${isActive ? 'bg-gradient-to-r from-blue-600 to-blue-800 text-white shadow-lg' : 'text-gray-600 hover:bg-gray-200'}
      `}
      onClick={onClick}
    >
      <Icon className="w-6 h-6 mr-3" />
      <span className="font-medium">{label}</span>
    </motion.li>
  );
};

const Sidebar = ({ currentUser, activeView, setActiveView, onLogout }) => {
  const navItems = [
    { id: 'home', label: 'Início', icon: Home },
    { id: 'serviceOrders', label: 'Ordens de Serviço', icon: FileText },
    { id: 'budgets', label: 'Orçamentos', icon: FileText },
    { id: 'customers', label: 'Clientes', icon: Users },
    { id: 'products', label: 'Produtos', icon: Package },
    { id: 'vehicles', label: 'Veículos', icon: Wrench },
    { id: 'collaborators', label: 'Colaboradores', icon: UserCog },
    { id: 'financial', label: 'Financeiro', icon: DollarSign },
    { id: 'reports', label: 'Relatórios', icon: BarChart3 },
    { id: 'settings', label: 'Configurações', icon: Settings },
  ];

  return (
    <aside className="w-64 bg-white shadow-xl flex flex-col h-full">
      <div className="p-6 border-b">
        <h1 className="text-2xl font-bold text-gray-800">Imperial</h1>
        <p className="text-sm text-gray-500">Serviços Automotivos</p>
      </div>

      <nav className="flex-1 px-4 py-4">
        <ul>
          {navItems.map(item => (
            <NavItem
              key={item.id}
              icon={item.icon}
              label={item.label}
              isActive={activeView === item.id}
              onClick={() => setActiveView(item.id)}
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