import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { User, Mail, Phone, Lock, UserPlus, X, ShieldCheck, Circle, Award, Check, Eye, EyeOff, ChevronDown, Briefcase } from 'lucide-react-native';
import { COLORS } from '../constants/colors';
import { ROLES } from '../constants/roles';
import { useAuth } from '../contexts/AuthContext';
import {
  createUser,
  getUsersByOrg,
  getDesignationsByOrg,
  createDesignation
} from '../services/storageService';
import AsyncStorage from '@react-native-async-storage/async-storage';

const AddEmployeeScreen = ({ navigation }) => {
  const { session } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    username: '',
    password: '',
    confirmPassword: '',
  });
  const [loading, setLoading] = useState(false);
  const [admins, setAdmins] = useState([]);
  const [selectedAdminId, setSelectedAdminId] = useState(null); // null means directly under Super Admin
  const [designations, setDesignations] = useState([]);
  const [selectedDesignationId, setSelectedDesignationId] = useState(null);
  const [showNewDesignationInput, setShowNewDesignationInput] = useState(false);
  const [newDesignationName, setNewDesignationName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [roles, setRoles] = useState([]);
  const [selectedRole, setSelectedRole] = useState('');
  const [showRoleDropdown, setShowRoleDropdown] = useState(false);

  useEffect(() => {
    loadDesignations();
    loadRolesFromHierarchy();
    // Only load admins if the current user is Super Admin
    if (session.role === ROLES.SUPER_ADMIN) {
      loadAdmins();
    }
  }, []);

  const loadAdmins = async () => {
    try {
      const allUsers = await getUsersByOrg(session.orgId);
      const adminsList = allUsers.filter(user => user.role === ROLES.ADMIN);
      setAdmins(adminsList);
    } catch (error) {
      console.error('Error loading admins:', error);
    }
  };

  const loadDesignations = async () => {
    try {
      const designationsList = await getDesignationsByOrg(session.orgId);
      setDesignations(designationsList);
    } catch (error) {
      console.error('Error loading designations:', error);
    }
  };

  const loadRolesFromHierarchy = async () => {
    try {
      // Load hierarchy from AsyncStorage (Firebase-ready structure)
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

  // Helper function to recursively extract all role names from hierarchy tree
  const extractRolesFromTree = (node) => {
    let rolesList = [];

    // Skip root node (Super Admin designation) and generic placeholders
    if (node.id !== 'root' && !node.name.includes('Role-')) {
      rolesList.push(node.name);
    }

    // Recursively extract from children
    if (node.children && node.children.length > 0) {
      node.children.forEach(child => {
        rolesList = rolesList.concat(extractRolesFromTree(child));
      });
    }

    return rolesList;
  };

  const handleAddNewDesignation = async () => {
    if (!newDesignationName.trim()) {
      Alert.alert('Error', 'Please enter designation name');
      return;
    }

    try {
      const newDesignation = await createDesignation({
        orgId: session.orgId,
        name: newDesignationName.trim(),
        createdBy: session.userId,
      });

      await loadDesignations();
      setSelectedDesignationId(newDesignation.designationId);
      setNewDesignationName('');
      setShowNewDesignationInput(false);
      Alert.alert('Success', 'Designation created successfully');
    } catch (error) {
      console.error('Error creating designation:', error);
      Alert.alert('Error', 'Failed to create designation');
    }
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const validateForm = () => {
    const { name, email, phone, username, password, confirmPassword } = formData;

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

  const handleAddWorker = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      // Determine adminId based on user role
      let assignedAdminId = null;

      if (session.role === ROLES.ADMIN) {
        // If current user is Admin, automatically assign to themselves
        assignedAdminId = session.userId;
      } else if (session.role === ROLES.SUPER_ADMIN) {
        // If Super Admin, use the selected admin (or null for direct assignment)
        assignedAdminId = selectedAdminId;
      }

      const employee = await createUser({
        orgId: session.orgId,
        role: ROLES.EMPLOYEE,
        name: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        phone: formData.phone.trim(),
        username: formData.username.trim().toLowerCase(),
        password: formData.password,
        adminId: assignedAdminId,
        designationId: selectedDesignationId,
        createdBy: session.userId, // Track who created this employee
        extraDetails: {
          hierarchyRole: selectedRole, // Role from hierarchy manager (Firebase-ready)
        },
      });

      if (!employee) {
        throw new Error('Failed to create employee');
      }

      setLoading(false);

      // Create success message based on role
      let adminInfo = '';
      if (session.role === ROLES.ADMIN) {
        adminInfo = '\nAssigned to: You';
      } else if (selectedAdminId) {
        adminInfo = `\nAssigned to: ${admins.find(a => a.userId === selectedAdminId)?.name || 'Admin'}`;
      } else {
        adminInfo = '\nDirectly under Super Admin';
      }

      Alert.alert(
        'Success!',
        `Employee account created successfully.${adminInfo}\n\nUsername: ${employee.username}\nPassword: ${formData.password}\n\nPlease share these credentials with the employee.`,
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      setLoading(false);
      Alert.alert('Error', error.message || 'Failed to create employee account');
      console.error('Add employee error:', error);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
          <X color={COLORS.text} size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add Employee</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionTitle}>Employee Details</Text>

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

        {/* Role Selection */}
        <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Role</Text>
        <Text style={styles.sectionSubtitle}>
          Select the employee's role from the hierarchy
        </Text>

        <TouchableOpacity
          style={styles.dropdownContainer}
          onPress={() => setShowRoleDropdown(!showRoleDropdown)}
          activeOpacity={0.7}
        >
          <Briefcase color={COLORS.gray} size={20} style={styles.inputIcon} />
          <Text style={[styles.dropdownText, !selectedRole && styles.placeholderText]}>
            {selectedRole || 'Select Role'}
          </Text>
          <ChevronDown color={COLORS.gray} size={20} />
        </TouchableOpacity>

        {showRoleDropdown && (
          <View style={styles.dropdownList}>
            {roles.length === 0 ? (
              <View style={styles.emptyRoleContainer}>
                <Text style={styles.emptyRoleText}>
                  No roles defined yet. Please create roles in Hierarchy Manager first.
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
                      selectedRole === role && styles.dropdownItemTextSelected,
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

        {/* Designation Selection */}
        <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Designation</Text>
        <Text style={styles.sectionSubtitle}>
          Select a job title or role for this employee
        </Text>

        {designations.map((designation) => (
          <TouchableOpacity
            key={designation.designationId}
            style={[
              styles.adminCard,
              selectedDesignationId === designation.designationId && styles.adminCardSelected,
            ]}
            onPress={() => setSelectedDesignationId(designation.designationId)}
            activeOpacity={0.7}
          >
            <View style={styles.adminInfo}>
              <Award color={COLORS.gray} size={20} style={{ marginRight: 12 }} />
              <View style={{ flex: 1 }}>
                <Text style={styles.adminName}>{designation.name}</Text>
              </View>
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
        {!showNewDesignationInput ? (
          <TouchableOpacity
            style={styles.addDesignationButton}
            onPress={() => setShowNewDesignationInput(true)}
            activeOpacity={0.7}
          >
            <Award color={COLORS.primary} size={20} />
            <Text style={styles.addDesignationText}>Add New Designation</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.newDesignationContainer}>
            <View style={styles.inputContainer}>
              <Award color={COLORS.gray} size={20} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Designation Name (e.g., Carpenter)"
                placeholderTextColor={COLORS.gray}
                value={newDesignationName}
                onChangeText={setNewDesignationName}
                autoCapitalize="words"
              />
            </View>
            <View style={styles.inlineButtonsRow}>
              <TouchableOpacity
                style={styles.inlineCancelButton}
                onPress={() => {
                  setShowNewDesignationInput(false);
                  setNewDesignationName('');
                }}
              >
                <X color={COLORS.danger} size={18} />
                <Text style={styles.inlineCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.inlineCreateButton}
                onPress={handleAddNewDesignation}
              >
                <Check color={COLORS.white} size={18} />
                <Text style={styles.inlineCreateButtonText}>Create</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {designations.length === 0 && !showNewDesignationInput && (
          <View style={styles.noAdminContainer}>
            <Text style={styles.noAdminText}>No designations available</Text>
            <Text style={styles.noAdminSubtext}>Add a designation above to assign to this employee</Text>
          </View>
        )}

        {/* Only show admin assignment section for Super Admin */}
        {session.role === ROLES.SUPER_ADMIN && (
          <>
            <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Assign to Admin (Optional)</Text>
            <Text style={styles.sectionSubtitle}>
              Select an admin to assign this worker, or leave unselected to keep directly under you
            </Text>

            {/* Option: Directly under Super Admin */}
            <TouchableOpacity
              style={[
                styles.adminCard,
                selectedAdminId === null && styles.adminCardSelected,
              ]}
              onPress={() => setSelectedAdminId(null)}
              activeOpacity={0.7}
            >
              <View style={styles.adminInfo}>
                <ShieldCheck color={COLORS.primary} size={20} style={{ marginRight: 12 }} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.adminName}>Directly under Super Admin</Text>
                  <Text style={styles.adminSubtext}>Worker will report directly to you</Text>
                </View>
              </View>
              <View
                style={[
                  styles.radioButton,
                  selectedAdminId === null && styles.radioButtonSelected,
                ]}
              >
                {selectedAdminId === null && <Circle color={COLORS.primary} size={12} fill={COLORS.primary} />}
              </View>
            </TouchableOpacity>

            {/* List of Admins */}
            {admins.length > 0 && (
              <>
                {admins.map((admin) => (
                  <TouchableOpacity
                    key={admin.userId}
                    style={[
                      styles.adminCard,
                      selectedAdminId === admin.userId && styles.adminCardSelected,
                    ]}
                    onPress={() => setSelectedAdminId(admin.userId)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.adminInfo}>
                      <User color={COLORS.gray} size={20} style={{ marginRight: 12 }} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.adminName}>{admin.name}</Text>
                        <Text style={styles.adminSubtext}>@{admin.username}</Text>
                      </View>
                    </View>
                    <View
                      style={[
                        styles.radioButton,
                        selectedAdminId === admin.userId && styles.radioButtonSelected,
                      ]}
                    >
                      {selectedAdminId === admin.userId && (
                        <Circle color={COLORS.primary} size={12} fill={COLORS.primary} />
                      )}
                    </View>
                  </TouchableOpacity>
                ))}
              </>
            )}

            {admins.length === 0 && (
              <View style={styles.noAdminContainer}>
                <Text style={styles.noAdminText}>No admins available yet</Text>
                <Text style={styles.noAdminSubtext}>Create admins first or worker will be directly under you</Text>
              </View>
            )}
          </>
        )}

        <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Login Credentials</Text>

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
            secureTextEntry={!showPassword}
            autoCapitalize="none"
          />
          <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
            {showPassword ? (
              <EyeOff color={COLORS.gray} size={20} />
            ) : (
              <Eye color={COLORS.gray} size={20} />
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.inputContainer}>
          <Lock color={COLORS.gray} size={20} style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Confirm Password"
            placeholderTextColor={COLORS.gray}
            value={formData.confirmPassword}
            onChangeText={value => handleChange('confirmPassword', value)}
            secureTextEntry={!showConfirmPassword}
            autoCapitalize="none"
          />
          <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
            {showConfirmPassword ? (
              <EyeOff color={COLORS.gray} size={20} />
            ) : (
              <Eye color={COLORS.gray} size={20} />
            )}
          </TouchableOpacity>
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
    </KeyboardAvoidingView>
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
  adminCard: {
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
  adminCardSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary + '05',
  },
  adminInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  adminName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  adminSubtext: {
    fontSize: 14,
    color: COLORS.textLight,
    marginTop: 2,
  },
  radioButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioButtonSelected: {
    borderColor: COLORS.primary,
  },
  noAdminContainer: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
  },
  noAdminText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textLight,
    textAlign: 'center',
  },
  noAdminSubtext: {
    fontSize: 12,
    color: COLORS.textLight,
    textAlign: 'center',
    marginTop: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
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
  addDesignationButton: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.primary,
    borderStyle: 'dashed',
  },
  addDesignationText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.primary,
    marginLeft: 8,
  },
  newDesignationContainer: {
    marginBottom: 12,
  },
  inlineButtonsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  inlineCancelButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.danger,
  },
  inlineCancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.danger,
    marginLeft: 6,
  },
  inlineCreateButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    padding: 12,
  },
  inlineCreateButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.white,
    marginLeft: 6,
  },
  dropdownContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
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
    maxHeight: 250,
    overflow: 'hidden',
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
});

export default AddEmployeeScreen;
