
import React, { useState } from 'react';
import { EventIdea } from '../types';
import { ArrowLeft, Plus, Trash2, Calendar, MapPin, AlignLeft, Save, X, Pencil } from 'lucide-react';
import { Button } from './Button';
import { generateId, saveEventIdea, deleteEventIdea } from '../services/storageService';

interface IdeasViewProps {
  ideas: EventIdea[];
  onBack: () => void;
  onRefresh: () => void;
}

export const IdeasView: React.FC<IdeasViewProps> = ({ ideas, onBack, onRefresh }) => {
  const [showForm, setShowForm] = useState(false);
  const [editingIdeaId, setEditingIdeaId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    possibleDates: [''],
    possibleLocations: ['']
  });

  const handleSaveIdea = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title) return;
    
    setLoading(true);
    try {
      const ideaToSave: EventIdea = {
        id: editingIdeaId || generateId(),
        title: formData.title,
        description: formData.description,
        possibleDates: formData.possibleDates.filter(d => d.trim() !== ''),
        possibleLocations: formData.possibleLocations.filter(l => l.trim() !== ''),
        createdAt: editingIdeaId 
          ? ideas.find(i => i.id === editingIdeaId)?.createdAt || new Date().toISOString()
          : new Date().toISOString()
      };

      await saveEventIdea(ideaToSave);
      resetForm();
      onRefresh();
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({ title: '', description: '', possibleDates: [''], possibleLocations: [''] });
    setShowForm(false);
    setEditingIdeaId(null);
  };

  const handleEditClick = (idea: EventIdea) => {
    setFormData({
      title: idea.title,
      description: idea.description,
      possibleDates: idea.possibleDates.length > 0 ? [...idea.possibleDates] : [''],
      possibleLocations: idea.possibleLocations.length > 0 ? [...idea.possibleLocations] : ['']
    });
    setEditingIdeaId(idea.id);
    setShowForm(true);
  };

  const handleDeleteIdea = async (id: string) => {
    if (!confirm("Eliminare questa idea?")) return;
    await deleteEventIdea(id);
    onRefresh();
  };

  const addDateField = () => {
    setFormData(prev => ({ ...prev, possibleDates: [...prev.possibleDates, ''] }));
  };

  const addLocationField = () => {
    setFormData(prev => ({ ...prev, possibleLocations: [...prev.possibleLocations, ''] }));
  };

  const updateDateField = (index: number, value: string) => {
    const updated = [...formData.possibleDates];
    updated[index] = value;
    setFormData(prev => ({ ...prev, possibleDates: updated }));
  };

  const updateLocationField = (index: number, value: string) => {
    const updated = [...formData.possibleLocations];
    updated[index] = value;
    setFormData(prev => ({ ...prev, possibleLocations: updated }));
  };

  const removeDateField = (index: number) => {
    if (formData.possibleDates.length <= 1) {
      setFormData(prev => ({ ...prev, possibleDates: [''] }));
      return;
    }
    setFormData(prev => ({ ...prev, possibleDates: prev.possibleDates.filter((_, i) => i !== index) }));
  };

  const removeLocationField = (index: number) => {
    if (formData.possibleLocations.length <= 1) {
      setFormData(prev => ({ ...prev, possibleLocations: [''] }));
      return;
    }
    setFormData(prev => ({ ...prev, possibleLocations: prev.possibleLocations.filter((_, i) => i !== index) }));
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="flex items-center text-indigo-600 font-bold hover:text-indigo-800 transition-colors">
          <ArrowLeft className="w-5 h-5 mr-2" />
          Torna alla Dashboard
        </button>
        <Button onClick={() => setShowForm(true)} className="shadow-lg shadow-pink-200">
          <Plus className="w-5 h-5 mr-2" />
          Nuova Idea
        </Button>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <h1 className="text-2xl font-black text-gray-900">💡 Idee per Futuri Eventi</h1>
        <p className="text-gray-500 mt-1">Annota qui le tue ispirazioni per i prossimi eventi ONBE.</p>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden animate-scale-up">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-indigo-50/50">
              <h2 className="text-xl font-black text-indigo-950">
                {editingIdeaId ? 'Modifica Idea Evento' : 'Nuova Idea Evento'}
              </h2>
              <button onClick={resetForm} className="p-2 hover:bg-white rounded-full transition-colors">
                <X className="w-6 h-6 text-gray-400" />
              </button>
            </div>
            
            <form onSubmit={handleSaveIdea} className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Titolo Evento</label>
                <input 
                  autoFocus
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-100 focus:border-pink-500 outline-none transition-all font-bold text-gray-800"
                  placeholder="es. Workshop Fotografia Notturna"
                  value={formData.title}
                  onChange={e => setFormData(p => ({...p, title: e.target.value}))}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Descrizione</label>
                <textarea 
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-100 focus:border-pink-500 outline-none transition-all text-gray-700 min-h-[100px]"
                  placeholder="Descrivi l'idea, il target, gli obiettivi..."
                  value={formData.description}
                  onChange={e => setFormData(p => ({...p, description: e.target.value}))}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest">Date Papabili</label>
                  {formData.possibleDates.map((date, idx) => (
                    <div key={idx} className="flex gap-2">
                      <input 
                        type="text"
                        className="flex-1 px-4 py-2 rounded-lg border-2 border-gray-100 focus:border-pink-500 outline-none text-sm"
                        placeholder="es. Metà Maggio / 15 Giugno"
                        value={date}
                        onChange={e => updateDateField(idx, e.target.value)}
                      />
                      <button type="button" onClick={() => removeDateField(idx)} className="p-2 text-gray-300 hover:text-red-500">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  <button type="button" onClick={addDateField} className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center">
                    <Plus className="w-3 h-3 mr-1" /> Aggiungi data
                  </button>
                </div>

                <div className="space-y-3">
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest">Luoghi Papabili</label>
                  {formData.possibleLocations.map((loc, idx) => (
                    <div key={idx} className="flex gap-2">
                      <input 
                        type="text"
                        className="flex-1 px-4 py-2 rounded-lg border-2 border-gray-100 focus:border-pink-500 outline-none text-sm"
                        placeholder="es. Parco Sempione / Studio X"
                        value={loc}
                        onChange={e => updateLocationField(idx, e.target.value)}
                      />
                      <button type="button" onClick={() => removeLocationField(idx)} className="p-2 text-gray-300 hover:text-red-500">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  <button type="button" onClick={addLocationField} className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center">
                    <Plus className="w-3 h-3 mr-1" /> Aggiungi luogo
                  </button>
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button 
                  type="submit" 
                  disabled={loading}
                  className="flex-1 bg-gradient-to-r from-pink-600 to-purple-700 text-white py-4 rounded-xl font-bold shadow-lg hover:shadow-pink-200 transition-all flex items-center justify-center disabled:opacity-50"
                >
                  <Save className="w-5 h-5 mr-2" />
                  {editingIdeaId ? 'Aggiorna Idea' : 'Salva Idea'}
                </button>
                <button 
                  type="button"
                  onClick={resetForm}
                  className="px-6 py-4 bg-gray-100 text-gray-600 rounded-xl font-bold hover:bg-gray-200 transition-all"
                >
                  Annulla
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {ideas.length === 0 ? (
          <div className="col-span-full py-20 text-center bg-white rounded-3xl border-2 border-dashed border-gray-200">
            <Lightbulb className="w-12 h-12 text-gray-200 mx-auto mb-4" />
            <p className="text-gray-400 font-medium">Nessuna idea salvata. Inizia a sognare!</p>
          </div>
        ) : (
          ideas.sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map(idea => (
            <div key={idea.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow group">
              <div className="p-6 space-y-4">
                <div className="flex justify-between items-start">
                  <h3 className="text-xl font-black text-gray-900 leading-tight">{idea.title}</h3>
                  <div className="flex gap-1">
                    <button 
                      onClick={() => handleEditClick(idea)}
                      className="p-2 text-gray-200 hover:text-indigo-500 hover:bg-indigo-50 rounded-lg transition-all"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => handleDeleteIdea(idea.id)}
                      className="p-2 text-gray-200 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {idea.description && (
                  <p className="text-sm text-gray-600 line-clamp-3 italic">
                    <AlignLeft className="w-3 h-3 inline mr-1 opacity-50" />
                    {idea.description}
                  </p>
                )}

                <div className="space-y-3 pt-2">
                  {idea.possibleDates.length > 0 && (
                    <div className="flex items-start gap-2">
                      <Calendar className="w-4 h-4 text-pink-500 mt-0.5 shrink-0" />
                      <div className="flex flex-wrap gap-1">
                        {idea.possibleDates.map((d, i) => (
                          <span key={i} className="text-[10px] font-bold bg-pink-50 text-pink-700 px-2 py-0.5 rounded-full border border-pink-100">{d}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {idea.possibleLocations.length > 0 && (
                    <div className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 text-indigo-500 mt-0.5 shrink-0" />
                      <div className="flex flex-wrap gap-1">
                        {idea.possibleLocations.map((l, i) => (
                          <span key={i} className="text-[10px] font-bold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full border border-indigo-100">{l}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div className="px-6 py-3 bg-gray-50 border-t border-gray-100 flex justify-between items-center">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Creata il {new Date(idea.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

const Lightbulb = ({ className }: { className?: string }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width="24" 
    height="24" 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A5 5 0 0 0 8 8c0 1.3.5 2.6 1.5 3.5.8.8 1.3 1.5 1.5 2.5" />
    <path d="M9 18h6" />
    <path d="M10 22h4" />
  </svg>
);
