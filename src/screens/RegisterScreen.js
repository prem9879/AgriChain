/**
 * AGRI-मित्र Registration Screen — Material Design 3
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

const CROPS = ['onion', 'tomato', 'wheat', 'rice', 'potato', 'soybean', 'cotton', 'sugarcane'];
const SOIL_TYPES = ['black', 'red', 'alluvial', 'laterite', 'sandy', 'clay', 'loamy'];

export default function RegisterScreen({ navigation }) {
  const { register } = useAuth();
  const { t } = useLanguage();

  const [form, setForm] = useState({
    full_name: '', phone: '', password: '', confirmPassword: '',
    district: '', state: 'Maharashtra', main_crop: '',
    farm_size_acres: '', soil_type: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [step, setStep] = useState(1);

  const refs = { phone: useRef(null), password: useRef(null), confirm: useRef(null) };

  const updateField = (key, val) => {
    setForm(prev => ({ ...prev, [key]: val }));
    setErrors(prev => ({ ...prev, [key]: null }));
  };

  const validateStep1 = () => {
    const e = {};
    if (!form.full_name.trim()) e.full_name = t('auth.nameRequired');
    const cleaned = form.phone.replace(/\s|-/g, '');
    if (!cleaned || cleaned.length < 10) e.phone = t('auth.phoneRequired');
    if (!form.password || form.password.length < 6) e.password = t('auth.passwordMin');
    if (form.password !== form.confirmPassword) e.confirmPassword = t('auth.passwordMismatch');
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleNext = () => { if (validateStep1()) setStep(2); };

  const handleRegister = async () => {
    setLoading(true);
    try {
      const payload = {
        full_name: form.full_name.trim(),
        phone: form.phone.trim(),
        password: form.password,
        district: form.district.trim() || undefined,
        state: form.state.trim() || 'Maharashtra',
        main_crop: form.main_crop || undefined,
        farm_size_acres: form.farm_size_acres ? parseFloat(form.farm_size_acres) : undefined,
        soil_type: form.soil_type || undefined,
      };
      await register(payload);
    } catch (err) {
      const msg = err?.response?.data?.detail || t('auth.registerFailed');
      Alert.alert(t('common.error'), msg);
    } finally {
      setLoading(false);
    }
  };

  const InputField = ({ icon, label, error, children }) => (
    <>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.inputRow, error && styles.inputError]}>
        <MaterialCommunityIcons name={icon} size={20} color={COLORS.primary} />
        {children}
      </View>
      {error && <Text style={styles.errorText}>{error}</Text>}
    </>
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* ── Logo ──────────────────────────────────────────────────── */}
        <View style={styles.header}>
          <Image source={require('../../assets/logo (2).jpeg')} style={styles.logo} resizeMode="contain" />
          <Text style={styles.tagline}>{t('auth.createAccount')}</Text>
        </View>

        {/* ── Progress ──────────────────────────────────────────────── */}
        <View style={styles.progressRow}>
          <View style={[styles.progressDot, step >= 1 && styles.progressActive]} />
          <View style={[styles.progressBar, step >= 2 && styles.progressBarActive]} />
          <View style={[styles.progressDot, step >= 2 && styles.progressActive]} />
        </View>

        {/* ── Card ──────────────────────────────────────────────────── */}
        <View style={styles.card}>
          {step === 1 ? (
            <>
              <Text style={styles.cardTitle}>{t('auth.basicInfo')}</Text>

              <InputField icon="account-outline" label={t('auth.fullName')} error={errors.full_name}>
                <TextInput style={styles.input} placeholder={t('auth.fullNamePlaceholder')} placeholderTextColor={COLORS.onSurfaceVariant}
                  value={form.full_name} onChangeText={v => updateField('full_name', v)}
                  returnKeyType="next" onSubmitEditing={() => refs.phone.current?.focus()} />
              </InputField>

              <InputField icon="phone-outline" label={t('auth.phone')} error={errors.phone}>
                <TextInput ref={refs.phone} style={styles.input} placeholder="9876543210" placeholderTextColor={COLORS.onSurfaceVariant}
                  keyboardType="phone-pad" maxLength={15}
                  value={form.phone} onChangeText={v => updateField('phone', v)}
                  returnKeyType="next" onSubmitEditing={() => refs.password.current?.focus()} />
              </InputField>

              <InputField icon="lock-outline" label={t('auth.password')} error={errors.password}>
                <TextInput ref={refs.password} style={styles.input} placeholder="••••••" placeholderTextColor={COLORS.onSurfaceVariant}
                  secureTextEntry={!showPassword} value={form.password} onChangeText={v => updateField('password', v)}
                  returnKeyType="next" onSubmitEditing={() => refs.confirm.current?.focus()} />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} hitSlop={8}>
                  <MaterialCommunityIcons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={22} color={COLORS.onSurfaceVariant} />
                </TouchableOpacity>
              </InputField>

              <InputField icon="lock-check-outline" label={t('auth.confirmPassword')} error={errors.confirmPassword}>
                <TextInput ref={refs.confirm} style={styles.input} placeholder="••••••" placeholderTextColor={COLORS.onSurfaceVariant}
                  secureTextEntry={!showPassword} value={form.confirmPassword} onChangeText={v => updateField('confirmPassword', v)}
                  returnKeyType="done" />
              </InputField>

              <TouchableOpacity style={styles.btn} onPress={handleNext} activeOpacity={0.8}>
                <Text style={styles.btnText}>{t('auth.next')}</Text>
                <MaterialCommunityIcons name="arrow-right" size={20} color={COLORS.onPrimary} />
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={styles.cardTitle}>{t('auth.farmDetails')}</Text>

              <InputField icon="map-marker-outline" label={t('auth.district')}>
                <TextInput style={styles.input} placeholder={t('auth.districtPlaceholder')} placeholderTextColor={COLORS.onSurfaceVariant}
                  value={form.district} onChangeText={v => updateField('district', v)} />
              </InputField>

              <Text style={styles.label}>{t('auth.mainCrop')}</Text>
              <View style={styles.chipRow}>
                {CROPS.map(crop => (
                  <TouchableOpacity
                    key={crop}
                    style={[styles.chip, form.main_crop === crop && styles.chipActive]}
                    onPress={() => updateField('main_crop', crop)}
                  >
                    <Text style={[styles.chipText, form.main_crop === crop && styles.chipTextActive]}>
                      {crop.charAt(0).toUpperCase() + crop.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <InputField icon="ruler-square" label={t('auth.farmSize')}>
                <TextInput style={styles.input} placeholder={t('auth.farmSizePlaceholder')} placeholderTextColor={COLORS.onSurfaceVariant}
                  keyboardType="decimal-pad" value={form.farm_size_acres} onChangeText={v => updateField('farm_size_acres', v)} />
              </InputField>

              <Text style={styles.label}>{t('auth.soilType')}</Text>
              <View style={styles.chipRow}>
                {SOIL_TYPES.map(soil => (
                  <TouchableOpacity
                    key={soil}
                    style={[styles.chip, form.soil_type === soil && styles.chipActive]}
                    onPress={() => updateField('soil_type', soil)}
                  >
                    <Text style={[styles.chipText, form.soil_type === soil && styles.chipTextActive]}>
                      {soil.charAt(0).toUpperCase() + soil.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.actionRow}>
                <TouchableOpacity style={styles.backBtn} onPress={() => setStep(1)} activeOpacity={0.8}>
                  <MaterialCommunityIcons name="arrow-left" size={20} color={COLORS.primary} />
                  <Text style={styles.backBtnText}>{t('auth.back')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.btn, styles.registerBtn, loading && styles.btnDisabled]}
                  onPress={handleRegister} disabled={loading} activeOpacity={0.8}
                >
                  {loading ? <ActivityIndicator color={COLORS.onPrimary} /> : <Text style={styles.btnText}>{t('auth.registerBtn')}</Text>}
                </TouchableOpacity>
              </View>
            </>
          )}

          <TouchableOpacity style={styles.loginLink} onPress={() => navigation.navigate('Login')}>
            <Text style={styles.loginLinkText}>
              {t('auth.hasAccount')}{' '}<Text style={styles.linkText}>{t('auth.loginNow')}</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scroll: { flexGrow: 1 },

  header: { alignItems: 'center', paddingTop: 30, marginBottom: SPACING.sm },
  logo: { width: 180, height: 140 },
  tagline: { ...TYPOGRAPHY.bodySmall, color: COLORS.onSurfaceVariant, marginTop: 2, fontStyle: 'italic' },

  progressRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: SPACING.md },
  progressDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: COLORS.outlineVariant },
  progressActive: { backgroundColor: COLORS.primary },
  progressBar: { width: 50, height: 3, backgroundColor: COLORS.outlineVariant, marginHorizontal: 4 },
  progressBarActive: { backgroundColor: COLORS.primary },

  card: {
    backgroundColor: COLORS.surface, borderTopLeftRadius: RADIUS.xl, borderTopRightRadius: RADIUS.xl,
    paddingHorizontal: SPACING.lg, paddingTop: SPACING.lg, paddingBottom: SPACING.lg,
    flex: 1, ...ELEVATION.level2,
  },
  cardTitle: { ...TYPOGRAPHY.titleLarge, color: COLORS.onSurface, fontWeight: '700', marginBottom: SPACING.md, textAlign: 'center' },

  label: { ...TYPOGRAPHY.labelMedium, color: COLORS.onSurfaceVariant, marginBottom: SPACING.xs, marginTop: SPACING.md },
  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, borderColor: COLORS.outline, borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md, height: 52, backgroundColor: COLORS.surfaceVariant,
  },
  inputError: { borderColor: COLORS.error },
  input: { flex: 1, ...TYPOGRAPHY.bodyLarge, color: COLORS.onSurface, marginLeft: SPACING.sm },
  errorText: { ...TYPOGRAPHY.labelSmall, color: COLORS.error, marginTop: SPACING.xs },

  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, marginTop: SPACING.xs },
  chip: {
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full, borderWidth: 1.5, borderColor: COLORS.outline,
    backgroundColor: COLORS.surfaceVariant,
  },
  chipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipText: { ...TYPOGRAPHY.labelMedium, color: COLORS.onSurfaceVariant },
  chipTextActive: { color: COLORS.onPrimary, fontWeight: '600' },

  btn: {
    backgroundColor: COLORS.primary, borderRadius: RADIUS.md, height: 52,
    justifyContent: 'center', alignItems: 'center', marginTop: SPACING.lg,
    flexDirection: 'row', ...ELEVATION.level1, gap: SPACING.xs,
  },
  registerBtn: { flex: 1 },
  btnDisabled: { opacity: 0.7 },
  btnText: { ...TYPOGRAPHY.labelLarge, color: COLORS.onPrimary, fontWeight: '700' },

  actionRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, marginTop: SPACING.lg },
  backBtn: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.md, height: 52,
    borderRadius: RADIUS.md, borderWidth: 1.5, borderColor: COLORS.primary, gap: SPACING.xs,
  },
  backBtnText: { ...TYPOGRAPHY.labelLarge, color: COLORS.primary, fontWeight: '600' },

  loginLink: { alignItems: 'center', paddingVertical: SPACING.md, marginTop: SPACING.sm },
  loginLinkText: { ...TYPOGRAPHY.bodyMedium, color: COLORS.onSurfaceVariant },
  linkText: { color: COLORS.primary, fontWeight: '700' },
});
