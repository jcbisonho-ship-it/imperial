import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Palette, Files } from "lucide-react";
import DocumentosList from '@/components/documentos/DocumentosList';
import TemplateCustomizer from '@/components/documentos/TemplateCustomizer';

const Documentos = () => {
  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-6">
        <div className="flex items-center gap-3">
            <div className="bg-blue-100 p-2 rounded-lg">
                <Files className="h-6 w-6 text-blue-600" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">
                Gerenciador de Documentos
            </h1>
        </div>
        <p className="text-gray-500 mt-2">
            Visualize documentos gerados e personalize a aparência de seus orçamentos e recibos.
        </p>
      </div>

      <Tabs defaultValue="list" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2 bg-gray-100 rounded-lg p-1">
          <TabsTrigger value="list" className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <FileText className="w-4 h-4" />
            Documentos Salvos
          </TabsTrigger>
          <TabsTrigger value="template" className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <Palette className="w-4 h-4" />
            Personalizar Template
          </TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="mt-6">
            <DocumentosList />
        </TabsContent>

        <TabsContent value="template" className="mt-6">
            <TemplateCustomizer />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Documentos;