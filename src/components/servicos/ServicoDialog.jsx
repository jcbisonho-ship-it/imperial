import React, { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from '@/lib/customSupabaseClient';
import { PlusCircle, X } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import CategoriaDialog from './CategoriaDialog';
import SubcategoriaDialog from './SubcategoriaDialog';

const ServicoDialog = ({ isOpen, onClose, onSave, serviceToEdit }) => {
  const { register, handleSubmit, control, reset, setValue, watch, formState: { errors, isSubmitting } } = useForm();
  const { toast } = useToast();
  
  const [categorias, setCategorias] = useState([]);
  const [subcategorias, setSubcategorias] = useState([]);
  
  const [isCatModalOpen, setIsCatModalOpen] = useState(false);
  const [isSubCatModalOpen, setIsSubCatModalOpen] = useState(false);

  // Delete confirmation state
  const [deleteConfirmation, setDeleteConfirmation] = useState({ isOpen: false, id: null, type: null, name: '' });

  // Watch category to filter subcategories
  const selectedCategoriaId = watch('id_categoria');

  // Load Categories on Mount
  useEffect(() => {
    fetchCategorias();
  }, []);

  // Handle Subcategories Fetching
  useEffect(() => {
    if (selectedCategoriaId) {
      fetchSubcategorias(selectedCategoriaId);
    } else {
      setSubcategorias([]);
    }
  }, [selectedCategoriaId]);

  // Initialize Form State when Dialog Opens
  useEffect(() => {
    if (isOpen) {
      if (serviceToEdit) {
        // Pre-fill form with service data
        reset({
          codigo: serviceToEdit.codigo || '',
          descricao_servico: serviceToEdit.descricao_servico || serviceToEdit.nome || '',
          descricao_veiculo: serviceToEdit.descricao_veiculo || '',
          tempo_padrao: serviceToEdit.tempo_padrao || '',
          id_categoria: serviceToEdit.id_categoria || '',
          id_subcategoria: serviceToEdit.id_subcategoria || '',
          valor_referencia: serviceToEdit.valor_referencia || 0
        });
        
        // If editing, we need to ensure subcategories for the selected category are loaded immediately
        if (serviceToEdit.id_categoria) {
           fetchSubcategorias(serviceToEdit.id_categoria);
        }
      } else {
        // Reset for new entry
        reset({
          codigo: '',
          descricao_servico: '',
          descricao_veiculo: '',
          tempo_padrao: '',
          id_categoria: '',
          id_subcategoria: '',
          valor_referencia: 0
        });
        setSubcategorias([]);
      }
    }
  }, [isOpen, serviceToEdit, reset]);

  const fetchCategorias = async () => {
    const { data } = await supabase.from('categorias').select('*').order('nome');
    setCategorias(data || []);
  };

  const fetchSubcategorias = async (catId) => {
    if (!catId) return;
    const { data } = await supabase
      .from('subcategorias')
      .select('*')
      .eq('id_categoria', catId)
      .order('nome');
    setSubcategorias(data || []);
  };

  const handleNewCategory = (newCat) => {
    fetchCategorias().then(() => {
      setValue('id_categoria', newCat.id);
    });
  };

  const handleNewSubcategory = (newSub) => {
    if (selectedCategoriaId) {
      fetchSubcategorias(selectedCategoriaId).then(() => {
        setValue('id_subcategoria', newSub.id);
      });
    }
  };

  // CRITICAL: Using onPointerDown prevents Radix Select from hijacking the click event
  const handleDeleteRequest = (e, id, type, name) => {
    e.preventDefault();
    e.stopPropagation();
    setDeleteConfirmation({ isOpen: true, id, type, name });
  };

  const executeDelete = async () => {
    const { id, type } = deleteConfirmation;
    if (!id) return;

    try {
      const table = type === 'category' ? 'categorias' : 'subcategorias';
      const usageColumn = type === 'category' ? 'id_categoria' : 'id_subcategoria';

      // Check usage in servicos
      const { count, error: checkError } = await supabase
          .from('servicos')
          .select('*', { count: 'exact', head: true })
          .eq(usageColumn, id);

      if (checkError) throw checkError;
      if (count > 0) throw new Error(`Este item está sendo usado em ${count} serviços e não pode ser excluído.`);

      // If category, check for subcategories
      if (type === 'category') {
          const { count: subCount, error: subCheckError } = await supabase
              .from('subcategorias')
              .select('*', { count: 'exact', head: true })
              .eq('id_categoria', id);
          
          if (subCheckError) throw subCheckError;
          if (subCount > 0) throw new Error(`Esta categoria possui ${subCount} subcategorias. Exclua-as primeiro.`);
      }

      const { error } = await supabase.from(table).delete().eq('id', id);
      if (error) throw error;

      toast({ title: 'Item excluído com sucesso.' });

      // Clear selection if needed
      const currentCat = watch('id_categoria');
      const currentSub = watch('id_subcategoria');

      if (type === 'category' && currentCat === id) {
          setValue('id_categoria', '');
          setValue('id_subcategoria', '');
      }
      if (type === 'subcategory' && currentSub === id) {
          setValue('id_subcategoria', '');
      }

      // Refresh dropdowns
      if (type === 'category') fetchCategorias();
      else fetchSubcategorias(selectedCategoriaId);

    } catch (err) {
      console.error("Delete error:", err);
      toast({ variant: 'destructive', title: 'Erro ao excluir', description: err.message });
    } finally {
      setDeleteConfirmation({ isOpen: false, id: null, type: null, name: '' });
    }
  };

  const onSubmit = async (data) => {
    try {
      if (data.codigo) {
        let query = supabase
          .from('servicos')
          .select('id')
          .eq('codigo', data.codigo);

        if (serviceToEdit) {
          query = query.neq('id', serviceToEdit.id);
        }

        const { data: existing, error: checkError } = await query.maybeSingle();
        if (checkError) throw checkError;
        if (existing) {
          toast({ variant: "destructive", title: "Erro", description: "Já existe um serviço com este código." });
          return;
        }
      }

      const payload = {
        codigo: data.codigo,
        descricao_servico: data.descricao_servico,
        nome: data.descricao_servico,
        descricao_veiculo: data.descricao_veiculo,
        tempo_padrao: data.tempo_padrao,
        id_categoria: data.id_categoria || null,
        id_subcategoria: data.id_subcategoria || null,
        valor_referencia: parseFloat(data.valor_referencia || 0),
        tempo_duracao_minutos: 0
      };

      let error;
      if (serviceToEdit) {
        const { error: updateError } = await supabase
          .from('servicos')
          .update(payload)
          .eq('id', serviceToEdit.id);
        error = updateError;
      } else {
        const { error: insertError } = await supabase
          .from('servicos')
          .insert([payload]);
        error = insertError;
      }

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: `Serviço ${serviceToEdit ? 'atualizado' : 'criado'} com sucesso!`,
      });
      
      onSave();
      onClose();
    } catch (error) {
      console.error('Erro ao salvar serviço:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Ocorreu um erro ao salvar. Verifique sua conexão.",
      });
    }
  };

  return (
    <>
      <style>{`
        /* Hide delete button when displayed inside SelectTrigger/SelectValue */
        [data-radix-select-trigger] .delete-btn { display: none !important; }
        
        /* Ensure delete button is visible on hover inside content items */
        .select-item-container { position: relative; } /* Ensure proper positioning context for absolute X */
        .select-item-container .delete-btn { 
            opacity: 0; 
            transition: opacity 0.2s; 
            z-index: 50; /* Ensure it's above other elements if any */
        }
        .select-item-container:hover .delete-btn { opacity: 1; }
        .select-item-container:active .delete-btn { opacity: 1; } /* Fallback for touch/active state */
      `}</style>

      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{serviceToEdit ? 'Editar Serviço' : 'Novo Serviço'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
            
            <div className="grid grid-cols-12 gap-4">
              <div className="col-span-4 grid gap-2">
                <Label htmlFor="codigo">Código <span className="text-red-500">*</span></Label>
                <Input
                  id="codigo"
                  placeholder="EX: MAN01"
                  className={errors.codigo ? "border-red-500" : ""}
                  {...register('codigo', { required: 'Obrigatório' })}
                />
                {errors.codigo && <span className="text-xs text-red-500">{errors.codigo.message}</span>}
              </div>
              
              <div className="col-span-8 grid gap-2">
                <Label htmlFor="descricao_servico">Descrição do Serviço <span className="text-red-500">*</span></Label>
                <Input
                  id="descricao_servico"
                  placeholder="Ex: Troca de Óleo 5w30"
                  className={errors.descricao_servico ? "border-red-500" : ""}
                  {...register('descricao_servico', { required: 'Obrigatório' })}
                />
                {errors.descricao_servico && <span className="text-xs text-red-500">{errors.descricao_servico.message}</span>}
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="descricao_veiculo">Descrição do Veículo (Opcional)</Label>
              <Input
                id="descricao_veiculo"
                placeholder="Ex: Honda Civic 2015-2020"
                {...register('descricao_veiculo')}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Categoria</Label>
                <div className="flex gap-2">
                  <Controller
                    control={control}
                    name="id_categoria"
                    render={({ field }) => (
                      <Select onValueChange={field.onChange} value={field.value || ''}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Selecione a Categoria" />
                        </SelectTrigger>
                        <SelectContent className="max-h-[200px]">
                          {categorias.length === 0 ? (
                              <SelectItem value="empty" disabled>Nenhuma categoria</SelectItem>
                          ) : (
                              categorias.map(c => (
                                <SelectItem key={c.id} value={c.id} className="group relative flex items-center justify-between min-w-[150px] select-item-container">
                                    <span className="truncate pr-2">{c.nome}</span>
                                    <div 
                                        role="button"
                                        className="delete-btn p-1 rounded-md hover:bg-red-100 text-gray-400 hover:text-red-600 transition-all opacity-0 group-hover:opacity-100 z-50 absolute right-1"
                                        onPointerDown={(e) => handleDeleteRequest(e, c.id, 'category', c.nome)}
                                        title="Excluir categoria"
                                    >
                                        <X className="h-4 w-4" />
                                    </div>
                                </SelectItem>
                              ))
                          )}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="icon" 
                    onClick={() => setIsCatModalOpen(true)}
                    title="Nova Categoria"
                    className="shrink-0"
                  >
                    <PlusCircle className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="grid gap-2">
                <Label>Subcategoria</Label>
                <div className="flex gap-2">
                  <Controller
                    control={control}
                    name="id_subcategoria"
                    render={({ field }) => (
                      <Select 
                        onValueChange={field.onChange} 
                        value={field.value || ''}
                        disabled={!selectedCategoriaId}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder={selectedCategoriaId ? "Selecione a Subcategoria" : "Escolha a cat. primeiro"} />
                        </SelectTrigger>
                        <SelectContent className="max-h-[200px]">
                          {subcategorias.length === 0 ? (
                              <SelectItem value="empty" disabled>Nenhuma subcategoria</SelectItem>
                          ) : (
                              subcategorias.map(s => (
                                <SelectItem key={s.id} value={s.id} className="group relative flex items-center justify-between min-w-[150px] select-item-container">
                                    <span className="truncate pr-2">{s.nome}</span>
                                    <div 
                                        role="button"
                                        className="delete-btn p-1 rounded-md hover:bg-red-100 text-gray-400 hover:text-red-600 transition-all opacity-0 group-hover:opacity-100 z-50 absolute right-1"
                                        onPointerDown={(e) => handleDeleteRequest(e, s.id, 'subcategory', s.nome)}
                                        title="Excluir subcategoria"
                                    >
                                        <X className="h-4 w-4" />
                                    </div>
                                </SelectItem>
                              ))
                          )}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="icon" 
                    onClick={() => {
                      if(!selectedCategoriaId) {
                        toast({ title: "Atenção", description: "Selecione uma categoria primeiro." });
                        return;
                      }
                      setIsSubCatModalOpen(true);
                    }}
                    disabled={!selectedCategoriaId}
                    title="Nova Subcategoria"
                    className="shrink-0"
                  >
                    <PlusCircle className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="tempo_padrao">Tempo Padrão</Label>
                <Input
                  id="tempo_padrao"
                  placeholder="Ex: 1h 30m"
                  {...register('tempo_padrao')}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="valor_referencia">Valor Referência (R$)</Label>
                <Input
                  id="valor_referencia"
                  type="number"
                  step="0.01"
                  min="0"
                  {...register('valor_referencia')}
                />
              </div>
            </div>

            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Salvando...' : (serviceToEdit ? 'Salvar Alterações' : 'Cadastrar Serviço')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <CategoriaDialog 
        isOpen={isCatModalOpen} 
        onClose={() => setIsCatModalOpen(false)} 
        onSave={handleNewCategory} 
      />

      <SubcategoriaDialog 
        isOpen={isSubCatModalOpen}
        onClose={() => setIsSubCatModalOpen(false)}
        onSave={handleNewSubcategory}
        categoriaId={selectedCategoriaId}
      />

      {/* Delete Confirmation Alert */}
      <AlertDialog open={deleteConfirmation.isOpen} onOpenChange={(open) => !open && setDeleteConfirmation({isOpen: false, id: null, type: null, name: ''})}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Excluir {deleteConfirmation.type === 'category' ? 'Categoria' : 'Subcategoria'}</AlertDialogTitle>
                <AlertDialogDescription>
                    Tem certeza que deseja excluir permanentemente <strong>"{deleteConfirmation.name}"</strong>?
                    <br/><br/>
                    <span className="text-red-600 font-semibold">Atenção:</span> Esta ação não pode ser desfeita e falhará se o item estiver em uso em algum serviço.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={executeDelete} className="bg-red-600 hover:bg-red-700">
                    Excluir Permanentemente
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default ServicoDialog;