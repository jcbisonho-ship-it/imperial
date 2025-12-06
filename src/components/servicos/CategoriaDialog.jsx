import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from '@/lib/customSupabaseClient';

const CategoriaDialog = ({ isOpen, onClose, onSave, categoryToEdit = null }) => {
  const { register, handleSubmit, reset, setValue, formState: { errors, isSubmitting } } = useForm();
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      if (categoryToEdit) {
        setValue('nome', categoryToEdit.nome);
      } else {
        reset({ nome: '' });
      }
    }
  }, [isOpen, categoryToEdit, setValue, reset]);

  const onSubmit = async (data) => {
    try {
      let result;
      
      if (categoryToEdit) {
        // Update existing
        const { data: updated, error } = await supabase
          .from('categorias')
          .update({ nome: data.nome })
          .eq('id', categoryToEdit.id)
          .select()
          .single();
          
        if (error) throw error;
        result = updated;
        toast({ title: "Sucesso", description: "Categoria atualizada com sucesso!" });
      } else {
        // Create new
        const { data: newCategory, error } = await supabase
          .from('categorias')
          .insert([{ nome: data.nome }])
          .select()
          .single();

        if (error) {
          if (error.code === '23505') { // Unique violation
            throw new Error('Já existe uma categoria com este nome.');
          }
          throw error;
        }
        result = newCategory;
        toast({ title: "Sucesso", description: "Categoria criada com sucesso!" });
      }

      onSave(result);
      onClose();
    } catch (error) {
      console.error(error);
      toast({ variant: "destructive", title: "Erro", description: error.message || "Erro ao salvar categoria." });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>{categoryToEdit ? 'Editar Categoria' : 'Nova Categoria'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="cat-nome">Nome da Categoria</Label>
            <Input id="cat-nome" {...register('nome', { required: 'Nome é obrigatório' })} />
            {errors.nome && <span className="text-sm text-red-500">{errors.nome.message}</span>}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CategoriaDialog;