/**
 * Centralized Business Rules and Validations
 */

export const validateOSCreation = (budget, stockMap = {}) => {
    const errors = [];
    
    if (!budget) return { valid: false, message: "Orçamento inválido." };
    
    // Rule: OS can only be created from Approved budget
    if (budget.status !== 'approved') {
        return { valid: false, message: "O orçamento precisa estar Aprovado para gerar OS." };
    }

    // Rule: Check stock sufficiency (Frontend check if stockMap provided)
    if (budget.items) {
        budget.items.forEach(item => {
            if (item.item_type === 'product') {
                const stock = stockMap[item.product_variant_id];
                if (stock !== undefined && stock < item.quantity) {
                    errors.push(`Estoque insuficiente para: ${item.description} (Atual: ${stock}, Necessário: ${item.quantity})`);
                }
            }
        });
    }

    if (errors.length > 0) {
        return { valid: false, errors };
    }

    return { valid: true };
};

export const validateOSCancellation = (os) => {
    if (!os) return { valid: false, message: "OS inválida." };

    // Rule: OS can only be cancelled if status is Aberta
    if (os.status !== 'Aberta') {
        return { valid: false, message: `Não é possível cancelar OS com status "${os.status}". Apenas "Aberta" permite cancelamento.` };
    }

    // Rule: Cannot cancel if payments exist (This is usually a backend check, but if we have the data...)
    if (os.receivables && os.receivables.some(r => r.status === 'Pago')) {
        return { valid: false, message: "Existem pagamentos registrados. Realize o estorno financeiro antes de cancelar." };
    }

    return { valid: true };
};

export const validateOSEditing = (os) => {
    // Rule: OS cannot be edited after creation (Read-only)
    // This function always returns false because editing is strictly forbidden per business rules.
    return { valid: false, message: "Ordens de Serviço não podem ser editadas após a criação. Cancele e crie uma nova se necessário." };
};

export const validatePaymentRegistration = (receivable, amount) => {
    if (!receivable) return { valid: false, message: "Conta a receber inválida." };
    if (receivable.status !== 'Pendente') return { valid: false, message: "Esta conta não está pendente." };
    
    const valAmount = parseFloat(amount);
    if (isNaN(valAmount) || valAmount <= 0) return { valid: false, message: "Valor do pagamento deve ser positivo." };
    
    if (valAmount > parseFloat(receivable.amount)) {
        return { valid: false, message: "Valor do pagamento excede o valor da conta." };
    }

    return { valid: true };
};