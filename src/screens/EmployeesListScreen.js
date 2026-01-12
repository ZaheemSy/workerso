import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  FlatList,
  Modal,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {
  X,
  Search,
  User,
  ShieldCheck,
  Users,
  Plus,
  Mail,
  Phone,
  Lock,
  Eye,
  EyeOff,
  ChevronDown,
  Briefcase,
  Check,
} from 'lucide-react-native';
import { COLORS } from '../constants/colors';
import { ROLES, ROLE_LABELS } from '../constants/roles';
import { useAuth } from '../contexts/AuthContext';
import {
  getUsersByOrg,
  createUser,
  getDesignationsByOrg,
} from '../services/storageService';
import AsyncStorage from '@react-native-async-storage/async-storage';

const EmployeesListScreen = ({ navigation }) => {
  const { session } = useAuth();
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [allUsers, setAllUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    username: '',
    password: '',
    confirmPassword: '',
  });
  const [selectedRole, setSelectedRole] = useState('');
  const [roles, setRoles] = useState([]);
  const [showRoleDropdown, setShowRoleDropdown] = useState(false);
  const [designations, setDesignations] = useState([]);
  const [selectedDesignationId, setSelectedDesignationId] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    loadUsers();
    loadRolesFromHierarchy();
    loadDesignations();
  }, []);

  useEffect(() => {
    filterUsers();
  }, [activeTab, searchQuery, allUsers]);

  const loadUsers = async () => {
    try {
      const users = await getUsersByOrg(session.orgId);
      // Filter out super admins, only show admins, workers, and employees
      const filteredByRole = users.filter(
        user =>
          user.role === ROLES.ADMIN ||
          user.role === ROLES.WORKER ||
          user.role === ROLES.EMPLOYEE,
      );
      setAllUsers(filteredByRole);
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  const filterUsers = () => {
    let filtered = [...allUsers];

    // Filter by tab
    if (activeTab === 'admins') {
      filtered = filtered.filter(user => user.role === ROLES.ADMIN);
    } else if (activeTab === 'workers') {
      filtered = filtered.filter(user => user.role === ROLES.WORKER);
    } else if (activeTab === 'employees') {
      filtered = filtered.filter(user => user.role === ROLES.EMPLOYEE);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        user =>
          user.name.toLowerCase().includes(query) ||
          user.username.toLowerCase().includes(query) ||
          user.email.toLowerCase().includes(query),
      );
    }

    setFilteredUsers(filtered);
  };

  const loadRolesFromHierarchy = async () => {
    try {
      const key = `hierarchy_${session.orgId}`;
      const stored = await AsyncStorage.getItem(key);

      if (stored) {
        const hierarchy = JSON.parse(stored);
        const extractedRoles = extractRolesFromTree(hierarchy);
        setRoles(extractedRoles);
      }
    } catch (error) {
      console.error('Error loading roles from hierarchy:', error);
    }
  };

  const extractRolesFromTree = node => {
    let rolesList = [];

    if (node.id !== 'root' && !node.name.includes('Role-')) {
      rolesList.push(node.name);
    }

    if (node.children && node.children.length > 0) {
      node.children.forEach(child => {
        rolesList = rolesList.concat(extractRolesFromTree(child));
      });
    }

    return rolesList;
  };

  const loadDesignations = async () => {
    try {
      const designationsList = await getDesignationsByOrg(session.orgId);
      setDesignations(designationsList);
    } catch (error) {
      console.error('Error loading designations:', error);
    }
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      username: '',
      password: '',
      confirmPassword: '',
    });
    setSelectedRole('');
    setSelectedDesignationId(null);
    setShowPassword(false);
    setShowConfirmPassword(false);
  };

  const validateForm = () => {
    const { name, email, phone, username, password, confirmPassword } =
      formData;

    if (!name.trim()) {
      Alert.alert('Error', 'Please enter employee name');
      return false;
    }
    if (!selectedRole) {
      Alert.alert('Error', 'Please select a role');
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
      const employee = await createUser({
        orgId: session.orgId,
        role: ROLES.EMPLOYEE,
        name: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        phone: formData.phone.trim(),
        username: formData.username.trim().toLowerCase(),
        password: formData.password,
        adminId: session.role === ROLES.ADMIN ? session.userId : null,
        designationId: selectedDesignationId,
        createdBy: session.userId,
        extraDetails: {
          hierarchyRole: selectedRole,
        },
      });

      if (!employee) {
        throw new Error('Failed to create employee');
      }

      setLoading(false);
      Alert.alert(
        'Success!',
        `Employee account created successfully.\n\nUsername: ${employee.username}\nPassword: ${formData.password}\n\nPlease share these credentials with the employee.`,
        [
          {
            text: 'OK',
            onPress: () => {
              setShowAddModal(false);
              resetForm();
              loadUsers(); // Refresh the list
            },
          },
        ],
      );
    } catch (error) {
      setLoading(false);
      Alert.alert('Error', error.message || 'Failed to create employee');
      console.error('Add employee error:', error);
    }
  };

  const getUserIcon = role => {
    if (role === ROLES.ADMIN) {
      return <ShieldCheck color={COLORS.primary} size={20} />;
    }
    return <User color={COLORS.secondary} size={20} />;
  };

  const renderUserCard = ({ item }) => (
    <TouchableOpacity
      style={styles.userCard}
      onPress={() => navigation.navigate('UserDetail', { userId: item.userId })}
      activeOpacity={0.7}
    >
      <View style={styles.userIconContainer}>{getUserIcon(item.role)}</View>
      <View style={styles.userInfo}>
        <Text style={styles.userName}>{item.name}</Text>
        <Text style={styles.userUsername}>@{item.username}</Text>
        <Text style={styles.userEmail}>{item.email}</Text>
      </View>
      <View style={styles.roleContainer}>
        <Text
          style={[
            styles.roleText,
            item.role === ROLES.ADMIN ? styles.adminRole : styles.workerRole,
          ]}
        >
          {ROLE_LABELS[item.role]}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const tabs = [
    { key: 'all', label: 'All', count: allUsers.length },
    {
      key: 'admins',
      label: 'Admins',
      count: allUsers.filter(u => u.role === ROLES.ADMIN).length,
    },
    {
      key: 'employees',
      label: 'Employees',
      count: allUsers.filter(u => u.role === ROLES.EMPLOYEE).length,
    },
    {
      key: 'workers',
      label: 'Workers',
      count: allUsers.filter(u => u.role === ROLES.WORKER).length,
    },
  ];

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
            placeholder="Search by name, username, or email..."
            placeholderTextColor={COLORS.gray}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        {/* Tabs */}
        <View style={styles.tabsContainer}>
          {tabs.map(tab => (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tab, activeTab === tab.key && styles.activeTab]}
              onPress={() => setActiveTab(tab.key)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.tabText,
                  activeTab === tab.key && styles.activeTabText,
                ]}
              >
                {tab.label}
              </Text>
              <View
                style={[
                  styles.tabBadge,
                  activeTab === tab.key && styles.activeTabBadge,
                ]}
              >
                <Text
                  style={[
                    styles.tabBadgeText,
                    activeTab === tab.key && styles.activeTabBadgeText,
                  ]}
                >
                  {tab.count}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* User List */}
        {filteredUsers.length === 0 ? (
          <View style={styles.emptyState}>
            <Users color={COLORS.gray} size={48} />
            <Text style={styles.emptyText}>
              {searchQuery.trim() ? 'No users found' : 'No users yet'}
            </Text>
            <Text style={styles.emptySubtext}>
              {searchQuery.trim()
                ? 'Try a different search term'
                : 'Add admins and workers to get started'}
            </Text>
          </View>
        ) : (
          <FlatList
            data={filteredUsers}
            keyExtractor={item => item.userId}
            renderItem={renderUserCard}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContainer}
          />
        )}
      </View>

      {/* Floating Action Button */}
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
          style={styles.modalContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.modalContent}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add New Employee</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <X color={COLORS.text} size={24} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Name */}
              <View style={styles.inputContainer}>
                <User color={COLORS.gray} size={20} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Full Name *"
                  placeholderTextColor={COLORS.gray}
                  value={formData.name}
                  onChangeText={value => handleChange('name', value)}
                  autoCapitalize="words"
                />
              </View>

              {/* Role Dropdown */}
              <Text style={styles.fieldLabel}>Role *</Text>
              <TouchableOpacity
                style={styles.dropdownContainer}
                onPress={() => setShowRoleDropdown(!showRoleDropdown)}
                activeOpacity={0.7}
              >
                <Briefcase
                  color={COLORS.gray}
                  size={20}
                  style={styles.inputIcon}
                />
                <Text
                  style={[
                    styles.dropdownText,
                    !selectedRole && styles.placeholderText,
                  ]}
                >
                  {selectedRole || 'Select Role'}
                </Text>
                <ChevronDown color={COLORS.gray} size={20} />
              </TouchableOpacity>

              {showRoleDropdown && (
                <View style={styles.dropdownList}>
                  {roles.length === 0 ? (
                    <View style={styles.emptyRoleContainer}>
                      <Text style={styles.emptyRoleText}>
                        No roles defined. Please create roles in Hierarchy
                        Manager first.
                      </Text>
                    </View>
                  ) : (
                    roles.map((role, index) => (
                      <TouchableOpacity
                        key={index}
                        style={[
                          styles.dropdownItem,
                          selectedRole === role && styles.dropdownItemSelected,
                        ]}
                        onPress={() => {
                          setSelectedRole(role);
                          setShowRoleDropdown(false);
                        }}
                        activeOpacity={0.7}
                      >
                        <Text
                          style={[
                            styles.dropdownItemText,
                            selectedRole === role &&
                              styles.dropdownItemTextSelected,
                          ]}
                        >
                          {role}
                        </Text>
                        {selectedRole === role && (
                          <Check color={COLORS.primary} size={20} />
                        )}
                      </TouchableOpacity>
                    ))
                  )}
                </View>
              )}

              {/* Email */}
              <View style={styles.inputContainer}>
                <Mail color={COLORS.gray} size={20} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Email *"
                  placeholderTextColor={COLORS.gray}
                  value={formData.email}
                  onChangeText={value => handleChange('email', value)}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              {/* Phone */}
              <View style={styles.inputContainer}>
                <Phone color={COLORS.gray} size={20} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Phone Number *"
                  placeholderTextColor={COLORS.gray}
                  value={formData.phone}
                  onChangeText={value => handleChange('phone', value)}
                  keyboardType="phone-pad"
                />
              </View>

              {/* Username */}
              <View style={styles.inputContainer}>
                <User color={COLORS.gray} size={20} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Username *"
                  placeholderTextColor={COLORS.gray}
                  value={formData.username}
                  onChangeText={value => handleChange('username', value)}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              {/* Password */}
              <View style={styles.inputContainer}>
                <Lock color={COLORS.gray} size={20} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Password *"
                  placeholderTextColor={COLORS.gray}
                  value={formData.password}
                  onChangeText={value => handleChange('password', value)}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff color={COLORS.gray} size={20} />
                  ) : (
                    <Eye color={COLORS.gray} size={20} />
                  )}
                </TouchableOpacity>
              </View>

              {/* Confirm Password */}
              <View style={styles.inputContainer}>
                <Lock color={COLORS.gray} size={20} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Confirm Password *"
                  placeholderTextColor={COLORS.gray}
                  value={formData.confirmPassword}
                  onChangeText={value => handleChange('confirmPassword', value)}
                  secureTextEntry={!showConfirmPassword}
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? (
                    <EyeOff color={COLORS.gray} size={20} />
                  ) : (
                    <Eye color={COLORS.gray} size={20} />
                  )}
                </TouchableOpacity>
              </View>

              {/* Action Buttons */}
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => {
                    setShowAddModal(false);
                    resetForm();
                  }}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.addButton]}
                  onPress={handleAddEmployee}
                  disabled={loading}
                >
                  <Text style={styles.addButtonText}>
                    {loading ? 'Adding...' : 'Add Employee'}
                  </Text>
                </TouchableOpacity>
              </View>
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 16,
    marginBottom: 16,
    height: 48,
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
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: COLORS.primary,
  },
  tabText: {
    fontSize: 14,
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
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textLight,
  },
  activeTabBadgeText: {
    color: COLORS.white,
  },
  listContainer: {
    paddingBottom: 16,
  },
  userCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  userIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 2,
  },
  userUsername: {
    fontSize: 14,
    color: COLORS.textLight,
    marginBottom: 2,
  },
  userEmail: {
    fontSize: 12,
    color: COLORS.textLight,
  },
  roleContainer: {
    marginLeft: 8,
  },
  roleText: {
    fontSize: 12,
    fontWeight: '600',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    overflow: 'hidden',
  },
  adminRole: {
    backgroundColor: COLORS.primary + '15',
    color: COLORS.primary,
  },
  workerRole: {
    backgroundColor: COLORS.secondary + '15',
    color: COLORS.secondary,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
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
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
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
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 16,
    marginBottom: 12,
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
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
    marginTop: 4,
  },
  dropdownContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 16,
    marginBottom: 12,
    height: 56,
  },
  dropdownText: {
    flex: 1,
    fontSize: 16,
    color: COLORS.text,
  },
  placeholderText: {
    color: COLORS.gray,
  },
  dropdownList: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 12,
    maxHeight: 200,
  },
  dropdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  dropdownItemSelected: {
    backgroundColor: COLORS.primary + '10',
  },
  dropdownItemText: {
    fontSize: 16,
    color: COLORS.text,
  },
  dropdownItemTextSelected: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  emptyRoleContainer: {
    padding: 20,
    alignItems: 'center',
  },
  emptyRoleText: {
    fontSize: 14,
    color: COLORS.textLight,
    textAlign: 'center',
    lineHeight: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
    marginBottom: 20,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 16,
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
  addButton: {
    backgroundColor: COLORS.primary,
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.white,
  },
});

export default EmployeesListScreen;
