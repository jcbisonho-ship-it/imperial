import React from 'react';
import { Calendar as ShadCalendar } from "@/components/ui/calendar";
import { ptBR } from 'date-fns/locale';

const Calendar = ({ selectedDate, onDateChange }) => {
  const today = new Date();

  return (
    <ShadCalendar
      mode="single"
      selected={selectedDate}
      onSelect={onDateChange}
      className="rounded-md border"
      locale={ptBR}
      disabled={(date) => date < today || date.getDay() === 0} // Disable past dates and Sundays
    />
  );
};

export default Calendar;