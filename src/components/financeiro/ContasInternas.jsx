import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from '@/components/ui/label';
import { Plus, Edit, Trash2, Wallet, MoreHorizontal, List } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useNavigate } from 'react-router-dom';

const ContasInternas = () => {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const [accountToDelete, setAccountToDelete] = useState(null);
  const [currentAccount, setCurrentAccount] = useState(null);
  const [formData, setFormData] = useState({ name: '', type: 'corrente', initial_balance: '0', current_balance: '0' });
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('accounts')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setAccounts(data || []);
    } catch (error) {
      console.error('Error fetching accounts:', error);
      toast({ title: 'Erro', description: 'Falha ao carregar contas.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      const payload = {
        name: formData.name,
        type: formData.type,
        initial_balance: parseFloat(formData.initial_balance),
        // Allow manual override of current_balance if editing
        current_balance: currentAccount ? parseFloat(formData.current_balance) : parseFloat(formData.initial_balance)
      };

      let error;
      if (currentAccount) {
        const { error: updateError } = await supabase
          .from('accounts')
          .update(payload)
          .eq('id', currentAccount.id);
        error = updateError;
      } else {
        const { error: insertError } = await supabase
          .from('accounts')
          .insert([payload]);
        error = insertError;
      }

      if (error) throw error;

      toast({ title: 'Sucesso', description: `Conta ${currentAccount ? 'atualizada' : 'criada'} com sucesso.` });
      setIsDialogOpen(false);
      fetchAccounts();
    } catch (error) {
      console.error('Error saving account:', error);
      toast({ title: 'Erro', description: 'Falha ao salvar conta.', variant: 'destructive' });
    }
  };

  const handleDeleteConfirm = async () => {
    if (!accountToDelete) return;

    try {
      const { error } = await supabase.from('accounts').delete().eq('id', accountToDelete.id);
      if (error) throw error;
      
      toast({ title: 'Conta excluída' });
      setIsDeleteAlertOpen(false);
      setAccountToDelete(null);
      fetchAccounts();
    } catch (error) {
      console.error('Error deleting account:', error);
      toast({ title: 'Erro', description: 'Falha ao excluir conta. Verifique se há transações vinculadas.', variant: 'destructive' });
    }
  };

  const openDeleteAlert = (account) => {
    setAccountToDelete(account);
    setIsDeleteAlertOpen(true);
  };

  const openDialog = (account = null) => {
    setCurrentAccount(account);
    if (account) {
      setFormData({ 
          name: account.name, 
          type: account.type, 
          initial_balance: account.initial_balance,
          current_balance: account.current_balance 
      });
    } else {
      setFormData({ name: '', type: 'corrente', initial_balance: '0', current_balance: '0' });
    }
    setIsDialogOpen(true);
  };

  const handleListMovements = (account) => {
    // Pass the account ID as a query parameter
    navigate(`/financeiro?tab=fluxo&account_id=${account.id}`);
    toast({ description: `Visualizando fluxo de caixa de: ${account.name}` });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium flex items-center gap-2">
          <Wallet className="h-5 w-5" /> Gerenciar Contas
        </h3>
        <Button onClick={() => openDialog()}>
          <Plus className="h-4 w-4 mr-2" /> Nova Conta
        </Button>
      </div>

      <div className="border rounded-md bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead className="text-right">Saldo Inicial</TableHead>
              <TableHead className="text-right">Saldo Atual</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={5} className="text-center py-8">Carregando...</TableCell></TableRow>
            ) : accounts.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center py-8">Nenhuma conta cadastrada.</TableCell></TableRow>
            ) : (
              accounts.map((account) => (
                <TableRow key={account.id}>
                  <TableCell className="font-medium">{account.name}</TableCell>
                  <TableCell className="capitalize">{account.type}</TableCell>
                  <TableCell className="text-right">{formatCurrency(account.initial_balance)}</TableCell>
                  <TableCell className="text-right font-bold text-blue-600">{formatCurrency(account.current_balance)}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Abrir menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Ações</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => openDialog(account)}>
                            <Edit className="mr-2 h-4 w-4" /> Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleListMovements(account)}>
                            <List className="mr-2 h-4 w-4" /> Listar Movimentações
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => openDeleteAlert(account)} className="text-red-600">
                            <Trash2 className="mr-2 h-4 w-4" /> Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{currentAccount ? 'Editar Conta' : 'Nova Conta Interna'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Nome da Conta</Label>
              <Input 
                id="name" 
                value={formData.name} 
                onChange={(e) => setFormData({...formData, name: e.target.value})} 
                placeholder="Ex: Banco Itaú, Caixa Pequeno"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="type">Tipo</Label>
              <Select value={formData.type} onValueChange={(val) => setFormData({...formData, type: val})}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="corrente">Conta Corrente</SelectItem>
                  <SelectItem value="poupanca">Poupança</SelectItem>
                  <SelectItem value="caixa">Caixa Físico</SelectItem>
                  <SelectItem value="investimento">Investimento</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="initial_balance">Saldo Inicial</Label>
              <Input 
                id="initial_balance" 
                type="number" 
                step="0.01" 
                value={formData.initial_balance} 
                onChange={(e) => setFormData({...formData, initial_balance: e.target.value})} 
              />
            </div>
            {currentAccount && (
                <div className="grid gap-2 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
                  <Label htmlFor="current_balance" className="text-yellow-800 font-bold">Ajuste Manual de Saldo</Label>
                  <Input 
                    id="current_balance" 
                    type="number" 
                    step="0.01" 
                    value={formData.current_balance} 
                    onChange={(e) => setFormData({...formData, current_balance: e.target.value})} 
                    className="bg-white"
                  />
                  <p className="text-xs text-yellow-700">
                    Atenção: Alterar este valor manualmente não cria um registro de transação. Use apenas para correções.
                  </p>
                </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Conta</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a conta "{accountToDelete?.name}"? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-3 justify-end">
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-red-600 hover:bg-red-700">
              Excluir
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ContasInternas;