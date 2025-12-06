import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const ConfigTemas = () => {
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [settings, setSettings] = useState({
        mode: 'light',
        primaryColor: '#3b82f6',
        secondaryColor: '#64748b',
        font: 'Inter',
    });

    useEffect(() => {
        const fetchSettings = async () => {
            setLoading(true);
            const { data, error } = await supabase.from('settings').select('value').eq('key', 'theme').single();
            if (data) {
                setSettings(data.value);
                applyTheme(data.value);
            } else if (error && error.code !== 'PGRST116') {
                toast({ title: 'Erro ao carregar tema', description: error.message, variant: 'destructive' });
            }
            setLoading(false);
        };
        fetchSettings();
    }, [toast]);

    const applyTheme = (themeSettings) => {
        const root = document.documentElement;
        if (themeSettings.mode === 'dark') {
            root.classList.add('dark');
        } else {
            root.classList.remove('dark');
        }
        root.style.setProperty('--primary-custom', themeSettings.primaryColor);
        // You would extend this to apply more colors and fonts
    };

    const handleSettingChange = (key, value) => {
        const newSettings = { ...settings, [key]: value };
        setSettings(newSettings);
        applyTheme(newSettings);
    };

    const handleSave = async () => {
        setLoading(true);
        const { error } = await supabase.from('settings').upsert({ key: 'theme', value: settings });
        if (error) {
            toast({ title: 'Erro ao salvar', description: error.message, variant: 'destructive' });
        } else {
            toast({ title: 'Tema salvo com sucesso!' });
        }
        setLoading(false);
    };

    return (
        <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-lg font-semibold mb-4">Aparência e Temas</h3>
            {loading ? <p>Carregando...</p> : (
                <div className="space-y-6 max-w-md">
                    <div className="space-y-2">
                        <Label>Modo</Label>
                        <Select value={settings.mode} onValueChange={(v) => handleSettingChange('mode', v)}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="light">Claro</SelectItem>
                                <SelectItem value="dark">Escuro</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label>Cor Primária</Label>
                        <Input type="color" value={settings.primaryColor} onChange={(e) => handleSettingChange('primaryColor', e.target.value)} className="w-24 h-12 p-1" />
                    </div>
                    <div className="flex justify-end">
                        <Button onClick={handleSave} disabled={loading}>{loading ? 'Salvando...' : 'Salvar'}</Button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ConfigTemas;