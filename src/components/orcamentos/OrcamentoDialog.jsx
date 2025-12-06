
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { supabase } from '@/lib/customSupabaseClient';
import { Search, Eye, EyeOff, Lock, CheckSquare, Camera, Plus, Trash2, Upload, Loader2, Image as ImageIcon, Share2, Copy, Check } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { v4 as uuidv4 } from 'uuid';
import BudgetItemSection from '@/components/dialogs/BudgetItemSection'; 
import { BUDGET_STATUS } from '@/lib/constants';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { compressImage } from '@/lib/utils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const OrcamentoDialog = ({ isOpen, onClose, onSave, budget }) => {
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
  const [activeTab, setActiveTab] = useState('itens');

  // New States for Checklist and Photos
  const [checklist, setChecklist] = useState([]);
  const [newChecklistTask, setNewChecklistTask] = useState('');
  const [photos, setPhotos] = useState([]);
  const [uploading, setUploading] = useState(false);

  // Share Link State
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [generatedLink, setGeneratedLink] = useState('');
  const [isCopied, setIsCopied] = useState(false);

  const isReadOnly = useMemo(() => budget?.status === BUDGET_STATUS.CONVERTED, [budget]);

  // Responsive classes
  const INPUT_CLASS = "h-11 sm:h-9 text-base sm:text-sm";
  const BUTTON_CLASS = "w-full sm:w-auto h-11 sm:h-9 px-6 sm:px-4 text-base sm:text-sm";
  const LABEL_CLASS = "text-base sm:text-sm font-medium";

  const loadInitialData = useCallback(async () => {
    try {
        // Load Products with Variants
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

        // Load Services
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

        // Load Collaborators
        const { data: collaboratorsData, error: collaboratorsError } = await supabase.from('collaborators').select('id, name').order('name');
        if (collaboratorsError) throw collaboratorsError;
        setCollaborators(collaboratorsData || []);

    } catch (error) {
        console.error("Initialization Error:", error);
        toast({ title: "Erro ao carregar dados iniciais", description: `Falha na comunicação: ${error.message}`, variant: "destructive" });
    }
  }, [toast]);

  const loadBudgetData = useCallback(async (budgetId) => {
    if (!budgetId) { 
        setItems([]); 
        setChecklist([]);
        setPhotos([]);
        return; 
    }
    try {
        // Items
        const { data: itemsData } = await supabase
            .from('budget_items')
            .select('*, product_variant:product_variants(*, product:products(description))') 
            .eq('budget_id', budgetId);
        
        const loadedItems = (itemsData || []).map(item => ({
            ...item, 
            client_id: uuidv4(),
            isNew: false, 
            description: item.description, 
            product_variant_id: item.product_variant_id,
            cost_price: item.cost_price || (item.product_variant ? item.product_variant.cost_price : 0)
        }));
        setItems(loadedItems);

        // Checklist
        const { data: checklistData } = await supabase
            .from('budget_checklists')
            .select('*')
            .eq('budget_id', budgetId)
            .order('created_at');
        setChecklist(checklistData || []);

        // Photos
        const { data: photosData } = await supabase
            .from('budget_photos')
            .select('*')
            .eq('budget_id', budgetId)
            .order('uploaded_at');
        setPhotos(photosData || []);

    } catch(error) {
        console.error("Load Budget Data Error:", error);
        toast({ title: 'Erro ao carregar dados do orçamento', description: error.message, variant: 'destructive' });
    }
  }, [toast]);

  useEffect(() => {
    if (isOpen) {
      loadInitialData();
      setShowCosts(false);
      setActiveTab('itens');
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
        loadBudgetData(budget.id);
      } else {
        setFormData(emptyForm);
        setItems([]);
        setChecklist([]);
        setPhotos([]);
        setPlate('');
      }
    }
  }, [budget, isOpen, loadInitialData, loadBudgetData]);
  
  // --- HANDLERS ---

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
    // Initialize cost_price as '' to trigger validation if not filled
    setItems(items => [...items, { id: uuidv4(), client_id: uuidv4(), isNew: true, budget_id: formData.id || null, item_type: itemType, description: '', quantity: 1, unit_price: 0, cost_price: '', product_variant_id: null, collaborator_id: null, sku: '' }]);
  };

  const removeItem = (client_id) => {
    if (isReadOnly) return;
    setItems(items => items.filter(item => item.client_id !== client_id));
  };

  // Checklist Handlers
  const addChecklistItem = () => {
    if (!newChecklistTask.trim()) return;
    const newItem = { id: uuidv4(), task: newChecklistTask, is_completed: false };
    setChecklist([...checklist, newItem]);
    setNewChecklistTask('');
  };

  const removeChecklistItem = (id) => {
    setChecklist(checklist.filter(item => item.id !== id));
  };

  const toggleChecklistItem = (id) => {
      setChecklist(checklist.map(item => item.id === id ? {...item, is_completed: !item.is_completed} : item));
  };

  // Photo Handlers
  const handlePhotoUpload = async (e) => {
    if (!e.target.files || e.target.files.length === 0) return;
    setUploading(true);
    
    try {
        const originalFile = e.target.files[0];
        // Compress the image before uploading
        const compressedFile = await compressImage(originalFile);

        const fileExt = compressedFile.name.split('.').pop();
        const fileName = `${uuidv4()}.${fileExt}`;
        const filePath = `orcamentos/${fileName}`;

        const { error: uploadError } = await supabase.storage
            .from('work-order-photos')
            .upload(filePath, compressedFile);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
            .from('work-order-photos')
            .getPublicUrl(filePath);

        const newPhoto = { id: uuidv4(), photo_url: publicUrl, photo_type: 'general' };
        setPhotos([...photos, newPhoto]);
        toast({ title: "Foto enviada com sucesso!" });
    } catch (error) {
        console.error('Upload Error:', error);
        let errorMessage = error.message;
        if (error.message.includes("The object exceeded the maximum allowed size")) {
            errorMessage = "A imagem é muito grande mesmo após a compressão. Tente uma imagem menor.";
        }
        toast({ title: "Erro no upload", description: errorMessage, variant: "destructive" });
    } finally {
        setUploading(false);
        // Reset file input
        if (e.target) e.target.value = '';
    }
  };

  const removePhoto = (id) => {
      setPhotos(photos.filter(p => p.id !== id));
  };

  const handleGenerateLink = async () => {
    if (!formData.id || !formData.customer_id) {
        toast({ title: "Atenção", description: "Salve o orçamento primeiro para gerar o link.", variant: "warning" });
        return;
    }
    
    setIsSaving(true); // Reuse saving loader state for feedback
    try {
        const token = uuidv4();
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 30); // 30 days validity

        const { error } = await supabase
          .from('client_access_tokens')
          .insert({
              customer_id: formData.customer_id,
              token: token,
              expires_at: expiresAt.toISOString(),
              is_active: true
          });

        if (error) throw error;

        // MODIFIED: Link now includes open_budget query param
        const link = `${window.location.origin}/portal/${token}?open_budget=${formData.id}`;
        setGeneratedLink(link);
        setShowShareDialog(true);
        setIsCopied(false);
        
    } catch (error) {
        console.error("Generate Link Error:", error);
        toast({ title: "Erro ao gerar link", description: error.message, variant: "destructive" });
    } finally {
        setIsSaving(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedLink);
    setIsCopied(true);
    toast({ title: "Copiado!", description: "Link copiado para a área de transferência." });
    setTimeout(() => setIsCopied(false), 2000);
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

    // --- MANDATORY FIELD VALIDATION ---
    
    // 1. Validate Collaborator for Services
    const missingCollaborator = items.some(i => i.item_type === 'service' && !i.collaborator_id);
    if (missingCollaborator) {
         toast({ title: 'Colaborador obrigatório', description: 'Selecione um colaborador responsável para todos os serviços internos.', variant: 'destructive' });
         return;
    }

    // 2. Validate Cost Price for Products and External Services
    // We check for empty string, null, or undefined. We allow 0 if explicitly set (though usually items have cost > 0).
    const missingCostProduct = items.some(i => i.item_type === 'product' && (i.cost_price === '' || i.cost_price === null || i.cost_price === undefined));
    const missingCostExternal = items.some(i => i.item_type === 'external_service' && (i.cost_price === '' || i.cost_price === null || i.cost_price === undefined));
    
    if (missingCostProduct || missingCostExternal) {
        setShowCosts(true); // Auto-show costs so user can see what is missing
        toast({ title: 'Preço de custo obrigatório', description: 'Preencha o preço de custo para todos os produtos e serviços externos.', variant: 'destructive' });
        return;
    }
    
    // --------------------------------

    setIsSaving(true);
    
    try {
        // 1. Save Budget Header
        const dbPayload = { customer_id: formData.customer_id, vehicle_id: formData.vehicle_id, status: formData.status, total_cost: totalCost, customer_name: formData.customer_name, vehicle_description: formData.vehicle_description, km: formData.km ? parseInt(formData.km, 10) : null };
        const { data: budgetResponse, error: budgetError } = formData.id
          ? await supabase.from('budgets').update(dbPayload).eq('id', formData.id).select().single()
          : await supabase.from('budgets').insert(dbPayload).select().single();

        if (budgetError) throw budgetError;
        const budgetId = budgetResponse.id;
        
        // Update form data with new ID if it was a new budget
        if (!formData.id) {
            setFormData(prev => ({ ...prev, id: budgetId }));
        }

        // 2. Save Items
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

        // -- Sync items logic (delete removed, insert new/updated)
        const { data: existingItemsData } = await supabase.from('budget_items').select('id').eq('budget_id', budgetId);
        const existingItems = existingItemsData || [];
        const itemsToDelete = existingItems.filter(e => !items.some(i => i.id === e.id)).map(e => e.id);
        
        if (itemsToDelete.length > 0) await supabase.from('budget_items').delete().in('id', itemsToDelete);
        if (itemsToUpsert.length > 0) await supabase.from('budget_items').upsert(itemsToUpsert, { onConflict: 'id' });

        // 3. Save Checklist (Full replacement for simplicity or sync)
        // To be safe with sync, we delete all for this budget and re-insert
        await supabase.from('budget_checklists').delete().eq('budget_id', budgetId);
        if (checklist.length > 0) {
             const checklistPayload = checklist.map(c => ({
                 budget_id: budgetId,
                 task: c.task,
                 is_completed: c.is_completed
             }));
             await supabase.from('budget_checklists').insert(checklistPayload);
        }

        // 4. Save Photos (Full replacement logic)
        await supabase.from('budget_photos').delete().eq('budget_id', budgetId);
        if (photos.length > 0) {
            const photosPayload = photos.map(p => ({
                budget_id: budgetId,
                photo_url: p.photo_url,
                photo_type: p.photo_type || 'general'
            }));
            await supabase.from('budget_photos').insert(photosPayload);
        }

        onSave(); 
        // onClose(); // REMOVED: Keep dialog open
        toast({ title: `Orçamento ${formData.id ? 'atualizado' : 'salvo'}!`, description: "As alterações foram salvas com sucesso." });
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
        
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
            <div className="space-y-4 mb-6">
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

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="w-full justify-start border-b rounded-none h-auto p-0 bg-transparent space-x-6">
                    <TabsTrigger value="itens" className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 px-4 py-2">
                        Itens e Serviços
                    </TabsTrigger>
                    <TabsTrigger value="checklist" className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 px-4 py-2 flex items-center gap-2">
                        <CheckSquare className="w-4 h-4"/> Checklist
                        <span className="ml-1 bg-gray-100 text-gray-600 text-xs rounded-full px-2 py-0.5">{checklist.length}</span>
                    </TabsTrigger>
                    <TabsTrigger value="fotos" className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 px-4 py-2 flex items-center gap-2">
                        <Camera className="w-4 h-4"/> Fotos
                        <span className="ml-1 bg-gray-100 text-gray-600 text-xs rounded-full px-2 py-0.5">{photos.length}</span>
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="itens" className="space-y-6 pt-4">
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
                </TabsContent>

                <TabsContent value="checklist" className="pt-4 space-y-4">
                    <div className="flex gap-2">
                        <Input 
                            placeholder="Adicionar item ao checklist..." 
                            value={newChecklistTask}
                            onChange={(e) => setNewChecklistTask(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && addChecklistItem()}
                            disabled={isReadOnly}
                        />
                        <Button onClick={addChecklistItem} disabled={isReadOnly || !newChecklistTask.trim()}>
                            <Plus className="w-4 h-4 mr-2" /> Adicionar
                        </Button>
                    </div>
                    
                    <div className="space-y-2 bg-gray-50 p-4 rounded-lg border min-h-[200px]">
                        {checklist.length === 0 ? (
                            <p className="text-center text-gray-400 py-8">Nenhum item no checklist.</p>
                        ) : (
                            checklist.map((item, index) => (
                                <div key={item.id || index} className="flex items-center justify-between bg-white p-3 rounded border shadow-sm">
                                    <div className="flex items-center gap-3">
                                        <button 
                                            type="button"
                                            onClick={() => !isReadOnly && toggleChecklistItem(item.id)}
                                            className={`w-5 h-5 rounded border flex items-center justify-center ${item.is_completed ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300'}`}
                                            disabled={isReadOnly}
                                        >
                                            {item.is_completed && <CheckSquare className="w-3.5 h-3.5" />}
                                        </button>
                                        <span className={item.is_completed ? 'line-through text-gray-400' : ''}>{item.task}</span>
                                    </div>
                                    {!isReadOnly && (
                                        <Button variant="ghost" size="icon" onClick={() => removeChecklistItem(item.id)} className="h-8 w-8 text-red-500 hover:bg-red-50">
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </TabsContent>

                <TabsContent value="fotos" className="pt-4 space-y-4">
                    <div className="flex justify-between items-center">
                         <h3 className="font-medium">Fotos do Orçamento</h3>
                         <div className="relative">
                            <input 
                                type="file" 
                                id="photo-upload" 
                                className="hidden" 
                                accept="image/*" 
                                onChange={handlePhotoUpload}
                                disabled={isReadOnly || uploading}
                            />
                            <Label htmlFor="photo-upload" className={`cursor-pointer inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-4 py-2 ${isReadOnly || uploading ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                {uploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                                Upload Foto
                            </Label>
                         </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 min-h-[200px]">
                        {photos.length === 0 ? (
                             <div className="col-span-full flex flex-col items-center justify-center text-gray-400 border-2 border-dashed border-gray-200 rounded-lg py-12">
                                <ImageIcon className="w-12 h-12 mb-2 opacity-20" />
                                <p>Nenhuma foto adicionada.</p>
                             </div>
                        ) : (
                            photos.map((photo, index) => (
                                <div key={photo.id || index} className="relative group rounded-lg overflow-hidden border aspect-square bg-gray-100">
                                    <img src={photo.photo_url} alt="Budget Attachment" className="w-full h-full object-cover" />
                                    {!isReadOnly && (
                                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                            <Button variant="destructive" size="icon" onClick={() => removePhoto(photo.id)}>
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </TabsContent>
            </Tabs>

            <div className="pt-4 border-t mt-6">
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
                <>
                    {formData.id && (
                        <Button type="button" variant="secondary" onClick={handleGenerateLink} className={BUTTON_CLASS} disabled={isSaving}>
                            <Share2 className="w-4 h-4 mr-2" /> Enviar ao Cliente
                        </Button>
                    )}
                    <Button type="submit" onClick={handleSubmit} disabled={isSaving} className={BUTTON_CLASS}>
                        {isSaving ? 'Salvando...' : 'Salvar'}
                    </Button>
                </>
            )}
        </DialogFooter>
      </DialogContent>

      <AlertDialog open={showShareDialog} onOpenChange={setShowShareDialog}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2">
                    <Share2 className="w-5 h-5 text-blue-600" /> 
                    Link do Portal do Cliente
                </AlertDialogTitle>
                <AlertDialogDescription>
                    Compartilhe este link com o cliente para que ele possa visualizar o orçamento, fotos e histórico online.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="py-4">
                <Label className="mb-2 block">Link de Acesso Único</Label>
                <div className="flex items-center gap-2">
                    <a href={generatedLink} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 underline flex-1 p-2 border rounded-md bg-gray-50 text-center">
                        Visualize aqui seu orçamento
                    </a>
                    <Button size="icon" onClick={copyToClipboard} variant={isCopied ? "success" : "outline"}>
                        {isCopied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                    </Button>
                </div>
                <p className="text-xs text-gray-500 mt-2">Este link é válido por 30 dias.</p>
            </div>
            <AlertDialogFooter>
                <AlertDialogAction onClick={() => setShowShareDialog(false)}>Concluído</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
};

export default OrcamentoDialog;
