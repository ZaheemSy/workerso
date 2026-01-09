import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import {
  Camera,
  Clock,
  User,
  LogOut,
  Briefcase,
  LogIn as ClockInIcon,
  LogOut as ClockOutIcon,
  UserCircle,
  Heart,
  Shield,
  Activity,
} from 'lucide-react-native';
import LottieView from 'lottie-react-native';
import { COLORS } from '../constants/colors';
import { useAuth } from '../contexts/AuthContext';
import {
  getUserById,
  createAttendance,
  getAttendanceByUser,
  getDesignationById,
} from '../services/storageService';

const WorkerDashboard = ({ navigation }) => {
  const { session, logout } = useAuth();
  const [userDetails, setUserDetails] = useState(null);
  const [designationName, setDesignationName] = useState('');
  const [isClockedIn, setIsClockedIn] = useState(false);
  const [clockInTime, setClockInTime] = useState(null);

  useEffect(() => {
    loadUserDetails();
    checkClockInStatus();
  }, []);

  const loadUserDetails = async () => {
    try {
      const user = await getUserById(session.userId);
      console.log('User details loaded:', user);
      setUserDetails(user);

      // Fetch designation name if user has a designationId
      if (user?.designationId) {
        const designation = await getDesignationById(user.designationId);
        console.log('Designation loaded:', designation);
        if (designation) {
          setDesignationName(designation.name);
        }
      }
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

  const menuItems = [
    {
      icon: Camera,
      title: 'Mark Attendance',
      subtitle: 'Take selfie to mark attendance',
      color: COLORS.primary,
      onPress: () => navigation.navigate('AttendanceCamera'),
    },
    {
      icon: Clock,
      title: 'End of Day Log',
      subtitle: 'Submit work hours and breaks',
      color: COLORS.secondary,
      onPress: () => navigation.navigate('WorkLog'),
    },
    {
      icon: Briefcase,
      title: 'My Projects',
      subtitle: 'View assigned projects',
      color: COLORS.warning,
      onPress: () => navigation.navigate('ProjectList'),
    },
    {
      icon: Activity,
      title: 'Recent Activities',
      subtitle: 'View your activity history',
      color: COLORS.success,
      onPress: () => navigation.navigate('RecentActivities'),
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
                  {session?.name?.charAt(0)?.toUpperCase() || 'W'}
                </Text>
              </View>
              <View style={styles.userInfo}>
                <Text style={styles.userName}>
                  {session?.name || 'Worker'}
                </Text>
                <View style={styles.badgeRow}>
                  <View style={styles.workerBadge}>
                    <Briefcase color="#059669" size={11} fill="#059669" />
                    <Text style={styles.workerText}>Worker</Text>
                  </View>
                  {designationName && (
                    <View style={styles.designationBadge}>
                      <Text style={styles.designationText}>
                        {designationName}
                      </Text>
                    </View>
                  )}
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
                onPress={() => navigation.navigate('WorkerProfile')}
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

        {/* Clock In/Out Card - Only show if clock in is required */}
        {userDetails?.requiresClockIn && (
          <View style={styles.clockCard}>
            <View style={styles.clockCardHeader}>
              <Clock
                color={isClockedIn ? COLORS.success : COLORS.textLight}
                size={24}
              />
              <View style={styles.clockCardHeaderText}>
                <Text style={styles.clockCardTitle}>
                  {isClockedIn ? 'Clocked In' : 'Clock In Required'}
                </Text>
                {isClockedIn && clockInTime && (
                  <Text style={styles.clockCardSubtitle}>
                    Since {formatTime(clockInTime)}
                  </Text>
                )}
              </View>
            </View>
            <TouchableOpacity
              style={[
                styles.clockButton,
                isClockedIn ? styles.clockOutButton : styles.clockInButton,
              ]}
              onPress={isClockedIn ? handleClockOut : handleClockIn}
              activeOpacity={0.7}
            >
              {isClockedIn ? (
                <ClockOutIcon color={COLORS.white} size={20} />
              ) : (
                <ClockInIcon color={COLORS.white} size={20} />
              )}
              <Text style={styles.clockButtonText}>
                {isClockedIn ? 'Clock Out' : 'Clock In'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        <Text style={styles.sectionTitle}>Quick Actions</Text>

        {menuItems.map((item, index) => (
          <TouchableOpacity
            key={index}
            style={styles.menuItem}
            onPress={item.onPress}
            activeOpacity={0.7}
          >
            <View
              style={[
                styles.iconContainer,
                { backgroundColor: item.color + '15' },
              ]}
            >
              <item.icon color={item.color} size={24} />
            </View>
            <View style={styles.menuTextContainer}>
              <Text style={styles.menuTitle}>{item.title}</Text>
              <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
            </View>
          </TouchableOpacity>
        ))}
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
    backgroundColor: '#059669',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#D1FAE5',
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
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  workerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
  },
  workerText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#059669',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  designationBadge: {
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
  },
  designationText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#1D4ED8',
    textTransform: 'capitalize',
    letterSpacing: 0.3,
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
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 14,
  },
  clockCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 3,
  },
  clockCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  clockCardHeaderText: {
    marginLeft: 12,
    flex: 1,
  },
  clockCardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  clockCardSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  clockButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
  },
  clockInButton: {
    backgroundColor: '#10B981',
  },
  clockOutButton: {
    backgroundColor: '#EF4444',
  },
  clockButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  iconContainer: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  menuTextContainer: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 3,
  },
  menuSubtitle: {
    fontSize: 13,
    color: '#6B7280',
  },
});

export default WorkerDashboard;
