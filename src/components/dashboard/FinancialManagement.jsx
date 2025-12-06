import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Plus, Landmark, ArrowRightLeft, Download, TrendingUp, TrendingDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const FinancialManagement = () => {
  const [accounts, setAccounts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [payables, setPayables] = useState([]);
  const [receivables, setReceivables] = useState([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const { data: accountsData, error: accountsError } = await supabase.from('accounts').select('*');
      if (accountsError) throw accountsError;
      setAccounts(accountsData || []);

      const { data: transactionsData, error: transactionsError } = await supabase.from('transactions').select('*, accounts(name)').order('transaction_date', { ascending: false });
      if (transactionsError) throw transactionsError;
      setTransactions(transactionsData || []);

      // Load receivables (completed work orders without a paid income transaction)
      const { data: receivablesData, error: receivablesError } = await supabase.rpc('get_work_orders_awaiting_payment');
      if (receivablesError) throw receivablesError;
      setReceivables(receivablesData || []);

      // Placeholder for payables
      setPayables([]);

    } catch (error) {
      toast({ title: "Erro ao carregar dados financeiros", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleFeatureNotImplemented = (feature = "Esta funcionalidade") => {
    toast({
      title: `🚧 ${feature} não implementada`,
      description: "Mas não se preocupe! Você pode solicitá-la no seu próximo prompt! 🚀",
    });
  };

  const formatCurrency = (value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Gestão Financeira</h2>
          <p className="text-gray-600">Controle suas contas, transações e fluxo de caixa.</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => handleFeatureNotImplemented('Nova Conta')}><Plus className="w-4 h-4 mr-2" /> Nova Conta</Button>
          <Button onClick={() => handleFeatureNotImplemented('Nova Transação')} variant="outline"><Plus className="w-4 h-4 mr-2" /> Nova Transação</Button>
        </div>
      </div>

      {/* Accounts Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {accounts.map((account, index) => (
          <motion.div key={account.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.1 }} className="bg-white rounded-xl p-6 shadow-lg">
            <div className="flex items-center gap-4 mb-2">
              <Landmark className="w-8 h-8 text-blue-600" />
              <div>
                <h3 className="font-bold text-lg">{account.name}</h3>
                <p className="text-sm text-gray-500 capitalize">{account.type}</p>
              </div>
            </div>
            <p className="text-3xl font-bold text-gray-800">{formatCurrency(account.current_balance)}</p>
          </motion.div>
        ))}
      </div>

      <Tabs defaultValue="transactions" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="transactions">Transações</TabsTrigger>
          <TabsTrigger value="receivables">Contas a Receber</TabsTrigger>
          <TabsTrigger value="payables">Contas a Pagar</TabsTrigger>
        </TabsList>
        <TabsContent value="transactions">
          <FinancialTable title="Transações Recentes" data={transactions} columns={transactionColumns} loading={loading} emptyIcon={ArrowRightLeft} emptyText="Nenhuma transação encontrada." onExport={() => handleFeatureNotImplemented('Exportar Transações')} formatCurrency={formatCurrency} />
        </TabsContent>
        <TabsContent value="receivables">
          <FinancialTable title="Contas a Receber" data={receivables} columns={receivableColumns} loading={loading} emptyIcon={TrendingUp} emptyText="Nenhuma conta a receber pendente." onExport={() => handleFeatureNotImplemented('Exportar Contas a Receber')} formatCurrency={formatCurrency} />
        </TabsContent>
        <TabsContent value="payables">
          <FinancialTable title="Contas a Pagar" data={payables} columns={payableColumns} loading={loading} emptyIcon={TrendingDown} emptyText="Nenhuma conta a pagar pendente." onExport={() => handleFeatureNotImplemented('Exportar Contas a Pagar')} formatCurrency={formatCurrency} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

const FinancialTable = ({ title, data, columns, loading, emptyIcon: EmptyIcon, emptyText, onExport, formatCurrency }) => (
  <div className="bg-white rounded-xl shadow-lg p-6 mt-4">
    <div className="flex justify-between items-center mb-4">
      <h3 className="text-lg font-bold">{title}</h3>
      <Button variant="outline" size="sm" onClick={onExport}><Download className="w-4 h-4 mr-2" /> Exportar</Button>
    </div>
    {loading ? (
      <div className="text-center py-12">Carregando...</div>
    ) : data.length === 0 ? (
      <div className="text-center py-12">
        <EmptyIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500">{emptyText}</p>
      </div>
    ) : (
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left text-gray-500">
          <thead className="text-xs text-gray-700 uppercase bg-gray-50">
            <tr>
              {columns.map(col => <th key={col.key} scope="col" className={`px-6 py-3 ${col.className || ''}`}>{col.header}</th>)}
            </tr>
          </thead>
          <tbody>
            {data.map((item) => (
              <tr key={item.id} className="bg-white border-b hover:bg-gray-50">
                {columns.map(col => <td key={col.key} className={`px-6 py-4 ${col.className || ''}`}>{col.render(item, formatCurrency)}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )}
  </div>
);

const transactionColumns = [
  { key: 'date', header: 'Data', render: (tx) => new Date(tx.transaction_date).toLocaleDateString() },
  { key: 'desc', header: 'Descrição', render: (tx) => <span className="font-medium text-gray-900">{tx.description}</span> },
  { key: 'account', header: 'Conta', render: (tx) => tx.accounts.name },
  { key: 'amount', header: 'Valor', className: 'text-right', render: (tx, formatCurrency) => <span className={`font-bold ${tx.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>{tx.type === 'income' ? '+' : '-'} {formatCurrency(tx.amount)}</span> },
];

const receivableColumns = [
  { key: 'customer', header: 'Cliente', render: (item) => item.customer_name || 'N/A' },
  { key: 'vehicle', header: 'Veículo', render: (item) => item.vehicle_plate || 'N/A' },
  { key: 'date', header: 'Data OS', render: (item) => new Date(item.order_date).toLocaleDateString() },
  { key: 'status', header: 'Status OS', render: (item) => <span className={`px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800`}>{item.status}</span> },
  { key: 'amount', header: 'Valor Total', className: 'text-right', render: (item, formatCurrency) => <span className="font-bold">{formatCurrency(item.total_cost)}</span> },
];

const payableColumns = [
  // Placeholder columns for accounts payable
  { key: 'vendor', header: 'Fornecedor', render: () => 'N/A' },
  { key: 'dueDate', header: 'Vencimento', render: () => 'N/A' },
  { key: 'amount', header: 'Valor', className: 'text-right', render: (item, formatCurrency) => formatCurrency(0) },
];

export default FinancialManagement;