import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import {
  X,
  Download,
  Users,
  Briefcase,
  Clock,
  FileSpreadsheet,
  FileText,
} from 'lucide-react-native';
import { COLORS } from '../constants/colors';

const ReportScreen = ({ navigation }) => {

  const reportTypes = [
    {
      id: 'attendance-employee',
      icon: Users,
      title: 'Attendance by Employee',
      subtitle: 'Download attendance records grouped by employees',
      color: '#6366F1',
      bgColor: '#EEF2FF',
    },
    {
      id: 'attendance-project',
      icon: Briefcase,
      title: 'Attendance by Project',
      subtitle: 'Download attendance records grouped by projects',
      color: '#EC4899',
      bgColor: '#FDF2F8',
    },
    {
      id: 'worklogs-employee',
      icon: Clock,
      title: 'Work Logs by Employee',
      subtitle: 'Download work time logs grouped by employees',
      color: '#10B981',
      bgColor: '#ECFDF5',
    },
    {
      id: 'worklogs-project',
      icon: FileText,
      title: 'Work Logs by Project',
      subtitle: 'Download work time logs grouped by projects',
      color: '#F59E0B',
      bgColor: '#FEF3C7',
    },
  ];


  const handleReportGeneration = reportId => {
    // Navigate to appropriate selection screen based on report type
    switch (reportId) {
      case 'attendance-employee':
        navigation.navigate('EmployeeSelection', { reportType: 'attendance-employee' });
        break;
      case 'attendance-project':
        navigation.navigate('ProjectSelection', { reportType: 'attendance-project' });
        break;
      case 'worklogs-employee':
        navigation.navigate('EmployeeSelection', { reportType: 'worklogs-employee' });
        break;
      case 'worklogs-project':
        navigation.navigate('ProjectSelection', { reportType: 'worklogs-project' });
        break;
      default:
        Alert.alert('Info', 'This report type is not yet implemented');
    }
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
        <Text style={styles.headerTitle}>Reports</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.infoCard}>
          <FileSpreadsheet color={COLORS.primary} size={24} />
          <View style={styles.infoTextContainer}>
            <Text style={styles.infoTitle}>Export Reports</Text>
            <Text style={styles.infoSubtitle}>
              Download attendance and work logs in Excel format
            </Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Available Reports</Text>

        {reportTypes.map(report => (
          <TouchableOpacity
            key={report.id}
            style={styles.reportCard}
            onPress={() => handleReportGeneration(report.id)}
            activeOpacity={0.7}
          >
            <View style={[styles.iconContainer, { backgroundColor: report.bgColor }]}>
              <report.icon color={report.color} size={28} />
            </View>
            <View style={styles.reportInfo}>
              <Text style={styles.reportTitle}>{report.title}</Text>
              <Text style={styles.reportSubtitle}>{report.subtitle}</Text>
            </View>
            <Download color={COLORS.gray} size={20} />
          </TouchableOpacity>
        ))}
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
    padding: 16,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary + '10',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: COLORS.primary + '30',
  },
  infoTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  infoSubtitle: {
    fontSize: 13,
    color: COLORS.textLight,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 16,
  },
  reportCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  reportInfo: {
    flex: 1,
  },
  reportTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  reportSubtitle: {
    fontSize: 13,
    color: COLORS.textLight,
  },
});

export default ReportScreen;
