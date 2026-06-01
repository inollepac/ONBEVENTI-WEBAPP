
import React, { useEffect, useState } from 'react';
import { ViewState, AppEvent, ExtraExpense, EventIdea, OnbeDay, ShopProduct, ShopSale } from './types';
import { getEvents, saveEvent, isCloudEnabled, getExtraExpenses, getEventIdeas, getOnbeDays, saveOnbeDay, getShopProducts, getShopSales } from './services/storageService';
import { Dashboard } from './components/Dashboard';
import { EventForm } from './components/EventForm';
import { EventDetails } from './components/EventDetails';
import { EventsList } from './components/EventsList';
import { Settings } from './components/Settings';
import { ParticipantsList } from './components/ParticipantsList';
import { ParticipantDetails } from './components/ParticipantDetails';
import { IdeasView } from './components/IdeasView';
import { OnbeDayList } from './components/OnbeDayList';
import { OnbeDayForm } from './components/OnbeDayForm';
import { OnbeDayDetails } from './components/OnbeDayDetails';
import { OnbeShop } from './components/OnbeShop';
import { LayoutDashboard, Settings as SettingsIcon, Cloud, CloudOff, RefreshCw, Users, AlertTriangle, X, Lightbulb, Calendar as CalendarIcon, Ticket, Menu, ShoppingBag } from 'lucide-react';

