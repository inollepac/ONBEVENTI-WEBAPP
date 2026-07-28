import React, { useState, useEffect } from 'react';
import { Download, Smartphone, Share, PlusSquare, MoreVertical, X, CheckCircle, Apple } from 'lucide-react';

interface InstallAppModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const InstallAppModal: React.FC<InstallAppModalProps> = ({ isOpen, onClose }) => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [activeTab, setActiveTab] = useState<'ios' | 'android'>('ios');

  useEffect(() => {
    // Rileva se è già eseguito come PWA Standalone
    if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true) {
      setIsInstalled(true);
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleNativeInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstalled(true);
      setDeferredPrompt(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden border border-gray-100 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-pink-600 via-purple-700 to-indigo-800 p-6 text-white relative">
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-white" />
          </button>
          
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-white p-1 shadow-lg shrink-0 overflow-hidden border-2 border-pink-300">
              <img src="/logo.png" alt="O.N.B.E. Logo" className="w-full h-full object-cover rounded-xl" />
            </div>
            <div>
              <span className="inline-block bg-pink-500/30 text-pink-200 text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full mb-1">
                Gratuita & Senza Store
              </span>
              <h2 className="text-xl font-black tracking-tight leading-tight">Installa O.N.B.E. App</h2>
              <p className="text-xs text-indigo-100 mt-0.5">Aggiungila alla schermata Home del tuo smartphone</p>
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6">

          {/* Quick Install Prompt Button if supported natively */}
          {deferredPrompt && !isInstalled && (
            <div className="bg-gradient-to-r from-pink-50 to-purple-50 border border-pink-200 p-4 rounded-2xl flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-black text-pink-900 uppercase tracking-wider">Installazione Rapida</p>
                <p className="text-xs text-gray-600 mt-0.5">Il tuo browser supporta l'installazione diretta con un tap.</p>
              </div>
              <button
                onClick={handleNativeInstall}
                className="bg-gradient-to-r from-pink-600 to-purple-700 text-white font-black text-xs px-4 py-3 rounded-xl shadow-md hover:opacity-90 transition-all flex items-center gap-2 shrink-0"
              >
                <Download className="w-4 h-4" />
                Installa Ora
              </button>
            </div>
          )}

          {isInstalled && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-2xl flex items-center gap-3">
              <CheckCircle className="w-6 h-6 text-emerald-600 shrink-0" />
              <div>
                <p className="text-xs font-extrabold">App già installata!</p>
                <p className="text-xs text-emerald-700">Stai già usando l'app O.N.B.E. in modalità a schermo intero.</p>
              </div>
            </div>
          )}

          {/* Device Tabs */}
          <div>
            <div className="flex bg-gray-100 p-1 rounded-2xl gap-1">
              <button
                onClick={() => setActiveTab('ios')}
                className={`flex-1 py-2.5 px-3 rounded-xl font-extrabold text-xs flex items-center justify-center gap-2 transition-all ${
                  activeTab === 'ios' 
                    ? 'bg-white text-gray-900 shadow-sm' 
                    : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                <Apple className="w-4 h-4" />
                iPhone / iPad
              </button>

              <button
                onClick={() => setActiveTab('android')}
                className={`flex-1 py-2.5 px-3 rounded-xl font-extrabold text-xs flex items-center justify-center gap-2 transition-all ${
                  activeTab === 'android' 
                    ? 'bg-white text-gray-900 shadow-sm' 
                    : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                <Smartphone className="w-4 h-4 text-emerald-600" />
                Android / Chrome
              </button>
            </div>

            {/* iOS Instructions */}
            {activeTab === 'ios' && (
              <div className="mt-5 space-y-4 text-sm">
                <p className="text-xs text-gray-500 font-medium">
                  Su iOS (Safari), puoi scaricare l'app gratis in 3 semplici passaggi senza passare da App Store:
                </p>

                <div className="space-y-3">
                  <div className="flex items-start gap-3 bg-gray-50 p-3.5 rounded-2xl border border-gray-100">
                    <div className="w-7 h-7 rounded-xl bg-pink-100 text-pink-700 font-black flex items-center justify-center text-xs shrink-0 mt-0.5">
                      1
                    </div>
                    <div>
                      <p className="font-extrabold text-gray-900 text-xs">Apri su Safari</p>
                      <p className="text-xs text-gray-500 mt-0.5">Assicurati di aver aperto il tuo link Vercel o il sito su Safari.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 bg-gray-50 p-3.5 rounded-2xl border border-gray-100">
                    <div className="w-7 h-7 rounded-xl bg-pink-100 text-pink-700 font-black flex items-center justify-center text-xs shrink-0 mt-0.5">
                      2
                    </div>
                    <div>
                      <p className="font-extrabold text-gray-900 text-xs flex items-center gap-1">
                        Tocca il tasto Condividi <Share className="w-3.5 h-3.5 text-pink-600 inline" />
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">Premi l'icona del quadrato con la freccia verso l'alto in basso nella barra di Safari.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 bg-gray-50 p-3.5 rounded-2xl border border-gray-100">
                    <div className="w-7 h-7 rounded-xl bg-pink-100 text-pink-700 font-black flex items-center justify-center text-xs shrink-0 mt-0.5">
                      3
                    </div>
                    <div>
                      <p className="font-extrabold text-gray-900 text-xs flex items-center gap-1">
                        Scegli "Aggiungi alla schermata Home" <PlusSquare className="w-3.5 h-3.5 text-pink-600 inline" />
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">Scorri l'elenco e seleziona la voce con l'icona "+", quindi premi "Aggiungi" in alto a destra.</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Android Instructions */}
            {activeTab === 'android' && (
              <div className="mt-5 space-y-4 text-sm">
                <p className="text-xs text-gray-500 font-medium">
                  Su dispositivi Android (Chrome / Samsung / Edge), l'installazione è immediata e gratuita:
                </p>

                <div className="space-y-3">
                  <div className="flex items-start gap-3 bg-gray-50 p-3.5 rounded-2xl border border-gray-100">
                    <div className="w-7 h-7 rounded-xl bg-emerald-100 text-emerald-700 font-black flex items-center justify-center text-xs shrink-0 mt-0.5">
                      1
                    </div>
                    <div>
                      <p className="font-extrabold text-gray-900 text-xs">Apri il browser Chrome</p>
                      <p className="text-xs text-gray-500 mt-0.5">Naviga sul link del tuo sito web app O.N.B.E.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 bg-gray-50 p-3.5 rounded-2xl border border-gray-100">
                    <div className="w-7 h-7 rounded-xl bg-emerald-100 text-emerald-700 font-black flex items-center justify-center text-xs shrink-0 mt-0.5">
                      2
                    </div>
                    <div>
                      <p className="font-extrabold text-gray-900 text-xs flex items-center gap-1">
                        Menu tre puntini <MoreVertical className="w-3.5 h-3.5 text-emerald-600 inline" />
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">Tocca i tre pallini in alto a destra nel browser.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 bg-gray-50 p-3.5 rounded-2xl border border-gray-100">
                    <div className="w-7 h-7 rounded-xl bg-emerald-100 text-emerald-700 font-black flex items-center justify-center text-xs shrink-0 mt-0.5">
                      3
                    </div>
                    <div>
                      <p className="font-extrabold text-gray-900 text-xs flex items-center gap-1">
                        "Installa applicazione" o "Aggiungi a Home"
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">Conferma l'installazione. L'app verrà posizionata fra le tue applicazioni con il logo O.N.B.E.!</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end">
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-6 py-2.5 bg-gray-900 hover:bg-black text-white font-bold text-xs rounded-xl transition-all shadow-sm"
          >
            Ho Capito / Chiudi
          </button>
        </div>
      </div>
    </div>
  );
};
