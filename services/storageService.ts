
import { AppEvent, Attendee, Expense, ExtraExpense, PaymentStatus } from '../types';
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, collection, getDocs, doc, setDoc, deleteDoc, getDoc, updateDoc } from "firebase/firestore";

const STORAGE_KEY = 'onbeventi_data_v1';
const EXTRA_EXPENSES_KEY = 'onbeventi_extra_expenses_v1';
const FIREBASE_CONFIG_KEY = 'onbeventi_firebase_config';

const cleanForFirebase = (obj: any): any => {
  if (Array.isArray(obj)) {
    return obj.map(cleanForFirebase);
  } else if (obj !== null && typeof obj === 'object') {
    return Object.fromEntries(
      Object.entries(obj)
        .filter(([_, v]) => v !== undefined)
        .map(([k, v]) => [k, cleanForFirebase(v)])
    );
  }
  return obj;
};

const getDb = () => {
  const configStr = localStorage.getItem(FIREBASE_CONFIG_KEY);
  if (!configStr) return null;
  try {
    const firebaseConfig = JSON.parse(configStr);
    const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
    return getFirestore(app);
  } catch (e) {
    console.error("Firebase config error", e);
    return null;
  }
};

export const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
};

export const getEvents = async (): Promise<AppEvent[]> => {
  const db = getDb();
  if (db) {
    try {
      const querySnapshot = await getDocs(collection(db, "events"));
      const events: AppEvent[] = [];
      querySnapshot.forEach((doc) => { 
        const data = doc.data() as AppEvent;
        data.attendees = data.attendees || [];
        data.expenses = data.expenses || [];
        events.push(data); 
      });
      return events;
    } catch (e) { 
      console.error("Firebase fetch error", e);
      return []; 
    }
  } else {
    const data = localStorage.getItem(STORAGE_KEY);
    const events: AppEvent[] = data ? JSON.parse(data) : [];
    return events.map(e => ({
      ...e,
      attendees: e.attendees || [],
      expenses: e.expenses || []
    }));
  }
};

export const saveEvent = async (event: AppEvent): Promise<void> => {
  const db = getDb();
  const eventToSave = cleanForFirebase({
    ...event,
    attendees: event.attendees || [],
    expenses: event.expenses || []
  });
  
  if (db) {
    await setDoc(doc(db, "events", event.id), eventToSave);
  } else {
    const events = (await getEvents());
    const idx = events.findIndex(e => e.id === event.id);
    if (idx >= 0) events[idx] = eventToSave; else events.push(eventToSave);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
  }
};

export const updateParticipantGlobally = async (oldKey: string, newData: { name: string, email: string, phone: string }): Promise<void> => {
  const events = await getEvents();
  
  for (const event of events) {
    let changed = false;
    const updatedAttendees = event.attendees.map(a => {
      const currentKey = (a.email || a.phone || a.name).toLowerCase().trim();
      if (currentKey === oldKey) {
        changed = true;
        return { ...a, ...newData };
      }
      return a;
    });

    if (changed) {
      const updatedEvent = { ...event, attendees: updatedAttendees };
      await saveEvent(updatedEvent);
    }
  }
};

export const deleteEvent = async (eventId: string): Promise<void> => {
  const db = getDb();
  if (db) {
    await deleteDoc(doc(db, "events", eventId));
  } else {
    const events = (await getEvents()).filter(e => e.id !== eventId);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
  }
};

export const getExtraExpenses = async (): Promise<ExtraExpense[]> => {
  const db = getDb();
  if (db) {
    try {
      const querySnapshot = await getDocs(collection(db, "extra_expenses"));
      const list: ExtraExpense[] = [];
      querySnapshot.forEach((doc) => { list.push(doc.data() as ExtraExpense); });
      return list;
    } catch (e) { return []; }
  } else {
    const data = localStorage.getItem(EXTRA_EXPENSES_KEY);
    return data ? JSON.parse(data) : [];
  }
};

