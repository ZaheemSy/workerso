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
import { ArrowLeft, Search, Users, Briefcase, Calendar, Clock } from 'lucide-react-native';
import { COLORS } from '../constants/colors';
import { useAuth } from '../contexts/AuthContext';
import {
  getQuickEmployeesByOrg,
  getQuickProjectsByOrg,
  createQuickWorkLog,
} from '../services/storageService';

const QuickAddWorkLogScreen = ({ navigation }) => {
  const { session } = useAuth();
  const [employees, setEmployees] = useState([]);
  const [projects, setProjects] = useState([]);
  const [employeeSearchQuery, setEmployeeSearchQuery] = useState('');
  const [projectSearchQuery, setProjectSearchQuery] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [selectedProject, setSelectedProject] = useState(null);
  const [showProjectModal, setShowProjectModal] = useState(false);
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

  const filteredEmployees = useMemo(() => {
    if (!employeeSearchQuery.trim()) return employees;
    const query = employeeSearchQuery.toLowerCase();
    return employees.filter(item => item.name?.toLowerCase().includes(query));
  }, [employeeSearchQuery, employees]);

  const projectsForSelectedEmployee = useMemo(() => {
    if (!selectedEmployee) return [];
    return projects.filter(project => (project.employeeIds || []).includes(selectedEmployee.quickEmployeeId));
  }, [projects, selectedEmployee]);

  const filteredProjects = useMemo(() => {
    if (!projectSearchQuery.trim()) return projectsForSelectedEmployee;
    const query = projectSearchQuery.toLowerCase();
    return projectsForSelectedEmployee.filter(item => item.name?.toLowerCase().includes(query));
  }, [projectSearchQuery, projectsForSelectedEmployee]);

  const openProjectModal = employee => {
    setSelectedEmployee(employee);
    setSelectedProject(null);
    setProjectSearchQuery('');
    setShowProjectModal(true);
  };

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

  const openWorkLogModal = project => {
    const now = new Date();
    const defaultStart = new Date(now);
    defaultStart.setHours(9, 0, 0, 0);
    const defaultEnd = new Date(now);
    defaultEnd.setHours(18, 0, 0, 0);

    setSelectedProject(project);
    setShowProjectModal(false);
    setLogDate(new Date());
    setStartTime(defaultStart);
    setEndTime(defaultEnd);
    setLogMode('timings');
    setDirectHH('');
    setDirectMM('');
    setShowWorkLogModal(true);
  };

  const saveWorkLog = async () => {
    if (!selectedEmployee || !selectedProject) {
      Alert.alert('Validation', 'Please select employee and project');
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
      date: formatDate(logDate),
      startTime: logStartTime,
      endTime: logEndTime,
      workLogHHMM: duration,
      loggedBy: session.userId,
    });

    setShowWorkLogModal(false);
    setSelectedProject(null);
    Alert.alert('Success', 'Work log added successfully');
  };

  const renderEmployee = ({ item, index }) => (
    <TouchableOpacity style={styles.rowCard} onPress={() => openProjectModal(item)} activeOpacity={0.8}>
      <Text style={[styles.rowWatermark, index % 2 === 0 ? styles.watermarkGreen : styles.watermarkBlue]}>EMP</Text>
      <View style={styles.iconWrap}>
        <Users color={COLORS.secondary} size={16} />
      </View>
      <View style={styles.rowTextWrap}>
        <Text style={styles.rowTitle}>{item.name}</Text>
        <Text style={styles.rowSubtitle}>Select to add worklog</Text>
      </View>
    </TouchableOpacity>
  );

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
          <Text style={styles.infoTitle}>Employee Worklog Entry</Text>
          <Text style={styles.infoSubtitle}>
            Search employee, choose project, then add worklog.
          </Text>
        </View>

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
          renderItem={renderEmployee}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <Text style={styles.emptyText}>
              {employeeSearchQuery.trim() ? 'No employees found' : 'No employees available'}
            </Text>
          }
        />
      </View>

      <Modal transparent visible={showProjectModal} animationType="fade" onRequestClose={() => setShowProjectModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Select Project</Text>
            <Text style={styles.modalSubtitle}>{selectedEmployee?.name || '-'}</Text>
            <View style={[styles.searchBox, styles.modalSearch]}>
              <Search color={COLORS.gray} size={18} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search project..."
                placeholderTextColor={COLORS.gray}
                value={projectSearchQuery}
                onChangeText={setProjectSearchQuery}
              />
            </View>
            <FlatList
              data={filteredProjects}
              keyExtractor={item => item.quickProjectId}
              renderItem={({ item, index }) => (
                <TouchableOpacity style={styles.rowCard} onPress={() => openWorkLogModal(item)} activeOpacity={0.8}>
                  <Text
                    style={[styles.rowWatermark, index % 2 === 0 ? styles.watermarkBlue : styles.watermarkGreen]}
                  >
                    PROJECT
                  </Text>
                  <View style={styles.iconWrap}>
                    <Briefcase color={COLORS.warning} size={16} />
                  </View>
                  <View style={styles.rowTextWrap}>
                    <Text style={styles.rowTitle}>{item.name}</Text>
                    <Text style={styles.rowSubtitle}>Tap to continue</Text>
                  </View>
                </TouchableOpacity>
              )}
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
        visible={showWorkLogModal}
        animationType="fade"
        onRequestClose={() => setShowWorkLogModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Add Work Log</Text>
            <Text style={styles.modalSubtitle}>
              {selectedEmployee?.name || ''} • {selectedProject?.name || ''}
            </Text>

            <TouchableOpacity style={styles.selectButton} onPress={() => setShowDatePicker(true)}>
              <View style={styles.selectLeft}>
                <Calendar color={COLORS.primary} size={16} />
                <Text style={styles.selectText}>Date: {formatDate(logDate)}</Text>
              </View>
              <Text style={styles.selectHint}>Change</Text>
            </TouchableOpacity>

            <Text style={styles.modeLabel}>Choose how to add work log</Text>

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
              <TouchableOpacity style={styles.saveBtn} onPress={saveWorkLog}>
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
  modalCard: { width: '100%', maxHeight: '80%', backgroundColor: COLORS.white, borderRadius: 14, padding: 16 },
  modalTitle: { fontSize: 17, fontWeight: '700', color: COLORS.text, marginBottom: 6 },
  modalSubtitle: { color: COLORS.textLight, fontSize: 12, marginBottom: 10 },
  modalSearch: { marginBottom: 10 },
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
