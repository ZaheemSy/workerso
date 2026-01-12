import React, { useState } from 'react';
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
  Modal,
} from 'react-native';
import { Building2, User, Mail, Phone, Lock, UserPlus, Eye, EyeOff, Award, ChevronDown } from 'lucide-react-native';
import { COLORS } from '../constants/colors';
import { ROLES } from '../constants/roles';
import { createOrganization, createUser } from '../services/storageService';

const SignupScreen = ({ navigation }) => {
  const [formData, setFormData] = useState({
    companyName: '',
    superAdminName: '',
    email: '',
    phone: '',
    username: '',
    password: '',
    confirmPassword: '',
  });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [selectedDesignation, setSelectedDesignation] = useState('Super Admin');
  const [customDesignation, setCustomDesignation] = useState('');
  const [showDesignationModal, setShowDesignationModal] = useState(false);
  const [tempSelectedDesignation, setTempSelectedDesignation] = useState('Super Admin');
  const [tempCustomDesignation, setTempCustomDesignation] = useState('');
  const [showDesignationDropdown, setShowDesignationDropdown] = useState(false);

  const DESIGNATION_OPTIONS = ['CEO', 'Owner', 'Director', 'Super Admin', 'Custom'];

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleOpenDesignationModal = () => {
    setTempSelectedDesignation(selectedDesignation);
    setTempCustomDesignation(customDesignation);
    setShowDesignationDropdown(false);
    setShowDesignationModal(true);
  };

  const handleConfirmDesignation = () => {
    if (tempSelectedDesignation === 'Custom' && !tempCustomDesignation.trim()) {
      Alert.alert('Error', 'Please enter custom role');
      return;
    }
    setSelectedDesignation(tempSelectedDesignation);
    setCustomDesignation(tempCustomDesignation);
    setShowDesignationModal(false);
  };

  const validateForm = () => {
    const { companyName, superAdminName, email, phone, username, password, confirmPassword } = formData;

    if (!companyName.trim()) {
      Alert.alert('Error', 'Please enter organization name');
      return false;
    }
    if (!superAdminName.trim()) {
      Alert.alert('Error', 'Please enter super admin name');
      return false;
    }
    if (selectedDesignation === 'Custom' && !customDesignation.trim()) {
      Alert.alert('Error', 'Please enter custom role');
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

  const handleSignup = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      // Create organization
      const org = await createOrganization({
        companyName: formData.companyName.trim(),
        industry: '',
        address: '',
        logoUri: null,
      });

      if (!org) {
        throw new Error('Failed to create organization');
      }

      // Determine final designation
      const finalDesignation = selectedDesignation === 'Custom'
        ? customDesignation.trim()
        : selectedDesignation;

      // Create super admin user
      const user = await createUser({
        orgId: org.orgId,
        role: ROLES.SUPER_ADMIN,
        name: formData.superAdminName.trim(),
        email: formData.email.trim().toLowerCase(),
        phone: formData.phone.trim(),
        username: formData.username.trim().toLowerCase(),
        password: formData.password,
        designation: finalDesignation,
        extraDetails: {},
      });

      if (!user) {
        throw new Error('Failed to create super admin');
      }

      setLoading(false);
      Alert.alert(
        'Success!',
        'Organization and Super Admin account created successfully. Please login.',
        [{ text: 'OK', onPress: () => navigation.replace('Login') }]
      );
    } catch (error) {
      setLoading(false);
      Alert.alert('Error', error.message || 'Failed to create account');
      console.error('Signup error:', error);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.header}>
          <Text style={styles.title}>Create Organization</Text>
          <Text style={styles.subtitle}>Setup your organization and super admin account</Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.sectionTitle}>Organization Details</Text>

          <View style={styles.inputContainer}>
            <Building2 color={COLORS.gray} size={20} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Organization Name"
              placeholderTextColor={COLORS.gray}
              value={formData.companyName}
              onChangeText={value => handleChange('companyName', value)}
              autoCapitalize="words"
            />
          </View>

          <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Super Admin Details</Text>

          <View style={styles.inputContainer}>
            <User color={COLORS.gray} size={20} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Full Name"
              placeholderTextColor={COLORS.gray}
              value={formData.superAdminName}
              onChangeText={value => handleChange('superAdminName', value)}
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

          <Text style={styles.fieldLabel}>Your Role</Text>
          <TouchableOpacity
            style={styles.inputContainer}
            onPress={handleOpenDesignationModal}
            activeOpacity={0.7}
          >
            <Award color={COLORS.gray} size={20} style={styles.inputIcon} />
            <Text style={[styles.input, styles.inputText]}>
              {selectedDesignation === 'Custom' && customDesignation
                ? customDesignation
                : selectedDesignation}
            </Text>
            <ChevronDown color={COLORS.gray} size={20} />
          </TouchableOpacity>

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
            onPress={handleSignup}
            disabled={loading}
          >
            <UserPlus color={COLORS.white} size={20} style={styles.buttonIcon} />
            <Text style={styles.buttonText}>
              {loading ? 'Creating...' : 'Create Organization'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.loginLink}
            onPress={() => navigation.navigate('Login')}
          >
            <Text style={styles.loginText}>
              Already have an account? <Text style={styles.loginTextBold}>Login</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Designation Selection Modal */}
      <Modal
        visible={showDesignationModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDesignationModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Your Role</Text>

            <Text style={styles.modalLabel}>Choose from options</Text>
            <TouchableOpacity
              style={styles.modalDropdownContainer}
              onPress={() => setShowDesignationDropdown(!showDesignationDropdown)}
            >
              <Text style={styles.modalDropdownText}>{tempSelectedDesignation}</Text>
              <ChevronDown color={COLORS.gray} size={20} />
            </TouchableOpacity>

            {showDesignationDropdown && (
              <View style={styles.modalDropdownList}>
                {DESIGNATION_OPTIONS.map((option) => (
                  <TouchableOpacity
                    key={option}
                    style={[
                      styles.modalDropdownItem,
                      tempSelectedDesignation === option && styles.modalDropdownItemSelected,
                    ]}
                    onPress={() => {
                      setTempSelectedDesignation(option);
                      setShowDesignationDropdown(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.modalDropdownItemText,
                        tempSelectedDesignation === option && styles.modalDropdownItemTextSelected,
                      ]}
                    >
                      {option}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {tempSelectedDesignation === 'Custom' && (
              <View style={styles.customInputWrapper}>
                <Text style={styles.modalLabel}>Enter Custom Role</Text>
                <TextInput
                  style={styles.modalCustomInput}
                  placeholder="e.g., Founder, Managing Director"
                  placeholderTextColor={COLORS.gray}
                  value={tempCustomDesignation}
                  onChangeText={setTempCustomDesignation}
                  autoCapitalize="words"
                />
              </View>
            )}

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowDesignationModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.okButton]}
                onPress={handleConfirmDesignation}
              >
                <Text style={styles.okButtonText}>OK</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContainer: {
    flexGrow: 1,
    padding: 24,
    paddingTop: 48,
  },
  header: {
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textLight,
    marginTop: 4,
  },
  form: {
    width: '100%',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 12,
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
  dropdownList: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 12,
    overflow: 'hidden',
  },
  dropdownItem: {
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
  button: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
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
  loginLink: {
    marginTop: 24,
    marginBottom: 32,
    alignItems: 'center',
  },
  loginText: {
    fontSize: 14,
    color: COLORS.textLight,
  },
  loginTextBold: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  inputText: {
    flex: 1,
    fontSize: 16,
    color: COLORS.text,
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
  modalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  modalDropdownContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 12,
  },
  modalDropdownText: {
    fontSize: 16,
    color: COLORS.text,
  },
  modalDropdownList: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 12,
    overflow: 'hidden',
  },
  modalDropdownItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalDropdownItemSelected: {
    backgroundColor: COLORS.primary + '10',
  },
  modalDropdownItemText: {
    fontSize: 16,
    color: COLORS.text,
  },
  modalDropdownItemTextSelected: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  customInputWrapper: {
    marginTop: 12,
  },
  modalCustomInput: {
    backgroundColor: COLORS.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: COLORS.text,
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
  okButton: {
    backgroundColor: COLORS.primary,
  },
  okButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.white,
  },
});

export default SignupScreen;
