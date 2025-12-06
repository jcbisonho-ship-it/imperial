import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

const PDFPreview = ({ isOpen, onClose, fileUrl }) => {
    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="w-full h-full max-w-none sm:w-3/4 sm:max-w-none md:w-full md:h-full rounded-none sm:rounded-lg flex flex-col p-0 gap-0 bg-white">
                <DialogHeader className="p-4 sm:p-6 border-b flex-none">
                    <DialogTitle className="text-lg sm:text-xl">Visualizar Documento</DialogTitle>
                    <DialogDescription className="text-base sm:text-sm">Pré-visualização do arquivo.</DialogDescription>
                </DialogHeader>
                <div className="flex-1 overflow-hidden bg-gray-100 p-4">
                    <iframe
                        src={fileUrl}
                        title="PDF Preview"
                        className="w-full h-full rounded-md shadow-md bg-white"
                        frameBorder="0"
                    />
                </div>
                <DialogFooter className="p-4 sm:p-6 border-t flex-none flex-col-reverse sm:flex-row gap-3 sm:gap-2 bg-gray-50 sm:bg-white">
                    <Button variant="outline" onClick={onClose} className="w-full sm:w-auto h-11 sm:h-9 px-6 sm:px-4 text-base sm:text-sm">Fechar</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default PDFPreview;