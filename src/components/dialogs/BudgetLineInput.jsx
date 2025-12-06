import React, { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, X, Package, ChevronRight } from 'lucide-react';
import { Popover, PopoverContent, PopoverAnchor } from '@/components/ui/popover';

export default function BudgetLineInput({ value, onChange, onSelect, items = [], disabled, placeholder, onEnter, isLocked, onClear }) {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const inputRef = useRef(null);
  const searchInputRef = useRef(null);

  // Focus management for the main input
  const moveFocusToNext = () => {
      setTimeout(() => {
          if (inputRef.current) {
              const row = inputRef.current.closest('.budget-item-row');
              if (row) {
                  const inputs = Array.from(row.querySelectorAll('input:not([disabled])'));
                  const myIndex = inputs.indexOf(inputRef.current);
                  if (myIndex !== -1 && myIndex + 1 < inputs.length) {
                      inputs[myIndex + 1].focus();
                      if (inputs[myIndex + 1].select) inputs[myIndex + 1].select();
                  }
              }
          }
      }, 50);
  };

  // 1. Open Modal Logic - Modified to allow opening even if locked
  const handleOpenSearch = () => {
      if (!disabled) {
          setSearchTerm(''); // Reset search when opening
          setIsSearchOpen(true);
      }
  };

  // Focus search input when modal opens
  useEffect(() => {
      if (isSearchOpen) {
          // Small timeout to wait for Popover animation
          setTimeout(() => {
              if (searchInputRef.current) {
                  searchInputRef.current.focus();
              }
          }, 50);
      }
  }, [isSearchOpen]);

  // 2. Filter Logic
  const filteredItems = items.filter(item => {
      if (!searchTerm) return true;
      const searchLower = searchTerm.toLowerCase();
      return (
          (item.label && item.label.toLowerCase().includes(searchLower)) ||
          (item.sku && item.sku.toLowerCase().includes(searchLower)) ||
          (item.application && item.application.toLowerCase().includes(searchLower))
      );
  });

  // 3. Click Handler - DIRECT AND EXPLICIT
  const handleProductClick = (item) => {
      console.log("Direct Click Selected:", item);
      
      // A. Update Parent
      onSelect(item);

      // B. Close Modal
      setIsSearchOpen(false);

      // C. Move Focus
      moveFocusToNext();
  };

  const handleKeyDownMain = (e) => {
      // Ctrl+Space or F2 to open search
      if ((e.ctrlKey && e.code === 'Space') || e.key === 'F2') {
          e.preventDefault();
          handleOpenSearch();
          return;
      }
      // Enter key moves to next field
      if (e.key === 'Enter') {
          e.preventDefault();
          if (onEnter) onEnter(e);
          else moveFocusToNext();
      }
  };

  const handleClear = (e) => {
      if (e) e.stopPropagation(); // Prevent double triggers if nested
      if (onClear) onClear();
      setTimeout(() => inputRef.current?.focus(), 50);
  };

  return (
    <Popover open={isSearchOpen} onOpenChange={setIsSearchOpen}>
        <PopoverAnchor asChild>
            <div className="relative flex items-center w-full group">
                {/* Left Icon / Search Trigger */}
                <div className="absolute left-0 top-0 bottom-0 flex items-center justify-center w-10 z-10">
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className={`h-8 w-8 rounded-full ${isLocked ? 'text-blue-600 bg-blue-50 hover:bg-blue-100' : 'text-muted-foreground hover:text-blue-600 hover:bg-blue-50'}`}
                        disabled={disabled}
                        onClick={handleOpenSearch}
                        tabIndex={-1}
                        title={isLocked ? "Alterar produto (Ctrl+Space)" : "Pesquisar (Ctrl+Space)"}
                    >
                        {isLocked ? <Package className="h-4 w-4" /> : <Search className="h-4 w-4" />}
                    </Button>
                </div>

                {/* Main Input Field */}
                <Input
                    ref={inputRef}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    onKeyDown={handleKeyDownMain}
                    onDoubleClick={handleOpenSearch} // 1. Double click trigger
                    disabled={disabled}
                    readOnly={isLocked} // Use readOnly instead of disabled for locked items so double click works better
                    placeholder={placeholder}
                    className={`pl-10 transition-colors ${
                        isLocked 
                        ? 'bg-gray-50 text-gray-900 border-gray-200 font-medium cursor-pointer pr-10 focus-visible:ring-1' 
                        : 'bg-white pr-3'
                    }`}
                />

                {/* Clear Button (Only when locked) */}
                {isLocked && !disabled && (
                    <div className="absolute right-0 top-0 bottom-0 flex items-center justify-center w-10 z-10">
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full"
                            onClick={handleClear}
                            tabIndex={-1}
                            title="Limpar seleção"
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                )}
            </div>
        </PopoverAnchor>

        {/* PRODUCT SELECTION DROPDOWN */}
        <PopoverContent 
            className="p-0 w-[750px] max-h-[500px] flex flex-col overflow-hidden shadow-xl border-slate-200" 
            align="start" 
            side="bottom"
            sideOffset={5}
            avoidCollisions={false} // 5. Force open below
            onOpenAutoFocus={(e) => e.preventDefault()} 
        >
            {/* Search Header */}
            <div className="p-3 border-b bg-slate-50">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input 
                        ref={searchInputRef}
                        placeholder="Digite para buscar (nome, código ou aplicação)..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-9 bg-white"
                        autoComplete="off"
                    />
                </div>
            </div>

            {/* Results List */}
            <div className="flex-1 overflow-y-auto min-h-[200px] max-h-[400px]">
                {filteredItems.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-40 text-gray-500">
                        <Package className="h-10 w-10 mb-2 opacity-20" />
                        <p>Nenhum produto encontrado.</p>
                    </div>
                ) : (
                    <div className="p-1 space-y-1">
                        {/* Header Row - 4 Columns: Code | Desc | App | Price */}
                        <div className="grid grid-cols-[100px_2fr_1fr_120px] gap-4 px-4 py-2 text-xs font-semibold text-gray-500 bg-gray-50 rounded-md mb-1 sticky top-0 z-10">
                            <span>CÓDIGO</span>
                            <span>DESCRIÇÃO</span>
                            <span>APLICAÇÃO</span>
                            <span className="text-right">PREÇO</span>
                        </div>

                        {filteredItems.map((item) => (
                            <div 
                                key={item.id}
                                onClick={() => handleProductClick(item)}
                                className="group grid grid-cols-[100px_2fr_1fr_120px] gap-4 items-center px-4 py-2.5 rounded-md hover:bg-blue-50 cursor-pointer border-b border-gray-50 last:border-0 hover:border-blue-100 transition-all duration-150"
                            >
                                {/* 1. Code (Plain Text) */}
                                <div className="text-xs font-mono text-gray-500 group-hover:text-blue-600 truncate" title={item.sku}>
                                    {item.sku || '---'}
                                </div>

                                {/* 2. Description */}
                                <div className="truncate text-sm font-medium text-gray-900 group-hover:text-blue-700" title={item.label}>
                                    {item.label}
                                </div>
                                
                                {/* 3. Application */}
                                <div className="truncate text-xs text-gray-500 group-hover:text-blue-600" title={item.application}>
                                    {item.application || '-'}
                                </div>

                                {/* 4. Price & Arrow */}
                                <div className="flex items-center justify-end gap-2">
                                    <span className="text-sm font-bold text-gray-700 group-hover:text-blue-700 whitespace-nowrap">
                                        {item.price !== undefined && item.price !== null 
                                            ? Number(item.price).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) 
                                            : 'R$ 0,00'}
                                    </span>
                                    <ChevronRight className="h-4 w-4 text-gray-300 group-hover:text-blue-500" />
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
            
            <div className="px-3 py-2 border-t bg-gray-50 text-[10px] text-center text-gray-400">
                Mostrando {filteredItems.length} de {items.length} produtos
            </div>
        </PopoverContent>
    </Popover>
  );
}