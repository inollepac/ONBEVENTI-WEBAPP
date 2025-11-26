import React, { useMemo } from 'react';
import { AppEvent, PaymentStatus } from '../types';
import { Calendar, DollarSign, Users, Plus, ArrowRight, MapPin, Clock, Ticket } from 'lucide-react';
import { Button } from './Button';

interface DashboardProps {
  events: AppEvent[];
  onCreateClick: () => void;
  onEventClick: (id: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ events, onCreateClick, onEventClick }) => {
  
  const stats = useMemo(() => {
    const totalEvents = events.length;
    const totalAttendees = events.reduce((acc, curr) => acc + curr.attendees.length, 0);
    const totalRevenue = events.reduce((acc, curr) => {
      const paidAttendees = curr.attendees.filter(a => a.status === PaymentStatus.PAID).length;
      return acc + (paidAttendees * curr.cost);
    }, 0);
    
    // Sort events by date (nearest first)
    const upcoming = [...events]
      .filter(e => new Date(e.date) >= new Date(new Date().setHours(0,0,0,0)))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return { totalEvents, totalAttendees, totalRevenue, upcoming };
  }, [events]);

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-pink-100 to-yellow-100 rounded-full blur-3xl opacity-50 -mr-16 -mt-16 pointer-events-none"></div>
        <div className="relative z-10">
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Dashboard <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-purple-600">ONBEVENTI</span></h1>
          <p className="text-gray-500 mt-1">Panoramica completa delle tue attività e performance.</p>
        </div>
        <div className="relative z-10">
          <Button onClick={onCreateClick} className="shadow-lg shadow-pink-200">
            <Plus className="w-5 h-5 mr-2" />
            Nuovo Evento
          </Button>
        </div>
      </div>

      {/* Stats Cards - Modernized with gradients/accents */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Eventi Card */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 relative group overflow-hidden transition-all hover:shadow-md">
          <div className="absolute right-0 top-0 w-24 h-24 bg-indigo-50 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
          <div className="relative flex flex-col h-full justify-between">
            <div className="p-3 bg-indigo-100 w-fit rounded-xl text-indigo-700 mb-4">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-gray-500 font-semibold uppercase tracking-wider">Eventi Attivi</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{stats.totalEvents}</p>
            </div>
          </div>
        </div>
        
        {/* Incasso Card - Brand Pink Accent */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 relative group overflow-hidden transition-all hover:shadow-md">
           <div className="absolute right-0 top-0 w-24 h-24 bg-pink-50 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
           <div className="relative flex flex-col h-full justify-between">
            <div className="p-3 bg-pink-100 w-fit rounded-xl text-pink-600 mb-4">
              <DollarSign className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-gray-500 font-semibold uppercase tracking-wider">Incasso Totale</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">€ {stats.totalRevenue.toLocaleString('it-IT', { minimumFractionDigits: 2 })}</p>
            </div>
          </div>
        </div>

        {/* Iscritti Card - Brand Yellow Accent */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 relative group overflow-hidden transition-all hover:shadow-md">
          <div className="absolute right-0 top-0 w-24 h-24 bg-yellow-50 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
          <div className="relative flex flex-col h-full justify-between">
            <div className="p-3 bg-yellow-100 w-fit rounded-xl text-yellow-700 mb-4">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-gray-500 font-semibold uppercase tracking-wider">Iscritti Totali</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{stats.totalAttendees}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Upcoming Events List */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center backdrop-blur-sm">
          <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
            <Ticket className="w-5 h-5 text-pink-500" />
            Prossimi Eventi
          </h2>
          <span className="text-xs font-bold bg-indigo-900 text-white px-3 py-1 rounded-full shadow-sm">
            {stats.upcoming.length} in programma
          </span>
        </div>
        
        {stats.upcoming.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center justify-center text-gray-500">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <Calendar className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-lg font-medium">Nessun evento in programma</p>
            <p className="text-sm mt-1">Clicca su "Nuovo Evento" per iniziare!</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {stats.upcoming.map(event => (
              <div 
                key={event.id} 
                className="p-6 hover:bg-gray-50 transition-all cursor-pointer group border-l-4 border-transparent hover:border-pink-500" 
                onClick={() => onEventClick(event.id)}
              >
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                  {/* Left: Date Box & Info */}
                  <div className="flex items-start gap-4 flex-1">
                    <div className="hidden md:flex flex-col items-center justify-center w-16 h-16 bg-indigo-50 rounded-2xl border border-indigo-100 text-indigo-900 shrink-0">
                      <span className="text-xs font-bold uppercase">{new Date(event.date).toLocaleDateString('it-IT', { month: 'short' })}</span>
                      <span className="text-2xl font-bold">{new Date(event.date).getDate()}</span>
                    </div>
                    
                    <div>
                      <h3 className="text-lg font-bold text-gray-900 group-hover:text-pink-600 transition-colors">{event.title}</h3>
                      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mt-2 text-sm text-gray-500">
                        <span className="flex items-center md:hidden"><Calendar className="w-4 h-4 mr-1.5 text-gray-400"/> {new Date(event.date).toLocaleDateString('it-IT')}</span>
                        <span className="flex items-center"><Clock className="w-4 h-4 mr-1.5 text-gray-400"/> {event.time}</span>
                        <span className="flex items-center"><MapPin className="w-4 h-4 mr-1.5 text-gray-400"/> {event.location}</span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Stats & Arrow */}
                  <div className="flex items-center gap-8 w-full md:w-auto justify-between md:justify-end">
                    <div className="text-right">
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Partecipanti</p>
                      <div className="flex items-center justify-end gap-1">
                        <Users className="w-4 h-4 text-gray-400" />
                        <p className="text-lg font-bold text-gray-900">{event.attendees.length}</p>
                      </div>
                    </div>
                    <div className="text-right min-w-[80px]">
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Costo</p>
                      <p className="text-lg font-bold text-pink-600">€ {event.cost}</p>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center group-hover:bg-pink-100 group-hover:text-pink-600 transition-colors">
                      <ArrowRight className="w-4 h-4" />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};