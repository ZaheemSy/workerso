import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
} from 'react-native';
import { Users, X, Save, Check, Briefcase } from 'lucide-react-native';
import { COLORS } from '../constants/colors';
import { ROLES } from '../constants/roles';
import { useAuth } from '../contexts/AuthContext';
import { createGroup, getUsersByOrg, getDesignationsByOrg } from '../services/storageService';

const CreateWorkerGroupScreen = ({ navigation, route }) => {
  const { session } = useAuth();
  const { onGroupCreated } = route.params || {};
  const [groupName, setGroupName] = useState('');
  const [workers, setWorkers] = useState([]);
  const [selectedWorkers, setSelectedWorkers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [designations, setDesignations] = useState([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Load workers
      const allUsers = await getUsersByOrg(session.orgId);
      const workersList = allUsers.filter(user => user.role === ROLES.WORKER);
      setWorkers(workersList);

      // Load designations
      const designationsList = await getDesignationsByOrg(session.orgId);
      setDesignations(designationsList);
    } catch (error) {
      console.error('Error loading data:', error);
      Alert.alert('Error', 'Failed to load workers');
    }
  };

  const getDesignationName = (designationId) => {
    const designation = designations.find(d => d.designationId === designationId);
    return designation ? designation.name : null;
  };

  const toggleWorker = (workerId) => {
    setSelectedWorkers(prev =>
      prev.includes(workerId)
        ? prev.filter(id => id !== workerId)
        : [...prev, workerId]
    );
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      Alert.alert('Error', 'Please enter a group name');
      return;
    }

    setLoading(true);
    try {
      const group = await createGroup({
        orgId: session.orgId,
        groupName: groupName.trim(),
        workers: selectedWorkers,
      });

      if (!group) {
        throw new Error('Failed to create group');
      }

      setLoading(false);
      Alert.alert('Success!', 'Worker group created successfully', [
        {
          text: 'OK',
          onPress: () => {
            if (onGroupCreated) onGroupCreated();
            navigation.goBack();
          },
        },
      ]);
    } catch (error) {
      setLoading(false);
      Alert.alert('Error', error.message || 'Failed to create worker group');
      console.error('Create group error:', error);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
          <X color={COLORS.text} size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create Group</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionTitle}>Group Name</Text>

        <View style={styles.inputContainer}>
          <Users color={COLORS.gray} size={20} style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="e.g., Carpenters, Painters, Team A"
            placeholderTextColor={COLORS.gray}
            value={groupName}
            onChangeText={setGroupName}
            autoCapitalize="words"
          />
        </View>

        <Text style={styles.sectionTitle}>Select Workers</Text>
        <Text style={styles.sectionSubtitle}>
          {selectedWorkers.length} worker{selectedWorkers.length !== 1 ? 's' : ''} selected
        </Text>

        {workers.length === 0 ? (
          <View style={styles.emptyState}>
            <Users color={COLORS.gray} size={48} />
            <Text style={styles.emptyText}>No workers available</Text>
            <Text style={styles.emptySubtext}>Add workers first to create a group</Text>
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
                <Text style={styles.workerUsername}>@{worker.username}</Text>
                {worker.designationId && getDesignationName(worker.designationId) && (
                  <View style={styles.designationBadge}>
                    <Briefcase color={COLORS.primary} size={12} />
                    <Text style={styles.designationText}>
                      {getDesignationName(worker.designationId)}
                    </Text>
                  </View>
                )}
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
          onPress={handleCreateGroup}
          disabled={loading || !groupName.trim()}
        >
          <Save color={COLORS.white} size={20} style={styles.buttonIcon} />
          <Text style={styles.buttonText}>
            {loading ? 'Creating...' : 'Create Group'}
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
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 12,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: COLORS.textLight,
    marginBottom: 16,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 16,
    marginBottom: 24,
    height: 56,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: COLORS.text,
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
  workerUsername: {
    fontSize: 14,
    color: COLORS.textLight,
    marginTop: 2,
  },
  designationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  designationText: {
    fontSize: 12,
    color: COLORS.primary,
    marginLeft: 4,
    fontWeight: '500',
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

export default CreateWorkerGroupScreen;
