import React, { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { Car, User, Calendar, X, Truck, Package, Wrench, Info, Printer, Mail, MessageCircle, Download } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/utils';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

const VeiculoHistorico = ({ isOpen, onClose, vehicle }) => {
  const [history, setHistory] = useState(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const vehicleId = vehicle?.id;

  const fetchHistory = useCallback(async () => {
    if (!vehicleId) return;
    setLoading(true);
    try {
      // 1. Fetch Vehicle & Customer Data
      const { data: vehicleData, error: vehicleError } = await supabase
        .from('vehicles')
        .select(`*, customer:customers(*)`)
        .eq('id', vehicleId)
        .single();
        
      if (vehicleError) throw vehicleError;

      // 2. Fetch Work Orders
      const { data: woData, error: woError } = await supabase
        .from('work_orders')
        .select(`
          *,
          items:work_order_items(*)
        `)
        .eq('vehicle_id', vehicleId)
        .neq('status', 'Cancelada')
        .order('order_date', { ascending: false });

      if (woError) throw woError;

      // 3. Fetch Service Orders (Financial Data)
      let enrichedOsData = [];
      if (woData && woData.length > 0) {
         const ids = woData.map(wo => wo.id);
         const { data: soData, error: soError } = await supabase
            .from('service_orders')
            .select('id, os_number, total_amount')
            .in('id', ids);
            
         if (soError) throw soError;
         
         const soMap = (soData || []).reduce((acc, so) => {
            acc[so.id] = so;
            return acc;
         }, {});

         enrichedOsData = woData.map(wo => {
            const so = soMap[wo.id];
            const calculatedTotal = wo.items?.reduce((acc, item) => acc + (Number(item.total_price) || 0), 0) || 0;
            
            return {
               ...wo,
               os_number: so?.os_number, 
               total_amount: so?.total_amount ?? calculatedTotal
            };
         });
      }

      setHistory({
        vehicle: vehicleData,
        work_orders: enrichedOsData
      });

    } catch (error) {
      console.error("Error fetching history:", error);
      toast({ title: 'Erro ao carregar histórico', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [vehicleId, toast]);

  useEffect(() => {
    if (isOpen && vehicleId) {
      fetchHistory();
    }
  }, [isOpen, vehicleId, fetchHistory]);

  // Helper function to generate PDF document for both Save and Print actions
  const generatePDFDoc = () => {
    if (!history) return null;
    
    const doc = new jsPDF();
    const vehicleTitle = `${history.vehicle.brand} ${history.vehicle.model} - ${history.vehicle.plate}`;
    
    // Document Header
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Histórico do Veículo', 14, 15);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(vehicleTitle, 14, 22);
    doc.text(`Cliente: ${history.vehicle.customer?.name || 'N/A'}`, 14, 27);
    doc.text(`Gerado em: ${format(new Date(), 'dd/MM/yyyy')}`, 14, 32);
    
    let yPos = 40;

    history.work_orders.forEach((os) => {
      const parts = os.items?.filter(i => i.item_type === 'product') || [];
      const services = os.items?.filter(i => i.item_type === 'service') || [];
      const external = os.items?.filter(i => i.item_type === 'external_service') || [];

      // Check page break for OS Header
      if (yPos > 260) {
        doc.addPage();
        yPos = 20;
      }

      // OS Header Strip
      const dateStr = format(new Date(os.order_date || os.created_at), 'dd/MM/yyyy');
      const osNum = os.os_number || String(os.id).substring(0,6);
      
      doc.setFillColor(245, 245, 245); // Light gray background
      doc.rect(14, yPos, 182, 8, 'F');
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0);
      doc.text(`${dateStr}  |  OS #${osNum}  |  Total: ${formatCurrency(os.total_amount)}`, 16, yPos + 5.5);
      
      yPos += 15;

      // Helper to render a section table
      const renderSectionTable = (title, items) => {
        if (items.length === 0) return;

        // Check page break for Section Title
        if (yPos > 270) {
            doc.addPage();
            yPos = 20;
        }

        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(50);
        doc.text(title.toUpperCase(), 14, yPos);
        yPos += 2;

        const tableData = items.map(item => [
          item.description,
          String(item.quantity),
          formatCurrency(item.unit_price),
          formatCurrency(item.total_price)
        ]);

        doc.autoTable({
          startY: yPos,
          head: [['Descrição', 'Qtd', 'Unit.', 'Total']],
          body: tableData,
          margin: { left: 14 },
          theme: 'grid',
          styles: { fontSize: 8, cellPadding: 1.5, textColor: 50 },
          headStyles: { fillColor: [255, 255, 255], textColor: 0, fontStyle: 'bold', lineWidth: 0.1, lineColor: 200 },
          columnStyles: {
            0: { cellWidth: 'auto' },
            1: { cellWidth: 15, halign: 'center' },
            2: { cellWidth: 25, halign: 'right' },
            3: { cellWidth: 25, halign: 'right' }
          }
        });
        
        yPos = doc.lastAutoTable.finalY + 8;
      };

      // Render Sections in Order
      renderSectionTable('Peças', parts);
      renderSectionTable('Serviços', services);
      renderSectionTable('Serviços Externos', external);

      // Add some spacing after the OS block
      yPos += 5;
    });

    return doc;
  };

  const handlePrint = () => {
    const doc = generatePDFDoc();
    if (doc) {
       // Prepare PDF for auto-print
       doc.autoPrint();
       // Open generated PDF blob in new window to trigger print dialog
       const blob = doc.output('bloburl');
       window.open(blob, '_blank');
    }
  };

  const handleSavePDF = () => {
    const doc = generatePDFDoc();
    if (doc) {
        doc.save(`historico_${history.vehicle.plate}.pdf`);
        toast({ title: 'PDF Gerado', description: 'O download do histórico foi iniciado.' });
    }
  };

  const handleWhatsApp = () => {
    if (!history || !history.vehicle.customer?.phone) {
        toast({ title: 'Erro', description: 'Telefone do cliente não disponível.', variant: 'destructive' });
        return;
    }
    const message = `Olá ${history.vehicle.customer.name}, aqui está o histórico do seu veículo ${history.vehicle.brand} ${history.vehicle.model} (${history.vehicle.plate}).`;
    const whatsappUrl = `https://wa.me/55${history.vehicle.customer.phone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  const handleEmail = () => {
    if (!history || !history.vehicle.customer?.email) {
        toast({ title: 'Erro', description: 'Email do cliente não disponível.', variant: 'destructive' });
        return;
    }
    const subject = `Histórico do Veículo - ${history.vehicle.plate}`;
    const body = `Olá ${history.vehicle.customer.name},\n\nSegue resumo do histórico do veículo.`;
    window.location.href = `mailto:${history.vehicle.customer.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  const CleanSection = ({ title, items }) => {
    if (!items || items.length === 0) return null;
    
    return (
      <div className="mt-4 first:mt-0">
        <h4 className="text-xs font-bold uppercase text-gray-500 mb-2 tracking-wider">{title}</h4>
        <div className="border rounded-md overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-700 border-b">
              <tr>
                <th className="text-left py-2 px-3 font-semibold">Descrição</th>
                <th className="text-center py-2 px-3 font-semibold w-16">Qtd</th>
                <th className="text-right py-2 px-3 font-semibold w-24">Unit.</th>
                <th className="text-right py-2 px-3 font-semibold w-24">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {items.map((item, idx) => (
                <tr key={idx}>
                  <td className="py-2 px-3 text-gray-800">{item.description}</td>
                  <td className="text-center py-2 px-3 text-gray-600">{item.quantity}</td>
                  <td className="text-right py-2 px-3 text-gray-600">{formatCurrency(item.unit_price)}</td>
                  <td className="text-right py-2 px-3 font-medium text-gray-900">{formatCurrency(item.total_price)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent id="vehicle-history-content" className="w-full h-[90vh] max-w-4xl flex flex-col p-0 gap-0 bg-gray-50/50 overflow-hidden">
        
        {/* Header */}
        <DialogHeader className="p-6 border-b bg-white flex-none z-10">
          <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
            <div>
                <DialogTitle className="text-xl font-bold text-gray-900">Histórico do Veículo</DialogTitle>
                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500">
                    {history && (
                        <>
                           <span className="font-medium text-gray-900">{history.vehicle.brand} {history.vehicle.model}</span>
                           <span className="hidden sm:inline">•</span>
                           <span>{history.vehicle.plate}</span>
                           <span className="hidden sm:inline">•</span>
                           <span>{history.vehicle.customer?.name}</span>
                        </>
                    )}
                </div>
            </div>
            
            <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={handleSavePDF} title="Salvar PDF" className="h-8">
                    <Download className="w-4 h-4 sm:mr-2" />
                    <span className="hidden sm:inline">PDF</span>
                </Button>
                <Button variant="outline" size="sm" onClick={handleEmail} title="Email" className="h-8">
                    <Mail className="w-4 h-4 sm:mr-2" />
                    <span className="hidden sm:inline">Email</span>
                </Button>
                <Button variant="outline" size="sm" onClick={handleWhatsApp} title="WhatsApp" className="h-8">
                    <MessageCircle className="w-4 h-4 sm:mr-2" />
                    <span className="hidden sm:inline">WhatsApp</span>
                </Button>
                <Button variant="outline" size="sm" onClick={handlePrint} title="Imprimir" className="h-8">
                    <Printer className="w-4 h-4 sm:mr-2" />
                    <span className="hidden sm:inline">Imprimir</span>
                </Button>
                <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 rounded-full">
                    <X className="w-5 h-5" />
                </Button>
            </div>
          </div>
        </DialogHeader>
        
        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
             <div className="flex flex-col items-center justify-center h-full space-y-4">
                <div className="animate-spin rounded-full h-8 w-8 border-4 border-gray-300 border-t-blue-600"></div>
                <p className="text-sm text-gray-500">Carregando...</p>
             </div>
          ) : history && history.work_orders.length > 0 ? (
            <div className="space-y-6 max-w-4xl mx-auto">
              {history.work_orders.map((os) => {
                const parts = os.items?.filter(i => i.item_type === 'product') || [];
                const services = os.items?.filter(i => i.item_type === 'service') || [];
                const external = os.items?.filter(i => i.item_type === 'external_service') || [];

                return (
                  <div key={os.id} className="bg-white rounded-lg border shadow-sm">
                    {/* OS Header Strip */}
                    <div className="bg-gray-50 border-b px-4 py-3 flex flex-wrap justify-between items-center gap-2">
                       <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2">
                             <Calendar className="w-4 h-4 text-gray-400" />
                             <span className="font-bold text-gray-900 text-base">
                                {format(new Date(os.order_date || os.created_at), 'dd/MM/yyyy')}
                             </span>
                          </div>
                          <div className="h-4 w-px bg-gray-300 hidden sm:block"></div>
                          <span className="font-bold text-gray-900 text-base">
                             OS #{os.os_number || String(os.id).substring(0,6)}
                          </span>
                       </div>
                       <div className="flex items-center gap-4 text-sm">
                          <div className="text-gray-500">
                             KM: <span className="font-semibold text-gray-900">{os.km ? os.km.toLocaleString() : '--'}</span>
                          </div>
                          <div className="font-bold text-gray-900 bg-white px-2 py-1 rounded border text-base">
                             {formatCurrency(os.total_amount)}
                          </div>
                       </div>
                    </div>

                    {/* Content Sections */}
                    <div className="p-4 sm:p-6 space-y-6">
                       <CleanSection title="Peças" items={parts} />
                       <CleanSection title="Serviços" items={services} />
                       <CleanSection title="Serviços Externos" items={external} />
                       
                       {/* Empty State within OS if no items */}
                       {(!parts.length && !services.length && !external.length) && (
                           <p className="text-center text-gray-400 italic text-sm py-2">Sem itens registrados</p>
                       )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-gray-500">
                <div className="bg-gray-100 p-4 rounded-full mb-3">
                    <Wrench className="w-8 h-8 text-gray-400" />
                </div>
                <p>Nenhum histórico encontrado.</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default VeiculoHistorico;