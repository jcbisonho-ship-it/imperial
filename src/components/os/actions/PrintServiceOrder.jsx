import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { generateDocumentPDF } from '@/services/pdfService';
import { Printer, Loader2, Download } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

const PrintServiceOrder = ({ isOpen, onClose, osId }) => {
  const [pdfUrl, setPdfUrl] = useState(null);
  const [pdfDoc, setPdfDoc] = useState(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Ref to track the ID that is currently being generated or has been generated
  const generatedOsIdRef = useRef(null);

  useEffect(() => {
    if (!isOpen) {
      setPdfUrl(null);
      setPdfDoc(null);
      generatedOsIdRef.current = null;
      return;
    }

    // Only generate if we haven't generated for this osId in this session yet
    if (isOpen && osId && generatedOsIdRef.current !== osId) {
      generatedOsIdRef.current = osId; // Mark as processing
      setLoading(true);
      
      const generate = async () => {
        try {
          const doc = await generateDocumentPDF(osId, 'os');
          
          // Verify if we are still processing the same request (race condition guard)
          if (generatedOsIdRef.current === osId) {
            setPdfDoc(doc);
            const blob = doc.output('bloburl');
            setPdfUrl(blob);
          }
        } catch (error) {
          console.error("PDF Generation Error:", error);
          if (generatedOsIdRef.current === osId) {
            toast({ title: 'Erro ao gerar PDF', description: error.message, variant: 'destructive' });
            onClose();
          }
        } finally {
          if (generatedOsIdRef.current === osId) {
            setLoading(false);
          }
        }
      };
      
      generate();
    }
    
    return () => {
      // Cleanup logic if needed
    };
  }, [isOpen, osId, toast, onClose]);

  const handlePrint = () => {
    if (!pdfDoc) return;
    pdfDoc.autoPrint();
    pdfDoc.output('dataurlnewwindow');
  };

  const handleDownload = () => {
    if (!pdfDoc) return;
    pdfDoc.save(`os_${osId ? osId.substring(0, 8) : 'document'}.pdf`);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0 flex flex-row items-center justify-between pb-4 border-b">
          <div className="space-y-1">
            <DialogTitle>Visualizar Impressão - OS</DialogTitle>
            <DialogDescription className="sr-only">
              Pré-visualização do documento da Ordem de Serviço em PDF.
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

export default PrintServiceOrder;