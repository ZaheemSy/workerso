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
} from 'react-native';
import { Briefcase, X, Save, Calendar, FileText } from 'lucide-react-native';
import { COLORS } from '../constants/colors';
import { useAuth } from '../contexts/AuthContext';
import { createProject } from '../services/storageService';

const CreateProjectScreen = ({ navigation, route }) => {
  const { session } = useAuth();
  const { onProjectCreated } = route.params || {};
  const [formData, setFormData] = useState({
    projectName: '',
    description: '',
    startDate: '',
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
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
      const project = await createProject({
        orgId: session.orgId,
        projectName: formData.projectName.trim(),
        description: formData.description.trim(),
        startDate: formData.startDate || new Date().toISOString().split('T')[0],
        workers: [],
        siteLogs: [],
      });

      if (!project) {
        throw new Error('Failed to create project');
      }

      setLoading(false);
      Alert.alert('Success!', 'Project created successfully', [
        {
          text: 'Add Workers',
          onPress: () => {
            if (onProjectCreated) onProjectCreated();
            navigation.replace('WorkerChecklist', { projectId: project.projectId });
          },
        },
        {
          text: 'Done',
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
            placeholder="Start Date (YYYY-MM-DD)"
            placeholderTextColor={COLORS.gray}
            value={formData.startDate}
            onChangeText={value => handleChange('startDate', value)}
            keyboardType="numbers-and-punctuation"
          />
        </View>

        <View style={styles.infoBox}>
          <Text style={styles.infoText}>
            After creating the project, you can assign workers to it.
          </Text>
        </View>

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
});

export default CreateProjectScreen;
