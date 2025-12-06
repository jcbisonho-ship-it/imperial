import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Edit, Search, Package, Box, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import ProdutoDialog from '@/components/produtos/ProdutoDialog';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PRODUCT_TYPES, PRODUCT_TYPE_LABELS } from '@/lib/constants';

const ProductManagement = () => {
  const [products, setProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const loadProducts = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.rpc('get_products_with_variants');
      if (error) throw error;

      const normalizedData = (data || []).map(p => ({
          ...p,
          product_type: p.product_type === 'parent' ? PRODUCT_TYPES.MESTRE : 
                        p.product_type === 'unique' ? PRODUCT_TYPES.SIMPLES : 
                        p.product_type
      }));
      setProducts(normalizedData);
    } catch (error) {
      toast({ title: "Erro ao carregar produtos", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const handleOpenDialog = (product = null) => {
    setEditingProduct(product);
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingProduct(null);
    loadProducts();
  };

  const filteredProducts = products.filter(p => {
    const matchesSearch = (p.description && p.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (p.variants && p.variants.some(v => v.variant_code && v.variant_code.toLowerCase().includes(searchTerm.toLowerCase())));
    const matchesType = typeFilter === 'all' || p.product_type === typeFilter;
    return matchesSearch && matchesType;
  });

  const getTypeBadge = (type) => {
      if (type === PRODUCT_TYPES.MESTRE) {
          return <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-200 border-purple-200 whitespace-nowrap"><Layers className="w-3 h-3 mr-1" /> Produto Mestre</Badge>;
      }
      return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-200 border-blue-200 whitespace-nowrap"><Box className="w-3 h-3 mr-1" /> Produto Simples</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Gestão de Produtos</h2>
          <p className="text-gray-600">Gerencie seu inventário de peças e produtos.</p>
        </div>
        <Button
          onClick={() => handleOpenDialog()}
          className="bg-gradient-to-r from-blue-600 to-blue-800 hover:from-blue-700 hover:to-blue-900"
        >
          <Plus className="w-4 h-4 mr-2" />
          Novo Produto
        </Button>
      </div>

      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="mb-6 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Buscar por nome ou SKU..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-full sm:w-[180px] h-[42px]">
                    <SelectValue placeholder="Filtrar por Tipo" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">Todos os Tipos</SelectItem>
                    <SelectItem value={PRODUCT_TYPES.SIMPLES}>Produto Simples</SelectItem>
                    <SelectItem value={PRODUCT_TYPES.MESTRE}>Produto Mestre</SelectItem>
                </SelectContent>
          </Select>
        </div>

        {loading ? (
          <div className="text-center py-12">Carregando...</div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-12">
            <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">Nenhum produto encontrado</p>
            <p className="text-gray-400 text-sm">Clique em "Novo Produto" para começar</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-gray-500">
              <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3">Nome</th>
                  <th scope="col" className="px-6 py-3">Tipo</th>
                  <th scope="col" className="px-6 py-3">Categoria</th>
                  <th scope="col" className="px-6 py-3">Variantes</th>
                  <th scope="col" className="px-6 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((product) => (
                  <tr key={product.id} className="bg-white border-b hover:bg-gray-50">
                    <td className="px-6 py-4 font-medium text-gray-900">{product.description}</td>
                    <td className="px-6 py-4">{getTypeBadge(product.product_type)}</td>
                    <td className="px-6 py-4">{product.category}</td>
                    <td className="px-6 py-4">{product.variants?.length || 0}</td>
                    <td className="px-6 py-4 text-right">
                      <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(product)}><Edit className="w-4 h-4" /></Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {isDialogOpen && (
        <ProdutoDialog
          isOpen={isDialogOpen}
          onClose={handleCloseDialog}
          product={editingProduct}
        />
      )}
    </div>
  );
};

export default ProductManagement;