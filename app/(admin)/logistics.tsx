import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, Dimensions, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../src/api/supabase';
import Svg, { Path, Circle, G, Text as SvgText } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';

const { width } = Dimensions.get('window');

interface BranchStat {
  branch_id: string;
  branch_name: string;
  latitude: number;
  longitude: number;
  total_borrows: number;
  active_users: number;
  top_category: string;
}

// High-fidelity Vietnam Path for visualization matching accurate geographic curve
const VIETNAM_PATH = "M140,55 L200,55 L242,170 L235,230 L230,290 L300,370 L325,400 L360,420 L410,535 L410,610 L280,680 L240,720 L195,790";

const PROVINCES_34 = [
  { id: 1, name: 'Tuyên Quang', d: 'M 180,30 L 215,20 L 210,45 L 180,70 Z', color: '#F9A8D4', textX: 195, textY: 45 },
  { id: 2, name: 'Cao Bằng', d: 'M 215,20 L 255,15 L 255,50 L 210,45 Z', color: '#D9F99D', textX: 235, textY: 35 },
  { id: 3, name: 'Lai Châu', d: 'M 115,35 L 145,35 L 140,75 L 105,65 Z', color: '#D1FAE5', textX: 125, textY: 52 },
  { id: 4, name: 'Lào Cai', d: 'M 145,35 L 180,30 L 170,70 L 140,75 Z', color: '#FEF08A', textX: 158, textY: 52 },
  { id: 5, name: 'Thái Nguyên', d: 'M 210,45 L 245,40 L 240,75 L 205,75 Z', color: '#D9F99D', textX: 225, textY: 60 },
  { id: 6, name: 'Điện Biên', d: 'M 105,65 L 140,75 L 130,120 L 95,105 Z', color: '#FBCFE8', textX: 118, textY: 90 },
  { id: 7, name: 'Lạng Sơn', d: 'M 245,40 L 285,35 L 280,85 L 240,75 Z', color: '#E9D5FF', textX: 262, textY: 60 },
  { id: 8, name: 'Sơn La', d: 'M 130,75 L 175,70 L 185,115 L 140,120 Z', color: '#FBCFE8', textX: 158, textY: 95 },
  { id: 9, name: 'Phú Thọ', d: 'M 175,70 L 205,75 L 195,110 L 165,105 Z', color: '#A5F3FC', textX: 185, textY: 90 },
  { id: 10, name: 'Bắc Ninh', d: 'M 205,75 L 240,75 L 235,100 L 210,100 Z', color: '#FEF08A', textX: 222, textY: 88 },
  { id: 11, name: 'Quảng Ninh', d: 'M 280,85 L 320,105 L 310,140 L 270,120 Z', color: '#A5F3FC', textX: 295, textY: 112 },
  { id: 12, name: 'Hà Nội', d: 'M 195,110 L 225,110 L 220,140 L 185,135 Z', color: '#FBCFE8', textX: 205, textY: 125 },
  { id: 13, name: 'TP. Hải Phòng', d: 'M 270,120 L 310,140 L 295,160 L 260,150 Z', color: '#FDE68A', textX: 285, textY: 142 },
  { id: 14, name: 'Hưng Yên', d: 'M 220,140 L 250,140 L 245,170 L 215,165 Z', color: '#FECACA', textX: 232, textY: 155 },
  { id: 15, name: 'Ninh Bình', d: 'M 185,135 L 215,135 L 210,165 L 180,160 Z', color: '#D9F99D', textX: 198, textY: 150 },
  { id: 16, name: 'Thanh Hóa', d: 'M 180,160 L 245,170 L 235,215 L 165,190 Z', color: '#FBCFE8', textX: 205, textY: 182 },
  { id: 17, name: 'Nghệ An', d: 'M 165,190 L 235,215 L 245,260 L 175,245 Z', color: '#D9F99D', textX: 205, textY: 230 },
  { id: 18, name: 'Hà Tĩnh', d: 'M 245,260 L 275,305 L 255,335 L 220,290 Z', color: '#FBCFE8', textX: 248, textY: 298 },
  { id: 19, name: 'Quảng Trị', d: 'M 275,305 L 320,355 L 300,385 L 255,335 Z', color: '#FDE68A', textX: 288, textY: 345 },
  { id: 20, name: 'TP. Huế', d: 'M 320,355 L 345,385 L 325,410 L 300,385 Z', color: '#E9D5FF', textX: 322, textY: 385 },
  { id: 21, name: 'TP. Đà Nẵng', d: 'M 345,385 L 375,415 L 355,440 L 325,410 Z', color: '#FEF08A', textX: 350, textY: 412 },
  { id: 22, name: 'Quảng Ngãi', d: 'M 375,415 L 405,455 L 385,480 L 355,440 Z', color: '#FBCFE8', textX: 380, textY: 448 },
  { id: 23, name: 'Gia Lai', d: 'M 355,440 L 385,480 L 415,530 L 375,540 Z', color: '#C7D2FE', textX: 382, textY: 498 },
  { id: 24, name: 'Đắk Lắk', d: 'M 375,540 L 415,530 L 410,585 L 360,575 Z', color: '#BBF7D0', textX: 390, textY: 558 },
  { id: 25, name: 'Khánh Hòa', d: 'M 415,530 L 425,585 L 395,615 L 375,540 Z', color: '#FFCFD2', textX: 402, textY: 568 },
  { id: 26, name: 'Lâm Đồng', d: 'M 360,575 L 410,585 L 395,615 L 335,610 Z', color: '#FFD6A5', textX: 375, textY: 595 },
  { id: 27, name: 'Đồng Nai', d: 'M 335,610 L 395,615 L 380,645 L 310,640 Z', color: '#FBCFE8', textX: 355, textY: 628 },
  { id: 28, name: 'Tây Ninh', d: 'M 310,640 L 350,645 L 330,680 L 285,675 Z', color: '#C7D2FE', textX: 318, textY: 660 },
  { id: 29, name: 'TP. Hồ Chí Minh', d: 'M 285,675 L 330,680 L 310,710 L 265,705 Z', color: '#FDE68A', textX: 298, textY: 692 },
  { id: 30, name: 'Đồng Tháp', d: 'M 265,705 L 310,710 L 295,735 L 250,730 Z', color: '#FBCFE8', textX: 280, textY: 720 },
  { id: 31, name: 'An Giang', d: 'M 250,730 L 295,735 L 275,765 L 230,760 Z', color: '#FEF08A', textX: 262, textY: 748 },
  { id: 32, name: 'Vĩnh Long', d: 'M 275,765 L 315,765 L 305,790 L 260,785 Z', color: '#FDE68A', textX: 290, textY: 775 },
  { id: 33, name: 'TP. Cần Thơ', d: 'M 260,785 L 305,790 L 285,820 L 240,815 Z', color: '#FFB7B2', textX: 272, textY: 802 },
  { id: 34, name: 'Cà Mau', d: 'M 240,815 L 285,820 L 265,860 L 220,855 Z', color: '#D1FAE5', textX: 252, textY: 838 },
];

