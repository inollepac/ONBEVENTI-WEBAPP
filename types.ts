
export enum PaymentStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
}

export interface Attendee {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  status: PaymentStatus;
  registrationDate: string;
  paidAmount?: number; // Quota effettivamente pagata (se diversa dal costo evento)
  isPresent?: boolean; // Se il membro ha effettivamente partecipato (default: true)
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

export interface AppEvent {
  id: string;
  title: string;
  description: string;
  date: string;
  time: string;
  location: string;
  cost: number; // Ticket price per person
  maxAttendees?: number; // Optional capacity limit
  expenses: Expense[]; // List of operational costs
  attendees: Attendee[];
  createdAt: string;
}

export type ViewState = 
  | { type: 'DASHBOARD' }
  | { type: 'CREATE_EVENT' }
  | { type: 'EDIT_EVENT'; eventId: string }
  | { type: 'EVENT_DETAILS'; eventId: string }
  | { type: 'SETTINGS' }
  | { type: 'PARTICIPANTS' }
  | { type: 'PARTICIPANT_DETAILS'; participantKey: string };
