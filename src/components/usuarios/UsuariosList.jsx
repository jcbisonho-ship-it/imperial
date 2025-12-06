import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/lib/customSupabaseClient';
import { Plus, Search, Edit2, Trash2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { Badge } from '@/components/ui/badge';
import UsuarioDialog from './UsuarioDialog';
import { adminDeleteUser } from '@/services/authService';

// RESPONSIVE CONSTANTS
const CONTAINER_CLASS = "w-full p-4 sm:p-6 md:p-8 space-y-6";
const HEADER_CLASS = "flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4";
const BUTTON_CLASS = "w-full sm:w-auto";
const SEARCH_CLASS = "w-full sm:w-72";

const UsuariosList = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const { toast } = useToast();

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_all_users_data');
      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      toast({ title: 'Erro ao buscar usuários', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleDelete = async (id) => {
    if (!window.confirm('Tem certeza que deseja excluir este usuário?')) return;
    try {
      const { error } = await adminDeleteUser(id);
      if (error) throw error;
      toast({ title: 'Usuário excluído com sucesso' });
      fetchUsers();
    } catch (error) {
      toast({ title: 'Erro ao excluir', description: error.message, variant: 'destructive' });
    }
  };

  const openDialog = (user = null) => {
    setSelectedUser(user);
    setIsDialogOpen(true);
  };

  const filteredUsers = users.filter(u => 
    (u.full_name && u.full_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (u.email && u.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className={CONTAINER_CLASS}>
      <div className={HEADER_CLASS}>
        <div>
           <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">Usuários do Sistema</h1>
           <p className="text-gray-500 mt-1 text-sm sm:text-base">Gerencie o acesso ao sistema.</p>
        </div>
        <Button onClick={() => openDialog()} className={BUTTON_CLASS}>
          <Plus className="mr-2 h-4 w-4" /> Novo Usuário
        </Button>
      </div>

      <div className="bg-white p-4 rounded-lg border shadow-sm space-y-4">
        <div className={`relative ${SEARCH_CLASS}`}>
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
            <Input 
                placeholder="Buscar usuário..." 
                value={searchTerm} 
                onChange={(e) => setSearchTerm(e.target.value)} 
                className="pl-9 h-10"
            />
        </div>

        <div className="rounded-md border overflow-x-auto">
          <Table className="min-w-[800px]">
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead>Nome</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Perfil</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                 <TableRow><TableCell colSpan={5} className="h-24 text-center"><div className="flex justify-center"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div></div></TableCell></TableRow>
              ) : filteredUsers.length === 0 ? (
                 <TableRow><TableCell colSpan={5} className="h-24 text-center text-gray-500">Nenhum usuário encontrado.</TableCell></TableRow>
              ) : (
                filteredUsers.map((user) => (
                  <TableRow key={user.id} className="hover:bg-gray-50">
                    <TableCell className="font-medium">{user.full_name || 'Sem nome'}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell><Badge variant="outline" className="capitalize">{user.role}</Badge></TableCell>
                    <TableCell><Badge variant={user.email_confirmed_at ? 'default' : 'secondary'}>{user.email_confirmed_at ? 'Confirmado' : 'Pendente'}</Badge></TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon" onClick={() => openDialog(user)} title="Editar"><Edit2 className="h-4 w-4 text-blue-600" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(user.id)} title="Excluir"><Trash2 className="h-4 w-4 text-red-600" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <UsuarioDialog isOpen={isDialogOpen} onClose={() => setIsDialogOpen(false)} onSaveSuccess={fetchUsers} user={selectedUser} />
    </div>
  );
};

export default UsuariosList;