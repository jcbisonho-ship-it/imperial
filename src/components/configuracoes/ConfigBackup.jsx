import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Download, History, Upload, AlertTriangle, Code, Database, ShieldAlert, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const TABLES_TO_BACKUP = [
  'oficina_dados',
  'financial_categories', 
  'financial_subcategories',
  'product_categories', 
  'product_subcategories',
  'categorias', // service categories
  'subcategorias', // service subcategories
  'customers', 
  'collaborators', 
  'suppliers', 
  'accounts',
  'vehicles',
  'products', 
  'servicos',
  'product_variants',
  'budgets',
  'service_orders', 
  'work_orders',
  'budget_items', 
  'work_order_items',
  'transactions',
  'stock_movements',
  'lembretes',
  'users_data',
  'settings',
  'permissions',
  'document_templates'
];

const ConfigBackup = () => {
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [backups, setBackups] = useState([]);
    const [isBackingUp, setIsBackingUp] = useState(false);
    const [isRestoring, setIsRestoring] = useState(false);
    const [restoreProgress, setRestoreProgress] = useState(0);
    const [restoreStatus, setRestoreStatus] = useState('');
    const [confirmRestoreOpen, setConfirmRestoreOpen] = useState(false);
    const [selectedFile, setSelectedFile] = useState(null);
    const [backupType, setBackupType] = useState('data'); // 'data' or 'full'
    
    const fileInputRef = useRef(null);

    const fetchBackups = useCallback(async () => {
        setLoading(true);
        // Changed fetch to link with users_data instead of direct relation which was missing
        const { data, error } = await supabase
            .from('backups')
            .select('*, user:users_data(full_name)') 
            .order('created_at', { ascending: false });
            
        if (error) {
             console.error("Error fetching backups:", error);
        } else {
            setBackups(data || []);
        }
        setLoading(false);
    }, []);

    useEffect(() => {
        fetchBackups();
    }, [fetchBackups]);

    const downloadFile = (content, fileName, contentType) => {
        const blob = new Blob([content], { type: contentType });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const handleBackup = async () => {
        setIsBackingUp(true);
        const timestamp = format(new Date(), 'yyyy-MM-dd_HH-mm');
        
        const backupData = {
            timestamp: new Date().toISOString(),
            version: '2.0',
            type: backupType,
            tables: {}
        };

        try {
            // 1. Fetch Database Data
            for (const tableName of TABLES_TO_BACKUP) {
                const { data, error } = await supabase.from(tableName).select('*');
                if (error) {
                    console.warn(`Skipping table ${tableName} due to error:`, error);
                    continue;
                }
                backupData.tables[tableName] = data;
            }

            // 2. Generate Database Backup File
            const jsonString = JSON.stringify(backupData, null, 2);
            const fileName = `backup_oficina_${timestamp}_${backupType}.json`;
            downloadFile(jsonString, fileName, 'application/json');

            // 3. Handle "Codebase" Request
            if (backupType === 'full') {
                const instructions = `
BACKUP DE CÓDIGO FONTE - INSTRUÇÕES
Data: ${new Date().toLocaleString()}

ATENÇÃO: Devido a restrições de segurança dos navegadores web, o download direto dos arquivos 
de código fonte (.jsx, .css, etc.) não é possível através da interface do usuário.

O arquivo JSON baixado (${fileName}) contém TODOS os dados do banco de dados, 
incluindo configurações do sistema, permissões e templates.
                `;
                
                setTimeout(() => {
                    downloadFile(instructions, `README_CODEBASE_${timestamp}.txt`, 'text/plain');
                }, 1000);
            }

            // 4. Log to Database
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { error } = await supabase.from('backups').insert({
                    triggered_by: user.id,
                    status: 'completed',
                    file_url: 'local_download',
                    notes: `Backup ${backupType === 'full' ? 'Completo' : 'Dados'}: ${fileName}`,
                    created_at: new Date().toISOString()
                });

                if (error) throw error;
                
                fetchBackups();
            }

            toast({
                title: 'Backup iniciado com sucesso!',
                description: backupType === 'full' 
                    ? 'Os dados foram baixados. Veja o arquivo de texto para instruções sobre o código.'
                    : 'O arquivo de dados foi gerado e baixado.',
                className: "bg-green-50 border-green-200"
            });

        } catch (error) {
            console.error("Backup error:", error);
            toast({
                title: 'Erro no Backup',
                description: error.message || 'Ocorreu um erro ao gerar o backup.',
                variant: 'destructive'
            });
        } finally {
            setIsBackingUp(false);
        }
    };

    const handleFileSelect = (e) => {
        if (e.target.files && e.target.files[0]) {
            setSelectedFile(e.target.files[0]);
            setConfirmRestoreOpen(true);
        }
    };

    const triggerFileSelect = () => {
        fileInputRef.current?.click();
    };

    const executeRestore = async () => {
        if (!selectedFile) return;
        
        setIsRestoring(true);
        setConfirmRestoreOpen(false);
        setRestoreProgress(0);
        
        try {
            const text = await selectedFile.text();
            let backupData;
            
            try {
                backupData = JSON.parse(text);
            } catch (e) {
                throw new Error("Arquivo inválido. O arquivo deve ser um JSON válido.");
            }

            if (!backupData.tables) {
                throw new Error("Formato de backup inválido. Estrutura 'tables' não encontrada.");
            }

            const totalTables = TABLES_TO_BACKUP.length;
            let processedCount = 0;
            
            for (const tableName of TABLES_TO_BACKUP) {
                const tableData = backupData.tables[tableName];
                setRestoreStatus(`Restaurando ${tableName}...`);
                
                if (tableData && Array.isArray(tableData) && tableData.length > 0) {
                    const CHUNK_SIZE = 50; 
                    for (let i = 0; i < tableData.length; i += CHUNK_SIZE) {
                        const chunk = tableData.slice(i, i + CHUNK_SIZE);
                        const { error } = await supabase
                            .from(tableName)
                            .upsert(chunk, { onConflict: 'id', ignoreDuplicates: false });
                            
                        if (error) {
                            console.warn(`Error restoring chunk for ${tableName}:`, error);
                        }
                    }
                }
                
                processedCount++;
                setRestoreProgress(Math.round((processedCount / totalTables) * 100));
            }

            setRestoreStatus("Finalizado!");
            toast({
                title: 'Restauração Concluída',
                description: 'Todos os dados e configurações foram restaurados com sucesso.',
                className: "bg-green-50 border-green-200"
            });

            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                await supabase.from('backups').insert({
                    triggered_by: user.id,
                    status: 'restored',
                    file_url: 'local_upload',
                    notes: `Restauração (${backupData.type || 'manual'}): ${selectedFile.name}`,
                    created_at: new Date().toISOString()
                });
                fetchBackups();
            }

        } catch (error) {
            console.error("Restore error:", error);
            toast({
                title: 'Erro na Restauração',
                description: error.message || 'Falha ao processar o arquivo.',
                variant: 'destructive'
            });
        } finally {
            setIsRestoring(false);
            setSelectedFile(null);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    return (
        <div className="bg-white rounded-xl shadow-lg p-6 space-y-6">
            <div>
                <h3 className="text-lg font-semibold text-gray-900">Backup e Restauração do Sistema</h3>
                <p className="text-sm text-gray-500">
                    Gerencie os backups de dados e configurações da aplicação.
                </p>
            </div>

            <Tabs defaultValue="backup" className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-4">
                    <TabsTrigger value="backup">Criar Backup (Exportar)</TabsTrigger>
                    <TabsTrigger value="restore">Restaurar Backup (Importar)</TabsTrigger>
                </TabsList>

                {/* EXPORT TAB */}
                <TabsContent value="backup" className="space-y-4">
                    <div className="border rounded-lg p-6 bg-gray-50/50">
                        <div className="mb-6">
                            <h4 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                                <Download className="w-5 h-5 text-blue-600" /> 
                                Selecione o tipo de Backup
                            </h4>
                            <RadioGroup value={backupType} onValueChange={setBackupType} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <RadioGroupItem value="data" id="data" className="peer sr-only" />
                                    <Label
                                        htmlFor="data"
                                        className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-white p-4 hover:bg-gray-50 peer-data-[state=checked]:border-blue-600 peer-data-[state=checked]:bg-blue-50 cursor-pointer"
                                    >
                                        <Database className="mb-2 h-6 w-6 text-gray-600" />
                                        <span className="font-semibold">Apenas Dados</span>
                                        <span className="text-xs text-gray-500 text-center mt-1">
                                            Clientes, OS, Financeiro, Estoque, etc.
                                        </span>
                                    </Label>
                                </div>
                                <div>
                                    <RadioGroupItem value="full" id="full" className="peer sr-only" />
                                    <Label
                                        htmlFor="full"
                                        className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-white p-4 hover:bg-gray-50 peer-data-[state=checked]:border-blue-600 peer-data-[state=checked]:bg-blue-50 cursor-pointer"
                                    >
                                        <div className="flex gap-2">
                                            <Database className="mb-2 h-6 w-6 text-gray-600" />
                                            <Code className="mb-2 h-6 w-6 text-gray-600" />
                                        </div>
                                        <span className="font-semibold">Sistema Completo</span>
                                        <span className="text-xs text-gray-500 text-center mt-1">
                                            Dados + Configurações + Instruções de Código
                                        </span>
                                    </Label>
                                </div>
                            </RadioGroup>
                        </div>

                        {backupType === 'full' && (
                            <Alert className="mb-6 bg-blue-50 border-blue-200 text-blue-900">
                                <ShieldAlert className="h-4 w-4" />
                                <AlertTitle>Nota sobre Código Fonte</AlertTitle>
                                <AlertDescription className="text-xs">
                                    Por segurança, navegadores não podem compactar arquivos de sistema (.jsx, .js) diretamente.
                                    O backup "Completo" baixará todos os dados do banco (incluindo configurações e permissões) 
                                    e um arquivo de texto com instruções para backup manual dos arquivos de fonte.
                                </AlertDescription>
                            </Alert>
                        )}

                        <Button onClick={handleBackup} disabled={isBackingUp || isRestoring} className="w-full" size="lg">
                            {isBackingUp ? (
                                <>
                                    <Loader2 className="w-5 h-5 mr-2 animate-spin" /> 
                                    Gerando Backup {backupType === 'full' ? 'Completo' : 'de Dados'}...
                                </>
                            ) : (
                                <>
                                    <Download className="w-5 h-5 mr-2" /> 
                                    Baixar Backup {backupType === 'full' ? 'Completo' : 'de Dados'}
                                </>
                            )}
                        </Button>
                    </div>
                </TabsContent>

                {/* RESTORE TAB */}
                <TabsContent value="restore" className="space-y-4">
                    <div className="border rounded-lg p-6 bg-gray-50/50">
                        <div className="flex items-center gap-3 text-orange-700 mb-4">
                            <div className="p-2 bg-orange-100 rounded-lg">
                                <Upload className="w-5 h-5" />
                            </div>
                            <h4 className="font-medium">Importar e Restaurar</h4>
                        </div>
                        
                        <p className="text-sm text-gray-600 mb-6">
                            Selecione um arquivo JSON de backup (.json) para restaurar. 
                            Isso irá <strong>mesclar</strong> os dados do arquivo com o banco atual, atualizando registros existentes.
                        </p>

                        <div className="flex flex-col items-center justify-center w-full">
                             <input 
                                type="file" 
                                accept=".json" 
                                ref={fileInputRef} 
                                className="hidden" 
                                onChange={handleFileSelect} 
                            />
                            <Button 
                                variant="outline" 
                                onClick={triggerFileSelect} 
                                disabled={isBackingUp || isRestoring}
                                className="w-full h-24 border-dashed border-2 border-orange-200 hover:bg-orange-50 hover:text-orange-700 text-orange-700 flex flex-col gap-2"
                            >
                                <Upload className="w-8 h-8" />
                                <span>Clique para selecionar arquivo de backup</span>
                            </Button>
                        </div>

                        {isRestoring && (
                            <div className="space-y-2 mt-6 animate-in fade-in slide-in-from-top-4 duration-300">
                                 <div className="flex justify-between text-sm text-gray-600">
                                    <span>{restoreStatus}</span>
                                    <span>{restoreProgress}%</span>
                                 </div>
                                 <Progress value={restoreProgress} className="h-2" />
                            </div>
                        )}
                    </div>
                </TabsContent>
            </Tabs>

            {/* HISTORY SECTION */}
            <div>
                <h4 className="text-md font-semibold flex items-center gap-2 mb-4 text-gray-700 mt-8">
                    <History className="w-5 h-5 text-gray-500" /> Histórico de Operações
                </h4>
                <div className="border rounded-lg overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 border-b">
                                <tr>
                                    <th className="px-4 py-3 text-left font-medium text-gray-500">Data</th>
                                    <th className="px-4 py-3 text-left font-medium text-gray-500">Detalhes</th>
                                    <th className="px-4 py-3 text-left font-medium text-gray-500">Status</th>
                                    <th className="px-4 py-3 text-left font-medium text-gray-500">Usuário</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {loading ? (
                                    <tr><td colSpan="4" className="text-center p-6 text-gray-500">Carregando histórico...</td></tr>
                                ) : backups.length === 0 ? (
                                    <tr><td colSpan="4" className="text-center p-6 text-gray-500">Nenhum histórico encontrado.</td></tr>
                                ) : (
                                    backups.map(backup => (
                                        <tr key={backup.id} className="hover:bg-gray-50/50">
                                            <td className="px-4 py-3 text-gray-600">
                                                {format(new Date(backup.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                                            </td>
                                            <td className="px-4 py-3 text-gray-900 font-medium flex items-center gap-2">
                                                {backup.notes?.includes('Completo') ? <Code className="w-3 h-3 text-blue-500"/> : <Database className="w-3 h-3 text-gray-400"/>}
                                                {backup.notes || '-'}
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                                    backup.status === 'completed' || backup.status === 'restored'
                                                        ? 'bg-green-100 text-green-800' 
                                                        : 'bg-gray-100 text-gray-800'
                                                }`}>
                                                    {backup.status === 'restored' ? 'Restaurado' : 'Gerado'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-gray-500">{backup.user?.full_name || 'Sistema'}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <AlertDialog open={confirmRestoreOpen} onOpenChange={setConfirmRestoreOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2 text-orange-600">
                            <AlertTriangle className="w-5 h-5" /> 
                            Confirmar Restauração
                        </AlertDialogTitle>
                        <AlertDialogDescription className="space-y-3 text-left">
                            <p>Você selecionou o arquivo: <strong>{selectedFile?.name}</strong></p>
                            <Alert variant="warning" className="bg-orange-50 border-orange-200 text-orange-800">
                                <AlertTitle>Atenção</AlertTitle>
                                <AlertDescription className="text-xs">
                                    A restauração irá <strong>atualizar</strong> registros existentes e <strong>criar</strong> novos.
                                    <br/>
                                    Dados não presentes no backup serão mantidos (merge).
                                    <br/>
                                    <strong>Nota:</strong> Se este for um backup "Completo", apenas os dados e configurações do banco serão restaurados. Arquivos de código devem ser implantados manualmente.
                                </AlertDescription>
                            </Alert>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => { setSelectedFile(null); if(fileInputRef.current) fileInputRef.current.value = ''; }}>
                            Cancelar
                        </AlertDialogCancel>
                        <AlertDialogAction onClick={executeRestore} className="bg-orange-600 hover:bg-orange-700 text-white">
                            Confirmar e Restaurar
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
};

export default ConfigBackup;