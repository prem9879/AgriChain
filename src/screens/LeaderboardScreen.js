/**
 * [F8] Village Champions Leaderboard Screen
 * District leaderboard with badges and personal score
 * Material Design 3
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  StatusBar, RefreshControl, ActivityIndicator,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, ELEVATION, RADIUS, SPACING, TYPOGRAPHY } from '../theme/colors';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

const BASE_URL = 'http://10.203.179.61:8000';

const BADGE_MAP = {
  '🏆': { label: 'Champion', color: '#FFD600' },
  '⭐': { label: 'Star', color: '#FF9800' },
  '🌾': { label: 'Rising', color: '#4CAF50' },
  '🌱': { label: 'Active', color: '#66BB6A' },
  '👋': { label: 'New', color: '#90A4AE' },
};

const MOCK_LEADERBOARD = [
  { rank: 1, user_name: 'Sharad Patil', total_score: 92, badge: '🏆', district: 'Nashik' },
  { rank: 2, user_name: 'Mangesh Jadhav', total_score: 85, badge: '⭐', district: 'Nashik' },
  { rank: 3, user_name: 'Sunita Kale', total_score: 78, badge: '⭐', district: 'Nashik' },
  { rank: 4, user_name: 'Ravi Shinde', total_score: 65, badge: '🌾', district: 'Nashik' },
  { rank: 5, user_name: 'Anita Pawar', total_score: 52, badge: '🌱', district: 'Nashik' },
];

export default function LeaderboardScreen({ navigation }) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [leaderboard, setLeaderboard] = useState([]);
  const [myScore, setMyScore] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState('leaderboard');

  const fetchData = useCallback(async () => {
    try {
      const district = user?.district || 'Nashik';
      const [lbResp, myResp] = await Promise.all([
        fetch(`${BASE_URL}/champions/leaderboard/${district}`),
        fetch(`${BASE_URL}/champions/my-score/${user?.id || 1}`),
      ]);
      const lbData = await lbResp.json();
      const myData = await myResp.json();
      setLeaderboard(lbData.leaderboard || []);
      setMyScore(myData);
    } catch (e) {
      setLeaderboard(MOCK_LEADERBOARD);
      setMyScore({ rank: 4, total_score: 65, badge: '🌾', yield_accuracy: 70, price_achievement: 60, app_contribution: 55 });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const onRefresh = () => { setRefreshing(true); fetchData(); };

  const medalColor = (rank) => {
    if (rank === 1) return '#FFD600';
    if (rank === 2) return '#B0BEC5';
    if (rank === 3) return '#CD7F32';
    return COLORS.onSurfaceVariant;
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#4A148C" />
      <View style={[styles.header, { backgroundColor: '#4A148C' }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: '#FFF' }]}>🏆 Village Champions</Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabRow}>
        {['leaderboard', 'my-score'].map(t => (
          <TouchableOpacity key={t} style={[styles.tabBtn, tab === t && styles.tabActive]}
            onPress={() => setTab(t)}>
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
              {t === 'leaderboard' ? '📊 Leaderboard' : '🎯 My Score'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 60 }} />
      ) : (
        <ScrollView style={{ flex: 1 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>

          {/* ── LEADERBOARD TAB ── */}
          {tab === 'leaderboard' && (
            <View style={{ padding: SPACING.md }}>
              {/* Top 3 podium */}
              <View style={styles.podiumRow}>
                {leaderboard.slice(0, 3).map((farmer, i) => {
                  const pos = [1, 0, 2][i]; // 2nd, 1st, 3rd display order
                  const item = leaderboard[pos];
                  if (!item) return null;
                  const isFirst = pos === 0;
                  return (
                    <View key={pos} style={[styles.podiumItem, isFirst && styles.podiumFirst]}>
                      <Text style={{ fontSize: isFirst ? 36 : 28 }}>
                        {pos === 0 ? '🥇' : pos === 1 ? '🥈' : '🥉'}
                      </Text>
                      <Text style={[styles.podiumName, isFirst && { fontWeight: '800' }]} numberOfLines={1}>
                        {item.user_name}
                      </Text>
                      <Text style={styles.podiumScore}>{item.total_score}</Text>
                      <Text style={{ fontSize: 20 }}>{item.badge}</Text>
                    </View>
                  );
                })}
              </View>

              {/* Rest of leaderboard */}
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Full Rankings</Text>
                {leaderboard.slice(3).map((farmer, i) => (
                  <View key={i + 3} style={styles.rankRow}>
                    <Text style={[styles.rankNum, { color: medalColor(farmer.rank) }]}>#{farmer.rank}</Text>
                    <Text style={styles.rankName}>{farmer.user_name}</Text>
                    <Text style={{ fontSize: 16 }}>{farmer.badge}</Text>
                    <Text style={styles.rankScore}>{farmer.total_score}</Text>
                  </View>
                ))}
                {leaderboard.length <= 3 && (
                  <Text style={styles.emptyText}>More farmers will appear as they participate!</Text>
                )}
              </View>

              {/* Badge legend */}
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Badge Levels</Text>
                {Object.entries(BADGE_MAP).map(([emoji, info]) => (
                  <View key={emoji} style={styles.badgeRow}>
                    <Text style={{ fontSize: 20 }}>{emoji}</Text>
                    <Text style={[styles.badgeLabel, { color: info.color }]}>{info.label}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* ── MY SCORE TAB ── */}
          {tab === 'my-score' && myScore && (
            <View style={{ padding: SPACING.md }}>
              <View style={[styles.card, { alignItems: 'center' }]}>
                <Text style={{ fontSize: 56 }}>{myScore.badge || '🌱'}</Text>
                <Text style={styles.myScoreValue}>{myScore.total_score || 0}</Text>
                <Text style={styles.myScoreLabel}>Total Score</Text>
                <Text style={styles.myRank}>District Rank: #{myScore.rank || '—'}</Text>
              </View>

              <View style={styles.card}>
                <Text style={styles.cardTitle}>Score Breakdown</Text>
                {[
                  { label: 'Yield Accuracy', value: myScore.yield_accuracy || 0, weight: '40%', icon: 'sprout', color: '#4CAF50' },
                  { label: 'Price Achievement', value: myScore.price_achievement || 0, weight: '40%', icon: 'currency-inr', color: '#FF9800' },
                  { label: 'App Contribution', value: myScore.app_contribution || 0, weight: '20%', icon: 'cellphone', color: '#2196F3' },
                ].map((comp, idx) => (
                  <View key={idx} style={styles.compRow}>
                    <MaterialCommunityIcons name={comp.icon} size={24} color={comp.color} />
                    <View style={{ flex: 1, marginLeft: SPACING.md }}>
                      <Text style={styles.compLabel}>{comp.label} ({comp.weight})</Text>
                      <View style={styles.barBg}>
                        <View style={[styles.barFill, { width: `${comp.value}%`, backgroundColor: comp.color }]} />
                      </View>
                    </View>
                    <Text style={styles.compValue}>{comp.value}</Text>
                  </View>
                ))}
              </View>

              <View style={styles.card}>
                <Text style={styles.cardTitle}>How to Improve</Text>
                {[
                  '🎯 Log more harvest data for better accuracy',
                  '📈 Follow market timing recommendations',
                  '📝 Share crop outcomes in community',
                  '🌾 Complete seasonal diary entries',
                ].map((tip, i) => (
                  <Text key={i} style={styles.tipItem}>{tip}</Text>
                ))}
              </View>
            </View>
          )}

          <View style={{ height: SPACING.xxl }} />
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    paddingTop: 48, paddingBottom: 16, paddingHorizontal: SPACING.lg,
    flexDirection: 'row', alignItems: 'center',
  },
  backBtn: { marginRight: SPACING.md },
  headerTitle: { ...TYPOGRAPHY.titleLarge, flex: 1 },
  tabRow: {
    flexDirection: 'row', backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.md, ...ELEVATION.level1,
  },
  tabBtn: { flex: 1, paddingVertical: SPACING.md, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive: { borderBottomColor: COLORS.primary },
  tabText: { ...TYPOGRAPHY.labelLarge, color: COLORS.onSurfaceVariant },
  tabTextActive: { color: COLORS.primary },
  card: {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: SPACING.lg,
    marginBottom: SPACING.md, ...ELEVATION.level2,
  },
  cardTitle: { ...TYPOGRAPHY.titleMedium, color: COLORS.onSurface, marginBottom: SPACING.md },
  podiumRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', marginBottom: SPACING.lg, gap: SPACING.sm },
  podiumItem: {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: SPACING.md,
    alignItems: 'center', flex: 1, ...ELEVATION.level2,
  },
  podiumFirst: { paddingVertical: SPACING.lg, transform: [{ translateY: -10 }] },
  podiumName: { ...TYPOGRAPHY.labelMedium, color: COLORS.onSurface, marginTop: 4, textAlign: 'center' },
  podiumScore: { ...TYPOGRAPHY.titleLarge, color: COLORS.primary, fontWeight: '700' },
  rankRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: SPACING.sm,
    borderBottomWidth: 1, borderBottomColor: COLORS.outlineVariant, gap: SPACING.md,
  },
  rankNum: { ...TYPOGRAPHY.titleMedium, width: 36, fontWeight: '700' },
  rankName: { ...TYPOGRAPHY.bodyLarge, color: COLORS.onSurface, flex: 1 },
  rankScore: { ...TYPOGRAPHY.titleMedium, color: COLORS.primary, fontWeight: '700' },
  emptyText: { ...TYPOGRAPHY.bodyMedium, color: COLORS.onSurfaceVariant, textAlign: 'center', paddingVertical: SPACING.lg },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, paddingVertical: SPACING.xs },
  badgeLabel: { ...TYPOGRAPHY.labelLarge, fontWeight: '700' },
  myScoreValue: { fontSize: 48, fontWeight: '800', color: COLORS.primary, marginTop: SPACING.sm },
  myScoreLabel: { ...TYPOGRAPHY.bodyLarge, color: COLORS.onSurfaceVariant },
  myRank: { ...TYPOGRAPHY.titleMedium, color: COLORS.tertiary, marginTop: SPACING.sm },
  compRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: SPACING.sm,
    borderBottomWidth: 1, borderBottomColor: COLORS.outlineVariant,
  },
  compLabel: { ...TYPOGRAPHY.labelMedium, color: COLORS.onSurfaceVariant },
  compValue: { ...TYPOGRAPHY.titleMedium, color: COLORS.onSurface, fontWeight: '700', marginLeft: SPACING.sm },
  barBg: { height: 6, backgroundColor: COLORS.surfaceContainerHigh, borderRadius: 3, marginTop: 4 },
  barFill: { height: 6, borderRadius: 3 },
  tipItem: { ...TYPOGRAPHY.bodyMedium, color: COLORS.onSurface, paddingVertical: SPACING.xs, lineHeight: 22 },
});
