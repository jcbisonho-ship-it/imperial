import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, FileText, Printer, XCircle, Search, Eye } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Input } from '@/components/ui/input';
import OSCancelDialog from './OSCancelDialog';
import PrintDocumentDialog from '@/components/documentos/PrintDocumentDialog';
import OSViewDialog from './OSViewDialog'; 
import { formatCurrency, formatOSNumber } from '@/lib/utils';

const OSList = ({ limit }) => {
    const [osList, setOsList] = useState([]);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();
    
    // Filter States
    const [searchTerm, setSearchTerm] = useState('');
    
    // Dialog States
    const [cancelDialog, setCancelDialog] = useState({ isOpen: false, os: null });
    const [printDialog, setPrintDialog] = useState({ isOpen: false, os: null });
    const [viewDialog, setViewDialog] = useState({ isOpen: false, os: null });

    const fetchOS = useCallback(async () => {
        setLoading(true);
        try {
            let query = supabase
                .from('service_orders')
                .select(`
                    *,
                    customer:customers(name),
                    vehicle:vehicles(brand, model, plate)
                `)
                .order('os_number', { ascending: false });

            if (limit) {
                query = query.limit(limit);
            }
            
            const { data, error } = await query;

            if (error) throw error;
            
            let filteredData = data;
            if (searchTerm) {
                const lowerSearch = searchTerm.toLowerCase();
                filteredData = data.filter(os => 
                    String(os.os_number).includes(lowerSearch) ||
                    os.customer?.name?.toLowerCase().includes(lowerSearch) ||
                    os.vehicle?.plate?.toLowerCase().includes(lowerSearch)
                );
            }

            setOsList(filteredData || []);
        } catch (error) {
            console.error('Error fetching OS:', error);
            toast({ title: 'Erro ao carregar Ordens de Serviço', description: error.message, variant: 'destructive' });
        } finally {
            setLoading(false);
        }
    }, [limit, searchTerm, toast]);

    useEffect(() => {
        fetchOS();
        
        // Subscribe to realtime changes
        const subscription = supabase
            .channel('os_changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'service_orders' }, () => {
                fetchOS();
            })
            .subscribe();
            
        return () => {
            supabase.removeChannel(subscription);
        };
    }, [fetchOS]);

    const handleCancelClick = (os, e) => {
        if(e) e.stopPropagation();
        setCancelDialog({ isOpen: true, os });
    };

    const handleCancelSuccess = () => {
        toast({ title: "OS Cancelada", description: "A Ordem de Serviço foi cancelada com sucesso." });
        setCancelDialog({ isOpen: false, os: null });
        fetchOS();
    };

    const handlePrintClick = (os, e) => {
        if(e) e.stopPropagation();
        setPrintDialog({ isOpen: true, os });
    };
    
    const handleViewClick = (os) => {
        setViewDialog({ isOpen: true, os });
    }

    const handleRowClick = (os) => {
        handleViewClick(os);
    };

    return (
        <div className="space-y-4">
            {!limit && (
                <div className="flex flex-col md:flex-row gap-4 mb-4 justify-between">
                    <div className="relative w-full">
                         <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                         <Input 
                            placeholder="Buscar por OS, cliente ou placa..." 
                            className="pl-8"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
            )}

            <div className="border rounded-md bg-white shadow-sm overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-gray-50 hover:bg-gray-50">
                            <TableHead className="w-[100px]">Nº OS</TableHead>
                            <TableHead>Cliente</TableHead>
                            <TableHead>Veículo</TableHead>
                            <TableHead>Data</TableHead>
                            <TableHead className="text-right">Valor Total</TableHead>
                            <TableHead className="text-right w-[80px]">Ações</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={6} className="h-24 text-center">
                                    <div className="flex justify-center"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div></div>
                                </TableCell>
                            </TableRow>
                        ) : osList.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                                    Nenhuma Ordem de Serviço encontrada.
                                </TableCell>
                            </TableRow>
                        ) : (
                            osList.map((os) => (
                                <TableRow 
                                    key={os.id} 
                                    className="hover:bg-slate-50/80 cursor-pointer transition-colors"
                                    onClick={() => handleRowClick(os)}
                                >
                                    <TableCell className="font-mono font-medium text-blue-600">
                                        {formatOSNumber(os.os_number)}
                                    </TableCell>
                                    <TableCell className="font-medium text-gray-700">
                                        {os.customer?.name || <span className="text-red-400 italic">Cliente removido</span>}
                                    </TableCell>
                                    <TableCell className="text-gray-600">
                                        {os.vehicle ? (
                                            <div className="flex flex-col">
                                                <span>{os.vehicle.model}</span>
                                                <span className="text-xs text-gray-400">{os.vehicle.plate}</span>
                                            </div>
                                        ) : <span className="text-gray-400 italic">Veículo removido</span>}
                                    </TableCell>
                                    <TableCell className="text-muted-foreground text-sm">
                                        {os.created_at ? format(parseISO(os.created_at), 'dd/MM/yyyy') : '-'}
                                    </TableCell>
                                    <TableCell className="text-right font-medium">
                                        {formatCurrency(os.total_amount)}
                                    </TableCell>
                                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-gray-200">
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleViewClick(os); }}>
                                                    <Eye className="w-4 h-4 mr-2" />
                                                    Visualizar
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handlePrintClick(os, e); }}>
                                                    <Printer className="w-4 h-4 mr-2" />
                                                    Imprimir
                                                </DropdownMenuItem>
                                                
                                                {os.status !== 'Cancelada' && (
                                                    <>
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem 
                                                            onClick={(e) => { e.stopPropagation(); handleCancelClick(os, e); }}
                                                            className="text-red-600 focus:text-red-700 focus:bg-red-50"
                                                        >
                                                            <XCircle className="w-4 h-4 mr-2" />
                                                            Cancelar OS
                                                        </DropdownMenuItem>
                                                    </>
                                                )}
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            {cancelDialog.isOpen && (
                 <OSCancelDialog 
                    isOpen={cancelDialog.isOpen} 
                    onClose={() => setCancelDialog({ isOpen: false, os: null })}
                    os={cancelDialog.os}
                    onSuccess={handleCancelSuccess}
                />
            )}

            {printDialog.isOpen && printDialog.os && (
                <PrintDocumentDialog 
                    isOpen={printDialog.isOpen} 
                    onClose={() => setPrintDialog({ isOpen: false, os: null })}
                    docId={printDialog.os.id}
                    docType="os"
                />
            )}
            
            {viewDialog.isOpen && viewDialog.os && (
                <OSViewDialog
                    isOpen={viewDialog.isOpen}
                    onClose={() => setViewDialog({ isOpen: false, os: null })}
                    osId={viewDialog.os.id}
                />
            )}
        </div>
    );
};

export default OSList;