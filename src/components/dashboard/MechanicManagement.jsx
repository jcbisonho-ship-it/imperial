import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, Edit, Trash2, Search, Wrench } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import MechanicDialog from '@/components/dialogs/MechanicDialog';

const MechanicManagement = () => {
  const [mechanics, setMechanics] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingMechanic, setEditingMechanic] = useState(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadMechanics();
  }, []);

  const loadMechanics = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('mechanics')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setMechanics(data || []);
    } catch (error) {
      toast({ title: "Erro ao carregar mecânicos", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveMechanic = async (mechanicData) => {
    try {
      // Prepare data for Supabase, ensuring hourly_rate is null if empty
      const dataToSave = {
        ...mechanicData,
        hourly_rate: mechanicData.hourly_rate === '' || mechanicData.hourly_rate === null ? null : Number(mechanicData.hourly_rate),
      };

      let data, error;
      if (editingMechanic) {
        ({ data, error } = await supabase.from('mechanics').update(dataToSave).eq('id', editingMechanic.id).select().single());
      } else {
        ({ data, error } = await supabase.from('mechanics').insert(dataToSave).select().single());
      }
      if (error) throw error;
      loadMechanics();
      toast({ title: `Mecânico ${editingMechanic ? 'atualizado' : 'cadastrado'}!`, description: "A operação foi concluída com sucesso." });
      setIsDialogOpen(false);
      setEditingMechanic(null);
    } catch (error) {
      toast({ title: `Erro ao salvar mecânico`, description: error.message, variant: "destructive" });
    }
  };

  const handleDeleteMechanic = async (id) => {
    try {
      const { error } = await supabase.from('mechanics').delete().eq('id', id);
      if (error) throw error;
      loadMechanics();
      toast({ title: "Mecânico removido!", description: "O mecânico foi removido do sistema." });
    } catch (error) {
      toast({ title: "Erro ao remover mecânico", description: error.message, variant: "destructive" });
    }
  };

  const filteredMechanics = mechanics.filter(m =>
    m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.specialty?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Cadastro de Mecânicos</h2>
          <p className="text-gray-600">Gerencie a equipe de mecânicos.</p>
        </div>
        <Button onClick={() => { setEditingMechanic(null); setIsDialogOpen(true); }}>
          <Plus className="w-4 h-4 mr-2" /> Novo Mecânico
        </Button>
      </div>

      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Buscar por nome, email ou especialidade..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg"
            />
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">Carregando...</div>
        ) : filteredMechanics.length === 0 ? (
          <div className="text-center py-12">
            <Wrench className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">Nenhum mecânico encontrado.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredMechanics.map((mechanic, index) => (
              <motion.div
                key={mechanic.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="bg-gradient-to-br from-gray-50 to-white border border-gray-200 rounded-lg p-5 hover:shadow-lg transition-all"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-bold text-lg text-gray-800">{mechanic.name}</h3>
                    <p className="text-sm text-blue-600 font-medium">{mechanic.specialty}</p>
                  </div>
                  <div className="flex space-x-1">
                    <button onClick={() => { setEditingMechanic(mechanic); setIsDialogOpen(true); }} className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg"><Edit className="w-4 h-4" /></button>
                    <button onClick={() => handleDeleteMechanic(mechanic.id)} className="p-2 text-red-600 hover:bg-red-100 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
                <div className="space-y-2 text-sm text-gray-600">
                  <p><strong>Email:</strong> {mechanic.email}</p>
                  <p><strong>Telefone:</strong> {mechanic.phone}</p>
                  <p><strong>Valor/Hora:</strong> {mechanic.hourly_rate ? `R$ ${Number(mechanic.hourly_rate).toFixed(2)}` : 'Não definido'}</p>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      <MechanicDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        onSave={handleSaveMechanic}
        mechanic={editingMechanic}
      />
    </div>
  );
};

export default MechanicManagement;