export const saveExtraExpense = async (expense: ExtraExpense): Promise<void> => {
  const db = getDb();
  if (db) {
    await setDoc(doc(db, "extra_expenses", expense.id), cleanForFirebase(expense));
  } else {
    const list = await getExtraExpenses();
    list.push(expense);
    localStorage.setItem(EXTRA_EXPENSES_KEY, JSON.stringify(list));
  }
};

export const deleteExtraExpense = async (id: string): Promise<void> => {
  const db = getDb();
  if (db) {
    await deleteDoc(doc(db, "extra_expenses", id));
  } else {
    const list = (await getExtraExpenses()).filter(e => e.id !== id);
    localStorage.setItem(EXTRA_EXPENSES_KEY, JSON.stringify(list));
  }
};

export const addAttendee = async (eventId: string, attendee: Attendee): Promise<AppEvent | null> => {
  const events = await getEvents();
  const eventIdx = events.findIndex(e => e.id === eventId);
  if (eventIdx === -1) return null;
  
  const event = events[eventIdx];
  event.attendees.push(attendee);
  await saveEvent(event);
  return event;
};

export const updateAttendee = async (eventId: string, updatedAttendee: Attendee): Promise<AppEvent | null> => {
  const events = await getEvents();
  const eventIdx = events.findIndex(e => e.id === eventId);
  if (eventIdx === -1) return null;
  
  const event = events[eventIdx];
  const attendeeIdx = event.attendees.findIndex(a => a.id === updatedAttendee.id);
  if (attendeeIdx !== -1) {
    event.attendees[attendeeIdx] = updatedAttendee;
    await saveEvent(event);
  }
  return event;
};

export const togglePaymentStatus = async (eventId: string, attendeeId: string): Promise<AppEvent | null> => {
  const events = await getEvents();
  const eventIdx = events.findIndex(e => e.id === eventId);
  if (eventIdx === -1) return null;
  
  const event = events[eventIdx];
  const attendeeIdx = event.attendees.findIndex(a => a.id === attendeeId);
  if (attendeeIdx !== -1) {
    event.attendees[attendeeIdx].status = 
      event.attendees[attendeeIdx].status === PaymentStatus.PAID 
        ? PaymentStatus.PENDING 
        : PaymentStatus.PAID;
    await saveEvent(event);
  }
  return event;
};

export const deleteAttendee = async (eventId: string, attendeeId: string): Promise<AppEvent | null> => {
  const events = await getEvents();
  const eventIdx = events.findIndex(e => e.id === eventId);
  if (eventIdx === -1) return null;
  
  const event = events[eventIdx];
  event.attendees = event.attendees.filter(a => a.id !== attendeeId);
  await saveEvent(event);
  return event;
};

export const addExpense = async (eventId: string, expense: Expense): Promise<AppEvent | null> => {
  const events = await getEvents();
  const eventIdx = events.findIndex(e => e.id === eventId);
  if (eventIdx === -1) return null;
  
  const event = events[eventIdx];
  event.expenses.push(expense);
  await saveEvent(event);
  return event;
};

export const updateExpense = async (eventId: string, updatedExpense: Expense): Promise<AppEvent | null> => {
  const events = await getEvents();
  const eventIdx = events.findIndex(e => e.id === eventId);
  if (eventIdx === -1) return null;
  
  const event = events[eventIdx];
  const expenseIdx = event.expenses.findIndex(e => e.id === updatedExpense.id);
  if (expenseIdx !== -1) {
    event.expenses[expenseIdx] = updatedExpense;
    await saveEvent(event);
  }
  return event;
};

export const deleteExpense = async (eventId: string, expenseId: string): Promise<AppEvent | null> => {
  const events = await getEvents();
  const eventIdx = events.findIndex(e => e.id === eventId);
  if (eventIdx === -1) return null;
  
  const event = events[eventIdx];
  event.expenses = event.expenses.filter(e => e.id !== expenseId);
  await saveEvent(event);
  return event;
};

export const isCloudEnabled = (): boolean => !!localStorage.getItem(FIREBASE_CONFIG_KEY);
