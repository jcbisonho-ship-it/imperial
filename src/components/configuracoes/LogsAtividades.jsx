import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { format } from 'date-fns';

const LogsAtividades = () => {
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [logs, setLogs] = useState([]);
    const [users, setUsers] = useState({});

    const fetchUsers = useCallback(async (userIds) => {
        const { data, error } = await supabase
            .from('users_data')
            .select('id, full_name')
            .in('id', userIds);
        
        if (error) {
            toast({ title: 'Erro ao buscar usuários', description: error.message, variant: 'destructive' });
            return {};
        }

        return data.reduce((acc, user) => {
            acc[user.id] = user.full_name;
            return acc;
        }, {});
    }, [toast]);

    const fetchLogs = useCallback(async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('audit_log')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(100);
        
        if (error) {
            toast({ title: 'Erro ao carregar logs', description: error.message, variant: 'destructive' });
        } else {
            setLogs(data);
            const userIds = [...new Set(data.map(log => log.user_id).filter(Boolean))];
            if (userIds.length > 0) {
                const usersData = await fetchUsers(userIds);
                setUsers(usersData);
            }
        }
        setLoading(false);
    }, [toast, fetchUsers]);

    useEffect(() => {
        fetchLogs();
    }, [fetchLogs]);
    
    const logsWithUserNames = useMemo(() => {
        return logs.map(log => ({
            ...log,
            user_name: users[log.user_id] || 'Sistema'
        }));
    }, [logs, users]);


    return (
        <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-lg font-semibold mb-4">Logs de Atividades Recentes</h3>
            <div className="border rounded-lg overflow-auto max-h-[60vh]">
                <table className="w-full text-sm">
                    <thead className="bg-gray-50 sticky top-0">
                        <tr>
                            <th className="px-4 py-2 text-left">Data</th>
                            <th className="px-4 py-2 text-left">Usuário</th>
                            <th className="px-4 py-2 text-left">Ação</th>
                            <th className="px-4 py-2 text-left">Detalhes</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? <tr><td colSpan="4" className="text-center p-4">Carregando...</td></tr> :
                        logsWithUserNames.map(log => (
                            <tr key={log.id} className="border-t">
                                <td className="px-4 py-2 whitespace-nowrap">{format(new Date(log.created_at), 'dd/MM/yyyy HH:mm:ss')}</td>
                                <td className="px-4 py-2">{log.user_name}</td>
                                <td className="px-4 py-2">{log.action}</td>
                                <td className="px-4 py-2"><pre className="text-xs bg-gray-100 p-1 rounded"><code>{JSON.stringify(log.details, null, 2)}</code></pre></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default LogsAtividades;