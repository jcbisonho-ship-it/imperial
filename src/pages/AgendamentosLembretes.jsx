import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Agendamentos from '@/pages/Agendamentos';
import LembretesList from '@/components/lembretes/LembretesList';
import { Calendar, StickyNote } from 'lucide-react';
import { Helmet } from 'react-helmet';
import { useSearchParams } from 'react-router-dom';

const AgendamentosLembretes = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const defaultTab = searchParams.get('tab') || 'agendamentos';
  
  return (
    <div className="p-6 space-y-6">
      <Helmet>
        <title>Agendamentos e Lembretes | Oficina Pro</title>
        <meta name="description" content="Gerencie seus agendamentos e lembretes em um só lugar." />
      </Helmet>

      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Agenda & Lembretes</h1>
        <p className="text-muted-foreground">
          Organize seus compromissos e anotações importantes.
        </p>
      </div>

      <Tabs defaultValue={defaultTab} className="w-full" onValueChange={(tab) => setSearchParams({ tab })}>
        <TabsList className="grid w-full grid-cols-2 max-w-[500px]">
          <TabsTrigger value="agendamentos" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            <span>Agendamentos</span>
          </TabsTrigger>
          <TabsTrigger value="lembretes" className="flex items-center gap-2">
            <StickyNote className="h-4 w-4" />
            <span>Lembretes</span>
          </TabsTrigger>
        </TabsList>
        <TabsContent value="agendamentos" className="mt-6">
          <Agendamentos />
        </TabsContent>
        <TabsContent value="lembretes" className="mt-6">
          <LembretesList />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AgendamentosLembretes;