import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const modules = [
    'dashboard', 'clientes', 'veiculos', 'produtos', 'orcamentos', 
    'os', 'colaboradores', 'financeiro', 'comissoes', 
    'relatorios', 'documentos', 'usuarios', 'configuracoes', 'profile'
];
const actions = ['view', 'create', 'edit', 'delete', 'export'];
const roles = ['manager', 'receptionist', 'mechanic']; // Admin is always true

const ConfigPermissoes = () => {
    const { toast } = useToast();
    const { permissions, fetchPermissions } = useAuth();
    const [localPermissions, setLocalPermissions] = useState({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (permissions) {
            setLocalPermissions(permissions);
            setLoading(Object.keys(permissions).length === 0);
        }
    }, [permissions]);

    const handlePermissionChange = (role, module, action, checked) => {
        setLocalPermissions(prev => {
            const newPerms = JSON.parse(JSON.stringify(prev)); // Deep copy
            if (!newPerms[role]) newPerms[role] = {};
            if (!newPerms[role][module]) newPerms[role][module] = {};
            newPerms[role][module][action] = checked;
            return newPerms;
        });
    };

    const handleSave = async () => {
        setLoading(true);
        const permissionsToSave = [];
        for (const role of roles) {
            for (const module of modules) {
                const p = localPermissions[role]?.[module] || {};
                permissionsToSave.push({
                    role,
                    module,
                    can_view: !!p.view,
                    can_create: !!p.create,
                    can_edit: !!p.edit,
                    can_delete: !!p.delete,
                    can_export: !!p.export,
                });
            }
        }

        const { error } = await supabase.from('permissions').upsert(permissionsToSave, { onConflict: 'role,module' });
        
        if (error) {
            toast({ title: 'Erro ao salvar permissões', description: error.message, variant: 'destructive' });
        } else {
            toast({ title: 'Permissões salvas com sucesso!' });
            await fetchPermissions(); // Refresh context
        }
        setLoading(false);
    };

    return (
        <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Matriz de Permissões</h3>
                <Button onClick={handleSave} disabled={loading}>{loading ? 'Salvando...' : 'Salvar Permissões'}</Button>
            </div>
            <p className="text-sm text-gray-500 mb-4">O perfil 'Admin' tem acesso total e não pode ser editado.</p>
            
            {loading ? <p>Carregando permissões...</p> : (
            <Tabs defaultValue="manager">
                <TabsList>
                    {roles.map(role => <TabsTrigger key={role} value={role} className="capitalize">{role}</TabsTrigger>)}
                </TabsList>
                {roles.map(role => (
                    <TabsContent key={role} value={role}>
                        <div className="overflow-x-auto border rounded-lg">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-4 py-2 text-left">Módulo</th>
                                        {actions.map(action => <th key={action} className="px-4 py-2 capitalize">{action}</th>)}
                                    </tr>
                                </thead>
                                <tbody>
                                    {modules.map(module => (
                                        <tr key={module} className="border-t">
                                            <td className="px-4 py-2 font-medium capitalize">{module.replace(/-/g, ' ')}</td>
                                            {actions.map(action => (
                                                <td key={action} className="px-4 py-2 text-center">
                                                    <Checkbox
                                                        checked={!!localPermissions[role]?.[module]?.[action]}
                                                        onCheckedChange={(checked) => handlePermissionChange(role, module, action, checked)}
                                                    />
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </TabsContent>
                ))}
            </Tabs>
            )}
        </div>
    );
};

export default ConfigPermissoes;