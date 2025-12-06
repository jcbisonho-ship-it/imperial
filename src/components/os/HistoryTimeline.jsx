import React from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  CheckCircle2, 
  AlertCircle, 
  FileText, 
  ArrowRightLeft, 
  ShoppingCart, 
  Ban, 
  DollarSign,
  Package,
  User
} from 'lucide-react';

const ACTION_ICONS = {
  'create_os': { icon: FileText, color: 'text-blue-500', bg: 'bg-blue-100' },
  'create_product': { icon: Package, color: 'text-green-500', bg: 'bg-green-100' },
  'update_product': { icon: Package, color: 'text-orange-500', bg: 'bg-orange-100' },
  'conversion': { icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-100' },
  'cancellation': { icon: Ban, color: 'text-red-600', bg: 'bg-red-100' },
  'stock_movement': { icon: ArrowRightLeft, color: 'text-purple-500', bg: 'bg-purple-100' },
  'financial_transaction': { icon: DollarSign, color: 'text-emerald-600', bg: 'bg-emerald-100' },
  'sale': { icon: ShoppingCart, color: 'text-indigo-500', bg: 'bg-indigo-100' },
  'default': { icon: AlertCircle, color: 'text-gray-500', bg: 'bg-gray-100' }
};

const getActionStyle = (actionType) => {
  // Normalize action string to lowercase for matching
  const normalized = actionType?.toLowerCase() || '';
  
  if (normalized.includes('create') || normalized.includes('criado')) return ACTION_ICONS['create_os'];
  if (normalized.includes('convert') || normalized.includes('conversão')) return ACTION_ICONS['conversion'];
  if (normalized.includes('cancel') || normalized.includes('estorno')) return ACTION_ICONS['cancellation'];
  if (normalized.includes('stock') || normalized.includes('estoque') || normalized.includes('movement')) return ACTION_ICONS['stock_movement'];
  if (normalized.includes('finance') || normalized.includes('pagamento') || normalized.includes('transaction')) return ACTION_ICONS['financial_transaction'];
  
  return ACTION_ICONS['default'];
};

const HistoryTimeline = ({ history }) => {
  if (!history || history.length === 0) {
    return <div className="text-center text-gray-500 py-8">Nenhum histórico registrado.</div>;
  }

  return (
    <div className="relative border-l-2 border-gray-200 ml-3 space-y-6 pl-6 py-2">
      {history.map((item, index) => {
        const style = getActionStyle(item.action);
        const Icon = style.icon;
        
        // Try to parse details safely
        let details = item.details;
        if (typeof details === 'string') {
            try { details = JSON.parse(details); } catch(e) {}
        }

        return (
          <div key={item.id || index} className="relative">
            <div className={`absolute -left-[33px] top-0 w-8 h-8 rounded-full flex items-center justify-center border-2 border-white shadow-sm ${style.bg}`}>
              <Icon className={`w-4 h-4 ${style.color}`} />
            </div>
            
            <div className="bg-white p-4 rounded-lg border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-1">
                <h4 className="font-semibold text-gray-900 capitalize">
                  {item.action.replace(/_/g, ' ')}
                </h4>
                <span className="text-xs text-gray-500 flex items-center gap-1 bg-gray-50 px-2 py-1 rounded">
                  {format(new Date(item.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                </span>
              </div>
              
              {details && (
                <div className="mt-2 text-sm text-gray-600 bg-gray-50 p-2 rounded">
                  {Object.entries(details).map(([key, value]) => {
                    if (key === 'id' || key === 'orderId') return null;
                    return (
                        <div key={key} className="grid grid-cols-3 gap-2">
                            <span className="font-medium text-gray-500 capitalize">{key.replace(/_/g, ' ')}:</span>
                            <span className="col-span-2 break-all">
                                {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                            </span>
                        </div>
                    );
                  })}
                </div>
              )}

              <div className="mt-2 flex items-center gap-2 text-xs text-gray-400">
                 <User className="w-3 h-3" />
                 <span>{item.user?.full_name || item.user_email || 'Sistema'}</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default HistoryTimeline;