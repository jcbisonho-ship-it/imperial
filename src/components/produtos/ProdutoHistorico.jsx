import React, { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { ArrowUp, ArrowDown, ShoppingCart, FileText, Settings, X } from 'lucide-react';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

const MOVEMENT_TYPE_MAP = {
  INVOICE_ENTRY: { label: 'Entrada NF', icon: <FileText className="w-4 h-4 text-blue-500" />, color: 'bg-blue-100 text-blue-800' },
  MANUAL_EXIT: { label: 'Saída Manual', icon: <Settings className="w-4 h-4 text-yellow-500" />, color: 'bg-yellow-100 text-yellow-800' },
  POSITIVE_ADJUSTMENT: { label: 'Ajuste (+)', icon: <Settings className="w-4 h-4 text-green-500" />, color: 'bg-green-100 text-green-800' },
  NEGATIVE_ADJUSTMENT: { label: 'Ajuste (-)', icon: <Settings className="w-4 h-4 text-red-500" />, color: 'bg-red-100 text-red-800' },
  SALE: { label: 'Venda (OS)', icon: <ShoppingCart className="w-4 h-4 text-purple-500" />, color: 'bg-purple-100 text-purple-800' },
};

const ProdutoHistorico = ({ isOpen, onClose, product, variants = [] }) => {
  const [history, setHistory] = useState([]);
  const [selectedVariantId, setSelectedVariantId] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Ensure variants is always an array to prevent crashes
  const safeVariants = Array.isArray(variants) ? variants : [];

  // Responsive classes
  const LABEL_CLASS = "text-base sm:text-sm font-medium";
  const INPUT_CLASS = "h-11 sm:h-9 text-base sm:text-sm";

  useEffect(() => {
    if (isOpen && safeVariants.length > 0) {
      // If we have variants but none selected (or invalid selection), select the first one
      if (!selectedVariantId || !safeVariants.find(v => v.id === selectedVariantId)) {
          setSelectedVariantId(safeVariants[0].id);
      }
    } else if (!isOpen) {
      // Optional: clear state when closed
      // setHistory([]);
    }
  }, [isOpen, safeVariants, selectedVariantId]);

  const fetchHistory = useCallback(async () => {
    if (!selectedVariantId) return;
    setLoading(true);

    try {
      const { data, error } = await supabase.rpc('get_variant_history', { p_variant_id: selectedVariantId });

      if (error) throw error;
      
      // Safe access with default empty array for variants
      const currentStock = safeVariants.find(v => v.id === selectedVariantId)?.stock || 0;
      let runningBalance = currentStock;

      const historyWithBalance = (data || []).map((item) => {
        const balanceBefore = runningBalance;
        runningBalance -= item.quantity_change;
        return { ...item, date: new Date(item.event_date), balance: balanceBefore };
      });
      
      setHistory(historyWithBalance);

    } catch (error) {
      console.error('Error fetching history:', error);
      toast({ title: 'Erro ao carregar histórico', description: error.message, variant: 'destructive' });
      setHistory([]);
    } finally {
      setLoading(false);
    }
  }, [selectedVariantId, toast, safeVariants]);

  useEffect(() => {
    if (isOpen && selectedVariantId) {
        fetchHistory();
    }
  }, [fetchHistory, isOpen, selectedVariantId]);

  // Safe access with default empty array for variants
  const selectedVariant = safeVariants.find(v => v.id === selectedVariantId);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-full h-full max-w-none sm:w-3/4 sm:max-w-none md:w-full md:h-full rounded-none sm:rounded-lg flex flex-col p-0 gap-0 bg-white">
        <DialogHeader className="p-4 sm:p-6 border-b flex-none flex-row justify-between items-start">
          <div>
            <DialogTitle className="text-lg sm:text-xl">Histórico de Movimentação</DialogTitle>
            {product && <DialogDescription className="text-base sm:text-sm">Produto: {product.description}</DialogDescription>}
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="-mt-2 -mr-2 sm:mt-0 sm:mr-0"><X className="w-5 h-5" /></Button>
        </DialogHeader>

        <div className="flex-none p-4 sm:p-6 pb-0">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                <div>
                <Label className={LABEL_CLASS}>Variante</Label>
                <Select onValueChange={setSelectedVariantId} value={selectedVariantId}>
                    <SelectTrigger className={INPUT_CLASS}>
                    <SelectValue placeholder="Selecione uma variante" />
                    </SelectTrigger>
                    <SelectContent>
                    {safeVariants.map(v => (
                        <SelectItem key={v.id} value={v.id}>
                        {v.variant_code || 'Sem Código'} - {v.brand || 'Sem Marca'}
                        </SelectItem>
                    ))}
                    </SelectContent>
                </Select>
                </div>
                {selectedVariant && (
                    <div className="text-sm bg-slate-50 p-3 rounded-md border flex justify-between items-center">
                        <span className="text-gray-500">Estoque Atual</span>
                        <span className="font-bold text-lg">{selectedVariant.stock} {selectedVariant.unit_of_measure || 'UN'}</span>
                    </div>
                )}
            </div>
            
            {/* Header Row */}
            <div className="grid grid-cols-12 gap-2 items-center px-3 py-2 mt-4 bg-gray-100 rounded-t-lg text-xs font-semibold text-gray-600 uppercase tracking-wider border-b">
                <div className="col-span-3">Data/Hora</div>
                <div className="col-span-3">Tipo</div>
                <div className="col-span-2">Ref.</div>
                <div className="col-span-1 text-center">Unid.</div>
                <div className="col-span-1 text-center">Qtd.</div>
                <div className="col-span-2 text-right">Saldo</div>
            </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 pt-0">
          {loading ? (
             <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
             </div>
          ) : history.length > 0 ? (
            <div className="relative">
              <div className="absolute left-4 h-full border-l-2 border-slate-200"></div>
              <div className="space-y-2 pt-2">
                {history.map((log, index) => {
                  const movementInfo = MOVEMENT_TYPE_MAP[log.event_type] || { label: log.event_type, icon: <Settings className="w-4 h-4" />, color: 'bg-gray-100' };
                  return (
                    <div key={index} className="relative flex items-start gap-4 pl-10">
                      <div className="absolute -left-0.5 top-3 z-10 p-1 bg-background rounded-full">
                        {log.quantity_change > 0 
                            ? <ArrowUp className="w-5 h-5 text-green-500 bg-green-100 rounded-full p-0.5" />
                            : <ArrowDown className="w-5 h-5 text-red-500 bg-red-100 rounded-full p-0.5" />
                        }
                      </div>
                      <div className="flex-grow grid grid-cols-12 gap-2 items-center p-3 border rounded-lg bg-gray-50/80 hover:bg-gray-100 transition-colors">
                         <div className="col-span-3 text-xs sm:text-sm font-medium text-gray-600">
                           {format(log.date, 'dd/MM/yyyy HH:mm')}
                         </div>
                         <div className="col-span-3">
                           <Badge variant="outline" className={`border-0 ${movementInfo.color} text-[10px] sm:text-xs whitespace-nowrap`}>
                             {movementInfo.icon}
                             <span className="ml-1.5 hidden sm:inline">{movementInfo.label}</span>
                           </Badge>
                         </div>
                         <div className="col-span-2 text-xs text-gray-500 truncate" title={log.document_ref}>
                           {log.document_ref}
                         </div>
                         <div className="col-span-1 text-center text-xs text-gray-500 font-mono">
                            {selectedVariant?.unit_of_measure || 'UN'}
                         </div>
                         <div className="col-span-1 text-center font-semibold text-xs sm:text-sm">
                            <span className={log.quantity_change > 0 ? 'text-green-600' : 'text-red-600'}>
                                {log.quantity_change > 0 ? `+${log.quantity_change}` : log.quantity_change}
                            </span>
                         </div>
                         <div className="col-span-2 text-right font-bold text-gray-800 text-xs sm:text-sm">
                            {log.balance}
                         </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ) : (
            <p className="text-center text-gray-500 py-10">Nenhum histórico encontrado para esta variante.</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ProdutoHistorico;