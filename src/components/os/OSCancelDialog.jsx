import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { AlertTriangle, Loader2 } from 'lucide-react';

const OSCancelDialog = ({ isOpen, onClose, os, onSuccess }) => {
    const [reason, setReason] = useState('');
    const [loading, setLoading] = useState(false);
    const { toast } = useToast();

    const handleCancel = async () => {
        if (!reason || reason.trim().length < 5) {
            toast({ title: "Erro", description: "Por favor, informe um motivo detalhado para o cancelamento (mínimo 5 caracteres).", variant: "destructive" });
            return;
        }

        setLoading(true);
        try {
            // Call Supabase RPC function to handle safe cancellation (reverts stock, finance, etc.)
            const { data, error } = await supabase.rpc('cancel_service_order', {
                p_os_id: os.id,
                p_reason: reason
            });

            if (error) throw error;

            onSuccess();
            onClose();
        } catch (error) {
            console.error("Error canceling OS:", error);
            // Handle specific known error messages if needed
            let msg = error.message;
            if (msg.includes('pagamentos registrados')) {
                msg = "Não é possível cancelar: Existem pagamentos registrados. Faça o estorno financeiro antes.";
            }
            toast({ title: "Falha ao cancelar", description: msg, variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !loading && onClose()}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <div className="flex items-center gap-2 text-red-600 mb-2">
                        <AlertTriangle className="h-6 w-6" />
                        <DialogTitle>Cancelar Ordem de Serviço</DialogTitle>
                    </div>
                    <DialogDescription>
                        Tem certeza que deseja cancelar a OS <strong>#{String(os?.os_number || '').padStart(6, '0')}</strong>?
                        <br/>
                        <span className="text-xs mt-2 block text-gray-500 bg-gray-100 p-2 rounded border border-gray-200">
                            Esta ação irá reverter o estoque dos produtos, cancelar lançamentos financeiros pendentes e retornar o status do orçamento para 'Aprovado'.
                        </span>
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="reason" className="text-red-700 font-medium">Motivo do Cancelamento (Obrigatório)</Label>
                        <Textarea 
                            id="reason" 
                            placeholder="Descreva o motivo do cancelamento..." 
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            className="min-h-[100px]"
                        />
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={loading}>Voltar</Button>
                    <Button variant="destructive" onClick={handleCancel} disabled={loading}>
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Confirmar Cancelamento
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default OSCancelDialog;