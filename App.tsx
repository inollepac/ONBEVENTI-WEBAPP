import React, { useEffect, useState } from 'react';
import { ViewState, AppEvent, ExtraExpense } from './types';
import { getEvents, saveEvent, isCloudEnabled, getExtraExpenses } from './services/storageService';
import { Dashboard } from './components/Dashboard';
import { EventForm } from './components/EventForm';
import { EventDetails } from './components/EventDetails';
import { Settings } from './components/Settings';
import { ParticipantsList } from './components/ParticipantsList';
import { LayoutDashboard, Settings as SettingsIcon, Cloud, CloudOff, RefreshCw, Users } from 'lucide-react';

export default function App() {
  const [viewState, setViewState] = useState<ViewState>({ type: 'DASHBOARD' });
  const [events, setEvents] = useState<AppEvent[]>([]);
  const [extraExpenses, setExtraExpenses] = useState<ExtraExpense[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCloud, setIsCloud] = useState(false);

  useEffect(() => {
    refreshData();
  }, []);

  const refreshData = async () => {
    setIsLoading(true);
    setIsCloud(isCloudEnabled());
    try {
      const [eventsData, expensesData] = await Promise.all([
        getEvents(),
        getExtraExpenses()
      ]);
      setEvents(eventsData);
      setExtraExpenses(expensesData);
    } catch (e) {
      console.error("Failed to load data", e);
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
    await saveEvent(event);
    setViewState({ type: 'EVENT_DETAILS', eventId: event.id });
    await refreshData();
  };

  const handleEventUpdated = async (updatedEvent: AppEvent) => {
    setEvents(prev => prev.map(e => e.id === updatedEvent.id ? updatedEvent : e));
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
            extraExpenses={extraExpenses}
            onCreateClick={() => setViewState({ type: 'CREATE_EVENT' })}
            onEventClick={(id) => setViewState({ type: 'EVENT_DETAILS', eventId: id })}
            onRefresh={refreshData}
          />
        );
      
      case 'PARTICIPANTS':
        return <ParticipantsList events={events} onBack={navigateToDashboard} />;
      
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
            onBack={navigateToDashboard}
            onUpdate={handleEventUpdated}
            onDelete={navigateToDashboard}
            onEditEvent={() => setViewState({ type: 'EDIT_EVENT', eventId: event.id })}
          />
        );
      
      case 'SETTINGS':
        return <Settings onBack={navigateToDashboard} />;

      default:
        return <div>View not found</div>;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row font-sans">
      {/* Sidebar Navigation */}
      <aside className="bg-indigo-950 text-white w-full md:w-64 flex-shrink-0 flex flex-col shadow-2xl z-20 relative overflow-hidden">
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
                      <span className="text-2xl font-black text-yellow-400">BEVENTI</span>
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
                viewState.type === 'DASHBOARD' || viewState.type === 'EVENT_DETAILS' || viewState.type === 'CREATE_EVENT' || viewState.type === 'EDIT_EVENT'
                  ? 'bg-gradient-to-r from-pink-600 to-purple-700 text-white shadow-lg border border-pink-500/30' 
                  : 'text-indigo-200 hover:bg-white/5 hover:text-white border border-transparent'
              }`}
            >
              <LayoutDashboard className="w-5 h-5 mr-3" />
              Dashboard
            </button>

            <button 
              onClick={() => setViewState({ type: 'PARTICIPANTS' })}
              className={`w-full flex items-center px-4 py-3.5 rounded-xl transition-all duration-300 font-medium ${
                viewState.type === 'PARTICIPANTS' 
                  ? 'bg-gradient-to-r from-pink-600 to-purple-700 text-white shadow-lg border border-pink-500/30' 
                  : 'text-indigo-200 hover:bg-white/5 hover:text-white border border-transparent'
              }`}
            >
              <Users className="w-5 h-5 mr-3" />
              Partecipanti
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
               {isCloud ? <Cloud className="w-3 h-3 text-green-400" /> : <CloudOff className="w-3 h-3 text-gray-400" />}
            </div>
            <div className="text-[10px] text-indigo-200 font-medium flex items-center justify-between">
               {isCloud ? 'Cloud Sync' : 'Local Only'}
               <button onClick={refreshData} className="hover:text-white transition-colors">
                 <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
               </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto h-screen bg-slate-50/50">
        <div className="max-w-7xl mx-auto pb-10">
          {renderContent()}
        </div>
      </main>
    </div>
  );
}
