import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from '@/lib/customSupabaseClient';

const SubcategoriaProdutoDialog = ({ isOpen, onClose, onSave, categoriaId, subcategoryToEdit = null }) => {
  const { register, handleSubmit, reset, setValue, formState: { errors, isSubmitting } } = useForm();
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      if (subcategoryToEdit) {
        setValue('name', subcategoryToEdit.name);
      } else {
        reset({ name: '' });
      }
    }
  }, [isOpen, subcategoryToEdit, setValue, reset]);

  const onSubmit = async (data) => {
    if (!categoriaId && !subcategoryToEdit) {
      toast({ variant: "destructive", title: "Erro", description: "Categoria pai não identificada." });
      return;
    }

    try {
      let result;
      
      if (subcategoryToEdit) {
        const { data: updated, error } = await supabase
          .from('product_subcategories')
          .update({ name: data.name })
          .eq('id', subcategoryToEdit.id)
          .select()
          .single();
          
        if (error) throw error;
        result = updated;
        toast({ title: "Sucesso", description: "Subcategoria atualizada!" });
      } else {
        const { data: newSub, error } = await supabase
          .from('product_subcategories')
          .insert([{ name: data.name, category_id: categoriaId }])
          .select()
          .single();

        if (error) throw error;
        result = newSub;
        toast({ title: "Sucesso", description: "Subcategoria criada!" });
      }

      onSave(result);
      onClose();
    } catch (error) {
      console.error(error);
      toast({ variant: "destructive", title: "Erro", description: "Erro ao salvar subcategoria." });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>{subcategoryToEdit ? 'Editar Subcategoria' : 'Nova Subcategoria'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="sub-name">Nome da Subcategoria</Label>
            <Input id="sub-name" {...register('name', { required: 'Nome é obrigatório' })} />
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

export default SubcategoriaProdutoDialog;