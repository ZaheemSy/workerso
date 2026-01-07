import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
  Alert,
} from 'react-native';
import { X, User, Mail, Phone, ShieldCheck, Clock, Users } from 'lucide-react-native';
import { COLORS } from '../constants/colors';
import { ROLES, ROLE_LABELS } from '../constants/roles';
import { useAuth } from '../contexts/AuthContext';
import { getUserById, updateUser, getUsersByAdmin, getUsers } from '../services/storageService';

const UserDetailScreen = ({ navigation, route }) => {
  const { userId } = route.params;
  const { session } = useAuth();
  const [user, setUser] = useState(null);
  const [requiresClockIn, setRequiresClockIn] = useState(false);
  const [workers, setWorkers] = useState([]);
  const [assignedAdmin, setAssignedAdmin] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUserDetails();
  }, []);

  const loadUserDetails = async () => {
    try {
      const userDetails = await getUserById(userId);
      setUser(userDetails);
      setRequiresClockIn(userDetails?.requiresClockIn || false);

      // If user is a worker and has an admin, load the admin details
      if (userDetails?.role === ROLES.WORKER && userDetails?.adminId) {
        const admin = await getUserById(userDetails.adminId);
        setAssignedAdmin(admin);
      }

      // If user is an admin, load their workers
      if (userDetails?.role === ROLES.ADMIN) {
        await loadWorkers(userId);
      }
    } catch (error) {
      console.error('Error loading user details:', error);
      Alert.alert('Error', 'Failed to load user details');
    } finally {
      setLoading(false);
    }
  };

  const loadWorkers = async (adminId) => {
    try {
      const allUsers = await getUsers();
      // Get workers assigned to this admin (adminId matches)
      const adminWorkers = allUsers.filter(
        u => u.role === ROLES.WORKER && u.adminId === adminId
      );
      setWorkers(adminWorkers);
    } catch (error) {
      console.error('Error loading workers:', error);
    }
  };

  const handleToggleClockIn = async (value) => {
    try {
      setRequiresClockIn(value);
      await updateUser(userId, { requiresClockIn: value });
      Alert.alert(
        'Success',
        `Clock-in requirement ${value ? 'enabled' : 'disabled'} for ${user.name}`
      );
    } catch (error) {
      console.error('Error updating clock-in requirement:', error);
      Alert.alert('Error', 'Failed to update clock-in requirement');
      setRequiresClockIn(!value); // Revert on error
    }
  };

  if (loading || !user) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
            <X color={COLORS.text} size={24} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>User Details</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
          <X color={COLORS.text} size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>User Details</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* User Info Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.iconContainer}>
              {user.role === ROLES.ADMIN ? (
                <ShieldCheck color={COLORS.primary} size={32} />
              ) : (
                <User color={COLORS.secondary} size={32} />
              )}
            </View>
            <View style={styles.cardHeaderText}>
              <Text style={styles.userName}>{user.name}</Text>
              <View
                style={[
                  styles.roleBadge,
                  user.role === ROLES.ADMIN ? styles.adminBadge : styles.workerBadge,
                ]}
              >
                <Text
                  style={[
                    styles.roleBadgeText,
                    user.role === ROLES.ADMIN ? styles.adminBadgeText : styles.workerBadgeText,
                  ]}
                >
                  {ROLE_LABELS[user.role]}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.infoRow}>
            <User color={COLORS.textLight} size={18} />
            <Text style={styles.infoLabel}>Username</Text>
            <Text style={styles.infoValue}>@{user.username}</Text>
          </View>

          <View style={styles.infoRow}>
            <Mail color={COLORS.textLight} size={18} />
            <Text style={styles.infoLabel}>Email</Text>
            <Text style={styles.infoValue}>{user.email}</Text>
          </View>

          <View style={styles.infoRow}>
            <Phone color={COLORS.textLight} size={18} />
            <Text style={styles.infoLabel}>Phone</Text>
            <Text style={styles.infoValue}>{user.phone}</Text>
          </View>
        </View>

        {/* Assigned Admin (for Workers) */}
        {user.role === ROLES.WORKER && assignedAdmin && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <ShieldCheck color={COLORS.primary} size={24} />
              <Text style={styles.cardTitle}>Assigned Admin</Text>
            </View>
            <View style={styles.adminAssignmentCard}>
              <View style={styles.workerIconContainer}>
                <ShieldCheck color={COLORS.primary} size={18} />
              </View>
              <View style={styles.workerInfo}>
                <Text style={styles.workerName}>{assignedAdmin.name}</Text>
                <Text style={styles.workerUsername}>@{assignedAdmin.username}</Text>
              </View>
            </View>
          </View>
        )}

        {/* Direct Under Super Admin (for Workers with no admin) */}
        {user.role === ROLES.WORKER && !assignedAdmin && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <ShieldCheck color={COLORS.primary} size={24} />
              <Text style={styles.cardTitle}>Reporting Structure</Text>
            </View>
            <Text style={styles.directReportText}>
              Reports directly to Super Admin
            </Text>
          </View>
        )}

        {/* Clock-In Requirement Toggle */}
        <View style={styles.card}>
          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <Clock color={COLORS.primary} size={24} />
              <View style={styles.settingText}>
                <Text style={styles.settingTitle}>Require Clock In/Out</Text>
                <Text style={styles.settingSubtitle}>
                  {requiresClockIn
                    ? `${user.name} must clock in and out daily`
                    : `${user.name} is not required to clock in`}
                </Text>
              </View>
            </View>
            <Switch
              value={requiresClockIn}
              onValueChange={handleToggleClockIn}
              trackColor={{ false: COLORS.lightGray, true: COLORS.primary + '50' }}
              thumbColor={requiresClockIn ? COLORS.primary : COLORS.gray}
            />
          </View>
        </View>

        {/* Workers List for Admins */}
        {user.role === ROLES.ADMIN && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Users color={COLORS.secondary} size={24} />
              <Text style={styles.cardTitle}>Assigned Workers</Text>
            </View>

            {workers.length === 0 ? (
              <View style={styles.emptyState}>
                <Users color={COLORS.gray} size={40} />
                <Text style={styles.emptyText}>No workers assigned</Text>
                <Text style={styles.emptySubtext}>
                  Workers will appear here when assigned to this admin
                </Text>
              </View>
            ) : (
              <>
                <Text style={styles.workersCount}>
                  {workers.length} worker{workers.length !== 1 ? 's' : ''} assigned
                </Text>
                {workers.map((worker) => (
                  <View key={worker.userId} style={styles.workerItem}>
                    <View style={styles.workerIconContainer}>
                      <User color={COLORS.secondary} size={18} />
                    </View>
                    <View style={styles.workerInfo}>
                      <Text style={styles.workerName}>{worker.name}</Text>
                      <Text style={styles.workerUsername}>@{worker.username}</Text>
                    </View>
                  </View>
                ))}
              </>
            )}
          </View>
        )}

        {/* Account Info */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Account Information</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Created</Text>
            <Text style={styles.infoValue}>
              {new Date(user.createdAt).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              })}
            </Text>
          </View>
          {user.updatedAt && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Last Updated</Text>
              <Text style={styles.infoValue}>
                {new Date(user.updatedAt).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })}
              </Text>
            </View>
          )}
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
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: COLORS.textLight,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  cardHeaderText: {
    flex: 1,
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 6,
  },
  roleBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  adminBadge: {
    backgroundColor: COLORS.primary + '15',
  },
  workerBadge: {
    backgroundColor: COLORS.secondary + '15',
  },
  roleBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  adminBadgeText: {
    color: COLORS.primary,
  },
  workerBadgeText: {
    color: COLORS.secondary,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginLeft: 8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  infoLabel: {
    fontSize: 14,
    color: COLORS.textLight,
    marginLeft: 12,
    flex: 1,
  },
  infoValue: {
    fontSize: 14,
    color: COLORS.text,
    fontWeight: '500',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingText: {
    marginLeft: 12,
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  settingSubtitle: {
    fontSize: 13,
    color: COLORS.textLight,
    marginTop: 2,
  },
  workersCount: {
    fontSize: 14,
    color: COLORS.textLight,
    marginBottom: 12,
  },
  workerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  workerIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.secondary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  workerInfo: {
    flex: 1,
  },
  workerName: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
  },
  workerUsername: {
    fontSize: 13,
    color: COLORS.textLight,
    marginTop: 2,
  },
  emptyState: {
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 13,
    color: COLORS.textLight,
    marginTop: 4,
    textAlign: 'center',
  },
  adminAssignmentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  directReportText: {
    fontSize: 14,
    color: COLORS.textLight,
    fontStyle: 'italic',
  },
});

export default UserDetailScreen;
