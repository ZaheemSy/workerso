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
import { Briefcase, X, Save, FileText, Users, Check, Calendar } from 'lucide-react-native';
import { COLORS } from '../constants/colors';
import { ROLES } from '../constants/roles';
import { useAuth } from '../contexts/AuthContext';
import { createProject, getUsersByOrg, getGroupsByOrg } from '../services/storageService';
// import DatePickerInput from '../components/DatePickerInput';
import { formatDateToISO, formatDateToDDMMYYYY, parseDDMMYYYY } from '../utils/dateUtils';

const CreateProjectScreen = ({ navigation, route }) => {
  const { session } = useAuth();
  const { onProjectCreated } = route.params || {};
  const [formData, setFormData] = useState({
    projectName: '',
    description: '',
    startDate: '',
    endDate: '',
  });
  const [loading, setLoading] = useState(false);
  const [workers, setWorkers] = useState([]);
  const [groups, setGroups] = useState([]);
  const [selectedWorkers, setSelectedWorkers] = useState([]);
  const [selectedGroups, setSelectedGroups] = useState([]);
  const [showWorkerSelection, setShowWorkerSelection] = useState(false);

  useEffect(() => {
    loadWorkersAndGroups();
  }, []);

  const loadWorkersAndGroups = async () => {
    try {
      const allUsers = await getUsersByOrg(session.orgId);
      const workersList = allUsers.filter(user => user.role === ROLES.WORKER);
      setWorkers(workersList);

      const groupsList = await getGroupsByOrg(session.orgId);
      setGroups(groupsList);
    } catch (error) {
      console.error('Error loading workers and groups:', error);
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

      // Convert dd/mm/yyyy to ISO format for storage
      let startDateISO = formatDateToISO(new Date());
      let endDateISO = null;

      if (formData.startDate.trim()) {
        const parsedStart = parseDDMMYYYY(formData.startDate.trim());
        if (parsedStart) {
          startDateISO = formatDateToISO(parsedStart);
        }
      }

      if (formData.endDate.trim()) {
        const parsedEnd = parseDDMMYYYY(formData.endDate.trim());
        if (parsedEnd) {
          endDateISO = formatDateToISO(parsedEnd);
        }
      }

      const project = await createProject({
        orgId: session.orgId,
        projectName: formData.projectName.trim(),
        description: formData.description.trim(),
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
          <Calendar color={COLORS.gray} size={20} style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Start Date (dd/mm/yyyy)"
            placeholderTextColor={COLORS.gray}
            value={formData.startDate}
            onChangeText={value => handleChange('startDate', value)}
            keyboardType="numbers-and-punctuation"
          />
        </View>

        <View style={styles.inputContainer}>
          <Calendar color={COLORS.gray} size={20} style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="End Date (dd/mm/yyyy)"
            placeholderTextColor={COLORS.gray}
            value={formData.endDate}
            onChangeText={value => handleChange('endDate', value)}
            keyboardType="numbers-and-punctuation"
          />
        </View>

        {/* Worker and Group Selection - Optional */}
        <Text style={[styles.sectionTitle, { marginTop: 16 }]}>
          Assign Workers & Groups (Optional)
        </Text>
        <Text style={styles.sectionSubtitle}>
          You can add workers and groups now or later
        </Text>

        <TouchableOpacity
          style={styles.selectionButton}
          onPress={() => setShowWorkerSelection(!showWorkerSelection)}
          activeOpacity={0.7}
        >
          <Users color={COLORS.primary} size={20} />
          <Text style={styles.selectionButtonText}>
            {selectedWorkers.length + selectedGroups.length > 0
              ? `${selectedWorkers.length} workers, ${selectedGroups.length} groups selected`
              : 'Select Workers & Groups'}
          </Text>
          <Text style={styles.expandText}>
            {showWorkerSelection ? '▲' : '▼'}
          </Text>
        </TouchableOpacity>

        {/* Worker and Group Selection Cards */}
        {showWorkerSelection && (
          <View style={styles.selectionContainer}>
            {/* Worker Groups */}
            {groups.length > 0 && (
              <>
                <Text style={styles.selectionSectionTitle}>Worker Groups</Text>
                {groups.map((group) => (
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
                        {group.workers?.length || 0} workers
                      </Text>
                    </View>
                    {selectedGroups.includes(group.groupId) && (
                      <View style={styles.checkIcon}>
                        <Check color={COLORS.white} size={16} />
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </>
            )}

            {/* Individual Workers */}
            {workers.length > 0 && (
              <>
                <Text style={styles.selectionSectionTitle}>Individual Workers</Text>
                {workers.map((worker) => (
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
                ))}
              </>
            )}

            {workers.length === 0 && groups.length === 0 && (
              <View style={styles.emptyState}>
                <Users color={COLORS.gray} size={48} />
                <Text style={styles.emptyText}>No workers or groups available</Text>
                <Text style={styles.emptySubtext}>Add workers and groups first</Text>
              </View>
            )}
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
  textArea: {
    height: '100%',
  },
  infoBox: {
    backgroundColor: COLORS.primary + '10',
    borderRadius: 12,
    padding: 16,
    marginTop: 12,
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    color: COLORS.primary,
    lineHeight: 20,
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
  selectionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    marginBottom: 16,
  },
  selectionButtonText: {
    flex: 1,
    fontSize: 15,
    color: COLORS.text,
    marginLeft: 12,
  },
  expandText: {
    fontSize: 14,
    color: COLORS.gray,
  },
  selectionContainer: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  selectionSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: 8,
    marginBottom: 12,
  },
  selectionCard: {
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
});

export default CreateProjectScreen;
