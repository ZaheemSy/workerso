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
  Modal,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Briefcase, X, Save, FileText, Users, Check, Calendar, UserPlus, UsersIcon, Building2, TrendingUp, Search, Phone, MapPin, Plus } from 'lucide-react-native';
import { COLORS } from '../constants/colors';
import { ROLES } from '../constants/roles';
import { useAuth } from '../contexts/AuthContext';
import { createProject, getUsersByOrg, getGroupsByOrg, getDesignationById, getClientsByOrg, createClient } from '../services/storageService';
import { formatDateToISO, formatDateToDDMMYYYY, parseDDMMYYYY } from '../utils/dateUtils';

const CreateProjectScreen = ({ navigation, route }) => {
  const { session } = useAuth();
  const { onProjectCreated } = route.params || {};
  const [formData, setFormData] = useState({
    projectName: '',
    description: '',
    projectFrom: '',
    broughtBy: '',
  });
  const [loading, setLoading] = useState(false);
  const [workers, setWorkers] = useState([]);
  const [groups, setGroups] = useState([]);
  const [selectedWorkers, setSelectedWorkers] = useState([]);
  const [selectedGroups, setSelectedGroups] = useState([]);

  // Modal states
  const [showWorkerModal, setShowWorkerModal] = useState(false);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [showBroughtByModal, setShowBroughtByModal] = useState(false);
  const [showEmployeeListModal, setShowEmployeeListModal] = useState(false);
  const [broughtByType, setBroughtByType] = useState(''); // 'employee' or 'other'
  const [otherBroughtBy, setOtherBroughtBy] = useState('');
  const [employees, setEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState(null);

  // Client modal states
  const [showProjectFromModal, setShowProjectFromModal] = useState(false);
  const [showClientListModal, setShowClientListModal] = useState(false);
  const [showAddClientModal, setShowAddClientModal] = useState(false);
  const [clients, setClients] = useState([]);
  const [clientSearchQuery, setClientSearchQuery] = useState('');

  // Add client form states
  const [newClientName, setNewClientName] = useState('');
  const [newClientContact, setNewClientContact] = useState('');
  const [newClientAddress, setNewClientAddress] = useState('');
  const [savingClient, setSavingClient] = useState(false);

  // Date picker states
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);

  useEffect(() => {
    loadWorkersAndGroups();
    loadClients();
  }, []);

  const loadWorkersAndGroups = async () => {
    try {
      const allUsers = await getUsersByOrg(session.orgId);
      const workersList = allUsers.filter(user => user.role === ROLES.WORKER);
      setWorkers(workersList);

      // Load all employees with their designations
      const employeesWithDesignations = await Promise.all(
        allUsers.map(async (user) => {
          let designationName = null;
          if (user.designationId) {
            const designation = await getDesignationById(user.designationId);
            if (designation) {
              designationName = designation.title;
            }
          }
          return {
            ...user,
            designationName,
          };
        })
      );
      setEmployees(employeesWithDesignations);

      const groupsList = await getGroupsByOrg(session.orgId);
      setGroups(groupsList);
    } catch (error) {
      console.error('Error loading workers and groups:', error);
    }
  };

  const loadClients = async () => {
    try {
      const clientList = await getClientsByOrg(session.orgId);
      setClients(clientList);
    } catch (error) {
      console.error('Error loading clients:', error);
    }
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const toggleWorker = (workerId) => {
    setSelectedWorkers(prev =>
      prev.includes(workerId)
        ? prev.filter(id => id !== workerId)
        : [...prev, workerId]
    );
  };

  const toggleGroup = (groupId) => {
    setSelectedGroups(prev =>
      prev.includes(groupId)
        ? prev.filter(id => id !== groupId)
        : [...prev, groupId]
    );
  };

  const handleBroughtByOptionSelect = (option) => {
    setBroughtByType(option);
    if (option === 'employee') {
      setShowBroughtByModal(false);
      setShowEmployeeListModal(true);
    }
    // If 'other', modal stays open for text input
  };

  const handleEmployeeSelect = (employee) => {
    setSelectedEmployee(employee);
    handleChange('broughtBy', employee.name);
    setShowEmployeeListModal(false);
  };

  const handleOtherBroughtBySubmit = () => {
    if (otherBroughtBy.trim()) {
      handleChange('broughtBy', otherBroughtBy.trim());
      setShowBroughtByModal(false);
      setOtherBroughtBy('');
    } else {
      Alert.alert('Error', 'Please enter a name');
    }
  };

  const handleProjectFromOptionSelect = (option) => {
    if (option === 'client_list') {
      setShowProjectFromModal(false);
      setShowClientListModal(true);
    } else if (option === 'new_client') {
      setShowProjectFromModal(false);
      setShowAddClientModal(true);
    }
  };

  const handleClientSelect = (client) => {
    handleChange('projectFrom', client.name);
    setShowClientListModal(false);
    setClientSearchQuery('');
  };

  const handleAddNewClient = async () => {
    if (!newClientName.trim()) {
      Alert.alert('Error', 'Client name is required');
      return;
    }

    try {
      setSavingClient(true);
      const newClient = await createClient({
        orgId: session.orgId,
        name: newClientName.trim(),
        contactNumber: newClientContact.trim(),
        address: newClientAddress.trim(),
        createdBy: session.userId,
      });

      if (newClient) {
        handleChange('projectFrom', newClient.name);
        Alert.alert('Success', 'Client added successfully');
        resetClientForm();
        setShowAddClientModal(false);
        await loadClients();
      }
    } catch (error) {
      console.error('Error adding client:', error);
      Alert.alert('Error', 'Failed to add client');
    } finally {
      setSavingClient(false);
    }
  };

  const resetClientForm = () => {
    setNewClientName('');
    setNewClientContact('');
    setNewClientAddress('');
  };

  const getFilteredClients = () => {
    if (!clientSearchQuery.trim()) {
      return clients;
    }
    const query = clientSearchQuery.toLowerCase();
    return clients.filter(
      client =>
        client.name?.toLowerCase().includes(query) ||
        client.contactNumber?.toLowerCase().includes(query) ||
        client.address?.toLowerCase().includes(query)
    );
  };

  const handleStartDateChange = (event, selectedDate) => {
    setShowStartDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setStartDate(selectedDate);
    }
  };

  const handleEndDateChange = (event, selectedDate) => {
    setShowEndDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setEndDate(selectedDate);
    }
  };

  const validateForm = () => {
    const { projectName } = formData;

    if (!projectName.trim()) {
      Alert.alert('Error', 'Please enter project name');
      return false;
    }

    return true;
  };

  const handleCreateProject = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      // Collect all workers from selected groups
      let allWorkerIds = [...selectedWorkers];

      selectedGroups.forEach((groupId) => {
        const group = groups.find((g) => g.groupId === groupId);
        if (group && group.workers) {
          allWorkerIds = [...allWorkerIds, ...group.workers];
        }
      });

      // Remove duplicates
      allWorkerIds = [...new Set(allWorkerIds)];

      // Use selected dates only if provided
      let startDateISO = startDate ? formatDateToISO(startDate) : null;
      let endDateISO = endDate ? formatDateToISO(endDate) : null;

      const project = await createProject({
        orgId: session.orgId,
        projectName: formData.projectName.trim(),
        description: formData.description.trim(),
        projectFrom: formData.projectFrom.trim(),
        broughtBy: formData.broughtBy.trim(),
        startDate: startDateISO,
        endDate: endDateISO,
        workers: allWorkerIds,
        groups: selectedGroups,
        siteLogs: [],
        createdBy: session.userId,
      });

      if (!project) {
        throw new Error('Failed to create project');
      }

      setLoading(false);

      const workerCount = allWorkerIds.length;
      const groupCount = selectedGroups.length;
      let message = 'Project created successfully';

      if (workerCount > 0 || groupCount > 0) {
        message += `\n\n`;
        if (workerCount > 0) {
          message += `${workerCount} worker${workerCount !== 1 ? 's' : ''} assigned`;
        }
        if (groupCount > 0) {
          if (workerCount > 0) message += '\n';
          message += `${groupCount} group${groupCount !== 1 ? 's' : ''} assigned`;
        }
      }

      Alert.alert('Success!', message, [
        {
          text: 'OK',
          onPress: () => {
            if (onProjectCreated) onProjectCreated();
            navigation.goBack();
          },
        },
      ]);
    } catch (error) {
      setLoading(false);
      Alert.alert('Error', error.message || 'Failed to create project');
      console.error('Create project error:', error);
    }
  };

  const getWorkerName = (workerId) => {
    const worker = workers.find(w => w.userId === workerId);
    return worker ? worker.name : '';
  };

  const getGroupName = (groupId) => {
    const group = groups.find(g => g.groupId === groupId);
    return group ? group.groupName : '';
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
        <Text style={styles.headerTitle}>Create Project</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionTitle}>Project Details</Text>

        <View style={styles.inputContainer}>
          <Briefcase color={COLORS.gray} size={20} style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Project Name"
            placeholderTextColor={COLORS.gray}
            value={formData.projectName}
            onChangeText={value => handleChange('projectName', value)}
            autoCapitalize="words"
          />
        </View>

        <View style={[styles.inputContainer, styles.textAreaContainer]}>
          <FileText color={COLORS.gray} size={20} style={styles.inputIconTop} />
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Description (optional)"
            placeholderTextColor={COLORS.gray}
            value={formData.description}
            onChangeText={value => handleChange('description', value)}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        <View style={styles.inputContainer}>
          <Building2 color={COLORS.gray} size={20} style={styles.inputIcon} />
          <TouchableOpacity
            style={styles.inputTouchable}
            onPress={() => setShowProjectFromModal(true)}
            activeOpacity={0.7}
          >
            <Text style={[styles.inputText, !formData.projectFrom && styles.placeholderText]}>
              {formData.projectFrom || 'Project is from (optional)'}
            </Text>
          </TouchableOpacity>
          {formData.projectFrom ? (
            <TouchableOpacity
              onPress={() => handleChange('projectFrom', '')}
              style={styles.clearButton}
            >
              <X color={COLORS.gray} size={18} />
            </TouchableOpacity>
          ) : null}
        </View>

        <View style={styles.inputContainer}>
          <TrendingUp color={COLORS.gray} size={20} style={styles.inputIcon} />
          <TouchableOpacity
            style={styles.inputTouchable}
            onPress={() => setShowBroughtByModal(true)}
            activeOpacity={0.7}
          >
            <Text style={[styles.inputText, !formData.broughtBy && styles.placeholderText]}>
              {formData.broughtBy || 'Project brought by (optional)'}
            </Text>
          </TouchableOpacity>
          {formData.broughtBy ? (
            <TouchableOpacity
              onPress={() => handleChange('broughtBy', '')}
              style={styles.clearButton}
            >
              <X color={COLORS.gray} size={18} />
            </TouchableOpacity>
          ) : null}
        </View>

        <View style={styles.inputContainer}>
          <Calendar color={COLORS.gray} size={20} style={styles.inputIcon} />
          <TouchableOpacity
            style={styles.inputTouchable}
            onPress={() => setShowStartDatePicker(true)}
            activeOpacity={0.7}
          >
            <Text style={[styles.inputText, !startDate && styles.placeholderText]}>
              {startDate ? formatDateToDDMMYYYY(startDate) : 'Start Date (optional)'}
            </Text>
          </TouchableOpacity>
          {startDate ? (
            <TouchableOpacity
              onPress={() => setStartDate(null)}
              style={styles.clearButton}
            >
              <X color={COLORS.gray} size={18} />
            </TouchableOpacity>
          ) : null}
        </View>

        <View style={styles.inputContainer}>
          <Calendar color={COLORS.gray} size={20} style={styles.inputIcon} />
          <TouchableOpacity
            style={styles.inputTouchable}
            onPress={() => setShowEndDatePicker(true)}
            activeOpacity={0.7}
          >
            <Text style={[styles.inputText, !endDate && styles.placeholderText]}>
              {endDate ? formatDateToDDMMYYYY(endDate) : 'End Date (optional)'}
            </Text>
          </TouchableOpacity>
          {endDate ? (
            <TouchableOpacity
              onPress={() => setEndDate(null)}
              style={styles.clearButton}
            >
              <X color={COLORS.gray} size={18} />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Worker and Group Assignment Section */}
        <Text style={[styles.sectionTitle, { marginTop: 16 }]}>
          Assign Workers & Groups (Optional)
        </Text>
        <Text style={styles.sectionSubtitle}>
          You can add workers and groups now or later
        </Text>

        {/* Assign Workers Button */}
        <TouchableOpacity
          style={styles.assignButton}
          onPress={() => setShowWorkerModal(true)}
          activeOpacity={0.7}
        >
          <UserPlus color={COLORS.primary} size={20} />
          <View style={styles.assignButtonContent}>
            <Text style={styles.assignButtonTitle}>Assign Workers</Text>
            <Text style={styles.assignButtonSubtitle}>
              {selectedWorkers.length > 0
                ? `${selectedWorkers.length} worker${selectedWorkers.length !== 1 ? 's' : ''} selected`
                : 'Select individual workers'}
            </Text>
          </View>
        </TouchableOpacity>

        {/* Show selected workers */}
        {selectedWorkers.length > 0 && (
          <View style={styles.selectedContainer}>
            <Text style={styles.selectedTitle}>Selected Workers:</Text>
            <View style={styles.selectedChipsContainer}>
              {selectedWorkers.map((workerId) => (
                <View key={workerId} style={styles.selectedChip}>
                  <Text style={styles.selectedChipText}>{getWorkerName(workerId)}</Text>
                  <TouchableOpacity onPress={() => toggleWorker(workerId)}>
                    <X color={COLORS.primary} size={14} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Assign Groups Button */}
        <TouchableOpacity
          style={styles.assignButton}
          onPress={() => setShowGroupModal(true)}
          activeOpacity={0.7}
        >
          <UsersIcon color={COLORS.secondary} size={20} />
          <View style={styles.assignButtonContent}>
            <Text style={styles.assignButtonTitle}>Assign Worker Groups</Text>
            <Text style={styles.assignButtonSubtitle}>
              {selectedGroups.length > 0
                ? `${selectedGroups.length} group${selectedGroups.length !== 1 ? 's' : ''} selected`
                : 'Select worker groups'}
            </Text>
          </View>
        </TouchableOpacity>

        {/* Show selected groups */}
        {selectedGroups.length > 0 && (
          <View style={styles.selectedContainer}>
            <Text style={styles.selectedTitle}>Selected Groups:</Text>
            <View style={styles.selectedChipsContainer}>
              {selectedGroups.map((groupId) => (
                <View key={groupId} style={[styles.selectedChip, styles.selectedChipGroup]}>
                  <Text style={[styles.selectedChipText, styles.selectedChipTextGroup]}>
                    {getGroupName(groupId)}
                  </Text>
                  <TouchableOpacity onPress={() => toggleGroup(groupId)}>
                    <X color={COLORS.secondary} size={14} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </View>
        )}

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleCreateProject}
          disabled={loading}
        >
          <Save color={COLORS.white} size={20} style={styles.buttonIcon} />
          <Text style={styles.buttonText}>
            {loading ? 'Creating...' : 'Create Project'}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Worker Selection Modal */}
      <Modal
        visible={showWorkerModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowWorkerModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Workers</Text>
              <TouchableOpacity onPress={() => setShowWorkerModal(false)}>
                <X color={COLORS.text} size={24} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubtitle}>
              {selectedWorkers.length} worker{selectedWorkers.length !== 1 ? 's' : ''} selected
            </Text>

            <ScrollView
              style={styles.modalScroll}
              showsVerticalScrollIndicator={true}
            >
              {workers.length === 0 ? (
                <View style={styles.emptyState}>
                  <Users color={COLORS.gray} size={48} />
                  <Text style={styles.emptyText}>No workers available</Text>
                  <Text style={styles.emptySubtext}>Add workers first</Text>
                </View>
              ) : (
                workers.map((worker) => (
                  <TouchableOpacity
                    key={worker.userId}
                    style={[
                      styles.selectionCard,
                      selectedWorkers.includes(worker.userId) && styles.selectionCardSelected,
                    ]}
                    onPress={() => toggleWorker(worker.userId)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.selectionCardContent}>
                      <Text style={styles.selectionCardTitle}>{worker.name}</Text>
                      <Text style={styles.selectionCardSubtitle}>@{worker.username}</Text>
                    </View>
                    {selectedWorkers.includes(worker.userId) && (
                      <View style={styles.checkIcon}>
                        <Check color={COLORS.white} size={16} />
                      </View>
                    )}
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>

            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => setShowWorkerModal(false)}
            >
              <Text style={styles.modalButtonText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Group Selection Modal */}
      <Modal
        visible={showGroupModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowGroupModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Worker Groups</Text>
              <TouchableOpacity onPress={() => setShowGroupModal(false)}>
                <X color={COLORS.text} size={24} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubtitle}>
              {selectedGroups.length} group{selectedGroups.length !== 1 ? 's' : ''} selected
            </Text>

            <ScrollView
              style={styles.modalScroll}
              showsVerticalScrollIndicator={true}
            >
              {groups.length === 0 ? (
                <View style={styles.emptyState}>
                  <UsersIcon color={COLORS.gray} size={48} />
                  <Text style={styles.emptyText}>No worker groups available</Text>
                  <Text style={styles.emptySubtext}>Create worker groups first</Text>
                </View>
              ) : (
                groups.map((group) => (
                  <TouchableOpacity
                    key={group.groupId}
                    style={[
                      styles.selectionCard,
                      selectedGroups.includes(group.groupId) && styles.selectionCardSelected,
                    ]}
                    onPress={() => toggleGroup(group.groupId)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.selectionCardContent}>
                      <Text style={styles.selectionCardTitle}>{group.groupName}</Text>
                      <Text style={styles.selectionCardSubtitle}>
                        {group.workers?.length || 0} worker{(group.workers?.length || 0) !== 1 ? 's' : ''}
                      </Text>
                    </View>
                    {selectedGroups.includes(group.groupId) && (
                      <View style={styles.checkIcon}>
                        <Check color={COLORS.white} size={16} />
                      </View>
                    )}
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>

            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => setShowGroupModal(false)}
            >
              <Text style={styles.modalButtonText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Brought By Selection Modal */}
      <Modal
        visible={showBroughtByModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowBroughtByModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Project Brought By</Text>
              <TouchableOpacity onPress={() => setShowBroughtByModal(false)}>
                <X color={COLORS.text} size={24} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Employees Option */}
              <TouchableOpacity
                style={[styles.optionCard, broughtByType === 'employee' && styles.optionCardSelected]}
                onPress={() => handleBroughtByOptionSelect('employee')}
                activeOpacity={0.7}
              >
                <Users color={broughtByType === 'employee' ? COLORS.primary : COLORS.text} size={24} />
                <View style={styles.optionCardContent}>
                  <Text style={styles.optionCardTitle}>Employees</Text>
                  <Text style={styles.optionCardSubtitle}>Select from organization employees</Text>
                </View>
              </TouchableOpacity>

              {/* Others Option */}
              <TouchableOpacity
                style={[styles.optionCard, broughtByType === 'other' && styles.optionCardSelected]}
                onPress={() => handleBroughtByOptionSelect('other')}
                activeOpacity={0.7}
              >
                <UserPlus color={broughtByType === 'other' ? COLORS.primary : COLORS.text} size={24} />
                <View style={styles.optionCardContent}>
                  <Text style={styles.optionCardTitle}>Others</Text>
                  <Text style={styles.optionCardSubtitle}>Enter name manually</Text>
                </View>
              </TouchableOpacity>

              {/* Text Input for Others */}
              {broughtByType === 'other' && (
                <View style={styles.otherInputSection}>
                  <TextInput
                    style={styles.otherInput}
                    placeholder="Enter name"
                    placeholderTextColor={COLORS.gray}
                    value={otherBroughtBy}
                    onChangeText={setOtherBroughtBy}
                    autoCapitalize="words"
                  />
                  <TouchableOpacity
                    style={styles.submitButton}
                    onPress={handleOtherBroughtBySubmit}
                  >
                    <Text style={styles.submitButtonText}>Confirm</Text>
                  </TouchableOpacity>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Employee List Modal */}
      <Modal
        visible={showEmployeeListModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowEmployeeListModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Employee</Text>
              <TouchableOpacity onPress={() => setShowEmployeeListModal(false)}>
                <X color={COLORS.text} size={24} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={true}>
              {employees.length === 0 ? (
                <View style={styles.emptyState}>
                  <Users color={COLORS.gray} size={48} />
                  <Text style={styles.emptyText}>No employees found</Text>
                </View>
              ) : (
                employees.map((employee) => (
                  <TouchableOpacity
                    key={employee.userId}
                    style={styles.employeeCard}
                    onPress={() => handleEmployeeSelect(employee)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.employeeCardContent}>
                      <Text style={styles.employeeCardName}>{employee.name}</Text>
                      {employee.designationName && (
                        <View style={styles.designationPill}>
                          <Text style={styles.designationPillText}>{employee.designationName}</Text>
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Project From Selection Modal */}
      <Modal
        visible={showProjectFromModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowProjectFromModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Project is from</Text>
              <TouchableOpacity onPress={() => setShowProjectFromModal(false)}>
                <X color={COLORS.text} size={24} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <TouchableOpacity
                style={styles.optionCard}
                onPress={() => handleProjectFromOptionSelect('client_list')}
                activeOpacity={0.7}
              >
                <Building2 color={COLORS.primary} size={24} />
                <View style={styles.optionCardContent}>
                  <Text style={styles.optionCardTitle}>Client List</Text>
                  <Text style={styles.optionCardSubtitle}>Select from existing clients</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.optionCard}
                onPress={() => handleProjectFromOptionSelect('new_client')}
                activeOpacity={0.7}
              >
                <Plus color={COLORS.success} size={24} />
                <View style={styles.optionCardContent}>
                  <Text style={styles.optionCardTitle}>New Client</Text>
                  <Text style={styles.optionCardSubtitle}>Add a new client</Text>
                </View>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Client List Modal */}
      <Modal
        visible={showClientListModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowClientListModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Client</Text>
              <TouchableOpacity onPress={() => setShowClientListModal(false)}>
                <X color={COLORS.text} size={24} />
              </TouchableOpacity>
            </View>

            {/* Search Bar */}
            <View style={styles.searchContainer}>
              <Search color={COLORS.gray} size={20} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search clients..."
                placeholderTextColor={COLORS.gray}
                value={clientSearchQuery}
                onChangeText={setClientSearchQuery}
              />
            </View>

            <ScrollView showsVerticalScrollIndicator={true} style={styles.modalScroll}>
              {getFilteredClients().length === 0 ? (
                <View style={styles.emptyState}>
                  <Building2 color={COLORS.gray} size={48} />
                  <Text style={styles.emptyText}>
                    {clientSearchQuery ? 'No clients found' : 'No clients available'}
                  </Text>
                  {!clientSearchQuery && (
                    <Text style={styles.emptySubtext}>Add clients first</Text>
                  )}
                </View>
              ) : (
                getFilteredClients().map((client) => (
                  <TouchableOpacity
                    key={client.clientId}
                    style={styles.clientCard}
                    onPress={() => handleClientSelect(client)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.clientCardContent}>
                      <Text style={styles.clientCardName}>{client.name}</Text>
                      {client.contactNumber && (
                        <View style={styles.clientCardRow}>
                          <Phone color={COLORS.gray} size={14} />
                          <Text style={styles.clientCardDetail}>{client.contactNumber}</Text>
                        </View>
                      )}
                      {client.address && (
                        <View style={styles.clientCardRow}>
                          <MapPin color={COLORS.gray} size={14} />
                          <Text style={styles.clientCardDetail}>{client.address}</Text>
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Add Client Modal */}
      <Modal
        visible={showAddClientModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAddClientModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add New Client</Text>
              <TouchableOpacity
                onPress={() => {
                  setShowAddClientModal(false);
                  resetClientForm();
                }}
              >
                <X color={COLORS.text} size={24} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.formSection}>
                <Text style={styles.formLabel}>Client Name *</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="Enter client or company name"
                  placeholderTextColor={COLORS.gray}
                  value={newClientName}
                  onChangeText={setNewClientName}
                  autoCapitalize="words"
                />
              </View>

              <View style={styles.formSection}>
                <Text style={styles.formLabel}>Contact Number (Optional)</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="Enter contact number"
                  placeholderTextColor={COLORS.gray}
                  value={newClientContact}
                  onChangeText={setNewClientContact}
                  keyboardType="phone-pad"
                />
              </View>

              <View style={styles.formSection}>
                <Text style={styles.formLabel}>Address (Optional)</Text>
                <TextInput
                  style={[styles.formInput, styles.formTextArea]}
                  placeholder="Enter address"
                  placeholderTextColor={COLORS.gray}
                  value={newClientAddress}
                  onChangeText={setNewClientAddress}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
              </View>

              <TouchableOpacity
                style={[styles.submitButton, savingClient && styles.buttonDisabled]}
                onPress={handleAddNewClient}
                disabled={savingClient}
              >
                <Text style={styles.submitButtonText}>
                  {savingClient ? 'Adding...' : 'Add Client'}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Date Pickers */}
      {showStartDatePicker && (
        <DateTimePicker
          value={startDate || new Date()}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleStartDateChange}
        />
      )}

      {showEndDatePicker && (
        <DateTimePicker
          value={endDate || new Date()}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleEndDateChange}
          minimumDate={startDate || new Date()}
        />
      )}
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
  textAreaContainer: {
    height: 120,
    alignItems: 'flex-start',
    paddingTop: 16,
    paddingBottom: 16,
  },
  inputIcon: {
    marginRight: 12,
  },
  inputIconTop: {
    marginRight: 12,
    marginTop: 2,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: COLORS.text,
  },
  inputText: {
    fontSize: 16,
    color: COLORS.text,
  },
  inputTouchable: {
    flex: 1,
    justifyContent: 'center',
  },
  clearButton: {
    padding: 4,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  textArea: {
    height: '100%',
  },
  assignButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    marginBottom: 12,
  },
  assignButtonContent: {
    flex: 1,
    marginLeft: 12,
  },
  assignButtonTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
  },
  assignButtonSubtitle: {
    fontSize: 13,
    color: COLORS.textLight,
    marginTop: 2,
  },
  selectedContainer: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  selectedTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  selectedChipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  selectedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary + '15',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 6,
  },
  selectedChipGroup: {
    backgroundColor: COLORS.secondary + '15',
  },
  selectedChipText: {
    fontSize: 13,
    color: COLORS.primary,
    fontWeight: '500',
  },
  selectedChipTextGroup: {
    color: COLORS.secondary,
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
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  modalSubtitle: {
    fontSize: 14,
    color: COLORS.textLight,
    marginBottom: 16,
  },
  modalScroll: {
    maxHeight: '70%',
  },
  selectionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    marginBottom: 8,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.border,
    backgroundColor: COLORS.background,
  },
  selectionCardSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary + '05',
  },
  selectionCardContent: {
    flex: 1,
  },
  selectionCardTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
  },
  selectionCardSubtitle: {
    fontSize: 13,
    color: COLORS.textLight,
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
  emptyState: {
    alignItems: 'center',
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
  },
  modalButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  modalButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
  placeholderText: {
    color: COLORS.gray,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: COLORS.border,
  },
  optionCardSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary + '10',
  },
  optionCardContent: {
    flex: 1,
    marginLeft: 12,
  },
  optionCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  optionCardSubtitle: {
    fontSize: 13,
    color: COLORS.textLight,
  },
  otherInputSection: {
    marginTop: 16,
    gap: 12,
  },
  otherInput: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  submitButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  submitButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
  employeeCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  employeeCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  employeeCardName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    flex: 1,
  },
  designationPill: {
    backgroundColor: COLORS.primary + '20',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginLeft: 8,
  },
  designationPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primary,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: COLORS.text,
  },
  clientCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  clientCardContent: {
    gap: 8,
  },
  clientCardName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  clientCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  clientCardDetail: {
    fontSize: 14,
    color: COLORS.textLight,
  },
  formSection: {
    marginBottom: 16,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  formInput: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    fontSize: 16,
    color: COLORS.text,
  },
  formTextArea: {
    height: 100,
    textAlignVertical: 'top',
  },
});

export default CreateProjectScreen;
