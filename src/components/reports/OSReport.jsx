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

const OSReport = () => {
  const [filters, setFilters] = useState({
    startDate: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
    endDate: format(endOfMonth(new Date()), 'yyyy-MM-dd'),
    status: 'all',
    clientName: ''
  });
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const { data: reportData, error } = await supabase.rpc('get_report_os', {
        p_start_date: filters.startDate,
        p_end_date: filters.endDate,
        p_status: filters.status === 'all' ? null : filters.status,
        p_client_name: filters.clientName || null
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
    doc.text("Relatório de Ordens de Serviço", 14, 15);
    doc.setFontSize(10);
    doc.text(`Período: ${format(new Date(filters.startDate), 'dd/MM/yyyy')} a ${format(new Date(filters.endDate), 'dd/MM/yyyy')}`, 14, 22);

    const tableColumn = ["Nº OS", "Data", "Cliente", "Placa", "Status", "Total", "Pagamento"];
    const tableRows = data.map(row => [
        row.os_number,
        format(new Date(row.created_at), 'dd/MM/yyyy'),
        row.client_name,
        row.vehicle_plate,
        row.status,
        formatCurrency(row.total_amount),
        row.payment_status || '-'
    ]);

    doc.autoTable({
        head: [tableColumn],
        body: tableRows,
        startY: 30,
    });
    doc.save(`Relatorio_OS_${filters.startDate}.pdf`);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Relatório de Ordens de Serviço</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
            <div>
                <label className="text-xs font-medium mb-1 block">De</label>
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
                        <SelectItem value="Aberta">Aberta</SelectItem>
                        <SelectItem value="Concluída">Concluída</SelectItem>
                        <SelectItem value="Cancelada">Cancelada</SelectItem>
                    </SelectContent>
                </Select>
            </div>
            <div>
                <label className="text-xs font-medium mb-1 block">Cliente</label>
                <Input placeholder="Nome..." value={filters.clientName} onChange={(e) => setFilters(prev => ({...prev, clientName: e.target.value}))} />
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
                                <TableHead>Data</TableHead>
                                <TableHead>Cliente</TableHead>
                                <TableHead>Veículo</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Total</TableHead>
                                <TableHead>Pagamento</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {data.map((row, i) => (
                                <TableRow key={i}>
                                    <TableCell>#{row.os_number}</TableCell>
                                    <TableCell>{format(new Date(row.created_at), 'dd/MM/yyyy')}</TableCell>
                                    <TableCell>{row.client_name}</TableCell>
                                    <TableCell>{row.vehicle_plate}</TableCell>
                                    <TableCell>{row.status}</TableCell>
                                    <TableCell className="text-right">{formatCurrency(row.total_amount)}</TableCell>
                                    <TableCell>{row.payment_status || '-'}</TableCell>
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

export default OSReport;