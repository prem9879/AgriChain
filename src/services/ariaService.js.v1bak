/**
 * ARIA Voice Assistant Service
 * ═══════════════════════════════════════════════════════════════════════════
 * Strategy: 1) Backend /aria/chat proxy (reliable), 2) Direct Gemini, 3) Varied fallback
 */

const GOOGLE_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_API_KEY || '';
const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://10.17.16.40:8000';

const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent`;

const LANGUAGE_LABELS = {
  hi: 'Hindi',
  en: 'English',
  mr: 'Marathi',
};

/* ────── Pool of varied fallback responses ────── */
const FALLBACK_POOL = {
  hi: [
    'Abhi network mein dikkat hai. Thodi der baad phir try karo. Tab tak mandi app mein price check karo.',
    'Server se connection nahi ho pa raha. Apni fasal ka storage dhyaan se karo, jaldi kharab na ho.',
    'Internet slow hai. Market screen pe jaake local mandi ka bhav dekho, wahan bhi helpful info milegi.',
    'Abhi jawab nahi mil raha. Ek kaam karo — apne crop ki photo Disease screen pe upload karo.',
    'Connection issue hai bhai. Weather section check karo — kal baarish hai toh aaj hi becho.',
    'Thoda rukho, network theek hoga. Tab tak Schemes section mein govt yojnayein dekh lo.',
  ],
  en: [
    'Network issue right now. Please try again in a moment. Meanwhile check mandi prices on Market screen.',
    'Could not reach the server. Make sure your internet is working and try again.',
    'Connection is slow. Check the Weather section — if rain is expected, sell today.',
    'Server is busy. Try again shortly. You can also check Disease screen for crop health.',
    'Unable to connect. Check the Schemes section for government subsidies while I fix this.',
    'Temporary issue. Please retype your question in a moment. Check Market tab for latest prices.',
  ],
  mr: [
    'नेटवर्कमध्ये अडचण आहे. थोड्या वेळाने पुन्हा प्रयत्न करा. तोपर्यंत बाजारभाव तपासा.',
    'सर्व्हरशी कनेक्शन होत नाही. तुमचे इंटरनेट तपासा आणि पुन्हा प्रयत्न करा.',
    'कनेक्शन स्लो आहे. हवामान विभाग तपासा — पाऊस असेल तर आजच विक्री करा.',
    'सर्व्हर व्यस्त आहे. थोड्या वेळाने पुन्हा प्रयत्न करा. योजना विभागात सरकारी योजना पहा.',
    'तात्पुरती अडचण. कृपया थोड्या वेळाने पुन्हा विचारा. बाजार टॅबवर ताजे भाव पहा.',
    'आत्ता उत्तर मिळत नाही. तुमच्या पिकाचा फोटो Disease स्क्रीनवर अपलोड करा.',
  ],
};

let _fallbackIndex = { hi: 0, en: 0, mr: 0 };

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
 * Transcribe audio — placeholder for device-local STT.
 */
export const transcribeWithWhisper = async ({ audioUri, languageCode }) => {
  return '';
};

/* ────── Strategy 1: Backend proxy  ────── */
const fetchViaBackend = async ({ uiMessages, context, languageCode }) => {
  const url = `${BACKEND_URL}/aria/chat`;
  console.log('[ARIA] Trying backend:', url);

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages: (uiMessages || []).slice(-10).map((m) => ({
        role: m.role,
        text: m.text || '',
      })),
      context: {
        crop: context?.crop || 'Unknown',
        district: context?.district || 'Unknown',
        risk_category: context?.risk_category || context?.riskCategory || 'Unknown',
        last_recommendation:
          context?.last_recommendation || context?.lastRecommendation || 'Unknown',
      },
      language_code: languageCode,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Backend /aria/chat failed: ${response.status} ${errText}`);
  }

  const data = await response.json();
  const reply = (data?.reply || '').trim();
  if (!reply) throw new Error('Backend returned empty reply');
  console.log('[ARIA] Backend reply OK');
  return reply;
};

/* ────── Strategy 2: Direct Gemini  ────── */
const fetchViaDirect = async ({ uiMessages, context, languageCode }) => {
  if (!GOOGLE_API_KEY) throw new Error('GOOGLE_API_KEY missing in frontend env');

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

  console.log('[ARIA] Trying direct Gemini');
  const response = await fetch(`${GEMINI_URL}?key=${GOOGLE_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: fullPrompt }] }],
      generationConfig: { temperature: 0.35, maxOutputTokens: 500 },
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Direct Gemini failed: ${response.status} ${text}`);
  }

  const data = await response.json();
  const text = (data?.candidates?.[0]?.content?.parts?.[0]?.text || '').trim();
  if (!text) throw new Error('Direct Gemini returned empty content');
  console.log('[ARIA] Direct Gemini reply OK');
  return text;
};

/**
 * Fetch ARIA reply — tries backend first, then direct Gemini, then throws.
 */
export const fetchAriaReply = async ({ uiMessages, context, languageCode }) => {
  // Strategy 1: backend proxy (most reliable)
  try {
    return await fetchViaBackend({ uiMessages, context, languageCode });
  } catch (err) {
    console.warn('[ARIA] Backend failed:', err.message);
  }

  // Strategy 2: direct Gemini from client
  try {
    return await fetchViaDirect({ uiMessages, context, languageCode });
  } catch (err) {
    console.warn('[ARIA] Direct Gemini failed:', err.message);
  }

  // Both failed — throw so AriaScreen uses fallback
  throw new Error('All ARIA strategies failed');
};

/**
 * Get a varied fallback reply — cycles through pool so the user never sees
 * the same message twice in a row.
 */
export const getAriaFallbackReply = (languageCode) => {
  const lang = normalizeLanguageCode(languageCode);
  const pool = FALLBACK_POOL[lang] || FALLBACK_POOL.en;
  const idx = (_fallbackIndex[lang] || 0) % pool.length;
  _fallbackIndex[lang] = idx + 1;
  return pool[idx];
};
