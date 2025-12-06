import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import OSViewer from '@/components/os/OSViewer';
import { Button } from '@/components/ui/button';

const OSViewDialog = ({ isOpen, onClose, osId }) => {
  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl w-full h-[90vh] flex flex-col p-0 gap-0">
        <DialogHeader className="p-6 border-b">
          <DialogTitle>Detalhes da Ordem de Serviço</DialogTitle>
          <DialogDescription>
            Visualização completa dos dados da OS.
          </DialogDescription>
        </DialogHeader>
        <div className="flex-grow overflow-y-auto p-6">
          <OSViewer osId={osId} />
        </div>
        <div className="flex justify-end p-6 border-t bg-gray-50">
           <Button onClick={onClose}>Fechar</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default OSViewDialog;