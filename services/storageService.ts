
import { AppEvent, Attendee, EventIdea, Expense, ExtraExpense, OnbeDay, PaymentStatus } from '../types';
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, collection, getDocs, doc, setDoc, deleteDoc, getDoc, updateDoc } from "firebase/firestore";

const STORAGE_KEY = 'onbe_data_v1';
const ONBEDAY_KEY = 'onbe_onbeday_v1';
const EXTRA_EXPENSES_KEY = 'onbe_extra_expenses_v1';
const IDEAS_KEY = 'onbe_ideas_v1';
const FIREBASE_CONFIG_KEY = 'onbe_firebase_config';

// Migration logic for rebranding from onbeventi to onbe
const migrateData = () => {
  const keys = [
    { old: 'onbeventi_data_v1', new: STORAGE_KEY },
    { old: 'onbeventi_onbeday_v1', new: ONBEDAY_KEY },
    { old: 'onbeventi_extra_expenses_v1', new: EXTRA_EXPENSES_KEY },
    { old: 'onbeventi_ideas_v1', new: IDEAS_KEY },
    { old: 'onbeventi_firebase_config', new: FIREBASE_CONFIG_KEY },
    { old: 'onbeventi_api_key', new: 'onbe_api_key' },
    { old: 'onbeventi_vip_threshold', new: 'onbe_vip_threshold' },
    { old: 'onbeventi_regular_threshold', new: 'onbe_regular_threshold' },
  ];

  keys.forEach(({ old, new: newKey }) => {
    const oldData = localStorage.getItem(old);
    const newData = localStorage.getItem(newKey);
    
    // If old data exists and new data doesn't, migrate it
    if (oldData && !newData) {
      localStorage.setItem(newKey, oldData);
      // We keep the old data for safety for now, or we could remove it
      console.log(`Migrated data from ${old} to ${newKey}`);
    }
  });
};

// Run migration immediately
if (typeof window !== 'undefined') {
  migrateData();
}

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
    } catch (e: any) { 
      console.error("Firebase fetch error", e);
      if (e.code === 'permission-denied') {
        throw new Error('FIREBASE_PERMISSION_DENIED');
      }
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
    try {
      await setDoc(doc(db, "events", event.id), eventToSave);
    } catch (e: any) {
      if (e.code === 'permission-denied') throw new Error('FIREBASE_PERMISSION_DENIED');
      throw e;
    }
  } else {
    const events = (await getEvents());
    const idx = events.findIndex(e => e.id === event.id);
    if (idx >= 0) events[idx] = eventToSave; else events.push(eventToSave);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
  }
};

// Fix: Implementation of missing event management functions for attendees and expenses

export const addAttendee = async (eventId: string, attendee: Attendee): Promise<AppEvent | null> => {
  const events = await getEvents();
  const event = events.find(e => e.id === eventId);
  if (!event) return null;
  
  event.attendees = [...(event.attendees || []), attendee];
  await saveEvent(event);
  return event;
};

export const updateAttendee = async (eventId: string, attendee: Attendee): Promise<AppEvent | null> => {
  const events = await getEvents();
  const event = events.find(e => e.id === eventId);
  if (!event) return null;
  
  event.attendees = (event.attendees || []).map(a => a.id === attendee.id ? attendee : a);
  await saveEvent(event);
  return event;
};

export const deleteAttendee = async (eventId: string, attendeeId: string): Promise<AppEvent | null> => {
  const events = await getEvents();
  const event = events.find(e => e.id === eventId);
  if (!event) return null;
  
  event.attendees = (event.attendees || []).filter(a => a.id !== attendeeId);
  await saveEvent(event);
  return event;
};

export const togglePaymentStatus = async (eventId: string, attendeeId: string): Promise<AppEvent | null> => {
  const events = await getEvents();
  const event = events.find(e => e.id === eventId);
  if (!event) return null;
  
  event.attendees = (event.attendees || []).map(a => {
    if (a.id === attendeeId) {
      return { 
        ...a, 
        status: a.status === PaymentStatus.PAID ? PaymentStatus.PENDING : PaymentStatus.PAID 
      };
    }
    return a;
  });
  await saveEvent(event);
  return event;
};

export const addExpense = async (eventId: string, expense: Expense): Promise<AppEvent | null> => {
  const events = await getEvents();
  const event = events.find(e => e.id === eventId);
  if (!event) return null;
  
  event.expenses = [...(event.expenses || []), expense];
  await saveEvent(event);
  return event;
};

export const updateExpense = async (eventId: string, expense: Expense): Promise<AppEvent | null> => {
  const events = await getEvents();
  const event = events.find(e => e.id === eventId);
  if (!event) return null;
  
  event.expenses = (event.expenses || []).map(e => e.id === expense.id ? expense : e);
  await saveEvent(event);
  return event;
};

export const deleteExpense = async (eventId: string, expenseId: string): Promise<AppEvent | null> => {
  const events = await getEvents();
  const event = events.find(e => e.id === eventId);
  if (!event) return null;
  
  event.expenses = (event.expenses || []).filter(e => e.id !== expenseId);
  await saveEvent(event);
  return event;
};

