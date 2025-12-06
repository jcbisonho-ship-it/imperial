import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { DollarSign, TrendingUp, User, Download, Calculator, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { addDays, format } from 'date-fns';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ComissoesDashboard from '@/components/comissoes/ComissoesDashboard';
import ComissoesList from '@/components/comissoes/ComissoesList';
import ComissoesCharts from '@/components/comissoes/ComissoesCharts';

const CommissionTracking = () => {
  const [date, setDate] = useState({
    from: addDays(new Date(), -30),
    to: new Date(),
  });

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Gestão de Comissões</h2>
          <p className="text-gray-600">Calcule, visualize e gerencie as comissões dos seus colaboradores.</p>
        </div>
        <DateRangePicker date={date} onDateChange={setDate} />
      </div>

      <Tabs defaultValue="dashboard" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="list">Lista de Comissões</TabsTrigger>
          <TabsTrigger value="charts">Gráficos</TabsTrigger>
        </TabsList>
        <TabsContent value="dashboard">
          <ComissoesDashboard dateRange={date} />
        </TabsContent>
        <TabsContent value="list">
          <ComissoesList dateRange={date} />
        </TabsContent>
        <TabsContent value="charts">
          <ComissoesCharts dateRange={date} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CommissionTracking;