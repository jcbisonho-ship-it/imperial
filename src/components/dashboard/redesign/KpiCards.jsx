import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, Car, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';

const cardStyles = {
  orcamentos: 'from-orange-500 to-orange-600',
  osConcluidas: 'from-green-500 to-green-600',
};

const StatCard = ({ title, value, icon: Icon, loading, type }) => {
  return (
    <motion.div whileHover={{ scale: 1.05 }} className="h-full">
      <Card className={cn("text-white border-0 shadow-lg bg-gradient-to-br", cardStyles[type])}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
          <Icon className="h-5 w-5 text-white/80" />
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="h-8 w-16 bg-white/30 rounded animate-pulse"></div>
          ) : (
            <div className="flex items-center gap-2">
                <div className="text-3xl font-bold">{value}</div>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};

const VehiclesInWorkshopCard = ({ loading, vehicles }) => {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base font-medium flex items-center gap-2">
          <Car className="h-5 w-5" /> Veículos no Pátio
        </CardTitle>
        <Badge variant="secondary">{vehicles.length}</Badge>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[200px] pr-3">
          {loading ? (
             <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                    <div key={i} className="flex items-center gap-4 animate-pulse">
                        <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                        <div className="h-4 bg-gray-200 rounded w-2/4"></div>
                        <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                    </div>
                ))}
             </div>
          ) : vehicles.length === 0 ? (
            <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
              Nenhum veículo no pátio.
            </div>
          ) : (
            <div className="space-y-3">
              {vehicles.map((vehicle) => (
                <div key={vehicle.os_id} className="text-sm flex justify-between items-center gap-2">
                    <span className="font-semibold truncate">{vehicle.plate}</span>
                    <span className="text-muted-foreground truncate">{vehicle.model}</span>
                    <span className="text-muted-foreground capitalize">{vehicle.color}</span>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

const KpiCards = ({ refreshTrigger }) => {
  const [stats, setStats] = useState({
    orcamentos: 0,
    osConcluidas: 0,
  });
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      const today = format(new Date(), 'yyyy-MM-dd');
      
      try {
        const [
          orcamentos,
          osConcluidas,
          vehiclesInWorkshop
        ] = await Promise.all([
          supabase.from('budgets').select('id', { count: 'exact' }).eq('status', 'pending'),
          supabase.from('service_orders').select('id', { count: 'exact' }).eq('status', 'Concluída').gte('created_at', `${today}T00:00:00Z`).lte('created_at', `${today}T23:59:59Z`),
          supabase.from('service_orders')
            .select(`
                os_id:id,
                vehicle:vehicles (
                    plate,
                    model,
                    color
                )
            `)
            .eq('status', 'Aberta')
        ]);

        if (orcamentos.error) throw orcamentos.error;
        if (osConcluidas.error) throw osConcluidas.error;
        if (vehiclesInWorkshop.error) throw vehiclesInWorkshop.error;
        
        const flattenedVehicles = vehiclesInWorkshop.data.map(item => ({
            os_id: item.os_id,
            plate: item.vehicle.plate,
            model: item.vehicle.model,
            color: item.vehicle.color
        }));

        setStats({
          orcamentos: orcamentos.count,
          osConcluidas: osConcluidas.count,
        });
        setVehicles(flattenedVehicles);

      } catch (error) {
        console.error("Error fetching KPI stats:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [refreshTrigger]);

  const cardsData = [
    { title: "Orçamentos aguardando", value: stats.orcamentos, icon: FileText, type: 'orcamentos' },
    { title: "OS concluídas hoje", value: stats.osConcluidas, icon: CheckCircle, type: 'osConcluidas' },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-1">
        <VehiclesInWorkshopCard loading={loading} vehicles={vehicles} />
        {cardsData.map((card) => (
            <StatCard key={card.type} {...card} loading={loading} />
        ))}
    </div>
  );
};

export default KpiCards;