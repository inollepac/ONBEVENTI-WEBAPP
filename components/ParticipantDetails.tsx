
import React, { useState, useMemo, useEffect } from 'react';
import { AppEvent, Attendee, OnbeDay, PaymentStatus, ShopSale } from '../types';
import { Button } from './Button';
import { 
  ArrowLeft, Edit2, Save, X, Mail, Phone, Calendar, 
  MessageCircle, ExternalLink, Trophy, History, Wallet, 
  CheckCircle, Clock, Tag, Briefcase, Download, User, UserX, ShieldCheck, ShieldAlert,
  ShoppingBag, Receipt, ChevronRight, Package, Gift, Ticket
} from 'lucide-react';
import { updateParticipantGlobally } from '../services/storageService';

interface ParticipantDetailsProps {
  participantKey: string;
  events: AppEvent[];
  onbeDays: OnbeDay[];
  shopSales?: ShopSale[];
  onBack: () => void;
  onUpdate: () => void;
  onEventClick: (eventId: string) => void;
  onOnbeDayClick: (onbeDayId: string) => void;
}

interface ParticipantSummary {
  baseAttendee: Attendee | null;
  totalPaid: number;
  presenceCount: number;
  history: { event: AppEvent | OnbeDay; attendeeData: Attendee; isOnbeDay?: boolean }[];
  lastSeen: string | null;
  isAcquiredViaOnbeDay?: boolean;
  isConvertedToOnbeventi?: boolean;
}

