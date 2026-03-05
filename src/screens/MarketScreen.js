import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Dimensions,
  FlatList,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { Appbar, Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LineChart } from 'react-native-chart-kit';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { COLORS, ELEVATION, RADIUS, SPACING, TYPOGRAPHY } from '../theme/colors';
import { useLanguage } from '../context/LanguageContext';
import {
  BEST_SELLING_PERIOD,
  CROP_EMOJIS,
  CROPS,
  DISTRICTS,
  getAllPricesForDistrict,
  getNeighborIntelligence,
} from '../data/marketData';
import { API_BASE_URL } from '../services/apiService';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CACHE_KEY = 'agrimitra_market_cache';
const CACHE_TTL = 30 * 60 * 1000;

export default function MarketScreen() {
  const { t } = useLanguage();
  const [selectedDistrict, setSelectedDistrict] = useState('Nashik');
  const [selectedCrop, setSelectedCrop] = useState(null);
  const [expandedCrop, setExpandedCrop] = useState(null);
  const [prices, setPrices] = useState([]);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [dataSource, setDataSource] = useState('local');

  const fetchFromApi = useCallback(async (district) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/market/prices`, {
        params: { district, state: 'Maharashtra' },
        timeout: 10000,
      });
      if (response.data?.prices) {
        return { data: response.data.prices, source: response.data.source || 'api' };
      }
      return null;
    } catch { return null; }
  }, []);

  const loadPrices = useCallback(async () => {
    const cacheRaw = await AsyncStorage.getItem(CACHE_KEY);
    if (cacheRaw) {
      const cached = JSON.parse(cacheRaw);
      if (cached.district === selectedDistrict && Date.now() - cached.timestamp < CACHE_TTL) {
        setPrices(cached.data); setLastUpdated(new Date(cached.timestamp)); setDataSource(cached.source || 'cache');
        return;
      }
    }
    const apiResult = await fetchFromApi(selectedDistrict);
    if (apiResult) {
      setPrices(apiResult.data); setLastUpdated(new Date()); setDataSource('api');
      await AsyncStorage.setItem(CACHE_KEY, JSON.stringify({ district: selectedDistrict, data: apiResult.data, timestamp: Date.now(), source: 'api' }));
      return;
    }
    const data = getAllPricesForDistrict(selectedDistrict);
    setPrices(data); setLastUpdated(new Date()); setDataSource('local');
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify({ district: selectedDistrict, data, timestamp: Date.now(), source: 'local' }));
  }, [selectedDistrict, fetchFromApi]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await AsyncStorage.removeItem(CACHE_KEY);
    await loadPrices();
    setIsRefreshing(false);
  }, [loadPrices]);

  useEffect(() => { loadPrices(); }, [loadPrices]);

  const filteredPrices = useMemo(() => {
    if (!selectedCrop) return prices;
    return prices.filter((p) => p.crop === selectedCrop);
  }, [prices, selectedCrop]);

  const neighborInfo = useMemo(() => {
    const crop = selectedCrop || expandedCrop || 'Onion';
    return getNeighborIntelligence(selectedDistrict, crop);
  }, [selectedDistrict, selectedCrop, expandedCrop]);

  const toggleExpand = (crop) => setExpandedCrop(expandedCrop === crop ? null : crop);

  const renderPriceCard = ({ item }) => {
    const isExpanded = expandedCrop === item.crop;
    const changeColor = item.change >= 0 ? COLORS.success : COLORS.error;
    const changeIcon = item.change >= 0 ? 'trending-up' : 'trending-down';
    const bestPeriod = BEST_SELLING_PERIOD[item.crop];
    const chartLabels = item.history ? item.history.filter((_, i) => i % 7 === 0 || i === item.history.length - 1).map((h) => h.dateLabel) : [];
    const chartData = item.history ? item.history.map((h) => h.price) : [];

    return (
      <TouchableOpacity activeOpacity={0.75} onPress={() => toggleExpand(item.crop)} style={styles.priceCard}>
        <View style={styles.priceCardRow}>
          <View style={styles.cropLabelCol}>
            <View style={styles.cropIconWrap}>
              <Text style={styles.cropEmoji}>{item.emoji}</Text>
            </View>
            <View>
              <Text style={styles.cropName}>{item.crop}</Text>
              <Text style={styles.mandiName}>{item.mandi}</Text>
            </View>
          </View>
          <View style={styles.priceCol}>
            <Text style={styles.priceValue}>₹{item.price}</Text>
            <View style={[styles.changePill, { backgroundColor: changeColor + '18' }]}>
              <MaterialCommunityIcons name={changeIcon} size={14} color={changeColor} />
              <Text style={[styles.priceChange, { color: changeColor }]}>
                ₹{Math.abs(item.change)}
              </Text>
            </View>
          </View>
        </View>

        {isExpanded && chartData.length > 0 ? (
          <View style={styles.chartSection}>
            <Text style={styles.chartTitle}>{t('market.chart30Day')}</Text>
            <LineChart
              data={{ labels: chartLabels, datasets: [{ data: chartData, strokeWidth: 2 }] }}
              width={SCREEN_WIDTH - 64} height={180}
              chartConfig={{
                backgroundColor: COLORS.surface, backgroundGradientFrom: COLORS.surface, backgroundGradientTo: COLORS.surface,
                decimalCount: 1,
                color: (opacity = 1) => `rgba(27, 94, 32, ${opacity})`,
                labelColor: () => COLORS.onSurfaceVariant,
                style: { borderRadius: RADIUS.md },
                fillShadowGradientFrom: COLORS.primary, fillShadowGradientTo: COLORS.surface,
                fillShadowGradientFromOpacity: 0.2, fillShadowGradientToOpacity: 0,
                propsForDots: { r: '3', strokeWidth: '1', stroke: COLORS.primary },
              }}
              bezier style={styles.chart} withVerticalLines={false}
            />
            {bestPeriod?.caption ? (
              <View style={styles.bestPeriodRow}>
                <View style={styles.bestPeriodBand} />
                <Text style={styles.bestPeriodText}>{bestPeriod.caption}</Text>
              </View>
            ) : null}
          </View>
        ) : null}
      </TouchableOpacity>
    );
  };

  const sourceLabel = dataSource === 'api' ? t('common.live') : dataSource === 'cache' ? t('common.cached') : t('common.offline');
  const sourceColor = dataSource === 'api' ? COLORS.success : dataSource === 'cache' ? COLORS.warning : COLORS.onSurfaceVariant;

  return (
    <View style={styles.screen}>
      <Appbar.Header style={styles.header}>
        <Appbar.Content title={t('market.header')} titleStyle={styles.headerTitle} />
      </Appbar.Header>

      {lastUpdated ? (
        <View style={styles.updateRow}>
          <Text style={styles.updateText}>
            {t('common.lastUpdated')}: {lastUpdated.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
          </Text>
          <View style={[styles.sourceBadge, { backgroundColor: sourceColor + '18' }]}>
            <View style={[styles.sourceDot, { backgroundColor: sourceColor }]} />
            <Text style={[styles.sourceText, { color: sourceColor }]}>{sourceLabel}</Text>
          </View>
        </View>
      ) : null}

      {/* District filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll} contentContainerStyle={styles.filterContent}>
        {DISTRICTS.map((d) => (
          <TouchableOpacity key={d} style={[styles.filterPill, selectedDistrict === d && styles.filterPillActive]} onPress={() => setSelectedDistrict(d)}>
            <Text style={[styles.filterPillText, selectedDistrict === d && styles.filterPillTextActive]}>{d}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Crop filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll} contentContainerStyle={styles.filterContent}>
        <TouchableOpacity style={[styles.filterPill, !selectedCrop && styles.filterPillActive]} onPress={() => setSelectedCrop(null)}>
          <Text style={[styles.filterPillText, !selectedCrop && styles.filterPillTextActive]}>{t('common.all')}</Text>
        </TouchableOpacity>
        {CROPS.map((c) => (
          <TouchableOpacity key={c} style={[styles.filterPill, selectedCrop === c && styles.filterPillActive]} onPress={() => setSelectedCrop(c)}>
            <Text style={[styles.filterPillText, selectedCrop === c && styles.filterPillTextActive]}>{c}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <FlatList
        data={filteredPrices}
        keyExtractor={(item) => item.crop}
        renderItem={renderPriceCard}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} colors={[COLORS.primary]} />}
        ListFooterComponent={
          neighborInfo ? (
            <View style={styles.neighborCard}>
              <View style={styles.neighborHeader}>
                <MaterialCommunityIcons name="account-group-outline" size={22} color={COLORS.primary} />
                <Text style={styles.neighborTitle}>{t('market.neighborTitle')}</Text>
              </View>
              <Text style={styles.neighborCount}>
                {t('market.neighborMsg', { count: neighborInfo.farmerCount, district: neighborInfo.district, crop: neighborInfo.crop })}
              </Text>
              <View style={[styles.neighborAlert, { borderColor: neighborInfo.color + '40', backgroundColor: neighborInfo.color + '0A' }]}>
                <Text style={[styles.neighborMessage, { color: neighborInfo.color }]}>{neighborInfo.message}</Text>
                <Text style={styles.neighborSuggestion}>{neighborInfo.suggestion}</Text>
              </View>
            </View>
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.background },
  header: { backgroundColor: COLORS.surface, elevation: 0, borderBottomWidth: 1, borderBottomColor: COLORS.outlineVariant },
  headerTitle: { ...TYPOGRAPHY.titleLarge, color: COLORS.onSurface, fontWeight: '700' },

  updateRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING.md, paddingVertical: SPACING.xs, backgroundColor: COLORS.surfaceVariant },
  updateText: { ...TYPOGRAPHY.labelSmall, color: COLORS.onSurfaceVariant },
  sourceBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.sm, paddingVertical: 2, borderRadius: RADIUS.full, gap: 4 },
  sourceDot: { width: 6, height: 6, borderRadius: 3 },
  sourceText: { ...TYPOGRAPHY.labelSmall, fontWeight: '700' },

  filterScroll: { flexGrow: 0 },
  filterContent: { paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, columnGap: SPACING.sm },
  filterPill: { paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, borderRadius: RADIUS.full, backgroundColor: COLORS.surfaceVariant },
  filterPillActive: { backgroundColor: COLORS.primary },
  filterPillText: { ...TYPOGRAPHY.labelMedium, color: COLORS.onSurfaceVariant },
  filterPillTextActive: { color: COLORS.onPrimary },

  listContent: { paddingHorizontal: SPACING.md, paddingTop: SPACING.xs, paddingBottom: SPACING.xl, rowGap: SPACING.sm },
  priceCard: { backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: SPACING.md, ...ELEVATION.level1 },
  priceCardRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cropLabelCol: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, flex: 1 },
  cropIconWrap: { width: 44, height: 44, borderRadius: RADIUS.md, backgroundColor: COLORS.surfaceVariant, justifyContent: 'center', alignItems: 'center' },
  cropEmoji: { fontSize: 22 },
  cropName: { ...TYPOGRAPHY.titleSmall, color: COLORS.onSurface, fontWeight: '700' },
  mandiName: { ...TYPOGRAPHY.labelSmall, color: COLORS.onSurfaceVariant, marginTop: 1 },
  priceCol: { alignItems: 'flex-end' },
  priceValue: { ...TYPOGRAPHY.titleMedium, color: COLORS.onSurface, fontWeight: '800' },
  changePill: { flexDirection: 'row', alignItems: 'center', gap: 2, paddingHorizontal: SPACING.sm, paddingVertical: 2, borderRadius: RADIUS.full, marginTop: 2 },
  priceChange: { ...TYPOGRAPHY.labelSmall, fontWeight: '700' },

  chartSection: { marginTop: SPACING.md, borderTopWidth: 1, borderTopColor: COLORS.outlineVariant, paddingTop: SPACING.sm },
  chartTitle: { ...TYPOGRAPHY.titleSmall, color: COLORS.onSurface, fontWeight: '700', marginBottom: SPACING.sm },
  chart: { borderRadius: RADIUS.md, alignSelf: 'center' },
  bestPeriodRow: { flexDirection: 'row', alignItems: 'center', marginTop: SPACING.sm, columnGap: SPACING.sm },
  bestPeriodBand: { width: 20, height: 10, backgroundColor: '#FFEE5820', borderWidth: 1, borderColor: '#FFD600', borderRadius: 3 },
  bestPeriodText: { flex: 1, ...TYPOGRAPHY.labelSmall, color: '#7A6B00', fontWeight: '600' },

  neighborCard: { backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: SPACING.md, marginTop: SPACING.sm, ...ELEVATION.level1 },
  neighborHeader: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: SPACING.sm },
  neighborTitle: { ...TYPOGRAPHY.titleMedium, color: COLORS.onSurface, fontWeight: '700' },
  neighborCount: { ...TYPOGRAPHY.bodyMedium, color: COLORS.onSurfaceVariant, lineHeight: 22 },
  neighborAlert: { borderRadius: RADIUS.md, padding: SPACING.md, borderWidth: 1, marginTop: SPACING.sm },
  neighborMessage: { ...TYPOGRAPHY.bodyMedium, fontWeight: '700', lineHeight: 22 },
  neighborSuggestion: { ...TYPOGRAPHY.bodySmall, color: COLORS.onSurfaceVariant, marginTop: SPACING.xs },
});
