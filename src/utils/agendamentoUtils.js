import { addMinutes, setHours, setMinutes, setSeconds, setMilliseconds, format, isValid } from 'date-fns';

/**
 * Generates available time slots for a given day, service duration, and existing appointments.
 * @param {Date} date - The selected date for the appointment.
 * @param {Array} existingAppointments - An array of existing appointments for that day.
 * @param {number} serviceDuration - The duration of the service in minutes.
 * @param {number} [maxCapacity=3] - The maximum number of simultaneous appointments.
 * @param {number} [startHour=8] - The start hour of the workday (e.g., 8 for 8:00 AM).
 * @param {number} [endHour=18] - The end hour of the workday (e.g., 18 for 6:00 PM).
 * @param {number} [slotInterval=30] - The interval between potential start times in minutes.
 */
export const getAvailableTimeSlots = (
  date,
  existingAppointments,
  serviceDuration,
  maxCapacity = 3,
  startHour = 8,
  endHour = 18,
  slotInterval = 30
) => {
  try {
    // 1. Defensive Check: Date
    if (!date) {
      console.warn('getAvailableTimeSlots: No date provided');
      return [];
    }
    const dateObj = new Date(date);
    if (!isValid(dateObj)) {
      console.warn('getAvailableTimeSlots: Invalid date provided', date);
      return [];
    }

    // 2. Defensive Check: existingAppointments must be an array. 
    // Prevents "is not iterable" errors if null/undefined is passed.
    let appointments = [];
    if (Array.isArray(existingAppointments)) {
      appointments = existingAppointments;
    } else {
      // Log warning if we received something that isn't an array (unless it's explicitly null/undefined which we treat as empty)
      if (existingAppointments !== null && existingAppointments !== undefined) {
         console.warn('getAvailableTimeSlots: existingAppointments was not an array. Value:', existingAppointments);
      }
    }

    // 3. Defensive Check: serviceDuration must be a valid positive number. Default to 60 if invalid.
    const duration = (typeof serviceDuration === 'number' && serviceDuration > 0) 
      ? serviceDuration 
      : 60;

    const availableSlots = [];
    const now = new Date();
    
    // Calculate working hours for the selected date
    let dayStart = setMilliseconds(setSeconds(setMinutes(setHours(dateObj, startHour), 0), 0), 0);
    const dayEnd = setMilliseconds(setSeconds(setMinutes(setHours(dateObj, endHour), 0), 0), 0);

    let currentSlot = dayStart;

    while (currentSlot < dayEnd) {
      const slotEnd = addMinutes(currentSlot, duration);

      // 1. Past Time Check: Skip slots that are in the past (relevant for "today")
      if (slotEnd < now) {
        currentSlot = addMinutes(currentSlot, slotInterval);
        continue;
      }
      
      // 2. Business Hours Check: Service must finish before closing time
      if (slotEnd > dayEnd) {
        break;
      }

      // 3. Capacity Check: Count overlapping appointments
      let overlappingAppointments = 0;
      
      for (const app of appointments) {
        // Skip malformed appointment data
        if (!app || !app.data_agendamento) continue;

        const appStart = new Date(app.data_agendamento);
        if (!isValid(appStart)) continue;

        // Get appointment duration (default to 60 mins if missing)
        const appDuration = app.servicos?.tempo_duracao_minutos || 60;
        const appEnd = addMinutes(appStart, appDuration);

        // Check for time overlap: (StartA < EndB) and (EndA > StartB)
        if (currentSlot < appEnd && slotEnd > appStart) {
          overlappingAppointments++;
        }
      }
      
      // If we haven't reached max capacity for this slot, add it to available list
      if (overlappingAppointments < maxCapacity) {
        availableSlots.push(format(currentSlot, 'HH:mm'));
      }

      // Move to next slot
      currentSlot = addMinutes(currentSlot, slotInterval);
    }
    
    return availableSlots;
  } catch (error) {
    console.error('Error in getAvailableTimeSlots:', error);
    return [];
  }
};