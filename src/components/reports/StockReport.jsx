import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/lib/customSupabaseClient';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { FileDown, Search } from 'lucide-react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

const StockReport = () => {
  const [filters, setFilters] = useState({
    startDate: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
    endDate: format(endOfMonth(new Date()), 'yyyy-MM-dd')
  });
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const { data: reportData, error } = await supabase.rpc('get_report_stock', {
        p_start_date: filters.startDate,
        p_end_date: filters.endDate
      });
      if (error) throw error;
      setData(reportData || []);
    } catch (error) {
      console.error('Error fetching report:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.text("Relatório de Movimentação de Estoque", 14, 15);
    doc.setFontSize(10);
    doc.text(`Período: ${format(new Date(filters.startDate), 'dd/MM/yyyy')} a ${format(new Date(filters.endDate), 'dd/MM/yyyy')}`, 14, 22);

    const tableColumn = ["Data", "Produto", "SKU", "Tipo", "Qtd", "Motivo"];
    const tableRows = data.map(row => [
        format(new Date(row.created_at), 'dd/MM/yyyy HH:mm'),
        row.description,
        row.variant_code,
        row.movement_type,
        row.quantity_in,
        row.reason || '-'
    ]);

    doc.autoTable({
        head: [tableColumn],
        body: tableRows,
        startY: 30,
    });
    doc.save(`Relatorio_Estoque_${filters.startDate}.pdf`);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Relatório de Estoque</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div>
                <label className="text-xs font-medium mb-1 block">De</label>
                <Input type="date" value={filters.startDate} onChange={(e) => setFilters(prev => ({...prev, startDate: e.target.value}))} />
            </div>
            <div>
                <label className="text-xs font-medium mb-1 block">Até</label>
                <Input type="date" value={filters.endDate} onChange={(e) => setFilters(prev => ({...prev, endDate: e.target.value}))} />
            </div>
            <Button onClick={fetchReport} disabled={loading}><Search className="w-4 h-4 mr-2"/> Gerar</Button>
        </div>

        {data.length > 0 && (
            <div className="space-y-2">
                <div className="flex justify-end">
                    <Button variant="outline" onClick={exportPDF}><FileDown className="w-4 h-4 mr-2"/> Exportar PDF</Button>
                </div>
                <div className="rounded-md border overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Data</TableHead>
                                <TableHead>Produto</TableHead>
                                <TableHead>SKU</TableHead>
                                <TableHead>Tipo</TableHead>
                                <TableHead className="text-center">Qtd</TableHead>
                                <TableHead>Motivo</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {data.map((row, i) => (
                                <TableRow key={i}>
                                    <TableCell>{format(new Date(row.created_at), 'dd/MM/yy HH:mm')}</TableCell>
                                    <TableCell>{row.description}</TableCell>
                                    <TableCell>{row.variant_code}</TableCell>
                                    <TableCell>{row.movement_type}</TableCell>
                                    <TableCell className="text-center">{row.quantity_in}</TableCell>
                                    <TableCell className="truncate max-w-[200px]" title={row.reason}>{row.reason}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </div>
        )}
      </CardContent>
    </Card>
  );
};

export default StockReport;