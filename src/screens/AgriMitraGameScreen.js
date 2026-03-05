import React from 'react';
import {
  Dimensions,
  Image,
  Linking,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, ELEVATION, RADIUS, SPACING, TYPOGRAPHY } from '../theme/colors';
import { useLanguage } from '../context/LanguageContext';

const GAME_LINK =
  'https://drive.google.com/drive/folders/1SR6MugM2YwjjgNH9XNZFckvIP-mcc_oT?usp=sharing';

const GAME_IMAGES = [
  {
    // Village overview – top-down view of medieval farming village
    uri: 'https://drive.google.com/uc?export=view&id=1SR6MugM2YwjjgNH9XNZFckvIP-mcc_oT',
    labelKey: 'game.imgVillage',
  },
  {
    // Windmill & farmlands – ground-level view with windmills and castle walls
    uri: 'https://drive.google.com/uc?export=view&id=1SR6MugM2YwjjgNH9XNZFckvIP-mcc_oT',
    labelKey: 'game.imgWindmill',
  },
];

const FEATURES = [
  { icon: 'sprout',              color: '#1B5E20', key: 'cropLifecycle' },
  { icon: 'weather-partly-cloudy', color: '#0277BD', key: 'weatherMgmt' },
  { icon: 'store-outline',       color: '#E65100', key: 'marketStrategy' },
  { icon: 'home-group',          color: '#795548', key: 'villageExplore' },
  { icon: 'school-outline',      color: '#4527A0', key: 'learnByPlaying' },
];

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function AgriMitraGameScreen({ navigation }) {
  const { t } = useLanguage();

  const openGameLink = () => Linking.openURL(GAME_LINK);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="#1B5E20" />

      {/* ── Header ─────────────────────────────────────────────── */}
      <LinearGradient
        colors={['#1B5E20', '#388E3C']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>{t('game.title')}</Text>
          <Text style={styles.headerSub}>{t('game.tagline')}</Text>
        </View>
        <MaterialCommunityIcons name="gamepad-variant-outline" size={28} color="#fff" />
      </LinearGradient>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {/* ── Hero Images ──────────────────────────────────────── */}
        <View style={styles.imageCard}>
          <Image
            source={require('../../assets/game_village.png')}
            style={styles.heroImage}
            resizeMode="cover"
          />
          <View style={styles.imageLabel}>
            <MaterialCommunityIcons name="image-outline" size={14} color="#fff" />
            <Text style={styles.imageLabelText}>{t('game.imgVillage')}</Text>
          </View>
        </View>

        <View style={styles.imageCard}>
          <Image
            source={require('../../assets/game_windmill.png')}
            style={styles.heroImage}
            resizeMode="cover"
          />
          <View style={styles.imageLabel}>
            <MaterialCommunityIcons name="image-outline" size={14} color="#fff" />
            <Text style={styles.imageLabelText}>{t('game.imgWindmill')}</Text>
          </View>
        </View>

        {/* ── Description ──────────────────────────────────────── */}
        <View style={styles.descCard}>
          <Text style={styles.descTitle}>{t('game.aboutTitle')}</Text>
          <Text style={styles.descBody}>{t('game.description')}</Text>
          <Text style={[styles.descBody, { marginTop: SPACING.sm }]}>
            {t('game.description2')}
          </Text>
        </View>

        {/* ── Features ─────────────────────────────────────────── */}
        <Text style={styles.sectionTitle}>{t('game.featuresTitle')}</Text>
        <View style={styles.featureList}>
          {FEATURES.map((f) => (
            <View key={f.key} style={styles.featureRow}>
              <View style={[styles.featureIcon, { backgroundColor: f.color + '18' }]}>
                <MaterialCommunityIcons name={f.icon} size={22} color={f.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.featureName}>{t(`game.feat_${f.key}`)}</Text>
                <Text style={styles.featureDesc}>{t(`game.feat_${f.key}_desc`)}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* ── Play Button ──────────────────────────────────────── */}
        <TouchableOpacity activeOpacity={0.85} onPress={openGameLink}>
          <LinearGradient
            colors={['#1B5E20', '#2E7D32']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.playBtn}
          >
            <MaterialCommunityIcons name="gamepad-variant" size={22} color="#fff" />
            <Text style={styles.playBtnText}>{t('game.playCTA')}</Text>
            <MaterialCommunityIcons name="open-in-new" size={18} color="#fff" />
          </LinearGradient>
        </TouchableOpacity>

        <Text style={styles.footnote}>{t('game.footnote')}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#1B5E20' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
  },
  backBtn: { marginRight: SPACING.sm },
  headerTitle: {
    ...TYPOGRAPHY.titleLarge,
    color: '#fff',
    fontWeight: '800',
  },
  headerSub: {
    ...TYPOGRAPHY.bodySmall,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  content: {
    backgroundColor: COLORS.background,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.lg,
    paddingBottom: 100,
  },
  imageCard: {
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    marginBottom: SPACING.md,
    ...ELEVATION.level2,
  },
  heroImage: {
    width: '100%',
    height: (SCREEN_WIDTH - SPACING.md * 2) * 0.56,
    backgroundColor: '#E8F5E9',
  },
  imageLabel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 6,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  imageLabelText: {
    ...TYPOGRAPHY.labelSmall,
    color: '#fff',
    marginLeft: 4,
  },
  descCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    ...ELEVATION.level1,
  },
  descTitle: {
    ...TYPOGRAPHY.titleMedium,
    color: COLORS.primary,
    fontWeight: '700',
    marginBottom: SPACING.sm,
  },
  descBody: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.onSurfaceVariant,
    lineHeight: 22,
  },
  sectionTitle: {
    ...TYPOGRAPHY.titleMedium,
    color: COLORS.onSurface,
    fontWeight: '700',
    marginBottom: SPACING.md,
  },
  featureList: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
    ...ELEVATION.level1,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
  },
  featureIcon: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.sm,
  },
  featureName: {
    ...TYPOGRAPHY.titleSmall,
    color: COLORS.onSurface,
    fontWeight: '700',
  },
  featureDesc: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.onSurfaceVariant,
    marginTop: 1,
  },
  playBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: RADIUS.xl,
    paddingVertical: 14,
    gap: SPACING.sm,
    ...ELEVATION.level3,
  },
  playBtnText: {
    ...TYPOGRAPHY.titleMedium,
    color: '#fff',
    fontWeight: '800',
  },
  footnote: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.onSurfaceVariant,
    textAlign: 'center',
    marginTop: SPACING.md,
  },
});
