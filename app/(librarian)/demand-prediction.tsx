import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, StatusBar, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAnalytics } from '../../src/hooks/library/useAnalytics';
import { useTranslation } from 'react-i18next';
import { LinearGradient } from 'expo-linear-gradient';

export default function DemandPrediction() {
  const router = useRouter();
  const { t } = useTranslation();
  const { getPredictedDemand } = useAnalytics();
  const { data, isLoading, refetch, isRefetching } = getPredictedDemand();

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.title}>{t('analytics.demand_forecast')}</Text>
      </View>

      <ScrollView 
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#3A75F2" />
        }
      >
        <LinearGradient
          colors={['#1A2138', '#0F121D']}
          style={styles.heroCard}
        >
          <View style={styles.heroInfo}>
            <Text style={styles.heroTitle}>{t('analytics.overview')}</Text>
            <Text style={styles.heroDesc}>
              {t('analytics.demand_analysis_desc', { count: data?.predictions?.length || 0 })}
            </Text>
          </View>
          <View style={styles.aiBadge}>
            <Ionicons name="hardware-chip-outline" size={24} color="#3A75F2" />
            <Text style={styles.aiBadgeText}>AI Active</Text>
          </View>
        </LinearGradient>

        <Text style={styles.sectionTitle}>🔥 {t('analytics.hot_titles')}</Text>
        {isLoading ? (
          <Text style={styles.loadingText}>{t('messages.loading_demand')}</Text>
        ) : (
          data?.predictions?.map((item: any, index: number) => (
            <View key={index} style={styles.itemCard}>
              <View style={styles.itemMain}>
                <View style={styles.rankContainer}>
                  <Text style={styles.rankText}>#{index + 1}</Text>
                </View>
                <View style={styles.itemInfo}>
                  <Text style={styles.itemTitle} numberOfLines={1}>{item.title}</Text>
                  <Text style={styles.itemMeta}>{item.category}</Text>
                </View>
              </View>
              <View style={styles.statsContainer}>
                <View style={styles.statBox}>
                  <Text style={styles.statLabel}>{t('analytics.velocity')}</Text>
                  <Text style={[styles.statValue, { color: '#10B981' }]}>+{item.recentBorrows}</Text>
                </View>
                <View style={styles.statBox}>
                  <Text style={styles.statLabel}>{t('common.total_borrows')}</Text>
                  <Text style={styles.statValue}>{item.borrows}</Text>
                </View>
              </View>
            </View>
          ))
        )}

        <Text style={[styles.sectionTitle, { marginTop: 20 }]}>📊 {t('analytics.genre_trends')}</Text>
        <View style={styles.categoryContainer}>
          {data?.trendingCategories?.map((cat: any, index: number) => (
            <View key={index} style={styles.categoryChip}>
              <Text style={styles.categoryName}>{cat.name}</Text>
              <View style={styles.categoryCount}>
                <Text style={styles.categoryCountText}>{cat.count}</Text>
              </View>
            </View>
          ))}
        </View>

        <Text style={[styles.sectionTitle, { marginTop: 24 }]}>🛒 {t('analytics.purchase_suggestions')}</Text>
        <View style={styles.purchaseContainer}>
          {data?.recommendations?.length > 0 ? (
            data.recommendations.map((rec: any, index: number) => (
              <View key={index} style={styles.purchaseCard}>
                <View style={styles.purchaseHeader}>
                  <View style={styles.confidenceBadge}>
                    <Text style={styles.confidenceText}>
                      {Math.round(rec.confidence_score * 100)}% Match
                    </Text>
                  </View>
                  <Text style={styles.purchaseType}>{rec.type}</Text>
                </View>
                <Text style={styles.purchaseTitle}>{rec.suggestion_text}</Text>
                <View style={styles.purchaseFooter}>
                  <Text style={styles.purchaseReason}>
                    Based on {rec.metadata?.borrow_velocity || 'High'} demand
                  </Text>
                  <TouchableOpacity style={styles.orderBtn}>
                    <Text style={styles.orderBtnText}>{t('common.add_to_order')}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          ) : (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyCardText}>{t('messages.no_suggestions')}</Text>
            </View>
          )}
        </View>

        <View style={styles.footerInfo}>
          <Ionicons name="information-circle-outline" size={16} color="#5A5F7A" />
          <Text style={styles.footerText}>
            {t('analytics.ai_disclaimer')}
          </Text>
        </View>
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F121D' },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#1F263B'
  },
  backBtn: { marginRight: 16 },
  title: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold' },
  content: { flex: 1, padding: 20 },
  heroCard: {
    padding: 24,
    borderRadius: 20,
    marginBottom: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1F263B'
  },
  heroInfo: { flex: 1, marginRight: 16 },
  heroTitle: { color: '#FFFFFF', fontSize: 20, fontWeight: 'bold', marginBottom: 8 },
  heroDesc: { color: '#8A8F9E', fontSize: 14, lineHeight: 20 },
  aiBadge: { 
    alignItems: 'center', 
    backgroundColor: 'rgba(58, 117, 242, 0.1)', 
    padding: 12, 
    borderRadius: 16 
  },
  aiBadgeText: { color: '#3A75F2', fontSize: 12, fontWeight: 'bold', marginTop: 4 },
  sectionTitle: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold', marginBottom: 16 },
  loadingText: { color: '#5A5F7A', textAlign: 'center', marginTop: 20 },
  itemCard: {
    backgroundColor: '#171B2B',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#1F263B',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  itemMain: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  rankContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#0F121D',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12
  },
  rankText: { color: '#3A75F2', fontWeight: 'bold', fontSize: 13 },
  itemInfo: { flex: 1 },
  itemTitle: { color: '#FFFFFF', fontSize: 15, fontWeight: 'bold', marginBottom: 2 },
  itemMeta: { color: '#5A5F7A', fontSize: 12 },
  statsContainer: { flexDirection: 'row', gap: 16 },
  statBox: { alignItems: 'flex-end' },
  statLabel: { color: '#5A5F7A', fontSize: 10, marginBottom: 2 },
  statValue: { color: '#FFFFFF', fontSize: 14, fontWeight: 'bold' },
  categoryContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#171B2B',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#1F263B'
  },
  categoryName: { color: '#FFFFFF', fontSize: 13, marginRight: 8 },
  categoryCount: {
    backgroundColor: '#3A75F2',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6
  },
  categoryCountText: { color: '#FFFFFF', fontSize: 10, fontWeight: 'bold' },
  purchaseContainer: { gap: 12 },
  purchaseCard: {
    backgroundColor: '#171B2B',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1F263B'
  },
  purchaseHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  confidenceBadge: { backgroundColor: 'rgba(16, 185, 129, 0.1)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  confidenceText: { color: '#10B981', fontSize: 10, fontWeight: 'bold' },
  purchaseType: { color: '#5A5F7A', fontSize: 10, fontWeight: 'bold', textTransform: 'uppercase' },
  purchaseTitle: { color: '#FFFFFF', fontSize: 15, fontWeight: '600', marginBottom: 12 },
  purchaseFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  purchaseReason: { color: '#5A5F7A', fontSize: 12 },
  orderBtn: { backgroundColor: '#3A75F2', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  orderBtnText: { color: '#FFFFFF', fontSize: 12, fontWeight: 'bold' },
  emptyCard: { padding: 20, alignItems: 'center', backgroundColor: '#171B2B', borderRadius: 16, borderStyle: 'dashed', borderWidth: 1, borderColor: '#1F263B' },
  emptyCardText: { color: '#5A5F7A', fontSize: 14 },
  footerInfo: { 
    flexDirection: 'row', 
    marginTop: 32, 
    padding: 16, 
    backgroundColor: 'rgba(58, 117, 242, 0.05)', 
    borderRadius: 12,
    alignItems: 'center'
  },
  footerText: { color: '#5A5F7A', fontSize: 12, marginLeft: 8, flex: 1, lineHeight: 18 }
});
