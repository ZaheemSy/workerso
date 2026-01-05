import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { X, BarChart3, Users, Camera, FileText, Briefcase, TrendingUp } from 'lucide-react-native';
import { COLORS } from '../constants/colors';
import { useAuth } from '../contexts/AuthContext';
import {
  getUsersByOrg,
  getProjectsByOrg,
  getAttendanceByOrg,
  getWorkLogsByOrg,
  getGroupsByOrg,
} from '../services/storageService';
import { ROLES } from '../constants/roles';

const ReportsScreen = ({ navigation }) => {
  const { session } = useAuth();
  const [stats, setStats] = useState({
    totalWorkers: 0,
    totalAdmins: 0,
    totalProjects: 0,
    totalAttendance: 0,
    totalWorkLogs: 0,
    totalGroups: 0,
    totalWorkHours: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStatistics();
  }, []);

  const loadStatistics = async () => {
    setLoading(true);
    try {
      const users = await getUsersByOrg(session.orgId);
      const projects = await getProjectsByOrg(session.orgId);
      const attendance = await getAttendanceByOrg(session.orgId);
      const workLogs = await getWorkLogsByOrg(session.orgId);
      const groups = await getGroupsByOrg(session.orgId);

      const totalHours = workLogs.reduce((sum, log) => sum + (log.totalHours || 0), 0);

      setStats({
        totalWorkers: users.filter(u => u.role === ROLES.WORKER).length,
        totalAdmins: users.filter(u => u.role === ROLES.ADMIN).length,
        totalProjects: projects.length,
        totalAttendance: attendance.length,
        totalWorkLogs: workLogs.length,
        totalGroups: groups.length,
        totalWorkHours: totalHours.toFixed(1),
      });
    } catch (error) {
      console.error('Error loading statistics:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
          <X color={COLORS.text} size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Reports & Analytics</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.headerCard}>
          <BarChart3 color={COLORS.primary} size={48} />
          <Text style={styles.headerCardTitle}>Organization Overview</Text>
          <Text style={styles.headerCardSubtitle}>
            Complete statistics and insights
          </Text>
        </View>

        <Text style={styles.sectionTitle}>Team Statistics</Text>

        <View style={styles.statsGrid}>
          <View style={[styles.statCard, { backgroundColor: COLORS.primary + '15' }]}>
            <Users color={COLORS.primary} size={28} />
            <Text style={styles.statValue}>{stats.totalWorkers}</Text>
            <Text style={styles.statLabel}>Workers</Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: COLORS.secondary + '15' }]}>
            <Users color={COLORS.secondary} size={28} />
            <Text style={styles.statValue}>{stats.totalAdmins}</Text>
            <Text style={styles.statLabel}>Admins</Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: COLORS.warning + '15' }]}>
            <Users color={COLORS.warning} size={28} />
            <Text style={styles.statValue}>{stats.totalGroups}</Text>
            <Text style={styles.statLabel}>Worker Groups</Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: COLORS.success + '15' }]}>
            <Briefcase color={COLORS.success} size={28} />
            <Text style={styles.statValue}>{stats.totalProjects}</Text>
            <Text style={styles.statLabel}>Projects</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Activity Statistics</Text>

        <View style={styles.statsGrid}>
          <View style={[styles.statCard, { backgroundColor: COLORS.primary + '15' }]}>
            <Camera color={COLORS.primary} size={28} />
            <Text style={styles.statValue}>{stats.totalAttendance}</Text>
            <Text style={styles.statLabel}>Attendance Records</Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: COLORS.secondary + '15' }]}>
            <FileText color={COLORS.secondary} size={28} />
            <Text style={styles.statValue}>{stats.totalWorkLogs}</Text>
            <Text style={styles.statLabel}>Work Logs</Text>
          </View>
        </View>

        <View style={styles.highlightCard}>
          <View style={styles.highlightIcon}>
            <TrendingUp color={COLORS.success} size={32} />
          </View>
          <View style={styles.highlightContent}>
            <Text style={styles.highlightLabel}>Total Work Hours</Text>
            <Text style={styles.highlightValue}>{stats.totalWorkHours} hrs</Text>
          </View>
        </View>

        <View style={styles.infoBox}>
          <Text style={styles.infoText}>
            Detailed analytics and export functionality will be added in future updates.
          </Text>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingTop: 48,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
  },
  content: {
    flex: 1,
    padding: 24,
  },
  headerCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  headerCardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
    marginTop: 12,
  },
  headerCardSubtitle: {
    fontSize: 14,
    color: COLORS.textLight,
    marginTop: 4,
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
    marginBottom: 12,
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
  highlightCard: {
    backgroundColor: COLORS.success + '15',
    borderRadius: 12,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  highlightIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  highlightContent: {
    flex: 1,
  },
  highlightLabel: {
    fontSize: 14,
    color: COLORS.textLight,
    marginBottom: 4,
  },
  highlightValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: COLORS.success,
  },
  infoBox: {
    backgroundColor: COLORS.primary + '10',
    borderRadius: 12,
    padding: 16,
    marginBottom: 32,
  },
  infoText: {
    fontSize: 14,
    color: COLORS.primary,
    lineHeight: 20,
    textAlign: 'center',
  },
});

export default ReportsScreen;
