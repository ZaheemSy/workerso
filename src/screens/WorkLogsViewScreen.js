import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { X, FileText, Calendar, User, Clock, Coffee } from 'lucide-react-native';
import { COLORS } from '../constants/colors';
import { useAuth } from '../contexts/AuthContext';
import { getWorkLogsByOrg, getUserById } from '../services/storageService';

const WorkLogsViewScreen = ({ navigation }) => {
  const { session } = useAuth();
  const [workLogs, setWorkLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadWorkLogs();
  }, []);

  const loadWorkLogs = async () => {
    setLoading(true);
    try {
      const logsData = await getWorkLogsByOrg(session.orgId);

      const enrichedLogs = await Promise.all(
        logsData.map(async (log) => {
          const worker = await getUserById(log.userId);
          return {
            ...log,
            workerName: worker?.name || 'Unknown',
          };
        })
      );

      enrichedLogs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      setWorkLogs(enrichedLogs);
    } catch (error) {
      console.error('Error loading work logs:', error);
      Alert.alert('Error', 'Failed to load work logs');
    } finally {
      setLoading(false);
    }
  };

  const groupByDate = (logs) => {
    const grouped = {};
    logs.forEach((log) => {
      const date = log.date;
      if (!grouped[date]) {
        grouped[date] = [];
      }
      grouped[date].push(log);
    });
    return grouped;
  };

  const groupedLogs = groupByDate(workLogs);
  const dates = Object.keys(groupedLogs).sort((a, b) => new Date(b) - new Date(a));

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
          <X color={COLORS.text} size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Work Logs</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {workLogs.length === 0 ? (
          <View style={styles.emptyState}>
            <FileText color={COLORS.gray} size={64} />
            <Text style={styles.emptyTitle}>No Work Logs</Text>
            <Text style={styles.emptyText}>
              Work logs will appear here once workers submit their daily hours
            </Text>
          </View>
        ) : (
          dates.map((date) => (
            <View key={date} style={styles.dateSection}>
              <View style={styles.dateHeader}>
                <Calendar color={COLORS.primary} size={20} />
                <Text style={styles.dateText}>
                  {new Date(date).toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </Text>
              </View>

              {groupedLogs[date].map((log) => (
                <View key={log.logId} style={styles.logCard}>
                  <View style={styles.logHeader}>
                    <View style={styles.workerInfo}>
                      <User color={COLORS.text} size={16} />
                      <Text style={styles.workerName}>{log.workerName}</Text>
                    </View>
                    <View style={styles.hoursInfo}>
                      <Text style={styles.hoursValue}>{log.totalHours} hrs</Text>
                    </View>
                  </View>

                  <View style={styles.logDetails}>
                    <View style={styles.detailRow}>
                      <Clock color={COLORS.textLight} size={16} />
                      <Text style={styles.detailText}>
                        {log.workStart} - {log.workEnd}
                      </Text>
                    </View>

                    {log.breaks && log.breaks.length > 0 && (
                      <View style={styles.detailRow}>
                        <Coffee color={COLORS.textLight} size={16} />
                        <Text style={styles.detailText}>
                          {log.breaks.length} break{log.breaks.length !== 1 ? 's' : ''}
                        </Text>
                      </View>
                    )}
                  </View>

                  {log.breaks && log.breaks.length > 0 && (
                    <View style={styles.breaksSection}>
                      <Text style={styles.breaksTitle}>Breaks:</Text>
                      {log.breaks.map((breakItem, index) => (
                        <Text key={index} style={styles.breakText}>
                          {breakItem.start} - {breakItem.end}
                        </Text>
                      ))}
                    </View>
                  )}
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
  logCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
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
  hoursInfo: {
    backgroundColor: COLORS.success + '15',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  hoursValue: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.success,
  },
  logDetails: {
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 14,
    color: COLORS.textLight,
  },
  breaksSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  breaksTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textLight,
    marginBottom: 4,
  },
  breakText: {
    fontSize: 12,
    color: COLORS.textLight,
    marginLeft: 16,
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

export default WorkLogsViewScreen;
