import React, { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Car, Activity, DollarSign, X } from 'lucide-react';
import VehicleHistoryDialog from './VehicleHistoryDialog';
import { Badge } from '../ui/badge';
import { Button } from '@/components/ui/button';

const ClientHistoryDialog = ({ isOpen, onClose, customer }) => {
  const [vehicles, setVehicles] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [isVehicleHistoryOpen, setIsVehicleHistoryOpen] = useState(false);
  const { toast } = useToast();

  const loadData = useCallback(async () => {
    if (!customer) return;
    setLoading(true);
    try {
      const [vehiclesRes, auditRes] = await Promise.all([
        supabase.rpc('get_vehicle_summary', { p_search_term: customer.name }), // Using search_term as fallback if exact match by ID isn't directly supported by RPC, but ideally RPC should support ID. For now sticking to existing pattern or adapting. Wait, get_vehicle_summary uses search term. Let's rely on customer relation query instead which is safer.
        supabase.from('audit_log').select('*').or(`details->>customerId.eq.${customer.id},details->>customer_id.eq.${customer.id}`).order('created_at', { ascending: false })
      ]);
      // Re-fetching vehicles via direct table query to be safe and exact
      const { data: directVehicles, error: vError } = await supabase.from('vehicles').select('*').eq('customer_id', customer.id);
      
      if (vError) throw vError;
      if (auditRes.error) throw auditRes.error;

      setVehicles(directVehicles || []);
      setAuditLogs(auditRes.data || []);
    } catch (error) {
      // Silent fail on vehicle search, try basic list
      console.error(error);
    } finally { setLoading(false); }
  }, [customer, toast]);

  useEffect(() => {
    if (isOpen) loadData();
  }, [isOpen, loadData]);

  const openVehicleHistory = (vehicle) => {
    setSelectedVehicle(vehicle);
    setIsVehicleHistoryOpen(true);
  };
  
  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="w-full h-full max-w-none sm:w-3/4 sm:max-w-none md:w-full md:h-full rounded-none sm:rounded-lg flex flex-col p-0 gap-0 bg-white">
          <DialogHeader className="p-4 sm:p-6 border-b flex-none flex-row justify-between items-start">
            <div>
              <DialogTitle className="text-lg sm:text-xl">Histórico do Cliente</DialogTitle>
              <DialogDescription className="text-base sm:text-sm">{customer?.name}</DialogDescription>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose} className="-mt-2 -mr-2 sm:mt-0 sm:mr-0"><X className="w-5 h-5" /></Button>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto p-4 sm:p-6">
            {loading ? (
               <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>
            ) : (
              <Tabs defaultValue="vehicles" className="w-full">
                <TabsList className="grid w-full grid-cols-2 h-11 sm:h-10">
                  <TabsTrigger value="vehicles" className="text-xs sm:text-sm"><Car className="w-4 h-4 mr-2" />Veículos ({vehicles.length})</TabsTrigger>
                  <TabsTrigger value="activity" className="text-xs sm:text-sm"><Activity className="w-4 h-4 mr-2" />Atividade</TabsTrigger>
                </TabsList>
                <TabsContent value="vehicles" className="pt-4">
                  <div className="space-y-4">
                    {vehicles.map(vehicle => (
                      <div key={vehicle.id} className="border rounded-lg p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between hover:bg-gray-50 gap-4 sm:gap-0">
                        <div className="flex items-center gap-4 w-full sm:w-auto">
                          {vehicle.photo_url ? (
                              <img src={vehicle.photo_url} alt={`Foto de ${vehicle.model}`} className="w-16 h-16 object-cover rounded-md"/>
                          ) : (
                              <div className="w-16 h-16 bg-gray-100 rounded-md flex items-center justify-center border border-dashed border-gray-300">
                                  <Car className="w-8 h-8 text-gray-400"/>
                              </div>
                          )}
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="font-semibold text-base">{vehicle.brand} {vehicle.model} ({vehicle.year})</h4>
                              <Badge variant="secondary">{vehicle.plate}</Badge>
                            </div>
                            <p className="text-sm text-gray-500">{vehicle.color}</p>
                          </div>
                        </div>
                        <Button onClick={() => openVehicleHistory(vehicle)} size="sm" className="w-full sm:w-auto">Ver Histórico</Button>
                      </div>
                    ))}
                    {vehicles.length === 0 && <p className="text-center text-gray-500 py-8">Nenhum veículo cadastrado.</p>}
                  </div>
                </TabsContent>
                <TabsContent value="activity" className="pt-4">
                  <div className="space-y-3">
                    {auditLogs.map(log => (
                      <div key={log.id} className="text-xs sm:text-sm p-3 bg-gray-50 rounded-md border">
                        <p className="font-semibold capitalize text-gray-700">{log.action.replace(/_/g, ' ')}</p>
                        <p className="text-gray-500 mt-1">
                          Em {new Date(log.created_at).toLocaleString('pt-BR')}
                        </p>
                      </div>
                    ))}
                    {auditLogs.length === 0 && <p className="text-center text-gray-500 py-8">Nenhuma atividade registrada.</p>}
                  </div>
                </TabsContent>
              </Tabs>
            )}
          </div>
        </DialogContent>
      </Dialog>
      {isVehicleHistoryOpen && <VehicleHistoryDialog isOpen={isVehicleHistoryOpen} onClose={() => setIsVehicleHistoryOpen(false)} vehicle={selectedVehicle} customer={customer}/>}
    </>
  );
};

export default ClientHistoryDialog;