import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Plus, Edit, Trash2, Search, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import CollaboratorDialog from '@/components/dialogs/CollaboratorDialog';

const CollaboratorManagement = () => {
  const [collaborators, setCollaborators] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCollaborator, setEditingCollaborator] = useState(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const loadCollaborators = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('collaborators')
        .select('*')
        .order('name', { ascending: true });
      if (error) throw error;
      setCollaborators(data || []);
    } catch (error) {
      toast({ title: "Erro ao carregar colaboradores", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadCollaborators();
  }, [loadCollaborators]);

  const handleSave = async (formData) => {
    try {
      const dataToSave = {
        ...formData,
        hourly_rate: formData.hourly_rate === '' || formData.hourly_rate === null ? null : Number(formData.hourly_rate),
        commission_rate: formData.commission_rate === '' || formData.commission_rate === null ? null : Number(formData.commission_rate),
      };

      let error;
      if (editingCollaborator) {
        ({ error } = await supabase.from('collaborators').update(dataToSave).eq('id', editingCollaborator.id));
      } else {
        ({ error } = await supabase.from('collaborators').insert(dataToSave));
      }
      if (error) throw error;
      
      await loadCollaborators();
      toast({ title: `Colaborador ${editingCollaborator ? 'atualizado' : 'cadastrado'}!`, description: "A operação foi concluída com sucesso." });
      setIsDialogOpen(false);
      setEditingCollaborator(null);
    } catch (error) {
      toast({ title: `Erro ao salvar colaborador`, description: error.message, variant: "destructive" });
    }
  };

  const handleDelete = async (id) => {
    try {
      const { error } = await supabase.from('collaborators').delete().eq('id', id);
      if (error) throw error;
      await loadCollaborators();
      toast({ title: "Colaborador removido!", description: "O registro foi removido do sistema." });
    } catch (error) {
      toast({ title: "Erro ao remover colaborador", description: error.message, variant: "destructive" });
    }
  };

  const filteredCollaborators = collaborators.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.role.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.specialty && c.specialty.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Gestão de Colaboradores</h2>
          <p className="text-gray-600">Gerencie toda a sua equipe, de mecânicos a equipe administrativa.</p>
        </div>
        <Button
          onClick={() => {
            setEditingCollaborator(null);
            setIsDialogOpen(true);
          }}
          className="bg-gradient-to-r from-blue-600 to-blue-800 hover:from-blue-700 hover:to-blue-900"
        >
          <Plus className="w-4 h-4 mr-2" />
          Novo Colaborador
        </Button>
      </div>

      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Buscar por nome, email, função ou especialidade..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">Carregando...</div>
        ) : filteredCollaborators.length === 0 ? (
          <div className="text-center py-12">
            <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">Nenhum colaborador encontrado</p>
            <p className="text-gray-400 text-sm">Clique em "Novo Colaborador" para começar</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredCollaborators.map((collaborator, index) => (
              <motion.div
                key={collaborator.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="bg-gradient-to-br from-gray-50 to-white border border-gray-200 rounded-lg p-5 hover:shadow-lg transition-all"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className='flex-1'>
                    <h3 className="font-bold text-lg text-gray-800">{collaborator.name}</h3>
                    <p className="text-sm text-blue-600 font-medium">{collaborator.role}</p>
                    {collaborator.specialty && <p className="text-xs text-gray-500">{collaborator.specialty}</p>}
                  </div>
                  <div className="flex space-x-1">
                    <button onClick={() => { setEditingCollaborator(collaborator); setIsDialogOpen(true); }} className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg"><Edit className="w-4 h-4" /></button>
                    <button onClick={() => handleDelete(collaborator.id)} className="p-2 text-red-600 hover:bg-red-100 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
                <div className="space-y-2 text-sm text-gray-600">
                  <p><strong>Email:</strong> {collaborator.email}</p>
                  <p><strong>Telefone:</strong> {collaborator.phone || 'N/A'}</p>
                   {collaborator.role === 'Mecânico' && collaborator.hourly_rate && <p><strong>Valor/Hora:</strong> R$ {Number(collaborator.hourly_rate).toFixed(2)}</p>}
                  {collaborator.role !== 'Mecânico' && collaborator.commission_rate && <p><strong>Comissão:</strong> {collaborator.commission_rate}%</p>}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      <CollaboratorDialog
        isOpen={isDialogOpen}
        onClose={() => { setIsDialogOpen(false); setEditingCollaborator(null); }}
        onSave={handleSave}
        collaborator={editingCollaborator}
      />
    </div>
  );
};

export default CollaboratorManagement;