export const updateParticipantGlobally = async (oldKey: string, newData: { name: string, email: string, phone: string }): Promise<void> => {
  const events = await getEvents();
  const onbeDays = await getOnbeDays();
  
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

  for (const onbeDay of onbeDays) {
    let changed = false;
    const updatedAttendees = onbeDay.attendees.map(a => {
      const currentKey = (a.email || a.phone || a.name).toLowerCase().trim();
      if (currentKey === oldKey) {
        changed = true;
        return { ...a, ...newData };
      }
      return a;
    });

    if (changed) {
      const updatedOnbeDay = { ...onbeDay, attendees: updatedAttendees };
      await saveOnbeDay(updatedOnbeDay);
    }
  }
};

export const deleteEvent = async (eventId: string): Promise<void> => {
  const db = getDb();
  if (db) {
    try {
      await deleteDoc(doc(db, "events", eventId));
    } catch (e: any) {
      if (e.code === 'permission-denied') throw new Error('FIREBASE_PERMISSION_DENIED');
      throw e;
    }
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
    } catch (e: any) { 
      if (e.code === 'permission-denied') throw new Error('FIREBASE_PERMISSION_DENIED');
      return []; 
    }
  } else {
    const data = localStorage.getItem(EXTRA_EXPENSES_KEY);
    return data ? JSON.parse(data) : [];
  }
};

export const saveExtraExpense = async (expense: ExtraExpense): Promise<void> => {
  const db = getDb();
  if (db) {
    try {
      await setDoc(doc(db, "extra_expenses", expense.id), cleanForFirebase(expense));
    } catch (e: any) {
      if (e.code === 'permission-denied') throw new Error('FIREBASE_PERMISSION_DENIED');
      throw e;
    }
  } else {
    const list = await getExtraExpenses();
    list.push(expense);
    localStorage.setItem(EXTRA_EXPENSES_KEY, JSON.stringify(list));
  }
};

export const deleteExtraExpense = async (id: string): Promise<void> => {
  const db = getDb();
  if (db) {
    try {
      await deleteDoc(doc(db, "extra_expenses", id));
    } catch (e: any) {
      if (e.code === 'permission-denied') throw new Error('FIREBASE_PERMISSION_DENIED');
      throw e;
    }
  } else {
    const list = (await getExtraExpenses()).filter(e => e.id !== id);
    localStorage.setItem(EXTRA_EXPENSES_KEY, JSON.stringify(list));
  }
};


export const addOnbeDayAttendee = async (onbeDayId: string, attendee: Attendee): Promise<OnbeDay | null> => {
  const list = await getOnbeDays();
  const item = list.find(e => e.id === onbeDayId);
  if (!item) return null;
  
  item.attendees = [...(item.attendees || []), attendee];
  await saveOnbeDay(item);
  return item;
};

export const updateOnbeDayAttendee = async (onbeDayId: string, attendee: Attendee): Promise<OnbeDay | null> => {
  const list = await getOnbeDays();
  const item = list.find(e => e.id === onbeDayId);
  if (!item) return null;
  
  item.attendees = (item.attendees || []).map(a => a.id === attendee.id ? attendee : a);
  await saveOnbeDay(item);
  return item;
};

export const deleteOnbeDayAttendee = async (onbeDayId: string, attendeeId: string): Promise<OnbeDay | null> => {
  const list = await getOnbeDays();
  const item = list.find(e => e.id === onbeDayId);
  if (!item) return null;
  
  item.attendees = (item.attendees || []).filter(a => a.id !== attendeeId);
  await saveOnbeDay(item);
  return item;
};

export const toggleOnbeDayPaymentStatus = async (onbeDayId: string, attendeeId: string): Promise<OnbeDay | null> => {
  const list = await getOnbeDays();
  const item = list.find(e => e.id === onbeDayId);
  if (!item) return null;
  
  item.attendees = (item.attendees || []).map(a => {
    if (a.id === attendeeId) {
      return { 
        ...a, 
        status: a.status === PaymentStatus.PAID ? PaymentStatus.PENDING : PaymentStatus.PAID 
      };
    }
    return a;
  });
  await saveOnbeDay(item);
  return item;
};

export const addOnbeDayExpense = async (onbeDayId: string, expense: Expense): Promise<OnbeDay | null> => {
  const list = await getOnbeDays();
  const item = list.find(e => e.id === onbeDayId);
  if (!item) return null;
  
  item.expenses = [...(item.expenses || []), expense];
  await saveOnbeDay(item);
  return item;
};

export const updateOnbeDayExpense = async (onbeDayId: string, expense: Expense): Promise<OnbeDay | null> => {
  const list = await getOnbeDays();
  const item = list.find(e => e.id === onbeDayId);
  if (!item) return null;
  
  item.expenses = (item.expenses || []).map(e => e.id === expense.id ? expense : e);
  await saveOnbeDay(item);
  return item;
};

