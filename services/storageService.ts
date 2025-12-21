import { AppEvent, Attendee, Expense, ExtraExpense, PaymentStatus } from '../types';
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, collection, getDocs, doc, setDoc, deleteDoc, getDoc, updateDoc } from "firebase/firestore";

const STORAGE_KEY = 'onbeventi_data_v1';
const EXTRA_EXPENSES_KEY = 'onbeventi_extra_expenses_v1';
const FIREBASE_CONFIG_KEY = 'onbeventi_firebase_config';

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

// --- EVENTS ---
export const getEvents = async (): Promise<AppEvent[]> => {
  const db = getDb();
  if (db) {
    try {
      const querySnapshot = await getDocs(collection(db, "events"));
      const events: AppEvent[] = [];
      querySnapshot.forEach((doc) => { 
        const data = doc.data() as AppEvent;
        // Assicuriamoci che gli array esistano sempre
        data.attendees = data.attendees || [];
        data.expenses = data.expenses || [];
        events.push(data); 
      });
      return events;
    } catch (e) { return []; }
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
  const eventToSave = {
    ...event,
    attendees: event.attendees || [],
    expenses: event.expenses || []
  };
  if (db) {
    await setDoc(doc(db, "events", event.id), eventToSave);
  } else {
    const events = (await getEvents());
    const idx = events.findIndex(e => e.id === event.id);
    if (idx >= 0) events[idx] = eventToSave; else events.push(eventToSave);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
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

// --- EXTRA EXPENSES ---
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
    await setDoc(doc(db, "extra_expenses", expense.id), expense);
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

// --- HELPERS ---
const updateSingleEvent = async (eventId: string, updateFn: (event: AppEvent) => AppEvent): Promise<AppEvent | null> => {
  const db = getDb();
  if (db) {
    const docRef = doc(db, "events", eventId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const event = docSnap.data() as AppEvent;
      event.attendees = event.attendees || [];
      event.expenses = event.expenses || [];
      const updatedEvent = updateFn(event);
      await setDoc(docRef, updatedEvent);
      return updatedEvent;
    }
    return null;
  } else {
    const events = (await getEvents());
    const idx = events.findIndex(e => e.id === eventId);
    if (idx === -1) return null;
    const event = events[idx];
    event.attendees = event.attendees || [];
    event.expenses = event.expenses || [];
    const updated = updateFn(event);
    events[idx] = updated;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
    return updated;
  }
};

export const addAttendee = async (eventId: string, attendee: Attendee): Promise<AppEvent | null> => {
  return updateSingleEvent(eventId, (event) => {
    event.attendees = event.attendees || [];
    event.attendees.push(attendee);
    return event;
  });
};

export const updateAttendee = async (eventId: string, updatedAttendee: Attendee): Promise<AppEvent | null> => {
  return updateSingleEvent(eventId, (event) => {
    event.attendees = event.attendees || [];
    const index = event.attendees.findIndex(a => a.id === updatedAttendee.id);
    if (index !== -1) event.attendees[index] = updatedAttendee;
    return event;
  });
};

export const togglePaymentStatus = async (eventId: string, attendeeId: string): Promise<AppEvent | null> => {
  return updateSingleEvent(eventId, (event) => {
    event.attendees = event.attendees || [];
    const index = event.attendees.findIndex(a => a.id === attendeeId);
    if (index !== -1) {
      event.attendees[index].status = event.attendees[index].status === PaymentStatus.PAID ? PaymentStatus.PENDING : PaymentStatus.PAID;
    }
    return event;
  });
};

export const deleteAttendee = async (eventId: string, attendeeId: string): Promise<AppEvent | null> => {
  return updateSingleEvent(eventId, (event) => {
    event.attendees = (event.attendees || []).filter(a => a.id !== attendeeId);
    return event;
  });
};

export const addExpense = async (eventId: string, expense: Expense): Promise<AppEvent | null> => {
  return updateSingleEvent(eventId, (event) => {
    event.expenses = event.expenses || [];
    event.expenses.push(expense);
    return event;
  });
};

export const updateExpense = async (eventId: string, updatedExpense: Expense): Promise<AppEvent | null> => {
  return updateSingleEvent(eventId, (event) => {
    event.expenses = event.expenses || [];
    const index = event.expenses.findIndex(e => e.id === updatedExpense.id);
    if (index !== -1) event.expenses[index] = updatedExpense;
    return event;
  });
};

export const deleteExpense = async (eventId: string, expenseId: string): Promise<AppEvent | null> => {
  return updateSingleEvent(eventId, (event) => {
    event.expenses = (event.expenses || []).filter(e => e.id !== expenseId);
    return event;
  });
};

export const isCloudEnabled = (): boolean => !!localStorage.getItem(FIREBASE_CONFIG_KEY);
