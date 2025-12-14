import { AppEvent, Attendee, Expense, PaymentStatus } from '../types';
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, collection, getDocs, doc, setDoc, deleteDoc, getDoc, updateDoc } from "firebase/firestore";

const STORAGE_KEY = 'onbeventi_data_v1';
const FIREBASE_CONFIG_KEY = 'onbeventi_firebase_config';

// Helper per ottenere l'istanza DB se configurata
const getDb = () => {
  const configStr = localStorage.getItem(FIREBASE_CONFIG_KEY);
  if (!configStr) return null;

  try {
    const firebaseConfig = JSON.parse(configStr);
    // Evita di reinizializzare se esiste già
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

// --- LOCAL STORAGE HELPERS ---
const getLocalEvents = (): AppEvent[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    return [];
  }
};

const saveLocalEvents = (events: AppEvent[]) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
};

// --- UNIFIED ASYNC API ---

export const isCloudEnabled = (): boolean => {
  return !!localStorage.getItem(FIREBASE_CONFIG_KEY);
};

export const getEvents = async (): Promise<AppEvent[]> => {
  const db = getDb();
  
  if (db) {
    try {
      const querySnapshot = await getDocs(collection(db, "events"));
      const events: AppEvent[] = [];
      querySnapshot.forEach((doc) => {
        events.push(doc.data() as AppEvent);
      });
      return events;
    } catch (e) {
      console.error("Error fetching from Firebase", e);
      // Fallback or error handling could go here
      return [];
    }
  } else {
    // Local Storage (simulate async)
    return new Promise((resolve) => {
      resolve(getLocalEvents());
    });
  }
};

export const saveEvent = async (event: AppEvent): Promise<void> => {
  const db = getDb();
  
  if (db) {
    try {
      await setDoc(doc(db, "events", event.id), event);
    } catch (e) {
      console.error("Error saving to Firebase", e);
      throw e;
    }
  } else {
    const events = getLocalEvents();
    const existingIndex = events.findIndex((e) => e.id === event.id);
    if (existingIndex >= 0) {
      events[existingIndex] = event;
    } else {
      events.push(event);
    }
    saveLocalEvents(events);
  }
};

export const deleteEvent = async (eventId: string): Promise<void> => {
  const db = getDb();

  if (db) {
    await deleteDoc(doc(db, "events", eventId));
  } else {
    const events = getLocalEvents();
    const filteredEvents = events.filter((e) => e.id !== eventId);
    saveLocalEvents(filteredEvents);
  }
};

// Generic helper to update a specific event (used by attendee/expense functions)
const updateSingleEvent = async (eventId: string, updateFn: (event: AppEvent) => AppEvent): Promise<AppEvent | null> => {
  const db = getDb();

  if (db) {
    // Firebase: Fetch, Update, Save
    const docRef = doc(db, "events", eventId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const event = docSnap.data() as AppEvent;
      const updatedEvent = updateFn(event);
      await setDoc(docRef, updatedEvent);
      return updatedEvent;
    }
    return null;
  } else {
    // Local
    const events = getLocalEvents();
    const eventIndex = events.findIndex((e) => e.id === eventId);
    if (eventIndex === -1) return null;
    
    const updatedEvent = updateFn(events[eventIndex]);
    events[eventIndex] = updatedEvent;
    saveLocalEvents(events);
    return updatedEvent;
  }
};

export const addAttendee = async (eventId: string, attendee: Attendee): Promise<AppEvent | null> => {
  return updateSingleEvent(eventId, (event) => {
    if (event.maxAttendees && event.attendees.length >= event.maxAttendees) {
      return event; // Should handle error ideally
    }
    event.attendees.push(attendee);
    return event;
  });
};

export const updateAttendee = async (eventId: string, updatedAttendee: Attendee): Promise<AppEvent | null> => {
  return updateSingleEvent(eventId, (event) => {
    const index = event.attendees.findIndex(a => a.id === updatedAttendee.id);
    if (index !== -1) {
      event.attendees[index] = updatedAttendee;
    }
    return event;
  });
};

export const togglePaymentStatus = async (eventId: string, attendeeId: string): Promise<AppEvent | null> => {
  return updateSingleEvent(eventId, (event) => {
    const index = event.attendees.findIndex(a => a.id === attendeeId);
    if (index !== -1) {
      const currentStatus = event.attendees[index].status;
      event.attendees[index].status = currentStatus === PaymentStatus.PAID ? PaymentStatus.PENDING : PaymentStatus.PAID;
    }
    return event;
  });
};

export const deleteAttendee = async (eventId: string, attendeeId: string): Promise<AppEvent | null> => {
  return updateSingleEvent(eventId, (event) => {
    event.attendees = event.attendees.filter(a => a.id !== attendeeId);
    return event;
  });
};

export const addExpense = async (eventId: string, expense: Expense): Promise<AppEvent | null> => {
  return updateSingleEvent(eventId, (event) => {
    if (!event.expenses) event.expenses = [];
    event.expenses.push(expense);
    return event;
  });
};

export const updateExpense = async (eventId: string, updatedExpense: Expense): Promise<AppEvent | null> => {
  return updateSingleEvent(eventId, (event) => {
    if (event.expenses) {
      const index = event.expenses.findIndex(e => e.id === updatedExpense.id);
      if (index !== -1) {
        event.expenses[index] = updatedExpense;
      }
    }
    return event;
  });
};

export const deleteExpense = async (eventId: string, expenseId: string): Promise<AppEvent | null> => {
  return updateSingleEvent(eventId, (event) => {
    if (event.expenses) {
      event.expenses = event.expenses.filter(e => e.id !== expenseId);
    }
    return event;
  });
};