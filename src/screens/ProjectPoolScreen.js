import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  FlatList,
} from 'react-native';
import { ArrowLeft, Plus, Briefcase, CheckSquare, Square, ChevronDown, Search } from 'lucide-react-native';
import { COLORS } from '../constants/colors';
import { useAuth } from '../contexts/AuthContext';
import {
  getQuickEmployeesByOrg,
  getQuickProjectsByOrg,
  createQuickProject,
} from '../services/storageService';

const ProjectPoolScreen = ({ navigation }) => {
  const { session } = useAuth();
  const [employees, setEmployees] = useState([]);
  const [projects, setProjects] = useState([]);
  const [showEditor, setShowEditor] = useState(false);
  const [showEmployeePicker, setShowEmployeePicker] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  const employeeMap = useMemo(() => {
    const map = {};
    employees.forEach(emp => {
      map[emp.quickEmployeeId] = emp.name;
    });
    return map;
  }, [employees]);

  const loadData = useCallback(async () => {
    const [employeeList, projectList] = await Promise.all([
      getQuickEmployeesByOrg(session.orgId),
      getQuickProjectsByOrg(session.orgId),
    ]);
    setEmployees(employeeList.sort((a, b) => a.name.localeCompare(b.name)));
    setProjects(projectList.sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
  }, [session.orgId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const toggleSelection = quickEmployeeId => {
    setSelectedEmployeeIds(prev =>
      prev.includes(quickEmployeeId)
        ? prev.filter(id => id !== quickEmployeeId)
        : [...prev, quickEmployeeId]
    );
  };

  const saveProject = async () => {
    if (!projectName.trim()) {
      Alert.alert('Validation', 'Please enter project name');
      return;
    }

    if (selectedEmployeeIds.length === 0) {
      Alert.alert('Validation', 'At least one employee is required');
      return;
    }

    await createQuickProject({
      orgId: session.orgId,
      name: projectName.trim(),
      employeeIds: selectedEmployeeIds,
      createdBy: session.userId,
    });

    setProjectName('');
    setSelectedEmployeeIds([]);
    setShowEditor(false);
    loadData();
  };

  const renderProject = ({ item }) => (
    <TouchableOpacity
      style={styles.projectCard}
      onPress={() => navigation.navigate('QuickProjectDetails', { quickProjectId: item.quickProjectId })}
      activeOpacity={0.75}
    >
      <View style={styles.projectIcon}>
        <Briefcase color={COLORS.warning} size={16} />
      </View>
      <View style={styles.projectInfo}>
        <Text style={styles.projectName}>{item.name}</Text>
        <Text style={styles.projectMeta}>{(item.employeeIds || []).length} employee(s)</Text>
      </View>
    </TouchableOpacity>
  );

  const filteredProjects = useMemo(() => {
    if (!searchQuery.trim()) return projects;
    const query = searchQuery.toLowerCase();
    return projects.filter(item => item.name?.toLowerCase().includes(query));
  }, [projects, searchQuery]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
          <ArrowLeft color={COLORS.text} size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Project Pool</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.content}>
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>Project Builder</Text>
          <Text style={styles.infoSubtitle}>
            Create projects and assign one or more employees in a single flow.
          </Text>
        </View>

        <TouchableOpacity style={styles.addButton} onPress={() => setShowEditor(true)}>
          <Plus color={COLORS.white} size={16} />
          <Text style={styles.addButtonText}>Create Project</Text>
        </TouchableOpacity>

        <View style={styles.searchBox}>
          <Search color={COLORS.gray} size={18} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search project..."
            placeholderTextColor={COLORS.gray}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        <FlatList
          data={filteredProjects}
          keyExtractor={item => item.quickProjectId}
          renderItem={renderProject}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <Text style={styles.emptyText}>
              {searchQuery.trim() ? 'No projects found' : 'No projects yet'}
            </Text>
          }
        />
      </View>

      <Modal transparent visible={showEditor} animationType="fade" onRequestClose={() => setShowEditor(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Create Project</Text>
            <TextInput
              style={styles.input}
              placeholder="Project name"
              placeholderTextColor={COLORS.gray}
              value={projectName}
              onChangeText={setProjectName}
            />

            <TouchableOpacity style={styles.selectBtn} onPress={() => setShowEmployeePicker(true)}>
              <Text style={[styles.selectText, selectedEmployeeIds.length === 0 && styles.placeholder]}>
                {selectedEmployeeIds.length > 0
                  ? `${selectedEmployeeIds.length} employee(s) selected`
                  : 'Select employee(s)'}
              </Text>
              <ChevronDown color={COLORS.gray} size={16} />
            </TouchableOpacity>

            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowEditor(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={saveProject}>
                <Text style={styles.saveBtnText}>Create</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        transparent
        visible={showEmployeePicker}
        animationType="fade"
        onRequestClose={() => setShowEmployeePicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Select Employees</Text>
            <FlatList
              data={employees}
              keyExtractor={item => item.quickEmployeeId}
              renderItem={({ item }) => {
                const selected = selectedEmployeeIds.includes(item.quickEmployeeId);
                return (
                  <TouchableOpacity
                    style={styles.employeeItem}
                    onPress={() => toggleSelection(item.quickEmployeeId)}
                    activeOpacity={0.75}
                  >
                    {selected ? (
                      <CheckSquare color={COLORS.primary} size={18} />
                    ) : (
                      <Square color={COLORS.gray} size={18} />
                    )}
                    <Text style={styles.employeeText}>{employeeMap[item.quickEmployeeId]}</Text>
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={<Text style={styles.emptyText}>No employees available</Text>}
            />
            <TouchableOpacity style={styles.doneBtn} onPress={() => setShowEmployeePicker(false)}>
              <Text style={styles.doneBtnText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
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
  headerButton: { padding: 8 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  headerSpacer: { width: 24 },
  content: { flex: 1, padding: 16 },
  infoCard: {
    borderRadius: 14,
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    padding: 14,
    marginBottom: 12,
  },
  infoTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '700',
  },
  infoSubtitle: {
    marginTop: 4,
    color: COLORS.textLight,
    fontSize: 12,
    lineHeight: 18,
  },
  addButton: {
    height: 44,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    marginBottom: 12,
  },
  addButtonText: { color: COLORS.white, fontSize: 14, fontWeight: '600', marginLeft: 8 },
  searchBox: {
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    color: COLORS.text,
    fontSize: 14,
  },
  listContent: { paddingBottom: 20 },
  projectCard: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    shadowColor: '#0F172A',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  projectIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    backgroundColor: '#FDE68A55',
  },
  projectInfo: { flex: 1 },
  projectName: { color: COLORS.text, fontSize: 15, fontWeight: '600' },
  projectMeta: { color: COLORS.textLight, fontSize: 12, marginTop: 2 },
  emptyText: { textAlign: 'center', marginTop: 24, color: COLORS.textLight },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: { width: '100%', maxHeight: '75%', backgroundColor: COLORS.white, borderRadius: 14, padding: 16 },
  modalTitle: { fontSize: 17, fontWeight: '700', color: COLORS.text, marginBottom: 12 },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
    color: COLORS.text,
  },
  selectBtn: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    height: 44,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectText: { color: COLORS.text, fontSize: 14 },
  placeholder: { color: COLORS.gray },
  modalButtons: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 16 },
  cancelBtn: { paddingHorizontal: 12, height: 36, justifyContent: 'center' },
  cancelBtnText: { color: COLORS.textLight, fontWeight: '600' },
  saveBtn: {
    marginLeft: 8,
    backgroundColor: COLORS.primary,
    height: 36,
    borderRadius: 8,
    paddingHorizontal: 14,
    justifyContent: 'center',
  },
  saveBtnText: { color: COLORS.white, fontWeight: '600' },
  employeeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  employeeText: { marginLeft: 8, color: COLORS.text, fontSize: 14 },
  doneBtn: {
    marginTop: 12,
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneBtnText: { color: COLORS.white, fontWeight: '600' },
});

export default ProjectPoolScreen;
