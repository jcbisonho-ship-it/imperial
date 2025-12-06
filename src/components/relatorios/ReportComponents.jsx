import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils';
import { format, parseISO, isValid } from 'date-fns';
import { TrendingUp, TrendingDown, DollarSign, AlertCircle, CheckCircle2, Calendar } from 'lucide-react';

// Helper for date formatting
const formatDate = (dateStr) => {
  if (!dateStr) return '-';
  const date = parseISO(dateStr);
  return isValid(date) ? format(date, 'dd/MM/yyyy') : '-';
};

// 1. Totais por Forma de Pagamento
export const ReportPaymentMethods = ({ dateRange }) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      // Fetch inputs
      let query = supabase
        .from('movimentacoes_financeiras')
        .select('*')
        .eq('tipo', 'entrada');
      
      if (dateRange?.from) query = query.gte('data_movimentacao', dateRange.from.toISOString());
      if (dateRange?.to) query = query.lte('data_movimentacao', dateRange.to.toISOString());

      const { data: movements, error } = await query;
      
      if (!error && movements) {
        const methods = {
          'PIX': 0, 'Dinheiro': 0, 'Cartão de Crédito': 0, 'Cartão de Débito': 0, 'Boleto': 0, 'Transferência': 0, 'Outros': 0
        };

        movements.forEach(m => {
          const desc = m.descricao.toLowerCase();
          if (desc.includes('pix')) methods['PIX'] += Number(m.valor);
          else if (desc.includes('dinheiro')) methods['Dinheiro'] += Number(m.valor);
          else if (desc.includes('crédito') || desc.includes('credito')) methods['Cartão de Crédito'] += Number(m.valor);
          else if (desc.includes('débito') || desc.includes('debito')) methods['Cartão de Débito'] += Number(m.valor);
          else if (desc.includes('boleto')) methods['Boleto'] += Number(m.valor);
          else if (desc.includes('transferencia') || desc.includes('transferência')) methods['Transferência'] += Number(m.valor);
          else methods['Outros'] += Number(m.valor);
        });

        setData(Object.entries(methods).map(([name, value]) => ({ name, value })).filter(i => i.value > 0));
      }
      setLoading(false);
    };
    fetchData();
  }, [dateRange]);

  const total = data.reduce((acc, item) => acc + item.value, 0);

  return (
    <Card>
      <CardHeader><CardTitle>Totais por Forma de Pagamento</CardTitle></CardHeader>
      <CardContent>
        <Table>
          <TableHeader><TableRow><TableHead>Forma de Pagamento</TableHead><TableHead className="text-right">Total Recebido</TableHead></TableRow></TableHeader>
          <TableBody>
            {loading ? <TableRow><TableCell colSpan={2}>Carregando...</TableCell></TableRow> : 
             data.length === 0 ? <TableRow><TableCell colSpan={2}>Nenhum dado no período.</TableCell></TableRow> :
             <>
               {data.map((item, idx) => (
                 <TableRow key={idx}>
                   <TableCell>{item.name}</TableCell>
                   <TableCell className="text-right">{formatCurrency(item.value)}</TableCell>
                 </TableRow>
               ))}
               <TableRow className="bg-gray-50 font-bold">
                 <TableCell>TOTAL</TableCell>
                 <TableCell className="text-right">{formatCurrency(total)}</TableCell>
               </TableRow>
             </>
            }
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

// 2. Totais por Conta Interna
export const ReportInternalAccounts = () => {
  const [data, setData] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      const { data: accounts } = await supabase.from('contas_internas').select('*');
      const { data: moves } = await supabase.from('movimentacoes_financeiras').select('*');

      if (accounts && moves) {
        const report = accounts.map(acc => {
          const accMoves = moves.filter(m => m.conta_interna_id === acc.id);
          const entradas = accMoves.filter(m => m.tipo === 'entrada').reduce((sum, m) => sum + Number(m.valor), 0);
          const saidas = accMoves.filter(m => m.tipo === 'saida').reduce((sum, m) => sum + Number(m.valor), 0);
          return { ...acc, entradas, saidas };
        });
        setData(report);
      }
    };
    fetchData();
  }, []);

  return (
    <Card>
      <CardHeader><CardTitle>Totais por Conta Interna</CardTitle></CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Conta</TableHead>
              <TableHead className="text-right text-green-600">Total Entradas</TableHead>
              <TableHead className="text-right text-red-600">Total Saídas</TableHead>
              <TableHead className="text-right">Saldo Atual</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map(acc => (
              <TableRow key={acc.id}>
                <TableCell className="font-medium">{acc.nome}</TableCell>
                <TableCell className="text-right">{formatCurrency(acc.entradas)}</TableCell>
                <TableCell className="text-right">{formatCurrency(acc.saidas)}</TableCell>
                <TableCell className="text-right font-bold text-blue-700">{formatCurrency(acc.saldo_atual)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

// 3. OS Finalizadas e Quitadas
export const ReportOSPaid = ({ dateRange }) => {
  const [data, setData] = useState([]);

  useEffect(() => {
    const fetch = async () => {
      let query = supabase
        .from('contas_receber')
        .select('*, customers(name), service_orders(os_number, created_at)')
        .eq('status', 'pago');
        
      if (dateRange?.from) query = query.gte('created_at', dateRange.from.toISOString());
      if (dateRange?.to) query = query.lte('created_at', dateRange.to.toISOString());

      const { data: res } = await query;
      setData(res || []);
    };
    fetch();
  }, [dateRange]);

  return (
    <Card>
      <CardHeader><CardTitle>OS Finalizadas e Quitadas</CardTitle></CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>OS #</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Data OS</TableHead>
              <TableHead className="text-right">Valor Total</TableHead>
              <TableHead className="text-center">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map(item => (
              <TableRow key={item.id}>
                <TableCell>{item.service_orders?.os_number}</TableCell>
                <TableCell>{item.customers?.name}</TableCell>
                <TableCell>{formatDate(item.service_orders?.created_at)}</TableCell>
                <TableCell className="text-right">{formatCurrency(item.valor_total)}</TableCell>
                <TableCell className="text-center"><Badge variant="success">Quitado</Badge></TableCell>
              </TableRow>
            ))}
            {data.length > 0 && (
               <TableRow className="bg-gray-50 font-bold">
                  <TableCell colSpan={3}>TOTAL</TableCell>
                  <TableCell className="text-right">{formatCurrency(data.reduce((acc, i) => acc + i.valor_total, 0))}</TableCell>
                  <TableCell></TableCell>
               </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

// 4. OS Finalizadas e Não Pagas
export const ReportOSUnpaid = () => {
  const [data, setData] = useState([]);

  useEffect(() => {
    const fetch = async () => {
      const { data: res } = await supabase
        .from('contas_receber')
        .select('*, customers(name), service_orders(os_number, created_at)')
        .neq('status', 'pago');
      setData(res || []);
    };
    fetch();
  }, []);

  return (
    <Card>
      <CardHeader><CardTitle>OS Finalizadas e Pendentes</CardTitle></CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>OS #</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Data</TableHead>
              <TableHead className="text-right">Valor Total</TableHead>
              <TableHead className="text-right">A Receber</TableHead>
              <TableHead className="text-center">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map(item => (
              <TableRow key={item.id}>
                <TableCell>{item.service_orders?.os_number}</TableCell>
                <TableCell>{item.customers?.name}</TableCell>
                <TableCell>{formatDate(item.service_orders?.created_at)}</TableCell>
                <TableCell className="text-right">{formatCurrency(item.valor_total)}</TableCell>
                <TableCell className="text-right font-bold text-red-600">{formatCurrency(item.valor_liquido)}</TableCell>
                <TableCell className="text-center"><Badge variant="outline">{item.status}</Badge></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

// 5. Extrato Banco
export const ReportBankStatement = ({ dateRange }) => {
  const [data, setData] = useState([]);

  useEffect(() => {
    const fetch = async () => {
      let query = supabase
        .from('movimentacoes_financeiras')
        .select('*, contas_internas(nome)')
        .order('data_movimentacao', { ascending: false });
      
      if (dateRange?.from) query = query.gte('data_movimentacao', dateRange.from.toISOString());
      if (dateRange?.to) query = query.lte('data_movimentacao', dateRange.to.toISOString());

      const { data: res } = await query;
      setData(res || []);
    };
    fetch();
  }, [dateRange]);

  return (
    <Card>
      <CardHeader><CardTitle>Extrato de Movimentações</CardTitle></CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Conta</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead className="text-center">Tipo</TableHead>
              <TableHead className="text-right">Valor</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map(item => (
              <TableRow key={item.id}>
                <TableCell>{formatDate(item.data_movimentacao)}</TableCell>
                <TableCell>{item.contas_internas?.nome}</TableCell>
                <TableCell>{item.descricao}</TableCell>
                <TableCell className="text-center">
                  <span className={item.tipo === 'entrada' ? 'text-green-600' : 'text-red-600'}>
                    {item.tipo.toUpperCase()}
                  </span>
                </TableCell>
                <TableCell className={`text-right font-medium ${item.tipo === 'entrada' ? 'text-green-600' : 'text-red-600'}`}>
                   {item.tipo === 'saida' ? '-' : '+'}{formatCurrency(item.valor)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

// 6. Lucro por OS
export const ReportProfitPerOS = ({ dateRange }) => {
  const [data, setData] = useState([]);

  useEffect(() => {
    const fetch = async () => {
      let query = supabase
        .from('service_orders')
        .select(`
          id, os_number, total_amount, created_at,
          customers(name),
          work_order_items(total_price, cost_price, quantity, item_type)
        `)
        .eq('status', 'completed');

      if (dateRange?.from) query = query.gte('created_at', dateRange.from.toISOString());
      if (dateRange?.to) query = query.lte('created_at', dateRange.to.toISOString());

      const { data: osList } = await query;

      if (osList) {
        const processed = osList.map(os => {
          const revenue = os.total_amount || 0;
          const cost = os.work_order_items?.reduce((acc, item) => {
            // Only count cost for products usually, services might have labour cost but 'cost_price' usually tracks parts
            return acc + ((Number(item.cost_price) || 0) * (Number(item.quantity) || 1));
          }, 0) || 0;
          return {
            ...os,
            revenue,
            cost,
            profit: revenue - cost,
            margin: revenue > 0 ? ((revenue - cost) / revenue) * 100 : 0
          };
        });
        setData(processed);
      }
    };
    fetch();
  }, [dateRange]);

  return (
    <Card>
      <CardHeader><CardTitle>Lucratividade por OS</CardTitle></CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>OS #</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead className="text-right">Receita</TableHead>
              <TableHead className="text-right text-red-600">Custo Est.</TableHead>
              <TableHead className="text-right text-green-600">Lucro Bruto</TableHead>
              <TableHead className="text-right">Margem %</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map(item => (
              <TableRow key={item.id}>
                <TableCell>{item.os_number}</TableCell>
                <TableCell>{item.customers?.name}</TableCell>
                <TableCell className="text-right">{formatCurrency(item.revenue)}</TableCell>
                <TableCell className="text-right text-red-600">{formatCurrency(item.cost)}</TableCell>
                <TableCell className="text-right text-green-600 font-bold">{formatCurrency(item.profit)}</TableCell>
                <TableCell className="text-right">{item.margin.toFixed(1)}%</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

// 7. Fluxo de Caixa Diário
export const ReportDailyCashFlow = ({ dateRange }) => {
  const [data, setData] = useState([]);

  useEffect(() => {
    const fetch = async () => {
      let query = supabase
        .from('movimentacoes_financeiras')
        .select('data_movimentacao, tipo, valor')
        .order('data_movimentacao', { ascending: true });

      if (dateRange?.from) query = query.gte('data_movimentacao', dateRange.from.toISOString());
      if (dateRange?.to) query = query.lte('data_movimentacao', dateRange.to.toISOString());

      const { data: moves } = await query;

      if (moves) {
        const grouped = {};
        moves.forEach(m => {
          const date = m.data_movimentacao.split('T')[0];
          if (!grouped[date]) grouped[date] = { date, entrada: 0, saida: 0 };
          if (m.tipo === 'entrada') grouped[date].entrada += Number(m.valor);
          else grouped[date].saida += Number(m.valor);
        });
        setData(Object.values(grouped));
      }
    };
    fetch();
  }, [dateRange]);

  return (
    <Card>
      <CardHeader><CardTitle>Fluxo de Caixa Diário</CardTitle></CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead className="text-right text-green-600">Entradas</TableHead>
              <TableHead className="text-right text-red-600">Saídas</TableHead>
              <TableHead className="text-right">Saldo do Dia</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((item, idx) => (
              <TableRow key={idx}>
                <TableCell>{format(parseISO(item.date), 'dd/MM/yyyy')}</TableCell>
                <TableCell className="text-right text-green-600">{formatCurrency(item.entrada)}</TableCell>
                <TableCell className="text-right text-red-600">{formatCurrency(item.saida)}</TableCell>
                <TableCell className="text-right font-bold">{formatCurrency(item.entrada - item.saida)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

// 8. Recebimentos Futuros
export const ReportFutureReceivables = () => {
  const [data, setData] = useState([]);

  useEffect(() => {
    const fetch = async () => {
      const { data: res } = await supabase
        .from('parcelas')
        .select(`
           *,
           conta:contas_receber(customers(name))
        `)
        .eq('status', 'pendente')
        .order('data_vencimento', { ascending: true });
      setData(res || []);
    };
    fetch();
  }, []);

  return (
    <Card>
      <CardHeader><CardTitle>Previsão de Recebimentos (Parcelas)</CardTitle></CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Vencimento</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Parcela</TableHead>
              <TableHead className="text-right">Valor</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map(item => (
              <TableRow key={item.id}>
                <TableCell>{formatDate(item.data_vencimento)}</TableCell>
                <TableCell>{item.conta?.customers?.name}</TableCell>
                <TableCell>{item.numero_parcela}</TableCell>
                <TableCell className="text-right font-medium">{formatCurrency(item.valor)}</TableCell>
              </TableRow>
            ))}
            {data.length > 0 && (
               <TableRow className="bg-gray-50 font-bold">
                  <TableCell colSpan={3}>TOTAL A RECEBER</TableCell>
                  <TableCell className="text-right text-blue-700">{formatCurrency(data.reduce((acc, i) => acc + i.valor, 0))}</TableCell>
               </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};