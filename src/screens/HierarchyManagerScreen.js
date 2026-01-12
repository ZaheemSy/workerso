import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { ArrowLeft, Plus, Edit2, Trash2, Circle } from 'lucide-react-native';
import { COLORS } from '../constants/colors';
import { useAuth } from '../contexts/AuthContext';
import { getUserById } from '../services/storageService';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ROLE_OPTIONS = ['Admin', 'Manager', 'Team Lead', 'Field Employee', 'Office Employee', 'Custom'];

const HierarchyManagerScreen = ({ navigation }) => {
  const { session } = useAuth();
  const [hierarchy, setHierarchy] = useState(null);
  const [superAdminDesignation, setSuperAdminDesignation] = useState('Super Admin');
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingNode, setEditingNode] = useState(null);
  const [selectedRole, setSelectedRole] = useState(null);
  const [customRole, setCustomRole] = useState('');
  const [showRoleListModal, setShowRoleListModal] = useState(false);
  const [showCustomInputModal, setShowCustomInputModal] = useState(false);
  const [tempSelectedRole, setTempSelectedRole] = useState(null);
  const [tempCustomRole, setTempCustomRole] = useState('');

  useEffect(() => {
    loadHierarchy();
  }, []);

  const loadHierarchy = async () => {
    try {
      // Get Super Admin's designation
      const user = await getUserById(session.userId);
      const designation = user?.designation || 'Super Admin';
      setSuperAdminDesignation(designation);

      // Load hierarchy from storage
      const key = `hierarchy_${session.orgId}`;
      const stored = await AsyncStorage.getItem(key);

      if (stored) {
        setHierarchy(JSON.parse(stored));
      } else {
        // Create initial hierarchy structure
        const initialHierarchy = {
          id: 'root',
          name: designation,
          level: 0,
          children: [
            {
              id: 'role-2',
              name: 'Role-2',
              level: 1,
              children: [
                {
                  id: 'role-3',
                  name: 'Role-3',
                  level: 2,
                  children: [],
                }
              ],
            }
          ],
        };
        setHierarchy(initialHierarchy);
        await saveHierarchy(initialHierarchy);
      }
    } catch (error) {
      console.error('Error loading hierarchy:', error);
      Alert.alert('Error', 'Failed to load hierarchy');
    } finally {
      setLoading(false);
    }
  };

  const saveHierarchy = async (data) => {
    try {
      const key = `hierarchy_${session.orgId}`;
      await AsyncStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
      console.error('Error saving hierarchy:', error);
      Alert.alert('Error', 'Failed to save hierarchy');
    }
  };

  const handleEditNode = (node) => {
    setEditingNode(node);
    const standardRoles = ROLE_OPTIONS.filter(r => r !== 'Custom');
    const isCustomRole = !standardRoles.includes(node.name);
    if (isCustomRole) {
      setCustomRole(node.name);
      setSelectedRole(null);
    } else {
      setSelectedRole(node.name);
      setCustomRole('');
    }
    setModalVisible(true);
  };

  const handleAddSubRole = (parentNode) => {
    const newNode = {
      id: `role-${Date.now()}`,
      name: `Role-${parentNode.children.length + 1}`,
      level: parentNode.level + 1,
      children: [],
    };

    setEditingNode({ ...newNode, parentNode });
    setSelectedRole(null);
    setCustomRole('');
    setModalVisible(true);
  };

  const handleOpenRoleListModal = () => {
    setTempSelectedRole(selectedRole);
    setShowRoleListModal(true);
  };

  const handleConfirmRoleSelection = () => {
    if (!tempSelectedRole) {
      Alert.alert('Error', 'Please select a role');
      return;
    }
    setSelectedRole(tempSelectedRole);
    setCustomRole('');
    setShowRoleListModal(false);
  };

  const handleOpenCustomInputModal = () => {
    setTempCustomRole(customRole);
    setShowCustomInputModal(true);
  };

  const handleConfirmCustomRole = () => {
    if (!tempCustomRole.trim()) {
      Alert.alert('Error', 'Please enter custom role name');
      return;
    }
    setCustomRole(tempCustomRole.trim());
    setSelectedRole(null);
    setShowCustomInputModal(false);
  };

  const updateNodeInTree = (tree, nodeId, newName) => {
    if (tree.id === nodeId) {
      return { ...tree, name: newName };
    }

    if (tree.children && tree.children.length > 0) {
      return {
        ...tree,
        children: tree.children.map(child => updateNodeInTree(child, nodeId, newName))
      };
    }

    return tree;
  };

  const addNodeToTree = (tree, parentId, newNode) => {
    if (tree.id === parentId) {
      return {
        ...tree,
        children: [...tree.children, newNode]
      };
    }

    if (tree.children && tree.children.length > 0) {
      return {
        ...tree,
        children: tree.children.map(child => addNodeToTree(child, parentId, newNode))
      };
    }

    return tree;
  };

  const deleteNodeFromTree = (tree, nodeId) => {
    if (tree.children && tree.children.length > 0) {
      return {
        ...tree,
        children: tree.children
          .filter(child => child.id !== nodeId)
          .map(child => deleteNodeFromTree(child, nodeId))
      };
    }

    return tree;
  };

  const handleSaveNode = async () => {
    if (!selectedRole && !customRole) {
      Alert.alert('Error', 'Please select a role or enter custom role name');
      return;
    }

    const finalName = customRole ? customRole : selectedRole;

    let updatedHierarchy;

    if (editingNode.parentNode) {
      // Adding new node
      const newNode = {
        id: editingNode.id,
        name: finalName,
        level: editingNode.level,
        children: [],
      };
      updatedHierarchy = addNodeToTree(hierarchy, editingNode.parentNode.id, newNode);
    } else {
      // Editing existing node
      updatedHierarchy = updateNodeInTree(hierarchy, editingNode.id, finalName);
    }

    setHierarchy(updatedHierarchy);
    await saveHierarchy(updatedHierarchy);
    setModalVisible(false);
    setEditingNode(null);
    setSelectedRole(null);
    setCustomRole('');
  };

  const handleDeleteNode = (node) => {
    if (node.id === 'root') {
      Alert.alert('Error', 'Cannot delete root node');
      return;
    }

    Alert.alert(
      'Confirm Delete',
      `Are you sure you want to delete "${node.name}" and all its sub-roles?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const updatedHierarchy = deleteNodeFromTree(hierarchy, node.id);
            setHierarchy(updatedHierarchy);
            await saveHierarchy(updatedHierarchy);
          }
        }
      ]
    );
  };

  const renderNode = (node, isLast = false) => {
    const isRoot = node.id === 'root';
    const hasChildren = node.children && node.children.length > 0;

    return (
      <View key={node.id} style={styles.nodeContainer}>
        <View style={styles.nodeWrapper}>
          {/* Connector Line */}
          {!isRoot && (
            <View style={styles.connectorLine} />
          )}

          {/* Node Card */}
          <View style={[styles.nodeCard, isRoot && styles.rootNodeCard]}>
            <View style={styles.nodeHeader}>
              <Text style={[styles.nodeName, isRoot && styles.rootNodeName]}>
                {node.name}
              </Text>
              {!isRoot && (
                <View style={styles.nodeActions}>
                  <TouchableOpacity
                    onPress={() => handleEditNode(node)}
                    style={styles.actionButton}
                  >
                    <Edit2 color={COLORS.primary} size={16} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleDeleteNode(node)}
                    style={styles.actionButton}
                  >
                    <Trash2 color={COLORS.error} size={16} />
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* Add Sub-Role Button */}
            <TouchableOpacity
              style={styles.addSubRoleButton}
              onPress={() => handleAddSubRole(node)}
            >
              <Plus color={COLORS.primary} size={16} />
              <Text style={styles.addSubRoleText}>Add Sub-Role</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Children */}
        {hasChildren && (
          <View style={styles.childrenContainer}>
            {node.children.map((child, index) => renderNode(child, index === node.children.length - 1))}
          </View>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <ArrowLeft color={COLORS.text} size={24} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Hierarchy Manager</Text>
        </View>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <ArrowLeft color={COLORS.text} size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Hierarchy Manager</Text>
      </View>

      {/* Hierarchy Tree */}
      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <Text style={styles.infoText}>
          Define your organization's role structure. Tap on any role to rename it, or add sub-roles to create a hierarchical structure.
        </Text>

        {hierarchy && renderNode(hierarchy)}
      </ScrollView>

      {/* Edit/Add Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setModalVisible(false);
          setSelectedRole(null);
          setCustomRole('');
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {editingNode?.parentNode ? 'Add Sub-Role' : 'Edit Role'}
            </Text>

            <Text style={styles.modalSubtitle}>Choose how to add role</Text>

            <TouchableOpacity
              style={styles.optionButton}
              onPress={handleOpenRoleListModal}
              activeOpacity={0.7}
            >
              <Text style={styles.optionButtonText}>Select Role Name</Text>
              {selectedRole && (
                <Text style={styles.optionButtonValue}>{selectedRole}</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.optionButton}
              onPress={handleOpenCustomInputModal}
              activeOpacity={0.7}
            >
              <Text style={styles.optionButtonText}>Custom Role Name</Text>
              {customRole && (
                <Text style={styles.optionButtonValue}>{customRole}</Text>
              )}
            </TouchableOpacity>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setModalVisible(false);
                  setSelectedRole(null);
                  setCustomRole('');
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={handleSaveNode}
              >
                <Text style={styles.saveButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Role List Selection Modal */}
      <Modal
        visible={showRoleListModal}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setShowRoleListModal(false);
          setTempSelectedRole(selectedRole);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.subModalContent}>
            <Text style={styles.modalTitle}>Select Role Name</Text>

            <ScrollView style={styles.roleListContainer} showsVerticalScrollIndicator={false}>
              {ROLE_OPTIONS.filter(r => r !== 'Custom').map((option) => (
                <TouchableOpacity
                  key={option}
                  style={[
                    styles.radioOption,
                    tempSelectedRole === option && styles.radioOptionSelected,
                  ]}
                  onPress={() => setTempSelectedRole(option)}
                  activeOpacity={0.7}
                >
                  <View style={styles.radioOptionContent}>
                    <Text
                      style={[
                        styles.radioOptionText,
                        tempSelectedRole === option && styles.radioOptionTextSelected,
                      ]}
                    >
                      {option}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.radioButton,
                      tempSelectedRole === option && styles.radioButtonSelected,
                    ]}
                  >
                    {tempSelectedRole === option && (
                      <Circle color={COLORS.primary} size={12} fill={COLORS.primary} />
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setShowRoleListModal(false);
                  setTempSelectedRole(selectedRole);
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={handleConfirmRoleSelection}
              >
                <Text style={styles.saveButtonText}>OK</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Custom Role Input Modal */}
      <Modal
        visible={showCustomInputModal}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setShowCustomInputModal(false);
          setTempCustomRole(customRole);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.subModalContent}>
            <Text style={styles.modalTitle}>Custom Role Name</Text>

            <Text style={styles.modalLabel}>Enter role name</Text>
            <TextInput
              style={styles.customInput}
              placeholder="e.g., Project Manager, Designer"
              placeholderTextColor={COLORS.gray}
              value={tempCustomRole}
              onChangeText={setTempCustomRole}
              autoCapitalize="words"
              autoFocus
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setShowCustomInputModal(false);
                  setTempCustomRole(customRole);
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={handleConfirmCustomRole}
              >
                <Text style={styles.saveButtonText}>OK</Text>
              </TouchableOpacity>
            </View>
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
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingTop: 48,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  infoText: {
    fontSize: 14,
    color: COLORS.textLight,
    marginBottom: 24,
    lineHeight: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: COLORS.textLight,
  },
  nodeContainer: {
    marginBottom: 16,
  },
  nodeWrapper: {
    position: 'relative',
  },
  connectorLine: {
    position: 'absolute',
    top: -16,
    left: 24,
    width: 2,
    height: 16,
    backgroundColor: COLORS.border,
  },
  nodeCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: COLORS.border,
  },
  rootNodeCard: {
    borderColor: COLORS.primary,
    backgroundColor: '#F5F3FF',
  },
  nodeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  nodeName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    flex: 1,
  },
  rootNodeName: {
    color: COLORS.primary,
    fontSize: 18,
  },
  nodeActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    padding: 4,
  },
  addSubRoleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: COLORS.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderStyle: 'dashed',
  },
  addSubRoleText: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '500',
  },
  childrenContainer: {
    marginLeft: 32,
    marginTop: 16,
    paddingLeft: 12,
    borderLeftWidth: 2,
    borderLeftColor: COLORS.border,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 20,
  },
  modalSubtitle: {
    fontSize: 14,
    color: COLORS.textLight,
    marginBottom: 20,
  },
  optionButton: {
    backgroundColor: COLORS.background,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.border,
    padding: 16,
    marginBottom: 12,
  },
  optionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  optionButtonValue: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '500',
    marginTop: 4,
  },
  subModalContent: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    maxHeight: '70%',
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 12,
  },
  roleListContainer: {
    maxHeight: 300,
    marginBottom: 20,
  },
  radioOption: {
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
  radioOptionSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary + '05',
  },
  radioOptionContent: {
    flex: 1,
  },
  radioOptionText: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.text,
  },
  radioOptionTextSelected: {
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
  customInputContainer: {
    marginBottom: 20,
  },
  customInput: {
    backgroundColor: COLORS.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: COLORS.text,
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  saveButton: {
    backgroundColor: COLORS.primary,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.white,
  },
});

export default HierarchyManagerScreen;
