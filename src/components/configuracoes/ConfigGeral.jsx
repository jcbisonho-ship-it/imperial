import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const ConfigGeral = () => {
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [settings, setSettings] = useState({
        language: 'pt-br',
        timezone: 'America/Sao_Paulo',
        dateFormat: 'dd/MM/yyyy',
        currency: 'BRL',
    });

    useEffect(() => {
        const fetchSettings = async () => {
            setLoading(true);
            const { data, error } = await supabase.from('settings').select('value').eq('key', 'general').single();
            if (data) {
                setSettings(data.value);
            } else if (error && error.code !== 'PGRST116') {
                toast({ title: 'Erro ao carregar configurações', description: error.message, variant: 'destructive' });
            }
            setLoading(false);
        };
        fetchSettings();
    }, [toast]);

    const handleSelectChange = (key, value) => {
        setSettings(prev => ({ ...prev, [key]: value }));
    };

    const handleSave = async () => {
        setLoading(true);
        const { error } = await supabase.from('settings').upsert({ key: 'general', value: settings });
        if (error) {
            toast({ title: 'Erro ao salvar', description: error.message, variant: 'destructive' });
        } else {
            toast({ title: 'Configurações salvas com sucesso!' });
        }
        setLoading(false);
    };

    return (
        <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-lg font-semibold mb-4">Configurações Gerais</h3>
            {loading ? <p>Carregando...</p> : (
                <div className="space-y-6 max-w-md">
                    <div className="space-y-2">
                        <Label>Idioma</Label>
                        <Select value={settings.language} onValueChange={(v) => handleSelectChange('language', v)}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="pt-br">Português (Brasil)</SelectItem>
                                <SelectItem value="en-us" disabled>Inglês (EUA) - Em breve</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label>Fuso Horário</Label>
                        <Select value={settings.timezone} onValueChange={(v) => handleSelectChange('timezone', v)}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="America/Sao_Paulo">Brasília (GMT-3)</SelectItem>
                                <SelectItem value="America/New_York">Nova Iorque (GMT-4)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label>Formato de Moeda</Label>
                        <Select value={settings.currency} onValueChange={(v) => handleSelectChange('currency', v)}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="BRL">Real (R$)</SelectItem>
                                <SelectItem value="USD">Dólar ($)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="flex justify-end">
                        <Button onClick={handleSave} disabled={loading}>{loading ? 'Salvando...' : 'Salvar'}</Button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ConfigGeral;