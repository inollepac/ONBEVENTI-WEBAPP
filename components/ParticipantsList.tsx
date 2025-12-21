
import React, { useState, useMemo } from 'react';
import { AppEvent, Attendee } from '../types';
import { Users, Search, Mail, Phone, ArrowLeft, SortAsc, SortDesc, Trophy, UserCheck, Star, Repeat, PieChart } from 'lucide-react';

interface ParticipantsListProps {
  events: AppEvent[];
  onBack: () => void;
  onParticipantClick: (key: string) => void;
}

type SortKey = 'name' | 'eventsCount';
type SortOrder = 'asc' | 'desc';

export const ParticipantsList: React.FC<ParticipantsListProps> = ({ events, onBack, onParticipantClick }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

  // Caricamento soglie fedeltà per il calcolo dei badge in lista
  const vipThreshold = Number(localStorage.getItem('onbeventi_vip_threshold') || '5');
  const regularThreshold = Number(localStorage.getItem('onbeventi_regular_threshold') || '3');

  const { list, stats } = useMemo(() => {
    const map = new Map<string, { 
      attendee: Attendee, 
      eventsCount: number, // Solo presenze effettive
      totalBookings: number, // Totale prenotazioni (incluse assenze)
      eventTitles: string[], 
      key: string,
      isVip: boolean,
      isRegular: boolean
    }>();

    (events || []).forEach(event => {
      (event.attendees || []).forEach(a => {
        const key = (a.email || a.phone || a.name).toLowerCase().trim();
        const isPresent = a.isPresent !== false;
        
        if (map.has(key)) {
          const existing = map.get(key)!;
          existing.totalBookings += 1;
          if (isPresent) {
            existing.eventsCount += 1;
          }
          existing.eventTitles.push(event.title);
        } else {
          map.set(key, {
            attendee: a,
            eventsCount: isPresent ? 1 : 0,
            totalBookings: 1,
            eventTitles: [event.title],
            key: key,
            isVip: false, // calcolato dopo
            isRegular: false // calcolato dopo
          });
        }
      });
    });

    const fullList = Array.from(map.values()).map(item => ({
      ...item,
      isVip: item.eventsCount >= vipThreshold,
      isRegular: item.eventsCount >= regularThreshold && item.eventsCount < vipThreshold
    }));

    // Calcolo Statistiche Community
    const totalMembers = fullList.length;
    const multiEventCount = fullList.filter(m => m.eventsCount > 1).length;
    const fedeleCount = fullList.filter(m => m.isRegular).length;
    const vipCount = fullList.filter(m => m.isVip).length;

    const stats = {
      totalMembers,
      multiEventPercentage: totalMembers > 0 ? (multiEventCount / totalMembers) * 100 : 0,
      fedelePercentage: totalMembers > 0 ? (fedeleCount / totalMembers) * 100 : 0,
      vipPercentage: totalMembers > 0 ? (vipCount / totalMembers) * 100 : 0,
    };
    
    let filteredList = [...fullList];
    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      filteredList = filteredList.filter(item => 
        item.attendee.name.toLowerCase().includes(lowerSearch) ||
        (item.attendee.email && item.attendee.email.toLowerCase().includes(lowerSearch)) ||
        (item.attendee.phone && item.attendee.phone.includes(searchTerm))
      );
    }

    filteredList.sort((a, b) => {
      if (sortKey === 'name') {
        const comparison = a.attendee.name.localeCompare(b.attendee.name);
        return sortOrder === 'asc' ? comparison : -comparison;
      } else {
        const comparison = a.eventsCount - b.eventsCount;
        return sortOrder === 'asc' ? comparison : -comparison;
      }
    });

    return { list: filteredList, stats };
  }, [events, searchTerm, sortKey, sortOrder, vipThreshold, regularThreshold]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortOrder(key === 'eventsCount' ? 'desc' : 'asc');
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header & Navigation */}
      <div className="flex items-center gap-4">
        <button onClick={onBack} className="p-2.5 bg-white hover:bg-gray-50 text-gray-500 rounded-xl transition-colors border border-gray-100 shadow-sm">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Anagrafica & Community</h1>
          <p className="text-sm text-gray-500">Analisi e gestione dei membri di ONBEVENTI.</p>
        </div>
      </div>

      {/* Community Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-16 h-16 bg-indigo-50 rounded-bl-full group-hover:scale-110 transition-transform"></div>
          <div className="relative">
            <Users className="w-5 h-5 text-indigo-600 mb-3" />
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Membri Totali</p>
            <p className="text-3xl font-black text-gray-900 mt-1">{stats.totalMembers}</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-16 h-16 bg-pink-50 rounded-bl-full group-hover:scale-110 transition-transform"></div>
          <div className="relative">
            <Repeat className="w-5 h-5 text-pink-500 mb-3" />
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Ritorno Community</p>
            <p className="text-3xl font-black text-gray-900 mt-1">{stats.multiEventPercentage.toFixed(1)}<span className="text-sm font-bold ml-1">%</span></p>
            <p className="text-[9px] text-gray-400 mt-1 font-medium">Membri con {'>'}1 presenza</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-16 h-16 bg-green-50 rounded-bl-full group-hover:scale-110 transition-transform"></div>
          <div className="relative">
            <Star className="w-5 h-5 text-green-500 mb-3" />
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Membri Fedeli</p>
            <p className="text-3xl font-black text-gray-900 mt-1">{stats.fedelePercentage.toFixed(1)}<span className="text-sm font-bold ml-1">%</span></p>
            <p className="text-[9px] text-gray-400 mt-1 font-medium">Soglia: {regularThreshold}+ eventi</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-16 h-16 bg-yellow-50 rounded-bl-full group-hover:scale-110 transition-transform"></div>
          <div className="relative">
            <Trophy className="w-5 h-5 text-yellow-500 mb-3" />
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Membri VIP</p>
            <p className="text-3xl font-black text-gray-900 mt-1">{stats.vipPercentage.toFixed(1)}<span className="text-sm font-bold ml-1">%</span></p>
            <p className="text-[9px] text-gray-400 mt-1 font-medium">Soglia: {vipThreshold}+ eventi</p>
          </div>
        </div>
      </div>

      {/* Main List & Search */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-3 w-4 h-4 text-gray-400" />
            <input 
              type="text"
              placeholder="Cerca per nome, email o telefono..."
              className="w-full pl-11 pr-4 py-2.5 border border-gray-100 rounded-2xl text-sm focus:ring-2 focus:ring-pink-500 shadow-sm transition-all outline-none"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="flex bg-gray-50 p-1 rounded-2xl border border-gray-200">
            <button 
              onClick={() => toggleSort('name')}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${sortKey === 'name' ? 'bg-white text-indigo-950 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Nome {sortKey === 'name' && (sortOrder === 'asc' ? <SortAsc className="w-3.5 h-3.5" /> : <SortDesc className="w-3.5 h-3.5" />)}
            </button>
            <button 
              onClick={() => toggleSort('eventsCount')}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${sortKey === 'eventsCount' ? 'bg-white text-indigo-950 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Presenze {sortKey === 'eventsCount' && (sortOrder === 'asc' ? <SortAsc className="w-3.5 h-3.5" /> : <SortDesc className="w-3.5 h-3.5" />)}
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-indigo-950 text-white text-[10px] font-bold uppercase tracking-wider">
                <th className="px-6 py-4 cursor-pointer hover:bg-indigo-900 transition-colors" onClick={() => toggleSort('name')}>
                  <div className="flex items-center gap-2">
                    Membro {sortKey === 'name' && (sortOrder === 'asc' ? <SortAsc className="w-3 h-3 opacity-60" /> : <SortDesc className="w-3 h-3 opacity-60" />)}
                  </div>
                </th>
                <th className="px-6 py-4">Contatti</th>
                <th className="px-6 py-4 text-center cursor-pointer hover:bg-indigo-900 transition-colors" onClick={() => toggleSort('eventsCount')}>
                  <div className="flex items-center justify-center gap-2">
                    Presenze Effettive {sortKey === 'eventsCount' && (sortOrder === 'asc' ? <SortAsc className="w-3 h-3 opacity-60" /> : <SortDesc className="w-3 h-3 opacity-60" />)}
                  </div>
                </th>
                <th className="px-6 py-4">Ultimi Eventi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {list.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-24 text-center text-gray-400 italic">
                    <div className="flex flex-col items-center gap-3">
                      <div className="p-4 bg-gray-50 rounded-full"><Users className="w-8 h-8 opacity-20" /></div>
                      <p>Nessun membro trovato.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                list.map((item, idx) => (
                  <tr 
                    key={idx} 
                    className="hover:bg-pink-50/30 transition-colors group cursor-pointer"
                    onClick={() => onParticipantClick(item.key)}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-50 to-pink-50 text-indigo-700 flex items-center justify-center font-black text-sm shadow-sm group-hover:scale-110 transition-transform relative border border-gray-100">
                          {item.attendee.name.charAt(0).toUpperCase()}
                          {item.isVip && (
                            <div className="absolute -top-1.5 -right-1.5 bg-yellow-400 p-0.5 rounded-full border-2 border-white shadow-sm">
                              <Trophy className="w-2.5 h-2.5 text-white" />
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-gray-900 group-hover:text-pink-600 transition-colors">{item.attendee.name}</span>
                            
                            {item.isVip && (
                              <span className="inline-flex items-center bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border border-yellow-200">
                                <Trophy className="w-2.5 h-2.5 mr-1" /> VIP
                              </span>
                            )}
                            {item.isRegular && (
                              <span className="inline-flex items-center bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border border-green-200">
                                <Star className="w-2.5 h-2.5 mr-1" /> MEMBRO FEDELE
                              </span>
                            )}
                          </div>
                          {item.eventsCount >= vipThreshold && (
                            <span className="text-[9px] text-yellow-600/70 font-bold uppercase tracking-tighter">Miglior Membro</span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        {item.attendee.email && (
                          <div className="flex items-center text-[11px] text-gray-500">
                            <Mail className="w-3 h-3 mr-1.5 text-indigo-300" /> {item.attendee.email}
                          </div>
                        )}
                        {item.attendee.phone && (
                          <div className="flex items-center text-[11px] text-gray-500">
                            <Phone className="w-3 h-3 mr-1.5 text-indigo-300" /> {item.attendee.phone}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex flex-col items-center">
                        <span className={`inline-block px-4 py-1.5 rounded-full text-xs font-black border min-w-[3rem] shadow-sm transition-all ${
                          item.isVip 
                            ? 'bg-yellow-400 text-white border-yellow-500 scale-110' 
                            : item.isRegular 
                              ? 'bg-green-500 text-white border-green-600'
                              : 'bg-indigo-50 text-indigo-700 border-indigo-100'
                        }`}>
                          {item.eventsCount}
                        </span>
                        {item.totalBookings > item.eventsCount && (
                          <span className="text-[9px] text-gray-400 mt-1">({item.totalBookings} prenotazioni totali)</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1.5 max-w-sm">
                        {item.eventTitles.slice(-2).reverse().map((t, i) => (
                          <span key={i} className={`text-[9px] px-2 py-0.5 rounded border shadow-sm truncate max-w-[120px] ${
                            i === 0 ? 'bg-indigo-50 text-indigo-700 border-indigo-100 font-bold' : 'bg-white text-gray-500 border-gray-100'
                          }`}>
                            {t}
                          </span>
                        ))}
                        {item.eventTitles.length > 2 && (
                          <span className="text-[9px] text-gray-400 font-bold flex items-center">
                            +{item.eventTitles.length - 2} altri
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
