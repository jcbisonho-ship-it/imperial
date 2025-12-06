import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { Loader2 } from 'lucide-react';

const LembreteDialog = ({ isOpen, onClose, onSave, lembrete }) => {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (lembrete) {
      setContent(lembrete.content);
    } else {
      setContent('');
    }
  }, [lembrete, isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!content.trim()) {
      toast({
        title: 'Campo obrigatório',
        description: 'Por favor, preencha o conteúdo do lembrete.',
        variant: 'destructive',
      });
      return;
    }
    setLoading(true);
    
    let error;
    if (lembrete?.id) {
      // Update
      const { error: updateError } = await supabase
        .from('lembretes')
        .update({ content, updated_at: new Date().toISOString() })
        .eq('id', lembrete.id);
      error = updateError;
    } else {
      // Create
      const { error: insertError } = await supabase
        .from('lembretes')
        .insert([{ content }]);
      error = insertError;
    }

    setLoading(false);
    if (error) {
      toast({
        title: 'Erro ao salvar lembrete',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Lembrete salvo!',
        description: `O lembrete foi ${lembrete?.id ? 'atualizado' : 'criado'} com sucesso.`,
      });
      onSave();
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{lembrete?.id ? 'Editar' : 'Novo'} Lembrete</DialogTitle>
          <DialogDescription>
            {lembrete?.id ? 'Altere as informações do seu lembrete.' : 'Adicione um novo lembrete para não esquecer de nada.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="py-4">
            <Label htmlFor="content">Lembrete</Label>
            <Textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Escreva seu lembrete aqui..."
              className="mt-1 min-h-[120px]"
              required
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {loading ? 'Salvando...' : 'Salvar Lembrete'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default LembreteDialog;