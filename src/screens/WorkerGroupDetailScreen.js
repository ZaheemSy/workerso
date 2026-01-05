import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { X, Users, Trash2, UserMinus } from 'lucide-react-native';
import { COLORS } from '../constants/colors';
import { useAuth } from '../contexts/AuthContext';
import { getGroupsByOrg, getUserById, updateGroup } from '../services/storageService';

const WorkerGroupDetailScreen = ({ navigation, route }) => {
  const { session } = useAuth();
  const { groupId, onGroupUpdated } = route.params;
  const [group, setGroup] = useState(null);
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadGroupDetails();
  }, []);

  const loadGroupDetails = async () => {
    setLoading(true);
    try {
      const groups = await getGroupsByOrg(session.orgId);
      const currentGroup = groups.find(g => g.groupId === groupId);

      if (currentGroup) {
        setGroup(currentGroup);

        const workerDetails = await Promise.all(
          (currentGroup.workers || []).map(async (workerId) => {
            const worker = await getUserById(workerId);
            return worker;
          })
        );
        setWorkers(workerDetails.filter(w => w !== null));
      }
    } catch (error) {
      console.error('Error loading group details:', error);
      Alert.alert('Error', 'Failed to load group details');
    } finally {
      setLoading(false);
    }
  };

  const removeWorkerFromGroup = async (workerId) => {
    Alert.alert(
      'Remove Worker',
      'Are you sure you want to remove this worker from the group?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              const updatedWorkers = group.workers.filter(id => id !== workerId);
              await updateGroup(groupId, { workers: updatedWorkers });
              if (onGroupUpdated) onGroupUpdated();
              loadGroupDetails();
              Alert.alert('Success', 'Worker removed from group');
            } catch (error) {
              console.error('Error removing worker:', error);
              Alert.alert('Error', 'Failed to remove worker');
            }
          },
        },
      ]
    );
  };

  if (!group) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
            <X color={COLORS.text} size={24} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Group Details</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>Group not found</Text>
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
        <Text style={styles.headerTitle}>{group.groupName}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.infoCard}>
          <View style={styles.infoIcon}>
            <Users color={COLORS.primary} size={32} />
          </View>
          <Text style={styles.infoTitle}>{group.groupName}</Text>
          <Text style={styles.infoSubtitle}>
            {workers.length} {workers.length === 1 ? 'worker' : 'workers'} in this group
          </Text>
        </View>

        <Text style={styles.sectionTitle}>Workers</Text>

        {workers.length === 0 ? (
          <View style={styles.emptyState}>
            <Users color={COLORS.gray} size={48} />
            <Text style={styles.emptyText}>No workers in this group</Text>
          </View>
        ) : (
          workers.map((worker) => (
            <View key={worker.userId} style={styles.workerCard}>
              <View style={styles.workerInfo}>
                <Text style={styles.workerName}>{worker.name}</Text>
                <Text style={styles.workerDetails}>@{worker.username}</Text>
                <Text style={styles.workerDetails}>{worker.phone}</Text>
              </View>
              <TouchableOpacity
                onPress={() => removeWorkerFromGroup(worker.userId)}
                style={styles.removeButton}
              >
                <UserMinus color={COLORS.danger} size={20} />
              </TouchableOpacity>
            </View>
          ))
        )}
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
  },
  infoSubtitle: {
    fontSize: 14,
    color: COLORS.textLight,
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 18,
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
  removeButton: {
    padding: 8,
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
});

export default WorkerGroupDetailScreen;