export const deleteOnbeDayExpense = async (onbeDayId: string, expenseId: string): Promise<OnbeDay | null> => {
  const list = await getOnbeDays();
  const item = list.find(e => e.id === onbeDayId);
  if (!item) return null;
  
  item.expenses = (item.expenses || []).filter(e => e.id !== expenseId);
  await saveOnbeDay(item);
  return item;
};

export const isCloudEnabled = (): boolean => !!localStorage.getItem(FIREBASE_CONFIG_KEY);

export const getEventIdeas = async (): Promise<EventIdea[]> => {
  const db = getDb();
  if (db) {
    try {
      const querySnapshot = await getDocs(collection(db, "event_ideas"));
      const list: EventIdea[] = [];
      querySnapshot.forEach((doc) => { 
        const data = doc.data() as EventIdea;
        data.possibleDates = data.possibleDates || [];
        data.possibleLocations = data.possibleLocations || [];
        list.push(data); 
      });
      return list;
    } catch (e: any) { 
      if (e.code === 'permission-denied') throw new Error('FIREBASE_PERMISSION_DENIED');
      return []; 
    }
  } else {
    const data = localStorage.getItem(IDEAS_KEY);
    const list: EventIdea[] = data ? JSON.parse(data) : [];
    return list.map(i => ({
      ...i,
      possibleDates: i.possibleDates || [],
      possibleLocations: i.possibleLocations || []
    }));
  }
};

export const saveEventIdea = async (idea: EventIdea): Promise<void> => {
  const db = getDb();
  const ideaToSave = cleanForFirebase({
    ...idea,
    possibleDates: idea.possibleDates || [],
    possibleLocations: idea.possibleLocations || []
  });
  
  if (db) {
    try {
      await setDoc(doc(db, "event_ideas", idea.id), ideaToSave);
    } catch (e: any) {
      if (e.code === 'permission-denied') throw new Error('FIREBASE_PERMISSION_DENIED');
      throw e;
    }
  } else {
    const list = await getEventIdeas();
    const idx = list.findIndex(i => i.id === idea.id);
    if (idx >= 0) list[idx] = ideaToSave; else list.push(ideaToSave);
    localStorage.setItem(IDEAS_KEY, JSON.stringify(list));
  }
};

export const deleteEventIdea = async (id: string): Promise<void> => {
  const db = getDb();
  if (db) {
    try {
      await deleteDoc(doc(db, "event_ideas", id));
    } catch (e: any) {
      if (e.code === 'permission-denied') throw new Error('FIREBASE_PERMISSION_DENIED');
      throw e;
    }
  } else {
    const list = (await getEventIdeas()).filter(i => i.id !== id);
    localStorage.setItem(IDEAS_KEY, JSON.stringify(list));
  }
};

export const getOnbeDays = async (): Promise<OnbeDay[]> => {
  const db = getDb();
  if (db) {
    try {
      const querySnapshot = await getDocs(collection(db, "onbedays"));
      const list: OnbeDay[] = [];
      querySnapshot.forEach((doc) => { 
        const data = doc.data() as OnbeDay;
        data.attendees = data.attendees || [];
        data.expenses = data.expenses || [];
        list.push(data); 
      });
      return list;
    } catch (e: any) { 
      console.error("Firebase fetch error", e);
      if (e.code === 'permission-denied') {
        throw new Error('FIREBASE_PERMISSION_DENIED');
      }
      return []; 
    }
  } else {
    const data = localStorage.getItem(ONBEDAY_KEY);
    const list: OnbeDay[] = data ? JSON.parse(data) : [];
    return list.map(e => ({
      ...e,
      attendees: e.attendees || [],
      expenses: e.expenses || []
    }));
  }
};

export const saveOnbeDay = async (onbeDay: OnbeDay): Promise<void> => {
  const db = getDb();
  const toSave = cleanForFirebase({
    ...onbeDay,
    attendees: onbeDay.attendees || [],
    expenses: onbeDay.expenses || []
  });
  
  if (db) {
    try {
      await setDoc(doc(db, "onbedays", onbeDay.id), toSave);
    } catch (e: any) {
      if (e.code === 'permission-denied') throw new Error('FIREBASE_PERMISSION_DENIED');
      throw e;
    }
  } else {
    const list = await getOnbeDays();
    const idx = list.findIndex(e => e.id === onbeDay.id);
    if (idx >= 0) list[idx] = toSave; else list.push(toSave);
    localStorage.setItem(ONBEDAY_KEY, JSON.stringify(list));
  }
};

export const deleteOnbeDay = async (id: string): Promise<void> => {
  const db = getDb();
  if (db) {
    try {
      await deleteDoc(doc(db, "onbedays", id));
    } catch (e: any) {
      if (e.code === 'permission-denied') throw new Error('FIREBASE_PERMISSION_DENIED');
      throw e;
    }
  } else {
    const list = (await getOnbeDays()).filter(e => e.id !== id);
    localStorage.setItem(ONBEDAY_KEY, JSON.stringify(list));
  }
};