export const ParticipantDetails: React.FC<ParticipantDetailsProps> = ({ 
  participantKey, 
  events, 
  onbeDays, 
  shopSales = [], 
  onBack, 
  onUpdate, 
  onEventClick, 
  onOnbeDayClick 
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', gender: '' });

  // Modal State for Expense Breakdown
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [activeExpenseTab, setActiveExpenseTab] = useState<'all' | 'shop' | 'events'>('all');

  const vipThreshold = Number(localStorage.getItem('onbe_vip_threshold') || '5');
  const regularThreshold = Number(localStorage.getItem('onbe_regular_threshold') || '3');

  const data = useMemo<ParticipantSummary>(() => {
    let baseAttendee: Attendee | null = null;
    let totalPaid = 0;
    let presenceCount = 0;
    const history: { event: AppEvent | OnbeDay; attendeeData: Attendee; isOnbeDay?: boolean }[] = [];

    const processItems = (items: (AppEvent | OnbeDay)[], isDay: boolean) => {
      (items || []).forEach(item => {
        const attendee = (item.attendees || []).find((a: Attendee) => 
          (a.email || a.phone || a.name).toLowerCase().trim() === participantKey
        );
        
        if (attendee) {
          if (!baseAttendee) baseAttendee = attendee;
          history.push({ event: item, attendeeData: attendee, isOnbeDay: isDay });
          
          if (attendee.status === PaymentStatus.PAID) {
            totalPaid += (attendee.paidAmount !== undefined ? attendee.paidAmount : item.cost);
          }

          if (attendee.isPresent !== false) {
            presenceCount += 1;
          }
        }
      });
    };

    processItems(events, false);
    processItems(onbeDays, true);

    history.sort((a, b) => new Date(b.event.date).getTime() - new Date(a.event.date).getTime());
    
    const presentHistory = history.filter(h => h.attendeeData.isPresent !== false);
    const lastSeenPresence = presentHistory.length > 0 ? presentHistory[0] : null;
    const earliestPresence = presentHistory.length > 0 ? presentHistory[presentHistory.length - 1] : null;
    const isAcquiredViaOnbeDay = earliestPresence ? earliestPresence.isOnbeDay === true : false;
    const isConvertedToOnbeventi = isAcquiredViaOnbeDay && presentHistory.some(h => !h.isOnbeDay);

    const lastSeen = lastSeenPresence ? lastSeenPresence.event.date : null;

    return { baseAttendee, totalPaid, presenceCount, history, lastSeen, isAcquiredViaOnbeDay, isConvertedToOnbeventi };
  }, [events, onbeDays, participantKey]);

  // Calcolo Acquisti ONBEShop per questo membro
  const memberShopSales = useMemo(() => {
    if (!shopSales || !data.baseAttendee) return [];
    const name = (data.baseAttendee.name || '').toLowerCase().trim();
    const email = (data.baseAttendee.email || '').toLowerCase().trim();
    const phone = (data.baseAttendee.phone || '').toLowerCase().trim();
    const key = participantKey.toLowerCase().trim();

    return shopSales.filter(s => {
      if (!s.buyerName) return false;
      const buyer = s.buyerName.toLowerCase().trim();
      return buyer === name || buyer === key || (email && buyer === email) || (phone && buyer === phone);
    });
  }, [shopSales, data.baseAttendee, participantKey]);

  const totalEventsPaid = useMemo(() => {
    return data.history
      .filter(h => !h.isOnbeDay && h.attendeeData.status === PaymentStatus.PAID)
      .reduce((acc, h) => acc + (h.attendeeData.paidAmount !== undefined ? h.attendeeData.paidAmount : h.event.cost), 0);
  }, [data.history]);

  const totalOnbeDaysPaid = useMemo(() => {
    return data.history
      .filter(h => h.isOnbeDay && h.attendeeData.status === PaymentStatus.PAID)
      .reduce((acc, h) => acc + (h.attendeeData.paidAmount !== undefined ? h.attendeeData.paidAmount : h.event.cost), 0);
  }, [data.history]);

  const totalShopPaid = useMemo(() => {
    return memberShopSales.reduce((acc, sale) => {
      return acc + (sale.isGift ? 0 : ((sale.soldPrice || 0) * (sale.quantity || 1)));
    }, 0);
  }, [memberShopSales]);

  const grandTotalPaid = totalEventsPaid + totalOnbeDaysPaid + totalShopPaid;

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
ORG:ONBE CRM
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
            <p className="text-xs text-indigo-500 font-bold uppercase tracking-wider">ONBE Community System</p>
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
                  {data.isAcquiredViaOnbeDay && (
                    <span className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center shadow-sm">
                      🌱 Acquisito via ONBEDAY
                    </span>
                  )}
                  {data.isConvertedToOnbeventi && (
                    <span className="bg-pink-100 text-pink-700 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center shadow-sm">
                      ✨ Convertito in ONBEVENTI
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

          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <div 
              onClick={() => setIsExpenseModalOpen(true)}
              className="bg-white p-4 sm:p-5 rounded-3xl border border-pink-100/80 hover:border-pink-300 shadow-sm hover:shadow-md relative overflow-hidden group cursor-pointer transition-all active:scale-[0.98]"
              title="Clicca per aprire il resoconto spese dettagliato e gli acquisti ONBEShop"
            >
              <div className="absolute top-0 right-0 w-8 h-8 sm:w-10 sm:h-10 bg-pink-50 rounded-bl-full group-hover:w-12 group-hover:h-12 transition-all flex items-start justify-end p-1.5">
                <Receipt className="w-3.5 h-3.5 text-pink-500" />
              </div>
              <div className="flex items-center justify-between mb-1">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Totale Versato</p>
                <span className="text-[8px] font-black text-pink-600 bg-pink-50 px-1.5 py-0.5 rounded-full border border-pink-100 flex items-center gap-0.5">
                  Dettaglio <ChevronRight className="w-2.5 h-2.5" />
                </span>
              </div>
              <p className="text-xl sm:text-2xl font-black text-pink-600">€{grandTotalPaid.toFixed(2)}</p>
              {totalShopPaid > 0 && (
                <p className="text-[9px] font-bold text-purple-600 mt-1 flex items-center gap-1">
                  <ShoppingBag className="w-3 h-3" /> Inclusi €{totalShopPaid.toFixed(2)} Shop
                </p>
              )}
            </div>

            <div className="bg-white p-4 sm:p-5 rounded-3xl border border-gray-100 shadow-sm relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-8 h-8 bg-indigo-50 rounded-bl-full group-hover:w-12 group-hover:h-12 transition-all"></div>
              <p className="text-[10px] font-black text-gray-400 uppercase mb-1">Presenze</p>
              <p className="text-xl sm:text-2xl font-black text-indigo-600">{data.presenceCount}</p>
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
                    <th className="px-6 py-4 text-center">Presenza</th>
                    <th className="px-6 py-4 text-center">Liberatoria</th>
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
                    data.history.map(({ event, attendeeData, isOnbeDay }) => {
                      const isPaid = attendeeData.status === PaymentStatus.PAID;
                      const isPresent = attendeeData.isPresent !== false;
                      const amount = attendeeData.paidAmount !== undefined ? attendeeData.paidAmount : event.cost;
                      return (
                        <tr 
                          key={event.id} 
                          className={`hover:bg-indigo-50/50 transition-colors group cursor-pointer ${!isPresent ? 'bg-gray-50/30' : ''}`}
                          onClick={() => isOnbeDay ? onOnbeDayClick(event.id) : onEventClick(event.id)}
                          title={`Clicca per vedere i dettagli dell'${isOnbeDay ? 'ONBEDAY' : 'evento'}`}
                        >
                          <td className="px-6 py-4">
                            <div className="flex flex-col">
                              <div className="flex items-center gap-2">
                                <span className={`font-bold text-gray-900 text-sm group-hover:text-indigo-600 transition-colors ${!isPresent ? 'line-through text-gray-400' : ''}`}>
                                  {event.title}
                                </span>
                                {isOnbeDay && (
                                  <span className="bg-pink-100 text-pink-600 px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-tighter">ONBEDAY</span>
                                )}
                              </div>
                              <div className="text-[10px] text-gray-400 flex items-center gap-1 mt-0.5">
                                <Briefcase className="w-3 h-3" /> {event.location} • {new Date(event.date).toLocaleDateString('it-IT')}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-center">
                            {isPresent ? (
                              <span className="flex items-center justify-center text-green-600 text-[10px] font-black uppercase tracking-wider">
                                <CheckCircle className="w-3 h-3 mr-1" /> Presente
                              </span>
                            ) : (
                              <span className="flex items-center justify-center text-red-400 text-[10px] font-black uppercase tracking-wider">
                                <UserX className="w-3 h-3 mr-1" /> Assente
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-center">
                            {!event.requiresWaiver ? (
                              <span className="text-[10px] text-gray-400 font-bold uppercase tracking-tight italic">Non richiesta</span>
                            ) : attendeeData.hasWaiver ? (
                              <span className="flex items-center justify-center text-indigo-600 text-[10px] font-black uppercase tracking-wider">
                                <ShieldCheck className="w-3 h-3 mr-1" /> Ricevuta
                              </span>
                            ) : (
                              <span className="flex items-center justify-center text-red-500 text-[10px] font-black uppercase tracking-wider">
                                <ShieldAlert className="w-3 h-3 mr-1" /> Mancante
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
            
            <div className="p-4 sm:p-6 bg-gray-50 border-t border-gray-100 mt-auto flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div className="flex items-center gap-2">
                 <Tag className="w-4 h-4 text-pink-500 shrink-0" />
                 <div>
                   <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block">Resoconto Finanziario Personale</span>
                   <span className="text-[10px] text-gray-400 font-medium">Include Partecipazioni ed Eventuali Acquisti ONBEShop</span>
                 </div>
              </div>
              <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                <div className="text-right">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Contributo Complessivo</p>
                  <p className="text-lg sm:text-xl font-black text-gray-900">€ {grandTotalPaid.toFixed(2)}</p>
                </div>
                <button
                  onClick={() => setIsExpenseModalOpen(true)}
                  className="px-3.5 py-2 bg-indigo-950 hover:bg-indigo-900 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 shrink-0"
                >
                  <Receipt className="w-3.5 h-3.5 text-pink-400" /> Vedi Dettaglio
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal Resoconto Spese e Acquisti */}
      {isExpenseModalOpen && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fade-in">
          <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-gray-100 overflow-hidden flex flex-col max-h-[90vh] my-auto">
            
            {/* Modal Header */}
            <div className="p-4 sm:p-6 bg-indigo-950 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-pink-500/20 rounded-2xl border border-pink-400/30 text-pink-300">
                  <Receipt className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black leading-tight">Resoconto Spese & Acquisti</h3>
                  <p className="text-xs text-indigo-300 font-medium truncate max-w-[200px] sm:max-w-none">
                    Membro: <span className="text-white font-bold">{formData.name}</span>
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setIsExpenseModalOpen(false)}
                className="p-2 hover:bg-white/10 rounded-xl transition-colors text-indigo-200 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* KPI Summary Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3.5 sm:p-5 bg-slate-50 border-b border-gray-100">
              <div className="bg-gradient-to-br from-pink-600 to-purple-700 text-white p-3 rounded-2xl shadow-sm">
                <p className="text-[9px] font-black uppercase text-pink-200 tracking-wider">Totale Versato</p>
                <p className="text-lg sm:text-xl font-black mt-0.5">€{grandTotalPaid.toFixed(2)}</p>
              </div>
              <div className="bg-white p-3 rounded-2xl border border-gray-100 shadow-sm">
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-wider">ONBEVENTI</p>
                <p className="text-base sm:text-lg font-black text-pink-600 mt-0.5">€{totalEventsPaid.toFixed(2)}</p>
              </div>
              <div className="bg-white p-3 rounded-2xl border border-gray-100 shadow-sm">
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-wider">ONBEDAY</p>
                <p className="text-base sm:text-lg font-black text-indigo-600 mt-0.5">€{totalOnbeDaysPaid.toFixed(2)}</p>
              </div>
              <div className="bg-white p-3 rounded-2xl border border-gray-100 shadow-sm">
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-wider">ONBEShop</p>
                <p className="text-base sm:text-lg font-black text-purple-600 mt-0.5">€{totalShopPaid.toFixed(2)}</p>
              </div>
            </div>

            {/* Tab Navigation */}
            <div className="px-4 pt-3 border-b border-gray-100 bg-white flex gap-2 overflow-x-auto">
              <button
                onClick={() => setActiveExpenseTab('all')}
                className={`px-3 py-2 text-xs font-black uppercase tracking-wider border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap ${
                  activeExpenseTab === 'all' 
                    ? 'border-pink-600 text-pink-600' 
                    : 'border-transparent text-gray-400 hover:text-gray-600'
                }`}
              >
                Tutti ({data.history.length + memberShopSales.length})
              </button>
              <button
                onClick={() => setActiveExpenseTab('shop')}
                className={`px-3 py-2 text-xs font-black uppercase tracking-wider border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap ${
                  activeExpenseTab === 'shop' 
                    ? 'border-purple-600 text-purple-600' 
                    : 'border-transparent text-gray-400 hover:text-gray-600'
                }`}
              >
                <ShoppingBag className="w-3.5 h-3.5" /> ONBEShop ({memberShopSales.length})
              </button>
              <button
                onClick={() => setActiveExpenseTab('events')}
                className={`px-3 py-2 text-xs font-black uppercase tracking-wider border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap ${
                  activeExpenseTab === 'events' 
                    ? 'border-indigo-600 text-indigo-600' 
                    : 'border-transparent text-gray-400 hover:text-gray-600'
                }`}
              >
                <Ticket className="w-3.5 h-3.5" /> Eventi & ONBEDAY ({data.history.length})
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1">
              
              {/* ONBESHOP PURCHASES SECTION */}
              {(activeExpenseTab === 'all' || activeExpenseTab === 'shop') && (
                <div className="space-y-3">
                  <h4 className="text-xs font-black uppercase tracking-wider text-purple-900 flex items-center gap-2 border-b border-purple-100 pb-2">
                    <ShoppingBag className="w-4 h-4 text-purple-600" />
                    Acquisti dallo Shop ({memberShopSales.length})
                  </h4>

                  {memberShopSales.length === 0 ? (
                    <div className="bg-purple-50/50 p-4 rounded-2xl text-center border border-purple-100/60">
                      <p className="text-xs text-purple-600 font-medium">Nessun acquisto dallo Shop registrato a nome di questo membro.</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {memberShopSales.map((sale) => {
                        const saleTotal = sale.isGift ? 0 : (sale.soldPrice * sale.quantity);
                        return (
                          <div 
                            key={sale.id}
                            className="bg-white p-3.5 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between gap-3 hover:border-purple-200 transition-all"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className={`p-2 rounded-xl shrink-0 ${sale.isGift ? 'bg-amber-100 text-amber-600' : 'bg-purple-100 text-purple-600'}`}>
                                {sale.isGift ? <Gift className="w-4 h-4" /> : <Package className="w-4 h-4" />}
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-bold text-gray-900 truncate">{sale.productName}</p>
                                <div className="flex items-center gap-2 text-[10px] text-gray-400 mt-0.5">
                                  <span>Quantità: <strong className="text-gray-700">{sale.quantity}</strong></span>
                                  <span>•</span>
                                  <span>{new Date(sale.date).toLocaleDateString('it-IT')}</span>
                                </div>
                              </div>
                            </div>

                            <div className="text-right shrink-0">
                              {sale.isGift ? (
                                <span className="inline-flex items-center bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full text-[9px] font-black uppercase">
                                  🎁 Omaggio
                                </span>
                              ) : (
                                <div>
                                  <p className="text-sm font-black text-purple-700">€ {saleTotal.toFixed(2)}</p>
                                  <p className="text-[9px] text-gray-400">€{sale.soldPrice.toFixed(2)} cad.</p>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* EVENTS & ONBEDAY SECTION */}
              {(activeExpenseTab === 'all' || activeExpenseTab === 'events') && (
                <div className="space-y-3">
                  <h4 className="text-xs font-black uppercase tracking-wider text-indigo-900 flex items-center gap-2 border-b border-indigo-100 pb-2">
                    <Ticket className="w-4 h-4 text-indigo-600" />
                    Partecipazioni Eventi & ONBEDAY ({data.history.length})
                  </h4>

                  {data.history.length === 0 ? (
                    <div className="bg-indigo-50/50 p-4 rounded-2xl text-center border border-indigo-100/60">
                      <p className="text-xs text-indigo-600 font-medium">Nessun evento o ONBEDAY a cui ha partecipato.</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {data.history.map(({ event, attendeeData, isOnbeDay }) => {
                        const isPaid = attendeeData.status === PaymentStatus.PAID;
                        const amount = attendeeData.paidAmount !== undefined ? attendeeData.paidAmount : event.cost;
                        return (
                          <div 
                            key={event.id}
                            onClick={() => {
                              setIsExpenseModalOpen(false);
                              isOnbeDay ? onOnbeDayClick(event.id) : onEventClick(event.id);
                            }}
                            className="bg-white p-3.5 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between gap-3 hover:border-pink-200 transition-all cursor-pointer group"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className={`p-2 rounded-xl shrink-0 ${isOnbeDay ? 'bg-indigo-100 text-indigo-600' : 'bg-pink-100 text-pink-600'}`}>
                                <Calendar className="w-4 h-4" />
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <p className="text-sm font-bold text-gray-900 group-hover:text-pink-600 transition-colors truncate">{event.title}</p>
                                  <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider shrink-0 ${isOnbeDay ? 'bg-indigo-100 text-indigo-700' : 'bg-pink-100 text-pink-700'}`}>
                                    {isOnbeDay ? 'ONBEDAY' : 'EVENTO'}
                                  </span>
                                </div>
                                <p className="text-[10px] text-gray-400 mt-0.5">{new Date(event.date).toLocaleDateString('it-IT')} • {event.location}</p>
                              </div>
                            </div>

                            <div className="text-right shrink-0">
                              <p className="text-sm font-black text-gray-900">€ {amount.toFixed(2)}</p>
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider ${
                                isPaid ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                              }`}>
                                {isPaid ? 'Pagato' : 'Sospeso'}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
              <div className="text-left">
                <p className="text-[10px] font-black text-gray-400 uppercase">Totale Globale Versato</p>
                <p className="text-lg font-black text-pink-600">€ {grandTotalPaid.toFixed(2)}</p>
              </div>
              <Button onClick={() => setIsExpenseModalOpen(false)}>
                Chiudi Resoconto
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
