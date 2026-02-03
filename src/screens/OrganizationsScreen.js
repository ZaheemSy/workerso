import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from 'react-native';
import { Building2, ChevronRight, Users, Briefcase } from 'lucide-react-native';
import { COLORS } from '../constants/colors';
import { getOrganizations, getUsersByOrg, getProjectsByOrg } from '../services/storageService';

// TODO: FIREBASE INTEGRATION
// When connecting to Firebase, replace AsyncStorage calls with:
// - Firestore collection: 'organizations'
// - Real-time listeners for live updates
// - Query: firestore().collection('organizations').orderBy('createdAt', 'desc')
// - Add pagination for large datasets
// - Add search/filter functionality

const OrganizationsScreen = ({ navigation }) => {
  const [organizations, setOrganizations] = useState([]);
  const [orgStats, setOrgStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadOrganizations();
  }, []);

  const loadOrganizations = async () => {
    try {
      setLoading(true);
      const orgs = await getOrganizations();

      // TODO: FIREBASE - Replace with Firestore batch read
      // Load stats for each organization
      const stats = {};
      for (const org of orgs) {
        const users = await getUsersByOrg(org.orgId);
        const projects = await getProjectsByOrg(org.orgId);

        stats[org.orgId] = {
          totalUsers: users.length,
          totalProjects: projects.length,
          superAdmins: users.filter(u => u.role === 'super_admin').length,
          admins: users.filter(u => u.role === 'admin').length,
          workers: users.filter(u => u.role === 'worker').length,
        };
      }

      setOrganizations(orgs);
      setOrgStats(stats);
    } catch (error) {
      console.error('Error loading organizations:', error);
      Alert.alert('Error', 'Failed to load organizations');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadOrganizations();
    setRefreshing(false);
  };

  const handleOrganizationPress = (organization) => {
    // TODO: FIREBASE - Pass orgId for real-time Firebase queries
    navigation.navigate('OrganizationDetail', {
      organization,
      orgId: organization.orgId
    });
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Organizations</Text>
          <Text style={styles.headerSubtitle}>
            {organizations.length} organization{organizations.length !== 1 ? 's' : ''}
          </Text>
        </View>
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {organizations.length === 0 ? (
          <View style={styles.emptyState}>
            <Building2 color={COLORS.gray} size={64} />
            <Text style={styles.emptyTitle}>No Organizations Yet</Text>
            <Text style={styles.emptyText}>
              Organizations will appear here once users create them
            </Text>
          </View>
        ) : (
          organizations.map((org) => {
            const stats = orgStats[org.orgId] || {};

            return (
              <TouchableOpacity
                key={org.orgId}
                style={styles.orgCard}
                onPress={() => handleOrganizationPress(org)}
                activeOpacity={0.7}
              >
                {/* Icon */}
                <View style={styles.orgIconContainer}>
                  <Building2 color="#6366F1" size={32} />
                </View>

                {/* Info */}
                <View style={styles.orgInfo}>
                  <Text style={styles.orgName}>{org.companyName}</Text>
                  <Text style={styles.orgId}>ID: {org.orgId}</Text>

                  {/* Stats Row */}
                  <View style={styles.statsRow}>
                    <View style={styles.statItem}>
                      <Users color="#6B7280" size={14} />
                      <Text style={styles.statText}>{stats.totalUsers || 0} users</Text>
                    </View>
                    <View style={styles.statItem}>
                      <Briefcase color="#6B7280" size={14} />
                      <Text style={styles.statText}>{stats.totalProjects || 0} projects</Text>
                    </View>
                  </View>

                  <Text style={styles.orgDate}>
                    Created: {new Date(org.createdAt).toLocaleDateString()}
                  </Text>
                </View>

                {/* Arrow */}
                <ChevronRight color="#9CA3AF" size={24} />
              </TouchableOpacity>
            );
          })
        )}

        <View style={{ height: 40 }} />
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
    backgroundColor: '#FFFFFF',
    padding: 20,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  orgCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  orgIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  orgInfo: {
    flex: 1,
  },
  orgName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  orgId: {
    fontSize: 11,
    color: '#9CA3AF',
    fontFamily: 'monospace',
    marginBottom: 8,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 6,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  orgDate: {
    fontSize: 12,
    color: '#9CA3AF',
  },
});

export default OrganizationsScreen;
