import React, { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { format } from 'date-fns';
import jsPDF from "jspdf";
import "jspdf-autotable";

const formatCurrency = (value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);

const ComissaoDialog = ({ isOpen, onClose, commissionData, dateRange }) => {
  const { toast } = useToast();
  const [details, setDetails] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchDetails = useCallback(async () => {
    if (!commissionData || !dateRange.from || !dateRange.to) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.from('commissions')
        .select('*, work_orders(title)')
        .eq('collaborator_id', commissionData.collaborator_id)
        .eq('calculation_period_start', format(dateRange.from, 'yyyy-MM-dd'))
        .eq('calculation_period_end', format(dateRange.to, 'yyyy-MM-dd'))
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDetails(data);
    } catch (error) {
      toast({ title: 'Erro ao buscar detalhes da comissão', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [commissionData, dateRange, toast]);

  useEffect(() => {
    if (isOpen) {
      fetchDetails();
    }
  }, [isOpen, fetchDetails]);

  const handleExportPDF = () => {
    const doc = new jsPDF();
    doc.text(`Relatório de Comissão - ${commissionData.collaborator_name}`, 14, 16);
    doc.setFontSize(10);
    doc.text(`Período: ${format(dateRange.from, 'dd/MM/yyyy')} a ${format(dateRange.to, 'dd/MM/yyyy')}`, 14, 22);
    doc.text(`Total da Comissão: ${formatCurrency(commissionData.total_commission)}`, 14, 28);
    
    const tableColumn = ["OS", "Item", "Valor Item", "Taxa %", "Comissão"];
    const tableRows = [];

    details.forEach(item => {
      const rowData = [
        `#${item.work_order_id.substring(0, 8)}`,
        item.item_description,
        formatCurrency(item.item_total_price),
        `${(item.commission_rate_applied * 100).toFixed(1)}%`,
        formatCurrency(item.commission_amount)
      ];
      tableRows.push(rowData);
    });

    doc.autoTable({
        head: [tableColumn],
        body: tableRows,
        startY: 35,
        theme: 'striped',
        headStyles: { fillColor: [33, 150, 243] }
    });
    
    doc.save(`comissao_${commissionData.collaborator_name.replace(' ','_')}.pdf`);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-full h-full max-w-none sm:w-3/4 sm:max-w-none md:w-full md:h-full rounded-none sm:rounded-lg flex flex-col p-0 gap-0 bg-white">
        <DialogHeader className="p-4 sm:p-6 border-b flex-none">
          <DialogTitle className="text-lg sm:text-xl">Detalhes da Comissão</DialogTitle>
          <DialogDescription className="text-base sm:text-sm">
            Comissão de {commissionData?.collaborator_name} para o período de {format(dateRange.from, 'dd/MM/yyyy')} a {format(dateRange.to, 'dd/MM/yyyy')}
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm text-left text-gray-500">
              <thead className="text-xs text-gray-700 uppercase bg-gray-50 sticky top-0">
                <tr>
                  <th scope="col" className="px-6 py-3">OS</th>
                  <th scope="col" className="px-6 py-3">Item</th>
                  <th scope="col" className="px-6 py-3">Valor do Item</th>
                  <th scope="col" className="px-6 py-3">Taxa Aplicada</th>
                  <th scope="col" className="px-6 py-3">Valor Comissão</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="5" className="text-center py-12"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div></td></tr>
                ) : details.map(item => (
                  <tr key={item.id} className="bg-white border-b hover:bg-gray-50">
                    <td className="px-6 py-4 font-mono text-xs text-gray-600">#{item.work_order_id.substring(0, 8)}</td>
                    <td className="px-6 py-4">{item.item_description}</td>
                    <td className="px-6 py-4">{formatCurrency(item.item_total_price)}</td>
                    <td className="px-6 py-4">{`${(item.commission_rate_applied * 100).toFixed(1)}%`}</td>
                    <td className="px-6 py-4 font-semibold">{formatCurrency(item.commission_amount)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="font-semibold text-gray-900 bg-gray-100">
                    <td colSpan="4" className="px-6 py-3 text-right">Total da Comissão</td>
                    <td className="px-6 py-3">{formatCurrency(commissionData?.total_commission)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
        <DialogFooter className="p-4 sm:p-6 border-t flex-none flex-col-reverse sm:flex-row gap-3 sm:gap-2 bg-gray-50 sm:bg-white">
          <Button variant="outline" onClick={onClose} className="w-full sm:w-auto h-11 sm:h-9 px-6 sm:px-4 text-base sm:text-sm">Fechar</Button>
          <Button onClick={handleExportPDF} className="w-full sm:w-auto h-11 sm:h-9 px-6 sm:px-4 text-base sm:text-sm">Exportar PDF</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ComissaoDialog;