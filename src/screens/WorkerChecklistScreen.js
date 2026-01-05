import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { X, Save, Check, Users } from 'lucide-react-native';
import { COLORS } from '../constants/colors';
import { ROLES } from '../constants/roles';
import { useAuth } from '../contexts/AuthContext';
import { getProjectById, getUsersByOrg, updateProject } from '../services/storageService';

const WorkerChecklistScreen = ({ navigation, route }) => {
  const { session } = useAuth();
  const { projectId, onWorkersUpdated } = route.params;
  const [project, setProject] = useState(null);
  const [workers, setWorkers] = useState([]);
  const [selectedWorkers, setSelectedWorkers] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const projectData = await getProjectById(projectId);
      const allUsers = await getUsersByOrg(session.orgId);
      const workersList = allUsers.filter(user => user.role === ROLES.WORKER);

      setProject(projectData);
      setWorkers(workersList);
      setSelectedWorkers(projectData?.workers || []);
    } catch (error) {
      console.error('Error loading data:', error);
      Alert.alert('Error', 'Failed to load workers');
    }
  };

  const toggleWorker = (workerId) => {
    setSelectedWorkers(prev =>
      prev.includes(workerId)
        ? prev.filter(id => id !== workerId)
        : [...prev, workerId]
    );
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      await updateProject(projectId, { workers: selectedWorkers });

      setLoading(false);
      Alert.alert('Success!', 'Workers assigned successfully', [
        {
          text: 'OK',
          onPress: () => {
            if (onWorkersUpdated) onWorkersUpdated();
            navigation.goBack();
          },
        },
      ]);
    } catch (error) {
      setLoading(false);
      Alert.alert('Error', error.message || 'Failed to assign workers');
      console.error('Assign workers error:', error);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
          <X color={COLORS.text} size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Assign Workers</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.infoCard}>
          <Text style={styles.projectName}>{project?.projectName}</Text>
          <Text style={styles.selectedCount}>
            {selectedWorkers.length} worker{selectedWorkers.length !== 1 ? 's' : ''} selected
          </Text>
        </View>

        <Text style={styles.sectionTitle}>Available Workers</Text>

        {workers.length === 0 ? (
          <View style={styles.emptyState}>
            <Users color={COLORS.gray} size={48} />
            <Text style={styles.emptyText}>No workers available</Text>
            <Text style={styles.emptySubtext}>Add workers first to assign them to projects</Text>
          </View>
        ) : (
          workers.map((worker) => (
            <TouchableOpacity
              key={worker.userId}
              style={[
                styles.workerCard,
                selectedWorkers.includes(worker.userId) && styles.workerCardSelected,
              ]}
              onPress={() => toggleWorker(worker.userId)}
              activeOpacity={0.7}
            >
              <View style={styles.workerInfo}>
                <Text style={styles.workerName}>{worker.name}</Text>
                <Text style={styles.workerDetails}>@{worker.username}</Text>
                <Text style={styles.workerDetails}>{worker.phone}</Text>
              </View>
              {selectedWorkers.includes(worker.userId) && (
                <View style={styles.checkIcon}>
                  <Check color={COLORS.white} size={16} />
                </View>
              )}
            </TouchableOpacity>
          ))
        )}

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleSave}
          disabled={loading}
        >
          <Save color={COLORS.white} size={20} style={styles.buttonIcon} />
          <Text style={styles.buttonText}>
            {loading ? 'Saving...' : 'Save Worker Assignment'}
          </Text>
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
  },
  content: {
    flex: 1,
    padding: 24,
  },
  infoCard: {
    backgroundColor: COLORS.primary + '15',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  projectName: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
  },
  selectedCount: {
    fontSize: 14,
    color: COLORS.textLight,
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 16,
  },
  workerCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 2,
    borderColor: COLORS.border,
  },
  workerCardSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary + '05',
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
  checkIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 24,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 14,
    color: COLORS.textLight,
    marginTop: 4,
    textAlign: 'center',
  },
  button: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    marginBottom: 32,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonIcon: {
    marginRight: 8,
  },
  buttonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
});

export default WorkerChecklistScreen;
