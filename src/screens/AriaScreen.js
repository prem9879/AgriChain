/**
 * ARIA 2.0 — Conversational Super-Agent Screen
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Features:
 *   • Emotional avatar with mood-based glow colors
 *   • Thinking animation during agent tool-calling loop
 *   • Memory peek card ("ARIA, tujhe mere baare mein kya pata hai?")
 *   • Daily briefing button
 *   • Agent tool-action chips in message bubbles
 *   • Voice recording with pulse animation
 *   • TTS with waveform bars
 *   • Language pill switcher
 *   • Offline conversation cache
 */

import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import * as Speech from 'expo-speech';
import {
  ActivityIndicator,
  Animated,
  FlatList,
  KeyboardAvoidingView,
  NativeModules,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, ELEVATION, RADIUS, SPACING, TYPOGRAPHY } from '../theme/colors';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import {
  fetchAriaReply,
  getAriaFallbackReply,
  getAriaWelcome,
  detectEmotion,
  fetchMemories,
  cacheConversation,
  loadCachedConversation,
  transcribeWithWhisper,
} from '../services/ariaService';
import { getMoodConfig, getEncouragement } from '../data/dialects';

// ─── Constants ────────────────────────────────────────────────────────────────

const LANGUAGE_OPTIONS = [
  { code: 'hi', label: 'हिं', speechCode: 'hi-IN' },
  { code: 'en', label: 'EN', speechCode: 'en-IN' },
  { code: 'mr', label: 'मर', speechCode: 'mr-IN' },
];

const QUICK_REPLY_CHIPS = ['क्यों?', 'और बताओ', 'सरकारी योजना?', 'Expert बुलाओ'];

const createId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const normalizeContext = (rawContext) => ({
  crop: rawContext?.crop || 'Onion',
  district: rawContext?.district || 'Nashik',
  state: rawContext?.state || 'Maharashtra',
  risk_category: rawContext?.risk_category || rawContext?.riskCategory || 'Medium',
  last_recommendation:
    rawContext?.last_recommendation ||
    rawContext?.lastRecommendation ||
    'Review latest recommendation',
  farm_size_acres: rawContext?.farm_size_acres || null,
  soil_type: rawContext?.soil_type || null,
});

const getLanguageByCode = (code) =>
  LANGUAGE_OPTIONS.find((item) => item.code === code) || LANGUAGE_OPTIONS[1];

const createSuggestedQuestions = (context) => [
  `मेरे ${context.crop} कब बेचूं?`,
  `आज ${context.district} मंडी का भाव?`,
  'मेरी फसल खराब हो रही है क्या करूं?',
  'कौन सी खाद डालूं?',
  'ARIA, tujhe mere baare mein kya yaad hai?',
];

// ─── Emotional Avatar Component ──────────────────────────────────────────────

function EmotionalAvatar({ emotion, isThinking }) {
  const mood = getMoodConfig(emotion);
  const glowAnim = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: isThinking ? 600 : 2000,
          useNativeDriver: true,
        }),
        Animated.timing(glowAnim, {
          toValue: 0.4,
          duration: isThinking ? 600 : 2000,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [emotion, isThinking, glowAnim]);

  return (
    <View style={styles.avatarContainer}>
      <Animated.View
        style={[
          styles.avatarGlow,
          {
            backgroundColor: mood.color,
            opacity: glowAnim,
          },
        ]}
      />
      <View style={[styles.avatarCircle, { borderColor: mood.color }]}>
        {isThinking ? (
          <ActivityIndicator size="small" color={COLORS.primary} />
        ) : (
          <MaterialCommunityIcons
            name={mood.icon}
            size={22}
            color={COLORS.primary}
          />
        )}
      </View>
    </View>
  );
}

// ─── Tool Action Chip ────────────────────────────────────────────────────────

