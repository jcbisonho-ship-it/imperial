import React from 'react';
import { format, parseISO } from 'date-fns';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, AlertCircle } from 'lucide-react';

const TabelaRelatorio = ({ data, loading, totalValue, totalCost, totalProfit }) => {
  const numColumns = 8; // OS, Data, Desc, Tipo, Valor, Custo, Lucro, Margem

  return (
    <div className="rounded-md border bg-white shadow-sm overflow-hidden">
      <Table>
        <TableHeader className="bg-gray-50">
          <TableRow>
            <TableHead className="w-[80px]">Nº OS</TableHead>
            <TableHead className="w-[100px]">Data</TableHead>
            <TableHead className="min-w-[300px]">Descrição do Item</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead className="text-right w-[120px]">Valor</TableHead>
            <TableHead className="text-right w-[120px]">Valor Custo</TableHead>
            <TableHead className="text-right w-[120px]">Lucro Real</TableHead>
            <TableHead className="text-right w-[100px]">Lucro %</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <TableRow>
              <TableCell colSpan={numColumns} className="h-24 text-center">
                <div className="flex justify-center items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Carregando dados...
                </div>
              </TableCell>
            </TableRow>
          ) : data.length === 0 ? (
            <TableRow>
              <TableCell colSpan={numColumns} className="h-32 text-center">
                <div className="flex flex-col items-center justify-center text-muted-foreground gap-2">
                  <AlertCircle className="h-8 w-8 opacity-50" />
                  <p>Nenhum item encontrado para os filtros selecionados.</p>
                </div>
              </TableCell>
            </TableRow>
          ) : (
            data.map((item, index) => (
              <TableRow key={`${item.id}-${index}`} className="hover:bg-gray-50/50 transition-colors">
                <TableCell className="font-mono text-xs text-gray-500 py-3">
                  {item.osNumber}
                </TableCell>
                <TableCell className="whitespace-nowrap py-3">
                  {format(parseISO(item.date), "dd/MM/yyyy")}
                </TableCell>
                <TableCell className="text-sm text-gray-700 py-3">
                   <span className="font-medium">{item.description}</span>
                </TableCell>
                <TableCell className="text-sm text-gray-600 py-3">
                  <Badge variant="secondary" className="text-xs font-normal">
                    {item.typeLabel}
                  </Badge>
                </TableCell>
                <TableCell className="text-right font-semibold text-gray-900 py-3">
                  {item.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </TableCell>
                <TableCell className="text-right text-gray-600 py-3">
                  {item.totalCost.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </TableCell>
                <TableCell className={`text-right font-semibold py-3 ${item.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {item.profit.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </TableCell>
                <TableCell className={`text-right text-sm py-3 ${item.margin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {item.margin.toFixed(2)}%
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
        <TableFooter className="bg-slate-100/80 border-t">
          <TableRow>
            <TableCell colSpan={4} className="text-right font-bold text-gray-800 text-base">TOTAIS</TableCell>
            <TableCell className="text-right font-bold text-blue-700 text-lg">
              {totalValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </TableCell>
            <TableCell className="text-right font-bold text-gray-600 text-base">
              {totalCost.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </TableCell>
            <TableCell className="text-right font-bold text-green-600 text-lg">
              {totalProfit.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </TableCell>
             <TableCell className="text-right font-bold text-gray-600 text-sm">
              {totalValue > 0 ? ((totalProfit / totalValue) * 100).toFixed(2) + '%' : '0%'}
            </TableCell>
          </TableRow>
        </TableFooter>
      </Table>
    </div>
  );
};

export default TabelaRelatorio;