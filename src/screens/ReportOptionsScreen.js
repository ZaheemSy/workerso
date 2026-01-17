import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import {
  X,
  User,
  UserCog,
  Users,
  FileText,
} from 'lucide-react-native';
import { COLORS } from '../constants/colors';

const ReportOptionsScreen = ({ navigation, route }) => {
  const { reportType, employee, project } = route.params;

  const reportOptions = [
    {
      id: 'self-logged',
      icon: User,
      title: 'Self-Logged Only',
      subtitle: employee
        ? `Work ${employee.name} logged themselves`
        : `Work logged by project members themselves`,
      color: '#6366F1',
      bgColor: '#EEF2FF',
    },
    {
      id: 'admin-logged',
      icon: UserCog,
      title: 'Admin-Logged Only',
      subtitle: employee
        ? `Work admins logged for ${employee.name}`
        : `Work admins logged for project members`,
      color: '#EC4899',
      bgColor: '#FDF2F8',
    },
    {
      id: 'combined',
      icon: Users,
      title: 'Combined Report',
      subtitle: 'All work logs with attribution (who logged it)',
      color: '#10B981',
      bgColor: '#ECFDF5',
    },
  ];

  const handleOptionSelect = (optionId) => {
    navigation.navigate('ReportPreview', {
      reportType,
      reportOption: optionId,
      employee,
      project,
    });
  };

  const getTitle = () => {
    if (employee) {
      return `${employee.name}'s Report`;
    } else if (project) {
      return `${project.projectName} Report`;
    }
    return 'Select Report Type';
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
        <Text style={styles.headerTitle}>{getTitle()}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.infoCard}>
          <FileText color={COLORS.primary} size={24} />
          <View style={styles.infoTextContainer}>
            <Text style={styles.infoTitle}>Choose Report Type</Text>
            <Text style={styles.infoSubtitle}>
              Select how you want to view the {reportType.includes('worklog') ? 'work logs' : 'attendance records'}
            </Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Report Options</Text>

        {reportOptions.map((option) => (
          <TouchableOpacity
            key={option.id}
            style={styles.optionCard}
            onPress={() => handleOptionSelect(option.id)}
            activeOpacity={0.7}
          >
            <View style={[styles.iconContainer, { backgroundColor: option.bgColor }]}>
              <option.icon color={option.color} size={28} />
            </View>
            <View style={styles.optionInfo}>
              <Text style={styles.optionTitle}>{option.title}</Text>
              <Text style={styles.optionSubtitle}>{option.subtitle}</Text>
            </View>
          </TouchableOpacity>
        ))}

        <View style={styles.noteCard}>
          <Text style={styles.noteTitle}>Note:</Text>
          <Text style={styles.noteText}>
            • <Text style={styles.noteBold}>Self-Logged:</Text> Shows only entries where the person logged their own work{'\n'}
            • <Text style={styles.noteBold}>Admin-Logged:</Text> Shows only entries where admins logged work for the person{'\n'}
            • <Text style={styles.noteBold}>Combined:</Text> Shows all entries with a "Logged By" column for full transparency
          </Text>
        </View>
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
  optionCard: {
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
  optionInfo: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  optionSubtitle: {
    fontSize: 13,
    color: COLORS.textLight,
  },
  noteCard: {
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
    padding: 16,
    marginTop: 12,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  noteTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#92400E',
    marginBottom: 8,
  },
  noteText: {
    fontSize: 13,
    color: '#92400E',
    lineHeight: 20,
  },
  noteBold: {
    fontWeight: '600',
  },
});

export default ReportOptionsScreen;
