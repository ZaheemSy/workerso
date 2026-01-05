import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Users, Plus, X, ChevronRight } from 'lucide-react-native';
import { COLORS } from '../constants/colors';
import { useAuth } from '../contexts/AuthContext';
import { getGroupsByOrg, getUsersByOrg } from '../services/storageService';

const WorkerGroupListScreen = ({ navigation }) => {
  const { session } = useAuth();
  const [groups, setGroups] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadGroups();
  }, []);

  const loadGroups = async () => {
    setLoading(true);
    try {
      const groupData = await getGroupsByOrg(session.orgId);
      const workerData = await getUsersByOrg(session.orgId);
      setGroups(groupData);
      setWorkers(workerData);
    } catch (error) {
      console.error('Error loading groups:', error);
      Alert.alert('Error', 'Failed to load worker groups');
    } finally {
      setLoading(false);
    }
  };

  const getWorkerCount = (groupId) => {
    const group = groups.find(g => g.groupId === groupId);
    return group?.workers?.length || 0;
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
          <X color={COLORS.text} size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Worker Groups</Text>
        <TouchableOpacity
          onPress={() => navigation.navigate('CreateWorkerGroup', { onGroupCreated: loadGroups })}
          style={styles.headerButton}
        >
          <Plus color={COLORS.primary} size={24} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {groups.length === 0 ? (
          <View style={styles.emptyState}>
            <Users color={COLORS.gray} size={64} />
            <Text style={styles.emptyTitle}>No Worker Groups</Text>
            <Text style={styles.emptyText}>Create groups to organize workers by teams or skills</Text>
            <TouchableOpacity
              style={styles.emptyButton}
              onPress={() => navigation.navigate('CreateWorkerGroup', { onGroupCreated: loadGroups })}
            >
              <Plus color={COLORS.white} size={20} style={styles.buttonIcon} />
              <Text style={styles.emptyButtonText}>Create First Group</Text>
            </TouchableOpacity>
          </View>
        ) : (
          groups.map((group) => (
            <TouchableOpacity
              key={group.groupId}
              style={styles.groupCard}
              onPress={() => navigation.navigate('WorkerGroupDetail', { groupId: group.groupId, onGroupUpdated: loadGroups })}
              activeOpacity={0.7}
            >
              <View style={styles.groupIcon}>
                <Users color={COLORS.primary} size={24} />
              </View>
              <View style={styles.groupInfo}>
                <Text style={styles.groupName}>{group.groupName}</Text>
                <Text style={styles.groupCount}>
                  {getWorkerCount(group.groupId)} {getWorkerCount(group.groupId) === 1 ? 'worker' : 'workers'}
                </Text>
              </View>
              <ChevronRight color={COLORS.gray} size={20} />
            </TouchableOpacity>
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
  groupCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  groupIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  groupInfo: {
    flex: 1,
  },
  groupName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  groupCount: {
    fontSize: 14,
    color: COLORS.textLight,
    marginTop: 2,
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
    marginTop: 80,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.textLight,
    marginTop: 8,
    textAlign: 'center',
  },
  emptyButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 24,
  },
  buttonIcon: {
    marginRight: 8,
  },
  emptyButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
});

export default WorkerGroupListScreen;
