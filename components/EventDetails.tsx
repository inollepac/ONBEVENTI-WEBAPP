
import React, { useState, useMemo } from 'react';
import { AppEvent, Attendee, Expense, PaymentStatus } from '../types';
import { Button } from './Button';
import { 
  ArrowLeft, UserPlus, CheckCircle, XCircle, Trash2, 
  Calendar, MapPin, Euro, Clock, Edit2, Plus, 
  TrendingUp, TrendingDown, Wallet, Users, Save, X, AlertTriangle, Phone, Mail, UserCheck, Tag, UserMinus, UserX
} from 'lucide-react';
import { 
  addAttendee, togglePaymentStatus, deleteAttendee, 
  deleteEvent, addExpense, deleteExpense, updateAttendee, updateExpense, generateId
} from '../services/storageService';

interface EventDetailsProps {
  event: AppEvent;
  allEvents: AppEvent[];
  onBack: () => void;
  onUpdate: (updatedEvent: AppEvent) => void;
  onDelete: () => void;
  onEditEvent: () => void;
  onParticipantClick: (participantKey: string) => void;
}

export const EventDetails: React.FC<EventDetailsProps> = ({ 
  event, 
  allEvents, 
  onBack, 
  onUpdate, 
  onDelete, 
  onEditEvent,
  onParticipantClick
}) => {
  const [showAddAttendee, setShowAddAttendee] = useState(false);
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const [newAttendee, setNewAttendee] = useState({ name: '', email: '', phone: '', paidAmount: '', gender: '' });
  const [suggestions, setSuggestions] = useState<Attendee[]>([]);
  
  const [editingAttendeeId, setEditingAttendeeId] = useState<string | null>(null);
  const [editAttendeeData, setEditAttendeeData] = useState({ name: '', email: '', phone: '', paidAmount: '', gender: '' });

  const [newExpense, setNewExpense] = useState({ description: '', amount: '' });
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [editExpenseData, setEditExpenseData] = useState({ description: '', amount: '' });

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    type: 'DELETE_EVENT' | 'DELETE_ATTENDEE' | 'DELETE_EXPENSE' | null;
    itemId?: string;
    message: string;
  }>({
    isOpen: false,
    type: null,
    message: ''
  });

  const globalParticipants = useMemo(() => {
    const map = new Map<string, Attendee>();
    (allEvents || []).forEach(ev => {
      (ev.attendees || []).forEach(at => {
        const key = (at.email || at.phone || at.name).toLowerCase().trim();
        map.set(key, at);
      });
    });
    return Array.from(map.values());
  }, [allEvents]);

  const handleNameChange = (val: string) => {
    setNewAttendee(prev => ({ ...prev, name: val }));
    if (val.length >= 2) {
      const filtered = globalParticipants.filter(p => 
        p.name.toLowerCase().includes(val.toLowerCase())
      ).slice(0, 5);
      setSuggestions(filtered);
    } else {
      setSuggestions([]);
    }
  };

  const selectSuggestion = (p: Attendee) => {
    setNewAttendee({
      name: p.name,
      email: p.email || '',
      phone: p.phone || '',
      gender: p.gender || '',
      paidAmount: '' 
    });
    setSuggestions([]);
  };

  const handleAddAttendee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAttendee.name.trim()) return;
    
    setLoading(true);
    
    if (event.maxAttendees && (event.attendees || []).length >= event.maxAttendees) {
      alert("Numero massimo di partecipanti raggiunto.");
      setLoading(false);
      return;
    }

    const attendee: Attendee = {
      id: generateId(),
      name: newAttendee.name,
      email: newAttendee.email,
      phone: newAttendee.phone,
      gender: (newAttendee.gender as 'M' | 'F' | 'Other') || undefined,
      paidAmount: newAttendee.paidAmount ? Number(newAttendee.paidAmount) : undefined,
      status: PaymentStatus.PENDING,
      registrationDate: new Date().toISOString(),
      isPresent: true
    };
    
    try {
      const updated = await addAttendee(event.id, attendee);
      if (updated) {
        onUpdate(updated);
        setNewAttendee({ name: '', email: '', phone: '', paidAmount: '', gender: '' });
        setShowAddAttendee(false);
        setSuggestions([]);
      }
    } catch (err) {
      console.error("Error adding attendee:", err);
      alert("Errore durante l'aggiunta.");
    } finally {
      setLoading(false);
    }
  };

  const startEditingAttendee = (attendee: Attendee) => {
    setEditingAttendeeId(attendee.id);
    setEditAttendeeData({ 
      name: attendee.name, 
      email: attendee.email || '', 
      phone: attendee.phone || '',
      gender: attendee.gender || '',
      paidAmount: attendee.paidAmount !== undefined ? attendee.paidAmount.toString() : ''
    });
  };

  const cancelEditingAttendee = () => {
    setEditingAttendeeId(null);
    setEditAttendeeData({ name: '', email: '', phone: '', paidAmount: '', gender: '' });
  };

  const saveEditedAttendee = async (originalAttendee: Attendee) => {
    const updatedAttendee: Attendee = {
      ...originalAttendee,
      name: editAttendeeData.name,
      email: editAttendeeData.email,
      phone: editAttendeeData.phone,
      gender: (editAttendeeData.gender as 'M' | 'F' | 'Other') || undefined,
      paidAmount: editAttendeeData.paidAmount ? Number(editAttendeeData.paidAmount) : undefined
    };
    setLoading(true);
    try {
      const updatedEvent = await updateAttendee(event.id, updatedAttendee);
      if (updatedEvent) {
        onUpdate(updatedEvent);
        setEditingAttendeeId(null);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleTogglePayment = async (attendeeId: string) => {
    setLoading(true);
    try {
      const updated = await togglePaymentStatus(event.id, attendeeId);
      if (updated) onUpdate(updated);
    } finally {
      setLoading(false);
    }
  };

  const handleTogglePresence = async (attendee: Attendee) => {
    setLoading(true);
    const updatedAttendee = { ...attendee, isPresent: attendee.isPresent === false ? true : false };
    try {
      const updatedEvent = await updateAttendee(event.id, updatedAttendee);
      if (updatedEvent) onUpdate(updatedEvent);
    } finally {
      setLoading(false);
    }
  };

  const requestDeleteAttendee = (attendeeId: string) => {
    setConfirmModal({ isOpen: true, type: 'DELETE_ATTENDEE', itemId: attendeeId, message: 'Sei sicuro di voler rimuovere questo membro dalla lista?' });
  };
  const requestDeleteExpense = (expenseId: string) => {
    setConfirmModal({ isOpen: true, type: 'DELETE_EXPENSE', itemId: expenseId, message: 'Sei sicuro di voler eliminare questa voce di spesa?' });
  };
  const requestDeleteEvent = () => {
    setConfirmModal({ isOpen: true, type: 'DELETE_EVENT', message: 'ATTENZIONE: Stai per eliminare definitivamente questo evento. Sei sicuro?' });
  };

  const executeDelete = async () => {
    setLoading(true);
    try {
      if (confirmModal.type === 'DELETE_EVENT') {
        await deleteEvent(event.id);
        onDelete();
      } else if (confirmModal.type === 'DELETE_ATTENDEE' && confirmModal.itemId) {
        const updated = await deleteAttendee(event.id, confirmModal.itemId);
        if (updated) onUpdate(updated);
      } else if (confirmModal.type === 'DELETE_EXPENSE' && confirmModal.itemId) {
        const updated = await deleteExpense(event.id, confirmModal.itemId);
        if (updated) onUpdate(updated);
      }
    } finally {
      setLoading(false);
      setConfirmModal({ isOpen: false, type: null, message: '' });
    }
  };

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const expense: Expense = { id: generateId(), description: newExpense.description, amount: Number(newExpense.amount) };
    try {
      const updated = await addExpense(event.id, expense);
      if (updated) {
        onUpdate(updated);
        setNewExpense({ description: '', amount: '' });
        setShowAddExpense(false);
      }
    } finally { setLoading(false); }
  };

  const startEditingExpense = (expense: Expense) => {
    setEditingExpenseId(expense.id);
    setEditExpenseData({ description: expense.description, amount: expense.amount.toString() });
  };

  const saveEditedExpense = async (originalExpense: Expense) => {
    if (!editExpenseData.description || !editExpenseData.amount) return;
    const updatedExpense: Expense = { ...originalExpense, description: editExpenseData.description, amount: Number(editExpenseData.amount) };
    setLoading(true);
    try {
      const updatedEvent = await updateExpense(event.id, updatedExpense);
      if (updatedEvent) {
        onUpdate(updatedEvent);
        setEditingExpenseId(null);
      }
    } finally { setLoading(false); }
  };

  const attendees = event.attendees || [];
  const expenses = event.expenses || [];
  
  const totalCollected = attendees.reduce((acc, a) => {
    if (a.status === PaymentStatus.PAID) {
      return acc + (a.paidAmount !== undefined ? a.paidAmount : event.cost);
    }
    return acc;
  }, 0);

  const totalExpenses = expenses.reduce((acc, curr) => acc + curr.amount, 0);
  const netProfit = totalCollected - totalExpenses;
  const isProfitPositive = netProfit >= 0;
  
  const occupancyPercentage = event.maxAttendees ? Math.min((attendees.length / event.maxAttendees) * 100, 100) : 0;

  return (
    <div className="space-y-8 animate-fade-in pb-10 relative">
      {loading && <div className="fixed inset-0 z-[60] bg-white/50 backdrop-blur-sm flex items-center justify-center"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-pink-600"></div></div>}

      {confirmModal.isOpen && (
        <div className="fixed inset-0 bg-indigo-950/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 animate-scale-in border border-gray-100">
            <div className="flex flex-col items-center text-center mb-6">
              <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center mb-4 text-red-500"><AlertTriangle className="w-7 h-7" /></div>
              <h3 className="text-xl font-bold text-gray-900">Conferma Eliminazione</h3>
              <p className="text-gray-500 mt-2 text-sm leading-relaxed">{confirmModal.message}</p>
            </div>
            <div className="flex gap-3 justify-center">
              <Button variant="secondary" onClick={() => setConfirmModal({ isOpen: false, type: null, message: '' })} className="w-full">Annulla</Button>
              <Button variant="danger" onClick={executeDelete} className="w-full shadow-red-200" isLoading={loading}>Elimina</Button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col lg:flex-row lg:items-center gap-6 justify-between bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div className="flex items-start gap-5">
          <button onClick={onBack} className="p-2.5 bg-gray-50 hover:bg-gray-100 text-gray-600 rounded-xl transition-colors mt-1" type="button"><ArrowLeft className="w-5 h-5" /></button>
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">{event.title}</h1>
            <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-gray-500 font-medium">
              <span className="flex items-center bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full"><Calendar className="w-3.5 h-3.5 mr-1.5" /> {new Date(event.date).toLocaleDateString('it-IT')}</span>
              <span className="flex items-center bg-gray-100 text-gray-600 px-3 py-1 rounded-full"><MapPin className="w-3.5 h-3.5 mr-1.5" /> {event.location}</span>
            </div>
          </div>
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={onEditEvent} type="button"><Edit2 className="w-4 h-4 mr-2" /> Modifica</Button>
          <Button variant="danger" onClick={requestDeleteEvent} type="button">Elimina Evento</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-green-50 rounded-bl-full -mr-5 -mt-5"></div>
          <div className="relative">
             <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-green-100 text-green-600 rounded-lg"><TrendingUp className="w-5 h-5" /></div>
                <p className="text-sm font-semibold text-gray-500 uppercase">Incasso Reale</p>
              </div>
              <p className="text-3xl font-extrabold text-gray-900">€ {totalCollected.toLocaleString('it-IT', { minimumFractionDigits: 2 })}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-red-50 rounded-bl-full -mr-5 -mt-5"></div>
          <div className="relative">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-red-100 text-red-600 rounded-lg"><TrendingDown className="w-5 h-5" /></div>
              <p className="text-sm font-semibold text-gray-500 uppercase">Spese</p>
            </div>
            <p className="text-3xl font-extrabold text-gray-900">€ {totalExpenses.toLocaleString('it-IT', { minimumFractionDigits: 2 })}</p>
          </div>
        </div>
        <div className={`p-6 rounded-2xl shadow-lg border relative overflow-hidden flex flex-col justify-center ${isProfitPositive ? 'bg-indigo-950 border-indigo-900 text-white' : 'bg-red-50 border-red-100 text-red-900'}`}>
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-2">
              <div className={`p-2 rounded-lg ${isProfitPositive ? 'bg-white/10 text-pink-400' : 'bg-red-100 text-red-600'}`}><Wallet className="w-5 h-5" /></div>
              <p className={`text-sm font-semibold uppercase ${isProfitPositive ? 'text-indigo-200' : 'text-red-700'}`}>Profitto Netto</p>
            </div>
            <p className="text-4xl font-black tracking-tight">€ {netProfit.toLocaleString('it-IT', { minimumFractionDigits: 2 })}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="space-y-8">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center"><span className="w-1.5 h-6 bg-pink-500 rounded-full mr-3"></span>Dettagli</h3>
            <div className="space-y-5">
              <div className="flex justify-between items-center border-b border-gray-50 pb-3"><span className="text-gray-500 text-sm flex items-center gap-2 font-medium"><Clock className="w-4 h-4 text-gray-400" /> Orario</span><span className="font-semibold text-gray-800 bg-gray-50 px-3 py-1 rounded-md">{event.time}</span></div>
              <div className="flex justify-between items-center border-b border-gray-50 pb-3"><span className="text-gray-500 text-sm flex items-center gap-2 font-medium"><Euro className="w-4 h-4 text-gray-400" /> Costo Biglietto</span><span className="font-semibold text-gray-800 bg-gray-50 px-3 py-1 rounded-md">€ {event.cost}</span></div>
              <div className="flex justify-between items-center border-b border-gray-50 pb-3"><span className="text-gray-500 text-sm flex items-center gap-2 font-medium"><Users className="w-4 h-4 text-gray-400" /> Max Partecipanti</span><span className="font-semibold text-gray-800 bg-gray-50 px-3 py-1 rounded-md">{event.maxAttendees ? event.maxAttendees : '∞'}</span></div>
              <div className="pt-4">
                <div className="flex justify-between text-xs font-bold text-gray-500 uppercase mb-2"><span>Occupazione</span><span>{event.maxAttendees ? Math.round(occupancyPercentage) : 100}%</span></div>
                <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden"><div className="h-3 rounded-full bg-gradient-to-r from-pink-500 to-yellow-400 shadow-sm transition-all duration-500" style={{ width: `${event.maxAttendees ? occupancyPercentage : 100}%` }}></div></div>
                <p className="text-xs text-center mt-2 text-gray-400">{attendees.length} iscritti su {event.maxAttendees ? event.maxAttendees : 'illimitati'}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50"><h3 className="font-bold text-gray-900">Spese & Costi</h3><button onClick={() => setShowAddExpense(!showAddExpense)} className="text-xs text-white bg-indigo-900 hover:bg-indigo-800 px-3 py-1.5 rounded-full font-medium flex items-center transition-colors shadow-sm" type="button"><Plus className="w-3 h-3 mr-1" /> Nuova Spesa</button></div>
            {showAddExpense && (
              <div className="p-5 bg-indigo-50 border-b border-indigo-100 animate-slide-down">
                 <form onSubmit={handleAddExpense} className="flex flex-col gap-3">
                    <input type="text" placeholder="Descrizione" className="w-full text-sm px-3 py-2 border-indigo-200 rounded-lg focus:ring-2 focus:ring-pink-500" required value={newExpense.description} onChange={e => setNewExpense(prev => ({...prev, description: e.target.value}))} />
                    <div className="flex gap-2">
                      <input type="number" placeholder="Importo (€)" className="w-full text-sm px-3 py-2 border-indigo-200 rounded-lg focus:ring-2 focus:ring-pink-500" required min="0" step="0.01" value={newExpense.amount} onChange={e => setNewExpense(prev => ({...prev, amount: e.target.value}))} />
                      <Button type="submit" className="whitespace-nowrap text-xs py-1" isLoading={loading}>Salva</Button>
                    </div>
                 </form>
              </div>
            )}
            <div className="divide-y divide-gray-100">
              {expenses.length === 0 ? (<p className="p-6 text-center text-sm text-gray-400">Nessuna spesa registrata.</p>) : (
                expenses.map(exp => {
                  const isEditing = editingExpenseId === exp.id;
                  return (
                    <div key={exp.id} className={`p-4 flex flex-col sm:flex-row justify-between sm:items-center gap-2 group transition-colors ${isEditing ? 'bg-indigo-50/50' : 'hover:bg-gray-50'}`}>
                      {isEditing ? (
                        <div className="flex-1 flex gap-2"><input className="flex-1 border border-pink-300 rounded-md text-sm px-3 py-1.5" value={editExpenseData.description} onChange={e => setEditExpenseData(p => ({...p, description: e.target.value}))} /><input className="w-24 border border-pink-300 rounded-md text-sm px-3 py-1.5" type="number" value={editExpenseData.amount} onChange={e => setEditExpenseData(p => ({...p, amount: e.target.value}))} /><button onClick={() => saveEditedExpense(exp)} className="bg-green-500 p-1.5 rounded-lg text-white"><Save className="w-4 h-4" /></button></div>
                      ) : (
                        <>
                          <div className="flex-1 min-w-0 mr-2"><p className="text-sm font-semibold text-gray-800 break-words">{exp.description}</p></div>
                          <div className="flex items-center gap-3"><p className="text-sm font-bold text-red-500 bg-red-50 px-2 py-1 rounded">- €{exp.amount}</p><div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity"><button onClick={() => startEditingExpense(exp)} className="p-1.5 text-gray-300 hover:text-indigo-600 rounded-full"><Edit2 className="w-4 h-4" /></button><button onClick={() => requestDeleteExpense(exp.id)} className="p-1.5 text-gray-300 hover:text-red-500 rounded-full"><Trash2 className="w-4 h-4" /></button></div></div>
                        </>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 flex flex-col h-full">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col h-full overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-white">
              <div className="flex items-center gap-3"><div className="p-2 bg-pink-100 text-pink-600 rounded-lg"><Users className="w-5 h-5" /></div><div><h2 className="font-bold text-gray-900 text-lg">Lista Membri Iscritti</h2><p className="text-xs text-gray-500">Gestisci partecipazioni e pagamenti</p></div></div>
              <Button onClick={() => setShowAddAttendee(!showAddAttendee)} variant="primary" className="text-xs" disabled={!!event.maxAttendees && attendees.length >= event.maxAttendees} type="button"><UserPlus className="w-4 h-4 mr-2" /> Aggiungi</Button>
            </div>

            {showAddAttendee && (
              <div className="p-6 bg-gradient-to-r from-indigo-50 to-pink-50 border-b border-pink-100 animate-slide-down">
                <h4 className="text-sm font-bold text-indigo-900 mb-4 uppercase tracking-wide">Nuovo Partecipante</h4>
                <form onSubmit={handleAddAttendee} className="space-y-4 relative">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="relative">
                      <input type="text" required className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-pink-500" value={newAttendee.name} onChange={e => handleNameChange(e.target.value)} placeholder="Nome Cognome *" autoComplete="off" />
                      {suggestions.length > 0 && (
                        <div className="absolute z-[70] left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-2xl overflow-hidden animate-scale-in">
                           <ul className="divide-y divide-gray-50">
                              {suggestions.map((p, idx) => (<li key={idx}><button type="button" onClick={() => selectSuggestion(p)} className="w-full text-left px-4 py-3 hover:bg-pink-50 flex items-center justify-between group"><div><p className="text-sm font-bold text-gray-900">{p.name}</p></div><Plus className="w-3 h-3 text-gray-400 group-hover:text-pink-600" /></button></li>))}
                           </ul>
                        </div>
                      )}
                    </div>
                    <input type="email" className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm" value={newAttendee.email} onChange={e => setNewAttendee(prev => ({ ...prev, email: e.target.value }))} placeholder="Email" />
                    <input type="tel" className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm" value={newAttendee.phone} onChange={e => setNewAttendee(prev => ({ ...prev, phone: e.target.value }))} placeholder="Telefono" />
                    <select 
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-pink-500 bg-white"
                      value={newAttendee.gender}
                      onChange={e => setNewAttendee(prev => ({ ...prev, gender: e.target.value }))}
                    >
                      <option value="">Sesso (Opzionale)</option>
                      <option value="M">Maschio</option>
                      <option value="F">Femmina</option>
                      <option value="Other">Altro / N.D.</option>
                    </select>
                  </div>
                  <div className="flex justify-between items-center pt-2">
                    <input type="number" step="0.01" className="max-w-[200px] px-4 py-2 border border-gray-200 rounded-lg text-sm font-bold text-pink-600 bg-white" value={newAttendee.paidAmount} onChange={e => setNewAttendee(prev => ({ ...prev, paidAmount: e.target.value }))} placeholder={`Quota (Std: €${event.cost})`} />
                    <div className="flex gap-2"><Button type="button" variant="ghost" onClick={() => setShowAddAttendee(false)}>Chiudi</Button><Button type="submit" isLoading={loading}>Inserisci</Button></div>
                  </div>
                </form>
              </div>
            )}

            <div className="overflow-x-auto flex-1">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="text-xs font-semibold text-gray-300 bg-indigo-950 border-b border-indigo-900">
                    <th className="px-6 py-4">MEMBRO</th>
                    <th className="px-6 py-4">CONTATTI</th>
                    <th className="px-6 py-4 text-center">QUOTA PAGATA</th>
                    <th className="px-6 py-4 text-center">STATO</th>
                    <th className="px-6 py-4 text-right">AZIONI</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {attendees.length === 0 ? (
                    <tr><td colSpan={5} className="px-6 py-16 text-center text-gray-400">La lista è vuota</td></tr>
                  ) : (
                    attendees.map(attendee => {
                      const isEditing = editingAttendeeId === attendee.id;
                      const isAbsent = attendee.isPresent === false;
                      const hasCustomAmount = attendee.paidAmount !== undefined && attendee.paidAmount !== event.cost;
                      const displayAmount = attendee.paidAmount !== undefined ? attendee.paidAmount : event.cost;
                      const participantKey = (attendee.email || attendee.phone || attendee.name).toLowerCase().trim();
                      
                      return (
                        <tr 
                          key={attendee.id} 
                          className={`group transition-colors ${isEditing ? 'bg-pink-50' : 'hover:bg-indigo-50/50 cursor-pointer'} ${isAbsent ? 'opacity-60 grayscale-[0.5]' : ''}`}
                          onClick={() => !isEditing && onParticipantClick(participantKey)}
                          title={!isEditing ? "Vai alla scheda membro" : ""}
                        >
                          <td className="px-6 py-4">
                            {isEditing ? (
                              <div className="space-y-2" onClick={e => e.stopPropagation()}>
                                <input className="w-full border border-pink-300 rounded-md text-sm px-3 py-1.5" value={editAttendeeData.name} onChange={e => setEditAttendeeData(p => ({...p, name: e.target.value}))} />
                                <select className="w-full border border-pink-300 rounded-md text-sm px-3 py-1.5 bg-white" value={editAttendeeData.gender} onChange={e => setEditAttendeeData(p => ({...p, gender: e.target.value}))}>
                                  <option value="">Sesso</option>
                                  <option value="M">Maschio</option>
                                  <option value="F">Femmina</option>
                                  <option value="Other">Altro</option>
                                </select>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <span className={`font-semibold text-gray-900 ${isAbsent ? 'line-through' : ''}`}>{attendee.name}</span>
                                {attendee.gender && (
                                  <span className={`text-[8px] px-1 rounded font-black ${attendee.gender === 'M' ? 'bg-blue-100 text-blue-600' : attendee.gender === 'F' ? 'bg-pink-100 text-pink-600' : 'bg-gray-100 text-gray-500'}`}>
                                    {attendee.gender}
                                  </span>
                                )}
                                {hasCustomAmount && <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-bold uppercase flex items-center gap-0.5"><Tag className="w-2.5 h-2.5" /> Special</span>}
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 text-xs text-gray-500">
                            {isEditing ? (
                              <div className="flex flex-col gap-1" onClick={e => e.stopPropagation()}><input className="border rounded px-2 py-1" placeholder="Email" value={editAttendeeData.email} onChange={e => setEditAttendeeData(p => ({...p, email: e.target.value}))} /><input className="border rounded px-2 py-1" placeholder="Telefono" value={editAttendeeData.phone} onChange={e => setEditAttendeeData(p => ({...p, phone: e.target.value}))} /></div>
                            ) : (
                              <div>{attendee.email && <div className="flex items-center mb-0.5"><Mail className="w-3 h-3 mr-1" /> {attendee.email}</div>}{attendee.phone && <div className="flex items-center"><Phone className="w-3 h-3 mr-1" /> {attendee.phone}</div>}</div>
                            )}
                          </td>
                          <td className="px-6 py-4 text-center">
                            {isEditing ? (
                              <input onClick={e => e.stopPropagation()} type="number" step="0.01" className="w-24 border border-pink-300 rounded px-2 py-1 text-center font-bold text-pink-600" value={editAttendeeData.paidAmount} onChange={e => setEditAttendeeData(p => ({...p, paidAmount: e.target.value}))} placeholder={event.cost.toString()} />
                            ) : (
                              <span className={`font-bold ${hasCustomAmount ? 'text-pink-600' : 'text-gray-900'}`}>€ {displayAmount.toFixed(2)}</span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-center">
                             {!isEditing && (
                              <button onClick={(e) => { e.stopPropagation(); handleTogglePayment(attendee.id); }} className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide transition-all ${attendee.status === PaymentStatus.PAID ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-800'}`} type="button">
                                {attendee.status === PaymentStatus.PAID ? (<><CheckCircle className="w-3.5 h-3.5 mr-1" /> Pagato</>) : (<><XCircle className="w-3.5 h-3.5 mr-1" /> Da Pagare</>)}
                              </button>
                             )}
                          </td>
                          <td className="px-6 py-4 text-right">
                            {isEditing ? (
                              <div className="flex justify-end gap-2" onClick={e => e.stopPropagation()}><button onClick={() => saveEditedAttendee(attendee)} className="bg-green-500 text-white p-1.5 rounded-lg"><Save className="w-4 h-4" /></button><button onClick={cancelEditingAttendee} className="bg-gray-400 text-white p-1.5 rounded-lg"><X className="w-4 h-4" /></button></div>
                            ) : (
                              <div className="flex justify-end items-center gap-1" onClick={e => e.stopPropagation()}>
                                <button 
                                  onClick={() => handleTogglePresence(attendee)} 
                                  className={`p-2 rounded-lg transition-all ${isAbsent ? 'text-red-500 bg-red-50 hover:bg-red-100' : 'text-gray-400 hover:text-green-600 hover:bg-green-50'}`}
                                >
                                  {isAbsent ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                                </button>
                                <div className="w-px h-4 bg-gray-100 mx-1"></div>
                                <button onClick={() => startEditingAttendee(attendee)} className="text-gray-400 hover:text-indigo-600 p-2 rounded-lg"><Edit2 className="w-4 h-4" /></button>
                                <button onClick={() => requestDeleteAttendee(attendee.id)} className="text-gray-400 hover:text-red-600 p-2 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
