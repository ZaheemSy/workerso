import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  FlatList,
  Modal,
  ScrollView,
} from 'react-native';
import { X, Plus, Users, Save, Check, ChevronRight, Trash2, Search } from 'lucide-react-native';
import { COLORS } from '../constants/colors';
import { ROLES } from '../constants/roles';
import { useAuth } from '../contexts/AuthContext';
import {
  getGroupsByOrg,
  getUsersByOrg,
  createGroup,
} from '../services/storageService';

const WorkerGroupsListScreen = ({ navigation }) => {
  const { session } = useAuth();
  const [groups, setGroups] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [workers, setWorkers] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [loading, setLoading] = useState(false);

  // Form state
  const [groupName, setGroupName] = useState('');
  const [selectedWorkers, setSelectedWorkers] = useState([]);

  useEffect(() => {
    loadGroups();
  }, []);

  const loadGroups = async () => {
    try {
      const groupData = await getGroupsByOrg(session.orgId);
      setGroups(groupData);
    } catch (error) {
      console.error('Error loading groups:', error);
    }
  };

  const loadWorkers = async () => {
    try {
      const allUsers = await getUsersByOrg(session.orgId);
      let workersList = allUsers.filter(user => user.role === ROLES.WORKER);

      // Admins only see their workers
      if (session.role === ROLES.ADMIN) {
        workersList = workersList.filter(
          worker => worker.adminId === session.userId
        );
      }

      setWorkers(workersList);
    } catch (error) {
      console.error('Error loading workers:', error);
    }
  };

  const getWorkerCount = (groupId) => {
    const group = groups.find(g => g.groupId === groupId);
    return group?.workers?.length || 0;
  };

  const toggleWorker = (workerId) => {
    setSelectedWorkers(prev =>
      prev.includes(workerId)
        ? prev.filter(id => id !== workerId)
        : [...prev, workerId]
    );
  };

  const handleOpenModal = () => {
    loadWorkers();
    setShowAddModal(true);
  };

  const handleCloseModal = () => {
    setShowAddModal(false);
    setGroupName('');
    setSelectedWorkers([]);
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      Alert.alert('Error', 'Please enter group name');
      return;
    }

    setLoading(true);
    try {
      await createGroup({
        orgId: session.orgId,
        groupName: groupName.trim(),
        workers: selectedWorkers,
        createdBy: session.userId,
      });

      await loadGroups();
      handleCloseModal();
      Alert.alert('Success', 'Worker group created successfully');
    } catch (error) {
      console.error('Error creating group:', error);
      Alert.alert('Error', 'Failed to create worker group');
    } finally {
      setLoading(false);
    }
  };

  const filteredGroups = groups.filter((group) => {
    const query = searchQuery.toLowerCase();
    const groupName = group.groupName?.toLowerCase() || '';
    return groupName.includes(query);
  });

  const renderGroup = ({ item }) => (
    <TouchableOpacity
      style={styles.groupCard}
      onPress={() =>
        navigation.navigate('WorkerGroupDetail', {
          groupId: item.groupId,
          onGroupUpdated: loadGroups,
        })
      }
      activeOpacity={0.7}
    >
      <View style={styles.groupIconContainer}>
        <Users color={COLORS.primary} size={24} />
      </View>
      <View style={styles.groupInfo}>
        <Text style={styles.groupName}>{item.groupName}</Text>
        <Text style={styles.groupCount}>
          {getWorkerCount(item.groupId)}{' '}
          {getWorkerCount(item.groupId) === 1 ? 'worker' : 'workers'}
        </Text>
      </View>
      <ChevronRight color={COLORS.gray} size={20} />
    </TouchableOpacity>
  );

  const renderWorkerSelection = ({ item }) => {
    const isSelected = selectedWorkers.includes(item.userId);
    
    return (
      <TouchableOpacity
        style={[
          styles.workerSelectionCard,
          isSelected && styles.workerSelectionCardSelected,
        ]}
        onPress={() => toggleWorker(item.userId)}
        activeOpacity={0.7}
      >
        <View style={styles.workerInfo}>
          <Text style={styles.workerName}>{item.name}</Text>
          <Text style={styles.workerUsername}>@{item.username}</Text>
          {item.designation && (
            <Text style={styles.workerDesignation}>{item.designation}</Text>
          )}
        </View>
        {isSelected && (
          <View style={styles.checkIcon}>
            <Check color={COLORS.white} size={16} />
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.headerButton}
        >
          <X color={COLORS.text} size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Worker Groups</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.content}>
        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Search color={COLORS.gray} size={20} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search worker groups..."
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

        {groups.length === 0 ? (
          <View style={styles.emptyState}>
            <Users color={COLORS.gray} size={64} />
            <Text style={styles.emptyText}>No worker groups yet</Text>
            <Text style={styles.emptySubtext}>
              Create groups to organize workers by teams or skills
            </Text>
          </View>
        ) : filteredGroups.length === 0 ? (
          <View style={styles.emptyState}>
            <Search color={COLORS.gray} size={64} />
            <Text style={styles.emptyText}>No results found</Text>
            <Text style={styles.emptySubtext}>
              Try searching with different keywords
            </Text>
          </View>
        ) : (
          <FlatList
            data={filteredGroups}
            keyExtractor={(item) => item.groupId}
            renderItem={renderGroup}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>

      <TouchableOpacity
        style={styles.fab}
        onPress={handleOpenModal}
        activeOpacity={0.8}
      >
        <Plus color={COLORS.white} size={28} />
      </TouchableOpacity>

      {/* Add Group Modal */}
      <Modal
        visible={showAddModal}
        transparent
        animationType="slide"
        onRequestClose={handleCloseModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create Worker Group</Text>
              <TouchableOpacity onPress={handleCloseModal}>
                <X color={COLORS.text} size={24} />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              style={styles.modalScroll}
            >
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
                {selectedWorkers.length} worker
                {selectedWorkers.length !== 1 ? 's' : ''} selected
              </Text>

              {workers.length === 0 ? (
                <View style={styles.emptyWorkerState}>
                  <Users color={COLORS.gray} size={48} />
                  <Text style={styles.emptyWorkerText}>No workers available</Text>
                  <Text style={styles.emptyWorkerSubtext}>
                    Add workers first to create a group
                  </Text>
                </View>
              ) : (
                <View style={styles.workerSelectionList}>
                  {workers.map((worker) => (
                    <View key={worker.userId}>
                      {renderWorkerSelection({ item: worker })}
                    </View>
                  ))}
                </View>
              )}
            </ScrollView>

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
          </View>
        </View>
      </Modal>
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 16,
    marginBottom: 16,
    height: 50,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: COLORS.text,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: COLORS.textLight,
    marginTop: 8,
    textAlign: 'center',
  },
  groupCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  groupIconContainer: {
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
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: 40,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  modalScroll: {
    maxHeight: '70%',
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
    backgroundColor: COLORS.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 16,
    marginBottom: 20,
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
  workerSelectionList: {
    marginBottom: 20,
  },
  workerSelectionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    marginBottom: 8,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: COLORS.border,
    backgroundColor: COLORS.background,
  },
  workerSelectionCardSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary + '05',
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
  workerDesignation: {
    fontSize: 12,
    color: COLORS.primary,
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
  emptyWorkerState: {
    alignItems: 'center',
    padding: 30,
    backgroundColor: COLORS.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 20,
  },
  emptyWorkerText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: 12,
  },
  emptyWorkerSubtext: {
    fontSize: 14,
    color: COLORS.textLight,
    marginTop: 4,
    textAlign: 'center',
  },
  button: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
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

export default WorkerGroupsListScreen;
