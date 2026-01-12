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
import {
  X,
  Plus,
  User,
  Mail,
  Phone,
  Lock,
  UserPlus,
  Briefcase,
  Circle,
  Search,
  ChevronRight,
} from 'lucide-react-native';
import { COLORS } from '../constants/colors';
import { ROLES } from '../constants/roles';
import { useAuth } from '../contexts/AuthContext';
import {
  getUsersByOrg,
  createUser,
  getDesignationsByOrg,
  createDesignation,
} from '../services/storageService';
import AsyncStorage from '@react-native-async-storage/async-storage';

const EmployeesScreen = ({ navigation }) => {
  const { session } = useAuth();
  const [employees, setEmployees] = useState([]);
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDesignationModal, setShowDesignationModal] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [designations, setDesignations] = useState([]);
  const [filteredDesignations, setFilteredDesignations] = useState([]);
  const [roles, setRoles] = useState([]);
  const [selectedRole, setSelectedRole] = useState(null);
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
    loadEmployees();
    loadDesignations();
    loadRoles();
  }, []);

  const loadEmployees = async () => {
    try {
      const allUsers = await getUsersByOrg(session.orgId);
      // Show all team members (both workers and admins)
      const teamMembersList = allUsers.filter(
        user => user.role === ROLES.WORKER || user.role === ROLES.ADMIN,
      );
      setEmployees(teamMembersList);
    } catch (error) {
      console.error('Error loading employees:', error);
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

  const loadRoles = async () => {
    try {
      const key = `hierarchy_${session.orgId}`;
      const stored = await AsyncStorage.getItem(key);
      if (stored) {
        const hierarchy = JSON.parse(stored);
        const extractedRoles = extractRolesFromTree(hierarchy);
        setRoles(extractedRoles);
      }
    } catch (error) {
      console.error('Error loading roles:', error);
    }
  };

  const extractRolesFromTree = node => {
    let rolesList = [];

    // Add current node (except root and placeholder roles)
    if (node.id !== 'root' && !node.name.includes('Role-')) {
      rolesList.push({
        id: node.id,
        name: node.name,
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

  // Filter designations when role changes
  useEffect(() => {
    if (selectedRole) {
      const filtered = designations.filter(
        d => d.roleName === selectedRole.name,
      );
      setFilteredDesignations(filtered);
    } else {
      setFilteredDesignations([]);
    }
  }, [selectedRole, designations]);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleAddNewDesignation = async () => {
    if (!selectedRole) {
      Alert.alert('Error', 'Please select a role first');
      return;
    }

    if (!newDesignationName.trim()) {
      Alert.alert('Error', 'Please enter designation name');
      return;
    }

    try {
      const newDes = await createDesignation({
        orgId: session.orgId,
        name: newDesignationName.trim(),
        roleId: selectedRole.id,
        roleName: selectedRole.name,
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
    const { name, email, phone, username, password, confirmPassword } =
      formData;

    if (!selectedRole) {
      Alert.alert('Error', 'Please select a role');
      return false;
    }
    if (!selectedDesignationId) {
      Alert.alert('Error', 'Please select a designation');
      return false;
    }
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter employee name');
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

  const handleAddEmployee = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      // Auto-map hierarchy role to system permission
      let systemRole = ROLES.WORKER; // Default
      if (selectedRole.name === 'Admin') {
        systemRole = ROLES.ADMIN; // Grant admin permissions
      }

      // Determine adminId based on user role
      let assignedAdminId = null;
      if (session.role === ROLES.ADMIN) {
        assignedAdminId = session.userId;
      }

      const employee = await createUser({
        orgId: session.orgId,
        role: systemRole, // System permission level
        name: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        phone: formData.phone.trim(),
        username: formData.username.trim().toLowerCase(),
        password: formData.password,
        adminId: assignedAdminId,
        designationId: selectedDesignationId,
        createdBy: session.userId,
        extraDetails: {
          hierarchyRole: selectedRole.name, // Organizational role
        },
      });

      if (!employee) {
        throw new Error('Failed to create team member');
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
      setSelectedRole(null);
      setSelectedDesignationId(null);

      await loadEmployees();

      const roleType = systemRole === ROLES.ADMIN ? 'admin' : 'team member';
      Alert.alert(
        'Success!',
        `${
          roleType.charAt(0).toUpperCase() + roleType.slice(1)
        } account created successfully.\n\nUsername: ${
          employee.username
        }\nPassword: ${
          formData.password
        }\n\nPlease share these credentials with the user.`,
      );
    } catch (error) {
      setLoading(false);
      Alert.alert('Error', error.message || 'Failed to create account');
      console.error('Add employee error:', error);
    }
  };

  const getDesignationName = designationId => {
    const designation = designations.find(
      d => d.designationId === designationId,
    );
    return designation ? designation.name : 'Not Assigned';
  };

  const getSelectedDesignationName = () => {
    if (!selectedDesignationId) return 'Select Designation';
    const designation = designations.find(
      d => d.designationId === selectedDesignationId,
    );
    return designation ? designation.name : 'Select Designation';
  };

  const handleSelectDesignation = designationId => {
    setSelectedDesignationId(designationId);
    setShowDesignationModal(false);
  };

  const filteredEmployees = employees.filter(employee => {
    // Filter by tab
    if (activeTab === 'admins') {
      if (employee.role !== ROLES.ADMIN) return false;
    } else if (activeTab === 'others') {
      if (employee.role !== ROLES.WORKER) return false;
    }
    // 'all' tab shows everyone

    // Filter by search query
    const query = searchQuery.toLowerCase();
    const name = employee.name?.toLowerCase() || '';
    const username = employee.username?.toLowerCase() || '';
    const designation = getDesignationName(
      employee.designationId,
    ).toLowerCase();

    return (
      name.includes(query) ||
      username.includes(query) ||
      designation.includes(query)
    );
  });

  const renderEmployee = ({ item }) => (
    <TouchableOpacity
      style={styles.workerCard}
      onPress={() => navigation.navigate('UserDetail', { userId: item.userId })}
      activeOpacity={0.7}
    >
      <View style={styles.workerIconContainer}>
        <User color={COLORS.secondary} size={20} />
      </View>
      <View style={styles.workerInfo}>
        <Text style={styles.workerName}>
          <Text
            style={[styles.workerName, { fontWeight: '400', fontSize: 12 }]}
          >
            Name:{' '}
          </Text>

          {item.name}
        </Text>
        <Text style={styles.workerUsername}>
          <Text
            style={[styles.workerName, { fontWeight: '400', fontSize: 12 }]}
          >
            Username:{' '}
          </Text>{' '}
          {item.username}
        </Text>
        {item.designationId && (
          <View
            style={[
              styles.designationBadge,
              item.role === ROLES.ADMIN && styles.designationBadgeAdmin,
            ]}
          >
            <Briefcase
              color={item.role === ROLES.ADMIN ? '#DC2626' : COLORS.primary}
              size={12}
            />
            <Text
              style={[
                styles.designationText,
                item.role === ROLES.ADMIN && styles.designationTextAdmin,
              ]}
            >
              {getDesignationName(item.designationId)}
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.headerButton}
        >
          <X color={COLORS.text} size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Employees</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.content}>
        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Search color={COLORS.gray} size={20} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search employees by name, username or designation..."
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

        {/* Tabs */}
        <View style={styles.tabsContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'all' && styles.activeTab]}
            onPress={() => setActiveTab('all')}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === 'all' && styles.activeTabText,
              ]}
            >
              All
            </Text>
            <View
              style={[
                styles.tabBadge,
                activeTab === 'all' && styles.activeTabBadge,
              ]}
            >
              <Text
                style={[
                  styles.tabBadgeText,
                  activeTab === 'all' && styles.activeTabBadgeText,
                ]}
              >
                {employees.length}
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, activeTab === 'admins' && styles.activeTab]}
            onPress={() => setActiveTab('admins')}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === 'admins' && styles.activeTabText,
              ]}
            >
              Admins
            </Text>
            <View
              style={[
                styles.tabBadge,
                activeTab === 'admins' && styles.activeTabBadge,
              ]}
            >
              <Text
                style={[
                  styles.tabBadgeText,
                  activeTab === 'admins' && styles.activeTabBadgeText,
                ]}
              >
                {employees.filter(u => u.role === ROLES.ADMIN).length}
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, activeTab === 'others' && styles.activeTab]}
            onPress={() => setActiveTab('others')}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === 'others' && styles.activeTabText,
              ]}
            >
              Others
            </Text>
            <View
              style={[
                styles.tabBadge,
                activeTab === 'others' && styles.activeTabBadge,
              ]}
            >
              <Text
                style={[
                  styles.tabBadgeText,
                  activeTab === 'others' && styles.activeTabBadgeText,
                ]}
              >
                {employees.filter(u => u.role === ROLES.WORKER).length}
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {employees.length === 0 ? (
          <View style={styles.emptyState}>
            <User color={COLORS.gray} size={64} />
            <Text style={styles.emptyText}>No employees yet</Text>
            <Text style={styles.emptySubtext}>
              Add employees to get started
            </Text>
          </View>
        ) : filteredEmployees.length === 0 ? (
          <View style={styles.emptyState}>
            <Search color={COLORS.gray} size={64} />
            <Text style={styles.emptyText}>No results found</Text>
            <Text style={styles.emptySubtext}>
              Try searching with different keywords
            </Text>
          </View>
        ) : (
          <FlatList
            data={filteredEmployees}
            keyExtractor={item => item.userId}
            renderItem={renderEmployee}
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

      {/* Add Employee Modal */}
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
              <Text style={styles.modalTitle}>Add New Employee</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <X color={COLORS.text} size={24} />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              style={styles.modalScroll}
            >
              <Text style={styles.sectionTitle}>Personal Details</Text>

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

              {/* Role Selection Button */}
              <Text style={[styles.sectionTitle, { marginTop: 16 }]}>Role</Text>
              <TouchableOpacity
                style={styles.designationSelectButton}
                onPress={() => setShowRoleModal(true)}
                activeOpacity={0.7}
              >
                <Briefcase color={COLORS.gray} size={20} />
                <Text
                  style={[
                    styles.designationSelectText,
                    !selectedRole && styles.designationSelectTextPlaceholder,
                  ]}
                >
                  {selectedRole ? selectedRole.name : 'Select Role'}
                </Text>
                <ChevronRight color={COLORS.gray} size={20} />
              </TouchableOpacity>

              {/* Designation Selection Button */}
              <Text style={[styles.sectionTitle, { marginTop: 16 }]}>
                Designation
              </Text>
              {!selectedRole ? (
                <View style={styles.disabledSelectButton}>
                  <Briefcase color={COLORS.gray} size={20} />
                  <Text style={styles.disabledSelectText}>
                    Select a role first
                  </Text>
                </View>
              ) : filteredDesignations.length === 0 ? (
                <View style={styles.disabledSelectButton}>
                  <Briefcase color={COLORS.gray} size={20} />
                  <Text style={styles.disabledSelectText}>
                    No designations for this role
                  </Text>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.designationSelectButton}
                  onPress={() => setShowDesignationModal(true)}
                  activeOpacity={0.7}
                >
                  <Briefcase color={COLORS.gray} size={20} />
                  <Text
                    style={[
                      styles.designationSelectText,
                      !selectedDesignationId &&
                        styles.designationSelectTextPlaceholder,
                    ]}
                  >
                    {getSelectedDesignationName()}
                  </Text>
                  <ChevronRight color={COLORS.gray} size={20} />
                </TouchableOpacity>
              )}

              <Text style={[styles.sectionTitle, { marginTop: 16 }]}>
                Login Credentials
              </Text>

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
                onPress={handleAddEmployee}
                disabled={loading}
              >
                <UserPlus
                  color={COLORS.white}
                  size={20}
                  style={styles.buttonIcon}
                />
                <Text style={styles.buttonText}>
                  {loading ? 'Creating...' : 'Create Account'}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Designation Selection Modal */}
      <Modal
        visible={showDesignationModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowDesignationModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.designationModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Designation</Text>
              <TouchableOpacity onPress={() => setShowDesignationModal(false)}>
                <X color={COLORS.text} size={24} />
              </TouchableOpacity>
            </View>

            {/* Scrollable Designation List */}
            <ScrollView
              style={styles.designationScrollView}
              showsVerticalScrollIndicator={true}
            >
              {filteredDesignations.length === 0 ? (
                <View style={styles.emptyDesignationState}>
                  <Briefcase color={COLORS.gray} size={48} />
                  <Text style={styles.emptyDesignationText}>
                    No designations for this role
                  </Text>
                  <Text style={styles.emptyDesignationSubtext}>
                    Create a designation for {selectedRole?.name} role first
                  </Text>
                </View>
              ) : (
                filteredDesignations.map(designation => (
                  <TouchableOpacity
                    key={designation.designationId}
                    style={[
                      styles.designationItem,
                      selectedDesignationId === designation.designationId &&
                        styles.designationItemSelected,
                    ]}
                    onPress={() =>
                      handleSelectDesignation(designation.designationId)
                    }
                    activeOpacity={0.7}
                  >
                    <View style={styles.designationItemContent}>
                      <Briefcase
                        color={
                          selectedDesignationId === designation.designationId
                            ? COLORS.primary
                            : COLORS.gray
                        }
                        size={20}
                      />
                      <Text
                        style={[
                          styles.designationItemText,
                          selectedDesignationId === designation.designationId &&
                            styles.designationItemTextSelected,
                        ]}
                      >
                        {designation.name}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.radioButton,
                        selectedDesignationId === designation.designationId &&
                          styles.radioButtonSelected,
                      ]}
                    >
                      {selectedDesignationId === designation.designationId && (
                        <Circle
                          color={COLORS.primary}
                          size={12}
                          fill={COLORS.primary}
                        />
                      )}
                    </View>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>

            {/* Add New Designation Section (Outside Scroll) */}
            <View style={styles.addDesignationSection}>
              {!showNewDesignationInput ? (
                <TouchableOpacity
                  style={styles.addNewDesignationButton}
                  onPress={() => setShowNewDesignationInput(true)}
                  activeOpacity={0.7}
                >
                  <Plus color={COLORS.primary} size={20} />
                  <Text style={styles.addNewDesignationText}>
                    Add New Designation
                  </Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.newDesignationContainer}>
                  <View style={styles.inputContainer}>
                    <Briefcase
                      color={COLORS.gray}
                      size={20}
                      style={styles.inputIcon}
                    />
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
                      <Text style={styles.createDesignationButtonText}>
                        Create
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
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
          <View style={styles.designationModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Role</Text>
              <TouchableOpacity onPress={() => setShowRoleModal(false)}>
                <X color={COLORS.text} size={24} />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.designationScrollView}
              showsVerticalScrollIndicator={true}
            >
              {roles.length === 0 ? (
                <View style={styles.emptyDesignationState}>
                  <Briefcase color={COLORS.gray} size={48} />
                  <Text style={styles.emptyDesignationText}>
                    No roles found
                  </Text>
                  <Text style={styles.emptyDesignationSubtext}>
                    Please create roles in Hierarchy Manager first
                  </Text>
                </View>
              ) : (
                roles.map(role => (
                  <TouchableOpacity
                    key={role.id}
                    style={[
                      styles.designationItem,
                      selectedRole?.id === role.id &&
                        styles.designationItemSelected,
                    ]}
                    onPress={() => {
                      setSelectedRole(role);
                      setSelectedDesignationId(null); // Reset designation when role changes
                      setShowRoleModal(false);
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={styles.designationItemContent}>
                      <Briefcase
                        color={
                          selectedRole?.id === role.id
                            ? COLORS.primary
                            : COLORS.gray
                        }
                        size={20}
                      />
                      <Text
                        style={[
                          styles.designationItemText,
                          selectedRole?.id === role.id &&
                            styles.designationItemTextSelected,
                        ]}
                      >
                        {role.name}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.radioButton,
                        selectedRole?.id === role.id &&
                          styles.radioButtonSelected,
                      ]}
                    >
                      {selectedRole?.id === role.id && (
                        <Circle
                          color={COLORS.primary}
                          size={12}
                          fill={COLORS.primary}
                        />
                      )}
                    </View>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
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
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: COLORS.primary,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textLight,
    marginRight: 6,
  },
  activeTabText: {
    color: COLORS.white,
  },
  tabBadge: {
    backgroundColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    minWidth: 24,
    alignItems: 'center',
  },
  activeTabBadge: {
    backgroundColor: COLORS.white + '30',
  },
  tabBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textLight,
  },
  activeTabBadgeText: {
    color: COLORS.white,
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
    alignSelf: 'flex-start', // ⭐ important
    backgroundColor: COLORS.primary + '10',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999, // true pill shape
    gap: 4,
  },
  designationBadgeAdmin: {
    backgroundColor: '#FEE2E2',
  },
  designationText: {
    fontSize: 12,
    color: COLORS.primary,
    marginLeft: 4,
    fontWeight: '500',
  },
  designationTextAdmin: {
    color: '#DC2626',
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
  designationModalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    maxHeight: '70%',
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
  designationSelectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 16,
    height: 50,
    marginBottom: 12,
  },
  designationSelectText: {
    flex: 1,
    fontSize: 16,
    color: COLORS.text,
    marginLeft: 12,
  },
  designationSelectTextPlaceholder: {
    color: COLORS.gray,
  },
  disabledSelectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.border + '40',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 16,
    height: 50,
    marginBottom: 12,
    opacity: 0.6,
  },
  disabledSelectText: {
    flex: 1,
    fontSize: 16,
    color: COLORS.gray,
    marginLeft: 12,
    fontStyle: 'italic',
  },
  designationScrollView: {
    maxHeight: 300,
  },
  emptyDesignationState: {
    alignItems: 'center',
    padding: 40,
  },
  emptyDesignationText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: 12,
  },
  emptyDesignationSubtext: {
    fontSize: 13,
    color: COLORS.textLight,
    marginTop: 4,
    textAlign: 'center',
  },
  designationItem: {
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
  designationItemSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary + '05',
  },
  designationItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  designationItemText: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.text,
    marginLeft: 12,
  },
  designationItemTextSelected: {
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
  addDesignationSection: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 16,
    marginTop: 8,
  },
  addNewDesignationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.primary,
    borderStyle: 'dashed',
    backgroundColor: COLORS.primary + '05',
  },
  addNewDesignationText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.primary,
    marginLeft: 8,
  },
  newDesignationContainer: {
    marginBottom: 0,
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

export default EmployeesScreen;
