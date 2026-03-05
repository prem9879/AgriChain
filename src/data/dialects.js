/**
 * ARIA 2.0 Dialect & Tone Personalization
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * District-specific dialect rules and tone modifiers for ARIA's personality.
 * Used to make ARIA feel like a local — not a generic AI chatbot.
 */

// ─── District Dialect Profiles ────────────────────────────────────────────────
export const DIALECT_PROFILES = {
  // === Maharashtra ===
  Nashik: {
    region: 'Nashik',
    language: 'mr',
    greeting: 'काय मित्रा, कसं काय?',
    farewell: 'चला मग, काळजी घ्या!',
    encouragement: 'चिंता नको, होईल सगळं!',
    localCrops: ['onion', 'grape', 'tomato'],
    toneWords: {
      yes: 'हो ना',
      no: 'नाही रे',
      okay: 'बरं बरं',
      think: 'थांब, बघतो',
      hurry: 'लवकर कर',
    },
    mixingStyle: 'marathi-hindi', // code-mixing pattern
  },
  Pune: {
    region: 'Pune',
    language: 'mr',
    greeting: 'नमस्कार! कसं चाललंय?',
    farewell: 'बरं, जमलं तर सांगा!',
    encouragement: 'काळजी नको, सगळं नीट होईल!',
    localCrops: ['sugarcane', 'onion', 'wheat'],
    toneWords: {
      yes: 'हो',
      no: 'नाही',
      okay: 'ठीक आहे',
      think: 'थांबा, पाहतो',
      hurry: 'लवकर करा',
    },
    mixingStyle: 'pure-marathi',
  },
  Nagpur: {
    region: 'Nagpur / Vidarbha',
    language: 'mr',
    greeting: 'काय रे, कसं हाये?',
    farewell: 'जा बे, काम कर!',
    encouragement: 'टेन्शन नको घेऊ, होईन सगळं!',
    localCrops: ['cotton', 'orange', 'soybean'],
    toneWords: {
      yes: 'हो बे',
      no: 'नाय',
      okay: 'चालल',
      think: 'थांब, बघतो',
      hurry: 'लवकर कर बे',
    },
    mixingStyle: 'vidarbha-hindi',
  },
  Jalna: {
    region: 'Marathwada',
    language: 'mr',
    greeting: 'राम राम! कसं हाय?',
    farewell: 'चला, येतो!',
    encouragement: 'होईल सगळं, घाबरू नको!',
    localCrops: ['cotton', 'soybean', 'jowar'],
    toneWords: {
      yes: 'हो',
      no: 'नाय',
      okay: 'चाललं',
      think: 'थांब, पाहतो',
      hurry: 'लवकर कर',
    },
    mixingStyle: 'marathwada-hindi',
  },
  Aurangabad: {
    region: 'Marathwada',
    language: 'mr',
    greeting: 'राम राम! कसं हाय भौ?',
    farewell: 'चला, येऊ!',
    encouragement: 'टेन्शन नग घेऊ!',
    localCrops: ['cotton', 'bajra', 'jowar'],
    toneWords: {
      yes: 'हो की',
      no: 'नाय',
      okay: 'बरं',
      think: 'थांब जरा',
      hurry: 'लवकर कर की',
    },
    mixingStyle: 'marathwada-hindi',
  },

  // === Hindi-belt defaults ===
  _hindi_default: {
    region: 'Hindi Belt',
    language: 'hi',
    greeting: 'नमस्ते! कैसे हो भाई?',
    farewell: 'चलो, ध्यान रखो!',
    encouragement: 'टेंशन मत लो, सब ठीक होगा!',
    localCrops: [],
    toneWords: {
      yes: 'हाँ',
      no: 'नहीं',
      okay: 'ठीक है',
      think: 'रुको, देखता हूँ',
      hurry: 'जल्दी करो',
    },
    mixingStyle: 'hindi',
  },

  // === English defaults ===
  _english_default: {
    region: 'English',
    language: 'en',
    greeting: 'Hello! How can I help you today?',
    farewell: 'Take care! Reach out anytime.',
    encouragement: "Don't worry, we'll figure this out together!",
    localCrops: [],
    toneWords: {
      yes: 'Yes',
      no: 'No',
      okay: 'Okay',
      think: 'Let me check',
      hurry: 'Hurry up',
    },
    mixingStyle: 'english',
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Get dialect profile for a district. Falls back to language default.
 */
export const getDialectProfile = (district, languageCode = 'hi') => {
  if (district && DIALECT_PROFILES[district]) {
    return DIALECT_PROFILES[district];
  }
  if (languageCode === 'mr') return DIALECT_PROFILES.Nashik;  // default MR
  if (languageCode === 'en') return DIALECT_PROFILES._english_default;
  return DIALECT_PROFILES._hindi_default;
};

/**
 * Build a dialect-flavored greeting for ARIA.
 */
export const getDialectGreeting = (district, name = '', languageCode = 'hi') => {
  const profile = getDialectProfile(district, languageCode);
  if (name) {
    return `${profile.greeting.replace('!', ',')} ${name}!`;
  }
  return profile.greeting;
};

/**
 * Get an encouragement phrase for distressed farmers.
 */
export const getEncouragement = (district, languageCode = 'hi') => {
  return getDialectProfile(district, languageCode).encouragement;
};

// ─── Emotion → ARIA Mood Color Map ───────────────────────────────────────────
export const EMOTION_MOOD = {
  happy:      { color: '#FFD54F', icon: 'emoticon-happy-outline',    label: 'Khush' },
  worried:    { color: '#90CAF9', icon: 'emoticon-sad-outline',      label: 'Chinta' },
  frustrated: { color: '#EF9A9A', icon: 'emoticon-angry-outline',    label: 'Gussa' },
  neutral:    { color: '#C8E6C9', icon: 'robot-outline',             label: 'Normal' },
  caring:     { color: '#CE93D8', icon: 'heart-outline',             label: 'Care' },
  urgent:     { color: '#FFAB91', icon: 'alert-circle-outline',      label: 'Jaldi' },
};

/**
 * Map detected emotion → mood config for avatar/UI.
 */
export const getMoodConfig = (emotion) => {
  return EMOTION_MOOD[emotion] || EMOTION_MOOD.neutral;
};
