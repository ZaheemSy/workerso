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
import {
  Building2,
  ArrowLeft,
  Crown,
  Shield,
  Users,
  Briefcase,
  Calendar,
  UserCircle,
} from 'lucide-react-native';
import { COLORS } from '../constants/colors';
import { getUsersByOrg, getProjectsByOrg } from '../services/storageService';

// TODO: FIREBASE INTEGRATION NOTES
// ==========================================
// When migrating to Firebase Firestore:
//
// 1. ORGANIZATION DATA:
//    - Collection: 'organizations/{orgId}'
//    - Real-time listener: firestore().collection('organizations').doc(orgId).onSnapshot()
//
// 2. USERS DATA (Power Levels):
//    - Collection: 'users'
//    - Query Power1 (Super Admin):
//      firestore().collection('users').where('orgId', '==', orgId).where('role', '==', 'super_admin')
//    - Query Power2 (Admins):
//      firestore().collection('users').where('orgId', '==', orgId).where('role', '==', 'admin')
//    - Query Power3 (Workers/Employees):
//      firestore().collection('users').where('orgId', '==', orgId).where('role', 'in', ['worker', 'employee'])
//
// 3. PROJECTS DATA:
//    - Collection: 'projects'
//    - Query: firestore().collection('projects').where('orgId', '==', orgId).orderBy('createdAt', 'desc')
//
// 4. REAL-TIME UPDATES:
//    - Use onSnapshot() for live data
//    - Implement proper cleanup in useEffect return
//    - Handle loading states and errors
//
// 5. SECURITY RULES:
//    - Only developers and org members can view org details
//    - Implement proper Firestore security rules
// ==========================================