function ToolActionChip({ action }) {
  const TOOL_ICONS = {
    get_weather: 'weather-partly-cloudy',
    get_mandi_prices: 'currency-inr',
    get_user_profile: 'account-outline',
    get_memories: 'brain',
    store_memory: 'content-save-outline',
    get_schemes: 'file-document-outline',
    run_prediction: 'chart-line',
    open_screen: 'open-in-new',
  };

  return (
    <View style={styles.toolChip}>
      <MaterialCommunityIcons
        name={TOOL_ICONS[action.tool] || 'cog-outline'}
        size={12}
        color={COLORS.secondary}
      />
      <Text style={styles.toolChipText}>{action.tool.replace(/_/g, ' ')}</Text>
    </View>
  );
}

// ─── Memory Peek Card ────────────────────────────────────────────────────────

function MemoryPeekCard({ memories, onDismiss }) {
  if (!memories || memories.length === 0) return null;

  return (
    <View style={styles.memoryCard}>
      <View style={styles.memoryHeader}>
        <MaterialCommunityIcons name="brain" size={18} color={COLORS.primary} />
        <Text style={styles.memoryTitle}>ARIA ko yaad hai</Text>
        <TouchableOpacity onPress={onDismiss} hitSlop={8}>
          <MaterialCommunityIcons name="close" size={18} color={COLORS.outline} />
        </TouchableOpacity>
      </View>
      {memories.slice(0, 5).map((m, i) => (
        <View key={`mem-${i}`} style={styles.memoryRow}>
          <MaterialCommunityIcons
            name={
              m.memory_type === 'fact' ? 'information-outline' :
              m.memory_type === 'preference' ? 'heart-outline' :
              m.memory_type === 'emotion' ? 'emoticon-outline' :
              'trophy-outline'
            }
            size={14}
            color={COLORS.onSurfaceVariant}
          />
          <Text style={styles.memoryKey}>{m.memory_key}:</Text>
          <Text style={styles.memoryValue} numberOfLines={1}>{m.memory_value}</Text>
        </View>
      ))}
    </View>
  );
}

// ─── Message Bubble Component ────────────────────────────────────────────────

