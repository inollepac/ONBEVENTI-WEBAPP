
import React, { useState, useEffect } from 'react';
import { Button } from './Button';
import { Save, ArrowLeft, ShieldCheck, Database, Trophy, Settings as SettingsIcon, AlertCircle, CheckCircle, ExternalLink, HelpCircle, Copy, Check, Cloud, CloudOff, Smartphone, RefreshCw, AlertTriangle, Key } from 'lucide-react';
import { testFirebaseConnection } from '../services/storageService';

interface SettingsProps {
  onBack: () => void;
}

export const Settings: React.FC<SettingsProps> = ({ onBack }) => {
  const [firebaseConfig, setFirebaseConfig] = useState('');
  const [vipThreshold, setVipThreshold] = useState('5');
  const [regularThreshold, setRegularThreshold] = useState('3');
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; code?: string } | null>(null);

  useEffect(() => {
    const existingFirebase = localStorage.getItem('onbe_firebase_config');
    if (existingFirebase) setFirebaseConfig(existingFirebase);

    const existingVip = localStorage.getItem('onbe_vip_threshold');
    if (existingVip) setVipThreshold(existingVip);

    const existingRegular = localStorage.getItem('onbe_regular_threshold');
    if (existingRegular) setRegularThreshold(existingRegular);
  }, []);

  const handleRunTest = async () => {
    setIsTesting(true);
    setTestResult(null);
    const result = await testFirebaseConnection();
    setTestResult(result);
    setIsTesting(false);
  };

  const handleCopyConfig = () => {
    if (!firebaseConfig) return;
    navigator.clipboard.writeText(firebaseConfig);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (Number(vipThreshold) <= Number(regularThreshold)) {
      setError("La soglia VIP deve essere superiore alla soglia Membro Fedele.");
      return;
    }

    localStorage.setItem('onbe_vip_threshold', vipThreshold);
    localStorage.setItem('onbe_regular_threshold', regularThreshold);
    
    const configInput = firebaseConfig.trim();
    if (configInput) {
      try {
        const parsed = JSON.parse(configInput);
        if (parsed.apiKey) {
           localStorage.setItem('onbe_firebase_config', JSON.stringify(parsed, null, 2));
        } else {
          const extractedConfig: Record<string, string> = {};
          ['apiKey', 'authDomain', 'projectId', 'storageBucket', 'messagingSenderId', 'appId'].forEach(key => {
            const regex = new RegExp(`(?:["']?)${key}(?:["']?)\\s*:\\s*(["'])(.*?)\\1`);
            const match = configInput.match(regex);
            if (match && match[2]) extractedConfig[key] = match[2];
          });
          if (extractedConfig.apiKey) localStorage.setItem('onbe_firebase_config', JSON.stringify(extractedConfig));
        }
      } catch (err) {
        localStorage.setItem('onbe_firebase_config', configInput);
      }
    } else {
      localStorage.removeItem('onbe_firebase_config');
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

      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden mb-8">
        <div className="px-8 py-6 border-b border-gray-100 bg-gray-50/50">
          <h2 className="text-2xl font-black text-gray-900 flex items-center gap-2">
            <SettingsIcon className="w-6 h-6 text-pink-500" />
            Configurazione & Sincronizzazione
          </h2>
          <p className="text-gray-500 text-sm mt-1">Personalizza l'app, gestisci Firebase e risolvi problemi di sincronizzazione.</p>
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
                </div>
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                  <label className="block text-xs font-black text-gray-500 uppercase mb-2">Soglia Fedeltà (Presenze)</label>
                  <input 
                    type="number" 
                    value={regularThreshold} 
                    onChange={e => setRegularThreshold(e.target.value)} 
                    className="w-full px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-bold focus:ring-2 focus:ring-pink-500 outline-none transition-all" 
                  />
                </div>
             </div>
          </div>

          <div className="space-y-4">
             <div className="flex items-center justify-between">
               <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                  <Database className="w-4 h-4 text-indigo-600" /> Firebase Cloud Sync
               </h3>
               {firebaseConfig.trim() ? (
                 <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                   <Cloud className="w-3.5 h-3.5 text-emerald-600" /> Configurazione Presente
                 </span>
               ) : (
                 <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                   <CloudOff className="w-3.5 h-3.5 text-amber-600" /> Solo Memoria Locale
                 </span>
               )}
             </div>

             {/* Multi-device sync tip */}
             <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-xl space-y-2">
               <div className="flex items-center gap-2 text-indigo-900 font-extrabold text-xs">
                 <Smartphone className="w-4 h-4 text-pink-600 shrink-0" />
                 Sincronizzazione tra più dispositivi (PC, Smartphone, Tablet):
               </div>
               <p className="text-xs text-indigo-700 leading-relaxed">
                 Per vedere gli stessi dati su un altro telefono o computer, incolla la <b>stessa configurazione Firebase</b> nelle Impostazioni dell'app su ciascun dispositivo.
               </p>
             </div>

             <div className="relative">
               <textarea 
                 value={firebaseConfig} 
                 onChange={(e) => setFirebaseConfig(e.target.value)} 
                 rows={5} 
                 placeholder='{ "apiKey": "...", "projectId": "...", ... }'
                 className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono focus:ring-2 focus:ring-pink-500 outline-none transition-all pr-28" 
               />
               {firebaseConfig.trim() && (
                 <button
                   type="button"
                   onClick={handleCopyConfig}
                   className="absolute top-3 right-3 px-3 py-1.5 bg-white border border-gray-200 hover:bg-gray-50 rounded-lg text-xs font-bold text-gray-700 shadow-sm flex items-center gap-1.5 transition-all"
                 >
                   {copied ? (
                     <>
                       <Check className="w-3.5 h-3.5 text-emerald-600" />
                       <span className="text-emerald-600">Copiato!</span>
                     </>
                   ) : (
                     <>
                       <Copy className="w-3.5 h-3.5 text-gray-500" />
                       <span>Copia</span>
                     </>
                   )}
                 </button>
               )}
             </div>
             <p className="text-xs text-gray-400">Incolla qui l'oggetto di configurazione di Firebase per sincronizzare i dati online.</p>

             {/* Test Connessione Button */}
             <div className="pt-2">
               <button
                 type="button"
                 onClick={handleRunTest}
                 disabled={isTesting}
                 className="w-full py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl transition-all border border-slate-200 flex items-center justify-center gap-2"
               >
                 <RefreshCw className={`w-4 h-4 ${isTesting ? 'animate-spin text-pink-600' : ''}`} />
                 {isTesting ? 'Verifica Connessione in corso...' : 'Verifica Connessione Firebase in Tempo Reale'}
               </button>

               {testResult && (
                 <div className={`mt-3 p-4 rounded-xl border text-xs leading-relaxed transition-all ${
                   testResult.success 
                     ? 'bg-emerald-50 border-emerald-200 text-emerald-900' 
                     : 'bg-amber-50 border-amber-200 text-amber-900'
                 }`}>
                   <div className="flex items-start gap-2.5">
                     {testResult.success ? (
                       <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                     ) : (
                       <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                     )}
                     <div>
                       <p className="font-extrabold text-sm mb-1">
                         {testResult.success ? 'Connessione Riuscita!' : 'Problema Rilevato nella Connessione'}
                       </p>
                       <p>{testResult.message}</p>
                     </div>
                   </div>
                 </div>
               )}
             </div>
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

      {/* Guida Risoluzione Problemi Firebase */}
      <div className="bg-indigo-950 rounded-2xl shadow-xl p-8 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-bl-full"></div>
        <h3 className="text-lg font-black flex items-center gap-2 mb-2 text-pink-300">
          <HelpCircle className="w-6 h-6 text-pink-400" /> 
          Perché l'app ha smesso di sincronizzare dopo mesi?
        </h3>
        
        <p className="text-xs text-indigo-200 mb-6 leading-relaxed">
          Ci sono <b>2 motivi principali</b> per cui la sincronizzazione online tra dispositivi smette improvvisamente di funzionare:
        </p>

        <div className="space-y-6">
          {/* Motivo 1: Regole di Test Scadute */}
          <div className="bg-white/5 border border-white/10 p-4 rounded-xl space-y-3">
            <div className="flex items-center gap-2 text-pink-300 font-extrabold text-xs">
              <Key className="w-4 h-4 text-pink-400 shrink-0" />
              1. Le "Regole di Sicurezza in Modalità Test" sono scadute (Causa N°1)
            </div>
            <p className="text-xs text-indigo-100 leading-relaxed">
              Quando crei un database su Firebase in <i>Modalità Test</i>, Google imposta una scadenza automatica di <b>30 giorni</b> per ragioni di sicurezza. Trascorsi i 30 giorni, Firebase blocca silenziosamente tutte le letture e le scritture con un errore di permessi negati.
            </p>
            <div className="bg-black/40 p-3 rounded-lg border border-white/10 font-mono text-[11px] text-pink-200">
              <p className="text-gray-400 mb-1">// Incolla questa regola per abilitare la sincronizzazione permanente:</p>
              <p>rules_version = '2';</p>
              <p>service cloud.firestore &#123;</p>
              <p className="pl-4">match /databases/&#123;database&#125;/documents &#123;</p>
              <p className="pl-8 text-emerald-400 font-bold">match /&#123;document=**&#125; &#123; allow read, write: if true; &#125;</p>
              <p className="pl-4">&#125;</p>
              <p>&#125;</p>
            </div>
          </div>

          {/* Motivo 2: Manca la configurazione sul nuovo dispositivo */}
          <div className="bg-white/5 border border-white/10 p-4 rounded-xl space-y-2">
            <div className="flex items-center gap-2 text-indigo-200 font-extrabold text-xs">
              <Smartphone className="w-4 h-4 text-indigo-300 shrink-0" />
              2. La configurazione Firebase non è presente sul secondo dispositivo
            </div>
            <p className="text-xs text-indigo-100 leading-relaxed">
              La chiave Firebase viene salvata nella memoria locale del singolo browser. Se hai installato l'app come PWA o aperto il link da un nuovo telefono o tablet, devi premere <b>"Copia"</b> qui sopra e incollarla nelle Impostazioni dell'app sul nuovo dispositivo.
            </p>
          </div>
        </div>

        <div className="mt-8 pt-4 border-t border-indigo-900 flex flex-wrap items-center justify-between gap-4">
          <a 
            href="https://console.firebase.google.com/" 
            target="_blank" 
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest bg-pink-500 hover:bg-pink-600 text-white px-6 py-3 rounded-xl transition-all shadow-lg shadow-pink-500/20"
          >
            Apri Console Firebase <ExternalLink className="w-3.5 h-3.5" />
          </a>
          <span className="text-[11px] text-indigo-300">
            Path console: <i>Firebase Console &gt; Firestore Database &gt; Rules (Regole)</i>
          </span>
        </div>
      </div>
    </div>
  );
};

