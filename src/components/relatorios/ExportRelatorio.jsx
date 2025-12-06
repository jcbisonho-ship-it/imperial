import React from 'react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Download, FileDown, Mail } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import jsPDF from "jspdf";
import "jspdf-autotable";

const ExportRelatorio = ({ reportRef, reportTitle }) => {
    const { toast } = useToast();

    const handleExportCSV = () => {
        toast({ title: "Funcionalidade em desenvolvimento", description: "A exportação para CSV será implementada em breve." });
    };

    const handleExportPDF = () => {
        if (!reportRef.current) return;
        
        const doc = new jsPDF();
        doc.html(reportRef.current, {
            callback: function (doc) {
                doc.save(`${reportTitle}_report.pdf`);
            },
            x: 15,
            y: 15,
            width: 170,
            windowWidth: 650
        });

        toast({ title: "Exportando PDF...", description: "Seu relatório está sendo gerado." });
    };
    
    const handleScheduleEmail = () => {
        toast({ title: "Funcionalidade em desenvolvimento", description: "O agendamento de relatórios por e-mail será implementado em breve." });
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button>
                    <Download className="w-4 h-4 mr-2" />
                    Exportar
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
                <DropdownMenuItem onClick={handleExportCSV}>
                    <FileDown className="w-4 h-4 mr-2" /> Exportar CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportPDF}>
                    <FileDown className="w-4 h-4 mr-2" /> Exportar PDF
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleScheduleEmail}>
                    <Mail className="w-4 h-4 mr-2" /> Agendar por E-mail
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
};

export default ExportRelatorio;