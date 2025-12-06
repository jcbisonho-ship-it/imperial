import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { supabase } from '@/lib/customSupabaseClient';
import { Search, Eye, EyeOff, Lock } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { v4 as uuidv4 } from 'uuid';
import BudgetItemSection from './BudgetItemSection';
import { BUDGET_STATUS } from '@/lib/constants';

const BudgetDialog = ({ isOpen, onClose, onSave, budget }) => {
  const emptyForm = { customer_id: '', vehicle_id: '', customer_name: '', vehicle_description: '', status: BUDGET_STATUS.QUOTED, km: '' };
  const [formData, setFormData] = useState(emptyForm);
  const [items, setItems] = useState([]);
  const [plate, setPlate] = useState('');
  const [products, setProducts] = useState([]);
  const [services, setServices] = useState([]);
  const [collaborators, setCollaborators] = useState([]);
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [newItemFocusType, setNewItemFocusType] = useState(null);
  const [showCosts, setShowCosts] = useState(false);

  const isReadOnly = useMemo(() => budget?.status === BUDGET_STATUS.CONVERTED, [budget]);

  const INPUT_CLASS = "h-11 sm:h-9 text-base sm:text-sm";
  const BUTTON_CLASS = "w-full sm:w-auto h-11 sm:h-9 px-6 sm:px-4 text-base sm:text-sm";
  const LABEL_CLASS = "text-base sm:text-sm font-medium";

  const loadInitialData = useCallback(async () => {
    try {
        const { data: productsData, error: productsError } = await supabase.rpc('get_products_with_variants');
        if (productsError) throw productsError;
        
        const allVariants = (productsData || []).flatMap(p => 
            (p.variants || []).map(v => ({
                id: v.id, 
                label: p.description, 
                application: p.aplicacao, 
                brand: v.brand,
                variant_code: v.variant_code,
                cost_price: v.cost_price,
                unit_price: v.sale_price, 
                price: v.sale_price,
                product_variant_id: v.id,
                sku: v.variant_code
            }))
        ).sort((a, b) => a.label.localeCompare(b.label));
        setProducts(allVariants);

        const { data: servicesData, error: servicesError } = await supabase.from('servicos').select('*').order('nome');
        if (servicesError) throw servicesError;
        
        const allServices = (servicesData || []).map(s => ({
            id: s.id,
            label: s.descricao_servico || s.nome,
            application: s.descricao_veiculo,
            cost_price: 0,
            unit_price: s.valor_referencia || 0,
            price: s.valor_referencia || 0
        })).sort((a, b) => a.label.localeCompare(b.label));
        setServices(allServices);

        const { data: collaboratorsData, error: collaboratorsError } = await supabase.from('collaborators').select('id, name').order('name');
        if (collaboratorsError) throw collaboratorsError;
        setCollaborators(collaboratorsData || []);

    } catch (error) {
        console.error("Initialization Error:", error);
        toast({ title: "Erro ao carregar dados iniciais", description: `Falha na comunicação: ${error.message}`, variant: "destructive" });
    }
  }, [toast]);

  const loadBudgetItems = useCallback(async (budgetId) => {
    if (!budgetId) { setItems([]); return; }
    try {
        const { data, error } = await supabase
            .from('budget_items')
            .select('*, product_variant:product_variants(*, product:products(description))') 
            .eq('budget_id', budgetId);
        if (error) throw error;
        
        const loadedItems = (data || []).map(item => ({
            ...item, 
            client_id: uuidv4(),
            isNew: false, 
            description: item.description, 
            product_variant_id: item.product_variant_id,
            cost_price: item.cost_price || (item.product_variant ? item.product_variant.cost_price : 0)
        }));
        setItems(loadedItems);
    } catch(error) {
        console.error("Load Budget Items Error:", error);
        toast({ title: 'Erro ao carregar itens do orçamento', description: error.message, variant: 'destructive' });
        setItems([]);
    }
  }, [toast]);

  useEffect(() => {
    if (isOpen) {
      loadInitialData();
      setShowCosts(false);
      if (budget) {
        setFormData({
          id: budget.id, customer_id: budget.customer_id || '', vehicle_id: budget.vehicle_id || '',
          customer_name: budget.customer_name || '', vehicle_description: budget.vehicle_description || '',
          status: budget.status || BUDGET_STATUS.QUOTED, km: budget.km || '',
        });
        if (budget.vehicle_id) {
          supabase.from('vehicles').select('plate').eq('id', budget.vehicle_id).single().then(({ data }) => setPlate(data?.plate || ''));
        } else {
            setPlate('');
        }
        loadBudgetItems(budget.id);
      } else {
        setFormData(emptyForm);
        setItems([]);
        setPlate('');
      }
    }
  }, [budget, isOpen, loadInitialData, loadBudgetItems]);
  
  const handlePlateLookup = async () => {
    if (!plate || isReadOnly) return;
    try {
        const { data, error } = await supabase.rpc('get_vehicle_summary', { p_search_term: plate.toUpperCase() }).limit(1).single();
        if (error || !data) {
          toast({ title: "Veículo não encontrado", description: "Verifique a placa ou cadastre o veículo primeiro.", variant: "destructive" });
          setFormData(prev => ({ ...prev, vehicle_id: '', customer_id: '', customer_name: '', vehicle_description: '' }));
          return;
        }
        setFormData(prev => ({ ...prev, customer_id: data.customer_id, vehicle_id: data.id, customer_name: data.customer_name, vehicle_description: `${data.brand} ${data.model} (${data.year})` }));
        toast({ title: "Veículo encontrado!" });
    } catch(error) {
        console.error("Plate Lookup Error:", error);
        toast({ title: "Erro na busca", description: error.message, variant: "destructive" });
    }
  };

  const updateItem = (client_id, updatedFields) => {
    if (isReadOnly) return;
    setItems(items => items.map(item => item.client_id === client_id ? { ...item, ...updatedFields } : item));
  };

  const addNewItem = (itemType) => {
    if (isReadOnly) return;
    setNewItemFocusType(itemType);
    setItems(items => [...items, { id: uuidv4(), client_id: uuidv4(), isNew: true, budget_id: formData.id || null, item_type: itemType, description: '', quantity: 1, unit_price: 0, cost_price: 0, product_variant_id: null, collaborator_id: null, sku: '' }]);
  };

  const removeItem = (client_id) => {
    if (isReadOnly) return;
    setItems(items => items.filter(item => item.client_id !== client_id));
  };
  
  const { totalCost, totalItemProfit, itemProfitMargin } = useMemo(() => {
    const totalCost = items.reduce((acc, item) => acc + (Number(item.quantity) || 0) * (Number(item.unit_price) || 0), 0);
    const itemsWithCost = items.filter(i => i.item_type === 'product' || i.item_type === 'external_service');
    const totalSale = itemsWithCost.reduce((acc, item) => acc + (Number(item.quantity) || 0) * (Number(item.unit_price) || 0), 0);
    const totalBaseCost = itemsWithCost.reduce((acc, item) => acc + (Number(item.quantity) || 0) * (Number(item.cost_price) || 0), 0);
    const internalServicesSale = items.filter(i => i.item_type === 'service').reduce((acc, item) => acc + (Number(item.quantity) || 0) * (Number(item.unit_price) || 0), 0);
    const totalItemProfit = (totalSale - totalBaseCost) + internalServicesSale;
    const itemProfitMargin = totalCost > 0 ? (totalItemProfit / totalCost) * 100 : 0;
    return { totalCost, totalItemProfit, itemProfitMargin };
  }, [items]);

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (isReadOnly) return;
    if (!formData.vehicle_id) {
      toast({ title: 'Veículo não selecionado', description: 'Por favor, busque e selecione um veículo válido.', variant: 'destructive' });
      return;
    }
    setIsSaving(true);
    
    try {
        const dbPayload = { customer_id: formData.customer_id, vehicle_id: formData.vehicle_id, status: formData.status, total_cost: totalCost, customer_name: formData.customer_name, vehicle_description: formData.vehicle_description, km: formData.km ? parseInt(formData.km, 10) : null };
        const { data: budgetResponse, error: budgetError } = formData.id
          ? await supabase.from('budgets').update(dbPayload).eq('id', formData.id).select().single()
          : await supabase.from('budgets').insert(dbPayload).select().single();

        if (budgetError) throw budgetError;
        
        const budgetId = budgetResponse.id;
        
        const itemsToUpsert = items.map(({ client_id, isNew, sku, product_variant, total_price, ...rest }) => ({
            ...rest, 
            id: rest.id, 
            budget_id: budgetId,
            product_variant_id: rest.product_variant_id || null,
            collaborator_id: rest.collaborator_id || null,
            // Fix: Ensure numeric fields are numbers, not empty strings
            quantity: (rest.quantity === '' || rest.quantity === null || rest.quantity === undefined) ? 0 : Number(rest.quantity),
            unit_price: (rest.unit_price === '' || rest.unit_price === null || rest.unit_price === undefined) ? 0 : Number(rest.unit_price),
            cost_price: (rest.cost_price === '' || rest.cost_price === null || rest.cost_price === undefined) ? 0 : Number(rest.cost_price),
        }));

        const { data: existingItemsData, error: existingItemsError } = await supabase.from('budget_items').select('id').eq('budget_id', budgetId);
        if (existingItemsError) throw existingItemsError;

        const existingItems = existingItemsData || [];
        const itemsToDelete = existingItems.filter(e => !items.some(i => i.id === e.id)).map(e => e.id);

        if (itemsToDelete.length > 0) {
            const { error: deleteError } = await supabase.from('budget_items').delete().in('id', itemsToDelete);
            if(deleteError) throw deleteError;
        }

        if (itemsToUpsert.length > 0) {
          const { error: itemsError } = await supabase.from('budget_items').upsert(itemsToUpsert, { onConflict: 'id' });
          if (itemsError) throw itemsError;
        }

        onSave(); 
        onClose();
        toast({ title: `Orçamento ${formData.id ? 'atualizado' : 'criado'}!`, description: "A operação foi concluída com sucesso." });
    } catch(error) {
        console.error("Submit Error:", error);
        toast({ title: 'Erro ao salvar orçamento', description: error.message, variant: 'destructive' });
    } finally {
        setIsSaving(false);
    }
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-full h-full max-w-none sm:max-w-4xl md:max-w-6xl lg:max-w-screen-lg xl:max-w-screen-xl rounded-none sm:rounded-lg flex flex-col p-0 gap-0 bg-white">
        <DialogHeader className="p-4 sm:p-6 border-b flex-none">
            <div className="flex justify-between items-start">
                <div>
                    <DialogTitle className="text-lg sm:text-xl flex items-center gap-2">
                        {budget ? 'Editar Orçamento' : 'Novo Orçamento'}
                        {isReadOnly && <span className="text-sm font-normal text-blue-600 bg-blue-50 px-2 py-1 rounded-full flex items-center gap-1"><Lock className="w-3 h-3"/> Somente Leitura (Convertido)</span>}
                    </DialogTitle>
                    <DialogDescription className="text-base sm:text-sm">Preencha os dados para criar ou editar um orçamento.</DialogDescription>
                </div>
            </div>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-end">
              <div>
                <Label htmlFor="plate" className={LABEL_CLASS}>Placa do Veículo</Label>
                <div className="flex gap-2">
                  <Input id="plate" value={plate} onChange={e => setPlate(e.target.value.toUpperCase())} placeholder="ABC1234" disabled={isReadOnly} className={INPUT_CLASS} />
                  <Button type="button" onClick={handlePlateLookup} disabled={isReadOnly} className={BUTTON_CLASS}><Search className="w-4 h-4 mr-2" /> Buscar</Button>
                </div>
              </div>
              <div>
                <Label htmlFor="km" className={LABEL_CLASS}>KM</Label>
                <Input id="km" type="number" placeholder="Ex: 50000" value={formData.km} onChange={e => setFormData({...formData, km: e.target.value})} disabled={isReadOnly} className={INPUT_CLASS} />
              </div>
              {formData.vehicle_id && (
                <div className="lg:col-span-1 p-3 bg-blue-50 rounded-lg border border-blue-200 text-sm">
                  <p><strong>Cliente:</strong> {formData.customer_name}</p>
                  <p><strong>Veículo:</strong> {formData.vehicle_description}</p>
                </div>
              )}
            </div>
          </div>
          
          <div className="space-y-6">
            <BudgetItemSection 
              title="Peças" 
              itemType="product" 
              items={items.filter(i => i.item_type === 'product')} 
              updateItem={updateItem} 
              addNewItem={() => addNewItem('product')} 
              removeItem={removeItem} 
              products={products}
              services={services} 
              collaborators={[]} 
              focusOnNewItem={newItemFocusType === 'product'} 
              onNewItemFocused={() => setNewItemFocusType(null)} 
              showCosts={showCosts} 
              readOnly={isReadOnly} 
            />
            <BudgetItemSection 
              title="Serviços Internos" 
              itemType="service" 
              items={items.filter(i => i.item_type === 'service')} 
              updateItem={updateItem} 
              addNewItem={() => addNewItem('service')} 
              removeItem={removeItem} 
              products={[]} 
              services={services}
              collaborators={collaborators} 
              focusOnNewItem={newItemFocusType === 'service'} 
              onNewItemFocused={() => setNewItemFocusType(null)} 
              showCosts={showCosts} 
              readOnly={isReadOnly} 
            />
            <BudgetItemSection 
              title="Serviços de Terceiros" 
              itemType="external_service" 
              items={items.filter(i => i.item_type === 'external_service')} 
              updateItem={updateItem} 
              addNewItem={() => addNewItem('external_service')} 
              removeItem={removeItem} 
              products={[]} 
              services={services} 
              collaborators={[]} 
              focusOnNewItem={newItemFocusType === 'external_service'} 
              onNewItemFocused={() => setNewItemFocusType(null)} 
              showCosts={showCosts} 
              readOnly={isReadOnly} 
            />
          </div>
          
          <div className="pt-4 border-t space-y-2">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-6">
                <Button type="button" variant="outline" size="sm" onClick={() => setShowCosts(!showCosts)} className={`${BUTTON_CLASS} w-full sm:w-auto`}>
                    {showCosts ? <EyeOff className="w-4 h-4 mr-2" /> : <Eye className="w-4 h-4 mr-2" />}
                    {showCosts ? 'Ocultar Custos' : 'Exibir Custos'}
                </Button>
                <div className="flex items-center gap-6 w-full sm:w-auto justify-end">
                    {showCosts && (
                        <div className="text-right">
                            <span className="text-sm text-gray-500">Lucro Itens</span>
                            <p className="font-bold text-green-600">R$ {totalItemProfit.toFixed(2)} ({itemProfitMargin.toFixed(2)}%)</p>
                        </div>
                    )}
                    <div className="text-right">
                        <span className="text-sm text-gray-500">Total Geral</span>
                        <p className="font-bold text-2xl text-gray-800">R$ {totalCost.toFixed(2)}</p>
                    </div>
                </div>
            </div>
          </div>
        </div>
        
        <DialogFooter className="p-4 sm:p-6 border-t flex-none flex-col-reverse sm:flex-row gap-3 sm:gap-2 bg-gray-50 sm:bg-white">
            <Button type="button" variant="outline" onClick={onClose} className={BUTTON_CLASS}>
                {isReadOnly ? 'Fechar' : 'Cancelar'}
            </Button>
            {!isReadOnly && (
                <Button type="submit" onClick={handleSubmit} disabled={isSaving} className={BUTTON_CLASS}>
                    {isSaving ? 'Salvando...' : 'Salvar Orçamento'}
                </Button>
            )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default BudgetDialog;