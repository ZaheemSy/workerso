import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import {
  UserCog,
  Users,
  Briefcase,
  Shield,
  Settings,
  LogOut,
  Building2,
  FileBarChart,
  UserPlus,
  Award,
  UserCircle,
  Play,
  Sparkles,
  Heart,
  GitBranch,
} from 'lucide-react-native';
import { COLORS } from '../constants/colors';
import { useAuth } from '../contexts/AuthContext';
import LottieView from 'lottie-react-native';

// ⚙️ FADE OPACITY SETTINGS - Adjust these values to change number visibility
const NUMBER_FADE_OPACITY = 0.2; // Main number opacity (0.0 to 1.0) - Lower = more faded
const OPTIONAL_FADE_OPACITY = 0.2; // "OPT" label opacity (0.0 to 1.0) - Lower = more faded

const SuperAdminDashboard = ({ navigation }) => {
  const { session, logout } = useAuth();

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          await logout();
        },
      },
    ]);
  };

  const menuItems = [
    {
      icon: GitBranch,
      title: 'Hierarchy Manager',
      subtitle: 'Define power structure',
      color: '#8B5CF6',
      number: '1',
      numberColor: '#C4B5FD',
      onPress: () => navigation.navigate('HierarchyManager'),
    },
    {
      icon: Award,
      title: 'Designations',
      subtitle: 'Manage job titles',
      color: COLORS.primary,
      number: '2',
      numberColor: '#A5B4FC',
      onPress: () => navigation.navigate('Designations'),
    },
    {
      icon: UserPlus,
      title: 'Employees',
      subtitle: 'Manage all employees',
      color: COLORS.success,
      number: '3',
      numberColor: '#6EE7B7',
      onPress: () => navigation.navigate('Employees'),
    },
    {
      icon: Users,
      title: 'Employees Groups',
      subtitle: 'Manage employee teams',
      color: COLORS.secondary,
      number: '4',
      numberColor: '#FCA5A5',
      optional: true,
      onPress: () => navigation.navigate('WorkerGroupsList'),
    },
    {
      icon: Building2,
      title: 'All Clients',
      subtitle: 'Manage client database',
      color: '#EC4899',
      number: '5',
      numberColor: '#F9A8D4',
      optional: true,
      onPress: () => navigation.navigate('Clients'),
    },
    {
      icon: Briefcase,
      title: 'All Projects',
      subtitle: 'Organization projects',
      color: COLORS.warning,
      number: '6',
      numberColor: '#FCD34D',
      onPress: () => navigation.navigate('ProjectList'),
    },
    {
      icon: FileBarChart,
      title: 'Analytics',
      subtitle: 'View insights and analytics',
      color: COLORS.darkGray,
      onPress: () => navigation.navigate('Reports'),
    },
    {
      icon: Building2,
      title: 'Organization',
      subtitle: 'Manage org profile',
      color: COLORS.primary,
      onPress: () => navigation.navigate('OrganizationProfile'),
    },
    {
      icon: Settings,
      title: 'Settings',
      subtitle: 'App preferences',
      color: COLORS.secondary,
      onPress: () => navigation.navigate('Settings'),
    },
  ];

  return (
    <View style={styles.container}>
      {/* Hero Card Header */}
      <View style={styles.heroSection}>
        <View style={styles.heroCard}>
          <View style={styles.heroTop}>
            <View style={styles.heroLeft}>
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarInitial}>
                  {session?.name?.charAt(0)?.toUpperCase() || 'S'}
                </Text>
              </View>
              <View style={styles.userInfo}>
                <Text style={styles.userName}>
                  {session?.name || 'Super Admin'}
                </Text>
                <View style={styles.adminBadge}>
                  <Shield color="#DC2626" size={11} fill="#DC2626" />
                  <Text style={styles.adminText}>
                    {session?.designation || 'Super Admin'}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.heroRight}>
              <View style={styles.orbitContainer}>
                <LottieView
                  source={require('../assets/json/Planet_Orbit.json')}
                  autoPlay
                  loop
                  speed={0.3}
                  style={styles.orbitLottie}
                />
              </View>
            </View>
          </View>

          {/* Bottom Actions Row */}
          <View style={styles.heroBottom}>
            <TouchableOpacity
              style={styles.supportBadge}
              onPress={() => navigation.navigate('SupportDevScreen')}
              activeOpacity={0.8}
            >
              <Heart color="#EC4899" size={14} fill="#EC4899" />
              <Text style={styles.supportText}>Support Dev</Text>
            </TouchableOpacity>

            <View style={styles.actionButtons}>
              <TouchableOpacity
                onPress={() => navigation.navigate('OrganizationProfile')}
                style={styles.iconButton}
              >
                <UserCircle color="#6366F1" size={20} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleLogout}
                style={[styles.iconButton, styles.logoutIconButton]}
              >
                <LogOut color="#EF4444" size={20} />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <TouchableOpacity
          style={styles.adminWorkersCard}
          onPress={() => navigation.navigate('Report')}
          activeOpacity={0.7}
        >
          <Users color="#8B5CF6" size={22} />
          <Text style={styles.adminWorkersTitle}>Reports</Text>
          <Text style={styles.adminWorkersSeparator}>•</Text>
          <Text style={styles.adminWorkersSubtitle}>Download reports</Text>
        </TouchableOpacity>

        <Text style={styles.sectionTitle}>Administration</Text>

        <View style={styles.grid}>
          {menuItems.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={styles.menuItem}
              onPress={item.onPress}
              activeOpacity={0.7}
            >
              {item.number && (
                <View style={styles.numberContainer}>
                  <Text
                    style={[styles.numberText, { color: item.numberColor }]}
                  >
                    {item.number}
                  </Text>
                  {item.optional && (
                    <Text
                      style={[styles.optionalText, { color: item.numberColor }]}
                    >
                      OPT
                    </Text>
                  )}
                </View>
              )}
              <View
                style={[
                  styles.iconContainer,
                  { backgroundColor: item.color + '15' },
                ]}
              >
                <item.icon color={item.color} size={28} />
              </View>
              <Text style={styles.menuTitle}>{item.title}</Text>
              <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  heroSection: {
    backgroundColor: '#FFFFFF',
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  heroCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 5,
  },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  heroLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flex: 1,
  },
  heroRight: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#DC2626',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#FEE2E2',
  },
  avatarInitial: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  userInfo: {
    gap: 3,
  },
  userName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  adminBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  adminText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#DC2626',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  orbitContainer: {
    width: 70,
    height: 70,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -10,
  },
  orbitLottie: {
    width: 80,
    height: 80,
  },
  heroBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  supportBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FDF2F8',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#FBCFE8',
  },
  supportText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#EC4899',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutIconButton: {
    backgroundColor: '#FEE2E2',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
  },
  adminWorkersCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#F5F3FF',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E9D5FF',
  },
  adminWorkersTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#7C3AED',
  },
  adminWorkersSeparator: {
    fontSize: 14,
    color: '#A78BFA',
    marginHorizontal: 2,
  },
  adminWorkersSubtitle: {
    fontSize: 14,
    fontWeight: '400',
    color: '#919191ff',
    flex: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 14,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingBottom: 80,
  },
  menuItem: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 3,
    position: 'relative',
    overflow: 'hidden',
  },
  numberContainer: {
    position: 'absolute',
    top: 8,
    right: 8,
    alignItems: 'center',
  },
  numberText: {
    fontSize: 52,
    fontWeight: '900',
    opacity: NUMBER_FADE_OPACITY,
    lineHeight: 52,
    letterSpacing: -2,
  },
  optionalText: {
    fontSize: 9,
    fontWeight: '800',
    opacity: OPTIONAL_FADE_OPACITY,
    marginTop: -8,
    letterSpacing: 0.5,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  menuTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  menuSubtitle: {
    fontSize: 12,
    color: '#6B7280',
  },
});

export default SuperAdminDashboard;
