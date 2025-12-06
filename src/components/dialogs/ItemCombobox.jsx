import React, { useState, useEffect } from 'react';
import { Check, ChevronsUpDown, Search, Box, Wrench, Layers } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { supabase } from '@/lib/customSupabaseClient';
import { PRODUCT_TYPES, PRODUCT_TYPE_LABELS } from '@/lib/constants';
import { Badge } from '@/components/ui/badge';

export default function ItemCombobox({ onSelect, type = 'all', initialLabel = '' }) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState('');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState('');

  useEffect(() => {
    const fetchItems = async () => {
      setLoading(true);
      let data = [];

      if (type === 'all' || type === 'product') {
        // Fetch Products
        const { data: products, error: prodError } = await supabase.rpc('get_products_with_variants');
        
        if (!prodError && products) {
           const productItems = products.flatMap(p => {
              const typeLabel = p.product_type === PRODUCT_TYPES.MESTRE 
                  ? PRODUCT_TYPE_LABELS[PRODUCT_TYPES.MESTRE] 
                  : PRODUCT_TYPE_LABELS[PRODUCT_TYPES.SIMPLES];
              
              if (p.variants && p.variants.length > 0) {
                  return p.variants.map(v => ({
                      id: v.id,
                      label: `${p.description} - ${v.variant_code} (${v.brand})`,
                      value: v.id,
                      type: 'product',
                      price: v.sale_price,
                      stock: v.stock,
                      product_id: p.id,
                      product_type: p.product_type,
                      description: p.description,
                      variant_code: v.variant_code,
                      brand: v.brand,
                      typeLabel: typeLabel
                  }));
              }
              
              return [{
                  id: p.id,
                  label: p.description,
                  value: p.id,
                  type: 'product',
                  price: 0,
                  product_type: p.product_type,
                  typeLabel: typeLabel
              }];
           });
           data = [...data, ...productItems];
        }
      }

      if (type === 'all' || type === 'service') {
         const { data: services, error: servError } = await supabase.from('servicos').select('*');
         if (!servError && services) {
             const serviceItems = services.map(s => ({
                 id: s.id,
                 label: s.nome,
                 value: s.id,
                 type: 'service',
                 price: s.valor_referencia,
                 duration: s.tempo_duracao_minutos,
                 typeLabel: 'Serviço'
             }));
             data = [...data, ...serviceItems];
         }
      }

      setItems(data);
      setLoading(false);
    };

    if (open) {
        fetchItems();
    }
  }, [open, type]);

  const filteredItems = items.filter(item => 
      item.label.toLowerCase().includes(query.toLowerCase())
  );

  const displayLabel = value 
    ? items.find((item) => item.value === value)?.label 
    : initialLabel || "Selecione um item...";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between truncate"
        >
          <span className="truncate">{displayLabel}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0" align="start">
        <Command shouldFilter={false}>
          <div className="flex items-center border-b px-3" cmdk-input-wrapper="">
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            <input
                className="flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="Buscar item..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="max-h-[300px] overflow-y-auto">
            {loading && <div className="py-6 text-center text-sm text-muted-foreground">Carregando...</div>}
            {!loading && filteredItems.length === 0 && (
                <div className="py-6 text-center text-sm text-muted-foreground">Nenhum item encontrado.</div>
            )}
            {!loading && filteredItems.length > 0 && (
                <div className="p-1">
                    {filteredItems.map((item) => (
                        <div
                            key={`${item.type}-${item.value}`}
                            className={cn(
                                "relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
                                value === item.value ? "bg-accent" : ""
                            )}
                            onClick={() => {
                                setValue(item.value);
                                onSelect(item);
                                setOpen(false);
                            }}
                        >
                            <Check
                                className={cn(
                                    "mr-2 h-4 w-4",
                                    value === item.value ? "opacity-100" : "opacity-0"
                                )}
                            />
                            <div className="flex flex-col w-full overflow-hidden">
                                <div className="flex items-center gap-2">
                                    {item.type === 'product' ? (
                                        item.product_type === PRODUCT_TYPES.MESTRE ? 
                                        <Layers className="h-3 w-3 text-purple-500 flex-shrink-0" title="Produto Mestre" /> :
                                        <Box className="h-3 w-3 text-blue-500 flex-shrink-0" title="Produto Simples" />
                                    ) : (
                                        <Wrench className="h-3 w-3 text-orange-500 flex-shrink-0" title="Serviço" />
                                    )}
                                    <span className="font-medium truncate">{item.label}</span>
                                </div>
                                <div className="flex justify-between items-center mt-1 text-xs text-muted-foreground ml-5">
                                    <span>R$ {Number(item.price).toFixed(2)}</span>
                                    {item.type === 'product' && (
                                        <div className="flex gap-2">
                                            <span>Estoque: {item.stock}</span>
                                            <span className="text-[10px] bg-gray-100 px-1 rounded">{item.typeLabel}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
          </div>
        </Command>
      </PopoverContent>
    </Popover>
  );
}