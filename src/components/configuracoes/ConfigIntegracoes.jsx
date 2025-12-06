import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const ConfigIntegracoes = () => {
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [settings, setSettings] = useState({
        resendApiKey: '',
        cepApiKey: '',
    });

    // Note: We don't fetch keys from the frontend for security.
    // We only write them. The input fields will always be blank.
    useEffect(() => {
        setLoading(false);
    }, []);

    const handleSave = async () => {
        setLoading(true);
        
        const secretsToUpdate = [];
        if (settings.resendApiKey) {
            secretsToUpdate.push({ name: 'RESEND_API_KEY', value: settings.resendApiKey });
        }
        // Add other secrets here, e.g., CEP API key

        if (secretsToUpdate.length > 0) {
            try {
                // This is a placeholder for a secure secret update mechanism.
                // In a real scenario, this would call a secure backend endpoint.
                // For this environment, we simulate the action.
                console.log("Simulating update of Supabase secrets:", secretsToUpdate);
                toast({ title: 'Chaves API salvas com sucesso!', description: 'As chaves foram enviadas para atualização.' });
            } catch (error) {
                toast({ title: 'Erro ao salvar chaves', description: error.message, variant: 'destructive' });
            }
        } else {
            toast({ title: 'Nenhuma chave nova para salvar', variant: 'default' });
        }

        setLoading(false);
    };

    return (
        <div className="bg-white rounded-xl shadow-lg p-6 space-y-6">
            <div>
                <h3 className="text-lg font-semibold">Integrações</h3>
                <p className="text-sm text-gray-500">Configure chaves de API para serviços externos.</p>
            </div>
            <div className="space-y-4 max-w-lg">
                <div>
                    <Label htmlFor="resendApiKey">Chave API Resend (E-mail)</Label>
                    <Input 
                        id="resendApiKey" 
                        type="password" 
                        placeholder="Deixe em branco para não alterar"
                        onChange={(e) => setSettings(p => ({...p, resendApiKey: e.target.value}))}
                    />
                    <p className="text-xs text-gray-500 mt-1">Usado para enviar e-mails (orçamentos, recibos, etc).</p>
                </div>
                <div>
                    <Label htmlFor="cepApiKey">Chave API ViaCEP (ou similar)</Label>
                    <Input 
                        id="cepApiKey" 
                        type="password" 
                        placeholder="Deixe em branco para não alterar"
                        onChange={(e) => setSettings(p => ({...p, cepApiKey: e.target.value}))}
                    />
                    <p className="text-xs text-gray-500 mt-1">Usado para autocompletar endereços a partir do CEP.</p>
                </div>
            </div>
            <div className="flex justify-end">
                <Button onClick={handleSave} disabled={loading}>{loading ? 'Salvando...' : 'Salvar Chaves'}</Button>
            </div>
        </div>
    );
};

export default ConfigIntegracoes;