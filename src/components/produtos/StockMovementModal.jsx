import React, { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { Barcode, Calculator, Info, AlertTriangle, TrendingUp, ArrowRight, ChevronDown, ChevronRight, Clock, ShieldCheck, UserCheck } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { format } from 'date-fns';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Badge } from '@/components/ui/badge';

const MOVEMENT_TYPES = {
  INVOICE_ENTRY: 'Entrada de NF',
  MANUAL_EXIT: 'Saída Manual',
  POSITIVE_ADJUSTMENT: 'Ajuste Positivo',
  NEGATIVE_ADJUSTMENT: 'Ajuste Negativo',
  SALE: 'Venda (OS)',
};

// STRICT RESPONSIVE CONSTANTS
const INPUT_CLASS = "h-11 sm:h-9 text-base sm:text-sm px-3 sm:px-2.5"; 
const BUTTON_CLASS = "w-full sm:w-auto h-11 sm:h-9 px-6 sm:px-4 text-base sm:text-sm font-medium";
const LABEL_CLASS = "text-sm sm:text-xs font-medium text-slate-700 mb-1.5 sm:mb-1 block";

const StockMovementModal = ({ isOpen, onClose, onSaveSuccess, variant }) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  
  // Collaborator state
  const [allCollaborators, setAllCollaborators] = useState([]);
  const [activeCollaborators, setActiveCollaborators] = useState([]);
  const [collaboratorsMap, setCollaboratorsMap] = useState({});
  
  const [lastCost, setLastCost] = useState(null);
  
  // History & Audit State
  const [movementHistory, setMovementHistory] = useState([]);
  const [auditLog, setAuditLog] = useState([]);
  const [isHistoryExpanded, setIsHistoryExpanded] = useState(false);
  const [isAuditExpanded, setIsAuditExpanded] = useState(false);
  
  const [formData, setFormData] = useState({
    movement_type: 'INVOICE_ENTRY', quantity: '', unit_cost_invoice: '', invoice_number: '',
    supplier: '', reason: '', movement_date: new Date().toISOString().slice(0, 16),
    barcode: '', additional_costs: '', margin_pct: '', suggested_sale_price: '',
    responsible_person: '', update_product_price: false, recalculate_margin: false
  });

  const selectedCollaboratorName = useMemo(() => {
    const selected = allCollaborators.find(c => c.id === formData.responsible_person);
    return selected ? selected.name : '';
  }, [formData.responsible_person, allCollaborators]);

  useEffect(() => {
    if (isOpen && variant) {
      setFormData({
        movement_type: 'INVOICE_ENTRY', quantity: '', unit_cost_invoice: '', invoice_number: '',
        supplier: '', reason: '', movement_date: new Date().toISOString().slice(0, 16),
        barcode: variant.barcode || '', additional_costs: '', margin_pct: variant.margin_pct || '30',
        suggested_sale_price: variant.sale_price || '', responsible_person: '',
        update_product_price: true, recalculate_margin: false
      });
      
      const fetchCollaborators = async () => {
         const { data, error } = await supabase.rpc('get_collaborators');
         if (error) {
             toast({ title: 'Erro ao carregar colaboradores', description: error.message, variant: 'destructive' });
             return;
         }
         if(data) {
             setAllCollaborators(data);
             const active = data.filter(c => ['active', 'ativo'].includes(c.status?.toLowerCase()));
             setActiveCollaborators(active);
             const map = {};
             data.forEach(c => map[c.id] = c.name);
             setCollaboratorsMap(map);
             if (user?.email) {
                 const currentUserCollaborator = active.find(c => c.email?.toLowerCase() === user.email?.toLowerCase());
                 if (currentUserCollaborator) setFormData(prev => ({ ...prev, responsible_person: currentUserCollaborator.id }));
             }
         }
      };
      
      const fetchLastCost = async () => {
          const { data, error } = await supabase.rpc('get_variant_last_cost', { p_variant_id: variant.id });
          if (!error) setLastCost(data);
      };

      fetchCollaborators();
      fetchLastCost();
      fetchHistory();
      fetchAuditLog();
    }
  }, [isOpen, variant, user, toast]);

  const fetchHistory = async () => {
    if (!variant?.id) return;
    const { data, error } = await supabase
      .from('stock_movements')
      .select('*')
      .eq('product_variant_id', variant.id)
      .order('created_at', { ascending: false })
      .limit(5);
    if (!error && data) setMovementHistory(data);
  };

  const fetchAuditLog = async () => {
     if (!variant?.id) return;
     const { data, error } = await supabase.rpc('get_variant_audit_log', { p_variant_id: variant.id });
     if (!error && data) setAuditLog(data);
  };

  const getRealUnitCost = (baseCost, additional, qty) => {
      const c = parseFloat(baseCost) || 0;
      const a = parseFloat(additional) || 0;
      const q = parseFloat(qty) || 1;
      return c + (a / (q > 0 ? q : 1));
  };

  const handleInputChange = (e) => {
    const { id, value } = e.target;
    setFormData(prev => {
        const updated = { ...prev, [id]: value };
        if (prev.movement_type === 'INVOICE_ENTRY') {
            const cost = parseFloat(id === 'unit_cost_invoice' ? value : prev.unit_cost_invoice) || 0;
            const additional = parseFloat(id === 'additional_costs' ? value : prev.additional_costs) || 0;
            const qty = parseFloat(id === 'quantity' ? value : prev.quantity) || 1;
            
            const realUnitCost = getRealUnitCost(cost, additional, qty);
            
            if (id === 'unit_cost_invoice' || id === 'additional_costs' || id === 'quantity' || id === 'margin_pct') {
                 if (id !== 'suggested_sale_price') {
                     const margin = parseFloat(id === 'margin_pct' ? value : prev.margin_pct) || 0;
                     if (realUnitCost > 0) {
                         updated.suggested_sale_price = (realUnitCost * (1 + margin / 100)).toFixed(2);
                     }
                 }
            }
            if (id === 'suggested_sale_price') {
                 const price = parseFloat(value) || 0;
                 if (realUnitCost > 0) {
                     updated.margin_pct = (((price - realUnitCost) / realUnitCost) * 100).toFixed(2);
                 }
            }
        }
        return updated;
    });
  };

  const handleSelectChange = (value) => {
    setFormData(prev => ({ ...prev, movement_type: value }));
  };

  const handleResponsibleChange = (value) => {
     setFormData(prev => ({ ...prev, responsible_person: value }));
  };

  const handleCheckboxChange = (id, checked) => {
      setFormData(prev => ({ ...prev, [id]: checked }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const { movement_type, quantity, unit_cost_invoice, invoice_number, supplier, reason, movement_date, barcode, additional_costs, margin_pct, suggested_sale_price, responsible_person, update_product_price } = formData;
    const quantityNum = parseInt(quantity, 10);

    if (isNaN(quantityNum) || quantityNum <= 0) {
      toast({ title: 'Quantidade inválida', description: 'A quantidade deve ser um número positivo.', variant: 'destructive' });
      setLoading(false);
      return;
    }
    
    if (movement_type === 'INVOICE_ENTRY') {
        if (unit_cost_invoice === '' || parseFloat(unit_cost_invoice) < 0) {
            toast({ title: 'Custo inválido', description: 'O custo da NF é obrigatório para entradas.', variant: 'destructive' });
            setLoading(false);
            return;
        }
    }
    if (!responsible_person) {
        toast({ title: 'Responsável obrigatório', description: 'Selecione o responsável pela movimentação.', variant: 'destructive' });
        setLoading(false);
        return;
    }
    if (movement_type !== 'INVOICE_ENTRY' && !reason.trim()) {
        toast({ title: 'Motivo obrigatório', description: 'O motivo é obrigatório para este tipo de movimento.', variant: 'destructive' });
        setLoading(false);
        return;
    }

    try {
      const shouldUpdateProduct = update_product_price && movement_type === 'INVOICE_ENTRY';
      const { error } = await supabase.rpc('create_stock_movement', {
        p_variant_id: variant.id,
        p_movement_type: movement_type,
        p_quantity: quantityNum,
        p_unit_cost_invoice: movement_type === 'INVOICE_ENTRY' ? parseFloat(unit_cost_invoice) : null,
        p_invoice_number: invoice_number,
        p_supplier: supplier,
        p_reason: reason,
        p_created_at: new Date(movement_date).toISOString(),
        p_additional_costs: movement_type === 'INVOICE_ENTRY' ? (parseFloat(additional_costs) || 0) : 0,
        p_responsible_person: responsible_person, 
        p_new_sale_price: shouldUpdateProduct ? parseFloat(suggested_sale_price) : null,
        p_new_margin: shouldUpdateProduct ? parseFloat(margin_pct) : null,
        p_new_barcode: barcode,
        p_update_product_data: shouldUpdateProduct
      });

      if (error) throw error;
      toast({ title: 'Movimentação registrada com sucesso!' });
      await fetchHistory();
      await fetchAuditLog();
      onSaveSuccess();
      onClose();
    } catch (error) {
      console.error("Stock Movement Error:", error);
      toast({ title: 'Erro ao movimentar estoque', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };
  
  const isInvoiceEntry = formData.movement_type === 'INVOICE_ENTRY';
  const realUnitCost = getRealUnitCost(formData.unit_cost_invoice, formData.additional_costs, formData.quantity);
  const currentStock = variant?.stock || 0;
  const currentCost = variant?.cost_price || 0;
  const newQty = parseInt(formData.quantity) || 0;
  
  let predictedPMP = currentCost;
  if (isInvoiceEntry && newQty > 0) {
      const totalValue = (currentStock * currentCost) + (newQty * realUnitCost);
      const totalQty = currentStock + newQty;
      predictedPMP = totalQty > 0 ? totalValue / totalQty : realUnitCost;
  }
  const costDiffPct = currentCost > 0 ? ((realUnitCost - currentCost) / currentCost) * 100 : 0;
  const isSignificantDiff = Math.abs(costDiffPct) > 20 && realUnitCost > 0 && currentCost > 0;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-full h-full max-w-none rounded-none sm:rounded-lg sm:w-3/4 md:w-full md:h-full md:max-h-none lg:w-full lg:h-full lg:max-w-none flex flex-col p-0 gap-0 bg-white">
        <DialogHeader className="p-4 sm:p-6 border-b bg-white flex-none">
          <DialogTitle className="text-lg sm:text-xl font-bold">Movimentação de Estoque</DialogTitle>
          <DialogDescription className="text-sm">
            {variant?.productName}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-grow overflow-y-auto p-4 sm:p-6 space-y-5 sm:space-y-6">
            {auditLog.length > 0 && (
                <div className="bg-slate-100 rounded-md p-3 sm:p-2 flex flex-col sm:flex-row sm:items-center justify-between text-sm sm:text-xs text-slate-600 border border-slate-200 gap-2 sm:gap-0">
                    <div className="flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 sm:w-3 sm:h-3 text-slate-500" />
                        <span>Última: <strong>{auditLog[0].user_email || 'Sistema'}</strong> em {format(new Date(auditLog[0].created_at), 'dd/MM HH:mm')}</span>
                    </div>
                    <button onClick={() => setIsAuditExpanded(!isAuditExpanded)} className="text-blue-600 hover:underline text-left sm:text-right">
                        {isAuditExpanded ? 'Ocultar Log' : 'Ver Log'}
                    </button>
                </div>
            )}
            
            {isAuditExpanded && (
                 <ScrollArea className="h-40 sm:h-32 rounded-md border bg-slate-50 p-3 sm:p-2 text-xs font-mono">
                     {auditLog.map((log, idx) => (
                         <div key={idx} className="mb-3 pb-3 sm:mb-2 sm:pb-2 border-b border-slate-200 last:border-0 last:mb-0 last:pb-0">
                             <div className="flex justify-between text-slate-500 mb-1">
                                 <span>{format(new Date(log.created_at), 'dd/MM/yy HH:mm:ss')}</span>
                                 <span>{log.user_email}</span>
                             </div>
                             <div className="text-slate-700 font-bold">{log.action}</div>
                             <div className="text-slate-600 truncate break-all whitespace-normal">{JSON.stringify(log.changes.new || log.changes.details)}</div>
                         </div>
                     ))}
                 </ScrollArea>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
            <div className="bg-slate-50 p-3 sm:p-3 rounded-md border flex items-center gap-3 sm:gap-2">
                <Barcode className="w-6 h-6 sm:w-5 sm:h-5 text-slate-500 flex-shrink-0" />
                <div className="flex-grow">
                    <Label htmlFor="barcode" className={LABEL_CLASS}>Código de Barras (Scanner)</Label>
                    <Input id="barcode" value={formData.barcode} onChange={handleInputChange} className={`${INPUT_CLASS} bg-white`} placeholder="Escaneie ou digite..." />
                </div>
            </div>

            <div>
                <Label htmlFor="movement_type" className={LABEL_CLASS}>Tipo de Movimento</Label>
                <Select onValueChange={handleSelectChange} defaultValue={formData.movement_type}>
                <SelectTrigger id="movement_type" className={INPUT_CLASS}><SelectValue placeholder="Selecione o tipo" /></SelectTrigger>
                <SelectContent>{Object.entries(MOVEMENT_TYPES).map(([key, value]) => <SelectItem key={key} value={key}>{value}</SelectItem>)}</SelectContent>
                </Select>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-0.5">
                    <Label htmlFor="quantity" className={LABEL_CLASS}>Quantidade *</Label>
                    <Input id="quantity" type="number" required value={formData.quantity} onChange={handleInputChange} className={INPUT_CLASS} />
                </div>
                <div className="space-y-0.5">
                    <Label htmlFor="movement_date" className={LABEL_CLASS}>Data/Hora *</Label>
                    <Input id="movement_date" type="datetime-local" required value={formData.movement_date} onChange={handleInputChange} className={INPUT_CLASS} />
                </div>
            </div>

            {isInvoiceEntry ? (
                <div className="space-y-4 border-t pt-4">
                {isSignificantDiff && (
                    <Alert variant="destructive" className="bg-red-50 border-red-200 text-red-800">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertTitle>Atenção: Variação de Custo!</AlertTitle>
                        <AlertDescription className="text-xs">Novo custo: R$ {realUnitCost.toFixed(2)} ({costDiffPct > 0 ? '+' : ''}{Math.abs(costDiffPct).toFixed(1)}%).</AlertDescription>
                    </Alert>
                )}

                <div className="flex flex-col sm:flex-row items-stretch gap-3">
                    <div className="flex-1">
                            <Alert className="bg-blue-50 border-blue-100 py-3 sm:py-2 h-full">
                                <div className="flex items-center gap-2 mb-2 sm:mb-1">
                                    <Info className="w-4 h-4 text-blue-600" />
                                    <h5 className="font-semibold text-blue-900 text-sm">Custos Atuais</h5>
                                </div>
                                <div className="space-y-1 text-sm sm:text-xs text-blue-800">
                                    <div className="flex justify-between border-b border-blue-200 pb-1 mb-1 sm:border-0 sm:pb-0 sm:mb-0">
                                        <span>Último Pago:</span>
                                        <span className="font-mono font-bold">{lastCost ? `R$ ${Number(lastCost).toFixed(2)}` : '-'}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Médio (PMP):</span>
                                        <span className="font-mono font-bold">R$ {Number(currentCost).toFixed(2)}</span>
                                    </div>
                                </div>
                            </Alert>
                    </div>
                    <div className="flex-1">
                            <Alert className="bg-green-50 border-green-100 py-3 sm:py-2 h-full">
                                <div className="flex items-center gap-2 mb-2 sm:mb-1">
                                    <TrendingUp className="w-4 h-4 text-green-600" />
                                    <h5 className="font-semibold text-green-900 text-sm">Previsão Pós-Entrada</h5>
                                </div>
                                <div className="space-y-1 text-sm sm:text-xs text-green-800">
                                    <div className="flex justify-between border-b border-green-200 pb-1 mb-1 sm:border-0 sm:pb-0 sm:mb-0">
                                        <span>Novo Estoque:</span>
                                        <span className="font-mono font-bold">{currentStock + newQty}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Novo PMP:</span>
                                        <span className="font-mono font-bold">R$ {predictedPMP.toFixed(2)}</span>
                                    </div>
                                </div>
                            </Alert>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-0.5">
                        <Label htmlFor="unit_cost_invoice" className={LABEL_CLASS}>Preço Pago (Custo Unit.) *</Label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">R$</span>
                            <Input id="unit_cost_invoice" type="number" step="0.01" className={`${INPUT_CLASS} pl-9`} required value={formData.unit_cost_invoice} onChange={handleInputChange} />
                        </div>
                    </div>
                    <div className="space-y-0.5">
                        <Label htmlFor="additional_costs" className={LABEL_CLASS}>Custos Adicionais (Frete)</Label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">R$</span>
                            <Input id="additional_costs" type="number" step="0.01" className={`${INPUT_CLASS} pl-9`} value={formData.additional_costs} onChange={handleInputChange} />
                        </div>
                        <p className="text-xs sm:text-[10px] text-gray-500 text-right font-medium mt-1">Custo Real Unit.: <span className="text-gray-900">R$ {realUnitCost.toFixed(2)}</span></p>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-gray-50 p-4 rounded-md border relative">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 hidden sm:block">
                        <ArrowRight className="w-4 h-4 text-gray-300" />
                    </div>
                    <div className="space-y-0.5">
                        <Label htmlFor="margin_pct" className={LABEL_CLASS}>Margem Desejada (%)</Label>
                        <div className="relative">
                            <Input id="margin_pct" type="number" step="0.01" value={formData.margin_pct} onChange={handleInputChange} className={INPUT_CLASS} />
                            <Calculator className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                        </div>
                    </div>
                    <div className="space-y-0.5">
                        <Label htmlFor="suggested_sale_price" className={LABEL_CLASS}>Preço de Venda Sugerido</Label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">R$</span>
                            <Input id="suggested_sale_price" type="number" step="0.01" className={`${INPUT_CLASS} pl-9 font-bold text-green-700`} value={formData.suggested_sale_price} onChange={handleInputChange} />
                        </div>
                    </div>
                    <div className="col-span-1 sm:col-span-2 pt-2 border-t mt-2">
                        <div className="flex items-start sm:items-center space-x-2">
                            <Checkbox id="update_product_price" checked={formData.update_product_price} onCheckedChange={(c) => handleCheckboxChange('update_product_price', c)} className="mt-1 sm:mt-0" />
                            <label htmlFor="update_product_price" className="text-sm font-medium leading-tight cursor-pointer text-gray-700">Aplicar este novo preço e margem ao produto agora</label>
                        </div>
                    </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-0.5">
                            <Label htmlFor="supplier" className={LABEL_CLASS}>Fornecedor</Label>
                            <Input id="supplier" value={formData.supplier} onChange={handleInputChange} className={INPUT_CLASS} />
                        </div>
                        <div className="space-y-0.5">
                            <Label htmlFor="invoice_number" className={LABEL_CLASS}>Nota Fiscal</Label>
                            <Input id="invoice_number" value={formData.invoice_number} onChange={handleInputChange} className={INPUT_CLASS} />
                        </div>
                </div>
                </div>
            ) : (
                <div className="space-y-0.5">
                <Label htmlFor="reason" className={LABEL_CLASS}>Motivo *</Label>
                <Textarea id="reason" required={!isInvoiceEntry} value={formData.reason} onChange={handleInputChange} className="min-h-[100px] text-base sm:text-sm p-3" />
                </div>
            )}
            
            <div className="space-y-0.5 pt-2 border-t">
                <Label htmlFor="responsible_person" className={LABEL_CLASS}>Responsável pela Movimentação *</Label>
                <div className="flex flex-col gap-2">
                    <Select onValueChange={handleResponsibleChange} value={formData.responsible_person}>
                        <SelectTrigger id="responsible_person" className={INPUT_CLASS}><SelectValue placeholder={activeCollaborators.length > 0 ? "Selecione um colaborador" : "Carregando..."} /></SelectTrigger>
                        <SelectContent>{activeCollaborators.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                    </Select>
                    {selectedCollaboratorName && (
                        <div className="flex items-center gap-2 text-xs text-blue-600 bg-blue-50 p-3 sm:p-2 rounded-md border border-blue-100">
                            <UserCheck className="w-4 h-4" />
                            <span>Selecionado: <strong>{selectedCollaboratorName}</strong></span>
                        </div>
                    )}
                </div>
            </div>

            <div className="h-4 sm:hidden"></div>
            </form>

            <div className="border-t pt-4 mt-4 pb-2">
                 <button type="button" className="flex items-center justify-between w-full text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors p-2 bg-gray-50 rounded-md sm:bg-transparent sm:p-0" onClick={() => setIsHistoryExpanded(!isHistoryExpanded)}>
                    <span className="flex items-center gap-2"><Clock className="w-4 h-4 text-gray-500" /> Últimas 5 Movimentações</span>
                    {isHistoryExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                 </button>

                 {isHistoryExpanded && (
                     <div className="mt-3 overflow-x-auto rounded-md border shadow-sm">
                         <table className="w-full text-xs text-left min-w-[500px] sm:min-w-0">
                             <thead className="bg-gray-50 text-gray-500 uppercase font-medium border-b">
                                 <tr>
                                     <th className="px-3 py-2">Data</th>
                                     <th className="px-3 py-2">Tipo</th>
                                     <th className="px-3 py-2 text-center">Qtd</th>
                                     <th className="px-3 py-2 text-right">Custo Unit.</th>
                                     <th className="px-3 py-2">Responsável</th>
                                 </tr>
                             </thead>
                             <tbody className="divide-y">
                                {movementHistory.length > 0 ? (
                                    movementHistory.map((log) => {
                                        const collabName = collaboratorsMap[log.responsible_person] || log.responsible_person;
                                        return (
                                            <tr key={log.id} className="hover:bg-gray-50/50">
                                                <td className="px-3 py-2 whitespace-nowrap">{format(new Date(log.created_at), 'dd/MM/yy HH:mm')}</td>
                                                <td className="px-3 py-2">{MOVEMENT_TYPES[log.movement_type] || log.movement_type}</td>
                                                <td className="px-3 py-2 text-center font-bold">{log.quantity_in}</td>
                                                <td className="px-3 py-2 text-right font-mono">{log.unit_cost_invoice ? `R$ ${Number(log.unit_cost_invoice).toFixed(2)}` : '-'}</td>
                                                <td className="px-3 py-2"><Badge variant="outline" className="font-normal bg-slate-50 text-slate-600 border-slate-200 whitespace-nowrap">{collabName}</Badge></td>
                                            </tr>
                                        )
                                    })
                                ) : (
                                    <tr><td colSpan={5} className="px-3 py-4 text-center text-gray-400">Sem movimentações recentes.</td></tr>
                                )}
                             </tbody>
                         </table>
                     </div>
                 )}
            </div>
        </div>

        <DialogFooter className="p-4 sm:p-6 border-t bg-white flex-none flex-col-reverse sm:flex-row gap-3 sm:gap-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading} className={BUTTON_CLASS}>Cancelar</Button>
            <Button type="submit" onClick={handleSubmit} disabled={loading} className={BUTTON_CLASS}>{loading ? 'Salvando...' : 'Registrar Movimento'}</Button>
        </DialogFooter>

      </DialogContent>
    </Dialog>
  );
};

export default StockMovementModal;