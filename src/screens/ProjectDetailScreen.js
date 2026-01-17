import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import {
  X,
  Briefcase,
  Users,
  Calendar,
  Camera,
  UserPlus,
  Building2,
  TrendingUp,
  MapPin,
  CalendarDays,
  Edit3,
  Plus,
  Search,
  Phone,
  ClipboardList,
  History,
  ChevronRight,
  Clock,
  Timer,
  Coffee,
  FileText,
} from 'lucide-react-native';
import { COLORS } from '../constants/colors';
import { useAuth } from '../contexts/AuthContext';
import {
  getProjectById,
  getUserById,
  getDesignationById,
  updateProject,
  getUsersByOrg,
  getClientsByOrg,
  createClient,
  createWorkLog,
} from '../services/storageService';
import { formatDateToISO, formatDateToDDMMYYYY } from '../utils/dateUtils';

const ProjectDetailScreen = ({ navigation, route }) => {
  const { session } = useAuth();
  const { projectId, onProjectUpdated } = route.params;
  const [project, setProject] = useState(null);
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Date picker states
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [tempStartDate, setTempStartDate] = useState(null);
  const [tempEndDate, setTempEndDate] = useState(null);

  // Client modal states
  const [showProjectFromModal, setShowProjectFromModal] = useState(false);
  const [showClientListModal, setShowClientListModal] = useState(false);
  const [showAddClientModal, setShowAddClientModal] = useState(false);
  const [clients, setClients] = useState([]);
  const [clientSearchQuery, setClientSearchQuery] = useState('');
  const [newClientName, setNewClientName] = useState('');
  const [newClientContact, setNewClientContact] = useState('');
  const [newClientAddress, setNewClientAddress] = useState('');
  const [savingClient, setSavingClient] = useState(false);

  // Brought By modal states
  const [showBroughtByModal, setShowBroughtByModal] = useState(false);
  const [showEmployeeListModal, setShowEmployeeListModal] = useState(false);
  const [broughtByType, setBroughtByType] = useState('');
  const [otherBroughtBy, setOtherBroughtBy] = useState('');
  const [employees, setEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState(null);

  // Work log modal states
  const [showWorkLogModal, setShowWorkLogModal] = useState(false);
  const [selectedWorkerForLog, setSelectedWorkerForLog] = useState(null);
  const [workLogTab, setWorkLogTab] = useState('single');
  const [logStartDate, setLogStartDate] = useState(new Date());
  const [logEndDate, setLogEndDate] = useState(new Date());
  const [logStartTime, setLogStartTime] = useState(new Date());
  const [logEndTime, setLogEndTime] = useState(null);
  const [durationHours, setDurationHours] = useState('');
  const [durationMinutes, setDurationMinutes] = useState('');
  const [breakDuration, setBreakDuration] = useState('');
  const [showLogStartDatePicker, setShowLogStartDatePicker] = useState(false);
  const [showLogEndDatePicker, setShowLogEndDatePicker] = useState(false);
  const [showLogStartTimePicker, setShowLogStartTimePicker] = useState(false);
  const [showLogEndTimePicker, setShowLogEndTimePicker] = useState(false);
  const [showDurationModal, setShowDurationModal] = useState(false);
  const [loggingWork, setLoggingWork] = useState(false);

  useEffect(() => {
    loadProjectDetails();
    loadClientsAndEmployees();
  }, []);

  const loadClientsAndEmployees = async () => {
    try {
      const clientList = await getClientsByOrg(session.orgId);
      setClients(clientList);

      const allUsers = await getUsersByOrg(session.orgId);
      const employeesWithDesignations = await Promise.all(
        allUsers.map(async user => {
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
        }),
      );
      setEmployees(employeesWithDesignations);
    } catch (error) {
      console.error('Error loading clients and employees:', error);
    }
  };

  const loadProjectDetails = async () => {
    setLoading(true);
    try {
      const projectData = await getProjectById(projectId);

      if (projectData) {
        setProject(projectData);

        const workerDetails = await Promise.all(
          (projectData.workers || []).map(async workerId => {
            const worker = await getUserById(workerId);
            if (worker && worker.designationId) {
              const designation = await getDesignationById(
                worker.designationId,
              );
              worker.designation = designation;
            }
            return worker;
          }),
        );
        setWorkers(workerDetails.filter(w => w !== null));
      }
    } catch (error) {
      console.error('Error loading project details:', error);
      Alert.alert('Error', 'Failed to load project details');
    } finally {
      setLoading(false);
    }
  };

  const handleAddOrChangeStartDate = () => {
    setTempStartDate(
      project.startDate ? new Date(project.startDate) : new Date(),
    );
    setShowStartDatePicker(true);
  };

  const handleAddOrChangeEndDate = () => {
    setTempEndDate(project.endDate ? new Date(project.endDate) : new Date());
    setShowEndDatePicker(true);
  };

  const handleStartDateChange = (event, selectedDate) => {
    setShowStartDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setTempStartDate(selectedDate);
    }
  };

  const handleEndDateChange = (event, selectedDate) => {
    setShowEndDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setTempEndDate(selectedDate);
    }
  };

  const saveStartDate = async () => {
    if (!tempStartDate) return;

    try {
      const updatedProject = {
        ...project,
        startDate: formatDateToISO(tempStartDate),
      };
      await updateProject(projectId, updatedProject);
      setProject(updatedProject);
      setShowStartDatePicker(false);
      Alert.alert('Success', 'Start date updated successfully');
      if (onProjectUpdated) onProjectUpdated();
    } catch (error) {
      console.error('Error updating start date:', error);
      Alert.alert('Error', 'Failed to update start date');
    }
  };

  const saveEndDate = async () => {
    if (!tempEndDate) return;

    try {
      const updatedProject = {
        ...project,
        endDate: formatDateToISO(tempEndDate),
      };
      await updateProject(projectId, updatedProject);
      setProject(updatedProject);
      setShowEndDatePicker(false);
      Alert.alert('Success', 'End date updated successfully');
      if (onProjectUpdated) onProjectUpdated();
    } catch (error) {
      console.error('Error updating end date:', error);
      Alert.alert('Error', 'Failed to update end date');
    }
  };

  // Client handlers
  const handleProjectFromOptionSelect = option => {
    if (option === 'client_list') {
      setShowProjectFromModal(false);
      setShowClientListModal(true);
    } else if (option === 'new_client') {
      setShowProjectFromModal(false);
      setShowAddClientModal(true);
    }
  };

  const handleClientSelect = async client => {
    try {
      const updatedProject = {
        ...project,
        projectFrom: client.name,
      };
      await updateProject(projectId, updatedProject);
      setProject(updatedProject);
      setShowClientListModal(false);
      setClientSearchQuery('');
      Alert.alert('Success', 'Client updated successfully');
      if (onProjectUpdated) onProjectUpdated();
    } catch (error) {
      console.error('Error updating client:', error);
      Alert.alert('Error', 'Failed to update client');
    }
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
        const updatedProject = {
          ...project,
          projectFrom: newClient.name,
        };
        await updateProject(projectId, updatedProject);
        setProject(updatedProject);
        Alert.alert('Success', 'Client added and updated successfully');
        resetClientForm();
        setShowAddClientModal(false);
        await loadClientsAndEmployees();
        if (onProjectUpdated) onProjectUpdated();
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
        client.address?.toLowerCase().includes(query),
    );
  };

  // Brought By handlers
  const handleBroughtByOptionSelect = option => {
    setBroughtByType(option);
    if (option === 'employee') {
      setShowBroughtByModal(false);
      setShowEmployeeListModal(true);
    }
  };

  const handleEmployeeSelect = async employee => {
    try {
      const updatedProject = {
        ...project,
        broughtBy: employee.name,
      };
      await updateProject(projectId, updatedProject);
      setProject(updatedProject);
      setSelectedEmployee(employee);
      setShowEmployeeListModal(false);
      Alert.alert('Success', 'Brought by updated successfully');
      if (onProjectUpdated) onProjectUpdated();
    } catch (error) {
      console.error('Error updating brought by:', error);
      Alert.alert('Error', 'Failed to update brought by');
    }
  };

  const handleOtherBroughtBySubmit = async () => {
    if (!otherBroughtBy.trim()) {
      Alert.alert('Error', 'Please enter a name');
      return;
    }

    try {
      const updatedProject = {
        ...project,
        broughtBy: otherBroughtBy.trim(),
      };
      await updateProject(projectId, updatedProject);
      setProject(updatedProject);
      setShowBroughtByModal(false);
      setOtherBroughtBy('');
      Alert.alert('Success', 'Brought by updated successfully');
      if (onProjectUpdated) onProjectUpdated();
    } catch (error) {
      console.error('Error updating brought by:', error);
      Alert.alert('Error', 'Failed to update brought by');
    }
  };

  if (!project) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.headerButton}
          >
            <X color={COLORS.text} size={24} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Project Details</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>Project not found</Text>
        </View>
      </View>
    );
  }

  const formatDate = date => {
    if (!date) return null;
    const d = new Date(date);
    return d.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatTime = time => {
    if (!time) return '';
    const hours = time.getHours().toString().padStart(2, '0');
    const minutes = time.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  const handleOpenWorkLogModal = worker => {
    setSelectedWorkerForLog(worker);
    setLogStartDate(new Date());
    setLogEndDate(new Date());
    setLogStartTime(new Date());
    setLogEndTime(null);
    setDurationHours('');
    setDurationMinutes('');
    setBreakDuration('');
    setWorkLogTab('single');
    setShowWorkLogModal(true);
  };

  const handleLogWork = async () => {
    if (!selectedWorkerForLog) {
      Alert.alert('Error', 'No worker selected');
      return;
    }

    if (!logStartTime) {
      Alert.alert('Error', 'Start time is required');
      return;
    }

    // Calculate work hours
    let workHours = 0;

    if (logEndTime) {
      // If end time is provided, calculate from start and end time
      const start = new Date(logStartDate);
      start.setHours(logStartTime.getHours(), logStartTime.getMinutes(), 0, 0);

      const end = new Date(logStartDate);
      end.setHours(logEndTime.getHours(), logEndTime.getMinutes(), 0, 0);

      if (end <= start) {
        Alert.alert('Error', 'End time must be after start time');
        return;
      }

      workHours = (end - start) / (1000 * 60 * 60);
    } else if (durationHours || durationMinutes) {
      // If duration is provided
      const hours = parseInt(durationHours) || 0;
      const minutes = parseInt(durationMinutes) || 0;
      workHours = hours + minutes / 60;
    } else {
      Alert.alert('Error', 'Please provide either end time or duration');
      return;
    }

    // Subtract break duration
    if (breakDuration) {
      const breakMinutes = parseInt(breakDuration) || 0;
      workHours -= breakMinutes / 60;
    }

    if (workHours <= 0) {
      Alert.alert('Error', 'Total work hours must be positive');
      return;
    }

    try {
      setLoggingWork(true);

      // Create work log entry
      const workLogData = {
        userId: selectedWorkerForLog.userId,
        projectId: project.projectId,
        date: logStartDate.toISOString(),
        workStart: formatTime(logStartTime),
        workEnd: logEndTime ? formatTime(logEndTime) : null,
        breaks: breakDuration ? [{ duration: breakDuration }] : [],
        description: `Work logged for ${workHours.toFixed(2)} hours`,
        orgId: session.orgId,
      };

      await createWorkLog(workLogData);

      Alert.alert('Success', `Work logged: ${workHours.toFixed(2)} hours`);

      // Reset modal
      setShowWorkLogModal(false);
      setSelectedWorkerForLog(null);
      setLogStartDate(new Date());
      setLogEndDate(new Date());
      setLogStartTime(new Date());
      setLogEndTime(null);
      setDurationHours('');
      setDurationMinutes('');
      setBreakDuration('');
    } catch (error) {
      console.error('Error logging work:', error);
      Alert.alert('Error', 'Failed to log work hours');
    } finally {
      setLoggingWork(false);
    }
  };

  const handleLogMultipleDaysWork = async () => {
    if (!selectedWorkerForLog) {
      Alert.alert('Error', 'No worker selected');
      return;
    }

    if (!logStartTime || !logEndTime) {
      Alert.alert('Error', 'Start and end time are required');
      return;
    }

    // Check if end date/time is after start date/time
    const startDateTime = new Date(logStartDate);
    startDateTime.setHours(
      logStartTime.getHours(),
      logStartTime.getMinutes(),
      0,
      0,
    );

    const endDateTime = new Date(logEndDate);
    endDateTime.setHours(logEndTime.getHours(), logEndTime.getMinutes(), 0, 0);

    if (endDateTime <= startDateTime) {
      Alert.alert('Error', 'End date/time must be after start date/time');
      return;
    }

    try {
      setLoggingWork(true);

      // Calculate number of days
      const daysDiff =
        Math.ceil((logEndDate - logStartDate) / (1000 * 60 * 60 * 24)) + 1;

      // Calculate daily work hours
      const start = new Date(logStartDate);
      start.setHours(logStartTime.getHours(), logStartTime.getMinutes(), 0, 0);

      const end = new Date(logStartDate);
      end.setHours(logEndTime.getHours(), logEndTime.getMinutes(), 0, 0);

      let dailyHours = (end - start) / (1000 * 60 * 60);

      // Subtract break duration
      if (breakDuration) {
        const breakMinutes = parseInt(breakDuration) || 0;
        dailyHours -= breakMinutes / 60;
      }

      if (dailyHours <= 0) {
        Alert.alert('Error', 'Daily work hours must be positive');
        return;
      }

      // Create work logs for each day
      const workLogsCreated = [];
      let totalHours = 0;

      for (let i = 0; i < daysDiff; i++) {
        const currentDate = new Date(logStartDate);
        currentDate.setDate(logStartDate.getDate() + i);

        const workLogData = {
          userId: selectedWorkerForLog.userId,
          projectId: project.projectId,
          date: currentDate.toISOString(),
          workStart: formatTime(logStartTime),
          workEnd: formatTime(logEndTime),
          breaks: breakDuration ? [{ duration: breakDuration }] : [],
          description: `Work logged for ${dailyHours.toFixed(2)} hours`,
          orgId: session.orgId,
        };

        await createWorkLog(workLogData);
        totalHours += dailyHours;
        workLogsCreated.push(currentDate.toLocaleDateString());
      }

      Alert.alert(
        'Success',
        `Work logs created for ${daysDiff} days:\n${workLogsCreated.join(
          '\n',
        )}\nTotal: ${totalHours.toFixed(2)} hours`,
      );

      // Reset modal
      setShowWorkLogModal(false);
      setSelectedWorkerForLog(null);
      setLogStartDate(new Date());
      setLogEndDate(new Date());
      setLogStartTime(new Date());
      setLogEndTime(null);
      setDurationHours('');
      setDurationMinutes('');
      setBreakDuration('');
      setWorkLogTab('single');
    } catch (error) {
      console.error('Error logging multiple days work:', error);
      Alert.alert('Error', 'Failed to log work hours');
    } finally {
      setLoggingWork(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.headerButton}
        >
          <X color={COLORS.text} size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Project Details</Text>
        <TouchableOpacity
          onPress={() =>
            navigation.navigate('ProjectWorkLog', {
              projectId: project.projectId,
              projectName: project.projectName,
            })
          }
          style={styles.workLogButton}
        >
          <ClipboardList color={COLORS.primary} size={20} />
          <Text style={styles.workLogButtonText}>Work logs</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Project Info Card */}
        <View style={styles.projectCard}>
          <View style={styles.projectHeader}>
            <View style={styles.projectIconWrapper}>
              <Briefcase color={COLORS.primary} size={20} />
            </View>
            <View style={styles.projectHeaderText}>
              <Text style={styles.projectName}>{project.projectName}</Text>
              {project.description && (
                <Text style={styles.projectDescription} numberOfLines={2}>
                  {project.description}
                </Text>
              )}
            </View>
          </View>

          {/* Project Meta Information */}
          {(project.projectFrom || project.broughtBy) && (
            <View style={styles.metaContainer}>
              {project.projectFrom && (
                <TouchableOpacity
                  style={styles.infoCard}
                  onPress={() => setShowProjectFromModal(true)}
                  activeOpacity={0.7}
                >
                  <View style={styles.infoIconWrapper}>
                    <Building2 color={COLORS.primary} size={18} />
                  </View>
                  <View style={styles.infoContent}>
                    <Text style={styles.infoLabel}>Client</Text>
                    <Text style={styles.infoValue}>{project.projectFrom}</Text>
                  </View>
                  <View style={styles.infoEditButton}>
                    <Edit3 color={COLORS.primary} size={12} />
                  </View>
                </TouchableOpacity>
              )}
              {project.broughtBy && (
                <TouchableOpacity
                  style={styles.infoCard}
                  onPress={() => setShowBroughtByModal(true)}
                  activeOpacity={0.7}
                >
                  <View style={styles.infoIconWrapper}>
                    <TrendingUp color={COLORS.success} size={18} />
                  </View>
                  <View style={styles.infoContent}>
                    <Text style={styles.infoLabel}>Brought by</Text>
                    <Text style={styles.infoValue}>{project.broughtBy}</Text>
                  </View>
                  <View style={styles.infoEditButton}>
                    <Edit3 color={COLORS.primary} size={12} />
                  </View>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Project Timeline */}
          <View style={styles.timelineSection}>
            <View style={styles.timelineRow}>
              <View style={styles.dateColumn}>
                <View style={styles.dateHeader}>
                  <View style={styles.dateLabelGroup}>
                    <Calendar color={COLORS.gray} size={14} />
                    <Text style={styles.dateLabel}>Start Date</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.dateIconButton}
                    onPress={handleAddOrChangeStartDate}
                    activeOpacity={0.7}
                  >
                    {project.startDate ? (
                      <Edit3 color={COLORS.primary} size={14} />
                    ) : (
                      <Plus color={COLORS.primary} size={14} />
                    )}
                  </TouchableOpacity>
                </View>
                <Text style={styles.dateValue}>
                  {project.startDate
                    ? formatDate(project.startDate)
                    : 'Not set'}
                </Text>
              </View>

              <View style={styles.dateDivider} />

              <View style={styles.dateColumn}>
                <View style={styles.dateHeader}>
                  <View style={styles.dateLabelGroup}>
                    <CalendarDays color={COLORS.gray} size={14} />
                    <Text style={styles.dateLabel}>End Date</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.dateIconButton}
                    onPress={handleAddOrChangeEndDate}
                    activeOpacity={0.7}
                  >
                    {project.endDate ? (
                      <Edit3 color={COLORS.primary} size={14} />
                    ) : (
                      <Plus color={COLORS.primary} size={14} />
                    )}
                  </TouchableOpacity>
                </View>
                <Text style={styles.dateValue}>
                  {project.endDate ? formatDate(project.endDate) : 'Not set'}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Workers Section */}
        <View style={styles.workersSection}>
          <View style={styles.workersSectionCard}>
            <View style={styles.workersSectionHeader}>
              <View style={styles.workersTitleContainer}>
                <Text style={styles.workersSectionTitle}>Team Members</Text>
                <View style={styles.workersCountBadge}>
                  <Text style={styles.workersCountText}>{workers.length}</Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={() =>
                  navigation.navigate('WorkerChecklist', {
                    projectId: project.projectId,
                    onWorkersUpdated: () => {
                      if (onProjectUpdated) onProjectUpdated();
                      loadProjectDetails();
                    },
                  })
                }
                style={styles.manageWorkersButton}
                activeOpacity={0.7}
              >
                <UserPlus color={COLORS.primary} size={14} />
                <Text style={styles.manageWorkersButtonText}>
                  {workers.length === 0 ? 'Add' : 'Manage'}
                </Text>
              </TouchableOpacity>
            </View>

            {workers.length === 0 ? (
              <View style={styles.emptyWorkersCard}>
                <View style={styles.emptyWorkersIconContainer}>
                  <Users color={COLORS.primary} size={40} />
                </View>
                <Text style={styles.emptyWorkersTitle}>
                  No team members yet
                </Text>
                <Text style={styles.emptyWorkersText}>
                  Add workers to this project to get started
                </Text>
              </View>
            ) : (
              <View style={styles.workersList}>
                {workers.map(worker => (
                  <View key={worker.userId} style={styles.workerItem}>
                    {/* V1: Avatar */}
                    <View style={styles.workerAvatarContainer}>
                      <View style={styles.workerAvatar}>
                        <Text style={styles.workerAvatarText}>
                          {worker.name.charAt(0).toUpperCase()}
                        </Text>
                      </View>
                    </View>

                    {/* V2: Name and Designation in Row */}
                    <View style={styles.workerInfoSection}>
                      <Text style={styles.workerName} numberOfLines={1}>
                        {' '}
                        {worker.name}
                      </Text>
                      {worker.designation && (
                        <View style={styles.designationPill}>
                          <Text
                            style={styles.designationPillText}
                            numberOfLines={1}
                          >
                            {worker.designation.title ||
                              worker.designation.name}
                          </Text>
                        </View>
                      )}
                    </View>

                    {/* V3: Work Log Button */}
                    <TouchableOpacity
                      style={[
                        styles.manageWorkersButton,
                        { paddingVertical: 4 },
                      ]}
                      onPress={() => handleOpenWorkLogModal(worker)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.manageWorkersButtonText}>
                        Add work log
                      </Text>
                    </TouchableOpacity>

                    {/* V4: Chevron Icon */}
                    <TouchableOpacity
                      style={styles.chevronButton}
                      onPress={() =>
                        navigation.navigate('MemberProjectDetail', {
                          memberId: worker.userId,
                          memberName: worker.name,
                          projectId: project.projectId,
                          projectName: project.projectName,
                        })
                      }
                      activeOpacity={0.7}
                    >
                      <ChevronRight color={COLORS.gray} size={20} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtonsContainer}>
          <TouchableOpacity
            style={styles.historyButton}
            onPress={() =>
              navigation.navigate('SiteUpdateHistory', {
                projectId: project.projectId,
                projectName: project.projectName,
              })
            }
          >
            <History color={COLORS.primary} size={20} />
            <Text style={styles.historyButtonText}>Site Update History</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() =>
              navigation.navigate('WorksitePhotoUpload', {
                projectId: project.projectId,
              })
            }
          >
            <Camera color={COLORS.white} size={20} />
            <Text style={styles.actionButtonText}>Add Site Update</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Start Date Picker Modal */}
      <Modal
        visible={showStartDatePicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowStartDatePicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.datePickerModal}>
            <View style={styles.datePickerHeader}>
              <Text style={styles.datePickerTitle}>
                {project.startDate ? 'Change Start Date' : 'Add Start Date'}
              </Text>
              <TouchableOpacity onPress={() => setShowStartDatePicker(false)}>
                <X color={COLORS.text} size={24} />
              </TouchableOpacity>
            </View>
            <DateTimePicker
              value={tempStartDate || new Date()}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={handleStartDateChange}
            />
            <View style={styles.datePickerActions}>
              <TouchableOpacity
                style={styles.datePickerButton}
                onPress={() => setShowStartDatePicker(false)}
              >
                <Text style={styles.datePickerButtonTextCancel}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.datePickerButton,
                  styles.datePickerButtonPrimary,
                ]}
                onPress={saveStartDate}
              >
                <Text style={styles.datePickerButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* End Date Picker Modal */}
      <Modal
        visible={showEndDatePicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowEndDatePicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.datePickerModal}>
            <View style={styles.datePickerHeader}>
              <Text style={styles.datePickerTitle}>
                {project.endDate ? 'Change End Date' : 'Add End Date'}
              </Text>
              <TouchableOpacity onPress={() => setShowEndDatePicker(false)}>
                <X color={COLORS.text} size={24} />
              </TouchableOpacity>
            </View>
            <DateTimePicker
              value={tempEndDate || new Date()}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={handleEndDateChange}
              minimumDate={
                project.startDate ? new Date(project.startDate) : undefined
              }
            />
            <View style={styles.datePickerActions}>
              <TouchableOpacity
                style={styles.datePickerButton}
                onPress={() => setShowEndDatePicker(false)}
              >
                <Text style={styles.datePickerButtonTextCancel}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.datePickerButton,
                  styles.datePickerButtonPrimary,
                ]}
                onPress={saveEndDate}
              >
                <Text style={styles.datePickerButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
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
              <Text style={styles.modalTitle}>Change Client</Text>
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
                  <Text style={styles.optionCardSubtitle}>
                    Select from existing clients
                  </Text>
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
                  <Text style={styles.optionCardSubtitle}>
                    Add a new client
                  </Text>
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

            <ScrollView
              showsVerticalScrollIndicator={true}
              style={styles.modalScroll}
            >
              {getFilteredClients().length === 0 ? (
                <View style={styles.emptyState}>
                  <Building2 color={COLORS.gray} size={48} />
                  <Text style={styles.emptyText}>
                    {clientSearchQuery
                      ? 'No clients found'
                      : 'No clients available'}
                  </Text>
                </View>
              ) : (
                getFilteredClients().map(client => (
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
                          <Text style={styles.clientCardDetail}>
                            {client.contactNumber}
                          </Text>
                        </View>
                      )}
                      {client.address && (
                        <View style={styles.clientCardRow}>
                          <MapPin color={COLORS.gray} size={14} />
                          <Text style={styles.clientCardDetail}>
                            {client.address}
                          </Text>
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
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
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

                <ScrollView
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                >
              <Text style={styles.formLabel}>Client/Company Name *</Text>
              <View style={styles.formInputContainer}>
                <Building2 color={COLORS.gray} size={20} />
                <TextInput
                  style={styles.formInput}
                  placeholder="Enter client name"
                  placeholderTextColor={COLORS.gray}
                  value={newClientName}
                  onChangeText={setNewClientName}
                  autoCapitalize="words"
                />
              </View>

              <Text style={styles.formLabel}>Contact Number</Text>
              <View style={styles.formInputContainer}>
                <Phone color={COLORS.gray} size={20} />
                <TextInput
                  style={styles.formInput}
                  placeholder="Enter contact number"
                  placeholderTextColor={COLORS.gray}
                  value={newClientContact}
                  onChangeText={setNewClientContact}
                  keyboardType="phone-pad"
                />
              </View>

              <Text style={styles.formLabel}>Address</Text>
              <View
                style={[
                  styles.formInputContainer,
                  styles.formTextAreaContainer,
                ]}
              >
                <MapPin color={COLORS.gray} size={20} style={styles.iconTop} />
                <TextInput
                  style={[styles.formInput, styles.formTextArea]}
                  placeholder="Enter address"
                  placeholderTextColor={COLORS.gray}
                  value={newClientAddress}
                  onChangeText={setNewClientAddress}
                  autoCapitalize="words"
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
              </View>

                  <TouchableOpacity
                    style={[
                      styles.submitButton,
                      savingClient && styles.submitButtonDisabled,
                    ]}
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
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal>

      {/* Brought By Selection Modal */}
      <Modal
        visible={showBroughtByModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowBroughtByModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Change Brought By</Text>
                  <TouchableOpacity onPress={() => setShowBroughtByModal(false)}>
                    <X color={COLORS.text} size={24} />
                  </TouchableOpacity>
                </View>

                <ScrollView
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                >
              <TouchableOpacity
                style={[
                  styles.optionCard,
                  broughtByType === 'employee' && styles.optionCardSelected,
                ]}
                onPress={() => handleBroughtByOptionSelect('employee')}
                activeOpacity={0.7}
              >
                <Users
                  color={
                    broughtByType === 'employee' ? COLORS.primary : COLORS.text
                  }
                  size={24}
                />
                <View style={styles.optionCardContent}>
                  <Text style={styles.optionCardTitle}>Employees</Text>
                  <Text style={styles.optionCardSubtitle}>
                    Select from organization employees
                  </Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.optionCard,
                  broughtByType === 'other' && styles.optionCardSelected,
                ]}
                onPress={() => handleBroughtByOptionSelect('other')}
                activeOpacity={0.7}
              >
                <UserPlus
                  color={
                    broughtByType === 'other' ? COLORS.primary : COLORS.text
                  }
                  size={24}
                />
                <View style={styles.optionCardContent}>
                  <Text style={styles.optionCardTitle}>Others</Text>
                  <Text style={styles.optionCardSubtitle}>
                    Enter name manually
                  </Text>
                </View>
              </TouchableOpacity>

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
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
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
                employees.map(employee => (
                  <TouchableOpacity
                    key={employee.userId}
                    style={styles.employeeCard}
                    onPress={() => handleEmployeeSelect(employee)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.employeeCardContent}>
                      <Text style={styles.employeeCardName}>
                        {employee.name}
                      </Text>
                      {employee.designationName && (
                        <View style={styles.designationPill}>
                          <Text style={styles.designationPillText}>
                            {employee.designationName}
                          </Text>
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

      {/* Work Log Modal */}
      <Modal
        visible={showWorkLogModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowWorkLogModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.workLogModalContent}>
              <View style={styles.workLogModalHeader}>
                <Text style={styles.modalTitle}>Log Work Hours</Text>
                <TouchableOpacity onPress={() => setShowWorkLogModal(false)}>
                  <X color={COLORS.text} size={24} />
                </TouchableOpacity>
              </View>

              {selectedWorkerForLog && (
                <View style={styles.workerInfoBanner}>
                  <View style={styles.workerAvatarSmall}>
                    <Text style={styles.workerAvatarTextSmall}>
                      {selectedWorkerForLog.name.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <Text style={styles.workerNameBanner}>
                    {selectedWorkerForLog.name}
                  </Text>
                </View>
              )}

              {/* Tab Selector */}
              <View style={styles.tabContainer}>
              <TouchableOpacity
                style={[
                  styles.tab,
                  workLogTab === 'single' && styles.tabActive,
                ]}
                onPress={() => setWorkLogTab('single')}
              >
                <Text
                  style={[
                    styles.tabText,
                    workLogTab === 'single' && styles.tabTextActive,
                  ]}
                >
                  Single Day
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.tab,
                  workLogTab === 'multiple' && styles.tabActive,
                ]}
                onPress={() => setWorkLogTab('multiple')}
              >
                <Text
                  style={[
                    styles.tabText,
                    workLogTab === 'multiple' && styles.tabTextActive,
                  ]}
                >
                  Multiple Days
                </Text>
              </TouchableOpacity>
              </View>

              <ScrollView
                showsVerticalScrollIndicator={false}
                style={styles.modalScrollView}
                keyboardShouldPersistTaps="handled"
              >
              {/* SINGLE DAY TAB */}
              {workLogTab === 'single' && (
                <>
                  {/* Start Date and Time */}
                  <View style={styles.dateTimeRow}>
                    <View style={styles.dateTimeColumn}>
                      <Text style={styles.sectionTitle}>Start Date *</Text>
                      <TouchableOpacity
                        style={styles.smallButton}
                        onPress={() => setShowLogStartDatePicker(true)}
                      >
                        <Calendar color={COLORS.primary} size={18} />
                        <Text style={styles.smallButtonText}>
                          {formatDate(logStartDate)}
                        </Text>
                      </TouchableOpacity>
                      {showLogStartDatePicker && (
                        <DateTimePicker
                          value={logStartDate}
                          mode="date"
                          display="default"
                          onChange={(event, date) => {
                            setShowLogStartDatePicker(Platform.OS === 'ios');
                            if (date) {
                              setLogStartDate(date);
                              setLogEndDate(date);
                            }
                          }}
                        />
                      )}
                    </View>

                    <View style={styles.dateTimeColumn}>
                      <Text style={styles.sectionTitle}>Start Time *</Text>
                      <TouchableOpacity
                        style={styles.smallButton}
                        onPress={() => setShowLogStartTimePicker(true)}
                      >
                        <Timer color={COLORS.primary} size={18} />
                        <Text style={styles.smallButtonText}>
                          {formatTime(logStartTime)}
                        </Text>
                      </TouchableOpacity>
                      {showLogStartTimePicker && (
                        <DateTimePicker
                          value={logStartTime}
                          mode="time"
                          display="default"
                          onChange={(event, time) => {
                            setShowLogStartTimePicker(Platform.OS === 'ios');
                            if (time) setLogStartTime(time);
                          }}
                        />
                      )}
                    </View>
                  </View>

                  {/* End Time OR Duration */}
                  <Text style={styles.sectionTitle}>End Time or Duration</Text>
                  <View style={styles.orRow}>
                    <TouchableOpacity
                      style={[
                        styles.orButton,
                        logEndTime && styles.orButtonSelected,
                        (durationHours || durationMinutes) &&
                          styles.orButtonDisabled,
                      ]}
                      onPress={() => {
                        if (!durationHours && !durationMinutes) {
                          setShowLogEndTimePicker(true);
                        }
                      }}
                      disabled={!!(durationHours || durationMinutes)}
                    >
                      <Timer
                        color={
                          logEndTime
                            ? COLORS.white
                            : durationHours || durationMinutes
                            ? COLORS.gray
                            : COLORS.primary
                        }
                        size={18}
                      />
                      <Text
                        style={[
                          styles.orButtonText,
                          logEndTime && styles.orButtonTextSelected,
                          (durationHours || durationMinutes) &&
                            styles.orButtonTextDisabled,
                        ]}
                      >
                        {logEndTime ? formatTime(logEndTime) : 'End Time'}
                      </Text>
                    </TouchableOpacity>

                    <Text style={styles.orText}>or</Text>

                    <TouchableOpacity
                      style={[
                        styles.orButton,
                        (durationHours || durationMinutes) &&
                          styles.orButtonSelected,
                        logEndTime && styles.orButtonDisabled,
                      ]}
                      onPress={() => {
                        if (!logEndTime) {
                          setShowDurationModal(true);
                        }
                      }}
                      disabled={!!logEndTime}
                    >
                      <Clock
                        color={
                          durationHours || durationMinutes
                            ? COLORS.white
                            : logEndTime
                            ? COLORS.gray
                            : COLORS.primary
                        }
                        size={18}
                      />
                      <Text
                        style={[
                          styles.orButtonText,
                          (durationHours || durationMinutes) &&
                            styles.orButtonTextSelected,
                          logEndTime && styles.orButtonTextDisabled,
                        ]}
                      >
                        {durationHours || durationMinutes
                          ? `${durationHours || '00'}:${
                              durationMinutes || '00'
                            }`
                          : 'Duration'}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {showLogEndTimePicker && (
                    <DateTimePicker
                      value={logEndTime || new Date()}
                      mode="time"
                      display="default"
                      onChange={(event, time) => {
                        setShowLogEndTimePicker(Platform.OS === 'ios');
                        if (time) {
                          setLogEndTime(time);
                          setDurationHours('');
                          setDurationMinutes('');
                        }
                      }}
                    />
                  )}

                  {/* Break Duration */}
                  <Text style={styles.sectionTitle}>
                    Break Duration (Optional)
                  </Text>
                  <View style={styles.breakInputContainer}>
                    <Coffee
                      color={COLORS.gray}
                      size={20}
                      style={styles.inputIcon}
                    />
                    <TextInput
                      style={styles.breakInput}
                      placeholder="Break in minutes (e.g., 30)"
                      placeholderTextColor={COLORS.gray}
                      keyboardType="number-pad"
                      value={breakDuration}
                      onChangeText={setBreakDuration}
                    />
                  </View>
                </>
              )}

              {/* MULTIPLE DAYS TAB */}
              {workLogTab === 'multiple' && (
                <>
                  {/* Start Date and Time */}
                  <View style={styles.dateTimeRow}>
                    <View style={styles.dateTimeColumn}>
                      <Text style={styles.sectionTitle}>Start Date *</Text>
                      <TouchableOpacity
                        style={styles.smallButton}
                        onPress={() => setShowLogStartDatePicker(true)}
                      >
                        <Calendar color={COLORS.primary} size={18} />
                        <Text style={styles.smallButtonText}>
                          {formatDate(logStartDate)}
                        </Text>
                      </TouchableOpacity>
                      {showLogStartDatePicker && (
                        <DateTimePicker
                          value={logStartDate}
                          mode="date"
                          display="default"
                          onChange={(event, date) => {
                            setShowLogStartDatePicker(Platform.OS === 'ios');
                            if (date) setLogStartDate(date);
                          }}
                        />
                      )}
                    </View>

                    <View style={styles.dateTimeColumn}>
                      <Text style={styles.sectionTitle}>Start Time *</Text>
                      <TouchableOpacity
                        style={styles.smallButton}
                        onPress={() => setShowLogStartTimePicker(true)}
                      >
                        <Timer color={COLORS.primary} size={18} />
                        <Text style={styles.smallButtonText}>
                          {formatTime(logStartTime)}
                        </Text>
                      </TouchableOpacity>
                      {showLogStartTimePicker && (
                        <DateTimePicker
                          value={logStartTime}
                          mode="time"
                          display="default"
                          onChange={(event, time) => {
                            setShowLogStartTimePicker(Platform.OS === 'ios');
                            if (time) setLogStartTime(time);
                          }}
                        />
                      )}
                    </View>
                  </View>

                  {/* End Date and Time */}
                  <View style={styles.dateTimeRow}>
                    <View style={styles.dateTimeColumn}>
                      <Text style={styles.sectionTitle}>End Date *</Text>
                      <TouchableOpacity
                        style={styles.smallButton}
                        onPress={() => setShowLogEndDatePicker(true)}
                      >
                        <Calendar color={COLORS.primary} size={18} />
                        <Text style={styles.smallButtonText}>
                          {formatDate(logEndDate)}
                        </Text>
                      </TouchableOpacity>
                      {showLogEndDatePicker && (
                        <DateTimePicker
                          value={logEndDate}
                          mode="date"
                          display="default"
                          onChange={(event, date) => {
                            setShowLogEndDatePicker(Platform.OS === 'ios');
                            if (date) setLogEndDate(date);
                          }}
                        />
                      )}
                    </View>

                    <View style={styles.dateTimeColumn}>
                      <Text style={styles.sectionTitle}>End Time *</Text>
                      <TouchableOpacity
                        style={styles.smallButton}
                        onPress={() => setShowLogEndTimePicker(true)}
                      >
                        <Timer color={COLORS.primary} size={18} />
                        <Text style={styles.smallButtonText}>
                          {logEndTime ? formatTime(logEndTime) : 'Select'}
                        </Text>
                      </TouchableOpacity>
                      {showLogEndTimePicker && (
                        <DateTimePicker
                          value={logEndTime || new Date()}
                          mode="time"
                          display="default"
                          onChange={(event, time) => {
                            setShowLogEndTimePicker(Platform.OS === 'ios');
                            if (time) setLogEndTime(time);
                          }}
                        />
                      )}
                    </View>
                  </View>

                  {/* Break Duration */}
                  <Text style={styles.sectionTitle}>
                    Break Duration (Optional)
                  </Text>
                  <View style={styles.breakInputContainer}>
                    <Coffee
                      color={COLORS.gray}
                      size={20}
                      style={styles.inputIcon}
                    />
                    <TextInput
                      style={styles.breakInput}
                      placeholder="Break in minutes (e.g., 30)"
                      placeholderTextColor={COLORS.gray}
                      keyboardType="number-pad"
                      value={breakDuration}
                      onChangeText={setBreakDuration}
                    />
                  </View>
                </>
              )}

              {/* Submit Button */}
              <TouchableOpacity
                style={[
                  styles.submitButton,
                  loggingWork && styles.buttonDisabled,
                ]}
                onPress={
                  workLogTab === 'multiple'
                    ? handleLogMultipleDaysWork
                    : handleLogWork
                }
                disabled={loggingWork}
              >
                  <Text style={styles.submitButtonText}>
                    {loggingWork ? 'Logging...' : 'Log Work Hours'}
                  </Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Duration Modal */}
      <Modal visible={showDurationModal} transparent animationType="fade">
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.durationModalOverlay}>
              <View style={styles.durationModalContent}>
                <Text style={styles.durationModalTitle}>Enter Duration</Text>
                <View style={styles.durationInputRow}>
              <View style={styles.durationInputGroup}>
                <TextInput
                  style={styles.durationInput}
                  placeholder="HH"
                  placeholderTextColor={COLORS.gray}
                  keyboardType="number-pad"
                  maxLength={2}
                  value={durationHours}
                  onChangeText={setDurationHours}
                />
                <Text style={styles.durationLabel}>Hours</Text>
              </View>
              <Text style={styles.durationSeparator}>:</Text>
              <View style={styles.durationInputGroup}>
                <TextInput
                  style={styles.durationInput}
                  placeholder="MM"
                  placeholderTextColor={COLORS.gray}
                  keyboardType="number-pad"
                  maxLength={2}
                  value={durationMinutes}
                  onChangeText={setDurationMinutes}
                />
                <Text style={styles.durationLabel}>Minutes</Text>
              </View>
            </View>
            <View style={styles.durationModalButtons}>
              <TouchableOpacity
                style={styles.durationCancelButton}
                onPress={() => {
                  setShowDurationModal(false);
                  setDurationHours('');
                  setDurationMinutes('');
                }}
              >
                <Text style={styles.durationCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.durationConfirmButton}
                    onPress={() => {
                      if (durationHours || durationMinutes) {
                        setLogEndTime(null);
                        setShowDurationModal(false);
                      } else {
                        Alert.alert('Error', 'Please enter a duration');
                      }
                    }}
                  >
                    <Text style={styles.durationConfirmButtonText}>Confirm</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </TouchableWithoutFeedback>
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
    paddingHorizontal: 16,
    paddingTop: 48,
    paddingBottom: 16,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    flex: 1,
    paddingLeft: 16,
  },
  workLogButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary + '10',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 5,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  workLogButtonText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.primary,
  },
  content: {
    flex: 1,
  },
  projectCard: {
    backgroundColor: COLORS.white,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  projectHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  projectIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: COLORS.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  projectHeaderText: {
    flex: 1,
  },
  projectName: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 4,
  },
  projectDescription: {
    fontSize: 13,
    color: COLORS.textLight,
    lineHeight: 18,
  },
  metaContainer: {
    flexDirection: 'row',
    gap: 12,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  infoCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: 10,
    padding: 12,
    gap: 10,
  },
  infoIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: COLORS.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 11,
    color: COLORS.textLight,
    fontWeight: '500',
    marginBottom: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoValue: {
    fontSize: 14,
    color: COLORS.text,
    fontWeight: '600',
  },
  infoEditButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timelineSection: {
    marginHorizontal: 16,
    marginTop: 12,
  },
  timelineRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 12,
  },
  dateColumn: {
    flex: 1,
  },
  dateDivider: {
    width: 1,
    backgroundColor: COLORS.border,
    marginHorizontal: 12,
  },
  dateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  dateLabelGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dateLabel: {
    fontSize: 12,
    color: COLORS.textLight,
    fontWeight: '500',
  },
  dateValue: {
    fontSize: 15,
    color: COLORS.text,
    fontWeight: '600',
  },
  dateIconButton: {
    padding: 4,
  },
  workersSection: {
    marginTop: 16,
    marginHorizontal: 16,
  },
  workersSectionCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
  },
  workersSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  workersTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  workersSectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  workersCountBadge: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    minWidth: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  workersCountText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.white,
  },
  manageWorkersButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary + '10',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 5,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  manageWorkersButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
  },
  emptyWorkersCard: {
    padding: 32,
    alignItems: 'center',
  },
  emptyWorkersIconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: COLORS.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyWorkersTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 8,
  },
  emptyWorkersText: {
    fontSize: 14,
    color: COLORS.textLight,
    textAlign: 'center',
  },
  workersList: {
    gap: 12,
  },
  workerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 10,
  },
  workerAvatarContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingLeft: 12,
  },
  workerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  workerAvatarText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.white,
  },
  workerInfoSection: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 3,
  },
  workerName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  designationPill: {
    backgroundColor: COLORS.primary + '15',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  designationPillText: {
    fontSize: 10,
    color: COLORS.primary,
    fontWeight: '600',
  },
  workLogIconButton: {
    padding: 6,
    backgroundColor: COLORS.primary + '10',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chevronButton: {
    alignSelf: 'stretch',
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
    marginTop: 80,
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.textLight,
  },
  actionButtonsContainer: {
    marginHorizontal: 16,
    marginTop: 24,
    marginBottom: 32,
    gap: 12,
  },
  historyButton: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
  },
  historyButtonText: {
    color: COLORS.primary,
    fontSize: 15,
    fontWeight: '600',
  },
  actionButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  actionButtonText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  datePickerModal: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
  },
  datePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  datePickerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  datePickerActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  datePickerButton: {
    flex: 1,
    backgroundColor: COLORS.background,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  datePickerButtonPrimary: {
    backgroundColor: COLORS.primary,
  },
  datePickerButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.white,
  },
  datePickerButtonTextCancel: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
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
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
  },
  modalScroll: {
    maxHeight: '70%',
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
  formLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
    marginTop: 16,
  },
  formInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  formInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: COLORS.text,
  },
  formTextAreaContainer: {
    alignItems: 'flex-start',
    minHeight: 100,
    paddingVertical: 12,
  },
  formTextArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  iconTop: {
    marginTop: 4,
  },
  submitButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 24,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
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
  workLogModalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    paddingBottom: 20,
  },
  workLogModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 16,
  },
  modalScrollView: {
    paddingHorizontal: 24,
    paddingTop: 4,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
    marginTop: 16,
  },
  workerInfoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary + '10',
    paddingHorizontal: 24,
    paddingVertical: 16,
    gap: 12,
    marginBottom: 4,
  },
  workerAvatarSmall: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  workerAvatarTextSmall: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.white,
  },
  workerNameBanner: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  tabContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: COLORS.primary,
  },
  tabText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textLight,
  },
  tabTextActive: {
    color: COLORS.primary,
  },
  dateTimeRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  dateTimeColumn: {
    flex: 1,
  },
  smallButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 12,
    gap: 8,
  },
  smallButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  orRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  orButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 12,
    gap: 8,
  },
  orButtonSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  orButtonDisabled: {
    opacity: 0.5,
  },
  orButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  orButtonTextSelected: {
    color: COLORS.white,
  },
  orButtonTextDisabled: {
    color: COLORS.gray,
  },
  orText: {
    fontSize: 12,
    color: COLORS.textLight,
    fontWeight: '600',
  },
  breakInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 12,
    marginBottom: 16,
  },
  inputIcon: {
    marginRight: 8,
  },
  breakInput: {
    flex: 1,
    fontSize: 14,
    color: COLORS.text,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  durationModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  durationModalContent: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 350,
  },
  durationModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 24,
    textAlign: 'center',
  },
  durationInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 24,
  },
  durationInputGroup: {
    alignItems: 'center',
  },
  durationInput: {
    backgroundColor: COLORS.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 12,
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
    textAlign: 'center',
    width: 80,
    marginBottom: 8,
  },
  durationLabel: {
    fontSize: 12,
    color: COLORS.textLight,
    fontWeight: '600',
  },
  durationSeparator: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text,
  },
  durationModalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  durationCancelButton: {
    flex: 1,
    backgroundColor: COLORS.background,
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  durationCancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  durationConfirmButton: {
    flex: 1,
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  durationConfirmButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.white,
  },
});

export default ProjectDetailScreen;
