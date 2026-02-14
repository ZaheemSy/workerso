import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, FlatList, Alert, TextInput } from 'react-native';
import { ArrowLeft, Plus, Users, Trash2, CheckSquare, Square, Search } from 'lucide-react-native';
import { COLORS } from '../constants/colors';
import { useAuth } from '../contexts/AuthContext';
import {
  getQuickProjectById,
  getQuickEmployeesByOrg,
  getQuickDesignationsByOrg,
  addEmployeeToQuickProject,
  removeEmployeeFromQuickProject,
} from '../services/storageService';

const QuickProjectDetailsScreen = ({ navigation, route }) => {
  const { session } = useAuth();
  const { quickProjectId } = route.params;
  const [project, setProject] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [designationMap, setDesignationMap] = useState({});
  const [showPicker, setShowPicker] = useState(false);
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [pickerSearchQuery, setPickerSearchQuery] = useState('');

  const employeeMap = useMemo(() => {
    const map = {};
    employees.forEach(item => {
      map[item.quickEmployeeId] = item;
    });
    return map;
  }, [employees]);

  const projectEmployees = useMemo(() => {
    if (!project) return [];
    return (project.employeeIds || [])
      .map(id => employeeMap[id])
      .filter(Boolean);
  }, [project, employeeMap]);

  const filteredProjectEmployees = useMemo(() => {
    if (!searchQuery.trim()) return projectEmployees;
    const query = searchQuery.toLowerCase();
    return projectEmployees.filter(item => {
      const designation = designationMap[item.designationId] || '';
      return (
        item.name?.toLowerCase().includes(query) ||
        designation.toLowerCase().includes(query)
      );
    });
  }, [designationMap, projectEmployees, searchQuery]);

  const availableEmployees = useMemo(() => {
    if (!project) return employees;
    const assigned = new Set(project.employeeIds || []);
    return employees.filter(emp => !assigned.has(emp.quickEmployeeId));
  }, [employees, project]);

  const filteredAvailableEmployees = useMemo(() => {
    if (!pickerSearchQuery.trim()) return availableEmployees;
    const query = pickerSearchQuery.toLowerCase();
    return availableEmployees.filter(item =>
      item.name?.toLowerCase().includes(query)
    );
  }, [availableEmployees, pickerSearchQuery]);

  const loadData = useCallback(async () => {
    const [projectData, employeeList, designationList] = await Promise.all([
      getQuickProjectById(quickProjectId),
      getQuickEmployeesByOrg(session.orgId),
      getQuickDesignationsByOrg(session.orgId),
    ]);
    const map = {};
    designationList.forEach(item => {
      map[item.quickDesignationId] = item.name;
    });
    setDesignationMap(map);
    setProject(projectData);
    setEmployees(employeeList.sort((a, b) => a.name.localeCompare(b.name)));
  }, [quickProjectId, session.orgId]);

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

  const addSelectedEmployees = async () => {
    await Promise.all(
      selectedEmployeeIds.map(id => addEmployeeToQuickProject(quickProjectId, id))
    );
    setSelectedEmployeeIds([]);
    setPickerSearchQuery('');
    setShowPicker(false);
    loadData();
  };

  const deleteEmployee = employee => {
    Alert.alert('Remove Employee', `Remove "${employee.name}" from project?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          await removeEmployeeFromQuickProject(quickProjectId, employee.quickEmployeeId);
          loadData();
        },
      },
    ]);
  };

  const renderEmployee = ({ item }) => (
    <View style={styles.employeeRow}>
      <TouchableOpacity
        style={styles.employeeLeft}
        onPress={() =>
          navigation.navigate('EmployeeProjectDetails', {
            quickProjectId,
            quickEmployeeId: item.quickEmployeeId,
          })
        }
        activeOpacity={0.75}
      >
        <Users color={COLORS.secondary} size={16} />
        <View style={styles.employeeTextWrap}>
          <Text style={styles.employeeName}>{item.name}</Text>
          <Text style={styles.employeeMeta}>{designationMap[item.designationId] || 'No designation'}</Text>
        </View>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => deleteEmployee(item)} style={styles.removeBtn}>
        <Trash2 color={COLORS.danger} size={16} />
      </TouchableOpacity>
    </View>
  );

  if (!project) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
            <ArrowLeft color={COLORS.text} size={24} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Project Details</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.center}>
          <Text style={styles.emptyText}>Project not found</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
          <ArrowLeft color={COLORS.text} size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Project Details</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.content}>
        <View style={styles.infoCard}>
          <Text style={styles.projectName}>{project.name}</Text>
          <Text style={styles.projectMetaLine}>
            Assigned Employees: {(project.employeeIds || []).length}
          </Text>
        </View>

        <TouchableOpacity style={styles.addButton} onPress={() => setShowPicker(true)}>
          <Plus color={COLORS.white} size={16} />
          <Text style={styles.addButtonText}>Add Employee</Text>
        </TouchableOpacity>

        <View style={styles.searchBox}>
          <Search color={COLORS.gray} size={18} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search employee..."
            placeholderTextColor={COLORS.gray}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        <FlatList
          data={filteredProjectEmployees}
          keyExtractor={item => item.quickEmployeeId}
          renderItem={renderEmployee}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <Text style={styles.emptyText}>
              {searchQuery.trim() ? 'No employees found' : 'No employees assigned'}
            </Text>
          }
        />
      </View>

      <Modal transparent visible={showPicker} animationType="fade" onRequestClose={() => setShowPicker(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Add Employees</Text>
            <View style={[styles.searchBox, styles.modalSearchBox]}>
              <Search color={COLORS.gray} size={18} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search employee..."
                placeholderTextColor={COLORS.gray}
                value={pickerSearchQuery}
                onChangeText={setPickerSearchQuery}
              />
            </View>
            <FlatList
              data={filteredAvailableEmployees}
              keyExtractor={item => item.quickEmployeeId}
              renderItem={({ item }) => {
                const selected = selectedEmployeeIds.includes(item.quickEmployeeId);
                return (
                  <TouchableOpacity
                    style={styles.pickerRow}
                    onPress={() => toggleSelection(item.quickEmployeeId)}
                  >
                    {selected ? <CheckSquare color={COLORS.primary} size={18} /> : <Square color={COLORS.gray} size={18} />}
                    <Text style={styles.pickerText}>{item.name}</Text>
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={
                <Text style={styles.emptyText}>
                  {pickerSearchQuery.trim() ? 'No employees found' : 'No available employees'}
                </Text>
              }
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => {
                  setPickerSearchQuery('');
                  setShowPicker(false);
                }}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={addSelectedEmployees}>
                <Text style={styles.saveBtnText}>Add</Text>
              </TouchableOpacity>
            </View>
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
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  infoCard: {
    borderRadius: 14,
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    padding: 14,
    marginBottom: 12,
  },
  projectName: { fontSize: 20, fontWeight: '700', color: COLORS.text },
  projectMetaLine: {
    marginTop: 6,
    color: COLORS.textLight,
    fontSize: 12,
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
  employeeRow: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    shadowColor: '#0F172A',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  employeeLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  employeeTextWrap: { marginLeft: 8, flex: 1 },
  employeeName: { color: COLORS.text, fontSize: 15, fontWeight: '600' },
  employeeMeta: { color: COLORS.textLight, fontSize: 12, marginTop: 2 },
  removeBtn: { padding: 6 },
  emptyText: { textAlign: 'center', marginTop: 20, color: COLORS.textLight },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: { width: '100%', maxHeight: '75%', backgroundColor: COLORS.white, borderRadius: 14, padding: 16 },
  modalTitle: { fontSize: 17, fontWeight: '700', color: COLORS.text, marginBottom: 12 },
  modalSearchBox: {
    marginBottom: 10,
  },
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  pickerText: { marginLeft: 8, color: COLORS.text, fontSize: 14 },
  modalButtons: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 12 },
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
});

export default QuickProjectDetailsScreen;
