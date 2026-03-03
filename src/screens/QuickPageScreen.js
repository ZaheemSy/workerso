import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { X, Briefcase, Users, Layers, ChevronRight, Sparkles, FileSpreadsheet, FileText, Package } from 'lucide-react-native';
import { COLORS } from '../constants/colors';

const QuickPageScreen = ({ navigation }) => {
  const options = [
    {
      key: 'add_worklog',
      title: 'Add Worklog',
      subtitle: 'Select employee and project to log work',
      icon: FileText,
      color: '#0EA5E9',
      tint: '#E0F2FE',
      onPress: () => navigation.navigate('QuickAddWorkLog'),
    },
    {
      key: 'project',
      title: 'Quick Project',
      subtitle: 'Assign employees to projects',
      icon: Briefcase,
      color: '#D97706',
      tint: '#FDE68A',
      onPress: () => navigation.navigate('ProjectPool'),
    },
    {
      key: 'designation',
      title: 'Designation Pool',
      subtitle: 'Create and manage role names',
      icon: Layers,
      color: '#2563EB',
      tint: '#DBEAFE',
      onPress: () => navigation.navigate('DesignationPool'),
    },
    {
      key: 'employee',
      title: 'Employee Pool',
      subtitle: 'Build your team directory',
      icon: Users,
      color: '#059669',
      tint: '#D1FAE5',
      onPress: () => navigation.navigate('EmployeePool'),
    },
    {
      key: 'quick_report',
      title: 'Quick Report',
      subtitle: 'Filter work logs and export',
      icon: FileSpreadsheet,
      color: '#7C3AED',
      tint: '#EDE9FE',
      onPress: () => navigation.navigate('QuickReport'),
    },
    {
      key: 'material_manager',
      title: 'Material Manager',
      subtitle: 'Manage material pool and prices',
      icon: Package,
      color: '#0F766E',
      tint: '#CCFBF1',
      onPress: () => navigation.navigate('MaterialManager', { mode: 'quick' }),
    },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
          <X color={COLORS.text} size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Quick</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.heroCard}>
          <View style={styles.heroBadge}>
            <Sparkles color="#1D4ED8" size={14} />
            <Text style={styles.heroBadgeText}>Quick Workspace</Text>
          </View>
          <Text style={styles.heroTitle}>Manage Core Pools Faster</Text>
          <Text style={styles.heroSubtitle}>
            Use one place to maintain designations, employees, and project assignments.
          </Text>
        </View>

        <View style={styles.cardList}>
          {options.map(option => (
            <TouchableOpacity key={option.key} style={styles.card} onPress={option.onPress} activeOpacity={0.85}>
              <View style={styles.cardAccent} />
              <View style={[styles.iconWrap, { backgroundColor: option.tint }]}>
                <option.icon color={option.color} size={20} />
              </View>
              <View style={styles.cardTextWrap}>
                <Text style={styles.cardTitle}>{option.title}</Text>
                <Text style={styles.cardSubtitle}>{option.subtitle}</Text>
              </View>
              <ChevronRight color={COLORS.gray} size={18} />
            </TouchableOpacity>
          ))}
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
    paddingHorizontal: 16,
    paddingTop: 48,
    paddingBottom: 16,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  headerSpacer: {
    width: 24,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  heroCard: {
    borderRadius: 16,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    padding: 16,
  },
  heroBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DBEAFE',
    borderRadius: 999,
    paddingHorizontal: 10,
    height: 28,
  },
  heroBadgeText: {
    marginLeft: 6,
    color: '#1D4ED8',
    fontSize: 12,
    fontWeight: '700',
  },
  heroTitle: {
    marginTop: 12,
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.text,
  },
  heroSubtitle: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 19,
    color: COLORS.textLight,
  },
  cardList: {
    marginTop: 16,
    paddingBottom: 18,
  },
  card: {
    overflow: 'hidden',
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#0F172A',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  cardAccent: {
    width: 4,
    height: 26,
    borderRadius: 999,
    backgroundColor: '#BFDBFE',
    marginRight: 10,
  },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTextWrap: {
    flex: 1,
    marginLeft: 12,
    marginRight: 10,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
  },
  cardSubtitle: {
    marginTop: 2,
    color: COLORS.textLight,
    fontSize: 12,
  },
});

export default QuickPageScreen;
