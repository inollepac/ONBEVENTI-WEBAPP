
import React, { useState, useMemo } from 'react';
import { AppEvent, Attendee, PaymentStatus } from '../types';
import { Button } from './Button';
import { 
  ArrowLeft, Edit2, Save, X, Mail, Phone, Calendar, 
  MessageCircle, ExternalLink, Trophy, History, Wallet, 
  User, CheckCircle, Clock, Tag, Briefcase
} from 'lucide-react';
import { updateParticipantGlobally } from '../services/storageService';

interface ParticipantDetailsProps {
  participantKey: string;
  events: AppEvent[];
  onBack: () => void;
  onUpdate: () => void;
}

export const ParticipantDetails: React.FC<ParticipantDetailsProps> = ({ participantKey, events, onBack, onUpdate }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);

  // Analisi dati partecipante
  const data = useMemo(() => {
    let baseAttendee: Attendee | null = null;
    let totalPaid = 0;
    const history: { event: AppEvent, attendeeData: Attendee }[] = [];

    events.forEach(event => {
      const attendee = event.attendees.find(a => 
        (a.email || a.phone || a.name).toLowerCase().trim() === participantKey
      );
      
      if (attendee) {
        if (!baseAttendee) baseAttendee = attendee;
        history.push({ event, attendeeData: attendee });
        
        if (attendee.status === PaymentStatus.PAID) {
          totalPaid += (attendee.paidAmount !== undefined ? attendee.paidAmount : event.cost);
        }
      }
    });

    // Ordina storia per data evento (più recenti prima)
    history.sort((a, b) => new Date(b.event.date).getTime() - new Date(a.event.date).getTime());

    return { baseAttendee, totalPaid, history };
  }, [events, participantKey]);

  const [formData, setFormData] = useState({
    name: data.baseAttendee?.name || '',
    email: data.baseAttendee?.email || '',
    phone: data.baseAttendee?.phone || ''
  });

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await updateParticipantGlobally(participantKey, formData);
      setIsEditing(false);
      onUpdate();
    } finally {
      setLoading(false);
    }
  };

  if (!data.baseAttendee) return <div className="p-8 text-center text-gray-500">Partecipante non trovato.</div>;

  const isVip = data.history.length >= 5;
  const isRegular = data.history.length >= 3;

  return (
    <div className="space-y-8 animate-fade-in pb-10">
      {/* Header & Navigation */}
      <div className="flex items-center justify-between bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2.5 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors border border-gray-100">
            <ArrowLeft className="w-5 h-5 text-gray-500" />
          </button>
          <div>
            <h1 className="text-2xl font-black text-gray-900 leading-tight">Scheda Partecipante</h1>
            <p className="text-sm text-gray-500 font-medium">Gestione anagrafica e storico partecipazioni.</p>
          </div>
        </div>
        <div className="flex gap-2">
           {!isEditing ? (
             <Button variant="secondary" onClick={() => setIsEditing(true)}>
               <Edit2 className="w-4 h-4 mr-2" /> Modifica Anagrafica
             </Button>
           ) : (
             <div className="flex gap-2">
                <Button variant="ghost" onClick={() => setIsEditing(false)}>Annulla</Button>
                <Button onClick={handleSave} isLoading={loading}>
                   <Save className="w-4 h-4 mr-2" /> Salva Modifiche
                </Button>
             </div>
           )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Profile Card & Info */}
        <div className="space-y-6">
          <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 text-center relative overflow-hidden group">
            {/* Background pattern */}
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-pink-500 to-indigo-600"></div>
            
            <div className="w-24 h-24 mx-auto rounded-3xl bg-gradient-to-br from-indigo-50 to-pink-50 flex items-center justify-center text-4xl font-black text-indigo-600 border-4 border-white shadow-xl mb-6 relative z-10">
              {data.baseAttendee.name.charAt(0).toUpperCase()}
              {isVip && (
                <div className="absolute -top-2 -right-2 bg-yellow-400 p-1.5 rounded-full border-2 border-white shadow-sm" title="VIP">
                  <Trophy className="w-4 h-4 text-white" />
                </div>
              )}
            </div>

            {isEditing ? (
              <form onSubmit={handleSave} className="space-y-4 text-left">
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Nome Completo</label>
                  <input 
                    className="w-full mt-1 px-4 py-2 bg-gray-50 border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-pink-500"
                    value={formData.name}
                    onChange={e => setFormData(p => ({...p, name: e.target.value}))}
                    required
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Email</label>
                  <input 
                    type="email"
                    className="w-full mt-1 px-4 py-2 bg-gray-50 border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-pink-500"
                    value={formData.email}
                    onChange={e => setFormData(p => ({...p, email: e.target.value}))}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Telefono</label>
                  <input 
                    type="tel"
                    className="w-full mt-1 px-4 py-2 bg-gray-50 border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-pink-500"
                    value={formData.phone}
                    onChange={e => setFormData(p => ({...p, phone: e.target.value}))}
                  />
                </div>
              </form>
            ) : (
              <>
                <h2 className="text-2xl font-extrabold text-gray-900 mb-2">{data.baseAttendee.name}</h2>
                <div className="flex flex-wrap justify-center gap-2 mb-8">
                  {isVip ? (
                    <span className="bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center">
                      <Trophy className="w-3 h-3 mr-1" /> VIP Platinum
                    </span>
                  ) : isRegular ? (
                    <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider">
                      Frequentatore Assiduo
                    </span>
                  ) : (
                    <span className="bg-gray-100 text-gray-500 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider">
                      Nuovo Cliente
                    </span>
                  )}
                </div>

                <div className="space-y-3 pt-4 border-t border-gray-50">
                  <div className="flex items-center p-3 rounded-2xl bg-gray-50 hover:bg-gray-100 transition-colors group/link">
                    <div className="p-2 bg-white rounded-lg shadow-sm text-gray-400 mr-3"><Mail className="w-4 h-4" /></div>
                    <div className="text-left flex-1">
                      <p className="text-[10px] font-bold text-gray-400 uppercase">Email</p>
                      <p className="text-sm font-semibold text-gray-700 truncate">{data.baseAttendee.email || 'Nessuna email'}</p>
                    </div>
                    {data.baseAttendee.email && (
                      <a href={`mailto:${data.baseAttendee.email}`} className="opacity-0 group-hover/link:opacity-100 p-2 text-indigo-500 hover:text-indigo-700">
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                  </div>

                  <div className="flex items-center p-3 rounded-2xl bg-gray-50 hover:bg-gray-100 transition-colors group/link">
                    <div className="p-2 bg-white rounded-lg shadow-sm text-gray-400 mr-3"><Phone className="w-4 h-4" /></div>
                    <div className="text-left flex-1">
                      <p className="text-[10px] font-bold text-gray-400 uppercase">Telefono</p>
                      <p className="text-sm font-semibold text-gray-700">{data.baseAttendee.phone || 'Nessun telefono'}</p>
                    </div>
                    {data.baseAttendee.phone && (
                      <div className="flex gap-1 opacity-0 group-hover/link:opacity-100">
                        <a href={`tel:${data.baseAttendee.phone}`} className="p-2 text-indigo-500 hover:text-indigo-700">
                          <Phone className="w-4 h-4" />
                        </a>
                        <a 
                          href={`https://wa.me/${data.baseAttendee.phone.replace(/\D/g, '')}`} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="p-2 text-green-500 hover:text-green-700"
                        >
                          <MessageCircle className="w-4 h-4" />
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm overflow-hidden relative">
              <div className="absolute top-0 right-0 w-12 h-12 bg-pink-50 rounded-bl-full -mr-2 -mt-2"></div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Totale Versato</p>
              <p className="text-2xl font-black text-pink-600">€{data.totalPaid.toFixed(2)}</p>
            </div>
            <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm overflow-hidden relative">
              <div className="absolute top-0 right-0 w-12 h-12 bg-indigo-50 rounded-bl-full -mr-2 -mt-2"></div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Eventi Totali</p>
              <p className="text-2xl font-black text-indigo-600">{data.history.length}</p>
            </div>
          </div>
        </div>

        {/* Event History Section */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden flex flex-col h-full">
            <div className="px-6 py-5 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
              <h3 className="font-black text-gray-900 flex items-center gap-2">
                <History className="w-5 h-5 text-pink-500" />
                Storico Partecipazioni
              </h3>
              <span className="text-xs bg-white px-3 py-1 rounded-full border border-gray-200 text-gray-500 font-bold">
                {data.history.length} Eventi Registrati
              </span>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-indigo-950 text-white text-[10px] font-bold uppercase tracking-wider">
                    <th className="px-6 py-4">Evento</th>
                    <th className="px-6 py-4">Data</th>
                    <th className="px-6 py-4 text-center">Stato Pagamento</th>
                    <th className="px-6 py-4 text-right">Quota</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {data.history.map(({ event, attendeeData }) => {
                    const isPaid = attendeeData.status === PaymentStatus.PAID;
                    const amount = attendeeData.paidAmount !== undefined ? attendeeData.paidAmount : event.cost;
                    const isPast = new Date(event.date) < new Date();

                    return (
                      <tr key={event.id} className="hover:bg-gray-50 transition-colors group">
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className="font-bold text-gray-900 text-sm group-hover:text-indigo-600 transition-colors">{event.title}</span>
                            <span className="text-[10px] text-gray-400 flex items-center gap-1">
                              <Briefcase className="w-3 h-3" /> {event.location}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2 text-xs text-gray-600 font-medium">
                            <Calendar className="w-3.5 h-3.5 text-gray-300" />
                            {new Date(event.date).toLocaleDateString('it-IT')}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider ${
                            isPaid ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                          }`}>
                            {isPaid ? <CheckCircle className="w-3 h-3 mr-1" /> : <Clock className="w-3 h-3 mr-1" />}
                            {isPaid ? 'Pagato' : 'In attesa'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className={`font-black text-sm ${isPaid ? 'text-gray-900' : 'text-gray-400'}`}>
                            €{amount.toFixed(2)}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {data.history.length === 0 && (
              <div className="p-20 text-center text-gray-400 italic">
                Nessun evento registrato per questo partecipante.
              </div>
            )}
            
            <div className="p-6 bg-gray-50 border-t border-gray-100 mt-auto flex justify-between items-center">
               <div className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase">
                  <Tag className="w-4 h-4 text-pink-500" /> Ticket Standard: €{events[0]?.cost || 0}
               </div>
               <div className="text-right">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Totale Reale Incassato</p>
                  <p className="text-xl font-black text-gray-900">€{data.totalPaid.toFixed(2)}</p>
               </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
