import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { supabase } from '../../src/api/supabase';
import { useAuthStore } from '../../src/store/useAuthStore';

const { width } = Dimensions.get('window');

interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  earned_at?: string;
}

export default function AchievementsScreen() {
  const router = useRouter();
  const { profile } = useAuthStore();
  const [allBadges, setAllBadges] = useState<Badge[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile?.id) {
      loadBadges();
    }
  }, [profile?.id]);

  const loadBadges = async () => {
    try {
      // 1. Fetch all badges
      const { data: badgesData, error: badgesError } = await supabase
        .from('badges')
        .select('*');
      
      if (badgesError) throw badgesError;

      // 2. Fetch earned badges for this user
      const { data: userBadgesData, error: userBadgesError } = await supabase
        .from('user_badges')
        .select('badge_id, earned_at')
        .eq('user_id', profile?.id);

      if (userBadgesError) throw userBadgesError;

      // 3. Merge data
      const mergedBadges = (badgesData as any[]).map(b => {
        const earned = (userBadgesData as any[])?.find(ub => ub.badge_id === b.id);
        return {
          ...b,
          earned_at: earned?.earned_at
        };
      });

      setAllBadges(mergedBadges as Badge[]);
    } catch (err) {
      console.error('Error loading badges:', err);
    } finally {
      setLoading(false);
    }
  };

  const renderBadge = ({ item, index }: { item: Badge; index: number }) => {
    const isEarned = !!item.earned_at;
    
    return (
      <View style={[styles.badgeCard, !isEarned && styles.lockedBadge]}>
        <View style={[styles.iconContainer, { backgroundColor: isEarned ? '#3A75F220' : '#1E2540' }]}>
          <Ionicons 
            name={item.icon as any} 
            size={32} 
            color={isEarned ? '#3A75F2' : '#5A6376'} 
          />
          {!isEarned && (
            <View style={styles.lockOverlay}>
              <Ionicons name="lock-closed" size={14} color="#5A6376" />
            </View>
          )}
        </View>
        <Text style={[styles.badgeName, !isEarned && styles.lockedText]}>{item.name}</Text>
        <Text style={styles.badgeDesc} numberOfLines={2}>{item.description}</Text>
        {isEarned && (
          <View style={styles.earnedTag}>
            <Ionicons name="checkmark-circle" size={12} color="#10B981" />
            <Text style={styles.earnedText}>Đã đạt</Text>
          </View>
        )}
      </View>
    );
  };

  const earnedCount = allBadges.filter(b => b.earned_at).length;

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#0B0F1A', '#171B2B']} style={StyleSheet.absoluteFill} />
      
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Huy hiệu & Thành tựu</Text>
        <View style={{ width: 44 }} />
      </View>

      <View style={styles.summarySection}>
        <BlurView intensity={20} tint="dark" style={styles.summaryCard}>
          <View style={styles.summaryInfo}>
            <Text style={styles.summaryLabel}>Tiến trình thành tựu</Text>
            <Text style={styles.summaryValue}>{earnedCount}/{allBadges.length}</Text>
          </View>
          <View style={styles.progressBarBg}>
            <View 
              style={[
                styles.progressBarFill, 
                { width: `${(earnedCount / (allBadges.length || 1)) * 100}%` }
              ]} 
            />
          </View>
        </BlurView>
      </View>

      <FlatList
        data={allBadges}
        renderItem={renderBadge}
        keyExtractor={item => item.id}
        numColumns={2}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          loading ? null : (
            <Text style={styles.emptyText}>Đang cập nhật hệ thống huy hiệu...</Text>
          )
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B0F1A' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#1E2540',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  summarySection: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  summaryCard: {
    padding: 20,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
  },
  summaryInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 12,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#94A3B8',
    fontWeight: '600',
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: '800',
    color: '#3A75F2',
  },
  progressBarBg: {
    height: 8,
    backgroundColor: '#1E2540',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#3A75F2',
    borderRadius: 4,
  },
  listContent: {
    paddingHorizontal: 12,
    paddingBottom: 40,
  },
  badgeCard: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.03)',
    margin: 8,
    borderRadius: 20,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  lockedBadge: {
    opacity: 0.6,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  lockOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#1E2540',
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#0B0F1A',
  },
  badgeName: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 4,
  },
  lockedText: {
    color: '#5A6376',
  },
  badgeDesc: {
    color: '#94A3B8',
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 16,
  },
  earnedTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 10,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  earnedText: {
    color: '#10B981',
    fontSize: 10,
    fontWeight: '700',
  },
  emptyText: {
    color: '#5A6376',
    textAlign: 'center',
    marginTop: 100,
  }
});