export default function LogisticsScreen() {
  const { t } = useTranslation();
  const { data: stats, isLoading } = useQuery<BranchStat[]>({
    queryKey: ['branch_demand_stats'],
    queryFn: async () => {
      const { data, error } = await supabase.from('branch_demand_stats').select('*');
      if (error) throw error;
      return data || [];
    },
  });

  const getIntensityColor = (borrows: number) => {
    if (borrows > 50) return '#EF4444'; // Hot
    if (borrows > 20) return '#F59E0B'; // Warm
    return '#10B981'; // Cool
  };

  const mapCoords = (lat: number, lng: number) => {
    const x = (lng - 102.0) * 50 + 50;
    const y = (23.4 - lat) * 50 + 50;
    return { x, y };
  };

  const getBranchDisplayName = (name: string) => {
    if (!name) return '';
    const lower = name.toLowerCase();
    if (lower.includes('south') || lower.includes('miền nam') || lower.includes('hồ chí minh') || lower.includes('hcm')) {
      return t('admin.branch_south', 'South Branch - TP.HCM');
    }
    if (lower.includes('main') || lower.includes('chính') || lower.includes('hà nội') || lower.includes('hn')) {
      return t('admin.branch_main', 'Main Branch - Hà Nội');
    }
    return name;
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>{t('admin.logistics_title')}</Text>
          <Text style={styles.subtitle}>{t('admin.logistics_subtitle')}</Text>
        </View>

        {/* Visual Map Section */}
        <View style={styles.mapContainer}>
          <View style={styles.mapHeader}>
            <Ionicons name="map-outline" size={20} color="#4F8EF7" />
            <Text style={styles.mapTitle}>{t('admin.visual_map')}</Text>
          </View>
          
          <View style={styles.svgWrapper}>
            {isLoading ? (
              <ActivityIndicator size="large" color="#4F8EF7" />
            ) : (
              <Svg width={width - 40} height={420} viewBox="0 0 750 900">
                {/* Quốc hiệu / Country names nearby */}
                <SvgText x={350} y={35} fill="#5A5F7A" fontSize="11" fontWeight="600" letterSpacing={2}>{t('admin.china')}</SvgText>
                <SvgText x={50} y={400} fill="#5A5F7A" fontSize="11" fontWeight="600" letterSpacing={2}>{t('admin.laos')}</SvgText>
                <SvgText x={40} y={660} fill="#5A5F7A" fontSize="11" fontWeight="600" letterSpacing={2}>{t('admin.cambodia')}</SvgText>
                <SvgText x={420} y={480} fill="#3B466B" fontSize="12" fontWeight="600" letterSpacing={2}>{t('admin.east_sea')}</SvgText>

                {/* 34 đơn vị hành chính tỉnh / 34 Provincial units as individual filled shapes */}
                {PROVINCES_34.map((prov) => (
                  <G key={prov.id}>
                    <Path
                      d={prov.d}
                      fill={prov.color}
                      fillOpacity={0.7}
                      stroke="#2E3856"
                      strokeWidth="1.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    {/* Province Label/ID */}
                    <SvgText
                      x={prov.textX}
                      y={prov.textY}
                      fill="#1E2540"
                      fontSize="11"
                      fontWeight="bold"
                      textAnchor="middle"
                    >
                      {prov.id}
                    </SvgText>
                  </G>
                ))}

                {/* Đường luân phiên thon gọn (Slender Book rotation/logistics route) */}
                {/* Hanoi to HCM */}
                <Path
                  d="M 240,170 Q 380,425 280,680"
                  fill="none"
                  stroke="#4F8EF7"
                  strokeWidth="1.2"
                  strokeDasharray="5, 5"
                />
                {/* Minor route from Hanoi to Da Nang */}
                <Path
                  d="M 240,170 Q 280,280 350,420"
                  fill="none"
                  stroke="#10B981"
                  strokeWidth="1.0"
                  strokeDasharray="3, 3"
                />

                {/* Quần đảo Hoàng Sa */}
                <Circle cx={525} cy={395} r={8} fill="#1E2540" />
                <Circle cx={530} cy={390} r={5} fill="#4F8EF7" />
                <Circle cx={522} cy={398} r={4} fill="#4F8EF7" opacity={0.6} />
                <SvgText
                  x={545}
                  y={398}
                  fill="#E6F1FF"
                  fontSize="14"
                  fontWeight="bold"
                >
                  {t('admin.hoang_sa')}
                </SvgText>

                {/* Quần đảo Trường Sa */}
                <Circle cx={620} cy={740} r={12} fill="#1E2540" />
                <Circle cx={622} cy={735} r={6} fill="#4F8EF7" />
                <Circle cx={618} cy={745} r={4} fill="#4F8EF7" />
                <Circle cx={630} cy={742} r={5} fill="#4F8EF7" opacity={0.6} />
                <SvgText
                  x={645}
                  y={745}
                  fill="#E6F1FF"
                  fontSize="14"
                  fontWeight="bold"
                >
                  {t('admin.truong_sa')}
                </SvgText>
                
                {stats?.map((branch) => {
                  const { x, y } = mapCoords(branch.latitude, branch.longitude);
                  const color = getIntensityColor(branch.total_borrows);
                  
                  return (
                    <G key={branch.branch_id}>
                      {/* Pulse Effect */}
                      <Circle cx={x} cy={y} r="15" fill={color} opacity={0.2} />
                      <Circle cx={x} cy={y} r="8" fill={color} />
                      <SvgText
                        x={x + 12}
                        y={y + 4}
                        fill="#FFF"
                        fontSize="12"
                        fontWeight="bold"
                      >
                        {getBranchDisplayName(branch.branch_name)}
                      </SvgText>
                    </G>
                  );
                })}
              </Svg>
            )}
          </View>

          <View style={styles.legend}>
            <View style={styles.legendItem}>
              <View style={[styles.dot, { backgroundColor: '#EF4444' }]} />
              <Text style={styles.legendText}>{t('admin.demand_high')}</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.dot, { backgroundColor: '#F59E0B' }]} />
              <Text style={styles.legendText}>{t('admin.demand_medium')}</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.dot, { backgroundColor: '#10B981' }]} />
              <Text style={styles.legendText}>{t('admin.demand_low')}</Text>
            </View>
          </View>
        </View>

        {/* Heatmap Stats Cards */}
        <Text style={styles.sectionTitle}>{t('admin.area_details')}</Text>
        <View style={styles.statsGrid}>
          {stats?.map((branch) => (
            <View key={branch.branch_id} style={styles.statCard}>
              <LinearGradient
                colors={['#171B2B', '#111420']}
                style={styles.cardGradient}
              >
                <View style={styles.cardHeader}>
                  <Text style={styles.branchName}>{getBranchDisplayName(branch.branch_name)}</Text>
                  <View style={[styles.intensityBadge, { backgroundColor: getIntensityColor(branch.total_borrows) + '20' }]}>
                    <Text style={[styles.intensityText, { color: getIntensityColor(branch.total_borrows) }]}>
                      {branch.total_borrows > 50 ? t('admin.hot') : t('admin.stable')}
                    </Text>
                  </View>
                </View>

                <View style={styles.metricsRow}>
                  <View style={styles.metric}>
                    <Text style={styles.metricValue}>{branch.total_borrows}</Text>
                    <Text style={styles.metricLabel}>{t('admin.borrows_count')}</Text>
                  </View>
                  <View style={styles.metric}>
                    <Text style={styles.metricValue}>{branch.active_users}</Text>
                    <Text style={styles.metricLabel}>{t('common.members')}</Text>
                  </View>
                  <View style={styles.metric}>
                    <Text style={styles.metricValue}>{branch.top_category || 'N/A'}</Text>
                    <Text style={styles.metricLabel}>{t('admin.hot_genre')}</Text>
                  </View>
                </View>

                <View style={styles.categoryInfo}>
                  <Ionicons name="bookmark" size={14} color="#4F8EF7" />
                  <Text style={styles.categoryText}>{t('admin.trend')}: {branch.top_category || 'N/A'}</Text>
                </View>
              </LinearGradient>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B0F1A' },
  scrollContent: { padding: 20 },
  header: { marginBottom: 24 },
  title: { color: '#FFF', fontSize: 24, fontWeight: 'bold' },
  subtitle: { color: '#5A5F7A', fontSize: 14, marginTop: 4 },
  mapContainer: {
    backgroundColor: '#151929',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#1E2540',
    marginBottom: 24,
  },
  mapHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 20 },
  mapTitle: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  svgWrapper: { alignItems: 'center', justifyContent: 'center' },
  legend: { flexDirection: 'row', justifyContent: 'center', gap: 20, marginTop: 20 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { color: '#5A5F7A', fontSize: 12 },
  sectionTitle: { color: '#FFF', fontSize: 18, fontWeight: 'bold', marginBottom: 16 },
  statsGrid: { gap: 12 },
  statCard: { borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: '#1E2540' },
  cardGradient: { padding: 16 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  branchName: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  intensityBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  intensityText: { fontSize: 10, fontWeight: 'bold' },
  metricsRow: { flexDirection: 'row', gap: 24, marginBottom: 16 },
  metric: { gap: 4 },
  metricValue: { color: '#FFF', fontSize: 20, fontWeight: 'bold' },
  metricLabel: { color: '#5A5F7A', fontSize: 12 },
  categoryInfo: { flexDirection: 'row', alignItems: 'center', gap: 6, opacity: 0.8 },
  categoryText: { color: '#4F8EF7', fontSize: 13, fontWeight: '500' },
});
