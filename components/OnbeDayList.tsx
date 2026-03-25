
import React from 'react';
import { OnbeDay } from '../types';
import { ArrowLeft, Plus, Calendar, MapPin, Clock, Users, ArrowRight, Ticket } from 'lucide-react';
import { Button } from './Button';

interface OnbeDayListProps {
  onbeDays: OnbeDay[];
  onBack: () => void;
  onCreateClick: () => void;
  onOnbeDayClick: (id: string) => void;
}

export const OnbeDayList: React.FC<OnbeDayListProps> = ({ onbeDays, onBack, onCreateClick, onOnbeDayClick }) => {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="flex items-center text-indigo-600 font-bold hover:text-indigo-800 transition-colors">
          <ArrowLeft className="w-5 h-5 mr-2" />
          Torna alla Dashboard
        </button>
        <Button onClick={onCreateClick} className="shadow-lg shadow-pink-200">
          <Plus className="w-5 h-5 mr-2" />
          Nuovo ONBEDAY
        </Button>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <h1 className="text-2xl font-black text-gray-900">📅 Sezione ONBEDAY</h1>
        <p className="text-gray-500 mt-1">Gestisci qui i tuoi ONBEDAY, separati dagli eventi standard.</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {onbeDays.length === 0 ? (
          <div className="p-20 text-center text-gray-400">
            <Ticket className="w-12 h-12 text-gray-200 mx-auto mb-4" />
            <p className="font-medium">Nessun ONBEDAY registrato. Crea il primo!</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {onbeDays.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(day => (
              <div 
                key={day.id} 
                className="p-6 hover:bg-gray-50 transition-all cursor-pointer group border-l-4 border-transparent hover:border-pink-500" 
                onClick={() => onOnbeDayClick(day.id)}
              >
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                  <div className="flex items-start gap-4 flex-1">
                    <div className="hidden md:flex flex-col items-center justify-center w-16 h-16 bg-pink-50 rounded-2xl border border-pink-100 text-pink-900 shrink-0">
                      <span className="text-xs font-bold uppercase">{new Date(day.date).toLocaleDateString('it-IT', { month: 'short' })}</span>
                      <span className="text-2xl font-bold">{new Date(day.date).getDate()}</span>
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900 group-hover:text-pink-600 transition-colors">{day.title}</h3>
                      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mt-2 text-sm text-gray-500">
                        <span className="flex items-center"><Calendar className="w-4 h-4 mr-1.5 text-gray-400"/> {new Date(day.date).toLocaleDateString('it-IT')}</span>
                        <span className="flex items-center"><Clock className="w-4 h-4 mr-1.5 text-gray-400"/> {day.time}</span>
                        <span className="flex items-center"><MapPin className="w-4 h-4 mr-1.5 text-gray-400"/> {day.location}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-8 w-full md:w-auto justify-between md:justify-end">
                    <div className="text-right">
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Partecipanti</p>
                      <div className="flex items-center justify-end gap-1">
                        <Users className="w-4 h-4 text-gray-400" />
                        <p className="text-lg font-bold text-gray-900">{day.attendees.length}</p>
                      </div>
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
