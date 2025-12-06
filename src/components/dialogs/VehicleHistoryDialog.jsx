import React, { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { FileText, Wrench, Package, Camera, User, Download, FilePlus, X } from 'lucide-react';
import { useCSVDownloader } from 'react-papaparse';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

const VehicleHistoryDialog = ({ isOpen, onClose, vehicle, customer }) => {
  const [history, setHistory] = useState({ workOrders: [], quotes: [], photos: [] });
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { CSVDownloader } = useCSVDownloader();

  const loadHistory = useCallback(async () => {
    if (!vehicle) return;
    setLoading(true);
    try {
      const { data: workOrders, error: osError } = await supabase
        .from('work_orders')
        .select(`
          *, 
          items:work_order_items(*, collaborator:collaborators(name)),
          photos:work_order_photos(*)
        `)
        .eq('vehicle_id', vehicle.id).order('order_date', { ascending: false });
      if (osError) throw osError;

      const { data: quotes, error: quoteError } = await supabase
        .from('budgets').select(`*`).eq('vehicle_id', vehicle.id).order('created_at', { ascending: false });
      if (quoteError) throw quoteError;
      
      const allPhotos = (workOrders || []).flatMap(os => os.photos.map(p => ({ ...p, source: `OS #${os.id.substring(0,5)}` })));
      if (vehicle.photo_url) {
        allPhotos.unshift({ photo_url: vehicle.photo_url, source: 'Foto Principal' });
      }

      setHistory({ workOrders: workOrders || [], quotes: quotes || [], photos: allPhotos });
    } catch (error) {
      toast({ title: 'Erro ao carregar histórico', description: error.message, variant: 'destructive' });
    } finally { setLoading(false); }
  }, [vehicle, toast]);

  useEffect(() => {
    if (isOpen) loadHistory();
  }, [isOpen, loadHistory]);

  const formatCurrency = (value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);

  const exportOS_CSV = () => {
    const data = history.workOrders.flatMap(os => 
      os.items.map(item => ({
        os_id: os.id,
        os_date: os.order_date,
        os_status: os.status,
        item_description: item.description,
        item_type: item.item_type,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.total_price,
        mechanic: item.collaborator?.name || 'N/A'
      }))
    );
    return data;
  }

  const exportOS_PDF = () => {
    const doc = new jsPDF();
    doc.text(`Histórico de Ordens de Serviço - Veículo ${vehicle.plate}`, 14, 15);
    doc.text(`Cliente: ${customer.name}`, 14, 22);
    
    const tableData = history.workOrders.map(os => {
        const total = os.items.reduce((sum, item) => sum + (item.total_price || 0), 0);
        return [
            new Date(os.order_date).toLocaleDateString(),
            os.status,
            os.items.map(i => i.description).join(', '),
            formatCurrency(total)
        ];
    });
    
    doc.autoTable({
        startY: 30,
        head: [['Data', 'Status', 'Itens', 'Custo Total']],
        body: tableData,
    });
    doc.save(`historico_${vehicle.plate}.pdf`);
  };

  // Responsive classes
  const BUTTON_CLASS = "w-full sm:w-auto h-11 sm:h-9 px-6 sm:px-4 text-base sm:text-sm";

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-full h-full max-w-none sm:w-3/4 sm:max-w-none md:w-full md:h-full rounded-none sm:rounded-lg flex flex-col p-0 gap-0 bg-white">
        <DialogHeader className="p-4 sm:p-6 border-b flex-none flex-row justify-between items-start">
          <div>
            <DialogTitle className="text-lg sm:text-xl flex items-center">
               <FileText className="w-6 h-6 mr-3 text-blue-600"/> Histórico do Veículo: {vehicle?.plate}
            </DialogTitle>
            <DialogDescription className="text-base sm:text-sm">{vehicle?.brand} {vehicle?.model} ({vehicle?.year}) - {customer?.name}</DialogDescription>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="-mt-2 -mr-2 sm:mt-0 sm:mr-0"><X className="w-5 h-5" /></Button>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {loading ? (
            <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>
          ) : (
            <Tabs defaultValue="os" className="w-full">
              <TabsList className="grid w-full grid-cols-3 h-11 sm:h-10">
                <TabsTrigger value="os" className="text-xs sm:text-sm">O.S. ({history.workOrders.length})</TabsTrigger>
                <TabsTrigger value="quotes" className="text-xs sm:text-sm">Orç. ({history.quotes.length})</TabsTrigger>
                <TabsTrigger value="photos" className="text-xs sm:text-sm">Fotos ({history.photos.length})</TabsTrigger>
              </TabsList>
              <TabsContent value="os" className="pt-4 space-y-4">
                <div className="flex justify-end gap-2 mb-4 flex-col sm:flex-row">
                   <CSVDownloader data={exportOS_CSV} filename={`historico_os_${vehicle.plate}`} className="w-full sm:w-auto"><Button variant="outline" size="sm" className={BUTTON_CLASS}><Download className="w-4 h-4 mr-2" /> Exportar CSV</Button></CSVDownloader>
                   <Button variant="outline" size="sm" onClick={exportOS_PDF} className={BUTTON_CLASS}><Download className="w-4 h-4 mr-2" /> Exportar PDF</Button>
                </div>
                <div className="space-y-4">
                  {history.workOrders.map(os => {
                     const total = os.items.reduce((sum, item) => sum + (item.total_price || 0), 0);
                     return (
                    <div key={os.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-semibold text-base sm:text-lg">OS #{String(os.id).substring(0,5)} - {new Date(os.order_date).toLocaleDateString('pt-BR')}</h4>
                          <p className={`text-sm font-bold ${os.status === 'completed' ? 'text-green-600' : 'text-orange-500'}`}>{os.status}</p>
                        </div>
                        <p className="font-bold text-base sm:text-lg">{formatCurrency(total)}</p>
                      </div>
                      <div className="mt-4 space-y-2 text-sm">
                        <div className="flex items-start"><Wrench className="w-4 h-4 mr-2 mt-1 text-blue-500 shrink-0" /><p><strong className="font-medium">Serviços:</strong> {os.items.filter(i => i.item_type === 'service').map(i => i.description).join(', ') || 'N/A'}</p></div>
                        <div className="flex items-start"><Package className="w-4 h-4 mr-2 mt-1 text-green-500 shrink-0" /><p><strong className="font-medium">Peças:</strong> {os.items.filter(i => i.item_type === 'product').map(i => `${i.quantity}x ${i.description}`).join(', ') || 'N/A'}</p></div>
                        <div className="flex items-start"><User className="w-4 h-4 mr-2 mt-1 text-gray-500 shrink-0" /><p><strong className="font-medium">Mecânicos:</strong> {[...new Set(os.items.map(i => i.collaborator?.name).filter(Boolean))].join(', ') || 'N/A'}</p></div>
                      </div>
                      {os.photos.length > 0 && <p className="text-xs text-blue-600 mt-2 flex items-center gap-1"><Camera className="w-3 h-3" /> Esta OS possui fotos.</p>}
                    </div>
                  )})}
                  {history.workOrders.length === 0 && <p className="text-center text-gray-500 py-8">Nenhuma ordem de serviço encontrada.</p>}
                </div>
              </TabsContent>
              <TabsContent value="quotes" className="pt-4">
                <div className="space-y-4">
                  {history.quotes.map(quote => (
                     <div key={quote.id} className="border rounded-lg p-4 flex justify-between items-center">
                       <div>
                         <h4 className="font-semibold text-base sm:text-lg">Orçamento #{String(quote.id).substring(0,5)} - {new Date(quote.created_at).toLocaleDateString('pt-BR')}</h4>
                         <p className={`text-sm font-bold ${quote.status === 'approved' ? 'text-green-600' : 'text-gray-500'}`}>{quote.status}</p>
                       </div>
                       <p className="font-bold text-base sm:text-lg">{formatCurrency(quote.total_cost)}</p>
                     </div>
                  ))}
                  {history.quotes.length === 0 && <p className="text-center text-gray-500 py-8">Nenhum orçamento encontrado.</p>}
                </div>
              </TabsContent>
              <TabsContent value="photos" className="pt-4">
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                      {history.photos.map((photo, index) => (
                          <a href={photo.photo_url} target="_blank" rel="noopener noreferrer" key={index} className="relative group">
                              <img src={photo.photo_url} alt={`Foto ${index + 1}`} className="w-full h-32 object-cover rounded-lg"/>
                              <div className="absolute bottom-0 left-0 bg-black/50 text-white text-xs w-full p-1 rounded-b-lg">{photo.source}</div>
                          </a>
                      ))}
                      {history.photos.length === 0 && <p className="col-span-full text-center py-8 text-gray-500">Nenhuma foto encontrada.</p>}
                  </div>
              </TabsContent>
            </Tabs>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default VehicleHistoryDialog;