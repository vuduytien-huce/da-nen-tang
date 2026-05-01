import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Image, 
  Dimensions, 
  SafeAreaView, 
  StatusBar,
  ActivityIndicator,
  Alert,
  TextInput,
  Modal,
  Share
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { LinearGradient } from 'expo-linear-gradient';
import ViewShot, { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { PieChart, LineChart } from 'react-native-chart-kit';
import QRCode from 'react-native-qrcode-svg';
import { useAuthStore } from '../../src/store/useAuthStore';
import { useLibrary } from '../../src/hooks/useLibrary';
import { supabase } from '../../src/api/supabase';
import { decode } from 'base64-arraybuffer';
import { OfflineCard } from '../../src/features/members/components/OfflineCard';
import { DigitalMembershipPass } from '../../src/features/members/components/DigitalMembershipPass';
import { LanguageMenuToggle } from '../../src/components/LanguageSwitcher';

const { width } = Dimensions.get('window');

export default function ProfileScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const profile = useAuthStore((state) => state.profile);
  const logout = useAuthStore((state) => state.logout);
  const updateProfile = useAuthStore((state) => state.updateProfile);
  
  const { borrows, books, gamification } = useLibrary();
  const { data: myBorrows, isLoading: loadingBorrows } = borrows.list();
  const { data: allBooks } = books.list();
  const { data: allBadges } = gamification.getBadges();
  const { data: myBadges } = gamification.getMyBadges();
  
  const [isOfflineCardVisible, setIsOfflineCardVisible] = useState(false);

  const viewShotRef = React.useRef<ViewShot>(null);

  const handleShareCard = async () => {
    try {
      const uri = await captureRef(viewShotRef, {
        format: 'png',
        quality: 0.8,
      });

      if (!(await Sharing.isAvailableAsync())) {
        Alert.alert('Lỗi', 'Chia sẻ không khả dụng trên thiết bị này');
        return;
      }

      await Sharing.shareAsync(uri, {
        mimeType: 'image/png',
        dialogTitle: 'Chia sẻ thẻ thành viên BiblioTech',
        UTI: 'public.png',
      });
    } catch (error) {
      console.error('Sharing error:', error);
      Alert.alert('Lỗi', 'Không thể tạo ảnh chia sẻ');
    }
  };

  // Extract unique categories from all books
  const allCategories = Array.from(new Set(allBooks?.map((b: any) => b.category).filter(Boolean))) as string[];

  // Statistics Calculation
  const totalBorrowed = myBorrows?.length || 0;
  const activeBorrows = myBorrows?.filter((b: any) => b.status === 'BORROWED').length || 0;
  const overdueCount = myBorrows?.filter((b: any) => b.status === 'BORROWED' && b.due_date && new Date(b.due_date) < new Date()).length || 0;
  const totalFines = myBorrows?.reduce((acc: number, r: any) => acc + (r.fine_amount || 0), 0) || 0;

  // Genre distribution for Pie Chart
  const genreStats = myBorrows?.reduce((acc: Record<string, number>, curr: any) => {
    const genre = curr.book?.category || 'Khác';
    acc[genre] = (acc[genre] || 0) + 1;
    return acc;
  }, {}) || {};

  const pieData = Object.entries(genreStats).map(([name, count], index) => ({
    name,
    count,
    color: ['#3A75F2', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'][index % 5],
    legendFontColor: '#8A8F9E',
    legendFontSize: 12,
  }));

  // Monthly activity for Line Chart (Last 6 months)
  const monthlyData = (() => {
    const counts = new Array(6).fill(0);
    const labels = [];
    const now = new Date();
    
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      labels.push(d.toLocaleString('vi-VN', { month: 'short' }));
      
      if (myBorrows) {
        counts[5 - i] = myBorrows.filter((b: any) => {
          const borrowDate = new Date(b.borrowed_at);
          return borrowDate.getMonth() === d.getMonth() && borrowDate.getFullYear() === d.getFullYear();
        }).length;
      }
    }
    
    return { labels, datasets: [{ data: counts }] };
  })();

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
      base64: true,
    });

    if (!result.canceled && result.assets[0].base64) {
      handleUpload(result.assets[0].base64, result.assets[0].uri);
    }
  };

  const handleUpload = async (base64: string, uri: string) => {
    if (!profile?.id) return;
    setUploading(true);
    try {
      const fileName = `${profile.id}_${Date.now()}.jpg`;
      const filePath = `avatars/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, decode(base64), {
          contentType: 'image/jpeg',
          upsert: true
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', profile.id);

      if (updateError) throw updateError;

      updateProfile({ avatarUrl: publicUrl } as any);
      Alert.alert('Thành công', 'Ảnh đại diện đã được cập nhật!');
    } catch (error: any) {
      Alert.alert('Lỗi', error.message || 'Không thể tải ảnh lên');
    } finally {
      setUploading(false);
    }
  };

  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [editBio, setEditBio] = useState('');
  const [editGenres, setEditGenres] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSaveProfile = async () => {
    if (!profile?.id) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ 
          bio: editBio,
          favorite_genres: editGenres
        })
        .eq('id', profile.id);

      if (error) throw error;

      updateProfile({ bio: editBio, favoriteGenres: editGenres });
      setIsEditModalVisible(false);
      Alert.alert('Thành công', 'Thông tin cá nhân đã được cập nhật!');
    } catch (error: any) {
      Alert.alert('Lỗi', error.message || 'Không thể cập nhật thông tin');
    } finally {
      setSaving(false);
    }
  };

  const chartConfig = {
    backgroundGradientFrom: "#171B2B",
    backgroundGradientTo: "#171B2B",
    color: (opacity = 1) => `rgba(58, 117, 242, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(138, 143, 158, ${opacity})`,
    strokeWidth: 2,
    decimalPlaces: 0,
    propsForLabels: {
      fontSize: 10,
    }
  };

  const genres = ['Văn học', 'Khoa học', 'Lịch sử', 'Công nghệ', 'Nghệ thuật', 'Kinh tế', 'Kỹ năng'];
  const [selectedGenres, setSelectedGenres] = useState<string[]>(profile?.favoriteGenres || []);

  const toggleGenre = async (genre: string) => {
    const newGenres = selectedGenres.includes(genre)
      ? selectedGenres.filter(g => g !== genre)
      : [...selectedGenres, genre];
    
    setSelectedGenres(newGenres);
    
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ favorite_genres: newGenres })
        .eq('id', profile?.id);
      
      if (error) throw error;
    } catch (e) {
      console.error('Error saving genres:', e);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        {/* Profile Header */}
        <LinearGradient colors={['#1E2540', '#0F121D']} style={styles.profileHeader} accessibilityRole="header">
          <View style={styles.headerTop}>
            <TouchableOpacity 
              style={styles.backBtn}
              onPress={() => router.back()}
              accessibilityRole="button"
              accessibilityLabel="Trở về"
            >
              <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
          <View style={styles.avatarContainer}>
            <Image 
              source={{ uri: profile?.avatarUrl || `https://ui-avatars.com/api/?name=${profile?.fullName || 'User'}&background=3A75F2&color=fff` }} 
              style={styles.avatar} 
              accessibilityRole="image"
              accessibilityLabel={`Ảnh đại diện của ${profile?.fullName}`}
            />
            <TouchableOpacity 
              style={styles.editAvatarBtn} 
              onPress={pickImage} 
              disabled={uploading}
              accessibilityRole="button"
              accessibilityLabel="Thay đổi ảnh đại diện"
            >
              {uploading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Ionicons name="camera" size={18} color="#FFFFFF" />
              )}
            </TouchableOpacity>
          </View>
          
          <Text style={styles.userName} accessibilityRole="header">{profile?.fullName || 'Người dùng'}</Text>
          {profile?.bio ? (
            <Text style={styles.userBio} numberOfLines={2}>{profile.bio}</Text>
          ) : (
            <Text style={[styles.userBio, { opacity: 0.5 }]}>Chưa có tiểu sử...</Text>
          )}

          {/* Level and XP Bar */}
          <View 
            style={styles.levelContainer}
            accessible={true}
            accessibilityLabel={`Cấp độ ${profile?.level || 1}, kinh nghiệm ${profile?.xp || 0} điểm`}
          >
            <View style={styles.levelBadge}>
              <Text style={styles.levelText}>CẤP {profile?.level || 1}</Text>
            </View>
            <View style={styles.xpBarContainer}>
              <View style={styles.xpBarBg}>
                <View 
                  style={[
                    styles.xpBarFill, 
                    { width: `${Math.min(((profile?.xp || 0) % 100), 100)}%` }
                  ]} 
                />
              </View>
              <Text style={styles.xpText}>{profile?.xp || 0} XP</Text>
            </View>
            <TouchableOpacity 
              style={styles.shareProfileBtn}
              onPress={() => {
                Share.share({
                  message: `Tôi vừa đạt Cấp ${profile?.level || 1} với ${profile?.xp || 0} XP tại BiblioTech! Độc giả số 1 là đây chứ đâu! 📚✨`,
                  title: 'Thành tích BiblioTech',
                });
              }}
              accessibilityRole="button"
              accessibilityLabel="Chia sẻ thành tích"
            >
              <Ionicons name="share-outline" size={18} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          <View style={styles.headerActions}>
            <View style={styles.roleBadge} accessibilityLabel={`Vai trò: ${profile?.role}`}>
              <Text style={styles.roleText}>{profile?.role}</Text>
            </View>
            <TouchableOpacity 
              style={styles.editBtn} 
              onPress={() => {
                setEditBio(profile?.bio || '');
                setEditGenres(profile?.favoriteGenres || []);
                setIsEditModalVisible(true);
              }}
              accessibilityRole="button"
              accessibilityLabel="Chỉnh sửa thông tin cá nhân"
            >
              <Ionicons name="pencil" size={14} color="#3A75F2" />
              <Text style={styles.editBtnText}>Sửa hồ sơ</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.userId} accessibilityLabel={`Mã người dùng: ${profile?.id}`}>ID: {profile?.id.substring(0, 8).toUpperCase()}</Text>
        </LinearGradient>

        {/* Favorite Genres Section */}
        {profile?.favoriteGenres && profile.favoriteGenres.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Sở thích của tôi</Text>
            <View style={styles.genreChips}>
              {profile.favoriteGenres.map((genre, idx) => (
                <View key={idx} style={styles.genreChip}>
                  <Text style={styles.genreChipText}>{genre}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Digital Membership Card Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('member.digital_pass')}</Text>
          
          <DigitalMembershipPass 
            member={{
              id: profile?.id || 'GUEST',
              fullName: profile?.fullName || 'Thành viên',
              level: profile?.level || 1,
              xp: profile?.xp || 0
            }} 
          />

          <View style={styles.walletActions}>
            <TouchableOpacity 
              style={[styles.walletBtn, { backgroundColor: '#000000' }]}
              onPress={() => Alert.alert('Apple Wallet', 'Đã thêm thẻ thành viên vào Apple Wallet của bạn!')}
            >
              <Ionicons name="logo-apple" size={18} color="#FFFFFF" />
              <Text style={styles.walletBtnText}>{t('member.add_to_wallet')} (Apple)</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.walletBtn, { backgroundColor: '#FFFFFF', borderColor: '#DADCE0', borderWidth: 1 }]}
              onPress={() => Alert.alert('Google Wallet', 'Đã thêm thẻ thành viên vào Google Wallet của bạn!')}
            >
              <Image 
                source={{ uri: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d7/Google_Wallet_Icon_2022.svg/1024px-Google_Wallet_Icon_2022.svg.png' }} 
                style={{ width: 18, height: 18, marginRight: 8 }}
              />
              <Text style={[styles.walletBtnText, { color: '#3C4043' }]}>{t('member.add_to_wallet')} (Google)</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.cardActions}>
            <TouchableOpacity 
              style={styles.shareCardBtn} 
              onPress={handleShareCard}
            >
              <Ionicons name="share-social" size={18} color="#3A75F2" />
              <Text style={styles.shareCardBtnText}>Chia sẻ thẻ</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.offlineAccessBtn}
              onPress={() => setIsOfflineCardVisible(true)}
              accessibilityRole="button"
              accessibilityLabel="Mở thẻ thành viên ngoại tuyến"
            >
              <Ionicons name="qr-code-outline" size={18} color="#FFFFFF" />
              <Text style={styles.offlineAccessText}>Thẻ ngoại tuyến</Text>
            </TouchableOpacity>
          </View>
        </View>

        <OfflineCard 
          visible={isOfflineCardVisible}
          onClose={() => setIsOfflineCardVisible(false)}
          profile={profile}
        />

        {/* Favorite Genres Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Thể loại yêu thích (Nhận thông báo sách mới)</Text>
          <View style={styles.genreGrid}>
            {genres.map((genre) => (
              <TouchableOpacity 
                key={genre}
                style={[
                  styles.genreChip, 
                  selectedGenres.includes(genre) && styles.activeGenreChip
                ]}
                onPress={() => toggleGenre(genre)}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: selectedGenres.includes(genre) }}
                accessibilityLabel={`Thể loại ${genre}`}
              >
                <Text style={[
                  styles.genreChipText,
                  selectedGenres.includes(genre) && styles.activeGenreChipText
                ]}>
                  {genre}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <View style={[styles.statItem, { backgroundColor: '#3A75F2' }]}>
            <Ionicons name="book" size={20} color="#FFFFFF" />
            <Text style={styles.statVal}>{totalBorrowed}</Text>
            <Text style={styles.statLab}>Tổng mượn</Text>
          </View>
          <View style={[styles.statItem, { backgroundColor: '#10B981' }]}>
            <Ionicons name="bookmark" size={20} color="#FFFFFF" />
            <Text style={styles.statVal}>{activeBorrows}</Text>
            <Text style={styles.statLab}>Đang mượn</Text>
          </View>
          <View style={[styles.statItem, { backgroundColor: '#F59E0B' }]}>
            <Ionicons name="alert-circle" size={20} color="#FFFFFF" />
            <Text style={styles.statVal}>{overdueCount}</Text>
            <Text style={styles.statLab}>Quá hạn</Text>
          </View>
          <View style={[styles.statItem, { backgroundColor: '#EF4444' }]}>
            <Ionicons name="wallet" size={20} color="#FFFFFF" />
            <Text style={styles.statVal}>{totalFines.toLocaleString()}đ</Text>
            <Text style={styles.statLab}>Tiền phạt</Text>
          </View>
        </View>

        {/* Achievement Badges Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Huy hiệu & Thành tích</Text>
            <Text style={styles.badgeCountText}>
              {myBadges?.length || 0}/{allBadges?.length || 0}
            </Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.badgeList}>
            {allBadges?.map((badge: any) => {
              const isEarned = myBadges?.some((mb: any) => mb.badge_id === badge.id);
              return (
                <TouchableOpacity 
                  key={badge.id} 
                  style={[styles.badgeItemCard, isEarned ? styles.activeBadgeCard : styles.inactiveBadgeCard]}
                  onPress={() => {
                    if (isEarned) {
                      Share.share({
                        message: `Tôi vừa đạt được huy hiệu "${badge.name}" tại BiblioTech! 🏆\n"${badge.description}"`,
                        title: 'Huy hiệu BiblioTech',
                      });
                    } else {
                      Alert.alert('Chưa đạt được', `Hoàn thành "${badge.description}" để nhận huy hiệu này!`);
                    }
                  }}
                  accessible={true}
                  accessibilityLabel={`Huy hiệu ${badge.name}: ${badge.description}. Trạng thái: ${isEarned ? 'Đã đạt' : 'Chưa đạt'}`}
                >
                  <View style={styles.badgeIconContainer}>
                    <View style={[styles.badgeIconCircle, { backgroundColor: isEarned ? 'rgba(245, 158, 11, 0.15)' : 'rgba(255,255,255,0.05)' }]}>
                      <Ionicons 
                        name={badge.icon as any || 'trophy'} 
                        size={28} 
                        color={isEarned ? '#F59E0B' : '#3D4260'} 
                      />
                    </View>
                    {isEarned && (
                      <View style={styles.shareBadgeBadge}>
                        <Ionicons name="share-social" size={10} color="white" />
                      </View>
                    )}
                  </View>
                  <Text style={[styles.badgeName, isEarned && styles.activeBadgeName]}>{badge.name}</Text>
                  <Text style={styles.badgeDesc} numberOfLines={2}>{badge.description}</Text>
                  {isEarned && (
                    <View style={styles.earnedCheck}>
                      <Ionicons name="checkmark-circle" size={14} color="#10B981" />
                      <Text style={styles.earnedText}>Đã đạt</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Analytics Entry Point */}
        <TouchableOpacity 
          style={styles.analyticsCard} 
          onPress={() => router.push('/(member)/analytics' as any)}
        >
          <LinearGradient 
            colors={['#3A75F2', '#1E40AF']} 
            start={{ x: 0, y: 0 }} 
            end={{ x: 1, y: 1 }}
            style={styles.analyticsGradient}
          >
            <View style={styles.analyticsInfo}>
              <Text style={styles.analyticsTitle}>Phân tích đọc sách</Text>
              <Text style={styles.analyticsDesc}>Xem xu hướng mượn sách, biểu đồ thể loại và nhật ký hoạt động của bạn</Text>
            </View>
            <View style={styles.analyticsIconBox}>
              <Ionicons name="bar-chart" size={24} color="#FFFFFF" />
            </View>
          </LinearGradient>
        </TouchableOpacity>

        {/* Actions Section */}
        <View style={styles.actionSection}>
          <TouchableOpacity 
            style={styles.actionItem} 
            onPress={() => router.push('/settings' as any)}
          >
            <View style={styles.actionIcon}>
              <Ionicons name="settings-outline" size={20} color="#3A75F2" />
            </View>
            <Text style={styles.actionLabel}>Cài đặt hệ thống</Text>
            <Ionicons name="chevron-forward" size={18} color="#5A5F7A" />
          </TouchableOpacity>

          <LanguageMenuToggle />

          <TouchableOpacity 
            style={styles.actionItem} 
            onPress={() => router.push('/(member)/history')}
          >
            <View style={[styles.actionIcon, { backgroundColor: 'rgba(16, 185, 129, 0.1)' }]}>
              <Ionicons name="time-outline" size={20} color="#10B981" />
            </View>
            <Text style={styles.actionLabel}>Lịch sử mượn trả</Text>
            <Ionicons name="chevron-forward" size={18} color="#5A5F7A" />
          </TouchableOpacity>

          <TouchableOpacity style={[styles.actionItem, { marginTop: 20 }]} onPress={logout}>
            <View style={[styles.actionIcon, { backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}>
              <Ionicons name="log-out-outline" size={20} color="#EF4444" />
            </View>
            <Text style={[styles.actionLabel, { color: '#EF4444' }]}>Đăng xuất</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>

      {/* Edit Profile Modal */}
      <Modal
        visible={isEditModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Chỉnh sửa hồ sơ</Text>
              <TouchableOpacity onPress={() => setIsEditModalVisible(false)}>
                <Ionicons name="close" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              <Text style={styles.inputLabel}>Tiểu sử (Bio)</Text>
              <TextInput
                style={styles.textArea}
                multiline
                numberOfLines={4}
                placeholder="Chia sẻ đôi điều về bản thân bạn..."
                placeholderTextColor="#5A5F7A"
                value={editBio}
                onChangeText={setEditBio}
              />

              <Text style={[styles.inputLabel, { marginTop: 20 }]}>Thể loại yêu thích</Text>
              <Text style={styles.inputSubLabel}>Chọn các thể loại bạn quan tâm để nhận gợi ý tốt hơn</Text>
              <View style={styles.genreSelector}>
                {allCategories.map((genre) => {
                  const isSelected = editGenres.includes(genre);
                  return (
                    <TouchableOpacity
                      key={genre}
                      style={[styles.genreOption, isSelected && styles.genreOptionSelected]}
                      onPress={() => {
                        if (isSelected) {
                          setEditGenres(editGenres.filter(g => g !== genre));
                        } else {
                          setEditGenres([...editGenres, genre]);
                        }
                      }}
                    >
                      <Text style={[styles.genreOptionText, isSelected && styles.genreOptionTextSelected]}>
                        {genre}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>

            <TouchableOpacity 
              style={styles.saveBtn} 
              onPress={handleSaveProfile}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.saveBtnText}>Lưu thay đổi</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F121D' },
  scrollContent: { paddingBottom: 40 },
  headerTop: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'flex-start',
    paddingHorizontal: 20,
    marginBottom: 10,
    marginTop: -10,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  profileHeader: {
    paddingTop: 40,
    paddingBottom: 30,
    alignItems: 'center',
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  avatarContainer: {
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 3,
    borderColor: '#3A75F2',
    padding: 3,
    marginBottom: 16,
    position: 'relative',
  },
  avatar: {
    width: '100%',
    height: '100%',
    borderRadius: 50,
    backgroundColor: '#171B2B',
  },
  editAvatarBtn: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#3A75F2',
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#0F121D',
  },
  userName: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  roleBadge: {
    backgroundColor: 'rgba(58, 117, 242, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    marginBottom: 8,
  },
  roleText: {
    color: '#3A75F2',
    fontSize: 12,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  userId: {
    color: '#5A5F7A',
    fontSize: 12,
  },
  userBio: {
    color: '#8A8F9E',
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 40,
    marginBottom: 12,
    lineHeight: 20,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(58, 117, 242, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  editBtnText: {
    color: '#3A75F2',
    fontSize: 12,
    fontWeight: '700',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 15,
    marginTop: 0,
    justifyContent: 'space-between',
  },
  statItem: {
    width: (width - 45) / 2,
    borderRadius: 18,
    padding: 16,
    marginBottom: 15,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  statVal: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 8,
  },
  statLab: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    marginTop: 2,
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 25,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  chartContainer: {
    backgroundColor: '#171B2B',
    borderRadius: 20,
    padding: 15,
    borderWidth: 1,
    borderColor: '#1F263B',
    alignItems: 'center',
  },
  chart: {
    borderRadius: 16,
    marginVertical: 8,
  },
  emptyChart: {
    height: 150,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    color: '#5A5F7A',
    fontSize: 14,
    marginTop: 10,
  },
  actionSection: {
    paddingHorizontal: 20,
    marginTop: 10,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#171B2B',
    padding: 14,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#1F263B',
  },
  actionIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(58, 117, 242, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 15,
  },
  actionLabel: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '500',
  },
  badgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  badgeItem: {
    width: (width - 60) / 3,
    backgroundColor: '#171B2B',
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1E2540',
  },
  activeBadge: {
    borderColor: 'rgba(245, 158, 11, 0.3)',
    backgroundColor: 'rgba(245, 158, 11, 0.05)',
  },
  inactiveBadge: {
    opacity: 0.6,
  },
  badgeLabel: {
    color: '#5A5F7A',
    fontSize: 10,
    fontWeight: '700',
    marginTop: 8,
    textAlign: 'center',
  },
  activeBadgeLabel: {
    color: '#FFFFFF',
  },
  digitalCard: {
    padding: 24,
    borderRadius: 24,
    height: 200,
    justifyContent: 'space-between',
    shadowColor: '#3A75F2',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  offlineAccessBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3A75F2',
    borderRadius: 12,
    paddingVertical: 12,
  },
  offlineAccessText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  cardBrand: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 2,
  },
  cardType: {
    color: '#3A75F2',
    fontSize: 10,
    fontWeight: '800',
    marginTop: 2,
  },
  levelContainer: {
    width: '100%',
    paddingHorizontal: 30,
    marginTop: 10,
    marginBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  levelBadge: {
    backgroundColor: '#3A75F2',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 10,
  },
  levelText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
  },
  xpBarContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  xpBarBg: {
    flex: 1,
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  xpBarFill: {
    height: '100%',
    backgroundColor: '#3A75F2',
    borderRadius: 3,
  },
  xpText: {
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: 'bold',
  },
  shareProfileBtn: {
    padding: 8,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 10,
    marginLeft: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  badgeCountText: {
    color: '#3A75F2',
    fontSize: 12,
    fontWeight: 'bold',
  },
  badgeList: {
    marginHorizontal: -20,
    paddingHorizontal: 20,
  },
  badgeItemCard: {
    width: 140,
    backgroundColor: '#171B2B',
    borderRadius: 20,
    padding: 16,
    marginRight: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1F263B',
  },
  activeBadgeCard: {
    borderColor: 'rgba(245, 158, 11, 0.3)',
    backgroundColor: '#1C2031',
  },
  inactiveBadgeCard: {
    opacity: 0.6,
  },
  badgeIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  badgeName: {
    color: '#8A8F9E',
    fontSize: 13,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 6,
  },
  activeBadgeName: {
    color: '#FFFFFF',
  },
  badgeDesc: {
    color: '#5A5F7A',
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 15,
    marginBottom: 10,
  },
  earnedCheck: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  earnedText: {
    color: '#10B981',
    fontSize: 9,
    fontWeight: 'bold',
  },
  cardBody: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardQrContainer: {
    backgroundColor: '#FFFFFF',
    padding: 8,
    borderRadius: 12,
    marginRight: 20,
  },
  cardInfo: {
    flex: 1,
  },
  cardName: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  cardNumber: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    fontFamily: 'monospace',
    marginTop: 4,
  },
  cardExpiryRow: {
    flexDirection: 'row',
    marginTop: 12,
  },
  cardMiniLabel: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 8,
    fontWeight: '700',
  },
  cardMiniVal: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
    marginTop: 2,
  },
  genreGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  genreChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#171B2B',
    borderWidth: 1,
    borderColor: '#1F263B',
  },
  genreChipText: {
    color: '#8A8F9E',
    fontSize: 13,
  },
  genreChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#0F121D',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 24,
    maxHeight: '80%',
    borderTopWidth: 1,
    borderColor: '#1F263B',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  modalBody: {
    marginBottom: 20,
  },
  inputLabel: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
  },
  inputSubLabel: {
    color: '#5A5F7A',
    fontSize: 12,
    marginBottom: 12,
  },
  textArea: {
    backgroundColor: '#171B2B',
    borderRadius: 16,
    padding: 16,
    color: '#FFFFFF',
    fontSize: 14,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: '#1F263B',
    minHeight: 100,
  },
  genreSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  genreOption: {
    backgroundColor: '#171B2B',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#1F263B',
  },
  genreOptionSelected: {
    backgroundColor: 'rgba(58, 117, 242, 0.2)',
    borderColor: '#3A75F2',
  },
  genreOptionText: {
    color: '#8A8F9E',
    fontSize: 14,
    fontWeight: '500',
  },
  genreOptionTextSelected: {
    color: '#3A75F2',
    fontWeight: '700',
  },
  saveBtn: {
    backgroundColor: '#3A75F2',
    height: 54,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    shadowColor: '#3A75F2',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  activeGenreChip: {
    backgroundColor: 'rgba(58, 117, 242, 0.2)',
    borderColor: '#3A75F2',
  },
  activeGenreChipText: {
    color: '#3A75F2',
    fontWeight: '700',
  },
  cardActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  shareCardBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(58, 117, 242, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(58, 117, 242, 0.3)',
    borderRadius: 12,
    paddingVertical: 12,
  },
  shareCardBtnText: {
    color: '#3A75F2',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  cardAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  cardAvatarText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  memberName: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  memberId: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 10,
    fontFamily: 'monospace',
    marginTop: 2,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  statLabel: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 8,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  statValue: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
    marginTop: 2,
  },
  qrPlaceholder: {
    width: 50,
    height: 50,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  badgeIconContainer: {
    position: 'relative',
    alignItems: 'center',
    marginBottom: 12,
  },
  shareBadgeBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#3A75F2',
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#171B2B',
  },
  analyticsCard: {
    marginHorizontal: 20,
    marginBottom: 25,
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#3A75F2',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
  },
  analyticsGradient: {
    flexDirection: 'row',
    padding: 20,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  analyticsInfo: {
    flex: 1,
    marginRight: 15,
  },
  analyticsTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  analyticsDesc: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    lineHeight: 16,
  },
  analyticsIconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  walletActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 10,
    marginBottom: 20,
  },
  walletBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    borderRadius: 12,
  },
  walletBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 8,
  }
});
