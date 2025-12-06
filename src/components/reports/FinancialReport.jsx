import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/lib/customSupabaseClient';
import { formatCurrency } from '@/lib/utils';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { FileDown, Search } from 'lucide-react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

const FinancialReport = () => {
  const [filters, setFilters] = useState({
    startDate: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
    endDate: format(endOfMonth(new Date()), 'yyyy-MM-dd'),
    status: 'all'
  });
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const { data: reportData, error } = await supabase.rpc('get_report_financial', {
        p_start_date: filters.startDate,
        p_end_date: filters.endDate,
        p_status: filters.status === 'all' ? null : filters.status
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
    doc.text("Relatório Financeiro (Contas a Receber)", 14, 15);
    doc.setFontSize(10);
    doc.text(`Período: ${format(new Date(filters.startDate), 'dd/MM/yyyy')} a ${format(new Date(filters.endDate), 'dd/MM/yyyy')}`, 14, 22);

    const tableColumn = ["Nº OS", "Vencimento", "Cliente", "Status", "Dias Atraso", "Valor"];
    const tableRows = data.map(row => [
        row.os_number,
        format(new Date(row.due_date), 'dd/MM/yyyy'),
        row.client_name,
        row.status,
        row.days_overdue > 0 ? row.days_overdue : '-',
        formatCurrency(row.amount)
    ]);

    doc.autoTable({
        head: [tableColumn],
        body: tableRows,
        startY: 30,
    });
    doc.save(`Relatorio_Financeiro_${filters.startDate}.pdf`);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Relatório Financeiro</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div>
                <label className="text-xs font-medium mb-1 block">Vencimento De</label>
                <Input type="date" value={filters.startDate} onChange={(e) => setFilters(prev => ({...prev, startDate: e.target.value}))} />
            </div>
            <div>
                <label className="text-xs font-medium mb-1 block">Até</label>
                <Input type="date" value={filters.endDate} onChange={(e) => setFilters(prev => ({...prev, endDate: e.target.value}))} />
            </div>
            <div>
                <label className="text-xs font-medium mb-1 block">Status</label>
                <Select value={filters.status} onValueChange={(val) => setFilters(prev => ({...prev, status: val}))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        <SelectItem value="Pendente">Pendente</SelectItem>
                        <SelectItem value="Pago">Pago</SelectItem>
                        <SelectItem value="Cancelado">Cancelado</SelectItem>
                    </SelectContent>
                </Select>
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
                                <TableHead>Nº OS</TableHead>
                                <TableHead>Vencimento</TableHead>
                                <TableHead>Cliente</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-center">Atraso (Dias)</TableHead>
                                <TableHead className="text-right">Valor</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {data.map((row, i) => (
                                <TableRow key={i}>
                                    <TableCell>#{row.os_number}</TableCell>
                                    <TableCell>{format(new Date(row.due_date), 'dd/MM/yyyy')}</TableCell>
                                    <TableCell>{row.client_name}</TableCell>
                                    <TableCell>{row.status}</TableCell>
                                    <TableCell className="text-center">{row.days_overdue > 0 ? <span className="text-red-600 font-bold">{row.days_overdue}</span> : '-'}</TableCell>
                                    <TableCell className="text-right">{formatCurrency(row.amount)}</TableCell>
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

export default FinancialReport;