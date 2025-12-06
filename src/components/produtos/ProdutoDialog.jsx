import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { logAuditEvent } from '@/lib/audit';
import { Plus, Trash2, Edit2, Box, Layers, Calculator, AlertCircle, PlusCircle, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { v4 as uuidv4 } from 'uuid';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { PRODUCT_TYPES } from '@/lib/constants';
import CategoriaProdutoDialog from './CategoriaProdutoDialog';
import SubcategoriaProdutoDialog from './SubcategoriaProdutoDialog';

const UNITS = ['UN', 'KG', 'L', 'JG', 'PC', 'CX', 'MT', 'PAR', 'KIT'];

// STRICT RESPONSIVE CONSTANTS
const INPUT_CLASS = "h-11 sm:h-9 text-base sm:text-sm px-3 sm:px-2.5"; 
const BUTTON_CLASS = "w-full sm:w-auto h-11 sm:h-9 px-6 sm:px-4 text-base sm:text-sm font-medium";
const LABEL_CLASS = "text-sm sm:text-xs font-medium text-slate-700 mb-1.5 sm:mb-1 block";

const calculateSalePrice = (cost, margin) => {
    const c = parseFloat(cost) || 0;
    const m = parseFloat(margin) || 0;
    if (c <= 0) return 0;
    return (c + (c * m / 100)).toFixed(2);
};

const calculateMargin = (cost, price) => {
    const c = parseFloat(cost) || 0;
    const p = parseFloat(price) || 0;
    if (c <= 0 || p <= 0) return 0;
    return (((p - c) / c) * 100).toFixed(2);
};

const VariantFormFields = ({ variant, onChange, errors = {}, masterUnit = 'UN' }) => {
    const handleCostMarginChange = (field, value) => {
        let newVariant = { ...variant, [field]: value };
        
        if (field === 'cost_price' || field === 'margin_pct') {
            const cost = field === 'cost_price' ? value : variant.cost_price;
            const margin = field === 'margin_pct' ? value : variant.margin_pct;
            newVariant.sale_price = calculateSalePrice(cost, margin);
        } else if (field === 'sale_price') {
             newVariant.margin_pct = calculateMargin(variant.cost_price, value);
        }
        
        Object.keys(newVariant).forEach(key => {
            if (newVariant[key] !== variant[key]) {
                onChange(key, newVariant[key]);
            }
        });
    };

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-0.5">
                    <Label htmlFor="v_code" className={LABEL_CLASS}>Código (SKU) *</Label>
                    <Input 
                        id="v_code" 
                        value={variant.variant_code} 
                        onChange={(e) => onChange('variant_code', e.target.value)} 
                        placeholder="SKU ou Código único" 
                        className={`${INPUT_CLASS} ${errors.variant_code ? "border-red-500" : ""}`}
                    />
                    {errors.variant_code && <span className="text-xs text-red-500">{errors.variant_code}</span>}
                </div>
                
                {/* Código de Barras agora posicionado logo após o SKU */}
                <div className="space-y-0.5">
                    <Label htmlFor="v_barcode" className={LABEL_CLASS}>Código de Barras</Label>
                    <Input 
                        id="v_barcode" 
                        value={variant.barcode} 
                        onChange={(e) => onChange('barcode', e.target.value)} 
                        placeholder="EAN/GTIN" 
                        className={`${INPUT_CLASS} ${errors.barcode ? "border-red-500" : ""}`}
                    />
                    {errors.barcode && <span className="text-xs text-red-500">{errors.barcode}</span>}
                </div>

                <div className="space-y-0.5">
                    <Label htmlFor="v_brand" className={LABEL_CLASS}>Marca</Label>
                    <Input id="v_brand" value={variant.brand} onChange={(e) => onChange('brand', e.target.value)} className={INPUT_CLASS} />
                </div>
                <div className="space-y-0.5">
                    <Label htmlFor="v_unit" className={LABEL_CLASS}>Unidade (Herdado)</Label>
                    <Input id="v_unit" value={masterUnit} disabled className={`${INPUT_CLASS} bg-gray-100 text-gray-500`} />
                </div>
                <div className="space-y-0.5">
                    <Label htmlFor="v_stock" className={LABEL_CLASS}>Estoque Atual</Label>
                    <Input id="v_stock" type="number" value={variant.stock} onChange={(e) => onChange('stock', e.target.value)} className={INPUT_CLASS} />
                </div>
                <div className="space-y-0.5">
                    <Label htmlFor="v_min_stock" className={LABEL_CLASS}>Estoque Mínimo</Label>
                    <Input id="v_min_stock" type="number" value={variant.min_stock} onChange={(e) => onChange('min_stock', e.target.value)} className={INPUT_CLASS} />
                </div>
                <div className="space-y-0.5">
                    <Label htmlFor="v_cost" className={LABEL_CLASS}>Custo (R$)</Label>
                    <Input id="v_cost" type="number" step="0.01" value={variant.cost_price} onChange={(e) => handleCostMarginChange('cost_price', e.target.value)} className={INPUT_CLASS} />
                </div>
                <div className="space-y-0.5">
                    <Label htmlFor="v_margin" className={LABEL_CLASS}>Margem %</Label>
                    <div className="relative">
                        <Input id="v_margin" type="number" step="0.1" value={variant.margin_pct} onChange={(e) => handleCostMarginChange('margin_pct', e.target.value)} className={INPUT_CLASS} />
                        <Calculator className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                    </div>
                </div>
                <div className="space-y-0.5 sm:col-span-2">
                    <Label htmlFor="v_sale" className={LABEL_CLASS}>Preço de Venda (R$)</Label>
                    <Input id="v_sale" type="number" step="0.01" value={variant.sale_price} onChange={(e) => handleCostMarginChange('sale_price', e.target.value)} className={INPUT_CLASS} />
                </div>
            </div>
        </div>
    );
};


