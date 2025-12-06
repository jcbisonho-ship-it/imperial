import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { format } from 'date-fns';
import { getAvailableTimeSlots } from '@/utils/agendamentoUtils';
import { Loader2 } from 'lucide-react';

const TimeSlotPicker = (props) => {
  // Support hybrid props: 
  // Mode A (Smart): selectedDate, onTimeSelect, service, currentSelectedTime
  // Mode B (Dumb): availableSlots, selectedSlot, onSlotSelect, isLoading
  
  const { 
    selectedDate, 
    onTimeSelect, 
    service, 
    currentSelectedTime,
    
    // Props for Dumb mode (overrides)
    availableSlots: propAvailableSlots,
    selectedSlot: propSelectedSlot,
    onSlotSelect: propOnSlotSelect,
    isLoading: propIsLoading
  } = props;

  const [internalLoading, setInternalLoading] = useState(false);
  const [existingAppointments, setExistingAppointments] = useState([]);
  const [internalSelectedSlot, setInternalSelectedSlot] = useState(null);

  // Determine which mode we are in
  const isDumbMode = Array.isArray(propAvailableSlots);

  // Unify props
  const activeSelectedSlot = isDumbMode ? propSelectedSlot : (currentSelectedTime || internalSelectedSlot);
  const handleSlotClick = (slot) => {
    if (isDumbMode) {
      if (propOnSlotSelect) propOnSlotSelect(slot);
    } else {
      setInternalSelectedSlot(slot);
      if (onTimeSelect) onTimeSelect(slot);
    }
  };

  const loading = isDumbMode ? propIsLoading : internalLoading;

  // Smart Mode: Sync internal state with prop if editing or initial load
  useEffect(() => {
      if (!isDumbMode && currentSelectedTime) {
          setInternalSelectedSlot(currentSelectedTime);
      }
  }, [currentSelectedTime, isDumbMode]);

  // Smart Mode: Fetch appointments
  const fetchAppointments = useCallback(async (date) => {
    if (!date || isDumbMode) return;
    setInternalLoading(true);
    try {
      const dayStart = format(date, 'yyyy-MM-dd 00:00:00');
      const dayEnd = format(date, 'yyyy-MM-dd 23:59:59');

      const { data, error } = await supabase
        .from('agendamentos')
        .select('data_agendamento, servicos(tempo_duracao_minutos)')
        .gte('data_agendamento', dayStart)
        .lte('data_agendamento', dayEnd);
      
      if (error) {
        console.error("Error fetching appointments:", error);
        setExistingAppointments([]);
      } else {
        setExistingAppointments(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error("Unexpected error fetching appointments:", err);
      setExistingAppointments([]);
    } finally {
      setInternalLoading(false);
    }
  }, [isDumbMode]);

  useEffect(() => {
    if (!isDumbMode) {
      fetchAppointments(selectedDate);
    }
  }, [selectedDate, fetchAppointments, isDumbMode]);

  // Calculate slots (Smart Mode) OR use passed slots (Dumb Mode)
  const slotsToRender = useMemo(() => {
    if (isDumbMode) {
      return propAvailableSlots || [];
    }

    if (!selectedDate || !service) {
      return [];
    }
    try {
      const duration = service.tempo_duracao_minutos || 60;
      const appointmentsToPass = Array.isArray(existingAppointments) ? existingAppointments : [];
      
      return getAvailableTimeSlots(selectedDate, appointmentsToPass, duration);
    } catch (e) {
      console.error("Error calculating available slots:", e);
      return [];
    }
  }, [selectedDate, existingAppointments, service, isDumbMode, propAvailableSlots]);

  // Rendering Logic
  if (!isDumbMode && !service) {
    return <div className="text-sm text-center p-4 bg-gray-50 rounded-md border border-dashed text-muted-foreground">Selecione um serviço para ver horários.</div>
  }
  
  if (!isDumbMode && !selectedDate) {
    return <div className="text-sm text-center p-4 bg-gray-50 rounded-md border border-dashed text-muted-foreground">Selecione uma data.</div>
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4 bg-gray-50 rounded-md border border-dashed">
        <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
        <span className="ml-2 text-sm text-muted-foreground">Verificando horários...</span>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-4 gap-2">
      {Array.isArray(slotsToRender) && slotsToRender.length > 0 ? slotsToRender.map((slot) => (
        <button
          key={slot}
          type="button"
          onClick={() => handleSlotClick(slot)}
          className={`px-2 py-2 text-xs sm:text-sm rounded-md transition-all border ${
            activeSelectedSlot === slot
              ? 'bg-blue-600 text-white border-blue-600 font-medium shadow-sm'
              : 'bg-white hover:bg-blue-50 border-gray-200 text-gray-700 hover:border-blue-200'
          }`}
        >
          {slot}
        </button>
      )) : (
        <div className="col-span-4 text-center py-4 bg-red-50 rounded-md border border-red-100">
          <p className="text-sm text-red-800 font-medium">Sem horários livres</p>
          <p className="text-xs text-red-600 mt-1">Tente selecionar outra data.</p>
        </div>
      )}
    </div>
  );
};

export default TimeSlotPicker;