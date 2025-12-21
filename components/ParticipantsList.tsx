
import React, { useState, useMemo } from 'react';
import { AppEvent, Attendee } from '../types';
import { Users, Search, Mail, Phone, Calendar, ArrowLeft, SortAsc, SortDesc, Filter } from 'lucide-react';

interface ParticipantsListProps {
  events: AppEvent[];
  onBack: () => void;
}

type SortKey = 'name' | 'eventsCount';
type SortOrder = 'asc' | 'desc';

export const ParticipantsList: React.FC<ParticipantsListProps> = ({ events, onBack }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

  const globalAttendees = useMemo(() => {
    const map = new Map<string, { attendee: Attendee, eventsCount: number, eventTitles: string[] }>();

    (events || []).forEach(event => {
      (event.attendees || []).forEach(a => {
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

    let list = Array.from(map.values());
    
    // Filtering
    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      list = list.filter(item => 
        item.attendee.name.toLowerCase().includes(lowerSearch) ||
        (item.attendee.email && item.attendee.email.toLowerCase().includes(lowerSearch)) ||
        (item.attendee.phone && item.attendee.phone.includes(searchTerm))
      );
    }

    // Sorting
    list.sort((a, b) => {
      if (sortKey === 'name') {
        const comparison = a.attendee.name.localeCompare(b.attendee.name);
        return sortOrder === 'asc' ? comparison : -comparison;
      } else {
        const comparison = a.eventsCount - b.eventsCount;
        return sortOrder === 'asc' ? comparison : -comparison;
      }
    });

    return list;
  }, [events, searchTerm, sortKey, sortOrder]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortOrder(key === 'eventsCount' ? 'desc' : 'asc'); // Default decrescente per eventi, crescente per nome
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2.5 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors border border-gray-100">
            <ArrowLeft className="w-5 h-5 text-gray-500" />
          </button>
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900">Anagrafica Partecipanti</h1>
            <p className="text-sm text-gray-500">Gestione centralizzata di tutti i tuoi iscritti.</p>
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 sm:w-80">
            <Search className="absolute left-3.5 top-3 w-4 h-4 text-gray-400" />
            <input 
              type="text"
              placeholder="Cerca nome, email o telefono..."
              className="w-full pl-11 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-pink-500 shadow-sm transition-all"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="flex bg-gray-50 p-1 rounded-xl border border-gray-200">
            <button 
              onClick={() => toggleSort('name')}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${sortKey === 'name' ? 'bg-white text-indigo-950 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Nome {sortKey === 'name' && (sortOrder === 'asc' ? <SortAsc className="w-3.5 h-3.5" /> : <SortDesc className="w-3.5 h-3.5" />)}
            </button>
            <button 
              onClick={() => toggleSort('eventsCount')}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${sortKey === 'eventsCount' ? 'bg-white text-indigo-950 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Eventi {sortKey === 'eventsCount' && (sortOrder === 'asc' ? <SortAsc className="w-3.5 h-3.5" /> : <SortDesc className="w-3.5 h-3.5" />)}
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-indigo-950 text-white text-[11px] font-bold uppercase tracking-wider">
                <th 
                  className="px-6 py-4 cursor-pointer hover:bg-indigo-900 transition-colors"
                  onClick={() => toggleSort('name')}
                >
                  <div className="flex items-center gap-2">
                    Partecipante
                    {sortKey === 'name' && (sortOrder === 'asc' ? <SortAsc className="w-3 h-3 opacity-60" /> : <SortDesc className="w-3 h-3 opacity-60" />)}
                  </div>
                </th>
                <th className="px-6 py-4">Contatti</th>
                <th 
                  className="px-6 py-4 text-center cursor-pointer hover:bg-indigo-900 transition-colors"
                  onClick={() => toggleSort('eventsCount')}
                >
                  <div className="flex items-center justify-center gap-2">
                    Eventi Totali
                    {sortKey === 'eventsCount' && (sortOrder === 'asc' ? <SortAsc className="w-3 h-3 opacity-60" /> : <SortDesc className="w-3 h-3 opacity-60" />)}
                  </div>
                </th>
                <th className="px-6 py-4">Eventi a cui ha partecipato</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {globalAttendees.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-24 text-center text-gray-400 italic">
                    <div className="flex flex-col items-center gap-3">
                      <div className="p-4 bg-gray-50 rounded-full"><Users className="w-8 h-8 opacity-20" /></div>
                      <p>Nessun partecipante trovato.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                globalAttendees.map((item, idx) => (
                  <tr key={idx} className="hover:bg-gray-50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-pink-100 to-indigo-100 text-pink-700 flex items-center justify-center font-bold text-sm shadow-sm">
                          {item.attendee.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-bold text-gray-900 group-hover:text-pink-600 transition-colors">{item.attendee.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1.5">
                        {item.attendee.email && (
                          <div className="flex items-center text-xs text-gray-500">
                            <Mail className="w-3.5 h-3.5 mr-2 text-indigo-300" /> {item.attendee.email}
                          </div>
                        )}
                        {item.attendee.phone && (
                          <div className="flex items-center text-xs text-gray-500">
                            <Phone className="w-3.5 h-3.5 mr-2 text-indigo-300" /> {item.attendee.phone}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="inline-block bg-indigo-50 text-indigo-700 px-4 py-1.5 rounded-full text-xs font-black border border-indigo-100 min-w-[3rem]">
                        {item.eventsCount}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1.5 max-w-sm">
                        {item.eventTitles.slice(-3).map((t, i) => (
                          <span key={i} className="text-[10px] bg-white text-gray-600 px-2.5 py-1 rounded-md border border-gray-200 shadow-sm">
                            {t}
                          </span>
                        ))}
                        {item.eventTitles.length > 3 && (
                          <span className="text-[10px] font-bold text-indigo-400 px-1 pt-1">
                            +{item.eventTitles.length - 3} altri
                          </span>
                        )}
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
