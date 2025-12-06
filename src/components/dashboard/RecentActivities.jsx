import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { Clock, FileText, CheckCircle, User, AlertTriangle, RefreshCw } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ScrollArea } from '@/components/ui/scroll-area';

const RecentActivities = ({ limit = 5 }) => {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchActivities = async () => {
      const { data } = await supabase
        .from('audit_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);
      setActivities(data || []);
      setLoading(false);
    };
    fetchActivities();
  }, [limit]);

  const getIcon = (action) => {
      const lowerAction = action.toLowerCase();
      if (lowerAction.includes('create') || lowerAction.includes('converted')) return <FileText className="w-4 h-4 text-green-500" />;
      if (lowerAction.includes('update')) return <Clock className="w-4 h-4 text-blue-500" />;
      if (lowerAction.includes('delete') || lowerAction.includes('cancel')) return <AlertTriangle className="w-4 h-4 text-red-500" />;
      return <CheckCircle className="w-4 h-4 text-gray-500" />;
  };

  const formatActivityText = (activity) => {
    const table = activity.table_name || '';
    const action = activity.action.replace(/_/g, ' ').toLowerCase();
    
    let entityName = table;
    if (table.toLowerCase() === 'os') entityName = 'OS';
    if (table.toLowerCase() === 'lembretes') entityName = 'Lembrete';
    
    return `${entityName} ${action}`;
  }

  return (
    <div className="bg-white rounded-xl border shadow-sm flex flex-col h-full">
      <div className="p-6 border-b">
        <h3 className="text-lg font-semibold text-gray-900">Atividades Recentes</h3>
      </div>
      <ScrollArea className="h-[300px] sm:h-[350px] p-0">
          {loading ? (
             <div className="flex items-center justify-center h-full">
                 <RefreshCw className="h-6 w-6 animate-spin text-primary"/>
             </div>
          ) : activities.length === 0 ? (
             <div className="p-6 text-center text-gray-500 h-full flex items-center justify-center">Nenhuma atividade recente.</div>
          ) : (
             <div className="divide-y">
                 {activities.map((activity) => (
                     <div key={activity.id} className="p-4 hover:bg-gray-50 transition-colors flex items-start gap-4">
                         <div className="mt-1 bg-gray-100 p-2 rounded-full">
                             {getIcon(activity.action)}
                         </div>
                         <div className="flex-1">
                             <p className="text-sm font-medium text-gray-800 capitalize">
                                 {formatActivityText(activity)}
                             </p>
                             <p className="text-xs text-gray-500 mt-0.5" title={format(new Date(activity.created_at), "dd/MM/yyyy 'às' HH:mm")}>
                                 {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true, locale: ptBR })}
                             </p>
                         </div>
                     </div>
                 ))}
             </div>
          )}
      </ScrollArea>
    </div>
  );
};

export default RecentActivities;