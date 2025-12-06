import { formatCurrency } from '@/lib/utils';

export const sendWhatsApp = (phone, message) => {
    const internationalPhone = phone.replace(/\D/g, '');
    const whatsappUrl = `https://wa.me/55${internationalPhone}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
};

export const sendOSWhatsApp = (osData, customMessage) => {
    const customer = osData?.customer;
    const phone = customer?.whatsapp || customer?.phone;

    if (!phone) {
        throw new Error("O cliente não possui um número de WhatsApp ou telefone cadastrado.");
    }

    const defaultMessage = `Olá, ${customer?.name || 'Cliente'}! Segue sua Ordem de Serviço Nº ${osData.os_number} no valor de ${formatCurrency(osData.total_amount)}. Estamos à disposição para qualquer dúvida.`;
    
    const messageToSend = customMessage || defaultMessage;

    sendWhatsApp(phone, messageToSend);
};