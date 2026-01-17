import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { X, Calendar, Clock, FileText, UserCheck, Briefcase } from 'lucide-react-native';
import { COLORS } from '../constants/colors';
import { useAuth } from '../contexts/AuthContext';
import {
  getUserById,
  getProjectById,
  getAttendanceByOrg,
  getWorkLogsByOrg,
  getDesignationById,
} from '../services/storageService';

const MemberProjectDetailScreen = ({ navigation, route }) => {
  const { session } = useAuth();
  const { memberId, memberName, projectId, projectName } = route.params;
  const [loading, setLoading] = useState(true);
  const [member, setMember] = useState(null);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [workLogs, setWorkLogs] = useState([]);
  const [stats, setStats] = useState({
    totalPresent: 0,
    totalAbsent: 0,
    totalWorkLogs: 0,
  });

  useEffect(() => {
    loadMemberProjectData();
  }, []);

  const loadMemberProjectData = async () => {
    try {
      setLoading(true);

      // Get member details
      const memberData = await getUserById(memberId);
      if (memberData.designationId) {
        const designation = await getDesignationById(memberData.designationId);
        memberData.designation = designation;
      }
      setMember(memberData);

      // Get all attendance for the org
      const allAttendance = await getAttendanceByOrg(session.orgId);

      // Filter for this member and project
      const memberAttendance = allAttendance.filter(
        (a) => a.userId === memberId && a.projectId === projectId
      );

      // Sort by date (newest first)
      memberAttendance.sort((a, b) => new Date(b.date) - new Date(a.date));
      setAttendanceRecords(memberAttendance);

      // Get all work logs for the org
      const allWorkLogs = await getWorkLogsByOrg(session.orgId);

      // Filter for this member and project
      const memberWorkLogs = allWorkLogs.filter(
        (w) => w.userId === memberId && w.projectId === projectId
      );

      // Sort by date (newest first)
      memberWorkLogs.sort((a, b) => new Date(b.date) - new Date(a.date));
      setWorkLogs(memberWorkLogs);

      // Calculate stats
      const presentCount = memberAttendance.filter(a => a.status === 'present').length;
      const absentCount = memberAttendance.filter(a => a.status === 'absent').length;

      setStats({
        totalPresent: presentCount,
        totalAbsent: absentCount,
        totalWorkLogs: memberWorkLogs.length,
      });
    } catch (error) {
      console.error('Error loading member project data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
            <X color={COLORS.text} size={24} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Member Details</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
          <X color={COLORS.text} size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {memberName}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Member Info Card */}
        <View style={styles.memberCard}>
          <View style={styles.memberAvatar}>
            <Text style={styles.memberAvatarText}>
              {memberName.charAt(0).toUpperCase()}
            </Text>
          </View>
          <Text style={styles.memberName}>{memberName}</Text>
          {member?.designation && (
            <View style={styles.designationBadge}>
              <Briefcase color={COLORS.primary} size={14} />
              <Text style={styles.designationText}>
                {member.designation.title || member.designation.name}
              </Text>
            </View>
          )}
          <View style={styles.projectBadge}>
            <Text style={styles.projectBadgeText}>{projectName}</Text>
          </View>
        </View>

        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <View style={styles.statIconContainer}>
              <UserCheck color={COLORS.success} size={24} />
            </View>
            <Text style={styles.statValue}>{stats.totalPresent}</Text>
            <Text style={styles.statLabel}>Days Present</Text>
          </View>

          <View style={styles.statCard}>
            <View style={styles.statIconContainer}>
              <X color={COLORS.danger} size={24} />
            </View>
            <Text style={styles.statValue}>{stats.totalAbsent}</Text>
            <Text style={styles.statLabel}>Days Absent</Text>
          </View>

          <View style={styles.statCard}>
            <View style={styles.statIconContainer}>
              <FileText color={COLORS.primary} size={24} />
            </View>
            <Text style={styles.statValue}>{stats.totalWorkLogs}</Text>
            <Text style={styles.statLabel}>Work Logs</Text>
          </View>
        </View>

        {/* Work Logs Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <FileText color={COLORS.text} size={18} />
            <Text style={styles.sectionTitle}>Work Logs</Text>
          </View>

          {workLogs.length === 0 ? (
            <View style={styles.emptyCard}>
              <FileText color={COLORS.gray} size={48} />
              <Text style={styles.emptyTitle}>No Work Logs</Text>
              <Text style={styles.emptyText}>
                This member hasn't logged any work for this project yet
              </Text>
            </View>
          ) : (
            workLogs.map((log, index) => (
              <View key={index} style={styles.logCard}>
                <View style={styles.logHeader}>
                  <View style={styles.logDateBadge}>
                    <Calendar color={COLORS.primary} size={14} />
                    <Text style={styles.logDate}>{formatDate(log.date)}</Text>
                  </View>
                  <Text style={styles.logTime}>{formatTime(log.date)}</Text>
                </View>
                <Text style={styles.logDescription}>{log.description}</Text>
              </View>
            ))
          )}
        </View>

        {/* Attendance Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <UserCheck color={COLORS.text} size={18} />
            <Text style={styles.sectionTitle}>Attendance History</Text>
          </View>

          {attendanceRecords.length === 0 ? (
            <View style={styles.emptyCard}>
              <UserCheck color={COLORS.gray} size={48} />
              <Text style={styles.emptyTitle}>No Attendance Records</Text>
              <Text style={styles.emptyText}>
                No attendance records found for this member on this project
              </Text>
            </View>
          ) : (
            attendanceRecords.map((record, index) => (
              <View key={index} style={styles.attendanceCard}>
                <View style={styles.attendanceLeft}>
                  <Calendar color={COLORS.gray} size={16} />
                  <Text style={styles.attendanceDate}>{formatDate(record.date)}</Text>
                </View>
                <View
                  style={[
                    styles.statusBadge,
                    record.status === 'present'
                      ? styles.statusPresent
                      : styles.statusAbsent,
                  ]}
                >
                  <Text
                    style={[
                      styles.statusText,
                      record.status === 'present'
                        ? styles.statusTextPresent
                        : styles.statusTextAbsent,
                    ]}
                  >
                    {record.status === 'present' ? 'Present' : 'Absent'}
                  </Text>
                </View>
              </View>
            ))
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
    paddingHorizontal: 16,
    paddingTop: 48,
    paddingBottom: 16,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    flex: 1,
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: COLORS.textLight,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  memberCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 20,
  },
  memberAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  memberAvatarText: {
    fontSize: 32,
    fontWeight: '700',
    color: COLORS.white,
  },
  memberName: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 8,
  },
  designationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary + '15',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    gap: 6,
    marginBottom: 12,
  },
  designationText: {
    fontSize: 13,
    color: COLORS.primary,
    fontWeight: '600',
  },
  projectBadge: {
    backgroundColor: COLORS.background,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  projectBadgeText: {
    fontSize: 13,
    color: COLORS.textLight,
    fontWeight: '500',
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 11,
    color: COLORS.textLight,
    fontWeight: '600',
    textAlign: 'center',
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },
  emptyCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 40,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 13,
    color: COLORS.textLight,
    textAlign: 'center',
  },
  logCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  logDateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.primary + '10',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  logDate: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primary,
  },
  logTime: {
    fontSize: 12,
    color: COLORS.textLight,
    fontWeight: '500',
  },
  logDescription: {
    fontSize: 15,
    color: COLORS.text,
    lineHeight: 22,
  },
  attendanceCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  attendanceLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  attendanceDate: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusPresent: {
    backgroundColor: COLORS.success + '20',
  },
  statusAbsent: {
    backgroundColor: COLORS.danger + '20',
  },
  statusText: {
    fontSize: 13,
    fontWeight: '600',
  },
  statusTextPresent: {
    color: COLORS.success,
  },
  statusTextAbsent: {
    color: COLORS.danger,
  },
});

export default MemberProjectDetailScreen;
