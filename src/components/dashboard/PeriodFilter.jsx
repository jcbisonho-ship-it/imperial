import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Calendar as CalendarIcon } from 'lucide-react';
import { cn } from "@/lib/utils";
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const PeriodFilter = ({ dateRange, setDateRange, presets }) => {
    const [activePreset, setActivePreset] = useState('Hoje');

    const handleSetPreset = (preset) => {
        setDateRange(preset.range);
        setActivePreset(preset.label);
    };
  
    const handleDateSelect = (range) => {
      if(range?.from) {
        setDateRange(range);
        const isPreset = presets.some(p => 
            format(p.range.from, 'yyyy-MM-dd') === format(range.from, 'yyyy-MM-dd') && 
            p.range.to && format(p.range.to, 'yyyy-MM-dd') === format(range.to, 'yyyy-MM-dd')
        );
        if (!isPreset) setActivePreset('Custom');
      }
    }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {presets.map(preset => (
        <Button 
            key={preset.label}
            variant={activePreset === preset.label ? 'default' : 'outline'} 
            size="sm" 
            onClick={() => handleSetPreset(preset)}
        >
            {preset.label}
        </Button>
      ))}
      
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant={"outline"}
            size="sm"
            className={cn(
              "w-full sm:w-[240px] justify-start text-left font-normal",
              !dateRange.from && "text-muted-foreground",
              activePreset === 'Custom' && "border-primary"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {dateRange?.from ? (
              dateRange.to ? (
                <>
                  {format(dateRange.from, "dd/MM/y", {locale: ptBR})} - {format(dateRange.to, "dd/MM/y", {locale: ptBR})}
                </>
              ) : (
                format(dateRange.from, "dd/MM/y", {locale: ptBR})
              )
            ) : (
              <span>Selecione o período</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="end">
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={dateRange?.from}
            selected={dateRange}
            onSelect={handleDateSelect}
            numberOfMonths={2}
            locale={ptBR}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
};

export default PeriodFilter;