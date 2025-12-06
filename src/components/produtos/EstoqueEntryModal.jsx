import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';

const EstoqueEntryModal = ({ isOpen, onClose, onSaveSuccess, variant }) => {
  const [formData, setFormData] = useState({
    quantity_in: '',
    unit_cost_invoice: '',
    invoice_number: '',
    supplier: ''
  });
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Responsive classes
  const INPUT_CLASS = "h-11 sm:h-9 text-base sm:text-sm";
  const BUTTON_CLASS = "w-full sm:w-auto h-11 sm:h-9 px-6 sm:px-4 text-base sm:text-sm";
  const LABEL_CLASS = "text-base sm:text-sm font-medium";

  const handleInputChange = (e) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const quantityIn = parseInt(formData.quantity_in, 10);
    const unitCostInvoice = parseFloat(formData.unit_cost_invoice);

    if (isNaN(quantityIn) || quantityIn <= 0 || isNaN(unitCostInvoice) || unitCostInvoice < 0) {
      toast({ title: 'Dados inválidos', description: 'Verifique a quantidade e o custo.', variant: 'destructive' });
      setLoading(false);
      return;
    }

    try {
      const { error } = await supabase.rpc('create_stock_movement', {
        p_variant_id: variant.id,
        p_movement_type: 'INVOICE_ENTRY',
        p_quantity: quantityIn,
        p_unit_cost_invoice: unitCostInvoice,
        p_invoice_number: formData.invoice_number,
        p_supplier: formData.supplier,
        p_reason: `Entrada de estoque (NF: ${formData.invoice_number || 'N/A'})`
      });

      if (error) throw error;

      toast({ title: 'Estoque atualizado com sucesso!' });
      onSaveSuccess();
      onClose();
    } catch (error) {
      toast({ title: 'Erro ao dar entrada no estoque', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-full h-full max-w-none sm:w-3/4 sm:max-w-none md:w-full md:h-full rounded-none sm:rounded-lg flex flex-col p-0 gap-0 bg-white">
        <DialogHeader className="p-4 sm:p-6 border-b flex-none">
          <DialogTitle className="text-lg sm:text-xl">Entrada de Estoque</DialogTitle>
          <DialogDescription className="text-base sm:text-sm">
            Registrar entrada para: {variant?.productName} ({variant?.variant_code || 'Sem Código'})
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          <form id="entry-form" onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="quantity_in" className={LABEL_CLASS}>Quantidade *</Label>
                <Input id="quantity_in" type="number" required value={formData.quantity_in} onChange={handleInputChange} className={INPUT_CLASS} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="unit_cost_invoice" className={LABEL_CLASS}>Custo Unitário (NF) *</Label>
                <Input id="unit_cost_invoice" type="number" step="0.01" required value={formData.unit_cost_invoice} onChange={handleInputChange} className={INPUT_CLASS} />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="invoice_number" className={LABEL_CLASS}>Nota Fiscal</Label>
                <Input id="invoice_number" value={formData.invoice_number} onChange={handleInputChange} className={INPUT_CLASS} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="supplier" className={LABEL_CLASS}>Fornecedor</Label>
                <Input id="supplier" value={formData.supplier} onChange={handleInputChange} className={INPUT_CLASS} />
              </div>
            </div>
          </form>
        </div>
        <DialogFooter className="p-4 sm:p-6 border-t flex-none flex-col-reverse sm:flex-row gap-3 sm:gap-2 bg-gray-50 sm:bg-white">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading} className={BUTTON_CLASS}>Cancelar</Button>
            <Button type="submit" form="entry-form" disabled={loading} className={BUTTON_CLASS}>{loading ? 'Salvando...' : 'Registrar Entrada'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EstoqueEntryModal;