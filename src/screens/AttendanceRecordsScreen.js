import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { X, Camera, Calendar, User, Clock } from 'lucide-react-native';
import { COLORS } from '../constants/colors';
import { useAuth } from '../contexts/AuthContext';
import { getAttendanceByOrg, getUserById } from '../services/storageService';

const AttendanceRecordsScreen = ({ navigation }) => {
  const { session } = useAuth();
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAttendance();
  }, []);

  const loadAttendance = async () => {
    setLoading(true);
    try {
      const attendanceData = await getAttendanceByOrg(session.orgId);

      const enrichedAttendance = await Promise.all(
        attendanceData.map(async (record) => {
          const worker = await getUserById(record.userId);
          return {
            ...record,
            workerName: worker?.name || 'Unknown',
          };
        })
      );

      enrichedAttendance.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      setAttendance(enrichedAttendance);
    } catch (error) {
      console.error('Error loading attendance:', error);
      Alert.alert('Error', 'Failed to load attendance records');
    } finally {
      setLoading(false);
    }
  };

  const groupByDate = (records) => {
    const grouped = {};
    records.forEach((record) => {
      const date = record.date;
      if (!grouped[date]) {
        grouped[date] = [];
      }
      grouped[date].push(record);
    });
    return grouped;
  };

  const groupedAttendance = groupByDate(attendance);
  const dates = Object.keys(groupedAttendance).sort((a, b) => new Date(b) - new Date(a));

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
          <X color={COLORS.text} size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Attendance Records</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {attendance.length === 0 ? (
          <View style={styles.emptyState}>
            <Camera color={COLORS.gray} size={64} />
            <Text style={styles.emptyTitle}>No Attendance Records</Text>
            <Text style={styles.emptyText}>
              Attendance records will appear here once workers mark their attendance
            </Text>
          </View>
        ) : (
          dates.map((date) => (
            <View key={date} style={styles.dateSection}>
              <View style={styles.dateHeader}>
                <Calendar color={COLORS.primary} size={20} />
                <Text style={styles.dateText}>{new Date(date).toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}</Text>
              </View>

              {groupedAttendance[date].map((record) => (
                <View key={record.attendanceId} style={styles.recordCard}>
                  <View style={styles.recordIcon}>
                    <Camera color={COLORS.primary} size={20} />
                  </View>
                  <View style={styles.recordInfo}>
                    <View style={styles.recordHeader}>
                      <View style={styles.workerInfo}>
                        <User color={COLORS.text} size={16} />
                        <Text style={styles.workerName}>{record.workerName}</Text>
                      </View>
                      <View style={styles.timeInfo}>
                        <Clock color={COLORS.textLight} size={14} />
                        <Text style={styles.timeText}>{record.startTime}</Text>
                      </View>
                    </View>
                    {record.selfieUri && (
                      <Text style={styles.selfieInfo}>Selfie captured</Text>
                    )}
                  </View>
                </View>
              ))}
            </View>
          ))
        )}
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
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
  },
  content: {
    flex: 1,
    padding: 24,
  },
  dateSection: {
    marginBottom: 24,
  },
  dateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  dateText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  recordCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  recordIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  recordInfo: {
    flex: 1,
  },
  recordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  workerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  workerName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  timeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timeText: {
    fontSize: 14,
    color: COLORS.textLight,
  },
  selfieInfo: {
    fontSize: 12,
    color: COLORS.success,
    marginTop: 4,
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
    marginTop: 80,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.textLight,
    marginTop: 8,
    textAlign: 'center',
  },
});

export default AttendanceRecordsScreen;
