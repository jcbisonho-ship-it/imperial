import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ConfigEmpresa from '@/components/configuracoes/ConfigEmpresa';
import ConfigGeral from '@/components/configuracoes/ConfigGeral';
import ConfigPermissoes from '@/components/configuracoes/ConfigPermissoes';
import LogsAtividades from '@/components/configuracoes/LogsAtividades';
import ConfigBackup from '@/components/configuracoes/ConfigBackup';
import ConfigIntegracoes from '@/components/configuracoes/ConfigIntegracoes';
import ConfigTemas from '@/components/configuracoes/ConfigTemas';
import { Settings, Building2, Shield, Database, Activity, Globe, Palette } from 'lucide-react';
import { Helmet } from 'react-helmet';

const Configuracoes = () => {
  return (
    <div className="space-y-6">
      <Helmet>
        <title>Configurações | Oficina 2.0</title>
        <meta name="description" content="Configurações do sistema" />
      </Helmet>

      <div>
        <h2 className="text-3xl font-bold tracking-tight">Configurações</h2>
        <p className="text-muted-foreground">
          Gerencie as configurações gerais, usuários e preferências do sistema.
        </p>
      </div>

      <Tabs defaultValue="empresa" className="space-y-4">
        <TabsList className="flex h-auto flex-wrap gap-2 bg-transparent p-0">
          <TabsTrigger value="empresa" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Building2 className="mr-2 h-4 w-4" />
            Empresa
          </TabsTrigger>
          <TabsTrigger value="geral" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Settings className="mr-2 h-4 w-4" />
            Geral
          </TabsTrigger>
          <TabsTrigger value="permissoes" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Shield className="mr-2 h-4 w-4" />
            Permissões
          </TabsTrigger>
          <TabsTrigger value="backup" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Database className="mr-2 h-4 w-4" />
            Backup e Dados
          </TabsTrigger>
           <TabsTrigger value="integracoes" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Globe className="mr-2 h-4 w-4" />
            Integrações
          </TabsTrigger>
           <TabsTrigger value="temas" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Palette className="mr-2 h-4 w-4" />
            Aparência
          </TabsTrigger>
          <TabsTrigger value="logs" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Activity className="mr-2 h-4 w-4" />
            Logs
          </TabsTrigger>
        </TabsList>

        <TabsContent value="empresa" className="space-y-4">
          <ConfigEmpresa />
        </TabsContent>

        <TabsContent value="geral" className="space-y-4">
          <ConfigGeral />
        </TabsContent>

        <TabsContent value="permissoes" className="space-y-4">
          <ConfigPermissoes />
        </TabsContent>

        <TabsContent value="backup" className="space-y-4">
          <ConfigBackup />
        </TabsContent>
        
        <TabsContent value="integracoes" className="space-y-4">
          <ConfigIntegracoes />
        </TabsContent>
        
        <TabsContent value="temas" className="space-y-4">
          <ConfigTemas />
        </TabsContent>

        <TabsContent value="logs" className="space-y-4">
          <LogsAtividades />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Configuracoes;