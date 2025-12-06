import { supabase } from '@/lib/customSupabaseClient';

export const getServicos = async () => {
  try {
    const { data, error } = await supabase.from('servicos').select('*').order('nome');
    if (error) {
      console.error('Error fetching services:', error);
      // Defensive: return empty array instead of null/undefined to prevent iteration errors
      return []; 
    }
    // Defensive: ensure we return an array even if data is null
    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.error('Unexpected error in getServicos:', err);
    return [];
  }
};

export const getServicoById = async (id) => {
  if (!id) return null;
  try {
    const { data, error } = await supabase.from('servicos').select('*').eq('id', id).maybeSingle();
    if (error) {
      console.error(`Error fetching service with id ${id}:`, error);
      return null;
    }
    return data;
  } catch (err) {
    console.error(`Unexpected error in getServicoById for id ${id}:`, err);
    return null;
  }
};