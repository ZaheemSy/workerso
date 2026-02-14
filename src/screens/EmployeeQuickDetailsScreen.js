import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList } from 'react-native';
import { ArrowLeft, Briefcase } from 'lucide-react-native';
import { COLORS } from '../constants/colors';
import { useAuth } from '../contexts/AuthContext';
import { getQuickEmployeesByOrg, getQuickProjectsByOrg } from '../services/storageService';

const EmployeeQuickDetailsScreen = ({ navigation, route }) => {
  const { session } = useAuth();
  const { quickEmployeeId } = route.params;
  const [employee, setEmployee] = useState(null);
  const [projects, setProjects] = useState([]);

  const loadData = useCallback(async () => {
    const [employeeList, projectList] = await Promise.all([
      getQuickEmployeesByOrg(session.orgId),
      getQuickProjectsByOrg(session.orgId),
    ]);

    const currentEmployee = employeeList.find(item => item.quickEmployeeId === quickEmployeeId) || null;
    setEmployee(currentEmployee);

    const assignedProjects = projectList.filter(project =>
      (project.employeeIds || []).includes(quickEmployeeId)
    );
    setProjects(assignedProjects.sort((a, b) => a.name.localeCompare(b.name)));
  }, [quickEmployeeId, session.orgId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const renderProject = ({ item }) => (
    <TouchableOpacity
      style={styles.projectRow}
      onPress={() =>
        navigation.navigate('EmployeeProjectDetails', {
          quickProjectId: item.quickProjectId,
          quickEmployeeId,
        })
      }
      activeOpacity={0.75}
    >
      <View style={styles.iconWrap}>
        <Briefcase color={COLORS.warning} size={16} />
      </View>
      <View style={styles.projectInfo}>
        <Text style={styles.projectName}>{item.name}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
          <ArrowLeft color={COLORS.text} size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Employee Details</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.content}>
        <View style={styles.infoCard}>
          <Text style={styles.employeeName}>{employee?.name || 'Employee'}</Text>
          <Text style={styles.employeeMetaText}>Projects: {projects.length}</Text>
        </View>
        <Text style={styles.sectionTitle}>Assigned Projects</Text>

        <FlatList
          data={projects}
          keyExtractor={item => item.quickProjectId}
          renderItem={renderProject}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={<Text style={styles.emptyText}>No projects assigned</Text>}
        />
      </View>
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
  employeeName: { fontSize: 20, fontWeight: '700', color: COLORS.text },
  employeeMetaText: {
    marginTop: 6,
    color: COLORS.textLight,
    fontSize: 12,
  },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: COLORS.textLight, marginBottom: 10 },
  listContent: { paddingBottom: 20 },
  projectRow: {
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
  iconWrap: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#FDE68A55',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  projectInfo: { flex: 1 },
  projectName: { color: COLORS.text, fontSize: 15, fontWeight: '600' },
  emptyText: { textAlign: 'center', marginTop: 20, color: COLORS.textLight },
});

export default EmployeeQuickDetailsScreen;
