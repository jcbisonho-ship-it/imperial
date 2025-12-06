import React from 'react';
import { Helmet } from 'react-helmet';
import DashboardHome from '@/components/dashboard/DashboardHome';

const Dashboard = () => {
  return (
    <>
      <Helmet>
        <title>Dashboard | Oficina Pro</title>
        <meta name="description" content="Visão geral e indicadores principais da oficina." />
      </Helmet>
      <DashboardHome />
    </>
  );
};

export default Dashboard;