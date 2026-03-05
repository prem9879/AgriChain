/**
 * ARIA Voice Assistant Service — uses Google Gemini for chat responses.
 * Whisper transcription is replaced with a text-based fallback since
 * Gemini does not offer a speech-to-text API.
 */

const GOOGLE_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_API_KEY || '';
const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://127.0.0.1:8000';

const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent`;

const LANGUAGE_LABELS = {
  hi: 'Hindi',
  en: 'English',
  mr: 'Marathi',
};

const DEFAULT_FALLBACK_RESPONSES = {
  hi: 'Network issue hai. Aaj mandi price check karke fasal bechne ka faisla lo. Aaj hi becho.',
  en: 'Network is unstable right now. Check your mandi rate once and decide quickly. Sell today.',
  mr: 'नेटवर्कमध्ये अडचण आहे. आजचा बाजारभाव पाहून लगेच निर्णय घ्या. आजच विक्री करा.',
};

const normalizeLanguageCode = (code) => {
  const safe = String(code || 'en').trim().toLowerCase();
  if (safe === 'hi' || safe === 'mr' || safe === 'en') return safe;
  return 'en';
};

const buildSystemPrompt = (context, languageCode) => {
  const crop = context?.crop || 'Unknown';
  const district = context?.district || 'Unknown';
  const riskCategory = context?.risk_category || 'Unknown';
  const lastRecommendation = context?.last_recommendation || 'Unknown';
  const preferredLanguage = LANGUAGE_LABELS[normalizeLanguageCode(languageCode)] || 'English';

  return `Tu ARIA hai — ek AI assistant jo sirf Indian farmers ki madad karta hai.
Rules:
1. Hamesha usi bhasha mein jawab de jo farmer ne use ki
2. Simple words use kar — gaon ka kisan samjhe aise
3. Kabhi technical jargon mat use kar
4. Maximum 3 sentences mein jawab de
5. Hamesha ek clear action ke saath khatam kar: 'Aaj hi becho' ya 'Kal tak ruko' ya 'Doctor ko dikhao'
6. Sirf farming, mandi prices, weather, govt schemes ke baare mein baat kar
7. Agar koi aur topic aaye → 'Yeh mujhe nahi pata, kheti ke baare mein puchho' bol de

Farmer ka current data:
Crop: ${crop}, District: ${district}, Spoilage Risk: ${riskCategory}, Last Recommendation: ${lastRecommendation}

Reply language preference: ${preferredLanguage}.`;
};

/**
 * Transcribe audio using device-local speech recognition.
 * Since Gemini doesn't have a direct audio transcription API,
 * we return a text-input fallback message.
 */
export const transcribeWithWhisper = async ({ audioUri, languageCode }) => {
  // For production: integrate expo-speech or device STT
  // This fallback prompts text input on transcription failure
  return '';
};

/**
 * Fetch ARIA chat reply using Google Gemini API.
 */
export const fetchAriaReply = async ({ uiMessages, context, languageCode }) => {
  const safeLanguage = normalizeLanguageCode(languageCode);
  const systemPrompt = buildSystemPrompt(context, safeLanguage);

  const conversationText = (uiMessages || [])
    .slice(-10)
    .map((msg) => {
      const role = msg.role === 'assistant' ? 'ARIA' : 'Farmer';
      return `${role}: ${msg.text || ''}`;
    })
    .join('\n');

  const fullPrompt = `${systemPrompt}\n\nConversation so far:\n${conversationText}\n\nARIA:`;

  if (!GOOGLE_API_KEY) {
    throw new Error('GOOGLE_API_KEY is missing.');
  }

  const response = await fetch(`${GEMINI_URL}?key=${GOOGLE_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: fullPrompt }] }],
      generationConfig: {
        temperature: 0.35,
        maxOutputTokens: 180,
      },
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`ARIA Gemini request failed: ${response.status} ${text}`);
  }

  const data = await response.json();
  const text = (data?.candidates?.[0]?.content?.parts?.[0]?.text || '').trim();

  if (!text) {
    throw new Error('ARIA Gemini returned empty content.');
  }
  return text;
};

export const getAriaFallbackReply = (languageCode) =>
  DEFAULT_FALLBACK_RESPONSES[normalizeLanguageCode(languageCode)] ||
  DEFAULT_FALLBACK_RESPONSES.en;
