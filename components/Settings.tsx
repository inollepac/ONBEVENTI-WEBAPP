
import React, { useState, useEffect } from 'react';
import { Button } from './Button';
import { Save, Key, ArrowLeft, ShieldCheck, ExternalLink, Cloud, Database } from 'lucide-react';

interface SettingsProps {
  onBack: () => void;
}

export const Settings: React.FC<SettingsProps> = ({ onBack }) => {
  const [apiKey, setApiKey] = useState('');
  const [firebaseConfig, setFirebaseConfig] = useState('');
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const existingKey = localStorage.getItem('onbeventi_api_key');
    if (existingKey) setApiKey(existingKey);

    const existingFirebase = localStorage.getItem('onbeventi_firebase_config');
    if (existingFirebase) setFirebaseConfig(existingFirebase);
  }, []);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Save Gemini Key
    localStorage.setItem('onbeventi_api_key', apiKey.trim());
    
    // Save Firebase Config
    const configInput = firebaseConfig.trim();
    
    if (configInput) {
      try {
        let jsonString = configInput;

        // Tenta di correggere il formato JS Object (chiavi senza virgolette) in JSON valido
        // Esempio: apiKey: "123" -> "apiKey": "123"
        // Questo regex cerca parole seguite da due punti e aggiunge le virgolette se mancano
        if (!configInput.startsWith('"') && !configInput.includes('"apiKey"')) {
           jsonString = configInput.replace(/(\w+):/g, '"$1":');
           // Rimuove eventuali virgole finali (trailing commas) che rompono il JSON.parse
           jsonString = jsonString.replace(/,(\s*})/g, '$1');
        }

        const parsed = JSON.parse(jsonString);
        
        // Validazione minima
        if (parsed.apiKey && parsed.projectId) {
           // Salviamo la versione "pulita" JSON stringified per evitare problemi futuri
           localStorage.setItem('onbeventi_firebase_config', JSON.stringify(parsed, null, 2));
           // Aggiorniamo anche l'input visualizzato per conferma
           setFirebaseConfig(JSON.stringify(parsed, null, 2));
        } else {
          setError("La configurazione sembra incompleta. Assicurati che ci siano 'apiKey' e 'projectId'.");
          return;
        }
      } catch (e) {
        console.error(e);
        setError("Formato non valido. Copia esattamente l'oggetto { ... } dalla console di Firebase.");
        return;
      }
    } else {
      localStorage.removeItem('onbeventi_firebase_config');
    }

    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      // Force reload to apply storage changes logic
      window.location.reload();
    }, 1500);
  };

  return (
    <div className="max-w-2xl mx-auto animate-fade-in pb-10">
      <button onClick={onBack} className="mb-6 flex items-center text-sm text-gray-500 hover:text-pink-600 transition-colors font-medium">
        <ArrowLeft className="w-4 h-4 mr-1" />
        Torna alla Dashboard
      </button>

      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
        <div className="px-8 py-6 border-b border-gray-100 bg-gray-50/50">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Key className="w-6 h-6 text-pink-500" />
            Configurazione Sistema
          </h2>
          <p className="text-gray-500 text-sm mt-1">Gestisci le chiavi API e la sincronizzazione dati.</p>
        </div>

        <form onSubmit={handleSave} className="p-8 space-y-8">
          
          {/* AI SECTION */}
          <div className="space-y-4">
             <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-indigo-600" />
                Intelligenza Artificiale (Gemini)
             </h3>
             <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4">
                <p className="text-xs text-indigo-700 leading-relaxed">
                  Inserisci la tua API Key di Google Gemini per abilitare la generazione automatica delle descrizioni degli eventi.
                </p>
             </div>
             <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Gemini API Key</label>
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="AIza..."
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-pink-500 font-mono"
                />
             </div>
          </div>

          <hr className="border-gray-100" />

          {/* FIREBASE SECTION */}
          <div className="space-y-4">
             <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <Database className="w-5 h-5 text-indigo-600" />
                Sincronizzazione Cloud (Firebase)
             </h3>
             <div className="bg-orange-50 border border-orange-100 rounded-xl p-4">
                <p className="text-xs text-orange-800 leading-relaxed">
                  Per sincronizzare i dati tra più dispositivi:
                  <br/>1. Vai su <a href="https://console.firebase.google.com/" target="_blank" className="underline font-bold">Firebase Console</a> e crea un progetto.
                  <br/>2. Crea un <strong>Firestore Database</strong> (in modalità test).
                  <br/>3. Vai in "Impostazioni Progetto", aggiungi un'app Web (<code>&lt;/&gt;</code>) e copia la configurazione <code>const firebaseConfig = &#123;...&#125;</code>.
                  <br/>4. Incolla qui sotto solo la parte tra parentesi graffe <code>&#123; ... &#125;</code>.
                </p>
             </div>
             <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Firebase Configuration</label>
                <textarea
                  value={firebaseConfig}
                  onChange={(e) => setFirebaseConfig(e.target.value)}
                  placeholder={'{ \n  apiKey: "AIza...", \n  authDomain: "...", \n  projectId: "..." \n}'}
                  rows={8}
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-pink-500 font-mono bg-gray-50"
                />
                {error && <p className="text-red-500 text-xs mt-2 font-bold">{error}</p>}
             </div>
          </div>

          <div className="pt-4 flex items-center justify-between">
            {saved && <span className="text-green-600 text-sm font-bold animate-pulse">Impostazioni salvate! Ricarico...</span>}
            <div className="flex gap-3 ml-auto">
               <Button type="button" variant="secondary" onClick={onBack}>Annulla</Button>
               <Button type="submit" className="shadow-pink-200">
                 <Save className="w-4 h-4 mr-2" />
                 Salva Tutto
               </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
