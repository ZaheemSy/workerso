import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { UserCog, Users, Briefcase, Shield, Settings, LogOut, Building2, FileBarChart, UserPlus, Award, UserCircle, Play } from 'lucide-react-native';
import { COLORS } from '../constants/colors';
import { useAuth } from '../contexts/AuthContext';

const SuperAdminDashboard = ({ navigation }) => {
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
      icon: UserCog,
      title: 'Create Admin',
      subtitle: 'Add new admin accounts',
      color: COLORS.primary,
      onPress: () => navigation.navigate('CreateAdmin'),
    },
    {
      icon: UserPlus,
      title: 'Workers',
      subtitle: 'View and manage workers',
      color: COLORS.success,
      onPress: () => navigation.navigate('WorkersList'),
    },
    {
      icon: Users,
      title: 'Worker Groups',
      subtitle: 'Manage worker teams',
      color: COLORS.secondary,
      onPress: () => navigation.navigate('WorkerGroupsList'),
    },
    {
      icon: Award,
      title: 'Designations',
      subtitle: 'Manage job titles',
      color: COLORS.primary,
      onPress: () => navigation.navigate('Designations'),
    },
    {
      icon: Briefcase,
      title: 'All Projects',
      subtitle: 'Organization projects',
      color: COLORS.warning,
      onPress: () => navigation.navigate('ProjectList'),
    },
    {
      icon: FileBarChart,
      title: 'Reports',
      subtitle: 'View analytics and reports',
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
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View>
            <Text style={styles.greeting}>Hello,</Text>
            <Text style={styles.name}>{session?.name || 'Super Admin'}</Text>
            <Text style={styles.role}>Super Admin</Text>
          </View>
        </View>
        <View style={styles.headerButtons}>
          <TouchableOpacity
            onPress={() => navigation.navigate('OrganizationProfile')}
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

        <TouchableOpacity
          style={styles.topButton}
          onPress={() => navigation.navigate('AdminsAndWorkers')}
          activeOpacity={0.7}
        >
          <Users color={COLORS.primary} size={24} />
          <Text style={styles.topButtonText}>Admins and Workers</Text>
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
    marginBottom: 16,
    borderWidth: 2,
    borderColor: COLORS.secondary,
  },
  temporaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.white,
    marginLeft: 8,
  },
  topButton: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  topButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.primary,
    marginLeft: 12,
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

export default SuperAdminDashboard;
