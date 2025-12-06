import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { DollarSign, BarChart3 } from 'lucide-react';

const NavigationBridge = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const items = [
    {
      path: '/financeiro',
      label: 'Financeiro',
      icon: <DollarSign className="mr-2 h-4 w-4" />,
      active: location.pathname.startsWith('/financeiro'),
    },
    {
      path: '/relatorios',
      label: 'Relatórios',
      icon: <BarChart3 className="mr-2 h-4 w-4" />,
      active: location.pathname.startsWith('/relatorios'),
    },
  ];

  return (
    <div className="flex items-center gap-2 mb-6">
      <div className="text-sm font-medium text-gray-500 mr-2 hidden md:block">Acesso Rápido:</div>
      {items.map((item) => (
        <Button
          key={item.path}
          variant={item.active ? 'default' : 'outline'}
          size="sm"
          onClick={() => navigate(item.path)}
          className={`
            transition-all
            ${item.active ? 'bg-primary text-primary-foreground shadow-md' : 'bg-white hover:bg-gray-50 text-gray-700'}
          `}
        >
          {item.icon}
          {item.label}
        </Button>
      ))}
    </div>
  );
};

export default NavigationBridge;