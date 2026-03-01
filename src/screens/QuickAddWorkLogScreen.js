import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { ArrowLeft, Search, Users, Briefcase, Calendar, Clock, X } from 'lucide-react-native';
import { COLORS } from '../constants/colors';
import { ROLES } from '../constants/roles';
import { useAuth } from '../contexts/AuthContext';
import {
  getQuickEmployeesByOrg,
  getQuickProjectsByOrg,
  createQuickWorkLog,
} from '../services/storageService';

const FLOW_EMPLOYEE_FIRST = 'employee_first';
const FLOW_PROJECT_FIRST = 'project_first';
const DEPT_ALL = '__all__';
const DEPT_NONE = '__none__';

const QuickAddWorkLogScreen = ({ navigation }) => {
  const { session } = useAuth();
  const canAddLog = session?.role === ROLES.SUPER_ADMIN || session?.role === ROLES.ADMIN;

  const [employees, setEmployees] = useState([]);
  const [projects, setProjects] = useState([]);

  const [flowTab, setFlowTab] = useState(FLOW_EMPLOYEE_FIRST);

  const [employeeSearchQuery, setEmployeeSearchQuery] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [projectSearchQuery, setProjectSearchQuery] = useState('');
  const [employeeFlowDepartmentFilter, setEmployeeFlowDepartmentFilter] = useState(DEPT_ALL);

  const [projectFirstProjectSearch, setProjectFirstProjectSearch] = useState('');
  const [projectFirstEmployeeSearch, setProjectFirstEmployeeSearch] = useState('');
  const [selectedProject, setSelectedProject] = useState(null);
  const [showProjectEmployeeModal, setShowProjectEmployeeModal] = useState(false);
  const [projectFirstDepartmentFilter, setProjectFirstDepartmentFilter] = useState(DEPT_ALL);

  const [showWorkLogModal, setShowWorkLogModal] = useState(false);
  const [logDate, setLogDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [startTime, setStartTime] = useState(null);
  const [endTime, setEndTime] = useState(null);
  const [logMode, setLogMode] = useState('timings');
  const [directHH, setDirectHH] = useState('');
  const [directMM, setDirectMM] = useState('');

  const [recentSelection, setRecentSelection] = useState(null);

  const loadData = useCallback(async () => {
    if (!session?.orgId) return;
    const [employeeList, projectList] = await Promise.all([
      getQuickEmployeesByOrg(session.orgId),
      getQuickProjectsByOrg(session.orgId),
    ]);
    setEmployees(employeeList.sort((a, b) => a.name.localeCompare(b.name)));
    setProjects(projectList.sort((a, b) => a.name.localeCompare(b.name)));
  }, [session?.orgId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const getEmployeeDepartmentInProject = useCallback((project, quickEmployeeId) => {
    if (!project || !quickEmployeeId) return null;
    return (project.departments || []).find(item =>
      (item.employeeIds || []).includes(quickEmployeeId)
    ) || null;
  }, []);

  const filteredEmployees = useMemo(() => {
    if (!employeeSearchQuery.trim()) return employees;
    const query = employeeSearchQuery.toLowerCase();
    return employees.filter(item => item.name?.toLowerCase().includes(query));
  }, [employeeSearchQuery, employees]);

  const projectsForSelectedEmployee = useMemo(() => {
    if (!selectedEmployee) return [];
    return projects.filter(project => (project.employeeIds || []).includes(selectedEmployee.quickEmployeeId));
  }, [projects, selectedEmployee]);

  const employeeFlowDepartmentOptions = useMemo(() => {
    const options = [];
    const unique = {};
    let hasNoDepartment = false;

    projectsForSelectedEmployee.forEach(project => {
      const department = getEmployeeDepartmentInProject(project, selectedEmployee?.quickEmployeeId);
      if (!department) {
        hasNoDepartment = true;
        return;
      }
      if (!unique[department.quickDepartmentId]) {
        unique[department.quickDepartmentId] = department;
        options.push({
          id: department.quickDepartmentId,
          name: department.name,
        });
      }
    });

    if (hasNoDepartment) {
      options.push({ id: DEPT_NONE, name: 'No Department' });
    }

    return options.sort((a, b) => a.name.localeCompare(b.name));
  }, [getEmployeeDepartmentInProject, projectsForSelectedEmployee, selectedEmployee?.quickEmployeeId]);

  const filteredProjects = useMemo(() => {
    let list = projectsForSelectedEmployee;

    if (employeeFlowDepartmentFilter !== DEPT_ALL) {
      list = list.filter(project => {
        const department = getEmployeeDepartmentInProject(project, selectedEmployee?.quickEmployeeId);
        if (employeeFlowDepartmentFilter === DEPT_NONE) return !department;
        return department?.quickDepartmentId === employeeFlowDepartmentFilter;
      });
    }

    if (!projectSearchQuery.trim()) return list;
    const query = projectSearchQuery.toLowerCase();
    return list.filter(
      item =>
        item.name?.toLowerCase().includes(query) ||
        String(item.projectNo || '').toLowerCase().includes(query)
    );
  }, [employeeFlowDepartmentFilter, getEmployeeDepartmentInProject, projectSearchQuery, projectsForSelectedEmployee, selectedEmployee?.quickEmployeeId]);

  const filteredProjectsProjectFirst = useMemo(() => {
    if (!projectFirstProjectSearch.trim()) return projects;
    const query = projectFirstProjectSearch.toLowerCase();
    return projects.filter(
      item =>
        item.name?.toLowerCase().includes(query) ||
        String(item.projectNo || '').toLowerCase().includes(query)
    );
  }, [projectFirstProjectSearch, projects]);

  const projectFirstDepartmentOptions = useMemo(() => {
    if (!selectedProject) return [];
    const options = (selectedProject.departments || []).map(item => ({
      id: item.quickDepartmentId,
      name: item.name,
    }));
    options.sort((a, b) => a.name.localeCompare(b.name));
    const hasNoDepartmentEmployees = (selectedProject.employeeIds || []).some(empId => {
      const dept = getEmployeeDepartmentInProject(selectedProject, empId);
      return !dept;
    });
    if (hasNoDepartmentEmployees) options.push({ id: DEPT_NONE, name: 'No Department' });
    return options;
  }, [getEmployeeDepartmentInProject, selectedProject]);

  const filteredProjectFirstEmployees = useMemo(() => {
    if (!selectedProject) return [];

    let list = employees.filter(item => (selectedProject.employeeIds || []).includes(item.quickEmployeeId));

    if (projectFirstDepartmentFilter !== DEPT_ALL) {
      list = list.filter(item => {
        const department = getEmployeeDepartmentInProject(selectedProject, item.quickEmployeeId);
        if (projectFirstDepartmentFilter === DEPT_NONE) return !department;
        return department?.quickDepartmentId === projectFirstDepartmentFilter;
      });
    }

    if (!projectFirstEmployeeSearch.trim()) return list;
    const query = projectFirstEmployeeSearch.toLowerCase();
    return list.filter(item => item.name?.toLowerCase().includes(query));
  }, [employees, getEmployeeDepartmentInProject, projectFirstDepartmentFilter, projectFirstEmployeeSearch, selectedProject]);

  const selectedProjectDepartment = useMemo(() => {
    if (!selectedProject || !selectedEmployee) return null;
    return getEmployeeDepartmentInProject(selectedProject, selectedEmployee.quickEmployeeId);
  }, [getEmployeeDepartmentInProject, selectedEmployee, selectedProject]);

  const formatDate = date => date.toISOString().split('T')[0];
  const formatTime24 = date =>
    date.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  const formatTime12 = date =>
    date.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });

  const computeDurationFromTimes = (start, end) => {
    const diffMs = end.getTime() - start.getTime();
    const totalMinutes = Math.floor(diffMs / 60000);
    const hh = String(Math.floor(totalMinutes / 60)).padStart(2, '0');
    const mm = String(totalMinutes % 60).padStart(2, '0');
    return `${hh}:${mm}`;
  };

  const applyPreset = preset => {
    const baseDate = preset === 'today_full' ? new Date() : new Date(logDate);
    const withTime = (hours, minutes) => {
      const dt = new Date(baseDate);
      dt.setHours(hours, minutes, 0, 0);
      return dt;
    };

    if (preset === 'full' || preset === 'today_full') {
      setLogDate(new Date(baseDate));
      setLogMode('timings');
      setStartTime(withTime(9, 0));
      setEndTime(withTime(18, 0));
      setDirectHH('');
      setDirectMM('');
      return;
    }

    if (preset === 'half') {
      setLogMode('timings');
      setStartTime(withTime(9, 0));
      setEndTime(withTime(13, 0));
      setDirectHH('');
      setDirectMM('');
      return;
    }

    if (preset === 'ot2') {
      setLogMode('direct');
      setDirectHH('02');
      setDirectMM('00');
      setStartTime(null);
      setEndTime(null);
    }
  };

  const openProjectModal = employee => {
    if (!canAddLog) return;
    setSelectedEmployee(employee);
    setSelectedProject(null);
    setProjectSearchQuery('');
    setEmployeeFlowDepartmentFilter(DEPT_ALL);
    setShowProjectModal(true);
  };

  const openProjectFirstEmployeeModal = project => {
    if (!canAddLog) return;
    setSelectedProject(project);
    setProjectFirstEmployeeSearch('');
    setProjectFirstDepartmentFilter(DEPT_ALL);
    setShowProjectEmployeeModal(true);
  };

  const openWorkLogModal = ({ project, employee }) => {
    if (!canAddLog) return;
    const now = new Date();
    const defaultStart = new Date(now);
    defaultStart.setHours(9, 0, 0, 0);
    const defaultEnd = new Date(now);
    defaultEnd.setHours(18, 0, 0, 0);

    setSelectedProject(project);
    setSelectedEmployee(employee);
    setShowProjectModal(false);
    setShowProjectEmployeeModal(false);
    setLogDate(new Date());
    setStartTime(defaultStart);
    setEndTime(defaultEnd);
    setLogMode('timings');
    setDirectHH('');
    setDirectMM('');
    setShowWorkLogModal(true);
  };

  const saveWorkLog = async (skipNoDepartmentConfirmation = false) => {
    if (!selectedEmployee || !selectedProject) {
      Alert.alert('Validation', 'Please select employee and project');
      return;
    }

    if (
      !skipNoDepartmentConfirmation &&
      (selectedProject.departments || []).length > 0 &&
      !selectedProjectDepartment
    ) {
      Alert.alert(
        'No Department',
        'This employee is not assigned to a department in this project. Continue as No Department?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Continue', onPress: () => saveWorkLog(true) },
        ]
      );
      return;
    }

    let duration = '00:00';
    let logStartTime = null;
    let logEndTime = null;

    if (logMode === 'timings') {
      if (!startTime || !endTime) {
        Alert.alert('Validation', 'Please select both start and end time');
        return;
      }
      if (endTime <= startTime) {
        Alert.alert('Validation', 'End time must be later than start time');
        return;
      }
      duration = computeDurationFromTimes(startTime, endTime);
      logStartTime = formatTime24(startTime);
      logEndTime = formatTime24(endTime);
    } else {
      const hh = directHH.trim();
      const mm = directMM.trim();
      const hhNum = Number(hh);
      const mmNum = Number(mm);
      if (!/^\d+$/.test(hh) || !/^\d+$/.test(mm) || hhNum < 0 || hhNum > 23 || mmNum < 0 || mmNum > 59) {
        Alert.alert('Validation', 'Enter valid HH and MM values');
        return;
      }
      duration = `${String(hhNum).padStart(2, '0')}:${String(mmNum).padStart(2, '0')}`;
    }

    await createQuickWorkLog({
      orgId: session.orgId,
      quickProjectId: selectedProject.quickProjectId,
      quickEmployeeId: selectedEmployee.quickEmployeeId,
      employeeName: selectedEmployee.name,
      projectName: selectedProject.name,
      projectNo: selectedProject.projectNo || '',
      quickDepartmentId: selectedProjectDepartment?.quickDepartmentId || '',
      departmentName: selectedProjectDepartment?.name || 'No Department',
      date: formatDate(logDate),
      startTime: logStartTime,
      endTime: logEndTime,
      workLogHHMM: duration,
      loggedBy: session.userId,
    });

    setRecentSelection({
      quickProjectId: selectedProject.quickProjectId,
      quickEmployeeId: selectedEmployee.quickEmployeeId,
    });

    setShowWorkLogModal(false);
    setSelectedProject(null);
    setSelectedEmployee(null);
    Alert.alert('Success', 'Work log added successfully');
  };

  const recentProject = useMemo(
    () => projects.find(item => item.quickProjectId === recentSelection?.quickProjectId) || null,
    [projects, recentSelection?.quickProjectId]
  );
  const recentEmployee = useMemo(
    () => employees.find(item => item.quickEmployeeId === recentSelection?.quickEmployeeId) || null,
    [employees, recentSelection?.quickEmployeeId]
  );

  const renderEmployeeFirstRow = ({ item, index }) => (
    <TouchableOpacity style={styles.rowCard} onPress={() => openProjectModal(item)} activeOpacity={0.8}>
      <Text style={[styles.rowWatermark, index % 2 === 0 ? styles.watermarkGreen : styles.watermarkBlue]}>EMP</Text>
      <View style={styles.iconWrap}>
        <Users color={COLORS.secondary} size={16} />
      </View>
      <View style={styles.rowTextWrap}>
        <Text style={styles.rowTitle}>{item.name}</Text>
        <Text style={styles.rowSubtitle}>Select to choose project</Text>
      </View>
    </TouchableOpacity>
  );

  const renderProjectFirstProjectRow = ({ item, index }) => (
    <TouchableOpacity style={styles.rowCard} onPress={() => openProjectFirstEmployeeModal(item)} activeOpacity={0.8}>
      <Text style={[styles.rowWatermark, index % 2 === 0 ? styles.watermarkBlue : styles.watermarkGreen]}>PROJECT</Text>
      <View style={styles.iconWrap}>
        <Briefcase color={COLORS.warning} size={16} />
      </View>
      <View style={styles.rowTextWrap}>
        <Text style={styles.rowTitle}>{item.name}</Text>
        <Text style={styles.rowSubtitle}>Project No: {item.projectNo || '-'} • {(item.employeeIds || []).length} employee(s)</Text>
      </View>
    </TouchableOpacity>
  );

  const renderProjectFirstEmployeeRow = ({ item }) => {
    const department = getEmployeeDepartmentInProject(selectedProject, item.quickEmployeeId);
    return (
      <TouchableOpacity
        style={styles.rowCard}
        onPress={() => openWorkLogModal({ project: selectedProject, employee: item })}
        activeOpacity={0.8}
      >
        <View style={styles.iconWrap}>
          <Users color={COLORS.secondary} size={16} />
        </View>
        <View style={styles.rowTextWrap}>
          <Text style={styles.rowTitle}>{item.name}</Text>
          <Text style={styles.rowSubtitle}>Department: {department?.name || 'No Department'}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (!canAddLog) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
            <ArrowLeft color={COLORS.text} size={24} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Add Worklog</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.center}>
          <Text style={styles.emptyTitle}>Access Restricted</Text>
          <Text style={styles.emptyText}>Only Super Admin or Admin can add quick work logs.</Text>
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
        <Text style={styles.headerTitle}>Add Worklog</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.content}>
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>Quick Worklog Entry</Text>
          <Text style={styles.infoSubtitle}>Choose your flow, then log by timing or direct HH:MM.</Text>
        </View>

        {recentProject && recentEmployee ? (
          <TouchableOpacity
            style={styles.recentBtn}
            onPress={() => openWorkLogModal({ project: recentProject, employee: recentEmployee })}
          >
            <Text style={styles.recentBtnText}>Recent: {recentEmployee.name} • {recentProject.name}</Text>
          </TouchableOpacity>
        ) : null}

        <View style={styles.tabRow}>
          <TouchableOpacity
            style={[styles.tabBtn, flowTab === FLOW_EMPLOYEE_FIRST && styles.tabBtnActive]}
            onPress={() => setFlowTab(FLOW_EMPLOYEE_FIRST)}
          >
            <Text style={[styles.tabBtnText, flowTab === FLOW_EMPLOYEE_FIRST && styles.tabBtnTextActive]}>Employee → Project</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabBtn, flowTab === FLOW_PROJECT_FIRST && styles.tabBtnActive]}
            onPress={() => setFlowTab(FLOW_PROJECT_FIRST)}
          >
            <Text style={[styles.tabBtnText, flowTab === FLOW_PROJECT_FIRST && styles.tabBtnTextActive]}>Project → Employee</Text>
          </TouchableOpacity>
        </View>

        {flowTab === FLOW_EMPLOYEE_FIRST ? (
          <>
            <View style={styles.searchBox}>
              <Search color={COLORS.gray} size={18} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search employee..."
                placeholderTextColor={COLORS.gray}
                value={employeeSearchQuery}
                onChangeText={setEmployeeSearchQuery}
              />
            </View>

            <FlatList
              data={filteredEmployees}
              keyExtractor={item => item.quickEmployeeId}
              renderItem={renderEmployeeFirstRow}
              contentContainerStyle={styles.listContent}
              ListEmptyComponent={
                <Text style={styles.emptyText}>
                  {employeeSearchQuery.trim() ? 'No employees found' : 'No employees available'}
                </Text>
              }
            />
          </>
        ) : (
          <>
            <View style={styles.searchBox}>
              <Search color={COLORS.gray} size={18} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search project name or no..."
                placeholderTextColor={COLORS.gray}
                value={projectFirstProjectSearch}
                onChangeText={setProjectFirstProjectSearch}
              />
            </View>

            <FlatList
              data={filteredProjectsProjectFirst}
              keyExtractor={item => item.quickProjectId}
              renderItem={renderProjectFirstProjectRow}
              contentContainerStyle={styles.listContent}
              ListEmptyComponent={
                <Text style={styles.emptyText}>
                  {projectFirstProjectSearch.trim() ? 'No projects found' : 'No projects available'}
                </Text>
              }
            />
          </>
        )}
      </View>

      <Modal transparent visible={showProjectModal} animationType="fade" onRequestClose={() => setShowProjectModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Project</Text>
              <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setShowProjectModal(false)}>
                <X color={COLORS.textLight} size={18} />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalSubtitle}>{selectedEmployee?.name || '-'}</Text>

            {employeeFlowDepartmentOptions.length > 0 ? (
              <FlatList
                horizontal
                data={[{ id: DEPT_ALL, name: 'All Departments' }, ...employeeFlowDepartmentOptions]}
                keyExtractor={item => item.id}
                contentContainerStyle={styles.chipsRow}
                showsHorizontalScrollIndicator={false}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[styles.chip, employeeFlowDepartmentFilter === item.id && styles.chipActive]}
                    onPress={() => setEmployeeFlowDepartmentFilter(item.id)}
                  >
                    <Text style={[styles.chipText, employeeFlowDepartmentFilter === item.id && styles.chipTextActive]}>
                      {item.name}
                    </Text>
                  </TouchableOpacity>
                )}
              />
            ) : null}

            <View style={[styles.searchBox, styles.modalSearch]}>
              <Search color={COLORS.gray} size={18} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search project name or no..."
                placeholderTextColor={COLORS.gray}
                value={projectSearchQuery}
                onChangeText={setProjectSearchQuery}
              />
            </View>

            <FlatList
              data={filteredProjects}
              keyExtractor={item => item.quickProjectId}
              renderItem={({ item, index }) => {
                const dept = getEmployeeDepartmentInProject(item, selectedEmployee?.quickEmployeeId);
                return (
                  <TouchableOpacity
                    style={styles.rowCard}
                    onPress={() => openWorkLogModal({ project: item, employee: selectedEmployee })}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.rowWatermark, index % 2 === 0 ? styles.watermarkBlue : styles.watermarkGreen]}>PROJECT</Text>
                    <View style={styles.iconWrap}>
                      <Briefcase color={COLORS.warning} size={16} />
                    </View>
                    <View style={styles.rowTextWrap}>
                      <Text style={styles.rowTitle}>{item.name}</Text>
                      <Text style={styles.rowSubtitle}>Project No: {item.projectNo || '-'} • Dept: {dept?.name || 'No Department'}</Text>
                    </View>
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={
                <Text style={styles.emptyText}>
                  {projectSearchQuery.trim() ? 'No projects found' : 'No assigned projects for this employee'}
                </Text>
              }
            />
          </View>
        </View>
      </Modal>

      <Modal
        transparent
        visible={showProjectEmployeeModal}
        animationType="fade"
        onRequestClose={() => setShowProjectEmployeeModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Employee</Text>
              <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setShowProjectEmployeeModal(false)}>
                <X color={COLORS.textLight} size={18} />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalSubtitle}>{selectedProject?.name || '-'} • {selectedProject?.projectNo || '-'}</Text>

            {projectFirstDepartmentOptions.length > 0 ? (
              <FlatList
                horizontal
                data={[{ id: DEPT_ALL, name: 'All Departments' }, ...projectFirstDepartmentOptions]}
                keyExtractor={item => item.id}
                contentContainerStyle={styles.chipsRow}
                showsHorizontalScrollIndicator={false}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[styles.chip, projectFirstDepartmentFilter === item.id && styles.chipActive]}
                    onPress={() => setProjectFirstDepartmentFilter(item.id)}
                  >
                    <Text style={[styles.chipText, projectFirstDepartmentFilter === item.id && styles.chipTextActive]}>
                      {item.name}
                    </Text>
                  </TouchableOpacity>
                )}
              />
            ) : null}

            <View style={[styles.searchBox, styles.modalSearch]}>
              <Search color={COLORS.gray} size={18} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search employee..."
                placeholderTextColor={COLORS.gray}
                value={projectFirstEmployeeSearch}
                onChangeText={setProjectFirstEmployeeSearch}
              />
            </View>

            <FlatList
              data={filteredProjectFirstEmployees}
              keyExtractor={item => item.quickEmployeeId}
              renderItem={renderProjectFirstEmployeeRow}
              ListEmptyComponent={
                <Text style={styles.emptyText}>
                  {projectFirstEmployeeSearch.trim() ? 'No employees found' : 'No employees in this filter'}
                </Text>
              }
            />
          </View>
        </View>
      </Modal>

      <Modal
        transparent
        visible={showWorkLogModal}
        animationType="fade"
        onRequestClose={() => setShowWorkLogModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Work Log</Text>
              <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setShowWorkLogModal(false)}>
                <X color={COLORS.textLight} size={18} />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalSubtitle}>
              {selectedEmployee?.name || ''} • {selectedProject?.name || ''}
            </Text>
            <Text style={styles.modalSubtitle}>Project No: {selectedProject?.projectNo || '-'}</Text>
            <Text style={styles.modalSubtitle}>Department: {selectedProjectDepartment?.name || 'No Department'}</Text>

            <TouchableOpacity style={styles.selectButton} onPress={() => setShowDatePicker(true)}>
              <View style={styles.selectLeft}>
                <Calendar color={COLORS.primary} size={16} />
                <Text style={styles.selectText}>Date: {formatDate(logDate)}</Text>
              </View>
              <Text style={styles.selectHint}>Change</Text>
            </TouchableOpacity>

            <Text style={styles.modeLabel}>Choose how to add work log</Text>
            <View style={styles.presetRow}>
              <TouchableOpacity style={styles.presetButton} onPress={() => applyPreset('today_full')}>
                <Text style={styles.presetButtonText}>Today + Full</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.presetButton} onPress={() => applyPreset('half')}>
                <Text style={styles.presetButtonText}>Half Day</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.presetButton} onPress={() => applyPreset('ot2')}>
                <Text style={styles.presetButtonText}>OT 2h</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.radioRow} onPress={() => setLogMode('timings')} activeOpacity={0.8}>
              <View style={[styles.radioOuter, logMode === 'timings' && styles.radioOuterActive]}>
                {logMode === 'timings' ? <View style={styles.radioInner} /> : null}
              </View>
              <Text style={styles.radioText}>Use start and end Timings</Text>
            </TouchableOpacity>

            {logMode === 'timings' ? (
              <View style={styles.timeGrid}>
                <TouchableOpacity style={styles.timeCard} onPress={() => setShowStartPicker(true)}>
                  <Text style={styles.timeLabel}>Start Time</Text>
                  <View style={styles.timeValueRow}>
                    <Clock color={COLORS.primary} size={14} />
                    <Text style={styles.timeValue}>{startTime ? formatTime12(startTime) : '09:00 AM'}</Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity style={styles.timeCard} onPress={() => setShowEndPicker(true)}>
                  <Text style={styles.timeLabel}>End Time</Text>
                  <View style={styles.timeValueRow}>
                    <Clock color={COLORS.primary} size={14} />
                    <Text style={styles.timeValue}>{endTime ? formatTime12(endTime) : '06:00 PM'}</Text>
                  </View>
                </TouchableOpacity>
              </View>
            ) : null}

            <TouchableOpacity style={styles.radioRow} onPress={() => setLogMode('direct')} activeOpacity={0.8}>
              <View style={[styles.radioOuter, logMode === 'direct' && styles.radioOuterActive]}>
                {logMode === 'direct' ? <View style={styles.radioInner} /> : null}
              </View>
              <Text style={styles.radioText}>Add direct Worked Log</Text>
            </TouchableOpacity>

            {logMode === 'direct' ? (
              <View style={styles.durationRow}>
                <TextInput
                  style={styles.durationInput}
                  placeholder="HH"
                  placeholderTextColor="#34D399"
                  keyboardType="number-pad"
                  maxLength={2}
                  value={directHH}
                  onChangeText={setDirectHH}
                />
                <Text style={styles.durationColon}>:</Text>
                <TextInput
                  style={styles.durationInput}
                  placeholder="MM"
                  placeholderTextColor="#34D399"
                  keyboardType="number-pad"
                  maxLength={2}
                  value={directMM}
                  onChangeText={setDirectMM}
                />
              </View>
            ) : null}

            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowWorkLogModal(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={() => saveWorkLog(false)}>
                <Text style={styles.saveBtnText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {showDatePicker && (
        <DateTimePicker
          mode="date"
          value={logDate}
          onChange={(_, selectedDate) => {
            setShowDatePicker(false);
            if (selectedDate) setLogDate(selectedDate);
          }}
        />
      )}

      {showStartPicker && (
        <DateTimePicker
          mode="time"
          value={startTime || new Date()}
          onChange={(_, selectedDate) => {
            setShowStartPicker(false);
            if (selectedDate) setStartTime(selectedDate);
          }}
        />
      )}

      {showEndPicker && (
        <DateTimePicker
          mode="time"
          value={endTime || new Date()}
          onChange={(_, selectedDate) => {
            setShowEndPicker(false);
            if (selectedDate) setEndTime(selectedDate);
          }}
        />
      )}
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
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  infoCard: {
    borderRadius: 14,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    padding: 14,
    marginBottom: 12,
  },
  infoTitle: { color: COLORS.text, fontSize: 16, fontWeight: '700' },
  infoSubtitle: { marginTop: 4, color: COLORS.textLight, fontSize: 12, lineHeight: 18 },
  recentBtn: {
    height: 38,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  recentBtnText: { color: '#1D4ED8', fontSize: 12, fontWeight: '700' },
  tabRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  tabBtn: {
    flex: 1,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabBtnActive: { borderColor: '#93C5FD', backgroundColor: '#EFF6FF' },
  tabBtnText: { color: COLORS.textLight, fontSize: 12, fontWeight: '700' },
  tabBtnTextActive: { color: '#1D4ED8' },
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
  searchInput: { flex: 1, marginLeft: 8, color: COLORS.text, fontSize: 14 },
  listContent: { paddingBottom: 20 },
  rowCard: {
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
  rowWatermark: {
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
  iconWrap: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  rowTextWrap: { flex: 1 },
  rowTitle: { color: COLORS.text, fontSize: 15, fontWeight: '600' },
  rowSubtitle: { marginTop: 2, color: COLORS.textLight, fontSize: 12 },
  emptyText: { textAlign: 'center', marginTop: 20, color: COLORS.textLight },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: { width: '100%', maxHeight: '82%', backgroundColor: COLORS.white, borderRadius: 14, padding: 16 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  modalCloseBtn: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  modalTitle: { fontSize: 17, fontWeight: '700', color: COLORS.text, marginBottom: 6 },
  modalSubtitle: { color: COLORS.textLight, fontSize: 12, marginBottom: 8 },
  modalSearch: { marginBottom: 10 },
  chipsRow: { paddingBottom: 8 },
  chip: {
    height: 30,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  chipActive: { borderColor: '#93C5FD', backgroundColor: '#EFF6FF' },
  chipText: { color: COLORS.textLight, fontSize: 12, fontWeight: '700' },
  chipTextActive: { color: '#1D4ED8' },
  selectButton: {
    height: 44,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectLeft: { flexDirection: 'row', alignItems: 'center' },
  selectText: { color: COLORS.text, fontSize: 14, marginLeft: 8 },
  selectHint: { color: COLORS.primary, fontSize: 13, fontWeight: '600' },
  modeLabel: { marginBottom: 10, color: COLORS.text, fontSize: 13, fontWeight: '600' },
  presetRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  presetButton: {
    flex: 1,
    height: 34,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  presetButtonText: { color: '#1D4ED8', fontSize: 12, fontWeight: '700' },
  radioRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  radioOuter: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: COLORS.gray,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOuterActive: { borderColor: COLORS.primary },
  radioInner: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.primary },
  radioText: { marginLeft: 8, color: COLORS.text, fontSize: 14, fontWeight: '600' },
  timeGrid: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  timeCard: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    padding: 10,
    backgroundColor: '#F8FAFC',
  },
  timeLabel: { color: COLORS.textLight, fontSize: 12, fontWeight: '600' },
  timeValueRow: { marginTop: 4, flexDirection: 'row', alignItems: 'center' },
  timeValue: { marginLeft: 6, color: COLORS.text, fontSize: 14, fontWeight: '700' },
  durationRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  durationInput: {
    width: 88,
    height: 58,
    borderWidth: 2,
    borderColor: '#86EFAC',
    borderRadius: 10,
    textAlign: 'center',
    fontSize: 28,
    fontWeight: '700',
    color: '#16A34A',
    backgroundColor: '#F0FDF4',
  },
  durationColon: { marginHorizontal: 12, fontSize: 32, fontWeight: '700', color: '#16A34A' },
  modalButtons: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 6 },
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

export default QuickAddWorkLogScreen;
