
import React, { useState, useEffect } from 'react';
import { OnbeDay } from '../types';
import { Button } from './Button';
import { generateEventDescription } from '../services/geminiService';
import { generateId } from '../services/storageService';
import { Wand2, ArrowLeft, Calendar, MapPin, Clock, DollarSign, Users, Type, ShieldCheck } from 'lucide-react';

interface OnbeDayFormProps {
  onSave: (onbeDay: OnbeDay) => Promise<void>;
  onCancel: () => void;
  initialData?: OnbeDay; 
}

export const OnbeDayForm: React.FC<OnbeDayFormProps> = ({ onSave, onCancel, initialData }) => {
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const isEditing = !!initialData;
  
  const [formData, setFormData] = useState({
    title: '',
    date: '',
    time: '',
    location: '',
    cost: '',
    maxAttendees: '',
    description: '',
    requiresWaiver: false,
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        title: initialData.title,
        date: initialData.date,
        time: initialData.time,
        location: initialData.location,
        cost: initialData.cost.toString(),
        maxAttendees: initialData.maxAttendees ? initialData.maxAttendees.toString() : '',
        description: initialData.description,
        requiresWaiver: initialData.requiresWaiver || false,
      });
    }
  }, [initialData]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target as any;
    if (type === 'checkbox') {
      setFormData(prev => ({ ...prev, [name]: (e.target as HTMLInputElement).checked }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleGenerateDescription = async () => {
    if (!formData.title) {
      alert("Inserisci prima un titolo per l'ONBEDAY!");
      return;
    }
    setGenerating(true);
    const description = await generateEventDescription(formData.title, "Professionale ed Entusiasta");
    setFormData(prev => ({ ...prev, description }));
    setGenerating(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    const onbeDayToSave: OnbeDay = {
      id: initialData ? initialData.id : generateId(),
      title: formData.title,
      date: formData.date,
      time: formData.time,
      location: formData.location,
      cost: Number(formData.cost),
      maxAttendees: formData.maxAttendees ? Number(formData.maxAttendees) : undefined,
      description: formData.description,
      requiresWaiver: formData.requiresWaiver,
      attendees: initialData ? initialData.attendees : [],
      waitingList: initialData ? (initialData.waitingList || []) : [],
      expenses: initialData ? (initialData.expenses || []) : [],
      createdAt: initialData ? initialData.createdAt : new Date().toISOString()
    };
    
    try {
      await onSave(onbeDayToSave);
      setLoading(false);
    } catch (error) {
      console.error("Failed to save", error);
      setLoading(false);
      alert("Errore durante il salvataggio.");
    }
  };

  const inputClasses = "w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all shadow-sm";
  const iconClasses = "absolute left-3 top-2.5 w-5 h-5 text-gray-400";

  return (
    <div className="max-w-4xl mx-auto animate-fade-in">
       <button onClick={onCancel} className="mb-4 flex items-center text-sm text-gray-500 hover:text-pink-600 transition-colors font-medium" type="button">
          <ArrowLeft className="w-4 h-4 mr-1" />
          Torna alla Lista ONBEDAY
       </button>

      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
        <div className="px-8 py-6 border-b border-gray-100 bg-gray-50/50">
          <h2 className="text-2xl font-bold text-gray-900">
            {isEditing ? 'Modifica ONBEDAY' : 'Crea Nuovo ONBEDAY'}
          </h2>
          <p className="text-gray-500 text-sm mt-1">Compila i dettagli qui sotto per configurare il tuo ONBEDAY.</p>
        </div>
        
        <form onSubmit={handleSubmit} className="p-8 space-y-8">
          <div className="space-y-6">
            <h3 className="text-sm font-bold text-indigo-900 uppercase tracking-wider border-b border-gray-100 pb-2">Informazioni Principali</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Titolo ONBEDAY</label>
                <div className="relative">
                  <Type className={iconClasses} />
                  <input
                    type="text"
                    name="title"
                    required
                    className={inputClasses}
                    placeholder="Es. ONBEDAY Special Edition"
                    value={formData.title}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Data</label>
                <div className="relative">
                  <Calendar className={iconClasses} />
                  <input
                    type="date"
                    name="date"
                    required
                    className={inputClasses}
                    value={formData.date}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Ora</label>
                <div className="relative">
                  <Clock className={iconClasses} />
                  <input
                    type="time"
                    name="time"
                    required
                    className={inputClasses}
                    value={formData.time}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Luogo</label>
                <div className="relative">
                  <MapPin className={iconClasses} />
                  <input
                    type="text"
                    name="location"
                    required
                    className={inputClasses}
                    placeholder="Es. Sede ONBE"
                    value={formData.location}
                    onChange={handleChange}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <h3 className="text-sm font-bold text-indigo-900 uppercase tracking-wider border-b border-gray-100 pb-2">Dettagli & Partecipazione</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="col-span-2 p-4 bg-indigo-50/50 rounded-xl border border-indigo-100 flex items-center justify-between group hover:border-indigo-300 transition-all cursor-pointer" onClick={() => setFormData(p => ({...p, requiresWaiver: !p.requiresWaiver}))}>
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${formData.requiresWaiver ? 'bg-indigo-600 text-white' : 'bg-white text-gray-400 border border-gray-200'}`}>
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900 italic">Richiedi Liberatoria</p>
                    <p className="text-xs text-gray-500">Se attivo, verrà mostrata la colonna per monitorare le firme dei partecipanti.</p>
                  </div>
                </div>
                <div className={`relative w-12 h-6 rounded-full transition-colors ${formData.requiresWaiver ? 'bg-pink-500' : 'bg-gray-200'}`}>
                  <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${formData.requiresWaiver ? 'translate-x-6' : ''}`}></div>
                </div>
                <input 
                  type="checkbox" 
                  name="requiresWaiver" 
                  className="hidden" 
                  checked={formData.requiresWaiver} 
                  onChange={handleChange} 
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Costo Biglietto (€)</label>
                <div className="relative">
                  <DollarSign className={iconClasses} />
                  <input
                    type="number"
                    name="cost"
                    min="0"
                    step="0.01"
                    required
                    className={inputClasses}
                    placeholder="0.00"
                    value={formData.cost}
                    onChange={handleChange}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Max Partecipanti</label>
                <div className="relative">
                  <Users className={iconClasses} />
                  <input
                    type="number"
                    name="maxAttendees"
                    min="0"
                    className={inputClasses}
                    placeholder="Illimitato"
                    value={formData.maxAttendees}
                    onChange={handleChange}
                  />
                </div>
                <p className="text-xs text-gray-400 mt-1 ml-1">Lascia vuoto per nessun limite.</p>
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-sm font-medium text-gray-700">Descrizione</label>
                <button 
                  type="button" 
                  onClick={handleGenerateDescription}
                  disabled={generating}
                  className="text-xs flex items-center text-white bg-gradient-to-r from-indigo-500 to-purple-500 px-2 py-1 rounded-full shadow-sm hover:shadow-md transition-all"
                >
                  <Wand2 className="w-3 h-3 mr-1" />
                  {generating ? 'AI sta scrivendo...' : 'Genera con AI'}
                </button>
              </div>
              <textarea
                name="description"
                rows={4}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all shadow-sm"
                placeholder="Descrivi i dettagli dell'ONBEDAY..."
                value={formData.description}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="flex justify-end pt-6 border-t border-gray-100 gap-3">
            <Button type="button" variant="secondary" onClick={onCancel} className="w-full md:w-auto">
              Annulla
            </Button>
            <Button type="submit" isLoading={loading} className="w-full md:w-auto shadow-pink-200">
              {isEditing ? 'Salva Modifiche' : 'Crea ONBEDAY'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
