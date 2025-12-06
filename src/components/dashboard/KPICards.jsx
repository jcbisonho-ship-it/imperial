import React from 'react';
import { DollarSign, TrendingUp, CheckCircle, Users, AlertCircle } from 'lucide-react';

const KPICard = ({ title, value, icon: Icon, trend, color, loading }) => (
  <div className="bg-white p-6 rounded-xl shadow-sm border flex items-start justify-between transition-all hover:shadow-md">
    <div>
      <p className="text-sm font-medium text-gray-500 mb-1">{title}</p>
      {loading ? (
          <div className="h-8 w-24 bg-gray-200 rounded animate-pulse"></div>
      ) : (
          <h3 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">{value}</h3>
      )}
      {trend && (
        <p className={`text-xs mt-2 font-medium flex items-center ${trend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
          {trend >= 0 ? '+' : ''}{trend}% <span className="text-gray-400 ml-1 font-normal">vs mês anterior</span>
        </p>
      )}
    </div>
    <div className={`p-3 rounded-lg ${color}`}>
      <Icon className="w-6 h-6 text-white" />
    </div>
  </div>
);

const KPICards = ({ data, loading }) => {
  const formatCurrency = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
      <KPICard 
        title="Faturamento Mensal" 
        value={formatCurrency(data?.revenue)} 
        icon={DollarSign} 
        color="bg-blue-600" 
        loading={loading}
      />
      <KPICard 
        title="Lucro Líquido" 
        value={formatCurrency(data?.profit)} 
        icon={TrendingUp} 
        color="bg-green-600" 
        loading={loading}
      />
      <KPICard 
        title="OS Concluídas" 
        value={data?.completed_os || 0} 
        icon={CheckCircle} 
        color="bg-purple-600" 
        loading={loading}
      />
      <KPICard 
        title="Ticket Médio" 
        value={formatCurrency(data?.average_ticket)} 
        icon={Users} 
        color="bg-orange-500" 
        loading={loading}
      />
    </div>
  );
};

export default KPICards;