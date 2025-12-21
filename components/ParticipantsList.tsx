import React, { useState, useMemo } from 'react';
import { AppEvent, Attendee } from '../types';
import { Users, Search, Mail, Phone, Calendar, ArrowLeft } from 'lucide-react';

interface ParticipantsListProps {
  events: AppEvent[];
  onBack: () => void;
}

export const ParticipantsList: React.FC<ParticipantsListProps> = ({ events, onBack }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const globalAttendees = useMemo(() => {
    const map = new Map<string, { attendee: Attendee, eventsCount: number, eventTitles: string[] }>();

    events.forEach(event => {
      event.attendees.forEach(a => {
        // Usiamo email o cellulare o nome per identificare univocamente una persona
        const key = (a.email || a.phone || a.name).toLowerCase().trim();
        
        if (map.has(key)) {
          const existing = map.get(key)!;
          existing.eventsCount += 1;
          existing.eventTitles.push(event.title);
        } else {
          map.set(key, {
            attendee: a,
            eventsCount: 1,
            eventTitles: [event.title]
          });
        }
      });
    });

    const list = Array.from(map.values());
    
    if (!searchTerm) return list;
    
    return list.filter(item => 
      item.attendee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.attendee.email && item.attendee.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (item.attendee.phone && item.attendee.phone.includes(searchTerm))
    );
  }, [events, searchTerm]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors">
            <ArrowLeft className="w-5 h-5 text-gray-500" />
          </button>
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900">Anagrafica Partecipanti</h1>
            <p className="text-sm text-gray-500">Tutte le persone che hanno interagito con ONBEVENTI.</p>
          </div>
        </div>
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
          <input 
            type="text"
            placeholder="Cerca per nome, email o telefono..."
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-pink-500"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-indigo-950 text-white text-xs font-bold uppercase tracking-wider">
                <th className="px-6 py-4">Partecipante</th>
                <th className="px-6 py-4">Contatti</th>
                <th className="px-6 py-4 text-center">Eventi Totali</th>
                <th className="px-6 py-4">Ultimi Eventi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {globalAttendees.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-20 text-center text-gray-400 italic">
                    Nessun partecipante trovato.
                  </td>
                </tr>
              ) : (
                globalAttendees.map((item, idx) => (
                  <tr key={idx} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-pink-100 text-pink-600 flex items-center justify-center font-bold text-xs">
                          {item.attendee.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-bold text-gray-900">{item.attendee.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        {item.attendee.email && (
                          <div className="flex items-center text-xs text-gray-500">
                            <Mail className="w-3 h-3 mr-1.5" /> {item.attendee.email}
                          </div>
                        )}
                        {item.attendee.phone && (
                          <div className="flex items-center text-xs text-gray-500">
                            <Phone className="w-3 h-3 mr-1.5" /> {item.attendee.phone}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="inline-block bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full text-xs font-bold border border-indigo-100">
                        {item.eventsCount}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {item.eventTitles.slice(-2).map((t, i) => (
                          <span key={i} className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded border border-gray-200">
                            {t}
                          </span>
                        ))}
                        {item.eventTitles.length > 2 && <span className="text-[10px] text-gray-400">+{item.eventTitles.length - 2} altri</span>}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
