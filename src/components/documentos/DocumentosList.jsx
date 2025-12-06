import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FileText, Plus, Search, Trash2, ExternalLink, Download, Eye, Loader2, ClipboardCheck } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useNavigate } from 'react-router-dom';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const DocumentosList = () => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [previewUrl, setPreviewUrl] = useState(null);
  const [deleteId, setDeleteId] = useState(null); // State for deletion confirmation
  const { toast } = useToast();
  const navigate = useNavigate();

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('documents')
        .select('*, customers(name)')
        .order('generated_at', { ascending: false });

      if (error) throw error;
      setDocuments(data || []);
    } catch (error) {
      console.error('Erro ao buscar documentos:', error);
      toast({ title: 'Erro', description: 'Falha ao carregar documentos.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      const { error } = await supabase.from('documents').delete().eq('id', deleteId);
      if (error) throw error;
      toast({ title: 'Documento excluído com sucesso' });
      fetchDocuments();
    } catch (error) {
      toast({ title: 'Erro ao excluir', description: error.message, variant: 'destructive' });
    } finally {
      setDeleteId(null);
    }
  };

  const filteredDocuments = documents.filter(doc =>
    doc.customers?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    doc.document_type?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getDocTypeBadge = (type) => {
      const styles = {
          'orcamento': 'bg-blue-100 text-blue-800',
          'os': 'bg-purple-100 text-purple-800',
          'recibo': 'bg-green-100 text-green-800',
          'termo': 'bg-gray-100 text-gray-800'
      };
      return <Badge className={`${styles[type] || 'bg-gray-100'} uppercase text-xs font-semibold`}>{type}</Badge>;
  }

  return (
    <div className="bg-white p-4 sm:p-6 rounded-lg border shadow-sm space-y-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex-1">
           <h2 className="text-xl font-bold text-gray-800">Histórico de Documentos</h2>
           <p className="text-gray-500 mt-1 text-sm">Visualize e gerencie todos os documentos gerados.</p>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
          <Button 
            variant="outline" 
            className="w-full sm:w-auto whitespace-nowrap"
            onClick={() => navigate('/checklist-padrao')}
          >
            <ClipboardCheck className="w-4 h-4 mr-2 text-blue-600" />
            Checklist Padrão
          </Button>
          
          <div className="relative w-full sm:w-auto sm:min-w-[250px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
            <Input
              placeholder="Buscar por cliente ou tipo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 w-full"
            />
          </div>
        </div>
      </div>

      <div className="rounded-md border overflow-hidden">
        <div className="overflow-x-auto w-full">
          <Table>
              <TableHeader>
              <TableRow className="bg-gray-50 hover:bg-gray-100">
                  <TableHead className="w-[180px]">Data/Hora</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead className="hidden md:table-cell">Email Destino</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
              </TableRow>
              </TableHeader>
              <TableBody>
              {loading ? (
                  <TableRow>
                      <TableCell colSpan={5} className="h-24 text-center">
                          <div className="flex items-center justify-center gap-2 text-gray-500"><Loader2 className="animate-spin h-5 w-5" /> Carregando...</div>
                      </TableCell>
                  </TableRow>
              ) : filteredDocuments.length === 0 ? (
                  <TableRow>
                      <TableCell colSpan={5} className="h-32 text-center text-gray-500">
                        <div className="flex flex-col items-center gap-2">
                           <FileText className="w-8 h-8 opacity-50"/>
                           <span>Nenhum documento encontrado.</span>
                           <span className="text-xs">Documentos gerados aparecerão aqui.</span>
                        </div>
                      </TableCell>
                  </TableRow>
              ) : (
                  filteredDocuments.map((doc) => (
                  <TableRow key={doc.id} className="hover:bg-gray-50/50">
                      <TableCell className="text-gray-600 text-sm font-medium">
                          {format(new Date(doc.generated_at), 'dd/MM/yyyy HH:mm')}
                      </TableCell>
                      <TableCell>
                          {getDocTypeBadge(doc.document_type)}
                      </TableCell>
                      <TableCell className="font-semibold text-gray-800">
                          {doc.customers?.name || 'N/A'}
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-gray-500 text-sm">
                          {doc.recipient_email || '-'}
                      </TableCell>
                      <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                              <Button variant="ghost" size="icon" onClick={() => setPreviewUrl(doc.file_url)} title="Visualizar">
                                  <Eye className="h-4 w-4 text-blue-600" />
                              </Button>
                              <a href={doc.file_url} target="_blank" rel="noopener noreferrer" download>
                                  <Button variant="ghost" size="icon" title="Baixar PDF">
                                      <Download className="h-4 w-4 text-green-600" />
                                  </Button>
                              </a>
                              <Button variant="ghost" size="icon" onClick={() => setDeleteId(doc.id)} title="Excluir">
                                  <Trash2 className="h-4 w-4 text-red-600" />
                              </Button>
                          </div>
                      </TableCell>
                  </TableRow>
                  ))
              )}
              </TableBody>
          </Table>
        </div>
      </div>

      <Dialog open={!!previewUrl} onOpenChange={(open) => !open && setPreviewUrl(null)}>
        <DialogContent className="w-full max-w-4xl h-[90vh] p-0 flex flex-col">
            <DialogHeader className="p-4 border-b"><DialogTitle>Visualizar Documento</DialogTitle></DialogHeader>
            {previewUrl && <iframe src={previewUrl} className="w-full h-full border-none flex-1" title="PDF Preview"></iframe>}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Isso excluirá permanentemente o registro do documento do sistema.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default DocumentosList;