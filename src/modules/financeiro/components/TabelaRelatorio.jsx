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

const TabelaRelatorio = ({ data, loading, totalValue }) => {
  return (
    <div className="rounded-md border bg-white shadow-sm overflow-hidden">
      <Table>
        <TableHeader className="bg-gray-50">
          <TableRow>
            <TableHead className="w-[100px]">Nº Mov.</TableHead>
            <TableHead className="w-[100px]">Data</TableHead>
            <TableHead>Descrição</TableHead>
            <TableHead className="w-[100px]">Tipo</TableHead>
            <TableHead className="w-[150px]">Categoria</TableHead>
            <TableHead className="w-[150px]">Forma de Pagamento</TableHead>
            <TableHead className="w-[150px]">Responsável</TableHead>
            <TableHead className="text-right w-[120px]">Valor (R$)</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <TableRow>
              <TableCell colSpan={8} className="h-24 text-center">
                <div className="flex justify-center items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Carregando dados...
                </div>
              </TableCell>
            </TableRow>
          ) : data.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} className="h-32 text-center">
                <div className="flex flex-col items-center justify-center text-muted-foreground gap-2">
                  <AlertCircle className="h-8 w-8 opacity-50" />
                  <p>Nenhum registro encontrado para os filtros selecionados.</p>
                </div>
              </TableCell>
            </TableRow>
          ) : (
            data.map((item, index) => (
              <TableRow key={`${item.id}-${index}`} className="hover:bg-gray-50/50 transition-colors">
                <TableCell className="font-mono text-xs text-gray-500">
                  {item.id}
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  {format(parseISO(item.date), "dd/MM/yyyy")}
                </TableCell>
                <TableCell>
                  <span className="font-medium text-gray-900 block">{item.description}</span>
                  {item.notes && <span className="text-xs text-gray-400 italic">{item.notes}</span>}
                </TableCell>
                <TableCell>
                  <Badge variant={item.typeLabel === 'Receita' ? 'success' : 'destructive'} className="text-xs font-normal">
                    {item.typeLabel}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm text-gray-700">
                  {item.category}
                </TableCell>
                <TableCell className="text-sm text-gray-700">
                  {item.paymentMethod || '-'}
                </TableCell>
                <TableCell className="text-sm text-gray-700 truncate max-w-[150px]" title={item.responsible}>
                  {item.responsible}
                </TableCell>
                <TableCell className="text-right font-semibold text-gray-900">
                  {item.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
        <TableFooter className="bg-slate-100/80 border-t">
          <TableRow>
            <TableCell colSpan={7} className="text-right font-bold text-gray-800 text-base">TOTAL GERAL</TableCell>
            <TableCell className="text-right font-bold text-blue-700 text-lg">
              {totalValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </TableCell>
          </TableRow>
        </TableFooter>
      </Table>
    </div>
  );
};

export default TabelaRelatorio;