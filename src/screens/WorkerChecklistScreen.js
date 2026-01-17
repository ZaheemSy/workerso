import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, TextInput } from 'react-native';
import { X, Save, Check, Users, Search } from 'lucide-react-native';
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
  const [searchQuery, setSearchQuery] = useState('');

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

  const getFilteredWorkers = () => {
    if (!searchQuery.trim()) {
      return workers;
    }
    const query = searchQuery.toLowerCase();
    return workers.filter(
      worker =>
        worker.name?.toLowerCase().includes(query) ||
        worker.username?.toLowerCase().includes(query) ||
        worker.phone?.toLowerCase().includes(query)
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

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Search color={COLORS.gray} size={20} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search workers by name, username, or phone..."
            placeholderTextColor={COLORS.gray}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <X color={COLORS.gray} size={20} />
            </TouchableOpacity>
          )}
        </View>

        <Text style={styles.sectionTitle}>Available Workers</Text>

        {workers.length === 0 ? (
          <View style={styles.emptyState}>
            <Users color={COLORS.gray} size={48} />
            <Text style={styles.emptyText}>No workers available</Text>
            <Text style={styles.emptySubtext}>Add workers first to assign them to projects</Text>
          </View>
        ) : getFilteredWorkers().length === 0 ? (
          <View style={styles.emptyState}>
            <Users color={COLORS.gray} size={48} />
            <Text style={styles.emptyText}>No workers found</Text>
            <Text style={styles.emptySubtext}>Try adjusting your search</Text>
          </View>
        ) : (
          getFilteredWorkers().map((worker) => (
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 24,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: COLORS.text,
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
