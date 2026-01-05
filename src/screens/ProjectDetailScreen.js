import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { X, Briefcase, Users, Calendar, Camera, FileText, UserPlus } from 'lucide-react-native';
import { COLORS } from '../constants/colors';
import { useAuth } from '../contexts/AuthContext';
import { getProjectById, getUserById, getAttendanceByOrg, getWorkLogsByOrg } from '../services/storageService';

const ProjectDetailScreen = ({ navigation, route }) => {
  const { session } = useAuth();
  const { projectId, onProjectUpdated } = route.params;
  const [project, setProject] = useState(null);
  const [workers, setWorkers] = useState([]);
  const [stats, setStats] = useState({ attendance: 0, workLogs: 0, siteLogs: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProjectDetails();
  }, []);

  const loadProjectDetails = async () => {
    setLoading(true);
    try {
      const projectData = await getProjectById(projectId);

      if (projectData) {
        setProject(projectData);

        const workerDetails = await Promise.all(
          (projectData.workers || []).map(async (workerId) => {
            const worker = await getUserById(workerId);
            return worker;
          })
        );
        setWorkers(workerDetails.filter(w => w !== null));

        const attendance = await getAttendanceByOrg(session.orgId);
        const workLogs = await getWorkLogsByOrg(session.orgId);

        const projectAttendance = attendance.filter(a => a.projectId === projectId);
        const projectWorkLogs = workLogs.filter(w => w.projectId === projectId);

        setStats({
          attendance: projectAttendance.length,
          workLogs: projectWorkLogs.length,
          siteLogs: projectData.siteLogs?.length || 0,
        });
      }
    } catch (error) {
      console.error('Error loading project details:', error);
      Alert.alert('Error', 'Failed to load project details');
    } finally {
      setLoading(false);
    }
  };

  if (!project) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
            <X color={COLORS.text} size={24} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Project Details</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>Project not found</Text>
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
        <Text style={styles.headerTitle}>{project.projectName}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.infoCard}>
          <View style={styles.infoIcon}>
            <Briefcase color={COLORS.primary} size={32} />
          </View>
          <Text style={styles.infoTitle}>{project.projectName}</Text>
          {project.description && (
            <Text style={styles.infoDescription}>{project.description}</Text>
          )}
          {project.startDate && (
            <View style={styles.dateContainer}>
              <Calendar color={COLORS.textLight} size={16} />
              <Text style={styles.dateText}>
                Started: {new Date(project.startDate).toLocaleDateString()}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.statsGrid}>
          <View style={[styles.statCard, { backgroundColor: COLORS.primary + '15' }]}>
            <Users color={COLORS.primary} size={24} />
            <Text style={styles.statValue}>{workers.length}</Text>
            <Text style={styles.statLabel}>Workers</Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: COLORS.secondary + '15' }]}>
            <Camera color={COLORS.secondary} size={24} />
            <Text style={styles.statValue}>{stats.attendance}</Text>
            <Text style={styles.statLabel}>Attendance</Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: COLORS.warning + '15' }]}>
            <FileText color={COLORS.warning} size={24} />
            <Text style={styles.statValue}>{stats.workLogs}</Text>
            <Text style={styles.statLabel}>Work Logs</Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: COLORS.success + '15' }]}>
            <Camera color={COLORS.success} size={24} />
            <Text style={styles.statValue}>{stats.siteLogs}</Text>
            <Text style={styles.statLabel}>Site Logs</Text>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Workers ({workers.length})</Text>
            <TouchableOpacity
              onPress={() =>
                navigation.navigate('WorkerChecklist', {
                  projectId: project.projectId,
                  onWorkersUpdated: () => {
                    if (onProjectUpdated) onProjectUpdated();
                    loadProjectDetails();
                  },
                })
              }
              style={styles.addButton}
            >
              <UserPlus color={COLORS.primary} size={20} />
            </TouchableOpacity>
          </View>

          {workers.length === 0 ? (
            <View style={styles.emptyBox}>
              <Users color={COLORS.gray} size={32} />
              <Text style={styles.emptyBoxText}>No workers assigned</Text>
              <TouchableOpacity
                style={styles.emptyBoxButton}
                onPress={() =>
                  navigation.navigate('WorkerChecklist', {
                    projectId: project.projectId,
                    onWorkersUpdated: () => {
                      if (onProjectUpdated) onProjectUpdated();
                      loadProjectDetails();
                    },
                  })
                }
              >
                <Text style={styles.emptyBoxButtonText}>Assign Workers</Text>
              </TouchableOpacity>
            </View>
          ) : (
            workers.map((worker) => (
              <View key={worker.userId} style={styles.workerCard}>
                <View style={styles.workerInfo}>
                  <Text style={styles.workerName}>{worker.name}</Text>
                  <Text style={styles.workerDetails}>@{worker.username}</Text>
                </View>
              </View>
            ))
          )}
        </View>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => navigation.navigate('WorksitePhotoUpload', { projectId: project.projectId })}
        >
          <Camera color={COLORS.white} size={20} />
          <Text style={styles.actionButtonText}>Add Site Update</Text>
        </TouchableOpacity>
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
    flex: 1,
    textAlign: 'center',
  },
  content: {
    flex: 1,
    padding: 24,
  },
  infoCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  infoIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  infoTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
    textAlign: 'center',
  },
  infoDescription: {
    fontSize: 14,
    color: COLORS.textLight,
    marginTop: 8,
    textAlign: 'center',
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 6,
  },
  dateText: {
    fontSize: 14,
    color: COLORS.textLight,
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
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.text,
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.textLight,
    marginTop: 4,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
  },
  addButton: {
    padding: 8,
  },
  workerCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  workerInfo: {
    flex: 1,
  },
  workerName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  workerDetails: {
    fontSize: 14,
    color: COLORS.textLight,
    marginTop: 2,
  },
  emptyBox: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  emptyBoxText: {
    fontSize: 14,
    color: COLORS.textLight,
    marginTop: 8,
  },
  emptyBoxButton: {
    backgroundColor: COLORS.primary + '15',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginTop: 12,
  },
  emptyBoxButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
    marginTop: 80,
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.textLight,
  },
  actionButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 32,
  },
  actionButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ProjectDetailScreen;