export default function App() {
  const [viewState, setViewState] = useState<ViewState>({ type: 'DASHBOARD' });
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [events, setEvents] = useState<AppEvent[]>([]);
  const [onbeDays, setOnbeDays] = useState<OnbeDay[]>([]);
  const [extraExpenses, setExtraExpenses] = useState<ExtraExpense[]>([]);
  const [ideas, setIdeas] = useState<EventIdea[]>([]);
  const [shopProducts, setShopProducts] = useState<ShopProduct[]>([]);
  const [shopSales, setShopSales] = useState<ShopSale[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCloud, setIsCloud] = useState(false);
  const [firebaseError, setFirebaseError] = useState(false);

  useEffect(() => {
    refreshData();
  }, []);

  const refreshData = async () => {
    setIsLoading(true);
    setIsCloud(isCloudEnabled());
    setFirebaseError(false);
    try {
      const [eventsData, expensesData, ideasData, onbeDaysData, shopProductsData, shopSalesData] = await Promise.all([
        getEvents(),
        getExtraExpenses(),
        getEventIdeas(),
        getOnbeDays(),
        getShopProducts(),
        getShopSales()
      ]);
      setEvents(eventsData);
      setExtraExpenses(expensesData);
      setIdeas(ideasData);
      setOnbeDays(onbeDaysData);
      setShopProducts(shopProductsData);
      setShopSales(shopSalesData);
    } catch (e: any) {
      console.error("Failed to load data", e);
      if (e.message === 'FIREBASE_PERMISSION_DENIED') {
        setFirebaseError(true);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const navigateToDashboard = () => {
    setViewState({ type: 'DASHBOARD' });
    refreshData();
  };

  const handleEventSaved = async (event: AppEvent) => {
    setIsLoading(true);
    try {
      await saveEvent(event);
      setViewState({ type: 'EVENT_DETAILS', eventId: event.id });
      await refreshData();
    } catch (e: any) {
      if (e.message === 'FIREBASE_PERMISSION_DENIED') setFirebaseError(true);
      setIsLoading(false);
    }
  };

  const handleEventUpdated = async (updatedEvent: AppEvent) => {
    setEvents(prev => prev.map(e => e.id === updatedEvent.id ? updatedEvent : e));
  };

  const handleOnbeDaySaved = async (onbeDay: OnbeDay) => {
    setIsLoading(true);
    try {
      await saveOnbeDay(onbeDay);
      setViewState({ type: 'ONBEDAY_DETAILS', onbeDayId: onbeDay.id });
      await refreshData();
    } catch (e: any) {
      if (e.message === 'FIREBASE_PERMISSION_DENIED') setFirebaseError(true);
      setIsLoading(false);
    }
  };

  const handleOnbeDayUpdated = async (updatedOnbeDay: OnbeDay) => {
    setOnbeDays(prev => prev.map(e => e.id === updatedOnbeDay.id ? updatedOnbeDay : e));
  };

  const renderContent = () => {
    if (isLoading && events.length === 0) {
      return (
        <div className="flex h-[50vh] items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-600"></div>
        </div>
      );
    }

    switch (viewState.type) {
      case 'DASHBOARD':
        return (
          <Dashboard 
            events={events} 
            onbeDays={onbeDays}
            extraExpenses={extraExpenses}
            shopProducts={shopProducts}
            shopSales={shopSales}
            onCreateClick={() => setViewState({ type: 'CREATE_EVENT' })}
            onEventClick={(id) => setViewState({ type: 'EVENT_DETAILS', eventId: id })}
            onIdeasClick={() => setViewState({ type: 'IDEAS' })}
            onOnbeDayClick={() => setViewState({ type: 'ONBEDAY_LIST' })}
            onOnbeventiClick={() => setViewState({ type: 'ONBEVENTI_LIST' })}
            onRefresh={refreshData}
          />
        );
      
      case 'IDEAS':
        return (
          <IdeasView 
            ideas={ideas}
            onBack={navigateToDashboard}
            onRefresh={refreshData}
          />
        );
      
      case 'PARTICIPANTS':
        return (
          <ParticipantsList 
            events={events} 
            onbeDays={onbeDays}
            onBack={navigateToDashboard} 
            onParticipantClick={(key) => setViewState({ type: 'PARTICIPANT_DETAILS', participantKey: key })}
          />
        );
      
      case 'PARTICIPANT_DETAILS':
        return (
          <ParticipantDetails 
            participantKey={viewState.participantKey}
            events={events}
            onbeDays={onbeDays}
            onBack={() => setViewState({ type: 'PARTICIPANTS' })}
            onUpdate={refreshData}
            onEventClick={(eventId) => setViewState({ type: 'EVENT_DETAILS', eventId })}
            onOnbeDayClick={(onbeDayId) => setViewState({ type: 'ONBEDAY_DETAILS', onbeDayId })}
          />
        );
      
      case 'CREATE_EVENT':
        return <EventForm onSave={handleEventSaved} onCancel={navigateToDashboard} />;

      case 'EDIT_EVENT':
        const eventToEdit = events.find(e => e.id === viewState.eventId);
        if (!eventToEdit) return <div>Evento non trovato</div>;
        return (
          <EventForm
            initialData={eventToEdit}
            onSave={handleEventSaved}
            onCancel={() => setViewState({ type: 'EVENT_DETAILS', eventId: eventToEdit.id })}
          />
        );

      case 'EVENT_DETAILS':
        const event = events.find(e => e.id === viewState.eventId);
        if (!event) return <div>Evento non trovato</div>;
        return (
          <EventDetails 
            event={event} 
            allEvents={events}
            allOnbeDays={onbeDays}
            onBack={navigateToDashboard}
            onUpdate={handleEventUpdated}
            onDelete={navigateToDashboard}
            onEditEvent={() => setViewState({ type: 'EDIT_EVENT', eventId: event.id })}
            onParticipantClick={(participantKey) => setViewState({ type: 'PARTICIPANT_DETAILS', participantKey })}
          />
        );

      case 'ONBEVENTI_LIST':
        return (
          <EventsList 
            events={events}
            onBack={navigateToDashboard}
            onCreateClick={() => setViewState({ type: 'CREATE_EVENT' })}
            onEventClick={(id) => setViewState({ type: 'EVENT_DETAILS', eventId: id })}
          />
        );

      case 'ONBEDAY_LIST':
        return (
          <OnbeDayList 
            onbeDays={onbeDays}
            onBack={navigateToDashboard}
            onCreateClick={() => setViewState({ type: 'CREATE_ONBEDAY' })}
            onOnbeDayClick={(id) => setViewState({ type: 'ONBEDAY_DETAILS', onbeDayId: id })}
          />
        );

      case 'CREATE_ONBEDAY':
        return <OnbeDayForm onSave={handleOnbeDaySaved} onCancel={() => setViewState({ type: 'ONBEDAY_LIST' })} />;

      case 'EDIT_ONBEDAY':
        const onbeDayToEdit = onbeDays.find(e => e.id === viewState.onbeDayId);
        if (!onbeDayToEdit) return <div>ONBEDAY non trovato</div>;
        return (
          <OnbeDayForm
            initialData={onbeDayToEdit}
            onSave={handleOnbeDaySaved}
            onCancel={() => setViewState({ type: 'ONBEDAY_DETAILS', onbeDayId: onbeDayToEdit.id })}
          />
        );

      case 'ONBEDAY_DETAILS':
        const onbeDay = onbeDays.find(e => e.id === viewState.onbeDayId);
        if (!onbeDay) return <div>ONBEDAY non trovato</div>;
        return (
          <OnbeDayDetails 
            onbeDay={onbeDay} 
            allOnbeDays={onbeDays}
            allEvents={events}
            onBack={() => setViewState({ type: 'ONBEDAY_LIST' })}
            onUpdate={handleOnbeDayUpdated}
            onDelete={() => {
              navigateToDashboard();
              setViewState({ type: 'ONBEDAY_LIST' });
            }}
            onEditOnbeDay={() => setViewState({ type: 'EDIT_ONBEDAY', onbeDayId: onbeDay.id })}
            onParticipantClick={(participantKey) => setViewState({ type: 'PARTICIPANT_DETAILS', participantKey })}
          />
        );
      
      case 'SETTINGS':
        return <Settings onBack={navigateToDashboard} />;

      case 'SHOP':
        return (
          <OnbeShop 
            onBack={navigateToDashboard}
            events={events}
            onbeDays={onbeDays}
          />
        );

      default:
        return <div>View not found</div>;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row font-sans relative">
      {/* Banner Errore Firebase */}
      {firebaseError && (
        <div className="fixed top-0 left-0 right-0 z-[100] bg-red-600 text-white p-3 shadow-2xl flex items-center justify-center gap-4 animate-slide-down">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <p className="text-sm font-bold">Accesso al Cloud scaduto: i tuoi dati sono protetti ma bloccati. Vai in <b>Impostazioni</b> per risolvere.</p>
          <button onClick={() => setViewState({type: 'SETTINGS'})} className="bg-white text-red-600 px-3 py-1 rounded-lg text-xs font-black uppercase">Risolvi</button>
          <button onClick={() => setFirebaseError(false)} className="p-1 hover:bg-black/10 rounded-full"><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* Mobile Top Header Bar */}
      <header className="md:hidden bg-indigo-950 text-white px-5 py-4 flex items-center justify-between shadow-md z-30 sticky top-0 border-b border-indigo-900/50">
        <div className="flex items-center gap-2">
          <span className="text-xl font-black text-pink-400">ON</span>
          <span className="text-xl font-black text-yellow-400">BE</span>
          <span className="text-[10px] font-black text-indigo-300 uppercase tracking-widest bg-indigo-900/50 px-2 py-0.5 rounded border border-indigo-800/50">CRM</span>
        </div>
        
        <div className="flex items-center gap-3">
          <button onClick={refreshData} className="p-2 bg-indigo-900/40 rounded-xl hover:text-white transition-all border border-indigo-800/30" title="Ricarica Dati">
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          
          <button 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} 
            className="p-2 bg-indigo-900/50 rounded-xl border border-indigo-800/30 focus:outline-none focus:ring-2 focus:ring-pink-500"
          >
            {isMobileMenuOpen ? <X className="w-4 h-4 text-white" /> : <Menu className="w-4 h-4 text-indigo-200" />}
          </button>
        </div>
      </header>

      {/* Mobile Drawer Overlay Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-x-0 top-[61px] bottom-0 bg-indigo-950/98 z-50 flex flex-col p-6 animate-fade-in border-t border-indigo-900/30 overflow-y-auto">
          <div className="space-y-4 flex-1 flex flex-col justify-between">
            <nav className="space-y-2 mt-2">
              <button 
                onClick={() => { navigateToDashboard(); setIsMobileMenuOpen(false); }}
                className={`w-full flex items-center px-4 py-3.5 rounded-xl font-bold transition-all ${
                  viewState.type === 'DASHBOARD'
                    ? 'bg-gradient-to-r from-pink-600 to-purple-700 text-white shadow-lg border border-pink-500/20' 
                    : 'text-indigo-200 hover:bg-white/5 hover:text-white'
                }`}
              >
                <LayoutDashboard className="w-5 h-5 mr-3" />
                Dashboard
              </button>

              <button 
                onClick={() => { setViewState({ type: 'ONBEVENTI_LIST' }); setIsMobileMenuOpen(false); }}
                className={`w-full flex items-center px-4 py-3.5 rounded-xl font-bold transition-all ${
                  ['ONBEVENTI_LIST', 'EVENT_DETAILS', 'CREATE_EVENT', 'EDIT_EVENT'].includes(viewState.type)
                    ? 'bg-gradient-to-r from-pink-600 to-purple-700 text-white shadow-lg border border-pink-500/20' 
                    : 'text-indigo-200 hover:bg-white/5 hover:text-white'
                }`}
              >
                <Ticket className="w-5 h-5 mr-3" />
                ONBEVENTI
              </button>

              <button 
                onClick={() => { setViewState({ type: 'PARTICIPANTS' }); setIsMobileMenuOpen(false); }}
                className={`w-full flex items-center px-4 py-3.5 rounded-xl font-bold transition-all ${
                  ['PARTICIPANTS', 'PARTICIPANT_DETAILS'].includes(viewState.type)
                    ? 'bg-gradient-to-r from-pink-600 to-purple-700 text-white shadow-lg border border-pink-500/20' 
                    : 'text-indigo-200 hover:bg-white/5 hover:text-white'
                }`}
              >
                <Users className="w-5 h-5 mr-3" />
                Membri
              </button>

              <button 
                onClick={() => { setViewState({ type: 'ONBEDAY_LIST' }); setIsMobileMenuOpen(false); }}
                className={`w-full flex items-center px-4 py-3.5 rounded-xl font-bold transition-all ${
                  ['ONBEDAY_LIST', 'ONBEDAY_DETAILS', 'CREATE_ONBEDAY', 'EDIT_ONBEDAY'].includes(viewState.type)
                    ? 'bg-gradient-to-r from-pink-600 to-purple-700 text-white shadow-lg border border-pink-500/20' 
                    : 'text-indigo-200 hover:bg-white/5 hover:text-white'
                }`}
              >
                <CalendarIcon className="w-5 h-5 mr-3" />
                ONBEDAY
              </button>
              
              <button 
                onClick={() => { setViewState({ type: 'SHOP' }); setIsMobileMenuOpen(false); }}
                className={`w-full flex items-center px-4 py-3.5 rounded-xl font-bold transition-all ${
                  viewState.type === 'SHOP'
                    ? 'bg-gradient-to-r from-pink-600 to-purple-700 text-white shadow-lg border border-pink-500/20' 
                    : 'text-indigo-200 hover:bg-white/5 hover:text-white'
                }`}
              >
                <ShoppingBag className="w-5 h-5 mr-3" />
                ONBEShop
              </button>
              
              <button 
                onClick={() => { setViewState({ type: 'SETTINGS' }); setIsMobileMenuOpen(false); }}
                className={`w-full flex items-center px-4 py-3.5 rounded-xl font-bold transition-all ${
                  viewState.type === 'SETTINGS' 
                    ? 'bg-gradient-to-r from-pink-600 to-purple-700 text-white shadow-lg border border-pink-500/20' 
                    : 'text-indigo-200 hover:bg-white/5 hover:text-white'
                }`}
              >
                <SettingsIcon className="w-5 h-5 mr-3" />
                Impostazioni
              </button>
            </nav>

            <div className="bg-indigo-900/40 border border-indigo-800/50 rounded-xl p-4 mt-8">
              <div className="flex items-center justify-between mb-2">
                 <p className="text-[10px] text-indigo-300 font-bold uppercase tracking-wider">Sync Status</p>
                 {isCloud ? <Cloud className={`w-3 h-3 ${firebaseError ? 'text-red-500 animate-pulse' : 'text-green-400'}`} /> : <CloudOff className="w-3 h-3 text-gray-400" />}
              </div>
              <div className="text-[10px] text-indigo-200 font-semibold flex items-center justify-between">
                 <span>{isCloud ? (firebaseError ? 'Errore Permessi' : 'Cloud Sync') : 'Local Only'}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex bg-indigo-950 text-white w-64 flex-shrink-0 flex-col shadow-2xl z-20 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none opacity-20">
             <div className="absolute top-[-50px] left-[-50px] w-40 h-40 bg-pink-600 rounded-full blur-[60px]"></div>
        </div>

        <div className="p-6 relative z-10">
          <div className="flex items-center justify-center md:justify-start mb-10 mt-2">
             <div className="relative group cursor-default select-none">
               <div className="absolute -inset-1 bg-gradient-to-r from-pink-500 to-purple-500 rounded-xl blur opacity-40"></div>
               <div className="relative flex items-center bg-indigo-950 border border-indigo-800/50 rounded-xl px-5 py-3 shadow-2xl">
                 <div className="flex flex-col leading-none">
                    <div className="flex items-baseline gap-0.5">
                      <span className="text-2xl font-black text-pink-400">ON</span>
                      <span className="text-2xl font-black text-yellow-400">BE</span>
                    </div>
                    <span className="text-[0.5rem] font-bold text-indigo-300 uppercase tracking-widest text-right">Event Manager</span>
                 </div>
               </div>
             </div>
          </div>
          
          <nav className="space-y-3">
            <button 
              onClick={navigateToDashboard}
              className={`w-full flex items-center px-4 py-3.5 rounded-xl transition-all duration-300 font-medium ${
                viewState.type === 'DASHBOARD'
                  ? 'bg-gradient-to-r from-pink-600 to-purple-700 text-white shadow-lg border border-pink-500/30' 
                  : 'text-indigo-200 hover:bg-white/5 hover:text-white border border-transparent'
              }`}
            >
              <LayoutDashboard className="w-5 h-5 mr-3" />
              Dashboard
            </button>

            <button 
              onClick={() => setViewState({ type: 'ONBEVENTI_LIST' })}
              className={`w-full flex items-center px-4 py-3.5 rounded-xl transition-all duration-300 font-medium ${
                ['ONBEVENTI_LIST', 'EVENT_DETAILS', 'CREATE_EVENT', 'EDIT_EVENT'].includes(viewState.type)
                  ? 'bg-gradient-to-r from-pink-600 to-purple-700 text-white shadow-lg border border-pink-500/30' 
                  : 'text-indigo-200 hover:bg-white/5 hover:text-white border border-transparent'
              }`}
            >
              <Ticket className="w-5 h-5 mr-3" />
              ONBEVENTI
            </button>

            <button 
              onClick={() => setViewState({ type: 'PARTICIPANTS' })}
              className={`w-full flex items-center px-4 py-3.5 rounded-xl transition-all duration-300 font-medium ${
                ['PARTICIPANTS', 'PARTICIPANT_DETAILS'].includes(viewState.type)
                  ? 'bg-gradient-to-r from-pink-600 to-purple-700 text-white shadow-lg border border-pink-500/30' 
                  : 'text-indigo-200 hover:bg-white/5 hover:text-white border border-transparent'
              }`}
            >
              <Users className="w-5 h-5 mr-3" />
              Membri
            </button>

            <button 
              onClick={() => setViewState({ type: 'ONBEDAY_LIST' })}
              className={`w-full flex items-center px-4 py-3.5 rounded-xl transition-all duration-300 font-medium ${
                ['ONBEDAY_LIST', 'ONBEDAY_DETAILS', 'CREATE_ONBEDAY', 'EDIT_ONBEDAY'].includes(viewState.type)
                  ? 'bg-gradient-to-r from-pink-600 to-purple-700 text-white shadow-lg border border-pink-500/30' 
                  : 'text-indigo-200 hover:bg-white/5 hover:text-white border border-transparent'
              }`}
            >
              <CalendarIcon className="w-5 h-5 mr-3" />
              ONBEDAY
            </button>
            
            <button 
              onClick={() => setViewState({ type: 'SHOP' })}
              className={`w-full flex items-center px-4 py-3.5 rounded-xl transition-all duration-300 font-medium ${
                viewState.type === 'SHOP'
                  ? 'bg-gradient-to-r from-pink-600 to-purple-700 text-white shadow-lg border border-pink-500/30' 
                  : 'text-indigo-200 hover:bg-white/5 hover:text-white border border-transparent'
              }`}
            >
              <ShoppingBag className="w-5 h-5 mr-3" />
              ONBEShop
            </button>
            
            <button 
              onClick={() => setViewState({ type: 'SETTINGS' })}
              className={`w-full flex items-center px-4 py-3.5 rounded-xl transition-all duration-300 font-medium ${
                viewState.type === 'SETTINGS' 
                  ? 'bg-gradient-to-r from-pink-600 to-purple-700 text-white shadow-lg border border-pink-500/30' 
                  : 'text-indigo-200 hover:bg-white/5 hover:text-white border border-transparent'
              }`}
            >
              <SettingsIcon className="w-5 h-5 mr-3" />
              Impostazioni
            </button>
          </nav>
        </div>
        
        <div className="p-6 mt-auto relative z-10">
          <div className="bg-indigo-900/40 border border-indigo-800/50 rounded-xl p-4 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-2">
               <p className="text-[10px] text-indigo-300 font-bold uppercase tracking-wider">Sync Status</p>
               {isCloud ? <Cloud className={`w-3 h-3 ${firebaseError ? 'text-red-500 animate-pulse' : 'text-green-400'}`} /> : <CloudOff className="w-3 h-3 text-gray-400" />}
            </div>
            <div className="text-[10px] text-indigo-200 font-medium flex items-center justify-between">
               {isCloud ? (firebaseError ? 'Errore Permessi' : 'Cloud Sync') : 'Local Only'}
               <button onClick={refreshData} className="hover:text-white transition-colors">
                 <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
               </button>
            </div>
          </div>
        </div>
      </aside>

      <main className="flex-1 p-4 md:p-8 overflow-y-auto h-[calc(100vh-64px)] md:h-screen bg-slate-50/50">
        <div className="max-w-7xl mx-auto pb-10">
          {renderContent()}
        </div>
      </main>
    </div>
  );
}
