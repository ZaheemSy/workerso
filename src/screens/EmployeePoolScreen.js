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
import { ArrowLeft, Plus, Pencil, Trash2, Users, ChevronDown, Search, X } from 'lucide-react-native';
import { COLORS } from '../constants/colors';
import { useAuth } from '../contexts/AuthContext';
import {
  ensureQuickDefaultDesignations,
  getQuickDesignationsByOrg,
  getQuickEmployeesByOrg,
  createQuickEmployee,
  createQuickDesignation,
  updateQuickEmployee,
  deleteQuickEmployee,
} from '../services/storageService';

const EmployeePoolScreen = ({ navigation }) => {
  const { session } = useAuth();
  const [employees, setEmployees] = useState([]);
  const [designations, setDesignations] = useState([]);
  const [showEditor, setShowEditor] = useState(false);
  const [showDesignationPicker, setShowDesignationPicker] = useState(false);
  const [name, setName] = useState('');
  const [designationId, setDesignationId] = useState('');
  const [designationMode, setDesignationMode] = useState('pool');
  const [newDesignationName, setNewDesignationName] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  const designationMap = useMemo(() => {
    const map = {};
    designations.forEach(item => {
      map[item.quickDesignationId] = item.name;
    });
    return map;
  }, [designations]);

  const loadData = useCallback(async () => {
    await ensureQuickDefaultDesignations(session.orgId, session.userId);
    const [designationList, employeeList] = await Promise.all([
      getQuickDesignationsByOrg(session.orgId),
      getQuickEmployeesByOrg(session.orgId),
    ]);
    setDesignations(designationList.sort((a, b) => a.name.localeCompare(b.name)));
    setEmployees(employeeList.sort((a, b) => a.name.localeCompare(b.name)));
  }, [session.orgId, session.userId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const openCreateModal = () => {
    setEditingId(null);
    setName('');
    setDesignationId('');
    setDesignationMode('pool');
    setNewDesignationName('');
    setShowEditor(true);
  };

  const openEditModal = employee => {
    setEditingId(employee.quickEmployeeId);
    setName(employee.name);
    setDesignationId(employee.designationId || '');
    setDesignationMode('pool');
    setNewDesignationName('');
    setShowEditor(true);
  };

  const closeEditorModal = () => {
    setShowEditor(false);
    setName('');
    setDesignationId('');
    setDesignationMode('pool');
    setNewDesignationName('');
    setEditingId(null);
  };

  const finalizeSave = async resolvedDesignationId => {
    const payload = {
      name: name.trim(),
      designationId: resolvedDesignationId || null,
      orgId: session.orgId,
      createdBy: session.userId,
    };

    if (editingId) {
      await updateQuickEmployee(editingId, payload);
    } else {
      await createQuickEmployee(payload);
    }

    setShowEditor(false);
    setName('');
    setDesignationId('');
    setDesignationMode('pool');
    setNewDesignationName('');
    setEditingId(null);
    loadData();
  };

  const resolveDesignationId = async () => {
    if (designationMode === 'pool') {
      return designationId || null;
    }

    const trimmed = newDesignationName.trim();
    if (!trimmed) return null;

    const existing = designations.find(
      item => item.name?.trim().toLowerCase() === trimmed.toLowerCase()
    );
    if (existing) return existing.quickDesignationId;

    const created = await createQuickDesignation({
      orgId: session.orgId,
      name: trimmed,
      createdBy: session.userId,
    });
    return created.quickDesignationId;
  };

  const saveEmployee = async () => {
    if (!name.trim()) {
      Alert.alert('Validation', 'Please enter employee name');
      return;
    }

    const resolvedDesignationId = await resolveDesignationId();
    if (!resolvedDesignationId) {
      Alert.alert('Validation', 'Please select designation from pool or add a new designation');
      return;
    }

    finalizeSave(resolvedDesignationId);
  };

  const handleDelete = item => {
    Alert.alert('Delete', `Delete "${item.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteQuickEmployee(item.quickEmployeeId);
          loadData();
        },
      },
    ]);
  };

  const renderRow = ({ item, index }) => (
    <View style={styles.row}>
      <Text style={[styles.rowWatermark, index % 2 === 0 ? styles.watermarkGreen : styles.watermarkBlue]}>
        EMP
      </Text>
      <TouchableOpacity
        style={styles.rowLeft}
        onPress={() =>
          navigation.navigate('EmployeeQuickDetails', {
            quickEmployeeId: item.quickEmployeeId,
          })
        }
        activeOpacity={0.75}
      >
        <Users color={COLORS.secondary} size={16} />
        <View style={styles.rowTextWrap}>
          <Text style={styles.rowName}>{item.name}</Text>
          <Text style={styles.rowMeta}>{designationMap[item.designationId] || 'No designation'}</Text>
        </View>
      </TouchableOpacity>
      <View style={styles.rowActions}>
        <TouchableOpacity onPress={() => openEditModal(item)} style={styles.iconBtn}>
          <Pencil color={COLORS.primary} size={16} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => handleDelete(item)} style={styles.iconBtn}>
          <Trash2 color={COLORS.danger} size={16} />
        </TouchableOpacity>
      </View>
    </View>
  );

  const filteredEmployees = useMemo(() => {
    if (!searchQuery.trim()) return employees;
    const query = searchQuery.toLowerCase();
    return employees.filter(item => {
      const designation = designationMap[item.designationId] || '';
      return (
        item.name?.toLowerCase().includes(query) ||
        designation.toLowerCase().includes(query)
      );
    });
  }, [designationMap, employees, searchQuery]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
          <ArrowLeft color={COLORS.text} size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Employee Pool</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.content}>
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>Employee Directory</Text>
          <Text style={styles.infoSubtitle}>
            Add employees quickly and map each one to the right designation.
          </Text>
        </View>

        <TouchableOpacity style={styles.addButton} onPress={openCreateModal}>
          <Plus color={COLORS.white} size={16} />
          <Text style={styles.addButtonText}>Add Employee</Text>
        </TouchableOpacity>

        <View style={styles.searchBox}>
          <Search color={COLORS.gray} size={18} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search employee or designation..."
            placeholderTextColor={COLORS.gray}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        <FlatList
          data={filteredEmployees}
          keyExtractor={item => item.quickEmployeeId}
          renderItem={renderRow}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <Text style={styles.emptyText}>
              {searchQuery.trim() ? 'No employees found' : 'No employees yet'}
            </Text>
          }
        />
      </View>

      <Modal transparent visible={showEditor} animationType="fade" onRequestClose={closeEditorModal}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editingId ? 'Edit Employee' : 'Add Employee'}</Text>
              <TouchableOpacity style={styles.modalCloseBtn} onPress={closeEditorModal}>
                <X color={COLORS.textLight} size={18} />
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.input}
              placeholder="Employee name"
              placeholderTextColor={COLORS.gray}
              value={name}
              onChangeText={setName}
            />

            <Text style={styles.sectionLabel}>Designation</Text>
            <View style={styles.modeSwitch}>
              <TouchableOpacity
                style={[styles.modeButton, designationMode === 'pool' && styles.modeButtonActive]}
                onPress={() => setDesignationMode('pool')}
              >
                <Text style={[styles.modeButtonText, designationMode === 'pool' && styles.modeButtonTextActive]}>
                  Select from pool
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modeButton, designationMode === 'new' && styles.modeButtonActive]}
                onPress={() => setDesignationMode('new')}
              >
                <Text style={[styles.modeButtonText, designationMode === 'new' && styles.modeButtonTextActive]}>
                  Add new designation
                </Text>
              </TouchableOpacity>
            </View>

            {designationMode === 'pool' ? (
              <TouchableOpacity style={styles.selectBtn} onPress={() => setShowDesignationPicker(true)}>
                <Text style={[styles.selectBtnText, !designationId && styles.placeholder]}>
                  {designationId ? designationMap[designationId] : 'Select designation'}
                </Text>
                <ChevronDown color={COLORS.gray} size={16} />
              </TouchableOpacity>
            ) : (
              <TextInput
                style={[styles.input, styles.mt10]}
                placeholder="Designation name"
                placeholderTextColor={COLORS.gray}
                value={newDesignationName}
                onChangeText={setNewDesignationName}
              />
            )}

            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.cancelBtn} onPress={closeEditorModal}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={saveEmployee}>
                <Text style={styles.saveBtnText}>{editingId ? 'Update' : 'Add'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        transparent
        visible={showDesignationPicker}
        animationType="fade"
        onRequestClose={() => setShowDesignationPicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Designation</Text>
              <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setShowDesignationPicker(false)}>
                <X color={COLORS.textLight} size={18} />
              </TouchableOpacity>
            </View>
            {designations.map(item => (
              <TouchableOpacity
                key={item.quickDesignationId}
                style={styles.designationItem}
                onPress={() => {
                  setDesignationId(item.quickDesignationId);
                  setShowDesignationPicker(false);
                }}
              >
                <Text style={styles.designationItemText}>{item.name}</Text>
              </TouchableOpacity>
            ))}
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
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
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
  row: {
    overflow: 'hidden',
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
  rowLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  rowTextWrap: { marginLeft: 8, flex: 1 },
  rowName: { color: COLORS.text, fontSize: 15, fontWeight: '600' },
  rowMeta: { color: COLORS.textLight, fontSize: 12, marginTop: 2 },
  rowWatermark: {
    position: 'absolute',
    right: 10,
    top: 6,
    fontSize: 42,
    fontWeight: '800',
    opacity: 0.12,
    letterSpacing: 1,
  },
  watermarkGreen: { color: '#10B981' },
  watermarkBlue: { color: '#2563EB' },
  rowActions: { flexDirection: 'row' },
  iconBtn: { padding: 8 },
  emptyText: { textAlign: 'center', marginTop: 24, color: COLORS.textLight },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: { width: '100%', backgroundColor: COLORS.white, borderRadius: 14, padding: 16 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  modalCloseBtn: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  modalTitle: { fontSize: 17, fontWeight: '700', color: COLORS.text, marginBottom: 12 },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
    color: COLORS.text,
  },
  mt10: { marginTop: 10 },
  sectionLabel: {
    marginTop: 10,
    marginBottom: 6,
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '700',
  },
  modeSwitch: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 2,
  },
  modeButton: {
    flex: 1,
    height: 38,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  modeButtonActive: {
    borderColor: '#93C5FD',
    backgroundColor: '#EFF6FF',
  },
  modeButtonText: {
    color: COLORS.textLight,
    fontSize: 12,
    fontWeight: '600',
  },
  modeButtonTextActive: {
    color: '#1D4ED8',
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
  selectBtnText: { color: COLORS.text, fontSize: 14 },
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
  designationItem: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  designationItemText: { color: COLORS.text, fontSize: 14 },
});

export default EmployeePoolScreen;
