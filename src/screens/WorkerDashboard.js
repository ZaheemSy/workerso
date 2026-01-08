import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { Camera, Clock, User, LogOut, Briefcase, LogIn as ClockInIcon, LogOut as ClockOutIcon, UserCircle, Play } from 'lucide-react-native';
import { COLORS } from '../constants/colors';
import { useAuth } from '../contexts/AuthContext';
import { getUserById, createAttendance, getAttendanceByUser } from '../services/storageService';

const WorkerDashboard = ({ navigation }) => {
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
        if (latestAttendance.type === 'clock_in' && !latestAttendance.clockOutTime) {
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

  const formatTime = (isoString) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await logout();
          },
        },
      ]
    );
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
  ];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View>
            <Text style={styles.greeting}>Hello,</Text>
            <Text style={styles.name}>{session?.name || 'Worker'}</Text>
            <Text style={styles.role}>Worker</Text>
          </View>
        </View>
        <View style={styles.headerButtons}>
          <TouchableOpacity
            onPress={() => navigation.navigate('WorkerProfile')}
            style={styles.profileButton}
          >
            <UserCircle color={COLORS.primary} size={24} />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
            <LogOut color={COLORS.danger} size={24} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Temporary Button */}
        <TouchableOpacity
          style={styles.temporaryButton}
          onPress={() => navigation.navigate('SupportDevScreen')}
          activeOpacity={0.7}
        >
          <Play color={COLORS.white} size={20} />
          <Text style={styles.temporaryButtonText}>Temporary</Text>
        </TouchableOpacity>

        {/* Clock In/Out Card - Only show if clock in is required */}
        {userDetails?.requiresClockIn && (
          <View style={styles.clockCard}>
            <View style={styles.clockCardHeader}>
              <Clock color={isClockedIn ? COLORS.success : COLORS.textLight} size={24} />
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
            <View style={[styles.iconContainer, { backgroundColor: item.color + '15' }]}>
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
    backgroundColor: COLORS.background,
  },
  header: {
    backgroundColor: COLORS.white,
    padding: 24,
    paddingTop: 48,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 12,
  },
  headerAnimation: {
    width: 50,
    height: 50,
    marginBottom: -5,
  },
  greeting: {
    fontSize: 16,
    color: COLORS.textLight,
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
    marginTop: 4,
  },
  role: {
    fontSize: 14,
    color: COLORS.primary,
    marginTop: 2,
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  profileButton: {
    padding: 8,
  },
  logoutButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    padding: 24,
  },
  temporaryButton: {
    backgroundColor: COLORS.secondary,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    borderWidth: 2,
    borderColor: COLORS.secondary,
  },
  temporaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.white,
    marginLeft: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 16,
  },
  clockCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 2,
    borderColor: COLORS.border,
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
    color: COLORS.text,
  },
  clockCardSubtitle: {
    fontSize: 14,
    color: COLORS.textLight,
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
    backgroundColor: COLORS.success,
  },
  clockOutButton: {
    backgroundColor: COLORS.danger,
  },
  clockButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  menuItem: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  menuTextContainer: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  menuSubtitle: {
    fontSize: 14,
    color: COLORS.textLight,
    marginTop: 2,
  },
});

export default WorkerDashboard;
