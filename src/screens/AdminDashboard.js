import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Dimensions,
} from 'react-native';
import {
  Camera,
  FileText,
  LogOut,
  Clock,
  LogIn as ClockInIcon,
  LogOut as ClockOutIcon,
  UserCircle,
  Activity,
  Sparkles,
  Heart,
} from 'lucide-react-native';
import { COLORS } from '../constants/colors';
import { useAuth } from '../contexts/AuthContext';
import {
  getUserById,
  createAttendance,
  getAttendanceByUser,
} from '../services/storageService';
import LottieView from 'lottie-react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

// ⚙️ FADE OPACITY SETTINGS - Adjust these values to change number visibility
const NUMBER_FADE_OPACITY = 0.2; // Main number opacity (0.0 to 1.0) - Lower = more faded
const OPTIONAL_FADE_OPACITY = 0.2; // "OPT" label opacity (0.0 to 1.0) - Lower = more faded

const AdminDashboard = ({ navigation }) => {
  const { session, logout } = useAuth();
  const [userDetails, setUserDetails] = useState(null);
  const [isClockedIn, setIsClockedIn] = useState(false);
  const [clockInTime, setClockInTime] = useState(null);

  useEffect(() => {
    loadUserDetails();
    checkClockInStatus();
  }, []);

  const loadUserDetails = async () => {
    try {
      const user = await getUserById(session.userId);
      setUserDetails(user);
    } catch (error) {
      console.error('Error loading user details:', error);
    }
  };

  const checkClockInStatus = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const todayAttendance = await getAttendanceByUser(session.userId, today);

      if (todayAttendance && todayAttendance.length > 0) {
        const latestAttendance = todayAttendance[todayAttendance.length - 1];
        if (
          latestAttendance.type === 'clock_in' &&
          !latestAttendance.clockOutTime
        ) {
          setIsClockedIn(true);
          setClockInTime(latestAttendance.clockInTime);
        }
      }
    } catch (error) {
      console.error('Error checking clock-in status:', error);
    }
  };

  const handleClockIn = async () => {
    try {
      const now = new Date();
      await createAttendance({
        userId: session.userId,
        orgId: session.orgId,
        date: now.toISOString().split('T')[0],
        clockInTime: now.toISOString(),
        type: 'clock_in',
      });
      setIsClockedIn(true);
      setClockInTime(now.toISOString());
      Alert.alert('Success', 'You have clocked in successfully!');
    } catch (error) {
      console.error('Error clocking in:', error);
      Alert.alert('Error', 'Failed to clock in. Please try again.');
    }
  };

  const handleClockOut = async () => {
    try {
      const now = new Date();
      await createAttendance({
        userId: session.userId,
        orgId: session.orgId,
        date: now.toISOString().split('T')[0],
        clockOutTime: now.toISOString(),
        type: 'clock_out',
      });
      setIsClockedIn(false);
      setClockInTime(null);
      Alert.alert('Success', 'You have clocked out successfully!');
    } catch (error) {
      console.error('Error clocking out:', error);
      Alert.alert('Error', 'Failed to clock out. Please try again.');
    }
  };

  const formatTime = isoString => {
    if (!isoString) return '';
    const date = new Date(isoString);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

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

  const quickActions = [
    {
      icon: Camera,
      title: 'Attendance',
      subtitle: 'Track team records',
      color: '#6366F1',
      bgColor: '#EEF2FF',
      onPress: () => navigation.navigate('AttendanceRecords'),
    },
    {
      icon: FileText,
      title: 'Work Logs',
      subtitle: 'Daily activities',
      color: '#EC4899',
      bgColor: '#FDF2F8',
      onPress: () => navigation.navigate('WorkLogsView'),
    },
    {
      icon: Activity,
      title: 'Reports',
      subtitle: 'Export & download',
      color: '#10B981',
      bgColor: '#ECFDF5',
      onPress: () => navigation.navigate('Report'),
    },
  ];

  const menuItems = [
    {
      animation: require('../assets/json/Designations.json'),
      title: 'Designations',
      subtitle: 'Role management',
      icon: '🎯',
      color: '#06B6D4',
      bgColor: '#ECFEFF',
      number: '1',
      numberColor: '#67E8F9',
      onPress: () => navigation.navigate('Designations'),
    },
    {
      animation: require('../assets/json/Workers.json'),
      title: 'Employees',
      subtitle: 'Manage your team',
      icon: '👥',
      color: '#6366F1',
      bgColor: '#EEF2FF',
      number: '2',
      numberColor: '#A5B4FC',
      onPress: () => navigation.navigate('Employees'),
    },
    {
      animation: require('../assets/json/Worker_Groups.json'),
      title: 'Employees Groups',
      subtitle: 'Team organization',
      icon: '🔷',
      color: '#EC4899',
      bgColor: '#FDF2F8',
      scale: 1.5,
      number: '3',
      numberColor: '#F9A8D4',
      optional: true,
      onPress: () => navigation.navigate('WorkerGroupsList'),
    },
    {
      animation: require('../assets/json/ID_Card.json'),
      title: 'Clients',
      subtitle: 'Client database',
      icon: '🏢',
      color: '#F59E0B',
      bgColor: '#FEF3C7',
      scale: 1.2,
      number: '4',
      numberColor: '#FCD34D',
      onPress: () => navigation.navigate('Clients'),
    },
    {
      animation: require('../assets/json/Projects.json'),
      title: 'Projects',
      subtitle: 'Track work progress',
      icon: '📋',
      color: '#10B981',
      bgColor: '#ECFDF5',
      scale: 1.5,
      number: '5',
      numberColor: '#6EE7B7',
      onPress: () => navigation.navigate('ProjectList'),
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
                  {session?.name?.charAt(0)?.toUpperCase() || 'A'}
                </Text>
              </View>
              <View style={styles.userInfo}>
                <Text style={styles.userName}>{session?.name || 'Admin'}</Text>
                <View style={styles.adminBadge}>
                  <Sparkles color="#F59E0B" size={11} />
                  <Text style={styles.adminText}>
                    {session?.designation || 'Admin'}
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
                onPress={() => navigation.navigate('AdminProfile')}
                style={styles.iconButton}
              >
                <UserCircle color="#6366F1" size={20} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleLogout}
                style={[styles.iconButton, styles.logoutButton]}
              >
                <LogOut color="#EF4444" size={20} />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>

      <ScrollView
        style={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContentContainer}
      >
        {/* Clock In/Out Section */}
        {userDetails?.requiresClockIn && (
          <View style={styles.clockContainer}>
            <View
              style={[styles.clockCard, isClockedIn && styles.clockCardActive]}
            >
              <View style={styles.clockLeft}>
                <View style={styles.clockIconContainer}>
                  <Clock
                    color={isClockedIn ? '#10B981' : '#6B7280'}
                    size={24}
                  />
                </View>
                <View>
                  <Text style={styles.clockStatus}>
                    {isClockedIn ? 'Active Now' : 'Not Clocked In'}
                  </Text>
                  {isClockedIn && clockInTime && (
                    <Text style={styles.clockSince}>
                      Since {formatTime(clockInTime)}
                    </Text>
                  )}
                </View>
              </View>

              <TouchableOpacity
                style={[
                  styles.clockBtn,
                  isClockedIn ? styles.clockBtnOut : styles.clockBtnIn,
                ]}
                onPress={isClockedIn ? handleClockOut : handleClockIn}
                activeOpacity={0.8}
              >
                {isClockedIn ? (
                  <ClockOutIcon color="#FFF" size={18} />
                ) : (
                  <ClockInIcon color="#FFF" size={18} />
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Quick Actions Grid */}
        <View style={styles.quickSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionLabel}>Quick Access</Text>
            <Text style={styles.sectionCount}>{quickActions.length}</Text>
          </View>
          <View style={styles.quickGrid}>
            {quickActions.map((action, index) => (
              <TouchableOpacity
                key={index}
                style={styles.quickCard}
                onPress={action.onPress}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.quickIconBox,
                    { backgroundColor: action.bgColor },
                  ]}
                >
                  <action.icon color={action.color} size={28} />
                </View>
                <Text style={styles.quickTitle}>{action.title}</Text>
                <Text style={styles.quickSubtitle}>{action.subtitle}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Management Grid */}
        <View style={styles.managementSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionLabel}>Management</Text>
            <Text style={styles.sectionCount}>{menuItems.length}</Text>
          </View>
          <View style={styles.managementGrid}>
            {menuItems.map((item, index) => (
              <TouchableOpacity
                key={index}
                style={styles.managementCard}
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
                        style={[
                          styles.optionalText,
                          { color: item.numberColor },
                        ]}
                      >
                        OPT
                      </Text>
                    )}
                  </View>
                )}
                <View
                  style={[
                    styles.managementIconBox,
                    { backgroundColor: item.bgColor },
                  ]}
                >
                  <LottieView
                    source={item.animation}
                    autoPlay
                    loop
                    style={[
                      styles.managementLottie,
                      item.scale && { transform: [{ scale: item.scale }] },
                    ]}
                  />
                </View>
                <View style={styles.managementInfo}>
                  <Text style={styles.managementTitle}>{item.title}</Text>
                  <Text style={styles.managementSubtitle}>{item.subtitle}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={{ height: 40 }} />
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
    backgroundColor: '#6366F1',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#EEF2FF',
  },
  avatarInitial: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  userInfo: {
    gap: 3,
  },
  greeting: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
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
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  adminText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#D97706',
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
  logoutButton: {
    backgroundColor: '#FEE2E2',
  },
  scrollContent: {
    flex: 1,
  },
  scrollContentContainer: {
    padding: 20,
  },
  clockContainer: {
    marginBottom: 24,
  },
  clockCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  clockCardActive: {
    borderColor: '#10B981',
    backgroundColor: '#ECFDF5',
  },
  clockLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  clockIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#F9FAFB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  clockStatus: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  clockSince: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  clockBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clockBtnIn: {
    backgroundColor: '#10B981',
  },
  clockBtnOut: {
    backgroundColor: '#EF4444',
  },
  quickSection: {
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    letterSpacing: -0.5,
  },
  sectionCount: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6366F1',
    backgroundColor: 'transparent',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#6366F1',
    opacity: 0.4,
  },
  quickGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  quickCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  quickIconBox: {
    width: 64,
    height: 64,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  quickTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
    textAlign: 'center',
  },
  quickSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 16,
  },
  managementSection: {
    marginBottom: 24,
  },
  managementGrid: {
    gap: 14,
  },
  managementCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#F3F4F6',
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
  managementIconBox: {
    width: 76,
    height: 76,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  managementLottie: {
    width: 64,
    height: 64,
  },
  managementInfo: {
    flex: 1,
  },
  managementTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  managementSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18,
  },
});

export default AdminDashboard;
