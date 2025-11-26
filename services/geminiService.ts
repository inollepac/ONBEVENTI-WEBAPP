
import { GoogleGenAI } from "@google/genai";

export const generateEventDescription = async (title: string, mood: string): Promise<string> => {
  // Cerca la chiave prima nel salvataggio locale (impostazioni utente), poi nelle variabili d'ambiente
  const apiKey = localStorage.getItem('onbeventi_api_key') || process.env.API_KEY;

  if (!apiKey) {
    return "API Key mancante. Vai in Impostazioni per inserirla.";
  }

  try {
    // Inizializza l'AI ogni volta per essere sicuri di usare la chiave più recente
    const ai = new GoogleGenAI({ apiKey });

    const prompt = `
      Sei un copywriter esperto per un'organizzazione di eventi chiamata 'ONBEVENTI'.
      Scrivi una descrizione breve, accattivante ed emozionante (massimo 3 frasi) per un evento intitolato: "${title}".
      Il tono deve essere: ${mood}.
      Usa delle emoji appropriate.
      Rispondi solo con la descrizione.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text || "Impossibile generare la descrizione al momento.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Errore durante la generazione. Controlla la tua API Key nelle Impostazioni.";
  }
};