const MessageBubble = React.memo(function MessageBubble({ message, onReplay, onQuickReply, currentEmotion }) {
  const isUser = message.role === 'user';

  return (
    <View style={[styles.messageRow, isUser ? styles.userRow : styles.assistantRow]}>
      {!isUser && (
        <EmotionalAvatar
          emotion={message.emotion || currentEmotion || 'neutral'}
          isThinking={false}
        />
      )}
      <View
        style={[
          styles.messageBubble,
          isUser ? styles.userBubble : styles.assistantBubble,
        ]}
      >
        <View style={styles.assistantMessageHead}>
          <Text style={[styles.messageText, isUser ? styles.userText : styles.assistantText]}>
            {message.text}
          </Text>
          {!isUser && (
            <TouchableOpacity
              onPress={() => onReplay(message)}
              style={styles.replayButton}
              hitSlop={8}
            >
              <MaterialCommunityIcons
                name="volume-high"
                size={18}
                color={COLORS.primary}
              />
            </TouchableOpacity>
          )}
        </View>

        {/* Tool action chips */}
        {!isUser && message.toolActions && message.toolActions.length > 0 && (
          <View style={styles.toolActionsRow}>
            {message.toolActions.map((ta, idx) => (
              <ToolActionChip key={`tool-${idx}`} action={ta} />
            ))}
          </View>
        )}
      </View>

      {!isUser && (
        <View style={styles.quickRepliesRow}>
          {QUICK_REPLY_CHIPS.map((chip) => (
            <TouchableOpacity
              key={`${message.id}-${chip}`}
              style={styles.quickReplyChip}
              onPress={() => onQuickReply(chip)}
              activeOpacity={0.85}
            >
              <Text style={styles.quickReplyText}>{chip}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
});

// ═══════════════════════════════════════════════════════════════════════════════
// Main Screen
// ═══════════════════════════════════════════════════════════════════════════════

export default function ARIAScreen({ route, navigation }) {
  const { t: tr } = useLanguage();
  const { user } = useAuth();
  const listRef = useRef(null);
  const recordingRef = useRef(null);
  const messagesRef = useRef([]);
  const topicSeededRef = useRef(false);
  const audioApiRef = useRef(null);
  const sessionIdRef = useRef(createId());

  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState(LANGUAGE_OPTIONS[0]);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speakingMessageId, setSpeakingMessageId] = useState(null);
  const [context, setContext] = useState(normalizeContext(route?.params?.context));
  const [currentEmotion, setCurrentEmotion] = useState('neutral');
  const [showMemoryPeek, setShowMemoryPeek] = useState(false);
  const [userMemories, setUserMemories] = useState([]);
  const [isThinking, setIsThinking] = useState(false);

  const pulseScale = useRef(new Animated.Value(1)).current;
  const waveBarOne = useRef(new Animated.Value(8)).current;
  const waveBarTwo = useRef(new Animated.Value(12)).current;
  const waveBarThree = useRef(new Animated.Value(6)).current;

  // ─── Derived Values ────────────────────────────────────────────────────
  const userId = user?.id || null;
  const userName = user?.full_name || '';
  const userDistrict = user?.district || context.district;

  // ─── Lifecycle & Effects ───────────────────────────────────────────────
  useEffect(() => {
    messagesRef.current = messages;
    requestAnimationFrame(() => {
      listRef.current?.scrollToEnd({ animated: true });
    });
    // Cache conversations for offline access
    if (messages.length > 0) {
      cacheConversation(messages);
    }
  }, [messages]);

  useEffect(() => {
    if (route?.params?.context) {
      setContext(normalizeContext(route.params.context));
    }
  }, [route?.params?.context]);

  // Restore cached conversation on mount
  useEffect(() => {
    (async () => {
      const cached = await loadCachedConversation();
      if (cached.length > 0) {
        setMessages(cached);
      }
    })();
  }, []);

  // Show dialect welcome on first open
  useEffect(() => {
    if (messages.length === 0 && !topicSeededRef.current) {
      topicSeededRef.current = true;
      const welcomeText = getAriaWelcome(userDistrict, userName, selectedLanguage.code);
      if (welcomeText) {
        setMessages([{
          id: createId(),
          role: 'assistant',
          text: welcomeText,
          languageCode: selectedLanguage.code,
          emotion: 'neutral',
          toolActions: [],
        }]);
      }
    }
  }, []);

  // Topic seeding: calcium-chloride-storage
  useEffect(() => {
    if (route?.params?.topic !== 'calcium-chloride-storage') return;
    if (topicSeededRef.current && messages.length > 1) return;
    topicSeededRef.current = true;
    const languageCode = selectedLanguage.code;
    const guideText =
      languageCode === 'mr'
        ? 'कॅल्शियम क्लोराइड 1% द्रावण वापरा, मग सावलीत वाळवून हवा खेळती असलेल्या गोदामात ठेवा. उद्या बाजारात विक्रीची तयारी करा. कल पर्यंत थांबा.'
        : languageCode === 'en'
          ? 'Use a 1% calcium chloride spray, dry the produce in shade, then keep it in a ventilated warehouse. Prepare dispatch by tomorrow. Wait till tomorrow.'
          : 'Calcium chloride 1% solution spray karo, phir chhaya mein sukhakar hawa-daar warehouse mein rakho. Kal subah dispatch ki tayari karo. Kal tak ruko.';

    setMessages((prev) => [
      ...prev,
      { id: createId(), role: 'assistant', text: guideText, languageCode, emotion: 'neutral', toolActions: [] },
    ]);
    speakText(guideText, languageCode);
  }, [route?.params?.topic, selectedLanguage.code]);

  // ─── Recording pulse animation ─────────────────────────────────────────
  useEffect(() => {
    if (!isRecording) {
      pulseScale.stopAnimation();
      pulseScale.setValue(1);
      return undefined;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseScale, { toValue: 1.35, duration: 600, useNativeDriver: true }),
        Animated.timing(pulseScale, { toValue: 1, duration: 600, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [isRecording, pulseScale]);

  // ─── Speaking waveform animation ───────────────────────────────────────
  useEffect(() => {
    const bars = [waveBarOne, waveBarTwo, waveBarThree];
    if (!isSpeaking) {
      bars.forEach((bar, i) => bar.setValue(i === 1 ? 12 : 8));
      return undefined;
    }
    const loops = bars.map((bar, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(bar, { toValue: 24 - i * 3, duration: 240 + i * 80, useNativeDriver: false }),
          Animated.timing(bar, { toValue: 6 + i * 2, duration: 240 + i * 80, useNativeDriver: false }),
        ])
      )
    );
    loops.forEach((l) => l.start());
    return () => loops.forEach((l) => l.stop());
  }, [isSpeaking, waveBarOne, waveBarTwo, waveBarThree]);

  // Cleanup
  useEffect(() => {
    return () => {
      Speech.stop();
      if (recordingRef.current) {
        recordingRef.current.stopAndUnloadAsync().catch(() => {});
      }
    };
  }, []);

  // ─── Suggested questions ───────────────────────────────────────────────
  const suggestedQuestions = useMemo(() => createSuggestedQuestions(context), [context]);

  // ─── Audio helper ──────────────────────────────────────────────────────
  const ensureAudioApi = async () => {
    if (audioApiRef.current) return audioApiRef.current;
    // Guard: check native module exists before requiring expo-av
    const hasNative = !!(globalThis.expo?.modules?.ExponentAV || NativeModules?.ExponentAV);
    if (!hasNative) {
      console.log('[AriaScreen] ExponentAV native module not available — audio disabled');
      return null;
    }
    try {
      const mod = require('expo-av');
      if (mod?.Audio) {
        audioApiRef.current = mod.Audio;
        return audioApiRef.current;
      }
      return null;
    } catch {
      return null;
    }
  };

  // ─── TTS ───────────────────────────────────────────────────────────────
  const stopSpeech = () => {
    Speech.stop();
    setIsSpeaking(false);
    setSpeakingMessageId(null);
  };

  const speakText = useCallback((text, languageCode, messageId = null) => {
    const language = getLanguageByCode(languageCode);
    stopSpeech();
    setIsSpeaking(true);
    setSpeakingMessageId(messageId);
    Speech.speak(text, {
      language: language.speechCode,
      rate: 0.95,
      pitch: 1.0,
      onDone: () => { setIsSpeaking(false); setSpeakingMessageId(null); },
      onStopped: () => { setIsSpeaking(false); setSpeakingMessageId(null); },
      onError: () => { setIsSpeaking(false); setSpeakingMessageId(null); },
    });
  }, []);

  // ─── Message helpers ───────────────────────────────────────────────────
  const appendAssistantMessage = (text, languageCode, extra = {}) => {
    const message = {
      id: createId(),
      role: 'assistant',
      text,
      languageCode,
      emotion: extra.emotion || currentEmotion,
      toolActions: extra.toolActions || [],
    };
    setMessages((prev) => [...prev, message]);
    speakText(text, languageCode, message.id);
  };

  // ─── Send User Message (core chat flow) ────────────────────────────────
  const sendUserMessage = async (messageText) => {
    const text = String(messageText || '').trim();
    if (!text || isSending) return;

    // Check for memory peek request
    const isMemoryRequest = text.toLowerCase().includes('yaad') ||
      text.toLowerCase().includes('remember') ||
      text.toLowerCase().includes('memory') ||
      text.includes('आठवत');

    if (isMemoryRequest && userId) {
      const mems = await fetchMemories(userId);
      if (mems.length > 0) {
        setUserMemories(mems);
        setShowMemoryPeek(true);
      }
    }

    // Detect emotion client-side (fast path)
    const detectedEmotion = detectEmotion(text);
    if (detectedEmotion) {
      setCurrentEmotion(detectedEmotion);
    }

    const userMessage = {
      id: createId(),
      role: 'user',
      text,
      languageCode: selectedLanguage.code,
      emotion: detectedEmotion,
      toolActions: [],
    };

    const pendingMessages = [...messagesRef.current, userMessage];
    setMessages(pendingMessages);
    setInputText('');
    setIsSending(true);
    setIsThinking(true);

    try {
      const result = await fetchAriaReply({
        uiMessages: pendingMessages,
        context,
        languageCode: selectedLanguage.code,
        userId,
        sessionId: sessionIdRef.current,
      });

      // Update emotion from agent response
      if (result.emotion) {
        setCurrentEmotion(result.emotion);
      }

      // Handle navigation intent
      if (result.navigateTo && navigation) {
        setTimeout(() => {
          navigation.navigate(result.navigateTo);
        }, 1500);
      }

      appendAssistantMessage(result.reply, selectedLanguage.code, {
        emotion: result.emotion || currentEmotion,
        toolActions: result.toolActions || [],
      });
    } catch (err) {
      console.warn('[AriaScreen] fetchAriaReply failed:', err?.message || err);
      // If farmer is distressed, use encouragement as fallback
      const fallbackText = detectedEmotion === 'worried' || detectedEmotion === 'frustrated'
        ? getEncouragement(userDistrict, selectedLanguage.code)
        : getAriaFallbackReply(selectedLanguage.code);
      appendAssistantMessage(fallbackText, selectedLanguage.code);
    } finally {
      setIsSending(false);
      setIsThinking(false);
    }
  };

  // ─── Daily Briefing ────────────────────────────────────────────────────
  const requestDailyBriefing = () => {
    const briefingPrompt =
      selectedLanguage.code === 'mr'
        ? `आजचं ब्रीफिंग दे — ${context.crop} भाव, हवामान, आणि काही important अपडेट्स`
        : selectedLanguage.code === 'en'
          ? `Give me today's briefing — ${context.crop} prices, weather, and any important updates`
          : `Aaj ka briefing de — ${context.crop} bhav, mausam, aur koi important updates`;
    sendUserMessage(briefingPrompt);
  };

  // ─── Recording ─────────────────────────────────────────────────────────
  const startRecordingFn = async () => {
    if (isRecording || isTranscribing || isSending) return;
    try {
      const AudioApi = await ensureAudioApi();
      if (!AudioApi) {
        appendAssistantMessage(
          'Voice input abhi available nahi hai. Type karke pucho.',
          selectedLanguage.code
        );
        return;
      }
      const permission = await AudioApi.requestPermissionsAsync();
      if (permission.status !== 'granted') {
        appendAssistantMessage(
          'Mic permission chalu karo, tab awaaz se sun paungi.',
          selectedLanguage.code
        );
        return;
      }
      await AudioApi.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording } = await AudioApi.Recording.createAsync(
        AudioApi.RecordingOptionsPresets.HIGH_QUALITY
      );
      recordingRef.current = recording;
      setIsRecording(true);
    } catch {
      appendAssistantMessage(
        'Recording start nahi ho payi. Type karke pucho.',
        selectedLanguage.code
      );
    }
  };

  const stopRecordingFn = async () => {
    if (!recordingRef.current || !isRecording) return;
    setIsRecording(false);
    setIsTranscribing(true);
    try {
      const AudioApi = await ensureAudioApi();
      const recording = recordingRef.current;
      recordingRef.current = null;
      await recording.stopAndUnloadAsync();
      if (AudioApi?.setAudioModeAsync) {
        await AudioApi.setAudioModeAsync({ allowsRecordingIOS: false, playsInSilentModeIOS: true });
      }
      const uri = recording.getURI();
      if (!uri) throw new Error('Recording URI missing');
      const transcript = await transcribeWithWhisper({
        audioUri: uri,
        languageCode: selectedLanguage.code,
      });
      if (!transcript) {
        appendAssistantMessage(
          'Awaaz clear nahi mili. Ek baar phir bolo.',
          selectedLanguage.code
        );
        return;
      }
      setInputText(transcript);
      await new Promise((r) => setTimeout(r, 180));
      await sendUserMessage(transcript);
    } catch {
      appendAssistantMessage(
        'Voice samajhne mein issue aaya. Type karke pucho.',
        selectedLanguage.code
      );
    } finally {
      setIsTranscribing(false);
    }
  };

  const onReplayMessage = useCallback((message) => {
    speakText(message.text, message.languageCode || selectedLanguage.code, message.id);
  }, [selectedLanguage.code]);

  // ═══════════════════════════════════════════════════════════════════════════
  // Render
  // ═══════════════════════════════════════════════════════════════════════════

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Speaking overlay */}
      {isSpeaking && (
        <Pressable style={styles.speakingOverlay} onPress={stopSpeech}>
          <View style={styles.waveContainer}>
            <Animated.View style={[styles.waveBar, { height: waveBarOne }]} />
            <Animated.View style={[styles.waveBar, { height: waveBarTwo }]} />
            <Animated.View style={[styles.waveBar, { height: waveBarThree }]} />
          </View>
          <Text style={styles.speakingHint}>{tr('aria.speakingOverlay')}</Text>
        </Pressable>
      )}

      {/* Memory peek card */}
      {showMemoryPeek && (
        <MemoryPeekCard
          memories={userMemories}
          onDismiss={() => setShowMemoryPeek(false)}
        />
      )}

      {/* Header with avatar + language pills */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <EmotionalAvatar emotion={currentEmotion} isThinking={isThinking} />
          <View>
            <Text style={styles.headerTitle}>ARIA</Text>
            <Text style={styles.headerSubtitle}>{tr('aria.subtitle')}</Text>
          </View>
        </View>
        <View style={styles.headerRight}>
          {/* Daily Briefing button */}
          <TouchableOpacity
            style={styles.briefingButton}
            onPress={requestDailyBriefing}
            activeOpacity={0.8}
          >
            <MaterialCommunityIcons name="newspaper-variant-outline" size={18} color={COLORS.onPrimary} />
          </TouchableOpacity>
          {/* Language pills */}
          <View style={styles.languagePills}>
            {LANGUAGE_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.code}
                style={[
                  styles.languagePill,
                  selectedLanguage.code === option.code && styles.languagePillActive,
                ]}
                onPress={() => setSelectedLanguage(option)}
              >
                <Text
                  style={[
                    styles.languagePillText,
                    selectedLanguage.code === option.code && styles.languagePillTextActive,
                  ]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>

      {/* Thinking indicator bar */}
      {isThinking && (
        <View style={styles.thinkingBar}>
          <ActivityIndicator size="small" color={COLORS.primary} />
          <Text style={styles.thinkingText}>
            {selectedLanguage.code === 'mr' ? 'विचार करतेय...' :
             selectedLanguage.code === 'en' ? 'Thinking...' :
             'Soch rahi hoon...'}
          </Text>
        </View>
      )}

      {/* Chat area */}
      <KeyboardAvoidingView
        style={styles.chatWrapper}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {messages.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="robot-happy-outline" size={48} color={COLORS.primary} />
            <Text style={styles.emptyTitle}>{tr('aria.emptyTitle')}</Text>
            <Text style={styles.emptySubtitle}>
              {selectedLanguage.code === 'mr' ? 'तुमच्या शेतीचे प्रश्न विचारा' :
               selectedLanguage.code === 'en' ? 'Ask me about your crops, weather & prices' :
               'Apni kheti ke baare mein kuch bhi pucho'}
            </Text>
            {suggestedQuestions.map((question) => (
              <TouchableOpacity
                key={question}
                style={styles.suggestedChip}
                onPress={() => sendUserMessage(question)}
              >
                <Text style={styles.suggestedChipText}>{question}</Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <MessageBubble
                message={item}
                onReplay={onReplayMessage}
                onQuickReply={sendUserMessage}
                currentEmotion={currentEmotion}
              />
            )}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="none"
          />
        )}

        {/* Input bar */}
        <View style={styles.inputBar}>
          <TextInput
            style={styles.input}
            value={inputText}
            onChangeText={setInputText}
            placeholder={tr('aria.inputPlaceholder')}
            placeholderTextColor={COLORS.outline}
            multiline
            onSubmitEditing={() => sendUserMessage(inputText)}
          />

          <TouchableOpacity
            style={[styles.sendButton, (!inputText.trim() || isSending) && styles.sendButtonDisabled]}
            onPress={() => sendUserMessage(inputText)}
            activeOpacity={0.9}
            disabled={!inputText.trim() || isSending}
          >
            <MaterialCommunityIcons name="send" size={18} color={COLORS.onPrimary} />
          </TouchableOpacity>

          <Pressable
            style={styles.micButtonWrap}
            onPressIn={startRecordingFn}
            onPressOut={stopRecordingFn}
          >
            {isRecording && (
              <Animated.View
                style={[
                  styles.recordingPulse,
                  { transform: [{ scale: pulseScale }] },
                ]}
              />
            )}
            <View style={styles.micButton}>
              {isTranscribing || isSending ? (
                <ActivityIndicator color={COLORS.onPrimary} size="small" />
              ) : (
                <MaterialCommunityIcons
                  name={isRecording ? 'microphone' : 'microphone-outline'}
                  size={22}
                  color={COLORS.onPrimary}
                />
              )}
            </View>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Styles
// ═══════════════════════════════════════════════════════════════════════════════

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  // ── Speaking Overlay ───────────────────────────────────────────────────
  speakingOverlay: {
    position: 'absolute',
    zIndex: 20,
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: COLORS.backdrop,
    alignItems: 'center',
    justifyContent: 'center',
    rowGap: SPACING.md,
  },
  waveContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    columnGap: 6,
    height: 26,
  },
  waveBar: {
    width: 8,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.primary,
  },
  speakingHint: {
    ...TYPOGRAPHY.labelMedium,
    color: COLORS.onPrimary,
    fontWeight: '700',
  },

  // ── Avatar ─────────────────────────────────────────────────────────────
  avatarContainer: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.xs,
  },
  avatarGlow: {
    position: 'absolute',
    width: 36,
    height: 36,
    borderRadius: RADIUS.full,
  },
  avatarCircle: {
    width: 32,
    height: 32,
    borderRadius: RADIUS.full,
    borderWidth: 2,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Header ─────────────────────────────────────────────────────────────
  header: {
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.sm,
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: SPACING.sm,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: SPACING.sm,
  },
  headerTitle: {
    ...TYPOGRAPHY.headlineSmall,
    color: COLORS.onPrimary,
    fontWeight: '800',
  },
  headerSubtitle: {
    ...TYPOGRAPHY.labelSmall,
    color: 'rgba(255,255,255,0.75)',
    marginTop: 1,
  },
  briefingButton: {
    width: 34,
    height: 34,
    borderRadius: RADIUS.full,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  languagePills: {
    flexDirection: 'row',
    columnGap: 4,
  },
  languagePill: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    borderRadius: RADIUS.full,
    paddingVertical: 4,
    paddingHorizontal: SPACING.sm,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  languagePillActive: {
    backgroundColor: COLORS.onPrimary,
    borderColor: COLORS.onPrimary,
  },
  languagePillText: {
    ...TYPOGRAPHY.labelSmall,
    color: 'rgba(255,255,255,0.85)',
    fontWeight: '700',
  },
  languagePillTextActive: {
    color: COLORS.primary,
  },

  // ── Thinking Bar ───────────────────────────────────────────────────────
  thinkingBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.xs,
    backgroundColor: COLORS.primaryContainer,
    columnGap: SPACING.sm,
  },
  thinkingText: {
    ...TYPOGRAPHY.labelMedium,
    color: COLORS.onPrimaryContainer,
    fontWeight: '600',
  },

  // ── Memory Peek ────────────────────────────────────────────────────────
  memoryCard: {
    position: 'absolute',
    zIndex: 15,
    top: 90,
    left: SPACING.md,
    right: SPACING.md,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    ...ELEVATION.level3,
    rowGap: SPACING.xs,
  },
  memoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.xs,
  },
  memoryTitle: {
    ...TYPOGRAPHY.titleSmall,
    color: COLORS.primary,
    flex: 1,
    marginLeft: SPACING.sm,
  },
  memoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: SPACING.xs,
    paddingVertical: 2,
  },
  memoryKey: {
    ...TYPOGRAPHY.labelSmall,
    color: COLORS.onSurfaceVariant,
    fontWeight: '600',
  },
  memoryValue: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.onSurface,
    flex: 1,
  },

  // ── Tool Action Chips ──────────────────────────────────────────────────
  toolActionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: SPACING.xs,
  },
  toolChip: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 3,
    backgroundColor: COLORS.secondaryContainer,
    borderRadius: RADIUS.full,
    paddingVertical: 2,
    paddingHorizontal: 6,
  },
  toolChipText: {
    ...TYPOGRAPHY.labelSmall,
    fontSize: 10,
    color: COLORS.onSecondaryContainer,
  },

  // ── Chat ───────────────────────────────────────────────────────────────
  chatWrapper: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: SPACING.sm,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.sm,
    rowGap: SPACING.sm,
  },
  messageRow: {
    marginBottom: SPACING.sm,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  userRow: {
    justifyContent: 'flex-end',
  },
  assistantRow: {
    justifyContent: 'flex-start',
  },
  messageBubble: {
    maxWidth: '80%',
    borderRadius: RADIUS.lg,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.sm,
  },
  userBubble: {
    backgroundColor: COLORS.primary,
    borderTopRightRadius: RADIUS.xs,
  },
  assistantBubble: {
    backgroundColor: COLORS.surface,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary,
    borderTopLeftRadius: RADIUS.xs,
    ...ELEVATION.level1,
  },
  assistantMessageHead: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    columnGap: SPACING.sm,
  },
  messageText: {
    flex: 1,
    ...TYPOGRAPHY.bodyMedium,
    lineHeight: 21,
  },
  userText: {
    color: COLORS.onPrimary,
  },
  assistantText: {
    color: COLORS.onSurface,
  },
  replayButton: {
    marginTop: 1,
    padding: 2,
  },
  quickRepliesRow: {
    marginTop: 6,
    marginLeft: 40,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    maxWidth: '90%',
  },
  quickReplyChip: {
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    backgroundColor: COLORS.surfaceVariant,
    borderRadius: RADIUS.full,
    paddingVertical: 6,
    paddingHorizontal: SPACING.sm,
  },
  quickReplyText: {
    ...TYPOGRAPHY.labelSmall,
    color: COLORS.primary,
    fontWeight: '600',
  },

  // ── Empty State ────────────────────────────────────────────────────────
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.lg,
    rowGap: SPACING.sm,
  },
  emptyTitle: {
    ...TYPOGRAPHY.titleMedium,
    color: COLORS.onSurface,
    fontWeight: '700',
    marginTop: SPACING.sm,
  },
  emptySubtitle: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.onSurfaceVariant,
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  suggestedChip: {
    width: '100%',
    backgroundColor: COLORS.surface,
    borderColor: COLORS.outlineVariant,
    borderWidth: 1,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.sm,
    ...ELEVATION.level0,
  },
  suggestedChipText: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.onSurface,
    fontWeight: '600',
  },

  // ── Input Bar ──────────────────────────────────────────────────────────
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: SPACING.sm,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.outlineVariant,
    backgroundColor: COLORS.surface,
  },
  input: {
    flex: 1,
    minHeight: 46,
    maxHeight: 120,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.sm,
    color: COLORS.onSurface,
    ...TYPOGRAPHY.bodyMedium,
    backgroundColor: COLORS.surfaceVariant,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  micButtonWrap: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordingPulse: {
    position: 'absolute',
    width: 48,
    height: 48,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.primary + '30',
  },
  micButton: {
    width: 42,
    height: 42,
    borderRadius: RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
  },
});
