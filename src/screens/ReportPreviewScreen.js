import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Modal,
  TextInput,
} from 'react-native';
import {
  X,
  Download,
  FileSpreadsheet,
  FileText,
  Search,
  ArrowUpAZ,
  ArrowDownAZ,
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

const MAX_PDF_LINE_LENGTH = 95;

const ReportPreviewScreen = ({ navigation, route }) => {
  const { reportType, reportOption = 'combined', employee, project } = route.params;
  const { session } = useAuth();

  const [reportData, setReportData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState('asc');

  const isWorkLogReport = reportType?.startsWith('worklogs-');
  const isProjectWiseWorklog = reportType === 'worklogs-project';
  const isEmployeeWiseWorklog = reportType === 'worklogs-employee';

  const sanitizeText = value => {
    if (value === null || value === undefined) return '';
    return String(value).replace(/[^\x20-\x7E]/g, ' ').replace(/\s+/g, ' ').trim();
  };

  const sanitizeFileNamePart = value => {
    const text = sanitizeText(value || 'report');
    return text.replace(/[^a-zA-Z0-9_-]/g, '_').replace(/_+/g, '_').replace(/^_+|_+$/g, '') || 'report';
  };

  const parseHoursValue = value => {
    if (typeof value === 'number' && !Number.isNaN(value)) {
      return value;
    }

    if (typeof value === 'string') {
      const normalized = value.toLowerCase().replace('hrs', '').replace('hr', '').trim();
      const parsed = parseFloat(normalized);
      if (!Number.isNaN(parsed)) {
        return parsed;
      }
    }

    return 0;
  };

  const formatHours = value => `${parseHoursValue(value).toFixed(2)} hrs`;

  const formatDateLabel = value => {
    if (!value) return '-';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return value;
    return parsed.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
    });
  };

  const applyWorklogOptionFilter = useCallback(logs => {
    if (reportOption === 'self-logged') {
      return logs.filter(log => log.userId === log.loggedBy);
    }

    if (reportOption === 'admin-logged') {
      return logs.filter(log => log.userId !== log.loggedBy);
    }

    return logs;
  }, [reportOption]);

  const generateWorkLogsByEmployee = useCallback(async () => {
    const [allWorkLogs, users, projects] = await Promise.all([
      getWorkLogsByOrg(session.orgId),
      getUsersByOrg(session.orgId),
      getProjectsByOrg(session.orgId),
    ]);

    let workLogs = [...allWorkLogs];

    if (employee) {
      workLogs = workLogs.filter(log => log.userId === employee.userId);
    } else if (session.role === ROLES.ADMIN) {
      const teamMembers = users.filter(u => u.adminId === session.userId);
      const teamMemberIds = teamMembers.map(m => m.userId);
      workLogs = workLogs.filter(log => teamMemberIds.includes(log.userId));
    }

    workLogs = applyWorklogOptionFilter(workLogs);

    return workLogs.map(log => {
      const user = users.find(u => u.userId === log.userId);
      const loggedByUser = users.find(u => u.userId === log.loggedBy);
      const proj = projects.find(p => p.projectId === log.projectId);
      const hours = log.hours ?? log.totalHours ?? 0;

      return {
        'Employee Name': user?.name || 'Unknown',
        'Project Name': proj?.projectName || log.projectName || 'Unknown',
        Date: formatDateLabel(log.date),
        'Hours Worked': parseHoursValue(hours).toFixed(2),
        Description: log.description || '-',
        ...(reportOption === 'combined' ? { 'Logged By': loggedByUser?.name || 'Unknown' } : {}),
        __groupKey: proj?.projectName || log.projectName || 'Unknown',
        __groupType: 'project',
        __dateSort: log.date || log.createdAt || '',
        __hoursValue: parseHoursValue(hours),
      };
    });
  }, [applyWorklogOptionFilter, employee, reportOption, session.orgId, session.role, session.userId]);

  const generateWorkLogsByProject = useCallback(async () => {
    const [allWorkLogs, users, projects] = await Promise.all([
      getWorkLogsByOrg(session.orgId),
      getUsersByOrg(session.orgId),
      getProjectsByOrg(session.orgId),
    ]);

    let workLogs = [...allWorkLogs];

    if (project) {
      workLogs = workLogs.filter(log => log.projectId === project.projectId);
    } else if (session.role === ROLES.ADMIN) {
      const adminProjects = projects.filter(
        p => p.managerId === session.userId || (p.admins && p.admins.includes(session.userId))
      );
      const projectIds = adminProjects.map(p => p.projectId);
      workLogs = workLogs.filter(log => projectIds.includes(log.projectId));
    }

    workLogs = applyWorklogOptionFilter(workLogs);

    return workLogs.map(log => {
      const proj = projects.find(p => p.projectId === log.projectId);
      const user = users.find(u => u.userId === log.userId);
      const loggedByUser = users.find(u => u.userId === log.loggedBy);
      const hours = log.hours ?? log.totalHours ?? 0;

      return {
        'Project Name': proj?.projectName || log.projectName || 'Unknown',
        'Employee Name': user?.name || 'Unknown',
        Date: formatDateLabel(log.date),
        'Hours Worked': parseHoursValue(hours).toFixed(2),
        Description: log.description || '-',
        ...(reportOption === 'combined' ? { 'Logged By': loggedByUser?.name || 'Unknown' } : {}),
        __groupKey: user?.name || 'Unknown',
        __groupType: 'employee',
        __dateSort: log.date || log.createdAt || '',
        __hoursValue: parseHoursValue(hours),
      };
    });
  }, [applyWorklogOptionFilter, project, reportOption, session.orgId, session.role, session.userId]);

  const generateAttendanceByEmployee = useCallback(async () => {
    const [attendanceRecords, users] = await Promise.all([
      getAttendanceByOrg(session.orgId),
      getUsersByOrg(session.orgId),
    ]);

    let records = [...attendanceRecords];

    if (employee) {
      records = records.filter(record => record.userId === employee.userId);
    } else if (session.role === ROLES.ADMIN) {
      const teamMembers = users.filter(u => u.adminId === session.userId);
      const teamMemberIds = teamMembers.map(m => m.userId);
      records = records.filter(record => teamMemberIds.includes(record.userId));
    }

    return records.map(record => {
      const user = users.find(u => u.userId === record.userId);
      const clockIn = record.clockInTime ? new Date(record.clockInTime).toLocaleString() : '-';
      const clockOut = record.clockOutTime ? new Date(record.clockOutTime).toLocaleString() : '-';

      let totalHours = '-';
      if (record.clockInTime && record.clockOutTime) {
        const diff = new Date(record.clockOutTime) - new Date(record.clockInTime);
        totalHours = `${(diff / (1000 * 60 * 60)).toFixed(2)} hrs`;
      }

      return {
        'Employee Name': user?.name || 'Unknown',
        Date: formatDateLabel(record.date),
        'Clock In': clockIn,
        'Clock Out': clockOut,
        'Total Hours': totalHours,
        Status: record.type || 'Regular',
      };
    });
  }, [employee, session.orgId, session.role, session.userId]);

  const generateAttendanceByProject = useCallback(async () => {
    const [attendanceRecords, users, projects] = await Promise.all([
      getAttendanceByOrg(session.orgId),
      getUsersByOrg(session.orgId),
      getProjectsByOrg(session.orgId),
    ]);

    let records = [...attendanceRecords];

    if (project) {
      records = records.filter(record => record.projectId === project.projectId);
    } else if (session.role === ROLES.ADMIN) {
      const adminProjects = projects.filter(
        p => p.managerId === session.userId || (p.admins && p.admins.includes(session.userId))
      );
      const projectIds = adminProjects.map(p => p.projectId);
      records = records.filter(record => projectIds.includes(record.projectId));
    }

    return records.map(record => {
      const proj = projects.find(p => p.projectId === record.projectId);
      const user = users.find(u => u.userId === record.userId);
      const clockIn = record.clockInTime ? new Date(record.clockInTime).toLocaleString() : '-';
      const clockOut = record.clockOutTime ? new Date(record.clockOutTime).toLocaleString() : '-';

      let totalHours = '-';
      if (record.clockInTime && record.clockOutTime) {
        const diff = new Date(record.clockOutTime) - new Date(record.clockInTime);
        totalHours = `${(diff / (1000 * 60 * 60)).toFixed(2)} hrs`;
      }

      return {
        'Project Name': proj?.projectName || 'Unknown',
        'Employee Name': user?.name || 'Unknown',
        Date: formatDateLabel(record.date),
        'Clock In': clockIn,
        'Clock Out': clockOut,
        'Total Hours': totalHours,
      };
    });
  }, [project, session.orgId, session.role, session.userId]);

  useEffect(() => {
    const load = async () => {
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
      } catch (error) {
        console.error('Error loading report data:', error);
        Alert.alert('Error', 'Failed to load report data');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [
    generateAttendanceByEmployee,
    generateAttendanceByProject,
    generateWorkLogsByEmployee,
    generateWorkLogsByProject,
    reportType,
  ]);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredData(reportData);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = reportData.filter(row =>
      Object.values(row).some(value => String(value).toLowerCase().includes(query))
    );
    setFilteredData(filtered);
  }, [reportData, searchQuery]);

  const groupedSections = useMemo(() => {
    if (!isWorkLogReport) return [];

    const grouped = filteredData.reduce((acc, row) => {
      const key = row.__groupKey || 'Unknown';
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(row);
      return acc;
    }, {});

    const orderedKeys = Object.keys(grouped).sort((a, b) =>
      sortOrder === 'asc' ? a.localeCompare(b) : b.localeCompare(a)
    );

    return orderedKeys.map(key => {
      const rows = [...grouped[key]].sort((a, b) => {
        const first = new Date(a.__dateSort || 0).getTime() || 0;
        const second = new Date(b.__dateSort || 0).getTime() || 0;
        return first - second;
      });

      const totalHours = rows.reduce((sum, row) => sum + (row.__hoursValue || 0), 0);

      return {
        key,
        rows,
        totalHours,
      };
    });
  }, [filteredData, isWorkLogReport, sortOrder]);

  const totalWorkHours = useMemo(() => {
    if (!isWorkLogReport) return 0;
    return groupedSections.reduce((sum, section) => sum + section.totalHours, 0);
  }, [groupedSections, isWorkLogReport]);

  const getReportTitle = () => {
    if (employee) {
      return `${employee.name} - Work Log Report`;
    }

    if (project) {
      return `${project.projectName} - Work Log Report`;
    }

    if (reportType === 'worklogs-project') {
      return 'Project-wise Work Log Report';
    }

    if (reportType === 'worklogs-employee') {
      return 'Employee-wise Work Log Report';
    }

    if (reportType === 'attendance-project') {
      return 'Attendance by Project';
    }

    return 'Attendance by Employee';
  };

  const getGroupTitle = () => {
    if (isProjectWiseWorklog) return 'Employee';
    if (isEmployeeWiseWorklog) return 'Project';
    return 'Group';
  };

  const getExportBaseName = () => {
    const context = employee?.name || project?.projectName || 'all';
    const mode = isProjectWiseWorklog
      ? 'project_wise'
      : isEmployeeWiseWorklog
      ? 'employee_wise'
      : reportType;
    return `${sanitizeFileNamePart(context)}_${sanitizeFileNamePart(mode)}_${Date.now()}`;
  };

  const getDownloadDirectory = async () => RNFS.DocumentDirectoryPath;

  const stripInternalFields = row => {
    const cleaned = {};
    Object.keys(row).forEach(key => {
      if (!key.startsWith('__')) {
        cleaned[key] = row[key];
      }
    });
    return cleaned;
  };

  const createExcelFile = async () => {
    const workbook = XLSX.utils.book_new();

    if (isWorkLogReport && groupedSections.length > 0) {
      const summaryRows = [
        {
          'Report Title': getReportTitle(),
          'Grouped By': getGroupTitle(),
          'Total Groups': groupedSections.length,
          'Total Records': filteredData.length,
          'Total Work Hours': totalWorkHours.toFixed(2),
        },
      ];

      XLSX.utils.book_append_sheet(
        workbook,
        XLSX.utils.json_to_sheet(summaryRows),
        'Summary'
      );

      groupedSections.forEach((section, index) => {
        const rows = section.rows.map(row => {
          const cleaned = stripInternalFields(row);
          return {
            Date: cleaned.Date,
            'Hours Worked': cleaned['Hours Worked'],
            Description: cleaned.Description,
            ...(cleaned['Logged By'] ? { 'Logged By': cleaned['Logged By'] } : {}),
          };
        });

        rows.push({
          Date: 'Total',
          'Hours Worked': section.totalHours.toFixed(2),
          Description: '',
        });

        const sheetName = `${index + 1}_${sanitizeFileNamePart(section.key).slice(0, 24)}`;
        XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows), sheetName);
      });
    } else {
      const rows = filteredData.map(stripInternalFields);
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows), 'Report');
    }

    const base64 = XLSX.write(workbook, { type: 'base64', bookType: 'xlsx' });
    const filename = `${getExportBaseName()}.xlsx`;
    const directory = await getDownloadDirectory();
    const filePath = `${directory}/${filename}`;
    await RNFS.writeFile(filePath, base64, 'base64');
    return filePath;
  };

  const escapePdfText = value =>
    sanitizeText(value)
      .replace(/\\/g, '\\\\')
      .replace(/\(/g, '\\(')
      .replace(/\)/g, '\\)');

  const chunkText = (value, maxLength = MAX_PDF_LINE_LENGTH) => {
    const normalized = sanitizeText(value);
    if (!normalized) return [''];

    const words = normalized.split(' ');
    const lines = [];
    let current = '';

    words.forEach(word => {
      if (!current) {
        current = word;
        return;
      }

      if ((`${current} ${word}`).length <= maxLength) {
        current = `${current} ${word}`;
      } else {
        lines.push(current);
        current = word;
      }
    });

    if (current) {
      lines.push(current);
    }

    return lines;
  };

  const buildPdfPages = () => {
    if (isWorkLogReport && groupedSections.length > 0) {
      const pages = [];

      pages.push([
        getReportTitle(),
        `Grouped by: ${getGroupTitle()}`,
        `Total groups: ${groupedSections.length}`,
        `Total records: ${filteredData.length}`,
        `Total work hours: ${totalWorkHours.toFixed(2)} hrs`,
      ]);

      groupedSections.forEach((section, index) => {
        const lines = [
          `${getGroupTitle()} ${index + 1}: ${section.key}`,
          `Records: ${section.rows.length}`,
          '',
          'Date | Hours | Description',
          '------------------------------------------------------------',
        ];

        section.rows.forEach(row => {
          const dateText = row.Date || '-';
          const hoursText = `${parseHoursValue(row['Hours Worked']).toFixed(2)}h`;
          const descriptionText = row.Description || '-';
          const line = `${dateText} | ${hoursText} | ${descriptionText}`;
          chunkText(line).forEach(ch => lines.push(ch));
        });

        lines.push('------------------------------------------------------------');
        lines.push(`Section Total: ${section.totalHours.toFixed(2)} hrs`);

        pages.push(lines);
      });

      return pages;
    }

    const cleanRows = filteredData.map(stripInternalFields);
    const headers = cleanRows.length > 0 ? Object.keys(cleanRows[0]) : [];
    const rowsPerPage = 30;
    const pages = [];

    for (let i = 0; i < cleanRows.length; i += rowsPerPage) {
      const chunkRows = cleanRows.slice(i, i + rowsPerPage);
      const lines = [getReportTitle(), '', headers.join(' | ')];
      lines.push('------------------------------------------------------------');

      chunkRows.forEach(row => {
        const line = headers.map(key => sanitizeText(row[key])).join(' | ');
        chunkText(line).forEach(ch => lines.push(ch));
      });

      pages.push(lines);
    }

    return pages.length > 0 ? pages : [[getReportTitle(), 'No data']];
  };

  const buildSimplePdfDocument = pages => {
    const pageWidth = 595;
    const pageHeight = 842;
    const top = 800;
    const left = 40;
    const lineHeight = 14;

    const pageCount = pages.length;
    const firstPageId = 3;
    const firstContentId = firstPageId + pageCount;
    const fontId = firstContentId + pageCount;
    const lastId = fontId;

    const objects = new Array(lastId + 1).fill('');

    objects[1] = `1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj`;

    const kids = [];
    for (let i = 0; i < pageCount; i += 1) {
      const pageId = firstPageId + i;
      kids.push(`${pageId} 0 R`);
    }

    objects[2] = `2 0 obj\n<< /Type /Pages /Kids [ ${kids.join(' ')} ] /Count ${pageCount} >>\nendobj`;

    for (let i = 0; i < pageCount; i += 1) {
      const pageId = firstPageId + i;
      const contentId = firstContentId + i;
      const lines = pages[i];

      let stream = 'BT\n/F1 10 Tf\n';
      stream += `${left} ${top} Td\n`;

      lines.forEach((line, lineIndex) => {
        if (lineIndex > 0) {
          stream += `0 -${lineHeight} Td\n`;
        }
        stream += `(${escapePdfText(line)}) Tj\n`;
      });

      stream += 'ET';

      objects[contentId] = `${contentId} 0 obj\n<< /Length ${stream.length} >>\nstream\n${stream}\nendstream\nendobj`;

      objects[pageId] = `${pageId} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Contents ${contentId} 0 R /Resources << /Font << /F1 ${fontId} 0 R >> >> >>\nendobj`;
    }

    objects[fontId] = `${fontId} 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj`;

    let pdf = '%PDF-1.4\n';
    const offsets = [0];

    for (let id = 1; id <= lastId; id += 1) {
      offsets[id] = pdf.length;
      pdf += `${objects[id]}\n`;
    }

    const xrefOffset = pdf.length;
    pdf += `xref\n0 ${lastId + 1}\n`;
    pdf += '0000000000 65535 f \n';

    for (let id = 1; id <= lastId; id += 1) {
      const offsetValue = String(offsets[id]).padStart(10, '0');
      pdf += `${offsetValue} 00000 n \n`;
    }

    pdf += `trailer\n<< /Size ${lastId + 1} /Root 1 0 R >>\n`;
    pdf += `startxref\n${xrefOffset}\n%%EOF`;

    return pdf;
  };

  const createPdfFile = async () => {
    const pages = buildPdfPages();
    const pdfContent = buildSimplePdfDocument(pages);
    const filename = `${getExportBaseName()}.pdf`;
    const directory = await getDownloadDirectory();
    const filePath = `${directory}/${filename}`;
    await RNFS.writeFile(filePath, pdfContent, 'ascii');
    return filePath;
  };

  const handleExport = async format => {
    if (filteredData.length === 0) {
      Alert.alert('No Data', 'There is no data to export');
      return;
    }

    setShowExportModal(false);

    try {
      setProcessing(true);
      let path = '';
      let label = '';

      if (format === 'excel') {
        path = await createExcelFile();
        label = 'Excel';
      } else {
        path = await createPdfFile();
        label = 'PDF';
      }

      Alert.alert('Download Complete', `${label} report saved to:\n${path}`);
    } catch (error) {
      console.error('Export error:', error);
      Alert.alert('Error', `Failed to export report: ${error.message}`);
    } finally {
      setProcessing(false);
    }
  };

  const renderStandardTable = () => {
    if (filteredData.length === 0) return null;

    const headers = Object.keys(stripInternalFields(filteredData[0]));

    return (
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tableScrollHorizontal}>
        <ScrollView style={styles.tableScrollVertical} showsVerticalScrollIndicator={false}>
          <View style={styles.tableHeader}>
            {headers.map(header => (
              <View key={header} style={styles.tableHeaderCell}>
                <Text style={styles.tableHeaderText}>{header}</Text>
              </View>
            ))}
          </View>

          {filteredData.map((row, index) => {
            const cleaned = stripInternalFields(row);
            return (
              <View key={`${index}_${cleaned.Date || ''}`} style={[styles.tableRow, index % 2 === 0 && styles.tableRowEven]}>
                {headers.map(header => (
                  <View key={header} style={styles.tableCell}>
                    <Text style={styles.tableCellText}>{String(cleaned[header] ?? '-')}</Text>
                  </View>
                ))}
              </View>
            );
          })}
        </ScrollView>
      </ScrollView>
    );
  };

  const renderGroupedWorklog = () => (
    <ScrollView style={styles.groupedList} contentContainerStyle={styles.groupedListContent} showsVerticalScrollIndicator={false}>
      {groupedSections.map((section, index) => (
        <View key={`${section.key}_${index}`} style={styles.groupCard}>
          <View style={styles.groupCardHeader}>
            <Text style={styles.groupTitle}>{getGroupTitle()}: {section.key}</Text>
            <Text style={styles.groupCount}>{section.rows.length} record{section.rows.length !== 1 ? 's' : ''}</Text>
          </View>

          <View style={styles.groupTableHeader}>
            <Text style={[styles.groupTableHeaderText, styles.colDate]}>Date</Text>
            <Text style={[styles.groupTableHeaderText, styles.colHours]}>Hours</Text>
            <Text style={[styles.groupTableHeaderText, styles.colDescription]}>Description</Text>
          </View>

          {section.rows.map((row, rowIndex) => (
            <View key={`${section.key}_${rowIndex}`} style={[styles.groupTableRow, rowIndex % 2 === 0 && styles.groupTableRowEven]}>
              <Text style={[styles.groupTableCellText, styles.colDate]}>{row.Date || '-'}</Text>
              <Text style={[styles.groupTableCellText, styles.colHours]}>{formatHours(row['Hours Worked'])}</Text>
              <Text style={[styles.groupTableCellText, styles.colDescription]}>{row.Description || '-'}</Text>
            </View>
          ))}

          <View style={styles.groupTotalRow}>
            <Text style={styles.groupTotalLabel}>Total for {section.key}</Text>
            <Text style={styles.groupTotalValue}>{section.totalHours.toFixed(2)} hrs</Text>
          </View>
        </View>
      ))}
    </ScrollView>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
          <X color={COLORS.text} size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>Report Preview</Text>
        <TouchableOpacity
          onPress={() => setShowExportModal(true)}
          style={styles.downloadButton}
          disabled={processing || loading}
        >
          <Download color={processing ? COLORS.gray : COLORS.primary} size={22} />
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
          <Text style={styles.emptyText}>No records match this report selection.</Text>
        </View>
      ) : (
        <View style={styles.content}>
          <View style={styles.infoCard}>
            <FileSpreadsheet color={COLORS.primary} size={20} />
            <View style={styles.infoTextContainer}>
              <Text style={styles.infoTitle}>{getReportTitle()}</Text>
              <Text style={styles.infoSubtitle}>
                {filteredData.length} of {reportData.length} record{reportData.length !== 1 ? 's' : ''}
                {isWorkLogReport ? ` • Total: ${totalWorkHours.toFixed(2)} hrs` : ''}
              </Text>
            </View>
          </View>

          <View style={styles.searchContainer}>
            <Search color={COLORS.gray} size={18} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search records..."
              placeholderTextColor={COLORS.gray}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

          {isWorkLogReport && (
            <View style={styles.sortContainer}>
              <Text style={styles.sortLabel}>Sort {getGroupTitle()}:</Text>
              <TouchableOpacity
                style={[styles.sortButton, sortOrder === 'asc' && styles.sortButtonActive]}
                onPress={() => setSortOrder('asc')}
              >
                <ArrowUpAZ color={sortOrder === 'asc' ? COLORS.white : COLORS.primary} size={16} />
                <Text style={[styles.sortButtonText, sortOrder === 'asc' && styles.sortButtonTextActive]}>A-Z</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.sortButton, sortOrder === 'desc' && styles.sortButtonActive]}
                onPress={() => setSortOrder('desc')}
              >
                <ArrowDownAZ color={sortOrder === 'desc' ? COLORS.white : COLORS.primary} size={16} />
                <Text style={[styles.sortButtonText, sortOrder === 'desc' && styles.sortButtonTextActive]}>Z-A</Text>
              </TouchableOpacity>
            </View>
          )}

          {filteredData.length === 0 ? (
            <View style={styles.noResultsContainer}>
              <Search color={COLORS.gray} size={56} />
              <Text style={styles.noResultsTitle}>No matching records</Text>
              <Text style={styles.noResultsText}>Try another search term.</Text>
            </View>
          ) : isWorkLogReport ? (
            <>
              <View style={styles.overallTotalCard}>
                <Text style={styles.overallTotalLabel}>Overall Total Work Hours</Text>
                <Text style={styles.overallTotalValue}>{totalWorkHours.toFixed(2)} hrs</Text>
              </View>
              {renderGroupedWorklog()}
            </>
          ) : (
            renderStandardTable()
          )}
        </View>
      )}

      <Modal
        visible={showExportModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowExportModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.exportModal}>
            <View style={styles.exportHeader}>
              <Text style={styles.exportTitle}>Export or Share</Text>
              <TouchableOpacity onPress={() => setShowExportModal(false)}>
                <X color={COLORS.text} size={22} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.exportOption} onPress={() => handleExport('excel')}>
              <FileSpreadsheet color={COLORS.success} size={26} />
              <View style={styles.exportOptionTextWrap}>
                <Text style={styles.exportOptionTitle}>Excel</Text>
                <Text style={styles.exportOptionSubtitle}>Download .xlsx file</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.exportOption} onPress={() => handleExport('pdf')}>
              <FileText color={COLORS.danger} size={26} />
              <View style={styles.exportOptionTextWrap}>
                <Text style={styles.exportOptionTitle}>PDF</Text>
                <Text style={styles.exportOptionSubtitle}>Download .pdf file</Text>
              </View>
            </TouchableOpacity>

            {processing && (
              <View style={styles.processingRow}>
                <ActivityIndicator size="small" color={COLORS.primary} />
                <Text style={styles.processingText}>Preparing report file...</Text>
              </View>
            )}
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
    textAlign: 'center',
    marginHorizontal: 8,
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
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
    fontWeight: '700',
    color: COLORS.text,
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.textLight,
    marginTop: 6,
    textAlign: 'center',
  },
  content: {
    flex: 1,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary + '10',
    margin: 16,
    marginBottom: 10,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.primary + '25',
  },
  infoTextContainer: {
    flex: 1,
    marginLeft: 10,
  },
  infoTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
  },
  infoSubtitle: {
    marginTop: 2,
    fontSize: 12,
    color: COLORS.textLight,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    marginHorizontal: 16,
    marginBottom: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 14,
    color: COLORS.text,
  },
  sortContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 10,
    gap: 10,
  },
  sortLabel: {
    fontSize: 13,
    color: COLORS.textLight,
    fontWeight: '600',
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: COLORS.primary,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: COLORS.white,
  },
  sortButtonActive: {
    backgroundColor: COLORS.primary,
  },
  sortButtonText: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  sortButtonTextActive: {
    color: COLORS.white,
  },
  overallTotalCard: {
    marginHorizontal: 16,
    marginBottom: 10,
    backgroundColor: COLORS.success + '15',
    borderWidth: 1,
    borderColor: COLORS.success + '35',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  overallTotalLabel: {
    fontSize: 13,
    color: COLORS.text,
    fontWeight: '600',
  },
  overallTotalValue: {
    fontSize: 16,
    color: COLORS.success,
    fontWeight: '800',
  },
  groupedList: {
    flex: 1,
  },
  groupedListContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  groupCard: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
  },
  groupCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: COLORS.extraLightGray,
  },
  groupTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
    marginRight: 8,
  },
  groupCount: {
    fontSize: 12,
    color: COLORS.textLight,
    fontWeight: '600',
  },
  groupTableHeader: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.primary,
  },
  groupTableHeaderText: {
    fontSize: 12,
    color: COLORS.white,
    fontWeight: '700',
  },
  groupTableRow: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  groupTableRowEven: {
    backgroundColor: COLORS.background,
  },
  groupTableCellText: {
    fontSize: 12,
    color: COLORS.text,
  },
  colDate: {
    width: 95,
  },
  colHours: {
    width: 85,
  },
  colDescription: {
    flex: 1,
  },
  groupTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: COLORS.primary + '10',
  },
  groupTotalLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.text,
  },
  groupTotalValue: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.primary,
  },
  tableScrollHorizontal: {
    flex: 1,
  },
  tableScrollVertical: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: COLORS.primary,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 6,
  },
  tableHeaderCell: {
    minWidth: 130,
    paddingHorizontal: 8,
  },
  tableHeaderText: {
    fontSize: 12,
    color: COLORS.white,
    fontWeight: '700',
  },
  tableRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingVertical: 10,
    paddingHorizontal: 6,
  },
  tableRowEven: {
    backgroundColor: COLORS.background,
  },
  tableCell: {
    minWidth: 130,
    paddingHorizontal: 8,
    justifyContent: 'center',
  },
  tableCellText: {
    fontSize: 12,
    color: COLORS.text,
  },
  noResultsContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  noResultsTitle: {
    marginTop: 12,
    fontSize: 17,
    color: COLORS.text,
    fontWeight: '700',
  },
  noResultsText: {
    marginTop: 4,
    fontSize: 13,
    color: COLORS.textLight,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  exportModal: {
    backgroundColor: COLORS.white,
    borderRadius: 14,
    padding: 16,
  },
  exportHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  exportTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  exportOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    marginTop: 10,
    gap: 12,
  },
  exportOptionTextWrap: {
    flex: 1,
  },
  exportOptionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
  },
  exportOptionSubtitle: {
    marginTop: 2,
    fontSize: 12,
    color: COLORS.textLight,
  },
  processingRow: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  processingText: {
    fontSize: 13,
    color: COLORS.textLight,
  },
});

export default ReportPreviewScreen;
