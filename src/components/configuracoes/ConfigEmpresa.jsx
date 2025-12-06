import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Camera, Building2 } from 'lucide-react';

const ConfigEmpresa = () => {
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [template, setTemplate] = useState({
        company_logo_url: '',
        company_info: { name: '', cnpj: '', address: '', phone: '', email: '', website: '' },
    });
    const fileInputRef = useRef(null);

    useEffect(() => {
        const fetchTemplate = async () => {
            setLoading(true);
            const { data, error } = await supabase.from('document_templates').select('*').eq('id', 1).single();
            if (data) {
                // Ensure company_info structure is safe
                setTemplate({
                    ...data,
                    company_info: {
                         name: '', cnpj: '', address: '', phone: '', email: '', website: '',
                         ...data.company_info // Override defaults with actual data
                    }
                });
            } else if (error && error.code !== 'PGRST116') {
                toast({ title: 'Erro ao carregar dados da empresa', description: error.message, variant: 'destructive' });
            }
            setLoading(false);
        };
        fetchTemplate();
    }, [toast]);

    const handleInfoChange = (e) => {
        const { id, value } = e.target;
        setTemplate(prev => ({ ...prev, company_info: { ...prev.company_info, [id]: value } }));
    };

    const handleLogoUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setLoading(true);
        try {
            const filePath = `logos/company-logo-${Date.now()}`;
            // Assuming 'documents' bucket exists and is public
            const { error: uploadError } = await supabase.storage.from('documents').upload(filePath, file, { upsert: true });
            
            if (uploadError) throw uploadError;

            const { data: urlData } = supabase.storage.from('documents').getPublicUrl(filePath);
            setTemplate(prev => ({ ...prev, company_logo_url: urlData.publicUrl }));
            toast({ title: 'Logo carregado com sucesso!', description: 'Não esqueça de salvar as alterações.' });
        } catch (error) {
            toast({ title: 'Erro no upload', description: error.message, variant: 'destructive' });
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setLoading(true);
        const { company_logo_url, company_info } = template;
        
        // Use upsert to ensure row 1 exists
        const { error } = await supabase.from('document_templates').upsert({ 
            id: 1,
            company_logo_url, 
            company_info 
        });

        if (error) {
            toast({ title: 'Erro ao salvar', description: error.message, variant: 'destructive' });
        } else {
            toast({ title: 'Dados da empresa salvos com sucesso!', className: "bg-green-600 text-white" });
        }
        setLoading(false);
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border p-8">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b">
                <Building2 className="w-6 h-6 text-blue-600" />
                <div>
                    <h3 className="text-xl font-bold text-gray-800">Dados da Oficina</h3>
                    <p className="text-sm text-gray-500">Essas informações aparecerão no cabeçalho de orçamentos e ordens de serviço.</p>
                </div>
            </div>

            {loading && !template.company_info ? <p className="text-center py-10 text-gray-500">Carregando informações...</p> : (
                <div className="space-y-8">
                    {/* Logo Section */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 p-4 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                        <div className="relative group">
                            <div className="w-32 h-32 bg-white rounded-lg border flex items-center justify-center overflow-hidden shadow-sm">
                                {template.company_logo_url ? (
                                    <img src={template.company_logo_url} alt="Logo da Empresa" className="w-full h-full object-contain p-2" />
                                ) : (
                                    <span className="text-gray-300 text-xs text-center px-2">Sem Logo</span>
                                )}
                            </div>
                        </div>
                        <div className="flex-1">
                            <h4 className="font-medium text-gray-900 mb-1">Logomarca da Oficina</h4>
                            <p className="text-sm text-gray-500 mb-4">Recomendado: Formato PNG com fundo transparente. Tamanho máx: 2MB.</p>
                            <Button variant="outline" type="button" onClick={() => fileInputRef.current.click()} disabled={loading}>
                                <Camera className="w-4 h-4 mr-2" /> 
                                {template.company_logo_url ? 'Trocar Logo' : 'Enviar Logo'}
                            </Button>
                            <Input type="file" ref={fileInputRef} onChange={handleLogoUpload} accept="image/*" className="hidden" />
                        </div>
                    </div>

                    {/* Form Fields */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label htmlFor="name">Nome Fantasia / Razão Social</Label>
                            <Input 
                                id="name" 
                                value={template.company_info.name || ''} 
                                onChange={handleInfoChange} 
                                placeholder="Ex: Imperial Serviços Automotivos"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="cnpj">CNPJ / CPF</Label>
                            <Input 
                                id="cnpj" 
                                value={template.company_info.cnpj || ''} 
                                onChange={handleInfoChange} 
                                placeholder="00.000.000/0000-00"
                            />
                        </div>
                        <div className="space-y-2 md:col-span-2">
                            <Label htmlFor="address">Endereço Completo</Label>
                            <Input 
                                id="address" 
                                value={template.company_info.address || ''} 
                                onChange={handleInfoChange} 
                                placeholder="Rua, Número, Bairro, Cidade - UF"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="phone">Telefone / WhatsApp</Label>
                            <Input 
                                id="phone" 
                                value={template.company_info.phone || ''} 
                                onChange={handleInfoChange} 
                                placeholder="(00) 00000-0000"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="email">E-mail de Contato</Label>
                            <Input 
                                id="email" 
                                value={template.company_info.email || ''} 
                                onChange={handleInfoChange} 
                                placeholder="contato@oficina.com.br"
                            />
                        </div>
                         <div className="space-y-2">
                            <Label htmlFor="website">Website / Instagram</Label>
                            <Input 
                                id="website" 
                                value={template.company_info.website || ''} 
                                onChange={handleInfoChange} 
                                placeholder="www.oficina.com.br"
                            />
                        </div>
                    </div>

                    <div className="flex justify-end pt-6 border-t">
                        <Button onClick={handleSave} disabled={loading} className="w-full md:w-auto min-w-[150px]">
                            {loading ? 'Salvando...' : 'Salvar Alterações'}
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ConfigEmpresa;