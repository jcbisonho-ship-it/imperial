import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/customSupabaseClient';
import { format } from 'date-fns';
import { Loader2, AlertCircle, Car, Calendar, Wrench, Package, Truck, Info, CalendarPlus } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

const ClientVehicleHistory = () => {
  const { token, vehicleId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  const [selectedVehicleId, setSelectedVehicleId] = useState(vehicleId || null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: result, error: rpcError } = await supabase.rpc('get_client_portal_data', {
          p_token: token
        });

        if (rpcError) throw rpcError;
        if (!result.valid) throw new Error(result.message || 'Acesso inválido');

        setData(result);
        
        // Set default vehicle if not provided or invalid
        if (result.vehicles && result.vehicles.length > 0) {
          if (!vehicleId || !result.vehicles.find(v => v.id === vehicleId)) {
            setSelectedVehicleId(result.vehicles[0].id);
          }
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (token) fetchData();
  }, [token, vehicleId]);

  const currentVehicle = useMemo(() => {
    if (!data?.vehicles || !selectedVehicleId) return null;
    return data.vehicles.find(v => v.id === selectedVehicleId);
  }, [data, selectedVehicleId]);

  const vehicleHistory = useMemo(() => {
    if (!data?.work_orders || !selectedVehicleId) return [];
    
    return data.work_orders
      .filter(os => os.vehicle_id === selectedVehicleId && os.status !== 'Cancelada')
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }, [data, selectedVehicleId]);

  const latestKm = useMemo(() => {
    if (!vehicleHistory.length) return 'N/A';
    // Find max KM recorded
    const maxKm = vehicleHistory.reduce((max, os) => {
      return os.km > max ? os.km : max;
    }, 0);
    return maxKm > 0 ? `${maxKm.toLocaleString()} km` : 'N/A';
  }, [vehicleHistory]);

  const handleScheduleService = () => {
    if (!currentVehicle || !data.customer) return;
    
    const params = new URLSearchParams({
      name: data.customer.name,
      email: data.customer.email || '',
      phone: data.customer.phone || '',
      plate: currentVehicle.plate,
      model: `${currentVehicle.brand} ${currentVehicle.model}`,
      from: 'portal'
    });
    
    navigate(`/agendar?${params.toString()}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Alert variant="destructive" className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Erro de Acesso</AlertTitle>
          <AlertDescription>{error || 'Não foi possível carregar os dados.'}</AlertDescription>
        </Alert>
      </div>
    );
  }

  const BreakdownSection = ({ title, icon: Icon, items, colorClass }) => {
    if (!items || items.length === 0) return null;
    
    const total = items.reduce((sum, item) => sum + (Number(item.total_price) || 0), 0);

    return (
      <div className="mb-6">
        <div className={`flex items-center gap-2 mb-3 pb-1 border-b ${colorClass}`}>
          <Icon className="w-4 h-4" />
          <h4 className="font-semibold text-sm uppercase tracking-wider">{title}</h4>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500">
              <tr>
                <th className="text-left py-2 px-3 font-medium">Descrição</th>
                <th className="text-center py-2 px-3 font-medium w-20">Qtd</th>
                <th className="text-right py-2 px-3 font-medium w-32">Unitário</th>
                <th className="text-right py-2 px-3 font-medium w-32">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {items.map((item, idx) => (
                <tr key={idx}>
                  <td className="py-2 px-3">{item.description}</td>
                  <td className="text-center py-2 px-3">{item.quantity}</td>
                  <td className="text-right py-2 px-3">{formatCurrency(item.unit_price)}</td>
                  <td className="text-right py-2 px-3 font-medium">{formatCurrency(item.total_price)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan="3" className="text-right py-3 px-3 font-semibold text-gray-600">Subtotal {title}:</td>
                <td className="text-right py-3 px-3 font-bold">{formatCurrency(total)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4 sm:px-6 print:bg-white print:p-0">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Header Section - Client & Vehicle Info */}
        <Card className="bg-white shadow-sm border-t-4 border-t-blue-600 print:shadow-none print:border">
          <CardHeader className="pb-4">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <CardTitle className="text-2xl font-bold text-gray-900">{data.customer.name}</CardTitle>
                <div className="flex items-center gap-2 text-gray-500 mt-1 text-sm">
                  <Info className="w-4 h-4" />
                  <span>Portal do Cliente - Histórico de Manutenção</span>
                </div>
              </div>
              <div className="flex flex-col items-end gap-2">
                 <Button 
                   onClick={handleScheduleService}
                   className="bg-green-600 hover:bg-green-700 text-white print:hidden"
                 >
                   <CalendarPlus className="w-4 h-4 mr-2" />
                   Agendar Serviço
                 </Button>
                 <div className="text-sm text-gray-500 print:block hidden">Data de Emissão: {format(new Date(), 'dd/MM/yyyy')}</div>
              </div>
            </div>
          </CardHeader>
          
          {/* Vehicle Selector if multiple */}
          {data.vehicles.length > 1 && (
            <div className="px-6 pb-2 print:hidden">
              <Tabs value={selectedVehicleId} onValueChange={setSelectedVehicleId} className="w-full">
                <TabsList className="w-full justify-start overflow-x-auto">
                  {data.vehicles.map(v => (
                    <TabsTrigger key={v.id} value={v.id} className="min-w-[120px]">
                      {v.model} ({v.plate})
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            </div>
          )}

          <CardContent className="pt-2">
            {currentVehicle ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg border">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-full text-blue-600">
                    <Car className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase">Veículo</p>
                    <p className="font-bold text-lg text-gray-900">{currentVehicle.brand} {currentVehicle.model}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gray-200 rounded-full text-gray-600">
                    <div className="font-mono font-bold text-xs px-1">ABC</div>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase">Placa</p>
                    <p className="font-bold text-lg text-gray-900">{currentVehicle.plate}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 rounded-full text-green-600">
                    <Truck className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase">Quilometragem Atual</p>
                    <p className="font-bold text-lg text-gray-900">{latestKm}</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">Selecione um veículo para ver o histórico.</div>
            )}
          </CardContent>
        </Card>

        {/* History List */}
        {currentVehicle && (
          <div className="space-y-8">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-800">Histórico de Serviços</h3>
            </div>

            {vehicleHistory.length > 0 ? (
              vehicleHistory.map((os) => {
                const parts = os.items?.filter(i => i.item_type === 'product') || [];
                const services = os.items?.filter(i => i.item_type === 'service') || [];
                const externalServices = os.items?.filter(i => i.item_type === 'external_service') || [];

                return (
                  <Card key={os.id} className="overflow-hidden break-inside-avoid print:shadow-none print:border">
                    <div className="bg-gray-800 text-white px-6 py-3 flex flex-col sm:flex-row justify-between items-center gap-2">
                      <div className="flex items-center gap-3">
                         <Calendar className="w-5 h-5 text-gray-400" />
                         <span className="font-bold text-lg">
                            {format(new Date(os.created_at || os.order_date), 'dd/MM/yyyy')}
                         </span>
                         <span className="text-gray-400 text-sm font-normal ml-2">
                           (OS #{os.os_number})
                         </span>
                      </div>
                      <div className="flex items-center gap-2">
                         <span className="text-sm text-gray-300">KM na data:</span>
                         <span className="font-mono font-bold">{os.km ? os.km.toLocaleString() : 'N/A'}</span>
                      </div>
                    </div>

                    <CardContent className="p-6">
                      {/* Layout: Peças -> Serviços -> Serviços Externos */}
                      
                      <BreakdownSection 
                        title="Peças" 
                        icon={Package} 
                        items={parts} 
                        colorClass="text-blue-600 border-blue-100" 
                      />
                      
                      <BreakdownSection 
                        title="Serviços" 
                        icon={Wrench} 
                        items={services} 
                        colorClass="text-orange-600 border-orange-100" 
                      />
                      
                      <BreakdownSection 
                        title="Serviços Externos" 
                        icon={Truck} 
                        items={externalServices} 
                        colorClass="text-purple-600 border-purple-100" 
                      />

                      {/* Grand Total for this OS */}
                      <div className="mt-6 pt-4 border-t-2 border-gray-100 flex justify-end items-center gap-4">
                        <span className="text-gray-500 font-medium uppercase text-sm">Total Geral</span>
                        <span className="text-2xl font-bold text-gray-900">{formatCurrency(os.total_amount)}</span>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            ) : (
              <div className="text-center py-12 bg-white rounded-lg shadow-sm border">
                <Wrench className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <h3 className="text-lg font-medium text-gray-900">Nenhum histórico encontrado</h3>
                <p className="text-gray-500">Este veículo ainda não possui ordens de serviço registradas.</p>
                <Button onClick={handleScheduleService} variant="outline" className="mt-4">
                    Agendar Primeiro Serviço
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ClientVehicleHistory;