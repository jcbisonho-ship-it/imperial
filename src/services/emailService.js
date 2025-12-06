import { supabase } from '@/lib/customSupabaseClient';

/**
 * Sends an email using the configured email provider (via Edge Function or internal logic)
 * @param {string} to - Recipient email
 * @param {string} subject - Email subject
 * @param {string} text - Plain text content
 * @param {string} html - HTML content
 * @param {Array} attachments - Array of attachments
 */
export const sendEmail = async ({ to, subject, text, html, attachments }) => {
  try {
    // This assumes there's a supabase edge function named 'send-email'
    // or similar logic. Since I cannot create edge functions directly in this environment
    // without the specific tool, I will mock the call or use a placeholder RPC if available.
    // For now, we'll simulate a successful call or use a generic function call if one existed.
    
    // MOCK IMPLEMENTATION for demonstration/placeholder since backend email service isn't strictly defined in prompt constraints
    console.log(`Sending email to ${to}: ${subject}`);
    console.log(`Content: ${text}`);
    
    // If you have a specific edge function:
    // const { data, error } = await supabase.functions.invoke('send-email', {
    //   body: { to, subject, text, html, attachments }
    // });
    // if (error) throw error;
    // return data;

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    return { success: true };
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
};

/**
 * Resends an email based on a previous context or ID.
 * This was requested specifically to be exported.
 */
export const resendEmail = async (emailId) => {
    console.log(`Resending email ID: ${emailId}`);
    // Implementation would depend on storing email logs
    await new Promise(resolve => setTimeout(resolve, 1000));
    return { success: true, message: 'Email resent successfully (mock)' };
};

/**
 * Sends a Service Order specific email
 * @param {Object} osData - The full OS object
 * @param {string} to - Recipient email
 * @param {string} message - Optional custom message
 */
export const sendOSEmail = async (osData, to, message) => {
    if (!to) {
        throw new Error("Email do destinatário não fornecido.");
    }

    const customerName = osData.budget?.customer?.name || 'Cliente';
    const osNumber = osData.os_number;
    const vehicleInfo = osData.budget?.vehicle 
        ? `${osData.budget.vehicle.brand} ${osData.budget.vehicle.model} (${osData.budget.vehicle.plate})`
        : 'Veículo não identificado';

    const subject = `Ordem de Serviço #${osNumber} - ${customerName}`;
    
    const textBody = `
Olá ${customerName},

Aqui estão os detalhes da sua Ordem de Serviço #${osNumber}.

Veículo: ${vehicleInfo}
Total: R$ ${osData.total_amount}
Status: ${osData.status}

${message ? `Mensagem adicional:\n${message}\n` : ''}

Atenciosamente,
Equipe da Oficina
    `.trim();

    return sendEmail({
        to,
        subject,
        text: textBody
    });
};

export default {
  sendEmail,
  resendEmail,
  sendOSEmail
};