import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { generateBlankChecklistPDF } from '@/services/pdfService.js';
import { Printer, FileText, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast';

const ChecklistPadrao = () => {
    const navigate = useNavigate();
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);

    const handlePrint = async () => {
        setLoading(true);
        try {
            const doc = await generateBlankChecklistPDF();
            doc.autoPrint();
            doc.output('dataurlnewwindow');
        } catch (error) {
            console.error("Error generating PDF:", error);
            toast({ title: "Erro", description: "Não foi possível gerar o checklist.", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    const handleDownload = async () => {
        setLoading(true);
        try {
            const doc = await generateBlankChecklistPDF();
            doc.save('checklist_padrao.pdf');
            toast({ title: "Sucesso", description: "Download iniciado." });
        } catch (error) {
            console.error("Error generating PDF:", error);
            toast({ title: "Erro", description: "Não foi possível baixar o checklist.", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container mx-auto py-10 px-4 max-w-3xl">
            <Button variant="ghost" onClick={() => navigate(-1)} className="mb-6">
                <ArrowLeft className="w-4 h-4 mr-2"/> Voltar
            </Button>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <FileText className="w-6 h-6 text-blue-600" />
                        Checklist Veicular Padrão
                    </CardTitle>
                    <CardDescription>
                        Gere um PDF do checklist padrão de inspeção com 67 itens para impressão e preenchimento manual.
                        Ideal para uso na recepção ou no pátio da oficina.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="bg-gray-50 p-6 rounded-lg border text-sm text-gray-600">
                        <h3 className="font-semibold mb-2 text-gray-900">O documento inclui:</h3>
                        <ul className="list-disc list-inside space-y-1">
                            <li>Cabeçalho com dados da sua oficina (Logo, Endereço, Contatos)</li>
                            <li>Campos para dados do cliente, veículo e mecânico</li>
                            <li>Lista completa de 67 itens de inspeção (Motor, Freios, Suspensão, etc.)</li>
                            <li>Espaço para observações em cada item</li>
                            <li>Rodapé com data e paginação</li>
                        </ul>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4">
                        <Button onClick={handlePrint} disabled={loading} className="flex-1 h-12 text-base">
                            <Printer className="w-5 h-5 mr-2" /> Imprimir Agora
                        </Button>
                        <Button onClick={handleDownload} disabled={loading} variant="outline" className="flex-1 h-12 text-base">
                            <FileText className="w-5 h-5 mr-2" /> Baixar PDF
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default ChecklistPadrao;