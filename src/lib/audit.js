import { supabase } from '@/lib/customSupabaseClient';

const isUUID = (str) => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
};

/**
 * Logs an audit event to the database.
 * @param {string} userId - The UUID of the user performing the action. Can be null for system actions.
 * @param {string} action - A short description of the action (e.g., 'create_customer', 'update_vehicle').
 * @param {object} details - A JSON object containing relevant details about the event, such as recordId and changes.
 */
export const logAudit = async (userId, action, details) => {
  // Validate that userId is a valid UUID before inserting
  if (userId && !isUUID(userId)) {
    console.warn(`Audit event '${action}' skipped: Invalid user ID format.`);
    return;
  }

  try {
    const { error } = await supabase.from('audit_log').insert({
      user_id: userId,
      action: action,
      details: details,
    });
    if (error) {
      console.error('Error logging audit event:', error.message);
    }
  } catch (e) {
    console.error('Exception in audit logging:', e.message);
  }
};

// Alias for backward compatibility if needed elsewhere, though logAudit is the primary export now
export const logAuditEvent = logAudit;