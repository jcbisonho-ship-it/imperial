
import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '@/contexts/SupabaseAuthContext';
import { Toaster } from '@/components/ui/toaster';

import DashboardLayout from '@/components/layout/DashboardLayout';
import PrivateRoute from '@/components/auth/PrivateRoute';

import Login from '@/pages/Login';
import Dashboard from '@/pages/Dashboard';
import Clientes from '@/pages/Clientes';
import Veiculos from '@/pages/Veiculos';
import Produtos from '@/pages/Produtos';
import Fornecedores from '@/pages/Fornecedores';
import Orcamentos from '@/pages/Orcamentos';
import OS from '@/pages/OS';
import Colaboradores from '@/pages/Colaboradores';
import Financeiro from '@/pages/Financeiro';
import Comissoes from '@/pages/Comissoes';
import Relatorios from '@/pages/Relatorios';
import Configuracoes from '@/pages/Configuracoes';
import Documentos from '@/pages/Documentos';
import Agendamentos from '@/pages/Agendamentos';
import MeusAgendamentos from '@/pages/MeusAgendamentos';
import AgendamentoPublico from '@/pages/AgendamentoPublico';
import NovoAgendamento from '@/pages/NovoAgendamento';
import Usuarios from '@/pages/Usuarios'; 
import Servicos from '@/pages/Servicos';
import AgendamentosLembretes from '@/pages/AgendamentosLembretes';
import ClientVehicleHistory from '@/pages/ClientVehicleHistory';
import ClientPortal from '@/pages/ClientPortal';

// Import new hub pages
import Cadastros from '@/pages/Cadastros';
import Atendimentos from '@/pages/Atendimentos';
import ChecklistPadrao from '@/pages/ChecklistPadrao'; // New page

import ContasReceber from '@/pages/ContasReceber';
import ContasPagar from '@/pages/ContasPagar';
import FluxoCaixa from '@/pages/FluxoCaixa';
import Transferencias from '@/pages/Transferencias';
import RelatoriosFinanceiros from '@/pages/RelatoriosFinanceiros';
import RelatoriosOS from '@/pages/RelatoriosOS';
import RelatorioProdutos from '@/pages/RelatorioProdutos';

// Import Financial Report Module
import RelatorioFinanceiro from '@/modules/financeiro/RelatorioFinanceiro';

import { AlertDialog } from '@/components/ui/alert-dialog';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AlertDialog>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/agendar" element={<AgendamentoPublico />} />
            
            {/* Public Portal Routes */}
            <Route path="/portal/:token" element={<ClientPortal />} />
            <Route path="/portal/historico/:token" element={<ClientVehicleHistory />} />
            <Route path="/portal/historico/:token/:vehicleId" element={<ClientVehicleHistory />} />
            
            <Route 
              path="/" 
              element={
                <PrivateRoute>
                  <DashboardLayout />
                </PrivateRoute>
              }
            >
              <Route index element={<Dashboard />} />
              
              {/* Hub Pages */}
              <Route path="cadastros" element={<Cadastros />} />
              <Route path="atendimentos" element={<Atendimentos />} /> 
              <Route path="agendamentos" element={<AgendamentosLembretes />} />


              {/* Direct Pages */}
              <Route path="clientes" element={<Clientes />} />
              <Route path="veiculos" element={<Veiculos />} />
              <Route path="produtos" element={<Produtos />} />
              <Route path="servicos" element={<Servicos />} />
              <Route path="fornecedores" element={<Fornecedores />} />
              <Route path="orcamentos" element={<Orcamentos />} />
              <Route path="os" element={<OS />} />
              <Route path="colaboradores" element={<Colaboradores />} />
              <Route path="financeiro" element={<Financeiro />} />
              <Route path="comissoes" element={<Comissoes />} />
              <Route path="relatorios" element={<Relatorios />} />
              <Route path="relatorios/financeiro" element={<RelatorioFinanceiro />} />
              <Route path="documentos" element={<Documentos />} />
              <Route path="checklist-padrao" element={<ChecklistPadrao />} /> {/* New Route */}
              <Route path="meus-agendamentos" element={<MeusAgendamentos />} />
              <Route path="novo-agendamento" element={<NovoAgendamento />} />
              <Route path="usuarios" element={<Usuarios />} />
              <Route path="configuracoes" element={<Configuracoes />} />

              {/* Additional routes for direct access if needed */}
              <Route path="contas-receber" element={<ContasReceber />} />
              <Route path="contas-pagar" element={<ContasPagar />} />
              <Route path="fluxo-caixa" element={<FluxoCaixa />} />
              <Route path="transferencias" element={<Transferencias />} />
              <Route path="relatorios-financeiros" element={<RelatoriosFinanceiros />} />
              <Route path="relatorios-os" element={<RelatoriosOS />} />
              <Route path="relatorio-produtos" element={<RelatorioProdutos />} />
            </Route>
          </Routes>
        </AlertDialog>
      </BrowserRouter>
      <Toaster />
    </AuthProvider>
  );
}

export default App;
