
export enum PaymentStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
}

export interface Attendee {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  gender?: 'M' | 'F' | 'Other'; // Campo sesso opzionale
  status: PaymentStatus;
  registrationDate: string;
  paidAmount?: number;
  isPresent?: boolean;
}

export interface Expense {
  id: string;
  description: string;
  amount: number;
}

export interface ExtraExpense {
  id: string;
  description: string;
  amount: number;
  date: string;
}

export interface EventIdea {
  id: string;
  title: string;
  description: string;
  possibleDates: string[];
  possibleLocations: string[];
  createdAt: string;
}

export interface AppEvent {
  id: string;
  title: string;
  description: string;
  date: string;
  time: string;
  location: string;
  cost: number;
  maxAttendees?: number;
  expenses: Expense[];
  attendees: Attendee[];
  createdAt: string;
}

export interface OnbeDay extends AppEvent {}

export type ViewState = 
  | { type: 'DASHBOARD' }
  | { type: 'CREATE_EVENT' }
  | { type: 'EDIT_EVENT'; eventId: string }
  | { type: 'EVENT_DETAILS'; eventId: string }
  | { type: 'CREATE_ONBEDAY' }
  | { type: 'EDIT_ONBEDAY'; onbeDayId: string }
  | { type: 'ONBEDAY_DETAILS'; onbeDayId: string }
  | { type: 'SETTINGS' }
  | { type: 'PARTICIPANTS' }
  | { type: 'PARTICIPANT_DETAILS'; participantKey: string }
  | { type: 'IDEAS' }
  | { type: 'ONBEDAY_LIST' }
  | { type: 'ONBEVENTI_LIST' };
