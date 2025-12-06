import React, { useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PlusCircle, Trash2 } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import BudgetLineInput from './BudgetLineInput';

const BudgetItemSection = ({ title, itemType, items, updateItem, addNewItem, removeItem, products, services, collaborators, focusOnNewItem, onNewItemFocused, showCosts, readOnly }) => {
    
    const newItemRef = useRef(null);

    useEffect(() => {
        if (focusOnNewItem && newItemRef.current) {
            // Focus logic for new item
            const firstInput = newItemRef.current.querySelector('input');
            if (firstInput) {
                firstInput.focus();
                onNewItemFocused();
            }
        }
    }, [focusOnNewItem, onNewItemFocused]);

    const handleItemChange = (client_id, fields) => {
        updateItem(client_id, fields);
    };

    const handleSelect = (client_id, selectedItem) => {
        if (!selectedItem) return;
        
        handleItemChange(client_id, {
            description: selectedItem.label,
            unit_price: selectedItem.unit_price,
            cost_price: selectedItem.cost_price,
            product_variant_id: itemType === 'product' ? selectedItem.product_variant_id : null,
            sku: itemType === 'product' ? selectedItem.sku : null
        });
    };

    const handleClearItem = (client_id) => {
        // When clearing a locked item, reset the product link and clear description
        handleItemChange(client_id, {
            description: '',
            product_variant_id: null,
            sku: null,
            unit_price: 0,
            cost_price: 0
        });
    };
    
    const handleKeyDown = (e, client_id) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            
            const row = e.currentTarget.closest('.budget-item-row');
            if (!row) return;
            
            // Get focusable elements in the row
            const focusableElements = Array.from(
              row.querySelectorAll('input:not([disabled]), button[role="combobox"], button[role="listbox"]')
            );

            const currentTargetElement = e.currentTarget.closest('button, input');
            const currentIndex = focusableElements.findIndex(el => el === currentTargetElement);
            
            const nextElement = focusableElements[currentIndex + 1];

            if (nextElement) {
                nextElement.focus();
                if (nextElement.select) nextElement.select();
            } else {
                addNewItem();
            }
        }
    };
    
    const hasCost = itemType === 'product' || itemType === 'external_service';
    const hasCollaborator = itemType === 'service';
    const isProduct = itemType === 'product';
    
    // Select correct data source
    const dataList = isProduct ? products : services;

    const getGridTemplate = () => {
        if (isProduct) {
            return showCosts ? "grid-cols-[4fr_80px_110px_110px_110px_110px_40px]" : "grid-cols-[4fr_80px_110px_110px_40px]";
        }
        if (hasCost) {
            return showCosts ? "grid-cols-[3fr_80px_110px_110px_110px_110px_40px]" : "grid-cols-[3fr_80px_110px_110px_40px]";
        }
        if (hasCollaborator) {
             return "grid-cols-[2fr_1fr_80px_110px_110px_40px]";
        }
        return "grid-cols-[3fr_80px_110px_110px_40px]";
    };

    const gridTemplate = getGridTemplate();

    return (
        <div className="space-y-2 rounded-lg border p-4">
            <h3 className="font-semibold text-lg">{title}</h3>
            {items.length > 0 && (
                <div className={`grid ${gridTemplate} items-center gap-x-2 text-xs font-semibold text-gray-500 px-2`}>
                    <span className="text-center">Descrição</span>
                    {hasCollaborator && <span className="text-center">Colaborador</span>}
                    <span className="text-center">Qtd.</span>
                    <span className="text-center">P. Unit.</span>
                    <span className="text-center">P. Total</span>
                    {hasCost && showCosts && <span className="text-center">C. Unit</span>}
                    {hasCost && showCosts && <span className="text-center">C. Total</span>}
                    <span />
                </div>
            )}
            {items.map((item, index) => (
                <div 
                    key={item.client_id} 
                    className={`budget-item-row grid ${gridTemplate} items-center gap-x-2 px-2 py-1 border-b`}
                    ref={(item.isNew && index === items.length -1) ? newItemRef : null}
                >
                    <BudgetLineInput 
                        value={item.description || ''}
                        onChange={(val) => handleItemChange(item.client_id, { description: val })}
                        onSelect={(selected) => handleSelect(item.client_id, selected)}
                        onClear={() => handleClearItem(item.client_id)}
                        items={dataList}
                        disabled={readOnly}
                        placeholder="Descrição"
                        // Pass locked state if it is a product variant that has been selected
                        isLocked={itemType === 'product' && !!item.product_variant_id} 
                        onEnter={(e) => handleKeyDown(e, item.client_id)}
                    />
                    
                    {hasCollaborator && (
                        <Select value={item.collaborator_id || ''} onValueChange={v => handleItemChange(item.client_id, { collaborator_id: v })} disabled={readOnly}>
                            <SelectTrigger onKeyDown={(e) => handleKeyDown(e, item.client_id)} className="text-center" role="listbox">
                                <SelectValue placeholder="Selecione..." className="text-center"/>
                            </SelectTrigger>
                            <SelectContent>{collaborators.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                        </Select>
                    )}

                    <Input type="number" value={item.quantity} onChange={e => handleItemChange(item.client_id, { quantity: e.target.value })} onKeyDown={(e) => handleKeyDown(e, item.client_id)} disabled={readOnly} className="text-center [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none" />
                    <Input type="number" step="0.01" value={item.unit_price} onChange={e => handleItemChange(item.client_id, { unit_price: e.target.value })} onKeyDown={(e) => handleKeyDown(e, item.client_id)} disabled={readOnly} className="text-center [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none" />
                    
                    <span className="text-center font-medium pr-2">R$ {((Number(item.quantity) || 0) * (Number(item.unit_price) || 0)).toFixed(2)}</span>
                    
                    {hasCost && showCosts && <Input type="number" step="0.01" value={item.cost_price} onChange={e => handleItemChange(item.client_id, { cost_price: e.target.value })} onKeyDown={(e) => handleKeyDown(e, item.client_id)} disabled={readOnly} className="text-center [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none" />}
                    {hasCost && showCosts && <span className="text-center font-medium pr-2">R$ {((Number(item.quantity) || 0) * (Number(item.cost_price) || 0)).toFixed(2)}</span>}

                     <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button type="button" size="icon" variant="ghost" disabled={readOnly} className="w-full"><Trash2 className="w-4 h-4 mr-2 text-red-500" /></Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                                <AlertDialogDescription>Tem certeza que deseja remover este item do orçamento?</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={() => removeItem(item.client_id)}>Remover</AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </div>
            ))}
             <Button type="button" size="sm" variant="ghost" onClick={addNewItem} disabled={readOnly} className="justify-start text-left text-muted-foreground hover:text-foreground">
                <PlusCircle className="w-4 h-4 mr-2" />
                Adicionar Item
            </Button>
        </div>
    );
};

export default BudgetItemSection;