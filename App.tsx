import React, { useEffect, useState } from 'react';
import { ViewState, AppEvent } from './types';
import { getEvents, saveEvent, isCloudEnabled } from './services/storageService';
import { Dashboard } from './components/Dashboard';
import { EventForm } from './components/EventForm';
import { EventDetails } from './components/EventDetails';
import { Settings } from './components/Settings';
import { LayoutDashboard, Settings as SettingsIcon, Cloud, CloudOff, RefreshCw } from 'lucide-react';

export default function App() {
  const [viewState, setViewState] = useState<ViewState>({ type: 'DASHBOARD' });
  const [events, setEvents] = useState<AppEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCloud, setIsCloud] = useState(false);

  // Load events on mount
  useEffect(() => {
    refreshEvents();
  }, []);

  const refreshEvents = async () => {
    setIsLoading(true);
    setIsCloud(isCloudEnabled());
    try {
      const data = await getEvents();
      setEvents(data);
    } catch (e) {
      console.error("Failed to load events", e);
    } finally {
      setIsLoading(false);
    }
  };

  const navigateToDashboard = () => {
    setViewState({ type: 'DASHBOARD' });
    refreshEvents();
  };

  const handleEventSaved = async (event: AppEvent) => {
    setIsLoading(true);
    await saveEvent(event);
    setViewState({ type: 'EVENT_DETAILS', eventId: event.id });
    await refreshEvents();
  };

  const handleEventUpdated = async (updatedEvent: AppEvent) => {
    // In cloud mode, we re-fetch to ensure consistency or optimize by updating local state
    // For simplicity, we update local list then trigger refresh in background
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
            onCreateClick={() => setViewState({ type: 'CREATE_EVENT' })}
            onEventClick={(id) => setViewState({ type: 'EVENT_DETAILS', eventId: id })}
          />
        );
      
      case 'CREATE_EVENT':
        return (
          <EventForm 
            onSave={handleEventSaved}
            onCancel={navigateToDashboard}
          />
        );

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
        {/* Decorative Background Blur */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none opacity-20">
             <div className="absolute top-[-50px] left-[-50px] w-40 h-40 bg-pink-600 rounded-full blur-[60px]"></div>
             <div className="absolute bottom-[-20px] right-[-20px] w-32 h-32 bg-indigo-600 rounded-full blur-[50px]"></div>
        </div>

        <div className="p-6 relative z-10">
          {/* Logo Section */}
          <div className="flex items-center justify-center md:justify-start mb-10 mt-2">
             <div className="relative group cursor-default select-none">
               {/* Glow effect */}
               <div className="absolute -inset-1 bg-gradient-to-r from-pink-500 via-purple-500 to-yellow-500 rounded-xl blur opacity-40 group-hover:opacity-75 transition duration-700"></div>
               
               {/* Logo Container */}
               <div className="relative flex items-center bg-indigo-950 border border-indigo-800/50 rounded-xl px-5 py-3 shadow-2xl backdrop-blur-sm">
                 <div className="flex flex-col leading-none">
                    <div className="flex items-baseline gap-0.5">
                      <span className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-br from-pink-400 to-pink-600 tracking-tighter drop-shadow-sm filter" style={{ textShadow: '0 0 15px rgba(236, 72, 153, 0.4)' }}>ON</span>
                      <span className="text-3xl font-black text-yellow-400 tracking-tighter drop-shadow-sm" style={{ textShadow: '0 0 15px rgba(250, 204, 21, 0.3)' }}>BEVENTI</span>
                    </div>
                    <div className="w-full h-[1px] bg-gradient-to-r from-pink-500/50 to-transparent my-1"></div>
                    <span className="text-[0.6rem] font-bold text-indigo-300 tracking-[0.25em] uppercase text-right">Event Manager</span>
                 </div>
               </div>
             </div>
          </div>
          
          <nav className="space-y-3">
            <button 
              onClick={navigateToDashboard}
              className={`w-full flex items-center px-4 py-3.5 rounded-xl transition-all duration-300 font-medium ${
                viewState.type === 'DASHBOARD' 
                  ? 'bg-gradient-to-r from-pink-600 to-purple-700 text-white shadow-lg shadow-pink-900/30 border border-pink-500/30' 
                  : 'text-indigo-200 hover:bg-white/5 hover:text-white border border-transparent'
              }`}
            >
              <LayoutDashboard className={`w-5 h-5 mr-3 ${viewState.type === 'DASHBOARD' ? 'text-white' : 'text-indigo-400'}`} />
              Dashboard
            </button>
            
            <button 
              onClick={() => setViewState({ type: 'SETTINGS' })}
              className={`w-full flex items-center px-4 py-3.5 rounded-xl transition-all duration-300 font-medium ${
                viewState.type === 'SETTINGS' 
                  ? 'bg-gradient-to-r from-pink-600 to-purple-700 text-white shadow-lg shadow-pink-900/30 border border-pink-500/30' 
                  : 'text-indigo-200 hover:bg-white/5 hover:text-white border border-transparent'
              }`}
            >
              <SettingsIcon className={`w-5 h-5 mr-3 ${viewState.type === 'SETTINGS' ? 'text-white' : 'text-indigo-400'}`} />
              Impostazioni
            </button>
          </nav>
        </div>
        
        <div className="p-6 mt-auto relative z-10">
          <div className="bg-indigo-900/40 border border-indigo-800/50 rounded-xl p-4 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-2">
               <p className="text-[10px] text-indigo-300 font-bold uppercase tracking-wider">Storage Mode</p>
               {isCloud ? (
                 <Cloud className="w-4 h-4 text-green-400" />
               ) : (
                 <CloudOff className="w-4 h-4 text-gray-400" />
               )}
            </div>
            <div className="text-xs text-indigo-200 font-medium flex items-center justify-between">
               {isCloud ? 'Cloud Sync Attivo' : 'Salvataggio Locale'}
               <button onClick={refreshEvents} className="hover:text-white transition-colors" title="Ricarica">
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