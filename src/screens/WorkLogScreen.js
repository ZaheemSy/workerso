import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  TextInput,
} from 'react-native';
import { Clock, Plus, X, Save } from 'lucide-react-native';
import { COLORS } from '../constants/colors';
import { useAuth } from '../contexts/AuthContext';
import { createWorkLog } from '../services/storageService';

const WorkLogScreen = ({ navigation }) => {
  const { session } = useAuth();
  const [workStart, setWorkStart] = useState('');
  const [workEnd, setWorkEnd] = useState('');
  const [breaks, setBreaks] = useState([]);
  const [loading, setLoading] = useState(false);

  const addBreak = () => {
    setBreaks([...breaks, { start: '', end: '' }]);
  };

  const removeBreak = (index) => {
    const newBreaks = breaks.filter((_, i) => i !== index);
    setBreaks(newBreaks);
  };

  const updateBreak = (index, field, value) => {
    const newBreaks = [...breaks];
    newBreaks[index][field] = value;
    setBreaks(newBreaks);
  };

  const calculateTotalHours = () => {
    if (!workStart || !workEnd) return 0;

    const startTime = new Date(`2000-01-01 ${workStart}`);
    const endTime = new Date(`2000-01-01 ${workEnd}`);
    let workMinutes = (endTime - startTime) / (1000 * 60);

    breaks.forEach((breakItem) => {
      if (breakItem.start && breakItem.end) {
        const breakStart = new Date(`2000-01-01 ${breakItem.start}`);
        const breakEnd = new Date(`2000-01-01 ${breakItem.end}`);
        const breakMinutes = (breakEnd - breakStart) / (1000 * 60);
        workMinutes -= breakMinutes;
      }
    });

    return (workMinutes / 60).toFixed(2);
  };

  const validateTime = (time) => {
    const regex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    return regex.test(time);
  };

  const handleSubmit = async () => {
    if (!workStart || !workEnd) {
      Alert.alert('Error', 'Please enter work start and end times');
      return;
    }

    if (!validateTime(workStart) || !validateTime(workEnd)) {
      Alert.alert('Error', 'Please enter valid times in HH:MM format');
      return;
    }

    for (const breakItem of breaks) {
      if (breakItem.start && !breakItem.end) {
        Alert.alert('Error', 'Please complete all break times');
        return;
      }
      if (!validateTime(breakItem.start) || !validateTime(breakItem.end)) {
        Alert.alert('Error', 'Please enter valid break times in HH:MM format');
        return;
      }
    }

    setLoading(true);
    try {
      const totalHours = calculateTotalHours();
      const now = new Date();

      const workLog = await createWorkLog({
        orgId: session.orgId,
        userId: session.userId,
        projectId: null,
        date: now.toISOString().split('T')[0],
        workStart,
        workEnd,
        breaks: breaks.filter(b => b.start && b.end),
        totalHours: parseFloat(totalHours),
      });

      if (workLog) {
        Alert.alert(
          'Success!',
          `Work log submitted successfully\nTotal hours: ${totalHours}`,
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      }
    } catch (error) {
      console.error('Error submitting work log:', error);
      Alert.alert('Error', 'Failed to submit work log');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
          <X color={COLORS.text} size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>End of Day Log</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionTitle}>Work Hours</Text>

        <View style={styles.timeRow}>
          <View style={styles.timeInputContainer}>
            <Text style={styles.label}>Start Time</Text>
            <View style={styles.inputWrapper}>
              <Clock color={COLORS.gray} size={20} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="09:00"
                placeholderTextColor={COLORS.gray}
                value={workStart}
                onChangeText={setWorkStart}
                keyboardType="numbers-and-punctuation"
              />
            </View>
          </View>

          <View style={styles.timeInputContainer}>
            <Text style={styles.label}>End Time</Text>
            <View style={styles.inputWrapper}>
              <Clock color={COLORS.gray} size={20} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="18:00"
                placeholderTextColor={COLORS.gray}
                value={workEnd}
                onChangeText={setWorkEnd}
                keyboardType="numbers-and-punctuation"
              />
            </View>
          </View>
        </View>

        <View style={styles.breakSection}>
          <View style={styles.breakHeader}>
            <Text style={styles.sectionTitle}>Breaks</Text>
            <TouchableOpacity style={styles.addButton} onPress={addBreak}>
              <Plus color={COLORS.primary} size={20} />
              <Text style={styles.addButtonText}>Add Break</Text>
            </TouchableOpacity>
          </View>

          {breaks.map((breakItem, index) => (
            <View key={index} style={styles.breakItem}>
              <View style={styles.breakTimeRow}>
                <View style={[styles.timeInputContainer, { flex: 1 }]}>
                  <Text style={styles.label}>Start</Text>
                  <View style={styles.inputWrapper}>
                    <Clock color={COLORS.gray} size={18} style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="12:00"
                      placeholderTextColor={COLORS.gray}
                      value={breakItem.start}
                      onChangeText={(value) => updateBreak(index, 'start', value)}
                      keyboardType="numbers-and-punctuation"
                    />
                  </View>
                </View>

                <View style={[styles.timeInputContainer, { flex: 1, marginLeft: 12 }]}>
                  <Text style={styles.label}>End</Text>
                  <View style={styles.inputWrapper}>
                    <Clock color={COLORS.gray} size={18} style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="13:00"
                      placeholderTextColor={COLORS.gray}
                      value={breakItem.end}
                      onChangeText={(value) => updateBreak(index, 'end', value)}
                      keyboardType="numbers-and-punctuation"
                    />
                  </View>
                </View>

                <TouchableOpacity
                  onPress={() => removeBreak(index)}
                  style={styles.removeButton}
                >
                  <X color={COLORS.danger} size={20} />
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.summaryContainer}>
          <Text style={styles.summaryLabel}>Total Work Hours</Text>
          <Text style={styles.summaryValue}>{calculateTotalHours()} hrs</Text>
        </View>

        <TouchableOpacity
          style={[styles.submitButton, loading && styles.buttonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          <Save color={COLORS.white} size={20} style={styles.buttonIcon} />
          <Text style={styles.submitButtonText}>
            {loading ? 'Submitting...' : 'Submit Work Log'}
          </Text>
        </TouchableOpacity>
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 16,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  timeInputContainer: {
    flex: 1,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.textLight,
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 12,
    height: 48,
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: COLORS.text,
  },
  breakSection: {
    marginBottom: 24,
  },
  breakHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary + '15',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  addButtonText: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  breakItem: {
    marginBottom: 12,
  },
  breakTimeRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  removeButton: {
    marginLeft: 8,
    marginBottom: 12,
    padding: 4,
  },
  summaryContainer: {
    backgroundColor: COLORS.primary + '15',
    borderRadius: 12,
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  summaryLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  summaryValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  submitButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonIcon: {
    marginRight: 8,
  },
  submitButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
});

export default WorkLogScreen;
