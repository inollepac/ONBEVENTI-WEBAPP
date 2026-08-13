
import React, { useState, useMemo } from 'react';
import { AppEvent, Attendee, OnbeDay, PaymentStatus } from '../types';
import { Users, Search, Mail, Phone, ArrowLeft, SortAsc, SortDesc, Trophy, Star, Repeat, Target, LayoutGrid, Ticket, Calendar, Filter, ChevronDown, ShieldAlert, ShieldCheck, Sparkles } from 'lucide-react';

interface ParticipantsListProps {
  events: AppEvent[];
  onbeDays: OnbeDay[];
  onBack: () => void;
  onParticipantClick: (key: string) => void;
}

type SortKey = 'name' | 'eventsCount';
type SortOrder = 'asc' | 'desc';
type StatsCategory = 'generale' | 'onbeventi' | 'onbeday';

export const ParticipantsList: React.FC<ParticipantsListProps> = ({ events, onbeDays, onBack, onParticipantClick }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [statsCategory, setStatsCategory] = useState<StatsCategory>('generale');
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [showConvertedOnly, setShowConvertedOnly] = useState(false);

  const vipThreshold = Number(localStorage.getItem('onbe_vip_threshold') || '5');
  const regularThreshold = Number(localStorage.getItem('onbe_regular_threshold') || '3');

  const availableYears = useMemo(() => {
    const years = new Set<string>();
    events.forEach(e => years.add(new Date(e.date).getFullYear().toString()));
    onbeDays.forEach(e => years.add(new Date(e.date).getFullYear().toString()));
    return Array.from(years).sort((a, b) => b.localeCompare(a));
  }, [events, onbeDays]);

  const { list, stats } = useMemo(() => {
    const filterByYear = (items: any[]) => selectedYear === 'all' 
      ? items 
      : items.filter(e => new Date(e.date).getFullYear().toString() === selectedYear);

    const filteredEvents = filterByYear(events || []);
    const filteredOnbeDays = filterByYear(onbeDays || []);

    let targetItems: (AppEvent | OnbeDay)[] = [];
    if (statsCategory === 'generale') {
      targetItems = [...filteredEvents, ...filteredOnbeDays];
    } else if (statsCategory === 'onbeventi') {
      targetItems = filteredEvents;
    } else {
      targetItems = filteredOnbeDays;
    }

    const sortedItems = targetItems.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const latestEventDate = sortedItems.length > 0 ? new Date(sortedItems[0].date).getTime() : 0;

    const map = new Map<string, { 
      attendee: Attendee, 
      eventsCount: number, 
      totalBookings: number, 
      eventTitles: string[], 
      firstEventDate: number, 
      key: string,
      isVip: boolean,
      isRegular: boolean,
      missingWaivers: number
    }>();

    const processAttendees = (attendees: Attendee[], item: AppEvent | OnbeDay) => {
      const itemTimestamp = new Date(item.date).getTime();
      const waiverRequired = item.requiresWaiver === true;
      
      (attendees || []).forEach(a => {
        const key = (a.email || a.phone || a.name).toLowerCase().trim();
        const isPresent = a.isPresent !== false;
        const needsWaiver = waiverRequired && !a.hasWaiver;
        
        if (map.has(key)) {
          const existing = map.get(key)!;
          existing.totalBookings += 1;
          if (isPresent) {
            existing.eventsCount += 1;
          }
          if (needsWaiver) {
            existing.missingWaivers += 1;
          }
          if (itemTimestamp < existing.firstEventDate) {
            existing.firstEventDate = itemTimestamp;
          }
          existing.eventTitles.push(item.title);
          // Aggiorniamo il genere se non presente nel vecchio record ma presente nel nuovo
          if (!existing.attendee.gender && a.gender) {
            existing.attendee.gender = a.gender;
          }
        } else {
          map.set(key, {
            attendee: { ...a },
            eventsCount: isPresent ? 1 : 0,
            totalBookings: 1,
            eventTitles: [item.title],
            firstEventDate: itemTimestamp,
            key: key,
            isVip: false,
            isRegular: false,
            missingWaivers: needsWaiver ? 1 : 0
          });
        }
      });
    };

    targetItems.forEach(item => processAttendees(item.attendees || [], item));

    // --- Calcolo Conversione ONBEDAY -> ONBEVENTI ---
    const allYearEvents = filterByYear(events || []);
    const allYearOnbeDays = filterByYear(onbeDays || []);

    const memberJourneyMap = new Map<string, {
      firstType: 'ONBEVENTO' | 'ONBEDAY';
      firstDate: number;
      hasAttendedOnbeventi: boolean;
    }>();

    const recordMemberJourney = (item: AppEvent | OnbeDay, type: 'ONBEVENTO' | 'ONBEDAY') => {
      const itemDate = new Date(item.date).getTime();
      (item.attendees || []).forEach(a => {
        if (a.isPresent === false) return; // Conta solo presenze effettive
        const key = (a.email || a.phone || a.name).toLowerCase().trim();
        if (!key) return;

        if (memberJourneyMap.has(key)) {
          const entry = memberJourneyMap.get(key)!;
          if (type === 'ONBEVENTO') {
            entry.hasAttendedOnbeventi = true;
          }
          if (itemDate < entry.firstDate) {
            entry.firstDate = itemDate;
            entry.firstType = type;
          }
        } else {
          memberJourneyMap.set(key, {
            firstType: type,
            firstDate: itemDate,
            hasAttendedOnbeventi: type === 'ONBEVENTO'
          });
        }
      });
    };

    allYearOnbeDays.forEach(od => recordMemberJourney(od, 'ONBEDAY'));
    allYearEvents.forEach(ev => recordMemberJourney(ev, 'ONBEVENTO'));

    let onbeDayNewMembersCount = 0;
    let onbeDayConvertedToEventsCount = 0;

    memberJourneyMap.forEach(journey => {
      if (journey.firstType === 'ONBEDAY') {
        onbeDayNewMembersCount += 1;
        if (journey.hasAttendedOnbeventi) {
          onbeDayConvertedToEventsCount += 1;
        }
      }
    });

    const onbeDayConversionRate = onbeDayNewMembersCount > 0 
      ? (onbeDayConvertedToEventsCount / onbeDayNewMembersCount) * 100 
      : 0;

    const fullList = Array.from(map.values()).map(item => {
      const journey = memberJourneyMap.get(item.key);
      const isAcquiredViaOnbeDay = journey?.firstType === 'ONBEDAY';
      const isConvertedToOnbeventi = Boolean(isAcquiredViaOnbeDay && journey?.hasAttendedOnbeventi);
      return {
        ...item,
        isVip: item.eventsCount >= vipThreshold,
        isRegular: item.eventsCount >= regularThreshold && item.eventsCount < vipThreshold,
        isAcquiredViaOnbeDay,
        isConvertedToOnbeventi
      };
    });

    // Consideriamo solo i membri con almeno UNA presenza effettiva per le statistiche demografiche e di ritorno
    const activeList = fullList.filter(m => m.eventsCount > 0);
    const totalMembersCount = fullList.length; // Totale anagrafica
    const activeMembersCount = activeList.length; // Totale presenti almeno una volta

    const multiEventCount = activeList.filter(m => m.eventsCount > 1).length;
    const fedeleCount = activeList.filter(m => m.isRegular).length;
    const vipCount = activeList.filter(m => m.isVip).length;
    const totalMissingWaivers = targetItems.reduce((acc, item) => {
      if (item.requiresWaiver !== true) return acc;
      return acc + (item.attendees || []).filter(a => !a.hasWaiver).length;
    }, 0);

    // --- Calcolo Generi su membri ATTIVI ---
    const maleCount = activeList.filter(m => m.attendee.gender === 'M').length;
    const femaleCount = activeList.filter(m => m.attendee.gender === 'F').length;
    const malePercent = activeMembersCount > 0 ? (maleCount / activeMembersCount) * 100 : 0;
    const femalePercent = activeMembersCount > 0 ? (femaleCount / activeMembersCount) * 100 : 0;

    const historicalMembers = activeList.filter(m => m.firstEventDate < latestEventDate);
    const returningHistoricalCount = historicalMembers.filter(m => m.eventsCount > 1).length;
    const realReturnRate = historicalMembers.length > 0 
      ? (returningHistoricalCount / historicalMembers.length) * 100 
      : 0;

    const stats = {
      totalMembers: totalMembersCount,
      activeMembersCount,
      malePercent,
      femalePercent,
      multiEventPercentage: activeMembersCount > 0 ? (multiEventCount / activeMembersCount) * 100 : 0,
      fedelePercentage: activeMembersCount > 0 ? (fedeleCount / activeMembersCount) * 100 : 0,
      vipPercentage: activeMembersCount > 0 ? (vipCount / activeMembersCount) * 100 : 0,
      realReturnRate,
      totalMissingWaivers,
      onbeDayNewMembersCount,
      onbeDayConvertedToEventsCount,
      onbeDayConversionRate
    };
    
    let filteredList = [...fullList];
    if (showConvertedOnly) {
      filteredList = filteredList.filter(item => item.isConvertedToOnbeventi);
    }
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
  }, [events, onbeDays, searchTerm, sortKey, sortOrder, vipThreshold, regularThreshold, statsCategory, selectedYear, showConvertedOnly]);

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
      <div className="flex items-center gap-4">
        <button onClick={onBack} className="p-2.5 bg-white hover:bg-gray-50 text-gray-500 rounded-xl transition-colors border border-gray-100 shadow-sm">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Anagrafica & Community</h1>
          <p className="text-sm text-gray-500">
            Analisi {statsCategory === 'generale' ? 'generale' : statsCategory} {selectedYear === 'all' ? 'totale' : `per l'anno ${selectedYear}`}.
          </p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        {/* Stats Category Toggle */}
        <div className="flex items-center gap-1.5 p-1 bg-white rounded-2xl border border-gray-100 w-full md:w-fit shadow-sm overflow-x-auto">
          <button 
            onClick={() => setStatsCategory('generale')}
            className={`flex-1 md:flex-none px-3 sm:px-6 py-2 rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${statsCategory === 'generale' ? 'bg-indigo-950 text-white shadow-lg' : 'text-gray-400 hover:bg-gray-50'}`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            Generale
          </button>
          <button 
            onClick={() => setStatsCategory('onbeventi')}
            className={`flex-1 md:flex-none px-3 sm:px-6 py-2 rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${statsCategory === 'onbeventi' ? 'bg-pink-600 text-white shadow-lg' : 'text-gray-400 hover:bg-gray-50'}`}
          >
            <Ticket className="w-3.5 h-3.5" />
            ONBEVENTI
          </button>
          <button 
            onClick={() => setStatsCategory('onbeday')}
            className={`flex-1 md:flex-none px-3 sm:px-6 py-2 rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${statsCategory === 'onbeday' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-400 hover:bg-gray-50'}`}
          >
            <Calendar className="w-3.5 h-3.5" />
            ONBEDAY
          </button>
        </div>

        {/* Yearly Filter */}
        <div className="relative w-full md:w-auto">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <select 
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="pl-10 pr-10 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-700 outline-none focus:ring-2 focus:ring-pink-500 appearance-none min-w-[160px] w-full transition-all cursor-pointer shadow-sm"
          >
            <option value="all">Tutte le annate</option>
            {availableYears.map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-2.5 sm:gap-4">
        <div className="bg-white p-3.5 sm:p-5 rounded-3xl border border-gray-100 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-10 sm:w-12 h-10 sm:h-12 bg-indigo-50 rounded-bl-full"></div>
          <div className="relative">
            <Users className="w-4 h-4 text-indigo-600 mb-1.5" />
            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Membri Attivi</p>
            <p className="text-xl sm:text-2xl font-black text-gray-900 mt-0.5">{stats.activeMembersCount}</p>
            <div className="flex gap-1.5 sm:gap-2 mt-1.5">
              <span className="text-[8px] font-bold text-blue-500 bg-blue-50 px-1.5 py-0.5 rounded">M: {stats.malePercent.toFixed(0)}%</span>
              <span className="text-[8px] font-bold text-pink-500 bg-pink-50 px-1.5 py-0.5 rounded">F: {stats.femalePercent.toFixed(0)}%</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-3.5 sm:p-5 rounded-3xl border border-gray-100 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-10 sm:w-12 h-10 sm:h-12 bg-pink-50 rounded-bl-full"></div>
          <div className="relative">
            <Repeat className="w-4 h-4 text-pink-500 mb-1.5" />
            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Frequenza Attivi</p>
            <p className="text-xl sm:text-2xl font-black text-gray-900 mt-0.5">{stats.multiEventPercentage.toFixed(1)}%</p>
            <p className="text-[8px] text-gray-400 mt-1 font-medium italic">Min. 1 presenza</p>
          </div>
        </div>

        <div className="bg-gradient-to-br from-indigo-950 to-indigo-900 p-3.5 sm:p-5 rounded-3xl border border-indigo-800 shadow-xl relative overflow-hidden text-white group">
          <div className="absolute -top-2 -right-2 w-16 h-16 bg-pink-500/10 rounded-full blur-xl group-hover:scale-150 transition-transform"></div>
          <div className="relative">
            <Target className="w-4 h-4 text-pink-400 mb-1.5" />
            <p className="text-[9px] font-black text-indigo-300 uppercase tracking-widest">Ritorno Reale</p>
            <p className="text-xl sm:text-2xl font-black text-white mt-0.5">{stats.realReturnRate.toFixed(1)}%</p>
            <p className="text-[8px] text-indigo-400 mt-1 font-bold leading-tight uppercase tracking-tighter">
              Storici presenti
            </p>
          </div>
        </div>

        <div 
          onClick={() => setShowConvertedOnly(!showConvertedOnly)}
          className={`p-3.5 sm:p-5 rounded-3xl border shadow-sm relative overflow-hidden group cursor-pointer transition-all ${
            showConvertedOnly 
              ? 'bg-purple-950 border-purple-800 text-white ring-2 ring-purple-500 shadow-xl scale-[1.02]' 
              : 'bg-white border-gray-100 hover:border-purple-200 hover:shadow-md'
          }`}
          title="Clicca per mostrare l'elenco delle persone convertite da ONBEDAY ad ONBEVENTI"
        >
          <div className={`absolute top-0 right-0 w-10 sm:w-12 h-10 sm:h-12 rounded-bl-full transition-colors ${showConvertedOnly ? 'bg-purple-900' : 'bg-purple-50'}`}></div>
          <div className="relative">
            <div className="flex items-center justify-between mb-1">
              <Sparkles className={`w-3.5 h-3.5 ${showConvertedOnly ? 'text-purple-300' : 'text-purple-600'}`} />
              <span className={`text-[7px] sm:text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-full transition-colors ${
                showConvertedOnly ? 'bg-purple-800 text-purple-200 border border-purple-700' : 'bg-purple-50 text-purple-700'
              }`}>
                {showConvertedOnly ? 'Filtro' : 'Lista'}
              </span>
            </div>
            <p className={`text-[9px] font-black uppercase tracking-widest ${showConvertedOnly ? 'text-purple-200' : 'text-gray-400'}`}>Conv. ONBEDAY</p>
            <p className={`text-xl sm:text-2xl font-black mt-0.5 ${showConvertedOnly ? 'text-white' : 'text-purple-700'}`}>{stats.onbeDayConversionRate.toFixed(1)}%</p>
            <p className={`text-[8px] mt-0.5 font-medium italic ${showConvertedOnly ? 'text-purple-300' : 'text-gray-400'}`}>
              {stats.onbeDayConvertedToEventsCount} su {stats.onbeDayNewMembersCount}
            </p>
          </div>
        </div>

        <div className="bg-white p-3.5 sm:p-5 rounded-3xl border border-gray-100 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-10 sm:w-12 h-10 sm:h-12 bg-green-50 rounded-bl-full"></div>
          <div className="relative">
            <Star className="w-4 h-4 text-green-500 mb-1.5" />
            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Fedeli Presenti</p>
            <p className="text-xl sm:text-2xl font-black text-gray-900 mt-0.5">{stats.fedelePercentage.toFixed(1)}%</p>
            <p className="text-[8px] text-gray-400 mt-1 font-medium italic">Badge Fedeltà</p>
          </div>
        </div>

        <div className="bg-white p-3.5 sm:p-5 rounded-3xl border border-gray-100 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-10 sm:w-12 h-10 sm:h-12 bg-yellow-50 rounded-bl-full"></div>
          <div className="relative">
            <Trophy className="w-4 h-4 text-yellow-500 mb-1.5" />
            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">VIP Presenti</p>
            <p className="text-xl sm:text-2xl font-black text-gray-900 mt-0.5">{stats.vipPercentage.toFixed(1)}%</p>
            <p className="text-[8px] text-gray-400 mt-1 font-medium italic">Badge VIP</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-12 h-12 bg-red-50 rounded-bl-full"></div>
          <div className="relative">
            <ShieldAlert className="w-4 h-4 text-red-500 mb-2" />
            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Liberatorie Mancanti</p>
            <p className="text-2xl font-black text-gray-900 mt-0.5">{stats.totalMissingWaivers}</p>
            <p className="text-[8px] text-gray-400 mt-1 font-medium italic text-wrap">Totale su iscrizioni filtrate</p>
          </div>
        </div>
      </div>

      {showConvertedOnly && (
        <div className="bg-gradient-to-r from-purple-950 via-indigo-950 to-purple-900 text-white p-4.5 rounded-3xl border border-purple-800/80 shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-purple-500/20 rounded-2xl text-purple-300 border border-purple-400/20 shrink-0">
              <Sparkles className="w-5 h-5 text-purple-300" />
            </div>
            <div>
              <h4 className="text-xs font-black uppercase tracking-wider text-purple-200 flex items-center gap-2">
                Elenco Membri Convertiti ({stats.onbeDayConvertedToEventsCount} persone)
              </h4>
              <p className="text-xs text-purple-300/80 mt-0.5">
                Membri arrivati originariamente tramite un ONBEDAY che hanno successivamente partecipato anche agli ONBEVENTI.
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowConvertedOnly(false)}
            className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-xl border border-white/20 transition-all self-stretch sm:self-auto text-center shrink-0"
          >
            Ripristina (Mostra Tutti)
          </button>
        </div>
      )}

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

        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
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
                    Presenze {sortKey === 'eventsCount' && (sortOrder === 'asc' ? <SortAsc className="w-3 h-3 opacity-60" /> : <SortDesc className="w-3 h-3 opacity-60" />)}
                  </div>
                </th>
                <th className="px-6 py-4 text-center">Liberatorie</th>
                <th className="px-6 py-4">Ultimi Eventi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {list.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-24 text-center text-gray-400 italic">
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
                                <Star className="w-2.5 h-2.5 mr-1" /> FEDELE
                              </span>
                            )}
                            {item.isConvertedToOnbeventi && (
                              <span className="inline-flex items-center bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border border-purple-200">
                                <Sparkles className="w-2.5 h-2.5 mr-1 text-purple-600" /> CONVERTITO
                              </span>
                            )}
                          </div>
                          {item.eventsCount >= vipThreshold && (
                            <span className="text-[9px] text-yellow-600/70 font-bold uppercase tracking-tighter">Best Member</span>
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
                          item.eventsCount >= vipThreshold 
                            ? 'bg-yellow-400 text-white border-yellow-500 scale-110' 
                            : item.eventsCount >= regularThreshold 
                              ? 'bg-green-500 text-white border-green-600'
                              : 'bg-indigo-50 text-indigo-700 border-indigo-100'
                        }`}>
                          {item.eventsCount}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {item.missingWaivers > 0 ? (
                        <div className="flex flex-col items-center">
                          <span className="inline-flex items-center bg-red-100 text-red-700 px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider border border-red-200">
                            <ShieldAlert className="w-2.5 h-2.5 mr-1" /> {item.missingWaivers} Da Ricevere
                          </span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center">
                          <span className="inline-flex items-center bg-green-100 text-green-700 px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider border border-green-200">
                            <ShieldCheck className="w-2.5 h-2.5 mr-1" /> In Regola
                          </span>
                        </div>
                      )}
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
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards-Grid View */}
        <div className="block md:hidden space-y-4">
          {list.length === 0 ? (
            <div className="p-12 text-center text-gray-400 bg-white rounded-2xl border border-gray-100 italic flex flex-col items-center gap-3">
              <div className="p-4 bg-gray-50 rounded-full"><Users className="w-8 h-8 opacity-20" /></div>
              <p>Nessun membro trovato.</p>
            </div>
          ) : (
            list.map((item, idx) => (
              <div 
                key={idx} 
                className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm space-y-4 hover:bg-pink-50/20 active:bg-pink-50/30 transition-all cursor-pointer"
                onClick={() => onParticipantClick(item.key)}
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 shrink-0 rounded-2xl bg-gradient-to-br from-indigo-50 to-pink-50 text-indigo-700 flex items-center justify-center font-black text-base shadow-sm border border-gray-100 relative">
                    {item.attendee.name.charAt(0).toUpperCase()}
                    {item.isVip && (
                      <div className="absolute -top-1.5 -right-1.5 bg-yellow-400 p-0.5 rounded-full border border-white shadow-sm">
                        <Trophy className="w-2.5 h-2.5 text-white" />
                      </div>
                    )}
                  </div>
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="font-bold text-gray-900">{item.attendee.name}</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {item.isVip && (
                        <span className="inline-flex items-center bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider border border-yellow-200 leading-none">
                          VIP
                        </span>
                      )}
                      {item.isRegular && (
                        <span className="inline-flex items-center bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider border border-green-200 leading-none">
                          FEDELE
                        </span>
                      )}
                      {item.isConvertedToOnbeventi && (
                        <span className="inline-flex items-center bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider border border-purple-200 leading-none">
                          CONVERTITO
                        </span>
                      )}
                      {item.eventsCount >= vipThreshold && (
                        <span className="text-[9px] text-yellow-600/70 font-bold uppercase tracking-tighter self-center">Best Member</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="text-xs text-gray-400 space-y-1 pt-1 border-t border-gray-50">
                  {item.attendee.email && <div className="flex items-center"><Mail className="w-3.5 h-3.5 mr-1.5" /> {item.attendee.email}</div>}
                  {item.attendee.phone && <div className="flex items-center"><Phone className="w-3.5 h-3.5 mr-1.5" /> {item.attendee.phone}</div>}
                </div>

                <div className="flex justify-between items-center pt-3 border-t border-gray-50 gap-2">
                  <div className="flex gap-1.5">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-gray-400 flex items-center">Presenze</span>
                    <span className={`inline-flex items-center justify-center px-2 py-0.5 rounded-full text-[10px] font-black border ${
                      item.eventsCount >= vipThreshold 
                        ? 'bg-yellow-400 text-white border-yellow-500' 
                        : item.eventsCount >= regularThreshold 
                          ? 'bg-green-500 text-white border-green-600'
                          : 'bg-indigo-50 text-indigo-700 border-indigo-100'
                    }`}>
                      {item.eventsCount}
                    </span>
                  </div>
                  
                  <div>
                    {item.missingWaivers > 0 ? (
                      <span className="inline-flex items-center bg-red-100 text-red-700 px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider border border-red-200">
                        <ShieldAlert className="w-2.5 h-2.5 mr-1" /> {item.missingWaivers} NO Liberatoria
                      </span>
                    ) : (
                      <span className="inline-flex items-center bg-green-100 text-green-700 px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider border border-green-200">
                        <ShieldCheck className="w-2.5 h-2.5 mr-1" /> Liberatorie OK
                      </span>
                    )}
                  </div>
                </div>

                {item.eventTitles.length > 0 && (
                  <div className="pt-3 border-t border-gray-50 flex items-center justify-between gap-2">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-gray-400">Ultimi Eventi</span>
                    <div className="flex flex-wrap gap-1">
                      {item.eventTitles.slice(-2).reverse().map((t, i) => (
                        <span key={i} className={`text-[8px] px-2 py-0.5 rounded border shadow-sm truncate max-w-[100px] font-semibold leading-none ${
                          i === 0 ? 'bg-indigo-50 text-indigo-700 border-indigo-100' : 'bg-white text-gray-500 border-gray-100'
                        }`}>
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
