import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from '@/lib/customSupabaseClient';

const CategoriaProdutoDialog = ({ isOpen, onClose, onSave, categoryToEdit = null }) => {
  const { register, handleSubmit, reset, setValue, formState: { errors, isSubmitting } } = useForm();
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      if (categoryToEdit) {
        setValue('name', categoryToEdit.name);
      } else {
        reset({ name: '' });
      }
    }
  }, [isOpen, categoryToEdit, setValue, reset]);

  const onSubmit = async (data) => {
    try {
      let result;
      
      if (categoryToEdit) {
        // Update existing
        const { data: updated, error } = await supabase
          .from('product_categories')
          .update({ name: data.name })
          .eq('id', categoryToEdit.id)
          .select()
          .single();
          
        if (error) throw error;
        result = updated;
        toast({ title: "Sucesso", description: "Categoria de produto atualizada!" });
      } else {
        // Create new
        const { data: newCategory, error } = await supabase
          .from('product_categories')
          .insert([{ name: data.name }])
          .select()
          .single();

        if (error) {
          if (error.code === '23505') { // Unique violation
            throw new Error('Já existe uma categoria com este nome.');
          }
          throw error;
        }
        result = newCategory;
        toast({ title: "Sucesso", description: "Categoria de produto criada!" });
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
          <DialogTitle>{categoryToEdit ? 'Editar Categoria (Produto)' : 'Nova Categoria (Produto)'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="cat-name">Nome da Categoria</Label>
            <Input id="cat-name" {...register('name', { required: 'Nome é obrigatório' })} />
            {errors.name && <span className="text-sm text-red-500">{errors.name.message}</span>}
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

export default CategoriaProdutoDialog;