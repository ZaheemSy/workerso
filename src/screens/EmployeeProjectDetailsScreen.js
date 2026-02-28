import React, { useCallback, useEffect, useState } from 'react';
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
import { ArrowLeft, Plus, FileText, Calendar, Clock, Pencil } from 'lucide-react-native';
import { COLORS } from '../constants/colors';
import { ROLES } from '../constants/roles';
import { useAuth } from '../contexts/AuthContext';
import {
  getQuickProjectById,
  getQuickEmployeesByOrg,
  createQuickWorkLog,
  getQuickWorkLogsByEmployee,
  updateQuickWorkLog,
} from '../services/storageService';

const EmployeeProjectDetailsScreen = ({ navigation, route }) => {
  const { session } = useAuth();
  const orgId = session?.orgId || null;
  const role = session?.role || null;
  const userId = session?.userId || null;
  const { quickProjectId, quickEmployeeId } = route.params;
  const [project, setProject] = useState(null);
  const [employee, setEmployee] = useState(null);
  const [logs, setLogs] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [logDate, setLogDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [startTime, setStartTime] = useState(null);
  const [endTime, setEndTime] = useState(null);
  const [logMode, setLogMode] = useState('timings');
  const [directHH, setDirectHH] = useState('');
  const [directMM, setDirectMM] = useState('');
  const [editingLog, setEditingLog] = useState(null);

  const canAddLog = role === ROLES.SUPER_ADMIN || role === ROLES.ADMIN;

  const loadData = useCallback(async () => {
    if (!orgId) return;
    const [projectData, employees] = await Promise.all([
      getQuickProjectById(quickProjectId),
      getQuickEmployeesByOrg(orgId),
    ]);
    setProject(projectData);
    setEmployee(employees.find(item => item.quickEmployeeId === quickEmployeeId) || null);
    const logList = await getQuickWorkLogsByEmployee(orgId, quickEmployeeId);
    const filtered = logList.filter(log => log.quickProjectId === quickProjectId);
    setLogs(filtered.sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
  }, [quickEmployeeId, quickProjectId, orgId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const openLogModal = () => {
    if (!canAddLog) {
      Alert.alert('Not Allowed', 'Only Super Admin or Admin can add work logs.');
      return;
    }
    const now = new Date();
    const defaultStart = new Date(now);
    defaultStart.setHours(9, 0, 0, 0);
    const defaultEnd = new Date(now);
    defaultEnd.setHours(18, 0, 0, 0);

    setLogDate(new Date());
    setStartTime(defaultStart);
    setEndTime(defaultEnd);
    setLogMode('timings');
    setDirectHH('');
    setDirectMM('');
    setEditingLog(null);
    setShowModal(true);
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
  const formatDateTime = dateValue => {
    if (!dateValue) return 'N/A';
    const dateObj = new Date(dateValue);
    return dateObj.toLocaleString([], {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };
  const parseISODateToDate = isoDate => {
    if (!isoDate) return new Date();
    const parsed = new Date(isoDate);
    return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
  };
  const time24ToDate = (dateValue, timeValue) => {
    const dateObj = parseISODateToDate(dateValue);
    if (!timeValue || !/^\d{2}:\d{2}$/.test(timeValue)) return dateObj;
    const [hours, minutes] = timeValue.split(':').map(Number);
    dateObj.setHours(hours, minutes, 0, 0);
    return dateObj;
  };

  const computeDurationFromTimes = (start, end) => {
    const diffMs = end.getTime() - start.getTime();
    const totalMinutes = Math.floor(diffMs / 60000);
    const hh = String(Math.floor(totalMinutes / 60)).padStart(2, '0');
    const mm = String(totalMinutes % 60).padStart(2, '0');
    return `${hh}:${mm}`;
  };

  const applyPreset = preset => {
    const baseDate = new Date(logDate);
    const withTime = (hours, minutes) => {
      const dt = new Date(baseDate);
      dt.setHours(hours, minutes, 0, 0);
      return dt;
    };

    if (preset === 'full') {
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

  const saveLog = async () => {
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

    const payload = {
      orgId,
      quickProjectId,
      quickEmployeeId,
      employeeName: employee?.name || 'Employee',
      projectName: project?.name || 'Project',
      date: formatDate(logDate),
      startTime: logStartTime,
      endTime: logEndTime,
      workLogHHMM: duration,
      loggedBy: userId,
    };

    if (editingLog?.quickWorkLogId) {
      await updateQuickWorkLog(editingLog.quickWorkLogId, payload);
    } else {
      await createQuickWorkLog(payload);
    }

    setDirectHH('');
    setDirectMM('');
    setStartTime(null);
    setEndTime(null);
    setEditingLog(null);
    setShowModal(false);
    loadData();
  };

  const openEditModal = logItem => {
    if (!canAddLog) {
      Alert.alert('Not Allowed', 'Only Super Admin or Admin can edit work logs.');
      return;
    }
    const dateValue = logItem.date || logItem.createdAt;
    setLogDate(parseISODateToDate(dateValue));
    if (logItem.startTime && logItem.endTime) {
      setLogMode('timings');
      setStartTime(time24ToDate(dateValue, logItem.startTime));
      setEndTime(time24ToDate(dateValue, logItem.endTime));
      setDirectHH('');
      setDirectMM('');
    } else {
      setLogMode('direct');
      const [hh = '', mm = ''] = (logItem.workLogHHMM || '00:00').split(':');
      setDirectHH(hh);
      setDirectMM(mm);
      setStartTime(null);
      setEndTime(null);
    }
    setEditingLog(logItem);
    setShowModal(true);
  };

  const renderLog = ({ item, index }) => (
    <View style={styles.logRow}>
      <Text style={[styles.logWatermark, index % 2 === 0 ? styles.logWatermarkGreen : styles.logWatermarkBlue]}>
        {item.workLogHHMM || '00:00'}
      </Text>
      <View style={styles.logIcon}>
        <FileText color={COLORS.primary} size={15} />
      </View>
      <View style={styles.logTextWrap}>
        <Text style={styles.logTitle}>{item.workLogHHMM || item.hours || '00:00'} (hh:mm)</Text>
        <Text style={styles.logSubtitle}>
          {item.startTime && item.endTime ? `${item.startTime} - ${item.endTime}` : 'Direct work log entry'}
        </Text>
        <Text style={styles.logDate}>Work Date: {item.date || new Date(item.createdAt).toISOString().split('T')[0]}</Text>
        <Text style={styles.logDate}>Logged On: {formatDateTime(item.createdAt)}</Text>
        {item.updatedAt && item.updatedAt !== item.createdAt ? (
          <Text style={styles.logDate}>Edited On: {formatDateTime(item.updatedAt)}</Text>
        ) : null}
      </View>
      {canAddLog ? (
        <TouchableOpacity style={styles.editLogBtn} onPress={() => openEditModal(item)}>
          <Pencil color={COLORS.primary} size={16} />
        </TouchableOpacity>
      ) : null}
    </View>
  );

  const closeModal = () => {
    setShowModal(false);
    setEditingLog(null);
    setDirectHH('');
    setDirectMM('');
    setStartTime(null);
    setEndTime(null);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
          <ArrowLeft color={COLORS.text} size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Employee Project Details</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.content}>
        <View style={styles.infoCard}>
          <Text style={styles.title}>{employee?.name || 'Employee'}</Text>
          <Text style={styles.subtitle}>Project: {project?.name || 'Project'}</Text>
        </View>

        <TouchableOpacity style={styles.addButton} onPress={openLogModal}>
          <Plus color={COLORS.white} size={16} />
          <Text style={styles.addButtonText}>Add Work Log</Text>
        </TouchableOpacity>

        <FlatList
          data={logs}
          keyExtractor={item => item.quickWorkLogId}
          renderItem={renderLog}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={<Text style={styles.emptyText}>No work logs yet</Text>}
        />
      </View>

      <Modal transparent visible={showModal} animationType="fade" onRequestClose={closeModal}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{editingLog ? 'Edit Work Log' : 'Add Work Log'}</Text>

            <TouchableOpacity style={styles.selectButton} onPress={() => setShowDatePicker(true)}>
              <View style={styles.selectLeft}>
                <Calendar color={COLORS.primary} size={16} />
                <Text style={styles.selectText}>Date: {formatDate(logDate)}</Text>
              </View>
              <Text style={styles.selectHint}>Change</Text>
            </TouchableOpacity>

            <Text style={styles.modeLabel}>Choose how to add work log</Text>
            <View style={styles.presetRow}>
              <TouchableOpacity style={styles.presetButton} onPress={() => applyPreset('full')}>
                <Text style={styles.presetButtonText}>09:00-18:00</Text>
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
              <TouchableOpacity style={styles.cancelBtn} onPress={closeModal}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={saveLog}>
                <Text style={styles.saveBtnText}>{editingLog ? 'Update' : 'Save'}</Text>
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
    backgroundColor: '#F5F3FF',
    borderWidth: 1,
    borderColor: '#DDD6FE',
    padding: 14,
    marginBottom: 12,
  },
  title: { fontSize: 20, fontWeight: '700', color: COLORS.text },
  subtitle: { marginTop: 4, color: COLORS.textLight, fontSize: 14 },
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
  listContent: { paddingBottom: 20 },
  logRow: {
    overflow: 'hidden',
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
    shadowColor: '#0F172A',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  logIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  logTextWrap: { flex: 1 },
  logTitle: { color: COLORS.text, fontSize: 14, fontWeight: '600' },
  logSubtitle: { color: COLORS.textLight, fontSize: 13, marginTop: 2 },
  logDate: { color: COLORS.gray, fontSize: 11, marginTop: 4 },
  logWatermark: {
    position: 'absolute',
    right: 12,
    top: 6,
    fontSize: 44,
    fontWeight: '800',
    opacity: 0.14,
    letterSpacing: 1,
  },
  logWatermarkGreen: { color: '#16A34A' },
  logWatermarkBlue: { color: '#2563EB' },
  editLogBtn: {
    marginLeft: 8,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: { textAlign: 'center', marginTop: 20, color: COLORS.textLight },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: { width: '100%', backgroundColor: COLORS.white, borderRadius: 14, padding: 16 },
  modalTitle: { fontSize: 17, fontWeight: '700', color: COLORS.text, marginBottom: 12 },
  modeLabel: {
    marginBottom: 10,
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '600',
  },
  presetRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
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
  presetButtonText: {
    color: '#1D4ED8',
    fontSize: 12,
    fontWeight: '700',
  },
  radioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  radioOuter: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: COLORS.gray,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOuterActive: {
    borderColor: COLORS.primary,
  },
  radioInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.primary,
  },
  radioText: {
    marginLeft: 8,
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '600',
  },
  timeGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  timeCard: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    padding: 10,
    backgroundColor: '#F8FAFC',
  },
  timeLabel: {
    color: COLORS.textLight,
    fontSize: 12,
    fontWeight: '600',
  },
  timeValueRow: {
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeValue: {
    marginLeft: 6,
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '700',
  },
  durationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
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
  durationColon: {
    marginHorizontal: 12,
    fontSize: 32,
    fontWeight: '700',
    color: '#16A34A',
  },
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
  selectLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectText: {
    color: COLORS.text,
    fontSize: 14,
    marginLeft: 8,
  },
  selectHint: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: '600',
  },
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

export default EmployeeProjectDetailsScreen;
