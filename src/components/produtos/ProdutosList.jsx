import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PlusCircle, MoreHorizontal, Edit, Trash2, ArrowRightLeft, Search, Package } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { Badge } from '@/components/ui/badge';
import ProdutoDialog from './ProdutoDialog';
import StockMovementModal from './StockMovementModal';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { formatCurrency } from '@/lib/utils';

const ProdutosList = () => {
  const [produtos, setProdutos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProduto, setSelectedProduto] = useState(null);
  const [isStockModalOpen, setIsStockModalOpen] = useState(false);
  const [selectedVariantForStock, setSelectedVariantForStock] = useState(null);
  
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [produtoToDelete, setProdutoToDelete] = useState(null);
  const { toast } = useToast();

  const fetchProdutos = async () => {
    setLoading(true);
    try {
      // Use the RPC function which likely returns aggregated product data with variants
      const { data, error } = await supabase.rpc('get_products_with_variants');

      if (error) throw error;
      
      let filtered = data;
      if (searchTerm) {
          const term = searchTerm.toLowerCase();
          filtered = data.filter(p => p.search_text?.toLowerCase().includes(term));
      }

      setProdutos(filtered || []);
    } catch (error) {
      toast({
        title: 'Erro ao carregar produtos',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchProdutos();
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm]);

  const handleNewProduto = () => {
    setSelectedProduto(null);
    setIsModalOpen(true);
  };

  const handleEditProduto = (produto) => {
    setSelectedProduto(produto);
    setIsModalOpen(true);
  };
  
  const handleStockMovement = (variant) => {
      setSelectedVariantForStock(variant);
      setIsStockModalOpen(true);
  }

  const handleDeleteClick = (produto) => {
    setProdutoToDelete(produto);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!produtoToDelete) return;
    try {
      // First delete variants, then product (or rely on cascade if configured)
      const { error: variantError } = await supabase.from('product_variants').delete().eq('product_id', produtoToDelete.id);
      if (variantError) throw variantError;

      const { error } = await supabase.from('products').delete().eq('id', produtoToDelete.id);
      if (error) throw error;

      toast({ title: 'Produto excluído com sucesso' });
      fetchProdutos();
    } catch (error) {
      toast({
        title: 'Erro ao excluir',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsDeleteDialogOpen(false);
      setProdutoToDelete(null);
    }
  };

  // Helper to calculate total stock across variants
  const getTotalStock = (variants) => {
      if (!variants || !Array.isArray(variants)) return 0;
      return variants.reduce((acc, curr) => acc + (curr.stock || 0), 0);
  }

  const getPriceRange = (variants) => {
      if (!variants || !Array.isArray(variants) || variants.length === 0) return '-';
      const prices = variants.map(v => v.sale_price || 0);
      const min = Math.min(...prices);
      const max = Math.max(...prices);
      
      if (min === max) return formatCurrency(min);
      return `${formatCurrency(min)} - ${formatCurrency(max)}`;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="relative w-full sm:w-72">
           <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
           <Input
             placeholder="Buscar produto, código, categoria..."
             className="pl-8"
             value={searchTerm}
             onChange={(e) => setSearchTerm(e.target.value)}
           />
        </div>
        <Button onClick={handleNewProduto}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Novo Produto
        </Button>
      </div>

      <div className="border rounded-md bg-white">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50">
              <TableHead>Descrição/Código</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Estoque Total</TableHead>
              <TableHead>Preço de Venda</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                    <div className="flex justify-center"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div></div>
                </TableCell>
              </TableRow>
            ) : produtos.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                  Nenhum produto encontrado.
                </TableCell>
              </TableRow>
            ) : (
              produtos.map((produto) => {
                const totalStock = getTotalStock(produto.variants);
                const priceDisplay = getPriceRange(produto.variants);
                const variantCount = produto.variants?.length || 0;

                return (
                <TableRow 
                  key={produto.id}
                  className="hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => handleEditProduto(produto)}
                >
                  <TableCell>
                    <div className="flex flex-col">
                        <span className="font-medium">{produto.description}</span>
                        <span className="text-xs text-gray-500">Cod: {produto.code_internal || '-'} | {variantCount} {variantCount === 1 ? 'Variante' : 'Variantes'}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{produto.category || 'Geral'}</Badge>
                    {produto.subcategory && <span className="text-xs text-gray-500 ml-2">{produto.subcategory}</span>}
                  </TableCell>
                  <TableCell>
                    <div className={`font-bold ${totalStock <= 0 ? 'text-red-500' : 'text-gray-700'}`}>
                        {totalStock} {produto.unit_of_measure || 'un'}
                    </div>
                  </TableCell>
                  <TableCell>
                     {priceDisplay}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEditProduto(produto)}>
                            <Edit className="mr-2 h-4 w-4" /> Editar / Ver Detalhes
                          </DropdownMenuItem>
                          {/* Quick Access to Stock Movement for first variant if only 1 exists */}
                          {variantCount === 1 && (
                              <DropdownMenuItem onClick={() => handleStockMovement(produto.variants[0])}>
                                  <ArrowRightLeft className="mr-2 h-4 w-4" /> Ajuste de Estoque
                              </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => handleDeleteClick(produto)} className="text-red-600">
                            <Trash2 className="mr-2 h-4 w-4" /> Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
              )})
            )}
          </TableBody>
        </Table>
      </div>

      {isModalOpen && (
        <ProdutoDialog
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSave={fetchProdutos}
          produto={selectedProduto}
        />
      )}
      
      {isStockModalOpen && selectedVariantForStock && (
          <StockMovementModal 
             isOpen={isStockModalOpen}
             onClose={() => setIsStockModalOpen(false)}
             onSave={fetchProdutos}
             variant={selectedVariantForStock}
          />
      )}

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este produto e todas as suas variantes? O histórico de movimentações será mantido para fins de auditoria, mas o produto não estará mais disponível para novas ordens.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ProdutosList;