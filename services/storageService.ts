import { AppEvent, Attendee, Expense, PaymentStatus } from '../types';

const STORAGE_KEY = 'onbeventi_data_v1';

// Semplificato per massima compatibilità
export const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
};

export const getEvents = (): AppEvent[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error("Error reading events", e);
    return [];
  }
};

export const saveEvent = (event: AppEvent): void => {
  const events = getEvents();
  const existingIndex = events.findIndex((e) => e.id === event.id);
  
  if (existingIndex >= 0) {
    events[existingIndex] = event;
  } else {
    events.push(event);
  }
  
  localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
};

export const deleteEvent = (eventId: string): void => {
  const events = getEvents();
  const filteredEvents = events.filter((e) => e.id !== eventId);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filteredEvents));
};

export const addAttendee = (eventId: string, attendee: Attendee): AppEvent | null => {
  const events = getEvents();
  const eventIndex = events.findIndex((e) => e.id === eventId);
  
  if (eventIndex === -1) return null;
  
  // Check max attendees
  const event = events[eventIndex];
  if (event.maxAttendees && event.attendees.length >= event.maxAttendees) {
    return null; // Capacity reached
  }

  events[eventIndex].attendees.push(attendee);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
  return events[eventIndex];
};

export const updateAttendee = (eventId: string, updatedAttendee: Attendee): AppEvent | null => {
  const events = getEvents();
  const eventIndex = events.findIndex((e) => e.id === eventId);
  if (eventIndex === -1) return null;

  const attendeeIndex = events[eventIndex].attendees.findIndex(a => a.id === updatedAttendee.id);
  if (attendeeIndex === -1) return null;

  events[eventIndex].attendees[attendeeIndex] = updatedAttendee;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
  return events[eventIndex];
};

export const togglePaymentStatus = (eventId: string, attendeeId: string): AppEvent | null => {
  const events = getEvents();
  const eventIndex = events.findIndex((e) => e.id === eventId);
  
  if (eventIndex === -1) return null;
  
  const attendeeIndex = events[eventIndex].attendees.findIndex(a => a.id === attendeeId);
  if (attendeeIndex === -1) return null;

  const currentStatus = events[eventIndex].attendees[attendeeIndex].status;
  events[eventIndex].attendees[attendeeIndex].status = 
    currentStatus === PaymentStatus.PAID ? PaymentStatus.PENDING : PaymentStatus.PAID;

  localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
  return events[eventIndex];
};

export const deleteAttendee = (eventId: string, attendeeId: string): AppEvent | null => {
  const events = getEvents();
  const eventIndex = events.findIndex((e) => e.id === eventId);
  
  if (eventIndex === -1) return null;

  const initialLength = events[eventIndex].attendees.length;
  events[eventIndex].attendees = events[eventIndex].attendees.filter(a => a.id !== attendeeId);
  
  // Check validation
  if (events[eventIndex].attendees.length === initialLength) {
    console.warn("Nessun partecipante eliminato. ID non trovato:", attendeeId);
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
  return events[eventIndex];
};

export const addExpense = (eventId: string, expense: Expense): AppEvent | null => {
  const events = getEvents();
  const eventIndex = events.findIndex((e) => e.id === eventId);
  
  if (eventIndex === -1) return null;

  if (!events[eventIndex].expenses) events[eventIndex].expenses = [];
  
  events[eventIndex].expenses.push(expense);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
  return events[eventIndex];
};

export const deleteExpense = (eventId: string, expenseId: string): AppEvent | null => {
  const events = getEvents();
  const eventIndex = events.findIndex((e) => e.id === eventId);
  
  if (eventIndex === -1) return null;

  if (events[eventIndex].expenses) {
    events[eventIndex].expenses = events[eventIndex].expenses.filter(e => e.id !== expenseId);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
  }
  return events[eventIndex];
};