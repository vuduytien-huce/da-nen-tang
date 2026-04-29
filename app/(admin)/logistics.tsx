import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, Dimensions, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../src/api/supabase';
import Svg, { Path, Circle, G, Text as SvgText } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';

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

// Simplified Vietnam Path for visualization
const VIETNAM_PATH = "M150,50 L160,60 L155,80 L165,100 L160,120 L170,140 L165,160 L180,180 L175,200 L190,220 L185,240 L200,260 L195,280 L210,300 L205,320 L220,340 L215,360 L230,380 L225,400 L240,420 L235,440 L250,460 L245,480 L260,500 L255,520 L270,540 L265,560 L280,580 L275,600 L290,620 L285,640 L300,660 L295,680 L310,700 L305,720 L320,740 L315,760 L330,780 L325,800";

export default function LogisticsScreen() {
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

  // Map coordinates to SVG space (very simplified projection)
  const mapCoords = (lat: number, lng: number) => {
    // Vietnam lat range: ~8 to ~23
    // Vietnam lng range: ~102 to ~109
    const x = (lng - 102) * 40 + 50;
    const y = (23 - lat) * 40 + 50;
    return { x, y };
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>Logistics & Analytics</Text>
          <Text style={styles.subtitle}>Phân tích nhu cầu và điều phối mạng lưới chi nhánh</Text>
        </View>

        {/* Visual Map Section */}
        <View style={styles.mapContainer}>
          <View style={styles.mapHeader}>
            <Ionicons name="map-outline" size={20} color="#4F8EF7" />
            <Text style={styles.mapTitle}>Bản đồ trực quan chi nhánh</Text>
          </View>
          
          <View style={styles.svgWrapper}>
            {isLoading ? (
              <ActivityIndicator size="large" color="#4F8EF7" />
            ) : (
              <Svg width={width - 40} height={400} viewBox="0 0 400 800">
                <Path
                  d={VIETNAM_PATH}
                  fill="none"
                  stroke="#1E2540"
                  strokeWidth="30"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <Path
                  d={VIETNAM_PATH}
                  fill="none"
                  stroke="#151929"
                  strokeWidth="20"
                  strokeLinecap="round"
                />
                
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
                        {branch.branch_name}
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
              <Text style={styles.legendText}>Nhu cầu cao</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.dot, { backgroundColor: '#F59E0B' }]} />
              <Text style={styles.legendText}>Trung bình</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.dot, { backgroundColor: '#10B981' }]} />
              <Text style={styles.legendText}>Thấp</Text>
            </View>
          </View>
        </View>

        {/* Heatmap Stats Cards */}
        <Text style={styles.sectionTitle}>Chi tiết khu vực</Text>
        <View style={styles.statsGrid}>
          {stats?.map((branch) => (
            <View key={branch.branch_id} style={styles.statCard}>
              <LinearGradient
                colors={['#171B2B', '#111420']}
                style={styles.cardGradient}
              >
                <View style={styles.cardHeader}>
                  <Text style={styles.branchName}>{branch.branch_name}</Text>
                  <View style={[styles.intensityBadge, { backgroundColor: getIntensityColor(branch.total_borrows) + '20' }]}>
                    <Text style={[styles.intensityText, { color: getIntensityColor(branch.total_borrows) }]}>
                      {branch.total_borrows > 50 ? 'HOT' : 'STABLE'}
                    </Text>
                  </View>
                </View>

                <View style={styles.metricsRow}>
                  <View style={styles.metric}>
                    <Text style={styles.metricValue}>{branch.total_borrows}</Text>
                    <Text style={styles.metricLabel}>Lượt mượn</Text>
                  </View>
                  <View style={styles.metric}>
                    <Text style={styles.metricValue}>{branch.active_users}</Text>
                    <Text style={styles.metricLabel}>Thành viên</Text>
                  </View>
                  <View style={styles.metric}>
                    <Text style={styles.metricValue}>{branch.top_category || 'N/A'}</Text>
                    <Text style={styles.metricLabel}>Thể loại HOT</Text>
                  </View>
                </View>

                <View style={styles.categoryInfo}>
                  <Ionicons name="bookmark" size={14} color="#4F8EF7" />
                  <Text style={styles.categoryText}>Xu hướng: {branch.top_category || 'N/A'}</Text>
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
