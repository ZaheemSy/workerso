import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  Modal,
  ActivityIndicator,
  Alert,
  Platform,
  PermissionsAndroid,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import {
  ArrowLeft,
  Search,
  Filter,
  Download,
  FileSpreadsheet,
  ChevronDown,
  Check,
  CheckSquare,
  Square,
  X,
} from 'lucide-react-native';
import * as XLSX from 'xlsx';
import RNFS from 'react-native-fs';
import { COLORS } from '../constants/colors';
import { ROLES } from '../constants/roles';
import { useAuth } from '../contexts/AuthContext';
import {
  getQuickEmployeesByOrg,
  getQuickProjectsByOrg,
  getQuickWorkLogsByOrg,
} from '../services/storageService';

const NO_DEPARTMENT_FILTER = '__no_department__';

const QuickReportScreen = ({ navigation }) => {
  const { session } = useAuth();
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [projects, setProjects] = useState([]);
  const [workLogs, setWorkLogs] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState([]);
  const [draftEmployeeIds, setDraftEmployeeIds] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [selectedDepartmentIds, setSelectedDepartmentIds] = useState([]);
  const [draftDepartmentIds, setDraftDepartmentIds] = useState([]);
  const [showEmployeeModal, setShowEmployeeModal] = useState(false);
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [showDepartmentModal, setShowDepartmentModal] = useState(false);
  const [employeeFilterQuery, setEmployeeFilterQuery] = useState('');
  const [projectFilterQuery, setProjectFilterQuery] = useState('');
  const [departmentFilterQuery, setDepartmentFilterQuery] = useState('');
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [fromDate, setFromDate] = useState(null);
  const [toDate, setToDate] = useState(new Date());
  const [showFromDatePicker, setShowFromDatePicker] = useState(false);
  const [showToDatePicker, setShowToDatePicker] = useState(false);

  const canAccess = session?.role === ROLES.SUPER_ADMIN || session?.role === ROLES.ADMIN;

  const loadData = useCallback(async () => {
    if (!session?.orgId) return;
    setLoading(true);
    try {
      const [employeeList, projectList, logs] = await Promise.all([
        getQuickEmployeesByOrg(session.orgId),
        getQuickProjectsByOrg(session.orgId),
        getQuickWorkLogsByOrg(session.orgId),
      ]);
      setEmployees(employeeList.sort((a, b) => a.name.localeCompare(b.name)));
      setProjects(projectList.sort((a, b) => a.name.localeCompare(b.name)));
      setWorkLogs(logs.sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
    } catch (error) {
      Alert.alert('Error', 'Failed to load quick report data');
    } finally {
      setLoading(false);
    }
  }, [session?.orgId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const employeeMap = useMemo(() => {
    const map = {};
    employees.forEach(item => {
      map[item.quickEmployeeId] = item;
    });
    return map;
  }, [employees]);

  const projectMap = useMemo(() => {
    const map = {};
    projects.forEach(item => {
      map[item.quickProjectId] = item;
    });
    return map;
  }, [projects]);

  const reportRows = useMemo(() => {
    let rows = workLogs
      .filter(log => (selectedEmployeeIds.length > 0 ? selectedEmployeeIds.includes(log.quickEmployeeId) : true))
      .filter(log => (selectedProjectId ? log.quickProjectId === selectedProjectId : true))
      .filter(log => {
        const raw = log.date || '';
        const date = raw ? new Date(raw) : null;
        if (!date || Number.isNaN(date.getTime())) return false;

        if (fromDate) {
          const from = new Date(fromDate);
          from.setHours(0, 0, 0, 0);
          if (date < from) return false;
        }

        if (toDate) {
          const to = new Date(toDate);
          to.setHours(23, 59, 59, 999);
          if (date > to) return false;
        }

        return true;
      })
      .map(log => {
        const project = projectMap[log.quickProjectId];
        const derivedDepartment = (project?.departments || []).find(item =>
          (item.employeeIds || []).includes(log.quickEmployeeId)
        );
        return {
          date: log.date || '-',
          loggedOn: log.createdAt
            ? new Date(log.createdAt).toLocaleString([], {
                year: 'numeric',
                month: 'short',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                hour12: true,
              })
            : '-',
          employeeName: employeeMap[log.quickEmployeeId]?.name || log.employeeName || 'Unknown',
          projectName: project?.name || log.projectName || 'Unknown',
          projectNo: project?.projectNo || log.projectNo || '-',
          quickDepartmentId: log.quickDepartmentId || derivedDepartment?.quickDepartmentId || '',
          departmentName: log.departmentName || derivedDepartment?.name || 'No Department',
          workedLogHHMM: log.workLogHHMM || '00:00',
          startTime: log.startTime || '-',
          endTime: log.endTime || '-',
        };
      });

    if (selectedDepartmentIds.length > 0) {
      rows = rows.filter(row =>
        selectedDepartmentIds.includes(NO_DEPARTMENT_FILTER)
          ? !row.quickDepartmentId || selectedDepartmentIds.includes(row.quickDepartmentId)
          : selectedDepartmentIds.includes(row.quickDepartmentId)
      );
    }

    if (!searchQuery.trim()) return rows;
    const query = searchQuery.toLowerCase();
    return rows.filter(row =>
      Object.values(row).some(value => String(value).toLowerCase().includes(query))
    );
  }, [employeeMap, fromDate, projectMap, searchQuery, selectedDepartmentIds, selectedEmployeeIds, selectedProjectId, toDate, workLogs]);

  const selectedEmployeeName = useMemo(() => {
    if (selectedEmployeeIds.length === 0) return 'All Employees';
    if (selectedEmployeeIds.length === 1) return employeeMap[selectedEmployeeIds[0]]?.name || '1 Employee';
    return `${selectedEmployeeIds.length} Employees`;
  }, [employeeMap, selectedEmployeeIds]);
  const selectedProjectName = selectedProjectId ? projectMap[selectedProjectId]?.name : 'All Projects';
  const departmentOptions = useMemo(() => {
    const sourceProjects = selectedProjectId
      ? projects.filter(item => item.quickProjectId === selectedProjectId)
      : projects;
    const unique = {};
    sourceProjects.forEach(project => {
      (project.departments || []).forEach(department => {
        if (!department.quickDepartmentId) return;
        unique[department.quickDepartmentId] = {
          quickDepartmentId: department.quickDepartmentId,
          name: department.name,
          projectName: project.name,
        };
      });
    });
    return Object.values(unique).sort((a, b) => a.name.localeCompare(b.name));
  }, [projects, selectedProjectId]);
  const selectedDepartmentName = useMemo(() => {
    if (selectedDepartmentIds.length === 0) return 'All Departments';
    if (selectedDepartmentIds.length === 1 && selectedDepartmentIds[0] === NO_DEPARTMENT_FILTER) {
      return 'No Department';
    }
    if (selectedDepartmentIds.length === 1) {
      const department = departmentOptions.find(item => item.quickDepartmentId === selectedDepartmentIds[0]);
      if (!department) return '1 Department';
      return selectedProjectId ? department.name : `${department.name} (${department.projectName})`;
    }
    return `${selectedDepartmentIds.length} Departments`;
  }, [departmentOptions, selectedDepartmentIds, selectedProjectId]);
  const filteredEmployees = useMemo(() => {
    const sourceEmployees = selectedProjectId
      ? employees.filter(emp => (projectMap[selectedProjectId]?.employeeIds || []).includes(emp.quickEmployeeId))
      : employees;
    if (!employeeFilterQuery.trim()) return sourceEmployees;
    const query = employeeFilterQuery.toLowerCase();
    return sourceEmployees.filter(item => item.name?.toLowerCase().includes(query));
  }, [employeeFilterQuery, employees, projectMap, selectedProjectId]);
  const filteredProjects = useMemo(() => {
    if (!projectFilterQuery.trim()) return projects;
    const query = projectFilterQuery.toLowerCase();
    return projects.filter(
      item =>
        item.name?.toLowerCase().includes(query) ||
        String(item.projectNo || '').toLowerCase().includes(query)
    );
  }, [projectFilterQuery, projects]);
  const filteredDepartments = useMemo(() => {
    if (!departmentFilterQuery.trim()) return departmentOptions;
    const query = departmentFilterQuery.toLowerCase();
    return departmentOptions.filter(
      item =>
        item.name?.toLowerCase().includes(query) ||
        item.projectName?.toLowerCase().includes(query)
    );
  }, [departmentFilterQuery, departmentOptions]);

  const toggleEmployeeSelection = quickEmployeeId => {
    setDraftEmployeeIds(prev =>
      prev.includes(quickEmployeeId)
        ? prev.filter(id => id !== quickEmployeeId)
        : [...prev, quickEmployeeId]
    );
  };

  const toggleDepartmentSelection = departmentId => {
    setDraftDepartmentIds(prev =>
      prev.includes(departmentId)
        ? prev.filter(id => id !== departmentId)
        : [...prev, departmentId]
    );
  };

  const openEmployeeFilterModal = () => {
    setDraftEmployeeIds(selectedEmployeeIds);
    setShowEmployeeModal(true);
  };

  const openDepartmentFilterModal = () => {
    setDraftDepartmentIds(selectedDepartmentIds);
    setShowDepartmentModal(true);
  };
  const formatDate = date => {
    if (!date) return 'Select date';
    return date.toISOString().split('T')[0];
  };

  const summary = useMemo(() => {
    const employeesSet = new Set();
    const projectsSet = new Set();
    reportRows.forEach(row => {
      employeesSet.add(row.employeeName);
      projectsSet.add(row.projectName);
    });
    return {
      totalLogs: reportRows.length,
      totalEmployees: employeesSet.size,
      totalProjects: projectsSet.size,
    };
  }, [reportRows]);

  const requestStoragePermission = async () => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
          {
            title: 'Storage Permission',
            message: 'App needs access to storage to save files',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          }
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } catch (err) {
        return false;
      }
    }
    return true;
  };

  const getFileName = () => {
    const employeePart = selectedEmployeeIds.length > 0 ? selectedEmployeeName.replace(/ /g, '_') : 'all_employees';
    const projectPart = selectedProjectId ? selectedProjectName.replace(/ /g, '_') : 'all_projects';
    return `quick_report_${employeePart}_${projectPart}_${Date.now()}`;
  };

  const downloadExcel = async () => {
    setShowDownloadModal(false);
    if (reportRows.length === 0) {
      Alert.alert('No Data', 'There is no data to export');
      return;
    }

    try {
      setDownloading(true);
      const hasPermission = await requestStoragePermission();
      if (!hasPermission) {
        Alert.alert('Permission Denied', 'Storage permission is required to save files');
        return;
      }

      const headers = [
        'Work Date',
        'Logged On',
        'Employee Name',
        'Project Name',
        'Project No',
        'Department',
        'Worked Log (HH:MM)',
        'Start Time',
        'End Time',
      ];
      const excelData = [headers];
      reportRows.forEach(row => {
        excelData.push([
          row.date,
          row.loggedOn,
          row.employeeName,
          row.projectName,
          row.projectNo,
          row.departmentName,
          row.workedLogHHMM,
          row.startTime,
          row.endTime,
        ]);
      });

      const ws = XLSX.utils.aoa_to_sheet(excelData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Quick Report');
      const wbout = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
      const filename = `${getFileName()}.xlsx`;
      const downloadsPath = Platform.OS === 'android' ? RNFS.DownloadDirectoryPath : RNFS.DocumentDirectoryPath;
      const path = `${downloadsPath}/${filename}`;
      await RNFS.writeFile(path, wbout, 'base64');
      Alert.alert('Success', `Report saved to:\n${path}`);
    } catch (error) {
      Alert.alert('Error', `Failed to export report: ${error.message}`);
    } finally {
      setDownloading(false);
    }
  };

  const downloadPdfHtml = async () => {
    setShowDownloadModal(false);
    if (reportRows.length === 0) {
      Alert.alert('No Data', 'There is no data to export');
      return;
    }

    try {
      setDownloading(true);
      const hasPermission = await requestStoragePermission();
      if (!hasPermission) {
        Alert.alert('Permission Denied', 'Storage permission is required to save files');
        return;
      }

      const headers = [
        'Work Date',
        'Logged On',
        'Employee Name',
        'Project Name',
        'Project No',
        'Department',
        'Worked Log (HH:MM)',
        'Start Time',
        'End Time',
      ];
      const htmlContent = `
        <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; padding: 20px; }
              h1 { text-align: center; color: #111827; }
              p { text-align: center; color: #6b7280; }
              table { width: 100%; border-collapse: collapse; margin-top: 20px; }
              th { background-color: #2563eb; color: white; padding: 10px; text-align: left; }
              td { border-bottom: 1px solid #e5e7eb; padding: 10px; }
              tr:nth-child(even) { background-color: #f9fafb; }
            </style>
          </head>
          <body>
            <h1>Quick Work Log Report</h1>
            <p>${selectedEmployeeName} • ${selectedProjectName} • ${reportRows.length} record(s)</p>
            <table>
              <thead>
                <tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>
              </thead>
              <tbody>
                ${reportRows
                  .map(
                    row => `
                      <tr>
                        <td>${row.date}</td>
                        <td>${row.loggedOn}</td>
                        <td>${row.employeeName}</td>
                        <td>${row.projectName}</td>
                        <td>${row.projectNo}</td>
                        <td>${row.departmentName}</td>
                        <td>${row.workedLogHHMM}</td>
                        <td>${row.startTime}</td>
                        <td>${row.endTime}</td>
                      </tr>
                    `
                  )
                  .join('')}
              </tbody>
            </table>
          </body>
        </html>
      `;

      const filename = `${getFileName()}.html`;
      const downloadsPath = Platform.OS === 'android' ? RNFS.DownloadDirectoryPath : RNFS.DocumentDirectoryPath;
      const path = `${downloadsPath}/${filename}`;
      await RNFS.writeFile(path, htmlContent, 'utf8');
      Alert.alert('Success', `HTML report saved to:\n${path}\n\nOpen in browser and use Print > Save as PDF.`);
    } catch (error) {
      Alert.alert('Error', `Failed to export report: ${error.message}`);
    } finally {
      setDownloading(false);
    }
  };

  const renderRow = ({ item, index }) => (
    <View style={styles.rowCard}>
      <Text style={[styles.rowWatermark, index % 2 === 0 ? styles.watermarkGreen : styles.watermarkBlue]}>
        {item.workedLogHHMM}
      </Text>
      <Text style={styles.rowPrimary}>{item.employeeName}</Text>
      <Text style={styles.rowSecondary}>
        {item.projectName} • Project No: {item.projectNo}
      </Text>
      <Text style={styles.rowSecondary}>Department: {item.departmentName}</Text>
      <View style={styles.metaRow}>
        <Text style={styles.metaText}>Work Date: {item.date}</Text>
        <Text style={styles.metaText}>Log: {item.workedLogHHMM}</Text>
      </View>
      <View style={styles.metaRow}>
        <Text style={styles.metaText}>Logged On: {item.loggedOn}</Text>
      </View>
      <View style={styles.metaRow}>
        <Text style={styles.metaText}>Start: {item.startTime}</Text>
        <Text style={styles.metaText}>End: {item.endTime}</Text>
      </View>
    </View>
  );

  if (!canAccess) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
            <ArrowLeft color={COLORS.text} size={24} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Quick Report</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.center}>
          <Text style={styles.emptyTitle}>Access Restricted</Text>
          <Text style={styles.emptyText}>Only Super Admin or Admin can view quick reports.</Text>
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
        <Text style={styles.headerTitle}>Quick Report</Text>
        <TouchableOpacity
          onPress={() => setShowDownloadModal(true)}
          style={styles.headerButton}
          disabled={loading || downloading}
        >
          <Download color={loading || downloading ? COLORS.gray : COLORS.primary} size={20} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading report data...</Text>
        </View>
      ) : (
        <View style={styles.content}>
          <View style={styles.infoCard}>
            <FileSpreadsheet color={COLORS.primary} size={20} />
            <View style={styles.infoTextWrap}>
              <Text style={styles.infoTitle}>Quick Work Log Report</Text>
              <Text style={styles.infoSubtitle}>{reportRows.length} matching record(s)</Text>
            </View>
          </View>

          <View style={styles.searchBox}>
            <Search color={COLORS.gray} size={18} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search employee, project, department, date..."
              placeholderTextColor={COLORS.gray}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

          <View style={styles.filterGrid}>
            <TouchableOpacity style={[styles.filterBtn, styles.filterBtnThird]} onPress={openEmployeeFilterModal}>
              <Filter color={COLORS.primary} size={14} />
              <Text style={styles.filterBtnText} numberOfLines={1}>{selectedEmployeeName || 'All Employees'}</Text>
              <ChevronDown color={COLORS.gray} size={14} />
            </TouchableOpacity>

            <TouchableOpacity style={[styles.filterBtn, styles.filterBtnThird]} onPress={() => setShowProjectModal(true)}>
              <Filter color={COLORS.primary} size={14} />
              <Text style={styles.filterBtnText} numberOfLines={1}>{selectedProjectName || 'All Projects'}</Text>
              <ChevronDown color={COLORS.gray} size={14} />
            </TouchableOpacity>

            <TouchableOpacity style={[styles.filterBtn, styles.filterBtnThird]} onPress={openDepartmentFilterModal}>
              <Filter color={COLORS.primary} size={14} />
              <Text style={styles.filterBtnText} numberOfLines={1}>{selectedDepartmentName}</Text>
              <ChevronDown color={COLORS.gray} size={14} />
            </TouchableOpacity>
          </View>

          <View style={styles.selectedFiltersRow}>
            {selectedEmployeeIds.length > 0 ? (
              <View style={styles.selectedFilterChip}>
                <Text style={styles.selectedFilterChipText}>{selectedEmployeeIds.length} Employee(s)</Text>
                <TouchableOpacity onPress={() => setSelectedEmployeeIds([])}>
                  <X color="#4338CA" size={14} />
                </TouchableOpacity>
              </View>
            ) : null}
            {selectedDepartmentIds.length > 0 ? (
              <View style={styles.selectedFilterChip}>
                <Text style={styles.selectedFilterChipText}>{selectedDepartmentIds.length} Department(s)</Text>
                <TouchableOpacity onPress={() => setSelectedDepartmentIds([])}>
                  <X color="#4338CA" size={14} />
                </TouchableOpacity>
              </View>
            ) : null}
          </View>

          <View style={styles.filtersRow}>
            <TouchableOpacity style={styles.filterBtn} onPress={() => setShowFromDatePicker(true)}>
              <Filter color={COLORS.primary} size={14} />
              <Text style={styles.filterBtnText} numberOfLines={1}>
                From: {fromDate ? formatDate(fromDate) : 'Any'}
              </Text>
              <ChevronDown color={COLORS.gray} size={14} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.filterBtn} onPress={() => setShowToDatePicker(true)}>
              <Filter color={COLORS.primary} size={14} />
              <Text style={styles.filterBtnText} numberOfLines={1}>
                To: {formatDate(toDate)}
              </Text>
              <ChevronDown color={COLORS.gray} size={14} />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.clearFiltersBtn}
            onPress={() => {
              setSelectedEmployeeIds([]);
              setSelectedProjectId('');
              setSelectedDepartmentIds([]);
              setSearchQuery('');
              setFromDate(null);
              setToDate(new Date());
            }}
          >
            <Text style={styles.clearFiltersText}>Clear Filters</Text>
          </TouchableOpacity>

          <View style={styles.summaryRow}>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryValue}>{summary.totalLogs}</Text>
              <Text style={styles.summaryLabel}>Logs</Text>
            </View>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryValue}>{summary.totalEmployees}</Text>
              <Text style={styles.summaryLabel}>Employees</Text>
            </View>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryValue}>{summary.totalProjects}</Text>
              <Text style={styles.summaryLabel}>Projects</Text>
            </View>
          </View>

          <FlatList
            data={reportRows}
            keyExtractor={(_, index) => `report_${index}`}
            renderItem={renderRow}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <View style={styles.center}>
                <Text style={styles.emptyTitle}>No records found</Text>
                <Text style={styles.emptyText}>Try changing filters or search terms.</Text>
              </View>
            }
          />
        </View>
      )}

      <Modal
        transparent
        visible={showEmployeeModal}
        animationType="fade"
        onRequestClose={() => {
          setEmployeeFilterQuery('');
          setDraftEmployeeIds(selectedEmployeeIds);
          setShowEmployeeModal(false);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filter by Employee</Text>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => {
                  setEmployeeFilterQuery('');
                  setDraftEmployeeIds(selectedEmployeeIds);
                  setShowEmployeeModal(false);
                }}
              >
                <X color={COLORS.textLight} size={18} />
              </TouchableOpacity>
            </View>
            <View style={styles.modalSearchBox}>
              <Search color={COLORS.gray} size={18} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search employee..."
                placeholderTextColor={COLORS.gray}
                value={employeeFilterQuery}
                onChangeText={setEmployeeFilterQuery}
              />
            </View>
            <TouchableOpacity
              style={styles.modalItem}
              onPress={() => {
                setDraftEmployeeIds([]);
              }}
            >
              <Text style={styles.modalItemText}>All Employees</Text>
              {draftEmployeeIds.length === 0 ? <Check color={COLORS.primary} size={16} /> : null}
            </TouchableOpacity>
            {filteredEmployees.map(item => (
              <TouchableOpacity
                key={item.quickEmployeeId}
                style={styles.modalItem}
                onPress={() => {
                  toggleEmployeeSelection(item.quickEmployeeId);
                }}
              >
                <Text style={styles.modalItemText}>{item.name}</Text>
                {draftEmployeeIds.includes(item.quickEmployeeId) ? (
                  <CheckSquare color={COLORS.primary} size={18} />
                ) : (
                  <Square color={COLORS.gray} size={18} />
                )}
              </TouchableOpacity>
            ))}
            {filteredEmployees.length === 0 ? <Text style={styles.modalEmptyText}>No employees found</Text> : null}
            <View style={styles.modalButtonsRow}>
              <TouchableOpacity
                style={styles.modalGhostBtn}
                onPress={() => setDraftEmployeeIds([])}
              >
                <Text style={styles.modalGhostBtnText}>Clear</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalPrimaryBtn}
                onPress={() => {
                  setSelectedEmployeeIds(draftEmployeeIds);
                  setEmployeeFilterQuery('');
                  setShowEmployeeModal(false);
                }}
              >
                <Text style={styles.modalPrimaryBtnText}>Apply</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        transparent
        visible={showProjectModal}
        animationType="fade"
        onRequestClose={() => {
          setProjectFilterQuery('');
          setShowProjectModal(false);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filter by Project</Text>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => {
                  setProjectFilterQuery('');
                  setShowProjectModal(false);
                }}
              >
                <X color={COLORS.textLight} size={18} />
              </TouchableOpacity>
            </View>
            <View style={styles.modalSearchBox}>
              <Search color={COLORS.gray} size={18} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search project name or no..."
                placeholderTextColor={COLORS.gray}
                value={projectFilterQuery}
                onChangeText={setProjectFilterQuery}
              />
            </View>
            <TouchableOpacity
              style={styles.modalItem}
              onPress={() => {
                setSelectedProjectId('');
                setSelectedDepartmentIds([]);
                setSelectedEmployeeIds([]);
                setProjectFilterQuery('');
                setShowProjectModal(false);
              }}
            >
              <Text style={styles.modalItemText}>All Projects</Text>
              {!selectedProjectId ? <Check color={COLORS.primary} size={16} /> : null}
            </TouchableOpacity>
            {filteredProjects.map(item => (
              <TouchableOpacity
                key={item.quickProjectId}
                style={styles.modalItem}
                onPress={() => {
                  setSelectedProjectId(item.quickProjectId);
                  setSelectedDepartmentIds([]);
                  const projectEmployeeSet = new Set(item.employeeIds || []);
                  setSelectedEmployeeIds(prev => prev.filter(id => projectEmployeeSet.has(id)));
                  setProjectFilterQuery('');
                  setShowProjectModal(false);
                }}
              >
                <Text style={styles.modalItemText}>
                  {item.name} ({item.projectNo || '-'})
                </Text>
                {selectedProjectId === item.quickProjectId ? <Check color={COLORS.primary} size={16} /> : null}
              </TouchableOpacity>
            ))}
            {filteredProjects.length === 0 ? <Text style={styles.modalEmptyText}>No projects found</Text> : null}
          </View>
        </View>
      </Modal>

      <Modal
        transparent
        visible={showDepartmentModal}
        animationType="fade"
        onRequestClose={() => {
          setDepartmentFilterQuery('');
          setDraftDepartmentIds(selectedDepartmentIds);
          setShowDepartmentModal(false);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filter by Department</Text>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => {
                  setDepartmentFilterQuery('');
                  setDraftDepartmentIds(selectedDepartmentIds);
                  setShowDepartmentModal(false);
                }}
              >
                <X color={COLORS.textLight} size={18} />
              </TouchableOpacity>
            </View>
            <View style={styles.modalSearchBox}>
              <Search color={COLORS.gray} size={18} />
              <TextInput
                style={styles.searchInput}
                placeholder={selectedProjectId ? 'Search department...' : 'Search department or project...'}
                placeholderTextColor={COLORS.gray}
                value={departmentFilterQuery}
                onChangeText={setDepartmentFilterQuery}
              />
            </View>
            <TouchableOpacity
              style={styles.modalItem}
              onPress={() => {
                setDraftDepartmentIds([]);
              }}
            >
              <Text style={styles.modalItemText}>All Departments</Text>
              {draftDepartmentIds.length === 0 ? <Check color={COLORS.primary} size={16} /> : null}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.modalItem}
              onPress={() => {
                toggleDepartmentSelection(NO_DEPARTMENT_FILTER);
              }}
            >
              <Text style={styles.modalItemText}>No Department</Text>
              {draftDepartmentIds.includes(NO_DEPARTMENT_FILTER) ? (
                <CheckSquare color={COLORS.primary} size={18} />
              ) : (
                <Square color={COLORS.gray} size={18} />
              )}
            </TouchableOpacity>
            {filteredDepartments.map(item => (
              <TouchableOpacity
                key={item.quickDepartmentId}
                style={styles.modalItem}
                onPress={() => {
                  toggleDepartmentSelection(item.quickDepartmentId);
                }}
              >
                <Text style={styles.modalItemText}>
                  {selectedProjectId ? item.name : `${item.name} (${item.projectName})`}
                </Text>
                {draftDepartmentIds.includes(item.quickDepartmentId) ? (
                  <CheckSquare color={COLORS.primary} size={18} />
                ) : (
                  <Square color={COLORS.gray} size={18} />
                )}
              </TouchableOpacity>
            ))}
            {filteredDepartments.length === 0 ? <Text style={styles.modalEmptyText}>No departments found</Text> : null}
            <View style={styles.modalButtonsRow}>
              <TouchableOpacity
                style={styles.modalGhostBtn}
                onPress={() => setDraftDepartmentIds([])}
              >
                <Text style={styles.modalGhostBtnText}>Clear</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalPrimaryBtn}
                onPress={() => {
                  setSelectedDepartmentIds(draftDepartmentIds);
                  setDepartmentFilterQuery('');
                  setShowDepartmentModal(false);
                }}
              >
                <Text style={styles.modalPrimaryBtnText}>Apply</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal transparent visible={showDownloadModal} animationType="fade" onRequestClose={() => setShowDownloadModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.downloadModalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Download Report</Text>
              <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setShowDownloadModal(false)}>
                <X color={COLORS.textLight} size={18} />
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={styles.downloadOption} onPress={downloadExcel}>
              <Text style={styles.downloadOptionText}>Download as Excel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.downloadOption} onPress={downloadPdfHtml}>
              <Text style={styles.downloadOptionText}>Download as HTML (Print PDF)</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelDownload} onPress={() => setShowDownloadModal(false)}>
              <Text style={styles.cancelDownloadText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {showFromDatePicker && (
        <DateTimePicker
          mode="date"
          value={fromDate || new Date()}
          onChange={(_, selectedDate) => {
            setShowFromDatePicker(false);
            if (selectedDate) setFromDate(selectedDate);
          }}
        />
      )}

      {showToDatePicker && (
        <DateTimePicker
          mode="date"
          value={toDate || new Date()}
          onChange={(_, selectedDate) => {
            setShowToDatePicker(false);
            if (selectedDate) setToDate(selectedDate);
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
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  loadingText: { marginTop: 10, color: COLORS.textLight },
  infoCard: {
    borderRadius: 14,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoTextWrap: { marginLeft: 10 },
  infoTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  infoSubtitle: { marginTop: 2, color: COLORS.textLight, fontSize: 12 },
  searchBox: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    backgroundColor: COLORS.white,
    height: 44,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchInput: { flex: 1, marginLeft: 8, color: COLORS.text, fontSize: 14 },
  filtersRow: {
    marginTop: 10,
    flexDirection: 'row',
    gap: 10,
  },
  filterGrid: {
    marginTop: 10,
    flexDirection: 'row',
    gap: 8,
  },
  filterBtn: {
    flex: 1,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  filterBtnThird: {
    flex: 0,
    width: '31%',
    minWidth: 98,
  },
  filterBtnText: {
    flex: 1,
    marginHorizontal: 6,
    color: COLORS.text,
    fontSize: 12,
    fontWeight: '600',
  },
  selectedFiltersRow: {
    marginTop: 8,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  selectedFilterChip: {
    height: 30,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#C7D2FE',
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  selectedFilterChipText: {
    color: '#4338CA',
    fontSize: 12,
    fontWeight: '700',
  },
  listContent: { paddingTop: 12, paddingBottom: 20 },
  clearFiltersBtn: {
    marginTop: 8,
    alignSelf: 'flex-end',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#EEF2FF',
  },
  clearFiltersText: {
    color: '#3730A3',
    fontSize: 12,
    fontWeight: '700',
  },
  summaryRow: {
    marginTop: 10,
    flexDirection: 'row',
    gap: 8,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    height: 58,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryValue: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '800',
    lineHeight: 22,
  },
  summaryLabel: {
    marginTop: 2,
    color: COLORS.textLight,
    fontSize: 11,
    fontWeight: '600',
  },
  rowCard: {
    overflow: 'hidden',
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  rowPrimary: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  rowSecondary: { marginTop: 2, fontSize: 13, color: COLORS.textLight },
  rowWatermark: {
    position: 'absolute',
    right: 10,
    top: 8,
    fontSize: 36,
    fontWeight: '800',
    opacity: 0.12,
    letterSpacing: 1,
  },
  watermarkGreen: { color: '#10B981' },
  watermarkBlue: { color: '#2563EB' },
  metaRow: { marginTop: 6, flexDirection: 'row', justifyContent: 'space-between' },
  metaText: { fontSize: 12, color: COLORS.darkGray },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  emptyText: { marginTop: 6, textAlign: 'center', color: COLORS.textLight },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxHeight: '70%',
    backgroundColor: COLORS.white,
    borderRadius: 14,
    padding: 16,
  },
  downloadModalCard: {
    width: '100%',
    backgroundColor: COLORS.white,
    borderRadius: 14,
    padding: 16,
  },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  modalCloseBtn: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  modalTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text, marginBottom: 10 },
  modalSearchBox: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    backgroundColor: COLORS.white,
    height: 42,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalItem: {
    height: 42,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalItemText: { color: COLORS.text, fontSize: 14 },
  modalButtonsRow: {
    marginTop: 10,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  modalGhostBtn: {
    height: 36,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalGhostBtnText: {
    color: COLORS.textLight,
    fontSize: 13,
    fontWeight: '700',
  },
  modalPrimaryBtn: {
    height: 36,
    borderRadius: 8,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalPrimaryBtnText: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: '700',
  },
  modalEmptyText: {
    marginTop: 10,
    textAlign: 'center',
    color: COLORS.textLight,
    fontSize: 13,
  },
  downloadOption: {
    height: 42,
    borderRadius: 10,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  downloadOptionText: { color: '#3730A3', fontWeight: '700' },
  cancelDownload: {
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  cancelDownloadText: { color: COLORS.textLight, fontWeight: '600' },
});

export default QuickReportScreen;
