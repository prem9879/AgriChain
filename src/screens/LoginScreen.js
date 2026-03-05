/**
 * AGRI-मित्र Login Screen — Material Design 3
 */

import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert,
  StatusBar,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, ELEVATION, RADIUS, SPACING, TYPOGRAPHY } from '../theme/colors';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

export default function LoginScreen({ navigation }) {
  const { login } = useAuth();
  const { t } = useLanguage();

  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [quickLoading, setQuickLoading] = useState(null);
  const [errors, setErrors] = useState({});

  const passwordRef = useRef(null);

  // Demo accounts for instant login (no backend needed)
  const DEMO_ACCOUNTS = [
    {
      label: '👨‍🌾 Prem', color: '#1B5E20',
      user: { id: 1, phone: '9876543001', full_name: 'Prem', district: 'Nashik', state: 'Maharashtra', main_crop: 'onion', farm_size_acres: 5.0, soil_type: 'black', language: 'hi', total_harvests: 12, savings_estimate: 45000, created_at: '2024-06-01T00:00:00' },
    },
    {
      label: '🧑‍💻 Ashwin', color: '#0277BD',
      user: { id: 3, phone: '9876543003', full_name: 'Ashwin', district: 'Nagpur', state: 'Maharashtra', main_crop: 'wheat', farm_size_acres: 8.0, soil_type: 'alluvial', language: 'en', total_harvests: 8, savings_estimate: 32000, created_at: '2024-07-15T00:00:00' },
    },
    {
      label: '🌾 Bhumi', color: '#B71C1C',
      user: { id: 2, phone: '9876543002', full_name: 'Bhumi', district: 'Pune', state: 'Maharashtra', main_crop: 'tomato', farm_size_acres: 3.5, soil_type: 'red', language: 'hi', total_harvests: 6, savings_estimate: 28000, created_at: '2024-08-10T00:00:00' },
    },
  ];

  const validate = () => {
    const e = {};
    const cleaned = phone.replace(/\s|-/g, '');
    if (!cleaned || cleaned.length < 10) e.phone = t('auth.phoneRequired');
    if (!password || password.length < 6) e.password = t('auth.passwordMin');
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleLogin = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      await login(phone.trim(), password);
    } catch (err) {
      let msg = err?.response?.data?.detail || '';
      if (!msg) {
        if (err._friendlyMessage) msg = err._friendlyMessage;
        else if (err.code === 'NO_INTERNET') msg = 'No internet connection. Check your WiFi or mobile data.';
        else if (err.code === 'ECONNABORTED') msg = 'Server timeout — is backend running?';
        else if (err.message?.includes('Network Error')) msg = 'Cannot reach server. Ensure backend is running and device is on the same network.';
        else msg = t('auth.loginFailed');
      }
      Alert.alert(t('common.error'), msg);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async (account, idx) => {
    setQuickLoading(idx);
    try {
      // Instant offline login — save demo user directly without backend
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      const demoToken = 'demo_token_' + account.user.phone;
      await AsyncStorage.setItem('@agrimitra_auth_token', demoToken);
      await AsyncStorage.setItem('@agrimitra_auth_user', JSON.stringify(account.user));
      // Force auth state refresh by calling login with a special flag
      await login(account.user.phone, 'demo_skip', { skipBackend: true, demoUser: account.user, demoToken });
    } catch (err) {
      // Fallback: directly set storage and navigate
      try {
        const AsyncStorage = require('@react-native-async-storage/async-storage').default;
        const demoToken = 'demo_token_' + account.user.phone;
        await AsyncStorage.setItem('@agrimitra_auth_token', demoToken);
        await AsyncStorage.setItem('@agrimitra_auth_user', JSON.stringify(account.user));
        navigation.replace('MainTabs');
      } catch (e2) {
        Alert.alert('Error', 'Quick login failed. Please try manual login.');
      }
    } finally {
      setQuickLoading(null);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Logo Header ───────────────────────────────────────────── */}
        <View style={styles.header}>
          <Image
            source={require('../../assets/logo (2).jpeg')}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.tagline}>{t('auth.tagline')}</Text>
        </View>

        {/* ── Form Card ─────────────────────────────────────────────── */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t('auth.loginTitle')}</Text>
          <Text style={styles.cardSubtitle}>{t('auth.loginSubtitle')}</Text>

          {/* Phone */}
          <Text style={styles.label}>{t('auth.phone')}</Text>
          <View style={[styles.inputRow, errors.phone && styles.inputError]}>
            <MaterialCommunityIcons name="phone-outline" size={20} color={COLORS.primary} />
            <TextInput
              style={styles.input}
              placeholder="9876543210"
              placeholderTextColor={COLORS.onSurfaceVariant}
              keyboardType="phone-pad"
              maxLength={15}
              value={phone}
              onChangeText={(v) => { setPhone(v); setErrors(prev => ({ ...prev, phone: null })); }}
              returnKeyType="next"
              onSubmitEditing={() => passwordRef.current?.focus()}
            />
          </View>
          {errors.phone && <Text style={styles.errorText}>{errors.phone}</Text>}

          {/* Password */}
          <Text style={styles.label}>{t('auth.password')}</Text>
          <View style={[styles.inputRow, errors.password && styles.inputError]}>
            <MaterialCommunityIcons name="lock-outline" size={20} color={COLORS.primary} />
            <TextInput
              ref={passwordRef}
              style={styles.input}
              placeholder="••••••"
              placeholderTextColor={COLORS.onSurfaceVariant}
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={(v) => { setPassword(v); setErrors(prev => ({ ...prev, password: null })); }}
              returnKeyType="done"
              onSubmitEditing={handleLogin}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)} hitSlop={8}>
              <MaterialCommunityIcons
                name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                size={22}
                color={COLORS.onSurfaceVariant}
              />
            </TouchableOpacity>
          </View>
          {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}

          {/* Login Button */}
          <TouchableOpacity
            style={[styles.btn, loading && styles.btnDisabled]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color={COLORS.onPrimary} />
            ) : (
              <Text style={styles.btnText}>{t('auth.loginBtn')}</Text>
            )}
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>{t('auth.or')}</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* ── Instant Demo Logins ─────────────────────────────────── */}
          <Text style={styles.quickLoginTitle}>⚡ Quick Demo Login</Text>
          <View style={styles.quickLoginRow}>
            {DEMO_ACCOUNTS.map((acc, idx) => (
              <TouchableOpacity
                key={acc.user.phone}
                style={[styles.quickLoginCard, { borderColor: acc.color }]}
                onPress={() => handleQuickLogin(acc, idx)}
                disabled={quickLoading !== null}
                activeOpacity={0.7}
              >
                {quickLoading === idx ? (
                  <ActivityIndicator size="small" color={acc.color} />
                ) : (
                  <>
                    <Text style={styles.quickLoginEmoji}>{acc.label.split(' ')[0]}</Text>
                    <Text style={[styles.quickLoginName, { color: acc.color }]}>
                      {acc.label.split(' ').slice(1).join(' ')}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            ))}
          </View>

          {/* Register link */}
          <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={() => navigation.navigate('Register')}
          >
            <Text style={styles.secondaryBtnText}>
              {t('auth.noAccount')}{' '}
              <Text style={styles.linkText}>{t('auth.registerNow')}</Text>
            </Text>
          </TouchableOpacity>

          {/* Guest mode */}
          <TouchableOpacity
            style={styles.guestBtn}
            onPress={() => navigation.replace('MainTabs')}
          >
            <MaterialCommunityIcons name="account-off-outline" size={18} color={COLORS.onSurfaceVariant} />
            <Text style={styles.guestText}>{t('auth.guestMode')}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scroll: { flexGrow: 1 },

  header: { alignItems: 'center', paddingTop: 40, paddingBottom: 10 },
  logo: { width: 200, height: 160 },
  tagline: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.onSurfaceVariant,
    marginTop: SPACING.xs,
    fontStyle: 'italic',
  },

  card: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.xl,
    paddingBottom: SPACING.lg,
    flex: 1,
    minHeight: 400,
    ...ELEVATION.level2,
  },
  cardTitle: {
    ...TYPOGRAPHY.headlineSmall,
    color: COLORS.onSurface,
    fontWeight: '700',
    textAlign: 'center',
  },
  cardSubtitle: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.onSurfaceVariant,
    textAlign: 'center',
    marginTop: SPACING.xs,
    marginBottom: SPACING.md,
  },

  label: {
    ...TYPOGRAPHY.labelMedium,
    color: COLORS.onSurfaceVariant,
    marginBottom: SPACING.xs,
    marginTop: SPACING.md,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.outline,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    height: 52,
    backgroundColor: COLORS.surfaceVariant,
  },
  inputError: { borderColor: COLORS.error },
  input: {
    flex: 1,
    ...TYPOGRAPHY.bodyLarge,
    color: COLORS.onSurface,
    marginLeft: SPACING.sm,
  },
  errorText: {
    ...TYPOGRAPHY.labelSmall,
    color: COLORS.error,
    marginTop: SPACING.xs,
  },

  btn: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: SPACING.lg,
    ...ELEVATION.level1,
  },
  btnDisabled: { opacity: 0.7 },
  btnText: {
    ...TYPOGRAPHY.labelLarge,
    color: COLORS.onPrimary,
    fontWeight: '700',
  },

  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: SPACING.lg,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: COLORS.outlineVariant },
  dividerText: {
    ...TYPOGRAPHY.labelMedium,
    marginHorizontal: SPACING.md,
    color: COLORS.onSurfaceVariant,
  },

  secondaryBtn: { alignItems: 'center', paddingVertical: SPACING.sm },
  secondaryBtnText: { ...TYPOGRAPHY.bodyMedium, color: COLORS.onSurfaceVariant },
  linkText: { color: COLORS.primary, fontWeight: '700' },

  guestBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  guestText: {
    ...TYPOGRAPHY.labelMedium,
    color: COLORS.onSurfaceVariant,
    marginLeft: SPACING.xs,
  },

  /* Quick Demo Login styles */
  quickLoginTitle: {
    ...TYPOGRAPHY.labelMedium,
    color: COLORS.onSurfaceVariant,
    textAlign: 'center',
    marginBottom: SPACING.sm,
    fontWeight: '600',
  },
  quickLoginRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: SPACING.lg,
  },
  quickLoginCard: {
    flex: 1,
    borderWidth: 1.5,
    borderRadius: RADIUS.md,
    paddingVertical: 12,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surfaceVariant,
    minHeight: 72,
  },
  quickLoginEmoji: {
    fontSize: 22,
    marginBottom: 4,
  },
  quickLoginName: {
    ...TYPOGRAPHY.labelSmall,
    fontWeight: '700',
    textAlign: 'center',
  },
});
