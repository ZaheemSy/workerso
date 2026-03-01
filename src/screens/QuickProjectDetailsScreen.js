import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, FlatList, Alert, TextInput } from 'react-native';
import { ArrowLeft, Plus, Users, Trash2, CheckSquare, Square, Search, Pencil, Building2, UserPlus, ChevronDown, X, Image as ImageIcon } from 'lucide-react-native';
import { COLORS } from '../constants/colors';
import { ROLES } from '../constants/roles';
import { useAuth } from '../contexts/AuthContext';
import {
  getQuickProjectById,
  getQuickEmployeesByOrg,
  getQuickDesignationsByOrg,
  addEmployeeToQuickProject,
  removeEmployeeFromQuickProject,
  isQuickProjectNoTaken,
  updateQuickProject,
  deleteQuickProject,
  createQuickEmployee,
  createQuickDesignation,
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
  const [showProjectRenameModal, setShowProjectRenameModal] = useState(false);
  const [renameProjectName, setRenameProjectName] = useState('');
  const [renameProjectNo, setRenameProjectNo] = useState('');
  const [showDepartmentCreateModal, setShowDepartmentCreateModal] = useState(false);
  const [departmentNameInput, setDepartmentNameInput] = useState('');
  const [showDepartmentEmployeeModal, setShowDepartmentEmployeeModal] = useState(false);
  const [departmentSearchQuery, setDepartmentSearchQuery] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState(null);
  const [selectedDepartmentEmployeeIds, setSelectedDepartmentEmployeeIds] = useState([]);
  const [showNewEmployeeModal, setShowNewEmployeeModal] = useState(false);
  const [newEmployeeName, setNewEmployeeName] = useState('');
  const [designationMode, setDesignationMode] = useState('pool');
  const [selectedDesignationId, setSelectedDesignationId] = useState('');
  const [newDesignationName, setNewDesignationName] = useState('');
  const [showDesignationPicker, setShowDesignationPicker] = useState(false);

  const employeeMap = useMemo(() => {
    const map = {};
    employees.forEach(item => {
      map[item.quickEmployeeId] = item;
    });
    return map;
  }, [employees]);

  const canManageQuickProject = session?.role === ROLES.SUPER_ADMIN || session?.role === ROLES.ADMIN;

  const projectDepartments = useMemo(() => project?.departments || [], [project]);

  const departmentAssignedEmployeeIds = useMemo(() => {
    const ids = new Set();
    projectDepartments.forEach(dept => {
      (dept.employeeIds || []).forEach(id => ids.add(id));
    });
    return ids;
  }, [projectDepartments]);

  const projectEmployees = useMemo(() => {
    if (!project) return [];
    return (project.employeeIds || [])
      .map(id => employeeMap[id])
      .filter(Boolean);
  }, [project, employeeMap]);

  const unassignedProjectEmployees = useMemo(
    () => projectEmployees.filter(item => !departmentAssignedEmployeeIds.has(item.quickEmployeeId)),
    [departmentAssignedEmployeeIds, projectEmployees]
  );

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

  const selectedDepartmentEmployeeMap = useMemo(() => {
    const map = {};
    selectedDepartmentEmployeeIds.forEach(id => {
      map[id] = true;
    });
    return map;
  }, [selectedDepartmentEmployeeIds]);

  const selectedDepartmentAssignableEmployees = useMemo(() => {
    if (!selectedDepartment) return [];
    const selectedDepartmentId = selectedDepartment.quickDepartmentId;
    return projectEmployees
      .filter(emp => {
        const employeeId = emp.quickEmployeeId;
        const assignedElsewhere = projectDepartments.some(
          dept =>
            dept.quickDepartmentId !== selectedDepartmentId &&
            (dept.employeeIds || []).includes(employeeId)
        );
        if (assignedElsewhere) return false;
        if (!departmentSearchQuery.trim()) return true;
        const query = departmentSearchQuery.toLowerCase();
        const designation = (designationMap[emp.designationId] || '').toLowerCase();
        return (
          emp.name?.toLowerCase().includes(query) ||
          designation.includes(query)
        );
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [departmentSearchQuery, designationMap, projectDepartments, projectEmployees, selectedDepartment]);

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

  const toggleDepartmentEmployeeSelection = quickEmployeeId => {
    setSelectedDepartmentEmployeeIds(prev =>
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

  const addDepartment = async () => {
    if (!project || !canManageQuickProject) return;
    const trimmed = departmentNameInput.trim();
    if (!trimmed) {
      Alert.alert('Validation', 'Please enter department name');
      return;
    }
    const duplicate = (project.departments || []).some(
      item => item.name?.trim().toLowerCase() === trimmed.toLowerCase()
    );
    if (duplicate) {
      Alert.alert('Validation', 'Department already exists.');
      return;
    }

    const now = new Date().toISOString();
    const nextDepartments = [
      ...(project.departments || []),
      {
        quickDepartmentId: `quick_department_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        name: trimmed,
        employeeIds: [],
        createdAt: now,
        updatedAt: now,
      },
    ];
    await updateQuickProject(quickProjectId, { departments: nextDepartments });
    setDepartmentNameInput('');
    setShowDepartmentCreateModal(false);
    loadData();
  };

  const removeDepartment = department => {
    if (!project || !canManageQuickProject) return;
    Alert.alert('Delete Department', `Remove "${department.name}" from project?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          const nextDepartments = (project.departments || []).filter(
            item => item.quickDepartmentId !== department.quickDepartmentId
          );
          await updateQuickProject(quickProjectId, { departments: nextDepartments });
          loadData();
        },
      },
    ]);
  };

  const openDepartmentEmployeeModal = department => {
    setSelectedDepartment(department);
    setDepartmentSearchQuery('');
    setSelectedDepartmentEmployeeIds([...(department.employeeIds || [])]);
    setShowDepartmentEmployeeModal(true);
  };

  const saveDepartmentEmployees = async () => {
    if (!project || !selectedDepartment) return;
    const nextDepartments = (project.departments || []).map(item =>
      item.quickDepartmentId === selectedDepartment.quickDepartmentId
        ? { ...item, employeeIds: Array.from(new Set(selectedDepartmentEmployeeIds)) }
        : item
    );

    const deptEmployeeIds = new Set();
    nextDepartments.forEach(item => (item.employeeIds || []).forEach(id => deptEmployeeIds.add(id)));
    const existingProjectEmployeeIds = new Set(project.employeeIds || []);
    const nextProjectEmployeeIds = Array.from(new Set([...existingProjectEmployeeIds, ...deptEmployeeIds]));

    await updateQuickProject(quickProjectId, {
      departments: nextDepartments,
      employeeIds: nextProjectEmployeeIds,
    });
    setShowDepartmentEmployeeModal(false);
    setSelectedDepartment(null);
    setSelectedDepartmentEmployeeIds([]);
    loadData();
  };

  const resolveDesignationId = async () => {
    if (designationMode === 'pool') {
      if (!selectedDesignationId) return null;
      return selectedDesignationId;
    }
    const trimmed = newDesignationName.trim();
    if (!trimmed) return null;
    const existing = Object.entries(designationMap).find(
      ([, name]) => name?.trim().toLowerCase() === trimmed.toLowerCase()
    );
    if (existing) return existing[0];
    const created = await createQuickDesignation({
      orgId: session.orgId,
      name: trimmed,
      createdBy: session.userId,
    });
    return created.quickDesignationId;
  };

  const createEmployeeAndAssignToDepartment = async () => {
    if (!selectedDepartment || !canManageQuickProject) return;
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
    let quickEmployeeId = existingEmployee?.quickEmployeeId;
    if (!quickEmployeeId) {
      const createdEmployee = await createQuickEmployee({
        orgId: session.orgId,
        name: employeeName,
        designationId,
        createdBy: session.userId,
      });
      quickEmployeeId = createdEmployee.quickEmployeeId;
    }

    await addEmployeeToQuickProject(quickProjectId, quickEmployeeId);

    const nextDepartmentEmployeeIds = selectedDepartmentEmployeeIds.includes(quickEmployeeId)
      ? selectedDepartmentEmployeeIds
      : [...selectedDepartmentEmployeeIds, quickEmployeeId];
    const nextDepartments = (project?.departments || []).map(item =>
      item.quickDepartmentId === selectedDepartment.quickDepartmentId
        ? { ...item, employeeIds: Array.from(new Set(nextDepartmentEmployeeIds)) }
        : item
    );
    const nextProjectEmployeeIds = Array.from(
      new Set([...(project?.employeeIds || []), quickEmployeeId])
    );
    await updateQuickProject(quickProjectId, {
      departments: nextDepartments,
      employeeIds: nextProjectEmployeeIds,
    });

    setSelectedDepartmentEmployeeIds(Array.from(new Set(nextDepartmentEmployeeIds)));

    setNewEmployeeName('');
    setDesignationMode('pool');
    setSelectedDesignationId('');
    setNewDesignationName('');
    setShowNewEmployeeModal(false);
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

  const renderEmployee = ({ item, index }) => (
    <View style={styles.employeeRow}>
      <Text style={[styles.rowWatermark, index % 2 === 0 ? styles.watermarkGreen : styles.watermarkBlue]}>
        EMP
      </Text>
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
          <Text style={styles.projectMetaLine}>Project No: {project.projectNo || '-'}</Text>
          <Text style={styles.projectMetaLine}>
            Assigned Employees: {(project.employeeIds || []).length}
          </Text>
        </View>

        <View style={styles.projectActionsRow}>
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => {
              setRenameProjectName(project.name || '');
              setRenameProjectNo(project.projectNo || '');
              setShowProjectRenameModal(true);
            }}
          >
            <Pencil color={COLORS.primary} size={16} />
            <Text style={styles.secondaryButtonText}>Edit Project</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.deleteProjectButton}
            onPress={() => {
              Alert.alert('Confirm Delete', 'Are you sure you want to delete this project?', [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Delete',
                  style: 'destructive',
                  onPress: async () => {
                    await deleteQuickProject(quickProjectId);
                    navigation.goBack();
                  },
                },
              ]);
            }}
          >
            <Trash2 color={COLORS.danger} size={16} />
            <Text style={styles.deleteProjectButtonText}>Delete Project</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.galleryButton}
          onPress={() => navigation.navigate('QuickProjectGallery', { quickProjectId })}
        >
          <ImageIcon color={COLORS.secondary} size={16} />
          <Text style={styles.galleryButtonText}>Project Gallery</Text>
        </TouchableOpacity>

        <View style={styles.departmentBlock}>
          <View style={styles.departmentHeaderRow}>
            <Text style={styles.departmentTitle}>Departments</Text>
            {canManageQuickProject ? (
              <TouchableOpacity style={styles.departmentAddBtn} onPress={() => setShowDepartmentCreateModal(true)}>
                <Building2 color="#1D4ED8" size={14} />
                <Text style={styles.departmentAddBtnText}>Add Department</Text>
              </TouchableOpacity>
            ) : null}
          </View>

          {projectDepartments.length === 0 ? (
            <Text style={styles.departmentEmptyText}>No department added. Employees stay under No Department.</Text>
          ) : (
            projectDepartments.map(item => {
              const projectEmployeeSet = new Set(project.employeeIds || []);
              const deptEmployees = (item.employeeIds || [])
                .filter(id => projectEmployeeSet.has(id))
                .map(id => employeeMap[id])
                .filter(Boolean);
              return (
                <View key={item.quickDepartmentId} style={styles.departmentCard}>
                  <View style={styles.departmentCardTop}>
                    <View style={styles.departmentNameWrap}>
                      <Text style={styles.departmentName}>{item.name}</Text>
                      <Text style={styles.departmentCount}>{deptEmployees.length} employee(s)</Text>
                    </View>
                    {canManageQuickProject ? (
                      <TouchableOpacity onPress={() => removeDepartment(item)} style={styles.departmentDeleteBtn}>
                        <Trash2 color={COLORS.danger} size={15} />
                      </TouchableOpacity>
                    ) : null}
                  </View>
                  {canManageQuickProject ? (
                    <TouchableOpacity
                      style={styles.departmentManageBtn}
                      onPress={() => openDepartmentEmployeeModal(item)}
                    >
                      <Users color={COLORS.primary} size={14} />
                      <Text style={styles.departmentManageBtnText}>Add Employees</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              );
            })
          )}

          {unassignedProjectEmployees.length > 0 ? (
            <Text style={styles.departmentUnassignedText}>
              No Department: {unassignedProjectEmployees.length} employee(s)
            </Text>
          ) : null}
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
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Employees</Text>
              <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setShowPicker(false)}>
                <X color={COLORS.textLight} size={18} />
              </TouchableOpacity>
            </View>
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

      <Modal
        transparent
        visible={showDepartmentCreateModal}
        animationType="fade"
        onRequestClose={() => setShowDepartmentCreateModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Department</Text>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => {
                  setDepartmentNameInput('');
                  setShowDepartmentCreateModal(false);
                }}
              >
                <X color={COLORS.textLight} size={18} />
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.modalInput}
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
                  setShowDepartmentCreateModal(false);
                }}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={addDepartment}>
                <Text style={styles.saveBtnText}>Add</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        transparent
        visible={showDepartmentEmployeeModal}
        animationType="fade"
        onRequestClose={() => setShowDepartmentEmployeeModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Department Employees</Text>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => {
                  setShowDepartmentEmployeeModal(false);
                  setSelectedDepartment(null);
                  setSelectedDepartmentEmployeeIds([]);
                }}
              >
                <X color={COLORS.textLight} size={18} />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalSubtitleText}>{selectedDepartment?.name || '-'}</Text>
            <View style={[styles.searchBox, styles.modalSearchBox]}>
              <Search color={COLORS.gray} size={18} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search employee..."
                placeholderTextColor={COLORS.gray}
                value={departmentSearchQuery}
                onChangeText={setDepartmentSearchQuery}
              />
            </View>

            <FlatList
              data={selectedDepartmentAssignableEmployees}
              keyExtractor={item => item.quickEmployeeId}
              renderItem={({ item }) => {
                const selected = !!selectedDepartmentEmployeeMap[item.quickEmployeeId];
                return (
                  <TouchableOpacity
                    style={styles.pickerRow}
                    onPress={() => toggleDepartmentEmployeeSelection(item.quickEmployeeId)}
                  >
                    {selected ? <CheckSquare color={COLORS.primary} size={18} /> : <Square color={COLORS.gray} size={18} />}
                    <View style={styles.pickerTextWrap}>
                      <Text style={styles.pickerText}>{item.name}</Text>
                      <Text style={styles.pickerSubText}>{designationMap[item.designationId] || 'No designation'}</Text>
                    </View>
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={<Text style={styles.emptyText}>No employees available for this department</Text>}
            />

            {canManageQuickProject ? (
              <TouchableOpacity style={styles.quickAddEmployeeBtn} onPress={() => setShowNewEmployeeModal(true)}>
                <UserPlus color={COLORS.primary} size={16} />
                <Text style={styles.quickAddEmployeeBtnText}>New Employee</Text>
              </TouchableOpacity>
            ) : null}

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => {
                  setShowDepartmentEmployeeModal(false);
                  setSelectedDepartment(null);
                  setSelectedDepartmentEmployeeIds([]);
                }}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={saveDepartmentEmployees}>
                <Text style={styles.saveBtnText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal transparent visible={showNewEmployeeModal} animationType="fade" onRequestClose={() => setShowNewEmployeeModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>New Employee</Text>
              <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setShowNewEmployeeModal(false)}>
                <X color={COLORS.textLight} size={18} />
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.modalInput}
              placeholder="Employee name"
              placeholderTextColor={COLORS.gray}
              value={newEmployeeName}
              onChangeText={setNewEmployeeName}
            />
            <View style={styles.modeSwitch}>
              <TouchableOpacity
                style={[styles.modeButton, designationMode === 'pool' && styles.modeButtonActive]}
                onPress={() => setDesignationMode('pool')}
              >
                <Text style={[styles.modeButtonText, designationMode === 'pool' && styles.modeButtonTextActive]}>
                  Select Designation
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modeButton, designationMode === 'new' && styles.modeButtonActive]}
                onPress={() => setDesignationMode('new')}
              >
                <Text style={[styles.modeButtonText, designationMode === 'new' && styles.modeButtonTextActive]}>
                  New Designation
                </Text>
              </TouchableOpacity>
            </View>
            {designationMode === 'pool' ? (
              <TouchableOpacity style={styles.selectBtn} onPress={() => setShowDesignationPicker(true)}>
                <Text style={[styles.selectText, !selectedDesignationId && styles.placeholder]}>
                  {selectedDesignationId ? designationMap[selectedDesignationId] : 'Select designation'}
                </Text>
                <ChevronDown color={COLORS.gray} size={16} />
              </TouchableOpacity>
            ) : (
              <TextInput
                style={[styles.modalInput, styles.mt8]}
                placeholder="Designation name"
                placeholderTextColor={COLORS.gray}
                value={newDesignationName}
                onChangeText={setNewDesignationName}
              />
            )}

            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowNewEmployeeModal(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={createEmployeeAndAssignToDepartment}>
                <Text style={styles.saveBtnText}>Create & Assign</Text>
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
            <FlatList
              data={Object.keys(designationMap).map(id => ({ quickDesignationId: id, name: designationMap[id] }))}
              keyExtractor={item => item.quickDesignationId}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.pickerRow}
                  onPress={() => {
                    setSelectedDesignationId(item.quickDesignationId);
                    setShowDesignationPicker(false);
                  }}
                >
                  <Text style={styles.pickerText}>{item.name}</Text>
                  {selectedDesignationId === item.quickDesignationId ? <CheckSquare color={COLORS.primary} size={18} /> : null}
                </TouchableOpacity>
              )}
              ListEmptyComponent={<Text style={styles.emptyText}>No designations available</Text>}
            />
          </View>
        </View>
      </Modal>

      <Modal
        transparent
        visible={showProjectRenameModal}
        animationType="fade"
        onRequestClose={() => setShowProjectRenameModal(false)}
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
                }}
              >
                <X color={COLORS.textLight} size={18} />
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.modalInput}
              placeholder="Project name"
              placeholderTextColor={COLORS.gray}
              value={renameProjectName}
              onChangeText={setRenameProjectName}
            />
            <TextInput
              style={styles.modalInput}
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
                  const duplicateProjectNo = await isQuickProjectNoTaken(
                    session.orgId,
                    renameProjectNo.trim(),
                    quickProjectId
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
                          await updateQuickProject(quickProjectId, {
                            name: renameProjectName.trim(),
                            projectNo: renameProjectNo.trim(),
                          });
                          setShowProjectRenameModal(false);
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
  projectActionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  departmentBlock: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    backgroundColor: COLORS.white,
    padding: 12,
    marginBottom: 12,
  },
  departmentHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  departmentTitle: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '700',
  },
  departmentAddBtn: {
    height: 30,
    borderRadius: 8,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  departmentAddBtnText: {
    marginLeft: 5,
    color: '#1D4ED8',
    fontSize: 12,
    fontWeight: '700',
  },
  departmentCard: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    padding: 10,
    marginTop: 8,
    backgroundColor: '#FAFAFA',
  },
  departmentCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  departmentNameWrap: { flex: 1 },
  departmentName: { color: COLORS.text, fontSize: 14, fontWeight: '700' },
  departmentCount: { marginTop: 2, color: COLORS.textLight, fontSize: 12 },
  departmentDeleteBtn: { padding: 4 },
  departmentManageBtn: {
    marginTop: 8,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  departmentManageBtnText: {
    marginLeft: 6,
    color: '#1D4ED8',
    fontSize: 12,
    fontWeight: '700',
  },
  departmentEmptyText: { color: COLORS.textLight, fontSize: 12 },
  departmentUnassignedText: {
    marginTop: 10,
    color: COLORS.textLight,
    fontSize: 12,
    fontWeight: '600',
  },
  secondaryButton: {
    flex: 1,
    height: 42,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    backgroundColor: '#EFF6FF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    marginLeft: 6,
    color: '#1D4ED8',
    fontSize: 13,
    fontWeight: '700',
  },
  deleteProjectButton: {
    flex: 1,
    height: 42,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FECACA',
    backgroundColor: '#FEF2F2',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteProjectButtonText: {
    marginLeft: 6,
    color: '#B91C1C',
    fontSize: 13,
    fontWeight: '700',
  },
  galleryButton: {
    marginTop: 10,
    marginBottom: 12,
    height: 42,
    borderRadius: 10,
    borderWidth: 1.2,
    borderColor: '#86EFAC',
    backgroundColor: '#F0FDF4',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  galleryButtonText: {
    marginLeft: 6,
    color: '#15803D',
    fontSize: 13,
    fontWeight: '700',
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
  employeeLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  employeeTextWrap: { marginLeft: 8, flex: 1 },
  employeeName: { color: COLORS.text, fontSize: 15, fontWeight: '600' },
  employeeMeta: { color: COLORS.textLight, fontSize: 12, marginTop: 2 },
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
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  modalCloseBtn: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  modalTitle: { fontSize: 17, fontWeight: '700', color: COLORS.text, marginBottom: 12 },
  modalSubtitleText: {
    marginTop: -6,
    marginBottom: 10,
    color: COLORS.textLight,
    fontSize: 12,
  },
  modalInput: {
    height: 44,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    color: COLORS.text,
    fontSize: 14,
    marginBottom: 10,
  },
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
  pickerTextWrap: { marginLeft: 8, flex: 1 },
  pickerSubText: { marginTop: 2, color: COLORS.textLight, fontSize: 12 },
  quickAddEmployeeBtn: {
    marginTop: 10,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  quickAddEmployeeBtnText: {
    marginLeft: 6,
    color: '#1D4ED8',
    fontSize: 13,
    fontWeight: '700',
  },
  modeSwitch: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 2,
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
  selectText: { color: COLORS.text, fontSize: 14 },
  placeholder: { color: COLORS.gray },
  mt8: { marginTop: 8 },
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
