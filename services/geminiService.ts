
import { GoogleGenAI } from "@google/genai";

// Generate event description using Gemini 3 Flash
export const generateEventDescription = async (title: string, mood: string): Promise<string> => {
  try {
    // API key must be obtained exclusively from process.env.API_KEY
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

    const prompt = `
      Sei un copywriter esperto per un'organizzazione di eventi chiamata 'ONBE'.
      Scrivi una descrizione breve, accattivante ed emozionante (massimo 3 frasi) per un evento intitolato: "${title}".
      Il tono deve essere: ${mood}.
      Usa delle emoji appropriate.
      Rispondi solo con la descrizione.
    `;

    // Use ai.models.generateContent with model name and prompt
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });

    // Access .text property directly
    return response.text || "Impossibile generare la descrizione al momento.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Errore durante la generazione.";
  }
};
