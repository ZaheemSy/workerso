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
} from 'react-native';
import { X, Plus, Briefcase, Trash2 } from 'lucide-react-native';
import { COLORS } from '../constants/colors';
import { useAuth } from '../contexts/AuthContext';
import {
  getDesignationsByOrg,
  createDesignation,
  deleteDesignation,
} from '../services/storageService';

const DesignationsScreen = ({ navigation }) => {
  const { session } = useAuth();
  const [designations, setDesignations] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newDesignation, setNewDesignation] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadDesignations();
  }, []);

  const loadDesignations = async () => {
    try {
      const list = await getDesignationsByOrg(session.orgId);
      setDesignations(list);
    } catch (error) {
      console.error('Error loading designations:', error);
    }
  };

  const handleAddDesignation = async () => {
    if (!newDesignation.trim()) {
      Alert.alert('Error', 'Please enter designation name');
      return;
    }

    setLoading(true);
    try {
      await createDesignation({
        orgId: session.orgId,
        name: newDesignation.trim(),
        createdBy: session.userId,
      });

      setNewDesignation('');
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

  const renderDesignation = ({ item }) => (
    <View style={styles.designationCard}>
      <View style={styles.designationIconContainer}>
        <Briefcase color={COLORS.primary} size={20} />
      </View>
      <View style={styles.designationInfo}>
        <Text style={styles.designationName}>{item.name}</Text>
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
        {designations.length === 0 ? (
          <View style={styles.emptyState}>
            <Briefcase color={COLORS.gray} size={64} />
            <Text style={styles.emptyText}>No designations yet</Text>
            <Text style={styles.emptySubtext}>
              Create designations to assign to workers
            </Text>
          </View>
        ) : (
          <FlatList
            data={designations}
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
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Designation</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <X color={COLORS.text} size={24} />
              </TouchableOpacity>
            </View>

            <View style={styles.inputContainer}>
              <Briefcase color={COLORS.gray} size={20} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Designation Name (e.g., Carpenter, Plumber)"
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
    marginTop: 2,
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
});

export default DesignationsScreen;
