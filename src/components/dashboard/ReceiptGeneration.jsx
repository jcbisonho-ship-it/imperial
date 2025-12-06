import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Receipt, Download, Printer, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';

const ReceiptGeneration = () => {
  const [orders, setOrders] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const { toast } = useToast();

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    const { data, error } = await supabase.from('work_orders').select('*').eq('status', 'completed');
    if (error) {
      toast({ title: "Erro ao carregar Ordens de Serviço", variant: 'destructive' });
    } else {
      setOrders(data);
    }
  };

  const handlePrint = () => {
    toast({ title: "Impressão iniciada" });
    window.print();
  };

  const handleDownload = () => {
     toast({
      title: "🚧 This feature isn't implemented yet—but don't worry! You can request it in your next prompt! 🚀",
    });
  };

  const filteredOrders = orders.filter(ord =>
    ord.vehicle_description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ord.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ord.id.includes(searchTerm)
  );

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Geração de Recibos</h2>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-bold mb-4">Selecionar Ordem de Serviço Concluída</h3>
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" placeholder="Buscar ordem..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 py-2 border rounded-lg" />
          </div>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {filteredOrders.length > 0 ? filteredOrders.map((order) => (
              <motion.button key={order.id} onClick={() => setSelectedOrder(order)} whileHover={{ scale: 1.02 }} className={`w-full text-left p-4 rounded-lg border-2 transition-all ${selectedOrder?.id === order.id ? 'border-blue-600 bg-blue-50' : 'border-gray-200 hover:border-blue-300'}`}>
                <p className="font-bold">OS #{order.id.substring(0,8)}</p>
                <p className="text-sm">{order.vehicle_description} | {order.customer_name}</p>
                <p className="font-bold text-blue-600">R$ {Number(order.total_cost || 0).toFixed(2)}</p>
              </motion.button>
            )) : <p className="text-center text-gray-500 py-8">Nenhuma ordem concluída encontrada.</p>}
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold">Visualização do Recibo</h3>
            {selectedOrder && (
              <div className="flex gap-2">
                <Button onClick={handlePrint} variant="outline" size="sm"><Printer className="w-4 h-4 mr-2" /> Imprimir</Button>
                <Button onClick={handleDownload} size="sm"><Download className="w-4 h-4 mr-2" /> Download</Button>
              </div>
            )}
          </div>
          {!selectedOrder ? (
            <div className="text-center py-12"><Receipt className="w-16 h-16 text-gray-300 mx-auto mb-4" /><p>Selecione uma ordem para visualizar</p></div>
          ) : (
            <div className="border rounded-lg p-6" id="receipt-content">
              <h2 className="text-2xl font-bold text-center">Imperial Serviços Automotivos</h2>
              <p className="text-center text-sm mb-6">Recibo de Serviço</p>
              <div className="space-y-4">
                <p><strong>OS:</strong> #{selectedOrder.id.substring(0,8)}</p>
                <p><strong>Data:</strong> {new Date(selectedOrder.order_date).toLocaleDateString('pt-BR')}</p>
                <p><strong>Cliente:</strong> {selectedOrder.customer_name}</p>
                <p><strong>Veículo:</strong> {selectedOrder.vehicle_description}</p>
                <div>
                  <strong>Serviços:</strong>
                  <ul className="list-disc list-inside">
                    {selectedOrder.services?.map((s, i) => <li key={i}>{s.name} - R$ {Number(s.price).toFixed(2)}</li>)}
                  </ul>
                </div>
                <div className="text-right text-2xl font-bold pt-4 border-t">
                  TOTAL: R$ {Number(selectedOrder.total_cost || 0).toFixed(2)}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReceiptGeneration;