import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/lib/customSupabaseClient';
import { 
  Car, Wrench, Calendar, User, Phone, Mail, MapPin, 
  AlertCircle, ArrowRight, CalendarPlus, History, Clock, Filter,
  FileText, FileSpreadsheet, CheckCircle, XCircle, Loader2, 
  Mail as MailIcon, Printer, Download
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { generateDocumentPDF } from '@/services/pdfService.js';

// Moved CleanSection outside to prevent re-creation on render
const CleanSection = ({ title, items }) => {
  if (!items || !Array.isArray(items) || items.length === 0) return null;
  
  const formatCurrency = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);

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

const VehicleHistoryModal = ({ isOpen, onClose, vehicle, workOrders }) => {
  const vehicleOrders = useMemo(() => {
    if (!vehicle || !workOrders) return [];
    return workOrders.filter(wo => wo.vehicle_id === vehicle.id);
  }, [vehicle, workOrders]);

  const formatCurrency = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto bg-slate-50">
        <DialogHeader>
          <DialogTitle>Histórico do Veículo</DialogTitle>
          <DialogDescription>
            {vehicle?.brand} {vehicle?.model} - {vehicle?.plate}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6 mt-4">
           {vehicleOrders.length > 0 ? vehicleOrders.map(os => {
             const items = Array.isArray(os.items) ? os.items : [];
             const parts = items.filter(i => i.item_type === 'product');
             const services = items.filter(i => i.item_type === 'service');
             const external = items.filter(i => i.item_type === 'external_service');

             return (
               <div key={os.id} className="bg-white rounded-lg border shadow-sm">
                  <div className="bg-gray-50 border-b px-4 py-3 flex flex-wrap justify-between items-center gap-2">
                     <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                           <Calendar className="w-4 h-4 text-gray-400" />
                           <span className="font-bold text-gray-900 text-base">
                              {format(new Date(os.created_at || os.order_date), 'dd/MM/yyyy')}
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

                  <div className="p-4 sm:p-6 space-y-6">
                     <CleanSection title="Peças" items={parts} />
                     <CleanSection title="Serviços" items={services} />
                     <CleanSection title="Serviços Externos" items={external} />
                     
                     {(!parts.length && !services.length && !external.length) && (
                         <p className="text-center text-gray-400 italic text-sm py-2">Sem itens registrados</p>
                     )}
                  </div>
               </div>
             )
           }) : (
             <div className="flex flex-col items-center justify-center py-12 text-center bg-white rounded-lg border border-dashed">
               <History className="w-12 h-12 text-slate-200 mb-2" />
               <p className="text-gray-500">Nenhum histórico de serviços encontrado para este veículo.</p>
             </div>
           )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

const BudgetDetailsModal = ({ budget, token, onUpdate }) => {
  const { toast } = useToast();
  const [loadingAction, setLoadingAction] = useState(false);
  const [loadingPdf, setLoadingPdf] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [sendCopy, setSendCopy] = useState(false);

  if (!budget) return null;
  
  const items = Array.isArray(budget.items) ? budget.items : [];
  const parts = items.filter(i => i.item_type === 'product');
  const services = items.filter(i => i.item_type === 'service');
  const external = items.filter(i => i.item_type === 'external_service');
  
  const formatCurrency = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);
  
  const canAction = budget.status === 'pending';

  const handlePrint = async () => {
    setLoadingPdf(true);
    try {
      const doc = await generateDocumentPDF(budget.id, 'orcamento');
      doc.autoPrint();
      doc.output('dataurlnewwindow');
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast({ title: "Erro", description: "Erro ao gerar PDF para impressão.", variant: "destructive" });
    } finally {
      setLoadingPdf(false);
    }
  };

  const handleDownload = async () => {
    setLoadingPdf(true);
    try {
      const doc = await generateDocumentPDF(budget.id, 'orcamento');
      doc.save(`Orcamento_${budget.budget_number}.pdf`);
      toast({ title: "Sucesso", description: "Download do PDF iniciado." });
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast({ title: "Erro", description: "Erro ao baixar PDF.", variant: "destructive" });
    } finally {
      setLoadingPdf(false);
    }
  };

  const handleAction = async (status, reason = null) => {
      setLoadingAction(true);
      try {
          const { data, error } = await supabase.rpc('update_client_budget_status', {
              p_token: token,
              p_budget_id: budget.id,
              p_status: status,
              p_reason: reason,
              p_send_email: sendCopy
          });

          if (error) throw error;

          if (data && data.success) {
              toast({
                  title: status === 'approved' ? "Orçamento Aprovado!" : "Orçamento Rejeitado",
                  description: data.message,
                  variant: status === 'approved' ? "default" : "destructive",
                  className: status === 'approved' ? "bg-green-600 text-white" : ""
              });
              setShowRejectDialog(false);
              if (onUpdate) onUpdate();
          } else {
              throw new Error(data?.message || "Erro ao atualizar status.");
          }
      } catch (error) {
          console.error(error);
          toast({
              title: "Erro",
              description: error.message || "Não foi possível atualizar o orçamento.",
              variant: "destructive"
          });
      } finally {
          setLoadingAction(false);
      }
  };

  return (
    <DialogContent className="max-w-3xl md:max-w-4xl lg:max-w-5xl xl:max-w-6xl max-h-[80vh] overflow-y-auto bg-slate-50">
      <DialogHeader>
        <DialogTitle>Detalhes do Orçamento #{budget.budget_number}</DialogTitle>
        <DialogDescription>
           Criado em {format(new Date(budget.created_at), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-6 mt-4">
         <div className="bg-white rounded-lg border shadow-sm p-4">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-8 gap-y-2 text-sm w-full md:w-auto">
                    <div>
                        <span className="text-gray-500 block">Veículo</span>
                        <span className="font-medium text-gray-900">
                            {budget.vehicle_description || 'N/A'}
                        </span>
                    </div>
                    <div>
                        <span className="text-gray-500 block">Status Atual</span>
                        <Badge variant={budget.status === 'approved' ? 'success' : budget.status === 'rejected' ? 'destructive' : 'outline'} className="mt-1">
                            {budget.status === 'pending' ? 'Pendente de Aprovação' : 
                             budget.status === 'approved' ? 'Aprovado' : 
                             budget.status === 'rejected' ? 'Rejeitado' : budget.status}
                        </Badge>
                    </div>
                    <div>
                        <span className="text-gray-500 block">Valor Total</span>
                        <span className="font-bold text-green-700 text-lg">{formatCurrency(budget.total_cost)}</span>
                    </div>
                </div>

                <div className="flex flex-wrap gap-2 w-full md:w-auto justify-end">
                    <Button 
                        variant="outline" 
                        onClick={handlePrint} 
                        disabled={loadingPdf || loadingAction}
                        className="flex-1 md:flex-none"
                        title="Imprimir Orçamento"
                    >
                        {loadingPdf ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4 mr-2" />}
                        Imprimir
                    </Button>
                    <Button 
                        variant="outline" 
                        onClick={handleDownload} 
                        disabled={loadingPdf || loadingAction}
                        className="flex-1 md:flex-none"
                        title="Salvar PDF"
                    >
                        {loadingPdf ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
                        Salvar
                    </Button>

                    {canAction && (
                        <>
                            <Button 
                                variant="outline" 
                                className="border-red-200 text-red-700 hover:bg-red-50 flex-1 md:flex-none"
                                onClick={() => setShowRejectDialog(true)}
                                disabled={loadingAction || loadingPdf}
                            >
                                {loadingAction ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4 mr-2" />}
                                Rejeitar
                            </Button>
                            <Button 
                                className="bg-green-600 hover:bg-green-700 text-white flex-1 md:flex-none"
                                onClick={() => handleAction('approved')}
                                disabled={loadingAction || loadingPdf}
                            >
                                {loadingAction ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-2" />}
                                Aprovar
                            </Button>
                        </>
                    )}
                </div>
            </div>
            
            {canAction && !showRejectDialog && (
                <div className="mt-4 pt-3 border-t flex items-center gap-2">
                    <Checkbox id="sendCopyMain" checked={sendCopy} onCheckedChange={setSendCopy} />
                    <Label htmlFor="sendCopyMain" className="text-sm text-gray-600 cursor-pointer flex items-center gap-1">
                        <MailIcon className="w-3 h-3" /> Enviar cópia da resposta por email
                    </Label>
                </div>
            )}
         </div>
         
         {showRejectDialog && (
             <div className="bg-red-50 border border-red-100 rounded-lg p-4 animate-in fade-in slide-in-from-top-2">
                 <h4 className="text-sm font-bold text-red-800 mb-2">Motivo da Rejeição</h4>
                 <Textarea 
                    placeholder="Por favor, nos informe o motivo da rejeição para que possamos melhorar..."
                    className="bg-white mb-3"
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                 />
                 <div className="flex items-center justify-between">
                     <div className="flex items-center gap-2">
                        <Checkbox id="sendCopyReject" checked={sendCopy} onCheckedChange={setSendCopy} />
                        <Label htmlFor="sendCopyReject" className="text-sm text-red-800 cursor-pointer">Enviar cópia por email</Label>
                     </div>
                     <div className="flex gap-2">
                         <Button variant="ghost" size="sm" onClick={() => setShowRejectDialog(false)}>Cancelar</Button>
                         <Button variant="destructive" size="sm" onClick={() => handleAction('rejected', rejectReason)} disabled={loadingAction}>
                            Confirmar Rejeição
                         </Button>
                     </div>
                 </div>
             </div>
         )}

         <div className="bg-white rounded-lg border shadow-sm p-4 sm:p-6 space-y-6">
             <CleanSection title="Peças" items={parts} />
             <CleanSection title="Serviços" items={services} />
             <CleanSection title="Serviços Externos" items={external} />
             
             {(!parts.length && !services.length && !external.length) && (
                 <p className="text-center text-gray-400 italic text-sm py-2">Sem itens registrados</p>
             )}
         </div>
      </div>
    </DialogContent>
  );
};

const ClientPortal = () => {
  const { token } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [selectedVehicleFilter, setSelectedVehicleFilter] = useState('all');
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [activeVehicleHistory, setActiveVehicleHistory] = useState(null);
  const [selectedBudget, setSelectedBudget] = useState(null);
  const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false);

  const fetchData = async () => {
      try {
        if (refreshTrigger === 0) setLoading(true);
        if (!token) throw new Error('Token de acesso inválido.');

        const { data: result, error: rpcError } = await supabase.rpc('get_client_portal_data', {
          p_token: token
        });

        if (rpcError) {
            console.error("RPC Error:", rpcError);
            throw new Error("Erro de conexão ao buscar dados do portal.");
        }

        if (!result || !result.valid) {
            throw new Error(result?.message || 'Acesso inválido ou expirado.');
        }

        setData(result);
      } catch (err) {
        console.error('Error fetching portal data:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
  };

  useEffect(() => {
    if (token) {
      fetchData();
    }
  }, [token, refreshTrigger]);

  useEffect(() => {
    if (data?.budgets && searchParams.get('open_budget') && !isBudgetModalOpen && !selectedBudget) {
         const budgetId = searchParams.get('open_budget');
         const found = data.budgets.find(b => b.id === budgetId);
         if (found) {
             setSelectedBudget(found);
             setIsBudgetModalOpen(true);
         }
    }
  }, [data, searchParams, isBudgetModalOpen, selectedBudget]); 

  useEffect(() => {
      if (selectedBudget && data?.budgets) {
          const updated = data.budgets.find(b => b.id === selectedBudget.id);
          if (updated && JSON.stringify(updated) !== JSON.stringify(selectedBudget)) {
              setSelectedBudget(updated);
          }
      }
  }, [data]);

  const handleDataUpdate = () => setRefreshTrigger(prev => prev + 1);

  const filteredWorkOrders = useMemo(() => {
    const work_orders = data?.work_orders || [];
    if (!Array.isArray(work_orders)) return [];
    if (selectedVehicleFilter === 'all') return work_orders;
    return work_orders.filter(wo => wo.vehicle_id === selectedVehicleFilter);
  }, [data, selectedVehicleFilter]);

  const handleNewAppointment = () => navigate('/agendar');

  const handleOpenHistory = (vehicle) => {
    setActiveVehicleHistory(vehicle);
    setIsHistoryModalOpen(true);
  };
  
  const handleOpenBudget = (budget) => {
      setSelectedBudget(budget);
      setIsBudgetModalOpen(true);
  };

  const formatCurrency = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);

  const getStatusBadge = (status) => {
    const styles = {
      'completed': 'bg-green-100 text-green-800 border-green-200 hover:bg-green-200',
      'in_progress': 'bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-200',
      'pending': 'bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-200',
      'canceled': 'bg-red-100 text-red-800 border-red-200 hover:bg-red-200',
      'waiting_parts': 'bg-orange-100 text-orange-800 border-orange-200 hover:bg-orange-200',
      'Aberta': 'bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-200',
      'Cancelada': 'bg-red-100 text-red-800 border-red-200 hover:bg-red-200',
      'confirmed': 'bg-green-100 text-green-800 border-green-200 hover:bg-green-200',
      'approved': 'bg-green-100 text-green-800 border-green-200',
      'converted': 'bg-purple-100 text-purple-800 border-purple-200',
      'rejected': 'bg-red-100 text-red-800 border-red-200'
    };
    
    const labels = {
      'completed': 'Concluído',
      'in_progress': 'Em Andamento',
      'pending': 'Pendente',
      'canceled': 'Cancelado',
      'waiting_parts': 'Aguardando Peças',
      'Aberta': 'Aberta',
      'Cancelada': 'Cancelada',
      'confirmed': 'Confirmado',
      'approved': 'Aprovado',
      'converted': 'Convertido em OS',
      'rejected': 'Recusado'
    };

    return (
      <Badge variant="outline" className={`${styles[status] || 'bg-gray-100 text-gray-800'} border whitespace-nowrap`}>
        {labels[status] || status || 'Desconhecido'}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
        <p className="text-gray-500 animate-pulse">Carregando informações...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-red-100 shadow-lg">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mb-4">
              <AlertCircle className="w-8 h-8 text-red-500" />
            </div>
            <CardTitle className="text-red-600">Acesso Negado</CardTitle>
            <CardDescription className="text-base mt-2">{error || 'Token de acesso inválido ou expirado.'}</CardDescription>
          </CardHeader>
          <CardFooter className="flex justify-center pb-8">
            <Button onClick={() => navigate('/login')} variant="outline">Voltar ao Início</Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  const { customer = {}, vehicles = [], appointments = [], budgets = [] } = data || {};
  const firstName = customer.name ? customer.name.split(' ')[0] : 'Cliente';

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-white border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div className="flex items-center gap-5">
              <div className="h-20 w-20 bg-gradient-to-br from-blue-600 to-blue-700 rounded-full flex items-center justify-center text-white text-3xl font-bold shadow-lg">
                {firstName.charAt(0)}
              </div>
              <div>
                <h1 className="text-3xl font-bold text-slate-900">Olá, {firstName}</h1>
                <p className="text-slate-500 flex items-center gap-2 mt-1">
                  <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                  Bem-vindo ao seu portal de serviços
                </p>
              </div>
            </div>
            <Button 
              onClick={handleNewAppointment}
              className="bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-200/50 w-full md:w-auto h-12 text-base"
            >
              <CalendarPlus className="w-5 h-5 mr-2" />
              Agendar Novo Serviço
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="shadow-sm border-slate-200 hover:border-blue-200 transition-colors">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-500 uppercase tracking-wider flex items-center gap-2">
                <User className="w-4 h-4" /> Dados Pessoais
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="font-semibold text-lg text-slate-900">{customer.name}</div>
              {customer.cpf && (
                <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800">
                  CPF: {customer.cpf}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-sm border-slate-200 hover:border-blue-200 transition-colors">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-500 uppercase tracking-wider flex items-center gap-2">
                <Phone className="w-4 h-4" /> Contato
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3 text-slate-700">
                <Phone className="w-4 h-4 text-slate-400" />
                <span>{customer.phone || 'Telefone não informado'}</span>
              </div>
              <div className="flex items-center gap-3 text-slate-700">
                <Mail className="w-4 h-4 text-slate-400" />
                <span className="truncate">{customer.email || 'Email não informado'}</span>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-slate-200 hover:border-blue-200 transition-colors">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-500 uppercase tracking-wider flex items-center gap-2">
                <MapPin className="w-4 h-4" /> Endereço
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-700 leading-relaxed">
                {[customer.street, customer.number, customer.neighborhood, customer.city, customer.state]
                  .filter(Boolean)
                  .join(', ') || 'Endereço não cadastrado'}
              </p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="vehicles" className="w-full space-y-6">
          <TabsList className="grid w-full grid-cols-4 max-w-[800px] p-1 bg-slate-200/50">
            <TabsTrigger value="vehicles" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">
              <Car className="w-4 h-4 mr-2"/> Meus Veículos
            </TabsTrigger>
            <TabsTrigger value="history" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">
              <History className="w-4 h-4 mr-2"/> Histórico de OS
            </TabsTrigger>
            <TabsTrigger value="budgets" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">
              <FileSpreadsheet className="w-4 h-4 mr-2"/> Orçamentos
            </TabsTrigger>
             <TabsTrigger value="appointments" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">
              <Clock className="w-4 h-4 mr-2"/> Agendamentos
            </TabsTrigger>
          </TabsList>

          <TabsContent value="vehicles" className="mt-0 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="border-b bg-slate-50/50">
                 <CardTitle>Meus Veículos</CardTitle>
                 <CardDescription>Lista completa de veículos cadastrados.</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                 {Array.isArray(vehicles) && vehicles.length > 0 ? (
                   <div className="overflow-x-auto">
                     <Table>
                       <TableHeader>
                         <TableRow>
                           <TableHead>Veículo</TableHead>
                           <TableHead>Placa</TableHead>
                           <TableHead>Cor</TableHead>
                           <TableHead className="text-right">Ações</TableHead>
                         </TableRow>
                       </TableHeader>
                       <TableBody>
                         {vehicles.map((vehicle) => (
                           <TableRow key={vehicle.id} className="hover:bg-slate-50">
                             <TableCell className="font-medium text-slate-900">
                                <div className="flex items-center gap-2">
                                   <Car className="w-4 h-4 text-slate-400" />
                                   {vehicle.brand} {vehicle.model}
                                </div>
                             </TableCell>
                             <TableCell>
                               <Badge variant="secondary" className="font-mono text-xs">
                                 {vehicle.plate}
                               </Badge>
                             </TableCell>
                             <TableCell className="text-slate-600">{vehicle.color}</TableCell>
                             <TableCell className="text-right">
                               <Button 
                                 variant="outline" 
                                 size="sm" 
                                 className="gap-2 border-blue-200 text-blue-700 hover:bg-blue-50"
                                 onClick={() => handleOpenHistory(vehicle)}
                               >
                                 <FileText className="w-4 h-4" />
                                 <span className="hidden sm:inline">Histórico</span>
                               </Button>
                             </TableCell>
                           </TableRow>
                         ))}
                       </TableBody>
                     </Table>
                   </div>
                 ) : (
                   <div className="flex flex-col items-center justify-center py-16 text-center">
                      <div className="p-4 bg-slate-50 rounded-full mb-4">
                        <Car className="w-8 h-8 text-slate-400" />
                      </div>
                      <h3 className="text-lg font-medium text-slate-900">Nenhum veículo encontrado</h3>
                      <p className="text-slate-500 mt-1">Não encontramos veículos cadastrados em seu nome.</p>
                   </div>
                 )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history" className="mt-0 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="border-b bg-slate-50/50">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div>
                    <CardTitle>Histórico Geral de Serviços</CardTitle>
                    <CardDescription className="mt-1">Registro completo de todas as manutenções realizadas.</CardDescription>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-2 bg-white border px-3 py-1.5 rounded-md shadow-sm">
                      <Filter className="w-4 h-4 text-slate-500" />
                      <span className="text-sm font-medium text-slate-600">Filtrar por:</span>
                    </div>
                    <Select value={selectedVehicleFilter} onValueChange={setSelectedVehicleFilter}>
                        <SelectTrigger className="w-[200px] bg-white">
                            <SelectValue placeholder="Todos os Veículos" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todos os Veículos</SelectItem>
                            {vehicles.map(v => (
                                <SelectItem key={v.id} value={v.id}>
                                    {v.brand} {v.model} ({v.plate})
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Badge variant="secondary" className="hidden sm:inline-flex">
                        {filteredWorkOrders.length} OS
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0 bg-slate-50/30">
                <ScrollArea className="h-[600px] p-4">
                  <div className="space-y-6 max-w-5xl mx-auto">
                    {filteredWorkOrders.length > 0 ? filteredWorkOrders.map((os) => {
                      const items = Array.isArray(os.items) ? os.items : [];
                      const parts = items.filter(i => i.item_type === 'product');
                      const services = items.filter(i => i.item_type === 'service');
                      const external = items.filter(i => i.item_type === 'external_service');
                      
                      return (
                        <div key={os.id} className="bg-white rounded-lg border shadow-sm">
                          <div className="bg-gray-50 border-b px-4 py-3 flex flex-wrap justify-between items-center gap-2">
                             <div className="flex items-center gap-4">
                                <div className="flex items-center gap-2">
                                   <Calendar className="w-4 h-4 text-gray-400" />
                                   <span className="font-bold text-gray-900 text-base">
                                      {format(new Date(os.created_at || os.order_date), 'dd/MM/yyyy')}
                                   </span>
                                </div>
                                <div className="h-4 w-px bg-gray-300 hidden sm:block"></div>
                                <span className="font-bold text-gray-900 text-base">
                                   OS #{os.os_number || String(os.id).substring(0,6)}
                                </span>
                                <div className="h-4 w-px bg-gray-300 hidden sm:block"></div>
                                <span className="text-sm font-medium text-gray-600">
                                  {os.vehicle_description || 'Veículo não informado'}
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

                          <div className="p-4 sm:p-6 space-y-6">
                             <CleanSection title="Peças" items={parts} />
                             <CleanSection title="Serviços" items={services} />
                             <CleanSection title="Serviços Externos" items={external} />
                             
                             {(!parts.length && !services.length && !external.length) && (
                                 <p className="text-center text-gray-400 italic text-sm py-2">Sem itens registrados</p>
                             )}
                          </div>
                        </div>
                      );
                    }) : (
                      <div className="flex flex-col items-center justify-center py-20 text-center">
                        <div className="p-4 bg-slate-50 rounded-full mb-4">
                          <Wrench className="w-8 h-8 text-slate-300" />
                        </div>
                        <h3 className="text-lg font-medium text-slate-900">Nenhum serviço encontrado</h3>
                        <p className="text-slate-500 max-w-sm mx-auto mt-1">
                           {selectedVehicleFilter !== 'all' ? 'Este veículo não possui histórico de serviços.' : 'O histórico de manutenções aparecerá aqui assim que o primeiro serviço for realizado.'}
                        </p>
                        {selectedVehicleFilter === 'all' && (
                            <Button onClick={handleNewAppointment} variant="outline" className="mt-6">
                                Agendar Agora
                            </Button>
                        )}
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="budgets" className="mt-0 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="border-b bg-slate-50/50">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Meus Orçamentos</CardTitle>
                    <CardDescription className="mt-1">Todos os orçamentos gerados, independente do status.</CardDescription>
                  </div>
                  <Badge variant="secondary" className="ml-auto">
                    {Array.isArray(budgets) ? budgets.length : 0} Orçamentos
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                 <ScrollArea className="h-[600px]">
                    <div className="divide-y divide-slate-100">
                      {Array.isArray(budgets) && budgets.length > 0 ? budgets.map((budget) => (
                        <div 
                            key={budget.id} 
                            className="p-6 hover:bg-slate-50 transition-colors cursor-pointer group"
                            onClick={() => handleOpenBudget(budget)}
                        >
                            <div className="flex items-center justify-between">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <FileSpreadsheet className="w-4 h-4 text-blue-600" />
                                        <span className="font-medium text-slate-900 group-hover:text-blue-700 transition-colors">
                                            Orçamento #{budget.budget_number}
                                        </span>
                                        <span className="text-slate-400">•</span>
                                        <span className="text-slate-500 text-sm">
                                            {format(new Date(budget.created_at), "dd/MM/yyyy")}
                                        </span>
                                    </div>
                                    <div className="text-sm text-slate-500 pl-6">
                                        {budget.vehicle_description || 'Veículo não informado'}
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <span className="font-bold text-slate-900 text-sm bg-slate-100 px-2 py-1 rounded border">
                                        {formatCurrency(budget.total_cost)}
                                    </span>
                                    {getStatusBadge(budget.status)}
                                    <ArrowRight className="w-4 h-4 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                                </div>
                            </div>
                        </div>
                      )) : (
                        <div className="flex flex-col items-center justify-center py-20 text-center">
                            <div className="p-4 bg-slate-50 rounded-full mb-4">
                                <FileSpreadsheet className="w-8 h-8 text-slate-300" />
                            </div>
                            <h3 className="text-lg font-medium text-slate-900">Nenhum orçamento</h3>
                            <p className="text-slate-500 max-w-sm mx-auto mt-1">
                                Você não possui orçamentos registrados até o momento.
                            </p>
                            <Button onClick={handleNewAppointment} variant="outline" className="mt-6">
                                Fazer Agendamento
                            </Button>
                        </div>
                      )}
                    </div>
                 </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="appointments" className="mt-0 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="border-b bg-slate-50/50">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Meus Agendamentos</CardTitle>
                    <CardDescription className="mt-1">Próximos horários e histórico de agendamentos.</CardDescription>
                  </div>
                  <Badge variant="secondary" className="ml-auto">
                    {Array.isArray(appointments) ? appointments.length : 0} Agendamentos
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                 <ScrollArea className="h-[600px]">
                    <div className="divide-y divide-slate-100">
                      {Array.isArray(appointments) && appointments.length > 0 ? appointments.map((apt) => (
                        <div key={apt.id} className="p-6 hover:bg-slate-50 transition-colors">
                            <div className="flex items-center justify-between">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                         <Calendar className="w-4 h-4 text-blue-600" />
                                         <span className="font-medium text-slate-900">
                                            {format(new Date(apt.data_agendamento), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                                         </span>
                                         <span className="text-slate-400">às</span>
                                         <span className="font-bold text-slate-900">
                                            {format(new Date(apt.data_agendamento), "HH:mm")}
                                         </span>
                                    </div>
                                    <div className="text-sm text-slate-500 pl-6">
                                        {apt.modelo_veiculo || 'Veículo não informado'} {apt.placa_veiculo && `(${apt.placa_veiculo})`}
                                    </div>
                                </div>
                                <div>{getStatusBadge(apt.status)}</div>
                            </div>
                        </div>
                      )) : (
                        <div className="flex flex-col items-center justify-center py-20 text-center">
                            <div className="p-4 bg-slate-50 rounded-full mb-4">
                                <Calendar className="w-8 h-8 text-slate-300" />
                            </div>
                            <h3 className="text-lg font-medium text-slate-900">Nenhum agendamento</h3>
                            <p className="text-slate-500 max-w-sm mx-auto mt-1">
                                Você não possui agendamentos futuros registrados.
                            </p>
                            <Button onClick={handleNewAppointment} variant="outline" className="mt-6">
                                Fazer Agendamento
                            </Button>
                        </div>
                      )}
                    </div>
                 </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <VehicleHistoryModal 
        isOpen={isHistoryModalOpen} 
        onClose={() => setIsHistoryModalOpen(false)} 
        vehicle={activeVehicleHistory} 
        workOrders={data?.work_orders || []}
      />

      <Dialog open={isBudgetModalOpen} onOpenChange={setIsBudgetModalOpen}>
         <BudgetDetailsModal 
             budget={selectedBudget} 
             token={token} 
             onUpdate={handleDataUpdate} 
         />
      </Dialog>
    </div>
  );
};

export default ClientPortal;