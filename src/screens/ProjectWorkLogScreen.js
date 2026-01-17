import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { X, Users, Calendar, FileText, UserCheck, ChevronRight, Clock } from 'lucide-react-native';
import { COLORS } from '../constants/colors';
import { useAuth } from '../contexts/AuthContext';
import {
  getProjectById,
  getUserById,
  getAttendanceByOrg,
  getWorkLogsByOrg,
} from '../services/storageService';

const ProjectWorkLogScreen = ({ navigation, route }) => {
  const { session } = useAuth();
  const { projectId, projectName } = route.params;
  const [loading, setLoading] = useState(true);
  const [project, setProject] = useState(null);
  const [todayPresentCount, setTodayPresentCount] = useState(0);
  const [todayWorkLogs, setTodayWorkLogs] = useState([]);
  const [attendanceHistory, setAttendanceHistory] = useState([]);
  const [workLogHistory, setWorkLogHistory] = useState([]);

  // Modal states
  const [showWorkLogModal, setShowWorkLogModal] = useState(false);
  const [selectedWorkLog, setSelectedWorkLog] = useState(null);
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);
  const [showTodayAttendanceModal, setShowTodayAttendanceModal] = useState(false);
  const [attendanceDate, setAttendanceDate] = useState(new Date(new Date().setDate(new Date().getDate() - 1)));
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [attendanceTab, setAttendanceTab] = useState('present');
  const [todayAttendanceTab, setTodayAttendanceTab] = useState('present');
  const [dateAttendance, setDateAttendance] = useState({ present: [], absent: [] });
  const [todayAttendance, setTodayAttendance] = useState({ present: [], absent: [] });

  useEffect(() => {
    loadProjectWorkData();
  }, []);

  const loadProjectWorkData = async () => {
    try {
      setLoading(true);
      const projectData = await getProjectById(projectId);
      setProject(projectData);

      const allAttendance = await getAttendanceByOrg(session.orgId);
      const allWorkLogs = await getWorkLogsByOrg(session.orgId);

      // Filter for this project
      const projectAttendance = allAttendance.filter(
        (a) => a.projectId === projectId
      );
      const projectWorkLogs = allWorkLogs.filter((w) => w.projectId === projectId);

      // Get today's date (YYYY-MM-DD format)
      const today = new Date().toISOString().split('T')[0];

      // Count today's present workers
      const todayPresent = projectAttendance.filter((a) => {
        const attendanceDate = new Date(a.date).toISOString().split('T')[0];
        return attendanceDate === today && a.status === 'present';
      });
      setTodayPresentCount(todayPresent.length);

      // Get today's work logs
      const todayLogs = projectWorkLogs.filter((w) => {
        const logDate = new Date(w.date).toISOString().split('T')[0];
        return logDate === today;
      });

      // Get user details for today's work logs
      const todayLogsWithDetails = await Promise.all(
        todayLogs.map(async (log) => {
          const user = await getUserById(log.userId);
          return { ...log, userName: user?.name || 'Unknown' };
        })
      );
      setTodayWorkLogs(todayLogsWithDetails);

      // Get attendance history with user details
      const attendanceWithDetails = await Promise.all(
        projectAttendance.slice(0, 50).map(async (attendance) => {
          const user = await getUserById(attendance.userId);
          return { ...attendance, userName: user?.name || 'Unknown' };
        })
      );
      setAttendanceHistory(attendanceWithDetails);

      // Get work log history with user details
      const workLogsWithDetails = await Promise.all(
        projectWorkLogs.slice(0, 50).map(async (log) => {
          const user = await getUserById(log.userId);
          return { ...log, userName: user?.name || 'Unknown' };
        })
      );
      setWorkLogHistory(workLogsWithDetails);

      // Load today's attendance for modal
      await loadTodayAttendance(projectAttendance);
    } catch (error) {
      console.error('Error loading project work data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTodayAttendance = async (projectAttendance) => {
    const today = new Date().toISOString().split('T')[0];
    const todayRecords = projectAttendance.filter((a) => {
      const attendanceDate = new Date(a.date).toISOString().split('T')[0];
      return attendanceDate === today;
    });

    const present = [];
    const absent = [];

    for (const record of todayRecords) {
      const user = await getUserById(record.userId);
      const userInfo = { ...record, userName: user?.name || 'Unknown' };
      if (record.status === 'present') {
        present.push(userInfo);
      } else {
        absent.push(userInfo);
      }
    }

    setTodayAttendance({ present, absent });
  };

  const loadAttendanceForDate = async (date) => {
    try {
      const allAttendance = await getAttendanceByOrg(session.orgId);
      const projectAttendance = allAttendance.filter((a) => a.projectId === projectId);

      const targetDate = new Date(date).toISOString().split('T')[0];
      const dateRecords = projectAttendance.filter((a) => {
        const attendanceDate = new Date(a.date).toISOString().split('T')[0];
        return attendanceDate === targetDate;
      });

      const present = [];
      const absent = [];

      for (const record of dateRecords) {
        const user = await getUserById(record.userId);
        const userInfo = { ...record, userName: user?.name || 'Unknown' };
        if (record.status === 'present') {
          present.push(userInfo);
        } else {
          absent.push(userInfo);
        }
      }

      setDateAttendance({ present, absent });
    } catch (error) {
      console.error('Error loading attendance for date:', error);
    }
  };

  const handleAttendanceHistoryClick = async () => {
    await loadAttendanceForDate(attendanceDate);
    setShowAttendanceModal(true);
  };

  const handleDateChange = async (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setAttendanceDate(selectedDate);
      await loadAttendanceForDate(selectedDate);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const calculateWorkDuration = (startTime, endTime, breaks = []) => {
    if (!startTime || !endTime) return 'N/A';

    const start = new Date(`2000-01-01 ${startTime}`);
    const end = new Date(`2000-01-01 ${endTime}`);
    let totalMinutes = (end - start) / (1000 * 60);

    // Subtract break time
    breaks.forEach(breakItem => {
      if (breakItem.start && breakItem.end) {
        const breakStart = new Date(`2000-01-01 ${breakItem.start}`);
        const breakEnd = new Date(`2000-01-01 ${breakItem.end}`);
        const breakMinutes = (breakEnd - breakStart) / (1000 * 60);
        totalMinutes -= breakMinutes;
      }
    });

    const hours = Math.floor(totalMinutes / 60);
    const minutes = Math.floor(totalMinutes % 60);
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  };

  const renderWorkLogModal = () => (
    <Modal
      visible={showWorkLogModal}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setShowWorkLogModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Work Log Details</Text>
            <TouchableOpacity onPress={() => setShowWorkLogModal(false)}>
              <X color={COLORS.text} size={24} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
            {selectedWorkLog && (
              <>
                <View style={styles.modalSection}>
                  <Text style={styles.modalLabel}>Employee</Text>
                  <Text style={styles.modalValue}>{selectedWorkLog.userName}</Text>
                </View>

                <View style={styles.modalSection}>
                  <Text style={styles.modalLabel}>Description</Text>
                  <Text style={styles.modalValue}>{selectedWorkLog.description}</Text>
                </View>

                <View style={styles.modalSection}>
                  <Text style={styles.modalLabel}>Date & Time</Text>
                  <Text style={styles.modalValue}>
                    {formatDate(selectedWorkLog.date)} at {formatTime(selectedWorkLog.date)}
                  </Text>
                </View>

                {selectedWorkLog.workStart && selectedWorkLog.workEnd && (
                  <>
                    <View style={styles.modalSection}>
                      <Text style={styles.modalLabel}>Work Duration</Text>
                      <Text style={styles.modalValue}>
                        {calculateWorkDuration(
                          selectedWorkLog.workStart,
                          selectedWorkLog.workEnd,
                          selectedWorkLog.breaks
                        )}
                      </Text>
                    </View>

                    <View style={styles.modalSection}>
                      <Text style={styles.modalLabel}>Work Time</Text>
                      <View style={styles.timeRow}>
                        <View style={styles.timeItem}>
                          <Text style={styles.timeLabel}>From</Text>
                          <Text style={styles.timeValue}>{selectedWorkLog.workStart}</Text>
                        </View>
                        <Text style={styles.timeSeparator}>to</Text>
                        <View style={styles.timeItem}>
                          <Text style={styles.timeLabel}>To</Text>
                          <Text style={styles.timeValue}>{selectedWorkLog.workEnd}</Text>
                        </View>
                      </View>
                    </View>

                    {selectedWorkLog.breaks && selectedWorkLog.breaks.length > 0 && (
                      <View style={styles.modalSection}>
                        <Text style={styles.modalLabel}>Breaks</Text>
                        {selectedWorkLog.breaks.map((breakItem, index) => (
                          <View key={index} style={styles.breakRow}>
                            <Text style={styles.breakText}>
                              Break {index + 1}: {breakItem.start} to {breakItem.end}
                            </Text>
                          </View>
                        ))}
                      </View>
                    )}
                  </>
                )}
              </>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  const renderAttendanceModal = () => (
    <Modal
      visible={showAttendanceModal}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setShowAttendanceModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Attendance History</Text>
            <TouchableOpacity onPress={() => setShowAttendanceModal(false)}>
              <X color={COLORS.text} size={24} />
            </TouchableOpacity>
          </View>

          <View style={styles.datePickerSection}>
            <View style={styles.selectedDateContainer}>
              <Calendar color={COLORS.primary} size={18} />
              <Text style={styles.selectedDateText}>{formatDate(attendanceDate)}</Text>
            </View>
            <TouchableOpacity
              style={styles.changeDateButton}
              onPress={() => setShowDatePicker(true)}
            >
              <Text style={styles.changeDateButtonText}>Change</Text>
            </TouchableOpacity>
          </View>

          {showDatePicker && (
            <DateTimePicker
              value={attendanceDate}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={handleDateChange}
            />
          )}

          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={[styles.tab, attendanceTab === 'present' && styles.activeTab]}
              onPress={() => setAttendanceTab('present')}
            >
              <Text style={[styles.tabText, attendanceTab === 'present' && styles.activeTabText]}>
                Present ({dateAttendance.present.length})
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, attendanceTab === 'absent' && styles.activeTab]}
              onPress={() => setAttendanceTab('absent')}
            >
              <Text style={[styles.tabText, attendanceTab === 'absent' && styles.activeTabText]}>
                Absent ({dateAttendance.absent.length})
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
            {attendanceTab === 'present' ? (
              dateAttendance.present.length === 0 ? (
                <Text style={styles.emptyModalText}>No employees present</Text>
              ) : (
                dateAttendance.present.map((record, index) => (
                  <View key={index} style={styles.attendanceItem}>
                    <Text style={styles.attendanceName}>{record.userName}</Text>
                    <View style={styles.statusBadgePresent}>
                      <Text style={styles.statusTextPresent}>Present</Text>
                    </View>
                  </View>
                ))
              )
            ) : (
              dateAttendance.absent.length === 0 ? (
                <Text style={styles.emptyModalText}>No employees absent</Text>
              ) : (
                dateAttendance.absent.map((record, index) => (
                  <View key={index} style={styles.attendanceItem}>
                    <Text style={styles.attendanceName}>{record.userName}</Text>
                    <View style={styles.statusBadgeAbsent}>
                      <Text style={styles.statusTextAbsent}>Absent</Text>
                    </View>
                  </View>
                ))
              )
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  const renderTodayAttendanceModal = () => (
    <Modal
      visible={showTodayAttendanceModal}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setShowTodayAttendanceModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Today's Attendance</Text>
            <TouchableOpacity onPress={() => setShowTodayAttendanceModal(false)}>
              <X color={COLORS.text} size={24} />
            </TouchableOpacity>
          </View>

          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={[styles.tab, todayAttendanceTab === 'present' && styles.activeTab]}
              onPress={() => setTodayAttendanceTab('present')}
            >
              <Text style={[styles.tabText, todayAttendanceTab === 'present' && styles.activeTabText]}>
                Present ({todayAttendance.present.length})
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, todayAttendanceTab === 'absent' && styles.activeTab]}
              onPress={() => setTodayAttendanceTab('absent')}
            >
              <Text style={[styles.tabText, todayAttendanceTab === 'absent' && styles.activeTabText]}>
                Absent ({todayAttendance.absent.length})
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
            {todayAttendanceTab === 'present' ? (
              todayAttendance.present.length === 0 ? (
                <Text style={styles.emptyModalText}>No employees present today</Text>
              ) : (
                todayAttendance.present.map((record, index) => (
                  <View key={index} style={styles.attendanceItem}>
                    <Text style={styles.attendanceName}>{record.userName}</Text>
                    <View style={styles.statusBadgePresent}>
                      <Text style={styles.statusTextPresent}>Present</Text>
                    </View>
                  </View>
                ))
              )
            ) : (
              todayAttendance.absent.length === 0 ? (
                <Text style={styles.emptyModalText}>No employees absent today</Text>
              ) : (
                todayAttendance.absent.map((record, index) => (
                  <View key={index} style={styles.attendanceItem}>
                    <Text style={styles.attendanceName}>{record.userName}</Text>
                    <View style={styles.statusBadgeAbsent}>
                      <Text style={styles.statusTextAbsent}>Absent</Text>
                    </View>
                  </View>
                ))
              )
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
            <X color={COLORS.text} size={24} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Work Logs</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
          <X color={COLORS.text} size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {projectName}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Today's Present Count */}
        <TouchableOpacity
          style={styles.statsCard}
          onPress={() => setShowTodayAttendanceModal(true)}
        >
          <View style={styles.statsIconContainer}>
            <UserCheck color={COLORS.primary} size={28} />
          </View>
          <View style={styles.statsContent}>
            <Text style={styles.statsLabel}>Employees Present Today</Text>
            <Text style={styles.statsValue}>{todayPresentCount}</Text>
          </View>
          <ChevronRight color={COLORS.gray} size={24} />
        </TouchableOpacity>

        {/* Today's Work Logs */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <FileText color={COLORS.text} size={18} />
            <Text style={styles.sectionTitle}>Today's Work Logs</Text>
          </View>

          {todayWorkLogs.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>No work logs for today</Text>
            </View>
          ) : (
            todayWorkLogs.map((log) => (
              <TouchableOpacity
                key={log.workLogId}
                style={styles.logCard}
                onPress={() => {
                  setSelectedWorkLog(log);
                  setShowWorkLogModal(true);
                }}
              >
                <View style={styles.logHeader}>
                  <Text style={styles.logUserName}>{log.userName}</Text>
                  <Text style={styles.logTime}>{formatTime(log.date)}</Text>
                </View>
                <Text style={styles.logDescription} numberOfLines={2}>{log.description}</Text>
              </TouchableOpacity>
            ))
          )}
        </View>

        {/* Attendance History */}
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.sectionHeader}
            onPress={handleAttendanceHistoryClick}
          >
            <UserCheck color={COLORS.text} size={18} />
            <Text style={styles.sectionTitle}>Attendance History</Text>
            <ChevronRight color={COLORS.gray} size={20} style={{ marginLeft: 'auto' }} />
          </TouchableOpacity>

          {attendanceHistory.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>No attendance records</Text>
            </View>
          ) : (
            attendanceHistory.map((attendance) => (
              <View key={attendance.attendanceId} style={styles.historyCard}>
                <View style={styles.historyRow}>
                  <Text style={styles.historyName}>{attendance.userName}</Text>
                  <View
                    style={[
                      styles.statusBadge,
                      attendance.status === 'present'
                        ? styles.statusPresent
                        : styles.statusAbsent,
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusText,
                        attendance.status === 'present'
                          ? styles.statusTextPresent
                          : styles.statusTextAbsent,
                      ]}
                    >
                      {attendance.status === 'present' ? 'Present' : 'Absent'}
                    </Text>
                  </View>
                </View>
                <View style={styles.historyMeta}>
                  <Calendar color={COLORS.gray} size={14} />
                  <Text style={styles.historyDate}>{formatDate(attendance.date)}</Text>
                </View>
              </View>
            ))
          )}
        </View>

        {/* Work Log History */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <FileText color={COLORS.text} size={18} />
            <Text style={styles.sectionTitle}>Work Log History</Text>
          </View>

          {workLogHistory.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>No work log history</Text>
            </View>
          ) : (
            workLogHistory.map((log) => (
              <TouchableOpacity
                key={log.workLogId}
                style={styles.logCard}
                onPress={() => {
                  setSelectedWorkLog(log);
                  setShowWorkLogModal(true);
                }}
              >
                <View style={styles.logHeader}>
                  <Text style={styles.logUserName}>{log.userName}</Text>
                  <Text style={styles.logDate}>{formatDate(log.date)}</Text>
                </View>
                <Text style={styles.logDescription} numberOfLines={2}>{log.description}</Text>
              </TouchableOpacity>
            ))
          )}
        </View>

        {/* Work Log Modal */}
        {renderWorkLogModal()}

        {/* Attendance History Modal */}
        {renderAttendanceModal()}

        {/* Today's Attendance Modal */}
        {renderTodayAttendanceModal()}
      </ScrollView>
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
    paddingHorizontal: 16,
    paddingTop: 48,
    paddingBottom: 16,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    flex: 1,
    textAlign: 'center',
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
  content: {
    flex: 1,
    padding: 16,
  },
  statsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statsIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  statsContent: {
    flex: 1,
  },
  statsLabel: {
    fontSize: 14,
    color: COLORS.textLight,
    marginBottom: 4,
  },
  statsValue: {
    fontSize: 32,
    fontWeight: '700',
    color: COLORS.text,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },
  emptyCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.textLight,
  },
  logCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  logUserName: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
    flex: 1,
  },
  logTime: {
    fontSize: 12,
    color: COLORS.textLight,
    fontWeight: '500',
  },
  logDate: {
    fontSize: 12,
    color: COLORS.textLight,
    fontWeight: '500',
  },
  logDescription: {
    fontSize: 14,
    color: COLORS.text,
    lineHeight: 20,
  },
  historyCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  historyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  historyName: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusPresent: {
    backgroundColor: COLORS.success + '20',
  },
  statusAbsent: {
    backgroundColor: COLORS.danger + '20',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  statusTextPresent: {
    color: COLORS.success,
  },
  statusTextAbsent: {
    color: COLORS.danger,
  },
  historyMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  historyDate: {
    fontSize: 13,
    color: COLORS.textLight,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
  },
  modalBody: {
    padding: 20,
  },
  modalSection: {
    marginBottom: 20,
  },
  modalLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textLight,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  modalValue: {
    fontSize: 16,
    color: COLORS.text,
    lineHeight: 24,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  timeItem: {
    flex: 1,
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  timeLabel: {
    fontSize: 11,
    color: COLORS.textLight,
    marginBottom: 4,
    fontWeight: '600',
  },
  timeValue: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.primary,
  },
  timeSeparator: {
    fontSize: 14,
    color: COLORS.textLight,
    fontWeight: '500',
  },
  breakRow: {
    backgroundColor: COLORS.background,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  breakText: {
    fontSize: 14,
    color: COLORS.text,
  },
  datePickerSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingTop: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  selectedDateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  selectedDateText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
  },
  changeDateButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  changeDateButtonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '600',
  },
  tabContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: COLORS.primary,
  },
  tabText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textLight,
  },
  activeTabText: {
    color: COLORS.primary,
  },
  attendanceItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  attendanceName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    flex: 1,
  },
  statusBadgePresent: {
    backgroundColor: COLORS.success + '20',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusTextPresent: {
    color: COLORS.success,
    fontSize: 13,
    fontWeight: '600',
  },
  statusBadgeAbsent: {
    backgroundColor: COLORS.danger + '20',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusTextAbsent: {
    color: COLORS.danger,
    fontSize: 13,
    fontWeight: '600',
  },
  emptyModalText: {
    fontSize: 15,
    color: COLORS.textLight,
    textAlign: 'center',
    marginTop: 40,
  },
});

export default ProjectWorkLogScreen;
