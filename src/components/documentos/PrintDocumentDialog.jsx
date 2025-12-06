
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { generateDocumentPDF } from '@/services/pdfService.js';
import { Printer, Loader2, Download } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

const PrintDocumentDialog = ({ isOpen, onClose, docId, docType, options = {} }) => {
  const [pdfUrl, setPdfUrl] = useState(null);
  const [pdfDoc, setPdfDoc] = useState(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const [docNumber, setDocNumber] = useState('');
  
  // Create a stable key for the current generation request to prevent duplicate calls
  // We stringify options to ensure value equality checks instead of reference equality
  const requestKey = useMemo(() => {
    return isOpen ? `${docId}-${docType}-${JSON.stringify(options)}` : null;
  }, [isOpen, docId, docType, options]);

  // Ref to track the last successfully handled request key
  const generatedKeyRef = useRef(null);

  useEffect(() => {
    // If dialog is closed, reset state and refs
    if (!isOpen) {
      setPdfUrl(null);
      setPdfDoc(null);
      setDocNumber('');
      generatedKeyRef.current = null;
      return;
    }

    // If we have a valid request key and it hasn't been processed yet
    if (requestKey && generatedKeyRef.current !== requestKey) {
      
      // Mark this request as processed immediately to prevent double-firing
      generatedKeyRef.current = requestKey;
      setLoading(true);

      const generate = async () => {
        try {
          // Double check if the dialog is still open before processing
          if (!isOpen) return;

          const doc = await generateDocumentPDF(docId, docType, options);
          
          let num = doc.docNumber;
          if (!num) {
             num = docType === 'os' ? '...' : docId.substring(0, 8);
          }
          
          // Only update state if the request matches the current one (handling race conditions)
          if (generatedKeyRef.current === requestKey) {
            setDocNumber(num);
            setPdfDoc(doc);
            const blob = doc.output('bloburl');
            setPdfUrl(blob);
          }
        } catch (error) {
          console.error("PDF Generation Error:", error);
          if (generatedKeyRef.current === requestKey) {
            toast({ title: 'Erro ao gerar PDF', description: error.message, variant: 'destructive' });
            onClose();
          }
        } finally {
          if (generatedKeyRef.current === requestKey) {
            setLoading(false);
          }
        }
      };

      generate();
    }

    // Cleanup function to revoke object URL when component unmounts or updates
    return () => {
      // We don't revoke here immediately on re-render to avoid flickering, 
      // but typically we might want to track the blobUrl in a ref to revoke it later.
      // For now, React handles cleanup on unmount reasonably well, but explicit revoke is safer if memory is tight.
    };
  }, [requestKey, isOpen, docId, docType, options, toast, onClose]);

  const handlePrint = () => {
    if (!pdfDoc) return;
    pdfDoc.autoPrint();
    pdfDoc.output('dataurlnewwindow');
  };

  const handleDownload = () => {
    if (!pdfDoc) return;
    const fileName = `${docType}_${docNumber || 'document'}${options.checklistOnly ? '_checklist' : ''}.pdf`;
    pdfDoc.save(fileName);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0 flex flex-row items-center justify-between pb-4 border-b">
          <div className="space-y-1">
            <DialogTitle>Visualizar {options.checklistOnly ? 'Checklist' : (docType === 'os' ? 'OS' : 'Orçamento')} #{docNumber}</DialogTitle>
            <DialogDescription className="sr-only">
              Pré-visualização e impressão do documento gerado em PDF.
            </DialogDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={handleDownload} variant="outline" disabled={!pdfUrl}><Download className="w-4 h-4 mr-2"/> Baixar</Button>
            <Button onClick={handlePrint} disabled={!pdfUrl}><Printer className="w-4 h-4 mr-2"/> Imprimir</Button>
          </div>
        </DialogHeader>
        <div className="flex-1 bg-gray-100 rounded-md overflow-hidden border mt-4">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              <span className="ml-2 text-gray-600">Gerando documento...</span>
            </div>
          ) : pdfUrl ? (
            <iframe src={pdfUrl} className="w-full h-full" title="PDF Preview" />
          ) : (
             <div className="flex items-center justify-center h-full text-gray-500">Falha ao carregar o PDF.</div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PrintDocumentDialog;
