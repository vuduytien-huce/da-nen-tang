import { supabase } from "@/src/api/supabase";
import { LanguageMenuToggle } from "@/src/components/LanguageSwitcher";
import { adminService } from "@/src/features/admin/admin.service";
import { booksService } from "@/src/features/books/books.service";
import { useAuthStore } from "@/src/store/useAuthStore";
import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React from "react";
import { useTranslation } from "react-i18next";
import {
  Alert,
  Image,
  Modal,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Platform,
} from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";
import { useLocalSearchParams } from "expo-router";
import { useEffect } from "react";

// Removed unused width constant

export default function AdminDashboard() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const { scroll } = useLocalSearchParams<{ scroll?: string }>();
  const scrollViewRef = React.useRef<ScrollView>(null);
  const [usersLayoutY, setUsersLayoutY] = React.useState(0);
  const [isProfileMenuVisible, setIsProfileMenuVisible] = React.useState(false);
  const { profile, logout, session } = useAuthStore();
  const { t } = useTranslation();

  const { data: users, isLoading } = useQuery({
    queryKey: ["admin_users"],
    queryFn: () => adminService.listUsers(),
  });

  const { data: totalUsersCount } = useQuery({
    queryKey: ["admin_users_count"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true });
      if (error) throw error;
      return count || 0;
    },
  });

  useEffect(() => {
    if (scroll === "users") {
      const timer = setTimeout(() => {
        const yCoord = usersLayoutY > 0 ? usersLayoutY : 480;
        scrollViewRef.current?.scrollTo({ y: yCoord, animated: true });
        if (Platform.OS === 'web') {
          const el = document.getElementById('users-section');
          if (el) el.scrollIntoView({ behavior: 'smooth' });
        }
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [scroll, usersLayoutY]);

  const { data: allBooks } = useQuery({
    queryKey: ["admin_books_count"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("books")
        .select("total_copies");
      if (error) throw error;
      return data || [];
    },
  });

  const totalCopies =
    allBooks?.reduce((sum, b) => sum + (b.total_copies || 0), 0) || 0;

  const updateRole = useMutation({
    mutationFn: ({ userId, newRole }: { userId: string; newRole: string }) =>
      adminService.updateUser(userId, { role: newRole }),
    onSuccess: () => {
      Alert.alert(t("common.success"), t("messages.book_updated")); // Reusing book_updated for generic update
      queryClient.invalidateQueries({ queryKey: ["admin_users"] });
    },
  });

  const deleteUser = useMutation({
    mutationFn: (userId: string) => adminService.deleteUser(userId),
    onSuccess: () => {
      Alert.alert(t("common.success"), t("messages.book_deleted")); // Reusing book_deleted for generic delete
      queryClient.invalidateQueries({ queryKey: ["admin_users"] });
    },
  });

  const handleRoleChange = (userId: string, currentRole: string) => {
    Alert.alert(
      t("librarian.manage_admins"),
      t("librarian.manage_admins_desc"),
      [
        {
          text: t("roles.member"),
          onPress: () => updateRole.mutate({ userId, newRole: "MEMBER" }),
        },
        {
          text: t("roles.librarian"),
          onPress: () => updateRole.mutate({ userId, newRole: "LIBRARIAN" }),
        },
        {
          text: t("roles.admin"),
          onPress: () => updateRole.mutate({ userId, newRole: "ADMIN" }),
        },
        { text: t("common.cancel"), style: "cancel" },
      ],
    );
  };

  const stats = [
    {
      label: t("analytics.kpi_members"),
      value: totalUsersCount ?? (users?.length || 0),
      icon: "people",
      bgColor: "#3A75F2",
      flex: 1,
      onPress: () => {
        const yCoord = usersLayoutY > 0 ? usersLayoutY : 480;
        scrollViewRef.current?.scrollTo({ y: yCoord, animated: true });
        if (Platform.OS === 'web') {
          const el = document.getElementById('users-section');
          if (el) el.scrollIntoView({ behavior: 'smooth' });
        }
      },
    },
    {
      label: t("librarian.inventory"),
      value: totalCopies,
      icon: "library",
      bgColor: "#10B981",
      flex: 1.2,
      onPress: () => router.push("/(admin)/inventory"),
    },
    {
      label: t("admin.system"),
      value: "OK",
      icon: "checkmark-circle",
      bgColor: "#F59E0B",
      flex: 0.8,
      onPress: () => router.push("/(admin)/system"),
    },
    {
      label: "AI Enrich",
      value: "AUTO",
      icon: "sparkles",
      bgColor: "#8B5CF6",
      flex: 1,
      onPress: () => handleBulkEnrich(),
    },
  ];
  const handleBulkEnrich = () => {
    const runEnrich = async () => {
      try {
        const result = await booksService.bulkEnrichAudiobooks();
        const successMsg = t('admin.ai_enrich_success', { updated: result.updated, total: result.total });
        if (Platform.OS === 'web') {
          window.alert(successMsg);
        } else {
          Alert.alert(t('common.success'), successMsg);
        }
        queryClient.invalidateQueries({ queryKey: ["audiobooks"] });
      } catch (e: any) {
        if (Platform.OS === 'web') {
          window.alert(e.message);
        } else {
          Alert.alert(t('common.error'), e.message);
        }
      }
    };

    if (Platform.OS === 'web') {
      const isConfirmed = window.confirm(t('admin.ai_enrich_msg'));
      if (isConfirmed) {
        runEnrich();
      }
    } else {
      Alert.alert(
        t('admin.ai_enrich_title'),
        t('admin.ai_enrich_msg'),
        [
          { text: t("common.cancel"), style: "cancel" },
          { 
            text: t('admin.ai_enrich_start'), 
            onPress: runEnrich
          }
        ]
      );
    }
  };

  const handleDeleteUser = (userId: string) => {
    Alert.alert(
      t("librarian.delete_confirm"),
      t("librarian.delete_confirm_msg"),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("librarian.reject"),
          style: "destructive",
          onPress: () => deleteUser.mutate(userId),
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0F121D" />
      <ScrollView
        ref={scrollViewRef}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {/* Header Section with Profile Dropdown */}
        <View style={styles.header}>
          <View>
            <Text style={styles.welcome}>{t("roles.admin")}</Text>
            <Text style={styles.name}>{profile?.fullName || "Admin"}</Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity
              onPress={() => router.navigate("/notifications" as any)}
              style={styles.notifBtn}
            >
              <Ionicons
                name="notifications-outline"
                size={20}
                color="#3A75F2"
              />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setIsProfileMenuVisible(true)}
              style={styles.avatarBtn}
            >
              {profile?.avatarUrl ? (
                <Image
                  source={{ uri: profile.avatarUrl }}
                  style={styles.avatarImg}
                />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Text style={styles.avatarText}>
                    {profile?.fullName?.charAt(0) || "A"}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Profile Dropdown Menu */}
        <Modal
          visible={isProfileMenuVisible}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setIsProfileMenuVisible(false)}
        >
          <TouchableOpacity
            style={styles.menuOverlay}
            activeOpacity={1}
            onPress={() => setIsProfileMenuVisible(false)}
          >
            <Animated.View
              entering={FadeInUp.duration(300)}
              style={styles.menuContent}
            >
              <View style={styles.menuHeader}>
                <Text style={styles.menuUserTitle}>
                  {profile?.fullName || t('roles.admin')}
                </Text>
                <Text style={styles.menuUserSub}>
                  {session?.user?.email || "admin@bibliotech.ai"}
                </Text>
              </View>

              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => {
                  setIsProfileMenuVisible(false);
                  router.push("/profile" as any);
                }}
              >
                <Ionicons name="person-outline" size={18} color="#8A8F9E" />
                <Text style={styles.menuItemText}>{t('common.profile')}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => {
                  setIsProfileMenuVisible(false);
                  router.push("/settings" as any);
                }}
              >
                <Ionicons name="settings-outline" size={18} color="#8A8F9E" />
                <Text style={styles.menuItemText}>{t('common.settings')}</Text>
              </TouchableOpacity>

              <LanguageMenuToggle />

              <View style={styles.menuDivider} />

              <TouchableOpacity
                style={[styles.menuItem, styles.signOutItem]}
                onPress={() => {
                  setIsProfileMenuVisible(false);
                  logout();
                }}
              >
                <Ionicons name="log-out-outline" size={18} color="#FF6B6B" />
                <Text style={[styles.menuItemText, { color: "#FF6B6B" }]}>
                  {t('common.logout')}
                </Text>
              </TouchableOpacity>
            </Animated.View>
          </TouchableOpacity>
        </Modal>

        {/* Sync Stats Cards - Matching Librarian Classic Layout */}
        <View style={styles.statsRow}>
          {stats.map((stat: any, index) => (
            <TouchableOpacity
              key={index}
              onPress={stat.onPress}
              disabled={!stat.onPress}
              style={[
                styles.statCard,
                { backgroundColor: stat.bgColor, flex: stat.flex },
                index !== stats.length - 1 && { marginRight: 10 },
              ]}
            >
              <View style={styles.statTop}>
                <Ionicons
                  name={stat.icon as any}
                  size={18}
                  color="rgba(255,255,255,0.9)"
                />
                <Text style={styles.statValue}>{stat.value}</Text>
              </View>
              <Text style={styles.statLabel} numberOfLines={1}>
                {stat.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Reports & Security Audit Navigation */}
        <View style={styles.bannersRow}>
          <TouchableOpacity
            style={styles.bannerContainer}
            onPress={() => router.push("/(admin)/reports")}
          >
            <LinearGradient
              colors={["#1F263B", "#171B2B"]}
              style={styles.reportsGradient}
            >
              <View style={styles.reportsIcon}>
                <Ionicons name="bar-chart" size={24} color="#3A75F2" />
              </View>
              <View style={styles.flex1}>
                <Text style={styles.reportsTitle}>{t("tabs.reports")}</Text>
                <Text style={styles.reportsSubtitle}>
                  {t("analytics.overview")}
                </Text>
              </View>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.bannerContainer}
            onPress={() => router.push("/(admin)/audit")}
          >
            <LinearGradient
              colors={["#1F263B", "#1A2138"]}
              style={styles.reportsGradient}
            >
              <View
                style={[
                  styles.reportsIcon,
                  { backgroundColor: "rgba(58, 117, 242, 0.15)" },
                ]}
              >
                <Ionicons name="list" size={24} color="#3A75F2" />
              </View>
              <View style={styles.flex1}>
                <Text style={styles.reportsTitle}>{t("tabs.audit")}</Text>
                <Text style={styles.reportsSubtitle}>
                  {t("admin.audit_logs")}
                </Text>
              </View>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* User Management Section */}
        <View 
          id="users-section"
          nativeID="users-section"
          style={styles.sectionHeader}
          onLayout={(event) => setUsersLayoutY(event.nativeEvent.layout.y)}
        >
          <Text style={styles.sectionTitle}>{t("tabs.users")}</Text>
          <TouchableOpacity
            onPress={() =>
              queryClient.invalidateQueries({ queryKey: ["admin_users"] })
            }
          >
            <Ionicons name="refresh" size={18} color="#3A75F2" />
          </TouchableOpacity>
        </View>

        <View style={styles.userList}>
          {isLoading ? (
            <Text style={styles.loadingText}>{t("messages.loading")}</Text>
          ) : Array.isArray(users) && users.length > 0 ? (
            users.map((item: any) => (
              <UserCard
                key={item.id}
                item={item}
                onEdit={() => handleRoleChange(item.id, item.role)}
                onDelete={() => handleDeleteUser(item.id)}
              />
            ))
          ) : (
            <Text style={styles.loadingText}>{t("messages.no_results")}</Text>
          )}
        </View>

        <View style={styles.spacer40} />
      </ScrollView>
    </SafeAreaView>
  );
}

const UserCard = React.memo(
  ({
    item,
    onEdit,
    onDelete,
  }: {
    item: any;
    onEdit: () => void;
    onDelete: () => void;
  }) => (
    <View style={styles.userCard}>
      <View style={styles.userAvatar}>
        <Text style={styles.avatarText}>{item.fullName?.charAt(0) || "U"}</Text>
      </View>
      <View style={styles.userInfo}>
        <Text style={styles.userName}>{item.fullName}</Text>
        <View style={styles.roleBadge}>
          <Text style={styles.roleText}>{item.role}</Text>
        </View>
      </View>
      <View style={styles.userCardActions}>
        <TouchableOpacity onPress={onEdit} style={styles.editBtn}>
          <Ionicons name="settings-outline" size={18} color="#3A75F2" />
        </TouchableOpacity>
        <TouchableOpacity onPress={onDelete} style={styles.deleteBtn}>
          <Ionicons name="trash-outline" size={18} color="#FF6B6B" />
        </TouchableOpacity>
      </View>
    </View>
  ),
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0B0F1A" },
  scroll: { paddingBottom: 20 },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
  },
  welcome: { color: "#8A8F9E", fontSize: 13, marginBottom: 2 },
  name: { color: "#FFFFFF", fontSize: 18, fontWeight: "bold" },
  notifBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "rgba(58, 117, 242, 0.1)",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 12,
  },
  avatarBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: "#3A75F2",
    overflow: "hidden",
    marginLeft: 12,
  },
  avatarImg: {
    width: "100%",
    height: "100%",
  },
  avatarPlaceholder: {
    width: "100%",
    height: "100%",
    backgroundColor: "#1F263B",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: "#3A75F2",
    fontWeight: "bold",
    fontSize: 16,
  },
  menuOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-start",
    alignItems: "flex-end",
    paddingTop: 80,
    paddingRight: 20,
  },
  menuContent: {
    width: 200,
    backgroundColor: "#171B2B",
    borderRadius: 12,
    padding: 6,
    borderWidth: 1,
    borderColor: "#1F263B",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  menuHeader: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.05)",
    marginBottom: 4,
  },
  menuUserTitle: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "bold",
  },
  menuUserSub: {
    color: "#8A8F9E",
    fontSize: 10,
    marginTop: 1,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    borderRadius: 8,
    gap: 10,
  },
  menuItemText: {
    color: "#E1E4ED",
    fontSize: 13,
    fontWeight: "500",
  },
  menuDivider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.05)",
    marginVertical: 4,
  },
  signOutItem: {
    marginTop: 2,
  },
  statsRow: {
    flexDirection: "row",
    paddingHorizontal: 20,
    marginBottom: 32,
    height: 80,
  },
  statCard: {
    borderRadius: 14,
    padding: 12,
    justifyContent: "space-between",
    height: "100%",
  },
  statTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  statValue: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  statLabel: {
    fontSize: 11,
    color: "#FFFFFF",
    fontWeight: "500",
    opacity: 0.9,
  },
  bannersRow: {
    flexDirection: "row",
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 32,
  },
  bannerContainer: {
    flex: 1,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginHorizontal: 20,
    marginBottom: 16,
  },
  sectionTitle: { color: "#FFFFFF", fontSize: 16, fontWeight: "bold" },
  userList: { paddingHorizontal: 20 },
  userCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#151929",
    padding: 14,
    borderRadius: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#1E2540",
  },
  userAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#1F263B",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  userInfo: { flex: 1 },
  userName: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "bold",
    marginBottom: 4,
  },
  roleBadge: {
    backgroundColor: "rgba(58, 117, 242, 0.1)",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: "flex-start",
  },
  roleText: { color: "#3A75F2", fontSize: 10, fontWeight: "700" },
  userCardActions: {
    flexDirection: "row",
    gap: 8,
  },
  editBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: "#1F263B",
    alignItems: "center",
    justifyContent: "center",
  },
  deleteBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: "rgba(255, 107, 107, 0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: { color: "#8A8F9E", textAlign: "center", marginTop: 20 },
  flex1: { flex: 1 },
  spacer40: { height: 40 },
  reportsBanner: {
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#1E2540",
  },
  reportsGradient: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 16,
  },
  reportsIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: "rgba(58, 117, 242, 0.1)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  reportsTitle: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 4,
  },
  reportsSubtitle: {
    color: "#8A8F9E",
    fontSize: 12,
  },
});
