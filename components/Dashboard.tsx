
import React, { useMemo, useState } from 'react';
import { AppEvent, ExtraExpense, PaymentStatus } from '../types';
import { Calendar, DollarSign, Users, Plus, ArrowRight, MapPin, Clock, Ticket, TrendingDown, Wallet, History, Receipt, Trash2, Save, Filter, ChevronDown, BarChart3 } from 'lucide-react';
import { Button } from './Button';
import { generateId, saveExtraExpense, deleteExtraExpense } from '../services/storageService';

interface DashboardProps {
  events: AppEvent[];
  extraExpenses: ExtraExpense[];
  onCreateClick: () => void;
  onEventClick: (id: string) => void;
  onRefresh: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ events, extraExpenses, onCreateClick, onEventClick, onRefresh }) => {
  const [showAddExtra, setShowAddExtra] = useState(false);
  const [newExtra, setNewExtra] = useState({ description: '', amount: '' });
  const [loading, setLoading] = useState(false);
  const [selectedYear, setSelectedYear] = useState<string>('all');

  // Calcolo anni disponibili per il filtro
  const availableYears = useMemo(() => {
    const years = new Set<string>();
    events.forEach(e => years.add(new Date(e.date).getFullYear().toString()));
    extraExpenses.forEach(e => years.add(new Date(e.date).getFullYear().toString()));
    return Array.from(years).sort((a, b) => b.localeCompare(a));
  }, [events, extraExpenses]);

  const stats = useMemo(() => {
    const today = new Date();
    today.setHours(0,0,0,0);

    // Filtro eventi per anno se selezionato
    const filteredEvents = selectedYear === 'all' 
      ? events 
      : events.filter(e => new Date(e.date).getFullYear().toString() === selectedYear);

    // Filtro spese extra per anno se selezionato
    const filteredExtraExpenses = selectedYear === 'all'
      ? extraExpenses
      : extraExpenses.filter(e => new Date(e.date).getFullYear().toString() === selectedYear);

    const upcoming = filteredEvents
      .filter(e => new Date(e.date) >= today)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const past = filteredEvents
      .filter(e => new Date(e.date) < today)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // STATS filtrate
    const totalRevenue = filteredEvents.reduce((acc, curr) => {
      const eventRevenue = curr.attendees.reduce((sum, a) => {
        if (a.status === PaymentStatus.PAID) {
          return sum + (a.paidAmount !== undefined ? a.paidAmount : curr.cost);
        }
        return sum;
      }, 0);
      return acc + eventRevenue;
    }, 0);

    const totalEventExpenses = filteredEvents.reduce((acc, curr) => {
      return acc + (curr.expenses || []).reduce((sum, exp) => sum + exp.amount, 0);
    }, 0);

    const totalExtraExpenses = filteredExtraExpenses.reduce((acc, curr) => acc + curr.amount, 0);
    const totalExpenses = totalEventExpenses + totalExtraExpenses;
    const totalProfit = totalRevenue - totalExpenses;

    const totalEventsCount = filteredEvents.length;
    const totalParticipations = filteredEvents.reduce((acc, curr) => acc + (curr.attendees ? curr.attendees.length : 0), 0);

    return { 
      upcoming, 
      past, 
      totalRevenue, 
      totalExpenses, 
      totalProfit, 
      filteredExtraExpenses,
      totalEventsCount,
      totalParticipations
    };
  }, [events, extraExpenses, selectedYear]);

  const handleAddExtra = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExtra.description || !newExtra.amount) return;
    setLoading(true);
    try {
      await saveExtraExpense({
        id: generateId(),
        description: newExtra.description,
        amount: Number(newExtra.amount),
        date: new Date().toISOString()
      });
      setNewExtra({ description: '', amount: '' });
      setShowAddExtra(false);
      onRefresh();
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveExtra = async (id: string) => {
    if (!confirm("Eliminare questa spesa extra?")) return;
    await deleteExtraExpense(id);
    onRefresh();
  };

  const renderEventItem = (event: AppEvent) => (
    <div 
      key={event.id} 
      className="p-6 hover:bg-gray-50 transition-all cursor-pointer group border-l-4 border-transparent hover:border-pink-500" 
      onClick={() => onEventClick(event.id)}
    >
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="flex items-start gap-4 flex-1">
          <div className="hidden md:flex flex-col items-center justify-center w-16 h-16 bg-indigo-50 rounded-2xl border border-indigo-100 text-indigo-900 shrink-0">
            <span className="text-xs font-bold uppercase">{new Date(event.date).toLocaleDateString('it-IT', { month: 'short' })}</span>
            <span className="text-2xl font-bold">{new Date(event.date).getDate()}</span>
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900 group-hover:text-pink-600 transition-colors">{event.title}</h3>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mt-2 text-sm text-gray-500">
              <span className="flex items-center"><Calendar className="w-4 h-4 mr-1.5 text-gray-400"/> {new Date(event.date).toLocaleDateString('it-IT')}</span>
              <span className="flex items-center"><Clock className="w-4 h-4 mr-1.5 text-gray-400"/> {event.time}</span>
              <span className="flex items-center"><MapPin className="w-4 h-4 mr-1.5 text-gray-400"/> {event.location}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-8 w-full md:w-auto justify-between md:justify-end">
          <div className="text-right">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Partecipanti</p>
            <div className="flex items-center justify-end gap-1">
              <Users className="w-4 h-4 text-gray-400" />
              <p className="text-lg font-bold text-gray-900">{event.attendees.length}</p>
            </div>
          </div>
          <div className="text-right min-w-[80px]">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Costo Base</p>
            <p className="text-lg font-bold text-pink-600">€ {event.cost}</p>
          </div>
          <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center group-hover:bg-pink-100 group-hover:text-pink-600 transition-colors">
            <ArrowRight className="w-4 h-4" />
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header Section */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 bg-white p-6 rounded-2xl shadow-sm border border-gray-100 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-pink-100 to-yellow-100 rounded-full blur-3xl opacity-30 -mr-16 -mt-16 pointer-events-none"></div>
        <div className="relative z-10">
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Gestione <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-purple-600">ONBEVENTI</span></h1>
          <p className="text-gray-500 mt-1">
            {selectedYear === 'all' 
              ? 'Resoconto totale delle attività.' 
              : `Statistiche e attività per l'anno solare ${selectedYear}.`}
          </p>
        </div>
        
        <div className="relative z-10 flex flex-wrap items-center gap-3 w-full lg:w-auto">
          {/* Yearly Filter */}
          <div className="relative flex-1 lg:flex-none">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <select 
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="pl-10 pr-10 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-700 outline-none focus:ring-2 focus:ring-pink-500 appearance-none min-w-[140px] w-full transition-all cursor-pointer"
            >
              <option value="all">Tutto il tempo</option>
              {availableYears.map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>

          <Button onClick={onCreateClick} className="shadow-lg shadow-pink-200 flex-1 lg:flex-none">
            <Plus className="w-5 h-5 mr-2" />
            Nuovo Evento
          </Button>
        </div>
      </div>

      {/* Global Stats Grid - Ordered: Activity, Revenue, Expenses, Profit */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* 1. Volume Attività */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 relative overflow-hidden">
           <div className="absolute top-0 right-0 w-20 h-20 bg-indigo-50 rounded-bl-full -mr-4 -mt-4"></div>
           <div className="relative">
            <div className="p-3 bg-indigo-100 w-fit rounded-xl text-indigo-600 mb-4 shadow-sm">
              <BarChart3 className="w-6 h-6" />
            </div>
            <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Volume Attività</p>
            <div className="mt-1">
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-black text-gray-900">{stats.totalEventsCount}</span>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">Eventi</span>
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-black text-gray-900">{stats.totalParticipations}</span>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">Presenze</span>
              </div>
            </div>
          </div>
        </div>

        {/* 2. Incasso Globale */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 relative overflow-hidden">
           <div className="absolute top-0 right-0 w-20 h-20 bg-green-50 rounded-bl-full -mr-4 -mt-4"></div>
           <div className="relative">
            <div className="p-3 bg-green-100 w-fit rounded-xl text-green-600 mb-4 shadow-sm">
              <DollarSign className="w-6 h-6" />
            </div>
            <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Incasso {selectedYear === 'all' ? 'Globale' : selectedYear}</p>
            <p className="text-3xl font-black text-gray-900 mt-1">€ {stats.totalRevenue.toLocaleString('it-IT', { minimumFractionDigits: 2 })}</p>
          </div>
        </div>

        {/* 3. Uscite Totali */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 relative overflow-hidden">
           <div className="absolute top-0 right-0 w-20 h-20 bg-red-50 rounded-bl-full -mr-4 -mt-4"></div>
           <div className="relative">
            <div className="p-3 bg-red-100 w-fit rounded-xl text-red-600 mb-4 shadow-sm">
              <TrendingDown className="w-6 h-6" />
            </div>
            <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Uscite {selectedYear === 'all' ? 'Totali' : selectedYear}</p>
            <p className="text-3xl font-black text-gray-900 mt-1">€ {stats.totalExpenses.toLocaleString('it-IT', { minimumFractionDigits: 2 })}</p>
          </div>
        </div>

        {/* 4. Profitto Globale */}
        <div className="bg-indigo-950 p-6 rounded-2xl shadow-xl border border-indigo-900 relative overflow-hidden">
           <div className="absolute top-0 right-0 w-32 h-32 bg-pink-500/20 rounded-bl-full -mr-8 -mt-8 blur-xl"></div>
           <div className="relative">
            <div className="p-3 bg-white/10 w-fit rounded-xl text-pink-400 mb-4 shadow-inner">
              <Wallet className="w-6 h-6" />
            </div>
            <p className="text-xs text-indigo-300 font-bold uppercase tracking-wider">Profitto {selectedYear === 'all' ? 'Globale' : selectedYear}</p>
            <p className="text-3xl font-black text-white mt-1">€ {stats.totalProfit.toLocaleString('it-IT', { minimumFractionDigits: 2 })}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left/Main: Events */}
        <div className="lg:col-span-2 space-y-8">
          {/* Upcoming Events */}
          <section className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
              <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <Ticket className="w-5 h-5 text-pink-500" />
                Prossimi Eventi {selectedYear !== 'all' && `(${selectedYear})`}
              </h2>
            </div>
            {stats.upcoming.length === 0 ? (
              <div className="p-12 text-center text-gray-400">Nessun evento in programma {selectedYear !== 'all' ? `per il ${selectedYear}` : ''}.</div>
            ) : (
              <div className="divide-y divide-gray-100">
                {stats.upcoming.map(renderEventItem)}
              </div>
            )}
          </section>

          {/* Past Events */}
          <section className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden opacity-90">
            <div className="px-6 py-5 border-b border-gray-100 bg-indigo-50/30 flex justify-between items-center">
              <h2 className="text-lg font-bold text-gray-600 flex items-center gap-2">
                <History className="w-5 h-5 text-indigo-400" />
                Eventi Passati {selectedYear !== 'all' && `(${selectedYear})`}
              </h2>
            </div>
            {stats.past.length === 0 ? (
              <div className="p-8 text-center text-gray-400 text-sm italic">Nessun evento passato registrato {selectedYear !== 'all' ? `nel ${selectedYear}` : ''}.</div>
            ) : (
              <div className="divide-y divide-gray-100">
                {stats.past.map(renderEventItem)}
              </div>
            )}
          </section>
        </div>

        {/* Right Column: Extra Expenses */}
        <div className="space-y-8">
          <section className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-100 bg-red-50/30 flex justify-between items-center">
              <h2 className="text-md font-bold text-gray-800 flex items-center gap-2">
                <Receipt className="w-5 h-5 text-red-500" />
                Spese Extra {selectedYear !== 'all' && `(${selectedYear})`}
              </h2>
              <button 
                onClick={() => setShowAddExtra(!showAddExtra)}
                className="text-[10px] bg-red-600 text-white px-2 py-1 rounded-full font-bold uppercase hover:bg-red-700 transition-colors"
              >
                {showAddExtra ? 'Chiudi' : 'Aggiungi'}
              </button>
            </div>

            {showAddExtra && (
              <div className="p-4 bg-red-50/50 border-b border-red-100 animate-slide-down">
                <form onSubmit={handleAddExtra} className="space-y-3">
                   <input 
                    className="w-full text-xs px-3 py-2 rounded-lg border-gray-200 focus:ring-2 focus:ring-red-500"
                    placeholder="Descrizione (es. Affitto Ufficio)"
                    value={newExtra.description}
                    onChange={e => setNewExtra(p => ({...p, description: e.target.value}))}
                    required
                   />
                   <div className="flex gap-2">
                    <input 
                      type="number"
                      step="0.01"
                      className="w-full text-xs px-3 py-2 rounded-lg border-gray-200 focus:ring-2 focus:ring-red-500"
                      placeholder="Importo (€)"
                      value={newExtra.amount}
                      onChange={e => setNewExtra(p => ({...p, amount: e.target.value}))}
                      required
                    />
                    <button type="submit" disabled={loading} className="bg-indigo-950 text-white px-3 py-1 rounded-lg text-xs font-bold shadow-sm">
                      <Save className="w-3 h-3" />
                    </button>
                   </div>
                </form>
              </div>
            )}

            <div className="max-h-[500px] overflow-y-auto">
              {stats.filteredExtraExpenses.length === 0 ? (
                <p className="p-6 text-center text-xs text-gray-400 italic">Nessuna spesa extra registrata {selectedYear !== 'all' ? `nel ${selectedYear}` : ''}.</p>
              ) : (
                <div className="divide-y divide-gray-50">
                  {stats.filteredExtraExpenses.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(exp => (
                    <div key={exp.id} className="p-4 group hover:bg-gray-50 flex justify-between items-center">
                      <div>
                        <p className="text-xs font-bold text-gray-800">{exp.description}</p>
                        <p className="text-[10px] text-gray-400">{new Date(exp.date).toLocaleDateString()}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-black text-red-600">- €{exp.amount.toFixed(2)}</span>
                        <button 
                          onClick={() => handleRemoveExtra(exp.id)}
                          className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-600 transition-all"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {stats.filteredExtraExpenses.length > 0 && (
              <div className="p-3 bg-gray-50 text-right text-[10px] font-bold text-gray-500 uppercase">
                Totale {selectedYear === 'all' ? '' : selectedYear}: <span className="text-red-600">€ {stats.filteredExtraExpenses.reduce((a,b)=>a+b.amount,0).toFixed(2)}</span>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
};
