import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { List, CheckSquare, Camera, History, Loader2, Upload, Trash2 } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { OS_STATUS_MAP } from '@/lib/constants';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { compressImage } from '@/lib/utils';
import { v4 as uuidv4 } from 'uuid';

const OSViewer = ({ osId }) => {
    const [order, setOrder] = useState(null);
    const [items, setItems] = useState([]);
    const [checklists, setChecklists] = useState([]);
    const [photos, setPhotos] = useState([]);
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const { toast } = useToast();

    const fetchData = useCallback(async () => {
        if (!osId) return;
        setLoading(true);
        try {
            const { data: orderData, error: orderError } = await supabase
                .from('service_orders')
                .select('*, customer:customers(*), vehicle:vehicles(*), budget:budgets(km)')
                .eq('id', osId)
                .single();
            if (orderError) throw orderError;
            setOrder(orderData);

            if(orderData.budget_id) {
                const { data: itemsData, error: itemsError } = await supabase
                    .from('budget_items')
                    .select('*')
                    .eq('budget_id', orderData.budget_id);
                if (itemsError) throw itemsError;
                setItems(itemsData || []);
            }

            const [checklistsRes, photosRes, historyRes] = await Promise.all([
                supabase.from('work_order_checklists').select('*').eq('work_order_id', osId),
                supabase.from('work_order_photos').select('*').eq('work_order_id', osId).order('uploaded_at', { ascending: false }),
                supabase.rpc('get_audit_trail', { p_entity_id: osId, p_entity_type: 'OS' })
            ]);

            setChecklists(checklistsRes.data || []);
            setPhotos(photosRes.data || []);
            setHistory(historyRes.data || []);

        } catch (error) {
            console.error("OSViewer Error:", error);
            toast({ title: 'Erro ao carregar dados da OS', description: error.message, variant: 'destructive' });
        } finally {
            setLoading(false);
        }
    }, [osId, toast]);

    useEffect(() => {
        if(osId) fetchData();
    }, [fetchData, osId]);

    const handlePhotoUpload = async (e) => {
        if (!e.target.files || e.target.files.length === 0) return;
        setUploading(true);

        try {
            const originalFile = e.target.files[0];
            const compressedFile = await compressImage(originalFile);

            const fileExt = compressedFile.name.split('.').pop();
            const fileName = `os_${osId}_${uuidv4()}.${fileExt}`;
            const filePath = `work-orders/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('work-order-photos')
                .upload(filePath, compressedFile);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('work-order-photos')
                .getPublicUrl(filePath);

            // Insert into work_order_photos table
            const { data: newPhotoData, error: dbError } = await supabase
                .from('work_order_photos')
                .insert({
                    work_order_id: osId,
                    photo_url: publicUrl,
                    photo_type: 'os_upload'
                })
                .select()
                .single();

            if (dbError) throw dbError;

            setPhotos([newPhotoData, ...photos]);
            toast({ title: "Foto enviada com sucesso!" });
        } catch (error) {
            console.error('Upload Error:', error);
            toast({ title: "Erro no upload", description: error.message, variant: "destructive" });
        } finally {
            setUploading(false);
            if (e.target) e.target.value = '';
        }
    };

    const handleDeletePhoto = async (photoId) => {
        try {
             const { error } = await supabase
                .from('work_order_photos')
                .delete()
                .eq('id', photoId);
             
             if (error) throw error;
             
             setPhotos(photos.filter(p => p.id !== photoId));
             toast({ title: "Foto removida" });
        } catch (error) {
            console.error('Delete Error:', error);
            toast({ title: "Erro ao remover foto", description: error.message, variant: "destructive" });
        }
    };

    if (loading) {
        return <div className="flex justify-center items-center h-64"><Loader2 className="w-12 h-12 animate-spin text-blue-500" /></div>;
    }
    
    if (!order) {
        return <p className="text-center text-gray-500 py-10">Não foi possível carregar os dados da OS.</p>;
    }

    const statusInfo = OS_STATUS_MAP[order.status] || { label: order.status, variant: 'default' };

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm p-4 bg-gray-50 rounded-lg border">
              <div><p className="font-semibold text-gray-500">Cliente:</p><p className="font-medium">{order.customer?.name}</p></div>
              <div><p className="font-semibold text-gray-500">Veículo:</p><p className="font-medium">{`${order.vehicle?.brand} ${order.vehicle?.model}`}</p></div>
              <div><p className="font-semibold text-gray-500">Placa:</p><p className="font-medium">{order.vehicle?.plate}</p></div>
              <div><p className="font-semibold text-gray-500">Data:</p><p>{format(new Date(order.created_at), 'dd/MM/yyyy')}</p></div>
              <div><p className="font-semibold text-gray-500">Status:</p><Badge variant={statusInfo.variant}>{statusInfo.label}</Badge></div>
              <div className="md:col-span-3"><p className="font-semibold text-gray-500">Total:</p><p className="text-2xl font-bold text-blue-600">{formatCurrency(order.total_amount)}</p></div>
            </div>

            <Tabs defaultValue="items">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="items"><List className="w-4 h-4 mr-2"/>Itens ({items.length})</TabsTrigger>
                <TabsTrigger value="checklist"><CheckSquare className="w-4 h-4 mr-2"/>Checklist ({checklists.length})</TabsTrigger>
                <TabsTrigger value="photos"><Camera className="w-4 h-4 mr-2"/>Fotos ({photos.length})</TabsTrigger>
                <TabsTrigger value="history"><History className="w-4 h-4 mr-2"/>Histórico ({history.length})</TabsTrigger>
              </TabsList>
              <TabsContent value="items" className="pt-4">
                <div className="border rounded-lg"><table className="w-full text-sm">
                  <thead className="bg-gray-50"><tr><th className="p-2 text-left">Descrição</th><th className="p-2">Qtd.</th><th className="p-2">Preço Unit.</th><th className="p-2 text-right">Total</th></tr></thead>
                  <tbody>{items.map(item => (<tr key={item.id} className="border-t"><td className="p-2">{item.description}</td><td className="p-2 text-center">{item.quantity}</td><td className="p-2 text-right">{formatCurrency(item.unit_price)}</td><td className="p-2 text-right font-medium">{formatCurrency(item.total_price)}</td></tr>))}</tbody>
                </table></div>
              </TabsContent>
              <TabsContent value="checklist" className="pt-4 space-y-2">
                {checklists.length > 0 ? checklists.map(c => <div key={c.id} className="flex items-center gap-2 text-sm p-2 rounded-md border bg-white"><Badge variant={c.is_completed ? 'default' : 'outline'}>{c.is_completed ? 'Feito' : 'Pendente'}</Badge><span>{c.task}</span></div>) : <p className="text-center text-gray-400 py-4 text-sm">Nenhum checklist.</p>}
              </TabsContent>
              <TabsContent value="photos" className="pt-4 space-y-4">
                <div className="flex justify-end">
                     <div className="relative">
                        <input 
                            type="file" 
                            id="os-photo-upload" 
                            className="hidden" 
                            accept="image/*" 
                            onChange={handlePhotoUpload}
                            disabled={uploading}
                        />
                        <Label htmlFor="os-photo-upload" className={`cursor-pointer inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-4 py-2 ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}>
                            {uploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                            Adicionar Foto
                        </Label>
                     </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    {photos.length > 0 ? photos.map(p => (
                        <div key={p.id} className="relative group">
                            <a href={p.photo_url} target="_blank" rel="noreferrer">
                                <img src={p.photo_url} className="w-full h-32 object-cover rounded-lg border" alt={p.photo_type}/>
                            </a>
                            <div className="absolute bottom-0 left-0 bg-black/60 text-white text-xs w-full p-1 rounded-b-lg capitalize flex justify-between items-center">
                                <span>{p.photo_type}</span>
                                <button 
                                    onClick={() => handleDeletePhoto(p.id)} 
                                    className="text-white hover:text-red-400 p-1"
                                    title="Excluir foto"
                                >
                                    <Trash2 className="w-3 h-3" />
                                </button>
                            </div>
                        </div>
                    )) : <p className="col-span-4 text-center text-gray-400 py-4 text-sm">Nenhuma foto anexada.</p>}
                </div>
              </TabsContent>
              <TabsContent value="history" className="pt-4 space-y-3">
                {history.length > 0 ? history.map(h => (<div key={h.id} className="text-xs p-3 bg-gray-50 rounded-md border"><p className="font-semibold capitalize">{h.action.replace(/_/g, ' ')}</p><p className="text-gray-500">Por {h.user_full_name || 'Sistema'} em {format(new Date(h.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>{h.details && <pre className="text-xs text-gray-400 mt-1 bg-white p-1 rounded"><code>{JSON.stringify(h.details, null, 2)}</code></pre>}</div>)) : <p className="text-center text-gray-400 py-4 text-sm">Nenhum histórico disponível.</p>}
              </TabsContent>
            </Tabs>
        </div>
    );
};

export default OSViewer;