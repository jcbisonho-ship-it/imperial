import React, { useState } from 'react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { osService } from '@/services/osService';
import { useToast } from '@/components/ui/use-toast';
import { AlertTriangle } from 'lucide-react';

const ServiceOrderCancelDialog = ({ isOpen, onClose, osId, onSuccess }) => {
    const [reason, setReason] = useState('');
    const [loading, setLoading] = useState(false);
    const { toast } = useToast();

    const handleConfirm = async (e) => {
        e.preventDefault();
        if (!reason.trim()) {
            toast({ title: "Motivo obrigatório", description: "Por favor, informe o motivo do cancelamento.", variant: "destructive" });
            return;
        }

        setLoading(true);
        try {
            await osService.cancelOS(osId, reason);
            onSuccess();
            onClose();
        } catch (error) {
            console.error("Cancel Error:", error);
            toast({ title: "Erro ao cancelar OS", description: error.message, variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    return (
        <AlertDialog open={isOpen} onOpenChange={onClose}>
            <AlertDialogContent className="sm:max-w-[425px]">
                <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-2 text-red-600">
                        <AlertTriangle className="h-5 w-5" />
                        Cancelar Ordem de Serviço
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                        Esta ação irá cancelar a OS e reverter o orçamento para o status "Pendente".
                        O estoque reservado será devolvido e as cobranças canceladas.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="reason" className="text-left font-medium">
                            Motivo do Cancelamento <span className="text-red-500">*</span>
                        </Label>
                        <Input
                            id="reason"
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            placeholder="Ex: Cliente desistiu, Peça indisponível..."
                            className="col-span-3"
                            autoFocus
                        />
                    </div>
                </div>
                <AlertDialogFooter>
                    <AlertDialogCancel disabled={loading}>Voltar</AlertDialogCancel>
                    <Button 
                        variant="destructive" 
                        onClick={handleConfirm} 
                        disabled={loading || !reason.trim()}
                    >
                        {loading ? 'Cancelando...' : 'Confirmar Cancelamento'}
                    </Button>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
};

export default ServiceOrderCancelDialog;