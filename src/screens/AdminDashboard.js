import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { Users, Briefcase, Camera, FileText, UserPlus, LogOut, FolderOpen } from 'lucide-react-native';
import { COLORS } from '../constants/colors';
import { useAuth } from '../contexts/AuthContext';

const AdminDashboard = ({ navigation }) => {
  const { session, logout } = useAuth();

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
      icon: UserPlus,
      title: 'Add Worker',
      subtitle: 'Create new worker account',
      color: COLORS.primary,
      onPress: () => navigation.navigate('AddWorker'),
    },
    {
      icon: Users,
      title: 'Worker Groups',
      subtitle: 'Manage worker teams',
      color: COLORS.secondary,
      onPress: () => navigation.navigate('WorkerGroupList'),
    },
    {
      icon: Briefcase,
      title: 'Projects',
      subtitle: 'Create and manage projects',
      color: COLORS.warning,
      onPress: () => navigation.navigate('ProjectList'),
    },
    {
      icon: Camera,
      title: 'Attendance Records',
      subtitle: 'View worker attendance',
      color: COLORS.darkGray,
      onPress: () => navigation.navigate('AttendanceRecords'),
    },
    {
      icon: FileText,
      title: 'Work Logs',
      subtitle: 'View daily work hours',
      color: COLORS.primary,
      onPress: () => navigation.navigate('WorkLogsView'),
    },
    {
      icon: FolderOpen,
      title: 'My Profile',
      subtitle: 'View and update profile',
      color: COLORS.secondary,
      onPress: () => navigation.navigate('AdminProfile'),
    },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Hello,</Text>
          <Text style={styles.name}>{session?.name || 'Admin'}</Text>
          <Text style={styles.role}>Admin</Text>
        </View>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
          <LogOut color={COLORS.danger} size={24} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionTitle}>Management</Text>

        <View style={styles.grid}>
          {menuItems.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={styles.menuItem}
              onPress={item.onPress}
              activeOpacity={0.7}
            >
              <View style={[styles.iconContainer, { backgroundColor: item.color + '15' }]}>
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
  logoutButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    padding: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 16,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  menuItem: {
    width: '48%',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
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
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  menuSubtitle: {
    fontSize: 12,
    color: COLORS.textLight,
  },
});

export default AdminDashboard;