const ProdutoDialog = ({ isOpen, onClose, onSaveSuccess, product, user }) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [productType, setProductType] = useState(PRODUCT_TYPES.SIMPLES); 
  
  const [productData, setProductData] = useState({
    description: '', code_internal: '', category: '', subcategory: '', product_category_id: '', product_subcategory_id: '',
    unit_of_measure: 'UN', aplicacao: '', exchange_interval_km: '',
    exchange_interval_months: '', ncm: '', cross_codes: '', observations: ''
  });

  const [variants, setVariants] = useState([]);
  const [isVariantModalOpen, setIsVariantModalOpen] = useState(false);
  const [editingVariantIndex, setEditingVariantIndex] = useState(null);
  const [currentVariantData, setCurrentVariantData] = useState(createEmptyVariant());
  const [errors, setErrors] = useState({});
  const [initialStockMap, setInitialStockMap] = useState({});

  // Categories states
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [isCatModalOpen, setIsCatModalOpen] = useState(false);
  const [isSubCatModalOpen, setIsSubCatModalOpen] = useState(false);

  // Delete confirmation state
  const [deleteConfirmation, setDeleteConfirmation] = useState({ isOpen: false, id: null, type: null, name: '' });

  function createEmptyVariant() {
      return {
          tempId: uuidv4(),
          id: null,
          variant_code: '',
          barcode: '', 
          brand: '', 
          stock: 0, min_stock: 0, 
          cost_price: '', sale_price: '', margin_pct: ''
      };
  }

  // Fetch categories on load
  useEffect(() => {
    if(isOpen) fetchCategories();
  }, [isOpen]);

  const fetchCategories = async () => {
    const { data } = await supabase.from('product_categories').select('*').order('name');
    setCategories(data || []);
  };

  const fetchSubcategories = async (catId) => {
    if (!catId) {
        setSubcategories([]);
        return;
    }
    const { data } = await supabase.from('product_subcategories').select('*').eq('category_id', catId).order('name');
    setSubcategories(data || []);
  };

  // Update subcategories when category changes
  useEffect(() => {
      if (productData.product_category_id) {
          fetchSubcategories(productData.product_category_id);
      } else {
          setSubcategories([]);
      }
  }, [productData.product_category_id]);


  useEffect(() => {
    if (product) {
      const rawType = product.product_type || PRODUCT_TYPES.SIMPLES;
      const typeMapping = { 'parent': PRODUCT_TYPES.MESTRE, 'unique': PRODUCT_TYPES.SIMPLES };
      const mappedType = typeMapping[rawType] || rawType;
      
      setProductType(mappedType);
      setProductData({
        description: product.description || '',
        code_internal: product.code_internal || '',
        category: product.category || '', // Legacy string field
        subcategory: product.subcategory || '', // Legacy string field
        product_category_id: product.product_category_id || '', // NEW ID field
        product_subcategory_id: product.product_subcategory_id || '', // NEW ID field
        unit_of_measure: product.unit_of_measure || 'UN',
        aplicacao: product.aplicacao || '',
        exchange_interval_km: product.exchange_interval_km || '',
        exchange_interval_months: product.exchange_interval_months || '',
        ncm: product.ncm || '',
        cross_codes: product.cross_codes || '',
        observations: product.observations || ''
      });

      const loadedVariants = product.variants?.map(v => ({ ...v, tempId: uuidv4() })) || [];
      if (loadedVariants.length === 0) loadedVariants.push(createEmptyVariant());

      setVariants(loadedVariants);
      const stockMap = {};
      loadedVariants.forEach(v => { if(v.id) stockMap[v.id] = v.stock; });
      setInitialStockMap(stockMap);
    } else {
      setProductType(PRODUCT_TYPES.SIMPLES);
      setProductData({ 
          description: '', code_internal: '', category: '', subcategory: '', product_category_id: '', product_subcategory_id: '', unit_of_measure: 'UN', aplicacao: '', 
          exchange_interval_km: '', exchange_interval_months: '', ncm: '', cross_codes: '', observations: '' 
      });
      setVariants([createEmptyVariant()]);
      setInitialStockMap({});
    }
    setErrors({});
  }, [product, isOpen]);

  const handleProductChange = (field, value) => {
    setProductData(prev => ({ ...prev, [field]: value }));
    if (field === 'product_category_id') {
        // Reset subcategory when category changes
        setProductData(prev => ({ ...prev, product_subcategory_id: '' }));
    }
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: null }));
  };

  const handleNewCategory = (newCat) => {
      fetchCategories().then(() => {
          handleProductChange('product_category_id', newCat.id);
      });
  };

  const handleNewSubcategory = (newSub) => {
      fetchSubcategories(productData.product_category_id).then(() => {
          handleProductChange('product_subcategory_id', newSub.id);
      });
  };

  const handleDeleteRequest = (e, id, type, name) => {
    e.preventDefault();
    e.stopPropagation();
    setDeleteConfirmation({ isOpen: true, id, type, name });
  };

  const executeDelete = async () => {
    const { id, type } = deleteConfirmation;
    if (!id) return;

    try {
      const table = type === 'category' ? 'product_categories' : 'product_subcategories';
      const usageColumn = type === 'category' ? 'product_category_id' : 'product_subcategory_id';

      // Check usage in products
      const { count, error: checkError } = await supabase
          .from('products')
          .select('*', { count: 'exact', head: true })
          .eq(usageColumn, id);

      if (checkError) throw checkError;
      if (count > 0) throw new Error(`Este item está sendo usado em ${count} produtos e não pode ser excluído.`);

      // If category, check for subcategories
      if (type === 'category') {
          const { count: subCount, error: subCheckError } = await supabase
              .from('product_subcategories')
              .select('*', { count: 'exact', head: true })
              .eq('category_id', id);
          
          if (subCheckError) throw subCheckError;
          if (subCount > 0) throw new Error(`Esta categoria possui ${subCount} subcategorias. Exclua-as primeiro.`);
      }

      const { error } = await supabase.from(table).delete().eq('id', id);
      if (error) throw error;

      toast({ title: 'Item excluído com sucesso.' });

      // Clear selection if needed
      if (type === 'category' && productData.product_category_id === id) {
          handleProductChange('product_category_id', '');
      }
      if (type === 'subcategory' && productData.product_subcategory_id === id) {
          handleProductChange('product_subcategory_id', '');
      }

      // Refresh dropdowns
      if (type === 'category') fetchCategories();
      else fetchSubcategories(productData.product_category_id);

    } catch (err) {
      console.error("Delete error:", err);
      toast({ variant: 'destructive', title: 'Erro ao excluir', description: err.message });
    } finally {
      setDeleteConfirmation({ isOpen: false, id: null, type: null, name: '' });
    }
  };

  const handleSimplesVariantChange = (field, value) => {
      const updatedVariants = [...variants];
      let current = { ...updatedVariants[0] };
      
      if (field === 'cost_price' || field === 'margin_pct') {
            current[field] = value;
            const cost = field === 'cost_price' ? value : current.cost_price;
            const margin = field === 'margin_pct' ? value : current.margin_pct;
            current.sale_price = calculateSalePrice(cost, margin);
      } else if (field === 'sale_price') {
            current.sale_price = value;
            current.margin_pct = calculateMargin(current.cost_price, value);
      } else {
            current[field] = value;
      }
      updatedVariants[0] = current;
      setVariants(updatedVariants);
      if (errors[field]) setErrors(prev => ({ ...prev, [field]: null }));
      if (errors['variant_0_barcode'] && field === 'barcode') setErrors(prev => ({ ...prev, variant_0_barcode: null }));
  };

  const openNewVariantModal = () => {
      setCurrentVariantData(createEmptyVariant());
      setEditingVariantIndex(null);
      setIsVariantModalOpen(true);
  };

  const openEditVariantModal = (index) => {
      setCurrentVariantData({ ...variants[index] });
      setEditingVariantIndex(index);
      setIsVariantModalOpen(true);
  };

  const handleVariantModalSave = () => {
      if (!currentVariantData.variant_code) {
          toast({ title: "Campo Obrigatório", description: "O código da variante é obrigatório.", variant: "destructive" });
          return;
      }
      const updatedVariants = [...variants];
      if (editingVariantIndex !== null) {
          updatedVariants[editingVariantIndex] = currentVariantData;
      } else {
          updatedVariants.push(currentVariantData);
      }
      setVariants(updatedVariants);
      setIsVariantModalOpen(false);
  };

  const handleDeleteVariantFromDB = async (index) => {
      const variant = variants[index];
      if (variant.id) {
          if (variants.length <= 1) {
              toast({ title: "Ação bloqueada", description: "O Produto Mestre deve ter pelo menos uma variante.", variant: "destructive" });
              return;
          }
          if (!window.confirm("Tem certeza que deseja excluir esta variante permanentemente?")) return;

          const { error } = await supabase.from('product_variants').delete().eq('id', variant.id);
          if (error) {
              toast({ title: "Erro ao excluir", description: error.message, variant: "destructive" });
              return;
          }
      }
      setVariants(variants.filter((_, i) => i !== index));
  };

  const validateUniqueField = async (field, value, currentId, table) => {
    if (!value) return true;
    let query = supabase.from(table).select('id').eq(field, value);
    if (currentId) query = query.neq('id', currentId);
    const { data } = await query;
    return data.length === 0;
  };

  const handleSubmit = async () => {
    setLoading(true);
    setErrors({});
    const newErrors = {};

    try {
        if (!productData.description) newErrors.description = "Descrição é obrigatória.";
        if (productType === PRODUCT_TYPES.MESTRE && !productData.code_internal) newErrors.code_internal = "Código interno é obrigatório para Produto Mestre.";
        if (productType === PRODUCT_TYPES.MESTRE && variants.length === 0) throw new Error("Produto Mestre deve ter pelo menos uma variante cadastrada.");
        if (productType === PRODUCT_TYPES.SIMPLES) {
            if (variants.length === 0) setVariants([createEmptyVariant()]);
            if (variants.length > 1) throw new Error("Produto Simples não pode ter variantes adicionais.");
        }

        const barcodeRegex = /^\d{8,14}$/;
        for (let i = 0; i < variants.length; i++) {
            const v = variants[i];
            if (productType === PRODUCT_TYPES.SIMPLES && !v.variant_code) {
               v.variant_code = v.barcode || `SKU-${Date.now()}-${Math.floor(Math.random()*1000)}`; 
            }
            if (productType === PRODUCT_TYPES.MESTRE && !v.variant_code) newErrors[`variant_${i}_code`] = "Código da variante é obrigatório."; 
            if (v.barcode && !barcodeRegex.test(v.barcode)) newErrors[`variant_${i}_barcode`] = "Código de barras inválido (8-14 dígitos).";

            if (v.barcode) {
                const isUnique = await validateUniqueField('barcode', v.barcode, v.id, 'product_variants');
                if (!isUnique) newErrors[`variant_${i}_barcode`] = "Este código de barras já está em uso.";
            }
            if (v.variant_code) {
                 const isUnique = await validateUniqueField('variant_code', v.variant_code, v.id, 'product_variants');
                 if (!isUnique && productType === PRODUCT_TYPES.MESTRE) newErrors[`variant_${i}_code`] = "Este código de variante já existe.";
            }
        }
        
        if (productData.code_internal) {
             const isUnique = await validateUniqueField('code_internal', productData.code_internal, product?.id, 'products');
             if (!isUnique) newErrors.code_internal = "Este código interno já existe.";
        }

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            throw new Error("Verifique os campos em vermelho.");
        }

        // Get names for legacy string fields
        const catName = categories.find(c => c.id === productData.product_category_id)?.name || '';
        const subName = subcategories.find(s => s.id === productData.product_subcategory_id)?.name || '';

        const productPayload = {
            description: productData.description,
            category: catName, // Legacy string
            subcategory: subName, // Legacy string
            product_category_id: productData.product_category_id || null, // New ID
            product_subcategory_id: productData.product_subcategory_id || null, // New ID
            aplicacao: productData.aplicacao,
            exchange_interval_km: productData.exchange_interval_km || null,
            exchange_interval_months: productData.exchange_interval_months || null,
            observations: productData.observations,
            product_type: productType,
            code_internal: productData.code_internal || null,
            ncm: productData.ncm,
            cross_codes: productData.cross_codes,
            unit_of_measure: productData.unit_of_measure
        };

        let productId = product?.id;
        let isNewProduct = !productId;

        if (isNewProduct) {
            const { data, error } = await supabase.from('products').insert(productPayload).select().single();
            if (error) throw error;
            productId = data.id;
        } else {
             const { error } = await supabase.from('products').update(productPayload).eq('id', productId);
             if (error) throw error;
        }

        for (const variant of variants) {
            const variantPayload = {
                product_id: productId,
                variant_code: variant.variant_code,
                barcode: variant.barcode || null,
                brand: variant.brand,
                stock: variant.stock || 0,
                min_stock: variant.min_stock || 0,
                cost_price: variant.cost_price || 0,
                sale_price: variant.sale_price || 0,
                margin_pct: variant.margin_pct || 0,
                unit_of_measure: productData.unit_of_measure 
            };
            let savedVariantId = variant.id;
            if (savedVariantId) {
                const { error } = await supabase.from('product_variants').update(variantPayload).eq('id', savedVariantId);
                if (error) throw error;
            } else {
                const { data, error } = await supabase.from('product_variants').insert(variantPayload).select().single();
                if (error) throw error;
                savedVariantId = data.id;
            }
            const initialStock = initialStockMap[savedVariantId] || 0;
            const stockChange = Number(variant.stock) - initialStock;
            if (stockChange !== 0) {
                 await supabase.from('product_history').insert({
                    product_variant_id: savedVariantId, quantity_change: stockChange, reason: isNewProduct ? 'Estoque Inicial' : 'Ajuste Manual'
                });
            }
        }
        await logAuditEvent(user.id, isNewProduct ? 'create_product' : 'update_product', { productId, description: productData.description, type: productType });
        toast({ title: "Sucesso", description: productType === PRODUCT_TYPES.MESTRE ? "Produto Mestre salvo com sucesso!" : "Produto Simples salvo com sucesso!", className: "bg-green-50 border-green-200" });
        onSaveSuccess();
        onClose();
    } catch (error) {
        console.error(error);
        toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    } finally {
        setLoading(false);
    }
  };

  const renderSimplesForm = () => {
      const v = variants[0] || createEmptyVariant();
      return (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
             <div className="space-y-0.5">
                <Label htmlFor="code_internal" className={LABEL_CLASS}>Código Interno</Label>
                <Input id="code_internal" value={productData.code_internal} onChange={(e) => handleProductChange('code_internal', e.target.value)} className={`${INPUT_CLASS} ${errors.code_internal ? "border-red-500" : ""}`} />
                {errors.code_internal && <span className="text-xs text-red-500">{errors.code_internal}</span>}
             </div>

             {/* Código de Barras movido para destaque no formulário Simples */}
             <div className="space-y-0.5">
                <Label htmlFor="barcode" className={LABEL_CLASS}>Código de Barras</Label>
                <Input id="barcode" value={v.barcode} onChange={(e) => handleSimplesVariantChange('barcode', e.target.value)} placeholder="EAN/GTIN" className={`${INPUT_CLASS} ${errors['variant_0_barcode'] ? "border-red-500" : ""}`} />
                {errors['variant_0_barcode'] && <span className="text-xs text-red-500">{errors['variant_0_barcode']}</span>}
             </div>

             <div className="space-y-0.5 sm:col-span-2 md:col-span-3">
                <Label htmlFor="description" className={LABEL_CLASS}>Descrição *</Label>
                <Input id="description" value={productData.description} onChange={(e) => handleProductChange('description', e.target.value)} className={`${INPUT_CLASS} ${errors.description ? "border-red-500" : ""}`} />
                {errors.description && <span className="text-xs text-red-500">{errors.description}</span>}
             </div>
             <div className="space-y-0.5 sm:col-span-3">
                <Label htmlFor="aplicacao" className={LABEL_CLASS}>Aplicação</Label>
                <Input id="aplicacao" value={productData.aplicacao} onChange={(e) => handleProductChange('aplicacao', e.target.value)} className={INPUT_CLASS} />
             </div>
             
             {/* Category Selection */}
             <div className="space-y-0.5">
                <Label htmlFor="category" className={LABEL_CLASS}>Categoria</Label>
                <div className="flex gap-2">
                    <Select value={productData.product_category_id} onValueChange={(val) => handleProductChange('product_category_id', val)}>
                        <SelectTrigger id="category" className={INPUT_CLASS}><SelectValue placeholder="Selecione" /></SelectTrigger>
                        <SelectContent className="max-h-[200px]">
                            {categories.length === 0 ? (
                                <SelectItem value="empty" disabled>Nenhuma categoria</SelectItem>
                            ) : (
                                categories.map(c => (
                                    <SelectItem key={c.id} value={c.id} className="group relative flex items-center justify-between min-w-[150px] select-item-container">
                                        <span className="truncate pr-2">{c.name}</span>
                                        <div 
                                            role="button"
                                            className="delete-btn p-1 rounded-md hover:bg-red-100 text-gray-400 hover:text-red-600 transition-all opacity-0 group-hover:opacity-100 z-50 absolute right-1"
                                            onPointerDown={(e) => handleDeleteRequest(e, c.id, 'category', c.name)}
                                            title="Excluir categoria"
                                        >
                                            <X className="h-4 w-4" />
                                        </div>
                                    </SelectItem>
                                ))
                            )}
                        </SelectContent>
                    </Select>
                    <Button type="button" variant="outline" size="icon" onClick={() => setIsCatModalOpen(true)} title="Nova Categoria" className="shrink-0">
                        <PlusCircle className="h-4 w-4" />
                    </Button>
                </div>
             </div>

             {/* Subcategory Selection */}
             <div className="space-y-0.5">
                <Label htmlFor="subcategory" className={LABEL_CLASS}>Subcategoria</Label>
                <div className="flex gap-2">
                    <Select value={productData.product_subcategory_id} onValueChange={(val) => handleProductChange('product_subcategory_id', val)} disabled={!productData.product_category_id}>
                        <SelectTrigger id="subcategory" className={INPUT_CLASS}><SelectValue placeholder="Selecione" /></SelectTrigger>
                        <SelectContent className="max-h-[200px]">
                            {subcategories.length === 0 ? (
                                <SelectItem value="empty" disabled>Nenhuma subcategoria</SelectItem>
                            ) : (
                                subcategories.map(s => (
                                    <SelectItem key={s.id} value={s.id} className="group relative flex items-center justify-between min-w-[150px] select-item-container">
                                        <span className="truncate pr-2">{s.name}</span>
                                        <div 
                                            role="button"
                                            className="delete-btn p-1 rounded-md hover:bg-red-100 text-gray-400 hover:text-red-600 transition-all opacity-0 group-hover:opacity-100 z-50 absolute right-1"
                                            onPointerDown={(e) => handleDeleteRequest(e, s.id, 'subcategory', s.name)}
                                            title="Excluir subcategoria"
                                        >
                                            <X className="h-4 w-4" />
                                        </div>
                                    </SelectItem>
                                ))
                            )}
                        </SelectContent>
                    </Select>
                     <Button type="button" variant="outline" size="icon" onClick={() => setIsSubCatModalOpen(true)} disabled={!productData.product_category_id} title="Nova Subcategoria" className="shrink-0">
                        <PlusCircle className="h-4 w-4" />
                    </Button>
                </div>
             </div>

             <div className="space-y-0.5">
                <Label htmlFor="unit_measure" className={LABEL_CLASS}>Unidade de Medida *</Label>
                <Select value={productData.unit_of_measure} onValueChange={(val) => handleProductChange('unit_of_measure', val)}>
                  <SelectTrigger id="unit_measure" className={INPUT_CLASS}><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>{UNITS.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
                </Select>
             </div>
             <div className="space-y-0.5">
                <Label htmlFor="int_km" className={LABEL_CLASS}>Intervalo Troca (KM)</Label>
                <Input id="int_km" type="number" value={productData.exchange_interval_km} onChange={(e) => handleProductChange('exchange_interval_km', e.target.value)} className={INPUT_CLASS} />
             </div>
             <div className="space-y-0.5">
                <Label htmlFor="int_months" className={LABEL_CLASS}>Intervalo Troca (Meses)</Label>
                <Input id="int_months" type="number" value={productData.exchange_interval_months} onChange={(e) => handleProductChange('exchange_interval_months', e.target.value)} className={INPUT_CLASS} />
             </div>
             <div className="space-y-0.5">
                <Label htmlFor="ncm" className={LABEL_CLASS}>NCM</Label>
                <Input id="ncm" value={productData.ncm} onChange={(e) => handleProductChange('ncm', e.target.value)} className={INPUT_CLASS} />
             </div>
             <div className="space-y-0.5 sm:col-span-3">
                <Label htmlFor="cross" className={LABEL_CLASS}>Códigos Cruzados</Label>
                <Input id="cross" value={productData.cross_codes} onChange={(e) => handleProductChange('cross_codes', e.target.value)} className={INPUT_CLASS} />
             </div>
             <div className="space-y-0.5 sm:col-span-3">
                <Label htmlFor="obs" className={LABEL_CLASS}>Observação</Label>
                <Textarea id="obs" value={productData.observations} onChange={(e) => handleProductChange('observations', e.target.value)} rows={2} className="min-h-[80px] p-3 sm:p-2" />
             </div>
             <div className="sm:col-span-3 border-t my-2"></div>
             <div className="space-y-0.5">
                <Label htmlFor="stock" className={LABEL_CLASS}>Estoque Atual</Label>
                <Input id="stock" type="number" value={v.stock} onChange={(e) => handleSimplesVariantChange('stock', e.target.value)} className={INPUT_CLASS} />
             </div>
             <div className="space-y-0.5">
                <Label htmlFor="min_stock" className={LABEL_CLASS}>Estoque Mínimo</Label>
                <Input id="min_stock" type="number" value={v.min_stock} onChange={(e) => handleSimplesVariantChange('min_stock', e.target.value)} className={INPUT_CLASS} />
             </div>
             <div className="space-y-0.5">
                <Label htmlFor="cost" className={LABEL_CLASS}>Custo (R$)</Label>
                <Input id="cost" type="number" step="0.01" value={v.cost_price} onChange={(e) => handleSimplesVariantChange('cost_price', e.target.value)} className={INPUT_CLASS} />
             </div>
             <div className="space-y-0.5">
                <Label htmlFor="margin" className={LABEL_CLASS}>Margem %</Label>
                <div className="relative">
                    <Input id="margin" type="number" step="0.1" value={v.margin_pct} onChange={(e) => handleSimplesVariantChange('margin_pct', e.target.value)} className={INPUT_CLASS} />
                    <Calculator className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                </div>
             </div>
             <div className="space-y-0.5">
                <Label htmlFor="sale" className={LABEL_CLASS}>Preço de Venda (R$)</Label>
                <Input id="sale" type="number" step="0.01" value={v.sale_price} onChange={(e) => handleSimplesVariantChange('sale_price', e.target.value)} className={INPUT_CLASS} />
             </div>
          </div>
      );
  };

  const renderMestreForm = () => {
      return (
          <div className="space-y-6">
              <Alert className="bg-purple-50 border-purple-200 p-3 sm:p-4">
                <Layers className="h-4 w-4 text-purple-600" />
                <AlertTitle className="text-purple-800 text-sm">Produto Mestre Selecionado</AlertTitle>
                <AlertDescription className="text-purple-700 text-xs mt-1">
                  Dados de venda devem ser cadastrados nas <strong>variantes</strong>.
                </AlertDescription>
              </Alert>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                 <div className="space-y-0.5">
                    <Label htmlFor="code_internal" className={LABEL_CLASS}>Código Interno *</Label>
                    <Input id="code_internal" value={productData.code_internal} onChange={(e) => handleProductChange('code_internal', e.target.value)} className={`${INPUT_CLASS} ${errors.code_internal ? "border-red-500" : ""}`} />
                    {errors.code_internal && <span className="text-xs text-red-500">{errors.code_internal}</span>}
                 </div>
                 <div className="space-y-0.5 sm:col-span-2">
                    <Label htmlFor="description" className={LABEL_CLASS}>Descrição Geral *</Label>
                    <Input id="description" value={productData.description} onChange={(e) => handleProductChange('description', e.target.value)} className={`${INPUT_CLASS} ${errors.description ? "border-red-500" : ""}`} />
                    {errors.description && <span className="text-xs text-red-500">{errors.description}</span>}
                 </div>
                 <div className="space-y-0.5 sm:col-span-3">
                    <Label htmlFor="aplicacao" className={LABEL_CLASS}>Aplicação</Label>
                    <Input id="aplicacao" value={productData.aplicacao} onChange={(e) => handleProductChange('aplicacao', e.target.value)} className={INPUT_CLASS} />
                 </div>
                 
                 {/* Category Selection */}
                 <div className="space-y-0.5">
                    <Label htmlFor="category" className={LABEL_CLASS}>Categoria</Label>
                    <div className="flex gap-2">
                        <Select value={productData.product_category_id} onValueChange={(val) => handleProductChange('product_category_id', val)}>
                            <SelectTrigger id="category" className={INPUT_CLASS}><SelectValue placeholder="Selecione" /></SelectTrigger>
                            <SelectContent className="max-h-[200px]">
                                {categories.length === 0 ? (
                                    <SelectItem value="empty" disabled>Nenhuma categoria</SelectItem>
                                ) : (
                                    categories.map(c => (
                                        <SelectItem key={c.id} value={c.id} className="group relative flex items-center justify-between min-w-[150px] select-item-container">
                                            <span className="truncate pr-2">{c.name}</span>
                                            <div 
                                                role="button"
                                                className="delete-btn p-1 rounded-md hover:bg-red-100 text-gray-400 hover:text-red-600 transition-all opacity-0 group-hover:opacity-100 z-50 absolute right-1"
                                                onPointerDown={(e) => handleDeleteRequest(e, c.id, 'category', c.name)}
                                                title="Excluir categoria"
                                            >
                                                <X className="h-4 w-4" />
                                            </div>
                                        </SelectItem>
                                    ))
                                )}
                            </SelectContent>
                        </Select>
                        <Button type="button" variant="outline" size="icon" onClick={() => setIsCatModalOpen(true)} title="Nova Categoria" className="shrink-0">
                            <PlusCircle className="h-4 w-4" />
                        </Button>
                    </div>
                 </div>

                 {/* Subcategory Selection */}
                 <div className="space-y-0.5">
                    <Label htmlFor="subcategory" className={LABEL_CLASS}>Subcategoria</Label>
                    <div className="flex gap-2">
                        <Select value={productData.product_subcategory_id} onValueChange={(val) => handleProductChange('product_subcategory_id', val)} disabled={!productData.product_category_id}>
                            <SelectTrigger id="subcategory" className={INPUT_CLASS}><SelectValue placeholder="Selecione" /></SelectTrigger>
                            <SelectContent className="max-h-[200px]">
                                {subcategories.length === 0 ? (
                                    <SelectItem value="empty" disabled>Nenhuma subcategoria</SelectItem>
                                ) : (
                                    subcategories.map(s => (
                                        <SelectItem key={s.id} value={s.id} className="group relative flex items-center justify-between min-w-[150px] select-item-container">
                                            <span className="truncate pr-2">{s.name}</span>
                                            <div 
                                                role="button"
                                                className="delete-btn p-1 rounded-md hover:bg-red-100 text-gray-400 hover:text-red-600 transition-all opacity-0 group-hover:opacity-100 z-50 absolute right-1"
                                                onPointerDown={(e) => handleDeleteRequest(e, s.id, 'subcategory', s.name)}
                                                title="Excluir subcategoria"
                                            >
                                                <X className="h-4 w-4" />
                                            </div>
                                        </SelectItem>
                                    ))
                                )}
                            </SelectContent>
                        </Select>
                         <Button type="button" variant="outline" size="icon" onClick={() => setIsSubCatModalOpen(true)} disabled={!productData.product_category_id} title="Nova Subcategoria" className="shrink-0">
                            <PlusCircle className="h-4 w-4" />
                        </Button>
                    </div>
                 </div>

                 <div className="space-y-0.5">
                    <Label htmlFor="unit_measure" className={LABEL_CLASS}>Unidade de Medida *</Label>
                    <Select value={productData.unit_of_measure} onValueChange={(val) => handleProductChange('unit_of_measure', val)}>
                      <SelectTrigger id="unit_measure" className={INPUT_CLASS}><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>{UNITS.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
                    </Select>
                 </div>
                 <div className="space-y-0.5">
                    <Label htmlFor="int_km" className={LABEL_CLASS}>Intervalo Troca (KM)</Label>
                    <Input id="int_km" type="number" value={productData.exchange_interval_km} onChange={(e) => handleProductChange('exchange_interval_km', e.target.value)} className={INPUT_CLASS} />
                 </div>
                 <div className="space-y-0.5">
                    <Label htmlFor="int_months" className={LABEL_CLASS}>Intervalo Troca (Meses)</Label>
                    <Input id="int_months" type="number" value={productData.exchange_interval_months} onChange={(e) => handleProductChange('exchange_interval_months', e.target.value)} className={INPUT_CLASS} />
                 </div>
                 <div className="space-y-0.5">
                    <Label htmlFor="ncm" className={LABEL_CLASS}>NCM</Label>
                    <Input id="ncm" value={productData.ncm} onChange={(e) => handleProductChange('ncm', e.target.value)} className={INPUT_CLASS} />
                 </div>
                 <div className="space-y-0.5 sm:col-span-3">
                    <Label htmlFor="cross" className={LABEL_CLASS}>Códigos Cruzados</Label>
                    <Input id="cross" value={productData.cross_codes} onChange={(e) => handleProductChange('cross_codes', e.target.value)} className={INPUT_CLASS} />
                 </div>
                 <div className="space-y-0.5 sm:col-span-3">
                    <Label htmlFor="obs" className={LABEL_CLASS}>Observação</Label>
                    <Textarea id="obs" value={productData.observations} onChange={(e) => handleProductChange('observations', e.target.value)} rows={2} className="min-h-[80px] p-3 sm:p-2" />
                 </div>
              </div>
              
              <div className="border rounded-lg overflow-hidden mt-6">
                    <div className="bg-gray-100 px-4 py-3 sm:py-2 border-b flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0">
                        <h4 className="font-semibold text-gray-700 text-sm flex items-center gap-2"><Layers className="w-4 h-4" /> Variantes Cadastradas</h4>
                        <Button size="sm" variant="default" onClick={openNewVariantModal} className={BUTTON_CLASS}><Plus className="w-4 h-4 mr-2" /> Adicionar Variante</Button>
                    </div>
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="whitespace-nowrap">Código Variante</TableHead>
                                    <TableHead>Marca</TableHead>
                                    <TableHead className="text-right">Estoque</TableHead>
                                    <TableHead className="text-right">Preço</TableHead>
                                    <TableHead className="text-right">Ações</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {variants.map((v, idx) => (
                                    <TableRow key={v.tempId || v.id || idx}>
                                        <TableCell className="font-medium whitespace-nowrap">{v.variant_code}</TableCell>
                                        <TableCell className="whitespace-nowrap">{v.brand || '-'}</TableCell>
                                        <TableCell className="text-right"><Badge variant={v.stock <= v.min_stock ? "destructive" : "outline"}>{v.stock}</Badge></TableCell>
                                        <TableCell className="text-right whitespace-nowrap">R$ {Number(v.sale_price).toFixed(2)}</TableCell>
                                        <TableCell className="text-right whitespace-nowrap">
                                            <Button variant="ghost" size="icon" onClick={() => openEditVariantModal(idx)}><Edit2 className="w-4 h-4 text-blue-600" /></Button>
                                            <Button variant="ghost" size="icon" onClick={() => handleDeleteVariantFromDB(idx)}><Trash2 className="w-4 h-4 text-red-600" /></Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {variants.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center py-8 text-gray-400 flex flex-col items-center">
                                            <AlertCircle className="w-8 h-8 mb-2 opacity-50" />
                                            <span className="text-xs">Nenhuma variante. Adicione pelo menos uma.</span>
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                    {Object.keys(errors).some(k => k.startsWith('variant_')) && <p className="text-xs text-red-500 p-2 text-center bg-red-50">Existem erros nas variantes.</p>}
              </div>
          </div>
      );
  };

  return (
    <>
    <style>{`
        /* Hide delete button when displayed inside SelectTrigger/SelectValue */
        [data-radix-select-trigger] .delete-btn { display: none !important; }
        
        /* Ensure delete button is visible on hover inside content items */
        .select-item-container { position: relative; } /* Ensure proper positioning context for absolute X */
        .select-item-container .delete-btn { 
            opacity: 0; 
            transition: opacity 0.2s; 
            z-index: 50; /* Ensure it's above other elements if any */
        }
        .select-item-container:hover .delete-btn { opacity: 1; }
        .select-item-container:active .delete-btn { opacity: 1; } /* Fallback for touch/active state */
    `}</style>

    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-full h-full max-w-none rounded-none sm:rounded-lg sm:w-3/4 md:w-full md:h-full md:max-h-none lg:w-full lg:h-full lg:max-w-none flex flex-col p-0 gap-0 bg-white">
        <DialogHeader className="p-4 sm:p-6 border-b bg-white flex-none">
          <DialogTitle className="text-lg sm:text-xl font-bold">{product ? 'Editar Produto' : 'Novo Produto'}</DialogTitle>
          <DialogDescription className="text-sm">Preencha os dados conforme o tipo do produto.</DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
             <div className="bg-gray-50 p-4 rounded-lg border">
                <Label className="text-sm font-semibold mb-3 block text-gray-700">Tipo de Produto</Label>
                <RadioGroup 
                    defaultValue={PRODUCT_TYPES.SIMPLES} 
                    value={productType} 
                    onValueChange={(val) => {
                        setProductType(val);
                        if (val === PRODUCT_TYPES.SIMPLES) setVariants([createEmptyVariant()]);
                        else if (variants.length === 0) setVariants([]);
                        setErrors({});
                    }} 
                    className="flex flex-col sm:flex-row gap-3 sm:gap-6"
                >
                    <div className="flex items-center space-x-3 border p-3 rounded-md bg-white w-full cursor-pointer hover:border-blue-500 transition-colors shadow-sm">
                        <RadioGroupItem value={PRODUCT_TYPES.SIMPLES} id="r-simples" />
                        <Label htmlFor="r-simples" className="flex items-center cursor-pointer w-full">
                            <Box className="w-5 h-5 mr-3 text-blue-600" />
                            <div>
                                <span className="font-semibold block text-sm">Produto Simples</span>
                                <span className="text-xs text-gray-500 font-normal">Item único (Ex: Peça específica)</span>
                            </div>
                        </Label>
                    </div>
                    <div className="flex items-center space-x-3 border p-3 rounded-md bg-white w-full cursor-pointer hover:border-blue-500 transition-colors shadow-sm">
                        <RadioGroupItem value={PRODUCT_TYPES.MESTRE} id="r-mestre" />
                        <Label htmlFor="r-mestre" className="flex items-center cursor-pointer w-full">
                            <Layers className="w-5 h-5 mr-3 text-purple-600" />
                            <div>
                                <span className="font-semibold block text-sm">Produto Mestre</span>
                                <span className="text-xs text-gray-500 font-normal">Agrupador de variantes (Ex: Óleo)</span>
                            </div>
                        </Label>
                    </div>
                </RadioGroup>
             </div>

             {productType === PRODUCT_TYPES.SIMPLES ? renderSimplesForm() : renderMestreForm()}
        </div>

        <DialogFooter className="p-4 sm:p-6 border-t bg-white flex-none flex-col-reverse sm:flex-row gap-3 sm:gap-2">
            <Button variant="outline" onClick={onClose} disabled={loading} className={BUTTON_CLASS}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={loading} className={BUTTON_CLASS}>{loading ? 'Salvando...' : 'Salvar Produto'}</Button>
        </DialogFooter>

        <Dialog open={isVariantModalOpen} onOpenChange={setIsVariantModalOpen}>
            <DialogContent className="w-full h-full max-w-none rounded-none sm:rounded-lg sm:w-3/4 md:w-full md:h-full md:max-h-none lg:w-full lg:h-full lg:max-w-none flex flex-col p-0 gap-0 bg-white">
                <DialogHeader className="p-4 sm:p-6 border-b bg-white flex-none">
                    <DialogTitle>{editingVariantIndex !== null ? 'Editar Variante' : 'Nova Variante'}</DialogTitle>
                </DialogHeader>
                
                <div className="flex-1 overflow-y-auto p-4 sm:p-6">
                    <VariantFormFields 
                        variant={currentVariantData} 
                        onChange={(field, value) => setCurrentVariantData(prev => ({ ...prev, [field]: value }))} 
                        masterUnit={productData.unit_of_measure}
                        errors={editingVariantIndex !== null ? {
                            barcode: errors[`variant_${editingVariantIndex}_barcode`],
                            variant_code: errors[`variant_${editingVariantIndex}_code`]
                        } : {}}
                    />
                </div>
                
                <DialogFooter className="p-4 sm:p-6 border-t bg-white flex-none flex-col-reverse sm:flex-row gap-3 sm:gap-2">
                    <Button variant="outline" onClick={() => setIsVariantModalOpen(false)} className={BUTTON_CLASS}>Cancelar</Button>
                    <Button onClick={handleVariantModalSave} className={BUTTON_CLASS}>Confirmar Variante</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>

    <CategoriaProdutoDialog
        isOpen={isCatModalOpen}
        onClose={() => setIsCatModalOpen(false)}
        onSave={handleNewCategory}
    />

    <SubcategoriaProdutoDialog
        isOpen={isSubCatModalOpen}
        onClose={() => setIsSubCatModalOpen(false)}
        onSave={handleNewSubcategory}
        categoriaId={productData.product_category_id}
    />

    {/* Delete Confirmation Alert */}
    <AlertDialog open={deleteConfirmation.isOpen} onOpenChange={(open) => !open && setDeleteConfirmation({isOpen: false, id: null, type: null, name: ''})}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Excluir {deleteConfirmation.type === 'category' ? 'Categoria' : 'Subcategoria'}</AlertDialogTitle>
                <AlertDialogDescription>
                    Tem certeza que deseja excluir permanentemente <strong>"{deleteConfirmation.name}"</strong>?
                    <br/><br/>
                    <span className="text-red-600 font-semibold">Atenção:</span> Esta ação não pode ser desfeita e falhará se o item estiver em uso em algum produto.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={executeDelete} className="bg-red-600 hover:bg-red-700">
                    Excluir Permanentemente
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
    </>
  );
};

export default ProdutoDialog;