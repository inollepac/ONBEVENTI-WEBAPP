import React, { useState } from 'react';
import { AppEvent, Attendee, Expense, PaymentStatus } from '../types';
import { Button } from './Button';
import { 
  ArrowLeft, UserPlus, CheckCircle, XCircle, Trash2, 
  Calendar, MapPin, Euro, Clock, Edit2, Plus, 
  TrendingUp, TrendingDown, Wallet, Users, Save, X, AlertTriangle, Phone, Mail
} from 'lucide-react';
import { 
  addAttendee, togglePaymentStatus, deleteAttendee, 
  deleteEvent, addExpense, deleteExpense, updateAttendee, generateId
} from '../services/storageService';

interface EventDetailsProps {
  event: AppEvent;
  onBack: () => void;
  onUpdate: (updatedEvent: AppEvent) => void;
  onDelete: () => void;
  onEditEvent: () => void;
}

export const EventDetails: React.FC<EventDetailsProps> = ({ event, onBack, onUpdate, onDelete, onEditEvent }) => {
  const [showAddAttendee, setShowAddAttendee] = useState(false);
  const [showAddExpense, setShowAddExpense] = useState(false);
  
  // State for new Attendee
  const [newAttendee, setNewAttendee] = useState({ name: '', email: '', phone: '' });
  
  // State for editing Attendee
  const [editingAttendeeId, setEditingAttendeeId] = useState<string | null>(null);
  const [editAttendeeData, setEditAttendeeData] = useState({ name: '', email: '', phone: '' });

  // State for new Expense
  const [newExpense, setNewExpense] = useState({ description: '', amount: '' });

  // --- CONFIRMATION MODAL STATE ---
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

  // --- ATTENDEE LOGIC ---

  const handleAddAttendee = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check limit
    if (event.maxAttendees && event.attendees.length >= event.maxAttendees) {
      alert("Numero massimo di partecipanti raggiunto.");
      return;
    }

    const attendee: Attendee = {
      id: generateId(),
      name: newAttendee.name,
      email: newAttendee.email,
      phone: newAttendee.phone,
      status: PaymentStatus.PENDING,
      registrationDate: new Date().toISOString()
    };
    
    const updated = addAttendee(event.id, attendee);
    if (updated) {
      onUpdate(updated);
      setNewAttendee({ name: '', email: '', phone: '' });
      setShowAddAttendee(false);
    }
  };

  const startEditingAttendee = (attendee: Attendee) => {
    setEditingAttendeeId(attendee.id);
    setEditAttendeeData({ 
      name: attendee.name, 
      email: attendee.email || '', 
      phone: attendee.phone || '' 
    });
  };

  const cancelEditingAttendee = () => {
    setEditingAttendeeId(null);
    setEditAttendeeData({ name: '', email: '', phone: '' });
  };

  const saveEditedAttendee = (originalAttendee: Attendee) => {
    const updatedAttendee: Attendee = {
      ...originalAttendee,
      name: editAttendeeData.name,
      email: editAttendeeData.email,
      phone: editAttendeeData.phone,
    };
    const updatedEvent = updateAttendee(event.id, updatedAttendee);
    if (updatedEvent) {
      onUpdate(updatedEvent);
      setEditingAttendeeId(null);
    }
  };

  const handleTogglePayment = (attendeeId: string) => {
    const updated = togglePaymentStatus(event.id, attendeeId);
    if (updated) onUpdate(updated);
  };

  // --- DELETE REQUESTS (Open Modal) ---

  const requestDeleteAttendee = (attendeeId: string) => {
    setConfirmModal({
      isOpen: true,
      type: 'DELETE_ATTENDEE',
      itemId: attendeeId,
      message: 'Sei sicuro di voler rimuovere questo partecipante dalla lista?'
    });
  };

  const requestDeleteExpense = (expenseId: string) => {
    setConfirmModal({
      isOpen: true,
      type: 'DELETE_EXPENSE',
      itemId: expenseId,
      message: 'Sei sicuro di voler eliminare questa voce di spesa?'
    });
  };

  const requestDeleteEvent = () => {
    setConfirmModal({
      isOpen: true,
      type: 'DELETE_EVENT',
      message: 'ATTENZIONE: Stai per eliminare definitivamente questo evento e tutti i dati associati. Sei sicuro?'
    });
  };

  // --- EXECUTE DELETE (Called from Modal) ---

  const executeDelete = () => {
    if (confirmModal.type === 'DELETE_EVENT') {
      deleteEvent(event.id);
      onDelete(); // Navigates back to dashboard
    } 
    else if (confirmModal.type === 'DELETE_ATTENDEE' && confirmModal.itemId) {
      const updated = deleteAttendee(event.id, confirmModal.itemId);
      if (updated) onUpdate(updated);
    } 
    else if (confirmModal.type === 'DELETE_EXPENSE' && confirmModal.itemId) {
      const updated = deleteExpense(event.id, confirmModal.itemId);
      if (updated) onUpdate(updated);
    }

    // Close modal
    setConfirmModal({ isOpen: false, type: null, message: '' });
  };

  // --- EXPENSE ADD LOGIC ---

  const handleAddExpense = (e: React.FormEvent) => {
    e.preventDefault();
    const expense: Expense = {
      id: generateId(),
      description: newExpense.description,
      amount: Number(newExpense.amount)
    };
    
    const updated = addExpense(event.id, expense);
    if (updated) {
      onUpdate(updated);
      setNewExpense({ description: '', amount: '' });
      setShowAddExpense(false);
    }
  };

  // --- CALCULATIONS ---

  const totalCollected = event.attendees
    .filter(a => a.status === PaymentStatus.PAID)
    .length * event.cost;

  const totalExpenses = (event.expenses || []).reduce((acc, curr) => acc + curr.amount, 0);
  const netProfit = totalCollected - totalExpenses;
  const isProfitPositive = netProfit >= 0;

  const maxAttendees = event.maxAttendees || 0;
  const occupancyPercentage = maxAttendees > 0 
    ? Math.min((event.attendees.length / maxAttendees) * 100, 100) 
    : 0;

  return (
    <div className="space-y-8 animate-fade-in pb-10 relative">
      
      {/* --- CUSTOM CONFIRMATION MODAL --- */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 bg-indigo-950/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 animate-scale-in border border-gray-100 transform transition-all">
            <div className="flex flex-col items-center text-center mb-6">
              <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center mb-4 text-red-500 shadow-sm">
                <AlertTriangle className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold text-gray-900">Conferma Eliminazione</h3>
              <p className="text-gray-500 mt-2 text-sm leading-relaxed">{confirmModal.message}</p>
            </div>
            <div className="flex gap-3 justify-center">
              <Button 
                variant="secondary" 
                onClick={() => setConfirmModal({ isOpen: false, type: null, message: '' })}
                className="w-full"
              >
                Annulla
              </Button>
              <Button 
                variant="danger" 
                onClick={executeDelete}
                className="w-full shadow-red-200"
              >
                Elimina
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center gap-6 justify-between bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div className="flex items-start gap-5">
          <button onClick={onBack} className="p-2.5 bg-gray-50 hover:bg-gray-100 text-gray-600 rounded-xl transition-colors mt-1" type="button">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">{event.title}</h1>
            <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-gray-500 font-medium">
              <span className="flex items-center bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full"><Calendar className="w-3.5 h-3.5 mr-1.5" /> {new Date(event.date).toLocaleDateString('it-IT')}</span>
              <span className="flex items-center bg-gray-100 text-gray-600 px-3 py-1 rounded-full"><MapPin className="w-3.5 h-3.5 mr-1.5" /> {event.location}</span>
            </div>
          </div>
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={onEditEvent} type="button">
            <Edit2 className="w-4 h-4 mr-2" />
            Modifica
          </Button>
          <Button variant="danger" onClick={requestDeleteEvent} type="button">
            Elimina Evento
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-green-50 rounded-bl-full -mr-5 -mt-5"></div>
          <div className="relative">
             <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-green-100 text-green-600 rounded-lg shadow-sm">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <p className="text-sm font-semibold text-gray-500 uppercase">Incasso</p>
              </div>
              <p className="text-3xl font-extrabold text-gray-900">€ {totalCollected.toLocaleString('it-IT', { minimumFractionDigits: 2 })}</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-red-50 rounded-bl-full -mr-5 -mt-5"></div>
          <div className="relative">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-red-100 text-red-600 rounded-lg shadow-sm">
                <TrendingDown className="w-5 h-5" />
              </div>
              <p className="text-sm font-semibold text-gray-500 uppercase">Spese</p>
            </div>
            <p className="text-3xl font-extrabold text-gray-900">€ {totalExpenses.toLocaleString('it-IT', { minimumFractionDigits: 2 })}</p>
          </div>
        </div>

        <div className={`p-6 rounded-2xl shadow-lg border relative overflow-hidden flex flex-col justify-center ${
            isProfitPositive 
            ? 'bg-indigo-950 border-indigo-900 text-white' 
            : 'bg-red-50 border-red-100 text-red-900'
        }`}>
          {isProfitPositive && (
            <div className="absolute right-0 top-0 w-32 h-32 bg-gradient-to-br from-pink-500 to-purple-600 blur-2xl opacity-20 -mr-10 -mt-10"></div>
          )}
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-2">
              <div className={`p-2 rounded-lg ${isProfitPositive ? 'bg-white/10 text-pink-400' : 'bg-red-100 text-red-600'}`}>
                <Wallet className="w-5 h-5" />
              </div>
              <p className={`text-sm font-semibold uppercase ${isProfitPositive ? 'text-indigo-200' : 'text-red-700'}`}>Profitto Netto</p>
            </div>
            <p className="text-4xl font-black tracking-tight">€ {netProfit.toLocaleString('it-IT', { minimumFractionDigits: 2 })}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* LEFT COLUMN: Details & Expenses */}
        <div className="space-y-8">
          
          {/* Detailed Info Card */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center">
              <span className="w-1.5 h-6 bg-pink-500 rounded-full mr-3"></span>
              Dettagli
            </h3>
            <div className="space-y-5">
              <div className="flex justify-between items-center border-b border-gray-50 pb-3">
                <span className="text-gray-500 text-sm flex items-center gap-2 font-medium"><Clock className="w-4 h-4 text-gray-400" /> Orario</span>
                <span className="font-semibold text-gray-800 bg-gray-50 px-3 py-1 rounded-md">{event.time}</span>
              </div>
              <div className="flex justify-between items-center border-b border-gray-50 pb-3">
                <span className="text-gray-500 text-sm flex items-center gap-2 font-medium"><Euro className="w-4 h-4 text-gray-400" /> Costo Biglietto</span>
                <span className="font-semibold text-gray-800 bg-gray-50 px-3 py-1 rounded-md">€ {event.cost}</span>
              </div>
              <div className="flex justify-between items-center border-b border-gray-50 pb-3">
                <span className="text-gray-500 text-sm flex items-center gap-2 font-medium"><Users className="w-4 h-4 text-gray-400" /> Max Partecipanti</span>
                <span className="font-semibold text-gray-800 bg-gray-50 px-3 py-1 rounded-md">{event.maxAttendees ? event.maxAttendees : '∞'}</span>
              </div>
              
              <div className="pt-4">
                <div className="flex justify-between text-xs font-bold text-gray-500 uppercase mb-2">
                  <span>Occupazione</span>
                  <span>{Math.round(occupancyPercentage)}%</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                  <div 
                    className={`h-3 rounded-full bg-gradient-to-r from-pink-500 to-yellow-400 shadow-sm transition-all duration-500`} 
                    style={{ width: `${occupancyPercentage}%` }}
                  ></div>
                </div>
                <p className="text-xs text-center mt-2 text-gray-400">
                  {event.attendees.length} iscritti su {event.maxAttendees ? event.maxAttendees : 'illimitati'}
                </p>
              </div>
            </div>
            
            <div className="mt-8">
              <p className="text-sm font-bold text-gray-900 mb-2">Descrizione</p>
              <div className="bg-gray-50 p-4 rounded-xl text-sm text-gray-600 italic border border-gray-100">
                 "{event.description || "Nessuna descrizione inserita."}"
              </div>
            </div>
          </div>

          {/* Expenses Management */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h3 className="font-bold text-gray-900">Spese & Costi</h3>
              <button 
                onClick={() => setShowAddExpense(!showAddExpense)}
                className="text-xs text-white bg-indigo-900 hover:bg-indigo-800 px-3 py-1.5 rounded-full font-medium flex items-center transition-colors shadow-sm"
                type="button"
              >
                <Plus className="w-3 h-3 mr-1" /> Nuova Spesa
              </button>
            </div>

            {showAddExpense && (
              <div className="p-5 bg-indigo-50 border-b border-indigo-100 animate-slide-down">
                 <form onSubmit={handleAddExpense} className="flex flex-col gap-3">
                    <input
                      type="text"
                      placeholder="Descrizione (es. Catering)"
                      className="w-full text-sm px-3 py-2 border-indigo-200 rounded-lg focus:ring-2 focus:ring-pink-500"
                      required
                      value={newExpense.description}
                      onChange={e => setNewExpense(prev => ({...prev, description: e.target.value}))}
                    />
                    <div className="flex gap-2">
                      <input
                        type="number"
                        placeholder="Importo (€)"
                        className="w-full text-sm px-3 py-2 border-indigo-200 rounded-lg focus:ring-2 focus:ring-pink-500"
                        required
                        min="0"
                        step="0.01"
                        value={newExpense.amount}
                        onChange={e => setNewExpense(prev => ({...prev, amount: e.target.value}))}
                      />
                      <Button type="submit" className="whitespace-nowrap text-xs py-1">Salva</Button>
                    </div>
                 </form>
              </div>
            )}

            <div className="divide-y divide-gray-100">
              {(!event.expenses || event.expenses.length === 0) ? (
                 <p className="p-6 text-center text-sm text-gray-400">Nessuna spesa registrata.</p>
              ) : (
                event.expenses.map(exp => (
                  <div key={exp.id} className="p-4 flex justify-between items-center hover:bg-gray-50 group transition-colors">
                    <div>
                      <p className="text-sm font-semibold text-gray-800">{exp.description}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <p className="text-sm font-bold text-red-500 bg-red-50 px-2 py-1 rounded">- €{exp.amount}</p>
                      <button 
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          requestDeleteExpense(exp.id);
                        }}
                        className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-full transition-all"
                        title="Elimina Spesa"
                        type="button"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
            {event.expenses && event.expenses.length > 0 && (
              <div className="p-4 bg-gray-50 border-t border-gray-100 text-right">
                <p className="text-xs text-gray-500 uppercase font-bold tracking-wider">Totale Uscite: <span className="text-red-600">€ {totalExpenses}</span></p>
              </div>
            )}
          </div>

        </div>

        {/* RIGHT COLUMN: Attendees List */}
        <div className="lg:col-span-2 flex flex-col h-full">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col h-full overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-white">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-pink-100 text-pink-600 rounded-lg">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                   <h2 className="font-bold text-gray-900 text-lg">Lista Iscritti</h2>
                   <p className="text-xs text-gray-500">Gestisci partecipazioni e pagamenti</p>
                </div>
              </div>
              <Button 
                onClick={() => setShowAddAttendee(!showAddAttendee)} 
                variant="primary" 
                className="text-xs shadow-pink-200"
                disabled={!!event.maxAttendees && event.attendees.length >= event.maxAttendees}
                type="button"
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Aggiungi
              </Button>
            </div>

            {showAddAttendee && (
              <div className="p-6 bg-gradient-to-r from-indigo-50 to-pink-50 border-b border-pink-100 animate-slide-down">
                <h4 className="text-sm font-bold text-indigo-900 mb-4 uppercase tracking-wide">Nuovo Partecipante</h4>
                <form onSubmit={handleAddAttendee} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="w-full">
                      <input
                        type="text"
                        required
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-pink-500"
                        value={newAttendee.name}
                        onChange={e => setNewAttendee(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="Nome Cognome *"
                      />
                    </div>
                    <div className="w-full">
                      <input
                        type="email"
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-pink-500"
                        value={newAttendee.email}
                        onChange={e => setNewAttendee(prev => ({ ...prev, email: e.target.value }))}
                        placeholder="Email (opzionale)"
                      />
                    </div>
                    <div className="w-full">
                      <input
                        type="tel"
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-pink-500"
                        value={newAttendee.phone}
                        onChange={e => setNewAttendee(prev => ({ ...prev, phone: e.target.value }))}
                        placeholder="Cellulare (opzionale)"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <Button type="button" variant="ghost" onClick={() => setShowAddAttendee(false)}>Chiudi</Button>
                    <Button type="submit">Inserisci in lista</Button>
                  </div>
                </form>
              </div>
            )}

            <div className="overflow-x-auto flex-1">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="text-xs font-semibold text-gray-300 bg-indigo-950 border-b border-indigo-900">
                    <th className="px-6 py-4 rounded-tl-lg">PARTECIPANTE</th>
                    <th className="px-6 py-4">CONTATTI</th>
                    <th className="px-6 py-4 text-center">STATO PAGAMENTO</th>
                    <th className="px-6 py-4 text-right rounded-tr-lg">AZIONI</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {event.attendees.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-16 text-center text-gray-400">
                        <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                           <Users className="w-8 h-8 text-gray-300" />
                        </div>
                        <p className="font-medium">La lista è vuota</p>
                        <p className="text-sm mt-1">Aggiungi il primo partecipante per iniziare.</p>
                      </td>
                    </tr>
                  ) : (
                    event.attendees.map(attendee => {
                      const isEditing = editingAttendeeId === attendee.id;
                      
                      return (
                        <tr key={attendee.id} className={`group transition-colors ${isEditing ? 'bg-pink-50' : 'hover:bg-gray-50'}`}>
                          
                          {/* NAME CELL */}
                          <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                            {isEditing ? (
                              <input 
                                className="w-full border border-pink-300 rounded-md text-sm px-3 py-1.5 bg-white focus:ring-2 focus:ring-pink-500"
                                value={editAttendeeData.name}
                                onChange={e => setEditAttendeeData(prev => ({...prev, name: e.target.value}))}
                                placeholder="Nome"
                              />
                            ) : attendee.name}
                          </td>

                          {/* CONTACTS CELL */}
                          <td className="px-6 py-4 text-sm text-gray-500">
                            {isEditing ? (
                              <div className="flex flex-col gap-2">
                                <input 
                                  className="w-full border border-pink-300 rounded-md text-xs px-2 py-1.5 bg-white focus:ring-2 focus:ring-pink-500"
                                  value={editAttendeeData.email}
                                  onChange={e => setEditAttendeeData(prev => ({...prev, email: e.target.value}))}
                                  placeholder="Email"
                                />
                                <input 
                                  className="w-full border border-pink-300 rounded-md text-xs px-2 py-1.5 bg-white focus:ring-2 focus:ring-pink-500"
                                  value={editAttendeeData.phone}
                                  onChange={e => setEditAttendeeData(prev => ({...prev, phone: e.target.value}))}
                                  placeholder="Telefono"
                                />
                              </div>
                            ) : (
                              <div className="flex flex-col gap-1">
                                {attendee.email && (
                                   <div className="flex items-center text-gray-600">
                                      <Mail className="w-3 h-3 mr-1.5 text-gray-400" />
                                      {attendee.email}
                                   </div>
                                )}
                                {attendee.phone && (
                                  <div className="flex items-center text-gray-500 text-xs">
                                     <Phone className="w-3 h-3 mr-1.5 text-gray-400" />
                                     {attendee.phone}
                                  </div>
                                )}
                                {!attendee.email && !attendee.phone && <span className="text-gray-300 text-xs italic">Nessun contatto</span>}
                              </div>
                            )}
                          </td>

                          {/* STATUS CELL */}
                          <td className="px-6 py-4 text-center">
                             {!isEditing && (
                              <button 
                                onClick={() => handleTogglePayment(attendee.id)}
                                className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide transition-all shadow-sm transform hover:scale-105 ${
                                  attendee.status === PaymentStatus.PAID 
                                    ? 'bg-green-100 text-green-700 border border-green-200' 
                                    : 'bg-yellow-100 text-yellow-800 border border-yellow-200'
                                }`}
                                type="button"
                              >
                                {attendee.status === PaymentStatus.PAID ? (
                                  <><CheckCircle className="w-3.5 h-3.5 mr-1.5" /> Pagato</>
                                ) : (
                                  <><XCircle className="w-3.5 h-3.5 mr-1.5" /> Da Pagare</>
                                )}
                              </button>
                             )}
                          </td>

                          {/* ACTIONS CELL */}
                          <td className="px-6 py-4 text-right">
                            {isEditing ? (
                              <div className="flex justify-end gap-2">
                                <button onClick={() => saveEditedAttendee(attendee)} className="text-white bg-green-500 hover:bg-green-600 p-1.5 rounded-lg shadow-sm" title="Salva" type="button">
                                  <Save className="w-4 h-4" />
                                </button>
                                <button onClick={cancelEditingAttendee} className="text-white bg-gray-400 hover:bg-gray-500 p-1.5 rounded-lg shadow-sm" title="Annulla" type="button">
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            ) : (
                              <div className="flex justify-end gap-2 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                                <button 
                                  onClick={() => startEditingAttendee(attendee)}
                                  className="text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 p-2 rounded-lg transition-colors"
                                  title="Modifica Dati"
                                  type="button"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                                <button 
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    requestDeleteAttendee(attendee.id);
                                  }}
                                  className="text-gray-400 hover:text-red-600 hover:bg-red-50 p-2 rounded-lg transition-colors"
                                  title="Rimuovi"
                                  type="button"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
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