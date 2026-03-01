import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  Pressable,
} from 'react-native';
import {
  Code,
  Database,
  Users,
  Building2,
  Briefcase,
  LogOut,
  RefreshCw,
  Play,
  UserCircle,
  Sparkles,
  X,
} from 'lucide-react-native';
import { COLORS } from '../constants/colors';
import { useAuth } from '../contexts/AuthContext';
import {
  getOrganizations,
  getUsers,
  getProjects,
  getAttendanceByOrg,
  getWorkLogsByOrg,
} from '../services/storageService';
import SplashScreen from './SplashScreen';

const DeveloperDashboard = ({ navigation }) => {
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
  const [showSplashModal, setShowSplashModal] = useState(false);
  const [tapCount, setTapCount] = useState(0);

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

  const handleSplashTap = () => {
    const newCount = tapCount + 1;
    setTapCount(newCount);

    if (newCount >= 5) {
      setShowSplashModal(false);
      setTapCount(0);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          {/* Developer Avatar */}
          <View style={styles.avatarContainer}>
            <UserCircle color="#10B981" size={42} strokeWidth={2.5} />
          </View>

          {/* Name and Info */}
          <View style={styles.headerInfo}>
            <View style={styles.nameRow}>
              <Text style={styles.developerName}>Zaheem</Text>
              <Sparkles color="#F59E0B" size={20} fill="#F59E0B" />
            </View>
            <View style={styles.badgeRow}>
              <View style={styles.roleBadge}>
                <Code color="#10B981" size={12} />
                <Text style={styles.roleText}>Developer</Text>
              </View>
              <View style={styles.accessBadge}>
                <Text style={styles.accessText}>Full Access</Text>
              </View>
            </View>
            <Text style={styles.subtitle}>System Overview & Control</Text>
          </View>
        </View>

        {/* Action Buttons Row */}
        <View style={styles.headerActions}>
          <TouchableOpacity
            onPress={() => setShowSplashModal(true)}
            style={styles.playButton}
          >
            <Play color="#10B981" size={20} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={loadDeveloperData}
            style={styles.refreshButton}
          >
            <RefreshCw color="#6366F1" size={20} />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
            <LogOut color="#EF4444" size={20} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionTitle}>System Statistics</Text>

        <View style={styles.statsGrid}>
          <View
            style={[
              styles.statCard,
              { backgroundColor: COLORS.primary + '15' },
            ]}
          >
            <Building2 color={COLORS.primary} size={28} />
            <Text style={styles.statValue}>{stats.totalOrgs}</Text>
            <Text style={styles.statLabel}>Organizations</Text>
          </View>

          <View
            style={[
              styles.statCard,
              { backgroundColor: COLORS.secondary + '15' },
            ]}
          >
            <Users color={COLORS.secondary} size={28} />
            <Text style={styles.statValue}>{stats.totalUsers}</Text>
            <Text style={styles.statLabel}>Total Users</Text>
          </View>

          <View
            style={[
              styles.statCard,
              { backgroundColor: COLORS.warning + '15' },
            ]}
          >
            <Briefcase color={COLORS.warning} size={28} />
            <Text style={styles.statValue}>{stats.totalProjects}</Text>
            <Text style={styles.statLabel}>Projects</Text>
          </View>

          <View
            style={[
              styles.statCard,
              { backgroundColor: COLORS.success + '15' },
            ]}
          >
            <Database color={COLORS.success} size={28} />
            <Text style={styles.statValue}>{stats.totalAttendance}</Text>
            <Text style={styles.statLabel}>Attendance Records</Text>
          </View>
        </View>

        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Organizations</Text>
          {organizations.length > 0 && (
            <TouchableOpacity
              onPress={() => navigation.navigate('Organizations')}
              style={styles.viewAllButton}
            >
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          )}
        </View>

        {organizations.length === 0 ? (
          <TouchableOpacity
            onPress={() => navigation.navigate('Organizations')}
            style={styles.emptyState}
            activeOpacity={0.7}
          >
            <Building2 color={COLORS.gray} size={48} />
            <Text style={styles.emptyText}>No organizations created yet</Text>
            <Text style={styles.emptySubtext}>Tap to view organizations</Text>
          </TouchableOpacity>
        ) : (
          organizations.slice(0, 3).map(org => (
            <TouchableOpacity
              key={org.orgId}
              style={styles.orgCard}
              onPress={() => navigation.navigate('OrganizationDetail', { organization: org, orgId: org.orgId })}
              activeOpacity={0.7}
            >
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
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {/* Splash Screen Preview Modal */}
      <Modal
        visible={showSplashModal}
        transparent={false}
        animationType="fade"
        onRequestClose={() => {
          setShowSplashModal(false);
          setTapCount(0);
        }}
      >
        <View style={styles.splashModalContainer}>
          <Pressable style={styles.splashModalWrapper} onPress={handleSplashTap}>
            <SplashScreen />
            <Text style={styles.tapCounter}>
              Tap {5 - tapCount} more time{5 - tapCount !== 1 ? 's' : ''} to close
            </Text>
          </Pressable>
          <TouchableOpacity
            style={styles.splashCloseBtn}
            onPress={() => {
              setShowSplashModal(false);
              setTapCount(0);
            }}
          >
            <X color={COLORS.text} size={22} />
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    backgroundColor: '#1F2937',
    padding: 20,
    paddingTop: 50,
    borderBottomWidth: 3,
    borderBottomColor: '#10B981',
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  avatarContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#374151',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#10B981',
    flexShrink: 0,
  },
  headerInfo: {
    flex: 1,
    minWidth: 0,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  developerName: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 4,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#064E3B',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  roleText: {
    color: '#10B981',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  accessBadge: {
    backgroundColor: '#1E3A8A',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  accessText: {
    color: '#60A5FA',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  subtitle: {
    fontSize: 13,
    color: '#9CA3AF',
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  playButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#064E3B',
    borderRadius: 10,
  },
  refreshButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#312E81',
    borderRadius: 10,
  },
  logoutButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#7F1D1D',
    borderRadius: 10,
  },
  content: {
    flex: 1,
    padding: 24,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
  },
  viewAllButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#EEF2FF',
    borderRadius: 8,
  },
  viewAllText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6366F1',
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
  emptySubtext: {
    fontSize: 12,
    color: COLORS.gray,
    marginTop: 8,
    fontStyle: 'italic',
  },
  splashModalContainer: {
    flex: 1,
  },
  splashModalWrapper: {
    flex: 1,
  },
  splashCloseBtn: {
    position: 'absolute',
    top: 48,
    right: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tapCounter: {
    position: 'absolute',
    bottom: 50,
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '600',
    alignSelf: 'center',
  },
});

export default DeveloperDashboard;
