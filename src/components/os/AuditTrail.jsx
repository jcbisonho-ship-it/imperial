import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import HistoryTimeline from './HistoryTimeline';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2 } from 'lucide-react';

const AuditTrail = ({ entityId, entityType }) => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (entityId) {
      fetchAuditTrail();
    }
  }, [entityId, entityType]);

  const fetchAuditTrail = async () => {
    setLoading(true);
    try {
      // We use the existing RPC 'get_audit_trail' or fallback to querying the table directly
      // if the RPC was named differently in previous steps. The prompt asks to create it,
      // so we assume we will define it in the database block below.
      const { data, error } = await supabase.rpc('get_audit_trail', { 
        p_entity_id: entityId, 
        p_entity_type: entityType 
      });

      if (error) throw error;
      setLogs(data || []);
    } catch (error) {
      console.error('Error fetching audit trail:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-48 text-gray-500">
        <Loader2 className="w-6 h-6 animate-spin mr-2" />
        Carregando histórico...
      </div>
    );
  }

  return (
    <ScrollArea className="h-[500px] pr-4">
        <div className="py-4">
            <HistoryTimeline history={logs} />
        </div>
    </ScrollArea>
  );
};

export default AuditTrail;