import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from '@/lib/customSupabaseClient';

const CategoriaFinanceiraDialog = ({ isOpen, onClose, onSave, defaultType = 'expense' }) => {
  const { register, handleSubmit, reset, setValue, watch, formState: { errors, isSubmitting } } = useForm();
  const { toast } = useToast();
  const type = watch('type', defaultType);

  useEffect(() => {
    if (isOpen) {
        reset({ name: '', type: defaultType });
    }
  }, [isOpen, defaultType, reset]);

  const onSubmit = async (data) => {
    try {
        const { data: newCategory, error } = await supabase
          .from('financial_categories')
          .insert([{ name: data.name, type: data.type }])
          .select()
          .single();

        if (error) {
          if (error.code === '23505') {
            throw new Error('Já existe uma categoria com este nome.');
          }
          throw error;
        }
        
        toast({ title: "Sucesso", description: "Categoria financeira criada!" });
        onSave(newCategory);
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
          <DialogTitle>Nova Categoria Financeira</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="cat-type">Tipo</Label>
            <Select onValueChange={(v) => setValue('type', v)} defaultValue={defaultType}>
               <SelectTrigger><SelectValue /></SelectTrigger>
               <SelectContent>
                  <SelectItem value="income">Entrada (Receita)</SelectItem>
                  <SelectItem value="expense">Saída (Despesa)</SelectItem>
               </SelectContent>
            </Select>
          </div>
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

export default CategoriaFinanceiraDialog;