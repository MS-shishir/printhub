import { GoogleGenAI } from '@google/genai';

// Initialize Gemini API client
const apiKey =
  (import.meta as any).env?.VITE_GEMINI_API_KEY ||
  (import.meta as any).env?.GEMINI_API_KEY ||
  '';

export const aiClient = new GoogleGenAI({ apiKey });

/**
 * Uses Gemini AI to analyze passport photo quality, lighting, and background requirements.
 */
export async function analyzePhotoQualityWithGemini(base64Image: string): Promise<string> {
  try {
    const cleanBase64 = base64Image.replace(/^data:image\/\w+;base64,/, '');
    const response = await aiClient.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        {
          inlineData: {
            mimeType: 'image/jpeg',
            data: cleanBase64,
          },
        },
        {
          text: 'Analyze this photo for official passport compliance (background clarity, lighting, facial expression, glare). Keep advice very short and bulleted in Bengali or English.',
        },
      ],
    });
    return response.text || 'Photo analysis completed successfully.';
  } catch (error) {
    console.warn('[Gemini AI Analysis Error]', error);
    return 'Gemini AI analysis currently unavailable.';
  }
}
