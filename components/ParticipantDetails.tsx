
import React, { useState, useMemo, useEffect } from 'react';
import { AppEvent, Attendee, PaymentStatus } from '../types';
import { Button } from './Button';
import { 
  ArrowLeft, Edit2, Save, X, Mail, Phone, Calendar, 
  MessageCircle, ExternalLink, Trophy, History, Wallet, 
  CheckCircle, Clock, Tag, Briefcase, Download, User, UserX
} from 'lucide-react';
import { updateParticipantGlobally } from '../services/storageService';

interface ParticipantDetailsProps {
  participantKey: string;
  events: AppEvent[];
  onBack: () => void;
  onUpdate: () => void;
  onEventClick: (eventId: string) => void;
}

interface ParticipantSummary {
  baseAttendee: Attendee | null;
  totalPaid: number;
  presenceCount: number;
  history: { event: AppEvent; attendeeData: Attendee }[];
  lastSeen: string | null;
}

export const ParticipantDetails: React.FC<ParticipantDetailsProps> = ({ participantKey, events, onBack, onUpdate, onEventClick }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', gender: '' });

  const vipThreshold = Number(localStorage.getItem('onbeventi_vip_threshold') || '5');
  const regularThreshold = Number(localStorage.getItem('onbeventi_regular_threshold') || '3');

  const data = useMemo<ParticipantSummary>(() => {
    let baseAttendee: Attendee | null = null;
    let totalPaid = 0;
    let presenceCount = 0;
    const history: { event: AppEvent; attendeeData: Attendee }[] = [];

    (events || []).forEach(event => {
      const attendee = (event.attendees || []).find(a => 
        (a.email || a.phone || a.name).toLowerCase().trim() === participantKey
      );
      
      if (attendee) {
        if (!baseAttendee) baseAttendee = attendee;
        history.push({ event, attendeeData: attendee });
        
        if (attendee.status === PaymentStatus.PAID) {
          totalPaid += (attendee.paidAmount !== undefined ? attendee.paidAmount : event.cost);
        }

        if (attendee.isPresent !== false) {
          presenceCount += 1;
        }
      }
    });

    history.sort((a, b) => new Date(b.event.date).getTime() - new Date(a.event.date).getTime());
    
    const lastSeenPresence = history.find(h => h.attendeeData.isPresent !== false);
    const lastSeen = lastSeenPresence ? lastSeenPresence.event.date : null;

    return { baseAttendee, totalPaid, presenceCount, history, lastSeen };
  }, [events, participantKey]);

  useEffect(() => {
    if (data.baseAttendee) {
      setFormData({
        name: data.baseAttendee.name || '',
        email: data.baseAttendee.email || '',
        phone: data.baseAttendee.phone || '',
        gender: data.baseAttendee.gender || ''
      });
    }
  }, [data.baseAttendee]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;
    setLoading(true);
    try {
      await updateParticipantGlobally(participantKey, {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        gender: (formData.gender as 'M' | 'F' | 'Other') || undefined
      } as any);
      setIsEditing(false);
      onUpdate();
    } catch (err) {
      console.error("Errore durante l'aggiornamento globale:", err);
      alert("Errore durante l'aggiornamento.");
    } finally {
      setLoading(false);
    }
  };

  const handleExportVCard = () => {
    if (!data.baseAttendee) return;
    const { name, email, phone } = formData;
    const vcard = `BEGIN:VCARD
VERSION:3.0
FN:${name}
TEL;TYPE=CELL:${phone}
EMAIL:${email}
ORG:ONBEVENTI CRM
NOTE:Presenze effettive: ${data.presenceCount}
END:VCARD`;
    
    const blob = new Blob([vcard], { type: 'text/vcard' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${name.replace(/\s+/g, '_')}_Contatto.vcf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!data.baseAttendee) {
    return (
      <div className="p-12 text-center">
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 max-w-md mx-auto">
          <User className="w-12 h-12 text-gray-200 mx-auto mb-4" />
          <p className="text-gray-500 font-medium">Membro non trovato nel database.</p>
          <Button onClick={onBack} variant="secondary" className="mt-4">Torna alla lista</Button>
        </div>
      </div>
    );
  }

  const isVip = data.presenceCount >= vipThreshold;
  const isRegular = data.presenceCount >= regularThreshold;

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between bg-white p-6 rounded-2xl shadow-sm border border-gray-100 gap-4">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2.5 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors border border-gray-100">
            <ArrowLeft className="w-5 h-5 text-gray-500" />
          </button>
          <div>
            <h1 className="text-2xl font-black text-gray-900 leading-tight">Profilo Membro</h1>
            <p className="text-xs text-indigo-500 font-bold uppercase tracking-wider">ONBEVENTI Community System</p>
          </div>
        </div>
        <div className="flex gap-2">
           {!isEditing ? (
             <>
               <Button variant="secondary" onClick={handleExportVCard}>
                 <Download className="w-4 h-4 mr-2" /> VCard
               </Button>
               <Button onClick={() => setIsEditing(true)}>
                 <Edit2 className="w-4 h-4 mr-2" /> Modifica Dati
               </Button>
             </>
           ) : (
             <div className="flex gap-2">
                <Button variant="ghost" onClick={() => setIsEditing(false)}>Annulla</Button>
                <Button onClick={handleSave} isLoading={loading}>
                   <Save className="w-4 h-4 mr-2" /> Aggiorna Ovunque
                </Button>
             </div>
           )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="space-y-6">
          <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 text-center relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-pink-500 to-indigo-600"></div>
            
            <div className="w-24 h-24 mx-auto rounded-3xl bg-indigo-50 flex items-center justify-center text-4xl font-black text-indigo-600 border-4 border-white shadow-xl mb-6 relative">
              {formData.name.charAt(0).toUpperCase()}
              {isVip && (
                <div className="absolute -top-3 -right-3 bg-yellow-400 p-2 rounded-full border-4 border-white shadow-lg">
                  <Trophy className="w-5 h-5 text-white" />
                </div>
              )}
            </div>

            {isEditing ? (
              <form onSubmit={handleSave} className="space-y-4 text-left">
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Nome Completo</label>
                  <input 
                    className="w-full mt-1 px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:ring-2 focus:ring-pink-500 outline-none" 
                    value={formData.name} 
                    onChange={e => setFormData(p => ({...p, name: e.target.value}))} 
                    required 
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Sesso</label>
                  <select 
                    className="w-full mt-1 px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:ring-2 focus:ring-pink-500 outline-none" 
                    value={formData.gender}
                    onChange={e => setFormData(p => ({...p, gender: e.target.value}))}
                  >
                    <option value="">Non specificato</option>
                    <option value="M">Maschio</option>
                    <option value="F">Femmina</option>
                    <option value="Other">Altro</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Email</label>
                  <input 
                    type="email" 
                    className="w-full mt-1 px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:ring-2 focus:ring-pink-500 outline-none" 
                    value={formData.email} 
                    onChange={e => setFormData(p => ({...p, email: e.target.value}))} 
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Telefono</label>
                  <input 
                    type="tel" 
                    className="w-full mt-1 px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:ring-2 focus:ring-pink-500 outline-none" 
                    value={formData.phone} 
                    onChange={e => setFormData(p => ({...p, phone: e.target.value}))} 
                  />
                </div>
              </form>
            ) : (
              <>
                <h2 className="text-2xl font-black text-gray-900 mb-1">{formData.name}</h2>
                <div className="flex flex-wrap justify-center gap-2 mb-8">
                  {formData.gender && (
                    <span className={`px-2 py-1 rounded text-[9px] font-black uppercase tracking-widest ${formData.gender === 'M' ? 'bg-blue-100 text-blue-600' : formData.gender === 'F' ? 'bg-pink-100 text-pink-600' : 'bg-gray-100 text-gray-500'}`}>
                      {formData.gender === 'M' ? 'Maschio' : formData.gender === 'F' ? 'Femmina' : 'Altro'}
                    </span>
                  )}
                  {isVip ? (
                    <span className="bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center shadow-sm">
                      <Trophy className="w-3 h-3 mr-1" /> VIP Platinum
                    </span>
                  ) : isRegular ? (
                    <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider shadow-sm">
                      Membro Fedele
                    </span>
                  ) : (
                    <span className="bg-gray-100 text-gray-500 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider shadow-sm">
                      Nuovo Iscritto
                    </span>
                  )}
                </div>

                <div className="space-y-3 pt-6 border-t border-gray-50">
                  <div className="flex items-center p-3 rounded-2xl bg-gray-50 hover:bg-gray-100 transition-colors group">
                    <Mail className="w-4 h-4 text-gray-400 mr-3" />
                    <div className="text-left flex-1">
                      <p className="text-[10px] font-black text-gray-400 uppercase">Email</p>
                      <p className="text-sm font-bold text-gray-700 truncate">{formData.email || '-'}</p>
                    </div>
                  </div>
                  <div className="flex items-center p-3 rounded-2xl bg-gray-50 hover:bg-gray-100 transition-colors group">
                    <Phone className="w-4 h-4 text-gray-400 mr-3" />
                    <div className="text-left flex-1">
                      <p className="text-[10px] font-black text-gray-400 uppercase">Telefono</p>
                      <p className="text-sm font-bold text-gray-700">{formData.phone || '-'}</p>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-8 h-8 bg-pink-50 rounded-bl-full group-hover:w-12 group-hover:h-12 transition-all"></div>
              <p className="text-[10px] font-black text-gray-400 uppercase mb-1">Totale Versato</p>
              <p className="text-2xl font-black text-pink-600">€{data.totalPaid.toFixed(2)}</p>
            </div>
            <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-8 h-8 bg-indigo-50 rounded-bl-full group-hover:w-12 group-hover:h-12 transition-all"></div>
              <p className="text-[10px] font-black text-gray-400 uppercase mb-1">Presenze</p>
              <p className="text-2xl font-black text-indigo-600">{data.presenceCount}</p>
            </div>
          </div>
          
          <div className="bg-indigo-950 p-6 rounded-3xl text-white shadow-xl relative overflow-hidden">
             <Calendar className="absolute -bottom-2 -right-2 w-16 h-16 text-white/5" />
             <p className="text-[10px] font-black text-indigo-300 uppercase tracking-widest mb-1">Ultima Presenza Reale</p>
             <p className="text-lg font-bold">
               {data.lastSeen 
                 ? new Date(data.lastSeen).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })
                 : 'Nessuna presenza registrata'
               }
             </p>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden flex flex-col h-full">
            <div className="px-6 py-5 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
              <h3 className="font-black text-gray-900 flex items-center gap-2">
                <History className="w-5 h-5 text-pink-500" />
                Storico Community
              </h3>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-indigo-950 text-white text-[10px] font-bold uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-4">Evento</th>
                    <th className="px-6 py-4">Presenza</th>
                    <th className="px-6 py-4 text-center">Pagamento</th>
                    <th className="px-6 py-4 text-right">Quota</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {data.history.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-12 text-center text-gray-400 italic">
                        Nessuna attività registrata.
                      </td>
                    </tr>
                  ) : (
                    data.history.map(({ event, attendeeData }) => {
                      const isPaid = attendeeData.status === PaymentStatus.PAID;
                      const isPresent = attendeeData.isPresent !== false;
                      const amount = attendeeData.paidAmount !== undefined ? attendeeData.paidAmount : event.cost;
                      return (
                        <tr 
                          key={event.id} 
                          className={`hover:bg-indigo-50/50 transition-colors group cursor-pointer ${!isPresent ? 'bg-gray-50/30' : ''}`}
                          onClick={() => onEventClick(event.id)}
                          title="Clicca per vedere i dettagli dell'evento"
                        >
                          <td className="px-6 py-4">
                            <div className="flex flex-col">
                              <span className={`font-bold text-gray-900 text-sm group-hover:text-indigo-600 transition-colors ${!isPresent ? 'line-through text-gray-400' : ''}`}>
                                {event.title}
                              </span>
                              <div className="text-[10px] text-gray-400 flex items-center gap-1 mt-0.5">
                                <Briefcase className="w-3 h-3" /> {event.location} • {new Date(event.date).toLocaleDateString('it-IT')}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            {isPresent ? (
                              <span className="flex items-center text-green-600 text-[10px] font-black uppercase tracking-wider">
                                <CheckCircle className="w-3 h-3 mr-1" /> Presente
                              </span>
                            ) : (
                              <span className="flex items-center text-red-400 text-[10px] font-black uppercase tracking-wider">
                                <UserX className="w-3 h-3 mr-1" /> Assente
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider shadow-sm ${
                              isPaid ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                            }`}>
                              {isPaid ? <CheckCircle className="w-3 h-3 mr-1" /> : <Clock className="w-3 h-3 mr-1" />}
                              {isPaid ? 'Pagato' : 'Sospeso'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right font-black text-sm">
                            € {amount.toFixed(2)}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
            
            <div className="p-6 bg-gray-50 border-t border-gray-100 mt-auto flex justify-between items-center">
              <div className="flex items-center gap-2">
                 <Tag className="w-4 h-4 text-pink-500" />
                 <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Resoconto Personale</span>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Contributo Reale</p>
                <p className="text-xl font-black text-gray-900">€ {data.totalPaid.toFixed(2)}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
