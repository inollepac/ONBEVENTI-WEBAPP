
import React, { useState, useEffect } from 'react';
import { Button } from './Button';
import { Save, ArrowLeft, ShieldCheck, Database, Trophy, Settings as SettingsIcon, AlertCircle, CheckCircle } from 'lucide-react';

interface SettingsProps {
  onBack: () => void;
}

export const Settings: React.FC<SettingsProps> = ({ onBack }) => {
  const [firebaseConfig, setFirebaseConfig] = useState('');
  const [vipThreshold, setVipThreshold] = useState('5');
  const [regularThreshold, setRegularThreshold] = useState('3');
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const existingFirebase = localStorage.getItem('onbeventi_firebase_config');
    if (existingFirebase) setFirebaseConfig(existingFirebase);

    const existingVip = localStorage.getItem('onbeventi_vip_threshold');
    if (existingVip) setVipThreshold(existingVip);

    const existingRegular = localStorage.getItem('onbeventi_regular_threshold');
    if (existingRegular) setRegularThreshold(existingRegular);
  }, []);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (Number(vipThreshold) <= Number(regularThreshold)) {
      setError("La soglia VIP deve essere superiore alla soglia Membro Fedele.");
      return;
    }

    localStorage.setItem('onbeventi_vip_threshold', vipThreshold);
    localStorage.setItem('onbeventi_regular_threshold', regularThreshold);
    
    const configInput = firebaseConfig.trim();
    if (configInput) {
      try {
        const parsed = JSON.parse(configInput);
        if (parsed.apiKey) {
           localStorage.setItem('onbeventi_firebase_config', JSON.stringify(parsed, null, 2));
        } else {
          // Robust parsing fallback (similar to your existing logic)
          const extractedConfig: Record<string, string> = {};
          ['apiKey', 'authDomain', 'projectId', 'storageBucket', 'messagingSenderId', 'appId'].forEach(key => {
            const regex = new RegExp(`(?:["']?)${key}(?:["']?)\\s*:\\s*(["'])(.*?)\\1`);
            const match = configInput.match(regex);
            if (match && match[2]) extractedConfig[key] = match[2];
          });
          if (extractedConfig.apiKey) localStorage.setItem('onbeventi_firebase_config', JSON.stringify(extractedConfig));
        }
      } catch (err) {
        // Just save as text if parsing fails (fallback)
        localStorage.setItem('onbeventi_firebase_config', configInput);
      }
    } else {
      localStorage.removeItem('onbeventi_firebase_config');
    }

    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      window.location.reload();
    }, 1000);
  };

  return (
    <div className="max-w-2xl mx-auto animate-fade-in pb-10">
      <button onClick={onBack} className="mb-6 flex items-center text-sm text-gray-500 hover:text-pink-600 transition-colors font-medium">
        <ArrowLeft className="w-4 h-4 mr-1" />
        Dashboard
      </button>

      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
        <div className="px-8 py-6 border-b border-gray-100 bg-gray-50/50">
          <h2 className="text-2xl font-black text-gray-900 flex items-center gap-2">
            <SettingsIcon className="w-6 h-6 text-pink-500" />
            Configurazione
          </h2>
          <p className="text-gray-500 text-sm mt-1">Personalizza l'app e gestisci le integrazioni cloud.</p>
        </div>

        <form onSubmit={handleSave} className="p-8 space-y-8">
          {error && (
            <div className="bg-red-50 border border-red-100 text-red-700 px-4 py-3 rounded-xl flex items-center gap-3 animate-shake">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <p className="text-sm font-bold">{error}</p>
            </div>
          )}

          <div className="space-y-4">
             <div className="flex items-center justify-between">
                <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-yellow-500" /> Loyalty Badges System
                </h3>
             </div>
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                  <label className="block text-xs font-black text-gray-500 uppercase mb-2">Soglia VIP (Presenze)</label>
                  <input 
                    type="number" 
                    value={vipThreshold} 
                    onChange={e => setVipThreshold(e.target.value)} 
                    className="w-full px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-bold focus:ring-2 focus:ring-pink-500 outline-none transition-all" 
                  />
                  <p className="text-[10px] text-gray-400 mt-2">Badge "VIP Platinum" assegnato ai membri con questo numero di presenze.</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                  <label className="block text-xs font-black text-gray-500 uppercase mb-2">Soglia Fedeltà (Presenze)</label>
                  <input 
                    type="number" 
                    value={regularThreshold} 
                    onChange={e => setRegularThreshold(e.target.value)} 
                    className="w-full px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-bold focus:ring-2 focus:ring-pink-500 outline-none transition-all" 
                  />
                  <p className="text-[10px] text-gray-400 mt-2">Badge "Membro Fedele" assegnato ai membri più regolari.</p>
                </div>
             </div>
          </div>

          <div className="space-y-4">
             <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                <Database className="w-4 h-4 text-indigo-600" /> Firebase Cloud Sync
             </h3>
             <textarea 
               value={firebaseConfig} 
               onChange={(e) => setFirebaseConfig(e.target.value)} 
               rows={6} 
               placeholder='{ "apiKey": "...", "projectId": "...", ... }'
               className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono focus:ring-2 focus:ring-pink-500 outline-none transition-all" 
             />
             <p className="text-xs text-gray-400">Incolla qui l'oggetto di configurazione del tuo progetto Firebase per sincronizzare i dati della tua community.</p>
          </div>

          <div className="flex items-center justify-between pt-4">
            {saved && (
              <span className="flex items-center gap-2 text-green-600 text-sm font-black animate-bounce">
                <CheckCircle className="w-4 h-4" /> Salvato!
              </span>
            )}
            <Button type="submit" className="ml-auto shadow-xl shadow-pink-200">
              <Save className="w-4 h-4 mr-2" /> Salva Configurazione
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
