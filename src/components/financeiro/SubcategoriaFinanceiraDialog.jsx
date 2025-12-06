import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from '@/lib/customSupabaseClient';

const SubcategoriaFinanceiraDialog = ({ isOpen, onClose, onSave, categoriaId }) => {
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm();
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      reset({ name: '' });
    }
  }, [isOpen, reset]);

  const onSubmit = async (data) => {
    if (!categoriaId) {
      toast({ variant: "destructive", title: "Erro", description: "Categoria pai não identificada." });
      return;
    }

    try {
      const { data: newSub, error } = await supabase
        .from('financial_subcategories')
        .insert([{ name: data.name, category_id: categoriaId }])
        .select()
        .single();

      if (error) throw error;
      
      toast({ title: "Sucesso", description: "Subcategoria criada!" });
      onSave(newSub);
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
          <DialogTitle>Nova Subcategoria Financeira</DialogTitle>
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

export default SubcategoriaFinanceiraDialog;