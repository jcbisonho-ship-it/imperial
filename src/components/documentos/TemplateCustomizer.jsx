import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Camera, Save, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

const TemplateCustomizer = () => {
    const { toast } = useToast();
    const [isInitialLoading, setIsInitialLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [template, setTemplate] = useState({
        id: 1, // Default ID
        company_logo_url: '',
        primary_color: '#3b82f6',
        company_info: { name: '', address: '', phone: '', email: '' },
        footer_text: '',
        terms_and_conditions: '',
    });
    const fileInputRef = useRef(null);

    useEffect(() => {
        const fetchTemplate = async () => {
            setIsInitialLoading(true);
            const { data, error } = await supabase.from('document_templates').select('*').eq('id', 1).single();
            
            if (error && error.code !== 'PGRST116') { // Ignore 'no rows found'
                toast({ title: 'Erro ao carregar template', description: error.message, variant: 'destructive' });
            } else if (data) {
                // Ensure company_info is a valid object
                const parsedData = { ...data, company_info: data.company_info || {} };
                setTemplate(parsedData);
            } else {
                 // No template found, upsert a default one
                const { error: insertError } = await supabase.from('document_templates').insert([template], { onConflict: 'id' });
                 if(insertError) {
                     toast({ title: 'Erro ao criar template padrão', description: insertError.message, variant: 'destructive' });
                 }
            }
            setIsInitialLoading(false);
        };
        fetchTemplate();
    }, [toast]);

    const handleInfoChange = (e) => {
        const { id, value } = e.target;
        setTemplate(prev => ({ ...prev, company_info: { ...prev.company_info, [id]: value } }));
    };

    const handleFieldChange = (e) => {
        const { id, value } = e.target;
        setTemplate(prev => ({ ...prev, [id]: value }));
    };

    const handleLogoUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setIsUploading(true);
        
        // CORREÇÃO: Extrair a extensão do arquivo original e adicionar ao nome do arquivo no Storage
        const fileExt = file.name.split('.').pop();
        const fileName = `logo-${Date.now()}.${fileExt}`;
        const filePath = `public/${fileName}`;
        
        const { error: uploadError } = await supabase.storage.from('documents').upload(filePath, file);
        
        if (uploadError) {
            toast({ title: 'Erro no upload do logo', description: uploadError.message, variant: 'destructive' });
            setIsUploading(false);
            return;
        }

        const { data: urlData } = supabase.storage.from('documents').getPublicUrl(filePath);
        
        // A URL gerada agora conterá a extensão correta (ex: .../logo-123456.png)
        setTemplate(prev => ({ ...prev, company_logo_url: urlData.publicUrl }));
        setIsUploading(false);
        toast({ title: 'Logo carregado com sucesso!', description: 'Não se esqueça de salvar as alterações.' });
    };

    const handleSave = async () => {
        setIsSaving(true);
        const { error } = await supabase.from('document_templates').upsert(template, { onConflict: 'id' }).select().single();
        if (error) {
            toast({ title: 'Erro ao salvar template', description: error.message, variant: 'destructive' });
        } else {
            toast({ title: 'Template salvo com sucesso!' });
        }
        setIsSaving(false);
    };

    if (isInitialLoading) {
        return (
            <Card className="shadow-sm">
                <CardHeader><Skeleton className="h-8 w-1/2" /></CardHeader>
                <CardContent className="space-y-6">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-24 w-full" />
                </CardContent>
                <CardFooter><Skeleton className="h-10 w-24 ml-auto" /></CardFooter>
            </Card>
        );
    }

    return (
        <div className="space-y-8">
            <Card className="shadow-sm">
                <CardHeader>
                    <CardTitle>Identidade Visual</CardTitle>
                    <CardDescription>Personalize o logo e a cor principal dos seus documentos.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                        <div className="flex items-center gap-4">
                            <div className="relative w-24 h-24">
                                {isUploading && <div className="absolute inset-0 bg-white/80 flex items-center justify-center rounded-md"><Loader2 className="animate-spin" /></div>}
                                <img src={template.company_logo_url || 'https://via.placeholder.com/100?text=Logo'} alt="Logo da empresa" className="w-24 h-24 object-contain border rounded-md p-2 bg-gray-50" />
                            </div>
                            <Button type="button" variant="outline" onClick={() => fileInputRef.current.click()} disabled={isUploading}>
                                <Camera className="w-4 h-4 mr-2" /> Alterar Logo
                            </Button>
                            <Input type="file" ref={fileInputRef} onChange={handleLogoUpload} accept="image/png, image/jpeg" className="hidden" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="primary_color">Cor Primária</Label>
                            <div className="flex items-center gap-2">
                                <Input id="primary_color" type="color" value={template.primary_color} onChange={handleFieldChange} className="p-1 h-10 w-14" />
                                <Input value={template.primary_color} onChange={handleFieldChange} id="primary_color" className="max-w-[120px]" />
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card className="shadow-sm">
                <CardHeader>
                    <CardTitle>Informações da Empresa</CardTitle>
                    <CardDescription>Estes dados aparecerão no cabeçalho dos documentos.</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2"><Label htmlFor="name">Nome da Empresa</Label><Input id="name" value={template.company_info.name || ''} onChange={handleInfoChange} /></div>
                    <div className="space-y-2"><Label htmlFor="address">Endereço</Label><Input id="address" value={template.company_info.address || ''} onChange={handleInfoChange} /></div>
                    <div className="space-y-2"><Label htmlFor="phone">Telefone</Label><Input id="phone" value={template.company_info.phone || ''} onChange={handleInfoChange} /></div>
                    <div className="space-y-2"><Label htmlFor="email">Email</Label><Input id="email" type="email" value={template.company_info.email || ''} onChange={handleInfoChange} /></div>
                </CardContent>
            </Card>

            <Card className="shadow-sm">
                <CardHeader>
                    <CardTitle>Textos Padrão</CardTitle>
                    <CardDescription>Configure textos que aparecerão no rodapé e nos termos.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2"><Label htmlFor="footer_text">Texto do Rodapé</Label><Input id="footer_text" value={template.footer_text || ''} onChange={handleFieldChange} placeholder="Ex: Todos os direitos reservados." /></div>
                    <div className="space-y-2"><Label htmlFor="terms_and_conditions">Termos e Condições / Garantia</Label><Textarea id="terms_and_conditions" value={template.terms_and_conditions || ''} onChange={handleFieldChange} rows={5} placeholder="Detalhes sobre a garantia dos serviços e peças..." /></div>
                </CardContent>
            </Card>

            <div className="flex justify-end pt-4">
                <Button onClick={handleSave} disabled={isSaving || isUploading}>
                    {isSaving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Salvando...</> : <><Save className="w-4 h-4 mr-2" /> Salvar Alterações</>}
                </Button>
            </div>
        </div>
    );
};

export default TemplateCustomizer;