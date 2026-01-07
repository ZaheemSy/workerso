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
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { X, Plus, User, Mail, Phone, Lock, UserPlus, Briefcase, Circle } from 'lucide-react-native';
import { COLORS } from '../constants/colors';
import { ROLES } from '../constants/roles';
import { useAuth } from '../contexts/AuthContext';
import {
  getUsersByOrg,
  createUser,
  getDesignationsByOrg,
  createDesignation,
} from '../services/storageService';

const WorkersListScreen = ({ navigation }) => {
  const { session } = useAuth();
  const [workers, setWorkers] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [designations, setDesignations] = useState([]);
  const [selectedDesignationId, setSelectedDesignationId] = useState(null);
  const [showNewDesignationInput, setShowNewDesignationInput] = useState(false);
  const [newDesignationName, setNewDesignationName] = useState('');
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    username: '',
    password: '',
    confirmPassword: '',
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadWorkers();
    loadDesignations();
  }, []);

  const loadWorkers = async () => {
    try {
      const allUsers = await getUsersByOrg(session.orgId);
      // For Admin, only show their assigned workers
      let workersList;
      if (session.role === ROLES.ADMIN) {
        workersList = allUsers.filter(
          user => user.role === ROLES.WORKER && user.adminId === session.userId
        );
      } else {
        // Super Admin sees all workers
        workersList = allUsers.filter(user => user.role === ROLES.WORKER);
      }
      setWorkers(workersList);
    } catch (error) {
      console.error('Error loading workers:', error);
    }
  };

  const loadDesignations = async () => {
    try {
      const list = await getDesignationsByOrg(session.orgId);
      setDesignations(list);
    } catch (error) {
      console.error('Error loading designations:', error);
    }
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleAddNewDesignation = async () => {
    if (!newDesignationName.trim()) {
      Alert.alert('Error', 'Please enter designation name');
      return;
    }

    try {
      const newDes = await createDesignation({
        orgId: session.orgId,
        name: newDesignationName.trim(),
        createdBy: session.userId,
      });

      await loadDesignations();
      setSelectedDesignationId(newDes.designationId);
      setNewDesignationName('');
      setShowNewDesignationInput(false);
      Alert.alert('Success', 'Designation created');
    } catch (error) {
      console.error('Error creating designation:', error);
      Alert.alert('Error', 'Failed to create designation');
    }
  };

  const validateForm = () => {
    const { name, email, phone, username, password, confirmPassword } = formData;

    if (!name.trim()) {
      Alert.alert('Error', 'Please enter worker name');
      return false;
    }
    if (!email.trim() || !email.includes('@')) {
      Alert.alert('Error', 'Please enter a valid email');
      return false;
    }
    if (!phone.trim() || phone.length < 10) {
      Alert.alert('Error', 'Please enter a valid phone number');
      return false;
    }
    if (!username.trim() || username.length < 4) {
      Alert.alert('Error', 'Username must be at least 4 characters');
      return false;
    }
    if (!password.trim() || password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return false;
    }
    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return false;
    }

    return true;
  };

  const handleAddWorker = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      // Determine adminId based on user role
      let assignedAdminId = null;
      if (session.role === ROLES.ADMIN) {
        assignedAdminId = session.userId;
      }

      const worker = await createUser({
        orgId: session.orgId,
        role: ROLES.WORKER,
        name: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        phone: formData.phone.trim(),
        username: formData.username.trim().toLowerCase(),
        password: formData.password,
        adminId: assignedAdminId,
        designationId: selectedDesignationId,
        createdBy: session.userId,
        extraDetails: {},
      });

      if (!worker) {
        throw new Error('Failed to create worker');
      }

      setLoading(false);
      setShowAddModal(false);
      setFormData({
        name: '',
        email: '',
        phone: '',
        username: '',
        password: '',
        confirmPassword: '',
      });
      setSelectedDesignationId(null);
      
      await loadWorkers();

      Alert.alert(
        'Success!',
        `Worker account created successfully.\n\nUsername: ${worker.username}\nPassword: ${formData.password}\n\nPlease share these credentials with the worker.`,
      );
    } catch (error) {
      setLoading(false);
      Alert.alert('Error', error.message || 'Failed to create worker account');
      console.error('Add worker error:', error);
    }
  };

  const getDesignationName = (designationId) => {
    const designation = designations.find(d => d.designationId === designationId);
    return designation ? designation.name : 'Not Assigned';
  };

  const renderWorker = ({ item }) => (
    <TouchableOpacity
      style={styles.workerCard}
      onPress={() => navigation.navigate('UserDetail', { userId: item.userId })}
      activeOpacity={0.7}
    >
      <View style={styles.workerIconContainer}>
        <User color={COLORS.secondary} size={20} />
      </View>
      <View style={styles.workerInfo}>
        <Text style={styles.workerName}>{item.name}</Text>
        <Text style={styles.workerUsername}>@{item.username}</Text>
        {item.designationId && (
          <View style={styles.designationBadge}>
            <Briefcase color={COLORS.primary} size={12} />
            <Text style={styles.designationText}>{getDesignationName(item.designationId)}</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
          <X color={COLORS.text} size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Workers</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.content}>
        {workers.length === 0 ? (
          <View style={styles.emptyState}>
            <User color={COLORS.gray} size={64} />
            <Text style={styles.emptyText}>No workers yet</Text>
            <Text style={styles.emptySubtext}>
              Add workers to get started
            </Text>
          </View>
        ) : (
          <FlatList
            data={workers}
            keyExtractor={(item) => item.userId}
            renderItem={renderWorker}
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

      {/* Add Worker Modal */}
      <Modal
        visible={showAddModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAddModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Worker</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <X color={COLORS.text} size={24} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={styles.modalScroll}>
              <Text style={styles.sectionTitle}>Worker Details</Text>

              <View style={styles.inputContainer}>
                <User color={COLORS.gray} size={20} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Full Name"
                  placeholderTextColor={COLORS.gray}
                  value={formData.name}
                  onChangeText={value => handleChange('name', value)}
                  autoCapitalize="words"
                />
              </View>

              <View style={styles.inputContainer}>
                <Mail color={COLORS.gray} size={20} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Email"
                  placeholderTextColor={COLORS.gray}
                  value={formData.email}
                  onChangeText={value => handleChange('email', value)}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              <View style={styles.inputContainer}>
                <Phone color={COLORS.gray} size={20} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Phone Number"
                  placeholderTextColor={COLORS.gray}
                  value={formData.phone}
                  onChangeText={value => handleChange('phone', value)}
                  keyboardType="phone-pad"
                />
              </View>

              {/* Designation Selection */}
              <Text style={[styles.sectionTitle, { marginTop: 16 }]}>Designation</Text>
              
              {designations.map((designation) => (
                <TouchableOpacity
                  key={designation.designationId}
                  style={[
                    styles.designationCard,
                    selectedDesignationId === designation.designationId && styles.designationCardSelected,
                  ]}
                  onPress={() => setSelectedDesignationId(designation.designationId)}
                  activeOpacity={0.7}
                >
                  <View style={styles.designationCardContent}>
                    <Briefcase color={COLORS.gray} size={16} style={{ marginRight: 8 }} />
                    <Text style={styles.designationCardText}>{designation.name}</Text>
                  </View>
                  <View
                    style={[
                      styles.radioButton,
                      selectedDesignationId === designation.designationId && styles.radioButtonSelected,
                    ]}
                  >
                    {selectedDesignationId === designation.designationId && (
                      <Circle color={COLORS.primary} size={12} fill={COLORS.primary} />
                    )}
                  </View>
                </TouchableOpacity>
              ))}

              {/* Add New Designation Option */}
              {!showNewDesignationInput && (
                <TouchableOpacity
                  style={styles.addNewDesignationButton}
                  onPress={() => setShowNewDesignationInput(true)}
                  activeOpacity={0.7}
                >
                  <Plus color={COLORS.primary} size={16} />
                  <Text style={styles.addNewDesignationText}>Add New Designation</Text>
                </TouchableOpacity>
              )}

              {showNewDesignationInput && (
                <View style={styles.newDesignationContainer}>
                  <View style={styles.inputContainer}>
                    <Briefcase color={COLORS.gray} size={20} style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="New Designation Name"
                      placeholderTextColor={COLORS.gray}
                      value={newDesignationName}
                      onChangeText={setNewDesignationName}
                      autoCapitalize="words"
                    />
                  </View>
                  <View style={styles.newDesignationActions}>
                    <TouchableOpacity
                      style={styles.cancelButton}
                      onPress={() => {
                        setShowNewDesignationInput(false);
                        setNewDesignationName('');
                      }}
                    >
                      <Text style={styles.cancelButtonText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.createDesignationButton}
                      onPress={handleAddNewDesignation}
                    >
                      <Text style={styles.createDesignationButtonText}>Create</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              <Text style={[styles.sectionTitle, { marginTop: 16 }]}>Login Credentials</Text>

              <View style={styles.inputContainer}>
                <User color={COLORS.gray} size={20} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Username"
                  placeholderTextColor={COLORS.gray}
                  value={formData.username}
                  onChangeText={value => handleChange('username', value)}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              <View style={styles.inputContainer}>
                <Lock color={COLORS.gray} size={20} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Password"
                  placeholderTextColor={COLORS.gray}
                  value={formData.password}
                  onChangeText={value => handleChange('password', value)}
                  secureTextEntry
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.inputContainer}>
                <Lock color={COLORS.gray} size={20} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Confirm Password"
                  placeholderTextColor={COLORS.gray}
                  value={formData.confirmPassword}
                  onChangeText={value => handleChange('confirmPassword', value)}
                  secureTextEntry
                  autoCapitalize="none"
                />
              </View>

              <TouchableOpacity
                style={[styles.button, loading && styles.buttonDisabled]}
                onPress={handleAddWorker}
                disabled={loading}
              >
                <UserPlus color={COLORS.white} size={20} style={styles.buttonIcon} />
                <Text style={styles.buttonText}>
                  {loading ? 'Creating...' : 'Create Worker Account'}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
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
  workerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  workerIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.secondary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
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
    marginTop: 4,
  },
  designationText: {
    fontSize: 12,
    color: COLORS.primary,
    marginLeft: 4,
    fontWeight: '500',
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
    maxHeight: '90%',
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
    flexGrow: 0,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 12,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 16,
    marginBottom: 12,
    height: 50,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: COLORS.text,
  },
  designationCard: {
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
  designationCardSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary + '05',
  },
  designationCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  designationCardText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text,
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
  addNewDesignationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderStyle: 'dashed',
    marginTop: 4,
    marginBottom: 16,
  },
  addNewDesignationText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
    marginLeft: 8,
  },
  newDesignationContainer: {
    marginBottom: 16,
  },
  newDesignationActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  cancelButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: COLORS.border,
    marginRight: 8,
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  createDesignationButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: COLORS.primary,
  },
  createDesignationButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.white,
  },
  button: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    height: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    marginBottom: 20,
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

export default WorkersListScreen;
