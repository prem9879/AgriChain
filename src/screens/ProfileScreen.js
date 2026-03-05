import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, ELEVATION, RADIUS, SPACING, TYPOGRAPHY } from '../theme/colors';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import LanguageSwitcher from '../components/LanguageSwitcher';

export default function ProfileScreen({ navigation }) {
  const { user, isAuthenticated, updateProfile, changePassword, logout } = useAuth();
  const { t } = useLanguage();

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({});
  const [pwModal, setPwModal] = useState(false);
  const [pwForm, setPwForm] = useState({ current: '', newPw: '', confirm: '' });

  if (!isAuthenticated) {
    return (
      <View style={styles.guestContainer}>
        <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />
        <View style={styles.guestIconWrap}>
          <MaterialCommunityIcons name="account-off-outline" size={48} color={COLORS.onSurfaceVariant} />
        </View>
        <Text style={styles.guestTitle}>{t('profile.guestTitle')}</Text>
        <Text style={styles.guestSub}>{t('profile.guestSubtitle')}</Text>
        <Text style={styles.langLabel}>{t('profile.language')}</Text>
        <LanguageSwitcher style={{ marginBottom: SPACING.lg }} />
        <TouchableOpacity style={styles.loginBtn} onPress={() => navigation.navigate('Login')}>
          <Text style={styles.loginBtnText}>{t('auth.loginBtn')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.registerLink} onPress={() => navigation.navigate('Register')}>
          <Text style={styles.registerLinkText}>
            {t('auth.noAccount')} <Text style={styles.linkText}>{t('auth.registerNow')}</Text>
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  const startEdit = () => {
    setForm({
      full_name: user.full_name || '', email: user.email || '', district: user.district || '',
      state: user.state || 'Maharashtra', main_crop: user.main_crop || '',
      farm_size_acres: user.farm_size_acres ? String(user.farm_size_acres) : '', soil_type: user.soil_type || '',
    });
    setEditing(true);
  };

  const saveEdit = async () => {
    setSaving(true);
    try {
      const updates = { ...form };
      if (updates.farm_size_acres) updates.farm_size_acres = parseFloat(updates.farm_size_acres);
      else delete updates.farm_size_acres;
      await updateProfile(updates);
      setEditing(false);
    } catch (err) {
      Alert.alert(t('common.error'), err?.response?.data?.detail || t('profile.saveFailed'));
    } finally { setSaving(false); }
  };

  const handlePasswordChange = async () => {
    if (pwForm.newPw.length < 6) { Alert.alert(t('common.error'), t('auth.passwordMin')); return; }
    if (pwForm.newPw !== pwForm.confirm) { Alert.alert(t('common.error'), t('auth.passwordMismatch')); return; }
    try {
      await changePassword(pwForm.current, pwForm.newPw);
      Alert.alert('', t('profile.passwordChanged'));
      setPwModal(false); setPwForm({ current: '', newPw: '', confirm: '' });
    } catch (err) {
      Alert.alert(t('common.error'), err?.response?.data?.detail || t('profile.passwordFailed'));
    }
  };

  const handleLogout = () => {
    Alert.alert(t('profile.logoutTitle'), t('profile.logoutMessage'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('profile.logout'), style: 'destructive', onPress: () => logout() },
    ]);
  };

  const ProfileField = ({ icon, label, value, field }) => (
    <View style={styles.fieldRow}>
      <View style={styles.fieldIconWrap}>
        <MaterialCommunityIcons name={icon} size={18} color={COLORS.primary} />
      </View>
      <View style={styles.fieldBody}>
        <Text style={styles.fieldLabel}>{label}</Text>
        {editing && field ? (
          <TextInput
            style={styles.fieldInput}
            value={form[field] || ''}
            onChangeText={v => setForm(prev => ({ ...prev, [field]: v }))}
            placeholder="—" placeholderTextColor={COLORS.outline}
          />
        ) : (
          <Text style={styles.fieldValue}>{value || '—'}</Text>
        )}
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
      <View style={styles.header}>
        <View style={styles.avatarCircle}>
          <MaterialCommunityIcons name="account-outline" size={36} color={COLORS.onPrimary} />
        </View>
        <Text style={styles.headerName}>{user.full_name}</Text>
        <Text style={styles.headerPhone}>{user.phone}</Text>
      </View>

      <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>{t('profile.personalInfo')}</Text>
            {!editing ? (
              <TouchableOpacity onPress={startEdit} hitSlop={8}>
                <MaterialCommunityIcons name="pencil-outline" size={20} color={COLORS.primary} />
              </TouchableOpacity>
            ) : (
              <View style={{ flexDirection: 'row', gap: SPACING.sm }}>
                <TouchableOpacity onPress={() => setEditing(false)} hitSlop={8}>
                  <MaterialCommunityIcons name="close" size={22} color={COLORS.onSurfaceVariant} />
                </TouchableOpacity>
                <TouchableOpacity onPress={saveEdit} disabled={saving} hitSlop={8}>
                  {saving ? <ActivityIndicator size="small" color={COLORS.primary} /> : <MaterialCommunityIcons name="check" size={22} color={COLORS.success} />}
                </TouchableOpacity>
              </View>
            )}
          </View>
          <ProfileField icon="account-outline" label={t('auth.fullName')} value={user.full_name} field="full_name" />
          <ProfileField icon="email-outline" label={t('profile.email')} value={user.email} field="email" />
          <ProfileField icon="map-marker-outline" label={t('auth.district')} value={user.district} field="district" />
          <ProfileField icon="map-outline" label={t('profile.state')} value={user.state} field="state" />
          <ProfileField icon="sprout-outline" label={t('auth.mainCrop')} value={user.main_crop} field="main_crop" />
          <ProfileField icon="ruler-square" label={t('auth.farmSize')} value={user.farm_size_acres ? `${user.farm_size_acres} acres` : null} field="farm_size_acres" />
          <ProfileField icon="terrain" label={t('auth.soilType')} value={user.soil_type} field="soil_type" />
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t('profile.language')}</Text>
          <LanguageSwitcher style={{ marginTop: SPACING.sm }} />
        </View>

        {!pwModal ? (
          <TouchableOpacity style={styles.menuItem} onPress={() => setPwModal(true)}>
            <MaterialCommunityIcons name="lock-outline" size={22} color={COLORS.primary} />
            <Text style={styles.menuText}>{t('profile.changePassword')}</Text>
            <MaterialCommunityIcons name="chevron-right" size={22} color={COLORS.outline} />
          </TouchableOpacity>
        ) : (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{t('profile.changePassword')}</Text>
            <TextInput style={styles.pwInput} placeholder={t('profile.currentPassword')} placeholderTextColor={COLORS.outline} secureTextEntry value={pwForm.current} onChangeText={v => setPwForm(p => ({ ...p, current: v }))} />
            <TextInput style={styles.pwInput} placeholder={t('profile.newPassword')} placeholderTextColor={COLORS.outline} secureTextEntry value={pwForm.newPw} onChangeText={v => setPwForm(p => ({ ...p, newPw: v }))} />
            <TextInput style={styles.pwInput} placeholder={t('auth.confirmPassword')} placeholderTextColor={COLORS.outline} secureTextEntry value={pwForm.confirm} onChangeText={v => setPwForm(p => ({ ...p, confirm: v }))} />
            <View style={{ flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.sm }}>
              <TouchableOpacity style={[styles.pwBtn, { backgroundColor: COLORS.surfaceVariant }]} onPress={() => { setPwModal(false); setPwForm({ current: '', newPw: '', confirm: '' }); }}>
                <Text style={{ ...TYPOGRAPHY.labelLarge, color: COLORS.onSurfaceVariant }}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.pwBtn} onPress={handlePasswordChange}>
                <Text style={{ ...TYPOGRAPHY.labelLarge, color: COLORS.onPrimary }}>{t('common.save')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('Dashboard')}>
          <MaterialCommunityIcons name="view-dashboard-outline" size={22} color={COLORS.primary} />
          <Text style={styles.menuText}>{t('profile.dashboard')}</Text>
          <MaterialCommunityIcons name="chevron-right" size={22} color={COLORS.outline} />
        </TouchableOpacity>

        <TouchableOpacity style={[styles.menuItem, styles.logoutItem]} onPress={handleLogout}>
          <MaterialCommunityIcons name="logout" size={22} color={COLORS.error} />
          <Text style={[styles.menuText, { color: COLORS.error }]}>{t('profile.logout')}</Text>
        </TouchableOpacity>

        <View style={{ height: SPACING.xl }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },

  guestContainer: { flex: 1, backgroundColor: COLORS.background, justifyContent: 'center', alignItems: 'center', padding: SPACING.xl },
  guestIconWrap: { width: 88, height: 88, borderRadius: 44, backgroundColor: COLORS.surfaceVariant, justifyContent: 'center', alignItems: 'center', marginBottom: SPACING.md },
  guestTitle: { ...TYPOGRAPHY.titleLarge, color: COLORS.onSurface, fontWeight: '700', marginBottom: SPACING.xs },
  guestSub: { ...TYPOGRAPHY.bodyMedium, color: COLORS.onSurfaceVariant, textAlign: 'center', marginBottom: SPACING.lg },
  langLabel: { ...TYPOGRAPHY.labelMedium, color: COLORS.onSurfaceVariant, marginBottom: SPACING.sm },
  loginBtn: { backgroundColor: COLORS.primary, borderRadius: RADIUS.lg, height: 52, width: '80%', justifyContent: 'center', alignItems: 'center', marginBottom: SPACING.sm },
  loginBtnText: { ...TYPOGRAPHY.labelLarge, color: COLORS.onPrimary },
  registerLink: { paddingVertical: SPACING.sm },
  registerLinkText: { ...TYPOGRAPHY.bodyMedium, color: COLORS.onSurfaceVariant },
  linkText: { color: COLORS.primary, fontWeight: '700' },

  header: { backgroundColor: COLORS.primary, paddingTop: 48, paddingBottom: SPACING.lg, alignItems: 'center', borderBottomLeftRadius: RADIUS.xl, borderBottomRightRadius: RADIUS.xl },
  avatarCircle: { width: 72, height: 72, borderRadius: 36, backgroundColor: 'rgba(255,255,255,0.18)', justifyContent: 'center', alignItems: 'center', marginBottom: SPACING.sm },
  headerName: { ...TYPOGRAPHY.titleLarge, color: COLORS.onPrimary, fontWeight: '800' },
  headerPhone: { ...TYPOGRAPHY.bodyMedium, color: 'rgba(255,255,255,0.75)', marginTop: 2 },

  body: { flex: 1, marginTop: -SPACING.sm },
  bodyContent: { paddingHorizontal: SPACING.md, paddingTop: SPACING.md },

  card: { backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: SPACING.md, marginBottom: SPACING.sm, ...ELEVATION.level1 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.sm },
  cardTitle: { ...TYPOGRAPHY.titleSmall, color: COLORS.onSurface, fontWeight: '700' },

  fieldRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: SPACING.sm, borderBottomWidth: 0.5, borderBottomColor: COLORS.outlineVariant },
  fieldIconWrap: { width: 32, height: 32, borderRadius: RADIUS.sm, backgroundColor: COLORS.primaryContainer, justifyContent: 'center', alignItems: 'center', marginRight: SPACING.sm },
  fieldBody: { flex: 1 },
  fieldLabel: { ...TYPOGRAPHY.labelSmall, color: COLORS.onSurfaceVariant, marginBottom: 1 },
  fieldValue: { ...TYPOGRAPHY.bodyMedium, color: COLORS.onSurface },
  fieldInput: { ...TYPOGRAPHY.bodyMedium, color: COLORS.onSurface, borderBottomWidth: 1.5, borderBottomColor: COLORS.primary, paddingVertical: 2 },

  menuItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: SPACING.md, marginBottom: SPACING.sm, ...ELEVATION.level1 },
  menuText: { flex: 1, ...TYPOGRAPHY.bodyLarge, fontWeight: '600', color: COLORS.onSurface, marginLeft: SPACING.sm },
  logoutItem: { borderWidth: 1, borderColor: COLORS.error + '25' },

  pwInput: { borderWidth: 1.5, borderColor: COLORS.outlineVariant, borderRadius: RADIUS.md, height: 48, paddingHorizontal: SPACING.md, ...TYPOGRAPHY.bodyMedium, marginTop: SPACING.sm, backgroundColor: COLORS.surfaceVariant, color: COLORS.onSurface },
  pwBtn: { flex: 1, height: 44, borderRadius: RADIUS.md, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' },
});