const OrganizationDetailScreen = ({ navigation, route }) => {
  const { organization, orgId } = route.params;

  const [users, setUsers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Power level categorization
  const [power1Users, setPower1Users] = useState([]); // Super Admins
  const [power2Users, setPower2Users] = useState([]); // Admins
  const [power3Users, setPower3Users] = useState([]); // Workers/Employees

  useEffect(() => {
    loadOrganizationDetails();
  }, [orgId]);

  const loadOrganizationDetails = async () => {
    try {
      setLoading(true);

      // TODO: FIREBASE - Replace with Firestore queries
      // const usersSnapshot = await firestore().collection('users').where('orgId', '==', orgId).get();
      // const projectsSnapshot = await firestore().collection('projects').where('orgId', '==', orgId).get();

      const [allUsers, allProjects] = await Promise.all([
        getUsersByOrg(orgId),
        getProjectsByOrg(orgId),
      ]);

      setUsers(allUsers);
      setProjects(allProjects);

      // Categorize users by power level
      const superAdmins = allUsers.filter(u => u.role === 'super_admin');
      const admins = allUsers.filter(u => u.role === 'admin');
      const workers = allUsers.filter(u => u.role === 'worker' || u.role === 'employee');

      setPower1Users(superAdmins);
      setPower2Users(admins);
      setPower3Users(workers);

    } catch (error) {
      console.error('Error loading organization details:', error);
      Alert.alert('Error', 'Failed to load organization details');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadOrganizationDetails();
    setRefreshing(false);
  };

  const renderUserCard = (user, powerLevel) => {
    let icon, bgColor, iconColor;

    if (powerLevel === 1) {
      icon = Crown;
      bgColor = '#FEF3C7';
      iconColor = '#F59E0B';
    } else if (powerLevel === 2) {
      icon = Shield;
      bgColor = '#DBEAFE';
      iconColor = '#3B82F6';
    } else {
      icon = UserCircle;
      bgColor = '#D1FAE5';
      iconColor = '#10B981';
    }

    const IconComponent = icon;

    return (
      <View key={user.userId} style={styles.userCard}>
        <View style={[styles.userIcon, { backgroundColor: bgColor }]}>
          <IconComponent color={iconColor} size={20} />
        </View>
        <View style={styles.userInfo}>
          <Text style={styles.userName}>{user.name}</Text>
          <Text style={styles.userRole}>{user.designation || user.role}</Text>
          {user.username && (
            <Text style={styles.userUsername}>@{user.username}</Text>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <ArrowLeft color="#111827" size={24} />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {organization.companyName}
          </Text>
          <Text style={styles.headerSubtitle}>Organization Details</Text>
        </View>
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Organization Info Card */}
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Building2 color="#6366F1" size={20} />
            <Text style={styles.infoLabel}>Organization ID</Text>
          </View>
          <Text style={styles.infoValue}>{organization.orgId}</Text>

          <View style={[styles.infoRow, { marginTop: 16 }]}>
            <Calendar color="#6366F1" size={20} />
            <Text style={styles.infoLabel}>Created On</Text>
          </View>
          <Text style={styles.infoValue}>
            {new Date(organization.createdAt).toLocaleString()}
          </Text>

          <View style={styles.statsGrid}>
            <View style={styles.statBox}>
              <Users color="#10B981" size={24} />
              <Text style={styles.statNumber}>{users.length}</Text>
              <Text style={styles.statLabel}>Total Users</Text>
            </View>
            <View style={styles.statBox}>
              <Briefcase color="#F59E0B" size={24} />
              <Text style={styles.statNumber}>{projects.length}</Text>
              <Text style={styles.statLabel}>Projects</Text>
            </View>
          </View>
        </View>

        {/* Projects Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Briefcase color="#111827" size={20} />
            <Text style={styles.sectionTitle}>Projects ({projects.length})</Text>
          </View>
          {projects.length === 0 ? (
            <Text style={styles.emptyText}>No projects created yet</Text>
          ) : (
            projects.map((project) => (
              <View key={project.projectId} style={styles.projectCard}>
                <Text style={styles.projectName}>{project.name}</Text>
                <Text style={styles.projectDate}>
                  Created: {new Date(project.createdAt).toLocaleDateString()}
                </Text>
              </View>
            ))
          )}
        </View>

        {/* Power1 - Super Admins Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Crown color="#F59E0B" size={20} />
            <Text style={styles.sectionTitle}>
              Power1 - Super Admin{power1Users.length !== 1 ? 's' : ''} ({power1Users.length})
            </Text>
          </View>
          <Text style={styles.sectionDescription}>
            Highest authority with full organizational control
          </Text>
          {power1Users.length === 0 ? (
            <Text style={styles.emptyText}>No super admins assigned</Text>
          ) : (
            power1Users.map(user => renderUserCard(user, 1))
          )}
        </View>

        {/* Power2 - Admins Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Shield color="#3B82F6" size={20} />
            <Text style={styles.sectionTitle}>
              Power2 - Admin{power2Users.length !== 1 ? 's' : ''} ({power2Users.length})
            </Text>
          </View>
          <Text style={styles.sectionDescription}>
            Administrative access with management capabilities
          </Text>
          {power2Users.length === 0 ? (
            <Text style={styles.emptyText}>No admins assigned</Text>
          ) : (
            power2Users.map(user => renderUserCard(user, 2))
          )}
        </View>

        {/* Power3 - Workers/Employees Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <UserCircle color="#10B981" size={20} />
            <Text style={styles.sectionTitle}>
              Power3 - Member{power3Users.length !== 1 ? 's' : ''} ({power3Users.length})
            </Text>
          </View>
          <Text style={styles.sectionDescription}>
            Workers and employees with standard access
          </Text>
          {power3Users.length === 0 ? (
            <Text style={styles.emptyText}>No members assigned</Text>
          ) : (
            power3Users.map(user => renderUserCard(user, 3))
          )}
        </View>

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
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
    textTransform: 'uppercase',
  },
  infoValue: {
    fontSize: 14,
    color: '#111827',
    fontFamily: 'monospace',
    marginTop: 6,
    marginLeft: 28,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111827',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  sectionDescription: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 12,
    marginLeft: 28,
  },
  emptyText: {
    fontSize: 14,
    color: '#9CA3AF',
    fontStyle: 'italic',
    marginLeft: 28,
    marginTop: 4,
  },
  projectCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  projectName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  projectDate: {
    fontSize: 12,
    color: '#6B7280',
  },
  userCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  userIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  userRole: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  userUsername: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
    fontFamily: 'monospace',
  },
});

export default OrganizationDetailScreen;
