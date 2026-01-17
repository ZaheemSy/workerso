import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Platform,
  Modal,
  TextInput,
  PermissionsAndroid,
} from 'react-native';
import {
  X,
  Download,
  FileSpreadsheet,
  FileText,
  Search,
  Filter,
} from 'lucide-react-native';
import { COLORS } from '../constants/colors';
import { useAuth } from '../contexts/AuthContext';
import { ROLES } from '../constants/roles';
import {
  getUsersByOrg,
  getAttendanceByOrg,
  getWorkLogsByOrg,
  getProjectsByOrg,
} from '../services/storageService';
import RNFS from 'react-native-fs';
import * as XLSX from 'xlsx';
import DateTimePicker from '@react-native-community/datetimepicker';

const ReportPreviewScreen = ({ navigation, route }) => {
  const { reportType, reportOption, employee, project } = route.params;
  const { session } = useAuth();
  const [reportData, setReportData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [showFormatModal, setShowFormatModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);

  // Filter states
  const [filterEmployee, setFilterEmployee] = useState(null);
  const [filterFromDate, setFilterFromDate] = useState(null);
  const [filterToDate, setFilterToDate] = useState(new Date());
  const [showFromDatePicker, setShowFromDatePicker] = useState(false);
  const [showToDatePicker, setShowToDatePicker] = useState(false);
  const [showEmployeeSelectModal, setShowEmployeeSelectModal] = useState(false);
  const [allEmployees, setAllEmployees] = useState([]);

  useEffect(() => {
    loadReportData();
  }, []);

  useEffect(() => {
    filterData();
  }, [searchQuery, reportData, filterEmployee, filterFromDate, filterToDate]);

  const loadReportData = async () => {
    try {
      setLoading(true);
      let data = [];

      if (reportType === 'worklogs-employee') {
        data = await generateWorkLogsByEmployee();
      } else if (reportType === 'worklogs-project') {
        data = await generateWorkLogsByProject();
      } else if (reportType === 'attendance-employee') {
        data = await generateAttendanceByEmployee();
      } else if (reportType === 'attendance-project') {
        data = await generateAttendanceByProject();
      }

      setReportData(data);
      setFilteredData(data);

      // Load all employees for filtering
      const users = await getUsersByOrg(session.orgId);
      setAllEmployees(users);
    } catch (error) {
      console.error('Error loading report data:', error);
      Alert.alert('Error', 'Failed to load report data');
    } finally {
      setLoading(false);
    }
  };

  const filterData = () => {
    let filtered = [...reportData];

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(row => {
        return Object.values(row).some(value =>
          String(value).toLowerCase().includes(query)
        );
      });
    }

    // Apply employee filter
    if (filterEmployee) {
      filtered = filtered.filter(row => {
        const employeeName = row['Employee Name'] || '';
        return employeeName === filterEmployee.name;
      });
    }

    // Apply date range filter
    if (filterFromDate || filterToDate) {
      filtered = filtered.filter(row => {
        const rowDate = row['Date'];
        if (!rowDate || rowDate === '-') return false;

        const date = new Date(rowDate);
        if (isNaN(date.getTime())) return false;

        if (filterFromDate) {
          const fromDate = new Date(filterFromDate);
          fromDate.setHours(0, 0, 0, 0);
          if (date < fromDate) return false;
        }

        if (filterToDate) {
          const toDate = new Date(filterToDate);
          toDate.setHours(23, 59, 59, 999);
          if (date > toDate) return false;
        }

        return true;
      });
    }

    setFilteredData(filtered);
  };

  const clearAllFilters = () => {
    setSearchQuery('');
    setFilterEmployee(null);
    setFilterFromDate(null);
    setFilterToDate(new Date());
  };

  const getActiveFilterCount = () => {
    let count = 0;
    if (searchQuery.trim()) count++;
    if (filterEmployee) count++;
    if (filterFromDate) count++;
    // Only count toDate if it's different from today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const toDate = new Date(filterToDate);
    toDate.setHours(0, 0, 0, 0);
    if (toDate.getTime() !== today.getTime()) count++;
    return count;
  };

  const generateWorkLogsByEmployee = async () => {
    const allWorkLogs = await getWorkLogsByOrg(session.orgId);
    const users = await getUsersByOrg(session.orgId);
    const data = [];

    // Apply role-based filtering
    let targetEmployee = employee;
    let workLogs = allWorkLogs;

    if (employee) {
      // Filter for specific employee
      workLogs = workLogs.filter(log => log.userId === employee.userId);
    } else {
      // If no employee specified, show all (admin can only see their team)
      if (session.role === ROLES.ADMIN) {
        const teamMembers = users.filter(u => u.adminId === session.userId);
        const teamMemberIds = teamMembers.map(m => m.userId);
        workLogs = workLogs.filter(log => teamMemberIds.includes(log.userId));
      }
    }

    // Apply report option filtering
    if (reportOption === 'self-logged') {
      workLogs = workLogs.filter(log => log.userId === log.loggedBy);
    } else if (reportOption === 'admin-logged') {
      workLogs = workLogs.filter(log => log.userId !== log.loggedBy);
    }

    // Build data rows
    for (const log of workLogs) {
      const user = users.find(u => u.userId === log.userId);
      const loggedByUser = users.find(u => u.userId === log.loggedBy);

      const row = {
        'Employee Name': user?.name || 'Unknown',
        'Date': log.date || '-',
        'Project': log.projectName || 'N/A',
        'Hours Worked': log.hours || log.totalHours || '-',
        'Break Duration': log.breakDuration ? `${log.breakDuration} min` : '-',
        'Description': log.description || '-',
      };

      if (reportOption === 'combined') {
        row['Logged By'] = loggedByUser?.name || 'Unknown';
      }

      data.push(row);
    }

    return data;
  };

  const generateWorkLogsByProject = async () => {
    const allWorkLogs = await getWorkLogsByOrg(session.orgId);
    const users = await getUsersByOrg(session.orgId);
    const projects = await getProjectsByOrg(session.orgId);
    const data = [];

    let workLogs = allWorkLogs;

    // Filter by project if specified
    if (project) {
      workLogs = workLogs.filter(log => log.projectId === project.projectId);
    } else {
      // Admin can only see projects they manage
      if (session.role === ROLES.ADMIN) {
        const adminProjects = projects.filter(
          p => p.managerId === session.userId || (p.admins && p.admins.includes(session.userId))
        );
        const projectIds = adminProjects.map(p => p.projectId);
        workLogs = workLogs.filter(log => projectIds.includes(log.projectId));
      }
    }

    // Apply report option filtering
    if (reportOption === 'self-logged') {
      workLogs = workLogs.filter(log => log.userId === log.loggedBy);
    } else if (reportOption === 'admin-logged') {
      workLogs = workLogs.filter(log => log.userId !== log.loggedBy);
    }

    // Build data rows
    for (const log of workLogs) {
      const proj = projects.find(p => p.projectId === log.projectId);
      const user = users.find(u => u.userId === log.userId);
      const loggedByUser = users.find(u => u.userId === log.loggedBy);

      const row = {
        'Project Name': proj?.projectName || 'Unknown',
        'Employee Name': user?.name || 'Unknown',
        'Date': log.date || '-',
        'Hours Worked': log.hours || log.totalHours || '-',
        'Break Duration': log.breakDuration ? `${log.breakDuration} min` : '-',
        'Description': log.description || '-',
      };

      if (reportOption === 'combined') {
        row['Logged By'] = loggedByUser?.name || 'Unknown';
      }

      data.push(row);
    }

    return data;
  };

  const generateAttendanceByEmployee = async () => {
    const attendanceRecords = await getAttendanceByOrg(session.orgId);
    const users = await getUsersByOrg(session.orgId);
    const data = [];

    let records = attendanceRecords;

    // Filter by employee if specified
    if (employee) {
      records = records.filter(record => record.userId === employee.userId);
    } else {
      // Admin can only see their team
      if (session.role === ROLES.ADMIN) {
        const teamMembers = users.filter(u => u.adminId === session.userId);
        const teamMemberIds = teamMembers.map(m => m.userId);
        records = records.filter(record => teamMemberIds.includes(record.userId));
      }
    }

    // Build data rows
    for (const record of records) {
      const user = users.find(u => u.userId === record.userId);
      const clockIn = record.clockInTime
        ? new Date(record.clockInTime).toLocaleString()
        : '-';
      const clockOut = record.clockOutTime
        ? new Date(record.clockOutTime).toLocaleString()
        : '-';

      let totalHours = '-';
      if (record.clockInTime && record.clockOutTime) {
        const diff = new Date(record.clockOutTime) - new Date(record.clockInTime);
        totalHours = (diff / (1000 * 60 * 60)).toFixed(2) + ' hrs';
      }

      data.push({
        'Employee Name': user?.name || 'Unknown',
        'Date': record.date || '-',
        'Clock In': clockIn,
        'Clock Out': clockOut,
        'Total Hours': totalHours,
        'Status': record.type || 'Regular',
      });
    }

    return data;
  };

  const generateAttendanceByProject = async () => {
    const attendanceRecords = await getAttendanceByOrg(session.orgId);
    const users = await getUsersByOrg(session.orgId);
    const projects = await getProjectsByOrg(session.orgId);
    const data = [];

    let records = attendanceRecords;

    // Filter by project if specified
    if (project) {
      records = records.filter(record => record.projectId === project.projectId);
    } else {
      // Admin can only see their projects
      if (session.role === ROLES.ADMIN) {
        const adminProjects = projects.filter(
          p => p.managerId === session.userId || (p.admins && p.admins.includes(session.userId))
        );
        const projectIds = adminProjects.map(p => p.projectId);
        records = records.filter(record => projectIds.includes(record.projectId));
      }
    }

    // Build data rows
    for (const record of records) {
      const proj = projects.find(p => p.projectId === record.projectId);
      const user = users.find(u => u.userId === record.userId);
      const clockIn = record.clockInTime
        ? new Date(record.clockInTime).toLocaleString()
        : '-';
      const clockOut = record.clockOutTime
        ? new Date(record.clockOutTime).toLocaleString()
        : '-';

      let totalHours = '-';
      if (record.clockInTime && record.clockOutTime) {
        const diff = new Date(record.clockOutTime) - new Date(record.clockInTime);
        totalHours = (diff / (1000 * 60 * 60)).toFixed(2) + ' hrs';
      }

      data.push({
        'Project Name': proj?.projectName || 'Unknown',
        'Employee Name': user?.name || 'Unknown',
        'Date': record.date || '-',
        'Clock In': clockIn,
        'Clock Out': clockOut,
        'Total Hours': totalHours,
      });
    }

    return data;
  };

  const handleDownload = () => {
    if (filteredData.length === 0) {
      Alert.alert('No Data', 'There is no data to export');
      return;
    }
    setShowFormatModal(true);
  };

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
        console.warn(err);
        return false;
      }
    }
    return true;
  };

  const handleDownloadExcel = async () => {
    setShowFormatModal(false);

    try {
      setDownloading(true);

      const hasPermission = await requestStoragePermission();
      if (!hasPermission) {
        Alert.alert('Permission Denied', 'Storage permission is required to save files');
        return;
      }

      // Convert to array of arrays for Excel
      const headers = Object.keys(filteredData[0]);
      const excelData = [headers];

      filteredData.forEach(row => {
        const rowData = headers.map(header => row[header]);
        excelData.push(rowData);
      });

      // Generate filename
      let filename = 'Report';
      if (employee) {
        filename = `${employee.name.replace(/ /g, '_')}_${reportType}`;
      } else if (project) {
        filename = `${project.projectName.replace(/ /g, '_')}_${reportType}`;
      } else {
        filename = reportType;
      }
      filename += `_${reportOption}_${Date.now()}`;

      // Create Excel file
      const ws = XLSX.utils.aoa_to_sheet(excelData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Report');
      const wbout = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });

      // Save file
      const downloadsPath = Platform.OS === 'android'
        ? RNFS.DownloadDirectoryPath
        : RNFS.DocumentDirectoryPath;
      const path = `${downloadsPath}/${filename}.xlsx`;

      await RNFS.writeFile(path, wbout, 'base64');

      Alert.alert(
        'Success',
        `Report saved to:\n${path}`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Export error:', error);
      Alert.alert('Error', `Failed to export report: ${error.message}`);
    } finally {
      setDownloading(false);
    }
  };

  const handleDownloadPDF = async () => {
    setShowFormatModal(false);

    try {
      setDownloading(true);

      const hasPermission = await requestStoragePermission();
      if (!hasPermission) {
        Alert.alert('Permission Denied', 'Storage permission is required to save files');
        return;
      }

      // Generate filename
      let filename = 'Report';
      if (employee) {
        filename = `${employee.name.replace(/ /g, '_')}_${reportType}`;
      } else if (project) {
        filename = `${project.projectName.replace(/ /g, '_')}_${reportType}`;
      } else {
        filename = reportType;
      }
      filename += `_${reportOption}_${Date.now()}`;

      // Generate HTML table
      const headers = Object.keys(filteredData[0]);
      let htmlContent = `
        <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; padding: 20px; }
              h1 { color: #333; text-align: center; }
              table { width: 100%; border-collapse: collapse; margin-top: 20px; }
              th { background-color: #4F46E5; color: white; padding: 12px; text-align: left; font-weight: 600; }
              td { padding: 10px; border-bottom: 1px solid #ddd; }
              tr:nth-child(even) { background-color: #f9f9f9; }
            </style>
          </head>
          <body>
            <h1>${getReportTitle()}</h1>
            <p style="text-align: center; color: #666;">
              ${filteredData.length} record${filteredData.length !== 1 ? 's' : ''} •
              ${reportOption === 'self-logged' ? 'Self-Logged' : reportOption === 'admin-logged' ? 'Admin-Logged' : 'Combined'}
            </p>
            <table>
              <thead>
                <tr>
                  ${headers.map(header => `<th>${header}</th>`).join('')}
                </tr>
              </thead>
              <tbody>
                ${filteredData.map(row => `
                  <tr>
                    ${headers.map(header => `<td>${row[header]}</td>`).join('')}
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </body>
        </html>
      `;

      // Save HTML as PDF-ready file
      const downloadsPath = Platform.OS === 'android'
        ? RNFS.DownloadDirectoryPath
        : RNFS.DocumentDirectoryPath;
      const htmlPath = `${downloadsPath}/${filename}.html`;

      await RNFS.writeFile(htmlPath, htmlContent, 'utf8');

      Alert.alert(
        'Success',
        `Report saved to:\n${htmlPath}\n\nYou can open this file in a browser and print to PDF.`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Export error:', error);
      Alert.alert('Error', `Failed to export report: ${error.message}`);
    } finally {
      setDownloading(false);
    }
  };

  const getReportTitle = () => {
    if (employee) {
      return `${employee.name}'s ${reportType.includes('worklog') ? 'Work Logs' : 'Attendance'}`;
    } else if (project) {
      return `${project.projectName} - ${reportType.includes('worklog') ? 'Work Logs' : 'Attendance'}`;
    }
    return 'Report Preview';
  };

  const renderTableHeader = () => {
    if (filteredData.length === 0) return null;
    const headers = Object.keys(filteredData[0]);

    return (
      <View style={styles.tableHeader}>
        {headers.map((header, index) => (
          <View key={index} style={styles.tableHeaderCell}>
            <Text style={styles.tableHeaderText}>{header}</Text>
          </View>
        ))}
      </View>
    );
  };

  const renderTableRow = (row, index) => {
    const values = Object.values(row);

    return (
      <View
        key={index}
        style={[styles.tableRow, index % 2 === 0 && styles.tableRowEven]}
      >
        {values.map((value, cellIndex) => (
          <View key={cellIndex} style={styles.tableCell}>
            <Text style={styles.tableCellText}>{value}</Text>
          </View>
        ))}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.headerButton}
        >
          <X color={COLORS.text} size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>Preview</Text>
        <TouchableOpacity
          onPress={handleDownload}
          style={styles.downloadButton}
          disabled={downloading || loading}
        >
          <Download color={downloading ? COLORS.gray : COLORS.primary} size={24} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading report data...</Text>
        </View>
      ) : reportData.length === 0 ? (
        <View style={styles.emptyContainer}>
          <FileSpreadsheet color={COLORS.gray} size={64} />
          <Text style={styles.emptyTitle}>No Data Available</Text>
          <Text style={styles.emptyText}>
            There are no records matching your criteria
          </Text>
        </View>
      ) : (
        <View style={styles.content}>
          <View style={styles.infoCard}>
            <FileSpreadsheet color={COLORS.primary} size={20} />
            <View style={styles.infoTextContainer}>
              <Text style={styles.infoTitle}>{getReportTitle()}</Text>
              <Text style={styles.infoSubtitle}>
                {filteredData.length} of {reportData.length} record{reportData.length !== 1 ? 's' : ''} • {reportOption === 'self-logged' ? 'Self-Logged' : reportOption === 'admin-logged' ? 'Admin-Logged' : 'Combined'}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => setShowSearch(!showSearch)}
              style={styles.searchIconButton}
            >
              <Search color={COLORS.primary} size={20} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setShowFilterModal(true)}
              style={styles.filterIconButton}
            >
              <Filter color={getActiveFilterCount() > 0 ? COLORS.success : COLORS.primary} size={20} />
              {getActiveFilterCount() > 0 && (
                <View style={styles.filterBadge}>
                  <Text style={styles.filterBadgeText}>{getActiveFilterCount()}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          {showSearch && (
            <View style={styles.searchContainer}>
              <Search color={COLORS.gray} size={18} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search in table..."
                placeholderTextColor={COLORS.gray}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <X color={COLORS.gray} size={18} />
                </TouchableOpacity>
              )}
            </View>
          )}

          {filteredData.length === 0 ? (
            <View style={styles.noResultsContainer}>
              <Search color={COLORS.gray} size={48} />
              <Text style={styles.noResultsText}>No matching records found</Text>
              <TouchableOpacity
                style={styles.clearSearchButton}
                onPress={() => setSearchQuery('')}
              >
                <Text style={styles.clearSearchButtonText}>Clear Search</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.tableScrollHorizontal}
            >
              <ScrollView
                showsVerticalScrollIndicator={false}
                style={styles.tableScrollVertical}
              >
                {renderTableHeader()}
                {filteredData.map((row, index) => renderTableRow(row, index))}
              </ScrollView>
            </ScrollView>
          )}
        </View>
      )}

      {/* Format Selection Modal */}
      <Modal
        visible={showFormatModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowFormatModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.formatModalContent}>
            <View style={styles.formatModalHeader}>
              <Text style={styles.formatModalTitle}>Choose Download Format</Text>
              <TouchableOpacity onPress={() => setShowFormatModal(false)}>
                <X color={COLORS.text} size={24} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.formatOption}
              onPress={handleDownloadExcel}
              disabled={downloading}
            >
              <View style={styles.formatIconContainer}>
                <FileSpreadsheet color={COLORS.success} size={32} />
              </View>
              <View style={styles.formatTextContainer}>
                <Text style={styles.formatOptionTitle}>Download as Excel</Text>
                <Text style={styles.formatOptionDesc}>
                  Best for data analysis and spreadsheets (.xlsx)
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.formatOption}
              onPress={handleDownloadPDF}
              disabled={downloading}
            >
              <View style={styles.formatIconContainer}>
                <FileText color={COLORS.danger} size={32} />
              </View>
              <View style={styles.formatTextContainer}>
                <Text style={styles.formatOptionTitle}>Download as PDF (HTML)</Text>
                <Text style={styles.formatOptionDesc}>
                  Best for printing and sharing (.html - print to PDF)
                </Text>
              </View>
            </TouchableOpacity>

            {downloading && (
              <View style={styles.downloadingIndicator}>
                <ActivityIndicator size="small" color={COLORS.primary} />
                <Text style={styles.downloadingText}>Preparing file...</Text>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* Filter Modal */}
      <Modal
        visible={showFilterModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowFilterModal(false)}
      >
        <View style={styles.filterModalOverlay}>
          <View style={styles.filterModalContent}>
            <View style={styles.filterModalHeader}>
              <Text style={styles.filterModalTitle}>Advanced Filters</Text>
              <TouchableOpacity onPress={() => setShowFilterModal(false)}>
                <X color={COLORS.text} size={24} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={styles.filterScrollView}>
              {/* Employee Filter */}
              <View style={styles.filterSection}>
                <Text style={styles.filterLabel}>Employee</Text>
                <TouchableOpacity
                  style={styles.employeeSelectButton}
                  onPress={() => setShowEmployeeSelectModal(true)}
                >
                  <Text style={[
                    styles.employeeSelectText,
                    !filterEmployee && styles.employeeSelectPlaceholder
                  ]}>
                    {filterEmployee ? filterEmployee.name : 'Select employee...'}
                  </Text>
                  {filterEmployee && (
                    <TouchableOpacity
                      onPress={(e) => {
                        e.stopPropagation();
                        setFilterEmployee(null);
                      }}
                      style={styles.clearEmployeeButton}
                    >
                      <X color={COLORS.gray} size={18} />
                    </TouchableOpacity>
                  )}
                </TouchableOpacity>
              </View>

              {/* Date Range Filter */}
              <View style={styles.filterSection}>
                <Text style={styles.filterLabel}>Date Range</Text>

                {/* Date Row */}
                <View style={styles.dateRow}>
                  {/* From Date */}
                  <TouchableOpacity
                    style={styles.datePickerButtonHalf}
                    onPress={() => setShowFromDatePicker(true)}
                  >
                    <Text style={styles.datePickerLabelSmall}>From</Text>
                    <Text style={styles.datePickerValueSmall}>
                      {filterFromDate
                        ? new Date(filterFromDate).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                          })
                        : 'Start date'}
                    </Text>
                    {filterFromDate && (
                      <TouchableOpacity
                        onPress={(e) => {
                          e.stopPropagation();
                          setFilterFromDate(null);
                        }}
                        style={styles.clearDateButtonSmall}
                      >
                        <X color={COLORS.gray} size={14} />
                      </TouchableOpacity>
                    )}
                  </TouchableOpacity>

                  {/* To Date */}
                  <TouchableOpacity
                    style={styles.datePickerButtonHalf}
                    onPress={() => setShowToDatePicker(true)}
                  >
                    <Text style={styles.datePickerLabelSmall}>To</Text>
                    <Text style={styles.datePickerValueSmall}>
                      {new Date(filterToDate).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Active Filters Summary */}
              {getActiveFilterCount() > 0 && (
                <View style={styles.activeFiltersSummary}>
                  <Text style={styles.activeFiltersText}>
                    {getActiveFilterCount()} filter{getActiveFilterCount() !== 1 ? 's' : ''} active
                  </Text>
                  <TouchableOpacity onPress={clearAllFilters} style={styles.clearAllButton}>
                    <Text style={styles.clearAllButtonText}>Clear All</Text>
                  </TouchableOpacity>
                </View>
              )}
            </ScrollView>

            {/* Action Buttons */}
            <View style={styles.filterModalActions}>
              <TouchableOpacity
                style={styles.filterCancelButton}
                onPress={() => setShowFilterModal(false)}
              >
                <Text style={styles.filterCancelButtonText}>Close</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.filterApplyButton}
                onPress={() => setShowFilterModal(false)}
              >
                <Text style={styles.filterApplyButtonText}>
                  Apply Filters ({filteredData.length})
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Date Pickers */}
      {showFromDatePicker && (
        <DateTimePicker
          value={filterFromDate || new Date()}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(event, selectedDate) => {
            setShowFromDatePicker(false);
            if (selectedDate) {
              setFilterFromDate(selectedDate);
            }
          }}
        />
      )}

      {showToDatePicker && (
        <DateTimePicker
          value={filterToDate || new Date()}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(event, selectedDate) => {
            setShowToDatePicker(false);
            if (selectedDate) {
              setFilterToDate(selectedDate);
            }
          }}
        />
      )}

      {/* Employee Selection Modal */}
      <Modal
        visible={showEmployeeSelectModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowEmployeeSelectModal(false)}
      >
        <View style={styles.filterModalOverlay}>
          <View style={styles.filterModalContent}>
            <View style={styles.filterModalHeader}>
              <Text style={styles.filterModalTitle}>Select Employee</Text>
              <TouchableOpacity onPress={() => setShowEmployeeSelectModal(false)}>
                <X color={COLORS.text} size={24} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={styles.employeeListScroll}>
              {allEmployees.length === 0 ? (
                <View style={styles.emptyEmployeeList}>
                  <Text style={styles.emptyEmployeeText}>No employees available</Text>
                </View>
              ) : (
                allEmployees.map((emp) => (
                  <TouchableOpacity
                    key={emp.userId}
                    style={[
                      styles.employeeItem,
                      filterEmployee?.userId === emp.userId && styles.employeeItemSelected,
                    ]}
                    onPress={() => {
                      setFilterEmployee(emp);
                      setShowEmployeeSelectModal(false);
                    }}
                  >
                    <View style={styles.employeeInfo}>
                      <Text style={styles.employeeName}>{emp.name}</Text>
                      {emp.designation && (
                        <Text style={styles.employeeDesignation}>{emp.designation}</Text>
                      )}
                    </View>
                    {filterEmployee?.userId === emp.userId && (
                      <View style={styles.selectedCheckmark}>
                        <Text style={styles.checkmarkText}>✓</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>

            <View style={styles.filterModalActions}>
              <TouchableOpacity
                style={styles.filterCancelButton}
                onPress={() => setShowEmployeeSelectModal(false)}
              >
                <Text style={styles.filterCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
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
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    textAlign: 'center',
    marginHorizontal: 8,
  },
  downloadButton: {
    padding: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: COLORS.textLight,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.textLight,
    textAlign: 'center',
    marginTop: 8,
  },
  content: {
    flex: 1,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary + '10',
    padding: 16,
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.primary + '30',
  },
  infoTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  infoTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 2,
  },
  infoSubtitle: {
    fontSize: 12,
    color: COLORS.textLight,
  },
  tableScrollHorizontal: {
    flex: 1,
  },
  tableScrollVertical: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: COLORS.primary,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  tableHeaderCell: {
    minWidth: 120,
    paddingHorizontal: 8,
  },
  tableHeaderText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.white,
  },
  tableRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  tableRowEven: {
    backgroundColor: COLORS.background,
  },
  tableCell: {
    minWidth: 120,
    paddingHorizontal: 8,
    justifyContent: 'center',
  },
  tableCellText: {
    fontSize: 12,
    color: COLORS.text,
  },
  searchIconButton: {
    padding: 8,
    marginLeft: 8,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    marginHorizontal: 16,
    marginBottom: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: COLORS.text,
    paddingVertical: 0,
  },
  noResultsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  noResultsText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: 16,
    marginBottom: 16,
  },
  clearSearchButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  clearSearchButtonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  formatModalContent: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  formatModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  formatModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  formatOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  formatIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  formatTextContainer: {
    flex: 1,
  },
  formatOptionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  formatOptionDesc: {
    fontSize: 12,
    color: COLORS.textLight,
  },
  downloadingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    gap: 12,
  },
  downloadingText: {
    fontSize: 14,
    color: COLORS.textLight,
  },
  filterIconButton: {
    padding: 8,
    marginLeft: 8,
    position: 'relative',
  },
  filterBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: COLORS.success,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  filterBadgeText: {
    color: COLORS.white,
    fontSize: 10,
    fontWeight: '700',
  },
  filterModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  filterModalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
    paddingBottom: 20,
  },
  filterModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  filterModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
  },
  filterScrollView: {
    paddingHorizontal: 24,
    paddingTop: 20,
  },
  filterSection: {
    marginBottom: 24,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  filterInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 8,
  },
  filterInput: {
    flex: 1,
    fontSize: 15,
    color: COLORS.text,
    paddingVertical: 0,
  },
  datePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginTop: 8,
  },
  datePickerLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textLight,
    marginRight: 12,
  },
  datePickerValue: {
    flex: 1,
    fontSize: 15,
    color: COLORS.text,
  },
  clearDateButton: {
    padding: 4,
  },
  activeFiltersSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.primary + '15',
    padding: 16,
    borderRadius: 12,
    marginTop: 8,
  },
  activeFiltersText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
  clearAllButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: COLORS.white,
    borderRadius: 8,
  },
  clearAllButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.primary,
  },
  filterModalActions: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  filterCancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: COLORS.background,
    alignItems: 'center',
  },
  filterCancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
  },
  filterApplyButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
  },
  filterApplyButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.white,
  },
  employeeSelectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.background,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  employeeSelectText: {
    flex: 1,
    fontSize: 15,
    color: COLORS.text,
  },
  employeeSelectPlaceholder: {
    color: COLORS.gray,
  },
  clearEmployeeButton: {
    padding: 4,
    marginLeft: 8,
  },
  dateRow: {
    flexDirection: 'row',
    gap: 12,
  },
  datePickerButtonHalf: {
    flex: 1,
    backgroundColor: COLORS.background,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    position: 'relative',
  },
  datePickerLabelSmall: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textLight,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  datePickerValueSmall: {
    fontSize: 15,
    fontWeight: '500',
    color: COLORS.text,
  },
  clearDateButtonSmall: {
    position: 'absolute',
    top: 8,
    right: 8,
    padding: 2,
  },
  employeeListScroll: {
    paddingHorizontal: 24,
    paddingTop: 12,
    maxHeight: 400,
  },
  emptyEmployeeList: {
    padding: 40,
    alignItems: 'center',
  },
  emptyEmployeeText: {
    fontSize: 14,
    color: COLORS.textLight,
  },
  employeeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.background,
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  employeeItemSelected: {
    backgroundColor: COLORS.primary + '15',
    borderColor: COLORS.primary,
  },
  employeeInfo: {
    flex: 1,
  },
  employeeName: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 2,
  },
  employeeDesignation: {
    fontSize: 13,
    color: COLORS.textLight,
  },
  selectedCheckmark: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  checkmarkText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '700',
  },
});

export default ReportPreviewScreen;
