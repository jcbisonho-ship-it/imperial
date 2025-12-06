import { supabase } from '@/lib/customSupabaseClient';

export const osService = {
  async convertToOS(budgetId) {
    const { data, error } = await supabase.rpc('convert_budget_to_os', {
      p_budget_id: budgetId,
    });
    
    if (error) {
      throw new Error(error.message);
    }
    return { data, error };
  },

  async cancelOS(osId, reason) {
    const { data, error } = await supabase.rpc('cancel_service_order', {
      p_os_id: osId,
      p_reason: reason,
    });
    
    if (error) {
      throw new Error(error.message);
    }
    return data;
  },

  async createFromBudget(budgetId, financialData) {
    const { data, error } = await supabase.rpc('convert_budget_to_finalized_os', {
      p_budget_id: budgetId,
      p_financial_data: financialData,
    });
    
    if (error) {
      throw new Error(error.message);
    }
    return data;
  },
};