
import React, { useMemo, useState } from 'react';
import { AppEvent, ExtraExpense, PaymentStatus, OnbeDay, ShopProduct, ShopSale } from '../types';
import { Calendar, DollarSign, Users, Plus, ArrowRight, MapPin, Clock, Ticket, TrendingDown, Wallet, History, Receipt, Trash2, Save, Filter, ChevronDown, BarChart3, Lightbulb, LayoutGrid } from 'lucide-react';
import { Button } from './Button';
import { generateId, saveExtraExpense, deleteExtraExpense } from '../services/storageService';

interface DashboardProps {
  events: AppEvent[];
  onbeDays: OnbeDay[];
  extraExpenses: ExtraExpense[];
  shopProducts?: ShopProduct[];
  shopSales?: ShopSale[];
  onCreateClick: () => void;
  onEventClick: (id: string) => void;
  onIdeasClick: () => void;
  onOnbeDayClick: () => void;
  onOnbeventiClick?: () => void;
  onRefresh: () => void;
}

type StatsCategory = 'totale' | 'onbeventi' | 'onbeday';

export const Dashboard: React.FC<DashboardProps> = ({ events, onbeDays, extraExpenses, shopProducts = [], shopSales = [], onCreateClick, onEventClick, onIdeasClick, onOnbeDayClick, onOnbeventiClick, onRefresh }) => {
  const [showAddExtra, setShowAddExtra] = useState(false);
  const [newExtra, setNewExtra] = useState({ description: '', amount: '' });
  const [loading, setLoading] = useState(false);
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [statsCategory, setStatsCategory] = useState<StatsCategory>('totale');

  // Calcolo anni disponibili per il filtro
  const availableYears = useMemo(() => {
    const years = new Set<string>();
    events.forEach(e => years.add(new Date(e.date).getFullYear().toString()));
    onbeDays.forEach(e => years.add(new Date(e.date).getFullYear().toString()));
    extraExpenses.forEach(e => years.add(new Date(e.date).getFullYear().toString()));
    (shopSales || []).forEach(s => years.add(new Date(s.date).getFullYear().toString()));
    (shopProducts || []).forEach(p => years.add(new Date(p.createdAt).getFullYear().toString()));
    return Array.from(years).sort((a, b) => b.localeCompare(a));
  }, [events, onbeDays, extraExpenses, shopSales, shopProducts]);

  const stats = useMemo(() => {
    const today = new Date();
    today.setHours(0,0,0,0);

    // Filtro per anno
    const filterByYear = (items: any[]) => selectedYear === 'all' 
      ? items 
      : items.filter(e => {
          const itemDate = e.date || e.createdAt;
          return itemDate ? new Date(itemDate).getFullYear().toString() === selectedYear : false;
        });

    const filteredEvents = filterByYear(events);
    const filteredOnbeDays = filterByYear(onbeDays);
    const filteredExtraExpenses = filterByYear(extraExpenses);
    const filteredShopSales = filterByYear(shopSales || []);
    const filteredShopProducts = filterByYear(shopProducts || []);

    // Selezione dati in base alla categoria statistiche
    let targetEvents: (AppEvent | OnbeDay)[] = [];
    if (statsCategory === 'totale') {
      targetEvents = [...filteredEvents, ...filteredOnbeDays];
    } else if (statsCategory === 'onbeventi') {
      targetEvents = filteredEvents;
    } else {
      targetEvents = filteredOnbeDays;
    }

    const upcomingEvents = filteredEvents
      .filter(e => new Date(e.date) >= today)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const pastEvents = filteredEvents
      .filter(e => new Date(e.date) < today)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const upcomingOnbeDays = filteredOnbeDays
      .filter(e => new Date(e.date) >= today)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const pastOnbeDays = filteredOnbeDays
      .filter(e => new Date(e.date) < today)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // STATS filtrate per categoria
    const totalRevenue = targetEvents.reduce((acc, curr) => {
      const eventRevenue = curr.attendees.reduce((sum, a) => {
        if (a.status === PaymentStatus.PAID) {
          return sum + (a.paidAmount !== undefined ? a.paidAmount : curr.cost);
        }
        return sum;
      }, 0);
      return acc + eventRevenue;
    }, 0);

    const totalEventExpenses = targetEvents.reduce((acc, curr) => {
      return acc + (curr.expenses || []).reduce((sum, exp) => sum + exp.amount, 0);
    }, 0);

    // Le spese extra sono considerate solo nel totale
    const currentExtraExpenses = statsCategory === 'totale' ? filteredExtraExpenses : [];
    const totalExtraExpenses = currentExtraExpenses.reduce((acc, curr) => acc + curr.amount, 0);
    
    // ONBEShop calculations
    let shopRevenue = 0;
    let shopExpense = 0;

    if (statsCategory === 'totale') {
      // 1. Entrate dello shop
      shopRevenue = filteredShopSales.reduce((sum, sale) => sum + (sale.soldPrice * sale.quantity), 0);

      // 2. Costo stock per articoli che NON sono rimanenze degli eventi
      filteredShopProducts.forEach(prod => {
        if (!prod.isLeftover) {
          const totalSoldQtyOfThisProduct = (shopSales || [])
            .filter(s => s.productId === prod.id)
            .reduce((sum, s) => sum + s.quantity, 0);
          const originalBoughtQty = prod.quantity + totalSoldQtyOfThisProduct;
          shopExpense += originalBoughtQty * prod.costPrice;
        }
      });
    }

    const totalExpenses = totalEventExpenses + totalExtraExpenses + shopExpense;
    const finalRevenue = totalRevenue + shopRevenue;
    const totalProfit = finalRevenue - totalExpenses;

    const totalEventsCount = targetEvents.length;
    const totalParticipations = targetEvents.reduce((acc, curr) => 
      acc + (curr.attendees ? curr.attendees.filter(a => a.isPresent !== false).length : 0), 0);

    return { 
      upcomingEvents, 
      pastEvents,
      upcomingOnbeDays,
      pastOnbeDays,
      totalRevenue: finalRevenue, 
      totalExpenses, 
      totalProfit, 
      filteredExtraExpenses,
      totalEventsCount,
      totalParticipations,
      shopRevenue,
      shopExpense
    };
  }, [events, onbeDays, extraExpenses, shopProducts, shopSales, selectedYear, statsCategory]);

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

  const renderEventItem = (event: AppEvent | OnbeDay, type: 'ONBE' | 'ONBEDAY') => (
    <div 
      key={event.id} 
      className={`p-6 hover:bg-gray-50 transition-all cursor-pointer group border-l-4 border-transparent ${type === 'ONBE' ? 'hover:border-pink-500' : 'hover:border-indigo-500'}`} 
      onClick={() => onEventClick(event.id)}
    >
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="flex items-start gap-4 flex-1">
          <div className={`hidden md:flex flex-col items-center justify-center w-16 h-16 rounded-2xl border shrink-0 ${type === 'ONBE' ? 'bg-pink-50 border-pink-100 text-pink-900' : 'bg-indigo-50 border-indigo-100 text-indigo-900'}`}>
            <span className="text-xs font-bold uppercase">{new Date(event.date).toLocaleDateString('it-IT', { month: 'short' })}</span>
            <span className="text-2xl font-bold">{new Date(event.date).getDate()}</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className={`text-lg font-bold text-gray-900 transition-colors ${type === 'ONBE' ? 'group-hover:text-pink-600' : 'group-hover:text-indigo-600'}`}>{event.title}</h3>
              <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest ${type === 'ONBE' ? 'bg-pink-100 text-pink-600' : 'bg-indigo-100 text-indigo-600'}`}>
                {type}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mt-2 text-sm text-gray-500">
              <span className="flex items-center"><Calendar className="w-4 h-4 mr-1.5 text-gray-400"/> {new Date(event.date).toLocaleDateString('it-IT')}</span>
              <span className="flex items-center"><Clock className="w-4 h-4 mr-1.5 text-gray-400"/> {event.time}</span>
              <span className="flex items-center"><MapPin className="w-4 h-4 mr-1.5 text-gray-400"/> {event.location}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-8 w-full md:w-auto justify-between md:justify-end">
          <div className="text-right">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Presenti Effettivi</p>
            <div className="flex items-center justify-end gap-1">
              <Users className="w-4 h-4 text-gray-400" />
              <p className="text-lg font-bold text-gray-900">{event.attendees.filter(a => a.isPresent !== false).length}</p>
            </div>
          </div>
          <div className="text-right min-w-[80px]">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Costo Base</p>
            <p className={`text-lg font-bold ${type === 'ONBE' ? 'text-pink-600' : 'text-indigo-600'}`}>€ {event.cost}</p>
          </div>
          <div className={`w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center transition-colors ${type === 'ONBE' ? 'group-hover:bg-pink-100 group-hover:text-pink-600' : 'group-hover:bg-indigo-100 group-hover:text-indigo-600'}`}>
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
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Gestione <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-purple-600">ONBE</span></h1>
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

          <button 
            onClick={onIdeasClick}
            className="flex items-center justify-center px-6 py-2.5 bg-indigo-50 text-indigo-700 rounded-xl font-bold border border-indigo-100 hover:bg-indigo-100 transition-all shadow-sm flex-1 lg:flex-none"
          >
            <Lightbulb className="w-5 h-5 mr-2 text-yellow-500" />
            Idee
          </button>

          <button 
            onClick={onOnbeDayClick}
            className="flex items-center justify-center px-6 py-2.5 bg-pink-50 text-pink-700 rounded-xl font-bold border border-pink-100 hover:bg-pink-100 transition-all shadow-sm flex-1 lg:flex-none"
          >
            <Plus className="w-5 h-5 mr-2 text-pink-500" />
            ONBEDAY
          </button>
        </div>
      </div>

      {/* Stats Category Toggle */}
      <div className="flex items-center gap-2 p-1 bg-white rounded-2xl border border-gray-100 w-fit shadow-sm">
        <button 
          onClick={() => setStatsCategory('totale')}
          className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 ${statsCategory === 'totale' ? 'bg-indigo-950 text-white shadow-lg' : 'text-gray-400 hover:bg-gray-50'}`}
        >
          <LayoutGrid className="w-4 h-4" />
          Totale
        </button>
        <button 
          onClick={() => setStatsCategory('onbeventi')}
          className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 ${statsCategory === 'onbeventi' ? 'bg-pink-600 text-white shadow-lg' : 'text-gray-400 hover:bg-gray-50'}`}
        >
          <Ticket className="w-4 h-4" />
          ONBEVENTI
        </button>
        <button 
          onClick={() => setStatsCategory('onbeday')}
          className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 ${statsCategory === 'onbeday' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-400 hover:bg-gray-50'}`}
        >
          <Calendar className="w-4 h-4" />
          ONBEDAY
        </button>
      </div>

      {/* Global Stats Grid - Ordered: Activity, Revenue, Expenses, Profit */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* 1. Volume Attività */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 relative overflow-hidden">
           <div className={`absolute top-0 right-0 w-20 h-20 rounded-bl-full -mr-4 -mt-4 transition-colors ${statsCategory === 'totale' ? 'bg-indigo-50' : statsCategory === 'onbeventi' ? 'bg-pink-50' : 'bg-indigo-50'}`}></div>
           <div className="relative">
            <div className={`p-3 w-fit rounded-xl mb-4 shadow-sm transition-colors ${statsCategory === 'totale' ? 'bg-indigo-100 text-indigo-600' : statsCategory === 'onbeventi' ? 'bg-pink-100 text-pink-600' : 'bg-indigo-100 text-indigo-600'}`}>
              <BarChart3 className="w-6 h-6" />
            </div>
            <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Volume {statsCategory === 'totale' ? 'Attività' : statsCategory}</p>
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
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 relative overflow-hidden flex flex-col justify-between">
           <div className="absolute top-0 right-0 w-20 h-20 bg-green-50 rounded-bl-full -mr-4 -mt-4"></div>
           <div className="relative">
            <div className="p-3 bg-green-100 w-fit rounded-xl text-green-600 mb-4 shadow-sm">
              <DollarSign className="w-6 h-6" />
            </div>
            <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Incasso {statsCategory !== 'totale' ? statsCategory : (selectedYear === 'all' ? 'Globale' : selectedYear)}</p>
            <p className="text-3xl font-black text-gray-900 mt-1">€ {stats.totalRevenue.toLocaleString('it-IT', { minimumFractionDigits: 2 })}</p>
            
            {statsCategory === 'totale' && stats.shopRevenue > 0 && (
              <div className="mt-3 text-[10px] text-green-700 bg-green-50 border border-green-100/55 rounded-lg py-1 px-2 font-bold flex items-center justify-between">
                <span>Di cui Shop:</span>
                <span>+ € {stats.shopRevenue.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            )}
          </div>
        </div>

        {/* 3. Uscite Totali */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 relative overflow-hidden flex flex-col justify-between">
           <div className="absolute top-0 right-0 w-20 h-20 bg-red-50 rounded-bl-full -mr-4 -mt-4"></div>
           <div className="relative">
            <div className="p-3 bg-red-100 w-fit rounded-xl text-red-600 mb-4 shadow-sm">
              <TrendingDown className="w-6 h-6" />
            </div>
            <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Uscite {statsCategory !== 'totale' ? statsCategory : (selectedYear === 'all' ? 'Totali' : selectedYear)}</p>
            <p className="text-3xl font-black text-gray-900 mt-1">€ {stats.totalExpenses.toLocaleString('it-IT', { minimumFractionDigits: 2 })}</p>
            
            {statsCategory === 'totale' && stats.shopExpense > 0 && (
              <div className="mt-3 text-[10px] text-red-700 bg-red-50 border border-red-100/55 rounded-lg py-1 px-2 font-bold flex items-center justify-between">
                <span>Di cui Acquisti Shop:</span>
                <span>- € {stats.shopExpense.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            )}
          </div>
        </div>

        {/* 4. Profitto Globale */}
        <div className={`p-6 rounded-2xl shadow-xl border relative overflow-hidden transition-colors ${statsCategory === 'onbeventi' ? 'bg-pink-900 border-pink-800' : 'bg-indigo-950 border-indigo-900'}`}>
           <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-bl-full -mr-8 -mt-8 blur-xl"></div>
           <div className="relative">
            <div className="p-3 bg-white/10 w-fit rounded-xl text-white mb-4 shadow-inner">
              <Wallet className="w-6 h-6" />
            </div>
            <p className="text-xs text-indigo-100 font-bold uppercase tracking-wider opacity-70">Profitto {statsCategory !== 'totale' ? statsCategory : (selectedYear === 'all' ? 'Globale' : selectedYear)}</p>
            <p className="text-3xl font-black text-white mt-1">€ {stats.totalProfit.toLocaleString('it-IT', { minimumFractionDigits: 2 })}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* ONBE Events Section */}
        <div className="space-y-8">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-black text-gray-900 flex items-center gap-2">
              <Ticket className="w-6 h-6 text-pink-500" />
              Eventi ONBE
            </h2>
            <button 
              onClick={() => onOnbeventiClick?.()} 
              className="text-xs font-bold text-pink-600 hover:text-pink-800 flex items-center gap-1 transition-colors"
            >
              Vedi tutti <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          
          <div className="space-y-6">
            {/* Upcoming ONBE */}
            <section className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2 uppercase tracking-wider">
                  Prossimi
                </h3>
              </div>
              {stats.upcomingEvents.length === 0 ? (
                <div className="p-8 text-center text-gray-400 text-sm italic">Nessun evento in programma.</div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {stats.upcomingEvents.map(e => renderEventItem(e, 'ONBE'))}
                </div>
              )}
            </section>

            {/* Past ONBE */}
            <section className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden opacity-90">
              <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                <h3 className="text-sm font-bold text-gray-600 flex items-center gap-2 uppercase tracking-wider">
                  Passati
                </h3>
              </div>
              {stats.pastEvents.length === 0 ? (
                <div className="p-8 text-center text-gray-400 text-sm italic">Nessun evento passato.</div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {stats.pastEvents.map(e => renderEventItem(e, 'ONBE'))}
                </div>
              )}
            </section>
          </div>
        </div>

        {/* ONBEDAY Events Section */}
        <div className="space-y-8">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-black text-gray-900 flex items-center gap-2">
              <Calendar className="w-6 h-6 text-indigo-500" />
              ONBEDAY
            </h2>
          </div>

          <div className="space-y-6">
            {/* Upcoming ONBEDAY */}
            <section className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2 uppercase tracking-wider">
                  Prossimi
                </h3>
              </div>
              {stats.upcomingOnbeDays.length === 0 ? (
                <div className="p-8 text-center text-gray-400 text-sm italic">Nessun ONBEDAY in programma.</div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {stats.upcomingOnbeDays.map(e => renderEventItem(e, 'ONBEDAY'))}
                </div>
              )}
            </section>

            {/* Past ONBEDAY */}
            <section className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden opacity-90">
              <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                <h3 className="text-sm font-bold text-gray-600 flex items-center gap-2 uppercase tracking-wider">
                  Passati
                </h3>
              </div>
              {stats.pastOnbeDays.length === 0 ? (
                <div className="p-8 text-center text-gray-400 text-sm italic">Nessun ONBEDAY passato.</div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {stats.pastOnbeDays.map(e => renderEventItem(e, 'ONBEDAY'))}
                </div>
              )}
            </section>
          </div>
        </div>
      </div>

      {/* Extra Expenses Section - Full Width at Bottom */}
      <div className="mt-12">
        <section className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-100 bg-red-50/30 flex justify-between items-center">
            <h2 className="text-lg font-black text-gray-800 flex items-center gap-2">
              <Receipt className="w-6 h-6 text-red-500" />
              Spese Extra {selectedYear !== 'all' && `(${selectedYear})`}
            </h2>
            <button 
              onClick={() => setShowAddExtra(!showAddExtra)}
              className="text-[10px] bg-red-600 text-white px-4 py-1.5 rounded-full font-black uppercase tracking-widest hover:bg-red-700 transition-colors shadow-md"
            >
              {showAddExtra ? 'Chiudi' : 'Aggiungi Spesa'}
            </button>
          </div>

          {showAddExtra && (
            <div className="p-6 bg-red-50/50 border-b border-red-100 animate-slide-down">
              <form onSubmit={handleAddExtra} className="flex flex-col md:flex-row gap-4">
                <input 
                  className="flex-1 text-sm px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-red-500 outline-none"
                  placeholder="Descrizione (es. Affitto Ufficio)"
                  value={newExtra.description}
                  onChange={e => setNewExtra(p => ({...p, description: e.target.value}))}
                  required
                />
                <div className="flex gap-2">
                  <input 
                    type="number"
                    step="0.01"
                    className="w-32 text-sm px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-red-500 outline-none"
                    placeholder="Importo (€)"
                    value={newExtra.amount}
                    onChange={e => setNewExtra(p => ({...p, amount: e.target.value}))}
                    required
                  />
                  <button type="submit" disabled={loading} className="bg-indigo-950 text-white px-6 py-3 rounded-xl text-sm font-black shadow-lg hover:bg-indigo-900 transition-colors">
                    <Save className="w-4 h-4" />
                  </button>
                </div>
              </form>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-gray-100">
            {stats.filteredExtraExpenses.length === 0 ? (
              <div className="col-span-full p-12 text-center text-gray-400 italic bg-white">
                Nessuna spesa extra registrata.
              </div>
            ) : (
              stats.filteredExtraExpenses.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(exp => (
                <div key={exp.id} className="p-6 bg-white group hover:bg-gray-50 flex justify-between items-center transition-colors">
                  <div>
                    <p className="text-sm font-bold text-gray-800">{exp.description}</p>
                    <p className="text-xs text-gray-400 mt-1">{new Date(exp.date).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-black text-red-600">- €{exp.amount.toFixed(2)}</span>
                    <button 
                      onClick={() => handleRemoveExtra(exp.id)}
                      className="p-2 text-gray-300 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
          
          {stats.filteredExtraExpenses.length > 0 && (
            <div className="p-6 bg-gray-50 border-t border-gray-100 flex justify-between items-center">
              <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Totale Spese Extra</span>
              <span className="text-xl font-black text-red-600">€ {stats.filteredExtraExpenses.reduce((a,b)=>a+b.amount,0).toFixed(2)}</span>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};
