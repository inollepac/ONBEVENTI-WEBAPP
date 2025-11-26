
import React, { useState, useEffect } from 'react';
import { Button } from './Button';
import { Save, Key, ArrowLeft, ShieldCheck, ExternalLink } from 'lucide-react';

interface SettingsProps {
  onBack: () => void;
}

export const Settings: React.FC<SettingsProps> = ({ onBack }) => {
  const [apiKey, setApiKey] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const existingKey = localStorage.getItem('onbeventi_api_key');
    if (existingKey) setApiKey(existingKey);
  }, []);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('onbeventi_api_key', apiKey.trim());
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="max-w-2xl mx-auto animate-fade-in">
      <button onClick={onBack} className="mb-6 flex items-center text-sm text-gray-500 hover:text-pink-600 transition-colors font-medium">
        <ArrowLeft className="w-4 h-4 mr-1" />
        Torna alla Dashboard
      </button>

      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
        <div className="px-8 py-6 border-b border-gray-100 bg-gray-50/50">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Key className="w-6 h-6 text-pink-500" />
            Impostazioni AI
          </h2>
          <p className="text-gray-500 text-sm mt-1">Configura l'intelligenza artificiale per generare descrizioni automatiche.</p>
        </div>

        <form onSubmit={handleSave} className="p-8 space-y-6">
          <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 flex gap-3 items-start">
            <ShieldCheck className="w-6 h-6 text-indigo-600 mt-1 flex-shrink-0" />
            <div>
              <h4 className="font-bold text-indigo-900 text-sm">Privacy e Sicurezza</h4>
              <p className="text-xs text-indigo-700 mt-1">
                La tua chiave API viene salvata <strong>solo nel tuo browser</strong>. Non viene mai inviata ai nostri server.
                È necessaria per utilizzare Google Gemini per scrivere le descrizioni degli eventi.
              </p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Google Gemini API Key</label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Incolla qui la tua chiave (inizia con AIza...)"
              className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all shadow-sm font-mono"
            />
            <div className="mt-2 text-xs text-gray-500 flex items-center gap-1">
              Non hai una chiave? 
              <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-pink-600 hover:underline flex items-center font-medium">
                Generala gratis qui <ExternalLink className="w-3 h-3 ml-0.5" />
              </a>
            </div>
          </div>

          <div className="pt-4 flex items-center justify-between">
            {saved && <span className="text-green-600 text-sm font-bold animate-pulse">Chiave salvata con successo!</span>}
            <div className="flex gap-3 ml-auto">
               <Button type="button" variant="secondary" onClick={onBack}>Annulla</Button>
               <Button type="submit" className="shadow-pink-200">
                 <Save className="w-4 h-4 mr-2" />
                 Salva Impostazioni
               </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
