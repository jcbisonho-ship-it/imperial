import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { FileText } from 'lucide-react';

const GenerateInvoiceDialog = ({ isOpen, onClose, osData, onSuccess }) => {
  const [formData, setFormData] = useState({
    number: '',
    emission_date: new Date().toISOString().split('T')[0],
    cfop: '5102',
    icms_base: '0.00'
  });
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSave = async () => {
    if (!formData.number) {
        toast({ title: "Campo obrigatório", description: "Informe o número da NF.", variant: "destructive" });
        return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('service_orders')
        .update({ invoice_info: formData })
        .eq('id', osData.id);

      if (error) throw error;

      toast({ title: "Nota Fiscal Registrada", description: "As informações da NF foram vinculadas à OS." });
      if(onSuccess) onSuccess();
      onClose();
    } catch (error) {
      toast({ title: "Erro ao registrar NF", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Registrar Nota Fiscal</DialogTitle>
          <DialogDescription>Vincule uma NF à OS #{osData?.os_number}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="number" className="text-right">Número NF</Label>
            <Input id="number" value={formData.number} onChange={e => setFormData({...formData, number: e.target.value})} className="col-span-3" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="date" className="text-right">Emissão</Label>
            <Input id="date" type="date" value={formData.emission_date} onChange={e => setFormData({...formData, emission_date: e.target.value})} className="col-span-3" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="cfop" className="text-right">CFOP</Label>
            <Input id="cfop" value={formData.cfop} onChange={e => setFormData({...formData, cfop: e.target.value})} className="col-span-3" />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave} disabled={loading}>
            <FileText className="w-4 h-4 mr-2" />
            {loading ? 'Salvando...' : 'Salvar NF'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default GenerateInvoiceDialog;