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
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  Keyboard,
} from 'react-native';
import { ArrowLeft, Plus, Briefcase, CheckSquare, Square, ChevronDown, Search, Pencil, Trash2, X, Check } from 'lucide-react-native';
import { COLORS } from '../constants/colors';
import { ROLES } from '../constants/roles';
import { useAuth } from '../contexts/AuthContext';
import {
  ensureQuickDefaultDesignations,
  getQuickDesignationsByOrg,
  getQuickEmployeesByOrg,
  getQuickProjectsByOrg,
  createQuickProject,
  isQuickProjectNoTaken,
  updateQuickProject,
  deleteQuickProject,
  createQuickEmployee,
  createQuickDesignation,
} from '../services/storageService';

const ProjectPoolScreen = ({ navigation }) => {
  const { session } = useAuth();
  const [employees, setEmployees] = useState([]);
  const [projects, setProjects] = useState([]);
  const [showEditor, setShowEditor] = useState(false);
  const [showEmployeePicker, setShowEmployeePicker] = useState(false);
  const [showDesignationPicker, setShowDesignationPicker] = useState(false);
  const [showNewEmployeeModal, setShowNewEmployeeModal] = useState(false);
  const [showNewDesignationModal, setShowNewDesignationModal] = useState(false);
  const [showNewlyAddedEmployeesModal, setShowNewlyAddedEmployeesModal] = useState(false);
  const [showProjectRenameModal, setShowProjectRenameModal] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [projectNo, setProjectNo] = useState('');
  const [renameProjectName, setRenameProjectName] = useState('');
  const [renameProjectNo, setRenameProjectNo] = useState('');
  const [editingProjectId, setEditingProjectId] = useState(null);
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [designations, setDesignations] = useState([]);
  const [employeeMode, setEmployeeMode] = useState(null);
  const [newEmployeeName, setNewEmployeeName] = useState('');
  const [designationMode, setDesignationMode] = useState(null);
  const [selectedDesignationId, setSelectedDesignationId] = useState('');
  const [newDesignationName, setNewDesignationName] = useState('');
  const [tempSelectedEmployeeIds, setTempSelectedEmployeeIds] = useState([]);
  const [tempSelectedDesignationId, setTempSelectedDesignationId] = useState('');
  const [tempNewDesignationName, setTempNewDesignationName] = useState('');
  const [newlyAddedEmployeeIds, setNewlyAddedEmployeeIds] = useState([]);
  const [openMaterialRequestAfterCreate, setOpenMaterialRequestAfterCreate] = useState(false);
  const [projectDepartments, setProjectDepartments] = useState([]);
  const [showDepartmentModal, setShowDepartmentModal] = useState(false);
  const [departmentNameInput, setDepartmentNameInput] = useState('');
  const [loadingEmployeePool, setLoadingEmployeePool] = useState(false);
  const canManageQuickProject = session?.role === ROLES.SUPER_ADMIN || session?.role === ROLES.ADMIN;

  const employeeMap = useMemo(() => {
    const map = {};
    employees.forEach(emp => {
      map[emp.quickEmployeeId] = emp.name;
    });
    return map;
  }, [employees]);

  const designationMap = useMemo(() => {
    const map = {};
    designations.forEach(item => {
      map[item.quickDesignationId] = item.name;
    });
    return map;
  }, [designations]);

  const newlyAddedEmployees = useMemo(
    () => employees.filter(item => newlyAddedEmployeeIds.includes(item.quickEmployeeId)),
    [employees, newlyAddedEmployeeIds]
  );

  const loadData = useCallback(async () => {
    await ensureQuickDefaultDesignations(session.orgId, session.userId);
    const [employeeList, projectList, designationList] = await Promise.all([
      getQuickEmployeesByOrg(session.orgId),
      getQuickProjectsByOrg(session.orgId),
      getQuickDesignationsByOrg(session.orgId),
    ]);
    setEmployees(employeeList.sort((a, b) => a.name.localeCompare(b.name)));
    setProjects(projectList.sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
    setDesignations(designationList.sort((a, b) => a.name.localeCompare(b.name)));
  }, [session.orgId, session.userId]);

  const loadEmployeesOnly = useCallback(async () => {
    setLoadingEmployeePool(true);
    try {
      const employeeList = await getQuickEmployeesByOrg(session.orgId);
      setEmployees(employeeList.sort((a, b) => a.name.localeCompare(b.name)));
    } finally {
      setLoadingEmployeePool(false);
    }
  }, [session.orgId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const resetEditor = () => {
    setProjectName('');
    setProjectNo('');
    setSelectedEmployeeIds([]);
    setEmployeeMode(null);
    setNewEmployeeName('');
    setDesignationMode(null);
    setSelectedDesignationId('');
    setNewDesignationName('');
    setTempSelectedEmployeeIds([]);
    setTempSelectedDesignationId('');
    setTempNewDesignationName('');
    setOpenMaterialRequestAfterCreate(false);
    setProjectDepartments([]);
    setDepartmentNameInput('');
    setShowDepartmentModal(false);
    setShowEmployeePicker(false);
    setShowDesignationPicker(false);
    setShowNewEmployeeModal(false);
    setShowNewDesignationModal(false);
    setShowNewlyAddedEmployeesModal(false);
    setNewlyAddedEmployeeIds([]);
  };

  const openCreateModal = () => {
    resetEditor();
    setShowEditor(true);
  };

  const closeCreateModal = () => {
    setShowEditor(false);
    resetEditor();
  };

  const resolveDesignationId = async () => {
    if (designationMode === 'pool') {
      if (!selectedDesignationId) return null;
      return selectedDesignationId;
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

  const saveProjectWithEmployeeIds = async employeeIds => {
    const project = await createQuickProject({
      orgId: session.orgId,
      name: projectName.trim(),
      projectNo: projectNo.trim(),
      departments: projectDepartments.map(item => ({
        quickDepartmentId: item.quickDepartmentId,
        name: item.name,
        employeeIds: [],
      })),
      employeeIds,
      createdBy: session.userId,
    });
    return project;
  };

  const handlePostProjectCreate = createdProject => {
    const shouldOpenMaterialRequest = openMaterialRequestAfterCreate;
    closeCreateModal();
    loadData();
    if (shouldOpenMaterialRequest) {
      navigation.navigate('MaterialRequests', {
        mode: 'quick',
        projectId: createdProject.quickProjectId,
        projectName: createdProject.name,
      });
      return;
    }
    Alert.alert('Success', 'Project created successfully');
  };

  const saveProject = async () => {
    if (!projectName.trim()) {
      Alert.alert('Validation', 'Please enter project name');
      return;
    }
    if (!projectNo.trim()) {
      Alert.alert('Validation', 'Please enter project no.');
      return;
    }

    const duplicateProjectNo = await isQuickProjectNoTaken(session.orgId, projectNo.trim());
    if (duplicateProjectNo) {
      Alert.alert('Validation', 'Project no. is already present.');
      return;
    }

    try {
      const createdProject = await saveProjectWithEmployeeIds(selectedEmployeeIds);
      handlePostProjectCreate(createdProject);
    } catch (error) {
      if (error?.message === 'PROJECT_NO_ALREADY_EXISTS') {
        Alert.alert('Validation', 'Project no. is already present.');
        return;
      }
      Alert.alert('Error', 'Failed to create project');
    }
  };

  const openEmployeePicker = async () => {
    Keyboard.dismiss();
    await loadEmployeesOnly();
    setTempSelectedEmployeeIds(selectedEmployeeIds);
    setShowEmployeePicker(true);
  };

  const openNewEmployeeModalEditor = () => {
    Keyboard.dismiss();
    setEmployeeMode('new');
    setNewEmployeeName('');
    setDesignationMode(null);
    setSelectedDesignationId('');
    setNewDesignationName('');
    setTempSelectedDesignationId('');
    setTempNewDesignationName('');
    setShowNewEmployeeModal(true);
  };

  const openDesignationPoolPicker = () => {
    setTempSelectedDesignationId(selectedDesignationId || '');
    setShowDesignationPicker(true);
  };

  const openNewDesignationEntry = () => {
    setTempNewDesignationName(newDesignationName || '');
    setShowNewDesignationModal(true);
  };

  const addNewEmployeeToDraft = async () => {
    const employeeName = newEmployeeName.trim();
    if (!employeeName) {
      Alert.alert('Validation', 'Please enter employee name');
      return;
    }

    const designationId = await resolveDesignationId();
    if (!designationId) {
      Alert.alert('Validation', 'Please add or select designation');
      return;
    }

    const existingEmployee = employees.find(
      item => item.name?.trim().toLowerCase() === employeeName.toLowerCase()
    );

    if (existingEmployee) {
      setSelectedEmployeeIds(prev =>
        prev.includes(existingEmployee.quickEmployeeId) ? prev : [...prev, existingEmployee.quickEmployeeId]
      );
      setShowNewEmployeeModal(false);
      setShowNewlyAddedEmployeesModal(true);
      Alert.alert('Info', `"${existingEmployee.name}" already exists in pool and is now selected for this project.`);
      return;
    }

    const createdEmployee = await createQuickEmployee({
      orgId: session.orgId,
      name: employeeName,
      designationId,
      createdBy: session.userId,
    });

    setEmployees(prev =>
      [...prev, createdEmployee].sort((a, b) => a.name.localeCompare(b.name))
    );
    setSelectedEmployeeIds(prev =>
      prev.includes(createdEmployee.quickEmployeeId) ? prev : [...prev, createdEmployee.quickEmployeeId]
    );
    setNewlyAddedEmployeeIds(prev =>
      prev.includes(createdEmployee.quickEmployeeId) ? prev : [...prev, createdEmployee.quickEmployeeId]
    );
    setShowNewEmployeeModal(false);
    setShowNewlyAddedEmployeesModal(true);
  };

  const addDepartmentToDraft = () => {
    const trimmed = departmentNameInput.trim();
    if (!trimmed) {
      Alert.alert('Validation', 'Please enter department name');
      return;
    }
    const isDuplicate = projectDepartments.some(
      item => item.name?.trim().toLowerCase() === trimmed.toLowerCase()
    );
    if (isDuplicate) {
      Alert.alert('Validation', 'Department already added.');
      return;
    }
    setProjectDepartments(prev => [
      ...prev,
      {
        quickDepartmentId: `quick_department_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        name: trimmed,
      },
    ]);
    setDepartmentNameInput('');
    setShowDepartmentModal(false);
  };

  const removeDepartmentFromDraft = quickDepartmentId => {
    setProjectDepartments(prev => prev.filter(item => item.quickDepartmentId !== quickDepartmentId));
  };

  const renderProject = ({ item, index }) => (
    <TouchableOpacity
      style={styles.projectCard}
      onPress={() => navigation.navigate('QuickProjectDetails', { quickProjectId: item.quickProjectId })}
      activeOpacity={0.75}
    >
      <Text style={[styles.cardWatermark, index % 2 === 0 ? styles.watermarkBlue : styles.watermarkGreen]}>
        PROJECT
      </Text>
      <View style={styles.projectIcon}>
        <Briefcase color={COLORS.warning} size={16} />
      </View>
      <View style={styles.projectInfo}>
        <Text style={styles.projectName}>{item.name}</Text>
        <Text style={styles.projectNo}>Project No: {item.projectNo || '-'}</Text>
        <Text style={styles.projectMeta}>Departments: {(item.departments || []).length}</Text>
        <Text style={styles.projectMeta}>{(item.employeeIds || []).length} employee(s)</Text>
      </View>
      <View style={styles.projectActions}>
        <TouchableOpacity
          style={styles.actionIconBtn}
          onPress={() => {
            setEditingProjectId(item.quickProjectId);
            setRenameProjectName(item.name || '');
            setRenameProjectNo(item.projectNo || '');
            setShowProjectRenameModal(true);
          }}
        >
          <Pencil color={COLORS.primary} size={16} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionIconBtn}
          onPress={() => {
            Alert.alert('Confirm Delete', 'Are you sure you want to delete this project?', [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Delete',
                style: 'destructive',
                onPress: async () => {
                  await deleteQuickProject(item.quickProjectId);
                  loadData();
                },
              },
            ]);
          }}
        >
          <Trash2 color={COLORS.danger} size={16} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  const filteredProjects = useMemo(() => {
    if (!searchQuery.trim()) return projects;
    const query = searchQuery.toLowerCase();
    return projects.filter(
      item =>
        item.name?.toLowerCase().includes(query) ||
        String(item.projectNo || '').toLowerCase().includes(query)
    );
  }, [projects, searchQuery]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
          <ArrowLeft color={COLORS.text} size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Quick Project</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.content}>
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>Project Builder</Text>
          <Text style={styles.infoSubtitle}>
            Create projects and assign one or more employees in a single flow.
          </Text>
        </View>

        <TouchableOpacity style={styles.addButton} onPress={openCreateModal}>
          <Plus color={COLORS.white} size={16} />
          <Text style={styles.addButtonText}>Create Project</Text>
        </TouchableOpacity>

        <View style={styles.searchBox}>
          <Search color={COLORS.gray} size={18} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search project name or no..."
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

      <Modal
        transparent
        visible={showEditor}
        animationType="fade"
        statusBarTranslucent
        onRequestClose={closeCreateModal}
      >
        <KeyboardAvoidingView
          style={styles.modalKeyboardWrapper}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalCard, styles.editorModalCard]}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Create Project</Text>
                <TouchableOpacity style={styles.modalCloseBtn} onPress={closeCreateModal}>
                  <X color={COLORS.textLight} size={18} />
                </TouchableOpacity>
              </View>

              <ScrollView
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={styles.modalScrollContent}
              >
                <TextInput
                  style={styles.input}
                  placeholder="Project name"
                  placeholderTextColor={COLORS.gray}
                  value={projectName}
                  onChangeText={setProjectName}
                />
                <TextInput
                  style={[styles.input, styles.mt10]}
                  placeholder="Project no."
                  placeholderTextColor={COLORS.gray}
                  value={projectNo}
                  onChangeText={setProjectNo}
                />

                {canManageQuickProject ? (
                  <>
                    <View style={styles.departmentsHeader}>
                      <Text style={styles.sectionLabel}>Departments (Optional)</Text>
                      <TouchableOpacity style={styles.addDepartmentBtn} onPress={() => setShowDepartmentModal(true)}>
                        <Text style={styles.addDepartmentBtnText}>Add Department</Text>
                      </TouchableOpacity>
                    </View>

                    {projectDepartments.length > 0 ? (
                      <View style={styles.departmentList}>
                        {projectDepartments.map(item => (
                          <View key={item.quickDepartmentId} style={styles.departmentChip}>
                            <Text style={styles.departmentChipText}>{item.name}</Text>
                            <TouchableOpacity onPress={() => removeDepartmentFromDraft(item.quickDepartmentId)}>
                              <Trash2 color={COLORS.danger} size={14} />
                            </TouchableOpacity>
                          </View>
                        ))}
                      </View>
                    ) : (
                      <Text style={styles.departmentHintText}>No departments added</Text>
                    )}
                  </>
                ) : null}

                <Text style={styles.sectionLabel}>Add Employees</Text>
                <View style={styles.modeSwitch}>
                  <TouchableOpacity
                    style={[styles.modeButton, employeeMode === 'pool' && styles.modeButtonActive]}
                    onPress={async () => {
                      setEmployeeMode('pool');
                      await openEmployeePicker();
                    }}
                  >
                    <Text style={[styles.modeButtonText, employeeMode === 'pool' && styles.modeButtonTextActive]}>
                      {employeeMode === 'pool' && selectedEmployeeIds.length > 0
                        ? `${selectedEmployeeIds.length} employee(s) selected`
                        : 'Employees from pool'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modeButton, employeeMode === 'new' && styles.modeButtonActive]}
                    onPress={openNewEmployeeModalEditor}
                  >
                    <Text style={[styles.modeButtonText, employeeMode === 'new' && styles.modeButtonTextActive]}>
                      New employee
                    </Text>
                  </TouchableOpacity>
                </View>

                {employeeMode === 'pool' ? (
                  <TouchableOpacity style={styles.selectBtn} onPress={openEmployeePicker}>
                    <Text style={[styles.selectText, selectedEmployeeIds.length === 0 && styles.placeholder]}>
                      {selectedEmployeeIds.length > 0
                        ? `${selectedEmployeeIds.length} employee(s) selected`
                        : 'Select employee(s) - optional'}
                    </Text>
                    <ChevronDown color={COLORS.gray} size={16} />
                  </TouchableOpacity>
                ) : null}

                {employeeMode === 'new' ? (
                  <TouchableOpacity
                    style={[styles.selectBtn, styles.newlyAddedBtn]}
                    onPress={() => setShowNewlyAddedEmployeesModal(true)}
                  >
                    <Text style={styles.selectText}>
                      Newly Added Employee List ({newlyAddedEmployeeIds.length})
                    </Text>
                    <ChevronDown color={COLORS.gray} size={16} />
                  </TouchableOpacity>
                ) : null}

                <TouchableOpacity
                  style={styles.optionalRow}
                  onPress={() => setOpenMaterialRequestAfterCreate(prev => !prev)}
                  activeOpacity={0.75}
                >
                  {openMaterialRequestAfterCreate ? (
                    <CheckSquare color={COLORS.primary} size={18} />
                  ) : (
                    <Square color={COLORS.gray} size={18} />
                  )}
                  <Text style={styles.optionalText}>Add Material Request (Optional)</Text>
                </TouchableOpacity>

                <View style={styles.modalButtons}>
                  <TouchableOpacity style={styles.cancelBtn} onPress={closeCreateModal}>
                    <Text style={styles.cancelBtnText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.saveBtn} onPress={saveProject}>
                    <Text style={styles.saveBtnText}>Create</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal
        transparent
        visible={showEmployeePicker}
        animationType="fade"
        onRequestClose={() => setShowEmployeePicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Employees</Text>
              <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setShowEmployeePicker(false)}>
                <X color={COLORS.textLight} size={18} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={employees}
              keyExtractor={item => item.quickEmployeeId}
              renderItem={({ item }) => {
                const selected = tempSelectedEmployeeIds.includes(item.quickEmployeeId);
                return (
                  <TouchableOpacity
                    style={styles.employeeItem}
                    onPress={() =>
                      setTempSelectedEmployeeIds(prev =>
                        prev.includes(item.quickEmployeeId)
                          ? prev.filter(id => id !== item.quickEmployeeId)
                          : [...prev, item.quickEmployeeId]
                      )
                    }
                    activeOpacity={0.75}
                  >
                    {selected ? (
                      <CheckSquare color={COLORS.primary} size={18} />
                    ) : (
                      <Square color={COLORS.gray} size={18} />
                    )}
                    <View style={styles.employeeInfoBlock}>
                      <Text style={styles.employeeText}>{employeeMap[item.quickEmployeeId]}</Text>
                      <Text style={styles.employeeSubText}>
                        {designationMap[item.designationId] || 'No designation'}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={
                <Text style={styles.emptyText}>
                  {loadingEmployeePool ? 'Loading employees...' : 'No employees in employee pool'}
                </Text>
              }
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => {
                  setTempSelectedEmployeeIds(selectedEmployeeIds);
                  setShowEmployeePicker(false);
                }}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveBtn}
                onPress={() => {
                  setSelectedEmployeeIds(tempSelectedEmployeeIds);
                  setShowEmployeePicker(false);
                }}
              >
                <Text style={styles.saveBtnText}>OK</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        transparent
        visible={showNewlyAddedEmployeesModal}
        animationType="fade"
        onRequestClose={() => setShowNewlyAddedEmployeesModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Newly Added Employees</Text>
              <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setShowNewlyAddedEmployeesModal(false)}>
                <X color={COLORS.textLight} size={18} />
              </TouchableOpacity>
            </View>

            <FlatList
              data={newlyAddedEmployees}
              keyExtractor={item => item.quickEmployeeId}
              renderItem={({ item }) => (
                <View style={styles.newlyAddedItem}>
                  <View style={styles.employeeInfoBlock}>
                    <Text style={styles.employeeText}>{item.name}</Text>
                    <Text style={styles.employeeSubText}>
                      {designationMap[item.designationId] || 'No designation'}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.removeFromSelectionBtn}
                    onPress={() => {
                      setSelectedEmployeeIds(prev => prev.filter(id => id !== item.quickEmployeeId));
                      setNewlyAddedEmployeeIds(prev => prev.filter(id => id !== item.quickEmployeeId));
                    }}
                  >
                    <Text style={styles.removeFromSelectionText}>Remove</Text>
                  </TouchableOpacity>
                </View>
              )}
              ListEmptyComponent={
                <Text style={styles.emptyText}>No newly added employees yet.</Text>
              }
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowNewlyAddedEmployeesModal(false)}>
                <Text style={styles.cancelBtnText}>Close</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveBtn}
                onPress={() => {
                  setShowNewlyAddedEmployeesModal(false);
                  openNewEmployeeModalEditor();
                }}
              >
                <Text style={styles.saveBtnText}>Add New Employee</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        transparent
        visible={showNewEmployeeModal}
        animationType="fade"
        onRequestClose={() => setShowNewEmployeeModal(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalKeyboardWrapper}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>New Employee</Text>
                <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setShowNewEmployeeModal(false)}>
                  <X color={COLORS.textLight} size={18} />
                </TouchableOpacity>
              </View>

              <TextInput
                style={styles.input}
                placeholder="Employee name"
                placeholderTextColor={COLORS.gray}
                value={newEmployeeName}
                onChangeText={setNewEmployeeName}
              />

              <Text style={styles.sectionLabel}>Designation</Text>
              <View style={styles.modeSwitch}>
                <TouchableOpacity
                  style={[styles.modeButton, designationMode === 'pool' && styles.modeButtonActive]}
                  onPress={() => {
                    setDesignationMode('pool');
                    setNewDesignationName('');
                    openDesignationPoolPicker();
                  }}
                >
                  <Text style={[styles.modeButtonText, designationMode === 'pool' && styles.modeButtonTextActive]}>
                    Select from pool
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modeButton, designationMode === 'new' && styles.modeButtonActive]}
                  onPress={() => {
                    setDesignationMode('new');
                    setSelectedDesignationId('');
                    setTempSelectedDesignationId('');
                    openNewDesignationEntry();
                  }}
                >
                  <Text style={[styles.modeButtonText, designationMode === 'new' && styles.modeButtonTextActive]}>
                    Add directly
                  </Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.selectedDesignationLabel}>Selected Designation</Text>
              <Text style={[styles.selectedDesignationValue, !designationMode && styles.placeholder]}>
                {designationMode === 'pool'
                  ? selectedDesignationId
                    ? designationMap[selectedDesignationId]
                    : 'No designation selected'
                  : designationMode === 'new'
                    ? newDesignationName || 'No designation selected'
                    : 'No designation option selected'}
              </Text>

              <View style={styles.modalButtons}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowNewEmployeeModal(false)}>
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.saveBtn}
                  onPress={addNewEmployeeToDraft}
                >
                  <Text style={styles.saveBtnText}>OK</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal
        transparent
        visible={showDepartmentModal}
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => {
          setDepartmentNameInput('');
          setShowDepartmentModal(false);
        }}
      >
        <KeyboardAvoidingView
          style={styles.modalKeyboardWrapper}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Add Department</Text>
                <TouchableOpacity
                  style={styles.modalCloseBtn}
                  onPress={() => {
                    setDepartmentNameInput('');
                    setShowDepartmentModal(false);
                  }}
                >
                  <X color={COLORS.textLight} size={18} />
                </TouchableOpacity>
              </View>
              <TextInput
                style={styles.input}
                placeholder="Department name"
                placeholderTextColor={COLORS.gray}
                value={departmentNameInput}
                onChangeText={setDepartmentNameInput}
              />
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => {
                    setDepartmentNameInput('');
                    setShowDepartmentModal(false);
                  }}
                >
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.saveBtn} onPress={addDepartmentToDraft}>
                  <Text style={styles.saveBtnText}>Add</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
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
            <FlatList
              data={designations}
              keyExtractor={item => item.quickDesignationId}
              renderItem={({ item }) => {
                const isSelected = tempSelectedDesignationId === item.quickDesignationId;
                return (
                  <TouchableOpacity
                    style={[styles.designationItem, isSelected && styles.designationItemSelected]}
                    onPress={() => setTempSelectedDesignationId(item.quickDesignationId)}
                    activeOpacity={0.75}
                  >
                    <Text style={styles.designationText}>{item.name}</Text>
                    {isSelected ? <Check color="#166534" size={20} strokeWidth={3} /> : null}
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={<Text style={styles.emptyText}>No designations available</Text>}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => {
                  setTempSelectedDesignationId(selectedDesignationId || '');
                  setShowDesignationPicker(false);
                }}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveBtn}
                onPress={() => {
                  setSelectedDesignationId(tempSelectedDesignationId);
                  setNewDesignationName('');
                  setShowDesignationPicker(false);
                }}
              >
                <Text style={styles.saveBtnText}>OK</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        transparent
        visible={showNewDesignationModal}
        animationType="fade"
        onRequestClose={() => setShowNewDesignationModal(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalKeyboardWrapper}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>New Designation</Text>
                <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setShowNewDesignationModal(false)}>
                  <X color={COLORS.textLight} size={18} />
                </TouchableOpacity>
              </View>
              <TextInput
                style={styles.input}
                placeholder="Designation name"
                placeholderTextColor={COLORS.gray}
                value={tempNewDesignationName}
                onChangeText={setTempNewDesignationName}
              />
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => {
                    setTempNewDesignationName(newDesignationName || '');
                    setShowNewDesignationModal(false);
                  }}
                >
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.saveBtn}
                  onPress={() => {
                    if (!tempNewDesignationName.trim()) {
                      Alert.alert('Validation', 'Please enter new designation');
                      return;
                    }
                    setNewDesignationName(tempNewDesignationName.trim());
                    setSelectedDesignationId('');
                    setTempSelectedDesignationId('');
                    setShowNewDesignationModal(false);
                  }}
                >
                  <Text style={styles.saveBtnText}>OK</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal
        transparent
        visible={showProjectRenameModal}
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setShowProjectRenameModal(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalKeyboardWrapper}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Project</Text>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => {
                  setShowProjectRenameModal(false);
                  setRenameProjectName('');
                  setRenameProjectNo('');
                  setEditingProjectId(null);
                }}
              >
                <X color={COLORS.textLight} size={18} />
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.input}
              placeholder="Project name"
              placeholderTextColor={COLORS.gray}
              value={renameProjectName}
              onChangeText={setRenameProjectName}
            />
            <TextInput
              style={[styles.input, styles.mt10]}
              placeholder="Project no."
              placeholderTextColor={COLORS.gray}
              value={renameProjectNo}
              onChangeText={setRenameProjectNo}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => {
                  setShowProjectRenameModal(false);
                  setRenameProjectName('');
                  setRenameProjectNo('');
                  setEditingProjectId(null);
                }}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveBtn}
                onPress={async () => {
                  if (!renameProjectName.trim()) {
                    Alert.alert('Validation', 'Please enter project name');
                    return;
                  }
                  if (!renameProjectNo.trim()) {
                    Alert.alert('Validation', 'Please enter project no.');
                    return;
                  }
                  if (!editingProjectId) return;
                  const duplicateProjectNo = await isQuickProjectNoTaken(
                    session.orgId,
                    renameProjectNo.trim(),
                    editingProjectId
                  );
                  if (duplicateProjectNo) {
                    Alert.alert('Validation', 'Project no. is already present.');
                    return;
                  }

                  Alert.alert('Confirm Update', 'Are you sure you want to update project?', [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Update',
                      onPress: async () => {
                        try {
                          await updateQuickProject(editingProjectId, {
                            name: renameProjectName.trim(),
                            projectNo: renameProjectNo.trim(),
                          });
                          setShowProjectRenameModal(false);
                          setEditingProjectId(null);
                          setRenameProjectName('');
                          setRenameProjectNo('');
                          loadData();
                        } catch (error) {
                          if (error?.message === 'PROJECT_NO_ALREADY_EXISTS') {
                            Alert.alert('Validation', 'Project no. is already present.');
                            return;
                          }
                          Alert.alert('Error', 'Failed to update project');
                        }
                      },
                    },
                  ]);
                }}
              >
                <Text style={styles.saveBtnText}>Update</Text>
              </TouchableOpacity>
            </View>
            </View>
          </View>
        </KeyboardAvoidingView>
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
    overflow: 'hidden',
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
  projectNo: { marginTop: 1, color: COLORS.textLight, fontSize: 12, fontWeight: '600' },
  projectMeta: { color: COLORS.textLight, fontSize: 12, marginTop: 2 },
  projectActions: { flexDirection: 'row' },
  actionIconBtn: { padding: 6 },
  cardWatermark: {
    position: 'absolute',
    right: 10,
    top: 8,
    fontSize: 24,
    fontWeight: '800',
    opacity: 0.1,
    letterSpacing: 1,
  },
  watermarkGreen: { color: '#10B981' },
  watermarkBlue: { color: '#2563EB' },
  emptyText: { textAlign: 'center', marginTop: 24, color: COLORS.textLight },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  modalKeyboardWrapper: { flex: 1 },
  modalCard: {
    width: '100%',
    maxHeight: '75%',
    backgroundColor: COLORS.white,
    borderRadius: 14,
    padding: 16,
    overflow: 'hidden',
  },
  editorModalCard: {
    maxHeight: '86%',
  },
  modalScrollContent: {
    paddingBottom: 4,
  },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  modalCloseBtn: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  modalTitle: { fontSize: 17, fontWeight: '700', color: COLORS.text, marginBottom: 12 },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
    backgroundColor: COLORS.white,
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
  departmentsHeader: {
    marginTop: 8,
    marginBottom: 2,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  addDepartmentBtn: {
    height: 28,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addDepartmentBtnText: {
    color: '#1D4ED8',
    fontSize: 12,
    fontWeight: '700',
  },
  departmentList: {
    marginTop: 4,
    marginBottom: 6,
    gap: 8,
  },
  departmentChip: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 10,
    height: 36,
    backgroundColor: COLORS.white,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  departmentChipText: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '600',
  },
  departmentHintText: {
    marginTop: 4,
    marginBottom: 6,
    color: COLORS.textLight,
    fontSize: 12,
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
  newlyAddedBtn: {
    marginTop: 8,
  },
  selectText: { color: COLORS.text, fontSize: 14 },
  selectedDesignationLabel: {
    marginTop: 10,
    color: COLORS.textLight,
    fontSize: 12,
    fontWeight: '600',
  },
  selectedDesignationValue: {
    marginTop: 4,
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '700',
  },
  placeholder: { color: COLORS.gray },
  optionalRow: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  optionalText: {
    marginLeft: 8,
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '600',
  },
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
  employeeInfoBlock: {
    marginLeft: 8,
    flex: 1,
  },
  employeeText: { color: COLORS.text, fontSize: 14, fontWeight: '600' },
  employeeSubText: { marginTop: 2, color: COLORS.textLight, fontSize: 12 },
  newlyAddedItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  removeFromSelectionBtn: {
    paddingHorizontal: 10,
    height: 30,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FECACA',
    backgroundColor: '#FEF2F2',
    justifyContent: 'center',
  },
  removeFromSelectionText: {
    color: '#B91C1C',
    fontSize: 12,
    fontWeight: '700',
  },
  designationItem: {
    minHeight: 48,
    borderRadius: 10,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  designationItemSelected: {
    backgroundColor: '#DCFCE7',
  },
  designationText: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '500',
  },
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
