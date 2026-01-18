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
import { X, Plus, Briefcase, Trash2, Search, Circle, ChevronDown } from 'lucide-react-native';
import { COLORS } from '../constants/colors';
import { useAuth } from '../contexts/AuthContext';
import { ROLES } from '../constants/roles';
import {
  getDesignationsByOrg,
  createDesignation,
  deleteDesignation,
} from '../services/storageService';
import AsyncStorage from '@react-native-async-storage/async-storage';

const DesignationsScreen = ({ navigation }) => {
  const { session } = useAuth();
  const [designations, setDesignations] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newDesignation, setNewDesignation] = useState('');
  const [loading, setLoading] = useState(false);
  const [roles, setRoles] = useState([]);
  const [selectedRole, setSelectedRole] = useState(null);
  const [showRoleModal, setShowRoleModal] = useState(false);

  useEffect(() => {
    loadDesignations();
    loadRoles();
  }, []);

  const loadDesignations = async () => {
    try {
      const list = await getDesignationsByOrg(session.orgId);
      setDesignations(list);
    } catch (error) {
      console.error('Error loading designations:', error);
    }
  };

  const loadRoles = async () => {
    try {
      const key = `hierarchy_${session.orgId}`;
      const stored = await AsyncStorage.getItem(key);
      if (stored) {
        const hierarchy = JSON.parse(stored);
        let extractedRoles = extractRolesFromTree(hierarchy);

        // Role-based filtering
        if (session.role === ROLES.ADMIN) {
          // Power 2 - Admin can only see Power 3 roles (level 2 and above)
          extractedRoles = extractedRoles.filter(role => role.level >= 2);
        }
        // Super Admin (Power 1) sees all roles - no filtering needed

        setRoles(extractedRoles);
      }
    } catch (error) {
      console.error('Error loading roles:', error);
    }
  };

  const extractRolesFromTree = (node) => {
    let rolesList = [];

    // Add current node (except root and placeholder roles)
    if (node.id !== 'root' && !node.name.includes('Role-')) {
      rolesList.push({
        id: node.id,
        name: node.name,
        level: node.level, // Include level for filtering
      });
    }

    // Recursively add children
    if (node.children && node.children.length > 0) {
      node.children.forEach(child => {
        rolesList = rolesList.concat(extractRolesFromTree(child));
      });
    }

    return rolesList;
  };

  const handleAddDesignation = async () => {
    if (!selectedRole) {
      Alert.alert('Error', 'Please select a role first');
      return;
    }

    if (!newDesignation.trim()) {
      Alert.alert('Error', 'Please enter designation name');
      return;
    }

    setLoading(true);
    try {
      await createDesignation({
        orgId: session.orgId,
        name: newDesignation.trim(),
        roleId: selectedRole.id,
        roleName: selectedRole.name,
        createdBy: session.userId,
      });

      setNewDesignation('');
      setSelectedRole(null);
      setShowAddModal(false);
      await loadDesignations();
      Alert.alert('Success', 'Designation created successfully');
    } catch (error) {
      console.error('Error creating designation:', error);
      Alert.alert('Error', 'Failed to create designation');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteDesignation = (designation) => {
    Alert.alert(
      'Delete Designation',
      `Are you sure you want to delete "${designation.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDesignation(designation.designationId);
              await loadDesignations();
              Alert.alert('Success', 'Designation deleted');
            } catch (error) {
              console.error('Error deleting designation:', error);
              Alert.alert('Error', 'Failed to delete designation');
            }
          },
        },
      ]
    );
  };

  const filteredDesignations = designations.filter((designation) => {
    // First filter by search query
    const query = searchQuery.toLowerCase();
    const name = designation.name?.toLowerCase() || '';
    const matchesSearch = name.includes(query);

    // Then filter by role (based on user's power level)
    if (session.role === ROLES.ADMIN) {
      // Admin can only see designations with Power 3 roles
      const allowedRoleIds = roles.map(r => r.id);
      const hasAllowedRole = designation.roleId && allowedRoleIds.includes(designation.roleId);
      return matchesSearch && hasAllowedRole;
    }

    // Super Admin can see all designations
    return matchesSearch;
  });

  const renderDesignation = ({ item }) => (
    <View style={styles.designationCard}>
      <View style={styles.designationIconContainer}>
        <Briefcase color={COLORS.primary} size={20} />
      </View>
      <View style={styles.designationInfo}>
        <Text style={styles.designationName}>{item.name}</Text>
        {item.roleName && (
          <View style={styles.roleBadge}>
            <Text style={styles.roleText}>{item.roleName}</Text>
          </View>
        )}
        <Text style={styles.designationDate}>
          Created {new Date(item.createdAt).toLocaleDateString()}
        </Text>
      </View>
      <TouchableOpacity
        style={styles.deleteButton}
        onPress={() => handleDeleteDesignation(item)}
      >
        <Trash2 color={COLORS.danger} size={20} />
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
          <X color={COLORS.text} size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Designations</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.content}>
        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Search color={COLORS.gray} size={20} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search designations..."
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

        {designations.length === 0 ? (
          <View style={styles.emptyState}>
            <Briefcase color={COLORS.gray} size={64} />
            <Text style={styles.emptyText}>No designations yet</Text>
            <Text style={styles.emptySubtext}>
              Create designations to assign to workers
            </Text>
          </View>
        ) : filteredDesignations.length === 0 ? (
          <View style={styles.emptyState}>
            <Search color={COLORS.gray} size={64} />
            <Text style={styles.emptyText}>No results found</Text>
            <Text style={styles.emptySubtext}>
              Try searching with different keywords
            </Text>
          </View>
        ) : (
          <FlatList
            data={filteredDesignations}
            keyExtractor={(item) => item.designationId}
            renderItem={renderDesignation}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>

      <TouchableOpacity
        style={styles.fab}
        onPress={() => setShowAddModal(true)}
        activeOpacity={0.8}
      >
        <Plus color={COLORS.white} size={28} />
      </TouchableOpacity>

      {/* Add Designation Modal */}
      <Modal
        visible={showAddModal}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setShowAddModal(false);
          setSelectedRole(null);
          setNewDesignation('');
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Designation</Text>
              <TouchableOpacity onPress={() => {
                setShowAddModal(false);
                setSelectedRole(null);
                setNewDesignation('');
              }}>
                <X color={COLORS.text} size={24} />
              </TouchableOpacity>
            </View>

            <Text style={styles.fieldLabel}>Select Role *</Text>
            <TouchableOpacity
              style={styles.selectButton}
              onPress={() => setShowRoleModal(true)}
              activeOpacity={0.7}
            >
              <Text style={[
                styles.selectButtonText,
                !selectedRole && styles.selectButtonPlaceholder
              ]}>
                {selectedRole ? selectedRole.name : 'Select Role'}
              </Text>
              <ChevronDown color={COLORS.gray} size={20} />
            </TouchableOpacity>

            <Text style={styles.fieldLabel}>Designation Name *</Text>
            <View style={styles.inputContainer}>
              <Briefcase color={COLORS.gray} size={20} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="e.g., Carpenter, HR Admin, Designer"
                placeholderTextColor={COLORS.gray}
                value={newDesignation}
                onChangeText={setNewDesignation}
                autoCapitalize="words"
              />
            </View>

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleAddDesignation}
              disabled={loading}
            >
              <Text style={styles.buttonText}>
                {loading ? 'Creating...' : 'Create Designation'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Role Selection Modal */}
      <Modal
        visible={showRoleModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowRoleModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.subModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Role</Text>
              <TouchableOpacity onPress={() => setShowRoleModal(false)}>
                <X color={COLORS.text} size={24} />
              </TouchableOpacity>
            </View>

            {roles.length === 0 ? (
              <View style={styles.emptyRolesState}>
                <Text style={styles.emptyRolesText}>No roles found</Text>
                <Text style={styles.emptyRolesSubtext}>
                  Please create roles in Hierarchy Manager first
                </Text>
              </View>
            ) : (
              <ScrollView style={styles.roleListContainer} showsVerticalScrollIndicator={false}>
                {roles.map((role) => (
                  <TouchableOpacity
                    key={role.id}
                    style={[
                      styles.roleOption,
                      selectedRole?.id === role.id && styles.roleOptionSelected,
                    ]}
                    onPress={() => {
                      setSelectedRole(role);
                      setShowRoleModal(false);
                    }}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.roleOptionText,
                        selectedRole?.id === role.id && styles.roleOptionTextSelected,
                      ]}
                    >
                      {role.name}
                    </Text>
                    <View
                      style={[
                        styles.radioButton,
                        selectedRole?.id === role.id && styles.radioButtonSelected,
                      ]}
                    >
                      {selectedRole?.id === role.id && (
                        <Circle color={COLORS.primary} size={12} fill={COLORS.primary} />
                      )}
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
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
  designationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  designationIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  designationInfo: {
    flex: 1,
  },
  designationName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  designationDate: {
    fontSize: 13,
    color: COLORS.textLight,
    marginTop: 4,
  },
  roleBadge: {
    backgroundColor: COLORS.primary + '15',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  roleText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.primary,
    textTransform: 'uppercase',
  },
  deleteButton: {
    padding: 8,
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
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
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
  button: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
    marginTop: 4,
  },
  selectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginBottom: 16,
  },
  selectButtonText: {
    fontSize: 16,
    color: COLORS.text,
  },
  selectButtonPlaceholder: {
    color: COLORS.gray,
  },
  subModalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    maxHeight: '70%',
  },
  roleListContainer: {
    maxHeight: 350,
  },
  roleOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    marginBottom: 8,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.border,
    backgroundColor: COLORS.background,
  },
  roleOptionSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary + '05',
  },
  roleOptionText: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.text,
    flex: 1,
  },
  roleOptionTextSelected: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioButtonSelected: {
    borderColor: COLORS.primary,
  },
  emptyRolesState: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyRolesText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  emptyRolesSubtext: {
    fontSize: 14,
    color: COLORS.textLight,
    textAlign: 'center',
  },
});

export default DesignationsScreen;
