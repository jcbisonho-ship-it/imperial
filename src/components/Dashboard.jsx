import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { supabase } from '@/lib/customSupabaseClient';

// Import all components
import Sidebar from '@/components/dashboard/Sidebar';
import DashboardHome from '@/components/dashboard/DashboardHome';
import CustomerRegistration from '@/components/dashboard/CustomerRegistration';
import VehicleRegistration from '@/components/dashboard/VehicleRegistration';
import ServiceOrders from '@/components/dashboard/ServiceOrders';
import Budgets from '@/components/dashboard/Budgets';
import ProductManagement from '@/components/dashboard/ProductManagement';
import CollaboratorManagement from '@/components/dashboard/CollaboratorManagement';
import FinancialManagement from '@/components/dashboard/FinancialManagement';
import Reports from '@/components/dashboard/Reports';
// Placeholder for Settings
const Settings = () => <div className="p-6"><h1 className="text-2xl font-bold">Configurações</h1><p>🚧 Esta funcionalidade ainda não foi implementada. 🚀</p></div>;

const componentMap = {
  home: DashboardHome,
  customers: CustomerRegistration,
  vehicles: VehicleRegistration,
  serviceOrders: ServiceOrders,
  budgets: Budgets,
  products: ProductManagement,
  collaborators: CollaboratorManagement,
  financial: FinancialManagement,
  reports: Reports,
  settings: Settings,
};

const Dashboard = ({ currentUser }) => {
  const { signOut } = useAuth();
  const [activeView, setActiveView] = useState('home');

  const handleLogout = async () => {
    await signOut();
  };

  const ActiveComponent = componentMap[activeView] || DashboardHome;

  return (
    <div className="flex h-screen bg-gray-100 font-sans">
      <Sidebar 
        currentUser={currentUser} 
        activeView={activeView}
        setActiveView={setActiveView}
        onLogout={handleLogout}
      />
      <main className="flex-1 overflow-y-auto p-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeView}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            <ActiveComponent />
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
};

export default Dashboard;