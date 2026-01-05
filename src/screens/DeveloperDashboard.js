import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Code, Database, Users, Building2, Briefcase, LogOut, RefreshCw } from 'lucide-react-native';
import { COLORS } from '../constants/colors';
import { useAuth } from '../contexts/AuthContext';
import { getOrganizations, getUsers, getProjects, getAttendanceByOrg, getWorkLogsByOrg } from '../services/storageService';

const DeveloperDashboard = () => {
  const { logout } = useAuth();
  const [stats, setStats] = useState({
    totalOrgs: 0,
    totalUsers: 0,
    totalProjects: 0,
    totalAttendance: 0,
    totalWorkLogs: 0,
  });
  const [organizations, setOrganizations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDeveloperData();
  }, []);

  const loadDeveloperData = async () => {
    setLoading(true);
    try {
      const orgs = await getOrganizations();
      const users = await getUsers();

      let totalProjects = 0;
      let totalAttendance = 0;
      let totalWorkLogs = 0;

      for (const org of orgs) {
        const orgProjects = await getProjects();
        const orgAttendance = await getAttendanceByOrg(org.orgId);
        const orgWorkLogs = await getWorkLogsByOrg(org.orgId);

        totalProjects += orgProjects.filter(p => p.orgId === org.orgId).length;
        totalAttendance += orgAttendance.length;
        totalWorkLogs += orgWorkLogs.length;
      }

      setStats({
        totalOrgs: orgs.length,
        totalUsers: users.length,
        totalProjects,
        totalAttendance,
        totalWorkLogs,
      });
      setOrganizations(orgs);
    } catch (error) {
      console.error('Error loading developer data:', error);
      Alert.alert('Error', 'Failed to load developer data');
    } finally {
      setLoading(false);
    }
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

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <View style={styles.developerBadge}>
            <Code color={COLORS.white} size={16} />
            <Text style={styles.developerText}>Developer Mode</Text>
          </View>
          <Text style={styles.name}>System Overview</Text>
          <Text style={styles.role}>Global Access</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={loadDeveloperData} style={styles.refreshButton}>
            <RefreshCw color={COLORS.primary} size={24} />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
            <LogOut color={COLORS.danger} size={24} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionTitle}>System Statistics</Text>

        <View style={styles.statsGrid}>
          <View style={[styles.statCard, { backgroundColor: COLORS.primary + '15' }]}>
            <Building2 color={COLORS.primary} size={28} />
            <Text style={styles.statValue}>{stats.totalOrgs}</Text>
            <Text style={styles.statLabel}>Organizations</Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: COLORS.secondary + '15' }]}>
            <Users color={COLORS.secondary} size={28} />
            <Text style={styles.statValue}>{stats.totalUsers}</Text>
            <Text style={styles.statLabel}>Total Users</Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: COLORS.warning + '15' }]}>
            <Briefcase color={COLORS.warning} size={28} />
            <Text style={styles.statValue}>{stats.totalProjects}</Text>
            <Text style={styles.statLabel}>Projects</Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: COLORS.success + '15' }]}>
            <Database color={COLORS.success} size={28} />
            <Text style={styles.statValue}>{stats.totalAttendance}</Text>
            <Text style={styles.statLabel}>Attendance Records</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Organizations</Text>

        {organizations.length === 0 ? (
          <View style={styles.emptyState}>
            <Building2 color={COLORS.gray} size={48} />
            <Text style={styles.emptyText}>No organizations created yet</Text>
          </View>
        ) : (
          organizations.map((org) => (
            <View key={org.orgId} style={styles.orgCard}>
              <View style={styles.orgIcon}>
                <Building2 color={COLORS.primary} size={24} />
              </View>
              <View style={styles.orgInfo}>
                <Text style={styles.orgName}>{org.companyName}</Text>
                <Text style={styles.orgId}>ID: {org.orgId}</Text>
                <Text style={styles.orgDate}>
                  Created: {new Date(org.createdAt).toLocaleDateString()}
                </Text>
              </View>
            </View>
          ))
        )}
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
    backgroundColor: COLORS.dark,
    padding: 24,
    paddingTop: 48,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  developerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.danger,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: 'flex-start',
  },
  developerText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.white,
    marginTop: 8,
  },
  role: {
    fontSize: 14,
    color: COLORS.lightGray,
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  refreshButton: {
    padding: 8,
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
    marginTop: 8,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  statCard: {
    width: '48%',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  statValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: COLORS.text,
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.textLight,
    marginTop: 4,
    textAlign: 'center',
  },
  orgCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  orgIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  orgInfo: {
    flex: 1,
  },
  orgName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  orgId: {
    fontSize: 12,
    color: COLORS.textLight,
    marginTop: 2,
  },
  orgDate: {
    fontSize: 12,
    color: COLORS.textLight,
    marginTop: 2,
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.textLight,
    marginTop: 12,
  },
});

export default DeveloperDashboard;
