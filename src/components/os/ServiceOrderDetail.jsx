import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/lib/customSupabaseClient';
import { Printer, MessageSquare, FileText, CreditCard, Ban, CheckCircle, Clock, XCircle, Box, History } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import ServiceOrderCancelDialog from './ServiceOrderCancelDialog';
import SendServiceOrderDialog from './actions/SendServiceOrderDialog';
import PrintServiceOrder from './actions/PrintServiceOrder';
import GenerateInvoiceDialog from './actions/GenerateInvoiceDialog';
import RegisterPaymentDialog from './actions/RegisterPaymentDialog';
import StockMovementHistory from './StockMovementHistory'; 
import AuditTrail from './AuditTrail'; 
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { formatCurrency, formatOSNumber } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const ServiceOrderDetail = ({ isOpen, onClose, osId, onUpdate }) => {
  const [osData, setOsData] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Dialog States
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showSendDialog, setShowSendDialog] = useState(false);
  const [showPrintDialog, setShowPrintDialog] = useState(false);
  const [showInvoiceDialog, setShowInvoiceDialog] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen && osId) {
      fetchOSDetails();
    }
  }, [isOpen, osId]);

  const fetchOSDetails = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('service_orders')
        .select(`
          *,
          budget:budgets (
            *,
            customer:customers (*),
            vehicle:vehicles (*),
            items:budget_items (
              *,
              product_variant:product_variants (
                *,
                product:products (description)
              )
            )
          ),
          receivables:accounts_receivable (*)
        `)
        .eq('id', osId)
        .maybeSingle(); // FIX: Changed .single() to .maybeSingle()

      if (error) throw error;
      if (!data) {
          toast({ title: 'Não encontrado', description: 'A OS solicitada não foi encontrada.', variant: 'warning' });
          onClose();
          return;
      }
      setOsData(data);
    } catch (error) {
      console.error('Error fetching OS details:', error);
      toast({ title: 'Erro ao carregar detalhes', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Aberta': return <Badge className="bg-green-500 hover:bg-green-600">Aberta</Badge>;
      case 'Cancelada': return <Badge variant="destructive">Cancelada</Badge>;
      case 'Concluída': return <Badge className="bg-blue-500 hover:bg-blue-600">Concluída</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0">
          <DialogHeader className="p-6 border-b bg-gray-50/50">
            <div className="flex justify-between items-start">
              <div>
                <DialogTitle className="text-2xl font-bold flex items-center gap-3">
                  OS {formatOSNumber(osData?.os_number)}
                  {!loading && osData && getStatusBadge(osData.status)}
                </DialogTitle>
                <DialogDescription className="mt-1">
                  Criada em {osData?.created_at && format(new Date(osData.created_at), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}
                </DialogDescription>
              </div>
              {!loading && osData?.status === 'Aberta' && (
                <Button variant="destructive" size="sm" onClick={() => setShowCancelDialog(true)}>
                  <Ban className="w-4 h-4 mr-2" /> Cancelar OS
                </Button>
              )}
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              </div>
            ) : osData ? (
              <Tabs defaultValue="details" className="h-full flex flex-col">
                 <div className="px-6 pt-4">
                    <TabsList className="grid grid-cols-4 w-full">
                        <TabsTrigger value="details">Detalhes</TabsTrigger>
                        <TabsTrigger value="stock"><Box className="w-4 h-4 mr-2"/>Estoque</TabsTrigger>
                        <TabsTrigger value="audit"><History className="w-4 h-4 mr-2"/>Auditoria</TabsTrigger>
                        <TabsTrigger value="logs"><Clock className="w-4 h-4 mr-2"/>Histórico</TabsTrigger>
                    </TabsList>
                 </div>
                 
                 <ScrollArea className="flex-1">
                     <TabsContent value="details" className="p-6 space-y-8 mt-0">
                        {/* Customer & Vehicle Info */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="p-4 border rounded-lg bg-white shadow-sm">
                            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                                <CheckCircle className="w-4 h-4 text-gray-500" /> Cliente
                            </h3>
                            <div className="space-y-1 text-sm">
                                <p><span className="font-medium text-gray-500">Nome:</span> {osData.budget?.customer?.name}</p>
                                <p><span className="font-medium text-gray-500">Telefone:</span> {osData.budget?.customer?.phone || 'N/A'}</p>
                                <p><span className="font-medium text-gray-500">Email:</span> {osData.budget?.customer?.email || 'N/A'}</p>
                            </div>
                            </div>
                            <div className="p-4 border rounded-lg bg-white shadow-sm">
                            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                                <CheckCircle className="w-4 h-4 text-gray-500" /> Veículo
                            </h3>
                            <div className="space-y-1 text-sm">
                                <p><span className="font-medium text-gray-500">Modelo:</span> {osData.budget?.vehicle?.brand} {osData.budget?.vehicle?.model}</p>
                                <p><span className="font-medium text-gray-500">Placa:</span> {osData.budget?.vehicle?.plate}</p>
                                <p><span className="font-medium text-gray-500">KM:</span> {osData.budget?.km || 'N/A'}</p>
                            </div>
                            </div>
                        </div>

                        {/* Financial Status */}
                        <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                            <div className="flex justify-between items-start">
                                <h3 className="font-semibold text-blue-900 mb-2">Status Financeiro</h3>
                                {osData.invoice_info && osData.invoice_info.number && (
                                    <Badge variant="secondary" className="bg-white text-blue-800">NF: {osData.invoice_info.number}</Badge>
                                )}
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                            {osData.receivables && osData.receivables.length > 0 ? (
                                osData.receivables.map(rec => (
                                <React.Fragment key={rec.id}>
                                    <div><span className="text-blue-700">Valor:</span> <span className="font-bold">{formatCurrency(rec.amount)}</span></div>
                                    <div><span className="text-blue-700">Vencimento:</span> {format(new Date(rec.due_date), 'dd/MM/yyyy')}</div>
                                    <div><span className="text-blue-700">Status:</span> <Badge variant="outline" className={`ml-1 ${rec.status === 'Pago' ? 'bg-green-100 text-green-800' : 'bg-white'}`}>{rec.status}</Badge></div>
                                </React.Fragment>
                                ))
                            ) : (
                                <p className="text-blue-600 italic">Nenhum registro financeiro encontrado.</p>
                            )}
                            </div>
                        </div>

                        {/* Items Table */}
                        <div>
                            <h3 className="font-semibold text-gray-900 mb-4">Itens do Serviço</h3>
                            <div className="border rounded-lg overflow-hidden">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-gray-50 text-gray-500 font-medium">
                                <tr>
                                    <th className="px-4 py-3">Item</th>
                                    <th className="px-4 py-3 text-center">Qtd</th>
                                    <th className="px-4 py-3 text-right">Unitário</th>
                                    <th className="px-4 py-3 text-right">Total</th>
                                </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                {osData.budget?.items?.map((item) => (
                                    <tr key={item.id}>
                                    <td className="px-4 py-3">
                                        {item.item_type === 'product' && item.product_variant 
                                        ? `${item.product_variant.product.description} (${item.product_variant.variant_code})`
                                        : item.description}
                                        <div className="text-xs text-gray-400 capitalize">{item.item_type === 'product' ? 'Peça' : 'Serviço'}</div>
                                    </td>
                                    <td className="px-4 py-3 text-center">{item.quantity}</td>
                                    <td className="px-4 py-3 text-right">{formatCurrency(item.unit_price)}</td>
                                    <td className="px-4 py-3 text-right font-medium">{formatCurrency(item.quantity * item.unit_price)}</td>
                                    </tr>
                                ))}
                                </tbody>
                                <tfoot className="bg-gray-50 font-semibold">
                                <tr>
                                    <td colSpan="3" className="px-4 py-3 text-right">Total Geral</td>
                                    <td className="px-4 py-3 text-right text-lg">{formatCurrency(osData.total_amount)}</td>
                                </tr>
                                </tfoot>
                            </table>
                            </div>
                        </div>
                     </TabsContent>

                     <TabsContent value="stock" className="p-6 mt-0">
                        <StockMovementHistory osId={osData.id} />
                     </TabsContent>

                     <TabsContent value="audit" className="p-6 mt-0">
                        <AuditTrail entityId={osData.id} entityType="OS" />
                     </TabsContent>

                     <TabsContent value="logs" className="p-6 mt-0">
                        {osData.conversion_history && osData.conversion_history.length > 0 ? (
                            <div className="space-y-3">
                                {osData.conversion_history.map((entry, idx) => (
                                <div key={idx} className="flex items-start gap-3 border-b border-gray-200 pb-2 last:border-0 last:pb-0">
                                    {entry.action === 'conversion' ? <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" /> : <XCircle className="w-4 h-4 text-red-500 mt-0.5" />}
                                    <div>
                                    <p className="font-medium text-gray-900 capitalize">{entry.action === 'conversion' ? 'Convertido de Orçamento' : 'Cancelado'}</p>
                                    <p className="text-gray-500 text-xs">{format(new Date(entry.date), "dd/MM/yyyy 'às' HH:mm")}</p>
                                    {entry.reason && <p className="text-red-600 mt-1 italic">"{entry.reason}"</p>}
                                    </div>
                                </div>
                                ))}
                            </div>
                        ) : (
                             <p className="text-gray-500 text-sm">Nenhum histórico simplificado disponível.</p>
                        )}
                     </TabsContent>
                 </ScrollArea>
              </Tabs>
            ) : (
              <div className="p-6 text-center text-gray-500">Dados não encontrados.</div>
            )}
          </div>

          <DialogFooter className="p-6 border-t bg-gray-50/50 flex-col sm:flex-row gap-3">
            <div className="flex flex-1 gap-3 overflow-x-auto pb-2 sm:pb-0">
              <Button variant="outline" size="sm" onClick={() => setShowPrintDialog(true)} disabled={!osData}><Printer className="w-4 h-4 mr-2" /> Imprimir</Button>
              <Button variant="outline" size="sm" onClick={() => setShowSendDialog(true)} disabled={!osData}><MessageSquare className="w-4 h-4 mr-2" /> Enviar</Button>
              <Button variant="outline" size="sm" onClick={() => setShowInvoiceDialog(true)} disabled={!osData}><FileText className="w-4 h-4 mr-2" /> NFe</Button>
              <Button variant="outline" size="sm" onClick={() => setShowPaymentDialog(true)} disabled={!osData || osData.receivables?.[0]?.status === 'Pago'}><CreditCard className="w-4 h-4 mr-2" /> Receber</Button>
            </div>
            <Button variant="default" onClick={onClose}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {showCancelDialog && osData && (
        <ServiceOrderCancelDialog isOpen={showCancelDialog} onClose={() => setShowCancelDialog(false)} osId={osData.id} osNumber={osData.os_number} onSuccess={() => { setShowCancelDialog(false); fetchOSDetails(); if(onUpdate) onUpdate(); }} />
      )}
      {showSendDialog && osData && (
        <SendServiceOrderDialog isOpen={showSendDialog} onClose={() => setShowSendDialog(false)} osData={osData} />
      )}
      {showPrintDialog && osData && (
        <PrintServiceOrder isOpen={showPrintDialog} onClose={() => setShowPrintDialog(false)} osData={osData} />
      )}
      {showInvoiceDialog && osData && (
        <GenerateInvoiceDialog isOpen={showInvoiceDialog} onClose={() => setShowInvoiceDialog(false)} osData={osData} onSuccess={fetchOSDetails} />
      )}
      {showPaymentDialog && osData && (
        <RegisterPaymentDialog isOpen={showPaymentDialog} onClose={() => setShowPaymentDialog(false)} osData={osData} onSuccess={fetchOSDetails} />
      )}
    </>
  );
};

export default ServiceOrderDetail;